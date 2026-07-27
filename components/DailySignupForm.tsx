"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Check, Search } from "lucide-react";
import { logFunnelEvent } from "@/lib/track-funnel";
import { countryOptions, flagEmoji, dialCode } from "@/lib/countries";

// Eintragung in Bellas Warteliste. Vorname · Land · Stadt (echte Orts-Suche) · WhatsApp · E-Mail.
// Land + Stadt bewusst als AUSWAHL/Suche, nicht als Freitext: so ist der Ort immer ein echter,
// auffindbarer Ort (das Wetter lässt sich dann verlässlich dazuholen).
type Lang = "de" | "en" | "ro";

const STRINGS: Record<Lang, {
  name: string; country: string; citySearch: string; cityNone: string; whats: string; mail: string;
  cta: string; busy: string; doneTitle: string; doneBody: string; invalid: string; oops: string; note: string;
}> = {
  en: {
    name: "Your first name", country: "Your country", citySearch: "Search your city…", cityNone: "No city found",
    whats: "WhatsApp number", mail: "your@email.com",
    cta: "Wake me up 🌍", busy: "Signing you up…",
    doneTitle: "You're in!", doneBody: "Bella has your details. She'll wake you up every morning with a message.",
    invalid: "Please enter a valid email address.", oops: "Something went wrong. Please try again.",
    note: "Free · no account needed · unsubscribe anytime",
  },
  de: {
    name: "Dein Vorname", country: "Dein Land", citySearch: "Stadt suchen…", cityNone: "Keine Stadt gefunden",
    whats: "WhatsApp-Nummer", mail: "deine@email.de",
    cta: "Weck mich 🌍", busy: "Wird eingetragen…",
    doneTitle: "Du bist dabei!", doneBody: "Bella hat deine Daten. Sie weckt dich jeden Morgen mit einer Nachricht.",
    invalid: "Bitte gib eine gültige E-Mail-Adresse an.", oops: "Etwas ist schiefgelaufen. Bitte nochmal versuchen.",
    note: "Kostenlos · kein Konto nötig · jederzeit abbestellbar",
  },
  ro: {
    name: "Prenumele tău", country: "Țara ta", citySearch: "Caută orașul…", cityNone: "Niciun oraș găsit",
    whats: "Numărul de WhatsApp", mail: "email@exemplu.ro",
    cta: "Trezește-mă 💛", busy: "Te înregistrez…",
    doneTitle: "Gata! Ești pe listă 💛", doneBody: "Bella are datele tale. Te trezește în fiecare dimineață cu un mesaj.",
    invalid: "Te rog introdu o adresă de email validă.", oops: "Ceva n-a mers. Încearcă din nou.",
    note: "Gratis · fără cont · te dezabonezi oricând",
  },
};

type GeoResult = { name: string; country_code?: string; admin1?: string; latitude?: number; longitude?: number };

