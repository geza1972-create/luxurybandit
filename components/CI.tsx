"use client";

import { useEffect, useState, type ReactNode } from "react";
import { X, Loader2, Lock, Heart, Gift, Cake, Palmtree, MessageCircle, Sparkles, LayoutGrid, type LucideIcon } from "lucide-react";
import SchleifenVideo from "@/components/SchleifenVideo";
import TonKnopf from "@/components/TonKnopf";
import { CornerOrnaments } from "@/components/BoxOrnaments";
import { zweifarbig } from "@/components/Landing";
import KartenKarussell from "@/components/KartenKarussell";

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
 *   chip    eine Wahl — aktiv NUR umrandet, nie gefüllt
 *
 * EIN CHIP DARF NICHT WIE EIN KNOPF AUSSEHEN (Owner 06.08.2026: „ein chip darf nicht wie
 * ein button aussehen. Es muss als aktiv mit gelber umrandung sein und bg gelb transparent
 * fast schwarz"). Vorher war der aktive Chip gold GEFÜLLT mit schwarzer Schrift — dieselbe
 * Gestalt wie der Kaufknopf. Auf einem Bildschirm mit sechs Szenen-Chips standen damit
 * sechs Dinge, die aussahen, als lösten sie etwas aus; der eine Knopf, der wirklich kauft,
 * ging darin unter. Jetzt zeigt der aktive Chip nur einen gelben Rand und einen fast
 * schwarzen Hauch Gold darunter: sichtbar gewählt, aber kein Knopf.
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
        // In der Karte gibt es kein Gold für Flächen — dort macht der Kartenrahmen die
        // Wahl sichtbar, gefüllt wird auch hier nichts. BEIDE tragen den Rahmen (Owner
        // 06.08.2026: „wir brauchen einen rand bei inaktiv"); den ungewählten nimmt die
        // halbe Deckkraft zurück, so ist seine Linie da, aber leise.
        ? `lb-karte-rahmen flex min-h-11 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-center text-[12px] font-black leading-tight ${aktiv ? "" : "opacity-55"}`
        // `lb-wahl` ist die Kennung für die helle Fassung: dort färbt eine Pauschalregel
        // ALLES blau und solide, was `bg-[#f6cf51]` im Klassennamen trägt — auch einen
        // 10-%-Hauch. Aus dem Hauch würde eine Füllung, aus dem Chip wieder ein Knopf.
        // DIE WERTE SIND DIE DER KOPFZEILE (Owner 06.08.2026 zeigte auf das Guthaben- und
        // das Galerie-Chip in `GuthabenChip`: „hier ist es richtig"). Beide sind seit dem
        // 03.08. im Einsatz und sind damit die Vorlage, nicht eine zweite Meinung:
        // gewählt = gelber Rand auf 40 %, ein Hauch Gold, gelbe Schrift; ungewählt =
        // weisser Rand auf 20 %, ein Hauch Weiss, Schrift weiss/85.
        : `lb-wahl ${aktiv ? "lb-wahl-an" : "lb-wahl-aus"} flex min-h-11 items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-center text-[12px] font-black leading-tight ${aktiv
          ? "border-[#f6cf51]/40 bg-[#f6cf51]/10 text-[#f6cf51]"
          // Rand und Schrift des ungewählten kommen aus `lb-wahl-aus` in globals.css statt
          // aus Tailwind: eine `border-white/…`-Klasse hätte ihn in der hellen Fassung
          // blau umrandet — mit genau dem Rand, der dem GEWÄHLTEN gehört.
          : "bg-white/5"}`);
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
 *
 * DAS FELD, IN DAS MAN SCHREIBT, ZEIGT DAS AUCH (Owner 06.08.2026: „wenn ich schreibe wird
 * der rand aktiv also blau bei light"). Vorher hatte der Baustein GAR keinen Fokus-Rand:
 * `outline-none` nahm den des Browsers weg und setzte nichts an seine Stelle — auf einem
 * Formular mit drei Feldern sah man nicht, in welchem man gerade tippt. Der aktive Rand
 * ist die Akzentfarbe der jeweiligen Welt: Gold draussen, Blau in der hellen Fassung,
 * Tinte in der Karte (dort gibt es kein Gold für Ränder, Ornament-Regel).
 *
 * `lb-eingabe` ist die Kennung, an der die helle Fassung Felder erkennt (weisser Grund,
 * dunkle Schrift statt Weiss-auf-Weiss) — der Baustein trug sie bisher nicht.
 */
export function Eingabe({ karte = false, className = "", ...rest }: {
  karte?: boolean;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...rest}
      className={`h-11 w-full rounded-lg px-3 font-serif text-[15px] outline-none ${karte
        ? "lb-karte-feld"
        : "lb-eingabe border border-white/30 bg-white/[0.08] text-white placeholder:text-white/60 focus:border-[#f6cf51]"} ${className}`} />
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
      // `lb-teaser` aus demselben Grund wie `lb-wahl` am Chip: in der hellen Fassung
      // färbt eine Pauschalregel alles solide blau, was `bg-[#f6cf51]` im Klassennamen
      // trägt — sie trifft per Teilstring auch diesen 10-%-Hauch. Ohne die Kennung wurde
      // aus dem Teaser dort ein massiver blauer Block: eine Fläche, die aussieht wie ein
      // Knopf über die halbe Seite.
      ? "lb-teaser rounded-2xl border border-[#f6cf51]/40 bg-[#f6cf51]/10"
      : "rounded-2xl border border-white/20 bg-white/[0.05]";
  return <div className={`${kl} ${polster} ${className}`}>{children}</div>;
}

/**
 * DER TOPIC-KASTEN — die Kachel, mit der ein Thema sich verkauft (Owner 06.08.2026: „mach
 * mir in die bibliotheck auch ein Topic kasten").
 *
 * Sie ist das meistgesehene Stück UI des Hauses: Wer auf die Startseite kommt, sieht als
 * Erstes sechs davon. Trotzdem war sie in `app/themes/page.tsx` eingewachsen und nirgends
 * sonst zu holen.
 *
 * ZWEI GESTALTEN (Owner 06.08.2026: „wir machen zwei Designs. Ein mall so wie es ist und
 * ein mal volle breite. Ich werde mit einem toogle button von hier umschalten können"):
 *   reihe  wie bisher — schmales Vorschaubild links, Text rechts. Sechs Themen passen
 *          untereinander auf einen Bildschirm, man überfliegt sie.
 *   voll   das Bild über die ganze Breite, Text darunter. Ein Thema füllt den Blick; man
 *          sieht das Video statt einer Briefmarke, aber man scrollt länger.
 * Welche besser verkauft, entscheidet nicht die Meinung, sondern der Umschalter darüber.
 *
 * DER PREIS IST DIE WICHTIGSTE ZEILE (aus der alten Fassung übernommen): er steht vorn und
 * in Gold, nicht als Fussnote hinter den Merkmalen. Ein Geschenk, dessen Preis man raten
 * muss, verkauft sich nicht.
 */
/**
 * DIE TITELZEILE DER KARTE — gelb, mittig, und ab einer gewissen Länge nicht mehr gesperrt
 * (Owner 06.08.2026 zur Themen-Kachel: „ich brauche genau das gleiche design. Selbe Schrift
 * wie bei card").
 *
 * Sie stand nur in `EinladungKarte` und war damit nirgendwo sonst zu haben — die Kachel hatte
 * sich deshalb eine eigene Überschrift gebaut, und zwei Dinge, die dasselbe sein sollen, sahen
 * verschieden aus. Jetzt liegt sie hier: Karte und Kachel holen dieselbe Zeile.
 *
 * DIE LÄNGENREGEL GEHÖRT DAZU, sie ist der Grund für die zwei Gestalten: Ein kurzer Titel wie
 * „HOCHZEITSEINLADUNG" trägt Versalien mit weiter Sperrung — das liest sich als Auszeichnung.
 * „Mein Geschenk für dich: Ein Gutschein!" in derselben Schrift ist eine Zumutung, gesperrte
 * Versalien liest man Buchstabe für Buchstabe. Ab 18 Zeichen also normale Schreibung, etwas
 * grösser, ohne Sperrung.
 */
export function KartenTitel({ children, className = "" }: { children: string; className?: string }) {
  const lang = String(children ?? "").length > 18;
  /**
   * DIE SCHRIFT STEHT AM BAUSTEIN, NICHT AM ORT (Owner 06.08.2026: „du gehst nicht nach CI.
   * Jedeasmal ist eine andere schrift art über das Video").
   *
   * Genau das war der Fehler: Die Zeile setzte keine Schrift, sie ERBTE sie. In der
   * Einladungskarte stand ringsum `font-serif`, also war sie eine Serife; in der Themen-
   * Kachel stand nichts, also war sie die Hausschrift. Ein Baustein, der je nach Nachbarn
   * anders aussieht, ist keiner — deshalb trägt er die Karten-Serife jetzt selbst.
   */
  return (
    <p className={`lb-karte-gold text-center font-serif font-black ${lang
      ? "text-[13px] leading-snug tracking-normal"
      : "text-[10px] uppercase tracking-[0.34em]"} ${className}`}>
      {children}
    </p>
  );
}

export type ThemenKachelDaten = {
  titel: string;
  zeile: string;
  /** Ohne `href` ist das Thema „bald" — die Kachel ist dann kein Link. */
  href?: string;
  bild?: string;
  /** Zweites Bild darunter für die Überblendung der Startseite. */
  bild2?: string;
  video?: string;
  poster?: string;
  /** Die Merkmal-Zeile („♥ Ihr Foto · Sein Foto · Kuss"). */
  merkmale?: string;
  /** „ab 15 €" — kommt IMMER aus lib/pricing.ts, nie von Hand getippt. */
  abPreis?: string;
  /** Wasserzeichen, wenn es weder Bild noch Video gibt — die Server-Seite reicht es fertig herein. */
  platzhalter?: ReactNode;
};
export function ThemenKachel({ thema, art = "reihe", live = "LIVE", bald = "Soon", baldZeile = "Coming soon", cta, ton, onTon, className = "" }: {
  thema: ThemenKachelDaten;
  /**
   * Der Wortlaut des Kaufknopfs — „CTA auf jeder Karte" (Landingpage.md, Memory
   * `videos-auf-landingpages`). Der Aufrufer liefert ihn in seiner Sprache; ohne ihn
   * erscheint kein Knopf. Nur in der vollen Gestalt: In der schmalen Reihe ist die ganze
   * Zeile der Knopf.
   */
  cta?: string;
  /**
   * `reihe` schmale Zeile · `voll` eigene Karte über die ganze Breite ·
   * `folie` derselbe Inhalt wie `voll`, aber OHNE eigenes Kartenpapier — für das Karussell,
   * das alle Themen in EINER Karte zeigt (Owner 06.08.2026: „Die Videos müssen in die
   * oberste Karte erscheinen und nicht untereinander. Also im Karussell").
   */
  art?: "reihe" | "voll" | "folie";
  live?: string;
  bald?: string;
  baldZeile?: string;
  /**
   * DER TON-KNOPF (Owner 07.08.2026: „in der Bibliothek haben wir den sound nicht zum
   * an/abschalten. Also einfügen") — nötig, seit das Geburtstags-Beispielvideo SPRICHT.
   * Er erscheint nur in der vollen Gestalt: Die 104-px-Briefmarken der Reihe sind
   * Navigations-Vorschauen, ein 40-px-Knopf darauf wäre größer als das halbe Bild.
   * Zustand und Umschalten liegen beim Aufrufer (ThemenListe), damit ALLE Folien einen
   * gemeinsamen Schalter teilen — wie im Feed (Memory `feed-spec`).
   */
  ton?: boolean;
  onTon?: () => void;
  className?: string;
}) {
  const aktiv = !!thema.href;
  const folie = art === "folie";
  const voll = art === "voll" || folie;
  /**
   * IN DER VOLLEN GESTALT GIBT DIE KACHEL KEIN FORMAT VOR (Owner 06.08.2026: „boa der volle
   * ist aber grausam. Abgeschnitenen Videos braucht keine Mensch").
   *
   * Zuerst stand hier ein festes `aspect-[4/3]`, und `object-cover` hat alles darüber
   * weggeschnitten — bei einem Hochformat war das die halbe Aufnahme. Die Themen-Videos
   * sind ausserdem NICHT gleich: teils 3:4, teils 9:16. Ein festes Verhältnis für alle
   * heisst zwangsläufig, dass die Hälfte beschnitten wird. Über die ganze Breite braucht es
   * gar keinen Rahmen: Das Video ist so hoch, wie es ist, und man sieht die ganze Aufnahme.
   * In der schmalen Reihe bleibt die feste 3:4-Briefmarke — dort MUSS ein Format her, sonst
   * hätte jede Zeile eine andere Höhe.
   */
  /**
   * ALLE KACHELN HABEN DIE GRÖSSE DER HOCHZEIT (Owner 06.08.2026: „die Videso müssen alle
   * gleich gross sein" · „nimm die grösse von hochzeit" · „doch abscheiden kannst du").
   *
   * Das Hochzeitsvideo ist 3:4 — und mit ihm vier der sechs Themen-Videos; die füllen die
   * Fläche also randlos. Die beiden Hochformate (9:16, Gutschein und Chat) werden dafür
   * beschnitten, und das ist ausdrücklich erlaubt. Der Weg dorthin ging über zwei Irrwege:
   * jedes Video in seiner eigenen Höhe (nichts beschnitten, dafür jede Kachel anders hoch
   * und Löcher in der Wischbahn) und eingepasst mit Papierstreifen (gleich gross, aber
   * kleiner als die Fläche). Eine feste Fläche mit `cover` ist beides: gleich gross, und
   * das Video steht randlos darin.
   */
  const medien = (
    <div className={`relative shrink-0 overflow-hidden lb-media-bg aspect-[3/4] ${voll ? "w-full" : "w-[104px]"}`}>
      {/* GESCHNITTEN WIRD OBEN UND UNTEN, NIE SEITLICH (Owner 06.08.2026: „aber nicht
          seitlich abscheiden sondern oben unten"). Ein Hochformat in einer 3:4-Fläche
          verliert ohnehin nur Höhe — aber `object-top` nahm alles davon UNTEN weg und
          schnitt damit einseitig. Mittig verteilt es sich auf beide Enden, und der Mensch
          im Bild bleibt in der Mitte, wo er hingehört. In der schmalen Reihe bleibt es
          oben angeschlagen: Dort sind 104 Pixel Breite, da zählt das Gesicht. */}
      {thema.video ? (
        <>
          {/* Poster-Rückfall aufs Kachelbild — nie eine schwarze Fläche (Memory
              `video-playback-behavior`); Autostart nur in der schmalen Reihe (stumm,
              104 px) — die grosse Karte wartet auf den Tipp (Owner 07.08.2026: „videos
              sollen nicht automatisch starten. Weil auf dem handy ewig dauert"). */}
          <SchleifenVideo src={thema.video} poster={thema.poster || thema.bild || undefined}
            stumm={!ton} autostart={!voll}
            className={voll ? "object-center" : "object-top"} />
          {voll && onTon && (
            <TonKnopf an={!!ton} label="Sound" labelAus="Sound" onClick={onTon}
              platz="absolute right-2 top-10 z-30" />
          )}
        </>
      ) : thema.bild ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {thema.bild2 && <img src={thema.bild2} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thema.bild} alt=""
            className={`absolute inset-0 h-full w-full object-cover ${voll ? "object-center" : "object-top"} ${aktiv ? "" : "brightness-[0.8]"} ${thema.bild2 ? "lb-swap-top" : ""}`} />
        </>
      ) : (
        <div className="absolute inset-0 grid place-items-center">{thema.platzhalter}</div>
      )}
      {aktiv
        ? <span className="lb-gold absolute right-2 top-2 z-10 rounded-full px-2 py-0.5 text-[10px] font-black shadow">{live}</span>
        : <span className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-black text-white/80 backdrop-blur"><Lock className="h-2.5 w-2.5" /> {bald}</span>}
    </div>
  );
  /* Kein `truncate` am Titel: „Schick einen Kuss an den Menschen, den du liebst" ist der
     Satz, der verkauft — abgeschnitten verkauft er nichts.
     Auf dem Karten-Papier schreibt `.lb-karte` die Farben per !important vor: Titel und
     Zeile werden Tinte, die Schrift ist eine Serife. Deshalb hier KEINE Farbklassen — sie
     würden ohnehin überstimmt (Memory `lb-karte-important-frisst-inline-farben`). Die
     Rangfolge macht das Gewicht. */
  /* IN DER KARTE STEHEN PREIS UND MERKMALE ÜBEREINANDER, nicht nebeneinander (06.08.2026,
     beim Ansehen des Rahmens): Nebeneinander brach die Merkmalzeile um, und ihre zweite
     Zeile lief in die unteren Eckranken. Gestapelt und mittig ist ausserdem die Ordnung
     einer gedruckten Karte — in der Reihe bleibt es nebeneinander, dort gibt das Video
     daneben die Höhe vor. */
  const preiszeile = (
    <div className={voll
      ? "flex flex-col items-center gap-0.5"
      : "mt-1.5 flex items-baseline gap-2"}>
      {/* DER PREIS IST DIE WICHTIGSTE ZEILE — er steht vorn, nicht als Fussnote hinter den
          Merkmalen. Ein Geschenk, dessen Preis man raten muss, verkauft sich nicht. */}
      {/* `lb-karte-gold` wirkt NUR innerhalb von `.lb-karte` — seit die Reihe wieder dunkel
          ist, braucht sie das Haus-Gold als eigene Klasse, sonst stünde der Preis dort in
          schlichtem Weiss (Memory `lb-karte-important-frisst-inline-farben`). */}
      {aktiv && thema.abPreis && (
        <span className={`shrink-0 font-black ${voll ? "lb-karte-gold text-[17px]" : "text-[#f6cf51] text-[15px]"}`}>{thema.abPreis}</span>
      )}
      {/* UMBRECHEN STATT ABSCHNEIDEN. Mit `truncate` endete die Zeile mitten im Wort
          („♥ DEIN GESCHENK · DEINE NACHRICH…") — bei 9px fiel das kaum auf, bei 10px liest
          es sich wie ein Fehler. Zwei Zeilen sind erlaubt; die Höhe gibt ohnehin das Video
          daneben vor. */}
      <span className={`min-w-0 line-clamp-2 text-[10px] font-black uppercase tracking-wide opacity-70 ${voll ? "text-center" : ""}`}>
        {aktiv ? thema.merkmale : baldZeile}
      </span>
    </div>
  );
  /* IN DER VOLLEN GESTALT STEHT DER TITEL OBEN — wie auf jeder Karte des Hauses (Memory
     `karten-fuer-videos`: „Titel oben, made by unten"). Das ist nicht nur Gewohnheit: Die
     Eckranken sitzen in den vier Ecken, und unter dem Bild waere kein Platz mehr fuer sie
     neben dem Text. Oben flankieren sie den Titel, unten die Preiszeile — genau wie sie es
     auf der Einladung tun. Die waagerechten Polster (`px-10`) halten den Text von den
     Ranken frei. */
  /**
   * DIE KACHEL IST EINE ÜBERSCHRIFT, KEINE FUSSNOTE (Owner 06.08.2026, mit zwei
   * Bildschirmfotos nebeneinander: „die Schrift ist zu klein im Vergleich zu oben").
   *
   * Er hat recht, und die Zahlen sagen es auch: Der Titel stand auf 14px, die Zeile darunter
   * auf 11,5px — der Fliesstext der Seite darüber ist 15px (`Lead`). Damit war die
   * Überschrift des Produkts KLEINER als der Erklärtext über ihr, und die Merkmalzeile mit
   * 9px bei 55 % Deckkraft lag unter jedem Lesbarkeits-Boden des Hauses (Skill `ci-design`:
   * Kleingedrucktes nie schwächer als 75 %).
   *
   * Jetzt trägt die Kachel die Rangfolge, die ihr zusteht: Titel 17px über dem 15er-Fliesstext,
   * Zeile 13,5px darunter, Preis 15px — er ist die Zeile, die verkauft. Grösser geht nicht:
   * In der schmalen Reihe stehen daneben 104 Pixel Video, und ein 20er-Titel bräuchte drei
   * Zeilen für „Sende einen Kuss an die Person, die du liebst".
   */
  const text = voll ? null : (
    <div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2.5">
      {/* ZWEIFARBIG WIE JEDE ÜBERSCHRIFT DES HAUSES (Owner 06.08.2026: erst „Und der Titel
          jetzt gelb", nach dem Ansehen „nein, es sieht nicht gut aus … die gelbe schrift",
          dann „zweifarbig"). Ganz in Gold nahm der Titel dem goldenen Preis darunter den
          Rang; so führt der Anfang in Weiss, und das Gold sitzt auf dem Schluss der Zeile —
          dieselbe Teilung, die `SectionTitle` benutzt (`zweifarbig` in Landing.tsx). */}
      <p className="text-[17px] font-black leading-tight">{zweifarbig(thema.titel, { einzelwortGold: false, halb: true })}</p>
      <p className="mt-1 line-clamp-2 text-[13.5px] font-semibold leading-snug opacity-75">{thema.zeile}</p>
      {preiszeile}
    </div>
  );
  /**
   * DIE KACHEL IST EINE KARTE (Owner 06.08.2026: „und die werden in voller breite so wie
   * auch klein wie die cards designt also weiss und abgerundete sachen. In voller breite
   * mit ornamente").
   *
   * Vorher war sie eine dunkle Fläche mit weisser Schrift — dasselbe Grau wie alles andere
   * auf der Seite. Jetzt trägt sie das Papier des Hauses: elfenbein, rund, Serifenschrift,
   * und über die ganze Breite mit den Eckranken, die auch auf der Einladung stehen. Das ist
   * dieselbe Handschrift wie das Produkt selbst — wer die Startseite sieht, sieht schon,
   * was er verschickt.
   *
   * Die Ornamente NUR in der vollen Gestalt: In der schmalen Reihe ist die Kachel 104 Pixel
   * hoch, dort wären vier Ecken nur Krümel.
   *
   * DAS PAPIER BLEIBT DER VOLLEN BREITE (Owner 06.08.2026, beim Ansehen: „die weissen Flächen
   * bei den kleinen gefallen mir gar nicht").
   *
   * Die Regel von oben galt zuerst für BEIDE Gestalten — und in der Reihe wurde daraus etwas
   * anderes, als sie versprach: Eine Karte ist ein Blatt Papier, auf dem etwas STEHT. Neben
   * einer 104-Pixel-Briefmarke bleibt aber kein Blatt übrig, sondern ein weisser Balken, der
   * halb so breit ist wie die Zeile darin — und acht davon untereinander sind eine Leiter aus
   * hellen Klötzen, nicht eine Auslage. Über die ganze Breite stimmt das Bild dagegen: Dort
   * IST die Kachel das Blatt, mit Ranken in den Ecken und dem Video darauf.
   *
   * In der Reihe trägt sie deshalb wieder die dunkle Fläche des Hauses — Rand, Hauch Weiss,
   * weisse Schrift, goldener Preis. Das Video ist dort die Farbe, nicht das Papier.
   */
  const kl = `relative overflow-hidden rounded-[22px] transition-opacity ${voll
    ? "lb-karte block px-4 pb-4 pt-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
    : "flex items-stretch border border-white/15 bg-white/[0.05] text-white"} ${aktiv ? "active:opacity-80" : "opacity-90"} ${className}`;
  /**
   * DIE FEINE INNENLINIE GEHÖRT DAZU (Owner 06.08.2026: „der rahmen fehlt wie bei der
   * Landingpage card. Die Ornamente sind da").
   *
   * Genau wie in `EinladungKarte`: Vier Ranken allein sitzen als Krümel in den Ecken; erst
   * die Linie dazwischen hält sie zusammen und macht daraus eine gedruckte Karte statt vier
   * Verzierungen. Es ist dieselbe Klasse `lb-karte-rahmen` und keine eigene Linie — sie
   * folgt damit ohne Zutun der Ornament-Regel: Tinte im Dunkeln, Blau in der hellen Fassung.
   * Der Schatten kommt aus demselben Grund mit: Ein Blatt Papier liegt auf etwas.
   */
  /* Der Inhalt einer vollen Kachel — als eigene Karte (`voll`) wie als Folie im Karussell
     (`folie`) derselbe. Nur das Papier drumherum unterscheidet sich: Bei der Folie liefert es
     die EINE Karte, in der das Karussell steckt. */
  const vollInhalt = (
    <div className="relative">
      {/* DIESELBE TITELZEILE WIE AUF DER ECHTEN KARTE (Owner 06.08.2026: „ich brauche genau
          das gleiche design. Selbe Schrift wie bei card") — ein Baustein, zwei Orte. */}
      {/* ÜBER DEM VIDEO STEHT NUR DER TITEL (Owner 06.08.2026: „hier ghört nur titel rein
          oben über das video"). Vorher stand die erklärende Zeile mit darüber — das sind
          zwei Textblöcke, bevor man das Video sieht, und auf einer Karte ist oben der Platz
          für die eine Zeile, die den Anlass nennt. Alles Erklärende gehört unter das Bild:
          erst sehen, dann lesen. */}
      <KartenTitel className="px-10">{thema.titel}</KartenTitel>
      <div className="mt-3 overflow-hidden rounded-[14px]">{medien}</div>
      {/* `font-serif` an der Zeile, NICHT an `.lb-karte` — dort war es am 06.08.2026 kurz
          pauschal gesetzt und hat jede Karte im Haus umgestellt, bis hin zu Chips und
          Formularfeldern („du hast die Card kaputt gemacht bei allen"). */}
      <p className="mt-2.5 px-6 text-center font-serif text-[14px] font-semibold leading-snug opacity-75">{thema.zeile}</p>
      {/* `pb-2` hält die letzte Zeile von den unteren Eckranken frei — sie sitzen 8 Pixel
          über dem Rand und sind 28 hoch. */}
      <div className="px-10 pb-2 pt-2">{preiszeile}</div>
    </div>
  );
  /**
   * ALS FOLIE OHNE EIGENES PAPIER (Owner 06.08.2026: „Die Videos müssen in die oberste Karte
   * erscheinen und nicht untereinander. Also im Karussell").
   *
   * Acht Karten untereinander sind acht Versprechen, von denen man sieben wegscrollt — und
   * sie verstossen gegen die Regel des Hauses: nie zwei Karten übereinander (Skill `card`).
   * Die Folie trägt deshalb kein Blatt, keine Ranken und keine Innenlinie; das alles gehört
   * der einen Karte, die das Karussell hält. Anklickbar bleibt sie: Jede Folie führt auf ihr
   * eigenes Thema.
   */
  if (folie) {
    /* DIE FOLIE ENDET AM VIDEO (Owner 06.08.2026: „jetzt die sliderpunkte unter dem video").
       Die Punkte zeichnet das Karussell direkt hinter die Wischbahn — sie stehen also genau
       dort, wo die Folie aufhört. Solange Zeile und Preis mit IN der Folie lagen, hörte sie
       erst darunter auf und die Punkte rutschten ans Ende der ganzen Kachel. Jetzt trägt die
       Folie Titel und Video, den Rest zeigt `ThemenListe` unter den Punkten. */
    const nurBild = (
      <div className="relative">
        <KartenTitel className="px-10">{thema.titel}</KartenTitel>
        <div className="mt-3 overflow-hidden rounded-[14px]">{medien}</div>
      </div>
    );
    /* AUCH DIE FOLIE IST KEIN LINK (Owner 07.08.2026: „das geht nicht play button und klick
       link gleichzeitig auf video"). Auf dem Video liegt der Abspiel-Knopf; der Kaufweg ist
       der CTA, den `ThemenListe` unter die Punkte setzt. */
    return <div className={`block px-1 ${aktiv ? "" : "opacity-90"} ${className}`}>{nurBild}</div>;
  }
  /**
   * DER KAUFKNOPF GEHÖRT IN DIE VORLAGE, NICHT IN DIE SEITE (Owner 07.08.2026: „du hast in
   * der bibliothek den button einfügen müssen in der vorlage. den CTA bei Cards … fehlt" ·
   * auf die Rückfrage, ob einer zu sehen sei: „siehst du das eine CTA?").
   *
   * Die Regel steht seit langem (Landingpage.md, Memory `videos-auf-landingpages`): CTA auf
   * JEDER Karte. Er hing aber an der Themen-LISTE — also hatte die Karte einen, solange sie
   * durch die Liste lief, und keinen, wenn jemand den Baustein direkt nahm. Genau so stand
   * sie auf der Muster-Seite: eine Karte ohne Kaufknopf, in der Bibliothek, als Vorlage für
   * alle. Jetzt trägt ihn die Karte selbst.
   *
   * Gestalt: `lb-karte-cta` (der gelbe Verlauf der Karte, Landingpage.md §3), volle Breite,
   * rund. KEIN `<a>` darin, wenn die Karte schon ein Link ist — ein Link im Link ist
   * ungültiges HTML und tippt unvorhersagbar; die Karte selbst führt ja ans selbe Ziel.
   */
  const kaufknopf = voll && cta && aktiv ? (
    <div className="px-6 pb-1 pt-2.5">
      <a href={thema.href} className="lb-karte-cta flex h-11 items-center justify-center rounded-full text-[13px] font-black transition active:scale-95">
        {cta}
      </a>
    </div>
  ) : null;
  const inhalt = voll ? (
    <>
      <CornerOrnaments />
      <div className="lb-karte-rahmen pointer-events-none absolute inset-[10px] rounded-[14px]" />
      {/* `relative`, damit der Inhalt ÜBER der Linie liegt und nicht von ihr durchkreuzt wird. */}
      {vollInhalt}
      {kaufknopf}
    </>
  ) : (
    <>{medien}{text}</>
  );
  /**
   * DIE VOLLE KARTE IST KEIN LINK — der CTA ist es (Owner 07.08.2026: „das geht nicht play
   * button und klick link gleichzeitig auf video das weisst du doch").
   *
   * Er hat recht, und es war mein Fehler: Auf dem Video liegt seit heute ein Abspiel-Knopf,
   * und die ganze Karte war gleichzeitig ein Link. Damit lagen zwei Ziele auf derselben
   * Fläche — ein Tipp aufs Video hätte gestartet UND weggeführt, und welches von beidem
   * gewinnt, entscheidet die Verschachtelung, nicht die Absicht. (Ein `<a>` im `<a>` ist
   * ausserdem ungültiges HTML.)
   *
   * Die alte Regel „ganze Fläche tippbar" (Landingpage.md) galt für eine Karte OHNE
   * Bedienung darauf. Sobald das Video eigene Knöpfe trägt, muss der Kaufweg ein eigener
   * Knopf sein — dafür steht der CTA jetzt auf jeder Karte. In der schmalen Reihe bleibt
   * die ganze Zeile ein Link: Dort gibt es keinen Abspiel-Knopf, das Video läuft von selbst.
   */
  if (voll) return <div className={kl}>{inhalt}</div>;
  return aktiv
    ? <a href={thema.href} className={kl}>{inhalt}</a>
    : <div className={kl}>{inhalt}</div>;
}

/**
 * WELCHE GESTALT GILT — eine Wahl, die im Browser stehen bleibt.
 *
 * GEWÄHLT WIRD AUF `/ci`, NICHT AUF DER THEMENSEITE (Owner 06.08.2026: „ich habe dir gesagt
 * das wir nicht hier gestalten sondern in der bibliothek"). Der Umschalter stand zuerst über
 * den echten Kacheln im Trichter — falsch: Der Trichter ist die Auslage, nicht die Werkbank.
 * Der Kunde soll die eine Gestalt sehen, für die wir uns entschieden haben, und nicht vor
 * einer Designfrage stehen. Verglichen wird auf der Muster-Seite; was dort gewählt wird,
 * gilt danach überall, weil beide Seiten denselben Eintrag lesen.
 *
 * ABER NUR IN DIESEM BROWSER (Owner 06.08.2026: „ich habe in der Biblio auf volle Breite
 * geschaltet aber online ist es nicht auf live aktiv").
 *
 * Der Eintrag liegt im `localStorage`, und der gehört EINEM Browser auf EINER Adresse. Auf
 * localhost geschaltet, bleibt die Wahl auf localhost; und selbst auf der echten Seite
 * geschaltet, sähe sie nur der Owner — jeder Besucher käme mit leerem Speicher und bekäme
 * die Vorgabe. Der Umschalter ist also ein Vorschaufenster, kein Hebel des Hauses.
 *
 * WAS ALLE SEHEN, STEHT DESHALB HIER: die Vorgabe. Sie ist jetzt `voll` — die Entscheidung
 * ist gefallen, die Kacheln laufen über die ganze Breite mit Ranken und Video. Wer auf `/ci`
 * umschaltet, überstimmt das für sich zum Vergleichen; für die Welt gilt diese Zeile.
 *
 * JETZT IST ES EIN ECHTER SCHALTER (Owner 06.08.2026: „ja mach es"). Die Wahl steht im
 * Zustand auf dem Server (`state.themenGestalt`, gelesen von der Themen-Seite, geschrieben
 * über `/api/themen-gestalt`) — sie gilt für alle und braucht keine Auslieferung. Schreiben
 * darf nur, wer die Admin-Kennung mitschickt; für alle anderen bleibt der Umschalter genau
 * das, was er vorher für jeden war: eine Vorschau im eigenen Browser.
 *
 * `gesetzt` sagt dem Aufrufer, ob in DIESEM Browser überhaupt etwas gewählt wurde. Nur dann
 * überstimmt der Browser-Eintrag die Gestalt vom Server — sonst sähe der Owner auf ewig
 * seine alte Vorschau statt dessen, was er gerade für alle geschaltet hat.
 */
const GESTALT_SCHLUESSEL = "lb-topic-gestalt";
export function useThemenGestalt() {
  /* Vorgabe „reihe" (Owner 07.08.2026: „als default für die topics sind die kleine Reihe
     Cards") — kehrt die Voll-Vorgabe vom 06.08. um; der Server-Schalter kann weiterhin
     beides für alle setzen. */
  const [art, setArt] = useState<"reihe" | "voll">("reihe");
  const [gesetzt, setGesetzt] = useState(false);
  useEffect(() => {
    try {
      const w = localStorage.getItem(GESTALT_SCHLUESSEL);
      if (w === "voll" || w === "reihe") { setArt(w); setGesetzt(true); }
    } catch { /* Privatmodus — dann eben die Vorgabe */ }
    /* Ohne eigene Wahl gilt, was auf dem Server steht — damit zeigt auch die Muster-Seite
       den Stand, der gerade für alle gilt, statt der Vorgabe im Code. */
    void fetch("/api/themen-gestalt", { cache: "no-store" }).then(r => r.json()).then(d => {
      if (d?.art === "reihe" || d?.art === "voll") {
        setArt(a => {
          try { return localStorage.getItem(GESTALT_SCHLUESSEL) ? a : d.art; } catch { return d.art; }
        });
      }
    }).catch(() => {});
  }, []);
  const waehle = (w: "reihe" | "voll") => {
    setGesetzt(true);
    /**
     * FÜR ALLE, WENN DIE KENNUNG DA IST. Der Owner schaltet auf `/ci` und meint damit die
     * ganze Seite — nicht seinen Browser. Die Route lehnt ohne Admin-Kennung ab; dann bleibt
     * es bei der Vorschau hier, und niemand kann das Aussehen der Startseite umstellen,
     * indem er `/ci` öffnet.
     */
    try {
      const pin = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? "";
      if (pin) {
        void fetch("/api/themen-gestalt", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-try-look-admin-pin": pin },
          body: JSON.stringify({ art: w }),
        }).catch(() => {});
      }
    } catch { /**/ }
    setArt(w);
    try { localStorage.setItem(GESTALT_SCHLUESSEL, w); } catch { /**/ }
  };
  return { art, waehle, gesetzt };
}

