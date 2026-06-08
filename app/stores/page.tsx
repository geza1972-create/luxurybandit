"use client";

import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Store = {
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
  storeAddress?: string;
  price?: string;
  salePrice?: string;
  discountLabel?: string;
  productNote?: string;
  imageUrl: string;
  frontImageUrl?: string;
  backImageUrl?: string;
  galleryImageUrls?: string[];
};

type StoresPayload = {
  stores?: Store[];
  looks?: Look[];
  activeLook?: Look;
  error?: string;
};

const readJsonResponse = async <T,>(response: Response): Promise<T & { error?: string }> => {
  const text = await response.text();
  if (!text) return { error: `Server returned an empty response (${response.status}).` } as T & { error?: string };
  try {
    return JSON.parse(text) as T & { error?: string };
  } catch {
    return { error: text.slice(0, 500) || "Server returned an invalid response." } as T & { error?: string };
  }
};

const uniqueImages = (look: Look) =>
  [look.frontImageUrl ?? look.imageUrl, look.backImageUrl, ...(look.galleryImageUrls ?? [])].filter(Boolean).slice(0, 4) as string[];

const normalizeSlug = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");

export default function StoresPage() {
  const [data, setData] = useState<StoresPayload>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStores = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/try-this-look");
        const payload = await readJsonResponse<StoresPayload>(response);
        if (!response.ok) throw new Error(payload.error ?? "Stores could not be loaded.");
        setData(payload);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Stores could not be loaded.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadStores();
  }, []);

  const storeCards = useMemo(() => {
    const stores = data.stores ?? [];
    const looks = data.looks ?? [];
    const cards = stores
      .map((store) => {
        const storeLooks = looks.filter((look) => look.storeSlug === store.slug);
        return {
          store,
          looks: storeLooks,
          heroLook: storeLooks[0]
        };
      })
      .filter((card) => card.heroLook);

    if (!cards.length && data.activeLook) {
      const fallbackStore: Store = {
        id: "default-store",
        name: data.activeLook.storeName ?? "LuxuryBandit",
        slug: data.activeLook.storeSlug ?? "luxurybandit",
        address: data.activeLook.storeAddress
      };
      return [{ store: fallbackStore, looks: [data.activeLook], heroLook: data.activeLook }];
    }

    return cards;
  }, [data]);

  const storeNames = storeCards.map((card) => card.store.name).join(", ");

  return (
    <main className="min-h-screen bg-[#fbfaf7] px-3 py-5 text-ink">
      <section className="mx-auto grid w-full max-w-[430px] gap-5">
        <header className="grid gap-3 text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-md bg-cobalt text-sm font-black text-white shadow-soft">
            LB
          </div>
          <div className="text-xs font-black uppercase tracking-[0.22em] text-cobalt">LuxuryBandit Try-On</div>
          <h1 className="text-4xl font-black leading-none text-ink">
            New arrivals are here
          </h1>
          <p className="mx-auto max-w-sm text-base font-bold leading-7 text-ink/60">
            {storeNames ? `Discover fresh looks from ${storeNames}. Pick a boutique, upload your photo, and try the look on you.` : "Pick a boutique, upload your photo, and try the look on you."}
          </p>
        </header>

        {isLoading && (
          <div className="grid place-items-center rounded-lg border border-black/10 bg-white p-10 text-sm font-black text-ink/55 shadow-soft">
            <Loader2 aria-hidden="true" className="mb-3 h-6 w-6 animate-spin text-cobalt" />
            Loading new arrivals...
          </div>
        )}

        {error && <div className="rounded-md border border-coral/25 bg-coral/10 p-4 text-sm font-black text-coral">{error}</div>}

        {!isLoading && !error && (
          <section className="grid gap-4">
            {storeCards.length === 0 ? (
              <div className="rounded-lg border border-black/10 bg-white p-8 text-center shadow-soft">
                <div className="text-2xl font-black">No new arrivals yet</div>
                <p className="mt-2 text-sm font-bold text-ink/55">Add a store and upload its first look in the admin page.</p>
              </div>
            ) : (
              storeCards.map(({ store, looks, heroLook }) => {
                const images = uniqueImages(heroLook);
                return (
                  <article key={store.slug} className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-soft">
                    <div className="grid gap-0">
                      <div className="flex snap-x gap-2 overflow-x-auto bg-panel p-3">
                        {images.map((image, index) => (
                          <img
                            key={`${image}-${index}`}
                            src={image}
                            alt={`${heroLook.name} preview ${index + 1}`}
                            className="aspect-[3/4] w-[76%] shrink-0 snap-center rounded-md border border-black/10 bg-white object-cover object-top"
                          />
                        ))}
                      </div>
                      <div className="grid content-between gap-5 p-5">
                        <div>
                          <div className="text-xs font-black uppercase tracking-[0.18em] text-cobalt">New arrivals from</div>
                          <h2 className="mt-2 text-3xl font-black leading-tight text-ink">{store.name}</h2>
                          {store.address && <p className="mt-2 text-sm font-bold text-ink/55">{store.address}</p>}
                          <div className="mt-5 grid gap-2">
                            {looks.slice(0, 3).map((look) => (
                              <div key={look.id} className="flex items-center justify-between gap-3 rounded-md border border-black/10 bg-panel p-3">
                                <div>
                                  <div className="text-sm font-black text-ink">{look.name}</div>
                                  <div className="flex flex-wrap items-center gap-2 text-xs font-black">
                                    {look.discountLabel && <span className="rounded-md bg-coral px-2 py-1 text-white">{look.discountLabel}</span>}
                                    {look.salePrice && <span className="text-cobalt">{look.salePrice}</span>}
                                    {look.price && <span className={look.salePrice ? "text-ink/35 line-through" : "text-ink/45"}>{look.price}</span>}
                                    {!look.salePrice && !look.price && !look.discountLabel && <span className="text-ink/45">{look.campaignName || "New arrival"}</span>}
                                  </div>
                                </div>
                                <Sparkles aria-hidden="true" className="h-4 w-4 shrink-0 text-cobalt" />
                              </div>
                            ))}
                          </div>
                        </div>
                        <Link
                          href={`/store/${store.slug}/${normalizeSlug(heroLook.name) || heroLook.id}`}
                          className="inline-flex h-14 items-center justify-center gap-2 rounded-md bg-cobalt px-5 text-base font-black text-white"
                        >
                          View offers
                          <ArrowRight aria-hidden="true" className="h-5 w-5" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </section>
        )}
      </section>
    </main>
  );
}
