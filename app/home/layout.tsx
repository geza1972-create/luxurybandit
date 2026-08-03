import type { Metadata } from "next";

/**
 * /home ist die GALERIE, nicht die Startseite — auch wenn der Name das nahelegt.
 *
 * Die Seite ist ein Re-Export von /stores und zeigt dort das Kachel-Raster. Ohne eigene
 * Kopfdaten trug sie denselben Standardtitel wie die echte Startseite und war damit der
 * naechste Kandidat, den eine Suchmaschine faelschlich als Eingang nimmt — genau der Fehler,
 * den der Owner am 03.08.2026 in Bing gesehen hat.
 *
 * `canonical: "/stores"` sagt: Es ist dieselbe Seite wie die Galerie, zaehlt sie dort.
 */
export const metadata: Metadata = {
  title: "Looks & feeds | LuxuryBandit",
  description: "The LuxuryBandit gallery: every look and every video the models have made, newest first.",
  alternates: { canonical: "/stores" },
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
