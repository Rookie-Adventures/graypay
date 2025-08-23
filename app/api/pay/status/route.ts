export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { getRequestContext } from '@cloudflare/next-on-pages';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const reference = url.searchParams.get('reference');
  if (!reference) {
    return new Response(
      JSON.stringify({ error: 'MISSING_REFERENCE' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let cfEnv: Record<string, string> | undefined;
  try {
    cfEnv = getRequestContext().env as Record<string, string>;
  } catch {
    cfEnv = undefined;
  }

  const backendUrl = (cfEnv?.MAIN_BACKEND_URL as string) || process.env.MAIN_BACKEND_URL;
  const internalToken = (cfEnv?.PAY_PROXY_TOKEN as string) || process.env.PAY_PROXY_TOKEN || '';

  if (!backendUrl || !internalToken) {
    return new Response(
      JSON.stringify({ error: 'SERVER_MISCONFIGURED' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const res = await fetch(
    `${backendUrl}/api/payment/status?reference=${encodeURIComponent(reference)}`,
    {
      headers: { 'X-Internal-Token': internalToken },
      cache: 'no-store',
    }
  );

  if (!res.ok) {
    return new Response(
      JSON.stringify({ error: 'STATUS_FETCH_FAILED' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let data: unknown = {};
  try {
    data = await res.json();
  } catch {
    // ignore json parse errors
  }

  return new Response(
    JSON.stringify({ status: (data as Record<string, unknown>).status === 'completed' ? 'completed' : 'pending' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}


