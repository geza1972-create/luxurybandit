import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShopCut AI",
  description: "Manual delete-person editor for product photos"
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
