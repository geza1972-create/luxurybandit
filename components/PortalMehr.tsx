"use client";

import { useId, useState } from "react";

/**
 * ── NACHLADEN STATT BLÄTTERN (Owner 19.09.2026: „das fetter, es geht unter — aber besser wäre
 * nachladen") ────────────────────────────────────────────────────────────────────────────────
 *
 * Unter der Wand stand „← Zurück   1 / 5   Weiter →" in grauer Schrift. Zwei Einwände, beide
 * richtig: Es ging optisch unter, UND es ist der falsche Mechanismus. Wer durch einen Laden
 * geht, blättert nicht um — er scrollt weiter. Jede Seite kostet einen Seitenaufbau, wirft ihn
 * nach oben und verliert die Stelle, an der er war.
 *
 * ── WARUM CSS UND NICHT `children.slice()` ──────────────────────────────────────────────────
 *
 * ALLE Kacheln stehen im HTML, von Anfang an — verborgen wird nur, was noch nicht dran ist.
 * Zwei Gründe:
 *
 *   • GOOGLE SIEHT ALLES. Ein Nachladen, das die übrigen Werke erst auf Klick in die Seite
 *     schreibt, macht sie für die Suche unsichtbar — und die Werke sind hier der ganze Inhalt.
 *     Die alten `?s=`-Adressen waren wenigstens auffindbar; ein Nachladen darf dahinter nicht
 *     zurückfallen.
 *   • ES RUCKELT NICHT. Kein neues Rendern, kein Nachladen von Bildern beim Klick — sie hängen
 *     an `loading="lazy"` und kommen von selbst, sobald sie sichtbar werden.
 *
 * Der Preis ist ein etwas grösseres HTML-Dokument. Bei rund hundert Kacheln ist das messbar
 * nichts; erst bei Tausenden gehört hier echtes Nachladen hin (Hausregel: erst messen).
 *
 * ── UND DER KNOPF IST EIN KNOPF ─────────────────────────────────────────────────────────────
 *
 * Schwarz, fett, in Versalien — dieselbe Sprache wie die Reiter oben. Er sagt ausserdem, wie
 * viel noch kommt: „Noch 47 anzeigen" ist eine Auskunft, „Mehr" ist eine Vermutung.
 */
export default function PortalMehr({ children, gesamt, schritt = 24, wort, alleWort }: {
  /** Die fertige Liste — ein `<ul>` mit `<li>`-Kindern. */
  children: React.ReactNode;
  gesamt: number;
  schritt?: number;
  /** „Noch {n} anzeigen" — `{n}` wird ersetzt. */
  wort: string;
  /** Was auf dem Knopf steht, wenn der letzte Schub kleiner ist als ein voller. */
  alleWort?: string;
}) {
  const [sichtbar, setSichtbar] = useState(schritt);
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const offen = gesamt - sichtbar;

  return (
    <div id={`mehr-${id}`}>
      {/* Nur nötig, solange wirklich etwas verborgen ist — sonst steht eine Regel im Dokument,
          die auf nichts zeigt. */}
      {offen > 0 ? (
        <style>{`#mehr-${id} li:nth-child(n+${sichtbar + 1}){display:none}`}</style>
      ) : null}
      {children}
      {offen > 0 ? (
        <div className="mt-10 flex justify-center">
          <button type="button" onClick={() => setSichtbar(n => n + schritt)}
            className="rounded-none border-2 border-[#111] bg-white px-7 py-3.5 text-[13.5px] font-black uppercase tracking-[0.14em] text-[#111] transition hover:bg-[#111] hover:text-white active:scale-[.99]">
            {(offen <= schritt && alleWort ? alleWort : wort).replace("{n}", String(offen))}
          </button>
        </div>
      ) : null}
    </div>
  );
}
