import type { Metadata } from "next";
import LandingSeite from "@/components/LandingSeite";
import LandingKarte from "@/components/LandingKarte";
import { CornerOrnaments, DividerOrnament } from "@/components/BoxOrnaments";
import { resolveLang } from "@/lib/lang-server";
import { eur, geschenkPreisCents } from "@/lib/pricing";
import { readTryThisLookState, readThemeConfig, getSignedUrl } from "@/lib/try-this-look-store";

/**
 * LINGERIE-LANDINGPAGE — DIE SEITE VOR DEM TUNNEL (Owner 01.09.2026: „funktioniert aber ich
 * brauche die landing page davor dem tunnel").
 *
 * Der Tunnel selbst ist `/try/[lookId]` (die Lingerie-Anprobe, Memory
 * `zwei-tryon-trichter` — ein eigener Trichter je Look, getrennt vom allgemeinen
 * `/themes/tryon`). Bisher führte die Kachel „Lingerie Looks" direkt dorthin — ohne Zeile
 * Erklärung, ohne Beispiel. Dieselbe Bauweise wie `/themes/tryon` (Landingpage-Gerüst,
 * Skill-Vorgabe `components/LandingSeite.tsx`): Karte mit echten Beispielvideos, CTA in den
 * Tunnel, Feature-Karte darunter.
 *
 * DIE BEISPIELVIDEOS KOMMEN AUS DER ECHTEN MEDIENGALERIE (Owner 01.09.2026: „sound geht
 * nicht weil einige entweder kein sound haben oder du benutzt nicht unser mediagalerie") —
 * genau wie bei Kuss/Hochzeit/Future-Self über `readThemeConfig("lingerie").examplePaths` +
 * `getSignedUrl`, NICHT als fest einprogrammierte `public/`-Dateien. Verwaltet über das
 * Medien-Werkzeug `/themes/lingerie?admin=1` (ThemeMediaAdmin), dieselbe Oberfläche wie bei
 * jedem anderen Thema. Die neun Clips selbst sind kein neuer Dreh — sie lagen als lokales
 * Backup im Projektordner (`video-backup/`, `video-samples/`), nachdem der Owner in der
 * Nacht zum 01.09.2026 den gesamten Curator-Feed im Supabase-Storage gelöscht hatte; von
 * dort einmalig hochgeladen (`try-this-look/videos/…`), ab jetzt regulär über die
 * Mediengalerie gepflegt.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lingerie try-on — see yourself wearing it | LuxuryBandit",
  description: "Upload one photo of yourself and get your lingerie try-on video — turnaround, walk, every angle.",
  alternates: { canonical: "/themes/lingerie" },
};

const T: Record<string, { kicker: string; h1a: string; h1y: string; lead: string; cta: string; privat: string; merkmaleTitel: string; merkmale: { titel: string; text: string }[] }> = {
  en: {
    kicker: "Lingerie Looks", h1a: "See yourself ", h1y: "in the look",
    lead: "Upload one photo of yourself — and get your lingerie try-on video, in your card.",
    cta: "Try this look",
    privat: "Private · only for you · nothing is posted anywhere",
    merkmaleTitel: "How it works",
    merkmale: [
      { titel: "Pick a set", text: "One of our lingerie sets — already styled and ready." },
      { titel: "One photo of you", text: "A clear photo is enough. It stays private." },
      { titel: "Your video", text: "We put you in the set — as a video, every angle." },
      { titel: "In your gallery", text: "Your video waits in your gallery — share it or keep it." },
    ],
  },
  de: {
    kicker: "Lingerie Looks", h1a: "Sieh dich selbst ", h1y: "im Look",
    lead: "Lad ein Foto von dir hoch — und bekomm dein Lingerie-Try-on-Video, in deiner Karte.",
    cta: "Try this look",
    privat: "Privat · nur für dich · nichts wird irgendwo veröffentlicht",
    merkmaleTitel: "So geht es",
    merkmale: [
      { titel: "Set wählen", text: "Eines unserer Lingerie-Sets — schon gestylt und startklar." },
      { titel: "Ein Foto von dir", text: "Ein klares Foto genügt. Es bleibt privat." },
      { titel: "Dein Video", text: "Wir setzen dich ins Set — als Video, aus jedem Winkel." },
      { titel: "In deiner Galerie", text: "Dein Video wartet in deiner Galerie — teilen oder behalten." },
    ],
  },
};

export default async function LingerieThemePage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const L = await resolveLang();
  const S = T[L] ?? T.en;
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);
  const hell = String(sp.light ?? "") === "1";
  const ctaMitPreis = `${S.cta} — ${eur(geschenkPreisCents("tryon"), L)}`;

  /* DER TUNNEL BRAUCHT EINEN KONKRETEN LOOK (Memory `zwei-tryon-trichter`) — derselbe echte,
     veröffentlichte Lingerie-Look wie auf der Media-Kit-Kachel, kein Katalog dahinter. */
  let lookId = "";
  try {
    const state = await readTryThisLookState();
    const looks = (state.looks ?? []) as Array<{ id?: string; lingerie?: boolean; published?: boolean; featured?: boolean; imageUrl?: string; frontImageUrl?: string }>;
    const kandidaten = looks.filter(l => l.lingerie && l.published && (l.imageUrl || l.frontImageUrl));
    const look = kandidaten.find(l => l.featured) ?? kandidaten[0];
    lookId = look?.id ?? "";
  } catch { /**/ }

  const startHref = `${lookId ? `/try/${lookId}` : "/themes/tryon/start"}${(() => { const q = new URLSearchParams(); if (hell) q.set("light", "1"); if (code) q.set("code", code); const s = q.toString(); return s ? `?${s}` : ""; })()}`;

  /* DIE NEUN BEISPIELVIDEOS AUS DER MEDIENGALERIE (siehe Kommentar oben) — Rückfall auf
     leer, nicht auf erfundene Pfade: `LandingKarte` blendet sich bei `folien.length === 0`
     selbst aus, dieselbe Regel wie bei jedem anderen Thema ohne Beispiele. */
  let slides: { video: string; bild?: string }[] = [];
  try {
    const cfg = await readThemeConfig("lingerie");
    const paths = cfg.examplePaths ?? [];
    slides = (await Promise.all(paths.map(async p => ({ video: await getSignedUrl(p).catch(() => "") })))).filter(s => s.video);
  } catch { /**/ }

  return (
    <LandingSeite hell={hell} trackEvent="lingerie_theme_view" trackId="themes-lingerie" trackName="Lingerie-Thema"
      motto="The Media Creator" heim="/media-kit" sprachen={["en", "de"]}
      kicker={S.kicker} heroA={S.h1a} heroY={S.h1y} heroB="."
      kinder={<>
        <LandingKarte sprache={L} titel={S.kicker} href={startHref} thema="lingerie"
          teilenUrl="/themes/lingerie?utm_source=share" teilenText={S.kicker}
          preisZeile={ctaMitPreis}
          folien={slides.map(v => ({ video: v.video, poster: v.bild }))} />

        <p className="mt-2 text-center text-[10.5px] font-medium leading-snug text-white/45">🔒 {S.privat}</p>
        <p className="mt-4 text-[15px] font-semibold leading-relaxed text-white/80">{S.lead}</p>

        <div className="lb-karte relative mt-8 overflow-hidden rounded-[20px] px-4 pb-4 pt-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
          <CornerOrnaments />
          <div className="lb-karte-rahmen pointer-events-none absolute inset-[8px] rounded-[14px]" />
          <div className="relative">
            <p className="lb-karte-gold text-center text-[10px] font-black uppercase tracking-[0.24em]">{S.merkmaleTitel}</p>
            <DividerOrnament className="mt-2" />
            <div className="mt-3 grid grid-cols-2 gap-2">
              {S.merkmale.map((m, i) => (
                <div key={i} className="lb-karte-news rounded-[12px] px-2.5 py-2">
                  <span className="lb-karte-gold text-[10.5px] font-black">{String(i + 1).padStart(2, "0")}</span>
                  <p className="mt-0.5 text-[12px] font-black leading-snug">{m.titel}</p>
                  <p className="mt-0.5 text-[10.5px] font-medium leading-snug opacity-70">{m.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>}
    />
  );
}
