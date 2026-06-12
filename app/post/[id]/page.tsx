"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, Heart, Send, MessageCircle, UserPlus, UserCheck, Loader2, X, Store } from "lucide-react";
import { lookPath } from "@/lib/look-slug";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";

type Post = {
  id: string;
  lookId: string;
  imageUrl: string;
  userPhotoUrl?: string;
  customerName: string;
  userId?: string;
  lookName: string;
  storeName: string;
  storeSlug: string;
  lookThumbUrl: string;
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
    if (!session) { router.push("/stores?panel=account"); return; }
    if (!post) return;
    const username = profile?.username ?? toSlug(post.customerName);
    setFollowLoading(true);
    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
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
    // Always get a fresh token at send time
    const freshSession = getStoredAuthSession();
    if (!freshSession?.access_token) { router.push("/stores?panel=account"); return; }
    setSending(true); setMsgErr("");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${freshSession.access_token}` },
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
        {/* Follow */}
        {!isOwn && (
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
          <span className="text-[10px] font-black text-black/40 shrink-0">Try it →</span>
        </a>

        {/* Store link */}
        {post.storeSlug && (
          <a href={`/store/${post.storeSlug}`}
            className="flex items-center gap-2 text-xs font-bold text-black/50 hover:text-black transition">
            <Store className="h-4 w-4" />
            {post.storeName || post.storeSlug}
          </a>
        )}
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
            ) : !session ? (
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
