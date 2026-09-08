import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RPA Restart",
  description: "권한이 있는 자동화 과제를 안전하게 실행하는 사내 포털",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
