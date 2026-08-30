import { DAVID_TUNNEL } from "@/lib/david-tunnel-texte";
import { DAVID_VIDEO_CENTS, eur } from "@/lib/pricing";
import PruefstandClient from "./PruefstandClient";

/**
 * DER PRÜFSTAND FÜR DIE VIDEO-BEWERBUNG — NUR LOKAL (Owner 30.08.2026).
 *
 * Die Seite trägt eine Kasse und eine Erzeugung; sie gehört nicht ins Schaufenster. In der
 * Produktion rendert sie deshalb nichts, und weil der Wächter HIER steht (Server), landet
 * die ganze Fläche dort gar nicht erst im Bild.
 *
 * Die Texte kommen von hier: `lib/david-tunnel-texte` zieht die Übersetzung und damit
 * `sharp` herein — beides Server-Code. Deutsch reicht, der Prüfstand prüft keine Sprachen.
 */
export default function AufnahmePruefstand() {
  if (process.env.NODE_ENV === "production") return <main className="min-h-screen bg-black" />;
  return <PruefstandClient S={DAVID_TUNNEL} preisVideo={eur(DAVID_VIDEO_CENTS, "de")} />;
}
