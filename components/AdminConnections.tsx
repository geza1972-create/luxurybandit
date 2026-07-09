"use client";

import { useMemo, useState } from "react";
import { Check, Video, X } from "lucide-react";

type Post = { curatorId?: string; lookId?: string; videoUrl?: string };
type Look = { id: string; name: string; frontImageUrl?: string; imageUrl?: string; videoUrl?: string; category?: string; lingerie?: boolean; featured?: boolean };
type Model = { id: string; firstName?: string; lastName?: string; featured?: boolean };

// Admin overview: for a chosen model, which looks are a FREE try-on already, i.e. a video
// exists — either a model×look generation ("generated") or the look's own uploaded video
// ("look video", plays for any model). Helps the admin connect a model with good looks.
export default function AdminConnections({ posts, looks, models }: { posts: Post[]; looks: Look[]; models: Model[] }) {
  const ordered = useMemo(() => [...models].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)), [models]);
  const [modelId, setModelId] = useState<string>(() => ordered.find(m => m.featured)?.id || ordered[0]?.id || "");
  const [filter, setFilter] = useState<"ready" | "missing" | "all">("ready");
  const [lingerieOnly, setLingerieOnly] = useState(false);

  const rows = useMemo(() => {
    // Which (model,look) pairs have a real generated video.
    const genLooks = new Set(posts.filter(p => p.curatorId === modelId && p.lookId && p.videoUrl).map(p => p.lookId as string));
    return looks
      .filter(l => !lingerieOnly || l.category === "boudoir" || l.lingerie === true)
      .map(l => {
        const status: "generated" | "lookvideo" | "none" = genLooks.has(l.id) ? "generated" : l.videoUrl ? "lookvideo" : "none";
        return { id: l.id, name: l.name, thumb: l.frontImageUrl || l.imageUrl || l.videoUrl || "", status };
      })
      .filter(r => filter === "all" || (filter === "ready" ? r.status !== "none" : r.status === "none"));
  }, [posts, looks, modelId, filter, lingerieOnly]);

  const readyCount = useMemo(() => {
    const genLooks = new Set(posts.filter(p => p.curatorId === modelId && p.lookId && p.videoUrl).map(p => p.lookId as string));
    const rel = looks.filter(l => !lingerieOnly || l.category === "boudoir" || l.lingerie === true);
    return { ready: rel.filter(l => genLooks.has(l.id) || l.videoUrl).length, total: rel.length };
  }, [posts, looks, modelId, lingerieOnly]);

  const badge = (s: "generated" | "lookvideo" | "none") =>
    s === "generated" ? { t: "Video ✓", c: "bg-emerald-500 text-white" }
    : s === "lookvideo" ? { t: "Look-video", c: "bg-cobalt text-white" }
    : { t: "no video", c: "bg-black/10 text-ink/50" };

  return (
    <section className="rounded-2xl border border-black/8 bg-white p-4">
      <p className="flex items-center gap-1.5 text-sm font-black text-ink"><Video className="h-4 w-4 text-ink/40" /> Try-on connections</p>
      <p className="mt-0.5 text-[11px] font-bold text-ink/45">Which looks are a FREE try-on for a model (a video exists). <b>Video ✓</b> = made for this model · <b>Look-video</b> = the look&apos;s own clip (works for any model).</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select value={modelId} onChange={e => setModelId(e.target.value)}
          className="h-9 rounded-lg border border-black/12 bg-black/[0.02] px-3 text-[13px] font-black text-ink outline-none focus:border-black/40">
          {ordered.map(m => <option key={m.id} value={m.id}>{[m.firstName, m.lastName].filter(Boolean).join(" ") || "Model"}{m.featured ? " ★ free" : ""}</option>)}
        </select>
        <div className="flex gap-1 rounded-full bg-black/[0.04] p-1">
          {(["ready", "missing", "all"] as const).map(k => (
            <button key={k} type="button" onClick={() => setFilter(k)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-black transition ${filter === k ? "bg-black text-white" : "text-ink/50"}`}>
              {k === "ready" ? "Video-ready" : k === "missing" ? "No video" : "All"}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setLingerieOnly(v => !v)}
          className={`rounded-full px-2.5 py-1.5 text-[11px] font-black transition ${lingerieOnly ? "bg-black text-white" : "bg-black/[0.06] text-ink/55"}`}>Lingerie only</button>
        <span className="ml-auto text-[12px] font-black text-ink/60">{readyCount.ready}/{readyCount.total} ready</span>
      </div>

      <div className="mt-3 max-h-[60vh] space-y-1.5 overflow-y-auto pr-1">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-[12px] font-bold text-ink/35">Nothing here.</p>
        ) : rows.map(r => {
          const b = badge(r.status);
          return (
            <div key={r.id} className="flex items-center gap-3 rounded-xl border border-black/8 bg-white p-2">
              <div className="h-12 w-9 shrink-0 overflow-hidden rounded-md bg-black/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {r.thumb ? <img src={r.thumb} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full w-full place-items-center text-ink/20"><X className="h-4 w-4" /></span>}
              </div>
              <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-ink">{r.name}</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${b.c}`}>{r.status === "generated" && <Check className="h-3 w-3" />}{b.t}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
