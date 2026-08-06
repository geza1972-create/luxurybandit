"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

/**
 * DIE CI-BIBLIOTHEK — die EINE Umsetzung der Hausregeln (Owner 06.08.2026: „am liebsten
 * würde ich wirklich ein CI Library aufbauen und alles angleichen. Farben, Schriften,
 * Icons, Buttons, teaser, cards, header." · „bau die CI-Bibliothek").
 *
 * WARUM ES SIE GIBT: Die Regeln stehen längst (Skill `ci-design`, Skill `card`,
 * docs/ci-farben-typo-buttons.md) — aber jede Stelle setzte sie neu um. Am 06.08. gab es
 * drei verschiedene Schliessen-Kreuze, drei Eingabefeld-Stile und fünf handgerollte
 * Dialoge; das E-Mail-Tor hatte gar keinen Ausgang. Regeln ohne Bausteine muss jeder
 * jedes Mal neu befolgen — diese Bausteine befolgen sie von selbst.
 *
 * DIE REGELN BLEIBEN IN DEN SKILLS, die Umsetzung lebt HIER. Wer eine Scheibe, einen
 * Knopf, ein Feld oder einen Dialog braucht, holt ihn aus dieser Datei, statt Klassen
 * abzutippen. Umgestellt wird ROLLIEREND: jede Stelle, die ohnehin angefasst wird —
 * kein Big-Bang über getestete Trichter.
 *
 * ZWEI FARBWELTEN, EIN SCHALTER: `karte` heisst „innerhalb der elfenbeinfarbenen
 * Einladungskarte". Dort gewinnen die `!important`-Regeln von `.lb-karte` gegen jede
 * Tailwind-Farbe — deshalb schalten die Bausteine dort auf die `lb-karte-*`-Klassen um
 * (Memory `lb-karte-important-frisst-inline-farben`). Ohne `karte` gilt die dunkle
 * CI-Welt: Gold #f6cf51 als Akzent, weisse Scheiben mit Altgold #a07a34 auf Medien.
 */

/** Das Altgold der Scheiben-Symbole — dieselbe Zahl wie bei den drei Karten-Knöpfen. */
export const SCHEIBEN_GOLD = "#a07a34";
/** Das Absage-Rot — fest, damit es in heller wie dunkler Fassung Rot bleibt. */
export const ABSAGE_ROT = "#dc2626";

/**
 * DIE SCHEIBE — der eine runde Knopf des Hauses: weisse Scheibe, Symbol in Altgold,
 * weicher Schatten (Skill `card`: „Teilen-Knopf wie beim Tanz: weisse Scheibe, goldener
 * Pfeil" — und am 04.08. auf ALLE Knöpfe ausgeweitet). `rot` ist die Ausnahme fürs
 * Löschen/Schliessen mit Warncharakter. `durchsichtig` sind die 30 % der Karten-Symbole
 * (Owner 04.08.: „jetzt 30% transparent alle Icons") — am GANZEN Knopf, nicht nur am
 * Grund, sonst sieht das Zeichen ausgeschnitten aus.
 */
export function Scheibe({ onClick, label, rot = false, klein = false, durchsichtig = false, className = "", children }: {
  onClick?: () => void;
  /** Vorlesetext — Pflicht, die Scheibe zeigt nur ein Symbol. */
  label: string;
  rot?: boolean;
  /** h-9 statt h-10 — für Dialog-Ecken und enge Leisten. */
  klein?: boolean;
  durchsichtig?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} aria-label={label}
      style={{ background: "#fff", color: rot ? ABSAGE_ROT : SCHEIBEN_GOLD, boxShadow: "0 2px 10px rgba(0,0,0,0.35)", ...(durchsichtig ? { opacity: 0.7 } : {}) }}
      className={`grid ${klein ? "h-9 w-9" : "h-10 w-10"} place-items-center rounded-full transition active:scale-90 ${className}`}>
      {children}
    </button>
  );
}

/**
 * DER KNOPF — drei Gestalten, eine Herkunft (Skill `ci-design`):
 *   gold    der EINE Primärknopf des Bildschirms (`.lb-gold`, h-12, nie zwei davon)
 *   umriss  der Zweitweg — dunkle Welt: Rand + weiss/85; Karte: `lb-karte-absage`
 *   chip    eine Wahl — aktiv gold gefüllt (Karte: `lb-karte-cta`), inaktiv gedeckt
 */
