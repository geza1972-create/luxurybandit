"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { X, Loader2, Lock, ShieldCheck, Heart, Gift, Cake, Palmtree, MessageCircle, Sparkles, LayoutGrid, Shirt, Eye, EyeOff, ChevronLeft, ChevronRight, ImageUp, Trash2, Maximize2, type LucideIcon } from "lucide-react";
import SchleifenVideo from "@/components/SchleifenVideo";
import TonKnopf from "@/components/TonKnopf";
import EinladungKarte from "@/components/EinladungKarte";
import { CornerOrnaments } from "@/components/BoxOrnaments";
import { zweifarbig } from "@/components/Landing";
import KartenKarussell from "@/components/KartenKarussell";
import { kissText } from "@/lib/kiss-i18n";
import { logTunnelEvent } from "@/lib/track-funnel";
import { kontoText } from "@/lib/konto-i18n";
import { istInAppBrowser, istAndroid, chromeIntentUrl } from "@/lib/browser-erkennen";
import { pruefeEmail, emailFehlerText } from "@/lib/email-pruefen";
import { eur } from "@/lib/pricing";
import { deckendeStufen, stueckJeStufe } from "@/lib/kasse";

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
 * DER SYMBOL-KNOPF — das runde Zeichen in der KOPFZEILE (Owner 11.08.2026: „Das Icon für
 * Login soll nach CI sein, aus der Bibliothek und neben dem Share Button.").
 *
 * ER IST NICHT DIE `Scheibe`. Die ist weiss und liegt AUF einem Bild oder einer Karte, wo sie
 * sich vom Motiv abheben muss. Hier geht es um die dunkle Leiste am Kopf jeder Seite: dünner
 * Rand, ein Hauch Weiss, Symbol in Weiss/80 — die Gestalt, die der Teilen-Knopf dort seit je
 * trägt. Sie stand bisher nur als abgetippte Klassenzeile (`iconBtn`) in `TopNav`; wer ein
 * zweites Zeichen daneben brauchte, musste sie abschreiben. Genau davor steht diese
 * Bibliothek (Skill `ci-design`: ein fehlender Baustein kommt HIER hinein, statt an Ort und
 * Stelle nachgebaut zu werden).
 *
 * WOFÜR DIE NÄCHSTE STELLE IHN NEHMEN SOLL: für jedes runde Symbol in einer dunklen Leiste —
 * Kopfzeile, Werkzeugreihen, Dialog-Kopfzeilen. Nicht für Symbole auf Bildern (das ist die
 * `Scheibe`) und nicht als Ersatz für einen beschrifteten `Knopf`.
 *
 * DER ANZEIGER-PUNKT gehört dazu, weil ein Zeichen allein nur sagt, WAS es tut, nie, wie es
 * gerade STEHT: angemeldet (grün), es rendert etwas (Gold, pulsierend, wie am Galerie-Chip),
 * ungelesen. Er sitzt oben rechts und trägt einen Ring in der Farbe der Leiste, damit er ein
 * Punkt bleibt und nicht mit dem Rand des Zeichens verschmilzt.
 */
export const ANZEIGER_GRUEN = "#22c55e";
/**
 * DER ZWEITE ANZEIGER — GOLD FÜR DEN ADMIN (Owner 11.08.2026: „das will ich aber auch noch
 * mit einem zusatz punkt sehen ob ich als admin angemeldet bin").
 *
 * ZWEI PUNKTE, WEIL ES ZWEI AUSWEISE SIND, und der Owner hat sich an genau dieser Verwechslung
 * gestossen („wieso admin? ich bin doch als tigl angemeldet"): Die Anmeldung ist das
 * Kundenkonto und sagt, WEM Guthaben und Werke gehören. Der Admin-PIN liegt daneben im Gerät
 * und entscheidet, ob er ALLES sieht statt nur seins. Beides ist unabhängig — man kann
 * angemeldet ohne Admin sein und Admin ohne Anmeldung. Ein einziger Punkt könnte das nie
 * zeigen; deshalb rechts das Konto (grün), links der Admin (Gold, die Hausfarbe der
 * Auszeichnung).
 */
export const ANZEIGER_GOLD = "#f6cf51";
export function SymbolKnopf({ onClick, label, punkt, punktLinks, punktRing = "#0d0b0a", pulsiert = false, className = "", children }: {
  onClick?: () => void;
  /** Vorlesetext — Pflicht, der Knopf zeigt nur ein Symbol. */
  label: string;
  /** Die Farbe des Anzeigers oben RECHTS, z. B. `ANZEIGER_GRUEN`. Ohne ihn kein Punkt. */
  punkt?: string;
  /** Ein ZWEITER Anzeiger oben LINKS für einen unabhängigen Zustand (z. B. `ANZEIGER_GOLD`
   *  für den Admin-Ausweis neben der Anmeldung). Nur benutzen, wenn die beiden Zustände
   *  wirklich unabhängig sind — sonst genügt eine andere Farbe im rechten Punkt. */
  punktLinks?: string;
  /** Die Farbe der Fläche, auf der er sitzt — der Ring trennt ihn davon ab. */
  punktRing?: string;
  pulsiert?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label}
      className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition hover:text-white active:scale-90 ${className}`}>
      {children}
      {/* `data-punkt`: In der hellen Anzeigen-Fassung sitzt der Knopf auf BLAU — der feste
          dunkle Trenn-Ring (#0d0b0a) wurde dort zum „blöden schwarzen Kreis" (Owner
          12.08.2026). Eine globals-Regel färbt den Ring dort auf das Kopfzeilen-Blau um;
          Inline-Farben verlieren gegen !important, deshalb der Daten-Anker. */}
      {punkt && (
        <span aria-hidden data-punkt="1"
          className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ${pulsiert ? "animate-pulse" : ""}`}
          style={{ background: punkt, boxShadow: `0 0 0 2px ${punktRing}` }} />
      )}
      {punktLinks && (
        <span aria-hidden data-punkt="1"
          className="absolute -left-0.5 -top-0.5 h-2.5 w-2.5 rounded-full"
          style={{ background: punktLinks, boxShadow: `0 0 0 2px ${punktRing}` }} />
      )}
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
export function Knopf({ art = "gold", aktiv = false, karte = false, hell = false, onClick, disabled = false, className = "", href, children }: {
  art?: "gold" | "umriss" | "chip";
  /** Nur für `chip`: ist diese Wahl gerade gewählt? */
  aktiv?: boolean;
  karte?: boolean;
  /**
   * AUF WEISSEM GRUND (Owner 10.08.2026: „mach das Dialog in light. Ich denke wenn es um
   * zahlung geht, vertrauen menschen mehr den hellen farben").
   *
   * Die dunkle Fassung eines Chips lebt von weissen Rändern auf 20 % — auf Weiss ist das
   * unsichtbar, und ein Betrag, den man nicht sieht, wird nicht angetippt. Dieselbe Form,
   * dieselben Masse, nur in Tinte statt Weiss: Der gewählte trägt den vollen Rand, der
   * ungewählte den leisen — verschoben wird nichts (Hausregel „Auswahl verschiebt NIE").
   */
  hell?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  /**
   * KEINE EMOJIS/ZEICHEN IN KNÖPFEN (Owner 12.08.2026, am Kaufknopf „🎬Future Self
   * Program — 9,99 €": „auch in dem Button machst du da komische zeichen. Die raus und
   * zwar im CI Bibliothek"). Ein Knopf trägt TEXT (und Preis) — kein Emoji, kein
   * Themen-Zeichen davor. Erlaubt bleibt allein der Lade-Kreisel während einer Aktion.
   * Die Regel gilt für JEDEN Knopf im Haus, auch die noch nicht migrierten Handbauten.
   */
  /**
   * ALS LINK STATT KNOPF (Owner 12.08.2026: „seit wann haben wir weisse schrift in Buttons?
   * … Du bist nicht in der Lage nach CI zu arbeiten" — an einem von DREI handgebauten
   * `<a class="lb-gold">`-Nachbauten des Programm-Knopfs). Wer ein Kauf-/Weiter-Ziel als
   * Link braucht, reicht `href` — derselbe Baustein, dieselben Klassen, dieselbe Tinte.
   * Nie wieder ein nachgebautes `<a>`, das die Schriftfarbe seines Umfelds erbt.
   */
  href?: string;
  children: ReactNode;
}) {
  const kl = art === "gold"
    /* `text-[#1a1204]` steht AUSDRÜCKLICH hier, obwohl `.lb-gold` dieselbe Tinte setzt:
       Die Klassen-Regel ist ohne !important und verliert gegen jede spätere Kontext-Regel —
       genau so wurde der Programm-Knopf irgendwo weiss. Die helle Anzeigen-Fassung
       (`.lb-fb .lb-gold` mit !important, weiss auf Blau) gewinnt weiterhin, wie gewollt. */
    ? "lb-gold flex h-12 w-full items-center justify-center gap-2 rounded-full font-black text-[#1a1204]"
    : art === "umriss"
      ? (karte
        ? "lb-karte-absage flex h-11 w-full items-center justify-center gap-2 rounded-full text-[13px] font-black"
        /* IM WEISSEN DIALOG WAR DER ZWEITWEG UNSICHTBAR (Owner 11.08.2026, beim Bau des
           Fensters für den toten Anmelde-Link): Der Umriss-Knopf kannte nur `text-white/85`
           — auf Weiss ein leerer Streifen, und der Ausweg „Später" war damit gar nicht da.
           Eine Farbklasse von aussen half nicht: Bei zwei Tailwind-Farben derselben Stärke
           entscheidet die Reihenfolge im Stylesheet, nicht die im String. Deshalb gehört die
           helle Fassung an den Baustein — dieselbe Form, nur in Tinte statt Weiss. */
        : hell
          ? "flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[#1a160f]/25 text-[13px] font-black text-[#1a160f]/85"
          : "flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/25 text-[13px] font-black text-white/85")
      : /* chip */ (hell
        // Die helle Fassung steht bewusst NICHT in `lb-wahl`: Jene Klasse gehört der
        // Anzeigen-Landung (`.lb-fb`), die alles Gelbe blau überschreibt. Hier geht es um
        // einen weissen Dialog INNERHALB der dunklen Welt — Tinte statt Weiss, sonst nichts.
        ? `flex min-h-11 items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-center text-[12px] font-black leading-tight ${aktiv
          ? "border-[#1a160f]/45 bg-[#1a160f]/[0.07] text-[#1a160f]"
          : "border-[#1a160f]/20 bg-[#1a160f]/[0.03] text-[#1a160f]/85"}`
        : karte
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
    /* `select-none` — EIN KNOPF IST KEIN TEXT (Owner 11.08.2026, mit Bild eines Chips, dessen
       Wort blau markiert war: „das ist ein fehler"). Auf dem Handy markiert ein etwas längerer
       Tipp die Beschriftung, statt zu schalten; die blaue Auswahl bleibt danach stehen und
       sieht aus wie ein kaputtes Element. Gehört an den Baustein, nicht an die einzelne
       Stelle: Es gilt für jeden Knopf und Chip im Haus. */
    href ? (
      /* Dieselben Klassen, dasselbe Verhalten — nur als Link (`target="_self"`: Kauf- und
         Programm-Ziele gehören in DENSELBEN Tab, ein neuer wäre die falsche Gewohnheit). */
      <a href={href} target="_self" onClick={onClick}
        className={`${kl} select-none transition active:scale-95 ${className}`}>
        {children}
      </a>
    ) : (
    <button type="button" onClick={onClick} disabled={disabled}
      {...(art === "chip" ? { "aria-pressed": aktiv } : {})}
      className={`${kl} select-none transition active:scale-95 disabled:opacity-60 ${className}`}>
      {children}
    </button>
    )
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
export function Eingabe({ karte = false, hell = false, className = "", ...rest }: {
  karte?: boolean;
  /**
   * IM WEISSEN DIALOG (Owner 11.08.2026, zum toten Anmelde-Link: „sollte aber nicht kommen,
   * Sitzung abgelaufen? Neuen Link schicken?").
   *
   * Der Baustein kannte bisher nur die dunkle Welt — weisse Schrift auf einem Hauch Weiss.
   * In einem hellen Dialog (`Dialog art="hell"`) ist das Weiss auf Weiss: ein Feld, in dem
   * man seine eigene Adresse nicht lesen kann. Die Aufladewahl hatte sich deshalb ein
   * eigenes Feld gebaut; damit gab es wieder zwei Umsetzungen derselben Sache. Jetzt trägt
   * der Baustein beide Welten. `WebkitTextFillColor` ist kein Zierrat: Safari färbt eine
   * automatisch ausgefüllte Adresse sonst nach seinem eigenen Gutdünken.
   *
   * KEIN `lb-eingabe` in der hellen Fassung — jene Kennung gehört der Anzeigen-Landung
   * (`.lb-fb`), die das Feld ein zweites Mal umfärben würde.
   */
  hell?: boolean;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  /**
   * DAS AUGE AM PASSWORTFELD (Owner 11.08.2026, mit Bild des Anmelde-Dialogs: „auge bei
   * Passwort").
   *
   * ES SITZT IM BAUSTEIN, NICHT AN DER STELLE: Jedes Passwortfeld im Haus braucht es, und ein
   * Feld, das man nicht prüfen kann, ist der häufigste Grund für „falsches Passwort" —
   * besonders auf dem Handy, wo die Tastatur gross schreibt, was klein gemeint war. Die
   * aufrufende Datei setzt nur `type="password"` wie immer und bekommt das Auge dazu.
   *
   * DIE HÜLLE ENTSTEHT NUR FÜR PASSWÖRTER: Jedes andere Feld bleibt ein nacktes `input`, damit
   * sich nichts an Ausrichtung und Abständen der bestehenden Formulare verschiebt.
   *
   * `pr-11` macht rechts Platz, damit der eingegebene Text nicht unter das Auge läuft.
   */
  const [sichtbar, setSichtbar] = useState(false);
  const istPasswort = rest.type === "password";
  const tinte = karte || hell ? "#1a160f" : "#fff";
  const feld = (
    <input {...rest}
      type={istPasswort && sichtbar ? "text" : rest.type}
      style={hell ? { color: "#1a160f", WebkitTextFillColor: "#1a160f", caretColor: "#1a160f", ...(rest.style ?? {}) } : rest.style}
      /**
       * DREI FASSUNGEN, EINE GESTALT (Owner 11.08.2026, nach zwei Anläufen im Anmelde-Dialog:
       * „ich fasse es nicht. Mach extra in die Bibliothek CI für eingabefelder").
       *
       * Er hat recht, und der Fehler lag hier, nicht an der Stelle, die den Baustein benutzt.
       * Die helle Fassung trug `font-bold` — das gilt in CSS auch für den PLATZHALTER. Zwei
       * fette dunkle Zeilen im weissen Dialog lasen sich deshalb wie schon eingetippter Text
       * oder wie Überschriften, nicht wie leere Felder. (Die zentrierte Ausrichtung kam
       * obendrauf, aber die stand in der aufrufenden Datei.)
       *
       * MASSGEBLICH IST DIE KARTEN-FASSUNG (`lb-karte-feld` in globals.css): Grund als Hauch
       * der Tinte, Rand 30 %, Schrift in Tinte, Platzhalter auf 45 % — und NICHTS ist dort
       * fett. Genau das bildet die helle Fassung jetzt nach, nur auf Weiss statt auf Creme.
       * Wer eine vierte Welt braucht, gibt ihr hier eine Zeile; niemand baut sich draussen
       * wieder ein eigenes Feld.
       *
       * GEMEINSAM FÜR ALLE DREI: Höhe 11, Serifenschrift, 15 px, LINKSBÜNDIG. Ein Feld ist
       * kein Titel — zentrierter Text wandert beim Tippen unter dem Finger weg.
       */
      className={`h-11 w-full rounded-lg px-3 font-serif text-[15px] font-normal outline-none ${karte
        ? "lb-karte-feld"
        : hell
          ? "border border-[#1a160f]/30 bg-[#1a160f]/[0.04] placeholder:text-[#1a160f]/45 focus:border-[#1a160f]/75"
          : "lb-eingabe border border-white/30 bg-white/[0.08] text-white placeholder:text-white/60 focus:border-[#f6cf51]"} ${istPasswort ? "pr-11" : ""} ${className}`} />
  );
  if (!istPasswort) return feld;
  return (
    <div className="relative">
      {feld}
      <button type="button" tabIndex={-1}
        onClick={() => setSichtbar(s => !s)}
        aria-label={sichtbar ? "Passwort verbergen" : "Passwort anzeigen"}
        style={{ color: tinte }}
        className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md opacity-55 transition active:scale-95 hover:opacity-90">
        {sichtbar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
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
 * DAS GOOGLE-G — das echte Zeichen, in seinen vier Farben, gezeichnet statt geladen (kein
 * Netzaufruf im Anmeldefenster, keine fremde Adresse). Es ist das einzige Stück fremder Marke
 * hier: Der Knopf darum ist unserer.
 *
 * AUS `components/KontoChip.tsx` HIERHER GEZOGEN (Owner 12.08.2026: „auch googgle anmeldung
 * kannst du einbauen" — im Tunnel-Baustein). Es stand nur dort, ausserhalb der Bibliothek —
 * ein zweiter Ort hätte hier zu einer zweiten, leicht abweichenden Zeichnung des G geführt.
 * Jetzt holen sich KontoChip UND `TunnelStart` dasselbe Zeichen von hier.
 */
export function GoogleG({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={`shrink-0 ${className}`}>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2.5 24 .5 14.6.5 6.5 5.9 2.6 13.7l7.8 6.1C12.3 14 17.7 9.5 24 9.5Z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.2-.4-4.7H24v9h12.7c-.6 3-2.3 5.6-4.9 7.3l7.6 5.9c4.4-4.1 7.1-10.2 7.1-17.5Z" />
      <path fill="#FBBC05" d="M10.4 28.2a14.5 14.5 0 0 1 0-9.3l-7.8-6.1a23.5 23.5 0 0 0 0 21.5l7.8-6.1Z" />
      <path fill="#34A853" d="M24 47.5c6.2 0 11.5-2 15.4-5.6l-7.6-5.9c-2.1 1.4-4.8 2.3-7.8 2.3-6.3 0-11.7-4.5-13.6-10.4l-7.8 6.1C6.5 42.1 14.6 47.5 24 47.5Z" />
    </svg>
  );
}

/**
 * DER GOOGLE-KNOPF — EIN BAUSTEIN, ZWEI STELLEN (KontoChip und `TunnelStart`). Owner
 * 11.08.2026, beim Konto-Fenster: „dann kannst du auch google button einbauen" — Gestalt:
 * der Umriss-Knopf der Bibliothek (`Knopf art="umriss"`) in seiner jeweiligen Fassung, KEIN
 * nachgebauter Google-Knopf. Nur das Zeichen ist die echte, vierfarbige Marke; die Fläche
 * bleibt unsere.
 *
 * `hell` reicht einfach an `Knopf` durch — im Anmelde-Fenster (weisser Dialog) true, im
 * dunklen Tunnel false. `karte` gibt es hier bewusst nicht: Ein Google-Knopf gehört nie auf
 * die elfenbeinfarbene Einladungskarte.
 */
export function GoogleKnopf({ label, hell = false, onClick, className = "" }: {
  label: string;
  hell?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Knopf art="umriss" hell={hell} onClick={onClick} className={className}>
      <GoogleG /> {label}
    </Knopf>
  );
}

/**
 * DER TUNNEL-START — SCHRITT 1 VON ZWEI, FÜR JEDES PRODUKT GLEICH (Owner 12.08.2026:
 * „also Stepp 1. Name, Email, Stepp zwei das was stepp drei ist wo links ein platzahlter
 * ist für Foto oder Video upload dann generieren." · „Genauso müssen alle tunels
 * aussehen. nicht komplizierter." · „bitte mach erst mal ein kleines konzept damit du
 * das überall einheitlich durchziehst." — siehe KONZEPT-TUNNEL.md, der verbindliche
 * Bauplan).
 *
 * EINE KARTE, ZWEI FELDER, EIN KNOPF „WEITER". Der Lead ist GESPEICHERT, sobald „Weiter"
 * gedrückt ist — dafür ruft der Aufrufer in `onWeiter` die BESTEHENDE Lead-/Tor-Logik auf
 * (z. B. `/api/kiss-claim`). Dieser Baustein kennt das Produkt nicht und erfindet keinen
 * eigenen Endpunkt; er sammelt nur die zwei Felder ein und prüft sie.
 *
 * DIE FELDER SEHEN NACH FELDERN AUS (Owner: „Max sieht nicht aus wie ein Eingabefeld") —
 * sichtbarer Rand, Label darüber, aus `Eingabe` (derselbe Baustein wie überall im Haus).
 *
 * DIE E-MAIL-PRÜFUNG IST DIESELBE WIE AN DER KASSE (`lib/email-pruefen`, dieselbe Sperre
 * gegen Wegwerf-/Phantasieadressen) — der Fehler steht ROT DIREKT AM FELD (`Fehlerzeile`,
 * Memory „sichtbare-fehler-keine-formularfelder"), nicht als allgemeine Statuszeile.
 *
 * OHNE ANMELDE-/NAMENSFRAGE, WENN WIR IHN SCHON KENNEN: Dieser Baustein selbst weiss davon
 * nichts — das Überspringen des ganzen Schritts entscheidet der Aufrufer (er rendert
 * `TunnelStart` dann schlicht nicht), damit die Regel an einer Stelle bleibt: der Seite,
 * die weiss, ob eine Adresse schon vorliegt.
 */
/**
 * DIE VORLAGEN-KACHEL — TIPPEN ZEIGT DAS ECHTE VIDEO (Owner 12.08.2026, wörtlich: „wenn user
 * ein Video generiert dann muss er die Vorlage genau als Video sehen. Also es soll sich mit
 * klick die Vorlage öffnen. Vestanden? Das gilt für den ganzen Tunel.").
 *
 * WARUM ES DAS BRAUCHT: Die rechte Kachel im Tunnel (Schritt 3) zeigt bisher nur ein
 * Standbild der Vorlage — Villa & Sportwagen, ein Look, ihr Model. Wer dafür bezahlt, soll
 * vorher SEHEN, was er kauft: das fertige Beispiel als Video, nicht als Ahnung. Ohne
 * `videoUrl` bleibt die Kachel, was sie war — ein Bild, kein toter Klick (Owner: „Ein Knopf,
 * der nichts tut, ist schlimmer als keiner", Skill `card`).
 *
 * EIGENE ÜBERLAGERUNG STATT BROWSER-VOLLBILD (Skill `card`, `EinladungAnsicht`s Lehre vom
 * 04.08.2026): `requestFullscreen()` wird in eingebetteten Ansichten und auf etlichen Handys
 * stillschweigend abgelehnt. `position: fixed` über die ganze Seite braucht keine
 * Browser-Erlaubnis.
 *
 * IMMER EIN AUSGANG (Memory „immer-close-einbauen"): sichtbare weisse Scheibe mit Kreuz,
 * Escape schliesst, die Seite dahinter scrollt nicht mit — dieselben drei Wege wie überall im
 * Haus, keine vierte Erfindung.
 *
 * POSTER PFLICHT (Skill `card`: „nie wieder ohne Poster"): `posterUrl` faellt auf `bildUrl`
 * zurück — die Vorlagen-Kachel HAT ohnehin schon ihr Bild, ein Video ohne dessen Standbild
 * als Rueckfall waere eine neue Luecke, die es nicht braucht.
 */
/**
 * OB EINE KACHEL IM BILD STEHT — EIN BEOBACHTER FÜR ALLE STUMMEN VORSCHAU-VIDEOS (Owner
 * 12.08.2026, wörtlich: „Man muss die Videos sehen im ganzen Tunel. Sonst sind es
 * bilder" → „ok, bauen").
 *
 * WARUM NICHT EINFACH ALLE AUTOSTARTEN: Eine Wisch-Reihe zeigt bis zu vier Kacheln auf
 * einmal, ein Trichter-Schritt oft zwei nebeneinander — liefe jede sofort, laedt das
 * Handy vier bis sechs Videos gleichzeitig, nur damit zwei davon je sichtbar sind. Der
 * `IntersectionObserver` haelt fest, WELCHE Kachel wirklich im Bild steht, und nur die
 * bekommt ihr `<video>`-Element; scrollt sie hinaus, wird es wieder abgehaengt (kein
 * `src`, kein laufender Player im Hintergrund).
 */
function useKachelSichtbar<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [sichtbar, setSichtbar] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setSichtbar(true); return; }
    const beobachter = new IntersectionObserver(([eintrag]) => setSichtbar(!!eintrag?.isIntersecting), { threshold: 0.35 });
    beobachter.observe(el);
    return () => beobachter.disconnect();
  }, []);
  return [ref, sichtbar] as const;
}

/**
 * DIE KARTE ZEIGEN, NICHT DAS BLANKE VIDEO (Owner 12.08.2026, wörtlich: „und wir sollen die
 * karten zeigen, die erzeugt werden beim vrgrössern. Deswegen haben wir die karten gemacht
 * und nicht das blanke video").
 *
 * BIS HEUTE FUELLTE DAS VIDEO DIE GANZE SCHWARZE FLAECHE — genau die Hausregel gebrochen, die
 * die Karte erst ins Haus gebracht hat (Memory `karten-fuer-videos`, Skill `card`: nie ein
 * nacktes `<video>`). Jetzt liegt hier dieselbe `EinladungKarte`, die auch die
 * Landingpage-Beispiele zeigt (`ExampleVideos`, `BeispielGalerie`, `WochenBotschaft` in
 * app/future-program/page.tsx) — Titel oben, Ornamente, „made by luxurybandit.com" unten,
 * `demo`-Fassung (kein antippbarer Name/Ort, es ist eine Vorschau, keine echte Einladung).
 *
 * `sprache`/`titel` ALS PROPS, WEIL DIE UEBERLAGERUNG DAS THEMA NICHT KENNT: Sie wird von
 * `BildWahl` und `VorlagenKachel` aus jedem Tunnel heraus geoeffnet — nur der Aufrufer weiss,
 * in welcher Sprache die Seite laeuft und wie seine Karte ueberschrieben ist (er reicht dafuer
 * denselben Kartengruss, den er ohnehin aus `kissText` hat). Ohne `sprache` faellt die Karte
 * auf Englisch zurueck, ohne `titel` auf ihre eigene Standardueberschrift — nie leer.
 */
export function VorlagenUeberlagerung({ videoUrl, posterUrl, sprache = "en", titel, features, zu }: {
  videoUrl: string;
  posterUrl?: string;
  sprache?: string;
  titel?: string;
  /**
   * DIE FEATURE-KARTE UNTER DER VIDEO-KARTE (Owner-Zusatzauftrag 12.08.2026, wörtlich:
   * „eigentlich zeigen wir da auch das programm wenn wir eins haben neben der card, oder
   * chat oder die Features wie bei Hochzeit mit"). Video Card + Feature Card ist die
   * Hausregel (Memory `produktaufbau-video-card-feature-card`) — bisher fehlte sie genau
   * hier, im Vollbild, wo der Kunde am längsten hinschaut. Der Aufrufer liefert die fertige
   * Karte (z. B. die Programm-Karte des Versprechens oder `GruppenChat` im Demo-Modus für
   * die Hochzeit); diese Überlagerung weiss nichts von ihrem Inhalt.
   *
   * OHNE `features`: exakt das Verhalten von vorher, kein Scrollen, keine zweite Karte.
   */
  features?: ReactNode;
  zu: () => void;
}) {
  useEffect(() => {
    const taste = (e: KeyboardEvent) => { if (e.key === "Escape") zu(); };
    window.addEventListener("keydown", taste);
    const vorher = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", taste); document.body.style.overflow = vorher; };
  }, [zu]);
  const [ton, setTon] = useState(true);
  return (
    <div className="fixed inset-0 z-[97] overflow-y-auto bg-black px-4 py-8" style={{ minHeight: "100dvh" }} onClick={zu}>
      {/**
        * DIE SCHLIESSEN-SCHEIBE BLEIBT OBEN FIXIERT (Owner-Zusatzauftrag: „immer close
        * einbauen") — sobald eine Feature-Karte die Überlagerung höher als den Bildschirm
        * macht und sie scrollt, würde die Scheibe AM VIDEO (unten in der Video-Karte
        * mitscrollend) irgendwann aus dem sichtbaren Bereich wandern. Diese zweite Scheibe
        * haengt am VIEWPORT, nicht am Inhalt — nur gebraucht, wenn es ueberhaupt etwas zu
        * scrollen gibt. */}
      {features && (
        <div className="fixed right-7 top-8 z-[98]" onClick={e => e.stopPropagation()}>
          <Scheibe label="Close" onClick={zu}><X className="h-5 w-5" /></Scheibe>
        </div>
      )}
      <div className="relative mx-auto w-full max-w-[400px]" onClick={e => e.stopPropagation()}>
        <EinladungKarte sprache={sprache} sie="" er="" demo titel={titel}
          fuss={<MadeBy karte />}
          video={
            <div className="relative aspect-[3/4] w-full overflow-hidden">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video src={videoUrl} poster={posterUrl} autoPlay playsInline muted={!ton} loop
                className="h-full w-full object-cover" />
              {/* SCHLIESSEN STATT VERGROESSERN, TON WIE UEBERALL — dieselben zwei Plaetze
                  (Skill `card`), am MEDIUM selbst statt an der ganzen Karte, wie jede andere
                  Vergroessern-Scheibe im Haus. Bleibt AUCH mit Feature-Karte stehen (kein
                  Wechsel im Standardfall), nur die zweite, fixierte Scheibe kommt dazu. */}
              <div className="absolute right-3 top-3 z-10">
                <Scheibe label="Close" onClick={zu}><X className="h-5 w-5" /></Scheibe>
              </div>
              <TonKnopf an={ton} onClick={() => setTon(t => !t)} platz="absolute right-3 top-[60px] z-10" />
            </div>
          } />
        {features && <div className="mt-4 pb-8">{features}</div>}
      </div>
    </div>
  );
}

export function VorlagenKachel({ bildUrl, videoUrl, posterUrl, beschriftung, ansehenLabel, sprache, titel, aktiv = true, darstellung = "kachel", features, aufBild, className = "" }: {
  /** Das Vorlagen-BILD — wie bisher, immer gezeigt (in der `kachel`-Gestalt). */
  bildUrl: string;
  /** Ohne diese Prop verhält sich die Kachel wie ein blosses Bild, kein Klick, kein Overlay. */
  videoUrl?: string;
  /** Poster für die Vollbild-Überlagerung — Standard ist `bildUrl`. */
  posterUrl?: string;
  /** Nur für den Vorlesetext, falls kein eigenes `ansehenLabel` mitkommt. */
  beschriftung?: string;
  /** Vorlesetext für den Tipp, der das Video öffnet — „Vorlage ansehen" in der Sprache der Seite. */
  ansehenLabel?: string;
  /**
   * SPRACHE UND TITEL DER KARTE IM VOLLBILD (Owner 12.08.2026: „wir sollen die karten zeigen,
   * die erzeugt werden beim vrgrössern … Deswegen haben wir die karten gemacht und nicht das
   * blanke video") — gereicht an `VorlagenUeberlagerung`. Der Aufrufer kennt Sprache und
   * Themen-Titel (aus seinem eigenen `kissText`), diese Kachel nicht.
   */
  sprache?: string;
  titel?: string;
  /** Der Ring, der eine GEWÄHLTE Kachel zeigt (Hausregel „Auswahl verschiebt NIE") — reicht der
   *  Aufrufer über `className` mit, bleibt aber ausserhalb des Video-Tipps unberührt. */
  aktiv?: boolean;
  /**
   * `kachel` das volle Bild (Ziel-Kachel in Schritt 3) · `knopf` ein schmaler Umriss-Knopf
   * MIT Text (Owner 12.08.2026: „das gilt für den ganzen Tunel" — auch dort, wo schon eine
   * eigene Auswahl-Kachel steht, z. B. `BildWahl` beim Geburtstag: eine zweite Bild-Kachel
   * daneben würde die bestehende Wahl verdoppeln, ein schmaler Zusatz-Knopf darunter nicht).
   * Ohne `videoUrl` gibt es in dieser Gestalt nichts zu zeigen — sie rendert dann nichts.
   */
  darstellung?: "kachel" | "knopf";
  /** Durchgereicht an `VorlagenUeberlagerung` — siehe dort. Optional, nur die Produkte mit
   *  einer Feature-Karte (Owner-Zusatzauftrag 12.08.2026) liefern sie. */
  features?: ReactNode;
  /**
   * BESCHRIFTUNG AUFS BILD, NIE DARÜBER (Owner 13.08.2026, mit Bild der versetzten
   * Versprechen-Kacheln: „ich habe dir schon mal im memory gesagt, dass bilder nie versetzt
   * angezeigt werden") — ein Label ÜBER der Kachel schiebt sie je nach Textlänge nach
   * unten; auf dem Bild (das „YOU"-Muster: weisse Schrift auf dunklem Verlauf) kostet es
   * keine Höhe, und alle Kacheln einer Reihe bleiben auf einer Linie.
   */
  aufBild?: string;
  className?: string;
}) {
  const [offen, setOffen] = useState(false);
  const [ref, sichtbar] = useKachelSichtbar<HTMLDivElement>();
  const label = ansehenLabel || beschriftung || "Vorlage ansehen";
  const poster = posterUrl || bildUrl;

  if (darstellung === "knopf") {
    if (!videoUrl) return null;
    return (
      <>
        <button type="button" onClick={() => setOffen(true)}
          className={`flex h-9 items-center justify-center gap-1.5 rounded-full border border-[#f6cf51]/40 px-3 text-[12px] font-black text-[#f6cf51] transition active:scale-95 ${className}`}>
          {label}
        </button>
        {offen && <VorlagenUeberlagerung videoUrl={videoUrl} posterUrl={poster} sprache={sprache} titel={titel} features={features} zu={() => setOffen(false)} />}
      </>
    );
  }

  const rahmen = `aspect-[3/4] w-full rounded-2xl border object-cover ${aktiv ? "border-[#f6cf51]/40" : "border-white/15"} ${className}`;
  // eslint-disable-next-line @next/next/no-img-element
  const bild = <img src={bildUrl} alt={beschriftung || ""} className={rahmen} />;
  /* Das „YOU"-Muster (siehe `aufBild`-Prop oben): weiss auf dunklem Verlauf, unten AUF dem
     Bild — `lb-onmedia`, damit die helle Fassung die Schrift nicht dunkel färbt. */
  const aufBildLabel = aufBild ? (
    <span className="lb-onmedia pointer-events-none absolute inset-x-0 bottom-0 rounded-b-2xl bg-gradient-to-t from-black/80 to-transparent pb-1.5 pt-6 text-center text-[10px] font-black uppercase tracking-wide"
      style={{ color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.85)" }}>
      {aufBild}
    </span>
  ) : null;

  if (!videoUrl) return aufBildLabel ? <div className="relative">{bild}{aufBildLabel}</div> : bild;

  /**
   * TIPPEN WAEHLT, NICHT MEHR ÖFFNET (Owner 12.08.2026: „man muss die Videos sehen im
   * ganzen Tunel" → „ok, bauen"). Vorher war die ganze Kachel ein `<button>`, der das
   * Vollbild oeffnete — kein Aufrufer konnte je einen eigenen Tipp (Auswahl) darum legen,
   * ohne den Video-Tipp zu verdecken. Jetzt ist der Rahmen ein reiner, nicht-interaktiver
   * `div`: Wer die Kachel als Auswahl braucht, legt seinen eigenen `onClick` aussen herum
   * (siehe `TunnelKacheln`s `ziel`-Slot); das Video spielt von selbst, sobald die Kachel im
   * Bild steht, und die kleine Scheibe holt es mit Ton ins Vollbild.
   */
  return (
    <div ref={ref} className="relative">
      {bild}
      {sichtbar && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video src={videoUrl} poster={poster} muted playsInline autoPlay loop
          /* KLEINE STUMME KACHEL-VORSCHAU, EINFACHES `loop` STATT DER ZWEI-SPIELER-
             UEBERBLENDUNG (Memory „videos-nahtlos-schleifen"): Die Regel gegen `loop` gilt
             fuer das grosse TON-Video der Karte, wo der Schnitt am Loop-Ende auffaellt.
             Diese Kachel ist stumm, klein und rein dekorativ — der Bruch beim Neustart geht
             auf 118-160px Breite unter, und ein zweiter Player fuer jede Kachel in einer
             Wisch-Reihe waere teurer (Speicher, Akku) als der Effekt wert ist. */
          className={`absolute inset-0 ${rahmen}`} />
      )}
      {aufBildLabel}
      <div className="absolute right-1.5 top-1.5 z-10" onClick={e => e.stopPropagation()}>
        {/* VERGROESSERN MIT TON — `stopPropagation` verhindert, dass der Tipp auf die
            Scheibe zugleich den Auswahl-Tipp des Aufrufers (falls vorhanden) ausloest. */}
        <Scheibe klein durchsichtig label={label} onClick={() => setOffen(true)}>
          <Maximize2 className="h-4 w-4" />
        </Scheibe>
      </div>
      {offen && <VorlagenUeberlagerung videoUrl={videoUrl} posterUrl={poster} sprache={sprache} titel={titel} features={features} zu={() => setOffen(false)} />}
    </div>
  );
}

/**
 * DIE FORTSCHRITTS-PUNKTE — EIN BAUSTEIN FÜR JEDEN TUNNEL (Owner-Befund 12.08.2026, am
 * Hochzeits-Tunnel: „warum siht der Wedding tunel anders aus? Du hast gesagt, du baust es
 * für alle gelcih" — konkret bemängelt: „KEINE Fortschritts-Punkte, KEIN Zurück-Chevron
 * links"). Dieselbe Zeile, die `KissFunnel` (Kuss/Geburtstag/Versprechen) längst zeigt, jetzt
 * auch für die `EinladungBauen`-Tunnel (Hochzeit/Urlaub/Gutschein) — EIN Baustein statt
 * sechsmal dieselben drei Zeilen Tailwind.
 */
export function TunnelFortschritt({ schritte, aktuell, className = "" }: {
  /** Die erreichbaren Schritte, aufsteigend — z. B. `[1, 3]` oder `[1, 2, 3]`. */
  schritte: number[];
  aktuell: number;
  className?: string;
}) {
  return (
    <div className={`mb-3 flex items-center justify-center gap-1.5 ${className}`}>
      {schritte.map(n => (
        <span key={n} className={`h-1.5 rounded-full transition-all ${n === aktuell ? "w-6 bg-[#f6cf51]" : n < aktuell ? "w-3 bg-[#f6cf51]/50" : "w-3 bg-white/20"}`} />
      ))}
    </div>
  );
}

/**
 * DIE KACHEL-REIHE — DER EINE KACHEL-BILDSCHIRM FÜR JEDEN TUNNEL (Owner-Befund 12.08.2026,
 * wörtlich am Hochzeits-Tunnel: „zwei gedrängte kleine Links-Kacheln mit Text IM Bild statt
 * der System-Kacheln (gestrichelt, Icon + Label darunter, gleich groß) … Kachel-Proportionen
 * ungleich" — „Du hast gesagt, du baust es für alle gelcih").
 *
 * DIE VORLAGE IST WÖRTLICH `KissFunnel`s SCHRITT 3 (Kuss/Geburtstag/Versprechen) — dieselbe
 * Optik, hierher gezogen, damit `EinladungBauen`s drei Tunnel-Seiten (Hochzeit/Urlaub/
 * Gutschein) sie BENUTZEN statt sie ein zweites Mal nachzubauen. `KissFunnel` selbst zieht in
 * einer Folgerunde um (siehe Bericht) — das interne Umbauen der sehr grossen, gut
 * eingespielten Kuss/Geburtstag/Versprechen-Trichter waere in dieser Runde das groessere
 * Risiko gewesen als eine kurze Doppelung der Optik an EINER weiteren Stelle.
 *
 * LINKS 1–2 GESTRICHELTE UPLOAD-KACHELN (leer: Icon + Label DARUNTER, wie beim Kuss; voll:
 * Bild + weisse Lösch-Scheibe), ein Pfeil, RECHTS die `VorlagenKachel` — exakt die Geometrie
 * (`aspect-[3/4]`, `w-[118px]`/`max-w-[32vw]`, `rounded-2xl`, `border-2 border-dashed
 * border-[#f6cf51]/40`) aus `KissFunnel.tsx`, keine eigene Erfindung.
 */
export function TunnelKachelUpload({ foto, titel, hinweis, onWaehlen, onLoeschen }: {
  /** Daten-URL oder leer — leer zeigt die gestrichelte Einladung, voll das Bild. */
  foto?: string;
  titel: string;
  hinweis?: string;
  onWaehlen: () => void;
  /** Ohne diese Prop bleibt eine gefüllte Kachel ohne Lösch-Scheibe (z. B. Katalog-Auswahl). */
  onLoeschen?: () => void;
}) {
  if (foto) {
    return (
      <div className="relative aspect-[3/4] w-[118px] max-w-[32vw]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={foto} alt="" className="h-full w-full rounded-2xl border border-[#f6cf51]/40 object-cover" />
        {onLoeschen && (
          <button type="button" onClick={onLoeschen} aria-label="Foto löschen"
            style={{ background: "#fff", color: "#dc2626", boxShadow: "0 2px 10px rgba(0,0,0,0.35)" }}
            className="absolute -left-1.5 -top-1.5 grid h-8 w-8 place-items-center rounded-full transition active:scale-90">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
  return (
    <button type="button" onClick={onWaehlen}
      className="relative flex aspect-[3/4] w-[118px] max-w-[32vw] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl border-2 border-dashed border-[#f6cf51]/40 lb-goldhauch px-2 text-center transition active:scale-[0.98]">
      <ImageUp className="h-6 w-6 text-[#f6cf51]" />
      <span className="text-[11px] font-black leading-snug text-white/85">{titel}</span>
      {hinweis && <span className="text-[9.5px] font-bold leading-snug text-white/55">{hinweis}</span>}
    </button>
  );
}

/**
 * DIE KURZE EINWILLIGUNGSZEILE, EINMAL GEBAUT (Owner-Architektur-Abgleich 12.08.2026, §24
 * „Kurze Privacy-Zeile"). `tpl` ist `T.consentKurz` — trägt genau EIN `{agb}`-Platzhalter,
 * der hier durch einen Link auf /terms ersetzt wird (`linkLabel` = `T.agbLink`, dieselbe
 * Übersetzung wie im alten langen Text — keine neue Link-Übersetzung nötig). Wird von
 * `TunnelKacheln`s `einwilligung`-Prop UND direkt von `KissFunnel` benutzt, damit die
 * Link-Bau-Logik nicht viermal im Haus steht.
 */
export function KurzeEinwilligung({ tpl, linkLabel }: { tpl: string; linkLabel: string }) {
  const teile = tpl.split(/(\{agb\})/);
  return (
    <>
      {teile.map((t, i) =>
        t === "{agb}"
          ? <a key={i} href="/terms" target="_blank" rel="noreferrer" className="underline">{linkLabel}</a>
          : <span key={i}>{t}</span>)}
    </>
  );
}

export function TunnelKacheln({ zurueckLabel, aufZurueck, links, ziel, zusatz, knopf, einwilligung }: {
  /** Vorlesetext des Zurück-Pfeils — „Back"/„Zurück" in der Sprache der Seite. */
  zurueckLabel: string;
  aufZurueck: () => void;
  /** Ein oder zwei linke Kacheln — der Kuss/die Hochzeit haben zwei (sein Foto/ihr Foto), das
   *  Versprechen/der Geburtstag genau eine (Aufnahme). */
  links: ReactNode;
  /** Rechts: die `VorlagenKachel` fertig zusammengesetzt vom Aufrufer (er kennt Bild/Video). */
  ziel: ReactNode;
  /** Produktspezifische Zusatzwahl UNTER den Kacheln (Ort beim Urlaub, Ziele-Chips …) — nie
   *  ein eigener Schritt (KONZEPT-TUNNEL.md). */
  zusatz?: ReactNode;
  knopf: { text: string; disabled?: boolean; busy?: boolean; onClick: () => void };
  /**
   * Meist die kurze Zeile aus `T.consentKurz` — als FERTIGES ReactNode uebergeben (nicht
   * mehr nur ein String), weil sie einen Link auf /terms traegt (Owner-Architektur-Abgleich
   * 12.08.2026, §24 „Kurze Privacy-Zeile"). Ein einfacher String bleibt weiterhin gueltig.
   */
  einwilligung?: ReactNode;
}) {
  return (
    <div className="mt-1">
      {/* KEIN ZURUECK-CHIP AM BILD (Owner 13.08.2026: „ein mal machst du den back button
          links vom cta und ein mal neben dem bild. Wie jetzt?") — die EINE Regel des
          Hauses: der Chip steht IMMER links vom Haupt-CTA des Schritts, wie in
          TunnelStart (Schritt 1) und der Look-Wahl (Schritt 2). Die Kachel-Reihe bleibt
          dadurch mittig und beide Bilder auf einer Linie. */}
      <div className="flex items-center justify-center gap-2">
        {links}
        <ChevronRight className="h-6 w-6 shrink-0 opacity-60" />
        <div className="w-[118px] max-w-[32vw]">{ziel}</div>
      </div>
      {zusatz}
      <div className="mt-4 flex items-center gap-2">
        <button type="button" onClick={aufZurueck} aria-label={zurueckLabel}
          className="lb-chip grid h-12 w-12 shrink-0 place-items-center rounded-full active:scale-95 transition">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <Knopf art="gold" disabled={knopf.disabled} onClick={knopf.onClick}>
          {/* EIN Knopf-Wort fuer ALLE Tunnel (Owner 12.08.2026: „der button muss immer gelch
              bei allen heissen Generate now - Preis.") — und KEINE Zeichen im Knopf ausser
              dem Lade-Kreisel. */}
          {knopf.busy ? <Laden art="knopf" /> : null}
          {knopf.text}
        </Knopf>
      </div>
      {einwilligung && (
        <p className="mt-2 text-center font-serif text-[11px] leading-snug text-white/70">{einwilligung}</p>
      )}
    </div>
  );
}

export function TunnelStart({ titel, nameLabel, namePlatzhalter, emailLabel, emailPlatzhalter, weiterLabel, lang, anfangsName = "", anfangsEmail = "", busy = false, fehlerAussen = "", google, intro, kleinText, onWeiter, produkt = "", zurueckHref, zurueckLabel = "Back", className = "" }: {
  titel: string;
  nameLabel: string;
  namePlatzhalter?: string;
  emailLabel: string;
  emailPlatzhalter?: string;
  weiterLabel: string;
  /** Für die Fehlertexte aus `lib/email-pruefen` — ohne sie fällt es auf Englisch zurück. */
  lang?: string;
  /** Vorbelegter Name, z. B. aus einem frueheren Besuch desselben Geraets. */
  anfangsName?: string;
  /**
   * VORBELEGTE E-MAIL (Owner 12.08.2026: „der user soll auch vor und zurück in den steps" —
   * geht er von Schritt 2 zurueck zu Schritt 1, MUSS die schon bekannte Adresse dastehen,
   * nicht ein leeres Feld, das ihn zu einer zweiten Eingabe zwingt. Er darf sie hier auch
   * AENDERN — der Aufrufer erkennt das in `onWeiter` daran, dass die E-Mail nicht mehr der
   * zuvor bestaetigten entspricht, und meldet sie dann neu an.
   */
  anfangsEmail?: string;
  /** Waehrend der Aufrufer die Adresse vormerkt (Netzwerk) — Knopf zeigt den Kreisel, kein zweiter Tipp. */
  busy?: boolean;
  /**
   * EIN FEHLER, DER ERST BEIM AUFRUFER ENTSTEHT (z. B. das Netzwerk, oder eine vom Server
   * gesperrte Adresse) — dieser Baustein prüft nur das FORMAT selbst; alles, was erst die
   * bestehende Lead-Logik (`onWeiter`) herausfindet, reicht der Aufrufer hier herein, statt
   * einen zweiten Fehlerkanal zu erfinden.
   */
  fehlerAussen?: string;
  /**
   * DIE GOOGLE-ANMELDUNG ALS ABKÜRZUNG (Owner 12.08.2026: „auch googgle anmeldung kannst
   * du einbauen"). Ohne diese Prop bleibt der Baustein, was er war — zwei Felder, ein
   * Knopf. Mit ihr steht GENAU die Anordnung des Konto-Fensters davor (`KontoChip.tsx`):
   * Google-Knopf zuerst, dann ein „oder"-Trenner, dann Name + E-Mail. Der Aufrufer liefert
   * die Handlung (`onClick`) UND die Beschriftungen — dieser Baustein loest keinen eigenen
   * OAuth-Aufruf aus, das bleibt bei `lib/supabase-auth-client` (`signInWithOAuth`), wie
   * ueberall im Haus.
   */
  google?: { label: string; oderLabel: string; onClick: () => void };
  /**
   * DIE ERKLÄRZEILE UNTER DEM TITEL (Owner-Folgeauftrag 12.08.2026, ChatGPT-Papier §22) —
   * NUR das Versprechen füllt sie heute (`T.tunnelIntro`); jeder andere Aufrufer lässt die
   * Prop weg und sieht denselben Baustein wie vorher. Optional, damit „Component bleibt
   * gleich, Inhalt ändert sich" auch hier gilt: kein zweiter TunnelStart, nur ein Slot mehr.
   */
  intro?: ReactNode;
  /**
   * DER KLEINTEXT UNTER DEM WEITER-KNOPF (dieselbe Quelle) — z. B. der Datenschutz-Hinweis
   * „Deine E-Mail speichert dein Projekt …" beim Versprechen. Ebenfalls optional und von
   * allen anderen Aufrufern unbenutzt.
   */
  kleinText?: ReactNode;
  onWeiter: (name: string, email: string) => void | Promise<void>;
  /** NUR FÜRS MESSEN (Owner-Architektur-Abgleich 12.08.2026, §32) — feuert `lead_created`,
   *  sobald „Weiter" mit einer gültigen Adresse gedrückt wurde. Ohne Angabe bleibt
   *  `TunnelStart` stumm, wie vorher. */
  produkt?: string;
  /** ZURÜCK ZUR LANDINGPAGE (Owner 12.08.2026: „ich verstehe nicht warum ich von hier
   *  nicht zurück zur kandingpage kann") — Schritt 1 ist oft der DIREKTE Einstieg aus der
   *  Anzeige, ohne Browser-Verlauf; ohne diesen Pfeil ist die Landingpage unerreichbar.
   *  Die Aufrufer reichen ihre Themenseite (mit light/code) herein. */
  zurueckHref?: string;
  zurueckLabel?: string;
  className?: string;
}) {
  const [name, setName] = useState(anfangsName);
  const [email, setEmail] = useState(anfangsEmail);
  const [fehler, setFehler] = useState("");

  /**
   * NACHZIEHEN, WENN DIE VORBELEGUNG ERST NACH DEM ERSTEN ZEICHNEN ANKOMMT (live geprueft,
   * Owner 12.08.2026: „der user soll auch vor und zurück in den steps" — die bekannte
   * Adresse muss beim Zurückgehen wirklich im Feld STEHEN, nicht nur als ungenutzte Prop
   * daliegen).
   *
   * `useState(anfangsName)` liest den Anfangswert NUR beim allerersten Rendern. Laedt die
   * Tunnel-Seite frisch (z. B. ein harter Reload auf `?s=1`), steht `anfangsEmail` in diesem
   * allerersten Augenblick noch auf "" — der Aufrufer liest seine bekannte Adresse selbst
   * erst in einem Effekt aus dem Geraet (Session/`localStorage`), und der laeuft eine
   * Zeichnung SPAETER. Ohne diesen Effekt hier bliebe das Feld leer, obwohl die Adresse
   * inzwischen laengst bekannt ist — genau der Fall, den der Owner ausdruecklich wollte.
   *
   * KEIN Widerspruch zum Tippen: Nachdem diese Werte einmal angekommen sind, aendern sie
   * sich nicht mehr von aussen, solange der Baustein steht — der Aufrufer setzt sie nur beim
   * Hydrieren aus dem Geraet, nie waehrend jemand mitten im Feld tippt.
   */
  useEffect(() => { if (anfangsName) setName(anfangsName); }, [anfangsName]);
  useEffect(() => { if (anfangsEmail) setEmail(anfangsEmail); }, [anfangsEmail]);

  const weiter = async () => {
    if (busy) return;
    const e = email.trim();
    const p = pruefeEmail(e);
    if (!p.ok) { setFehler(emailFehlerText(p.grund, lang)); return; }
    setFehler("");
    // `lead_created` (Owner-Architektur-Abgleich 12.08.2026, §32) — der Lead selbst ist
    // schon gespeichert, sobald „Weiter" mit gültiger Adresse gedrückt wurde (siehe
    // KONZEPT-TUNNEL.md); das Ereignis meldet genau diesen Moment, nicht erst den
    // Netzwerk-Erfolg von `onWeiter`.
    void logTunnelEvent("lead_created", produkt);
    await onWeiter(name.trim(), e);
  };

  return (
    <Kasten polster="p-4" className={className}>
      <p className="text-center text-[15px] font-black text-white/90">{titel}</p>
      {/* DIE ERKLÄRZEILE (siehe `intro`-Prop oben) — nur wenn geliefert. */}
      {intro && (
        <p className="mt-1.5 text-center text-[12.5px] font-semibold leading-snug text-white/70">{intro}</p>
      )}
      <div className="mt-3">
        <label className="block text-[11px] font-bold text-white/55" htmlFor="lb-tunnel-name">{nameLabel}</label>
        <Eingabe id="lb-tunnel-name" className="mt-1 text-center" value={name}
          onChange={e => setName(e.target.value)} maxLength={18} autoComplete="given-name"
          placeholder={namePlatzhalter} />
      </div>
      <div className="mt-2.5">
        <label className="block text-[11px] font-bold text-white/55" htmlFor="lb-tunnel-email">{emailLabel}</label>
        <Eingabe id="lb-tunnel-email" className="mt-1 text-center" type="email" inputMode="email" autoComplete="email"
          value={email} onChange={e => { setEmail(e.target.value); if (fehler) setFehler(""); }}
          placeholder={emailPlatzhalter || "you@email.com"}
          onKeyDown={e => { if (e.key === "Enter") void weiter(); }} />
        <Fehlerzeile>{fehler || fehlerAussen}</Fehlerzeile>
      </div>
      <div className="mt-3.5 flex items-center gap-2">
        {zurueckHref && (
          <a href={zurueckHref} aria-label={zurueckLabel}
            className="lb-chip grid h-12 w-12 shrink-0 place-items-center rounded-full active:scale-95 transition">
            <ChevronLeft className="h-5 w-5" />
          </a>
        )}
        <Knopf art="gold" onClick={() => void weiter()} disabled={busy}>
          {busy ? <Laden art="knopf" /> : weiterLabel}
        </Knopf>
      </div>
      {/* DER KLEINTEXT (siehe `kleinText`-Prop oben) — nur wenn geliefert. */}
      {kleinText && (
        <p className="mt-2 text-center text-[10.5px] font-medium leading-snug text-white/45">{kleinText}</p>
      )}
      {/* GOOGLE NACH UNTEN (Owner 13.08.2026: „wieso steht dann google so prominent?" —
          Master-Auftrag §14: Google darf existieren, aber nicht als dominante Voraussetzung).
          Vorher stand der Knopf ÜBER den Feldern und war damit die ERSTE Handlung des ganzen
          Tunnels; jetzt ist Name + E-Mail + Weiter der eine Hauptweg (§20: ein Screen, EINE
          Entscheidung) und Google die stille Abkürzung darunter — dieselbe Trennzeile wie im
          Konto-Fenster (`KontoChip.tsx`), nur in Weiss statt Tinte. */}
      {google && (
        <>
          <div className="mt-3 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/15" />
            <span className="text-[11px] font-black uppercase tracking-wide text-white/45">{google.oderLabel}</span>
            <span className="h-px flex-1 bg-white/15" />
          </div>
          <div className="mt-3">
            <GoogleKnopf label={google.label} onClick={google.onClick} />
          </div>
        </>
      )}
    </Kasten>
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
  /* `data-themenkachel`: NUR fürs CSS der hellen Fassung (Owner 13.08.2026, Screenshot der
     Programm-Kachel: „das ganze blau in blau und babyblu ist nicht toll") — die Pauschal-
     regel für Umriss-Chips (`border-white/`-Knöpfe → blauer Chip) traf auch diese grosse
     Produkt-Kachel und färbte Fläche UND jede Zeile blau. Die Ausnahme-Regel steht in
     globals.css und macht daraus weisses Karten-Papier mit Tinte; Blau bleibt Akzent
     (Preis, Titel-Hälfte, LIVE). */
  return aktiv
    ? <a href={thema.href} data-themenkachel="1" className={kl}>{inhalt}</a>
    : <div data-themenkachel="1" className={kl}>{inhalt}</div>;
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
export const THEMEN_KREISE: { icon: LucideIcon; name: string; href: string; bild?: string }[] = [
  /* `bild` ist das Motiv des Themas (15.08.2026, Fotos statt Icons). Optional, damit ein
     neues Thema erst in die Reihe darf und sein Motiv nachreichen kann. */
  /* GEBURTSTAG ZUERST (Owner 09.08.2026) — dieselbe Reihenfolge wie die Kacheln der
     Startseite. Zwei Listen, die verschieden sortiert sind, lesen sich wie zwei Meinungen. */
  { icon: Cake, name: "Birthday", href: "/themes/birthday", bild: "/Birthday/hbd-fliege.jpg" },
  { icon: Heart, name: "Kiss", href: "/themes/kiss", bild: "/Kiss/kiss-beispiel.jpg" },
  /* SURPRISE (POLE DANCE) IST WIEDER DA (Owner 12.08.2026, mit Bild der Themen-Kreise:
     „pool dancing kannst du hier einbauen und da machst du auch dort den tunel einbauen" —
     Rücknahme der Rausnahme vom selben Vormittag, siehe die Begründung darunter). Platz wie
     vor dem 11.08.2026: direkt nach Kiss. */
  { icon: Gift, name: "Surprise", href: "/themes/surprise", bild: "/Pooldance/beispiel-2.jpg" },
  /* Bis heute Vormittag (11.08.2026) stand hier: „Surprise (Pole Dance) IST RAUS, siehe
     app/sitemap.ts — nicht in der Topic-Reihe, nur noch intern (Admin-Vorschau in
     BottomNav.tsx) erreichbar." Diese Zeile bleibt als Protokoll stehen, sie gilt nicht mehr. */
  { icon: Palmtree, name: "Holiday", href: "/themes/holiday", bild: "/Holiday/urlaub-poster.jpg" },
  { icon: MessageCircle, name: "Chat", href: "/themes/chat", bild: "/Chat/chat-poster.jpg" },
  { icon: Sparkles, name: "Wedding", href: "/themes/wedding", bild: "/Wedding/hochzeit-poster.jpg" },
  /* TRY-ON IN DER REIHE (Owner 13.08.2026, mit Bild der Kreise: „hier kannst du noch tryon
     einbinden falls du es noch machst") — der Kreis kam ZUSAMMEN mit dem Tunnel
     (/themes/tryon/start), nie davor: ein Kreis, der in einen halbfertigen Weg zeigt,
     wäre schlimmer als keiner. */
  { icon: Shirt, name: "Try-on", href: "/themes/tryon", bild: "/Tryon/tryon-1.jpg" },
  /* „ALLE" IST RAUS (Owner 15.08.2026: „Alle raus"). Als Werbe-Reihe war es der Weg zum
     Rest; als TAB-LEISTE ist es ein Reiter, der aus der Leiste hinausfuehrt — und der
     einzige, hinter dem kein Produkt steht, sondern eine Uebersicht. */
];
export function ThemenKreise({ themen = THEMEN_KREISE, className = "", ohne = "" }: {
  themen?: { icon: LucideIcon; name: string; href: string; bild?: string }[];
  className?: string;
  /**
   * Ein Thema auslassen — im Tunnel das, in dem der Besucher gerade steckt (Owner
   * 15.08.2026: „alle brauchen wir nicht"). Leer = alle zeigen, wie in der Galerie.
   */
  ohne?: string;
}) {
  /**
   * GOLD IST NUR, WAS GERADE AKTIV IST (Owner 11.08.2026, mit Bild der Reihe: „die sind
   * gelb und das verwirrt. Gelb ist nur das was gerade aktiv ist. Wie Galerie eben.").
   *
   * Vorher trug jeder Kreis dieselbe Gold-Auszeichnung — sechs gleich helle Punkte sagen
   * dann nichts mehr, weil nichts sich vom Rest abhebt (dieselbe Lehre wie am Galerie-Chip:
   * Aktiv ist ein Zustand, keine Dauerfarbe). Jetzt gilt: gedämpft ist der Normalfall, Gold
   * bekommt nur der Kreis, dessen Adresse die SEITE ist, auf der man gerade steht — genau
   * dieselbe Regel wie beim Galerie-Chip in TopNav.
   */
  const pfad = usePathname();
  return (
    <div className={`lb-wisch -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 ${className}`}>
      {/**
        * SIE FUNKTIONIERT WIE EINE TAB-LEISTE (Owner 15.08.2026: „und muss wie ein Tab
        * funktionieren").
        *
        * Damit faellt die Ausblendung des eigenen Themas weg, die hier kurz stand: Ein Tab
        * zeigt IMMER alle Reiter, auch den, auf dem man steht — sonst springt die Reihe bei
        * jedem Wechsel und niemand findet zurueck. Der laufende ist statt dessen GOLD.
        *
        * AKTIV IST DER PFAD-ANFANG, nicht die genaue Adresse: Der Trichter steht auf
        * `/themes/surprise/start`, der Reiter zeigt auf `/themes/surprise`. Mit `===` waere
        * im Tunnel NIE einer aktiv gewesen — die Leiste saehe aus, als gehoere man nirgends
        * hin. `Alle` bleibt davon ausgenommen, sonst leuchtete es auf jeder Themenseite mit.
        */}
      {themen.filter(t => !ohne || !t.href.includes(ohne)).map(t => {
        const aktiv = t.href === "/themes" ? pfad === t.href : pfad.startsWith(t.href);
        return (
          <a key={t.href} href={t.href} className="group flex w-[58px] shrink-0 flex-col items-center gap-1.5">
            {/**
              * FOTOS STATT ICONS (Owner 15.08.2026, mit Bild der Reihe: „kannst du hier Fotos
              * nehmen statt Icons? und denselben Slider machen wir im Tunnel").
              *
              * Ein Torten-Symbol und ein Herz-Symbol sehen gleich aus — grau, gleich gross,
              * gleich leer. Das Foto IST das Produkt: Wer die Reihe sieht, sieht acht
              * Ergebnisse statt acht Umrisse. Das Icon bleibt als Rueckfall stehen, falls ein
              * Thema (noch) kein Motiv hat.
              *
              * EINE Komponente fuer beide Stellen (Owner: „ich mache eine Komponente fuer
              * beide — ja"): Galerie und Tunnel holen dieselbe Reihe; im Tunnel laesst `ohne`
              * das laufende Thema weg.
              */}
            {/* DER RING WIRD GOLD, NICHT NUR DIE SCHRIFT (Owner 15.08.2026: „auch der Kreis
                wird gelb"). Mit einem Foto im Kreis war der duenne 40-%-Rand praktisch
                unsichtbar — der aktive Reiter hing allein an der Beschriftung darunter.
                Genau zwei Pixel volles Gold — kein zweiter, weicher Ring darum: Der Owner
                hat die Breite bestaetigt, nicht eine Aura bestellt. */}
            <span className={`grid h-[58px] w-[58px] place-items-center overflow-hidden rounded-full transition group-active:scale-90 ${aktiv
              ? "border-2 border-[#f6cf51] text-[#f6cf51]"   /* genau 2 px Gold, sonst nichts (Owner 15.08.2026: „2 Pixel") */
              : "border border-white/15 bg-white/[0.04] text-white/60"}`}>
              {t.bild
                /* eslint-disable-next-line @next/next/no-img-element */
                ? <img src={t.bild} alt="" loading="lazy" className={`h-full w-full object-cover object-top ${aktiv ? "" : "opacity-85"}`} />
                : <t.icon className="h-[22px] w-[22px]" />}
            </span>
            <span className={`text-center text-[10.5px] font-black leading-none ${aktiv ? "text-[#f6cf51]" : "text-white/60"}`}>{t.name}</span>
          </a>
        );
      })}
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
 * DAS ZAHLUNGSSIEGEL (Owner 10.08.2026: „man muss igerndwie sichere Zahlung mit stripe
 * (logo) Masterkard logo…einblenden", zusammen mit: „wenn es um zahlung geht, vertrauen
 * menschen mehr den hellen farben").
 *
 * WAS ES SAGT, IST WAHR: Kassiert wird über Stripe, und Stripe nimmt die Karten der beiden
 * Netze. Ein Siegel, das mehr behauptet als stimmt (Käuferschutz, Garantien, fremde
 * Prüfzeichen), ist kein Vertrauen, sondern eine Falle — deshalb steht hier genau das:
 * Schloss, der Satz aus `T.secure`, und die zwei Kartenzeichen.
 *
 * WARUM DIE ZEICHEN GEZEICHNET UND NICHT GELADEN SIND: Zwei Kreise und ein Wort brauchen
 * keine Datei — kein Netzaufruf, kein Nachladen unter dem Kaufknopf, keine fremde Adresse
 * im Fenster. Es sind die Marken der Kartennetze; benutzt werden sie hier ausschliesslich
 * als Hinweis, WOMIT man bezahlen kann.
 *
 * ES STEHT UNTER DEN BETRÄGEN, NICHT ÜBER IHNEN: Zuerst die Wahl, dann die Beruhigung.
 */
export function Zahlungssiegel({ text, garantie, garantieHref, hell = false, className = "" }: {
  /** Der fertige Satz in seiner Sprache (`T.secure`) — hier wird nichts übersetzt. */
  text: string;
  /**
   * DIE GELD-ZURÜCK-GARANTIE (Owner 10.08.2026: „Geldzrück Garantie müssen wir auch
   * einblenden im Zahlungsdialog Creditauswahl" · „Geld Zurückgarantie habe ich gesagt")
   * — fertig übersetzt hereingereicht (`T.geldZurueckGarantie`).
   *
   * NUR DORT, WO SIE HINGEHÖRT: am Kaufmoment, nicht unter jedem Preis.
   */
  garantie?: string;
  /**
   * WOHIN DAS WORT FÜHRT (Owner 10.08.2026: „du machst jetzt einen ling zu ageb drauf und
   * beschreisbt in AGB was das ist").
   *
   * Eine Garantie ohne nachlesbare Bedingung ist eine Behauptung — und dieselbe Zeile, die
   * Vertrauen schaffen soll, wäre die, an der man sich später streitet. Deshalb ist das Wort
   * ein Link auf den Abschnitt in den AGB, der sagt, was sie deckt (Lieferung, grosse
   * Abweichung) und was nicht (schlechte Vorlage, Geschmack). Neues Fenster: Der Kunde steht
   * im Kaufmoment — sein Trichter darf dabei nicht verloren gehen.
   */
  garantieHref?: string;
  /** Auf weissem Grund (heller Dialog). Ohne das: die dunkle Welt. */
  hell?: boolean;
  className?: string;
}) {
  const tinte = hell ? "rgba(26,22,15,0.62)" : "rgba(255,255,255,0.7)";
  return (
    <div className={className}>
    {garantie && (() => {
      const inhalt = (<>
        <ShieldCheck className="h-4 w-4 shrink-0" style={{ color: hell ? "#1a160f" : "#f6cf51" }} />
        <span className={garantieHref ? "underline" : ""}>{garantie}</span>
      </>);
      const kl = "mb-2 flex items-center justify-center gap-1.5 text-center text-[12px] font-black leading-snug";
      const farbe = { color: hell ? "#1a160f" : "#fff" };
      return garantieHref
        ? <a href={garantieHref} target="_blank" rel="noreferrer" className={kl} style={farbe}>{inhalt}</a>
        : <p className={kl} style={farbe}>{inhalt}</p>;
    })()}
    <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5">
      <span className="flex items-center gap-1.5 text-[11px] font-bold leading-none" style={{ color: tinte }}>
        <Lock className="h-3.5 w-3.5" /> {text}
      </span>
      <span className="flex items-center gap-2">
        {/* Mastercard: die zwei ineinanderliegenden Kreise. */}
        <svg viewBox="0 0 36 22" role="img" aria-label="Mastercard" className="h-[18px] w-auto">
          <circle cx="14" cy="11" r="9" fill="#EB001B" />
          <circle cx="22" cy="11" r="9" fill="#F79E1B" />
          <path d="M18 4.2a9 9 0 0 0 0 13.6 9 9 0 0 0 0-13.6Z" fill="#FF5F00" />
        </svg>
        {/* Visa: das Wort. Auf Weiss in seinem Blau, auf Dunkel in Weiss — dasselbe, was die
            Marke selbst für dunkle Flächen vorsieht; Blau auf Schwarz ist nicht lesbar. */}
        <span className="text-[13px] font-black italic leading-none tracking-tight"
          style={{ color: hell ? "#1434CB" : "#fff" }}>
          VISA
        </span>
      </span>
    </div>
    </div>
  );
}

/**
 * DER AUFLADEWÄHLER — DAS EINE FENSTER, HINTER DEM GELD FLIESST.
 *
 * Owner 10.08.2026: „Der Tunel ab Bezahlung kannst du bei allen gleich machen. Das ist den
 * Kassen Funel." · „Wir haben doch 3 Tage Geburstags funel optimiert. Der gilt."
 *
 * Es gab ihn zweimal: einmal im Geburtstags-Trichter (`KissFunnel`) — dreimal nachgebessert,
 * mit Adresse, Anmelde-Einladung, Siegel und Garantie — und einmal als vier nackte
 * Gold-Knöpfe in der Einladung (`EinladungBauen`), ohne all das. Beide zogen echtes Geld ein.
 * Die Regeln der Rechnung stehen in `lib/kasse.ts`, das Fenster steht ab jetzt hier; wer eine
 * Kasse baut, holt sich beides, statt es zum dritten Mal zu bauen.
 *
 * WAS DER BAUSTEIN VON SELBST RICHTIG MACHT (jede Zeile ist einmal Geld gewesen):
 *
 * 1. NUR STUFEN, DIE DEN KAUF WIRKLICH DECKEN — mit dem vorhandenen Guthaben verrechnet
 *    (`deckendeStufen`). Sonst zahlt jemand und steht danach vor demselben Wähler.
 * 2. DIE ADRESSE STEHT DA, BEVOR GELD FLIESST (Owner 03.08.2026: „sonst zahlt er mit der
 *    falschen Email und ist nie wieder drin falls er sich vertippt"). Zeigen statt zweimal
 *    tippen — eine lesbare Zeile mit „Ändern".
 * 3. „ICH HABE SCHON EIN KONTO" ÜBER den Beträgen (Owner 09.08.2026: „hat er geld drauf muss
 *    ein dialog kommen melde dich an"). Unter ihnen käme sie zu spät: Wer erst zahlt und dann
 *    merkt, dass sein Geld woanders lag, hat zweimal bezahlt. Sie sagt NICHT, ob dort Geld
 *    liegt — das wäre genau die Auskunft, die der Geräte-Riegel verhindert.
 * 4. WARUM DAS FENSTER OFFEN IST, ROT UND BEZIFFERT (Owner 07.08.2026: „wieso bekomme ich
 *    keine Meldung, nicht genügend Credit?").
 * 5. SIEGEL UND GELD-ZURÜCK-GARANTIE UNTER den Beträgen: erst die Wahl, dann die Beruhigung.
 *
 * UND ZWAR HELL (Owner 10.08.2026: „mach das Dialog in light. Ich denke wenn es um zahlung
 * geht, vertrauen menschen mehr den hellen farben"). Die weisse Karte ist die Sprache, die
 * jeder von seiner Bank kennt; alle Kinder tragen deshalb Tinte statt Weiss.
 *
 * DIE TEXTE HOLT ER SICH SELBST (`kissText`/`kontoText`, sieben Sprachen) — ein Trichter, der
 * sie hereinreichen müsste, könnte einen davon vergessen, und dann stünde im Kaufmoment
 * Englisch auf einer rumänischen Seite.
 */
export function AufladeWaehler({
  lang, stand, preis, mail, setMail, adresseSpeichern, mailFehler = "", mailBusy = false,
  vorschlag = "", angemeldet = true, aufAnmelden, aufladungNull = false, busy = false,
  aufStufe, zu,
}: {
  lang: string;
  /** Der Kontostand in Cent. `null` = unbekannt und zählt wie leer. */
  stand: number | null;
  /** Was der unterbrochene Kauf kostet — aus `lib/pricing`, nie getippt (Skill `bezahlung` §2). */
  preis: number;
  mail: string;
  setMail: (m: string) => void;
  /**
   * DIE ADRESSE PRÜFEN UND VORMERKEN — `true` schliesst das Feld wieder. Der Trichter
   * entscheidet, WIE streng geprüft wird (im Kuss hängen an `adresseVormerken` die
   * Eingangstore: Format, Wegwerf-Adressen, die KI-Prüfung). Fehlt die Funktion, gilt die
   * blosse Formprüfung — mehr kann dieser Baustein nicht wissen.
   */
  adresseSpeichern?: () => Promise<boolean>;
  /** Die Absage am Feld — rot, feste Farbe (Memory `sichtbare-fehler-keine-formularfelder`). */
  mailFehler?: string;
  mailBusy?: boolean;
  /** „Meintest du …?" — leer, solange die Adresse unauffällig ist. */
  vorschlag?: string;
  /** Ist er angemeldet? Nur wenn NICHT, kommt die Einladung dazu. */
  angemeldet?: boolean;
  /** Ohne diesen Weg entfällt die Einladung — ein Knopf, der nirgends hinführt, ist schlimmer. */
  aufAnmelden?: () => void;
  /** Die letzte Zahlung war 0,00 € (100-%-Code) — dann ist der Grund ein anderer. */
  aufladungNull?: boolean;
  /** Läuft gerade eine Zahlung? Sperrt die Beträge gegen den zweiten Tipp. */
  busy?: boolean;
  /** Eine Stufe wurde gewählt — der Trichter setzt DEN UNTERBROCHENEN Kauf fort (`aufladeZiel`). */
  aufStufe: (stufeCents: number) => void;
  zu: () => void;
}) {
  const T = kissText(lang);
  const KT = kontoText(lang);
  /**
   * Solange die Adresse offen im Feld steht, ist sie nicht bestätigt — dann darf die Kasse
   * nicht aufgehen (sie nähme die ALTE Adresse mit). Rein örtlicher Zustand: Er lebt und
   * stirbt mit diesem Fenster, kein Trichter muss ihn führen.
   */
  const [aendern, setAendern] = useState(false);
  const speichern = async () => {
    if (adresseSpeichern) { if (await adresseSpeichern()) setAendern(false); return; }
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail.trim())) setAendern(false);
  };
  return (
    <Dialog art="hell" zu={zu}>
      {/* `px-7`, damit die Zeile nie unter das Kreuz läuft — symmetrisch, weil zentriert. */}
      <p className="px-7 text-[16px] font-black leading-snug text-[#1a160f]">{T.aufladeWahlTitel}</p>
      {/* DIE ADRESSE, BEVOR GELD FLIESST: Die Stripe-Kasse wird mit `customer_email`
          vorbelegt und GESPERRT — dies ist die letzte Stelle, an der ein Tippfehler noch
          einzufangen ist (Art. 8 Verbraucherrechte-RL: zeigen, nicht zweimal tippen lassen). */}
      <div className="mt-3 rounded-xl border border-[#1a160f]/15 bg-[#1a160f]/[0.04] px-3 py-2.5">
        <p className="text-[10.5px] font-bold leading-snug text-[#1a160f]/60">{T.zahlungAdresse}</p>
        {aendern ? (
          <>
            {/* KEIN `lb-eingabe` HIER: Diese Klasse ist die Umschaltung für die HELLE Fassung
                der ganzen Seite (`.lb-fb`) — in einem Feld, das ohnehin auf Weiss steht, würde
                sie ein zweites Mal umfärben. Die Farben stehen direkt, weil dieser Dialog
                IMMER hell ist, egal wie die Seite steht. */}
            <input value={mail} autoFocus
              onChange={e => setMail(e.target.value)}
              type="email" inputMode="email" autoComplete="email"
              onKeyDown={e => { if (e.key === "Enter") void speichern(); }}
              style={{ color: "#1a160f", WebkitTextFillColor: "#1a160f", caretColor: "#1a160f" }}
              className="mt-1.5 h-10 w-full rounded-lg border border-[#1a160f]/25 bg-white px-2 text-center text-[13px] font-bold outline-none placeholder:text-[#1a160f]/45 focus:border-[#1a160f]/60" />
            {mailFehler && (
              <p role="alert" style={{ color: ABSAGE_ROT }} className="mt-1 text-[11.5px] font-black leading-snug">{mailFehler}</p>
            )}
            <span className="mt-1 flex flex-col items-center gap-1.5">
              {vorschlag && (
                <button type="button" onClick={() => setMail(vorschlag)}
                  className="text-[11.5px] font-black text-[#1a160f] underline">
                  {T.mailVorschlag(vorschlag)}
                </button>
              )}
              <button type="button" onClick={() => void speichern()} disabled={mailBusy}
                className="rounded-full border border-[#1a160f]/25 px-3 py-1 text-[11.5px] font-black text-[#1a160f]/85 transition active:scale-95 disabled:opacity-60">
                {mailBusy ? "…" : T.zahlungAdresseSpeichern}
              </button>
            </span>
          </>
        ) : (
          <>
            {/* `break-all`: Lange Adressen dürfen den Dialog nicht aufreissen. */}
            <p className="mt-0.5 break-all text-[13px] font-black leading-snug text-[#1a160f]">{mail}</p>
            <span className="mt-1 flex flex-col items-center gap-1">
              {vorschlag && (
                <button type="button" onClick={() => { setMail(vorschlag); setAendern(true); }}
                  className="text-[11.5px] font-black text-[#1a160f] underline">
                  {T.mailVorschlag(vorschlag)}
                </button>
              )}
              <button type="button" onClick={() => setAendern(true)}
                className="text-[11.5px] font-black text-[#1a160f]/60 underline">
                {T.zahlungAdresseAendern}
              </button>
            </span>
          </>
        )}
      </div>
      {/* ERST DIE FRAGE „WER BIST DU?", DANN DIE BETRÄGE — siehe Punkt 3 oben. Auf Weiss trägt
          der Kasten keinen Gold-Hauch mehr (Hausregel für helle Flächen: schwarz·weiss·grau);
          der EINE goldene Knopf darin bleibt, er ist die Handlung, nicht die Fläche. */}
      {!angemeldet && aufAnmelden && (
        <div className="mt-4 rounded-2xl border border-[#1a160f]/15 bg-[#1a160f]/[0.04] p-3 text-center">
          <p className="text-[13px] font-black leading-snug text-[#1a160f]">{KT.schonKonto}</p>
          <p className="mt-1 text-[11.5px] font-semibold leading-snug text-[#1a160f]/65">{KT.schonKontoGrund}</p>
          <div className="mt-2.5">
            <Knopf art="gold" onClick={aufAnmelden}>{KT.anmeldeKnopf}</Knopf>
          </div>
        </div>
      )}
      <p role="alert" style={{ color: ABSAGE_ROT }} className="mt-3 text-[12.5px] font-black leading-snug">
        {aufladungNull ? T.aufladungNull : T.guthabenZuWenig
          .replace("{stand}", eur(stand ?? 0, lang))
          .replace("{preis}", eur(preis, lang))}
      </p>
      {/* DIE BETRÄGE SIND EINE WAHL, KEIN KAUF — also Chips, zwei je Reihe (Owner 08.08.2026:
          „Mache die buttons zwei reihig und dialg schwrz und chips design"), statt vier
          Gold-Knöpfe übereinander, die alle mit dem einen echten Kaufknopf konkurrierten. */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {deckendeStufen(stand, preis).map(stufe => {
          const stueck = stueckJeStufe(stufe, preis);
          return (
            <Knopf key={stufe} art="chip" hell disabled={busy || aendern}
              onClick={() => aufStufe(stufe)}>
              {eur(stufe, lang)}{stueck >= 1 ? ` · ${stueck} 🎬` : ""}
            </Knopf>
          );
        })}
      </div>
      <Zahlungssiegel hell text={T.secure} garantie={T.geldZurueckGarantie}
        garantieHref="/terms#geld-zurueck-garantie" className="mt-4" />
      <p className="mt-2.5 text-center text-[10px] font-medium leading-snug text-[#1a160f]/50">{T.aufladenHinweis}</p>
    </Dialog>
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
/**
 * DIE EINLADUNG ZUR ANMELDUNG (Owner 09.08.2026, direkt nach dem Geräte-Riegel: „Der Kunde
 * muss trotzdem einen sehr schönen Dialog bekommen, dass er sich anmelden soll, wenn er
 * eine schöne Karte generieren will. Es ist zu seinem Schutz. Button jetzt anmelden. Auch
 * die Vorlage die er ausgewählt hat muss da stehen.").
 *
 * WARUM SIE SO AUSSIEHT, WIE SIE AUSSIEHT:
 *
 * 1. DIE VORLAGE STEHT OBEN. Ein Anmelde-Fenster mitten im Bauen ist eine Unterbrechung —
 *    und Unterbrechungen kosten Käufer. Sein Bild daneben sagt ohne ein Wort: „dein Werk
 *    ist nicht weg, es wartet." Das ist der Unterschied zwischen einer Hürde und einem
 *    Zwischenschritt.
 * 2. DER GRUND STEHT VOR DER BITTE. „Zu deinem Schutz" ist keine Floskel: Seit dem
 *    Geräte-Riegel hängt sein Guthaben am Browser. Meldet er sich an, gehört es IHM — auf
 *    jedem Gerät, auch nach dem Handywechsel. Wer den Nutzen nicht nennt, bettelt nur.
 * 3. EIN einziger goldener Knopf (Hausregel). Der stille Ausweg darunter ist Text, kein
 *    zweiter Knopf — er soll erreichbar sein, aber nicht locken.
 */
export function AnmeldeEinladung({
  offen, zu, titel, grund, knopf, spaeter, vorlageBild, vorlageName, aufAnmelden, aufSpaeter,
}: {
  offen: boolean;
  zu: () => void;
  titel: string;
  grund: string;
  knopf: string;
  /** Fehlt dieser Text, gibt es keinen Ausweg — dann ist die Anmeldung Pflicht. */
  spaeter?: string;
  vorlageBild?: string;
  vorlageName?: string;
  aufAnmelden: () => void;
  aufSpaeter?: () => void;
}) {
  if (!offen) return null;
  return (
    /* HELL, NICHT DUNKEL (Owner 14.08.2026: „achtung, hier ist black bg" — der Kasten stand
       als schwarze Platte mitten in der hellen Trichterseite). Dieser Baustein war der
       einzige, der `art="dunkel"` fest verdrahtet hatte, samt weisser Schrift darin. Damit
       verstiess er gegen die Dauerregel „nie feste Dunkelfarben, beide Fassungen prüfen" —
       und gegen die Begründung am `Knopf`-Baustein: Wo es um Geld und Konto geht, vertrauen
       Menschen den hellen Farben. Tinte statt Weiss, sonst bleibt alles wie es war. */
    <Dialog zu={zu}>
      {/* DIE VORLAGE — sein Bild, in derselben Geometrie wie in der Auswahl (3:4). */}
      {vorlageBild && (
        <div className="mb-4 flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={vorlageBild} alt={vorlageName ?? ""}
            className="h-[152px] w-[114px] rounded-2xl object-cover ring-2 ring-offset-2 ring-offset-white ring-[#f6cf51]" />
          {vorlageName && (
            <p className="mt-2 text-[13px] font-black text-[#1a160f]">{vorlageName}</p>
          )}
        </div>
      )}
      <p className="text-[19px] font-black leading-tight text-[#1a160f]">{titel}</p>
      <p className="mx-auto mt-2 max-w-[280px] text-[13.5px] font-semibold leading-snug text-[#1a160f]/70">{grund}</p>
      <div className="mt-5">
        <Knopf art="gold" onClick={aufAnmelden}>{knopf}</Knopf>
      </div>
      {spaeter && (
        /* Der Ausweg muss im hellen Kasten sichtbar bleiben — `text-white/55` war hier
           dasselbe unsichtbare Nichts wie einst beim Umriss-Knopf (siehe dort). */
        <button type="button" onClick={aufSpaeter ?? zu}
          className="mt-3 w-full text-[12.5px] font-bold text-[#1a160f]/55 underline underline-offset-2 active:scale-95 transition">
          {spaeter}
        </button>
      )}
    </Dialog>
  );
}

/**
 * EINE KACHEL MIT VIDEO — EIGENE KOMPONENTE, WEIL SIE EINEN EIGENEN BEOBACHTER BRAUCHT
 * (Owner 12.08.2026: „man muss die Videos sehen im ganzen Tunel" → „ok, bauen"). Ein Hook
 * (`useKachelSichtbar`) darf nicht in einer `.map()`-Schleife der Elternkomponente stehen —
 * React ruft Hooks je Komponenteninstanz auf, nicht je Schleifendurchlauf. Kacheln OHNE
 * Video bleiben deshalb im normalen `.map()` unten, unveraendert; nur Kacheln MIT Video
 * kommen hierher.
 *
 * TIPPEN AUF DIE KACHEL BLEIBT DIE AUSWAHL (Vorgabe 1 des Auftrags) — dafuer ist der
 * Rahmen ein `div[role=button]` statt eines echten `<button>`: Ein `<button>` darf laut
 * HTML kein zweites `<button>` (die Vergroessern-Scheibe) enthalten, der Browser wuerde es
 * stillschweigend herausbrechen und der Tipp landete an der falschen Stelle.
 */
function BildWahlKachel({ b, an, gross, ansehenLabel, sprache, titel, features, waehle }: {
  b: { id: string; name: string; bild: string; video?: string; poster?: string };
  an: boolean;
  gross: boolean;
  ansehenLabel?: string;
  /** Sprache/Titel der Karte im Vollbild (Owner 12.08.2026, siehe `VorlagenUeberlagerung`). */
  sprache?: string;
  titel?: string;
  /** Durchgereicht an `VorlagenUeberlagerung` (Owner-Zusatzauftrag 12.08.2026). */
  features?: ReactNode;
  waehle: () => void;
}) {
  const [ref, sichtbar] = useKachelSichtbar<HTMLDivElement>();
  const [offen, setOffen] = useState(false);
  const poster = b.poster || b.bild;
  const label = ansehenLabel || "Vorlage ansehen";
  return (
    <>
      <div ref={ref} role="button" tabIndex={0} aria-pressed={an}
        onClick={waehle}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); waehle(); } }}
        className={`shrink-0 cursor-pointer text-center transition active:scale-95 ${gross ? "snap-start" : ""}`}>
        <span className={`relative block overflow-hidden ring-2 ${gross ? "h-[213px] w-[160px] rounded-2xl" : "h-[104px] w-[78px] rounded-xl"} ${an ? "ring-[#f6cf51]" : "ring-white/15"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {/* `loading="lazy"`: der Try-on-Slider trägt die GANZE Wardrobe (97 Kacheln,
              Owner 13.08.2026) — ohne lazy lüde die Seite alle Bilder auf einmal. */}
          <img src={poster} alt={b.name} loading="lazy" className="block h-full w-full object-cover" />
          {sichtbar && (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={b.video} poster={poster} muted playsInline autoPlay loop
              /* KLEINE STUMME KACHEL-VORSCHAU, EINFACHES `loop` (Memory
                 „videos-nahtlos-schleifen" verlangt die Zwei-Spieler-Ueberblendung fuer
                 GROSSE Videos MIT Ton — hier ist die Kachel stumm und 78-160px breit; der
                 Schnitt am Loop-Ende ist auf dieser Flaeche nicht zu sehen, zwei Player je
                 Kachel in einer Wisch-Reihe waeren unnoetiger Aufwand). */
              className="absolute inset-0 h-full w-full object-cover" />
          )}
          <div className="absolute right-1.5 top-1.5 z-10" onClick={e => e.stopPropagation()}>
            {/* VERGROESSERN MIT TON — `stopPropagation`, damit der Tipp auf die Scheibe
                nicht zugleich die Auswahl umschaltet (Vorgabe: Tippen waehlt, Vergroessern
                ist ein eigener Knopf). */}
            <Scheibe klein durchsichtig label={label} onClick={() => setOffen(true)}>
              <Maximize2 className="h-4 w-4" />
            </Scheibe>
          </div>
        </span>
        <span className={`mt-1.5 block font-black leading-tight ${gross ? "max-w-[160px] text-[13px]" : "max-w-[78px] text-[11px]"} ${an ? "text-[#f6cf51]" : "text-white/70"}`}>
          {b.name}
        </span>
      </div>
      {offen && b.video && <VorlagenUeberlagerung videoUrl={b.video} posterUrl={poster} sprache={sprache} titel={titel} features={features} zu={() => setOffen(false)} />}
    </>
  );
}

export function BildWahl({ bilder, wert, waehle, gross = false, ansehenLabel, sprache, titel, features, className = "" }: {
  bilder: { id: string; name: string; bild: string; video?: string; poster?: string }[];
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
  /** Vorlesetext der Vergroessern-Scheibe, fuer Kacheln MIT `video` — „Vorlage ansehen" in
   *  der Sprache der Seite. Ohne eigenes Label faellt sie auf den deutschen Text zurueck. */
  ansehenLabel?: string;
  /**
   * SPRACHE UND TITEL DER KARTE IM VOLLBILD (Owner 12.08.2026: „wir sollen die karten
   * zeigen, die erzeugt werden beim vrgrössern … Deswegen haben wir die karten gemacht und
   * nicht das blanke video") — nur fuer Kacheln MIT `video` gebraucht, gereicht an
   * `VorlagenUeberlagerung`.
   */
  sprache?: string;
  titel?: string;
  /** Durchgereicht an jede Kachel MIT Video (Owner-Zusatzauftrag 12.08.2026, siehe
   *  `VorlagenUeberlagerung`). Kacheln ohne `video` haben ohnehin kein Vollbild. */
  features?: ReactNode;
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
    /* UEBER DIE GANZE BREITE (Owner 12.08.2026, am Urlaubs-Slider: „was ist hier los mit
       dem SLider? geht nicht über die ganze breite") — dasselbe `-mx-4 px-4`-Muster wie
       die Themen-Kreise: Die Reihe läuft randbündig durch die Spalte, statt als schmaler
       Block mit toter Fläche daneben zu stehen. `snap-start` statt `snap-center`: Die
       Slides reihen sich vom Rand auf, nichts hängt als angeschnittener Streifen links. */
    /* EINE EINZIGE KACHEL STEHT MITTIG (Owner 14.08.2026, am Versprechen-Schritt 2: „hier
       steht links. Mache es in die Mitte damit der user nicht denkt es fehlt was").
       `VERSPRECHEN_LOOKS` hat genau einen Look; die Reihe ist aber für mehrere gebaut und
       legte ihn linksbündig an — daneben eine halbe Bildschirmbreite Leere, die aussieht,
       als wäre der Rest nicht geladen. Ab zwei Kacheln bleibt alles wie bisher: dann ist
       die Reihe ein Slider, und linksbündig ist dort richtig. */
    <div className={`lb-wisch -mx-4 flex items-start overflow-x-auto px-4 py-1.5 ${bilder.length === 1 ? "justify-center" : ""} ${gross ? "snap-x snap-mandatory gap-3" : "gap-2"} ${className}`}>
      {bilder.map(b => {
        const an = b.id === wert;
        {/* KACHELN MIT VIDEO GEHEN AN DIE EIGENE KOMPONENTE (Owner 12.08.2026: „man muss die
            Videos sehen im ganzen Tunel" → „ok, bauen") — sie braucht ihren eigenen
            Sichtbarkeits-Beobachter (`useKachelSichtbar`), den ein Hook nicht innerhalb
            dieser Schleife bekommen darf. KACHELN OHNE VIDEO LAUFEN UNVERAENDERT WEITER,
            genau der Code, der hier schon vor diesem Auftrag stand — keine Verhaltens-
            aenderung fuer bestehende Aufrufer ohne `video`. */}
        if (b.video) {
          return (
            <BildWahlKachel key={b.id} b={b} an={an} gross={gross} ansehenLabel={ansehenLabel}
              sprache={sprache} titel={titel} features={features} waehle={() => waehle(b.id)} />
          );
        }
        return (
          <button key={b.id} type="button" onClick={() => waehle(b.id)}
            aria-pressed={an}
            className={`shrink-0 text-center transition active:scale-95 ${gross ? "snap-start" : ""}`}>
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
            {/* KEIN FESTER DUNKLER ABSTANDSRING (Owner 12.08.2026, helle Fassung: „bitte
                nicht schon wieder schwarze rahmen") — `ring-offset-[#0b0a09]` malte in Hell
                um JEDE Kachel einen schwarzen Rahmen. Ohne Versatz zeigt die Wahl der Ring
                allein; er liegt direkt am Bild, in beiden Fassungen sauber. */}
            <span className={`block overflow-hidden ring-2 ${gross ? "h-[213px] w-[160px] rounded-2xl" : "h-[104px] w-[78px] rounded-xl"} ${an
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

/**
 * DER IN-APP-BROWSER-HINWEIS (15.08.2026) — die Antwort auf den teuersten gemessenen Fehler
 * dieses Projekts.
 *
 * BEFUND (Ereignisprotokoll, seit 14.08., interne Sitzungen ausgeschlossen): 41 von 107
 * Tunnel-Oeffnungen kamen aus einem In-App-Browser, und ALLE 23 Kamera-Fehler trugen `; wv)`
 * im User-Agent — Android WebView, der Browser der Facebook-App. Erfolgreiche Aufnahmen gab
 * es nur in echten Browsern. Anders gesagt: Wer ueber eine Facebook-Anzeige kommt und ein
 * Produkt mit Aufnahme kauft, scheitert an einer Browser-Einstellung, nicht am Angebot.
 *
 * Der Hinweis erscheint deshalb NICHT erst nach dem Fehlschlag, sondern davor — wer erst auf
 * „Kamera aus" laeuft, hat den Trichter meist schon verlassen.
 *
 * Android bekommt einen Knopf, der Chrome wirklich oeffnet (`intent://`). iOS laesst das
 * nicht zu; dort bleibt „Link kopieren" plus ein Satz, was damit zu tun ist.
 */
export function InAppBrowserHinweis({ sprache = "de", className = "" }: { sprache?: string; className?: string }) {
  const [inApp, setInApp] = useState(false);
  const [android, setAndroid] = useState(false);
  const [kopiert, setKopiert] = useState(false);

  useEffect(() => { setInApp(istInAppBrowser()); setAndroid(istAndroid()); }, []);

  const T = ({
    de: { titel: "Für die Aufnahme im Browser öffnen", text: "Die Facebook-App lässt die Kamera nicht zu. Öffne diese Seite in deinem Browser — dort funktioniert sie.", chrome: "In Chrome öffnen", kopieren: "Link kopieren", ok: "Kopiert — jetzt im Browser einfügen" },
    en: { titel: "Open in your browser to record", text: "The Facebook app blocks the camera. Open this page in your browser — it works there.", chrome: "Open in Chrome", kopieren: "Copy link", ok: "Copied — now paste it in your browser" },
    ro: { titel: "Deschide în browser pentru filmare", text: "Aplicația Facebook nu permite camera. Deschide pagina în browser — acolo funcționează.", chrome: "Deschide în Chrome", kopieren: "Copiază linkul", ok: "Copiat — lipește-l în browser" },
    es: { titel: "Ábrelo en el navegador para grabar", text: "La app de Facebook bloquea la cámara. Abre esta página en tu navegador — allí funciona.", chrome: "Abrir en Chrome", kopieren: "Copiar enlace", ok: "Copiado — pégalo en el navegador" },
    fr: { titel: "Ouvre dans le navigateur pour filmer", text: "L'application Facebook bloque la caméra. Ouvre cette page dans ton navigateur — elle y fonctionne.", chrome: "Ouvrir dans Chrome", kopieren: "Copier le lien", ok: "Copié — colle-le dans le navigateur" },
    pt: { titel: "Abre no navegador para gravar", text: "A app do Facebook bloqueia a câmara. Abre esta página no teu navegador — aí funciona.", chrome: "Abrir no Chrome", kopieren: "Copiar link", ok: "Copiado — cola no navegador" },
    it: { titel: "Apri nel browser per filmare", text: "L'app di Facebook blocca la fotocamera. Apri questa pagina nel tuo browser — lì funziona.", chrome: "Apri in Chrome", kopieren: "Copia il link", ok: "Copiato — incollalo nel browser" },
  } as Record<string, { titel: string; text: string; chrome: string; kopieren: string; ok: string }>)[sprache] ?? {
    titel: "Open in your browser to record", text: "The Facebook app blocks the camera. Open this page in your browser — it works there.",
    chrome: "Open in Chrome", kopieren: "Copy link", ok: "Copied — now paste it in your browser",
  };

  if (!inApp) return null;

  const raus = () => {
    const url = window.location.href;
    if (android) { window.location.href = chromeIntentUrl(url); return; }
    navigator.clipboard?.writeText(url).then(() => setKopiert(true)).catch(() => setKopiert(false));
  };

  return (
    <div className={`rounded-2xl border border-[#f6cf51]/40 lb-goldhauch p-3 ${className}`}>
      <p className="text-[13px] font-black text-[#f6cf51]">{T.titel}</p>
      <p className="mt-1 text-[12px] font-bold leading-snug opacity-85">{T.text}</p>
      <button type="button" onClick={raus}
        className="mt-2.5 w-full rounded-xl border border-[#f6cf51]/50 bg-[#f6cf51]/15 px-3 py-2 text-[13px] font-black text-[#f6cf51] active:scale-[0.98]">
        {kopiert ? T.ok : android ? T.chrome : T.kopieren}
      </button>
    </div>
  );
}
