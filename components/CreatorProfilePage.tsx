"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChevronLeft, Globe, Instagram, Heart, UserPlus, UserCheck, MessageCircle, X, Send,
} from "lucide-react";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";
import { lookPath } from "@/lib/look-slug";

// ─── Types ────────────────────────────────────────────────────────────────────

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

type Look = {
  id: string;
  name: string;
  price?: string;
  imageUrl?: string;
  frontImageUrl?: string;
  inStock?: boolean;
  published?: boolean;
  storeSlug?: string;
};

type TryonItem = {
  id: string;
  lookId: string;
  imageUrl: string;
  customerName: string;
  lookName: string;
  storeName: string;
  storeSlug: string;
  lookThumbUrl: string;
  createdAt: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
}

function seedInt(id: string, salt: string, min: number, max: number): number {
  let h = 0;
  const s = id + salt;
  for (let i = 0; i < s.length; i++) { h = Math.imul(31, h) + s.charCodeAt(i) | 0; }
  return min + (Math.abs(h) % (max - min + 1));
}
function fmtN(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n); }
function genLikes(id: string) { return seedInt(id, "_gl", 12, 380); }

function Initials({ name, size = 80 }: { name: string; size?: number }) {
  const parts = name.trim().split(/\s+/);
  const letters = parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
  return (
    <div
      className="rounded-full bg-black flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <span className="text-white font-black" style={{ fontSize: size * 0.35 }}>{letters}</span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreatorProfilePage({ creatorSlug }: { creatorSlug: string }) {
  const router = useRouter();
  const slug = toSlug(creatorSlug);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [looks, setLooks] = useState<Look[]>([]);
  const [tryons, setTryons] = useState<TryonItem[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<"creator" | "tryons">("creator");
  const [likedItems, setLikedItems] = useState<Record<string, boolean>>({});

  const [showMsg, setShowMsg] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [msgErr, setMsgErr] = useState("");

  const [lightbox, setLightbox] = useState<TryonItem | null>(null);

  const session = typeof window !== "undefined" ? getStoredAuthSession() : null;

  useEffect(() => {
    if (!slug) return;
    setIsLoading(true);
    setNotFound(false);

    const authHeaders: Record<string, string> = session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` } : {};

    Promise.all([
      fetch(`/api/profile/${encodeURIComponent(slug)}`).then(r => {
        if (r.status === 404) return null;
        return r.ok ? r.json() : null;
      }),
      fetch(`/api/try-this-look?username=${encodeURIComponent(slug)}`).then(r => r.ok ? r.json() : {}),
      fetch(`/api/follow?slug=${encodeURIComponent(slug)}&type=user`, { headers: authHeaders })
        .then(r => r.ok ? r.json() : { followerCount: 0, following: false }),
    ]).then(async ([prof, galleryData, followData]) => {
      const g = galleryData as { userGallery?: TryonItem[]; displayName?: string };
      const p = prof as ProfileData | null;
      if (!p && (!g.userGallery || g.userGallery.length === 0)) {
        setNotFound(true);
      } else {
        setProfile(p ?? { userId: "", username: slug, displayName: g.displayName ?? slug });
      }
      setTryons(g.userGallery ?? []);
      setFollowerCount((followData as { followerCount: number })?.followerCount ?? 0);
      setFollowing((followData as { following: boolean })?.following ?? false);

      if (p?.storeSlug) {
        const looksRes = await fetch(`/api/try-this-look?store=${encodeURIComponent(p.storeSlug)}`);
        if (looksRes.ok) {
          const ld = await looksRes.json() as { looks?: Look[] };
          setLooks((ld.looks ?? []).filter(l => l.published !== false));
        }
      }
    }).catch(() => setNotFound(true))
    .finally(() => setIsLoading(false));

    try { setLikedItems(JSON.parse(localStorage.getItem("lb_gen_likes") ?? "{}")); } catch { /**/ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const handleFollow = async () => {
    if (!session?.access_token) { router.push("/stores?panel=account"); return; }
    setFollowLoading(true);
    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ slug, type: "user", action: following ? "unfollow" : "follow" }),
      });
      if (res.ok) {
        const d = await res.json() as { followerCount: number; following: boolean };
        setFollowerCount(d.followerCount);
        setFollowing(d.following);
      }
    } catch { /**/ }
    setFollowLoading(false);
  };

  const handleSendMsg = async () => {
    if (!msgText.trim() || !session?.access_token) return;
    setSending(true);
    setMsgErr("");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ toUserId: profile?.userId, toSlug: slug, message: msgText.trim() }),
      });
      if (res.ok) { setSent(true); setMsgText(""); }
      else setMsgErr("Konnte nicht senden.");
    } catch { setMsgErr("Konnte nicht senden."); }
    setSending(false);
  };

  const toggleLike = (id: string) => {
    setLikedItems(prev => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem("lb_gen_likes", JSON.stringify(next)); } catch { /**/ }
      return next;
    });
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-black/20 border-t-black animate-spin" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-2xl font-black">Profil nicht gefunden</p>
        <button onClick={() => router.push("/stores")} className="text-sm font-bold text-black/50 underline">
          Zurück zur Startseite
        </button>
      </div>
    );
  }

  const displayName = profile.displayName || slug;

  return (
    <>
      <div className="min-h-screen bg-white" style={{ paddingBottom: "calc(3.5rem + env(safe-area-inset-bottom))" }}>

        {/* Sticky header */}
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-black/8">
          <div className="flex items-center h-12 px-3 max-w-lg mx-auto">
            <button type="button" onClick={() => router.back()}
              className="grid h-9 w-9 place-items-center rounded-full text-black/60 hover:bg-black/5 -ml-1">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="flex-1 text-center text-sm font-black text-black truncate px-2">{displayName}</span>
            <div className="w-9" />
          </div>
        </div>

        <div className="max-w-lg mx-auto">
          {/* Profile header */}
          <div className="px-5 pt-6 pb-4">
            <div className="flex items-start gap-4">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={displayName}
                  className="w-20 h-20 rounded-full object-cover shrink-0 bg-black/5" />
              ) : (
                <Initials name={displayName} size={80} />
              )}
              <div className="flex-1 pt-1">
                <div className="grid grid-cols-3 gap-1 text-center">
                  {[["Looks", looks.length], ["Tryons", tryons.length], ["Follower", fmtN(followerCount)]].map(([label, val]) => (
                    <div key={String(label)} className="flex flex-col">
                      <span className="text-lg font-black text-black leading-tight">{val}</span>
                      <span className="text-[11px] font-bold text-black/50 leading-tight">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3">
              <p className="text-sm font-black text-black">{displayName}</p>
              {profile.bio && (
                <p className="mt-1 text-[13px] font-medium text-black/70 leading-snug whitespace-pre-line">{profile.bio}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-3">
                {profile.website && (
                  <a href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[12px] font-bold text-black/60">
                    <Globe className="h-3.5 w-3.5" />
                    {profile.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </a>
                )}
                {profile.instagram && (
                  <a href={`https://instagram.com/${profile.instagram.replace(/^@/, "")}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[12px] font-bold text-black/60">
                    <Instagram className="h-3.5 w-3.5" />
                    @{profile.instagram.replace(/^@/, "")}
                  </a>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => void handleFollow()} disabled={followLoading}
                className={`flex-1 h-9 rounded-xl text-sm font-black flex items-center justify-center gap-1.5 transition
                  ${following ? "border-2 border-black/20 text-black" : "bg-black text-white"}`}>
                {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {following ? "Gefolgt" : "Folgen"}
              </button>
              <button type="button" onClick={() => { setShowMsg(true); setSent(false); setMsgErr(""); }}
                className="flex-1 h-9 rounded-xl border-2 border-black/15 text-sm font-black text-black flex items-center justify-center gap-1.5 active:bg-black/5">
                <MessageCircle className="h-4 w-4" />
                Nachricht
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div className="grid grid-cols-2 border-t border-b border-black/8">
            {(["creator", "tryons"] as const).map(tab => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                className={`py-3 text-sm font-black capitalize transition border-b-2 ${
                  activeTab === tab ? "border-black text-black" : "border-transparent text-black/35"
                }`}>
                {tab === "creator" ? "Creator" : "Tryons"}
              </button>
            ))}
          </div>

          {/* Creator tab */}
          {activeTab === "creator" && (
            looks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 px-8 text-center">
                <div className="w-14 h-14 rounded-full bg-black/5 flex items-center justify-center">
                  <span className="text-2xl">🛍️</span>
                </div>
                <p className="text-sm font-black text-black/40">Noch keine Looks veröffentlicht</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-px bg-black/8 border-t border-black/8">
                {looks.map(look => {
                  const img = look.frontImageUrl ?? look.imageUrl;
                  const liked = likedItems[look.id];
                  return (
                    <button key={look.id} type="button" onClick={() => router.push(lookPath(look.name, look.id))}
                      className="relative bg-white aspect-[3/4] overflow-hidden group">
                      {img ? (
                        <img src={img} alt={look.name} className="w-full h-full object-cover transition group-active:scale-95" />
                      ) : (
                        <div className="w-full h-full bg-black/5 flex items-center justify-center"><span className="text-3xl">👗</span></div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-2.5">
                        <p className="text-white text-[11px] font-black line-clamp-1">{look.name}</p>
                        {look.price && <p className="text-white/90 text-[11px] font-bold">{look.price}</p>}
                      </div>
                      <button type="button" onClick={e => { e.stopPropagation(); toggleLike(look.id); }}
                        className="absolute top-2 right-2 flex items-center gap-0.5">
                        <Heart className={`h-4 w-4 drop-shadow ${liked ? "fill-red-500 text-red-500" : "text-white"}`} />
                        <span className="text-white text-[10px] font-black drop-shadow">{fmtN(genLikes(look.id) + (liked ? 1 : 0))}</span>
                      </button>
                      {look.inStock === false && (
                        <div className="absolute top-2 left-2 bg-black/70 rounded-full px-2 py-0.5">
                          <span className="text-white text-[9px] font-black">Vergriffen</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )
          )}

          {/* Tryons tab */}
          {activeTab === "tryons" && (
            tryons.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 px-8 text-center">
                <div className="w-14 h-14 rounded-full bg-black/5 flex items-center justify-center">
                  <span className="text-2xl">✨</span>
                </div>
                <p className="text-sm font-black text-black/40">Noch keine Tryons geteilt</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-px bg-black/8 border-t border-black/8">
                {tryons.map(item => {
                  const liked = likedItems[item.id];
                  return (
                    <button key={item.id} type="button" onClick={() => setLightbox(item)}
                      className="relative bg-white aspect-[3/4] overflow-hidden group">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.lookName} className="w-full h-full object-cover transition group-active:scale-95" />
                      ) : (
                        <div className="w-full h-full bg-black/5 flex items-center justify-center"><span className="text-3xl">✨</span></div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-2.5">
                        <p className="text-white text-[11px] font-black line-clamp-1">{item.lookName}</p>
                        {item.storeName && <p className="text-white/70 text-[10px]">{item.storeName}</p>}
                      </div>
                      <button type="button" onClick={e => { e.stopPropagation(); toggleLike(item.id); }}
                        className="absolute top-2 right-2 flex items-center gap-0.5">
                        <Heart className={`h-4 w-4 drop-shadow ${liked ? "fill-red-500 text-red-500" : "text-white"}`} />
                        <span className="text-white text-[10px] font-black drop-shadow">{fmtN(genLikes(item.id) + (liked ? 1 : 0))}</span>
                      </button>
                    </button>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onClick={() => setLightbox(null)}>
          <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
            <p className="text-white text-sm font-black truncate pr-4">{lightbox.lookName}</p>
            <button type="button" onClick={() => setLightbox(null)}
              className="grid h-8 w-8 place-items-center rounded-full bg-white/10">
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
            <img src={lightbox.imageUrl} alt={lightbox.lookName} className="max-w-full max-h-full object-contain rounded-xl" />
          </div>
          {lightbox.storeSlug && (
            <div className="px-4 pb-6 shrink-0">
              <button type="button"
                onClick={() => { setLightbox(null); router.push(`/store/${lightbox.storeSlug}`); }}
                className="w-full h-11 rounded-xl bg-white text-black text-sm font-black">
                Im Store ansehen
              </button>
            </div>
          )}
        </div>
      )}

      {/* Message modal */}
      {showMsg && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setShowMsg(false)} />
          <div className="fixed inset-x-0 bottom-0 z-[51] rounded-t-2xl bg-white shadow-2xl px-5 pt-4"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-black">Nachricht an {displayName}</p>
              <button type="button" onClick={() => setShowMsg(false)}
                className="grid h-7 w-7 place-items-center rounded-full bg-black/5 text-black/50">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {sent ? (
              <div className="py-6 text-center">
                <p className="text-2xl mb-2">✅</p>
                <p className="text-sm font-black">Nachricht gesendet!</p>
                <button type="button" onClick={() => setShowMsg(false)} className="mt-4 text-sm font-bold text-black/40">Schließen</button>
              </div>
            ) : (
              <>
                <textarea value={msgText} onChange={e => setMsgText(e.target.value)}
                  placeholder="Schreib eine Nachricht…" rows={4}
                  className="w-full border border-black/15 rounded-xl p-3 text-sm font-medium resize-none outline-none focus:border-black transition" />
                {msgErr && <p className="text-red-500 text-xs mt-1">{msgErr}</p>}
                <button type="button" onClick={() => void handleSendMsg()}
                  disabled={sending || !msgText.trim()}
                  className="mt-3 w-full h-11 rounded-xl bg-black text-white text-sm font-black flex items-center justify-center gap-2 disabled:opacity-40">
                  <Send className="h-4 w-4" />
                  {sending ? "Wird gesendet…" : "Senden"}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
