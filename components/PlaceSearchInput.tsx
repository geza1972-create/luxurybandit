"use client";

import { useRef, useState } from "react";
import { DESTINATIONS } from "@/lib/destinations";

// Escapes search field with TOKEN-aware autocomplete. Unlike a native <datalist>
// (which only matches the whole value), this suggests on the LAST place typed — so
// "Greece, Th…" still proposes Thailand. Leading "+" and commas are preserved.
export default function PlaceSearchInput({
  value, onChange, placeholder, className = "", wrapperClassName = "", disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  wrapperClassName?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Split into "everything up to and including the last comma" + the token after it.
  const lastComma = value.lastIndexOf(",");
  const head = lastComma >= 0 ? value.slice(0, lastComma + 1) : "";
  const rawToken = lastComma >= 0 ? value.slice(lastComma + 1) : value;
  // A "+" on THIS place (e.g. "…, +Gr") marks it additive — keep it when picking.
  const tokenHasPlus = /^\s*\+/.test(rawToken);
  const token = rawToken.replace(/^\s*\+/, "").trim().toLowerCase();

  const matches = token
    ? DESTINATIONS
        .filter(d => d.toLowerCase().includes(token))
        // Names that START with what you typed rank above mid-word matches.
        .sort((a, b) => (a.toLowerCase().startsWith(token) ? 0 : 1) - (b.toLowerCase().startsWith(token) ? 0 : 1))
        .slice(0, 8)
    : [];
  const showList = open && matches.length > 0;

  const pick = (d: string) => {
    const sep = head ? head.replace(/\s*$/, "") + " " : "";
    const plus = tokenHasPlus ? "+" : "";
    onChange(sep + plus + d + ", ");
    setActive(0);
    setOpen(true);            // stay open so the next place can be picked too
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!showList) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => (a + 1) % matches.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => (a - 1 + matches.length) % matches.length); }
    else if (e.key === "Enter") { e.preventDefault(); pick(matches[active]); }
    else if (e.key === "Escape") { setOpen(false); }
  };

  return (
    <div className={`relative ${wrapperClassName}`}>
      <input
        ref={inputRef}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        onChange={e => { onChange(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        className={className}
      />
      {showList && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-md border border-black/10 bg-white shadow-lg">
          {matches.map((d, i) => (
            <button
              key={d}
              type="button"
              onMouseDown={e => { e.preventDefault(); pick(d); }}
              onMouseEnter={() => setActive(i)}
              className={`flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-[12px] font-semibold ${i === active ? "bg-cobalt/10 text-cobalt" : "text-ink hover:bg-black/[0.04]"}`}>
              <span className="text-ink/30">📍</span>{d}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