// `dark`: für dunkle Seiten wie /bella. Standard bleibt das helle Karten-Design.
export default function DailySignupForm({ lang = "de", dark = false }: { lang?: Lang; dark?: boolean }) {
  const [firstName, setFirstName] = useState("");
  const [countryCode, setCountryCode] = useState(lang === "ro" ? "RO" : lang === "de" ? "DE" : "");
  const [cityInput, setCityInput] = useState("");
  const [cityResults, setCityResults] = useState<GeoResult[]>([]);
  const [citySelected, setCitySelected] = useState<GeoResult | null>(null);
  const [cityOpen, setCityOpen] = useState(false);
  const [cityLoading, setCityLoading] = useState(false);
  const [whats, setWhats] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const t = STRINGS[lang];
  const countries = countryOptions(lang);
  const dial = dialCode(countryCode);

  // Stadt-Suche über Open-Meteo (derselbe Geo-Dienst wie das Wetter, CORS erlaubt, kein Schlüssel).
  // Nur echte Treffer — getippter Text allein zählt nicht, damit der Ort immer auffindbar ist.
  useEffect(() => {
    const q = cityInput.trim();
    if (q.length < 2 || citySelected?.name === q) { setCityResults([]); setCityOpen(false); return; }
    let cancelled = false;
    setCityLoading(true);
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=${lang}&format=json`);
        const d = await r.json().catch(() => null);
        let list: GeoResult[] = Array.isArray(d?.results) ? d.results : [];
        if (countryCode) list = list.filter(x => (x.country_code || "").toUpperCase() === countryCode);
        if (!cancelled) { setCityResults(list); setCityOpen(true); }
      } catch { if (!cancelled) setCityResults([]); }
      finally { if (!cancelled) setCityLoading(false); }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [cityInput, countryCode, citySelected, lang]);

  const pickCity = (r: GeoResult) => { setCitySelected(r); setCityInput(r.name); setCityResults([]); setCityOpen(false); };

  const submit = async () => {
    const mail = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) { setError(t.invalid); return; }
    setBusy(true); setError("");
    try {
      const source = typeof window !== "undefined"
        ? (new URLSearchParams(window.location.search).get("utm_source") || document.referrer || "")
        : "";
      const whatsFull = whats.trim() ? `${dial} ${whats.trim()}`.trim() : "";
      const res = await fetch("/api/daily-signup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: mail, firstName, lang, source,
          country: countryCode, city: citySelected?.name ?? "", whatsapp: whatsFull,
        }),
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
      <div className="rounded-2xl border border-[#f6cf51]/40 bg-[#f6cf51]/10 p-6 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#f6cf51] text-black"><Check className="h-6 w-6" /></span>
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
    ? "h-13 w-full rounded-xl border-[1.5px] border-white/15 bg-black/40 px-4 py-3 text-[15px] font-bold text-white outline-none focus:border-[#f6cf51] placeholder:text-white/35"
    : "h-13 w-full rounded-xl border-[1.5px] border-slate-400 bg-white px-4 py-3 text-[15px] font-bold text-slate-900 outline-none focus:border-slate-700 placeholder:text-slate-400";
  const menu = dark ? "border-white/15 bg-[#181410]" : "border-slate-300 bg-white";
  const row = dark ? "text-white hover:bg-white/10" : "text-slate-900 hover:bg-slate-100";

  return (
    <div className={dark
      ? "rounded-2xl border border-[#f6cf51]/25 bg-[#f6cf51]/[0.06] p-5"
      : "rounded-2xl border border-black/10 bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.06)]"}>
      <div className="grid gap-2.5">
        <input className={field} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder={t.name} autoComplete="given-name" />

        {/* Land — native Auswahl (auf dem Handy ein echter Such-/Scroll-Picker). */}
        <select className={`${field} appearance-none`} value={countryCode}
          onChange={e => { setCountryCode(e.target.value); setCitySelected(null); setCityInput(""); }}>
          <option value="">{t.country}</option>
          {countries.map(c => <option key={c.code} value={c.code}>{flagEmoji(c.code)} {c.name}</option>)}
        </select>

        {/* Stadt — echte Orts-Suche mit Trefferliste. */}
        <div className="relative">
          <div className="relative">
            <Search className={`pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${dark ? "text-white/35" : "text-slate-400"}`} />
            <input className={`${field} pl-10`} value={cityInput}
              onChange={e => { setCityInput(e.target.value); setCitySelected(null); }}
              placeholder={t.citySearch} autoComplete="off" />
            {cityLoading && <Loader2 className={`absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin ${dark ? "text-white/40" : "text-slate-400"}`} />}
          </div>
          {cityOpen && (
            <div className={`absolute z-20 mt-1 w-full overflow-hidden rounded-xl border ${menu} shadow-xl`}>
              {cityResults.length === 0 && !cityLoading ? (
                <p className={`px-4 py-3 text-[13px] font-semibold ${dark ? "text-white/40" : "text-slate-500"}`}>{t.cityNone}</p>
              ) : cityResults.map((r, i) => (
                <button key={`${r.name}-${i}`} type="button" onClick={() => pickCity(r)}
                  className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-[14px] font-bold ${row}`}>
                  <span>{flagEmoji(r.country_code || "")}</span>
                  <span className="truncate">{r.name}{r.admin1 ? <span className={dark ? "text-white/45" : "text-slate-500"}> · {r.admin1}</span> : null}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* WhatsApp — mit automatischer Landesvorwahl. */}
        <div className="flex gap-2">
          {dial && (
            <span className={`flex h-13 shrink-0 items-center rounded-xl border-[1.5px] px-3 text-[15px] font-black ${dark ? "border-white/15 bg-black/40 text-white/80" : "border-slate-400 bg-slate-50 text-slate-700"}`}>{dial}</span>
          )}
          <input className={field} value={whats} onChange={e => setWhats(e.target.value.replace(/[^0-9\s]/g, ""))}
            placeholder={t.whats} type="tel" inputMode="tel" autoComplete="tel-national" />
        </div>

        <input className={field} value={email} onChange={e => setEmail(e.target.value)} placeholder={t.mail} type="email" inputMode="email" autoComplete="email"
          onKeyDown={e => { if (e.key === "Enter") void submit(); }} />
      </div>

      {error && <p className={`mt-2 text-[13px] font-bold ${dark ? "text-red-300" : "text-red-600"}`}>{error}</p>}
      <button type="button" onClick={() => void submit()} disabled={busy}
        className={dark
          ? "mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#f6cf51] text-base font-black text-black transition active:scale-95 disabled:opacity-50"
          : "mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-800 text-base font-black text-white shadow-[0_3px_0_#0f172a,0_6px_14px_rgba(15,23,42,0.28)] transition active:translate-y-[3px] disabled:opacity-50"}>
        {busy ? <><Loader2 className="h-5 w-5 animate-spin" /> {t.busy}</> : t.cta}
      </button>
      <p className={`mt-2 text-center text-[12px] font-bold ${dark ? "text-white/40" : "text-slate-500"}`}>{t.note}</p>
    </div>
  );
}
