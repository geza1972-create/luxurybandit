"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, BadgeCheck, Instagram, Loader2, Lock, ShoppingBag, UserPlus, UserCheck, MessageCircle, X, Send, Play, Sparkles, SlidersHorizontal, Trash2, EyeOff, Eye, ImageUp, Video, Download, Mail, Pencil } from "lucide-react";
import { TagField } from "../../curators/taste-form";
import { SPONSORS } from "@/lib/sponsors";
import TopNav from "@/components/TopNav";
import PremiumDialog from "@/components/PremiumDialog";
import SubscribeDialog from "@/components/SubscribeDialog";
import ModelChat from "@/components/ModelChat";
import ModelCard from "@/components/ModelCard";
import BookJourneyCTA from "@/components/BookJourneyCTA";

// Curators who offer a bookable travel journey → show the "Book a Journey" CTA on their profile.
const JOURNEY_CURATOR_IDS = new Set(["curator-1783683672619-td4cy"]); // Bella
import { getStoredAuthSession } from "@/lib/supabase-auth-client";
import { influencerPriceCents, fmtPriceCents } from "@/lib/influencer-price";
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

type Profile = { id: string; firstName?: string; lastName?: string; motto?: string; bio?: string; photoUrl?: string; photoFullUrl?: string; instagram?: string; style?: string; brands?: string; genderFocus?: string; likeBoost?: number; viewBoost?: number; realBadge?: boolean; realModel?: boolean; verificationSelfieUrl?: string; phone?: string; status?: string; hidden?: boolean; priceCents?: number; profilePhotoUrls?: string[]; growPriceLabel?: string; growPriceCents?: number; forSale?: boolean; owned?: boolean; youOwnHer?: boolean; flagship?: boolean; flagshipTier?: number; flagshipBases?: number[]; purchasedAt?: string; createdAt?: string; lookCount?: number; videoCount?: number; superFollowers?: number; country?: string; owner?: string; ownerId?: string; ownerHideName?: boolean; modelName?: string; hasPrevPhoto?: boolean; title?: string; intro?: string; sponsor?: string };
type Look = { id: string; name: string; imageUrl: string; frontImageUrl?: string; curatorId?: string; published?: boolean; aiCreated?: boolean; videoUrl?: string; category?: string; collectionId?: string; productNote?: string; lingerie?: boolean; featured?: boolean; productType?: string; wardrobe?: boolean; alternatives?: { priceValue?: number; currency?: string }[]; price?: string; salePrice?: string; brand?: string; buyUrl?: string };
type Collection = { id: string; name: string; order?: number; public?: boolean; releaseToAllModels?: boolean; modelIds?: string[] };
type TryOn = { id: string; imageUrl: string; videoUrl?: string; lookName?: string; lookId?: string; feed?: boolean; private?: boolean; public?: boolean; brand?: string; shopUrl?: string };

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
      {/* Owner/admin visibility marker: a clip not fully public (feed:false = hidden everywhere,
          or public:false = not on her public profile) is flagged "Hidden" so the owner sees it. */}
      {(t.feed === false || t.public === false) && (
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
  // Admin-uploaded carousel slides (e.g. Bella's Peter intro + example videos) — shown on her
  // real card too, not just the /urlaub-mit-bella landing.
  const [carouselSlides, setCarouselSlides] = useState<{ kind: string; mediaUrl: string; posterUrl: string; title: string; caption: string; private?: boolean; hidden?: boolean }[]>([]);
  const [looks, setLooks] = useState<Look[]>([]);
  const [allLooks, setAllLooks] = useState<Look[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false); // $49/mo subscriber → unlimited chat
  const [showPremium, setShowPremium] = useState(false);
  const [showSubscribe, setShowSubscribe] = useState(false);
  useEffect(() => {
    try {
      const admin = !!localStorage.getItem("luxurybandit-try-look-admin-pin");
      // Per-model subscriptions: lb_subs = array of curatorIds the user subscribed to.
      const subs = JSON.parse(localStorage.getItem("lb_subs") || "[]");
      setIsPaid(admin || localStorage.getItem("lb_paid") === "1");
      setIsSubscribed(admin || (Array.isArray(subs) && subs.includes(id)));
    } catch { /**/ }
  }, [id]);
  const [genBusy, setGenBusy] = useState(false);
  const [genMsg, setGenMsg] = useState("");
  // Admin: describe the pieces to generate (else auto from her prefs) + reference images
  // (paste a screenshot or upload) that get extracted into clean wardrobe pieces.
  const [genOpen, setGenOpen] = useState(false);
  const [genBrief, setGenBrief] = useState("");
  const [genRefs, setGenRefs] = useState<string[]>([]);
  const genRefFileRef = useRef<HTMLInputElement>(null);
  const cpFileRef = useRef<HTMLInputElement>(null);      // change-photo: upload input
  const cpRefFileRef = useRef<HTMLInputElement>(null);   // change-photo: AI reference input
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
  const [showSFInfo, setShowSFInfo] = useState(false); // "what you get" explainer before registration
  const [sfSuccess, setSfSuccess] = useState(false);   // "thanks — her value rose +$1, videos unlocked" window
  // Reflect a completed Super Follow: her value rises +$1 (a super-follower), all her private
  // videos unlock (membership), and we show the thank-you window.
  // Send the member their payment receipt / "you subscribed to <model>" email (email from token).
  const notifySubscribed = async () => {
    try { await fetch("/api/subscription-email", { method: "POST", headers: viewerHeaders(), body: JSON.stringify({ curatorId: id, amountCents: superFollowCents }) }); } catch { /**/ }
  };

  const onSuperFollowed = () => {
    setFollowing(true);
    setProfile(p => (p ? { ...p, superFollowers: (p.superFollowers ?? 0) + 1 } : p));
    // Subscribe to THIS model only (per-model): add its id to lb_subs.
    try {
      const subs = JSON.parse(localStorage.getItem("lb_subs") || "[]");
      const next = Array.from(new Set([...(Array.isArray(subs) ? subs : []), id]));
      localStorage.setItem("lb_subs", JSON.stringify(next));
    } catch { /**/ }
    setIsSubscribed(true);
    void notifySubscribed();
    setSfSuccess(true);
  };
  // Super Follow = the ONE $4.99/mo membership → read the single membership price from the list.
  const [superFollowCents, setSuperFollowCents] = useState(499);
  useEffect(() => { fetch("/api/try-this-look?pricing=1").then(r => r.json()).then(d => { if (d?.pricing?.subscriptionMonthlyCents != null) setSuperFollowCents(d.pricing.subscriptionMonthlyCents); }).catch(() => {}); }, []);
  const superFollowLabel = (() => { const n = Math.max(0, Math.round(superFollowCents)) / 100; return `$${n % 1 ? n.toFixed(2) : n.toLocaleString("en-US")}`; })();
  const [showMsg, setShowMsg] = useState(false);
  const [showChat, setShowChat] = useState(false);
  // Chat now lives on its own page (/chat/<id>). Old ?chat=1 deep links redirect there.
  useEffect(() => { try { if (new URLSearchParams(window.location.search).get("chat") === "1") router.replace(`/chat/${id}`); } catch { /**/ } }, [id, router]);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const isOwn = (() => { try { return JSON.parse(localStorage.getItem("lb_curator") ?? "{}").id === id; } catch { return false; } })();
  // Owner's video credits (from her subscription) — shown on her own dashboard.
  const [ownerCredits, setOwnerCredits] = useState<number | null>(null);
  useEffect(() => {
    if (!isOwn) return;
    let em = ""; try { em = JSON.parse(localStorage.getItem("lb_curator") ?? "{}").email || ""; } catch { /**/ }
    if (!em) return;
    // Hitting /api/premium also tops up the monthly subscriber credits server-side, then we read them.
    fetch(`/api/premium?email=${encodeURIComponent(em)}`).catch(() => {})
      .then(() => fetch(`/api/video-pack?email=${encodeURIComponent(em)}`).then(r => r.json()))
      .then(d => setOwnerCredits(Number(d?.credits ?? 0)))
      .catch(() => setOwnerCredits(0));
  }, [isOwn]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/follow?slug=${encodeURIComponent(id)}&type=user`, { headers: viewerHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setFollowerCount(d.followerCount ?? 0); setFollowing(!!d.following); } })
      .catch(() => {});
  }, [id]);

  const isAuthed = () => { try { return !!getStoredAuthSession()?.access_token || !!JSON.parse(localStorage.getItem("lb_curator") ?? "{}").id; } catch { return false; } };
  const handleFollow = async () => {
    // Already a Super Follower → unfollow (free).
    if (following) {
      if (!isAuthed()) { router.push("/stores?panel=account"); return; }
      setFollowLoading(true);
      try {
        const res = await fetch("/api/follow", { method: "POST", headers: viewerHeaders(), body: JSON.stringify({ slug: id, type: "user", action: "unfollow" }) });
        if (res.ok) { const d = await res.json(); setFollowerCount(d.followerCount); setFollowing(d.following); }
      } catch { /**/ }
      setFollowLoading(false);
      return;
    }
    // Logged in (member, owner or model) → Super Follow right away: record it + thank-you window.
    if (isAuthed()) { void doSuperFollow(); return; }
    // Anonymous → show the "what you get" explainer first, then registration.
    setShowSFInfo(true);
  };
  // Record the Super Follow for a logged-in user (Supabase OR curator session) and celebrate:
  // her value rises +$1 and her private videos unlock (see onSuperFollowed).
  const doSuperFollow = async () => {
    if (followLoading) return;
    setFollowLoading(true);
    try {
      const res = await fetch("/api/follow", { method: "POST", headers: viewerHeaders(), body: JSON.stringify({ slug: id, type: "user", action: "follow" }) });
      if (res.ok) { const d = await res.json().catch(() => ({})); if (typeof d.followerCount === "number") setFollowerCount(d.followerCount); onSuperFollowed(); }
      else if (res.status === 401) { router.push("/stores?panel=account"); }
    } catch { /**/ }
    setFollowLoading(false);
  };
  // Runs after the explainer: joins her (member) or starts the $4.99/mo membership (non-member),
  // or sends an anonymous visitor to register first.
  const startSuperFollow = async () => {
    setShowSFInfo(false);
    const sess = (() => { try { return getStoredAuthSession(); } catch { return null; } })();
    // Identity comes from the Supabase session OR — for a logged-in model/curator with no Supabase
    // session (lb_curator) — from that stored account, so a logged-in user never dead-ends here.
    let followerId = sess?.user?.id ?? "";
    let email = sess?.user?.email ?? "";
    if (!followerId) {
      try { const c = JSON.parse(localStorage.getItem("lb_curator") ?? "{}"); if (c?.id) { followerId = c.id; email = email || c.email || ""; } } catch { /**/ }
    }
    if (!followerId) { router.push("/stores?panel=account"); return; } // truly anonymous → register first
    setFollowLoading(true);
    try {
      const res = await fetch("/api/super-follow-checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ curatorId: id, email, followerId, returnPath: `/curator/${id}` }) });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.followed) { setFollowerCount(c => c + 1); onSuperFollowed(); setFollowLoading(false); return; } // already a member
      if (res.ok && d.url) { window.location.href = d.url; return; } // → Stripe membership checkout
      if (res.status === 401) { router.push("/stores?panel=account"); }
    } catch { /**/ }
    setFollowLoading(false);
  };
  // Back from Stripe after paying to Super Follow → confirm + reflect the follow.
  useEffect(() => {
    let cs = "", fid = "";
    try { const q = new URLSearchParams(window.location.search); cs = q.get("cs") ?? ""; fid = q.get("superfollowpaid") ?? ""; } catch { /**/ }
    if (!cs || fid !== id) return;
    (async () => {
      try {
        const r = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(cs)}`);
        const d = await r.json().catch(() => ({}));
        if (d.paid && d.superFollowCuratorId === id) {
          onSuperFollowed();
          fetch(`/api/follow?slug=${encodeURIComponent(id)}&type=user`, { headers: viewerHeaders() }).then(x => x.ok ? x.json() : null).then(x => { if (x) { setFollowerCount(x.followerCount); setFollowing(!!x.following); } }).catch(() => {});
        }
      } catch { /**/ }
      try { const u = new URL(window.location.href); u.searchParams.delete("cs"); u.searchParams.delete("superfollowpaid"); u.searchParams.delete("superfollowcancelled"); window.history.replaceState({}, "", u.toString()); } catch { /**/ }
    })();
  }, [id]);
  // Back from the membership checkout (?premium=success) → subscribe to THIS model.
  useEffect(() => {
    let ok = false;
    try { ok = new URLSearchParams(window.location.search).get("premium") === "success"; } catch { return; }
    if (!ok || !id) return;
    onSuperFollowed();
    try { const u = new URL(window.location.href); u.searchParams.delete("premium"); window.history.replaceState({}, "", u.toString()); } catch { /**/ }
  /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);
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

  // Load THIS model's Card Studio posts so they appear on her card (every model has her own).
  useEffect(() => {
    if (!id) { setCarouselSlides([]); return; }
    // surface=profile → the public GET returns only visible slides targeted at the profile card.
    fetch(`/api/bella-carousel?surface=profile&model=${encodeURIComponent(id)}`).then(r => r.json()).then(d => setCarouselSlides(d.slides ?? [])).catch(() => {});
  }, [id]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [p, tl] = await Promise.all([
          fetch(`/api/curator?profile=${encodeURIComponent(id)}`).then(r => r.json()).then(d => d.profile as Profile | null),
          // Admins send the PIN → the API also returns hidden (published:false) looks so
          // they can be managed/un-hidden here. Non-admins never receive hidden looks.
          fetch("/api/try-this-look", { headers: adminHeaders() }).then(r => r.json()),
        ]);
        const all = (tl?.looks ?? []) as Look[];
        if (!active) return;
        setProfile(p);
        setCollections(Array.isArray(tl?.collections) ? tl.collections : []);
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
    const x = await fetch("/api/try-this-look", { headers: adminHeaders() }).then(r => r.json());
    const all = (x?.looks ?? []) as Look[];
    if (Array.isArray(x?.collections)) setCollections(x.collections);
    setAllLooks(all.filter(l => l.published !== false));
    setLooks(all.filter(l => l.curatorId === id));
  };
  // Admin: attach a SHOP link (+ brand) to an EXISTING video — the look slide then shows
  // "Wearing <brand> · Shop now". Raw URL is stored; affiliate wrapping happens at serve time.
  const setShopLink = async (t: TryOn) => {
    const url = window.prompt("Shop link for this video (the product page URL):", t.shopUrl && !/anrdoezrs|cj\.com/.test(t.shopUrl) ? t.shopUrl : "https://giannabellucci.com/");
    if (url === null) return;
    const brand = window.prompt("Brand shown on the video (\"Wearing …\"):", t.brand || "Gianna Bellucci");
    if (brand === null) return;
    try {
      const res = await fetch("/api/try-this-look", { method: "POST", headers: { "Content-Type": "application/json", ...adminHeaders() }, body: JSON.stringify({ action: "set-generation-shop", generationId: t.id, shopUrl: url.trim(), brand: brand.trim() }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.error) throw new Error(d.error || "Save failed");
      await reloadTryons(); // re-pull → serve-time affiliate-wrapped link
      alert("Shop link saved ✓ — the video now shows “Wearing " + brand.trim() + " · Shop now”.");
    } catch (e) { alert(e instanceof Error ? e.message : "Save failed"); }
  };

  // Admin/owner: delete a try-on generation (video OR photo draft).
  const deleteVideo = async (t: TryOn) => {
    if (!window.confirm(t.videoUrl ? "Delete this video permanently?" : "Delete this photo permanently?")) return;
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
      if (!start.videoId) throw new Error(start.error || "Upscale start failed.");
      let videoUrl = "";
      for (let i = 0; i < 90; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const p = await fetch(`/api/generate-tryon-video?videoId=${encodeURIComponent(start.videoId)}`).then(r => r.json());
        if (p.status === "done" && p.videoUrl) { videoUrl = p.videoUrl; break; }
        if (p.status === "failed") throw new Error(p.error || "Conversion failed.");
      }
      if (!videoUrl) throw new Error("Timed out.");
      await fetch("/api/try-this-look", { method: "POST", headers: H, body: JSON.stringify({ action: "attach-generation-video", generationId: t.id, videoUrl }) });
      setTryons(prev => prev.map(x => x.id === t.id ? { ...x, videoUrl } : x));
      alert("In HD umgerechnet ✓ — neu laden zum Ansehen.");
    } catch (e) { alert(e instanceof Error ? e.message : "Conversion error"); }
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
      if (!res.ok || !d.ok) throw new Error(d?.error || "IG post failed");
      alert("Auf Instagram gepostet ✓");
    } catch (e) { alert(e instanceof Error ? e.message : "IG post failed"); }
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
  // Admin: mark a video PRIVATE (Super Followers / members only) vs PUBLIC (everyone).
  const toggleVideoPrivate = async (t: TryOn) => {
    const next = !t.private;
    setTryons(prev => prev.map(x => x.id === t.id ? { ...x, private: next } : x));
    try {
      await fetch("/api/try-this-look", { method: "POST", headers: { "Content-Type": "application/json", ...adminHeaders() }, body: JSON.stringify({ action: "set-generation-private", generationId: t.id, private: next }) });
    } catch { setTryons(prev => prev.map(x => x.id === t.id ? { ...x, private: !next } : x)); }
  };
  // ── Admin: upload a self-made video (e.g. generated in the Pixverse UI) as a NEW
  // "In motion" video for this model. Direct-to-Supabase (signed URL, no 4.5MB limit),
  // first frame becomes the poster. Defaults to Fashionshow (members + her profile).
  const vidFileRef = useRef<HTMLInputElement>(null);
  const uploadLookRef = useRef(""); // the garment picked in the gallery, read at upload time
  const [videoPickerOpen, setVideoPickerOpen] = useState(false); // garment gallery before picking the file
  const [genVidOpen, setGenVidOpen] = useState(false); // "Generate AI Video" garment picker
  const [genVidBusy, setGenVidBusy] = useState(false);
  const [gvBellucci, setGvBellucci] = useState(false); // picker filter: only Gianna Bellucci pieces
  const [gvCol, setGvCol] = useState<string | null>(null); // picker filter: selected collection (null = all released)
  // Admin: change her main photo — upload one OR generate with fal.ai (same tool as "new model").
  const [cpOpen, setCpOpen] = useState(false);
  const [cpBusy, setCpBusy] = useState(false);
  const [cpPrompt, setCpPrompt] = useState("");
  const [cpRef, setCpRef] = useState("");            // reference image (dataURL) for a similar face
  const [cpResults, setCpResults] = useState<string[]>([]); // generated face image URLs to choose from
  const [cpBefore, setCpBefore] = useState(""); // before/after preview after an enhance
  const [cpAfter, setCpAfter] = useState("");
  // Edit profile (admin/creator): all her text fields, editable right on her page.
  const [epOpen, setEpOpen] = useState(false);
  const [epBusy, setEpBusy] = useState(false);
  const [epName, setEpName] = useState("");
  const [epTitle, setEpTitle] = useState("");
  const [epIntro, setEpIntro] = useState("");
  const [epSponsor, setEpSponsor] = useState("");
  const [epMotto, setEpMotto] = useState("");
  const [epBio, setEpBio] = useState("");
  // Brands as CHIPS (same TagField as the apply form) — free text would break the
  // brand filters & display, so she picks from the same curated brand list.
  const [epBrandChips, setEpBrandChips] = useState<string[]>([]);
  const [epBrandsDb, setEpBrandsDb] = useState<string[]>([]);
  const [epStyle, setEpStyle] = useState("");
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
    if (!file.type.startsWith("video/")) { alert("Please choose a video file."); return; }
    setVidBusy(true);
    try {
      const H = { "Content-Type": "application/json", ...adminHeaders() };
      const ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
      const posterImage = await firstFrameDataUrl(file); // capture BEFORE upload (file still in memory)
      const sig = await fetch("/api/generate-tryon-video", { method: "POST", headers: H, body: JSON.stringify({ importVideo: true, sign: true, ext }) }).then(r => r.json());
      if (!sig.uploadUrl || !sig.path) throw new Error(sig.error || "Upload could not start (check permissions)");
      const put = await fetch(sig.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || "video/mp4", "x-upsert": "true" }, body: file });
      if (!put.ok) throw new Error("Upload to Supabase failed");
      const att = await fetch("/api/generate-tryon-video", { method: "POST", headers: H, body: JSON.stringify({ importVideo: true, videoPath: sig.path }) }).then(r => r.json());
      if (!att.videoUrl) throw new Error(att.error || "Signing failed");
      // If a garment was picked (in the gallery dialog), attach it so this video IS her wearing
      // that piece (reuse cache model×look×turn → served instantly on that try-on, no regen).
      const pickedLookId = uploadLookRef.current;
      const look = allLooks.find(l => l.id === pickedLookId);
      const add = await fetch("/api/try-this-look", { method: "POST", headers: H, body: JSON.stringify({ action: "add-model-video", curatorId: id, videoUrl: att.videoUrl, ...(pickedLookId ? { lookId: pickedLookId, title: look?.name || "", motion: "turn" } : {}), ...(posterImage ? { posterImage } : {}) }) }).then(r => r.json());
      if (!add.ok) throw new Error(add.error || "Could not save the video");
      uploadLookRef.current = "";
      // Refresh her videos so it shows up immediately.
      await reloadTryons();
      alert(look ? `Video uploaded ✓ — linked to “${look.name}”.` : "Video uploaded ✓ — it is now on her profile (play button on the photo).");
    } catch (e) { alert(e instanceof Error ? e.message : "Upload error"); }
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
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Boost failed");
      // Reflect immediately: like/view baselines live on the profile; followers are
      // re-fetched from the follow API (boost + real follows).
      fetch(`/api/follow?slug=${encodeURIComponent(id)}&type=user`, { headers: viewerHeaders() })
        .then(r => r.ok ? r.json() : null).then(d => { if (d) setFollowerCount(d.followerCount ?? followerBoost); }).catch(() => {});
      setProfile(p => (p ? { ...p, likeBoost, viewBoost } : p));
    } catch (e) { alert(e instanceof Error ? e.message : "Boost failed"); }
    finally { setBoostBusy(false); }
  };

  // ── Admin: toggle the gold "real LuxuryBandit Model" banner for THIS model.
  // Off by default (AI models must never claim to be real).
  const [badgeBusy, setBadgeBusy] = useState(false);
  const [onbBusy, setOnbBusy] = useState(false);
  const [onbMsg, setOnbMsg] = useState("");
  // Admin: upscale her (often low-res) profile photo to HD via fal clarity-upscaler.
  const [hdBusy, setHdBusy] = useState(false);
  const upscalePhoto = async () => {
    if (hdBusy) return;
    if (!window.confirm("Enhance her profile photo to HD? (fal.ai — costs a few cents)")) return;
    setHdBusy(true);
    try {
      const res = await fetch("/api/upscale-image", { method: "POST", headers: { "Content-Type": "application/json", ...adminHeaders() }, body: JSON.stringify({ curatorId: id }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.photoUrl) throw new Error(d?.error || "Upscale failed");
      setProfile(p => (p ? { ...p, photoUrl: d.photoUrl, photoFullUrl: d.photoUrl } : p));
      await reloadProfile();
      alert("Profile photo enhanced to HD ✓");
    } catch (e) { alert(e instanceof Error ? e.message : "Upscale failed"); }
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
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Save failed");
      setProfile(p => (p ? { ...p, realBadge: next, realModel: next } : p));
    } catch (e) { alert(e instanceof Error ? e.message : "Save failed"); }
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
  // Admin: set her base price (dollars). Grow-pricing adds videos/looks/days on top.
  const [priceInput, setPriceInput] = useState("");
  const [priceBusy, setPriceBusy] = useState(false);
  useEffect(() => { if (typeof profile?.priceCents === "number") setPriceInput(((profile.priceCents || 0) / 100).toString()); }, [profile?.priceCents]);
  // Flagship tier is managed in the Admin Models list, not on the profile.
  const savePrice = async () => {
    if (priceBusy) return;
    const cents = Math.max(0, Math.round(parseFloat(priceInput.replace(",", ".")) * 100) || 0);
    setPriceBusy(true);
    try {
      await fetch("/api/curator", { method: "POST", headers: { "Content-Type": "application/json", ...adminHeaders() }, body: JSON.stringify({ action: "update", id, priceCents: cents }) });
      setProfile(p => (p ? { ...p, priceCents: cents } : p));
    } catch (e) { alert(e instanceof Error ? e.message : "Failed"); }
    finally { setPriceBusy(false); }
  };
  // ── Own-a-model: buy her at her current LB-Value (dynamic Stripe checkout). ──
  const [buying, setBuying] = useState(false);
  const [bought, setBought] = useState(false);
  const [buyErr, setBuyErr] = useState("");
  const buyInfluencer = async () => {
    if (buying) return;
    setBuyErr(""); setBuying(true);
    try {
      const email = (() => { try { return getStoredAuthSession()?.user?.email ?? ""; } catch { return ""; } })();
      const res = await fetch("/api/buy-influencer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ curatorId: id, email, returnPath: `/curator/${id}` }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.url) { setBuyErr(d.error || "Could not start checkout."); setBuying(false); return; }
      window.location.href = d.url; // → Stripe; returns to ?bought=<id>&cs=<session>
    } catch { setBuyErr("Could not start checkout."); setBuying(false); }
  };
  // List her For sale / take her off the market. Admin OR the model herself (owner) may toggle.
  const [saleBusy, setSaleBusy] = useState(false);
  const toggleForSale = async (next: boolean) => {
    if (saleBusy) return;
    setSaleBusy(true);
    try {
      const r = await fetch("/api/curator", { method: "POST", headers: { "Content-Type": "application/json", ...adminHeaders() }, body: JSON.stringify({ action: "update", id, forSale: next }) });
      if (r.ok) setProfile(p => (p ? { ...p, forSale: next } : p));
    } catch { /* ignore */ }
    finally { setSaleBusy(false); }
  };
  // Owner privacy: hide the owner's name on the card (keep only the ID). Owner or admin.
  const [hideBusy, setHideBusy] = useState(false);
  const toggleOwnerHideName = async (next: boolean) => {
    if (hideBusy) return;
    setHideBusy(true);
    try {
      const r = await fetch("/api/curator", { method: "POST", headers: { "Content-Type": "application/json", ...viewerHeaders(), ...adminHeaders() }, body: JSON.stringify({ action: "set-owner-hide-name", id, hide: next }) });
      if (r.ok) setProfile(p => (p ? { ...p, ownerHideName: next } : p));
    } catch { /* ignore */ }
    finally { setHideBusy(false); }
  };
  // Back from Stripe → confirm the purchase transferred ownership, then refresh her profile.
  useEffect(() => {
    let cs = "", bid = "";
    try { const q = new URLSearchParams(window.location.search); cs = q.get("cs") ?? ""; bid = q.get("bought") ?? ""; } catch { /**/ }
    if (!cs || bid !== id) return;
    (async () => {
      try {
        const r = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(cs)}`);
        const d = await r.json().catch(() => ({}));
        if (d.paid && d.boughtCuratorId === id) {
          setBought(true);
          fetch(`/api/curator?profile=${encodeURIComponent(id)}`).then(x => x.json()).then(x => { if (x.profile) setProfile(x.profile); }).catch(() => {});
        }
      } catch { /**/ }
      try { const u = new URL(window.location.href); u.searchParams.delete("cs"); u.searchParams.delete("bought"); u.searchParams.delete("buycancelled"); window.history.replaceState({}, "", u.toString()); } catch { /**/ }
    })();
  }, [id]);
  // Flip her public (hidden:false) or private (hidden:true) — no approval step anymore.
  const setPublic = async (makePublic: boolean) => {
    if (badgeBusy) return;
    setBadgeBusy(true);
    try {
      await fetch("/api/curator", { method: "POST", headers: { "Content-Type": "application/json", ...adminHeaders() }, body: JSON.stringify({ action: "update", id, hidden: !makePublic }) });
      setProfile(p => (p ? { ...p, hidden: !makePublic } : p));
    } catch (e) { alert(e instanceof Error ? e.message : "Failed"); }
    finally { setBadgeBusy(false); }
  };
  // Send the "your influencer is ready — set your password & open your dashboard" email.
  const sendOnboarding = async () => {
    if (onbBusy) return;
    setOnbBusy(true); setOnbMsg("");
    try {
      const r = await fetch("/api/onboarding-email", {
        method: "POST", headers: { "Content-Type": "application/json", ...adminHeaders() },
        body: JSON.stringify({ curatorId: id }),
      }).then(x => x.json()).catch(() => null);
      setOnbMsg(r?.ok ? "✓ Onboarding email sent" : (r?.error || (r?.skipped ? `Not sent: ${r.skipped}` : "Could not send")));
    } catch { setOnbMsg("Could not send"); }
    finally { setOnbBusy(false); }
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

  // Re-pull her profile from the server → fresh signed photo URL (busts any browser image cache),
  // so the card reflects a just-changed/enhanced photo immediately.
  const reloadProfile = async () => {
    try { const d = await fetch(`/api/curator?profile=${encodeURIComponent(id)}`, { cache: "no-store" }).then(r => r.json()); if (d?.profile) setProfile(d.profile as Profile); } catch { /**/ }
  };
  // ── Admin: change her MAIN photo — upload one, or generate with fal.ai (same tool as new-model). ──
  const cpReadFile = (f: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f); });
  const cpSetMainPhoto = async (dataUrl: string) => {
    setCpBusy(true);
    try {
      const res = await fetch("/api/curator", { method: "POST", headers: { "Content-Type": "application/json", ...adminHeaders() }, body: JSON.stringify({ action: "update", id, photo: dataUrl }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.error) throw new Error(d.error || "Failed to set photo");
      setProfile(p => (p ? { ...p, photoUrl: dataUrl, photoFullUrl: dataUrl } : p));
      setCpOpen(false); setCpResults([]); setCpRef(""); setCpPrompt("");
      void reloadProfile();
    } catch (e) { alert(e instanceof Error ? e.message : "Failed"); }
    finally { setCpBusy(false); }
  };
  const cpUpload = async (f?: File) => { if (!f) return; try { await cpSetMainPhoto(await cpReadFile(f)); } catch { alert("Could not read the image."); } };
  const cpPickRef = async (f?: File) => { if (!f) return; try { setCpRef(await cpReadFile(f)); } catch { /**/ } };
  const cpGenerate = async () => {
    if (cpBusy) return;
    setCpBusy(true); setCpResults([]);
    try {
      const res = await fetch("/api/generate-avatar-face", { method: "POST", headers: { "Content-Type": "application/json", ...adminHeaders() }, body: JSON.stringify({ prompt: cpPrompt.trim() || undefined, count: 4, ...(cpRef ? { referenceImage: cpRef } : {}) }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.error) throw new Error(d.error || "Generation failed.");
      const urls: string[] = (d.faces ?? []).map((f: { imageUrl?: string }) => f.imageUrl).filter(Boolean);
      if (!urls.length) throw new Error("No image generated.");
      setCpResults(urls);
    } catch (e) { alert(e instanceof Error ? e.message : "Generation failed."); }
    finally { setCpBusy(false); }
  };
  const cpUseResult = async (url: string) => {
    setCpBusy(true);
    try {
      const blob = await fetch(url).then(r => r.blob());
      const dataUrl = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(blob); });
      await cpSetMainPhoto(dataUrl);
    } catch { alert("Could not apply the image."); setCpBusy(false); }
  };
  // Enhance = PREVIEW only (don't touch her photo). Show BEFORE / AFTER; the admin then
  // taps "Apply" to keep it or "Regenerate" for a fresh result.
  const cpEnhance = async () => {
    if (cpBusy) return;
    const before = profile?.photoUrl || profile?.photoFullUrl || "";
    setCpBusy(true); setCpAfter(""); setCpBefore(before);
    try {
      const res = await fetch("/api/upscale-image", { method: "POST", headers: { "Content-Type": "application/json", ...adminHeaders() }, body: JSON.stringify({ curatorId: id, preview: true }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.photoUrl) throw new Error(d?.error || "Enhance failed");
      setCpAfter(d.photoUrl); // full-quality HD data URL — NOT applied yet
    } catch (e) { alert(e instanceof Error ? e.message : "Enhance failed"); setCpBefore(""); }
    finally { setCpBusy(false); }
  };
  // Apply the previewed HD image as her main photo (persists exactly that image, no recompress loss).
  const cpApply = async () => { if (cpAfter && !cpBusy) await cpSetMainPhoto(cpAfter); };
  // Open the profile editor prefilled with her current values.
  const openEditProfile = () => {
    if (!profile) return;
    setEpName((profile.modelName ?? "").trim() || [profile.firstName, profile.lastName].filter(Boolean).join(" "));
    setEpTitle(profile.title ?? "");
    setEpIntro(profile.intro ?? "");
    setEpSponsor(profile.sponsor ?? "");
    setEpMotto(profile.motto ?? "");
    setEpBio(profile.bio ?? "");
    setEpBrandChips((profile.brands ?? "").split(/,\s*/).map(b => b.trim()).filter(Boolean));
    setEpStyle(profile.style ?? "");
    // Brand suggestions from the same curated list the apply form uses (fetch once).
    if (!epBrandsDb.length) fetch("/api/curator").then(r => r.json()).then(d => setEpBrandsDb(Array.isArray(d.brands) ? d.brands : [])).catch(() => {});
    setEpOpen(true);
  };
  const saveEditProfile = async () => {
    if (epBusy) return;
    setEpBusy(true);
    try {
      const res = await fetch("/api/curator", {
        method: "POST", headers: { "Content-Type": "application/json", ...viewerHeaders(), ...adminHeaders() },
        // Her NAME is intentionally NOT sent — it's fixed (part of her collectible identity;
        // renames would break URLs/links/history). Rename only via the admin Models list if ever.
        body: JSON.stringify({ action: "update", id, title: epTitle.trim(), intro: epIntro.trim(), sponsor: epSponsor.trim(), motto: epMotto.trim(), bio: epBio.trim(), brands: epBrandChips.join(", "), style: epStyle.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.error) throw new Error(d.error || "Save failed");
      await reloadProfile();
      setEpOpen(false);
    } catch (e) { alert(e instanceof Error ? e.message : "Save failed"); }
    finally { setEpBusy(false); }
  };
  // Restore the previous photo — undo an accidental replace (swaps current ↔ backup).
  const restorePhoto = async () => {
    if (cpBusy) return;
    if (!window.confirm("Restore her previous photo? (undoes the last photo change)")) return;
    setCpBusy(true);
    try {
      const res = await fetch("/api/curator", { method: "POST", headers: { "Content-Type": "application/json", ...adminHeaders() }, body: JSON.stringify({ action: "restore-photo", id }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.error) throw new Error(d.error || "Restore failed");
      await reloadProfile();
      setCpOpen(false); setCpBefore(""); setCpAfter("");
    } catch (e) { alert(e instanceof Error ? e.message : "Restore failed"); }
    finally { setCpBusy(false); }
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
      if (!start.videoId) throw new Error(start.error || "Start failed.");
      let videoUrl = "";
      for (let i = 0; i < 45; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const p = await fetch(`/api/generate-tryon-video?videoId=${encodeURIComponent(start.videoId)}&curatorId=${encodeURIComponent(start.curatorId || "")}`).then(r => r.json());
        if (p.status === "done" && p.videoUrl) { videoUrl = p.videoUrl; break; }
        if (p.status === "failed") throw new Error(p.error || "Generation failed.");
      }
      if (!videoUrl) throw new Error("Timed out.");
      await fetch("/api/try-this-look", { method: "POST", headers: H, body: JSON.stringify({ action: "attach-generation-video", generationId: t.id, videoUrl }) });
      await reloadTryons();
      alert("Video created ✓ — it is now in her reel (visibility still adjustable).");
    } catch (e) { alert(e instanceof Error ? e.message : "Video generation error"); }
    finally { setPhotoVidBusy(""); }
  };

  // ── Model self-service: turn her OWN photo into a video. First video is free (welcome
  // credit), every additional one is $3.99 — the server (generate-tryon-video) enforces it
  // and returns 402 when she's out of credits; we then open Stripe Checkout and retry.
  const payForModelVideo = async (): Promise<boolean> => {
    const r = await fetch("/api/model-video-checkout", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ curatorId: id }),
    }).then(x => x.json()).catch(() => null);
    if (!r?.url || !r?.sessionId) { alert(r?.error || "Could not start the payment."); return false; }
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
    if (!retried && !window.confirm("Your first video is free, each additional one costs $3.99. Continue?")) return;
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
      if (!start.videoId) throw new Error(start.error || "Start failed.");
      let videoUrl = "";
      for (let i = 0; i < 45; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const p = await fetch(`/api/generate-tryon-video?videoId=${encodeURIComponent(start.videoId)}&curatorId=${encodeURIComponent(start.curatorId || id)}`).then(r => r.json());
        if (p.status === "done" && p.videoUrl) { videoUrl = p.videoUrl; break; }
        if (p.status === "failed") throw new Error(p.error || "Generation failed.");
      }
      if (!videoUrl) throw new Error("Timed out.");
      await fetch("/api/try-this-look", { method: "POST", headers: viewerHeaders(), body: JSON.stringify({ action: "attach-generation-video", generationId: t.id, videoUrl }) });
      await reloadTryons();
      alert("Video created ✓");
    } catch (e) { alert(e instanceof Error ? e.message : "Video generation error"); }
    finally { setPhotoVidBusy(""); }
  };

  // "Generate AI Video" — the owner/model flow: HER profile photo + a chosen garment →
  // an AI try-on video. First is free, each additional one $3.99 (server-enforced); admin
  // free. The finished clip is added to her reel.
  const generateVideoInLook = async (look: Look, retried = false) => {
    if (genVidBusy) return;
    const photo = profile?.photoFullUrl || profile?.photoUrl || "";
    if (!photo) { alert("She has no profile photo yet — set one first."); return; }
    setGenVidBusy(true);
    try {
      const res = await fetch("/api/generate-tryon-video", {
        method: "POST", headers: viewerHeaders(), body: JSON.stringify({ lookId: look.id, image: photo, motion: "turn" }),
      });
      const start = await res.json().catch(() => ({}));
      if (res.status === 402 || start?.paymentRequired) {
        setGenVidBusy(false);
        const paid = await payForModelVideo();
        if (paid) await generateVideoInLook(look, true); // retry — the credit is now on her account
        return;
      }
      if (!start.videoId) throw new Error(start.error || "Could not start the video.");
      let videoUrl = "";
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const p = await fetch(`/api/generate-tryon-video?videoId=${encodeURIComponent(start.videoId)}&curatorId=${encodeURIComponent(start.curatorId || id)}`).then(r => r.json());
        if (p.status === "done" && p.videoUrl) { videoUrl = p.videoUrl; break; }
        if (p.status === "failed") throw new Error(p.error || "Generation failed.");
      }
      if (!videoUrl) throw new Error("Timed out.");
      // Carry the garment's brand + shop link so her look slide can show "Wearing <brand> · Shop now".
      const lookBrand = (look.brand || "").trim() || (/bellucci/i.test(`${look.name ?? ""} ${look.productNote ?? ""}`) ? "Gianna Bellucci" : "");
      await fetch("/api/try-this-look", { method: "POST", headers: viewerHeaders(), body: JSON.stringify({ action: "add-model-video", curatorId: id, videoUrl, lookId: look.id, title: look.name || "", motion: "turn", ...(lookBrand ? { brand: lookBrand } : {}), ...(look.buyUrl ? { shopUrl: look.buyUrl } : {}) }) });
      await reloadTryons();
      alert("Video created ✓ — it is now in her reel.");
    } catch (e) { alert(e instanceof Error ? e.message : "Video generation error"); }
    finally { setGenVidBusy(false); }
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
    setGenBusy(true); setGenMsg(refs.length ? "Extracting references & generating … (please wait)" : "Generating wardrobe … (~1 min, please wait)");
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
        if (!res.ok) throw new Error(d?.error || "Error");
      }
      setGenMsg("Fertig ✓");
      setGenRefs([]); setGenBrief("");
      await reloadLooks();
    } catch (e) {
      setGenMsg(e instanceof Error ? e.message : "Error");
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
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Error");
      await reloadLooks();
      setMMsg(successMsg);
    } catch (e) { setMMsg(e instanceof Error ? e.message : "Error"); }
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
    if (!window.confirm("Delete this garment permanently?")) return;
    setMBusy(true); setMMsg("");
    try {
      const res = await fetch("/api/try-this-look", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminHeaders() },
        body: JSON.stringify({ action: "delete-look", id: manageId }),
      });
      if (!res.ok) throw new Error("Error");
      closeManage();
      await reloadLooks();
    } catch { setMMsg("Delete error"); setMBusy(false); }
  };

  if (loading) return <main className="grid min-h-[100dvh] place-items-center lb-bg"><Loader2 className="h-6 w-6 animate-spin text-white/30" /></main>;
  if (!profile) return (
    <main className="grid min-h-[100dvh] place-items-center gap-3 lb-bg text-white">
      <p className="text-sm font-black text-white/50">Model not found</p>
      <button type="button" onClick={() => router.back()} className="text-xs font-black text-white/50 underline">Go back</button>
    </main>
  );

  const name = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || "Model";
  // Public display name — her elegant single avatar name (modelName) wins; the real name stays
  // for internal content matching (videos/looks are keyed by it).
  const displayName = (profile.modelName ?? "").trim() || name;
  // Grow-price label. For admins (who have her base priceCents) recompute LIVE so it
  // reflects a just-saved base price instantly; public visitors use the server value.
  const growLabel = fmtPriceCents(influencerPriceCents({
    name, flagship: profile.flagship, realModel: profile.realModel, videoCount: profile.videoCount,
    lookCount: profile.lookCount, followerCount: profile.superFollowers, purchasedAt: profile.purchasedAt, createdAt: profile.createdAt,
    flagshipTier: profile.flagshipTier, flagshipBases: profile.flagshipBases,
  })) || (profile.growPriceLabel ?? "");
  // Membership ($4.99/mo) unlocks EVERY private video. Owners/admin always see hers.
  // Per-model: you're a "member" of THIS model only if you subscribed to it (or admin/owner).
  const isMember = isAdmin || isOwn || isSubscribed;
  // Private videos (Super Followers / members only) are hidden from everyone else.
  const videos = tryons.filter(t => t.videoUrl && (!t.private || isMember));
  // Photo drafts (no video yet): the model's self-made photos. Visible to admin +
  // the model herself in the gallery strip; the admin turns good ones into videos.
  const photoDrafts = (isAdmin || isOwn) ? tryons.filter(t => !t.videoUrl && t.imageUrl) : [];

  // Her video clips for the card thumb-strip — ALL of them (public + private). Public play for
  // everyone; private show blurred + locked and only members can open them. Public first, cap 8.
  const cardClips = tryons
    .filter(t => t.videoUrl && t.imageUrl)
    .map(t => ({ poster: t.imageUrl, video: t.videoUrl as string, private: t.private === true, brand: t.brand, shopUrl: t.shopUrl }))
    .sort((a, b) => Number(a.private) - Number(b.private))
    .slice(0, 30);
  // Her Card Studio posts ARE the card — NEWEST story first (reverse: the API returns them
  // oldest→newest). When she has posts, the card shows ONLY those (fully editable in the Card
  // Studio); her try-on clips still live in the video gallery below. No posts yet → fall back
  // to the try-on clips so the card is never empty.
  const visibleCustom: { poster: string; video: string; private: boolean; story?: string }[] = [];
  const blurredCustom: { poster: string; video: string; private: boolean; blurred: boolean }[] = [];   // hidden → blurred teasers, last
  for (const s of [...carouselSlides].reverse()) {   // newest first
    if (s.hidden) { blurredCustom.push({ poster: s.mediaUrl || s.posterUrl || "", video: "", private: false, blurred: true }); continue; }
    visibleCustom.push(s.kind === "video"
      ? { poster: s.posterUrl || "", video: s.mediaUrl, private: s.private === true, story: s.caption || undefined }
      : { poster: s.mediaUrl, video: "", private: s.private === true, story: [s.title, s.caption].filter(Boolean).join(" — ") || undefined });
  }
  const customClips = [...visibleCustom, ...blurredCustom];
  const allCardClips = customClips.length ? customClips : cardClips;
  // Data for the shareable collectible ModelCard (THE reusable card, same as the landing).
  const cardData = {
    id: profile.id,
    serial: (profile.id || "").replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase() || "LB0001",
    name: displayName,
    title: profile.title || "",       // brand title, e.g. "Monaco Influencer"
    intro: profile.intro || "",       // ABOUT slide — her self-introduction
    sponsor: profile.sponsor || "",   // sponsor badge on the intro slide
    photo: profile.photoUrl || profile.photoFullUrl || "",
    video: allCardClips[0]?.video || "",
    poster: profile.photoUrl || profile.photoFullUrl || "",
    clips: allCardClips,
    valueLabel: growLabel,
    looks: looks.length,
    bio: profile.bio || profile.motto || "",
    brands: profile.brands || "",
    createdAt: profile.createdAt || "",
    tagline: profile.motto || "Your vibe, every day 💛",
    realModel: profile.realModel === true,
    forSale: profile.forSale === true,
    canDownload: isAdmin || isOwn,
    country: profile.country || "",
    owner: profile.owner || "",
    ownerId: profile.ownerId || "",
    ownerHideName: profile.ownerHideName === true,
    ownerSince: profile.purchasedAt ? new Date(profile.purchasedAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : "",
  };

  return (
    <main className="min-h-[100dvh] lb-bg text-white pb-16">
      <TopNav />
      {/* Profile-context bar sits just under the shared TopNav (name/photo/follow stay in view). */}
      <div className="sticky top-14 z-20 bg-[#0d0b0a]/90 px-4 py-3 backdrop-blur">
        {/* Super Follow + Share now live on the Model Card below — sticky bar keeps only Back. */}
        {!isOwn && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => router.back()} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 active:opacity-70"><ArrowLeft className="h-4 w-4" /></button>
          </div>
        )}
        {/* Owner strip: her video credits (from the subscription) + quick account access. */}
        {isOwn && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => router.back()} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 active:opacity-70"><ArrowLeft className="h-4 w-4" /></button>
            <div className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-amber-400/10 px-4 py-2 ring-1 ring-amber-400/25">
              <span className="text-sm font-black text-amber-400">{ownerCredits === null ? "…" : ownerCredits}</span>
              <span className="text-[11px] font-bold uppercase tracking-wide text-white/55">video credits</span>
            </div>
            <button type="button" onClick={() => router.push("/user/dashboard")}
              className="flex h-9 shrink-0 items-center justify-center gap-1 rounded-full bg-white/10 px-4 text-xs font-black text-white active:scale-95 transition">
              Account
            </button>
          </div>
        )}
      </div>

      {/* Shareable collectible — THE reusable LuxuryBandit Model Card */}
      <div className="px-4 pt-4">
        <ModelCard {...cardData} isMember={isMember} showDates={isAdmin} onLockedClick={() => setShowSubscribe(true)}
          following={following} onSuperFollow={() => void handleFollow()}
          onChat={() => router.push(`/chat/${id}`)} />

        {/* Book a Journey — travel program CTA (only for curators who offer one). */}
        {JOURNEY_CURATOR_IDS.has(id) && <BookJourneyCTA name={profile.firstName || "her"} />}
      </div>

      {/* Profile header */}
      <div className="flex flex-col items-center gap-2 px-6 pt-6 text-center">
        {/* Her stats, photo, name, bio, LB-Value & brands now live in the Model Card above —
            kept out here to avoid redundancy. Only admin controls + buy + socials remain. */}
        {isAdmin && (
          <div className="mb-1 flex items-center justify-center gap-2">
            <button type="button" onClick={() => void boostStats()} disabled={boostBusy} title="Followers/Likes/Views boosten"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-amber-400/40 bg-amber-400/10 text-amber-400 active:scale-90 transition disabled:opacity-50">
              {boostBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            </button>
            <button type="button" onClick={() => void toggleRealBadge()} disabled={badgeBusy}
              title={(profile.realModel || profile.realBadge) ? "Real-Model-Verifizierung entfernen" : "Als Real Model verifizieren & freigeben"}
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border active:scale-90 transition disabled:opacity-50 ${
                (profile.realModel || profile.realBadge) ? "border-amber-400 bg-amber-400 text-black" : "border-white/20 bg-white/5 text-white/40"
              }`}>
              {badgeBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}
        {/* Open to ownership — a TOGGLE (admin or the model herself). When ON, her public profile
            shows the "Get in touch to own her" button; when OFF, no ownership button appears. */}
        {(isAdmin || isOwn) && (
          <div className="mt-1">
            <button type="button" onClick={() => void toggleForSale(!profile.forSale)} disabled={saleBusy}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-black transition active:scale-95 disabled:opacity-50 ${profile.forSale ? "bg-amber-500 text-white" : "border border-white/20 bg-white/5 text-white/60"}`}>
              {saleBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : profile.forSale ? "✓ Open to ownership — tap to close" : "Closed to ownership — tap to open"}
            </button>
            <p className="mt-1 text-[11px] font-bold text-white/40">{profile.forSale ? "ON — her profile shows a “Get in touch to own her” button." : "OFF — no ownership button on her profile."}</p>
          </div>
        )}
        {/* Owner privacy — the OWNER (or admin) can hide their name on the card, keep only the ID. */}
        {(profile.youOwnHer || isAdmin) && profile.owned && (
          <button type="button" onClick={() => void toggleOwnerHideName(!profile.ownerHideName)} disabled={hideBusy}
            className={`mt-1 ml-2 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-black transition active:scale-95 disabled:opacity-50 ${profile.ownerHideName ? "bg-white/15 text-white" : "border border-white/20 bg-white/5 text-white/60"}`}>
            {hideBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : profile.ownerHideName ? "🙈 Name hidden — only ID" : "Hide my owner name"}
          </button>
        )}
        {/* Want her exclusively? Owning an influencer is handled personally — get in touch. */}
        {profile.forSale && !isOwn && (
          <a href={`/contact?reason=own&about=${encodeURIComponent(name)}`} title={`Own ${name}`}
            className="lb-gold mt-1 inline-flex items-center justify-center rounded-full px-6 py-3 text-[14px] font-black shadow active:scale-95 transition">
            Own {name} — get in touch
          </a>
        )}
        <div className="mt-2 flex items-center gap-3 text-[11px] font-bold text-white/40">
          {profile.genderFocus && <span className="rounded-full bg-white/10 px-2.5 py-1">{profile.genderFocus}</span>}
          {profile.instagram && (
            <a href={`https://instagram.com/${profile.instagram}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-amber-400">
              <Instagram className="h-3.5 w-3.5" /> @{profile.instagram}
            </a>
          )}
        </div>

        {/* Verification, approve/reject, public/private & onboarding are managed in the Admin
            Models list — kept off the public profile. */}

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

        {/* Edit profile (admin/creator): every text field, right here on her page.
            Photo changes live on the photo tile next to her videos below. */}
        {(isAdmin || isOwn) && (
          <button type="button" onClick={openEditProfile}
            className="mt-2 flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 py-2.5 text-[13px] font-black text-amber-300 active:scale-95 transition">
            <Pencil className="h-4 w-4" /> Edit profile
          </button>
        )}
        {/* The model's own upload studio — add photos/videos (public or private) to her card. */}
        {isOwn && (
          <a href="/my-studio"
            className="mt-2 flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 py-2.5 text-[13px] font-black text-amber-300 active:scale-95 transition">
            <ImageUp className="h-4 w-4" /> My Studio — add photos &amp; videos
          </a>
        )}
        {cpOpen && (
          <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => !cpBusy && setCpOpen(false)}>
            <div className="w-full max-w-[440px] rounded-t-3xl bg-[#111] p-5 ring-1 ring-white/10" onClick={e => e.stopPropagation()} style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}>
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/15" />
              <p className="text-base font-black text-white">Change her photo</p>
              <p className="mb-3 text-[12px] font-bold text-white/45">Upload a new photo, or enhance her current one to HD — her face always stays the same.</p>

              <button type="button" disabled={cpBusy} onClick={() => cpFileRef.current?.click()}
                className="lb-gold flex w-full items-center justify-center gap-2 rounded-full py-3 text-[13px] font-black active:scale-95 transition disabled:opacity-60">
                {cpBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />} Upload a photo
              </button>
              <input ref={cpFileRef} type="file" accept="image/*" className="hidden" onChange={e => { void cpUpload(e.target.files?.[0]); e.target.value = ""; }} />

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[11px] font-black uppercase tracking-wide text-amber-300/80">Enhance · keeps her face</p>
                <p className="mt-1 text-[12px] font-semibold leading-snug text-white/55">Sharpen &amp; upscale her <b className="text-white/80">current</b> photo to HD. Her face stays <b className="text-white/80">exactly the same</b>, with <b className="text-white/80">natural skin</b> — never plastic or airbrushed.</p>
                {!cpAfter && (
                  <button type="button" disabled={cpBusy} onClick={() => void cpEnhance()}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 py-2.5 text-[13px] font-black text-amber-300 active:scale-95 transition disabled:opacity-60">
                    {cpBusy ? <><Loader2 className="h-4 w-4 animate-spin" /> Enhancing…</> : <><Sparkles className="h-4 w-4" /> Enhance to HD</>}
                  </button>
                )}
                {cpBefore && cpAfter && (
                  <div className="mt-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="mb-1 text-center text-[10px] font-black uppercase tracking-wide text-white/45">Before</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={cpBefore} alt="" className="aspect-[3/4] w-full rounded-lg object-cover object-top ring-1 ring-white/10" />
                      </div>
                      <div>
                        <p className="mb-1 text-center text-[10px] font-black uppercase tracking-wide text-amber-300">After · HD</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={cpAfter} alt="" className="aspect-[3/4] w-full rounded-lg object-cover object-top ring-2 ring-amber-400/70" />
                      </div>
                    </div>
                    <p className="mt-2 text-center text-[11px] font-bold text-white/45">Preview only — not saved yet.</p>
                    <div className="mt-2 flex gap-2">
                      <button type="button" disabled={cpBusy} onClick={() => void cpEnhance()}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/20 py-2.5 text-[12px] font-black text-white/80 active:scale-95 transition disabled:opacity-50">
                        {cpBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Regenerate
                      </button>
                      <button type="button" disabled={cpBusy} onClick={() => void cpApply()}
                        className="lb-gold flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-[12px] font-black active:scale-95 transition disabled:opacity-50">
                        ✓ Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Undo an accidental replace — restore her previous photo. */}
              {profile.hasPrevPhoto && (
                <button type="button" disabled={cpBusy} onClick={() => void restorePhoto()}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-white/15 py-2.5 text-[12px] font-black text-white/70 active:scale-95 transition disabled:opacity-50">
                  <ArrowLeft className="h-3.5 w-3.5" /> Restore previous photo
                </button>
              )}
            </div>
          </div>
        )}

        {/* Edit profile sheet — model name, motto, bio, brands, style. Saves in place. */}
        {epOpen && (
          <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => !epBusy && setEpOpen(false)}>
            <div className="max-h-[88dvh] w-full max-w-[440px] overflow-y-auto rounded-t-3xl bg-[#111] p-5 ring-1 ring-white/10" onClick={e => e.stopPropagation()} style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}>
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/15" />
              <p className="text-base font-black text-white">Edit profile</p>
              <p className="mb-4 text-[12px] font-bold text-white/45">Changes go live immediately. Photo &amp; videos are managed below on her page.</p>
              <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-white/45">Model name</label>
              {/* Her name is FIXED — part of her collectible identity (renames would break
                  URLs, links and her history). Shown locked, never editable here. */}
              <div className="mb-1 flex h-11 w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3">
                <span className="text-sm font-bold text-white/60">{epName}</span>
                <Lock className="h-3.5 w-3.5 shrink-0 text-white/35" />
              </div>
              <p className="mb-3 text-[10px] font-bold text-white/35">Fixed — her name is part of her identity and can&apos;t be changed.</p>
              <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-white/45">Title / role</label>
              <input value={epTitle} onChange={e => setEpTitle(e.target.value)} placeholder="e.g. Monaco Influencer"
                className="mb-3 h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-sm font-bold text-white placeholder:text-white/35 outline-none focus:border-amber-400/50" />
              <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-white/45">About / introduction <span className="normal-case text-white/30">(her ABOUT slide)</span></label>
              <textarea value={epIntro} onChange={e => setEpIntro(e.target.value)} rows={3} placeholder="Hi, I'm … — I travel the world, test the newest trends…"
                className="mb-3 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm font-bold text-white placeholder:text-white/35 outline-none focus:border-amber-400/50" />
              <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-white/45">Sponsor</label>
              {/* Picked from the admin-provided sponsor list (lib/sponsors) — never free text. */}
              <select value={epSponsor} onChange={e => setEpSponsor(e.target.value)}
                className="mb-3 h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-sm font-bold text-white outline-none focus:border-amber-400/50">
                <option value="">No sponsor</option>
                {SPONSORS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-white/45">Tagline / motto</label>
              <input value={epMotto} onChange={e => setEpMotto(e.target.value)} placeholder="e.g. Elegance travels light, lives loud"
                className="mb-3 h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-sm font-bold text-white placeholder:text-white/35 outline-none focus:border-amber-400/50" />
              <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-white/45">Bio / description</label>
              <textarea value={epBio} onChange={e => setEpBio(e.target.value)} rows={3} placeholder="Who is she? What does she represent?"
                className="mb-3 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm font-bold text-white placeholder:text-white/35 outline-none focus:border-amber-400/50" />
              {/* Brands as chips — the SAME curated picker as the apply form, so the brand
                  filters & display never see free-text variants. */}
              <div className="mb-3">
                <TagField label="Favorite brands" list={epBrandsDb} value={epBrandChips} onChange={setEpBrandChips} placeholder="Start typing… Chanel, Dior…" dark />
              </div>
              <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-white/45">Style</label>
              <input value={epStyle} onChange={e => setEpStyle(e.target.value)} placeholder="e.g. Quiet luxury, timeless"
                className="mb-4 h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-sm font-bold text-white placeholder:text-white/35 outline-none focus:border-amber-400/50" />
              <button type="button" disabled={epBusy} onClick={() => void saveEditProfile()}
                className="lb-gold flex h-12 w-full items-center justify-center gap-2 rounded-full text-[14px] font-black active:scale-95 transition disabled:opacity-60">
                {epBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save changes
              </button>
            </div>
          </div>
        )}

        {/* Generate AI Video removed — models now post their own content via My Studio. */}

        {/* Garment picker modal — inert now that the Generate button is gone (kept to avoid churn). */}
        {genVidOpen && (
          <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => !genVidBusy && setGenVidOpen(false)}>
            <div className="w-full max-w-[440px] rounded-t-3xl bg-[#111] p-5 ring-1 ring-white/10" onClick={e => e.stopPropagation()} style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}>
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/15" />
              <p className="text-base font-black text-white">Pick a garment for her video</p>
              <p className="mb-2 text-[12px] font-bold text-white/45">Tap a piece — we generate a video of {displayName.split(" ")[0]} wearing it. First video free, then $3.99.</p>
              {/* Collection filter — she only sees collections RELEASED to her (admin sees
                  all). "Alle" + one chip per released collection. */}
              {(() => {
                const releasedColIds = new Set(
                  collections
                    .filter(c => isAdmin || c.releaseToAllModels || (c.modelIds ?? []).includes(id))
                    .map(c => c.id)
                );
                const releasedCols = [...collections]
                  .filter(c => releasedColIds.has(c.id))
                  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                // A garment is usable if unassigned (no collection) or in a released one.
                const canUse = (l: Look) => !l.collectionId || releasedColIds.has(l.collectionId);
                return (
                  <>
                    {releasedCols.length > 0 && (
                      <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
                        <button type="button" onClick={() => setGvCol(null)} className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black transition ${gvCol === null ? "bg-white text-black" : "bg-white/10 text-white/60"}`}>Alle</button>
                        {releasedCols.map(c => (
                          <button key={c.id} type="button" onClick={() => setGvCol(c.id)} className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black transition ${gvCol === c.id ? "bg-white text-black" : "bg-white/10 text-white/60"}`}>{c.name}</button>
                        ))}
                      </div>
                    )}
              {(() => {
                const brandOf = (l: Look) => (l.brand || "").trim() || (/bellucci/i.test(`${l.name ?? ""} ${l.productNote ?? ""}`) ? "Gianna Bellucci" : "");
                const items = allLooks
                  .filter(l => (l.productType === "ai" || (l as any).wardrobe === true) && ((l as any).frontImageUrl || l.imageUrl))
                  .filter(canUse)
                  .filter(l => gvCol === null || l.collectionId === gvCol)
                  .map(l => ({ l, brand: brandOf(l) }));
                if (items.length === 0) {
                  return <p className="py-8 text-center text-[12px] font-bold text-white/40">Noch keine Teile in dieser Collection.</p>;
                }
                return (
                  <div className="grid max-h-[52vh] grid-cols-3 gap-2 overflow-y-auto">
                    {items.map(({ l, brand }) => {
                      const img = (l as any).frontImageUrl || l.imageUrl;
                      const isBellucci = /bellucci/i.test(brand);
                      return (
                        <button key={l.id} type="button" disabled={genVidBusy}
                          onClick={() => { setGenVidOpen(false); void generateVideoInLook(l); }}
                          className="relative overflow-hidden rounded-xl bg-white/[0.04] text-left ring-1 ring-white/10 active:scale-95 transition disabled:opacity-50">
                          <div className="aspect-[3/4] w-full bg-white">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" onError={e => { e.currentTarget.style.display = "none"; }} />
                          </div>
                          {brand && <span className={`absolute left-1 top-1 max-w-[92%] truncate rounded-full px-1.5 py-0.5 text-[8px] font-black shadow ${isBellucci ? "lb-gold text-black" : "bg-black/70 text-white/85"}`}>{brand}</span>}
                          <p className="truncate px-1.5 py-1 text-[9px] font-black text-white/70">{l.name || "Look"}</p>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
                  </>
                );
              })()}
            </div>
          </div>
        )}

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
          <div className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-black px-6 text-[12px] font-black text-white ring-1 ring-white/12">
            <BadgeCheck className="h-4 w-4 shrink-0 text-amber-400" />
            <span className="min-w-0 truncate">Real model · verified by LuxuryBandit</span>
          </div>
        )}

        {/* Try-ons gallery removed — the profile card (Card Studio posts) is her content now.
            Her private videos live behind the per-model subscription. */}


        {/* Admin: import a self-made video (e.g. from the Pixverse UI) into her reel,
            and "view as her" — a true preview of what SHE sees after signing in. */}
        {isAdmin && (
          <>
            <div className="mt-2 flex items-center gap-2">
              {/* Upload video removed — models post their own content via My Studio. */}
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
                <Eye className="h-3.5 w-3.5" /> Preview as her
              </button>
            </div>
            <input ref={vidFileRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) void uploadModelVideo(f); e.target.value = ""; }} />
            {/* Step 1 of upload: pick the garment from the gallery, THEN the file picker opens. */}
            {videoPickerOpen && (
              <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setVideoPickerOpen(false)}>
                <div className="w-full max-w-[440px] rounded-t-3xl bg-[#111] p-5 ring-1 ring-white/10" onClick={e => e.stopPropagation()} style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}>
                  <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/15" />
                  <p className="text-base font-black text-white">Which garment does the video show?</p>
                  <p className="mb-3 text-[12px] font-bold text-white/45">Tap the piece — then pick the video file. It links automatically.</p>
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
                    Upload without a garment
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
      {/* "Try her in any look" wardrobe retired — try-ons on foreign influencers are gone,
          so this section no longer renders on the profile. */}
      <div ref={wardrobeRef} className="hidden">
        {(() => {
          return null;
          // eslint-disable-next-line no-unreachable
          if (!(profile.youOwnHer || isAdmin || isOwn)) {
            return (
              <div className="mx-auto max-w-sm rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] p-5 text-center">
                <p className="text-sm font-black text-white">Try-ons are for your own influencers</p>
                <p className="mt-1 text-[13px] font-semibold leading-relaxed text-white/55">Own {profile.firstName || "her"} to dress her in any look — one tap, videos are yours.</p>
                {profile.forSale && (
                  <button type="button" onClick={() => void buyInfluencer()} disabled={buying}
                    className="lb-gold mt-3 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-[13px] font-black active:scale-95 transition disabled:opacity-60">
                    {buying ? "…" : `Claim Ownership${profile.growPriceLabel ? ` · ${profile.growPriceLabel}` : ""}`}
                  </button>
                )}
              </div>
            );
          }
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
                    {genBusy ? "Generating …" : "Generate"}
                  </button>
                )}
              </div>
              {isAdmin && genMsg && <p className="mb-2 text-[11px] font-bold text-white/50">{genMsg}</p>}

              {wardrobe.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-16 text-center">
                  <ShoppingBag className="h-8 w-8 text-white/15" />
                  <p className="text-sm font-black text-white/40">{wardrobeAll.length === 0 ? (isAdmin ? "No looks yet — tap “Generate”." : "Looks coming soon.") : "Nothing in this category."}</p>
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
        isOwn={isOwn}
        onNeedPremium={() => { setShowChat(false); setShowSubscribe(true); }}
      />
      <SubscribeDialog open={showSubscribe} onClose={() => setShowSubscribe(false)} />

      {/* Super Follow explainer — what the $4.99/mo membership unlocks, then → registration. */}
      {showSFInfo && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={e => { if (e.target === e.currentTarget) setShowSFInfo(false); }}>
          <div className="w-full max-w-sm rounded-t-3xl border border-amber-400/25 bg-[#141018] p-6 text-center sm:rounded-3xl">
            <button type="button" onClick={() => setShowSFInfo(false)} className="ml-auto grid h-8 w-8 place-items-center rounded-full border border-white/15 text-white/70"><X className="h-4 w-4" /></button>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-400">Subscribe to {profile.firstName || "her"}</p>
            <h2 className="mt-1 text-[26px] font-black leading-tight text-white">Unlock {profile.firstName || "her"}&apos;s private world</h2>
            <table className="mx-auto mt-4 w-full max-w-xs text-left text-[14px] font-bold text-white/80">
              <tbody className="[&>tr>td]:border-b [&>tr>td]:border-white/10 [&>tr>td]:py-2.5 [&>tr:last-child>td]:border-0 [&>tr:last-child>td]:pb-0">
                <tr><td className="w-6 pr-2 align-top text-amber-400">🔒</td><td><b className="text-white">All {profile.firstName || "her"}&apos;s private photos &amp; videos</b>.</td></tr>
                <tr><td className="w-6 pr-2 align-top text-amber-400">💬</td><td><b className="text-white">Unlimited chat</b> with {profile.firstName || "her"}.</td></tr>
                <tr><td className="w-6 pr-2 align-top text-amber-400">↩</td><td><b className="text-white">Cancel anytime</b> — one subscription per model.</td></tr>
              </tbody>
            </table>
            <button type="button" onClick={() => void startSuperFollow()} disabled={followLoading}
              className="lb-gold mt-5 flex h-12 w-full items-center justify-center rounded-full text-[15px] font-black active:scale-95 transition disabled:opacity-60">
              {followLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Continue — subscribe"}
            </button>
            <p className="mt-2 text-[11px] font-bold text-white/35">Start with $8 the first month, then {superFollowLabel}/mo · cancel anytime · 🔒 secure Stripe</p>
          </div>
        </div>
      )}

      {/* Super Follow thank-you — her value rose +$1 and all her videos are unlocked. */}
      {sfSuccess && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={e => { if (e.target === e.currentTarget) setSfSuccess(false); }}>
          <div className="w-full max-w-sm rounded-t-3xl border border-amber-400/30 bg-[#141018] p-6 text-center sm:rounded-3xl">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-3xl">🎉</span>
            <h2 className="mt-4 text-[22px] font-black leading-tight text-white">Thank you!</h2>
            <p className="mt-2 text-[15px] font-bold leading-relaxed text-white/70">
              Her <span className="font-black text-amber-300">Growth Score</span> just went up! You unlocked <span className="font-black text-white">all of {profile.firstName || "her"} videos</span>.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-400/10 px-4 py-2 ring-1 ring-amber-400/25">
              <span className="text-[11px] font-black uppercase tracking-wide text-white/55">New Growth Score</span>
              <span className="text-[16px] font-black text-amber-300">{(growLabel || "").replace(/^\$/, "")}</span>
            </div>
            <button type="button" onClick={() => setSfSuccess(false)}
              className="lb-gold mt-5 flex h-12 w-full items-center justify-center rounded-full text-[15px] font-black active:scale-95 transition">Continue</button>
          </div>
        </div>
      )}

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
                {/* "Shop now" — the garment's shop link ON the video (affiliate-wrapped). */}
                {t.shopUrl && (
                  <a href={t.shopUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                    className="absolute bottom-6 left-3 z-[6] flex items-center gap-1.5 rounded-full bg-amber-400 px-4 py-2 text-[12px] font-black text-black shadow active:scale-95 transition">
                    {t.brand ? `Wearing ${t.brand} · ` : ""}Shop now →
                  </a>
                )}
                {isAdmin && (
                  <>
                    {/* Hidden = not in her public profile / feed. Kept for ads + the cache. */}
                    {t.feed === false && (
                      <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-black text-white backdrop-blur"><EyeOff className="h-3 w-3" /> Hidden from profile</span>
                    )}
                    <div className="absolute right-3 top-3 flex flex-col gap-2">
                      <button type="button" onClick={() => void downloadVideo(t)} disabled={!!dlBusy}
                        className="grid h-9 w-9 place-items-center rounded-full bg-white text-black backdrop-blur active:scale-90 transition disabled:opacity-50"
                        title="Download the video (for an Instagram reel from your phone)">
                        {dlBusy === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      </button>
                      <button type="button" onClick={() => void postToInstagram(t)} disabled={!!igBusy}
                        className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-amber-500 text-white backdrop-blur active:scale-90 transition disabled:opacity-50"
                        title="Post to Instagram (reel)">
                        {igBusy === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Instagram className="h-4 w-4" />}
                      </button>
                      <button type="button" onClick={() => void upscaleVideo(t)} disabled={!!hdVidBusy}
                        className="grid h-9 min-w-9 place-items-center rounded-full bg-amber-400 px-2.5 text-[12px] font-black text-black backdrop-blur active:scale-90 transition disabled:opacity-50"
                        title="Upscale to HD (1080p)">
                        {hdVidBusy === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "HD"}
                      </button>
                      <button type="button" onClick={() => void setShopLink(t)}
                        className={`grid h-9 w-9 place-items-center rounded-full backdrop-blur active:scale-90 transition ${t.shopUrl ? "bg-amber-400 text-black" : "bg-black/55 text-white"}`}
                        aria-label="Set the shop link" title={t.shopUrl ? "Shop link set — tap to change" : "Add a shop link (Shop now on the video)"}>
                        <ShoppingBag className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => void toggleVideoFeed(t)}
                        className={`grid h-9 w-9 place-items-center rounded-full text-white backdrop-blur active:scale-90 transition ${t.feed === false ? "bg-amber-500/90" : "bg-amber-400/90"}`}
                        aria-label={t.feed === false ? "Show in her profile" : "Hide from her profile"}
                        title={t.feed === false ? "Show in her profile" : "Hide from her profile"}>
                        {t.feed === false ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                      <button type="button" onClick={() => void toggleVideoPrivate(t)}
                        className={`grid h-9 w-9 place-items-center rounded-full text-white backdrop-blur active:scale-90 transition ${t.private ? "bg-violet-600/90" : "bg-black/55"}`}
                        aria-label={t.private ? "Private — Super Followers only" : "Public — everyone"}
                        title={t.private ? "Private (Super Followers only) — tap to make public" : "Public — tap to make private (Super Followers only)"}>
                        {t.private ? <Lock className="h-4 w-4" /> : <Lock className="h-4 w-4 opacity-40" />}
                      </button>
                      <button type="button" onClick={() => deleteVideo(t)}
                        className="grid h-9 w-9 place-items-center rounded-full bg-red-500/90 text-white backdrop-blur active:scale-90 transition" aria-label="Delete video">
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
              <p className="text-base font-black">Generate garments</p>
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
              <span className="text-[11px] font-bold text-white/35">Paste a reference image (screenshot ⌘V) or upload</span>
            </div>
            <input ref={genRefFileRef} type="file" accept="image/*" multiple className="hidden"
              onChange={e => { if (e.target.files?.length) void addGenRefs(e.target.files); e.currentTarget.value = ""; }} />

            <button type="button" onClick={generateWardrobe} disabled={genBusy}
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 text-sm font-black text-black active:scale-95 transition disabled:opacity-50">
              {genBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {(genBrief.trim() || genRefs.length) ? "Generate" : `Auto (${genMain} + ${genLingerie})`}
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
              <p className="py-4 text-center text-sm font-bold text-amber-600">Message sent! ✓</p>
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
