"use client";

import { Globe, Instagram, MessageCircle, Loader2, X, Send, Store } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";
import { useScrollLock } from "@/lib/use-scroll-lock";

type ProfileData = {
  userId: string;
  username: string;
  displayName: string;
  bio?: string;
  website?: string;
  instagram?: string;
  avatarUrl?: string;
  storeSlug?: string;
  storeName?: string;
};

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [showMsg, setShowMsg] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [msgErr, setMsgErr] = useState("");

  // Lock body scroll when message modal is open (iOS fix)
  useEffect(() => {
    if (!showMsg) return;
    const y = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${y}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overscrollBehavior = "";
      window.scrollTo(0, y);
    };
  }, [showMsg]);

  const session = getStoredAuthSession();

  useEffect(() => {
    if (!username) return;
    fetch(`/api/profile/${encodeURIComponent(username)}`)
      .then(r => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then((p: ProfileData) => setProfile(p))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [username]);

  const handleSendMessage = async () => {
    if (!session) { router.push(`/stores?panel=account`); return; }
    if (!msgText.trim()) return;
    setSending(true); setMsgErr("");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ toUsername: username, text: msgText.trim() }),
      });
      const p = await res.json();
      if (!res.ok) throw new Error(p.error ?? "Could not send message.");
      setSent(true);
      setMsgText("");
      setTimeout(() => { setShowMsg(false); setSent(false); }, 2000);
    } catch (e) {
      setMsgErr(e instanceof Error ? e.message : "Error sending.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-black/30" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-lg font-black text-black">Profile not found</p>
        <a href="/stores" className="text-sm font-bold text-black/50 underline underline-offset-2">Back to home</a>
      </div>
    );
  }

  const initial = (profile.displayName || profile.username || "?")[0].toUpperCase();
  const isOwn = session?.user.id === profile.userId;

  return (
    <div className="min-h-screen bg-[#fafaf8]">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-black/8 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center">
          <a href="/" className="grid h-8 w-8 place-items-center rounded-full border border-black/10 text-black/40 mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m15 18-6-6 6-6"/></svg>
          </a>
          <span className="text-sm font-black text-black">@{profile.username}</span>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-8 grid gap-6">
        {/* Profile card */}
        <div className="flex flex-col items-center text-center gap-3">
          {/* Avatar */}
          <div className="h-24 w-24 rounded-full overflow-hidden bg-black">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt={profile.displayName} className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center text-3xl font-black text-white">{initial}</span>
            )}
          </div>

          {/* Name */}
          <div>
            <h1 className="text-xl font-black text-black">{profile.displayName || `@${profile.username}`}</h1>
            <p className="text-sm text-black/40">@{profile.username}</p>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm text-black/70 leading-relaxed max-w-xs">{profile.bio}</p>
          )}

          {/* Links */}
          {(profile.website || profile.instagram) && (
            <div className="flex items-center gap-3 flex-wrap justify-center">
              {profile.website && (
                <a href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm font-bold text-black hover:underline">
                  <Globe className="h-4 w-4 text-black/40" />
                  {profile.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              )}
              {profile.instagram && (
                <a href={`https://instagram.com/${profile.instagram.replace(/^@/, "")}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm font-bold text-black hover:underline">
                  <Instagram className="h-4 w-4 text-black/40" />
                  @{profile.instagram.replace(/^@/, "")}
                </a>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 mt-1 w-full max-w-xs">
            {!isOwn && (
              <button
                type="button"
                onClick={() => setShowMsg(true)}
                className="flex flex-1 h-11 items-center justify-center gap-2 rounded-xl bg-black text-sm font-black text-white active:scale-95 transition-transform"
              >
                <MessageCircle className="h-4 w-4" /> Message
              </button>
            )}
            {profile.storeSlug && (
              <a href={`/store/${profile.storeSlug}`}
                className="flex flex-1 h-11 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white text-sm font-black text-black active:scale-95 transition-transform">
                <Store className="h-4 w-4" /> {profile.storeName ?? "Visit store"}
              </a>
            )}
            {isOwn && (
              <a href="/seller/dashboard"
                className="flex flex-1 h-11 items-center justify-center gap-2 rounded-xl bg-black text-sm font-black text-white active:scale-95 transition-transform">
                Edit profile
              </a>
            )}
          </div>
        </div>
      </main>

      {/* Send message modal */}
      {showMsg && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm px-4 pb-6">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl overflow-y-auto overscroll-contain" style={{ maxHeight: "90dvh" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black text-black">Message @{profile.username}</h2>
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
                <p className="text-sm text-black/60">You need to be signed in to send messages.</p>
                <a href="/stores?panel=account"
                  className="flex h-11 items-center justify-center rounded-xl bg-black text-sm font-black text-white">
                  Sign in
                </a>
              </div>
            ) : (
              <div className="grid gap-3">
                <textarea
                  value={msgText}
                  onChange={e => setMsgText(e.target.value)}
                  placeholder={`Write a message to ${profile.displayName || "@" + profile.username}…`}
                  rows={4}
                  maxLength={1000}
                  className="w-full rounded-xl border border-black/10 bg-black/[0.03] px-4 py-3 text-sm font-bold text-black placeholder:text-black/30 outline-none focus:border-black resize-none"
                />
                {msgErr && <p className="text-xs font-bold text-red-500">{msgErr}</p>}
                <button type="button" onClick={handleSendMessage} disabled={sending || !msgText.trim()}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-black text-sm font-black text-white disabled:opacity-40 active:scale-95 transition-transform">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Send message</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
