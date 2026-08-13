"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ModelCard from "@/components/ModelCard";
import LandingHeader from "@/components/LandingHeader";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";

// The customer's personal dashboard: their Bella card with the videos made FOR them in the Card
// Studio. Requires login (Supabase session); the email in the token scopes the slides.
export default function MyJourneyPage() {
  const [state, setState] = useState<"loading" | "guest" | "ready" | "empty">("loading");
  const [card, setCard] = useState<any>(null);

  useEffect(() => {
    const s = getStoredAuthSession();
    if (!s?.access_token) { setState("guest"); return; }
    fetch("/api/my-journey", { headers: { Authorization: `Bearer ${s.access_token}` } })
      .then(r => r.json())
      .then(d => { if (d?.card) { setCard(d.card); setState("ready"); } else setState("empty"); })
      .catch(() => setState("empty"));
  }, []);

  return (
    <main className="min-h-screen bg-[#0d0b0a] text-white">
      <LandingHeader />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-8">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f6cf51]">Your Journey</p>
        <h1 className="mt-2 text-[30px] font-black leading-[1.05]">Your feed with <span className="text-[#f6cf51]">Bella</span> 🌴</h1>

        {state === "loading" && <p className="mt-8 text-center text-white/80">Loading…</p>}

        {state === "guest" && (
          <div className="mt-8 rounded-2xl border border-[#f6cf51]/40 lb-goldhauch p-6 text-center">
            <p className="text-[15px] font-bold text-white">Please log in to see your feed.</p>
            <Link href="/login" className="mt-4 inline-flex rounded-xl bg-[#f6cf51] px-6 py-3 text-[15px] font-black text-black active:scale-95 transition">Log in →</Link>
          </div>
        )}

        {state === "empty" && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
            <p className="text-[15px] font-bold text-white">No content yet.</p>
            <p className="mt-1 text-[13px] text-white/75">Your videos are being prepared — we'll let you know as soon as your feed is live.</p>
          </div>
        )}

        {state === "ready" && card && (
          <div className="-mx-4 mt-6">
            <ModelCard {...card} isMember canDownload />
          </div>
        )}
      </div>
    </main>
  );
}
