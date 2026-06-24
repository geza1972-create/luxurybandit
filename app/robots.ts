import type { MetadataRoute } from "next";

const BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://luxurybandit.com").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private / tooling / user-specific routes — keep out of the index.
        disallow: ["/admin", "/studio", "/tools", "/api", "/seller", "/messages", "/tryon", "/curators/apply", "/curators/profile"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
