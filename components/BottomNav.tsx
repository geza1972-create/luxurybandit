"use client";

import { Bookmark, Flame, Home, User } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const SHOW_ON = ["/try-this-look", "/stores", "/entdecken"];

type Tab = "home" | "community" | "saved" | "account";

function getActiveTab(pathname: string): Tab {
  if (pathname === "/stores") {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("panel") === "saved") return "saved";
      if (params.get("panel") === "account") return "account";
      if (params.get("tab") === "community") return "community";
    } catch { /**/ }
  }
  return "home";
}

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [savedCount, setSavedCount] = useState(0);
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

  if (!SHOW_ON.includes(pathname)) return null;

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
      <div className="mx-auto grid max-w-lg grid-cols-4 h-14">

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

        {/* Account */}
        <button type="button" onClick={() => go("account", "/stores?panel=account")} className={btn("account")}>
          <User className="h-5 w-5" />
          <span className="text-[10px] font-bold">Account</span>
        </button>

      </div>
    </nav>
  );
}
