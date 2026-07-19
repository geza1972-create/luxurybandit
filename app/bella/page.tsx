import TopNav from "@/components/TopNav";
import BellaSimpleStudio from "@/components/BellaSimpleStudio";
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
    | { firstName?: string; modelName?: string; photoUrl?: string; intro?: string } | undefined;
  const name = (bella?.modelName || bella?.firstName || "Bella").split(" ")[0];
  const heroUrl = bella?.photoUrl
    ? (bella.photoUrl.startsWith("http") ? bella.photoUrl : await getSignedUrl(bella.photoUrl).catch(() => ""))
    : "";
  const intro = String(bella?.intro ?? "").trim();

  const ordered = slides.filter(isPublicPost).sort(
    (a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")),
  );
  const posts = (await Promise.all(ordered.map(async s => ({
    id: s.id,
    kind: s.kind,
    caption: s.caption ?? "",
    mediaUrl: await getSignedUrl(s.path).catch(() => ""),
    posterUrl: s.posterPath ? await getSignedUrl(s.posterPath).catch(() => "") : "",
  })))).filter(p => p.mediaUrl);

  return (
    <main className="min-h-[100dvh] lb-bg pb-16 text-white">
      <TopNav />

      {/* Sie — randlos direkt unter dem Header, Name im Bild */}
      <div className="relative">
        {heroUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroUrl} alt={name} className="block w-full" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent px-5 pb-5 pt-16">
              <h1 className="text-[34px] font-black leading-none">{name}</h1>
              <p className="mt-1 text-[12px] font-black uppercase tracking-[0.2em] text-[#c9a23f]">Every day, for you</p>
            </div>
          </>
        ) : (
          <div className="grid aspect-[3/4] w-full place-items-center bg-white/5 text-white/50">Bella lädt…</div>
        )}
      </div>

      {intro && (
        <p className="px-5 pt-5 text-[15px] font-semibold leading-relaxed text-white/85">{intro}</p>
      )}

      {/* Ihre Beiträge */}
      {posts.length === 0 ? (
        <p className="px-5 pt-8 text-[13px] font-bold text-white/45">Noch keine Beiträge.</p>
      ) : (
        <div className="mt-8 grid gap-8">
          {posts.map((p, i) => (
            <article key={p.id}>
              <div className="w-full bg-black">
                {p.kind === "video" ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video src={p.mediaUrl} poster={p.posterUrl || undefined} controls playsInline preload="metadata" className="block w-full" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.mediaUrl} alt={`${name} ${i + 1}`} className="block w-full" loading={i < 2 ? "eager" : "lazy"} />
                )}
              </div>
              {p.caption && (
                <p className="whitespace-pre-line px-5 pt-3 text-[14px] font-semibold leading-relaxed text-white/85">{p.caption}</p>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Werkzeug — nur für den Admin sichtbar */}
      <div className="px-4 pt-12">
        <BellaSimpleStudio />
      </div>
    </main>
  );
}
