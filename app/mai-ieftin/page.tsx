"use client";

export const dynamic = "force-dynamic";

import { Link2, ImagePlus, Search, Check, ShieldCheck, Zap, Tag, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

// ────────────────────────────────────────────────────────────────────────────
// "Găsește-l mai ieftin" — a Dupe-style landing funnel (Romanian). DESIGN ONLY:
// paste a product link OR upload a photo → we (will) find the same product cheaper.
// No backend yet — submit just shows a friendly confirmation so the ad demo feels
// alive. Wiring the actual search comes later.
// ────────────────────────────────────────────────────────────────────────────
export default function MaiIeftinPage() {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<string>(""); // object URL of the uploaded photo
  const [fileName, setFileName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickFile = (f?: File | null) => {
    if (!f) return;
    setFileName(f.name);
    try { setPreview(URL.createObjectURL(f)); } catch { /**/ }
  };
  const clearFile = () => { setPreview(""); setFileName(""); if (fileRef.current) fileRef.current.value = ""; };

  const canSubmit = url.trim().length > 3 || !!preview;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitted(true); // no backend yet — just confirm
  };

  return (
    <div className="min-h-screen bg-[#fafaf8] text-black">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-8">
        {/* Logo */}
        <Link href="/home" aria-label="LuxuryBandit" className="mx-auto inline-flex items-center gap-2 active:scale-95 transition">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/lb-logo.png" alt="LuxuryBandit" className="h-9 w-9 rounded-full object-contain" />
          <span className="text-lg font-black tracking-tight">LuxuryBandit</span>
        </Link>

        {!submitted ? (
          <>
            {/* Hero */}
            <div className="mt-9 text-center">
              <div className="mx-auto mb-4 inline-flex items-center gap-1.5 rounded-full bg-[#f0e6cf] px-3 py-1 text-[12px] font-black uppercase tracking-wide text-[#8a6d1f]">
                <Tag className="h-3.5 w-3.5" /> Găsește-l mai ieftin
              </div>
              <h1 className="text-[30px] font-black leading-[1.1] tracking-tight">
                Ai văzut ceva ce-ți place?
                <br />
                <span className="text-[#b8912f]">Îl găsim mai ieftin.</span>
              </h1>
              <p className="mx-auto mt-3 max-w-[20rem] text-[15px] font-semibold leading-relaxed text-black/55">
                Lipește linkul produsului sau încarcă o poză. Îți găsim exact același produs — sau unul aproape identic — la cel mai mic preț.
              </p>
            </div>

            {/* Card */}
            <form onSubmit={submit} className="mt-7 rounded-3xl border border-black/8 bg-white p-4 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.12)]">
              {/* URL input */}
              <label className="flex items-center gap-2.5 rounded-2xl border border-black/12 bg-[#fafaf8] px-4 focus-within:border-black/40">
                <Link2 className="h-5 w-5 shrink-0 text-black/35" />
                <input
                  type="url"
                  inputMode="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Lipește linkul produsului…"
                  className="h-14 w-full bg-transparent text-[15px] font-bold text-black placeholder:text-black/35 outline-none"
                />
              </label>

              {/* divider */}
              <div className="my-3 flex items-center gap-3">
                <div className="h-px flex-1 bg-black/8" />
                <span className="text-[11px] font-black uppercase tracking-wider text-black/30">sau</span>
                <div className="h-px flex-1 bg-black/8" />
              </div>

              {/* Upload */}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
              {preview ? (
                <div className="relative overflow-hidden rounded-2xl border border-black/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt={fileName} className="h-40 w-full object-cover" />
                  <button type="button" onClick={clearFile} aria-label="Șterge poza"
                    className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white active:scale-90 transition">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-black/15 bg-[#fafaf8] py-7 text-black/45 active:scale-[0.99] transition">
                  <ImagePlus className="h-7 w-7" />
                  <span className="text-[14px] font-black text-black/60">Încarcă o poză</span>
                  <span className="text-[12px] font-semibold text-black/35">screenshot, poză din magazin, orice</span>
                </button>
              )}

              {/* CTA */}
              <button type="submit" disabled={!canSubmit}
                className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#e7c977] to-[#c9a23f] text-[16px] font-black text-black shadow-[0_8px_24px_-6px_rgba(201,162,63,0.7)] disabled:from-black/10 disabled:to-black/10 disabled:text-black/30 disabled:shadow-none active:scale-[0.98] transition">
                <Search className="h-5 w-5" /> Găsește mai ieftin
              </button>
            </form>

            {/* Trust row */}
            <div className="mt-4 flex items-center justify-center gap-4 text-[12px] font-bold text-black/45">
              <span className="inline-flex items-center gap-1"><ShieldCheck className="h-4 w-4 text-[#b8912f]" /> Gratis</span>
              <span className="inline-flex items-center gap-1"><Check className="h-4 w-4 text-[#b8912f]" /> Fără cont</span>
              <span className="inline-flex items-center gap-1"><Zap className="h-4 w-4 text-[#b8912f]" /> În câteva secunde</span>
            </div>

            {/* How it works */}
            <div className="mt-9">
              <p className="text-center text-[12px] font-black uppercase tracking-wider text-black/35">Cum funcționează</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  { n: "1", t: "Lipești linkul", s: "sau poza" },
                  { n: "2", t: "Căutăm", s: "în sute de magazine" },
                  { n: "3", t: "Primești prețuri", s: "cele mai mici" },
                ].map((x) => (
                  <div key={x.n} className="rounded-2xl border border-black/8 bg-white p-3">
                    <div className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-[#f0e6cf] text-[14px] font-black text-[#8a6d1f]">{x.n}</div>
                    <p className="mt-2 text-[13px] font-black leading-tight">{x.t}</p>
                    <p className="mt-0.5 text-[11px] font-semibold leading-tight text-black/40">{x.s}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Confirmation (no backend yet) */
          <div className="mt-16 flex flex-1 flex-col items-center text-center">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-b from-[#e7c977] to-[#c9a23f] shadow-[0_10px_30px_-6px_rgba(201,162,63,0.7)]">
              <Check className="h-10 w-10 text-black" strokeWidth={3} />
            </div>
            <h2 className="mt-6 text-[26px] font-black leading-tight tracking-tight">Am primit! 🔎</h2>
            <p className="mx-auto mt-3 max-w-[20rem] text-[15px] font-semibold leading-relaxed text-black/55">
              Căutăm cele mai bune prețuri pentru produsul tău. Îți arătăm rezultatele în câteva momente.
            </p>
            {preview && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={preview} alt="" className="mt-6 h-32 w-32 rounded-2xl border border-black/10 object-cover" />
            )}
            {url && !preview && (
              <div className="mt-6 max-w-full truncate rounded-xl border border-black/10 bg-white px-4 py-3 text-[13px] font-bold text-black/50">{url}</div>
            )}
            <button type="button" onClick={() => { setSubmitted(false); setUrl(""); clearFile(); }}
              className="mt-8 rounded-full border border-black/15 bg-white px-6 py-3 text-[14px] font-black text-black active:scale-95 transition">
              Caută alt produs
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto pt-10 text-center text-[11px] font-semibold text-black/30">
          <a href="/terms" className="underline underline-offset-2">Termeni</a> · <a href="/privacy" className="underline underline-offset-2">Confidențialitate</a>
        </div>
      </div>
    </div>
  );
}
