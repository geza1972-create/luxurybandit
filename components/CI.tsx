"use client";

import type { ReactNode } from "react";
import { X, Loader2, Heart, Gift, Cake, Palmtree, MessageCircle, Sparkles, LayoutGrid, type LucideIcon } from "lucide-react";

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
 * CI-Welt: Gelb #f6cf51 als Akzent, weisse Scheiben mit schwarzem Zeichen auf Medien.
 */

/**
 * DIE TINTE DER SCHEIBEN-SYMBOLE — SCHWARZ, NICHT GOLD (Owner 06.08.2026: „icons genauso,
 * statt gold, schwarz bitte" · „dann brauchen wir gold nicht mehr als farbe"). Das Altgold
 * #a07a34 ist komplett abgeschafft; Gold gibt es nur noch als das gelbe #f6cf51 der Knöpfe.
 */
export const SCHEIBEN_TINTE = "#1a160f";
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
      style={{ background: "#fff", color: rot ? ABSAGE_ROT : SCHEIBEN_TINTE, boxShadow: "0 2px 10px rgba(0,0,0,0.35)", ...(durchsichtig ? { opacity: 0.7 } : {}) }}
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
 * DIE LADEANZEIGE — der eine Kreisel des Hauses. Am 06.08.2026 stand er rund 250-mal
 * von Hand getippt im Code, in vier Grössen (h-3, h-3.5, h-4, h-5, h-6) und einem halben
 * Dutzend Farben. Zwei Plätze reichen, und die Bibliothek kennt beide:
 *   knopf    im Knopf, neben oder statt der Beschriftung (h-4 — die häufigste Grösse)
 *   flaeche  mittig auf einer wartenden Fläche, mit einer Zeile darunter, die SAGT,
 *            worauf gewartet wird — ein Kreisel ohne Wort lässt den Nutzer raten,
 *            ob die Seite arbeitet oder hängt
 *
 * `karte` färbt ihn für die elfenbeinfarbene Einladungskarte in Tinte statt Weiss.
 */
export function Laden({ art = "knopf", karte = false, text, className = "" }: {
  art?: "knopf" | "flaeche";
  karte?: boolean;
  /** Nur für `flaeche`: die Zeile unter dem Kreisel — „Dein Video entsteht …". */
  text?: string;
  className?: string;
}) {
  const tinte = karte ? SCHEIBEN_TINTE : undefined;
  if (art === "knopf") {
    return <Loader2 aria-hidden className={`h-4 w-4 animate-spin ${className}`} style={tinte ? { color: tinte } : undefined} />;
  }
  return (
    <div role="status" className={`flex flex-col items-center justify-center gap-2 py-6 ${className}`}>
      <Loader2 aria-hidden className={`h-6 w-6 animate-spin ${karte ? "" : "text-white/70"}`}
        style={tinte ? { color: tinte } : undefined} />
      {text && (
        <p className={`text-center text-[13px] font-bold leading-snug ${karte ? "" : "text-white/75"}`}
          style={tinte ? { color: tinte } : undefined}>{text}</p>
      )}
    </div>
  );
}

/**
 * DER KASTEN — die eine abgesetzte Fläche des Hauses (Owner 06.08.2026: „Farben,
 * Schriften, Icons, Buttons, teaser, cards, header" — der Teaser-Kasten war der letzte
 * grosse Baustein, den jede Seite selbst zeichnete).
 *
 * WARUM: Am 06.08. gab es 82 solcher Flächen in 21 verschiedenen Rezepturen — mal
 * `border-white/10 bg-white/[0.03]`, mal `/15` und `[0.04]`, mal `/20` und `[0.06]`.
 * Niemand hatte sich das ausgedacht, es war nur jedes Mal neu abgetippt. Zwei Gestalten
 * reichen, und die Bibliothek kennt sie:
 *   still   der ruhige Kasten — abgesetzt, aber leise (Abschnitte, Listen, Hinweise)
 *   gold    der Teaser — die Fläche, die etwas ANBIETET (Angebot, Gutschein, Hinweis
 *           mit Folgen). Höchstens einer pro Bildschirm, wie beim Goldknopf.
 *
 * DER RAND IST /20, NICHT /10 (Skill `ci-design`, Kontrast-Untergrenze): „ein
 * white/15-Rand auf Schwarz ist im Tageslicht unsichtbar". Wer den Kasten aus der
 * Bibliothek holt, hält die Regel automatisch ein.
 *
 * `polster` statt Polsterung im `className`: zwei Tailwind-Polster (p-4 und p-3) haben
 * dieselbe Spezifität — welches gewinnt, entscheidet dann die Reihenfolge im erzeugten
 * Stylesheet, nicht die im String. Deshalb gibt es genau EINEN Platz dafür.
 */
export function Kasten({ art = "still", karte = false, polster = "p-4", className = "", children }: {
  art?: "still" | "gold";
  karte?: boolean;
  /** Die eine Polster-Stelle — "p-4" (Vorgabe), "p-3", "p-5" oder "p-0". */
  polster?: string;
  className?: string;
  children: ReactNode;
}) {
  const kl = karte
    ? "lb-karte-rahmen rounded-2xl"
    : art === "gold"
      ? "rounded-2xl border border-[#f6cf51]/40 bg-[#f6cf51]/10"
      : "rounded-2xl border border-white/20 bg-white/[0.05]";
  return <div className={`${kl} ${polster} ${className}`}>{children}</div>;
}

