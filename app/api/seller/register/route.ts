import { NextResponse } from "next/server";
import { readTryThisLookState, saveTryThisLookState } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const maxDuration = 30;

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

async function supabaseSignUp(email: string, password: string) {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
      .replace(/^["']|["']$/g, "")
      .replace(/\/$/, "") ?? "";
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim().replace(/^["']|["']$/g, "") ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim().replace(/^["']|["']$/g, "") ||
    "";

  if (!url || !anonKey) {
    throw new Error("Supabase is not configured.");
  }

  const res = await fetch(`${url}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const payload = await res.json();
  if (!res.ok) {
    throw new Error(
      payload?.error_description ?? payload?.msg ?? payload?.message ?? "Registration failed."
    );
  }
  return payload; // { access_token, user, ... } or { user: { id } } if email confirm required
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "").trim();
  const storeName = String(body.storeName ?? "").trim();

  if (!email || !password || !storeName) {
    return NextResponse.json({ error: "email, password and storeName required." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  // 1. Create Supabase auth user
  let supabasePayload: any;
  try {
    supabasePayload = await supabaseSignUp(email, password);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Registration failed." },
      { status: 400 }
    );
  }

  const userId = supabasePayload?.user?.id ?? supabasePayload?.id;
  if (!userId) {
    // Email confirmation required — account created, but no session yet
    return NextResponse.json({
      ok: true,
      requiresEmailConfirm: true,
      message: "Account created. Please confirm your email, then log in.",
    });
  }

  // 2. Generate unique store slug
  const state = await readTryThisLookState();
  const existingSlugs = new Set((state.stores ?? []).map((s) => s.slug));
  let baseSlug = String(body.storeSlug ?? "").trim() || slugify(storeName);
  let storeSlug = baseSlug;
  let counter = 2;
  while (existingSlugs.has(storeSlug)) {
    storeSlug = `${baseSlug}-${counter++}`;
  }

  // Check if this userId already has a store
  const existingStore = (state.stores ?? []).find((s) => s.ownerUserId === userId);
  if (existingStore) {
    return NextResponse.json({
      ok: true,
      storeSlug: existingStore.slug,
      session: supabasePayload,
    });
  }

  // 3. Create store entry
  const now = new Date().toISOString();
  const store = {
    id: `store-${storeSlug}`,
    name: storeName,
    slug: storeSlug,
    ownerUserId: userId,
    ownerEmail: email,
    aiEnabled: false,
    aiCreditsLimit: 0,
    aiCreditsUsed: 0,
    aiCreditsResetAt: now,
    pendingAiRequest: false,
    createdAt: now,
  };

  state.stores = [store, ...(state.stores ?? [])];
  await saveTryThisLookState(state);

  return NextResponse.json({
    ok: true,
    storeSlug,
    session: supabasePayload,
  });
}
