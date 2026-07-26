"use client";

import { useMemo, useRef, useState } from "react";
import { countryOptions, flagEmoji } from "@/lib/countries";

// Länder-Feld mit Autofill: tippen → gefilterte Vorschläge (Flagge + Name) aus der
// ISO-Länderliste, gespeichert wird der kanonische Ländername. Verhindert Vertipper/
// freie Eingaben. Floating-Label passend zum Formular. Kein API-Call (statische Liste).

export default function CountryAutocomplete({
  label, value, onChange, lang = "ro", invalid = false,
}: {
  label: string; value: string; onChange: (v: string) => void; lang?: string; invalid?: boolean;
}) {
  const options = useMemo(() => countryOptions(lang.slice(0, 2)), [lang]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const justPicked = useRef(false);
  const filled = !!value.trim();

  const token = value.trim().toLowerCase();
  const matches = (justPicked.current || !token)
    ? []
    : options
        .filter(o => o.name.toLowerCase().includes(token))
        .sort((a, b) => (a.name.toLowerCase().startsWith(token) ? 0 : 1) - (b.name.toLowerCase().startsWith(token) ? 0 : 1))
        .slice(0, 8);
  const showList = open && matches.length > 0;

  const pick = (name: string) => { justPicked.current = true; onChange(name); setOpen(false); };

  return (
    <div className="relative">
      <input
        value={value}
        placeholder=" "
        autoComplete="off"
        onChange={e => { justPicked.current = false; onChange(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={e => {
          if (!showList) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => (a + 1) % matches.length); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => (a - 1 + matches.length) % matches.length); }
          else if (e.key === "Enter") { e.preventDefault(); pick(matches[active].name); }
          else if (e.key === "Escape") { setOpen(false); }
        }}
        className={`peer h-14 w-full rounded-xl border px-4 pb-1 pt-5 text-[15px] font-semibold text-white outline-none transition-colors focus:border-black focus:bg-white ${invalid ? "border-red-500 bg-white" : filled ? "border-black bg-white" : "border-white/15 bg-white/[0.04]"}`} />
      <label className="pointer-events-none absolute left-4 top-2 text-[11px] font-bold text-white/50 transition-all
        peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[15px] peer-placeholder-shown:font-semibold peer-placeholder-shown:text-white/40
        peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[11px] peer-focus:font-bold peer-focus:text-white/50">
        {label}
      </label>
      {showList && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-black/10 bg-white shadow-lg">
          {matches.map((o, i) => (
            <button
              key={o.code}
              type="button"
              onMouseDown={e => { e.preventDefault(); pick(o.name); }}
              onMouseEnter={() => setActive(i)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-semibold ${i === active ? "bg-black/[0.06] text-black" : "text-black/80 hover:bg-black/[0.04]"}`}>
              <span>{flagEmoji(o.code)}</span>{o.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
