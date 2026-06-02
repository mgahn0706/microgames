import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "캣타워 오르기",
  description: "고양이가 캣타워를 오르는 것을 도와주세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
