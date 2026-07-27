"use client";

import { useState } from "react";
import TopNav from "@/components/TopNav";

// Öffentliche Abmelde-Seite — für alle, die den persönlichen Abmeldelink aus der E-Mail
// nicht mehr haben. Verlinkt aus /ai-notice und den AGB.
// Der Server antwortet bewusst IMMER mit „ok" (auch bei unbekannter Adresse), damit sich
// hier nicht abfragen lässt, wer Abonnent ist.
export default function UnsubscribePage() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) { setError("Please enter a valid email address."); return; }
    if (phone.replace(/[^\d]/g, "").length < 6) { setError("Please enter the phone number you signed up with."); return; }
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/wetter-unsubscribe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, phone: phone.trim() }),
      });
      if (!r.ok) { setError("Something went wrong. Please try again."); return; }
      setDone(true);
    } catch { setError("Network error. Please try again."); }
    finally { setBusy(false); }
  };

  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav subtitle="Unsubscribe" />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-10">
        {done ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center">
            <p className="text-[42px] leading-none">✓</p>
            <h1 className="mt-3 text-[22px] font-black">You&apos;re unsubscribed</h1>
            <p className="mt-2 text-[14px] font-medium leading-snug text-white/70">
              If that address was on our list, it won&apos;t receive any more daily messages.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-[28px] font-black leading-tight">Unsubscribe</h1>
            <p className="mt-2 text-[14px] font-medium leading-snug text-white/70">
              Enter the email address <strong className="text-white">and</strong> the phone number you
              signed up with, and we&apos;ll stop the daily message. We ask for both so that nobody can
              unsubscribe someone else.
            </p>
            <form onSubmit={submit} className="mt-5 grid gap-3" noValidate>
              <input
                value={email} onChange={e => { setEmail(e.target.value); setError(""); }}
                type="email" inputMode="email" autoComplete="email" placeholder="Your email address"
                className="h-12 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 text-[15px] font-semibold text-white outline-none placeholder:text-white/35 focus:border-[#c9a23f]"
              />
              <input
                value={phone} onChange={e => { setPhone(e.target.value); setError(""); }}
                type="tel" inputMode="tel" autoComplete="tel" placeholder="Your phone number"
                className="h-12 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 text-[15px] font-semibold text-white outline-none placeholder:text-white/35 focus:border-[#c9a23f]"
              />
              <button type="submit" disabled={busy}
                className="lb-gold flex h-12 w-full items-center justify-center rounded-full text-[15px] font-black active:scale-95 transition disabled:opacity-60">
                {busy ? "…" : "Unsubscribe"}
              </button>
            </form>
            {error && <p className="mt-2 text-[13px] font-bold text-red-300">{error}</p>}
            <p className="mt-4 text-[12px] font-semibold leading-relaxed text-white/45">
              Every daily email also has a one-click unsubscribe link at the bottom.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
