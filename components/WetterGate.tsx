"use client";

import { useEffect, useState } from "react";
import { Loader2, Sun } from "lucide-react";

// „Account" für Wetter am Morgen — ganz ohne Passwort:
//  • Kennt das Gerät schon eine Kennung (localStorage) → automatisch einloggen (?s=… laden).
//  • Sonst: kurze Anmeldung (Name + Stadt) → legt einen Account an, merkt sich die Kennung
//    auf dem Gerät → ab jetzt erkennt die Seite ihn ohne Link.
// Die Telefonnummer steht NIE in der URL; die Kennung ist unsichtbar und nicht fälschbar.

const storeKey = (modelId: string) => `lb_wetter_sub_${modelId}`;

const T: Record<string, { title: (m: string) => string; sub: string; name: string; city: string; cta: string; note: string }> = {
  ro: {
    title: m => `Vrei ca ${m} să te trezească în fiecare dimineață? ☀️`,
    sub: "Un mesaj în fiecare dimineață — vremea de la tine și un gând bun. Îți faci contul în 10 secunde.",
    name: "Numele tău", city: "Orașul tău (pentru vreme)", cta: "Creează cont", note: "Fără parolă. Te recunoaște pe telefonul tău.",
  },
  de: {
    title: m => `Soll ${m} dich jeden Morgen wecken? ☀️`,
    sub: "Eine Nachricht jeden Morgen — dein Wetter und ein guter Gedanke. Account in 10 Sekunden.",
    name: "Dein Name", city: "Deine Stadt (fürs Wetter)", cta: "Account erstellen", note: "Ohne Passwort. Erkennt dich auf deinem Handy.",
  },
  en: {
    title: m => `Want ${m} to wake you every morning? ☀️`,
    sub: "One message every morning — your weather and a good thought. Account in 10 seconds.",
    name: "Your name", city: "Your city (for weather)", cta: "Create account", note: "No password. Recognises you on your phone.",
  },
};

export default function WetterGate({ modelId, modelName = "Bella", lang = "ro" }: { modelId: string; modelName?: string; lang?: string }) {
  const L = (lang || "ro").slice(0, 2).toLowerCase();
  const t = T[L] ?? T.ro;

  const [checking, setChecking] = useState(true);   // prüft, ob das Gerät schon eingeloggt ist
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Schon eingeloggt auf diesem Gerät? → direkt zur persönlichen Ansicht.
  useEffect(() => {
    try {
      const id = localStorage.getItem(storeKey(modelId));
      if (id) { window.location.replace(`?s=${encodeURIComponent(id)}`); return; }
    } catch { /**/ }
    setChecking(false);
  }, [modelId]);

  const create = async () => {
    if (!name.trim()) { setError(t.name); return; }
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/wetter-signup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId, name, city, lang: L }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.id) { setError(d?.error ?? "…"); return; }
      try { localStorage.setItem(storeKey(modelId), d.id); } catch { /**/ }
      window.location.replace(`?s=${encodeURIComponent(d.id)}`);
    } catch { setError("…"); }
    finally { setBusy(false); }
  };

  if (checking) return (
    <div className="mx-auto flex max-w-md items-center justify-center px-5 py-10 text-white/50">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );

  return (
    <section className="mx-auto mt-8 max-w-md px-5">
      <div className="rounded-2xl border border-[#c9a23f]/30 bg-[#c9a23f]/[0.06] p-5">
        <p className="flex items-center gap-2 text-[20px] font-black leading-tight text-white">
          <Sun className="h-5 w-5 shrink-0 text-[#c9a23f]" /> {t.title(modelName)}
        </p>
        <p className="mt-1.5 text-[14px] font-semibold leading-relaxed text-white/65">{t.sub}</p>

        <div className="mt-4 grid gap-2">
          <input value={name} onChange={e => setName(e.target.value)} placeholder={t.name}
            className="h-12 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 text-[15px] font-semibold text-white outline-none placeholder:text-white/40 focus:border-[#c9a23f]" />
          <input value={city} onChange={e => setCity(e.target.value)} placeholder={t.city}
            className="h-12 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 text-[15px] font-semibold text-white outline-none placeholder:text-white/40 focus:border-[#c9a23f]" />
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
