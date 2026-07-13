import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DW VIEWS - Google Ads 儀表板",
  description: "DW VIEWS Google Ads 廣告管理儀表板系統",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&family=Roboto:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
