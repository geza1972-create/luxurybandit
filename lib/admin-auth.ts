// Admin authorization: a request is admin if EITHER the admin PIN header matches
// (legacy / fallback), OR it carries a valid Supabase session whose email is in
// the admin allowlist (NEXT_PUBLIC_ADMIN_EMAIL). Passwords are handled by Supabase
// (hashed) — we only verify the token here.
import { getSellerFromRequest } from "@/lib/supabase-auth-server";
import { isAdminEmail } from "@/lib/is-admin-email";

export function adminPinMatches(request: Request): boolean {
  const pin = process.env.TRY_THIS_LOOK_ADMIN_PIN?.trim();
  if (!pin) return process.env.NODE_ENV !== "production"; // local dev without a PIN = open
  return request.headers.get("x-try-look-admin-pin") === pin;
}

export async function isAdminRequest(request: Request): Promise<boolean> {
  if (adminPinMatches(request)) return true; // fast path, no network
  try {
    const user = await getSellerFromRequest(request); // verifies the Bearer token with Supabase
    return !!(user?.email && isAdminEmail(user.email));
  } catch {
    return false;
  }
}
