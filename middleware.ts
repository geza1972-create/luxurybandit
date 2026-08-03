import { NextResponse, type NextRequest } from "next/server";

// /admin is NOT here: it gates itself with the admin PIN (client form + every
// admin API verifies x-try-look-admin-pin server-side). HTTP Basic Auth broke in
// embedded/in-app browsers (no login dialog → "Authentication required" wall).
//
// /admin/tools IS here — and is the one exception to the line above. These are the
// LuxbanditCut/LuxbanditFit workbenches: /tools/… has always been behind Basic Auth,
// but the /admin/… twin was a bare re-export with no gate at all, so the same editor
// was reachable by anyone who knew the URL. The in-app-browser problem does not apply
// here: this is an owner surface opened from the admin menu in a normal browser.
const PROTECTED_PREFIXES = ["/tools", "/admin/tools"];

function requiresAuth(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Start page (/ → /stores?tab=community) is handled by redirects() in
  // next.config.mjs, which runs before middleware.

  // ── Protect /admin and /tools with HTTP Basic Auth ─────────────────────────
  if (requiresAuth(pathname)) {
    const adminPin = process.env.TRY_THIS_LOOK_ADMIN_PIN;

    // No PIN configured (local dev) → allow through
    if (!adminPin) {
      return NextResponse.next();
    }

    const auth = request.headers.get("authorization") ?? "";
    let authorised = false;

    if (auth.startsWith("Basic ")) {
      try {
        // atob works in edge runtime
        const decoded = atob(auth.slice(6));
        // Basic auth format: "username:password" — we only check password
        const password = decoded.includes(":") ? decoded.slice(decoded.indexOf(":") + 1) : decoded;
        authorised = password === adminPin;
      } catch {
        authorised = false;
      }
    }

    if (!authorised) {
      return new NextResponse("Authentication required", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="LuxuryBandit"',
        },
      });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/tools",
    "/tools/:path*",
    "/admin/tools",
    "/admin/tools/:path*",
  ],
};
