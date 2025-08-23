export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const backendUrl = process.env.MAIN_BACKEND_URL;
    const internalToken = process.env.PAY_PROXY_TOKEN || '';

    if (!backendUrl || !internalToken) {
      return new Response(
        JSON.stringify({ error: 'SERVER_MISCONFIGURED' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const res = await fetch(`${backendUrl}/api/noveltypay/qrcode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': internalToken,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: 'QR_GENERATION_FAILED' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const d = data as Record<string, unknown>;
    const parseNumber = (v: unknown): number | undefined => {
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      if (typeof v === 'string') {
        const n = Number(v);
        if (Number.isFinite(n)) return n;
      }
      return undefined;
    };

    const safe = {
      reference: (d.reference as string) || '',
      qrcode:
        (typeof d.qrcode === 'string' && d.qrcode) ||
        (typeof d.qrcode_img_url === 'string' && d.qrcode_img_url) ||
        '',
      originalAmount: parseNumber(d.originalAmount),
      originalCurrency: typeof d.originalCurrency === 'string' ? d.originalCurrency : undefined,
      amount: parseNumber(d.amount),
      currency: typeof d.currency === 'string' ? d.currency : undefined,
      expires_at: typeof d.expires_at === 'string' ? d.expires_at : undefined,
    };

    return new Response(JSON.stringify(safe), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: 'INVALID_REQUEST' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}


