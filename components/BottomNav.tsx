"use client";

import { Bookmark, Home, MessageCircle, User, X, Image as ImageIcon, Settings, LogOut, Sparkles, Play, Shirt, Eye, Search, Shield, Menu, LayoutGrid, Crown, UserPlus, Film, Layers, CloudSun, Palmtree, Heart, Cake, Gift, CreditCard } from "lucide-react";
import { isAdminEmail } from "@/lib/is-admin-email";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getStoredAuthSession, signOut } from "@/lib/supabase-auth-client";
import { geraetAdresse, vergissGeraetAdresse } from "@/lib/guthaben-konto";

// Der Try-on-Funnel im Menü: MUSS ein Kleidungsstück (Wardrobe-Garment) sein, damit
// die linke Karte das Produktbild zeigt — ein voller Look zeigt sonst das Model-Bild.
// /try lädt das Garment-Bild des Looks selbst (kein ablaufender Token nötig).
// Standard = „Renata Lingerie Set"; bei Bedarf hier eine andere Garment-ID setzen.
/* Anprobe = eigenes Foto + eigenes Kleidungsstueck (Owner 27.08.2026) — nicht mehr die
   alte Model-Galerie mit Waesche-Looks und Abo. Siehe app/themes/page.tsx. */
const TRYON_FUNNEL = "/themes/tryon/start";

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

/**
 * DIE WÖRTER DES MENÜS — IN DER SPRACHE DER SEITE (Owner 28.08.2026, mit Bild eines
 * deutschen Trichters: „und hier steht not signed").
 *
 * Das Menü war komplett englisch, auf JEDER Seite des Hauses — auch auf den deutschen
 * Trichtern, die gerade den ganzen Verkehr tragen. „Not signed in" ist dort nicht nur
 * unschön: Es ist der einzige englische Satz auf einer sonst deutschen Seite, und er steht
 * ganz oben im Menü, direkt neben dem Konto.
 *
 * DIESELBE QUELLE WIE `TopNav`: der Keks `lb_lang`. Kein neuer Mechanismus, kein Prop durch
 * zwanzig Seiten — das Menü liegt global, es kann die Sprache nicht gereicht bekommen.
 *
 * WAS ABSICHTLICH ENGLISCH BLEIBT: „Funnels", „Reels", „Try on", „Assets". Das sind
 * Produktnamen des Hauses, keine Beschriftungen — der Owner nennt sie selbst auf Deutsch so
 * (26.08.2026: „wir nennen die Topics in Funnels um"). Ein übersetztes „Trichter" im Menü
 * hätte niemand wiedererkannt.
 */
