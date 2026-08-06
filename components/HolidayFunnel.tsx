"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Lock, Sparkles, ImageUp, Check, Download, Plus, ChevronLeft, Trash2 } from "lucide-react";
import { MadeBy } from "@/components/CI";
import ImageCropper from "@/components/ImageCropper";
import { HOLIDAY_SCENES, holidayPrompt, type HolidayScene } from "@/lib/holiday-scenes";
import { logFunnelEvent } from "@/lib/track-funnel";
import { fillPrices } from "@/lib/pricing";
import EinladungKarte, { KARTE_TEXTE } from "@/components/EinladungKarte";
import EinladungAnsicht from "@/components/EinladungAnsicht";
import TeilenKnopf from "@/components/TeilenKnopf";
import { SCHRITTE_OEFFNEN, TEILEN_TEXT } from "@/components/BeispielGalerie";
import { StepLabel, Fine } from "@/components/Landing";

type Model = { id: string; name: string; photoUrl: string };

/**
 * „Holiday with your dream girl" — ER macht die Videos selbst, nach dem Surprise-Muster:
 * eigenes Foto hoch, Model wählen (oder eigene hochladen), EINE der 25 Szenen antippen →
 * Radar-Show → verpixelter Teaser → zahlen → echter Render → Download.
 *
 * KEIN Zufall (Owner): er tippt selbst an, was passieren soll. Was er schon einmal
 * genommen hat, wird markiert und rutscht nach hinten — so bekommt er nicht zweimal
 * dasselbe Video. Gemerkt wird das im Gerät (localStorage), nicht serverseitig: der Funnel
 * läuft anonym, und ein Konto brauchen wir dafür nicht.
 *
 * PREISE (Owner): das ERSTE Video verlangt das Themen-Abo 24 €/Monat, jedes WEITERE kostet
 * 3,99 €. Achtung: die im Abo enthaltene Stückzahl wird nirgends gezählt — siehe README/Doku.
 */

const USED_KEY = "lb_holiday_used";
const PAID_KEY = "lb_holiday_abo";   // Abo einmal bezahlt? (im Gerät gemerkt)
const LOOK_ID = "look-1784191032626-70e3608b";  // Referenz-Look fürs Routing der Video-Route

const RENDER_STEPS: [number, string][] = [
  [0, "Finding the place …"],
  [4500, "Putting the two of you in frame …"],
  [10000, "Adding the motion …"],
  [15000, "Almost there …"],
];
const RENDER_MS = 18000;

const fileToDataUrl = (f: File) => new Promise<string>((res, rej) => {
  const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f);
});

