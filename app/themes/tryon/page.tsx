import type { Metadata } from "next";
import LandingSeite from "@/components/LandingSeite";
import LandingKarte from "@/components/LandingKarte";
import { CornerOrnaments, DividerOrnament } from "@/components/BoxOrnaments";
import { resolveLang } from "@/lib/lang-server";
import { eur, geschenkPreisCents } from "@/lib/pricing";
import { tryonText } from "@/lib/tryon-i18n";
import { readTryThisLookState } from "@/lib/try-this-look-store";
import { tryonAuslage, tryonVideoAuslage } from "@/lib/tryon-auslage";
import { tryonVideos } from "@/lib/tryon-videos";

/**
 * DIE TRY-ON-LANDINGPAGE — ERSTER NUTZER DES LANDINGPAGE-GERÜSTS (Owner 13.08.2026:
 * „mach ein landingpage template mit componenten draus"; Aufbau siehe
 * components/LandingSeite.tsx). Diese Datei liefert nur noch die INHALTE:
 *
 *   kinder     die VIDEO-SLIDES (Owner: „Cards und videoslides. Wir haben jede menge
 *              videos") — fertige Try-on-Videos aus der Galerie als VorlagenKachel-Reihe
 *              (Video spielt stumm in der Kachel, die Scheibe öffnet die KARTE), darunter
 *              der CTA in den Tunnel und die Feature-Karte in Creme (01–04)
 *   sektionen  bewusst noch leer — Privat steht als kurze Zeile am CTA (§24)
 *
 * KEIN GRATIS (Owner 13.08.2026: „bitte keine Gratis sachen") — der CTA trägt den
 * Hauspreis aus der Tabelle (Dauerregel `prices-only-from-pricing-table`).
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Try on the look — see yourself wearing it | LuxuryBandit",
  description: "Pick a look from the wardrobe, upload one photo of yourself and get your try-on video.",
  alternates: { canonical: "/themes/tryon" },
};

export default async function TryonThemePage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const L = await resolveLang();
  const S = tryonText(L);
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);
  const hell = String(sp.light ?? "") === "1";
  /* DER PREIS IM KNOPF (Hausregel seit 10.08.: „ab 4,99 - Jetzt starten. Schreibst du in
     dem Button") — aus der Tabelle, nie getippt. */
  const ctaMitPreis = `${S.cta} — ${eur(geschenkPreisCents("tryon"), L)}`;
  const startHref = `/themes/tryon/start${(() => { const q = new URLSearchParams(); if (hell) q.set("light", "1"); if (code) q.set("code", code); const s = q.toString(); return s ? `?${s}` : ""; })()}`;

  /* DIE VIDEO-SLIDES KOMMEN AUS public/Tryon (Owner 13.08.2026: „ich habe dir einige
     videos eingefügt für das Card. Die nimmst du") — seine handverlesenen Karten-Videos,
     nicht die rohen Galerie-Ergebnisse. Rückfall in zwei Stufen: ohne Ordner-Videos die
     Galerie-Videos (tryonVideoAuslage), ganz ohne Videos die Bild-Auslage. */
  let slides: { id: string; name: string; bild: string; video: string }[] =
    tryonVideos().map((v, i) => ({ id: `tryon-video-${i}`, name: "", bild: v.poster, video: v.video }));
  let looks: { id: string; name: string; bild: string }[] = [];
  try {
    if (slides.length === 0) {
      const state = await readTryThisLookState();
      slides = tryonVideoAuslage(state.looks, (state as { generations?: Parameters<typeof tryonVideoAuslage>[1] }).generations, 10);
      if (slides.length === 0) looks = tryonAuslage(state.looks, 8);
    }
  } catch { /* Speicher nicht erreichbar → die Seite steht trotzdem, nur ohne Auslage */ }

  return (
    <LandingSeite hell={hell} trackEvent="tryon_theme_view" trackId="themes-tryon" trackName="Try-on-Thema"
      motto="The Media Creator" heim="/media-kit" sprachen={["en", "de"]}
      kicker={S.kicker} heroA={S.h1a} heroY={S.h1y} heroB="."
      kinder={<>
        {/* DIE KARTE — der wichtigste Baustein der Landingpage (Owner 13.08.2026, mit Bild
            der Geburtstags-Karte: „falls du immer noch nicht weiss was eine card ist, hier
            bitte"): Creme-Hülle, Titel oben, Video-Karussell mit Punkten, CTA IM Karten-
            Inneren, made-by unten. Seine acht Ordner-Videos sind die Folien. */}
        {slides.length > 0 && (
          <LandingKarte sprache={L} titel={S.kicker} href={startHref} thema="tryon"
            teilenUrl="/themes/tryon?utm_source=share" teilenText={S.kicker}
            preisZeile={ctaMitPreis}
            folien={slides.map(v => ({ video: v.video, poster: v.bild }))} />
        )}
        {slides.length === 0 && looks.length > 0 && (
          <a href={startHref} className="lb-wisch -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {looks.map(l => (
              <span key={l.id} className="w-[140px] shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.bild} alt="" className="aspect-[3/4] w-full rounded-2xl border border-[#f6cf51]/30 object-cover" />
                <span className="mt-1 block truncate text-center text-[10.5px] font-black text-white/70">{l.name}</span>
              </span>
            ))}
          </a>
        )}

        {/* Der CTA wohnt IN der Karte — hier unten nur noch die Privatzeile; ein zweiter
            Gold-Knopf direkt unter der Karte wäre eine Wiederholung. */}
        <p className="mt-2 text-center text-[10.5px] font-medium leading-snug text-white/45">🔒 {S.privat}</p>
        <p className="mt-4 text-[15px] font-semibold leading-relaxed text-white/80">{S.lead}</p>

        {/* DIE FEATURE-KARTE — Creme mit den vier nummerierten Kacheln (Dauerregel
            `produktaufbau-video-card-feature-card`, das 01–06-Muster der Programm-Karte). */}
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
