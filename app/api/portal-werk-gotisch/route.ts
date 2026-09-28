import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";
import { mandantLesen } from "@/lib/versusforge-mandanten";
import { motivPfad } from "@/lib/versusforge-moderation";
import { istKuenstler } from "@/lib/lakatosbandi";
import { gotischGerahmt, RAHMEN_HELLGRAU } from "@/lib/lakatosbandi-textil";

/**
 * DAS WERK IM GOTISCHEN RAHMEN, FÜRS POSTER (Owner 28.09.2026: „der Rahmen auf den T-Shirts, so
 * hätte ich das gerne auch auf Poster die Bilder").
 *
 * Dasselbe Kirchenfenster wie auf dem Shirt (`gotischGerahmt` in lib/lakatosbandi-textil.ts), nur
 * in Tinte, weil das Papier hell ist. Durchsichtiger Hintergrund (WebP), damit das Papier des
 * Blattes durchscheint. Nur für Künstler mit `rahmenStil: "gotisch"`.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TINTE = "#1f1c17";

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const kennung = String(sp.get("m") ?? "").slice(0, 80);
  const i = String(sp.get("i") ?? "standard").slice(0, 12);
  const nr = i === "-1" || i === "standard" ? "standard" : i;
  const wRoh = Math.round(Number(sp.get("w")) || 0);
  const breite = wRoh >= 200 && wRoh <= 2000 ? wRoh : 900;

  const m = kennung ? await mandantLesen(kennung) : null;
  if (!m || !istKuenstler(m) || m.freigabe !== "frei" || m.rahmenStil !== "gotisch") {
    return new Response("Not found", { status: 404 });
  }
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(motivPfad(kennung, nr === "standard" ? "" : nr))}`);
  if (!res.ok) return new Response("Not found", { status: 404 });

  const sharp = (await import("sharp")).default;
  const gerahmt = await gotischGerahmt(sharp, Buffer.from(await res.arrayBuffer()), breite, breite * 1.6, m.posterDunkel ? RAHMEN_HELLGRAU : TINTE);
  const bild = await sharp(gerahmt.data).webp({ quality: 86, alphaQuality: 90 }).toBuffer();
  return new Response(new Uint8Array(bild), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
    },
  });
}
