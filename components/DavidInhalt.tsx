import { SectionTitle, Lead, Fine } from "@/components/Landing";
import { Knopf, Kasten } from "@/components/CI";
import { CornerOrnaments, DividerOrnament } from "@/components/BoxOrnaments";
import type { DavidTexte } from "@/lib/david-texte";

/**
 * DER INHALT DER DAVID-LANDINGPAGE — EINMAL GESCHRIEBEN, ZWEIMAL GEZEIGT.
 *
 * Gleiche Bauart wie `KissInhalt` (Dauerregel `tunnel-zeigt-landingpage-inhalt`, Owner
 * 14.08.2026: „alles was wir auf der Landingpage haben auch im Tunel zeigen … aber unter
 * dem Anmeldeformular"). Die Landingpage rendert das hier unter ihrer Video-Karte, der
 * Pre-Screening-Tunnel später unter seinem Formular — wer aus einer Anzeige direkt in den
 * Tunnel fällt, hat sonst nie gelesen, warum David kein CV-Checker ist.
 *
 * Reine Anzeige, kein Zustand: bleibt Server-Komponente und kostet den Tunnel kein
 * JavaScript. Alle Texte kommen als `T` herein (Quelle: lib/david-texte.ts), damit die
 * Übersetzung EINMAL auf der Seite passiert.
 *
 * TYPO NUR AUS DER BIBLIOTHEK (Skill `ci-design`): SectionTitle · Lead · Fine ·
 * Knopf · Kasten. Keine eigenen Schriftgrössen für Überschriften.
 */
