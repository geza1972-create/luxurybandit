"use client";

import { useState } from "react";
import type { PortalTexte } from "@/lib/lakatosbandi-texte";

/**
 * SEINE SEITE LÖSCHEN — AUF LAKATOSBANDI.COM (Owner 11.09.2026: „du musst schauen, wo die Seite angelegt wird. Nicht auf
 * VersusForge"). Vorher führte der Löschlink eines Künstlers auf die Anzeigenseite für Firmen auf versusforge.com.
 *
 * Zwei Tipps, rot, kein Browser-Fenster (Hausregel `loeschen-zwei-tipps-rot`). Gelöscht wird über denselben Weg wie
 * vorher (`api/versusforge-loeschen`, mit seinem Löschschlüssel aus der Mail) — Eintrag, Anfragen, Bilder, Schritte.
 */
export default function PortalLoeschen({ mandant, k, T, start }: { mandant: string; k: string; T: PortalTexte; start: string }) {
  const [sicher, setSicher] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const [weg, setWeg] = useState(false);
  const [fehler, setFehler] = useState("");

  const loeschen = async () => {
    setLaeuft(true);
    setFehler("");
    try {
      const res = await fetch("/api/versusforge-loeschen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mandant, k }),
      });
      if (!res.ok) { setFehler(res.status === 403 ? T.loeschenOhneLink : T.loeschenFehler); return; }
      setWeg(true);
    } catch {
      setFehler(T.loeschenFehler);
    } finally {
      setLaeuft(false);
    }
  };

  if (weg) {
    return (
      <div>
        <h1 className="m-0 font-serif text-[32px] font-normal leading-[1.15]">{T.loeschenFertig}</h1>
        <p className="mt-3 text-[16.5px] leading-[1.6] text-[#333]">{T.loeschenFertigText}</p>
        <a href={start} className="mt-6 inline-block text-[15px] text-[#111] underline">{T.zurStart}</a>
      </div>
    );
  }

  return (
    <div>
      <h1 className="m-0 font-serif text-[32px] font-normal leading-[1.15]">{T.loeschenTitel}</h1>
      <p className="mt-3 text-[16.5px] leading-[1.6] text-[#333]">{T.loeschenText}</p>
      <button
        type="button"
        disabled={laeuft}
        onClick={() => { if (!sicher) { setSicher(true); return; } void loeschen(); }}
        className={`mt-6 border-[1.5px] px-6 py-3.5 text-[15.5px] font-semibold transition disabled:opacity-50 ${
          sicher ? "border-[#b3261e] bg-[#b3261e] text-white" : "border-[#b3261e]/60 bg-white text-[#b3261e]"}`}
      >
        {laeuft ? T.loeschenLaeuft : sicher ? T.loeschenSicher : T.loeschenKnopf}
      </button>
      {fehler && <p className="mt-3 text-[14.5px] font-semibold text-[#b3261e]">{fehler}</p>}
    </div>
  );
}
