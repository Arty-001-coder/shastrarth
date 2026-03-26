import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shastrarth — Peer Discussion Session",
  description: "A structured debate tool for mock research sessions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
