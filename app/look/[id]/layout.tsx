import type { ReactNode } from "react";

/**
 * DIE LOOK-SEITEN GEHÖREN NICHT MEHR IN DEN INDEX (Owner 11.08.2026, vor der Search Console:
 * „aufräumen").
 *
 * WAS GOOGLE MELDETE: 205 bekannte Adressen, davon 6 indexiert und 199 abgelehnt — Grund
 * „Gefunden, zurzeit nicht indexiert", also kein technischer Fehler, sondern ein Urteil über
 * den Wert. Von diesen 205 stammten rund 140 aus dieser Route: Look-Seiten aus der
 * Seeding-Pipeline des alten Trends-/Dupe-Konzepts. Sie tragen kaum eigenen Text und sehen
 * einander gleich; eine Domain, die zu neun Zehnteln daraus besteht, zieht ihre eigenen
 * Verkaufsseiten mit herunter.
 *
 * `index: false, follow: true` — NICHT aufnehmen, aber den Verweisen folgen: Was von hier auf
 * eine Themenseite zeigt, soll weiter zählen.
 *
 * DIE SEITEN BLEIBEN ERREICHBAR. Geteilte Links funktionieren unverändert; nur als
 * Index-Angebot fallen sie weg (siehe auch app/sitemap.ts, wo sie nicht mehr gemeldet werden).
 * Wer sie je als Inhalts-Strategie will, braucht zuerst echten Text je Seite — dann kommt
 * diese Datei weg, nicht vorher.
 *
 * EIGENES LAYOUT, weil die Seite selbst `"use client"` ist: Ein Client-Baustein kann kein
 * `metadata` ausliefern. Ohne `title` erbt sie weiter den Haustitel aus dem Wurzel-Layout.
 */
export const metadata = {
  robots: { index: false, follow: true },
};

export default function LookLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
