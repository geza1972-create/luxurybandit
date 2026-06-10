import { NextResponse } from "next/server";
import { getSellerFromRequest } from "@/lib/supabase-auth-server";
import { readTryThisLookState } from "@/lib/try-this-look-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getSellerFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const state = await readTryThisLookState();
  const store = (state.stores ?? []).find((s) => s.ownerUserId === user.id);
  if (!store) {
    return NextResponse.json({ error: "No store found for this account." }, { status: 404 });
  }

  // Monthly credit reset
  const resetAt = store.aiCreditsResetAt ? new Date(store.aiCreditsResetAt) : new Date(0);
  const now = new Date();
  const shouldReset =
    now.getFullYear() !== resetAt.getFullYear() ||
    now.getMonth() !== resetAt.getMonth();

  const looks = (state.looks ?? []).filter((l) => l.storeSlug === store.slug);

  return NextResponse.json({
    store: {
      ...store,
      aiCreditsUsed: shouldReset ? 0 : (store.aiCreditsUsed ?? 0),
    },
    looks,
  });
}
