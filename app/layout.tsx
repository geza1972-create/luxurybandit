import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import MetaPixel from "@/components/MetaPixel";

export const metadata: Metadata = {
  metadataBase: new URL((process.env.NEXT_PUBLIC_SITE_URL ?? "https://luxurybandit.com").replace(/\/$/, "")),
  title: "Luxurybandit — Bandit the Feeling | Virtual Try-On & Luxury Style",
  description: "Try on any luxury look on your own photo and shop the whole outfit at any price. Discover the high-end style you love — only on Luxurybandit.",
  openGraph: {
    title: "Luxurybandit — Bandit the Feeling | Virtual Try-On & Luxury Style",
    description: "Try on any luxury look on your own photo and shop the whole outfit at any price. Discover the high-end style you love — only on Luxurybandit.",
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {/* Meta Pixel — loads fbevents.js + fires PageView on load and every SPA nav. */}
        <Suspense fallback={null}>
          <MetaPixel />
        </Suspense>
        {/* The app is designed mobile-only. On desktop we render it inside a centered
            phone-width frame. The frame uses `transform` so that descendant
            `position: fixed` elements (reels, modals, bottom nav) are contained by the
            frame instead of spanning the whole wide viewport. On phones it's full-width. */}
        <div className="lb-frame">
          {children}
          {/* Suspense so BottomNav's useSearchParams doesn't force CSR bailout on
              statically-prerendered pages (e.g. 404) — required for the prod build. */}
          <Suspense fallback={null}>
            <BottomNav />
          </Suspense>
        </div>
      </body>
    </html>
  );
}
