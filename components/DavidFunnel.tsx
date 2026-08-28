"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { FileText, Upload, Check } from "lucide-react";
import { Eingabe, EingabeMehrzeilig, Knopf, Fehlerzeile, Fortschritt, Haken, Kasten } from "@/components/CI";
import { logFunnelEvent, logTunnelEvent } from "@/lib/track-funnel";
import type { DavidTunnelTexte } from "@/lib/david-tunnel-texte";
import DavidReportAnsicht from "@/components/DavidReportAnsicht";
import DavidAngebote from "@/components/DavidAngebote";
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
  | "name" | "mail" | "cv" | "job" | "uebergang"
  | "gespraech" | "analyse" | "bericht"
  | "feedback" | "interessen" | "kritik" | "updates" | "danke";

type Zeile = { von: "david" | "ich"; text: string };

const ABLAGE = "lb_david_entwurf";

export default function DavidFunnel({ S, lang, preisUnterlagen, preisVideo, beispielCv, beispielVideo, inhalt }: {
  S: DavidTunnelTexte;
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
  const mailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail.trim());
  const name = vorname.trim();
  const mitNamen = (t: string) => t.replace("{name}", name || "");

  /* Die Kennung entsteht sofort — sie ist zugleich die Kennung der David-Sitzung UND die
     des Bewerbungs-Auftrags beim Resume-Generator. Genau deshalb muss der Nutzer später
     Lebenslauf und Anzeige nicht noch einmal eingeben (Owner §24). */
  useEffect(() => {
    if (genId) return;
    void (async () => {
      try {
        const log = await fetch("/api/kiss-log", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: "david", device: geraet() }),
        }).then(r => r.json());
        if (log?.id) setGenId(String(log.id));
      } catch { /* ohne Kennung geht es erst beim Weiter-Tippen wieder */ }
    })();
    void logFunnelEvent("start_clicked", { theme: "david" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: genId, device: geraet(), sprache: lang, ...felder }),
      }).then(r => r.json());
      if (d?.error) { setFehler(String(d.error)); return null; }
      return d;
    } catch { setFehler("Das hat gerade nicht geklappt. Versuch es bitte noch einmal."); return null; }
  };

  const screening = async (koerper: Record<string, unknown>) => {
    const d = await fetch("/api/david-screening", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: genId, device: geraet(), ...koerper }),
    }).then(r => r.json());
    return d as Record<string, any>;
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
      const ext = (f.name.split(".").pop() || "bin").toLowerCase();
      const signiert = await fetch("/api/lebenslauf-video-url", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extension: ext }),
      }).then(r => r.json());
      if (!signiert?.uploadUrl || !signiert?.path) throw new Error("upload");
      const put = await fetch(signiert.uploadUrl, {
        method: "PUT", headers: { "Content-Type": f.type || "application/octet-stream", "x-upsert": "true" }, body: f,
      });
      if (!put.ok) throw new Error("upload");
      setCvPath(signiert.path); setCvName(f.name);
      void logFunnelEvent("cv_uploaded", { theme: "david" });

      const d = await screening({ schritt: "cv", cvPath: signiert.path, cvName: f.name });
      if (d?.error) { setFehler(String(d.error)); setBusy(false); setBusyText(""); return; }
      const beobachtet: string[] = Array.isArray(d.beobachtungen) ? d.beobachtungen : [];
      if (Array.isArray(d.schwerpunkte)) setSchwerpunkte(d.schwerpunkte.map(String));
      if (["gut", "mittel", "schwach"].includes(String(d.layout))) setLayout(d.layout);
      if (typeof d.foto === "boolean") setCvFoto(d.foto);
      setVerlauf(v => [...v, { von: "david", text: beobachtet.join(" ") || S.cvText }]);
      setBusy(false); setBusyText(""); setPhase("job");
    } catch {
      setFehler(S.cvFehler); setBusy(false); setBusyText("");
    }
  };

  /* ── Schritt 4: die Stellenanzeige ────────────────────────────────────────── */
  const jobSenden = async () => {
    if (anzeige.trim().length < 60) { setFehler(S.jobKurz); return; }
    setFehler(""); setBusy(true); setBusyText(S.jobLaeuft);
    const d = await screening({ schritt: "job", jobText: anzeige.trim() });
    setBusy(false); setBusyText("");
    if (d?.error) { setFehler(String(d.error)); return; }
    void logFunnelEvent("job_added", { theme: "david" });
    setJobTitel(String(d.jobTitel ?? "")); setJobOrt(String(d.jobOrt ?? "")); setJobArt(String(d.jobArt ?? ""));
    setFrage(String(d.ersteFrage ?? ""));
    setPhase("uebergang");
  };

  /* ── Schritt 5: das Gespräch ──────────────────────────────────────────────── */
  const antwortSenden = async () => {
    const a = antwort.trim();
    if (a.length < 2) { setFehler(S.antwortFehlt); return; }
    setFehler(""); setBusy(true); setBusyText("");
    setVerlauf(v => [...v, { von: "david", text: frage }, { von: "ich", text: a }]);
    setAntwort("");
    const d = await screening({ schritt: "antwort", antwort: a });
    setBusy(false);
    if (d?.error) { setFehler(String(d.error)); return; }
    if (d.reaktion) setVerlauf(v => [...v, { von: "david", text: String(d.reaktion) }]);
    if (d.fertig) {
      setFrage("");
      void logFunnelEvent("screening_completed", { theme: "david" });
      setPhase("analyse");
      void berichtHolen();
      return;
    }
    setFrage(String(d.naechsteFrage ?? ""));
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
  const davidSagt = (text: string, klein = false) => (
    <p className={`${klein ? "text-[14px]" : "text-[15.5px]"} font-semibold leading-relaxed text-white/90`}>{text}</p>
  );

  const ladeZeilen = [S.cvLaden1, S.cvLaden2, S.cvLaden3];
  const analyseZeilen = [S.analyse1, S.analyse2, S.analyse3, S.analyse4];

  return (
    <div className="mt-4 flex flex-col gap-4">
      {/* ── DER VERLAUF — was David gesagt und was der Bewerber geantwortet hat. Er steht
             über allem, damit das Gespräch als Gespräch lesbar bleibt. ── */}
      {verlauf.length > 0 && phase !== "danke" && (
        <div className="flex flex-col gap-2">
          {verlauf.slice(-6).map((z, i) => (
            <div key={i} className={z.von === "david"
              ? "rounded-2xl border border-white/15 bg-white/[0.05] px-4 py-3"
              : "rounded-2xl border border-[#f6cf51]/30 lb-goldhauch px-4 py-3"}>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f6cf51]">
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
          {davidSagt(S.hallo)}
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
          {davidSagt(mitNamen(S.mailTitel))}
          <p className="mt-2 text-[15px] font-medium leading-relaxed text-white/80">{S.mailText}</p>
          <label className="mt-4 block text-[12px] font-black uppercase tracking-wide text-[#f6cf51]">{S.mailLabel}</label>
          <Eingabe className="mt-1.5" type="email" inputMode="email" value={mail}
            onChange={e => setMail(e.target.value)} placeholder={S.mailPlatzhalter} autoComplete="email" />
          {/* Der Hinweis steht DIREKT am Feld, nicht im Fuss — dort, wo die Daten entstehen. */}
          <p className="mt-4 text-[12.5px] font-medium leading-snug text-white/70">
            {S.datenschutz.replace(" Mehr dazu findest du in unserer Datenschutzerklärung.", "")}{" "}
            <a href="/privacy" target="_blank" rel="noreferrer" className="font-black text-[#f6cf51] underline underline-offset-2">
              {S.datenschutzLink}
            </a>
          </p>
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
          {davidSagt(mitNamen(S.cvTitel))}
          <p className="mt-2 text-[15px] font-medium leading-relaxed text-white/80">{S.cvText}</p>
          {busy ? (
            <div className="mt-4"><Fortschritt text={ladeZeilen[tick % ladeZeilen.length] || busyText} /></div>
          ) : (
            <>
              <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-white/25 px-3 py-6 text-center transition active:scale-[0.98]">
                <Upload className="h-5 w-5 text-[#f6cf51]" />
                <span className="text-[14px] font-black text-white/90">{S.cvKnopf}</span>
                <span className="text-[12px] font-bold text-white/60">{S.cvHinweis}</span>
                <input type="file" accept=".pdf,.doc,.docx,application/pdf" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) void cvWaehlen(f); }} />
              </label>
              <Fehlerzeile>{fehler}</Fehlerzeile>
            </>
          )}
        </Kasten>
      )}

      {/* ── 4 · DIE STELLE ── */}
      {phase === "job" && (
        <Kasten polster="p-5">
          {davidSagt(S.jobText)}
          {busy ? (
            <div className="mt-4"><Fortschritt text={[S.jobLaden1, S.jobLaden2, S.jobLaden3][tick % 3] || busyText} /></div>
          ) : (
            <>
              <EingabeMehrzeilig className="mt-3" zeilen={7} value={anzeige}
                onChange={e => setAnzeige(e.target.value)} placeholder={S.jobPlatzhalter} />
              <Fehlerzeile>{fehler}</Fehlerzeile>
              <div className="mt-3"><Knopf art="gold" onClick={() => void jobSenden()}>{S.weiter}</Knopf></div>
            </>
          )}
        </Kasten>
      )}

      {/* ── 5 · ÜBERGANG INS GESPRÄCH ── */}
      {phase === "uebergang" && (
        <Kasten polster="p-5">
          {davidSagt(S.uebergang)}
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
          {davidSagt(frage)}
          {busy ? (
            <div className="mt-4"><Fortschritt text={S.davidDenkt} /></div>
          ) : (
            <>
              <EingabeMehrzeilig className="mt-3" zeilen={4} value={antwort}
                onChange={e => setAntwort(e.target.value)} placeholder={S.antwortPlatzhalter} />
              <Fehlerzeile>{fehler}</Fehlerzeile>
              <div className="mt-3"><Knopf art="gold" onClick={() => void antwortSenden()}>{S.antworten}</Knopf></div>
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
