export const dynamic = 'force-dynamic';

let cachedRate: { value: number; expires: number } | null = null;

async function fetchVendorRate(): Promise<number | null> {
  const url = process.env.WECHAT_RATE_URL || 'http://pay.noveltypay.com/wechatrate.aspx';
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
  const ttlSec = Number(process.env.RATE_CACHE_SEC || '300');
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


