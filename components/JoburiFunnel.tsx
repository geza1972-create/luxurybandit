"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Mail } from "lucide-react";
import { Knopf, Kasten, Eingabe, Fehlerzeile, Fortschritt, Haken } from "@/components/CI";
import { logFunnelEvent, logTunnelEvent } from "@/lib/track-funnel";
import type { JoburiTexte } from "@/lib/joburi-texte";
import { gehaltMitte, GEHALT_MIN, GEHALT_MAX } from "@/lib/joburi-gehalt";

/**
 * TALENT MARKET PULSE — DER TRICHTER FRAGT, STATT ZU ZEIGEN (Owner 31.08.2026).
 *
 * „Wir wollen nicht mehr primär Jobs anzeigen, sondern herausfinden, zu welchen Bedingungen
 * deutschsprachige Menschen in Rumänien oder der Diaspora den Job wechseln würden."
 *
 * WARUM DAS BESSER IST ALS DIE STELLENLISTE DAVOR: Die Liste konnte nur so gut sein wie der
 * Bestand — und der stand bei null. Eine Studie braucht keinen Bestand; sie liefert vom
 * ersten Besucher an das, was kein Jobportal hat: den PREIS eines Wechsels, aus dem Mund der
 * Leute selbst. Genau das verkauft `/recruiting` an Firmen.
 *
 * DIE REIHENFOLGE IST WEITER DER GANZE PUNKT:
 *   1. Sieben Fragen, alle per Klick, EINE JE BILDSCHIRM. Kein Tippfeld, keine Person.
 *   2. Seine eigenen Antworten als Zusammenfassung — und KEINE erfundene Marktzahl dazu.
 *   3. Erst dann die Adresse, und zwar nur sie: kein Name, kein Telefon, kein Lebenslauf.
 *
 * WAS UNVERÄNDERT BLEIBT (Owner: „vorhandene Komponenten, Lead-Speicherung, Admin und
 * Consent-Logik wiederverwenden"): derselbe Lead-Speicher, dieselbe Route mit denselben
 * Schritten, dieselbe Einwilligung samt der Zusage, dass nichts automatisch an Arbeitgeber
 * geht, dieselben CI-Bausteine.
 */

type Schritt = "land" | "alter" | "deutsch" | "suche" | "gehalt" | "faktoren" | "rueckkehr" | "feld" | "summe" | "mail" | "danke";

/** Nur Ziffern, höchstens fünf — „2.500" und „25oo" sind Vertipper, keine Beträge. */
const nurZiffern = (v: string) => v.replace(/[^\d]/g, "").slice(0, 5);

/**
 * EIN GELDFELD — UND ES STEHT AUF MODULEBENE, NICHT IN DER RENDER-FUNKTION.
 *
 * Genau daran ist die erste Fassung gescheitert (Owner 31.08.2026: „ich kann nicht tippen un
 * muss blau tippen"): Wird eine Komponente INNERHALB der Render-Funktion definiert, ist sie
 * bei jedem Tastendruck ein neuer Typ. React wirft das alte `<input>` weg und baut ein neues
 * — der Fokus geht mit, und man kann nur je eine Ziffer tippen, bevor man wieder ins Feld
 * tippen muss.
 *
 * Bei den Antwort-Kacheln fiel das nie auf, weil ein Knopf keinen Fokus braucht. Wer hier
 * ein weiteres Eingabefeld ergänzt, legt es ebenfalls hierher.
 */
function Geldfeld({ titel, wert, setzen }: { titel: string; wert: string; setzen: (v: string) => void }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="mb-1.5 text-center text-[12px] font-black uppercase leading-tight tracking-[0.06em] text-white/50">{titel}</p>
      {/* <label> und nicht <div>: Erstens greift die Blau-Regel der hellen Fassung nur auf
          Knöpfe, Links, Labels und Auswahlfelder (app/globals.css) — als div blieb das Feld
          als Einziges grau. Zweitens setzt ein Tipp auf den Rahmen so den Cursor ins Feld,
          statt ins Leere zu gehen. */}
      <label className="flex h-14 items-center gap-1 rounded-2xl border border-white/20 bg-white/5 px-3">
        <input
          type="text" inputMode="numeric" pattern="[0-9]*" value={wert} placeholder="0"
          onChange={e => setzen(nurZiffern(e.target.value))}
          className="w-full min-w-0 bg-transparent text-center text-[21px] font-black text-white outline-none placeholder:text-white/25" />
        <span className="shrink-0 text-[16px] font-black text-white/45">€</span>
      </label>
    </div>
  );
}

