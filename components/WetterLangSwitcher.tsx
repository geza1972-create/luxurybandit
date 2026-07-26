"use client";

// Sprach-Umschalter für die Wetter-Seite. Vorher: 8 winzige <a>-Chips oben rechts →
// auf dem iPhone kaum treffbar (man musste mehrfach tippen). Jetzt: EIN natives
// <select> → iOS öffnet seinen großen Picker, ein Tipp genügt, keine Fehltreffer.
// Serverseitig gerendert bleibt der Link-Fallback via <noscript> nicht nötig, da die
// Seite ohnehin nur mit JS interaktiv ist; die Navigation setzt window.location.

const LABEL: Record<string, string> = {
  ro: "Română", de: "Deutsch", en: "English", es: "Español",
  fr: "Français", pt: "Português", pl: "Polski", it: "Italiano",
};

export default function WetterLangSwitcher({ options, current }: {
  options: { code: string; href: string }[];
  current: string;
}) {
  return (
    <div className="relative">
      <select
        aria-label="Sprache wählen"
        value={current}
        onChange={(e) => {
          const o = options.find((x) => x.code === e.target.value);
          if (o) window.location.href = o.href;
        }}
        className="h-9 min-w-[92px] appearance-none rounded-full border border-white/25 bg-black/40 pl-3 pr-7 text-[13px] font-black uppercase tracking-wide text-white backdrop-blur outline-none active:scale-95"
      >
        {options.map((o) => (
          <option key={o.code} value={o.code} className="text-black">
            {o.code.toUpperCase()} · {LABEL[o.code] ?? o.code}
          </option>
        ))}
      </select>
      {/* Chevron */}
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-white/70">▾</span>
    </div>
  );
}
