import { NextResponse } from "next/server";
import { KAMPAGNEN } from "@/lib/kampagnen";
import {
  readKissLog, writeKissLog, kampagnenBildBauen, kampagnenVideoBauen, kampagnenDeckelPruefen,
} from "@/lib/kampagnen-video";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * DIE ERZEUGUNGSROUTE FÜR JEDE KAMPAGNE — nicht für Lotto Hamburg allein.
 *
 * `[slug]` ist der Schlüssel aus `lib/kampagnen.ts` (`"lotto-hh"` heute, morgen ein zweiter).
 * Eine neue Kampagne braucht dafür KEINE eigene Route — nur einen Eintrag im Register. Sonst
 * dasselbe Muster wie `app/api/armee-video/route.ts`: zwei Aufrufe (erst das Gesicht in die
 * Szene, dann Pixverse), weil die Kette zusammen zwei bis drei Minuten braucht und der
 * Trichter zwischendurch wissen muss, wo er steht.
 */

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const kampagne = KAMPAGNEN[slug];
  if (!kampagne) return NextResponse.json({ error: "Unbekannte Kampagne." }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as
    { id?: string; phase?: string; szene?: string; device?: string };
  const id = String(body.id ?? "").trim();
  const phase = String(body.phase ?? "").trim();
  if (!id) return NextResponse.json({ error: "Kein Auftrag." }, { status: 400 });

  const alle = await readKissLog();
  const eintrag = alle.find(e => e.id === id && e.theme === slug);
  if (!eintrag) return NextResponse.json({ error: "Auftrag nicht gefunden." }, { status: 404 });

  const szeneId = String(body.szene ?? eintrag.look ?? "").trim();
  if (!kampagne.prompts[szeneId]) return NextResponse.json({ error: "Unbekanntes Glück." }, { status: 400 });

  /* ══ Phase 1 · Das Gesicht in die Szene ══ */
  if (phase === "bild") {
    const geraet = String(body.device ?? eintrag.device ?? "").trim();
    const deckel = await kampagnenDeckelPruefen(slug, geraet);
    if (!deckel.ok) return NextResponse.json({ error: deckel.error }, { status: 429 });

    if (!eintrag.personPath) return NextResponse.json({ error: "Kein Foto am Auftrag." }, { status: 400 });
    const { getSignedUrl } = await import("@/lib/try-this-look-store");
    const fotoUrl = await getSignedUrl(eintrag.personPath).catch(() => "");
    if (!fotoUrl) return NextResponse.json({ error: "Dein Foto ist nicht mehr abrufbar." }, { status: 502 });

    const res = await kampagnenBildBauen(slug, szeneId, fotoUrl);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });

    const jetzt = await readKissLog();
    const ziel = jetzt.find(e => e.id === id);
    if (ziel) { ziel.imagePath = res.pfad; ziel.look = szeneId; await writeKissLog(jetzt); }
    return NextResponse.json({ ok: true, bildUrl: res.bildUrl });
  }

  /* ══ Phase 2 · Aus dem Bild wird Bewegung ══ */
  if (phase === "video") {
    if (!eintrag.imagePath) return NextResponse.json({ error: "Noch kein Bild." }, { status: 400 });
    const res = await kampagnenVideoBauen(slug, szeneId, eintrag.imagePath);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });

    const jetzt = await readKissLog();
    const ziel = jetzt.find(e => e.id === id);
    if (ziel) { ziel.videoUrl = res.videoUrl; await writeKissLog(jetzt); }
    const { getSignedUrl } = await import("@/lib/try-this-look-store");
    const poster = eintrag.imagePath ? await getSignedUrl(eintrag.imagePath, 60 * 60 * 24 * 365).catch(() => "") : "";
    return NextResponse.json({ ok: true, videoUrl: res.videoUrl, poster });
  }

  return NextResponse.json({ error: "Unbekannte Phase." }, { status: 400 });
}
