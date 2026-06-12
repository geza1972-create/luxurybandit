import {
  deleteTryThisLookImage,
  getActiveTryThisLook,
  getActiveTryThisLooks,
  readTryThisLookState,
  saveTryThisLookState,
  uploadTryThisLookImage
} from "@/lib/try-this-look-store";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
// Allow large JSON bodies for gallery uploads with multiple base64 images
export const maxDuration = 60;

function isAdmin(request: Request) {
  const configuredPin = process.env.TRY_THIS_LOOK_ADMIN_PIN?.trim();
  if (!configuredPin) return process.env.NODE_ENV !== "production";
  return request.headers.get("x-try-look-admin-pin") === configuredPin;
}

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

function serializeLook(look: Awaited<ReturnType<typeof readTryThisLookState>>["looks"][number], generationCount = 0) {
  const galleryImageUrls = visibleImageUrls(look);
  const primaryImageUrl = galleryImageUrls[0] ?? look.frontImageUrl ?? look.imageUrl;
  const frontPath = look.frontImagePath ?? look.imagePath;
  // Expose clean gallery paths: exclude front image path to avoid client-side duplicates
  const cleanGalleryPaths = (look.galleryImagePaths ?? []).filter(p => p && p !== frontPath);
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
    hashtags: (look as any).hashtags,
    productType: (look as any).productType ?? "real",
    likeCount: (look as any).likeCount ?? 0,
    generationCount,
    category: (look as any).category ?? null,
    createdAt: look.createdAt,
    imageUrl: primaryImageUrl,
    frontImageUrl: primaryImageUrl,
    frontImagePath: frontPath,
    backImageUrl: look.backImageUrl,
    garmentFrontImageUrl: look.garmentFrontImageUrl,
    garmentBackImageUrl: look.garmentBackImageUrl,
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
  const sl = (look: (typeof visibleLooks)[number]) => serializeLook(look, genCountByLook.get(look.id) ?? 0);
  return {
    activeLook: activeLook ? sl(activeLook) : undefined,
    activeLooks: activeLooks.map(sl),
    stores: forAdmin ? (state.stores ?? []) : publicStores,
    looks: visibleLooks.map(sl)
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const storeSlug = url.searchParams.get("store") ?? "";
    const lookSlug = url.searchParams.get("look") ?? "";
    const wantsAdminData = url.searchParams.get("admin") === "1";
    const state = await readTryThisLookState();
    if (wantsAdminData && !isAdmin(request)) {
      return NextResponse.json({ error: "Admin access required." }, { status: 401 });
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
        .filter(g => g.lookId === filterLookId && !g.visitorId?.startsWith("admin-") && !(g as any).hidden)
        .map(g => ({
          id: g.id,
          lookId: g.lookId,
          imageUrl: (g as any).imageUrl ?? "",
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
      return NextResponse.json({
        post: {
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
        }
      });
    }

    // Global community feed — all recent public generations
    if (url.searchParams.get("community") === "1") {
      const lookById = new Map(state.looks.map(l => [l.id, l]));
      const community = state.generations
        .filter(g =>
          !g.visitorId?.startsWith("admin-") &&
          (g as any).imageUrl &&
          !(g as any).hidden &&
          // Only real user try-on images (path starts with try-this-look/generations/)
          g.imagePath?.includes("generations/")
        )
        .slice(0, 100)
        .map(g => {
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
            createdAt: g.createdAt,
          };
        });
      return NextResponse.json({ community });
    }

    // Public user gallery — all generations by a given username slug
    const filterUsername = url.searchParams.get("username") ?? "";
    if (filterUsername) {
      const querySlug = normalizeSlug(filterUsername);
      const matched = state.generations.filter(g => {
        const name = (g as any).customerName ?? "";
        return name && normalizeSlug(name) === querySlug && !g.visitorId?.startsWith("admin-") && !(g as any).hidden;
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
      const displayName = matched[0] ? ((matched[0] as any).customerName ?? filterUsername) : filterUsername;
      return NextResponse.json({ userGallery, displayName });
    }

    if (!wantsAdminData) return NextResponse.json(publicState(state, storeSlug, lookSlug));

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
      userPhotoImage?: string;
      image?: string;
      text?: string;
      authorName?: string;
      frontImage?: string;
      backImage?: string;
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
    const adminRequest = isAdmin(request);
    const ps = (s: typeof state) => publicState(s, "", "", adminRequest);

    if (payload.action === "event") {
      const activeLook = getActiveTryThisLook(state);
      const lookId = payload.lookId || activeLook.id;
      const eventName = String(payload.event ?? "").trim();
      if (!eventName) return NextResponse.json({ error: "Event name is missing." }, { status: 400 });

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
        utmSource: String(payload.utmSource ?? "").trim() || undefined,
        utmCampaign: String(payload.utmCampaign ?? "").trim() || undefined
      });

      const updatedState = await saveTryThisLookState(state);
      return NextResponse.json(ps(updatedState));
    }

    if (payload.action === "like") {
      const lookId = String(payload.lookId ?? "").trim();
      const delta = (payload as any).liked ? 1 : -1;
      const look = state.looks.find(l => l.id === lookId);
      if (look) {
        (look as any).likeCount = Math.max(0, ((look as any).likeCount ?? 0) + delta);
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

      const updatedState = await saveTryThisLookState(state);
      return NextResponse.json(ps(updatedState));
    }

    if (payload.action === "update-lead-status") {
      if (!isAdmin(request)) {
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

    if (payload.action === "delete-lead") {
      if (!isAdmin(request)) {
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

      const updatedState = await saveTryThisLookState(state);
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
      state.generations.unshift({
        id: `${Date.now()}-${crypto.randomUUID()}`,
        lookId,
        visitorId: String(payload.visitorId ?? "").trim() || undefined,
        storeName: String(payload.storeName ?? "").trim() || activeLook.storeName,
        lookName: String(payload.lookName ?? "").trim() || activeLook.name,
        customerName: String(payload.customerName ?? "").trim() || undefined,
        imagePath,
        userPhotoPath,
        createdAt: now
      } as any);
      state.events.unshift({
        id: `${Date.now()}-${crypto.randomUUID()}`,
        name: "generation_success",
        lookId,
        createdAt: now,
        userAgent: request.headers.get("user-agent") ?? undefined
      });

      const updatedState = await saveTryThisLookState(state);

      // ── WhatsApp notification to admin (non-blocking) ────────────────────
      const waPhone = process.env.ADMIN_WHATSAPP_PHONE?.trim();
      const waKey = process.env.CALLMEBOT_API_KEY?.trim();
      if (waPhone && waKey) {
        const customerName = String(payload.customerName ?? "").trim();
        const lookName = activeLook.name ?? "";
        const adminUrl = "https://luxurybandit.com/admin/looks";
        const msg = `🛍️ New try-on${customerName ? ` by ${customerName}` : ""} on "${lookName}". Review: ${adminUrl}`;
        fetch(`https://api.callmebot.com/whatsapp.php?phone=${waPhone}&text=${encodeURIComponent(msg)}&apikey=${waKey}`)
          .catch(() => {}); // fire-and-forget, never blocks the response
      }

      return NextResponse.json(ps(updatedState));
    }

    if (payload.action === "add-comment") {
      const lookId = String(payload.lookId ?? "").trim();
      const text = String(payload.text ?? "").trim().slice(0, 500);
      const authorName = String(payload.authorName ?? "").trim().slice(0, 60) || "Anonymous";
      if (!lookId || !text) return NextResponse.json({ error: "lookId and text required." }, { status: 400 });
      if (!state.comments) state.comments = [];
      state.comments.unshift({
        id: `${Date.now()}-${crypto.randomUUID()}`,
        lookId,
        authorName,
        text,
        createdAt: now,
      });
      // Keep max 500 comments total
      state.comments = state.comments.slice(0, 500);
      const updatedState = await saveTryThisLookState(state);
      const lookComments = (updatedState.comments ?? []).filter(c => c.lookId === lookId);
      return NextResponse.json({ ok: true, comments: lookComments });
    }

    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Admin access required." }, { status: 401 });
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
      const hashtags = String(payload.hashtags ?? "").trim();
      const productType = payload.productType === "virtual" ? "virtual" : "real";
      const availableSizes = Array.isArray(payload.availableSizes)
        ? payload.availableSizes.map((size) => String(size).trim()).filter(Boolean)
        : [];
      const frontImageInput = payload.frontImage || payload.image;
      if (!frontImageInput?.startsWith("data:image/")) {
        return NextResponse.json({ error: "Front look image is missing." }, { status: 400 });
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
        hashtags: hashtags || undefined,
        productType,
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

      const lookIds = new Set(storeLooks.map((look) => look.id));
      const storeLeads = state.leads.filter((lead) => lookIds.has(lead.lookId));
      const storeGenerations = state.generations.filter((generation) => lookIds.has(generation.lookId));

      state.stores = (state.stores ?? []).filter((store) => store.slug !== storeSlug);
      state.looks = state.looks.filter((look) => look.storeSlug !== storeSlug);
      state.leads = state.leads.filter((lead) => !lookIds.has(lead.lookId));
      state.generations = state.generations.filter((generation) => !lookIds.has(generation.lookId));
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
      for (const generation of storeGenerations) {
        if (generation.imagePath) pathsToDelete.add(String(generation.imagePath));
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
      const backImagePath = payload.backImage?.startsWith("data:image/")
        ? await uploadTryThisLookImage("looks", payload.backImage)
        : undefined;
      const garmentFrontImagePath = payload.garmentFrontImage?.startsWith("data:image/")
        ? await uploadTryThisLookImage("looks", payload.garmentFrontImage)
        : undefined;
      const garmentBackImagePath = payload.garmentBackImage?.startsWith("data:image/")
        ? await uploadTryThisLookImage("looks", payload.garmentBackImage)
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
          published: typeof payload.published === "boolean" ? payload.published : existingLook.published,
          availabilityNote: availabilityNote || undefined,
          deliveryTime: deliveryTime || undefined,
          productNote: productNote || undefined,
          hashtags: hashtags || undefined,
          productType,
          ...(backImagePath ? { backImagePath } : {}),
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

    // ── Bulk delete (atomic, avoids parallel race condition) ─────────────────
    if (payload.action === "bulk-delete-generations") {
      if (!isAdmin(request)) return NextResponse.json({ error: "Admin only." }, { status: 403 });
      const ids = new Set((Array.isArray(payload.ids) ? payload.ids : []).map(String));
      const toDelete = state.generations.filter(g => ids.has(g.id));
      // Also purge ghost entries (no imageUrl) while we're here
      state.generations = state.generations.filter(g => !ids.has(g.id) && (g as any).imageUrl);
      const updatedState = await saveTryThisLookState(state);
      // Delete images after saving state (failures are non-fatal)
      await Promise.allSettled(toDelete.map(g => deleteTryThisLookImage(g.imagePath)));
      return NextResponse.json({ ok: true, deleted: toDelete.length, generations: updatedState.generations });
    }

    // ── Bulk hide (atomic) ───────────────────────────────────────────────────
    if (payload.action === "bulk-hide-generations") {
      if (!isAdmin(request)) return NextResponse.json({ error: "Admin only." }, { status: 403 });
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
      await deleteTryThisLookImage(generationToDelete.imagePath);

      const updatedState = await saveTryThisLookState(state);
      return NextResponse.json({
        ...ps(updatedState),
        events: updatedState.events,
        leads: updatedState.leads,
        generations: updatedState.generations
      });
    }

    if (payload.action === "hide-generation" || payload.action === "unhide-generation") {
      if (!isAdmin(request)) return NextResponse.json({ error: "Admin only." }, { status: 403 });
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
      if (!isAdmin(request)) return NextResponse.json({ error: "Admin only." }, { status: 403 });
      const generationId = String(payload.id ?? "");
      const gen = state.generations.find(g => g.id === generationId);
      if (!gen) return NextResponse.json({ error: "Generated image was not found." }, { status: 404 });
      (gen as any).customerName = String(payload.customerName ?? "").trim();
      const updatedState = await saveTryThisLookState(state);
      return NextResponse.json({ ok: true, customerName: (gen as any).customerName });
    }

    // ── Bulk reassign generations from one customer name to another ──────────
    if (payload.action === "bulk-reassign-generations") {
      if (!isAdmin(request)) return NextResponse.json({ error: "Admin only." }, { status: 403 });
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

    // ── Auth user management (admin only) ────────────────────────────────────
    if (payload.action === "delete-auth-user" || payload.action === "ban-auth-user" || payload.action === "unban-auth-user") {
      if (!isAdmin(request)) return NextResponse.json({ error: "Admin only." }, { status: 403 });
      const userId = String(payload.userId ?? "").trim();
      if (!userId) return NextResponse.json({ error: "userId required." }, { status: 400 });
      const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/^["']|["']$/g, "");
      const supabaseUrl = rawUrl
        ? (rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`).replace(/\/rest\/v1\/?$/, "").replace(/\/storage\/v1\/?$/, "").replace(/\/$/, "")
        : "";
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
      if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });

      if (payload.action === "delete-auth-user") {
        const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
          method: "DELETE",
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
        });
        if (!res.ok) {
          const e = await res.json().catch(() => null);
          return NextResponse.json({ error: e?.message ?? "Could not delete user." }, { status: res.status });
        }
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
      if (!isAdmin(request)) return NextResponse.json({ error: "Admin only." }, { status: 403 });
      const userSlug = String(payload.userSlug ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
      if (!userSlug) return NextResponse.json({ error: "userSlug required." }, { status: 400 });
      const toDelete = state.generations.filter(g => {
        const name = String((g as any).customerName ?? "").trim();
        if (!name) return false;
        return name.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") === userSlug;
      });
      // Delete images from storage
      await Promise.allSettled(toDelete.map(g => deleteTryThisLookImage(g.imagePath)));
      const toDeleteIds = new Set(toDelete.map(g => g.id));
      state.generations = state.generations.filter(g => !toDeleteIds.has(g.id));
      await saveTryThisLookState(state);
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
      if (!ownerSlug) return NextResponse.json({ error: "No alias set on this account." }, { status: 403 });

      const gen = state.generations.find(g => g.id === generationId);
      if (!gen) return NextResponse.json({ error: "Not found." }, { status: 404 });
      const genSlug = String((gen as any).customerName ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
      if (genSlug !== ownerSlug) return NextResponse.json({ error: "Not your image." }, { status: 403 });

      state.generations = state.generations.filter(g => g.id !== generationId);
      await deleteTryThisLookImage(gen.imagePath);
      await saveTryThisLookState(state);
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
      if (!isAdmin(request)) return NextResponse.json({ error: "Admin only." }, { status: 403 });
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
