"use client";

import { useState } from "react";
import { fillPrices } from "@/lib/pricing";
import { Loader2, Lock, MessageCircle, CloudSun, Palmtree, Check } from "lucide-react";

/**
 * Code eintippen → Thema wählen → direkt in die Stripe-Kasse. Kein Formular, keine Liste,
 * kein Nachfassen: Wer hier ankommt, zahlt in diesem Schritt oder gar nicht.
 *
 * Der Code geht nur als Text zum Server; welcher Gutschein dahintersteht, entscheidet der
 * Server (lib/promo.ts). Ein falscher Code blockiert den Kauf NICHT — er gilt dann eben
 * ohne Rabatt, statt den Kunden vor eine kaputte Kasse zu setzen.
 */

const TOPICS = [
  { id: "chat",    label: "Chat with an AI girl",     hint: "Write with her every day · chatting is free", icon: MessageCircle, endpoint: "/api/chat-abo-checkout" },
  { id: "holiday", label: "Holiday with your dream girl", hint: "You and her — 25 moments to pick from",  icon: Palmtree,      endpoint: "/api/holiday-abo-checkout" },
  { id: "wetter",  label: "Morning Weather",          hint: "Her message every morning · chat",           icon: CloudSun,      endpoint: "/api/wetter-abo-checkout" },
];

export default function OfferRedeem({ initialCode = "" }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode);
  const [topic, setTopic] = useState(TOPICS[0].id);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const start = async () => {
    if (busy) return;
    const t = TOPICS.find(x => x.id === topic)!;
    setBusy(true); setStatus("");
    try {
      const r = await fetch(t.endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), returnTo: `/offer?code=${encodeURIComponent(code.trim())}` }),
      });
      const d = await r.json().catch(() => ({}));
      if (!d?.url) { setStatus(d?.error || "Checkout could not start. Please try again."); setBusy(false); return; }
      window.location.href = d.url;   // volle Weiterleitung: Stripe im selben Tab, kein Popup-Blocker
    } catch {
      setStatus("Network error. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="mt-8">
      <p className="text-[12px] font-black uppercase tracking-wide text-[#f6cf51]">1 · Your code</p>
      <input value={code} onChange={e => setCode(e.target.value)} maxLength={40}
        placeholder="The code from the ad" autoCapitalize="characters"
        className="mt-2 h-12 w-full rounded-xl border border-white/30 bg-white/[0.08] px-4 text-[15px] font-black uppercase tracking-wide text-white outline-none placeholder:text-white/60 placeholder:normal-case placeholder:font-semibold focus:border-[#f6cf51]" />
      {/* Der Preis, der hier steht, muss der sein, den Stripe abbucht (Owner 29.07.2026):
          der 50-%-Gutschein gilt für JEDEN und DAUERHAFT — mit Code wie ohne. */}
      {code.trim() ? (
        <p className="mt-2 rounded-xl border border-[#f6cf51]/40 bg-[#f6cf51]/10 px-3 py-2.5 text-[13px] font-bold leading-snug text-[#f6cf51]">
          {/* Derselbe Satz wie im Zweig darunter, nur mit Code — und genau hier standen die
              Zahlen von Hand: 24,50 / 49 / 5. Der Nachbarzweig fuellte laengst richtig. */}
          Code {code.trim().toUpperCase()} applied:{" "}
          <span className="font-black">{fillPrices("{price} a month instead of {list}", "en")}</span>,
          {fillPrices(" for as long as you stay — {videos} videos a month across all topics, chatting free.", "en")}
        </p>
      ) : (
        <p className="mt-1.5 text-[12px] font-bold text-white/70">
          {fillPrices("You pay {price} a month instead of {list} — the 50% stays, month after month. "
            + "{videos} videos a month across all topics; chatting costs nothing.", "en")}
        </p>
      )}

      <p className="mt-6 text-[12px] font-black uppercase tracking-wide text-[#f6cf51]">2 · Your topic</p>
      <div className="mt-2 grid gap-2">
        {TOPICS.map(t => {
          const on = topic === t.id;
          const Icon = t.icon;
          return (
            <button key={t.id} type="button" onClick={() => setTopic(t.id)}
              className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${on ? "border-[#f6cf51] bg-[#f6cf51]/10" : "border-white/25 bg-white/[0.06]"}`}>
              <Icon className={`h-5 w-5 shrink-0 ${on ? "text-[#f6cf51]" : "text-white/70"}`} />
              <span className="min-w-0 flex-1">
                <span className={`block text-[15px] font-black ${on ? "text-[#f6cf51]" : "text-white"}`}>{t.label}</span>
                <span className="block text-[12px] font-bold leading-snug text-white/70">{t.hint}</span>
              </span>
              {on && <Check className="h-5 w-5 shrink-0 text-[#f6cf51]" />}
            </button>
          );
        })}
      </div>

      <button type="button" onClick={() => void start()} disabled={busy}
        className="lb-gold mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-black active:scale-95 transition disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} {fillPrices("Start — {price}/month", "en")}
      </button>
      {status && <p className="mt-2 text-center text-[13px] font-bold text-white/80">{status}</p>}
      <p className="mt-3 text-center text-[12px] font-bold text-white/70">
        Secure checkout by Stripe · cancel any time in your account
      </p>
    </div>
  );
}
