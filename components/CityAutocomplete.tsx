"use client";

import { useEffect, useRef, useState } from "react";

// Stadt-Feld mit ECHTEM Autofill über Open-Meteo-Geocoding (dieselbe API, die auch das
// Wetter holt). Beim Tippen erscheinen Vorschläge; wählt man einen, wird der KANONISCHE
// Ortsname gespeichert (z. B. „Timișoara") — so kann ein Vertipper wie „Timisora" das
// Wetter nicht mehr kaputt machen. Floating-Label passend zum restlichen Formular.

type GeoResult = { id?: number; name: string; country?: string; admin1?: string; latitude?: number; longitude?: number };

export default function CityAutocomplete({
  label, value, onChange, lang = "ro", invalid = false,
}: {
  label: string; value: string; onChange: (v: string) => void; lang?: string; invalid?: boolean;
}) {
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const justPicked = useRef(false);
  const filled = !!value.trim();

  useEffect(() => {
    const q = value.trim();
    // Nach dem Auswählen nicht sofort erneut suchen (der Wert IST schon der Treffer).
    if (justPicked.current) { justPicked.current = false; return; }
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    let cancelled = false;
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=${encodeURIComponent(lang.slice(0, 2))}&format=json`);
        const d = await r.json();
        const list: GeoResult[] = Array.isArray(d?.results) ? d.results : [];
        if (!cancelled) { setResults(list); setOpen(list.length > 0); setActive(0); }
      } catch { if (!cancelled) { setResults([]); setOpen(false); } }
      finally { if (!cancelled) setLoading(false); }
    }, 250);
    return () => { cancelled = true; clearTimeout(id); };
  }, [value, lang]);

  const pick = (r: GeoResult) => {
    justPicked.current = true;
    onChange(r.name);              // kanonischer Ortsname in die DB
    setResults([]); setOpen(false);
  };

  const label2 = (r: GeoResult) => [r.name, r.admin1, r.country].filter(Boolean).join(", ");

  return (
    <div className="relative">
      <input
        value={value}
        placeholder=" "
        autoComplete="off"
        inputMode="text"
        onChange={e => onChange(e.target.value)}
        onFocus={() => { if (results.length) setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={e => {
          if (!open || !results.length) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => (a + 1) % results.length); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => (a - 1 + results.length) % results.length); }
          else if (e.key === "Enter") { e.preventDefault(); pick(results[active]); }
          else if (e.key === "Escape") { setOpen(false); }
        }}
        className={`peer h-14 w-full rounded-xl border px-4 pb-1 pt-5 text-[15px] font-semibold text-white outline-none transition-colors focus:border-black focus:bg-white ${invalid ? "border-red-500 bg-white" : filled ? "border-black bg-white" : "border-white/15 bg-white/[0.04]"}`} />
      <label className="pointer-events-none absolute left-4 top-2 text-[11px] font-bold text-white/50 transition-all
        peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[15px] peer-placeholder-shown:font-semibold peer-placeholder-shown:text-white/40
        peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[11px] peer-focus:font-bold peer-focus:text-white/50">
        {label}
      </label>
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-black/10 bg-white shadow-lg">
          {results.map((r, i) => (
            <button
              key={`${r.id ?? r.name}-${i}`}
              type="button"
              onMouseDown={e => { e.preventDefault(); pick(r); }}
              onMouseEnter={() => setActive(i)}
              className={`flex w-full items-center gap-1.5 px-3 py-2 text-left text-[13px] font-semibold ${i === active ? "bg-black/[0.06] text-black" : "text-black/80 hover:bg-black/[0.04]"}`}>
              <span className="text-black/30">📍</span>{label2(r)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
