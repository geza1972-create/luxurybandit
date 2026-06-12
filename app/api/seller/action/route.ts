import { NextResponse } from "next/server";
import { getSellerFromRequest } from "@/lib/supabase-auth-server";
import {
  readTryThisLookState,
  saveTryThisLookState,
  uploadTryThisLookImage,
} from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const maxDuration = 30;

async function fileToDataUrl(file: File): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  return `data:${file.type || "image/jpeg"};base64,${bytes.toString("base64")}`;
}

export async function POST(request: Request) {
  const user = await getSellerFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData();
  const action = String(formData.get("action") ?? "").trim();

  const state = await readTryThisLookState();
  let store = (state.stores ?? []).find((s) => s.ownerUserId === user.id);
  const now = new Date().toISOString();

  // Auto-create a store on first product upload so users can sell without
  // going through the full seller registration flow first.
  if (!store && action === "upload-look") {
    const nameBase = user.email?.split("@")[0] ?? "creator";
    const storeName = nameBase.charAt(0).toUpperCase() + nameBase.slice(1);
    const storeSlug =
      nameBase.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) +
      "-" + Date.now().toString(36);
    store = {
      id: `store-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      name: storeName,
      slug: storeSlug,
      ownerUserId: user.id,
      email: user.email ?? "",
      address: "",
      createdAt: now,
    } as NonNullable<typeof state.stores>[number];
    state.stores = [store as NonNullable<typeof state.stores>[number], ...(state.stores ?? [])];
  }

  if (!store) {
    return NextResponse.json({ error: "No store found for this account." }, { status: 404 });
  }

  // ── Upload new listing ──────────────────────────────────────────────────────
  if (action === "upload-look") {
    const name = String(formData.get("name") ?? "").trim();
    const price = String(formData.get("price") ?? "").trim();
    const salePrice = String(formData.get("salePrice") ?? "").trim();
    const productNote = String(formData.get("productNote") ?? "").trim();
    const hashtags = String(formData.get("hashtags") ?? "").trim();
    const inStock = formData.get("inStock") !== "false";
    const published = formData.get("published") === "true";
    const campaignName = String(formData.get("campaignName") ?? "").trim();
    const availableSizesRaw = String(formData.get("availableSizes") ?? "").trim();
    const deliveryTime = String(formData.get("deliveryTime") ?? "").trim();
    const availabilityNote = String(formData.get("availabilityNote") ?? "").trim();
    const dealEndsAt = String(formData.get("dealEndsAt") ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "Listing name required." }, { status: 400 });
    }

    // Upload gallery images (galleryFile0 … galleryFile9)
    const galleryImagePaths: string[] = [];
    for (let i = 0; i < 10; i++) {
      const file = formData.get(`galleryFile${i}`);
      if (file instanceof File && file.size > 0) {
        const path = await uploadTryThisLookImage("looks", await fileToDataUrl(file));
        galleryImagePaths.push(path);
      }
    }

    const availableSizes = availableSizesRaw
      ? availableSizesRaw.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
      : undefined;

    const id = `look-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const look = {
      id,
      name,
      storeName: store.name,
      storeSlug: store.slug,
      campaignName: campaignName || undefined,
      price: price || undefined,
      salePrice: salePrice || undefined,
      availableSizes: availableSizes?.length ? availableSizes : undefined,
      productNote: productNote || undefined,
      hashtags: hashtags || undefined,
      inStock,
      published,
      deliveryTime: deliveryTime || undefined,
      availabilityNote: availabilityNote || undefined,
      dealEndsAt: dealEndsAt || undefined,
      // First gallery image is the main image
      imagePath: galleryImagePaths[0],
      galleryImagePaths: galleryImagePaths.length ? galleryImagePaths : undefined,
      createdAt: now,
    };

    state.looks = [look, ...(state.looks ?? [])];
    await saveTryThisLookState(state);
    return NextResponse.json({ ok: true, look });
  }

  // ── Update listing ──────────────────────────────────────────────────────────
  if (action === "update-look") {
    const lookId = String(formData.get("id") ?? "").trim();
    const existing = state.looks.find((l) => l.id === lookId && l.storeSlug === store.slug);
    if (!existing) {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    }

    const name = String(formData.get("name") ?? existing.name).trim();
    const price = formData.has("price") ? String(formData.get("price") ?? "").trim() : existing.price;
    const salePrice = formData.has("salePrice")
      ? String(formData.get("salePrice") ?? "").trim()
      : (existing as any).salePrice;
    const productNote = formData.has("productNote")
      ? String(formData.get("productNote") ?? "").trim()
      : existing.productNote;
    const hashtags = formData.has("hashtags")
      ? String(formData.get("hashtags") ?? "").trim()
      : (existing as any).hashtags;
    const inStock = formData.has("inStock") ? formData.get("inStock") !== "false" : existing.inStock;
    const published = formData.has("published") ? formData.get("published") === "true" : existing.published;
    const campaignName = formData.has("campaignName")
      ? String(formData.get("campaignName") ?? "").trim()
      : (existing as any).campaignName;
    const availableSizesRaw = formData.has("availableSizes")
      ? String(formData.get("availableSizes") ?? "").trim()
      : ((existing as any).availableSizes ?? []).join(", ");
    const deliveryTime = formData.has("deliveryTime")
      ? String(formData.get("deliveryTime") ?? "").trim()
      : (existing as any).deliveryTime;
    const availabilityNote = formData.has("availabilityNote")
      ? String(formData.get("availabilityNote") ?? "").trim()
      : (existing as any).availabilityNote;
    const dealEndsAt = formData.has("dealEndsAt")
      ? String(formData.get("dealEndsAt") ?? "").trim()
      : (existing as any).dealEndsAt;
    // Merge existing paths + new uploads for gallery
    const existingPathsRaw = String(formData.get("galleryExistingPaths") ?? "[]");
    let existingPaths: (string | null)[] = [];
    try { existingPaths = JSON.parse(existingPathsRaw); } catch { /**/ }

    // Build merged gallery: existing paths + new files by slot index
    const mergedPaths: (string | null)[] = existingPaths.length
      ? [...existingPaths]
      : Array.from({ length: 10 }, () => null);

    for (let i = 0; i < 10; i++) {
      const file = formData.get(`galleryFile${i}`);
      if (file instanceof File && file.size > 0) {
        mergedPaths[i] = await uploadTryThisLookImage("looks", await fileToDataUrl(file));
      }
    }

    const finalGalleryPaths = mergedPaths.filter((p): p is string => Boolean(p));

    const availableSizes = availableSizesRaw
      ? availableSizesRaw.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean)
      : undefined;

    state.looks = state.looks.map((l) =>
      l.id !== lookId
        ? l
        : {
            ...l,
            name,
            campaignName: campaignName || undefined,
            price: price || undefined,
            salePrice: salePrice || undefined,
            availableSizes: availableSizes?.length ? availableSizes : undefined,
            productNote: productNote || undefined,
            hashtags: hashtags || undefined,
            inStock,
            published,
            deliveryTime: deliveryTime || undefined,
            availabilityNote: availabilityNote || undefined,
            dealEndsAt: dealEndsAt || undefined,
            imagePath: finalGalleryPaths[0] || existing.imagePath,
            galleryImagePaths: finalGalleryPaths.length ? finalGalleryPaths : undefined,
          }
    );
    await saveTryThisLookState(state);
    return NextResponse.json({ ok: true });
  }

  // ── Delete listing ──────────────────────────────────────────────────────────
  if (action === "delete-look") {
    const lookId = String(formData.get("id") ?? "").trim();
    const existing = state.looks.find((l) => l.id === lookId && l.storeSlug === store.slug);
    if (!existing) {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    }
    state.looks = state.looks.filter((l) => l.id !== lookId);
    await saveTryThisLookState(state);
    return NextResponse.json({ ok: true });
  }

  // ── Update store profile ────────────────────────────────────────────────────
  if (action === "update-store") {
    const name = formData.has("name") ? String(formData.get("name") ?? "").trim() : store.name;
    const address = formData.has("address") ? String(formData.get("address") ?? "").trim() : store.address;
    const description = formData.has("description") ? String(formData.get("description") ?? "").trim() : (store as any).description;
    const instagram = formData.has("instagram") ? String(formData.get("instagram") ?? "").replace(/^@/, "").trim() : (store as any).instagram;

    if (!name) return NextResponse.json({ error: "Store name is required." }, { status: 400 });

    state.stores = (state.stores ?? []).map((s) =>
      s.slug !== store.slug ? s : {
        ...s,
        name,
        address: address || undefined,
        description: description || undefined,
        instagram: instagram || undefined,
      }
    );
    // Sync store name on all looks for this store
    state.looks = state.looks.map((l) =>
      l.storeSlug !== store.slug ? l : { ...l, storeName: name }
    );
    await saveTryThisLookState(state);
    return NextResponse.json({ ok: true });
  }

  // ── Request AI access ───────────────────────────────────────────────────────
  if (action === "request-ai-access") {
    state.stores = (state.stores ?? []).map((s) =>
      s.slug !== store.slug ? s : { ...s, pendingAiRequest: true }
    );
    await saveTryThisLookState(state);
    return NextResponse.json({ ok: true, message: "AI access request sent." });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
