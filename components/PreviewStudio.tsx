"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, ImageUp, Sparkles } from "lucide-react";

/**
 * DER VORSCHAU-PRÜFSTAND — eigene Box (Owner 29.07.2026: „mach mir für diese geschichte eine
 * extrabox, die wir genauso übernehmen werden für den user").
 *
 * Deshalb steht er BEWUSST in einer eigenen Datei und nicht im Medien-Werkzeug: Die Box soll
 * später unverändert in den Kunden-Trichter wandern. Dort heißt „sie" dann das gewählte Model
 * und „er" sein hochgeladenes Foto — der Ablauf bleibt derselbe.
 *
 * Ablauf: Foto von ihr wählen → Foto von ihm → Prompt → Generieren → Ergebnis.
 *
 * WAS DABEI GELERNT WURDE (damit es niemand erneut herausfinden muss):
 *  · Die Bildmoderation von OpenAI prüft schon die EINGABE. Ein Lingerie-Foto als Referenz
 *    wird abgewiesen, bevor irgendein Prompt gelesen wird — deshalb die angezogenen Vorlagen.
 *  · Ohne Bedeckungs-Zusage im Prompt wird die AUSGABE abgewiesen. Die Route hängt sie an.
 *  · Ein einziger klarer Satz trifft besser als eine Liste von Anweisungen.
 */

export type PreviewRef = { path: string; url: string };

export default function PreviewStudio({
  theme,
  refs,
  manUrl,
  onManFile,
  busyMan = false,
  authHeaders,
}: {
  theme: string;
  refs: PreviewRef[];                       // angezogene Fotos von ihr
  manUrl: string;                           // sein Foto (gespeichert)
  onManFile: (f: File) => void | Promise<void>;
  busyMan?: boolean;
  authHeaders: () => Record<string, string>;
}) {
  const [idx, setIdx] = useState(0);
  const [prompt, setPrompt] = useState(
    "Mach die beiden zusammen an einem schönen Urlaubsort wie sie sich küssen",
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [result, setResult] = useState("");
  const manFileRef = useRef<HTMLInputElement>(null);

  // Wird eine Vorlage gelöscht, darf die Auswahl nicht ins Leere zeigen.
  useEffect(() => { if (idx >= refs.length) setIdx(0); }, [refs.length, idx]);

  // Die Bilder liegen als signierte Adressen vor; die Route erwartet Data-URLs — dasselbe
  // Format, das der Trichter beim Hochladen erzeugt.
  const urlToDataUrl = async (url: string): Promise<string> => {
    const blob = await (await fetch(url)).blob();
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  };

  const run = async () => {
    const her = refs[idx]?.url;
    if (!her || !manUrl) { setMsg("❌ Es fehlt ein Foto von ihr oder von ihm."); return; }
    setBusy(true); setMsg(""); setResult("");
    try {
      const [model, person] = await Promise.all([urlToDataUrl(her), urlToDataUrl(manUrl)]);
      const r = await fetch("/api/free-preview", {
        method: "POST",
        headers: authHeaders(),
        // person = ER (Bild 1), model = SIE (Bild 2) — dieselbe Reihenfolge wie im Prompt
        // des Owners: „The man from @image1 and the woman from @image2".
        body: JSON.stringify({ person, model, prompt, theme }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(`❌ ${d?.error ?? `Fehlgeschlagen (${r.status})`}`); return; }
      setResult(d.image ?? "");
      setMsg("✅ Bild erzeugt.");
    } catch (e) {
      setMsg(`❌ ${e instanceof Error ? e.message : "Netzwerkfehler"}`);
    } finally { setBusy(false); }
  };

  const beispiel = "Mach die beiden zusammen an einem schönen Urlaubsort wie sie sich küssen";

  return (
    <div className="mt-4 rounded-2xl border-2 border-black/10 bg-black/[0.02] p-3">
      <p className="text-[11px] font-black uppercase tracking-wide text-black/55">
        Vorschau erzeugen — <span className="text-black/40">sie, er, dein Satz</span>
      </p>

      {/* 1 — sie: antippen wählt aus */}
      <p className="mt-3 text-[11px] font-black text-black/45">1 · Welches Foto von ihr?</p>
      {refs.length === 0 ? (
        <p className="mt-1 text-[12px] font-bold text-black/40">Noch keine Vorlage — oben eine hinzufügen.</p>
      ) : (
        <div className="mt-1.5 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {refs.map((r, i) => (
            <button key={r.path} type="button" onClick={() => setIdx(i)}
              className={`relative aspect-[2/3] w-[72px] shrink-0 overflow-hidden rounded-lg border-2 transition ${
                idx === i ? "border-[#f6cf51]" : "border-black/10 opacity-60"
              }`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* 2 — er */}
      <p className="mt-3 text-[11px] font-black text-black/45">2 · Foto von ihm</p>
      <div className="mt-1.5 flex items-center gap-3">
        <button type="button" onClick={() => manFileRef.current?.click()} disabled={busyMan}
          className="grid aspect-[2/3] w-[72px] shrink-0 place-items-center overflow-hidden rounded-lg border-2 border-dashed border-black/15 bg-black/[0.03] active:scale-[0.98] transition">
          {manUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={manUrl} alt="" className="h-full w-full object-cover" />
            : (busyMan ? <Loader2 className="h-5 w-5 animate-spin text-black/40" /> : <ImageUp className="h-5 w-5 text-black/40" />)}
        </button>
        <p className="min-w-0 text-[12px] font-bold text-black/60">
          {manUrl ? "Tippen zum Ersetzen." : "Antippen und ein Foto von ihm wählen."}
        </p>
      </div>
      <input ref={manFileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) void onManFile(f); e.target.value = ""; }} />

      {/* 3 — der Satz */}
      <p className="mt-3 text-[11px] font-black text-black/45">3 · Was soll passieren?</p>
      <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
        placeholder={beispiel}
        className="mt-1.5 w-full rounded-xl border border-black/15 bg-white p-2.5 text-[13px] font-semibold text-black outline-none focus:border-black/40" />
      <p className="mt-1 text-[11px] font-bold leading-snug text-black/40">
        Ein klarer Satz reicht. Eine Bedeckungs-Zusage wird automatisch angehängt — ohne sie
        weist OpenAI das Bild ab.
      </p>

      <button type="button" onClick={() => void run()} disabled={busy || !refs.length || !manUrl}
        style={{ color: "#fff" }}
        className="mt-2.5 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-black text-[14px] font-black active:scale-95 transition disabled:opacity-40">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {busy ? "Erzeuge … (bis zu 40 s)" : "Generieren"}
      </button>

      {msg && <p className="mt-2 rounded-lg bg-black/[0.05] px-3 py-2 text-[12px] font-bold text-black/70">{msg}</p>}

      {result && (
        <div className="mt-2 overflow-hidden rounded-xl border border-black/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result} alt="" className="w-full" />
        </div>
      )}
    </div>
  );
}
