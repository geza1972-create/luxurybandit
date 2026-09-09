"use client";

import { useState } from "react";
import { Copy, Check, Eye, EyeOff } from "lucide-react";

/**
 * DEIN ZUGANG (Owner 09.09.2026: „unter Einstellungen muss ich noch User, Passwort sehen und
 * Link").
 *
 * ── DIE EHRLICHE ANTWORT AUF „USER, PASSWORT" ──────────────────────────────────────────────
 *
 * ES GIBT KEINE. Dieses Dashboard hat keine Anmeldung — der Schlüssel in der Adresse IST der
 * Zugang, und er kam mit der Mail. Ein Feld „Benutzername" mit einer erfundenen Kennung
 * daneben wäre eine Beschriftung für etwas, das nicht existiert.
 *
 * DASS DAS SO GEBAUT IST, HAT EINEN GRUND: Ein Mensch verwaltet hier genau eine Sache. Ein
 * Passwort, das man einmal setzt und in vier Wochen wieder vergisst, wäre für ihn ein
 * Hindernis und für uns ein zweiter Ort, an dem etwas schiefgehen kann — dieselbe
 * Entscheidung wie beim Anmelde-Link im Rest des Hauses.
 *
 * WAS DER SCHLÜSSEL DAFÜR VERLANGT: Wer den Link hat, ist drin. Er gehört nicht in eine
 * geteilte WhatsApp-Gruppe. Genau das steht auch dabei — nicht im Kleingedruckten.
 *
 * ER IST ZUERST VERDECKT. Wer sein Dashboard im Laden oder in der Praxis offen hat, soll den
 * Schlüssel nicht neben sich stehen haben; das Kopieren geht trotzdem, ohne ihn zu zeigen.
 *
 * WENN ER EIN ECHTES PASSWORT WILL, ist das ein eigener Bau (Konto, Zurücksetzen, zweites
 * Gerät) — und diese Karte ist der Ort, an dem die Frage sichtbar wird, statt in einem
 * Kommentar zu verschwinden.
 */
export default function MandantZugang({ trichterUrl, anzeigeUrl, dashboardUrl, schluessel }: {
  trichterUrl: string; anzeigeUrl: string; dashboardUrl: string; schluessel: string;
}) {
  const [sichtbar, setSichtbar] = useState(false);

  return (
    <div className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(20,24,28,.06),0_8px_28px_rgba(20,24,28,.07)] md:p-7">
      <h2 className="m-0 text-[21px] font-extrabold tracking-[-0.02em]">Dein Zugang</h2>
      <p className="mt-2.5 text-[15px] leading-[1.5] text-[#5b666f]">
        Es gibt hier keinen Benutzernamen und kein Passwort. Der Schlüssel in der Adresse ist
        dein Zugang — wer den Link hat, sieht deine Anfragen. Teile ihn nicht.
      </p>

      <div className="mt-5 flex flex-col gap-4">
        <Zeile
          etikett="Dein Trichter"
          hinweis="Diese Adresse gibst du bei Meta und Instagram als Ziel an."
          wert={trichterUrl}
        />
        <Zeile
          etikett="Deine Anzeige"
          hinweis="Titel und Primärtext zum Kopieren, dazu das Bild."
          wert={anzeigeUrl}
        />
        <Zeile
          etikett="Dein Dashboard"
          hinweis="Als Lesezeichen speichern. Diese Seite hier."
          wert={dashboardUrl}
        />
        <Zeile
          etikett="Dein Schlüssel"
          hinweis="Steckt am Ende der Dashboard-Adresse. Er ersetzt das Passwort."
          wert={schluessel}
          verdeckt={!sichtbar}
          umschalten={() => setSichtbar(v => !v)}
        />
      </div>
    </div>
  );
}

/**
 * Eine Zeile mit Etikett, Wert und Kopieren.
 *
 * KOPIEREN STATT MARKIEREN: Eine 90 Zeichen lange Adresse mit dem Finger zu markieren ist am
 * Handy die Sorte Aufgabe, bei der man aufgibt.
 */
function Zeile({ etikett, hinweis, wert, verdeckt = false, umschalten }: {
  etikett: string; hinweis: string; wert: string; verdeckt?: boolean; umschalten?: () => void;
}) {
  const [kopiert, setKopiert] = useState(false);
  const kopieren = async () => {
    try {
      await navigator.clipboard.writeText(wert);
      setKopiert(true);
      /* Nach drei Sekunden zurück — dieselbe Zeit wie beim Löschen im Haus. */
      setTimeout(() => setKopiert(false), 3000);
    } catch { /* Ohne Zwischenablage bleibt der Text zum Markieren stehen. */ }
  };

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[14.5px] font-bold text-[#14181c]">{etikett}</span>
        {umschalten && (
          <button type="button" onClick={umschalten}
            className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-[#5b666f] transition hover:text-[#14181c]">
            {verdeckt ? <Eye className="h-4 w-4" aria-hidden /> : <EyeOff className="h-4 w-4" aria-hidden />}
            {verdeckt ? "Zeigen" : "Verbergen"}
          </button>
        )}
      </div>
      <div className="mt-2 flex items-stretch gap-2">
        <code className="min-w-0 flex-1 truncate rounded-xl bg-[#f5f7f9] px-4 py-3.5 font-mono text-[14.5px] text-[#14181c]">
          {verdeckt ? "•".repeat(Math.min(wert.length, 32)) : wert}
        </code>
        <button
          type="button"
          onClick={() => void kopieren()}
          aria-label={`${etikett} kopieren`}
          className={`grid w-12 shrink-0 place-items-center rounded-xl border-[1.5px] transition ${
            kopiert ? "border-[#1a7f4b]/40 bg-[#eefaf1] text-[#1a7f4b]" : "border-[#dfe4e9] bg-white text-[#5b666f] hover:text-[#1d6fd0]"}`}
        >
          {kopiert ? <Check className="h-[18px] w-[18px]" aria-hidden /> : <Copy className="h-[18px] w-[18px]" aria-hidden />}
        </button>
      </div>
      <p className="mt-1.5 text-[13.5px] leading-[1.45] text-[#8b959d]">{hinweis}</p>
    </div>
  );
}
