"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Wrench, ImagePlus, X, Sparkles } from "lucide-react";
/* Für den Platz unter dem Eingabefeld, solange der Cookie-Streifen liegt (Owner 13.09.2026). */
import { brauchtEinwilligung } from "@/lib/land-erkennen";
import { Wortmarke } from "@/components/VersusForgeMarke";
import SprachKnopf from "@/components/SprachKnopf";
import { LANGS, LANG_LABEL, LANG_COOKIE, type Lang } from "@/lib/lang";
import { eur, VERSUSFORGE_ABO_CENTS } from "@/lib/pricing";
import type { AgentChatTexte } from "@/lib/agent-chat-texte";
import { schrittMessen } from "@/lib/versusforge-messen";
import { EIGENER_MANDANT } from "@/lib/versusforge-namen";

/**
 * DER AGENT ALS CHAT — der Prototyp auf dem Zweig `agent` (Owner 09.09.2026).
 *
 * ── WAS MAN HIER SEHEN SOLL ────────────────────────────────────────────────────────────────
 *
 * Nicht die Gestaltung — die ist dieselbe wie auf `main`. Sondern DASS DER AGENT ETWAS TUT:
 * Er liest eine Website, weil eine Adresse fiel. Er prüft einen Hook, bevor er ihn vorschlägt.
 * Er baut das Bild, sobald der Satz steht. Niemand drückt dafür einen Knopf, und in keiner
 * Zeile Code steht, in welcher Reihenfolge das passiert.
 *
 * DESHALB DIE WERKZEUGZEILE unter den Nachrichten: Sie zeigt, was er gerade benutzt hat. Für
 * einen Kunden würde sie später verschwinden — hier ist sie der Beweis.
 *
 * WAS ER NOCH NICHT KANN: Plan bauen, Trichter anlegen, Mail verschicken, Anfragen zählen.
 * Alle vier Funktionen existieren; sie kommen dazu, wenn die Schleife trägt. Drei Werkzeuge
 * sind ein Beweis, zehn wären ein Umbau vor der Abnahme.
 *
 * ── KEIN SATZ MEHR IN DIESER DATEI ─────────────────────────────────────────────────────────
 *
 * Alles Gesprochene steht in `lib/agent-chat-texte.ts` und kommt übersetzt herein. Der Grund
 * steht dort; hier zählt die Folge: Wer einen Satz ändern will, ändert ihn an EINER Stelle
 * und in allen drei Sprachen zugleich.
 */

/**
 * ── WIE VIELE WERKE DER TRICHTER NIMMT (Owner 13.09.2026: „laden hier bis zu 5 Bilder hoch") ──
 *
 * FÜNF HIER, ZEHN IM DASHBOARD. Der Trichter soll kurz sein — wer fünf Bilder gewählt hat, ist
 * fertig; wer zehn wählen soll, sucht noch. Aufgefüllt wird später auf seiner Seite
 * (`WERKE_MAX` in components/PortalBearbeiten.tsx), wo ihn nichts mehr abbricht.
 *
 * DIE ZAHL STEHT AN EINER STELLE. Sie stand vorher fünfmal als nackte `10` im Code und noch
 * einmal in drei Sprachtabellen — genau die Streuung, die bei der Werke-Grenze dazu geführt
 * hat, dass Trichter, Formular und Route drei verschiedene Zahlen kannten. Die Texte in
 * `lib/agent-chat-texte.ts` müssen ihr von Hand folgen; dort steht der Hinweis darauf.
 */
/**
 * ── EIN EINZIGES BILD (Owner 13.09.2026: „wir sagen, wir laden nur ein bild hoch nicht 1-5") ──
 *
 * Der Weg dieser Zahl an einem Tag: 10 → 5 → 3 → 5 → 1. Sie endet bei EINS, und das ist
 * folgerichtig: Analysiert wurde ohnehin nur ein Werk („wir machen ab jetzt nur ein bild
 * analysiere"). Fünf hochladen zu lassen und vier davon unbeachtet zu lassen, versprach etwas,
 * das der Trichter nicht einlöst.
 *
 * DAS `multiple` AM DATEIFELD IST DESHALB AUCH WEG: Ein Auswahlfenster, das vier Bilder
 * annimmt, von denen drei stillschweigend verschwinden, ist genau die Sorte stummer Verlust,
 * die hier schon einmal Ärger gemacht hat.
 */
/**
 * ── ZEHN WERKE HOCH, EINES ANALYSIERT (Owner 14.09.2026: „überlege im Tunnel doch 10 Bilder
 * zuzulassen, damit die Seite nach was aussieht, und ein Bild wird nur analysiert und bekommt
 * Text. Die anderen nicht. Das kostet uns nichts. Nur eine Analyse") ─────────────────────────
 *
 * Der Weg dieser Zahl: 10 → 5 → 3 → 5 → 1 → 10. Die 1 war richtig, solange jedes Bild eine
 * Analyse bekam; seit nur noch das ERSTE analysiert wird, kostet das zehnte Bild nichts mehr —
 * es macht die fertige Seite nur voller.
 *
 * WAS TROTZDEM JEDES BILD DURCHLÄUFT: die Moderation (`bildPruefen`). Sie ist kostenlos und ist
 * die Sperre, die verhindert, dass jemand über Bild Nummer sieben Pornografie auf eine öffentliche
 * Seite stellt (Owner 13.09.2026: „jemand kann hier Pornografie posten und geht sofort online").
 */
const WERKE_TRICHTER = 10;

/**
 * ── EINE ADRESSE MIT ZWEI PUNKTEN IST KEINE (gefunden 13.09.2026) ────────────────────────────
 *
 * Dorin Macovei hat zehn Werke hochgeladen und `dorin61arts@yahoo..com` angegeben. Das alte
 * Muster (`[^@\s]+@[^@\s]+\.[a-z]{2,}`) liess das durch: „yahoo." zählte als Name, „com" als
 * Endung. Seine Bestätigungsmail ging ins Nichts, und er wartet bis heute — alles richtig
 * gemacht, und trotzdem verloren.
 *
 * DIESES MUSTER VERBIETET LEERE TEILE: kein Punkt am Anfang, keiner am Ende, nie zwei
 * hintereinander. Es prüft NICHT, ob es das Postfach gibt — das kann keine Zeichenkette. Es
 * fängt den Tippfehler, der sonst niemandem auffällt, bis die Mail nicht ankommt.
 *
 * DASSELBE MUSTER STEHT IN `api/versusforge-agent` UND `api/portal-behalten`. Dort ist es
 * verdoppelt statt geteilt, weil dieses Bauteil im Browser läuft und ein gemeinsamer Import
 * den halben Serverbaum mitziehen würde ([[versusforge-namen]] beschreibt genau diesen Fall).
 * Wer eines ändert, ändert alle drei.
 */
/**
 * Ein Bild auf 1080 Pixel Breite bringen und als JPEG zurückgeben — `null`, wenn der Browser es
 * nicht öffnen kann (HEIC etwa). Steht auf Modulebene, weil zwei Wege sie brauchen: der erste
 * Upload und das Nachlegen in der Galerie.
 */
const bildVerkleinern = async (f: File): Promise<string | null> => {
  try {
    const bitmap = await createImageBitmap(f);
    const breit = Math.min(1080, bitmap.width);
    const hoch = Math.round((bitmap.height / bitmap.width) * breit);
    const flaeche = document.createElement("canvas");
    flaeche.width = breit; flaeche.height = hoch;
    flaeche.getContext("2d")?.drawImage(bitmap, 0, 0, breit, hoch);
    return flaeche.toDataURL("image/jpeg", 0.85);
  } catch {
    return null;
  }
};

/**
 * ── MINDESTENS ZWEI BUCHSTABEN NACH DEM LETZTEN PUNKT (14.09.2026) ─────────────────────────
 *
 * Vorher reichte „irgendetwas" als Endung. Valentin tippte `oana_boboc@yahoo.c`, der Trichter
 * liess es durch, seine Seite entstand — und die Freigabe-Mail kam zurück: „Host or domain name
 * not found. Name service error for name=yahoo.c". Er ist seitdem nicht erreichbar.
 *
 * Eine Endung aus einem Buchstaben gibt es nicht. Dieselbe Regel gilt in der Agenten-Route
 * (`app/api/versusforge-agent/route.ts`) und jetzt auch hier und auf dem Server.
 */
const MAIL_MUSTER = /^[^@\s.]+(\.[^@\s.]+)*@[^@\s.]+(\.[^@\s.]+)*\.[a-z]{2,}$/i;

/**
 * ── DIE STARTNACHRICHT, AN DREI STELLEN GLEICH (Owner 13.09.2026, Umbau auf Upload-zuerst) ───
 *
 * AUF LAKATOSBANDI TRÄGT SIE KEINEN CHIP MEHR: Die Zustimmung ist der Hochladeknopf IN der
 * Karte. Ein zusätzlicher schwarzer Chip darunter wäre ein zweiter Weg für dieselbe Sache —
 * und der eine, der nicht hochlädt, käme in eine Frage, die es nicht mehr gibt.
 *
 * AUF VERSUSFORGE BLEIBT ALLES, WIE ES WAR: dort führt der Chip weiterhin ins Gespräch.
 *
 * MODULEBENE UND MIT PARAMETERN, nicht als Closure im Bauteil: Sonst wechselt die Funktion bei
 * jedem Rendern ihre Identität, landet in der Abhängigkeitsliste des `useEffect` unten und
 * setzt dort in einer Schleife Zustand.
 */
const startNachricht = (gruss: string, chip: string, portal: boolean): Nachricht =>
  ({ rolle: "agent", text: gruss, ...(portal ? {} : { vorschlaege: [chip] }) });

type Nachricht = {
  rolle: "mensch" | "agent";
  text: string;
  benutzt?: string[];
  bild?: string;
  /** Die Bilder, die ER mit dieser Nachricht gezeigt hat — sie bleiben im Gespräch sichtbar. */
  fotos?: string[];
  vorschlaege?: string[];
  /** Die Sprachfrage — sie trägt keine Chips, sondern die Sprachen als Knöpfe. */
  sprachfrage?: boolean;
  /** Der Agent bittet um Bilder — dann steht darunter der Knopf „Bilder hochladen" statt Chips. */
  bilderBitte?: boolean;
  /** Sein Bild Nummer `nr` mit dem gewählten Spruch darunter (Owner 10.09.2026). */
  vorschau?: { nr: number; spruch: string };
  /** „Willst du alles löschen?" — Ja und Nein als feste Knöpfe. */
  loeschFrage?: boolean;
  /** „Willst du noch bis zu N Bilder hochladen?" — die Frage steht im Text, darunter Ja und Nein. */
  mehrBilder?: number;
  /** Die Chips sind „Bild 1 … N" — gezeigt werden die Bilder selbst. */
  bilderWahl?: boolean;
  /** Die Chips sind Sprüche für Bild Nummer `spruchWahl` — ein Tipp zeigt sofort das Bild mit Spruch. */
  spruchWahl?: number;
  /** Wie viele Bilder vor dieser Nachricht schon ausgewertet waren — „Zurück" wirft die Auswertung ihrer Bilder weg. */
  werkeVorher?: number;
  /** Seine eigene Fassung nach „✎" — unter dem Bild steht dann „Meinen Text nehmen". */
  eigenerSpruch?: { nr: number; spruch: string };
  /** Nach dem Abschluss: „Seite bearbeiten" — das Angebot, das Profil zu ergänzen (Owner 11.09.2026). */
  profilLink?: string;
  /** Der Agent fragt nach Künstlername und E-Mail — darunter stehen zwei Felder. */
  kontaktFrage?: boolean;
  /**
   * ── DIE ZWEI SCHRITTE VOR DER ADRESSE (Owner 13.09.2026) ─────────────────────────────────
   *
   * `analyse`: Seine Bilder liegen im Browser, darunter steht „Analizează acum". Erst dieser
   * Knopf löst den einen Modellaufruf aus — vorher kostet nichts.
   *
   * `publizieren`: Unter der fertigen Vorschau steht „Vrei să publicăm asta?" mit Ja und Nein.
   * Sein Ja führt zur Adresse (oder, wenn er aus dem Sofortformular kommt, direkt zur Seite).
   */
  analyse?: boolean;
  publizieren?: boolean;
  /** Nach dem ersten Nein: „Soll ich den Satz anders schreiben?" mit Neu-schreiben und Nein. */
  nochmal?: boolean;
  /**
   * ── DAS NEUE ENDE (Owner 13.09.2026) ──────────────────────────────────────────────────────
   *
   * `seiteFertig`: Seine Seite EXISTIERT bereits — unter einer Behelfsadresse, ohne Namen. Die
   * Nachricht trägt den Link dorthin und darunter die zwei Felder, mit denen er sie behält.
   *
   * `behalten`: Sie gehört ihm. Ab hier gibt es nichts mehr zu tun.
   */
  seiteFertig?: boolean;
  behalten?: boolean;
};

/**
 * ── DIE SPRACHFRAGE STEHT AUF ENGLISCH (Owner 09.09.2026: „er kann gleich damit anfangen,
 * welche Sprache er spricht — auf Englisch? Choose a language") ─────────────────────────────
 *
 * DIE BEGRÜNDUNG IST EINE ABZÄHLUNG: Diese eine Zeile muss jemand lesen können, dessen
 * Sprache wir noch NICHT kennen. Auf Deutsch gestellt, verliert sie den Rumänen; auf
 * Rumänisch den Deutschen. Englisch ist die einzige, die in dieser Runde fast jeder
 * entziffert — und wer sie nicht liest, erkennt trotzdem seine Sprache auf dem Knopf
 * darunter, weil dort „Română" steht und nicht „Rumänisch".
 *
 * DREI WÖRTER, KEIN SATZ. Was vor der Sprachwahl steht, wird nicht gelesen, sondern erkannt.
 */
const SPRACHFRAGE = "Choose a language";

/**
 * ── ER DARF DIE SPRACHE AUCH TIPPEN (Owner 09.09.2026, mit Bild: er schrieb „Polish", und
 * der Agent fragte zurueck, ob er einen Text polieren solle) ────────────────────────────────
 *
 * ZWEI FEHLER LAGEN DARIN, beide meine:
 *  · Die Sprachfrage ging NICHT im Verlauf mit — das Modell bekam ein nacktes „Polish" ohne
 *    die Frage davor und musste raten. Ein Wort ohne Frage ist keine Antwort.
 *  · Es kostete einen bezahlten Aufruf, um auf eine Frage zu antworten, die der Browser
 *    selbst beantworten kann ([[kein-token-fuer-abbrecher]]).
 *
 * WER EINE SPRACHE NENNT, MEINT DIE SPRACHE. Das erkennt eine Liste, kein Modell — und sie
 * erkennt auch die, die wir NICHT sprechen: Auf „Polish" gehoert eine ehrliche Absage, nicht
 * eine Rueckfrage. Es sind drei Sprachen, und das darf man sagen.
 *
 * DIE SCHREIBWEISEN GEHEN QUER DURCH: Jemand nennt seine Sprache mal in der eigenen, mal in
 * der Sprache der Seite. „Romanian", „rumänisch", „română" — dasselbe Anliegen.
 */
const SPRACH_WORTE: Record<Lang, string[]> = {
  de: ["deutsch", "german", "germana", "germană", "de", "nemteste", "nemțește"],
  en: ["english", "englisch", "engleza", "engleză", "en"],
  ro: ["romana", "română", "romanian", "rumaenisch", "rumänisch", "ro", "romaneste", "românește"],
};

/**
 * SPRACHEN, DIE WIR NICHT SPRECHEN — erkannt, damit die Absage eine Antwort ist.
 *
 * Die Liste ist bewusst kurz: die Nachbarsprachen der beiden Märkte plus die grossen. Wer
 * etwas anderes nennt, faellt in den letzten Fall und wird einfach ins Gespraech gelassen.
 */
const FREMDE_SPRACHE = [
  "polish", "polnisch", "polski", "pl",
  "spanish", "spanisch", "espanol", "español", "spaniola", "spaniolă",
  "french", "franzoesisch", "französisch", "francais", "français", "franceza", "franceză",
  "italian", "italienisch", "italiano", "italiana", "italiană",
  "portuguese", "portugiesisch", "portugues", "português",
  "hungarian", "ungarisch", "magyar", "maghiara", "maghiară",
  "turkish", "tuerkisch", "türkisch", "turkce", "türkçe",
  "russian", "russisch", "russkiy", "rusa", "rusă",
  "ukrainian", "ukrainisch", "bulgarian", "bulgarisch", "serbian", "serbisch",
  "dutch", "niederlaendisch", "niederländisch", "greek", "griechisch",
];

/**
 * DIE ABSAGE STEHT AUF ENGLISCH, wie die Frage — aus demselben Grund: Wer nach Polnisch
 * fragt, liest weder Deutsch noch Rumänisch sicher.
 *
 * SIE NENNT DIE DREI BEIM NAMEN und entschuldigt sich nicht. „Noch nicht" ist wahr und sagt
 * zugleich, dass es kein Versehen ist.
 */
const SPRACHE_ABSAGE = "I speak German, English and Romanian — not more, not yet.";

/* ENGLISCH ZUERST, DANN RUMÄNISCH, DANN DEUTSCH (Owner 10.09.2026: „Alles muss mit Englisch
   anfangen, dann Rumänisch und Deutsch"). Nur für diese Knöpfe — `LANGS` gilt für die ganze
   Seite und bleibt, wie es ist. */
const SPRACH_REIHENFOLGE: Lang[] = ["en", "ro", "de"];

/** Trifft das Getippte eine Sprache? Nur kurze Eingaben, sonst redet er schon über sein Geschäft. */
function sprachAntwort(text: string): { sprache?: Lang; fremd?: boolean } {
  const w = text.toLowerCase().trim().replace(/[.!?,]+$/, "");
  /* Mehr als drei Wörter ist keine Sprachnennung, sondern ein Satz — den nehmen wir ernst. */
  if (!w || w.split(/\s+/).length > 3) return {};
  for (const l of LANGS) if (SPRACH_WORTE[l].some(k => w === k || w.includes(k))) return { sprache: l };
  if (FREMDE_SPRACHE.some(k => w === k || w.includes(k))) return { fremd: true };
  return {};
}

/**
 * DIE FRAGE STEHT FETT (Owner 11.09.2026, rumänischer Chat mit langem Absatz vor der Frage: „die Fragen sollen
 * fett sein"). Der letzte Satz, der mit „?" endet, wird hervorgehoben — wer den Absatz überfliegt, sieht
 * trotzdem, worauf er antworten soll.
 */
function fetteFrage(text: string) {
  const ende = text.lastIndexOf("?");
  if (ende < 0) return text;
  const davor = Math.max(text.lastIndexOf(".", ende - 1), text.lastIndexOf("!", ende - 1), text.lastIndexOf("?", ende - 1), text.lastIndexOf("\n", ende - 1));
  let start = davor + 1;
  while (start < ende && /\s/.test(text[start])) start++;
  return (
    <>
      {text.slice(0, start)}
      <strong className="font-bold">{text.slice(start, ende + 1)}</strong>
      {text.slice(ende + 1)}
    </>
  );
}

