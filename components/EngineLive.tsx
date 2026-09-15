"use client";

import { useEffect, useState } from "react";

/**
 * DIE LIVE-ANSICHT OBEN AUF DER GESPRÄCHSSEITE (Owner 14.09.2026: „live dashboard … wo ich sehe
 * jemand öffnet den tunel").
 *
 * Sie fragt `api/engine-live` alle paar Sekunden und zeigt, wer gerade da ist und wie weit er
 * gekommen ist. Kein Verlauf — je Besucher steht in der Ablage nur der weiteste Stand
 * (Begründung in der Route).
 *
 * SIE HÄLT NIE DIE SEITE AUF: Scheitert ein Abruf, bleibt der letzte Stand stehen und es wird
 * beim nächsten Mal wieder versucht. Eine rote Fehlerzeile für eine Statistik wäre hier falsch.
 */

type Besucher = { kennung: string; stufe: string; weit: number; seit: string; zeit: string };
type Gespraech = { gespraech: string; zuege: number; zeit: string; werkzeuge: string[]; mensch: string };
type Ereignis = { zeit: string; satz: string; mandant: string };

/** Was die Stufen bedeuten — der Trichter meldet heute „seite" und „start". */
const STUFE: Record<string, string> = {
  seite: "Trichter geöffnet",
  start: "Werk hochgeladen",
  lead: "Adresse genannt",
  abschluss: "abgeschlossen",
};

const vorSekunden = (iso: string, jetzt: number): string => {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const s = Math.max(0, Math.round((jetzt - t) / 1000));
  if (s < 60) return `vor ${s}s`;
  if (s < 3600) return `vor ${Math.round(s / 60)} min`;
  return `vor ${Math.round(s / 3600)} h`;
};

export default function EngineLive({ schluessel }: { schluessel: string }) {
  const [daten, setDaten] = useState<{ besucher: Besucher[]; gespraeche: Gespraech[]; ereignisse: Ereignis[]; fenster: number } | null>(null);
  const [jetzt, setJetzt] = useState(() => Date.now());

  useEffect(() => {
    let lebt = true;
    const holen = async () => {
      try {
        const res = await fetch(`/api/engine-live?s=${encodeURIComponent(schluessel)}`, { cache: "no-store" });
        const d = (await res.json()) as { ok?: boolean; besucher?: Besucher[]; gespraeche?: Gespraech[]; ereignisse?: Ereignis[]; fenster?: number };
        if (lebt && d.ok) setDaten({
          besucher: d.besucher ?? [], gespraeche: d.gespraeche ?? [],
          ereignisse: d.ereignisse ?? [], fenster: d.fenster ?? 45,
        });
      } catch { /* stiller Fehlversuch — der nächste Takt holt es nach */ }
    };
    void holen();
    const takt = setInterval(holen, 8000);
    /* Die Sekundenangaben laufen weiter, auch zwischen zwei Abrufen. */
    const uhr = setInterval(() => setJetzt(Date.now()), 1000);
    return () => { lebt = false; clearInterval(takt); clearInterval(uhr); };
  }, [schluessel]);

  const besucher = daten?.besucher ?? [];
  const gespraeche = daten?.gespraeche ?? [];
  const frisch = besucher.filter(b => jetzt - Date.parse(b.zeit) < 5 * 60 * 1000).length;

  return (
    <section className="mt-6 rounded-2xl border border-[#e4e9ee] p-4">
      <div className="flex items-baseline justify-between">
        <p className="m-0 text-[13px] font-black uppercase tracking-[0.16em] text-[#8b959d]">
          Jetzt im Trichter
        </p>
        <span className="text-[12.5px] text-[#8b959d]">
          {daten ? `letzte ${daten.fenster} min` : "lädt …"}
        </span>
      </div>

      <p className="m-0 mt-2 text-[28px] font-black leading-none">
        {frisch}
        <span className="ml-2 align-middle text-[14px] font-bold text-[#8b959d]">in den letzten 5 Minuten</span>
      </p>

      {!besucher.length && (
        <p className="m-0 mt-3 text-[14.5px] text-[#5b666f]">Gerade ist niemand da.</p>
      )}

      {!!besucher.length && (
        <ul className="m-0 mt-3 flex list-none flex-col gap-1.5 p-0">
          {besucher.slice(0, 12).map(b => (
            <li key={b.kennung} className="flex items-baseline justify-between gap-3 text-[14.5px]">
              <span className="font-semibold text-[#14181c]">
                {STUFE[b.stufe] ?? b.stufe}
              </span>
              <span className="shrink-0 text-[13px] text-[#8b959d]">
                {b.kennung} · {vorSekunden(b.zeit, jetzt)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* ── WAS IM PORTAL PASSIERT (Owner 14.09.2026: „Peter hat sein Post korrigiert …") ──
          Ganze Sätze mit Namen, damit man sie im Vorbeigehen liest. */}
      {!!(daten?.ereignisse ?? []).length && (
        <>
          <p className="m-0 mt-4 text-[13px] font-black uppercase tracking-[0.16em] text-[#8b959d]">
            Im Portal
          </p>
          <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
            {(daten?.ereignisse ?? []).slice(0, 15).map(e => (
              <li key={`${e.zeit}-${e.mandant}`} className="flex items-baseline justify-between gap-3 text-[14.5px]">
                <span className="min-w-0 text-[#14181c]">{e.satz}</span>
                <span className="shrink-0 text-[13px] text-[#8b959d]">{vorSekunden(e.zeit, jetzt)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {!!gespraeche.length && (
        <>
          <p className="m-0 mt-4 text-[13px] font-black uppercase tracking-[0.16em] text-[#8b959d]">
            Gespräche in diesem Fenster
          </p>
          <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
            {gespraeche.slice(0, 8).map(g => (
              <li key={g.gespraech} className="flex items-baseline justify-between gap-3 text-[14px]">
                <span className="min-w-0 truncate text-[#14181c]">
                  {g.mensch || "—"}
                </span>
                <span className="shrink-0 text-[13px] text-[#8b959d]">
                  {g.zuege} Züge{g.werkzeuge.length ? ` · ${g.werkzeuge.join(", ")}` : ""} · {vorSekunden(g.zeit, jetzt)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
