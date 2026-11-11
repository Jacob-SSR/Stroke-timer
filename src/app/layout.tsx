import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "STROKE · Fast Track",
  description: "ระบบติดตามเวลา STROKE Fast Track สำหรับห้องฉุกเฉิน",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
