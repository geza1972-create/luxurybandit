"use client";

import { Bookmark, Flame, Home, MessageCircle, User } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";

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

  // Hide only on admin and auth-only pages
  if (pathname.startsWith("/admin") || pathname.startsWith("/seller/login") || pathname.startsWith("/seller/register")) return null;

  const go = (tab: Tab, href: string) => {
    setActive(tab);
    router.push(href);
  };

  const btn = (tab: Tab) =>
    `flex flex-col items-center justify-center gap-[3px] transition-colors ${
      active === tab ? "text-black" : "text-black/35"
    }`;

  return (
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
        <button type="button" onClick={() => go("account", "/seller/dashboard")} className={btn("account")}>
          <User className="h-5 w-5" />
          <span className="text-[10px] font-bold">Account</span>
        </button>

      </div>
    </nav>
  );
}