export default function AgentChat({ S: SQuelle, lang, gewaehlt, auftrag, lead = "", fenster = false, start = "/engine/agent", marke = "versusforge" }: {
  /**
   * ── SEINE KENNUNG AUS DEM FACEBOOK-SOFORTFORMULAR (Owner 13.09.2026) ──────────────────────
   *
   * Sie steht im Link der Mail (`?l=…`) und reist ab dem ersten Klick an jedem Aufruf mit.
   * Damit ist sein Gespräch — und jedes Bild darin — seiner Adresse zugeordnet, BEVOR er das
   * erste Bild hochlädt. Der Server entscheidet daran, ob er nach Name und E-Mail fragen muss
   * (lib/kuenstler-lead.ts).
   *
   * LEER HEISST: normaler Besucher. Dann bleibt der Trichter, wie er war.
   */
  lead?: string;
  /**
   * ALS FENSTER AUF EINER ANDEREN SEITE (Owner 10.09.2026, lakatosbandi.com: „hier brauchen wir
   * unseren eigenen Agenten noch auf der Seite, der mit den Leuten redet … der sofort aufklappt").
   * Dann füllt der Chat seinen Rahmen statt den Bildschirm, trägt keinen eigenen Kopf (den hat
   * das Fenster) und verlässt die Seite nie — „Neu anfangen" springt zurück zum Gruss statt auf
   * `/engine/agent`. Die Sprache kommt von der Seite (`gewaehlt`).
   */
  fenster?: boolean;
  S: AgentChatTexte;
  /** Die Sprache, in der dieser Chat gerendert wurde — Wahl vor Browser. */
  lang: Lang;
  /** Steht schon eine WAHL im Cookie? Dann wird nicht mehr gefragt. */
  gewaehlt: boolean;
  /**
   * SEIN SATZ VON DER STARTSEITE (10.09.2026) — wenn er aus der Anzeige kommt und oben schon
   * geschrieben hat, was er anbietet. Er geht erst nach dem Ja an das Modell.
   */
  auftrag?: string;
  /**
   * AUF LAKATOSBANDI.COM (Owner 11.09.2026: „du musst schauen, wo die Seite angelegt wird. Nicht auf VersusForge"):
   * `start` ist die Adresse dieses Chats („/start" statt „/engine/agent"), `marke` der Name über seinen Nachrichten.
   */
  start?: string;
  marke?: "versusforge" | "lakatosbandi";
}) {
  const router = useRouter();

  /**
   * „SEITE GESEHEN" — DER CHAT ZÄHLTE BISHER NICHTS (Owner 11.09.2026: „ich sehe die Leute klicken
   * schon von der Anzeige, die sehe ich nicht … und ich sehe auch nicht, was die im Chat machen").
   *
   * Weder `versusforge.com/engine` noch `lakatosbandi.com/start` meldeten je einen Besuch — der
   * alte Chat (`VersusForgeStartEinfach.tsx`) tat es, dieser gemeinsame Chat nie. Dieselbe
   * Zählung wie dort: EIN Mandant (`EIGENER_MANDANT`), damit Startseite, Chat-Aufruf und
   * Chat-Abschluss in einem Trichter landen, nicht in drei getrennten Zahlen.
   */
  useEffect(() => { schrittMessen(EIGENER_MANDANT, "seite"); }, []);

  /* AUF LAKATOSBANDI.COM HEISST DIE ZUSTIMMUNG „DA, VREAU" (Owner 11.09.2026) — über denselben Schlüssel, damit jede
     Stelle, die auf die Zustimmung prüft (`S.chipEinverstanden`), weiter greift. */
  const S = marke === "lakatosbandi" ? { ...SQuelle, chipEinverstanden: SQuelle.startJa } : SQuelle;

  /**
   * DER GRUSS — ZUSAMMENGESETZT, NICHT GETIPPT (Owner 09.09.2026: „er muss doch auch mit
   * einer Begrüssung anfangen").
   *
   * ER HAT RECHT, UND ES IST MEHR ALS HÖFLICHKEIT: Ein leerer Chat ist eine Aufforderung ohne
   * Absender. Wer ihn öffnet, weiss nicht, mit wem er spricht und was hier erwartet wird —
   * und tippt im Zweifel gar nichts.
   *
   * FEST GESCHRIEBEN, NICHT VOM MODELL: Ein Gruss vom Modell wäre ein bezahlter Aufruf bei
   * jedem Seitenaufruf — auch bei jedem Bot und bei jedem, der sofort wieder geht. Der Satz
   * ändert sich nie; ihn erzeugen zu lassen wäre Geld für ein bekanntes Ergebnis
   * ([[kein-token-fuer-abbrecher]]). Übersetzt wird er trotzdem — einmal je Sprache,
   * zwischengespeichert, nicht je Besucher.
   *
   * ER GEHT IM VERLAUF MIT zum Server: Sonst grüsst der Agent in seiner ersten echten Antwort
   * ein zweites Mal.
   *
   * DIE REIHENFOLGE IST DIE BEGRÜNDUNG:
   *  · wer spricht (ein KI-Agent, GEBAUT — nie „trainiert", Hausregel aus David vom 06.09.)
   *  · was er liefert (eine zugeschnittene Werbestrategie, nicht Texte aus einer Vorlage)
   *  · wie es schnell geht (drei Regeln, vorher gesagt statt hinterher korrigiert)
   *  · was es kostet (nichts — mit dem Grund, sonst sucht jeder den Haken)
   *  · was mit seinen Daten geschieht (VOR der Einwilligung, sonst ist es keine)
   *  · die Frage
   */
  /* AUF LAKATOSBANDI.COM EINE KARTE STATT SIEBEN ABSÄTZEN (Owner 11.09.2026: „der Text ist fast eine AGB"). Der Text hier
     ist, was im Verlauf zum Modell geht — gezeigt wird die Karte (`startKarte` unten). */
  /* Der Fliesstext, den das Modell als Gruss liest — dieselben Teile wie die Karte, in derselben
     Reihenfolge. `startWarum` ist seit dem 13.09.2026 leer und fällt beim Filtern heraus. */
  const grussPortal = [S.startMockup, S.startTitel, S.startUnterzeile, S.startAnalyse, S.startText, S.startListe, S.startKeinePruefung, S.startBekommstTitel, S.startBekommst, S.startSelbst, S.startGratis, S.startAufruf, S.startFein, S.startDauer, S.startKeineKarte]
    .filter(t => t && t.trim()).join("\n\n");
  const gruss = marke === "lakatosbandi" ? grussPortal : [
    S.gruss1,
    S.gruss2,
    S.grussRegelnTitel,
    S.grussRegeln,
    /* Die Zahl kommt aus dem Schalter, nicht aus dem Satz — sonst steht sie beim nächsten
       Ändern an zwei Stellen und an einer davon falsch. */
    /* JEDER PLATZHALTER, NICHT NUR `{frei}` (10.09.2026, auf der rumänischen Seite gesehen:
       „primele {libere} cereri"). Der Übersetzer hat den Namen des Platzhalters mitübersetzt —
       `{frei}` wurde zu `{libere}`, das Suchen nach `{frei}` ging ins Leere, und die Zahl
       fehlte ([[uebersetzer-fallen]]). Der Satz trägt genau EINEN Platzhalter; also wird
       der erste in geschweiften Klammern ersetzt, egal wie er nach der Übersetzung heisst. */
    /* Seit dem Art-Marketing-Abo (10.09.2026) ist es der Abo-Preis aus der Tabelle. */
    S.grussKostenlos.replace(/\{[^}]*\}/, eur(VERSUSFORGE_ABO_CENTS, lang)),
    S.grussDatenschutz,
    S.grussFrage,
  ].join("\n\n");

  /* Der Anzeigename — die internen Namen sind Werkzeugkennungen, keine Wörter für Menschen. */
  const WERKZEUG_WORT: Record<string, string> = {
    website_lesen: S.werkzeugWebsite,
    hook_pruefen: S.werkzeugHook,
    bild_bauen: S.werkzeugBild,
    beispiel_zeigen: S.werkzeugBeispiel,
    /* Sonst stand hier der interne Name „spruch_zeigen" im Chat. */
    spruch_zeigen: S.werkzeugSpruch,
    /* Owner 11.09.2026: „abschluss_schicken" stand im rumänischen Chat. */
    abschluss_schicken: S.werkzeugAbschluss,
  };

  /**
   * ── WAS ZUERST IM CHAT STEHT ─────────────────────────────────────────────────────────────
   *
   * OHNE WAHL: die Sprachfrage, ALLEIN. Nicht Sprachfrage und Gruss untereinander — dann
   * läse er sechs Absätze in einer Sprache, die er vielleicht gerade wechseln will, und
   * unsere Vorstellung wäre verbrannt, bevor sie stattgefunden hat.
   *
   * MIT WAHL: sofort der Gruss. Wer schon einmal gewählt hat, wird nicht bei jedem Besuch
   * neu gefragt — das ist der Unterschied zwischen Aufmerksamkeit und Gängelei.
   */
  const [verlauf, setVerlauf] = useState<Nachricht[]>(
    gewaehlt
      ? [startNachricht(gruss, S.chipEinverstanden, marke === "lakatosbandi")]
      : [{ rolle: "agent", text: SPRACHFRAGE, sprachfrage: true }],
  );
  const [eingabe, setEingabe] = useState("");
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState("");
  /** Erster Tipp auf „Neu anfangen" — der zweite räumt wirklich ab. */
  const [resetFragt, setResetFragt] = useState(false);
  const ende = useRef<HTMLDivElement>(null);
  const feld = useRef<HTMLTextAreaElement>(null);
  const datei = useRef<HTMLInputElement>(null);
  /* Die Stufe „start" darf genau einmal gezählt werden — wer Bilder wegnimmt und neue wählt,
     ist nicht ein zweiter Besucher (Umbau auf Upload-zuerst, 13.09.2026). */
  const startGemessen = useRef(false);
  /**
   * ── NACH DEM AUSWÄHLEN GEHT ES VON SELBST WEITER (Owner 13.09.2026: „das ist hier ein klick
   * zu viel, er lädt schon ein bild hoch, muss nicht noch mal auf dem Pfeil klicken") ─────────
   *
   * WARUM EIN MERKER UND KEIN DIREKTER AUFRUF: `schicken` liest die Bilder aus dem Zustand.
   * Unmittelbar nach `setFotos` steht dort noch die ALTE Liste (React setzt den Zustand erst zum
   * nächsten Rendern) — ein Aufruf an Ort und Stelle schickte eine leere Auswahl los. Der Merker
   * wird hier gesetzt, und der Effekt darunter schickt, sobald die Bilder wirklich dastehen.
   */
  const sendenNachUpload = useRef(false);
  /**
   * ── SEIN FOTO LEBT IM BROWSER, BIS ES GEBRAUCHT WIRD (Owner 09.09.2026: „du hast den User
   * weder nach einer Homepage gefragt … und auch nicht nach Bildern, die er eventuell
   * hochladen kann") ────────────────────────────────────────────────────────────────────────
   *
   * ES WIRD NIRGENDWO ABGELEGT. Kein Upload-Ordner, keine Adresse, keine Datei, die jemand
   * später löschen müsste — es reist mit genau der einen Nachricht, die daraus ein Bild baut,
   * und ist danach weg. Das ist derselbe Weg wie bei der Sprachaufnahme
   * (`app/api/versusforge-sprache`): Was nicht liegt, muss nicht versprochen werden.
   *
   * VERKLEINERT, BEVOR ES REIST. Ein Handyfoto hat acht Megabyte; gebraucht werden 1080
   * Pixel Breite. Ungeschrumpft wäre es eine Wartezeit am Mobilfunk und ein Aufruf, der an
   * der Grösse scheitert.
   */
  /* BIS ZU VIER BILDER JE NACHRICHT (Kunst-Rezept: „3–4 Bilder im selben Stil"). Nach dem
     Senden stehen sie in SEINER Nachricht im Verlauf und reisen nicht noch einmal mit. */
  /**
   * LIEGT DER COOKIE-STREIFEN GERADE ÜBER DEM FELD? (Owner 13.09.2026: „im Tunnel Cookie-Banner
   * raus. Das verdeckt das Eingabefeld.")
   *
   * Er liegt `fixed bottom-0` über allem — auch über dem Feld, in das man schreiben soll. Ganz
   * weglassen geht nicht: Ohne Einwilligung darf der Meta-Pixel nicht laden, und gemessen wird
   * gerade der Trichter. Also hält das Feld Platz frei, solange der Streifen da ist.
   *
   * DERSELBE WERT WIE IM STREIFEN, und er hört mit: Nach „Akzeptieren" oder „Ablehnen"
   * verschwindet er, und der freigehaltene Platz wäre sonst eine Lücke bis zum nächsten Laden.
   */
  const [cookieOffen, setCookieOffen] = useState(false);
  useEffect(() => {
    const pruefen = () => {
      try { setCookieOffen(brauchtEinwilligung() && !localStorage.getItem("lb_cookie_consent")); }
      catch { setCookieOffen(false); }
    };
    pruefen();
    window.addEventListener("lb-cookie-consent", pruefen);
    return () => window.removeEventListener("lb-cookie-consent", pruefen);
  }, []);

  const [fotos, setFotos] = useState<string[]>([]);
  /* Was der Agent in seinen Bildern gesehen hat — klein, als Text, bei jeder Nachricht zurück
     an den Server. Daran zählt der Server die Aufnahme. */
  const [werke, setWerke] = useState<unknown[]>([]);
  /* Das Bild, zu dem er den Spruch gewählt hat — geht beim Abschluss mit, damit seine Seite es zeigt. */
  const [werkWahl, setWerkWahl] = useState<{ nr: number; bild: string } | null>(null);
  /* „Ich nehme die ersten 4 Bilder." — sichtbar statt still abgeschnitten. */
  const [bildHinweis, setBildHinweis] = useState("");
  /* Die Frage nach weiteren Bildern kommt nur EINMAL im Gespräch (Owner 10.09.2026). */
  /* EINMAL WIRD NACH WEITEREN BILDERN GEFRAGT, DANN NICHT MEHR (Owner 12.09.2026: „nur ein mal
     nach fragen"). Der Browser zählt mit, wie oft die Frage schon kam; der Server entscheidet
     daraus, ob er noch einmal fragt oder zu Preis, Name und E-Mail übergeht. */
  const [bilderFragen, setBilderFragen] = useState(0);
  /* Seine Bestätigung bei Name und E-Mail (Owner 12.09.2026) — ohne sie geht nichts hinaus. */
  const [rechte, setRechte] = useState(false);
  /* Die Karte „Titel · Technik · Größe · Jahr · Preis" nach „Passt das? — Ja" (Owner 10.09.2026). */
  const [werkFormOffen, setWerkFormOffen] = useState(false);
  const [werkInfo, setWerkInfo] = useState({ titel: "", technik: "", groesse: "", jahr: "", preis: "" });
  /* Feedback jederzeit (Owner 10.09.2026: „damit wir lernen"). */
  /* Die zwei Felder am Ende: Künstlername und E-Mail. */
  const [kontakt, setKontakt] = useState({ name: "", mail: "" });
  const [feedbackOffen, setFeedbackOffen] = useState(false);
  /**
   * ── WARUM DER KASTEN OFFEN IST (Owner 13.09.2026) ──────────────────────────────────────────
   *
   * Derselbe Kasten dient zwei Anlässen: Er steht unten hinter „Feedback geben" für jeden, der
   * etwas loswerden will — und er klappt nach einem „Nein" von selbst auf, mit der Frage, die
   * dann zählt („Was hat dich abgehalten?").
   *
   * OHNE DIESEN MERKER STÜNDE DIE NEIN-FRAGE AUCH DEM, der unten selbst auf Feedback tippt, im
   * Feld — und der hat nichts abgelehnt. Eine Frage, die eine falsche Annahme über den Leser
   * trifft, bekommt keine ehrliche Antwort.
   */
  const [feedbackNachNein, setFeedbackNachNein] = useState(false);
  /**
   * SEINE SEITE, SOLANGE SIE IHM NOCH NICHT GEHÖRT (Owner 13.09.2026).
   *
   * Sie entsteht beim „Da" unter einer Behelfsadresse. Kennung und Schlüssel liegen hier, bis
   * er mit Namen und Adresse bestätigt — dann zieht sie um (`api/portal-behalten`). Bestätigt
   * er nicht, wird sie später weggeräumt; im Browser bleibt nichts davon zurück.
   */
  /**
   * ── DER BILDBEFUND BLEIBT LIEGEN (Owner 13.09.2026: „3 mal eine neuen chance") ─────────────
   *
   * Das Hinsehen ist die teure Hälfte, das Schreiben die günstige — und am Bild ändert sich
   * zwischen zwei Versuchen nichts. Der Befund vom ersten Aufruf reist beim zweiten zurück an
   * den Server, der die Analyse dann überspringt.
   */
  const [befund, setBefund] = useState<unknown>(null);
  /** Wie oft er den Satz schon neu schreiben liess — höchstens dreimal. */
  const [spruchVersuche, setSpruchVersuche] = useState(0);
  /** Wie oft er „Nein" gesagt hat: beim zweiten Mal wird es angenommen, nicht nachgefragt. */
  const [neinZahl, setNeinZahl] = useState(0);
  const [seite, setSeite] = useState<{ kennung: string; schluessel: string; url: string } | null>(null);
  const [behaltenStatus, setBehaltenStatus] = useState<"" | "sende" | "fehler">("");
  /**
   * ── ER SIEHT SEINE ADRESSE, BEVOR SIE BENUTZT WIRD (Owner 13.09.2026) ──────────────────────
   *
   * Steht hier `true`, zeigt der Kasten statt der Felder die eingetippte Adresse mit Ja/Nein.
   * „Nein" führt zurück ins Feld, „Ja" schickt ab. Der Grund steht bei `mailRichtigFrage` in
   * lib/agent-chat-texte.ts: Ein Tippfehler wie `yahoo..com` kostet einen ganzen Künstler.
   */
  const [mailPruefen, setMailPruefen] = useState(false);
  /**
   * Ob die Felder vor der Analyse offen stehen (Owner 14.09.2026: „will er Analyse starten, dann
   * fragst du nach der Email"). Der Knopf „Analizează acum" klappt sie auf; erst das Absenden
   * startet die Analyse.
   */
  const [datenFragt, setDatenFragt] = useState(false);
  /**
   * ── WELCHES WERK ANGESEHEN WIRD (Owner 14.09.2026: „er müsste wählen, für welches Werk er eine
   * Analyse haben will") ──────────────────────────────────────────────────────────────────────
   *
   * Bis hierher wurde stumm das ERSTE genommen. Wer zehn Werke hochlädt, hat aber eine Meinung
   * dazu, welches sein bestes ist — und genau das eine bekommt den Satz und den Platz auf der
   * Seite.
   *
   * DIE VORHANDENE `bilderWahl` taugt dafür nicht: Sie gehört zum Agenten-Weg, wo der Server
   * Vorschläge schickt und ein Tipp eine Nachricht ans Modell sendet. Der Trichter läuft an
   * dieser Route vorbei.
   *
   * UND NICHT ZU VERWECHSELN MIT `werkWahl` weiter oben: Jenes hält `{nr, bild}` des Werks, über
   * das im VersusForge-Agenten gerade gesprochen wird, und reist als `werkNr` zum Server. Dies
   * hier ist nur die Nummer des Werks, das analysiert werden soll.
   */
  const [analyseWahl, setAnalyseWahl] = useState(0);
  /**
   * ── NACHLEGEN OHNE ZU SENDEN (Owner 14.09.2026: „er kann dort löschen oder neue hochladen") ──
   *
   * EIGENER WEG, NICHT `fotoWaehlen`: Jene Funktion schreibt in den Eingabezustand und setzt am
   * Ende `sendenNachUpload`, was den nächsten Zug auslöst. Nach dem ersten Senden ist der
   * Eingabezustand aber leer, und die Bilder hängen am Verlauf — nachgelegte Werke landeten also
   * unten am Eingabefeld UND schickten eine zweite Nachricht.
   *
   * Hier werden sie direkt an die Nachricht gehängt, an der die anderen schon hängen.
   */
  const nachlegenDatei = useRef<HTMLInputElement | null>(null);
  const nachlegenZiel = useRef(0);

  const nachlegen = async (dateien: FileList | null | undefined) => {
    const liste = Array.from(dateien ?? []).filter(f => f.type.startsWith("image/"));
    const ziel = nachlegenZiel.current;
    for (const f of liste) {
      const bild = await bildVerkleinern(f);
      if (!bild) continue;
      setVerlauf(v => v.map((x, xi) => (
        xi === ziel ? { ...x, fotos: [...(x.fotos ?? []), bild].slice(0, WERKE_TRICHTER) } : x
      )));
    }
    /* Zurücksetzen, sonst löst dieselbe Datei beim zweiten Mal kein `change` aus. */
    if (nachlegenDatei.current) nachlegenDatei.current.value = "";
  };
  /**
   * ── ER HAT SICH SCHON GENANNT (Owner 14.09.2026: „aber dann nicht noch mal nach Mail fragen
   * und Name" · „bist noch in der Lage, ihn zwei Mal zu fragen nach denselben Daten") ─────────
   *
   * Seit die Analyse Name und Adresse verlangt, liegen beide vor, bevor er die fertige Seite je
   * sieht. Der Abschluss fragt sie deshalb NICHT erneut — er übernimmt sie.
   */
  const kontaktDa = !!kontakt.name.trim() && MAIL_MUSTER.test(kontakt.mail.trim());
  /* Er ändert einen Spruch über „✎" (Owner 11.09.2026: „ich habe eins korrigiert, du weisst es nicht welches").
     Solange gesetzt, geht das Feld als „dieser Spruch für Bild nr" hinaus — der Server zeigt ihn sofort. */
  const [spruchAendern, setSpruchAendern] = useState<{ nr: number } | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"" | "sende" | "danke" | "fehler">("");

  /**
   * ── AUCH ZU KARTEN, DIE OHNE NEUE NACHRICHT AUFGEHEN (15.09.2026) ───────────────────────────
   *
   * Der Klick auf „Da" hängt KEINE Nachricht an — er klappt nur den Kontakt-Kasten unter der
   * Vorschau auf. Der lag damit unterhalb des Sichtfelds: Auf dem Handy tippt er „Da", und für
   * ihn passiert nichts. Vom 14.09. bis hierher hat KEIN EINZIGER von fünf Analysierten den
   * Schritt danach gemacht, davor war es jeder Vierte.
   *
   * Deshalb hängen `datenFragt` und `mailPruefen` mit im Auslöser — jede Karte, die ohne neue
   * Nachricht erscheint, holt den Blick zu sich.
   */
  useEffect(() => {
    /* ZWEIMAL: Der erste Sprung geht ins Leere, weil die Karte im selben Durchgang noch keine
       Höhe hat — gemessen blieb der Verlauf 364px vor dem Ende stehen, genug, um den Kasten
       unsichtbar zu lassen. Der zweite holt nach, was inzwischen gewachsen ist. */
    const lauf = () => ende.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    lauf();
    const t = setTimeout(lauf, 260);
    return () => clearTimeout(t);
  }, [verlauf.length, busy, datenFragt, mailPruefen]);

  /**
   * ── DAS FELD WÄCHST MIT (Owner 09.09.2026, mit Bild: „hier stimmt was nicht. Kann sein,
   * dass sich das Feld vergrössern muss?") ───────────────────────────────────────────────────
   *
   * JA — UND ES WAR SCHLIMMER ALS UNSCHÖN. Das Feld stand fest auf einer Zeilenhöhe. Wer
   * mehr schrieb, sah seine eigene zweite Zeile angeschnitten am unteren Rand und die erste
   * gar nicht mehr. Man konnte nicht prüfen, was man abschickt.
   *
   * `rows={1}` UND `max-h` REICHTEN NICHT: Ein Textfeld wächst im Browser nicht von selbst,
   * es scrollt. Die Höhe muss gerechnet werden — erst auf null, dann auf den Inhalt.
   *
   * DIE OBERGRENZE BLEIBT: Ab 160 Pixeln scrollt es doch, sonst schiebt eine lange Antwort
   * das Gespräch aus dem Bild. Das ist der Fall, in dem Scrollen richtig ist.
   *
   * ES HÄNGT AN `eingabe`, NICHT AM TIPPEN: So wächst es auch, wenn Text per Sprache oder
   * per Chip hineinkommt — und schrumpft nach dem Senden von selbst wieder.
   */
  useEffect(() => {
    const el = feld.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [eingabe]);

  /**
   * NACH DER WAHL KOMMT DER GRUSS — UND ZWAR ÜBERSETZT.
   *
   * `router.refresh()` rendert die Server-Komponente neu und reicht die übersetzten Texte
   * herein, RÜHRT ABER DEN ZUSTAND IM BROWSER NICHT AN: `useState` läuft nur einmal, die
   * Sprachfrage bliebe stehen und der Gruss käme nie. Deshalb wird hier nachgezogen, sobald
   * eine Wahl vorliegt.
   *
   * NUR SOLANGE NICHTS ANDERES DASTEHT: Sobald jemand redet, wird der Verlauf nicht mehr
   * angefasst. Ein Sprachwechsel mitten im Gespräch darf keine Nachricht verschlucken.
   */
  useEffect(() => {
    if (!gewaehlt) return;
    setVerlauf(v => (v[v.length - 1]?.sprachfrage
      ? [startNachricht(gruss, S.chipEinverstanden, marke === "lakatosbandi")]
      : v));
    /* `marke` entscheidet seit dem Umbau auf Upload-zuerst, ob die Startnachricht einen Chip
       trägt — ohne sie in der Liste bliebe nach einem Markenwechsel der alte Zustand stehen. */
  }, [gewaehlt, gruss, S.chipEinverstanden, marke]);

  const geraet = () => {
    try {
      let d = localStorage.getItem("lb_visitor") ?? "";
      if (!d) { d = crypto.randomUUID?.() ?? String(Date.now()); localStorage.setItem("lb_visitor", d); }
      return d;
    } catch { return ""; }
  };

  /**
   * ── DIE KENNUNG DES GESPRÄCHS (Owner 10.09.2026) ──────────────────────────────────────────
   *
   * Sie ist die Klammer um die einzelnen Züge im Protokoll: Ohne sie lägen hundert Züge von
   * fünfzig Menschen in einem Haufen, und die Frage „wo steigen sie aus" wäre weiter
   * unbeantwortbar.
   *
   * SIE HÄNGT AM TAB, NICHT AM GERÄT (`sessionStorage`): Zwei Gespräche desselben Menschen an
   * verschiedenen Tagen sind zwei Gespräche. Das Gerät steht separat daneben — daran hängt
   * der Tagesdeckel, und das ist etwas anderes.
   *
   * SIE ÜBERLEBT EIN NEULADEN, damit ein Zug nach dem Neuladen nicht als neues Gespräch
   * zählt und die Abbruchquote verfälscht.
   *
   * KEIN PERSONENBEZUG: eine Zufallszahl, sonst nichts.
   */
  const gespraechId = () => {
    try {
      let g = sessionStorage.getItem("vf_gespraech") ?? "";
      if (!g) { g = crypto.randomUUID?.() ?? String(Date.now()); sessionStorage.setItem("vf_gespraech", g); }
      return g;
    } catch { return ""; }
  };

  /**
   * DIE SPRACHE WÄHLEN — Cookie setzen, Server neu rendern.
   *
   * DASSELBE COOKIE WIE DER UMSCHALTER IN DER TOPNAV (`lb_lang`, ein Jahr): Die Wahl gilt
   * danach für den Trichter, das Impressum und den Datenschutz mit. Wer hier Rumänisch
   * wählt, liest auch das Kleingedruckte auf Rumänisch — sonst wäre die Frage eine Geste.
   *
   * `router.refresh()` STATT RELOAD: Die Server-Komponente rendert neu und liefert die
   * übersetzten Texte; im Chat steht zu diesem Zeitpunkt noch nichts, was verloren gehen
   * könnte. Genau deshalb steht die Frage GANZ am Anfang und nicht mittendrin.
   *
   * DIE STARTNACHRICHT WIRD HIER SOFORT GESETZT, ohne auf die Antwort des Servers zu warten:
   * Der Gruss kommt beim nächsten Rendern übersetzt herein, aber der Mensch soll nicht auf
   * einen leeren Schirm sehen, während das passiert.
   */
  const spracheWaehlen = (l: Lang) => {
    /* Fürs ganze Haus: Trichter, Impressum, Datenschutz sprechen danach dieselbe Sprache. */
    try {
      document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    } catch { /* blockierte Cookies dürfen die Wahl nicht verschlucken — dafür die Adresse */ }
    /**
     * DIE WAHL GEHT IN DIE ADRESSE (Owner 09.09.2026: „keiner ist aktiv").
     *
     * `router.refresh()` allein hing an dem Cookie darüber. Wird es blockiert, sieht der
     * Server keine Wahl, rendert dieselbe Frage — und der Knopf tut sichtbar nichts.
     * Eine Adresse kann kein Browser wegwerfen.
     */
    /* `start` kann schon einen Parameter tragen (lokal `/engine?portal=1`) — dann wird
       angehängt statt ein zweites Fragezeichen zu setzen (18.09.2026). */
    router.replace(`${start}${start.includes("?") ? "&" : "?"}lang=${l}`);
  };

  /**
   * VON VORN — mit derselben Sprache.
   *
   * WAS WEGGEHT: das Gespräch. WAS BLEIBT: die Sprachwahl und die Gerätekennung, an der der
   * Tagesdeckel hängt. Ein Zurücksetzen, das den Deckel mit zurücksetzt, wäre ein offenes
   * Tor — dann kostet uns ein Knopf jede Nacht Geld ([[kein-token-fuer-abbrecher]]).
   */
  /**
   * ── KEINE UHR AUF EINER FRAGE AUS WÖRTERN (Owner 09.09.2026: „ich kann nicht neu
   * anfangen") ──────────────────────────────────────────────────────────────────────────────
   *
   * REPRODUZIERT UND GEMESSEN: Ich hatte die Frage nach drei Sekunden von selbst
   * zurückgesetzt. Wer „Wirklich löschen? Noch einmal drücken." erst LIEST und dann
   * entscheidet, braucht länger — sein zweiter Druck fragte also nur wieder, und gelöscht
   * wurde nie. Der Knopf war für einen Menschen unbenutzbar und für eine Maschine in
   * Ordnung; genau die Sorte Fehler, die man am Schreibtisch nicht sieht.
   *
   * DIE HAUSREGEL SAGT „nach 3 s zurück" ([[loeschen-zwei-tipps-rot]]) — und sie meint ein
   * rotes SYMBOL, das man nicht lesen muss. Sobald dort ein Satz steht, ist die Uhr eine
   * Falle.
   *
   * STATT EINER UHR: Die Frage bleibt stehen, bis er antwortet — und jede andere Handlung
   * nimmt sie zurück (tippen, senden, eine Sprache wählen). Damit kann sie niemanden
   * überraschen und niemanden aussperren.
   */
  /**
   * ZURÜCK: seine letzte Antwort und alles danach verschwinden, die Frage des Agenten steht wieder
   * da, sein Text liegt im Feld. Kein Modell-Aufruf, bis er neu abschickt. Was an den weggenommenen
   * Nachrichten hing (Bild mit Spruch, die Frage nach weiteren Bildern), wird mit zurückgenommen.
   */

  /* FEEDBACK: geht an /api/versusforge-feedback — abgelegt und als Mail an den Owner. Mit dabei die
     letzte Frage des Agenten, damit man sieht, wo es gehakt hat. Kein Modell-Aufruf. */
  const feedbackSenden = async () => {
    const text = feedbackText.trim();
    if (text.length < 2) return;
    setFeedbackStatus("sende");
    try {
      const frage = [...verlauf].reverse().find(x => x.rolle === "agent")?.text ?? "";
      const res = await fetch("/api/versusforge-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text, sprache: lang, ort: fenster ? "lakatosbandi.com" : "versusforge.com/engine",
          frage: frage.slice(0, 600), gespraech: gespraechId(), device: geraet(),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setFeedbackText("");
      setFeedbackStatus("danke");
    } catch {
      setFeedbackStatus("fehler");
    }
  };
  const zurueck = (idx: number) => {
    const rest = verlauf.slice(0, idx);
    setVerlauf(rest);
    const alt = verlauf[idx];
    /* MIT BILDERN (Owner 11.09.2026: „hier kann ich nicht zurück"): Die Bilder liegen wieder im Feld, ihre
       Auswertung fällt weg — der Chat hält sie selbst (`werke`), der Server merkt sich nichts. Geht er weiter
       zurück („Înapoi fehlt bei beiden"), fällt die Auswertung aller Bilder ab dieser Stelle weg. */
    if (alt?.fotos?.length) setFotos(alt.fotos);
    const ersteMitBildern = verlauf.slice(idx).find(x => x.rolle === "mensch" && x.werkeVorher !== undefined);
    if (ersteMitBildern) setWerke(w => w.slice(0, ersteMitBildern.werkeVorher ?? 0));
    setEingabe(alt?.text && alt.text !== S.nurBilder ? alt.text : "");
    setFehler("");
    setResetFragt(false);
    setWerkFormOffen(false);
    setSpruchAendern(null);
    if (!rest.some(x => x.vorschau)) setWerkWahl(null);
    setBilderFragen(rest.filter(x => !!x.mehrBilder).length);
  };

  /* `sofort`: das Ja auf „Willst du alles löschen?" — die Frage WAR schon die Rückfrage. */
  const neuAnfangen = (sofort?: boolean) => {
    if (!resetFragt && sofort !== true) { setResetFragt(true); return; }
    setResetFragt(false);
    setEingabe("");
    setFehler("");
    /**
     * ZURÜCK AN DEN WIRKLICHEN ANFANG — ALSO ZUR SPRACHFRAGE (Owner 09.09.2026: „das ist
     * nicht der Anfang vom Chat").
     *
     * ER HAT RECHT, UND ES IST MEHR ALS EINE NACHRICHT WEITER: Seit heute fängt dieser Chat
     * mit der Sprache an. „Neu anfangen", das beim Gruss landet, überspringt den ersten
     * Schritt — und ausgerechnet den, den man beim Prüfen wieder braucht: einmal auf
     * Rumänisch, einmal auf Deutsch, hintereinander, ohne die Seite neu zu laden.
     *
     * DIE ADRESSE MUSS MIT ZURÜCK. `?lang=de` ist die Wahl in diesem Gespräch; bliebe sie
     * stehen, käme die Frage nicht wieder, egal was der Verlauf sagt.
     */
    /* Ein neues Gespräch bekommt eine neue Kennung — sonst hingen im Protokoll zwei
       Gespräche aneinander und die Abbruchquote wäre falsch (10.09.2026). */
    try { sessionStorage.removeItem("vf_gespraech"); } catch { /**/ }
    /* Ein neues Gespräch fängt ohne Bilder und ohne Befunde an — sonst zählte die Aufnahme
       Bilder aus dem letzten Gespräch mit. */
    setFotos([]);
    setWerke([]);
    setWerkWahl(null);
    setBildHinweis("");
    setSpruchAendern(null);
    setBilderFragen(0);
    setWerkFormOffen(false);
    setWerkInfo({ titel: "", technik: "", groesse: "", jahr: "", preis: "" });
    /* IM FENSTER BLEIBT DIE SEITE STEHEN: Die Sprache hat die Seite schon gewählt — zurück zum Gruss. */
    if (fenster) {
      setVerlauf([startNachricht(gruss, S.chipEinverstanden, marke === "lakatosbandi")]);
      return;
    }
    setVerlauf([{ rolle: "agent", text: SPRACHFRAGE, sprachfrage: true }]);
    router.replace(start);
  };

  /**
   * `text` schickt ETWAS ANDERES als das, was im Feld steht — dafür gibt es genau einen
   * Grund: Ein angetippter Chip soll sofort abgehen, und `setEingabe` wirkt erst beim
   * nächsten Rendern. Ohne dieses Argument ginge die alte Eingabe raus.
   */
  /** Bilder einlesen, auf 1080 Pixel Breite bringen, als JPEG anhängen — höchstens `WERKE_TRICHTER`. */
  const fotoWaehlen = async (dateien: FileList | null | undefined) => {
    const liste = Array.from(dateien ?? []).filter(f => f.type.startsWith("image/"));
    setBildHinweis(liste.length + fotos.length > WERKE_TRICHTER ? S.bilderErsteZehn : "");
    /**
     * ── HIER STIMMT ER ZU (Owner 13.09.2026, Umbau auf Upload-zuerst) ─────────────────────────
     *
     * Bis heute zählte die Stufe „start" beim Tippen auf „Da, vreau pagina mea". Diesen Knopf
     * gibt es auf lakatosbandi nicht mehr; die Einwilligung steht jetzt unter dem Hochladeknopf
     * (`startZustimmung`), und der Moment, den dieser Satz beschreibt, ist genau dieser hier.
     *
     * ES KOSTET WEITERHIN KEINEN MODELLAUFRUF ([[kein-token-fuer-abbrecher]]): Die Bilder
     * bleiben im Browser, gezählt wird nur der Schritt.
     */
    if (marke === "lakatosbandi" && liste.length > 0 && !startGemessen.current) {
      startGemessen.current = true;
      schrittMessen(EIGENER_MANDANT, "start");
    }
    for (const f of liste) {
      /* Ein Bild, das der Browser nicht öffnen kann (HEIC etwa), wird still übergangen — eine
         Fehlermeldung über ein Dateiformat hilft niemandem weiter. */
      const bild = await bildVerkleinern(f);
      if (bild) setFotos(v => [...v, bild].slice(0, WERKE_TRICHTER));
    }
    /* Auswählen IST die Antwort — der Effekt unten schickt, sobald die Bilder im Zustand stehen.
       Nur im Portal-Trichter: Bei VersusForge hängt ein Bild an einem Satz, den er noch tippt. */
    if (marke === "lakatosbandi" && liste.length > 0) sendenNachUpload.current = true;
  };

  /**
   * ── DER EFFEKT, DER DEN PFEIL ERSETZT ───────────────────────────────────────────────────────
   *
   * Er läuft, wenn `fotos` sich geändert hat — also genau dann, wenn die Auswahl im Zustand
   * angekommen ist. Der Merker wird ZUERST zurückgesetzt: Ein zweiter Durchlauf (React rendert
   * im Entwicklungsmodus doppelt) schickte sonst dieselben Bilder ein zweites Mal.
   *
   * `busy` hält ihn zurück, solange ein Aufruf läuft — sonst überholt ein schnelles Nachlegen
   * den vorigen Zug.
   */
  useEffect(() => {
    if (!sendenNachUpload.current || !fotos.length || busy) return;
    sendenNachUpload.current = false;
    void schicken();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [fotos]);

  /**
   * ── „ANALIZEAZĂ ACUM" (Owner 13.09.2026) ────────────────────────────────────────────────────
   *
   * EIN Bild, EIN Aufruf — nicht alle. Der Owner will ein Beispiel zeigen („die anderen nicht"),
   * und das ist zugleich die günstige Variante: Ein fertiger Künstler kostet sechs Modellaufrufe
   * JE WERK. Wer hier abspringt, hätte uns sonst fünf Bilder lang Geld gekostet, ohne je
   * zugestimmt zu haben ([[kein-token-fuer-abbrecher]]).
   *
   * ES LÄUFT AN DER AGENTEN-ROUTE VORBEI: `api/portal-vorschau` sieht das Bild an und schreibt
   * einen Satz. Kein Gesprächsverlauf, kein Modell, das entscheidet, was als Nächstes kommt.
   */
  const analysieren = async () => {
    if (busy) return;
    /* SEINE WAHL, nicht stumm das erste (Owner 14.09.2026). Fällt sie aus dem Rahmen, bleibt das
       erste — besser eine Analyse als gar keine. */
    const alle = verlauf.flatMap(m => m.fotos ?? []);
    const bild = alle[analyseWahl] ?? alle[0];
    if (!bild) return;
    /* Die Felder wieder zuklappen: Scheitert die Analyse, steht wieder der Knopf da — seine
       Eingaben bleiben im Zustand, er muss sie nicht noch einmal tippen. */
    setDatenFragt(false);
    setBusy(true);
    setFehler("");
    setVerlauf(v => [...v, { rolle: "agent", text: S.analyseLaeuft }]);
    try {
      const res = await fetch("/api/portal-vorschau", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        /* Der Befund vom ersten Mal spart beim zweiten Versuch die teure Analyse. */
        /* Gesprächskennung und Zugnummer fürs Protokoll — ohne sie kann der Server nicht
           zuordnen, wer da war und wie oft er neu schreiben liess (Owner 13.09.2026). */
        body: JSON.stringify({
          bild, sprache: lang, device: geraet(),
          gespraech: gespraechId(), zug: verlauf.length,
          /* Seine Angaben reisen mit und werden auf dem Server ZUERST abgelegt — auch wenn die
             Analyse danach scheitert, ist die Adresse dann bei uns (Owner 14.09.2026). */
          name: kontakt.name.trim(), mail: kontakt.mail.trim(),
          /* SEINE KENNUNG AUS DEM SOFORTFORMULAR — ohne sie stünden `name` und `mail` hier leer,
             weil die Karte bei vorhandener Kennung gar nicht erst erscheint. Der Server löst sie
             auf (app/api/portal-vorschau/route.ts) und nimmt Name und Adresse von dort. */
          ...(lead ? { lead } : {}),
          ...(befund ? { befund } : {}),
        }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; spruch?: string; befund?: unknown; grund?: string };
      /* In eine eigene Konstante: TypeScript verliert die Verengung von `d.spruch` innerhalb der
         Rückrufe an `setVerlauf` — dort wäre es wieder `string | undefined`. */
      const spruch = String(d.spruch ?? "").trim();
      if (!d.ok || !spruch) {
        /* Die letzte Nachricht war „Ich sehe mir dein Werk an …" — sie wird ersetzt, nicht
           ergänzt, sonst bleibt eine Ankündigung stehen, auf die nichts folgt.

           WAR ES KEIN WERK, sagen wir das auch — „hat nicht geklappt" würde ihn ein Zertifikat
           ein zweites Mal hochladen lassen, und jeder Versuch kostet uns (Owner 14.09.2026). */
        const text = d.grund === "kein-werk" ? S.keinWerk
          : d.grund === "verbraucht" ? S.analyseVerbraucht
            : d.grund === "hat-seite" ? S.hatSeite
              : S.analyseFehler;
        setVerlauf(v => [...v.slice(0, -1), { rolle: "agent", text, analyse: true }]);
        return;
      }
      /* DEN BEFUND MERKEN (Owner 13.09.2026: „noch zwei" neue Sätze). Er reist beim nächsten
         Versuch zurück an den Server, der das Bild dann NICHT erneut ansieht — das ist die teure
         Hälfte. Ohne diese Zeile wäre die Ersparnis serverseitig vorbereitet und nie genutzt. */
      if (d.befund) setBefund(d.befund);
      setVerlauf(v => [...v.slice(0, -1), {
        rolle: "agent",
        /* NUR DER BEISPIEL-SATZ (Owner 13.09.2026: „Hier muss eins klar sein. Ja, Nein für was?").
           Die Frage stand hier und damit ÜBER dem Werk — zwischen ihr und den Knöpfen lag das
           ganze Bild samt Spruch. Sie steht jetzt unmittelbar über Da/Nu. */
        text: S.analyseFertig,
        vorschau: { nr: 1, spruch },
        publizieren: true,
      }]);
    } catch {
      setVerlauf(v => [...v.slice(0, -1), { rolle: "agent", text: S.analyseFehler, analyse: true }]);
    } finally {
      setBusy(false);
    }
  };

  /**
   * ── „DA" — SEINE SEITE ENTSTEHT (Owner 13.09.2026) ──────────────────────────────────────────
   *
   * KEIN MODELLAUFRUF. Das Bild liegt im Browser, der Spruch ist in der Vorschau bereits
   * entstanden und bezahlt — beides reist mit. `api/portal-anlegen` legt die Seite unter einer
   * Behelfsadresse an und gibt den Link zurück.
   *
   * ER SIEHT SIE, BEVOR ER SICH NENNT. Das ist der ganze Punkt dieser Umstellung: Bisher standen
   * Adresse und Bestätigungsmail VOR jedem Ergebnis.
   */
  const anlegen = async () => {
    if (busy) return;
    /* ALLE hochgeladenen Werke wandern auf die Seite; den Spruch trägt nur das erste, weil nur
       es analysiert wurde (Owner 14.09.2026). */
    /* Das analysierte Werk zuerst — es trägt den Spruch und wird zum Standardmotiv der Seite.
       Die übrigen folgen in ihrer Reihenfolge, ohne Text. */
    const alle = verlauf.flatMap(m => m.fotos ?? []).slice(0, WERKE_TRICHTER);
    const gewaehlt = alle[analyseWahl] ?? alle[0];
    const bilder = gewaehlt ? [gewaehlt, ...alle.filter((_, n) => n !== analyseWahl)] : alle;
    const bild = bilder[0];
    if (!bild) return;
    setBusy(true);
    setFehler("");
    setVerlauf(v => [...v, { rolle: "mensch", text: S.publizierenJa }, { rolle: "agent", text: S.anlegenLaeuft }]);
    try {
      /**
       * ── DER SATZ ENTSTEHT JETZT HIER (Owner 15.09.2026: „soll nichts analysieren") ──────────
       *
       * Vorher stand er schon in der Vorschau, die jeder Hochladende bekam — bezahlt auch für
       * die, die nie wiederkamen. Jetzt sieht das Modell das Werk erst an, wenn er Ja gesagt
       * hat. Dieselbe Route wie früher, nur eine Station später.
       *
       * SCHEITERT ER, ENTSTEHT DIE SEITE TROTZDEM: Eine Seite ohne Satz ist ein Mangel, eine
       * verlorene Zusage ist ein Bruch. Den Satz kann der nächtliche Lauf nachtragen.
       */
      let spruch = verlauf.find(m => m.vorschau)?.vorschau?.spruch ?? "";
      if (!spruch) {
        try {
          const vr = await fetch("/api/portal-vorschau", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bild, sprache: lang, device: geraet() }),
          });
          const vd = (await vr.json().catch(() => ({}))) as { ok?: boolean; spruch?: string };
          if (vd.ok && vd.spruch) spruch = String(vd.spruch).trim();
        } catch { /* siehe oben: die Seite entsteht auch ohne Satz */ }
      }
      const res = await fetch("/api/portal-anlegen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        /* `bild` bleibt das erste (mit Spruch), `bilder` trägt alle — der Server legt die
           übrigen ohne Text als weitere Kacheln an. */
        /* NAME UND ADRESSE MÜSSEN MIT (Owner 14.09.2026: „soll gar nicht gehen ohne") — der
           Server weist sonst mit `kontakt-fehlt` ab, und zwar bevor er ein Bild ansieht. */
        body: JSON.stringify({
          bild, bilder, spruch, sprache: lang, device: geraet(),
          name: kontakt.name.trim(), mail: kontakt.mail.trim(),
        }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; kennung?: string; schluessel?: string; url?: string };
      if (!d.ok || !d.kennung || !d.url) {
        setVerlauf(v => [...v.slice(0, -1), { rolle: "agent", text: S.anlegenFehler, publizieren: true }]);
        return;
      }
      setSeite({ kennung: d.kennung, schluessel: String(d.schluessel ?? ""), url: d.url });
      setVerlauf(v => [...v.slice(0, -1), {
        rolle: "agent",
        /* Stehen Name und Adresse schon, ist das Behalten keine Frage mehr — nur noch eine
           Meldung (Owner 14.09.2026: „aber dann nicht noch mal nach Mail fragen und Name"). */
        text: kontaktDa ? S.seiteFertig : `${S.seiteFertig}\n\n${S.behaltenFrage}`,
        seiteFertig: true,
      }]);
    } catch {
      setVerlauf(v => [...v.slice(0, -1), { rolle: "agent", text: S.anlegenFehler, publizieren: true }]);
    } finally {
      setBusy(false);
    }
  };

  /**
   * ── „JA, BEHALTEN" — ab hier gehört sie ihm ─────────────────────────────────────────────────
   *
   * Name und Adresse gehen an `api/portal-behalten`: Die Seite zieht auf seinen Namen um, wird
   * sichtbar, und die Links gehen an seine Adresse. Der Schlüssel aus dem Anlegen ist der
   * Nachweis, dass es SEINE Seite ist — ohne ihn könnte jeder eine fremde umschreiben.
   */
  const behalten = async () => {
    if (!seite || behaltenStatus === "sende") return;
    setBehaltenStatus("sende");
    try {
      const res = await fetch("/api/portal-behalten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mandant: seite.kennung, k: seite.schluessel,
          name: kontakt.name.trim(), mail: kontakt.mail.trim(),
        }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; url?: string };
      if (!d.ok) { setBehaltenStatus("fehler"); return; }
      setBehaltenStatus("");
      if (d.url) setSeite(s => (s ? { ...s, url: String(d.url) } : s));
      setVerlauf(v => [...v, { rolle: "agent", text: S.behaltenFertig, behalten: true }]);
    } catch {
      setBehaltenStatus("fehler");
    }
  };

  /* `gewaehlt`: Er hat einen der drei Sprüche angetippt — der Server zeigt dann sofort sein Bild mit Spruch. */
  const schicken = async (text?: string, gewaehlt?: { nr: number; spruch: string }) => {
    /* Nur Bilder, kein Text, ist auch eine Antwort — dann steht ein kurzer Satz an seiner Stelle. */
    const w = (text ?? eingabe).trim() || (fotos.length ? S.nurBilder : "");
    if (!w || busy) return;
    setResetFragt(false);
    /* Kommt der Text aus dem Feld und hat er vorher „✎" getippt, ist es seine eigene Fassung — ROHSTOFF: Der Agent
       macht daraus einen verkaufenden Spruch (Owner 11.09.2026: „ein Titel und kein Marketingspruch"). */
    const eigen = !gewaehlt && text === undefined && spruchAendern ? { nr: spruchAendern.nr, spruch: w } : undefined;
    setSpruchAendern(null);

    /**
     * ── SOLANGE DIE SPRACHFRAGE OFFEN IST, ANTWORTET DER BROWSER ───────────────────────────
     *
     * DREI FÄLLE, UND KEINER KOSTET EINEN AUFRUF:
     *  · Er nennt eine unserer Sprachen  → umschalten, fertig.
     *  · Er nennt eine andere            → ehrliche Absage, die Knöpfe bleiben stehen.
     *  · Er redet einfach los            → die vorgeschlagene Sprache gilt, die Frage wird
     *    durch den Gruss ersetzt, und seine Nachricht geht MIT dem Gruss zum Agenten.
     *
     * DER DRITTE FALL IST DER, DER MIR GEFEHLT HAT (09.09.2026, „Polish"): Vorher ging seine
     * Nachricht ohne jeden Zusammenhang hinaus — die Frage hatte ich aus dem Verlauf
     * genommen, der Gruss stand noch nicht darin. Ein Wort ohne Frage davor kann kein Modell
     * richtig verstehen, und geraten hat es dann auch.
     */
    /* „Offen" heisst: Das Letzte, was dastand, war die Sprachfrage — auch nach einer Absage.
       Sonst wäre „Polish, sorry — Romanian" beim zweiten Versuch nicht mehr erkannt worden. */
    const offen = verlauf[verlauf.length - 1]?.sprachfrage === true;
    if (offen) {
      const s = sprachAntwort(w);
      if (s.sprache) { setEingabe(""); spracheWaehlen(s.sprache); return; }
      if (s.fremd) {
        setEingabe("");
        setVerlauf(v => [...v, { rolle: "mensch", text: w }, { rolle: "agent", text: SPRACHE_ABSAGE, sprachfrage: true }]);
        return;
      }
    }

    /* Redet er los, ohne zu wählen, gilt die vorgeschlagene Sprache — und der Gruss steht
       vor seiner Nachricht, damit der Agent weiss, was vorher gesagt wurde. */
    const basis: Nachricht[] = offen
      ? [{ rolle: "agent", text: gruss }]
      : verlauf.filter(m => !m.sprachfrage);
    let naechster: Nachricht[] = [...basis, { rolle: "mensch", text: w, ...(fotos.length ? { fotos, werkeVorher: werke.length } : {}) }];
    setVerlauf(naechster);
    setEingabe("");

    /**
     * ── DER ZUG NACH DEM JA KOSTET KEIN MODELL ───────────────────────────────────────────
     *
     * Owner 10.09.2026: „hier hast du 30 Sekunden für diese Antwort gebraucht" · „du kannst
     * doch nicht alle Regeln immer prüfen, wenn nicht nötig" · „du musst kosteneffizient
     * arbeiten und schnell."
     *
     * GEMESSEN: 8,3 Sekunden für einen Satz, der feststeht. Es ist der EINE Zug im ganzen
     * Gespräch, an dem nichts zu entscheiden ist — er hat einen Knopf gedrückt, und darauf
     * folgt immer dieselbe Frage. Sie steht jetzt geschrieben da, wie die Begrüssung, und
     * erscheint sofort ([[agenten-schnell-und-billig]]).
     *
     * DIE BEDINGUNG IST ENG GEHALTEN: nur der Gruss im Verlauf, und sein Wort ist genau der
     * Zustimmungs-Chip. Schreibt er stattdessen los — „ja, ich habe eine Bäckerei" —, geht
     * es den normalen Weg, denn dann steht schon Substanz da, auf die geantwortet gehört.
     *
     * ES BLEIBT IM VERLAUF STEHEN und reist beim nächsten Zug mit: Für das Modell sieht es
     * aus, als hätte es die Frage selbst gestellt. Nichts geht verloren.
     */
    const nurGruss = basis.length === 1 && basis[0].rolle === "agent";
    /**
     * ── KOMMT ER AUS DER ANZEIGE, IST SEIN SATZ DIE ANTWORT AUF DIE ERSTE FRAGE ─────────────
     *
     * Er hat oben auf der Startseite schon geschrieben, was er anbietet. Ihn nach dem Ja noch
     * einmal zu fragen, wäre genau der Fehler, den der Owner heute im Userflow gerügt hat —
     * und er müsste denselben Satz ein zweites Mal tippen.
     *
     * DESHALB ZWEI NACHRICHTEN VON IHM, EIN AUFRUF: „Ja, einverstanden" und sein Satz stehen
     * untereinander im Verlauf, und erst jetzt — nach dem Ja — geht etwas an das Modell. Vor
     * der Zustimmung kostet nichts ([[kein-token-fuer-abbrecher]]), und danach steht Substanz
     * da, auf die eine echte Antwort gehört.
     *
     * NUR EINMAL: Nach diesem Zug ist der Verlauf nicht mehr „nur Gruss", der Zweig kommt nie
     * wieder.
     */
    if (nurGruss && w === S.chipEinverstanden) {
      /* STUFE „START" — er hat zugestimmt, nicht nur die Seite gesehen (Owner 11.09.2026, siehe oben). */
      schrittMessen(EIGENER_MANDANT, "start");
    }
    if (nurGruss && w === S.chipEinverstanden && auftrag?.trim()) {
      naechster = [...naechster, { rolle: "mensch", text: auftrag.trim() }];
      setVerlauf(naechster);
    } else if (nurGruss && w === S.chipEinverstanden) {
      setVerlauf([...naechster, { rolle: "agent", text: S.ersteFrage, bilderBitte: true }]);
      setFotos([]);
      if (datei.current) datei.current.value = "";
      setFehler("");
      return;
    }
    /**
     * ── EIN UPLOAD GEHT GAR NICHT ERST AN DEN SERVER ────────────────────────────────────────
     *
     * Owner 12.09.2026: „was rechnest du hier schon wieder? du musst nur wissen, wieviele er
     * hochgeladen hat. Er lädt sie hier nur im Zwischenspeicher und nicht auf dem Server. Erst
     * am Ende wird alles erledigt."
     *
     * Die Bilder bleiben im Browser. Gezählt wird nur, und die Antwort steht fest: einmal die
     * Frage nach weiteren Werken, danach Preis, Künstlername und E-Mail. Ansehen, prüfen,
     * Sprüche schreiben und die Seite bauen passiert in EINEM Zug beim Abschluss.
     *
     * ENG GEHALTEN wie der Zweig nach dem Ja darüber: nur wenn er NICHTS geschrieben hat und
     * die Nachricht ausschliesslich aus Bildern besteht. Schreibt er etwas dazu, gehört ihm
     * eine echte Antwort, und es geht den normalen Weg.
     */
    /**
     * ── NACH DEN BILDERN KOMMT DIE ANALYSE, NICHT DIE ADRESSE (Owner 13.09.2026: „Dann wird der
     * Button aktiv Jetzt analysieren") ────────────────────────────────────────────────────────
     *
     * HIER GING ES BISHER über „Willst du noch mehr Bilder?" direkt zum Kontakt-Kasten — er gab
     * seine Adresse, bevor er je etwas von uns gesehen hatte. Gemessen am 13.09.2026: 11 von 25
     * Gesprächen kamen bis zu den Bildern, nur 4 ans Ende.
     *
     * JETZT STEHT DORT EIN KNOPF, und erst er kostet etwas.
     */
    if (marke === "lakatosbandi" && fotos.length > 0 && w === S.nurBilder) {
      /* ── NACH DEM HOCHLADEN KOMMT DAS ANGEBOT, KEINE ANALYSE (Owner 15.09.2026: „Ma uit la
         lucrarea ta soll nichts analysieren. Einfach nur Superb.") ─────────────────────────────
         Hier stand erst ein Knopf „Analizează acum", dann eine Analyse, die von selbst lief.
         Beides ist weg: „Superb!", das Angebot, und Da/Nu. Angesehen wird das Werk erst, wenn
         er Ja gesagt hat — dann kostet es auch etwas, und dann lohnt es sich. */
      setVerlauf([...naechster, {
        rolle: "agent",
        text: `${S.bilderErhalten}\n\n${S.publizierenAngebot}`,
        publizieren: true,
      }]);
      setFotos([]);
      setBildHinweis("");
      if (datei.current) datei.current.value = "";
      setFehler("");
      return;
    }

    /* Die Bilder gehören zu DIESER Nachricht. Blieben sie stehen, hingen sie an jeder folgenden —
       und der Agent bekäme dreimal dasselbe Bild geschickt. */
    const gezeigt = fotos;
    setFotos([]);
    setBildHinweis("");
    if (datei.current) datei.current.value = "";
    setBusy(true); setFehler("");
    try {
      const res = await fetch("/api/versusforge-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          /* DIE SPRACHFRAGE GEHT NICHT MIT: „Choose a language" ist Bedienung, kein
             Gespräch. Herausgenommen wird sie oben, zusammen mit dem Gruss, der an ihre
             Stelle tritt — sonst stünde seine Antwort ohne Frage da. */
          verlauf: naechster.map(m => ({ rolle: m.rolle, text: m.text })),
          device: geraet(),
          /* Die Klammer um die Züge im Protokoll — Begründung an `gespraechId` oben. */
          gespraech: gespraechId(),
          /* Ob schon ein Bild auf dem Schirm steht. Der Server entscheidet daran, welche
             Regeln er überhaupt mitschickt — Begründung an `spaeteRegeln` in der Route. */
          bildDa: verlauf.some(m => !!m.bild),
          /* Seine Bilder reisen NUR mit der Nachricht, an der sie hängen — danach nur noch der
             Befund (`werke`), klein, als Text. */
          ...(gezeigt.length ? { fotos: gezeigt } : {}),
          /* WIE VIELE BILDER ER INSGESAMT HOCHGELADEN HAT (Owner 12.09.2026: „bis dahin nichts
             analysieren und nicht rechnen"). Der Server sah das bisher an den BEFUNDEN — die
             entstehen jetzt aber erst beim Abschluss. Gezählt wird darum im Verlauf, der auch ein
             Neuladen übersteht. */
          bilderZahl: naechster.reduce((n, m) => n + (m.fotos?.length ?? 0), 0),
          werke,
          /* Sein gewähltes Bild reist mit, sobald es feststeht — beim Abschluss wird es gespeichert. */
          /* Beim Abschluss werden ALLE seine Bilder gespeichert (bis zu 4) — das gewählte trägt seinen
             Spruch, für die übrigen schreibt der Server die Sprüche (Owner 10.09.2026). */
          ...(werkWahl ? { werkNr: werkWahl.nr } : {}),
          /* SEINE BILDER REISEN JETZT IMMER MIT, nicht nur nach einer Bildwahl (Owner 12.09.2026:
             „erst am Ende wird alles erledigt"). Sie kommen nie unterwegs beim Server an, also ist
             der Abschluss der einzige Zug, in dem er sie überhaupt zu sehen bekommt — ohne sie
             stünde am Ende eine Seite ohne Werke. */
          ...(naechster.some(x => x.fotos?.length) ? { werkBilder: naechster.flatMap(x => x.fotos ?? []).slice(0, WERKE_TRICHTER) } : {}),
          bilderFragen,
          /* Die Preisspanne fragt der Trichter seit dem 13.09.2026 nicht mehr ab; das Feld auf der
             Serverseite bleibt bestehen (er kann sie im Gespräch trotzdem nennen). */
          ...(gewaehlt ? { spruchGewaehlt: gewaehlt } : {}),
          ...(eigen ? { spruchEigen: eigen } : {}),
          /* SPRUCH BESTÄTIGT (Owner 11.09.2026: „hier dreht er eine Schleife"): Nach „Da, se potrivește" zeigt der Agent
             Bild und Spruch nie wieder. Aus dem Verlauf abgeleitet — geht er mit „Înapoi" davor zurück, gilt es nicht mehr. */
          spruchBestaetigt: naechster.some(x => x.rolle === "mensch" && x.text.startsWith(S.passtJa)),
          /* Nach dem Abschluss keine Chips, kein Spruch, keine Frage mehr (Owner 11.09.2026). */
          abgeschlossen: naechster.some(x => x.rolle === "agent" && !!x.benutzt?.includes("abschluss_schicken")),
          ...(werkWahl ? { werkInfo } : {}),
          /**
           * SEINE SPRACHE GEHT BEI JEDER NACHRICHT MIT (Owner 09.09.2026: „auch alles, was
           * er erstellt — den Trichter und Hook und Dashboard — wird in der Sprache erstellt,
           * die er spricht").
           *
           * Sie steht nicht nur im Auftragstext des Modells: Sie ist die Sprache, in der
           * später der Trichter, der Hook und das Dashboard angelegt werden. Deshalb reist
           * sie mit, statt auf dem Server erraten zu werden.
           */
          sprache: lang,
          /* Die Kennung aus dem Sofortformular — nur gesetzt, wenn er über den Mail-Link kam. */
          ...(lead ? { lead } : {}),
        }),
      });
      const d = (await res.json()) as Record<string, unknown>;
      /* DER SERVER SCHICKT EINEN GRUND, KEINEN SATZ: Sein Text wäre auf Deutsch und im
         schlimmsten Fall die englische Meldung von OpenAI — mitten in einem rumänischen
         Gespräch. Hier steht er in der Sprache, die der Mensch liest. */
      if (!res.ok) { setFehler(d.grund === "deckel" ? S.fehlerDeckel : S.fehler); return; }
      /**
       * DER RIEGEL IM BROWSER (Owner 09.09.2026: „auf keinen Fall schon hier").
       *
       * Die Regel steht im Auftragstext — aber ein Auftragstext ist eine Bitte, und bei der
       * ersten Frage war der Schaden am grössten: drei Berufe aus tausend, ausgedacht von
       * uns. Solange er noch nichts über sein Geschäft gesagt hat, gibt es hier keine Chips,
       * egal was das Modell schickt. Zwei Riegel für einen Fehler, der teuer aussieht.
       */
      if (Array.isArray(d.werke)) setWerke(d.werke as unknown[]);
      /* STUFE „LEAD" — Name und E-Mail sind raus, seine Seite steht (Owner 11.09.2026, siehe oben). */
      if (Array.isArray(d.benutzt) && d.benutzt.includes("abschluss_schicken")) schrittMessen(EIGENER_MANDANT, "lead");
      const hatErzaehlt = naechster.filter(m => m.rolle === "mensch").length > 1;
      /* SEIN BILD MIT SPRUCH: Bild Nummer n ist das n-te Bild, das er in diesem Gespräch gezeigt hat. */
      const v = d.vorschau && typeof d.vorschau === "object" ? (d.vorschau as { nr?: unknown; spruch?: unknown }) : null;
      const vNr = Number(v?.nr);
      const vBild = naechster.flatMap(x => x.fotos ?? [])[vNr - 1];
      const vorschau = v && vBild && String(v.spruch ?? "").trim() ? { nr: vNr, spruch: String(v.spruch).trim() } : undefined;
      if (vorschau && vBild) setWerkWahl({ nr: vNr, bild: vBild });
      /* DIE FRAGE NACH WEITEREN BILDERN steht IM Text — so liest das Modell beim nächsten Zug, worauf
         „Nein" die Antwort war. */
      const mehr = Number(d.mehrBilder) > 0 ? Math.round(Number(d.mehrBilder)) : 0;
      const mehrFrage = mehr ? (mehr === 1 ? S.mehrBilderEins : S.mehrBilderFrage.replace("{n}", String(mehr))) : "";
      if (mehr) setBilderFragen(n => n + 1);
      setVerlauf([...naechster, {
        rolle: "agent",
        text: mehrFrage ? `${String(d.antwort ?? "").trim()}\n\n${mehrFrage}` : String(d.antwort ?? ""),
        benutzt: Array.isArray(d.benutzt) ? (d.benutzt as string[]) : [],
        bild: String(d.bild ?? ""),
        vorschlaege: hatErzaehlt && Array.isArray(d.vorschlaege) ? (d.vorschlaege as string[]) : [],
        bilderBitte: d.bilderBitte === true,
        vorschau,
        loeschFrage: d.loeschFrage === true,
        mehrBilder: mehr || undefined,
        bilderWahl: d.bilderWahl === true,
        spruchWahl: Number(d.spruchWahl) > 0 ? Math.round(Number(d.spruchWahl)) : undefined,
        profilLink: /^https:\/\/lakatosbandi\.com\//.test(String(d.profilLink ?? "")) ? String(d.profilLink) : undefined,
        eigenerSpruch: (() => {
          const e = d.eigenerSpruch as { nr?: unknown; spruch?: unknown } | null | undefined;
          return e && Number(e.nr) > 0 && String(e.spruch ?? "").trim()
            ? { nr: Math.round(Number(e.nr)), spruch: String(e.spruch).trim() }
            : undefined;
        })(),
        kontaktFrage: d.kontaktFrage === true,
      }]);
    } catch {
      setFehler(S.fehler);
    } finally { setBusy(false); }
  };

  /* NACH DEM ABSCHLUSS IST DAS GESPRÄCH ZU ENDE (Owner 11.09.2026: „der wird ein Ende haben nach der Adressenmitteilung
     und sich bedanken"): Dank und Knopf „Completează profilul" bleiben stehen, das Eingabefeld verschwindet. Geht er mit
     „Înapoi" vor den Abschluss zurück, kommt es wieder — der Server antwortet dann trotzdem nur mit dem Dank. */
  const fertig = verlauf.some(m => m.rolle === "agent" && !!m.benutzt?.includes("abschluss_schicken"));

  return (
    <main className={`lb-versusforge flex ${fenster ? "h-full" : "h-[100dvh]"} flex-col overflow-hidden bg-white text-[#14181c]`}>
      <header className={`shrink-0 border-b border-[#dfe4e9] px-5 py-4 ${fenster ? "hidden" : ""}`}>
        <div className="mx-auto flex w-full max-w-[820px] items-center justify-between gap-3">
          {/* WELCHES VERSUSFORGE (Owner 10.09.2026: „hier oben muss noch stehen, welcher
              VersusForge das ist — for Art"). Fest, nicht übersetzt: Es gehört zum Namen. */}
          {marke === "lakatosbandi" ? (
            /* BEIDE ZUSAMMEN, NICHT AN DIE ZWEI ENDEN DER ZEILE (Owner 11.09.2026: „muss an dem Logo hängen" —
               zwei direkte Kinder des äusseren `justify-between` wären an die gegenüberliegenden Ränder gerutscht,
               statt nebeneinander zu stehen). Ein eigener Rahmen mit `gap`, EIN Kind des Kopfs. */
            <span className="flex items-center gap-3">
              {/* ── EUER BILD NEBEN DEM LOGO (Owner 14.09.2026: „das logo im trichter klickbar und
                  bild von uns im kreis neben dran") ────────────────────────────────────────────
                  Es macht aus einer Marke zwei Menschen — dieselbe Wirkung wie der Gründer-Satz
                  unter der Vorschau, nur gleich beim ersten Blick. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/lakatosbandi/geza-szidonia.jpg" alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
              {/* Auf lakatosbandi.com das Logo des Portals (Owner 11.09.2026: „und oben steht VersusForge").
                  KLICKBAR (Owner 14.09.2026) — führt aufs Portal, damit man die Künstler sieht. */}
              <a href="/" className="text-[22px] font-black leading-none tracking-[-0.03em] text-[#111] no-underline hover:underline">lakatosbandi.com</a>
              {/* DER SATZ NEBEN DEM LOGO (Owner 11.09.2026: „neben dem Logo rechts, groß dünn" · „oder in
                  Serifenschrift" · „oder den coolen Spruch von Burnett") — Leo Burnett, aus dem Marketing-Pool
                  (`scratchpad/zitate/paket-11-marketing.json`), gross, leicht, in der Serifenschrift der Überschriften.
                  Auf dem Handy ausgeblendet, sonst sprengt es wieder den Kopf (Owner 11.09.2026, siehe
                  `components/PortalKopf.tsx`). */}
              <span className="hidden font-serif text-[19px] font-light leading-none text-[#111] sm:block">If you don&rsquo;t get noticed, you might as well be invisible.</span>
            </span>
          ) : (
            <span className="flex flex-col gap-1">
              <Wortmarke className="text-[21px] font-black leading-none tracking-[-0.02em]" akzent="#111" />
              <span className="text-[10.5px] font-extrabold uppercase leading-none tracking-[0.2em] text-[#111]">Marketing for Art</span>
            </span>
          )}
          {/* HIER STAND „Agent · Muster" — ein Schild aus der Zeit, als der Chat ein
              Versuch neben dem Trichter war. Seit dem 10.09.2026 IST er der Eingang aus der
              Anzeige (Owner: „das ist der neue Trichter, den wir brauchen"); ein Kunde, der
              „Muster" liest, fragt sich zu Recht, ob er hier richtig ist. */}
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[820px] flex-1 flex-col overflow-hidden px-4">
        {/**
          * ── DAS GESPRÄCH BEGINNT UNTEN, NICHT OBEN (Owner 09.09.2026: „schau hin") ────────
          *
          * WAS ZU SEHEN WAR: eine Sprechblase oben, drei Knöpfe, und darunter zwei Drittel
          * weisse Fläche bis zum Eingabefeld. Das sieht nicht ruhig aus, sondern als hätte
          * die Seite etwas nicht geladen — und zwar im allerersten Moment, in dem jemand
          * entscheidet, ob er hier tippt.
          *
          * ── `justify-end` WAR FALSCH UND HAT DEN ANFANG VERSCHLUCKT ─────────────────────
          *
          * Owner 10.09.2026, mit Bild: „ich kann nicht hochscrollen." Er hatte recht, und es
          * ist ein bekannter Flexbox-Fehler: Bei `justify-content: flex-end` in einer Fläche,
          * die scrollt, wachsen die Inhalte über die OBERE Kante hinaus — und dorthin kommt
          * kein Rollbalken. Die Begrüssung, die Regeln, der Datenschutzsatz: alles noch da,
          * aber unerreichbar, sobald das Gespräch länger als der Schirm wird.
          *
          * ES TRAF AUSGERECHNET DIESEN CHAT AM HÄRTESTEN: Er beginnt mit vier langen
          * Absätzen. Wer nach der dritten Antwort noch einmal nachlesen wollte, was mit
          * seinen Daten passiert, kam nicht mehr hin.
          *
          * `mt-auto` AM INHALT LÖST DASSELBE OHNE DEN FEHLER: Ist wenig da, schiebt der
          * automatische Abstand alles nach unten ans Feld — genau der Effekt, der gewollt
          * war. Ist viel da, wird der Abstand null und die Fläche scrollt normal, von ganz
          * oben bis ganz unten.
          *
          * ── SEIT DIE STARTKARTE KURZ IST: `my-auto` STATT `mt-auto` (13.09.2026) ────────
          *
          * Solange die Karte ein hohes Mockup trug, füllte sie den Schirm ohnehin. Ohne das
          * Bild (Owner: „ich das Bild und Webseite nicht haben will") ist sie nur noch
          * Titel, Knopf und eine Zeile — und `mt-auto` schob sie ganz nach unten, mit rund
          * 800 Pixeln Leere darüber. Das ist DERSELBE Eindruck wie am 09.09.2026, nur
          * gespiegelt: Es sieht aus, als hätte die Seite etwas nicht geladen.
          *
          * `my-auto` bedient beide Fälle: Wenig Inhalt sitzt MITTIG — kein leerer Block
          * oben, keiner unten. Wird das Gespräch länger als der Schirm, werden beide
          * Abstände null und es scrollt unverändert von oben nach unten. Der Fehler mit
          * `justify-end` bleibt umgangen, weil es weiter über Abstände läuft.
          */}
        <div className="lb-wisch flex min-h-0 flex-1 flex-col overflow-y-auto py-5">
          <div className="my-auto flex flex-col gap-3">
          {verlauf.map((m, i) => (
            <div key={i} className={m.rolle === "mensch" ? "flex flex-col items-end gap-1.5" : "flex flex-col items-start gap-2"}>
              {/**
                * DER KOPF NEBEN SEINEN NACHRICHTEN (Owner 09.09.2026: „mit Icon").
                *
                * IM TRICHTER WAR ER FALSCH und flog am selben Tag raus („das raus"): Dort
                * stand er neben EINER Sprechzeile auf einer Seite, die schon eine Wortmarke
                * im Kopf trug — zweimal derselbe Absender, und dazwischen ein Satz über
                * Implantate. Im CHAT ist er richtig: Hier wechseln sich zwei Sprecher ab, und
                * jeder Chat, den er kennt, zeigt daneben, wer spricht.
                *
                * NUR BEIM ERSTEN EINER FOLGE: Drei Köpfe untereinander bei drei Nachrichten
                * hintereinander sind eine Kolonne, kein Gesprächspartner. So macht es
                * WhatsApp auch.
                */}
              {/**
                * ── AUF LAKATOSBANDI GAR KEIN ABSENDER (Owner 13.09.2026: „die fucking adresse
                * raus. Die steht im header schon") ────────────────────────────────────────────
                *
                * Hier stand „lakatosbandi.com" über jeder Agenten-Nachricht — derselbe Name, der
                * zwei Zentimeter darüber im Seitenkopf steht. Genau der Fehler, den der Kommentar
                * oben für den Trichter schon beschreibt („zweimal derselbe Absender"), nur diesmal
                * im Chat selbst.
                *
                * DIE GANZE ZEILE ENTFÄLLT, nicht nur ihr Text: Ein leerer Block mit `gap` liesse
                * über jeder Nachricht einen Abstand stehen, den niemand erklären könnte.
                *
                * VERSUSFORGE BLEIBT, WIE ES WAR — dort wechseln sich zwei Sprecher ab, und das
                * Logo sagt, wer gerade redet.
                */}
              {m.rolle === "agent" && marke !== "lakatosbandi" && verlauf[i - 1]?.rolle !== "agent" && (
                <div className="flex items-center gap-2">
{/**
                    * DAS ZEICHEN STATT EINES BILDES (Owner 09.09.2026: „mach ein Icon VF").
                    *
                    * ZWEI FASSUNGEN LAGEN VORHER HIER, beide falsch: der Kämpferkopf — das
                    * Markenbild, und ein Wappen redet nicht — und danach kurz Davids Gesicht,
                    * das aber einem anderen Produkt gehört.
                    *
                    * „VF" IST BEIDES ZUGLEICH: klein genug für eine Sprechblase und eindeutig
                    * genug, dass man nach einer Sekunde weiss, wer spricht. Der Baustein liegt
                    * in der Markendatei ([[ci-bibliothek]]) — hier steht nur die Grösse und
                    * das Blau dieser Seite.
                    */}
                  {/**
                    * HELLGRAUER KREIS STATT DES DUNKLEN (Owner 09.09.2026: „F helleres Blau"
                    * · „oder der Kreis hellgrau").
                    *
                    * DER ZWEITE VORSCHLAG IST DER BESSERE, und der Grund steht im Bild
                    * daneben: Die Sprechblasen dieses Chats sind hellgrau. Ein schwarzer
                    * Kreis davor ist der dunkelste Fleck auf dem ganzen Schirm und zieht mehr
                    * Aufmerksamkeit als der Satz, den er ankündigt.
                    *
                    * AUF HELLEM GRUND BRAUCHT DAS „F" KEIN AUFGEHELLTES BLAU MEHR: Das
                    * Seiten-Blau #111 ist genau dafür gemacht, und es ist dasselbe wie in
                    * der Wortmarke oben — zwei Blautöne auf einem Schirm sähen aus wie ein
                    * Versehen.
                    */}
                  {/**
                    * ── DAS ECHTE LOGO STATT DES GEZEICHNETEN (Owner 10.09.2026: „hier ist
                    * das Logo für VersusForge. Den machst du in den Chat rein") ─────────────
                    *
                    * `Zeichen` war ein Platzhalter aus zwei Buchstaben, weil es kein Logo gab.
                    * Jetzt gibt es eins, und es gehört an genau diese Stelle: Es ist das
                    * Gesicht dessen, der spricht.
                    *
                    * RUND UND KLEIN, OBWOHL DAS BILD QUADRATISCH UND SCHWARZ IST: Als runder
                    * Punkt von 28 px liest es sich wie ein Profilbild in jedem Messenger —
                    * genau das ist es hier auch. Der schwarze Grund, der als grosse Fläche zu
                    * schwer wäre, wird in dieser Grösse zum Kontrast, der das Blau trägt.
                    *
                    * KEIN `next/image`: Die Datei liegt fest in `public`, hat feste Masse und
                    * erscheint dutzendfach auf demselben Schirm — die Optimierung würde hier
                    * nichts sparen und nur eine Abhängigkeit hinzufügen.
                    */}
                  {/* Nur noch VersusForge: Die Abfrage auf lakatosbandi stand hier bis zum
                      13.09.2026 und ist seit der Bedingung oben (`marke !== "lakatosbandi"`)
                      unerreichbar — TypeScript hat sie als toten Vergleich gemeldet (TS2367). */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/VersusForge/Logo-VersusForge.JPG"
                    alt=""
                    className="h-7 w-7 shrink-0 rounded-full object-cover"
                  />
                  <span className="text-[13.5px] font-black tracking-[-0.01em] text-[#5b666f]">VersusForge</span>
                </div>
              )}
              {/* SEINE BILDER BLEIBEN IM GESPRÄCH SICHTBAR — über seiner Nachricht, rechts wie sie. */}
              {m.fotos && m.fotos.length > 0 && (
                /* ── WISCHBAR STATT ZEILENUMBRUCH (Owner 14.09.2026: „hier kann man nicht sliden
                   die Bilder") ─────────────────────────────────────────────────────────────────
                   Vorher ein `grid-cols-5`, das bei mehr als fünf Werken in eine zweite Reihe
                   umbrach — das sah nicht nach Wischen aus und wurde als Fehler gelesen. Jetzt
                   eine Reihe, die zur Seite scrollt; jedes Bild feste Breite statt Raster-Spalte. */
                <div className="flex w-full max-w-[300px] snap-x snap-mandatory gap-1.5 overflow-x-auto justify-self-end">
                  {m.fotos.map((f, n) => {
                    /**
                     * ── WÄHLEN UND WEGNEHMEN, SOLANGE NICHTS LIVE IST ─────────────────────────
                     *
                     * (Owner 14.09.2026: „jetzt wähle ein Kunstwerk aus" · „er kann eventuell
                     * auch löschen, bevor es live geht")
                     *
                     * NUR BIS ZUR ANALYSE: Danach hängt an einem dieser Bilder ein Befund und ein
                     * Spruch. Ein Bild wegzunehmen hiesse dann, den Satz unter einem anderen Werk
                     * stehen zu lassen. Bis dahin ist es nur seine Auswahl, und die darf er
                     * ändern, ohne von vorn anzufangen.
                     */
                    const offen = marke === "lakatosbandi" && !busy
                      && verlauf[verlauf.length - 1]?.analyse === true;
                    const dran = n === analyseWahl;
                    if (!offen) {
                      /* eslint-disable-next-line @next/next/no-img-element */
                      return <img key={n} src={f} alt="" className="aspect-square w-14 shrink-0 snap-start rounded-lg object-cover" />;
                    }
                    return (
                      <div key={n} className="relative w-14 shrink-0 snap-start">
                        <button type="button" onClick={() => setAnalyseWahl(n)}
                          aria-pressed={dran}
                          className={`block w-full overflow-hidden rounded-lg transition ${dran ? "ring-[3px] ring-[#111]" : "opacity-60 hover:opacity-100"}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={f} alt="" className="block aspect-square w-full object-cover" />
                        </button>
                        <button
                          type="button"
                          aria-label={S.fotoWeg}
                          onClick={() => {
                            /* Aus DIESER Nachricht nehmen — die Bilder hängen am Verlauf, nicht
                               mehr am Eingabefeld (das ist nach dem Senden geleert). */
                            setVerlauf(v => v.map((x, xi) => (xi === i ? { ...x, fotos: (x.fotos ?? []).filter((_, j) => j !== n) } : x)));
                            /* Die Auswahl mitziehen: Wer das gewählte Werk wegnimmt — oder eines
                               davor —, hätte sonst plötzlich ein anderes markiert. */
                            setAnalyseWahl(w => (n < w ? w - 1 : n === w ? 0 : w));
                          }}
                          className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-white text-[#5b666f] shadow-[0_1px_4px_rgba(0,0,0,.3)] transition hover:text-[#14181c]"
                        >
                          <X className="h-3 w-3" aria-hidden />
                        </button>
                      </div>
                    );
                  })}
                  {/**
                    * ── EIN PLATZ ZUM NACHLEGEN (Owner 14.09.2026: „eventuell zeigst du eine
                    * Galerie mit 10 Platzhalter und er kann dort löschen oder neue hochladen") ──
                    *
                    * EIN Feld statt zehn leeren Kästen: Zehn Platzhalter nehmen auf dem Handy drei
                    * Reihen und fordern ihn auf, erst einmal zehn Werke zu suchen — bevor er
                    * überhaupt gesehen hat, was wir daraus machen. Gelöscht wird am Bild selbst,
                    * nachgelegt hier; das ist dieselbe Freiheit auf einem Viertel der Fläche.
                    *
                    * Der Zähler sagt, wie viel noch geht — sonst tippt er ein elftes Bild an und
                    * es passiert nichts.
                    */}
                  {marke === "lakatosbandi" && !busy
                    && verlauf[verlauf.length - 1]?.analyse === true
                    && verlauf.flatMap(x => x.fotos ?? []).length < WERKE_TRICHTER && (
                    <button
                      type="button"
                      onClick={() => { nachlegenZiel.current = i; nachlegenDatei.current?.click(); }}
                      className="grid aspect-square w-14 shrink-0 snap-start place-items-center rounded-lg border-[1.5px] border-dashed border-[#c9ced3] text-[#8b959d] transition hover:border-[#111] hover:text-[#111]"
                    >
                      <span className="text-[20px] font-light leading-none">+</span>
                    </button>
                  )}
                </div>
              )}
              {m.rolle === "agent" && marke === "lakatosbandi" && m.text === gruss ? (
                /* DIE STARTKARTE — IM STIL DES BEISPIELS AUF DER STARTSEITE (Owner 11.09.2026: „lakatosbandi.com ist
                   besser als lakatosbandi." fürs Logo · „das Bild von Van Gogh nicht abschneiden" · „unten hast du
                   kunterbunte Typo, schau wie wir es auf der Homepage haben" — also `components/PortalBald.tsx`, Abschnitt
                   BEISPIEL: graue Kapitälchen-Label, „Nachher" gross in Serifenschrift statt fett, die Frage als
                   Zitat mit Strich links, keine Farbmischung). Der Datenschutz steht eingeklappt, aber VOR dem Knopf —
                   die Einwilligung bleibt eine Einwilligung.
                   CREME STATT GRAU (Owner 14.09.2026: „Grau in crem") — nur diese eine Karte, nicht
                   die geteilte Blasen-Farbe des übrigen Chats; passend zur Stein-Geschichte darunter,
                   die schon im selben Creme läuft. */
                <div className="max-w-[86%] overflow-hidden bg-[#f4f1ea] text-[16.5px] leading-[1.5] md:text-[17.5px]">
                  {/**
                    * ── KEIN BILD MEHR AUF DER KARTE (Owner 13.09.2026: „verstehst du nicht, dass
                    * ich das Bild und Webseite nicht haben will?") ───────────────────────────────
                    *
                    * Hier stand das Mockup der fertigen Künstlerseite. Es ist ersatzlos raus: Die
                    * Karte soll nichts mehr zeigen und nichts mehr erklären, sondern zum Hochladen
                    * auffordern — Titel, Knopf, Einwilligung.
                    *
                    * ES LÖST NEBENBEI EINEN WIDERSPRUCH: Im Bild stand „Încarcă până la 10
                    * lucrări" eingebrannt, während der Knopf 1-5 sagt. Ohne Bild keine zweite
                    * Zahl auf demselben Schirm.
                    */}
                  <div className="px-4 py-4">
                    {/**
                      * ── DER EINSTIEG IST DAS HOCHLADEN (Owner 13.09.2026: „hier werden direkt
                      * mit Bilder upload und sagen, dass deine Kunst analysieren, laden hier bis
                      * zu 5 Bilder hoch.") ──────────────────────────────────────────────────────
                      *
                      * HIER STAND EINE TEXTWAND und darunter ein schwarzer Knopf „Da, vreau pagina
                      * mea", der nur zur nächsten Frage führte — erst danach durfte er hochladen.
                      * Gemessen am 13.09.2026: 9 von 25 Gesprächen endeten nach genau einem Zug,
                      * also auf dieser Karte. Wer gekommen ist, um seine Kunst zu zeigen, soll sie
                      * zeigen können, statt zuerst eine Seite zu lesen.
                      *
                      * DER KNOPF IST JETZT DIE EINWILLIGUNG (`startZustimmung` darunter, der
                      * Datenschutztext bleibt ausklappbar). Das ist zulässig, weil die Bilder den
                      * Browser noch nicht verlassen: Der Zweig `nurBilder` in `schicken` kehrt vor
                      * jedem Serveraufruf um — verarbeitet wird erst beim Abschluss.
                      */}
                    {/* NUR NOCH TITEL UND KNOPF (Owner 13.09.2026: „Nur Button … Titel").
                        `startAnalyse` und `startText` stehen jetzt zusammengefasst AUF dem Knopf
                        (`startKnopf`); im Modelltext `grussPortal` bleiben sie einzeln. */}
                    {/* IN SERIFENSCHRIFT (Owner 13.09.2026: „Schreib in Serifen: Marketing for
                        Art!") — dieselbe Schrift wie unter den Werkbildern und im „Nachher" auf
                        der Startseite: gross und ruhig statt fett. */}
                    {/* ── DAS VAN-GOGH-BEISPIEL IST WIEDER AUS DER KARTE RAUS (Owner 14.09.2026:
                        „mach ein schönes hook bild in unserem stil" · „das nehmen wir für FB") ──
                        Es wandert in die Anzeige, wo es hingehört: Dort muss der Hook auffallen,
                        hier muss der Knopf auffallen. Die Karte bleibt so kurz, wie sie heute
                        geworden ist. */}
                    {/* Die Marke als kleines Label — sie bleibt, aber sie ist nicht die Aussage. */}
                    <p className="m-0 text-[10.5px] font-extrabold uppercase leading-none tracking-[0.2em] text-[#a8a196]">{S.startTitel}</p>
                    {/* ── DER HOOK DER ANZEIGE (Owner 13.09.2026: „das schreibst du auch ins Tunnel
                        rein") — gross und in Serifenschrift, damit die Seite dasselbe sagt wie die
                        Anzeige, die ihn hergebracht hat. */}
                    <p className="m-0 mt-2 font-serif text-[26px] leading-[1.15] text-[#111] md:text-[29px]">{S.startHook}</p>
                    {/* „Noi îl facem." klein und ohne Serifen (Owner 13.09.2026) — die Antwort
                        auf die Behauptung darüber, leise gesetzt. */}
                    <p className="m-0 mt-1.5 text-[15px] font-semibold leading-[1.3] text-[#8a8375]">{S.startHookKlein}</p>
                    {/**
                      * ── „LUCRĂRILE ÎMI APARȚIN" STEHT JETZT HIER (Owner 13.09.2026: „Das muss
                      * stehen bleiben mit Lucrarile imi apartin.") ───────────────────────────────
                      *
                      * WANDERTE AM 14.09.2026 WEITER — auf die Karte, auf der er seine Adresse
                      * gibt (`datenFragt` unten). Der Knopf hier ist jetzt sofort aktiv (Owner:
                      * „button soll sofort aktiv sein"): Wer nur die Bilder ansehen will, bevor er
                      * sich entscheidet, wird nicht mehr von einem Häkchen aufgehalten, das er noch
                      * gar nicht einordnen kann — er hat ja noch kein einziges Bild gewählt.
                      */}
                    {/* ── DER SLIDER IST RAUS, DAS BILD IST GEBLIEBEN (Owner 15.09.2026: „dann
                        braucht man auch keine slider mehr" · „direkt bilder hochladen") ────────
                        Fünf Karten mit je sieben Sekunden standen zwischen dem Hook und dem
                        Knopf; der Knopf lag dadurch 680 px tief, auf kleinen Handys unter dem
                        Rand. Die Geschichte steht jetzt in der Überschrift („Van Gogh a fost
                        arătat lumii"), und das Bild darunter ist ihr Beweis — mehr braucht die
                        Karte nicht, bevor er hochlädt. */}
                    {verlauf.length <= 1 && (
                      // eslint-disable-next-line @next/next/no-img-element
                      /* ── EIN POSTER VON LOUISETT STATT VAN GOGH (Owner 18.09.2026: „und
                         Louisett als Beispiel geben, nicht Van Gogh … dann zeigen wir ein Poster
                         von Louisett") ───────────────────────────────────────────────────────
                         Van Gogh zeigt, was BERÜHMT aussieht; ein Blatt einer lebenden Künstlerin
                         zeigt, was ER bekommt — mit seinem Namen, seiner Adresse und dem Siegel
                         darauf. */
                      <img src="/lakatosbandi/beispiel-louisett.jpg" alt=""
                        /**
                         * ── DAS BLATT GANZ, NICHT ANGESCHNITTEN (Owner 18.09.2026: „hier war
                         * das Poster ganz zu sehen") ────────────────────────────────────────
                         *
                         * HIER STAND EIN AUSSCHNITT (`h-[180px] object-cover`) mit der Begründung,
                         * die hochkante Datei schöbe den Hochladen-Knopf unter den Rand. GEMESSEN
                         * auf 375×812 stimmt das nicht: In voller Höhe endet der Knopf bei 714 von
                         * 812 Pixeln — 98 Pixel Luft, die Hausregel „CTA im Viewport" bleibt
                         * gewahrt.
                         *
                         * UND DER AUSSCHNITT KOSTETE GENAU DAS, WOFÜR DAS BILD DA IST: Er schnitt
                         * unten Name, Beschreibung, Siegel und Adresse weg — also alles, was zeigt,
                         * was der Künstler bekommt. Übrig blieb ein Bildausschnitt wie jeder andere.
                         */
                        className="mx-auto mt-4 block h-[260px] w-auto object-contain shadow-[0_10px_28px_rgba(0,0,0,.2),0_3px_7px_rgba(0,0,0,.12)]" />
                    )}
                    {/* ── WAS ER BEKOMMT, ÜBER DEM KNOPF (Owner 14.09.2026: „Urca pana la 10
                        lucrari. Primesti un Exemplu de Marketing." · „Button Upload") ─────────
                        Der Satz trägt die Erklärung, der Knopf nur noch das eine Wort. Vorher
                        stand beides auf dem Knopf und machte ihn zweizeilig und schwer. */}
                    {/* DIE ZEILE IST RAUS (Owner 15.09.2026: „Urcă până la 10 lucrări. Primești
                        un exemplu de marketing. raus") — sie trug das Wort, dem sie nicht
                        trauen, und der Knopf sagt ohnehin, was zu tun ist. */}
                    <button
                      type="button"
                      onClick={() => datei.current?.click()}
                      /* Breite nach Inhalt, nicht über die Karte (Owner 13.09.2026: „Incarca 1-5
                         Lucrari de arta"). Die lange Fassung brauchte zwei Zeilen und volle Breite;
                         bei der kurzen stünde die rechte Hälfte leer und der Knopf sähe unfertig aus. */
                      /* MITTIG (Owner 14.09.2026: „Button mittig") — `mx-auto` statt links am
                         Rand; `w-fit`, damit er trotzdem nur so breit ist wie sein Text. */
                      className="mx-auto mt-3.5 flex w-fit items-center gap-2.5 bg-[#111] px-5 py-3.5 text-[15.5px] font-bold leading-[1.35] text-white transition hover:bg-[#333] active:scale-95"
                    >
                      <ImagePlus className="h-5 w-5 shrink-0" aria-hidden />
                      {S.startKnopf}
                    </button>
                    {/* Das Angebot zum Schluss (Owner 15.09.2026) — siehe `startAbschluss`. */}
                    <p className="m-0 mt-3.5 text-[14.5px] leading-[1.5] text-[#5b666f]">{S.startAbschluss}</p>
                    {/* Die Einwilligung steht NICHT mehr als eigene Zeile hier (Owner 13.09.2026:
                        „hier steht zwei mal protectaia datelor") — sie ist jetzt der Aufklapper
                        selbst, siehe `<details>` unten. Ein Satz statt zweier, die dasselbe Wort
                        tragen. */}
                    {/* „Du musst keine Website bauen / kein bekannter Künstler sein" steht nicht
                        mehr auf der Karte (Owner 13.09.2026, Umbau auf Upload-zuerst) — im
                        Modelltext `grussPortal` bleibt es, der Agent liest es weiter. */}
                    {/* WAS ER BEKOMMT UND WARUM ES NICHTS KOSTET — VORNE STATT AM ENDE (Owner 12.09.2026: „was am Ende
                        steht nach vorne bringen"). Gekürzt auf vier Punkte und einen Satz; der ganze Absatz von hinten
                        würde die Karte wieder zur Wand machen, die am 11.09.2026 genau deshalb gekürzt wurde. */}
                    {/* Die vier Häkchen und „Noi facem restul" stehen als Symbolleiste IM Bild —
                        hier wären sie die dritte Wiederholung auf einem Bildschirm. Im Modelltext
                        (`grussPortal`) bleiben sie: der Agent sieht das Bild nicht. */}
                    {/* „Gratis, jetzt" als eigene Zeile (Owner 13.09.2026) — der Satz über Sponsoren
                        erklärt das Warum und steht klein darunter. */}
                    {/* „Gratuit pentru artiștii care intră acum." steht nicht mehr auf der Karte
                        (Owner 13.09.2026: „das raus") — es steht bereits IM Bild darüber
                        („GRATUIT PENTRU ARTIȘTII CARE INTRĂ ACUM.") und war damit die zweite
                        Fassung desselben Satzes auf einem Schirm. Im Modelltext `grussPortal`
                        bleibt es. */}
                    {/* Der Satz über Sponsoren steht seit dem 13.09.2026 nicht mehr in der Karte —
                        leer heisst: die Zeile entfällt ganz, statt eine Lücke zu hinterlassen. */}
                    {S.startWarum.trim() ? <p className="m-0 mt-2 text-[14px] leading-[1.5] text-[#5b666f]">{S.startWarum}</p> : null}
                    {/* „Începe acum." ist seit dem Umbau auf Upload-zuerst der Knopf selbst —
                        ein Aufruf neben dem Knopf, der ihn wiederholt, verdünnt ihn nur. */}
                    {/* GANZ UNTEN UND SEHR KLEIN (Owner 13.09.2026: „o poți pune mai jos, foarte mic") —
                        die Zusage beruhigt hier, statt oben den Hook zu verdünnen. */}
                    {/* „Schițe, încercări și lucrări vechi sunt binevenite" ebenfalls raus
                        (Owner 13.09.2026: „das raus"). Die Karte trägt jetzt nur noch: was wir
                        tun, wie viele Werke, den Knopf, die Einwilligung, den Datenschutz. */}
                    <details className="mt-3">
                      {/* DIE EINWILLIGUNG IST DER AUFKLAPPER (Owner 13.09.2026). Vorher stand
                          „Încărcând, ești de acord cu protecția datelor." als Zeile darüber und
                          „Protecția datelor" als Titel darunter — zweimal dasselbe Wort auf
                          zwei Zeilen. Jetzt sagt der Satz, worauf er sich einlässt, UND öffnet
                          den Text dazu. */}
                      <summary className="cursor-pointer text-[12.5px] leading-[1.5] text-[#8b959d]">{S.startZustimmung}</summary>
                      <p className="m-0 mt-2 whitespace-pre-wrap text-[14px] leading-[1.5] text-[#5b666f]">{S.grussDatenschutz}</p>
                    </details>
                  </div>
                </div>
              ) : (
                <p className={`m-0 max-w-[86%] whitespace-pre-wrap text-[16.5px] leading-[1.5] md:text-[17.5px] ${
                  m.rolle === "mensch"
                    ? "rounded-2xl rounded-br-md bg-[#111] px-4 py-3 font-semibold text-white"
                    : "rounded-2xl rounded-bl-md bg-[#f1f4f7] px-4 py-3"}`}>
                  {m.rolle === "agent" ? fetteFrage(m.text) : m.text}
                </p>
              )}
              {/* „COMPLETEAZĂ PROFILUL" (Owner 11.09.2026: „wenn er das macht, wird sein Agent noch besser") — ein Angebot, keine Pflicht. */}
              {m.rolle === "agent" && m.profilLink && (
                <a href={m.profilLink} target="_blank" rel="noopener"
                  className="rounded-full bg-[#111] px-4 py-2 text-[14.5px] font-bold text-white no-underline transition hover:bg-[#333]">
                  {S.profilErgaenzen}
                </a>
              )}
              {/* ── ZURÜCK ZUR VORIGEN FRAGE (Owner 10.09.2026: „ich will, dass jemand die Fragen
                  wiederholen kann" · „also zurückgehen kann") — unter JEDER seiner Nachrichten, auch mit
                  Bildern (Owner 11.09.2026: „hier kann ich nicht zurück" · „Înapoi fehlt bei beiden blau"). */}
              {m.rolle === "mensch" && !busy && (
                <button type="button" onClick={() => zurueck(i)}
                  className="pr-1 text-[13.5px] font-bold text-[#8b959d] underline underline-offset-2 hover:text-[#14181c]">
                  ← {S.zurueck}
                </button>
              )}

              {/**
                * ── DIE SPRACHEN ALS KNÖPFE ────────────────────────────────────────────────
                *
                * SIE SEHEN AUS WIE DIE CHIPS, TUN ABER ETWAS ANDERES: Ein Chip setzt Text ins
                * Feld, hier wird sofort umgeschaltet. Das ist der eine erlaubte Unterschied —
                * eine Sprachwahl ist keine Antwort an den Agenten, und sie durch das
                * Eingabefeld zu schicken hiesse, einen bezahlten Modellaufruf für „Română"
                * auszulösen.
                *
                * JEDE SPRACHE IN IHRER EIGENEN SCHREIBWEISE (`LANG_LABEL`): „Română", nicht
                * „Rumänisch". Wer die Frage darüber nicht liest, erkennt trotzdem sein Wort.
                *
                * ── KEINE VORAUSWAHL (Owner 09.09.2026: „nix als Default habe ich gesagt") ──
                *
                * ICH HATTE DIE BROWSERSPRACHE HERVORGEHOBEN und damit gegen seine Ansage
                * gebaut. Der Grund, warum er recht hat, ist derselbe, mit dem die Sprachfrage
                * überhaupt angefangen hat: Der Browser sagt, was jemand EINGESTELLT hat, nicht
                * in welcher Sprache er reden will. Eine hervorgehobene Antwort ist eine
                * Behauptung — und wer sie sieht, tippt sie an, auch wenn sie falsch ist. Genau
                * die Sorte Vermutung wollten wir loswerden.
                *
                * DREI GLEICHE KNÖPFE, FESTE REIHENFOLGE. Auch die Reihenfolge ist eine
                * Vorauswahl: Wer vorn steht, wird häufiger gewählt. Sie steht deshalb fest
                * und ändert sich nicht mit dem Besucher.
                */}
              {m.sprachfrage && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {SPRACH_REIHENFOLGE.map(l => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => spracheWaehlen(l)}
                      className="rounded-full border-[1.5px] border-[#dfe4e9] bg-white px-4 py-2 text-[15px] font-bold text-[#14181c] transition hover:border-[#111] hover:text-[#111]"
                    >
                      {LANG_LABEL[l]}
                    </button>
                  ))}
                </div>
              )}

              {/**
                * DIE CHIPS ZUR FRAGE (Owner 09.09.2026: „manche wissen es nicht, die musst du
                * als Chips anbieten").
                *
                * ANTIPPEN SETZT EIN, ES SCHICKT NICHT AB. Der Satz landet im Feld, er kann
                * ihn ändern oder ergänzen und drückt selbst. Auf der Startseite waren Chips
                * falsch, weil dort ein Klick seine eigene Beschreibung ERSETZT; hier sind sie
                * richtig, weil sie eine schwere Frage überhaupt erst beantwortbar machen.
                *
                * NUR AN DER LETZTEN NACHRICHT: Chips unter einer beantworteten Frage sind
                * eine Falle — man tippt sie an und schickt eine Antwort auf etwas, das drei
                * Nachrichten zurückliegt.
                */}
              {/* ── SEIN BILD MIT DEM SPRUCH DARUNTER (Owner 10.09.2026: „Zeige sein Bild und Spruch
                  drunter") — wie später auf seiner Seite. Es steht VOR den Knöpfen: „Passt das?" fragt
                  nach diesem Bild, also muss man es gesehen haben, bevor man Ja oder Nein tippt. */}
              {(() => {
                const v = m.vorschau;
                const bild = v ? verlauf.slice(0, i).flatMap(x => x.fotos ?? [])[v.nr - 1] : undefined;
                return v && bild ? (
                  <figure className="m-0 w-full max-w-[340px] overflow-hidden rounded-2xl border border-[#dfe4e9] bg-white">
                    {/* ── PASSEPARTOUT (Owner 14.09.2026: „also creme und das bild kleiner mit
                        schatten? damit es edler wirkt? als würde es auf einer wand liegen") ────
                        Statt eines erzeugten Galerieraums — der Versuch war teuer und traf den
                        Stil nicht — nur Fläche, Abstand und Schatten. Kostet nichts, geht nie
                        daneben, und das Werk bleibt unverändert. */}
                    <div className="bg-[#f4f1ea] p-7">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={bild} alt={S.vorschauAlt}
                        className="mx-auto block w-full object-contain shadow-[0_10px_26px_rgba(0,0,0,.20),0_2px_6px_rgba(0,0,0,.14)]" />
                    </div>
                    <figcaption className="px-4 py-3 font-serif text-[18px] leading-[1.35] text-[#14181c]">{v.spruch}</figcaption>
                    {/**
                     * ── PREIS UND AGENT, WIE AUF DER ECHTEN SEITE (Owner 14.09.2026: „ja" auf
                     * die Frage, ob beide in die Trichter-Vorschau gehören) ────────────────────
                     *
                     * BEIDE SIND HIER EIN BEISPIEL, KEIN ANGEBOT: Er hat noch keinen Preis
                     * genannt und noch keinen Agenten — deshalb steht „(exemplu)" dran und der
                     * Knopf tut nichts. Ohne diesen Zusatz wäre es eine Zahl, die er für seine
                     * hält (Hausregel: nichts behaupten, was nicht ist).
                     */}
                    {/* IN ALLEN SPRACHEN (Owner 15.09.2026: „warum sieht en anders aus als ro?") —
                        vorher nur Rumänisch, deshalb sah der englische Trichter halb leer aus. */}
                    <div className="px-4 pb-4">
                      <span className="inline-block bg-[#f4f4f4] px-3.5 py-2 text-[15px] font-semibold text-[#111]">
                        {lang === "ro" ? "Preț la cerere · 500 – 2.000 € (exemplu)"
                          : lang === "de" ? "Preis auf Anfrage · 500 – 2.000 € (Beispiel)"
                          : "Price on request · 500 – 2,000 € (example)"}
                      </span>
                      <span className="mt-3 block bg-[#111] px-4 py-3 text-center text-[14.5px] font-semibold text-white">
                        {lang === "ro" ? "Te interesează arta mea? Vorbește cu agentul meu."
                          : lang === "de" ? "Interessiert dich meine Kunst? Sprich mit meinem Agenten."
                          : "Interested in my art? Talk to my agent."}
                      </span>
                    </div>
                    {/**
                     * ── DIE GRÜNDER EMPFEHLEN, JETZT HIER IM TRICHTER (Owner 14.09.2026: „hier
                     * sollte er die miniwebseite bekommen im tunel") — dieselbe Karte, die
                     * später auf der echten Werk-Seite steht (app/portal/[kuenstler]/[werk]),
                     * jetzt schon in DIESER Vorschau, egal ob Beispiel oder echte Analyse:
                     * beide laufen über dieselbe `m.vorschau`-Karte hier.
                     */}
                    {(
                      <div className="flex items-center gap-[14px] border-t border-[#e5e5e5] px-4 py-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/lakatosbandi/geza-szidonia.jpg" alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
                        {/* KEIN URTEIL ÜBER DIESES EINE WERK (Owner 14.09.2026: „wir versprechen
                            etwas, was wir nicht halten können" · zum Satz, der sonst unter JEDEM
                            Bild automatisch stünde, auch unter Bildern, die wir nie gesehen
                            haben). Eine Einladung ist wahr für alle; ein Lob wäre bei jedem
                            Zweiten gelogen und fällt auf, sobald zwei Künstler sich vergleichen. */}
                        <p className="m-0 text-[15px] leading-[1.45] text-[#555]">
                          {lang === "ro" ? "Ne-ar plăcea să avem lucrări ca a ta în galeria noastră de pe lakatosbandi.com."
                            : lang === "de" ? "Wir hätten gern Werke wie deins in unserer Galerie auf lakatosbandi.com."
                            : "We'd love to have works like yours in our gallery on lakatosbandi.com."}
                          <span className="mt-1 block text-[12.5px] text-[#999]">
                            {lang === "ro" ? "Géza & Szidonia, fondatorii lakatosbandi.com"
                              : lang === "de" ? "Géza & Szidonia, Gründer von lakatosbandi.com"
                              : "Géza & Szidonia, founders of lakatosbandi.com"}
                          </span>
                        </p>
                      </div>
                    )}
                  </figure>
                ) : null;
              })()}
              {/* ── DIE BILDWAHL MIT DEN BILDERN SELBST (Owner 11.09.2026: „hier musst du die Bilder
                  zeigen"). Ein Tipp schickt denselben Text wie der Chip („Bild 2"), das Modell merkt
                  keinen Unterschied. */}
              {m.rolle === "agent" && i === verlauf.length - 1 && !busy && m.bilderWahl && !!m.vorschlaege?.length && (
                <div className="grid w-full max-w-[420px] grid-cols-2 gap-2 pt-1 sm:grid-cols-4">
                  {m.vorschlaege.map((v, n) => {
                    const bild = verlauf.slice(0, i).flatMap(x => x.fotos ?? [])[n];
                    return (
                      <button key={n} type="button" onClick={() => { setEingabe(""); void schicken(v); }}
                        className="overflow-hidden rounded-xl border-[1.5px] border-[#dfe4e9] bg-white text-left transition hover:border-[#111]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {bild ? <img src={bild} alt="" className="block aspect-square w-full object-cover" /> : null}
                        <span className="block px-2.5 py-1.5 text-[13.5px] font-semibold text-[#14181c]">{v}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {m.rolle === "agent" && i === verlauf.length - 1 && !busy && !!m.vorschlaege?.length && !m.vorschau && !m.bilderWahl && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {m.vorschlaege.map((v, n) => (
                    <span key={n} className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      /**
                       * ── ANTIPPEN HEISST WEITER (Owner 09.09.2026, mit Bild: „Klick heisst
                       * weiter") ────────────────────────────────────────────────────────────
                       *
                       * VORHER LEGTE EIN CHIP DEN SATZ NUR INS FELD, und man musste noch
                       * einmal auf Senden drücken. Meine Begründung war, dass man mehrere
                       * Antworten sammeln oder den Satz ändern kann — theoretisch richtig,
                       * praktisch eine Zumutung: Auf „Bist du einverstanden?" tippt man
                       * „Ja, einverstanden" an und erwartet, dass es weitergeht. Zwei
                       * Handgriffe für eine Zustimmung sind einer zu viel, und der zweite
                       * sieht aus, als hätte der erste nicht funktioniert — genau deshalb
                       * stand dasselbe vorher dreimal im Feld.
                       *
                       * WER MEHR SAGEN WILL, TIPPT. Das Feld bleibt für alles offen, was
                       * kein Chip trifft; die Chips sind die Führung für den, der schnell
                       * durch will ([[chat-no-personal-questions-buttons-only]]).
                       */
                      onClick={() => { setEingabe(""); void schicken(v, m.spruchWahl ? { nr: m.spruchWahl, spruch: v } : undefined); }}
                      /* DIE ZUSTIMMUNG SCHWARZ GEFÜLLT (Owner 11.09.2026), wie „Aplică ca artist" auf der Startseite —
                         der einzige Knopf unter der Startkarte, kein normaler Chip unter vielen. */
                      className={v === S.chipEinverstanden && m.vorschlaege?.length === 1
                        ? "rounded-full bg-[#111] px-4 py-2 text-[14.5px] font-semibold text-white transition hover:bg-[#333]"
                        : "rounded-full border-[1.5px] border-[#dfe4e9] bg-white px-3.5 py-2 text-[14.5px] font-semibold text-[#14181c] transition hover:border-[#111] hover:text-[#111]"}
                    >
                      {v}
                    </button>
                    {/* ✎ SPRUCH ÄNDERN (Owner 11.09.2026: „ich habe eins korrigiert, du weisst es nicht welches") —
                        der Spruch kommt ins Feld, und beim Senden weiss der Chat, welcher es war. */}
                    {!!m.spruchWahl && (
                      <button
                        type="button"
                        aria-label={S.spruchAendern}
                        title={S.spruchAendern}
                        onClick={() => {
                          setEingabe(v);
                          setSpruchAendern({ nr: m.spruchWahl as number });
                          setTimeout(() => feld.current?.focus(), 0);
                        }}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-[1.5px] border-[#dfe4e9] bg-white text-[15px] text-[#5b6670] transition hover:border-[#111] hover:text-[#111]"
                      >
                        ✎
                      </button>
                    )}
                    </span>
                  ))}
                </div>
              )}
              {/* ── DIE MINUTE UNTER DEM KNOPF (Owner 13.09.2026: „unter dem Button klein: Durează
                  aproximativ 1 minut.") ────────────────────────────────────────────────────────
                  Erst das Ja, dann die Beruhigung, wie wenig es kostet — deshalb NACH den Chips und
                  klein. Nur unter der Startkarte: später im Gespräch wäre der Satz falsch. */}
              {m.rolle === "agent" && i === verlauf.length - 1 && !busy && marke === "lakatosbandi"
                && m.text === gruss && !!m.vorschlaege?.length && (
                <p className="m-0 pl-1 text-[13px] text-[#8b959d]">
                  {S.startDauer}{" "}
                  {/* „Fără card. Fără abonament." (Owner 13.09.2026: „Sub buton, mic") — in derselben
                      Zeile wie die Minute: zwei kurze Beruhigungen, eine Zeile, kein Absatz. */}
                  <span className="font-semibold text-[#5b666f]">{S.startKeineKarte}</span>
                </p>
              )}
              {/**
                * ── „BILDER HOCHLADEN" ALS GROSSER KNOPF (Owner 10.09.2026, mit Bild: „er muss
                * erst mal finden, wo er hochladen kann") ─────────────────────────────────────
                *
                * Das Symbol unten links im Feld findet keiner, der zum ersten Mal hier ist. Bittet
                * der Agent um Bilder, steht der Weg direkt unter seiner Bitte — ein Tipp öffnet
                * die Auswahl. Chips gibt es dann keine (der Server lässt sie weg): Nichts soll
                * neben dem einen Schritt stehen, um den es gerade geht.
                */}
              {m.rolle === "agent" && i === verlauf.length - 1 && !busy && m.bilderBitte && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => datei.current?.click()}
                    className="inline-flex items-center gap-2 rounded-full bg-[#111] px-5 py-3 text-[15.5px] font-bold text-white transition hover:bg-[#333] active:scale-95"
                  >
                    <ImagePlus className="h-5 w-5" aria-hidden />
                    {S.bilderKnopf}
                  </button>
                  <p className="m-0 mt-1.5 pl-1 text-[13px] font-bold text-[#8b959d]">{S.bilderHoechstens}</p>
                </div>
              )}
              {/* ── „PASST DAS?" UNTER SEINEM BILD — feste Knöpfe. „Ja" öffnet die Karte mit Titel, Technik,
                  Größe, Jahr und Preis; erst „Weiter" schickt die Antwort. Kein Modell-Aufruf dazwischen. */}
              {/* ── „ANALIZEAZĂ ACUM" UNTER SEINEN BILDERN (Owner 13.09.2026) ──────────────── */}
              {m.rolle === "agent" && i === verlauf.length - 1 && !busy && m.analyse && (
                /**
                 * ── ANALYSE OHNE E-MAIL, PUBLIZIEREN NUR MIT (Owner 14.09.2026: „wir lassen sie
                 * ohne email die miniwebseite generieren" · „das risiko müssen wir angehen. Und
                 * wenn sie das publizieren wollen, dann email abfragen") ─────────────────────────
                 *
                 * DIE FRÜHE KARTE IST WEG. Bis heute Nachmittag stand hier „Es gibt kein Gratis
                 * mehr" — eine Karte mit Name, E-Mail und dem Rechte-Häkchen, gesperrt bis alle
                 * drei ausgefüllt waren. Der Owner hat das noch am selben Tag zurückgenommen: Wer
                 * nur sehen will, was aus seinem Bild wird, soll das sofort können.
                 *
                 * DIE ADRESSE WIRD NICHT VERGESSEN, NUR VERSCHOBEN: Der späte Schritt
                 * „Vrei să publicăm asta?" (weiter unten, `publizieren`/`behalten`) fragt schon
                 * seit dem 13.09.2026 nach Name und Mail, bevor eine Seite wirklich entsteht.
                 * Genau dort — beim Publizieren, nicht beim Ansehen — ist die Adresse nötig, nicht
                 * hier. Ebenso das Rechte-Häkchen: Es gehört zur Veröffentlichung, nicht zur
                 * Analyse, und steht jetzt dort (unten bei `kontaktDa`).
                 */
                <div className="pt-1">
                  {/* Die Aufforderung nur, wenn es wirklich etwas zu wählen gibt — bei einem
                      einzigen Werk wäre sie eine Frage ohne Antwortmöglichkeit. */}
                  {verlauf.flatMap(x => x.fotos ?? []).length > 1 && (
                    <p className="m-0 mb-2 text-[14px] font-semibold text-[#5b666f]">{S.werkWaehlen}</p>
                  )}
                  <button type="button" onClick={() => void analysieren()}
                    className="inline-flex items-center gap-2 rounded-full bg-[#111] px-5 py-3 text-[15.5px] font-bold text-white transition hover:bg-[#333] active:scale-95">
                    <Sparkles className="h-5 w-5 shrink-0" aria-hidden />
                    {S.analyseKnopf}
                  </button>
                </div>
              )}
              {/* ── „VREI SĂ PUBLICĂM ASTA?" UNTER DER VORSCHAU (Owner 13.09.2026) ─────────────
                  Sein Ja führt zur Adresse — oder, wenn er aus dem Sofortformular kommt, gleich
                  zum Abschluss, weil Name und Adresse dann schon vorliegen. */}
              {m.rolle === "agent" && i === verlauf.length - 1 && !busy && m.publizieren && (
                <div className="flex flex-col items-start gap-2 pt-1">
                  {/* DIE FRAGE UNMITTELBAR ÜBER DEN KNÖPFEN (Owner 13.09.2026: „Ja, Nein für was?") —
                      sonst antwortet er auf etwas, das er zuletzt vor einem Bildschirm voller Werk
                      gelesen hat. */}
                  <p className="m-0 max-w-[86%] rounded-2xl rounded-bl-md bg-[#f1f4f7] px-4 py-3 text-[16.5px] font-bold leading-[1.4] md:text-[17.5px]">
                    {S.publizierenFrage}
                  </p>
                  <div className="flex flex-wrap gap-2">
                  {/**
                    * ── BEIDE KNÖPFE ANTWORTEN IM BROWSER, NICHT AUF DEM SERVER ────────────────
                    *
                    * Sie gingen an die Agenten-Route, und die lief in ihre feste Abschlussmeldung:
                    * „pagina ta e online, iar linkurile sunt în e-mailul tău" — nach einem KLICK
                    * AUF NEIN (Owner 13.09.2026: „da ist jetzt falsch"). Angelegt war nichts,
                    * verschickt war nichts. Ein Trichter, der so etwas behauptet, ist an der
                    * Stelle wertlos, an der man ihm glauben müsste.
                    *
                    * „JA" FÜHRT VORERST ZUM KONTAKT-KASTEN — auch mit Kennung. Die Anlegelogik
                    * (Seite erzeugen, Behelfsadresse, Umzug, Löschen ohne Bestätigung) ist noch
                    * nicht gebaut; bis dahin ist das die einzige Fassung, die nichts verspricht,
                    * was nicht passiert. Sobald sie steht, überspringt die Kennung diesen Schritt.
                    */}
                  {/* ── „JA" LEGT NICHT MEHR SOFORT AN (Owner 14.09.2026: „ja soll gar nicht
                      gehen ohne") ──────────────────────────────────────────────────────────────
                      Wer Name und Adresse schon genannt hat, geht direkt durch. Alle anderen
                      bekommen zuerst die Karte — eine Seite ohne Besitzer entsteht nicht mehr. */}
                  {/* KEIN WEG AM BESTÄTIGEN VORBEI (Owner 14.09.2026: „und wenn er das nicht
                      bestätigt hat, dann dürfte doch gar keine seite angelegt werden") — auch
                      wer Name und Adresse schon genannt hat, sieht erst die Rückfrage. Vorher
                      legte dieser Knopf in dem Fall sofort an. */}
                  <button type="button"
                    onClick={() => { setEingabe(""); setDatenFragt(true); if (kontaktDa) setMailPruefen(true); }}
                    className="rounded-full bg-[#111] px-5 py-2.5 text-[15px] font-bold text-white transition hover:bg-[#333] active:scale-95">
                    {S.publizierenJa}
                  </button>
                  <button type="button"
                    onClick={() => {
                      setEingabe("");
                      /**
                        * ── ERSTES NEIN: NACHFRAGEN. ZWEITES NEIN: ENDE (Owner 13.09.2026:
                        * „beim zweiten Nein OK" · „Ende beim zweiten nein") ──────────────────
                        *
                        * Ein Nein kann dem SATZ gelten und nicht dem Angebot. Deshalb einmal
                        * nachfragen, ob er ihn anders geschrieben haben will — höchstens drei
                        * neue Sätze. Sagt er ein zweites Mal Nein, ist es sein Nein zur Sache;
                        * dann wird es angenommen, und es kommt nur noch die eine Frage, was ihn
                        * abgehalten hat.
                        */
                      /**
                       * DREI SÄTZE INSGESAMT (Owner 13.09.2026: „ein mal haben wir doch schon mit
                       * bild generiert. + 2 nein, sind es 3").
                       *
                       * Der erste Satz entstand mit dem Bild, dann kommen höchstens ZWEI neue.
                       * Das Ende hängt deshalb an der Zahl der geschriebenen Sätze, NICHT an der
                       * Zahl der Neins — sonst wäre nach dem zweiten Nein Schluss und er hätte nur
                       * zwei Sätze gesehen statt drei.
                       */
                      /* OHNE VORSCHAU GIBT ES NICHTS UMZUSCHREIBEN (15.09.2026): Seit das
                         Angebot ohne Analyse kommt, steht kein Satz da. „Soll ich einen anderen
                         schreiben?" wäre eine Frage nach etwas, das er nie gesehen hat. */
                      const zweitesNein = spruchVersuche >= 2 || !verlauf.some(x => x.vorschau);
                      setNeinZahl(n => n + 1);
                      if (!zweitesNein) {
                        setVerlauf(v => [...v,
                          { rolle: "mensch", text: S.publizierenNein },
                          { rolle: "agent", text: S.nochmalFrage, nochmal: true },
                        ]);
                        return;
                      }
                      setVerlauf(v => [...v,
                        { rolle: "mensch", text: S.publizierenNein },
                        { rolle: "agent", text: S.publizierenAbsage },
                      ]);
                      /* Sein Nein wird angenommen — und genau hier ist der Moment für die eine
                         Frage, die ihm noch etwas wert sein könnte. Der Kasten ist derselbe wie
                         unten; er legt ab, schickt dir eine Mail und kostet keinen Aufruf. */
                      setFeedbackNachNein(true);
                      setFeedbackText("");
                      setFeedbackStatus("");
                      setFeedbackOffen(true);
                    }}
                    className="rounded-full border-[1.5px] border-[#dfe4e9] bg-white px-3.5 py-2.5 text-[15px] font-semibold text-[#14181c] transition hover:border-[#111] hover:text-[#111]">
                    {S.publizierenNein}
                  </button>
                  </div>
                  {/* ── ERST DIE DATEN, DANN DIE SEITE (Owner 14.09.2026: „ja soll gar nicht gehen
                      ohne" · „soll error kommen" · „meldung") ────────────────────────────────────
                      Erscheint nach „Ja", wenn Name oder Adresse fehlen. Der Knopf legt an; ohne
                      gültige Angaben bleibt er gesperrt, und der Server weist zusätzlich ab. */}
                  {datenFragt && (
                    <div className="w-full max-w-[340px] rounded-2xl border border-[#dfe4e9] bg-white p-4">
                      {/* Die Felder nur, wenn wirklich etwas fehlt — wer sie schon genannt hat,
                          sieht gleich die Rückfrage darunter. */}
                      {!kontaktDa && (
                        <>
                      <p className="m-0 text-[14.5px] leading-[1.45] text-[#14181c]">{S.behaltenFrage}</p>
                      <label className="mt-3 block">
                        <span className="block text-[13px] font-bold text-[#5b666f]">{S.feldKuenstlername}</span>
                        <input value={kontakt.name} autoComplete="name"
                          onChange={e => { const w = e.target.value; setKontakt(k => ({ ...k, name: w })); }}
                          className="mt-1 block w-full rounded-xl border border-[#dfe4e9] px-3 py-2 text-[16px] outline-none focus:border-[#111]" />
                      </label>
                      <label className="mt-3 block">
                        <span className="block text-[13px] font-bold text-[#5b666f]">{S.feldEmail}</span>
                        <input type="email" inputMode="email" autoComplete="email" value={kontakt.mail}
                          onChange={e => { const w = e.target.value; setKontakt(k => ({ ...k, mail: w })); }}
                          className="mt-1 block w-full rounded-xl border border-[#dfe4e9] px-3 py-2 text-[16px] outline-none focus:border-[#111]" />
                      </label>
                        </>
                      )}
                      <label className="mt-3.5 flex cursor-pointer items-start gap-2 text-[12.5px] leading-[1.5] text-[#8b959d]">
                        <input type="checkbox" checked={rechte} onChange={e => setRechte(e.target.checked)} className="mt-0.5 shrink-0" />
                        <span>
                          {S.rechteHaekchen}{" "}
                          <a href="https://lakatosbandi.com/terms" target="_blank" rel="noopener"
                            className="underline underline-offset-2 hover:text-[#111]">{S.rechteAgb}</a>
                        </span>
                      </label>
                      {/* ── DIE ADRESSE WIRD BESTÄTIGT, BEVOR ETWAS ENTSTEHT (Owner 14.09.2026:
                          „fragen wir bevor wir etwas veröffentlichen noch mal, ist das email
                          korrekt? … Sonst kommst du nie in deinem profil rein") ────────────────
                          Ausgelöst von `oana_boboc@yahoo.c`: Seite angelegt, Post kam zurück,
                          Künstler unerreichbar. Jetzt steht die Adresse einmal gross da, bevor
                          der Knopf wirkt — dieselbe Sitte wie beim Behalten weiter unten. */}
                      {mailPruefen ? (
                        <div className="mt-3 rounded-xl border border-[#dfe4e9] bg-[#f8fafb] p-3">
                          <p className="m-0 text-[13px] font-bold text-[#5b666f]">{S.mailRichtigFrage}</p>
                          <p className="m-0 mt-1 break-all text-[16px] font-bold text-[#111]">{kontakt.mail.trim()}</p>
                          <p className="m-0 mt-1.5 text-[12.5px] leading-[1.45] text-[#8b959d]">{S.mailRichtigWarnung}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button type="button" onClick={() => { setMailPruefen(false); void anlegen(); }}
                              className="rounded-full bg-[#111] px-4 py-2 text-[14.5px] font-bold text-white transition hover:bg-[#333] active:scale-95">
                              {S.mailRichtigJa}
                            </button>
                            <button type="button" onClick={() => setMailPruefen(false)}
                              className="rounded-full border-[1.5px] border-[#dfe4e9] bg-white px-3.5 py-2 text-[14.5px] font-semibold text-[#14181c] transition hover:border-[#111] hover:text-[#111]">
                              {S.mailRichtigNein}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setMailPruefen(true)}
                          disabled={!rechte || !kontakt.name.trim() || !MAIL_MUSTER.test(kontakt.mail.trim())}
                          className="mt-3 w-full rounded-full bg-[#111] px-4 py-2.5 text-[15px] font-bold text-white transition hover:bg-[#333] active:scale-95 disabled:opacity-40">
                          {S.publizierenJa}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              {m.rolle === "agent" && i === verlauf.length - 1 && !busy && !!m.vorschau && !m.publizieren && !werkFormOffen && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button type="button"
                    onClick={() => {
                      /* KEINE WERK-KARTE MEHR IM CHAT (Owner 11.09.2026: „wir können nicht alles im Chat lösen. Wir sollen vorher
                         aufhören. Der Künstler soll seine Webseite pflegen, wie Preise"). Hier öffnete „Da, se potrivește" die Karte
                         mit Titel, Technik, Größe, Jahr und Preis — das trägt er jetzt auf „Seite bearbeiten" ein. */
                      setEingabe("");
                      void schicken(S.passtJa);
                    }}
                    className="rounded-full bg-[#111] px-4 py-2 text-[14.5px] font-bold text-white transition hover:bg-[#333] active:scale-95">
                    {S.passtJa}
                  </button>
                  <button type="button" onClick={() => { setEingabe(""); void schicken(S.passtNein); }}
                    className="rounded-full border-[1.5px] border-[#dfe4e9] bg-white px-3.5 py-2 text-[14.5px] font-semibold text-[#14181c] transition hover:border-[#111] hover:text-[#111]">
                    {S.passtNein}
                  </button>
                  {/* Nach „✎" hat der Agent seine Fassung verbessert — wer auf seinem Text besteht, nimmt ihn wörtlich. */}
                  {m.eigenerSpruch && m.eigenerSpruch.spruch !== m.vorschau?.spruch && (
                    <button type="button"
                      onClick={() => { const e = m.eigenerSpruch as { nr: number; spruch: string }; setEingabe(""); void schicken(e.spruch, e); }}
                      className="rounded-full border-[1.5px] border-[#dfe4e9] bg-white px-3.5 py-2 text-[14.5px] font-semibold text-[#14181c] transition hover:border-[#111] hover:text-[#111]">
                      {S.textMeiner}
                    </button>
                  )}
                </div>
              )}
              {m.rolle === "agent" && i === verlauf.length - 1 && !busy && !!m.vorschau && werkFormOffen && (
                <div className="w-full max-w-[340px] rounded-2xl border border-[#dfe4e9] bg-white p-4">
                  <p className="m-0 text-[15px] font-bold leading-[1.35]">{S.werkKarteTitel}</p>
                  {([
                    ["titel", S.feldTitel, S.beispielTitel],
                    ["technik", S.feldTechnik, S.beispielTechnik],
                    ["groesse", S.feldGroesse, S.beispielGroesse],
                    ["jahr", S.feldJahr, S.beispielJahr],
                    ["preis", S.feldPreis, S.beispielPreis],
                  ] as const).map(([feld, wort, beispiel]) => (
                    <label key={feld} className="mt-3 block">
                      <span className="block text-[13px] font-bold text-[#5b666f]">{wort}</span>
                      <input
                        value={werkInfo[feld]}
                        onChange={e => { const wert = e.target.value; setWerkInfo(w => ({ ...w, [feld]: wert })); }}
                        /* Leere Felder zeigen ein BEISPIEL, das auch so aussieht: „ex.: …", kursiv, blasser — nie wie ein Wert. */
                        placeholder={`${S.beispielVor} ${beispiel}`}
                        className="mt-1 block w-full rounded-xl border border-[#dfe4e9] px-3 py-2 text-[16px] outline-none placeholder:italic placeholder:text-[#b3bcc4] focus:border-[#111]"
                      />
                    </label>
                  ))}
                  <button type="button"
                    onClick={() => {
                      const zeilen = ([
                        [S.feldTitel, werkInfo.titel], [S.feldTechnik, werkInfo.technik], [S.feldGroesse, werkInfo.groesse],
                        [S.feldJahr, werkInfo.jahr], [S.feldPreis, werkInfo.preis],
                      ] as const).filter(([, wert]) => wert.trim()).map(([wort, wert]) => `${wort}: ${wert.trim()}`);
                      setWerkFormOffen(false);
                      setEingabe("");
                      void schicken([S.passtJa, ...zeilen].join("\n"));
                    }}
                    className="mt-4 w-full rounded-full bg-[#111] px-4 py-2.5 text-[15px] font-bold text-white transition hover:bg-[#333] active:scale-95">
                    {S.werkWeiter}
                  </button>
                </div>
              )}
              {/* ── KÜNSTLERNAME UND E-MAIL IN ZWEI FELDERN (Owner 11.09.2026: „am besten zwei Eingabefelder").
                  „Senden" schickt beides als eine Antwort — mit der Adresse darin darf der Server abschliessen. */}
              {m.rolle === "agent" && i === verlauf.length - 1 && !busy && m.kontaktFrage && (
                <div className="w-full max-w-[340px] rounded-2xl border border-[#dfe4e9] bg-white p-4">
                  <label className="block">
                    <span className="block text-[13px] font-bold text-[#5b666f]">{S.feldKuenstlername}</span>
                    <input value={kontakt.name} onChange={e => { const w = e.target.value; setKontakt(k => ({ ...k, name: w })); }}
                      autoComplete="name"
                      className="mt-1 block w-full rounded-xl border border-[#dfe4e9] px-3 py-2 text-[16px] outline-none focus:border-[#111]" />
                  </label>
                  <label className="mt-3 block">
                    <span className="block text-[13px] font-bold text-[#5b666f]">{S.feldEmail}</span>
                    <input type="email" inputMode="email" autoComplete="email" value={kontakt.mail}
                      onChange={e => { const w = e.target.value; setKontakt(k => ({ ...k, mail: w })); }}
                      className="mt-1 block w-full rounded-xl border border-[#dfe4e9] px-3 py-2 text-[16px] outline-none focus:border-[#111]" />
                  </label>
                  {/* ── DER PREIS IST AUS DEM TRICHTER RAUS (Owner 13.09.2026: „bei uns muss er ein
                      Bild mindestens hoch laden dann webseite generieren") ──────────────────────────
                      Hier stand ein Feld „Was verlangst du für deine Werke?". Jede Zeile im Trichter
                      kostet Abschlüsse, und diese war freiwillig — er trägt den Preis auf seiner
                      Seite ein, wo ihn nichts mehr abbricht (`preisSpanne` in PortalBearbeiten). */}
                  {/* ── DAS HÄKCHEN STEHT JETZT AN DER STARTKARTE (Owner 13.09.2026) ───────────────
                      Es hing hier, zusammen mit Name und E-Mail. Für die Leute aus dem Facebook-
                      Sofortformular entfällt dieser Kasten — das Häkchen wäre mit ihm verschwunden.
                      Jetzt bestätigt er die Rechte dort, wo er die Bilder übergibt.
                      DIE SPERRE UNTEN BLEIBT: Sie liest dieselbe Zustimmung (`rechte`), die dann
                      längst gesetzt ist — und greift weiter, falls jemand doch ohne hierher kommt. */}
                  <button type="button"
                    disabled={!rechte || !kontakt.name.trim() || !MAIL_MUSTER.test(kontakt.mail.trim())}
                    onClick={() => { setEingabe(""); void schicken([`${S.feldKuenstlername}: ${kontakt.name.trim()}`, `${S.feldEmail}: ${kontakt.mail.trim()}`].join("\n")); }}
                    className="mt-4 w-full rounded-full bg-[#111] px-4 py-2.5 text-[15px] font-bold text-white transition hover:bg-[#333] active:scale-95 disabled:opacity-40">
                    {S.kontaktSenden}
                  </button>
                </div>
              )}
              {/* ── „SOLL ICH ES ANDERS SCHREIBEN?" — nach dem ersten Nein (Owner 13.09.2026) ── */}
              {m.rolle === "agent" && i === verlauf.length - 1 && !busy && m.nochmal && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button type="button"
                    onClick={() => { setEingabe(""); setSpruchVersuche(n => n + 1); void analysieren(); }}
                    className="inline-flex items-center gap-2 rounded-full bg-[#111] px-5 py-2.5 text-[15px] font-bold text-white transition hover:bg-[#333] active:scale-95">
                    <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
                    {S.neuGenerieren}
                  </button>
                  <button type="button"
                    onClick={() => {
                      setEingabe("");
                      setNeinZahl(n => n + 1);
                      setVerlauf(v => [...v,
                        { rolle: "mensch", text: S.publizierenNein },
                        { rolle: "agent", text: S.publizierenAbsage },
                      ]);
                      setFeedbackNachNein(true);
                      setFeedbackText("");
                      setFeedbackStatus("");
                      setFeedbackOffen(true);
                    }}
                    className="rounded-full border-[1.5px] border-[#dfe4e9] bg-white px-3.5 py-2.5 text-[15px] font-semibold text-[#14181c] transition hover:border-[#111] hover:text-[#111]">
                    {S.publizierenNein}
                  </button>
                </div>
              )}
              {/* ── SEINE FERTIGE SEITE UND DIE ZWEI FELDER, MIT DENEN ER SIE BEHÄLT ───────────
                  (Owner 13.09.2026) Die Seite existiert bereits — er kann sie öffnen, bevor er
                  irgendetwas von sich preisgibt. Darunter Name und Adresse; ohne sie wird sie
                  wieder gelöscht, und genau das steht auch da. */}
              {m.rolle === "agent" && i === verlauf.length - 1 && !busy && m.seiteFertig && seite && (
                <div className="w-full max-w-[340px] rounded-2xl border border-[#dfe4e9] bg-white p-4">
                  <a href={seite.url} target="_blank" rel="noopener"
                    className="mb-3 block rounded-full bg-[#1d6fd0] px-4 py-2.5 text-center text-[15px] font-bold text-white no-underline transition hover:bg-[#1a5fb4]">
                    {S.seiteAnsehen}
                  </a>
                  {/**
                   * ── HIER, NICHT VOR DER ANALYSE (Owner 14.09.2026: „wir lassen sie ohne email
                   * die miniwebseite generieren … wenn sie das publizieren wollen, dann email
                   * abfragen") — Name und Mail werden erst HIER zur Pflicht, beim Behalten der
                   * Seite, nicht beim blossen Ansehen der Analyse. Wer schon aus dem Mail-Link
                   * kam (`kontaktDa`), sieht die Felder nicht noch einmal — aber das Häkchen
                   * bleibt für alle Pflicht, das ist keine Adressfrage, sondern eine Rechtsfrage.
                   */}
                  {!kontaktDa && (
                    <>
                      <label className="block">
                        <span className="block text-[13px] font-bold text-[#5b666f]">{S.feldKuenstlername}</span>
                        <input value={kontakt.name} autoComplete="name"
                          onChange={e => { const w = e.target.value; setKontakt(k => ({ ...k, name: w })); }}
                          className="mt-1 block w-full rounded-xl border border-[#dfe4e9] px-3 py-2 text-[16px] outline-none focus:border-[#111]" />
                      </label>
                      <label className="mt-3 block">
                        <span className="block text-[13px] font-bold text-[#5b666f]">{S.feldEmail}</span>
                        <input type="email" inputMode="email" autoComplete="email" value={kontakt.mail}
                          onChange={e => { const w = e.target.value; setKontakt(k => ({ ...k, mail: w })); }}
                          className="mt-1 block w-full rounded-xl border border-[#dfe4e9] px-3 py-2 text-[16px] outline-none focus:border-[#111]" />
                      </label>
                    </>
                  )}
                  {/* ── DAS RECHTE-HÄKCHEN, JETZT HIER BEIM PUBLIZIEREN (nicht mehr vor der
                      Analyse) — Owner 12.09.2026: „Es muss ein Häckchen noch … Die Bilder gehören
                      mir und ich hafte für die Veröffentlichung ganz". Gilt für ALLE, auch wer
                      schon Name/Mail über den Mail-Link mitbrachte. */}
                  <label className="mt-3 flex cursor-pointer items-start gap-2 text-[12.5px] leading-[1.5] text-[#8b959d]">
                    <input type="checkbox" checked={rechte} onChange={e => setRechte(e.target.checked)} className="mt-0.5 shrink-0" />
                    <span>
                      {S.rechteHaekchen}{" "}
                      <a href="https://lakatosbandi.com/terms" target="_blank" rel="noopener"
                        className="underline underline-offset-2 hover:text-[#111]">{S.rechteAgb}</a>
                    </span>
                  </label>
                  {behaltenStatus === "fehler" && (
                    <p className="m-0 mt-2 text-[13.5px] font-bold text-[#c02626]">{S.behaltenFehler}</p>
                  )}
                  {/* ── ERST DIE ADRESSE ZEIGEN, DANN SENDEN (Owner 13.09.2026) ─────────────
                      Der Knopf schickt nicht mehr sofort: Er klappt die Rückfrage auf, in der
                      seine eigene Adresse gross dasteht. */}
                  {mailPruefen ? (
                    <div className="mt-4 rounded-xl border border-[#dfe4e9] bg-[#f8fafb] p-3">
                      <p className="m-0 text-[13px] font-bold text-[#5b666f]">{S.mailRichtigFrage}</p>
                      <p className="m-0 mt-1 break-all text-[16px] font-bold text-[#111]">{kontakt.mail.trim()}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button"
                          onClick={() => { setMailPruefen(false); void behalten(); }}
                          disabled={behaltenStatus === "sende"}
                          className="rounded-full bg-[#111] px-4 py-2 text-[14.5px] font-bold text-white transition hover:bg-[#333] active:scale-95 disabled:opacity-40">
                          {S.mailRichtigJa}
                        </button>
                        <button type="button"
                          onClick={() => setMailPruefen(false)}
                          className="rounded-full border-[1.5px] border-[#dfe4e9] bg-white px-3.5 py-2 text-[14.5px] font-semibold text-[#14181c] transition hover:border-[#111] hover:text-[#111]">
                          {S.mailRichtigNein}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button"
                      /* Liegen die Daten vor, entfällt auch die Adress-Rückfrage: Er hat sie
                         vorhin selbst eingetippt und gesehen. Ein Klick, fertig. */
                      onClick={() => { setBehaltenStatus(""); if (kontaktDa) { void behalten(); } else { setMailPruefen(true); } }}
                      disabled={behaltenStatus === "sende" || !rechte || !kontakt.name.trim() || !MAIL_MUSTER.test(kontakt.mail.trim())}
                      className="mt-4 w-full rounded-full bg-[#111] px-4 py-2.5 text-[15px] font-bold text-white transition hover:bg-[#333] active:scale-95 disabled:opacity-40">
                      {S.behaltenKnopf}
                    </button>
                  )}
                  <p className="m-0 mt-2 text-[12.5px] leading-[1.5] text-[#8b959d]">{S.behaltenHinweis}</p>
                </div>
              )}
              {/* Bestätigt: der Link zeigt jetzt auf seine eigene Adresse. */}
              {m.rolle === "agent" && i === verlauf.length - 1 && !busy && m.behalten && seite && (
                <a href={seite.url} target="_blank" rel="noopener"
                  className="rounded-full bg-[#1d6fd0] px-5 py-2.5 text-[15px] font-bold text-white no-underline transition hover:bg-[#1a5fb4]">
                  {S.seiteAnsehen}
                </a>
              )}
              {/* ── „WILLST DU NOCH BIS ZU N BILDER HOCHLADEN?" — Ja öffnet die Auswahl, Nein geht weiter. */}
              {m.rolle === "agent" && i === verlauf.length - 1 && !busy && !!m.mehrBilder && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button type="button" onClick={() => datei.current?.click()}
                    className="inline-flex items-center gap-2 rounded-full bg-[#111] px-4 py-2 text-[14.5px] font-bold text-white transition hover:bg-[#333] active:scale-95">
                    <ImagePlus className="h-4 w-4" aria-hidden />
                    {S.mehrBilderJa}
                  </button>
                  {/* ── „NEIN" OHNE SERVERLAUF (Owner 12.09.2026: „nein kann auch sein" · „hier soll
                      nicht rechnen") ────────────────────────────────────────────────────────────
                      Vorher schickte dieser Knopf das Wort „Nein" an den Server, der dafür das
                      Modell befragte — 20 Sekunden für eine Antwort, die immer dieselbe ist. Jetzt
                      hängt der Browser die letzte Karte selbst an: Preis, Künstlername, E-Mail. */}
                  <button type="button"
                    onClick={() => { setEingabe(""); setVerlauf(v => [...v, { rolle: "agent", text: S.jetztDaten, kontaktFrage: true }]); }}
                    className="rounded-full border-[1.5px] border-[#dfe4e9] bg-white px-3.5 py-2 text-[14.5px] font-semibold text-[#14181c] transition hover:border-[#111] hover:text-[#111]">
                    {S.mehrBilderNein}
                  </button>
                </div>
              )}
              {/* ── „WILLST DU ALLES LÖSCHEN?" — Ja leert den Chat ohne Modell, Nein geht als Antwort hinaus. */}
              {m.rolle === "agent" && i === verlauf.length - 1 && !busy && m.loeschFrage && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button type="button" onClick={() => neuAnfangen(true)}
                    className="rounded-full border-[1.5px] border-[#dfe4e9] bg-white px-3.5 py-2 text-[14.5px] font-semibold text-[#14181c] transition hover:border-[#c02626] hover:text-[#c02626]">
                    {S.loeschenJa}
                  </button>
                  <button type="button" onClick={() => { setEingabe(""); void schicken(S.loeschenNein); }}
                    className="rounded-full border-[1.5px] border-[#dfe4e9] bg-white px-3.5 py-2 text-[14.5px] font-semibold text-[#14181c] transition hover:border-[#111] hover:text-[#111]">
                    {S.loeschenNein}
                  </button>
                </div>
              )}
              {/**
                * ── DIE AUFFORDERUNG UNTER DEN CHIPS (Owner 10.09.2026) ─────────────────────
                *
                * „Da fehlt ein Zwischenschritt, eine Aufforderung. Was soll er machen?" Sie
                * stand im Userflow und nie im Chat — bis er fragte, ob wir sie nicht längst
                * eingebaut hätten.
                *
                * NICHT UNTER „JA, EINVERSTANDEN": Eine Zustimmung schreibt man nicht mit
                * eigenen Worten. Dort wäre der Satz eine Einladung, etwas anderes zu tun als
                * zuzustimmen.
                */}
              {m.rolle === "agent" && i === verlauf.length - 1 && !busy && !!m.vorschlaege?.length
                && !(m.vorschlaege.length === 1 && m.vorschlaege[0] === S.chipEinverstanden) && !m.vorschau && (
                <p className="m-0 pl-1 text-[13.5px] font-bold text-[#8b959d]">{S.chipsHinweis}</p>
              )}

              {/* ── DER BEWEIS: was er benutzt hat, ohne dass jemand es verlangt hat ── */}
              {/* Nur Werkzeuge mit Wort — ein interner Name („abschluss_schicken") steht nie im Chat. */}
              {!!m.benutzt?.some(b => WERKZEUG_WORT[b]) && (
                <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 pl-1 text-[13.5px] font-bold text-[#8b959d]">
                  <Wrench className="h-3.5 w-3.5" aria-hidden />
                  {[...new Set(m.benutzt.map(b => WERKZEUG_WORT[b]).filter(Boolean))].join(" · ")}
                </p>
              )}

              {/**
                * ── HIER STANDEN DIE VIER KACHELN DER VORFÜHRUNG (Owner 09.09.2026: „die
                * Bilder sind zu klein und am besten raus. Text reicht") ────────────────────
                *
                * ZWEI GRÜNDE, UND BEIDE STIMMEN. Erstens die Grösse: Vier Bilder untereinander
                * mussten schmal sein, damit sie das Gespräch nicht verdrängen — und schmal
                * heisst hier unlesbar. Ein Beweis, den man zusammenkneifen muss, ist keiner.
                * Zweitens der Ort: Der Stein ist die ANZEIGE geworden („ich habe das erledigt,
                * indem ich damit werben werde"). Wer aus ihr kommt, hat ihn gerade gesehen.
                *
                * DER TEXT BLEIBT. Die Vorführung in Worten kostet keine Fläche und liest sich
                * im Chat so, wie ein Mensch sie erzählen würde.
                */}

              {/* Das Bild steht IM Gespräch, nicht auf einer Seite danach. */}
              {m.bild && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.bild} alt={S.bildAlt}
                  className="block w-full max-w-[280px] shadow-[0_6px_22px_rgba(20,24,28,.16)]"
                  style={{ aspectRatio: "1080 / 1350" }} />
              )}
            </div>
          ))}

          {busy && (
            <div className="flex justify-start">
              <p className="m-0 flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-[#f1f4f7] px-4 py-4">
                {[0, 1, 2].map(i => (
                  <span key={i} className="lb-tippt h-2 w-2 rounded-full bg-[#8b959d]"
                    style={{ animationDelay: `${i * 0.16}s` }} />
                ))}
              </p>
            </div>
          )}
          <div ref={ende} />
          </div>
        </div>

        {fehler && <p className="m-0 pb-2 text-[15px] font-bold text-[#c02626]">{fehler}</p>}

        {/**
          * ── HIER STANDEN DATENSCHUTZ UND IMPRESSUM (Owner 09.09.2026: „bitte die zwei raus,
          * wir haben die nicht gemacht … ich brauche stattdessen Chat-Reset") ───────────────
          *
          * SIE ZEIGTEN AUF DIE SEITEN DES HAUSES, nicht auf welche von VersusForge — auf
          * Rumänisch stand darunter „Confidențialitate", und dahinter lag eine Seite, die es
          * so nicht gibt. Ein Link, der ein Dokument verspricht, das niemand geschrieben hat,
          * ist schlechter als kein Link.
          *
          * WANN SIE ZURÜCK MÜSSEN, und das ist keine Formalie: Sobald dieser Agent eine
          * E-Mail-Adresse entgegennimmt und eine Anzeige darauf läuft. Der Datenschutzsatz im
          * Gruss kündigt genau das an. Bis dahin sammelt das Muster nichts.
          */}

        {/**
          * NEU ANFANGEN — ZWEI TIPPS, ROT ([[loeschen-zwei-tipps-rot]]).
          *
          * Der erste Tipp fragt, der zweite räumt ab, nach drei Sekunden ist die Frage von
          * selbst wieder weg. Kein Bestätigungsfenster ([[keine-overlay-dialoge]]).
          *
          * ER STEHT UNTER DEM FELD, klein und grau: Er wird selten gebraucht und darf mit dem
          * Sendeknopf nicht um Aufmerksamkeit streiten.
          */}
        {/* NICHT BEI DER SPRACHFRAGE: Dort gibt es nichts zurückzusetzen, und ein Knopf, der
            nichts tut, macht den ersten Schirm unruhig. */}
        <p className="m-0 flex items-center pb-1">
          <button
            type="button"
            hidden={verlauf[verlauf.length - 1]?.sprachfrage === true}
            onClick={() => neuAnfangen()}
            disabled={busy}
            className={`rounded-full px-2 py-0.5 text-[13.5px] font-bold underline transition disabled:opacity-30 ${
              resetFragt ? "text-[#c02626]" : "text-[#8b959d] hover:text-[#14181c]"}`}
          >
            {resetFragt ? S.loeschenBestaetigen : S.loeschen}
          </button>
          {/* FEEDBACK JEDERZEIT (Owner 10.09.2026) — klein und grau wie „Alles löschen". */}
          <button
            type="button"
            onClick={() => { setFeedbackOffen(o => !o); setFeedbackStatus(""); setFeedbackNachNein(false); }}
            className="rounded-full px-2 py-0.5 text-[13.5px] font-bold text-[#8b959d] underline transition hover:text-[#14181c]"
          >
            {S.feedbackLink}
          </button>
        </p>
        {feedbackOffen && (
          <div className="relative mb-2 rounded-2xl border border-[#dfe4e9] bg-white p-3 pt-9">
            {/* Owner 11.09.2026: „wie schliesse ich das Feedback-Fenster?" */}
            <button
              type="button"
              aria-label={S.feedbackSchliessen}
              title={S.feedbackSchliessen}
              onClick={() => { setFeedbackOffen(false); setFeedbackText(""); setFeedbackStatus(""); setFeedbackNachNein(false); }}
              className="absolute right-2 top-1.5 grid h-7 w-7 place-items-center rounded-full text-[20px] leading-none text-[#8b959d] transition hover:bg-[#f1f3f5] hover:text-[#14181c]"
            >
              ×
            </button>
            {feedbackStatus === "danke" ? (
              <p className="m-0 text-[14.5px] font-bold text-[#111]">{S.feedbackDanke}</p>
            ) : (
              <>
                <textarea
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  /* Nach einem „Nein" die Frage, die dann zählt — sonst die allgemeine
                     (Owner 13.09.2026). Derselbe Kasten, zwei Anlässe. */
                  placeholder={feedbackNachNein ? S.absageFrage : S.feedbackPlatzhalter}
                  className="block w-full resize-none rounded-xl border border-[#dfe4e9] px-3 py-2 text-[16px] leading-[1.45] outline-none focus:border-[#111]"
                />
                {feedbackStatus === "fehler" && (
                  <p className="m-0 mt-1.5 text-[13.5px] font-bold text-[#c02626]">{S.feedbackFehler}</p>
                )}
                <button
                  type="button"
                  onClick={() => void feedbackSenden()}
                  disabled={feedbackStatus === "sende" || feedbackText.trim().length < 2}
                  className="mt-2 rounded-full bg-[#111] px-4 py-2 text-[14.5px] font-bold text-white transition hover:bg-[#333] disabled:opacity-40"
                >
                  {S.feedbackSenden}
                </button>
              </>
            )}
          </div>
        )}

        {/**
          * ── EINE BOX, KNÖPFE INNEN (Owner 09.09.2026, mit Bild von ChatGPT: „ChatGPT löst
          * es so") ──────────────────────────────────────────────────────────────────────────
          *
          * VORHER STANDEN DREI DINGE NEBENEINANDER: Feld, Mikrofon, Senden — jedes mit
          * eigenem Rahmen, alle gleich gross. Das las sich wie drei gleichwertige Wege, und
          * das Feld, das der eigentliche Weg ist, war das schmalste davon.
          *
          * JETZT IST ES EINE FLÄCHE: oben schreibt man, unten rechts stehen die zwei Knöpfe
          * darin. Das Feld bekommt die ganze Breite, und wenn es wächst, wächst die Box mit —
          * die Knöpfe bleiben, wo sie sind.
          *
          * DER RAHMEN LEUCHTET BEIM SCHREIBEN (`focus-within`): Vorher tat das nur das Feld
          * selbst; sitzt es ohne eigenen Rand in der Box, muss die Box es zeigen. Sonst sieht
          * man nicht, ob man gerade tippt oder nicht.
          */}
        {/* PLATZ FÜR DEN COOKIE-STREIFEN (Owner 13.09.2026: „das verdeckt das Eingabefeld").
            Er liegt fest am unteren Rand und über allem; solange er da ist, rückt das Feld darüber.
            KEIN Tailwind-Vorfahrenselektor: Diese Schreibweise wird in 3.4 nicht verlässlich
            erzeugt und kommt im Projekt sonst nirgends vor — sie hätte behoben ausgesehen, ohne es
            zu sein. Stattdessen derselbe Zustand, den der Streifen selbst liest. */}
        {/* ── KEIN EINGABEFELD IM GANZEN KUNST-TRICHTER (Owner 14.09.2026: „auch hier braucht
            man die Eingabe nicht" · „die Leute wollen nicht schreiben" · „upload geht über das
            Chat-Fenster" · „ja, es ist unnötig") ─────────────────────────────────────────────
            Stand zuerst nur auf der Startkarte weg, dann auf „Analizează acum" auch noch da —
            der ganze Weg läuft über Knöpfe und die Bilder-Kacheln (das „+"-Feld), nie über
            freien Text. Gilt für die GANZE Marke `lakatosbandi`, nicht nur den ersten Zug. */}
        <div className={`sticky bottom-0 shrink-0 bg-white pt-2 ${cookieOffen ? "pb-[76px]" : "pb-3"} ${fertig || marke === "lakatosbandi" ? "hidden" : ""}`}>
          <div className="rounded-[24px] border-[1.5px] border-[#dfe4e9] bg-white px-4 pb-2 pt-3 transition focus-within:border-[#111]">
            <textarea
              ref={feld}
              rows={1}
              value={eingabe}
              onChange={e => { setEingabe(e.target.value); setResetFragt(false); }}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void schicken(); } }}
              placeholder={S.platzhalter}
              /* KEIN EIGENER RAHMEN UND KEINE POLSTERUNG MEHR: beides gehört jetzt der Box.
                 `min-h` ist eine Zeile, den Rest rechnet der Effekt oben. */
              className="block max-h-[160px] min-h-[26px] w-full resize-none border-none bg-transparent p-0 text-[16px] leading-[1.45] text-[#14181c] placeholder:text-[#8b959d] outline-none"
            />
            {/**
            * SEIN FOTO, BEVOR ES ABGESCHICKT WIRD (09.09.2026).
            *
            * ES STEHT SICHTBAR IN DER BOX, nicht als Dateiname irgendwo: Wer ein Bild
            * anhängt, will sehen, WELCHES — und es wieder loswerden können, ohne die Seite
            * neu zu laden. Deshalb daneben ein Kreuz, kein Menü.
            */}
            {bildHinweis && (
              <p className="mb-1.5 text-[13px] font-bold text-[#8b959d]">{bildHinweis}</p>
            )}
            {fotos.length > 0 && (
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {fotos.map((f, i) => (
                  <div key={i} className="flex items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f} alt="" className="h-14 w-14 rounded-xl object-cover" />
                    <button
                      type="button"
                      onClick={() => { setFotos(v => v.filter((_, j) => j !== i)); if (datei.current) datei.current.value = ""; }}
                      aria-label={S.fotoWeg}
                      className="grid h-8 w-8 place-items-center rounded-full text-[#5b666f] transition hover:bg-[#f1f4f7] hover:text-[#14181c]"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            )}

          <div className="mt-1.5 flex items-center justify-end gap-1">
            {/**
              * DIE KLAMMER LINKS, WIE ÜBERALL (Owner 09.09.2026: „auch nicht nach Bildern,
              * die er eventuell hochladen kann").
              *
              * SIE STEHT LINKS UND DIE SENDE-KNÖPFE RECHTS — dieselbe Ordnung wie in jedem
              * Chat: links, was man HINZUFÜGT, rechts, was man ABSCHICKT.
              */}
            <input
              ref={datei}
              type="file"
              accept="image/*"
              /* WIEDER MEHRERE (Owner 14.09.2026): Bis zu zehn Werke für die Seite — analysiert
                 wird weiterhin genau eines, siehe `WERKE_TRICHTER`. */
              multiple
              hidden
              onChange={e => void fotoWaehlen(e.target.files)}
            />
            {/* Der zweite Eingang: Nachlegen in die Galerie, OHNE eine Nachricht zu senden
                (Begründung an `nachlegen` oben). */}
            <input
              ref={nachlegenDatei}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={e => void nachlegen(e.target.files)}
            />
            <button
              type="button"
              onClick={() => datei.current?.click()}
              disabled={busy}
              aria-label={S.fotoWaehlen}
              className="mr-auto grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#5b666f] transition hover:bg-[#f1f4f7] hover:text-[#14181c] disabled:opacity-30"
            >
              <ImagePlus className="h-5 w-5" aria-hidden />
            </button>
              {/* SPRACHE (Owner 09.09.2026: „ich kann es mit Sprache steuern"). Der erkannte
                  Text landet IM FELD, nicht direkt im Gespräch — Begründung in
                  components/SprachKnopf.tsx.

                  DIE ERKENNUNG HÖRT IN SEINER SPRACHE ZU: Ohne `lang` verhört sich die
                  Abschrift bei kurzen Sätzen reihenweise — „Hallo" ist in sechs Sprachen
                  dasselbe Wort. */}
              <SprachKnopf
                lang={lang}
                aus={busy}
                schlicht
                fertig={t => setEingabe(v => (v ? `${v} ${t}` : t))}
              />
              <button
                type="button"
                onClick={() => void schicken()}
                /* NUR BILDER IST AUCH EINE ANTWORT (Owner 10.09.2026: „sonst ist der Pfeil nach oben
                   nicht aktiv") — `schicken` setzt dafür den Satz `nurBilder` ein. */
                disabled={busy || (!eingabe.trim() && !fotos.length)}
                aria-label={S.senden}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#111] text-white transition active:scale-95 disabled:opacity-30"
              >
                <ArrowUp className="h-5 w-5" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
