import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import MetaPixel from "@/components/MetaPixel";
import AdminUrlMirror from "@/components/AdminUrlMirror";
import AgeGate from "@/components/AgeGate";

export const metadata: Metadata = {
  metadataBase: new URL((process.env.NEXT_PUBLIC_SITE_URL ?? "https://luxurybandit.com").replace(/\/$/, "")),
  title: "LuxuryBandit — Virtual Try-On for Luxury Fashion",
  description: "Try on luxury fashion instantly. Pick any designer outfit, choose a model or upload your own photo, and get a runway-quality try-on video in seconds. New looks every day — save, share and shop what you love, or become a model and earn on every look.",
  keywords: ["virtual try-on", "AI fashion", "luxury fashion", "try on clothes online", "outfit video", "AI model", "designer looks", "fashion try-on app", "LuxuryBandit"],
  openGraph: {
    title: "LuxuryBandit — Virtual Try-On for Luxury Fashion",
    description: "Try on luxury fashion instantly. Pick any outfit, choose a model or upload your photo, and get a runway-quality try-on video in seconds. New designer looks every day.",
    type: "website",
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
        {/* Mirror every public page under /admin/… when signed in as admin. */}
        <Suspense fallback={null}>
          <AdminUrlMirror />
        </Suspense>
        <div className="lb-frame">
          {children}
          {/* The whole portal is 18+ — blocks every page until the visitor confirms a
              date of birth ≥ 18 (admins bypass). */}
          <AgeGate />
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
