import type { Metadata } from "next";
import "temporal-polyfill/global";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Calendar - 智能日程管理 | 本地优先 AI 日历",
  description: "本地优先的AI智能日历，支持Boss/秘书双视图、灵光时刻捕获、自然语言创建日程。数据存储本地，隐私安全。",
  keywords: "AI Calendar, 智能日历, 日程管理, 本地优先, Boss视图, 秘书视图",
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
