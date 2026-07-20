"use client";

import { useState } from "react";
import { Loader2, Check } from "lucide-react";
import { logFunnelEvent } from "@/lib/track-funnel";

// Eintragung in Bellas Warteliste. Bewusst nur ZWEI Pflichtfelder (Vorname + E-Mail) —
// jedes zusätzliche Feld kostet Anmeldungen. Die Stadt ist optional und erklärt sich
// über den Nutzen ("damit sie dein Wetter kennt").
type Lang = "de" | "en" | "ro";

const STRINGS: Record<Lang, {
  name: string; mail: string; city: string; cta: string; busy: string;
  doneTitle: string; doneBody: string; invalid: string; oops: string; note: string;
}> = {
  en: {
    name: "Your first name", mail: "your@email.com", city: "Your city (optional)",
    cta: "Wake me up 🌍", busy: "Signing you up…",
    doneTitle: "You're in!", doneBody: "Bella has your address. We'll let you know the moment she sets off.",
    invalid: "Please enter a valid email address.", oops: "Something went wrong. Please try again.",
    note: "Free · no account needed · unsubscribe anytime",
  },
  de: {
    name: "Dein Vorname", mail: "deine@email.de", city: "Deine Stadt (optional)",
    cta: "Weck mich 🌍", busy: "Wird eingetragen…",
    doneTitle: "Du bist dabei!", doneBody: "Bella hat deine Adresse. Wir melden uns, sobald sie losreist.",
    invalid: "Bitte gib eine gültige E-Mail-Adresse an.", oops: "Etwas ist schiefgelaufen. Bitte nochmal versuchen.",
    note: "Kostenlos · kein Konto nötig · jederzeit abbestellbar",
  },
  ro: {
    name: "Prenumele tău", mail: "email@exemplu.ro", city: "Orașul tău (opțional)",
    cta: "Trezește-mă 💛", busy: "Te înregistrez…",
    doneTitle: "Gata! Ești pe listă 💛", doneBody: "Bella are adresa ta. Te trezește în fiecare dimineață cu un mesaj.",
    invalid: "Te rog introdu o adresă de email validă.", oops: "Ceva n-a mers. Încearcă din nou.",
    note: "Gratis · fără cont · te dezabonezi oricând",
  },
};

// `dark`: für dunkle Seiten wie /bella. Standard bleibt das helle Karten-Design.
export default function DailySignupForm({ lang = "de", dark = false }: { lang?: Lang; dark?: boolean }) {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const t = STRINGS[lang];

  const submit = async () => {
    const mail = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) { setError(t.invalid); return; }
    setBusy(true); setError("");
    try {
      const source = typeof window !== "undefined"
        ? (new URLSearchParams(window.location.search).get("utm_source") || document.referrer || "")
        : "";
      const res = await fetch("/api/daily-signup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: mail, firstName, city, lang, source }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || t.oops); return; }
      void logFunnelEvent("bella_signup", { lookId: "bella-daily", lookName: "Bella Daily" });
      setDone(true);
    } catch { setError(t.oops); }
    finally { setBusy(false); }
  };

  if (done) {
    return dark ? (
      <div className="rounded-2xl border border-[#c9a23f]/40 bg-[#c9a23f]/10 p-6 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#c9a23f] text-black"><Check className="h-6 w-6" /></span>
        <p className="mt-3 text-[18px] font-black text-white">{t.doneTitle}</p>
        <p className="mt-1 text-[14px] font-semibold text-white/70">{t.doneBody}</p>
      </div>
    ) : (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-800 text-white"><Check className="h-6 w-6" /></span>
        <p className="mt-3 text-[18px] font-black text-slate-900">{t.doneTitle}</p>
        <p className="mt-1 text-[14px] font-semibold text-slate-600">{t.doneBody}</p>
      </div>
    );
  }

  const field = dark
    ? "h-13 w-full rounded-xl border-[1.5px] border-white/15 bg-black/40 px-4 py-3 text-[15px] font-bold text-white outline-none focus:border-[#c9a23f] placeholder:text-white/35"
    : "h-13 w-full rounded-xl border-[1.5px] border-slate-400 bg-white px-4 py-3 text-[15px] font-bold text-slate-900 outline-none focus:border-slate-700 placeholder:text-slate-400";

  return (
    <div className={dark
      ? "rounded-2xl border border-[#c9a23f]/25 bg-[#c9a23f]/[0.06] p-5"
      : "rounded-2xl border border-black/10 bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.06)]"}>
      <div className="grid gap-2.5">
        <input className={field} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder={t.name} autoComplete="given-name" />
        <input className={field} value={email} onChange={e => setEmail(e.target.value)} placeholder={t.mail} type="email" inputMode="email" autoComplete="email"
          onKeyDown={e => { if (e.key === "Enter") void submit(); }} />
        <input className={field} value={city} onChange={e => setCity(e.target.value)} placeholder={t.city} autoComplete="address-level2" />
      </div>
      {error && <p className={`mt-2 text-[13px] font-bold ${dark ? "text-red-300" : "text-red-600"}`}>{error}</p>}
      <button type="button" onClick={() => void submit()} disabled={busy}
        className={dark
          ? "mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#c9a23f] text-base font-black text-black transition active:scale-95 disabled:opacity-50"
          : "mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-800 text-base font-black text-white shadow-[0_3px_0_#0f172a,0_6px_14px_rgba(15,23,42,0.28)] transition active:translate-y-[3px] disabled:opacity-50"}>
        {busy ? <><Loader2 className="h-5 w-5 animate-spin" /> {t.busy}</> : t.cta}
      </button>
      <p className={`mt-2 text-center text-[12px] font-bold ${dark ? "text-white/40" : "text-slate-500"}`}>{t.note}</p>
    </div>
  );
}
