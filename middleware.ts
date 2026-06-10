import { NextResponse, type NextRequest } from "next/server";

const arrivalsHosts = new Set(["luxurybandit.com", "www.luxurybandit.com", "luxurybandi.com", "www.luxurybandi.com"]);

const PROTECTED_PREFIXES = ["/admin", "/tools"];

function requiresAuth(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  const { pathname } = request.nextUrl;

  // ── Domain rewrite: luxurybandit.com / → /stores ──────────────────────────
  if (arrivalsHosts.has(host) && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/stores";
    return NextResponse.rewrite(url);
  }

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
    "/",
    "/admin",
    "/admin/:path*",
    "/tools",
    "/tools/:path*",
  ],
};
