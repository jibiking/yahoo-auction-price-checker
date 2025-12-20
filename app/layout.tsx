import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ヤフオク落札価格チェッカー",
  description: "指定した出品者の過去の落札価格を検索",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased bg-gray-50">
        {children}
      </body>
    </html>
  );
}