const MENU_TEXTE: Record<string, {
  nichtAngemeldet: string; anmeldenHinweis: string; konto: string; anmelden: string;
  heim: string; infoLegal: string; kontakt: string; ueber: string; agb: string; datenschutz: string; impressum: string;
}> = {
  en: { nichtAngemeldet: "Not signed in", anmeldenHinweis: "Sign in to save & curate", konto: "Account", anmelden: "Sign in / My account",
        heim: "Home", infoLegal: "Info & Legal", kontakt: "Contact", ueber: "About", agb: "Terms", datenschutz: "Privacy", impressum: "Imprint" },
  de: { nichtAngemeldet: "Nicht angemeldet", anmeldenHinweis: "Melde dich an, um alles wiederzufinden", konto: "Konto", anmelden: "Anmelden / Mein Konto",
        heim: "Startseite", infoLegal: "Info & Rechtliches", kontakt: "Kontakt", ueber: "Über uns", agb: "AGB", datenschutz: "Datenschutz", impressum: "Impressum" },
  ro: { nichtAngemeldet: "Neconectat", anmeldenHinweis: "Conectează-te ca să găsești totul din nou", konto: "Cont", anmelden: "Conectare / Contul meu",
        heim: "Acasă", infoLegal: "Info & Legal", kontakt: "Contact", ueber: "Despre noi", agb: "Termeni", datenschutz: "Confidențialitate", impressum: "Impressum" },
  es: { nichtAngemeldet: "No has iniciado sesión", anmeldenHinweis: "Inicia sesión para recuperarlo todo", konto: "Cuenta", anmelden: "Iniciar sesión / Mi cuenta",
        heim: "Inicio", infoLegal: "Info y legal", kontakt: "Contacto", ueber: "Sobre nosotros", agb: "Términos", datenschutz: "Privacidad", impressum: "Aviso legal" },
  fr: { nichtAngemeldet: "Non connecté", anmeldenHinweis: "Connecte-toi pour tout retrouver", konto: "Compte", anmelden: "Se connecter / Mon compte",
        heim: "Accueil", infoLegal: "Infos & mentions", kontakt: "Contact", ueber: "À propos", agb: "CGV", datenschutz: "Confidentialité", impressum: "Mentions légales" },
  it: { nichtAngemeldet: "Non hai effettuato l'accesso", anmeldenHinweis: "Accedi per ritrovare tutto", konto: "Account", anmelden: "Accedi / Il mio account",
        heim: "Home", infoLegal: "Info e note legali", kontakt: "Contatti", ueber: "Chi siamo", agb: "Termini", datenschutz: "Privacy", impressum: "Note legali" },
  pt: { nichtAngemeldet: "Sessão não iniciada", anmeldenHinweis: "Inicia sessão para reencontrares tudo", konto: "Conta", anmelden: "Iniciar sessão / A minha conta",
        heim: "Início", infoLegal: "Info e legal", kontakt: "Contacto", ueber: "Sobre nós", agb: "Termos", datenschutz: "Privacidade", impressum: "Ficha técnica" },
};

