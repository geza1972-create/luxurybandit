"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, ImageUp, Download, Sparkles, RotateCcw, X, Maximize2 } from "lucide-react";
import { Eingabe, EingabeMehrzeilig, Knopf, Laden, BildWahl, BlattUeberlagerung } from "@/components/CI";
import { PDF_VORLAGEN, vorlagenBild } from "@/lib/pdf-vorlagen";
import { kasseOeffnen, kassenFenster } from "@/lib/browser-erkennen";
import { useKasseImFenster } from "@/components/KasseImFenster";
import { logFunnelEvent } from "@/lib/track-funnel";

/**
 * DER RESUME GENERATOR — DER EINE SCHIRM (Owner 26.08.2026: „Man gibt die Anzeige ein
 * Die Bewerbung die schon existiert, das bild und wird angepasst zum runterladen. Mit
 * wasserzeichen. Will er ohne, muss er zahlen 9,99 Euro. Das wars." — ein EIGENES Tool,
 * nicht die Video Applications: „das ist ein anderer Tool LB- Resume Generator").
 *
 * EIN Screen, vier Zutaten: E-Mail (Schritt 0, Eingangstor-Hausregel), Lebenslauf
 * (PDF/.docx), Foto (optional), Anzeige (Text oder Link). Danach: PDF mit
 * Muster-Wasserzeichen gratis + die ehrliche Analyse darunter + der 9,99-Kauf
 * (volle Optimierung + ohne Wasserzeichen).
 *
 * Alle Texte kommen als `S` vom Server (deutsche Quelle, 7 Sprachen über
 * `textbausteineInSprache` — TRICHTER-Muster). Der Preis kommt fertig formatiert
 * (`preisText`) aus lib/pricing — nie eine Zahl im Text (Hausregel).
 */

type Analyse = {
  prozent: number;
  empfehlung: "gut" | "bruecke" | "schwach";
  anforderungen: { text: string; einstufung: string; begruendung: string }[];
};

type Entwurf = {
  genId: string; mail: string; cvPath: string; cvName: string;
  anzeige: string; analyse: Analyse | null; anzeigeTitel: string; phase: string; vorlage?: string;
};

const ABLAGE = "lb_resume_entwurf";
const EINSTUFUNG_FARBE: Record<string, string> = {
  erfuellt: "#4ade80", uebertragbar: "#f6cf51", erklaerbar: "#e5e5e5", blocker: "#f87171",
};

