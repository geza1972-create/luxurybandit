"use client";

import { useEffect, useState } from "react";

// The whole portal is 18+. This blocks EVERY page (it mounts in the root layout, above
// all content) until the visitor confirms they are 18 or older — a simple yes/no, no
// date of birth. Once confirmed we remember it in localStorage so it only appears once
// per device. Admins (who carry the try-look PIN) are never gated.
const OK_KEY = "lb_age_verified";
const ADMIN_KEYS = ["luxurybandit-try-look-admin-pin", "x-try-look-admin-pin"];
// Search/social/affiliate crawlers & reviewers must see the site open normally (e.g. the
// AliExpress affiliate reviewer rejected us for "site does not open properly"). They don't
// consume content — bypass the gate so the page renders for them. Real users still get it.
const BOT_RE = /bot|crawl|spider|slurp|mediapartners|facebookexternalhit|whatsapp|telegram|twitterbot|linkedinbot|applebot|preview|headless|phantom|scan|monitor|ahrefs|semrush|screaming|aliexpress|alibaba|yandex|baidu|petalbot/i;

// Übersetzt, weil die Wetter-Abonnenten EU-weit sitzen (RO/FR/IT/PL/ES/PT/DE) — eine
// englische Abfrage würde viele einfach abspringen lassen.
type GateCopy = { q: string; sub: string; yes: string; no: string; sorry: string; denied: string; back: string };
const GATE: Record<string, GateCopy> = {
  ro: { q: "Ai 18 ani sau mai mult?", sub: "LuxuryBandit este doar pentru adulți (18+). Confirmă vârsta ca să continui.", yes: "Da, am 18 ani sau mai mult", no: "Nu", sorry: "Ne pare rău", denied: "LuxuryBandit este doar pentru adulți (18+). Nu poți folosi acest site.", back: "Înapoi" },
  de: { q: "Bist du 18 Jahre oder älter?", sub: "LuxuryBandit ist nur für Erwachsene (18+). Bitte bestätige dein Alter, um fortzufahren.", yes: "Ja, ich bin 18 oder älter", no: "Nein", sorry: "Schade", denied: "LuxuryBandit ist nur für Erwachsene (18+). Du kannst diese Seite nicht nutzen.", back: "Zurück" },
  en: { q: "Are you 18 or older?", sub: "LuxuryBandit is for adults only (18+). Please confirm your age to continue.", yes: "Yes, I'm 18 or older", no: "No", sorry: "Sorry", denied: "LuxuryBandit is for adults only (18+). You can't use this site.", back: "Back" },
  es: { q: "¿Tienes 18 años o más?", sub: "LuxuryBandit es solo para adultos (18+). Confirma tu edad para continuar.", yes: "Sí, tengo 18 años o más", no: "No", sorry: "Lo sentimos", denied: "LuxuryBandit es solo para adultos (18+). No puedes usar este sitio.", back: "Volver" },
  fr: { q: "As-tu 18 ans ou plus ?", sub: "LuxuryBandit est réservé aux adultes (18+). Confirme ton âge pour continuer.", yes: "Oui, j'ai 18 ans ou plus", no: "Non", sorry: "Désolé", denied: "LuxuryBandit est réservé aux adultes (18+). Tu ne peux pas utiliser ce site.", back: "Retour" },
  pt: { q: "Tens 18 anos ou mais?", sub: "O LuxuryBandit é apenas para adultos (18+). Confirma a tua idade para continuar.", yes: "Sim, tenho 18 anos ou mais", no: "Não", sorry: "Lamentamos", denied: "O LuxuryBandit é apenas para adultos (18+). Não podes usar este site.", back: "Voltar" },
  pl: { q: "Czy masz 18 lat lub więcej?", sub: "LuxuryBandit jest tylko dla dorosłych (18+). Potwierdź swój wiek, aby kontynuować.", yes: "Tak, mam 18 lat lub więcej", no: "Nie", sorry: "Przykro nam", denied: "LuxuryBandit jest tylko dla dorosłych (18+). Nie możesz korzystać z tej strony.", back: "Wróć" },
  it: { q: "Hai 18 anni o più?", sub: "LuxuryBandit è solo per adulti (18+). Conferma la tua età per continuare.", yes: "Sì, ho 18 anni o più", no: "No", sorry: "Ci dispiace", denied: "LuxuryBandit è solo per adulti (18+). Non puoi usare questo sito.", back: "Indietro" },
};

export default function AgeGate({ lang = "en" }: { lang?: string }) {
  const t = GATE[lang] ?? GATE.en;
  // Render nothing until mounted so we never hydrate a mismatched overlay.
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    setReady(true);
    try {
      if (typeof navigator !== "undefined" && BOT_RE.test(navigator.userAgent)) return; // crawlers/reviewers bypass
    } catch { /**/ }
    try {
      if (localStorage.getItem(OK_KEY) === "1") return;
      if (ADMIN_KEYS.some((k) => localStorage.getItem(k))) return; // admins bypass
    } catch { /* localStorage blocked → still gate */ }
    setOpen(true);
  }, []);

  if (!ready || !open) return null;

  const confirm = () => {
    try { localStorage.setItem(OK_KEY, "1"); } catch { /* ignore */ }
    try { window.dispatchEvent(new Event("lb-age-ok")); } catch { /**/ } // let the cookie banner appear now
    setOpen(false);
  };

  return (
    <div className="lb-phone-col fixed inset-0 z-[120] flex items-end justify-center bg-black/70 backdrop-blur-md">
      <div className="relative w-full rounded-t-3xl bg-white p-6 shadow-2xl" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.75rem)" }}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-black/15" />
        <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-black px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-white">18+</div>
        {denied ? (
          <>
            <p className="mt-2 text-xl font-black leading-tight text-black">{t.sorry}</p>
            <p className="mt-1.5 text-[13px] font-bold leading-relaxed text-black/55">
              {t.denied}
            </p>
            <button
              type="button"
              onClick={() => setDenied(false)}
              className="mt-4 flex h-12 w-full items-center justify-center rounded-full border border-black/15 text-sm font-black text-black/60 transition-transform active:scale-95"
            >
              {t.back}
            </button>
          </>
        ) : (
          <>
            <p className="mt-2 text-xl font-black leading-tight text-black">{t.q}</p>
            <p className="mt-1.5 text-[13px] font-bold leading-relaxed text-black/55">
              {t.sub}
            </p>
            <button
              type="button"
              onClick={confirm}
              className="mt-4 flex h-12 w-full items-center justify-center rounded-full bg-black text-sm font-black text-white transition-transform active:scale-95"
            >
              {t.yes}
            </button>
            <button
              type="button"
              onClick={() => setDenied(true)}
              className="mt-2 flex h-12 w-full items-center justify-center rounded-full text-sm font-black text-black/45 transition-transform active:scale-95"
            >
              {t.no}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
