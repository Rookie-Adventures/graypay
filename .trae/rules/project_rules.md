## 子站（前端展示）实现规范（v1）

目标：子站仅做前端展示与本域接口调用；实际下单、回调均在主站进行。用户始终只能看到子站域名；支付通道只“认识”主站。

### 一、技术栈建议
- Next.js 14（App Router）或任意 SSR/Edge 框架（Node/Cloudflare/Netlify 均可）
- TypeScript、Tailwind（可选）
- 仅需实现 2～3 个服务端 API 代理与 1 个支付页面
- 汇率接口可弃用

### 二、环境变量（子站）
```
MAIN_BACKEND_URL="https://主站域名"
PAY_PROXY_TOKEN="强随机字符串（与主站 INTERNAL_API_TOKEN 一致）"
WECHAT_RATE_URL="http://pay.noveltypay.com/wechatrate.aspx"   # 可选
RATE_CACHE_SEC="300"                                         # 可选：汇率缓存秒数
```

### 三、固定下单参数（子站 → 子站后端）
- amount: 990 | 1990 | 2990
- currency: 'CNY'
- vendor: 'wechatpay'
- plan: 'support-990' | 'support-1990' | 'support-2990'
- duration: 'oneoff'
- 可选：description、customerName、customerEmail

示例：
```json
{ "amount": 1990, "currency": "CNY", "vendor": "wechatpay", "plan": "support-1990", "duration": "oneoff" }
```

### 四、服务端接口（子站）
1) POST /api/pay/wechat-qrcode
- 功能：代理主站生成微信二维码
- 实现：服务端 fetch `${MAIN_BACKEND_URL}/api/noveltypay/qrcode`，附带 `X-Internal-Token: PAY_PROXY_TOKEN`
- 返回：仅回传必要字段 `{ reference, qrcode, originalAmount(USD), originalCurrency, amount(CNY), currency, expires_at }`

2) GET /api/pay/status?reference=...
- 功能：代理主站查询订单状态
- 实现：服务端 fetch `${MAIN_BACKEND_URL}/api/payment/status?reference=...`，同样带 `X-Internal-Token`
- 返回：`{ status: 'pending' | 'completed' }`

3) 可选：GET /api/vendor/wechat/rate
- 功能：代理 `WECHAT_RATE_URL` 并做短缓存（1–5 分钟）
- 用途：展示“约合 CNY（按微信汇率，仅供参考）”

### 五、前端页面（子站）
- 路由：`/pay/wechat`
- 逻辑：
  1. 展示 CNY 主价（990/1990/2990）
  2. 点击“生成二维码” → POST `/api/pay/wechat-qrcode`（仅本域）
  3. 拿到 `{ reference, qrcode, originalAmount(USD) }` 后，本地用 `qrcode` 字符串生成二维码（不要外链图片）
  4. 主金额显示 USD；下方显示“约合 CNY（按微信汇率，仅供参考）”
  5. 每 2 秒轮询 GET `/api/pay/status?reference=...` 直到 `completed`

### 六、安全与风控
- 子站浏览器只访问子站自有 API；不直连主站或支付通道
- 二维码使用字符串本地渲染，禁止 `<img src=外链>`
- 主站仅接受带 `X-Internal-Token` 的服务端到服务端请求；不对浏览器开放 CORS
- 支付回调 notify_url 只配置主站；主站负责落库与校验
- 全程 HTTPS；主站与子站域名、证书、IP 稳定

### 七、主站配合项（一次性）
- 提供 `GET /api/payment/status?reference=...`（返回 `{status}`）
- 对 `/api/noveltypay/qrcode` 与 `/api/payment/status` 增加 `X-Internal-Token` 校验（`INTERNAL_API_TOKEN`）

