"use client";

import { useRef, useState } from "react";
import { ImagePlus, Sparkles, X } from "lucide-react";
import KasseImFenster, { kasseImFensterMoeglich } from "@/components/KasseImFenster";
import { eur } from "@/lib/pricing";
import { KUNST_CENTS } from "@/lib/lakatosbandi-druck";

/**
 * ── SEIN FOTO IN EINEM STIL (Owner 19.09.2026) ───────────────────────────────────────────────
 *
 * Ein Bild, ein Stil, ein Ergebnis. Bewusst kein Trichter mit Stationen: Hier gibt es nichts zu
 * erklären — man sieht das Foto, man sieht die Stile, man drückt.
 *
 * ── DAS FOTO BLEIBT IM BROWSER ──────────────────────────────────────────────────────────────
 *
 * Es geht an die Route und wird dort nicht abgelegt. Wer die Seite verlässt, hat es mitgenommen
 * — dieselbe Regel wie beim Poster („wenn er rausgeht von der seite, dann ist das bild weg").
 *
 * ── DIE KASSE IN DER SEITE ──────────────────────────────────────────────────────────────────
 *
 * Bei `402` öffnet sich Stripe MITTEN in der Seite, nicht in einem zweiten Fenster: Sein Foto
 * überlebt keinen Seitenwechsel ([[kasse-in-der-seite]]).
 */
const STILE = [
  { id: "karikatur", name: "Karikatur" },
  { id: "vintage", name: "Vintage-Illustration" },
  { id: "comic", name: "Comic" },
  { id: "bleistift", name: "Bleistift" },
  { id: "oel", name: "Ölgemälde" },
] as const;

const MAX = 20 * 1024 * 1024;

export default function KarikaturClient() {
  const [foto, setFoto] = useState<string | null>(null);
  const [fertig, setFertig] = useState<string | null>(null);
  const [stil, setStil] = useState<string>("karikatur");
  const [laeuft, setLaeuft] = useState(false);
  const [absage, setAbsage] = useState("");
  const [kasse, setKasse] = useState<string | null>(null);
  const feld = useRef<HTMLInputElement>(null);

  /* Dieselbe Kennung wie im Rest des Hauses — daran hängt das Guthaben. */
  const geraet = () => {
    try {
      let g = localStorage.getItem("lb_visitor") ?? "";
      if (!g) { g = crypto.randomUUID().replace(/-/g, ""); localStorage.setItem("lb_visitor", g); }
      return g;
    } catch { return ""; }
  };

  async function kasseOeffnen() {
    try {
      const r = await fetch("/api/kunst-kasse", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mandant: "lakatosbandi", werk: "standard", geraet: geraet(), sprache: "ro" }),
      });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; clientSecret?: string };
      if (d.ok && d.clientSecret && kasseImFensterMoeglich()) setKasse(d.clientSecret);
      else setAbsage("Payment is unavailable right now.");
    } catch { setAbsage("Payment is unavailable right now."); }
  }

  /* Nach der Zahlung von selbst weitermachen ([[aufladen-setzt-den-kauf-fort]]). */
  async function aufGuthabenWarten() {
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const r = await fetch(`/api/kunst-guthaben?geraet=${encodeURIComponent(geraet())}`);
        const d = (await r.json().catch(() => ({}))) as { offen?: number };
        if ((d.offen ?? 0) > 0) { void erzeugen(); return; }
      } catch { /* weiterfragen */ }
    }
    setLaeuft(false);
    setAbsage("Payment received — press the button again.");
  }

  async function erzeugen() {
    if (!foto || laeuft) return;
    setLaeuft(true); setAbsage("");
    try {
      const r = await fetch("/api/karikatur", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foto, stil, geraet: geraet() }),
      });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; bild?: string; fehler?: string };
      if (r.status === 402) { await kasseOeffnen(); return; }
      if (r.status === 503) { setAbsage("Momentan nicht verfügbar."); return; }
      if (d.ok && d.bild) setFertig(d.bild);
      else setAbsage(d.fehler === "abgelehnt" ? "Dieses Foto geht nicht." : "Hat nicht geklappt — noch einmal versuchen.");
    } catch { setAbsage("Hat nicht geklappt — noch einmal versuchen."); }
    finally { setLaeuft(false); }
  }

  return (
    <>
      {kasse ? (
        <KasseImFenster key={kasse} clientSecret={kasse} titel={eur(KUNST_CENTS, "de")}
          onSchliessen={() => { setKasse(null); setLaeuft(true); void aufGuthabenWarten(); }} />
      ) : null}

      {!foto ? (
        <button type="button" onClick={() => feld.current?.click()}
          className="mt-8 inline-flex items-center gap-2 bg-[#111] px-7 py-4 text-[16px] font-semibold text-white transition hover:bg-[#333]">
          <ImagePlus className="h-[18px] w-[18px]" aria-hidden />
          Foto wählen
        </button>
      ) : (
        <>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <span className="relative block bg-[#f5f5f5]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={foto} alt="" className="block w-full object-contain" style={{ maxHeight: 460 }} />
              <button type="button" aria-label="Weg" onClick={() => { setFoto(null); setFertig(null); }}
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/95 text-[#111] shadow">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </span>
            <span className="block bg-[#f5f5f5]">
              {fertig ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={fertig} alt="" className="block w-full object-contain" style={{ maxHeight: 460 }} />
              ) : (
                <span className="grid h-full min-h-[240px] place-items-center px-6 text-center text-[15px] text-[#888]">
                  {laeuft ? "Wird gezeichnet…" : "Hier erscheint dein Bild"}
                </span>
              )}
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {STILE.map(s => (
              <button key={s.id} type="button" onClick={() => setStil(s.id)} aria-pressed={stil === s.id}
                className={`rounded-full border px-4 py-2 text-[14px] font-semibold transition ${
                  stil === s.id ? "border-[#111] bg-[#111] text-white" : "border-[#dfe4e9] text-[#555] hover:border-[#111]"}`}>
                {s.name}
              </button>
            ))}
          </div>

          <button type="button" disabled={laeuft} onClick={() => void erzeugen()}
            className="mt-5 inline-flex items-center gap-2 bg-[#111] px-7 py-4 text-[16px] font-semibold text-white transition hover:bg-[#333] disabled:opacity-40">
            <Sparkles className="h-[18px] w-[18px]" aria-hidden />
            {laeuft ? "…" : `Zeichnen — ${eur(KUNST_CENTS, "de")}`}
          </button>
          {absage ? <p className="m-0 mt-3 text-[14px] font-bold text-[#b3261e]">{absage}</p> : null}
        </>
      )}

      <input ref={feld} type="file" accept="image/jpeg,image/png,image/webp" hidden
        onChange={e => {
          const d = e.target.files?.[0];
          e.target.value = "";
          if (!d) return;
          if (d.size > MAX) { setAbsage("Höchstens 20 MB."); return; }
          const leser = new FileReader();
          leser.onload = () => { setFoto(String(leser.result ?? "")); setFertig(null); setAbsage(""); };
          leser.readAsDataURL(d);
        }} />
    </>
  );
}
