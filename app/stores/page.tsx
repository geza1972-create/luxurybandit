"use client";

export const dynamic = "force-dynamic";

import {
  getStoredAuthSession,
  resetPassword,
  signInWithPassword,
  signOut,
  signUpWithPassword,
} from "@/lib/supabase-auth-client";
import { Instagram, Loader2, LogOut, Search, ShoppingBag, Sparkles, User, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Look = {
  id: string;
  name: string;
  storeName?: string;
  storeSlug?: string;
  price?: string;
  salePrice?: string;
  discountLabel?: string;
  inStock?: boolean;
  imageUrl: string;
  frontImageUrl?: string;
  galleryImageUrls?: string[];
};

type Payload = {
  looks?: Look[];
  stores?: { name: string; slug: string }[];
  error?: string;
};

// ── User panel ───────────────────────────────────────────────────────────────
function UserPanel({ onClose }: { onClose: () => void }) {
  const [session, setSession] = useState(() => {
    try { return getStoredAuthSession(); } catch { return null; }
  });
  const [tab, setTab] = useState<"signin" | "register" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [credits, setCredits] = useState<number | null>(null);

  // Load credits when signed in
  useEffect(() => {
    if (!session) return;
    fetch("/api/gallery", {
      headers: { "x-shopcut-account-id": `user-${session.user.id}` }
    })
      .then(r => r.json())
      .then((p: any) => { if (typeof p.credits === "number") setCredits(p.credits); })
      .catch(() => {});
  }, [session]);

  const handle = async (action: "signin" | "register" | "forgot") => {
    setError(""); setMessage(""); setLoading(true);
    try {
      if (action === "signin") {
        const s = await signInWithPassword(email.trim(), password);
        setSession(s);
      } else if (action === "register") {
        await signUpWithPassword(email.trim(), password);
        setMessage("Account created! Check your email to confirm, then sign in.");
        setTab("signin");
      } else {
        await resetPassword(email.trim());
        setMessage("If this email exists, you'll get a reset link shortly.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => { signOut(); setSession(null); setCredits(null); };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-t-2xl bg-white px-5 pt-5 pb-safe-bottom pb-8 shadow-2xl">

        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-black text-ink">
            {session ? "Your account" : tab === "signin" ? "Sign in" : tab === "register" ? "Create account" : "Reset password"}
          </h2>
          <button type="button" onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full border border-black/10 text-ink/40">
            <X className="h-4 w-4" />
          </button>
        </div>

        {session ? (
          /* ── Signed-in view ── */
          <div className="grid gap-4">
            <div className="flex items-center gap-3 rounded-xl border border-black/8 bg-black/[0.02] p-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-white text-sm font-black">
                {session.user.email?.[0]?.toUpperCase() ?? "U"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-ink">{session.user.email}</p>
                <p className="text-[11px] font-bold text-ink/40">Buyer account</p>
              </div>
            </div>

            {/* Credits + buy */}
            <div className="grid gap-2 rounded-xl border border-black/8 bg-black/[0.02] px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-cobalt" />
                  <span className="text-sm font-black text-ink">Try-on credits</span>
                </div>
                <span className="text-sm font-black text-ink">
                  {credits === null ? "—" : credits}
                </span>
              </div>
              <a
                href={`https://buy.stripe.com/test_6oUcMX9ktesv3SE4xZ8Vi00?client_reference_id=${encodeURIComponent(`user-${session.user.id}`)}&prefilled_email=${encodeURIComponent(session.user.email ?? "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 items-center justify-center gap-2 rounded-lg bg-cobalt text-xs font-black text-white"
              >
                <Sparkles className="h-3.5 w-3.5" /> Buy 10 credits
              </a>
            </div>

            {/* Links */}
            <a href="/seller/dashboard"
              className="flex h-11 items-center justify-center rounded-xl border border-black/10 bg-white text-sm font-black text-ink">
              Seller dashboard →
            </a>

            <button type="button" onClick={handleSignOut}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white text-sm font-black text-ink/50 hover:text-coral transition">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        ) : (
          /* ── Auth forms ── */
          <div className="grid gap-4">
            {/* Tab switcher */}
            {tab !== "forgot" && (
              <div className="grid grid-cols-2 gap-1 rounded-xl border border-black/8 bg-black/[0.03] p-1">
                {(["signin", "register"] as const).map(t => (
                  <button key={t} type="button" onClick={() => { setTab(t); setError(""); setMessage(""); }}
                    className={`h-9 rounded-lg text-xs font-black transition ${tab === t ? "bg-white text-ink shadow-sm" : "text-ink/40"}`}>
                    {t === "signin" ? "Sign in" : "Register"}
                  </button>
                ))}
              </div>
            )}

            {error && <p className="rounded-xl border border-coral/25 bg-coral/10 px-4 py-3 text-xs font-black text-coral">{error}</p>}
            {message && <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-xs font-black text-green-700">{message}</p>}

            <div className="grid gap-3">
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
                className="h-12 rounded-xl border border-black/10 bg-black/[0.02] px-4 text-sm font-bold outline-none focus:border-cobalt" />
              {tab !== "forgot" && (
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") void handle(tab); }}
                  className="h-12 rounded-xl border border-black/10 bg-black/[0.02] px-4 text-sm font-bold outline-none focus:border-cobalt" />
              )}
            </div>

            <button type="button"
              disabled={loading || !email.trim() || (tab !== "forgot" && !password)}
              onClick={() => void handle(tab)}
              className="flex h-13 items-center justify-center rounded-xl bg-ink py-3.5 text-sm font-black text-white disabled:opacity-40">
              {loading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : tab === "signin" ? "Sign in"
                : tab === "register" ? "Create account"
                : "Send reset link"}
            </button>

            <div className="flex items-center justify-between">
              {tab !== "forgot" && (
                <p className="text-[11px] font-bold text-ink/35">
                  {tab === "signin" ? "No account? " : "Have an account? "}
                  <button type="button" onClick={() => { setTab(tab === "signin" ? "register" : "signin"); setError(""); setMessage(""); }}
                    className="font-black text-cobalt underline underline-offset-2">
                    {tab === "signin" ? "Register" : "Sign in"}
                  </button>
                </p>
              )}
              <button type="button"
                onClick={() => { setTab(tab === "forgot" ? "signin" : "forgot"); setError(""); setMessage(""); }}
                className="ml-auto text-[11px] font-black text-ink/35 underline underline-offset-2">
                {tab === "forgot" ? "← Back to sign in" : "Forgot password?"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function StoresPage() {
  const router = useRouter();
  const [looks, setLooks] = useState<Look[]>([]);
  const [stores, setStores] = useState<{ name: string; slug: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [showUserPanel, setShowUserPanel] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    try {
      const list = JSON.parse(localStorage.getItem("lb_following") ?? "[]") as string[];
      setFollowed(new Set(list));
    } catch { /**/ }

    // Check auth state
    try { setIsSignedIn(!!getStoredAuthSession()); } catch { /**/ }
    const onAuth = () => { try { setIsSignedIn(!!getStoredAuthSession()); } catch { /**/ } };
    window.addEventListener("luxurybandit-auth-updated", onAuth);
    return () => window.removeEventListener("luxurybandit-auth-updated", onAuth);
  }, []);

  const toggleFollow = (slug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFollowed((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      try { localStorage.setItem("lb_following", JSON.stringify([...next])); } catch { /**/ }
      return next;
    });
  };

  useEffect(() => {
    fetch("/api/try-this-look")
      .then((r) => r.json())
      .then((payload: Payload) => {
        setLooks(payload.looks ?? []);
        setStores(payload.stores ?? []);
      })
      .catch(() => setError("Could not load listings."))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return looks;
    return looks.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.storeName ?? "").toLowerCase().includes(q) ||
        (l.storeSlug ?? "").toLowerCase().includes(q) ||
        (l.price ?? "").toLowerCase().includes(q) ||
        (l.discountLabel ?? "").toLowerCase().includes(q) ||
        ((l as any).hashtags ?? "").toLowerCase().includes(q) ||
        ((l as any).productNote ?? "").toLowerCase().includes(q)
    );
  }, [looks, query]);

  return (
    <div className="min-h-screen bg-white">

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-black/8 bg-white/95 backdrop-blur">

        {/* Brand row */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-white text-sm font-black tracking-tight select-none">
              LB
            </div>
            <div>
              <div className="text-sm font-black uppercase tracking-widest text-black leading-none">LuxuryBandit</div>
              <div className="text-[11px] font-bold text-black/40 mt-0.5">Vintage &amp; Luxury C2C Fashion</div>
            </div>
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-2">
            <a href="https://instagram.com/luxurybandit" target="_blank" rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-black/12 bg-black/4 text-black/50 hover:text-black transition"
              aria-label="Instagram">
              <Instagram className="h-4 w-4" />
            </a>

            {/* User account button */}
            <button type="button" onClick={() => setShowUserPanel(true)}
              className={`relative flex h-9 w-9 items-center justify-center rounded-full border transition ${
                isSignedIn
                  ? "border-cobalt bg-cobalt text-white"
                  : "border-black/12 bg-black/4 text-black/50 hover:text-black"
              }`}
              aria-label="Account">
              <User className="h-4 w-4" />
              {isSignedIn && (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500" />
              )}
            </button>
          </div>
        </div>

        {/* Stats row */}
        {!isLoading && (
          <div className="flex gap-6 px-4 pb-3">
            <div className="text-center">
              <div className="text-sm font-black text-black leading-none">{looks.length}</div>
              <div className="text-[10px] font-bold text-black/35 mt-0.5">listings</div>
            </div>
            {stores.length > 0 && (
              <div className="text-center">
                <div className="text-sm font-black text-black leading-none">{stores.length}</div>
                <div className="text-[10px] font-bold text-black/35 mt-0.5">seller{stores.length !== 1 ? "s" : ""}</div>
              </div>
            )}
            <div className="text-center">
              <div className="text-sm font-black text-black leading-none">{looks.filter(l => l.inStock !== false).length}</div>
              <div className="text-[10px] font-bold text-black/35 mt-0.5">available</div>
            </div>
          </div>
        )}

        {/* Search bar */}
        <div className="px-3 pb-3">
          <div className="flex items-center gap-2 rounded-full bg-black/6 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-black/35" />
            <input
              type="search"
              placeholder="Search style, seller, item…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm font-bold text-black placeholder:text-black/35 outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="shrink-0">
                <X className="h-4 w-4 text-black/40" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="pb-24">
        {isLoading && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-black/30" />
          </div>
        )}

        {error && (
          <p className="p-4 text-center text-sm font-bold text-red-500">{error}</p>
        )}

        {!isLoading && !error && looks.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-24 text-center px-6">
            <ShoppingBag className="h-10 w-10 text-black/15" />
            <p className="text-sm font-black text-black/40">No listings yet — check back soon.</p>
          </div>
        )}

        {!isLoading && looks.length > 0 && (
          <>
            {query && (
              <p className="px-3 py-2 text-xs font-bold text-black/30">
                {filtered.length} of {looks.length} results for &ldquo;{query}&rdquo;
              </p>
            )}

            {filtered.length === 0 && query && (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <span className="text-3xl">🔍</span>
                <p className="text-sm font-black text-black/40">Nothing found for &ldquo;{query}&rdquo;</p>
              </div>
            )}

            {/* 3-col grid */}
            <div className="grid grid-cols-3 gap-0.5">
              {filtered.map((look) => {
                const thumb = look.frontImageUrl ?? look.imageUrl;
                const isSoldOut = look.inStock === false;
                return (
                  <button
                    key={look.id}
                    type="button"
                    onClick={() => router.push(`/look/${look.id}`)}
                    className="relative aspect-square overflow-hidden bg-black/5 active:opacity-80 transition-opacity"
                  >
                    {thumb ? (
                      <Image
                        src={thumb}
                        alt={look.name}
                        fill
                        sizes="(max-width: 768px) 33vw, 170px"
                        className="object-cover object-top"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl">🛍️</div>
                    )}

                    {/* Bottom bar */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-1.5 pb-1.5 pt-6">
                      {(look.salePrice ?? look.price) && (
                        <p className="mb-1 truncate text-[10px] font-black text-white/80">
                          {look.salePrice ?? look.price}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5">
                        <button type="button"
                          onClick={(e) => { e.stopPropagation(); if (look.storeSlug) router.push(`/store/${look.storeSlug}`); }}
                          className="flex h-5 w-5 shrink-0 overflow-hidden rounded-full bg-white shadow">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(look.storeSlug ?? "default")}&backgroundColor=ffffff&color=000000`}
                            alt="" className="h-full w-full object-cover" />
                        </button>
                        <span className="min-w-0 flex-1 truncate text-[10px] font-black text-white">
                          {look.storeName ?? look.storeSlug ?? ""}
                        </span>
                        {look.storeSlug && (
                          <button type="button" onClick={(e) => toggleFollow(look.storeSlug!, e)}
                            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-black transition ${
                              followed.has(look.storeSlug) ? "bg-white/20 text-white/60" : "bg-white text-black"
                            }`}>
                            {followed.has(look.storeSlug) ? "✓" : "Follow"}
                          </button>
                        )}
                      </div>
                    </div>

                    {isSoldOut && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <span className="rounded bg-white px-2 py-1 text-[10px] font-black uppercase tracking-widest text-black">Sold</span>
                      </div>
                    )}

                    {look.discountLabel && !isSoldOut && (
                      <div className="absolute right-1 top-1 rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-black text-white">
                        {look.discountLabel}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* Bottom CTA */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-black/8 bg-white/95 px-4 py-3 backdrop-blur">
        <p className="text-center text-[11px] font-bold text-black/35">
          Selling vintage &amp; luxury?{" "}
          <a href="/seller/register" className="font-black text-black underline underline-offset-2">
            Start selling →
          </a>
        </p>
      </div>

      {/* User panel */}
      {showUserPanel && <UserPanel onClose={() => setShowUserPanel(false)} />}
    </div>
  );
}
