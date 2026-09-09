"use client";

import { useState } from "react";
import { Check, ChevronDown, AlertCircle } from "lucide-react";
import { Kasten } from "@/components/CI";
import { logFunnelEvent } from "@/lib/track-funnel";
import type { DavidTexte } from "@/lib/david-texte";

/**
 * DIE VORFÜHRUNG — ERSTE SEITE DES TRICHTERS, ALS SLIDER.
 *
 * Owner 07.09.2026: „So sieht es aus was du bekommst, willst du das auch, starte jetzt."
 * · „in einer Karte bitte alles" · „du machst mir Slides bei Anna, wir werden hier einige
 * Beispiele sehen" · „Details, die keiner interessiert, was sie gemacht hat — unten steht
 * doch die Analyse, was die Leute interessiert."
 *
 * WARUM MEHRERE BEISPIELE: Ein Fall trifft immer nur eine Lage. Wer arbeitslos ist,
 * erkennt sich in der Angestellten nicht — und umgekehrt. Zwei Karten nebeneinander fangen
 * beide Enden der Zielgruppe ab.
 *
 * REIHENFOLGE IN DER KARTE IST WICHTIGKEIT — was zuerst gelesen wird, muss das Wichtigste
 * sein:
 *   1. Was es gekostet hat — ein SATZ mit einem Menschen darin („ich will lesen: Anna hat
 *      34.000 € verloren"). Eine nackte Zahl las sich wie ein Gewinn.
 *   2. Was es WEITER kostet — eine Summe aus der Vergangenheit ist abgeschlossen, ein
 *      Betrag pro Monat läuft weiter, während man liest. Unterschied zwischen Trauern und
 *      Aufstehen, und bloss dieselbe Zahl durch zwölf.
 *   3. Wer sie ist — nur Bild und Name. Ihre Stationen interessieren niemanden.
 *   4. Was sie RICHTIG gemacht hat — keine Höflichkeit, sondern die Bedingung dafür, dass
 *      Punkt 5 ankommt: Wer ein Jahr lang 200 Bewerbungen schreibt, ist nicht faul.
 *   5. Was falsch war — nummeriert.
 *   6. Die Beratung, zugeklappt — dort stehen die Werkzeuge, dort wird verkauft.
 *
 * BEIDE LISTEN HABEN DIESELBE FORM (Owner: „die Listen sehen unterschiedlich aus"): links
 * immer dasselbe Kästchen, darin einmal ein Haken, einmal eine Ziffer. Ein Haken heisst
 * „erledigt", eine Ziffer „hier ist die Reihenfolge" — die Bedeutung liegt im Zeichen, nicht
 * in der Form drumherum.
 *
 * FÜR 55+ GEBAUT ([[zielgruppe-ueber-60]]): 17px Stichwort, 15px Erklärzeile, Grautöne bei
 * 70–85 % statt 45 %, Tippflächen ab 48px.
 *
 * ALLES IN DER DU-FORM, weil es Davids Antwort AN SIE ist — der Besucher liest automatisch
 * mit, als wäre es an ihn gerichtet.
 *
 * EHRLICHKEITSGRENZE: Die Fälle sind erfunden, „BEISPIEL" steht als Band AM BILD. Ein
 * Beispiel darf ein Beispiel sein, ein Erfolg nicht — „hat nach drei Wochen einen Job
 * gefunden" steht nirgends. Bei einem ECHTEN Menschen wird die Zahl nie geschätzt.
 */
