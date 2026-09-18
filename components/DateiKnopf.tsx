"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { druckPreisCents } from "@/lib/lakatosbandi-druck";
import { eur } from "@/lib/pricing";

/**
 * DAS POSTER ALS DATEI (Owner 16.09.2026: „als datei zu herunterladen 5 euro" · „15 für lebende"
 * · „das ist die datei die auch an den printshop geht dann").
 *
 * ── EINE ZEILE, KEIN ZWEITER LADEN ──────────────────────────────────────────────────────────
 *
 * Der Kaufknopf darüber hat schon zwei Auswahlfelder. Ein zweiter Block mit eigener Grösse und
 * eigenem Korb daneben würde die Kachel zu einem Formular machen. Die Datei hat nur eine
 * Fassung — also reicht eine Zeile mit Preis, die direkt zur Kasse führt.
 *
 * WAS SIE IST, STEHT DABEI: dieselbe druckfertige Datei, die unsere Druckerei bekommt. Ohne
 * diesen Satz kauft jemand fünf Euro und erwartet ein Foto fürs Handy.
 *
 * DER ANGEZEIGTE BETRAG IST NUR DAS SCHILD — verbindlich rechnet `api/druck-kasse` (Skill
 * `bezahlung`, Regel 3).
 */
export default function DateiKnopf({ mandant, werk, sprache, anteil = false, adminS = "", texte }: {
  mandant: string;
  werk: string;
  sprache: string;
  /** Beim lebenden Künstler liegt seine Lizenz oben drauf — 5 € werden zu 15 €. */
  anteil?: boolean;
  adminS?: string;
  texte: { kaufen: string; erklaerung: string; fehler: string;
    ohneRahmen: string; mitRahmen: string; rahmenSchwarz: string };
}) {
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState(false);
  /* Dieselbe Wahl wie beim Poster — die Datei trägt den Rahmen, den er sieht. */
  const [fassung, setFassung] = useState("neagra");
  const cents = druckPreisCents("fisier", fassung, anteil);
  if (cents === null) return null;

  const kaufen = async () => {
    if (laeuft) return;
    setLaeuft(true); setFehler(false);
    try {
      const res = await fetch("/api/druck-kasse", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mandant, werk, material: "fisier", groesse: fassung, sprache, ...(adminS ? { s: adminS } : {}) }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; url?: string };
      if (!d.ok || !d.url) { setFehler(true); setLaeuft(false); return; }
      window.location.href = d.url;
    } catch { setFehler(true); setLaeuft(false); }
  };

  return (
    <div className="mt-2.5 text-center">
      <select value={fassung} onChange={e => setFassung(e.target.value)}
        aria-label={texte.rahmenSchwarz}
        className="mr-2 rounded-xl border border-[#d8d3c6] bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-[#111]">
        <option value="neagra">{texte.rahmenSchwarz}</option>
        <option value="holz">{texte.mitRahmen}</option>
        <option value="fara">{texte.ohneRahmen}</option>
      </select>
      <button type="button" onClick={() => void kaufen()} disabled={laeuft}
        className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#111] underline underline-offset-4 disabled:opacity-40">
        <Download className="h-4 w-4" aria-hidden />
        {laeuft ? "…" : `${texte.kaufen} · ${eur(cents, sprache)}`}
      </button>
      <p className="m-0 mx-auto mt-1 max-w-[42ch] text-[13px] leading-[1.5] text-[#8a8375]">{texte.erklaerung}</p>
      {fehler && <p className="m-0 mt-1 text-[13px] font-semibold text-[#b3261e]">{texte.fehler}</p>}
    </div>
  );
}
