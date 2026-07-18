"use client";

import { useEffect, useState } from "react";
import BellaCarouselAdmin from "@/components/BellaCarouselAdmin";
import LandingHeader from "@/components/LandingHeader";

// Standalone admin home for the Card Studio — independent of any landing page. PIN-gated: the
// tool itself only renders when the admin PIN is present in localStorage.
export default function CardStudioPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  useEffect(() => {
    try { setIsAdmin(!!localStorage.getItem("luxurybandit-try-look-admin-pin")); } catch { setIsAdmin(false); }
  }, []);

  return (
    <main className="min-h-screen bg-[#0d0b0a] text-white">
      <LandingHeader />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-6">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-400">Admin</p>
        <h1 className="mt-1 text-[26px] font-black leading-tight">🎴 Card Studio</h1>
        <p className="mt-1 text-[13px] font-medium text-white/85">Medien generieren/hochladen, Texte, Sichtbarkeit &amp; Seiten — für die General Card und pro Kunde.</p>

        {isAdmin === false && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
            <p className="text-[15px] font-bold text-white">Nur für Admins.</p>
            <p className="mt-1 text-[13px] text-white/75">Ohne Admin-PIN im Browser ist das Studio nicht sichtbar.</p>
          </div>
        )}

        {/* Renders only when the admin PIN is set (self-gated). */}
        <BellaCarouselAdmin />
      </div>
    </main>
  );
}
