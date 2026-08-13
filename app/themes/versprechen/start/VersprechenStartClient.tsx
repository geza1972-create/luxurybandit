"use client";

import { useSearchParams } from "next/navigation";
import KissFunnel from "@/components/KissFunnel";
import TunnelSeite from "@/components/TunnelSeite";
import { produkt, kissfunnelVariant } from "@/lib/produkte";

/**
 * NUR NOCH VERDRAHTUNG — DIE LOGIK WOHNT IN `components/TunnelSeite.tsx` (Owner 12.08.2026,
 * „oberstes Gesetz": „allle funnels und wenn eine änderung bitbs dann ist es bei allen
 * gleich. ich will da nicht mehr einzeln rum bauen.").
 *
 * DAS VERSPRECHEN BEKOMMT SEINEN AUSWAHL-SCHRITT (Owner 12.08.2026, Ergänzung: „und um das
 * ganze zu vereinheitlichen mach auch Verprehcne genauso. Aus 3 schritten"). Bis heute lief
 * es verkürzt: Schritt 1 (Name + E-Mail) → Schritt 3 (die zwei Kacheln + Generieren) — mit
 * der Begründung, es gebe nur EINEN Look (Villa & Sportwagen). Damit ALLE SIEBEN Tunnel
 * dieselben drei Schritte zeigen, bekommt auch das Versprechen Schritt 2 (die Look-Wahl aus
 * `VERSPRECHEN_LOOKS`, aktuell ein einzelner Eintrag): `schritte={[1, 2, 3]}`,
 * `schrittBekannt={2}`.
 */
export default function VersprechenStartClient({ lang, code, beispielVideos }: {
  lang: string;
  code: string;
  beispielVideos: string[];
}) {
  const searchParams = useSearchParams();
  const light = searchParams.get("light") === "1";

  /* AUS DER PRODUKT-KONFIG (Owner-Master-Auftrag 13.08.2026, §29): Schritte, Sprungziel
     und Kennung wohnen in lib/produkte.ts — EINE Stelle für alle sieben Tunnel. */
  const P = produkt("versprechen");

  return (
    <TunnelSeite schritte={P.schritte} schrittBekannt={P.schrittBekannt} light={light} code={code} produkt={P.slug}>
      {({ schritt, onSchrittChange }) => (
        <KissFunnel variant={kissfunnelVariant(P)} lang={lang} code={code} beispielVideos={beispielVideos}
          tunnelSeite urlSchritt={schritt} onSchrittChange={onSchrittChange} />
      )}
    </TunnelSeite>
  );
}
