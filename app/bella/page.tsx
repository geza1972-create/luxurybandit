import TopNav from "@/components/TopNav";
import BellaSimpleStudio from "@/components/BellaSimpleStudio";
import BellaPostsCarousel from "@/components/BellaPostsCarousel";
import { BELLA_ID } from "@/lib/bella-card";
import { readTryThisLookState, readCardStudioSlides, getSignedUrl, type BellaSlide } from "@/lib/try-this-look-store";

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

// Zeigt die Seite diesen Beitrag? (gleiche Regel wie das Werkzeug)
const isPublicPost = (s: BellaSlide) =>
  !s.customer && s.hidden !== true && s.private !== true && !s.pendingApproval
  && (!s.pages || s.pages.length === 0 || s.pages.includes("profile"))
  && !!s.path;

export default async function BellaPage() {
  const [state, slides] = await Promise.all([
    readTryThisLookState(),
    readCardStudioSlides(BELLA_ID).catch(() => [] as BellaSlide[]),
  ]);

  const bella = (state.curators ?? []).find(c => c.id === BELLA_ID) as
    | { firstName?: string; modelName?: string; intro?: string } | undefined;
  const name = (bella?.modelName || bella?.firstName || "Bella").split(" ")[0];
  const intro = String(bella?.intro ?? "").trim();

  const ordered = slides.filter(isPublicPost).sort(
    (a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")),
  );
  const posts = (await Promise.all(ordered.map(async s => ({
    id: s.id,
    kind: s.kind,
    title: s.title ?? "",
    caption: s.caption ?? "",
    mediaUrl: await getSignedUrl(s.path).catch(() => ""),
    posterUrl: s.posterPath ? await getSignedUrl(s.posterPath).catch(() => "") : "",
  })))).filter(p => p.mediaUrl);

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
