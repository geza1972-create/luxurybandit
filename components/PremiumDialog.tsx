"use client";

import { useState } from "react";
import { Crown, Check, X } from "lucide-react";

// Shared "Premium — members only" dialog. Replaces the native alert() wherever a
// locked model / "Your photo" / feature is tapped. "Choose your membership" reveals
// the plans (checkout not live yet → shows a coming-soon note).
export default function PremiumDialog({ open, onClose, title = "Premium — members only", subtitle = "Unlock every model, upload your own photo, and watch the full videos." }: {
  open: boolean; onClose: () => void; title?: string; subtitle?: string;
}) {
  const [plans, setPlans] = useState(false);
  if (!open) return null;
  const close = () => { setPlans(false); onClose(); };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm" onClick={close}>
      <div className="lb-phone-col relative w-full max-w-sm rounded-3xl border border-amber-400/20 bg-[#141210] p-6 text-center" onClick={e => e.stopPropagation()}>
        <button type="button" onClick={close} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white"><X className="h-4 w-4" /></button>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-black"><Crown className="h-7 w-7" /></span>
        <h3 className="mt-4 text-lg font-black text-white">{title}</h3>
        <p className="mt-1.5 text-[13px] font-semibold leading-6 text-white/55">{subtitle}</p>

        {!plans ? (
          <>
            <button type="button" onClick={() => setPlans(true)}
              className="lb-gold mt-5 flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-black active:scale-95 transition-transform">
              Choose your membership
            </button>
            <button type="button" onClick={close} className="mt-2 w-full py-2 text-[13px] font-black text-white/45">Maybe later</button>
          </>
        ) : (
          <div className="mt-5 grid gap-2 text-left">
            {[["Monthly", "Full access, cancel anytime"], ["Yearly", "Best value — 2 months free"]].map(([name, desc]) => (
              <div key={name} className="flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-3.5">
                <Check className="h-5 w-5 shrink-0 text-amber-400" />
                <div className="min-w-0"><p className="text-sm font-black text-white">{name}</p><p className="truncate text-[12px] font-semibold text-white/50">{desc}</p></div>
              </div>
            ))}
            <p className="mt-1 text-center text-[12px] font-bold text-amber-400/80">Memberships launch shortly — 💛</p>
            <button type="button" onClick={close} className="mt-1 w-full py-2 text-[13px] font-black text-white/45">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
