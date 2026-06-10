"use client";

import { ArrowRight, Clock, ExternalLink, ImagePlus, LayoutDashboard, List, LogIn, Loader2, Megaphone, Package, RefreshCw, Settings, ShoppingBag, Store, Tags, UserPlus, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type StoreItem = {
  id: string;
  name: string;
  slug: string;
  address?: string;
  whatsappNumber?: string;
};

type Look = {
  id: string;
  name: string;
  campaignName?: string;
  storeName?: string;
  storeSlug?: string;
  price?: string;
  salePrice?: string;
  discountLabel?: string;
  imageUrl?: string;
  frontImageUrl?: string;
};

type Lead = {
  id: string;
  lookId: string;
  name?: string;
  phone?: string;
  selectedSize?: string;
  buyingPreference?: "pickup" | "delivery";
  status?: "new" | "contacted" | "closed";
  createdAt: string;
};

type AdminPayload = {
  activeLook?: Look;
  activeLooks?: Look[];
  stores?: StoreItem[];
  looks?: Look[];
  leads?: Lead[];
  events?: Array<{ id: string; name: string }>;
  error?: string;
};

const ADMIN_PIN_KEY = "luxurybandit-try-look-admin-pin";

const normalizeSlug = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");

const readJsonResponse = async <T,>(response: Response): Promise<T & { error?: string }> => {
  const text = await response.text();
  if (!text) return { error: `Server returned an empty response (${response.status}).` } as T & { error?: string };
  try {
    return JSON.parse(text) as T & { error?: string };
  } catch {
    return { error: text.slice(0, 500) || "Server returned an invalid response." } as T & { error?: string };
  }
};

export default function AdminDashboardPage() {
  const [pin, setPin] = useState("");
  const [data, setData] = useState<AdminPayload>({});
  const [origin, setOrigin] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = async (adminPin = pin) => {
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/try-this-look?admin=1", {
        headers: adminPin ? { "x-try-look-admin-pin": adminPin } : {}
      });
      const payload = await readJsonResponse<AdminPayload>(response);
      if (!response.ok) throw new Error(payload.error ?? "Admin data could not be loaded.");
      setData(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Admin data could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const storedPin = window.localStorage.getItem(ADMIN_PIN_KEY) ?? "";
    setPin(storedPin);
    setOrigin(window.location.origin);
    void loadData(storedPin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const savePin = () => {
    window.localStorage.setItem(ADMIN_PIN_KEY, pin);
    void loadData(pin);
  };

  const openExternalPage = (path: string, _label: string) => {
    const url = path.startsWith("http") ? path : path;
    window.location.href = url;
  };

  const stores = data.stores ?? [];
  const looks = data.looks ?? [];
  const activeLooks = data.activeLooks ?? [];
  const activeLookIds = new Set(activeLooks.map((look) => look.id));
  const newLeads = (data.leads ?? []).filter((lead) => (lead.status ?? "new") === "new").length;
  const whatsappClicks = (data.events ?? []).filter((event) => event.name === "click_order_whatsapp").length;

  const storeRows = useMemo(() => {
    return stores.map((store) => {
      const storeLooks = looks.filter((look) => look.storeSlug === store.slug);
      const activeLooks = storeLooks.filter((look) => activeLookIds.has(look.id));
      return {
        store,
        lookCount: storeLooks.length,
        activeCount: activeLooks.length,
        heroLook: activeLooks[0] ?? storeLooks[0]
      };
    });
  }, [activeLookIds, looks, stores]);
  const firstStore = storeRows[0]?.store;
  const firstLook = storeRows[0]?.heroLook;
  const firstOfferPath = firstStore && firstLook
    ? `/store/${firstStore.slug}/${normalizeSlug(firstLook.name) || firstLook.id}`
    : firstStore
      ? `/store/${firstStore.slug}`
      : "/stores";
  const pageGroups: { title: string; description: string; pages: { label: string; path: string; note: string; icon: LucideIcon }[] }[] = [
    {
      title: "Admin pages",
      description: "Use these to run the MVP.",
      pages: [
        { label: "Dashboard", path: "/admin", note: "Overview, links, and seller onboarding.", icon: LayoutDashboard },
        { label: "Listings & requests", path: "/admin/looks", note: "Create/edit sellers, listings, buyer requests, and AI previews.", icon: List },
        { label: "User management", path: "/admin/sellers", note: "Registered sellers, AI access control, credit limits.", icon: Users },
        { label: "Listing creatives", path: "/admin/creative", note: "Create and export four social slides from a listing.", icon: Package },
        { label: "Internal image tools", path: "/tools/fashion-creator", note: "Private service tool for extracting apparel and creating fashion images.", icon: ImagePlus }
      ]
    },
    {
      title: "Public pages",
      description: "These are shown to boutiques or shoppers.",
      pages: [
        { label: "Seller list", path: "/stores", note: "Public sellers and listings.", icon: Store },
        { label: "Example seller", path: firstStore ? `/store/${firstStore.slug}` : "/stores", note: "All live listings from one seller.", icon: Store },
        { label: "Example listing", path: firstOfferPath, note: "Mobile buyer listing page.", icon: ShoppingBag },
        { label: "Platform pitch", path: "/platform", note: "Sales page for boutiques, vintage sellers, and private sellers.", icon: Megaphone }
      ]
    },
    {
      title: "Seller portal",
      description: "Self-service pages for registered sellers.",
      pages: [
        { label: "Seller register", path: "/seller/register", note: "New seller signup — store name, email, password.", icon: UserPlus },
        { label: "Seller login", path: "/seller/login", note: "Returning seller login.", icon: LogIn },
        { label: "Seller dashboard", path: "/seller/dashboard", note: "Manage own listings, request AI access, see credits.", icon: LayoutDashboard }
      ]
    },
    {
      title: "Legacy/testing",
      description: "Keep these for testing until the full account system replaces them.",
      pages: [
        { label: "Listing fallback", path: "/try-this-look", note: "Legacy entry point for active listing testing.", icon: Clock }
      ]
    }
  ];

  return (
    <main className="min-h-screen bg-[#fbfaf7] px-4 py-5 text-ink">
      <section className="mx-auto grid w-full max-w-6xl gap-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-2">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-cobalt">LuxuryBandit Admin</div>
            <h1 className="text-5xl font-black leading-none text-ink">Dashboard</h1>
            <p className="max-w-3xl text-sm font-bold leading-6 text-ink/60">
              One place for seller links, live listings, buyer requests, and the pages you need while testing the MVP.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-4 text-sm font-black text-ink shadow-soft"
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            Refresh
          </button>
        </header>

        <section className="grid gap-3 rounded-lg border border-black/10 bg-white p-4 shadow-soft">
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <input
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              type="password"
              placeholder="Admin PIN"
              className="h-12 rounded-md border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt"
            />
            <button type="button" onClick={savePin} className="h-12 rounded-md bg-ink px-5 text-sm font-black text-white">
              Load admin data
            </button>
          </div>
        </section>

        {error && <div className="rounded-md border border-coral/25 bg-coral/10 p-4 text-sm font-black text-coral">{error}</div>}
        {message && <div className="rounded-md border border-cobalt/20 bg-cobalt/10 p-4 text-sm font-black text-cobalt">{message}</div>}

        <section className="grid gap-3 md:grid-cols-5">
          {[
            { label: "Stores", value: stores.length },
            { label: "Listings", value: looks.length },
            { label: "New buyer requests", value: newLeads },
            { label: "WhatsApp clicks", value: whatsappClicks }
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-black/10 bg-white p-4 shadow-soft">
              <div className="text-xs font-black uppercase tracking-[0.16em] text-ink/45">{item.label}</div>
              <div className="mt-2 text-4xl font-black text-cobalt">{item.value}</div>
            </div>
          ))}
        </section>

        <section className="grid gap-3 rounded-lg border border-black/10 bg-white p-4 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.16em] text-cobalt">Live listings</div>
              <h2 className="mt-1 text-3xl font-black leading-none text-ink">Currently live listings</h2>
            </div>
            <button
              type="button"
              onClick={() => void openExternalPage("/admin/looks", "Live listings")}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-ink px-3 text-xs font-black text-white"
            >
              View all listings
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
          {activeLooks.length ? (
            <button
              type="button"
              onClick={() => void openExternalPage("/admin/looks", "Live listings")}
              className="grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-4"
            >
              {activeLooks.map((look) => (
                <div key={look.id} className="grid gap-2 rounded-md border border-black/10 bg-panel p-3">
                  <div className="overflow-hidden rounded-md border border-black/10 bg-white">
                    {look.frontImageUrl || look.imageUrl ? (
                      <img src={look.frontImageUrl ?? look.imageUrl} alt="" className="aspect-[4/5] w-full object-cover object-top" />
                    ) : (
                      <div className="grid aspect-[4/5] place-items-center text-sm font-black text-ink/35">LB</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-ink">{look.name}</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      {(look.storeSlug ?? look.storeName) && (
                        <img
                          src={`https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(look.storeSlug ?? look.storeName ?? "default")}&backgroundColor=ffffff&color=000000`}
                          alt=""
                          className="h-4 w-4 shrink-0 rounded-full border border-black/10 bg-white object-cover"
                        />
                      )}
                      <span className="truncate text-xs font-bold text-ink/50">{look.storeName ?? look.storeSlug ?? "No store"}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-black">
                      {look.discountLabel && <span className="rounded-full bg-coral px-2 py-1 text-white">{look.discountLabel}</span>}
                      {look.salePrice && <span className="rounded-full bg-ink px-2 py-1 text-white">{look.salePrice}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </button>
          ) : (
            <div className="rounded-md border border-black/10 bg-panel p-5 text-sm font-bold text-ink/55">
              No live listings yet. Open Listings & requests and mark a listing as active.
            </div>
          )}
        </section>

        <section className="grid gap-4 rounded-lg border border-black/10 bg-white p-4 shadow-soft">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.16em] text-cobalt">Boutique start</div>
            <h2 className="mt-1 text-3xl font-black leading-none text-ink">How a seller uses LuxuryBandit</h2>
            <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-ink/55">
              The MVP is a simple direct selling funnel. The seller lists an item for free, can upgrade it with AI, shares the link,
              and follows real buyer requests in WhatsApp.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            {[
              ["1", "Set up seller", "Name, city, address, WhatsApp."],
              ["2", "Add listing", "Product image, price, sizes, pickup or delivery."],
              ["3", "Create listing slides", "Export four ready-made slides."],
              ["4", "Share link", "Post or share the listing link."],
              ["5", "Follow up", "Buyer chooses size, pickup/delivery, then WhatsApp closes the sale."]
            ].map(([number, title, text]) => (
              <div key={number} className="rounded-md border border-black/10 bg-panel p-3">
                <div className="grid h-9 w-9 place-items-center rounded-md bg-cobalt text-sm font-black text-white">{number}</div>
                <div className="mt-3 text-sm font-black text-ink">{title}</div>
                <p className="mt-1 text-xs font-bold leading-5 text-ink/55">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-4">
          <button type="button" onClick={() => void openExternalPage("/admin/looks", "Admin")} className="grid gap-3 rounded-lg border border-black/10 bg-white p-4 text-left shadow-soft">
            <Settings aria-hidden="true" className="h-6 w-6 text-cobalt" />
            <div>
              <div className="text-xl font-black">Manage sellers & listings</div>
              <p className="mt-1 text-sm font-bold leading-6 text-ink/55">Upload products, edit prices, set live listings, and view buyer requests.</p>
            </div>
            <span className="inline-flex items-center gap-2 text-sm font-black text-cobalt">
              Open admin
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </span>
          </button>

          <button type="button" onClick={() => void openExternalPage("/stores", "Stores")} className="grid gap-3 rounded-lg border border-black/10 bg-white p-4 text-left shadow-soft">
            <Store aria-hidden="true" className="h-6 w-6 text-cobalt" />
            <div>
              <div className="text-xl font-black">Public seller list</div>
              <p className="mt-1 text-sm font-bold leading-6 text-ink/55">See the buyer-facing list of sellers and listings.</p>
            </div>
            <span className="inline-flex items-center gap-2 text-sm font-black text-cobalt">
              Open stores
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </span>
          </button>

          <button type="button" onClick={() => void openExternalPage("/platform", "Platform")} className="grid gap-3 rounded-lg border border-black/10 bg-white p-4 text-left shadow-soft">
            <Tags aria-hidden="true" className="h-6 w-6 text-cobalt" />
            <div>
              <div className="text-xl font-black">Sales landing page</div>
              <p className="mt-1 text-sm font-bold leading-6 text-ink/55">Open the pitch page for boutiques, vintage sellers, and private sellers.</p>
            </div>
            <span className="inline-flex items-center gap-2 text-sm font-black text-cobalt">
              Open platform
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </span>
          </button>

          <button type="button" onClick={() => void openExternalPage("/admin/creative", "Creative builder")} className="grid gap-3 rounded-lg border border-black/10 bg-white p-4 text-left shadow-soft">
            <Tags aria-hidden="true" className="h-6 w-6 text-cobalt" />
            <div>
              <div className="text-xl font-black">Listing creatives</div>
              <p className="mt-1 text-sm font-bold leading-6 text-ink/55">Create four export-ready social slides from any listing.</p>
            </div>
            <span className="inline-flex items-center gap-2 text-sm font-black text-cobalt">
              Open builder
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </span>
          </button>

          <button type="button" onClick={() => void openExternalPage("/admin/sellers", "User management")} className="grid gap-3 rounded-lg border border-black/10 bg-white p-4 text-left shadow-soft">
            <Settings aria-hidden="true" className="h-6 w-6 text-cobalt" />
            <div>
              <div className="text-xl font-black">User management</div>
              <p className="mt-1 text-sm font-bold leading-6 text-ink/55">Registered sellers, AI access control, and credit limits.</p>
            </div>
            <span className="inline-flex items-center gap-2 text-sm font-black text-cobalt">
              Open
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </span>
          </button>

          <button type="button" onClick={() => void openExternalPage("/tools/fashion-creator", "Internal image tools")} className="grid gap-3 rounded-lg border border-black/10 bg-white p-4 text-left shadow-soft">
            <ImagePlus aria-hidden="true" className="h-6 w-6 text-cobalt" />
            <div>
              <div className="text-xl font-black">Internal image tools</div>
              <p className="mt-1 text-sm font-bold leading-6 text-ink/55">Use Apparel Extractor and Fashion Creator for client image service work.</p>
            </div>
            <span className="inline-flex items-center gap-2 text-sm font-black text-cobalt">
              Open tools
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </span>
          </button>
        </section>

        <section className="grid gap-4 rounded-lg border border-black/10 bg-white p-4 shadow-soft">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.16em] text-cobalt">Page map</div>
            <h2 className="mt-1 text-3xl font-black leading-none text-ink">All pages in this MVP</h2>
            <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-ink/55">
              Every page we add should appear here, so you do not need to remember URLs.
            </p>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {pageGroups.map((group) => (
              <div key={group.title} className="grid content-start gap-3 rounded-md border border-black/10 bg-panel p-3">
                <div>
                  <div className="text-lg font-black text-ink">{group.title}</div>
                  <p className="mt-1 text-xs font-bold leading-5 text-ink/55">{group.description}</p>
                </div>
                {group.pages.map((page) => {
                  const Icon = page.icon;
                  return (
                    <button
                      key={`${group.title}-${page.path}`}
                      type="button"
                      onClick={() => void openExternalPage(page.path, page.label)}
                      className="flex gap-3 rounded-md border border-black/10 bg-white p-3 text-left hover:border-cobalt/40 transition-colors"
                    >
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-cobalt/10">
                        <Icon className="h-3.5 w-3.5 text-cobalt" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-ink">{page.label}</div>
                        <div className="break-all text-xs font-black text-cobalt">{page.path}</div>
                        <div className="mt-0.5 text-xs font-bold leading-5 text-ink/50">{page.note}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-3 rounded-lg border border-black/10 bg-white p-4 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black">Seller links</h2>
              <p className="mt-1 text-sm font-bold text-ink/55">Use these for seller links, share links, ad destinations, and testing.</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(`${origin}/stores`);
                setMessage("Store list link copied.");
              }}
              className="h-10 rounded-md border border-black/10 bg-panel px-3 text-xs font-black text-ink"
            >
              Copy /stores
            </button>
          </div>

          {isLoading ? (
            <div className="grid place-items-center rounded-md border border-black/10 bg-panel p-8 text-sm font-black text-ink/55">
              <Loader2 aria-hidden="true" className="mb-2 h-5 w-5 animate-spin text-cobalt" />
              Loading dashboard...
            </div>
          ) : storeRows.length ? (
            <div className="grid gap-3">
              {storeRows.map(({ store, lookCount, activeCount, heroLook }) => {
                const storeUrl = `/store/${store.slug}`;
                const lookSlug = heroLook ? normalizeSlug(heroLook.name) || heroLook.id : "";
                const offerUrl = heroLook ? `/store/${store.slug}/${lookSlug}` : storeUrl;
                return (
                  <article key={store.slug} className="grid gap-3 rounded-md border border-black/10 bg-panel p-3 md:grid-cols-[88px_1fr_auto]">
                    <div className="overflow-hidden rounded-md border border-black/10 bg-white">
                      {heroLook?.frontImageUrl || heroLook?.imageUrl ? (
                        <img src={heroLook.frontImageUrl ?? heroLook.imageUrl} alt="" className="aspect-square w-full object-cover object-top" />
                      ) : (
                        <div className="grid aspect-square place-items-center text-sm font-black text-ink/35">LB</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xl font-black text-ink">{store.name}</div>
                      <div className="mt-1 text-sm font-bold text-ink/55">{store.address || "No address yet"}</div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-black">
                        <span className="rounded-full bg-white px-3 py-1 text-ink/55">{lookCount} listings</span>
                        <span className="rounded-full bg-cobalt/10 px-3 py-1 text-cobalt">{activeCount} live</span>
                        {store.whatsappNumber && <span className="rounded-full bg-white px-3 py-1 text-ink/55">{store.whatsappNumber}</span>}
                      </div>
                      <div className="mt-3 grid gap-1 text-xs font-bold text-cobalt">
                        <div>{origin}{storeUrl}</div>
                        {heroLook && <div>{origin}{offerUrl}</div>}
                      </div>
                    </div>
                    <div className="grid content-start gap-2">
                      <button
                        type="button"
                        onClick={() => void openExternalPage(storeUrl, `${store.name} store`)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cobalt px-3 text-xs font-black text-white"
                      >
                        Store
                        <ExternalLink aria-hidden="true" className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void openExternalPage(offerUrl, `${store.name} offer`)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-ink px-3 text-xs font-black text-white"
                      >
                        Offer
                        <ExternalLink aria-hidden="true" className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(`${origin}${offerUrl}`);
                          setMessage(`${store.name} offer link copied.`);
                        }}
                        className="h-10 rounded-md border border-black/10 bg-white px-3 text-xs font-black text-ink"
                      >
                        Copy
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-md border border-black/10 bg-panel p-6 text-sm font-bold text-ink/55">
              No sellers yet. Start with “Manage sellers & listings”.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
