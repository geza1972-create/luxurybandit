"use client";

import { useState } from "react";
import { Loader2, ChevronRight, Check } from "lucide-react";

/**
 * ANMELDUNG AUF UNSERER SEITE statt im Meta-Lead-Formular (Owner 27.07.2026).
 *
 * Warum die Optik: Wer aus der Anzeige kommt, kennt genau diesen Ablauf — weiße Karte, eine
 * Frage pro Schritt, blauer „Continue"-Knopf. Die vertraute Form kostet keine Überwindung.
 * Der Unterschied zum Lead-Formular: Am Ende steht die KASSE, keine Liste. Wer nicht zahlt,
 * ist in derselben Minute raus, statt uns Geld zu kosten.
 *
 * ABGRENZUNG (wichtig): Das ist unser Formular, nicht Facebook. Oben steht unser Logo und
 * unser Name, es gibt kein Meta-Branding und keine Behauptung, dies sei ein Facebook-Dienst.
 * Nachgebaut ist die Bedienlogik, nicht die Marke.
 */

type Step = "intro" | "join" | "contact" | "sending";

export default function JoinForm({ code = "", topic = "chat", presetEmail = "", presetName = "" }: {
  code?: string; topic?: string; presetEmail?: string; presetName?: string;
}) {
  const [step, setStep] = useState<Step>("intro");
  const [wantsIn, setWantsIn] = useState<"yes" | "later" | "">("");
  // Vorausgefuellt, wenn der Link die Daten mitbringt (Mail an Leads) — spart die
  // zweite Eingabe derselben Adresse.
  const [name, setName] = useState(presetName);
  const [email, setEmail] = useState(presetEmail);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const endpoint =
    topic === "holiday" ? "/api/holiday-abo-checkout"
    : topic === "wetter" ? "/api/wetter-abo-checkout"
    : "/api/chat-abo-checkout";

  const submit = async () => {
    if (!emailOk || !consent || busy) return;
    setBusy(true); setError(""); setStep("sending");
    // Kontakt ZUERST sichern: wer im Stripe-Fenster abspringt, ist dann trotzdem erreichbar.
    try {
      await fetch("/api/join-lead", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), code, topic }),
      });
    } catch { /* der Kauf ist wichtiger als das Protokoll */ }

    try {
      const d = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, email: email.trim(), returnTo: `/offer?code=${encodeURIComponent(code)}` }),
      }).then(r => r.json());
      if (!d?.url) { setError(d?.error || "Could not open the checkout. Please try again."); setStep("contact"); setBusy(false); return; }
      window.location.href = d.url;
    } catch {
      setError("Network error. Please try again.");
      setStep("contact"); setBusy(false);
    }
  };

  const card = "mx-auto w-full max-w-[420px] overflow-hidden rounded-2xl bg-white text-black shadow-[0_2px_16px_rgba(0,0,0,0.12)]";
  const blue = "flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#1877F2] text-[15px] font-bold text-white active:scale-[0.99] transition disabled:opacity-50";
  const field = "mt-1.5 h-12 w-full rounded-lg border border-black/20 bg-white px-3.5 text-[15px] font-medium text-black outline-none placeholder:text-black/40 focus:border-[#1877F2]";

  return (
    <div className="mx-auto w-full max-w-[420px] px-4 py-6">
      <div className={card}>
        {/* Kopf: unser Logo + Name — hier steht, von wem das Formular ist. */}
        <div className="flex flex-col items-center gap-2 px-6 pt-7">
          <span className="grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lb-logo.png" alt="LuxuryBandit" className="h-14 w-14 object-contain" />
          </span>
          <p className="text-[13px] font-medium text-black/60">LuxuryBandit</p>
        </div>

        {step === "intro" && (
          <div className="px-6 pb-6 pt-3 text-center">
            <h1 className="text-[22px] font-bold leading-snug">Talk to Bella. A new look, one message. Every day.</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-black/70">
              Your weather where you are, a brand-new look, and you can chat with her any time —
              chatting is free.
            </p>
            <button type="button" onClick={() => setStep("join")} className={`${blue} mt-6`}>
              Continue <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {step === "join" && (
          <div className="px-6 pb-6 pt-3">
            <p className="text-[15px] font-bold leading-snug">
              Early adopter price: <span className="text-[#1877F2]">19 € for your first month</span>,
              then 49 € a month. 25 videos a month across all topics, chatting free. Would you join?
            </p>
            <div className="mt-4 grid gap-2">
              {([["yes", "Yes, let's go"], ["later", "Tell me more first"]] as const).map(([v, label]) => (
                <button key={v} type="button" onClick={() => setWantsIn(v)}
                  className={`flex items-center justify-between rounded-lg border px-3.5 py-3 text-left text-[15px] font-medium transition ${wantsIn === v ? "border-[#1877F2] bg-[#1877F2]/[0.06]" : "border-black/20"}`}>
                  {label}
                  <span className={`grid h-5 w-5 place-items-center rounded-full border ${wantsIn === v ? "border-[#1877F2] bg-[#1877F2]" : "border-black/25"}`}>
                    {wantsIn === v && <Check className="h-3.5 w-3.5 text-white" />}
                  </span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setStep("contact")} disabled={!wantsIn} className={`${blue} mt-5`}>
              Continue <ChevronRight className="h-4 w-4" />
            </button>
            {wantsIn === "later" && (
              <p className="mt-3 text-[13px] leading-snug text-black/60">
                Fair enough — leave your email on the next screen and you can look around first.
              </p>
            )}
          </div>
        )}

        {(step === "contact" || step === "sending") && (
          <div className="px-6 pb-6 pt-3">
            <p className="text-[15px] font-bold">Where should we set it up?</p>
            <label className="mt-4 block text-[13px] font-medium text-black/60">
              First name
              <input value={name} onChange={e => setName(e.target.value)} className={field} placeholder="Your first name" autoComplete="given-name" />
            </label>
            <label className="mt-3 block text-[13px] font-medium text-black/60">
              Email
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" inputMode="email" autoComplete="email"
                className={field} placeholder="you@example.com" />
            </label>

            <label className="mt-4 flex cursor-pointer items-start gap-2.5">
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#1877F2]" />
              <span className="text-[12px] leading-snug text-black/60">
                I agree that LuxuryBandit may write to me by email and I accept the{" "}
                <a href="/terms" className="text-[#1877F2] underline">terms</a> and the{" "}
                <a href="/privacy" className="text-[#1877F2] underline">privacy policy</a>. I can unsubscribe at any time.
              </span>
            </label>

            {code ? (
              <p className="mt-3 rounded-lg bg-[#1877F2]/[0.07] px-3 py-2 text-[13px] font-medium text-black/70">
                Code <b>{code.toUpperCase()}</b> is applied — your first month is 19 € instead of 49 €.
              </p>
            ) : null}

            <button type="button" onClick={() => void submit()} disabled={!emailOk || !consent || busy} className={`${blue} mt-4`}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {busy ? "Opening checkout …" : code ? "Start — 19 € first month" : "Start — 49 €/month"}
            </button>
            {error && <p className="mt-2 text-[13px] font-medium text-red-600">{error}</p>}
            <p className="mt-3 text-center text-[12px] text-black/45">
              Secure payment by Stripe · cancel any time
            </p>
          </div>
        )}
      </div>

      <p className="mx-auto mt-3 max-w-[420px] text-center text-[11px] leading-snug text-white/50">
        This form belongs to LuxuryBandit. It is not a Facebook service and Meta does not process your payment.
      </p>
    </div>
  );
}
