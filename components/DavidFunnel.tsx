"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { FileText, Trash2, Upload, Check } from "lucide-react";
import { Eingabe, EingabeMehrzeilig, Knopf, Fehlerzeile, Fortschritt, Haken, Kasten } from "@/components/CI";
import { logFunnelEvent, logTunnelEvent } from "@/lib/track-funnel";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";
import type { DavidTunnelTexte } from "@/lib/david-tunnel-texte";
import DavidReportAnsicht from "@/components/DavidReportAnsicht";
import DavidAngebote from "@/components/DavidAngebote";
import DavidSichern from "@/components/DavidSichern";
import type { DavidReport } from "@/lib/david-store";

/**
 * DER DAVID-TRICHTER — EIN GESPRÄCH, KEIN FORMULAR.
 *
 * Der Ablauf ist der des Owners (Vorgabe 28.08.2026, §2–§30) und läuft in EINER Strecke:
 *
 *   name → mail (+ Datenschutz) → LEAD GESPEICHERT → cv → job → gespraech → bericht
 *        → angebote → feedback → interessen/kritik → updates → danke
 *
 * DREI DINGE, DIE HIER ANDERS SIND ALS IM REST DES HAUSES, jeweils mit Grund:
 *
 * 1. VORNAME UND E-MAIL AUF ZWEI SCHIRMEN, nicht auf einem (`TunnelStart` kann beides
 *    zusammen). Der Owner hat es ausdrücklich zweistufig diktiert, und der Grund ist die
 *    Dramaturgie: David fragt nach dem Namen und BENUTZT ihn danach („Hallo Geza."). Ein
 *    Formular mit zwei Feldern kann das nicht.
 * 2. DER LEAD WIRD VOR DEM LEBENSLAUF GESPEICHERT (§6). Wer beim Upload abspringt — und das
 *    sind erfahrungsgemäss die meisten —, ist trotzdem erfasst.
 * 3. DAS ANTWORTFELD VERSCHWINDET, sobald David genug weiss (§16). Ein Eingabefeld, das nach
 *    dem Schlusssatz stehen bleibt, lädt zu einer Antwort ein, die niemand mehr liest.
 *
 * ALLE TEXTE KOMMEN ALS `S` VOM SERVER (deutsche Quelle, sieben Sprachen über
 * `davidTunnelInSprache`) — im Client steht kein einziger Satz.
 */

type Phase =
  | "name" | "mail" | "cv" | "job" | "uebergang" | "anlauf"
  | "gespraech" | "analyse" | "bericht"
  | "feedback" | "interessen" | "kritik" | "updates" | "danke";

type Zeile = { von: "david" | "ich"; text: string };

const ABLAGE = "lb_david_entwurf";