// `presetModelId` legt fest, WER vorn steht — für Themenseiten, die einer bestimmten Frau
// gewidmet sind (z. B. /themes/bella). Wechseln bleibt erlaubt: wer lieber eine andere will,
// wischt einfach weiter. Ohne das Prop bleibt alles wie bisher (Bella vorn).
export default function HolidayFunnel({ code = "", presetModelId = "", presetModelName = "", lang = "en", beispielVideo = "" }: {
  code?: string; presetModelId?: string; presetModelName?: string;
  /** Sprache der Karten-Beschriftungen („Personen ersetzen", „Ton an") — wie beim Kuss. */
  lang?: string;
  /**
   * DAS BEISPIEL IN DER KARTE (Owner 04.08.2026: „genau wie Kissing, Karten auf der Landing
   * Page, dann klickt man auf Replace People").
   *
   * Solange er nichts erzeugt hat, laeuft hier dasselbe Video, das unten in der Galerie steht —
   * kein zweiter Ort zum Pflegen. Sobald sein eigenes fertig ist, nimmt es diesen Platz ein.
   */
  beispielVideo?: string;
}) {
  // MESSPUNKTE (Owner 29.07.2026) — dieselben sechs Namen wie im Kiss-Trichter, damit
  // beide vergleichbar sind. Thema steckt in lookId: die Bella-Seite reicht presetModelId
  // durch, sonst ist es das allgemeine Holiday-Thema.
  const theme = presetModelId ? "bella" : "holiday";
  const track = (step: string) =>
    void logFunnelEvent(`funnel_${step}`, { lookId: `funnel-${theme}`, lookName: `${theme}-Trichter` });
  const [photo, setPhoto] = useState("");            // SEIN Foto
  const [models, setModels] = useState<Model[]>([]);
  const [pickIdx, setPickIdx] = useState(0);         // Coverflow: vorderste Karte = Auswahl
  const [useCustom, setUseCustom] = useState(false); // eigene Traumfrau hochgeladen
  const [customModel, setCustomModel] = useState("");
  const [sceneId, setSceneId] = useState("");
  const [used, setUsed] = useState<string[]>([]);
  const [aboPaid, setAboPaid] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [teaser, setTeaser] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [payBusy, setPayBusy] = useState(false);
  /**
   * DIE SCHRITTE LIEGEN ZU, BIS ER SIE AUFMACHT — dasselbe Muster wie beim Kuss.
   *
   * Vorher standen alle fuenf Schritte offen auf der Landingpage: ein Upload-Feld, ein
   * Karussell, 25 Kacheln und ein Kleiderschrank, bevor er ueberhaupt gesehen hatte, was
   * dabei herauskommt. Jetzt sieht er zuerst das ERGEBNIS in der Karte und tippt „Personen
   * ersetzen" — die Arbeit kommt danach, im Dialog.
   */
  const [stufenOffen, setStufenOffen] = useState(false);
  /**
   * ZUSCHNITT VOR DEM ÜBERNEHMEN (Hausregel, Skill `upload-foto`: „und auch crop soll immer
   * sein"). Handyfotos sind nie im 3:4 der Kachel; ohne Zuschnitt schneidet `object-cover`
   * blind — beim Urlaubsvideo genau die Köpfe, um die es geht. Dieselben zwei Zustände wie
   * in EinladungBauen: welche Datei, und für welche der beiden Kacheln.
   */
  const [cropDatei, setCropDatei] = useState<File | null>(null);
  const [cropZiel, setCropZiel] = useState<"sie" | "er" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const modelFileRef = useRef<HTMLInputElement>(null);
  const runRef = useRef(0);
  const swipeRef = useRef(0);
  const swipedRef = useRef(false);
  const resultRef = useRef<HTMLDivElement>(null);

  /**
   * DER KLEIDERSCHRANK IST RAUS (Owner 04.08.2026: „die Kleider brauchen wir nicht").
   *
   * Hier hingen zwei weitere Abfragen (`/api/try-this-look` fuer den Katalog und
   * `/api/wardrobe-garments` fuer die Freigabeliste) nur an diesem einen Schritt. Mit dem
   * Schritt gehen auch sie — beim Urlaub bleibt sie einfach so angezogen, wie sie auf ihrem
   * Foto ist. Das spart nebenbei den FASHN-Vorlauf im bezahlten Lauf (siehe realGenerate).
   */
  useEffect(() => {
    fetch("/api/try-this-look?models=1", { cache: "no-store" }).then(r => r.json()).catch(() => ({})).then((m: { models?: Model[] }) => {
      let all: Model[] = (Array.isArray(m.models) ? m.models : []).filter((x: Model) => !!x.photoUrl);
      // ALLE Models, kein Deckel — es waren 46, ich hatte auf 40 abgeschnitten.
      // Vorn steht, wem die Seite gewidmet ist (presetModelId); sonst Bella als Gesicht
      // des Portals. Der Rest bleibt in Katalog-Reihenfolge.
      const wanted = presetModelId || "curator-1783683672619-td4cy";
      const first = all.findIndex(x => x.id === wanted || (!presetModelId && /^bella\b/i.test(x.name)));
      if (first > 0) all = [all[first], ...all.slice(0, first), ...all.slice(first + 1)];
      setModels(all);
    }).catch(() => {});
    try {
      const p = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? "";
      setPin(p); setIsStaff(!!p && !localStorage.getItem("lb_preview_model"));
      const u = JSON.parse(localStorage.getItem(USED_KEY) || "[]");
      if (Array.isArray(u)) setUsed(u.map(String));
      setAboPaid(localStorage.getItem(PAID_KEY) === "1");
    } catch { /**/ }
    return () => { runRef.current = -1; };
  }, [presetModelId]);   // Themenseite gibt vor, wer vorn steht

  /**
   * „PERSONEN ERSETZEN" AUS DER GALERIE (gleiches Muster wie beim Kuss, siehe
   * BeispielGalerie): Jede Karte weiter unten auf der Seite ruft dasselbe Fenster-Ereignis.
   * Ueber ein Ereignis und nicht ueber ein Prop, weil Galerie und Trichter zwei getrennte
   * Bausteine auf derselben Seite sind — sonst muesste der halbe Zustand durch die Seite.
   */
  useEffect(() => {
    const auf = () => setStufenOffen(true);
    window.addEventListener(SCHRITTE_OEFFNEN, auf);
    return () => window.removeEventListener(SCHRITTE_OEFFNEN, auf);
  }, []);

  // Szenen: schon benutzte nach hinten, damit oben immer etwas Neues steht.
  const scenes: HolidayScene[] = [
    ...HOLIDAY_SCENES.filter(s => !used.includes(s.id)),
    ...HOLIDAY_SCENES.filter(s => used.includes(s.id)),
  ];
  const scene = HOLIDAY_SCENES.find(s => s.id === sceneId) ?? null;
  const picked = useCustom ? null : models[pickIdx];
  const modelPhoto = useCustom ? customModel : (picked?.photoUrl ?? "");
  const ready = !!photo && !!modelPhoto && !!scene;

  const onFile = async (f?: File | null) => { if (f) try { setPhoto(await fileToDataUrl(f)); track("photo"); } catch { /**/ } };
  const onModelFile = async (f?: File | null) => { if (f) try { setCustomModel(await fileToDataUrl(f)); setUseCustom(true); track("own_model"); } catch { /**/ } };

  const markUsed = (id: string) => {
    setUsed(prev => {
      const next = prev.includes(id) ? prev : [...prev, id];
      try { localStorage.setItem(USED_KEY, JSON.stringify(next)); } catch { /**/ }
      return next;
    });
  };

  // ECHTE Generierung — erst nach Zahlung (oder für Staff). Zwei Referenzen, weil hier ZWEI
  // Menschen ins Bild müssen: @person = sie, @Bild2 = er.
  const realGenerate = async (token: number) => {
    if (!scene) return;
    /* EIN LAUF, KEIN VORLAUF (Owner 04.08.2026: „die Kleider brauchen wir nicht").
       Hier stand die FASHN-Stufe: erst wurde sie mit dem gewaehlten Teil angezogen, und
       DIESES Bild ging als ihre Referenz ins Video. Ohne Garderobe gibt es nichts anzuziehen —
       ihr Foto geht direkt ins Video. Das spart den Bild-Aufruf (~3–7 ct je bezahltem Video)
       und die „Dressing her …"-Wartezeit davor. */
    setStatus("Rendering your holiday … (~1–3 min)");
    try {
      const start = await fetch("/api/generate-tryon-video", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(pin ? { "x-try-look-admin-pin": pin } : {}) },
        // REIHENFOLGE IST PFLICHT: Der Prompt nennt @image1 (den Mann) zuerst, und Pixverse
        // ordnet das erste Token dem ERSTEN Bildplatz zu — das ist `person`. Also SEIN Foto
        // auf Platz 1 und ihr angezogenes auf Platz 2. Vertauscht man nur die Token, kommen
        // zwei Männer oder zwei Frauen heraus.
        body: JSON.stringify({ lookId: LOOK_ID, person: photo, garment: modelPhoto, prompt: holidayPrompt(scene) }),
      }).then(r => r.json());
      if (!start?.videoId) { setStatus(start?.error || "Could not start."); setBusy(false); return; }
      for (let i = 0; i < 72; i++) {
        await new Promise(r => setTimeout(r, 5000));
        if (runRef.current !== token) return;
        const p = await fetch(`/api/generate-tryon-video?videoId=${encodeURIComponent(start.videoId)}&curatorId=${encodeURIComponent(start.curatorId || "")}`).then(r => r.json()).catch(() => null);
        if (p?.status === "done" && p.videoUrl) {
          setVideoUrl(p.videoUrl); setTeaser(false); setStatus(""); setBusy(false); track("done");
          markUsed(scene.id);
          /* DAS FERTIGE VIDEO WOHNT IN DER KARTE (Kuss-Regel, Owner 01.08.2026: „muss in einer
             Karte sein, auch mit Herzchen und sharen koennen"). Also Dialog zu und nach oben —
             sonst laege sein Ergebnis unter einem Trichter, den er nicht mehr braucht. */
          setStufenOffen(false);
          setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 150);
          return;
        }
        if (p?.status === "failed") { setStatus(p.error || "Generation failed."); setBusy(false); return; }
      }
      setStatus("Timeout — please try again later."); setBusy(false);
    } catch { setStatus("Network error."); setBusy(false); }
  };

  // Immer erst die Fake-Show — auch für Staff, damit der Kundenweg sichtbar bleibt.
  const generate = () => {
    track("generate");
    if (!ready || busy) return;
    setBusy(true); setTeaser(false); setVideoUrl(""); setStatus("");
    const token = Date.now(); runRef.current = token;
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    for (const [at, text] of RENDER_STEPS) setTimeout(() => { if (runRef.current === token) setStatus(text); }, at);
    setTimeout(() => {
      if (runRef.current !== token) return;
      setBusy(false); setStatus(""); setTeaser(true); track("paywall");
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    }, RENDER_MS);
  };

  // Freischalten: erstes Video = Abo 24 €/Monat, jedes weitere = 3,99 € einzeln.
  const unlock = async () => {
    track("checkout");
    if (payBusy) return;
    if (isStaff) { setBusy(true); const t = Date.now(); runRef.current = t; await realGenerate(t); return; }
    setPayBusy(true); setStatus("");
    const endpoint = aboPaid ? "/api/holiday-video-checkout" : "/api/holiday-abo-checkout";
    try {
      const start = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, returnTo: window.location.pathname + window.location.search }),
      }).then(r => r.json());
      if (!start?.url || !start?.sessionId) { setStatus(start?.error || "Checkout could not start."); setPayBusy(false); return; }
      const popup = window.open(start.url, "_blank", "popup,width=480,height=780");
      if (!popup) { window.location.href = start.url; return; }
      for (let i = 0; i < 100; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const s = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(start.sessionId)}`).then(r => r.json()).catch(() => null);
        if (s?.paid) {
          try { popup.close(); } catch { /**/ }
          if (!aboPaid) { setAboPaid(true); try { localStorage.setItem(PAID_KEY, "1"); } catch { /**/ } }
          setPayBusy(false); setBusy(true);
          const t = Date.now(); runRef.current = t;
          await realGenerate(t);
          return;
        }
        if (popup.closed && i > 2) break;
      }
      setPayBusy(false);
    } catch { setStatus("Network error."); setPayBusy(false); }
  };

  const T = KARTE_TEXTE[lang] ?? KARTE_TEXTE.en;

  const schritteOeffnen = () => {
    /* „Personen ersetzen" heisst von vorn — dieselbe Lehre wie beim Kuss (Owner 31.07.2026:
       „Klick auf Bilder oeffnet Schritt 4 und ist leer"). Die Szene wird zurueckgesetzt,
       damit er nicht im Ergebnis-Zustand des letzten Laufs landet. */
    setTeaser(false); setStatus("");
    setStufenOffen(true);
    track("photo");
  };

  /**
   * DER GRIFF AUF DER KARTE. Die ganze Flaeche unter dem Ton-Knopf ist der Knopf: Wer ein
   * Beispiel ansieht und antippt, meint genau das. Ein <div> und kein <button>, weil ein
   * Knopf im Knopf kaputtes HTML ist; die Flaeche beginnt erst bei `top-16`, sonst laege sie
   * ueber dem Ton-Knopf und die Musik waere nicht mehr einzuschalten.
   *
   * ZWEI FASSUNGEN, DAMIT NUR EIN GOLDENER KNOPF JE BILDSCHIRM STEHT (CI §2): Ohne Ergebnis
   * ist „Personen ersetzen" die Hauptaktion und traegt `.lb-gold`. Sobald sein Video fertig
   * ist, ist Herunterladen die Hauptaktion — dann weicht der Griff auf die weisse Pille aus,
   * genau wie im Kuss-Trichter.
   */
  const kartenGriff = (
    <div role="button" tabIndex={0} aria-label={T.menschenErsetzen}
      onClick={schritteOeffnen}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); schritteOeffnen(); } }}
      className="absolute inset-x-0 bottom-0 top-16 z-20 flex cursor-pointer items-end justify-center p-4">
      {videoUrl ? (
        <span style={{ background: "#fff", color: "#1a160f" }}
          className="flex h-10 w-full items-center justify-center rounded-full text-[12px] font-black shadow-md">
          {T.menschenErsetzen}
        </span>
      ) : (
        <span className="lb-gold flex h-12 w-full items-center justify-center rounded-full text-[14px] font-black shadow-[0_6px_20px_rgba(0,0,0,0.35)]">
          {T.menschenErsetzen}
        </span>
      )}
    </div>
  );

  return (
    <div className="mt-6">
      {/* DIE KARTE STEHT VORN (Owner 04.08.2026: „genau wie Kissing"). Erst das Ergebnis,
          dann die Arbeit — die fuenf Schritte liegen im Dialog dahinter. */}
      {(videoUrl || beispielVideo) && (
        <EinladungKarte sprache={lang} sie="" er="" demo
          titel={presetModelName ? `${presetModelName} & you` : "Your holiday"}
          /* Die Herkunftszeile gehoert auf JEDE Karte (Owner 03.08.2026). Keine Inline-Farbe:
             `.lb-karte` faerbt per !important und schlaegt jedes style-Attribut. */
          fuss={<MadeBy karte />}
          video={
            <div className="relative">
              {/* Die drei Symbole setzt die Karte selbst (Skill `card`). */}
              <EinladungAnsicht id="" videoUrl={videoUrl || beispielVideo} zaehlen={false}
                /* Sein eigenes Video hat eine Stimme und einen Anfang — Originalton, keine
                   Schleife. Das Beispiel laeuft unter unserer Musik weiter. */
                {...(videoUrl ? { originalton: true, schleife: false, musik: "" } : {})}
                tonText={T.ton} tonAusText={T.tonAus} grossText={T.gross} kleinText={T.klein}
                teilen={
                  <TeilenKnopf rund
                    {...(videoUrl
                      ? { datei: videoUrl, dateiName: "holiday" }
                      : { url: "/themes/holiday?utm_source=share" })}
                    text={TEILEN_TEXT[lang] ?? TEILEN_TEXT.en}
                    label={T.teilen} kopiertLabel={T.zusDanke} />
                } />
              {kartenGriff}
            </div>
          } />
      )}

      {/* Unter der Karte: herunterladen und der naechste Moment — erst wenn es etwas gibt. */}
      {videoUrl && (
        <>
          <a href={videoUrl} download={`holiday-${scene?.id ?? "video"}.mp4`} target="_blank" rel="noreferrer"
            className="lb-gold mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[14px] font-black active:scale-95 transition">
            <Download className="h-4 w-4" /> Download the video
          </a>
          <button type="button" onClick={() => { setVideoUrl(""); setSceneId(""); schritteOeffnen(); }}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/25 text-[14px] font-black text-white/85 active:scale-95 transition">
            <Plus className="h-4 w-4" /> {fillPrices("Next moment — {extra}", "en")}
          </button>
        </>
      )}

      {/* Ohne Beispielvideo hat die Karte nichts zu zeigen — dann fuehrt ein einfacher Knopf
          in die Schritte, damit die Seite nie ohne Einstieg dasteht. */}
      {!videoUrl && !beispielVideo && (
        <button type="button" onClick={schritteOeffnen}
          className="lb-gold flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-black active:scale-95 transition">
          <Sparkles className="h-4 w-4" /> Make your holiday video
        </button>
      )}

      {/* DIE SCHRITTE — im Dialog, wie beim Kuss. Die Kopfzeile (z-50) bleibt darueber
          sichtbar, damit Konto und Galerie erreichbar bleiben. */}
      {stufenOffen && (
      <div className="fixed inset-0 z-40 overflow-y-auto pt-36" style={{ background: "rgba(0,0,0,0.72)" }}
        onClick={() => setStufenOffen(false)}>
      <div className="lb-bg mx-auto min-h-full w-full max-w-[440px] px-4 pb-10 pt-4" onClick={e => e.stopPropagation()}>
      <button type="button" onClick={() => setStufenOffen(false)} aria-label={T.zurueck}
        className="lb-chip mb-3 grid h-9 w-9 place-items-center rounded-full transition active:scale-95">
        <ChevronLeft className="h-5 w-5" />
      </button>
      {/* 1 — DIE FOTOS, GENAU WIE BEI DER HOCHZEIT (Owner 04.08.2026: „upload ist nicht gut,
          das muss genauso gehen wie Wedding. Crop, Schritte, dann so weiter. Genau das
          gleiche Layout mit allen Features").

          Vorher stand hier EIN grosses gestricheltes Feld: kein Zuschnitt, kein Löschen, und
          sie lag einen Schritt weiter unten im Karussell. Das verstösst gegen die Hausregel
          für JEDES Upload-Feld (siehe Skill `upload-foto`): Speichern-Knopf, Zuschnitt,
          Löschen. Jetzt dasselbe Raster wie in `EinladungBauen`: zwei 3:4-Kacheln
          nebeneinander, beide mit Zuschnitt vor dem Übernehmen und einem sichtbaren
          Löschknopf. Wer sie lieber aus dem Katalog nimmt, wischt darunter weiter. */}
      <StepLabel>1 · Your photos</StepLabel>
      <Fine>Both of you go into the video. Tap a tile, then move and zoom until it sits right.</Fine>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {([
          { wer: "er" as const, foto: photo, eigenes: !!photo, ref: fileRef, titel: "You", hinweis: "A full-body photo works best." },
          /* `eigenes` trennt HOCHGELADEN von AUS DEM KATALOG. Beides landet in derselben
             Kachel, aber nur das Hochgeladene darf einen Löschknopf tragen: Bei einer
             Katalog-Frau hätte er nichts zu löschen und wäre ein Knopf, der sichtbar nichts
             tut — schlimmer als kein Knopf. */
          { wer: "sie" as const, foto: useCustom ? customModel : (picked?.photoUrl ?? ""), eigenes: useCustom && !!customModel, ref: modelFileRef, titel: "Her", hinweis: "Upload her — or swipe ours below." },
        ]).map(k => (
          <div key={k.wer} className="relative">
            <button type="button" onClick={() => k.ref.current?.click()}
              className="relative flex aspect-[3/4] w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl border-2 border-dashed border-[#f6cf51]/40 bg-[#f6cf51]/[0.08] active:scale-[0.98] transition">
              {k.foto ? (<>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={k.foto} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />
                <span className="lb-onmedia absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pb-1.5 pt-6 text-[15px] font-black"
                  style={{ color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.85)" }}>
                  {k.titel}
                </span>
                <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-[#f6cf51] shadow">
                  <Check className="h-4 w-4 text-black" />
                </span>
              </>) : (<>
                <ImageUp className="h-7 w-7 text-[#f6cf51]" />
                <span className="px-1 text-[14px] font-black text-[#f6cf51]">{k.titel}</span>
                <span className="px-2 text-center text-[10px] font-bold leading-snug text-white/85">{k.hinweis}</span>
              </>)}
            </button>
            {/* LÖSCHEN — sichtbar an der Kachel (Hausregel 3). Eigener Knopf NEBEN dem
                Kachelknopf, nicht darin: Ein Knopf im Knopf ist ungültiges HTML und öffnet am
                Handy zuverlässig das Falsche. */}
            {k.eigenes && (
              <button type="button" aria-label="Delete photo"
                onClick={() => { if (k.wer === "er") setPhoto(""); else { setCustomModel(""); setUseCustom(false); } }}
                style={{ background: "#fff", color: "#dc2626", boxShadow: "0 2px 10px rgba(0,0,0,0.35)" }}
                className="absolute left-1.5 top-1.5 z-10 grid h-8 w-8 place-items-center rounded-full transition active:scale-90">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      {/* Nichts rutscht von allein hinein: Die Datei geht in den Zuschnitt, übernommen wird
          sie erst mit „Speichern" darin (Hausregel 1 + 2). `e.target.value = ""` sorgt dafür,
          dass dieselbe Datei ein zweites Mal gewählt werden kann. */}
      <input ref={fileRef} type="file" accept="image/*,.heic,.heif" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) { setCropZiel("er"); setCropDatei(f); } e.target.value = ""; }} />
      <input ref={modelFileRef} type="file" accept="image/*,.heic,.heif" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) { setCropZiel("sie"); setCropDatei(f); } e.target.value = ""; }} />

      {cropDatei && cropZiel && (
        <ImageCropper file={cropDatei} aspect={3 / 4}
          title={cropZiel === "er" ? "You" : "Her"}
          /* Diese Seite ist durchgehend englisch — sonst stünde mitten im Trichter
             „Speichern" unter „Tap a tile, then move and zoom". */
          texte={{ hinweis: "Drag the photo — use the slider to zoom in.", abbrechen: "Cancel", speichern: "Save", speichert: "Saving …" }}
          onCancel={() => { setCropDatei(null); setCropZiel(null); }}
          onSave={async (zugeschnitten) => {
            const ziel = cropZiel;
            setCropDatei(null); setCropZiel(null);
            if (ziel === "er") await onFile(zugeschnitten);
            else await onModelFile(zugeschnitten);
          }} />
      )}

      {/* 2 — sie aus dem Katalog. Steht UNTER den Kacheln, wie der „ein Foto von uns beiden"-
          Weg bei der Hochzeit: Wer schon eine hochgeladen hat, muss nicht umdenken; wer noch
          keine hat, findet hier den bequemeren Weg. */}
      <StepLabel className="mt-6">2 · {presetModelName ? `Your moment with ${presetModelName}` : "Or pick one of ours"}</StepLabel>
      <Fine>
        {presetModelName
          ? `${presetModelName} is up front already — swipe if you would rather take someone else.`
          : "Swipe the models — the one up front comes with you."}
      </Fine>
      {models.length === 0 ? (
        <div className="grid h-[46vw] max-h-[240px] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-white/50" /></div>
      ) : (() => {
        /* DIE „YOUR OWN"-KARTE IST RAUS. Sie war der zweite Upload-Weg für sie — und einer,
           der die Hausregeln umging: kein Zuschnitt, kein Löschknopf. Seit die „Her"-Kachel
           oben genau das kann, wäre sie ein zweiter Knopf für dieselbe Sache, an der
           schlechteren Stelle. Mit ihr fällt auch die Index-Umrechnung weg (`cards` gegen
           `models`), an der ich mich am 27.07.2026 schon einmal vertan hatte: Karussell und
           Katalog sind jetzt dieselbe Liste. */
        const active = Math.min(pickIdx, models.length - 1);
        const front = (i: number) => {
          setUseCustom(false);
          setPickIdx(Math.max(0, Math.min(models.length - 1, i)));
        };
        return (
          <div className="relative mx-auto mt-2 h-[72vw] max-h-[300px] select-none overflow-hidden touch-pan-y" style={{ perspective: "1100px" }}
            onPointerDown={e => { swipeRef.current = e.clientX; swipedRef.current = false; }}
            onPointerUp={e => { const dx = e.clientX - swipeRef.current; if (Math.abs(dx) > 30) { swipedRef.current = true; front(Math.min(models.length - 1, Math.max(0, active + (dx < 0 ? 1 : -1)))); } }}>
            {models.map((m, i) => {
              const off = i - active;
              if (Math.abs(off) > 2) return null;
              const isActive = off === 0;
              return (
                <div key={m.id}
                  onClick={() => { if (swipedRef.current) { swipedRef.current = false; return; } if (!isActive) front(i); }}
                  className="absolute left-1/2 top-1/2 w-[54%] max-w-[220px] overflow-hidden rounded-2xl border border-white/30 bg-white/[0.06] shadow-2xl transition-all duration-300 ease-out"
                  style={{ transform: `translate(-50%,-50%) translateX(${off * 56}%) rotateY(${-off * 38}deg) scale(${isActive ? 1 : 0.82})`, zIndex: 20 - Math.abs(off), opacity: Math.abs(off) === 2 ? 0.45 : 1, cursor: "pointer" }}>
                  <div className="relative aspect-[3/4] w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.photoUrl} alt={m.name} draggable={false} className="h-full w-full object-cover object-top" />
                    {/* Das Häkchen steht nur, wenn sie WIRKLICH die Gewählte ist — hat er oben
                        ein eigenes Foto hochgeladen, gilt seines, und ein Häkchen am Katalog
                        würde zwei Frauen gleichzeitig als gewählt zeigen. */}
                    {isActive && !useCustom && <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-[#f6cf51] shadow"><Check className="h-4 w-4 text-black" /></span>}
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

      {/* 3 — die Szene: er WÄHLT, kein Zufall. Benutzte sind markiert. */}
      <StepLabel className="mt-6">3 · What happens</StepLabel>
      <Fine>
        Swipe through {HOLIDAY_SCENES.length} moments and tap one. {used.length > 0 ? `${used.length} already made — those are marked, so you never get the same video twice.` : "Nothing is random — you pick."}
      </Fine>
      {/* SLIDES statt Kachelliste (Owner 29.07.2026). 25 Momente als zweispaltiges Raster
          waren 13 Zeilen Scrollen mitten im Trichter — er wischt lieber. EINE Reihe,
          waagerecht wischbar, mit Einrastpunkten; die Scrollleiste ist ausgeblendet, das
          angeschnittene nächste Feld zeigt, dass es weitergeht. `-mx-4 px-4` lässt die Reihe
          bis an den Bildschirmrand laufen, ohne den Innenabstand der Seite zu verlieren. */}
      <div className="lb-wisch -mx-4 mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2">
        {scenes.map(s => {
          const on = sceneId === s.id;
          const done = used.includes(s.id);
          return (
            <button key={s.id} type="button" onClick={() => setSceneId(s.id)}
              className={`relative w-[42vw] max-w-[170px] shrink-0 snap-start rounded-xl border p-3 text-left transition ${on ? "border-[#f6cf51] bg-[#f6cf51]/10" : done ? "border-white/15 bg-white/[0.03] opacity-60" : "border-white/25 bg-white/[0.06]"}`}>
              <span className="text-[18px]">{s.emoji}</span>
              <span className={`mt-0.5 block text-[13px] font-black leading-tight ${on ? "text-[#f6cf51]" : "text-white"}`}>{s.label}</span>
              {done && <span className="mt-1 block text-[10px] font-black uppercase tracking-wide text-white/60">already made</span>}
              {on && <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-[#f6cf51]"><Check className="h-3.5 w-3.5 text-black" /></span>}
            </button>
          );
        })}
      </div>

      {/* HIER LAG DER KLEIDERSCHRANK (Owner 04.08.2026: „die Kleider brauchen wir nicht").
          Er war der einzige Schritt, der einen zweiten, kostenpflichtigen Bild-Aufruf nach
          sich zog — und im Urlaub ist die Kleidung nicht das Thema, der Moment ist es. Sie
          bleibt jetzt so angezogen, wie sie auf ihrem Foto ist. Damit hat der Trichter vier
          Schritte statt fuenf; die Nummern darunter sind entsprechend gerueckt. */}

      {/* 4 — generieren */}
      <StepLabel className="mt-6">4 · Your video</StepLabel>
      <button type="button" onClick={generate} disabled={!ready || busy}
        className="lb-gold mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-black active:scale-95 transition disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {busy ? "Rendering …" : scene ? `Create: ${scene.label}` : "Pick a moment first"}
      </button>
      <p className="mt-2 text-[13px] font-bold leading-snug text-white/75">
        {/* Die Zahlen standen hier von Hand: 3,99 und 24,50. Beim Preiswechsel haette der
            Urlaubs-Trichter als einziger weiter den alten Preis genannt. */}
        {fillPrices(aboPaid
          ? "Every extra video is {extra}."
          : "The first one starts your topic subscription at {price} a month — every extra video after that is {extra}.", "en")}
      </p>
      {status && <p className="mt-2 text-center text-[13px] font-bold text-white/80">{status}</p>}

      <div ref={resultRef}>
        {/* Radar-Show über dem Model-Foto */}
        {busy && !videoUrl && !!modelPhoto && (
          <div className="mx-auto mt-4 w-fit">
            <div className="relative overflow-hidden rounded-3xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={modelPhoto} alt="" className="aspect-[3/4] max-h-[60vh] w-auto object-cover object-top blur-[6px] brightness-75" />
              <div className="lb-scanline pointer-events-none absolute inset-x-0 z-10 h-[2px] bg-white shadow-[0_0_18px_5px_rgba(255,255,255,0.7)]" />
              <div className="lb-scanline pointer-events-none absolute inset-x-0 z-10 h-14 -translate-y-1/2 bg-gradient-to-b from-transparent via-white/15 to-transparent" />
              <div className="lb-onmedia pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-2 bg-gradient-to-t from-black/70 to-transparent p-4 pt-12 text-white">
                <Sparkles className="h-4 w-4 animate-pulse" />
                <span className="text-[12px] font-black">{status || "Rendering …"}</span>
              </div>
            </div>
          </div>
        )}

        {/* Verpixelter Teaser + Bezahlung */}
        {teaser && !videoUrl && !!modelPhoto && (
          <div className="mx-auto mt-4 w-fit">
            <div className="relative overflow-hidden rounded-3xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={modelPhoto} alt="" className="aspect-[3/4] max-h-[60vh] w-auto scale-110 object-cover blur-2xl" />
              <div className="absolute inset-0 grid place-items-center bg-black/30">
                <div className="px-6 text-center">
                  <Lock className="mx-auto h-8 w-8 text-[#f6cf51]" />
                  <p className="lb-onmedia mt-2 text-[15px] font-black">{scene ? `${scene.emoji} ${scene.label} — ready` : "Your video is ready"}</p>
                  <button type="button" onClick={() => void unlock()} disabled={payBusy}
                    className="lb-gold mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full px-5 text-[14px] font-black active:scale-95 transition disabled:opacity-60">
                    {payBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                    {isStaff ? "Reveal (Admin — free)" : fillPrices(aboPaid ? "Unlock — {extra}" : "Unlock — {price}/month", "en")}
                  </button>
                  {!isStaff && <p className="lb-onmedia mt-2 text-[11px] font-bold opacity-80">Secure checkout by Stripe · cancel any time</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DAS FERTIGE VIDEO STEHT NICHT MEHR HIER, sondern oben in der Karte (Dauerregel
            „Karten für Videos"): Titel oben, „made by luxurybandit.com" unten, Teilen-Knopf
            und Herunterladen darunter. Sobald es eintrifft, schliesst sich dieser Dialog. */}
      </div>
      </div>
      </div>
      )}
    </div>
  );
}
