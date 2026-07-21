"use client";

import { useEffect, useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { DIAL_CODES, flagEmoji } from "@/lib/countries";

// Vorwahl-Auswahl (Flagge + Code + Dial), RO zuerst. Aus der gemeinsamen Länder-Liste.
const DIAL_OPTIONS = Object.entries(DIAL_CODES)
  .map(([code, dial]) => ({ code, dial }))
  .sort((a, b) => (a.code === "RO" ? -1 : b.code === "RO" ? 1 : a.code.localeCompare(b.code)));

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
    title: m => `Vrei ca ${m} să te trezească în fiecare dimineață?`,
    sub: "Un mesaj în fiecare dimineață — vremea de la tine și un gând bun.",
    name: "Numele tău", email: "Email", birthdate: "Data nașterii", gender: "Sexul",
    genderM: "Bărbat", genderF: "Femeie", genderX: "Altul", city: "Orașul tău (pentru vreme)", country: "Țara", phone: "Numărul tău (WhatsApp)",
    cta: "Creează cont gratis", note: "Fără parolă. Îți confirmi emailul o singură dată.",
    fillAll: "Te rog completează toate câmpurile.", badEmail: "Email invalid.",
    sentTitle: "Verifică-ți emailul 📧", sentBody: e => `Ți-am trimis un link de confirmare la ${e}. Confirmă și gata!`,
  },
  de: {
    title: m => `Soll ${m} dich jeden Morgen wecken?`,
    sub: "Eine Nachricht jeden Morgen — dein Wetter und ein guter Gedanke.",
    name: "Dein Name", email: "E-Mail", birthdate: "Geburtsdatum", gender: "Geschlecht",
    genderM: "Männlich", genderF: "Weiblich", genderX: "Divers", city: "Deine Stadt (fürs Wetter)", country: "Land", phone: "Deine Nummer (WhatsApp)",
    cta: "Kostenlos anmelden", note: "Ohne Passwort. E-Mail einmal bestätigen.",
    fillAll: "Bitte alle Felder ausfüllen.", badEmail: "Ungültige E-Mail.",
    sentTitle: "Prüfe deine E-Mail 📧", sentBody: e => `Wir haben dir einen Bestätigungslink an ${e} geschickt. Bestätigen und los!`,
  },
  en: {
    title: m => `Want ${m} to wake you every morning?`,
    sub: "One message every morning — your weather and a good thought.",
    name: "Your name", email: "Email", birthdate: "Date of birth", gender: "Gender",
    genderM: "Male", genderF: "Female", genderX: "Other", city: "Your city (for weather)", country: "Country", phone: "Your number (WhatsApp)",
    cta: "Create free account", note: "No password. Confirm your email once.",
    fillAll: "Please fill in all fields.", badEmail: "Invalid email.",
    sentTitle: "Check your email 📧", sentBody: e => `We sent a confirmation link to ${e}. Confirm and you're in!`,
  },
};

// Floating-Label-Feld: leer = grau + großer Platzhalter; getippt/Fokus = WEISS mit schwarzem
// Rand, und der Feldname rutscht klein nach oben, damit man immer weiß, was es ist.
function LabeledInput({ label, value, onChange, invalid = false, type = "text", inputMode, autoComplete }: {
  label: string; value: string; onChange: (v: string) => void; invalid?: boolean; type?: string; inputMode?: "email" | "tel" | "text"; autoComplete?: string;
}) {
  const filled = !!value.trim();
  return (
    <div className="relative">
      <input value={value} onChange={e => onChange(e.target.value)} placeholder=" " type={type} inputMode={inputMode} autoComplete={autoComplete}
        className={`peer h-14 w-full rounded-xl border px-4 pb-1 pt-5 text-[15px] font-semibold text-white outline-none transition-colors focus:border-black focus:bg-white ${invalid ? "border-red-500 bg-white" : filled ? "border-black bg-white" : "border-white/15 bg-white/[0.04]"}`} />
      <label className="pointer-events-none absolute left-4 top-2 text-[11px] font-bold text-black/45 transition-all
        peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[15px] peer-placeholder-shown:font-semibold peer-placeholder-shown:text-white/40
        peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[11px] peer-focus:font-bold peer-focus:text-black/45">
        {label}
      </label>
    </div>
  );
}

