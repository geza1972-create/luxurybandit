import type { Metadata } from "next";

/**
 * DIE MODEL-GALERIE BRAUCHT EINEN EIGENEN TITEL (Owner 03.08.2026: „wenn ich auf meine
 * Adresse klicke, komme ich auf die model seite").
 *
 * /stores ist eine Client-Seite („use client"), und die kann keine `metadata` ausliefern.
 * Also trug sie den Standardtitel des Wurzel-Layouts — denselben, den die Startseite hatte.
 * Fuer Bing sahen beide Seiten gleich aus, und weil „/" damals nur weiterleitete, nahm Bing
 * die Galerie als Marken-Treffer: Ein Klick auf luxurybandit.com landete bei den Models.
 *
 * Ein Layout ist der einzige Weg, einer Client-Seite Kopfdaten mitzugeben — es laeuft auf dem
 * Server und reicht die Seite unveraendert durch. Der Titel sagt jetzt, was diese Seite ist:
 * die Besetzung, nicht der Eingang.
 */
export const metadata: Metadata = {
  title: "The models — meet the cast | LuxuryBandit",
  description: "Every LuxuryBandit model in one place: see her looks, chat with her, and pick who plays the part in your own video.",
  alternates: { canonical: "/stores" },
};

export default function StoresLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
