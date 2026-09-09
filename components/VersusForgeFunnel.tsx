"use client";

import { useEffect, useRef, useState } from "react";
import { useKasseImFenster } from "@/components/KasseImFenster";
import { kasseOeffnen, kassenFenster } from "@/lib/browser-erkennen";
import { ChevronLeft } from "lucide-react";
import { Eingabe, EingabeMehrzeilig, Knopf, Fehlerzeile, Fortschritt, Kasten } from "@/components/CI";
import { logFunnelEvent, logTunnelEvent } from "@/lib/track-funnel";
import { schrittMessen } from "@/lib/versusforge-messen";
import { EIGENER_MANDANT } from "@/lib/versusforge-namen";
import { HEBEL } from "@/lib/versusforge-hook-rezept";
import VersusForgeGespraech, { type Nachricht } from "@/components/VersusForgeGespraech";
import type { VersusForgeTexte } from "@/lib/versusforge-texte";
import VersusForgeTrichterBild from "@/components/VersusForgeTrichterBild";

/**
 * VERSUSFORGE — DER BERATER VOR DER MASCHINE (Owner 08.09.2026).
 *
 *   ziel → feld → gespraech (bis zu 4 Fragen) → plan → danke
 *
 * DREI ENTSCHEIDUNGEN, DIE HIER ANDERS SIND ALS ANDERSWO IM HAUS:
 *
 * 1. KEIN `TunnelSeite`. Dieselbe begründete Abweichung wie bei David: Das Gerüst verwaltet
 *    Schrittnummern in der Adresse, und ein Zurück-Sprung per Adresse würde jemanden mitten
 *    in ein Gespräch setzen, dessen Antworten es dann nicht mehr gibt.
 * 2. KEINE E-MAIL AM ANFANG. Der Eingang ist zwei Knöpfe und ein Feld. Wer nach der Adresse
 *    fragt, bevor er etwas gegeben hat, ist ein Formular — und Formulare verlieren genau die
 *    Leute, die zahlen würden. Die Adresse kommt NACH dem Plan.
 * 3. ER LEGT NICHTS AN. Am Ende steht, was gebaut würde. Kein Aufruf an Meta, keine Kampagne,
 *    kein Motiv erzeugt — nichts kostet Geld, solange der Owner es nicht auslöst
 *    ([[keine-erzeugung-ohne-zustimmung]]).
 *
 * ALLE TEXTE KOMMEN ALS `S` VOM SERVER — im Client steht kein einziger Satz.
 */

/**
  * DIE STARTSEITE IST SEITE EINS (Owner 08.09.2026: „das ist schon die erste Seite im Tunnel,
  * die zweite sind dann die Fragen").
  *
  * Deshalb sind hier zwei Schritte entfallen: der Hook (er steht auf der Startseite) und die
  * Zielwahl (die Knöpfe sind dort weggefallen, das Ziel liest der Agent aus dem Satz). Was
  * bleibt, ist das Feld als Rückfalltür für jemanden, der die Adresse direkt eintippt —
  * darüber ist der Weg: Satz → Fragen → Plan.
  */
/**
 * DIE PHASEN NACH DEM UMBAU AUF CHAT (Owner 09.09.2026: „bei VersusForge müsste sich ein Chat
 * öffnen und alles lösen" · „hier haben wir Schritte statt ein Chat, es ist veraltet").
 *
 * „webseite" und „gespraech" sind zu EINER Phase geworden: `chat`. Die Website fragt der
 * Agent jetzt im Gespräch, wenn er sie braucht — sie war nie ein eigener Schirm wert.
 *
 * PROTOTYP FÜR VERSUSFORGE (Owner: „genauso müssten alle Topics laufen, aber jetzt machen wir
 * das als Prototyp"): Die anderen zwölf Produkte bleiben unberührt, bis das hier trägt.
 */
type Phase = "warten" | "chat" | "bezahlen" | "plan" | "danke";
type Ziel = "leads" | "verkauf";
/**
 * EINE RUNDE TRÄGT IHREN HEBEL (Owner 09.09.2026: „die Schritte nennen wir so bei der
 * Abfrage").
 *
 * Der Schlüssel reist zum Server zurück, damit der nächste Zug weiss, was schon gefüllt ist —
 * und er steht als NAME über der Frage, so wie im Karussell „purpose", „story", „identity"
 * über den Folien stehen. Wer sieht, woran gerade gearbeitet wird, beantwortet anders als
 * jemand, der „Rückfrage 2 von 4" liest.
 */
type Runde = { frage: string; antwort: string; hebel?: string };
type Motiv = { idee: string; text: string };
type Bauteil = { was: string; wozu: string; selbst: string; aufwand: string };
type Anzeige = { primaer: string; ueberschrift: string; beschreibung: string; knopf: string };
type Plan = { befund: string; zielgruppe: string[]; hook: string; hookWarum: string; motive: Motiv[]; bauteile?: Bauteil[]; anzeige?: Anzeige; trichter: string[]; budget: string; warnung: string };

/**
 * DREI SCHRITTE SEIT DEM 09.09.2026 (Owner: „im Trichter soll er nach einer Website doch
 * fragen" · „gleich am Anfang, als zweiter Schritt" · „dann muss der User nicht alles
 * erklären").
 *
 * DER SATZ AUF DER STARTSEITE IST SCHRITT EINS. Schritt zwei ist die Adresse seiner
 * Website — und zwar VOR den Fragen, nicht irgendwo mittendrin. Der Grund steht in seinem
 * dritten Satz: Wer seine Seite zeigt, muss sein Geschäft nicht mit der Hand beschreiben.
 * Der Agent liest sie einmal (`seiteLesen` im Schritt `briefing`), behält den Auszug als
 * Gedächtnis und fragt danach nur noch das, was dort NICHT steht.
 *
 * ES IST EIN EIGENER SCHIRM UND KEIN ZWEITES FELD AUF DER STARTSEITE: Dort steht die
 * Überschrift, die verkauft, und ein Feld. Ein zweites daneben halbiert die Aufmerksamkeit
 * an genau der Stelle, an der jemand entscheidet, ob er anfängt.
 */
const SCHRITTE: Phase[] = ["chat", "plan"];
/* Muss zum Deckel im Server stehen (`MAX_FRAGEN` in app/api/versusforge/route.ts). */
const MAX_FRAGEN = 4;

