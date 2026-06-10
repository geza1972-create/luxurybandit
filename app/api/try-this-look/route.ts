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

function serializeLook(look: Awaited<ReturnType<typeof readTryThisLookState>>["looks"][number]) {
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
  return {
    activeLook: activeLook ? serializeLook(activeLook) : undefined,
    activeLooks: activeLooks.map(serializeLook),
    stores: forAdmin ? (state.stores ?? []) : publicStores,
    looks: visibleLooks.map(serializeLook)
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
    if (!wantsAdminData) return NextResponse.json(publicState(state, storeSlug, lookSlug));
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
      image?: string;
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
      state.generations.unshift({
        id: `${Date.now()}-${crypto.randomUUID()}`,
        lookId,
        visitorId: String(payload.visitorId ?? "").trim() || undefined,
        storeName: String(payload.storeName ?? "").trim() || activeLook.storeName,
        lookName: String(payload.lookName ?? "").trim() || activeLook.name,
        imagePath,
        createdAt: now
      });
      state.events.unshift({
        id: `${Date.now()}-${crypto.randomUUID()}`,
        name: "generation_success",
        lookId,
        createdAt: now,
        userAgent: request.headers.get("user-agent") ?? undefined
      });

      const updatedState = await saveTryThisLookState(state);
      return NextResponse.json(ps(updatedState));
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

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Try This Look action failed." },
      { status: 500 }
    );
  }
}
