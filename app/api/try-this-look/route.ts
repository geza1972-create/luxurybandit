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

function isAdmin(request: Request) {
  const configuredPin = process.env.TRY_THIS_LOOK_ADMIN_PIN?.trim();
  if (!configuredPin) return process.env.NODE_ENV !== "production";
  return request.headers.get("x-try-look-admin-pin") === configuredPin;
}

function publicState(state: Awaited<ReturnType<typeof readTryThisLookState>>, preferredStoreSlug = "") {
  const normalizedSlug = preferredStoreSlug.trim().toLowerCase();
  const globalActiveLook = getActiveTryThisLook(state);
  const globalActiveLooks = getActiveTryThisLooks(state);
  const storeLooks = normalizedSlug
    ? state.looks.filter((look) => look.storeSlug?.toLowerCase() === normalizedSlug)
    : [];
  const activeIds = new Set(state.activeLookIds?.length ? state.activeLookIds : [state.activeLookId]);
  const storeActiveLooks = normalizedSlug
    ? storeLooks.filter((look) => activeIds.has(look.id))
    : [];
  const activeLook = normalizedSlug
    ? storeActiveLooks[0] ?? storeLooks[0] ?? globalActiveLook
    : globalActiveLook;
  const activeLooks = normalizedSlug
    ? storeActiveLooks.length ? storeActiveLooks : activeLook ? [activeLook] : []
    : globalActiveLooks;
  return {
    activeLook,
    activeLooks: activeLooks.map((look) => ({
      id: look.id,
      name: look.name,
      campaignName: look.campaignName,
      storeName: look.storeName,
      storeSlug: look.storeSlug,
      storeAddress: look.storeAddress,
      whatsappNumber: look.whatsappNumber,
      availableSizes: look.availableSizes,
      price: look.price,
      productNote: look.productNote,
      createdAt: look.createdAt,
      imageUrl: look.imageUrl,
      frontImageUrl: look.frontImageUrl,
      backImageUrl: look.backImageUrl,
      garmentFrontImageUrl: look.garmentFrontImageUrl,
      garmentBackImageUrl: look.garmentBackImageUrl,
      galleryImageUrls: look.galleryImageUrls
    })),
    stores: state.stores ?? [],
    looks: state.looks.map((look) => ({
      id: look.id,
      name: look.name,
      campaignName: look.campaignName,
      storeName: look.storeName,
      storeSlug: look.storeSlug,
      storeAddress: look.storeAddress,
      whatsappNumber: look.whatsappNumber,
      availableSizes: look.availableSizes,
      price: look.price,
      productNote: look.productNote,
      createdAt: look.createdAt,
      imageUrl: look.imageUrl,
      frontImageUrl: look.frontImageUrl,
      backImageUrl: look.backImageUrl,
      garmentFrontImageUrl: look.garmentFrontImageUrl,
      garmentBackImageUrl: look.garmentBackImageUrl,
      galleryImageUrls: look.galleryImageUrls
    }))
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const storeSlug = url.searchParams.get("store") ?? "";
    const wantsAdminData = url.searchParams.get("admin") === "1";
    const state = await readTryThisLookState();
    if (wantsAdminData && !isAdmin(request)) {
      return NextResponse.json({ error: "Admin access required." }, { status: 401 });
    }
    if (!wantsAdminData) return NextResponse.json(publicState(state, storeSlug));
    return NextResponse.json({
      ...publicState(state, storeSlug),
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
      productNote?: string;
      image?: string;
      frontImage?: string;
      backImage?: string;
      garmentFrontImage?: string;
      garmentBackImage?: string;
      galleryImages?: string[];
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
      utmSource?: string;
      utmCampaign?: string;
    };

    const state = await readTryThisLookState();
    const now = new Date().toISOString();

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
      return NextResponse.json(publicState(updatedState));
    }

    if (payload.action === "lead") {
      const activeLook = getActiveTryThisLook(state);
      const lookId = payload.lookId || activeLook.id;
      const email = String(payload.email ?? "").trim();
      const instagram = String(payload.instagram ?? "").trim();
      const visitorId = String(payload.visitorId ?? "").trim();
      const customerName = String(payload.customerName ?? "").trim();
      const phone = String(payload.phone ?? "").trim();
      if (!email && !instagram && !phone && !customerName) {
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
        utmSource: String(payload.utmSource ?? "").trim() || undefined,
        utmCampaign: String(payload.utmCampaign ?? "").trim() || undefined
      });

      const updatedState = await saveTryThisLookState(state);
      return NextResponse.json(publicState(updatedState));
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
      return NextResponse.json(publicState(updatedState));
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
      const productNote = String(payload.productNote ?? "").trim();
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
        productNote: productNote || undefined,
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
        ...publicState(updatedState),
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
        ...publicState(updatedState),
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
        ...publicState(updatedState),
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
        ...publicState(updatedState),
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
        ...publicState(updatedState),
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
        ...publicState(updatedState),
        events: updatedState.events,
        leads: updatedState.leads,
        generations: updatedState.generations
      });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Try This Look action failed." },
      { status: 500 }
    );
  }
}