/**
 * DEN VERLAUF IN DIE FORM BRINGEN, DIE PLAN UND ANFRAGE ERWARTEN.
 *
 * WARUM NICHT ALLES AUF NACHRICHTEN UMSTELLEN: Plan, Mandant, Anfragen-Mail und Dashboard
 * lesen seit Wochen Frage-Antwort-Paare. Sie alle gleichzeitig umzubauen wäre ein zweiter
 * Umbau im selben Zug — und der Prototyp soll zeigen, ob der Chat trägt, nicht ob ich zehn
 * Dateien gleichzeitig anfassen kann. Die Umwandlung kostet nichts und lässt sich später
 * entfernen, wenn die Nachrichtenform überall angekommen ist.
 */
function alsRunden(verlauf: Nachricht[]): Runde[] {
  const raus: Runde[] = [];
  for (let i = 0; i < verlauf.length; i++) {
    if (verlauf[i].rolle !== "mensch") continue;
    /* Die letzte Nachricht des Agenten davor ist die „Frage" zu dieser Antwort; die erste
       Nachricht des Menschen hat keine — sie ist sein Aufschlag. */
    const davor = verlauf.slice(0, i).reverse().find(m => m.rolle === "agent");
    raus.push({ frage: davor?.text ?? "", antwort: verlauf[i].text });
  }
  return raus;
}

/** Der Sitzungseintrag, der einen laufenden Trichter über ein Neuladen rettet. */
const LAUF = "vf_lauf";
type Gespeichert = {
  ziel: Ziel | ""; text: string; url: string; seite: string; runden: Runde[];
  verstanden: string; frage: string; hebel: string; stand: Record<string, number>;
  vorschlaege: string[]; plan: Plan | null;
  /* Seit dem Umbau auf Chat ist DAS der eigentliche Zustand — der Rest hängt daran. */
  verlauf: Nachricht[]; fertig: boolean;
};

/**
 * DIE FÜNF STÄNDE (Owner 09.09.2026: „Nutzen identifizieren in Prozent, ob es erfüllt ist
 * oder nicht").
 *
 * WAS SIE LEISTET: Sie macht sichtbar, dass gearbeitet wird — und woran. Ein Balken „2 von
 * 4" zählt Schritte; diese fünf Zeilen zeigen, was die Maschine über ihn schon hat und was
 * ihr fehlt. Damit begründet sich jede Frage von selbst.
 *
 * DER LAUFENDE SCHRITT IST HERVORGEHOBEN, die anderen bleiben ruhig. Fünf gleich laute
 * Zeilen wären eine Tabelle; eine helle unter vier dunklen ist ein Arbeitsplatz.
 *
 * SIE ZEIGT DIE EIGENEN NAMEN (`schritt`), nie die echten — Begründung in
 * `versusforge-hook-rezept.ts`.
 *
 * VOR DER ERSTEN ANTWORT STEHT SIE NICHT DA: Fünf Nullen sind kein Fortschritt, sondern
 * eine Mängelliste über jemanden, der gerade erst angefangen hat.
 */
