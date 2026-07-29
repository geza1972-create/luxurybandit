import Link from "next/link";
import { Plane } from "lucide-react";

// Just the CTA button — alles Weitere (Ablauf, Preis, Trichter) steht auf der Zielseite.
// Ziel seit 29.07.2026: `/themes/bella` statt der alten `/urlaub-mit-bella`, die noch ein
// abgeschaltetes Angebot über 49 $ pro Tag bewirbt.
export default function BookJourneyCTA({ name = "Bella", href = "/themes/bella" }: { name?: string; href?: string }) {
  return (
    <Link href={href}
      className="lb-gold mx-auto mt-4 flex h-13 min-h-[52px] w-full max-w-md items-center justify-center gap-2 rounded-full px-6 text-base font-black active:scale-95 transition">
      <Plane className="h-5 w-5" /> Book a Journey with {name}
    </Link>
  );
}
