"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, Heart, Image as ImageIcon, Send, MessageCircle, Globe, Instagram, Store, X, Loader2, UserPlus, UserCheck } from "lucide-react";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";

type GalleryItem = {
  id: string;
  lookId: string;
  imageUrl: string;
  userPhotoUrl?: string;
  customerName: string;
  lookName: string;
  storeName: string;
  storeSlug: string;
  lookThumbUrl: string;
  createdAt: string;
};

type ProfileData = {
  userId: string;
  username: string;
  displayName: string;
  bio?: string | null;
  website?: string | null;
  instagram?: string | null;
  avatarUrl?: string | null;
  storeSlug?: string | null;
  storeName?: string | null;
};

function seedInt(id: string, salt: string, min: number, max: number): number {
  let h = 0;
  const s = id + salt;
  for (let i = 0; i < s.length; i++) { h = Math.imul(31, h) + s.charCodeAt(i) | 0; }
  return min + (Math.abs(h) % (max - min + 1));
}
function fmtN(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n); }
function genLikes(id: string) { return seedInt(id, "_gl", 18, 480); }
function genViews(id: string) { return seedInt(id, "_gv", 200, 980); }

export default function UserGalleryPage() {
  const params = useParams();
  const router = useRouter();
  const username = String(params?.username ?? "");

  const [items, setItems] = useState<GalleryItem[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<GalleryItem | null>(null);
  const [copied, setCopied] = useState(false);

  // Follow
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  // Message modal
  const [showMsg, setShowMsg] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [msgErr, setMsgErr] = useState("");
  const session = typeof window !== "undefined" ? getStoredAuthSession() : null;

  useEffect(() => {
    if (!username) return;
    setIsLoading(true);

    const authHeaders = session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` } : {};

    Promise.all([
      fetch(`/api/try-this-look?username=${encodeURIComponent(username)}`).then(r => r.json()),
      fetch(`/api/profile/${encodeURIComponent(username)}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/follow?slug=${encodeURIComponent(username)}&type=user`, { headers: authHeaders }).then(r => r.ok ? r.json() : { followerCount: 0, following: false }),
    ]).then(([gallery, prof, followData]) => {
      setItems((gallery.userGallery ?? []) as GalleryItem[]);
      if (prof) setProfile(prof as ProfileData);
      else setProfile({ userId: "", username, displayName: gallery.displayName ?? username });
      setFollowing((followData as { following: boolean }).following ?? false);
      setFollowerCount((followData as { followerCount: number }).followerCount ?? 0);
    }).catch(() => {
      setProfile({ userId: "", username, displayName: username });
    }).finally(() => setIsLoading(false));

    try { setLikes(JSON.parse(localStorage.getItem("lb_gen_likes") ?? "{}")); } catch { /**/ }
  }, [username]);

  // Scroll lock when modals open
  useEffect(() => {
    const active = showMsg || !!selected;
    if (!active) return;
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
  }, [showMsg, selected]);

  const toggleLike = (id: string) => {
    const next = { ...likes, [id]: !likes[id] };
    setLikes(next);
    try { localStorage.setItem("lb_gen_likes", JSON.stringify(next)); } catch { /**/ }
  };

  const shareProfile = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: `${profile?.displayName ?? username} on LuxuryBandit`, url }); } catch { /**/ }
    } else {
      try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /**/ }
    }
  };

  const handleFollow = async () => {
    if (!session) { router.push("/stores?panel=account"); return; }
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

  const handleSendMessage = async () => {
    if (!session) { router.push("/stores?panel=account"); return; }
    if (!msgText.trim()) return;
    setSending(true); setMsgErr("");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ toUsername: username, text: msgText.trim() }),
      });
      const p = await res.json();
      if (!res.ok) throw new Error(p.error ?? "Error.");
      setSent(true); setMsgText("");
      setTimeout(() => { setShowMsg(false); setSent(false); }, 2000);
    } catch (e) {
      setMsgErr(e instanceof Error ? e.message : "Error.");
    } finally { setSending(false); }
  };

  const displayName = profile?.displayName ?? username;
  const avatarUrl = profile?.avatarUrl;
  const initial = (displayName || "?")[0].toUpperCase();
  const totalLikes = items.reduce((sum, item) => sum + genLikes(item.id) + (likes[item.id] ? 1 : 0), 0);
  const totalViews = items.reduce((sum, item) => sum + genViews(item.id), 0);
  const isOwn = session?.user.id === profile?.userId;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-black/8 bg-white/95 backdrop-blur">
        <div className="flex items-center gap-2 px-3 py-2">
          <button type="button" onClick={() => router.back()}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-black/50 active:bg-black/5">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-1 items-center gap-2.5 min-w-0">
            {/* Avatar */}
            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-black border border-black/8">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=000000&fontColor=ffffff&fontSize=40`}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-black">{displayName}</p>
              <p className="text-[10px] font-bold text-black/40 truncate">
                {profile?.bio ? profile.bio.slice(0, 40) + (profile.bio.length > 40 ? "…" : "") : "AI Fashion Creator"}
              </p>
            </div>
          </div>
          {/* Follow + Message buttons (only if not own profile) */}
          {!isOwn && (
            <>
              <button type="button" onClick={() => void handleFollow()} disabled={followLoading}
                className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-black transition active:scale-95 disabled:opacity-50 ${
                  following
                    ? "border border-black/20 bg-white text-black/60"
                    : "bg-black text-white"
                }`}>
                {followLoading
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : following
                    ? <><UserCheck className="h-3.5 w-3.5" />Following</>
                    : <><UserPlus className="h-3.5 w-3.5" />Follow</>
                }
              </button>
              <button type="button" onClick={() => setShowMsg(true)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-black/10 text-black/60 active:bg-black/5 transition">
                <MessageCircle className="h-4 w-4" />
              </button>
            </>
          )}
          <button type="button" onClick={() => void shareProfile()}
            className="flex h-9 items-center gap-1.5 rounded-full bg-black px-3 text-xs font-black text-white active:opacity-80 transition-opacity">
            <Send className="h-3.5 w-3.5" />
            {copied ? "Copied!" : "Share"}
          </button>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-0 border-t border-black/5 divide-x divide-black/5">
          <div className="flex flex-1 flex-col items-center py-2">
            <p className="text-sm font-black text-black">{items.length}</p>
            <p className="text-[9px] font-bold uppercase tracking-wide text-black/40">Looks</p>
          </div>
          <div className="flex flex-1 flex-col items-center py-2">
            <p className="text-sm font-black text-black">{followerCount}</p>
            <p className="text-[9px] font-bold uppercase tracking-wide text-black/40">Followers</p>
          </div>
          <div className="flex flex-1 flex-col items-center py-2">
            <p className="text-sm font-black text-black">{fmtN(totalLikes)}</p>
            <p className="text-[9px] font-bold uppercase tracking-wide text-black/40">Likes</p>
          </div>
          <div className="flex flex-1 flex-col items-center py-2">
            <p className="text-sm font-black text-black">{fmtN(totalViews)}</p>
            <p className="text-[9px] font-bold uppercase tracking-wide text-black/40">Views</p>
          </div>
        </div>
      </header>

      {/* Profile info strip (bio full, links, store) */}
      {(profile?.bio || profile?.website || profile?.instagram || profile?.storeSlug) && (
        <div className="border-b border-black/5 px-4 py-3 grid gap-2">
          {profile.bio && (
            <p className="text-sm text-black/70 leading-relaxed">{profile.bio}</p>
          )}
          <div className="flex flex-wrap gap-3">
            {profile.instagram && (
              <a href={`https://instagram.com/${profile.instagram.replace(/^@/, "")}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[12px] font-bold text-black/60 hover:text-black transition">
                <Instagram className="h-3.5 w-3.5" />
                @{profile.instagram.replace(/^@/, "")}
              </a>
            )}
            {profile.website && (
              <a href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[12px] font-bold text-black/60 hover:text-black transition">
                <Globe className="h-3.5 w-3.5" />
                {profile.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            )}
            {profile.storeSlug && (
              <a href={`/store/${profile.storeSlug}`}
                className="flex items-center gap-1.5 text-[12px] font-bold text-black/60 hover:text-black transition">
                <Store className="h-3.5 w-3.5" />
                {profile.storeName ?? "Visit store"}
              </a>
            )}
          </div>
          {/* Message CTA (mobile-friendly, below bio) */}
          {!isOwn && (
            <button type="button" onClick={() => setShowMsg(true)}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-black text-sm font-black text-white active:scale-95 transition-transform">
              <MessageCircle className="h-4 w-4" /> Message {displayName}
            </button>
          )}
          {isOwn && (
            <a href="/seller/dashboard"
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-black/10 text-sm font-black text-black active:scale-95 transition-transform">
              Edit profile
            </a>
          )}
        </div>
      )}

      {/* Grid */}
      <main className="pb-16">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center px-8">
            <ImageIcon className="h-12 w-12 text-black/10" />
            <p className="text-sm font-black text-black/30">No looks yet.</p>
            <p className="text-xs font-bold text-black/20">Try on a look to start your gallery.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {items.map(item => {
              const isLiked = likes[item.id] ?? false;
              return (
                <button key={item.id} type="button"
                  onClick={() => setSelected(item)}
                  className="relative aspect-square overflow-hidden bg-black/5 active:opacity-80 transition-opacity">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.imageUrl} alt={item.lookName} className="h-full w-full object-cover object-top" />
                  {isLiked && (
                    <div className="absolute top-1.5 right-1.5 grid h-5 w-5 place-items-center rounded-full bg-red-500/90">
                      <Heart className="h-2.5 w-2.5 fill-white stroke-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </main>

      {/* Detail sheet */}
      {selected && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="flex items-center gap-3 border-b border-black/10 px-4 py-3">
            <button type="button" onClick={() => setSelected(null)}
              className="grid h-9 w-9 place-items-center rounded-full border border-black/10 text-black">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-black text-black">{selected.lookName}</p>
              {selected.storeName && <p className="truncate text-[10px] font-bold text-black/40">{selected.storeName}</p>}
            </div>
            <button type="button" onClick={() => router.push(`/look/${selected.lookId}`)}
              className="flex h-9 items-center gap-1.5 rounded-full bg-black px-3 text-xs font-black text-white active:opacity-80">
              Try it
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain p-4">
            <div className="grid grid-cols-2 gap-3">
              {selected.userPhotoUrl && (
                <div className="grid gap-1">
                  <div className="aspect-[3/4] overflow-hidden rounded-xl border border-black/10 bg-black/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selected.userPhotoUrl} alt="Before" className="h-full w-full object-cover object-top" />
                  </div>
                  <p className="text-center text-[10px] font-bold text-black/40">Before</p>
                </div>
              )}
              <div className={`grid gap-1 ${!selected.userPhotoUrl ? "col-span-2" : ""}`}>
                <div className="aspect-[3/4] overflow-hidden rounded-xl border border-black/10 bg-black/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selected.imageUrl} alt="After" className="h-full w-full object-cover object-top" />
                </div>
                <p className="text-center text-[10px] font-bold text-black/40">After</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button type="button" onClick={() => toggleLike(selected.id)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-black transition active:scale-95 ${
                  (likes[selected.id] ?? false) ? "bg-red-50 text-red-500" : "bg-black/5 text-black/50"
                }`}>
                <Heart className={`h-4 w-4 ${(likes[selected.id] ?? false) ? "fill-red-500 stroke-red-500" : ""}`} />
                <span>{fmtN(genLikes(selected.id) + ((likes[selected.id] ?? false) ? 1 : 0))}</span>
              </button>
              <span className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-black/30 pointer-events-none select-none">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
                <span>{fmtN(genViews(selected.id))}</span>
              </span>
              <button type="button"
                onClick={async () => {
                  const url = `${window.location.origin}/look/${selected.lookId}`;
                  if (navigator.share) { try { await navigator.share({ title: selected.lookName, url }); } catch { /**/ } }
                  else { try { await navigator.clipboard.writeText(url); } catch { /**/ } }
                }}
                className="ml-auto flex items-center gap-1.5 rounded-full bg-black/5 px-4 py-2 text-sm font-black text-black/50 active:scale-95 transition">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message modal */}
      {showMsg && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm px-4 pb-6">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl overflow-y-auto overscroll-contain" style={{ maxHeight: "90dvh" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black text-black">Message {displayName}</h2>
              <button type="button" onClick={() => { setShowMsg(false); setSent(false); setMsgErr(""); }}
                className="grid h-8 w-8 place-items-center rounded-full bg-black/5 text-black/50 hover:bg-black/10 transition">
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
                <a href="/stores?panel=account"
                  className="flex h-11 items-center justify-center rounded-xl bg-black text-sm font-black text-white">Sign in</a>
              </div>
            ) : (
              <div className="grid gap-3">
                <textarea value={msgText} onChange={e => setMsgText(e.target.value)}
                  placeholder={`Write to ${displayName}…`} rows={4} maxLength={1000}
                  className="w-full rounded-xl border border-black/10 bg-black/[0.03] px-4 py-3 text-sm font-bold text-black placeholder:text-black/30 outline-none focus:border-black resize-none" />
                {msgErr && <p className="text-xs font-bold text-red-500">{msgErr}</p>}
                <button type="button" onClick={() => void handleSendMessage()} disabled={sending || !msgText.trim()}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-black text-sm font-black text-white disabled:opacity-40 active:scale-95 transition-transform">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Send</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
