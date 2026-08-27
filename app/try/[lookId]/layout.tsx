import type { ReactNode } from "react";

/**
 * NOCH NICHT INDEXIERT (Owner 28.08.2026: „nur Vorarbeit, noch nicht indexieren").
 *
 * Der Server-Text in `page.tsx` ist erst die Vorarbeit — dieselbe Reihenfolge wie bei den
 * Look-Seiten (app/look/[id]/layout.tsx, seit 11.08.2026 noindex): Google hatte dort 199
 * von 205 dünnen, einander ähnlichen Seiten als „gefunden, zurzeit nicht indexiert"
 * abgelehnt und das hat der ganzen Domain geschadet. Diese Seite hätte dasselbe Muster —
 * eine sehr ähnliche Seite je Kleidungsstück. Solange sie nicht in der Sitemap steht (siehe
 * app/sitemap.ts) UND dieses `noindex` hier steht, kann sich der Fehler nicht wiederholen.
 *
 * WEG ZURÜCK: Erst wenn der Owner das ausdrücklich freigibt — nicht vorher, und dann beide
 * Stellen zusammen (dieses Layout UND die Sitemap-Zeile), sonst meldet man wieder an, was
 * man gerade abmeldet.
 *
 * EIGENES LAYOUT, weil `page.tsx` selbst Server-Metadaten setzt und `TryFunnelClient`
 * `"use client"` ist — ein Client-Baustein kann kein `metadata` ausliefern.
 */
export const metadata = {
  robots: { index: false, follow: true },
};

export default function TryLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
