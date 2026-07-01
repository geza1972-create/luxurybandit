import { readTryThisLookState } from "@/lib/try-this-look-store";
import { isAdminRequest } from "@/lib/admin-auth";

// Global try-on kill-switch enforcement. When state.tryonPaused is on, end-user try-on
// generation is blocked ("coming soon") — but admin (PIN / admin session) and staff
// (a curatorId that exists in the roster) always bypass it. This is the server-side
// backstop; the client also hides the flow, but this stops direct API calls too.
export async function tryonAllowed(request: Request, curatorId?: string): Promise<boolean> {
  const state = await readTryThisLookState();
  if (state.tryonPaused !== true) return true;          // not paused → everyone allowed
  if (await isAdminRequest(request)) return true;        // admin PIN / admin session
  const cid = String(curatorId ?? "").trim();
  if (cid && (state.curators ?? []).some((c) => c.id === cid)) return true; // staff/curator
  return false;
}

export const TRYON_PAUSED_MESSAGE = "Try-on is coming soon — it's temporarily paused. Check back shortly!";
