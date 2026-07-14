import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "DW VIEWS - Google Ads 儀表板",
  description: "DW VIEWS Google Ads 廣告管理儀表板系統",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" className={roboto.variable}>
      <body className={`${roboto.className} overflow-x-clip`}>{children}</body>
    </html>
  );
}