export default function BottomNav({ forceShow = false }: { forceShow?: boolean } = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  /* Die Sprache aus demselben Keks wie in `TopNav` — Englisch steht schon da, falls kein
     Keks lesbar ist. Beim Seitenwechsel neu lesen: Der Sprachumschalter setzt den Keks und
     navigiert, das Menü lebt darüber hinweg. */
  const [menuSprache, setMenuSprache] = useState("en");
  useEffect(() => {
    try {
      const m = document.cookie.match(/(?:^|; )lb_lang=([^;]*)/);
      const l = m ? decodeURIComponent(m[1]).slice(0, 2) : "";
      if (l && MENU_TEXTE[l]) setMenuSprache(l);
    } catch { /* kein Keks lesbar: Englisch bleibt */ }
  }, [pathname]);
  const M = MENU_TEXTE[menuSprache] ?? MENU_TEXTE.en;
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
      // Auch die im Trichter bestaetigte Adresse zaehlt (Owner 03.08.2026) — siehe unten
      // bei displayName: wer seine E-Mail dagelassen hat, ist angemeldet, nicht fremd.
      // Dieselbe Quelle wie der Header-Chip — sonst sagt das Menue „fremd", waehrend oben
      // sein Konto steht (Owner 03.08.2026: auf ALLEN Topicseiten angemeldet sein).
      const kussMail0 = geraetAdresse();
      setSignedIn(!!getStoredAuthSession() || !!c.id || !!adminPin || !!kussMail0.trim());
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

  // Das Menü lebt appweit HIER unten (Floating-Hamburger) — TopNav trägt keins mehr.
  // Hide the NAV BAR on admin, auth, and standalone pages (unless a page explicitly
  // forces it, e.g. the Try-On funnel's unlocked/done screen). NOTE: we no longer
  // `return null` here — the Account sheet (opened via the "lb-open-account" event from
  // the feed's top header) must stay mounted, otherwise admins on the /admin-mirrored
  // feed (/admin/stores) can't open their account menu at all.
  // Manage-/Admin-Views (?admin=1) behalten IMMER das Menü — auch auf Pfaden, die es sonst
  // ausblenden (z. B. /themes/tryon). So haben alle Card-Tool-Seiten dasselbe Menü (CI).
  const adminView = (searchParams.get("admin") ?? "") === "1";
  const hideChrome = !forceShow && !adminView && (
    // (Admin pages keep the bottom nav too — the admin wants to jump around from anywhere.)
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/seller/register") ||
    pathname.startsWith("/curators/apply") ||
    pathname.includes("/tryon") || // focused try-on funnel — no bottom nav (it cut off content)
    pathname.includes("/try/") ||  // new Try-On funnel (also /admin/try/*) — full-screen, no bottom nav
    pathname.includes("/chat/") || // dedicated chat page — full-screen, no bottom nav
    // DAS BEWERBER-DOSSIER IST EIN EIGENER, BERUFLICHER BEREICH (Owner 22.08.2026: „Do not
    // show the Birthday, Wedding, Kiss, Gallery or other LuxuryBandit entertainment
    // navigation inside this recruiting experience."). Die Seite geht an Personalabteilungen;
    // eine Leiste mit Kuss- und Geburtstags-Themen darunter erledigt jede Bewerbung. Der
    // Kopf der Seite (`TalentKopf`) trägt stattdessen ihr eigenes Menü.
    pathname.startsWith("/lebenslauf") ||
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
  // Das echte immersive Reel = /stores OHNE view-Parameter (Standard). Alle Galerien
  // (view=models/grid/alist und /home) sind KEIN Reel und behalten das Menü unten.
  const spView = searchParams.get("view");
  const reelShowing =
    (pathname === "/stores" || pathname.endsWith("/stores")) &&
    !spView &&
    !searchParams.get("panel");
  /* KEIN HAUS-MENÜ AUF DEM BEWERBER-DOSSIER (Owner 25.08.2026: „das untere Menü raus" —
     /lebenslauf/executive und /lebenslauf/<id> sind Seiten, die an Firmen gehen; die
     Geschenk-Navigation des Hauses hat dort nichts verloren, Memory
     `serioeses-portal-umbau`. Die Besitzer-Leiste Vorschau/Bearbeiten wohnt dort selbst.)
     Die Lebenslauf-LANDINGPAGE (/lebenslauf, ohne Unterpfad) behält das Menü.
     AUCH IM ADMIN-SPIEGEL (next.config.mjs spiegelt jede Seite unter /admin/… — der Owner
     browst die Dossiers genau so, gemessen 25.08.). */
  const hideBar = reelShowing || pathname.startsWith("/look/")
    || pathname.startsWith("/lebenslauf/") || pathname.startsWith("/admin/lebenslauf/")
    /* DIE BEWERBUNGSZENTRALE — Landingpage und Trichter (Owner 25.08.2026, „Portal Seiten
       breiter machen", Lebenslauf zuerst) — sie tragen jetzt `.lb-zentrale` und brechen aus
       der 440px-Handy-Spalte aus (globals.css). Die Leiste ist eine `.lb-phone-col`-Scheibe
       und bliebe sonst als schmale Insel in der Mitte der breiten Seite stehen — dieselbe
       Entscheidung wie beim Dossier selbst (hideBar oben). */
    || pathname.startsWith("/themes/lebenslauf")
    /* Das oeffentliche UX-Portfolio (/cv/…) traegt `.lb-portfolio` und bricht ebenfalls aus
       der Handy-Spalte aus — die Leiste bliebe sonst als schmale Insel darin stehen. Es ist
       ausserdem keine Produktseite: Wer eine Bewerbung liest, soll nicht in den Shop. */
    || pathname.startsWith("/cv/");

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
    {/* Floating hamburger — THE app-wide menu, bottom right. Hidden only on
        full-screen/funnel pages and the immersive reel/look (hideBar). */}
    {!hideChrome && !hideBar && (
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
      /**
       * DIE KUSS-ADRESSE ZAEHLT ALS ANGEMELDET (Owner 03.08.2026: „in dem Moment wo ich
       * meine E-Mail eingebe, bin ich sofort angemeldet"). Wer im Trichter seine Adresse
       * bestaetigt hat, ist fuer uns kein Fremder — Guthaben, Galerie und Lieferung haengen
       * laengst daran. Ein Menue, das ihn danach „Not signed in" nennt, widerspricht der
       * ganzen Seite. Das Supabase-Konto bleibt VORRANGIG; die Kuss-Adresse ist der
       * Rueckfall fuer die grosse Mehrheit ohne Konto.
       */
      const kussMail = geraetAdresse();
      const displayName = (curator?.firstName || meta?.full_name || username || curator?.email?.split("@")[0] || (isPinAdmin ? "Admin" : "") || kussMail.split("@")[0]).trim();
      const displayEmail = curator?.email || session?.user?.email || kussMail || "";
      // Staff = admin or a creator/model. Plain members get a trimmed menu (Home ·
      // My subscriptions · Account), no Looks/Wardrobe/Luxury/Saved. „Models" raus seit
      // 11.08.2026 (Owner: „die Modelseite fliegt aus dem Menü raus") — die Modelgalerie
      // selbst bleibt erreichbar (Startseite/Karten), sie ist nur kein Menüpunkt mehr.
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
        /**
         * AUCH DIE KUSS-ADRESSE GEHT MIT RAUS (Owner 03.08.2026: „ich kann mich nicht
         * ausloggen im Menü"). Seit sie als Anmeldung zaehlt, muss Abmelden sie auch
         * loeschen — sonst steht nach dem Klick weiter „Signed in" da. Das Ereignis sagt
         * dem Guthaben-Chip im Header Bescheid, der sonst bis zum naechsten Fensterwechsel
         * den alten Stand zeigte.
         */
        vergissGeraetAdresse();   // ALLE Adress-Spuren, nicht nur die vom Kuss
        try { window.dispatchEvent(new CustomEvent("lb-abgemeldet")); } catch { /**/ }
        setIsCurator(false);
        setSignedIn(false);
        // signOut darf die Weiterleitung nie verhindern — ohne aktive Supabase-Sitzung
        // (Kuss-Adresse!) wirft es, und der Kunde bliebe auf der alten Seite stehen.
        try { await signOut(); } catch { /**/ }
        // Nach dem Abmelden auf die THEMEN-Seite (Owner 03.08.2026) — sie ist die
        // Startseite des Portals; /stores war der alte Einstieg aus der Model-Zeit.
        // Seit dem 03.08. liegt sie auf "/" selbst, nicht mehr hinter einer Weiterleitung.
        router.push("/");
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
                <p className="truncate text-base font-black text-white">{displayName || (signedIn ? M.konto : M.nichtAngemeldet)}</p>
                {/* Direkt aus der Adresse abgeleitet, nicht nur aus dem State — derselbe
                    Grund wie beim Namen darueber: Wer seine Kuss-Adresse dagelassen hat,
                    IST angemeldet (Owner 03.08.2026). */}
                {(signedIn || kussMail) ? (
                  <p className="flex items-center gap-1 truncate text-[11px] font-bold text-amber-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    {curator?.id ? "Signed in as model" : isPinAdmin ? "Admin (PIN)" : "Signed in"}{displayEmail ? ` · ${displayEmail}` : ""}
                  </p>
                ) : (
                  <p className="truncate text-[11px] font-bold text-white/80">{M.anmeldenHinweis}</p>
                )}
              </div>
            </div>
            {/* Menu items */}
            <div className="grid divide-y divide-white/10">
              {/* Home = STARTSEITE, und die sind seit 2026-07-27 die Themen. Seit dem
                  03.08.2026 liegen sie auf "/" selbst — der Menuepunkt fuehrt deshalb auf die
                  blanke Adresse, nicht mehr auf /themes. Zu den Models führt seit
                  11.08.2026 kein eigener Menüpunkt mehr (Owner: „die Modelseite fliegt aus
                  dem Menü raus") — nur noch die Karten auf der Startseite selbst. */}
              <button type="button" onClick={() => navigate("/")}
                className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-white/[0.06] transition">
                <Home className="h-5 w-5 shrink-0 text-white/85" />
                <span className="text-sm font-black text-white">{M.heim}</span>
              </button>
              {/* Themes — EIN Punkt → der Themen-Katalog. ÖFFENTLICH (jeder sieht es, auch
                  ausgeloggt) → gute interne Verlinkung für SEO. */}
              <button type="button" onClick={() => navigate("/themes")}
                className="flex w-full items-center gap-3 px-5 py-3.5 text-left active:bg-white/[0.06] transition">
                <Layers className="h-5 w-5 shrink-0 text-amber-400" />
                {/* Wort im UI ist überall „Funnels" (Route bleibt /themes) — Owner
                    26.08.2026: „wir nennen die Topics in Funnels um. Wir sind jetzt ein
                    Funnel Spezialist." Vorher „Topics", davor „Themes". Ein Ding, ein Name. */}
                <span className="text-sm font-black text-white">Funnels</span>
              </button>
              {/* Die CI-Bibliothek steht als „CI" in der Info-&-Legal-Zeile unten — immer
                  sichtbar, auch ohne Anmeldung (Owner 06.08.2026: „ich sehe die Bibliothek
                  nicht im Menü" — der Staff-Punkt hier war ohne Anmeldung unsichtbar). */}
              {/* Admin-Shortcut: Wetter-am-Morgen verwalten (?admin=1). */}
              {isStaff && (
                <button type="button" onClick={() => navigate("/themes/wetter/bella?admin=1")}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left text-white/60 active:bg-white/[0.06] transition">
                  <Shield className="h-4 w-4 shrink-0 text-violet-400" />
                  <span className="text-[13px] font-bold">Morning Weather — manage</span>
                </button>
              )}
              {/* Meine Morgennachricht — Shortcut zur persönlichen Wetter-am-Morgen-Ansicht,
                  sichtbar sobald das Gerät angemeldet ist (loggt über den gespeicherten Login ein). */}
              {hasWetter && (
                <button type="button" onClick={() => navigate("/themes/wetter/bella")}
                  className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-white/[0.06] transition">
                  <CloudSun className="h-5 w-5 shrink-0 text-amber-400" />
                  <span className="text-sm font-black text-white">My morning message</span>
                </button>
              )}
              {/* Admin-Shortcut: das BELLA-THEMA verwalten — Beispiel-Videos, Teaser-Cover und
                  die Abonnenten. Zeigte bis 29.07.2026 auf /urlaub-mit-bella; dort gibt es nur
                  noch das alte Card-Tool und ein abgeschaltetes Angebot. */}
              {isStaff && (
                <button type="button" onClick={() => navigate("/themes/bella?admin=1")}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left text-white/60 active:bg-white/[0.06] transition">
                  <Palmtree className="h-4 w-4 shrink-0 text-violet-400" />
                  <span className="text-[13px] font-bold">Bella — manage (videos, subscribers)</span>
                </button>
              )}
              {/* Try-On — die Theme-Landing mit Admin-Werkzeugen (Card-Tool + Abonnenten). */}
              {isStaff && (
                <button type="button" onClick={() => navigate("/themes/tryon?admin=1")}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left text-white/60 active:bg-white/[0.06] transition">
                  <Shirt className="h-4 w-4 shrink-0 text-violet-400" />
                  <span className="text-[13px] font-bold">Try-On — manage</span>
                </button>
              )}
              {/* Your Idol as an AI-Model — Landing mit Admin-Werkzeugen (Card-Tool + Abonnenten). */}
              {isStaff && (
                <button type="button" onClick={() => navigate("/your-idol?admin=1")}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left text-white/60 active:bg-white/[0.06] transition">
                  <Sparkles className="h-4 w-4 shrink-0 text-violet-400" />
                  <span className="text-[13px] font-bold">Your Idol — manage</span>
                </button>
              )}
              {/* Kiss any Model — Landing mit Kiss-Funnel + Admin-Werkzeugen. */}
              {isStaff && (
                <button type="button" onClick={() => navigate("/themes/kiss?admin=1")}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left text-white/60 active:bg-white/[0.06] transition">
                  <Heart className="h-4 w-4 shrink-0 text-violet-400" />
                  <span className="text-[13px] font-bold">Kiss — manage</span>
                </button>
              )}
              {/* Hochzeitskuss — dieselbe Maschine wie Kiss, andere Rollen: SIE bedient den
                  Trichter (Owner 31.07.2026: „ist das im Menü eingebunden?" — war es nicht).
                  Steht direkt hinter Kiss, weil beide dasselbe Werkzeug haben. */}
              {isStaff && (
                <button type="button" onClick={() => navigate("/themes/wedding?admin=1")}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left text-white/60 active:bg-white/[0.06] transition">
                  <Heart className="h-4 w-4 shrink-0 text-violet-400" />
                  <span className="text-[13px] font-bold">Wedding invitation — manage</span>
                </button>
              )}
              {/* Birthdays — Name eingeben, sie gratuliert, teilen (3,99 € pro Video). */}
              {isStaff && (
                <button type="button" onClick={() => navigate("/themes/birthday?admin=1")}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left text-white/60 active:bg-white/[0.06] transition">
                  <Cake className="h-4 w-4 shrink-0 text-violet-400" />
                  <span className="text-[13px] font-bold">Birthdays — manage</span>
                </button>
              )}
              {/* Future Self Program — Film + 30 Tage (9,99 €); eigene Liste seit 12.08.2026
                  (Owner: „Versprechen keine eigene Liste hat. Es läuft alles über Kiss"). */}
              {isStaff && (
                <button type="button" onClick={() => navigate("/themes/versprechen?admin=1")}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left text-white/60 active:bg-white/[0.06] transition">
                  <Film className="h-4 w-4 shrink-0 text-amber-400" />
                  <span className="text-[13px] font-bold">Future Self Program — manage</span>
                </button>
              )}
              {/* Chat with an AI girl — Chat + Anziehen (24 €/Monat, 5 Looks). */}
              {isStaff && (
                <button type="button" onClick={() => navigate("/themes/chat")}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left text-white/60 active:bg-white/[0.06] transition">
                  <MessageCircle className="h-4 w-4 shrink-0 text-sky-400" />
                  <span className="text-[13px] font-bold">Chat — open</span>
                </button>
              )}
              {/* Holiday with your dream girl — er macht die Videos selbst (25 Momente). */}
              {isStaff && (
                <button type="button" onClick={() => navigate("/themes/holiday")}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left text-white/60 active:bg-white/[0.06] transition">
                  <Palmtree className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span className="text-[13px] font-bold">Holiday — open</span>
                </button>
              )}
              {/* Surprise him — sie schickt ihm ein privates Video (3,99 €). */}
              {isStaff && (
                <button type="button" onClick={() => navigate("/themes/surprise?admin=1")}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left text-white/60 active:bg-white/[0.06] transition">
                  <Gift className="h-4 w-4 shrink-0 text-rose-400" />
                  <span className="text-[13px] font-bold">Surprise him — manage</span>
                </button>
              )}
              {/* „Das was noch kommt": weitere Themen (Luxury Looks …) leben im
                  Themes-Katalog /themes als coming-soon — hier nur die aktiven Shortcuts. */}
              {/* Reels — the swipeable video/story feed. Not for a model (her Home covers her needs). */}
              {!isCurator && (
                <button type="button" onClick={() => navigate("/stores?view=feeds")}
                  className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-white/[0.06] transition">
                  <Play className="h-5 w-5 shrink-0 text-white/85" />
                  <span className="text-sm font-black text-white">Reels</span>
                </button>
              )}
              {/* Explore group — STAFF only (admin/creator). Members get a clean menu:
                  just Home, My subscriptions, Account. */}
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
              {/* „Models" als Menüpunkt raus (Owner 11.08.2026: „die Modelseite fliegt aus
                  dem Menü raus") — Besucher UND Members sehen ihn nicht mehr. Die
                  Modelgalerie selbst lebt weiter (Karten auf der Startseite verlinken
                  dorthin), nur der Menüeintrag fällt weg. */}
              {/* Try on — DER Funnel: ein Kleidungsstück auf ein Model + Video. Führt direkt
                  in die Try-on-Seite (die das Garment des Looks selbst lädt, kein Token nötig). */}
              {!isCurator && (
                <button type="button" onClick={() => navigate(TRYON_FUNNEL)}
                  className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-white/[0.06] transition">
                  <Play className="h-5 w-5 shrink-0 text-[#f6cf51]" fill="currentColor" />
                  <span className="text-sm font-black text-white">Try on</span>
                </button>
              )}
              {/* WARDROBE IST RAUS (Owner 24.08.2026, im Zug „seriöses Portal": „da bitte
                  Wardrobe entfernen") — dieselbe Rausnahme wie Chat/Holiday/Poledance im
                  Katalog (Memory `serioeses-portal-umbau`): die Seite `/wardrobe` bleibt
                  erreichbar (alte Links), nur der Menüeintrag fällt weg. */}
              {/* My Gallery — SEINE eigenen Videos (Chat/Try-on). Haengt am Geraet und, sobald
                  angemeldet, am Konto; deshalb im Menue fuer JEDEN sichtbar (Owner 28.07.2026). */}
              <button type="button" onClick={() => navigate("/my-gallery")}
                className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-white/[0.06] transition">
                <Film className="h-5 w-5 shrink-0 text-[#f6cf51]" />
                <span className="text-sm font-black text-white">Assets</span>
              </button>
              {/**
                * „MODELS WANTED" IST FUER BESUCHER ZU (Owner 05.08.2026: „die Model-Seite kommt
                * immer wieder, wenn ich auf Back klicke … du machst die Seite fuer User dicht.
                * Die gibt es nicht mehr, nur fuer den Admin. Auch im Menue machst es raus").
                *
                * Der Eintrag stand fuer JEDEN, der kein Kurator ist — also fuer genau die
                * Kaeufer, die ein Geschenk machen wollen. Auf einem Geschenkideen-Portal ist
                * „Werde Model" kein Angebot, sondern ein Abzweig, der vom Kauf wegfuehrt.
                *
                * Nur noch fuer Personal (`isStaff`), damit der Owner selbst hinkommt, ohne die
                * Adresse zu tippen. Die Seite selbst weist Fremde ausserdem serverseitig ab —
                * ein fehlender Menuepunkt ist keine Sperre.
                */}
              {isStaff && (
                <button type="button" onClick={() => navigate("/models-wanted")}
                  className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-white/[0.06] transition">
                  <UserPlus className="h-5 w-5 shrink-0 text-[#f6cf51]" />
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
              {/* „My Gallery" stand hier ein ZWEITES Mal — einmal für alle, einmal für
                  Angemeldete, beide auf dieselbe Seite. Wer angemeldet war, sah den Eintrag
                  doppelt (Owner 30.07.2026). Der obere gilt für jeden und bleibt. */}
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
                // NICHT ANGEMELDET → direkt auf /account: dort steht die Anmeldung selbst
                // (E-Mail → Link schicken oder Passwort zurücksetzen). Vorher landete man auf
                // /user/myaccount, das nur nach /login weitergeleitet hat — für jemanden, der
                // nie ein Passwort gesetzt hat, eine Sackgasse.
                /**
                 * NICHT ANGEMELDET → DER KONTO-DIALOG, NICHT MEHR `/account` (Owner
                 * 11.08.2026: „Im Menü ist jetzt ein anderer Art von Sign in").
                 *
                 * Auf `/account` steht noch die alte Anmeldung (Adresse eintippen, Link
                 * schicken lassen) — genau die Bauart, die der Owner am selben Tag verworfen
                 * hat. Zwei verschiedene Anmeldungen im selben Haus sind schlimmer als eine
                 * unschöne: Der Kunde weiss nicht, welche gilt. Das Menü ruft deshalb den
                 * EINEN Dialog aus der Kopfzeile (`components/KontoChip`) über ein Ereignis
                 * auf — Google, E-Mail und Passwort, Konto anlegen, alles an einer Stelle.
                 * Das Menü schliesst sich dabei, sonst läge es über dem Fenster.
                 */
                <button type="button" onClick={() => {
                  if (signedIn) { navigate(slug ? `/${slug}/myaccount` : "/user/myaccount"); return; }
                  setShowProfileMenu(false);
                  try { window.dispatchEvent(new Event("luxurybandit-konto-oeffnen")); } catch { /**/ }
                }}
                  className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-white/[0.06] transition">
                  <Settings className="h-5 w-5 text-white/85 shrink-0" />
                  <span className="text-sm font-black text-white">{signedIn ? M.konto : M.anmelden}</span>
                </button>
              )}
              {/* Meine Themen — Abos (24 €/Thema), Verlängerung und Kündigen. Steht IMMER
                  da, auch ohne Login: die Seite selbst führt durch die Anmeldung. */}
              {signedIn && (
                <button type="button" onClick={() => navigate("/account")}
                  className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-white/[0.06] transition">
                  <CreditCard className="h-5 w-5 text-white/85 shrink-0" />
                  <span className="text-sm font-black text-white">My topics & billing</span>
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
              {/* Auch mit Kuss-Adresse sichtbar — wer als angemeldet gilt, braucht den
                  Ausgang (Owner 03.08.2026). */}
              {(signedIn || kussMail) ? (
                <button type="button" onClick={() => void handleSignOut()}
                  className="flex items-center gap-3 px-5 py-3.5 text-left active:bg-white/[0.06] transition">
                  <LogOut className="h-5 w-5 text-red-400 shrink-0" />
                  <span className="text-sm font-black text-red-500">Sign out</span>
                </button>
              ) : null /* Nicht angemeldet: der EINE Weg steht weiter oben
                          („Sign in / My account" → /account). Ein zweiter Sign-in-Eintrag
                          hier führte ins alte /stores-Panel und verwirrte nur. */}
            </div>

            {/* Info & legal */}
            <div className="mt-4 border-t border-white/10 px-5 pt-3">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/50">{M.infoLegal}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-[12px] font-bold text-white/85">
                <button type="button" onClick={() => navigate("/contact")} className="hover:text-white">{M.kontakt}</button>
                {/* „About" war einen Abend lang raus (Owner 05.08.2026: „auch im Menü About
                    ist falsch verlinkt") — die Seite beschrieb noch den Influencer-Marktplatz.
                    Seit sie neu geschrieben ist, steht sie wieder hier UND im Footer. */}
                <button type="button" onClick={() => navigate("/about")} className="hover:text-white">{M.ueber}</button>
                <button type="button" onClick={() => navigate("/terms")} className="hover:text-white">{M.agb}</button>
                <button type="button" onClick={() => navigate("/privacy")} className="hover:text-white">{M.datenschutz}</button>
                <button type="button" onClick={() => navigate("/imprint")} className="hover:text-white">{M.impressum}</button>
                {/* DIE CI-BIBLIOTHEK — IMMER SICHTBAR (Owner 06.08.2026: „ich sehe die
                    Bibliothek nicht im Menü" — der Staff-Punkt war ohne Anmeldung
                    unsichtbar). Klein in dieser Zeile: für uns jederzeit erreichbar, für
                    Kunden nur ein unscheinbares Wort; die Seite ist offen und noindex. */}
                <button type="button" onClick={() => navigate("/ci")} className="text-white/50 hover:text-white">CI</button>
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
