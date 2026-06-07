import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 45;

const MAX_IMAGES = 10;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const toAbsoluteUrl = (value: string, baseUrl: string) => {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return "";
  }
};

const pickSrcsetImage = (srcset: string) => {
  const candidates = srcset
    .split(",")
    .map((item) => item.trim().split(/\s+/)[0])
    .filter(Boolean);
  return candidates[candidates.length - 1] ?? "";
};

const unique = (items: string[]) => Array.from(new Set(items.filter(Boolean)));

const extractImageUrls = (html: string, pageUrl: string) => {
  const urls: string[] = [];
  const imageMetaPattern = /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["'][^>]*>/gi;
  const reversedMetaPattern = /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*>/gi;
  const imagePattern = /<img[^>]+>/gi;

  for (const match of html.matchAll(imageMetaPattern)) urls.push(toAbsoluteUrl(match[1] ?? "", pageUrl));
  for (const match of html.matchAll(reversedMetaPattern)) urls.push(toAbsoluteUrl(match[1] ?? "", pageUrl));

  for (const match of html.matchAll(imagePattern)) {
    const tag = match[0] ?? "";
    const src =
      tag.match(/\s(?:src|data-src|data-original)=["']([^"']+)["']/i)?.[1] ??
      pickSrcsetImage(tag.match(/\s(?:srcset|data-srcset)=["']([^"']+)["']/i)?.[1] ?? "");
    const absolute = toAbsoluteUrl(src, pageUrl);
    if (absolute && !absolute.startsWith("data:")) urls.push(absolute);
  }

  return unique(urls)
    .filter((url) => !/\.svg(?:\?|$)/i.test(url))
    .slice(0, MAX_IMAGES * 3);
};

async function imageUrlToDataUrl(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 LuxuryBandit image importer",
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
    }
  });
  if (!response.ok) return null;

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/") || contentType.includes("svg")) return null;

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) return null;

  return {
    sourceUrl: url,
    dataUrl: `data:${contentType.split(";")[0]};base64,${bytes.toString("base64")}`
  };
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { url?: string };
    const pageUrl = String(payload.url ?? "").trim();
    if (!/^https?:\/\//i.test(pageUrl)) {
      return NextResponse.json({ error: "Please enter a full website URL starting with http:// or https://." }, { status: 400 });
    }

    const pageResponse = await fetch(pageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 LuxuryBandit image importer",
        Accept: "text/html,application/xhtml+xml"
      }
    });
    if (!pageResponse.ok) {
      return NextResponse.json({ error: `Website could not be loaded. Status ${pageResponse.status}.` }, { status: 502 });
    }

    const html = await pageResponse.text();
    const imageUrls = extractImageUrls(html, pageUrl);
    const images = [];
    for (const imageUrl of imageUrls) {
      if (images.length >= MAX_IMAGES) break;
      const image = await imageUrlToDataUrl(imageUrl).catch(() => null);
      if (image) images.push(image);
    }

    return NextResponse.json({ images });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Website images could not be imported." },
      { status: 500 }
    );
  }
}
