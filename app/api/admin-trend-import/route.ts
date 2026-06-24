import { NextResponse } from "next/server";
import { authorizeStudio } from "@/lib/studio-auth";

export const runtime = "nodejs";
export const maxDuration = 30;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

function pick(html: string, patterns: RegExp[]): string {
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return "";
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

// Imports a product page (e.g. eMAG) into a draft look: photo, name, price, link.
export async function POST(request: Request) {
  if (!(await authorizeStudio(request)).ok) {
    return NextResponse.json({ error: "Studio access only." }, { status: 403 });
  }

  let payload: { url?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(String(payload.url ?? ""));
  } catch {
    return NextResponse.json({ error: "Kein gültiger Link." }, { status: 400 });
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return NextResponse.json({ error: "Kein gültiger Link." }, { status: 400 });
  }

  try {
    const pageRes = await fetch(target.toString(), {
      headers: { "User-Agent": UA, Accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    const html = (await pageRes.text()).slice(0, 400_000);

    let imageUrl = pick(html, [
      /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    ]);
    if (imageUrl.startsWith("//")) imageUrl = `${target.protocol}${imageUrl}`;
    else if (imageUrl.startsWith("/")) imageUrl = `${target.origin}${imageUrl}`;

    let name = decodeEntities(
      pick(html, [
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
        /<title[^>]*>([^<]+)<\/title>/i,
      ])
    );
    // strip common site suffixes
    name = name.replace(/\s*[-–|]\s*eMAG(\.ro)?\s*$/i, "").replace(/\s*[-–|]\s*[A-Za-z0-9.]+\s*$/, (m) => (name.length - m.length > 12 ? "" : m)).trim();

    const priceNum = pick(html, [
      /"price"\s*:\s*"?([0-9]+(?:[.,][0-9]+)?)"?/i,
      /<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([0-9.,]+)["']/i,
    ]);
    const currency =
      pick(html, [
        /"priceCurrency"\s*:\s*"([A-Z]{3})"/i,
        /<meta[^>]+property=["']product:price:currency["'][^>]+content=["']([A-Z]{3})["']/i,
      ]) || "RON";
    const price = priceNum ? `${priceNum} ${currency}` : "";

    if (!imageUrl) {
      return NextResponse.json({ error: "Kein Produktbild gefunden (Quelle blockt evtl.)." }, { status: 422 });
    }

    // Download the product image and inline it as a data URL (used directly at publish).
    const imgRes = await fetch(imageUrl, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(15000),
    });
    if (!imgRes.ok) {
      return NextResponse.json({ error: `Produktbild nicht ladbar (${imgRes.status}).` }, { status: 422 });
    }
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const mime = imgRes.headers.get("content-type")?.split(";")[0] || "image/jpeg";
    const imageDataUrl = `data:${mime};base64,${buf.toString("base64")}`;

    return NextResponse.json({
      draft: {
        name: name || "Trend Look",
        price,
        sourceUrl: target.toString(),
        imageUrl,        // public product image — used for visual dupe search
        imageDataUrl,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
