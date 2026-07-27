"use client";

import { useEffect, useState } from "react";
import { trackMetaPixel } from "@/lib/meta-pixel";
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

type Step = "intro" | "q1" | "q2" | "q3" | "contact" | "sending" | "bye" | "done";

/**
 * Die Fragen sind dem Sofortformular nachempfunden (eine Frage, große Auswahlzeilen,
 * Fortschritt, Zurück-Pfeil) — mit einem Unterschied: Hier ENTSCHEIDEN die Antworten etwas.
 * Frage 2 wählt das Thema, Frage 3 die Sprache, in der sie schreibt. Reine Filterfragen
 * („Was hält dich ab?") lassen wir weg: Sie laden zum Zweifeln ein, genau vor der Kasse.
 */
const Q_TOPIC: [string, string, string][] = [
  ["chat",    "Talking to her every day",     "Chat is free — she answers in your language"],
  ["holiday", "Videos of the two of us",      "You and her: beach, dinner, a kiss — 25 moments"],
  ["wetter",  "A message every morning",      "Her weather, a new look, a chat to start the day"],
];
const Q_LANG: [string, string][] = [
  ["en", "English"], ["de", "Deutsch"], ["ro", "Română"], ["es", "Español"],
];

export default function JoinForm({ code = "", topic = "chat", presetEmail = "", presetName = "", paid = false }: {
  code?: string; topic?: string; presetEmail?: string; presetName?: string; paid?: boolean;
}) {
  const [step, setStep] = useState<Step>(paid ? "done" : "intro");

  // PIXEL — ohne diese Meldungen kann Meta nicht auf Käufe optimieren, und genau das ist
  // der Sinn der Anzeige. ViewContent beim Öffnen, InitiateCheckout beim Absenden,
  // Purchase auf der Rückkehr von Stripe (?paid=1).
  useEffect(() => {
    if (paid) {
      const value = code ? 19 : 49;
      trackMetaPixel("Purchase", { value, currency: "EUR", content_category: "topic-abo", content_name: topic });
    } else {
      trackMetaPixel("ViewContent", { content_category: "join", content_name: topic });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [wantsIn, setWantsIn] = useState<"yes" | "later" | "no" | "">("");
  const [pickedTopic, setPickedTopic] = useState(topic);
  const [lang, setLang] = useState("");
  // Vorausgefuellt, wenn der Link die Daten mitbringt (Mail an Leads) — spart die
  // zweite Eingabe derselben Adresse.
  const [name, setName] = useState(presetName);
  const [email, setEmail] = useState(presetEmail);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const endpoint =
    pickedTopic === "holiday" ? "/api/holiday-abo-checkout"
    : pickedTopic === "wetter" ? "/api/wetter-abo-checkout"
    : "/api/chat-abo-checkout";

  // Die gewählte Sprache merken — dieselbe Kennung wie der Umschalter in der Kopfzeile,
  // damit die Seite danach in seiner Sprache weiterläuft.
  const rememberLang = (l: string) => {
    setLang(l);
    try { document.cookie = `lb_lang=${l}; path=/; max-age=31536000; samesite=lax`; } catch { /**/ }
  };

  const submit = async () => {
    if (busy) return;
    if (!emailOk) { setError("Please enter a valid email address."); return; }
    if (!consent) { setError("Please tick the box so we may write to you."); return; }
    setBusy(true); setError(""); setStep("sending");
    trackMetaPixel("InitiateCheckout", { value: code ? 19 : 49, currency: "EUR", content_category: "topic-abo", content_name: pickedTopic });
    // Kontakt ZUERST sichern: wer im Stripe-Fenster abspringt, ist dann trotzdem erreichbar.
    try {
      await fetch("/api/join-lead", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), code, topic: pickedTopic, lang }),
      });
    } catch { /* der Kauf ist wichtiger als das Protokoll */ }

    try {
      const d = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, email: email.trim(), returnTo: `/join?paid=1&code=${encodeURIComponent(code)}&topic=${encodeURIComponent(pickedTopic)}` }),
      }).then(r => r.json());
      if (!d?.url) { setError(d?.error || "Could not open the checkout. Please try again."); setStep("contact"); setBusy(false); return; }
      window.location.href = d.url;
    } catch {
      setError("Network error. Please try again.");
      setStep("contact"); setBusy(false);
    }
  };

  const Row = ({ on, title, hint, onClick }: { on: boolean; title: string; hint?: string; onClick: () => void }) => (
    <button type="button" onClick={onClick}
      className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3.5 py-3 text-left transition ${on ? "border-[#1877F2] bg-[#1877F2]/[0.06]" : "border-black/20"}`}>
      <span className="min-w-0">
        <span className="block text-[15px] font-medium text-black">{title}</span>
        {hint && <span className="mt-0.5 block text-[12px] leading-snug text-black/55">{hint}</span>}
      </span>
      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${on ? "border-[#1877F2] bg-[#1877F2]" : "border-black/25"}`}>
        {on && <Check className="h-3.5 w-3.5 text-white" />}
      </span>
    </button>
  );

  const STEPS: Step[] = ["q1", "q2", "q3", "contact"];
  const idx = STEPS.indexOf(step);
  const Head = ({ back }: { back: Step }) => (
    <div className="flex items-center justify-between px-6 pt-4 text-[12px] font-medium text-black/45">
      <button type="button" onClick={() => setStep(back)} className="rounded px-1 py-0.5 hover:text-black/70">‹ Back</button>
      {idx >= 0 && <span>{idx + 1} of {STEPS.length}</span>}
    </div>
  );

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
            <button type="button" onClick={() => setStep("q1")} className={`${blue} mt-6`}>
              Continue <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {step === "q1" && (
          <>
            <Head back="intro" />
            <div className="px-6 pb-6 pt-2">
              <p className="text-[15px] font-bold leading-snug">
                Early adopter price: <span className="text-[#1877F2]">19 € for your first month</span>,
                then 49 € a month. 25 videos a month across all topics, chatting free. Would you join?
              </p>
              <div className="mt-4 grid gap-2">
                <Row on={wantsIn === "yes"} title="Yes, let's go" onClick={() => setWantsIn("yes")} />
                <Row on={wantsIn === "later"} title="Maybe — show me first" onClick={() => setWantsIn("later")} />
                <Row on={wantsIn === "no"} title="No, too expensive" onClick={() => setWantsIn("no")} />
              </div>
              <button type="button" className={`${blue} mt-5`}
                onClick={() => { if (!wantsIn) { setError("Please pick one."); return; } setError(""); setStep(wantsIn === "no" ? "bye" : "q2"); }}>
                Continue <ChevronRight className="h-4 w-4" />
              </button>
              {error && <p className="mt-2 text-[13px] font-medium text-red-600">{error}</p>}
            </div>
          </>
        )}

        {step === "q2" && (
          <>
            <Head back="q1" />
            <div className="px-6 pb-6 pt-2">
              <p className="text-[15px] font-bold leading-snug">What do you want most?</p>
              <p className="mt-1 text-[12px] text-black/55">This picks where you start — you can use all topics either way.</p>
              <div className="mt-4 grid gap-2">
                {Q_TOPIC.map(([id, title, hint]) => (
                  <Row key={id} on={pickedTopic === id} title={title} hint={hint} onClick={() => setPickedTopic(id)} />
                ))}
              </div>
              <button type="button" className={`${blue} mt-5`} onClick={() => setStep("q3")}>
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}

        {step === "q3" && (
          <>
            <Head back="q2" />
            <div className="px-6 pb-6 pt-2">
              <p className="text-[15px] font-bold leading-snug">Which language should she write in?</p>
              <p className="mt-1 text-[12px] text-black/55">She follows you anyway if you switch mid-conversation.</p>
              <div className="mt-4 grid gap-2">
                {Q_LANG.map(([id, label]) => (
                  <Row key={id} on={lang === id} title={label} onClick={() => rememberLang(id)} />
                ))}
              </div>
              <button type="button" className={`${blue} mt-5`}
                onClick={() => { if (!lang) { setError("Please pick a language."); return; } setError(""); setStep("contact"); }}>
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}

        {step === "done" && (
          <div className="px-6 pb-7 pt-3 text-center">
            <p className="text-[17px] font-bold">You&apos;re in 🎉</p>
            <p className="mt-2 text-[15px] leading-relaxed text-black/70">
              Your subscription is active: 25 videos a month across all topics, and chatting is free.
              We sent everything to your email.
            </p>
            <a href="/themes" className={`${blue} mt-5`}>Start now <ChevronRight className="h-4 w-4" /></a>
            <a href="/account" className="mt-3 block text-[13px] font-medium text-[#1877F2] underline">Manage your subscription</a>
          </div>
        )}

        {step === "bye" && (
          <div className="px-6 pb-7 pt-3 text-center">
            <p className="text-[17px] font-bold">Fair enough.</p>
            <p className="mt-2 text-[15px] leading-relaxed text-black/70">
              Chatting with her costs nothing — go and try it, and come back when you want the videos.
            </p>
            <a href="/themes/chat" className={`${blue} mt-5`}>Chat for free <ChevronRight className="h-4 w-4" /></a>
          </div>
        )}

        {(step === "contact" || step === "sending") && (
          <>
            <Head back="q3" />
          <div className="px-6 pb-6 pt-2">
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

            <button type="button" onClick={() => void submit()} disabled={busy} className={`${blue} mt-4`}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {busy ? "Opening checkout …" : code ? "Start — 19 € first month" : "Start — 49 €/month"}
            </button>
            {error && <p className="mt-2 text-[13px] font-medium text-red-600">{error}</p>}
            <p className="mt-3 text-center text-[12px] text-black/45">
              Secure payment by Stripe · cancel any time
            </p>
          </div>
          </>
        )}
      </div>

      <p className="mx-auto mt-3 max-w-[420px] text-center text-[11px] leading-snug text-white/50">
        This form belongs to LuxuryBandit. It is not a Facebook service and Meta does not process your payment.
      </p>
    </div>
  );
}