export function Knopf({ art = "gold", aktiv = false, karte = false, onClick, disabled = false, className = "", children }: {
  art?: "gold" | "umriss" | "chip";
  /** Nur für `chip`: ist diese Wahl gerade gewählt? */
  aktiv?: boolean;
  karte?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const kl = art === "gold"
    ? "lb-gold flex h-12 w-full items-center justify-center gap-2 rounded-full font-black"
    : art === "umriss"
      ? (karte
        ? "lb-karte-absage flex h-11 w-full items-center justify-center gap-2 rounded-full text-[13px] font-black"
        : "flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/25 text-[13px] font-black text-white/85")
      : /* chip */ (karte
        ? `${aktiv ? "lb-karte-cta" : "lb-karte-absage"} flex min-h-11 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-center text-[12px] font-black leading-tight`
        : `flex min-h-11 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-center text-[12px] font-black leading-tight ${aktiv ? "bg-[#f6cf51] text-black" : "bg-white/10 text-white/85"}`);
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      {...(art === "chip" ? { "aria-pressed": aktiv } : {})}
      className={`${kl} transition active:scale-95 disabled:opacity-60 ${className}`}>
      {children}
    </button>
  );
}

/**
 * DAS EINGABEFELD — dunkle Welt nach der Kontrast-Regel des Skills (`border-white/30`,
 * `bg-white/[0.08]`, Platzhalter weiss/60 — ein `white/15`-Rand ist im Tageslicht
 * unsichtbar); in der Karte `lb-karte-feld`.
 */
export function Eingabe({ karte = false, className = "", ...rest }: {
  karte?: boolean;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...rest}
      className={`h-11 w-full rounded-lg px-3 font-serif text-[15px] outline-none ${karte
        ? "lb-karte-feld"
        : "border border-white/30 bg-white/[0.08] text-white placeholder:text-white/60"} ${className}`} />
  );
}

/**
 * DIE FEHLERZEILE — Absagen ROT ans Feld, feste Farbe in beiden Fassungen (Memory
 * `sichtbare-fehler-keine-formularfelder`). In der Karte über die eigene
 * `!important`-Klasse, draussen als `style` (dort gibt es keine Umfärb-Falle).
 */
export function Fehlerzeile({ karte = false, className = "", children }: {
  karte?: boolean;
  className?: string;
  children: ReactNode;
}) {
  if (!children) return null;
  return (
    <p role="alert" style={karte ? undefined : { color: ABSAGE_ROT }}
      className={`${karte ? "lb-karte-fehler " : ""}mt-1.5 text-center text-[12.5px] font-black leading-snug ${className}`}>
      {children}
    </p>
  );
}

/**
 * DER DIALOG — das weisse, mittige Fenster (E-Mail-Tor, Aufladewähler-Familie). ZWEI
 * Ausgänge sind eingebaut und nicht abwählbar: Tipp auf den dunklen Rand und die
 * Scheibe mit dem Kreuz (Owner 06.08.2026: „hier kann der user den Dialog gar nicht
 * mehr schliessen" — ein Tor ohne Ausgang hält niemanden zum Kaufen fest, es hält ihn
 * nur vom Weiterschauen ab). Der Inhalt läuft auf hellem Grund — Textfarben dort als
 * `style` mit #1a160f, wie im Tor.
 */
export function Dialog({ zu, z = 96, className = "", children }: {
  /** Schliessen — an Rand UND Kreuz gebunden. */
  zu: () => void;
  /** Stapelhöhe: 96 ist die Fenster-Ebene des Kuss-Trichters (über Kopfzeile und Stufen). */
  z?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 grid place-items-center p-5" style={{ background: "rgba(0,0,0,0.72)", zIndex: z }}
      onClick={zu}>
      <div className={`relative w-full max-w-[340px] rounded-3xl bg-white p-6 text-center ${className}`}
        onClick={e => e.stopPropagation()}>
        <Scheibe klein label="✕" onClick={zu} className="absolute right-3 top-3">
          <X className="h-4 w-4" />
        </Scheibe>
        {children}
      </div>
    </div>
  );
}
