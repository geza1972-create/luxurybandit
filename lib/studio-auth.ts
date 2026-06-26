import { readTryThisLookState } from "@/lib/try-this-look-store";

export type StudioAuth = { ok: boolean; curatorId?: string; isAdmin: boolean };

// AI Studio is reachable by the platform admin (PIN) OR by an active curator
// (their id, validated against the stored curators). Curators are credit-capped;
// the admin is not.
export async function authorizeStudio(request: Request): Promise<StudioAuth> {
  const pin = process.env.TRY_THIS_LOOK_ADMIN_PIN?.trim();

  // Admin via PIN header (matches the existing admin-* convention).
  if (pin && request.headers.get("x-try-look-admin-pin") === pin) {
    // The admin can "Act as" a curator (impersonation): keep admin privileges
    // (no credit cap) but ATTRIBUTE the post to that curator so it shows on their
    // profile. Without this the PIN short-circuited attribution → everything went
    // to the house account.
    const actingAs = request.headers.get("x-curator-id")?.trim();
    if (actingAs) {
      try {
        const state = await readTryThisLookState();
        const curator = (state.curators ?? []).find(c => c.id === actingAs);
        if (curator) return { ok: true, isAdmin: true, curatorId: actingAs };
      } catch { /* fall through to plain admin */ }
    }
    return { ok: true, isAdmin: true };
  }
  // No PIN configured (local dev) → treat as admin
  if (!pin && process.env.NODE_ENV !== "production") {
    return { ok: true, isAdmin: true };
  }

  // Curator session
  const curatorId = request.headers.get("x-curator-id")?.trim();
  if (curatorId) {
    try {
      const state = await readTryThisLookState();
      const curator = (state.curators ?? []).find(c => c.id === curatorId && c.status === "active");
      if (curator) return { ok: true, curatorId, isAdmin: false };
    } catch { /* fall through to unauthorized */ }
  }

  return { ok: false, isAdmin: false };
}
