import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 20;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

// Proxies a remote image so thumbnails from hotlink-protected sources (e.g. eMAG)
// display in the browser. Only serves image content from http(s) URLs.
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url") ?? "";
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new NextResponse("Bad URL", { status: 400 });
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return new NextResponse("Bad URL", { status: 400 });
  }

  try {
    const res = await fetch(target.toString(), {
      headers: { "User-Agent": UA, Accept: "image/*,*/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return new NextResponse("Not found", { status: 404 });
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) return new NextResponse("Not an image", { status: 415 });
    const buf = Buffer.from(await res.arrayBuffer());
    return new NextResponse(buf, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("Upstream error", { status: 502 });
  }
}
