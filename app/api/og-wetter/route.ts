import { readCardStudioSlides, getSignedUrl, isPublicBellaPost, sortBellaPosts, readTryThisLookState } from "@/lib/try-this-look-store";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BELLA_ID = "curator-1783683672619-td4cy";

/**
 * VORSCHAUBILD für WhatsApp/Facebook — der BEITRAG VON HEUTE, verschwommen.
 *
 * Vorher lag hier eine feste Datei; damit zeigte die Karte wochenlang dasselbe Motiv
 * (Owner 28.07.2026: „jetzt erscheint aber nicht das Bild von heute"). Jetzt dieselbe
 * Auswahl wie die Tagespost: der Beitrag mit dem heutigen Datum, sonst der neueste
 * vergangene; Werbe-Beiträge nie.
 *
 * VERSCHWOMMEN wie in der Mail (600 px, Blur 24, JPEG 72): ein Link in einem fremden
 * Chat darf kein freizügiges Bild aufpoppen lassen — und Neugier weckt es trotzdem.
 *
 * Zwischenspeicher: eine Stunde am Rand (`s-maxage`), damit nicht jede Vorschau neu
 * rechnet. WhatsApp merkt sich Karten ohnehin pro Adresse — der Aufrufer hängt deshalb
 * das Datum an (`?d=2026-07-28`), damit täglich eine neue Adresse entsteht.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  // Der Aufrufer schickt den SLUG aus der Adresse („bella"); die Beitraege haengen aber an
  // der Kurator-Id. Beides zulassen, damit die Karte nie ins Leere greift.
  const raw = url.searchParams.get("model")?.trim() || "";
  let modelId = raw.startsWith("curator-") ? raw : "";
  if (!modelId && raw) {
    try {
      const st = await readTryThisLookState();
      const slug = (v: string) => v.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
      const hit = (st.curators ?? []).find(c => slug([c.firstName, c.lastName].filter(Boolean).join(" ")) === slug(raw)
        || slug(String((c as { modelName?: string }).modelName ?? "")) === slug(raw));
      modelId = hit?.id ?? "";
    } catch { /* dann eben Bella */ }
  }
  if (!modelId) modelId = BELLA_ID;

  try {
    const slides = (await readCardStudioSlides(modelId)).filter(isPublicBellaPost).sort(sortBellaPosts);
    const todayISO = new Date().toISOString().slice(0, 10);
    const nonAd = slides.filter(s => (s as { ad?: boolean }).ad !== true);
    const pick =
      nonAd.find(s => s.day === todayISO)
      ?? [...nonAd].filter(s => s.day && s.day <= todayISO).sort((a, b) => String(b.day).localeCompare(String(a.day)))[0]
      ?? nonAd[0] ?? slides[0];
    const path = pick ? (pick.kind === "video" ? (pick.posterPath || "") : pick.path) : "";
    if (!path) return Response.redirect(`${url.origin}/wetter-og.jpg`, 302);

    const src = await getSignedUrl(path, 60 * 10).catch(() => "");
    if (!src) return Response.redirect(`${url.origin}/wetter-og.jpg`, 302);
    const raw = Buffer.from(await (await fetch(src)).arrayBuffer());
    const out = await sharp(raw).resize({ width: 600 }).blur(24).jpeg({ quality: 72 }).toBuffer();

    return new Response(new Uint8Array(out), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    // Lieber das feste Bild als eine leere Karte.
    return Response.redirect(`${url.origin}/wetter-og.jpg`, 302);
  }
}
