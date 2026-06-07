import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LuxuryBandit",
  description: "AI fashion creator for apparel extraction and design"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
