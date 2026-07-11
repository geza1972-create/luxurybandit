import {
  deleteTryThisLookImage,
  getActiveTryThisLook,
  getActiveTryThisLooks,
  getSignedUrl,
  readTryThisLookState,
  saveTryThisLookState,
  readOutfits,
  writeOutfits,
  uploadTryThisLookImage,
  type CuratorProfile
} from "@/lib/try-this-look-store";
import { authorizeStudio } from "@/lib/studio-auth";
import { tryOnGarment } from "@/lib/tryon";
import { isIntimateName } from "@/lib/lingerie";
import { categorizeLook, isLookCategory } from "@/lib/look-category";
import { notifyAdminWhatsApp, ADMIN_URL } from "@/lib/notify-admin";
import { isAdminRequest } from "@/lib/admin-auth";
import { deleteAuthUser } from "@/lib/supabase-admin-users";
import { sendCuratorInviteEmail } from "@/lib/curator-invite-email";
import { FASHION_BRANDS } from "@/lib/fashion-brands";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
// Always read/write live state — never serve a cached/prerendered response.
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Brands sorted longest-first so "Yves Saint Laurent" wins over "Saint Laurent".
const BRANDS_BY_LEN = [...FASHION_BRANDS].sort((a, b) => b.length - a.length);
// Detect the fashion brand named in a look's title/description (the brand the
// curator specified at generation). Returns the canonical brand name, or null.
function detectBrand(...parts: (string | undefined)[]): string | null {
  // Normalize away spaces/punctuation so "Dolce&Gabbana" matches "Dolce & Gabbana".
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const text = norm(parts.filter(Boolean).join(" "));
  if (!text) return null;
  for (const b of BRANDS_BY_LEN) {
    const bn = norm(b);
    if (bn.length < 4) continue;
    if (text.includes(bn)) return b;
  }
  return null;
}

// Build a small thumbnail variant of a Supabase signed/public image URL using
// Supabase's on-the-fly image transformation (render/image endpoint). If the
// project has image transformations disabled, the client falls back to the
// full image via the <img> onError handler, so this is always safe.
function toThumbUrl(url: string, width = 160): string {
  if (!url || !url.includes("/storage/v1/")) return url;
  const rendered = url
    .replace("/object/sign/", "/render/image/sign/")
    .replace("/object/public/", "/render/image/public/");
  if (rendered === url) return url;
  const sep = rendered.includes("?") ? "&" : "?";
  return `${rendered}${sep}width=${width}&quality=70&resize=cover`;
}
// Allow large JSON bodies for gallery uploads with multiple base64 images
export const maxDuration = 60;

// Admin = PIN header (fallback) OR a valid Supabase admin session (email allowlist).
const isAdmin = (request: Request) => isAdminRequest(request);

function normalizeSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
}

function normalizeImageUrl(value = "") {
  if (!value) return "";
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return value.split("?")[0] ?? value;
  }
}

function visibleImageUrls(look: Awaited<ReturnType<typeof readTryThisLookState>>["looks"][number]) {
  const imagePairs = [
    { key: look.frontImagePath ?? look.imagePath ?? look.frontImageUrl ?? look.imageUrl, url: look.frontImageUrl ?? look.imageUrl },
    ...(look.galleryImagePaths ?? []).map((path, index) => ({
      key: path,
      url: look.galleryImageUrls?.[index]
    })),
    ...(look.galleryImageUrls ?? []).map((url) => ({
      key: url,
      url
    }))
  ];
  const seen = new Set<string>();
  return imagePairs.flatMap(({ key, url }) => {
    if (!key || !url || seen.has(key)) return [];
    seen.add(key);
    return [url];
  }).slice(0, 6);
}

// Wrap an outbound shop link in the matching partner store's affiliate template,
// injecting the curator's SubID for internal attribution. No template (account
// not live yet) → returns the raw URL unchanged. Done at serve time so it
// activates retroactively for ALL looks the moment a template is added.
type AffiliateStore = { homeUrl: string; affiliateTemplate?: string };
function affiliateWrap(url: string | undefined, sid: string, stores: AffiliateStore[]): string | undefined {
  if (!url) return url;
  let host: string;
  try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
  const store = stores.find(s => {
    try { return new URL(s.homeUrl).hostname.replace(/^www\./, "") === host; } catch { return false; }
  });
  if (!store?.affiliateTemplate) return url;
  return store.affiliateTemplate
    .split("{url}").join(encodeURIComponent(url))
    .split("{sid}").join(encodeURIComponent(sid || "house"));
}

function serializeLook(look: Awaited<ReturnType<typeof readTryThisLookState>>["looks"][number], generationCount = 0, partnerStores: AffiliateStore[] = [], curators: CuratorProfile[] = [], tryOnImageUrl?: string, communityTryOns: { id?: string; imageUrl: string; videoUrl?: string; userPhotoUrl?: string; name?: string; hidden?: boolean; pending?: boolean; curatorId?: string; curatorPhotoUrl?: string }[] = []) {
  const sid = String((look as any).curatorId ?? "house");
  const wrap = (u: string | undefined) => affiliateWrap(u, sid, partnerStores);
  // Attribute the look to the curator who published it (name, photo, profile link).
  const curator = (look as any).curatorId ? curators.find(c => c.id === (look as any).curatorId) : undefined;
  const curatorName = curator ? [curator.firstName, curator.lastName].filter(Boolean).join(" ").trim() : "";
  const galleryImageUrls = visibleImageUrls(look);
  const primaryImageUrl = galleryImageUrls[0] ?? look.frontImageUrl ?? look.imageUrl;
  const frontPath = look.frontImagePath ?? look.imagePath;
  // Expose clean gallery paths: exclude front image path to avoid client-side duplicates
  const cleanGalleryPaths = (look.galleryImagePaths ?? []).filter(p => p && p !== frontPath);
  // Lingerie/swim: explicit flag wins; otherwise detect from name + brand + notes.
  const lingerie = typeof (look as any).lingerie === "boolean"
    ? (look as any).lingerie
    : isIntimateName([look.name, (look as any).brand, (look as any).campaignName, (look as any).productNote].filter(Boolean).join(" "));
  // Editorial category (After Dark / Riviera / Boudoir / Off-Duty). Explicit wins,
  // else lingerie→Boudoir, else inferred from the name so legacy looks are sorted.
  const category = categorizeLook(look as any, lingerie);
  return {
    id: look.id,
    name: look.name,
    campaignName: look.campaignName,
    storeName: look.storeName,
    storeSlug: look.storeSlug,
    storeAddress: look.storeAddress,
    availableSizes: look.availableSizes,
    price: look.price,
    salePrice: look.salePrice,
    discountLabel: look.discountLabel,
    dealEndsAt: look.dealEndsAt,
    inStock: look.inStock,
    published: look.published,
    availabilityNote: look.availabilityNote,
    deliveryTime: look.deliveryTime,
    productNote: look.productNote,
    buyUrl: wrap((look as any).buyUrl),
    // Curator's own affiliate links (a.affiliate) are kept 1:1 — their tracking is
    // already baked in, so we must NOT re-wrap them in a partner template.
    alternatives: Array.isArray((look as any).alternatives)
      ? (look as any).alternatives.map((a: any) => ({ ...a, link: a?.affiliate ? a.link : wrap(a.link) }))
      : (look as any).alternatives,
    hashtags: (look as any).hashtags,
    // Similar-escapes (travel) results found from the reel's location photo.
    locationDupes: Array.isArray((look as any).locationDupes)
      ? (look as any).locationDupes.map((a: any) => ({ ...a, link: a?.affiliate ? a.link : wrap(a.link) }))
      : undefined,
    // Reel source images (admin-only) — the clothes + location used for the searches.
    clothesImageUrl: (look as any).clothesImageUrl || undefined,
    videoPrompt: (look as any).videoPrompt || undefined,
    locationImageUrl: (look as any).locationImageUrl || undefined,
    // Affiliate click counts per destination link (admin analytics).
    clicks: (look as any).clicks && typeof (look as any).clicks === "object" ? (look as any).clicks : undefined,
    curatorId: (look as any).curatorId,
    curatorName: curatorName || undefined,
    curatorPhotoUrl: curator?.photoUrl || undefined,
    curatorMotto: curator?.motto || undefined,
    productType: (look as any).productType ?? "real",
    featured: (look as any).featured === true, // admin-picked → shown in the About "3 steps"
    brand: ((look as any).brand?.trim() || detectBrand(look.name, (look as any).productNote, (look as any).campaignName)) ?? undefined,
    // Lingerie/swim: explicit flag wins; otherwise detect from name + brand + notes.
    lingerie,
    // Editorial category replaces brand as the top-level filter.
    category,
    aiCreated: (look as any).aiCreated === true,
    curatorNote: (look as any).curatorNote ?? undefined,
    commentsOff: (look as any).commentsOff === true,
    videoUrl: (look as any).videoUrl ?? undefined,
    videoCreatedAt: (look as any).videoCreatedAt ?? undefined,
    videoPosterUrl: (look as any).videoPosterUrl ?? undefined,
    tryOnImageUrl: tryOnImageUrl ?? (look as any).videoPosterUrl ?? undefined,
    communityTryOns,
    feedOrder: typeof (look as any).feedOrder === "number" ? (look as any).feedOrder : undefined,
    likeCount: (look as any).likeCount ?? 0,
    commentCount: (look as any).commentCount ?? 0,
    viewCount: (look as any).viewCount ?? 0,
    generationCount,
    createdAt: look.createdAt,
    imageUrl: primaryImageUrl,
    frontImageUrl: primaryImageUrl,
    frontImagePath: frontPath,
    backImageUrl: look.backImageUrl,
    // Only expose garment URLs that are fully-qualified http(s) links. Relative
    // paths (legacy/un-hydrated looks) would be fetched against the app origin and
    // return the HTML shell, which then gets sent to the AI as a bogus image.
    garmentFrontImageUrl: /^https?:\/\//i.test(look.garmentFrontImageUrl ?? "") ? look.garmentFrontImageUrl : undefined,
    garmentBackImageUrl: /^https?:\/\//i.test((look as any).garmentBackImageUrl ?? "") ? look.garmentBackImageUrl : undefined,
    galleryImageUrls,
    galleryImagePaths: cleanGalleryPaths
  };
}

function publicState(state: Awaited<ReturnType<typeof readTryThisLookState>>, preferredStoreSlug = "", preferredLookSlug = "", forAdmin = false) {
  const normalizedSlug = preferredStoreSlug.trim().toLowerCase();
  const normalizedLookSlug = normalizeSlug(preferredLookSlug);
  const globalActiveLook = getActiveTryThisLook(state);
  const globalActiveLooks = getActiveTryThisLooks(state);
  // Drafts (published === false) are never visible to store visitors — but admin sees all
  const visibleLooks = forAdmin ? state.looks : state.looks.filter((look) => look.published !== false);
  const storeLooks = normalizedSlug
    ? visibleLooks.filter((look) => look.storeSlug?.toLowerCase() === normalizedSlug)
    : [];
  const activeIds = new Set(state.activeLookIds?.length ? state.activeLookIds : [state.activeLookId]);
  const storeActiveLooks = normalizedSlug
    ? storeLooks.filter((look) => activeIds.has(look.id))
    : [];
  const preferredLook = normalizedLookSlug
    ? (normalizedSlug ? storeLooks : visibleLooks).find((look) => look.id === preferredLookSlug || normalizeSlug(look.name) === normalizedLookSlug)
    : undefined;
  const activeLook = normalizedSlug
    ? preferredLook ?? storeActiveLooks[0] ?? storeLooks[0] ?? globalActiveLook
    : preferredLook ?? globalActiveLook;
  const activeLooks = normalizedSlug
    ? storeActiveLooks.length ? storeActiveLooks : activeLook ? [activeLook] : []
    : globalActiveLooks;
  // Strip sensitive fields from stores for public response
  const publicStores = (state.stores ?? []).map(({ whatsappNumber: _wa, ...s }) => s);
  // Build per-look generation counts
  const genCountByLook = new Map<string, number>();
  for (const g of state.generations ?? []) {
    genCountByLook.set(g.lookId, (genCountByLook.get(g.lookId) ?? 0) + 1);
  }
  // Self-test try-on per look: the curator's OWN generation on their OWN look
  // (customerName slug matches the look's curator). Used as a feed carousel slide.
  const curatorSlugById = new Map<string, string>();
  for (const c of state.curators ?? []) {
    const nm = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
    if (nm) curatorSlugById.set(c.id, normalizeSlug(nm));
  }
  const curatorIdByLook = new Map<string, string>();
  for (const l of state.looks ?? []) {
    const cid = (l as any).curatorId;
    if (cid) curatorIdByLook.set(l.id, String(cid));
  }
  const selftestByLook = new Map<string, { url: string; at: string }>();
  for (const g of state.generations ?? []) {
    const url = (g as any).imageUrl;
    if (!url || (g as any).hidden || g.visitorId?.startsWith("admin-")) continue;
    const cid = curatorIdByLook.get(g.lookId);
    if (!cid) continue;
    if (normalizeSlug((g as any).customerName ?? "") !== curatorSlugById.get(cid)) continue;
    const at = String((g as any).createdAt ?? "");
    const prev = selftestByLook.get(g.lookId);
    if (!prev || at > prev.at) selftestByLook.set(g.lookId, { url, at }); // keep the newest
  }
  // Try-ons (consented, feed:true) shown as carousel slides AFTER the curator's
  // video + product image and BEFORE the dupes. Includes the curator's OWN try-ons
  // (with their video) and members'. Newest first (generations are newest-first).
  const communityByLook = new Map<string, { id?: string; imageUrl: string; videoUrl?: string; userPhotoUrl?: string; name?: string; isCurator?: boolean; hidden?: boolean; pending?: boolean; curatorId?: string; curatorPhotoUrl?: string }[]>();
  // Model attribution per try-on: the feed post must show the TRY-ON's model (assign-
  // generation sets gen.curatorId), not the look's owner. Legacy try-ons often carry
  // only the model's NAME (customerName) — resolve those to a curator by name slug so
  // the post links to HER profile (not the look owner's).
  const curatorPhotoById = new Map((state.curators ?? []).map(c => [c.id, ((c as any).photoUrl as string) || ""]));
  const curatorIdByName = new Map<string, string>();
  for (const c of state.curators ?? []) {
    const slug = normalizeSlug([c.firstName, c.lastName].filter(Boolean).join(" "));
    if (slug && !curatorIdByName.has(slug)) curatorIdByName.set(slug, c.id);
  }
  for (const g of state.generations ?? []) {
    const url = (g as any).imageUrl;
    // OPT-IN: a try-on is public ONLY if feed === true (an explicit checkbox). Admins
    // ALSO receive try-ons THEY deactivated (lockedByAdmin) — flagged hidden:true so the
    // card can show them as HIDDEN and let the admin re-activate. End-users never do.
    if (!url || (g as any).hidden || g.visitorId?.startsWith("admin-")) continue;
    // The reel feed is a PUBLIC surface: a member try-on shows here ONLY if an admin made
    // it fully public (`public === true`). "Community" try-ons (feed:true, public:false)
    // stay in the paid Community filter, NOT the public feed. Admins additionally receive
    // pending requests (to approve) and their own deactivated ones (to re-activate).
    const online = (g as any).public === true;
    const isPending = !online && ((g as any).publicRequested === true || (g as any).feedRequested === true);
    const isAdminHidden = !online && (g as any).lockedByAdmin === true;
    if (!online && !(forAdmin && (isPending || isAdminHidden))) continue;
    const cid = curatorIdByLook.get(g.lookId);
    const isCurator = !!(cid && normalizeSlug((g as any).customerName ?? "") === curatorSlugById.get(cid));
    const list = communityByLook.get(g.lookId) ?? [];
    if (list.length >= 12) continue;
    const genCuratorId = String((g as any).curatorId ?? "").trim()
      || curatorIdByName.get(normalizeSlug((g as any).customerName ?? "")) || "";
    list.push({ id: g.id, imageUrl: url, videoUrl: (g as any).videoUrl || undefined, userPhotoUrl: (g as any).userPhotoUrl || undefined, name: (g as any).customerName || undefined, isCurator, hidden: isAdminHidden, pending: isPending, curatorId: genCuratorId || undefined, curatorPhotoUrl: (genCuratorId && curatorPhotoById.get(genCuratorId)) || undefined });
    communityByLook.set(g.lookId, list);
  }
  const sl = (look: (typeof visibleLooks)[number]) => serializeLook(look, genCountByLook.get(look.id) ?? 0, state.partnerStores ?? [], state.curators ?? [], selftestByLook.get(look.id)?.url, communityByLook.get(look.id) ?? []);
  return {
    activeLook: activeLook ? sl(activeLook) : undefined,
    activeLooks: activeLooks.map(sl),
    stores: forAdmin ? (state.stores ?? []) : publicStores,
    looks: visibleLooks.map(sl),
    // Global try-on kill-switch (admin-toggleable). Clients show "coming soon" when true.
    tryonPaused: state.tryonPaused === true,
    // Admin-managed outfit gallery shown in the Try-On funnel.
    outfits: (state.outfits ?? []).map(o => ({ id: o.id, name: o.name, imageUrl: o.imageUrl || "", lookId: o.lookId || "" })).filter(o => o.imageUrl),
    // Admin-editable video prompt template for the funnel (@Bild1 = model, @Bild2 = outfit).
    funnelVideoPrompt: (state.funnelVideoPrompt ?? "").trim() || DEFAULT_FUNNEL_PROMPT,
  };
}

