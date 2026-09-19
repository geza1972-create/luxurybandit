"use client";

import { useEffect, useState } from "react";
import { POSTER_BILD_EREIGNIS, type PosterBildArt, type PosterBildNachricht } from "@/components/PosterDeinBild";

/**
 * DER SATZ UNTER DER KACHEL SAGT DIE WAHRHEIT ÜBER DIESEN KAUF (Owner 18.09.2026: „wenn das Bild
 * nicht generiert ist, dann darf man keine Lizenz verlangen" · „1 Euro bekommt der Künstler").
 *
 * Hier stand eine feste Zeile: „Im Preis steckt eine Lizenz von 10 €, die direkt an den Künstler
 * geht." Über dem eigenen Urlaubsfoto eines Kunden ist das falsch — es ist keine Lizenz, und es
 * sind nicht zehn Euro. Eine Zahl, die neben dem Kaufknopf nicht stimmt, ist schlimmer als keine.
 *
 * Also hört diese Zeile mit, was gerade im Blatt steht (`POSTER_BILD_EREIGNIS`), und wechselt den
 * Satz. Beides kommt fertig aus den Sprachtabellen — hier wird nichts getippt und nichts
 * gerechnet (Memory `prices-only-from-pricing-table`).
 */
export default function PosterLizenzSatz({ mandant, werk, werkSatz, eigenesSatz }: {
  mandant: string;
  werk: string;
  /** Der Satz mit der Lizenz — Werk des Künstlers oder in seinem Stil erzeugt. */
  werkSatz: string;
  /** Der Satz mit der Vermittlung — nur sein eigenes Foto im Blatt. */
  eigenesSatz: string;
}) {
  const [art, setArt] = useState<PosterBildArt>("keins");
  useEffect(() => {
    const hoeren = (e: Event) => {
      const d = (e as CustomEvent<PosterBildNachricht>).detail;
      if (d?.mandant === mandant && d?.werk === werk) setArt(d.art);
    };
    window.addEventListener(POSTER_BILD_EREIGNIS, hoeren);
    return () => window.removeEventListener(POSTER_BILD_EREIGNIS, hoeren);
  }, [mandant, werk]);

  return (
    <p className="m-0 mx-auto max-w-[42ch] text-[14px] leading-[1.5] text-[#666]">
      {art === "foto" ? eigenesSatz : werkSatz}
    </p>
  );
}
