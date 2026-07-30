import { NextResponse } from "next/server";
import { readTryThisLookState, saveTryThisLookState, createSignedUploadUrl, getSignedUrl, readKissLog, type KissLogEntry } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * „My Gallery" — die Videos, die der KUNDE erzeugt hat.
 *
 * Warum es das gibt: Die Videos wurden nirgends abgelegt (Owner 28.07.2026: „wo erscheinen
 * jetzt die Videos?"). Die Adressen des Video-Anbieters verfallen nach Stunden — ohne eigene
 * Kopie ist das Video auch für den weg, der dafür bezahlt hat.
 *
 * ZUORDNUNG (Owner-Entscheidung „C"): am GERÄT **und** am Konto. `device` ist eine zufällige
 * Kennung im Browser — damit sieht er seine Videos sofort wieder, ohne Anmeldung. Kennen wir
 * zusätzlich seine E-Mail (Abo/Anmeldung), hängt das Video auch daran und folgt ihm auf jedes
 * andere Gerät.
 *
 * Diese Videos sind PRIVAT: `feed`/`public` bleiben false, sie tauchen in keinem
 * öffentlichen Feed auf (Hausregel für intime Try-ons).
 */

const clean = (s: unknown, max = 200) => String(s ?? "").trim().slice(0, max);

// POST { videoUrl, posterUrl?, lookId?, lookName?, curatorId?, device, email?, source? }
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const videoUrl = clean(body.videoUrl, 2000);
  const device = clean(body.device, 80);
  const email = clean(body.email, 160).toLowerCase();
  if (!videoUrl) return NextResponse.json({ error: "videoUrl fehlt." }, { status: 400 });
  if (!device && !email) return NextResponse.json({ error: "Keine Zuordnung (device/email)." }, { status: 400 });

  // Das Video zu UNS holen — die Anbieter-Adresse verfällt.
  let videoPath = "";
  try {
    const res = await fetch(videoUrl);
    if (!res.ok) return NextResponse.json({ error: `Video konnte nicht geladen werden (${res.status}).` }, { status: 502 });
    const bytes = new Uint8Array(await res.arrayBuffer());
    const up = await createSignedUploadUrl("videos", "mp4");
    const put = await fetch(up.uploadUrl, { method: "PUT", headers: { "Content-Type": "video/mp4", "x-upsert": "true" }, body: bytes });
    if (!put.ok) return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 502 });
    videoPath = up.path;
  } catch {
    return NextResponse.json({ error: "Video konnte nicht gespeichert werden." }, { status: 502 });
  }

  const state = await readTryThisLookState();
  const id = `${Date.now()}-${crypto.randomUUID()}`;
  state.generations.unshift({
    id,
    lookId: clean(body.lookId, 80) || "",
    lookName: clean(body.lookName, 120) || undefined,
    curatorId: clean(body.curatorId, 80) || undefined,
    ownerEmail: email || undefined,
    visitorId: device || undefined,
    videoPath,
    genKind: "video",
    source: clean(body.source, 40) || "chat",
    feed: false,
    public: false,
    createdAt: new Date().toISOString(),
  } as never);
  await saveTryThisLookState(state);
  return NextResponse.json({ ok: true, id });
}

// GET ?device=…&email=…  → die eigenen Videos, neueste zuerst.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const device = clean(url.searchParams.get("device"), 80);
  const email = clean(url.searchParams.get("email"), 160).toLowerCase();
  if (!device && !email) return NextResponse.json({ videos: [] });

  const state = await readTryThisLookState();
  const mine = (state.generations ?? []).filter(g => {
    const gg = g as { ownerEmail?: string; visitorId?: string };
    return (email && gg.ownerEmail === email) || (device && gg.visitorId === device);
  });

  const videos = await Promise.all(mine.slice(0, 60).map(async g => {
    const gg = g as { id: string; videoPath?: string; videoUrl?: string; videoPosterPath?: string; imagePath?: string; lookName?: string; createdAt?: string; source?: string };
    // IMMER frisch signieren — gespeicherte Adressen sind nach 24 h tot.
    const video = gg.videoPath ? await getSignedUrl(gg.videoPath).catch(() => "") : (gg.videoUrl || "");
    const poster = gg.videoPosterPath ? await getSignedUrl(gg.videoPosterPath).catch(() => "") : "";
    return { id: gg.id, videoUrl: video, posterUrl: poster, name: gg.lookName || "", createdAt: gg.createdAt || "", source: gg.source || "" };
  }));

  /**
   * DIE KISS-BILDER GEHÖREN AUCH IN SEINE GALERIE (Owner 30.07.2026: „seine Galerie ist
   * leer, seine Bilder sind nicht da").
   *
   * Sie liegen im Kiss-Log, nicht bei den Try-On-Generierungen — deshalb fand die Galerie
   * nichts. Zugeordnet wird über die E-Mail (sobald er sie eingetragen hat) oder über die
   * Gerätekennung, damit es auch ohne Anmeldung sofort da ist.
   */
  const bilder = await (async () => {
    try {
      const log = await readKissLog();
      const meine = log.filter((e: KissLogEntry) =>
        (email && String(e.email ?? "").toLowerCase() === email) ||
        (device && String(e.device ?? "") === device));
      // BEIDES gehört ihm (Owner 30.07.2026: „nein, das macht man nicht so. Du speicherst
      // das auch für ihn") — sein hochgeladenes Foto UND das Ergebnis. Eigene Kennung je
      // Eintrag, sonst kollidieren die beiden in der Liste.
      const paare = await Promise.all(meine.slice(0, 60).map(async (e: KissLogEntry) => ([
        {
          id: e.id,
          imageUrl: e.imagePath ? await getSignedUrl(e.imagePath).catch(() => "") : "",
          videoUrl: e.videoUrl || "",
          name: e.modelName || "",
          createdAt: e.createdAt || "",
          source: "kiss",
        },
        {
          id: `${e.id}-foto`,
          imageUrl: e.personPath ? await getSignedUrl(e.personPath).catch(() => "") : "",
          videoUrl: "",
          name: "Dein Foto",
          createdAt: e.createdAt || "",
          source: "kiss-upload",
        },
      ])));
      return paare.flat();
    } catch { return []; }
  })();

  return NextResponse.json({
    videos: videos.filter(v => v.videoUrl),
    pictures: bilder.filter(b => b.imageUrl || b.videoUrl),
  }, { headers: { "Cache-Control": "no-store" } });
}
