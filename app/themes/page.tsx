import Link from "next/link";
import TopNav from "@/components/TopNav";
import { CloudSun, Cake, Sparkles, Flame, MapPin, Lock, Palmtree, Shirt, Star, Heart } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { buildBellaCard, BELLA_ID } from "@/lib/bella-card";
import { readCardStudioSlides, getSignedUrl, isPublicBellaPost, sortBellaPosts, readTryThisLookState, readKissConfig } from "@/lib/try-this-look-store";

// Katalog aller „Themen" als bildstarke Galerie (wie die Reel-/Models-Galerie).
// Aktiv: Wetter am Morgen (/themes/wetter/<model>). Weitere sind vorbereitet (coming soon).
export const dynamic = "force-dynamic"; // Cover-Foto (signierte URL) frisch laden

export const metadata = {
  title: "LuxuryBandit — AI influencers: chat with her, try any look, make videos",
  description: "Pick a model, chat with her and create videos of her in any outfit — morning weather, try-on, lingerie, kiss videos, birthday greetings. €24/month incl. 5 videos.",
  alternates: { canonical: "/themes" },
  openGraph: {
    title: "LuxuryBandit — AI influencers, videos & daily messages",
    description: "Chat with her, see any look on her in a video, get a message every morning.",
    type: "website",
  },
};

type Theme = { icon: LucideIcon; title: string; tagline: string; href?: string; cover?: string; video?: string; poster?: string; chips?: string; cover2?: string };

// Alle Karten, die ins Anprobieren führen, zeigen auf denselben Funnel-Einstieg.
const TRYON = "/try/look-1784191032626-70e3608b?pick=1";