export default function DavidFunnel({ werbeTitel,  S, lang, preisUnterlagen, preisVideo, beispielCv, beispielVideo, inhalt }: {
  S: DavidTunnelTexte;
  /** Der Werbesatz der Seite — er gilt, solange der Schritt keinen eigenen Titel hat. */
  werbeTitel?: string;
  lang: string;
  /** Fertig formatiert aus lib/pricing — nie eine Zahl im Text (Hausregel). */
  preisUnterlagen: string;
  /** Der Preis der Video-Bewerbung — höher als der der Unterlagen. */
  preisVideo: string;
  /** Das Muster-Dossier (Server-Baustein) — „die Leute kaufen, was sie sehen". */
  beispielCv?: ReactNode;
  /** Die Beispiel-Video-Karte (Server-Baustein). */
  beispielVideo?: ReactNode;
  /** Der Landingpage-Inhalt unter dem Trichter (Dauerregel `tunnel-zeigt-landingpage-inhalt`). */
  inhalt?: ReactNode;
}) {
  const [phase, setPhase] = useState<Phase>("name");
  const [vorname, setVorname] = useState("");
  const [mail, setMail] = useState("");
  const [haken, setHaken] = useState(false);
  const [genId, setGenId] = useState("");
  const [cvName, setCvName] = useState("");
  const [cvPath, setCvPath] = useState("");
  const [anzeige, setAnzeige] = useState("");
  const [verlauf, setVerlauf] = useState<Zeile[]>([]);
  const [frage, setFrage] = useState("");
  const [antwort, setAntwort] = useState("");
  const [nummer, setNummer] = useState(1);
  const [report, setReport] = useState<DavidReport | null>(null);
  /* Die Kopfdaten des Ergebnisses (Stelle, Ort, Schwerpunkte) — sie entstehen unterwegs im
     Gespräch und tragen später die Kopfzeile des Berichts (Design des Owners 28.08.2026). */
  const [jobTitel, setJobTitel] = useState("");
  const [jobOrt, setJobOrt] = useState("");
  const [jobArt, setJobArt] = useState("");
  const [schwerpunkte, setSchwerpunkte] = useState<string[]>([]);
  const [layout, setLayout] = useState<"gut" | "mittel" | "schwach" | undefined>();
  const [cvFoto, setCvFoto] = useState<boolean | undefined>();
  const [nuetzlich, setNuetzlich] = useState("");
  const [interessen, setInteressen] = useState<string[]>([]);
  const [kritik, setKritik] = useState("");
  const [updates, setUpdates] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyText, setBusyText] = useState("");
  const [fehler, setFehler] = useState("");
  const endeRef = useRef<HTMLDivElement>(null);

  const geraet = () => { try { return localStorage.getItem("lb_visitor") ?? ""; } catch { return ""; } };
  /**
   * DIE ANMELDUNG REIST MIT (Owner 28.08.2026: „bin doch eingeloggt").
   *
   * Der Server prüft „Konto schlägt Gerät" — aber nur, wenn er das Konto überhaupt sieht.
   * `getSellerFromRequest` liest den `Authorization`-Kopf; ohne ihn ist jeder Besucher
   * anonym, und ein angemeldeter Nutzer auf einem zweiten Gerät fliegt hinaus.
   */
  const anmeldeKopf = (): Record<string, string> => {
    try {
      const tok = getStoredAuthSession()?.access_token ?? "";
      return tok ? { Authorization: `Bearer ${tok}` } : {};
    } catch { return {}; }
  };
  /* DER ADMIN-AUSWEIS REIST MIT (29.08.2026) — sonst steht der Owner beim eigenen Testen vor
     dem Tagesdeckel. Der Server prüft die Nummer selbst; der Browser entscheidet nichts. */
  const adminKopf = (): Record<string, string> => {
    try { const p = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; return p ? { "x-try-look-admin-pin": p } : {}; }
    catch { return {}; }
  };
  const kopfzeilen = (): Record<string, string> => ({ "Content-Type": "application/json", ...anmeldeKopf(), ...adminKopf() });
  const mailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail.trim());
  const name = vorname.trim();
  const mitNamen = (t: string) => t.replace("{name}", name || "");
  /* Dasselbe, aber mit einem Namen von aussen — beim Wiedereinstieg steht der Zustand noch
     nicht, wenn der Begrüssungssatz gebaut wird. */
  const mitNamenRoh = (t: string, n: string) => t.replace("{name}", (n || "").trim());

  /**
   * DER RÜCKWEG AUS DER MAIL (Owner 29.08.2026: „dann kann er weitermachen mit Link in der
   * E-Mail. Bitte nicht auf einer allgemeinen Seite schicken").
   *
   * DAS TICKET MUSS VOR ALLEM ANDEREN GREIFEN: Der Schritt darunter legt sofort eine NEUE
   * Sitzung an. Liefe er zuerst, bekäme der Rückkehrer eine leere zweite Sitzung — und seine
   * alte samt Lebenslauf und Gespräch wäre wieder nicht erreichbar. Deshalb der Riegel:
   * Solange ein Ticket in der Adresszeile steht, entsteht keine neue Kennung.
   */
  const [ticketLaeuft, setTicketLaeuft] = useState(() => {
    try { return !!new URLSearchParams(window.location.search).get("w"); } catch { return false; }
  });

  useEffect(() => {
    if (!ticketLaeuft) return;
    void (async () => {
      let ticket = "";
      try { ticket = new URLSearchParams(window.location.search).get("w") ?? ""; } catch { /**/ }
      try {
        const d = await fetch("/api/david-fortsetzen", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticket }),
        }).then(r => r.json());
        if (d?.ok && d.id) {
          /* IST DER BERICHT FERTIG, GEHÖRT ER NICHT IN DEN TRICHTER: Der Keks sitzt jetzt,
             die Ergebnis-Seite lässt ihn also direkt hinein. */
          if (d.ziel === "bericht") { window.location.replace(`/david/${encodeURIComponent(String(d.id))}`); return; }
          setGenId(String(d.id));
          setVorname(String(d.vorname ?? "")); setMail(String(d.email ?? ""));
          setCvPath(String(d.cvPath ?? "")); setCvName(String(d.cvName ?? ""));
          if (Array.isArray(d.schwerpunkte)) setSchwerpunkte(d.schwerpunkte.map(String));
          if (["gut", "mittel", "schwach"].includes(String(d.layout))) setLayout(d.layout);
          if (typeof d.cvFoto === "boolean") setCvFoto(d.cvFoto);
          if (d.frage) setFrage(String(d.frage));
          /* Ein Wort zur Begrüssung, damit er sieht, dass er richtig ist — und nicht rätselt,
             warum plötzlich ein halb ausgefülltes Gespräch vor ihm steht. */
          setVerlauf([{ von: "david", text: mitNamenRoh(S.zurueck, String(d.vorname ?? "")) }]);
          setPhase(d.ziel === "gespraech" && !d.frage ? "uebergang" : (d.ziel as Phase));
        }
      } catch { /* dann fängt er eben neu an — schlimmer als ein Neuanfang ist nichts */ }
      /* Das Ticket verschwindet aus der Adresszeile: Es soll nicht im Verlauf stehen und
         nicht mitkopiert werden, wenn er die Seite jemandem schickt. */
      try { window.history.replaceState(null, "", window.location.pathname); } catch { /**/ }
      setTicketLaeuft(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketLaeuft]);

  /* Die Kennung entsteht sofort — sie ist zugleich die Kennung der David-Sitzung UND die
     des Bewerbungs-Auftrags beim Resume-Generator. Genau deshalb muss der Nutzer später
     Lebenslauf und Anzeige nicht noch einmal eingeben (Owner §24). */
  useEffect(() => {
    if (genId || ticketLaeuft) return;
    void (async () => {
      try {
        const log = await fetch("/api/kiss-log", {
          method: "POST", headers: kopfzeilen(),
          body: JSON.stringify({ theme: "david", device: geraet() }),
        }).then(r => r.json());
        if (log?.id) setGenId(String(log.id));
      } catch { /* ohne Kennung geht es erst beim Weiter-Tippen wieder */ }
    })();
    void logFunnelEvent("start_clicked", { theme: "david" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketLaeuft]);

  /**
   * DIE ADMIN-VORSCHAU (Owner 28.08.2026: „wie sieht das end ergebniss aus, wo beispiele zu
   * sehen sind von video und CV und anschreiben? und kauf buttons?").
   *
   * Die späten Schirme — Angebote, Feedback, Interessen, Opt-in — kommen erst nach einem
   * vollständigen Screening. Um sie anzusehen, müsste man jedes Mal den ganzen Weg gehen,
   * und jedes Mal kostet er Geld. `?schirm=angebote` springt direkt hin.
   *
   * NUR FÜR DEN ADMIN: Der Sprung greift ausschliesslich, wenn im Browser die
   * Vorschau-Kennung `lb_preview_model=1` gesetzt ist (dieselbe, die das Haus schon für die
   * Modell-Vorschau benutzt). Ein Besucher kann damit nichts überspringen — und er soll es
   * auch nicht: Ohne Gespräch gibt es keine Daten, der Kaufknopf hätte nichts zu kaufen.
   */
  useEffect(() => {
    try {
      /* Zwei Wege hinein: die Modell-Vorschau ODER die Admin-PIN, die im Browser des
         Betreibers ohnehin liegt. So braucht er für einen Blick auf die späten Schirme
         keinen Umweg über „Viewing as model". */
      const darf = localStorage.getItem("lb_preview_model") === "1"
        || !!localStorage.getItem("luxurybandit-try-look-admin-pin");
      if (!darf) return;
      const wunsch = new URLSearchParams(window.location.search).get("schirm") ?? "";
      const erlaubt: Phase[] = ["bericht", "feedback", "interessen", "kritik", "updates", "danke"];
      if (erlaubt.includes(wunsch as Phase)) {
        setVorname(v => v || "Geza");
        setPhase(wunsch as Phase);
      }
    } catch { /* ohne Speicher keine Vorschau */ }
  }, []);

  /* Der Entwurf überlebt das Neuladen nach der Kasse (Tür-1-Muster wie im Resume-Tool). */
  useEffect(() => {
    if (!genId) return;
    try { sessionStorage.setItem(ABLAGE, JSON.stringify({ genId, vorname, mail, cvPath, cvName, phase })); } catch { /**/ }
  }, [genId, vorname, mail, cvPath, cvName, phase]);

  useEffect(() => { endeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [phase, frage, verlauf.length]);

  /** Ein Ladezustand mit wechselnden Zeilen — nie ein Rad ohne Wort (CI-Regel). */
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!busy) { setTick(0); return; }
    const u = setInterval(() => setTick(t => t + 1), 2600);
    return () => clearInterval(u);
  }, [busy]);

  const speichern = async (felder: Record<string, unknown>) => {
    if (!genId) return null;
    try {
      const d = await fetch("/api/david", {
        method: "POST", headers: kopfzeilen(),
        body: JSON.stringify({ id: genId, device: geraet(), sprache: lang, ...felder }),
      }).then(r => r.json());
      /**
       * NUR TECHNISCHES VERSTECKEN, NICHT ALLES (Fehler von mir, gemeldet 29.08.2026 mit Bild:
       * Der Owner stand am E-Mail-Schritt vor „Da ist bei uns etwas schiefgegangen" und konnte
       * nicht erkennen, was los war).
       *
       * Ich hatte hier JEDE Absage durch den Sammelsatz ersetzt — auch die, die dem Besucher
       * wirklich weiterhelfen („Bitte zuerst Name, E-Mail und die Bestätigung"). Damit war
       * die Meldung zwar nie mehr technisch, aber auch nie mehr nützlich.
       *
       * Die Regel ist dieselbe wie in `alsFehler`: Trägt die Absage einen `code`, ist sie ein
       * innerer Zustand und wird ersetzt. Ohne `code` ist sie ein Satz FÜR den Besucher — und
       * der gehört unverändert auf den Schirm.
       */
      if (d?.error) { setFehler(d?.code ? S.technischerFehler : String(d.error)); return null; }
      return d;
    } catch { setFehler(S.technischerFehler); return null; }
  };

  /**
   * DIE KENNUNG LEBT IN EINEM MERKER, NICHT NUR IM ZUSTAND.
   *
   * Beim Wiederaufbau (siehe unten) entsteht mitten in einem laufenden Aufruf eine NEUE
   * Kennung. `setGenId` wirkt erst beim nächsten Zeichnen — der Wiederholungsversuch würde
   * also noch die alte, tote Kennung schicken und wieder scheitern. Der Merker ist sofort
   * aktuell.
   */
  const genIdRef = useRef("");
  useEffect(() => { genIdRef.current = genId; }, [genId]);

  /**
   * DIE SITZUNG WIEDER AUFBAUEN — AUS DEM, WAS DER BROWSER NOCH WEISS.
   *
   * Owner 29.08.2026, mit Bild: Der Bewerber wollte ohne Stellenanzeige weitermachen und
   * bekam „Diese Sitzung kenne ich nicht." in Rot — ein technischer Satz, und danach war
   * Schluss. Kein Weg vor, kein Weg zurück; der Trichter endete an einer roten Zeile.
   *
   * WARUM DAS ÜBERHAUPT PASSIEREN KANN: Die Kennung entsteht beim ersten Laden über einen
   * Netzaufruf. Fällt der aus (Funkloch, Serverneustart, geschlossener Tab, der Tage später
   * wieder geöffnet wird), steht der Bewerber mit leerer Kennung da — und JEDER weitere
   * Schritt scheitert, bis er die Seite neu lädt und von vorn anfängt.
   *
   * WAS WIR NOCH HABEN: Name, Adresse und den Pfad des hochgeladenen Lebenslaufs — alles im
   * Browser. Damit lässt sich die Sitzung vollständig neu aufbauen, ohne dass der Bewerber
   * etwas noch einmal eingibt oder auch nur merkt, dass etwas war.
   *
   * DASS DIE AUSWERTUNG DABEI NOCH EINMAL LÄUFT, ist der Preis (ein Modell-Aufruf, rund ein
   * Cent). Er fällt nur an, wenn wirklich etwas kaputt war — und ein Cent ist billiger als
   * ein Bewerber, der an einer roten Zeile aufgibt.
   */
  const bauUmWieder = async (): Promise<string> => {
    /* 1 — Eine neue Kennung. */
    const log = await fetch("/api/kiss-log", {
      method: "POST", headers: kopfzeilen(),
      body: JSON.stringify({ theme: "david", device: geraet() }),
    }).then(r => r.json()).catch(() => null);
    const neueId = String(log?.id ?? "");
    if (!neueId) return "";
    genIdRef.current = neueId; setGenId(neueId);

    /* 2 — Der Lead. Ohne ihn weist der Server jeden Schritt ab. */
    await fetch("/api/david", {
      method: "POST", headers: kopfzeilen(),
      body: JSON.stringify({
        id: neueId, device: geraet(), sprache: lang,
        vorname: name, email: mail.trim(), datenschutz: true,
      }),
    }).catch(() => null);

    /* 3 — Der Lebenslauf, falls schon einer hochgeladen ist. Die Datei liegt weiterhin im
       Speicher; nur die Auswertung fehlt der neuen Sitzung. */
    if (cvPath) {
      await fetch("/api/david-screening", {
        method: "POST", headers: kopfzeilen(),
        body: JSON.stringify({ id: neueId, device: geraet(), schritt: "cv", cvPath, cvName }),
      }).catch(() => null);
    }
    return neueId;
  };

  /**
   * JEDER SCHRITT VERSUCHT SICH EINMAL SELBST ZU RETTEN.
   *
   * Meldet der Server einen Zustand, aus dem der Browser sich befreien kann (`sitzung-weg`,
   * `lead-fehlt`, `cv-fehlt`), wird die Sitzung neu aufgebaut und derselbe Schritt genau
   * EINMAL wiederholt. Klappt auch das nicht, geht die Absage nach oben — dann ist wirklich
   * etwas kaputt, und eine ehrliche Meldung ist besser als eine Endlosschleife.
   */
  const HEILBAR = ["sitzung-weg", "lead-fehlt", "cv-fehlt"];

  const screening = async (koerper: Record<string, unknown>, schonVersucht = false): Promise<Record<string, any>> => {
    const d = await fetch("/api/david-screening", {
      method: "POST", headers: kopfzeilen(),
      body: JSON.stringify({ id: genIdRef.current || genId, device: geraet(), ...koerper }),
    }).then(r => r.json()).catch(() => ({ error: "netz" }));

    if (!schonVersucht && HEILBAR.includes(String((d as Record<string, unknown>)?.code ?? ""))) {
      const neueId = await bauUmWieder();
      if (neueId) return screening(koerper, true);
    }
    return d as Record<string, any>;
  };

  /**
   * WAS DER BEWERBER ZU LESEN BEKOMMT — NIE DER ROHE SATZ DES SERVERS.
   *
   * Die Sätze des Servers sind für uns geschrieben und ausschliesslich deutsch; der Trichter
   * läuft in sieben Sprachen. Alles, was nach einem inneren Zustand klingt, wird durch EINEN
   * menschlichen Satz aus den Trichter-Texten ersetzt — der ist übersetzt und sagt, was zu
   * tun ist.
   */
  const alsFehler = (d: Record<string, any>): string => {
    const code = String(d?.code ?? "");
    if (code || d?.error === "netz") return S.technischerFehler;
    return String(d?.error ?? S.technischerFehler);
  };

  /* ── Schritt 1: der Vorname ───────────────────────────────────────────────── */
  const weiterName = () => {
    if (!name) { setFehler(S.vornameFehlt); return; }
    setFehler(""); setPhase("mail");
  };

  /* ── Schritt 2: E-Mail + Datenschutz → LEAD ───────────────────────────────── */
  const leadSpeichern = async () => {
    if (!mailOk) { setFehler(S.mailFehlt); return; }
    if (!haken) { setFehler(S.hakenFehlt); return; }
    setFehler(""); setBusy(true);
    const utm: Record<string, string> = {};
    try {
      const q = new URLSearchParams(window.location.search);
      ["utm_source", "utm_medium", "utm_campaign", "utm_content"].forEach(k => { const v = q.get(k); if (v) utm[k] = v; });
      /**
       * `src` ZÄHLT AUCH ALS QUELLE (gefunden 29.08.2026, kurz vor dem Anzeigenstart).
       *
       * Das Anzeigen-Playbook (ANZEIGEN.md) schreibt seit jeher `&src=fb` an jede Ziel-
       * adresse, und der allgemeine Zähler (`lib/track-funnel`) nimmt das auch entgegen.
       * NUR HIER stand die Liste ohne `src` — die Herkunft jedes Besuchers, der über eine
       * laufende Anzeige kam, wäre in der Sitzung leer geblieben. In der Admin-Auskunft hätte
       * bei „Quelle" nichts gestanden, und die Frage „bringt die Anzeige etwas?" wäre nicht
       * zu beantworten gewesen.
       */
      if (!utm.utm_source) {
        const alt = q.get("src") || q.get("source") || q.get("ref") || "";
        if (alt) utm.utm_source = alt;
      }
    } catch { /**/ }
    const d = await speichern({ vorname: name, email: mail.trim(), datenschutz: true, ...(Object.keys(utm).length ? { utm } : {}) });
    setBusy(false);
    if (!d) return;
    void logTunnelEvent("lead_created", "david");
    setPhase("cv");
  };

  /* ── Schritt 3: der Lebenslauf ────────────────────────────────────────────── */
  const cvWaehlen = async (f: File) => {
    setFehler(""); setBusy(true); setBusyText(S.cvLaeuft);
    try {
      /**
       * WAS SCHIEFGING, MUSS AUCH DASTEHEN (Owner 29.08.2026: „wieso?" — zu „Der Lebenslauf
       * liess sich nicht lesen. Versuch es bitte mit einer PDF-Datei.").
       *
       * Der ganze Vorgang lag in EINEM try/catch mit EINER Meldung. Die riet dann: „nimm eine
       * PDF" — auch dann, wenn eine PDF hochgeladen wurde und in Wahrheit die Verbindung
       * abgerissen war. Ein Ratschlag, der am Problem vorbeigeht, kostet den Kunden zwei
       * weitere Versuche und danach das Vertrauen.
       *
       * Jetzt sagt jeder Schritt, woran er gescheitert ist — und die Datei wird vorher
       * geprüft, statt sie erst hochzuladen und dann festzustellen, dass wir sie nicht lesen
       * können.
       */
      const ext = (f.name.split(".").pop() || "").toLowerCase();
      if (!["pdf", "doc", "docx"].includes(ext)) {
        setFehler(S.cvFormat.replace("{typ}", ext ? ext.toUpperCase() : "?"));
        setBusy(false); setBusyText(""); return;
      }
      /* Supabase nimmt grosse Dateien an, unsere Auswertung liest sie aber nicht mehr
         sinnvoll — und 20 MB über ein Mobilnetz sind ohnehin ein Abbruch mit Ansage. */
      if (f.size > 15 * 1024 * 1024) {
        setFehler(S.cvZuGross); setBusy(false); setBusyText(""); return;
      }
      const signiert = await fetch("/api/lebenslauf-video-url", {
        method: "POST", headers: kopfzeilen(),
        body: JSON.stringify({ extension: ext }),
      }).then(r => r.json()).catch(() => null);
      if (!signiert?.uploadUrl || !signiert?.path) {
        setFehler(S.cvNetzFehler); setBusy(false); setBusyText(""); return;
      }
      const put = await fetch(signiert.uploadUrl, {
        method: "PUT", headers: { "Content-Type": f.type || "application/octet-stream", "x-upsert": "true" }, body: f,
      }).catch(() => null);
      if (!put?.ok) {
        /* Der Speicher sagt selbst, was er nicht mochte — das ist mehr wert als unsere
           Vermutung. */
        const grund = put ? await put.text().catch(() => "") : "";
        console.warn("[david] Upload gescheitert:", put?.status, grund.slice(0, 200));
        setFehler(S.cvNetzFehler); setBusy(false); setBusyText(""); return;
      }
      setCvPath(signiert.path); setCvName(f.name);
      void logFunnelEvent("cv_uploaded", { theme: "david" });

      /**
       * HIER IST SCHLUSS — UND ZWAR ABSICHTLICH (Owner 29.08.2026: „erst dann muss man zahlen,
       * wenn er sich entscheidet … und nicht beim Hochladen").
       *
       * Das Hochladen kostet uns nichts (der Speicher ist unser eigener), das LESEN kostet
       * einen Modell-Aufruf. Solange beides an derselben Handlung hing, zahlten wir für jeden,
       * der die Datei anhängte und dann wegging. Jetzt liegt sie nur da; ausgewertet wird sie
       * in `cvAnalysieren`, wenn er es sagt.
       */
      setBusy(false); setBusyText("");
    } catch {
      setFehler(S.cvFehler); setBusy(false); setBusyText("");
    }
  };

  /**
   * DAS JA — ab hier kostet es uns etwas.
   *
   * Der Deckel (`DAVID_PRO_TAG`) und die Zählung sitzen serverseitig im Schritt `cv` und
   * greifen weiterhin an genau dieser Stelle: Gezählt wird, was gelesen wurde, nicht, was
   * hochgeladen wurde.
   */
  /**
   * DEN LEBENSLAUF WIEDER WEGNEHMEN (Owner 29.08.2026) — zwei Tipps, kein Systemdialog
   * (Hausregel [[loeschen-zwei-tipps-rot]]): Der erste Tipp färbt rot und fragt, der zweite
   * löscht. Nach drei Sekunden ohne zweiten Tipp ist die Frage wieder weg, damit ein
   * scharfes Löschsymbol nicht stehen bleibt.
   */
  const [loeschFrage, setLoeschFrage] = useState(false);
  useEffect(() => {
    if (!loeschFrage) return;
    const u = setTimeout(() => setLoeschFrage(false), 3000);
    return () => clearTimeout(u);
  }, [loeschFrage]);

  const cvLoeschen = async () => {
    if (!loeschFrage) { setLoeschFrage(true); return; }
    setLoeschFrage(false); setFehler("");
    /* ZUERST DER SCHIRM, DANN DER SERVER: Das Feld ist sofort wieder leer — er soll nicht
       auf ein Netz warten, um zu sehen, dass seine Datei weg ist. Misslingt das Löschen im
       Speicher, ist die Datei ohnehin aus seiner Sitzung heraus; der nächste Upload
       überschreibt den Verweis. */
    setCvPath(""); setCvName("");
    try { await screening({ schritt: "cvweg" }); } catch { /* still */ }
  };

  const cvAnalysieren = async () => {
    if (!cvPath) { setPhase("cv"); return; }
    setFehler(""); setBusy(true); setBusyText(S.cvLaeuft);
    try {
      const d = await screening({ schritt: "cv", cvPath, cvName });
      if (d?.error) { setFehler(alsFehler(d)); setBusy(false); setBusyText(""); return; }
      const beobachtet: string[] = Array.isArray(d.beobachtungen) ? d.beobachtungen : [];
      if (Array.isArray(d.schwerpunkte)) setSchwerpunkte(d.schwerpunkte.map(String));
      if (["gut", "mittel", "schwach"].includes(String(d.layout))) setLayout(d.layout);
      if (typeof d.foto === "boolean") setCvFoto(d.foto);
      /* EIN SATZ STATT DER GANZEN AUSWERTUNG (Owner 29.08.2026) — die Beobachtungen sind das
         Produkt und stehen im Bericht; hier reicht der Beweis, dass gelesen wurde. `beobachtet`
         wird weiterhin serverseitig gespeichert, nur nicht mehr hier ausgeschüttet. */
      /* GÜRTEL UND HOSENTRÄGER: Auch mit geschärftem Auftrag kann das Modell einmal eine
         ganze Zeile liefern. Was nach Werdegang aussieht — Jahreszahl, Gedankenstrich,
         Adresse oder mehr als sechs Wörter —, wird verworfen; dann sagt David den Satz ohne
         Rolle statt einen unsinnigen. */
      const rohRolle = String(d.rolle ?? "").trim();
      const rolle = (/\d{4}|–|—|https?:|www\.|\.com/.test(rohRolle) || rohRolle.split(/\s+/).length > 6)
        ? "" : rohRolle;
      setVerlauf(v => [...v, { von: "david", text: rolle
        ? mitNamen(S.cvErkannt).replace("{rolle}", rolle)
        : mitNamen(S.cvErkanntOhneRolle) }]);
      setBusy(false); setBusyText(""); setPhase("job");
    } catch {
      setFehler(S.cvFehler); setBusy(false); setBusyText("");
    }
  };

  /**
   * OHNE STELLE WEITER (Owner 29.08.2026, Weg „A"): Der Bericht entsteht auch ohne Ziel — nur
   * das BEZAHLTE Produkt bleibt der Zuschnitt, und dafür wird die Anzeige später im Angebot
   * nachgefragt. Der Gratis-Bericht ist der Köder, das Zugeschnittene die Ware.
   */
  const [ohneStelleFrage, setOhneStelleFrage] = useState(false);
  /* OB ER OHNE STELLE WEITERGEGANGEN IST — davon hängen vier Texte ab (Ladezeilen und der
     Übergang). Ohne diesen Merker erzählt David von einer Anzeige, die der Bewerber gerade
     ausdrücklich abgelehnt hat. */
  const [ohneStelle, setOhneStelle] = useState(false);
  /* ZWEIMAL ÜBERSPRUNGEN — die ehrliche Rückfrage steht an, statt still abzubrechen
     (Owner 29.08.2026). Kein eigener Schirm: Sie erscheint im Gespräch, an Ort und Stelle. */
  const [abbruchFrage, setAbbruchFrage] = useState(false);
  /* Die drei Punkte, über die David gleich sprechen will — aus SEINEM Lebenslauf und SEINER
     Anzeige, nicht aus Textbausteinen (Owner 29.08.2026). */
  const [plan, setPlan] = useState<{ punkt: string; warum: string }[]>([]);

  const ohneStelleWeiter = async () => {
    /* DIE RÜCKFRAGE BLEIBT STEHEN, BIS ES GEKLAPPT HAT (Owner 29.08.2026, mit Bild).
       Vorher schloss sie sich SOFORT — ging der Aufruf dann schief, stand der Bewerber
       wieder vor dem leeren Anzeigenfeld, daneben eine rote Zeile, und der Knopf, den er
       gerade gedrückt hatte, war verschwunden. Er wollte weiter ohne Stelle und landete
       ohne jeden Weg. Jetzt schliesst sie erst nach dem Erfolg — scheitert es, steht sein
       Knopf noch da und er kann es einfach noch einmal versuchen. */
    setFehler(""); setBusy(true); setBusyText(S.jobLaeuftOhne);
    const d = await screening({ schritt: "job", ohneStelle: true });
    setBusy(false); setBusyText("");
    if (d?.error) { setFehler(alsFehler(d)); return; }
    setOhneStelleFrage(false); setOhneStelle(true);
    if (Array.isArray(d.plan)) setPlan(d.plan.map((x: any) => ({ punkt: String(x?.punkt ?? ""), warum: String(x?.warum ?? "") })).filter((x: any) => x.punkt));
    void logFunnelEvent("job_skipped", { theme: "david" });
    setFrage(String(d.ersteFrage ?? ""));
    setPhase("uebergang");
  };

  /* ── Schritt 4: die Stellenanzeige ────────────────────────────────────────── */
  const jobSenden = async () => {
    if (anzeige.trim().length < 60) { setFehler(S.jobKurz); return; }
    setFehler(""); setBusy(true); setBusyText(S.jobLaeuft);
    const d = await screening({ schritt: "job", jobText: anzeige.trim() });
    setBusy(false); setBusyText("");
    if (d?.error) { setFehler(alsFehler(d)); return; }
    setOhneStelle(false);
    if (Array.isArray(d.plan)) setPlan(d.plan.map((x: any) => ({ punkt: String(x?.punkt ?? ""), warum: String(x?.warum ?? "") })).filter((x: any) => x.punkt));
    void logFunnelEvent("job_added", { theme: "david" });
    setJobTitel(String(d.jobTitel ?? "")); setJobOrt(String(d.jobOrt ?? "")); setJobArt(String(d.jobArt ?? ""));
    setFrage(String(d.ersteFrage ?? ""));
    setPhase("uebergang");
  };

  /* ── Schritt 5: das Gespräch ──────────────────────────────────────────────── */
  /**
   * ANTWORTEN — ODER WEITERGEHEN (Owner 29.08.2026, mit Bild: „hier machst du es ihm schwer.
   * Er kann ohne Antwort weder vor noch zurück.").
   *
   * Sechs Fragen, und bei jeder war Schluss ohne Text. Manche Frage passt nicht auf ihn,
   * manche will er nicht beantworten — und wer feststeckt, schliesst den Tab. Dann ist das
   * ganze Screening weg, samt der Antworten, die er schon gegeben hat.
   *
   * EIN WEG, ZWEI AUSGÄNGE: Dieselbe Funktion schickt entweder seine Antwort oder das
   * Überspringen. Der Verlauf zeigt beides ehrlich an, damit er später nachvollziehen kann,
   * worüber gesprochen wurde und worüber nicht.
   */
  /**
   * „ICH VERSTEHE DIE FRAGE NICHT" (Owner 29.08.2026) — David stellt dieselbe Frage einfacher,
   * mit einem Beispiel. Keine neue Frage, kein neues Thema, keine verbrauchte Runde: Der
   * Zähler bleibt stehen, und der alte Wortlaut wird ERSETZT statt angehängt (zwei Einträge
   * sähen aus, als hätte David zweimal gefragt).
   *
   * ZWEIMAL REICHT: Wer die Frage auch nach der zweiten Erklärung nicht versteht, braucht
   * keine dritte — dann bleibt das Überspringen. Sonst liesse sich der Knopf endlos drücken,
   * und jeder Druck kostet uns einen Aufruf.
   */
  const [erklaert, setErklaert] = useState(0);
  /**
   * DER EINE FREIE ANLAUF (Owner 29.08.2026: „oder wir sagen, er hat noch einen Anlauf frei").
   *
   * Er erscheint zwischen Gespräch und Bericht — und NUR, wenn Antworten wirklich dünn
   * geblieben sind. Er kostet uns nichts: Es läuft kein zusätzlicher Modell-Aufruf, die
   * verbesserten Antworten ersetzen nur die alten, und der Bericht wäre ohnehin einmal
   * gelaufen. Aus einem dünnen Bericht wird damit einer, der verkauft.
   */
  const [anlaufPunkte, setAnlaufPunkte] = useState<{ nr: number; frage: string; antwort: string }[]>([]);
  /**
   * DEN FREIEN ANLAUF EINLÖSEN — und dann direkt zum Bericht.
   *
   * Kein zusätzlicher Modell-Aufruf: Die verbesserten Antworten ersetzen serverseitig nur die
   * alten. Was Geld kostet, ist erst der Bericht danach — und der wäre ohnehin gelaufen.
   *
   * SCHEITERT DAS SPEICHERN, GEHT ES TROTZDEM WEITER: Sein Ergebnis darf nicht daran hängen,
   * dass eine Verbesserung nicht ankam — dann bekommt er eben den Bericht auf dem alten
   * Stand, statt vor einer roten Zeile zu stehen.
   */
  const anlaufSenden = async () => {
    const gefuellt = anlaufPunkte.filter(p2 => p2.antwort.trim().length >= 2)
      .map(p2 => ({ nr: p2.nr, text: p2.antwort.trim() }));
    if (!gefuellt.length) { setPhase("analyse"); void berichtHolen(); return; }
    setFehler(""); setBusy(true); setBusyText("");
    await screening({ schritt: "nachbessern", antworten: gefuellt });
    setBusy(false); setBusyText("");
    void logFunnelEvent("anlauf_genutzt", { theme: "david" });
    setPhase("analyse");
    void berichtHolen();
  };

  const frageErklaeren = async () => {
    setFehler(""); setBusy(true); setBusyText(S.frageWirdErklaert);
    const d = await screening({ schritt: "antwort", unklar: true });
    setBusy(false); setBusyText("");
    if (d?.error) { setFehler(alsFehler(d)); return; }
    if (d.neueFrage) { setFrage(String(d.neueFrage)); setErklaert(n => n + 1); }
  };

  const antwortSenden = async (ueberspringen = false) => {
    const a = antwort.trim();
    if (!ueberspringen && a.length < 2) { setFehler(S.antwortFehlt); return; }
    setFehler(""); setBusy(true); setBusyText("");
    setVerlauf(v => [...v, { von: "david", text: frage }, { von: "ich", text: ueberspringen ? S.frageUebersprungen : a }]);
    setAntwort("");
    const d = await screening(ueberspringen
      ? { schritt: "antwort", uebersprungen: true }
      : { schritt: "antwort", antwort: a });
    setBusy(false);
    if (d?.error) { setFehler(alsFehler(d)); return; }
    /* ZWEIMAL ÜBERSPRUNGEN: Der Server hat KEIN Modell gefragt, sondern gemeldet, dass wir
       ihn jetzt fragen sollen. Die Frage bleibt stehen — sagt er „Nein", kann er sie sofort
       beantworten. */
    if (d.abbruch) { setFrage(String(d.frage ?? frage)); setAbbruchFrage(true); return; }
    if (d.reaktion) setVerlauf(v => [...v, { von: "david", text: String(d.reaktion) }]);
    if (d.fertig) {
      setFrage("");
      void logFunnelEvent("screening_completed", { theme: "david" });
      /* Erst der freie Anlauf, falls es dünn blieb — danach der Bericht. */
      if (Array.isArray(d.nachbesserung) && d.nachbesserung.length) {
        setAnlaufPunkte(d.nachbesserung.map((x: any) => ({
          nr: Number(x?.nr), frage: String(x?.frage ?? ""), antwort: String(x?.antwort ?? ""),
        })));
        setPhase("anlauf");
        return;
      }
      setPhase("analyse");
      void berichtHolen();
      return;
    }
    setFrage(String(d.naechsteFrage ?? ""));
    setErklaert(0);
    setNummer(Number(d.nummer) || nummer + 1);
  };

  const berichtHolen = async () => {
    setBusy(true); setBusyText(S.analyse1);
    const d = await screening({ schritt: "report" });
    setBusy(false); setBusyText("");
    if (d?.error || !d?.report) { setFehler(String(d?.error || S.reportFehler)); return; }
    setReport(d.report as DavidReport);
    void speichern({ reportGesehen: true });
    void logFunnelEvent("report_viewed", { theme: "david" });
    setPhase("bericht");
  };


  /* ── Feedback, Interessen, Updates ────────────────────────────────────────── */
  const nuetzlichWaehlen = async (wert: string) => {
    setNuetzlich(wert);
    await speichern({ nuetzlichkeit: wert });
    setPhase(wert === "sehr" || wert === "nuetzlich" ? "interessen" : "kritik");
  };
  const interesseUmschalten = (w: string) =>
    setInteressen(a => (a.includes(w) ? a.filter(x => x !== w) : [...a, w]));

  const interessenSenden = async () => { await speichern({ interessen }); setPhase("updates"); };
  const kritikSenden = async () => { await speichern({ feedback: kritik.trim() }); setPhase("updates"); };
  const updatesSenden = async () => {
    if (updates) await speichern({ marketingOptIn: true });
    setPhase("danke");
  };

  /* ────────────────────────────── Anzeige ─────────────────────────────────── */
  /**
   * DIE ÜBERSCHRIFT FOLGT DEM SCHRITT (Owner 29.08.2026: „Es muss nicht auf jeder Seite das
   * gleiche stehen").
   *
   * Über dem Trichter stand auf JEDEM Schritt derselbe Werbesatz — „Finde heraus, was dein
   * Lebenslauf nicht erzählt". Auf dem ersten Schirm ist er richtig: Der Besucher kommt von
   * der Anzeige und soll dort wiederfinden, worauf er geklickt hat. Danach ist er tote
   * Fläche: Wer schon im Trichter steht, braucht keine Werbung mehr, sondern die AUFGABE.
   *
   * Deshalb: Schritt 1 und 2 behalten den Werbesatz (er ist noch am Entscheiden), ab dem
   * Lebenslauf trägt die Überschrift, was zu tun ist. Und wo sie das tut, steht es NICHT
   * noch einmal in der Karte darunter — sonst liest man denselben Satz zweimal
   * untereinander.
   */
  const schrittTitel: Partial<Record<typeof phase, string>> = {
    mail: S.mailTitel,
    /* EIN SCHIRM, ZWEI ZUSTÄNDE (Owner 29.08.2026: „wieso fragt er wieder nach der Datei?").
       Vorher lag dahinter ein zweiter Schirm, der die eben hochgeladene Datei noch einmal
       zeigte — dieselbe Sache zweimal. Jetzt wechselt nur die Überschrift, sobald die Datei
       liegt: aus der Aufforderung wird die Frage. */
    cv: cvPath ? S.cvBereitTitel : mitNamen(S.cvTitel),
    job: S.jobTitel,
  };
  /**
   * IM GESPRÄCH GIBT ES KEINE ÜBERSCHRIFT (Owner 29.08.2026, mit Bild: „Oben ist das
   * Wichtigste, also der Titel — und genau da steht etwas, was in diesem Moment nicht zählt.
   * Hier ist die FRAGE das Wichtigste, und die ist klein geschrieben.").
   *
   * Er hat recht, und es war eine handfeste Verwechslung von Rangfolge: Über der Frage stand
   * in 26 px der Werbesatz der Landingpage („Finde heraus, was dein Lebenslauf nicht
   * erzählt"), während die Frage, die der Bewerber JETZT beantworten soll, in 15,5 px
   * darunter stand. Der Werbesatz hat seine Arbeit längst getan — er hat ihn hergebracht.
   *
   * Deshalb: In diesem Schritt trägt die FRAGE die grösste Schrift auf dem Schirm, und über
   * ihr steht nichts, was mit ihr konkurriert.
   */
  const ueberschrift = phase === "gespraech" ? "" : (schrittTitel[phase] ?? werbeTitel ?? "");

  const davidSagt = (text: string, klein = false) => (
    <p className={`${klein ? "text-[14px]" : "text-[15.5px]"} font-semibold leading-relaxed text-white/90`}>{text}</p>
  );

  const ladeZeilen = [S.cvLaden1, S.cvLaden2, S.cvLaden3];
  const analyseZeilen = [S.analyse1, S.analyse2, S.analyse3, S.analyse4];

  return (
    <div className="mt-4 flex flex-col gap-4">
      {/* Die Überschrift des Schritts — sonst trägt die Seite ihre eigene (siehe oben). */}
      {ueberschrift && (
        <h1 className="-mt-1 text-[26px] font-black leading-tight">{ueberschrift}</h1>
      )}
      {/* ── DER VERLAUF — was David gesagt und was der Bewerber geantwortet hat. Er steht
             über allem, damit das Gespräch als Gespräch lesbar bleibt. ── */}
      {verlauf.length > 0 && phase !== "danke" && (
        <div className="flex flex-col gap-2">
          {verlauf.slice(-6).map((z, i) => (
            <div key={i} className={z.von === "david"
              ? "rounded-2xl border border-white/15 bg-white/[0.05] px-4 py-3"
              : "rounded-2xl border border-[#f6cf51]/30 lb-goldhauch px-4 py-3"}>
              {/* SEIN GESICHT AN JEDER SEINER ZEILEN (Owner 29.08.2026: „hier muss sein Bild
                  hin"). Im Verlauf ist es etwas anderes als in den Karten: Dort stellt er
                  sich einmal vor, hier wechseln sich zwei Sprecher ab — und wer spricht, muss
                  man im Vorbeiscrollen sehen, nicht lesen. Klein (22 px), damit die Zeile
                  eine Zeile bleibt. */}
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#f6cf51]">
                {z.von === "david" && (
                  <span className="h-[22px] w-[22px] shrink-0 overflow-hidden rounded-full ring-1 ring-[#f6cf51]/45">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/Lebenslauf/david-portrait.jpg" alt="" className="h-full w-full object-cover object-top" />
                  </span>
                )}
                {z.von === "david" ? "David" : name || "Du"}
              </p>
              <p className="mt-1 text-[14px] font-semibold leading-relaxed text-white/85">{z.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── 1 · VORNAME ── */}
      {phase === "name" && (
        <Kasten polster="p-5">
          {/**
            * DAVIDS GESICHT AM ANFANG (Owner 29.08.2026: „hier Bild von David einfügen").
            *
            * Er stellt sich hier vor — „Hallo, ich bin David" — und war bis eben nur Text.
            * Wer gerade auf einer Anzeige sein Gesicht gesehen hat und im Video seine Stimme
            * hört, trifft im ersten Schritt des Trichters auf einen Namen ohne Menschen. Das
            * Porträt schliesst die Lücke: dieselbe Person wie im Video, dasselbe Bild wie
            * später im Bericht (`DavidReportAnsicht`).
            *
            * NUR HIER, NICHT BEI JEDEM SATZ: Ein Avatar neben jeder Zeile machte aus dem
            * Trichter einen Chat mit Sprechblasen — und der Owner hat Chat-Anmutung im
            * Bewerbungs-Teil schon einmal ausdrücklich abgeräumt. Einmal vorstellen genügt.
            */}
          <div className="flex items-center gap-3.5">
            <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-[#f6cf51]/45">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/Lebenslauf/david-portrait.jpg" alt="David" className="h-full w-full object-cover object-top" />
            </span>
            <span className="min-w-0 flex-1">{davidSagt(S.hallo)}</span>
          </div>
          <p className="mt-2 text-[15px] font-medium leading-relaxed text-white/80">{S.halloText}</p>
          <label className="mt-4 block text-[12px] font-black uppercase tracking-wide text-[#f6cf51]">{S.vornameLabel}</label>
          <Eingabe className="mt-1.5" value={vorname} onChange={e => setVorname(e.target.value)}
            placeholder={S.vornamePlatzhalter} autoComplete="given-name"
            onKeyDown={e => { if (e.key === "Enter") weiterName(); }} />
          <Fehlerzeile>{fehler}</Fehlerzeile>
          <div className="mt-3"><Knopf art="gold" onClick={weiterName}>{S.weiter}</Knopf></div>
        </Kasten>
      )}

      {/* ── 2 · E-MAIL + DATENSCHUTZ ── */}
      {phase === "mail" && (
        <Kasten polster="p-5">
          {/* DAVID BLEIBT SICHTBAR (Owner 29.08.2026: „hier auch ein Bild klein wie drüber").
              Kleiner als im ersten Schritt: Dort stellt er sich vor, hier spricht er nur
              weiter — das Bild erinnert, es begrüsst nicht noch einmal. */}
          <div className="flex items-center gap-3">
            <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-[#f6cf51]/45">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/Lebenslauf/david-portrait.jpg" alt="David" className="h-full w-full object-cover object-top" />
            </span>
            {/* Der Titel steht als Überschrift darüber — hier der Satz mit dem Dank. */}
            <span className="min-w-0 flex-1">{davidSagt(mitNamen(S.mailText))}</span>
          </div>

          <label className="mt-4 block text-[12px] font-black uppercase tracking-wide text-[#f6cf51]">{S.mailLabel}</label>
          <Eingabe className="mt-1.5" type="email" inputMode="email" value={mail}
            onChange={e => setMail(e.target.value)} placeholder={S.mailPlatzhalter} autoComplete="email" />
          {/* Der Hinweis steht DIREKT am Feld, nicht im Fuss — dort, wo die Daten entstehen. */}
          {/* ZWEI ZEILEN STATT EINES ABSATZES (Owner 29.08.2026: „hier ist enorm viel Text").
              Oben, klein und ruhig: was verarbeitet wird. Darunter, hervorgehoben: die eine
              Zusicherung, wegen der er zögert. Vorher war sie der dritte Satz von vieren und
              ging unter — genau der Satz, der ihn den Haken setzen lässt. */}
          <p className="mt-4 text-[12px] font-medium leading-snug text-white/60">
            {S.datenschutz.replace(" Mehr in der Datenschutzerklärung.", "")}{" "}
            {/* AUF DAVIDS EIGENE SEITE, NICHT AUF DIE DES PORTALS (Owner 30.08.2026): Die
                grosse Erklärung beginnt mit Mode-Anprobe und „18+" — wer hier gerade seinen
                Lebenslauf hochladen soll, bricht dort ab. Der Text ist derselbe, nur ohne
                alles, was ihn nichts angeht; die vollständige Erklärung ist von dort aus
                einen Klick entfernt. */}
            <a href="/themes/david/privacy" target="_blank" rel="noreferrer" className="font-black text-[#f6cf51] underline underline-offset-2">
              {S.datenschutzLink}
            </a>
          </p>
          {S.datenschutzZusage && (
            <p className="mt-1.5 text-[12.5px] font-black leading-snug text-white/85">{S.datenschutzZusage}</p>
          )}
          <div className="mt-3">
            <Haken an={haken} setzen={setHaken} pflicht>{S.haken}</Haken>
          </div>
          <Fehlerzeile>{fehler}</Fehlerzeile>
          <div className="mt-3">
            {busy ? <Fortschritt text={S.bitteWarten} /> : <Knopf art="gold" onClick={() => void leadSpeichern()}>{S.screeningStarten}</Knopf>}
          </div>
        </Kasten>
      )}

      {/* ── 3 · LEBENSLAUF ── */}
      {phase === "cv" && (
        <Kasten polster="p-5">
          {/* David bleibt sichtbar, klein wie im Mail-Schritt (Owner 29.08.2026). */}
          <div className="flex items-center gap-3">
            <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-[#f6cf51]/45">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/Lebenslauf/david-portrait.jpg" alt="David" className="h-full w-full object-cover object-top" />
            </span>
            {/* In der Karte steht der Satz NICHT noch einmal — er ist jetzt die Überschrift
                darüber. Neben dem Bild steht stattdessen der Nebensatz mit dem Namen. */}
            {/* Liegt die Datei, sagt er nicht mehr „lade hoch", sondern was jetzt passiert. */}
            <span className="min-w-0 flex-1">{davidSagt(mitNamen(cvPath ? S.cvBereitText : S.cvText))}</span>
          </div>
          {/* DURCH `mitNamen`, SONST STEHT DA WÖRTLICH „{name}" (gesehen 29.08.2026 im Bild
              des Owners). Der Platzhalter sass vorher im TITEL, der ihn ersetzt bekam; seit
              der Titel die Aufgabe trägt, ist der Name in diesen Satz gewandert — und die
              Ersetzung ist nicht mitgewandert. */}

          {busy ? (
            <div className="mt-4"><Fortschritt text={ladeZeilen[tick % ladeZeilen.length] || busyText} /></div>
          ) : (
            <>
              {/* DAS FELD BLEIBT DAS FELD — es zeigt nur, was drin liegt.
                  Solange nichts hochgeladen ist, fordert es zum Hochladen auf; danach nennt
                  es die Datei und bleibt tippbar, falls es die falsche war. So wird nach der
                  Datei nie zweimal gefragt (Owner 29.08.2026). */}
              <div className={`mt-4 flex items-center gap-2 rounded-2xl border-2 border-dashed px-3.5 transition ${cvPath
                ? "border-[#f6cf51]/40 py-3" : "border-white/25 py-6"}`}>
                <label className={`flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 transition active:scale-[0.98] ${cvPath
                  ? "text-left" : "flex-col justify-center text-center"}`}>
                  {cvPath
                    ? <FileText className="h-4 w-4 shrink-0 text-[#f6cf51]" />
                    : <Upload className="h-5 w-5 text-[#f6cf51]" />}
                  {cvPath ? (
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-black text-white/90">{cvName}</span>
                      <span className="block text-[12px] font-bold text-white/55">{S.cvGewechselt}</span>
                    </span>
                  ) : (
                    <>
                      <span className="text-[14px] font-black text-white/90">{S.cvKnopf}</span>
                      <span className="text-[12px] font-bold text-white/60">{S.cvHinweis}</span>
                    </>
                  )}
                  <input type="file" accept=".pdf,.doc,.docx,application/pdf" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) void cvWaehlen(f); }} />
                </label>
                {/* Der Papierkorb steht AUSSERHALB des Feldes — läge er darin, öffnete jeder
                    Tipp darauf zugleich die Dateiauswahl. Erster Tipp fragt, zweiter löscht. */}
                {cvPath && (
                  <button type="button" onClick={() => void cvLoeschen()}
                    aria-label={loeschFrage ? S.cvLoeschenFrage : S.cvLoeschen}
                    /* NUR DIE FARBE WECHSELT (CI-Regel „Auswahl verschiebt nie"): Wüchse der
                       Knopf im scharfen Zustand, spränge die ganze Zeile unter dem Finger. */
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border transition active:scale-90 ${loeschFrage
                      ? "border-[#ef4444]/60 bg-[#ef4444]/15 text-[#ef4444]"
                      : "border-white/20 text-white/60"}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* DAS JA — ab hier kostet uns die Sitzung etwas. Der Knopf erscheint erst,
                  wenn die Datei liegt; vorher gibt es nichts zu bestätigen. */}
              {cvPath && (
                <>
                  <div className="mt-3"><Knopf art="gold" onClick={() => void cvAnalysieren()}>{S.cvBereitKnopf}</Knopf></div>
                  <p className="mt-2 text-center text-[12px] font-bold text-white/60">{S.cvBereitHinweis}</p>
                </>
              )}
              <Fehlerzeile>{fehler}</Fehlerzeile>
            </>
          )}
        </Kasten>
      )}

      {/* ── 4 · DIE STELLE ── */}
      {phase === "job" && (
        <Kasten polster="p-5">
          {/* HIER OHNE BILD (Owner 29.08.2026: „hier das Bild raus"). In den Schritten davor
              ist David das einzige Gesicht auf dem Schirm. Ab hier steht direkt darüber seine
              Sprechzeile aus dem Verlauf — die trägt sein Porträt schon. Zwei Gesichter
              untereinander lesen sich wie zwei Sprecher, wo nur einer redet. */}
          {davidSagt(S.jobText)}
          {/* Die Ladezeilen erzählen, was gerade WIRKLICH passiert — ohne Anzeige liest
              David den Lebenslauf, er gleicht keine Anforderungen ab. */}
          {busy ? (
            <div className="mt-4"><Fortschritt text={(ohneStelleFrage || ohneStelle
              ? [S.jobLadenOhne1, S.jobLadenOhne2, S.jobLadenOhne3]
              : [S.jobLaden1, S.jobLaden2, S.jobLaden3])[tick % 3] || busyText} /></div>
          ) : (
            <>
              <EingabeMehrzeilig className="mt-3" zeilen={7} value={anzeige}
                onChange={e => setAnzeige(e.target.value)} placeholder={S.jobPlatzhalter} />
              <Fehlerzeile>{fehler}</Fehlerzeile>
              <div className="mt-3"><Knopf art="gold" onClick={() => void jobSenden()}>{S.weiter}</Knopf></div>
              {/* DER ZWEITWEG IST EIN KNOPF, KEIN LINK (Owner 29.08.2026, mit Bild: „das auch
                  als secondary button"). Ein unterstrichener Satz unter einem Knopf sieht aus
                  wie Kleingedrucktes — er ist aber ein gleichwertiger Weg durch den Trichter,
                  und wer keine Stelle hat, muss ihn auf Anhieb als Weg erkennen.

                  UMRISS, NICHT GOLD (CI-Regel: genau eine Goldfläche je Schirm): Die Anzeige
                  bleibt der bessere Weg, und das soll man weiterhin sehen. */}
              {!ohneStelleFrage && (
                <div className="mt-2">
                  <Knopf art="umriss" onClick={() => setOhneStelleFrage(true)}>{S.ohneStelleLink}</Knopf>
                </div>
              )}
              {/* DIE RÜCKFRAGE ERSETZT NICHTS, SIE KOMMT DAZU — und sie ist ehrlich: Mit Ziel
                  findet er mehr heraus. Wer danach trotzdem ohne weitergeht, hat es gelesen.
                  Kein Overlay (Hausregel) — sie steht an Ort und Stelle. */}
              {ohneStelleFrage && (
                <div className="lb-rand-verlauf mt-3 rounded-[18px] lb-goldhauch p-4">
                  <p className="text-[15px] font-black leading-snug text-white">{S.ohneStelleTitel}</p>
                  <p className="mt-1 text-[13.5px] font-medium leading-relaxed text-white/75">{S.ohneStelleText}</p>
                  <div className="mt-3 flex flex-col gap-2">
                    <Knopf art="umriss" onClick={() => void ohneStelleWeiter()}>{S.ohneStelleWeiter}</Knopf>
                    <Knopf art="gold" onClick={() => setOhneStelleFrage(false)}>{S.ohneStelleDoch}</Knopf>
                  </div>
                </div>
              )}
            </>
          )}
        </Kasten>
      )}

      {/* ── 5 · ÜBERGANG INS GESPRÄCH ── */}
      {phase === "uebergang" && (
        <Kasten polster="p-5">
          {davidSagt(ohneStelle ? S.uebergangOhne : S.uebergang)}

          {/* ── DER PLAN (Owner 29.08.2026) ──
              Vorher stand hier nur „lass uns kurz sprechen", und dann kam Frage 1 von etwa
              sechs. Wer nicht weiss, worauf er sich einlässt, steigt bei Frage zwei aus.
              Jetzt steht die Anzahl, die Dauer, WORÜBER geredet wird — aus seinem eigenen
              Lebenslauf — und was am Ende dabei herauskommt. */}
          <div className="lb-rand-verlauf mt-4 rounded-[18px] lb-goldhauch p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f6cf51]">{S.planTitel}</p>
            <p className="mt-1 text-[15px] font-black leading-snug text-white">{S.planFragen}</p>

            {plan.length > 0 && (
              <>
                <p className="mt-3 text-[12.5px] font-black text-white/70">{S.planDarum}</p>
                {/* DAS „WARUM" IST DER BEWEIS (Owner 29.08.2026: „damit er sieht, dass es
                    kein AI-Slop ist, sondern ein durchdachtes System"). Drei Themen zu nennen
                    kann jeder Baukasten; zu sagen, dass die Anzeige Führung verlangt und sein
                    Lebenslauf dazu schweigt, kann nur, wer beides gelesen hat. */}
                <ul className="mt-1.5 flex flex-col gap-2">
                  {plan.map((z, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-[1px] text-[12px] font-black text-[#f6cf51]">{String(i + 1).padStart(2, "0")}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] font-black leading-snug text-white">{z.punkt}</span>
                        {z.warum && <span className="mt-0.5 block text-[12.5px] font-medium leading-snug text-white/60">{z.warum}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <p className="mt-3 text-[13px] font-medium leading-relaxed text-white/70">{S.planErgebnis}</p>

            {/* WARUM SICH MÜHE LOHNT (Owner 29.08.2026) — hier fällt die Entscheidung, wie
                viel Aufwand er investiert, nicht bei Frage vier. Kein Appell („streng dich
                an"), sondern ein Geschäft: Er sieht, was er für eine gute Antwort BEKOMMT.
                Der Gegensatz darunter macht es greifbar. */}
            <div className="mt-3 border-l-2 border-[#f6cf51]/50 pl-3">
              <p className="text-[13px] font-black leading-snug text-white">{S.planLohnt}</p>
              <p className="mt-1 text-[12.5px] font-bold leading-snug text-white/55">{S.planLohntGegen}</p>
            </div>
            {/* Der Ausgang gehört in den Plan: Wer weiss, dass er jederzeit raus kann, fängt
                eher an (dieselbe Überlegung wie beim Lebenslauf-Schritt). */}
            <p className="mt-2 text-[12px] font-bold leading-snug text-white/55">{S.planJederzeit}</p>
          </div>

          <div className="mt-4">
            <Knopf art="gold" onClick={() => { void logFunnelEvent("screening_started", { theme: "david" }); setPhase("gespraech"); }}>
              {S.losGehts}
            </Knopf>
          </div>
        </Kasten>
      )}

      {/* ── 6 · DAS GESPRÄCH ── */}
      {phase === "gespraech" && (
        <Kasten polster="p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f6cf51]">
            {S.fortschritt} · {nummer} {S.von} 6
          </p>
          {/* DIE FRAGE IST DAS WICHTIGSTE AUF DIESEM SCHIRM (Owner 29.08.2026) — also trägt
              sie die grösste Schrift. Sie stand vorher in 15,5 px unter einer 26-px-Werbezeile,
              die in diesem Moment nichts mehr zu sagen hat. */}
          <h1 className="mt-1.5 text-[22px] font-black leading-[1.2] text-white">{frage}</h1>
          {/* AN DER FRAGE, NICHT BEI DEN ANTWORT-KNÖPFEN (Owner 29.08.2026): Er handelt von
              der Frage. Klein, weil selten gebraucht — aber sichtbar, damit niemand aus
              Verlegenheit „weiss nicht" ins Feld tippt und das als Antwort gespeichert wird. */}
          {!busy && erklaert < 2 && (
            <button type="button" onClick={() => void frageErklaeren()}
              className="mt-2 text-[12.5px] font-bold text-white/55 underline underline-offset-2 transition active:scale-95">
              {S.frageUnklar}
            </button>
          )}
          {busy ? (
            <div className="mt-4"><Fortschritt text={S.davidDenkt} /></div>
          ) : (
            <>
              {/* DIE ANLEITUNG STEHT IM PLATZHALTER (Owner 29.08.2026: „das wird nicht
                  gelesen. Sowas gehört ins Eingabefeld."). Sie liegt damit dort, wo der Blick
                  vor dem Tippen ohnehin hingeht — und verschwindet von selbst, sobald er
                  schreibt. Der billigste Qualitätshebel im ganzen Screening: Der Verlust
                  entsteht nicht am Modell, sondern am Menschen, der aufschreibt, wofür er
                  zuständig war, statt was er getan hat. */}
              <EingabeMehrzeilig className="mt-3" zeilen={5} value={antwort}
                onChange={e => setAntwort(e.target.value)} placeholder={S.antwortPlatzhalter} />
              <Fehlerzeile>{fehler}</Fehlerzeile>
              {/* ── DAVIDS VORSCHLAG (Owner 29.08.2026) ──
                  Er wird ins Feld GELEGT, nicht abgeschickt: Der Bewerber füllt die Klammern
                  mit seinen echten Zahlen und ändert, was nicht stimmt. Ein Vorschlag, der
                  sich selbst abschickt, legte ihm Sätze in den Mund, die er nie gesagt hat —
                  und die ein Recruiter im Gespräch auseinandernimmt. */}
              <div className="mt-3"><Knopf art="gold" onClick={() => void antwortSenden()}>{S.antworten}</Knopf></div>
              {/* DER AUSGANG AUS JEDER FRAGE (Owner 29.08.2026: „er kann ohne Antwort weder
                  vor noch zurück"). Ein Screening ist ein Gespräch, kein Formular — auf eine
                  Frage, die nicht passt, darf man schweigen dürfen. David hakt danach nicht
                  nach und wechselt den Bereich.

                  UMRISS, NICHT GOLD (CI-Regel): Antworten bleibt sichtbar der bessere Weg. */}
              {!abbruchFrage && (
                <div className="mt-2">
                  <Knopf art="umriss" onClick={() => void antwortSenden(true)}>{S.frageUeberspringen}</Knopf>
                </div>
              )}

              {/* ── ZWEIMAL ÜBERSPRUNGEN: DIE EHRLICHE RÜCKFRAGE (Owner 29.08.2026) ──
                  Nicht still abbrechen: Hier liegt die letzte Verkaufschance. Wer hört, dass
                  wir seinen Widerwillen bemerkt haben UND trotzdem liefern, liest den
                  Bericht — und erst der Bericht verkauft. Kein Overlay (Hausregel), die
                  Rückfrage steht an Ort und Stelle, und die Frage bleibt darüber sichtbar. */}
              {abbruchFrage && (
                <div className="lb-rand-verlauf mt-3 rounded-[18px] lb-goldhauch p-4">
                  <p className="text-[15px] font-black leading-snug text-white">{S.abbruchTitel}</p>
                  <p className="mt-1 text-[13.5px] font-medium leading-relaxed text-white/75">{S.abbruchText}</p>
                  <p className="mt-2 text-[13.5px] font-black text-white">{S.abbruchFrage}</p>
                  <div className="mt-3 flex flex-col gap-2">
                    <Knopf art="gold" onClick={() => {
                      setAbbruchFrage(false); setFrage("");
                      void logFunnelEvent("screening_abgekuerzt", { theme: "david" });
                      setPhase("analyse");
                      void berichtHolen();
                    }}>{S.abbruchJa}</Knopf>
                    {/* „Nein" führt zurück zur Frage, nicht in eine Sackgasse. */}
                    <Knopf art="umriss" onClick={() => {
                      setAbbruchFrage(false);
                      setVerlauf(v => [...v, { von: "david", text: S.abbruchZurueck }]);
                    }}>{S.abbruchNein}</Knopf>
                  </div>
                </div>
              )}
            </>
          )}
        </Kasten>
      )}

      {/* ── 6b · DER EINE FREIE ANLAUF (Owner 29.08.2026) ──
             Er steht zwischen Gespräch und Bericht und erscheint NUR, wenn Antworten wirklich
             dünn geblieben sind. Wer sich Mühe gegeben hat, bekommt kein Zeugnis, sondern
             sein Ergebnis.

             DER RIEGEL SITZT AUF DEM SERVER (`nachbesserungAm`): Ein zweiter Anlauf prallt
             dort ab, egal was der Browser schickt. */}
      {phase === "anlauf" && (
        <Kasten polster="p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f6cf51]">{S.anlaufTitel}</p>
          <p className="mt-1.5 text-[15px] font-semibold leading-relaxed text-white/90">{S.anlaufText}</p>
          <p className="mt-2 text-[13.5px] font-medium leading-relaxed text-white/70">{S.anlaufFrei}</p>

          {busy ? (
            <div className="mt-4"><Fortschritt text={S.analyse1} /></div>
          ) : (
            <>
              {anlaufPunkte.map((pkt, i) => (
                <div key={pkt.nr} className={i === 0 ? "mt-4" : "mt-5"}>
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/45">{S.anlaufFrageLabel}</p>
                  <p className="mt-0.5 text-[14px] font-black leading-snug text-white">{pkt.frage}</p>
                  <EingabeMehrzeilig className="mt-2" zeilen={4} value={pkt.antwort}
                    placeholder={S.anlaufPlatzhalter}
                    onChange={e => setAnlaufPunkte(a => a.map(x => x.nr === pkt.nr ? { ...x, antwort: e.target.value } : x))} />
                </div>
              ))}
              <Fehlerzeile>{fehler}</Fehlerzeile>
              <div className="mt-4 flex flex-col gap-2">
                <Knopf art="gold" onClick={() => void anlaufSenden()}>{S.anlaufSpeichern}</Knopf>
                {/* Kein Zwang: Wer nicht mag, bekommt sein Ergebnis so, wie es ist. */}
                <Knopf art="umriss" onClick={() => { setPhase("analyse"); void berichtHolen(); }}>{S.anlaufSpaeter}</Knopf>
              </div>
            </>
          )}
        </Kasten>
      )}

      {/* ── 7 · DIE ANALYSE — Davids Schlusssatz, dann der Bericht ── */}
      {phase === "analyse" && (
        <Kasten polster="p-5">
          {davidSagt(S.genug)}
          <div className="mt-4"><Fortschritt text={analyseZeilen[tick % analyseZeilen.length]} /></div>
          <Fehlerzeile>{fehler}</Fehlerzeile>
          {!!fehler && (
            <div className="mt-3"><Knopf art="umriss" onClick={() => void berichtHolen()}>{S.nochmal}</Knopf></div>
          )}
        </Kasten>
      )}

      {/* ── 8 · DAS ERGEBNIS — BERICHT UND ANGEBOTE AUF EINER SEITE ──
             Owner 28.08.2026: „ich dachte wir machen das auf der ergebnis seite relativ
             einfach. Oder wie kommt man hier drauf?" — die bezahlten Schritte standen auf
             einem EIGENEN Schirm hinter einem Knopf. Das ist ein Bruch: Wer gerade gelesen
             hat, was seiner Bewerbung fehlt, will es im selben Zug beheben, nicht erst
             weiterklicken. Jetzt hängen sie unten am Bericht — man scrollt hinein. */}
      {phase === "bericht" && report && (
        <div className="flex flex-col gap-4">
          {/* Der Bericht kommt aus dem gemeinsamen Baustein — dieselbe Darstellung zeigt
              die Seite `/david/<id>`, wenn er ihn später aus seinen Assets öffnet. */}
          <DavidReportAnsicht report={report} T={S}
            kopf={{
              kicker: `${S.reportFuer} ${name}`,
              titel: S.reportTitel,
              jobTitel, jobOrt, jobArt, schwerpunkte, layout, foto: cvFoto,
            }} />

          {/* ZUERST SICHERN, DANN VERKAUFEN (Owner 29.08.2026): Die Adresse steht ÜBER den
              bezahlten Angeboten — wer hier korrigiert, ist danach auch für Quittung und
              Lieferung erreichbar. Umgekehrt wäre die Reihenfolge ein Kauf ins Leere. */}
          <DavidSichern genId={genId} email={mail.trim()} S={S} />

          <p className="mt-2 text-center text-[12px] font-bold leading-snug text-white/60">{S.assetsZeile}</p>

          {/* Die bezahlten Schritte kommen aus dem gemeinsamen Baustein — dieselbe
              Darstellung und derselbe Kaufweg zeigt die Ergebnis-Seite `/david/<id>`. */}
          <DavidAngebote
            S={S} preisUnterlagen={preisUnterlagen} preisVideo={preisVideo} lang={lang}
            genId={genId} email={mail.trim()} cvPath={cvPath} cvName={cvName}
            anzeige={anzeige.trim()} vorname={name}
            beispielCv={beispielCv}
            onWeiter={() => setPhase("feedback")} />
        </div>
      )}

      {/* ── 10 · FEEDBACK ── */}
      {phase === "feedback" && (
        <Kasten polster="p-5">
          {davidSagt(S.feedbackFrage)}
          <div className="mt-4 flex flex-col gap-2">
            {([["sehr", S.n1], ["nuetzlich", S.n2], ["teilweise", S.n3], ["kaum", S.n4]] as const).map(([w, t]) => (
              <Knopf key={w} art="chip" aktiv={nuetzlich === w} onClick={() => void nuetzlichWaehlen(w)}>{t}</Knopf>
            ))}
          </div>
        </Kasten>
      )}

      {/* ── 11a · INTERESSEN (nur bei positiver Bewertung) ── */}
      {phase === "interessen" && (
        <Kasten polster="p-5">
          {davidSagt(S.dankeKurz)}
          <p className="mt-2 text-[15px] font-medium leading-relaxed text-white/80">{S.interessenText}</p>
          <div className="mt-4 flex flex-col gap-2.5">
            {([
              ["jobs-weltweit", S.i1t, S.i1d], ["komplette-bewerbung", S.i2t, S.i2d],
              ["bewerbungsseite", S.i3t, S.i3d], ["video-bewerbung", S.i4t, S.i4d],
              ["karriereanalyse", S.i5t, S.i5d], ["beratung", S.i6t, S.i6d],
              ["nichts", S.i7t, S.i7d],
            ] as const).map(([w, t, d]) => (
              <Haken key={w} an={interessen.includes(w)} setzen={() => interesseUmschalten(w)}>
                <span className="font-black text-white">{t}</span>
                {d ? <span className="mt-0.5 block text-[12.5px] font-medium text-white/65">{d}</span> : null}
              </Haken>
            ))}
          </div>
          <div className="mt-4"><Knopf art="gold" onClick={() => void interessenSenden()}>{S.weiter}</Knopf></div>
        </Kasten>
      )}

      {/* ── 11b · KRITIK (bei „teilweise"/„eher nicht") ── */}
      {phase === "kritik" && (
        <Kasten polster="p-5">
          {davidSagt(S.feedbackTextFrage)}
          <EingabeMehrzeilig className="mt-3" zeilen={4} value={kritik}
            onChange={e => setKritik(e.target.value)} placeholder={S.feedbackPlatzhalter} />
          <div className="mt-3 flex gap-2">
            <Knopf art="gold" onClick={() => void kritikSenden()}>{S.absenden}</Knopf>
            <Knopf art="umriss" onClick={() => setPhase("updates")}>{S.ueberspringen}</Knopf>
          </div>
        </Kasten>
      )}

      {/* ── 12 · PRODUKT-UPDATES (freiwillig, getrennt von der Pflichtbestätigung) ── */}
      {phase === "updates" && (
        <Kasten polster="p-5">
          <p className="text-[15.5px] font-black leading-snug text-white">{S.updatesTitel}</p>
          <p className="mt-2 text-[14px] font-medium leading-relaxed text-white/80">{S.updatesText}</p>
          <div className="mt-4"><Haken an={updates} setzen={setUpdates}>{S.updatesHaken}</Haken></div>
          <div className="mt-4"><Knopf art="gold" onClick={() => void updatesSenden()}>{S.fertig}</Knopf></div>
        </Kasten>
      )}

      {/* ── 13 · SCHLUSS ── */}
      {phase === "danke" && (
        <Kasten art="gold" polster="p-5">
          <p className="flex items-center gap-2 text-[16px] font-black text-white">
            <Check className="h-4 w-4 text-[#f6cf51]" />{mitNamen(S.dankeTitel)}
          </p>
          <p className="mt-2 text-[14.5px] font-semibold leading-relaxed text-white/85">{S.dankeText}</p>
          <div className="mt-4"><Knopf art="umriss" href="/my-gallery">{S.assetsKnopf}</Knopf></div>
        </Kasten>
      )}

      <div ref={endeRef} />

      {/* Der Landingpage-Inhalt unter dem Trichter — Dauerregel `tunnel-zeigt-landingpage-inhalt`. */}
      {phase === "name" && inhalt}
    </div>
  );
}
