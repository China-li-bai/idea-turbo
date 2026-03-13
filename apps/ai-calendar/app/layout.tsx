import type { Metadata } from "next";
import "temporal-polyfill/global";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Calendar - 智能日历",
  description: "本地优先的AI智能日历，支持Boss/秘书双视图、灵光时刻、一键排班",
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