export default function JoburiFunnel({ T, lang, kopf }: { T: JoburiTexte; lang: string; kopf?: React.ReactNode }) {
  const [schritt, setSchritt] = useState<Schritt>("land");
  /**
   * DIE KENNUNG LIEGT IN EINEM REF, NICHT IM ZUSTAND (31.08.2026 gemessen: ohne das legte
   * JEDE ANTWORT EINEN EIGENEN DATENSATZ AN — sieben Fragmente statt eines Kandidaten, und
   * die Studie wäre wertlos gewesen).
   *
   * Ein `useState` wird erst zum nächsten Bild sichtbar; wer schnell klickt, schickt die
   * zweite Antwort noch mit leerer Kennung los, und der Server legt gutgläubig einen neuen
   * Lead an. Ein Ref steht in derselben Sekunde, in der die Antwort ankommt.
   */
  const leadIdRef = useRef("");

  const [land, setLand] = useState("");
  const [alter, setAlter] = useState("");
  /* Das HEUTIGE Gehalt — Gegenstück zum Wunschgehalt. Erst beide zusammen ergeben die
     Differenz, und die Differenz ist die Zahl, die eine Firma interessiert. */
  const [jetzt, setJetzt] = useState("");
  const [deutsch, setDeutsch] = useState("");
  const [suche, setSuche] = useState("");
  const [gehalt, setGehalt] = useState("");
  const [faktoren, setFaktoren] = useState<string[]>([]);
  const [rueckkehr, setRueckkehr] = useState("");
  const [feld, setFeld] = useState("");
  /* Was jemand tippt, wenn keine der sieben Kacheln passt — die Lücke, die vorher nur
     „Anderes" hiess und über die sich nichts aussagen liess. */
  const [feldFrei, setFeldFrei] = useState("");
  /* Der Abschluss (Owner 31.08.2026: „studii superioare…als dropdown?"). Er steht auf
     DEMSELBEN Bildschirm wie der Beruf und kostet deshalb keinen zehnten Schritt — bei neun
     Fragen ist jede weitere Seite ein Abbruchrisiko, ein zweites Feld auf einer bestehenden
     Seite fast keines. */
  const [studii, setStudii] = useState("");
  /* Wie weit er schon war. Ohne das wäre der Vor-Pfeil entweder immer aktiv (und spränge über
     unbeantwortete Fragen) oder immer tot (und wer zurückgeht, käme nur durch Neu-Antworten
     wieder nach vorn). */
  const [weitester, setWeitester] = useState(0);

  const [mail, setMail] = useState("");
  const [haken, setHaken] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState("");

  const geraet = () => { try { return localStorage.getItem("lb_visitor") ?? ""; } catch { return ""; } };

  /**
   * IST DAS EIN ECHTER BESUCHER ODER EIN PROBELAUF? (31.08.2026, aufgefallen beim Bauen:
   * die Zahl der Antworten stieg in Minuten von 60 auf 77 — das waren wir selbst.)
   *
   * Jeder Durchlauf legt einen Datensatz an, auch unserer. Ohne diese Unterscheidung wandern
   * Testeingaben in die Studie, auf die wir uns gegenüber Firmen berufen — und niemand kann
   * hinterher sagen, welche Zeile ein Mensch war. Dieselbe Logik wie in `lib/track-funnel.ts`
   * (`isInternalSession`): die eigene Maschine und eine Admin-Sitzung zählen als Probe.
   *
   * GELÖSCHT WIRD NICHTS — der Datensatz entsteht weiter, er trägt nur `test: true` und
   * fällt aus jeder Auswertung. Wegwerfen könnte man später nicht mehr prüfen.
   */
  const istProbe = () => {
    try {
      const host = window.location.hostname;
      if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local")) return true;
      return !!localStorage.getItem("luxurybandit-try-look-admin-pin");
    } catch { return false; }
  };
  const mailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail.trim());
  /** Wer in Rumänien arbeitet, wird nicht nach Rückkehr gefragt — er ist schon da. */
  const inDiaspora = land !== "" && land !== "ro";

  /* Die Herkunft wird beim ERSTEN Schritt gelesen — wer danach aussteigt, ist trotzdem
     einer Anzeige zuzuordnen. */
  const quelle = (): Record<string, string> => {
    const utm: Record<string, string> = {};
    try {
      const q = new URLSearchParams(window.location.search);
      ["utm_source", "utm_medium", "utm_campaign", "utm_content"].forEach(k => { const v = q.get(k); if (v) utm[k] = v; });
      if (!utm.utm_source) {
        const alt = q.get("src") || q.get("source") || q.get("ref") || "";
        if (alt) utm.utm_source = alt;
      }
    } catch { /**/ }
    return utm;
  };

  useEffect(() => { void logFunnelEvent("start_clicked", { theme: "joburi" }); }, []);


  /**
   * NACH JEDER ANTWORT SPEICHERN, NICHT ERST AM ENDE.
   *
   * Wer bei Frage fünf aussteigt, hat vier Antworten gegeben — und die sind für die Studie
   * genauso viel wert wie sieben. Ein Speichern erst am Schluss hätte sie weggeworfen und
   * dazu die Frage unbeantwortet gelassen, an welcher Stelle die Leute abbrechen.
   */
  /**
   * UND SIE LAUFEN NACHEINANDER, NICHT NEBENEINANDER.
   *
   * Das Ref allein reicht nicht: Wer die zweite Frage antippt, bevor die erste Antwort vom
   * Server zurück ist, hat immer noch keine Kennung — und bekäme einen zweiten Datensatz.
   * Jede Speicherung hängt sich deshalb an die vorherige an. Für den Nutzer ändert das
   * nichts; er wartet nie, weil die Anzeige sofort weiterspringt.
   */
  const kette = useRef<Promise<void>>(Promise.resolve());

  const merken = (teil: Record<string, unknown>) => {
    kette.current = kette.current.then(async () => {
      try {
        const d = await fetch("/api/joburi-lead", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schritt: "antworten", id: leadIdRef.current, device: geraet(), lang, utm: quelle(), test: istProbe(), ...teil }),
        }).then(r => r.json());
        if (d?.id) leadIdRef.current = String(d.id);
      } catch { /* die Anzeige läuft weiter; der nächste Schritt schreibt es erneut mit */ }
    });
    return kette.current;
  };

  const kontaktSenden = async () => {
    if (!mailOk) { setFehler(T.mailFehlt); return; }
    if (!haken) { setFehler(T.hakenFehlt); return; }
    setBusy(true); setFehler("");
    try {
      /* Erst wenn alle Antworten geschrieben sind, steht die Kennung fest — sonst hinge die
         Adresse an einem Datensatz ohne Antworten. */
      await kette.current;
      const d = await fetch("/api/joburi-lead", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schritt: "kontakt", id: leadIdRef.current, email: mail.trim(), kontaktOk: true }),
      }).then(r => r.json());
      if (d?.error) { setFehler(String(d.error)); setBusy(false); return; }
      void logTunnelEvent("lead_created", "joburi");
      setSchritt("danke");
    } catch { setFehler(T.technischerFehler); }
    setBusy(false);
  };

  /* ─────────────────────────── Bausteine ─────────────────────────── */

  const Wahl = ({ optionen, waehlen }: { optionen: { wert: string; text: string }[]; waehlen: (w: string) => void }) => (
    <div className="mt-4 flex flex-col gap-2">
      {optionen.map(o => (
        <button key={o.wert} type="button" onClick={() => waehlen(o.wert)}
          className="flex h-12 items-center justify-between gap-3 rounded-full border border-white/20 bg-white/5 px-5 text-left text-[15px] font-black text-white/90 transition active:scale-[0.98]">
          {o.text}
          <span className="shrink-0 text-white/35">→</span>
        </button>
      ))}
    </div>
  );

  /** Eine Frage — Kopf oder Leiste darüber, dann Kasten, Überschrift, Hinweis, Antworten.
      Der Rückweg steht seit dem 31.08. oben in der Leiste und nicht mehr als Textlink unter
      jeder Antwortliste: ein Weg zurück, überall an derselben Stelle. */
  const Frage = ({ titel, hinweis, children }: {
    titel: string; hinweis?: string; zurueck?: Schritt; children: React.ReactNode;
  }) => (
    <>
      {kopfBlock}
      {leiste}
      <Kasten polster="p-5">
        <h2 className="text-[19px] font-black leading-snug text-white">{titel}</h2>
        {hinweis && <p className="mt-1 text-[13px] font-medium text-white/60">{hinweis}</p>}
        {children}
      </Kasten>
    </>
  );

  /**
   * DIE LEISTE STATT DES KOPFES (Owner 31.08.2026: „ich mag diesen unnötigen zeug auf jeder
   * seite mitzuschelpennen … statt da ein vor und zurück einzubauen und einen
   * fortschritsbalken").
   *
   * Der Kopf steht jetzt nur noch über der ersten Frage. Ab der zweiten sitzt an seiner
   * Stelle diese Zeile: zurück, Balken, vor, Zähler. Sie ist nicht nur kürzer — sie
   * beantwortet die Frage, die den Kopf ohnehin niemand mehr fragen liess: „wie lange noch?".
   * Ein sichtbares Ende hält Leute im Trichter; ein wiederholter Werbetext nicht.
   *
   * VOR IST NUR SO WEIT MÖGLICH, WIE ER SCHON WAR. Sonst überspränge der Pfeil Fragen, die
   * nie beantwortet wurden, und die Studie bekäme Datensätze mit Löchern.
   */
  const REIHE: Schritt[] = inDiaspora
    ? ["land", "alter", "deutsch", "suche", "gehalt", "faktoren", "rueckkehr", "feld", "summe", "mail"]
    : ["land", "alter", "deutsch", "suche", "gehalt", "faktoren", "feld", "summe", "mail"];
  const pos = REIHE.indexOf(schritt);

  /* Jeder Schrittwechsel merkt sich den weitesten Punkt — auch der über die Pfeile. */
  useEffect(() => { setWeitester(w => (pos > w ? pos : w)); }, [pos]);

  /* Ab der zweiten Frage verschwinden Sprache und Hell/Dunkel aus dem Kopf (Regel in
     app/globals.css). Beim Verlassen der Seite wird die Klasse wieder abgenommen — sonst
     fehlten die Schalter auf der nächsten Seite, die derselbe Browser öffnet. */
  useEffect(() => {
    const an = pos > 0;
    document.body.classList.toggle("lb-tunnel-tief", an);
    return () => document.body.classList.remove("lb-tunnel-tief");
  }, [pos]);

  const geheZu = (i: number) => { if (i >= 0 && i < REIHE.length) setSchritt(REIHE[i]); };

  /* BEWUSST EINE VARIABLE UND KEINE KOMPONENTE: Alles, was in dieser Render-Funktion als
     Komponente definiert wird, ist bei jedem Tastendruck ein neuer Typ — React wirft den
     Teilbaum weg und der Fokus im Gehalts- oder Berufsfeld geht mit (siehe `Geldfeld`).
     Ein fertiges Element hat dieses Problem nicht. */
  const leiste = pos <= 0 ? null : (
    <div className="mb-3 flex items-center gap-2.5">
      <button type="button" onClick={() => geheZu(pos - 1)} aria-label={T.zurueck}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/20 bg-white/5 text-[15px] font-black text-white/80 active:scale-90">←</button>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/12">
        <div className="h-full rounded-full bg-[#f6cf51] transition-all duration-300"
          style={{ width: `${Math.round(((pos + 1) / REIHE.length) * 100)}%` }} />
      </div>
      <button type="button" onClick={() => geheZu(pos + 1)} disabled={pos >= weitester} aria-label={T.weiter}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/20 bg-white/5 text-[15px] font-black text-white/80 transition active:scale-90 disabled:opacity-25">→</button>
      <span className="shrink-0 text-[12px] font-black tabular-nums text-white/45">{pos + 1}/{REIHE.length}</span>
    </div>
  );

  /* Der Kopf nur über der ersten Frage — ab der zweiten steht dort die Leiste. */
  const kopfBlock = schritt === "land" && kopf ? <div className="mb-5">{kopf}</div> : null;

  /* ─────────────────────────── Die Fragen ─────────────────────────── */

  if (schritt === "land") {
    return (
      <Frage titel={T.fLand}>
        <Wahl
          optionen={[
            { wert: "ro", text: T.landRo }, { wert: "de", text: T.landDe },
            { wert: "at", text: T.landAt }, { wert: "alta", text: T.landAlta },
          ]}
          waehlen={w => { setLand(w); void merken({ land: w }); setSchritt("alter"); }} />
      </Frage>
    );
  }

  /* DAS ALTER — direkt nach dem Land, solange noch niemand müde ist (31.08.2026).
     Es steht hier, weil eine Altersgrenze in der Anzeige sonst auf einer Vermutung beruht:
     Meta zeigt nur, wer geklickt hat, nie ob dessen Antwort etwas taugte. */
  if (schritt === "alter") {
    return (
      <Frage titel={T.fAlter} hinweis={T.fAlterHinweis} zurueck="land">
        <Wahl
          optionen={[
            { wert: "u25", text: T.alterU25 }, { wert: "25-34", text: T.alter2534 },
            { wert: "35-44", text: T.alter3544 }, { wert: "45-54", text: T.alter4554 },
            { wert: "55+", text: T.alter55p },
          ]}
          waehlen={w => { setAlter(w); void merken({ alter: w }); setSchritt("deutsch"); }} />
      </Frage>
    );
  }

  if (schritt === "deutsch") {
    return (
      <Frage titel={T.frage1} hinweis={T.frage1Hinweis} zurueck="alter">
        <Wahl
          optionen={[
            { wert: "A2", text: T.niveauA2 }, { wert: "B1", text: T.niveauB1 },
            { wert: "B2", text: T.niveauB2 }, { wert: "C1", text: T.niveauC1 },
            { wert: "C2", text: T.niveauC2 },
          ]}
          waehlen={w => { setDeutsch(w); void merken({ deutsch: w }); setSchritt("suche"); }} />
      </Frage>
    );
  }

  if (schritt === "suche") {
    return (
      <Frage titel={T.frage4} zurueck="deutsch">
        <Wahl
          optionen={[
            { wert: "aktiv", text: T.sucheAktiv }, { wert: "offen", text: T.sucheOffen },
            { wert: "passiv", text: T.suchePassiv },
          ]}
          waehlen={w => { setSuche(w); void merken({ suche: w }); setSchritt("gehalt"); }} />
      </Frage>
    );
  }

  /* DIE FRAGE, UM DIE ES GEHT — UND SIE STEHT SICH SELBST GEGENÜBER (Owner 31.08.2026:
     „hier müssen die zwei felder gegenüber stehen. wieviel verdienst du jetzt und für wieviel
     würdest du wechseln").
     Zwei Spalten auf EINEM Bild, nicht zwei Schritte hintereinander. Der Grund ist nicht die
     Bequemlichkeit, sondern die Wahrheit: Wer „700 €" links stehen sieht, während er rechts
     auf „ab 3.000 €" tippt, sieht seinen eigenen Sprung. Getrennte Bildschirme verstecken
     genau diesen Widerspruch — und der Widerspruch ist die interessanteste Zahl der Studie.
     Als Stufe und nicht als offenes Feld: Eine leere Zahl beantwortet kaum jemand, eine
     Spanne fast jeder — und für die Auswertung reicht sie.
     LINKS HÄNGT AM WOHNLAND: Wer in Rumänien lebt, sieht rumänische Spannen (Owner: „hier
     lügen sie alle. Wenn sie sagen Rumänien und sagen sie verdienen 2500, dann ist das eine
     Lüge"). Wer dort übertreiben will, kann es um eine Stufe — nicht um drei. */
  if (schritt === "gehalt") {
    /* ZWEI ZAHLEN, NEBENEINANDER (Owner 31.08.2026: „oder besser er gibt es ein genau …
       dann lügt er weniger").
       Eine Kachel wählt man, eine Zahl behauptet man — und wer „2.500–3.000 €" antippt,
       greift leichter eine Stufe zu hoch als jemand, der „2500" tippen muss. Die freie Zahl
       ist ausserdem das Einzige, woraus sich ein echter Median rechnen lässt; aus Spannen
       wird immer nur ein Median von Mittelwerten.
       DER PREIS IST BEKANNT: Tippen kostet Abbrecher, und 85 % Antwortquote sind das
       Wertvollste, was dieser Trichter hat. Deshalb sind es zwei kurze Felder, Zifferntastatur,
       nebeneinander auf einem Bild — nicht zwei Bildschirme nacheinander. */
    const n = (v: string) => Number(v);
    const okJetzt = jetzt !== "" && n(jetzt) >= GEHALT_MIN && n(jetzt) <= GEHALT_MAX;
    const okWunsch = gehalt !== "" && n(gehalt) >= GEHALT_MIN && n(gehalt) <= GEHALT_MAX;
    const diff = okJetzt && okWunsch ? n(gehalt) - n(jetzt) : null;
    /* HIER STEHT BEWUSST KEIN <Frage>, SONDERN DER KASTEN DIREKT (31.08.2026).
       `Frage` und `Wahl` sind Bausteine INNERHALB dieser Render-Funktion — bequem, solange
       darunter nur Knöpfe hängen. Für ein Eingabefeld sind sie tödlich: Bei jedem Tastendruck
       ist `Frage` ein neuer Komponententyp, React wirft den ganzen Teilbaum weg und baut ihn
       neu, und der Fokus geht mit. Der Owner konnte deshalb nur je eine Ziffer tippen und
       musste danach wieder ins Feld tippen. `Kasten` kommt aus der CI-Bibliothek und ist
       zwischen zwei Renders derselbe — die Eingabe überlebt.
       WER HIER EIN WEITERES EINGABEFELD ERGÄNZT, hält sich an dieselbe Regel. */
    return (
      <>
      {leiste}
      <Kasten polster="p-5">
        <h2 className="text-[19px] font-black leading-snug text-white">{T.fGehaltBeide}</h2>
        <p className="mt-1 text-[13px] font-medium text-white/60">{T.fJetztHinweis}</p>
        <div className="mt-4 flex items-end gap-2.5">
          <Geldfeld titel={T.fJetztKurz} wert={jetzt} setzen={setJetzt} />
          <span className="pb-4 text-[18px] font-black text-white/35">→</span>
          <Geldfeld titel={T.fGehaltKurz} wert={gehalt} setzen={setGehalt} />
        </div>
        {/* EIN GRAUER KNOPF IST KEINE ANTWORT (Hausregel: Absagen sichtbar ans Feld).
            Wer „80" tippt, sieht sonst nur, dass es nicht weitergeht, und rät warum. */}
        {((jetzt !== "" && !okJetzt) || (gehalt !== "" && !okWunsch)) && (
          <Fehlerzeile>{T.gehaltSpanne}</Fehlerzeile>
        )}
        {/* Der Sprung, sobald beide Zahlen stehen — seine eigene Rechnung, nicht unsere Bewertung. */}
        {diff !== null && (
          <p className="mt-3 rounded-2xl border border-[#f6cf51]/35 lb-goldhauch px-4 py-2.5 text-center text-[13.5px] font-black text-white/90">
            {diff > 0 ? `+${diff.toLocaleString("de-DE")} €` : `${diff.toLocaleString("de-DE")} €`}
            <span className="ml-1.5 font-bold text-white/55">{T.sprungHinweis}</span>
          </p>
        )}
        <div className="mt-3">
          <Knopf art="gold" disabled={!okJetzt || !okWunsch}
            onClick={() => { void merken({ jetztGehalt: jetzt, wechselGehalt: gehalt }); setSchritt("faktoren"); }}>
            {T.weiter}
          </Knopf>
        </div>
      </Kasten>
      </>
    );
  }

  /* MEHRFACHWAHL — deshalb als Einzige mit einem Weiter-Knopf. Ohne Auswahl bleibt er
     stumm: Eine leere Antwort wäre kein Datensatz, sondern ein Loch in der Studie. */
  if (schritt === "faktoren") {
    const um = (w: string) => setFaktoren(f => f.includes(w) ? f.filter(x => x !== w) : [...f, w]);
    const OPT = [
      { wert: "salariu", text: T.faktorSalariu }, { wert: "remote", text: T.faktorRemote },
      { wert: "flexibilitate", text: T.faktorFlex }, { wert: "cariera", text: T.faktorCariera },
      { wert: "stabilitate", text: T.faktorStabil }, { wert: "echipa", text: T.faktorEchipa },
    ];
    return (
      <Frage titel={T.fFaktoren} hinweis={T.fFaktorenHinweis} zurueck="gehalt">
        <div className="mt-4 flex flex-col gap-2">
          {OPT.map(o => {
            const an = faktoren.includes(o.wert);
            /* EIN KÄSTCHEN LINKS, KEINE VOLLE FÜLLUNG (Owner 31.08.2026: „hier chckboxen").
               Alle anderen Fragen haben genau eine Antwort, und dort färbt sich die gewählte
               Kachel ganz. Sähe die Mehrfachwahl genauso aus, hielte man die erste Antwort
               für die letzte und tippte weiter — die Frage „Poți alege mai multe" stand zwar
               darüber, aber gelesen wird sie nicht.
               Das Kästchen sagt es ohne Text: hier darf man mehrere.
               Gewählt wechselt die FARBE, nicht die Grösse — sonst springt die Liste beim
               Antippen (Hausregel „Auswahl verschiebt NIE"). */
            return (
              <button key={o.wert} type="button" onClick={() => um(o.wert)} aria-pressed={an}
                className={`flex h-12 items-center gap-3 rounded-full border px-4 text-left text-[15px] font-black transition active:scale-[0.98] ${
                  an ? "border-[#f6cf51] bg-[#f6cf51]/10 text-[#f6cf51]" : "border-white/20 bg-white/5 text-white/90"}`}>
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-[6px] border-2 transition ${
                  an ? "border-[#f6cf51] bg-[#f6cf51]" : "border-white/35"}`}>
                  {an && <Check className="lb-haken h-3.5 w-3.5 text-black" strokeWidth={3.5} />}
                </span>
                {o.text}
              </button>
            );
          })}
        </div>
        <div className="mt-4">
          <Knopf art="gold" disabled={!faktoren.length}
            onClick={() => { void merken({ faktoren }); setSchritt(inDiaspora ? "rueckkehr" : "feld"); }}>
            {T.weiter}
          </Knopf>
        </div>
      </Frage>
    );
  }

  /* NUR FÜR DIE DIASPORA: Wer in Rumänien arbeitet, kann nicht zurückkehren — die Frage
     wäre dort nicht nur überflüssig, sondern unverständlich. */
  if (schritt === "rueckkehr") {
    return (
      <Frage titel={T.fRueckkehr} zurueck="faktoren">
        <Wahl
          optionen={[
            { wert: "da", text: T.rueckDa }, { wert: "poate", text: T.rueckPoate },
            { wert: "nu", text: T.rueckNu },
          ]}
          waehlen={w => { setRueckkehr(w); void merken({ rueckkehr: w }); setSchritt("feld"); }} />
      </Frage>
    );
  }

  /* DER BERUF WIRD GETIPPT (Owner 31.08.2026: „was arbeitest du auch eintippen oder noch
     besser was bist du vom beruf").
     Acht Kacheln waren für einen Recruiter fast wertlos: „Gesundheit / Pflege" kann die
     Chefärztin sein oder der Fahrer des Pflegedienstes. „Asistentă medicală" ist eine Person,
     mit der man reden kann.
     DIE KATEGORIE GEHT NICHT VERLOREN — sie wird auf dem Server aus dem Text abgeleitet
     (lib/joburi-beruf.ts, eine Stichwortliste, kein bezahltes Modell). Der Trichter schickt
     also nur, was der Mensch gesagt hat; einsortiert wird woanders.
     KEIN <Frage> um das Feld: siehe die Begründung beim Gehalt — ein in der Render-Funktion
     definierter Wrapper nimmt dem Eingabefeld bei jedem Tastendruck den Fokus. */
  if (schritt === "feld") {
    /* BEIDES IST PFLICHT (Owner 31.08.2026: „Abschuss ist pflicht … bis dahin ist weiter
       inaktiv"). Der Abschluss ist neben Deutschniveau und Beruf die dritte Angabe, nach der
       eine Firma filtert — fehlt er, ist die Zeile für einen Recruiter halb blind. Und er
       kostet keinen eigenen Schritt: Er steht auf derselben Seite wie der Beruf. */
    const fertig = feldFrei.trim().length >= 2 && !!studii;
    return (
      <>
      {leiste}
      <Kasten polster="p-5">
        <h2 className="text-[19px] font-black leading-snug text-white">{T.fBerufsfeld}</h2>
        <p className="mt-1 text-[13px] font-medium text-white/60">{T.fBerufHinweis}</p>
        <Eingabe className="mt-4" type="text" value={feldFrei} placeholder={T.feldFreiPlatzhalter}
          onChange={e => setFeldFrei(e.target.value.slice(0, 40))} />

        {/* Ein natives <select>: Auf dem Handy öffnet das den Systempicker — kein eigener
            Overlay-Dialog, der hier ohnehin nichts zu suchen hätte, und keine fünf weiteren
            Kacheln, die die Seite doppelt so lang machen. */}
        <p className="mt-4 text-[12px] font-black uppercase tracking-wide text-[#f6cf51]">{T.fStudii}</p>
        <select value={studii} onChange={e => setStudii(e.target.value)}
          className="mt-1.5 h-12 w-full rounded-2xl border border-white/20 bg-white/5 px-4 text-[15px] font-black text-white outline-none">
          <option value="" className="text-black">{T.studiiWaehlen}</option>
          <option value="gimnaziu" className="text-black">{T.studiiGimnaziu}</option>
          <option value="liceu" className="text-black">{T.studiiLiceu}</option>
          <option value="profesionala" className="text-black">{T.studiiProfesionala}</option>
          <option value="licenta" className="text-black">{T.studiiLicenta}</option>
          <option value="master" className="text-black">{T.studiiMaster}</option>
        </select>

        <div className="mt-3">
          <Knopf art="gold" disabled={!fertig}
            onClick={() => {
              setFeld(feldFrei.trim());
              void merken({ berufsfeldFrei: feldFrei.trim(), ...(studii ? { studii } : {}) });
              setSchritt("summe");
            }}>
            {T.weiter}
          </Knopf>
        </div>
      </Kasten>
      </>
    );
  }

  /* ── Die Zusammenfassung: NUR seine eigenen Antworten ──
     KEINE MARKTZAHL (Owner 31.08.2026: „Keine erfundenen Marktwerte oder Benchmarks
     anzeigen."). Wir haben noch keine Studie; eine Zahl an dieser Stelle wäre geraten, und
     genau daran zerbricht das Vertrauen, das der ganze Trichter aufbaut. Was wir zeigen
     können, ist er selbst — sauber zurückgespiegelt. */
  if (schritt === "summe") {
    /* Beide Gehaltszeilen holen ihren Text aus derselben Tabelle. Die alten Schlüssel stehen
       mit drin: Wer den Trichter vor der Umstellung begonnen hat, soll seine Antwort
       trotzdem lesbar zurückbekommen. */
    /* Eine getippte Zahl wird als Betrag gezeigt; ein alter Stufen-Schlüssel über dieselbe
       Übersetzung, die auch die Auswertung benutzt. */
    const alsBetrag = (v: string) => {
      const e = gehaltMitte(v);
      return e ? `${e.toLocaleString("de-DE")} €` : v;
    };
    const w: Record<string, string> = {
      land: { ro: T.landRo, de: T.landDe, at: T.landAt, alta: T.landAlta }[land] ?? land,
      suche: { aktiv: T.sucheAktiv, offen: T.sucheOffen, passiv: T.suchePassiv }[suche] ?? suche,
      gehalt: alsBetrag(gehalt),
      alter: { u25: T.alterU25, "25-34": T.alter2534, "35-44": T.alter3544,
               "45-54": T.alter4554, "55+": T.alter55p }[alter] ?? alter,
      jetzt: alsBetrag(jetzt),
      rueckkehr: { da: T.rueckDa, poate: T.rueckPoate, nu: T.rueckNu }[rueckkehr] ?? rueckkehr,
      /* Sein eigener Wortlaut, nicht unsere Schublade. */
      feld: feldFrei.trim() || feld,
      studii: { gimnaziu: T.studiiGimnaziu, liceu: T.studiiLiceu, profesionala: T.studiiProfesionala,
                licenta: T.studiiLicenta, master: T.studiiMaster }[studii] ?? studii,
      faktoren: faktoren.map(f => ({ salariu: T.faktorSalariu, remote: T.faktorRemote,
        flexibilitate: T.faktorFlex, cariera: T.faktorCariera, stabilitate: T.faktorStabil,
        echipa: T.faktorEchipa }[f] ?? f)).join(" · "),
    };
    const zeilen: [string, string][] = [
      [T.summeLand, w.land],
      ...(alter ? ([[T.summeAlter, w.alter]] as [string, string][]) : []),
      [T.summeDeutsch, deutsch],
      [T.summeStatus, w.suche],
      ...(jetzt ? ([[T.summeJetzt, w.jetzt]] as [string, string][]) : []),
      [T.summeGehalt, w.gehalt],
      [T.summeFaktoren, w.faktoren],
      ...(inDiaspora && rueckkehr ? ([[T.summeRueckkehr, w.rueckkehr]] as [string, string][]) : []),
      [T.summeFeld, w.feld],
      ...(studii ? ([[T.fStudii, w.studii]] as [string, string][]) : []),
    ];
    return (
      <div className="flex flex-col gap-3">
        {leiste}
        <Kasten polster="p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f6cf51]">{T.summeTitel}</p>
          <dl className="mt-3">
            {zeilen.map(([k, v], i) => (
              <div key={k} className={`flex items-baseline justify-between gap-4 py-2 ${i > 0 ? "border-t border-white/12" : ""}`}>
                <dt className="shrink-0 text-[12.5px] font-bold text-white/60">{k}</dt>
                <dd className="text-right text-[13.5px] font-black text-white/90">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[12.5px] font-medium leading-snug text-white/55">{T.summeHinweis}</p>
        </Kasten>
        <Knopf art="gold" onClick={() => setSchritt("mail")}>{T.studieKnopf}</Knopf>
      </div>
    );
  }

  /* ── Die Adresse — und NUR sie ──
     Kein Name, kein Telefon, kein Lebenslauf (Owner 31.08.2026). Die Einwilligung ist
     dieselbe wie bisher, samt der Zusage darunter, dass nichts automatisch an Arbeitgeber
     geht — das ist die Sorge, mit der jemand seine Adresse zurückhält. */
  if (schritt === "mail") {
    return (
      <>
      {leiste}
      <Kasten polster="p-5">
        <h2 className="text-[19px] font-black leading-snug text-white">{T.mailStudieTitel}</h2>
        <p className="mt-1.5 text-[13.5px] font-medium leading-relaxed text-white/75">{T.mailStudieText}</p>

        {/* DREI GRÜNDE STATT EINER FRAGE — und jeder von ihnen hält, was er sagt.
            Der zweite steht bewusst in der Zukunftsform: Das Arbeitgeber-Netz entsteht
            gerade, es steht noch nicht. So geschrieben ist es wahr und trotzdem ein Grund. */}
        <ul className="mt-3.5 flex flex-col gap-2">
          {[T.grund1, T.grund2, T.grund3].map(g => (
            <li key={g} className="flex items-start gap-2.5">
              <Check className="mt-[3px] h-4 w-4 shrink-0 text-[#f6cf51]" />
              <span className="text-[13px] font-bold leading-snug text-white/80">{g}</span>
            </li>
          ))}
        </ul>

        <label className="mt-4 block text-[12px] font-black uppercase tracking-wide text-[#f6cf51]">{T.mailLabel}</label>
        <Eingabe className="mt-1.5" type="email" inputMode="email" value={mail} symbol={<Mail className="h-4 w-4" />}
          onChange={e => { setMail(e.target.value); setFehler(""); }} placeholder={T.mailPlatzhalter} />
        <p className="mt-1.5 text-[12px] font-medium text-white/45">{T.mailKeinSpam}</p>

        <div className="mt-4">
          <Haken an={haken} setzen={setHaken} pflicht>{T.haken}</Haken>
        </div>
        <p className="mt-2 text-[12.5px] font-black leading-snug text-white/85">{T.datenschutzZusage}</p>

        <Fehlerzeile>{fehler}</Fehlerzeile>
        <div className="mt-3">
          {busy ? <Fortschritt text={T.mailLaeuft} /> : <Knopf art="gold" onClick={() => void kontaktSenden()}>{T.studieKnopf}</Knopf>}
        </div>
      </Kasten>
      </>
    );
  }

  /* ── Danke — kein Versprechen, das ein leerer Bestand brechen könnte ── */
  return (
    <div className="flex flex-col gap-4">
      <Kasten art="gold" polster="p-5">
        <p className="flex items-start gap-2.5 text-[16px] font-black leading-snug text-white">
          <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#f6cf51]" />
          {T.dankeTitelStudie}
        </p>
        <p className="mt-2 text-[13.5px] font-medium leading-relaxed text-white/80">{T.dankeTextStudie}</p>
      </Kasten>

      {/**
        * DAS ANGEBOT DANACH (Owner 31.08.2026: „das geht jetzt, also als Cross-Selling
        * einbauen auf der letzten Seite").
        *
        * WARUM HIER UND NICHT FRÜHER: Wer gerade beantwortet hat, zu welchen Bedingungen er
        * wechseln würde, steht genau an dem Punkt, an dem ein deutscher Lebenslauf gebraucht
        * wird. Neben dem E-Mail-Knopf hätte es die Studie gekostet — zwei Aufforderungen auf
        * einem Bildschirm kosten immer die wichtigere. Hier ist die Antwort gespeichert, es
        * wird nichts mehr abgefragt, und das Angebot nimmt niemandem etwas weg.
        *
        * ES VERSPRICHT NUR, WAS GRATIS IST: Die Muster-Fassung kostet nichts und darf
        * verschickt werden (Hausregel `gratis-nur-mit-muster`). Ein Preis an dieser Stelle
        * wäre eine Mautstelle direkt hinter dem Dankeschön.
        *
        * Der stille Umriss-Knopf ist Absicht: Die Studie hatte das Gold, dieser Schritt ist
        * das Angebot danach, nicht der Hauptweg.
        */}
      <Kasten polster="p-5">
        <p className="text-[15.5px] font-black leading-snug text-white">{T.crossTitel}</p>
        <p className="mt-1.5 text-[13.5px] font-medium leading-relaxed text-white/75">{T.crossText}</p>
        <div className="mt-3">
          <Knopf art="umriss" href="/themes/deutscher-lebenslauf"
            onClick={() => void logFunnelEvent("joburi_cross_cv", { ziel: "deutscher-lebenslauf" })}>
            {T.crossKnopf}
          </Knopf>
        </div>
      </Kasten>
    </div>
  );
}
