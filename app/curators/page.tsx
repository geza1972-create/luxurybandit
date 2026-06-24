"use client";

import { useRouter } from "next/navigation";
import { Sparkles, ThumbsUp, Wand2, Share2, TrendingUp, Instagram } from "lucide-react";

export default function CuratorsLandingPage() {
  const router = useRouter();

  const steps = [
    { icon: <TrendingUp className="h-5 w-5" />, title: "Spot the trend", desc: "Your eye is the job. AI scans and suggests — you decide what's hot." },
    { icon: <ThumbsUp className="h-5 w-5" />, title: "Just yes or no", desc: "AI does the heavy lifting. You only make the call: in or out." },
    { icon: <Wand2 className="h-5 w-5" />, title: "Generate the look", desc: "One tap turns a trend into an editorial AI look — your creative signature." },
    { icon: <Share2 className="h-5 w-5" />, title: "Post try-ons & share", desc: "Try looks on, get friends to try them too, and push them on your Instagram." },
  ];

  return (
    <div className="min-h-[100dvh] bg-white" style={{ paddingBottom: "calc(150px + env(safe-area-inset-bottom))" }}>
      {/* Hero */}
      <div className="flex flex-col items-center gap-4 px-6 pt-16 pb-8 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-3xl bg-black text-white text-3xl shadow-xl">✦</div>
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cobalt">LuxuryBandit · Curators</p>
        <h1 className="text-3xl font-black leading-[1.05] tracking-tight text-black">
          Fashion curators<br />wanted
        </h1>
        <p className="max-w-xs text-sm font-medium leading-6 text-black/55">
          Spot the trends. AI does the rest. You make the yes/no calls and post the try-ons —
          and you get paid via affiliate on every look you approve.
        </p>
      </div>

      {/* How it works */}
      <div className="grid gap-3 px-5 pt-2">
        {steps.map((s, i) => (
          <div key={i} className="flex items-start gap-3 rounded-2xl border border-black/8 bg-black/[0.02] p-4">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-black text-white">{s.icon}</div>
            <div className="min-w-0">
              <p className="text-sm font-black text-black">{s.title}</p>
              <p className="mt-0.5 text-xs font-medium leading-5 text-black/55">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* How credits work — the rules, up front */}
      <div className="mx-5 mt-5 rounded-2xl border border-cobalt/20 bg-cobalt/[0.04] p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cobalt" />
          <p className="text-sm font-black text-black">Your chance to prove yourself — on us</p>
        </div>
        <p className="mt-1.5 text-xs font-medium leading-5 text-black/55">
          You start with <span className="font-black text-black">free credits</span>. Using the tools — AI try-ons and
          product search — costs credits. Show you've got the eye: as your looks pick up
          <span className="font-black text-black"> likes, try-ons and followers</span>, you automatically
          <span className="font-black text-black"> earn more credits</span>.
        </p>
        <p className="mt-1.5 text-xs font-medium leading-5 text-black/55">
          Not enough traction yet but want to keep going? Then you can
          <span className="font-black text-black"> buy credits</span> to keep creating while you build your following.
        </p>
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-bold text-black/40">
          <Instagram className="h-3.5 w-3.5" /> Bring your Instagram — it's your stage.
        </div>
      </div>

      {/* CTA */}
      <div className="fixed inset-x-0 z-20 border-t border-black/8 bg-white/95 px-5 pt-3 backdrop-blur"
        style={{ bottom: "calc(56px + env(safe-area-inset-bottom))", paddingBottom: "0.75rem" }}>
        <button type="button" onClick={() => router.push("/curators/apply")}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-black text-base font-black text-white shadow-lg active:scale-95 transition-transform">
          <Sparkles className="h-5 w-5" /> Apply as a curator
        </button>
      </div>
    </div>
  );
}
