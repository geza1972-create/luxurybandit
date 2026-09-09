"use client";

import { useEffect, useState } from "react";
import { schrittMessen } from "@/lib/versusforge-messen";
import { useRouter } from "next/navigation";

/**
 * DER EINSTIEG AUF DER MANDANTENSEITE (Owner 09.09.2026).
 *
 * KARTEN STATT LEEREM FELD. Auf unserer Seite steht ein Eingabefeld, weil ein Unternehmer
 * ein Ziel in Worten hat. Der Kunde eines Mandanten hat das nicht: Jemand mit einer
 * Zahnlücke tippt keinen Satz über seine Lage. Hausregel
 * `chat-no-personal-questions-buttons-only` — die Leute wollen klicken, nicht tippen.
 *
 * AUSWAHL VERSCHIEBT NIE (CI, Owner 07.08.2026): Gewählt und ungewählt tragen dieselbe
 * Rahmenstärke, dieselbe Polsterung, dieselbe Höhe. Es wechselt ausschliesslich die Farbe.
 * Ein dickerer Rand am Gewählten würde die ganze Reihe springen lassen.
 *
 * DER MANDANT REIST MIT. Er geht in die Ablage und von dort mit an die Schnittstelle — die
 * nimmt ihn längst entgegen (`body.mandant`), nur geschickt hat ihn bisher niemand. Ohne
 * das landet jede Anfrage bei uns statt bei ihm.
 */

const ABLAGE = "vf_mandant_start";

export default function MandantTrichter({
  mandant, karten, knopf, fein,
}: { mandant: string; karten: string[]; knopf: string; fein: string }) {
  const router = useRouter();
  const [gewaehlt, setGewaehlt] = useState<string>("");
  const [fehler, setFehler] = useState("");

  /**
   * SCHRITT „Seite gesehen" — die oberste Sprosse der Leiter (Owner 09.09.2026: „der sieht
   * nicht, wo die User abbrechen").
   *
   * Sie ist die WICHTIGSTE Zahl des ganzen Trichters, weil sie der Nenner ist: Ohne sie
   * weiss niemand, ob von zehn Besuchern acht angefangen haben oder von tausend achtzehn.
   * Genau hier, im Baustein mit den Karten, und nicht auf der Seite: Diese Komponente steht
   * auf jeder Mandantenseite, und ein Zähler an der Seite wäre beim nächsten Umbau vergessen.
   */
  useEffect(() => { schrittMessen(mandant, "seite"); }, [mandant]);

  const los = () => {
    /* Sichtbarer Fehler AM Feld, kein Dialog (Hausregel `sichtbare-fehler-keine-formularfelder`). */
    if (!gewaehlt) { setFehler("Bitte wählen Sie zuerst aus, was auf Sie zutrifft."); return; }
    setFehler("");
    try {
      sessionStorage.setItem(ABLAGE, JSON.stringify({ mandant, text: gewaehlt }));
    } catch { /* dann eben ohne — der Trichter fragt gleich noch einmal */ }
    router.push(`/versusforge/${mandant}/start`);
  };

  return (
    <>
      <div className="mt-5 grid gap-2.5 md:grid-cols-2" role="group" aria-label="Was trifft auf Sie zu?">
        {karten.map((k) => {
          const aktiv = gewaehlt === k;
          return (
            <button
              key={k}
              type="button"
              aria-pressed={aktiv}
              onClick={() => { setGewaehlt(k); setFehler(""); }}
              className="w-full rounded-xl border-[1.5px] px-4 py-[15px] text-left text-[16px] font-semibold"
              style={{
                borderColor: aktiv ? "var(--akzent)" : "#dfe4e9",
                background: aktiv ? "color-mix(in srgb, var(--akzent) 8%, #fff)" : "#f5f7f9",
              }}
            >
              {k}
            </button>
          );
        })}
      </div>

      {fehler ? <p className="mt-3 text-[14.5px] font-bold text-[#c02626]">{fehler}</p> : null}

      <button
        type="button"
        onClick={los}
        className="mt-5 w-full rounded-xl px-5 py-4 text-[17px] font-extrabold text-white active:scale-[.99] md:w-auto md:min-w-[260px]"
        style={{ background: "var(--akzent)" }}
      >
        {knopf}
      </button>

      {fein ? <p className="mt-3 text-center text-[14px] text-[#5b666f] md:text-left">{fein}</p> : null}
    </>
  );
}
