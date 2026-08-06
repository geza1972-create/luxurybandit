"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * ZURÜCK HEISST ZURÜCK (Owner 05.08.2026: „ein Klick auf Terms und dann auf Back führt schon
 * wieder auf die Seite Models. Ich kann nicht mehr es wiederholen. Was ist los hier?").
 *
 * Der Pfeil auf den Rechtsseiten war ein fester `<Link href="/stores">` — also gar kein
 * Zurück, sondern „gehe zum Models-Marktplatz". Wer aus einer Themenseite auf „Terms" tippt
 * und dann den Pfeil nimmt, landet bei den Influencern. Ein zweiter Versuch führt wieder
 * dorthin, weil der Weg ja derselbe ist: Es sieht aus wie eine Schleife, aus der man nicht
 * herauskommt.
 *
 * Das fiel bis heute kaum auf, weil diese Seiten nur im Menü hingen. Seit der Footer auf
 * neun Themenseiten steht, ist es der Normalweg — und damit ein Fehler, der Käufer aus dem
 * Kauf herausträgt.
 *
 * `router.back()` bringt ihn dorthin, wo er WAR. Nur wenn es keine Vorgeschichte gibt (Link
 * direkt geöffnet, neuer Tab), führt der Pfeil auf die Startseite — das Geschenke-Portal,
 * nicht der Marktplatz.
 */
export default function ZurueckPfeil({ label = "Back" }: { label?: string }) {
  const router = useRouter();
  return (
    <button type="button" aria-label={label}
      onClick={() => {
        /* `history.length > 1` ist die einzige Auskunft, die der Browser hergibt: ob es
           überhaupt einen Schritt zurück gibt. Sie ist grob, aber sie unterscheidet genau die
           zwei Fälle, um die es geht — mitten im Besuch oder frisch geöffnet. */
        if (typeof window !== "undefined" && window.history.length > 1) router.back();
        else router.push("/");
      }}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-black/10 text-black active:scale-90 transition-transform">
      <ArrowLeft className="h-4 w-4" />
    </button>
  );
}
