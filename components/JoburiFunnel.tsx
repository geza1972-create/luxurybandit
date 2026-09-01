"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Mail } from "lucide-react";
import { Knopf, Kasten, Eingabe, Fehlerzeile, Fortschritt, Haken } from "@/components/CI";
import { logFunnelEvent, logTunnelEvent } from "@/lib/track-funnel";
import type { JoburiTexte } from "@/lib/joburi-texte";
import { gehaltMitte, waehrungFuerLand, gehaltGrenzen, type Waehrung } from "@/lib/joburi-gehalt";

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

/**
 * DIE ACHT SCHRITTE DES TALENT NETWORK (Owner-Freigabe 31.08.2026).
 *
 * Reihenfolge ist Absicht: Der Beruf steht vorn, weil er die leichteste Frage ist und
 * niemanden ausschliesst; das Geld steht hinten, weil man es erst preisgibt, wenn man schon
 * ein paar Antworten investiert hat. Ganz zuletzt die Gesprächsbereitschaft — sie liest sich
 * nach den eigenen Bedingungen wie eine Schlussfolgerung und nicht wie eine Bewerbung.
 *
 * WAS HIER NICHT MEHR STEHT: `alter` und `studii` sind in die zweite Ebene gewandert
 * (Profil vervollständigen), `rueckkehr` geht in `maerkte` auf. Der Vorbehalt zum Alter
 * bleibt bestehen: Solange die Meta-Anzeige auf 25–54 begrenzt ist, lässt sich ohne diese
 * Frage nicht prüfen, ob die Grenze richtig gesetzt war.
 */
type Schritt =
  | "beruf" | "deutsch" | "standort" | "situation"
  | "motive" | "geld" | "maerkte" | "gespraech"
  | "summe" | "mail" | "danke";

/** Nur Ziffern, höchstens fünf — „2.500" und „25oo" sind Vertipper, keine Beträge. */
const nurZiffern = (v: string) => v.replace(/[^\d]/g, "").slice(0, 6);

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
function Geldfeld({ titel, wert, setzen, waehrung }: {
  titel: string; wert: string; setzen: (v: string) => void; waehrung: Waehrung;
}) {
  return (
    <div className="min-w-0 flex-1">
      <p className="mb-1.5 text-[12.5px] font-bold leading-snug text-white/60">{titel}</p>
      {/* <label> und nicht <div>: Erstens greift die Blau-Regel der hellen Fassung nur auf
          Knöpfe, Links, Labels und Auswahlfelder (app/globals.css) — als div blieb das Feld
          als Einziges grau. Zweitens setzt ein Tipp auf den Rahmen so den Cursor ins Feld,
          statt ins Leere zu gehen. */}
      <label className="flex h-14 items-center gap-1 rounded-2xl border border-white/20 bg-white/5 px-3">
        <input
          type="text" inputMode="numeric" pattern="[0-9]*" value={wert} placeholder="0"
          onChange={e => setzen(nurZiffern(e.target.value))}
          className="w-full min-w-0 bg-transparent text-center text-[21px] font-black text-white outline-none placeholder:text-white/25" />
        <span className="shrink-0 text-[14px] font-black text-white/45">{waehrung === "RON" ? "RON" : "€"}</span>
      </label>
    </div>
  );
}

