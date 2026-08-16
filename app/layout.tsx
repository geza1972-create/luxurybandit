import type { Metadata, Viewport } from "next";
import { resolveLang } from "@/lib/lang-server";
import { Suspense } from "react";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import MetaPixel from "@/components/MetaPixel";
import AdminUrlMirror from "@/components/AdminUrlMirror";
import CookieConsent from "@/components/CookieConsent";
import PremiumSync from "@/components/PremiumSync";
import AuthRefresh from "@/components/AuthRefresh";
import AnmeldeLinkFehler from "@/components/AnmeldeLinkFehler";
import VisitTracker from "@/components/VisitTracker";
import ScrollTop from "@/components/ScrollTop";

export const metadata: Metadata = {
  metadataBase: new URL((process.env.NEXT_PUBLIC_SITE_URL ?? "https://luxurybandit.com").replace(/\/$/, "")),
  /**
   * DER STANDARDTITEL IST DER TITEL DES GANZEN HAUSES (Owner 03.08.2026, Bildschirmfoto aus
   * Bing: „wenn ich auf meine Adresse klicke, komme ich auf die model seite").
   *
   * Was hier steht, tragen ALLE Seiten ohne eigene Angaben — und das sind die Client-Seiten
   * /stores, /home, /curators, jedes Model-Profil. Hier stand die alte Aufstellung („Your
   * Dream Model, In Any Look. Pick a model, choose a designer outfit …"). Zwei Folgen:
   *
   *   1. Der Suchtreffer der Marke warb fuer Models statt fuer Geschenke.
   *   2. Weil die Model-Galerie denselben Titel trug wie die Startseite, hielt Bing SIE fuer
   *      die Startseite und schickte den Besucher dorthin.
   *
   * Jetzt beschreibt der Standard, was der Marktplatz heute verkauft: ein Video-Geschenk mit
   * dem eigenen Foto. Preise stehen bewusst nicht drin — Zahlen kommen aus lib/pricing, und
   * ein statisches Metafeld kann sie nicht mitpflegen (Hausregel seit 29.07.2026).
   */
  title: "LuxuryBandit — AI Marketing Portal",
  description: "Products built by artificial intelligence, and the marketing that sells them. Every product here is our own, finished in minutes. The same machine is ready for your business: a service or an event becomes a product — and the path that sells it.",
  keywords: ["ai video gift", "ai video generator", "kiss video ai", "wedding invitation video", "birthday video maker", "ai model", "ai influencer", "face swap video ai", "personalised video", "LuxuryBandit"],
  openGraph: {
    title: "LuxuryBandit — AI Marketing Portal",
    description: "Products built by AI, and the marketing that sells them. The same machine turns your service or event into a product — and the path that sells it.",
    type: "website",
  },
  // fb:app_id on EVERY page — the "luxurybandit" Meta app (also powers FB login).
  facebook: { appId: process.env.NEXT_PUBLIC_FB_APP_ID ?? "1385612150051040" },
  // Google Search Console verification — set GOOGLE_SITE_VERIFICATION in Vercel to the code
  // Google gives you (the "meta tag" verification method), then hit Verify. Renders nothing if unset.
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
  icons: { icon: "/lb-logo.png", shortcut: "/lb-logo.png", apple: "/lb-logo.png" },
  // Alibaba.com / AliExpress affiliate domain verification (public token, meta-tag method).
  other: {
    "alibaba-site-verification": "rBKQ9rU1Gy6FamZMU1s/6r2abUHGSfLMOrXCs8NML5iOUorCByXm5Q==",
    "aliexpress-site-verification": "rBKQ9rU1Gy6FamZMU1s/6r2abUHGSfLMOrXCs8NML5iOUorCByXm5Q==",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // prefix: announces the OG vocabulary — Facebook's debugger otherwise
    // sporadically claims og:url/og:type are "missing" despite valid tags.
    /**
      * DIE SEITE SAGT, WELCHE SPRACHE SIE WIRKLICH SPRICHT (Owner 09.08.2026, mit Bild einer
      * deutschen Seite, auf der „English" stand: „ist das englisch, ja?").
      *
      * Hier stand fest `lang="en"`, obwohl der Server ohne Cookie die BROWSERSPRACHE nimmt
      * (seine Entscheidung vom 30.07.). Der Umschalter kannte nur den Cookie und behauptete
      * deshalb „English", während deutscher Text danebenstand. Jetzt steht die geltende
      * Sprache an EINER Stelle — der Umschalter liest sie von hier ab, statt zu raten.
      * Nebenbei ist es das, was Vorleser und Suchmaschinen erwarten.
      */
    <html lang={await resolveLang()} prefix="og: https://ogp.me/ns# fb: https://ogp.me/ns/fb#">
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
        {/* Jede neue Seite beginnt oben — sonst oeffnet ein Thema mitten im Text. */}
        <Suspense fallback={null}>
          <ScrollTop />
        </Suspense>
        {/* Keeps the login alive by refreshing the access token before it expires. */}
        <AuthRefresh />
        {/* Sagt es, wenn ein Anmelde-Link tot war — sonst landet der Kunde wortlos auf der
            Startseite und haelt sich fuer angemeldet (Owner 11.08.2026). */}
        <AnmeldeLinkFehler />
        {/* Counts one site visit per session (ad-traffic reconciliation). */}
        <VisitTracker />
        {/* Syncs the premium flag with the user's video-pack credits. */}
        <PremiumSync />
        <div className="lb-frame">
          {children}
          {/* Altersabfrage entfernt (19.07.2026): Der oeffentliche Inhalt ist Katalog-Niveau
              (Mode-/Dessous-Produktbilder wie im normalen Handel), kein Erwachsenen-Inhalt.
              Die Vollbild-Abfrage kostete bei kalter Werbe-Zielgruppe Anmeldungen.
              Komponente bleibt im Repo, falls sie zurueckkommen soll. */}
          {/* Cookie consent — gates the Meta Pixel (marketing) until the visitor accepts.
              MUSS bleiben, solange der Pixel laeuft: Tracking ohne vorherige Einwilligung
              ist in DE (DSGVO/TTDSG) abmahnfaehig. Ist jetzt ein schmaler Streifen statt
              Vollbild, damit er kaum noch Reibung erzeugt. */}
          <CookieConsent />
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
