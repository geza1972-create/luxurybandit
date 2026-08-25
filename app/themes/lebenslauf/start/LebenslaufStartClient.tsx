"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { Trash2, FileText, Video, Check, X as XIcon } from "lucide-react";
import TunnelSeite from "@/components/TunnelSeite";
import { produkt } from "@/lib/produkte";
import ImageCropper from "@/components/ImageCropper";
import { TunnelStart, TunnelFortschritt, TunnelKachelUpload, KurzeEinwilligung, Knopf, Laden, Eingabe, EingabeMehrzeilig } from "@/components/CI";
import { kissText } from "@/lib/kiss-i18n";
import { aktiveAdresse } from "@/lib/guthaben-konto";
import { signInWithOAuth } from "@/lib/supabase-auth-client";
import { eur, themenPreisCents } from "@/lib/pricing";
import { landAusZeitzone } from "@/lib/land-erkennen";
import { kasseOeffnen, kassenFenster } from "@/lib/browser-erkennen";
import { useKasseImFenster } from "@/components/KasseImFenster";
import { logTunnelEvent } from "@/lib/track-funnel";
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
export default function LebenslaufStartClient({ lang, code, inhalt }: {
  lang: string;
  code: string;
  inhalt?: ReactNode;
}) {
  const searchParams = useSearchParams();
  const light = searchParams.get("light") === "1";
  const F = kissText(lang, "lebenslauf");
  const P = produkt("lebenslauf");

  return (
    <TunnelSeite inhalt={inhalt} schritte={P.schritte} schrittBekannt={P.schrittBekannt} light={light} code={code} produkt={P.slug}>
      {({ schritt, onSchrittChange }) => (
        <LebenslaufTunnel lang={lang} F={F} schritt={schritt} onSchrittChange={onSchrittChange} />
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
const STUFEN_TEXT: Record<string, { de: string; en: string }> = {
  zahlung: { de: "Zahlung wird bestätigt …", en: "Confirming your payment …" },
  lesen: { de: "Dein Lebenslauf wird gelesen …", en: "Reading your resume …" },
  match: { de: "Dein Match wird berechnet …", en: "Calculating your match …" },
  fertig: { de: "Deine Seite wird gebaut …", en: "Building your page …" },
};

/**
 * DER NEUE EINSTIEG — DIE ANZEIGE ZUERST (Owner 25.08.2026: „Die Seite/Tunnel muss so
 * anfangen: Passt diese Jobanzeige zu mir? Feld für Jobanzeige. Dann … Bewerbung
 * hochladen … Dann wird generiert. 67 %. Jetzt Bewerbung anpassen und Chancen erhöhen.").
 *
 * Der Match ist der Köder und läuft VOR der Kasse (Auswertung mit `vorab: true` legt den
 * Entwurf unbezahlt an; den bezahlt-Stempel setzt erst fertigstellen nach echter Zahlung).
 * Die E-Mail bleibt PFLICHT davor (Haus-Eingangstor, Memory `eingangstore-email-und-alter`)
 * — Reihenfolge: Anzeige → E-Mail → Lebenslauf+Bild → Ergebnis in Prozent → Kauf.
 * Wer keine Anzeige hat, nimmt den kleinen Ausweg darunter und kauft wie bisher direkt.
 */
const ANZEIGE_TEXT: Record<string, {
  titel: string; zeile: string; platzhalter: string; weiter: string; ohne: string;
  weiterMatch: string; gruendeH: string; lueckenH: string;
  stark: string; mittel: string; schwach: string;
  cta: string; ctaZeile: string; andere: string;
  karteH: string; profilH: string; kompetenzenH: string; bearbeiten: string; fertigB: string;
}> = {
  de: {
    titel: "Passt diese Jobanzeige zu dir?",
    zeile: "Füg den Link oder den Text der Anzeige ein — du siehst gleich in Prozent, wie gut du passt. Kostenlos.",
    platzhalter: "https://… oder den Text der Anzeige einfügen",
    weiter: "Weiter — Match kostenlos prüfen",
    ohne: "Ohne Anzeige starten",
    weiterMatch: "Weiter — dein Match",
    gruendeH: "Das passt", lueckenH: "Das fehlt noch",
    stark: "Starke Übereinstimmung", mittel: "Teilweise Übereinstimmung", schwach: "Schwache Übereinstimmung",
    cta: "Bewerbung anpassen & Chancen erhöhen",
    ctaZeile: "Skript, Video und deine fertige Bewerbungsseite — zugeschnitten auf diese Stelle.",
    andere: "Andere Anzeige testen",
    karteH: "Deine Bewerbung — Vorschau",
    profilH: "Profil", kompetenzenH: "Kernkompetenzen",
    bearbeiten: "Bearbeiten", fertigB: "Fertig",
  },
  en: {
    titel: "Does this job ad fit you?",
    zeile: "Paste the link or the text of the ad — you'll see in percent how well you fit. Free.",
    platzhalter: "https://… or paste the ad's text",
    weiter: "Continue — check your match for free",
    ohne: "Start without an ad",
    weiterMatch: "Continue — your match",
    gruendeH: "What fits", lueckenH: "What's missing",
    stark: "Strong match", mittel: "Partial match", schwach: "Weak match",
    cta: "Tailor my application & raise my chances",
    ctaZeile: "Script, video and your finished application page — tailored to this job.",
    andere: "Try another ad",
    karteH: "Your application — preview",
    profilH: "Profile", kompetenzenH: "Core expertise",
    bearbeiten: "Edit", fertigB: "Done",
  },
};

/**
 * DIE WORTE DER NEUEN SCHRITTE (Owner-Seitentext 24.08.2026: „Dein Skript entsteht … Du
 * änderst ihn, bis er nach dir klingt." · „Du sprichst, wir bauen die Seite. Handykamera
 * reicht." · FAQ: „kein Avatar, keine synthetische Stimme"). Deutsch/Englisch wie die
 * Stufen-Texte — der Trichter ist zweisprachig, der Rest der Seite auch.
 */
const SKRIPT_TEXT: Record<string, Record<string, string>> = {
  de: {
    skriptTitel: "Dein Skript",
    skriptZeile: "Aus deinem eigenen Werdegang. Ändere ihn, bis er nach dir klingt.",
    skriptWeiter: "Skript passt — jetzt einsprechen",
    aufnahmeTitel: "Sprich dein Skript ein",
    aufnahmeZeile: "Handykamera reicht. Du liest ab, so oft du willst — niemand sieht die Versuche davor.",
    aufnahmeKachel: "Aufnahme hochladen",
    aufnahmeHinweis: "Ein Video von dir, in dem du dein Skript sprichst.",
    aufnahmeLaedt: "Wird hochgeladen …",
    seiteBauen: "Seite bauen",
    zurueckSkript: "Zurück zum Skript",
  },
  en: {
    skriptTitel: "Your script",
    skriptZeile: "Built from your own career. Edit it until it sounds like you.",
    skriptWeiter: "Script is right — record it now",
    aufnahmeTitel: "Record your script",
    aufnahmeZeile: "A phone camera is enough. Read it out as often as you like — nobody sees the attempts before.",
    aufnahmeKachel: "Upload your recording",
    aufnahmeHinweis: "A video of you speaking your script.",
    aufnahmeLaedt: "Uploading …",
    seiteBauen: "Build my page",
    zurueckSkript: "Back to the script",
  },
};

const ABLAGE = "lb_lebenslauf_entwurf";

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
function LebenslaufTunnel({ lang, F, schritt, onSchrittChange }: { lang: string; F: any; schritt: number; onSchrittChange: (s: number) => void }) {
  const kasse = useKasseImFenster(schritt);
  const [name, setName] = useState("");
  const [mail, setMail] = useState("");
  const [leadBusy, setLeadBusy] = useState(false);
  const [leadFehler, setLeadFehler] = useState("");

  const [foto, setFoto] = useState("");
  const fotoRef = useRef<HTMLInputElement>(null);
  const [cropDatei, setCropDatei] = useState<File | null>(null);

  const [cvDatei, setCvDatei] = useState<File | null>(null);
  const [cvPath, setCvPath] = useState("");
  const cvRef = useRef<HTMLInputElement>(null);

  /* DIE ANZEIGE — der neue Einstieg (Owner 25.08.2026, siehe ANZEIGE_TEXT oben). */
  const [anzeige, setAnzeige] = useState("");
  const [anzeigeFertig, setAnzeigeFertig] = useState(false);
  const [matchErgebnis, setMatchErgebnis] = useState<{ prozent: number; jobtitel: string; gruende: string[]; luecken: string[] } | null>(null);
  /* Die Daten für die KARTEN-VORSCHAU in Schritt 3 (Owner 25.08.2026: „Schritt 3: Karte
     zeigen (Vorschau, Bearbeitung)") — kommen aus der Vorab-Auswertung. */
  const [karte, setKarte] = useState<{ rolle: string; schwerpunkte: string[]; kompetenzen: string[] } | null>(null);
  const [karteBearbeiten, setKarteBearbeiten] = useState(false);

  /**
   * DIE NEUEN PHASEN NACH DER ZAHLUNG (Owner-Seitentext 24.08.2026): erst das SKRIPT lesen
   * und ändern, dann die EIGENE AUFNAHME hochladen, dann baut der Server die Seite. Der
   * HeyGen-Avatar-Weg ist aus dem Kaufweg raus (FAQ: „kein Avatar, keine synthetische
   * Stimme"); die Route /api/lebenslauf-video bleibt als Altweg im Code.
   */
  const [phase, setPhase] = useState<"" | "ergebnis" | "skript" | "aufnahme">("");
  const [skript, setSkript] = useState("");
  const [aufnahmeDatei, setAufnahmeDatei] = useState<File | null>(null);
  const [aufnahmePath, setAufnahmePath] = useState("");
  const aufnahmeRef = useRef<HTMLInputElement>(null);

  const [genId, setGenId] = useState("");
  const [busy, setBusy] = useState(false);
  const [stufe, setStufe] = useState("");
  const [status, setStatus] = useState("");
  const rueckkehrRef = useRef(false);

  /** DIE KENNUNG STEHT SCHON VOR DER KASSE (nicht erst beim Kaufknopf wie bei Kuss/Hochzeit)
      — sie muss ein Neuladen überstehen, also so früh wie möglich existieren. */
  useEffect(() => {
    if (genId) return;
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

  const preisCents = themenPreisCents("lebenslauf");
  const mailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail.trim());
  /* Vor der Kasse braucht es nur Foto, Lebenslauf und Verfügbarkeit — Skript und Aufnahme
     kommen NACH der Zahlung (Owner-Seitentext: Schritt 2 und 3). */
  const bereitDa = !!foto && !!cvPath;

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
        body: JSON.stringify({ id: e.genId, name: e.name, email: e.mail, pdfPath: e.cvPath, verfuegbarkeit: e.verfuegbarkeit }),
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
        body: JSON.stringify({ id: gid, name, email: mail.trim(), pdfPath: cvPath, vorab: true }),
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
      setMatchErgebnis({ prozent: md.prozent ?? 0, jobtitel: md.jobtitel ?? "", gruende: md.gruende ?? [], luecken: md.luecken ?? [] });
      setBusy(false); setStufe(""); setPhase("ergebnis");
    } catch {
      setStatus(F.statusNetwork); setBusy(false); setStufe("");
    }
  };

  const starten = async () => {
    if (!bereitDa || !mailOk || busy) return;
    setBusy(true); setStatus(""); setStufe("zahlung");
    void logTunnelEvent("checkout_started", "lebenslauf");
    /* SICHERHEITSNETZ: die Kennung entsteht normalerweise Sekunden vor diesem Klick (siehe
       den Effekt oben) — falls sie ausnahmsweise noch fehlt, hier nachholen statt mit
       leerer Kennung zu bezahlen. */
    const gid = await kennungSichern();
    if (!gid) { setStatus(F.statusNotWork); setBusy(false); setStufe(""); return; }
    const bezahlt = await kaufen(gid);
    if (!bezahlt) { setBusy(false); setStufe(""); return; }
    /* Das Skript aus dem Vorab-Generieren mitgeben — sonst zahlte die Kette hier eine
       ZWEITE Auswertung (nachZahlungFortsetzen bevorzugt `e.skript`). */
    await nachZahlungFortsetzen({ genId: gid, name, mail, foto, cvName: cvDatei?.name ?? "", cvPath, verfuegbarkeit: "", stimmWahl: "", audioName: "", audioPath: "", ...(skript.trim() ? { skript: skript.trim() } : {}) });
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

  const AT = ANZEIGE_TEXT[lang === "de" ? "de" : "en"];

  return (
    <>
      <TunnelFortschritt schritte={[1, 3]} aktuell={schritt} />

      {/* ───── DER NEUE EINSTIEG: DIE ANZEIGE (Owner 25.08.2026: „Die Seite muss so
          anfangen: Passt diese Jobanzeige zu mir?") — vor der E-Mail, kostenlos, mit
          kleinem Ausweg für Leute ohne Anzeige. ───── */}
      {schritt === 1 && !anzeigeFertig && (
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

      {schritt === 1 && anzeigeFertig && (
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
            <Laden art="flaeche" text={(STUFEN_TEXT[stufe] ?? STUFEN_TEXT.lesen)[lang === "de" ? "de" : "en"]} />
          ) : phase === "ergebnis" && matchErgebnis ? (
            /* ───── SCHRITT 3: PROZENT + DIE KARTE (Owner 25.08.2026, präzisiert: „Schritt 3:
               Karte zeigen (Vorschau, Bearbeitung)") — er sieht sein ECHTES Dossier als
               Vorschau (Foto, Name, Rolle, Schwerpunkte, Profiltext), kann den Text
               bearbeiten, und der EINE Kaufknopf macht es dauerhaft. ───── */
            <div className="flex flex-col gap-3">
              {matchErgebnis.jobtitel && (
                <p className="text-[12px] font-black uppercase tracking-[0.1em] text-white/50">{matchErgebnis.jobtitel}</p>
              )}
              <div className="flex items-baseline gap-3">
                <p className="font-serif text-[44px] font-black leading-none text-white">{matchErgebnis.prozent}%</p>
                <p className="text-[11.5px] font-black uppercase tracking-[0.1em] text-white/60">
                  {matchErgebnis.prozent >= 70 ? AT.stark : matchErgebnis.prozent >= 40 ? AT.mittel : AT.schwach}
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
              <p className="text-[13px] font-bold leading-snug text-white/70">{AT.ctaZeile}</p>
              <Knopf art="gold" disabled={busy} onClick={() => void starten()}>
                {`${AT.cta} — ${eur(preisCents, lang)}`}
              </Knopf>
              <button type="button"
                onClick={() => { setMatchErgebnis(null); setKarte(null); setKarteBearbeiten(false); setPhase(""); setAnzeigeFertig(false); onSchrittChange(1); }}
                className="text-center text-[11.5px] font-black uppercase tracking-[0.12em] text-white/45 transition hover:text-white/80">
                {AT.andere}
              </button>
            </div>
          ) : phase === "skript" ? (
            /* ───── SCHRITT „DEIN SKRIPT" (Owner-Seitentext: „Du änderst ihn, bis er nach
               dir klingt") — bezahlt ist schon; hier wird gelesen und umgeschrieben. ───── */
            (() => { const S = SKRIPT_TEXT[lang === "de" ? "de" : "en"]; return (
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
            (() => { const S = SKRIPT_TEXT[lang === "de" ? "de" : "en"]; return (
              <div className="flex flex-col gap-3">
                <p className="text-[17px] font-black text-white/90">{S.aufnahmeTitel}</p>
                <p className="text-[13px] font-bold leading-snug text-white/70">{S.aufnahmeZeile}</p>
                <p className="max-h-44 overflow-y-auto rounded-lg border border-white/15 bg-white/[0.05] px-3 py-2.5 text-[13.5px] font-medium leading-relaxed text-white/85 lb-wisch">
                  {skript}
                </p>
                <DateiKachel datei={aufnahmeDatei} icon={Video}
                  titel={S.aufnahmeKachel}
                  hinweis={aufnahmeDatei && !aufnahmePath ? S.aufnahmeLaedt : S.aufnahmeHinweis}
                  onWaehlen={() => aufnahmeRef.current?.click()}
                  onLoeschen={() => { setAufnahmeDatei(null); setAufnahmePath(""); }} />
                <Knopf art="gold" disabled={!aufnahmePath} onClick={() => void seiteBauen()}>
                  {S.seiteBauen}
                </Knopf>
                <button type="button" onClick={() => setPhase("skript")}
                  className="text-center text-[11.5px] font-black uppercase tracking-[0.12em] text-white/45 transition hover:text-white/80">
                  {S.zurueckSkript}
                </button>
              </div>
            ); })()
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

              {/* KEINE ADRESSE AUS SCHRITT 1 (Owner 16.08.2026 erlaubt „ohne Adresse einfach
                  weiter" — aber hier braucht es sie fürs Bezahlen). Ohne diese Stelle blieb
                  der Kaufknopf für immer stumm gesperrt, ohne dass sichtbar war, warum
                  (Owner 20.08.2026, live gefunden: „siehst du nicht, dass Profil erstellen
                  nicht aktiv ist?"). */}
              {!mailOk && (
                <Eingabe type="email" placeholder="you@email.com" value={mail}
                  onChange={e => setMail(e.target.value)} />
              )}

              {/* MIT ANZEIGE führt der Weg erst zum GRATIS-MATCH (kein Preis am Knopf!),
                  ohne Anzeige wie bisher direkt zur Kasse. */}
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => onSchrittChange(1)} aria-label={F.back}
                  className="lb-chip grid h-12 w-12 shrink-0 place-items-center rounded-full active:scale-95 transition">
                  ←
                </button>
                {anzeige.trim() ? (
                  <Knopf art="gold" disabled={!bereitDa || !mailOk || busy} onClick={() => void generieren()}>
                    {AT.weiterMatch}
                  </Knopf>
                ) : (
                  <Knopf art="gold" disabled={!bereitDa || !mailOk || busy} onClick={() => void starten()}>
                    {bereitDa ? `${F.generateNow} — ${eur(preisCents, lang)}` : F.generateNow}
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
          <input ref={cvRef} type="file" accept="application/pdf" className="hidden"
            onChange={e => {
              const f = e.target.files?.[0]; e.target.value = "";
              if (!f) return;
              setCvDatei(f); setCvPath("");
              void ladeHoch(f).then(setCvPath).catch(() => setStatus(F.statusNotWork));
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
