"use client";

import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { renewNote, fillPrices } from "@/lib/pricing";

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
  en: { h: "Get everything", p: "Videos with her — and you in them. Chatting is and stays free.", cta: "Unlock the hottest AI experience ever — {price}/month" },
  de: { h: "Alles freischalten", p: "Videos mit ihr — und du mit im Bild. Chatten ist und bleibt gratis.", cta: "Die heißeste KI-Erfahrung freischalten — {price}/Monat" },
  ro: { h: "Deblochează tot", p: "Videoclipuri cu ea — și cu tine în ele. Chatul este și rămâne gratuit.", cta: "Deblochează cea mai fierbinte experiență AI — {price}/lună" },
  es: { h: "Desbloquéalo todo", p: "Vídeos con ella — y tú en ellos. Chatear es y sigue siendo gratis.", cta: "Desbloquea la experiencia IA más ardiente — {price}/mes" },
  fr: { h: "Tout débloquer", p: "Des vidéos avec elle — et toi dedans. Le chat est et reste gratuit.", cta: "Débloque l'expérience IA la plus chaude — {price}/mois" },
  pt: { h: "Desbloqueia tudo", p: "Vídeos com ela — e tu neles. Conversar é e continua grátis.", cta: "Desbloqueia a experiência de IA mais quente — {price}/mês" },
  pl: { h: "Odblokuj wszystko", p: "Filmy z nią — i z tobą w kadrze. Czat jest i pozostaje darmowy.", cta: "Odblokuj najgorętsze doświadczenie AI — {price}/miesiąc" },
  it: { h: "Sblocca tutto", p: "Video con lei — e tu dentro. Chattare è e resta gratis.", cta: "Sblocca l'esperienza AI più calda — {price}/mese" },
};

export default function SubscribeCta({ code = "", lang = "en", topic = "chat", titel, text, cta, hell }: {
  code?: string; lang?: string; topic?: string;
  /**
   * EIGENER WORTLAUT JE THEMA (Owner 31.07.2026, fuer die Hochzeit).
   *
   * „Die heisseste KI-Erfahrung freischalten" ist auf einer Hochzeitsseite nicht nur daneben,
   * es beschaedigt den Anlass. Der Knopf, die Kasse und der Preis bleiben ueberall dieselben —
   * nur die drei Zeilen daran duerfen zum Thema passen. Preis-Platzhalter funktionieren auch
   * hier, weil alles durch `fillPrices` geht.
   */
  titel?: string; text?: string; cta?: string;
  /**
   * HELLE FASSUNG (Owner 31.07.2026: „das ist sehr anstrengend zum Lesen. Weiss auf blau").
   *
   * Der goldene Kasten wird in der Hell-Fassung blau — und ein blauer Knopf auf blauem Grund
   * verschwindet fast. Auf weissem Grund traegt sich der Knopf selbst, und drei Zeilen dunkle
   * Schrift liest man in einem Drittel der Zeit.
   */
  hell?: boolean;
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
    <div className={`mt-8 rounded-2xl p-4 text-center ${hell ? "" : "border border-[#f6cf51]/40 bg-[#f6cf51]/[0.08]"}`}
      style={hell ? { background: "#fff", color: "#1a160f" } : undefined}>
      <p className={`text-[17px] font-black ${hell ? "" : "text-white"}`}>{titel || t.h}</p>
      <p className={`mt-1 text-[14px] font-bold leading-snug ${hell ? "" : "text-white/85"}`}
        style={hell ? { color: "#2a2620" } : undefined}>{fillPrices(text || t.p, lang)}</p>
      <button type="button" onClick={() => void start()} disabled={busy}
        className="lb-gold lb-buy mt-3 flex w-full items-center justify-center gap-2 rounded-full font-black active:scale-95 transition disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        {fillPrices(cta || t.cta, lang)}
      </button>
      {error && <p className={`mt-2 text-[13px] font-bold ${hell ? "" : "text-white/80"}`}>{error}</p>}
      <p className={`mt-2 text-[10px] font-medium leading-snug ${hell ? "" : "text-white/55"}`}
        style={hell ? { color: "rgba(42,38,32,0.6)" } : undefined}>{renewNote(lang)}</p>
    </div>
  );
}
