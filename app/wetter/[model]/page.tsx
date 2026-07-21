import { notFound } from "next/navigation";
import { headers } from "next/headers";
import TopNav from "@/components/TopNav";
import ModelCardHeader from "@/components/ModelCardHeader";
import BellaSimpleStudio from "@/components/BellaSimpleStudio";
import WetterSubscribers from "@/components/WetterSubscribers";
import BellaPostsCarousel from "@/components/BellaPostsCarousel";
import WetterSubscriberView from "@/components/WetterSubscriberView";
import WetterGate from "@/components/WetterGate";
import { buildBellaCard } from "@/lib/bella-card";
import { personalize } from "@/lib/personalize";
import { translateMany } from "@/lib/translate";
import { readTryThisLookState, readCardStudioSlides, readWetterSubscribers, getSignedUrl, isPublicBellaPost, sortBellaPosts, type BellaSlide } from "@/lib/try-this-look-store";

// THEMA „Wetter am Morgen" — MODEL-AGNOSTISCH über /wetter/<model> (dieses Mal bella, kann jede sein).
// Besucher = Karussell + RO-Signup (Lead). Abonnent (?name=&city=&lang=) = Gruß + Wetter + Look + Chat.
// Inhaltspflege: Beiträge-Tool unten (pro Model gescoped über modelId).

export const dynamic = "force-dynamic";

const slugify = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");

// SEO: sprechender Titel + Beschreibung + Canonical, damit Google die öffentliche Seite rankt.
export async function generateMetadata({ params }: { params: Promise<{ model: string }> }) {
  const { model } = await params;
  const name = model.charAt(0).toUpperCase() + model.slice(1);
  return {
    title: `Wetter am Morgen mit ${name} — jeden Morgen eine Nachricht`,
    description: `${name} weckt dich jeden Morgen: dein Wetter, ein neuer Look und ein Chat mit ihr. Kostenlos anmelden.`,
    alternates: { canonical: `/wetter/${model}` },
    openGraph: { title: `Wetter am Morgen mit ${name}`, description: `Jeden Morgen eine Nachricht von ${name} — Wetter, neuer Look, Chat.` },
  };
}

// Browsersprache (Accept-Language) → unterstützte Sprache. Ohne ?lang= entscheidet der Browser.
// Default ro (RO-Zielgruppe), aber de/en werden respektiert.
function langFromAccept(accept: string): "ro" | "de" | "en" {
  for (const part of accept.toLowerCase().split(",")) {
    const code = part.trim().split(";")[0].slice(0, 2);
    if (code === "de" || code === "en" || code === "ro") return code;
  }
  return "ro";
}

