import Link from "next/link";
import { Plane } from "lucide-react";

// CTA box (same look as OwnInfluencerCTA) for a model's profile: book a travel program with
// her → the /urlaub-mit-bella landing. Shown under her card.
export default function BookJourneyCTA({ name = "Bella", href = "/urlaub-mit-bella" }: { name?: string; href?: string }) {
  return (
    <div className="mx-auto mt-4 w-full max-w-md rounded-2xl border border-amber-400/40 bg-gradient-to-b from-amber-400/[0.12] to-transparent p-5 text-center">
      <h2 className="text-[24px] font-black leading-tight text-white">Book a Journey<br /><span className="text-amber-400">with {name} 🌴</span></h2>
      <p className="mx-auto mt-2 max-w-sm text-[14px] font-semibold leading-relaxed text-white/65">
        She travels the world for you — and every day you get 3 fresh videos + 3 stories from her trip. Exclusively yours.
      </p>
      <Link href={href}
        className="lb-gold mx-auto mt-4 flex h-13 min-h-[52px] w-full max-w-sm items-center justify-center gap-2 rounded-full px-6 text-base font-black active:scale-95 transition">
        <Plane className="h-5 w-5" /> Book a Journey
      </Link>
      <p className="mt-3 text-[12px] font-bold text-white/40">$49/day · 3 videos + 3 stories daily · 🔒 secure checkout</p>
    </div>
  );
}