export default function DavidInhalt({ T, href, ohneCta = false }: {
  T: DavidTexte;
  /** Wohin die Zweitweg-Knöpfe führen — die Tunnel-Adresse des Screenings. */
  href: string;
  /**
   * IM TRICHTER OHNE KNÖPFE (Dauerregel `tunnel-zeigt-landingpage-inhalt`): Derselbe Inhalt
   * steht unter dem Trichter — dort wäre „Jetzt kostenlos starten" ein Knopf, der auf die
   * Seite führt, auf der man schon steht.
   */
  ohneCta?: boolean;
}) {
  return (
    <>
      {/* ── Was direkt unter der Karte steht (Owner-Wortlaut, drei Absätze) ──
          Der dritte ist der Claim und steht deshalb abgesetzt mit Gold-Kante — dasselbe
          Mittel wie der Schlusssatz der Anlässe-Liste beim Kuss. */}
      <p className="mt-4 text-[15px] font-medium leading-relaxed text-white/85">{T.hero1}</p>
      <p className="mt-3 text-[15px] font-medium leading-relaxed text-white/85">{T.hero2}</p>
      <p className="mt-4 border-l-2 border-[#f6cf51]/50 pl-3 text-[15px] font-black leading-snug text-white">
        {T.hero3}
      </p>

      {/* ── Der Satz unter dem Video + der zweite Weg in den Tunnel ──
          Der EINE goldene Knopf der Seite sitzt IN der Karte (Skill `ci-design`: genau
          einer je Bildschirm) — hier unten ist es der Umriss-Knopf. */}
      <div className="mt-8">
        <p className="text-[15px] font-black leading-snug text-white">{T.unterVideo1}</p>
        <p className="mt-2 text-[15px] font-medium leading-relaxed text-white/85">{T.unterVideo2}</p>
        {!ohneCta && (
          <div className="mt-4">
            <Knopf art="umriss" href={href}>{T.cta}</Knopf>
          </div>
        )}
      </div>

      {/* ── DIE FEATURE-KARTE — Creme mit nummerierten Kacheln (Dauerregel
          `produktaufbau-video-card-feature-card`; dasselbe Muster wie /themes/tryon). ── */}
      <div className="lb-karte relative mt-10 overflow-hidden rounded-[20px] px-4 pb-4 pt-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        <CornerOrnaments />
        <div className="lb-karte-rahmen pointer-events-none absolute inset-[8px] rounded-[14px]" />
        <div className="relative">
          <p className="lb-karte-gold text-center text-[10px] font-black uppercase tracking-[0.24em]">{T.merkmaleTitel}</p>
          <DividerOrnament className="mt-2" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[{ t: T.m1t, d: T.m1d }, { t: T.m2t, d: T.m2d }, { t: T.m3t, d: T.m3d }, { t: T.m4t, d: T.m4d }].map((m, i) => (
              <div key={i} className="lb-karte-news rounded-[12px] px-2.5 py-2">
                <span className="lb-karte-gold text-[10.5px] font-black">{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-0.5 text-[12px] font-black leading-snug">{m.t}</p>
                <p className="mt-0.5 text-[10.5px] font-medium leading-snug opacity-70">{m.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ABSCHNITT 1 — was ein Recruiter NICHT sehen kann ── */}
      <section className="mt-12">
        <SectionTitle>{T.s1t}</SectionTitle>
        <Lead>{T.s1p1}</Lead>
        <p className="mt-4 text-[14px] font-black leading-snug text-white/90">{T.s1p2}</p>
        {/* Dieselbe Listenform wie die Anlässe-Liste des Hauses (LandingSeite), nur mit
            dem Pfeil statt dem Herz: Es sind offene Fragen, keine Liebesbeweise. */}
        <ul className="mt-3 space-y-2">
          {[T.s1l1, T.s1l2, T.s1l3, T.s1l4, T.s1l5].map((zeile, i) => (
            <li key={i} className="flex gap-2.5 text-[14px] font-semibold leading-snug text-white/75">
              <span className="mt-[2px] text-[13px] leading-none text-[#f6cf51]">→</span>
              {zeile}
            </li>
          ))}
        </ul>
        <p className="mt-4 border-l-2 border-[#f6cf51]/50 pl-3 text-[15px] font-black leading-snug text-white">
          {T.s1p3}
        </p>
        <Lead>{T.s1p4}</Lead>
      </section>

      {/* ── ABSCHNITT 2 — die Abgrenzung zum Score-Werkzeug ── */}
      <section className="mt-12">
        <SectionTitle>{T.s2t}</SectionTitle>
        <Lead>{T.s2p1}</Lead>
        {/* Die drei Score-Zeilen als stiller Kasten: Sie sind ein ZITAT der anderen
            Werkzeuge, kein Versprechen von uns — deshalb gedämpft und ohne Gold. */}
        <Kasten art="still" polster="px-4 py-3" className="mt-4">
          {[T.score1, T.score2, T.score3].map((z, i) => (
            <p key={i} className="text-[14px] font-bold leading-relaxed text-white/60">{z}</p>
          ))}
        </Kasten>
        <Lead>{T.s2p2}</Lead>
        <p className="mt-3 border-l-2 border-[#f6cf51]/50 pl-3 text-[16px] font-black leading-snug text-white">
          {T.s2frage}
        </p>
        <p className="mt-4 text-[15px] font-black leading-snug text-white">{T.s2p3}</p>
        <Lead>{T.s2p4}</Lead>
        <Lead>{T.s2p5}</Lead>
      </section>

      {/* ── ABSCHNITT 3 — das Beispiel, an dem man den Unterschied SIEHT ──
          Die drei Fragen stehen als Kästen, nicht im Fliesstext: Der ganze Abschnitt lebt
          davon, dass man die schlechte und die gute Frage nebeneinander liest. */}
      <section className="mt-12">
        <SectionTitle>{T.s3t}</SectionTitle>
        <Lead>{T.s3p1}</Lead>
        <Lead>{T.s3p2}</Lead>
        <Kasten art="still" polster="px-4 py-3" className="mt-3">
          <p className="text-[14.5px] font-bold leading-snug text-white/55">{T.s3schlecht}</p>
          <Fine className="mt-1 text-white/45">{T.s3schlechtLabel}</Fine>
        </Kasten>
        <Lead>{T.s3p3}</Lead>
        <Kasten art="gold" polster="px-4 py-3" className="mt-3">
          <p className="text-[14.5px] font-black leading-snug text-white">{T.s3gut1}</p>
        </Kasten>
        <Lead>{T.s3p4}</Lead>
        <Kasten art="gold" polster="px-4 py-3" className="mt-3">
          <p className="text-[14.5px] font-black leading-snug text-white">{T.s3gut2}</p>
        </Kasten>
        <Lead>{T.s3p5}</Lead>
        <p className="mt-4 border-l-2 border-[#f6cf51]/50 pl-3 text-[15px] font-black leading-snug text-white">
          {T.s3schluss}
        </p>
      </section>

      {/* ── ABSCHNITT 4 — warum das Screening je Beruf anders aussieht ──
          Der letzte Absatz nimmt bewusst zurück, was David NICHT ist (er weiss nicht alles
          über jeden Beruf). Diese Zeile bleibt drin: Ein Versprechen, das der Besucher im
          Gespräch widerlegt sieht, kostet mehr, als der Superlativ einbringt. */}
      <section className="mt-12">
        <SectionTitle>{T.s4t}</SectionTitle>
        <Lead>{T.s4p1}</Lead>
        <Lead>{T.s4p2}</Lead>
        <Lead>{T.s4p3}</Lead>
        <Lead>{T.s4p4}</Lead>
      </section>

      {/* ── ABSCHLUSS ── */}
      <section className="mt-12">
        <SectionTitle>{T.schlussT}</SectionTitle>
        <Lead>{T.schlussP}</Lead>
        {!ohneCta && (
          <div className="mt-4">
            <Knopf art="umriss" href={href}>{T.cta}</Knopf>
          </div>
        )}
        <Fine className="mt-3 text-center">{T.trust}</Fine>
      </section>
    </>
  );
}
