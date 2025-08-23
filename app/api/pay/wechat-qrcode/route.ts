export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { getRequestContext } from '@cloudflare/next-on-pages';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // 新增：参数白名单校验与净化
    const allowedAmounts = new Set([990, 1990, 2990]);
    const allowedPlans = new Set(['support-990', 'support-1990', 'support-2990']);
    const allowedCurrency = 'CNY';
    const allowedVendor = 'wechatpay';
    const allowedDuration = 'oneoff';

    const num = typeof body?.amount === 'number' ? body.amount : Number(body?.amount);
    const plan = typeof body?.plan === 'string' ? body.plan : '';
    const currency = typeof body?.currency === 'string' ? body.currency : '';
    const vendor = typeof body?.vendor === 'string' ? body.vendor : '';
    const duration = typeof body?.duration === 'string' ? body.duration : '';

    const valid = Number.isFinite(num) && allowedAmounts.has(num) &&
      allowedPlans.has(plan) && currency === allowedCurrency &&
      vendor === allowedVendor && duration === allowedDuration;

    if (!valid) {
      return new Response(
        JSON.stringify({ error: 'INVALID_ORDER_PARAMS' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const payload: Record<string, unknown> = {
      amount: num,
      currency: allowedCurrency,
      vendor: allowedVendor,
      plan,
      duration: allowedDuration,
    };
    if (typeof body?.description === 'string' && body.description.length <= 256) {
      payload.description = body.description;
    }
    if (typeof body?.customerName === 'string' && body.customerName.length <= 128) {
      payload.customerName = body.customerName;
    }
    if (typeof body?.customerEmail === 'string' && body.customerEmail.length <= 256) {
      payload.customerEmail = body.customerEmail;
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

    const res = await fetch(`${backendUrl}/api/noveltypay/qrcode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': internalToken,
      },
      body: JSON.stringify(payload),
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