export default function ResumeGeneratorClient({ S, lang, preisText }: {
  S: Record<string, string>; lang: string; preisText: string;
}) {
  const [mail, setMail] = useState("");
  const [foto, setFoto] = useState("");
  const [cvPath, setCvPath] = useState("");
  const [cvName, setCvName] = useState("");
  const [anzeige, setAnzeige] = useState("");
  const [genId, setGenId] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyText, setBusyText] = useState("");
  const [fehler, setFehler] = useState("");
  const [phase, setPhase] = useState<"eingabe" | "fertig" | "optimiert">("eingabe");
  const [analyse, setAnalyse] = useState<Analyse | null>(null);
  const [anzeigeTitel, setAnzeigeTitel] = useState("");
  /* Die gewaehlte PDF-Vorlage — sie reist in den Erzeugen-Aufruf UND an die PDF-Adresse. */
  const [vorlage, setVorlage] = useState(PDF_VORLAGEN[0].id);
  const [vorlageGross, setVorlageGross] = useState(false);
  const cvRef = useRef<HTMLInputElement>(null);
  const fotoRef = useRef<HTMLInputElement>(null);
  const rueckkehrRef = useRef(false);
  const kasse = useKasseImFenster(phase);

  const geraeteKennung = () => { try { return localStorage.getItem("lb_visitor") ?? ""; } catch { return ""; } };

  /* Auftrag anlegen, sobald die Seite steht (Tür-1-Muster) — die Kennung muss ein
     Neuladen überstehen, also so früh wie möglich existieren. */
  useEffect(() => {
    if (genId) return;
    try { if (new URLSearchParams(window.location.search).get("paid")) return; } catch { /**/ }
    void (async () => {
      try {
        const log = await fetch("/api/kiss-log", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: "resume", device: geraeteKennung(), email: mail.trim() }),
        }).then(r => r.json());
        if (log?.id) setGenId(String(log.id));
      } catch { /**/ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Der Entwurf überlebt das Stripe-Neuladen (sessionStorage, Tür-1-Muster). */
  useEffect(() => {
    if (!genId) return;
    try {
      const e: Entwurf = { genId, mail, cvPath, cvName, anzeige, analyse, anzeigeTitel, phase, vorlage };
      sessionStorage.setItem(ABLAGE, JSON.stringify(e));
    } catch { /**/ }
  }, [genId, mail, cvPath, cvName, anzeige, analyse, anzeigeTitel, phase, vorlage]);

  /* DIE RÜCKKEHR VON STRIPE (?paid=1): Entwurf laden, Optimierung anstossen
     (Hausregel `aufladen-setzt-den-kauf-fort`). */
  useEffect(() => {
    if (rueckkehrRef.current) return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("paid") !== "1") return;
    rueckkehrRef.current = true;
    let e: Entwurf | null = null;
    try { e = JSON.parse(sessionStorage.getItem(ABLAGE) ?? "null"); } catch { /**/ }
    if (!e?.genId) return;
    setGenId(e.genId); setMail(e.mail); setCvPath(e.cvPath); setCvName(e.cvName);
    setAnzeige(e.anzeige); setAnalyse(e.analyse); setAnzeigeTitel(e.anzeigeTitel);
    if (e.vorlage && PDF_VORLAGEN.some(v => v.id === e.vorlage)) setVorlage(e.vorlage);
    setPhase("fertig");
    void optimieren(e.genId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Direkt zu Supabase (Memory `large-uploads-direct-to-supabase`). */
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

  /** Das Foto verkleinert in den Speicher (max 1024px) — der Erzeugen-Aufruf trägt es als
      Data-URL im Body, und Vercel deckelt den bei ~4,5 MB. */
  const fotoWaehlen = async (f: File) => {
    try {
      const url = URL.createObjectURL(f);
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
      const maxKante = 1024;
      const faktor = Math.min(1, maxKante / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * faktor);
      c.height = Math.round(img.height * faktor);
      c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      setFoto(c.toDataURL("image/jpeg", 0.85));
    } catch { setFehler(S.fehlerFoto); }
  };

  const mailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail.trim());

  /**
   * EIN ABBRUCH IST KEIN NETZFEHLER (Owner 05.09.2026, mit Bild: „Keine Verbindung — bitte
   * noch einmal", während die Verbindung tadellos war).
   *
   * BELEGT IM VERCEL-PROTOKOLL: „Task timed out after 60 seconds", POST
   * /api/resume-generator → 504. Hier stand `fetch(...).then(r => r.json())` — ohne Blick auf
   * den Status. Ein 504 liefert eine Fehlerseite, `r.json()` scheitert daran, und im `catch`
   * landete pauschal „Keine Verbindung". Der Kunde prüft daraufhin sein WLAN statt es einfach
   * noch einmal zu versuchen, und wir suchen den Fehler an der falschen Stelle.
   *
   * Jetzt werden die drei Fälle getrennt: gar keine Antwort (`fetch` wirft) heisst wirklich
   * kein Netz; 504/408 heisst „hat zu lange gedauert"; alles andere geht als Antwort weiter.
   */
  const rufen = async (nutzlast: Record<string, unknown>): Promise<{ daten?: Record<string, unknown>; fehler?: string }> => {
    let r: Response;
    try {
      r = await fetch("/api/resume-generator", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nutzlast),
      });
    } catch { return { fehler: S.fehlerNetz }; }
    if (r.status === 504 || r.status === 408) return { fehler: S.fehlerZuLang };
    const daten = await r.json().catch(() => null);
    if (!daten) return { fehler: r.ok ? S.fehlerNetz : S.fehlerZuLang };
    return { daten: daten as Record<string, unknown> };
  };

  const erzeugen = async () => {
    if (busy) return;
    /* SICHTBAR ABSAGEN, NIE STUMM (Hausregel). */
    if (!mailOk) { setFehler(S.fehlerMail); return; }
    if (!cvPath) { setFehler(S.fehlerCv); return; }
    if (!anzeige.trim()) { setFehler(S.fehlerAnzeige); return; }
    setBusy(true); setBusyText(S.laufText); setFehler("");
    void logFunnelEvent("resume_generation_started", { theme: "resume" });
    const { daten: d, fehler: netzFehler } = await rufen({
      schritt: "erzeugen", id: genId, device: geraeteKennung(),
      email: mail.trim(), anzeige: anzeige.trim(), cvPath, cvName, vorlage,
      ...(foto ? { foto } : {}),
    });
    if (netzFehler || !d) { setFehler(netzFehler ?? S.fehlerNetz); setBusy(false); setBusyText(""); return; }
    if (d.error) { setFehler(String(d.error)); setBusy(false); setBusyText(""); return; }
    setAnalyse((d.analyse ?? null) as typeof analyse);
    setAnzeigeTitel(String(d.anzeigeTitel ?? ""));
    setPhase("fertig");
    void logFunnelEvent("resume_generated", { theme: "resume" });
    setBusy(false); setBusyText("");
  };

  const optimieren = async (gid: string) => {
    setBusy(true); setBusyText(S.optimierungLaeuft); setFehler("");
    const { daten: d, fehler: netzFehler } = await rufen({ schritt: "optimieren", id: gid, device: geraeteKennung() });
    if (netzFehler || !d) { setFehler(netzFehler ?? S.fehlerNetz); setBusy(false); setBusyText(""); return; }
    if (d.error) { setFehler(String(d.error)); setBusy(false); setBusyText(""); return; }
    setPhase("optimiert");
    void logFunnelEvent("resume_optimized", { theme: "resume" });
    setBusy(false); setBusyText("");
  };

  /* Der Kaufweg — exakt das Tür-1-Muster (Popup + eingebettete Kasse + Wallet). */
  const kaufen = async () => {
    if (busy || !genId) return;
    const popup = kassenFenster();
    setFehler("");
    try {
      const start = await fetch("/api/kiss-video-checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genId, once: true, videoAufpreis: false, thema: "resume",
          email: mail.trim(), returnTo: window.location.pathname,
          eingebettet: kasse.anfordern, lang,
        }),
      }).then(r => r.json());
      if (start?.walletPaid) {
        try { popup?.close(); } catch { /**/ }
        void optimieren(genId);
        return;
      }
      if ((!start?.url && !start?.clientSecret) || !start?.sessionId) {
        try { popup?.close(); } catch { /**/ }
        setFehler(start?.error || S.fehlerNetz);
        return;
      }
      if (kasse.uebernehmen(start.clientSecret)) return;
      if (kasseOeffnen(popup, start.url) !== "popup" || !popup) return;
      for (let i = 0; i < 100; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const s = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(start.sessionId)}`).then(r => r.json()).catch(() => null);
        if (s?.paid) {
          try { popup.close(); } catch { /**/ }
          void optimieren(genId);
          return;
        }
        if (popup.closed && i > 2) break;
      }
      try { popup.close(); } catch { /**/ }
    } catch {
      try { popup?.close(); } catch { /**/ }
      setFehler(S.fehlerNetz);
    }
  };

  const nochmal = () => {
    setPhase("eingabe"); setAnalyse(null); setAnzeigeTitel("");
    setCvPath(""); setCvName(""); setFoto(""); setAnzeige(""); setFehler("");
    try { sessionStorage.removeItem(ABLAGE); } catch { /**/ }
  };

  const pdfUrl = genId ? `/api/bewerbung-pdf?id=${encodeURIComponent(genId)}&device=${encodeURIComponent(geraeteKennung())}&vorlage=${encodeURIComponent(vorlage)}` : "";
  const kachel = (voll: boolean) =>
    `flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-3 py-5 text-center transition active:scale-[0.98] ${voll ? "border-[#f6cf51]/60 lb-goldhauch" : "border-white/25"}`;

  return (
    <div className="flex flex-col gap-4">
      {/* ── EINGABE ── */}
      {phase === "eingabe" && (
        <>
          {/* DIE STELLENANZEIGE STEHT VORN (Owner 25.08.2026: „Der Trichter fängt damit an,
              dass man die Stellenanzeige — Link oder Text — eingeben muss. Dann der Rest
              bleibt so.").

              WARUM DAS MEHR IST ALS EINE UMSORTIERUNG: Das Werkzeug verkauft nicht „mach
              mir einen Lebenslauf", sondern „mach mir die Bewerbung für DIESE Stelle". Die
              erste Zeile eines Trichters sagt, worum es geht — stand dort die E-Mail, war
              es ein Formular; steht dort die Anzeige, ist es das Versprechen der
              Landingpage. E-Mail, Foto und Lebenslauf folgen unverändert darunter. */}
          <div>
            <p className="mb-1.5 text-[12px] font-black uppercase tracking-[0.08em] text-white/50">{S.anzeigeTitelLabel}</p>
            <EingabeMehrzeilig zeilen={5} placeholder={S.anzeigePlatzhalter} value={anzeige} onChange={e => setAnzeige(e.target.value)} />
          </div>
          <Eingabe type="email" placeholder={S.mailPlatzhalter} value={mail} onChange={e => setMail(e.target.value)} />
          {/* JEDES HOCHGELADENE STÜCK LÄSST SICH WIEDER ENTFERNEN (Owner 25.08.2026: „will
              den Lebenslauf löschen können und neu hochladen können"; Dauerregel
              `upload-ui-rules`). Vorher zeigte die Kachel nur den Dateinamen — wer die
              falsche Datei erwischt hatte, kam ohne Neuladen der Seite nicht mehr davon los.
              EIN Tipp genügt hier (kein Zwei-Tipp-Rot wie beim Löschen fertiger Werke): Es
              geht nichts verloren, das Feld wird nur wieder leer. */}
          <div className="grid grid-cols-[1fr_2fr] gap-2">
            <div className="relative">
              <button type="button" onClick={() => fotoRef.current?.click()} className={`w-full ${kachel(!!foto)}`}>
                {foto
                  ? <img src={foto} alt="" className="h-16 w-12 rounded-lg object-cover" />
                  : <ImageUp className="h-6 w-6 text-[#f6cf51]" />}
                <span className="text-[12px] font-black text-white/85">{S.fotoTitel}</span>
                <span className="text-[10.5px] font-bold text-white/45">{S.fotoHinweis}</span>
              </button>
              {foto && (
                <button type="button" aria-label={S.entfernen}
                  onClick={() => { setFoto(""); if (fotoRef.current) fotoRef.current.value = ""; }}
                  className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full border border-white/25 bg-black/70 text-white/70 transition hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="relative">
              <button type="button" onClick={() => cvRef.current?.click()} className={`w-full ${kachel(!!cvPath)}`}>
                <FileText className="h-6 w-6 text-[#f6cf51]" />
                <span className="text-[12px] font-black text-white/85">{cvName ? cvName.slice(0, 30) : S.cvTitel}</span>
                <span className="text-[10.5px] font-bold text-white/45">{cvPath ? S.entfernenHinweis : S.cvHinweis}</span>
              </button>
              {cvPath && (
                <button type="button" aria-label={S.entfernen}
                  onClick={() => { setCvPath(""); setCvName(""); if (cvRef.current) cvRef.current.value = ""; }}
                  className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full border border-white/25 bg-black/70 text-white/70 transition hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          {/* DIE VORLAGEN-GALERIE (Owner 25.08.2026: „mach auf dieser Seite ein Slider mit
              der Template-Auswahl. Bitte alle Funktionen übernehmen wie Vorschau full").

              DERSELBE BAUSTEIN WIE IM DAVID-ANGEBOT, nicht ein zweiter: `BildWahl` mit
              `blatt` (A4-Verhältnis — ein Layout, das man nur zu fünf Sechsteln sieht,
              wählt man blind) und die `BlattUeberlagerung` als Vollbild-Vorschau. Die
              Ring-Regel (Auswahl wechselt nur die FARBE, nie die Geometrie) steckt dort
              schon drin; nachgebaut wäre sie beim ersten Antippen verletzt (Dauerregel
              12.08.2026: „jede Tunnel-Auswahl = BildWahl-Slider").

              Die Wahl reist bis ins PDF: `vorlage` geht an /api/resume-generator und hängt
              zusätzlich an der PDF-Adresse, damit die Vorschau sofort die gewählte Vorlage
              zeigt — auch ohne neuen KI-Lauf. */}
          <div>
            {/* Kopfzeile: Titel links, die Lupe rechts — sie vergrössert die GEWÄHLTE
                Vorlage. An den kleinen Wähler-Kacheln sitzt bewusst keine (Hausregel aus
                `BildWahl`: „Die muss man nicht vergrössern können. Man kann wenn
                ausgewählt vergrössern") — auf 58 px wäre die Lupe grösser als das halbe
                Blatt. */}
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <p className="text-[12px] font-black uppercase tracking-[0.08em] text-white/50">{S.vorlagenTitel}</p>
              <button type="button" onClick={() => setVorlageGross(true)}
                className="flex items-center gap-1.5 rounded-full border border-white/25 px-3 py-1 text-[11px] font-black text-white/70 transition hover:text-white">
                <Maximize2 className="h-3.5 w-3.5" />{S.vorlagenAnsehen}
              </button>
            </div>
            <BildWahl
              blatt
              ansehenLabel={S.vorlagenAnsehen}
              bilder={PDF_VORLAGEN.map(v => ({ id: v.id, name: v.name, bild: vorlagenBild(v.id) }))}
              wert={vorlage}
              waehle={setVorlage}
            />
          </div>
          {vorlageGross && (
            <BlattUeberlagerung
              bildUrl={vorlagenBild(vorlage)}
              beschriftung={PDF_VORLAGEN.find(v => v.id === vorlage)?.name}
              schliessenLabel={S.schliessen}
              zu={() => setVorlageGross(false)} />
          )}
          {fehler && <p className="text-[13px] font-bold text-red-400">{fehler}</p>}
          {busy
            ? <Laden art="flaeche" text={busyText || S.laufText} />
            : <Knopf art="gold" disabled={!genId} onClick={() => void erzeugen()}>{S.erzeugen}</Knopf>}
          <p className="text-center text-[11px] font-medium text-white/40">{S.gratisZeile}</p>
        </>
      )}

      {/* ── FERTIG / OPTIMIERT ── */}
      {phase !== "eingabe" && (
        <>
          <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#f6cf51]">
              {phase === "optimiert" ? S.optimiertTitel : S.fertigTitel}
            </p>
            {anzeigeTitel && <p className="mt-1 text-[15px] font-black text-white/90">{anzeigeTitel}</p>}
            <div className="mt-3">
              {busy
                ? (
                  <>
                    <Laden art="flaeche" text={busyText || S.laufText} />
                    {/* WAS ER GERADE TUT, IN EINER ZEILE (Owner 05.09.2026: „Muss aber stehen
                        was er macht"). Nur beim bezahlten Lauf — dort ist die Wartezeit lang
                        genug, dass ein blosser Kreisel wie ein Fehler wirkt. */}
                    {busyText === S.optimierungLaeuft && S.optimierungSchritte && (
                      <p className="mt-2 text-center text-[11px] font-medium leading-snug text-white/45">
                        {S.optimierungSchritte}
                      </p>
                    )}
                  </>
                )
                : (
                  <a href={pdfUrl} download
                    onClick={() => void logFunnelEvent("resume_pdf_downloaded", { theme: "resume", optimiert: String(phase === "optimiert") })}
                    className="lb-gold flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 py-2 text-center font-black leading-tight text-[#1a1204]">
                    <Download className="h-4 w-4" /> {phase === "optimiert" ? S.pdfKnopfVoll : S.pdfKnopf}
                  </a>
                )}
            </div>
            {phase === "fertig" && <p className="mt-2 text-center text-[11px] font-medium text-white/45">{S.musterHinweis}</p>}
          </div>

          {/* Die ehrliche Analyse — „die Analyse zeigen wir ihm auch mit drunter". */}
          {analyse && (
            <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-black uppercase tracking-[0.1em] text-white/50">{S.analyseTitel}</p>
                <p className="text-[20px] font-black text-[#f6cf51]">{analyse.prozent}%</p>
              </div>
              <div className="mt-2.5 flex flex-col gap-2">
                {analyse.anforderungen.map((a, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: EINSTUFUNG_FARBE[a.einstufung] ?? "#e5e5e5" }} />
                    <div>
                      <p className="text-[13px] font-black text-white/85">{a.text}</p>
                      {a.begruendung && <p className="text-[12px] font-medium leading-snug text-white/50">{a.begruendung}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Der 9,99-Kauf — nur solange nicht optimiert. */}
          {phase === "fertig" && !busy && (
            <div className="rounded-2xl border border-[#f6cf51]/40 lb-goldhauch p-4">
              <p className="flex items-center gap-1.5 text-[13px] font-black text-white/90">
                <Sparkles className="h-4 w-4 text-[#f6cf51]" /> {S.kaufTitel}
              </p>
              <p className="mt-1 text-[12.5px] font-medium leading-snug text-white/60">{S.kaufText}</p>
              <div className="mt-3">
                <Knopf art="gold" onClick={() => void kaufen()}>{S.kaufKnopf} {preisText}</Knopf>
              </div>
            </div>
          )}
          {kasse.block}

          {!busy && (
            <button type="button" onClick={nochmal}
              className="mx-auto inline-flex items-center gap-1.5 text-[11.5px] font-black uppercase tracking-[0.08em] text-white/50 transition hover:text-white">
              <RotateCcw className="h-3.5 w-3.5" /> {S.nochmal}
            </button>
          )}
        </>
      )}

      {/* PDF UND WORD (docx-Weg vom selben Tag) — das alte binäre .doc bleibt draußen. */}
      <input ref={cvRef} type="file" accept="application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden"
        onChange={async e => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setFehler("");
          try { setCvPath(await ladeHoch(f)); setCvName(f.name); } catch { setFehler(S.fehlerNetz); }
        }} />
      <input ref={fotoRef} type="file" accept="image/*,.heic,.heif" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void fotoWaehlen(f); }} />
    </div>
  );
}
