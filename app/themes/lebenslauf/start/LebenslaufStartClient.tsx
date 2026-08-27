"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { Trash2, FileText, Video, Check, X as XIcon, ChevronRight, ArrowRightLeft, HelpCircle, AlertTriangle, RotateCcw } from "lucide-react";
import TunnelSeite from "@/components/TunnelSeite";
import { produkt } from "@/lib/produkte";
import { BRANCHEN_QUELLE, BRANCHEN_SCHLUESSEL } from "@/lib/branchen";
import { eur, PREMIUM_BERATUNG_CENTS } from "@/lib/pricing";
import ImageCropper from "@/components/ImageCropper";
import { TunnelStart, TunnelFortschritt, TunnelKachelUpload, VorlagenKachel, KurzeEinwilligung, Knopf, Laden, Eingabe, EingabeMehrzeilig } from "@/components/CI";
import { kissText } from "@/lib/kiss-i18n";
import type { TrichterTexte } from "./page";
import { LEBENSLAUF_BEISPIEL_VIDEO, LEBENSLAUF_BEISPIEL_POSTER, EXECUTIVE_BEISPIEL } from "@/lib/lebenslauf-vorlage";
import { aktiveAdresse } from "@/lib/guthaben-konto";
import { signInWithOAuth, getStoredAuthSession } from "@/lib/supabase-auth-client";
import { landAusZeitzone } from "@/lib/land-erkennen";
import { kasseOeffnen, kassenFenster } from "@/lib/browser-erkennen";
import { useKasseImFenster } from "@/components/KasseImFenster";
import { CornerOrnaments, DividerOrnament } from "@/components/BoxOrnaments";
import { logTunnelEvent, logFunnelEvent } from "@/lib/track-funnel";
import { darfMessen } from "@/lib/land-erkennen";

/**
 * DER LEBENSLAUF ALS TUNNEL-SEITE (Owner 19.–20.08.2026, mehrfach umgebaut). Selbes Gerüst
 * wie andere „eigen"-Tunnel (KONZEPT-TUNNEL.md), mit EINEM strukturellen Unterschied zu allen
 * bisherigen Annahmen:
 *
 * STRIPES EINGEBETTETE KASSE LÄDT DIE SEITE NACH DER ZAHLUNG NEU (siehe
 * `components/KasseImFenster.tsx`: „Nach der Zahlung schickt Stripe die Seite selbst auf
 * `return_url`"). Ein Neuladen löscht ALLES, was nur im Arbeitsspeicher lag — Foto, PDF,
 * Stimm-Wahl. Ohne Vorkehrung bleibt der Kunde nach der Zahlung auf offener Strecke stehen
 * (Owner 20.08.2026, live erlebt: „Zahlung wird bestätigt und dann dauert es ewig … ich komme
 * nicht weiter").
 *
 * DIE LÖSUNG (Muster aus `KissFunnel.tsx`, dort `rueckkehrRef`/`nachZahlungLiefern"):
 *   1. Foto/Lebenslauf/Aufnahme gehen NICHT erst beim Kaufknopf zum Server, sondern SOFORT
 *      beim Auswählen (`ladeHoch`) — direkt zu Supabase, derselbe Weg wie grosse Video-
 *      Uploads (Memory `large-uploads-direct-to-supabase`).
 *   2. Der ganze Entwurf (Kennung, Pfade, Wahl) liegt zusätzlich in `sessionStorage` — das
 *      übersteht ein Neuladen, React-Zustand nicht.
 *   3. Nach der Rückkehr erkennt die Seite `?paid=1&cs=…` in der Adresse (dieselbe Kennung,
 *      die die Kasse für JEDEN Trichter im Haus anhängt), bestätigt die Zahlung serverseitig
 *      und setzt die Kette aus dem Entwurf fort — ohne dass der Kunde noch etwas tun muss.
 */
export default function LebenslaufStartClient({ lang, code, inhalt, texte, chatGesicht = "" }: {
  lang: string;
  code: string;
  inhalt?: ReactNode;
  texte: TrichterTexte;
  /** Das Gesicht des Klick-Chats (Owner: „wie bei Bella") — leer heisst: ohne Bild. */
  chatGesicht?: string;
}) {
  const searchParams = useSearchParams();
  const light = searchParams.get("light") === "1";
  const F = kissText(lang, "lebenslauf");
  const P = produkt("lebenslauf");

  return (
    <TunnelSeite inhalt={inhalt} schritte={P.schritte} schrittBekannt={P.schrittBekannt} light={light} code={code} produkt={P.slug}>
      {({ schritt, onSchrittChange }) => (
        <LebenslaufTunnel lang={lang} F={F} schritt={schritt} onSchrittChange={onSchrittChange} texte={texte} chatGesicht={chatGesicht} />
      )}
    </TunnelSeite>
  );
}

/** Dashed-Kachel für eine einzelne Datei (PDF/Video/Audio) — Symbol, Titel, Hinweis; gefüllt
    zeigt sie den Dateinamen und einen roten Löschen-Knopf, wie überall im Haus. */
