"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Instagram, Loader2, ShoppingBag, UserPlus, UserCheck, MessageCircle, X, Send, Play, Sparkles } from "lucide-react";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";

const fmtN = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);
// Viewer auth headers: Supabase token OR curator session (our only login).
function viewerHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  try { const s = getStoredAuthSession(); if (s?.access_token) h.Authorization = `Bearer ${s.access_token}`; } catch { /**/ }
  try { const c = JSON.parse(localStorage.getItem("lb_curator") ?? "{}"); if (c?.id && !h.Authorization) h["x-curator-id"] = c.id; } catch { /**/ }
  return h;
}

type Profile = { id: string; firstName?: string; lastName?: string; motto?: string; bio?: string; photoUrl?: string; instagram?: string; style?: string; genderFocus?: string };
type Look = { id: string; name: string; imageUrl: string; frontImageUrl?: string; curatorId?: string; published?: boolean; aiCreated?: boolean; videoUrl?: string; alternatives?: { priceValue?: number; currency?: string }[]; price?: string; salePrice?: string };
type TryOn = { id: string; imageUrl: string; videoUrl?: string; lookName?: string; lookId?: string };

const toSlug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
function optImg(url?: string, w = 600) { if (!url) return ""; if (url.startsWith("data:") || url.startsWith("blob:")) return url; return `/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=70`; }
// Map a currency value (symbol or ISO code, possibly empty) to a display symbol.
// Missing/unknown currency defaults to "$" so prices never render bare ("from 55").
function currencySymbol(c?: string): string {
  const raw = (c ?? "").trim();
  if (!raw) return "$";
  if (/[$€£¥₹]/.test(raw)) return raw; // already a symbol
  const map: Record<string, string> = { USD: "$", US: "$", CAD: "$", AUD: "$", EUR: "€", GBP: "£", JPY: "¥", INR: "₹" };
  return map[raw.toUpperCase()] ?? "$";
}

function priceFrom(alts?: Look["alternatives"]): string | null {
  const v = (alts ?? []).filter(a => typeof a.priceValue === "number" && (a.priceValue as number) > 0);
  if (!v.length) return null;
  const by: Record<string, number[]> = {}; for (const a of v) { const c = a.currency ?? ""; (by[c] ??= []).push(a.priceValue as number); }
  const cur = Object.keys(by).sort((a, b) => by[b].length - by[a].length)[0];
  const lo = Math.min(...by[cur]); return `from ${currencySymbol(cur)}${Number.isInteger(lo) ? lo : lo.toFixed(2)}`;
}

