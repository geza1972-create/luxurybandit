"use client";

import { ImageUp, Check, Trash2 } from "lucide-react";

/**
 * DIE UPLOAD-KACHEL — EINE für alle Themen.
 *
 * Owner 05.08.2026: „du machst von Topic zu Topic andere Layouts und das nervt, das immer zu
 * korrigieren." · „wozu haben wir Kuss gemacht? Muss ich immer wieder alles einzeln
 * einbriefen?"
 *
 * Er hat in beidem recht, und die Regel stand längst da (UEBERGABE-05-08.md §0: „Kiss ist die
 * Vorlage"). Sie war nur auf die Textbausteine angewandt worden, nicht auf die Bedienelemente.
 *
 * WAS DIESE KACHEL VOM KUSS ÜBERNIMMT, und warum jedes Stück davon zählt:
 *
 *   PLATZHALTERFOTO   Man sieht, was hineingehört — ein Gesicht, gross, gut belichtet. Der
 *                     leere gestrichelte Rahmen der Einladung zeigte, was FEHLT; das ist das
 *                     Gegenteil einer Anleitung.
 *   GOLDENES ZEICHEN  `ImageUp` sagt „hier wird geladen", bevor jemand den Text liest.
 *   TITEL IN WEISS    Auf dem Foto, mit Schatten — er trägt auf jedem Motiv.
 *   HINWEIS           Eine Zeile, was für ein Bild gebraucht wird.
 *   HAKEN             Sobald etwas drin ist, sieht man es ohne Hinschauen.
 *   LÖSCHEN           Sichtbar an der Kachel, nie in einem Menü (Skill `upload-foto`, Pflicht 3).
 *
 * WER SIE BENUTZT: `KissFunnel` (Kuss, Geburtstag, Tanz, Idol) und `EinladungBauen`
 * (Hochzeit, Urlaub, Gutschein). Wer ein neues Thema baut, nimmt sie ebenfalls — eine zweite
 * Kachel danebenzustellen ist genau der Fehler, der diesen Baustein nötig gemacht hat.
 */
export default function UploadKachel({
  foto, titel, hinweis, platzhalter, onWaehlen, onLoeschen, loeschenLabel, className = "",
}: {
  /** Das gewählte Bild (Data-URL oder Adresse). Leer = die Kachel lädt noch ein. */
  foto?: string;
  /** „Du, die Braut" · „Er, der Bräutigam" · „Du" — steht auf dem Bild. */
  titel: string;
  /** Eine Zeile darunter: was für ein Foto gebraucht wird. Darf fehlen. */
  hinweis?: string;
  /** Das Beispielbild im leeren Zustand. Fehlt es, bleibt der Grund golden getönt. */
  platzhalter?: string;
  onWaehlen: () => void;
  /** Fehlt er, gibt es keinen Löschknopf (z. B. wenn das Bild von uns kommt). */
  onLoeschen?: () => void;
  loeschenLabel?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      {/**
        * `data-aufmedien` HÄLT DIE SCHRIFT WEISS (Owner 05.08.2026: „Schrift muss weiss sein").
        *
        * In der Einladungskarte färbt `.lb-karte span { color: #2a231c !important }` JEDE
        * Schrift auf Dunkelbraun um — auch die, die auf einem Foto liegt, und auch gegen ein
        * Inline-`style`. Auf einem Sonnenuntergang liest man das nicht (Memory
        * `lb-karte-important-frisst-inline-farben`). `data-aufmedien="1"` ist die Ausnahme,
        * die globals.css dafür kennt: Bedienung, die AUF Medien liegt, bleibt weiss.
        *
        * Im Kuss fiel es nicht auf — dort steht die Kachel auf dunklem Grund, nicht in der
        * Karte. Deshalb muss der Haken IN diesem Baustein sitzen und nicht beim Aufrufer.
        */}
      <button type="button" onClick={onWaehlen} data-oncard="1" data-aufmedien="1"
        className="relative flex aspect-[3/4] w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl border-2 border-dashed border-[#f6cf51]/40 lb-goldhauch active:scale-[0.98] transition">
        {foto ? (<>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={foto} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />
          <span className="lb-onmedia absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pb-1.5 pt-6 text-[15px] font-black"
            style={{ color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.85)" }}>
            {titel}
          </span>
          <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-[#f6cf51] shadow">
            <Check className="h-4 w-4 text-black" />
          </span>
        </>) : (<>
          {platzhalter && (<>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={platzhalter} alt="" className="absolute inset-0 h-full w-full object-cover object-top opacity-95" />
            <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
          </>)}
          <ImageUp className="relative h-7 w-7 text-[#f6cf51]" />
          <span className="lb-onmedia relative px-1 text-[14px] font-black leading-tight"
            style={{ color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.85)" }}>
            {titel}
          </span>
          {hinweis && (
            <span className="lb-onmedia relative px-2 text-[10px] font-bold leading-snug"
              style={{ color: "rgba(255,255,255,0.85)", textShadow: "0 2px 10px rgba(0,0,0,0.85)" }}>
              {hinweis}
            </span>
          )}
        </>)}
      </button>

      {/* Weisse Scheibe, rotes Zeichen — dasselbe Löschen wie überall (Memory
          `loeschen-zwei-tipps-rot` gilt für Listen; an einer einzelnen Kachel genügt der Tipp). */}
      {foto && onLoeschen && (
        <button type="button" aria-label={loeschenLabel || "Delete"} onClick={onLoeschen}
          style={{ background: "#fff", color: "#dc2626", boxShadow: "0 2px 10px rgba(0,0,0,0.35)" }}
          className="absolute left-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full transition active:scale-90">
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