// Kopf-Texte pro Sprache (Thema „Wetter am Morgen").
const HEADER: Record<string, { title: string; tagline: string }> = {
  ro: { title: "Bună dimineața ☀️", tagline: "Un mesaj în fiecare dimineață" },
  de: { title: "Guten Morgen ☀️", tagline: "Jeden Morgen eine Nachricht" },
  en: { title: "Good morning ☀️", tagline: "A message every morning" },
};

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
  // Sprache: ?lang= gewinnt; sonst die Browsersprache (Accept-Language); sonst ro.
  const browserLang = langFromAccept((await headers()).get("accept-language") || "");
  let subLang = String(sp.lang ?? "").trim() || browserLang;

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
  const justConfirmed = String(sp.confirmed ?? "") === "1";   // gerade E-Mail bestätigt
  const previewMode = String(sp.preview ?? "") === "visitor" ? "visitor" : "subscriber";   // Admin-Vorschau: was der User sieht
  // Preis/Trial aus der dynamischen Admin-Preisliste (für die Kleingedruckt-Zeile).
  const trialDays = Number((state as { pricing?: { wetterAboTrialDays?: number } }).pricing?.wetterAboTrialDays ?? 7);
  const monthlyCents = Number((state as { pricing?: { wetterAboMonthlyCents?: number } }).pricing?.wetterAboMonthlyCents ?? 999);

  const [slides, card] = await Promise.all([
    readCardStudioSlides(modelId).catch(() => [] as BellaSlide[]),
    buildBellaCard({ surface: "profile", modelId }).then(r => r.card).catch(() => null),
  ]);

  const ordered = slides.filter(isPublicBellaPost).sort(sortBellaPosts);
  const rawPosts = (await Promise.all(ordered.map(async s => ({
    id: s.id,
    kind: s.kind,
    title: personalize(s.title ?? "", {}),
    caption: personalize(s.caption ?? "", {}),
    day: s.day ?? "",
    time: s.time ?? "",
    mediaUrl: await getSignedUrl(s.path).catch(() => ""),
    posterUrl: s.posterPath ? await getSignedUrl(s.posterPath).catch(() => "") : "",
  })))).filter(p => p.mediaUrl);

  // Beitrags-Texte in die Sprache des Besuchers übersetzen (einmal pro Sprache gecacht),
  // damit die Seite nicht halb rumänisch / halb deutsch ist. Original bleibt bei Fehler.
  const [txTitles, txCaptions] = await Promise.all([
    translateMany(rawPosts.map(p => p.title), subLang),
    translateMany(rawPosts.map(p => p.caption), subLang),
  ]);
  const posts = rawPosts.map((p, i) => ({ ...p, title: txTitles[i], caption: txCaptions[i] }));

  return (
    // Seite: DUNKLER Kopfbereich (TopNav + Header mit weißem Namen), darunter HELLER Inhalt.
    <main className="lb-bg text-white">
      <TopNav />

      {/* Kopf — bleibt dunkel, Name weiß (bewusst NICHT im hellen Theme). Texte in der Sprache des Besuchers. */}
      {card && (
        <ModelCardHeader name={card.name} title={(HEADER[subLang] ?? HEADER.ro).title}
          tagline={(HEADER[subLang] ?? HEADER.ro).tagline} statusLabel="online"
          ownedName={card.owner || ""} isOwned={!!card.owner} />
      )}

      {/* Inhalt (Kunde): HELL (Tageslicht-lesbar). lb-theme + lb-bg auf demselben Element.
          Volle Höhe nur ohne Admin — mit Admin folgt gleich der dunkle Werkzeug-Block. */}
      <div className={`lb-theme lb-bg pb-16 text-white ${showAdmin ? "" : "min-h-[100dvh]"}`}>
        {recognized ? (
          /* EINGELOGGTER ABONNENT: Gruß + Wetter + Look + Chat. subId → Gerät merkt sich den Login. */
          <>
          {justConfirmed && (
            <p className="mx-auto max-w-md px-4 pt-4 text-center text-[13px] font-black text-emerald-600">✓ E-Mail bestätigt — bine ai venit!</p>
          )}
          <WetterSubscriberView name={subName} city={subCity} lang={subLang} modelId={modelId} modelName={modelName} subId={subToken}
            day={posts[0]?.day || ""} time={posts[0]?.time || ""}
            look={posts[0] ? { kind: posts[0].kind, mediaUrl: posts[0].mediaUrl, posterUrl: posts[0].posterUrl || undefined } : null} />
          </>
        ) : showAdmin ? (
          /* ADMIN-VORSCHAU: umschaltbar zwischen Besucher (Anmeldung) und Abonnent (täglich).
             Beispiel-Name/-Stadt; nichts wird auf dem Gerät eingeloggt. */
          <>
            {/* Umschalter — genau das, was der User in beiden Zuständen sieht. */}
            <div className="mx-auto mt-3 flex max-w-md gap-1.5 rounded-full border border-black/10 bg-white p-1 text-center text-[12px] font-black">
              <a href="?admin=1&preview=visitor" className={`flex-1 rounded-full py-2 transition ${previewMode === "visitor" ? "bg-black text-white" : "text-black/60"}`}>👤 Besucher</a>
              <a href="?admin=1&preview=subscriber" className={`flex-1 rounded-full py-2 transition ${previewMode === "subscriber" ? "bg-black text-white" : "text-black/60"}`}>🔔 Abonnent</a>
            </div>
            <p className="mx-auto max-w-md px-4 pt-3 text-[11px] font-black uppercase tracking-[0.14em] text-black/45">
              👁 Vorschau — so sieht es der {previewMode === "visitor" ? "neue Besucher" : "Kunde jeden Morgen"}
            </p>
            {previewMode === "visitor" ? (
              <>
                {posts.length > 0 && <BellaPostsCarousel posts={posts} name={modelName} />}
                <WetterGate modelId={modelId} modelName={modelName} lang={subLang} trialDays={trialDays} monthlyCents={monthlyCents} preview />
              </>
            ) : (
              <WetterSubscriberView name="Remus" city="Timișoara" lang={subLang} modelId={modelId} modelName={modelName} subId=""
                day={posts[0]?.day || ""} time={posts[0]?.time || ""}
                look={posts[0] ? { kind: posts[0].kind, mediaUrl: posts[0].mediaUrl, posterUrl: posts[0].posterUrl || undefined } : null} />
            )}
          </>
        ) : (
          /* BESUCHER: Beiträge-Karussell + Account anlegen (oder Gerät automatisch einloggen). */
          <>
            {posts.length === 0 ? (
              <p className="px-5 pt-8 text-[13px] font-bold text-white/45">Noch keine Beiträge.</p>
            ) : (
              <BellaPostsCarousel posts={posts} name={modelName} />
            )}
            <WetterGate modelId={modelId} modelName={modelName} lang={subLang} trialDays={trialDays} monthlyCents={monthlyCents} />
          </>
        )}
      </div>

      {/* Admin-Werkzeuge — NUR mit ?admin=1, zusätzlich PIN-gated. BEWUSST außerhalb des
          hellen Themes → sie bleiben dunkel (so gebaut: Gold auf Schwarz). */}
      {showAdmin && (
        <div className="px-4 pb-16 pt-8">
          <BellaSimpleStudio modelId={modelId} modelName={modelName} />
          <WetterSubscribers modelId={modelId} modelSlug={model} modelName={modelName} />
        </div>
      )}
    </main>
  );
}
