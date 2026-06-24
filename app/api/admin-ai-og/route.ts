import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 20;

// Same PIN that protects /admin and the other admin actions.
function isAdmin(request: Request) {
  const configuredPin = process.env.TRY_THIS_LOOK_ADMIN_PIN?.trim();
  if (!configuredPin) return process.env.NODE_ENV !== "production";
  return request.headers.get("x-try-look-admin-pin") === configuredPin;
}

function extractOgImage(html: string): string {
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1];
  }
  return "";
}

// Returns the source page's preview image (og:image) for a given URL — used by
// the Trend Scanner to show real images from the sources Claude found.
export async function POST(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  let payload: { url?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ image: "", url: "" });
  }

  let target: URL;
  try {
    target = new URL(String(payload.url ?? ""));
  } catch {
    return NextResponse.json({ image: "", url: "" });
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return NextResponse.json({ image: "", url: "" });
  }

  try {
    const res = await fetch(target.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; LuxuryBanditBot/1.0; +https://luxurybandit.com)",
        Accept: "text/html",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    const html = (await res.text()).slice(0, 250_000);
    let image = extractOgImage(html);
    if (image.startsWith("//")) image = `${target.protocol}${image}`;
    else if (image.startsWith("/")) image = `${target.origin}${image}`;
    return NextResponse.json({ image, url: target.toString() });
  } catch {
    return NextResponse.json({ image: "", url: target.toString() });
  }
}
