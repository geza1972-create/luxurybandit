"use client";

import { useEffect, useRef, useState } from "react";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";
import { Loader2, ImageUp, Lock, RefreshCw, Check, Sparkles } from "lucide-react";
import { renewNote, fillPrices } from "@/lib/pricing";
import { logFunnelEvent } from "@/lib/track-funnel";

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

// Eigenes Foto klein rechnen (Data-URL) — wie im Try-On-Funnel.
async function fileToDataUrl(file: File, max = 1000, quality = 0.85): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(file); });
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl; });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  c.getContext("2d")!.drawImage(img, 0, 0, w, h);
  return c.toDataURL("image/jpeg", quality);
}

// Die Render-Show: gestaffelte Status-Texte, damit es sich wie eine echte Generierung anfühlt.
// DIE TEXTE MÜSSEN SO LANGE LAUFEN WIE DIE ERZEUGUNG (Owner 30.07.2026: „ich habe auf
// generate picture geklickt, dann kam das Rendern und ist dann verschwunden").
//
// Nichts war verschwunden — das Bild kam nach rund 40 Sekunden. Nur liefen die Texte in 14
// Sekunden durch, danach stand „Finishing touches …" eine halbe Minute unverändert da. Das
// liest sich wie abgestürzt, und man geht weg. Gemessen: 25–45 s je nach Anlauf (bei einer
// abgewiesenen Vorlage kommt der Gesichtsausschnitt als zweiter Versuch dazu).
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
  const onModelFile = async (f?: File | null) => { if (f) try { setCustomModel(await fileToDataUrl(f)); setUseCustom(true); track("own_model"); } catch { /**/ } };

  // Die aktive Auswahl: entweder die „Your Model"-Karte (eigenes Foto) oder ein Katalog-Model.
  const selPhoto = useCustom ? customModel : (picked?.photoUrl ?? "");
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
      if (r.status === 429 || d?.limit) { setGesperrt(true); setStatus(""); setBusy(false); return; }
      if (!r.ok || !d.image) { setStatus(d?.error ?? "That did not work."); setBusy(false); return; }
      setBild(d.image); setBildPfad(d.imagePath ?? ""); setFrei(false); setGesperrt(false); setBusy(false); setStatus("");
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
        body: JSON.stringify({ email: e, imagePath: bildPfad, device, genId }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setStatus(d?.error ?? "That did not work."); setMailBusy(false); return; }
      setFrei(true); setMailBusy(false);
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
      setBusy(true);
      const token = Date.now(); runRef.current = token;
      await zuVideo();
      return;
    }
    setPayBusy(true); setStatus("");
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
          // Bezahlt → aus dem BILD, das er schon gesehen hat, das Video machen. Nicht neu
          // rendern: sonst bekäme er ein anderes Ergebnis als das, für das er bezahlt hat.
          // Hat er gar kein Bild (Gratis aufgebraucht), läuft der alte Weg: Video direkt aus
          // ihren beiden Fotos — dort greift kein Gratis-Deckel.
          if (bild) { await zuVideo(); return; }
          setBusy(true);
          const token2 = Date.now(); runRef.current = token2;
          await realGenerate(token2);
          return;
        }
        if (popup.closed && i > 2) break; // Popup zu ohne Zahlung → aufhören zu pollen
      }
      setPayBusy(false);
    } catch { setStatus("Network error."); setPayBusy(false); }
  };

  return (
    <div className="mt-8">
      {/* 1) Model wählen — das 3D-Coverflow aus dem Try-On-Funnel: die Gewählte steht groß
          vorn, die Nachbarinnen kippen seitlich weg; Tipp auf eine Seitenkarte oder Swipe
          holt sie nach vorn (= Auswahl). */}
      <p className="text-[12px] font-black uppercase tracking-wide text-white/50">{V.step1}</p>
      <p className="mt-1 text-[13px] font-bold text-white/85">{V.pickHint}</p>
      {(() => {
        if (models.length === 0) return <div className="grid h-[46vw] max-h-[240px] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-white/50" /></div>;
        // „Your Model" lebt IM Karussell als Karte (3. Position, wie „Your photo" im Try-On):
        // eigenes Model-Foto hochladen — die Karte vorn = Auswahl.
        const YOURMODEL: Model = { id: "__yourmodel", name: V.upTitle, photoUrl: "" };
        const cards = [...models];
        const uploadIdx = V.upFirst ? 0 : Math.min(2, cards.length);
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
                            <img src={V.upPlaceholder} alt="" className="absolute inset-0 h-full w-full object-cover object-top opacity-70" />
                            <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/45" />
                          </>
                        )}
                        <ImageUp className="relative h-9 w-9 text-[#f6cf51]" />
                        <span className="relative text-[13px] font-black text-[#f6cf51]">{V.upTitle}</span>
                        <span className="relative text-[11px] font-bold leading-snug text-white/80">{V.upHint}</span>
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
      <input ref={modelFileRef} type="file" accept="image/*" className="hidden" onChange={e => void onModelFile(e.target.files?.[0])} />

      {/* 2) Eigenes Foto */}
      <p className="mt-5 text-[12px] font-black uppercase tracking-wide text-white/50">2 · Your photo</p>
      <button type="button" onClick={() => fileRef.current?.click()}
        className="relative mx-auto mt-2 flex aspect-square w-[46vw] max-w-[210px] flex-col items-center justify-center gap-2 overflow-hidden rounded-3xl border-2 border-dashed border-[#f6cf51]/40 bg-[#f6cf51]/[0.06] active:scale-[0.98] transition">
        {photo
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={photo} alt="" className="h-full w-full object-cover" />
          : (<>
              {/* Platzhalter-Gesicht (abgedunkelt): zeigt auf einen Blick, dass hier ein
                  MANN bzw. der Nutzer selbst hingehört — nicht noch ein Model. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={PLACEHOLDER_MAN} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25 grayscale" />
              <ImageUp className="relative h-8 w-8 text-[#f6cf51]" />
              <span className="relative text-[13px] font-black text-[#f6cf51]">Upload your photo</span>
            </>)}
      </button>
      {photo && (
        <button type="button" onClick={() => fileRef.current?.click()} className="mx-auto mt-2 flex items-center gap-1.5 text-[12px] font-black text-white/60">
          <RefreshCw className="h-3.5 w-3.5" /> Change photo
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => void onFile(e.target.files?.[0])} />

      {/* 3) Generieren */}
      <p className="mt-5 text-[12px] font-black uppercase tracking-wide text-white/50">{V.step3}</p>
      <label className="mt-2 flex cursor-pointer items-start gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#f6cf51]" />
        <span className="text-[12px] font-bold leading-snug text-white/70">
          Yes, I want this video. I may use these photos, everyone shown is an adult, I keep it
          private — and I take responsibility for it.
        </span>
      </label>
      <button type="button" onClick={() => void generate()} disabled={!selPhoto || !photo || !consent || busy}
        className="lb-gold mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-black active:scale-95 transition disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "💋"} {busy ? "Rendering …" : V.cta}
      </button>
      {/* Der Preis steht DIREKT unter dem Knopf, nicht erst hinter dem Ergebnis (Owner
          30.07.2026: „hier muss Generate Picture free Button stehen oben und Video 9,99").
          Er soll vorher wissen, was gratis ist und was kostet — sonst fühlt sich die Kasse
          nach dem Warten wie eine Falle an. */}
      <p className="mt-1.5 text-center text-[12px] font-bold text-white/70">
        {fillPrices("Picture free · Video {once}")}
      </p>
      {/* BEIDE ZAHLWEGE AUCH HIER (Owner 30.07.2026: „und auch hier muss der Button mit 9,99
          und Abo sein"). Wer schon weiss, dass er das Video will, soll nicht erst ein Bild
          erzeugen müssen. Dieselbe Sperre wie beim Hauptknopf: ohne beide Fotos und ohne
          Haken geht nichts. */}
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
          <div className="mx-auto mt-4 w-fit">
            <div className="relative overflow-hidden rounded-3xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selPhoto} alt="" className="aspect-[3/4] max-h-[60vh] w-auto object-cover object-top blur-[6px] brightness-75" />
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
        {/* GRATIS AUFGEBRAUCHT → sofort weiter, nicht abwürgen. Ein Satz „schon genutzt"
            ohne Knopf ist das Ende des Trichters; hier stehen beide Wege direkt darunter. */}
        {gesperrt && !bild && !videoUrl && (
          <div className="mx-auto mt-4 w-full max-w-[340px] rounded-3xl border border-[#f6cf51]/30 bg-[#f6cf51]/[0.06] p-5 text-center">
            <p className="text-[16px] font-black text-white">Your free picture is used up</p>
            <p className="mt-1 text-[12px] font-bold leading-snug text-white/75">
              One picture per person is free. Keep going with the video — or unlock everything.
            </p>
            <button type="button" onClick={() => void unlock(true)} disabled={payBusy}
              className="lb-gold lb-buy mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full font-black active:scale-95 transition disabled:opacity-60">
              {payBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              {fillPrices("Make hot video — {once}")}
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

        {/* DAS ERZEUGTE BILD — scharf, kein Schloss (Owner 30.07.2026: „Bild gratis Mann,
            Video gegen Geld"). Darunter der Weg zum Video: Admin gratis, Kunde 9,99 € oder Abo. */}
        {bild && !videoUrl && (
          <div className="mx-auto mt-4 w-fit">
            <div className="relative overflow-hidden rounded-3xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bild} alt=""
                className={`max-h-[60vh] w-auto object-contain transition ${frei || isStaff ? "" : "blur-2xl scale-105"}`} />
              {/* VERDECKT, BIS DIE ADRESSE DA IST. Das Bild EXISTIERT bereits — es ist keine
                  Attrappe wie früher, sondern sein fertiges Ergebnis. Genau deshalb trägt er
                  ein: er weiß, dass es da ist. */}
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
                      className="mt-3 h-12 w-full rounded-xl border border-white/25 bg-black/50 px-3 text-center text-[15px] font-bold text-white outline-none placeholder:text-white/40 focus:border-[#f6cf51]" />
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
            {videoReif && !isStaff && (
              <div className="mt-3 w-full rounded-2xl border border-[#f6cf51]/40 bg-[#f6cf51]/[0.07] p-4 text-center">
                <p className="text-[17px] font-black text-white">Your video is ready 🔥</p>
                <p className="mt-1 text-[12px] font-bold leading-snug text-white/80">
                  Unlock it and watch the two of you.
                </p>
                <button type="button" onClick={() => void unlock(true)} disabled={payBusy}
                  className="lb-gold lb-buy mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full font-black active:scale-95 transition disabled:opacity-60">
                  {payBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  {fillPrices("Watch hot video — {once}")}
                </button>
                <button type="button" onClick={() => void unlock(false)} disabled={payBusy}
                  style={{ color: "#fff" }}
                  className="mt-2 flex h-11 w-full items-center justify-center rounded-full border border-white/35 text-[12px] font-black active:scale-95 transition disabled:opacity-60">
                  {fillPrices("Or unlock everything — {price}/month")}
                </button>
                <p className="mt-2 text-[10px] font-medium leading-snug text-white/60">{renewNote("en")}</p>
              </div>
            )}

            {/* BESTÄTIGUNG, DASS ES AUCH IM POSTFACH LIEGT (Owner 30.07.2026: „und er weiss
                es gar nicht dass er das per email bekommen hat!"). Ohne diese Zeile bleibt
                die Mail unbemerkt — und mit ihr der Grund, ein Passwort zu vergeben und
                wiederzukommen. Der Spam-Hinweis steht dabei, weil eine junge Absender-Domain
                bei Gmail oft dort landet. */}
            {frei && !isStaff && mail && (
              <p className="mt-2 rounded-xl bg-emerald-400/10 px-3 py-2 text-center text-[12px] font-bold leading-snug text-emerald-300">
                ✓ Sent to {mail} — check your inbox (and spam, just in case).
              </p>
            )}

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
                    {videoShow ? "Making your hot video …" : "Make hot video 🔥"}
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
          <div className="mx-auto mt-4 w-fit">
            <div className="overflow-hidden rounded-3xl border border-white/10">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video src={videoUrl} controls autoPlay loop playsInline className="aspect-[3/4] max-h-[60vh] w-auto" />
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
