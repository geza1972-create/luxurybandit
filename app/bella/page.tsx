import TopNav from "@/components/TopNav";
import BellaSimpleStudio from "@/components/BellaSimpleStudio";
import BellaPostsCarousel from "@/components/BellaPostsCarousel";
import { BELLA_ID } from "@/lib/bella-card";
import { headers } from "next/headers";
import { readTryThisLookState, readCardStudioSlides, getSignedUrl, isPublicBellaPost, sortBellaPosts, type BellaSlide } from "@/lib/try-this-look-store";
import { langFromAcceptLanguage, normalizeLang, pickPostText } from "@/lib/translate-post";

// Bellas Seite — BEWUSST MINIMAL: ihr Bild, ihr Name, ihre Beiträge. Sonst nichts.
// Keine Sammelkarte mit Growth Score, Seriennummer, Sponsor-Historie, Super-Follow,
// Chat oder Profil-Link — das lenkt hier nur ab.
// Beiträge kommen aus dem einfachen Werkzeug unten auf dieser Seite.

export const metadata = {
  title: "Bella — what she does for you | LuxuryBandit",
  description: "Bella wakes you up, sends you the weather from wherever she is, and tells you about her day. Every single day.",
  openGraph: {
    title: "Bella — what she does for you",
    description: "She wakes you up, sends you the weather from wherever she is, and tells you about her day.",
    url: "/bella",
    type: "website",
  },
};

// Signierte Medien-Adressen laufen ab → pro Aufruf frisch rendern.
export const dynamic = "force-dynamic";

export default async function BellaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [state, slides, sp, h] = await Promise.all([
    readTryThisLookState(),
    readCardStudioSlides(BELLA_ID).catch(() => [] as BellaSlide[]),
    searchParams,
    headers(),
  ]);

  // Sprache: ?lang= schlägt alles (zum Nachschauen), sonst die Browsersprache des
  // Besuchers, sonst Englisch. Kein Umschalter — die Seite soll leer bleiben.
  const lang = normalizeLang(sp.lang) ?? langFromAcceptLanguage(h.get("accept-language"));

  const bella = (state.curators ?? []).find(c => c.id === BELLA_ID) as
    | { firstName?: string; modelName?: string; intro?: string } | undefined;
  const name = (bella?.modelName || bella?.firstName || "Bella").split(" ")[0];
  const intro = String(bella?.intro ?? "").trim();

  const ordered = slides.filter(isPublicBellaPost).sort(sortBellaPosts);
  const posts = (await Promise.all(ordered.map(async s => {
    // Text in der Sprache des Besuchers; fehlt die Übersetzung, kommt das Original.
    const text = pickPostText(s.i18n, lang, { title: s.title ?? "", caption: s.caption ?? "" });
    return {
      id: s.id,
      kind: s.kind,
      title: text.title ?? "",
      caption: text.caption ?? "",
      mediaUrl: await getSignedUrl(s.path).catch(() => ""),
      posterUrl: s.posterPath ? await getSignedUrl(s.posterPath).catch(() => "") : "",
    };
  }))).filter(p => p.mediaUrl);

  return (
    <main className="min-h-[100dvh] lb-bg pb-16 text-white">
      <TopNav />

      {/* Ihre Beiträge — seitlich durchblätterbar, bündig am Header (kein Abstand). */}
      {posts.length === 0 ? (
        <p className="px-5 pt-8 text-[13px] font-bold text-white/45">Noch keine Beiträge.</p>
      ) : (
        <BellaPostsCarousel posts={posts} name={name} />
      )}

      {/* Werkzeug — nur für den Admin sichtbar */}
      <div className="px-4 pt-12">
        <BellaSimpleStudio />
      </div>
    </main>
  );
}