export default function CuratorPublicPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? "");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [looks, setLooks] = useState<Look[]>([]);
  const [allLooks, setAllLooks] = useState<Look[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tryons, setTryons] = useState<TryOn[]>([]);
  const [lookPrices, setLookPrices] = useState<Record<string, string>>({});
  const [ownLookIds, setOwnLookIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  // Follow + message
  const [followerCount, setFollowerCount] = useState(0);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showMsg, setShowMsg] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const isOwn = (() => { try { return JSON.parse(localStorage.getItem("lb_curator") ?? "{}").id === id; } catch { return false; } })();

  useEffect(() => {
    if (!id) return;
    fetch(`/api/follow?slug=${encodeURIComponent(id)}&type=user`, { headers: viewerHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setFollowerCount(d.followerCount ?? 0); setFollowing(!!d.following); } })
      .catch(() => {});
  }, [id]);

  const isAuthed = () => { try { return !!getStoredAuthSession()?.access_token || !!JSON.parse(localStorage.getItem("lb_curator") ?? "{}").id; } catch { return false; } };
  const handleFollow = async () => {
    if (!isAuthed()) { router.push("/stores?panel=account"); return; }
    setFollowLoading(true);
    try {
      const res = await fetch("/api/follow", { method: "POST", headers: viewerHeaders(), body: JSON.stringify({ slug: id, type: "user", action: following ? "unfollow" : "follow" }) });
      if (res.ok) { const d = await res.json(); setFollowerCount(d.followerCount); setFollowing(d.following); }
      else if (res.status === 401) router.push("/stores?panel=account");
    } catch { /**/ }
    setFollowLoading(false);
  };
  const handleSendMsg = async () => {
    if (!msgText.trim()) return;
    if (!isAuthed()) { router.push("/stores?panel=account"); return; }
    setSending(true);
    try {
      const res = await fetch("/api/messages", { method: "POST", headers: viewerHeaders(), body: JSON.stringify({ toUserId: id, text: msgText.trim() }) });
      if (res.ok) { setSent(true); setMsgText(""); }
      else if (res.status === 401) router.push("/stores?panel=account");
    } catch { /**/ }
    setSending(false);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [p, all] = await Promise.all([
          fetch(`/api/curator?profile=${encodeURIComponent(id)}`).then(r => r.json()).then(d => d.profile as Profile | null),
          fetch("/api/try-this-look").then(r => r.json()).then(d => (d.looks ?? []) as Look[]),
        ]);
        if (!active) return;
        setProfile(p);
        setAllLooks(all.filter(l => l.published !== false));
        setLooks(all.filter(l => l.curatorId === id && l.published !== false));
        // Price lookup for try-ons (they reference a shoppable look by id).
        const prices: Record<string, string> = {};
        for (const l of all) { const f = priceFrom(l.alternatives) ?? l.salePrice ?? l.price; if (f) prices[l.id] = f; }
        setLookPrices(prices);
        // Looks this curator created — a try-on of one of these is a self-test.
        setOwnLookIds(new Set(all.filter(l => l.curatorId === id).map(l => l.id)));
        // Try-ons attributed to this curator ACCOUNT (any display name they used).
        const g = await fetch(`/api/try-this-look?curatorTryons=${encodeURIComponent(id)}`).then(r => r.json()).catch(() => null);
        if (active && Array.isArray(g?.userGallery)) setTryons(g.userGallery as TryOn[]);
      } catch { /* ignore */ } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  if (loading) return <main className="grid min-h-[100dvh] place-items-center bg-white"><Loader2 className="h-6 w-6 animate-spin text-black/30" /></main>;
  if (!profile) return (
    <main className="grid min-h-[100dvh] place-items-center gap-3 bg-white">
      <p className="text-sm font-black text-black/50">Model not found</p>
      <button type="button" onClick={() => router.back()} className="text-xs font-black text-black/50 underline">Go back</button>
    </main>
  );

  const name = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || "Model";

  return (
    <main className="min-h-[100dvh] bg-white pb-16">
      <div className="sticky top-0 z-20 border-b border-black/8 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.back()} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-black/10"><ArrowLeft className="h-4 w-4" /></button>
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-black/5">
            {profile.photoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={profile.photoUrl} alt={name} className="h-full w-full object-cover" />
              : <div className="grid h-full w-full place-items-center text-xs font-black text-black/30">{name.slice(0, 2).toUpperCase()}</div>}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-black">{name}</p>
            {profile.motto && <p className="truncate text-[11px] font-medium text-cobalt">{profile.motto}</p>}
          </div>
        </div>
        {!isOwn && (
          <div className="mt-2 flex items-center gap-2">
            <button type="button" onClick={() => void handleFollow()} disabled={followLoading}
              className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-xs font-black transition active:scale-95 disabled:opacity-50 ${following ? "border border-black/15 bg-white text-black/60" : "bg-black text-white"}`}>
              {followLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : following ? <><UserCheck className="h-3.5 w-3.5" /> Following</> : <><UserPlus className="h-3.5 w-3.5" /> Follow</>}
            </button>
            <button type="button" onClick={() => { setShowMsg(true); setSent(false); }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/15 active:scale-95 transition">
              <MessageCircle className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => { const url = window.location.href; if (navigator.share) navigator.share({ title: name, url }).catch(() => {}); else navigator.clipboard?.writeText(url); }}
              className="flex h-9 shrink-0 items-center justify-center gap-1 rounded-full bg-black px-4 text-xs font-black text-white active:scale-95 transition">
              <Send className="h-3.5 w-3.5" /> Share
            </button>
          </div>
        )}
      </div>

      {/* Profile header */}
      <div className="flex flex-col items-center gap-2 px-6 pt-6 text-center">
        <div className="h-24 w-24 overflow-hidden rounded-full bg-black/5">
          {profile.photoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={profile.photoUrl} alt={name} className="h-full w-full object-cover" />
            : <div className="grid h-full w-full place-items-center text-2xl font-black text-black/30">{name.slice(0, 1)}</div>}
        </div>
        <h1 className="mt-1 text-2xl font-black leading-tight text-black">{name}</h1>
        {profile.motto && <p className="text-sm font-black text-cobalt">{profile.motto}</p>}
        {profile.bio && <p className="max-w-sm text-sm font-medium leading-relaxed text-black/55">{profile.bio}</p>}
        <div className="mt-1 flex items-center gap-3 text-[11px] font-bold text-black/40">
          {profile.genderFocus && <span className="rounded-full bg-black/5 px-2.5 py-1">{profile.genderFocus}</span>}
          {profile.instagram && (
            <a href={`https://instagram.com/${profile.instagram}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-cobalt">
              <Instagram className="h-3.5 w-3.5" /> @{profile.instagram}
            </a>
          )}
        </div>

        {/* Stats */}
        <div className="mt-3 flex items-center justify-center gap-6">
          {[["Looks", looks.length], ["Followers", fmtN(followerCount)], ["Likes", fmtN(looks.reduce((s, l) => s + ((l as any).likeCount ?? 0), 0))], ["Views", fmtN(looks.reduce((s, l) => s + ((l as any).viewCount ?? 0), 0))]].map(([label, val]) => (
            <div key={label as string} className="flex flex-col items-center">
              <span className="text-base font-black text-black">{val}</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-black/40">{label}</span>
            </div>
          ))}
        </div>

        {/* See her in a new look — pick a look → the try-on funnel generates THIS model
            (her photo = the person) wearing it. */}
        {profile.photoUrl && (
          <button type="button" onClick={() => setPickerOpen(true)}
            className="mt-4 flex w-full max-w-xs items-center justify-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-black text-white active:scale-95 transition-transform">
            <Sparkles className="h-4 w-4" /> See {profile.firstName || "her"} in a new look
          </button>
        )}

        {/* Follow + Message + Share moved to sticky header (second row) */}
      </div>

      {/* Gallery — published trend looks + the curator's own try-ons (badged) */}
      <div className="mt-6 px-1">
        {looks.length === 0 && tryons.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <ShoppingBag className="h-8 w-8 text-black/15" />
            <p className="text-sm font-black text-black/40">Nothing published yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {looks.map(l => {
              const thumb = l.frontImageUrl ?? l.imageUrl;
              const from = priceFrom(l.alternatives) ?? l.salePrice ?? l.price;
              return (
                <button key={l.id} type="button" onClick={() => router.push(`/look/${toSlug(l.name)}--${l.id}`)}
                  className="flex flex-col text-left active:opacity-80 transition">
                  <div className="relative aspect-square w-full overflow-hidden bg-black/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={optImg(thumb)} alt={l.name} loading="lazy" decoding="async"
                      onError={(e) => { const im = e.currentTarget; if (thumb && im.src !== thumb) im.src = thumb; }}
                      className="h-full w-full object-cover object-top" />
                    {/* AI Fashion creation vs curated web find */}
                    {l.aiCreated ? (
                      <span className="absolute left-1.5 bottom-1.5 rounded-full bg-black px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">✦ Original</span>
                    ) : (
                      <span className="absolute left-1.5 bottom-1.5 rounded-full bg-white/85 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-black/70 backdrop-blur">Model</span>
                    )}
                    {/* Look has a presentation video → play indicator (same as try-ons) */}
                    {l.videoUrl && (
                      <span className="pointer-events-none absolute inset-0 grid place-items-center"><Play className="h-10 w-10 fill-white text-white opacity-45 drop-shadow-[0_1px_4px_rgba(0,0,0,0.3)]" /></span>
                    )}
                  </div>
                  {from && <span className="px-2 pt-1 text-[10px] font-black text-ink">{from}</span>}
                </button>
              );
            })}
            {tryons.map(t => (
              <button key={t.id} type="button" onClick={() => router.push(`/post/${t.id}`)}
                className="flex flex-col text-left active:opacity-80 transition">
                <div className="relative aspect-square w-full overflow-hidden bg-black/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={optImg(t.imageUrl)} alt={t.lookName ?? "Try-on"} loading="lazy" decoding="async"
                    onError={(e) => { const im = e.currentTarget; if (t.imageUrl && im.src !== t.imageUrl) im.src = t.imageUrl; }}
                    className="h-full w-full object-cover object-top" />
                  <span className="absolute left-1.5 bottom-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white backdrop-blur">Try-on</span>
                  {t.videoUrl && (
                    <span className="pointer-events-none absolute inset-0 grid place-items-center"><Play className="h-10 w-10 fill-white text-white opacity-45 drop-shadow-[0_1px_4px_rgba(0,0,0,0.3)]" /></span>
                  )}
                </div>
                {t.lookId && lookPrices[t.lookId] && (
                  <span className="px-2 pt-1 text-[10px] font-black text-ink">{lookPrices[t.lookId]}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Message modal */}
      {showMsg && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowMsg(false)} />
          <div className="lb-phone-col fixed inset-x-0 bottom-0 z-[51] rounded-t-2xl bg-white px-5 pt-5" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-base font-black text-black">Message {name}</p>
              <button type="button" onClick={() => setShowMsg(false)} className="grid h-8 w-8 place-items-center rounded-full bg-black/5"><X className="h-4 w-4" /></button>
            </div>
            {sent ? (
              <p className="py-4 text-center text-sm font-bold text-emerald-600">Message sent! ✓</p>
            ) : (
              <div className="grid gap-3">
                <textarea value={msgText} onChange={e => setMsgText(e.target.value)} rows={4} placeholder={`Say hi to ${name}…`}
                  className="w-full resize-none rounded-xl border border-black/15 px-3 py-2.5 text-sm outline-none focus:border-black" />
                <button type="button" onClick={() => void handleSendMsg()} disabled={sending || !msgText.trim()}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-black text-sm font-black text-white disabled:opacity-40 active:scale-95 transition">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Send</>}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Look picker — pick any catalogue look → the try-on funnel with THIS model's
          photo as the person (?model=). Any logged-in user can generate. */}
      {pickerOpen && profile.photoUrl && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setPickerOpen(false)}>
          <div className="flex max-h-[82dvh] w-full max-w-[440px] flex-col rounded-t-3xl bg-white" onClick={e => e.stopPropagation()} style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
            <div className="flex items-center justify-between border-b border-black/8 px-4 py-3">
              <div>
                <p className="text-sm font-black text-black">See {name} in a look</p>
                <p className="text-[11px] font-bold text-black/40">Pick any look — we generate her wearing it.</p>
              </div>
              <button type="button" onClick={() => setPickerOpen(false)} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full text-black/40 active:bg-black/5"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-3 gap-0.5 overflow-y-auto p-0.5">
              {allLooks.filter(l => l.frontImageUrl || l.imageUrl).map(l => {
                const thumb = l.frontImageUrl ?? l.imageUrl;
                return (
                  <button key={l.id} type="button"
                    onClick={() => router.push(`/try/${l.id}?model=${encodeURIComponent(profile.photoUrl as string)}`)}
                    className="relative aspect-[3/4] overflow-hidden bg-black/5 active:opacity-80 transition">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={optImg(thumb, 400)} alt={l.name} loading="lazy" decoding="async"
                      onError={(e) => { const im = e.currentTarget; if (thumb && im.src !== thumb) im.src = thumb; }}
                      className="h-full w-full object-cover object-top" />
                    <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1 text-[9px] font-black text-white">{l.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
