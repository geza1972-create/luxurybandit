"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import LightSwitch from "@/components/LightSwitch";

/**
 * DER HELL/DUNKEL-SCHALTER GEHOERT IN DIE KOPFZEILE, NICHT IN DEN SEITENINHALT.
 *
 * Owner 04.08.2026: „schau dir den header von Kiss an und wo die Icons liegen für Konto,
 * Farbe…" — auf der Kuss-Seite sitzt der Schalter LINKS in derselben Zeile wie Guthaben,
 * Galerie und Sprachwahl. Ich hatte ihn auf der Plan-Seite rechts in den Inhalt gesetzt;
 * damit steht auf zwei Seiten desselben Portals derselbe Knopf an zwei Orten, und der
 * Besucher muss ihn jedes Mal neu suchen.
 *
 * `KissFunnel` macht das seit dem 30.07.2026 per Portal in `[data-langrow]` (die Zeile in
 * `TopNav`, in der Guthaben-Chip und Sprache liegen). Weil das Ganze dort mitten im Trichter
 * steckt, war es fuer eine Seite ohne Trichter nicht benutzbar — deshalb hier als eigener,
 * winziger Baustein. Wer eine neue Themenseite baut, setzt ihn einmal und ist fertig.
 *
 * `order-[-1]` zieht ihn vor die Sprachwahl: Die steht im Quelltext zuerst, soll aber rechts
 * aussen bleiben, damit ihr Menue ins Bild klappt und nicht heraus.
 */
export default function LightSwitchImHeader() {
  const [zeile, setZeile] = useState<Element | null>(null);
  useEffect(() => { setZeile(document.querySelector("[data-langrow]")); }, []);
  if (!zeile) return null;
  return createPortal(<span className="order-[-1] mr-2"><LightSwitch /></span>, zeile);
}
