"use client";

import { ArrowUpRight, Loader2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type GalleryImageItem = {
  id: string;
  type: "upload" | "cutout" | "shop-image" | "model-image";
  path: string;
  url: string;
  createdAt: string;
  name: string;
};

const LANDING_ACCOUNT_ID = process.env.NEXT_PUBLIC_SHOPCUT_ACCOUNT_ID || "luxurybandit";

const readJsonResponse = async <T,>(response: Response): Promise<T & { error?: string }> => {
  const text = await response.text();
  if (!text) return { error: "No gallery response received." } as T & { error?: string };
  try {
    return JSON.parse(text) as T & { error?: string };
  } catch {
    return { error: text.slice(0, 500) || "Gallery response could not be read." } as T & { error?: string };
  }
};

export function LuxuryBandiLanding() {
  const [images, setImages] = useState<GalleryImageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadImages = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/gallery", {
          headers: {
            "x-shopcut-account-id": LANDING_ACCOUNT_ID
          }
        });
        const payload = await readJsonResponse<{ images?: GalleryImageItem[] }>(response);
        if (!response.ok || !payload.images) throw new Error(payload.error ?? "Gallery could not be loaded.");
        if (mounted) setImages(payload.images);
      } catch (loadError) {
        if (mounted) setError(loadError instanceof Error ? loadError.message : "Gallery could not be loaded.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void loadImages();
    return () => {
      mounted = false;
    };
  }, []);

  const showcaseImages = useMemo(() => {
    const designs = images.filter((image) => image.type === "model-image");
    const apparel = images.filter((image) => image.type === "shop-image");
    return [...designs, ...apparel].slice(0, 18);
  }, [images]);

  const appUrl =
    typeof window !== "undefined" && window.location.hostname.includes("localhost")
      ? "/?app=1"
      : "https://app.luxurybandit.com";

  return (
    <main className="min-h-screen bg-[#f7f2ec] text-[#171310]">
      <section className="mx-auto grid min-h-screen w-full max-w-[1600px] content-start gap-8 px-5 py-6 md:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-md bg-[#171310] text-base font-black text-white shadow-soft">
              LB
            </div>
            <div>
              <div className="text-xl font-black tracking-normal">LuxuryBandit</div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-black/45">AI Fashion Gallery</div>
            </div>
          </div>
          <a
            href={appUrl}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-cobalt px-4 text-sm font-black text-white"
          >
            Open Fashion Creator
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </a>
        </header>

        <section className="grid gap-6 border-y border-black/10 py-8 md:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.55fr)] md:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-cobalt shadow-soft">
              <Sparkles aria-hidden="true" className="h-4 w-4" />
              Fashion Creator by LuxuryBandit
            </div>
            <h1 className="mt-5 max-w-5xl text-5xl font-black leading-[0.94] tracking-normal md:text-7xl">
              AI fashion visuals from your own apparel.
            </h1>
            <p className="mt-5 max-w-3xl text-lg font-bold leading-8 text-black/58">
              A visual gallery for bold ecommerce looks, apparel concepts, and AI-assisted fashion campaigns created with LuxuryBandit.
            </p>
          </div>
          <div className="rounded-md border border-black/10 bg-white p-4 shadow-soft">
            <div className="text-sm font-black uppercase tracking-[0.16em] text-black/45">How it works</div>
            <div className="mt-4 grid gap-3">
              {[
                "Extract apparel from a real source photo.",
                "Save clean Design Ready apparel assets.",
                "Create new fashion visuals on a selected model."
              ].map((text, index) => (
                <div key={text} className="flex gap-3 rounded-md bg-[#f7f2ec] p-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-cobalt text-sm font-black text-white">
                    {index + 1}
                  </span>
                  <span className="text-sm font-bold leading-6 text-black/62">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black md:text-3xl">Latest AI fashion images</h2>
              <p className="mt-1 text-sm font-bold leading-6 text-black/50">
                A simple public gallery for LuxuryBandit image experiments and fashion concepts.
              </p>
            </div>
            <div className="rounded-full bg-white px-3 py-2 text-xs font-black text-black/45 shadow-soft">
              {showcaseImages.length} images
            </div>
          </div>

          {isLoading ? (
            <div className="grid min-h-72 place-items-center rounded-md border border-black/10 bg-white">
              <div className="flex items-center gap-2 text-sm font-black text-black/50">
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-cobalt" />
                Loading gallery
              </div>
            </div>
          ) : error ? (
            <div className="rounded-md border border-coral/25 bg-coral/10 p-4 text-sm font-black leading-6 text-coral">
              {error}
            </div>
          ) : showcaseImages.length > 0 ? (
            <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
              {showcaseImages.map((image, index) => (
                <figure key={image.id} className="mb-4 break-inside-avoid overflow-hidden rounded-md border border-black/10 bg-white shadow-soft">
                  <img
                    src={image.url}
                    alt={`LuxuryBandit AI fashion image ${index + 1}`}
                    className="w-full object-cover"
                    loading="lazy"
                  />
                </figure>
              ))}
            </div>
          ) : (
            <div className="grid min-h-72 place-items-center rounded-md border border-black/10 bg-white p-6 text-center">
              <div>
                <div className="text-lg font-black">No public images yet</div>
                <p className="mt-2 max-w-md text-sm font-bold leading-6 text-black/50">
                  Create Fashion Creator designs first. They will appear here once saved under the LuxuryBandit account.
                </p>
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
