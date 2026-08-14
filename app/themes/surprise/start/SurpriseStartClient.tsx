"use client";

import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import KissFunnel from "@/components/KissFunnel";
import TunnelSeite from "@/components/TunnelSeite";
import { produkt, kissfunnelVariant } from "@/lib/produkte";

/**
 * NUR NOCH VERDRAHTUNG — DIE LOGIK WOHNT IN `components/TunnelSeite.tsx` (Owner 12.08.2026,
 * „oberstes Gesetz": „allle funnels und wenn eine änderung bitbs dann ist es bei allen
 * gleich. ich will da nicht mehr einzeln rum bauen.").
 *
 * DER TANZ BEKOMMT EINEN ECHTEN SCHRITT 2 — DIE SET-WAHL (Owner 12.08.2026: „pool dancing
 * kannst du hier einbauen und da machst du auch dort den tunel einbauen"), genau wie der
 * Geburtstag seine Vorlagen-Wahl: Schritt 1 (Name + E-Mail) → Schritt 2 (`POLEDANCE_SETS`,
 * `KissFunnel.tsx` schaltet dafuer `hatAuswahl` bei `variant === "poledance"` frei) →
 * Schritt 3 (ihr Foto links, das gewaehlte Set rechts, + Generieren). `schritte={[1, 2, 3]}`,
 * `schrittBekannt={2}` — Bekannte ueberspringen nur die Adressfrage, die Set-Wahl bleibt eine
 * bewusste Wahl.
 */
export default function SurpriseStartClient({ lang, code, beispielVideos, inhalt }: {
  lang: string;
  code: string;
  beispielVideos: string[];
  /* Landingpage-Inhalt, vom Server durchgereicht — TunnelSeite haengt ihn unter das
     Anmeldeformular (Owner 14.08.2026). */
  inhalt?: ReactNode;
}) {
  const searchParams = useSearchParams();
  const light = searchParams.get("light") === "1";

  /* AUS DER PRODUKT-KONFIG (Owner-Master-Auftrag 13.08.2026, §29): Schritte, Sprungziel
     und Kennung wohnen in lib/produkte.ts — EINE Stelle für alle sieben Tunnel. */
  const P = produkt("poledance");

  return (
    <TunnelSeite inhalt={inhalt} schritte={P.schritte} schrittBekannt={P.schrittBekannt} light={light} code={code} produkt={P.slug}>
      {({ schritt, onSchrittChange }) => (
        <KissFunnel variant={kissfunnelVariant(P)} lang={lang} code={code} beispielVideos={beispielVideos}
          tunnelSeite urlSchritt={schritt} onSchrittChange={onSchrittChange} />
      )}
    </TunnelSeite>
  );
}
