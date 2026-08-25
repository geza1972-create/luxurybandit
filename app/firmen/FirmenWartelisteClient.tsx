"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Eingabe, Knopf, Fehlerzeile, Laden } from "@/components/CI";

/**
 * DAS WARTELISTE-FORMULAR DER FIRMEN-SEITE (Stufe 0 des Markt-Tests,
 * KONZEPT-BEWERBUNGSZENTRALE.md): E-Mail rein, fertig — kein Konto, kein Produkt dahinter.
 *
 * GESPEICHERT WIRD ÜBER /api/contact: Jede Eintragung landet als Mail beim Betreiber
 * (mit Absender-Adresse als Antwort-an) — für einen Test mit kleinen Zahlen ist das
 * Postfach die ehrlichste Datenbank: Er sieht jede Firma sofort, ohne neuen Speicher.
 * Das Ehrenfeld `company` fängt Bots ab (die Route wirft solche Einträge still weg).
 */

const TEXTE: Record<string, {
  platzhalter: string; knopf: string; danke: string; fehlerMail: string;
}> = {
  de: {
    platzhalter: "Deine Firmen-E-Mail",
    knopf: "Auf die Liste — kostenlos",
    danke: "Danke — du stehst auf der Liste. Wir melden uns, sobald es losgeht.",
    fehlerMail: "Bitte gib eine gültige E-Mail-Adresse an.",
  },
  en: {
    platzhalter: "Your company email",
    knopf: "Join the list — free",
    danke: "Thank you — you're on the list. We'll reach out as soon as it starts.",
    fehlerMail: "Please enter a valid email address.",
  },
};

export default function FirmenWartelisteClient({ lang = "en" }: { lang?: string }) {
  const t = TEXTE[lang] ?? TEXTE.en;
  const [mail, setMail] = useState("");
  const [falle, setFalle] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [fehler, setFehler] = useState("");

  const eintragen = async () => {
    if (busy) return;
    setFehler("");
    const m = mail.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m)) { setFehler(t.fehlerMail); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/contact", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Firmen-Warteliste",
          email: m,
          reason: "general",
          message: `Firma will passende Bewerbungen sehen — Warteliste /firmen.\nAdresse: ${m}`,
          company: falle,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) setOk(true);
      else setFehler(String(d?.error ?? t.fehlerMail));
    } catch { setFehler(t.fehlerMail); }
    setBusy(false);
  };

  if (ok) {
    return (
      <p className="mt-5 flex items-start gap-2 text-[14px] font-black leading-snug text-white/90">
        <Check className="mt-[1px] h-4 w-4 shrink-0 text-[#2f7d4f]" />{t.danke}
      </p>
    );
  }

  return (
    <div className="mt-5">
      <Eingabe type="email" value={mail} placeholder={t.platzhalter}
        onChange={e => setMail(e.target.value)} />
      {/* Ehrenfeld gegen Bots — unsichtbar, Menschen lassen es leer. */}
      <input type="text" value={falle} onChange={e => setFalle(e.target.value)}
        tabIndex={-1} autoComplete="off" aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", height: 0, width: 0, opacity: 0 }} />
      <Fehlerzeile>{fehler}</Fehlerzeile>
      <div className="mt-3">
        <Knopf art="gold" disabled={busy} onClick={() => void eintragen()}>
          {busy ? <Laden art="knopf" /> : t.knopf}
        </Knopf>
      </div>
    </div>
  );
}
