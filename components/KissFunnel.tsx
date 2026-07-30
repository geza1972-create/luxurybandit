"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";
import { Loader2, ImageUp, Lock, RefreshCw, Check, Sparkles } from "lucide-react";
import { renewNote, fillPrices } from "@/lib/pricing";
import { logFunnelEvent } from "@/lib/track-funnel";
import { trackMetaPixel } from "@/lib/meta-pixel";
import { HOLIDAY_SCENES, holidayPrompt, type HolidayScene } from "@/lib/holiday-scenes";
import { tryonPrompt } from "@/lib/tryon-prompt";

// „Kiss any Model" — Funnel mit FAKE-FIRST-Monetarisierung (Owner-Entscheidung):
// Der Besucher wählt Model + eigenes Foto → wir spielen eine RENDER-SHOW (kostet nichts,
// KEIN API-Call) → „Dein Video ist fertig" läuft VERPIXELT (in Wahrheit das Model-Foto
// hinter starkem Blur) → „🔓 Unlock — Abo" (Stripe-Popup + Status-Poll) → ERST NACH der
// Zahlung (24-€-Abo, 5 Videos/Monat) startet die ECHTE Pixverse-Generierung (gleiche Pipeline wie Try-On: zwei
// Referenzen an @-Tokens, Raw-Prompt, 360p = Pixverse-Minimum) → Video klar anzeigen.
// Staff (Admin-PIN) überspringt alles: echte Generierung sofort, unverpixelt.
// Welche Models im Grid stehen, wählt der Admin im Kiss-Models-Tool (/api/kiss-config).

type Model = { id: string; name: string; photoUrl: string };

// Referenz-Look fürs Billing/Routing der Route (gleicher Default wie der Try-On-Funnel).
const KISS_LOOK_ID = "look-1784191032626-70e3608b";

// Platzhalter im Upload-Feld: ein MÄNNERGESICHT (Peter), abgedunkelt hinterlegt. Ohne das
// laden Nutzer erfahrungsgemäß noch ein Model hoch statt sich selbst. Als statische Datei
// im Repo, damit die URL nie abläuft (signierte Storage-Links tun das).
const PLACEHOLDER_MAN = "/kiss-placeholder.jpg";

// DER PROMPT KOMMT VOM OWNER, wörtlich (30.07.2026). Vorher stand hier meine eigene
// Fassung mit @person/@Bild2 — die hatte er nie freigegeben.
//
// BINDUNG (Route /api/generate-tryon-video, pixverseStartReference):
//   @1 → das Foto der Frau (im Trichter `person`)
//   @2 → sein hochgeladenes Foto (im Trichter `garment`)
// Beide Token treffen die Muster der Route, es wird also nichts umgeschrieben.
//
// NICHTS DARAN ÄNDERN, ohne ihn zu fragen — auch keine „Verbesserung" der Wortwahl.
export const KISS_PROMPT =
  "@1 and @2 stand close together in a warm, softly lit evening setting with gentle glowing lights behind them. They look at each other and smile, lean in slowly, and share a brief, tender kiss. Then they step back a little and smile at each other, happy. Keep @1 and @2 faces and appearance exactly the same throughout. Fixed camera, no zoom, no camera movement. Fluid natural motion, photorealistic, high-end look. No text or logos.";

// „Your Idol with you": die beiden zusammen auf einer schönen Party — kein Kuss, sondern
// ein gemeinsamer Moment. Wieder NEUTRALE Wortwahl (Pixverse flaggt Intim-/Haut-Wörter),
// feste Kamera, Gesichter bleiben exakt gleich.
export const IDOL_PROMPT =
  "@person and @Bild2 are together at an elegant evening party, warm golden lights and a festive atmosphere around them. They stand side by side, smiling and laughing, raising their glasses and enjoying the moment together. Keep @person and @Bild2 faces and appearance exactly the same throughout. Fixed camera, no zoom, no camera movement. Fluid natural motion, photorealistic, high-end look. No text or logos.";

/**
 * FOTO KLEIN RECHNEN — WebP, und Handyformate annehmen (Owner 30.07.2026: „die musst du dann
 * verkleinern als WebP automatisch beim Hochladen und auch Handyformate annehmen").
 *
 * WARUM ES ZÄHLT: Vercel weist eine Anfrage über ~4,5 MB mit 413 ab, bevor irgendetwas läuft.
 * Ein Foto vom Handy hat schnell 4–8 MB. WebP ist bei gleicher Qualität rund ein Drittel
 * kleiner als JPEG — damit bleibt auch ein zweites Bild im Rahmen.
 *
 * HANDYFORMATE: iPhones liefern HEIC. `new Image()` kann das ausserhalb von Safari nicht
 * lesen; `createImageBitmap` kann es in mehr Browsern. Deshalb erst der Weg, dann der alte
 * als Rückfall. Scheitert beides, sagen wir es — statt still nichts zu tun.
 */
async function fileToDataUrl(file: File, max = 1000, quality = 0.85): Promise<string> {
  const zeichnen = (w: number, h: number, mal: (c: CanvasRenderingContext2D) => void) => {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    mal(c.getContext("2d")!);
    // WebP wo möglich, sonst JPEG (ältere Safari-Fassungen können kein WebP schreiben).
    const webp = c.toDataURL("image/webp", quality);
    return webp.startsWith("data:image/webp") ? webp : c.toDataURL("image/jpeg", quality);
  };

  try {
    const bmp = await createImageBitmap(file);
    const sc = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * sc), h = Math.round(bmp.height * sc);
    const out = zeichnen(w, h, ctx => ctx.drawImage(bmp, 0, 0, w, h));
    bmp.close?.();
    return out;
  } catch { /* dann der klassische Weg */ }

  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Dieses Bildformat können wir nicht lesen.")); i.src = dataUrl;
  });
  const sc = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.round(img.width * sc), h = Math.round(img.height * sc);
  return zeichnen(w, h, ctx => ctx.drawImage(img, 0, 0, w, h));
}

// Die Fortschrittstexte müssen so lange laufen wie die Erzeugung (25–45 s) — sonst steht der
// letzte Satz eine halbe Minute unverändert da und es liest sich wie abgestürzt.
const RENDER_STEPS: [number, string][] = [
  [0, "Analyzing your photo …"],
  [4000, "Matching the two of you …"],
  [9000, "Rendering the kiss …"],
  [15000, "Getting the light right …"],
  [21000, "Almost there …"],
  [28000, "Finishing touches …"],
  [36000, "Any second now …"],
  [46000, "Still working — hang on …"],
];
const RENDER_MS = 17000; // Gesamtdauer der Show (~17 s)

export type FunnelVariant = "kiss" | "idol";

// Beide Themen teilen sich DIESEN Funnel — nur Prompt und Beschriftungen unterscheiden
// sich. Kopieren wäre doppelte Wartung: jeder Fix müsste sonst zweimal gemacht werden.
const VARIANTS: Record<FunnelVariant, {
  prompt: string; step1: string; step3: string; cta: string; ready: string; done: string;
  pickHint: string; upTitle: string; upHint: string; upFirst: boolean; upPlaceholder?: string;
}> = {
  kiss: {
    prompt: KISS_PROMPT,
    step1: "1 · Pick her", step3: "3 · The kiss",
    cta: "Generate picture — free", ready: "Your kiss video is ready 💋", done: "kiss-video.mp4",
    // „Your model" steht seit 29.07.2026 VORN und ist vorgewählt (Owner). Derselbe Gedanke
    // wie bei „Your Idol": Wer hierher kommt, hat meist schon jemanden im Kopf — unsere
    // Models sind die Alternative daneben, nicht der Anfang. Auf diese Seite laufen die
    // Anzeigen, also entscheidet die erste Karte über den ganzen Trichter.
    pickHint: "Upload the woman you want to kiss — or swipe to one of ours.",
    upTitle: "Your model", upHint: "Kiss any superstar — just upload a screenshot.", upFirst: true,
    // PLATZHALTER: eine FRAU (Owner 30.07.2026: „du musst als Platzhalter bei Image upload
    // eine Frau machen"). Die Karte stand leer und man sah nicht, was dort hingehört —
    // beim Foto von IHM gab es den Hinweis längst. Bewusst blass und grau, damit sie nicht
    // wie eine getroffene Auswahl wirkt.
    upPlaceholder: "/kiss-woman-placeholder.jpg",
  },
  idol: {
    prompt: IDOL_PROMPT,
    step1: "1 · Pick your idol", step3: "3 · The moment",
    cta: "Generate picture — free", ready: "Your video is ready ✨", done: "your-idol-video.mp4",
    // Bei „Your Idol" ist das EIGENE Idol der Sinn der Sache — deshalb steht die Upload-Karte
    // vorn und ist von Anfang an gewählt; unsere Models sind nur die Alternative daneben.
    pickHint: "Any singer, actress, athlete or influencer — swipe to your own upload, or take one of ours.",
    upTitle: "Your idol", upHint: "Any star you like — just upload one screenshot of her or him.", upFirst: true,
    // Platzhalter-Gesicht auf der Upload-Karte (Aria, abgedunkelt): zeigt auf einen Blick,
    // dass hier ein FOTO hineingehört — genau wie Peter beim eigenen Foto.
    upPlaceholder: "/idol-placeholder.jpg",
  },
};

