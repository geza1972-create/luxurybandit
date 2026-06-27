"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, Heart, Send, MessageCircle, UserPlus, UserCheck, Loader2, X, Store, Sparkles, EyeOff, Trash2, Info } from "lucide-react";
import { lookPath } from "@/lib/look-slug";
import TryOnQR from "@/components/TryOnQR";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";
import { isAdminEmail } from "@/lib/is-admin-email";

type Post = {
  id: string;
  lookId: string;
  imageUrl: string;
  videoUrl?: string;
  userPhotoUrl?: string;
  customerName: string;
  userId?: string;
  lookName: string;
  storeName: string;
  storeSlug: string;
  lookThumbUrl: string;
  curatorId?: string;
  curatorName?: string;
  creatorDeleted?: boolean;
  createdAt: string;
};

type Profile = {
  userId: string;
  username: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  instagram?: string | null;
  website?: string | null;
};

function toSlug(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
function seedInt(id: string, salt: string, min: number, max: number) {
  let h = 0; const s = id + salt;
  for (let i = 0; i < s.length; i++) { h = Math.imul(31, h) + s.charCodeAt(i) | 0; }
  return min + (Math.abs(h) % (max - min + 1));
}

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = String(params?.id ?? "");

  const [post, setPost] = useState<Post | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Like
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  // Follow
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  // Message
  const [showMsg, setShowMsg] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [msgErr, setMsgErr] = useState("");

  const session = typeof window !== "undefined" ? getStoredAuthSession() : null;
  // Curators sign in via localStorage — treat a valid curator session as "signed in"
  const [curatorSession, setCuratorSession] = useState<{ id: string; email?: string; firstName?: string } | null>(null);
  useEffect(() => {
    try { const c = JSON.parse(localStorage.getItem("lb_curator") ?? "{}"); if (c?.id) setCuratorSession(c); }
    catch { /**/ }
  }, []);
  const isSignedIn = !!session || !!curatorSession?.id;

  // ── Staff moderation (admin or the owner curator): hide / delete / assign ──
  const [adminPin, setAdminPin] = useState("");
  useEffect(() => { try { setAdminPin(localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""); } catch { /**/ } }, []);
  const [assignOpen, setAssignOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoData, setInfoData] = useState<Record<string, any> | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const openInfo = async () => {
    if (!post) return;
    setInfoOpen(true); setInfoData(null); setInfoLoading(true);
    try {
      const res = await fetch(`/api/try-this-look?postInfo=${encodeURIComponent(post.id)}`, { headers: modHeaders() });
      const d = res.ok ? await res.json() : null;
      setInfoData(d?.info ?? null);
    } catch { setInfoData(null); }
    setInfoLoading(false);
  };
  const [modWorking, setModWorking] = useState(false);
  const [curators, setCurators] = useState<{ id: string; firstName?: string; lastName?: string; photoUrl?: string }[]>([]);
  const isAdminUser = !!adminPin || isAdminEmail(session?.user?.email);
  const isStaff = isAdminUser || (!!curatorSession?.id && !!post && curatorSession.id === post.curatorId);
  const modHeaders = () => ({ "Content-Type": "application/json", ...(adminPin ? { "x-try-look-admin-pin": adminPin } : {}), ...(curatorSession?.id ? { "x-curator-id": curatorSession.id } : {}), ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) });
  useEffect(() => {
    if (!assignOpen || curators.length || !isAdminUser) return;
    fetch("/api/try-this-look?curators=1", { headers: { ...(adminPin ? { "x-try-look-admin-pin": adminPin } : {}) } })
      .then(r => r.ok ? r.json() : { curators: [] })
      .then((d: { curators?: typeof curators }) => setCurators((d.curators ?? []).slice().sort((a, b) => (a.firstName ?? "").localeCompare(b.firstName ?? ""))))
      .catch(() => {});
  }, [assignOpen, isAdminUser, adminPin, curators.length]);
  const doHide = async () => {
    if (!post) return;
    await fetch("/api/try-this-look", { method: "POST", headers: modHeaders(), body: JSON.stringify({ action: "set-generation-feed", generationId: post.id, feed: false }) }).catch(() => {});
    router.back();
  };
  const doDelete = async () => {
    if (!post || !confirm("Diesen Beitrag permanent löschen?")) return;
    await fetch("/api/try-this-look", { method: "POST", headers: modHeaders(), body: JSON.stringify({ action: "delete-generation", id: post.id }) }).catch(() => {});
    router.back();
  };
  const doAssign = async (customerName: string) => {
    if (!post) return;
    setModWorking(true);
    await fetch("/api/try-this-look", { method: "POST", headers: modHeaders(), body: JSON.stringify({ action: "assign-generation", id: post.id, customerName }) }).catch(() => {});
    setModWorking(false); setAssignOpen(false);
    setPost(p => p ? { ...p, customerName } : p);
  };

  useEffect(() => {
    if (!postId) return;
    setIsLoading(true);

    fetch(`/api/try-this-look?generationId=${encodeURIComponent(postId)}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then(async (d) => {
        if (!d?.post) return;
        const p: Post = d.post;
        setPost(p);
        setLikeCount(seedInt(p.id, "_likes", 18, 480));

        // Load likes from localStorage
        try {
          const liked_ids = JSON.parse(localStorage.getItem("lb_post_likes") ?? "[]") as string[];
          setLiked(liked_ids.includes(p.id));
        } catch { /**/ }

        // Load profile — prefer userId lookup (exact), fall back to customerName slug
        const profileKey = p.userId ?? toSlug(p.customerName);
        const authHeaders: Record<string, string> = session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` } : {};

        const [profRes, followRes] = await Promise.all([
          fetch(`/api/profile/${encodeURIComponent(profileKey)}`).then(r => r.ok ? r.json() : null),
          fetch(`/api/follow?slug=${encodeURIComponent(toSlug(p.customerName))}&type=user`, { headers: authHeaders })
            .then(r => r.ok ? r.json() : { followerCount: 0, following: false }),
        ]);

        if (profRes) setProfile(profRes as Profile);
        setFollowing((followRes as { following: boolean }).following ?? false);
        setFollowerCount((followRes as { followerCount: number }).followerCount ?? 0);
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  // Scroll lock when message modal open
  useEffect(() => {
    if (!showMsg) return;
    const y = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${y}px`;
    document.body.style.left = "0"; document.body.style.right = "0";
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = ""; document.body.style.right = "";
      window.scrollTo(0, y);
    };
  }, [showMsg]);

  const toggleLike = () => {
    if (!post) return;
    const next = !liked;
    setLiked(next);
    setLikeCount(c => c + (next ? 1 : -1));
    try {
      const ids = JSON.parse(localStorage.getItem("lb_post_likes") ?? "[]") as string[];
      const updated = next ? [...ids, post.id] : ids.filter(id => id !== post.id);
      localStorage.setItem("lb_post_likes", JSON.stringify(updated));
    } catch { /**/ }
  };

  const handleFollow = async () => {
    if (!isSignedIn) { router.push("/stores?panel=account"); return; }
    if (!post) return;
    const username = profile?.username ?? toSlug(post.customerName);
    setFollowLoading(true);
    try {
      const authH: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) authH.Authorization = `Bearer ${session.access_token}`;
      else if (curatorSession?.id) authH["x-curator-id"] = curatorSession.id;
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: authH,
        body: JSON.stringify({ slug: username, type: "user" }),
      });
      const p = await res.json() as { following: boolean; followerCount: number };
      setFollowing(p.following);
      setFollowerCount(p.followerCount);
    } catch { /**/ }
    finally { setFollowLoading(false); }
  };

  const handleSend = async () => {
    if (!post) return;
    if (!msgText.trim()) return;
    // Build auth headers — prefer Supabase session, fall back to curator session
    const freshSession = getStoredAuthSession();
    const msgHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (freshSession?.access_token) msgHeaders.Authorization = `Bearer ${freshSession.access_token}`;
    else if (curatorSession?.id) msgHeaders["x-curator-id"] = curatorSession.id;
    else { router.push("/stores?panel=account"); return; }
    setSending(true); setMsgErr("");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: msgHeaders,
        body: JSON.stringify({
          toUsername: toSlug(post.customerName),
          ...(profile?.userId ? { toUserId: profile.userId } : {}),
          text: msgText.trim(),
        }),
      });
      const p = await res.json();
      if (!res.ok) {
        if (res.status === 401) { router.push("/stores?panel=account"); return; }
        throw new Error(p.error ?? "Could not send message.");
      }
      setSent(true); setMsgText("");
      setTimeout(() => { setShowMsg(false); setSent(false); }, 2000);
    } catch (e) {
      setMsgErr(e instanceof Error ? e.message : "Could not send message.");
    } finally { setSending(false); }
  };

  const sharePost = async () => {
    const url = `${window.location.origin}/post/${postId}`;
    if (navigator.share) {
      try { await navigator.share({ title: post?.lookName ?? "LuxuryBandit", url }); } catch { /**/ }
    } else {
      try { await navigator.clipboard.writeText(url); } catch { /**/ }
    }
  };

  if (isLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
    </div>
  );

  if (notFound || !post) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white">
      <p className="text-sm font-black text-black/30">Post not found</p>
      <button type="button" onClick={() => router.back()} className="text-xs font-black underline text-black/40">Go back</button>
    </div>
  );

  const username = profile?.username ?? toSlug(post.customerName);
  const displayName = profile?.displayName ?? post.customerName;
  const avatarUrl = profile?.avatarUrl;
  const isOwn = session?.user.id === profile?.userId;

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-black/8 bg-white/95 px-3 py-2 backdrop-blur">
        <button type="button" onClick={() => router.back()}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-black/40 active:bg-black/5">
          <ChevronLeft className="h-5 w-5" />
        </button>
        {/* Avatar + name → profile */}
        <a href={`/${username}`} className="flex flex-1 items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-black border border-black/8">
            {avatarUrl
              ? <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
              // eslint-disable-next-line @next/next/no-img-element
              : <img src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=000000&fontColor=ffffff&fontSize=40`}
                  alt={displayName} className="h-full w-full object-cover" />
            }
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-black">{displayName}</p>
            <p className="text-[10px] font-bold text-black/40">{timeAgo(post.createdAt)} · {followerCount} followers</p>
          </div>
        </a>
        {/* Staff moderation: hide (owner/admin) · delete + assign (admin) */}
        {isStaff && (
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => void doHide()} title="Ausblenden"
              className="grid h-9 w-9 place-items-center rounded-full bg-amber-400/90 text-white active:opacity-70"><EyeOff className="h-4 w-4" /></button>
            {isAdminUser && (
              <>
                <button type="button" onClick={() => void doDelete()} title="Löschen"
                  className="grid h-9 w-9 place-items-center rounded-full bg-red-500/90 text-white active:opacity-70"><Trash2 className="h-4 w-4" /></button>
                <button type="button" onClick={() => setAssignOpen(true)} title="Zuweisen"
                  className="grid h-9 w-9 place-items-center rounded-full bg-black/70 text-white active:opacity-70"><UserPlus className="h-4 w-4" /></button>
              </>
            )}
          </div>
        )}
        {/* Follow */}
        {!isOwn && !isStaff && (
          <button type="button" onClick={() => void handleFollow()} disabled={followLoading}
            className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-black transition active:scale-95 disabled:opacity-50 ${
              following ? "border border-black/20 bg-white text-black/60" : "bg-black text-white"
            }`}>
            {followLoading
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : following ? <><UserCheck className="h-3.5 w-3.5" />Following</> : <><UserPlus className="h-3.5 w-3.5" />Follow</>
            }
          </button>
        )}
      </header>

      {/* Assign-to-creator picker (admin) */}
      {assignOpen && (
        <div className="fixed inset-0 z-[120] flex flex-col justify-end bg-black/50" onClick={() => setAssignOpen(false)}>
          <div className="flex max-h-[72dvh] flex-col rounded-t-2xl bg-white" onClick={e => e.stopPropagation()} style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
            <div className="flex items-center justify-between border-b border-black/8 px-4 py-3">
              <span className="text-sm font-black text-black">Assign to creator</span>
              <button type="button" onClick={() => setAssignOpen(false)} className="grid h-8 w-8 place-items-center rounded-full text-black/40 active:bg-black/5"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto p-2 overscroll-contain">
              {curators.length === 0 ? (
                <p className="py-8 text-center text-sm font-bold text-black/35">No creators loaded.</p>
              ) : curators.map(c => {
                const name = [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || "Creator";
                return (
                  <button key={c.id} type="button" disabled={modWorking}
                    onClick={() => void doAssign(name)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition active:bg-black/5 disabled:opacity-50">
                    {c.photoUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={c.photoUrl} alt={name} className="h-10 w-10 shrink-0 rounded-full object-cover bg-black/5" />
                      // eslint-disable-next-line @next/next/no-img-element
                      : <img src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=000000&fontColor=ffffff&fontSize=40`} alt={name} className="h-10 w-10 shrink-0 rounded-full bg-black/5" />}
                    <span className="min-w-0 flex-1 truncate text-sm font-black text-black">{name}</span>
                    {post.customerName === name && <span className="text-[11px] font-black text-emerald-600">current</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Info / history sheet — public; same provenance as the reels feed */}
      {infoOpen && (
        <div className="fixed inset-0 z-[120] flex flex-col justify-end bg-black/50" onClick={() => setInfoOpen(false)}>
          <div className="flex max-h-[78dvh] flex-col rounded-t-2xl bg-white" onClick={e => e.stopPropagation()} style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
            <div className="flex items-center justify-between border-b border-black/8 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-black text-black"><Info className="h-4 w-4" /> Post info & history</span>
              <button type="button" onClick={() => setInfoOpen(false)} className="grid h-8 w-8 place-items-center rounded-full text-black/40 active:bg-black/5"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 overscroll-contain">
              {infoLoading ? (
                <div className="flex items-center justify-center py-10 text-black/40"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : !infoData ? (
                <p className="py-8 text-center text-sm font-bold text-black/35">No info found.</p>
              ) : (() => {
                const d = infoData;
                const isLook = d.kind === "look";
                const fmt = (iso: any) => { if (!iso) return "—"; try { return new Date(iso).toLocaleString("en-US", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return String(iso); } };
                const typeLabel = isLook
                  ? (d.aiCreated ? "AI-Studio look (AI-generated)" : `Curated look${d.productType === "real" ? " · real product" : ""}`)
                  : (d.hadUserPhoto ? "Try-on (own photo uploaded)" : "Try-on (AI render, no own photo)");
                const mediaLabel = d.media === "video" ? (isLook ? "With video" : (d.videoKind === "video360" ? "AI-Video 360°" : "AI-Video")) : (isLook ? "Image only" : "AI-Picture");
                const Row = ({ k, v }: { k: string; v: ReactNode }) => (
                  <div className="flex items-start justify-between gap-4 border-b border-black/5 py-2.5">
                    <span className="shrink-0 text-[12px] font-bold uppercase tracking-wide text-black/40">{k}</span>
                    <span className="min-w-0 text-right text-[13px] font-semibold text-black">{v}</span>
                  </div>
                );
                return (
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${isLook ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700"}`}>{isLook ? "Look" : "Try-on"}</span>
                      <span className="rounded-full bg-black/8 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-black/60">{mediaLabel}</span>
                      {!isLook && d.media === "video" && !d.genKindKnown && (
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-amber-700" title="Created before tier tracking — the exact video tier (360°?) wasn't saved.">Tier not recorded</span>
                      )}
                    </div>
                    <Row k="Created" v={fmt(d.createdAt)} />
                    <Row k="By" v={<span>{d.who || "—"}{d.isCurator && <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-700">CURATOR</span>}</span>} />
                    <Row k="Type" v={typeLabel} />
                    <Row k="Media" v={mediaLabel} />
                    {isLook ? (
                      <>
                        {d.brand && <Row k="Brand" v={d.brand} />}
                        {d.price && <Row k="Price" v={d.price} />}
                        <Row k="Try-ons" v={String(d.tryOns ?? 0)} />
                        <Row k="Likes" v={String(d.likes ?? 0)} />
                        {d.media === "video" && d.videoCreatedAt && <Row k="Video created" v={fmt(d.videoCreatedAt)} />}
                        {d.status && <Row k="Status" v={String(d.status)} />}
                      </>
                    ) : (
                      <>
                        <Row k="Look" v={d.lookName || "—"} />
                        {d.source && <Row k="Source" v={String(d.source)} />}
                        {d.status && <Row k="Status" v={String(d.status)} />}
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Post image(s) */}
      <div className="relative bg-black/5">
        {post.userPhotoUrl ? (
          <div className="grid grid-cols-2 gap-0.5">
            <div className="relative aspect-[3/4] overflow-hidden bg-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.userPhotoUrl} alt="Before" className="h-full w-full object-cover object-top" />
              <div className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-black text-white/80">Before</div>
            </div>
            <div className="relative aspect-[3/4] overflow-hidden bg-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.imageUrl} alt="After" className="h-full w-full object-cover object-top" />
              <div className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-black text-white/80">After</div>
            </div>
          </div>
        ) : (
          <div className="aspect-[3/4] max-h-[75dvh] w-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.imageUrl} alt={post.lookName} className="h-full w-full object-cover object-top" />
          </div>
        )}
        {/* AI Picture label (Info) — on a still post (no video). Whole label is clickable. */}
        {!post.videoUrl && (
          <button type="button" onClick={() => void openInfo()} title="Info / history"
            className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur active:opacity-70">
            <Sparkles className="h-3 w-3" />AI Picture <span className="ml-0.5 inline-flex items-center gap-0.5 opacity-80"><Info className="h-2.5 w-2.5" />(Info)</span>
          </button>
        )}
        {/* Try-on video (when one was generated for this try-on) */}
        {post.videoUrl && (
          <div className="relative mt-0.5 max-h-[75dvh] w-full overflow-hidden bg-black">
            <video src={post.videoUrl} className="mx-auto h-full max-h-[75dvh] w-full object-contain" controls loop playsInline muted autoPlay />
            {/* AI-Video label (Info) — whole label is clickable, opens the history sheet. */}
            <button type="button" onClick={() => void openInfo()} title="Info / history"
              className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur active:opacity-70">
              <Sparkles className="h-3 w-3" />AI-Video <span className="ml-0.5 inline-flex items-center gap-0.5 opacity-80"><Info className="h-2.5 w-2.5" />(Info)</span>
            </button>
          </div>
        )}
      </div>

      {/* Actions row */}
      <div className="flex items-center gap-1 border-b border-black/5 px-4 py-2">
        <button type="button" onClick={toggleLike}
          className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-black transition active:scale-95 ${
            liked ? "text-red-500" : "text-black/50"
          }`}>
          <Heart className={`h-5 w-5 ${liked ? "fill-red-500 stroke-red-500" : ""}`} />
          <span>{likeCount}</span>
        </button>
        {!isOwn && (
          <button type="button" onClick={() => setShowMsg(true)}
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-black text-black/50 active:scale-95 transition">
            <MessageCircle className="h-5 w-5" />
          </button>
        )}
        <button type="button" onClick={() => void sharePost()}
          className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-black text-black/50 active:scale-95 transition">
          <Send className="h-4 w-4" />
          <span className="text-xs">Share</span>
        </button>
      </div>

      {/* Caption / look link */}
      <div className="px-4 py-3 grid gap-3">
        <p className="text-sm text-black/80 leading-relaxed">
          <a href={`/${username}`} className="font-black text-black hover:underline">{displayName}</a>
          {" "}tried on{" "}
          <a href={lookPath(post.lookName, post.lookId)} className="font-bold text-black/70 hover:underline">{post.lookName}</a>
        </p>

        {/* Original look card */}
        {post.creatorDeleted ? (
          <div className="flex items-center gap-3 rounded-xl border border-black/10 bg-black/[0.02] p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-black text-black/50">{post.lookName}</p>
            </div>
          </div>
        ) : (
          <a href={lookPath(post.lookName, post.lookId)}
            className="flex items-center gap-3 rounded-xl border border-black/10 bg-black/[0.02] p-3 hover:bg-black/5 transition active:scale-[0.98]">
            {post.lookThumbUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.lookThumbUrl} alt={post.lookName} className="h-14 w-10 rounded-lg object-cover object-top shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-black text-black">{post.lookName}</p>
              {post.storeName && <p className="truncate text-[10px] font-bold text-black/40">{post.storeName}</p>}
            </div>
            {post.curatorName ? (
              <span className="shrink-0 max-w-[42%] text-right text-[10px] font-bold leading-tight text-black/45">
                Curated by <span className="font-black text-black/70">{post.curatorName}</span>
              </span>
            ) : (
              <span className="text-[10px] font-black text-black/40 shrink-0">Try it →</span>
            )}
          </a>
        )}

        {/* Try this look (white + credits) · QR · Bandit the look (black → dupes) */}
        {!post.creatorDeleted && (
          <div className="flex items-center gap-2">
            <a href={`/tryon/${post.lookId}`}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-black/15 bg-white text-sm font-black text-black active:scale-95 transition-transform">
              <Sparkles className="h-4 w-4" /> Try This Look · Free
            </a>
            <TryOnQR lookId={post.lookId} lookName={post.lookName} />
            <a href={`${lookPath(post.lookName, post.lookId)}/details`}
              className="flex h-11 shrink-0 items-center justify-center rounded-full bg-black px-5 text-sm font-black text-white active:scale-95 transition-transform">
              Bandit the look!
            </a>
          </div>
        )}

        {/* Store link / deleted-creator note */}
        {post.creatorDeleted ? (
          <p className="flex items-center gap-2 text-xs font-bold text-black/40">
            <Store className="h-4 w-4" />
            Original creator has been deleted
          </p>
        ) : post.storeSlug ? (
          <a href={`/store/${post.storeSlug}`}
            className="flex items-center gap-2 text-xs font-bold text-black/50 hover:text-black transition">
            <Store className="h-4 w-4" />
            {post.storeName || post.storeSlug}
          </a>
        ) : null}
      </div>

      {/* Message modal */}
      {showMsg && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm px-4"
          style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 pb-6 shadow-2xl overscroll-contain" style={{ maxHeight: "80dvh" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black text-black">Message {displayName}</h2>
              <button type="button" onClick={() => { setShowMsg(false); setSent(false); setMsgErr(""); }}
                className="grid h-8 w-8 place-items-center rounded-full bg-black/5 text-black/50">
                <X className="h-4 w-4" />
              </button>
            </div>
            {sent ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                  <Send className="h-5 w-5" />
                </div>
                <p className="text-sm font-black text-emerald-700">Message sent!</p>
              </div>
            ) : !isSignedIn ? (
              <div className="grid gap-3">
                <p className="text-sm text-black/60">Sign in to send messages.</p>
                <a href="/stores?panel=account" className="flex h-11 items-center justify-center rounded-xl bg-black text-sm font-black text-white">Sign in</a>
              </div>
            ) : (
              <div className="grid gap-3">
                <textarea value={msgText} onChange={e => setMsgText(e.target.value)}
                  placeholder={`Write to ${displayName}…`} rows={4} maxLength={1000}
                  className="w-full rounded-xl border border-black/10 bg-black/[0.03] px-4 py-3 text-sm font-bold text-black placeholder:text-black/30 outline-none focus:border-black resize-none" />
                {msgErr && <p className="text-xs font-bold text-red-500">{msgErr}</p>}
                <button type="button" onClick={() => void handleSend()} disabled={sending || !msgText.trim()}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-black text-sm font-black text-white disabled:opacity-40 active:scale-95 transition-transform">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" />Send</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
