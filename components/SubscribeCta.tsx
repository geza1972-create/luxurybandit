"use client";

import { useState } from "react";
import { Loader2, Lock } from "lucide-react";

/**
 * DER KAUFKNOPF — einmal gebaut, überall gleich.
 *
 * Vorher verkaufte keine Seite etwas: Freischalten ging nur, wenn man gegen eine Sperre
 * lief. Wer vorher kaufen WOLLTE, fand keinen Knopf (Owner 28.07.2026).
 *
 * Der Aktionscode aus der Anzeige wird durchgereicht — wer mit Code kommt, sieht 19 € und
 * zahlt auch 19 €. Ohne Code gilt der normale Preis.
 */

const T: Record<string, { h: string; p: string; cta: string; ctaCode: string; note: string }> = {
  en: { h: "Get everything", p: "25 videos a month across all topics. Chatting is free, always.", cta: "Unlock the hottest AI experience ever — €49/month", ctaCode: "Unlock the hottest AI experience ever — €19", note: "Cancel any time in your account." },
  de: { h: "Alles freischalten", p: "25 Videos im Monat über alle Themen. Chatten ist und bleibt gratis.", cta: "Die heißeste KI-Erfahrung freischalten — 49 €/Monat", ctaCode: "Die heißeste KI-Erfahrung freischalten — 19 €", note: "Jederzeit im Konto kündbar." },
  ro: { h: "Deblochează tot", p: "25 de videoclipuri pe lună în toate temele. Chatul rămâne gratuit.", cta: "Deblochează cea mai fierbinte experiență AI — 49 €/lună", ctaCode: "Deblochează cea mai fierbinte experiență AI — 19 €", note: "Poți renunța oricând din contul tău." },
  es: { h: "Desbloquéalo todo", p: "25 vídeos al mes en todos los temas. Chatear es gratis, siempre.", cta: "Desbloquea la experiencia IA más ardiente — 49 €/mes", ctaCode: "Desbloquea la experiencia IA más ardiente — 19 €", note: "Cancela cuando quieras en tu cuenta." },
  fr: { h: "Tout débloquer", p: "25 vidéos par mois sur tous les thèmes. Le chat reste gratuit.", cta: "Débloque l'expérience IA la plus chaude — 49 €/mois", ctaCode: "Débloque l'expérience IA la plus chaude — 19 €", note: "Résiliable à tout moment dans ton compte." },
  pt: { h: "Desbloqueia tudo", p: "25 vídeos por mês em todos os temas. Conversar é sempre grátis.", cta: "Desbloqueia a experiência de IA mais quente — 49 €/mês", ctaCode: "Desbloqueia a experiência de IA mais quente — 19 €", note: "Cancela quando quiseres na tua conta." },
  pl: { h: "Odblokuj wszystko", p: "25 filmów miesięcznie we wszystkich tematach. Czat jest zawsze darmowy.", cta: "Odblokuj najgorętsze doświadczenie AI — 49 €/miesiąc", ctaCode: "Odblokuj najgorętsze doświadczenie AI — 19 €", note: "Możesz zrezygnować w każdej chwili." },
  it: { h: "Sblocca tutto", p: "25 video al mese in tutti i temi. Chattare è sempre gratis.", cta: "Sblocca l'esperienza AI più calda — 49 €/mese", ctaCode: "Sblocca l'esperienza AI più calda — 19 €", note: "Disdici quando vuoi dal tuo account." },
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
        className="lb-gold mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-black active:scale-95 transition disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        {code ? t.ctaCode : t.cta}
      </button>
      {error && <p className="mt-2 text-[13px] font-bold text-white/80">{error}</p>}
      <p className="mt-2 text-[12px] font-bold text-white/70">{t.note}</p>
    </div>
  );
}