export default function WetterGate({ modelId, modelName = "Bella", lang = "ro", preview = false }: { modelId: string; modelName?: string; lang?: string; preview?: boolean }) {
  const L = (lang || "ro").slice(0, 2).toLowerCase();
  const t = T[L] ?? T.ro;

  const [checking, setChecking] = useState(true);   // prüft, ob das Gerät schon eingeloggt ist
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [gender, setGender] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [dial, setDial] = useState("+40");   // Länder-Vorwahl (Default RO)
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);   // Bestätigungs-Mail raus → „prüfe deine E-Mail"
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());   // gültiges E-Mail-Format?

  // Schon eingeloggt auf diesem Gerät? → direkt zur persönlichen Ansicht.
  // Im Admin-Vorschau-Modus NICHT umleiten (sonst springt die Vorschau weg).
  useEffect(() => {
    if (preview) { setChecking(false); return; }
    try {
      const id = localStorage.getItem(storeKey(modelId));
      if (id) { window.location.replace(`?s=${encodeURIComponent(id)}`); return; }
    } catch { /**/ }
    setChecking(false);
  }, [modelId, preview]);

  const create = async () => {
    if (!name.trim() || !email.trim() || !birthdate || !gender || !city.trim() || !country.trim() || !phone.trim()) { setError(t.fillAll); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setError(t.badEmail); return; }
    setBusy(true); setError("");
    // Vorwahl + nationale Nummer → international (führende 0 der nationalen Nummer weg).
    const fullPhone = `${dial}${phone.replace(/[^\d]/g, "").replace(/^0+/, "")}`;
    try {
      const r = await fetch("/api/wetter-signup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId, name, email, birthdate, gender, city, country, phone: fullPhone, lang: L }),
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
      <div className="rounded-2xl border border-black/10 bg-white p-6 text-center">
        <MailCheck className="mx-auto h-9 w-9 text-black" />
        <p className="mt-3 text-[19px] font-black text-white">{t.sentTitle}</p>
        <p className="mt-1.5 text-[14px] font-semibold leading-relaxed text-white/70">{t.sentBody(email.trim())}</p>
      </div>
    </section>
  );

  return (
    <section className="mx-auto mt-8 max-w-md px-5">
      <div className="rounded-2xl border border-black/10 bg-white p-5">
        <p className="text-[20px] font-black leading-tight text-white">{t.title(modelName)}</p>
        <p className="mt-1.5 text-[14px] font-semibold leading-relaxed text-white/65">{t.sub}</p>

        <div className="mt-4 grid grid-cols-1 gap-2">
          <LabeledInput label={t.name} value={name} onChange={setName} autoComplete="name" />
          <LabeledInput label={t.email} value={email} onChange={setEmail} type="email" inputMode="email" autoComplete="email" invalid={!!email && !emailOk} />
          {email && !emailOk && <p className="-mt-1 text-[11px] font-bold text-red-500">{t.badEmail}</p>}
          {/* Geburtsdatum — Feldname bleibt links stehen (type=date hat eine Mindestbreite). */}
          <label className={`flex h-14 w-full items-center rounded-xl border px-4 transition-colors focus-within:border-black focus-within:bg-white ${birthdate ? "border-black bg-white" : "border-white/15 bg-white/[0.04]"}`}>
            <span className="mr-2 shrink-0 text-[11px] font-bold text-black/45">{t.birthdate}</span>
            <input value={birthdate} onChange={e => setBirthdate(e.target.value)} type="date" autoComplete="bday"
              className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-white outline-none" />
          </label>
          {/* Geschlecht — volle Breite. */}
          <select value={gender} onChange={e => setGender(e.target.value)} autoComplete="sex"
            className={`h-14 w-full rounded-xl border px-4 text-[15px] font-bold text-white outline-none transition-colors focus:border-black focus:bg-white ${gender ? "border-black bg-white" : "border-white/15 bg-white/[0.04]"}`}>
            <option value="" className="bg-[#0d0b0a]">{t.gender}</option>
            <option value="m" className="bg-[#0d0b0a]">{t.genderM}</option>
            <option value="f" className="bg-[#0d0b0a]">{t.genderF}</option>
            <option value="x" className="bg-[#0d0b0a]">{t.genderX}</option>
          </select>
          {/* Stadt + Land — Browser-Autofill über autoComplete. */}
          <LabeledInput label={t.city} value={city} onChange={setCity} autoComplete="address-level2" />
          <LabeledInput label={t.country} value={country} onChange={setCountry} autoComplete="country-name" />
          {/* WhatsApp — Länder-Vorwahl (Flagge + Code) + Nummer. */}
          <div className="flex gap-2">
            <select value={dial} onChange={e => setDial(e.target.value)} aria-label="Vorwahl"
              className="h-14 w-[118px] shrink-0 rounded-xl border border-black bg-white px-2 text-[14px] font-bold text-white outline-none transition-colors focus:border-black">
              {DIAL_OPTIONS.map(o => (
                <option key={o.code} value={o.dial} className="bg-[#0d0b0a]">{flagEmoji(o.code)} {o.code} {o.dial}</option>
              ))}
            </select>
            <div className="min-w-0 flex-1">
              <LabeledInput label={t.phone} value={phone} onChange={setPhone} type="tel" inputMode="tel" autoComplete="tel-national" />
            </div>
          </div>
          <button type="button" onClick={() => void create()} disabled={busy}
            className="mt-1 flex h-12 items-center justify-center gap-2 rounded-xl bg-black text-[15px] font-black text-white active:scale-95 transition disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {t.cta}
          </button>
        </div>
        {error && <p className="mt-2 text-[12px] font-bold text-red-300">{error}</p>}
        <p className="mt-2 text-center text-[11px] font-bold text-white/45">{t.note}</p>
      </div>
    </section>
  );
}
