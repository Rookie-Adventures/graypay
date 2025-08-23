export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { getRequestContext } from '@cloudflare/next-on-pages';

let cachedRate: { value: number; expires: number } | null = null;

function readEnv(key: string): string | undefined {
  try {
    const env = getRequestContext().env as Record<string, string>;
    return env?.[key];
  } catch {
    return (process.env as Record<string, string | undefined>)[key];
  }
}

async function fetchVendorRate(): Promise<number | null> {
  const url = readEnv('WECHAT_RATE_URL') || 'http://pay.noveltypay.com/wechatrate.aspx';
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const text = await res.text();
    const value = Number(text.trim());
    if (Number.isFinite(value) && value > 0) return value;
    return null;
  } catch {
    return null;
  }
}

export async function GET() {
  const ttlSec = Number(readEnv('RATE_CACHE_SEC') || '300');
  const now = Date.now();
  if (cachedRate && cachedRate.expires > now) {
    return new Response(
      JSON.stringify({ rate: cachedRate.value, cached: true }),
      { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
    );
  }

  const rate = await fetchVendorRate();
  if (rate) {
    cachedRate = { value: rate, expires: now + ttlSec * 1000 };
    return new Response(
      JSON.stringify({ rate, cached: false }),
      { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
    );
  }

  // fallback
  const fallback = 7.0;
  return new Response(
    JSON.stringify({ rate: fallback, cached: false, fallback: true }),
    { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
  );
}


