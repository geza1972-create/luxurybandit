"use client";

import { useState } from "react";
import TopNav from "@/components/TopNav";

// Öffentliche Abmelde-Seite — für alle, die den persönlichen Abmeldelink aus der E-Mail
// nicht mehr haben. Verlinkt aus /ai-notice und den AGB.
// Der Server antwortet bewusst IMMER mit „ok" (auch bei unbekannter Adresse), damit sich
// hier nicht abfragen lässt, wer Abonnent ist.
// Was wir ihm STATT der Tagespost anbieten. Er bleibt Kunde — nur der Kanal ändert sich.
const OFFERS: { id: string; label: string; hint: string }[] = [
  { id: "clothes", label: "New clothes only", hint: "A short note when we add new outfits and lingerie you can try on." },
  { id: "topics", label: "New topics only", hint: "One message when a new topic goes live — nothing in between." },
  { id: "deals", label: "Offers only", hint: "Only when there is something cheaper than usual." },
];

export default function UnsubscribePage() {
  const [picked, setPicked] = useState<string[]>([]);
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
        body: JSON.stringify({ email: value, phone: phone.trim(), interests: picked }),
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
            <p className="mt-2 text-[14px] font-medium leading-snug text-white/85">
              If that address was on our list, it won&apos;t receive any more daily messages.
              {picked.length > 0 ? " We noted what you do want to hear about." : ""}
            </p>
            <p className="mt-3 text-[13px] font-bold leading-snug text-white/75">
              You are still a customer — your videos and your account stay exactly as they are.
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
            {/* Bevor er ganz geht: weniger Post statt keine Post. Er bleibt Kunde. */}
            <div className="mt-5 rounded-2xl border border-white/20 bg-white/[0.06] p-4">
              <p className="text-[15px] font-black text-white">Too much every day? Pick less instead.</p>
              <p className="mt-1 text-[13px] font-bold leading-snug text-white/75">
                Tick what still interests you — we stop the daily message and only write for these.
              </p>
              <div className="mt-3 grid gap-2">
                {OFFERS.map(o => {
                  const on = picked.includes(o.id);
                  return (
                    <button key={o.id} type="button"
                      onClick={() => setPicked(p => on ? p.filter(x => x !== o.id) : [...p, o.id])}
                      className={`rounded-xl border p-3 text-left transition ${on ? "border-[#f6cf51] bg-[#f6cf51]/10" : "border-white/25 bg-white/[0.04]"}`}>
                      <span className={`block text-[14px] font-black ${on ? "text-[#f6cf51]" : "text-white"}`}>{o.label}</span>
                      <span className="mt-0.5 block text-[12px] font-bold leading-snug text-white/70">{o.hint}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={submit} className="mt-5 grid gap-3" noValidate>
              <input
                value={email} onChange={e => { setEmail(e.target.value); setError(""); }}
                type="email" inputMode="email" autoComplete="email" placeholder="Your email address"
                className="h-12 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 text-[15px] font-semibold text-white outline-none placeholder:text-white/35 focus:border-[#f6cf51]"
              />
              <input
                value={phone} onChange={e => { setPhone(e.target.value); setError(""); }}
                type="tel" inputMode="tel" autoComplete="tel" placeholder="Your phone number"
                className="h-12 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 text-[15px] font-semibold text-white outline-none placeholder:text-white/35 focus:border-[#f6cf51]"
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
