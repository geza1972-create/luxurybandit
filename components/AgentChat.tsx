"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Wrench, ImagePlus, X } from "lucide-react";
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

export default function AgentChat({ S: SQuelle, lang, gewaehlt, auftrag, fenster = false, start = "/engine/agent", marke = "versusforge" }: {
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
  const grussPortal = [S.startVorher, S.startNachher, S.startFrage, S.startText].join("\n\n");
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
      ? [{ rolle: "agent", text: gruss, vorschlaege: [S.chipEinverstanden] }]
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
  const [fotos, setFotos] = useState<string[]>([]);
  /* Was der Agent in seinen Bildern gesehen hat — klein, als Text, bei jeder Nachricht zurück
     an den Server. Daran zählt der Server die Aufnahme. */
  const [werke, setWerke] = useState<unknown[]>([]);
  /* Das Bild, zu dem er den Spruch gewählt hat — geht beim Abschluss mit, damit seine Seite es zeigt. */
  const [werkWahl, setWerkWahl] = useState<{ nr: number; bild: string } | null>(null);
  /* „Ich nehme die ersten 4 Bilder." — sichtbar statt still abgeschnitten. */
  const [bildHinweis, setBildHinweis] = useState("");
  /* Die Frage nach weiteren Bildern kommt nur EINMAL im Gespräch (Owner 10.09.2026). */
  const [bilderFrageGestellt, setBilderFrageGestellt] = useState(false);
  /* Die Karte „Titel · Technik · Größe · Jahr · Preis" nach „Passt das? — Ja" (Owner 10.09.2026). */
  const [werkFormOffen, setWerkFormOffen] = useState(false);
  const [werkInfo, setWerkInfo] = useState({ titel: "", technik: "", groesse: "", jahr: "", preis: "" });
  /* Feedback jederzeit (Owner 10.09.2026: „damit wir lernen"). */
  /* Die zwei Felder am Ende: Künstlername und E-Mail. */
  const [kontakt, setKontakt] = useState({ name: "", mail: "" });
  const [feedbackOffen, setFeedbackOffen] = useState(false);
  /* Er ändert einen Spruch über „✎" (Owner 11.09.2026: „ich habe eins korrigiert, du weisst es nicht welches").
     Solange gesetzt, geht das Feld als „dieser Spruch für Bild nr" hinaus — der Server zeigt ihn sofort. */
  const [spruchAendern, setSpruchAendern] = useState<{ nr: number } | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"" | "sende" | "danke" | "fehler">("");

  useEffect(() => { ende.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [verlauf.length, busy]);

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
      ? [{ rolle: "agent", text: gruss, vorschlaege: [S.chipEinverstanden] }]
      : v));
  }, [gewaehlt, gruss, S.chipEinverstanden]);

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
    router.replace(`${start}?lang=${l}`);
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
    setBilderFrageGestellt(rest.some(x => !!x.mehrBilder));
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
    setBilderFrageGestellt(false);
    setWerkFormOffen(false);
    setWerkInfo({ titel: "", technik: "", groesse: "", jahr: "", preis: "" });
    /* IM FENSTER BLEIBT DIE SEITE STEHEN: Die Sprache hat die Seite schon gewählt — zurück zum Gruss. */
    if (fenster) {
      setVerlauf([{ rolle: "agent", text: gruss, vorschlaege: [S.chipEinverstanden] }]);
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
  /** Bilder einlesen, auf 1080 Pixel Breite bringen, als JPEG anhängen — höchstens vier. */
  const fotoWaehlen = async (dateien: FileList | null | undefined) => {
    const liste = Array.from(dateien ?? []).filter(f => f.type.startsWith("image/"));
    setBildHinweis(liste.length + fotos.length > 4 ? S.bilderErste4 : "");
    for (const f of liste) {
      try {
        const bitmap = await createImageBitmap(f);
        const breit = Math.min(1080, bitmap.width);
        const hoch = Math.round((bitmap.height / bitmap.width) * breit);
        const flaeche = document.createElement("canvas");
        flaeche.width = breit; flaeche.height = hoch;
        flaeche.getContext("2d")?.drawImage(bitmap, 0, 0, breit, hoch);
        const bild = flaeche.toDataURL("image/jpeg", 0.85);
        setFotos(v => [...v, bild].slice(0, 4));
      } catch {
        /* Ein Bild, das der Browser nicht öffnen kann, wird still übergangen — eine
           Fehlermeldung über ein HEIC-Format hilft niemandem weiter. */
      }
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
          werke,
          /* Sein gewähltes Bild reist mit, sobald es feststeht — beim Abschluss wird es gespeichert. */
          /* Beim Abschluss werden ALLE seine Bilder gespeichert (bis zu 4) — das gewählte trägt seinen
             Spruch, für die übrigen schreibt der Server die Sprüche (Owner 10.09.2026). */
          ...(werkWahl ? { werkNr: werkWahl.nr, werkBilder: naechster.flatMap(x => x.fotos ?? []).slice(0, 4) } : {}),
          ...(bilderFrageGestellt ? { bilderFrageGestellt: true } : {}),
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
      if (mehr) setBilderFrageGestellt(true);
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
            /* Auf lakatosbandi.com das Logo des Portals (Owner 11.09.2026: „und oben steht VersusForge"). */
            <span className="text-[22px] font-black leading-none tracking-[-0.03em] text-[#111]">lakatosbandi.com</span>
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
          */}
        <div className="lb-wisch flex min-h-0 flex-1 flex-col overflow-y-auto py-5">
          <div className="mt-auto flex flex-col gap-3">
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
              {m.rolle === "agent" && verlauf[i - 1]?.rolle !== "agent" && (
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
                  {marke === "lakatosbandi" ? (
                    /* Auf lakatosbandi.com kein VersusForge-Logo — der Name des Portals, schlicht wie sein Kopf. */
                    <span className="text-[15px] font-black leading-none tracking-[-0.03em] text-[#111]">lakatosbandi.com</span>
                  ) : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/VersusForge/Logo-VersusForge.JPG"
                        alt=""
                        className="h-7 w-7 shrink-0 rounded-full object-cover"
                      />
                      <span className="text-[13.5px] font-black tracking-[-0.01em] text-[#5b666f]">VersusForge</span>
                    </>
                  )}
                </div>
              )}
              {/* SEINE BILDER BLEIBEN IM GESPRÄCH SICHTBAR — über seiner Nachricht, rechts wie sie. */}
              {m.fotos && m.fotos.length > 0 && (
                <div className="flex max-w-[86%] flex-wrap justify-end gap-2">
                  {m.fotos.map((f, i) => (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img key={i} src={f} alt="" className="h-24 w-24 rounded-xl object-cover" />
                  ))}
                </div>
              )}
              {m.rolle === "agent" && marke === "lakatosbandi" && m.text === gruss ? (
                /* DIE STARTKARTE — IM STIL DES BEISPIELS AUF DER STARTSEITE (Owner 11.09.2026: „lakatosbandi.com ist
                   besser als lakatosbandi." fürs Logo · „das Bild von Van Gogh nicht abschneiden" · „unten hast du
                   kunterbunte Typo, schau wie wir es auf der Homepage haben" — also `components/PortalBald.tsx`, Abschnitt
                   BEISPIEL: graue Kapitälchen-Label, „Nachher" gross in Serifenschrift statt fett, die Frage als
                   Zitat mit Strich links, keine Farbmischung). Der Datenschutz steht eingeklappt, aber VOR dem Knopf —
                   die Einwilligung bleibt eine Einwilligung. */
                <div className="max-w-[86%] overflow-hidden rounded-2xl rounded-bl-md bg-[#f1f4f7] text-[16.5px] leading-[1.5] md:text-[17.5px]">
                  {/* WEISS STATT SCHWARZ/GRAU, UND KEIN RAND MEHR (Owner 11.09.2026: „einfach weiss machen im
                     Van-Gogh-Kasten und Bild recht platzieren"). Das Seitenverhältnis des Kastens ist genau das des
                     Bildes (364:520) — es füllt ihn exakt, ohne Beschnitt und ohne Rand rechts oder links; `bg-white`
                     bleibt nur als Sicherheitsnetz, falls das Bild einmal ausgetauscht wird. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/lakatosbandi/beispiel-sternennacht.jpg" alt={S.startQuelle} className="block aspect-[91/130] w-full bg-white object-cover" />
                  <div className="px-4 py-4">
                    {/* Owner 11.09.2026: schwarz statt hellgrau — die grauen Label kontrastieren sonst zu wenig auf dem
                        hellgrauen Kartengrund (`#f1f4f7`), anders als auf der weissen Startseite. */}
                    <p className="m-0 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#5b666f]">{S.startVorherLabel}</p>
                    <p className="m-0 mt-1.5 text-[15px] leading-[1.5] text-[#14181c] line-through decoration-[#8b959d]">{S.startVorher}</p>
                    <p className="m-0 mt-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#111]">{S.startNachherLabel}</p>
                    <p className="m-0 mt-1.5 font-serif text-[22px] leading-[1.3] md:text-[25px]">{S.startNachher}</p>
                    <div className="mt-4 border-l-2 border-[#111] pl-3.5">
                      <p className="m-0 font-bold leading-[1.4]">{S.startFrage}</p>
                      <p className="m-0 mt-1 leading-[1.4]">
                        {S.startText.split("lakatosbandi.com").flatMap((t, k) => (k ? [<strong key={k} className="font-bold">lakatosbandi.com</strong>, t] : [t]))}
                      </p>
                    </div>
                    <p className="m-0 mt-3 text-[14px] text-[#5b666f]">{S.startFein}</p>
                    <details className="mt-3">
                      <summary className="cursor-pointer text-[14px] font-bold text-[#5b666f]">{S.startDatenschutzTitel}</summary>
                      <p className="m-0 mt-2 whitespace-pre-wrap text-[14px] leading-[1.5] text-[#5b666f]">{S.grussDatenschutz}</p>
                    </details>
                    <p className="m-0 mt-3 text-[11.5px] leading-[1.4] text-[#8b959d]">{S.startQuelle}</p>
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={bild} alt={S.vorschauAlt} className="block w-full object-contain" />
                    <figcaption className="px-4 py-3 font-serif text-[18px] leading-[1.35] text-[#14181c]">{v.spruch}</figcaption>
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
              {m.rolle === "agent" && i === verlauf.length - 1 && !busy && !!m.vorschau && !werkFormOffen && (
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
                  <button type="button"
                    disabled={!kontakt.name.trim() || !/[^@\s]+@[^@\s]+\.[a-z]{2,}/i.test(kontakt.mail.trim())}
                    onClick={() => { setEingabe(""); void schicken(`${S.feldKuenstlername}: ${kontakt.name.trim()}\n${S.feldEmail}: ${kontakt.mail.trim()}`); }}
                    className="mt-4 w-full rounded-full bg-[#111] px-4 py-2.5 text-[15px] font-bold text-white transition hover:bg-[#333] active:scale-95 disabled:opacity-40">
                    {S.kontaktSenden}
                  </button>
                </div>
              )}
              {/* ── „WILLST DU NOCH BIS ZU N BILDER HOCHLADEN?" — Ja öffnet die Auswahl, Nein geht weiter. */}
              {m.rolle === "agent" && i === verlauf.length - 1 && !busy && !!m.mehrBilder && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button type="button" onClick={() => datei.current?.click()}
                    className="inline-flex items-center gap-2 rounded-full bg-[#111] px-4 py-2 text-[14.5px] font-bold text-white transition hover:bg-[#333] active:scale-95">
                    <ImagePlus className="h-4 w-4" aria-hidden />
                    {S.mehrBilderJa}
                  </button>
                  <button type="button" onClick={() => { setEingabe(""); void schicken(S.mehrBilderNein); }}
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
            onClick={() => { setFeedbackOffen(o => !o); setFeedbackStatus(""); }}
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
              onClick={() => { setFeedbackOffen(false); setFeedbackText(""); setFeedbackStatus(""); }}
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
                  placeholder={S.feedbackPlatzhalter}
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
        <div className={`sticky bottom-0 shrink-0 bg-white pb-3 pt-2 ${fertig ? "hidden" : ""}`}>
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
              multiple
              hidden
              onChange={e => void fotoWaehlen(e.target.files)}
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
