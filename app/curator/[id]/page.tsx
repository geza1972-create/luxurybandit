"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, BadgeCheck, Instagram, Loader2, Lock, ShoppingBag, UserPlus, UserCheck, MessageCircle, X, Send, Play, Sparkles, SlidersHorizontal, Trash2, EyeOff, Eye, ImageUp, Video, Download } from "lucide-react";
import PremiumDialog from "@/components/PremiumDialog";
import SubscribeDialog from "@/components/SubscribeDialog";
import ModelChat from "@/components/ModelChat";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";
import { LOOK_CATEGORIES, categorizeLook, isLookCategory, type LookCategory } from "@/lib/look-category";

// Wardrobe category label — "Community"/boudoir reads as "Lingerie" in wardrobe contexts.
const catLabel = (slug: LookCategory) => (slug === "boudoir" ? "Lingerie" : LOOK_CATEGORIES.find(c => c.slug === slug)?.label ?? slug);

const fmtN = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);
// Viewer auth headers: Supabase token OR curator session (our only login).
function viewerHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  try { const s = getStoredAuthSession(); if (s?.access_token) h.Authorization = `Bearer ${s.access_token}`; } catch { /**/ }
  try { const c = JSON.parse(localStorage.getItem("lb_curator") ?? "{}"); if (c?.id && !h.Authorization) h["x-curator-id"] = c.id; } catch { /**/ }
  return h;
}

type Profile = { id: string; firstName?: string; lastName?: string; motto?: string; bio?: string; photoUrl?: string; photoFullUrl?: string; instagram?: string; style?: string; brands?: string; genderFocus?: string; likeBoost?: number; viewBoost?: number; realBadge?: boolean; realModel?: boolean; verificationSelfieUrl?: string; phone?: string; status?: string; profilePhotoUrls?: string[] };
type Look = { id: string; name: string; imageUrl: string; frontImageUrl?: string; curatorId?: string; published?: boolean; aiCreated?: boolean; videoUrl?: string; category?: string; productNote?: string; lingerie?: boolean; featured?: boolean; productType?: string; wardrobe?: boolean; alternatives?: { priceValue?: number; currency?: string }[]; price?: string; salePrice?: string };
type TryOn = { id: string; imageUrl: string; videoUrl?: string; lookName?: string; lookId?: string; feed?: boolean };

const toSlug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
function optImg(url?: string, w = 600) { if (!url) return ""; if (url.startsWith("data:") || url.startsWith("blob:")) return url; return `/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=70`; }

