import { NextResponse } from "next/server";
import { readTryThisLookState, readCardStudioSlides, getSignedUrl, type BellaSlide } from "@/lib/try-this-look-store";

export const runtime = "nodejs";

// Aggregate feed of ALL models' Card-Studio slides (their My-Studio / Card-Studio posts),
// newest first, each tagged with its model. This is what the home "Feeds" tab shows now
// (instead of the try-on videos).
//   default        → every public + private slide (private flagged so the client blurs it)
//   ?scope=private → ONLY private slides (the "Private" teaser tab — very blurred client-side)
export async function GET(request: Request) {
  const privateOnly = new URL(request.url).searchParams.get("scope") === "private";
  const state = await readTryThisLookState();

  // Only live, visible models (same rule the Models gallery uses).
  const models = (state.curators ?? []).filter(c =>
    (c as any).photoUrl && ((c as any).status ?? "active") === "active" && (c as any).hidden !== true
  );

  // Read every model's slide blob in parallel.
  const perModel = await Promise.all(models.map(async (c) => {
    const slides = await readCardStudioSlides(c.id).catch(() => [] as BellaSlide[]);
    const name = (c as any).modelName?.trim()
      || [(c as any).firstName, (c as any).lastName].filter(Boolean).join(" ").trim()
      || (c as any).firstName || "Model";
    return { c, name, slides };
  }));

  // Flatten → drop per-customer slides → (optionally) keep only private → newest first.
  const raw: { s: BellaSlide; c: any; name: string }[] = [];
  for (const { c, name, slides } of perModel) {
    for (const s of slides) {
      if (s.customer) continue;                        // per-customer cards never hit the public feed
      if (s.pendingApproval) continue;                  // her own public upload, awaiting admin review
      if (s.hidden === true) continue;                  // "Auf Card" turned off — blurred teaser, not the public feed
      if (privateOnly && s.private !== true) continue; // Private tab = only private slides
      raw.push({ s, c, name });
    }
  }
  raw.sort((a, b) => String(b.s.createdAt ?? "").localeCompare(String(a.s.createdAt ?? "")));

  // Sign the media of the top slides in parallel.
  const slides = await Promise.all(raw.slice(0, 300).map(async ({ s, c, name }) => ({
    id: s.id,
    modelId: c.id,
    modelName: name,
    modelPhoto: (c as any).photoUrl || "",
    kind: s.kind === "video" ? "video" : "image",
    private: s.private === true,
    hidden: s.hidden === true,
    title: s.title ?? "",
    caption: s.caption ?? "",
    createdAt: s.createdAt ?? "",
    mediaUrl: s.path ? await getSignedUrl(s.path).catch(() => "") : "",
    posterUrl: s.posterPath ? await getSignedUrl(s.posterPath).catch(() => "") : "",
  })));

  return NextResponse.json({ slides });
}
