import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "学生管理" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
