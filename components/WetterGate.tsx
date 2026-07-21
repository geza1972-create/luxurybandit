"use client";

import { useEffect, useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { DIAL_CODES, flagEmoji } from "@/lib/countries";
import { CornerOrnaments, DividerOrnament } from "@/components/BoxOrnaments";

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
  genderM: string; genderF: string; genderX: string; city: string; country: string; postal: string; phone: string;
  cta: string; note: string; fillAll: string; badEmail: string;
  sentTitle: string; sentBody: (e: string) => string;
  back: string; open: string;   // „schon angemeldet" + Link-Knopf
  tooYoung: string; mustAccept: string; consent: string; terms: string; and: string; privacy: string;
};
const T: Record<string, Copy> = {
  ro: {
    title: m => `Vrei ca ${m} să te trezească în fiecare dimineață?`,
    sub: "Un mesaj în fiecare dimineață — vremea ta, un look nou, și poți vorbi cu ea oricând.",
    name: "Prenumele tău", email: "Email", birthdate: "Data nașterii", gender: "Sexul",
    genderM: "Bărbat", genderF: "Femeie", genderX: "Altul", city: "Orașul tău (pentru vreme)", country: "Țara", postal: "Cod poștal (opțional)", phone: "Numărul tău (WhatsApp)",
    cta: "Creează cont gratis", note: "Fără parolă. Îți confirmi emailul o singură dată.",
    fillAll: "Te rog completează toate câmpurile.", badEmail: "Email invalid.",
    sentTitle: "Verifică-ți emailul 📧", sentBody: e => `Ți-am trimis un link de confirmare la ${e}. Confirmă și gata!`,
    back: "Ești deja înscris", open: "Spre mesajul tău de dimineață →",
    tooYoung: "Trebuie să ai cel puțin 18 ani.", mustAccept: "Te rog acceptă termenii.",
    consent: "Sunt de acord cu", terms: "Termenii", and: "și", privacy: "Confidențialitatea",
  },
  de: {
    title: m => `Soll ${m} dich jeden Morgen wecken?`,
    sub: "Eine Nachricht jeden Morgen — dein Wetter, ein neuer Look, und du kannst jederzeit mit ihr chatten.",
    name: "Dein Vorname", email: "E-Mail", birthdate: "Geburtsdatum", gender: "Geschlecht",
    genderM: "Männlich", genderF: "Weiblich", genderX: "Divers", city: "Deine Stadt (fürs Wetter)", country: "Land", postal: "Postleitzahl (optional)", phone: "Deine Nummer (WhatsApp)",
    cta: "Kostenlos anmelden", note: "Ohne Passwort. E-Mail einmal bestätigen.",
    fillAll: "Bitte alle Felder ausfüllen.", badEmail: "Ungültige E-Mail.",
    sentTitle: "Prüfe deine E-Mail 📧", sentBody: e => `Wir haben dir einen Bestätigungslink an ${e} geschickt. Bestätigen und los!`,
    back: "Du bist schon angemeldet", open: "Zu deiner Morgennachricht →",
    tooYoung: "Du musst mindestens 18 Jahre alt sein.", mustAccept: "Bitte akzeptiere die AGB.",
    consent: "Ich akzeptiere die", terms: "AGB", and: "und", privacy: "Datenschutz",
  },
  en: {
    title: m => `Want ${m} to wake you every morning?`,
    sub: "A message every morning — your weather, a new look, and you can chat with her anytime.",
    name: "Your first name", email: "Email", birthdate: "Date of birth", gender: "Gender",
    genderM: "Male", genderF: "Female", genderX: "Other", city: "Your city (for weather)", country: "Country", postal: "Postal code (optional)", phone: "Your number (WhatsApp)",
    cta: "Create free account", note: "No password. Confirm your email once.",
    fillAll: "Please fill in all fields.", badEmail: "Invalid email.",
    sentTitle: "Check your email 📧", sentBody: e => `We sent a confirmation link to ${e}. Confirm and you're in!`,
    back: "You're already signed up", open: "Go to your morning message →",
    tooYoung: "You must be at least 18.", mustAccept: "Please accept the terms.",
    consent: "I accept the", terms: "Terms", and: "and", privacy: "Privacy",
  },
};

// Alter aus dem Geburtsdatum (YYYY-MM-DD). NaN, wenn kein gültiges Datum.
function ageFrom(bd: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(bd);
  if (!m) return NaN;
  const y = +m[1], mo = +m[2], d = +m[3];
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < mo || (now.getMonth() + 1 === mo && now.getDate() < d)) age--;
  return age;
}


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
      <label className="pointer-events-none absolute left-4 top-2 text-[11px] font-bold text-white/50 transition-all
        peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[15px] peer-placeholder-shown:font-semibold peer-placeholder-shown:text-white/40
        peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[11px] peer-focus:font-bold peer-focus:text-white/50">
        {label}
      </label>
    </div>
  );
}

