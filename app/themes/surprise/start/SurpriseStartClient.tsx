"use client";

import { useSearchParams } from "next/navigation";
import KissFunnel from "@/components/KissFunnel";
import TunnelSeite from "@/components/TunnelSeite";

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
export default function SurpriseStartClient({ lang, code, beispielVideos }: {
  lang: string;
  code: string;
  beispielVideos: string[];
}) {
  const searchParams = useSearchParams();
  const light = searchParams.get("light") === "1";

  return (
    <TunnelSeite schritte={[1, 2, 3]} schrittBekannt={2} light={light} code={code}>
      {({ schritt, onSchrittChange }) => (
        <KissFunnel variant="poledance" lang={lang} code={code} beispielVideos={beispielVideos}
          tunnelSeite urlSchritt={schritt} onSchrittChange={onSchrittChange} />
      )}
    </TunnelSeite>
  );
}
