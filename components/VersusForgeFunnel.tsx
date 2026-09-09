"use client";

import { useEffect, useRef, useState } from "react";
import { useKasseImFenster } from "@/components/KasseImFenster";
import { kasseOeffnen, kassenFenster } from "@/lib/browser-erkennen";
import { ChevronLeft } from "lucide-react";
import { Eingabe, EingabeMehrzeilig, Knopf, Fehlerzeile, Fortschritt, Kasten } from "@/components/CI";
import { logFunnelEvent, logTunnelEvent } from "@/lib/track-funnel";
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
type Phase = "warten" | "webseite" | "bezahlen" | "gespraech" | "plan" | "danke";
type Ziel = "leads" | "verkauf";
type Runde = { frage: string; antwort: string };
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
const SCHRITTE: Phase[] = ["webseite", "gespraech", "plan"];
/* Muss zum Deckel im Server stehen (`MAX_FRAGEN` in app/api/versusforge/route.ts). */
const MAX_FRAGEN = 4;

export default function VersusForgeFunnel({ S, lang }: { S: VersusForgeTexte; lang: string }) {
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
  const [reaktion, setReaktion] = useState("");
  const [frage, setFrage] = useState("");
  /* Antworten zum Antippen — der Nutzer will klicken, nicht tippen. Antippen SCHICKT NICHT
     ab: Er legt den Satz ins Feld und kann ihn ändern, bevor er weitergeht. */
  const [vorschlaege, setVorschlaege] = useState<string[]>([]);
  const [antwort, setAntwort] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [mail, setMail] = useState("");
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

  useEffect(() => { void logTunnelEvent("funnel_started", "versusforge"); }, []);

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
    try { roh = sessionStorage.getItem("vf_auftrag") ?? ""; sessionStorage.removeItem("vf_auftrag"); } catch { /* dann eben nicht */ }
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
    if (!roh) { window.location.replace(heim()); return; }
    try {
      const d = JSON.parse(roh) as { ziel?: string; text?: string; url?: string };
      const z = d.ziel === "verkauf" ? "verkauf" : "leads";
      const t = String(d.text ?? "").trim();
      const u = String(d.url ?? "").trim();
      if (t.length < 15 && !u) { window.location.replace(`/?lang=${lang}`); return; }
      setUrl(u);
      setZiel(z); setText(t);
      /**
       * SCHRITT ZWEI: DIE WEBSITE (09.09.2026).
       *
       * Hat er auf der Startseite schon eine Adresse hineingeschrieben, ist die Frage
       * beantwortet und wir überspringen sie — noch einmal danach zu fragen wäre
       * dieselbe Zumutung wie der doppelte Hook, den wir gestern beseitigt haben.
       */
      if (u) { void briefingMit(z, t, u); return; }
      setPhase("webseite");
    } catch { /* kaputter Eintrag — dann fängt er eben vorne an */ }
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { endeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [phase, frage, reaktion]);

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
    setFehler(""); setBusy(true);
    try {
      const res = await fetch("/api/versusforge", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schritt: "lead", mail, ziel, text, url, sprache: lang, plan, runden }),
      });
      const d = (await res.json()) as Record<string, unknown>;
      if (!res.ok || !d.ok) { setFehler(t(d.error as string, S.fehler)); return; }
      void logFunnelEvent("vf_lead", { theme: "versusforge", ziel, post: d.post ? "ja" : "nein" });
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
  const heim = () => `/engine?lang=${lang}`;

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
  const berater = async (schritt: string, extra: Runde[] = runden) => {
    const res = await fetch("/api/versusforge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schritt, ziel, text, url, seite, sprache: lang, runden: extra, device: geraet() }),
    });
    return (await res.json()) as Record<string, unknown>;
  };

  /** Der Auftrag geht als Argument mit, weil der Abholer oben ihn kennt, bevor React den
      Zustand gesetzt hat — sonst schickte der erste Aufruf ein leeres Feld. */
  /**
   * SCHRITT 2 ABSCHLIESSEN — mit Adresse oder ausdrücklich ohne.
   *
   * KEINE PRÜFUNG AUF EINE GÜLTIGE ADRESSE HIER: Der Server liest die Seite und sagt selbst,
   * wenn nichts herauskam (`seiteLesen`). Ein Browser, der „das ist keine Website" behauptet,
   * liegt bei jeder zweiten Schreibweise daneben und hält Leute auf, die recht haben.
   */
  const weiterMitSeite = async (ohne = false) => {
    if (!ziel) return;
    const u = ohne ? "" : url.trim();
    if (ohne) setUrl("");
    void logFunnelEvent("vf_webseite", { theme: "versusforge", hat: u ? "ja" : "nein" });
    await briefingMit(ziel, text, u);
  };

  const briefingMit = async (z: Ziel, t: string, u = "") => {
    setFehler(""); setBusy(true); setBusyText(S.denkt);
    /**
     * ERST UMSCHALTEN, WENN EINE FRAGE DA IST (Owner 08.09.2026, mit Bild: „das darf nicht
     * passieren").
     *
     * Vorher stand hier `setPhase("gespraech")` VOR dem Aufruf. Kam keine Frage zurück, stand
     * der Mensch vor „RÜCKFRAGE · 1 VON 4" mit leerem Kasten und einer roten Zeile — ein
     * Bildschirm, der aussieht wie ein Absturz. Der Wartebalken der Phase „warten" ist der
     * richtige Ort dafür; umgeschaltet wird erst, wenn wirklich etwas zu lesen ist.
     */
    try {
      const res = await fetch("/api/versusforge", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schritt: "briefing", ziel: z, text: t, url: u, sprache: lang, runden: [], device: geraet() }),
      });
      const d = (await res.json()) as Record<string, unknown>;
      /* DIE AUFGEBRAUCHTE GRATIS-ANALYSE IST KEIN FEHLER (Owner 08.09.2026). Sie zurück ans
         Eingabefeld zu schicken, wäre die teuerste Stelle der Seite: Wer hier steht, hat den
         Plan gesehen und will einen zweiten. Er bleibt, wo er ist, und bekommt ein Angebot. */
      if (d?.bezahlen === true) {
        setBusy(false); setBusyText("");
        setPhase("bezahlen");
        void logFunnelEvent("vf_deckel_angebot", { theme: "versusforge", ziel: z });
        return;
      }
      if (d?.error) {
        /* Der Fehler gehört an das Feld, in das er geschrieben hat — nicht auf einen Schirm
           ohne Frage. Er wird über den Sitzungsspeicher zurückgereicht. */
        try { sessionStorage.setItem("vf_fehler", String(d.error)); } catch { /**/ }
        window.location.replace(heim());
        return;
      }
      const frage1 = String(d.frage ?? "");
      if (!frage1) {
        /* Ohne Frage gibt es nichts zu zeigen — zurück auf die Startseite, wo das Feld steht,
           statt auf einen leeren Gesprächsschirm. */
        setFehler(S.fehler); setBusy(false); setBusyText("");
        window.location.replace(heim());
        return;
      }
      setVerstanden(String(d.verstanden ?? ""));
      setSeite(String(d.seite ?? ""));
      setFrage(frage1);
      setVorschlaege(Array.isArray(d.vorschlaege) ? (d.vorschlaege as string[]) : []);
      setPhase("gespraech");
      void logFunnelEvent("vf_briefing", { theme: "versusforge", ziel: z });
    } catch { setFehler(S.fehler); }
    setBusy(false); setBusyText("");
  };

  /**
   * EINEN SCHRITT ZURÜCK (Owner 09.09.2026: „unten Zurück-Button" · „Link, Pfeil, Text").
   *
   * OHNE NEUEN MODELLAUFRUF: Die letzte Runde trägt Frage UND Antwort. Zurück heisst also
   * nur, sie aus der Liste zu nehmen und ihre Frage wieder anzuzeigen — kein Aufruf, keine
   * Kosten, keine Wartezeit. Ein Zurück, das erst wieder denken muss, ist kein Zurück.
   *
   * VOR DER ERSTEN FRAGE führt es aus dem Trichter heraus, dorthin, wo er hergekommen ist.
   */
  const einenZurueck = () => {
    setFehler("");
    setReaktion("");
    /* Vor der ersten Frage führt Zurück dorthin, wo er hergekommen ist — `heim()`
       kennt alle drei Eingänge (Wurzel, Topic, ?vf=1). */
    if (!runden.length) { window.location.href = heim(); return; }
    const letzte = runden[runden.length - 1];
    setRunden(runden.slice(0, -1));
    setFrage(letzte.frage);
    setAntwort(letzte.antwort);
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

  const antwortSenden = async (uebersprungen = false) => {
    const wert = uebersprungen ? "" : antwort.trim();
    if (!uebersprungen && !wert) return;
    setFehler(""); setBusy(true); setBusyText(S.denkt);
    const neu = [...runden, { frage, antwort: wert }];
    try {
      const d = await berater("antwort", neu);
      if (d?.error) { setFehler(String(d.error)); setBusy(false); return; }
      setRunden(neu); setAntwort("");
      setReaktion(String(d.reaktion ?? ""));
      void logFunnelEvent("vf_antwort", { theme: "versusforge", nr: String(neu.length), uebersprungen: uebersprungen ? "ja" : "nein" });
      if (d.fertig === true) {
        setPlaeneBauen(true); setBusyText(S.baut);
        const p = await berater("plan", neu);
        if (p?.error) { setFehler(String(p.error)); setBusy(false); return; }
        setPlan((p.plan ?? null) as Plan | null);
        void logFunnelEvent("vf_plan", { theme: "versusforge", ziel });
        setPlaeneBauen(false); setPhase("plan");
      } else {
        setFrage(String(d.frage ?? ""));
        setVorschlaege(Array.isArray(d.vorschlaege) ? (d.vorschlaege as string[]) : []);
      }
    } catch { setFehler(S.fehler); }
    setPlaeneBauen(false); setBusy(false); setBusyText("");
  };

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
      {phase === "webseite" && (
        <Kasten polster="p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f6cf51]">
            {t(S.webKicker, "Schritt 2")}
          </p>
          <h1 className="mt-2 text-[28px] font-black leading-[1.15] text-white md:text-[36px]">
            {t(S.webTitel, "Hast du eine Website?")}
          </h1>
          {/* DER SATZ SAGT DEN NUTZEN, NICHT DIE BITTE (Owner 09.09.2026: „dann muss der User
              nicht alles erklären"). „Bitte gib deine Adresse an" klingt nach Formular; „dann
              musst du weniger erzählen" ist ein Tausch, den jeder sofort versteht. */}
          <p className="mt-2.5 text-[16px] leading-[1.5] text-white/70 md:text-[17px]">
            {t(S.webText, "Dann lese ich sie einmal und frage dich nur noch das, was dort nicht steht.")}
          </p>
          <Eingabe
            className="mt-4"
            value={url}
            hell
            onChange={e => { setUrl(e.target.value); if (fehler) setFehler(""); }}
            onKeyDown={e => { if (e.key === "Enter" && url.trim()) { e.preventDefault(); void weiterMitSeite(); } }}
            style={{ background: "#ffffff", borderColor: "rgba(0,0,0,0.14)", fontFamily: "inherit" }}
            placeholder={t(S.webPlatzhalter, "praxis-mueller.de")}
            inputMode="url"
            autoFocus
          />
          <Fehlerzeile>{fehler}</Fehlerzeile>
          {busy ? (
            <div className="mt-4"><Fortschritt text={busyText} /></div>
          ) : (
            <>
              <div className="mt-4"><Knopf art="gold" onClick={() => void weiterMitSeite()}>{t(S.webKnopf, "Weiter")}</Knopf></div>
              {/* KEIN ZWEITER KNOPF, SONDERN EIN LINK. „Ich habe keine" ist kein
                  gleichwertiger Weg, sondern die Ausnahme — als Knopf stritte er mit dem
                  einen, der weiterführt (CI-Regel: ein gefüllter Knopf je Schirm). */}
              <button
                type="button"
                onClick={() => void weiterMitSeite(true)}
                className="mt-3.5 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#1d6fd0]"
              >
                {t(S.webOhne, "Ich habe keine Website")}
              </button>
            </>
          )}
        </Kasten>
      )}

      {/* ── 2 · DAS GESPRÄCH ── */}
      {phase === "gespraech" && (
        <>
          {/* Was er zuletzt gesagt hat, steht ÜBER der Frage — sonst fühlt sich jede Frage
              an wie das nächste Formularfeld statt wie eine Antwort auf die letzte. */}
          {(verstanden || reaktion) && (
            <div className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/[0.05] px-4 py-3.5">
              {/**
                * KEIN KOPF, KEINE WORTMARKE AN DER SPRECHZEILE (Owner 09.09.2026: „das raus").
                *
                * Beides stammt aus der schwarzen Fassung, in der die Sprechblase sich von der
                * Seite abheben musste. Auf der hellen Seite steht der Name schon oben im Kopf
                * — und ein Roboterkopf neben einem Satz über Implantate erklärt nichts, er
                * lenkt nur ab. Was zählt, ist der Satz.
                */}
              <div className="min-w-0">
                <p className="mt-1.5 text-[17px] font-semibold leading-relaxed text-white/85 md:text-[19px]">{reaktion || verstanden}</p>
              </div>
            </div>
          )}
          <Kasten polster="p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f6cf51]">
              {/* NIE ÜBER DEN DECKEL ZÄHLEN (gesehen 08.09.2026 im ersten Durchlauf durch
                  die Oberfläche: „RÜCKFRAGE · 5 VON 4"). Nach der vierten Antwort steht der
                  Zähler auf 5, während im Hintergrund schon der Plan gebaut wird — eine Zahl,
                  die es nicht geben darf, und sie steht ausgerechnet in dem Moment da, in dem
                  der Mensch wartet und nichts anderes zu lesen hat. */}
              {S.fragenKopf} · {Math.min(runden.length + 1, MAX_FRAGEN)} {S.von} {MAX_FRAGEN}
            </p>
            {/* WÄHREND DER PLAN GEBAUT WIRD, STEHT DIE ALTE FRAGE NICHT MEHR DA (08.09.2026,
                im Durchlauf gesehen): Unter „In welchem Umkreis …?" lief der Balken „Ich baue
                den Plan" — die Frage war längst beantwortet, sah aber aus, als warte sie noch
                auf eine Antwort. Beim normalen Nachladen zwischen zwei Fragen bleibt sie
                stehen, das ist richtig; nur am Ende verschwindet sie. */}
            {!plaeneBauen && <h1 className="mt-2 text-[28px] font-black leading-[1.15] text-white md:text-[36px]">{frage}</h1>}
            {busy ? (
              <div className="mt-4"><Fortschritt text={busyText} /></div>
            ) : (
              <>
                {/* Weisses Feld, Schrift der Seite — dieselbe Entscheidung wie auf der
                    Startseite (Owner 08.09.2026: „dieses Feld weiss" · „keine
                    Serifenschrift"). Die CI setzt Eingaben in Serifen; das gehört zur
                    Einladungskarte, nicht zu einer Firmenstrecke. */}
                <EingabeMehrzeilig className="mt-3" zeilen={4} value={antwort} hell
                  onChange={e => setAntwort(e.target.value)}
                  style={{ background: "#ffffff", borderColor: "rgba(0,0,0,0.14)", fontFamily: "inherit" }}
                  placeholder={S.antwortPlatzhalter} />
                {vorschlaege.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {vorschlaege.map((v, i) => (
                      <button key={i} type="button" onClick={() => setAntwort(v)}
                        className="rounded-full border border-white/20 lb-goldhauch px-3.5 py-2 text-[14px] font-bold text-white/75 transition hover:border-[#f6cf51]/50 hover:text-white active:scale-95">
                        {v}
                      </button>
                    ))}
                  </div>
                )}
                <Fehlerzeile>{fehler}</Fehlerzeile>
                <div className="mt-3"><Knopf art="gold" onClick={() => void antwortSenden()}>{S.antworten}</Knopf></div>
                <div className="mt-2"><Knopf art="umriss" onClick={() => void antwortSenden(true)}>{S.ueberspringen}</Knopf></div>
                {/* ZURÜCK ALS TEXT MIT PFEIL (Owner 09.09.2026: „Link, Pfeil, Text") — kein
                    dritter Knopf: Auf einem Schirm mit „Antwort senden" und „Weiss ich nicht"
                    wäre er die dritte Fläche und würde mit beiden streiten. */}
                <button
                  type="button"
                  onClick={einenZurueck}
                  className="mt-3.5 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#1d6fd0]"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                  {t(S.zurueckWort, "Zurück")}
                </button>
              </>
            )}
          </Kasten>
        </>
      )}

      {/* ── 2 · DER PLAN ── */}
      {/* ── DER PLAN: NUR DER HOOK, DER REST GEHT PER POST ──
          (Owner 08.09.2026: „selbst so würde ich ihm die Analyse nicht komplett zeigen, nur
          versenden" · „das wäre doch schlau").

          DER HOOK BLEIBT SICHTBAR, weil er der Beweis ist: Er enthält, was ER gesagt hat.
          Alles andere — Zielgruppe, Motive, Anzeigentexte, Bauanleitung, Strecke, Budget,
          Warnung, Protokoll — steht im PDF. Ein Bildschirm voller Text wird überflogen und
          ist weg; ein PDF im Postfach wird geöffnet, weitergeleitet und liegt in einem
          halben Jahr noch da.

          DIE LISTE NENNT NUR ECHTE ZAHLEN aus SEINEM Plan. Sie zeigt den Umfang, nicht den
          Inhalt — und sie ist nachprüfbar, sobald das PDF da ist. */}
      {/**
        * DER PLAN-SCHIRM: DAS BILD, DANN DAS FELD (Owner 09.09.2026).
        *
        * WEG SIND: die Überschrift, der Hook als Textkasten, der Ankündigungssatz und die
        * Inhaltsliste („3 Zielgruppen, 2 Motive, …"). Alle vier stammen aus der PDF-Zeit und
        * hatten dieselbe Aufgabe — Umfang behaupten, den man nicht sehen kann. Das Bild zeigt
        * ihn.
        */}
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
