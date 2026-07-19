import Link from "next/link";
import ModelCard from "@/components/ModelCard";
import TopNav from "@/components/TopNav";
import { buildBellaCard } from "@/lib/bella-card";
import { readBellaScenes, getSignedUrl } from "@/lib/try-this-look-store";

// Bellas eigene Seite — im GLEICHEN Aufbau wie ein Model-Profil (/curator/[id]):
// Karte randlos direkt unter dem Header, darunter die Inhalte. Hier sind die Inhalte
// die gepflegten Szenen aus dem Admin ("Was Bella für dich macht").

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
  const [{ card }, rawScenes] = await Promise.all([
    buildBellaCard({ surface: "profile" }),
    readBellaScenes(),
  ]);

  // Nur Szenen mit Medium zeigen — eine leere Kachel hilft niemandem.
  const scenes = await Promise.all(
    (rawScenes ?? [])
      .filter(s => s.path)
      .sort((a, b) => a.order - b.order)
      .map(async s => ({ ...s, mediaUrl: await getSignedUrl(s.path).catch(() => "") })),
  );
  const visible = scenes.filter(s => s.mediaUrl);
  const first = (card?.name || "Bella").split(" ")[0];

  return (
    <main className="min-h-[100dvh] lb-bg pb-16 text-white">
      <TopNav />

      {/* Karte — randlos, direkt unter dem Header (wie auf ihrem Profil) */}
      <div className="relative">
        {card ? (
          <ModelCard {...card} showProfileLink />
        ) : (
          <div className="grid aspect-[3/4] w-full place-items-center bg-white/5 text-white/50">Bella lädt…</div>
        )}
      </div>

      {/* Was sie für dich macht */}
      <section className="px-5 pt-8">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#c9a23f]">Every day</p>
        <h1 className="mt-1.5 text-[26px] font-black leading-tight">What {first} does for you</h1>
        <p className="mt-2 text-[14px] font-semibold leading-relaxed text-white/75">
          She wakes you up, tells you the weather where she is — and where you are — and shows you her day.
        </p>
      </section>

      {visible.length === 0 ? (
        <p className="px-5 pt-6 text-[13px] font-bold text-white/45">
          Noch keine Szenen veröffentlicht.
        </p>
      ) : (
        <div className="mt-6 grid gap-8">
          {visible.map((s, i) => (
            <article key={s.id}>
              <div className="relative w-full bg-black">
                {s.kind === "video" ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video src={s.mediaUrl} controls playsInline preload="metadata" className="block w-full" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.mediaUrl} alt={s.title || `${first} — scene ${i + 1}`} className="block w-full" loading={i < 2 ? "eager" : "lazy"} />
                )}
              </div>
              <div className="px-5 pt-3">
                {s.title && <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#c9a23f]">{s.title}</p>}
                <p className="mt-1.5 whitespace-pre-line text-[14px] font-semibold leading-relaxed text-white/85">{s.caption}</p>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Abschluss — zurück in den Marktplatz, wie am Ende eines Profils */}
      <div className="px-5 pt-10">
        <Link href="/stores?view=models"
          className="flex h-13 w-full items-center justify-center rounded-2xl border border-white/20 py-3.5 text-[15px] font-black text-white/85 active:scale-95 transition">
          See all influencers →
        </Link>
      </div>
    </main>
  );
}
