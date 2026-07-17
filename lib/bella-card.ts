import { readTryThisLookState, getSignedUrl, readCardStudioSlides } from "@/lib/try-this-look-store";
import { influencerPriceCents, fmtPriceCents } from "@/lib/influencer-price";
import type { ModelCardProps, ModelClip } from "@/components/ModelCard";

// Bella's stable curator id — the flagship landing example (her ads performed best).
export const BELLA_ID = "curator-1783683672619-td4cy";

// Build Bella's REAL collectible ModelCard (the same card the /own-influencer landing shows):
// her live Growth Score, serial, looks, story clips and ownership — straight from state.json.
// Extracted so every landing page renders the identical card instead of a hand-rolled copy.
export async function buildBellaCard(opts: { surface?: string; customer?: string } = {}): Promise<{ card: ModelCardProps | null; story: ModelClip[]; intro: string }> {
  const surface = opts.surface ?? "lp-journey";
  const customerScope = (opts.customer ?? "").trim().toLowerCase();
  try {
    const state = await readTryThisLookState();
    const curators = state.curators ?? [];
    const gina = curators.find(c => c.id === BELLA_ID) as
      | { id?: string; firstName?: string; lastName?: string; photoUrl?: string; flagship?: boolean; realModel?: boolean; purchasedAt?: string; createdAt?: string; bio?: string; motto?: string; brands?: string }
      | undefined;

    const ginaKey = [gina?.firstName, gina?.lastName].filter(Boolean).join(" ").trim().toLowerCase() || "bella jussi";
    let ginaLooks = 0, ginaVideos = 0;
    const ginaClipTiles: { poster: string; video: string; private: boolean; createdAt: string; look: string }[] = [];
    for (const g of (state.generations ?? [])) {
      if ((g as { feed?: boolean }).feed !== true) continue;
      const gn = String((g as { customerName?: string }).customerName ?? "").trim().toLowerCase();
      if (gn !== ginaKey) continue;
      ginaLooks++;
      const vurl = (g as { videoUrl?: string }).videoUrl;
      if (vurl) ginaVideos++;
      const thumb = (g as { imageUrl?: string }).imageUrl;
      if (vurl && thumb) ginaClipTiles.push({ poster: thumb, video: vurl, private: (g as { public?: boolean }).public !== true, createdAt: (g as { createdAt?: string }).createdAt ?? "", look: String((g as { lookName?: string }).lookName ?? "") });
    }
    ginaClipTiles.sort((a, b) => Number(a.private) - Number(b.private));
    const ginaTiles = ginaClipTiles.slice(0, 30);

    const ginaFollowers = (state.follows ?? []).filter((f: unknown) => (f as { followeeType?: string }).followeeType === "user" && (f as { followeeSlug?: string }).followeeSlug === gina?.id).length;
    const prc = (state.pricing ?? {}) as { flagshipBase1Cents?: number; flagshipBase2Cents?: number; flagshipBase3Cents?: number };
    const flagshipBases = [prc.flagshipBase1Cents ?? 50000, prc.flagshipBase2Cents ?? 150000, prc.flagshipBase3Cents ?? 500000];
    const ginaValueCents = gina ? influencerPriceCents({
      name: ginaKey, flagship: gina.flagship, realModel: gina.realModel === true,
      videoCount: ginaVideos, lookCount: ginaLooks, followerCount: ginaFollowers,
      purchasedAt: gina.purchasedAt, createdAt: gina.createdAt,
      flagshipTier: (gina as { flagshipTier?: number }).flagshipTier, flagshipBases,
    }) : 0;

    const ginaSerial = (gina?.id ?? "").replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase() || "GINA01";
    const ginaIntro = String((gina as any)?.intro ?? "").trim()
      || "Hi, I'm Bella — your Monaco influencer. I travel the world, test the newest trends first-hand — I'm obsessed with Gianna Bellucci lingerie — and bring every look to you with photos and stories from each stop. Follow along and never miss a drop.";
    const ginaTitle = String((gina as any)?.title ?? "").trim() || "Monaco Influencer";
    const ginaSponsor = String((gina as any)?.sponsor ?? "").trim() || "Gianna Bellucci";

    const LOCATIONS = ["Monte-Carlo, Monaco", "Saint-Tropez, France", "Lake Como, Italy", "Milan, Italy", "Paris, France", "Mykonos, Greece", "Dubai, UAE", "Ibiza, Spain"];
    const STORIES = [
      "Golden hour on the terrace — testing this season's liquid-satin trend. Verdict: obsessed.",
      "Off-duty in the old town. Sheer lace is having a moment; here's how I'd wear it by day.",
      "Rooftop sunset, city lights. This is the silhouette everyone will copy next month.",
      "Poolside and unbothered. Reporting live on the trend that's taking over the Riviera.",
      "Backstage energy. New drop, first look — you saw it here before anyone else.",
      "A quiet luxury moment. Sometimes the simplest piece is the whole story.",
    ];
    const fmtDate = (iso: string) => { try { return iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : ""; } catch { return ""; } };
    const story: ModelClip[] = ginaTiles.slice(0, 8).map((t, i) => ({
      poster: t.poster, video: t.video, private: false,
      date: fmtDate(t.createdAt),
      location: LOCATIONS[i % LOCATIONS.length],
      story: STORIES[i % STORIES.length],
      brand: "Gianna Bellucci",
      shopUrl: "/haine",
    }));
    const heroClip = ginaTiles[0] || { poster: "", video: "" };

    // Admin-managed carousel slides (Peter intro image + example videos) → lead the card
    // carousel, then her real feed clips fill in behind them.
    const bellaPhoto = (gina?.photoUrl ?? "") as string;
    const customClips: ModelClip[] = [];
    const cardStudioSlides = await readCardStudioSlides();
    const orderedSlides = [...cardStudioSlides].sort(
      (a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")));
    for (const sl of orderedSlides) {
      if (sl.hidden === true) continue;                        // hidden in the library, not on cards
      if (customerScope) {
        // A customer's personal card: only THEIR slides (all surfaces).
        if ((sl.customer ?? "").toLowerCase() !== customerScope) continue;
      } else {
        if (sl.customer) continue;                             // per-customer slide, not the general card
        if (sl.pages && !sl.pages.includes(surface)) continue; // targeted at specific surfaces (empty = none)
      }
      const media = sl.path ? await getSignedUrl(sl.path).catch(() => "") : "";
      if (!media) continue;
      const poster = sl.posterPath ? await getSignedUrl(sl.posterPath).catch(() => "") : "";
      const caption = [sl.title, sl.caption].filter(Boolean).join(" — ");
      if (sl.kind === "video") {
        // No Bella-photo fallback — a posterless video shows its OWN frame on the card.
        customClips.push({ poster: poster || "", video: media, private: false, story: caption || undefined });
      } else {
        customClips.push({ poster: media, video: "", private: false, story: caption || undefined });
      }
    }
    // A customer's personal card shows ONLY their own slides; the general card leads with any
    // custom slides then fills in with her real feed looks.
    const clips = customerScope ? customClips : [...customClips, ...story];

    const card: ModelCardProps = {
      id: (gina?.id ?? "") as string,
      serial: ginaSerial,
      name: "Bella",
      title: ginaTitle,
      intro: ginaIntro,
      sponsor: ginaSponsor,
      photo: (gina?.photoUrl ?? "") as string,
      video: heroClip.video || "",
      poster: heroClip.poster || (gina?.photoUrl ?? ""),
      clips,
      valueLabel: fmtPriceCents(ginaValueCents),
      looks: ginaLooks,
      bio: (gina?.bio || gina?.motto || "") as string,
      brands: (gina?.brands || "") as string,
      createdAt: (gina?.createdAt || "") as string,
      forSale: typeof (gina as { forSale?: boolean })?.forSale === "boolean"
        ? (gina as { forSale?: boolean }).forSale
        : !(gina as { ownerEmail?: string })?.ownerEmail,
      country: ((gina as { country?: string })?.country || "") as string,
      owner: (() => {
        const oe = String((gina as { ownerEmail?: string })?.ownerEmail || "").trim().toLowerCase();
        if (!oe) return "";
        const local = oe.split("@")[0].split(/[._-]/)[0];
        return local ? local.charAt(0).toUpperCase() + local.slice(1) : "";
      })(),
    };
    return { card: card.photo ? card : null, story, intro: ginaIntro };
  } catch {
    return { card: null, story: [], intro: "" };
  }
}
