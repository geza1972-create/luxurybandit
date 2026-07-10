"use client";

export const dynamic = "force-dynamic";

import { Plus, ArrowUp, Check, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

// ────────────────────────────────────────────────────────────────────────────
// "Găsește-l mai ieftin" — a Dupe-style funnel (Romanian, DARK). DESIGN ONLY:
// one big box — paste a link, search, or add a photo → we (will) find it cheaper.
// No backend yet — submit shows a short confirmation. Search wiring comes later.
// ────────────────────────────────────────────────────────────────────────────
export default function MaiIeftinPage() {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState(""); // object URL of an added photo
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickFile = (f?: File | null) => {
    if (!f) return;
    try { setPreview(URL.createObjectURL(f)); } catch { /**/ }
  };
  const clearFile = () => { setPreview(""); if (fileRef.current) fileRef.current.value = ""; };

  const canSubmit = text.trim().length > 2 || !!preview;
  const submit = () => { if (canSubmit) setSubmitted(true); }; // no backend yet

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 py-4">
        <Link href="/home" aria-label="LuxuryBandit" className="inline-flex items-center gap-2 active:scale-95 transition">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/lb-logo.png" alt="" className="h-8 w-8 rounded-full object-contain" />
          <span className="text-[17px] font-black tracking-tight">LuxuryBandit</span>
        </Link>
        <Link href="/login?mode=signup&returnTo=/mai-ieftin"
          className="rounded-full bg-white/10 px-4 py-2 text-[13px] font-black text-white active:scale-95 transition">
          Cont
        </Link>
      </header>

      {/* Center */}
      <main className="flex flex-1 flex-col items-center justify-center px-5 pb-24">
        {!submitted ? (
          <div className="w-full max-w-md">
            <h1 className="mb-8 text-center text-[32px] font-black leading-tight tracking-tight">
              Găsește-l mai ieftin
            </h1>

            {/* The one box */}
            <div className="rounded-[28px] bg-white/[0.07] p-3 ring-1 ring-white/10 focus-within:ring-white/25 transition">
              {preview && (
                <div className="mb-2 inline-flex items-center gap-2 rounded-2xl bg-white/10 p-1 pr-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="" className="h-10 w-10 rounded-xl object-cover" />
                  <button type="button" onClick={clearFile} aria-label="Șterge" className="text-white/60 active:scale-90 transition">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
                rows={2}
                placeholder="Lipește un link, o poză sau caută…"
                className="w-full resize-none bg-transparent px-2 pt-1 text-[16px] font-semibold text-white placeholder:text-white/40 outline-none"
              />

              <div className="mt-1 flex items-center justify-between px-1">
                {/* + = add a photo */}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
                <button type="button" onClick={() => fileRef.current?.click()} aria-label="Adaugă o poză"
                  className="grid h-9 w-9 place-items-center rounded-full text-white/70 hover:bg-white/10 active:scale-90 transition">
                  <Plus className="h-5 w-5" />
                </button>

                {/* send */}
                <button type="button" onClick={submit} disabled={!canSubmit} aria-label="Caută"
                  className="grid h-9 w-9 place-items-center rounded-full bg-white text-black disabled:bg-white/15 disabled:text-white/40 active:scale-90 transition">
                  <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
                </button>
              </div>
            </div>

            <p className="mt-4 text-center text-[13px] font-semibold text-white/40">
              Gratis · fără cont · în câteva secunde
            </p>
          </div>
        ) : (
          /* Confirmation (no backend yet) */
          <div className="flex w-full max-w-md flex-col items-center text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-white">
              <Check className="h-8 w-8 text-black" strokeWidth={3} />
            </div>
            <h2 className="mt-5 text-[24px] font-black leading-tight">Am primit! 🔎</h2>
            <p className="mx-auto mt-3 max-w-[19rem] text-[15px] font-semibold leading-relaxed text-white/55">
              Căutăm cele mai bune prețuri. Îți arătăm rezultatele în câteva momente.
            </p>
            <button type="button" onClick={() => { setSubmitted(false); setText(""); clearFile(); }}
              className="mt-7 rounded-full bg-white/10 px-6 py-3 text-[14px] font-black text-white active:scale-95 transition">
              Caută altceva
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
