import type { Metadata } from "next";
import AgentChat from "@/components/AgentChat";

/**
 * DER AGENT ZUM ANSEHEN (Owner 09.09.2026: „zeig mir in einem anderen Branch, wie so was
 * aussehen könnte" · „also parallel bauen").
 *
 * EIGENE ADRESSE, EIGENER ZWEIG, NICHTS ANGEFASST: `/engine` läuft weiter wie auf `main`.
 * Hier daneben steht dasselbe Gespräch mit Werkzeugen — man kann beides hintereinander
 * öffnen und den Unterschied sehen, statt ihn erklärt zu bekommen.
 *
 * NICHT INDEXIEREN: Es ist ein Muster, kein Produkt.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "VersusForge — Agent",
  robots: { index: false, follow: false },
};

export default function AgentSeite() {
  return <AgentChat />;
}
