import { notFound } from "next/navigation";
import { headers } from "next/headers";
import TopNav from "@/components/TopNav";
import ModelCardHeader from "@/components/ModelCardHeader";
import BellaSimpleStudio from "@/components/BellaSimpleStudio";
import WetterSubscribers from "@/components/WetterSubscribers";
import WetterStats from "@/components/WetterStats";
import WetterTrack from "@/components/WetterTrack";
import BellaPostsCarousel from "@/components/BellaPostsCarousel";
import WetterSubscriberView from "@/components/WetterSubscriberView";
import WetterGate from "@/components/WetterGate";
import { buildBellaCard } from "@/lib/bella-card";
import { personalize } from "@/lib/personalize";
import { translateMany } from "@/lib/translate";
import { fetchForecastLine } from "@/lib/wetter-forecast";
import WetterLangSwitcher from "@/components/WetterLangSwitcher";
import { readTryThisLookState, readCardStudioSlides, readWetterSubscribers, readWetterClicks, readWetterPaid, readKissConfig, getSignedUrl, isPublicBellaPost, sortBellaPosts, type BellaSlide } from "@/lib/try-this-look-store";

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
    alternates: { canonical: `/themes/wetter/${model}` },
    openGraph: { title: `Wetter am Morgen mit ${name}`, description: `Jeden Morgen eine Nachricht von ${name} — Wetter, neuer Look, Chat.` },
  };
}

// Browsersprache (Accept-Language) → unterstützte Sprache. Ohne ?lang= entscheidet der Browser.
// Default ro (RO-Zielgruppe), aber de/en werden respektiert.
// Unterstützte Sprachen des Wetter-Themas (ein Ort, damit Umschalter + Erkennung übereinstimmen).
const LANGS = ["ro", "de", "en", "es", "fr", "pt", "pl", "it"] as const;

// Browsersprache (Accept-Language) → unterstützte Sprache. Ohne ?lang= entscheidet der Browser.
function langFromAccept(accept: string): string {
  for (const part of accept.toLowerCase().split(",")) {
    const code = part.trim().split(";")[0].slice(0, 2);
    if ((LANGS as readonly string[]).includes(code)) return code;
  }
  return "en";   // Standard = EN, wenn der Browser keine unterstützte Sprache meldet
}

// Kopf-Texte pro Sprache (Thema „Wetter am Morgen").
const HEADER: Record<string, { title: string; tagline: string }> = {
  ro: { title: "Bună dimineața ☀️", tagline: "Un mesaj în fiecare dimineață" },
  de: { title: "Guten Morgen ☀️", tagline: "Jeden Morgen eine Nachricht" },
  en: { title: "Good morning ☀️", tagline: "A message every morning" },
  es: { title: "Buenos días ☀️", tagline: "Un mensaje cada mañana" },
  fr: { title: "Bonjour ☀️", tagline: "Un message chaque matin" },
  pt: { title: "Bom dia ☀️", tagline: "Uma mensagem todas as manhãs" },
  pl: { title: "Dzień dobry ☀️", tagline: "Wiadomość każdego ranka" },
  it: { title: "Buongiorno ☀️", tagline: "Un messaggio ogni mattina" },
};

