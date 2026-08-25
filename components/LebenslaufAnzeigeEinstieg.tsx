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
    /* IN DER WEISSEN HUELLE (Owner 25.08.2026, mit Bild des dunklen Felds: "das brauche
       ich auch in einer weissen Huelle") — dieselbe Creme-Karte wie die Mappe; das Feld
       innen laeuft in der Karten-Fassung (karte-Schalter der CI-Bibliothek). */
    <div className="lb-karte mt-3 flex flex-col gap-3 rounded-[20px] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.38)]">
      <EingabeMehrzeilig karte zeilen={4} value={anzeige} placeholder={platzhalter}
        onChange={e => setAnzeige(e.target.value)} />
      <Knopf art="gold" onClick={() => {
        try { if (anzeige.trim()) sessionStorage.setItem(LEBENSLAUF_ANZEIGE_ABLAGE, anzeige.trim()); } catch { /**/ }
        /* TUER A DER NEUEN ARCHITEKTUR (Owner 25.08.2026, "Ein Gespraech, zwei Tueren"):
           das Feld fuehrt auf den Spielplatz — der Bewerberberater uebernimmt die Anzeige
           von dort aus demselben sessionStorage-Schluessel. */
        window.location.href = "/lebenslauf/executive";
      }}>
        {cta}
      </Knopf>
    </div>
  );
}
