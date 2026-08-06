import type { MetadataRoute } from "next";
import { readTryThisLookState } from "@/lib/try-this-look-store";
import { lookPath } from "@/lib/look-slug";

const BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://luxurybandit.com").replace(/\/$/, "");

// Regenerate hourly so new looks/curators get into the index without a redeploy.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    // „/" ist die Startseite und liefert die Themen selbst aus (app/page.tsx). /themes zeigt
    // dieselbe Seite, nennt aber „/" als kanonische Fassung — eine Adresse, die auf eine
    // andere verweist, gehoert nicht in die Sitemap, sonst schickt man die Suchmaschine
    // absichtlich auf die Zweitfassung.
    { url: `${BASE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/stores`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/bella`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/themes/wetter/bella`, changeFrequency: "daily", priority: 0.9 },

    /**
     * DIE THEMENSEITEN — und sie standen bis zum 05.08.2026 in KEINER Zeile dieser Datei.
     *
     * Das ist die Lücke, die am meisten gekostet hat: Hier stehen `/stores`, `/curators` und
     * `/earnings` — und ausgerechnet die Seiten, auf denen etwas verkauft wird, fehlten. Google
     * findet sie über die Startseite zwar irgendwann, aber „irgendwann" ist bei einem
     * Dezember-Produkt keine Antwort.
     *
     * Jede dieser Seiten hat einen eigenen Titel, eigene Suchwörter und einen eigenen Anlass —
     * genau die Gliederung, nach der laut Keyword-Messung gesucht wird (Konzept §1: „Der
     * Suchende sucht den EMPFÄNGER, nicht das Produkt").
     *
     * `gutschein` steht bewusst zuoberst: Es ist das einzige Geschenk mit GEMESSENER
     * Suchnachfrage („gutschein verpacken ideen", „gutschein text", „gift card message") und
     * das einzige mit einer Frist.
     */
    { url: `${BASE}/themes/gutschein`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/themes/kiss`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/themes/wedding`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/themes/holiday`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/themes/birthday`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/themes/surprise`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/themes/chat`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/themes/luxurybandit-plan`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/themes/bella`, changeFrequency: "weekly", priority: 0.6 },
    /* `/models-wanted` ist raus (Owner 05.08.2026: „die gibt es nicht mehr, nur fuer den
       Admin"). Eine Seite, die Besucher wegschickt, gehoert nicht in die Sitemap — sonst
       schickt Google weiter Verkehr auf eine Weiterleitung. */
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
