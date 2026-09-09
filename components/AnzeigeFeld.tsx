"use client";

import { useState, type ReactNode } from "react";
import { Link2 } from "lucide-react";

/**
 * EIN FELD ZUM KOPIEREN (Owner 09.09.2026: „er bekommt eine URL — dort steht alles, Titel,
 * Primärtext und Bild für die Anzeige").
 *
 * DER KNOPF IST DER ZWECK, NICHT DIE ZIERDE: Diese Texte müssen in vier Felder im
 * Werbeanzeigenmanager. Wer sie abtippt, macht Fehler; wer sie markiert, erwischt am Handy
 * den halben Absatz. Ein Knopf, der genau den Wert nimmt, ist hier die ganze Arbeit.
 *
 * RÜCKMELDUNG IST PFLICHT (Hausregel): Ohne „Kopiert." tippt man dreimal und weiss nicht, ob
 * etwas passiert ist.
 */
export default function AnzeigeFeld({
  name, wert, grenze, alsLink = false, kinder,
}: { name: string; wert: string; grenze?: number; alsLink?: boolean; kinder?: ReactNode }) {
  const [kopiert, setKopiert] = useState(false);

  return (
    <div className="rounded-xl border-[1.5px] border-[#dfe4e9] bg-[#f5f7f9] p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[#1d6fd0]">{name}</span>
        {/* Die Grenze steht dabei, weil Meta ohne Vorwarnung abschneidet — und ein
            abgeschnittener Primärtext kostet genau die Pointe. */}
        {grenze ? (
          <span className={`text-[13.5px] font-bold ${wert.length > grenze ? "text-[#c02626]" : "text-[#8b959d]"}`}>
            {wert.length}/{grenze}
          </span>
        ) : null}
      </div>
      {/**
        * BEI DER ADRESSE EIN LINK STATT EINES KOPIER-KNOPFES (Owner 09.09.2026: „raus, dafür
        * Link auf URL").
        *
        * Und es ist der bessere Knopf: Bei einem Text will er kopieren, bei einer Adresse
        * will er NACHSEHEN, ob dahinter wirklich sein Trichter steht. Ein Kopier-Knopf
        * beantwortet diese Frage nicht.
        *
        * `break-all` bleibt in beiden Fällen: Eine Adresse ist ein Wort ohne Leerzeichen und
        * liefe sonst aus dem Kasten heraus.
        */}
      {alsLink ? (
        /* SYMBOL AUCH AM LINK (Owner 09.09.2026: „auch beim Link Icon"). Die beiden Zeilen
           im Kasten gehören zusammen — mit Symbol liest man sie als Liste zweier Dinge,
           ohne als zwei zufällige Absätze. Der Link BLEIBT unterstrichen: Er ist der
           einzige der beiden, den man hier wirklich anklicken kann. */
        <a
          href={wert}
          target="_blank"
          rel="noopener"
          className="mt-2 flex items-start gap-2 text-[16px] font-semibold leading-[1.5] text-[#1d6fd0]"
        >
          <Link2 className="mt-[3px] h-[18px] w-[18px] shrink-0" aria-hidden />
          <span className="break-all underline underline-offset-2">{wert}</span>
        </a>
      ) : (
        <>
          <p className="mt-2 whitespace-pre-wrap break-all text-[16px] leading-[1.5] text-[#14181c]">{wert}</p>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(wert)
                .then(() => { setKopiert(true); setTimeout(() => setKopiert(false), 2200); })
                .catch(() => { /* dann liest er ihn eben ab */ });
            }}
            className="mt-3 rounded-lg border-[1.5px] border-[#dfe4e9] bg-white px-3.5 py-2 text-[14px] font-bold text-[#14181c]"
          >
            {kopiert ? "Kopiert." : "Kopieren"}
          </button>
        </>
      )}
      {/* WAS ZU DIESEM WERT GEHÖRT, STEHT IN DERSELBEN FLÄCHE (Owner 09.09.2026: „in der
          selben Box wie Link"). Ausserhalb sähe es aus wie eine Einstellung der Seite;
          innen ist klar, dass es genau diese Adresse betrifft. */}
      {kinder}
    </div>
  );
}
