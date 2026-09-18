"use client";

import { useState } from "react";
import type { PortalTexte } from "@/lib/lakatosbandi-texte";

/**
 * „FOLGEN" AUF DER KÜNSTLERSEITE (Owner 13.09.2026: „ein Follow-Button einbauen. Follow klappt
 * ein E-Mail-Feld auf und Kunden bekommen dann eine E-Mail, wenn ein Künstler ein neues Bild
 * postet").
 *
 * ── ERST DER KNOPF, DANN DAS FELD ───────────────────────────────────────────────────────────
 *
 * Ein Eingabefeld, das von Anfang an dasteht, fragt etwas, bevor jemand etwas will — und wirkt
 * auf einer Künstlerseite wie ein Newsletter-Kasten. Deshalb steht hier zuerst ein Knopf; das
 * Feld erscheint erst nach dem Klick, wenn der Besucher schon Ja gesagt hat.
 *
 * ── GESCHICKT HEISST NICHT EINGETRAGEN ──────────────────────────────────────────────────────
 *
 * Die Adresse wandert in eine Warteablage, und es geht eine Mail an sie. Erst der Klick darin
 * macht daraus einen Follower (lib/kuenstler-follower.ts). Anders könnte jeder fremde Adressen
 * eintragen — dieselbe Lücke wie beim Trichter, nur mit fremden Menschen statt fremden Bildern.
 * Genau das sagt die Rückmeldung auch: „Schau in deine Mails", nicht „Du folgst jetzt".
 */
export default function PortalFolgen({ mandant, T }: { mandant: string; T: PortalTexte }) {
  const [offen, setOffen] = useState(false);
  const [mail, setMail] = useState("");
  const [stand, setStand] = useState<"" | "sendet" | "fertig" | "fehler">("");

  const gueltig = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(mail.trim());

  const schicken = async () => {
    if (!gueltig || stand === "sendet") return;
    setStand("sendet");
    try {
      const res = await fetch("/api/portal-folgen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mandant, mail: mail.trim() }),
      });
      setStand(res.ok ? "fertig" : "fehler");
    } catch {
      setStand("fehler");
    }
  };

  if (stand === "fertig") {
    return <p className="m-0 w-full max-w-[420px] text-[15px] font-semibold leading-[1.5] text-[#1d6fd0]">{T.folgenMailGeschickt}</p>;
  }

  return (
    /* Steht in derselben Zeile wie Gespräch und Teilen (Owner 17.09.2026) — erst wenn er
       „Folgen" antippt, klappt das Feld darunter auf und braucht die ganze Breite. */
    <div className={offen ? "mt-3 w-full" : ""}>
      {!offen ? (
        <button type="button" onClick={() => setOffen(true)}
          className="inline-block rounded-full border border-[#111] px-4 py-2 text-[14px] font-semibold text-[#111] transition hover:bg-[#111] hover:text-white">
          {T.folgen}
        </button>
      ) : (
        <div className="max-w-[420px]">
          <p className="m-0 text-[14.5px] leading-[1.5] text-[#555]">{T.folgenText}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <input type="email" inputMode="email" autoComplete="email" value={mail} autoFocus
              onChange={e => { setMail(e.target.value); setStand(""); }}
              onKeyDown={e => { if (e.key === "Enter") void schicken(); }}
              placeholder={T.folgenPlatzhalter}
              className="min-w-0 flex-1 rounded-md border border-[#ccc] px-3 py-2.5 text-[16px] outline-none focus:border-[#111]" />
            <button type="button" onClick={() => void schicken()} disabled={!gueltig || stand === "sendet"}
              className="shrink-0 bg-[#111] px-5 py-2.5 text-[15px] font-semibold text-white transition hover:bg-[#333] disabled:opacity-40">
              {T.folgenSenden}
            </button>
          </div>
          {stand === "fehler" && <p className="m-0 mt-2 text-[14px] font-semibold text-[#b3261e]">{T.folgenFehler}</p>}
        </div>
      )}
    </div>
  );
}