function DateiKachel({ datei, titel, hinweis, icon: Icon, onWaehlen, onLoeschen }: {
  datei: File | null; titel: string; hinweis?: string; icon: typeof FileText;
  onWaehlen: () => void; onLoeschen: () => void;
}) {
  if (datei) {
    return (
      <div className="relative flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-[#f6cf51]/40 lb-goldhauch px-4 py-5 text-center">
        <Icon className="h-6 w-6 text-[#f6cf51]" />
        <span className="w-full truncate text-[12px] font-bold leading-snug text-white/80">{datei.name}</span>
        <button type="button" onClick={onLoeschen} aria-label="Datei löschen"
          style={{ background: "#fff", color: "#dc2626", boxShadow: "0 2px 10px rgba(0,0,0,0.35)" }}
          className="absolute -left-1.5 -top-1.5 grid h-8 w-8 place-items-center rounded-full transition active:scale-90">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  }
  return (
    <button type="button" onClick={onWaehlen}
      className="flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-[#f6cf51]/40 lb-goldhauch px-4 py-6 text-center transition active:scale-[0.98]">
      <Icon className="h-6 w-6 text-[#f6cf51]" />
      <span className="text-[13px] font-black leading-snug text-white/85">{titel}</span>
      {hinweis && <span className="text-[11px] font-bold leading-snug text-white/55">{hinweis}</span>}
    </button>
  );
}

/** Die grosse Statuszeile je Stufe (Owner 20.08.2026: „es muss gross stehen was da gemacht
    wird"). Deutsch/Englisch reichen — der Rest der Seite ist ohnehin nur zweisprachig. */
/**
 * DIE TEXTE DIESES TRICHTERS KOMMEN JETZT VOM SERVER (Owner 25.08.2026: „hier ist noch
 * englisch") — vorher standen hier drei de/en-Tabellen, und jede andere Sprache (auch
 * Rumänisch, der Zielmarkt) fiel auf Englisch zurück. Die deutsche Quelle liegt jetzt in
 * page.tsx (TRICHTER_QUELLE) und wird dort einmal je Sprache übersetzt (Dauer-Cache).
 */

const ABLAGE = "lb_lebenslauf_entwurf";

/**
 * DER DEUTSCH-TEST — FÜNF FRAGEN, GESTAFFELT VON A1 BIS C1 (Owner 26.08.2026: „wir müssen
 * testen, welches Niveau er hat. Wir müssen gar nicht fragen, wie gut er kann. Wir
 * schätzen es." · „du musst mit einfachen Fragen anfangen").
 *
 * KEINE SELBSTEINSCHÄTZUNG MEHR: Sie war vorher eine Chip-Reihe im Formular und ist raus —
 * wer gleich danach geprüft wird, braucht nicht vorher gefragt zu werden.
 *
 * NICHT FÜNF GLEICH SCHWERE FRAGEN: Die sagen nur „vier von fünf richtig", daraus lässt
 * sich kein Niveau ablesen. Das Ergebnis ist die höchste Stufe OHNE Lücke darunter — wer
 * die C1-Frage errät, aber an B1 scheitert, ist nicht C1.
 *
 * DIE ANTWORTEN STEHEN HART DEUTSCH und werden NIE übersetzt: Der Text IST die Prüfung.
 * Nur der Hinweis darüber läuft durch den Übersetzer.
 */
/**
 * ZWEI ÜBERSETZUNGS-FRAGEN UNTEN (Owner 26.08.2026: „du kannst auch Übersetzungen
 * abfragen, Rumänisch–Deutsch") — auf den unteren Stufen ist aktives Abrufen der bessere
 * Test: Wer „Caut de lucru" nicht auf Deutsch sagen kann, kann es auch nicht am Telefon.
 *
 * DIE QUELLSPRACHE IST DIE DES BETRACHTERS, nicht fest Rumänisch — derselbe Trichter läuft
 * in sieben Sprachen. Fest eingetragen statt übersetzt: Eine KI-Übersetzung würde die
 * deutschen Antworten gleich mitübersetzen und den Test zerstören.
 */
const SATZ_ARBEIT: Record<string, string> = {
  ro: "Caut de lucru.", en: "I am looking for work.", es: "Busco trabajo.",
  fr: "Je cherche du travail.", pt: "Procuro trabalho.", it: "Cerco lavoro.",
  de: "Ich suche Arbeit.",
};
const SATZ_HILFE: Record<string, string> = {
  ro: "Mă puteți ajuta?", en: "Can you help me?", es: "¿Me puede ayudar?",
  fr: "Pouvez-vous m'aider ?", pt: "Pode ajudar-me?", it: "Può aiutarmi?",
  de: "Können Sie mir helfen?",
};

type DeFrage = { niveau: string; frage: string; antworten: { label: string; richtig: boolean }[] };

/** Die Leiter — A1 bis C1, unten Übersetzung, oben Verstehen. */
const deTestBauen = (lang: string): DeFrage[] => {
  const q = (t: Record<string, string>) => t[lang] ?? t.en;
  /* AUF DEUTSCH GIBT ES NICHTS ZU ÜBERSETZEN: Für einen deutschsprachigen Betrachter
     stünde die richtige Antwort in der Frage. Dort fragen die unteren beiden Stufen
     stattdessen einfaches Verstehen ab. */
  const untenUebersetzen: DeFrage[] = [
    {
      niveau: "A1",
      frage: `Wie sagt man „${q(SATZ_ARBEIT)}“ auf Deutsch?`,
      antworten: [
        { label: "Ich suche Arbeit.", richtig: true },
        { label: "Ich habe Arbeit.", richtig: false },
      ],
    },
    {
      niveau: "A2",
      frage: `Wie sagt man „${q(SATZ_HILFE)}“ auf Deutsch?`,
      antworten: [
        { label: "Können Sie mir helfen?", richtig: true },
        { label: "Wollen Sie mir helfen?", richtig: false },
      ],
    },
  ];
  const untenVerstehen: DeFrage[] = [
    {
      niveau: "A1",
      frage: "Was bedeutet — „Ich arbeite seit drei Jahren in einer Firma“?",
      antworten: [
        { label: "Ich bin seit drei Jahren dort beschäftigt.", richtig: true },
        { label: "Ich suche seit drei Jahren Arbeit.", richtig: false },
      ],
    },
    {
      niveau: "A2",
      frage: "Was bedeutet — „Der Termin wurde auf nächste Woche verschoben“?",
      antworten: [
        { label: "Der Termin ist jetzt nächste Woche.", richtig: true },
        { label: "Der Termin fällt ganz aus.", richtig: false },
      ],
    },
  ];
  return [
    ...(lang === "de" ? untenVerstehen : untenUebersetzen),
    {
      niveau: "B1",
      frage: "Eine Kollegin sagt: „Ich melde mich bei Ihnen.“ Was heisst das?",
      antworten: [
        { label: "Sie wird mich später kontaktieren.", richtig: true },
        { label: "Sie meldet mich irgendwo an.", richtig: false },
      ],
    },
    {
      niveau: "B2",
      frage: "Der Chef sagt: „Das kommt nicht in Frage.“",
      antworten: [
        { label: "Er lehnt es klar ab.", richtig: true },
        { label: "Er findet die Frage gut.", richtig: false },
      ],
    },
    {
      niveau: "C1",
      frage: "In einer Mail steht: „Wir würden Sie bitten, sich zeitnah zurückzumelden.“",
      antworten: [
        { label: "Ich soll bald antworten.", richtig: true },
        { label: "Ich soll erst in einigen Wochen antworten.", richtig: false },
      ],
    },
  ];
};

/* Die höchste Stufe OHNE Lücke darunter — eine geratene C1-Antwort hebt das
   Ergebnis nicht, wenn B1 daneben lag. */
const deutschAbleiten = (test: DeFrage[], antworten: string[]) => {
  let erreicht = "";
  for (let i = 0; i < test.length; i++) {
    const richtig = test[i].antworten.find(a2 => a2.label === antworten[i])?.richtig === true;
    if (!richtig) break;
    erreicht = test[i].niveau;
  }
  return erreicht || "Kein Deutsch";
};


/**
 * TÜR 2 — DIE JOBCHANCEN (Owner-Änderungsauftrag 26.08.2026, KONZEPT-JOB-MATCH-TRICHTER.md
 * Baustelle E/F). Eigene, lokale DTO-Typen statt eines Imports aus `lib/job-chancen.ts`/
 * `lib/kandidaten-store.ts` — dieselbe Konvention wie überall im Client (siehe `Match` in
 * `ProfilAssistent.tsx`, `JobChance` im Admin): ein Client-Baustein bildet nur ab, was er
 * über die Leitung bekommt, er importiert nie eine Server-Bibliothek mit Supabase-Zugriff.
 */
type ChanceKandidat = {
  id: string; rolle: string; land: string; stadt?: string;
  remote: "remote" | "hybrid" | "vorOrt"; sprachen: string[]; gehalt?: string;
  umzugNoetig?: boolean; anforderungen: string[]; quereinstiegGeeignet: boolean;
  kurzbeschreibung: string; kategorie: string; partnerFreigabe: boolean;
};
type Vorschlag = { chanceId: string; prozent: number; etikett: "realistisch" | "moeglich" | "unwahrscheinlich"; quereinstieg: boolean; erklaerung: string };
/* Dieselbe kurze Liste wie `lib/kandidaten-store.ts` (UMZUG_LAENDER) — dupliziert statt
   importiert, aus demselben Grund wie oben. */
const UMZUG_LAENDER = ["Deutschland", "Österreich", "Schweiz", "Griechenland", "Niederlande", "Irland", "Egal"];

type Entwurf = {
  genId: string; name: string; mail: string; foto: string;
  cvName: string; cvPath: string; verfuegbarkeit: string;
  /* Stimm-Wahl/HeyGen sind aus dem Kaufweg raus (Owner-Seitentext 24.08.2026: „kein Avatar,
     keine synthetische Stimme") — die Felder bleiben leer im Entwurf, damit ein alter
     gespeicherter Entwurf weiter lesbar ist. */
  stimmWahl: "" | "ki" | "eigen"; audioName: string; audioPath: string;
  /** Das (ggf. selbst geänderte) Skript — überlebt das Stripe-Neuladen; bei Rückkehr wird
      damit KEINE zweite Auswertung bezahlt. */
  skript?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LebenslaufTunnel({ lang, F, schritt, onSchrittChange, texte, chatGesicht = "" }: { lang: string; F: any; schritt: number; onSchrittChange: (s: number) => void; texte: TrichterTexte; chatGesicht?: string }) {
  const kasse = useKasseImFenster(schritt);
  /* TÜR 2 (Owner-Änderungsauftrag 26.08.2026, „Zeig mir passende Jobs" — `?jobs=1`):
     eigener Einstieg ohne Anzeige und ohne E-Mail-Tor vor dem Upload (Baustelle E). */
  const jobsSearchParams = useSearchParams();
  const jobsModus = jobsSearchParams.get("jobs") === "1";
  const [name, setName] = useState("");
  const [mail, setMail] = useState("");
  const [leadBusy, setLeadBusy] = useState(false);
  const [leadFehler, setLeadFehler] = useState("");

  const [foto, setFoto] = useState("");
  const fotoRef = useRef<HTMLInputElement>(null);
  const [cropDatei, setCropDatei] = useState<File | null>(null);

  const [cvDatei, setCvDatei] = useState<File | null>(null);
  const [cvPath, setCvPath] = useState("");
  /* CV-PFLICHT AM TOR (Owner 27.08.2026: "ohne CV-Upload machen wir gar nicht
     weiter, sonst bekommen wir nur Muellkandidaten") — wer "Nein" sagt, sieht die
     Absage und keine weiteren Fragen; es gibt keinen Chat-Weg mehr ohne CV. */
  const [cvAbgelehnt, setCvAbgelehnt] = useState(false);
  const cvRef = useRef<HTMLInputElement>(null);

  /* DIE ANZEIGE — der neue Einstieg (Owner 25.08.2026, siehe ANZEIGE_TEXT oben). */
  const [anzeige, setAnzeige] = useState("");
  const [anzeigeFertig, setAnzeigeFertig] = useState(false);
  /* DIE STRUKTUR-ANALYSE (Owner-Auftrag 26.08.2026, KONZEPT-JOB-MATCH-TRICHTER.md
     Baustelle A): `empfehlung`/`anforderungen` sind optional — ein älterer Server-Stand
     liefert sie nicht, die Seite fällt dann auf die alten gruende/luecken-Listen zurück. */
  type Einstufung = "erfuellt" | "uebertragbar" | "erklaerbar" | "blocker";
  type Anforderung = { text: string; einstufung: Einstufung; begruendung: string };
  const [matchErgebnis, setMatchErgebnis] = useState<{
    prozent: number; jobtitel: string; gruende: string[]; luecken: string[];
    empfehlung?: "gut" | "bruecke" | "schwach"; anforderungen?: Anforderung[];
  } | null>(null);
  /* Die Daten für die KARTEN-VORSCHAU in Schritt 3 (Owner 25.08.2026: „Schritt 3: Karte
     zeigen (Vorschau, Bearbeitung)") — kommen aus der Vorab-Auswertung. */
  const [karte, setKarte] = useState<{ rolle: string; schwerpunkte: string[]; kompetenzen: string[] } | null>(null);
  const [karteBearbeiten, setKarteBearbeiten] = useState(false);

  /* Aus den Einstufungen abgeleitet, für die Ergebnis-Karte — `texte.*` statt `AT.*`,
     weil `AT` erst weiter unten (kurz vor dem JSX-Return) gesetzt wird. Leere Arrays,
     solange kein Match steht oder der Server (noch) keine Struktur-Analyse liefert. */
  const anforderungenAlle = matchErgebnis?.anforderungen ?? [];
  const anfErfuellt = anforderungenAlle.filter(a => a.einstufung === "erfuellt");
  const anfUebertragbar = anforderungenAlle.filter(a => a.einstufung === "uebertragbar");
  const anfErklaerbar = anforderungenAlle.filter(a => a.einstufung === "erklaerbar");
  const anfBlocker = anforderungenAlle.filter(a => a.einstufung === "blocker");
  const ampelText = !matchErgebnis ? "" : matchErgebnis.empfehlung === "gut" ? texte.ampelGut
    : matchErgebnis.empfehlung === "bruecke" ? texte.ampelBruecke
    : matchErgebnis.empfehlung === "schwach" ? texte.ampelSchwach
    : matchErgebnis.prozent >= 70 ? texte.stark : matchErgebnis.prozent >= 40 ? texte.mittel : texte.schwach;
  const anfBloecke: { key: string; h: string; items: Anforderung[]; icon: typeof Check; iconClass: string }[] = [
    { key: "erfuellt", h: texte.passtH, items: anfErfuellt, icon: Check, iconClass: "text-white/55" },
    { key: "uebertragbar", h: texte.transferH, items: anfUebertragbar, icon: ArrowRightLeft, iconClass: "text-[#f6cf51]" },
    { key: "erklaerbar", h: texte.erklaerenH, items: anfErklaerbar, icon: HelpCircle, iconClass: "text-white/50" },
    { key: "blocker", h: texte.problemH, items: anfBlocker, icon: AlertTriangle, iconClass: "text-red-400" },
  ];
  /* Bei einer schwachen Empfehlung steht die Hürde ZUERST (Owner: „sei direkt") — sonst
     Reihenfolge passt→übertragbar→erklären→Hürde. */
  const anfGeordnet = matchErgebnis?.empfehlung === "schwach"
    ? [anfBloecke[3], anfBloecke[0], anfBloecke[1], anfBloecke[2]]
    : anfBloecke;

  /**
   * DIE NEUEN PHASEN NACH DER ZAHLUNG (Owner-Seitentext 24.08.2026): erst das SKRIPT lesen
   * und ändern, dann die EIGENE AUFNAHME hochladen, dann baut der Server die Seite. Der
   * HeyGen-Avatar-Weg ist aus dem Kaufweg raus (FAQ: „kein Avatar, keine synthetische
   * Stimme"); die Route /api/lebenslauf-video bleibt als Altweg im Code.
   */
  const [phase, setPhase] = useState<"" | "ergebnis" | "skript" | "aufnahme" | "vorschlaege" | "interesse" | "fertig">("");
  const [skript, setSkript] = useState("");
  const [aufnahmeDatei, setAufnahmeDatei] = useState<File | null>(null);
  const [aufnahmePath, setAufnahmePath] = useState("");
  const aufnahmeRef = useRef<HTMLInputElement>(null);

  /* TÜR 2 — DIE JOBCHANCEN-VORSCHLÄGE (Baustelle E). */
  const [vorschlaege, setVorschlaege] = useState<Vorschlag[]>([]);
  const [chancenListe, setChancenListe] = useState<ChanceKandidat[]>([]);
  const [aufgeklappt, setAufgeklappt] = useState<string>("");
  const [gewaehlteChance, setGewaehlteChance] = useState<ChanceKandidat | null>(null);

  /**
   * DER KLICK-CHAT (einfache Fassung + Nachtrag 6, Owner: „ist es nicht einfacher in
   * Form von Klickchat … Ein Feld, das immer nach oben scrollt") — „Ich will. Ich kann.
   * Ich heisse." als EIN Verlauf, eine Frage zur Zeit, Antworten nur per Klick.
   * Beantwortete Fragen bleiben als kompakte Zeilen stehen; `chatSchritt` zählt durch.
   * KEIN Gesprächs-Simulator (Lehre vom 25.08., „unten ist zu viel los im Chat"):
   * kein Avatar, keine Tipp-Animation, kein freies Chat-Feld.
   */
  const [chatSchritt, setChatSchritt] = useState(0);
  /* Das E-Mail-Tor (Owner 26.08.2026) — vor Frage 0, nie wieder gezeigt, sobald offen. */
  const [torOffen, setTorOffen] = useState(false);
  /* Das Tor hat zwei Schirme: 0 = Formular (Name, E-Mail, Deutsch), 1 = die Absicht. */
  const [torSchritt, setTorSchritt] = useState(0);
  const [sucheIntent, setSucheIntent] = useState("");
  const [deAntworten, setDeAntworten] = useState<string[]>([]);
  /* DER COUNTDOWN (Owner 26.08.2026: „sonst beantwortet er das mit ChatGPT") — 20 Sekunden
     je Frage. Genug, um einen Satz und zwei Antworten zu lesen; zu wenig, um die App zu
     wechseln, etwas zu tippen und zurückzukommen. Läuft die Zeit ab, gilt die Frage als
     nicht gewusst und der Test geht weiter — kein Hängenbleiben. */
  const DE_SEKUNDEN = 20;
  /* Für die Schreibprobe mehr Zeit — tippen dauert länger als tippen auf einen Knopf —
     aber immer noch zu wenig, um die App zu wechseln (Owner 26.08.2026: „dafür 30
     Sekunden"). */
  const SCHREIB_SEKUNDEN = 30;
  const [deRest, setDeRest] = useState(DE_SEKUNDEN);
  /* Die Schreibprobe — nur ab B2 abgefragt, sonst bleibt sie leer. */
  const [schreibprobe, setSchreibprobe] = useState("");

  /* ANALYSE + CHECKLISTE statt Prozent-Karten (Owner 26.08.2026). */
  const [analyse, setAnalyse] = useState<{ richtungen?: { rolle: string; prozent: number; begruendung: string }[]; plus: string[]; minus: string[]; fazit: string } | null>(null);
  const [branchenWahl, setBranchenWahl] = useState<string[]>([]);
  const [sendetBranchen, setSendetBranchen] = useState(false);
  const [gesendet, setGesendet] = useState(false);
  const [premiumDa, setPremiumDa] = useState(false);
  const [premiumLaeuft, setPremiumLaeuft] = useState(false);
  const [premiumTelefon, setPremiumTelefon] = useState("");
  /* Die Testleiter in der Sprache des Betrachters — einmal gebaut, nicht je Frage neu. */
  const deTest = useMemo(() => deTestBauen(lang), [lang]);
  const [richtungen, setRichtungen] = useState<string[]>([]);
  const [arbeitsformChat, setArbeitsformChat] = useState<string[]>([]);
  const [umzugChat, setUmzugChat] = useState("");
  const [startChat, setStartChat] = useState("");
  const [traum, setTraum] = useState("");
  const [zuletztChat, setZuletztChat] = useState<string[]>([]);
  /* DIE HARTEN ANGABEN (Owner 26.08.2026, im Chat abgefragt) — ohne sie ist ein Interesse
     wertlos, weil der Owner die Firma anruft und nichts in der Hand hat. */
  const [alterChat, setAlterChat] = useState("");
  const [jahreChat, setJahreChat] = useState("");
  const [abschlussChat, setAbschlussChat] = useState("");
  const [wohnortChat, setWohnortChat] = useState("");
  const [telefonChat, setTelefonChat] = useState("");
  const [fuehrerscheinChat, setFuehrerscheinChat] = useState<string[]>([]);
  const [faehigkeitenChat, setFaehigkeitenChat] = useState<string[]>([]);
  const [deutschChat, setDeutschChat] = useState("");
  /* NUR WER OBEN ANKOMMT, SCHREIBT (Owner 26.08.2026: „sollte er am Anfang schon nicht
     mitmachen können, braucht man das nicht zu machen") — bei A1/A2/B1 ist die Frage
     entschieden, und eine Schreibaufgabe wäre nur eine zweite Niederlage. */
  const schreibenNoetig = deutschChat === "B2" || deutschChat === "C1";
  /* Der ECHTE Deutsch-Test (Owner: „muss ein richtiger Test sein. Was verstehst du
     unter … 2 Antworten. dann noch einen Test.") — zwei Verständnisfragen, das Niveau
     wird aus den richtigen Antworten ABGELEITET, nie selbst eingeschätzt. */
  const [deTest1, setDeTest1] = useState("");
  const [deTest2, setDeTest2] = useState("");
  /* „Findest du eine Video-Bewerbung sinnvoll?" (Owner) — die Antwort ist Lead-Info
     für den Pool und bereitet das Video-Produkt vor. */
  const [videoMeinung, setVideoMeinung] = useState("");
  /* DER CHAT-BERATER (Owner 26.08.2026, finale Wahl nach Bella→Popescu: „ich habe
     David als Video") — sein generierter, seriöser Berater-Avatar. Video liegt statisch
     in public/Lebenslauf (moov vorn geprüft — Faststart-Pflicht, Memory
     video-faststart-pflicht); Klick aufs Kopfbild öffnet es im Fullscreen. EIN Trio aus
     Konstanten, damit ein Tausch drei Zeilen bleibt. */
  const JOBS_CHAT_VIDEO = "/Lebenslauf/david.mp4";
  /* „AI DAVID", nicht „David" (Owner 26.08.2026: „sonst denken die Leute, ich wäre das") —
     der Chat soll erkennbar eine Maschine sein, nicht der Betreiber persönlich. */
  const JOBS_CHAT_NAME = "AI DAVID";
  const [bellaVideoOffen, setBellaVideoOffen] = useState(false);
  const chatEndeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (chatSchritt > 0) chatEndeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [chatSchritt]);
  /* Nach dem CV-Upload geht der Chat von selbst weiter — der Klick war die Antwort. */
  useEffect(() => {
    if (jobsModus && chatSchritt === 9 && cvPath) setChatSchritt(10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cvPath, chatSchritt, jobsModus]);
  /* DER CV-UPLOAD AM TOR (Owner 27.08.2026) — sobald die Datei liegt, geht es von
     selbst zum "Bereit fuer den Deutschtest"-Schirm weiter; der Klick war die
     Antwort, wie beim alten Chat-Schritt 9 oben. */
  useEffect(() => {
    if (jobsModus && !torOffen && torSchritt === 1 && cvPath) setTorSchritt(2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cvPath, torOffen, torSchritt, jobsModus]);
  /* Nach dem Foto-Zuschnitt geht der Chat von selbst weiter. */
  useEffect(() => {
    if (jobsModus && chatSchritt === 10 && foto) setChatSchritt(11);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foto, chatSchritt, jobsModus]);
  /* Der Ticker — läuft während der Testfragen (20 s) UND während der Schreibprobe (30 s). */
  useEffect(() => {
    const imTest = !torOffen && torSchritt >= 3 && torSchritt <= 2 + deTest.length;
    const imSchreiben = !torOffen && schreibenNoetig && torSchritt === 3 + deTest.length;
    if (!imTest && !imSchreiben) return;
    const dauer = imSchreiben ? SCHREIB_SEKUNDEN : DE_SEKUNDEN;
    setDeRest(dauer);
    const uhr = setInterval(() => {
      setDeRest(r => {
        if (r <= 1) {
          /* SCHREIBPROBE: Zeit vorbei heisst „so weit ist er gekommen" — der Text bleibt
             stehen, wie er ist, und es geht weiter. Nichts wird verworfen. */
          if (imSchreiben) { setTorSchritt(z => z + 1); return dauer; }
          /* Zeit vorbei: als nicht gewusst vermerken und weiter — nie blockieren. */
          setDeAntworten(prev => {
            const n = [...prev]; n[torSchritt - 3] = "__zeit_abgelaufen__";
            /* Auch die ABGELAUFENE letzte Frage muss ein Niveau ergeben — sonst bliebe der
               Wert leer, obwohl der Test durch ist. */
            if (torSchritt === 2 + deTest.length) setDeutschChat(deutschAbleiten(deTest, n));
            return n;
          });
          setTorSchritt(z => z + 1);
          return dauer;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(uhr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [torSchritt, torOffen, schreibenNoetig]);

  /* DIE LEEREN PLÄTZE ÜBERSPRINGEN (26.08.2026): Die Schritte 7 und 8 waren der
     Deutsch-Test; der sitzt jetzt im Tor. Die Nummern bleiben stehen, damit alle
     folgenden Fragen und die Rücksprünge im Verlauf unverändert gelten — durchlaufen darf
     der Chat sie aber nicht, sonst endet er dort in einem leeren Schirm. */
  useEffect(() => {
    if (jobsModus && torOffen && (chatSchritt === 7 || chatSchritt === 8)) setChatSchritt(9);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatSchritt, torOffen, jobsModus]);

  /* MIT LEBENSLAUF NICHT ZWEIMAL FRAGEN (Owner 26.08.2026: „frag ihn am Anfang, ob er ein
     CV hat. Dann hochladen und ablesen") — Jahre und Abschluss stehen dort drin, die
     Auswertung liest sie. Alter, Führerschein, Wohnort und Telefon bleiben: die stehen in
     keinem Lebenslauf verlässlich. */
  useEffect(() => {
    if (jobsModus && chatSchritt === 13 && cvPath) setChatSchritt(15);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cvPath, chatSchritt, jobsModus]);

  /* TÜR 2 — INTERESSE, KLICK-FRAGEN, EINWILLIGUNG (Baustelle F). Eine Frage je Schirm,
     `interesseSchritt` zählt durch — nie ein Formular (Hausregel). */
  const [interesseSchritt, setInteresseSchritt] = useState(0);
  const [umzug, setUmzug] = useState<"" | "ja" | "vielleicht" | "nein">("");
  const [umzugLaender, setUmzugLaender] = useState<string[]>([]);
  const [verfuegbarkeit, setVerfuegbarkeit] = useState<"" | "sofort" | "2wochen" | "1monat" | "spaeter">("");
  const [arbeitsform, setArbeitsform] = useState<string[]>([]);
  const [gehaltswunsch, setGehaltswunsch] = useState("");
  const [rollenAuswahl, setRollenAuswahl] = useState<string[]>([]);
  const [einwilligungHaken, setEinwilligungHaken] = useState(false);
  const [einwilligungStatus, setEinwilligungStatus] = useState<"" | "erteilt" | "abgelehnt">("");
  const [mappeUrl, setMappeUrl] = useState("");

  const [genId, setGenId] = useState("");
  const [busy, setBusy] = useState(false);
  /**
   * DER FORTSCHRITT WÄHREND DES LAUFS (Owner 26.08.2026: „hier muss noch was in Prozent
   * stehen und bitte warten") — die Kette braucht je nach Andrang zwanzig bis sechzig
   * Sekunden; ein Rad allein sieht aus wie ein Fehler.
   *
   * EHRLICH GENUG: Die Zahl steigt zügig bis 90 und bleibt dort stehen, bis die Antwort
   * wirklich da ist — sie verspricht also nie „gleich fertig", wenn es noch dauert, und
   * springt am Ende auf 100.
   */
  const [fortschritt, setFortschritt] = useState(0);
  useEffect(() => {
    if (!busy) { setFortschritt(0); return; }
    setFortschritt(3);
    const uhr = setInterval(() => setFortschritt(p => (p >= 90 ? 90 : p + Math.max(1, Math.round((90 - p) / 14)))), 700);
    return () => clearInterval(uhr);
  }, [busy]);
  const [stufe, setStufe] = useState("");
  const [status, setStatus] = useState("");
  const rueckkehrRef = useRef(false);

  /** DIE KENNUNG STEHT SCHON VOR DER KASSE (nicht erst beim Kaufknopf wie bei Kuss/Hochzeit)
      — sie muss ein Neuladen überstehen, also so früh wie möglich existieren. */
  useEffect(() => {
    if (genId) return;
    /* Beim Video-Einstieg (?video=<kennung>, Effekt unten) IST die Kennung die bestehende
       Bewerbung — hier keine neue anlegen, sonst ueberschriebe die spaeter eintreffende
       kiss-log-Antwort die gesetzte Kennung. */
    try { if (new URLSearchParams(window.location.search).get("video")) return; } catch { /**/ }
    void (async () => {
      try {
        let device = "";
        try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
        const log = await fetch("/api/kiss-log", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: "lebenslauf", device, email: mail.trim() }),
        }).then(r => r.json());
        if (log?.id) setGenId(String(log.id));
      } catch { /**/ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try { const a = aktiveAdresse() || localStorage.getItem("lb_kiss_mail") || ""; if (a) setMail(m => m || a); } catch { /**/ }
  }, []);

  /** DER ENTWURF ÜBERLEBT DAS NEULADEN (Owner 20.08.2026) — jede Änderung geht sofort in
      `sessionStorage`, nicht erst beim Kaufknopf. */
  useEffect(() => {
    try {
      const entwurf: Entwurf = {
        genId, name, mail, foto, cvName: cvDatei?.name ?? "", cvPath, verfuegbarkeit: "",
        stimmWahl: "", audioName: "", audioPath: "",
        ...(skript ? { skript } : {}),
      };
      sessionStorage.setItem(ABLAGE, JSON.stringify(entwurf));
    } catch { /**/ }
  }, [genId, name, mail, foto, cvDatei, cvPath, skript]);

  const dateiZuDataUrl = (f: File) =>
    new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result ?? ""));
      r.onerror = rej;
      r.readAsDataURL(f);
    });

  /** Direkt zu Supabase, nicht über die API-Route (Memory `large-uploads-direct-to-supabase`
      — und weil die Datei ein Neuladen NUR als Server-Pfad übersteht, nicht als `File`). */
  const ladeHoch = async (f: File): Promise<string> => {
    const ext = (f.name.split(".").pop() || "bin").toLowerCase();
    const signiert = await fetch("/api/lebenslauf-video-url", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ extension: ext }),
    }).then(r => r.json());
    if (!signiert?.uploadUrl || !signiert?.path) throw new Error("upload-url");
    const put = await fetch(signiert.uploadUrl, {
      method: "PUT", headers: { "Content-Type": f.type || "application/octet-stream", "x-upsert": "true" }, body: f,
    });
    if (!put.ok) throw new Error("upload-put");
    return signiert.path;
  };

  const mailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail.trim());
  /* Foto und Lebenslauf reichen zum Loslegen — Skript und Aufnahme sind die nächsten
     Schritte, weiterhin gratis (Gratis-Linie Owner 25.08.2026, siehe `starten`). */
  const bereitDa = !!foto && !!cvPath;
  /* TÜR 2 (Baustelle E): nur der Lebenslauf ist Pflicht, das Foto bleibt optional
     („+ Foto optional wie bisher") — Tür 1s `bereitDa` bleibt für Tür 1 unangetastet. */

  /**
   * DIREKT ZUR KASSE, WIE BEI KUSS/TANZ (Owner 19.08.2026: „Der user zahlt doch direkt über
   * stripe. Das ist doch im Tunel eingebaut schon"). Kein Guthaben-Vorab-Check — die Route
   * entscheidet selbst: Guthaben reicht → `walletPaid` (kein Neuladen), sonst eine
   * Stripe-Sitzung (Neuladen nach Erfolg, siehe Kopf-Kommentar).
   */
  const kaufen = async (gid: string): Promise<boolean> => {
    const popup = kassenFenster();
    try {
      const start = await fetch("/api/kiss-video-checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genId: gid, once: true, videoAufpreis: false, thema: "lebenslauf",
          email: mail.trim(), returnTo: window.location.pathname + window.location.search,
          einwilligung: darfMessen(),
          eingebettet: kasse.anfordern, lang,
        }),
      }).then(r => r.json());
      if (start?.walletPaid) {
        try { popup?.close(); } catch { /**/ }
        void logTunnelEvent("payment_completed", "lebenslauf", { via: "wallet" });
        return true;
      }
      if ((!start?.url && !start?.clientSecret) || !start?.sessionId) {
        try { popup?.close(); } catch { /**/ }
        setStatus(start?.error || F.statusNotWork);
        return false;
      }
      // Eingebettet: die Kasse steht jetzt in der Seite. Sie meldet Erfolg NICHT hierher
      // zurück — Stripe lädt nach der Zahlung selbst auf `?paid=1&cs=…` neu (Kopf-Kommentar).
      if (kasse.uebernehmen(start.clientSecret)) return false;
      if (kasseOeffnen(popup, start.url) !== "popup" || !popup) return false;
      for (let i = 0; i < 100; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const s = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(start.sessionId)}`).then(r => r.json()).catch(() => null);
        if (s?.paid) {
          try { popup.close(); } catch { /**/ }
          void logTunnelEvent("payment_completed", "lebenslauf", { via: "stripe", eventId: String(start.sessionId) });
          return true;
        }
        if (popup.closed && i > 2) break;
      }
      try { popup.close(); } catch { /**/ }
      return false;
    } catch {
      try { popup?.close(); } catch { /**/ }
      setStatus(F.statusNetwork);
      return false;
    }
  };

  /**
   * DIE KETTE NACH DER ZAHLUNG — läuft entweder sofort (Guthaben, kein Neuladen) oder nach
   * der Rückkehr von Stripe (`?paid=1&cs=…`, aus dem `sessionStorage`-Entwurf). Braucht daher
   * ausdrückliche Werte statt React-State, weil sie nach einem Neuladen frisch aus dem
   * Entwurf kommen, bevor React sie in Zustand verwandelt hat.
   *
   * DER NAME IST JETZT HISTORISCH (26.08.2026, Gratis-Linie): `starten()` ruft diese Kette
   * seither DIREKT auf, ohne dass vorher bezahlt wurde — das Erstellen ist gratis. Die Kette
   * selbst bleibt unverändert richtig, weil sie nie eine Zahlung PRÜFT, nur eine ausführt;
   * der `?paid=1`-Rückkehr-Pfad unten bleibt stehen für den Tag, an dem hier wieder etwas
   * bezahlt wird (KI-Video-Upgrade, Abo).
   */
  /**
   * NACH DER ZAHLUNG: SKRIPT ZUERST (Owner-Seitentext 24.08.2026, Schritt 2). Die KI liest
   * den Lebenslauf und schreibt den Sprechtext — der erscheint zum ÄNDERN, dann nimmt sich
   * der Kunde selbst auf. Kein HeyGen-Lauf mehr in dieser Kette.
   *
   * Steht im Entwurf schon ein Skript (Stripe-Neuladen mitten im Skript-Schritt), wird es
   * benutzt statt eine ZWEITE Auswertung zu bezahlen.
   */
  const nachZahlungFortsetzen = async (e: Entwurf) => {
    setBusy(true); setStatus("");
    void logTunnelEvent("generation_started", "lebenslauf");
    try {
      if (e.skript?.trim()) {
        setSkript(e.skript);
        setBusy(false); setStufe(""); setPhase("skript");
        return;
      }
      setStufe("lesen");
      const aus = await fetch("/api/lebenslauf-auswertung", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: e.genId, name: e.name, email: e.mail, pdfPath: e.cvPath, cvName: e.cvName, verfuegbarkeit: e.verfuegbarkeit }),
      }).then(r => r.json());
      if (!aus?.id) { setStatus(aus?.error || F.statusNotWork); setBusy(false); setStufe(""); return; }
      setSkript(String(aus.sprechtext ?? "").trim());
      setBusy(false); setStufe(""); setPhase("skript");
    } catch {
      // BEZAHLT BLEIBT BEZAHLT (Memory `paid-jobs-must-survive-the-browser`) — der Entwurf
      // bleibt in sessionStorage stehen, ein Neuladen kann es hier erneut versuchen.
      setStatus(F.statusNetwork);
      setBusy(false); setStufe("");
    }
  };

  /** Skript sichern (Server prüft auf „nichts geändert" selbst), dann zur Aufnahme. */
  const skriptWeiter = async () => {
    if (!skript.trim() || busy) return;
    setBusy(true); setStatus("");
    try {
      const r = await fetch("/api/lebenslauf-skript", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: genId, sprechtext: skript.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d?.ok) { setStatus(String(d?.error ?? F.statusNotWork)); setBusy(false); return; }
      setBusy(false); setPhase("aufnahme");
    } catch { setStatus(F.statusNetwork); setBusy(false); }
  };

  /**
   * AUFNAHME → SEITE (Owner-Seitentext, Schritt 3: „Du sprichst, wir bauen die Seite").
   * Die Aufnahme ist zugleich das Ergebnis-Video UND das „Original" unter Käufe
   * (fertigstellen legt beides ab); das Foto wird das Porträt der Seite.
   */
  const seiteBauen = async () => {
    if (!aufnahmePath || busy) return;
    setBusy(true); setStatus(""); setStufe("fertig");
    try {
      const fertig = await fetch("/api/lebenslauf-fertigstellen", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: genId, videoPath: aufnahmePath, foto, originalPath: aufnahmePath }),
      }).then(r => r.json());
      if (fertig?.id) {
        try { sessionStorage.removeItem(ABLAGE); } catch { /**/ }
        window.location.href = `/lebenslauf/${fertig.id}`;
        return;
      }
      setStatus(fertig?.error || F.statusNotWork);
    } catch { setStatus(F.statusNetwork); }
    setBusy(false); setStufe("");
  };

  /** Die Kennung sicherstellen — normalerweise steht sie längst (Effekt oben). */
  const kennungSichern = async (): Promise<string> => {
    if (genId) return genId;
    try {
      let device = "";
      try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
      const log = await fetch("/api/kiss-log", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: "lebenslauf", device, email: mail.trim() }),
      }).then(r => r.json());
      if (log?.id) { setGenId(String(log.id)); return String(log.id); }
    } catch { /**/ }
    return "";
  };

  /**
   * GENERIEREN VOR DER KASSE (Owner 25.08.2026: „Dann wird generiert. 67 %."):
   * Auswertung (`vorab` — Entwurf bleibt unbezahlt) + Anzeigen-Match in einer Kette.
   * Das Skript aus der Auswertung wird gemerkt — nach der Zahlung läuft KEINE zweite
   * Auswertung (nachZahlungFortsetzen nimmt `e.skript`).
   */
  const generieren = async () => {
    if (!bereitDa || !mailOk || busy || !anzeige.trim()) return;
    setBusy(true); setStatus(""); setStufe("lesen");
    void logTunnelEvent("generation_started", "lebenslauf", { via: "match" });
    const gid = await kennungSichern();
    if (!gid) { setStatus(F.statusNotWork); setBusy(false); setStufe(""); return; }
    try {
      const aus = await fetch("/api/lebenslauf-auswertung", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: gid, name, email: mail.trim(), pdfPath: cvPath, cvName: cvDatei?.name ?? "", vorab: true }),
      }).then(r => r.json());
      if (!aus?.id) { setStatus(aus?.error || F.statusNotWork); setBusy(false); setStufe(""); return; }
      setSkript(String(aus.sprechtext ?? "").trim());
      /* Die Karten-Vorschau speist sich aus derselben Auswertung — Rolle wie die
         Vorlage sie wählt (jüngste Station, sonst erste Kategorie). */
      const kategorien: string[] = Array.isArray(aus.kategorien) ? aus.kategorien : [];
      const erfahrung: { rolle?: string }[] = Array.isArray(aus.erfahrung) ? aus.erfahrung : [];
      setKarte({
        rolle: String(erfahrung[0]?.rolle || kategorien[0] || ""),
        schwerpunkte: (Array.isArray(aus.schwerpunkte) && aus.schwerpunkte.length ? aus.schwerpunkte : kategorien).slice(0, 4).map(String),
        kompetenzen: (Array.isArray(aus.kompetenzen) ? aus.kompetenzen : []).slice(0, 6).map(String),
      });
      setStufe("match");
      let device = "";
      try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
      const m = await fetch("/api/lebenslauf-match", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: gid, eingabe: anzeige.trim(), device, lang }),
      });
      const md = await m.json().catch(() => ({}));
      if (!m.ok) { setStatus(String(md?.error ?? F.statusNotWork)); setBusy(false); setStufe(""); return; }
      setMatchErgebnis({
        prozent: md.prozent ?? 0, jobtitel: md.jobtitel ?? "", gruende: md.gruende ?? [], luecken: md.luecken ?? [],
        empfehlung: ["gut", "bruecke", "schwach"].includes(md.empfehlung) ? md.empfehlung : undefined,
        anforderungen: Array.isArray(md.anforderungen) ? md.anforderungen : [],
      });
      setBusy(false); setStufe(""); setPhase("ergebnis");
    } catch {
      setStatus(F.statusNetwork); setBusy(false); setStufe("");
    }
  };

  /**
   * ERSTELLEN IST GRATIS (Owner 25.08.2026, Gratis-Linie, live gefunden am 26.08.2026 mit
   * eigenem Test: „warum muss ich jetzt zahlen. Das ist die Gratis Version und ich habe
   * keine Bewerbung generieren können."). Bis dahin rief diese Funktion hier `kaufen()`
   * auf — der Kunde zahlte, BEVOR sein Profil überhaupt bestand. Das widersprach der
   * Regel, die die Sperre auf der Profilseite längst umsetzt (`gesperrt`/`SchlossHinweis`
   * in `LebenslaufExecutive.tsx`): Anlegen frei, nur Teilen/PDF/KI-Video kosten.
   * `kaufen()`/`kasse` bleiben trotzdem im Baustein stehen — sie sind die EINE Kasse des
   * Produkts (siehe `SchlossHinweis`: „keine zweite Kasse") und werden dort gebraucht,
   * sobald Teilen/PDF/Video-generieren auf sie zeigen.
   */
  const starten = async () => {
    if (!bereitDa || !mailOk || busy) return;
    setBusy(true); setStatus("");
    const gid = await kennungSichern();
    if (!gid) { setStatus(F.statusNotWork); setBusy(false); return; }
    /* Das Skript aus dem Vorab-Generieren mitgeben — sonst würde hier eine ZWEITE
       Auswertung laufen (nachZahlungFortsetzen bevorzugt `e.skript`). */
    await nachZahlungFortsetzen({ genId: gid, name, mail, foto, cvName: cvDatei?.name ?? "", cvPath, verfuegbarkeit: "", stimmWahl: "", audioName: "", audioPath: "", ...(skript.trim() ? { skript: skript.trim() } : {}) });
  };

  /* ═══════════════════ TÜR 2 — DIE JOBCHANCEN (Owner-Änderungsauftrag 26.08.2026,
     KONZEPT-JOB-MATCH-TRICHTER.md Baustelle E/F) ═══════════════════ */

  const geraeteKennung = () => { try { return localStorage.getItem("lb_visitor") ?? ""; } catch { return ""; } };

  /** Kandidaten-Datei progressiv speichern — ein Fehler hier bricht die laufende
      Strecke NIE ab, das Speichern ist Zugabe zum Trichter, kein Blocker. */
  /**
   * DIE KENNUNG KOMMT VON AUSSEN (27.08.2026, live gefunden): Vorher nahm diese Funktion
   * den Zustand `genId`. Der hinkt aber hinterher, wenn `kennungSichern()` die Kennung
   * gerade erst geholt hat — React hat den Zustand dann noch nicht gesetzt. Ergebnis war
   * ein POST mit einer ALTEN Kennung und die Antwort „403 Not yours": Die Akte wurde nicht
   * gespeichert. Derselbe Zwei-Kennungen-Fehler, der schon eine echte Bewerberin gekostet
   * hat — deshalb reicht der Aufrufer die Kennung jetzt durch, die er wirklich benutzt.
   */
  const kandidatSpeichern = async (felder: Record<string, unknown>, kennung = "") => {
    const id = kennung || genId;
    if (!id) return;
    try {
      const r = await fetch("/api/kandidat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, device: geraeteKennung(), ...felder }),
      });
      /* NIE WIEDER STILL SCHEITERN (26.08.2026): Genau hier ging eine echte Bewerberin
         samt erteilter Einwilligung verloren — der Server antwortete 404, der leere
         `catch` schluckte es, und im Trichter sah alles gut aus. Ein Fehlschlag muss
         mindestens in der Konsole und im Trichter-Protokoll auftauchen, damit er beim
         nächsten Mal auffällt, statt einen Lead zu kosten. */
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        console.error("[kandidat] nicht gespeichert:", r.status, d?.error, { id, felder: Object.keys(felder) });
        void logFunnelEvent("candidate_save_failed", { theme: "lebenslauf", status: String(r.status) });
      }
    } catch (err) {
      console.error("[kandidat] Netzwerkfehler beim Speichern:", err);
      void logFunnelEvent("candidate_save_failed", { theme: "lebenslauf", status: "network" });
    }
  };

  /** JEDERZEIT VON VORN (Owner: „ich muss jederzeit noch mal von vorn anfangen") —
      EIN Reset für den ↺-Knopf im Chat-Kopf UND den Knopf auf der Abschluss-Karte. */
  const nochmalVonVorn = () => {
    setChatSchritt(0); setRichtungen([]); setArbeitsformChat([]); setUmzugChat("");
    setStartChat(""); setTraum(""); setZuletztChat([]); setFaehigkeitenChat([]);
    setDeutschChat(""); setDeTest1(""); setDeTest2(""); setCvDatei(null); setCvPath("");
    setFoto(""); setVideoMeinung("");
    setVorschlaege([]); setChancenListe([]); setEinwilligungStatus("");
    setPhase("");
    void logFunnelEvent("jobs_chat_restarted", { theme: "lebenslauf" });
  };

  /**
   * DAS ENDE DES KLICK-CHATS → DIE CHANCEN (einfache Fassung): E-Mail ist PFLICHT
   * (Owner, live erlebt: „der User kann einfach so weiter … und dann wird es nicht
   * gespeichert" — ohne Adresse gibt es keinen Lead und nichts Gespeichertes).
   * EIN Weg: Lead sichern (kiss-claim) → falls CV dazugelegt wurde, einmal auswerten
   * (genauere Analyse) → Vorschläge aus Antworten (+ ggf. Profil) → Kandidaten-Datei.
   */
  const jobsChancenLaden = async () => {
    if (busy) return;
    if (!mailOk) { setLeadFehler(AT.mailPflichtFehler); return; }
    /* Stufe SOFORT setzen — sonst zeigt die grosse Lade-Anzeige ihren „lesen"-Fallback
       („Dein Lebenslauf wird gelesen …"), obwohl im Ohne-CV-Weg gar keiner gelesen wird. */
    setBusy(true); setStatus(""); setLeadFehler(""); setStufe("chancen");
    const gid = await kennungSichern();
    if (!gid) { setStatus(F.statusNotWork); setBusy(false); return; }
    try {
      await fetch("/api/kiss-claim", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: mail.trim(), ...(name.trim() ? { name: name.trim() } : {}), device: geraeteKennung(), theme: "lebenslauf", vorab: true, land: landAusZeitzone(), lang, consentAt: new Date().toISOString() }),
      });
      try { localStorage.setItem("lb_kiss_mail", mail.trim()); } catch { /**/ }
    } catch { /* der Lead-Claim ist Zugabe — die Chancen kommen trotzdem */ }
    try {
      if (cvPath) {
        setStufe("lesen");
        await fetch("/api/lebenslauf-auswertung", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: gid, name, email: mail.trim(), pdfPath: cvPath, cvName: cvDatei?.name ?? "", vorab: true }),
        }).then(r => r.json()).catch(() => null);
        void logFunnelEvent("profile_analysis_completed", { theme: "lebenslauf" });
      }
      setStufe("chancen");
      const antworten = {
        richtungen, traum: traum.trim(),
        arbeitsform: arbeitsformChat, umzug: umzugChat, start: startChat,
        zuletzt: zuletztChat, faehigkeiten: faehigkeitenChat,
        /* GETESTET, NICHT BEHAUPTET (Owner 26.08.2026) — die Einschätzung soll auf dem
           Testergebnis beruhen; die Selbstauskunft geht als Vergleich mit. */
        deutschNiveau: deutschChat, deutschGetestet: deutschChat,
        schreibprobe: schreibprobe.trim(),
        weitereSprachen: [], land: landAusZeitzone(),
        /* DIE HARTEN ANGABEN AUS DEM CHAT (Owner 26.08.2026) — sie gehen denselben Weg
           wie die Klick-Antworten, damit die Einschätzung sie kennt UND sie im Profil
           landen (vorher fielen die Chat-Angaben nach dem Prompt einfach weg). */
        altersgruppe: alterChat, jahreErfahrung: jahreChat, ausbildungsstand: abschlussChat,
        fuehrerschein: fuehrerscheinChat, stadt: wohnortChat.trim(), telefon: telefonChat.trim(),
      };
      const r = await fetch("/api/job-vorschlaege", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: gid, device: geraeteKennung(), lang, antworten, name: name.trim(), email: mail.trim(), topic: jobsSearchParams.get("topic") ?? "", ...(cvPath ? { cvPath } : {}), ...(foto ? { foto } : {}) }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setStatus(String(d?.error ?? F.statusNotWork)); setBusy(false); setStufe(""); return; }
      const vl: Vorschlag[] = Array.isArray(d.vorschlaege) ? d.vorschlaege : [];
      setVorschlaege(vl);
      setChancenListe(Array.isArray(d.chancen) ? d.chancen : []);
      setAnalyse(d?.analyse ?? null);
      void logFunnelEvent("opportunity_matches_shown", { theme: "lebenslauf", anzahl: String(vl.length) });
      /* Die Kandidaten-Datei — der Lead mit allem, was der Chat gelernt hat. */
      void kandidatSpeichern({
        name: name.trim(), email: mail.trim(),
        umzug: umzugChat, arbeitsform: arbeitsformChat,
        verfuegbarkeit: startChat,
        uebertragbareKompetenzen: faehigkeitenChat,
        empfohleneRollen: richtungen,
        aktuellerBeruf: zuletztChat.join(", "),
        sprachen: [{ sprache: "Deutsch", niveau: deutschChat || undefined }],
        videoMeinung,
        altersgruppe: alterChat, jahreErfahrung: jahreChat, ausbildungsstand: abschlussChat,
        fuehrerschein: fuehrerscheinChat, stadt: wohnortChat.trim(), telefon: telefonChat.trim(),
        mitCv: !!cvPath, sucheIntent,
        deutschGetestet: deutschChat, schreibprobe: schreibprobe.trim(),
      }, gid);
      setBusy(false); setStufe(""); setPhase("vorschlaege");
    } catch { setStatus(F.statusNetwork); setBusy(false); setStufe(""); }
  };

  /** Premium — der Rückruf, nicht die Kasse. Die Nummer kennt der Chat meist schon. */
  const premiumMerken = async () => {
    if (premiumLaeuft) return;
    setPremiumLaeuft(true);
    try {
      const r = await fetch("/api/premium-interesse", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: genId, device: geraeteKennung(), telefon: (telefonChat || premiumTelefon).trim() }),
      });
      if (r.ok) { setPremiumDa(true); void logFunnelEvent("premium_interesse", { theme: "lebenslauf" }); }
    } catch { /* der Knopf bleibt stehen, er kann es erneut versuchen */ }
    setPremiumLaeuft(false);
  };

  /** Die Checkliste absenden — die Branchen landen am Kandidaten, mehr passiert nicht.
      Kein Versprechen über offene Stellen: Wir wissen jetzt, wo wir für ihn suchen. */
  const branchenSenden = async () => {
    if (sendetBranchen || branchenWahl.length === 0) return;
    setSendetBranchen(true);
    await kandidatSpeichern({ branchen: branchenWahl });
    void logFunnelEvent("branchen_gewaehlt", { theme: "lebenslauf", anzahl: String(branchenWahl.length) });
    setGesendet(true); setSendetBranchen(false);
  };

  /** Eine Chance wählen → Detail-Analyse (dieselbe Struktur-Analyse wie Tür 1, nur mit
      `chanceId` statt `eingabe`) — landet in der bestehenden „ergebnis"-Phase. */
  const chanceWaehlen = async (chance: ChanceKandidat) => {
    if (busy) return;
    setGewaehlteChance(chance);
    void logFunnelEvent("opportunity_selected", { theme: "lebenslauf", chanceId: chance.id, kategorie: chance.kategorie, land: chance.land });
    setBusy(true); setStatus(""); setStufe("match");
    try {
      /* KI-GENERIERTE MARKTCHANCEN (`ki-…`, Owner 26.08.2026: „Das Portal soll immer
         Chancen zeigen") liegen in KEINEM Pool — `leseChance` auf dem Server fände sie
         nie. Die Detail-Analyse bekommt darum den Kartentext selbst als `eingabe`,
         denselben Weg, den eine von Hand eingefügte Anzeige nimmt. */
      const kiChance = chance.id.startsWith("ki-");
      const kiText = [chance.rolle, [chance.stadt, chance.land].filter(Boolean).join(", "), chance.kurzbeschreibung, ...chance.anforderungen].filter(Boolean).join("\n");
      const m = await fetch("/api/lebenslauf-match", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: genId, ...(kiChance ? { eingabe: kiText } : { chanceId: chance.id }), device: geraeteKennung(), lang }),
      });
      const md = await m.json().catch(() => ({}));
      if (!m.ok) { setStatus(String(md?.error ?? F.statusNotWork)); setBusy(false); setStufe(""); return; }
      const empf = ["gut", "bruecke", "schwach"].includes(md.empfehlung) ? md.empfehlung : undefined;
      setMatchErgebnis({
        prozent: md.prozent ?? 0, jobtitel: md.jobtitel ?? "", gruende: md.gruende ?? [], luecken: md.luecken ?? [],
        empfehlung: empf, anforderungen: Array.isArray(md.anforderungen) ? md.anforderungen : [],
      });
      void logFunnelEvent("match_analysis_completed", { theme: "lebenslauf", chanceId: chance.id, prozent: String(md.prozent ?? 0), empfehlung: String(empf ?? "") });
      if (empf === "gut") void logFunnelEvent("good_match", { theme: "lebenslauf", chanceId: chance.id });
      else if (empf === "bruecke") void logFunnelEvent("bridgeable_match", { theme: "lebenslauf", chanceId: chance.id });
      else if (empf === "schwach") void logFunnelEvent("poor_match", { theme: "lebenslauf", chanceId: chance.id });
      setKarte({ rolle: chance.rolle, schwerpunkte: chance.anforderungen.slice(0, 4), kompetenzen: [] });
      setBusy(false); setStufe(""); setPhase("ergebnis");
    } catch { setStatus(F.statusNetwork); setBusy(false); setStufe(""); }
  };

  /** „Ich bin interessiert" — startet die Klick-Fragen (Baustelle F). */
  const interesseStarten = () => {
    if (!gewaehlteChance || !matchErgebnis) return;
    void logFunnelEvent("candidate_interest_confirmed", { theme: "lebenslauf", chanceId: gewaehlteChance.id });
    void kandidatSpeichern({
      gewaehlteChanceId: gewaehlteChance.id,
      matchProzent: matchErgebnis.prozent,
      matchEmpfehlung: matchErgebnis.empfehlung ?? "",
      empfohleneRollen: [gewaehlteChance.kategorie],
    });
    setRollenAuswahl([gewaehlteChance.kategorie, ...(karte?.schwerpunkte.length ? [] : [])].filter(Boolean));
    setInteresseSchritt(0);
    setPhase("interesse");
  };

  /** Die Mappe erzeugen (Baustelle C, mit `chanceId` + `analyse`) — dann der
      Erfolgs-Schirm, NIE ein Redirect (Tür 2 endet nie mit „Bewerbung verschickt"). */
  const mappeErzeugen = async () => {
    if (!gewaehlteChance || busy) return;
    setBusy(true); setStatus(""); setStufe("mappe");
    void logFunnelEvent("application_generation_started", { theme: "lebenslauf", chanceId: gewaehlteChance.id });
    try {
      const r = await fetch("/api/lebenslauf-bewerbung", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: genId, chanceId: gewaehlteChance.id, device: geraeteKennung(),
          prozent: matchErgebnis?.prozent,
          analyse: matchErgebnis ? { empfehlung: matchErgebnis.empfehlung, anforderungen: matchErgebnis.anforderungen } : undefined,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d?.id) { setStatus(String(d?.error ?? F.statusNotWork)); setBusy(false); setStufe(""); return; }
      void logFunnelEvent("application_generated", { theme: "lebenslauf", chanceId: gewaehlteChance.id });
      void kandidatSpeichern({ versionId: d.id });
      setMappeUrl(d.url || `/lebenslauf/${d.id}`);
      setBusy(false); setStufe(""); setPhase("fertig");
    } catch { setStatus(F.statusNetwork); setBusy(false); setStufe(""); }
  };

  /**
   * DIE RÜCKKEHR VON STRIPE (Owner 20.08.2026, Muster aus `KissFunnel`s `rueckkehrRef"):
   * `?paid=1&cs=…` in der Adresse heisst „gerade neu geladen, nachdem bezahlt wurde". Der
   * Entwurf aus `sessionStorage` liefert alles, was React beim Neuladen verloren hat.
   */
  useEffect(() => {
    if (rueckkehrRef.current) return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("paid") !== "1") return;
    const cs = q.get("cs") ?? "";
    if (!cs || cs.startsWith("{")) return;
    rueckkehrRef.current = true;
    setBusy(true); setStufe("zahlung");
    void (async () => {
      const st = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(cs)}`).then(r => r.json()).catch(() => null);
      q.delete("paid"); q.delete("cs");
      const rest = q.toString();
      window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));
      if (!st?.paid) { setBusy(false); setStufe(""); return; }
      void logTunnelEvent("payment_completed", "lebenslauf", { via: "stripe-return" });
      let entwurf: Entwurf | null = null;
      try { entwurf = JSON.parse(sessionStorage.getItem(ABLAGE) ?? "null"); } catch { /**/ }
      if (!entwurf?.genId || !entwurf.foto || !entwurf.cvPath) {
        setStatus(F.statusNotWork); setBusy(false); setStufe(""); return;
      }
      onSchrittChange(3);
      await nachZahlungFortsetzen(entwurf);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* DIE ANZEIGE VON DER LANDINGPAGE (Owner 25.08.2026: Feld auf /themes/lebenslauf,
     "Drunter Button Gratis weitermachen", Ablauf "Anzeige -> Deine Daten -> Prozent +
     Karte, wie im Tunnel - Ja") - der Einstieg reicht den eingefuegten Text ueber
     sessionStorage herein; der Anzeige-Schritt gilt damit als erledigt und es geht
     direkt bei "Deine Daten" weiter. Einmal gelesen, wird die Ablage geleert. */
  useEffect(() => {
    try {
      const t = (sessionStorage.getItem("lb_lebenslauf_anzeige") ?? "").trim();
      if (!t) return;
      sessionStorage.removeItem("lb_lebenslauf_anzeige");
      setAnzeige(t);
      setAnzeigeFertig(true);
    } catch { /**/ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * DER VIDEO-EINSTIEG VON DER FERTIGEN BEWERBUNG (Owner 25.08.2026: "link fuehrt doch
   * zur erstellung ... Es fuehrt zum Tunel."): `?video=<kennung>` heisst, der BESITZER
   * einer bezahlten Bewerbung kommt vom Satz-Link "erstelle jetzt dein Video." und will
   * NUR den Video-Teil — Skript lesen/aendern, Aufnahme hochladen; fertigstellen haengt
   * das Video an die BESTEHENDE Seite und fuehrt dorthin zurueck (Foto bleibt leer, die
   * Route laesst das vorhandene Portraet dann stehen). Besitz prueft der SERVER
   * (GET /api/lebenslauf-bewerbung -> darfAmProfilArbeiten); ein Fremder mit dem Link
   * landet einfach am normalen Tunnel-Anfang.
   */
  const videoEinstiegRef = useRef(false);
  useEffect(() => {
    if (videoEinstiegRef.current) return;
    let vid = "";
    try { vid = (new URLSearchParams(window.location.search).get("video") ?? "").trim(); } catch { /**/ }
    if (!vid) return;
    videoEinstiegRef.current = true;
    onSchrittChange(3);
    setBusy(true);
    void (async () => {
      let device = "", pin = "", tok = "";
      try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
      try { pin = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { /**/ }
      try { tok = getStoredAuthSession()?.access_token ?? ""; } catch { /**/ }
      const d = await fetch(`/api/lebenslauf-bewerbung?id=${encodeURIComponent(vid)}&device=${encodeURIComponent(device)}`, {
        headers: { ...(tok ? { Authorization: `Bearer ${tok}` } : {}), ...(pin ? { "x-try-look-admin-pin": pin } : {}) },
      }).then(r => r.json()).catch(() => null);
      setBusy(false);
      if (!d?.darf) { onSchrittChange(1); return; }
      setGenId(vid);
      /* Nie mit Leerem ueberschreiben: waehrend Dev-Remounts (AdminUrlMirror wechselt auf
         den /admin-Zwilling, Fast Refresh) laufen mehrere Instanzen dieses Effekts — eine
         leere oder alte Antwort darf ein schon gesetztes Skript nicht wieder ausradieren. */
      const t = String(d.sprechtext ?? "").trim();
      if (t) setSkript(v => v || t);
      setPhase("skript");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * TÜR 2 SPRINGT SCHRITT 1 GANZ ÜBER (Owner-Änderungsauftrag 26.08.2026: „kein
   * E-Mail-Tor vor dem CV-Upload"). Weder die Anzeige-Frage noch der E-Mail-Gate der
   * eigenen Anzeige (Tür 1) gehören zu diesem Einstieg — die Kennung steht längst (der
   * Kiss-Log-Effekt oben legt sie auch OHNE E-Mail an, rein über `lb_visitor`). BEWUSST
   * OHNE Einmal-Ref: reagiert auf JEDEN Sprung nach Schritt 1 (auch eine Zurück-Geste),
   * damit Tür 2 nie auf einem toten Schirm strandet — sobald `schritt` wieder 3 ist,
   * bleibt der Effekt ein No-op.
   */
  useEffect(() => {
    if (!jobsModus || schritt !== 1) return;
    onSchrittChange(3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobsModus, schritt]);

  const AT = texte;

  return (
    <>
      {/* Im Jobs-Modus KEINE Fortschritts-Striche (Owner: „ausser Chat nichts
          anderes") — die Kapitel-Anzeige „1/3" im Chat übernimmt das. */}
      {!jobsModus && <TunnelFortschritt schritte={[1, 3]} aktuell={schritt} />}

      {schritt === 1 && jobsModus && <div className="mt-8"><Laden art="flaeche" /></div>}

      {/* ───── DER NEUE EINSTIEG: DIE ANZEIGE (Owner 25.08.2026: „Die Seite muss so
          anfangen: Passt diese Jobanzeige zu mir?") — vor der E-Mail, kostenlos, mit
          kleinem Ausweg für Leute ohne Anzeige. NUR TÜR 1 (Owner-Änderungsauftrag
          26.08.2026: Tür 2 hat keine Anzeige-Frage). ───── */}
      {schritt === 1 && !jobsModus && !anzeigeFertig && (
        <div className="flex flex-col gap-3">
          <p className="text-[17px] font-black text-white/90">{AT.titel}</p>
          <p className="text-[13px] font-bold leading-snug text-white/70">{AT.zeile}</p>
          <EingabeMehrzeilig zeilen={4} value={anzeige} placeholder={AT.platzhalter}
            onChange={e => setAnzeige(e.target.value)} />
          <Knopf art="gold" disabled={!anzeige.trim()} onClick={() => setAnzeigeFertig(true)}>
            {AT.weiter}
          </Knopf>
          <button type="button" onClick={() => { setAnzeige(""); setAnzeigeFertig(true); }}
            className="text-center text-[11.5px] font-black uppercase tracking-[0.12em] text-white/45 transition hover:text-white/80">
            {AT.ohne}
          </button>
        </div>
      )}

      {schritt === 1 && !jobsModus && anzeigeFertig && (
        <TunnelStart
          produkt="lebenslauf"
          titel={F.tunnelStartTitel}
          nameLabel={F.tunnelName ?? F.namenFrage} namePlatzhalter={F.namenPlatzhalter}
          emailLabel={F.tunnelEmail ?? F.mailQuestion} emailPlatzhalter="you@email.com"
          weiterLabel={F.tunnelWeiter ?? F.next}
          google={{
            label: F.tunnelGoogle ?? "Continue with Google",
            oderLabel: F.tunnelOder ?? "or",
            onClick: () => {
              try {
                const jetzt = new URLSearchParams(window.location.search);
                const ziel = new URLSearchParams();
                ziel.set("s", "3");
                if (jetzt.get("light") === "1") ziel.set("light", "1");
                const code = jetzt.get("code") ?? "";
                if (code) ziel.set("code", code);
                sessionStorage.setItem("lb_oauth_return", `/themes/lebenslauf/start?${ziel.toString()}`);
              } catch { /**/ }
              try { signInWithOAuth("google", `${window.location.origin}/auth/confirm`); } catch { /**/ }
            },
          }}
          zurueckHref="/"
          lang={lang} anfangsName={name} anfangsEmail={mail} busy={leadBusy} fehlerAussen={leadFehler}
          onWeiter={async (n, e) => {
            if (!e.trim()) { setName(n); setMail(""); setLeadFehler(""); onSchrittChange(3); return; }
            setName(n); setMail(e); setLeadBusy(true); setLeadFehler("");
            try {
              let device = "";
              try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
              const r = await fetch("/api/kiss-claim", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: e, ...(n.trim() ? { name: n.trim() } : {}), device, theme: "lebenslauf", vorab: true, land: landAusZeitzone(), lang, consentAt: new Date().toISOString() }),
              });
              const d = await r.json().catch(() => ({}));
              if (!r.ok) { setLeadFehler(d?.error ?? F.statusNotWork); setLeadBusy(false); return; }
              try { localStorage.setItem("lb_kiss_mail", e); } catch { /**/ }
              setLeadBusy(false);
              onSchrittChange(3);
            } catch { setLeadFehler(F.statusNetwork); setLeadBusy(false); }
          }} />
      )}

      {schritt === 3 && (
        <div className="flex flex-col gap-4">
          {busy ? (
            /* DIE GROSSE STUFEN-ANZEIGE (Owner 20.08.2026: „es muss gross stehen was da
               gemacht wird") — ersetzt die ganze Eingabe-Fläche, solange die Kette läuft. */
            <div className="flex flex-col items-center gap-3">
              <Laden art="flaeche" text={(texte as unknown as Record<string, string>)[stufe] ?? texte.lesen} />
              <p className="text-[28px] font-black tabular-nums text-[#f6cf51]">{fortschritt}%</p>
              <div className="h-1.5 w-full max-w-[280px] overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-[#f6cf51] transition-all duration-700" style={{ width: `${fortschritt}%` }} />
              </div>
              <p className="text-[13px] font-bold text-white/50">{texte.bitteWarten}</p>
            </div>
          ) : phase === "ergebnis" && matchErgebnis ? (
            /* ───── SCHRITT 3: PROZENT + DIE KARTE (Owner 25.08.2026, präzisiert: „Schritt 3:
               Karte zeigen (Vorschau, Bearbeitung)") — er sieht sein ECHTES Dossier als
               Vorschau (Foto, Name, Rolle, Schwerpunkte, Profiltext), kann den Text
               bearbeiten, und der EINE Kaufknopf macht es dauerhaft. ───── */
            <div className="flex flex-col gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/40">{AT.chanceH}</p>
              {matchErgebnis.jobtitel && (
                <p className="-mt-2 text-[12px] font-black uppercase tracking-[0.1em] text-white/50">{matchErgebnis.jobtitel}</p>
              )}
              <div className="flex items-baseline gap-3">
                <p className="font-serif text-[44px] font-black leading-none text-white">{matchErgebnis.prozent}%</p>
                <p className="text-[11.5px] font-black uppercase tracking-[0.1em] text-white/60">
                  {ampelText}
                </p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-[#f6cf51] transition-all" style={{ width: `${matchErgebnis.prozent}%` }} />
              </div>

              {/* DIE KARTE — dieselbe Papier-Sprache wie das fertige Dossier (Elfenbein,
                  Serifen-Name, Haarlinien). Foto OBEN verankert (Skill `card`). */}
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/40">{AT.karteH}</p>
              <div className="lb-karte overflow-hidden rounded-[20px] shadow-[0_18px_50px_rgba(0,0,0,0.38)]">
                <div className="p-4">
                  {foto && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={foto} alt="" className="aspect-[3/4] w-full rounded-[14px] object-cover object-top" />
                  )}
                  <div className="px-1 pt-4">
                    {name.trim() && (
                      <p className="font-serif text-[24px] font-black uppercase leading-[1.05] tracking-[0.02em]">{name.trim()}</p>
                    )}
                    {karte?.rolle && (
                      <p className="mt-1.5 text-[13px] font-bold leading-snug opacity-80">{karte.rolle}</p>
                    )}
                    {!!karte?.schwerpunkte.length && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {karte.schwerpunkte.map(s => (
                          <span key={s} className="rounded-full border border-[#1a160f]/25 px-2 py-1 text-[9.5px] font-black uppercase tracking-[0.04em] opacity-75">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-4 border-t border-[#1a160f]/[0.11] pt-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] opacity-40">{AT.profilH}</p>
                        <button type="button" onClick={() => setKarteBearbeiten(b => !b)}
                          className="text-[10.5px] font-black uppercase tracking-[0.12em] opacity-55 transition hover:opacity-100">
                          {karteBearbeiten ? AT.fertigB : AT.bearbeiten}
                        </button>
                      </div>
                      {karteBearbeiten ? (
                        <EingabeMehrzeilig karte className="mt-2" zeilen={7} value={skript}
                          onChange={e => setSkript(e.target.value)} />
                      ) : (
                        <p className="mt-2 text-[13px] font-medium leading-[1.6] opacity-85">{skript}</p>
                      )}
                    </div>
                    {!!karte?.kompetenzen.length && (
                      <div className="mt-3.5 border-t border-[#1a160f]/[0.11] pt-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] opacity-40">{AT.kompetenzenH}</p>
                        <ul className="mt-1 grid grid-cols-2 gap-x-4">
                          {karte.kompetenzen.map(k => (
                            <li key={k} className="border-t border-[#1a160f]/[0.11] py-2 text-[11.5px] font-bold leading-snug opacity-80 first:border-t-0 [&:nth-child(2)]:border-t-0">{k}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {anforderungenAlle.length > 0 ? (
                /* DIE STRUKTUR-ANALYSE (Baustelle B) — vier Abschnitte statt der alten
                   zwei; bei einer schwachen Empfehlung steht die Hürde zuerst. Jeder
                   Abschnitt trägt zur Begründung eine zweite, leisere Zeile — genau der
                   Quereinsteiger-Verkaufsmoment bei „übertragbar" darf nicht gekürzt
                   werden. */
                anfGeordnet.filter(b => b.items.length > 0).map(b => (
                  <div key={b.key}>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">{b.h}</p>
                    <ul className="mt-1.5 flex flex-col gap-2">
                      {b.items.map((a, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[12.5px] font-bold leading-snug text-white/80">
                          <b.icon className={`mt-[2px] h-3.5 w-3.5 shrink-0 ${b.iconClass}`} />
                          <span>
                            {a.text}
                            {a.begruendung && <span className="mt-0.5 block text-[11.5px] font-medium leading-snug text-white/60">{a.begruendung}</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <>
                  {matchErgebnis.gruende.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">{AT.gruendeH}</p>
                      <ul className="mt-1.5 flex flex-col gap-1">
                        {matchErgebnis.gruende.slice(0, 3).map(g => (
                          <li key={g} className="flex items-start gap-1.5 text-[12.5px] font-bold leading-snug text-white/80">
                            <Check className="mt-[2px] h-3.5 w-3.5 shrink-0 text-white/55" />{g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {matchErgebnis.luecken.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">{AT.lueckenH}</p>
                      <ul className="mt-1.5 flex flex-col gap-1">
                        {matchErgebnis.luecken.slice(0, 3).map(g => (
                          <li key={g} className="flex items-start gap-1.5 text-[12.5px] font-bold leading-snug text-white/70">
                            <XIcon className="mt-[2px] h-3.5 w-3.5 shrink-0 text-white/40" />{g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
              {jobsModus ? (
                /* TÜR 2 — KEIN „Bewerbung erstellen", SONDERN „Ich bin interessiert"
                   (Owner-Änderungsauftrag 26.08.2026: kein Direkt-Bewerben mehr). Bei
                   `schwach` steht die Hürde bereits oben zuerst (siehe `anfGeordnet"),
                   hier bleibt nur der Knopf ein Umriss statt Gold. */
                <>
                  {matchErgebnis.empfehlung === "schwach" ? (
                    <Knopf art="umriss" disabled={busy} onClick={() => interesseStarten()}>{AT.interesseTrotzdem}</Knopf>
                  ) : (
                    <>
                      <p className="text-[13px] font-bold leading-snug text-white/70">{AT.interesseZeile}</p>
                      <Knopf art="gold" disabled={busy} onClick={() => interesseStarten()}>{AT.interesseCta}</Knopf>
                    </>
                  )}
                  <button type="button"
                    onClick={() => { setMatchErgebnis(null); setKarte(null); setKarteBearbeiten(false); setPhase("vorschlaege"); }}
                    className="text-center text-[11.5px] font-black uppercase tracking-[0.12em] text-white/45 transition hover:text-white/80">
                    {AT.andereChancen}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-[13px] font-bold leading-snug text-white/70">{AT.ctaZeile}</p>
                  <Knopf art="gold" disabled={busy} onClick={() => void starten()}>
                    {AT.cta}
                  </Knopf>
                  <button type="button"
                    onClick={() => { setMatchErgebnis(null); setKarte(null); setKarteBearbeiten(false); setPhase(""); setAnzeigeFertig(false); onSchrittChange(1); }}
                    className="text-center text-[11.5px] font-black uppercase tracking-[0.12em] text-white/45 transition hover:text-white/80">
                    {AT.andere}
                  </button>
                </>
              )}
            </div>
          ) : phase === "vorschlaege" ? (
            /* ───── DIE JOBCHANCEN-VORSCHLÄGE (Baustelle E) — je Karte Rolle · Land ·
               Remote · Sprachen · Kurzbeschreibung · Prozent+Etikett+Erklärung. KEIN
               Firmenname, KEINE Quelle, KEIN externer Link (Quellen-Compliance). ───── */
            (() => {
              const S = texte;
              const geordnet = [...vorschlaege].sort((a, b) => b.prozent - a.prozent);
              const remoteLabel = { remote: S.remoteRemote, hybrid: S.remoteHybrid, vorOrt: S.remoteVorOrt } as const;
              const etikettLabel = (v: Vorschlag) =>
                v.etikett === "realistisch" ? (v.quereinstieg ? S.etikettQuer : S.etikettGut)
                : v.etikett === "moeglich" ? S.etikettMoeglich : S.etikettSchwach;
              const zeigtMarktchance = chancenListe.some(c => !c.partnerFreigabe);
              return (
                <div className="flex flex-col gap-3">
                  {/* DANKE ZUERST (Owner: „Haben wir danke schön gesagt?") — mit Vornamen,
                      bevor die Chancen kommen. */}
                  {!!name.trim() && <p className="text-[26px] font-black leading-tight text-white">{S.dankeWort}, {name.trim().split(" ")[0]}!</p>}
                  {/* ÜBERSCHRIFT DER EINSCHÄTZUNG — nicht mehr „Diese Jobchancen könnten zu
                      dir passen" (27.08.2026, live gesehen): Es werden keine Stellen mehr
                      gezeigt, also darf die Zeile auch keine versprechen. Die alte
                      „Gerade keine Jobchancen im Pool"-Meldung ist ersatzlos weg — sie
                      erschien immer, seit die Chancen-Karten raus sind, und sagte dem
                      Bewerber fälschlich, es gäbe nichts für ihn. */}
                  <p className="text-[17px] font-black text-white/90">{S.einschaetzungTitel}</p>
                  <p className="text-[13px] font-bold leading-snug text-white/70">{S.einschaetzungZeile}</p>
                  {/* ═════ ERST DIE ANALYSE, DANN DIE CHECKLISTE (Owner-Auftrag
                      26.08.2026: „es gibt keine Analyse vor der Checkliste. Das fände ich
                      gut, mit Plus und Minus." · „ich fand die Checkliste gut, weil wir
                      keine echten Stellenanzeigen haben").

                      DIE PROZENT-KARTEN SIND HIER RAUS: Sie nannten Stellen mit
                      Passungs-Zahlen, für die niemand mit einer Firma gesprochen hatte.
                      Was bleibt, ist das, was wir wirklich einlösen können — eine ehrliche
                      Einschätzung seiner Lage und die Frage, wo wir für ihn suchen
                      sollen. ═════ */}
                  {/* DIE PROZENTE ZUERST (Owner 27.08.2026) — sie sind der Blickfang und
                      der Grund, warum jemand weiterliest. Darunter erst die Begründung. */}
                  {!!analyse?.richtungen?.length && (
                    <div className="lb-karte overflow-hidden rounded-[18px] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.38)]">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-45">{S.richtungenH}</p>
                      <div className="mt-2.5 flex flex-col gap-2.5">
                        {analyse.richtungen.map(r => (
                          <div key={r.rolle}>
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="text-[14px] font-black leading-snug">{r.rolle}</span>
                              <span className="shrink-0 text-[15px] font-black tabular-nums">{r.prozent}%</span>
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/10">
                              <div className="h-full rounded-full bg-[#1a160f]/70" style={{ width: `${r.prozent}%` }} />
                            </div>
                            {!!r.begruendung && (
                              <p className="mt-1 text-[12px] font-medium leading-snug opacity-65">{r.begruendung}</p>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="mt-3 text-[11px] font-medium leading-snug opacity-45">{S.richtungenHinweis}</p>
                    </div>
                  )}

                  {(!!analyse?.plus?.length || !!analyse?.minus?.length) && (
                    <div className="lb-karte overflow-hidden rounded-[18px] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.38)]">
                      {!!analyse?.plus?.length && (<>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-45">{S.plusH}</p>
                        <ul className="mt-1.5 flex flex-col gap-1.5">
                          {analyse.plus.map((z, i) => (
                            <li key={`p${i}`} className="flex gap-2 text-[13px] font-medium leading-snug">
                              <span className="lb-plus mt-[2px]">+</span>{z}
                            </li>
                          ))}
                        </ul>
                      </>)}
                      {!!analyse?.minus?.length && (<>
                        <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] opacity-45">{S.minusH}</p>
                        <ul className="mt-1.5 flex flex-col gap-1.5">
                          {analyse.minus.map((z, i) => (
                            <li key={`m${i}`} className="flex gap-2 text-[13px] font-medium leading-snug">
                              <span className="lb-minus mt-[2px]">−</span>{z}
                            </li>
                          ))}
                        </ul>
                      </>)}
                      {!!analyse?.fazit && (
                        <p className="mt-3 border-t border-black/10 pt-2.5 text-[13px] font-bold leading-snug">{analyse.fazit}</p>
                      )}
                    </div>
                  )}

                  {/* DAS PREMIUM-PAKET — direkt an die Minuspunkte geknüpft (Owner
                      26.08.2026: „er kann das buchen, um die Punkte zu verbessern"). */}
                  {!!analyse?.minus?.length && (
                    <div className="rounded-2xl border border-[#f6cf51]/40 bg-[#f6cf51]/[0.07] p-4">
                      <p className="text-[15px] font-black text-[#f6cf51]">{S.premiumH}</p>
                      <p className="mt-1.5 text-[13px] font-bold leading-snug text-white/70">{S.premiumZeile}</p>
                      <ul className="mt-3 flex flex-col gap-1.5">
                        {[S.premiumP1, S.premiumP2, S.premiumP3].map(z => (
                          <li key={z} className="flex items-start gap-2 text-[13px] font-bold text-white/80">
                            <span className="mt-[3px] text-[#f6cf51]">✓</span>{z}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-3 text-[13px] font-black text-white/85">{eur(PREMIUM_BERATUNG_CENTS, lang)}</p>
                      {!premiumDa ? (<>
                        {!telefonChat.trim() && (
                          <div className="mt-3">
                            <p className="text-[12px] font-bold text-white/55">{S.premiumTelefonH}</p>
                            <Eingabe className="mt-1.5" type="tel" placeholder={S.telefonPlatzhalter}
                              value={premiumTelefon} onChange={e => setPremiumTelefon(e.target.value)} />
                          </div>
                        )}
                        <div className="mt-3">
                          <Knopf art="gold" disabled={premiumLaeuft || (!telefonChat.trim() && premiumTelefon.trim().length < 6)}
                            onClick={() => void premiumMerken()}>{S.premiumCta}</Knopf>
                        </div>
                        <p className="mt-2 text-[11.5px] font-bold text-white/40">{S.premiumKleinText}</p>
                      </>) : (
                        <div className="mt-3 rounded-xl border border-[#f6cf51]/40 bg-[#f6cf51]/10 p-3">
                          <p className="text-[13.5px] font-black text-[#f6cf51]">{S.premiumDanke}</p>
                          <p className="mt-1 text-[12.5px] font-bold text-white/60">{S.premiumDankeZeile}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* DIE CHECKLISTE — Branchen, keine erfundenen Stellen. */}
                  <p className="mt-2 text-[15px] font-black text-white/90">{S.checklisteH}</p>
                  <p className="text-[13px] font-bold leading-snug text-white/60">{S.checklisteZeile}</p>
                  <div className="flex flex-col gap-2">
                    {BRANCHEN_SCHLUESSEL.map(bx => {
                      const an = branchenWahl.includes(bx);
                      return (
                        <button key={bx} type="button"
                          onClick={() => { setGesendet(false); setBranchenWahl(v => an ? v.filter(x => x !== bx) : [...v, bx]); }}
                          className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 text-left transition ${
                            an ? "border-[#f6cf51]/50 bg-[#f6cf51]/10" : "border-white/15 bg-white/[0.04]"}`}>
                          <span className="text-[14px] font-black text-white/90">{BRANCHEN_QUELLE[bx]}</span>
                          <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 ${
                            an ? "border-[#f6cf51] bg-[#f6cf51]" : "border-white/30"}`}>
                            {an && <span className="text-[12px] font-black text-[#1a160f]">✓</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {!gesendet ? (
                    <div className="mt-1">
                      <Knopf art="gold" disabled={branchenWahl.length === 0 || sendetBranchen}
                        onClick={() => void branchenSenden()}>
                        {sendetBranchen ? S.sendet : `${S.checklisteCta} (${branchenWahl.length})`}
                      </Knopf>
                    </div>
                  ) : (
                    <div className="mt-1 rounded-2xl border border-[#f6cf51]/40 bg-[#f6cf51]/10 p-4 text-center">
                      <p className="text-[15px] font-black text-[#f6cf51]">{S.checklisteDanke}</p>
                      <p className="mt-1 text-[13px] font-bold text-white/70">{S.checklisteMelden}</p>
                    </div>
                  )}

                  {/* KI-Richtungen tragen ihren eigenen ehrlichen Hinweis; Pool-Marktchancen
                      den bisherigen (Quellen-Compliance). */}
                  {chancenListe.some(c => c.id.startsWith("ki-"))
                    ? <p className="mt-1 text-center text-[11px] font-medium leading-snug text-white/40">{S.richtungenHinweis}</p>
                    : zeigtMarktchance && (
                      <p className="mt-1 text-center text-[11px] font-medium leading-snug text-white/40">{S.marktHinweis}</p>
                    )}

                  {/* ═════ DIE KARTE — das Spielergebnis (Owner: „Es soll wie ein Gaming
                      funktionieren. Am Ende muss eine Karte herauskommen, die er speichert
                      oder die ich den Firmen vorstellen kann, wenn er das erlaubt."):
                      EIN Abschluss statt der Fragenkaskade — Freigabe ist EIN Klick (alles
                      Weitere weiss der Chat längst), gespeichert ist sie ohnehin (E-Mail),
                      und „Nochmal von vorn" startet das Spiel neu. ═════ */}
                  <div className="lb-karte mt-4 overflow-hidden rounded-[20px] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.38)]">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">{S.karteTitel}</p>
                    <p className="mt-1 font-serif text-[24px] font-black uppercase leading-tight tracking-[0.02em]">{name.trim() || "—"}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded-full border border-[#1a160f]/25 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.06em]">{S.karteDeutsch}: {deutschChat || "—"}</span>
                    </div>
                    <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] opacity-45">{S.karteWill}</p>
                    <p className="text-[13px] font-bold leading-snug opacity-85">{richtungen.join(" · ") || "—"}</p>
                    <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] opacity-45">{S.karteKann}</p>
                    <p className="text-[13px] font-bold leading-snug opacity-85">{faehigkeitenChat.join(" · ") || "—"}</p>
                    {!!traum.trim() && (
                      <>
                        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] opacity-45">{S.karteTraum}</p>
                        <p className="text-[13px] font-bold leading-snug opacity-85">{traum.trim()}</p>
                      </>
                    )}
                    <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] opacity-45">{S.karteChancen}</p>
                    <div className="mt-1 flex flex-col gap-1">
                      {geordnet.slice(0, 3).map(v => {
                        const c = chancenListe.find(x => x.id === v.chanceId);
                        if (!c) return null;
                        return (
                          <div key={v.chanceId} className="flex items-baseline justify-between gap-2">
                            <span className="text-[13px] font-bold leading-snug">{c.rolle}</span>
                            <span className="shrink-0 text-[13px] font-black opacity-70">{v.prozent}%</span>
                          </div>
                        );
                      })}
                    </div>

                    {einwilligungStatus === "erteilt" ? (
                      <div className="mt-4 rounded-xl border border-[#1a160f]/15 bg-[#1a160f]/[0.04] px-3 py-2.5">
                        <p className="text-[13px] font-black">{S.statusFrei}</p>
                        <p className="mt-0.5 text-[12px] font-medium leading-snug opacity-70">{S.freiZeile}</p>
                        {/* Das Dankeschön nach der Freigabe (Owner). */}
                        <p className="mt-1 text-[12.5px] font-black">{S.freiDanke}</p>
                      </div>
                    ) : (
                      <div className="mt-4">
                        <Knopf art="gold" karte disabled={busy} onClick={() => {
                          setEinwilligungStatus("erteilt");
                          void kandidatSpeichern({ einwilligungStatus: "erteilt" });
                          void logFunnelEvent("candidate_consent_given", { theme: "lebenslauf" });
                        }}>
                          {S.freigebenCta}
                        </Knopf>
                        <p className="mt-1.5 text-center text-[11px] font-medium leading-snug opacity-60">{S.einwilligungZeile}</p>
                      </div>
                    )}
                  </div>
                  <p className="text-center text-[11.5px] font-bold leading-snug text-white/55">{S.karteGespeichert}</p>
                  {/* DEUTLICH, NICHT VERSTECKT (Owner: „Nochmal von vorn muss deutlicher
                      werden") — ein richtiger Umriss-Knopf; Gold bleibt der Freigabe
                      vorbehalten (ci-design: genau EIN Gold je Schirm). */}
                  <Knopf art="umriss" onClick={nochmalVonVorn}>
                    {S.nochmal}
                  </Knopf>
                </div>
              );
            })()
          ) : phase === "interesse" ? (
            /* ───── DIE KLICK-FRAGEN (Baustelle F) — eine Frage je Schirm, nie ein
               Formular. `interesseSchritt` zählt durch: 0 Umzug · 1 Länder (nur bei
               ja/vielleicht) · 2 Start · 3 Arbeitsform · 4 Gehalt · 5 Rollen ·
               6 Einwilligung. ───── */
            (() => {
              const S = texte;
              const chipToggle = (liste: string[], setListe: (v: string[]) => void, wert: string) =>
                setListe(liste.includes(wert) ? liste.filter(x => x !== wert) : [...liste, wert]);
              const weiterZuUmzugLaendern = umzug === "ja" || umzug === "vielleicht";

              if (interesseSchritt === 0) {
                return (
                  <div className="flex flex-col gap-3">
                    <p className="text-[17px] font-black text-white/90">{S.frageUmzug}</p>
                    <div className="flex flex-wrap gap-2">
                      {(["ja", "vielleicht", "nein"] as const).map(w => (
                        <Knopf key={w} art="chip" aktiv={umzug === w} onClick={() => {
                          setUmzug(w);
                          void logFunnelEvent("relocation_answered", { theme: "lebenslauf", antwort: w });
                          void kandidatSpeichern({ umzug: w });
                          setInteresseSchritt(w === "nein" ? 2 : 1);
                        }}>
                          {w === "ja" ? S.umzugJa : w === "vielleicht" ? S.umzugVielleicht : S.umzugNein}
                        </Knopf>
                      ))}
                    </div>
                  </div>
                );
              }
              if (interesseSchritt === 1 && weiterZuUmzugLaendern) {
                return (
                  <div className="flex flex-col gap-3">
                    <p className="text-[17px] font-black text-white/90">{S.frageLaender}</p>
                    <div className="flex flex-wrap gap-2">
                      {UMZUG_LAENDER.map(l => (
                        <Knopf key={l} art="chip" aktiv={umzugLaender.includes(l)} onClick={() => chipToggle(umzugLaender, setUmzugLaender, l)}>{l}</Knopf>
                      ))}
                    </div>
                    <Knopf art="gold" onClick={() => { void kandidatSpeichern({ umzugLaender }); setInteresseSchritt(2); }}>{S.naechsteFrage}</Knopf>
                  </div>
                );
              }
              if (interesseSchritt === 2) {
                return (
                  <div className="flex flex-col gap-3">
                    <p className="text-[17px] font-black text-white/90">{S.frageStart}</p>
                    <div className="flex flex-wrap gap-2">
                      {(["sofort", "2wochen", "1monat", "spaeter"] as const).map(w => (
                        <Knopf key={w} art="chip" aktiv={verfuegbarkeit === w} onClick={() => { setVerfuegbarkeit(w); void kandidatSpeichern({ verfuegbarkeit: w }); setInteresseSchritt(3); }}>
                          {w === "sofort" ? S.startSofort : w === "2wochen" ? S.start2Wochen : w === "1monat" ? S.start1Monat : S.startSpaeter}
                        </Knopf>
                      ))}
                    </div>
                  </div>
                );
              }
              if (interesseSchritt === 3) {
                return (
                  <div className="flex flex-col gap-3">
                    <p className="text-[17px] font-black text-white/90">{S.frageArbeitsform}</p>
                    <div className="flex flex-wrap gap-2">
                      {(["remote", "hybrid", "vorOrt", "egal"] as const).map(w => (
                        <Knopf key={w} art="chip" aktiv={arbeitsform.includes(w)} onClick={() => chipToggle(arbeitsform, setArbeitsform, w)}>
                          {w === "remote" ? S.remoteRemote : w === "hybrid" ? S.remoteHybrid : w === "vorOrt" ? S.remoteVorOrt : S.remoteEgal}
                        </Knopf>
                      ))}
                    </div>
                    <Knopf art="gold" onClick={() => { void kandidatSpeichern({ arbeitsform }); setInteresseSchritt(4); }}>{S.naechsteFrage}</Knopf>
                  </div>
                );
              }
              if (interesseSchritt === 4) {
                return (
                  <div className="flex flex-col gap-3">
                    <p className="text-[17px] font-black text-white/90">{S.frageGehalt}</p>
                    <Eingabe value={gehaltswunsch} onChange={e => setGehaltswunsch(e.target.value)} />
                    <Knopf art="gold" onClick={() => { void kandidatSpeichern({ gehaltswunsch }); setInteresseSchritt(5); }}>{S.naechsteFrage}</Knopf>
                    <button type="button" onClick={() => setInteresseSchritt(5)}
                      className="text-center text-[11.5px] font-black uppercase tracking-[0.12em] text-white/45 transition hover:text-white/80">
                      {S.gehaltUeberspringen}
                    </button>
                  </div>
                );
              }
              if (interesseSchritt === 5) {
                const rollen = Array.from(new Set([...(karte?.rolle ? [] : []), ...rollenAuswahl, ...(gewaehlteChance ? [gewaehlteChance.kategorie] : [])]));
                return (
                  <div className="flex flex-col gap-3">
                    <p className="text-[17px] font-black text-white/90">{S.frageRollen}</p>
                    <div className="flex flex-wrap gap-2">
                      {rollen.filter(Boolean).map(r => (
                        <Knopf key={r} art="chip" aktiv={rollenAuswahl.includes(r)} onClick={() => chipToggle(rollenAuswahl, setRollenAuswahl, r)}>{r}</Knopf>
                      ))}
                    </div>
                    <Knopf art="gold" onClick={() => {
                      void logFunnelEvent("candidate_profile_completed", { theme: "lebenslauf" });
                      void kandidatSpeichern({ empfohleneRollen: rollenAuswahl });
                      setInteresseSchritt(6);
                    }}>{S.naechsteFrage}</Knopf>
                  </div>
                );
              }
              /* interesseSchritt === 6 — DIE EINWILLIGUNG (Häkchen NIE vorausgewählt). */
              return (
                <div className="flex flex-col gap-3">
                  <p className="text-[17px] font-black text-white/90">{S.einwilligungTitel}</p>
                  <button type="button" onClick={() => setEinwilligungHaken(v => !v)}
                    className="lb-karte-rahmen flex items-start gap-2.5 rounded-2xl p-3.5 text-left transition active:scale-[0.99]">
                    <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 ${einwilligungHaken ? "border-[#f6cf51] bg-[#f6cf51]" : "border-white/40"}`}>
                      {einwilligungHaken && <Check className="h-3.5 w-3.5 text-[#1a160f]" />}
                    </span>
                    <span className="text-[13px] font-bold leading-snug text-white/85">{S.einwilligung}</span>
                  </button>
                  <p className="text-[11.5px] font-medium leading-snug text-white/45">{S.einwilligungZeile}</p>
                  <Knopf art="gold" disabled={!einwilligungHaken || busy} onClick={async () => {
                    setEinwilligungStatus("erteilt");
                    void logFunnelEvent("candidate_consent_given", { theme: "lebenslauf" });
                    await kandidatSpeichern({ einwilligungStatus: "erteilt" });
                    void logFunnelEvent("candidate_pool_added", { theme: "lebenslauf" });
                    void mappeErzeugen();
                  }}>{S.naechsteFrage}</Knopf>
                  <button type="button" disabled={busy} onClick={async () => {
                    setEinwilligungStatus("abgelehnt");
                    void logFunnelEvent("candidate_consent_declined", { theme: "lebenslauf" });
                    await kandidatSpeichern({ einwilligungStatus: "abgelehnt" });
                    void mappeErzeugen();
                  }}
                    className="text-center text-[11.5px] font-black uppercase tracking-[0.12em] text-white/45 transition hover:text-white/80">
                    {S.ohneFreigabe}
                  </button>
                </div>
              );
            })()
          ) : phase === "fertig" ? (
            /* ───── DER ERFOLGS-SCHIRM (Baustelle F) — NIE „Bewerbung verschickt": das
               Profil ist vorbereitet, nichts ist eingereicht. ───── */
            (() => { const S = texte; return (
              <div className="flex flex-col gap-3">
                <p className="text-[17px] font-black text-white/90">{S.fertigTitel}</p>
                <p className="text-[13px] font-bold leading-snug text-white/70">{S.fertigZeile}</p>
                {matchErgebnis && (
                  <div className="flex items-baseline gap-3">
                    <p className="font-serif text-[32px] font-black leading-none text-white">{matchErgebnis.prozent}%</p>
                  </div>
                )}
                <div className={`rounded-2xl border p-3.5 ${einwilligungStatus === "erteilt" ? "border-[#f6cf51]/40 bg-[#f6cf51]/10" : "border-white/20 bg-white/5"}`}>
                  <p className={`text-[12px] font-black uppercase tracking-[0.08em] ${einwilligungStatus === "erteilt" ? "text-[#f6cf51]" : "text-white/70"}`}>
                    {einwilligungStatus === "erteilt" ? S.statusFrei : S.statusPrivat}
                  </p>
                  {einwilligungStatus === "erteilt" && <p className="mt-1 text-[12px] font-medium leading-snug text-white/60">{S.freiZeile}</p>}
                </div>
                {einwilligungStatus !== "erteilt" && (
                  <Knopf art="gold" onClick={async () => {
                    setEinwilligungStatus("erteilt");
                    void logFunnelEvent("candidate_consent_given", { theme: "lebenslauf" });
                    await kandidatSpeichern({ einwilligungStatus: "erteilt" });
                    void logFunnelEvent("candidate_pool_added", { theme: "lebenslauf" });
                  }}>{S.freigebenCta}</Knopf>
                )}
                {mappeUrl && (
                  <a href={mappeUrl} onClick={() => void logFunnelEvent("cv_pdf_downloaded", { theme: "lebenslauf" })}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/25 px-5 py-1.5 text-center text-[13px] font-black leading-tight text-white/85 transition active:scale-95">
                    {S.cvLaden}
                  </a>
                )}
              </div>
            ); })()
          ) : phase === "skript" ? (
            /* ───── SCHRITT „DEIN SKRIPT" (Owner-Seitentext: „Du änderst ihn, bis er nach
               dir klingt") — bezahlt ist schon; hier wird gelesen und umgeschrieben. ───── */
            (() => { const S = texte; return (
              <div className="flex flex-col gap-3">
                <p className="text-[17px] font-black text-white/90">{S.skriptTitel}</p>
                <p className="text-[13px] font-bold leading-snug text-white/70">{S.skriptZeile}</p>
                <EingabeMehrzeilig zeilen={9} value={skript}
                  onChange={e => setSkript(e.target.value)} />
                <Knopf art="gold" disabled={!skript.trim()} onClick={() => void skriptWeiter()}>
                  {S.skriptWeiter}
                </Knopf>
              </div>
            ); })()
          ) : phase === "aufnahme" ? (
            /* ───── SCHRITT „EINSPRECHEN" (Owner-Seitentext: „Handykamera reicht … du liest
               ab, so oft du willst"). Das Skript steht zum ABLESEN über der Kachel. ───── */
            (() => { const S = texte; return (
              <div className="flex flex-col gap-3">
                <p className="text-[17px] font-black text-white/90">{S.aufnahmeTitel}</p>
                <p className="text-[13px] font-bold leading-snug text-white/70">{S.aufnahmeZeile}</p>
                <p className="max-h-44 overflow-y-auto rounded-lg border border-white/15 bg-white/[0.05] px-3 py-2.5 text-[13.5px] font-medium leading-relaxed text-white/85 lb-wisch">
                  {skript}
                </p>
                {/* UPLOAD LINKS, VORLAGE RECHTS (Owner 25.08.2026: "hier brauche ich die
                    Upload links Vorlage rechts. Wie bei unserem tunel (Promise)") — dieselbe
                    Reihe wie im Kuss-/Versprechen-Tunnel: Kachel -> Pfeil -> Vorlagen-Kachel;
                    die Vorlage ist das Beispielvideo des Hauses und zeigt, WIE so eine
                    Aufnahme aussieht, bevor man die eigene hochlaedt. */}
                <div className="flex items-stretch gap-3">
                  <div className="min-w-0 flex-1">
                    <DateiKachel datei={aufnahmeDatei} icon={Video}
                      titel={S.aufnahmeKachel}
                      hinweis={aufnahmeDatei && !aufnahmePath ? S.aufnahmeLaedt : S.aufnahmeHinweis}
                      onWaehlen={() => aufnahmeRef.current?.click()}
                      onLoeschen={() => { setAufnahmeDatei(null); setAufnahmePath(""); }} />
                  </div>
                  <ChevronRight className="h-6 w-6 shrink-0 self-center opacity-60" />
                  <div className="w-[26vw] min-w-[72px] max-w-[118px] shrink-0 self-center">
                    <VorlagenKachel bildUrl={LEBENSLAUF_BEISPIEL_POSTER} videoUrl={LEBENSLAUF_BEISPIEL_VIDEO}
                      ansehenLabel={F.vorlageAnsehen} sprache={lang} titel={EXECUTIVE_BEISPIEL.name} />
                  </div>
                </div>
                <Knopf art="gold" disabled={!aufnahmePath} onClick={() => void seiteBauen()}>
                  {S.seiteBauen}
                </Knopf>
                <button type="button" onClick={() => setPhase("skript")}
                  className="text-center text-[11.5px] font-black uppercase tracking-[0.12em] text-white/45 transition hover:text-white/80">
                  {S.zurueckSkript}
                </button>
              </div>
            ); })()
          ) : jobsModus ? (
            /* ═════ DER KLICK-CHAT — „Ich will. Ich kann. Ich heisse." (einfache Fassung,
               Nachtrag 6). Ein Verlauf, eine Frage zur Zeit, Antworten nur per Klick;
               beantwortete Fragen bleiben als kompakte Zeilen stehen. ═════ */
            (() => {
              const S = texte;
              /* HART DEUTSCH — der ECHTE Test (Owner: „muss ein richtiger Test sein"):
                 zwei Verständnisfragen mit je zwei Antworten; das Niveau wird aus den
                 richtigen Antworten abgeleitet. NIE übersetzen — Verstehen IST der Test. */
              const RICHTUNGEN = [S.rSupport, S.rBackoffice, S.rVerkauf, S.rTechnik, S.rTourismus, S.rLogistik, S.rEgal];
              const BRANCHEN = [S.bHandel, S.bGastro, S.bBuero, S.bIT, S.bPflege, S.bHandwerk, S.bFahren, S.bAnderes];
              const KOENNEN = [S.fkKunden, S.fkOrganisieren, S.fkTechnik, S.fkVerkaufen, S.fkFuehren, S.fkSchreiben, S.fkZahlen];
              /* Altersgruppen und Jahre stehen als Zahlen da — nur „unter 1" ist ein Wort
                 und wird deshalb übersetzt. */
              const JAHRE = [S.jahreUnter1, "1–3", "3–5", "5–10", "10+"];
              const ABSCHLUSS = [S.abSchule, S.abLehre, S.abAbitur, S.abStudium];
              const FUEHRERSCHEIN = [S.fsKeiner, S.fsB, S.fsC, S.fsCE, S.fsD];
              const SUCHE_OPTIONEN = [
                { wert: "sofort", label: S.sucheSofort },
                { wert: "monate", label: S.sucheMonate },
                { wert: "schauen", label: S.sucheSchauen },
              ];
              const AF = [
                { wert: "remote", label: S.remoteRemote }, { wert: "hybrid", label: S.remoteHybrid },
                { wert: "vorOrt", label: S.remoteVorOrt }, { wert: "egal", label: S.remoteEgal },
              ];
              const UMZUG = [
                { wert: "ja", label: S.umzugJa }, { wert: "vielleicht", label: S.umzugVielleicht }, { wert: "nein", label: S.umzugNein },
              ];
              const START = [
                { wert: "sofort", label: S.startSofort }, { wert: "2wochen", label: S.start2Wochen },
                { wert: "1monat", label: S.start1Monat }, { wert: "spaeter", label: S.startSpaeter },
              ];
              const toggle = (liste: string[], set: (v: string[]) => void, wert: string) =>
                set(liste.includes(wert) ? liste.filter(x => x !== wert) : [...liste, wert]);
              const weiter = () => setChatSchritt(s => s + 1);

              /* Der Verlauf — beantwortete Fragen kompakt; ANTIPPBAR zum Ändern (Owner:
                 „er kann wieder zurück und was anderes anklicken, zu sehen, ob die
                 Punktzahl steigt" — `s` ist der Schritt, zu dem die Zeile zurückführt;
                 spätere Antworten bleiben stehen und sind beim Vorklicken schon gewählt). */
              const erledigt: { frage: string; antwort: string; s: number }[] = [];
              if (chatSchritt > 0) erledigt.push({ s: 0, frage: S.fRichtung, antwort: richtungen.join(" · ") });
              if (chatSchritt > 1) erledigt.push({ s: 1, frage: S.frageArbeitsform, antwort: arbeitsformChat.map(w => AF.find(a => a.wert === w)?.label ?? w).join(" · ") });
              if (chatSchritt > 2) erledigt.push({ s: 2, frage: S.frageUmzug, antwort: UMZUG.find(u => u.wert === umzugChat)?.label ?? "" });
              if (chatSchritt > 3) erledigt.push({ s: 3, frage: S.frageStart, antwort: START.find(u => u.wert === startChat)?.label ?? "" });
              if (chatSchritt > 4) erledigt.push({ s: 4, frage: S.fTraum, antwort: traum.trim() || "—" });
              if (chatSchritt > 5) erledigt.push({ s: 5, frage: S.fZuletzt, antwort: zuletztChat.join(" · ") });
              if (chatSchritt > 6) erledigt.push({ s: 6, frage: S.fFaehigkeiten, antwort: faehigkeitenChat.join(" · ") });
              if (chatSchritt > 9) erledigt.push({ s: 9, frage: S.fCv, antwort: cvPath ? (cvDatei?.name ?? "CV") : S.cvNein });
              if (chatSchritt > 10) erledigt.push({ s: 10, frage: S.fFoto, antwort: foto ? S.fotoDa : S.fotoSpaeter });
              if (chatSchritt > 11) erledigt.push({ s: 11, frage: S.fVideo, antwort: videoMeinung === "ja" ? S.videoJa : videoMeinung === "unsicher" ? S.videoUnsicher : S.videoNein });
              if (chatSchritt > 12) erledigt.push({ s: 12, frage: S.fAlter, antwort: alterChat });
              if (chatSchritt > 13 && jahreChat) erledigt.push({ s: 13, frage: S.fJahre, antwort: jahreChat });
              if (chatSchritt > 14 && abschlussChat) erledigt.push({ s: 14, frage: S.fAbschluss, antwort: abschlussChat });
              if (chatSchritt > 15) erledigt.push({ s: 15, frage: S.fFuehrerschein, antwort: fuehrerscheinChat.join(" · ") });
              if (chatSchritt > 16) erledigt.push({ s: 16, frage: S.fWohnort, antwort: wohnortChat });
              if (chatSchritt > 17) erledigt.push({ s: 17, frage: S.fTelefon, antwort: telefonChat });
              /* „1/3 · Ich will" statt einer nackten Pille (Owner: „und was ist Ich
                 will?") — mit Zählung liest sie sich als Fortschritt, nicht als Rätsel. */
              const kapitelNr = chatSchritt <= 4 ? 1 : chatSchritt <= 11 ? 2 : 3;
              const kapitel = `${kapitelNr}/3 · ${chatSchritt <= 4 ? S.kapWill : chatSchritt <= 11 ? S.kapKann : S.kapHeisse}`;

              /* DIE CHANCEN-PUNKTE (Owner: „Punkte sammeln … ob die Punktzahl steigt") —
                 eine EHRLICHE Spielwährung: sie misst, wie viele Türen er sich öffnet
                 (Flexibilität, Sprache, Fähigkeiten), NIE den Match einer Stelle — der
                 kommt später ehrlich in Prozent von der Analyse. */
              /* „Egal"/„Zeig mir, was geht" = ALLE Türen offen — zählt wie die volle
                 Auswahl, nie weniger (Owner, mit Bild: „Egal dürfte nicht weniger Punkte
                 haben als Remote und Hybrid"). */
              const punkte =
                (richtungen.includes(S.rEgal) ? 48 : richtungen.length * 8) +
                (arbeitsformChat.includes("egal") ? 18 : arbeitsformChat.length * 6) +
                (umzugChat === "ja" ? 20 : umzugChat === "vielleicht" ? 10 : 0) +
                (startChat === "sofort" ? 15 : startChat === "2wochen" ? 10 : startChat === "1monat" ? 6 : startChat === "spaeter" ? 2 : 0) +
                faehigkeitenChat.length * 6 +
                (deutschChat.startsWith("Sehr") ? 25 : deutschChat.startsWith("Gut") ? 15 : deutschChat ? 5 : 0) +
                (cvPath ? 10 : 0) + (foto ? 8 : 0) + (videoMeinung === "ja" ? 5 : 0) + (traum.trim() ? 5 : 0);

              /* Chip-Farben für die CREME-Karte (Memory lb-karte-important-frisst-
                 inline-farben: nie text-white/… hier — die Schrift erbt das Karten-
                 Dunkel, Zustände laufen über Border/Fläche und Opacity). */
              /* Aktiv = Blasen-Schwarz (eigene Vorrang-Klasse, s. globals) — Gold als
                 Aktiv-Farbe wurde in der hellen Fassung blau umgefärbt, der Goldrand
                 blieb stehen (Owner: „gelber rand passt nicht"). */
              const chip = (aktiv: boolean) =>
                `rounded-full border px-3.5 py-2 text-[13px] font-black transition active:scale-95 ${aktiv
                  ? "lb-jobs-chip-aktiv"
                  : "border-black/15 bg-white text-black/75"}`;

              /* Die AKTUELLE Frage zerfällt in zwei Teile: die BLASE (steht im
                 scrollenden Verlauf, wie eine Nachricht) und die AKTIONEN (Chips /
                 Eingaben / Weiter) — die sitzen FIX unten am Fensterrand, wie die
                 Eingabezeile bei WhatsApp (Owner: „wieso steht weiter nicht unten am
                 Rand?"). */
              const blase = (text: string, hinweis?: string) => (
                <div className="flex justify-start"><div className="max-w-[82%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-[13px] font-medium text-black ring-1 ring-black/10">{text}{hinweis ? <span className="mt-0.5 block text-[11px] font-bold text-black/45">{hinweis}</span> : null}</div></div>
              );
              let frageBlase: ReactNode = null;
              let aktionen: ReactNode = null;
              /**
               * DAS E-MAIL-TOR AM ANFANG (Owner 26.08.2026: „wenn man ein
               * Meta-Sofortformular nimmt, dann können sie gar nicht weiter ohne E-Mail.
               * So machen wir jetzt auch und zwar ganz am Anfang.")
               *
               * DAS HEBT DIE AUSNAHME AUF, die für diese Tür galt (Adresse erst nach der
               * Analyse). Grund steht im Log: Von 21 Werbe-Besuchern an einem Tag haben 11
               * im Chat geantwortet, und übrig blieb ein einziger Datensatz — und der ohne
               * alles, womit man arbeiten könnte. Wer nicht erreichbar ist, ist kein Lead.
               *
               * KEINE UMNUMMERIERUNG: Das Tor sitzt VOR der Schrittkette, nicht in ihr —
               * `chatSchritt` bleibt unverändert, alle Rücksprünge im Verlauf stimmen
               * weiter. Erst wenn Name und E-Mail stehen, beginnt Frage 0.
               */
              if (!torOffen && cvAbgelehnt) {
                /* DIE ABSAGE (Owner 27.08.2026: "sagt er nein, dann: es tut uns leid, ohne
                   bist du nicht qualifiziert, wir brauchen deine Vita, um eine Analyse zu
                   machen") — kein Chat-Weg mehr ohne CV, kein Ausweg-Knopf. */
                frageBlase = blase(S.fCvAbsageTitel, S.fCvAbsageText);
                aktionen = null;
              } else if (!torOffen && torSchritt === 0) {
                /* EIN Schirm, drei Angaben — wie ein Meta-Sofortformular. */
                frageBlase = blase(S.fNameMail, S.nameMailHinweis);
                aktionen = (<>
                  <input placeholder="Anna" value={name} onChange={e => setName(e.target.value)}
                    className="w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-[13px] font-medium text-black outline-none placeholder:text-black/35 focus:border-black/40" />
                  <input type="email" placeholder="you@email.com" value={mail}
                    onChange={e => { setMail(e.target.value); if (leadFehler) setLeadFehler(""); }}
                    className="w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-[13px] font-medium text-black outline-none placeholder:text-black/35 focus:border-black/40" />
                  {leadFehler && <p role="alert" className="lb-karte-fehler text-[12.5px] font-black leading-snug">{leadFehler}</p>}
                  <Knopf art="gold" karte disabled={!name.trim() || !mailOk}
                    onClick={() => { setTorSchritt(1); void logFunnelEvent("lead_created", { theme: "lebenslauf", via: "tor" }); }}>
                    {S.naechsteFrage}
                  </Knopf>
                  <p className="text-center font-serif text-[11px] leading-snug text-black/50">
                    <KurzeEinwilligung tpl={F.consentKurz} linkLabel={F.agbLink} />
                  </p>
                </>);
              } else if (!torOffen && torSchritt === 1) {
                /* DIE CV-PFLICHT, GANZ AM ANFANG (Owner 27.08.2026: "wir fragen ihn
                   anfangen hast du eine CV? ... ohne CV-Upload machen wir gar nicht
                   weiter") — vor dem Deutschtest, nicht erst tief im Chat. */
                frageBlase = blase(S.fCvVorab, S.fCvVorabHinweis);
                aktionen = (<>
                  {cvDatei && !cvPath && <p className="text-[12px] font-bold text-black/55">{S.aufnahmeLaedt}</p>}
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => cvRef.current?.click()} className={chip(!!cvDatei)}>{cvDatei ? cvDatei.name.slice(0, 28) : S.cvJa}</button>
                    <button type="button" onClick={() => setCvAbgelehnt(true)} className={chip(false)}>{S.cvNein}</button>
                  </div>
                </>);
              } else if (!torOffen && torSchritt === 2) {
                /* DIE VORWARNUNG (Owner 26.08.2026) — bis hierher lief alles in seiner
                   Sprache; ab dem nächsten Schirm ist es Deutsch und die Uhr läuft. Wer
                   unvorbereitet in den Countdown stolpert, verliert die erste Frage. */
                frageBlase = blase(S.fBereit, S.bereitHinweis);
                aktionen = (
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" className={chip(false)} onClick={() => setTorSchritt(3)}>{S.bereitJa}</button>
                  </div>
                );
              } else if (!torOffen && torSchritt <= 2 + deTest.length) {
                /* DER TEST, FRAGE FÜR FRAGE — direkt nach dem Formular. */
                const f = deTest[torSchritt - 3];
                frageBlase = blase(`${torSchritt - 2}/${deTest.length} · ${f.frage}`, S.deutschTestHinweis);
                aktionen = (
                  <>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/10">
                      <div className={`h-full rounded-full transition-all duration-1000 ${deRest <= 5 ? "bg-red-500" : "bg-[#f6cf51]"}`}
                        style={{ width: `${(deRest / DE_SEKUNDEN) * 100}%` }} />
                    </div>
                    <span className={`w-8 text-right text-[12px] font-black tabular-nums ${deRest <= 5 ? "text-red-600" : "text-black/50"}`}>{deRest}s</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {f.antworten.map(t => (
                      <button key={t.label} type="button" className={chip(deAntworten[torSchritt - 2] === t.label)}
                        onClick={() => {
                          const naechste = [...deAntworten];
                          naechste[torSchritt - 3] = t.label;
                          setDeAntworten(naechste);
                          if (torSchritt === 2 + deTest.length) setDeutschChat(deutschAbleiten(deTest, naechste));
                          setTorSchritt(z => z + 1);
                        }}>{t.label}</button>
                    ))}
                  </div>
                  </>
                );
              } else if (!torOffen && torSchritt === 2 + deTest.length + 1 && schreibenNoetig) {
                /* DER SCHREIBTEST — erst ab B2, und ohne Uhr: Hier zählt, WIE er schreibt,
                   nicht wie schnell. Das Ergebnis geht als Textprobe in die Analyse und
                   liegt dem Owner im Admin im Wortlaut vor. */
                frageBlase = blase(`${S.fSchreiben} ${S.schreibenAufgabe}`, S.schreibenHinweis);
                aktionen = (<>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/10">
                      <div className={`h-full rounded-full transition-all duration-1000 ${deRest <= 8 ? "bg-red-500" : "bg-[#f6cf51]"}`}
                        style={{ width: `${(deRest / SCHREIB_SEKUNDEN) * 100}%` }} />
                    </div>
                    <span className={`w-8 text-right text-[12px] font-black tabular-nums ${deRest <= 8 ? "text-red-600" : "text-black/50"}`}>{deRest}s</span>
                  </div>
                  <textarea value={schreibprobe} onChange={e => setSchreibprobe(e.target.value)}
                    rows={4} placeholder={S.schreibenPlatzhalter}
                    className="w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-[13px] font-medium text-black outline-none placeholder:text-black/35 focus:border-black/40" />
                  {schreibprobe.trim().length > 0 && schreibprobe.trim().length < 60 && (
                    <p className="text-[12px] font-bold text-black/45">{S.schreibenKurz}</p>
                  )}
                  <Knopf art="gold" karte disabled={schreibprobe.trim().length < 60}
                    onClick={() => setTorSchritt(z => z + 1)}>{S.schreibenWeiter}</Knopf>
                </>);
              } else if (!torOffen) {
                /* DIE ABSICHT (Owner 26.08.2026: „dann weitermachen, suchst du einen Job")
                   — die eine Frage, die neugierige Klicker von Kandidaten trennt. Sie
                   schliesst niemanden aus; sie sagt uns nur, was der Kontakt wert ist. */
                frageBlase = blase(S.fSuche, S.sucheHinweis);
                aktionen = (
                  <div className="flex flex-wrap gap-1.5">
                    {SUCHE_OPTIONEN.map(o => (
                      <button key={o.wert} type="button" className={chip(sucheIntent === o.wert)}
                        onClick={() => {
                          setSucheIntent(o.wert); setTorOffen(true);
                          void logFunnelEvent("job_intent", { theme: "lebenslauf", intent: o.wert });
                        }}>{o.label}</button>
                    ))}
                  </div>
                );
              } else if (chatSchritt === 0) {
                frageBlase = blase(S.fRichtung, S.mehrfachHinweis);
                aktionen = (<>
                  <div className="flex flex-wrap gap-1.5">
                    {RICHTUNGEN.map(r => (
                      <button key={r} type="button" onClick={() => toggle(richtungen, setRichtungen, r)} className={chip(richtungen.includes(r))}>{r}</button>
                    ))}
                  </div>
                  <Knopf art="gold" karte disabled={richtungen.length === 0} onClick={weiter}>{S.naechsteFrage}</Knopf>
                </>);
              } else if (chatSchritt === 1) {
                frageBlase = blase(S.frageArbeitsform);
                aktionen = (<>
                  <div className="flex flex-wrap gap-1.5">
                    {AF.map(o => (
                      <button key={o.wert} type="button" onClick={() => toggle(arbeitsformChat, setArbeitsformChat, o.wert)} className={chip(arbeitsformChat.includes(o.wert))}>{o.label}</button>
                    ))}
                  </div>
                  <Knopf art="gold" karte disabled={arbeitsformChat.length === 0} onClick={weiter}>{S.naechsteFrage}</Knopf>
                </>);
              } else if (chatSchritt === 2) {
                frageBlase = blase(S.frageUmzug);
                aktionen = (
                  <div className="flex flex-wrap gap-1.5">
                    {UMZUG.map(o => (
                      <button key={o.wert} type="button" onClick={() => { setUmzugChat(o.wert); weiter(); }} className={chip(umzugChat === o.wert)}>{o.label}</button>
                    ))}
                  </div>
                );
              } else if (chatSchritt === 3) {
                frageBlase = blase(S.frageStart);
                aktionen = (
                  <div className="flex flex-wrap gap-1.5">
                    {START.map(o => (
                      <button key={o.wert} type="button" onClick={() => { setStartChat(o.wert); weiter(); }} className={chip(startChat === o.wert)}>{o.label}</button>
                    ))}
                  </div>
                );
              } else if (chatSchritt === 4) {
                frageBlase = blase(S.fTraum, S.traumHinweis);
                aktionen = (<>
                  <input value={traum} placeholder={S.traumPlatzhalter} onChange={e => setTraum(e.target.value)}
                    className="w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-[13px] font-medium text-black outline-none placeholder:text-black/35 focus:border-black/40" />
                  <Knopf art="gold" karte onClick={weiter}>{traum.trim() ? S.naechsteFrage : S.ueberspringen}</Knopf>
                </>);
              } else if (chatSchritt === 5) {
                frageBlase = blase(S.fZuletzt, S.mehrfachHinweis);
                aktionen = (<>
                  <div className="flex flex-wrap gap-1.5">
                    {BRANCHEN.map(bx => (
                      <button key={bx} type="button" onClick={() => toggle(zuletztChat, setZuletztChat, bx)} className={chip(zuletztChat.includes(bx))}>{bx}</button>
                    ))}
                  </div>
                  <Knopf art="gold" karte disabled={zuletztChat.length === 0} onClick={weiter}>{S.naechsteFrage}</Knopf>
                </>);
              } else if (chatSchritt === 6) {
                frageBlase = blase(S.fFaehigkeiten, S.mehrfachHinweis);
                aktionen = (<>
                  <div className="flex flex-wrap gap-1.5">
                    {KOENNEN.map(fx => (
                      <button key={fx} type="button" onClick={() => toggle(faehigkeitenChat, setFaehigkeitenChat, fx)} className={chip(faehigkeitenChat.includes(fx))}>{fx}</button>
                    ))}
                  </div>
                  <Knopf art="gold" karte disabled={faehigkeitenChat.length === 0} onClick={weiter}>{S.naechsteFrage}</Knopf>
                </>);
              } else if (chatSchritt === 7 || chatSchritt === 8) {
                /* LEER — der Deutsch-Test ist ins Tor gewandert (Owner 26.08.2026). Die
                   beiden Schritte bleiben als Platzhalter stehen, damit die Nummern aller
                   folgenden Fragen und die Rücksprünge im Verlauf unverändert gelten. */
                frageBlase = null;
              } else if (chatSchritt === 9) {
                frageBlase = blase(S.fCv, S.cvHinweis);
                aktionen = (<>
                  {cvDatei && !cvPath && <p className="text-[12px] font-bold text-black/55">{S.aufnahmeLaedt}</p>}
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => cvRef.current?.click()} className={chip(!!cvDatei)}>{cvDatei ? cvDatei.name.slice(0, 28) : S.cvJa}</button>
                    <button type="button" onClick={weiter} className={chip(false)}>{S.cvNein}</button>
                  </div>
                </>);
              } else if (chatSchritt === 10) {
                frageBlase = blase(S.fFoto, S.fotoHinweis);
                aktionen = (
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => fotoRef.current?.click()} className={chip(!!foto)}>{foto ? S.fotoDa : S.fotoJa}</button>
                    <button type="button" onClick={weiter} className={chip(false)}>{S.fotoSpaeter}</button>
                  </div>
                );
              } else if (chatSchritt === 11) {
                frageBlase = blase(S.fVideo, S.videoHinweis);
                aktionen = (
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => { setVideoMeinung("ja"); weiter(); }} className={chip(videoMeinung === "ja")}>{S.videoJa}</button>
                    <button type="button" onClick={() => { setVideoMeinung("unsicher"); weiter(); }} className={chip(videoMeinung === "unsicher")}>{S.videoUnsicher}</button>
                    <button type="button" onClick={() => { setVideoMeinung("nein"); weiter(); }} className={chip(videoMeinung === "nein")}>{S.videoNein}</button>
                  </div>
                );
              } else if (chatSchritt === 12) {
                /* DAS GENAUE ALTER, KEINE ALTERSGRUPPE (Owner 27.08.2026: „diese Frage ist
                   blöd, er muss genau sein Alter angeben") — Zahlenfeld statt Chips, wie
                   Wohnort/Telefon. Die Zahl selbst bleibt bei den Job-Vorschlägen unbenutzt
                   (siehe Memory: keine Alters-/Geschlechtsfilterung, AGG), sie ist reine
                   Kandidaten-Angabe für den Owner im Admin. */
                frageBlase = blase(S.fAlter, S.alterHinweis);
                aktionen = (<>
                  <input type="number" inputMode="numeric" min={14} max={99} value={alterChat}
                    placeholder={S.alterPlatzhalter} onChange={e => setAlterChat(e.target.value.replace(/[^\d]/g, "").slice(0, 2))}
                    className="w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-[13px] font-medium text-black outline-none placeholder:text-black/35 focus:border-black/40" />
                  <Knopf art="gold" karte disabled={!alterChat.trim()} onClick={weiter}>{S.naechsteFrage}</Knopf>
                </>);
              } else if (chatSchritt === 13) {
                /* MIT CV ÜBERSPRUNGEN (Effekt oben) — der Lebenslauf nennt die Jahre selbst. */
                frageBlase = blase(S.fJahre);
                aktionen = (
                  <div className="flex flex-wrap gap-1.5">
                    {JAHRE.map(o => (
                      <button key={o} type="button" onClick={() => { setJahreChat(o); weiter(); }} className={chip(jahreChat === o)}>{o}</button>
                    ))}
                  </div>
                );
              } else if (chatSchritt === 14) {
                frageBlase = blase(S.fAbschluss);
                aktionen = (
                  <div className="flex flex-wrap gap-1.5">
                    {ABSCHLUSS.map(o => (
                      <button key={o} type="button" onClick={() => { setAbschlussChat(o); weiter(); }} className={chip(abschlussChat === o)}>{o}</button>
                    ))}
                  </div>
                );
              } else if (chatSchritt === 15) {
                /* MEHRFACH: Wer C+E hat, hat auch B — die Firma will beides sehen. */
                frageBlase = blase(S.fFuehrerschein, S.mehrfachHinweis);
                aktionen = (<>
                  <div className="flex flex-wrap gap-1.5">
                    {FUEHRERSCHEIN.map(o => (
                      <button key={o} type="button" onClick={() => toggle(fuehrerscheinChat, setFuehrerscheinChat, o)} className={chip(fuehrerscheinChat.includes(o))}>{o}</button>
                    ))}
                  </div>
                  <Knopf art="gold" karte disabled={fuehrerscheinChat.length === 0} onClick={weiter}>{S.naechsteFrage}</Knopf>
                </>);
              } else if (chatSchritt === 16) {
                frageBlase = blase(S.fWohnort);
                aktionen = (<>
                  <input value={wohnortChat} placeholder={S.wohnortPlatzhalter} onChange={e => setWohnortChat(e.target.value)}
                    className="w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-[13px] font-medium text-black outline-none placeholder:text-black/35 focus:border-black/40" />
                  <Knopf art="gold" karte disabled={!wohnortChat.trim()} onClick={weiter}>{S.naechsteFrage}</Knopf>
                </>);
              } else if (chatSchritt === 17) {
                frageBlase = blase(S.fTelefon, S.telefonHinweis);
                aktionen = (<>
                  <input type="tel" value={telefonChat} placeholder={S.telefonPlatzhalter} onChange={e => setTelefonChat(e.target.value)}
                    className="w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-[13px] font-medium text-black outline-none placeholder:text-black/35 focus:border-black/40" />
                  <Knopf art="gold" karte disabled={!telefonChat.trim()} onClick={weiter}>{S.naechsteFrage}</Knopf>
                </>);
              } else {
                /* DER ABSCHLUSS — Name und E-Mail stehen schon vom Tor, hier wird nur noch
                   ausgeloest (Owner 26.08.2026: nicht zweimal dasselbe fragen). */
                frageBlase = blase(S.chancenBereit ?? S.fNameMail);
                aktionen = (<>
                  {leadFehler && <p role="alert" className="lb-karte-fehler text-[12.5px] font-black leading-snug">{leadFehler}</p>}
                  <Knopf art="gold" karte disabled={busy} onClick={() => void jobsChancenLaden()}>{S.chancenCta}</Knopf>
                </>);
              }

              return (
                /* DAS BELLA-CHAT-DESIGN, 1:1 (Owner: „ich will das gleiche Design wie bei
                   Bella … wir haben doch dran gearbeitet") — dieselbe Bühne wie
                   components/ChatFunnel.tsx: Ornament-Karte mit Innenrahmen, darin der
                   weisse Chat-Kasten mit Kopf (Foto · Name · online now · Punkte), Verlauf
                   auf neutral-50 (Fragen links weiss, Antworten rechts schwarz, antippbar
                   zum Ändern), und die Aktionen der aktuellen Frage FIX unten am Rand. */
                <div className="lb-karte relative overflow-hidden rounded-[20px] px-4 pb-5 pt-6 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
                  <CornerOrnaments />
                  <div className="lb-karte-rahmen pointer-events-none absolute inset-[10px] rounded-[14px]" />
                  <div className="relative">
                    <p className="lb-karte-gold text-center text-[10px] font-black uppercase tracking-[0.28em]">{S.jobsKicker}</p>
                    <DividerOrnament className="mt-2" />
                    {/* FESTE FENSTERHÖHE WIE WHATSAPP (Owner: „auf Höhe des Screens … Seite
                        ist nicht scrollbar, nur Chat-Inhalt"): der Kasten steht, der
                        Verlauf scrollt INNEN, die Aktionszeile klebt unten. */}
                    <div className="mt-3 flex h-[calc(100dvh-205px)] min-h-[460px] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-black shadow-sm">
                      {/* Kopf — wie im Bella-Chat: Foto, Name, „online now"; rechts die Punkte. */}
                      <div className="flex shrink-0 items-center gap-3 border-b border-black/10 px-3 py-2.5">
                        <button type="button" onClick={() => setBellaVideoOffen(true)} aria-label="Video"
                          className="relative aspect-[3/4] w-9 shrink-0 overflow-hidden rounded-lg bg-black/5 transition active:scale-90">
                          {chatGesicht
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={chatGesicht} alt="" className="h-full w-full object-cover object-top" />
                            : null}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-black">{JOBS_CHAT_NAME}</p>
                          <p className="flex items-center gap-1.5 text-[11px] font-bold text-black/50">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> online now
                          </p>
                        </div>
                        {/* DIE CHANCEN-PUNKTE — steigen mit jedem Klick. */}
                        <p className="shrink-0 text-[12px] font-black text-black">
                          <span className="text-[#b9962e]">★ {punkte}</span>{" "}
                          <span className="text-black/45">{S.punkteLabel}</span>
                        </p>
                        {/* JEDERZEIT VON VORN (Owner) — immer im Kopf, nie nur am Ende. */}
                        <button type="button" onClick={nochmalVonVorn} aria-label={S.nochmal} title={S.nochmal}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-black/15 text-black/55 transition active:scale-90 hover:text-black">
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Der Verlauf — scrollt innen; die aktuelle Frage steht als letzte Blase. */}
                      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain bg-neutral-50 px-3 py-3">
                        <p className="mx-auto my-1 max-w-[85%] rounded-xl bg-black/[0.06] px-3 py-2 text-center text-[11px] font-bold leading-snug text-black/60">{kapitel}</p>
                        {erledigt.map(z => (
                          <div key={z.s} className="space-y-1.5">
                            <div className="flex justify-start">
                              <div className="max-w-[82%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-[13px] font-medium text-black ring-1 ring-black/10">{z.frage}</div>
                            </div>
                            <div className="flex justify-end">
                              {/* `span` statt `button` + `data-aufmedien` (Haus-Gegenmittel,
                                  Memory lb-karte-important-frisst-inline-farben): die
                                  Knopf-/Karten-Regeln der hellen Fassung zwangen die
                                  schwarze Blase sonst hell (Owner-Bild). Und statt des
                                  Stifts (Owner: „den Stift versteht kein Mensch") eine
                                  beschriftete Ändern-Pille. */}
                              <span role="button" tabIndex={0} data-aufmedien="1"
                                onClick={() => setChatSchritt(z.s)}
                                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setChatSchritt(z.s); } }}
                                className="lb-jobs-blase max-w-[82%] cursor-pointer rounded-2xl rounded-tr-sm px-3 py-2 text-left text-[13px] font-medium transition active:scale-[0.98]">
                                {z.antwort || "—"}{" "}
                                <span className="ml-1 inline-block rounded-full bg-white/20 px-2 py-0.5 align-middle text-[10px] font-black uppercase tracking-wide">{S.aendern}</span>
                              </span>
                            </div>
                          </div>
                        ))}
                        {erledigt.length > 0 && (
                          <p className="mx-auto max-w-[90%] text-center text-[10.5px] font-medium leading-snug text-black/40">{S.punkteHinweis}</p>
                        )}
                        {frageBlase}
                        <div ref={chatEndeRef} />
                      </div>

                      {bellaVideoOffen && (
                        <div className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4" onClick={() => setBellaVideoOffen(false)}>
                          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                          <video src={JOBS_CHAT_VIDEO} autoPlay loop playsInline controls className="max-h-[85vh] w-auto rounded-2xl" />
                        </div>
                      )}
                      {/* Die Aktionszeile — FIX unten am Rand, wie die Eingabezeile bei WA.
                          Links davor der Zurück-Chip (Owner: „wo es weiter steht soll
                          lieber nebendran auch zurück stehen") — ein Schritt zurück, ohne
                          in den Blasen suchen zu müssen. */}
                      <div className="flex shrink-0 items-start gap-2 border-t border-black/10 bg-white px-3 py-2.5">
                        {chatSchritt > 0 && (
                          <button type="button" onClick={() => setChatSchritt(s => (s === 9 ? 6 : Math.max(0, s - 1)))} aria-label={F.back}
                            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-black/15 text-[16px] font-black text-black/60 transition active:scale-90">
                            ←
                          </button>
                        )}
                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                          {aktionen}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <>
              <div className="flex gap-3">
                <TunnelKachelUpload foto={foto} titel={F.upTitle} hinweis={F.upHint}
                  onWaehlen={() => fotoRef.current?.click()} onLoeschen={() => setFoto("")} />
                <DateiKachel datei={cvDatei} titel={F.uploadYou} hinweis={F.youHint} icon={FileText}
                  onWaehlen={() => cvRef.current?.click()}
                  onLoeschen={() => { setCvDatei(null); setCvPath(""); }} />
              </div>

              {/* Die Verfügbarkeits-Frage ist RAUS (Owner 25.08.2026: „das raus"). */}

              {/* DIE STIMM-WAHL IST RAUS (Owner-Seitentext 24.08.2026, FAQ: „kein Avatar,
                  keine synthetische Stimme") — Skript und Eigenaufnahme kommen als eigene
                  Schritte NACH der Zahlung (`phase` oben). */}

              {!mailOk && (
                /* KEINE ADRESSE AUS SCHRITT 1 (Owner 16.08.2026 erlaubt „ohne Adresse einfach
                   weiter" — aber hier braucht es sie fürs Bezahlen). Ohne diese Stelle blieb
                   der Kaufknopf für immer stumm gesperrt, ohne dass sichtbar war, warum
                   (Owner 20.08.2026, live gefunden: „siehst du nicht, dass Profil erstellen
                   nicht aktiv ist?"). */
                <Eingabe type="email" placeholder="you@email.com" value={mail}
                  onChange={e => setMail(e.target.value)} />
              )}

              <div className="flex items-center gap-2">
                <button type="button" onClick={() => onSchrittChange(1)} aria-label={F.back}
                  className="lb-chip grid h-12 w-12 shrink-0 place-items-center rounded-full active:scale-95 transition">
                  ←
                </button>
                {anzeige.trim() ? (
                  /* MIT ANZEIGE führt der Weg erst zum Gratis-Match, ohne Anzeige direkt ins
                     Gratis-Erstellen (Owner 25.08.2026, Gratis-Linie: „Er kann alles anlegen
                     gratis" — kein Preis mehr an keinem der beiden Knöpfe hier). */
                  <Knopf art="gold" disabled={!bereitDa || !mailOk || busy} onClick={() => void generieren()}>
                    {AT.weiterMatch}
                  </Knopf>
                ) : (
                  <Knopf art="gold" disabled={!bereitDa || !mailOk || busy} onClick={() => void starten()}>
                    {F.generateNow}
                  </Knopf>
                )}
              </div>

              <p className="text-center font-serif text-[11px] leading-snug text-white/70">
                <KurzeEinwilligung tpl={F.consentKurz} linkLabel={F.agbLink} />
              </p>
            </>
          )}

          <input ref={fotoRef} type="file" accept="image/*,.heic,.heif" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) setCropDatei(f); e.target.value = ""; }} />
          {/* PDF UND WORD (Owner 26.08.2026: „ich muss im lebenslauf auch docx hochladen
              können") — .docx wird serverseitig zu Text (lib/docx-text.ts); das alte
              binäre .doc bleibt bewusst draußen, das können wir nicht lesen. */}
          <input ref={cvRef} type="file" accept="application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden"
            onChange={e => {
              const f = e.target.files?.[0]; e.target.value = "";
              if (!f) return;
              void logFunnelEvent("cv_upload_started", { theme: "lebenslauf" });
              setCvDatei(f); setCvPath("");
              void ladeHoch(f).then(p => { setCvPath(p); void logFunnelEvent("cv_uploaded", { theme: "lebenslauf" }); }).catch(() => setStatus(F.statusNotWork));
            }} />
          {/* Die Eigenaufnahme — NUR Video (er spricht sein Skript in die Kamera), `capture`
              öffnet am Handy direkt die Frontkamera. */}
          <input ref={aufnahmeRef} type="file" accept="video/*" capture="user" className="hidden"
            onChange={e => {
              const f = e.target.files?.[0]; e.target.value = "";
              if (!f) return;
              setAufnahmeDatei(f); setAufnahmePath("");
              void ladeHoch(f).then(setAufnahmePath).catch(() => setStatus(F.statusNotWork));
            }} />

          {status && <p className="text-center text-[12.5px] font-bold text-white/70">{status}</p>}

          {cropDatei && (
            <ImageCropper file={cropDatei} aspect={3 / 4}
              title={F.upTitle} sprache={lang}
              onCancel={() => setCropDatei(null)}
              onSave={async (zugeschnitten) => {
                setCropDatei(null);
                const dataUrl = await dateiZuDataUrl(zugeschnitten);
                setFoto(dataUrl);
              }} />
          )}
        </div>
      )}
      {kasse.block}
    </>
  );
}