function HebelStand({ stand, jetzt }: { stand: Record<string, number>; jetzt: string }) {
  const summe = HEBEL.reduce((n, h) => n + (stand[h.schluessel] ?? 0), 0);
  if (!summe) return null;
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/12 bg-white/[0.04] p-4">
      {HEBEL.map(h => {
        const wert = Math.max(0, Math.min(100, stand[h.schluessel] ?? 0));
        const dran = h.schluessel === jetzt;
        return (
          <div key={h.schluessel} className="flex items-center gap-3">
            <span className={`w-[92px] shrink-0 text-[13.5px] font-bold ${dran ? "text-[#f6cf51]" : "text-white/55"}`}>
              {h.schritt}
            </span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/12">
              <span
                className={`block h-full rounded-full transition-[width] duration-500 ${dran ? "bg-[#f6cf51]" : "bg-white/45"}`}
                style={{ width: `${wert}%` }}
              />
            </span>
            <span className={`w-[42px] shrink-0 text-right text-[13.5px] font-bold ${dran ? "text-[#f6cf51]" : "text-white/45"}`}>
              {wert}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Was der Besucher über der Frage liest — `schritt`, NIE `name`.
 *
 * Die echten Hebelnamen nebeneinander sind die Formel (siehe `versusforge-hook-rezept.ts`).
 * Hier steht die eigene Benennung: Der Arbeitsgang ist sichtbar, der Bauplan nicht.
 */
const hebelName = (schluessel: string): string =>
  HEBEL.find(h => h.schluessel === schluessel)?.schritt ?? "";

/**
 * `auftrag` GIBT ES, SEIT DER CHAT AUF DER SEITE SELBST LÄUFT (Owner 09.09.2026: „bei
 * VersusForge müsste sich ein Chat öffnen und alles lösen" · „ein Chat wie Claude hier").
 *
 * Vorher holte der Trichter den ersten Satz aus dem Sitzungsspeicher, weil er auf einer
 * eigenen Adresse lag und der Mensch dorthin geschickt wurde. Das war der Formular-Rest:
 * Feld ausfüllen, Seitenwechsel, dann Gespräch. Ein Chat wechselt keine Seite — man tippt,
 * und es antwortet an derselben Stelle. Kommt der Auftrag als Prop, gibt es keinen Umweg
 * mehr; ohne Prop bleibt der alte Weg bestehen, damit `/engine/start` nicht bricht.
 */
export default function VersusForgeFunnel({ S, lang, auftrag }: {
  S: VersusForgeTexte; lang: string;
  auftrag?: { ziel: "leads" | "verkauf"; text: string; url?: string };
}) {
  /* „warten" ist kein Schritt, sondern der Augenblick, in dem geprüft wird, ob ein Auftrag
     von der Startseite mitgekommen ist. */
  const [phase, setPhase] = useState<Phase>("warten");
  const [ziel, setZiel] = useState<Ziel | "">("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  /* Was der Agent auf seiner Website gelesen hat — einmal geholt, danach mitgetragen. */
  const [seite, setSeite] = useState("");
  const [runden, setRunden] = useState<Runde[]>([]);
  const [verstanden, setVerstanden] = useState("");
  const [frage, setFrage] = useState("");
  /* Welchen der fünf Hebel die AKTUELLE Frage füllen soll — er steht als Name darüber. */
  const [hebel, setHebel] = useState("");
  /** Der Gesprächsverlauf — die Form, die eine Sprachsteuerung später genauso braucht. */
  const [verlauf, setVerlauf] = useState<Nachricht[]>([]);
  /** Der Agent meldet, dass er genug für den Plan hat. Gebaut wird trotzdem erst auf Klick. */
  const [fertig, setFertig] = useState(false);
  /**
   * WIE WEIT JEDER HEBEL GEFÜLLT IST, in Prozent (Owner 09.09.2026: „Nutzen identifizieren
   * in Prozent, ob es erfüllt ist oder nicht").
   *
   * DAS IST DIE ANZEIGE DER MASCHINE — der Unterschied zwischen einem Formular und etwas,
   * bei dem man zusieht. Sie erklärt auch die nächste Frage, ohne sie zu begründen: Wer
   * sieht, dass „Beleg" bei 10 steht, versteht sofort, warum danach gefragt wird.
   */
  const [stand, setStand] = useState<Record<string, number>>({});
  /* Antworten zum Antippen — der Nutzer will klicken, nicht tippen. Antippen SCHICKT NICHT
     ab: Er legt den Satz ins Feld und kann ihn ändern, bevor er weitergeht. */
  const [vorschlaege, setVorschlaege] = useState<string[]>([]);
  const [antwort, setAntwort] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [mail, setMail] = useState("");
  /* Sein Betriebsname — er steht oben auf seiner Seite und in ihrer Adresse. */
  const [betrieb, setBetrieb] = useState("");
  /* Ob die MAIL wirklich rausging — nicht ob der Knopf gedrückt wurde. Der Server sagt es;
     ein Häkchen, das nur den Klick bestätigt, behauptet etwas über eine Zustellung, die es
     vielleicht nie gab. */
  const [postOk, setPostOk] = useState(false);
  const [trichterLink, setTrichterLink] = useState("");
  const [linkKopiert, setLinkKopiert] = useState(false);
  /* Was der Nutzer eingegeben hatte, als die Gratis-Analyse aufgebraucht war — damit es nach
     der Zahlung sofort weitergeht und er nichts noch einmal tippen muss. */
  const [kaufFehler, setKaufFehler] = useState("");
  const [bildLaeuft, setBildLaeuft] = useState(false);
  /**
   * DAS BILD SCHON VOR DEM E-MAIL-TOR (Owner 09.09.2026: „nach den vier Fragen der Hook gross
   * als Bild, darunter das Feld" — nach seinem „ja").
   *
   * WARUM ES DEN UNTERSCHIED MACHT: Bis heute stand vor dem Tor ein Text, der ein PDF
   * ankündigte. Jetzt sieht er das fertige Anzeigenbild mit SEINEM Satz darauf — und
   * entscheidet erst danach, ob er seine Adresse dalässt. Das Bild ist das stärkste
   * Argument, das wir an dieser Stelle haben; es hinter dem Tor zu verstecken, hiess es zu
   * verschenken.
   *
   * ÜBER POST IN EINEN `blob:`-VERWEIS, nicht über eine Bildadresse mit dem Hook darin: Der
   * Satz gehört ihm und hat in keinem Verlauf und keinem `Referer` etwas zu suchen.
   */
  const [bildVorschau, setBildVorschau] = useState("");
  const kasse = useKasseImFenster(phase);
  const [busy, setBusy] = useState(false);
  const [busyText, setBusyText] = useState("");
  /* Unterscheidet „denkt über die nächste Frage nach" von „baut den Plan" — die Anzeige
     ist in beiden Fällen ein Balken, der Schirm darunter aber ein anderer. */
  const [plaeneBauen, setPlaeneBauen] = useState(false);
  const [fehler, setFehler] = useState("");
  const endeRef = useRef<HTMLDivElement>(null);
  /**
   * DER ABHOLER LÄUFT GENAU EINMAL (08.09.2026, am eigenen Testlauf gefunden).
   *
   * React ruft Effekte in der Entwicklung ZWEIMAL auf. Der Abholer las den Auftrag und löschte
   * ihn sofort — beim zweiten Aufruf war er weg, der Trichter hielt das für „direkt
   * aufgerufen" und schickte zurück auf die Startseite. Von aussen sah es aus, als täte der
   * Knopf nichts.
   *
   * Ein Merker im `ref` überlebt beide Aufrufe (anders als ein Zustand, der zurückgesetzt
   * wird) und ist die übliche Antwort auf genau diesen Fall.
   */
  const abgeholt = useRef(false);

  /**
   * DEN STAND NACH JEDEM ZUG SICHERN — siehe die Begründung im Abholer weiter unten.
   *
   * ER LÄUFT ERST NACH DEM ABHOLEN: Vor dem ersten Zug wäre der Zustand leer, und ein leerer
   * Eintrag überschriebe genau das, was wir gerade wiederherstellen wollten.
   */
  useEffect(() => {
    if (!abgeholt.current || !ziel) return;
    try {
      sessionStorage.setItem(LAUF, JSON.stringify({
        ziel, text, url, seite, runden, verstanden, frage, hebel, stand, vorschlaege, plan,
        verlauf, fertig,
      } satisfies Gespeichert));
    } catch { /* voller oder gesperrter Speicher: dann eben ohne Netz */ }
  }, [ziel, text, url, seite, runden, verstanden, frage, hebel, stand, vorschlaege, plan, verlauf, fertig]);

  /**
   * DIE MESSUNG DES EIGENEN TRICHTERS (Owner 09.09.2026: „wo ist mein Dashboard?" · „der
   * müsste doch genauso aussehen").
   *
   * VersusForge ist Mandant Nummer eins ([[mein-trichter-ist-ihr-trichter]]) und wird
   * genauso gemessen wie jeder Kunde — dieselbe Leiter, dieselbe Ablage, dasselbe
   * Dashboard. Der einzige Unterschied sind die Namen der Stationen.
   *
   * `logTunnelEvent` bleibt daneben stehen: Das ist die HAUS-Statistik über alle zwölf
   * Produkte, hier geht es um die eine Strecke.
   */
  useEffect(() => {
    void logTunnelEvent("funnel_started", "versusforge");
    schrittMessen(EIGENER_MANDANT, "start");
  }, []);

  /**
   * WAS AUF DER STARTSEITE GETIPPT WURDE, WIRD HIER ABGEHOLT (08.09.2026, im Bild des Owners
   * gefunden: Der Hook stand zweimal, und der Satz war weg).
   *
   * Die Startseite legt Ziel und Text in `sessionStorage` und schickt hierher. Ohne diesen
   * Abholer fing der Trichter wieder beim Hook an — derselbe Satz ein zweites Mal, und der
   * Auftrag, den jemand gerade geschrieben hatte, war verloren. Wer das erlebt, tippt ihn
   * nicht noch einmal.
   *
   * SOFORT GELÖSCHT: Der Eintrag ist eine Übergabe, kein Speicher. Bliebe er liegen, startete
   * der nächste Besuch auf demselben Gerät mit einem fremden Auftrag.
   */
  useEffect(() => {
    if (abgeholt.current) return;
    abgeholt.current = true;
    let roh = "";
    /* Kommt der Auftrag als Prop, läuft der Chat auf der Seite selbst — kein Umweg über den
       Sitzungsspeicher, kein Seitenwechsel. */
    if (auftrag?.text || auftrag?.url) roh = JSON.stringify(auftrag);
    else try { roh = sessionStorage.getItem("vf_auftrag") ?? ""; sessionStorage.removeItem("vf_auftrag"); } catch { /* dann eben nicht */ }
    /**
     * OHNE AUFTRAG ZURÜCK AUF DIE STARTSEITE (Owner 08.09.2026, mit Bild dieser Seite: „die
     * Seite? Was ist das? Die dürfte es nicht mehr geben").
     *
     * Hier stand ein zweites Eingabefeld als Rückfalltür. Zwei Eingänge sind einer zu viel:
     * Der eine trägt Überschrift, Beispiele und die Abgrenzung, der andere ein nacktes Feld —
     * und wer den nackten erwischt, sieht ein anderes Produkt. Der Trichter beginnt jetzt
     * ausschliesslich dort, wo auch die Werbung hinführt.
     *
     * `?vf=1` nur ausserhalb der eigenen Adresse: Auf versusforge.com IST die Wurzel die
     * Startseite, auf localhost braucht sie den Schalter.
     */
    /**
     * DER LAUF ÜBERLEBT EIN NEULADEN (Owner 09.09.2026: „die früheren Antworten müssen drin
     * bleiben in der Session").
     *
     * WAS VORHER PASSIERTE: Der Auftrag wurde beim Abholen gelöscht — richtig, damit der
     * nächste Besuch nicht mit einem fremden Satz beginnt. Nur war danach NICHTS mehr da.
     * Ein Neuladen, ein versehentlicher Zurück-Wisch am Handy, ein Anruf mitten im Trichter:
     * drei beantwortete Fragen weg, und mit ihnen die Modellaufrufe, die er bezahlt hat.
     *
     * DESHALB EIN ZWEITER EINTRAG: `vf_lauf` trägt den ganzen Stand und wird nach JEDEM Zug
     * neu geschrieben. Er wird beim Abholen NICHT gelöscht — er endet mit der Sitzung, mit
     * dem Löschen am Ende des Trichters oder wenn er nach Hause geht.
     *
     * SITZUNGSSPEICHER, NICHT DAUERSPEICHER: Was er über sein Geschäft erzählt hat, gehört
     * nicht in einen Browser, der es morgen noch hat. Ein Tab, ein Lauf.
     */
    let lauf: Gespeichert | null = null;
    try {
      const roh2 = sessionStorage.getItem(LAUF);
      if (roh2) lauf = JSON.parse(roh2) as Gespeichert;
    } catch { /* kaputter Eintrag — dann eben von vorn */ }
    if (lauf?.ziel && (lauf.text || lauf.url)) {
      setZiel(lauf.ziel === "verkauf" ? "verkauf" : "leads");
      setText(String(lauf.text ?? ""));
      setUrl(String(lauf.url ?? ""));
      setSeite(String(lauf.seite ?? ""));
      setRunden(Array.isArray(lauf.runden) ? lauf.runden : []);
      setVerstanden(String(lauf.verstanden ?? ""));
      setFrage(String(lauf.frage ?? ""));
      setHebel(String(lauf.hebel ?? ""));
      setStand(lauf.stand ?? {});
      setVorschlaege(Array.isArray(lauf.vorschlaege) ? lauf.vorschlaege : []);
      setPlan((lauf.plan ?? null) as Plan | null);
      /* Der Plan ist das teuerste Stück des Laufs — wer dort neu lädt, darf ihn nicht
         verlieren. Sonst zurück in den Schirm, in dem er zuletzt stand. */
      setVerlauf(Array.isArray(lauf.verlauf) ? lauf.verlauf : []);
      setFertig(lauf.fertig === true);
      setPhase(lauf.plan ? "plan" : "chat");
      return;
    }

    if (!roh) { window.location.replace(heim()); return; }
    try {
      const d = JSON.parse(roh) as { ziel?: string; text?: string; url?: string };
      const z = d.ziel === "verkauf" ? "verkauf" : "leads";
      const t = String(d.text ?? "").trim();
      const u = String(d.url ?? "").trim();
      if (!t && !u) { window.location.replace(`/?lang=${lang}`); return; }
      setUrl(u);
      setZiel(z); setText(t);
      /**
       * DER CHAT BEGINNT MIT SEINEM SATZ (09.09.2026).
       *
       * Was er auf der Startseite geschrieben hat, ist die erste Nachricht — nicht ein
       * verlorener Eingabewert, aus dem irgendwo eine Frage abgeleitet wird. Er sieht seinen
       * eigenen Satz oben im Gespräch stehen und weiss, dass er angekommen ist.
       *
       * DIE WEBSITE IST KEIN SCHIRM MEHR: Braucht der Agent sie, fragt er im Gespräch danach.
       */
      const erste: Nachricht[] = [{ rolle: "mensch", text: u ? `${t}\nMeine Website: ${u}` : t }];
      setVerlauf(erste);
      setPhase("chat");
      void chatLauf(erste);
    } catch { /* kaputter Eintrag — dann fängt er eben vorne an */ }
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { endeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [phase, frage]);

  /**
   * DIE STARTSEITE ZÄHLT MIT (09.09.2026, im eigenen Durchlauf gesehen: über „SCHRITT 2"
   * stand „Schritt 1/3").
   *
   * Der Balken zählte nur die Schirme DIESER Seite und wusste nichts vom Feld auf der
   * Startseite — für den Menschen ist das aber Schritt eins, er hat dort etwas
   * geschrieben. Zwei Zahlen für denselben Moment sind schlimmer als gar keine.
   */
  const VOR = 1;
  const schrittNr = SCHRITTE.indexOf(phase) + 1;
  const zeigeNr = schrittNr + VOR;
  const zeigeVon = SCHRITTE.length + VOR;
  /* Zurück nur VOR dem Gespräch — sobald Fragen beantwortet sind, wäre ein Sprung zurück
     ein Sprung in einen Zustand, den es nicht mehr gibt. Dieselbe Regel wie bei David. */
  /* Kein Zurück mehr: Vor dem Feld liegt die Startseite, und dorthin führt der Browser. */
  const zurueckZu: Partial<Record<Phase, Phase>> = {};
  const zurueck = zurueckZu[phase];

  /**
   * DEN PLAN VERSCHICKEN (08.09.2026, Owner: „selbst so würde ich ihm die Analyse nicht
   * komplett zeigen, nur versenden").
   *
   * EIN AUFRUF, ZWEI DINGE: Die Anfrage wird gespeichert UND das PDF geht raus. In dieser
   * Reihenfolge, serverseitig — die Anfrage ist das Geschäft, die Post ist die Lieferung.
   * Scheitert die Post, ist die Anfrage trotzdem da und der Trichter bietet den Download an.
   */
  const planSchicken = async () => {
    if (!mail.includes("@")) { setFehler(t(S.mailFehlt, "")); return; }
    /* Ohne Betriebsnamen kein Trichter: Die Adresse trägt ihn, und „geza1972" schreibt
       niemand in eine Anzeige. */
    if (betrieb.trim().length < 2) { setFehler(t(S.betriebFeld, "")); return; }
    setFehler(""); setBusy(true);
    try {
      const res = await fetch("/api/versusforge", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schritt: "lead", mail, betrieb: betrieb.trim(), ziel, text, url, sprache: lang, plan, runden, device: geraet() }),
      });
      const d = (await res.json()) as Record<string, unknown>;
      if (!res.ok || !d.ok) { setFehler(t(d.error as string, S.fehler)); return; }
      void logFunnelEvent("vf_lead", { theme: "versusforge", ziel, post: d.post ? "ja" : "nein" });
      schrittMessen(EIGENER_MANDANT, "lead");
      setPostOk(d.post === true);
      setTrichterLink(typeof d.trichterLink === "string" ? d.trichterLink : "");
      setPhase("danke");
    } catch { setFehler(t(S.fehler, "")); }
    finally { setBusy(false); }
  };


  /**
   * DAS BILD ZUM POSTEN (Owner 09.09.2026: „er bekommt am Ende ein Bild für Instagram oder
   * FB, das er runterladen kann").
   *
   * ES IST DER ERSTE GEGENSTAND, den er mitnimmt. Der Plan ist zum Lesen; das Bild kann er
   * heute Abend posten. Deshalb steht der Knopf oben im Abschluss und nicht unter dem
   * PDF-Rückfallweg.
   *
   * DIE ADRESSE STEHT MIT DRAUF, sobald sein Trichter angelegt ist — sonst wäre es ein
   * schöner Satz ohne Weg dahinter.
   */
  const bildHolen = async () => {
    if (bildLaeuft) return;
    const hook = String((plan as { hook?: string } | null)?.hook ?? "").trim();
    if (!hook) return;
    setBildLaeuft(true); setFehler("");
    try {
      const res = await fetch("/api/versusforge-bild", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hook,
          aufruf: t(S.bildAufruf, "Jetzt anfragen"),
        }),
      });
      if (!res.ok) { setFehler(t(S.bildFehler, S.fehler)); return; }
      const blob = await res.blob();
      const adresse = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = adresse; a.download = "VersusForge-Anzeige.jpg";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(adresse), 4000);
      void logFunnelEvent("vf_bild", { theme: "versusforge", ziel });
    } catch { setFehler(t(S.bildFehler, S.fehler)); }
    finally { setBildLaeuft(false); }
  };

  /**
   * WOHER ER KAM, DAHIN GEHT ER ZURÜCK — und das ist ab dem 09.09.2026 immer `/engine`
   * (Owner: „ich will, dass die luxurybandit.com Adresse unter versusforge.com läuft, aber
   * die Engine soll dann ihre Adresse bekommen: versusforge.com/engine").
   *
   * VORHER WAREN ES DREI EINGÄNGE — die Wurzel von versusforge.com, das Topic
   * /themes/versusforge und `?vf=1` zum Ausprobieren — und diese Funktion musste am
   * Pfad und am Host raten, welcher davon gemeint war. Die Wurzel gehört jetzt dem
   * Portal, die Engine hat eine eigene Adresse, und damit gibt es nichts mehr zu raten.
   *
   * DIE SPRACHE REIST MIT: Wer den Trichter auf Deutsch angefangen hat, soll beim Abbruch
   * keine englische Startseite sehen.
   */
  const heim = () => {
    /**
     * NACH HAUSE HEISST: DER LAUF IST VORBEI — ABER SEIN SATZ NICHT (Owner 09.09.2026: „die
     * erste Eingabe speichern wir doch auch").
     *
     * Bliebe der ganze Lauf liegen, spränge der Trichter beim nächsten Start sofort wieder
     * in das Gespräch, das er gerade verlassen hat, und ein neuer Satz auf der Startseite
     * wäre wirkungslos. Verschwände dagegen ALLES, stünde er dort vor einem leeren Feld und
     * müsste zwei, drei Sätze über sein Geschäft ein zweites Mal tippen — dann ist „Zurück"
     * in Wahrheit ein Abbruch.
     *
     * Also: Lauf weg, Satz mit. Die Startseite liest ihn genau einmal und räumt ihn weg.
     */
    try {
      sessionStorage.removeItem(LAUF);
      if (text.trim()) sessionStorage.setItem("vf_zurueck", text.trim());
    } catch { /**/ }
    return `/engine?lang=${lang}`;
  };

  /* Dieselbe Kennung wie überall im Haus — sie liegt im Browser und identifiziert ein
     GERÄT, keinen Menschen. Fehlt sie, greift nur noch der Tagesdeckel. */
  const geraet = () => { try { return localStorage.getItem("lb_visitor") ?? ""; } catch { return ""; } };

  /**
   * DER KAUF (08.09.2026). Der Weg des Hauses: Kasse IM FENSTER, kein Popup
   * ([[keine-overlay-dialoge]], [[kasse-in-der-seite]]) — mit dem Seitenwechsel als
   * Rückfallweg für Browser, in denen das eingebettete Formular nicht läuft.
   */
  const kaufen = async () => {
    setKaufFehler(""); setBusy(true); setBusyText(t(S.kaufLaeuft, "Kasse öffnet …"));
    const popup = kassenFenster();
    try {
      /* Admin-PIN mitgeben: Dann schreibt der Server ohne Kasse gut (siehe Route). */
      const pin = (() => { try { return localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { return ""; } })();
      const start = await fetch("/api/versusforge-kasse", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(pin ? { "x-try-look-admin-pin": pin } : {}) },
        body: JSON.stringify({
          was: "start", device: geraet(), eingebettet: kasse.anfordern,
          returnTo: `${window.location.pathname}${window.location.search}`,
        }),
      }).then(r => r.json());
      /* Ohne Kasse gutgeschrieben (Admin): sofort weiter, wie nach einer echten Zahlung. */
      if (start?.adminFrei) {
        try { popup?.close(); } catch { /**/ }
        window.location.replace(`${heim()}&vf_frei=1`);
        return;
      }
      if (start?.error || (!start?.clientSecret && !start?.url)) {
        try { popup?.close(); } catch { /**/ }
        setKaufFehler(t(start?.error, S.fehler)); setBusy(false); setBusyText(""); return;
      }
      if (kasse.uebernehmen(start.clientSecret)) { setBusy(false); setBusyText(""); return; }
      kasseOeffnen(popup, start.url);
    } catch {
      try { popup?.close(); } catch { /**/ }
      setKaufFehler(S.fehler);
    }
    setBusy(false); setBusyText("");
  };

  /**
   * DIE RÜCKKEHR VON DER KASSE. Die Sitzungsnummer steht in der Adresse; ob daran Geld
   * hängt, beantwortet der SERVER bei Stripe — der Browser behauptet nie, bezahlt zu haben.
   *
   * Die Nummer wird danach aus der Adresse entfernt: Sonst löst ein Neuladen denselben
   * Vorgang erneut aus, und der Nutzer sieht bei jedem Aufruf „bezahlt".
   */
  const eingeloest = useRef(false);
  useEffect(() => {
    if (eingeloest.current) return;
    const nr = new URLSearchParams(window.location.search).get("vf_kasse");
    if (!nr) return;
    eingeloest.current = true;
    void (async () => {
      try {
        const d = await fetch("/api/versusforge-kasse", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ was: "einloesen", device: geraet(), sessionId: nr }),
        }).then(r => r.json());
        const sauber = new URL(window.location.href);
        sauber.searchParams.delete("vf_kasse");
        window.history.replaceState({}, "", sauber.toString());
        if (d?.bezahlt) {
          void logFunnelEvent("vf_bezahlt", { theme: "versusforge", ziel });
          /* Er hat für einen Durchlauf bezahlt — also fängt der Durchlauf an, statt ihn
             vor einen Knopf zu stellen, den er gerade schon gedrückt hat. */
          window.location.replace(`${heim()}&vf_frei=1`);
          return;
        }
        setKaufFehler(t(d?.error, S.fehler));
      } catch { setKaufFehler(S.fehler); }
    })();
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  const t = (wert: string | undefined, ersatz = "") => (typeof wert === "string" && wert ? wert : ersatz);

  /** Ein Aufruf an den Berater. Der ganze Zustand geht mit — der Server merkt sich nichts. */
  /**
   * `jetzt` überschreibt einzelne Werte — nötig, weil Zustand nicht sofort gilt.
   *
   * WO ES BEISST: Springt das Briefing direkt in den Plan, sind `setZiel`, `setText` und
   * `setSeite` gerade erst aufgerufen; im selben Durchlauf tragen sie noch die alten,
   * leeren Werte. Ein Plan-Aufruf ohne Ziel und ohne Satz käme leer zurück — und zwar
   * ausgerechnet bei dem, der am meisten geschrieben hat.
   */
  const berater = async (
    schritt: string,
    extra: Runde[] = runden,
    jetzt: Partial<{ ziel: Ziel | ""; text: string; url: string; seite: string }> = {},
  ) => {
    const res = await fetch("/api/versusforge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schritt,
        ziel: jetzt.ziel ?? ziel,
        text: jetzt.text ?? text,
        url: jetzt.url ?? url,
        seite: jetzt.seite ?? seite,
        sprache: lang, runden: extra, device: geraet(),
      }),
    });
    return (await res.json()) as Record<string, unknown>;
  };

  /** Der Auftrag geht als Argument mit, weil der Abholer oben ihn kennt, bevor React den
      Zustand gesetzt hat — sonst schickte der erste Aufruf ein leeres Feld. */

  /**
   * EINE NACHRICHT SCHICKEN — der ganze Trichter läuft darüber (09.09.2026).
   *
   * DER VERLAUF GEHT MIT, nicht nur die letzte Zeile: Nur so kann der Agent auf „nein, das
   * stimmt nicht" reagieren, statt die Korrektur als neue Antwort auf seine letzte Frage zu
   * lesen. Das ist der ganze Unterschied zum Formular.
   *
   * ERST DIE NACHRICHT ZEIGEN, DANN FRAGEN: Sie steht sofort im Verlauf, damit er sieht,
   * dass sie angekommen ist. Der Wartebalken hängt darunter, nicht an ihrer Stelle.
   */
  const chatSenden = (was: string) => {
    const w = was.trim();
    if (!w || busy) return;
    const naechster: Nachricht[] = [...verlauf, { rolle: "mensch", text: w }];
    setVerlauf(naechster);
    void chatLauf(naechster);
  };

  const chatLauf = async (v: Nachricht[]) => {
    setFehler(""); setBusy(true); setBusyText(S.denkt);
    try {
      const res = await fetch("/api/versusforge", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schritt: "chat", ziel: ziel || "leads", text, url, seite, sprache: lang,
          verlauf: v, runden: alsRunden(v), device: geraet(),
        }),
      });
      const d = (await res.json()) as Record<string, unknown>;
      if (d?.bezahlen === true) { setPhase("bezahlen"); return; }
      if (d?.error) { setFehler(String(d.error)); return; }
      const antwort = String(d.antwort ?? "").trim();
      if (!antwort) { setFehler(S.fehler); return; }
      setVerlauf([...v, { rolle: "agent", text: antwort }]);
      setHebel(String(d.hebel ?? ""));
      setStand((d.stand ?? {}) as Record<string, number>);
      setVorschlaege(Array.isArray(d.vorschlaege) ? (d.vorschlaege as string[]) : []);
      setFertig(d.fertig === true);
      /* Die Messung zählt Antworten des Menschen, nicht Nachrichten insgesamt. */
      const meine = v.filter(m => m.rolle === "mensch").length;
      if (meine >= 1 && meine <= 4) schrittMessen(EIGENER_MANDANT, `antwort${meine}`);
    } catch { setFehler(S.fehler); }
    finally { setBusy(false); setBusyText(""); }
  };

  /**
   * DEN PLAN BAUEN — der eine teure Aufruf, und nur auf seinen Klick.
   *
   * Kein Automatismus, sobald der Agent „fertig" meldet: Das Geld gibt der Mensch aus, nicht
   * die Maschine ([[kein-token-fuer-abbrecher]]).
   */
  const planJetzt = async () => {
    setFehler(""); setBusy(true); setPlaeneBauen(true); setBusyText(S.baut);
    try {
      const p = await berater("plan", alsRunden(verlauf));
      if (p?.error) { setFehler(String(p.error)); return; }
      setPlan((p.plan ?? null) as Plan | null);
      setRunden(alsRunden(verlauf));
      void logFunnelEvent("vf_plan", { theme: "versusforge", ziel: ziel || "leads" });
      setPhase("plan");
      schrittMessen(EIGENER_MANDANT, "plan");
    } catch { setFehler(S.fehler); }
    finally { setBusy(false); setPlaeneBauen(false); setBusyText(""); }
  };


  useEffect(() => {
    const hook = String((plan as { hook?: string } | null)?.hook ?? "").trim();
    if (phase !== "plan" || !hook || bildVorschau) return;
    let tot = false;
    let adresse = "";
    void (async () => {
      try {
        const res = await fetch("/api/versusforge-bild", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hook, aufruf: t(S.bildAufruf, "Jetzt anfragen") }),
        });
        if (!res.ok) return;
        adresse = URL.createObjectURL(await res.blob());
        if (tot) { URL.revokeObjectURL(adresse); return; }
        setBildVorschau(adresse);
      } catch { /* dann steht der Hook eben als Text da */ }
    })();
    return () => { tot = true; if (adresse) URL.revokeObjectURL(adresse); };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [phase, plan]);

  const platzhalter = ziel === "leads" ? S.feldPlatzhalterLeads : S.feldPlatzhalterVerkauf;

  return (
    <div className="flex flex-col gap-3">
      {/* Fortschritt und Zurück — dieselbe Anordnung wie im David-Trichter, damit beide
          Strecken sich gleich anfühlen. */}
      {schrittNr > 0 && phase !== "danke" && (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-1.5">
            {Array.from({ length: zeigeVon }, (_, i) => (
              <span key={i} className={`h-2 flex-1 rounded-full ${i < zeigeNr ? "bg-[#f6cf51]" : "bg-white/15"}`} />
            ))}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-bold text-white/45 md:text-[15px]">
              {t(S.fortschrittWort, "Schritt")} {zeigeNr}/{zeigeVon}
            </span>
            {zurueck && !busy && (
              <button type="button" onClick={() => { void logFunnelEvent("vf_zurueck", { theme: "versusforge", von: phase }); setPhase(zurueck); }}
                className="flex items-center gap-1 text-[14px] font-bold text-white/45 transition active:scale-95 md:text-[15px]">
                <ChevronLeft className="h-3.5 w-3.5" />{t(S.zurueck, "Zurück")}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Solange geprüft wird, ob ein Auftrag mitgekommen ist: ein Balken, kein leerer
          Schirm — und kein zweites Eingabefeld. */}
      {phase === "warten" && (
        <Kasten polster="p-5"><Fortschritt text={S.denkt} /></Kasten>
      )}

      {/* ── 1 · DIE WEBSITE (Owner 09.09.2026: „gleich am Anfang, als zweiter Schritt") ── */}
      {/* ── DAS GESPRÄCH — ein Chat, keine Schritte (Owner 09.09.2026) ──
          Begründung in components/VersusForgeGespraech.tsx. Hier standen zwei Schirme:
          „Hast du eine Website?" und die Rückfrage mit Antwortfeld. Beides macht jetzt der
          Agent im Gespräch, in beliebiger Reihenfolge und mit Widerspruchsrecht. */}
      {phase === "chat" && (
        <VersusForgeGespraech
          verlauf={verlauf}
          stand={stand}
          hebel={hebel}
          vorschlaege={vorschlaege}
          busy={busy}
          busyText={busyText}
          fehler={fehler}
          fertig={fertig}
          schicken={chatSenden}
          planBauen={() => void planJetzt()}
          zurueck={() => { window.location.href = heim(); }}
          texte={{
            platzhalter: t(S.chatPlatzhalter, "Schreib einfach."),
            senden: t(S.chatSenden, "Senden"),
            planKnopf: t(S.chatPlanKnopf, "Plan jetzt bauen"),
            zurueck: t(S.zurueckWort, "Zurück"),
            denkt: S.denkt,
          }}
        />
      )}


      {phase === "plan" && plan && (
        <Kasten polster="p-5">
          {bildVorschau ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={bildVorschau} alt={String(plan.hook ?? "")}
              className="w-full max-w-[340px] shadow-[0_10px_34px_rgba(20,24,28,.18)]" />
          ) : (
            /* Solange das Bild noch entsteht: der Satz selbst, nicht ein leerer Kasten. */
            <p className="text-[24px] font-black leading-tight text-white md:text-[30px]">{plan.hook}</p>
          )}

          {plan.hookWarum && (
            <p className="mt-3.5 text-[15px] font-semibold leading-snug text-white/50">{plan.hookWarum}</p>
          )}

          {/* DIE ADRESSE IST DIE BEDINGUNG, nicht die Bitte — und sie ist es zu Recht: Er
              bekommt dafür seinen Trichter und die Anleitung, nicht einen Rundbrief. */}
          <div className="mt-7 border-t border-white/10 pt-5">
            <p className="text-[16px] font-bold leading-snug text-white/80 md:text-[17px]">{t(S.vorschauFeld, "")}</p>
            {/* SEIN BETRIEBSNAME, VOR DER ADRESSE (09.09.2026): Ohne ihn hiess sein Trichter
                nach dem Teil vor dem @ — bei einer Gmail-Adresse also nach seinem
                Nutzerkonto. Begründung in lib/versusforge-texte.ts bei `betriebFeld`. */}
            <Eingabe className="mt-3" value={betrieb}
              onChange={e => setBetrieb(e.target.value)} placeholder={t(S.betriebPlatzhalter, "")} />
            <p className="mt-1.5 text-[14.5px] font-semibold text-white/55">{t(S.betriebFein, "")}</p>
            <Eingabe className="mt-3" type="email" inputMode="email" value={mail}
              onChange={e => setMail(e.target.value)} placeholder={S.mailPlatzhalter} />
            <Fehlerzeile>{fehler}</Fehlerzeile>
            <div className="mt-3">
              <Knopf art="gold" disabled={busy} onClick={() => void planSchicken()}>
                {busy ? t(S.denkt, "…") : t(S.vorschauKnopf, "Plan schicken")}
              </Knopf>
            </div>
          </div>
        </Kasten>
      )}

      {/* ── 3 · DIE ADRESSE, GANZ AM SCHLUSS ──
          ZWEI AUSGÄNGE, KEIN SACKGASSE (Hausregel `immer-close-einbauen`, hier verletzt und
          vom Owner beim ersten eigenen Durchlauf gefunden): zurück zum Plan, und nach dem
          Schicken ein sichtbares Ergebnis statt eines Knopfs, der nichts tut. */}
      {/* ── DIE BESTÄTIGUNG ──
          Kein zweites Formular mehr: Die Adresse wurde auf dem Plan-Schirm abgefragt, denn
          dort ist sie die Bedingung für das PDF und nicht eine Bitte am Ende.

          ZWEI FASSUNGEN, WEIL ES ZWEI WAHRHEITEN GIBT: Ging die Post raus, sagen wir das.
          Ging sie NICHT raus, sagen wir auch das — und geben den Plan zum Herunterladen.
          Ein „ist unterwegs" über einer Mail, die nie ankam, wäre die teuerste Art zu lügen:
          Er wartet, statt sich zu melden. */}
      {phase === "danke" && (
        <Kasten polster="p-5">
          <h1 className="text-[30px] font-black leading-tight text-white md:text-[42px]">
            {postOk ? t(S.postUnterwegs, "Unterwegs.") : t(S.dankeAbTitel, "Ist angekommen.")}
          </h1>
          <p className="mt-3 text-[17px] font-semibold leading-relaxed text-white/70 md:text-[19px]">
            {postOk ? t(S.postUnterwegsText, "") : t(S.postFehler, "")}
          </p>

          {/**
            * KEIN PDF-RÜCKFALLWEG MEHR (09.09.2026, mit dem PDF selbst weggefallen).
            *
            * DER AUSWEG BLEIBT TROTZDEM (Hausregel `immer-close-einbauen`): Ging die Mail
            * nicht raus, stehen seine zwei Adressen direkt darunter auf dem Schirm — er kann
            * sie kopieren und hat alles. Ein Knopf, der ein Dokument verspricht, das es nicht
            * mehr gibt, wäre schlimmer als kein Knopf.
            */}

          {/**
            * SEIN EIGENER TRICHTER — DIE ADRESSE, NICHT DAS VERSPRECHEN (Owner 09.09.2026:
            * „wenn ich den Tunnel durchgehe, als Zahnarzt, dann bekomme ich den Link dazu zu
            * dem Funnel" · „ist sofort echt jetzt").
            *
            * ER STEHT ÜBER DEM KONTAKTBLOCK, nicht darunter: Das ist das Stärkste auf diesem
            * Schirm. Bis hierher hat er Text gelesen; hier kann er etwas aufmachen.
            *
            * UND DER SATZ DANEBEN SAGT DIE GRENZE, statt sie zu verstecken: Der Trichter
            * läuft, die Anfragen laufen ein — lesen kann er sie erst mit dem Dashboard. Wer
            * die Grenze erst beim Klicken merkt, fühlt sich hereingelegt; wer sie hier liest,
            * versteht, was er kauft.
            */}
          {/* DAS BILD ZUERST: Es ist das Einzige auf diesem Schirm, das er heute Abend
              benutzen kann. */}
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f6cf51]">
              {t(S.bildKicker, "FÜR INSTAGRAM UND FACEBOOK")}
            </p>
            <p className="mt-2 text-[16px] font-bold leading-snug text-white/85 md:text-[17px]">
              {t(S.bildTitel, "Deine Anzeige als Bild.")}
            </p>
            <p className="mt-1.5 text-[14.5px] font-bold leading-relaxed text-white/55">
              {t(S.bildText, "")}
            </p>
            <div className="mt-3">
              <Knopf art="gold" disabled={bildLaeuft} onClick={() => void bildHolen()}>
                {bildLaeuft ? t(S.denkt, "…") : t(S.bildKnopf, "Bild laden")}
              </Knopf>
            </div>
          </div>

          {trichterLink && (
            <div className="mt-6 rounded-2xl border border-[#f6cf51]/40 bg-[#f6cf51]/[0.06] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f6cf51]">
                {t(S.trichterKicker, "DEIN TRICHTER")}
              </p>
              <p className="mt-2 text-[16px] font-bold leading-snug text-white/85 md:text-[17px]">
                {t(S.trichterTitel, "Er steht. Mach ihn auf.")}
              </p>
              {/**
                * ZWEI ADRESSEN, DIE ANZEIGEN-SEITE ZUERST (09.09.2026 beim Durchgehen
                * gefunden: die Seite mit Bild, Texten und Anleitung existierte, aber
                * NICHTS verlinkte sie — weder hier noch in der Mail).
                *
                * Sie steht oben, weil sie das Werkzeug ist. Der Trichter darunter ist der
                * Beweis: den macht er auf, um zu sehen, dass es wirklich läuft.
                */}
              <a
                href={`${trichterLink}/anzeige`}
                target="_blank"
                rel="noopener"
                className="mt-3 block break-all rounded-xl border border-[#f6cf51]/40 bg-[#f6cf51]/[0.08] px-3 py-2.5 text-[15px] font-bold text-white/90"
              >
                <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-[#f6cf51]">
                  {t(S.trichterAnzeige, "Deine Anzeige")}
                </span>
                <span className="underline underline-offset-2">versusforge.com{trichterLink}/anzeige</span>
              </a>
              <a
                href={trichterLink}
                target="_blank"
                rel="noopener"
                className="mt-2 block break-all rounded-xl border border-white/20 bg-white/[0.08] px-3 py-2.5 text-[15px] font-bold text-white/90"
              >
                <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-white/45">
                  {t(S.trichterSeite, "Dein Trichter")}
                </span>
                <span className="underline underline-offset-2">versusforge.com{trichterLink}</span>
              </a>
              <div className="mt-3 flex flex-wrap gap-2">
                <Knopf
                  art="umriss"
                  onClick={() => {
                    /* Kopieren ist hier der eigentliche Knopf: Die Adresse soll in seine
                       Anzeige, nicht in seinen Kopf. */
                    void navigator.clipboard?.writeText(`https://versusforge.com${trichterLink}/anzeige`)
                      .then(() => { setLinkKopiert(true); setTimeout(() => setLinkKopiert(false), 2500); })
                      .catch(() => { /* dann liest er ihn eben ab */ });
                  }}
                >
                  {linkKopiert ? t(S.trichterKopiert, "Kopiert.") : t(S.trichterKopieren, "Link kopieren")}
                </Knopf>
              </div>
              <p className="mt-3 text-[14.5px] font-bold leading-relaxed text-white/60">
                {t(S.trichterGrenze, "Der Trichter läuft und sammelt Anfragen. Lesen kannst du sie im Dashboard — das schaltest du frei, wenn du so weit bist.")}
              </p>
            </div>
          )}

          {/* Und der Mensch dahinter — für den, der jetzt reden will. */}
          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="text-[16px] font-bold leading-snug text-white/80 md:text-[17px]">{t(S.dankeTitel, "")}</p>
            <p className="mt-1.5 text-[15px] font-semibold leading-relaxed text-white/50 md:text-[16px]">{t(S.dankeText, "")}</p>
            <div className="mt-3"><Knopf art="umriss" href="/contact">{t(S.dankeDirekt, "Jetzt schreiben")}</Knopf></div>
          </div>
        </Kasten>
      )}


      <div ref={endeRef} />
    </div>
  );
}
