"use client";

import { Bookmark, LayoutGrid, MessageCircle, User, X, Image as ImageIcon, Settings, LogOut, Sparkles, Play } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getStoredAuthSession, signOut } from "@/lib/supabase-auth-client";

type Tab = "home" | "community" | "messages" | "account";

function getActiveTab(pathname: string): Tab {
  if (pathname === "/stores") {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("panel") === "account") return "account";
      if (params.get("tab") === "community") return "community";
    } catch { /**/ }
  }
  if (pathname === "/seller/dashboard" || pathname === "/user/myaccount" || pathname.endsWith("/myaccount")) return "account";
  if (pathname === "/user/mystore" || pathname.endsWith("/mystore")) return "account";
  if (pathname === "/messages") return "messages";
  if (pathname.startsWith("/u/") || pathname.startsWith("/profile/") || pathname === "/entdecken") return "community";
  if (pathname.startsWith("/look/") || pathname.startsWith("/store/") || pathname === "/try-this-look") return "home";
  return "home";
}

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [active, setActive] = useState<Tab>("home");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isCurator, setIsCurator] = useState(false);
  const [curatorCredits, setCuratorCredits] = useState<number | null>(null);

  useEffect(() => {
    setActive(getActiveTab(pathname));
    try {
      const c = JSON.parse(localStorage.getItem("lb_curator") ?? "{}");
      setIsCurator(!!c.id);
      if (c.id) {
        fetch(`/api/curator?me=1`, { headers: { "x-curator-id": c.id } })
          .then(r => r.ok ? r.json() : null)
          .then(d => {
            const n = typeof d?.credits === "number" ? d.credits : d?.credits?.credits;
            if (typeof n === "number") setCuratorCredits(n);
          })
          .catch(() => {});
      } else {
        setCuratorCredits(null);
      }
    } catch { setIsCurator(false); setCuratorCredits(null); }
  }, [pathname, showProfileMenu]);

  // Poll unread message count for logged-in users
  useEffect(() => {
    const fetchUnread = () => {
      const s = getStoredAuthSession();
      const curatorId = (() => {
        try { return JSON.parse(localStorage.getItem("lb_curator") ?? "{}").id ?? ""; }
        catch { return ""; }
      })();
      const headers: Record<string, string> = {};
      if (s?.access_token) headers.Authorization = `Bearer ${s.access_token}`;
      else if (curatorId) headers["x-curator-id"] = curatorId;
      else return;
      fetch("/api/messages", { headers })
        .then(r => r.ok ? r.json() : null)
        .then((p: any) => {
          if (p?.messages) {
            const count = (p.messages as { readAt?: string }[]).filter(m => !m.readAt).length;
            setUnreadMessages(count);
          }
        })
        .catch(() => {});
    };
    fetchUnread();
    const iv = setInterval(fetchUnread, 60_000);
    return () => clearInterval(iv);
  }, []);

  // Hide on admin, auth, and standalone pages
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/seller/login") ||
    pathname.startsWith("/seller/register") ||
    pathname.startsWith("/curators/apply")
  ) return null;

  const go = (tab: Tab, href: string) => {
    setActive(tab);
    router.push(href);
  };

  const btn = (tab: Tab) =>
    `flex flex-col items-center justify-center gap-[3px] transition-colors ${
      active === tab ? "text-black" : "text-black/35"
    }`;

  return (
    <>
    <nav
      className="fixed bottom-0 inset-x-0 z-50 border-t border-black/10 bg-white/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid max-w-lg grid-cols-4 h-14">

        {/* Feed + Discover — two separate tabs (no more toggle) */}
        {(() => {
          const onStores = pathname === "/stores";
          const gridView = onStores && searchParams.get("view") === "grid";
          const feedActive = onStores && !gridView;
          return (
            <>
              <button type="button" onClick={() => { setActive("home"); router.push("/stores"); }}
                className={`flex flex-col items-center justify-center gap-[3px] transition-colors ${feedActive ? "text-black" : "text-black/35"}`}>
                <Play className="h-5 w-5" />
                <span className="text-[10px] font-bold">Curator Feeds</span>
              </button>
              <button type="button" onClick={() => { setActive("home"); router.push("/stores?view=grid"); }}
                className={`flex flex-col items-center justify-center gap-[3px] transition-colors ${gridView ? "text-black" : "text-black/35"}`}>
                <LayoutGrid className="h-5 w-5" />
                <span className="text-[10px] font-bold">The A List</span>
              </button>
            </>
          );
        })()}

        {/* Messages */}
        <button
          type="button"
          onClick={() => go("messages", "/messages")}
          className={btn("messages")}
        >
          <span className="relative">
            <MessageCircle className="h-5 w-5" />
            {unreadMessages > 0 && (
              <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-black px-1 text-[9px] font-black text-white">
                {unreadMessages > 99 ? "99+" : unreadMessages}
              </span>
            )}
          </span>
          <span className="text-[10px] font-bold">Messages</span>
        </button>

        {/* Account */}
        <button type="button" onClick={() => { setActive("account"); setShowProfileMenu(true); }} className={btn("account")}>
          <span className="relative">
            <User className="h-5 w-5" />
            {curatorCredits !== null && (
              <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-black px-1 text-[9px] font-black text-white">
                {curatorCredits}
              </span>
            )}
          </span>
          <span className="text-[10px] font-bold">Account</span>
        </button>

      </div>
    </nav>

    {/* Profile menu sheet */}
    {showProfileMenu && (() => {
      const session = getStoredAuthSession();
      const meta = (session?.user as any)?.user_metadata ?? {};
      const username = meta?.username ?? meta?.full_name ?? session?.user?.email?.split("@")[0] ?? "";
      const slug = username.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      // A curator session (localStorage) counts as signed in even without a Supabase session.
      const curator = (() => { try { return JSON.parse(localStorage.getItem("lb_curator") ?? "{}"); } catch { return {}; } })();
      const signedIn = !!session || !!curator?.id;
      const displayName = (curator?.firstName || meta?.full_name || username || curator?.email?.split("@")[0] || "").trim();
      const displayEmail = curator?.email || session?.user?.email || "";

      const navigate = (href: string) => {
        setShowProfileMenu(false);
        router.push(href);
      };
      const handleSignOut = async () => {
        setShowProfileMenu(false);
        try { localStorage.removeItem("lb_curator"); } catch { /**/ }
        setIsCurator(false);
        await signOut();
        router.push("/stores");
      };

      return (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={() => setShowProfileMenu(false)} />
          {/* Sheet */}
          <div className="fixed inset-x-0 bottom-0 z-[61] rounded-t-2xl bg-white shadow-2xl"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="h-1 w-10 rounded-full bg-black/15" />
            </div>
            {/* Header — show who's signed in */}
            <div className="flex items-center gap-3 px-5 pb-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black text-sm font-black text-white">
                {(displayName || "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-black text-black">{displayName || (signedIn ? "Account" : "Not signed in")}</p>
                {signedIn ? (
                  <p className="flex items-center gap-1 truncate text-[11px] font-bold text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {curator?.id ? "Signed in as curator" : "Signed in"}{displayEmail ? ` · ${displayEmail}` : ""}
                  </p>
                ) : (
                  <p className="truncate text-[11px] font-bold text-black/40">Sign in to save & curate</p>
                )}
              </div>
              <button type="button" onClick={() => setShowProfileMenu(false)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-black/5 text-black/50">
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* Menu items */}
            <div className="grid divide-y divide-black/5">
              {/* Curator studio — the tool (sign in / register handled at the profile) */}
              <button type="button" onClick={() => navigate(isCurator ? "/studio" : "/curators/profile")}
                className="flex items-center gap-3 bg-black px-5 py-3.5 text-left active:opacity-90 transition">
                <Sparkles className="h-5 w-5 text-white shrink-0" />
                <span className="text-sm font-black text-white">Curator studio</span>
              </button>
              {/* Curator → My profile (their form data); others → generic account */}
              {isCurator ? (
                <button type="button" onClick={() => navigate("/curators/profile")}
                  className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-black/5 transition">
                  <User className="h-5 w-5 text-black/50 shrink-0" />
                  <span className="text-sm font-black text-black">My profile</span>
                </button>
              ) : (
                <button type="button" onClick={() => navigate(slug ? `/${slug}/myaccount` : "/user/myaccount")}
                  className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-black/5 transition">
                  <Settings className="h-5 w-5 text-black/50 shrink-0" />
                  <span className="text-sm font-black text-black">Account</span>
                </button>
              )}
              <button type="button" onClick={() => navigate("/stores?panel=saved")}
                className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-black/5 transition">
                <Bookmark className="h-5 w-5 text-black/50 shrink-0" />
                <span className="text-sm font-black text-black">Saved</span>
              </button>
              {/* My try ons → public profile */}
              {slug && (
                <button type="button" onClick={() => navigate(`/${slug}`)}
                  className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-black/5 transition">
                  <ImageIcon className="h-5 w-5 text-black/50 shrink-0" />
                  <span className="text-sm font-black text-black">My try ons</span>
                </button>
              )}
              {signedIn ? (
                <button type="button" onClick={() => void handleSignOut()}
                  className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-black/5 transition">
                  <LogOut className="h-5 w-5 text-red-400 shrink-0" />
                  <span className="text-sm font-black text-red-500">Abmelden</span>
                </button>
              ) : (
                <button type="button" onClick={() => navigate("/stores?panel=account")}
                  className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-black/5 transition">
                  <User className="h-5 w-5 text-black/50 shrink-0" />
                  <span className="text-sm font-black text-black">Anmelden</span>
                </button>
              )}
            </div>

            {/* Info & legal */}
            <div className="mt-4 border-t border-black/5 px-5 pt-3">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-black/30">Info &amp; legal</p>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-[12px] font-bold text-black/45">
                <button type="button" onClick={() => navigate("/curators")} className="hover:text-black">Become a curator</button>
                <button type="button" onClick={() => navigate("/about")} className="hover:text-black">About</button>
                <button type="button" onClick={() => navigate("/terms")} className="hover:text-black">Terms</button>
                <button type="button" onClick={() => navigate("/privacy")} className="hover:text-black">Privacy</button>
                <button type="button" onClick={() => navigate("/imprint")} className="hover:text-black">Imprint</button>
              </div>
            </div>
          </div>
        </>
      );
    })()}
  </>
  );
}
