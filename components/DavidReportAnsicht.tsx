import type { ReactNode } from "react";
import { Star, HelpCircle, Check, Box, Layers, Users, MapPin } from "lucide-react";
import { Auffalten } from "@/components/CI";
import type { DavidReport } from "@/lib/david-store";

/**
 * DAS ERGEBNIS — NACH DEM DESIGN DES OWNERS (28.08.2026, mit Entwurf: „ich gebe dir noch ein
 * design, wie ich es gerne hätte … Du nimmst aber unsere Farben").
 *
 * Was sein Entwurf vorgibt und diese Datei umsetzt:
 *   · Kopf mit Kicker, grosser Überschrift, Stellentitel, Ort/Art-Zeile und dem LB-Emblem
 *     im goldenen Leuchtring
 *   · eine Chip-Reihe mit den Schwerpunkten
 *   · „Das spricht für dich" als KARTE, darin je Punkt eine runde Icon-Kachel, eine goldene
 *     Kante, Titel, Text und Häkchen-Wörter
 *   · „Das könnte Fragen auslösen" als Liste mit rundem Icon und Pfeil
 *   · der Insight-Block mit DAVID selbst (Owner, direkt danach: „aber statt gehirn
 *     villeicht doch David") und dem Kernsatz, dessen Schluss in Gold steht
 *   · unten die beiden Knöpfe
 *
 * BLAU IST GOLD GEWORDEN. Der Entwurf setzt Akzente in Blau; im Haus gibt es genau EIN
 * Akzentgold (#f6cf51, Skill `ci-design`). Übernommen ist alles andere: die Anordnung, die
 * Rundungen, die Icon-Kacheln, die Ruhe zwischen den Blöcken.
 *
 * ZWEI ORTE, EINE DARSTELLUNG: der Trichter direkt nach dem Gespräch und die Seite
 * `/david/<id>` aus den Assets. Bewusst ohne `"use client"` und ohne Server-Abhängigkeiten,
 * damit beide sie rendern können.
 *
 * ALTE BERICHTE BLEIBEN LESBAR: `titel`, `tags` und `kernsatz` kamen erst mit dem Design
 * dazu. Fehlen sie, fällt jeder Block sauber auf seinen Text zurück — nie eine leere Kachel,
 * nie eine Überschrift aus dem Nichts.
 */

export type ReportTexte = {
  a1: string; a2: string; a3: string; a4: string;
  einordnungTitel: string;
  /* Der Umbau vom 28.08.2026 — Aufklapper und Quellenangaben. Optional, damit ältere
     Aufrufer (und die Übersetzungen, die noch nachziehen) nicht brechen. */
  insightVorsatz?: string;
  insightWeitere?: string;
  mehrAnzeigen?: string;
  quelleScreening?: string;
  quelleCv?: string;
  quelleAnzeige?: string;
  warumFrage?: string;
  layoutLabel: string; layoutGut: string; layoutMittel: string; layoutSchwach: string;
  fotoFehlt: string;
};

/**
 * Das Bild in der Insight-Karte — DER AKTUELLE DAVID (Owner 28.08.2026, kurz und richtig:
 * „das ist nicht David").
 *
 * Hier stand `/Lebenslauf/david.jpg` — der Avatar aus dem alten Jobs-Chat, ein anderer
 * Mensch als der, der im Landingpage-Video spricht. Zwei Gesichter für EINE Figur ist der
 * sicherste Weg, das Vertrauen zu verlieren, das dieser Block gerade aufbauen soll.
 *
 * Das Porträt ist deshalb ein Standbild AUS dem aktuellen Video (Sekunde 0,4), oben
 * beschnitten — unterhalb laufen die eingebrannten Untertitel.
 */
const DAVID_BILD = "/Lebenslauf/david-portrait.jpg";

/* Drei Icons im Wechsel für die Stärken-Kacheln: Der Entwurf zeigt Würfel, Ebenen und
   Personen — welches wohin gehört, weiss nur der Text, also rotieren sie in dieser
   Reihenfolge statt vorzutäuschen, sie wären inhaltlich gewählt. */
const STAERKE_ICONS = [Box, Layers, Users, Star];

