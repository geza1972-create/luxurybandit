"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/**
 * DER ZURUECK-PFEIL, DEN NUR DER BETREIBER SIEHT.
 *
 * Owner 31.07.2026, auf der Einladungsseite: „ähmm, wie komme ich zurück?"
 *
 * Die Einladungsseite hat mit Absicht keine Kopfleiste und kein Menue — wer diesen Link
 * bekommt, ist bei der Einladung eines Freundes und nicht auf einer Werbeseite. Genau das
 * macht sie fuer den Betreiber aber zur Sackgasse, wenn er seine eigenen Einladungen prueft.
 *
 * Loesung ohne Kompromiss fuer den Gast: Der Pfeil erscheint nur, wenn im Browser die
 * Admin-PIN liegt. Ein Gast hat sie nie, sieht also weiterhin eine nackte Einladung; wer sie
 * hat, ist ohnehin schon eingeloggt und gewinnt nichts, was er nicht haette.
 *
 * Bewusst ein LINK auf die Themenseite und kein `history.back()`: Wer die Einladung ueber
 * einen frisch geoeffneten Tab prueft, hat keine Vorgeschichte, auf die er zurueck koennte.
 */
export default function AdminZurueck({ ziel = "/themes/wedding" }: { ziel?: string }) {
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    try { setAdmin(!!localStorage.getItem("luxurybandit-try-look-admin-pin")); } catch { /* egal */ }
  }, []);

  if (!admin) return null;

  return (
    <Link href={ziel} aria-label="Zurück"
      className="flex h-9 items-center gap-1 rounded-full border border-black/15 bg-white px-3 text-[12px] font-black text-black shadow-sm transition active:scale-95">
      <ChevronLeft className="h-4 w-4" /> Zurück
    </Link>
  );
}