// „E-Mail bestätigt"-Banner pro Sprache (nicht mehr halb rumänisch).
const CONFIRMED_TEXT: Record<string, string> = {
  ro: "✓ Email confirmat — bine ai venit!",
  de: "✓ E-Mail bestätigt — willkommen!",
  en: "✓ Email confirmed — welcome!",
  es: "✓ Email confirmado — ¡bienvenido!",
  fr: "✓ E-mail confirmé — bienvenue !",
  pt: "✓ Email confirmado — bem-vindo!",
  pl: "✓ E-mail potwierdzony — witaj!",
  it: "✓ Email confermata — benvenuto!",
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
  let subEmail = "";
  // Sprache: ?lang= gewinnt; sonst die Browsersprache (Accept-Language); sonst ro.
  const hdrs = await headers();
  const browserLang = langFromAccept(hdrs.get("accept-language") || "");
  let subLang = String(sp.lang ?? "").trim() || browserLang;
  // Stadt des Besuchers per IP (Vercel-Geo-Header) — für die Beispiel-Vorhersage.
  const ipCity = decodeURIComponent(hdrs.get("x-vercel-ip-city") || "").trim();

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

  // Cross-Sell-SLIDER: mehrere bezahlte Models auf Bellas Wetter-Seite → je ihr Profil (Chat 3,99/Tag + Try-ons).
  // Aria zuerst (aus der Werbung), dann ALLE weiteren aktiven Models mit Foto — kein Deckel
  // mehr (Owner-Wunsch). Die Bilder werden parallel signiert; der Slider scrollt horizontal.
  const CROSS_FEATURED_ID = "curator-1783844821720-bf178";   // Aria
  const crossCandidates = (state.curators ?? []).filter(c => {
    const cc = c as { id?: string; status?: string; photoPath?: string };
    return cc.id !== modelId && !!cc.photoPath && (cc.status === undefined || cc.status === "active");
  }) as { id: string; photoPath?: string; modelName?: string; firstName?: string }[];
  const crossOrdered = [...crossCandidates]
    .sort((a, b) => (a.id === CROSS_FEATURED_ID ? -1 : 0) - (b.id === CROSS_FEATURED_ID ? -1 : 0));
  // Poster für die beiden Mitmach-Karten unter dem Chat:
  //  · Kiss  → der Theme-Teaser aus dem Kiss-Medien-Tool (Bild ODER Video)
  //  · Try-On → das Look-Bild des Funnel-Standardlooks
  let kissTeaser = "", kissTeaserIsVideo = false, tryonTeaser = "";
  try {
    const kc = await readKissConfig();
    if (kc.teaserPath) {
      kissTeaser = (await getSignedUrl(kc.teaserPath).catch(() => "")) || "";
      kissTeaserIsVideo = /\.(mp4|webm|mov)$/i.test(kc.teaserPath);
    }
  } catch { /**/ }
  // Try-On-Karte ANIMIERT: sie blendet zwischen „angezogen" und „in Lingerie" hin und her —
  // das zeigt in zwei Sekunden, was Try-On kann. „Angezogen" = ihr Profilfoto, „Lingerie" =
  // der erste als `lingerie` markierte Beitrag.
  // „Angezogen" = Bella im weißen Kleid (Owner-Wunsch). Reihenfolge, damit du es später
  // ohne Code ändern kannst: 1) ein Beitrag, den du als `normal` markierst · 2) sonst das
  // weiße Kleid vom 25.07. · 3) sonst ihr Profilfoto.
  const WHITE_DRESS = "try-this-look/uploads/1784915142061-c0ea5633-a652-40bb-8476-bebf69c64658.jpg";
  let tryonDressed = "", tryonLingerie = "";
  try {
    const slides = (await readCardStudioSlides(modelId)).filter(isPublicBellaPost);
    const pick = (s: BellaSlide) => (s.kind === "video" ? s.posterPath : s.path) || "";
    const normal = slides.find(s => s.garmentCat === "normal" && pick(s));
    const dressedPath = (normal && pick(normal)) || WHITE_DRESS;
    tryonDressed = (await getSignedUrl(dressedPath).catch(() => "")) || "";
    if (!tryonDressed) {
      const me = (state.curators ?? []).find(c => (c as { id?: string }).id === modelId) as { photoPath?: string } | undefined;
      if (me?.photoPath) tryonDressed = (await getSignedUrl(me.photoPath).catch(() => "")) || "";
    }
    const ling = slides.find(s => s.garmentCat === "lingerie" && pick(s));
    if (ling) tryonLingerie = (await getSignedUrl(pick(ling)).catch(() => "")) || "";
  } catch { /**/ }
  tryonTeaser = tryonDressed || tryonLingerie;

  const crossModels = (await Promise.all(crossOrdered.map(async c => {
    const img = c.photoPath ? await getSignedUrl(c.photoPath).catch(() => "") : "";
    const name = String(c.modelName || c.firstName || "").split(" ")[0];
    return (img && name) ? { name, img, href: `/curator/${c.id}` } : null;
  }))).filter((x): x is { name: string; img: string; href: string } => !!x);

  // Kennung → Abonnenten-Datensatz (Login). Name/Stadt/Sprache kommen serverseitig aus
  // dem Datensatz, NICHT aus der URL — Telefon bleibt privat. `?name=` bleibt als Alt-Link.
  if (subToken) {
    const sub = (await readWetterSubscribers(modelId)).find(s => s.id === subToken);
    if (sub) { subName = sub.name || subName; subCity = sub.city || subCity; subLang = sub.lang || subLang; subEmail = sub.email || ""; }
  }
  const recognized = !!subToken || !!subName;   // eingeloggter Abonnent?

  // WEICHER PAYWALL: Öffnungen 1–7 gratis; ab der 8. sind Chat + Video gesperrt (Bild + Nachricht
  // bleiben), bis das 24-€-Abo bezahlt ist. „Öffnung" = Klick-Zähler aus dem Klick-Tracking.
  // Der Server sieht die VORHERIGEN Öffnungen (der aktuelle Klick wird clientseitig geloggt) →
  // Schwelle >= 7 sperrt genau ab dem 8. Öffnen. `?wetterpaid=1` schaltet nach der Zahlung sofort frei.
  const FREE_OPENS = 7;
  let locked = false;
  let paid = false;
  if (subToken) {
    const [clicks, paidMap] = await Promise.all([readWetterClicks(modelId), readWetterPaid(modelId)]);
    const opens = clicks[subToken]?.count ?? 0;
    paid = !!paidMap[subToken] || String(sp.wetterpaid ?? "") === "1";
    locked = opens >= FREE_OPENS && !paid;
  }
  const showAdmin = String(sp.admin ?? "") === "1";   // Admin-Werkzeuge NUR mit ?admin=1 — nie in der Kundenansicht
  const justConfirmed = String(sp.confirmed ?? "") === "1";   // gerade E-Mail bestätigt
  const previewMode = String(sp.preview ?? "") === "visitor" ? "visitor" : "subscriber";   // Admin-Vorschau: was der User sieht
  // Preis/Trial aus der dynamischen Admin-Preisliste (für die Kleingedruckt-Zeile).
  const trialDays = Number((state as { pricing?: { wetterAboTrialDays?: number } }).pricing?.wetterAboTrialDays ?? 7);
  const monthlyCents = Number((state as { pricing?: { wetterAboMonthlyCents?: number } }).pricing?.wetterAboMonthlyCents ?? 999);

  const [slides, card] = await Promise.all([
    readCardStudioSlides(modelId).catch(() => [] as BellaSlide[]),
    buildBellaCard({ surface: "profile", modelId, scope: "wetter" }).then(r => r.card).catch(() => null),
  ]);

  const ordered = slides.filter(isPublicBellaPost).sort(sortBellaPosts);
  const rawPosts = (await Promise.all(ordered.map(async s => ({
    id: s.id,
    kind: s.kind,
    title: personalize(s.title ?? "", {}),
    caption: personalize(s.caption ?? "", {}),
    day: s.day ?? "",
    time: s.time ?? "",
    ad: (s as { ad?: boolean }).ad === true,
    context: (s as { context?: string }).context ?? "",
    firstMessage: (s as { firstMessage?: string }).firstMessage ?? "",
    mediaUrl: await getSignedUrl(s.path).catch(() => ""),
    posterUrl: s.posterPath ? await getSignedUrl(s.posterPath).catch(() => "") : "",
  })))).filter(p => p.mediaUrl);

  // Beitrags-Texte in die Sprache des Besuchers übersetzen (einmal pro Sprache gecacht),
  // damit die Seite nicht halb rumänisch / halb deutsch ist. Original bleibt bei Fehler.
  const [txTitles, txCaptions, txContext] = await Promise.all([
    translateMany(rawPosts.map(p => p.title), subLang),
    translateMany(rawPosts.map(p => p.caption), subLang),
    // „Ihr Tag heute" ist der EINE Chat-Text (= erste Nachricht + Chat-Steuerung) → übersetzen.
    translateMany(rawPosts.map(p => p.context), subLang),
  ]);
  const posts = rawPosts.map((p, i) => ({ ...p, title: txTitles[i], caption: txCaptions[i], context: txContext[i] }));
  // „Werbung": Besucher (nicht eingeloggt) sehen die als Ad markierten Beiträge; sind keine
  // markiert, fällt es auf alle zurück (nie leer). Abonnent sieht den täglichen (nicht-Ad) Look.
  const adPosts = posts.filter(p => p.ad);
  const visitorPosts = adPosts.length ? adPosts : posts;
  // Abonnent sieht den Beitrag von HEUTE (day == heute); sonst den neuesten vergangenen
  // (day <= heute); sonst — falls nur zukünftige/undatierte da sind — den ersten. Ad-Posts
  // (Besucher-Werbung) zählen hier nie. So steuert der Admin per Datum, was wann erscheint.
  const todayISO = new Date().toISOString().slice(0, 10);
  const nonAd = posts.filter(p => !p.ad);
  const dayLook =
    nonAd.find(p => p.day === todayISO)
    ?? [...nonAd].filter(p => p.day && p.day <= todayISO).sort((a, b) => String(b.day).localeCompare(String(a.day)))[0]
    ?? nonAd[0]
    ?? posts[0];

  // Beispiel-VORHERSAGE für den BESUCHER (noch nicht angemeldet, also keine eigene Stadt):
  // IP-Stadt (Vercel) → sonst Hauptstadt der Sprache. So sieht er sofort „das kriegst du täglich".
  const FALLBACK_CITY: Record<string, string> = { ro: "București", de: "Berlin", en: "London", es: "Madrid", fr: "Paris", pt: "Lisboa", pl: "Warszawa", it: "Roma" };
  const exampleForecast = recognized ? null : await fetchForecastLine(ipCity || FALLBACK_CITY[subLang] || "London", subLang);

  // Sprach-Umschalter: setzt ?lang=, behält alle anderen Parameter (s, admin, preview, …).
  const langHref = (l: string) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v && k !== "lang") q.set(k, String(v));
    q.set("lang", l);
    return `?${q.toString()}`;
  };

  return (
    // Seite: DUNKLER Kopfbereich (Header mit weißem Namen), darunter HELLER Inhalt.
    // Nur Logo oben (TopNav noMenu) — das Menü bleibt UNTEN (BottomNav), kein Doppel-Menü.
    <main className="lb-bg text-white">
      <WetterTrack modelId={modelId} subId={subToken} src={String(sp.src ?? "")} />
      {/* KEINE Alters-Abfrage auf die BILDER: die Looks zeigen nicht mehr, als man am
          Strand sieht. Gegated wird der CHAT — siehe WetterSubscriberView. */}
      <TopNav />

      {/* Kopf — volle Breite (NICHT in einer Box). Dunkel, Name weiß. */}
      {card && (
        <div className="relative">
          <ModelCardHeader name={card.name} title={(HEADER[subLang] ?? HEADER.en).title}
            tagline={(HEADER[subLang] ?? HEADER.en).tagline} statusLabel="online" darkBg
            ownedName={card.owner || ""} isOwned={!!card.owner} />
          {/* Sprach-Umschalter — oben rechts im Header. Ein natives Auswahlfeld statt vieler
              winziger Chips → auf dem iPhone mit EINEM Tipp bedienbar (großer iOS-Picker). */}
          <div className="absolute right-2.5 top-2.5 z-20">
            <WetterLangSwitcher options={LANGS.map(l => ({ code: l, href: langHref(l) }))} current={subLang} />
          </div>
        </div>
      )}

      {/* Inhalt (Kunde): HELL (Tageslicht-lesbar). lb-theme + lb-bg auf demselben Element.
          Volle Höhe nur ohne Admin — mit Admin folgt gleich der dunkle Werkzeug-Block. */}
      <div className={`lb-bg pb-16 text-white ${showAdmin ? "" : "min-h-[100dvh]"}`}>
        {recognized ? (
          /* EINGELOGGTER ABONNENT: Gruß + Wetter + Look + Chat. subId → Gerät merkt sich den Login. */
          <>
          {justConfirmed && (
            <p className="mx-auto max-w-md px-4 pt-4 text-center text-[13px] font-black text-emerald-400">{CONFIRMED_TEXT[subLang] ?? CONFIRMED_TEXT.en}</p>
          )}
          <WetterSubscriberView name={subName} city={subCity || ipCity || FALLBACK_CITY[subLang] || "London"} lang={subLang} modelId={modelId} modelName={modelName} subId={subToken} email={subEmail}
            locked={locked} paid={paid} modelSlug={model} monthlyCents={2400} crossModels={crossModels} kissTeaser={kissTeaser} kissTeaserIsVideo={kissTeaserIsVideo} tryonTeaser={tryonTeaser} tryonLingerie={tryonLingerie}
            day={dayLook?.day || ""} time={dayLook?.time || ""}
            title={dayLook?.title || ""} caption={dayLook?.caption || ""} firstMessage={dayLook?.context || ""} dayContext={dayLook?.context || ""}
            look={dayLook ? { kind: dayLook.kind, mediaUrl: dayLook.mediaUrl, posterUrl: dayLook.posterUrl || undefined } : null} />
          </>
        ) : showAdmin ? (
          /* ADMIN-VORSCHAU: umschaltbar zwischen Besucher (Anmeldung) und Abonnent (täglich).
             Beispiel-Name/-Stadt; nichts wird auf dem Gerät eingeloggt. */
          <>
            {/* Umschalter — genau das, was der User in beiden Zuständen sieht. */}
            <div className="mx-auto mt-3 flex max-w-[300px] gap-1.5 rounded-full border border-white/10 bg-white/[0.04] p-1 text-center text-[12px] font-black">
              <a href="?admin=1&preview=visitor" className={`flex-1 rounded-full py-2 transition ${previewMode === "visitor" ? "bg-amber-400 text-black" : "text-white/60"}`}>👤 Besucher</a>
              <a href="?admin=1&preview=subscriber" className={`flex-1 rounded-full py-2 transition ${previewMode === "subscriber" ? "bg-amber-400 text-black" : "text-white/60"}`}>🔔 Abonnent</a>
            </div>
            <p className="mx-auto max-w-md px-4 pt-3 text-[11px] font-black uppercase tracking-[0.14em] text-white/45">
              👁 Vorschau — so sieht es der {previewMode === "visitor" ? "neue Besucher" : "Kunde jeden Morgen"}
            </p>
            {previewMode === "visitor" ? (
              <>
                {visitorPosts.length > 0 && <BellaPostsCarousel posts={visitorPosts} name={modelName} />}
                {exampleForecast && <p className="mx-auto max-w-md px-5 pt-3 text-center text-[14px] font-bold text-white/80">📍 {exampleForecast.line}</p>}
                <WetterGate modelId={modelId} modelName={modelName} lang={subLang} trialDays={trialDays} monthlyCents={monthlyCents} preview />
              </>
            ) : (
              <WetterSubscriberView name="Boy" city="Timișoara" lang={subLang} modelId={modelId} modelName={modelName} subId=""
                day={dayLook?.day || ""} time={dayLook?.time || ""}
                title={dayLook?.title || ""} caption={dayLook?.caption || ""} firstMessage={dayLook?.context || ""} dayContext={dayLook?.context || ""}
                look={dayLook ? { kind: dayLook.kind, mediaUrl: dayLook.mediaUrl, posterUrl: dayLook.posterUrl || undefined } : null} />
            )}
          </>
        ) : (
          /* BESUCHER: Beiträge-Karussell + Account anlegen (oder Gerät automatisch einloggen). */
          <>
            {visitorPosts.length === 0 ? (
              <p className="px-5 pt-8 text-[13px] font-bold text-white/45">Noch keine Beiträge.</p>
            ) : (
              <BellaPostsCarousel posts={visitorPosts} name={modelName} />
            )}
            {exampleForecast && <p className="mx-auto max-w-md px-5 pt-3 text-center text-[14px] font-bold text-white/80">📍 {exampleForecast.line}</p>}
            <WetterGate modelId={modelId} modelName={modelName} lang={subLang} trialDays={trialDays} monthlyCents={monthlyCents} />
          </>
        )}
      </div>

      {/* Admin-Werkzeuge — NUR mit ?admin=1, zusätzlich PIN-gated. BEWUSST außerhalb des
          hellen Themes → sie bleiben dunkel (so gebaut: Gold auf Schwarz). */}
      {showAdmin && (
        <div className="lb-theme space-y-4 px-4 pb-16 pt-4">
          <WetterStats modelId={modelId} />
          <BellaSimpleStudio modelId={modelId} modelName={modelName} />
          <WetterSubscribers modelId={modelId} modelSlug={model} modelName={modelName} trialDays={trialDays} />
        </div>
      )}
    </main>
  );
}