// Default Try-On funnel video prompt. @Bild1 = the model/avatar, @Bild2 = the chosen outfit.
// {ort} is auto-filled by the video route with a scene matching the look's category
// (business→luxury conference hotel, riviera→pool, boudoir→elegant interior, …).
// User's proven wording: the magic word "rumlaufen" makes her WALK + TURN (shows front+back);
// keep it NEUTRAL (no "360°"/"dreh um") so lingerie isn't moderation-rejected.
const DEFAULT_FUNNEL_PROMPT = "Mache die Frau aus @Bild1 angezogen in @Bild2. Lass die Frau {ort} rumlaufen, damit sie sich dreht und das Outfit von vorne und von hinten zeigt. Gesicht nicht ändern, Outfit @Bild2 exakt gleich lassen.";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const storeSlug = url.searchParams.get("store") ?? "";
    const lookSlug = url.searchParams.get("look") ?? "";
    const wantsAdminData = url.searchParams.get("admin") === "1";
    const state = await readTryThisLookState();
    if (wantsAdminData && !(await isAdmin(request))) {
      return NextResponse.json({ error: "Admin access required." }, { status: 401 });
    }
    // ── Reuse cache lookup ────────────────────────────────────────────────────
    // "Generate once, reuse forever": before the funnel spends a Pixverse credit it
    // asks whether this exact try-on already exists. Key = model × garment × motion.
    // A hit returns the stored (already re-signed) video so nobody regenerates it.
    // Own-photo try-ons don't come here (no curatorId) — the person differs every time.
    const comboParam = url.searchParams.get("combo") ?? "";
    if (comboParam) {
      const [cCurator, cLook, cMotionRaw] = comboParam.split("|");
      const cMotion = cMotionRaw === "dance" ? "dance" : "turn"; // default/legacy = turn
      const curatorId = (cCurator ?? "").trim();
      const lookId = (cLook ?? "").trim();
      if (!curatorId || !lookId) return NextResponse.json({ hit: false });
      // All pre-generated clips for this model×look×motion (incl. hidden-from-feed ones —
      // the funnel may still reuse them). Pick a RANDOM one so repeat visitors see variety.
      const matches = state.generations.filter((g) => {
        if ((g as any).reuseCopy || !(g as any).videoUrl) return false;
        if ((g as any).curatorId !== curatorId || g.lookId !== lookId) return false;
        const m = (g as any).motion === "dance" ? "dance" : "turn"; // missing = legacy turn
        return m === cMotion;
      });
      const hitGen = matches.length ? matches[Math.floor(Math.random() * matches.length)] : undefined;
      if (hitGen) {
        return NextResponse.json({
          hit: true,
          generationId: hitGen.id,
          videoUrl: (hitGen as any).videoUrl ?? "",
          posterUrl: (hitGen as any).imageUrl ?? "",
        });
      }
      // Fallback: no per-model try-on exists, but the LOOK itself has a video the admin
      // uploaded directly → serve THAT as the free try-on so directly-uploaded videos work
      // without building a model×look×motion generation for each.
      const look = state.looks.find(l => l.id === lookId) as any;
      if (look?.videoUrl) {
        return NextResponse.json({
          hit: true,
          generationId: `look:${lookId}`,
          videoUrl: look.videoUrl,
          posterUrl: look.videoPosterUrl || look.frontImageUrl || look.imageUrl || "",
        });
      }
      return NextResponse.json({ hit: false });
    }
    // Partner stores — read by the studio (curators) and the admin manager.
    // Admin sees the affiliate templates; curators get only what discovery needs.
    if (url.searchParams.get("partnerStores") === "1") {
      const stores = state.partnerStores ?? [];
      const studioAuth = await authorizeStudio(request);
      const out = studioAuth.isAdmin
        ? stores
        : stores.filter(s => s.enabled).map(({ affiliateTemplate, ...s }) => s);
      return NextResponse.json({ partnerStores: out });
    }
    // Admin: list curators (for management/cleanup).
    if (url.searchParams.get("curators") === "1") {
      if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
      // Per-model engagement for the admin list: comments on her posts, total views
      // (boost + real), and how many people tapped "See her in other looks".
      const nameSlugById = new Map((state.curators ?? []).map(c => [c.id, normalizeSlug([c.firstName, c.lastName].filter(Boolean).join(" "))]));
      const postLooksByCurator = new Map<string, Set<string>>();
      for (const c of state.curators ?? []) postLooksByCurator.set(c.id, new Set());
      for (const g of state.generations ?? []) {
        if ((g as any).feed !== true || (g as any).hidden) continue;
        const gname = normalizeSlug((g as any).customerName ?? "");
        for (const c of state.curators ?? []) {
          if ((g as any).curatorId === c.id || (gname && gname === nameSlugById.get(c.id))) {
            if (g.lookId) postLooksByCurator.get(c.id)!.add(g.lookId);
          }
        }
      }
      for (const l of state.looks ?? []) { // her own looks count too
        const cid = (l as any).curatorId;
        if (cid && postLooksByCurator.has(cid)) postLooksByCurator.get(cid)!.add(l.id);
      }
      const commentsByLook = new Map<string, number>();
      for (const c of state.comments ?? []) commentsByLook.set(c.lookId, (commentsByLook.get(c.lookId) ?? 0) + 1);
      const tryonClicksByLook = new Map<string, number>();
      for (const e of (state.events ?? []) as any[]) {
        if (e.event === "tryon_click" && e.lookId) tryonClicksByLook.set(e.lookId, (tryonClicksByLook.get(e.lookId) ?? 0) + 1);
      }
      const viewsByCuratorLooks = new Map<string, number>();
      for (const l of state.looks ?? []) {
        const cid = (l as any).curatorId;
        if (cid) viewsByCuratorLooks.set(cid, (viewsByCuratorLooks.get(cid) ?? 0) + ((l as any).viewCount ?? 0));
      }
      const curators = (state.curators ?? []).map(c => {
        const lookSet = postLooksByCurator.get(c.id) ?? new Set<string>();
        let commentCount = 0, tryonClicks = 0;
        for (const id of lookSet) { commentCount += commentsByLook.get(id) ?? 0; tryonClicks += tryonClicksByLook.get(id) ?? 0; }
        return { ...c, commentCount, tryonClicks, viewTotal: ((c as any).viewBoost ?? 0) + (viewsByCuratorLooks.get(c.id) ?? 0) };
      });
      return NextResponse.json({ curators });
    }
    // PUBLIC: the Models gallery. Only published models WITH a photo, PII stripped
    // (no email/address/credits). lookCount = how many SHARED (feed:true) try-ons the
    // Admin: feed video clips (for the About step-3 showcase picker).
    if (url.searchParams.get("feedclips") === "1") {
      if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin only." }, { status: 401 });
      const clips = (state.generations ?? [])
        .filter(g => (g as any).videoUrl && (g as any).imageUrl && !(g as any).hidden)
        .map(g => ({ id: g.id, poster: (g as any).imageUrl as string, video: (g as any).videoUrl as string, name: (g as any).customerName || (g as any).lookName || "", showcase: (g as any).showcase === true }))
        .sort((a, b) => (b.showcase ? 1 : 0) - (a.showcase ? 1 : 0));
      return NextResponse.json({ clips });
    }

    // Admin: lightweight list of all wardrobe garments (for the About showcase picker).
    if (url.searchParams.get("garments") === "1") {
      if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin only." }, { status: 401 });
      const garments = (state.looks ?? [])
        .filter(l => ((l as any).productType === "ai" || (l as any).wardrobe) && ((l as any).frontImageUrl || (l as any).imageUrl))
        .map(l => ({ id: l.id, name: l.name, img: ((l as any).frontImageUrl || (l as any).imageUrl) as string, featured: (l as any).featured === true, category: (l as any).category }))
        .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || a.name.localeCompare(b.name));
      return NextResponse.json({ garments });
    }

    // model appears in, matched by name.
    if (url.searchParams.get("models") === "1") {
      // Admins get hidden models too (to un-hide/manage) + editable fields (name parts, bio).
      const modelsAdmin = await isAdmin(request);
      const genCountByName = new Map<string, number>();
      for (const g of (state.generations ?? [])) {
        if ((g as any).feed !== true) continue;
        const nm = String((g as any).customerName ?? "").trim().toLowerCase();
        if (nm && nm !== "you") genCountByName.set(nm, (genCountByName.get(nm) ?? 0) + 1);
      }
      const models = (state.curators ?? [])
        // Public: only APPROVED (active) models. Admins also see pending applications
        // and hidden models so they can review/unhide them.
        .filter(c => (c as any).photoUrl && String((c as any).status ?? "active") !== "removed"
          && (modelsAdmin || (String((c as any).status ?? "active") === "active" && (c as any).hidden !== true)))
        .map(c => {
          const cc = c as any;
          const name = [cc.firstName, cc.lastName].filter(Boolean).join(" ").trim();
          return {
            id: cc.id,
            name,
            photoUrl: cc.photoUrl as string,
            style: typeof cc.style === "string" ? cc.style : "",
            hairColor: typeof cc.hairColor === "string" ? cc.hairColor : "",
            createdAt: typeof cc.createdAt === "string" ? cc.createdAt : "",
            pinned: cc.pinned === true, // admin-pinned → shown first in the Models grid
            featured: cc.featured === true, // featured → free showcase; others are locked (paid)
            realModel: cc.realModel === true, // a real person (not an AI persona) → "Real model" badge
            lookCount: genCountByName.get(name.toLowerCase()) ?? 0,
            ...(modelsAdmin ? {
              firstName: cc.firstName ?? "",
              lastName: cc.lastName ?? "",
              bio: cc.bio ?? "",
              motto: cc.motto ?? "",
              hidden: cc.hidden === true,
              chatPersona: cc.chatPersona ?? "",
              chatEnabled: cc.chatEnabled !== false,
              status: cc.status ?? "active", // pending applicants = "new" to review
            } : {}),
          };
        })
        .sort((a, b) => b.lookCount - a.lookCount || a.name.localeCompare(b.name));
      return NextResponse.json({ models });
    }
    // Provenance / history for a single feed post (a generation OR a look).
    // Powers the ℹ️ Info sheet in the reels feed — who made it, when, what kind.
    // PUBLIC: everyone may see the provenance. Internal moderation fields
    // (source/visitorId, feed status) are only included for admins.
    if (url.searchParams.get("postInfo")) {
      const admin = await isAdmin(request);
      const pid = String(url.searchParams.get("postInfo")).trim();
      const curators = state.curators ?? [];
      const curName = (cid?: string) => {
        const c = curators.find(x => x.id === cid);
        return c ? [c.firstName, c.lastName].filter(Boolean).join(" ").trim() : "";
      };
      const gen = (state.generations ?? []).find(g => g.id === pid);
      if (gen) {
        const g = gen as any;
        const kindRaw = g.genKind as ("photo" | "video" | "video360" | undefined);
        const media = g.videoUrl ? "video" : "picture";
        // videoKind: exact when captured (genKind), else best-effort from videoUrl.
        const videoKind = g.videoUrl ? (kindRaw === "video360" ? "video360" : "video") : null;
        return NextResponse.json({
          info: {
            kind: "tryon",
            createdAt: g.createdAt ?? null,
            who: g.customerName || curName(g.curatorId) || "Guest",
            curatorName: curName(g.curatorId) || null,
            isCurator: !!g.curatorId,
            media,
            videoKind,                       // "video" | "video360" | null
            genKindKnown: !!kindRaw,          // false → tier wasn't recorded (older post)
            hadUserPhoto: !!g.userPhotoUrl,   // a real photo upload (vs a pure AI render)
            lookName: g.lookName || "",
            storeName: g.storeName || "",
            // Admin-only moderation internals:
            ...(admin ? {
              source: g.visitorId || null,    // e.g. "shopcut-main", "admin-…"
              status: g.lockedByAdmin ? "Deactivated (admin)" : g.hidden ? "Deleted/Hidden" : g.feed !== false ? "In feed" : "Hidden",
            } : {}),
          },
        });
      }
      const look = state.looks.find(l => l.id === pid);
      if (look) {
        const l = look as any;
        const tryOns = Array.isArray(l.communityTryOns) ? l.communityTryOns.length : (l.generationCount ?? 0);
        return NextResponse.json({
          info: {
            kind: "look",
            createdAt: l.createdAt ?? null,
            who: l.curatorName || curName(l.curatorId) || "House",
            curatorName: l.curatorName || curName(l.curatorId) || null,
            isCurator: !!l.curatorId,
            aiCreated: !!l.aiCreated,          // made in the AI Studio (AI Cloud) vs sourced
            productType: l.productType || null, // "real" = real sourced product
            media: l.videoUrl ? "video" : "picture",
            videoCreatedAt: l.videoCreatedAt ?? null,
            lingerie: !!l.lingerie,
            brand: l.brand || null,
            price: l.price || null,
            buyUrl: l.buyUrl || null,
            likes: l.likeCount ?? 0,
            tryOns,
            lookName: l.name || "",
            storeName: l.storeName || "",
            ...(admin ? { status: l.published !== false ? "Published" : "Offline" } : {}),
          },
        });
      }
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }

    // Admin: lightweight recent-events poll for the live activity feed (no images,
    // no full state) — keeps the Insights "Live" stream cheap to refresh every few sec.
    if (url.searchParams.get("recentEvents")) {
      if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
      const n = Math.min(300, Math.max(1, Number(url.searchParams.get("recentEvents")) || 100));
      // viewsByDay: per-date view tallies so Insights can show in-range Views.
      return NextResponse.json({ events: (state.events ?? []).slice(0, n), viewsByDay: (state as any).viewsByDay ?? {}, visitsByDay: (state as any).visitsByDay ?? {} });
    }

    // Admin: ALL posts (generations) incl. hidden — for the admin posts grid.
    if (url.searchParams.get("adminPosts") === "1") {
      if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
      const lookById = new Map(state.looks.map(l => [l.id, l]));
      const posts = (state.generations ?? [])
        .filter(g => !(g as any).hidden) // hard-deleted stay out; feed:false (Hidden) is INCLUDED
        .map(g => {
          const look = lookById.get(g.lookId);
          return {
            id: g.id,
            lookId: g.lookId,
            imageUrl: (g as any).imageUrl ?? "",
            videoUrl: (g as any).videoUrl ?? undefined,
            customerName: (g as any).customerName ?? "",
            ownerEmail: (g as any).ownerEmail ?? "", // who actually generated it (blank = admin pre-gen)
            curatorId: (g as any).curatorId ?? "",
            lookName: g.lookName ?? look?.name ?? "",
            feed: (g as any).feed !== false,
            public: (g as any).public === true,
            views: (look as any)?.viewCount ?? 0, // views are tracked per look
            createdAt: g.createdAt,
          };
        })
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      return NextResponse.json({ posts });
    }
    // Preview a specific look by ID — bypasses published filter (anyone with the URL can preview)
    const previewLookId = url.searchParams.get("previewId") ?? "";
    if (previewLookId) {
      const look = state.looks.find(l => l.id === previewLookId);
      if (!look) return NextResponse.json({ error: "Look not found." }, { status: 404 });
      const looksGens = state.generations.filter(g => g.lookId === previewLookId && !(g as any).hidden && (g as any).imageUrl);
      // The funnel's default model: prefer a real UPLOADED "before" photo (an actual
      // person who tried this look on), else a try-on result — never the retailer's stock
      // product still. Independent of feed/public flags (reads every generation).
      const modelPhotoUrl = (looksGens.find(g => (g as any).userPhotoUrl) as any)?.userPhotoUrl
        || (looksGens[0] as any)?.imageUrl || "";
      return NextResponse.json({ look: { ...serializeLook(look, looksGens.length, state.partnerStores ?? [], state.curators ?? []), modelPhotoUrl }, isDraft: look.published === false, tryonPaused: state.tryonPaused === true });
    }

    // Admin: ALL comments across every look (for the admin inbox).
    if (url.searchParams.get("allComments") === "1") {
      if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
      const lookById = new Map(state.looks.map(l => [l.id, l]));
      const nameById = new Map((state.curators ?? []).map(c => [c.id, `${(c as any).firstName ?? ""} ${(c as any).lastName ?? ""}`.trim()]));
      const comments = (state.comments ?? [])
        .map(c => {
          const look = lookById.get(c.lookId);
          const curatorId = (look as any)?.curatorId ?? "";
          return {
            id: c.id, lookId: c.lookId, text: c.text, authorName: (c as any).authorName ?? "", createdAt: c.createdAt,
            parentId: (c as any).parentId ?? undefined, replyToName: (c as any).replyToName ?? undefined,
            lookName: look?.name ?? "", curatorId, curatorName: nameById.get(curatorId) || "",
          };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return NextResponse.json({ comments });
    }

    // Public comments for a specific look
    const wantsComments = url.searchParams.get("comments") === "1";
    const commentLookId = url.searchParams.get("lookId") ?? "";
    if (wantsComments && commentLookId) {
      const comments = (state.comments ?? [])
        .filter(c => c.lookId === commentLookId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return NextResponse.json({ comments });
    }

    // Public user-generated looks for a specific look
    const wantsUserLooks = url.searchParams.get("userLooks") === "1";
    const filterLookId = url.searchParams.get("lookId") ?? "";
    if (wantsUserLooks && filterLookId) {
      const userGenerations = state.generations
        // Show all non-hidden try-ons for this look, including curated admin-generated
        // example looks. Only an explicit `hidden` flag removes a post from the gallery.
        .filter(g => g.lookId === filterLookId && !(g as any).hidden)
        .map(g => ({
          id: g.id,
          lookId: g.lookId,
          imageUrl: (g as any).imageUrl ?? "",
          thumbUrl: toThumbUrl((g as any).imageUrl ?? ""),
          userPhotoUrl: (g as any).userPhotoUrl ?? undefined,
          customerName: (g as any).customerName ?? "",
          createdAt: g.createdAt,
        }));
      return NextResponse.json({ userLooks: userGenerations });
    }

    // Single generation by ID — for /post/[id] deep links
    const generationId = url.searchParams.get("generationId") ?? "";
    if (generationId) {
      const lookById = new Map(state.looks.map(l => [l.id, l]));
      const g = state.generations.find(gen => gen.id === generationId);
      if (!g || (g as any).hidden) return NextResponse.json({ error: "Post not found." }, { status: 404 });
      const look = lookById.get(g.lookId);
      const lookCuratorId = (look as any)?.curatorId ?? "";
      const lookCurator = lookCuratorId ? (state.curators ?? []).find(c => c.id === lookCuratorId) : undefined;
      return NextResponse.json({
        post: {
          id: g.id,
          lookId: g.lookId,
          imageUrl: (g as any).imageUrl ?? "",
          videoUrl: (g as any).videoUrl ?? undefined,
          userPhotoUrl: (g as any).userPhotoUrl ?? undefined,
          customerName: (g as any).customerName ?? "",
          userId: (g as any).userId ?? undefined,
          lookName: g.lookName ?? look?.name ?? "",
          // Public, licensing-safe label (curator description) — shown to users instead
          // of the real brand product name. Empty if the look has no description.
          lookTitle: ((look as any)?.curatorNote || (look as any)?.productNote || "").trim() || undefined,
          storeName: g.storeName ?? look?.storeName ?? "",
          storeSlug: (look as any)?.storeSlug ?? "",
          lookThumbUrl: look?.frontImageUrl ?? look?.imageUrl ?? "",
          curatorId: lookCuratorId || undefined,
          curatorName: lookCurator ? [lookCurator.firstName, lookCurator.lastName].filter(Boolean).join(" ") : undefined,
          creatorDeleted: (g as any).creatorDeleted ?? false,
          createdAt: g.createdAt,
        }
      });
    }

    // Global community feed — all recent public generations
    if (url.searchParams.get("community") === "1") {
      const lookById = new Map(state.looks.map(l => [l.id, l]));
      // Who's asking? Best-effort decode of the JWT email (no round-trip) + the curator
      // id header, so we can flag each post as `mine`. Only drives a UI button (the
      // owner's "Make AI-Video"), so a local decode is fine — we never expose ownerEmail.
      let myEmail = "";
      try {
        const tok = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
        if (tok) {
          const claims = JSON.parse(Buffer.from(tok.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
          myEmail = String(claims.email ?? "").trim().toLowerCase();
        }
      } catch { /* ignore */ }
      const myCuratorId = request.headers.get("x-curator-id")?.trim() ?? "";
      // Member try-ons are gated by VISIBILITY tier: a signed-in / curator / admin viewer
      // gets ALL shared (feed:true) try-ons (incl. Community-tier); an anonymous viewer gets
      // ONLY the fully-public ones (`public:true`). Boudoir/lingerie is no longer special.
      const adminViewer = await isAdmin(request);
      const viewerGated = !!myEmail || !!myCuratorId || adminViewer;
      // Model attribution (same rules as the looks payload): explicit gen.curatorId wins,
      // else resolve by customerName slug — so posts link to the try-on's model.
      const cPhotoById = new Map((state.curators ?? []).map(c => [c.id, ((c as any).photoUrl as string) || ""]));
      const cIdByName = new Map<string, string>();
      for (const c of state.curators ?? []) {
        const slug = normalizeSlug([c.firstName, c.lastName].filter(Boolean).join(" "));
        if (slug && !cIdByName.has(slug)) cIdByName.set(slug, c.id);
      }
      const community = state.generations
        .filter(g => {
          if (!(g as any).imageUrl || (g as any).hidden) return false;
          const shared = (g as any).feed === true; // OPT-IN: only explicit feed===true is in the pool
          if (!shared) return adminViewer; // PRIVATE tier — the admin's "Private" chip sees it
          const isPublic = (g as any).public === true;
          if (!viewerGated && !isPublic) return false; // anonymous: only admin-published try-ons
          return true;
        })
        .slice(0, 200)
        .map(g => {
          const look = lookById.get(g.lookId);
          const ownerEmail = String((g as any).ownerEmail ?? "").trim().toLowerCase();
          const mine = (!!myEmail && ownerEmail === myEmail) || (!!myCuratorId && String((g as any).curatorId ?? "") === myCuratorId);
          return {
            id: g.id,
            lookId: g.lookId,
            imageUrl: (g as any).imageUrl ?? "",
            thumbUrl: toThumbUrl((g as any).imageUrl ?? ""),
            videoUrl: (g as any).videoUrl ?? undefined,
            brand: detectBrand(g.lookName ?? look?.name, (look as any)?.productNote) ?? undefined,
            // Editorial category + lingerie come from the source look, so the feed can
            // hide Boudoir try-ons from "All" too (not just the looks).
            category: look ? categorizeLook(look as any) : undefined,
            lingerie: look ? (typeof (look as any).lingerie === "boolean" ? (look as any).lingerie : isIntimateName([(look as any).name, (look as any).brand, (look as any).campaignName, (look as any).productNote].filter(Boolean).join(" "))) : undefined,
            // Admin "fully unlocked" → visible to everyone in "All" (not just gated Community).
            public: (g as any).public === true,
            // Moderation tier — drives the All | Community | Private chips.
            visibility: (g as any).feed !== true ? "private" : ((g as any).public === true ? "public" : "community"),
            pinned: (g as any).pinned === true, // admin-pinned → first in grid + reel
            animated: (g as any).animated === true, // admin-picked → tile PLAYS in the grid
            // Public, licensing-safe label (curator description) — shown instead of the
            // real brand product name. Empty when the look has no description.
            lookTitle: look ? (((look as any).curatorNote || (look as any).productNote || "").trim() || undefined) : undefined,
            // The original uploaded photo → the feed shows it as the "Before" slide.
            userPhotoUrl: (g as any).userPhotoUrl ?? undefined,
            customerName: (g as any).customerName ?? "",
            curatorId: String((g as any).curatorId ?? "").trim()
              || cIdByName.get(normalizeSlug((g as any).customerName ?? "")) || "",
            curatorPhotoUrl: (() => {
              const cid = String((g as any).curatorId ?? "").trim() || cIdByName.get(normalizeSlug((g as any).customerName ?? "")) || "";
              return (cid && cPhotoById.get(cid)) || undefined;
            })(),
            mine, // this post belongs to the signed-in user → show owner-only actions
            lookName: g.lookName ?? look?.name ?? "",
            storeName: g.storeName ?? look?.storeName ?? "",
            storeSlug: (look as any)?.storeSlug ?? "",
            createdAt: g.createdAt,
          };
        });
      return NextResponse.json({ community });
    }

    // Public user gallery — all generations by a given username slug
    // Try-ons attributed to a curator ACCOUNT (by curatorId), regardless of the
    // display name typed during the try-on. Also includes name-matched ones so
    // legacy self-tests still appear. Exposes the try-on video when present.
    const curatorTryonsId = url.searchParams.get("curatorTryons") ?? "";
    if (curatorTryonsId) {
      // manage=1 (the studio "My try-ons") sees ALL incl. hidden (to toggle them);
      // the PUBLIC profile excludes feed:false (Hidden) so they don't leak publicly.
      const manage = url.searchParams.get("manage") === "1";
      const cur = (state.curators ?? []).find(c => c.id === curatorTryonsId);
      const nameSlug = cur ? normalizeSlug([cur.firstName, cur.lastName].filter(Boolean).join(" ")) : "";
      const matched = state.generations.filter(g => {
        if (g.visitorId?.startsWith("admin-") || (g as any).hidden) return false;
        if (!manage && (g as any).feed !== true) return false; // OPT-IN: public profile shows only feed===true
        if ((g as any).curatorId === curatorTryonsId) return true;
        return nameSlug && normalizeSlug((g as any).customerName ?? "") === nameSlug;
      });
      const lookById = new Map(state.looks.map(l => [l.id, l]));
      const userGallery = matched.map(g => {
        const look = lookById.get(g.lookId);
        return {
          id: g.id,
          lookId: g.lookId,
          imageUrl: (g as any).imageUrl ?? "",
          videoUrl: (g as any).videoUrl ?? undefined,
          feed: (g as any).feed === true,
          public: (g as any).public === true,
          lockedByAdmin: !!(g as any).lockedByAdmin,
          customerName: (g as any).customerName ?? "",
          lookName: g.lookName ?? look?.name ?? "",
          storeName: g.storeName ?? look?.storeName ?? "",
          lookThumbUrl: look?.frontImageUrl ?? look?.imageUrl ?? "",
          createdAt: g.createdAt,
        };
      });
      return NextResponse.json({ userGallery, displayName: cur ? [cur.firstName, cur.lastName].filter(Boolean).join(" ") : "" });
    }

    // A logged-in user's OWN try-ons, bound by email at generation time (incl. the
    // Instagram-funnel ones that never got an alias, and Hidden/unpublished ones —
    // it's their own account). Auth required: we never list a gallery by guessed email.
    if (url.searchParams.get("mine") === "1") {
      const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
      // Admins (PIN or allowlisted Supabase session) also see their own admin-generated
      // try-ons (visitorId "admin-…") — those aren't email-bound, so mine=1 would miss them.
      const admin = await isAdmin(request);
      let email = "";
      if (token) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "") ?? "";
        const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "").trim();
        const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: `Bearer ${token}` } });
        if (userRes.ok) {
          const u = await userRes.json() as { email?: string };
          email = (u.email ?? "").trim().toLowerCase();
        }
      }
      if (!email && !admin) return NextResponse.json({ mine: [] });
      const lookById = new Map(state.looks.map(l => [l.id, l]));
      const mine = state.generations
        .filter(g => {
          const owner = String((g as any).ownerEmail ?? "").trim().toLowerCase();
          // Admin's own try-ons: the funnel tags self-generated ones with an "admin-"
          // visitorId or the default customerName "You" (no Supabase session at gen time).
          const isAdminGen = !!g.visitorId?.startsWith("admin-")
            || String((g as any).customerName ?? "").trim().toLowerCase() === "you";
          return (!!email && owner === email) || (admin && isAdminGen);
        })
        .map(g => {
          const look = lookById.get(g.lookId);
          return {
            id: g.id,
            lookId: g.lookId,
            imageUrl: (g as any).imageUrl ?? "",
            videoUrl: (g as any).videoUrl ?? "",
            genKind: (g as any).genKind ?? "",
            userPhotoUrl: (g as any).userPhotoUrl ?? undefined,
            customerName: (g as any).customerName ?? "",
            lookName: g.lookName ?? look?.name ?? "",
            storeName: g.storeName ?? look?.storeName ?? "",
            lookThumbUrl: look?.frontImageUrl ?? look?.imageUrl ?? "",
            published: (g as any).feed !== false && !(g as any).hidden,
            public: (g as any).public === true,
            feedRequested: (g as any).feedRequested === true,
            publicRequested: (g as any).publicRequested === true,
            createdAt: g.createdAt,
          };
        });
      return NextResponse.json({ mine });
    }

    const filterUsername = url.searchParams.get("username") ?? "";
    if (filterUsername) {
      const querySlug = normalizeSlug(filterUsername);
      const matched = state.generations.filter(g => {
        const name = (g as any).customerName ?? "";
        // Public profile → exclude Hidden (feed:false) try-ons so they don't leak.
        return name && normalizeSlug(name) === querySlug && !g.visitorId?.startsWith("admin-") && !(g as any).hidden && (g as any).feed === true;
      });
      const lookById = new Map(state.looks.map(l => [l.id, l]));
      const userGallery = matched.map(g => {
        const look = lookById.get(g.lookId);
        return {
          id: g.id,
          lookId: g.lookId,
          imageUrl: (g as any).imageUrl ?? "",
          userPhotoUrl: (g as any).userPhotoUrl ?? undefined,
          customerName: (g as any).customerName ?? "",
          lookName: g.lookName ?? look?.name ?? "",
          storeName: g.storeName ?? look?.storeName ?? "",
          storeSlug: (look as any)?.storeSlug ?? "",
          lookThumbUrl: look?.frontImageUrl ?? look?.imageUrl ?? "",
          createdAt: g.createdAt,
        };
      });
      // Resolve a matching curator account so the profile can show their bio/photo/links.
      const cur = (state.curators ?? []).find(c => normalizeSlug([c.firstName, c.lastName].filter(Boolean).join(" ")) === querySlug);
      const displayName = cur ? [cur.firstName, cur.lastName].filter(Boolean).join(" ") : (matched[0] ? ((matched[0] as any).customerName ?? filterUsername) : filterUsername);
      return NextResponse.json({
        userGallery,
        displayName,
        bio: (cur as any)?.bio || (cur as any)?.motto || null,
        photoUrl: (cur as any)?.photoUrl || null,
        website: (cur as any)?.website || null,
        instagram: (cur as any)?.instagram || null,
        curatorId: cur?.id || null,
      });
    }

    // Admins (valid pin/session) get the full feed incl. hidden (published:false) looks so
    // they can still see & un-hide them; end-users never receive hidden looks.
    if (!wantsAdminData) {
      const base = publicState(state, storeSlug, lookSlug, await isAdmin(request));
      // Outfits + funnel prompt come from their own blob (safe from other saves).
      const outfitsBlob = await readOutfits();
      (base as any).outfits = outfitsBlob.outfits.map(o => ({ id: o.id, name: o.name, imageUrl: o.imageUrl || "", lookId: o.lookId || "" })).filter(o => o.imageUrl);
      (base as any).funnelVideoPrompt = (outfitsBlob.funnelVideoPrompt ?? "").trim() || DEFAULT_FUNNEL_PROMPT;
      return NextResponse.json(base);
    }

    // Admin: optionally also return Supabase Auth users
    const wantsAuthUsers = url.searchParams.get("authUsers") === "1";
    if (wantsAuthUsers) {
      const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/^["']|["']$/g, "");
      const supabaseUrl = rawUrl
        ? (rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`).replace(/\/rest\/v1\/?$/, "").replace(/\/storage\/v1\/?$/, "").replace(/\/$/, "")
        : "";
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
      if (!supabaseUrl || !serviceKey) {
        return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });
      }
      const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=1000`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
      });
      if (!authRes.ok) {
        const e = await authRes.json().catch(() => null);
        return NextResponse.json({ error: e?.message ?? "Could not load auth users." }, { status: authRes.status });
      }
      const authData = await authRes.json();
      return NextResponse.json({ authUsers: authData.users ?? [] });
    }

    return NextResponse.json({
      ...publicState(state, storeSlug, lookSlug, true),
      events: state.events,
      leads: state.leads,
      generations: state.generations
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Try This Look could not be loaded." },
      { status: 500 }
    );
  }
}

