import { NextResponse } from "next/server";
import { readKissLog } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DER SCHMALE STATUS FUER DEN WARTENDEN TRICHTER (Owner 14.08.2026: „wenn das Video so
 * lange dauert, muss man schreiben, dass es laenger dauert und per E-Mail kommt").
 *
 * Stirbt der Browser-Start, uebernimmt der Server — aber der Trichter brauchte bisher die
 * HeyGen-Kennung aus GENAU dem gestorbenen Aufruf, um weiterzupollen. Diese Route liest
 * den AUFTRAG: Sobald der Server geliefert hat, bekommt der wartende Browser das Video
 * doch noch zu sehen, statt ewig auf eine tote Antwort zu warten.
 *
 * Auskunft nur ueber die genId (UUID) — dasselbe Geheimnis, mit dem auch der geteilte
 * /w/<id>-Link den Auftrag zeigt; Schreiben kann diese Route nichts.
 */
export async function GET(request: Request) {
  const genId = String(new URL(request.url).searchParams.get("genId") ?? "").trim();
  if (!genId) return NextResponse.json({ error: "genId fehlt." }, { status: 400 });
  const e = (await readKissLog().catch(() => [])).find(x => x.id === genId);
  if (!e) return NextResponse.json({ fertig: false });
  return NextResponse.json({
    fertig: !!e.videoUrl,
    ...(e.videoUrl ? { videoUrl: e.videoUrl } : {}),
    ...(e.videoId ? { videoId: e.videoId } : {}),
    ...(e.videoError ? { fehler: e.videoError } : {}),
  });
}
