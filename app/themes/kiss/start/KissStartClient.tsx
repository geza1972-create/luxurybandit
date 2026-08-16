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
 * DER KUSS BEKOMMT SEINEN AUSWAHL-SCHRITT ZURUECK (Owner 12.08.2026, wörtlich: „warum ist der
 * Kuss funel anders? Warum ist das nicht aus 3 schritten? Template auswahl dann bilder
 * hochladen"). Bis heute lief er verkürzt: Schritt 1 (Name + E-Mail) → Schritt 3 (die zwei
 * Kacheln + Generieren) — mit der Begründung, die Szene sei seit dem 03.08.2026 ohnehin
 * zufällig (`zufallsSzene()`). Der Owner will sie trotzdem als bewusste Wahl in Schritt 2, wie
 * bei Geburtstag/Tanz: `schritte={[1, 2, 3]}`, `schrittBekannt={2}`. Wer nichts antippt,
 * bekommt weiterhin die Überraschung — siehe `kissSzeneId`/`kussSzeneVideoPrompt` in
 * `components/KissFunnel.tsx`.
 */
export default function KissStartClient({ lang, code, beispielVideos, inhalt }: {
  lang: string;
  code: string;
  beispielVideos: string[];
  /* Der Landingpage-Inhalt, vom Server fertig gerendert durchgereicht (Owner 14.08.2026,
     Dauerregel fuer den Tunnel) — `TunnelSeite` haengt ihn unter das Anmeldeformular. */
  inhalt?: ReactNode;
}) {
  const searchParams = useSearchParams();
  const light = searchParams.get("light") === "1";

  /* AUS DER PRODUKT-KONFIG (Owner-Master-Auftrag 13.08.2026, §29): Schritte, Sprungziel
     und Kennung wohnen in lib/produkte.ts — EINE Stelle für alle sieben Tunnel. */
  const P = produkt("kiss");

  return (
    <TunnelSeite schritte={P.schritte} schrittBekannt={P.schrittBekannt} light={light} code={code} produkt={P.slug}
      inhalt={inhalt}>
      {({ schritt, onSchrittChange, onVorlage }) => (
        <KissFunnel variant={kissfunnelVariant(P)} lang={lang} code={code} beispielVideos={beispielVideos}
          tunnelSeite urlSchritt={schritt} onSchrittChange={onSchrittChange} onVorlage={onVorlage} />
      )}
    </TunnelSeite>
  );
}
