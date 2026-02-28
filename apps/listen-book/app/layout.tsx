import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "../lib/i18n/context";

export const metadata: Metadata = {
  title: "文本转语音",
  description: "在线文本转语音工具",
  authors: [{ name: "文本转语音服务" }],
  creator: "文本转语音服务",
  publisher: "文本转语音服务",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    title: "文本转语音",
    description: "在线文本转语音工具",
    type: "website",
    locale: "zh_CN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <meta name="copyright" content={`© ${new Date().getFullYear()} 文本转语音服务. 保留所有权利.`} />
        <meta name="author" content="文本转语音服务" />
      </head>
      <body className="antialiased">
        <I18nProvider>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  document.addEventListener('contextmenu', function(e) {
                    e.preventDefault();
                    return false;
                  });
                  
                  document.addEventListener('keydown', function(e) {
                    if (e.ctrlKey && (e.key === 'c' || e.key === 'u' || e.key === 's' || e.key === 'p')) {
                      e.preventDefault();
                      return false;
                    }
                  });
                })();
              `,
            }}
          />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