/**
 * DIE THEMEN-KREISE — die Tür zu jedem Thema als wischbare Reihe (Owner 06.08.2026:
 * „die kommen auch in die Bibliothek. Und scrollbalken wird dann transparent").
 *
 * Entstanden in der Galerie (Owner 03.08.: „‚Choose a topic' vielleicht, aber nicht
 * irgendein Banner. Dann springt er auf die Topics" — und zum grauen Kasten: „das hast
 * du aber lieblos jetzt gemacht"): Kein Schild, das auf eine Tür zeigt — jedes Thema
 * IST die Tür und springt direkt in seinen Trichter, ein Tipp statt zwei.
 *
 * Die Reihe wischt waagerecht OHNE Balken (`lb-wisch`), beginnt am Seitenrand
 * (`-mx-4 px-4` — sonst sieht der letzte Kreis abgeschnitten aus) und nennt KEINE
 * Preise: was ein Thema kostet, sagt seine Seite, aus `lib/pricing.ts`.
 *
 * Die Vorgabe-Liste sind alle Themen samt „Alle" — wer eine engere Reihe braucht
 * (z. B. ohne das eigene Thema), reicht `themen` herein.
 */
export const THEMEN_KREISE: { icon: LucideIcon; name: string; href: string }[] = [
  { icon: Heart, name: "Kiss", href: "/themes/kiss" },
  { icon: Gift, name: "Surprise", href: "/themes/surprise" },
  { icon: Cake, name: "Birthday", href: "/themes/birthday" },
  { icon: Palmtree, name: "Holiday", href: "/themes/holiday" },
  { icon: MessageCircle, name: "Chat", href: "/themes/chat" },
  { icon: Sparkles, name: "Wedding", href: "/themes/wedding" },
  { icon: LayoutGrid, name: "Alle", href: "/themes" },
];
export function ThemenKreise({ themen = THEMEN_KREISE, className = "" }: {
  themen?: { icon: LucideIcon; name: string; href: string }[];
  className?: string;
}) {
  return (
    <div className={`lb-wisch -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 ${className}`}>
      {themen.map(t => (
        <a key={t.href} href={t.href} className="group flex w-[58px] shrink-0 flex-col items-center gap-1.5">
          <span className="grid h-[58px] w-[58px] place-items-center rounded-full border border-[#f6cf51]/30 bg-gradient-to-b from-[#f6cf51]/[0.14] to-transparent text-[#f6cf51] transition group-active:scale-90">
            <t.icon className="h-[22px] w-[22px]" />
          </span>
          <span className="text-center text-[10.5px] font-black leading-none text-white/70">{t.name}</span>
        </a>
      ))}
    </div>
  );
}

/**
 * DER DIALOG — das mittige Fenster (E-Mail-Tor, Aufladewähler-Familie, Abo-Fenster).
 * ZWEI Ausgänge sind eingebaut und nicht abwählbar: Tipp auf den dunklen Rand und die
 * Scheibe mit dem Kreuz (Owner 06.08.2026: „hier kann der user den Dialog gar nicht
 * mehr schliessen" — ein Tor ohne Ausgang hält niemanden zum Kaufen fest, es hält ihn
 * nur vom Weiterschauen ab).
 *
 * ZWEI GESTALTEN, weil es im Haus zwei Sorten Fenster gibt:
 *   hell    die weisse Karte — das Tor, die Frage, die Entscheidung (Vorgabe).
 *           Textfarben darin als `style` mit #1a160f, wie im Tor.
 *   dunkel  das Fenster, das AUF der dunklen Welt liegt und ihre Farben behält
 *           (Abo- und Freischalt-Fenster). Weisse Schrift, Gold #f6cf51 als Akzent.
 *
 * Die dunkle Gestalt kam am 06.08.2026 dazu: `PremiumDialog` und `SubscribeDialog` waren
 * von Hand gebaut, und weil sie niemandem gehörten, trugen sie 16-mal `amber-*` als
 * Akzent — die eine Farbe, die der Skill auf dunklen Kundenflächen ausdrücklich verbietet.
 * Ein Baustein, der nur Weiss kann, treibt genau solche Eigenbauten hervor.
 */
export function Dialog({ art = "hell", zu, z = 96, className = "", children }: {
  art?: "hell" | "dunkel";
  /** Schliessen — an Rand UND Kreuz gebunden. */
  zu: () => void;
  /** Stapelhöhe: 96 ist die Fenster-Ebene des Kuss-Trichters (über Kopfzeile und Stufen). */
  z?: number;
  className?: string;
  children: ReactNode;
}) {
  const dunkel = art === "dunkel";
  return (
    <div className="fixed inset-0 grid place-items-center p-5" style={{ background: "rgba(0,0,0,0.72)", zIndex: z }}
      onClick={zu}>
      <div className={`relative w-full ${dunkel ? "max-w-sm border border-[#f6cf51]/25 bg-[#141210]" : "max-w-[340px] bg-white"} rounded-3xl p-6 text-center ${className}`}
        onClick={e => e.stopPropagation()}>
        <Scheibe klein label="✕" onClick={zu} className="absolute right-3 top-3">
          <X className="h-4 w-4" />
        </Scheibe>
        {children}
      </div>
    </div>
  );
}
