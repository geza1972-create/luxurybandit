"use client";

import { useEffect, useState } from "react";
import { Loader2, Sun, MailCheck } from "lucide-react";

// „Account" für Wetter am Morgen:
//  • Kennt das Gerät schon eine Kennung (localStorage) → automatisch einloggen (?s=… laden).
//  • Sonst: volle Anmeldung (Name · E-Mail · Geburtsdatum · Geschlecht · Stadt · Land · WhatsApp).
//    Danach Double-Opt-in: er muss die E-Mail bestätigen (gegen Spam/Fake). Erst der
//    Bestätigungslink loggt das Gerät ein.

const storeKey = (modelId: string) => `lb_wetter_sub_${modelId}`;

type Copy = {
  title: (m: string) => string; sub: string;
  name: string; email: string; birthdate: string; gender: string;
  genderM: string; genderF: string; genderX: string; city: string; country: string; phone: string;
  cta: string; note: string; fillAll: string; badEmail: string;
  sentTitle: string; sentBody: (e: string) => string;
};
const T: Record<string, Copy> = {
  ro: {
    title: m => `Vrei ca ${m} să te trezească în fiecare dimineață? ☀️`,
    sub: "Un mesaj în fiecare dimineață — vremea de la tine și un gând bun.",
    name: "Numele tău", email: "Email", birthdate: "Data nașterii", gender: "Sexul",
    genderM: "Bărbat", genderF: "Femeie", genderX: "Altul", city: "Orașul tău (pentru vreme)", country: "Țara", phone: "Numărul tău (WhatsApp)",
    cta: "Creează cont gratis", note: "Fără parolă. Îți confirmi emailul o singură dată.",
    fillAll: "Te rog completează toate câmpurile.", badEmail: "Email invalid.",
    sentTitle: "Verifică-ți emailul 📧", sentBody: e => `Ți-am trimis un link de confirmare la ${e}. Confirmă și gata!`,
  },
  de: {
    title: m => `Soll ${m} dich jeden Morgen wecken? ☀️`,
    sub: "Eine Nachricht jeden Morgen — dein Wetter und ein guter Gedanke.",
    name: "Dein Name", email: "E-Mail", birthdate: "Geburtsdatum", gender: "Geschlecht",
    genderM: "Männlich", genderF: "Weiblich", genderX: "Divers", city: "Deine Stadt (fürs Wetter)", country: "Land", phone: "Deine Nummer (WhatsApp)",
    cta: "Kostenlos anmelden", note: "Ohne Passwort. E-Mail einmal bestätigen.",
    fillAll: "Bitte alle Felder ausfüllen.", badEmail: "Ungültige E-Mail.",
    sentTitle: "Prüfe deine E-Mail 📧", sentBody: e => `Wir haben dir einen Bestätigungslink an ${e} geschickt. Bestätigen und los!`,
  },
  en: {
    title: m => `Want ${m} to wake you every morning? ☀️`,
    sub: "One message every morning — your weather and a good thought.",
    name: "Your name", email: "Email", birthdate: "Date of birth", gender: "Gender",
    genderM: "Male", genderF: "Female", genderX: "Other", city: "Your city (for weather)", country: "Country", phone: "Your number (WhatsApp)",
    cta: "Create free account", note: "No password. Confirm your email once.",
    fillAll: "Please fill in all fields.", badEmail: "Invalid email.",
    sentTitle: "Check your email 📧", sentBody: e => `We sent a confirmation link to ${e}. Confirm and you're in!`,
  },
};

const inputCls = "h-12 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 text-[15px] font-semibold text-white outline-none placeholder:text-white/40 focus:border-[#c9a23f]";

