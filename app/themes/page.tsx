import Link from "next/link";
import TopNav from "@/components/TopNav";
import { CloudSun, Sparkles, Flame, MapPin, KeyRound, Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { buildBellaCard, BELLA_ID } from "@/lib/bella-card";
import { readCardStudioSlides, getSignedUrl, isPublicBellaPost, sortBellaPosts } from "@/lib/try-this-look-store";

// Katalog aller „Themen" als bildstarke Galerie (wie die Reel-/Models-Galerie).
// Aktiv: Wetter am Morgen (/themes/wetter/<model>). Weitere sind vorbereitet (coming soon).
export const dynamic = "force-dynamic"; // Cover-Foto (signierte URL) frisch laden

export const metadata = {
  title: "Topics — a daily message from your influencer | LuxuryBandit",
  description: "Pick a topic and get daily content from your favorite AI influencer: morning weather, luxury looks, lingerie, city secrets and more.",
  alternates: { canonical: "/themes" },
  openGraph: { title: "LuxuryBandit Topics", description: "Daily content from your favorite influencer — pick a topic." },
};

type Theme = { icon: LucideIcon; title: string; tagline: string; href?: string; cover?: string; video?: string; poster?: string };

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

  const THEMES: Theme[] = [
    { icon: CloudSun, title: "Morning Weather", tagline: "Your weather, a new look & a chat — every morning.", href: "/themes/wetter/bella", cover: wetterCover, video: wetterVideo, poster: wetterPoster },
    { icon: Sparkles, title: "Luxury Looks", tagline: "A fresh luxury outfit every single day." },
    { icon: Flame, title: "Lingerie Looks", tagline: "A daily intimate look — tasteful, private." },
    { icon: MapPin, title: "City Secrets", tagline: "Learn a city every day — hidden gems & stories." },
    { icon: KeyRound, title: "Secrets", tagline: "A little secret she shares only with you." },
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
          <span className="font-black text-white"> Morning Weather</span> is live; more are on the way.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {THEMES.map((t) => {
            const Icon = t.icon;
            const active = !!t.href;
            const face = (
              <div className={`relative aspect-[9/16] w-full overflow-hidden rounded-2xl border bg-black ${active ? "border-amber-400" : "border-white/10"}`}>
                {/* Cover: Werbevideo (aktiv, autoplay stumm) → Foto → großes Icon-Wasserzeichen */}
                {t.video ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video src={t.video} poster={t.poster || t.cover || undefined}
                    autoPlay muted loop playsInline preload="metadata"
                    className="h-full w-full object-contain" />
                ) : t.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.cover} alt="" className={`h-full w-full object-cover object-top ${active ? "" : "blur-[2px] brightness-75"}`} />
                ) : (
                  <div className="absolute inset-0 grid place-items-center">
                    <Icon className="h-20 w-20 text-white/10" strokeWidth={1.25} />
                  </div>
                )}

                {/* Status-Badge oben rechts */}
                <div className="absolute right-2 top-2 z-10">
                  {active
                    ? <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-black shadow">Live</span>
                    : <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white/75 ring-1 ring-white/20 backdrop-blur"><Lock className="h-2.5 w-2.5" /> Soon</span>}
                </div>
                {/* Icon-Chip oben links */}
                <div className="absolute left-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/45 ring-1 ring-white/20 backdrop-blur">
                  <Icon className={`h-4 w-4 ${active ? "text-amber-400" : "text-white/70"}`} />
                </div>

                {/* Titel-Overlay ganz unten, sehr kurzer Verlauf → Video bleibt frei */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-3 pb-3 pt-8">
                  <p className="text-[14px] font-black leading-tight drop-shadow">{t.title}</p>
                  <p className="mt-0.5 text-[11px] font-semibold leading-snug text-white/70 drop-shadow">{t.tagline}</p>
                </div>
              </div>
            );
            return active ? (
              <Link key={t.title} href={t.href!} className="block transition active:scale-[0.98]">{face}</Link>
            ) : (
              <div key={t.title} className="opacity-90">{face}</div>
            );
          })}
        </div>

        <p className="mt-8 text-[12px] font-semibold text-white/40">
          Want your own topic as an influencer? <Link href="/curators/apply" className="font-black text-amber-400 underline underline-offset-2">Become a model →</Link>
        </p>
      </div>
    </main>
  );
}
