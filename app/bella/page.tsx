import TopNav from "@/components/TopNav";
import ModelCardHeader from "@/components/ModelCardHeader";
import BellaSimpleStudio from "@/components/BellaSimpleStudio";
import BellaPersonal from "@/components/BellaPersonal";
import { BELLA_ID, buildBellaCard } from "@/lib/bella-card";
import { readTryThisLookState, readCardStudioSlides, getSignedUrl, isPublicBellaPost, sortBellaPosts, type BellaSlide } from "@/lib/try-this-look-store";

// Bellas Seite: oben ihre Model Card wie auf dem Profil (dieselbe Komponente, damit
// beide Seiten nie auseinanderlaufen), darunter die Features — je eine Slide pro
// Sache, die sie kann, mit einer BEISPIEL-Nachricht auf den Besucher personalisiert.
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

export default async function BellaPage() {
  const [state, slides, bellaCard] = await Promise.all([
    readTryThisLookState(),
    readCardStudioSlides(BELLA_ID).catch(() => [] as BellaSlide[]),
    buildBellaCard({ surface: "profile" }).catch(() => ({ card: null })),
  ]);

  const bella = (state.curators ?? []).find(c => c.id === BELLA_ID) as
    | { firstName?: string; modelName?: string; intro?: string } | undefined;
  const name = (bella?.modelName || bella?.firstName || "Bella").split(" ")[0];
  const intro = String(bella?.intro ?? "").trim();

  const ordered = slides.filter(isPublicBellaPost).sort(sortBellaPosts);
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

      {/* Ihr Profil-Kopf — derselbe Baustein wie auf der Model Card: Name auf dem
          goldenen LB-Muster, Rolle, Status. Ohne den Rest der Sammelkarte (Growth
          Score, Seriennummer, Sponsor-Block) — hier geht es um ihre Features. */}
      {bellaCard.card && (
        <ModelCardHeader name={bellaCard.card.name} title={bellaCard.card.title}
          ownedName={bellaCard.card.owner || bellaCard.card.ownerId || ""}
          isOwned={!!(bellaCard.card.owner || bellaCard.card.ownerId)} />
      )}

      {/* Ihre Features — seitlich durchblätterbar. */}
      {posts.length === 0 ? (
        <p className="px-5 pt-8 text-[13px] font-bold text-white/45">Noch keine Beiträge.</p>
      ) : (
        <BellaPersonal posts={posts} name={name} />
      )}

      {/* Werkzeug — nur für den Admin sichtbar */}
      <div className="px-4 pt-12">
        <BellaSimpleStudio />
      </div>
    </main>
  );
}
