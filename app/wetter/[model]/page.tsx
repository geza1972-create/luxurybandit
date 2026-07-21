import { notFound } from "next/navigation";
import TopNav from "@/components/TopNav";
import ModelCardHeader from "@/components/ModelCardHeader";
import BellaSimpleStudio from "@/components/BellaSimpleStudio";
import WetterSubscribers from "@/components/WetterSubscribers";
import BellaPostsCarousel from "@/components/BellaPostsCarousel";
import WetterSubscriberView from "@/components/WetterSubscriberView";
import WetterGate from "@/components/WetterGate";
import { buildBellaCard } from "@/lib/bella-card";
import { personalize } from "@/lib/personalize";
import { readTryThisLookState, readCardStudioSlides, readWetterSubscribers, getSignedUrl, isPublicBellaPost, sortBellaPosts, type BellaSlide } from "@/lib/try-this-look-store";

// THEMA „Wetter am Morgen" — MODEL-AGNOSTISCH über /wetter/<model> (dieses Mal bella, kann jede sein).
// Besucher = Karussell + RO-Signup (Lead). Abonnent (?name=&city=&lang=) = Gruß + Wetter + Look + Chat.
// Inhaltspflege: Beiträge-Tool unten (pro Model gescoped über modelId).

export const dynamic = "force-dynamic";

const slugify = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");

export default async function WetterModelPage({ params, searchParams }: {
  params: Promise<{ model: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const { model } = await params;
  const sp = (await searchParams) ?? {};
  const subToken = String(sp.s ?? "").trim();   // unsichtbare Kennung des Abonnenten (Login)
  // Alt-Links mit ?name=&city= bleiben gültig (Rückwärtskompatibilität).
  let subName = String(sp.name ?? "").trim();
  let subCity = String(sp.city ?? "").trim();
  let subLang = String(sp.lang ?? "ro").trim();

  const state = await readTryThisLookState();
  const wanted = slugify(model);
  // Slug → Curator: id, slug, Künstlername (modelName) oder Vor-/Nachname.
  const curator = (state.curators ?? []).find((c) => {
    const cc = c as { id?: string; slug?: string; modelName?: string; firstName?: string; lastName?: string };
    return cc.id === model
      || (cc.slug && slugify(cc.slug) === wanted)
      || slugify(String(cc.modelName || "")) === wanted
      || slugify([cc.firstName, cc.lastName].filter(Boolean).join(" ")) === wanted;
  }) as { id: string; modelName?: string; firstName?: string } | undefined;

  if (!curator) notFound();
  const modelId = curator.id;
  const modelName = String(curator.modelName || curator.firstName || "Model").split(" ")[0];

  // Kennung → Abonnenten-Datensatz (Login). Name/Stadt/Sprache kommen serverseitig aus
  // dem Datensatz, NICHT aus der URL — Telefon bleibt privat. `?name=` bleibt als Alt-Link.
  if (subToken) {
    const sub = (await readWetterSubscribers(modelId)).find(s => s.id === subToken);
    if (sub) { subName = sub.name || subName; subCity = sub.city || subCity; subLang = sub.lang || subLang; }
  }
  const recognized = !!subToken || !!subName;   // eingeloggter Abonnent?
  const showAdmin = String(sp.admin ?? "") === "1";   // Admin-Werkzeuge NUR mit ?admin=1 — nie in der Kundenansicht

  const [slides, card] = await Promise.all([
    readCardStudioSlides(modelId).catch(() => [] as BellaSlide[]),
    buildBellaCard({ surface: "profile", modelId }).then(r => r.card).catch(() => null),
  ]);

  const ordered = slides.filter(isPublicBellaPost).sort(sortBellaPosts);
  const posts = (await Promise.all(ordered.map(async s => ({
    id: s.id,
    kind: s.kind,
    title: personalize(s.title ?? "", {}),
    caption: personalize(s.caption ?? "", {}),
    day: s.day ?? "",
    time: s.time ?? "",
    mediaUrl: await getSignedUrl(s.path).catch(() => ""),
    posterUrl: s.posterPath ? await getSignedUrl(s.posterPath).catch(() => "") : "",
  })))).filter(p => p.mediaUrl);

  return (
    <main className="min-h-[100dvh] lb-bg pb-16 text-white">
      <TopNav />

      {/* Kopf — Name vom Model, Thema-Texte (RO). */}
      {card && (
        <ModelCardHeader name={card.name} title="Bună dimineața ☀️"
          tagline="Un mesaj în fiecare dimineață" statusLabel="online"
          ownedName={card.owner || ""} isOwned={!!card.owner} />
      )}

      {recognized ? (
        /* EINGELOGGTER ABONNENT: Gruß + Wetter + Look + Chat. subId → Gerät merkt sich den Login. */
        <WetterSubscriberView name={subName} city={subCity} lang={subLang} modelId={modelId} modelName={modelName} subId={subToken}
          look={posts[0] ? { kind: posts[0].kind, mediaUrl: posts[0].mediaUrl, posterUrl: posts[0].posterUrl || undefined } : null} />
      ) : (
        /* BESUCHER: Beiträge-Karussell + Account anlegen (oder Gerät automatisch einloggen). */
        <>
          {posts.length === 0 ? (
            <p className="px-5 pt-8 text-[13px] font-bold text-white/45">Noch keine Beiträge.</p>
          ) : (
            <BellaPostsCarousel posts={posts} name={modelName} />
          )}
          <WetterGate modelId={modelId} modelName={modelName} lang={subLang} />
        </>
      )}

      {/* Admin-Werkzeuge — NUR mit ?admin=1 (nie in der Kundenansicht), zusätzlich PIN-gated. */}
      {showAdmin && (
        <div className="px-4 pt-12">
          <BellaSimpleStudio modelId={modelId} modelName={modelName} />
          <WetterSubscribers modelId={modelId} modelSlug={model} modelName={modelName} />
        </div>
      )}
    </main>
  );
}
