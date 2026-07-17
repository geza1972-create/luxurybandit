"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Crown } from "lucide-react";

type Sub = { id: string; name: string; photoUrl?: string };

// The models THIS user subscribes to (lb_subs = list of curatorIds). Works for any account type
// (member or creator) — it's purely client-side, no login gate.
export default function MySubscriptionsPage() {
  const router = useRouter();
  const [subs, setSubs] = useState<Sub[] | null>(null);

  useEffect(() => {
    let ids: string[] = [];
    try { const raw = JSON.parse(localStorage.getItem("lb_subs") || "[]"); if (Array.isArray(raw)) ids = raw.map(String); } catch { /**/ }
    if (!ids.length) { setSubs([]); return; }
    Promise.all(ids.map(id =>
      fetch(`/api/curator?profile=${encodeURIComponent(id)}`).then(r => r.json())
        .then(d => ({ id, name: [d?.profile?.firstName, d?.profile?.lastName].filter(Boolean).join(" ").trim() || d?.profile?.firstName || "Model", photoUrl: d?.profile?.photoUrl as string | undefined }))
        .catch(() => ({ id, name: "Model", photoUrl: undefined }))
    )).then(setSubs).catch(() => setSubs([]));
  }, []);

  return (
    <div className="min-h-[100dvh] lb-bg text-white">
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-black/70 px-4 py-3 backdrop-blur">
        <button type="button" onClick={() => router.back()} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15"><ArrowLeft className="h-4 w-4" /></button>
        <p className="flex-1 text-sm font-black">My subscriptions</p>
      </div>

      <div className="mx-auto max-w-md px-5 pt-5">
        {subs === null ? (
          <p className="py-16 text-center text-sm font-bold text-white/40">Loading…</p>
        ) : subs.length === 0 ? (
          <div className="py-16 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.06]"><Crown className="h-7 w-7 text-amber-400" /></span>
            <p className="mt-4 text-base font-black">No subscriptions yet</p>
            <p className="mx-auto mt-1 max-w-xs text-[13px] font-semibold text-white/50">Subscribe to a model to see her private photos, videos and chat with her — each model is her own subscription.</p>
            <button type="button" onClick={() => router.push("/stores?view=models")} className="lb-gold mt-5 rounded-full px-6 py-3 text-sm font-black active:scale-95">Browse models</button>
          </div>
        ) : (
          <>
            <p className="text-[11px] font-black uppercase tracking-wide text-white/45">Active ({subs.length})</p>
            <div className="mt-2 grid gap-2">
              {subs.map(s => (
                <button key={s.id} type="button" onClick={() => router.push(`/curator/${s.id}`)}
                  className="flex items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] px-3 py-3 text-left active:scale-[0.99] transition">
                  {s.photoUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={s.photoUrl} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover object-top" />
                    : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/10 text-base font-black text-white/60">{s.name.slice(0, 1)}</span>}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-black text-white">{s.name}</span>
                    <span className="block text-[12px] font-bold text-amber-300/80">Active subscription · manage on her profile</span>
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-4 text-center text-[11px] font-bold text-white/35">Each model is her own subscription. Cancel anytime on her profile.</p>
          </>
        )}
      </div>
    </div>
  );
}
