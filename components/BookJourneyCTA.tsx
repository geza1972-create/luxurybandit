import Link from "next/link";
import { Plane } from "lucide-react";

// Just the CTA button — all the package details (price, what's included, booking form)
// live on the journey's own landing page (e.g. /urlaub-mit-bella), not duplicated here.
export default function BookJourneyCTA({ name = "Bella", href = "/urlaub-mit-bella" }: { name?: string; href?: string }) {
  return (
    <Link href={href}
      className="lb-gold mx-auto mt-4 flex h-13 min-h-[52px] w-full max-w-md items-center justify-center gap-2 rounded-full px-6 text-base font-black active:scale-95 transition">
      <Plane className="h-5 w-5" /> Book a Journey with {name}
    </Link>
  );
}