// Remove ALL storage assets a generation owns — the generated image AND the uploaded
// "before" photo — so deleting a try-on doesn't leave orphaned files in the bucket.
// (Videos live on external providers, not our bucket; deleteTryThisLookImage no-ops on
// non-"try-this-look/" paths anyway.) allSettled so one failure can't block the delete.
async function purgeGenerationAssets(gen: any) {
  const paths = [gen?.imagePath, gen?.userPhotoPath].filter(Boolean).map(String);
  await Promise.allSettled(paths.map(p => deleteTryThisLookImage(p)));
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      action?: string;
      id?: string;
      name?: string;
      campaignName?: string;
      storeName?: string;
      storeSlug?: string;
      storeAddress?: string;
      whatsappNumber?: string;
      availableSizes?: string[];
      price?: string;
      salePrice?: string;
      discountLabel?: string;
      dealEndsAt?: string;
      inStock?: boolean;
      published?: boolean;
      availabilityNote?: string;
      deliveryTime?: string;
      productNote?: string;
      hashtags?: string;
      productType?: string;
      aiCreated?: boolean;
      userPhotoImage?: string;
      image?: string;
      text?: string;
      authorName?: string;
      frontImage?: string;
      backImage?: string;
      modelImage?: string;
      garmentFrontImage?: string;
      garmentBackImage?: string;
      galleryImages?: string[];
      keepGalleryIndexes?: number[];
      keepGalleryImageUrls?: string[];
      keepGalleryPaths?: string[];
      frontImagePath?: string;
      lookId?: string;
      event?: string;
      email?: string;
      instagram?: string;
      visitorId?: string;
      customerName?: string;
      curatorId?: string;
      phone?: string;
      campaignId?: string;
      lookName?: string;
      selectedSize?: string;
      buyingPreference?: string;
      leadSource?: string;
      marketingConsent?: boolean;
      uploadedPhoto?: string;
      status?: string;
      utmSource?: string;
      utmCampaign?: string;
      // Seller AI management
      aiEnabled?: boolean;
      aiCreditsLimit?: number;
      resetCredits?: boolean;
      onlyUntagged?: boolean;
      ids?: unknown[];
    };

    const state = await readTryThisLookState();
    const now = new Date().toISOString();
    const adminRequest = (await isAdmin(request));
    const ps = (s: typeof state) => publicState(s, "", "", adminRequest);

    if (payload.action === "event") {
      const activeLook = getActiveTryThisLook(state);
      const lookId = payload.lookId || activeLook.id;
      const eventName = String(payload.event ?? "").trim();
      if (!eventName) return NextResponse.json({ error: "Event name is missing." }, { status: 400 });

      // Geo (Vercel edge headers; undefined in local dev) — for the country breakdown.
      const country = (request.headers.get("x-vercel-ip-country") || "").trim().toUpperCase() || undefined;
      const city = (() => {
        const raw = (request.headers.get("x-vercel-ip-city") || "").trim();
        try { return raw ? decodeURIComponent(raw) : undefined; } catch { return raw || undefined; }
      })();
      // Traffic source: explicit utm/source wins; else classify the referrer host.
      const utmSource = String(payload.utmSource ?? "").trim();
      const referrer = String(payload.referrer ?? request.headers.get("referer") ?? "").trim();
      const source = (() => {
        const explicit = (String(payload.source ?? "").trim() || utmSource).toLowerCase();
        if (explicit) return explicit;
        if (!referrer) return "direct";
        try {
          const host = new URL(referrer).hostname.replace(/^www\./, "");
          if (/instagram|ig\.me|l\.instagram/.test(host)) return "instagram";
          if (/facebook|fb\.|fb\.me/.test(host)) return "facebook";
          if (/tiktok/.test(host)) return "tiktok";
          if (/t\.co|twitter|x\.com/.test(host)) return "twitter";
          if (/google|bing|duckduckgo/.test(host)) return "search";
          if (/luxurybandit/.test(host)) return "direct";
          return host;
        } catch { return "direct"; }
      })();

      state.events.unshift({
        id: `${Date.now()}-${crypto.randomUUID()}`,
        name: eventName,
        lookId,
        createdAt: now,
        userAgent: request.headers.get("user-agent") ?? undefined,
        campaignId: String(payload.campaignId ?? "").trim() || lookId,
        storeName: String(payload.storeName ?? "").trim() || activeLook.storeName,
        lookName: String(payload.lookName ?? "").trim() || activeLook.name,
        selectedSize: String(payload.selectedSize ?? "").trim() || undefined,
        utmSource: utmSource || undefined,
        utmCampaign: String(payload.utmCampaign ?? "").trim() || undefined,
        source,
        country,
        city,
        productLabel: String(payload.productLabel ?? "").trim() || undefined,
        productLink: String(payload.productLink ?? "").trim() || undefined,
        productThumb: String(payload.productThumb ?? "").trim() || undefined,
        slide: Number(payload.slide) > 0 ? Number(payload.slide) : undefined,
        slides: Number(payload.slides) > 0 ? Number(payload.slides) : undefined,
        visitor: String(payload.visitor ?? "").trim().slice(0, 80) || undefined,
        internal: (payload as any).internal === true || undefined,
      });

      const updatedState = await saveTryThisLookState(state);
      return NextResponse.json(ps(updatedState));
    }

    // Feed view tracking (real impressions) — fired when a post becomes the active
    // reel. The displayed feed counts are seeded social proof; this is the real number.
    if (payload.action === "view") {
      // Admin/test sessions send internal:true → don't inflate the real view count.
      if ((payload as any).internal === true) return NextResponse.json({ ok: true, skipped: "internal" });
      const lookId = String(payload.lookId ?? "").trim();
      const look = state.looks.find(l => l.id === lookId);
      if (look) {
        (look as any).viewCount = ((look as any).viewCount ?? 0) + 1;
        // Per-DAY view tally (one key per date, not per view) → lets Insights show
        // views for Today / 7d / 30d without flooding the event log. Lifetime total
        // stays in the per-look viewCount above.
        const dayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
        const vbd = ((state as any).viewsByDay ??= {}) as Record<string, number>;
        vbd[dayKey] = (vbd[dayKey] ?? 0) + 1;
        await saveTryThisLookState(state);
      }
      return NextResponse.json({ ok: true });
    }

    // Site VISIT: a landing on the home/feed (once per session, client-guarded). Counts the
    // ad traffic that never opens a reel — reconciles Insights with the ad's page-views.
    if (payload.action === "visit") {
      if ((payload as any).internal === true) return NextResponse.json({ ok: true, skipped: "internal" });
      const dayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
      const vbd = ((state as any).visitsByDay ??= {}) as Record<string, number>;
      vbd[dayKey] = (vbd[dayKey] ?? 0) + 1;
      await saveTryThisLookState(state);
      return NextResponse.json({ ok: true });
    }

    // Affiliate click tracking: count taps on a product "Shop now" / escape "Ansehen"
    // link, keyed by the destination URL, so the curator sees which dupes/places perform.
    if (payload.action === "click") {
      const lookId = String(payload.lookId ?? "").trim();
      const link = String((payload as any).link ?? "").trim();
      const look = state.looks.find(l => l.id === lookId);
      if (look && link) {
        const clicks = ((look as any).clicks ??= {} as Record<string, number>);
        clicks[link] = (clicks[link] ?? 0) + 1;
        await saveTryThisLookState(state);
      }
      return NextResponse.json({ ok: true });
    }

    if (payload.action === "like") {
      const lookId = String(payload.lookId ?? "").trim();
      // The feed sends `delta` (+1 like / -1 unlike); older callers used `liked`.
      // Reading the wrong field made every like DECREMENT the count (a real bug).
      const liked = typeof (payload as any).delta === "number"
        ? (payload as any).delta > 0
        : !!(payload as any).liked;
      const delta = liked ? 1 : -1;
      const look = state.looks.find(l => l.id === lookId);
      if (look) {
        // The displayed likeCount is a seeded VANITY number (social proof). A single
        // real like is invisible at 62k — so we ALSO log every real like as an event,
        // giving the funnel Insights a true, separate like tally (like try-on/bandit).
        (look as any).likeCount = Math.max(0, ((look as any).likeCount ?? 0) + delta);
        if (liked) {
          state.events.unshift({
            id: `${Date.now()}-${crypto.randomUUID()}`,
            name: "like_click", lookId, createdAt: now,
            lookName: look.name,
          } as any);
          notifyAdminWhatsApp(`❤️ New like on "${look.name}" (${(look as any).likeCount} total). ${ADMIN_URL}`);
        }
        await saveTryThisLookState(state);
      }
      return NextResponse.json({ likeCount: (look as any)?.likeCount ?? 0 });
    }

    if (payload.action === "lead") {
      const activeLook = getActiveTryThisLook(state);
      const lookId = payload.lookId || activeLook.id;
      const email = String(payload.email ?? "").trim();
      const instagram = String(payload.instagram ?? "").trim();
      const visitorId = String(payload.visitorId ?? "").trim();
      const customerName = String(payload.customerName ?? "").trim();
      const phone = String(payload.phone ?? "").trim();
      const selectedSize = String(payload.selectedSize ?? "").trim();
      const buyingPreference = String(payload.buyingPreference ?? "").trim();
      const leadSource = String(payload.leadSource ?? "").trim();
      const uploadedPhotoPath = payload.uploadedPhoto?.startsWith("data:image/")
        ? await uploadTryThisLookImage("uploads", payload.uploadedPhoto)
        : undefined;
      if (!email && !instagram && !phone && !customerName && !selectedSize && leadSource !== "whatsapp") {
        return NextResponse.json({ error: "Name, phone, email, or Instagram handle is required." }, { status: 400 });
      }

      // Only invite a given email once (across all its prior leads).
      const alreadyInvited = !!email && state.leads.some(l => (l.email ?? "").toLowerCase() === email.toLowerCase() && (l as any).curatorInviteSent);

      state.leads.unshift({
        id: `${Date.now()}-${crypto.randomUUID()}`,
        lookId,
        visitorId: visitorId || undefined,
        name: customerName || undefined,
        phone: phone || undefined,
        email: email || undefined,
        instagram: instagram || undefined,
        selectedSize: selectedSize || undefined,
        buyingPreference: buyingPreference === "delivery" ? "delivery" : buyingPreference === "pickup" ? "pickup" : undefined,
        leadSource: leadSource || undefined,
        marketingConsent: Boolean(payload.marketingConsent),
        uploadedPhotoPath,
        status: "new",
        createdAt: now
      });

      state.events.unshift({
        id: `${Date.now()}-${crypto.randomUUID()}`,
        name: "lead_submitted",
        lookId,
        createdAt: now,
        userAgent: request.headers.get("user-agent") ?? undefined,
        campaignId: String(payload.campaignId ?? "").trim() || lookId,
        storeName: String(payload.storeName ?? "").trim() || activeLook.storeName,
        lookName: String(payload.lookName ?? "").trim() || activeLook.name,
        selectedSize: selectedSize || undefined,
        utmSource: String(payload.utmSource ?? "").trim() || undefined,
        utmCampaign: String(payload.utmCampaign ?? "").trim() || undefined
      });

      // The free try-on is the entry point — capture the email AND nudge them to
      // become a (paid) curator, once per email. Mark the lead before saving so the
      // dedupe survives; the send itself never throws (no-ops without RESEND_API_KEY).
      if (email) (state.leads[0] as any).curatorInviteSent = true;

      const updatedState = await saveTryThisLookState(state);

      const leadLook = state.looks.find(l => l.id === lookId);
      notifyAdminWhatsApp(`📩 New lead${customerName ? ` from ${customerName}` : ""}${phone ? ` (${phone})` : email ? ` (${email})` : instagram ? ` (@${instagram})` : ""} on "${leadLook?.name ?? "a look"}"${selectedSize ? ` · size ${selectedSize}` : ""}. ${ADMIN_URL}`);

      if (email && !alreadyInvited) await sendCuratorInviteEmail(email, customerName);

      return NextResponse.json(ps(updatedState));
    }

    if (payload.action === "update-lead-status") {
      if (!(await isAdmin(request))) {
        return NextResponse.json({ error: "Admin access required." }, { status: 401 });
      }
      const leadId = String(payload.id ?? "");
      const status = String(payload.status ?? "");
      if (!["new", "contacted", "closed"].includes(status)) {
        return NextResponse.json({ error: "Lead status is invalid." }, { status: 400 });
      }
      if (!state.leads.some((lead) => lead.id === leadId)) {
        return NextResponse.json({ error: "Lead was not found." }, { status: 404 });
      }

      state.leads = state.leads.map((lead) =>
        lead.id === leadId ? { ...lead, status: status as "new" | "contacted" | "closed" } : lead
      );
      const updatedState = await saveTryThisLookState(state);
      return NextResponse.json({
        ...ps(updatedState),
        events: updatedState.events,
        leads: updatedState.leads,
        generations: updatedState.generations
      });
    }

    // Edit a lead (email-gate signup): admin can set/correct the name and/or status.
    if (payload.action === "update-lead") {
      if (!(await isAdmin(request))) {
        return NextResponse.json({ error: "Admin access required." }, { status: 401 });
      }
      const leadId = String(payload.id ?? "");
      if (!state.leads.some((lead) => lead.id === leadId)) {
        return NextResponse.json({ error: "Lead was not found." }, { status: 404 });
      }
      const hasName = Object.prototype.hasOwnProperty.call(payload, "name");
      const nextStatus = String((payload as any).status ?? "");
      const statusValid = ["new", "contacted", "closed"].includes(nextStatus);
      state.leads = state.leads.map((lead) =>
        lead.id === leadId
          ? {
              ...lead,
              ...(hasName ? { name: String((payload as any).name ?? "").trim() } : {}),
              ...(statusValid ? { status: nextStatus as "new" | "contacted" | "closed" } : {}),
            }
          : lead
      );
      const updatedState = await saveTryThisLookState(state);
      return NextResponse.json({
        ...ps(updatedState),
        events: updatedState.events,
        leads: updatedState.leads,
        generations: updatedState.generations
      });
    }

    if (payload.action === "delete-lead") {
      if (!(await isAdmin(request))) {
        return NextResponse.json({ error: "Admin access required." }, { status: 401 });
      }
      const leadId = String(payload.id ?? "");
      const leadToDelete = state.leads.find((lead) => lead.id === leadId);
      if (!leadToDelete) {
        return NextResponse.json({ error: "Lead was not found." }, { status: 404 });
      }

      state.leads = state.leads.filter((lead) => lead.id !== leadId);
      if (leadToDelete.uploadedPhotoPath) {
        await deleteTryThisLookImage(leadToDelete.uploadedPhotoPath);
      }

      const updatedState = await saveTryThisLookState(state, { deletedLeadIds: [leadId] });
      return NextResponse.json({
        ...ps(updatedState),
        events: updatedState.events,
        leads: updatedState.leads,
        generations: updatedState.generations
      });
    }

    if (payload.action === "generation") {
      const lookId = payload.lookId || getActiveTryThisLook(state).id;
      const activeLook = getActiveTryThisLook(state);
      if (!payload.image?.startsWith("data:image/")) {
        return NextResponse.json({ error: "Generated image is missing." }, { status: 400 });
      }

      const imagePath = await uploadTryThisLookImage("generations", payload.image);
      const userPhotoPath = payload.userPhotoImage?.startsWith("data:image/")
        ? await uploadTryThisLookImage("generations", payload.userPhotoImage)
        : undefined;
      // The funnel generates from a model/before photo passed as a URL (not a base64
      // upload) — keep it so the Before/After slide works. Hydration extracts + re-signs the
      // storage path from this URL on every read (falls back to the raw URL for externals).
      const beforePhotoUrl = !userPhotoPath && typeof payload.userPhotoUrl === "string" && /^https?:\/\//.test(payload.userPhotoUrl)
        ? payload.userPhotoUrl
        : undefined;
      const generationId = `${Date.now()}-${crypto.randomUUID()}`;
      // ── Publish gate ──────────────────────────────────────────────────────
      // A try-on NEVER goes public on the user's own action. If the user opted in
      // (payload.feed === true) it becomes a REQUEST (feedRequested) that an admin must
      // approve. Only an admin publishing (their own or an approval) sets feed:true.
      const creatorIsAdmin = await isAdmin(request);
      const wantsPublish = payload.feed === true;
      state.generations.unshift({
        id: generationId,
        lookId,
        visitorId: String(payload.visitorId ?? "").trim() || undefined,
        storeName: String(payload.storeName ?? "").trim() || activeLook.storeName,
        lookName: String(payload.lookName ?? "").trim() || activeLook.name,
        customerName: String(payload.customerName ?? "").trim() || undefined,
        userId: String(payload.userId ?? "").trim() || undefined,
        // The email this try-on belongs to (the gate email / logged-in email). Lets the
        // owner find + delete it from their account later, even if they never set an alias.
        ownerEmail: String(payload.ownerEmail ?? "").trim().toLowerCase() || undefined,
        curatorId: String(payload.curatorId ?? "").trim() || undefined,
        // Provable active consents — whether the user ticked each box, the exact wording
        // they agreed to, and when. publish = may be published; rights = may use the photo.
        publishConsent: payload.publishConsent === true,
        consentTimestamp: String(payload.consentTimestamp ?? "").trim() || undefined,
        consentText: String(payload.consentText ?? "").trim() || undefined,
        rightsConsent: payload.rightsConsent === true,
        rightsConsentText: String(payload.rightsConsentText ?? "").trim() || undefined,
        imagePath,
        userPhotoPath,
        ...(beforePhotoUrl ? { userPhotoUrl: beforePhotoUrl } : {}),
        // Which try-on tier produced this (for the post-info history): photo | video | video360.
        genKind: (["photo", "video", "video360"].includes(String(payload.genKind))
          ? String(payload.genKind)
          : "photo") as "photo" | "video" | "video360",
        // Publish gate: admin opt-in publishes immediately; everyone else's opt-in is a
        // pending REQUEST (feed stays false until an admin approves it).
        feed: creatorIsAdmin && wantsPublish,
        feedRequested: (!creatorIsAdmin && wantsPublish) || undefined,
        // Reuse cache key: the motion this video was made with (turn | dance). Lets an
        // identical (model × garment × motion) try-on be served from storage instead of
        // regenerated. See the ?combo= lookup in GET.
        ...(["turn", "dance"].includes(String(payload.motion)) ? { motion: String(payload.motion) as "turn" | "dance" } : {}),
        createdAt: now
      } as any);
      state.events.unshift({
        id: `${Date.now()}-${crypto.randomUUID()}`,
        name: "generation_success",
        lookId,
        createdAt: now,
        userAgent: request.headers.get("user-agent") ?? undefined
      });

      // ── Pay the REAL model ───────────────────────────────────────────────
      // Try-on earning is a TINY promo bonus only (real earnings come from paid chat) — it
      // just rewards a real model for sharing her link. When a genuine USER (not admin) makes
      // a VIDEO try-on with her photo, credit a small amount. Photos never earn (no self-farm);
      // and a user must have paid for the video credit, so it can't be farmed for free.
      // Rate via MODEL_EARNING_PER_TRYON_CENTS (default 5¢).
      try {
        const cid = String(payload.curatorId ?? "").trim();
        const isVideo = ["video", "video360"].includes(String(payload.genKind));
        if (cid && isVideo && !creatorIsAdmin) {
          const m = (state.curators ?? []).find(c => c.id === cid) as any;
          if (m && m.realModel === true) {
            const cents = Math.max(0, Number(process.env.MODEL_EARNING_PER_TRYON_CENTS ?? 5));
            m.earningsCents = Math.max(0, Number(m.earningsCents ?? 0)) + cents;
            m.earningsLog = [{ cents, at: now, lookName: String(payload.lookName ?? "").trim() || undefined }, ...(Array.isArray(m.earningsLog) ? m.earningsLog : [])].slice(0, 500);
          }
        }
      } catch { /* earnings are best-effort — never block the generation */ }

      const updatedState = await saveTryThisLookState(state);

      // ── WhatsApp notification to admin (non-blocking) ────────────────────
      const waPhone = process.env.ADMIN_WHATSAPP_PHONE?.trim();
      const waKey = process.env.CALLMEBOT_API_KEY?.trim();
      if (waPhone && waKey) {
        const customerName = String(payload.customerName ?? "").trim();
        const lookName = activeLook.name ?? "";
        const msg = `🛍️ New try-on${customerName ? ` by ${customerName}` : ""} on "${lookName}". Review: ${ADMIN_URL}`;
        fetch(`https://api.callmebot.com/whatsapp.php?phone=${waPhone}&text=${encodeURIComponent(msg)}&apikey=${waKey}`)
          .catch(() => {}); // fire-and-forget, never blocks the response
      }

      // Signed URL of the just-saved try-on so the client can show it in the email.
      const imageUrl = await getSignedUrl(imagePath).catch(() => "");
      return NextResponse.json({ ...ps(updatedState), generationId, imageUrl });
    }

    // Attach a finished try-on video to a gallery generation (best-effort, from the
    // try-on tool once Pixverse is done) so it can play in the look's feed carousel.
    // Admin: import a self-made video (e.g. generated in the Pixverse UI) as a NEW
    // try-on for a model. The file is already in Supabase (signed-upload flow) —
    // this creates the generation record so it shows in her "In motion" reel.
    // Defaults to Fashionshow (feed:true, public:false); admin can flip it later.
    if (payload.action === "add-model-video") {
      if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin only." }, { status: 401 });
      const curatorId = String((payload as any).curatorId ?? "").trim();
      const videoUrl = String((payload as any).videoUrl ?? "").trim();
      const cur = (state.curators ?? []).find(c => c.id === curatorId);
      if (!cur) return NextResponse.json({ error: "Model not found." }, { status: 404 });
      if (!videoUrl) return NextResponse.json({ error: "videoUrl required." }, { status: 400 });
      const gen: any = {
        id: `${Date.now()}-${crypto.randomUUID().slice(0, 6)}`,
        lookId: String((payload as any).lookId ?? ""),
        lookName: String((payload as any).title ?? "").trim() || "In motion",
        curatorId,
        customerName: [cur.firstName, cur.lastName].filter(Boolean).join(" "),
        videoUrl,
        feed: true,
        public: false,
        imported: true, // uploaded by the admin, not generated through the funnel
        createdAt: new Date().toISOString(),
      };
      const posterImage = (payload as any).posterImage;
      if (typeof posterImage === "string" && posterImage.startsWith("data:image/")) {
        gen.imagePath = await uploadTryThisLookImage("generations", posterImage);
      }
      state.generations = [gen, ...state.generations];
      await saveTryThisLookState(state);
      return NextResponse.json({ ok: true, id: gen.id });
    }

    if (payload.action === "attach-generation-video") {
      const genId = String(payload.generationId ?? "").trim();
      const videoUrl = String(payload.videoUrl ?? "").trim();
      const gen = state.generations.find(g => g.id === genId);
      if (!gen) return NextResponse.json({ error: "Generation not found." }, { status: 404 });
      if (videoUrl) (gen as any).videoUrl = videoUrl;
      if (typeof payload.feed === "boolean") (gen as any).feed = payload.feed;
      // Replacing the video? Also refresh the POSTER (a frame of the new video), else the feed
      // shows the OLD video's still first. imagePath drives the hydrated imageUrl.
      const posterImage = (payload as any).posterImage;
      if (typeof posterImage === "string" && posterImage.startsWith("data:image/")) {
        (gen as any).imagePath = await uploadTryThisLookImage("generations", posterImage);
        delete (gen as any).imageUrl;
      }
      await saveTryThisLookState(state);
      return NextResponse.json({ ok: true });
    }

    // Admin: CONNECT a generated video to a look — sets the look's own videoUrl (+ poster)
    // from an existing generation, so the look becomes a free try-on (look-video fallback).
    if (payload.action === "attach-look-video-from-generation") {
      if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin only." }, { status: 403 });
      const lookId = String(payload.lookId ?? "").trim();
      const genId = String(payload.generationId ?? "").trim();
      const look = state.looks.find(l => l.id === lookId) as any;
      const gen = state.generations.find(g => g.id === genId) as any;
      if (!look || !gen) return NextResponse.json({ error: "Look or generation not found." }, { status: 404 });
      if (!gen.videoUrl) return NextResponse.json({ error: "That generation has no video." }, { status: 400 });
      look.videoUrl = gen.videoUrl;                 // stored URL; hydration re-signs on read
      if (gen.imageUrl) look.videoPosterUrl = gen.imageUrl;
      await saveTryThisLookState(state);
      return NextResponse.json({ ok: true, videoUrl: look.videoUrl });
    }

    // Admin: DISCONNECT — remove a look's own video (revert to no free look-video).
    if (payload.action === "detach-look-video") {
      if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin only." }, { status: 403 });
      const look = state.looks.find(l => l.id === String(payload.lookId ?? "").trim()) as any;
      if (!look) return NextResponse.json({ error: "Look not found." }, { status: 404 });
      look.videoUrl = undefined; look.videoPosterUrl = undefined;
      await saveTryThisLookState(state);
      return NextResponse.json({ ok: true });
    }

    // Claim a FREE (cached/pre-produced) try-on for the signed-in user: copies the shared
    // clip into a user-owned generation so it shows in their "My try-ons" gallery and gets
    // its own post. Idempotent per (user, source). Copies storage paths — not signed URLs —
    // so hydration re-signs correctly. Marked reuseCopy so it never becomes a cache source.
    if (payload.action === "save-cached-tryon") {
      const srcId = String(payload.generationId ?? "").trim();
      const email = String(payload.ownerEmail ?? "").trim().toLowerCase();
      if (!email) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
      const src = state.generations.find(g => g.id === srcId) as any;
      if (!src) return NextResponse.json({ error: "Source try-on not found." }, { status: 404 });
      const existing = state.generations.find(g => (g as any).ownerEmail === email && (g as any).reuseOf === srcId);
      if (existing) return NextResponse.json({ ok: true, generationId: existing.id });
      const now = new Date().toISOString();
      const generationId = `${Date.now()}-${crypto.randomUUID()}`;
      state.generations.unshift({
        id: generationId,
        lookId: src.lookId,
        lookName: src.lookName,
        storeName: src.storeName,
        customerName: String(payload.customerName ?? "").trim() || src.customerName || undefined,
        ownerEmail: email,
        userId: String(payload.userId ?? "").trim() || undefined,
        curatorId: src.curatorId,
        imagePath: src.imagePath,
        ...(src.videoUrl ? { videoUrl: src.videoUrl } : {}),
        ...(src.videoPosterUrl ? { videoPosterUrl: src.videoPosterUrl } : {}),
        genKind: src.genKind ?? "video",
        ...(src.motion ? { motion: src.motion } : {}),
        feed: false,
        reuseOf: srcId,     // user's copy of a shared cache clip (for dedup)
        reuseCopy: true,    // excluded from the ?combo= cache lookup so it isn't reused
        createdAt: now,
      } as any);
      await saveTryThisLookState(state);
      return NextResponse.json({ ok: true, generationId });
    }

    // Update the display name shown on a try-on post (entered after posting).
    if (payload.action === "set-generation-name") {
      const genId = String(payload.generationId ?? "").trim();
      const name = String(payload.customerName ?? "").trim().slice(0, 60);
      const gen = state.generations.find(g => g.id === genId);
      if (!gen) return NextResponse.json({ error: "Generation not found." }, { status: 404 });
      (gen as any).customerName = name || undefined;
      await saveTryThisLookState(state);
      return NextResponse.json({ ok: true });
    }

    // Admin: attach generations to a LOOK (+motion) so the try-on reuse cache rotates among
    // them (model×look×motion). Lets several manually-made "In motion" clips power one look.
    if (payload.action === "set-generation-look") {
      if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin only." }, { status: 403 });
      const ids = Array.isArray((payload as any).ids) ? (payload as any).ids.map((x: unknown) => String(x)) : [];
      const lookId = String((payload as any).lookId ?? "").trim();
      const motion = (payload as any).motion === "dance" ? "dance" : "turn";
      if (!ids.length || !lookId) return NextResponse.json({ error: "ids + lookId required." }, { status: 400 });
      let count = 0;
      for (const g of state.generations ?? []) if (ids.includes(g.id)) { (g as any).lookId = lookId; (g as any).motion = motion; count++; }
      if (!count) return NextResponse.json({ error: "Nothing matched." }, { status: 404 });
      await saveTryThisLookState(state);
      return NextResponse.json({ ok: true, updated: count });
    }

    // Toggle a try-on's consent to appear in the feed carousel.
    if (payload.action === "set-generation-feed") {
      const genId = String(payload.generationId ?? "").trim();
      const gen = state.generations.find(g => g.id === genId);
      if (!gen) return NextResponse.json({ error: "Generation not found." }, { status: 404 });
      const admin = await isAdmin(request);
      const wantFeed = payload.feed !== false;
      // Admin "deactivation" lock: once an admin deactivates a try-on it stays
      // hidden and the curator cannot re-enable it — only an admin can lift it.
      if ((gen as any).lockedByAdmin && !admin) {
        return NextResponse.json(
          { error: "This try-on was deactivated by an admin and can only be reactivated by an admin." },
          { status: 403 },
        );
      }
      // Publish gate: only an admin publishes instantly. A non-admin asking to be shown in
      // the (Community) feed records a REQUEST instead (feed stays false until an admin
      // approves). Choosing Community also cancels any pending "go public" request.
      if (wantFeed && !admin) {
        (gen as any).feed = false;
        (gen as any).feedRequested = true;
        (gen as any).publicRequested = false;
        await saveTryThisLookState(state);
        return NextResponse.json({ ok: true, pending: true });
      }
      (gen as any).feed = wantFeed;
      // An admin hiding it sets the lock; an admin showing it clears the lock.
      if (admin) (gen as any).lockedByAdmin = !wantFeed;
      (gen as any).feedRequested = false; // approving or un-publishing both clear the pending request
      // Visibility tier: hiding revokes any public unlock. When publishing, an admin may
      // pass `public` to set the tier in one call (Community = public:false, Public = true).
      if (!wantFeed) (gen as any).public = false;
      else if (admin && typeof payload.public === "boolean") (gen as any).public = payload.public;
      // Re-tiering via feed never leaves a pending public request (unless an admin is
      // explicitly setting public:true in this same call).
      if (!(admin && payload.public === true)) (gen as any).publicRequested = false;
      await saveTryThisLookState(state);
      return NextResponse.json({ ok: true });
    }
    // Admin "fully unlock" — promote a try-on from the gated Community feed to fully public
    // (visible to everyone in "All"). Admin-only; implies feed:true. Setting public:false
    // pulls it back to gated-only. Intimate/lingerie try-ons stay out of anonymous feeds
    // regardless (enforced server-side in the community/carousel builders).
    if (payload.action === "set-generation-public") {
      const genId = String(payload.generationId ?? "").trim();
      const gen = state.generations.find(g => g.id === genId);
      if (!gen) return NextResponse.json({ error: "Generation not found." }, { status: 404 });
      const admin = await isAdmin(request);
      const makePublic = payload.public !== false;
      // Only an admin flips a try-on fully public INSTANTLY. A non-admin's ask is recorded
      // as a REQUEST (publicRequested) for an admin to approve; the try-on stays where it is
      // (it does NOT auto-enter any feed) until approved.
      if (!admin) {
        (gen as any).publicRequested = makePublic;
        await saveTryThisLookState(state);
        return NextResponse.json({ ok: true, pending: makePublic });
      }
      (gen as any).public = makePublic;
      (gen as any).publicRequested = false; // approving or denying clears the pending request
      if (makePublic) {
        (gen as any).feed = true;          // public implies shared
        (gen as any).feedRequested = false;
        (gen as any).lockedByAdmin = false;
      }
      await saveTryThisLookState(state);
      return NextResponse.json({ ok: true, public: makePublic });
    }
    // Admin bulk: publish EVERY (non-hidden) try-on at once. Used to seed the public feed,
    // after which the admin re-filters individual posts to Community/Private.
    if (payload.action === "publish-all-generations") {
      if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
      let count = 0;
      for (const g of state.generations ?? []) {
        if ((g as any).hidden) continue;
        (g as any).public = true;
        (g as any).feed = true;
        (g as any).feedRequested = false;
        (g as any).publicRequested = false;
        (g as any).lockedByAdmin = false;
        count++;
      }
      await saveTryThisLookState(state);
      return NextResponse.json({ ok: true, published: count });
    }
    // Admin bulk: set the visibility tier (private / community / public) on many posts at once.
    if (payload.action === "bulk-generation-visibility") {
      if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
      const ids = new Set((Array.isArray(payload.ids) ? payload.ids : []).map((x: unknown) => String(x)));
      const tier = String(payload.tier ?? "");
      if (!["private", "community", "public"].includes(tier)) return NextResponse.json({ error: "Bad tier." }, { status: 400 });
      let updated = 0;
      for (const g of state.generations ?? []) {
        if (!ids.has(g.id)) continue;
        (g as any).feed = tier !== "private";
        (g as any).public = tier === "public";
        (g as any).feedRequested = false;
        (g as any).publicRequested = false;
        (g as any).lockedByAdmin = false;
        updated++;
      }
      await saveTryThisLookState(state);
      return NextResponse.json({ ok: true, updated });
    }
    // Admin bulk: permanently delete many posts at once.
    if (payload.action === "bulk-delete-generations") {
      if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
      const ids = new Set((Array.isArray(payload.ids) ? payload.ids : []).map((x: unknown) => String(x)));
      const toDelete = (state.generations ?? []).filter(g => ids.has(g.id));
      state.generations = (state.generations ?? []).filter(g => !ids.has(g.id));
      for (const g of toDelete) { try { await purgeGenerationAssets(g); } catch { /**/ } }
      await saveTryThisLookState(state, { deletedGenerationIds: toDelete.map(g => g.id) });
      return NextResponse.json({ ok: true, deleted: toDelete.length });
    }
    if (payload.action === "reject-tryon-request") {
      // Admin declines a publish request → back to a plain private try-on (drops out of
      // the admin queue; the user keeps their private try-on).
      if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
      const genId = String(payload.generationId ?? "").trim();
      const gen = state.generations.find(g => g.id === genId);
      if (!gen) return NextResponse.json({ error: "Generation not found." }, { status: 404 });
      (gen as any).feed = false;
      (gen as any).feedRequested = false;
      (gen as any).lockedByAdmin = false;
      await saveTryThisLookState(state);
      return NextResponse.json({ ok: true });
    }

    // ── Admin: outfit gallery for the Try-On funnel. Stored in its OWN blob so no
    //    other action can ever drop them (fixes outfits vanishing). ────────────────
    const serializeOutfits = (list: { id: string; name: string; imageUrl?: string; lookId?: string }[]) =>
      list.map(o => ({ id: o.id, name: o.name, imageUrl: o.imageUrl || "", lookId: o.lookId || "" }));
    if (payload.action === "add-outfit") {
      if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
      if (!payload.image?.startsWith("data:image/")) return NextResponse.json({ error: "Outfit image is missing." }, { status: 400 });
      const imagePath = await uploadTryThisLookImage("looks", payload.image);
      const outfit = { id: `outfit-${Date.now()}-${crypto.randomUUID()}`, name: String(payload.name ?? "").trim().slice(0, 60) || "Outfit", imagePath, lookId: String(payload.lookId ?? "").trim() || undefined, createdAt: now };
      const blob = await readOutfits();
      const updated = await writeOutfits([outfit, ...blob.outfits], blob.funnelVideoPrompt);
      return NextResponse.json({ ok: true, outfits: serializeOutfits(updated.outfits) });
    }
    if (payload.action === "delete-outfit") {
      if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
      const id = String(payload.id ?? "").trim();
      const blob = await readOutfits();
      const outfit = blob.outfits.find(o => o.id === id);
      if (outfit?.imagePath) await deleteTryThisLookImage(outfit.imagePath).catch(() => {});
      const updated = await writeOutfits(blob.outfits.filter(o => o.id !== id), blob.funnelVideoPrompt);
      return NextResponse.json({ ok: true, outfits: serializeOutfits(updated.outfits) });
    }
    if (payload.action === "reorder-outfits") {
      if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
      const ids: string[] = Array.isArray(payload.ids) ? payload.ids.map((x: any) => String(x)) : [];
      const blob = await readOutfits();
      const byId = new Map(blob.outfits.map(o => [o.id, o] as const));
      const ordered = ids.map(id => byId.get(id)).filter(Boolean) as NonNullable<ReturnType<typeof byId.get>>[];
      const rest = blob.outfits.filter(o => !ids.includes(o.id));
      const updated = await writeOutfits([...ordered, ...rest], blob.funnelVideoPrompt);
      return NextResponse.json({ ok: true, outfits: serializeOutfits(updated.outfits) });
    }
    if (payload.action === "set-funnel-prompt") {
      if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
      const prompt = String(payload.prompt ?? "").trim().slice(0, 1000);
      const blob = await readOutfits();
      await writeOutfits(blob.outfits, prompt);
      return NextResponse.json({ ok: true, funnelVideoPrompt: prompt || DEFAULT_FUNNEL_PROMPT });
    }

    if (payload.action === "add-comment") {
      const lookId = String(payload.lookId ?? "").trim();
      const text = String(payload.text ?? "").trim().slice(0, 500);
      const authorName = String(payload.authorName ?? "").trim().slice(0, 60) || "Anonymous";
      const parentId = String((payload as any).parentId ?? "").trim();
      const replyToName = String((payload as any).replyToName ?? "").trim().slice(0, 60);
      if (!lookId || !text) return NextResponse.json({ error: "lookId and text required." }, { status: 400 });
      if ((state.looks.find(l => l.id === lookId) as any)?.commentsOff === true) {
        return NextResponse.json({ error: "Comments are turned off for this look." }, { status: 403 });
      }
      if (!state.comments) state.comments = [];
      state.comments.unshift({
        id: `${Date.now()}-${crypto.randomUUID()}`,
        lookId,
        authorName,
        text,
        ...(parentId ? { parentId } : {}),
        ...(replyToName ? { replyToName } : {}),
        createdAt: now,
      } as any);
      // Keep max 500 comments total
      state.comments = state.comments.slice(0, 2000);
      const updatedState = await saveTryThisLookState(state);
      const commentLook = state.looks.find(l => l.id === lookId);
      // Only notify for genuine public comments — never for admin/curator replies
      // posted from the admin inbox (would spam the admin's own WhatsApp).
      if (!(await isAdmin(request))) notifyAdminWhatsApp(`💬 ${authorName} commented on "${commentLook?.name ?? "a look"}": "${text.slice(0, 80)}". ${ADMIN_URL}`);
      const lookComments = (updatedState.comments ?? []).filter(c => c.lookId === lookId);
      return NextResponse.json({ ok: true, comments: lookComments });
    }

    // Curators may ONLY publish looks (upload-look). A few SELF-SERVICE actions below
    // authorize themselves via the user's own access token (delete/rename one's OWN
    // try-ons, change one's own avatar) — they must NOT be caught by this admin gate.
    // Everything else stays admin-only (delete/update/store/activation are destructive).
    const SELF_SERVICE = new Set(["delete-own-generation", "rename-my-generations", "upload-avatar"]);
    const studioAuth = payload.action === "upload-look"
      ? await authorizeStudio(request)
      : { ok: false as const };
    if (!SELF_SERVICE.has(payload.action) && !studioAuth.ok && !(await isAdmin(request))) {
      return NextResponse.json({ error: "Admin access required." }, { status: 401 });
    }

    if (payload.action === "save-partner-store") {
      const p = payload as any;
      const name = String(p.name ?? "").trim();
      const homeUrl = String(p.homeUrl ?? "").trim();
      if (!name || !homeUrl) {
        return NextResponse.json({ error: "Name and home URL are required." }, { status: 400 });
      }
      const state = await readTryThisLookState();
      const stores = [...(state.partnerStores ?? [])];
      const id = String(p.id ?? "").trim() || `store-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const next = {
        id,
        name,
        network: String(p.network ?? "").trim() || undefined,
        homeUrl,
        searchUrlTemplate: String(p.searchUrlTemplate ?? "").trim() || undefined,
        affiliateTemplate: String(p.affiliateTemplate ?? "").trim() || undefined,
        enabled: p.enabled !== false,
        createdAt: stores.find(s => s.id === id)?.createdAt ?? new Date().toISOString(),
      };
      const idx = stores.findIndex(s => s.id === id);
      if (idx >= 0) stores[idx] = next; else stores.push(next);
      await saveTryThisLookState({ ...state, partnerStores: stores });
      return NextResponse.json({ ok: true, partnerStores: stores });
    }

    if (payload.action === "delete-partner-store") {
      const id = String((payload as any).id ?? "").trim();
      const state = await readTryThisLookState();
      const stores = (state.partnerStores ?? []).filter(s => s.id !== id);
      await saveTryThisLookState({ ...state, partnerStores: stores });
      return NextResponse.json({ ok: true, partnerStores: stores });
    }

    // Admin-only: reassign a look to a curator (e.g. a look published before the
    // act-as attribution fix that landed on the house account). Touches ONLY the
    // owner — nothing else on the look changes.
    if (payload.action === "set-look-curator") {
      const lookId = String((payload as any).lookId ?? "").trim();
      const curatorId = String((payload as any).curatorId ?? "").trim();
      const state = await readTryThisLookState();
      const look = state.looks.find(l => l.id === lookId);
      if (!look) return NextResponse.json({ error: "Look not found." }, { status: 404 });
      (look as any).curatorId = curatorId || undefined;
      await saveTryThisLookState(state);
      return NextResponse.json({ ok: true, lookId, curatorId: curatorId || null });
    }

    if (payload.action === "delete-curator") {
      const id = String((payload as any).id ?? "").trim();
      const all = String((payload as any).all ?? "") === "1";
      const state = await readTryThisLookState();
      const curators = all ? [] : (state.curators ?? []).filter(c => c.id !== id);
      await saveTryThisLookState({ ...state, curators });
      return NextResponse.json({ ok: true, curators });
    }

    // Admin: edit a model (curator) — name, bio, motto, style, hidden flag, and/or photo.
    if (payload.action === "update-curator") {
      const id = String((payload as any).id ?? "").trim();
      const idx = (state.curators ?? []).findIndex(c => c.id === id);
      if (idx < 0) return NextResponse.json({ error: "Model not found." }, { status: 404 });
      const c = state.curators![idx] as any;
      const has = (k: string) => Object.prototype.hasOwnProperty.call(payload, k);
      if (has("name")) { const parts = String((payload as any).name ?? "").trim().split(/\s+/).filter(Boolean); c.firstName = parts.shift() ?? ""; c.lastName = parts.join(" "); }
      if (has("firstName")) c.firstName = String((payload as any).firstName ?? "").trim();
      if (has("lastName")) c.lastName = String((payload as any).lastName ?? "").trim();
      if (has("bio")) c.bio = String((payload as any).bio ?? "").trim() || undefined;
      if (has("motto")) c.motto = String((payload as any).motto ?? "").trim() || undefined;
      if (has("style")) c.style = String((payload as any).style ?? "").trim() || undefined;
      if (has("hairColor")) c.hairColor = String((payload as any).hairColor ?? "").trim() || undefined;
      if (has("chatPersona")) c.chatPersona = String((payload as any).chatPersona ?? "").trim() || undefined;
      if (has("chatEnabled")) c.chatEnabled = (payload as any).chatEnabled !== false;
      if (has("hidden")) c.hidden = (payload as any).hidden === true || undefined;
      if (has("realModel")) c.realModel = (payload as any).realModel === true || undefined;
      const photo = (payload as any).photoImage;
      if (typeof photo === "string" && photo.startsWith("data:image/")) {
        c.photoPath = await uploadTryThisLookImage("uploads", photo);
      }
      await saveTryThisLookState(state);
      return NextResponse.json({ ok: true });
    }

    // Admin: add a new model (curator) from a photo + name (no application flow).
    if (payload.action === "add-curator") {
      const name = String((payload as any).name ?? "").trim();
      const photo = (payload as any).photoImage;
      if (!name) return NextResponse.json({ error: "Name required." }, { status: 400 });
      if (typeof photo !== "string" || !photo.startsWith("data:image/")) return NextResponse.json({ error: "Photo required." }, { status: 400 });
      const parts = name.split(/\s+/).filter(Boolean);
      const photoPath = await uploadTryThisLookImage("uploads", photo);
      const curator: any = {
        id: `curator-${Date.now()}-${crypto.randomUUID().slice(0, 5)}`,
        firstName: parts.shift() ?? name,
        lastName: parts.join(" "),
        style: String((payload as any).style ?? "").trim() || undefined,
        bio: String((payload as any).bio ?? "").trim() || undefined,
        motto: String((payload as any).motto ?? "").trim() || undefined,
        photoPath,
        status: "active",
        createdAt: now,
      };
      state.curators = [curator, ...(state.curators ?? [])];
      await saveTryThisLookState(state);
      return NextResponse.json({ ok: true, id: curator.id });
    }

    // Global try-on kill-switch (admin-only). Flip it to instantly pause/resume end-user
    // try-on generation site-wide — no redeploy. Admin/staff always bypass the pause.
    if (payload.action === "set-tryon-paused") {
      const paused = (payload as any).paused === true;
      const state = await readTryThisLookState();
      await saveTryThisLookState({ ...state, tryonPaused: paused });
      return NextResponse.json({ ok: true, tryonPaused: paused });
    }

    if (payload.action === "upload-look") {
      const name = String(payload.name ?? "").trim() || "New LuxuryBandit Look";
      const campaignName = String(payload.campaignName ?? "").trim();
      const storeName = String(payload.storeName ?? "").trim();
      const storeSlug = String(payload.storeSlug ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
      const storeAddress = String(payload.storeAddress ?? "").trim();
      const whatsappNumber = String(payload.whatsappNumber ?? "").trim();
      const price = String(payload.price ?? "").trim();
      const salePrice = String(payload.salePrice ?? "").trim();
      const discountLabel = String(payload.discountLabel ?? "").trim();
      const dealEndsAt = String(payload.dealEndsAt ?? "").trim();
      const inStock = payload.inStock === true;
      const availabilityNote = String(payload.availabilityNote ?? "").trim();
      const deliveryTime = String(payload.deliveryTime ?? "").trim();
      const productNote = String(payload.productNote ?? "").trim();
      const buyUrl = String(payload.buyUrl ?? "").trim();
      const alternatives = Array.isArray((payload as any).alternatives)
        ? (payload as any).alternatives
            .filter((a: any) => a && typeof a.link === "string" && typeof a.thumbnail === "string")
            .slice(0, 12)
            .map((a: any) => ({
              title: String(a.title ?? "").slice(0, 200),
              link: String(a.link),
              source: a.source ? String(a.source).slice(0, 80) : undefined,
              thumbnail: String(a.thumbnail),
              price: a.price ? String(a.price).slice(0, 40) : undefined,
              priceValue: typeof a.priceValue === "number" ? a.priceValue : undefined,
              currency: a.currency ? String(a.currency).slice(0, 8) : undefined,
              ...(a.affiliate === true ? { affiliate: true } : {}),
            }))
        : undefined;
      const hashtags = String(payload.hashtags ?? "").trim();
      const productType = payload.productType === "virtual" ? "virtual" : "real";
      const aiCreated = payload.aiCreated === true; // AI Fashion creation vs curated web find
      const availableSizes = Array.isArray(payload.availableSizes)
        ? payload.availableSizes.map((size) => String(size).trim()).filter(Boolean)
        : [];
      let frontImageInput = payload.frontImage || payload.image;
      if (!frontImageInput?.startsWith("data:image/")) {
        return NextResponse.json({ error: "Front look image is missing." }, { status: 400 });
      }

      // The curator CHOOSES the model in the studio before publishing. If they
      // passed a chosen model photo, dress it in the garment here and publish that
      // model image (the bare product is kept as the try-on garment). No model
      // chosen → publish the image as sent. Swim/lingerie route to FASHN.
      let modelReady = false; // true once the look image is a model wearing the piece
      if (!aiCreated && typeof payload.modelImage === "string" && payload.modelImage.startsWith("data:image/")) {
        const garmentSrc = typeof payload.garmentFrontImage === "string" && payload.garmentFrontImage.startsWith("data:image/")
          ? payload.garmentFrontImage
          : frontImageInput;
        if (!(payload.garmentFrontImage?.startsWith("data:image/"))) payload.garmentFrontImage = frontImageInput;
        const dressed = await tryOnGarment(garmentSrc, payload.modelImage, { name });
        if (dressed) {
          frontImageInput = dressed; // the chosen model wearing it becomes the look image
          modelReady = true;
        } else {
          console.warn("[upload-look] chosen-model try-on failed — publishing the product photo as-is for", name);
        }
      }

      const frontImagePath = await uploadTryThisLookImage("looks", frontImageInput);
      const backImagePath = payload.backImage?.startsWith("data:image/")
        ? await uploadTryThisLookImage("looks", payload.backImage)
        : undefined;
      const garmentFrontImagePath = payload.garmentFrontImage?.startsWith("data:image/")
        ? await uploadTryThisLookImage("looks", payload.garmentFrontImage)
        : undefined;
      const garmentBackImagePath = payload.garmentBackImage?.startsWith("data:image/")
        ? await uploadTryThisLookImage("looks", payload.garmentBackImage)
        : undefined;
      const galleryImagePaths = Array.isArray(payload.galleryImages)
        ? await Promise.all(
            payload.galleryImages
              .filter((image) => typeof image === "string" && image.startsWith("data:image/"))
              .slice(0, 12)
              .map((image) => uploadTryThisLookImage("looks", image))
          )
        : [];
      const published = payload.published === true; // false by default (draft)
      const look = {
        id: `look-${Date.now()}`,
        name,
        campaignName: campaignName || undefined,
        storeName: storeName || undefined,
        storeSlug: storeSlug || undefined,
        storeAddress: storeAddress || undefined,
        whatsappNumber: whatsappNumber || undefined,
        availableSizes: availableSizes.length ? availableSizes : undefined,
        price: price || undefined,
        salePrice: salePrice || undefined,
        discountLabel: discountLabel || undefined,
        dealEndsAt: dealEndsAt || undefined,
        inStock: inStock || undefined,
        published,
        availabilityNote: availabilityNote || undefined,
        deliveryTime: deliveryTime || undefined,
        productNote: productNote || undefined,
        buyUrl: buyUrl || undefined,
        alternatives: alternatives && alternatives.length ? alternatives : undefined,
        hashtags: hashtags || undefined,
        productType,
        aiCreated: aiCreated || undefined,
        // Editorial category (After Dark / Riviera / Boudoir / Off-Duty), creator-set.
        category: isLookCategory((payload as any).category) ? (payload as any).category : undefined,
        // Creator-set Lingerie/Swimwear flag (explicit; overrides auto-detection and
        // forces the look's try-ons private + paid tier). Boudoir always implies lingerie.
        lingerie: ((payload as any).category === "boudoir" || payload.lingerie === true) ? true : undefined,
        // The look image is already a model wearing the piece → the video can
        // animate it directly (no second try-on in generate-look-video).
        modelReady: modelReady || undefined,
        curatorId: (studioAuth as any).curatorId || (payload as any).curatorId || undefined,
        imagePath: frontImagePath,
        frontImagePath,
        backImagePath,
        garmentFrontImagePath,
        garmentBackImagePath,
        galleryImagePaths: galleryImagePaths.length ? galleryImagePaths : undefined,
        createdAt: now
      };
      const storeForLook = storeSlug && storeName
        ? {
            id: `store-${storeSlug}`,
            name: storeName,
            slug: storeSlug,
            address: storeAddress || undefined,
            whatsappNumber: whatsappNumber || undefined,
            createdAt: now
          }
        : null;
      if (storeForLook) {
        const existingStores = state.stores ?? [];
        state.stores = [
          storeForLook,
          ...existingStores.filter((store) => store.slug !== storeForLook.slug)
        ];
      }
      state.looks.unshift(look);
      state.activeLookId = look.id;
      state.activeLookIds = [look.id, ...(state.activeLookIds ?? []).filter((id) => id !== look.id)];

      const updatedState = await saveTryThisLookState(state);
      return NextResponse.json({
        ...ps(updatedState),
        lookId: look.id,
        modelReady,
        events: updatedState.events,
        leads: updatedState.leads,
        generations: updatedState.generations
      });
    }

    if (payload.action === "save-store") {
      const storeName = String(payload.storeName ?? "").trim();
      const storeSlug = String(payload.storeSlug ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
      const storeAddress = String(payload.storeAddress ?? "").trim();
      const whatsappNumber = String(payload.whatsappNumber ?? "").trim();
      if (!storeName || !storeSlug) {
        return NextResponse.json({ error: "Store name and URL slug are required." }, { status: 400 });
      }

      const store = {
        id: `store-${storeSlug}`,
        name: storeName,
        slug: storeSlug,
        address: storeAddress || undefined,
        whatsappNumber: whatsappNumber || undefined,
        createdAt: state.stores?.find((item) => item.slug === storeSlug)?.createdAt ?? now
      };
      state.stores = [store, ...(state.stores ?? []).filter((item) => item.slug !== storeSlug)];
      state.looks = state.looks.map((look) => {
        if (look.storeSlug !== storeSlug) return look;
        return {
          ...look,
          storeName,
          storeSlug,
          storeAddress: storeAddress || undefined,
          whatsappNumber: whatsappNumber || undefined
        };
      });

      const updatedState = await saveTryThisLookState(state);
      return NextResponse.json({
        ...ps(updatedState),
        events: updatedState.events,
        leads: updatedState.leads,
        generations: updatedState.generations
      });
    }

    if (payload.action === "delete-store") {
      const storeSlug = String(payload.storeSlug ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
      if (!storeSlug) {
        return NextResponse.json({ error: "Store slug is required." }, { status: 400 });
      }

      const storeLooks = state.looks.filter((look) => look.storeSlug === storeSlug);
      if (!storeLooks.length && !(state.stores ?? []).some((store) => store.slug === storeSlug)) {
        return NextResponse.json({ error: "Boutique was not found." }, { status: 404 });
      }

      // purgeTryons = true → also delete the users' try-ons + their images
      // (use for takedown / rights / abuse cases). Default keeps them, orphaned.
      const purgeTryons = payload.purgeTryons === true;

      const lookIds = new Set(storeLooks.map((look) => look.id));
      const storeLeads = state.leads.filter((lead) => lookIds.has(lead.lookId));
      const storeGenerations = purgeTryons
        ? state.generations.filter((generation) => lookIds.has(generation.lookId))
        : [];

      state.stores = (state.stores ?? []).filter((store) => store.slug !== storeSlug);
      state.looks = state.looks.filter((look) => look.storeSlug !== storeSlug);
      state.leads = state.leads.filter((lead) => !lookIds.has(lead.lookId));
      if (purgeTryons) {
        // Hard delete: remove the users' try-ons entirely.
        state.generations = state.generations.filter((generation) => !lookIds.has(generation.lookId));
      } else {
        // Keep users' try-ons, but orphan them: drop the dead store name and flag
        // that the original creator was deleted (shown on /post/[id]).
        state.generations = state.generations.map((generation) =>
          lookIds.has(generation.lookId)
            ? { ...generation, creatorDeleted: true, storeName: "" }
            : generation
        );
      }
      state.events = state.events.filter((event) => !lookIds.has(event.lookId));

      const remainingLookIds = new Set(state.looks.map((look) => look.id));
      const nextActiveLookIds = (state.activeLookIds ?? [state.activeLookId]).filter((id) => remainingLookIds.has(id));
      const fallbackLookId = state.looks[0]?.id;
      state.activeLookIds = nextActiveLookIds.length ? nextActiveLookIds : fallbackLookId ? [fallbackLookId] : [];
      state.activeLookId = state.activeLookIds[0] ?? "";

      const pathsToDelete = new Set<string>();
      for (const look of storeLooks) {
        [
          look.imagePath,
          look.frontImagePath,
          look.backImagePath,
          look.garmentFrontImagePath,
          look.garmentBackImagePath,
          ...(look.galleryImagePaths ?? [])
        ].filter(Boolean).forEach((path) => pathsToDelete.add(String(path)));
      }
      for (const lead of storeLeads) {
        if (lead.uploadedPhotoPath) pathsToDelete.add(String(lead.uploadedPhotoPath));
      }
      // Try-on images are only deleted when purging; otherwise the try-ons survive.
      for (const generation of storeGenerations) {
        if (generation.imagePath) pathsToDelete.add(String(generation.imagePath));
        if ((generation as any).userPhotoPath) pathsToDelete.add(String((generation as any).userPhotoPath));
      }
      for (const path of pathsToDelete) await deleteTryThisLookImage(path);

      const updatedState = await saveTryThisLookState(state);
      return NextResponse.json({
        ...ps(updatedState),
        events: updatedState.events,
        leads: updatedState.leads,
        generations: updatedState.generations
      });
    }

    // Set a look's vanity social-proof counts (admin). likeCount/commentCount are stored
    // display numbers (formatted 85000 → "85k" in the feed rail), not real events.
    if (payload.action === "set-look-counts") {
      const lk = state.looks.find((look) => look.id === String(payload.id ?? ""));
      if (!lk) return NextResponse.json({ error: "Look was not found." }, { status: 404 });
      if (Object.prototype.hasOwnProperty.call(payload, "likeCount")) (lk as any).likeCount = Math.max(0, Math.floor(Number((payload as any).likeCount) || 0));
      if (Object.prototype.hasOwnProperty.call(payload, "commentCount")) (lk as any).commentCount = Math.max(0, Math.floor(Number((payload as any).commentCount) || 0));
      const updated = await saveTryThisLookState(state);
      return NextResponse.json(ps(updated));
    }

    // Admin try-on editor: set this look's reference garment image + the Pixverse video
    // prompt. End-users then only upload their own photo; these drive their try-on.
    if (payload.action === "set-look-tryon") {
      const lk = state.looks.find((look) => look.id === String(payload.id ?? ""));
      if (!lk) return NextResponse.json({ error: "Look was not found." }, { status: 404 });
      if (typeof (payload as any).videoPrompt === "string") (lk as any).videoPrompt = String((payload as any).videoPrompt).slice(0, 4000);
      const refImg = String((payload as any).referenceImage ?? "");
      if (refImg.startsWith("data:image/")) {
        const path = await uploadTryThisLookImage("uploads", refImg);
        (lk as any).clothesImagePath = path;
        (lk as any).clothesImageUrl = (await getSignedUrl(path, 60 * 60 * 24 * 365 * 10)) || undefined;
      }
      const updated = await saveTryThisLookState(state);
      return NextResponse.json(ps(updated));
    }

    if (payload.action === "update-look") {
      const lookId = String(payload.id ?? "");
      const existingLook = state.looks.find((look) => look.id === lookId);
      if (!existingLook) {
        return NextResponse.json({ error: "Look was not found." }, { status: 404 });
      }

      // Only override a field when it is explicitly present in the payload — otherwise keep the existing look's value
      const hasField = (key: string) => Object.prototype.hasOwnProperty.call(payload, key);
      const name = hasField("name") ? (String(payload.name ?? "").trim() || existingLook.name) : existingLook.name;
      const campaignName = hasField("campaignName") ? String(payload.campaignName ?? "").trim() : (existingLook.campaignName ?? "");
      const storeName = hasField("storeName") ? String(payload.storeName ?? "").trim() : (existingLook.storeName ?? "");
      const storeSlug = hasField("storeSlug") ? String(payload.storeSlug ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") : (existingLook.storeSlug ?? "");
      const storeAddress = hasField("storeAddress") ? String(payload.storeAddress ?? "").trim() : (existingLook.storeAddress ?? "");
      const whatsappNumber = hasField("whatsappNumber") ? String(payload.whatsappNumber ?? "").trim() : (existingLook.whatsappNumber ?? "");
      const price = hasField("price") ? String(payload.price ?? "").trim() : (existingLook.price ?? "");
      const salePrice = hasField("salePrice") ? String(payload.salePrice ?? "").trim() : (existingLook.salePrice ?? "");
      const discountLabel = hasField("discountLabel") ? String(payload.discountLabel ?? "").trim() : (existingLook.discountLabel ?? "");
      const dealEndsAt = hasField("dealEndsAt") ? String(payload.dealEndsAt ?? "").trim() : (existingLook.dealEndsAt ?? "");
      const inStock = hasField("inStock") ? payload.inStock === true : (existingLook.inStock !== false);
      const availabilityNote = hasField("availabilityNote") ? String(payload.availabilityNote ?? "").trim() : (existingLook.availabilityNote ?? "");
      const deliveryTime = hasField("deliveryTime") ? String(payload.deliveryTime ?? "").trim() : (existingLook.deliveryTime ?? "");
      const productNote = hasField("productNote") ? String(payload.productNote ?? "").trim() : (existingLook.productNote ?? "");
      const hashtags = hasField("hashtags") ? String(payload.hashtags ?? "").trim() : ((existingLook as any).hashtags ?? "");
      const productType = hasField("productType") ? (payload.productType === "virtual" ? "virtual" : "real") : ((existingLook as any).productType ?? "real");
      const availableSizes = hasField("availableSizes")
        ? (Array.isArray(payload.availableSizes) ? payload.availableSizes.map((size) => String(size).trim()).filter(Boolean) : [])
        : (existingLook.availableSizes ?? []);
      // Admin may replace the shop options (e.g. swap brand-catalogue items for
      // real look-alike dupes). Same shape as upload-look's alternatives.
      const altInput = hasField("alternatives") && Array.isArray((payload as any).alternatives)
        ? (payload as any).alternatives
            .filter((a: any) => a && typeof a.link === "string" && typeof a.thumbnail === "string")
            .slice(0, 12)
            .map((a: any) => ({
              title: String(a.title ?? "").slice(0, 200),
              link: String(a.link),
              source: a.source ? String(a.source).slice(0, 80) : undefined,
              thumbnail: String(a.thumbnail),
              price: a.price ? String(a.price).slice(0, 40) : undefined,
              priceValue: typeof a.priceValue === "number" ? a.priceValue : undefined,
              currency: a.currency ? String(a.currency).slice(0, 8) : undefined,
              ...(a.affiliate === true ? { affiliate: true } : {}),
            }))
        : undefined;
      // Similar-escapes results (reverse-image search on the reel's location photo) —
      // same shape as the shop dupes, shown under "Bandit the look".
      const locationInput = hasField("locationDupes") && Array.isArray((payload as any).locationDupes)
        ? (payload as any).locationDupes
            .filter((a: any) => a && typeof a.link === "string" && typeof a.thumbnail === "string")
            .slice(0, 12)
            .map((a: any) => ({
              title: String(a.title ?? "").slice(0, 200),
              link: String(a.link),
              source: a.source ? String(a.source).slice(0, 80) : undefined,
              thumbnail: String(a.thumbnail),
              price: a.price ? String(a.price).slice(0, 40) : undefined,
              region: a.region ? String(a.region).slice(0, 80) : undefined,
              ...(a.affiliate === true ? { affiliate: true } : {}),
            }))
        : undefined;
      const backImagePath = payload.backImage?.startsWith("data:image/")
        ? await uploadTryThisLookImage("looks", payload.backImage)
        : undefined;
      const garmentFrontImagePath = payload.garmentFrontImage?.startsWith("data:image/")
        ? await uploadTryThisLookImage("looks", payload.garmentFrontImage)
        : undefined;
      const garmentBackImagePath = payload.garmentBackImage?.startsWith("data:image/")
        ? await uploadTryThisLookImage("looks", payload.garmentBackImage)
        : undefined;
      // Reel source images (clothes + location) — stored so they can be edited & re-searched.
      const clothesImagePath = (payload as any).clothesImage?.startsWith("data:image/")
        ? await uploadTryThisLookImage("uploads", (payload as any).clothesImage)
        : undefined;
      const locationImagePath = (payload as any).locationImage?.startsWith("data:image/")
        ? await uploadTryThisLookImage("uploads", (payload as any).locationImage)
        : undefined;
      const galleryImagePaths = Array.isArray(payload.galleryImages) && payload.galleryImages.length
        ? await Promise.all(
            payload.galleryImages
              .filter((image) => typeof image === "string" && image.startsWith("data:image/"))
              .slice(0, 12)
              .map((image) => uploadTryThisLookImage("looks", image))
          )
        : undefined;
      // --- Gallery path resolution ---
      // Priority: keepGalleryPaths (stable storagePaths) > keepGalleryImageUrls (signed URLs) > keepGalleryIndexes (fragile indexes)
      const allExistingPaths = new Set([
        existingLook.frontImagePath,
        existingLook.imagePath,
        ...(existingLook.galleryImagePaths ?? [])
      ].filter(Boolean) as string[]);

      const keepGalleryPaths = Array.isArray(payload.keepGalleryPaths)
        ? payload.keepGalleryPaths.filter((p): p is string => typeof p === "string" && p.startsWith("try-this-look/"))
        : null;

      const keepGalleryIndexes = Array.isArray(payload.keepGalleryIndexes)
        ? payload.keepGalleryIndexes
            .map((value) => Number(value))
            .filter((value) => Number.isInteger(value) && value >= 0)
        : [];
      const resolveExistingImagePath = (imageUrl: string) => {
        const normalizedImageUrl = normalizeImageUrl(imageUrl);
        if (normalizedImageUrl === normalizeImageUrl(existingLook.frontImageUrl) || normalizedImageUrl === normalizeImageUrl(existingLook.imageUrl)) {
          return existingLook.frontImagePath ?? existingLook.imagePath;
        }
        const galleryIndex = existingLook.galleryImageUrls?.findIndex((url) => normalizeImageUrl(url) === normalizedImageUrl) ?? -1;
        return galleryIndex >= 0 ? existingLook.galleryImagePaths?.[galleryIndex] : undefined;
      };
      const keepGalleryImageUrls = Array.isArray(payload.keepGalleryImageUrls)
        ? payload.keepGalleryImageUrls.filter((image): image is string => typeof image === "string" && !image.startsWith("data:image/"))
        : null;

      const keptExistingGalleryPaths = keepGalleryPaths !== null
        ? keepGalleryPaths.filter(p => allExistingPaths.has(p))
        : keepGalleryImageUrls !== null
          ? keepGalleryImageUrls.flatMap((image) => {
              const path = resolveExistingImagePath(image);
              return path ? [path] : [];
            })
          : keepGalleryIndexes.flatMap((index) =>
              existingLook.galleryImagePaths?.[index] ? [existingLook.galleryImagePaths[index]] : []
            );

      const nextGalleryImagePaths = galleryImagePaths
        ? [...keptExistingGalleryPaths, ...galleryImagePaths].slice(0, 12)
        : payload.keepGalleryIndexes || keepGalleryImageUrls !== null || keepGalleryPaths !== null
          ? keptExistingGalleryPaths.slice(0, 12)
          : undefined;

      // --- Front image resolution ---
      // Priority: new data URL upload > explicit stable path > URL-based lookup
      const frontImageValue = typeof payload.frontImage === "string" ? payload.frontImage : "";
      const uploadedFrontImagePath = frontImageValue.startsWith("data:image/")
        ? await uploadTryThisLookImage("looks", frontImageValue)
        : undefined;
      // NEW: explicit stable path from frontend (most reliable)
      const specifiedFrontPath = typeof payload.frontImagePath === "string" && payload.frontImagePath.startsWith("try-this-look/")
        ? payload.frontImagePath
        : undefined;
      const matchingGalleryIndex = frontImageValue && !frontImageValue.startsWith("data:image/")
        ? existingLook.galleryImageUrls?.findIndex((url) => normalizeImageUrl(url) === normalizeImageUrl(frontImageValue)) ?? -1
        : -1;
      const existingFrontImagePath =
        frontImageValue && !frontImageValue.startsWith("data:image/")
          ? normalizeImageUrl(frontImageValue) === normalizeImageUrl(existingLook.frontImageUrl) || normalizeImageUrl(frontImageValue) === normalizeImageUrl(existingLook.imageUrl)
            ? existingLook.frontImagePath ?? existingLook.imagePath
            : matchingGalleryIndex >= 0
              ? existingLook.galleryImagePaths?.[matchingGalleryIndex]
              : undefined
          : undefined;
      const nextFrontImagePath = uploadedFrontImagePath ?? specifiedFrontPath ?? existingFrontImagePath;
      const shouldUpdateFrontImage = typeof payload.frontImage === "string" || Boolean(specifiedFrontPath);

      state.looks = state.looks.map((look) => {
        if (look.id !== lookId) return look;
        const nextLook = {
          ...look,
          name,
          campaignName: campaignName || undefined,
          storeName: storeName || undefined,
          storeSlug: storeSlug || undefined,
          storeAddress: storeAddress || undefined,
          whatsappNumber: whatsappNumber || undefined,
          availableSizes: availableSizes.length ? availableSizes : undefined,
          price: price || undefined,
          salePrice: salePrice || undefined,
          discountLabel: discountLabel || undefined,
          dealEndsAt: dealEndsAt || undefined,
          inStock: inStock || undefined,
          // Editorial category (admin-settable per look). Explicit boolean wins.
          category: hasField("category")
            ? (isLookCategory((payload as any).category) ? (payload as any).category : undefined)
            : (look as any).category,
          // Creator/admin-set Lingerie/Swimwear flag (retroactively markable). Store the
          // EXPLICIT boolean so the toggle wins both ways (off overrides auto-detection).
          // Boudoir always implies lingerie; switching AWAY from Boudoir clears it.
          lingerie: hasField("category")
            ? ((payload as any).category === "boudoir" ? true : (hasField("lingerie") ? payload.lingerie === true : false))
            : (hasField("lingerie") ? payload.lingerie === true : (look as any).lingerie),
          published: typeof payload.published === "boolean" ? payload.published : existingLook.published,
          // Shop link ("Shop now" on the garment tile) — admin-editable.
          buyUrl: hasField("buyUrl") ? (String((payload as any).buyUrl ?? "").trim() || undefined) : (look as any).buyUrl,
          // Admin may reassign the owning curator (e.g. distribute seeded looks).
          ...(adminRequest && typeof payload.curatorId === "string" && payload.curatorId.trim()
            ? { curatorId: payload.curatorId.trim() }
            : {}),
          // Admin may replace the shop options (vetted look-alike dupes).
          ...(altInput ? { alternatives: altInput } : {}),
          ...(locationInput ? { locationDupes: locationInput } : {}),
          ...(hasField("clicks") && (payload as any).clicks && typeof (payload as any).clicks === "object" ? { clicks: (payload as any).clicks } : {}),
          ...(hasField("viewCount") && typeof (payload as any).viewCount === "number" ? { viewCount: (payload as any).viewCount } : {}),
          availabilityNote: availabilityNote || undefined,
          deliveryTime: deliveryTime || undefined,
          productNote: productNote || undefined,
          hashtags: hashtags || undefined,
          productType,
          ...(backImagePath ? { backImagePath } : {}),
          ...(clothesImagePath ? { clothesImagePath, clothesImageUrl: undefined } : {}),
          ...(locationImagePath ? { locationImagePath, locationImageUrl: undefined } : {}),
          ...(garmentFrontImagePath ? { garmentFrontImagePath } : {}),
          ...(garmentBackImagePath ? { garmentBackImagePath } : {}),
          ...(payload.keepGalleryIndexes || keepGalleryImageUrls !== null || keepGalleryPaths !== null || galleryImagePaths ? { galleryImagePaths: nextGalleryImagePaths } : {})
        };
        if (shouldUpdateFrontImage) {
          if (nextFrontImagePath) {
            return { ...nextLook, imagePath: nextFrontImagePath, frontImagePath: nextFrontImagePath };
          }
          const { imagePath, frontImagePath: _fp, ...withoutFrontImage } = nextLook;
          return withoutFrontImage;
        }
        return {
          ...nextLook
        };
      });

      if (storeSlug && storeName) {
        const store = {
          id: `store-${storeSlug}`,
          name: storeName,
          slug: storeSlug,
          address: storeAddress || undefined,
          whatsappNumber: whatsappNumber || undefined,
          createdAt: state.stores?.find((item) => item.slug === storeSlug)?.createdAt ?? now
        };
        state.stores = [store, ...(state.stores ?? []).filter((item) => item.slug !== storeSlug)];
      }

      const updatedState = await saveTryThisLookState(state);
      return NextResponse.json({
        ...ps(updatedState),
        events: updatedState.events,
        leads: updatedState.leads,
        generations: updatedState.generations
      });
    }

    if (payload.action === "set-active") {
      const lookId = String(payload.id ?? "");
      if (!state.looks.some((look) => look.id === lookId)) {
        return NextResponse.json({ error: "Look was not found." }, { status: 404 });
      }
      state.activeLookId = lookId;
      state.activeLookIds = [lookId, ...(state.activeLookIds ?? []).filter((id) => id !== lookId)];
      const updatedState = await saveTryThisLookState(state);
      return NextResponse.json({
        ...ps(updatedState),
        events: updatedState.events,
        leads: updatedState.leads,
        generations: updatedState.generations
      });
    }

    if (payload.action === "unset-active") {
      const lookId = String(payload.id ?? "");
      if (!state.looks.some((look) => look.id === lookId)) {
        return NextResponse.json({ error: "Look was not found." }, { status: 404 });
      }
      const nextActiveLookIds = (state.activeLookIds ?? [state.activeLookId]).filter((id) => id !== lookId);
      state.activeLookIds = nextActiveLookIds.length ? nextActiveLookIds : [state.looks[0].id];
      state.activeLookId = state.activeLookIds[0];
      const updatedState = await saveTryThisLookState(state);
      return NextResponse.json({
        ...ps(updatedState),
        events: updatedState.events,
        leads: updatedState.leads,
        generations: updatedState.generations
      });
    }

    if (payload.action === "delete-look") {
      const lookId = String(payload.id ?? "");
      const lookToDelete = state.looks.find((look) => look.id === lookId);
      if (!lookToDelete) {
        return NextResponse.json({ error: "Look was not found." }, { status: 404 });
      }

      if (state.looks.length <= 1) {
        return NextResponse.json({ error: "You need at least one look. Upload another look before deleting this one." }, { status: 400 });
      }

      state.looks = state.looks.filter((look) => look.id !== lookId);

      state.activeLookIds = (state.activeLookIds ?? [state.activeLookId]).filter((id) => id !== lookId);
      if (!state.activeLookIds.length) state.activeLookIds = [state.looks[0].id];
      state.activeLookId = state.activeLookIds[0];

      const pathsToDelete = new Set([
        lookToDelete.imagePath,
        lookToDelete.frontImagePath,
        lookToDelete.backImagePath,
        lookToDelete.garmentFrontImagePath,
        lookToDelete.garmentBackImagePath,
        ...(lookToDelete.galleryImagePaths ?? [])
      ].filter(Boolean));
      for (const path of pathsToDelete) await deleteTryThisLookImage(String(path));

      const updatedState = await saveTryThisLookState(state);
      return NextResponse.json({
        ...ps(updatedState),
        events: updatedState.events,
        leads: updatedState.leads,
        generations: updatedState.generations
      });
    }

    // ── Reset funnel analytics (admin) — wipe the event log + real view counts.
    // Used to clear test/internal traffic so the numbers start clean. Vanity
    // likeCount/commentCount are NOT touched (they're seeded social proof).
    if (payload.action === "reset-analytics") {
      if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin only." }, { status: 403 });
      const onlyInternal = (payload as any).onlyInternal === true;
      state.events = onlyInternal ? (state.events ?? []).filter(e => !(e as any).internal) : [];
      if (!onlyInternal) {
        for (const l of state.looks) (l as any).viewCount = 0;
      }
      await saveTryThisLookState(state);
      return NextResponse.json({ ok: true, remaining: state.events.length });
    }

    // Admin: zero out the real view counters (keeps events + vanity likes). Used to clear
    // dev/test-inflated view counts so the admin sees REAL end-user views from now on.
    if (payload.action === "reset-view-counts") {
      if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin only." }, { status: 403 });
      let n = 0;
      for (const l of state.looks) { if (((l as any).viewCount ?? 0) !== 0) { (l as any).viewCount = 0; n++; } }
      await saveTryThisLookState(state);
      return NextResponse.json({ ok: true, cleared: n });
    }

    // ── Bulk delete (atomic, avoids parallel race condition) ─────────────────
    if (payload.action === "bulk-delete-generations") {
      if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin only." }, { status: 403 });
      const ids = new Set((Array.isArray(payload.ids) ? payload.ids : []).map(String));
      const toDelete = state.generations.filter(g => ids.has(g.id));
      // Also purge ghost entries (no imageUrl) while we're here
      state.generations = state.generations.filter(g => !ids.has(g.id) && (g as any).imageUrl);
      const updatedState = await saveTryThisLookState(state, { deletedGenerationIds: [...ids] });
      // Delete images after saving state (failures are non-fatal)
      await Promise.allSettled(toDelete.map(g => purgeGenerationAssets(g)));
      return NextResponse.json({ ok: true, deleted: toDelete.length, generations: updatedState.generations });
    }

    // ── Bulk hide (atomic) ───────────────────────────────────────────────────
    if (payload.action === "bulk-hide-generations") {
      if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin only." }, { status: 403 });
      const ids = new Set((Array.isArray(payload.ids) ? payload.ids : []).map(String));
      state.generations.forEach(g => { if (ids.has(g.id)) (g as any).hidden = true; });
      const updatedState = await saveTryThisLookState(state);
      return NextResponse.json({ ok: true, hidden: ids.size, generations: updatedState.generations });
    }

    if (payload.action === "delete-generation") {
      const generationId = String(payload.id ?? "");
      const generationToDelete = state.generations.find((generation) => generation.id === generationId);
      if (!generationToDelete) {
        return NextResponse.json({ error: "Generated image was not found." }, { status: 404 });
      }

      state.generations = state.generations.filter((generation) => generation.id !== generationId);
      await purgeGenerationAssets(generationToDelete);

      const updatedState = await saveTryThisLookState(state, { deletedGenerationIds: [generationId] });
      return NextResponse.json({
        ...ps(updatedState),
        events: updatedState.events,
        leads: updatedState.leads,
        generations: updatedState.generations
      });
    }

    if (payload.action === "hide-generation" || payload.action === "unhide-generation") {
      if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin only." }, { status: 403 });
      const generationId = String(payload.id ?? "");
      const gen = state.generations.find(g => g.id === generationId);
      if (!gen) return NextResponse.json({ error: "Generated image was not found." }, { status: 404 });
      (gen as any).hidden = payload.action === "hide-generation";
      const updatedState = await saveTryThisLookState(state);
      return NextResponse.json({
        ...ps(updatedState),
        events: updatedState.events,
        leads: updatedState.leads,
        generations: updatedState.generations
      });
    }

    if (payload.action === "assign-generation") {
      if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin only." }, { status: 403 });
      const generationId = String(payload.id ?? "");
      const gen = state.generations.find(g => g.id === generationId);
      if (!gen) return NextResponse.json({ error: "Generated image was not found." }, { status: 404 });
      if (payload.customerName !== undefined) (gen as any).customerName = String(payload.customerName ?? "").trim();
      if (payload.userId !== undefined) (gen as any).userId = String(payload.userId ?? "").trim() || undefined;
      // Attribute the try-on to a MODEL (curator) too — so it lands under her in the feed
      // and her profile "In motion". If a curatorId is given, backfill the model's name.
      if (payload.curatorId !== undefined) {
        const cid = String(payload.curatorId ?? "").trim();
        (gen as any).curatorId = cid || undefined;
        if (cid) {
          const cur = (state.curators ?? []).find(c => c.id === cid);
          const nm = cur ? [cur.firstName, cur.lastName].filter(Boolean).join(" ").trim() : "";
          if (nm) (gen as any).customerName = nm;
        }
      }
      const updatedState = await saveTryThisLookState(state);
      return NextResponse.json({ ok: true, customerName: (gen as any).customerName, userId: (gen as any).userId });
    }

    // ── Bulk visibility tier for try-ons (admin moderation) ──────────────────
    // public    = in the public "All" feed (feed:true + public:true)
    // community = member pool only, NOT in the public feed (feed:true, public off)
    // private   = shared nowhere (feed off) — admin sees it under the Private chip
    if (payload.action === "set-visibility") {
      if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin only." }, { status: 403 });
      const ids = Array.isArray(payload.ids) ? (payload.ids as unknown[]).map(x => String(x)) : [];
      const vis = String(payload.visibility ?? "");
      if (!ids.length || !["public", "community", "private"].includes(vis)) {
        return NextResponse.json({ error: "ids + visibility (public|community|private) required." }, { status: 400 });
      }
      let count = 0;
      for (const g of state.generations) {
        if (!ids.includes(g.id)) continue;
        (g as any).feed = vis !== "private";
        (g as any).public = vis === "public" ? true : undefined;
        count++;
      }
      if (count === 0) return NextResponse.json({ error: "No matching try-ons found." }, { status: 404 });
      await saveTryThisLookState(state);
      return NextResponse.json({ ok: true, updated: count, visibility: vis });
    }

    // ── Bulk pin/unpin (admin): pinned models lead the Models grid, pinned
    //    try-ons lead the Fashionshow grid AND the reel. ──────────────────────
    if (payload.action === "set-pinned") {
      if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin only." }, { status: 403 });
      const ids = Array.isArray(payload.ids) ? (payload.ids as unknown[]).map(x => String(x)) : [];
      const pinned = payload.pinned === true;
      const kind = String(payload.kind ?? "tryon");
      if (!ids.length || !["model", "tryon"].includes(kind)) {
        return NextResponse.json({ error: "ids + kind (model|tryon) required." }, { status: 400 });
      }
      let count = 0;
      if (kind === "model") {
        for (const c of state.curators ?? []) if (ids.includes(c.id)) { (c as any).pinned = pinned || undefined; count++; }
      } else {
        for (const g of state.generations) if (ids.includes(g.id)) { (g as any).pinned = pinned || undefined; count++; }
      }
      if (count === 0) return NextResponse.json({ error: "Nothing matched." }, { status: 404 });
      await saveTryThisLookState(state);
      return NextResponse.json({ ok: true, updated: count, pinned });
    }

    // ── Bulk FEATURE models (admin): featured models are the free showcase on the
    //    Models tab; all others are locked (padlock) behind paid membership. ──────
    if (payload.action === "set-featured") {
      if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin only." }, { status: 403 });
      const ids = Array.isArray(payload.ids) ? (payload.ids as unknown[]).map(x => String(x)) : [];
      const featured = payload.featured === true;
      const kind = String(payload.kind ?? "model"); // "model" (curators) | "look" (garments) | "generation" (feed clips)
      if (!ids.length) return NextResponse.json({ error: "ids required." }, { status: 400 });
      let count = 0;
      if (kind === "look") {
        for (const l of state.looks ?? []) if (ids.includes(l.id)) { (l as any).featured = featured || undefined; count++; }
      } else if (kind === "generation") {
        for (const g of state.generations ?? []) if (ids.includes(g.id)) { (g as any).showcase = featured || undefined; count++; }
      } else {
        for (const c of state.curators ?? []) if (ids.includes(c.id)) { (c as any).featured = featured || undefined; count++; }
      }
      if (count === 0) return NextResponse.json({ error: "Nothing matched." }, { status: 404 });
      await saveTryThisLookState(state);
      return NextResponse.json({ ok: true, updated: count, featured });
    }

    // ── Bulk animate (admin): chosen try-on tiles PLAY inline in the grid ────
    if (payload.action === "set-animated") {
      if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin only." }, { status: 403 });
      const ids = Array.isArray(payload.ids) ? (payload.ids as unknown[]).map(x => String(x)) : [];
      const animated = payload.animated === true;
      if (!ids.length) return NextResponse.json({ error: "ids required." }, { status: 400 });
      let count = 0;
      for (const g of state.generations) if (ids.includes(g.id)) { (g as any).animated = animated || undefined; count++; }
      if (count === 0) return NextResponse.json({ error: "Nothing matched." }, { status: 404 });
      await saveTryThisLookState(state);
      return NextResponse.json({ ok: true, updated: count, animated });
    }

    // ── Bulk reassign generations from one customer name to another ──────────
    if (payload.action === "bulk-reassign-generations") {
      if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin only." }, { status: 403 });
      const fromName = String(payload.fromName ?? "").trim();
      const toName = String(payload.toName ?? "").trim();
      if (!fromName || !toName) return NextResponse.json({ error: "fromName and toName required." }, { status: 400 });
      const fromSlug = fromName.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
      let count = 0;
      for (const g of state.generations) {
        const name = String((g as any).customerName ?? "").trim();
        if (name && name.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") === fromSlug) {
          (g as any).customerName = toName;
          count++;
        }
      }
      if (count === 0) return NextResponse.json({ error: `No generations found with customer name matching "${fromName}".` }, { status: 404 });
      await saveTryThisLookState(state);
      return NextResponse.json({ ok: true, reassigned: count });
    }

    // ── Rename own generations when username changes ──────────────────────────
    if (payload.action === "rename-my-generations") {
      const accessToken = request.headers.get("authorization")?.replace("Bearer ", "").trim() ?? "";
      if (!accessToken) return NextResponse.json({ error: "Auth required." }, { status: 401 });

      // Verify token + get user info from Supabase
      const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/^["']|["']$/g, "");
      const supabaseUrl = rawUrl
        ? (rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`).replace(/\/rest\/v1\/?$/, "").replace(/\/storage\/v1\/?$/, "").replace(/\/$/, "")
        : "";
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
      const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${accessToken}` },
      });
      if (!userRes.ok) return NextResponse.json({ error: "Invalid token." }, { status: 401 });
      const userObj = await userRes.json() as { id: string; user_metadata?: Record<string, string> };

      const newName = String(payload.newName ?? "").trim();
      const oldName = String(payload.oldName ?? "").trim();
      if (!newName) return NextResponse.json({ error: "newName required." }, { status: 400 });

      const oldSlug = oldName.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
      let count = 0;
      for (const g of state.generations) {
        const matchesUserId = (g as any).userId === userObj.id;
        const matchesOldName = oldSlug && (String((g as any).customerName ?? "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") === oldSlug);
        if (matchesUserId || matchesOldName) {
          (g as any).customerName = newName;
          (g as any).userId = userObj.id; // backfill userId while we're here
          count++;
        }
      }
      await saveTryThisLookState(state);
      return NextResponse.json({ ok: true, renamed: count });
    }

    // ── Auth user management (admin only) ────────────────────────────────────
    if (payload.action === "delete-auth-user" || payload.action === "ban-auth-user" || payload.action === "unban-auth-user") {
      if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin only." }, { status: 403 });
      const userId = String(payload.userId ?? "").trim();
      if (!userId) return NextResponse.json({ error: "userId required." }, { status: 400 });
      const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/^["']|["']$/g, "");
      const supabaseUrl = rawUrl
        ? (rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`).replace(/\/rest\/v1\/?$/, "").replace(/\/storage\/v1\/?$/, "").replace(/\/$/, "")
        : "";
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
      if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });

      if (payload.action === "delete-auth-user") {
        // deleteAuthUser also removes any model/curator profile bound to the same email,
        // so a re-registration with that email doesn't resurrect the model.
        const ok = await deleteAuthUser(userId);
        if (!ok) return NextResponse.json({ error: "Could not delete user." }, { status: 502 });
        return NextResponse.json({ ok: true });
      }

      // Ban or unban
      const banDuration = payload.action === "ban-auth-user" ? "876600h" : "none";
      const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
        method: "PUT",
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ban_duration: banDuration })
      });
      if (!res.ok) {
        const e = await res.json().catch(() => null);
        return NextResponse.json({ error: e?.message ?? "Could not update user." }, { status: res.status });
      }
      return NextResponse.json({ ok: true });
    }

    // ── Delete all data for a community user (admin only) ───────────────────
    if (payload.action === "delete-user-data") {
      if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin only." }, { status: 403 });
      const userSlug = String(payload.userSlug ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
      if (!userSlug) return NextResponse.json({ error: "userSlug required." }, { status: 400 });
      const toDelete = state.generations.filter(g => {
        const name = String((g as any).customerName ?? "").trim();
        if (!name) return false;
        return name.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") === userSlug;
      });
      // Delete images from storage
      await Promise.allSettled(toDelete.map(g => purgeGenerationAssets(g)));
      const toDeleteIds = new Set(toDelete.map(g => g.id));
      state.generations = state.generations.filter(g => !toDeleteIds.has(g.id));
      await saveTryThisLookState(state, { deletedGenerationIds: [...toDeleteIds] });
      return NextResponse.json({ ok: true, deleted: toDelete.length });
    }

    // ── User deletes own generation (auth token validated) ──────────────────
    if (payload.action === "delete-own-generation") {
      const generationId = String(payload.id ?? "");
      const accessToken = String(payload.accessToken ?? "");
      if (!generationId || !accessToken) return NextResponse.json({ error: "id and accessToken required." }, { status: 400 });

      // Verify token + get username from Supabase
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "") ?? "";
      const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "").trim();
      const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` }
      });
      if (!userRes.ok) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      const userJson = await userRes.json() as { user_metadata?: { username?: string; full_name?: string }; email?: string };
      const ownerAlias = (userJson.user_metadata?.username ?? userJson.user_metadata?.full_name ?? "").trim();
      const ownerSlug = ownerAlias.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
      const ownerEmail = (userJson.email ?? "").trim().toLowerCase();

      const gen = state.generations.find(g => g.id === generationId);
      if (!gen) return NextResponse.json({ error: "Not found." }, { status: 404 });
      // Owner if the alias matches the try-on's name OR the email it was generated under
      // (funnel try-ons are email-bound and have no alias).
      const genSlug = String((gen as any).customerName ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
      const genEmail = String((gen as any).ownerEmail ?? "").trim().toLowerCase();
      const byAlias = !!ownerSlug && genSlug === ownerSlug;
      const byEmail = !!ownerEmail && genEmail === ownerEmail;
      if (!byAlias && !byEmail) return NextResponse.json({ error: "Not your image." }, { status: 403 });

      state.generations = state.generations.filter(g => g.id !== generationId);
      await purgeGenerationAssets(gen);
      await saveTryThisLookState(state, { deletedGenerationIds: [generationId] });
      return NextResponse.json({ ok: true });
    }

    // ── Upload profile avatar (any authenticated user) ────────────────────────
    if (payload.action === "upload-avatar") {
      const accessToken = String(payload.accessToken ?? "");
      const dataUrl = String(payload.dataUrl ?? "");
      if (!accessToken || !dataUrl) return NextResponse.json({ error: "accessToken and dataUrl required." }, { status: 400 });

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "") ?? "";
      const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "").trim();
      const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

      const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` }
      });
      if (!userRes.ok) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      const { id: userId } = await userRes.json() as { id: string };

      // Upload image to storage
      const imagePath = await uploadTryThisLookImage("uploads", dataUrl);
      // Build public URL
      const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "shopcut-images";
      const avatarUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${imagePath}`;

      // Save avatar_url to user_metadata via admin API
      if (serviceKey) {
        await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
          method: "PUT",
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ user_metadata: { avatar_url: avatarUrl } })
        });
      }
      return NextResponse.json({ ok: true, avatarUrl });
    }

    // ── Self-service store creation (any authenticated user) ─────────────────
    if (payload.action === "create-own-store") {
      const accessToken = String(payload.accessToken ?? "");
      if (!accessToken) return NextResponse.json({ error: "accessToken required." }, { status: 400 });

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "") ?? "";
      const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "").trim();
      const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` }
      });
      if (!userRes.ok) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      const userJson = await userRes.json() as { id: string; email?: string };

      const storeName = String(payload.storeName ?? "").trim();
      if (!storeName) return NextResponse.json({ error: "storeName required." }, { status: 400 });
      const storeSlug = storeName.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");

      // Don't create if they already have a store
      if ((state.stores ?? []).some(s => (s as any).ownerUserId === userJson.id)) {
        return NextResponse.json({ error: "You already have a store." }, { status: 409 });
      }
      // Don't allow duplicate slug
      const finalSlug = (state.stores ?? []).some(s => s.slug === storeSlug) ? `${storeSlug}-${Date.now()}` : storeSlug;

      const newStore = {
        id: `store-${finalSlug}`,
        name: storeName,
        slug: finalSlug,
        ownerUserId: userJson.id,
        ownerEmail: userJson.email ?? "",
        aiEnabled: false,
        aiCreditsUsed: 0,
        aiCreditsLimit: 0,
        createdAt: now,
      };
      state.stores = [newStore, ...(state.stores ?? [])];
      await saveTryThisLookState(state);
      return NextResponse.json({ ok: true, store: newStore });
    }

    // ── Update seller AI access + credits (admin only) ──────────────────────
    if (payload.action === "update-seller") {
      const storeSlug = String(payload.storeSlug ?? "").trim();
      if (!storeSlug) {
        return NextResponse.json({ error: "storeSlug required." }, { status: 400 });
      }
      const store = (state.stores ?? []).find((s) => s.slug === storeSlug);
      if (!store) {
        return NextResponse.json({ error: "Store not found." }, { status: 404 });
      }
      const updated = { ...store };
      if (typeof payload.aiEnabled === "boolean") updated.aiEnabled = payload.aiEnabled;
      if (typeof payload.aiCreditsLimit === "number") updated.aiCreditsLimit = payload.aiCreditsLimit;
      if (payload.resetCredits === true) {
        updated.aiCreditsUsed = 0;
        updated.aiCreditsResetAt = now;
      }
      // Clear pending request when admin approves or rejects
      if (typeof payload.aiEnabled === "boolean") updated.pendingAiRequest = false;
      state.stores = (state.stores ?? []).map((s) => s.slug === storeSlug ? updated : s);
      await saveTryThisLookState(state);
      return NextResponse.json({ ok: true, store: updated });
    }

    // ── Batch-categorize all looks via OpenAI ────────────────────────────────
    if (payload.action === "batch-categorize") {
      if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin only." }, { status: 403 });
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY not configured." }, { status: 500 });

      const CATEGORIES = ["Vintage", "Luxury", "Streetwear", "Casual", "Sportswear", "Formalwear", "Accessories"];
      const onlyUntagged = payload.onlyUntagged !== false; // default: only looks without category
      const looksToTag = onlyUntagged
        ? state.looks.filter(l => !(l as any).category)
        : state.looks;

      const results: { id: string; name: string; category: string }[] = [];
      const BATCH = 8; // calls in parallel

      for (let i = 0; i < looksToTag.length; i += BATCH) {
        const slice = looksToTag.slice(i, i + BATCH);
        await Promise.all(slice.map(async (look) => {
          const text = [look.name, (look as any).productNote, (look as any).hashtags].filter(Boolean).join(", ");
          try {
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
              body: JSON.stringify({
                model: "gpt-4o-mini",
                max_tokens: 10,
                messages: [
                  {
                    role: "system",
                    content: `You are a fashion classifier. Classify the product into exactly one of these categories: ${CATEGORIES.join(", ")}. Reply with only the category name, nothing else.`
                  },
                  { role: "user", content: text || look.name }
                ]
              })
            });
            const data = await res.json() as any;
            const raw = (data.choices?.[0]?.message?.content ?? "").trim();
            const category = CATEGORIES.find(c => c.toLowerCase() === raw.toLowerCase()) ?? "Casual";
            (look as any).category = category;
            results.push({ id: look.id, name: look.name, category });
          } catch {
            (look as any).category = "Casual";
            results.push({ id: look.id, name: look.name, category: "Casual" });
          }
        }));
      }

      await saveTryThisLookState(state);
      return NextResponse.json({ ok: true, categorized: results.length, results });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Try This Look action failed." },
      { status: 500 }
    );
  }
}