export default function WetterGate({ modelId, modelName = "Bella", lang = "ro" }: { modelId: string; modelName?: string; lang?: string }) {
  const L = (lang || "ro").slice(0, 2).toLowerCase();
  const t = T[L] ?? T.ro;

  const [checking, setChecking] = useState(true);   // prüft, ob das Gerät schon eingeloggt ist
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [gender, setGender] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);   // Bestätigungs-Mail raus → „prüfe deine E-Mail"

  // Schon eingeloggt auf diesem Gerät? → direkt zur persönlichen Ansicht.
  useEffect(() => {
    try {
      const id = localStorage.getItem(storeKey(modelId));
      if (id) { window.location.replace(`?s=${encodeURIComponent(id)}`); return; }
    } catch { /**/ }
    setChecking(false);
  }, [modelId]);

  const create = async () => {
    if (!name.trim() || !email.trim() || !birthdate || !gender || !city.trim() || !country.trim() || !phone.trim()) { setError(t.fillAll); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setError(t.badEmail); return; }
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/wetter-signup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId, name, email, birthdate, gender, city, country, phone, lang: L }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d?.error ?? "…"); return; }
      setSent(true);   // Double-Opt-in: NICHT einloggen — erst nach Bestätigung.
    } catch { setError("…"); }
    finally { setBusy(false); }
  };

  if (checking) return (
    <div className="mx-auto flex max-w-md items-center justify-center px-5 py-10 text-white/50">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );

  if (sent) return (
    <section className="mx-auto mt-8 max-w-md px-5">
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.07] p-6 text-center">
        <MailCheck className="mx-auto h-9 w-9 text-emerald-400" />
        <p className="mt-3 text-[19px] font-black text-white">{t.sentTitle}</p>
        <p className="mt-1.5 text-[14px] font-semibold leading-relaxed text-white/70">{t.sentBody(email.trim())}</p>
      </div>
    </section>
  );

  return (
    <section className="mx-auto mt-8 max-w-md px-5">
      <div className="rounded-2xl border border-[#c9a23f]/30 bg-[#c9a23f]/[0.06] p-5">
        <p className="flex items-center gap-2 text-[20px] font-black leading-tight text-white">
          <Sun className="h-5 w-5 shrink-0 text-[#c9a23f]" /> {t.title(modelName)}
        </p>
        <p className="mt-1.5 text-[14px] font-semibold leading-relaxed text-white/65">{t.sub}</p>

        <div className="mt-4 grid grid-cols-1 gap-2">
          <input value={name} onChange={e => setName(e.target.value)} placeholder={t.name} className={inputCls} />
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder={t.email} inputMode="email" type="email" className={inputCls} />
          {/* Geburtsdatum — volle Breite (type=date hat eine Mindestbreite, deshalb nicht nebeneinander). */}
          <label className="flex h-12 w-full items-center rounded-xl border border-white/15 bg-white/[0.04] px-4">
            <span className="mr-2 shrink-0 text-[13px] font-bold text-white/45">{t.birthdate}</span>
            <input value={birthdate} onChange={e => setBirthdate(e.target.value)} type="date"
              className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-white outline-none" />
          </label>
          {/* Geschlecht — volle Breite. */}
          <select value={gender} onChange={e => setGender(e.target.value)}
            className="h-12 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 text-[15px] font-bold text-white outline-none focus:border-[#c9a23f]">
            <option value="" className="bg-[#0d0b0a]">{t.gender}</option>
            <option value="m" className="bg-[#0d0b0a]">{t.genderM}</option>
            <option value="f" className="bg-[#0d0b0a]">{t.genderF}</option>
            <option value="x" className="bg-[#0d0b0a]">{t.genderX}</option>
          </select>
          <input value={city} onChange={e => setCity(e.target.value)} placeholder={t.city} className={inputCls} />
          <input value={country} onChange={e => setCountry(e.target.value)} placeholder={t.country} className={inputCls} />
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder={t.phone} inputMode="tel" type="tel" className={inputCls} />
          <button type="button" onClick={() => void create()} disabled={busy}
            className="mt-1 flex h-12 items-center justify-center gap-2 rounded-xl bg-[#c9a23f] text-[15px] font-black text-black active:scale-95 transition disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "☀️"} {t.cta}
          </button>
        </div>
        {error && <p className="mt-2 text-[12px] font-bold text-red-300">{error}</p>}
        <p className="mt-2 text-center text-[11px] font-bold text-white/45">{t.note}</p>
      </div>
    </section>
  );
}
