import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "微信安全支付",
  description: "微信安全支付 - 安全、便捷的微信二维码支付页面",
  // 使用微信图做为站点图标（带版本号破缓存）
  icons: {
    icon: [{ url: "/wechat_pay@2x.png?v=1", type: "image/png", sizes: "32x32" }],
    shortcut: "/wechat_pay@2x.png?v=1",
    apple: "/wechat_pay@2x.png?v=1",
  },
  // 新增：SEO 社交分享图片（建议将 wechat-share.png 放到 public/ 目录，尺寸 1200x630）
  openGraph: {
    title: "微信安全支付",
    description: "微信安全支付 - 安全、便捷的微信二维码支付页面",
    siteName: "微信安全支付",
    images: [
      { url: "/wechat_pay@2x.png", width: 1200, height: 630, alt: "微信支付二维码" },
    ],
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "微信安全支付",
    description: "微信安全支付 - 安全、便捷的微信二维码支付页面",
    images: ["/wechat_pay@2x.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* 页面主体 */}
        <div className="min-h-screen flex flex-col">
          <main className="flex-1 pb-20 md:pb-24">{children}</main>
          {/* 全站页脚：ICP备案号（固定在视口底部） */}
          <footer className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200/60 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 py-3 text-center text-xs text-neutral-500">
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-neutral-700"
            >
              浙ICP备2025165656号-1
            </a>
          </footer>
        </div>
      </body>
    </html>
  );
}