export default async function ThemesCatalog() {
  // Cover fürs aktive „Wetter"-Thema: das WERBEVIDEO (ad-Slide) — genau das, was der
  // Besucher auf /themes/wetter/bella sieht. Fallback: Bellas Foto.
  let wetterCover = "", wetterVideo = "", wetterPoster = "";
  try {
    const { card } = await buildBellaCard({ surface: "themes" });
    wetterCover = card?.photo || "";
    const slides = (await readCardStudioSlides(BELLA_ID)).filter(isPublicBellaPost).sort(sortBellaPosts);
    const adVid = slides.find(s => s.kind === "video" && (s as { ad?: boolean }).ad === true) ?? slides.find(s => s.kind === "video");
    if (adVid) {
      wetterVideo = await getSignedUrl(adVid.path).catch(() => "");
      wetterPoster = adVid.posterPath ? await getSignedUrl(adVid.posterPath).catch(() => "") : "";
    }
  } catch { /**/ }

  // Platzhalter-Cover für die „coming soon"-Themen = echte Model-Fotos aus dem Katalog
  // (signierte URLs, keine intimen Bilder). Später bekommt jedes Thema sein eigenes Ad-Video.
  let placeholders: string[] = [];
  try {
    const state = await readTryThisLookState();
    placeholders = ((state?.curators ?? []) as Array<{ id?: string; photoUrl?: string; hidden?: boolean; status?: string }>)
      .filter(c => c.id !== BELLA_ID && !!c.photoUrl && !c.hidden && c.status !== "removed")
      .map(c => c.photoUrl as string);
  } catch { /**/ }
  const ph = (i: number) => placeholders[i % Math.max(1, placeholders.length)] || undefined;

  // Kiss-Teaser (vom Admin im Kiss-Medien-Tool hochgeladen) als Cover der Kiss-Karte.
  // Er darf BILD ODER VIDEO sein — ein Video muss ins `video`-Feld, sonst landet eine
  // .mp4 in einem <img> und die Karte zeigt ein kaputtes Bild.
  // Try-On-Karte: dieselbe Überblendung wie im Wetter — Bella im weißen Kleid ↔ in Lingerie.
  const WHITE_DRESS = "try-this-look/uploads/1784915142061-c0ea5633-a652-40bb-8476-bebf69c64658.jpg";
  let tryonDressed = "", tryonLingerie = "";
  try {
    const slides = (await readCardStudioSlides(BELLA_ID)).filter(isPublicBellaPost);
    const pickPath = (x: { kind?: string; path?: string; posterPath?: string }) => (x.kind === "video" ? x.posterPath : x.path) || "";
    const normal = slides.find(x => x.garmentCat === "normal" && pickPath(x));
    tryonDressed = (await getSignedUrl((normal && pickPath(normal)) || WHITE_DRESS).catch(() => "")) || "";
    const ling = slides.find(x => x.garmentCat === "lingerie" && pickPath(x));
    if (ling) tryonLingerie = (await getSignedUrl(pickPath(ling)).catch(() => "")) || "";
  } catch { /**/ }

  // Holiday-Karte: eines der Urlaubs-Videos (Peter & Bella) — die liegen auf der Fläche
  // „lp-journey" und haben kein Poster, also spielt die Karte das Video direkt ab.
  let urlaubVideo = "";
  try {
    const all = await readCardStudioSlides(BELLA_ID);
    const j = all.find(x => x.kind === "video" && !x.customer && !x.hidden && !x.private && !x.pendingApproval
      && (x.pages ?? []).includes("lp-journey") && x.path);
    if (j) urlaubVideo = (await getSignedUrl(j.path).catch(() => "")) || "";
  } catch { /**/ }

  // Vom Owner gelieferte Theme-Videos, fest im Storage abgelegt.
  let birthdayVideo = "", cityVideo = "", luxuryVideo = "", idolVideo = "", lingerieVideo = "";
  try {
    [birthdayVideo, cityVideo, luxuryVideo, idolVideo, lingerieVideo] = await Promise.all([
      getSignedUrl("try-this-look/videos/birthday-bella-cake.mp4").catch(() => ""),
      getSignedUrl("try-this-look/videos/city-secrets.mp4").catch(() => ""),
      getSignedUrl("try-this-look/videos/luxury-looks.mp4").catch(() => ""),
      getSignedUrl("try-this-look/videos/your-idol-with-you.mp4").catch(() => ""),
      getSignedUrl("try-this-look/videos/lingerie-looks.mp4").catch(() => ""),
    ]);
  } catch { /**/ }

  let kissCover = "", kissVideo = "";
  try {
    const kc = await readKissConfig();
    if (kc.teaserPath) {
      const url = await getSignedUrl(kc.teaserPath).catch(() => "");
      if (/\.(mp4|webm|mov)$/i.test(kc.teaserPath)) kissVideo = url; else kissCover = url;
    }
  } catch { /**/ }

  const THEMES: Theme[] = [
    { icon: CloudSun, title: "Morning Weather", tagline: "Your weather, a new look & a chat — every morning.", href: "/themes/wetter/bella", cover: wetterCover, video: wetterVideo, poster: wetterPoster },
    { icon: Palmtree, title: "Holiday with Bella", tagline: "She travels for you — daily videos & stories from Tenerife.", href: "/urlaub-mit-bella", cover: ph(5), video: urlaubVideo || undefined, chips: "♥ Tenerife · Videos · Stories" },
    // Direkt in den Funnel: /themes/tryon wäre nur eine Zwischenseite mit noch einem Button.
    // Die Landing bleibt für die Admin-Werkzeuge erreichbar (Menü → „Try-On — manage").
    { icon: Shirt, title: "Try-On", tagline: "Pick a look, pick a model — watch her wear it in a video.", href: TRYON, cover: tryonDressed || ph(6), cover2: tryonLingerie || undefined, chips: "♥ Look · Model · Video" },
    { icon: Star, title: "Your Idol with you", tagline: "Pick your idol, add your photo — the two of you in one video.", href: "/your-idol", cover: ph(7), video: idolVideo || undefined, chips: "♥ Your idol · Your photo · Video" },
    { icon: Heart, title: "Kiss any Model", tagline: "Your photo + her — a tender kiss in one video.", href: "/themes/kiss", cover: kissCover || ph(8), video: kissVideo || undefined, chips: "♥ Pick her · Your photo · Kiss" },
    { icon: Cake, title: "Birthdays", tagline: "She says happy birthday by name — send it to them.", href: "/themes/birthday", cover: ph(4), video: birthdayVideo || undefined, chips: "♥ Name · Video · Send" },
    { icon: Sparkles, title: "Luxury Looks", tagline: "A fresh luxury outfit every day — see it on her, in a video.", href: TRYON, cover: ph(0), video: luxuryVideo || undefined, chips: "♥ Look · Model · Video" },
    // Lingerie-Karte zeigt Bella in Lingerie und führt DIREKT in den Try-on-Funnel
    // (dort wählt er Look + Model) — kein „coming soon" mehr.
    { icon: Flame, title: "Lingerie Looks", tagline: "See her in lingerie — any look, in a video.", href: TRYON, cover: tryonLingerie || ph(1), video: lingerieVideo || undefined, chips: "♥ Lingerie · Model · Video" },
    { icon: MapPin, title: "City Secrets", tagline: "Learn a city every day — hidden gems & stories.", cover: ph(2), video: cityVideo || undefined },
  ];

  return (
    <main className="lb-bg min-h-[100dvh] text-white">
      <TopNav />

      <div className="mx-auto max-w-3xl px-4 pb-24 pt-6">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-400">LuxuryBandit Topics</p>
        <h1 className="mt-1 text-[28px] font-black leading-tight tracking-tight">
          Pick a topic. <span className="text-amber-400">Get it every day.</span>
        </h1>
        <p className="mt-2 max-w-xl text-[14px] font-semibold leading-relaxed text-white/60">
          Each topic sends daily content from your favorite influencer — plus a chat with her.
          <span className="font-black text-white"> Morning Weather, Holiday, Try-On &amp; Your Idol</span> are live; more are on the way.
        </p>

        {/* Startseite → zu den Models. Zwei Wege, weil beides gefragt ist: die ganze
            Galerie und der Chat-Einstieg. */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/stores?view=models"
            className="lb-gold flex h-11 items-center justify-center gap-2 rounded-full px-5 text-[14px] font-black active:scale-95 transition">
            👑 Schau dir unsere wunderbaren Models an →
          </Link>
          <Link href="/wardrobe"
            className="flex h-11 items-center justify-center rounded-full border border-white/20 px-5 text-[14px] font-black text-white/85 active:scale-95 transition">
            Wardrobe
          </Link>
        </div>

        {/* Karten EXAKT im Stil der Models-Galerie: Bild oben (Badge + Pille), Text darunter, kein Rahmen. */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {THEMES.map((t) => {
            const Icon = t.icon;
            const active = !!t.href;
            const inner = (
              <>
                <div className="relative aspect-[3/4] overflow-hidden lb-media-bg">
                  {/* Cover: Werbevideo (aktiv) → Foto → Icon-Wasserzeichen (coming soon, kein Bild) */}
                  {t.video ? (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video src={t.video} poster={t.poster || t.cover || undefined}
                      autoPlay muted loop playsInline preload="metadata"
                      className="h-full w-full object-cover object-top" />
                  ) : t.cover ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {t.cover2 && <img src={t.cover2} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={t.cover} alt="" className={"absolute inset-0 h-full w-full object-cover object-top " + (active ? "" : "brightness-[0.8] ") + (t.cover2 ? "lb-swap-top" : "")} />
                    </>
                  ) : (
                    <div className="absolute inset-0 grid place-items-center"><Icon className="h-16 w-16 text-white/10" strokeWidth={1.25} /></div>
                  )}
                  {/* Badge oben rechts — wie der GS-Badge der Models */}
                  {active
                    ? <span className="lb-gold absolute right-2 top-2 z-10 rounded-full px-2 py-0.5 text-[10px] font-black shadow">LIVE</span>
                    : <span className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-black text-white/80 backdrop-blur"><Lock className="h-2.5 w-2.5" /> Soon</span>}
                  {/* Pille unten links — wie „N looks" */}
                  {active && <span className="absolute left-2 bottom-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-black text-white backdrop-blur">Daily</span>}
                </div>
                <div className="px-2.5 py-2">
                  <p className="truncate text-[13px] font-black text-white">{t.title}</p>
                  <p className="truncate text-[11px] font-bold text-white/80">{t.tagline}</p>
                  <p className="mt-0.5 truncate text-[9px] font-black uppercase tracking-wide text-amber-400/70">
                    {active ? (t.chips || "♥ Weather · New look · Chat") : "Coming soon"}
                  </p>
                </div>
              </>
            );
            const cls = "flex flex-col overflow-hidden rounded-2xl bg-white/[0.04] active:opacity-80 transition-opacity";
            return active
              ? <Link key={t.title} href={t.href!} className={cls}>{inner}</Link>
              : <div key={t.title} className={`${cls} opacity-90`}>{inner}</div>;
          })}
        </div>

        {/* ── SEO / Erklärtext ──────────────────────────────────────────────────────
            Echter, lesbarer Text für Suchmaschinen UND Menschen: was LuxuryBandit ist
            und was die App kann. Bewusst als normale Überschriften + Absätze (kein
            versteckter Keyword-Block) — Google straft verborgenen Text ab. */}
        <section className="mt-14 border-t border-white/10 pt-8">
          <h2 className="text-[20px] font-black leading-tight">What is LuxuryBandit?</h2>
          <p className="mt-2 text-[14px] font-medium leading-relaxed text-white/70">
            LuxuryBandit is an influencer marketplace with <strong className="text-white">AI influencers</strong>.
            You pick a model, chat with her, and create videos of her in any outfit you like — all in
            your browser, no app to install. Some of our influencers are AI-generated characters, some
            are real models who joined the platform. Every chat is answered by an AI persona, and we
            say so on every screen — see our <Link href="/ai-notice" className="underline">AI Notice</Link>.
          </p>

          <h2 className="mt-8 text-[20px] font-black leading-tight">What can you do with it?</h2>
          <ul className="mt-2 space-y-2 text-[14px] font-medium leading-relaxed text-white/70">
            <li><strong className="text-white">Morning Weather</strong> — every morning she sends you
              a message: the weather where you are, a new look of hers, and a chat with her.</li>
            <li><strong className="text-white">Try-On</strong> — pick an outfit and a model, and watch
              her wear it in a video: she turns around, walks, every angle.</li>
            <li><strong className="text-white">Lingerie &amp; Luxury Looks</strong> — the same, in her
              most elegant and most intimate looks.</li>
            <li><strong className="text-white">Kiss any Model</strong> — upload your photo and see the
              two of you share a kiss in one video.</li>
            <li><strong className="text-white">Your Idol with you</strong> — pick your idol (or upload
              her photo) and see the two of you together at a party.</li>
            <li><strong className="text-white">Birthday videos</strong> — type a name and she wishes
              them a happy birthday out loud, by name. Then send it to them.</li>
            <li><strong className="text-white">Holiday with Bella</strong> — she travels for you and
              brings back fresh videos and stories every day.</li>
          </ul>

          <h2 className="mt-8 text-[20px] font-black leading-tight">How much does it cost?</h2>
          <p className="mt-2 text-[14px] font-medium leading-relaxed text-white/70">
            The daily message and the chat run on one subscription of <strong className="text-white">€24
            per month</strong>, which includes <strong className="text-white">5 videos a month</strong>.
            Birthday videos are a one-off <strong className="text-white">€3.99</strong> each. You can
            cancel the daily message at any time — every email carries an unsubscribe link, and there is
            an <Link href="/unsubscribe" className="underline">unsubscribe page</Link> too.
          </p>

          <h2 className="mt-8 text-[20px] font-black leading-tight">Good to know</h2>
          <p className="mt-2 text-[14px] font-medium leading-relaxed text-white/70">
            LuxuryBandit is for adults only — you confirm that you are 18 or older before you can chat.
            The AI persona flirts and takes an interest in your day, but it never claims to have feelings
            for you and never pretends to be a real person. Read the{" "}
            <Link href="/terms" className="underline">Terms</Link> and the{" "}
            <Link href="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        </section>

        <p className="mt-8 text-[12px] font-semibold text-white/40">
          Want your own topic as an influencer? <Link href="/curators/apply" className="font-black text-amber-400 underline underline-offset-2">Become a model →</Link>
        </p>
      </div>
    </main>
  );
}
