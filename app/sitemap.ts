import type { MetadataRoute } from "next";
import { readTryThisLookState } from "@/lib/try-this-look-store";
import { lookPath } from "@/lib/look-slug";

const BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://luxurybandit.com").replace(/\/$/, "");

// Regenerate hourly so new looks/curators get into the index without a redeploy.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/stores`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/bella`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/models-wanted`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/own-influencer`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/earnings`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/curators`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/imprint`, changeFrequency: "yearly", priority: 0.3 },
  ];

  let dynamic: MetadataRoute.Sitemap = [];
  try {
    const state = await readTryThisLookState();
    const looks = (state.looks ?? [])
      .filter((l) => l.published !== false)
      .map((l) => ({
        url: `${BASE}${lookPath(l.name, l.id)}`,
        lastModified: l.createdAt ? new Date(l.createdAt) : undefined,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
    const curators = (state.curators ?? [])
      .filter((c) => (c as any).status === "active")
      .map((c) => ({
        url: `${BASE}/curator/${c.id}`,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));
    dynamic = [...looks, ...curators];
  } catch {
    /* ignore — still return the static pages */
  }

  return [...staticPages, ...dynamic];
}
