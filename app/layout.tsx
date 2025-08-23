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
  icons: { icon: "/favicon.ico" },
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
        {children}
      </body>
    </html>
  );
}
