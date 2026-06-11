"use client";

export const dynamic = "force-dynamic";

import { ArrowLeft, ExternalLink, Image as ImageIcon, Loader2, RefreshCw, Search, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Generation = {
  id: string;
  lookId: string;
  customerName?: string;
  imagePath?: string;
  imageUrl?: string;
  createdAt: string;
  visitorId?: string;
};

type AuthUser = {
  id: string;
  email?: string;
  phone?: string;
  created_at: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
  user_metadata?: { full_name?: string; name?: string; username?: string };
};

type CommunityUser = {
  slug: string;
  displayName: string;
  count: number;
  lastAt: string;
  imageUrl?: string;
};

const ADMIN_PIN_KEY = "luxurybandit-try-look-admin-pin";

function normalizeSlug(v: string) {
  return v.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 2) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-GB");
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  return local.slice(0, 2) + "•".repeat(Math.max(0, local.length - 2)) + "@" + domain;
}

export default function AdminUsersPage() {
  const [pin, setPin] = useState("");
  const [tab, setTab] = useState<"accounts" | "community">("accounts");
  const [authUsers, setAuthUsers] = useState<AuthUser[]>([]);
  const [communityUsers, setCommunityUsers] = useState<CommunityUser[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async (adminPin = pin) => {
    setIsLoading(true);
    setError("");
    try {
      const headers: HeadersInit = adminPin ? { "x-try-look-admin-pin": adminPin } : {};

      const [authRes, genRes] = await Promise.all([
        fetch("/api/try-this-look?admin=1&authUsers=1", { headers }),
        fetch("/api/try-this-look?admin=1", { headers }),
      ]);

      const authPayload = await authRes.json();
      if (!authRes.ok) throw new Error(authPayload.error ?? "Could not load auth users.");
      setAuthUsers(authPayload.authUsers ?? []);

      const genPayload = await genRes.json();
      if (!genRes.ok) throw new Error(genPayload.error ?? "Could not load generations.");

      const generations: Generation[] = genPayload.generations ?? [];
      const map = new Map<string, CommunityUser>();
      for (const g of generations) {
        const name = (g.customerName ?? "").trim();
        if (!name || g.visitorId?.startsWith("admin-")) continue;
        const slug = normalizeSlug(name);
        if (!slug) continue;
        const existing = map.get(slug);
        if (!existing) {
          map.set(slug, { slug, displayName: name, count: 1, lastAt: g.createdAt, imageUrl: (g as any).imageUrl || undefined });
        } else {
          existing.count++;
          if (g.createdAt > existing.lastAt) {
            existing.lastAt = g.createdAt;
            if ((g as any).imageUrl) existing.imageUrl = (g as any).imageUrl;
          }
        }
      }
      setCommunityUsers(Array.from(map.values()).sort((a, b) => b.lastAt.localeCompare(a.lastAt)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const stored = window.localStorage.getItem(ADMIN_PIN_KEY) ?? "";
    setPin(stored);
    void loadData(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deleteUserData = async (slug: string) => {
    setDeleting(true);
    setMessage("");
    try {
      const res = await fetch("/api/try-this-look", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(pin ? { "x-try-look-admin-pin": pin } : {}),
        },
        body: JSON.stringify({ action: "delete-user-data", userSlug: slug }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Error.");
      setMessage(`Deleted all try-ons for "${slug}".`);
      setConfirmDelete(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error.");
    } finally {
      setDeleting(false);
    }
  };

  const q = search.trim().toLowerCase();
  const filteredAuth = q
    ? authUsers.filter(u => u.email?.toLowerCase().includes(q) || u.user_metadata?.full_name?.toLowerCase().includes(q) || u.user_metadata?.username?.toLowerCase().includes(q))
    : authUsers;
  const filteredCommunity = q
    ? communityUsers.filter(u => u.displayName.toLowerCase().includes(q) || u.slug.includes(q))
    : communityUsers;

  const totalTryOns = communityUsers.reduce((s, u) => s + u.count, 0);

  return (
    <main className="min-h-screen bg-[#fbfaf7] px-4 py-5 text-ink">
      <section className="mx-auto grid w-full max-w-4xl gap-5">

        <header className="grid gap-2">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-cobalt">LuxuryBandit Admin</div>
          <h1 className="text-5xl font-black leading-none text-ink">Users</h1>
          <p className="max-w-2xl text-sm font-bold leading-6 text-ink/60">
            Registered accounts (Supabase Auth) and community try-on users.
          </p>
          <Link href="/admin" className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-black/10 bg-white px-4 text-xs font-black text-ink shadow-soft">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
          </Link>
        </header>

        {error && <div className="rounded-md border border-coral/25 bg-coral/10 p-4 text-sm font-black text-coral">{error}</div>}
        {message && <div className="rounded-md border border-green-300 bg-green-50 p-4 text-sm font-black text-green-700">{message}</div>}

        {/* Stats */}
        {!isLoading && (
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-cobalt/30 bg-cobalt/5 px-4 py-3">
              <Users className="h-4 w-4 text-cobalt" />
              <span className="text-sm font-black text-cobalt">{authUsers.length} registered account{authUsers.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-4 py-3 shadow-soft">
              <ImageIcon className="h-4 w-4 text-ink/40" />
              <span className="text-sm font-black text-ink">{communityUsers.length} try-on users · {totalTryOns} try-ons</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-black/8 bg-black/[0.03] p-1">
          {(["accounts", "community"] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-2 text-xs font-black transition ${tab === t ? "bg-white text-ink shadow-soft" : "text-ink/40"}`}
            >
              {t === "accounts" ? `Registered accounts (${authUsers.length})` : `Try-on users (${communityUsers.length})`}
            </button>
          ))}
        </div>

        {/* Search */}
        {!isLoading && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="h-10 w-full rounded-lg border border-black/10 bg-white pl-9 pr-4 text-sm font-bold text-ink outline-none focus:border-cobalt shadow-soft"
            />
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-black/30" />
          </div>
        ) : tab === "accounts" ? (
          /* ── Registered Auth Users ── */
          filteredAuth.length === 0 ? (
            <div className="rounded-lg border border-black/10 bg-white p-8 text-center shadow-soft">
              <Users className="mx-auto h-8 w-8 text-black/20 mb-3" />
              <p className="text-sm font-black text-black/40">{search ? "No accounts match." : "No registered accounts yet."}</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredAuth.map(u => {
                const displayName = u.user_metadata?.full_name || u.user_metadata?.name || u.user_metadata?.username || u.email?.split("@")[0] || "—";
                const username = u.user_metadata?.username || normalizeSlug(u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split("@")[0] || "");
                const isConfirmed = !!u.email_confirmed_at;
                return (
                  <div key={u.id} className="flex items-center gap-4 rounded-xl border border-black/10 bg-white px-5 py-4 shadow-soft">
                    {/* Avatar */}
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-black/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(u.email ?? u.id)}&backgroundColor=ffffff&color=000000`}
                        alt={displayName}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-ink">{displayName}</span>
                        {isConfirmed ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">Verified</span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700">Unverified</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px] font-bold text-ink/40 mt-0.5">
                        <span>{u.email ? maskEmail(u.email) : "—"}</span>
                        {u.last_sign_in_at && <><span>·</span><span>Last login {timeAgo(u.last_sign_in_at)}</span></>}
                        <span>·</span><span>Joined {timeAgo(u.created_at)}</span>
                      </div>
                    </div>

                    {/* Profile link if username known */}
                    {username && (
                      <a
                        href={`/u/${username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 inline-flex h-8 items-center gap-1.5 rounded-md border border-black/10 bg-white px-3 text-[11px] font-black text-cobalt hover:bg-cobalt/5 transition"
                      >
                        Profile <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* ── Community Try-on Users ── */
          filteredCommunity.length === 0 ? (
            <div className="rounded-lg border border-black/10 bg-white p-8 text-center shadow-soft">
              <Users className="mx-auto h-8 w-8 text-black/20 mb-3" />
              <p className="text-sm font-black text-black/40">{search ? "No users match." : "No community users yet."}</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredCommunity.map(u => (
                <div key={u.slug} className="flex items-center gap-4 rounded-xl border border-black/10 bg-white px-5 py-4 shadow-soft">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-black/5">
                    {u.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.imageUrl} alt={u.displayName} className="h-full w-full object-cover object-top" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(u.slug)}&backgroundColor=ffffff&color=000000`} alt={u.displayName} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-ink">{u.displayName}</span>
                      <span className="rounded-full bg-black/6 px-2 py-0.5 text-[10px] font-black text-ink/50">
                        {u.count} try-on{u.count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-[11px] font-bold text-ink/35 mt-0.5">
                      <span>/u/{u.slug}</span>
                      <span>·</span>
                      <span>Last active {timeAgo(u.lastAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a href={`/u/${u.slug}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-black/10 bg-white px-3 text-[11px] font-black text-cobalt hover:bg-cobalt/5 transition">
                      Profile <ExternalLink className="h-3 w-3" />
                    </a>
                    {confirmDelete === u.slug ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-coral">Delete all?</span>
                        <button type="button" disabled={deleting} onClick={() => void deleteUserData(u.slug)}
                          className="h-8 rounded-lg bg-coral px-3 text-xs font-black text-white disabled:opacity-50">
                          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Yes"}
                        </button>
                        <button type="button" onClick={() => setConfirmDelete(null)}
                          className="h-8 rounded-lg border border-black/10 px-3 text-xs font-black text-ink/50">No</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setConfirmDelete(u.slug)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 text-ink/30 hover:border-coral/40 hover:text-coral transition"
                        title="Delete all try-ons">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        <div className="flex justify-end">
          <button type="button" onClick={() => void loadData()}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-black/10 bg-white px-4 text-xs font-black text-ink shadow-soft">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </section>
    </main>
  );
}