export default function JoburiFunnel({ T, lang, kopf }: { T: JoburiTexte; lang: string; kopf?: React.ReactNode }) {
  const [schritt, setSchritt] = useState<Schritt>("beruf");
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

  const [beruf, setBeruf] = useState("");
  const [deutsch, setDeutsch] = useState("");
  const [land, setLand] = useState("");
  const [stadt, setStadt] = useState("");
  const [situation, setSituation] = useState("");
  const [motive, setMotive] = useState<string[]>([]);
  /* Die drei Angaben des Geldschritts. `gleich` ist die wichtigste: Sie macht aus einem
     Aufschlag von null eine Aussage statt eines Nullwerts. */
  const [jetzt, setJetzt] = useState("");
  const [minimum, setMinimum] = useState("");
  const [gleich, setGleich] = useState("");
  const [maerkte, setMaerkte] = useState<string[]>([]);
  const [gespraech, setGespraech] = useState("");

  /* Wie weit er schon war — der Vor-Pfeil darf nie über unbeantwortete Fragen springen. */
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
  const REIHE: Schritt[] = [
    "beruf", "deutsch", "standort", "situation",
    "motive", "geld", "maerkte", "gespraech",
    "summe", "mail",
  ];
  const pos = REIHE.indexOf(schritt);
  /** Wie viele davon echte Fragen sind — „summe" und „mail" zählen nicht mit. */
  const FRAGEN = REIHE.length - 2;

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
          style={{ width: `${Math.min(100, Math.round(((pos + 1) / FRAGEN) * 100))}%` }} />
      </div>
      <button type="button" onClick={() => geheZu(pos + 1)} disabled={pos >= weitester} aria-label={T.weiter}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/20 bg-white/5 text-[15px] font-black text-white/80 transition active:scale-90 disabled:opacity-25">→</button>
      {/* Gezählt werden die acht FRAGEN, nicht die zehn Bildschirme: Der Kopf verspricht
          „8 Fragen", und ein Zähler, der bis 10 läuft, macht aus dem Versprechen eine
          Ungenauigkeit. Zusammenfassung und Adresse sind keine Fragen — dort steht keine
          Zahl mehr, sondern nichts. */}
      {pos < FRAGEN && (
        <span className="shrink-0 text-[12px] font-black tabular-nums text-white/45">{pos + 1}/{FRAGEN}</span>
      )}
    </div>
  );

  /* Der Kopf nur über der ersten Frage — ab der zweiten steht dort die Leiste. */
  const kopfBlock = schritt === "beruf" && kopf ? <div className="mb-5">{kopf}</div> : null;

  /* ─────────────────────────── Die acht Fragen ─────────────────────────── */

  /* 1 · BERUF. Steht vorn, weil es die leichteste Frage ist: Jeder kann sie beantworten,
     niemand fühlt sich davon ausgeschlossen, und sie verrät noch nichts Heikles. */
  if (schritt === "beruf") {
    return (
      <>
        {kopfBlock}
        <Kasten polster="p-5">
          <h2 className="text-[19px] font-black leading-snug text-white">{T.tnBeruf}</h2>
          <p className="mt-1 text-[13px] font-medium text-white/60">{T.tnBerufHinweis}</p>
          <Eingabe className="mt-4" type="text" value={beruf} placeholder={T.tnBerufPlatz}
            onChange={e => setBeruf(e.target.value.slice(0, 40))} />
          <div className="mt-3">
            <Knopf art="gold" disabled={beruf.trim().length < 2}
              onClick={() => { void merken({ beruf: beruf.trim() }); setSchritt("deutsch"); }}>{T.weiter}</Knopf>
          </div>
        </Kasten>
      </>
    );
  }

  /* 2 · DEUTSCH — mit „muttersprachlich" als sechster Stufe (Owner-Freigabe). */
  if (schritt === "deutsch") {
    return (
      <Frage titel={T.tnDeutsch}>
        <Wahl
          optionen={[
            { wert: "a2", text: T.niveauA2 }, { wert: "b1", text: T.niveauB1 },
            { wert: "b2", text: T.niveauB2 }, { wert: "c1", text: T.niveauC1 },
            { wert: "c2", text: T.niveauC2 }, { wert: "native", text: T.niveauNative },
          ]}
          waehlen={w => { setDeutsch(w); void merken({ deutschniveau: w }); setSchritt("standort"); }} />
      </Frage>
    );
  }

  /* 3 · STANDORT. Die Stadt ist neu und für einen Recruiter oft wichtiger als das Land —
     „Timișoara" ist eine Suche, „Rumänien" ist keine. Sie entscheidet ausserdem die
     Währung im Geldschritt. */
  if (schritt === "standort") {
    const STAEDTE = ["Timișoara", "Cluj-Napoca", "București", "Brașov", "Sibiu", "Iași", "Oradea", "Arad"];
    return (
      <>
        {leiste}
        <Kasten polster="p-5">
          <h2 className="text-[19px] font-black leading-snug text-white">{T.tnStandort}</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[{ wert: "ro", text: T.landRo }, { wert: "de", text: T.landDe },
              { wert: "at", text: T.landAt }, { wert: "alta", text: T.landAlta }].map(o => {
              const an = land === o.wert;
              return (
                <button key={o.wert} type="button" onClick={() => setLand(o.wert)}
                  className={`h-12 rounded-full border px-4 text-[14.5px] font-black transition active:scale-[0.98] ${
                    an ? "border-[#f6cf51] bg-[#f6cf51] text-black" : "border-white/20 bg-white/5 text-white/90"}`}>
                  {o.text}
                </button>
              );
            })}
          </div>
          {land && (
            <>
              <p className="mt-4 text-[12px] font-black uppercase tracking-wide text-[#f6cf51]">{T.tnStadt}</p>
              <Eingabe className="mt-1.5" type="text" value={stadt} placeholder={T.tnStadtPlatz}
                onChange={e => setStadt(e.target.value.slice(0, 40))} />
              {/* Vorschläge nur für Rumänien — anderswo raten wir nicht, welche Stadt gemeint
                  sein könnte, und eine falsche Liste ist schlimmer als keine. */}
              {land === "ro" && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {STAEDTE.map(o => (
                    <button key={o} type="button" onClick={() => setStadt(o)}
                      className={`rounded-full border px-3 py-1 text-[12.5px] font-bold transition active:scale-95 ${
                        stadt === o ? "border-[#f6cf51] bg-[#f6cf51] text-black" : "border-white/20 bg-white/5 text-white/70"}`}>
                      {o}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-3">
                <Knopf art="gold" disabled={stadt.trim().length < 2}
                  onClick={() => { void merken({ land, stadt: stadt.trim() }); setSchritt("situation"); }}>{T.weiter}</Knopf>
              </div>
            </>
          )}
        </Kasten>
      </>
    );
  }

  /* 4 · SITUATION. Sechs Antworten statt der bisherigen drei — und keine davon schliesst
     jemanden aus. Wertvoll sind die ersten beiden, aber wer aktiv sucht oder ohne Job ist,
     wird deshalb nicht abgewiesen. */
  if (schritt === "situation") {
    return (
      <Frage titel={T.tnSituation}>
        <Wahl
          optionen={[
            { wert: "employed_satisfied", text: T.sitZufrieden },
            { wert: "employed_open", text: T.sitOffen },
            { wert: "actively_searching", text: T.sitAktiv },
            { wert: "unemployed", text: T.sitOhne },
            { wert: "self_employed", text: T.sitSelbst },
            { wert: "other", text: T.sitAndere },
          ]}
          waehlen={w => { setSituation(w); void merken({ situation: w }); setSchritt("motive"); }} />
      </Frage>
    );
  }

  /* 5 · WECHSELMOTIVE. Vierzehn Kästchen, bewusst nicht wertend formuliert: „weniger Stress"
     steht gleichberechtigt neben „mehr Gehalt". Genau diese Liste erklärt später, WARUM
     jemand wechseln würde, der kein höheres Gehalt verlangt. */
  if (schritt === "motive") {
    const um = (w: string) => setMotive(f => f.includes(w) ? f.filter(x => x !== w) : [...f, w]);
    const OPT = [
      { wert: "salary", text: T.mSalariu }, { wert: "employer", text: T.mAngajator },
      { wert: "management", text: T.mConducere }, { wert: "less_stress", text: T.mStres },
      { wert: "hours", text: T.mProgram }, { wert: "remote", text: T.mRemote },
      { wert: "position", text: T.mPozitie }, { wert: "work_itself", text: T.mActivitate },
      { wert: "career", text: T.mCariera }, { wert: "culture", text: T.mCultura },
      { wert: "security", text: T.mSiguranta }, { wert: "germany", text: T.mGermania },
      { wert: "benefits", text: T.mBeneficii }, { wert: "other", text: T.mAltele },
    ];
    return (
      <Frage titel={T.tnMotive} hinweis={T.tnMotiveHinweis}>
        <div className="mt-4 flex flex-col gap-2">
          {OPT.map(o => {
            const an = motive.includes(o.wert);
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
          <Knopf art="gold" disabled={!motive.length}
            onClick={() => { void merken({ motive }); setSchritt("geld"); }}>{T.weiter}</Knopf>
        </div>
      </Frage>
    );
  }

  /* 6 · DER GELDSCHRITT — EIN MOMENT, DREI ANGABEN (Owner-Freigabe 31.08.2026).
     Beide Beträge auf einer Karte, darunter die Frage, die den Rest erklärt.
     DER MINDESTBETRAG DARF GLEICH ODER NIEDRIGER SEIN: „Ein Jobwechsel ist nicht automatisch
     an ein höheres Gehalt gebunden." Eine Prüfung „muss höher sein" hätte genau die
     Kandidaten abgewiesen, die am interessantesten sind. */
  if (schritt === "geld") {
    const w = waehrungFuerLand(land);
    const G = gehaltGrenzen(w);
    const n = (v: string) => Number(v);
    const okJetzt = jetzt !== "" && n(jetzt) >= G.min && n(jetzt) <= G.max;
    const okMin = minimum !== "" && n(minimum) >= G.min && n(minimum) <= G.max;
    const diff = okJetzt && okMin ? n(minimum) - n(jetzt) : null;
    const prozent = diff !== null && n(jetzt) > 0 ? Math.round((diff / n(jetzt)) * 100) : null;
    return (
      <>
        {leiste}
        <Kasten polster="p-5">
          <h2 className="text-[19px] font-black leading-snug text-white">{T.tnGeld}</h2>
          <p className="mt-1 text-[13px] font-medium text-white/60">{T.tnGeldHinweis}</p>

          <div className="mt-4 flex flex-col gap-3">
            <Geldfeld titel={T.tnGeldJetzt} wert={jetzt} setzen={setJetzt} waehrung={w} />
            <Geldfeld titel={T.tnGeldMin} wert={minimum} setzen={setMinimum} waehrung={w} />
          </div>

          {((jetzt !== "" && !okJetzt) || (minimum !== "" && !okMin)) && (
            <Fehlerzeile>{`${G.min.toLocaleString("de-DE")} – ${G.max.toLocaleString("de-DE")} ${w}`}</Fehlerzeile>
          )}

          {/* DIE FRAGE, DIE AUS EINER NULL EINE AUSSAGE MACHT. Ohne sie stünde bei gleichem
              Betrag „+0 %" — und ein wechselbereiter Mensch sähe aus wie ein unwilliger. */}
          {okJetzt && okMin && (
            <>
              <p className="mt-4 text-[13.5px] font-bold leading-snug text-white/80">{T.tnGleich}</p>
              <div className="mt-2 flex flex-col gap-2">
                {[{ wert: "yes", text: T.gleichJa },
                  { wert: "depends", text: T.gleichVielleicht },
                  { wert: "no", text: T.gleichNein }].map(o => {
                  const an = gleich === o.wert;
                  return (
                    <button key={o.wert} type="button" onClick={() => setGleich(o.wert)}
                      className={`h-11 rounded-full border px-4 text-left text-[14px] font-black transition active:scale-[0.98] ${
                        an ? "border-[#f6cf51] bg-[#f6cf51] text-black" : "border-white/20 bg-white/5 text-white/90"}`}>
                      {o.text}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Die Ergebniszeile spricht drei Fälle aus — nie eine nackte Prozentzahl. */}
          {diff !== null && gleich && (
            <p className="mt-3 rounded-2xl border border-[#f6cf51]/35 lb-goldhauch px-4 py-2.5 text-center text-[14px] font-black text-white/90">
              {diff > 0
                ? `+${diff.toLocaleString("de-DE")} ${w}${prozent !== null ? ` · +${prozent} %` : ""}`
                : diff === 0 ? T.sprungGleich : T.sprungWeniger}
            </p>
          )}

          <div className="mt-3">
            <Knopf art="gold" disabled={!okJetzt || !okMin || !gleich}
              onClick={() => {
                void merken({ gehaltJetzt: jetzt, gehaltMinimum: minimum, waehrung: w, gleichesGehalt: gleich });
                setSchritt("maerkte");
              }}>{T.weiter}</Knopf>
          </div>
        </Kasten>
      </>
    );
  }

  /* 7 · ZIELMÄRKTE. Ersetzt die alte Rückkehr-Frage — sie war ein Sonderfall dessen, was
     hier vollständig steht. „Ich möchte nicht umziehen" ist bewusst eine Option und keine
     eigene Frage: Auch das ist eine Bedingung. */
  if (schritt === "maerkte") {
    const um = (w: string) => setMaerkte(f => f.includes(w) ? f.filter(x => x !== w) : [...f, w]);
    const OPT = [
      { wert: "romania", text: T.marktRo }, { wert: "germany", text: T.marktDe },
      { wert: "remote", text: T.marktRemote }, { wert: "eu", text: T.marktEu },
      { wert: "relocate_ro", text: T.marktUmzug }, { wert: "no_relocation", text: T.marktKeinUmzug },
    ];
    return (
      <Frage titel={T.tnMaerkte} hinweis={T.tnMaerkteHinweis}>
        <div className="mt-4 flex flex-col gap-2">
          {OPT.map(o => {
            const an = maerkte.includes(o.wert);
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
          <Knopf art="gold" disabled={!maerkte.length}
            onClick={() => { void merken({ maerkte }); setSchritt("gespraech"); }}>{T.weiter}</Knopf>
        </div>
      </Frage>
    );
  }

  /* 8 · DIE GESPRÄCHSBEREITSCHAFT. Sie steht zuletzt, weil sie sich nach den eigenen
     Bedingungen wie eine Schlussfolgerung liest — und nicht wie eine Bewerbung. */
  if (schritt === "gespraech") {
    return (
      <Frage titel={T.tnGespraech}>
        <Wahl
          optionen={[
            { wert: "yes", text: T.gesprJa }, { wert: "probably", text: T.gesprWahrsch },
            { wert: "maybe", text: T.gesprViell }, { wert: "not_now", text: T.gesprNein },
          ]}
          waehlen={w => { setGespraech(w); void merken({ gespraech: w }); setSchritt("summe"); }} />
      </Frage>
    );
  }

  /* ── DIE WECHSELBEDINGUNGEN — SEINE ANTWORTEN, SONST NICHTS ──
     Keine Marktzahl, keine Einschätzung, ob der Betrag realistisch ist (Owner: „Keine
     erfundenen Jobmarktwerte. Keine Behauptung, dass dieses Gehalt realistisch ist.").
     Was hier steht, hat er selbst gesagt — und genau deshalb glaubt er es. */
  if (schritt === "summe") {
    const w = waehrungFuerLand(land);
    const geldText = (() => {
      const j = Number(jetzt), m = Number(minimum);
      if (!j || !m) return "—";
      const d = m - j;
      const p = j > 0 ? Math.round((d / j) * 100) : null;
      if (d > 0) return `${m.toLocaleString("de-DE")} ${w} · +${p} %`;
      if (d === 0) return `${m.toLocaleString("de-DE")} ${w} · ${T.sprungGleich}`;
      return `${m.toLocaleString("de-DE")} ${w} · ${T.sprungWeniger}`;
    })();
    const NAME_SIT: Record<string, string> = {
      employed_satisfied: T.sitZufrieden, employed_open: T.sitOffen, actively_searching: T.sitAktiv,
      unemployed: T.sitOhne, self_employed: T.sitSelbst, other: T.sitAndere,
    };
    const NAME_MOTIV: Record<string, string> = {
      salary: T.mSalariu, employer: T.mAngajator, management: T.mConducere, less_stress: T.mStres,
      hours: T.mProgram, remote: T.mRemote, position: T.mPozitie, work_itself: T.mActivitate,
      career: T.mCariera, culture: T.mCultura, security: T.mSiguranta, germany: T.mGermania,
      benefits: T.mBeneficii, other: T.mAltele,
    };
    const NAME_MARKT: Record<string, string> = {
      romania: T.marktRo, germany: T.marktDe, remote: T.marktRemote,
      eu: T.marktEu, relocate_ro: T.marktUmzug, no_relocation: T.marktKeinUmzug,
    };
    const NAME_GESPR: Record<string, string> = {
      yes: T.gesprJa, probably: T.gesprWahrsch, maybe: T.gesprViell, not_now: T.gesprNein,
    };
    const NAME_LAND: Record<string, string> = { ro: T.landRo, de: T.landDe, at: T.landAt, alta: T.landAlta };

    const zeilen: [string, string][] = [
      [T.tnSummeBeruf, beruf.trim() || "—"],
      [T.tnSummeDeutsch, deutsch === "native" ? T.niveauNative : deutsch.toUpperCase()],
      [T.tnSummeOrt, [stadt.trim(), NAME_LAND[land]].filter(Boolean).join(", ")],
      [T.tnSummeSituation, NAME_SIT[situation] ?? "—"],
      [T.tnSummeMotive, motive.map(m => NAME_MOTIV[m] ?? m).join(" · ")],
      [T.tnSummeGeld, geldText],
      [T.tnSummeMaerkte, maerkte.map(m => NAME_MARKT[m] ?? m).join(" · ")],
      [T.tnSummeGespraech, NAME_GESPR[gespraech] ?? "—"],
    ];
    return (
      <div className="flex flex-col gap-3">
        {leiste}
        <Kasten polster="p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f6cf51]">{T.tnSummeTitel}</p>
          <dl className="mt-3">
            {zeilen.map(([k, v], i) => (
              <div key={k} className={`flex items-baseline justify-between gap-4 py-2 ${i > 0 ? "border-t border-white/12" : ""}`}>
                <dt className="shrink-0 text-[12.5px] font-bold text-white/60">{k}</dt>
                <dd className="text-right text-[13.5px] font-black text-white/90">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[12.5px] font-medium leading-snug text-white/55">{T.tnSummeSchluss}</p>
        </Kasten>
        <Knopf art="gold" onClick={() => setSchritt("mail")}>{T.tnSummeKnopf}</Knopf>
      </div>
    );
  }

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