export default function KissFunnel({ variant = "kiss", code = "" }: { variant?: FunnelVariant; code?: string }) {
  const V = VARIANTS[variant];
  // MESSPUNKTE (Owner 29.07.2026). Bis heute meldete KEIN Trichter irgendetwas: acht
  // Kiss-Durchläufe standen nur im eigenen kiss-log, und wo die Leute abspringen, war
  // nicht zu sehen. Alle Trichter benutzen dieselben sechs Namen, damit man sie
  // nebeneinanderlegen kann; das Thema steckt in lookId.
  const track = (step: string) =>
    void logFunnelEvent(`funnel_${step}`, { lookId: `funnel-${variant}`, lookName: `${variant}-Trichter` });
  const [models, setModels] = useState<Model[]>([]);
  const [picked, setPicked] = useState<Model | null>(null);
  const [customModel, setCustomModel] = useState(""); // „Your Model": eigenes Model-Foto (Data-URL)
  const [useCustom, setUseCustom] = useState(VARIANTS[variant].upFirst); // „Your Model"-Karte vorn
  const [photo, setPhoto] = useState("");          // eigenes Foto (Data-URL)
  const [isStaff, setIsStaff] = useState(false);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);         // Render-Show oder echte Generierung läuft
  const [status, setStatus] = useState("");
  const [teaser, setTeaser] = useState(false);
  // Das ECHTE Gratis-Bild (Owner 30.07.2026: „ich will hier jetzt ein Bild generieren dann in
  // einem Video umwandeln"). Es ist der erste Vollbild des späteren Videos — deshalb bleiben
  // die Gesichter stabil: sie stehen schon im Bild, statt erst beim Rendern zu entstehen.
  const [bild, setBild] = useState("");
  // E-MAIL GEGEN BILD (Owner 30.07.2026). Das Bild ist fertig, aber verdeckt, bis er seine
  // Adresse einträgt — danach sofort sichtbar, ohne Anmeldung, ohne Passwort. Gefragt wird
  // NACH dem Rendern: wer gewartet hat, trägt ein; wer vorher gefragt wird, springt ab.
  const [bildPfad, setBildPfad] = useState("");
  const [mail, setMail] = useState("");
  const [mailBusy, setMailBusy] = useState(false);
  const [frei, setFrei] = useState(false);      // Adresse da → Bild sichtbar
  // GRATIS AUFGEBRAUCHT — aber kein Sackgassen-Text (Owner 30.07.2026: „bei der Sperre muss
  // doch ein Button kommen für Abo oder Video für 9,99 … sonst macht er nicht weiter").
  const [gesperrt, setGesperrt] = useState(false);
  // GESCHEITERT — aber nicht verloren (Owner 30.07.2026). Statt einer stummen Fehlermeldung
  // ein Feld: dann bekommt er sein Bild nachgereicht, und wir bekommen die Adresse.
  const [gescheitert, setGescheitert] = useState(false);
  /**
   * EIN SCHRITT PRO BILDSCHIRM (Owner 30.07.2026: „wir müssen das Layout ändern. In Schritten.
   * Er lädt ein Bild von ihr hoch oder wählt ein Model, dann nächster Screen, er lädt ein Bild
   * von sich hoch, dann nächste ist die Generierung").
   *
   * Vorher standen alle drei Schritte untereinander auf einem sehr langen Bildschirm. Am Handy
   * sah man nie, was als Nächstes kommt, und der Generieren-Knopf war grau, ohne dass klar
   * wurde warum. Jetzt: eine Aufgabe, ein Knopf, weiter.
   */
  // Schritt 4 = die Erzeugung selbst (Owner 30.07.2026: „ich will dass er auf die nächste
  // Seite springt wenn er Generate macht und das Rendering zu sehen ist. Dann weiss ich
  // besser was passiert"). Vorher lief das Rendern unter den Schritten weiter — man sah
  // nicht, dass überhaupt etwas passiert.
  const [schritt, setSchritt] = useState<1 | 2 | 3 | 4>(1);
  // SPANNUNG VOR DER KASSE (Owner 30.07.2026: „Fake loading und dann sagt: Oh mein Gott ist
  // das heiss — zahlen um das Ergebnis zu sehen … er hat nämlich nichts bezahlt, nur gegafft").
  // Erst die Render-Show über SEINEM Bild, dann die Kasse. Nicht sofort auf Stripe springen.
  const [videoShow, setVideoShow] = useState(false);   // Ladeanzeige läuft
  const [videoReif, setVideoReif] = useState(false);   // Show vorbei → Kaufknöpfe
  const [videoBusy, setVideoBusy] = useState(false);     // Fake-„fertig": verpixeltes Ergebnis + Kauf-CTA
  const [videoUrl, setVideoUrl] = useState("");    // ECHTES Video (erst nach Zahlung / Staff)
  const [genId, setGenId] = useState("");          // Kiss-Log-Eintrag dieser Generierung
  const [payBusy, setPayBusy] = useState(false);
  // AKTIVE ZUSTIMMUNG (Owner-Vorgabe): niemand rendert ein Video aus fremden Fotos, ohne
  // vorher ausdrücklich bestätigt zu haben, dass er das darf und die Verantwortung trägt.
  const [consent, setConsent] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const modelFileRef = useRef<HTMLInputElement>(null); // Upload fürs eigene Model-Foto
  const runRef = useRef(0);
  // ZAHLUNG ERKANNT (Owner 30.07.2026: „nach dem ich bezahlt habe ist nichts passiert, der
  // Kunde wurde ausgeraubt" / „springt wieder auf unlock video"). Siehe Ablauf weiter unten.
  const [bezahlt, setBezahlt] = useState(false);
  // AUSWAHL NACH DER ZAHLUNG (Owner 30.07.2026: „ich habe gar nicht die Chance gehabt die
  // Klamotten fuer sie auszuwaehlen"). Wer bezahlt hat, sucht sich Kleid, seine Sachen und
  // die Szene aus — ohne zweite Kasse: „und gratis natuerlich, er hat doch bezahlt".
  const [wahl, setWahl] = useState(false);
  const [looks, setLooks] = useState<{ id: string; name?: string; imageUrl?: string }[]>([]);
  const [nurKleidung, setNurKleidung] = useState<string[] | null>(null);
  const [ihrLook, setIhrLook] = useState("");     // "" = wie auf ihrem Foto
  const [seinLook, setSeinLook] = useState("");   // "" = SEINE Originalkleidung (vorbelegt)
  const [szeneId, setSzeneId] = useState("");     // "" = automatisch eine aussuchen
  const rueckkehrRef = useRef(false);
  // ZURUECK GEHOERT IN DIE SPRACHZEILE (Owner 30.07.2026: „Back Button in dem Balken mit den
  // Sprachen stehen"). Der Balken liegt in TopNav, der Schritt hier — statt den Zustand nach
  // oben zu reichen, haengen wir den Knopf per Portal in die vorhandene Zeile. Ein Ziel, das
  // es nicht gibt (andere Seiten), heisst einfach: kein Knopf.
  const [langZeile, setLangZeile] = useState<Element | null>(null);
  const swipeRef = useRef(0);      // Coverflow: Pointer-X beim Swipe-Start
  const swipedRef = useRef(false); // ein Swipe war's → den nachlaufenden Klick schlucken
  const resultRef = useRef<HTMLDivElement>(null); // Radar/Ergebnis — der Screen springt dorthin

  useEffect(() => {
    // Model-Grid: Admin-Auswahl aus /api/kiss-config (leer = alle Models).
    Promise.all([
      fetch("/api/try-this-look?models=1").then(r => r.json()).catch(() => ({})),
      fetch("/api/kiss-config").then(r => r.json()).catch(() => ({})),
    ]).then(([m, c]) => {
      const all: Model[] = (Array.isArray(m.models) ? m.models : []).filter((x: Model) => !!x.photoUrl);
      const wanted: string[] = Array.isArray(c.modelIds) ? c.modelIds : [];
      let list = wanted.length ? wanted.map(id => all.find(x => x.id === id)).filter(Boolean) as Model[] : all;
      // Bella steht IMMER als Erste (Owner-Vorgabe) — sie ist das Gesicht des Portals.
      const bellaIdx = list.findIndex(x => x.id === "curator-1783683672619-td4cy" || /^bella\b/i.test(x.name));
      if (bellaIdx > 0) list = [list[bellaIdx], ...list.slice(0, bellaIdx), ...list.slice(bellaIdx + 1)];
      setModels(list);
      // Coverflow: die vorderste Karte IST die Auswahl → mit dem ersten Model (Bella) starten.
      // Bei „Your Idol" bleibt die Upload-Karte vorn, `picked` ist nur der Fallback dahinter.
      if (list.length) setPicked(p => p ?? list[0]);
    });
    try {
      const p = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? "";
      setPin(p); setIsStaff(!!p && !localStorage.getItem("lb_preview_model"));
    } catch { /**/ }
    return () => { runRef.current = -1; };
  }, []);

  /**
   * DAS ERGEBNIS ÜBERLEBT DEN WEG ZUR KASSE (Owner 30.07.2026).
   *
   * „Ich habe das Bild generiert, die E-Mail eingegeben, auf Turn geklickt, bin auf Stripe
   * gesprungen, dann per Zurück wieder in den Browser — und weg war das Bild. Manchmal
   * müssen die Leute sich das Bild noch mal anschauen um zu überlegen."
   *
   * Das Bild lag nur im Arbeitsspeicher der Seite. Stripe öffnet eine eigene Seite; „Zurück"
   * lädt den Trichter neu und der Speicher ist leer — ausgerechnet in dem Moment, in dem er
   * überlegt, ob er zahlt. Deshalb wird es im Gerät abgelegt, verkleinert (das Original wäre
   * für den Ablageplatz zu gross), zusammen mit dem freigeschalteten Zustand.
   */
  const MERK_KEY = `lb_kiss_ergebnis_${variant}`;

  const merken = async (dataUrl: string, pfad: string, id: string, frei = false) => {
    try {
      // Verkleinert ablegen: der Ablageplatz im Browser fasst nur wenige Megabyte.
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl;
      });
      const max = 900, sc = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      localStorage.setItem(MERK_KEY, JSON.stringify({
        bild: c.toDataURL("image/jpeg", 0.82), pfad, id, frei, at: Date.now(),
      }));
    } catch { /* kein Platz → dann eben nur für diese Sitzung */ }
  };

  useEffect(() => {
    try {
      const roh = localStorage.getItem(MERK_KEY);
      if (!roh) return;
      const d = JSON.parse(roh) as { bild?: string; pfad?: string; id?: string; frei?: boolean; at?: number };
      // Nach 24 Stunden nicht mehr — sonst sieht er beim nächsten Besuch ein altes Ergebnis.
      if (!d?.bild || (d.at && Date.now() - d.at > 86_400_000)) { localStorage.removeItem(MERK_KEY); return; }
      setBild(d.bild); setBildPfad(d.pfad ?? ""); setGenId(d.id ?? "");
      // `frei` nur, wenn die Adresse damals wirklich kam — sonst käme der Kunde durch
      // Neuladen am E-Mail-Feld vorbei.
      setFrei(!!d.frei);
    } catch { /**/ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * RUECKKEHR VON DER KASSE — der Kunde darf NIE bezahlt und mit leeren Haenden dastehen.
   *
   * Owner 30.07.2026: „nach dem ich bezahlt habe ist nichts passiert, der Kunde wurde
   * ausgeraubt … springt wieder auf unlock video statt dass er das Video weiter rendert."
   *
   * Ursache: Der Kaufweg oeffnet Stripe in einem zweiten Fenster und wartet dort auf die
   * Bestaetigung. Blockiert der Browser dieses Fenster — auf dem Handy die Regel —, leitet
   * die Seite IM SELBEN Fenster weiter (`window.location.href = start.url`). Nach der Zahlung
   * kommt er mit `?paid=1&cs=<Sitzung>` zurueck, die Seite laedt NEU, der wartende Ablauf ist
   * weg. Uebrig bleibt das gemerkte Bild samt Kaufknopf: bezahlt, und wieder „Unlock 9,99".
   *
   * Zwei getrennte Schritte, weil das Bild aus dem Geraetespeicher spaeter zurueckkommt als
   * diese Pruefung: erst die Zahlung bestaetigen, dann liefern, sobald das Bild da ist.
   */
  useEffect(() => { setLangZeile(document.querySelector("[data-langrow]")); }, []);

  useEffect(() => {
    if (rueckkehrRef.current) return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("paid") !== "1") return;
    const cs = q.get("cs") ?? "";
    if (!cs || cs.startsWith("{")) return;      // Platzhalter nicht ersetzt → nichts zu pruefen
    rueckkehrRef.current = true;
    setStatus("Payment received — preparing your video …");
    void (async () => {
      const st = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(cs)}`)
        .then(r => r.json()).catch(() => null);
      if (!st?.paid) { setStatus(""); rueckkehrRef.current = false; return; }
      // Sitzungsnummer aus der Adresszeile nehmen: sie gehoert nicht in den Verlauf, und ein
      // Neuladen soll die Lieferung nicht ein zweites Mal ausloesen.
      q.delete("paid"); q.delete("cs");
      const rest = q.toString();
      window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));
      setBezahlt(true);
      setPayBusy(false);
      setSchritt(3);   // dort steht die Garderobe
      setVideoShow(false); setVideoReif(false);   // NICHT wieder die Kaufknoepfe zeigen
    })();
  }, []);

  // Bezahlt — jetzt darf er aussuchen. Der Kleiderschrank wird ERST hier geladen, nicht
  // fuer jeden Besucher: die Liste interessiert nur den, der schon bezahlt hat.
  useEffect(() => {
    if (videoUrl || videoBusy) return;
    if (schritt !== 3 && !bezahlt) return;     // Garderobe gehoert auf den Kuss-Schritt
    if (looks.length) { if (bezahlt) setWahl(true); return; }
    // OHNE BILD KEINE AUSWAHLFLAECHE — die haengt am erzeugten Bild. Wer sein Gratis-
    // Kontingent aufgebraucht hat und trotzdem zahlt, saehe sonst NICHTS. Fuer ihn laeuft
    // der alte Weg sofort los: bezahlt heisst geliefert, ohne Ausnahme.
    if (bezahlt) setWahl(true);
    void Promise.all([
      fetch("/api/try-this-look", { cache: "no-store" }).then(r => r.json()).catch(() => ({})),
      fetch("/api/wardrobe-garments", { cache: "no-store" }).then(r => r.json()).catch(() => ({ ids: null })),
    ]).then(([l, w]) => {
      setLooks(Array.isArray(l?.looks) ? l.looks : []);
      setNurKleidung(Array.isArray(w?.ids) ? w.ids.map(String) : null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bezahlt, schritt, videoUrl, videoBusy]);

  // BEIM HOCHLADEN SPEICHERN (Owner 30.07.2026: „das Bild muss gespeichert werden in dem
  // Moment wo er das hochlädt"). Der Eintrag im Werkzeug entsteht damit sofort — auch bei
  // denen, die danach abspringen oder deren Erzeugung scheitert. Genau die zeigen, was die
  // Leute wollten. Das Ergebnis wird später an denselben Eintrag nachgetragen.
  const onFile = async (f?: File | null) => {
    if (!f) return;
    try {
      const dataUrl = await fileToDataUrl(f);
      setPhoto(dataUrl); track("photo");
      let device = "";
      try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
      const log = await fetch("/api/kiss-log", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId: selId, modelName: selName, device, personImage: dataUrl }),
      }).then(r => r.json()).catch(() => null);
      if (log?.id) setGenId(log.id);
    } catch { /**/ }
  };
  // Auch IHR Foto wird beim Hochladen abgelegt (Owner 30.07.2026: „ich sehe das Bild von der
  // Frau nicht, die ich hochgeladen habe"). Gibt es schon einen Eintrag, wird er ergänzt;
  // sonst entsteht er hier — je nachdem, was er zuerst hochlädt.
  const onModelFile = async (f?: File | null) => {
    if (!f) return;
    try {
      const dataUrl = await fileToDataUrl(f);
      setCustomModel(dataUrl); setUseCustom(true); track("own_model");
      let device = "";
      try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
      const antwort = await fetch("/api/kiss-log", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: genId
          ? JSON.stringify({ update: genId, modelImage: dataUrl })
          : JSON.stringify({ modelId: selId, modelName: V.upTitle, device, modelImage: dataUrl }),
      }).then(r => r.json()).catch(() => null);
      if (!genId && antwort?.id) setGenId(antwort.id);
    } catch { /**/ }
  };

  // Die aktive Auswahl: entweder die „Your Model"-Karte (eigenes Foto) oder ein Katalog-Model.
  const selPhoto = useCustom ? customModel : (picked?.photoUrl ?? "");
  // Nur echte KLEIDUNGSfotos in die Auswahl — die Liste trennt Kleidung von Fotos, auf
  // denen eine fremde Frau steht. Fehlt sie, zeigen wir alles statt nichts.
  const kleidung = looks.filter(l => !!l.imageUrl && (!nurKleidung || nurKleidung.includes(l.id))).slice(0, 24);
  const selName = useCustom ? V.upTitle : (picked?.name ?? "");
  const selId = useCustom ? "custom" : (picked?.id ?? "");

  // ECHTE Generierung (Pixverse) — läuft nur nach Zahlung oder für Staff.
  const realGenerate = async (token: number): Promise<void> => {
    if (!selPhoto || !photo) return;
    setStatus("Rendering your kiss in full quality … (~1–3 min)");
    try {
      // Gleiche Pipeline wie Try-On: person = Model (@person), garment = dein Foto (@Bild2).
      const start = await fetch("/api/generate-tryon-video", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(pin ? { "x-try-look-admin-pin": pin } : {}) },
        body: JSON.stringify({ lookId: KISS_LOOK_ID, person: selPhoto, garment: photo, prompt: V.prompt }),
      }).then(r => r.json());
      if (!start?.videoId) { setStatus(start?.error || "Could not start."); setBusy(false); return; }
      for (let i = 0; i < 72; i++) {
        await new Promise(r => setTimeout(r, 5000));
        if (runRef.current !== token) return;
        const p = await fetch(`/api/generate-tryon-video?videoId=${encodeURIComponent(start.videoId)}&curatorId=${encodeURIComponent(start.curatorId || "")}`).then(r => r.json()).catch(() => null);
        if (p?.status === "done" && p.videoUrl) {
          setVideoUrl(p.videoUrl); setTeaser(false); setStatus(""); setBusy(false); track("done");
          setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
          // Video-URL im Log nachtragen (Staff: Eintrag jetzt erst anlegen).
          try {
            if (genId) await fetch("/api/kiss-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ update: genId, videoUrl: p.videoUrl }) });
            else await fetch("/api/kiss-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modelId: selId, modelName: selName, videoUrl: p.videoUrl }) });
          } catch { /**/ }
          return;
        }
        if (p?.status === "failed") { setStatus(p.error || "Generation failed."); setBusy(false); return; }
      }
      setStatus("Timeout — please try again later."); setBusy(false);
    } catch { setStatus("Network error."); setBusy(false); }
  };

  // Klick auf „Generate": ein ECHTES Bild, kostenlos.
  //
  // Vorher lief hier eine gespielte Render-Show ohne einen einzigen Aufruf, danach ein
  // verpixeltes Bild und die Kasse. Ergebnis im eigenen Werkzeug: 9 Durchläufe, 0 Zahlungen —
  // niemand hat je erlebt, dass es mit seinem Gesicht funktioniert (Owner: „Ohne Gratis-Test
  // kaufe ich nichts"). Jetzt sieht er zuerst sich und sie, scharf. Bezahlt wird das VIDEO.
  const generate = async () => {
    track("generate");
    if (!selPhoto || !photo || busy) return;
    setSchritt(4);   // eigener Bildschirm fürs Rendern
    setBusy(true); setTeaser(false); setVideoUrl(""); setBild(""); setGenId(""); setStatus("");
    const token = Date.now(); runRef.current = token;
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    // ZEITGEBER MERKEN UND ABBRECHEN. Vorher liefen die Fortschrittstexte einfach weiter und
    // haben die echte Antwort überschrieben: Die Anfrage war beantwortet — auch mit einem
    // Fehler wie „Vorlage abgelehnt" —, auf dem Schirm stand aber weiter „Finishing touches …"
    // und man wartete auf ein Bild, das nie kommt (Owner 30.07.2026: „wo ist die vorschau?").
    const timer: ReturnType<typeof setTimeout>[] = [];
    for (const [at, text] of RENDER_STEPS) {
      timer.push(setTimeout(() => { if (runRef.current === token) setStatus(text); }, at));
    }
    const stoppen = () => { for (const t of timer) clearTimeout(t); timer.length = 0; };
    try {
      let device = "";
      try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
      // ADMIN OHNE DECKEL (Owner 30.07.2026: „mach die Sperre für mich raus … damit ich das
      // testen kann"). Der Schlüssel liegt ohnehin im Gerät; wird er mitgeschickt, erkennt
      // die Route den Admin und zählt nicht mit. Für alle anderen bleibt der Deckel.
      let pin = "";
      try { pin = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { /**/ }
      const r = await fetch("/api/free-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(pin ? { "x-try-look-admin-pin": pin } : {}) },
        body: JSON.stringify({ person: photo, model: selPhoto, theme: "kiss", device, code }),
      });
      const d = await r.json().catch(() => ({}));
      stoppen();
      if (runRef.current !== token) return;
      // 429 = Gratis-Bild schon genutzt. Nicht als Fehler zeigen, sondern als Angebot.
      if (r.status === 429 || d?.limit) {
        // Der Kasten stand weit unten und ging unter (Owner 30.07.2026: „ja das steht
        // tatsächlich, aber es geht unter"). Also hinspringen, wie beim Ergebnis auch.
        setGesperrt(true); setStatus(""); setBusy(false);
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
        return;
      }
      if (!r.ok || !d.image) {
        setStatus(d?.error ?? "That did not work.");
        setGescheitert(true); setBusy(false);
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
        return;
      }
      setBild(d.image); setBildPfad(d.imagePath ?? ""); setFrei(false); setGesperrt(false); setGescheitert(false); setBusy(false); setStatus("");
      // SOFORT MERKEN, nicht erst nach der Adresse (Owner 30.07.2026: „das rendering ist
      // schon wieder abgebrochen" — nach ?cancelled=1 von Stripe). Beim Admin wird das
      // E-Mail-Feld übersprungen, also lief das Merken dort nie: Bild weg, sobald die Seite
      // neu lädt. Jetzt wird es abgelegt, sobald es da ist — für jeden.
      /**
       * WER ANGEMELDET IST, WIRD NICHT NACH SEINER ADRESSE GEFRAGT (Owner 30.07.2026:
       * „wieso muss ich eine email eingeben wenn ich eingeloggt bin?").
       *
       * Die Adresse ist bekannt — sie noch einmal abzutippen ist eine Hürde ohne Gegenwert.
       * Der Eintrag in die Kissing-Liste und die Mail mit dem Bild passieren trotzdem, nur
       * eben still im Hintergrund.
       */
      const angemeldet = (() => { try { return getStoredAuthSession()?.user?.email ?? ""; } catch { return ""; } })();
      void merken(d.image, d.imagePath ?? "", genId, isStaff || !!angemeldet);
      if (angemeldet) {
        setMail(angemeldet); setFrei(true);
        void fetch("/api/kiss-claim", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: angemeldet, imagePath: d.imagePath, device, genId }),
        }).catch(() => {});
        track("email");
        trackMetaPixel("Lead", { content_category: "kiss" });
      }
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
      // Das Ergebnis an den Eintrag hängen, der beim Hochladen entstanden ist. Nur wenn
      // keiner existiert (z. B. Foto aus einer früheren Sitzung), einen neuen anlegen.
      try {
        if (genId) {
          await fetch("/api/kiss-log", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ update: genId, imagePath: d.imagePath }),
          });
        } else {
          const log = await fetch("/api/kiss-log", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ modelId: selId, modelName: selName, device, imagePath: d.imagePath, personPath: d.personPath }),
          }).then(r2 => r2.json());
          if (log?.id && runRef.current === token) setGenId(log.id);
        }
      } catch { /**/ }
    } catch {
      stoppen();
      if (runRef.current === token) { setStatus("Network error."); setBusy(false); }
    }
  };

  // AUS DEM BILD EIN VIDEO. Das erzeugte Bild geht als erster Vollbild an Pixverse; der
  // Bewegungstext ist der Satz des Owners OHNE die @-Marken — die binden Referenzfotos und
  // haben hier keine Bedeutung mehr, weil beide Personen schon im Bild stehen.
  const MOTION_PROMPT =
    "They look at each other and smile, lean in slowly, and share a brief, tender kiss. "
    + "Then they step back a little and smile at each other, happy. Keep both faces and "
    + "appearance exactly the same throughout. Fixed camera, no zoom, no camera movement. "
    + "Fluid natural motion, photorealistic, high-end look. No text or logos.";

  const adresseSenden = async () => {
    const e = mail.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { setStatus("Please enter a valid email address."); return; }
    setMailBusy(true); setStatus("");
    try {
      let device = "";
      try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
      const r = await fetch("/api/kiss-claim", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, imagePath: bildPfad, device, genId, pending: gescheitert }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setStatus(d?.error ?? "That did not work."); setMailBusy(false); return; }
      setFrei(true); setMailBusy(false);
      if (gescheitert) { setGescheitert(false); setStatus("Thanks — we will send it to you."); }
      // META: „Lead" = er hat seine Adresse dagelassen. Genau darauf soll die Kampagne
      // optimieren, wenn kein Sofort-Formular mehr benutzt wird (Owner 30.07.2026).
      trackMetaPixel("Lead", { content_category: "kiss" });
      void merken(bild, bildPfad, genId, true);   // ab jetzt übersteht es Kasse und „Zurück"
      track("email");
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    } catch { setStatus("Network error."); setMailBusy(false); }
  };

  // Der Weg zum Kauf: erst Show, dann Kasse.
  const videoAnstossen = () => {
    if (videoShow || payBusy) return;
    track("video_teaser");
    setVideoShow(true); setVideoReif(false); setStatus("");
    const schritte: [number, string][] = [
      [0, "Reading both faces …"],
      [1600, "Matching your expressions …"],
      [3400, "Bringing the moment to life …"],
      [5200, "Finishing touches …"],
    ];
    for (const [at, t] of schritte) setTimeout(() => setStatus(t), at);
    setTimeout(() => { setVideoShow(false); setVideoReif(true); setStatus(""); }, 6800);
  };

  /**
   * ANZIEHEN ueber FASHN — nicht ueber OpenAI (Owner 30.07.2026: „das geht nicht ueber
   * OpenAI. Dann wird das ganze Bild von ihr an FASHN weitergegeben, weil FASHN das
   * annimmt"). OpenAI prueft am EINGANG und weist Lingerie ab, bevor der Auftrag gelesen
   * wird; FASHN nimmt dasselbe Foto an. Scheitert es trotzdem, laeuft es mit dem
   * Ausgangsfoto weiter — der Kunde hat bezahlt und bekommt auf keinen Fall nichts.
   */
  const anziehen = async (wen: string, look: { id: string; name?: string; imageUrl?: string } | undefined, text: string) => {
    if (!look?.imageUrl || !wen) return wen;
    setStatus(text);
    try {
      const toFile = async (src: string, name: string) => new File([await (await fetch(src)).blob()], name, { type: "image/jpeg" });
      const fd = new FormData();
      fd.append("modelImage", await toFile(wen, "person.jpg"));
      fd.append("image", await toFile(look.imageUrl, "garment.jpg"));
      fd.append("lookId", look.id);
      fd.append("mode", "fashion-model");
      fd.append("aspectRatio", "9:16");
      fd.append("prompt", tryonPrompt({ garment: look.name || "" }));
      const d = await fetch("/api/generate-fashn", {
        method: "POST", body: fd, ...(pin ? { headers: { "x-try-look-admin-pin": pin } } : {}),
      }).then(r => r.json());
      return (d?.image || d?.imageUrl || wen) as string;
    } catch { return wen; }
  };

  /**
   * DAS BEZAHLTE VIDEO — erst anziehen, dann filmen.
   *
   * Reihenfolge ist Pflicht: `holidayPrompt` nennt @image1 (den Mann) zuerst, und Pixverse
   * ordnet das erste Token dem ersten Bildplatz zu. Also SEIN Foto als `person`, ihr
   * angezogenes als `garment`. Wer nur die Token tauscht, bekommt zwei Maenner.
   */
  const kussVideo = async () => {
    if (videoBusy || !selPhoto || !photo) return;
    setWahl(false); setVideoBusy(true); setStatus("");
    const token = Date.now(); runRef.current = token;
    // Keine Szene gewaehlt? Dann nimmt das System eine — „wenn er keine auswaehlt, dann
    // irgendeine automatisch". Er wartet nie wegen einer Pflichtangabe.
    const szene: HolidayScene = HOLIDAY_SCENES.find(x => x.id === szeneId)
      ?? HOLIDAY_SCENES[Math.floor(Date.now() / 1000) % HOLIDAY_SCENES.length];
    try {
      const ihr = await anziehen(selPhoto, looks.find(l => l.id === ihrLook), "Dressing her …");
      if (runRef.current !== token) return;
      const sein = await anziehen(photo, looks.find(l => l.id === seinLook), "Getting you ready …");
      if (runRef.current !== token) return;
      setStatus("Rendering your video … (~1–3 min)");
      const start = await fetch("/api/generate-tryon-video", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(pin ? { "x-try-look-admin-pin": pin } : {}) },
        // AUFLOESUNG NOCH NICHT UMGESTELLT (Owner 30.07.2026: „ok, aber jetzt noch nicht
        // umstellen"). Die Route kann 540p — sie wird nur noch nicht danach gefragt, damit
        // die Testlaeufe billig bleiben. Umlegen ist ein Wort: `hd: true` ergaenzen.
        body: JSON.stringify({ lookId: KISS_LOOK_ID, person: sein, garment: ihr, prompt: holidayPrompt(szene) }),
      }).then(r => r.json());
      if (!start?.videoId) { setStatus(start?.error ?? "Could not start."); setVideoBusy(false); setWahl(true); return; }
      for (let i = 0; i < 90; i++) {
        await new Promise(res => setTimeout(res, 4000));
        if (runRef.current !== token) return;
        setStatus(`Making your video … (${Math.round((i + 1) * 4)} s)`);
        const q = await fetch(`/api/generate-tryon-video?videoId=${encodeURIComponent(start.videoId)}&curatorId=${encodeURIComponent(start.curatorId || "")}`).then(r => r.json()).catch(() => null);
        if (q?.status === "done" && q.videoUrl) {
          setVideoUrl(q.videoUrl); setStatus(""); setVideoBusy(false);
          try { if (genId) await fetch("/api/kiss-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ update: genId, videoUrl: q.videoUrl }) }); } catch { /**/ }
          return;
        }
        if (q?.status === "failed") { setStatus(q.error || "The video failed."); setVideoBusy(false); setWahl(true); return; }
      }
      setStatus("Timeout — please try again."); setVideoBusy(false); setWahl(true);
    } catch { setStatus("Network error."); setVideoBusy(false); setWahl(true); }
  };

  const zuVideo = async () => {
    if (!bild || videoBusy) return;
    setVideoBusy(true); setStatus("");
    const token = Date.now(); runRef.current = token;
    try {
      const start = await fetch("/api/generate-tryon-video", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lookId: KISS_LOOK_ID, image: bild, prompt: MOTION_PROMPT }),
      }).then(r => r.json());
      if (!start?.videoId) { setStatus(start?.error ?? "Video-Start fehlgeschlagen."); setVideoBusy(false); return; }
      for (let i = 0; i < 90; i++) {
        await new Promise(res => setTimeout(res, 4000));
        if (runRef.current !== token) return;
        setStatus(`Making the video … (${Math.round((i + 1) * 4)} s)`);
        const p = await fetch(`/api/generate-tryon-video?videoId=${encodeURIComponent(start.videoId)}&curatorId=${encodeURIComponent(start.curatorId || "")}`).then(r => r.json()).catch(() => null);
        if (p?.status === "done" && p.videoUrl) {
          setVideoUrl(p.videoUrl); setStatus(""); setVideoBusy(false);
          try { if (genId) await fetch("/api/kiss-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ update: genId, videoUrl: p.videoUrl }) }); } catch { /**/ }
          return;
        }
        if (p?.status === "failed") { setStatus(p.error || "Das Video ist fehlgeschlagen."); setVideoBusy(false); return; }
      }
      setStatus("Timeout — please try again later."); setVideoBusy(false);
    } catch { setStatus("Network error."); setVideoBusy(false); }
  };

  const unlock = async (einmal = false) => {
    track("checkout");
    if (payBusy) return;
    if (isStaff) {
      // Auch der Admin-Weg fuehrt in die Auswahl — sonst testet er einen Ablauf, den der
      // Kunde nie sieht.
      setBezahlt(true);
      return;
    }
    setPayBusy(true); setStatus("");
    trackMetaPixel("InitiateCheckout", { value: einmal ? 9.99 : 24.5, currency: "EUR", content_name: einmal ? "Kiss video" : "Topic subscription" });
    try {
      const start = await fetch("/api/kiss-video-checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, genId, once: einmal, subId: new URLSearchParams(window.location.search).get("s") || "", returnTo: window.location.pathname + window.location.search }) }).then(r => r.json());
      if (!start?.url || !start?.sessionId) { setStatus(start?.error || "Checkout could not start."); setPayBusy(false); return; }
      const popup = window.open(start.url, "_blank", "popup,width=480,height=780");
      if (!popup) { window.location.href = start.url; return; } // Popup blockiert → gleiche Seite
      for (let i = 0; i < 100; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const s = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(start.sessionId)}`).then(r => r.json()).catch(() => null);
        if (s?.paid) {
          try { popup.close(); } catch { /**/ }
          setPayBusy(false);
          trackMetaPixel("Purchase", { value: einmal ? 9.99 : 24.5, currency: "EUR", content_name: einmal ? "Kiss video" : "Topic subscription" });
          // BEZAHLT → AUSSUCHEN, nicht sofort rendern (Owner 30.07.2026: „Na gut und jetzt?
          // Wann kann er sich die Klamotten und die Szene auswaehlen?"). Vorher lief hier
          // direkt das alte Rendern des Standbildes los — die Auswahl bekam er nie zu sehen,
          // egal ob er ueber das Kassen-Fenster oder ueber die Rueckleitung kam.
          setBezahlt(true);
          return;
        }
        if (popup.closed && i > 2) break; // Popup zu ohne Zahlung → aufhören zu pollen
      }
      setPayBusy(false);
    } catch { setStatus("Network error."); setPayBusy(false); }
  };

  return (
    <div className="mt-8">
      {/* ZURUECK IN DER SPRACHZEILE, EINE REIHE (Owner 30.07.2026: „Back Button in dem Balken
          mit den Sprachen stehen" / „in einer Reihe"). `mr-auto` schiebt ihn in der
          rechtsbuendigen Zeile nach links — Zurueck links, Sprache rechts, kein zweiter
          Balken. Erst ab Schritt 2, denn von Schritt 1 fuehrt kein Weg zurueck. */}
      {langZeile && schritt > 1 && createPortal(
        <button type="button"
          onClick={() => setSchritt(schritt === 4 ? 3 : schritt === 3 ? 2 : 1)}
          className="mr-auto h-9 rounded-full px-4 text-[13px] font-black active:scale-95 transition"
          style={{ border: "1px solid rgba(24,119,242,0.35)", color: "#1877f2" }}>
          ← Back
        </button>,
        langZeile,
      )}
      {/* 1) Model wählen — das 3D-Coverflow aus dem Try-On-Funnel: die Gewählte steht groß
          vorn, die Nachbarinnen kippen seitlich weg; Tipp auf eine Seitenkarte oder Swipe
          holt sie nach vorn (= Auswahl). */}
      {/* Fortschritt — drei Punkte, damit er weiss, wo er steht. */}
      <div className="mb-3 flex items-center justify-center gap-1.5">
        {[1, 2, 3, 4].map(n => (
          <span key={n} className={`h-1.5 rounded-full transition-all ${n === schritt ? "w-6 bg-[#f6cf51]" : n < schritt ? "w-3 bg-[#f6cf51]/50" : "w-3 bg-white/20"}`} />
        ))}
      </div>

      {schritt === 1 && (<>
      <p className="text-[12px] font-black uppercase tracking-wide text-white/50">{V.step1}</p>
      <p className="mt-1 text-[13px] font-bold text-white/85">{V.pickHint}</p>
      {(() => {
        if (models.length === 0) return <div className="grid h-[46vw] max-h-[240px] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-white/50" /></div>;
        // „Your Model" lebt IM Karussell als Karte (3. Position, wie „Your photo" im Try-On):
        // eigenes Model-Foto hochladen — die Karte vorn = Auswahl.
        const YOURMODEL: Model = { id: "__yourmodel", name: V.upTitle, photoUrl: "" };
        const cards = [...models];
        // IN DIE MITTE, nicht ganz an den Anfang (Owner 30.07.2026: „mach die nicht ganz am
        // Anfang des Karussells sondern die Mitte"). Vorn wirkte die Upload-Karte wie der
        // vorgeschriebene Weg; in der Mitte steht sie gleichberechtigt neben unseren Frauen,
        // und man sieht links wie rechts, dass es Auswahl gibt.
        const uploadIdx = V.upFirst ? Math.floor(cards.length / 2) : Math.min(2, cards.length);
        cards.splice(uploadIdx, 0, YOURMODEL);
        const active = useCustom ? uploadIdx : Math.max(0, cards.findIndex(m => m.id === picked?.id));
        // Nach-vorn-holen zentriert NUR (auch die „Your model"-Karte — Owner-Vorgabe);
        // das Upload-Fenster öffnet erst der Tipp auf die bereits VORDERE Karte (im onClick).
        const setFront = (m: Model) => {
          if (m.id === "__yourmodel") { setUseCustom(true); return; }
          setUseCustom(false); setPicked(m);
        };
        const slide = (dir: number) => {
          const ni = Math.min(cards.length - 1, Math.max(0, active + dir));
          if (ni !== active) setFront(cards[ni]);
        };
        return (
          <div className="relative mx-auto mt-2 h-[72vw] max-h-[300px] select-none overflow-hidden touch-pan-y" style={{ perspective: "1100px" }}
            onPointerDown={(e) => { swipeRef.current = e.clientX; swipedRef.current = false; }}
            onPointerUp={(e) => { const dx = e.clientX - swipeRef.current; if (Math.abs(dx) > 30) { swipedRef.current = true; slide(dx < 0 ? 1 : -1); } }}>
            {cards.map((m, i) => {
              const off = i - active;
              if (Math.abs(off) > 2) return null;
              const isActive = off === 0;
              const isUpload = m.id === "__yourmodel";
              return (
                <div key={m.id}
                  onClick={() => { if (swipedRef.current) { swipedRef.current = false; return; } if (isUpload) { if (!isActive) { setFront(m); return; } modelFileRef.current?.click(); return; } if (!isActive) setFront(m); }}
                  className="absolute left-1/2 top-1/2 w-[54%] max-w-[220px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-2xl transition-all duration-300 ease-out"
                  style={{ transform: `translate(-50%,-50%) translateX(${off * 56}%) rotateY(${-off * 38}deg) scale(${isActive ? 1 : 0.82})`, zIndex: 20 - Math.abs(off), opacity: Math.abs(off) === 2 ? 0.45 : 1, cursor: "pointer" }}>
                  <div className="relative aspect-[3/4] w-full">
                    {isUpload && !customModel ? (
                      // Solide Fläche (nicht transparent — Owner-Vorgabe): warmes Dunkelbraun.
                      <div className="relative flex h-full w-full flex-col items-center justify-center gap-2 bg-[#241c11] px-3 text-center">
                        {V.upPlaceholder && (
                          // eslint-disable-next-line @next/next/no-img-element
                          // DEUTLICHER (Owner 30.07.2026: „Bild von Frau, das muss deutlicher
                          // werden"). Vorher 25 % und grau — man erkannte kaum, dass dort eine
                          // Frau hingehört. Jetzt 70 % und in Farbe, dazu ein dunkler Verlauf,
                          // damit die Schrift darüber lesbar bleibt.
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={V.upPlaceholder} alt="" className="absolute inset-0 h-full w-full object-cover object-top opacity-95" />
                            <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                          </>
                        )}
                        {/* Dunkle Scheibe hinter der Schrift: auf einem hellen Foto (und in
                            der hellen Fassung) war der Text sonst nicht zu lesen. */}
                        <span data-oncard="1" className="absolute inset-x-3 top-1/2 z-10 -translate-y-1/2 rounded-2xl bg-black/55 px-2 py-3 backdrop-blur-[2px]" />
                        <ImageUp style={{ color: "#fff" }} className="relative z-20 h-9 w-9" />
                        <span style={{ color: "#fff", textShadow: "0 1px 6px rgba(0,0,0,0.95)" }} className="relative z-20 text-[15px] font-black">{V.upTitle}</span>
                        <span style={{ color: "#fff", textShadow: "0 1px 6px rgba(0,0,0,0.95)" }} className="relative z-20 mt-1 px-2 text-[11px] font-bold leading-snug">{V.upHint}</span>
                      </div>
                    ) : (<>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={isUpload ? customModel : m.photoUrl} alt={m.name} draggable={false} className="h-full w-full object-cover object-top" />
                      {isUpload && isActive && (
                        <span className="absolute inset-x-3 bottom-8 rounded-full bg-black/60 py-1 text-center text-[10px] font-black text-white backdrop-blur">Tap to change photo</span>
                      )}
                    </>)}
                    {isActive && (!isUpload || !!customModel) && <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-[#f6cf51] shadow"><Check className="h-4 w-4 text-black" /></span>}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2 pt-6">
                      <p className="lb-onmedia truncate text-[13px] font-black">{m.name}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
      <input ref={modelFileRef} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={e => void onModelFile(e.target.files?.[0])} />

      {/* 2) Eigenes Foto */}
      <button type="button" onClick={() => setSchritt(2)} disabled={!selPhoto}
        className="lb-gold mt-4 flex h-12 w-full items-center justify-center rounded-full text-[15px] font-black active:scale-95 transition disabled:opacity-40">
        {selPhoto ? "Next →" : "Pick her first"}
      </button>
      </>)}

      {schritt === 2 && (<>
      <p className="text-[12px] font-black uppercase tracking-wide text-white/50">2 · Your photo — you, the man</p>
      <button type="button" onClick={() => fileRef.current?.click()}
        className="relative mx-auto mt-2 flex aspect-square w-[46vw] max-w-[210px] flex-col items-center justify-center gap-2 overflow-hidden rounded-3xl border-2 border-dashed border-[#f6cf51]/40 bg-[#f6cf51]/[0.06] active:scale-[0.98] transition">
        {photo
          ? (<>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="" className="h-full w-full object-cover" />
              {/* GROSS UND WEISS: „YOU" (Owner 30.07.2026). Ein echter Besucher lud hier eine
                  Frau hoch — die Beschriftung daneben reichte nicht. Auf dem Foto selbst
                  kann man es nicht übersehen. */}
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pb-2 pt-8 text-[26px] font-black tracking-wide"
                style={{ color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.85)" }}>
                YOU
              </span>
            </>)
          : (<>
              {/* Platzhalter-Gesicht (abgedunkelt): zeigt auf einen Blick, dass hier ein
                  MANN bzw. der Nutzer selbst hingehört — nicht noch ein Model. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {/* DEUTLICH UND FARBIG (Owner 30.07.2026: „du musst das Preview-Bild beim Mann
                  und Frau deutlicher machen, farbig. Sie sehen das auf dem Handy nicht, weil
                  zu dunkel"). Ein echter Besucher hat hier am 30.07. um 11:22 eine Frau im
                  Bikini hochgeladen — und bekam nichts, weil die Bildprüfung das abweist.
                  Vorher lag das Foto bei 25 % und grau; man sah schlicht nicht, dass dort ein
                  MANN hingehört. */}
              <img src={PLACEHOLDER_MAN} alt="" className="absolute inset-0 h-full w-full object-cover opacity-95" />
              <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <ImageUp className="relative h-8 w-8 text-[#f6cf51]" />
              <span className="relative text-[30px] font-black tracking-wide" style={{ color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.85)" }}>YOU</span>
              <span className="relative text-[13px] font-black text-[#f6cf51]">Upload your photo</span>
              <span className="relative mt-0.5 px-3 text-[11px] font-bold leading-snug text-white/85">
                A photo of you — the man in the picture
              </span>
            </>)}
      </button>
      {photo && (
        <button type="button" onClick={() => fileRef.current?.click()} className="mx-auto mt-2 flex items-center gap-1.5 text-[12px] font-black text-white/60">
          <RefreshCw className="h-3.5 w-3.5" /> Change photo
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={e => void onFile(e.target.files?.[0])} />

      {/* 3) Generieren */}
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => setSchritt(3)} disabled={!photo}
          className="lb-gold flex h-12 flex-1 items-center justify-center rounded-full text-[15px] font-black active:scale-95 transition disabled:opacity-40">
          {photo ? "Next →" : "Upload your photo"}
        </button>
      </div>
      </>)}

      {schritt === 4 && (
        <div className="mb-3 text-center">
          <p className="text-[12px] font-black uppercase tracking-wide text-white/50">4 · Your picture</p>
        </div>
      )}

      {schritt === 3 && (<>
      <p className="text-[12px] font-black uppercase tracking-wide text-white/50">{V.step3}</p>
      {/* BEIDE NEBENEINANDER (Owner 30.07.2026: „ich sehe uns nicht nebeneinander"). In den
          Schritten davor hat er sie einzeln gewählt; hier muss er sehen, wer gleich mit wem
          im Bild landet — sonst generiert er blind. */}
      {(selPhoto || photo) && (
        <div className="mt-2 flex items-center justify-center gap-2">
          {selPhoto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selPhoto} alt="" className="aspect-[3/4] w-[86px] rounded-xl border border-white/15 object-cover object-top" />
          )}
          <span className="text-[20px]">💋</span>
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="aspect-[3/4] w-[86px] rounded-xl border border-[#f6cf51]/40 object-cover object-top" />
          )}
        </div>
      )}
      {/* DIE GARDEROBE — sichtbar, aber verschlossen (Owner 30.07.2026: „drunter muss die
          Wardrobe stehen. Es koennte auch jetzt stehen aber ist gesperrt und muesste stehen
          das wird freigegeben fuer bezahlte Videos"). Zeigen schlaegt versprechen: er sieht,
          was er bekommt, und das Schloss sagt ihm, wie er drankommt. */}
      {kleidung.length > 0 && (
        <div className="relative mt-2 rounded-2xl p-3" style={{ background: "#fff", color: "#1a160f" }}>
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-black">Wardrobe & scene</p>
            {!bezahlt && !isStaff && (
              <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black"
                style={{ background: "rgba(0,0,0,0.07)" }}>
                <Lock className="h-3 w-3" /> Paid videos
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] font-semibold" style={{ opacity: 0.6 }}>
            {bezahlt || isStaff
              ? "Dress her, keep your own clothes or change them, pick the moment."
              : "Unlocked with a paid video — dress her, pick the moment."}
          </p>

          <div style={bezahlt || isStaff ? undefined : { opacity: 0.45, filter: "blur(1.5px)", pointerEvents: "none" }}>
            <p className="mt-2.5 text-[11px] font-black">Her dress</p>
            <div className="mt-1.5 flex gap-2 overflow-x-auto pb-1">
              <button type="button" onClick={() => setIhrLook("")}
                className="shrink-0 rounded-xl px-2.5 py-1.5 text-[10px] font-black"
                style={ihrLook === "" ? { background: "#1877f2", color: "#fff" } : { background: "rgba(0,0,0,0.06)" }}>
                As in the photo
              </button>
              {kleidung.map(l => (
                <button key={l.id} type="button" onClick={() => setIhrLook(l.id)} className="shrink-0 overflow-hidden rounded-xl"
                  style={{ outline: ihrLook === l.id ? "3px solid #1877f2" : "1px solid rgba(0,0,0,0.12)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.imageUrl} alt={l.name ?? ""} className="h-[58px] w-[44px] object-cover" />
                </button>
              ))}
            </div>

            <p className="mt-2.5 text-[11px] font-black">Your clothes</p>
            <div className="mt-1.5 flex gap-2 overflow-x-auto pb-1">
              <button type="button" onClick={() => setSeinLook("")}
                className="shrink-0 rounded-xl px-2.5 py-1.5 text-[10px] font-black"
                style={seinLook === "" ? { background: "#1877f2", color: "#fff" } : { background: "rgba(0,0,0,0.06)" }}>
                My own clothes
              </button>
              {kleidung.map(l => (
                <button key={l.id} type="button" onClick={() => setSeinLook(l.id)} className="shrink-0 overflow-hidden rounded-xl"
                  style={{ outline: seinLook === l.id ? "3px solid #1877f2" : "1px solid rgba(0,0,0,0.12)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.imageUrl} alt={l.name ?? ""} className="h-[58px] w-[44px] object-cover" />
                </button>
              ))}
            </div>

            <p className="mt-2.5 text-[11px] font-black">The moment</p>
            <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
              <button type="button" onClick={() => setSzeneId("")}
                className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black"
                style={szeneId === "" ? { background: "#1877f2", color: "#fff" } : { background: "rgba(0,0,0,0.06)" }}>
                ✨ Surprise me
              </button>
              {HOLIDAY_SCENES.map(sc => (
                <button key={sc.id} type="button" onClick={() => setSzeneId(sc.id)}
                  className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black"
                  style={szeneId === sc.id
                    ? { background: "#1877f2", color: "#fff", whiteSpace: "nowrap" }
                    : { background: "rgba(0,0,0,0.06)", whiteSpace: "nowrap" }}>
                  {sc.emoji} {sc.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <label className="mt-2 flex cursor-pointer items-start gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#f6cf51]" />
        <span className="text-[12px] font-bold leading-snug text-white/70">
          Yes, I want this video. I may use these photos, everyone shown is an adult, I keep it
          private — and I take responsibility for it.
        </span>
      </label>
      {/* NACH DER ZAHLUNG HEISST ER ANDERS (Owner 30.07.2026: „muesste dann statt generate
          picture, generate Video stehen (bezahlt)"). Derselbe Platz, andere Aufgabe: vorher
          das Gratis-Bild, danach das bezahlte Video aus Garderobe und Szene. */}
      <button type="button" onClick={() => void (bezahlt ? kussVideo() : generate())}
        disabled={!selPhoto || !photo || !consent || busy || videoBusy}
        className="lb-gold mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-black active:scale-95 transition disabled:opacity-50">
        {busy || videoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : bezahlt ? "🎬" : "💋"}
        {busy || videoBusy ? (status || "Rendering …") : bezahlt ? "Generate video" : V.cta}
      </button>
      {/* Der Preis steht DIREKT unter dem Knopf, nicht erst hinter dem Ergebnis (Owner
          30.07.2026: „hier muss Generate Picture free Button stehen oben und Video 9,99").
          Er soll vorher wissen, was gratis ist und was kostet — sonst fühlt sich die Kasse
          nach dem Warten wie eine Falle an. */}
      <p className="mt-1.5 text-center text-[12px] font-bold text-white/70">
        {bezahlt ? "✓ Paid — everything below is included" : fillPrices("Picture free · Video {once}")}
      </p>

      </>)}

      {/* BLEIBT IMMER STEHEN, in jedem Schritt (Owner 30.07.2026: „die Beispielvideos und
          Buttons bleiben dann drunter immer"). Wer schon weiss, dass er das Video will, soll
          nicht erst durch alle Schritte. Gesperrt, solange Fotos oder Haken fehlen. */}
      {!isStaff && (
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={() => void unlock(true)}
            disabled={!selPhoto || !photo || !consent || payBusy}
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-[#f6cf51]/60 px-3 text-[12px] font-black text-[#f6cf51] active:scale-95 transition disabled:opacity-40">
            {payBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
            {fillPrices("Hot video {once}")}
          </button>
          <button type="button" onClick={() => void unlock(false)}
            disabled={!selPhoto || !photo || !consent || payBusy}
            style={{ color: "#fff" }}
            className="flex h-11 flex-1 items-center justify-center rounded-full border border-white/30 px-3 text-[12px] font-black active:scale-95 transition disabled:opacity-40">
            {fillPrices("All in — {price}/mo")}
          </button>
        </div>
      )}
      {status && <p className="mt-2 text-center text-[12px] font-bold text-white/60">{status}</p>}

      {/* Ergebnisbereich — der Screen springt hierher (Radar → Teaser → echtes Video). */}
      <div ref={resultRef}>
        {/* Radar-Scan (wie der Try-On-„Reveal"): Scanner-Balken + Sucher-Ecken über dem Model-Foto. */}
        {busy && !videoUrl && !!selPhoto && (
          <div className="mx-auto mt-4 w-full max-w-[420px]">
            <div className="relative overflow-hidden rounded-3xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selPhoto} alt="" className="aspect-[3/4] w-full object-cover object-top blur-[6px] brightness-75" />
              {/* Weißer Scanner-Balken, fährt runter und wieder hoch. */}
              <div className="lb-scanline pointer-events-none absolute inset-x-0 z-10 h-[2px] bg-white shadow-[0_0_18px_5px_rgba(255,255,255,0.7)]" />
              <div className="lb-scanline pointer-events-none absolute inset-x-0 z-10 h-14 -translate-y-1/2 bg-gradient-to-b from-transparent via-white/15 to-transparent" />
              {/* Kamera-Sucher-Ecken. */}
              <div className="pointer-events-none absolute left-3 top-3 z-20 h-6 w-6 rounded-tl-lg border-l-2 border-t-2 border-white/90" />
              <div className="pointer-events-none absolute right-3 top-3 z-20 h-6 w-6 rounded-tr-lg border-r-2 border-t-2 border-white/90" />
              <div className="pointer-events-none absolute bottom-3 left-3 z-20 h-6 w-6 rounded-bl-lg border-b-2 border-l-2 border-white/90" />
              <div className="pointer-events-none absolute bottom-3 right-3 z-20 h-6 w-6 rounded-br-lg border-b-2 border-r-2 border-white/90" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-2 bg-gradient-to-t from-black/70 to-transparent p-4 pt-12 text-white">
                <Sparkles className="h-4 w-4 animate-pulse" />
                <span className="text-[12px] font-black">{status || "Rendering …"}</span>
              </div>
            </div>
          </div>
        )}

        {/* Fake-Teaser: „fertig", aber verpixelt (Model-Foto hinter starkem Blur) + Kauf-CTA */}
        {/* GESCHEITERT → Adresse einsammeln statt stumm scheitern. Vier von zehn echten
            Besuchern haben heute hochgeladen und nichts bekommen; gefragt wurde erst nach dem
            fertigen Bild, also hinterliessen ausgerechnet sie keine Spur. */}
        {gescheitert && !bild && !videoUrl && (
          <div className="mx-auto mt-4 w-full max-w-[340px] rounded-3xl border border-white/15 bg-white/[0.05] p-5 text-center">
            <p className="text-[16px] font-black text-white">That did not come through</p>
            <p className="mt-1 text-[12px] font-bold leading-snug text-white/75">
              Leave your email — we send you your picture as soon as it is ready.
            </p>
            <input value={mail} onChange={e => setMail(e.target.value)} type="email"
              inputMode="email" autoComplete="email" placeholder="you@email.com"
              onKeyDown={e => { if (e.key === "Enter") void adresseSenden(); }}
              className="mt-3 h-12 w-full rounded-xl border border-white/25 bg-black/50 px-3 text-center text-[15px] font-bold text-white outline-none placeholder:text-white/40 focus:border-[#f6cf51]" />
            <button type="button" onClick={() => void adresseSenden()} disabled={mailBusy}
              className="lb-gold lb-buy mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full font-black active:scale-95 transition disabled:opacity-60">
              {mailBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {mailBusy ? "One moment …" : "Send it to me"}
            </button>
            <button type="button" onClick={() => { setGescheitert(false); void generate(); }}
              style={{ color: "#fff" }}
              className="mt-2 flex h-10 w-full items-center justify-center rounded-full border border-white/30 text-[12px] font-black active:scale-95 transition">
              Or try again
            </button>
          </div>
        )}

        {/* GRATIS AUFGEBRAUCHT → sofort weiter, nicht abwürgen. Ein Satz „schon genutzt"
            ohne Knopf ist das Ende des Trichters; hier stehen beide Wege direkt darunter. */}
        {gesperrt && !bild && !videoUrl && (
          <div className="mx-auto mt-4 w-full max-w-[340px] rounded-3xl border border-[#f6cf51]/30 bg-[#f6cf51]/[0.06] p-5 text-center">
            <p className="text-[16px] font-black text-white">Your free picture is used up</p>
            <p className="mt-1 text-[12px] font-bold leading-snug text-white/75">
              Three free pictures per person. Keep going with the video — or unlock everything.
            </p>
            <button type="button" onClick={() => void unlock(true)} disabled={payBusy}
              className="lb-gold lb-buy mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full font-black active:scale-95 transition disabled:opacity-60">
              {payBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              {fillPrices("Make a real kiss video — {once}")}
            </button>
            <button type="button" onClick={() => void unlock(false)} disabled={payBusy}
              style={{ color: "#fff" }}
              className="mt-2 flex h-11 w-full items-center justify-center rounded-full border border-white/40 text-[12px] font-black active:scale-95 transition disabled:opacity-60">
              {fillPrices("Unlock everything — {price}/month")}
            </button>
            <p className="mt-2 text-[10px] font-medium leading-snug text-white/60">
              {renewNote("en")}
            </p>
          </div>
        )}

        {/* RAHMEN = BILD (Owner 30.07.2026: „das Bild ist schmaler als der Rahmen").
            Vorher schrumpfte der Kasten mit `w-fit` auf die URSPRUENGLICHE Bildbreite,
            waehrend `max-h-[60vh]` das Bild kleiner rechnete — rechts blieb ein heller
            Streifen, und die Herzen flogen daneben, weil die Ueberlagerungen `inset-0`
            dem Kasten folgen, nicht dem Foto. Jetzt gibt die Breite den Ton an und das
            Bild fuellt sie aus: Rahmen und Foto koennen nicht auseinanderlaufen. */}
        {/* DAS ERZEUGTE BILD — scharf, kein Schloss (Owner 30.07.2026: „Bild gratis Mann,
            Video gegen Geld"). Darunter der Weg zum Video: Admin gratis, Kunde 9,99 € oder Abo. */}
        {bild && !videoUrl && (
          <div className="mx-auto mt-4 w-full max-w-[420px]">
            <div className="relative overflow-hidden rounded-3xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bild} alt=""
                className={`block h-auto w-full object-cover transition ${frei || isStaff ? "" : "blur-2xl scale-105"}`} />
              {/* VERDECKT, BIS DIE ADRESSE DA IST. Das Bild EXISTIERT bereits — es ist keine
                  Attrappe wie früher, sondern sein fertiges Ergebnis. Genau deshalb trägt er
                  ein: er weiß, dass es da ist. */}
              {/* AUFSTEIGENDE HERZEN auf dem fertigen Bild. Erst wenn er es sehen darf —
                  vorher liegt die E-Mail-Schranke darueber und Herzen waeren nur Unruhe. */}
              {(frei || isStaff) && !videoShow && (
                <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
                  {[...Array(14)].map((_, i) => (
                    <span key={i} className="lb-heart"
                      style={{
                        left: `${6 + (i * 6.7) % 88}%`,
                        animationDelay: `${(i * 0.31) % 4.2}s`,
                        animationDuration: `${3.6 + (i % 5) * 0.35}s`,
                        fontSize: `${14 + (i % 4) * 5}px`,
                        ["--lb-drift" as string]: `${(i % 2 ? 1 : -1) * (8 + (i % 3) * 10)}px`,
                      }}>
                      {i % 3 === 0 ? "💖" : i % 3 === 1 ? "❤️" : "💗"}
                    </span>
                  ))}
                  {/* Reaktionen als Sprechblasen — ohne Namen, siehe .lb-bubble in globals.css */}
                  {["wow 🔥", "😍", "yes — kiss her!", "💋", "so hot", "❤️", "omg", "perfect"].map((t, i) => (
                    <span key={t} className="lb-bubble"
                      style={{
                        left: `${8 + (i * 11) % 66}%`,
                        animationDelay: `${1.2 + (i * 0.72) % 5.4}s`,
                        animationDuration: `${5 + (i % 3) * 0.6}s`,
                        ["--lb-drift" as string]: `${(i % 2 ? 1 : -1) * (10 + (i % 3) * 8)}px`,
                      }}>
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* RENDER-SHOW AUF DEM BILD (Owner 30.07.2026: „du musst wieder das Fake-
                  Rendering zeigen und auf dem Bild machst du den Button"). Vorher lief die
                  Show über dem Knopf und der Kauf stand in einem Kasten darunter — man sah
                  das Bild nicht mehr, um das es geht. */}
              {videoShow && (
                <div className="absolute inset-0 z-20 grid place-items-center bg-black/55">
                  <div className="px-6 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#f6cf51]" />
                    <p className="lb-onmedia mt-3 text-[14px] font-black">{status || "Making your kiss video …"}</p>
                  </div>
                  <span className="lb-scanline pointer-events-none absolute inset-x-0 z-10 h-[2px] bg-white shadow-[0_0_18px_5px_rgba(255,255,255,0.7)]" />
                </div>
              )}

              {/* BEZAHLT ODER AUF DEM WEG DORTHIN — niemals wieder die Kasse zeigen.
                  Owner 30.07.2026: „schon wieder springt er vom Stripe zurück zum Zahlen.
                  Dann 1 Minute später kommt das Video plötzlich." Die Kaufflaeche blieb
                  waehrend Zahlung UND Rendern stehen; fuer den Kunden sah es aus, als solle
                  er ein zweites Mal zahlen. Ab hier steht dort, was gerade passiert. */}
              {(payBusy || (bezahlt && !wahl) || videoBusy) && !videoUrl && !isStaff && (
                <div className="absolute inset-0 z-30 grid place-items-center bg-black/70 p-5">
                  <div className="w-full max-w-[300px] text-center">
                    <Loader2 className="mx-auto h-7 w-7 animate-spin text-white" />
                    <p className="lb-onmedia mt-3 text-[16px] font-black">
                      {bezahlt || videoBusy ? "Payment received ✓" : "Opening secure checkout …"}
                    </p>
                    <p className="lb-onmedia mt-1 text-[12px] font-bold opacity-85">
                      {status || (bezahlt || videoBusy
                        ? "Making your video — this takes about a minute. Stay on this page."
                        : "Complete the payment in the window that just opened.")}
                    </p>
                  </div>
                </div>
              )}

              {videoReif && !isStaff && !payBusy && !bezahlt && !videoBusy && !videoUrl && (
                <div className="absolute inset-0 z-20 grid place-items-center bg-black/60 p-5">
                  <div className="w-full max-w-[300px] text-center">
                    <p className="lb-onmedia text-[17px] font-black">Your video is ready 🔥</p>
                    <p className="lb-onmedia mt-1 text-[12px] font-bold opacity-85">Unlock it and watch the two of you.</p>
                    <button type="button" onClick={() => void unlock(true)} disabled={payBusy}
                      className="lb-gold lb-buy mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full font-black active:scale-95 transition disabled:opacity-60">
                      {payBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                      {fillPrices("Watch my kiss video — {once}")}
                    </button>
                    {/* VOLLE WEISSE FLÄCHE statt durchsichtig (Owner 30.07.2026: „ich kann den
                        Button nicht lesen. Es muss weiss sein oder den Button nicht
                        transparent machen sondern weiss"). Auf einem Foto ist ein
                        durchsichtiger Knopf nie zuverlässig lesbar — das Motiv darunter
                        entscheidet. Weisse Fläche mit dunkler Schrift liest sich auf jedem
                        Bild, in der hellen wie in der dunklen Fassung. */}
                    <button type="button" onClick={() => void unlock(false)} disabled={payBusy}
                      style={{ background: "#fff", color: "#1a160f" }}
                      className="mt-2 flex h-11 w-full items-center justify-center rounded-full text-[12px] font-black shadow-md active:scale-95 transition disabled:opacity-60">
                      {fillPrices("Or unlock everything — {price}/month")}
                    </button>
                  </div>
                </div>
              )}

              {!frei && !isStaff && (
                <div className="absolute inset-0 grid place-items-center bg-black/45 p-5">
                  <div className="w-full max-w-[300px] text-center">
                    <p className="lb-onmedia text-[16px] font-black">Your picture is ready ✨</p>
                    <p className="lb-onmedia mt-1 text-[12px] font-bold opacity-85">
                      Enter your email — you see it right away and it stays yours.
                    </p>
                    <input value={mail} onChange={e => setMail(e.target.value)} type="email"
                      inputMode="email" autoComplete="email" placeholder="you@email.com"
                      onKeyDown={e => { if (e.key === "Enter") void adresseSenden(); }}
                      // Farbe fest am Feld: die Hell-Fassung faerbt `text-white` dunkel — auf
                      // der schwarzen Auflage war die eingetippte Adresse dann unlesbar.
                      style={{ color: "#fff", WebkitTextFillColor: "#fff", caretColor: "#fff" }}
                      className="mt-3 h-12 w-full rounded-xl border border-white/25 bg-black/50 px-3 text-center text-[15px] font-bold outline-none placeholder:text-white/40 focus:border-[#f6cf51]" />
                    <button type="button" onClick={() => void adresseSenden()} disabled={mailBusy}
                      className="lb-gold lb-buy mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full font-black active:scale-95 transition disabled:opacity-60">
                      {mailBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {mailBusy ? "One moment …" : "Show me the picture"}
                    </button>
                    <p className="lb-onmedia mt-2 text-[10px] font-medium leading-snug opacity-70">
                      Free. We also send the picture to your inbox.
                    </p>
                  </div>
                </div>
              )}
            </div>
            {/* NACH DER SHOW: der Kauf. Erst hier fällt der Preis — der Owner will, dass er
                den Moment erlebt, bevor er zahlt („er hat nämlich nichts bezahlt, nur
                gegafft"). */}
            <div className={`mt-3 w-full ${(frei || isStaff) && !videoReif ? "" : "hidden"}`}>
              {isStaff ? (
                <button type="button" onClick={() => void zuVideo()} disabled={videoBusy}
                  className="lb-gold lb-buy flex w-full items-center justify-center gap-2 rounded-full font-black active:scale-95 transition disabled:opacity-60">
                  {videoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {videoBusy ? "Making the video …" : "Turn into video (Admin — free)"}
                </button>
              ) : (
                <>
                  <button type="button" onClick={videoAnstossen} disabled={payBusy || videoShow}
                    className="lb-gold lb-buy flex w-full items-center justify-center gap-2 rounded-full font-black active:scale-95 transition disabled:opacity-60">
                    {videoShow ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {videoShow ? "Making your kiss video …" : "Make a real kiss video 🔥"}
                  </button>
                  <button type="button" onClick={() => void unlock(false)} disabled={payBusy}
                    style={{ color: "#fff" }}
                    className="mt-2 flex w-full items-center justify-center rounded-full border border-white/40 px-3 py-2 text-[12px] font-black active:scale-95 transition disabled:opacity-60">
                    {fillPrices("Or unlock everything — {price}/month")}
                  </button>
                  <p className="mt-2 text-center text-[10px] font-medium leading-snug text-white/70">
                    {fillPrices("The picture is yours for free. {once} buys the video, no subscription. ")}{renewNote("en")}
                  </p>
                  <p className="mt-1 text-center text-[11px] font-bold text-white/80">Secure checkout by Stripe</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Das ECHTE Video (nach Zahlung / Admin-Reveal) — klar + Download. */}
        {videoUrl && (
          <div className="mx-auto mt-4 w-full max-w-[420px]">
            <div className="overflow-hidden rounded-3xl border border-white/10">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video src={videoUrl} controls autoPlay loop playsInline className="aspect-[3/4] w-full" />
            </div>
            <a href={videoUrl} download={V.done} target="_blank" rel="noreferrer"
              className="lb-gold mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full text-[14px] font-black active:scale-95 transition">
              ⬇ Download your video
            </a>
            {/* Privat-Hinweis (Owner-Vorgabe): nicht in sozialen Medien teilen. */}
            <p className="mx-auto mt-2 max-w-[280px] text-center text-[11px] font-bold leading-snug text-white/55">
              🔒 This video is private — for you only. Please don't share it on social media.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