export default function DavidReportAnsicht({ report, T, kopf }: {
  report: DavidReport;
  T: ReportTexte;
  /** Der Kopfbereich — nur die Ergebnis-Seite zeigt ihn; im Trichter steht er schon oben. */
  kopf?: {
    kicker?: string; titel: string; jobTitel?: string; jobOrt?: string; jobArt?: string; schwerpunkte?: string[];
    /** Nur bei PDF vorhanden — siehe `cvBefund.layout` in lib/david-store.ts. */
    layout?: "gut" | "mittel" | "schwach"; foto?: boolean;
  };
}) {
  return (
    <div className="flex flex-col gap-5">
      {kopf && <Kopf {...kopf} T={T} />}

      {/* ══ 1. DAVID INSIGHT — DER HERO, GANZ OBEN ══
             Owner 28.08.2026, ausführliche Vorgabe: „‚Was dein Lebenslauf noch nicht
             erzählt' soll der zentrale Hook und wichtigste Moment des Reports werden. Diese
             Aussage wird bereits in der Werbung und auf der Landingpage verwendet. Deshalb
             muss der Nutzer genau diesen Nutzen im Ergebnis sofort wiedererkennen."

             Vorher stand der Block an DRITTER Stelle, hinter zwei Abschnitten langer
             Analyse-Karten. Wer über die Anzeige kam, las also erst einen Bericht wie jeden
             anderen — und traf das Versprechen, für das er geklickt hatte, nach zweimal
             Wischen. Das ist die teuerste Reihenfolge, die es gibt.

             Er darf lauter sein als der Rest (Owner §11): grössere Schrift, goldener Rand,
             Schatten. Die Abschnitte darunter sind bewusst ruhiger geworden. */}
      {(report.einordnung || report.kernsatz || report.fehltImCv.length > 0) && (
        <section className="lb-rand-verlauf lb-rand-verlauf-gold overflow-hidden rounded-[22px] bg-[#f6cf51]/[0.05] shadow-[0_18px_50px_rgba(0,0,0,0.4)]">
          <div className="flex gap-4 p-4 pb-3">
            {/* DAVID STATT GEHIRN (Owner 28.08.2026) — sein Porträt, oben angeschnitten. */}
            <div className="relative h-[104px] w-[92px] shrink-0 overflow-hidden rounded-[16px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={DAVID_BILD} alt="David" className="h-full w-full object-cover object-top" />
              <span className="pointer-events-none absolute inset-0 rounded-[16px] ring-1 ring-inset ring-[#f6cf51]/40" />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-black uppercase tracking-[0.18em] text-[#f6cf51]">David Insight</p>
              {/* GRÖSSER ALS JEDE ANDERE ÜBERSCHRIFT IM BERICHT — das ist der Satz aus der
                  Werbung, er muss auf dem Bildschirmfoto sofort wiederzuerkennen sein. */}
              <h2 className="mt-1 text-[22px] font-black leading-[1.1] text-white">{T.a3}</h2>
              <span className="mt-2 block h-[3px] w-8 rounded-full bg-[#f6cf51]" />
            </div>
          </div>
          {T.insightVorsatz && (
            <p className="px-4 pb-2 text-[13px] font-bold leading-snug text-[#f6cf51]/85">{T.insightVorsatz}</p>
          )}
          {report.kernsatz && (
            <p className="px-4 text-[16.5px] font-black leading-snug text-white">{report.kernsatz}</p>
          )}
          {report.einordnung && (
            <p className="px-4 pt-2 text-[14px] font-medium leading-relaxed text-white/80">{report.einordnung}</p>
          )}
          {report.fehltImCv.length > 0 && (
            <div className="flex flex-col gap-2 p-4">
              {/* DIE WICHTIGSTE ERKENNTNIS STEHT OFFEN (Owner §3) — sie ist der Grund, warum
                  er hier ist. Alles Weitere klappt einzeln auf, statt als Textwand darunter
                  zu stehen. */}
              <div className="lb-rand-verlauf rounded-[16px] bg-black/30 px-4 py-3.5">
                {T.quelleScreening && (
                  <p className="text-[10.5px] font-black uppercase tracking-[0.14em] text-[#f6cf51]/80">{T.quelleScreening}</p>
                )}
                <p className="mt-1 text-[15px] font-black leading-snug text-white">{report.fehltImCv[0].punkt}</p>
                <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-white/70">{report.fehltImCv[0].warum}</p>
              </div>
              {report.fehltImCv.length > 1 && (
                <Auffalten
                  titel={`${T.insightWeitere ?? "Weitere Erkenntnisse"} (${report.fehltImCv.length - 1})`}
                  className="bg-black/25">
                  <div className="flex flex-col gap-2.5">
                    {report.fehltImCv.slice(1).map((p, i) => (
                      <div key={i}>
                        <p className="text-[14px] font-black leading-snug text-white">{p.punkt}</p>
                        <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-white/60">{p.warum}</p>
                      </div>
                    ))}
                  </div>
                </Auffalten>
              )}
            </div>
          )}
        </section>
      )}

      {/* ══ 2. DAS SPRICHT FÜR DICH — kompakt, jede Erkenntnis für sich ══
             Owner §4: „Aber bitte nicht mehr mehrere riesige Text-Cards untereinander. Jede
             Erkenntnis als kompakte einzelne Zeile / Card … Jede Erkenntnis einzeln
             ausklappbar."
             Zugeklappt steht die Überschrift und EIN Satz; der Beleg und die Häkchen-Wörter
             kommen auf Tipp. Das runde Zeichen bleibt — es ist das, was die Reihe beim
             Wischen überhaupt als Liste lesbar macht. */}
      {report.spricht.length > 0 && (
        <Karte icon={<Star className="h-4 w-4" />} titel={T.a1}>
          {report.spricht.map((p, i) => {
            const Icon = STAERKE_ICONS[i % STAERKE_ICONS.length];
            return (
              <Auffalten key={i}
                titel={p.titel || p.punkt}
                zeile={p.titel ? p.punkt : undefined}
                mehrLabel={T.mehrAnzeigen}
                marke={
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-[#f6cf51]/35 bg-[#f6cf51]/[0.07]">
                    <Icon className="h-[18px] w-[18px] text-[#f6cf51]" />
                  </span>
                }>
                {p.beleg && (
                  <div className="border-l border-[#f6cf51]/30 pl-3.5">
                    {T.quelleCv && (
                      <p className="text-[10.5px] font-black uppercase tracking-[0.14em] text-[#f6cf51]/70">{T.quelleCv}</p>
                    )}
                    <p className="mt-1 text-[13px] font-medium leading-relaxed text-white/70">{p.beleg}</p>
                  </div>
                )}
                {!!p.tags?.length && (
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                    {p.tags.map((t, k) => (
                      <span key={k} className="flex items-center gap-1.5 text-[12px] font-bold text-white/70">
                        <Check className="h-3.5 w-3.5 shrink-0 text-[#f6cf51]" />{t}
                      </span>
                    ))}
                  </div>
                )}
              </Auffalten>
            );
          })}
        </Karte>
      )}

      {/* ══ 3. DAS KÖNNTE FRAGEN AUSLÖSEN — zugeklappt, kurzer Titel ══
             Owner §6/§7: „Dieser Bereich soll standardmäßig kompakt sein … Keine drei grossen
             grauen Textblöcke direkt untereinander" und „Bitte zuerst einen kurzen
             verständlichen Titel zeigen."
             Zugeklappt steht deshalb NUR `titel` — die ausformulierte Frage (`punkt`) und
             der Grund (`warum`) erscheinen erst beim Öffnen. Ältere Berichte ohne `titel`
             fallen auf den Punkt zurück; sie sind dann so lang wie vorher, aber nicht
             kaputt. */}
      {report.offeneFragen.length > 0 && (
        <Karte icon={<HelpCircle className="h-4 w-4" />} titel={T.a2}>
          {report.offeneFragen.map((p, i) => (
            <Auffalten key={i}
              titel={p.titel || p.punkt}
              marke={
                <span className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/[0.04]">
                  <HelpCircle className="h-[17px] w-[17px] text-[#f6cf51]/80" />
                </span>
              }>
              {p.titel && <p className="text-[13.5px] font-semibold leading-relaxed text-white/85">{p.punkt}</p>}
              {p.warum && (
                <p className={`text-[13px] font-medium leading-relaxed text-white/65 ${p.titel ? "mt-2" : ""}`}>{p.warum}</p>
              )}
            </Auffalten>
          ))}
        </Karte>
      )}

      {/* ══ 4. DARAUF SOLLTEST DU VORBEREITET SEIN ══
             Owner §8: jede Recruiter-Frage einzeln ausklappbar.
             EHRLICH BLEIBEN: Der Bericht liefert zu diesen Fragen nur den Fragetext, keine
             Begründung — „Warum David diese Frage erwartet" gibt es in den Daten nicht.
             Aufgeklappt steht deshalb die vollständige Frage, nicht eine erfundene
             Erklärung. Sobald das Screening eine Begründung mitliefert, gehört sie hierher;
             bis dahin wäre sie geraten, und geraten ist in einem Bewerbungsgespräch das
             Schlechteste. */}
      {report.vorbereiten.length > 0 && (
        <Karte icon={<HelpCircle className="h-4 w-4" />} titel={T.a4}>
          {report.vorbereiten.map((f, i) => {
            const kurz = f.length > 62 ? `${f.slice(0, 60).replace(/[\s,;:]+\S*$/, "")} …` : f;
            return (
              <Auffalten key={i}
                titel={kurz}
                mehrLabel={f.length > 62 ? T.mehrAnzeigen : undefined}
                marke={<span className="text-[13px] font-black leading-snug text-[#f6cf51]">{String(i + 1).padStart(2, "0")}</span>}>
                <p className="text-[13.5px] font-semibold leading-relaxed text-white/85">{f}</p>
              </Auffalten>
            );
          })}
        </Karte>
      )}
    </div>
  );
}

/** Der Kopf des Ergebnisses — Titel links, LB-Emblem im Leuchtring rechts. */
function Kopf({ kicker, titel, jobTitel, jobOrt, jobArt, schwerpunkte, layout, foto, T }: {
  kicker?: string; titel: string; jobTitel?: string; jobOrt?: string; jobArt?: string; schwerpunkte?: string[];
  layout?: "gut" | "mittel" | "schwach"; foto?: boolean; T: ReportTexte;
}) {
  return (
    <header>
      {/* KEIN LOGO IM KOPF (Owner 28.08.2026: „Das Logo brauchen wir da nicht") — es stand
          schon in der Kopfzeile darüber, und hier nahm es dem Titel ein Drittel der Breite.
          Der Text bekommt jetzt die ganze Zeile. */}
      {kicker && <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f6cf51]">{kicker}</p>}
      <h1 className="mt-1.5 text-[28px] font-black leading-[1.08] text-white">{titel}</h1>
      <span className="mt-3 block h-[3px] w-7 rounded-full bg-[#f6cf51]" />
      {jobTitel && <p className="mt-2 text-[15px] font-bold leading-snug text-white/65">{jobTitel}</p>}
      {(jobOrt || jobArt) && (
        <p className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold text-white/45">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-white/40" />
          {[jobOrt, jobArt].filter(Boolean).join(" · ")}
        </p>
      )}

      {/* DIE EINSTUFUNG, MEHR NICHT (Owner 28.08.2026): „sehr gut · geht so · suboptimal".
          Sie steht oben, weil sie eine Frage aufwirft, die weiter unten der Kaufknopf
          beantwortet — und sie sagt bewusst NICHT, was zu ändern wäre. Ohne PDF gibt es
          keine Stufe und damit auch keine Zeile. */}
      {(layout || foto === false) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {layout && (
            <p className="text-[12.5px] font-bold text-white/55">
              {T.layoutLabel}:{" "}
              <span className={layout === "gut" ? "text-[#f6cf51]" : "font-black text-white/85"}>
                {layout === "gut" ? T.layoutGut : layout === "mittel" ? T.layoutMittel : T.layoutSchwach}
              </span>
            </p>
          )}
          {foto === false && <p className="text-[12.5px] font-bold text-white/55">{T.fotoFehlt}</p>}
        </div>
      )}

      {!!schwerpunkte?.length && (
        <div className="lb-wisch -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {schwerpunkte.slice(0, 3).map((s, i) => (
            <span key={i}
              className="flex shrink-0 items-center gap-2 rounded-full border border-[#f6cf51]/30 bg-[#f6cf51]/[0.06] px-3.5 py-2 text-[12.5px] font-bold text-white/85">
              <Star className="h-3.5 w-3.5 text-[#f6cf51]" />{s}
            </span>
          ))}
        </div>
      )}
    </header>
  );
}

/**
 * Ein Abschnitt: Zeichen + Überschrift, darunter die Blöcke — KEINE Hülle drumherum
 * (Owner 28.08.2026: „wozu dann die box noch behalten. Box in Box. Ich brauche nur die
 * innen box").
 *
 * Hier lag zuerst eine Karte mit Rahmen, in der Karten mit Rahmen lagen; dann eine Karte
 * mit Fläche, in der Karten mit Fläche lagen. Beide Male dasselbe: zwei Ebenen für eine
 * Information. Was zählt, ist der einzelne Block — die Überschrift steht frei darüber.
 */
function Karte({ icon, titel, children }: { icon: ReactNode; titel: string; children: ReactNode }) {
  return (
    <section>
      <p className="mb-3 flex items-center gap-2 px-1 text-[17px] font-black leading-snug text-white">
        <span className="text-[#f6cf51]">{icon}</span>{titel}
      </p>
      <div className="flex flex-col gap-2.5">{children}</div>
    </section>
  );
}
