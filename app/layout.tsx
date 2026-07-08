import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import MetaPixel from "@/components/MetaPixel";
import AdminUrlMirror from "@/components/AdminUrlMirror";
import AgeGate from "@/components/AgeGate";

export const metadata: Metadata = {
  metadataBase: new URL((process.env.NEXT_PUBLIC_SITE_URL ?? "https://luxurybandit.com").replace(/\/$/, "")),
  title: "LuxuryBandit — Your Dream Model, In Any Look",
  description: "Pick a model, choose a designer outfit, and watch her wear it in a runway-quality AI video — dancing or turning, your call. Follow her, message her, shop her looks. Models: upload one photo, get styled in luxury looks and earn with every look.",
  keywords: ["AI fashion models", "virtual try-on", "AI fashion", "luxury fashion", "fashion model video", "outfit video", "AI model", "designer looks", "become a model", "LuxuryBandit"],
  openGraph: {
    title: "LuxuryBandit — Your Dream Model, In Any Look",
    description: "Pick a model, choose a designer outfit, and watch her wear it in a runway-quality AI video. Follow her, message her, shop her looks. New looks every day.",
    type: "website",
  },
  // fb:app_id on EVERY page — the "luxurybandit" Meta app (also powers FB login).
  facebook: { appId: process.env.NEXT_PUBLIC_FB_APP_ID ?? "1385612150051040" },
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
    // prefix: announces the OG vocabulary — Facebook's debugger otherwise
    // sporadically claims og:url/og:type are "missing" despite valid tags.
    <html lang="en" prefix="og: https://ogp.me/ns# fb: https://ogp.me/ns/fb#">
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
          {/* Floating app-assistant removed per request — it cluttered the feed.
              The component + /api/app-chat stay in the codebase for re-use elsewhere. */}
        </div>
      </body>
    </html>
  );
}
