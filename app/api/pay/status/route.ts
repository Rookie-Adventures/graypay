export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const reference = url.searchParams.get('reference');
  if (!reference) {
    return new Response(
      JSON.stringify({ error: 'MISSING_REFERENCE' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const backendUrl = process.env.MAIN_BACKEND_URL;
  const internalToken = process.env.PAY_PROXY_TOKEN || '';

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


