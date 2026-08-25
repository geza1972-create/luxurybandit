"use client";

import { useState } from "react";
import { Knopf, EingabeMehrzeilig } from "@/components/CI";

/**
 * DER DIREKTE EINSTIEG AUF DER LANDINGPAGE (Owner 25.08.2026, diktiert: „Das sollte der
 * User direkt einsteigen … direkt drunter kommt ein Inputfeld mit dem Text drin …
 * Drunter Button Gratis weitermachen. Grosse Karte fliegt raus").
 *
 * Das Feld trägt den Verkaufs-Satz als Platzhalter (der bisherige Lead — er ist jetzt
 * die Handlung selbst statt einer Beschreibung). Der Knopf reicht die eingefügte
 * Anzeige über `sessionStorage` an den Tunnel weiter, der damit seinen Anzeige-Schritt
 * überspringt und direkt bei „Deine Daten" weitermacht. Ohne eingefügte Anzeige geht es
 * trotzdem weiter — der Tunnel fragt dann selbst (sein eigener Schritt 1 mit dem
 * „ohne Anzeige"-Ausweg bleibt der Auffangweg).
 */
export const LEBENSLAUF_ANZEIGE_ABLAGE = "lb_lebenslauf_anzeige";

export default function LebenslaufAnzeigeEinstieg({ platzhalter, cta }: {
  platzhalter: string;
  cta: string;
}) {
  const [anzeige, setAnzeige] = useState("");
  return (
    <div className="mt-3 flex flex-col gap-3">
      <EingabeMehrzeilig zeilen={4} value={anzeige} placeholder={platzhalter}
        onChange={e => setAnzeige(e.target.value)} />
      <Knopf art="gold" onClick={() => {
        try { if (anzeige.trim()) sessionStorage.setItem(LEBENSLAUF_ANZEIGE_ABLAGE, anzeige.trim()); } catch { /**/ }
        window.location.href = "/themes/lebenslauf/start";
      }}>
        {cta}
      </Knopf>
    </div>
  );
}
