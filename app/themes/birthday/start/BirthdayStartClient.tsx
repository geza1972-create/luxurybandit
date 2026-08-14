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
 * DER GEBURTSTAG HAT EINEN ECHTEN SCHRITT 2 (KONZEPT-TUNNEL.md, Owner 12.08.2026: „in
 * Geburtstag hätten wir die template auswahl in stept zwei"): Schritt 1 (Name + E-Mail) →
 * Schritt 2 (Vorlagen-/Look-Wahl, `GEBURTSTAG_LOOKS`) → Schritt 3 (Foto-Upload + Aufnahme
 * links, gewählter Look rechts, + Generieren). `schritte={[1, 2, 3]}`, `schrittBekannt={2}` —
 * ein bekannter Besucher braucht Schritt 1 nicht, den Look muss er trotzdem wählen.
 */
export default function BirthdayStartClient({ lang, code, beispielVideos, inhalt }: {
  lang: string;
  code: string;
  beispielVideos: string[];
  /* Der Landingpage-Inhalt, vom Server fertig gerendert durchgereicht — siehe
     `inhalt` an components/TunnelSeite.tsx (Owner 14.08.2026). */
  inhalt?: ReactNode;
}) {
  const searchParams = useSearchParams();
  const light = searchParams.get("light") === "1";

  /* AUS DER PRODUKT-KONFIG (Owner-Master-Auftrag 13.08.2026, §29): Schritte, Sprungziel
     und Kennung wohnen in lib/produkte.ts — EINE Stelle für alle sieben Tunnel. */
  const P = produkt("birthday");

  return (
    <TunnelSeite inhalt={inhalt} schritte={P.schritte} schrittBekannt={P.schrittBekannt} light={light} code={code} produkt={P.slug}>
      {({ schritt, onSchrittChange }) => (
        <KissFunnel variant={kissfunnelVariant(P)} lang={lang} code={code} beispielVideos={beispielVideos}
          tunnelSeite urlSchritt={schritt} onSchrittChange={onSchrittChange} />
      )}
    </TunnelSeite>
  );
}
