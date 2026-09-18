"use client";

import { useEffect, useState } from "react";
import { ShoppingBag, X } from "lucide-react";
import { korbLesen, korbWeg, korbLeeren, type KorbPosten } from "@/lib/lakatosbandi-korb";
import { druckPreisCents, druckVersandCents } from "@/lib/lakatosbandi-druck";
import { eur } from "@/lib/pricing";

/**
 * DER KORB — ZÄHLER UNTEN RECHTS, LISTE IM FENSTER (Owner 15.09.2026: „wir haben kein warenkorb").
 *
 * ── ER ZEIGT SICH NUR, WENN ETWAS DRIN IST ──────────────────────────────────────────────────
 *
 * Ein leerer Korb, der ständig am Bildschirmrand klebt, ist Dekoration. Erst mit dem ersten
 * Posten erscheint er — dann aber auf jeder Seite, damit niemand ihn sucht.
 *
 * ── DER VERSAND STEHT DABEI, BEVOR ES ZUR KASSE GEHT ────────────────────────────────────────
 *
 * Skill `bezahlung`, Regel 8: Der Handel steht VOR der Arbeit. Fünf Euro, die erst bei Stripe
 * auftauchen, sind der Grund, aus dem Leute im letzten Schritt abspringen.
 */
export default function Korb({ sprache, texte }: {
  sprache: string;
  texte: {
    titel: string; versand: string; summe: string;
    kasse: string; weg: string; leeren: string; fehler: string;
    /* Beschriftung je Material — im Korb steht sonst der Schlüssel („poster · A3"). */
    material: Record<string, string>;
  };
}) {
  const [posten, setPosten] = useState<KorbPosten[]>([]);
  const [offen, setOffen] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState(false);

  /* Erst nach dem ersten Rendern lesen: `localStorage` gibt es auf dem Server nicht, und ein
     Korb, der beim Server-Rendern schon Inhalt hätte, würde beim Einblenden springen. */
  useEffect(() => {
    const lesen = () => setPosten(korbLesen());
    lesen();
    window.addEventListener("lb-korb", lesen);
    window.addEventListener("storage", lesen);
    return () => { window.removeEventListener("lb-korb", lesen); window.removeEventListener("storage", lesen); };
  }, []);

  if (!posten.length) return null;

  const preise = posten.map(p => druckPreisCents(p.material, p.groesse, p.anteil === true) ?? 0);
  const waren = preise.reduce((a, b) => a + b, 0);
  /* Dieselbe Rechnung wie die Kasse (Skill `bezahlung`, Regel 2) — 5 € für das erste Stück,
     2 € für jedes weitere; Dateien zählen nicht mit. */
  const versand = druckVersandCents(posten.map(p => p.material));
  const summe = waren + versand;

  const zurKasse = async () => {
    if (laeuft) return;
    setLaeuft(true); setFehler(false);
    try {
      const res = await fetch("/api/druck-kasse", {
        method: "POST", headers: { "Content-Type": "application/json" },
        /* Aus dem Korb zurück an die Stelle, an der er den Korb geöffnet hat — sonst an das
           erste Werk darin (Owner 18.09.2026). */
        body: JSON.stringify({ artikel: posten, sprache, zurueck: (() => {
          /* Aus dem Korb zurück an das erste Werk darin (Owner 18.09.2026). */
          const u = new URL(window.location.href);
          if (posten[0]) u.searchParams.set("zu", `w-${posten[0].werk}`);
          return u.pathname + u.search;
        })() }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; url?: string };
      if (!d.ok || !d.url) { setFehler(true); setLaeuft(false); return; }
      window.location.href = d.url;
    } catch { setFehler(true); setLaeuft(false); }
  };

  return (
    <>
      <button type="button" onClick={() => setOffen(true)}
        className="fixed bottom-5 left-5 z-[70] grid h-14 w-14 place-items-center rounded-full bg-[#111] text-white shadow-[0_8px_26px_rgba(0,0,0,.28)] transition hover:bg-[#333]"
        aria-label={texte.titel}>
        <ShoppingBag className="h-5 w-5" aria-hidden />
        <span className="absolute -right-1 -top-1 grid h-6 min-w-[24px] place-items-center rounded-full bg-white px-1 text-[12px] font-black text-[#111]">
          {posten.length}
        </span>
      </button>

      {offen && (
        <div role="dialog" aria-modal="true" aria-label={texte.titel}
          onClick={() => setOffen(false)}
          className="fixed inset-0 z-[75] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
          <div onClick={e => e.stopPropagation()}
            className="w-full max-w-[460px] rounded-t-2xl bg-white p-5 sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <p className="m-0 text-[17px] font-bold text-[#111]">{texte.titel}</p>
              <button type="button" onClick={() => setOffen(false)} aria-label={texte.weg}
                className="grid h-9 w-9 place-items-center rounded-full text-[#555] hover:bg-[#f2f2f2]">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <ul className="m-0 mt-4 list-none space-y-3 p-0">
              {posten.map((p, i) => (
                <li key={`${p.mandant}-${p.werk}-${p.material}-${p.groesse}`} className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/portal-werk?m=${encodeURIComponent(p.mandant)}&i=${p.werk === "standard" ? -1 : p.werk}`}
                    alt="" className="h-14 w-14 shrink-0 border border-[#111] object-cover" />
                  <span className="min-w-0 flex-1 text-[14px] leading-[1.35] text-[#111]">
                    <span className="block truncate font-semibold">{texte.material[p.material] ?? p.material} · {p.groesse}</span>
                    <span className="block text-[13px] text-[#777]">{eur(preise[i], sprache)}</span>
                  </span>
                  <button type="button" onClick={() => setPosten(korbWeg(p))} aria-label={texte.weg}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#999] hover:bg-[#f2f2f2] hover:text-[#111]">
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>

            <p className="m-0 mt-4 flex items-center justify-between border-t border-[#eee] pt-3 text-[14px] text-[#555]">
              <span>{texte.versand}</span><span>{eur(versand, sprache)}</span>
            </p>
            <p className="m-0 mt-1 flex items-center justify-between text-[17px] font-black text-[#111]">
              <span>{texte.summe}</span><span>{eur(summe, sprache)}</span>
            </p>

            <button type="button" onClick={() => void zurKasse()} disabled={laeuft}
              className="mt-4 w-full rounded-xl bg-[#111] px-5 py-3.5 text-[15px] font-semibold text-white transition hover:bg-[#333] disabled:opacity-40">
              {laeuft ? "…" : texte.kasse}
            </button>
            {fehler && <p className="m-0 mt-2 text-center text-[13.5px] font-semibold text-[#b3261e]">{texte.fehler}</p>}
            <button type="button" onClick={() => { korbLeeren(); setPosten([]); }}
              className="mt-2 w-full text-[13px] text-[#999] underline">
              {texte.leeren}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
