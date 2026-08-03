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

/**
 * DER ZWEITE WEG HINEIN — ein PIN im Link statt eines Anmeldefensters.
 *
 * Owner 03.08.2026, mit einem Bildschirmfoto von „Authentication required" auf
 * /admin/tools/luxbanditcut. Die Annahme drei Absaetze weiter oben („opened … in a normal
 * browser") stimmte nicht: Er hatte die Werkbank im EINGEBAUTEN Vorschau-Browser offen, und
 * der zeigt kein Basic-Auth-Fenster. Damit ist die Wand fuer ihn nicht ueberwindbar — nicht
 * mit dem richtigen PIN, nicht mit irgendetwas. Genau der Fehler, den der Kommentar oben fuer
 * `/admin` schon einmal beschrieben hat.
 *
 * DIE SPERRE BLEIBT (Owner-Entscheidung): Wer den PIN nicht hat, kommt weiterhin nicht rein.
 * Neu ist nur ein zweiter Schluessel fuer dieselbe Tuer — `?pin=…` einmal aufrufen, danach
 * traegt ein Keks den Nachweis.
 *
 * WARUM DER PIN SOFORT AUS DER ADRESSZEILE FLIEGT: Ein Geheimnis in einer URL landet im
 * Verlauf, in Server-Protokollen und im `Referer` jedes Bildes, das die Seite laedt. Deshalb
 * antwortet dieser Zweig mit einer Umleitung auf dieselbe Seite OHNE `pin` und legt den
 * Nachweis in einen `HttpOnly`-Keks: Nach dem ersten Klick steht der PIN nirgends mehr.
 */
const PIN_KEKS = "lb_tools_pin";

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

    /**
     * DER PIN IM LINK — einmal, dann nie wieder sichtbar.
     *
     * Steht er dran und stimmt er, geht es NICHT einfach weiter: Es folgt eine Umleitung auf
     * dieselbe Adresse ohne `pin`, mit dem Keks im Gepaeck. Sonst bliebe das Geheimnis in der
     * Adresszeile stehen, und der naechste Bildschirmfoto-Moment verteilt es.
     *
     * Ein FALSCHER PIN faellt bewusst durch: Er landet unten bei der 401, statt eine eigene
     * Meldung zu bekommen. „Der PIN war falsch" ist eine Auskunft, die nur dem nuetzt, der
     * raet.
     */
    const pinAusLink = request.nextUrl.searchParams.get("pin");
    if (pinAusLink && pinAusLink === adminPin) {
      const ziel = request.nextUrl.clone();
      ziel.searchParams.delete("pin");
      const antwort = NextResponse.redirect(ziel);
      antwort.cookies.set(PIN_KEKS, adminPin, {
        httpOnly: true,          // kein Zugriff aus JavaScript — auch nicht fuer fremde Skripte
        sameSite: "lax",
        secure: request.nextUrl.protocol === "https:",   // lokal laeuft es ueber http
        path: "/",               // deckt /tools UND /admin/tools ab
        maxAge: 60 * 60 * 24 * 30,   // 30 Tage, dann meldet er sich neu an
      });
      return antwort;
    }

    const auth = request.headers.get("authorization") ?? "";
    // Der Keks aus einem frueheren `?pin=…` — der Weg, der auch im eingebauten Browser geht.
    let authorised = request.cookies.get(PIN_KEKS)?.value === adminPin;

    if (!authorised && auth.startsWith("Basic ")) {
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
