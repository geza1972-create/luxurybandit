"use client";

import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { renewNote } from "@/lib/pricing";

/**
 * DER KAUFKNOPF — einmal gebaut, überall gleich.
 *
 * Vorher verkaufte keine Seite etwas: Freischalten ging nur, wenn man gegen eine Sperre
 * lief. Wer vorher kaufen WOLLTE, fand keinen Knopf (Owner 28.07.2026).
 *
 * PREIS (Owner 29.07.2026): Der 50-%-Gutschein steckt für JEDEN im Preis und gilt dauerhaft —
 * 24,50 € statt 49 €, Monat für Monat. Deshalb gibt es keine zwei Knopftexte mehr (einen mit
 * und einen ohne Aktionscode): jeder sieht denselben Preis, und es ist derselbe, den Stripe
 * abbucht. Der Kleingedruckte kommt aus lib/pricing, damit er nirgends auseinanderläuft.
 */

const T: Record<string, { h: string; p: string; cta: string }> = {
  en: { h: "Get everything", p: "5 videos a month across all topics. Chatting is free, always.", cta: "Unlock the hottest AI experience ever — €24.50/month" },
  de: { h: "Alles freischalten", p: "5 Videos im Monat über alle Themen. Chatten ist und bleibt gratis.", cta: "Die heißeste KI-Erfahrung freischalten — 24,50 €/Monat" },
  ro: { h: "Deblochează tot", p: "5 videoclipuri pe lună în toate temele. Chatul rămâne gratuit.", cta: "Deblochează cea mai fierbinte experiență AI — 24,50 €/lună" },
  es: { h: "Desbloquéalo todo", p: "5 vídeos al mes en todos los temas. Chatear es gratis, siempre.", cta: "Desbloquea la experiencia IA más ardiente — 24,50 €/mes" },
  fr: { h: "Tout débloquer", p: "5 vidéos par mois sur tous les thèmes. Le chat reste gratuit.", cta: "Débloque l'expérience IA la plus chaude — 24,50 €/mois" },
  pt: { h: "Desbloqueia tudo", p: "5 vídeos por mês em todos os temas. Conversar é sempre grátis.", cta: "Desbloqueia a experiência de IA mais quente — 24,50 €/mês" },
  pl: { h: "Odblokuj wszystko", p: "5 filmów miesięcznie we wszystkich tematach. Czat jest zawsze darmowy.", cta: "Odblokuj najgorętsze doświadczenie AI — 24,50 €/miesiąc" },
  it: { h: "Sblocca tutto", p: "5 video al mese in tutti i temi. Chattare è sempre gratis.", cta: "Sblocca l'esperienza AI più calda — 24,50 €/mese" },
};

export default function SubscribeCta({ code = "", lang = "en", topic = "chat" }: {
  code?: string; lang?: string; topic?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const t = T[lang] ?? T.en;

  const start = async () => {
    if (busy) return;
    setBusy(true); setError("");
    const endpoint =
      topic === "holiday" ? "/api/holiday-abo-checkout"
      : topic === "wetter" ? "/api/wetter-abo-checkout"
      : "/api/chat-abo-checkout";
    try {
      const d = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, returnTo: window.location.pathname + window.location.search }),
      }).then(r => r.json());
      if (!d?.url) { setError(d?.error || "Checkout could not start."); setBusy(false); return; }
      window.location.href = d.url;
    } catch {
      setError("Network error.");
      setBusy(false);
    }
  };

  return (
    <div className="mt-8 rounded-2xl border border-[#f6cf51]/40 bg-[#f6cf51]/[0.08] p-4 text-center">
      <p className="text-[17px] font-black text-white">{t.h}</p>
      <p className="mt-1 text-[14px] font-bold leading-snug text-white/85">{t.p}</p>
      <button type="button" onClick={() => void start()} disabled={busy}
        className="lb-gold lb-buy mt-3 flex w-full items-center justify-center gap-2 rounded-full font-black active:scale-95 transition disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        {t.cta}
      </button>
      {error && <p className="mt-2 text-[13px] font-bold text-white/80">{error}</p>}
      <p className="mt-2 text-[10px] font-medium leading-snug text-white/55">{renewNote(lang)}</p>
    </div>
  );
}