export default function DavidBeweis({ T }: { T: DavidTexte }) {
  const [offen, setOffen] = useState<number | null>(null);
  const [aktiv, setAktiv] = useState(0);

  /** Ein fehlender Schlüssel darf die Seite nicht weiss machen: Eine frisch dazugekommene
   *  Zeile fehlt in jeder vorher zwischengespeicherten Übersetzung. */
  const t = (wert: string | undefined, ersatz = "") => (typeof wert === "string" && wert ? wert : ersatz);

  /**
   * BILDPFADE STEHEN HIER, NICHT IN DEN TEXTEN (07.09.2026, im Test gefunden).
   *
   * `lib/david-texte.ts` läuft komplett durch `textbausteineInSprache`. Stand der Pfad
   * dort, übersetzte die Maschine ihn mit — aus „/Lebenslauf/anna-portrait.jpg" wurde auf
   * Englisch „/resume/anna-portrait.jpg", und Anna hatte in jeder Sprache ausser Deutsch
   * ein kaputtes Bild. Pfade, Dateinamen und Kennungen gehören nie in ein Text-Objekt.
   */

  const faelle = [
    {
      name: t(T.bw1Name, "Anna"), bild: "/Lebenslauf/anna-portrait.jpg",
      vor: t(T.bw1Vor), zahl: t(T.bw1Zahl), nach: t(T.bw1Nach), satz: t(T.bw1Satz), jetzt: t(T.bw1Jetzt),
      richtig: [t(T.bw1Richtig1), t(T.bw1Richtig2), t(T.bw1Richtig3)],
      falsch: [t(T.bw1Falsch1), t(T.bw1Falsch2), t(T.bw1Falsch3)],
    },
    {
      name: t(T.bw2Name, "Anna"), bild: "/Lebenslauf/anna-portrait.jpg",
      vor: t(T.bw2Vor), zahl: t(T.bw2Zahl), nach: t(T.bw2Nach), satz: t(T.bw2Satz), jetzt: t(T.bw2Jetzt),
      richtig: [t(T.bw2Richtig1), t(T.bw2Richtig2), t(T.bw2Richtig3)],
      falsch: [t(T.bw2Falsch1), t(T.bw2Falsch2), t(T.bw2Falsch3)],
    },
  ];

  /**
   * KEIN KÄSTCHEN, NUR DAS ZEICHEN (Owner 07.09.2026: „ein Kästchen brauche ich bei der
   * Checkbox nicht, nur Häkchen"). Ein Rahmen um ein Zeichen ist Rahmen im Rahmen — die
   * Zeile hat ohnehin schon eine Trennlinie.
   *
   * UND BEIDE ZEICHEN AUS DERSELBEN FAMILIE (Owner: „die Icons sind nicht von der gleichen
   * Sorte"). Vorher stand links ein gezeichneter Haken und rechts ein getipptes „!" — zwei
   * verschiedene Welten. Jetzt beide aus demselben Satz, gleiche Grösse, gleiche Strichstärke.
   */

  return (
    <div className="mt-3">
      {/* Durchwischen statt Knöpfe: eine Karte je Bildschirmbreite, einrastend. */}
      <div
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]{display:none}"
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth - 8));
          if (i !== aktiv) { setAktiv(i); void logFunnelEvent("beweis_slide", { theme: "david", nr: String(i + 1) }); }
        }}
      >
        {faelle.map((f, fi) => (
          <div key={fi} className="w-full shrink-0 snap-center">
            <Kasten polster="p-4">
              {/* KEINE ZIERECKEN (Owner 07.09.2026: „das raus"). Die geschwungenen Ecken
                  legten sich über die Trennlinien der Liste und sahen aus wie Fehler im
                  Aufbau. Eine Befund-Karte braucht keinen Zierrat. */}

              {/**
                * BILD OBEN NEBEN DEM TITEL (Owner 07.09.2026: „Bild Anna oben neben Titel").
                *
                * Vorher stand das Porträt weiter unten in einer eigenen Zeile mit dem Namen
                * daneben — getrennt von der Aussage, die es belegt. Der Name steht ohnehin
                * IM Satz („…hat Anna…"), eine zweite Namenszeile war doppelt. Jetzt sitzt
                * das Gesicht direkt an seiner Zahl.
                *
                * Das Bild ist zugleich ein Beispiel des Produkts: genau so ein
                * Bewerbungsfoto macht David. `object-top`, damit der Kopf im Ausschnitt
                * sitzt, nicht der Pullover.
                */}
              {/* „BEISPIEL" OBEN IN DER KARTE, KLEIN UND GRAU (Owner 07.09.2026: „Beispiel
                  schreibst du nicht beim Bild, sondern in der Karte oben, grau klein").
                  Als goldenes Band am Porträt war es ein Aufkleber auf einem Gesicht und
                  zog mehr Aufmerksamkeit als die Aussage daneben. Als ruhige Zeile über der
                  Karte kennzeichnet es die ganze Karte — und genau darum geht es. */}
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[.14em] text-white/45">{t(T.bwPersonMarke, "Beispiel")}</p>

              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.bild} alt={f.name} className="h-[150px] w-[118px] shrink-0 rounded-lg border border-white/20 object-cover object-top" />
                {/* BEIDE TEXTE AUF DERSELBEN LINIE (Owner 07.09.2026: „Texte auf einer
                    Linie"). Die Überschrift stand neben dem Bild eingerückt, der Satz
                    darunter am Kartenrand — zwei verschiedene linke Kanten in einem Block.
                    Jetzt liegen beide in derselben Spalte neben dem Bild. */}
                <div className="min-w-0 flex-1">
                  <p className="text-[23px] font-black leading-[1.14] tracking-tight text-white">
                    {f.vor} <span className="text-[#f6cf51]">{f.zahl}</span> {f.nach}
                  </p>
                  <p className="mt-2.5 text-[15px] font-semibold leading-snug text-white/85">{f.satz}</p>
                </div>
              </div>

              {/* „Jeder weitere Monat: rund 2.800 €" IST RAUS (Owner 07.09.2026: „das raus").
                  Als gefülltes Feld mit runden Ecken sah es aus wie ein Knopf — und was wie
                  ein Knopf aussieht, wird angetippt. Der Blick nach vorn geht dadurch nicht
                  verloren: Er steht am Ende der Karte als Beratung und als Aufruf. */}

              {/* 4 · Was richtig war — OHNE ÜBERSCHRIFT (Owner 07.09.2026: „das raus"), wie
                  schon bei den Fehlern. Als gefüllte Pille sah sie aus wie ein Knopf, und was
                  wie ein Knopf aussieht, wird angetippt. Die Zeichen tragen die Bedeutung
                  ohnehin: Haken heisst richtig, rotes Ausrufezeichen heisst Befund. */}
              <ul className="mt-3">
                {f.richtig.map((z, i) => (
                  <li key={i} className="flex items-center gap-3 border-b border-white/10 py-2 last:border-b-0">
                    <Check className="h-[20px] w-[20px] shrink-0 text-[#f6cf51]" strokeWidth={2.75} />
                    <span className="h-[20px] w-px shrink-0 bg-white/15" aria-hidden />
                    <span className="text-[16px] font-black leading-snug text-white">{z}</span>
                  </li>
                ))}
              </ul>

              {/* Kräftige Trennung: Der Umschlag von „das war richtig" zu „das war das
                  Problem" ist der wichtigste Moment der Karte und war vorher die gleiche
                  dünne Linie wie zwischen zwei Zeilen derselben Gruppe. */}
              <div className="mt-3 border-t-2 border-white/20" />

              {/* 5 · Was falsch war — ROTES AUSRUFEZEICHEN, KEINE ÜBERSCHRIFT (Owner
                  07.09.2026: „123 nicht schreiben" · „rote Ausrufezeichen" · „Das war
                  falsch nicht schreiben"). Die Ziffern waren nur mein Beispiel fürs
                  Aufzählen und behaupteten eine Reihenfolge, die es nicht gibt. Und eine
                  Überschrift „Das war falsch" liest sich wie ein Urteil über den Menschen
                  statt wie ein Befund über seine Bewerbung — das Zeichen sagt es ohne Wort. */}
              <ul className="mt-3">
                {f.falsch.map((z, i) => (
                  <li key={i} className="flex items-start gap-3 border-b border-white/10 py-2 last:border-b-0">
                    <AlertCircle className="mt-[2px] h-[20px] w-[20px] shrink-0 text-[#e05a4a]" strokeWidth={2.75} />
                    <span className="mt-[2px] h-[20px] w-px shrink-0 bg-white/15" aria-hidden />
                    <span className="text-[16px] font-black leading-snug text-white">{z}</span>
                  </li>
                ))}
              </ul>

              {/* 6 · Mehr auf DERSELBEN Seite — kein Dialog (Hausregel `keine-overlay-dialoge`),
                  echte Tippfläche ab 48px statt unterstrichenem Textlink. */}
              <button type="button"
                onClick={() => { if (offen !== fi) void logFunnelEvent("beweis_detail", { theme: "david" }); setOffen(offen === fi ? null : fi); }}
                className="mt-4 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-white/25 px-4 text-[15px] font-semibold text-white/85 hover:border-white/45 hover:text-white">
                {offen === fi ? t(T.bwDetailZu) : t(T.bwDetailAuf)}
                <ChevronDown className={`h-4 w-4 transition-transform ${offen === fi ? "rotate-180" : ""}`} />
              </button>

              {offen === fi && (
                <div className="mt-4 border-t border-white/10 pt-4">
                  <p className="text-[12px] font-black uppercase tracking-[.12em] text-white/80">{t(T.bwDetailTitel)}</p>
                  <ul className="mt-2 space-y-2">
                    {[T.bwDetail1, T.bwDetail2, T.bwDetail3, T.bwDetail4].map((z, i) => (
                      <li key={i} className="text-[16px] font-medium leading-relaxed text-white/85">{t(z)}</li>
                    ))}
                  </ul>
                  <p className="mt-5 text-[12px] font-black uppercase tracking-[.12em] text-[#f6cf51]">{t(T.bwWerkzeugeTitel)}</p>
                  <ul className="mt-2 space-y-2">
                    {[T.bwWerkzeug1, T.bwWerkzeug2, T.bwWerkzeug3].map((z, i) => (
                      <li key={i} className="text-[16px] font-medium leading-relaxed text-white/85">{t(z)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Kasten>
          </div>
        ))}
      </div>

      {/* Punkte: zeigen, dass es mehr als einen Fall gibt. */}
      <div className="mt-3 flex items-center justify-center gap-2">
        {faelle.map((_, i) => (
          <span key={i} className={`h-2 rounded-full transition-all ${i === aktiv ? "w-6 bg-[#f6cf51]" : "w-2 bg-white/25"}`} aria-hidden />
        ))}
      </div>

      <p className="mt-2 text-center text-[13px] font-bold text-white/70">{t(T.bwHinweis)}</p>
    </div>
  );
}
