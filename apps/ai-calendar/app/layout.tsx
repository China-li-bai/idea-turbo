import type { Metadata } from "next";
import "temporal-polyfill/global";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Calendar - 智能日程管理 | 本地优先 AI 日历",
  description: "本地优先的AI智能日历，支持Boss/秘书双视图、灵光时刻捕获、自然语言创建日程。AI智能解析时间、人物、地点，智能冲突检测，多语言支持，数据存储本地，隐私安全。",
  keywords: "AI Calendar, 智能日历, 日程管理, 本地优先, Boss视图, 秘书视图, 自然语言日程, 智能冲突检测, 多语言日历, 隐私日历",
  openGraph: {
    title: "AI Calendar - 智能日程管理 | 本地优先 AI 日历",
    description: "本地优先的AI智能日历，支持Boss/秘书双视图、灵光时刻捕获、自然语言创建日程。",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
