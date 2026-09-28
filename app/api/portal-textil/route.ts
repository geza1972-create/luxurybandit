import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";
import { mandantLesen } from "@/lib/versusforge-mandanten";
import { motivPfad } from "@/lib/versusforge-moderation";
import { istKuenstler } from "@/lib/lakatosbandi";
import { textilDruckBauen } from "@/lib/lakatosbandi-textil";

/**
 * DAS MOTIV AUF DEM RÜCKEN (Owner 28.09.2026: „alle Motive auf T-Shirts und Hoodies" · „genauso
 * wie ich die Kunstwerke als Poster anbiete, auch auf Produkte anbieten").
 *
 * Keine KI, keine Kosten: Das Werk wird mit `sharp` auf das Rückenfoto des schwarzen Shirts bzw.
 * Hoodies (`public/lakatosbandi/*-schwarz.png`, 1254 × 1254) gelegt — in die Fläche zwischen
 * Schultern und Saum, im eigenen Seitenverhältnis, nie beschnitten. Ausgeliefert wird nur, was
 * der Künstler angehakt hat (`WerkInfo.textil`) und was freigegeben ist.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* Fläche fürs Werk je Stück, in Pixeln der 1254er Vorlage: Mitte x, Oberkante y, grösste
   Breite/Höhe. Zweimal verkleinert (Owner 28.09.2026: „35 % kleiner" · „das Motiv kleiner") —
   darunter steht der Spruch. */
/* Das Bild danach wieder 20 % grösser (Owner 28.09.2026) — der Spruch bleibt so gross wie er war
   (`schrift` ist die alte Breite). */
const FLAECHE = {
  tricou: { vorlage: "/lakatosbandi/shirt-schwarz.png", mitte: 627, oben: 230, breit: 276, hoch: 348, schrift: 230 },
  hanorac: { vorlage: "/lakatosbandi/hoodie-schwarz.png", mitte: 627, oben: 370, breit: 270, hoch: 306, schrift: 225 },
} as const;

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const kennung = String(sp.get("m") ?? "").slice(0, 80);
  const i = String(sp.get("i") ?? "-1").slice(0, 12);
  const art = sp.get("art") === "hanorac" ? "hanorac" : "tricou";
  const wRoh = Math.round(Number(sp.get("w")) || 0);
  const breite = wRoh >= 200 && wRoh <= 1254 ? wRoh : 900;

  const m = kennung ? await mandantLesen(kennung) : null;
  const nr = i === "-1" || i === "standard" ? "standard" : i;
  if (!m || !istKuenstler(m) || m.freigabe !== "frei" || !m.werkInfo?.[nr]?.textil) {
    return new Response("Not found", { status: 404 });
  }

  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(motivPfad(kennung, nr === "standard" ? "" : nr))}`);
  if (!res.ok) return new Response("Not found", { status: 404 });
  const motivRoh = Buffer.from(await res.arrayBuffer());

  const f = FLAECHE[art];
  const vorlageRes = await fetch(new URL(f.vorlage, request.url));
  if (!vorlageRes.ok) return new Response("Vorlage fehlt", { status: 500 });
  const vorlage = Buffer.from(await vorlageRes.arrayBuffer());

  const sharp = (await import("sharp")).default;
  const druck = await textilDruckBauen({
    motiv: motivRoh,
    /* Nur seine kurze Shirt-Zeile — nie der lange Poster-Spruch (Owner 28.09.2026). */
    spruch: String(m.werkInfo?.[nr]?.textilZeile ?? ""),
    breite: f.breit, hoch: f.hoch, schrift: f.schrift,
  });
  const links = Math.round(f.mitte - druck.breite / 2);

  /* Erst zusammensetzen, DANN verkleinern — in einem Durchgang verkleinert sharp die Vorlage vor
     dem Aufsetzen, und das Motiv sässe an den Koordinaten des grossen Bildes (rechts unten). */
  const ganz = await sharp(vorlage)
    .composite([{ input: druck.bild, left: links, top: f.oben }])
    .png()
    .toBuffer();
  const bild = await sharp(ganz).resize({ width: breite }).jpeg({ quality: 84, mozjpeg: true }).toBuffer();

  return new Response(new Uint8Array(bild), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
    },
  });
}
