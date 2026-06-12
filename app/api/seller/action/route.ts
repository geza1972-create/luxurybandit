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
    } as (typeof state.stores)[number];
    state.stores = [store, ...(state.stores ?? [])];
  }

  if (!store) {
    return NextResponse.json({ error: "No store found for this account." }, { status: 404 });
  }

  const now = new Date().toISOString();

  // ── Upload new listing ──────────────────────────────────────────────────────
  if (action === "upload-look") {
    const name = String(formData.get("name") ?? "").trim();
    const price = String(formData.get("price") ?? "").trim();
    const salePrice = String(formData.get("salePrice") ?? "").trim();
    const productNote = String(formData.get("productNote") ?? "").trim();
    const hashtags = String(formData.get("hashtags") ?? "").trim();
    const inStock = formData.get("inStock") !== "false";
    const imageFile = formData.get("image");

    if (!name) {
      return NextResponse.json({ error: "Listing name required." }, { status: 400 });
    }

    let imagePath: string | undefined;
    if (imageFile instanceof File && imageFile.size > 0) {
      imagePath = await uploadTryThisLookImage("looks", await fileToDataUrl(imageFile));
    }

    const id = `look-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const look = {
      id,
      name,
      storeName: store.name,
      storeSlug: store.slug,
      price: price || undefined,
      salePrice: salePrice || undefined,
      productNote: productNote || undefined,
      hashtags: hashtags || undefined,
      inStock,
      published: false, // drafts until approved
      imagePath,
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
      : existing.salePrice;
    const productNote = formData.has("productNote")
      ? String(formData.get("productNote") ?? "").trim()
      : existing.productNote;
    const hashtags = formData.has("hashtags")
      ? String(formData.get("hashtags") ?? "").trim()
      : (existing as any).hashtags;
    const inStock = formData.has("inStock") ? formData.get("inStock") !== "false" : existing.inStock;
    const imageFile = formData.get("image");

    let imagePath = existing.imagePath;
    if (imageFile instanceof File && imageFile.size > 0) {
      imagePath = await uploadTryThisLookImage("looks", await fileToDataUrl(imageFile));
    }

    state.looks = state.looks.map((l) =>
      l.id !== lookId
        ? l
        : {
            ...l,
            name,
            price: price || undefined,
            salePrice: salePrice || undefined,
            productNote: productNote || undefined,
            hashtags: hashtags || undefined,
            inStock,
            imagePath,
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
