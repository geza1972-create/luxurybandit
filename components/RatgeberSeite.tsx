import Link from "next/link";
import TopNav from "@/components/TopNav";
import SpracheAmDokument from "@/components/SpracheAmDokument";
import SeitenFuss from "@/components/SeitenFuss";
import { VorlagenKachel } from "@/components/CI";
import { mitPreis, ratgeberUrl, type Ratgeber, type RatgeberSprache } from "@/lib/ratgeber";

/**
 * DER AUFBAU EINER RATGEBER-SEITE — EINMAL, fuer alle Sprachen (lib/ratgeber.ts liefert den
 * Inhalt). Kein eigener Entwurf je Sprache: Zwei Seiten, die verschieden aussehen, lesen sich
 * fuer eine Suchmaschine wie zwei verschiedene Angebote.
 *
 * BEWUSST EINE TEXTSEITE UND KEINE LANDINGPAGE. Die Themenseiten des Hauses haben 113 bis 685
 * Woerter — fuer eine Suchmaschine zu wenig, um sie einer Frage zuzuordnen. Diese Seite ist
 * das Gegenstueck: Ueberschriften-Gliederung, durchgehender Text, ein Beispielvideo in der
 * Haus-Karte (Memory `karte-ist-die-huelle-fuer-videos`: nie ein nacktes <video>) und genau
 * EIN Kaufweg am Ende.
 */
export default function RatgeberSeite({ lang, artikel }: {
  lang: RatgeberSprache;
  artikel: Ratgeber;
}) {
  const T = (s: string) => mitPreis(s, lang);

  return (
    <main className="lb-bg lb-zentrale min-h-screen text-white">
      {/* `<html lang>` nachziehen: Das Wurzel-Layout setzt es fuer das ganze Portal und weiss
          nichts von diesen festen Sprach-Adressen — sonst staende deutscher Text in einem
          Dokument, das sich als englisch ausgibt, im Widerspruch zum `hreflang` daneben.
          (Ein verschachteltes Layout kann `<html>` in Next.js nicht anfassen.) */}
      <SpracheAmDokument lang={lang} />
      <TopNav marke="LB - Birthday" heim="/themes/birthday" motto="AI Birthday Videos" />

      <article className="mx-auto w-full max-w-[720px] px-5 pb-16 pt-4">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f6cf51]">
          {lang === "de" ? "Ratgeber" : "Ghid"}
        </p>
        <h1 className="mt-2 text-[28px] font-black leading-tight text-white">{artikel.titel}</h1>
        <p className="mt-2 text-[15px] font-bold leading-snug text-white/70">{T(artikel.beschreibung)}</p>
        <p className="mt-3 text-[11.5px] font-medium text-white/40">
          {lang === "de" ? "Stand" : "Actualizat"}: {artikel.aktualisiert}
        </p>

        <div className="mt-6 flex flex-col gap-4">
          {artikel.einleitung.map((p, i) => (
            <p key={`e${i}`} className="text-[15px] leading-relaxed text-white/85">{T(p)}</p>
          ))}
        </div>

        {/* Das Beispielvideo IN DER KARTE — Hausregel: nie ein nacktes <video>. */}
        <div className="mt-7">
          <VorlagenKachel bildUrl={artikel.videoPoster} videoUrl={artikel.video}
            posterUrl={artikel.videoPoster} sprache={lang} titel={artikel.titel}
            ansehenLabel={lang === "de" ? "Beispiel ansehen" : "Vezi exemplul"} />
          <p className="mt-2 text-center text-[11.5px] font-medium leading-snug text-white/45">
            {artikel.videoBeschriftung}
          </p>
        </div>

        {artikel.abschnitte.map((a, i) => (
          <section key={`a${i}`} className="mt-8">
            <h2 className="text-[19px] font-black leading-tight text-white">{a.h}</h2>
            <div className="mt-2 flex flex-col gap-3">
              {a.p.map((p, j) => (
                <p key={`p${j}`} className="text-[15px] leading-relaxed text-white/85">{T(p)}</p>
              ))}
            </div>
          </section>
        ))}

        {/* WAS WIR NICHT KOENNEN — steht im Text, nicht im Kleingedruckten. Eine Seite, die
            nur wirbt, beantwortet die Frage nicht, mit der jemand gesucht hat. */}
        <section className="mt-8 rounded-2xl border border-white/12 bg-white/[0.04] p-4">
          <h2 className="text-[17px] font-black leading-tight text-white">{artikel.grenzenH}</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {artikel.grenzen.map((g, i) => (
              <li key={`g${i}`} className="flex gap-2 text-[14px] leading-snug text-white/75">
                <span className="mt-[2px] text-white/35">—</span>{T(g)}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-[19px] font-black leading-tight text-white">
            {lang === "de" ? "Häufige Fragen" : "Întrebări frecvente"}
          </h2>
          <div className="mt-3 flex flex-col gap-4">
            {artikel.faq.map((q, i) => (
              <div key={`q${i}`}>
                <h3 className="text-[15px] font-black leading-snug text-white/90">{q.f}</h3>
                <p className="mt-1 text-[14.5px] leading-relaxed text-white/75">{T(q.a)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-9 rounded-2xl border border-[#f6cf51]/40 bg-[#f6cf51]/[0.07] p-5 text-center">
          <h2 className="text-[18px] font-black text-[#f6cf51]">{artikel.ctaH}</h2>
          <p className="mt-1.5 text-[14px] font-bold leading-snug text-white/75">{T(artikel.ctaText)}</p>
          <Link href={artikel.ctaHref}
            className="mt-4 inline-block rounded-full bg-[#f6cf51] px-6 py-3 text-[15px] font-black text-[#1a160f] transition active:scale-95">
            {artikel.ctaKnopf}
          </Link>
        </section>

        {/* Die Schwesterfassung verlinken — fuer Leser, und als zweites Signal neben
            `hreflang`, dass die beiden Adressen zusammengehoeren. */}
        <p className="mt-8 text-center text-[12.5px] font-bold text-white/45">
          {lang === "de" ? (
            <>Această pagină <Link href={ratgeberUrl("ro", artikel.paar)} className="text-[#f6cf51] underline">în limba română</Link>.</>
          ) : (
            <>Diese Seite <Link href={ratgeberUrl("de", artikel.paar)} className="text-[#f6cf51] underline">auf Deutsch</Link>.</>
          )}
        </p>
      </article>

      <SeitenFuss marke="LB - Birthday" />
    </main>
  );
}
