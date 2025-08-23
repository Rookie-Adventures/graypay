import type { NextConfig } from "next";

const isRelaxedCSP = process.env.RELAXED_CSP === 'true' || process.env.NODE_ENV !== 'production';
// 在生产环境也允许必要的 inline 脚本执行（Next.js 运行所需），
// 并显式允许 Cloudflare Insights 的脚本域。
const scriptSrc = isRelaxedCSP
  ? "'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://static.cloudflareinsights.com"
  : "'self' 'unsafe-inline' 'wasm-unsafe-eval' https://static.cloudflareinsights.com";

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "img-src 'self' data: blob:",
      `script-src ${scriptSrc}`,
      // 补充 script-src-elem 以覆盖更广的浏览器实现
      `script-src-elem ${scriptSrc}`,
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      // 放行所有 https 连接（含主站 API 与 Cloudflare Insights 上报）
      "connect-src 'self' https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; '),
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