export default function WetterGate({ modelId, modelName = "Bella", lang = "ro", preview = false, trialDays = 7, monthlyCents = 999 }: {
  modelId: string; modelName?: string; lang?: string; preview?: boolean; trialDays?: number; monthlyCents?: number;
}) {
  const L = (lang || "ro").slice(0, 2).toLowerCase();
  const t = T[L] ?? T.ro;
  // Anmeldung ist KOMPLETT gratis (kein Abo, keine Karte). Ein Abo wird erst NACH der
  // Testphase per E-Mail angeboten — hier also NICHTS von „danach 9,99 €" (missverständlich).
  const trialLine = L === "de" ? "Kostenlos & unverbindlich — kein Abo, keine Karte."
    : L === "en" ? "Free & no commitment — no subscription, no card."
    : "Gratis, fără obligații — fără abonament, fără card.";

  const [checking, setChecking] = useState(true);   // prüft, ob das Gerät schon eingeloggt ist
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [postal, setPostal] = useState("");
  const [dial, setDial] = useState("+40");   // Länder-Vorwahl (Default RO)
  const [phone, setPhone] = useState("");
  const [accepted, setAccepted] = useState(false);   // AGB + Datenschutz akzeptiert
  const [triedSubmit, setTriedSubmit] = useState(false);   // nach fehlgeschlagenem Absenden → leere Pflichtfelder rot
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);   // Bestätigungs-Mail raus → „prüfe deine E-Mail"
  const [returningId, setReturningId] = useState("");   // Gerät ist schon angemeldet → Link statt Formular
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());   // gültiges E-Mail-Format?

  // Schon angemeldet auf diesem Gerät? → sichtbaren Link zur persönlichen Ansicht zeigen
  // (nicht still umleiten). Im Admin-Vorschau-Modus nichts davon.
  useEffect(() => {
    if (preview) { setChecking(false); return; }
    try {
      const id = localStorage.getItem(storeKey(modelId));
      if (id) setReturningId(id);
    } catch { /**/ }
    setChecking(false);
  }, [modelId, preview]);

  const create = async () => {
    setTriedSubmit(true);   // ab jetzt leere Pflichtfelder rot markieren
    if (!name.trim() || !email.trim() || !birthdate || !gender || !country.trim() || !city.trim() || !phone.trim()) { setError(t.fillAll); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setError(t.badEmail); return; }
    if (ageFrom(birthdate) < 18) { setError(t.tooYoung); return; }   // 18+-Sperre
    if (!accepted) { setError(t.mustAccept); return; }               // AGB/Datenschutz Pflicht
    setBusy(true); setError("");
    // Vorwahl + nationale Nummer → international (führende 0 der nationalen Nummer weg).
    const fullPhone = `${dial}${phone.replace(/[^\d]/g, "").replace(/^0+/, "")}`;
    try {
      const r = await fetch("/api/wetter-signup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId, name, email, birthdate, gender, country, city, postal, phone: fullPhone, lang: L, accepted: true }),
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

  // Gerät schon angemeldet → sichtbarer Link zur persönlichen Morgennachricht (kein Formular).
  if (returningId && !sent) return (
    <section className="lb-theme mx-auto mt-8 max-w-md px-5">
      <div className="rounded-2xl border border-black/10 bg-white p-6 text-center">
        <p className="text-[19px] font-black text-white">{t.back} ✓</p>
        <a href={`?s=${encodeURIComponent(returningId)}`}
          className="mt-4 flex h-12 items-center justify-center rounded-xl bg-white text-[15px] font-black text-black shadow-md active:scale-95 transition">
          {t.open}
        </a>
      </div>
    </section>
  );

  if (sent) return (
    <section className="lb-theme mx-auto mt-8 max-w-md px-5">
      <div className="rounded-2xl border border-black/10 bg-white p-6 text-center">
        <MailCheck className="mx-auto h-9 w-9 text-black" />
        <p className="mt-3 text-[19px] font-black text-white">{t.sentTitle}</p>
        <p className="mt-1.5 text-[14px] font-semibold leading-relaxed text-white/70">{t.sentBody(email.trim())}</p>
      </div>
    </section>
  );

  return (
    <section className="lb-theme mx-auto mt-8 max-w-md px-5">
      <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white px-7 pb-8 pt-12">
        {/* Jugendstil-Eckornamente — mit Abstand zum Rand, Inhalt hat genug Luft (px-7 / pt-12). */}
        <CornerOrnaments />
        <p className="text-center text-[20px] font-black leading-tight text-white">{t.title(modelName)}</p>
        <DividerOrnament className="mt-3" />
        <p className="mt-2 text-center text-[14px] font-semibold leading-relaxed text-white/65">{t.sub}</p>

        <div className="mt-4 grid grid-cols-1 gap-2">
          <LabeledInput label={t.name} value={name} onChange={setName} autoComplete="given-name" invalid={triedSubmit && !name.trim()} />
          <LabeledInput label={t.email} value={email} onChange={setEmail} type="email" inputMode="email" autoComplete="email" invalid={(!!email && !emailOk) || (triedSubmit && !email.trim())} />
          {email && !emailOk && <p className="-mt-1 text-[11px] font-bold text-red-500">{t.badEmail}</p>}
          {/* Geburtsdatum — Feldname bleibt links stehen (type=date hat eine Mindestbreite). */}
          <label className={`flex h-14 w-full items-center rounded-xl border px-4 transition-colors focus-within:border-black focus-within:bg-white ${birthdate ? "border-black bg-white" : triedSubmit ? "border-red-500 bg-white" : "border-white/15 bg-white/[0.04]"}`}>
            <span className="mr-2 shrink-0 text-[11px] font-bold text-white/50">{t.birthdate}</span>
            <input value={birthdate} onChange={e => setBirthdate(e.target.value)} type="date" autoComplete="bday"
              className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-white outline-none" />
          </label>
          {/* Geschlecht — volle Breite. */}
          <select value={gender} onChange={e => setGender(e.target.value)} autoComplete="sex"
            className={`h-14 w-full rounded-xl border px-4 text-[15px] font-bold text-white outline-none transition-colors focus:border-black focus:bg-white ${gender ? "border-black bg-white" : triedSubmit ? "border-red-500 bg-white" : "border-white/15 bg-white/[0.04]"}`}>
            <option value="" className="bg-[#0d0b0a]">{t.gender}</option>
            <option value="m" className="bg-[#0d0b0a]">{t.genderM}</option>
            <option value="f" className="bg-[#0d0b0a]">{t.genderF}</option>
            <option value="x" className="bg-[#0d0b0a]">{t.genderX}</option>
          </select>
          {/* Adresse — Reihenfolge Land → Stadt → PLZ (Browser-Autofill über autoComplete). */}
          <LabeledInput label={t.country} value={country} onChange={setCountry} autoComplete="country-name" invalid={triedSubmit && !country.trim()} />
          <LabeledInput label={t.city} value={city} onChange={setCity} autoComplete="address-level2" invalid={triedSubmit && !city.trim()} />
          <LabeledInput label={t.postal} value={postal} onChange={setPostal} autoComplete="postal-code" />
          {/* WhatsApp — Länder-Vorwahl (Flagge + Code) + Nummer. */}
          <div className="flex gap-2">
            <select value={dial} onChange={e => setDial(e.target.value)} aria-label="Vorwahl"
              className="h-14 w-[118px] shrink-0 rounded-xl border border-black bg-white px-2 text-[14px] font-bold text-white outline-none transition-colors focus:border-black">
              {DIAL_OPTIONS.map(o => (
                <option key={o.code} value={o.dial} className="bg-[#0d0b0a]">{flagEmoji(o.code)} {o.code} {o.dial}</option>
              ))}
            </select>
            <div className="min-w-0 flex-1">
              <LabeledInput label={t.phone} value={phone} onChange={setPhone} type="tel" inputMode="tel" autoComplete="tel-national" invalid={triedSubmit && !phone.trim()} />
            </div>
          </div>
          {/* AGB + Datenschutz — Pflicht-Häkchen mit Links. */}
          <label className="mt-1 flex cursor-pointer items-start gap-2.5 text-[12px] font-semibold text-white/70">
            <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-black" />
            <span>
              {t.consent}{" "}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-black text-white underline">{t.terms}</a>{" "}
              {t.and}{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-black text-white underline">{t.privacy}</a>.
            </span>
          </label>
          <button type="button" onClick={() => void create()} disabled={busy}
            className="lb-onmedia mt-1 flex h-12 items-center justify-center gap-2 rounded-xl bg-[#1a160f] text-[15px] font-black text-white shadow-md active:scale-95 transition disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {t.cta}
          </button>
        </div>
        {error && <p className="mt-2 text-[12px] font-bold text-red-300">{error}</p>}
        {/* Kleingedruckt: Testphase + Preis (dynamisch aus der Preisliste). */}
        <p className="mt-2 text-center text-[11px] font-bold text-white/55">{trialLine}</p>
        <p className="mt-0.5 text-center text-[11px] font-bold text-white/40">{t.note}</p>
      </div>
    </section>
  );
}
