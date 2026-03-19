import type { Metadata, Viewport } from "next";
import "temporal-polyfill/global";
import "./globals.css";
import { ClientProviders } from "@/lib/contexts/ClientProviders";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "智程日历 - AI 智能日程管理 | 本地优先 Boss/秘书双视图",
  description: "智程日历 - 本地优先的AI智能日程管理，支持Boss/秘书双视图、灵光时刻捕获、自然语言创建日程。AI智能解析时间人物地点，智能冲突检测，多语言支持，数据存储本地隐私安全。",
  keywords: "智程日历, AI Calendar, 智能日历, 日程管理, 本地优先, Boss视图, 秘书视图, 自然语言日程, 智能冲突检测, 多语言日历, 隐私日历, 时间管理, 日程安排",
  openGraph: {
    title: "智程日历 - AI 智能日程管理",
    description: "本地优先的AI智能日程管理，支持Boss/秘书双视图、灵光时刻捕获、自然语言创建日程。",
    type: "website",
    siteName: "智程日历",
  },
  twitter: {
    card: "summary_large_image",
    title: "智程日历 - AI 智能日程管理",
    description: "本地优先的AI智能日程管理，支持Boss/秘书双视图",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
