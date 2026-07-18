"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2, Crown, MessageCircle, Video } from "lucide-react";

// Post-payment welcome — a dedicated full page (NOT the landing). The buyer isn't logged in yet,
// so this page confirms the subscription itself (confirm-paid → reserve the name + auto-send the
// onboarding/login email) using the email stashed by the apply form, and points them to their
// dashboard via the emailed login link.
export default function WelcomePage() {
  const [email, setEmail] = useState("");
  const [confirming, setConfirming] = useState(true);

  useEffect(() => {
    let mail = "";
    try { mail = (localStorage.getItem("lb_signup_email") || "").trim(); } catch { /**/ }
    setEmail(mail);
    // Conversion pixel (the buyer isn't logged in, so PremiumSync can't fire it here).
    try { import("@/lib/meta-pixel").then(m => m.trackMetaPixel("Subscribe", { value: 8, currency: "USD", content_category: "influencer_subscription" })).catch(() => {}); } catch { /**/ }
    if (!mail) { setConfirming(false); return; }

    let tries = 0;
    let alive = true;
    const tick = async () => {
      tries++;
      try {
        const r = await fetch("/api/curator", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "confirm-paid", email: mail }),
        }).then(x => x.json()).catch(() => null);
        if (r?.paid) { if (alive) { setConfirming(false); try { localStorage.removeItem("lb_signup_email"); } catch { /**/ } } return; }
      } catch { /**/ }
      if (alive) { if (tries < 8) setTimeout(tick, 2500); else setConfirming(false); }
    };
    tick();
    return () => { alive = false; };
  }, []);

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center lb-bg px-6 py-12 text-center text-white">
      <img src="/lb-logo.png" alt="LuxuryBandit" className="h-12 w-12 rounded-full object-contain" />
      <span className="mt-6 grid h-16 w-16 place-items-center rounded-full bg-amber-500 text-white shadow-[0_10px_40px_rgba(16,185,129,0.4)]">
        <Check className="h-8 w-8" />
      </span>
      <h1 className="mt-5 text-[30px] font-black leading-tight">You&apos;re in! 🎉</h1>
      <p className="mt-2 max-w-sm text-[15px] font-semibold leading-relaxed text-white/70">
        Your AI influencer is ready. We&apos;ve emailed{email ? <> <span className="font-black text-white">{email}</span></> : " you"} your login and setup — set your password and you&apos;ll land straight on your dashboard.
      </p>

      <div className="mt-6 w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/60">What happens next</p>
        <ul className="mt-2.5 space-y-2 text-[13px] font-bold text-white/75">
          <li className="flex items-center gap-2.5"><Crown className="h-4 w-4 shrink-0 text-amber-400" /> We create her luxury content — every day.</li>
          <li className="flex items-center gap-2.5"><MessageCircle className="h-4 w-4 shrink-0 text-amber-400" /> Chat with her — and her fans chat with her too.</li>
          <li className="flex items-center gap-2.5"><Video className="h-4 w-4 shrink-0 text-amber-400" /> Earn 30% in credits on every try-on with her.</li>
        </ul>
      </div>

      <Link href="/login"
        className="lb-gold mt-6 flex h-13 min-h-[52px] w-full max-w-sm items-center justify-center gap-2 rounded-full px-6 text-base font-black active:scale-95 transition">
        Open my dashboard →
      </Link>
      <p className="mt-3 flex items-center gap-1.5 text-[12px] font-bold text-white/60">
        {confirming ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Setting up your influencer &amp; sending your email…</> : "Check your inbox for the login link."}
      </p>
    </main>
  );
}