// Strip thumb: shows the clip's poster; tapping opens & plays it. (Previously it autoplayed
// the muted clip while on-screen, but that downloaded every visible video — see the bandwidth
// work; posters are far cheaper and the tap still plays the full clip.)
function StripClip({ t, onOpen }: { t: TryOn; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen}
      className="relative aspect-[9/16] h-40 shrink-0 overflow-hidden rounded-xl lb-media-bg active:scale-95 transition">
      {/* Bandwidth: the reel used to autoplay every in-view clip (a full download each). Show
          the optimized poster only; tapping the tile opens & plays the clip. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={optImg(t.imageUrl, 300)} alt="" loading="lazy" decoding="async"
        onError={(e) => { const im = e.currentTarget; if (t.imageUrl && im.src !== t.imageUrl) im.src = t.imageUrl; }}
        className="h-full w-full object-cover object-top" />
      <span className="absolute bottom-1.5 right-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white backdrop-blur">
        <Play className="h-3 w-3 translate-x-[0.5px]" fill="currentColor" />
      </span>
      {/* Admin-only in practice: non-admins never receive feed:false clips. Marks a clip
          that is hidden from her public profile + the feed (kept for ads / the cache). */}
      {t.feed === false && (
        <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/75 px-2 py-0.5 text-[9px] font-black text-amber-300 backdrop-blur">
          <EyeOff className="h-2.5 w-2.5" /> Hidden
        </span>
      )}
    </button>
  );
}
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false); // $49/mo subscriber → unlimited chat
  const [showPremium, setShowPremium] = useState(false);
  const [showSubscribe, setShowSubscribe] = useState(false);
  useEffect(() => {
    try {
      const admin = !!localStorage.getItem("luxurybandit-try-look-admin-pin");
      setIsPaid(admin || localStorage.getItem("lb_paid") === "1");
      setIsSubscribed(admin || localStorage.getItem("lb_subscribed") === "1");
    } catch { /**/ }
  }, []);
  const [genBusy, setGenBusy] = useState(false);
  const [genMsg, setGenMsg] = useState("");
  // Admin: describe the pieces to generate (else auto from her prefs) + reference images
  // (paste a screenshot or upload) that get extracted into clean wardrobe pieces.
  const [genOpen, setGenOpen] = useState(false);
  const [genBrief, setGenBrief] = useState("");
  const [genRefs, setGenRefs] = useState<string[]>([]);
  const genRefFileRef = useRef<HTMLInputElement>(null);
  // How many pieces to auto-generate (editable, no longer a fixed 3 + 3).
  const [genMain, setGenMain] = useState(3);
  const [genLingerie, setGenLingerie] = useState(3);
  // Her videos live BEHIND the profile photo — tapping it opens a fullscreen carousel,
  // so they never compete with the wardrobe for attention.
  const [motionOpen, setMotionOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false); // profile photo fullscreen lightbox
  // Slim "she's a REAL model" trust banner — every 2nd model-page visit ("ab und zu"),
  // so users learn the models are real people who earn. Doubles as recruiting.
  const [showRealBanner, setShowRealBanner] = useState(false);
  const bannerRolledFor = useRef(""); // guard: StrictMode double-invokes effects in dev
  useEffect(() => {
    if (bannerRolledFor.current === id) return;
    bannerRolledFor.current = id;
    try {
      const n = (parseInt(localStorage.getItem("lb_real_banner_n") ?? "0", 10) + 1) % 2;
      localStorage.setItem("lb_real_banner_n", String(n));
      setShowRealBanner(n === 1);
    } catch { setShowRealBanner(true); }
  }, [id]);
  // "See her in other looks" scrolls down to her wardrobe (her outfits).
  const wardrobeRef = useRef<HTMLDivElement>(null);
  // Admin per-item management sheet (delete / hide / replace / move category / edit text).
  const [manageId, setManageId] = useState("");
  const [mName, setMName] = useState("");
  const [mDesc, setMDesc] = useState("");
  const [mCat, setMCat] = useState<"" | LookCategory>("");
  const [mBuy, setMBuy] = useState(""); // shop link ("Shop now" on the tile)
  const [mBusy, setMBusy] = useState(false);
  const [mMsg, setMMsg] = useState("");
  const replaceRef = useRef<HTMLInputElement>(null);
  // "In motion" showcase — swipeable reel of her try-on videos.
  const [playingId, setPlayingId] = useState("");
  const [reelIdx, setReelIdx] = useState(0);
  const reelRef = useRef<HTMLDivElement>(null);
  // Open the fullscreen "In motion" carousel AT a specific clip (from the gallery strip).
  const openMotionAt = (i: number) => {
    setMotionOpen(true);
    setReelIdx(i);
    setTimeout(() => {
      const el = reelRef.current?.children[i] as HTMLElement | undefined;
      el?.scrollIntoView({ inline: "center", block: "nearest" });
    }, 60);
  };
  const onReelScroll = () => {
    const el = reelRef.current; if (!el) return;
    const first = el.children[0] as HTMLElement | undefined;
    const w = first ? first.clientWidth + 12 : el.clientWidth;
    setReelIdx(Math.round(el.scrollLeft / w));
  };
  // Admin "view as her" preview: while lb_preview_model is set, the admin PIN is
  // IGNORED so the page renders exactly what the model herself sees (owner mode,
  // no admin buttons). The floating banner (BottomNav) exits the preview.
  useEffect(() => { try { setIsAdmin(!!localStorage.getItem("luxurybandit-try-look-admin-pin") && !localStorage.getItem("lb_preview_model")); } catch { /**/ } }, []);
  const [tryons, setTryons] = useState<TryOn[]>([]);
  const [lookPrices, setLookPrices] = useState<Record<string, string>>({});
  const [ownLookIds, setOwnLookIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  // Follow + message
  const [followerCount, setFollowerCount] = useState(0);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showMsg, setShowMsg] = useState(false);
  const [showChat, setShowChat] = useState(false);
  // Chat now lives on its own page (/chat/<id>). Old ?chat=1 deep links redirect there.
  useEffect(() => { try { if (new URLSearchParams(window.location.search).get("chat") === "1") router.replace(`/chat/${id}`); } catch { /**/ } }, [id, router]);
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
          // Admins send the PIN → the API also returns hidden (published:false) looks so
          // they can be managed/un-hidden here. Non-admins never receive hidden looks.
          fetch("/api/try-this-look", { headers: adminHeaders() }).then(r => r.json()).then(d => (d.looks ?? []) as Look[]),
        ]);
        if (!active) return;
        setProfile(p);
        setAllLooks(all.filter(l => l.published !== false));
        setLooks(all.filter(l => l.curatorId === id));
        // Price lookup for try-ons (they reference a shoppable look by id).
        const prices: Record<string, string> = {};
        for (const l of all) { const f = priceFrom(l.alternatives) ?? l.salePrice ?? l.price; if (f) prices[l.id] = f; }
        setLookPrices(prices);
        // Looks this curator created — a try-on of one of these is a self-test.
        setOwnLookIds(new Set(all.filter(l => l.curatorId === id).map(l => l.id)));
        // Try-ons attributed to this curator ACCOUNT (any display name they used).
        // Admin/owner also get UNPUBLISHED ones (manage=1) — her photo drafts live there.
        const canManage = (() => { try { return !!localStorage.getItem("luxurybandit-try-look-admin-pin") || JSON.parse(localStorage.getItem("lb_curator") ?? "{}").id === id; } catch { return false; } })();
        const g = await fetch(`/api/try-this-look?curatorTryons=${encodeURIComponent(id)}${canManage ? "&manage=1" : ""}`).then(r => r.json()).catch(() => null);
        if (active && Array.isArray(g?.userGallery)) setTryons(g.userGallery as TryOn[]);
      } catch { /* ignore */ } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  // While the admin previews HER view, the PIN is ignored everywhere on this page.
  const adminPin = () => { try { return localStorage.getItem("lb_preview_model") ? "" : (localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""); } catch { return ""; } };
  const adminHeaders = (): Record<string, string> => { const pin = adminPin(); return pin ? { "x-try-look-admin-pin": pin } : {}; };
  // Re-pull looks (admin PIN → hidden looks included) after any edit/delete/generate.
  const reloadLooks = async () => {
    const all = await fetch("/api/try-this-look", { headers: adminHeaders() }).then(r => r.json()).then(x => (x.looks ?? []) as Look[]);
    setAllLooks(all.filter(l => l.published !== false));
    setLooks(all.filter(l => l.curatorId === id));
  };
  // Admin: delete an "in motion" video (the underlying try-on generation).
  const deleteVideo = async (t: TryOn) => {
    if (!window.confirm("Dieses Video endgültig löschen?")) return;
    try {
      await fetch("/api/try-this-look", { method: "POST", headers: { "Content-Type": "application/json", ...adminHeaders() }, body: JSON.stringify({ action: "delete-generation", id: t.id }) });
      setTryons(prev => prev.filter(x => x.id !== t.id));
    } catch { /**/ }
  };
  // Admin: upscale an "in motion" video to HD (1080p) via Pixverse and replace it in place.
  const [hdVidBusy, setHdVidBusy] = useState("");
  const upscaleVideo = async (t: TryOn) => {
    if (!t.videoUrl || hdVidBusy) return;
    if (!window.confirm("Dieses Video in HD (1080p) umrechnen? Kostet Pixverse-Credits, ~1–2 Min.")) return;
    setHdVidBusy(t.id);
    const H = { "Content-Type": "application/json", ...adminHeaders() };
    try {
      const start = await fetch("/api/generate-tryon-video", { method: "POST", headers: H, body: JSON.stringify({ upscale: true, videoUrl: t.videoUrl }) }).then(r => r.json());
      if (!start.videoId) throw new Error(start.error || "Upscale-Start fehlgeschlagen.");
      let videoUrl = "";
      for (let i = 0; i < 90; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const p = await fetch(`/api/generate-tryon-video?videoId=${encodeURIComponent(start.videoId)}`).then(r => r.json());
        if (p.status === "done" && p.videoUrl) { videoUrl = p.videoUrl; break; }
        if (p.status === "failed") throw new Error(p.error || "Umrechnen fehlgeschlagen.");
      }
      if (!videoUrl) throw new Error("Zeitüberschreitung.");
      await fetch("/api/try-this-look", { method: "POST", headers: H, body: JSON.stringify({ action: "attach-generation-video", generationId: t.id, videoUrl }) });
      setTryons(prev => prev.map(x => x.id === t.id ? { ...x, videoUrl } : x));
      alert("In HD umgerechnet ✓ — neu laden zum Ansehen.");
    } catch (e) { alert(e instanceof Error ? e.message : "Fehler beim Umrechnen"); }
    finally { setHdVidBusy(""); }
  };
  // Download the clip as an .mp4 so you can post it to Instagram (Reel) from your phone.
  const [dlBusy, setDlBusy] = useState("");
  const downloadVideo = async (t: TryOn) => {
    if (!t.videoUrl || dlBusy) return;
    setDlBusy(t.id);
    try {
      const blob = await fetch(t.videoUrl).then(r => r.blob());
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(name || "luxurybandit").replace(/\s+/g, "-")}-${t.id}.mp4`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 8000);
    } catch { try { window.open(t.videoUrl, "_blank"); } catch { /**/ } }
    finally { setDlBusy(""); }
  };
  // Admin: publish this video to the connected Instagram account as a Reel.
  const [igBusy, setIgBusy] = useState("");
  const postToInstagram = async (t: TryOn) => {
    if (!t.videoUrl || igBusy) return;
    if (!window.confirm("Dieses Video jetzt auf Instagram posten (als Reel)?")) return;
    setIgBusy(t.id);
    try {
      const caption = `${name} · LuxuryBandit ✨\n\n#luxurybandit #fashion #reels #model #ootd`;
      const res = await fetch("/api/instagram-publish", { method: "POST", headers: { "Content-Type": "application/json", ...adminHeaders() }, body: JSON.stringify({ videoUrl: t.videoUrl, caption }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) throw new Error(d?.error || "IG-Post fehlgeschlagen");
      alert("Auf Instagram gepostet ✓");
    } catch (e) { alert(e instanceof Error ? e.message : "IG-Post fehlgeschlagen"); }
    finally { setIgBusy(""); }
  };
  // Admin: hide/show a video in HER public profile (and the feed) without deleting it —
  // feed:false keeps the clip (for ads / the reuse cache) but drops it from public views.
  const toggleVideoFeed = async (t: TryOn) => {
    const next = !t.feed;
    setTryons(prev => prev.map(x => x.id === t.id ? { ...x, feed: next } : x));
    try {
      await fetch("/api/try-this-look", { method: "POST", headers: { "Content-Type": "application/json", ...adminHeaders() }, body: JSON.stringify({ action: "set-generation-feed", generationId: t.id, feed: next }) });
    } catch { setTryons(prev => prev.map(x => x.id === t.id ? { ...x, feed: !next } : x)); }
  };
  // ── Admin: upload a self-made video (e.g. generated in the Pixverse UI) as a NEW
  // "In motion" video for this model. Direct-to-Supabase (signed URL, no 4.5MB limit),
  // first frame becomes the poster. Defaults to Fashionshow (members + her profile).
  const vidFileRef = useRef<HTMLInputElement>(null);
  const uploadLookRef = useRef(""); // the garment picked in the gallery, read at upload time
  const [videoPickerOpen, setVideoPickerOpen] = useState(false); // garment gallery before picking the file
  const [vidBusy, setVidBusy] = useState(false);
  const firstFrameDataUrl = (file: File): Promise<string> => new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const v = document.createElement("video");
      v.muted = true; v.preload = "metadata"; v.src = url;
      const done = (out: string) => { try { URL.revokeObjectURL(url); } catch { /**/ } resolve(out); };
      v.onloadeddata = () => { try { v.currentTime = Math.min(0.1, (v.duration || 1) * 0.02); } catch { done(""); } };
      v.onseeked = () => {
        try {
          const c = document.createElement("canvas");
          c.width = v.videoWidth || 720; c.height = v.videoHeight || 1280;
          const ctx = c.getContext("2d");
          if (ctx) { ctx.drawImage(v, 0, 0, c.width, c.height); done(c.toDataURL("image/webp", 0.82)); } else done("");
        } catch { done(""); }
      };
      v.onerror = () => done("");
      setTimeout(() => done(""), 6000);
    } catch { resolve(""); }
  });
  const uploadModelVideo = async (file: File) => {
    if (vidBusy) return;
    if (!file.type.startsWith("video/")) { alert("Bitte eine Videodatei wählen."); return; }
    setVidBusy(true);
    try {
      const H = { "Content-Type": "application/json", ...adminHeaders() };
      const ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
      const posterImage = await firstFrameDataUrl(file); // capture BEFORE upload (file still in memory)
      const sig = await fetch("/api/generate-tryon-video", { method: "POST", headers: H, body: JSON.stringify({ importVideo: true, sign: true, ext }) }).then(r => r.json());
      if (!sig.uploadUrl || !sig.path) throw new Error(sig.error || "Upload konnte nicht starten (Rechte prüfen)");
      const put = await fetch(sig.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || "video/mp4", "x-upsert": "true" }, body: file });
      if (!put.ok) throw new Error("Upload zu Supabase fehlgeschlagen");
      const att = await fetch("/api/generate-tryon-video", { method: "POST", headers: H, body: JSON.stringify({ importVideo: true, videoPath: sig.path }) }).then(r => r.json());
      if (!att.videoUrl) throw new Error(att.error || "Signieren fehlgeschlagen");
      // If a garment was picked (in the gallery dialog), attach it so this video IS her wearing
      // that piece (reuse cache model×look×turn → served instantly on that try-on, no regen).
      const pickedLookId = uploadLookRef.current;
      const look = allLooks.find(l => l.id === pickedLookId);
      const add = await fetch("/api/try-this-look", { method: "POST", headers: H, body: JSON.stringify({ action: "add-model-video", curatorId: id, videoUrl: att.videoUrl, ...(pickedLookId ? { lookId: pickedLookId, title: look?.name || "", motion: "turn" } : {}), ...(posterImage ? { posterImage } : {}) }) }).then(r => r.json());
      if (!add.ok) throw new Error(add.error || "Video konnte nicht gespeichert werden");
      uploadLookRef.current = "";
      // Refresh her videos so it shows up immediately.
      await reloadTryons();
      alert(look ? `Video hochgeladen ✓ — verknüpft mit „${look.name}".` : "Video hochgeladen ✓ — es ist jetzt in ihrem Profil (Play-Button am Foto).");
    } catch (e) { alert(e instanceof Error ? e.message : "Fehler beim Hochladen"); }
    finally { setVidBusy(false); }
  };

  // Re-pull her try-ons (admin/owner incl. unpublished photo drafts).
  const reloadTryons = async () => {
    const canManage = (() => { try { return !!localStorage.getItem("luxurybandit-try-look-admin-pin") || JSON.parse(localStorage.getItem("lb_curator") ?? "{}").id === id; } catch { return false; } })();
    const g = await fetch(`/api/try-this-look?curatorTryons=${encodeURIComponent(id)}${canManage ? "&manage=1" : ""}`).then(r => r.json()).catch(() => null);
    if (Array.isArray(g?.userGallery)) setTryons(g.userGallery as TryOn[]);
  };

  // ── Admin: one-tap vanity stats. ALWAYS above the floors the user set
  // (>100k followers, >200k likes, >300k views) with natural-looking randomness;
  // tapping again re-rolls. Saved as boosts on the curator (admin-only fields).
  const [boostBusy, setBoostBusy] = useState(false);
  const boostStats = async () => {
    if (boostBusy) return;
    setBoostBusy(true);
    try {
      const rnd = (min: number, spread: number) => min + Math.floor(Math.random() * spread);
      const followerBoost = rnd(100_000, 250_000); // 100k–350k
      const likeBoost = rnd(200_000, 350_000);     // 200k–550k
      const viewBoost = rnd(300_000, 600_000);     // 300k–900k
      const res = await fetch("/api/curator", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminHeaders() },
        body: JSON.stringify({ action: "update", id, followerBoost, likeBoost, viewBoost }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Boost fehlgeschlagen");
      // Reflect immediately: like/view baselines live on the profile; followers are
      // re-fetched from the follow API (boost + real follows).
      fetch(`/api/follow?slug=${encodeURIComponent(id)}&type=user`, { headers: viewerHeaders() })
        .then(r => r.ok ? r.json() : null).then(d => { if (d) setFollowerCount(d.followerCount ?? followerBoost); }).catch(() => {});
      setProfile(p => (p ? { ...p, likeBoost, viewBoost } : p));
    } catch (e) { alert(e instanceof Error ? e.message : "Boost fehlgeschlagen"); }
    finally { setBoostBusy(false); }
  };

  // ── Admin: toggle the gold "real LuxuryBandit Model" banner for THIS model.
  // Off by default (AI models must never claim to be real).
  const [badgeBusy, setBadgeBusy] = useState(false);
  // Admin: upscale her (often low-res) profile photo to HD via fal clarity-upscaler.
  const [hdBusy, setHdBusy] = useState(false);
  const upscalePhoto = async () => {
    if (hdBusy) return;
    if (!window.confirm("Profilfoto in HD hochrechnen? (fal.ai — kostet ein paar Cent)")) return;
    setHdBusy(true);
    try {
      const res = await fetch("/api/upscale-image", { method: "POST", headers: { "Content-Type": "application/json", ...adminHeaders() }, body: JSON.stringify({ curatorId: id }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.photoUrl) throw new Error(d?.error || "Upscale fehlgeschlagen");
      setProfile(p => (p ? { ...p, photoUrl: d.photoUrl } : p));
      alert("Profilfoto in HD ✓");
    } catch (e) { alert(e instanceof Error ? e.message : "Upscale fehlgeschlagen"); }
    finally { setHdBusy(false); }
  };
  // Admin: download her profile photo (prefers the uncropped original).
  const [dlPhotoBusy, setDlPhotoBusy] = useState(false);
  const downloadPhoto = async () => {
    const url = profile?.photoFullUrl || profile?.photoUrl;
    if (!url || dlPhotoBusy) return;
    setDlPhotoBusy(true);
    try {
      const blob = await fetch(url).then(r => r.blob());
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = `${(name || "luxurybandit").replace(/\s+/g, "-")}.jpg`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(objUrl), 8000);
    } catch { try { window.open(url, "_blank"); } catch { /**/ } }
    finally { setDlPhotoBusy(false); }
  };
  // Admin: download a garment image (from the Manage-garment sheet).
  const downloadGarmentImg = async (imgUrl?: string, fname?: string) => {
    if (!imgUrl) return;
    try {
      const blob = await fetch(imgUrl).then(r => r.blob());
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = `${(fname || "garment").replace(/\s+/g, "-")}.jpg`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(objUrl), 8000);
    } catch { try { window.open(imgUrl, "_blank"); } catch { /**/ } }
  };
  const toggleRealBadge = async () => {
    if (badgeBusy || !profile) return;
    setBadgeBusy(true);
    try {
      // ONE verify action: turns on BOTH the page banner (realBadge) and the "✓ Real model"
      // carousel badge + earnings eligibility (realModel).
      const next = !(profile.realModel === true || profile.realBadge === true);
      const res = await fetch("/api/curator", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminHeaders() },
        body: JSON.stringify({ action: "update", id, realBadge: next, realModel: next }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Speichern fehlgeschlagen");
      setProfile(p => (p ? { ...p, realBadge: next, realModel: next } : p));
    } catch (e) { alert(e instanceof Error ? e.message : "Speichern fehlgeschlagen"); }
    finally { setBadgeBusy(false); }
  };

  // Admin: APPROVE (pending → active) AND VERIFY (realModel+realBadge) in one tap.
  const verifyAndApprove = async () => {
    if (badgeBusy || !profile) return;
    setBadgeBusy(true);
    try {
      const H = { "Content-Type": "application/json", ...adminHeaders() };
      // 1) Approve the application (status → active) so she can sign in.
      await fetch("/api/curator", { method: "POST", headers: H, body: JSON.stringify({ action: "set-curator-status", id, status: "active" }) });
      // 2) Verify (Real model + banner + earnings).
      const res = await fetch("/api/curator", { method: "POST", headers: H, body: JSON.stringify({ action: "update", id, realBadge: true, realModel: true }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Fehlgeschlagen");
      setProfile(p => (p ? { ...p, realBadge: true, realModel: true, status: "active" } : p));
    } catch (e) { alert(e instanceof Error ? e.message : "Fehlgeschlagen"); }
    finally { setBadgeBusy(false); }
  };

  // Admin: REJECT (deactivate + remove the real flags).
  const rejectModel = async () => {
    if (badgeBusy || !profile) return;
    // Rejected is rejected — no reason needed. She can't sign in and doesn't get a notice.
    if (!confirm("Reject this model? She won't be able to sign in.")) return;
    setBadgeBusy(true);
    try {
      const H = { "Content-Type": "application/json", ...adminHeaders() };
      await fetch("/api/curator", { method: "POST", headers: H, body: JSON.stringify({ action: "set-curator-status", id, status: "deactivated" }) });
      await fetch("/api/curator", { method: "POST", headers: H, body: JSON.stringify({ action: "update", id, realBadge: false, realModel: false }) });
      setProfile(p => (p ? { ...p, realBadge: false, realModel: false, status: "deactivated" } : p));
    } catch (e) { alert(e instanceof Error ? e.message : "Fehlgeschlagen"); }
    finally { setBadgeBusy(false); }
  };

  // Anyone can report a profile → the admin is notified to review it.
  const reportProfile = async () => {
    const reason = window.prompt("Report this profile — what's wrong? (fake, not a real person, offensive, stolen photos…)", "");
    if (reason === null) return;
    try {
      await fetch("/api/curator", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "report-profile", id, reason: (reason || "").trim() }) });
      alert("Thanks — we'll review this profile.");
    } catch { alert("Could not send the report. Please try again."); }
  };

  // Admin: pick which of her candidate photos becomes her main profile photo.
  const pickProfilePhoto = async (index: number, url: string) => {
    if (badgeBusy) return;
    setBadgeBusy(true);
    try {
      const res = await fetch("/api/curator", { method: "POST", headers: { "Content-Type": "application/json", ...adminHeaders() }, body: JSON.stringify({ action: "set-profile-photo", id, index }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.error) throw new Error(d.error || "Failed");
      setProfile(p => (p ? { ...p, photoUrl: url } : p)); // reflect the new main photo immediately
    } catch (e) { alert(e instanceof Error ? e.message : "Fehlgeschlagen"); }
    finally { setBadgeBusy(false); }
  };

  // ── Admin one-click: turn a model's PHOTO try-on into a VIDEO (Pixverse animates the
  // dressed photo; single-image mode — no reference binding needed). The video attaches
  // to the SAME generation, so the photo becomes its poster.
  const [photoVidBusy, setPhotoVidBusy] = useState("");
  const makeVideoFromPhoto = async (t: TryOn) => {
    if (photoVidBusy) return;
    if (!window.confirm("Aus diesem Foto ein Video generieren? (Pixverse-Credits)")) return;
    setPhotoVidBusy(t.id);
    try {
      const H = { "Content-Type": "application/json", ...adminHeaders() };
      const start = await fetch("/api/generate-tryon-video", { method: "POST", headers: H, body: JSON.stringify({ lookId: t.lookId || "", image: t.imageUrl }) }).then(r => r.json());
      if (!start.videoId) throw new Error(start.error || "Start fehlgeschlagen.");
      let videoUrl = "";
      for (let i = 0; i < 45; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const p = await fetch(`/api/generate-tryon-video?videoId=${encodeURIComponent(start.videoId)}&curatorId=${encodeURIComponent(start.curatorId || "")}`).then(r => r.json());
        if (p.status === "done" && p.videoUrl) { videoUrl = p.videoUrl; break; }
        if (p.status === "failed") throw new Error(p.error || "Generierung fehlgeschlagen.");
      }
      if (!videoUrl) throw new Error("Zeitüberschreitung.");
      await fetch("/api/try-this-look", { method: "POST", headers: H, body: JSON.stringify({ action: "attach-generation-video", generationId: t.id, videoUrl }) });
      await reloadTryons();
      alert("Video erstellt ✓ — jetzt in ihrem Reel (Sichtbarkeit wie gehabt steuerbar).");
    } catch (e) { alert(e instanceof Error ? e.message : "Fehler bei der Video-Generierung"); }
    finally { setPhotoVidBusy(""); }
  };

  // ── Model self-service: turn her OWN photo into a video. First video is free (welcome
  // credit), every additional one is $3.99 — the server (generate-tryon-video) enforces it
  // and returns 402 when she's out of credits; we then open Stripe Checkout and retry.
  const payForModelVideo = async (): Promise<boolean> => {
    const r = await fetch("/api/model-video-checkout", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ curatorId: id }),
    }).then(x => x.json()).catch(() => null);
    if (!r?.url || !r?.sessionId) { alert(r?.error || "Zahlung konnte nicht gestartet werden."); return false; }
    const popup = window.open(r.url, "lb-pay", "width=460,height=760");
    for (let i = 0; i < 180; i++) { // poll ~6 min
      await new Promise(res => setTimeout(res, 2000));
      const st = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(r.sessionId)}`).then(x => x.json()).catch(() => ({}));
      if (st?.paid) { try { popup?.close(); } catch { /**/ } return true; }
      if (popup && popup.closed) {
        const st2 = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(r.sessionId)}`).then(x => x.json()).catch(() => ({}));
        return !!st2?.paid;
      }
    }
    return false;
  };

  const makeVideoAsModel = async (t: TryOn, retried = false) => {
    if (photoVidBusy) return;
    if (!retried && !window.confirm("Dein erstes Video ist gratis, jedes weitere kostet $3.99. Weiter?")) return;
    setPhotoVidBusy(t.id);
    try {
      const res = await fetch("/api/generate-tryon-video", {
        method: "POST", headers: viewerHeaders(), body: JSON.stringify({ lookId: t.lookId || "", image: t.imageUrl }),
      });
      const start = await res.json().catch(() => ({}));
      if (res.status === 402 || start?.paymentRequired) {
        setPhotoVidBusy("");
        const paid = await payForModelVideo();
        if (paid) await makeVideoAsModel(t, true); // retry — the credit is now on her account
        return;
      }
      if (!start.videoId) throw new Error(start.error || "Start fehlgeschlagen.");
      let videoUrl = "";
      for (let i = 0; i < 45; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const p = await fetch(`/api/generate-tryon-video?videoId=${encodeURIComponent(start.videoId)}&curatorId=${encodeURIComponent(start.curatorId || id)}`).then(r => r.json());
        if (p.status === "done" && p.videoUrl) { videoUrl = p.videoUrl; break; }
        if (p.status === "failed") throw new Error(p.error || "Generierung fehlgeschlagen.");
      }
      if (!videoUrl) throw new Error("Zeitüberschreitung.");
      await fetch("/api/try-this-look", { method: "POST", headers: viewerHeaders(), body: JSON.stringify({ action: "attach-generation-video", generationId: t.id, videoUrl }) });
      await reloadTryons();
      alert("Video erstellt ✓");
    } catch (e) { alert(e instanceof Error ? e.message : "Fehler bei der Video-Generierung"); }
    finally { setPhotoVidBusy(""); }
  };

  const readFile = (f: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f); });
  const addGenRefs = async (files: FileList | File[]) => {
    for (const f of Array.from(files)) { if (!f.type.startsWith("image/")) continue; try { const url = await readFile(f); setGenRefs(r => [...r, url].slice(0, 8)); } catch { /**/ } }
  };
  // Paste a screenshot (Cmd/Ctrl+V) → add it as a reference image.
  const onGenPaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items; if (!items) return;
    const files: File[] = [];
    for (const it of items) { if (it.type.startsWith("image/")) { const f = it.getAsFile(); if (f) files.push(f); } }
    if (files.length) { e.preventDefault(); await addGenRefs(files); }
  };
  const generateWardrobe = async () => {
    if (genBusy) return;
    const brief = genBrief.trim();
    const refs = genRefs;
    setGenOpen(false);
    setGenBusy(true); setGenMsg(refs.length ? "Extrahiere Referenzen & generiere … (bitte warten)" : "Generiere Garderobe … (~1 Min, bitte warten)");
    try {
      const H = { "Content-Type": "application/json", "x-try-look-admin-pin": adminPin() };
      // Reference images → each is extracted into a clean wardrobe piece (attributed to her).
      for (const img of refs) {
        await fetch("/api/add-garment", { method: "POST", headers: H, body: JSON.stringify({ image: img, curatorId: id, extract: true }) }).catch(() => {});
      }
      // Text brief → generate from it; nothing given → auto from her prefs (chosen counts).
      if (brief || refs.length === 0) {
        const res = await fetch("/api/generate-wardrobe", { method: "POST", headers: H, body: JSON.stringify({ curatorId: id, mainCount: genMain, lingerieCount: genLingerie, ...(brief ? { brief } : {}) }) });
        const d = await res.json();
        if (!res.ok) throw new Error(d?.error || "Fehler");
      }
      setGenMsg("Fertig ✓");
      setGenRefs([]); setGenBrief("");
      await reloadLooks();
    } catch (e) {
      setGenMsg(e instanceof Error ? e.message : "Fehler");
    } finally { setGenBusy(false); }
  };

  // --- Admin: manage a single wardrobe piece (delete / hide / replace / re-categorize / edit text) ---
  const manageItem = looks.find(l => l.id === manageId) ?? null;
  const openManage = (l: Look) => {
    setManageId(l.id);
    setMName(l.name ?? "");
    setMDesc(l.productNote ?? "");
    setMCat(isLookCategory(l.category) ? l.category : "");
    setMBuy((l as any).buyUrl ?? "");
    setMMsg("");
  };
  const closeManage = () => { setManageId(""); setMBusy(false); setMMsg(""); };
  const patchLook = async (extra: Record<string, unknown>, successMsg = "Gespeichert ✓") => {
    if (!manageId || mBusy) return;
    setMBusy(true); setMMsg("");
    try {
      const res = await fetch("/api/try-this-look", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminHeaders() },
        body: JSON.stringify({ action: "update-look", id: manageId, ...extra }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Fehler");
      await reloadLooks();
      setMMsg(successMsg);
    } catch (e) { setMMsg(e instanceof Error ? e.message : "Fehler"); }
    finally { setMBusy(false); }
  };
  // Save — empty title/description get filled by AI from the garment photo first.
  const saveManage = async () => {
    let name = mName.trim(), desc = mDesc.trim();
    if ((!name || !desc) && manageItem) {
      setMBusy(true); setMMsg("KI schreibt Titel & Beschreibung …");
      try {
        const img = manageItem.frontImageUrl || manageItem.imageUrl || "";
        const blob = await fetch(img).then(r => r.blob());
        const fd = new FormData();
        fd.append("image", new File([blob], "garment.jpg", { type: blob.type || "image/jpeg" }));
        if (name) fd.append("name", name);
        const ai = await fetch("/api/generate-product-description", { method: "POST", body: fd }).then(r => r.json());
        if (!name && ai.title) { name = String(ai.title); setMName(name); }
        if (!desc && ai.description) { desc = String(ai.description); setMDesc(desc); }
      } catch { /* AI is best-effort — save whatever we have */ }
      setMBusy(false);
    }
    return patchLook({ name: name || undefined, productNote: desc, buyUrl: mBuy.trim(), ...(mCat ? { category: mCat } : {}) });
  };
  const toggleHide = () => patchLook({ published: manageItem?.published === false }, manageItem?.published === false ? "Sichtbar ✓" : "Ausgeblendet ✓");
  const replaceImage = async (file: File) => {
    const dataUrl: string = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = reject; r.readAsDataURL(file); });
    if (!dataUrl.startsWith("data:image/")) return;
    await patchLook({ frontImage: dataUrl, garmentFrontImage: dataUrl }, "Bild ersetzt ✓");
  };
  const deleteManage = async () => {
    if (!manageId || mBusy) return;
    if (!window.confirm("Dieses Kleidungsstück endgültig löschen?")) return;
    setMBusy(true); setMMsg("");
    try {
      const res = await fetch("/api/try-this-look", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminHeaders() },
        body: JSON.stringify({ action: "delete-look", id: manageId }),
      });
      if (!res.ok) throw new Error("Fehler");
      closeManage();
      await reloadLooks();
    } catch { setMMsg("Fehler beim Löschen"); setMBusy(false); }
  };

  if (loading) return <main className="grid min-h-[100dvh] place-items-center bg-[#0d0b0a]"><Loader2 className="h-6 w-6 animate-spin text-white/30" /></main>;
  if (!profile) return (
    <main className="grid min-h-[100dvh] place-items-center gap-3 bg-[#0d0b0a] text-white">
      <p className="text-sm font-black text-white/50">Model not found</p>
      <button type="button" onClick={() => router.back()} className="text-xs font-black text-white/50 underline">Go back</button>
    </main>
  );

  const name = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || "Model";
  const videos = tryons.filter(t => t.videoUrl);
  // Photo drafts (no video yet): the model's self-made photos. Visible to admin +
  // the model herself in the gallery strip; the admin turns good ones into videos.
  const photoDrafts = (isAdmin || isOwn) ? tryons.filter(t => !t.videoUrl && t.imageUrl) : [];

  return (
    <main className="min-h-[100dvh] bg-[#0d0b0a] text-white pb-16">
      <div className="sticky top-0 z-20 bg-[#0d0b0a]/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.back()} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 active:opacity-70"><ArrowLeft className="h-4 w-4" /></button>
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white/10">
            {profile.photoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={profile.photoUrl} alt={name} className="h-full w-full object-cover" />
              : <div className="grid h-full w-full place-items-center text-xs font-black text-white/40">{name.slice(0, 2).toUpperCase()}</div>}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-white">{name}</p>
            {profile.motto && <p className="truncate text-[11px] font-medium text-amber-400">{profile.motto}</p>}
          </div>
        </div>
        {!isOwn && (
          <div className="mt-2 flex items-center gap-2">
            <button type="button" onClick={() => void handleFollow()} disabled={followLoading}
              className={`flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-6 text-xs font-black transition active:scale-95 disabled:opacity-50 ${following ? "border border-white/20 text-white/70" : "lb-black3d"}`}>
              {followLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : following ? <><UserCheck className="h-3.5 w-3.5" /> Following</> : <><UserPlus className="h-3.5 w-3.5" /> Follow</>}
            </button>
            <button type="button" onClick={() => { const url = window.location.href; if (navigator.share) navigator.share({ title: name, url }).catch(() => {}); else navigator.clipboard?.writeText(url); }}
              className="flex h-9 shrink-0 items-center justify-center gap-1 rounded-full bg-white/10 px-4 text-xs font-black text-white active:scale-95 transition">
              <Send className="h-3.5 w-3.5" /> Share
            </button>
          </div>
        )}
      </div>

      {/* Profile header */}
      <div className="flex flex-col items-center gap-2 px-6 pt-6 text-center">
        {/* Stats ABOVE the photo — likes/views = real sums + the admin vanity baselines. */}
        <div className="mb-1 flex w-full items-center justify-center gap-4">
          {[["Looks", looks.length], ["Followers", fmtN(followerCount)], ["Likes", fmtN((profile.likeBoost ?? 0) + looks.reduce((s, l) => s + ((l as any).likeCount ?? 0), 0))], ["Views", fmtN((profile.viewBoost ?? 0) + looks.reduce((s, l) => s + ((l as any).viewCount ?? 0), 0))]].map(([label, val]) => (
            <div key={label as string} className="flex flex-col items-center">
              <span className="text-base font-black text-white">{val}</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-white/40">{label}</span>
            </div>
          ))}
          {/* Admin: one tap gives her healthy vanity numbers; tap again to re-roll. */}
          {isAdmin && (
            <button type="button" onClick={() => void boostStats()} disabled={boostBusy} title="Followers/Likes/Views boosten"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-amber-400/40 bg-amber-400/10 text-amber-400 active:scale-90 transition disabled:opacity-50">
              {boostBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            </button>
          )}
          {isAdmin && (
            <button type="button" onClick={() => void toggleRealBadge()} disabled={badgeBusy}
              title={(profile.realModel || profile.realBadge) ? "Real-Model-Verifizierung entfernen" : "Als Real Model verifizieren & freigeben"}
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border active:scale-90 transition disabled:opacity-50 ${
                (profile.realModel || profile.realBadge) ? "border-amber-400 bg-amber-400 text-black" : "border-white/20 bg-white/5 text-white/40"
              }`}>
              {badgeBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
        {/* Profile photo — tap opens it LARGE (lightbox). Her videos live in the
            gallery strip below, so no play badge here anymore. */}
        <button type="button" disabled={!profile.photoUrl} onClick={() => setPhotoOpen(true)}
          className="relative h-24 w-24 shrink-0 rounded-full disabled:cursor-default active:scale-95 transition">
          <span className="block h-full w-full overflow-hidden rounded-full bg-white/10 ring-2 ring-amber-400/80 ring-offset-2 ring-offset-[#0d0b0a]">
            {profile.photoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={profile.photoUrl} alt={name} className="h-full w-full object-cover" />
              : <div className="grid h-full w-full place-items-center text-2xl font-black text-white/30">{name.slice(0, 1)}</div>}
          </span>
        </button>
        <h1 className="mt-2 text-2xl font-black leading-tight text-white">{name}</h1>
        {/* Persistent "Real model" chip — shows once the admin has verified + approved her. */}
        {(profile.realModel === true || profile.realBadge === true) && (
          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-black text-black shadow"><BadgeCheck className="h-3.5 w-3.5 text-emerald-600" /> Real model</span>
        )}
        {profile.motto && <p className="text-sm font-black text-amber-400">{profile.motto}</p>}
        {profile.bio && <p className="max-w-sm text-sm font-medium leading-relaxed text-white/55">{profile.bio}</p>}
        {/* Brands — her own (if set) PLUS our affiliate partner GiannaBellucci, ALWAYS appended
            for every model (highlighted, since it's what she actually wears & the chat delivers).
            Code-based so it can never be clobbered by concurrent saves. */}
        {(() => {
          const custom = (profile.brands?.trim() || "").split(",").map(b => b.trim()).filter(Boolean);
          const hasGB = custom.some(b => b.toLowerCase().replace(/\s+/g, "") === "giannabellucci");
          const list = hasGB ? custom.slice(0, 6) : [...custom.slice(0, 5), "GiannaBellucci"];
          return (
            <div className="mt-2">
              <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-white/35">
                {profile.firstName ? `${profile.firstName}'s favorite brands` : "Favorite brands"}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {list.map((b, i) => {
                  const isGB = b.toLowerCase().replace(/\s+/g, "") === "giannabellucci";
                  return <span key={i} className={isGB
                    ? "rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-black text-black"
                    : "rounded-full bg-amber-400/15 px-2.5 py-1 text-[11px] font-black text-amber-300 ring-1 ring-amber-400/25"}>{b}</span>;
                })}
              </div>
            </div>
          );
        })()}
        <div className="mt-1 flex items-center gap-3 text-[11px] font-bold text-white/40">
          {profile.genderFocus && <span className="rounded-full bg-white/10 px-2.5 py-1">{profile.genderFocus}</span>}
          {profile.instagram && (
            <a href={`https://instagram.com/${profile.instagram}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-amber-400">
              <Instagram className="h-3.5 w-3.5" /> @{profile.instagram}
            </a>
          )}
        </div>

        {/* Admin verification review — the selfie (holding the code) + her WhatsApp. Review,
            then tap the ✓ in the stats row to verify + approve her as a Real model. */}
        {isAdmin && (
          <div className="mt-3 w-full max-w-sm rounded-2xl border border-white/12 bg-white/[0.03] p-3 text-left">
            <p className="text-[11px] font-black uppercase tracking-wide text-white/45">Verification (admin)</p>
            <div className="mt-2 flex items-center gap-3">
              {profile.verificationSelfieUrl ? (
                <a href={profile.verificationSelfieUrl} target="_blank" rel="noopener noreferrer" className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={profile.verificationSelfieUrl} alt="verification selfie" className="h-full w-full object-cover" />
                </a>
              ) : (
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-lg border border-dashed border-white/15 text-[10px] font-bold text-white/30">no selfie</div>
              )}
              <div className="min-w-0 flex-1 text-[12px] font-bold text-white/60">
                <p>WhatsApp: <span className="text-white">{profile.phone || "—"}</span></p>
                <p className="mt-1 text-[11px] text-white/40">Status: <span className={profile.status === "deactivated" ? "text-red-400" : profile.status === "pending" ? "text-amber-400" : "text-emerald-400"}>{profile.status === "deactivated" ? "Rejected" : profile.status === "pending" ? "Pending review" : "Active"}</span></p>
              </div>
            </div>
            {/* One tap: APPROVE (pending→active) + VERIFY (Real model). */}
            {profile.realModel ? (
              <div className="mt-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1.5 text-[12px] font-black text-white"><BadgeCheck className="h-4 w-4" /> Verified &amp; approved</span>
                <button type="button" onClick={() => void rejectModel()} disabled={badgeBusy}
                  className="ml-auto rounded-full border border-red-400/40 px-3 py-1.5 text-[12px] font-black text-red-400 active:scale-95 transition disabled:opacity-50">Reject</button>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2">
                <button type="button" onClick={() => void verifyAndApprove()} disabled={badgeBusy}
                  className="lb-gold flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-black active:scale-95 transition disabled:opacity-50">
                  {badgeBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />} Verify &amp; approve
                </button>
                <button type="button" onClick={() => void rejectModel()} disabled={badgeBusy}
                  className="rounded-full border border-red-400/40 px-3 py-2.5 text-[12px] font-black text-red-400 active:scale-95 transition disabled:opacity-50">Reject</button>
              </div>
            )}
            <a href="/model-rules" target="_blank" rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-white/40 underline underline-offset-2 hover:text-white/70">See the model rules ↗</a>
          </div>
        )}

        {/* Admin: pick her main profile photo from the candidates she uploaded. */}
        {isAdmin && (profile.profilePhotoUrls?.length ?? 0) > 0 && (
          <div className="mt-3 w-full max-w-sm rounded-2xl border border-white/12 bg-white/[0.03] p-3 text-left">
            <p className="text-[11px] font-black uppercase tracking-wide text-white/45">Profile photo · pick her best</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.profilePhotoUrls!.map((url, i) => {
                const isMain = url === profile.photoUrl;
                return (
                  <button key={i} type="button" onClick={() => void pickProfilePhoto(i, url)} disabled={badgeBusy}
                    className={`relative h-20 w-20 overflow-hidden rounded-xl border-2 transition active:scale-95 disabled:opacity-60 ${isMain ? "border-amber-400" : "border-white/10"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover object-top" />
                    {isMain && <span className="absolute bottom-0.5 left-0.5 rounded-full bg-amber-400 px-1.5 py-px text-[8px] font-black uppercase text-black">Main</span>}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] font-bold text-white/40">Tap a photo to make it her profile picture.</p>
          </div>
        )}

        {/* Two gold CTAs side by side — chat with her + jump to her other looks. */}
        <div className="mt-3 flex w-full max-w-sm items-stretch gap-2">
          <button type="button"
            onClick={() => { const lg = (() => { try { return localStorage.getItem("lb_lang") === "en" ? "en" : "ro"; } catch { return "ro"; } })(); router.push(`/mai-ieftin?model=${encodeURIComponent(id)}&lang=${lg}`); }}
            className="lb-gold flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-black leading-tight active:scale-95 transition">
            <MessageCircle className="h-4 w-4 shrink-0" /> Chat with her AI Assistant
          </button>
          <button type="button" onClick={() => wardrobeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="lb-gold flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-black leading-tight active:scale-95 transition">
            See {profile.firstName || "her"} in other looks
          </button>
        </div>

        {/* Report — any visitor can flag a profile for review. */}
        {!isOwn && (
          <button type="button" onClick={() => void reportProfile()}
            className="mt-2 text-[11px] font-bold text-white/30 underline underline-offset-2 active:opacity-70">⚠ Report this profile</button>
        )}

        {/* Trust badge in gold (~every 2nd visit): the models are REAL people.
            PURE trust signal for VISITORS — the model herself never sees it
            (also hidden in the admin "view as her" preview). Shows ONLY for models
            the admin explicitly marked as real (realBadge) — never on AI models. */}
        {showRealBanner && !isOwn && (profile.realModel === true || profile.realBadge === true) && (
          <div className="lb-gold mt-3 flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[12px] font-black">
            <BadgeCheck className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">Real model · verified by LuxuryBandit</span>
          </div>
        )}

        {/* Section label — shows for everyone (Gina included), even when empty. */}
        <p className="mt-5 w-full text-left text-[15px] font-black text-white">Try-ons{videos.length > 0 ? <span className="text-white/40"> {videos.length}</span> : null}</p>

        {/* Video gallery — her clips as a thumbnail strip. Tap one → the SAME fullscreen
            "In motion" carousel opens at exactly that clip. (Photo play-ring stays too.)
            Admin/owner additionally see her PHOTO drafts here — the admin turns them
            into videos with one tap. */}
        {(videos.length > 0 || photoDrafts.length > 0) && (
          <div className="mt-2 w-full">
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {videos.map((t, i) => (
                <StripClip key={t.id} t={t} onOpen={() => openMotionAt(i)} />
              ))}
              {photoDrafts.map(t => (
                <div key={t.id} className="relative aspect-[9/16] h-40 shrink-0 overflow-hidden rounded-xl border border-dashed border-amber-400/40 lb-media-bg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={optImg(t.imageUrl, 300)} alt="" loading="lazy" decoding="async"
                    onError={(e) => { const im = e.currentTarget; if (t.imageUrl && im.src !== t.imageUrl) im.src = t.imageUrl; }}
                    className="h-full w-full object-cover object-top" />
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white backdrop-blur">Foto</span>
                  {isAdmin ? (
                    <button type="button" onClick={() => void makeVideoFromPhoto(t)} disabled={!!photoVidBusy}
                      className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-center gap-1 rounded-full bg-amber-400 py-1 text-[10px] font-black text-black active:scale-95 transition disabled:opacity-60">
                      {photoVidBusy === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" fill="currentColor" />}
                      {photoVidBusy === t.id ? "Generiert…" : "Video"}
                    </button>
                  ) : isOwn ? (
                    /* Model self-service: 1st video free, then $3.99 (server-enforced). */
                    <button type="button" onClick={() => void makeVideoAsModel(t)} disabled={!!photoVidBusy}
                      className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-center gap-1 rounded-full bg-amber-400 py-1 text-[10px] font-black text-black active:scale-95 transition disabled:opacity-60">
                      {photoVidBusy === t.id ? <><Loader2 className="h-3 w-3 animate-spin" /> Generiert…</> : <><Play className="h-3 w-3" fill="currentColor" /> Video</>}
                    </button>
                  ) : (
                    <span className="absolute inset-x-1.5 bottom-1.5 rounded-full bg-black/70 py-1 text-center text-[9px] font-black text-white/80 backdrop-blur">Team macht dein Video</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New model, no try-ons yet → a clear placeholder (instead of an empty page). */}
        {videos.length === 0 && photoDrafts.length === 0 && (
          <div className="mt-2 w-full">
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-6 py-10 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-white/[0.06]"><Play className="h-5 w-5 text-white/30" fill="currentColor" /></span>
              <p className="text-sm font-black text-white/50">{name.split(" ")[0]} has no try-ons yet</p>
              <p className="text-[12px] font-bold text-white/30">{isAdmin ? "Upload her photos, then generate her first try-ons here." : "Her try-ons are coming soon."}</p>
            </div>
          </div>
        )}


        {/* Admin: import a self-made video (e.g. from the Pixverse UI) into her reel,
            and "view as her" — a true preview of what SHE sees after signing in. */}
        {isAdmin && (
          <>
            <div className="mt-2 flex items-center gap-2">
              <button type="button" onClick={() => !vidBusy && setVideoPickerOpen(true)} disabled={vidBusy}
                className="flex items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-[11px] font-black text-white active:scale-95 transition disabled:opacity-50">
                {vidBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Video className="h-3.5 w-3.5" />}
                {vidBusy ? "Lade hoch …" : "Video hochladen"}
              </button>
              <button type="button" onClick={() => {
                // Enter HER session (preview): lb_curator = her + the preview flag that
                // suppresses the admin PIN on her pages. Exit via the floating banner.
                try {
                  localStorage.setItem("lb_curator", JSON.stringify({ id, firstName: profile.firstName ?? "", email: "", style: profile.style ?? "" }));
                  localStorage.setItem("lb_preview_model", "1");
                } catch { /**/ }
                window.location.reload();
              }}
                className="flex items-center justify-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-[11px] font-black text-amber-400 active:scale-95 transition">
                <Eye className="h-3.5 w-3.5" /> Ihre Ansicht testen
              </button>
            </div>
            <input ref={vidFileRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) void uploadModelVideo(f); e.target.value = ""; }} />
            {/* Step 1 of upload: pick the garment from the gallery, THEN the file picker opens. */}
            {videoPickerOpen && (
              <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setVideoPickerOpen(false)}>
                <div className="w-full max-w-[440px] rounded-t-3xl bg-[#111] p-5 ring-1 ring-white/10" onClick={e => e.stopPropagation()} style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}>
                  <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/15" />
                  <p className="text-base font-black text-white">Welches Kleidungsstück zeigt das Video?</p>
                  <p className="mb-3 text-[12px] font-bold text-white/45">Tippe das Teil an — danach wählst du die Videodatei. Es wird automatisch verknüpft.</p>
                  <div className="grid max-h-[52vh] grid-cols-3 gap-2 overflow-y-auto">
                    {allLooks.filter(l => (l.productType === "ai" || (l as any).wardrobe === true) && ((l as any).frontImageUrl || l.imageUrl)).map(l => {
                      const img = (l as any).frontImageUrl || l.imageUrl;
                      return (
                        <button key={l.id} type="button"
                          onClick={() => { uploadLookRef.current = l.id; setVideoPickerOpen(false); vidFileRef.current?.click(); }}
                          className="overflow-hidden rounded-xl bg-white/[0.04] text-left ring-1 ring-white/10 active:scale-95 transition">
                          <div className="aspect-[3/4] w-full bg-white">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" onError={e => { e.currentTarget.style.display = "none"; }} />
                          </div>
                          <p className="truncate px-1.5 py-1 text-[9px] font-black text-white/70">{l.name || "Look"}</p>
                        </button>
                      );
                    })}
                  </div>
                  <button type="button" onClick={() => { uploadLookRef.current = ""; setVideoPickerOpen(false); vidFileRef.current?.click(); }}
                    className="mt-3 w-full rounded-full border border-white/15 py-3 text-[13px] font-black text-white/60 active:scale-[0.98] transition">
                    Ohne Kleidungsstück hochladen
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Follow + Message + Share moved to sticky header (second row) */}
      </div>

      {/* Her wardrobe = the clothes selection (the main action, immediately under the
          profile). Tap a piece → the funnel generates HER wearing it. Category filter +
          (admin) per-piece management. */}
      <div ref={wardrobeRef} className="scroll-mt-4 mt-6 px-4 pb-8">
        {(() => {
          // De-dupe: repeated "Generieren" runs can create identical garments (same
          // deterministic name) — show each unique piece once so nothing appears doubled.
          const seen = new Set<string>();
          // A garment is a FLAT wardrobe piece (productType "ai" / wardrobe) — NOT a
          // model-worn look photo. Match the Garderobe tab's rule so no model photos slip in.
          const isGarment = (l: Look) => (l.productType === "ai" || l.wardrobe === true) && (l.frontImageUrl || l.imageUrl);
          const dedupe = (l: Look) => {
            const key = (l.name ?? "").trim().toLowerCase();
            if (key && seen.has(key)) return false;
            if (key) seen.add(key);
            return true;
          };
          // Show the WHOLE portal wardrobe on every model. Featured (free) pieces lead;
          // everything else is Premium (locked) unless the visitor is paid/admin.
          const wardrobeAll = allLooks.filter(l => isGarment(l) && dedupe(l))
            .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
          const wardrobe = wardrobeAll;
          return (
            <>
              {/* Section header + admin "generate wardrobe" (moved out of the profile). */}
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[15px] font-black text-white">Try {profile.firstName || "her"} in any look</h2>
                {isAdmin && (
                  <button type="button" onClick={() => { setGenBrief(""); setGenOpen(true); }} disabled={genBusy}
                    className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[11px] font-black text-white active:scale-95 transition disabled:opacity-50">
                    {genBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {genBusy ? "Generiere …" : "Generieren"}
                  </button>
                )}
              </div>
              {isAdmin && genMsg && <p className="mb-2 text-[11px] font-bold text-white/50">{genMsg}</p>}

              {wardrobe.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-16 text-center">
                  <ShoppingBag className="h-8 w-8 text-white/15" />
                  <p className="text-sm font-black text-white/40">{wardrobeAll.length === 0 ? (isAdmin ? "No looks yet — tap “Generieren”." : "Looks coming soon.") : "Nichts in dieser Kategorie."}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {wardrobe.map(l => {
                    const garment = (l.frontImageUrl ?? l.imageUrl) as string;
                    const hidden = l.published === false;
                    // Show ALL outfits clearly — tapping one goes to the funnel, where the
                    // paywall/credits actually apply. No blurred/locked thumbnails here.
                    const locked = false; void isPaid;
                    return (
                      <div key={l.id} className="relative flex flex-col overflow-hidden rounded-2xl bg-white">
                        <button type="button"
                          onClick={() => { if (locked) { setShowPremium(true); return; } if (profile.photoUrl) router.push(`/try/${l.id}?model=${encodeURIComponent(profile.photoUrl)}&garment=${encodeURIComponent(garment)}&modelId=${encodeURIComponent(id)}&modelName=${encodeURIComponent(name)}`); }}
                          className="relative aspect-[3/4] w-full bg-neutral-50 active:opacity-80 transition-opacity">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={optImg(garment, 500)} alt={l.name} loading="lazy" decoding="async"
                            onError={(e) => { const im = e.currentTarget; if (garment && im.src !== garment) im.src = garment; }}
                            className={`h-full w-full object-contain ${hidden ? "opacity-40" : ""} ${locked ? "blur-[5px] scale-105 opacity-70" : ""}`} />
                          {/* Admin-only: ★ marks the FREE (featured) pieces, so you generate the
                              right combos. End-users just see them unlocked (no badge). */}
                          {isAdmin && l.featured && (
                            <span className="absolute left-2 top-2 z-20 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-black text-black shadow" title="Free piece">★</span>
                          )}
                          {locked ? (
                            <span className="absolute inset-0 z-10 grid place-items-center bg-black/20">
                              <span className="grid h-10 w-10 place-items-center rounded-full bg-black/70 backdrop-blur"><Lock className="h-5 w-5 text-white" /></span>
                            </span>
                          ) : (!hidden && <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/80 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur"><Play className="h-2.5 w-2.5" fill="currentColor" /> Create video</span>)}
                        </button>
                        <div className="flex items-center gap-1.5 px-2 py-1.5">
                          <span className={`block min-w-0 flex-1 truncate text-[11px] font-black ${locked ? "text-amber-500" : "text-black/70"}`}>{locked ? "Premium" : l.name}</span>
                          {!locked && (l as any).buyUrl && (
                            <a href={(l as any).buyUrl} target="_blank" rel="noopener noreferrer sponsored" onClick={e => e.stopPropagation()}
                              className="flex shrink-0 items-center gap-1 rounded-full bg-black px-2 py-1 text-[10px] font-black text-white active:scale-95 transition">
                              <ShoppingBag className="h-3 w-3" /> Shop
                            </a>
                          )}
                        </div>
                        {hidden && <span className="absolute left-2 top-2 rounded-full bg-black/80 px-2 py-0.5 text-[10px] font-black text-white">Ausgeblendet</span>}
                        {/* Admins manage EVERY piece shown here (own + borrowed portal looks). */}
                        {isAdmin && (
                          <button type="button" onClick={() => openManage(l)}
                            className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/70 text-white backdrop-blur active:scale-90 transition">
                            <SlidersHorizontal className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Whole portal wardrobe is shown above (featured free, rest Premium) —
                  the old "Load more looks" button is no longer needed. */}
            </>
          );
        })()}
      </div>

      <PremiumDialog open={showPremium} onClose={() => setShowPremium(false)} />

      {/* AI "chat with the model" — free trial, then Premium. */}
      <ModelChat
        open={showChat}
        onClose={() => setShowChat(false)}
        curatorId={id}
        modelName={name}
        modelFirstName={profile.firstName ?? ""}
        bio={profile.bio ?? ""}
        style={profile.style ?? ""}
        avatarUrl={profile.photoUrl ?? ""}
        isPaid={isSubscribed}
        onNeedPremium={() => { setShowChat(false); setShowSubscribe(true); }}
      />
      <SubscribeDialog open={showSubscribe} onClose={() => setShowSubscribe(false)} />

      {/* Profile photo lightbox — tap anywhere (or X) to close. */}
      {photoOpen && profile.photoUrl && (
        <div className="lb-phone-col fixed inset-0 z-[70] flex flex-col bg-black/95" onClick={() => setPhotoOpen(false)}>
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm font-black text-white">{name}</p>
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {isAdmin && (
                <button type="button" onClick={() => void downloadPhoto()} disabled={dlPhotoBusy} title="Profilfoto herunterladen"
                  className="grid h-9 w-9 place-items-center rounded-full bg-white text-black active:scale-90 transition disabled:opacity-50">
                  {dlPhotoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                </button>
              )}
              {isAdmin && (
                <button type="button" onClick={() => void upscalePhoto()} disabled={hdBusy} title="Profilfoto in HD hochrechnen"
                  className="flex h-9 items-center gap-1.5 rounded-full bg-amber-400 px-3.5 text-[12px] font-black text-black active:scale-95 transition disabled:opacity-50">
                  {hdBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {hdBusy ? "HD…" : "In HD"}
                </button>
              )}
              <button type="button" onClick={() => setPhotoOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white active:scale-90 transition"><X className="h-5 w-5" /></button>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center px-3 pb-8">
            {/* Prefer the UNCROPPED original (portrait) — the avatar is a square crop. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profile.photoFullUrl || profile.photoUrl} alt={name} className="max-h-full w-full rounded-2xl object-contain" />
          </div>
        </div>
      )}

      {/* "In motion" carousel — opened from the video gallery strip. Fullscreen so it
          doesn't share space with (or distract from) the wardrobe. */}
      {motionOpen && videos.length > 0 && (
        <div className="lb-phone-col fixed inset-0 z-[60] flex flex-col bg-black">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="flex items-center gap-1.5 text-sm font-black text-white">
              <Play className="h-3.5 w-3.5 text-amber-400" fill="currentColor" /> {profile.firstName || name} in motion
            </p>
            <button type="button" onClick={() => { setMotionOpen(false); setPlayingId(""); }}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white active:scale-90 transition"><X className="h-5 w-5" /></button>
          </div>
          <div ref={reelRef} onScroll={onReelScroll}
            className="flex flex-1 snap-x snap-mandatory items-center gap-3 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {videos.map(t => (
              // 3:4 like the generated videos — width drives the height (no crop).
              <div key={t.id} className="relative aspect-[9/16] w-[84vw] max-w-[400px] shrink-0 snap-center">
                <button type="button" onClick={() => setPlayingId(p => (p === t.id ? "" : t.id))}
                  className="h-full w-full overflow-hidden rounded-2xl lb-media-bg">
                  {playingId === t.id ? (
                    <video src={t.videoUrl} autoPlay loop playsInline className="h-full w-full object-cover" />
                  ) : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={optImg(t.imageUrl, 700)} alt="" loading="lazy" decoding="async"
                        onError={(e) => { const im = e.currentTarget; if (t.imageUrl && im.src !== t.imageUrl) im.src = t.imageUrl; }}
                        className="h-full w-full object-cover object-top" />
                      <span className="absolute inset-0 grid place-items-center text-white/90"><Play className="h-14 w-14 drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]" fill="currentColor" /></span>
                    </>
                  )}
                </button>
                {isAdmin && (
                  <>
                    {/* Hidden = not in her public profile / feed. Kept for ads + the cache. */}
                    {t.feed === false && (
                      <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-black text-white backdrop-blur"><EyeOff className="h-3 w-3" /> Im Profil versteckt</span>
                    )}
                    <div className="absolute right-3 top-3 flex flex-col gap-2">
                      <button type="button" onClick={() => void downloadVideo(t)} disabled={!!dlBusy}
                        className="grid h-9 w-9 place-items-center rounded-full bg-white text-black backdrop-blur active:scale-90 transition disabled:opacity-50"
                        title="Video herunterladen (für Instagram-Reel vom Handy)">
                        {dlBusy === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      </button>
                      <button type="button" onClick={() => void postToInstagram(t)} disabled={!!igBusy}
                        className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-amber-500 text-white backdrop-blur active:scale-90 transition disabled:opacity-50"
                        title="Auf Instagram posten (Reel)">
                        {igBusy === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Instagram className="h-4 w-4" />}
                      </button>
                      <button type="button" onClick={() => void upscaleVideo(t)} disabled={!!hdVidBusy}
                        className="grid h-9 min-w-9 place-items-center rounded-full bg-amber-400 px-2.5 text-[12px] font-black text-black backdrop-blur active:scale-90 transition disabled:opacity-50"
                        title="In HD umrechnen (1080p)">
                        {hdVidBusy === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "HD"}
                      </button>
                      <button type="button" onClick={() => void toggleVideoFeed(t)}
                        className={`grid h-9 w-9 place-items-center rounded-full text-white backdrop-blur active:scale-90 transition ${t.feed === false ? "bg-emerald-500/90" : "bg-amber-400/90"}`}
                        aria-label={t.feed === false ? "Im Profil zeigen" : "Aus dem Profil ausblenden"}
                        title={t.feed === false ? "Im Profil zeigen" : "Aus dem Profil ausblenden"}>
                        {t.feed === false ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                      <button type="button" onClick={() => deleteVideo(t)}
                        className="grid h-9 w-9 place-items-center rounded-full bg-red-500/90 text-white backdrop-blur active:scale-90 transition" aria-label="Video löschen">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          {videos.length > 1 && (
            <div className="flex justify-center gap-1.5 py-4">
              {videos.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === reelIdx ? "w-5 bg-white" : "w-1.5 bg-white/30"}`} />)}
            </div>
          )}
        </div>
      )}

      {/* Admin: describe the pieces to generate (else auto from her prefs). */}
      {isAdmin && genOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60" onClick={() => setGenOpen(false)} />
          <div className="lb-phone-col fixed inset-x-0 bottom-0 z-[51] rounded-t-2xl border-t border-white/10 bg-[#161311] px-5 pt-4 text-white" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-base font-black">Kleidungsstücke generieren</p>
              <button type="button" onClick={() => setGenOpen(false)} className="grid h-8 w-8 place-items-center rounded-full bg-white/10"><X className="h-4 w-4" /></button>
            </div>
            <p className="mb-2 text-[12px] font-bold text-white/50">Beschreibe was du willst — ein Stück pro Komma. Leer lassen = automatisch aus ihren Vorlieben (Anzahl unten).</p>

            {/* How many pieces to auto-generate (editable). */}
            <div className="mb-2.5 flex items-center gap-3">
              {([["Looks", genMain, setGenMain], ["Lingerie", genLingerie, setGenLingerie]] as [string, number, (n: number) => void][]).map(([label, val, set]) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-[12px] font-black text-white/60">{label}</span>
                  <div className="flex items-center gap-1 rounded-full bg-white/[0.06] p-0.5">
                    <button type="button" onClick={() => set(Math.max(0, val - 1))} className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-white active:scale-90">−</button>
                    <span className="w-5 text-center text-[13px] font-black text-white">{val}</span>
                    <button type="button" onClick={() => set(Math.min(12, val + 1))} className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-white active:scale-90">+</button>
                  </div>
                </div>
              ))}
            </div>
            <textarea value={genBrief} onChange={e => setGenBrief(e.target.value)} onPaste={onGenPaste} rows={3}
              placeholder="z.B. rotes Satin-Abendkleid mit Schlitz, schwarzer Leder-Blazer, schwarzes Spitzen-Dessous-Set"
              className="w-full resize-none rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2.5 text-[13px] text-white outline-none focus:border-white/40" />

            {/* Reference images — paste a screenshot (Cmd/Ctrl+V) or upload. Each becomes a
                clean wardrobe piece (freigestellt) attributed to her. */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2" onPaste={onGenPaste}>
              {genRefs.map((src, i) => (
                <div key={i} className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => setGenRefs(r => r.filter((_, x) => x !== i))}
                    className="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-black/80 text-white"><X className="h-2.5 w-2.5" /></button>
                </div>
              ))}
              <button type="button" onClick={() => genRefFileRef.current?.click()}
                className="flex h-16 w-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-white/25 text-white/50 active:scale-95 transition">
                <ImageUp className="h-4 w-4" />
              </button>
              <span className="text-[11px] font-bold text-white/35">Referenzbild einfügen (Screenshot ⌘V) oder hochladen</span>
            </div>
            <input ref={genRefFileRef} type="file" accept="image/*" multiple className="hidden"
              onChange={e => { if (e.target.files?.length) void addGenRefs(e.target.files); e.currentTarget.value = ""; }} />

            <button type="button" onClick={generateWardrobe} disabled={genBusy}
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 text-sm font-black text-black active:scale-95 transition disabled:opacity-50">
              {genBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {(genBrief.trim() || genRefs.length) ? "Generieren" : `Automatisch (${genMain} + ${genLingerie})`}
            </button>
          </div>
        </>
      )}

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

      {/* Admin: manage a wardrobe piece — rename, edit description, move category,
          replace image, hide/show, delete. Dark sheet to match the page. */}
      {isAdmin && manageItem && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60" onClick={closeManage} />
          <div className="lb-phone-col fixed inset-x-0 bottom-0 z-[51] max-h-[88dvh] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-[#161311] px-5 pt-4 text-white" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-base font-black">Manage garment</p>
              <button type="button" onClick={closeManage} className="grid h-8 w-8 place-items-center rounded-full bg-white/10"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex gap-3">
              <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={optImg(manageItem.frontImageUrl ?? manageItem.imageUrl, 300)} alt=""
                  onError={(e) => { const raw = manageItem.frontImageUrl ?? manageItem.imageUrl; const im = e.currentTarget; if (raw && im.src !== raw) im.src = raw; }}
                  className="h-full w-full object-contain" />
                {/* Admin: download this garment image. */}
                <button type="button" onClick={() => void downloadGarmentImg(manageItem.frontImageUrl ?? manageItem.imageUrl, manageItem.name)}
                  title="Download image"
                  className="absolute bottom-1 right-1 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-white backdrop-blur active:scale-90 transition">
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid min-w-0 flex-1 gap-2">
                <input value={mName} onChange={e => setMName(e.target.value)} placeholder="Name (blank = AI writes it)"
                  className="w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm font-bold text-white outline-none focus:border-white/40" />
                <textarea value={mDesc} onChange={e => setMDesc(e.target.value)} rows={3} placeholder="Description (blank = AI writes it)"
                  className="w-full resize-none rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-[13px] text-white outline-none focus:border-white/40" />
              </div>
            </div>

            {/* Move to another category */}
            <p className="mb-2 mt-4 text-[11px] font-black uppercase tracking-wide text-white/40">Category</p>
            <div className="flex flex-wrap gap-2">
              {LOOK_CATEGORIES.map(c => (
                <button key={c.slug} type="button" onClick={() => setMCat(c.slug)}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-black transition ${mCat === c.slug ? "bg-white text-black" : "bg-white/10 text-white/70"}`}>
                  {catLabel(c.slug)}
                </button>
              ))}
            </div>

            {/* Shop link — powers the "Shop now" button on the tile */}
            <p className="mb-2 mt-4 text-[11px] font-black uppercase tracking-wide text-white/40">Shop link</p>
            <input value={mBuy} onChange={e => setMBuy(e.target.value)} type="url" inputMode="url" placeholder="https://shop.example.com/product…"
              className="w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-[13px] font-bold text-white outline-none focus:border-white/40 placeholder:text-white/25" />

            {/* Replace / hide / delete */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button type="button" onClick={() => replaceRef.current?.click()} disabled={mBusy}
                className="flex flex-col items-center gap-1 rounded-xl border border-white/15 bg-white/[0.04] py-2.5 text-[11px] font-black text-white active:scale-95 transition disabled:opacity-50">
                <ImageUp className="h-4 w-4" /> Replace
              </button>
              <button type="button" onClick={toggleHide} disabled={mBusy}
                className="flex flex-col items-center gap-1 rounded-xl border border-white/15 bg-white/[0.04] py-2.5 text-[11px] font-black text-white active:scale-95 transition disabled:opacity-50">
                {manageItem.published === false ? <><Eye className="h-4 w-4" /> Show</> : <><EyeOff className="h-4 w-4" /> Hide</>}
              </button>
              <button type="button" onClick={deleteManage} disabled={mBusy}
                className="flex flex-col items-center gap-1 rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 text-[11px] font-black text-red-300 active:scale-95 transition disabled:opacity-50">
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </div>
            <input ref={replaceRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) void replaceImage(f); e.currentTarget.value = ""; }} />

            <button type="button" onClick={saveManage} disabled={mBusy}
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 text-sm font-black text-black active:scale-95 transition disabled:opacity-50">
              {mBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </button>
            {mMsg && <p className="mt-2 text-center text-[12px] font-bold text-white/60">{mMsg}</p>}
          </div>
        </>
      )}

      {/* Look picker — pick any catalogue look → the try-on funnel with THIS model's
          photo as the person (?model=). Any logged-in user can generate. */}
    </main>
  );
}