### 八、示例代码片段
1) 子站：POST /api/pay/wechat-qrcode
```ts
export async function POST(req: Request) {
  const body = await req.json();
  const res = await fetch(`${process.env.MAIN_BACKEND_URL}/api/noveltypay/qrcode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Internal-Token': process.env.PAY_PROXY_TOKEN || '' },
    body: JSON.stringify(body), cache: 'no-store'
  });
  const data = await res.json();
  if (!res.ok) return new Response(JSON.stringify({ error: 'QR_GENERATION_FAILED' }), { status: 500 });
  const safe = { reference: data.reference, qrcode: data.qrcode || data.qrcode_img_url || '', originalAmount: data.originalAmount, originalCurrency: data.originalCurrency, amount: data.amount, currency: data.currency, expires_at: data.expires_at };
  return new Response(JSON.stringify(safe), { headers: { 'Content-Type': 'application/json' } });
}
```

2) 子站：GET /api/pay/status
```ts
export async function GET(req: Request) {
  const url = new URL(req.url);
  const reference = url.searchParams.get('reference');
  if (!reference) return new Response(JSON.stringify({ error: 'MISSING_REFERENCE' }), { status: 400 });
  const res = await fetch(`${process.env.MAIN_BACKEND_URL}/api/payment/status?reference=${encodeURIComponent(reference)}`, { headers: { 'X-Internal-Token': process.env.PAY_PROXY_TOKEN || '' }, cache: 'no-store' });
  if (!res.ok) return new Response(JSON.stringify({ error: 'STATUS_FETCH_FAILED' }), { status: 500 });
  const data = await res.json();
  return new Response(JSON.stringify({ status: data.status || 'pending' }), { headers: { 'Content-Type': 'application/json' } });
}
```

3) 子站前端调用（伪代码）
```ts
// 生成二维码
await fetch('/api/pay/wechat-qrcode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: 1990, currency: 'CNY', vendor: 'wechatpay', plan: 'support-1990', duration: 'oneoff' }) });
// 轮询状态
setInterval(async () => { const s = await fetch(`/api/pay/status?reference=${ref}`).then(r=>r.json()); if (s.status==='completed') /* success */ }, 2000);
```

### 九、用户流程（主站视角不暴露）
子站页面 → 子站接口（代理） → 主站下单 → 微信扫码 → 主站回调落库 → 子站轮询 completed → 展示成功页

---
备注：如需“约合 CNY（按微信实时汇率）”，请对接 `GET /api/vendor/wechat/rate` 并做短缓存；失败回退到本地兜底汇率。

### 十、Cloudflare WAF/Access 配置（主站）
为确保子站 S2S 请求不被 WAF 误拦，并避免暴露主站，对主站做如下设置：

1) 自定义防火墙规则（Firewall Rules）
- 目标：仅对携带内部签名头的特定 API 路径放行/绕过 WAF
- 路径：`/api/noveltypay/qrcode`、`/api/payment/status`
- 表达式示例：
```
(http.request.uri.path matches "^/api/(noveltypay/qrcode|payment/status)($|\?)")
and lower(http.request.headers["x-internal-token"][0]) eq "<token-lower>"
```
- 动作：Bypass → Managed WAF, Super Bot Fight Mode, Bot Fight Mode（按需）
- 说明：Cloudflare Pages/Workers 的出口 IP 会变动，不建议用固定 IP 白名单；基于签名头更稳妥。

2) 速率限制（Rate Limiting Rules）
- 对上述路径添加基础速率限制（如 30 req/10s/源 IP），防止滥用。对子站出口 ASN/签名头可放宽。

3) 回调/通知接口豁免（可选）
- 若支付商提供固定 IP 或 ASN，可对 `/api/*/ipn` 路径按 IP 列表放行；否则保留签名校验为主。

4) 环境变量
- 主站：`INTERNAL_API_TOKEN`（与子站 `PAY_PROXY_TOKEN` 保持一致）
- 子站：通过 `X-Internal-Token` 头传入同一值。

5) Bot Fight/Integrity 配置
- 如开启 Super Bot Fight/BIC，确保在规则中对携带签名头的请求进行 Bypass，避免误杀。

是否需要现在添加白名单？
- 建议现在就添加上述“签名头 + 路径”规则（更稳）；无需依赖不稳定的出口 IP 白名单。



子站对用户
只请求子站自己的接口；不直连主站/支付通道；
二维码用字符串本地渲染，不加载任何外链图片；
不跳转到主站，不引用主站静态资源。用户只会看到子站域名。
子站对支付商
子站仅“服务器到服务器”转发给主站；支付商只接触主站的下单与回调地址、主站IP、商户号；
notify_url/callback 全在主站；请求头带 X-Internal-Token 鉴权；主站不对浏览器开放 CORS；
订单描述里不要写入子站域名；return_url（用户跳转页）可指向子站，这只是用户浏览器回跳，支付商不会主动访问子站。
价格与风控
子站只传三档固定 CNY 金额（990/1990/2990）；vendor=wechatpay，currency=CNY，plan=支持标签；
主站做换汇与下单，满足微信通道口径。支付商不会“看到”这是子站发起的付款。
满足以上约束后：
用户察觉不到主站，子站可用任意域名；
支付商也不会发现这三笔定价来自子站页面，而只识别主站为交易方。