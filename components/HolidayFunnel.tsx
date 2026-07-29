"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Lock, Sparkles, ImageUp, RefreshCw, Check, Download, Plus } from "lucide-react";
import { HOLIDAY_SCENES, holidayPrompt, type HolidayScene } from "@/lib/holiday-scenes";

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
export default function HolidayFunnel({ code = "", presetModelId = "", presetModelName = "" }: {
  code?: string; presetModelId?: string; presetModelName?: string;
}) {
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
  const fileRef = useRef<HTMLInputElement>(null);
  const modelFileRef = useRef<HTMLInputElement>(null);
  const runRef = useRef(0);
  const swipeRef = useRef(0);
  const swipedRef = useRef(false);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/try-this-look?models=1", { cache: "no-store" })
      .then(r => r.json())
      .then(m => {
        let all: Model[] = (Array.isArray(m.models) ? m.models : []).filter((x: Model) => !!x.photoUrl);
        // ALLE Models, kein Deckel — es waren 46, ich hatte auf 40 abgeschnitten.
        // Vorn steht, wem die Seite gewidmet ist (presetModelId); sonst Bella als Gesicht
        // des Portals. Der Rest bleibt in Katalog-Reihenfolge.
        const wanted = presetModelId || "curator-1783683672619-td4cy";
        const first = all.findIndex(x => x.id === wanted || (!presetModelId && /^bella\b/i.test(x.name)));
        if (first > 0) all = [all[first], ...all.slice(0, first), ...all.slice(first + 1)];
        setModels(all);
      })
      .catch(() => {});
    try {
      const p = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? "";
      setPin(p); setIsStaff(!!p && !localStorage.getItem("lb_preview_model"));
      const u = JSON.parse(localStorage.getItem(USED_KEY) || "[]");
      if (Array.isArray(u)) setUsed(u.map(String));
      setAboPaid(localStorage.getItem(PAID_KEY) === "1");
    } catch { /**/ }
    return () => { runRef.current = -1; };
  }, [presetModelId]);   // Themenseite gibt vor, wer vorn steht

  // Szenen: schon benutzte nach hinten, damit oben immer etwas Neues steht.
  const scenes: HolidayScene[] = [
    ...HOLIDAY_SCENES.filter(s => !used.includes(s.id)),
    ...HOLIDAY_SCENES.filter(s => used.includes(s.id)),
  ];
  const scene = HOLIDAY_SCENES.find(s => s.id === sceneId) ?? null;
  const picked = useCustom ? null : models[pickIdx];
  const modelPhoto = useCustom ? customModel : (picked?.photoUrl ?? "");
  const ready = !!photo && !!modelPhoto && !!scene;

  const onFile = async (f?: File | null) => { if (f) try { setPhoto(await fileToDataUrl(f)); } catch { /**/ } };
  const onModelFile = async (f?: File | null) => { if (f) try { setCustomModel(await fileToDataUrl(f)); setUseCustom(true); } catch { /**/ } };

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
    setStatus("Rendering your holiday … (~1–3 min)");
    try {
      const start = await fetch("/api/generate-tryon-video", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(pin ? { "x-try-look-admin-pin": pin } : {}) },
        body: JSON.stringify({ lookId: LOOK_ID, person: modelPhoto, garment: photo, prompt: holidayPrompt(scene) }),
      }).then(r => r.json());
      if (!start?.videoId) { setStatus(start?.error || "Could not start."); setBusy(false); return; }
      for (let i = 0; i < 72; i++) {
        await new Promise(r => setTimeout(r, 5000));
        if (runRef.current !== token) return;
        const p = await fetch(`/api/generate-tryon-video?videoId=${encodeURIComponent(start.videoId)}&curatorId=${encodeURIComponent(start.curatorId || "")}`).then(r => r.json()).catch(() => null);
        if (p?.status === "done" && p.videoUrl) {
          setVideoUrl(p.videoUrl); setTeaser(false); setStatus(""); setBusy(false);
          markUsed(scene.id);
          setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
          return;
        }
        if (p?.status === "failed") { setStatus(p.error || "Generation failed."); setBusy(false); return; }
      }
      setStatus("Timeout — please try again later."); setBusy(false);
    } catch { setStatus("Network error."); setBusy(false); }
  };

  // Immer erst die Fake-Show — auch für Staff, damit der Kundenweg sichtbar bleibt.
  const generate = () => {
    if (!ready || busy) return;
    setBusy(true); setTeaser(false); setVideoUrl(""); setStatus("");
    const token = Date.now(); runRef.current = token;
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    for (const [at, text] of RENDER_STEPS) setTimeout(() => { if (runRef.current === token) setStatus(text); }, at);
    setTimeout(() => {
      if (runRef.current !== token) return;
      setBusy(false); setStatus(""); setTeaser(true);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    }, RENDER_MS);
  };

  // Freischalten: erstes Video = Abo 24 €/Monat, jedes weitere = 3,99 € einzeln.
  const unlock = async () => {
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

  const label = "text-[12px] font-black uppercase tracking-wide text-[#f6cf51]";

  return (
    <div className="mt-8">
      {/* 1 — sein Foto */}
      <p className={label}>1 · Your photo</p>
      <button type="button" onClick={() => fileRef.current?.click()}
        className="relative mx-auto mt-2 flex aspect-[3/4] w-[52vw] max-w-[210px] flex-col items-center justify-center gap-2 overflow-hidden rounded-3xl border-2 border-dashed border-[#f6cf51]/40 bg-[#f6cf51]/[0.06] active:scale-[0.98] transition">
        {photo
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={photo} alt="" className="h-full w-full object-cover object-top" />
          : (<>
              <ImageUp className="h-8 w-8 text-[#f6cf51]" />
              <span className="px-4 text-center text-[13px] font-black text-[#f6cf51]">Upload your photo</span>
              <span className="px-5 text-center text-[12px] font-bold leading-snug text-white">You are in the video too — a full-body photo works best.</span>
            </>)}
      </button>
      {photo && (
        <button type="button" onClick={() => fileRef.current?.click()} className="mx-auto mt-2 flex items-center gap-1.5 text-[12px] font-black text-white/75">
          <RefreshCw className="h-3.5 w-3.5" /> Change photo
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => void onFile(e.target.files?.[0])} />

      {/* 2 — die Frau: Coverflow (Model-Auswahl bleibt Coverflow, Kleidung wäre ein Slider) */}
      <p className={`mt-6 ${label}`}>2 · {presetModelName ? `Your moment with ${presetModelName}` : "Your dream girl"}</p>
      <p className="mt-1 text-[13px] font-bold text-white">
        {presetModelName
          ? `${presetModelName} is up front already — swipe if you would rather take someone else, or upload your own.`
          : "Swipe the models — or upload your own. The one up front comes with you."}
      </p>
      {models.length === 0 ? (
        <div className="grid h-[46vw] max-h-[240px] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-white/50" /></div>
      ) : (() => {
        const UPLOAD: Model = { id: "__own", name: "Your own", photoUrl: "" };
        const cards = [...models];
        const upIdx = Math.min(2, cards.length);
        cards.splice(upIdx, 0, UPLOAD);
        // ACHTUNG: `cards` enthält die Upload-Karte, `models` nicht. Beide Indizes sind ab
        // dieser Position um eins verschoben — ohne Umrechnung legt sich „Your own" über das
        // gewählte Model (Bug 27.07.2026).
        const toCard = (mi: number) => (mi < upIdx ? mi : mi + 1);
        const toModel = (ci: number) => (ci < upIdx ? ci : ci - 1);
        const active = useCustom ? upIdx : Math.min(toCard(pickIdx), cards.length - 1);
        const front = (i: number) => {
          const m = cards[i];
          if (m.id === "__own") { setUseCustom(true); return; }
          setUseCustom(false);
          setPickIdx(Math.max(0, Math.min(models.length - 1, toModel(i))));
        };
        return (
          <div className="relative mx-auto mt-2 h-[72vw] max-h-[300px] select-none overflow-hidden touch-pan-y" style={{ perspective: "1100px" }}
            onPointerDown={e => { swipeRef.current = e.clientX; swipedRef.current = false; }}
            onPointerUp={e => { const dx = e.clientX - swipeRef.current; if (Math.abs(dx) > 30) { swipedRef.current = true; front(Math.min(cards.length - 1, Math.max(0, active + (dx < 0 ? 1 : -1)))); } }}>
            {cards.map((m, i) => {
              const off = i - active;
              if (Math.abs(off) > 2) return null;
              const isActive = off === 0;
              const isUpload = m.id === "__own";
              return (
                <div key={m.id}
                  onClick={() => { if (swipedRef.current) { swipedRef.current = false; return; } if (isUpload) { if (!isActive) { front(i); return; } modelFileRef.current?.click(); return; } if (!isActive) front(i); }}
                  className="absolute left-1/2 top-1/2 w-[54%] max-w-[220px] overflow-hidden rounded-2xl border border-white/15 bg-white/[0.06] shadow-2xl transition-all duration-300 ease-out"
                  style={{ transform: `translate(-50%,-50%) translateX(${off * 56}%) rotateY(${-off * 38}deg) scale(${isActive ? 1 : 0.82})`, zIndex: 20 - Math.abs(off), opacity: Math.abs(off) === 2 ? 0.45 : 1, cursor: "pointer" }}>
                  <div className="relative aspect-[3/4] w-full">
                    {isUpload && !customModel ? (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#241c11] px-3 text-center">
                        <ImageUp className="h-9 w-9 text-[#f6cf51]" />
                        <span className="text-[13px] font-black text-[#f6cf51]">Your own</span>
                        <span className="text-[11px] font-bold leading-snug text-white/85">Any woman you like — upload one photo of her.</span>
                      </div>
                    ) : (<>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={isUpload ? customModel : m.photoUrl} alt={m.name} draggable={false} className="h-full w-full object-cover object-top" />
                      {isUpload && isActive && <span className="absolute inset-x-3 bottom-8 rounded-full bg-black/60 py-1 text-center text-[10px] font-black text-white backdrop-blur">Tap to change photo</span>}
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

      {/* 3 — die Szene: er WÄHLT, kein Zufall. Benutzte sind markiert. */}
      <p className={`mt-6 ${label}`}>3 · What happens</p>
      <p className="mt-1 text-[13px] font-bold text-white">
        Swipe through {HOLIDAY_SCENES.length} moments and tap one. {used.length > 0 ? `${used.length} already made — those are marked, so you never get the same video twice.` : "Nothing is random — you pick."}
      </p>
      {/* SLIDES statt Kachelliste (Owner 29.07.2026). 25 Momente als zweispaltiges Raster
          waren 13 Zeilen Scrollen mitten im Trichter — er wischt lieber. EINE Reihe,
          waagerecht wischbar, mit Einrastpunkten; die Scrollleiste ist ausgeblendet, das
          angeschnittene nächste Feld zeigt, dass es weitergeht. `-mx-4 px-4` lässt die Reihe
          bis an den Bildschirmrand laufen, ohne den Innenabstand der Seite zu verlieren. */}
      <div className="-mx-4 mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

      {/* 4 — generieren */}
      <p className={`mt-6 ${label}`}>4 · Your video</p>
      <button type="button" onClick={generate} disabled={!ready || busy}
        className="lb-gold mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-black active:scale-95 transition disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {busy ? "Rendering …" : scene ? `Create: ${scene.label}` : "Pick a moment first"}
      </button>
      <p className="mt-2 text-[13px] font-bold leading-snug text-white/75">
        {aboPaid ? "Every extra video is 3.99 €." : "The first one starts your topic subscription at 24,50 € a month — every extra video after that is 3.99 €."}
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
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-2 bg-gradient-to-t from-black/70 to-transparent p-4 pt-12 text-white">
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
                    {isStaff ? "Reveal (Admin — free)" : aboPaid ? "Unlock — €3.99" : "Unlock — 24,50 €/month"}
                  </button>
                  {!isStaff && <p className="lb-onmedia mt-2 text-[11px] font-bold opacity-80">Secure checkout by Stripe · cancel any time</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fertiges Video */}
        {videoUrl && (
          <div className="mx-auto mt-4 w-fit">
            <div className="overflow-hidden rounded-3xl border border-white/10">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video src={videoUrl} controls autoPlay loop playsInline className="aspect-[3/4] max-h-[60vh] w-auto" />
            </div>
            <a href={videoUrl} download={`holiday-${scene?.id ?? "video"}.mp4`} target="_blank" rel="noreferrer"
              className="lb-gold mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full text-[14px] font-black active:scale-95 transition">
              <Download className="h-4 w-4" /> Download the video
            </a>
            <button type="button" onClick={() => { setVideoUrl(""); setSceneId(""); setTeaser(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/25 text-[14px] font-black text-white/85 active:scale-95 transition">
              <Plus className="h-4 w-4" /> Next moment — 3.99 €
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
