"use client";

import { Bookmark, Home, MessageCircle, User, X, Image as ImageIcon, Settings, LogOut, Sparkles, Play, Shirt, Eye, Search, Shield, Menu, LayoutGrid, Crown, UserPlus, Film, Layers, CloudSun, ChevronDown } from "lucide-react";
import { isAdminEmail } from "@/lib/is-admin-email";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getStoredAuthSession, signOut } from "@/lib/supabase-auth-client";

// Der Try-on-Funnel im Menü: MUSS ein Kleidungsstück (Wardrobe-Garment) sein, damit
// die linke Karte das Produktbild zeigt — ein voller Look zeigt sonst das Model-Bild.
// /try lädt das Garment-Bild des Looks selbst (kein ablaufender Token nötig).
// Standard = „Renata Lingerie Set"; bei Bedarf hier eine andere Garment-ID setzen.
const TRYON_FUNNEL = "/try/look-1784191032626-70e3608b?pick=1";

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

export default function BottomNav({ forceShow = false }: { forceShow?: boolean } = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [active, setActive] = useState<Tab>("home");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isCurator, setIsCurator] = useState(false);
  const [subCount, setSubCount] = useState(0);   // how many models the user subscribed to (lb_subs)
  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem("lb_subs") || "[]"); setSubCount(Array.isArray(s) ? s.length : 0); } catch { /**/ }
    // „Wetter am Morgen" abonniert? (Gerät-Login gespeichert unter lb_wetter_sub_<modelId>)
    try { setHasWetter(Object.keys(localStorage).some(k => k.startsWith("lb_wetter_sub_"))); } catch { /**/ }
  }, []);
  const [curatorId, setCuratorId] = useState("");
  const [previewModel, setPreviewModel] = useState(false); // admin "view as her" mode
  // Admin "view as model" picker — choose any model (search + photos) and impersonate her.
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [pickerModels, setPickerModels] = useState<{ id: string; name: string; photoUrl?: string; status?: string; createdAt?: string }[]>([]);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerNewOnly, setPickerNewOnly] = useState(false);
  const [previewName, setPreviewName] = useState("");
  const [curatorCredits, setCuratorCredits] = useState<number | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [openThemen, setOpenThemen] = useState(false);   // Untermenü „Themen" auf/zu
  const [hasWetter, setHasWetter] = useState(false);     // Gerät hat ein Wetter-am-Morgen-Abo

  useEffect(() => {
    setActive(getActiveTab(pathname));
    try {
      const c = JSON.parse(localStorage.getItem("lb_curator") ?? "{}");
      setIsCurator(!!c.id);
      setCuratorId(c.id ?? "");
      setPreviewModel(!!localStorage.getItem("lb_preview_model"));
      setPreviewName(c.firstName ?? "");
      // Any session counts as signed in: Supabase login, curator, or the studio admin PIN.
      const adminPin = (() => { try { return localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { return ""; } })();
      setSignedIn(!!getStoredAuthSession() || !!c.id || !!adminPin);
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
        // Signed in via Supabase but no curator session yet? If that email belongs to
        // a curator, adopt it — so a signed-in curator isn't asked to "sign in as
        // curator" again and "Model studio" routes them to /studio (not the login).
        const email = getStoredAuthSession()?.user?.email;
        if (email) {
          fetch("/api/curator", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "signin", email }) })
            .then(r => r.ok ? r.json() : null)
            .then(d => {
              if (d?.curator?.id) {
                try { localStorage.setItem("lb_curator", JSON.stringify(d.curator)); } catch { /**/ }
                try { window.dispatchEvent(new Event("luxurybandit-auth-updated")); } catch { /**/ }
                setIsCurator(true);
                setSignedIn(true);
              }
            })
            .catch(() => {});
        }
      }
    } catch { setIsCurator(false); setCuratorCredits(null); }
  }, [pathname, showProfileMenu]);

  // Load the model list when the admin opens the "view as model" picker.
  useEffect(() => {
    if (!showModelPicker || pickerModels.length) return;
    let pin = ""; try { pin = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { /**/ }
    fetch("/api/try-this-look?models=1", { headers: pin ? { "x-try-look-admin-pin": pin } : {} })
      .then(r => r.json())
      .then(d => {
        // Show ALL models — incl. ones with no photo yet (placeholder). New (pending)
        // applicants first, then newest-created first.
        const list = (Array.isArray(d.models) ? d.models : []) as { id: string; name: string; photoUrl?: string; status?: string; createdAt?: string }[];
        const isNew = (m: { status?: string }) => m.status === "pending";
        list.sort((a, b) => (isNew(b) ? 1 : 0) - (isNew(a) ? 1 : 0) || String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
        setPickerModels(list);
      })
      .catch(() => {});
  }, [showModelPicker, pickerModels.length]);

  // Impersonate the chosen model (keeps the admin PIN so "Beenden" restores admin).
  const viewAsModel = (m: { id: string; name: string }) => {
    try {
      localStorage.setItem("lb_curator", JSON.stringify({ id: m.id, firstName: (m.name || "").split(" ")[0], email: "" }));
      localStorage.setItem("lb_preview_model", "1");
    } catch { /**/ }
    window.location.href = `/curator/${m.id}`;
  };

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

  // The feed moved Messages + Account into its TOP header; the Account icon there
  // opens this same profile sheet via a custom event (the sheet logic lives here).
  useEffect(() => {
    const open = () => setShowProfileMenu(true);
    window.addEventListener("lb-open-account", open);
    return () => window.removeEventListener("lb-open-account", open);
  }, []);

  // Suppress THIS component's floating hamburger while a shared <TopNav> is mounted
  // on the page — that bar already carries the menu button, so we'd otherwise show two.
  const [hasTopNav, setHasTopNav] = useState(false);
  useEffect(() => {
    const upd = () => setHasTopNav((((window as unknown as { __lbTopNav?: number }).__lbTopNav) ?? 0) > 0);
    window.addEventListener("lb-topnav-change", upd);
    upd();
    return () => window.removeEventListener("lb-topnav-change", upd);
  }, [pathname]);

  // Hide the NAV BAR on admin, auth, and standalone pages (unless a page explicitly
  // forces it, e.g. the Try-On funnel's unlocked/done screen). NOTE: we no longer
  // `return null` here — the Account sheet (opened via the "lb-open-account" event from
  // the feed's top header) must stay mounted, otherwise admins on the /admin-mirrored
  // feed (/admin/stores) can't open their account menu at all.
  const hideChrome = !forceShow && (
    // (Admin pages keep the bottom nav too — the admin wants to jump around from anywhere.)
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/seller/register") ||
    pathname.startsWith("/curators/apply") ||
    pathname.includes("/tryon") || // focused try-on funnel — no bottom nav (it cut off content)
    pathname.includes("/try/") ||  // new Try-On funnel (also /admin/try/*) — full-screen, no bottom nav
    pathname.includes("/chat/") || // dedicated chat page — full-screen, no bottom nav
    pathname.includes("/luxury-products") // Dupe-style funnel — its own top hamburger menu
  );

  const go = (tab: Tab, href: string) => {
    setActive(tab);
    router.push(href);
  };

  const btn = (tab: Tab) =>
    `flex flex-col items-center justify-center gap-[3px] transition-colors ${
      active === tab ? "text-black" : "text-black/35"
    }`;

  // The immersive reels feed carries its own chrome (Home icon in the right rail,
  // Follow by the name) — hide the global bottom nav THERE only. The grid/home
  // gallery (/home, or /stores?view=grid) DOES keep the nav. Mirrors the view
  // logic in app/stores/page.tsx: reel = /stores with no view/panel param.
  const spView = searchParams.get("view");
  const gridShowing = spView === "grid" || spView === "alist" || pathname.endsWith("/home");
  const reelShowing =
    (pathname === "/stores" || pathname.endsWith("/stores")) &&
    !gridShowing &&
    !searchParams.get("panel");
  const hideBar = reelShowing || pathname.startsWith("/look/");
  // The feed (/stores grid + /home) already has a hamburger in its own top header, so
  // the global floating hamburger is suppressed there to avoid two of them.
  const onFeed = pathname === "/stores" || pathname.endsWith("/stores") || pathname.endsWith("/home");

  return (
    <>
    {/* Admin "view as model" preview — floating banner on EVERY page while active.
        Exit restores the admin (clears her session + the preview flag). */}
    {previewModel && (
      <div className="lb-phone-col fixed inset-x-0 top-0 z-[200] flex items-center justify-center gap-2 bg-amber-400 px-3 py-2 text-[12px] font-black text-black">
        <Eye className="h-4 w-4" /> Viewing as model{previewName ? `: ${previewName}` : ""}
        <button type="button" onClick={() => {
          try { localStorage.removeItem("lb_curator"); localStorage.removeItem("lb_preview_model"); } catch { /**/ }
          window.location.reload();
        }} className="ml-2 rounded-full bg-black px-3 py-1 text-[11px] font-black text-amber-400 active:scale-95 transition">
          Exit
        </button>
      </div>
    )}
    {/* Floating hamburger — always shows in bottom right, except on full-screen/funnel
        pages and the feed (which has its own menu in the top header). */}
    {!hideChrome && !hideBar && !onFeed && (
      <div className="lb-phone-col pointer-events-none fixed inset-x-0 bottom-0 z-[70]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex justify-end px-4 pb-4">
          <button type="button" onClick={() => { setShowProfileMenu(!showProfileMenu); }} aria-label="Menu"
            className="pointer-events-auto grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-black/85 text-white shadow-xl backdrop-blur-md active:scale-90 transition">
            {showProfileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>
    )}

    {/* Profile menu sheet */}
    {showProfileMenu && (() => {
      const session = getStoredAuthSession();
      const meta = (session?.user as any)?.user_metadata ?? {};
      const username = meta?.username ?? meta?.full_name ?? session?.user?.email?.split("@")[0] ?? "";
      const slug = username.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      // A curator session (localStorage) counts as signed in even without a Supabase
      // session. The Studio admin PIN (entered in the studio) also counts as signed in.
      const curator = (() => { try { return JSON.parse(localStorage.getItem("lb_curator") ?? "{}"); } catch { return {}; } })();
      const adminPin = (() => { try { return localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { return ""; } })();
      const isPinAdmin = !!adminPin && !session && !curator?.id;
      const signedIn = !!session || !!curator?.id || !!adminPin;
      const displayName = (curator?.firstName || meta?.full_name || username || curator?.email?.split("@")[0] || (isPinAdmin ? "Admin" : "")).trim();
      const displayEmail = curator?.email || session?.user?.email || "";
      // Staff = admin or a creator/model. Plain members get a trimmed menu (Home · Models ·
      // My subscriptions · Account), no Looks/Wardrobe/Luxury/Saved.
      // Admin tools/content show ONLY for an admin who is NOT currently acting as a model.
      // A model (real, or an admin previewing via "View as model" → isCurator) gets a MINIMAL
      // menu: Home, My Studio, My Influencer profile, (My subscriptions), Sign out.
      const isStaff = (!!adminPin || isAdminEmail(displayEmail)) && !isCurator;

      const navigate = (href: string) => {
        setShowProfileMenu(false);
        router.push(href);
      };
      const handleSignOut = async () => {
        setShowProfileMenu(false);
        try { localStorage.removeItem("lb_curator"); } catch { /**/ }
        try { localStorage.removeItem("luxurybandit-try-look-admin-pin"); } catch { /**/ }
        setIsCurator(false);
        await signOut();
        router.push("/stores");
      };

      return (
        <>
          {/* Backdrop — opaque so the page behind never shows through (no "doubled" look). */}
          <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md" onClick={() => setShowProfileMenu(false)} />
          {/* Drawer — a side panel sliding in from the right (dark). On phones it's ~82%
              (a dimmed strip stays on the left to tap-close). On desktop, lb-phone-col
              pins it inside the 440px phone frame instead of the far window edge. */}
          <div className="lb-phone-col fixed right-0 top-0 z-[61] flex h-full w-[82%] max-w-xs flex-col overflow-y-auto bg-[#111] pt-5 shadow-2xl animate-[slideIn_0.2s_ease-out]"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
            {/* Header — show who's signed in */}
            <div className="flex items-center gap-3 px-5 pb-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-black text-white">
                {(displayName || "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-black text-white">{displayName || (signedIn ? "Account" : "Not signed in")}</p>
                {signedIn ? (
                  <p className="flex items-center gap-1 truncate text-[11px] font-bold text-amber-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    {curator?.id ? "Signed in as model" : isPinAdmin ? "Admin (PIN)" : "Signed in"}{displayEmail ? ` · ${displayEmail}` : ""}
                  </p>
                ) : (
                  <p className="truncate text-[11px] font-bold text-white/80">Sign in to save & curate</p>
                )}
              </div>
              <button type="button" onClick={() => setShowProfileMenu(false)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-white/80">
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* Menu items */}
            <div className="grid divide-y divide-white/10">
              {/* Home — moved here from the old white bottom bar. (Try-Ons lives below as a
                  single sign-in-gated entry; showing it logged-out made no sense.) */}
              <button type="button" onClick={() => navigate("/stores?view=models")}
                className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-white/[0.06] transition">
                <Home className="h-5 w-5 shrink-0 text-white/85" />
                <span className="text-sm font-black text-white">Home</span>
              </button>
              {/* Themen — aufklappbares Untermenü (Staff), WEIT OBEN. Bündelt die abonnierbaren
                  Themen-Werkzeuge. Erstes: „Wetter am Morgen" → /wetter/bella?admin=1. */}
              {isStaff && (
                <div>
                  <button type="button" onClick={() => setOpenThemen(v => !v)}
                    className="flex w-full items-center gap-3 px-5 py-3.5 text-left active:bg-white/[0.06] transition">
                    <Layers className="h-5 w-5 shrink-0 text-amber-400" />
                    <span className="text-sm font-black text-white">Themen</span>
                    <ChevronDown className={`ml-auto h-4 w-4 text-white/50 transition-transform ${openThemen ? "rotate-180" : ""}`} />
                  </button>
                  {openThemen && (
                    <div className="bg-black/25">
                      <button type="button" onClick={() => navigate("/wetter/bella?admin=1")}
                        className="flex w-full items-center gap-3 py-3 pl-14 pr-5 text-left active:bg-white/[0.06] transition">
                        <CloudSun className="h-5 w-5 shrink-0 text-amber-400" />
                        <span className="text-sm font-bold text-white">Wetter am Morgen</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
              {/* Meine Morgennachricht — Shortcut zur persönlichen Wetter-am-Morgen-Ansicht,
                  sichtbar sobald das Gerät angemeldet ist (loggt über den gespeicherten Login ein). */}
              {hasWetter && (
                <button type="button" onClick={() => navigate("/wetter/bella")}
                  className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-white/[0.06] transition">
                  <CloudSun className="h-5 w-5 shrink-0 text-amber-400" />
                  <span className="text-sm font-black text-white">Meine Morgennachricht</span>
                </button>
              )}
              {/* Reels — the swipeable video/story feed. Not for a model (her Home covers her needs). */}
              {!isCurator && (
                <button type="button" onClick={() => navigate("/stores?view=feeds")}
                  className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-white/[0.06] transition">
                  <Play className="h-5 w-5 shrink-0 text-white/85" />
                  <span className="text-sm font-black text-white">Reels</span>
                </button>
              )}
              {/* Explore group — STAFF only (admin/creator). Members get a clean menu:
                  just Home, Models, My subscriptions, Account. */}
              {isStaff && (<>
              <button type="button" onClick={() => navigate("/stores")}
                className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-white/[0.06] transition">
                <Play className="h-5 w-5 shrink-0 text-white/85" />
                <span className="text-sm font-black text-white">Looks Feeds</span>
              </button>
              <button type="button" onClick={() => navigate("/stores?view=grid")}
                className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-white/[0.06] transition">
                <ImageIcon className="h-5 w-5 shrink-0 text-white/85" />
                <span className="text-sm font-black text-white">Looks - Gallery</span>
              </button>
              </>)}
              {/* Members browse models; a model doesn't need it — her Home already opens the models page. */}
              {!isCurator && (
                <button type="button" onClick={() => navigate("/stores?view=models")}
                  className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-white/[0.06] transition">
                  <User className="h-5 w-5 shrink-0 text-white/85" />
                  <span className="text-sm font-black text-white">Models</span>
                </button>
              )}
              {/* Try on — DER Funnel: ein Kleidungsstück auf ein Model + Video. Führt direkt
                  in die Try-on-Seite (die das Garment des Looks selbst lädt, kein Token nötig). */}
              {!isCurator && (
                <button type="button" onClick={() => navigate(TRYON_FUNNEL)}
                  className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-white/[0.06] transition">
                  <Play className="h-5 w-5 shrink-0 text-[#c9a23f]" fill="currentColor" />
                  <span className="text-sm font-black text-white">Try on</span>
                </button>
              )}
              {/* Wardrobe — die Kleider-Galerie, jetzt für alle sichtbar (nicht mehr nur Staff). */}
              {!isCurator && (
                <button type="button" onClick={() => navigate("/wardrobe")}
                  className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-white/[0.06] transition">
                  <Shirt className="h-5 w-5 shrink-0 text-[#b8912f]" />
                  <span className="text-sm font-black text-white">Wardrobe</span>
                </button>
              )}
              {/* Models Wanted — recruiting CTA → the indexable recruiting landing (it explains the
                  deal, then CTAs into the free application form). Also gives that SEO page a real
                  internal link from every screen, so Google can discover and rank it. */}
              {!isCurator && (
                <button type="button" onClick={() => navigate("/models-wanted")}
                  className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-white/[0.06] transition">
                  <UserPlus className="h-5 w-5 shrink-0 text-amber-400" />
                  <span className="text-sm font-black text-white">Models Wanted</span>
                </button>
              )}
              {/* Găsește-l mai ieftin — the Dupe-style price-finder funnel (staff only in the trimmed member menu). */}
              {isStaff && (
              <button type="button" onClick={() => navigate("/luxury-products")}
                className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-white/[0.06] transition">
                <Search className="h-5 w-5 shrink-0 text-[#b8912f]" />
                <span className="text-sm font-black text-white">Luxury Products</span>
              </button>
              )}
              {/* Admin: jump straight to the admin dashboard (no need to type /admin). */}
              {isStaff && (
                <button type="button" onClick={() => navigate("/admin")}
                  className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-white/[0.06] transition">
                  <Shield className="h-5 w-5 shrink-0 text-violet-400" />
                  <span className="text-sm font-black text-white">Admin dashboard</span>
                </button>
              )}
              {/* Admin: Card Studio — post photos/videos + stories to Bella's card. */}
              {isStaff && (
                <button type="button" onClick={() => navigate("/card-studio")}
                  className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-white/[0.06] transition">
                  <LayoutGrid className="h-5 w-5 shrink-0 text-amber-400" />
                  <span className="text-sm font-black text-white">Card Studio</span>
                </button>
              )}
              {/* My Gallery — Admin: alle Videos; normaler User: seine eigenen Try-ons. Vollbild + Download. */}
              {signedIn && (
                <button type="button" onClick={() => navigate("/my-gallery")}
                  className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-white/[0.06] transition">
                  <Film className="h-5 w-5 shrink-0 text-amber-400" />
                  <span className="text-sm font-black text-white">My Gallery</span>
                </button>
              )}
              {/* Admin: view/act AS any model (impersonate) — picker with search + photos. */}
              {!!adminPin && !isCurator && (
                <button type="button" onClick={() => { setShowProfileMenu(false); setPickerQuery(""); setShowModelPicker(true); }}
                  className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-white/[0.06] transition">
                  <Eye className="h-5 w-5 shrink-0 text-white/85" />
                  <span className="text-sm font-black text-white">View as model…</span>
                </button>
              )}
              {/* Real model: her own simple upload studio — post photos/videos, public or private. */}
              {isCurator && (
                <button type="button" onClick={() => navigate("/my-studio")}
                  className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-white/[0.06] transition">
                  <ImageIcon className="h-5 w-5 shrink-0 text-amber-400" />
                  <span className="text-sm font-black text-white">My Studio</span>
                </button>
              )}
              {/* Curator → her dark front-end influencer profile (all her entered data). */}
              {isCurator ? (
                <button type="button" onClick={() => navigate(curatorId ? `/curator/${curatorId}` : "/stores")}
                  className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-white/[0.06] transition">
                  <User className="h-5 w-5 text-white/85 shrink-0" />
                  <span className="text-sm font-black text-white">My Influencer profile</span>
                </button>
              ) : (
                <button type="button" onClick={() => navigate(slug ? `/${slug}/myaccount` : "/user/myaccount")}
                  className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-white/[0.06] transition">
                  <Settings className="h-5 w-5 text-white/85 shrink-0" />
                  <span className="text-sm font-black text-white">Account</span>
                </button>
              )}
              {/* My subscriptions — the models this user subscribes to (any account type). */}
              {subCount > 0 && (
                <button type="button" onClick={() => navigate("/user/subscriptions")}
                  className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-white/[0.06] transition">
                  <Crown className="h-5 w-5 shrink-0 text-amber-400" />
                  <span className="text-sm font-black text-white">My subscriptions</span>
                  <span className="ml-auto rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-black text-amber-300">{subCount}</span>
                </button>
              )}
              {signedIn && isStaff && (
                <button type="button" onClick={() => navigate("/stores?panel=saved")}
                  className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-white/[0.06] transition">
                  <Bookmark className="h-5 w-5 text-white/85 shrink-0" />
                  <span className="text-sm font-black text-white">Saved</span>
                </button>
              )}
              {/* My try ons → the account dashboard, which lists the user's try-ons
                  (bound by email, incl. funnel ones) with view/download/delete. The
                  public profile (/[slug]) only works for curators, so don't route there. */}
              {signedIn && !curator?.id && isStaff && (
                <button type="button" onClick={() => navigate("/user/tryons")}
                  className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-white/[0.06] transition">
                  <Shirt className="h-5 w-5 text-white/85 shrink-0" />
                  <span className="text-sm font-black text-white">Try-Ons</span>
                </button>
              )}
              {signedIn ? (
                <button type="button" onClick={() => void handleSignOut()}
                  className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-white/[0.06] transition">
                  <LogOut className="h-5 w-5 text-red-400 shrink-0" />
                  <span className="text-sm font-black text-red-500">Sign out</span>
                </button>
              ) : (
                <button type="button" onClick={() => navigate("/stores?panel=account")}
                  className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-white/[0.06] transition">
                  <User className="h-5 w-5 text-white/85 shrink-0" />
                  <span className="text-sm font-black text-white">Sign in</span>
                </button>
              )}
            </div>

            {/* Info & legal */}
            <div className="mt-4 border-t border-white/10 px-5 pt-3">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/50">Info &amp; legal</p>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-[12px] font-bold text-white/85">
                <button type="button" onClick={() => navigate("/contact")} className="hover:text-white">Contact</button>
                <button type="button" onClick={() => navigate("/about")} className="hover:text-white">About</button>
                <button type="button" onClick={() => navigate("/terms")} className="hover:text-white">Terms</button>
                <button type="button" onClick={() => navigate("/privacy")} className="hover:text-white">Privacy</button>
                <button type="button" onClick={() => navigate("/imprint")} className="hover:text-white">Imprint</button>
              </div>
            </div>
          </div>
        </>
      );
    })()}

    {/* Admin "view as model" picker — search + photos, tap to impersonate. */}
    {showModelPicker && (
      <>
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm" onClick={() => setShowModelPicker(false)} />
        <div className="lb-phone-col fixed inset-x-0 bottom-0 z-[71] flex max-h-[80vh] flex-col rounded-t-2xl bg-white shadow-2xl" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          <div className="flex justify-center pt-3 pb-1"><div className="h-1 w-10 rounded-full bg-black/15" /></div>
          <div className="flex items-center justify-between px-5 pb-2">
            <p className="text-base font-black text-black">View as model</p>
            <button type="button" onClick={() => setShowModelPicker(false)} className="grid h-8 w-8 place-items-center rounded-full bg-black/5 text-black/50"><X className="h-4 w-4" /></button>
          </div>
          <div className="px-5 pb-2">
            <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-black/[0.02] px-3">
              <Search className="h-4 w-4 shrink-0 text-black/30" />
              <input value={pickerQuery} onChange={e => setPickerQuery(e.target.value)} placeholder="Search models…"
                className="h-11 w-full bg-transparent text-sm font-bold text-black outline-none placeholder:text-black/30" />
            </div>
            {/* All / New (pending applicants) filter. */}
            <div className="mt-2 flex gap-1.5">
              {([["all", "All"], ["new", "🆕 New"]] as const).map(([k, label]) => (
                <button key={k} type="button" onClick={() => setPickerNewOnly(k === "new")}
                  className={`rounded-full px-3 py-1 text-[12px] font-black transition ${(pickerNewOnly ? "new" : "all") === k ? "bg-black text-white" : "bg-black/[0.06] text-black/50"}`}>{label}</button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
            {pickerModels.length === 0 ? (
              <p className="py-10 text-center text-sm font-bold text-black/30">Loading…</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {pickerModels
                  .filter(m => m.name.toLowerCase().includes(pickerQuery.trim().toLowerCase()))
                  .filter(m => !pickerNewOnly || m.status === "pending")
                  .map(m => (
                  <button key={m.id} type="button" onClick={() => viewAsModel(m)}
                    className="relative overflow-hidden rounded-xl border border-black/10 bg-black/[0.02] active:scale-95 transition">
                    <div className="relative aspect-[3/4] w-full bg-black/5">
                      {m.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.photoUrl} alt={m.name} loading="lazy" className="h-full w-full object-cover object-top" />
                      ) : (
                        <span className="grid h-full w-full place-items-center text-2xl font-black text-black/20">{(m.name || "?").slice(0, 1).toUpperCase()}</span>
                      )}
                      {m.status === "pending" && (
                        <span className="absolute left-1 top-1 rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-black text-black shadow">NEW</span>
                      )}
                    </div>
                    <span className="block truncate px-1.5 py-1 text-[11px] font-black text-black">{m.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </>
    )}
  </>
  );
}
