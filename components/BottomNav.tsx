"use client";

import { Bookmark, Flame, Home, MessageCircle, User, X, Store, Image as ImageIcon, Settings, LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getStoredAuthSession, signOut } from "@/lib/supabase-auth-client";

type Tab = "home" | "community" | "saved" | "messages" | "account";

function getActiveTab(pathname: string): Tab {
  if (pathname === "/stores") {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("panel") === "saved") return "saved";
      if (params.get("panel") === "account") return "account";
      if (params.get("tab") === "community") return "community";
    } catch { /**/ }
  }
  if (pathname === "/seller/dashboard") return "account";
  if (pathname === "/messages") return "messages";
  if (pathname.startsWith("/u/") || pathname.startsWith("/profile/") || pathname === "/entdecken") return "community";
  if (pathname.startsWith("/look/") || pathname.startsWith("/store/") || pathname === "/try-this-look") return "home";
  return "home";
}

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [savedCount, setSavedCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [active, setActive] = useState<Tab>("home");
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    try {
      const ids = JSON.parse(localStorage.getItem("lb_bookmarks") ?? "[]") as string[];
      setSavedCount(ids.length);
    } catch { /**/ }
  }, []);

  useEffect(() => {
    setActive(getActiveTab(pathname));
  }, [pathname]);

  // Poll unread message count for logged-in users
  useEffect(() => {
    const fetchUnread = () => {
      const s = getStoredAuthSession();
      if (!s?.access_token) return;
      fetch("/api/messages", { headers: { Authorization: `Bearer ${s.access_token}` } })
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
    pathname.startsWith("/seller/register")
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
      <div className="mx-auto grid max-w-lg grid-cols-5 h-14">

        {/* Home */}
        <button type="button" onClick={() => go("home", "/stores")} className={btn("home")}>
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-bold">Home</span>
        </button>

        {/* Community */}
        <button type="button" onClick={() => go("community", "/stores?tab=community")} className={btn("community")}>
          <Flame className="h-5 w-5" />
          <span className="text-[10px] font-bold">Community</span>
        </button>

        {/* Saved */}
        <button
          type="button"
          onClick={() => go("saved", "/stores?panel=saved")}
          className={btn("saved")}
        >
          <span className="relative">
            <Bookmark className="h-5 w-5" />
            {savedCount > 0 && (
              <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-black px-1 text-[9px] font-black text-white">
                {savedCount > 99 ? "99+" : savedCount}
              </span>
            )}
          </span>
          <span className="text-[10px] font-bold">Saved</span>
        </button>

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
          <User className="h-5 w-5" />
          <span className="text-[10px] font-bold">Account</span>
        </button>

      </div>
    </nav>

    {/* Profile menu sheet */}
    {showProfileMenu && (() => {
      const session = getStoredAuthSession();
      const meta = (session?.user as any)?.user_metadata ?? {};
      const username = meta?.username ?? session?.user?.email?.split("@")[0] ?? "";
      const slug = username.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

      const navigate = (href: string) => {
        setShowProfileMenu(false);
        router.push(href);
      };
      const handleSignOut = async () => {
        setShowProfileMenu(false);
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
            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3">
              <p className="text-base font-black text-black">
                {session ? ((session.user as any).user_metadata?.full_name ?? session.user.email?.split("@")[0] ?? "Account") : "Account"}
              </p>
              <button type="button" onClick={() => setShowProfileMenu(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-black/5 text-black/50">
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* Menu items */}
            <div className="grid divide-y divide-black/5">
              <button type="button" onClick={() => slug ? navigate(`/u/${slug}`) : navigate("/stores?panel=account")}
                className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-black/5 transition">
                <Settings className="h-5 w-5 text-black/50 shrink-0" />
                <span className="text-sm font-black text-black">Account</span>
              </button>
              <button type="button" onClick={() => navigate("/stores?panel=saved")}
                className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-black/5 transition">
                <Bookmark className="h-5 w-5 text-black/50 shrink-0" />
                <span className="text-sm font-black text-black">Saved</span>
              </button>
              <button type="button" onClick={() => navigate("/seller/dashboard")}
                className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-black/5 transition">
                <Store className="h-5 w-5 text-black/50 shrink-0" />
                <span className="text-sm font-black text-black">My Store</span>
              </button>
              {slug && (
                <button type="button" onClick={() => navigate(`/u/${slug}`)}
                  className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-black/5 transition">
                  <ImageIcon className="h-5 w-5 text-black/50 shrink-0" />
                  <span className="text-sm font-black text-black">My try ons</span>
                </button>
              )}
              {session && (
                <button type="button" onClick={() => void handleSignOut()}
                  className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-black/5 transition">
                  <LogOut className="h-5 w-5 text-red-400 shrink-0" />
                  <span className="text-sm font-black text-red-500">Abmelden</span>
                </button>
              )}
              {!session && (
                <button type="button" onClick={() => navigate("/stores?panel=account")}
                  className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-black/5 transition">
                  <User className="h-5 w-5 text-black/50 shrink-0" />
                  <span className="text-sm font-black text-black">Anmelden</span>
                </button>
              )}
            </div>
          </div>
        </>
      );
    })()}
  </>
  );
}