/** Der Umschalter — gehört auf die Muster-Seite `/ci`, nicht in einen Trichter. */
export function ThemenGestaltWahl({ art, waehle, className = "" }: {
  art: "reihe" | "voll";
  waehle: (w: "reihe" | "voll") => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Gestalt</span>
      <Knopf art="chip" aktiv={art === "reihe"} onClick={() => waehle("reihe")}>Reihe</Knopf>
      <Knopf art="chip" aktiv={art === "voll"} onClick={() => waehle("voll")}>Volle Breite</Knopf>
    </div>
  );
}

/**
 * DIE THEMEN-LISTE — die Kacheln in der gewählten Gestalt. KEIN Umschalter darin: gewählt
 * wird auf `/ci` (siehe `useThemenGestalt`), hier wird nur noch gezeigt.
 */
export function ThemenListe({ themen, live, bald, baldZeile, gestalt, ctaZeile, className = "" }: {
  themen: ThemenKachelDaten[];
  live?: string;
  bald?: string;
  baldZeile?: string;
  /**
   * Die Gestalt vom SERVER — die Themen-Seite liest sie aus dem Zustand und reicht sie
   * herein. Damit steht sie schon im ersten ausgelieferten Bild; der Browser-Eintrag
   * (localStorage) bleibt daneben als persönliche Vorschau und überstimmt sie nur dort,
   * wo jemand auf `/ci` verglichen hat.
   */
  gestalt?: "reihe" | "voll";
  /** Der Kaufknopf unter der vorderen Folie — „CTA auf jeder Karte" (Landingpage.md;
      Owner 07.08.2026: „und hier muss CTA rein"). Der Aufrufer liefert den Wortlaut in
      seiner Sprache; ohne ihn erscheint kein Knopf. */
  ctaZeile?: string;
  className?: string;
}) {
  const { art: gewaehlt, gesetzt } = useThemenGestalt();
  const art = gesetzt ? gewaehlt : (gestalt ?? gewaehlt);
  /** Welche Folie steht vorn — der Text darunter gehört ihr (siehe unten bei `onAktiv`). */
  const [vorn, setVorn] = useState(0);
  /** EIN Ton-Schalter für alle Folien (wie im Feed) — hörbar ist immer nur die vordere. */
  const [ton, setTon] = useState(false);
  /**
   * DIE VOLLE GESTALT IST EINE KARTE MIT KARUSSELL, KEIN STAPEL (Owner 06.08.2026: „laut
   * unser templates. Die Videos müssen in die oberste Karte erscheinen und nicht
   * untereinander. Also im Karussell").
   *
   * Acht Karten untereinander sind acht Blätter Papier auf einer Seite — die Hausregel sagt
   * ausdrücklich: nie zwei Karten übereinander (Skill `card`, Memory `karten-fuer-videos`).
   * Und praktisch verliert es: Wer die erste sieht, scrollt an sieben weiteren vorbei, und
   * jedes Video darunter lädt für jemanden, der nie hinsieht.
   *
   * Also EINE Karte, alle Themen darin zum Wischen — und sie läuft von selbst weiter, damit
   * auch der die anderen sieht, der nicht wischt (`KartenKarussell`). Jede Folie bleibt ihr
   * eigener Weg: Sie führt auf ihr Thema, mit Titel, Zeile und Preis.
   */
  if (art === "voll") {
    return (
      <div className={`lb-karte relative overflow-hidden rounded-[22px] px-4 pb-4 pt-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)] ${className}`}>
        <CornerOrnaments />
        <div className="lb-karte-rahmen pointer-events-none absolute inset-[10px] rounded-[14px]" />
        <div className="relative">
          <KartenKarussell onAktiv={setVorn} folien={themen.map((t, i) => (
            <ThemenKachel key={t.titel} thema={t} art="folie" live={live} bald={bald} baldZeile={baldZeile}
              ton={ton && i === vorn} onTon={() => setTon(v => !v)} />
          ))} />
          {/* DER TEXT DER VORDEREN FOLIE — UNTER DEN PUNKTEN (Owner 06.08.2026: „jetzt die
              sliderpunkte unter dem video"). Die Punkte zeichnet das Karussell direkt hinter
              die Wischbahn; damit sie unmittelbar unter dem Video sitzen, endet die Folie
              dort, und Zeile wie Preis stehen hier — sie wechseln mit der Folie. */}
          {themen[vorn] && (
            <>
              <a href={themen[vorn].href || undefined} className="block">
                <p className="mt-2 px-6 text-center font-serif text-[14px] font-semibold leading-snug opacity-75">
                  {themen[vorn].zeile}
                </p>
                <div className="flex flex-col items-center gap-0.5 px-10 pb-2 pt-2">
                  {themen[vorn].abPreis && (
                    <span className="lb-karte-gold shrink-0 font-serif text-[17px] font-black">{themen[vorn].abPreis}</span>
                  )}
                  <span className="line-clamp-2 text-center text-[10px] font-black uppercase tracking-wide opacity-70">
                    {themen[vorn].href ? themen[vorn].merkmale : baldZeile}
                  </span>
                </div>
              </a>
              {/* DER KAUFKNOPF — eigener Link NEBEN dem Text-Link, nie darin (ein <a> im
                  <a> ist ungültig und tippt unvorhersagbar). Gestalt wie jeder Knopf in
                  der Karte: `lb-karte-cta`, volle Breite, rund (Landingpage.md §3). */}
              {ctaZeile && themen[vorn].href && (
                <a href={themen[vorn].href}
                  className="lb-karte-cta mx-6 mb-1 flex h-11 items-center justify-center rounded-full text-[13px] font-black transition active:scale-95">
                  {ctaZeile}
                </a>
              )}
            </>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className={`grid grid-cols-1 gap-3 ${className}`}>
      {themen.map(t => (
        <ThemenKachel key={t.titel} thema={t} art={art} live={live} bald={bald} baldZeile={baldZeile} />
      ))}
    </div>
  );
}

/**
 * DIE HERKUNFTSZEILE — „made by luxurybandit.com" unter jeder Karte (Skill `card`, Memory
 * `karten-fuer-videos`: Titel oben, diese Zeile unten). Sie ist ein LINK (Owner 06.08.2026:
 * „Made by Luxurybandit.com und auch link drauf") — ein Tipp führt heim, und weil jede
 * verschickte Karte bei Fremden landet, ist das die Zeile, über die das Haus gefunden wird.
 *
 * IN DER KARTE IST SIE EIN AKTIVER CHIP (Owner 06.08.2026: „das als aktiver chip machen in
 * der karte"). Vorher stand sie als blasse Grossbuchstaben-Zeile auf 70 % Deckkraft da —
 * lesbar, aber nichts, was nach „hier kann man tippen" aussah, obwohl genau das der Zweck
 * ist. Als umrandeter Chip trägt sie dieselbe Gestalt wie jede andere getroffene Wahl im
 * Haus, und man sieht, dass sie irgendwohin führt.
 *
 * Sie stand am 06.08. an fünf Stellen von Hand im Code — dieselben Klassen, fünfmal
 * abgetippt.
 */
export function MadeBy({ karte = false, className = "" }: {
  karte?: boolean;
  className?: string;
}) {
  return (
    <a href="/?utm_source=karte"
      className={karte
        ? `lb-karte-rahmen lb-karte-gold mx-auto mt-3 flex w-fit items-center justify-center rounded-full px-3.5 py-1.5 text-center text-[9px] font-bold uppercase tracking-[0.22em] ${className}`
        : `block pb-3 text-center text-[10px] font-black uppercase tracking-[0.16em] text-white/30 ${className}`}>
      made by luxurybandit.com
    </a>
  );
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

/**
 * BILDWAHL — eine Reihe Bildkacheln, aus denen genau EINE gewählt ist.
 *
 * Owner 07.08.2026: „Die Leute werden sich den look aussehen wollen. Die müssen absolut
 * cool werden." Bis dahin gab es diese Reihe nur handgerollt im Kuss-Trichter (die
 * Garderoben-Kacheln) — mit eigenem Rand, eigener Grösse, eigenem Wisch-Verhalten. Der
 * Geburtstag hätte sie ein zweites Mal gebraucht, und ab da wären es zwei Fassungen
 * gewesen, die auseinanderlaufen.
 *
 * DREI DINGE, DIE MAN LEICHT FALSCH MACHT und die hier eingebaut sind:
 *
 * 1. DIE AUSWAHL MUSS MAN SEHEN, AUCH AUF EINEM DUNKLEN BILD. Ein Rand in Weiss oder
 *    Gelb verschwindet auf einem hellen bzw. goldenen Motiv. Deshalb liegt die gewählte
 *    Kachel in einem gelben RING MIT ABSTAND (`ring-2` + `ring-offset-2` auf dem dunklen
 *    Grund) — der Abstand trennt ihn vom Bild, egal was darauf ist.
 * 2. DIE REIHE WISCHT, OHNE BALKEN — Klasse `lb-wisch` (Hausregel seit 06.08.2026). Ohne
 *    sie steht auf dem Handy ein grauer Balken unter den Kacheln.
 * 3. DAS WORT GEHOERT UNTER DAS BILD, nicht darauf. Schrift auf einem beliebigen Foto ist
 *    mal lesbar und mal nicht; darunter ist sie es immer.
 *
 * Kein `karte`-Schalter: Diese Reihe steht im Trichter auf der dunklen Welt, nie in der
 * !important-Welt der Einladungskarte.
 */
export function BildWahl({ bilder, wert, waehle, gross = false, className = "" }: {
  bilder: { id: string; name: string; bild: string }[];
  /** Die Kennung der gewählten Kachel. */
  wert: string;
  waehle: (id: string) => void;
  /**
   * SLIDES STATT KACHEL-REIHE (Owner 08.08.2026: „als Slide die Bilder presentieren").
   * Grosse 3:4-Bilder zum Wischen mit Einrasten (`snap`) — man sieht, WAS man wählt,
   * nicht eine Briefmarke davon. Ring-Regeln identisch zur kleinen Reihe: beide
   * Zustände tragen denselben Ring, es wechselt nur die Farbe.
   */
  gross?: boolean;
  className?: string;
}) {
  return (
    /**
     * DIE POLSTERUNG IST NICHT KOSMETIK (Owner 07.08.2026, mit Bild: „Der Rahmen ist
     * abgeschnitten bei Bild 1"): Ein Ring liegt AUSSERHALB der Kachel, und eine
     * Wisch-Fläche schneidet alles ab, was über ihren Rand ragt — bei der ersten und der
     * letzten Kachel also genau die Hälfte des Rings. Die 6 px ringsum sind der Platz, den
     * er braucht. `px-1.5` statt `pl-1.5`, sonst fehlt er am anderen Ende.
     */
    /* `items-start`: Ein Knopf zentriert seinen Inhalt senkrecht. Braucht EIN Wort zwei
       Zeilen („Gold & Confetti") und das daneben nur eine, wird der hohe Knopf mittig
       ausgerichtet — und sein Bild sass sieben Pixel hoeher als das Nachbarbild. Oben
       ausgerichtet stehen alle Kacheln auf derselben Linie, egal wie lang ihr Name ist. */
    <div className={`lb-wisch flex items-start overflow-x-auto px-1.5 py-1.5 ${gross ? "snap-x snap-mandatory gap-3" : "gap-2"} ${className}`}>
      {bilder.map(b => {
        const an = b.id === wert;
        return (
          <button key={b.id} type="button" onClick={() => waehle(b.id)}
            aria-pressed={an}
            className={`shrink-0 text-center transition active:scale-95 ${gross ? "snap-center" : ""}`}>
            {/**
              * DAS MASS STEHT AM RAHMEN, NICHT AM BILD (Owner 07.08.2026: „bei 2 das Bild
              * füllt nicht das format"). Trug das `img` die Grösse, bestimmte der Ring die
              * Grösse des Rahmens mit — und ein Bild mit anderem Seitenverhältnis liess
              * Rand stehen, statt die Fläche zu füllen. Jetzt hat der Rahmen ein festes
              * Mass, und das Bild füllt ihn (`h-full w-full object-cover`), egal welches
              * Verhältnis die Datei hat.
              */}
            {/**
              * DIE GROSSE KACHEL IST 160x213 (Owner 09.08.2026, mit Bild der Look-Wahl:
              * „die sind hier zu gross"). Vorher 220x293 — davon passte auf einem iPhone
              * genau EINE Kachel plus ein Streifen der naechsten auf den Schirm, und die
              * Wahl sah aus wie ein einzelnes Bild statt wie eine Auswahl. Jetzt stehen
              * zwei nebeneinander und die dritte lugt herein: Man SIEHT, dass es etwas zu
              * waehlen gibt. Das Verhaeltnis 3:4 bleibt, damit kein Bild beschnitten wird.
              *
              * NUR DIE FARBE WECHSELT, NIE DIE GEOMETRIE (Owner 07.08.2026, mit Bild: „oh
              * Mann, man versetzt niemals Bilder").
              *
              * Hier stand `ring-2 … ring-offset-2` fuer die Wahl und `ring-1` daneben. Ein
              * Ring liegt AUSSERHALB der Flaeche: Die gewaehlte Kachel wuchs damit um acht
              * Pixel, und das Bild darin sass eine Zeile hoeher als sein Nachbar. Beim
              * Antippen sprang die ganze Reihe.
              *
              * Jetzt tragen BEIDE Zustaende denselben Ring und denselben Abstand — es
              * wechselt ausschliesslich die Farbe. Der dunkle Abstandsring bleibt in beiden
              * Faellen: Ohne ihn verschwindet Gold auf einem goldenen Motiv.
              */}
            <span className={`block overflow-hidden ring-2 ring-offset-2 ring-offset-[#0b0a09] ${gross ? "h-[213px] w-[160px] rounded-2xl" : "h-[104px] w-[78px] rounded-xl"} ${an
              ? "ring-[#f6cf51]"
              : "ring-white/15"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.bild} alt={b.name} className="block h-full w-full object-cover" />
            </span>
            <span className={`mt-1.5 block font-black leading-tight ${gross ? "max-w-[160px] text-[13px]" : "max-w-[78px] text-[11px]"} ${an ? "text-[#f6cf51]" : "text-white/70"}`}>
              {b.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
