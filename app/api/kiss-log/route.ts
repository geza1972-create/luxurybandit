import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { readKissLog, writeKissLog, getSignedUrl, deleteTryThisLookImage, type KissLogEntry } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Kiss-Log: der Funnel meldet jede FERTIGE Generierung (POST, öffentlich — der Funnel läuft
// auch anonym); das Admin-Tool auf /themes/kiss listet sie (GET, admin-only).
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const entries = await readKissLog();
  // Signierte Adressen dazu, damit das Werkzeug die Bilder direkt anzeigen kann.
  const mitBildern = await Promise.all(entries.map(async e => ({
    ...e,
    imageUrl: e.imagePath ? await getSignedUrl(e.imagePath).catch(() => "") : "",
    personUrl: e.personPath ? await getSignedUrl(e.personPath).catch(() => "") : "",
  })));
  return NextResponse.json({ entries: mitBildern });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { modelId?: string; modelName?: string; videoUrl?: string; remove?: string; update?: string; email?: string; device?: string; imagePath?: string; personPath?: string };

  // Admin: einen Eintrag löschen.
  if (body.remove) {
    if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    const alle = await readKissLog();
    const weg = alle.find(e => e.id === body.remove);
    const entries = alle.filter(e => e.id !== body.remove);
    await writeKissLog(entries);
    // MIT den Dateien löschen (Owner 30.07.2026: „ich lösche die auch"). Bliebe nur die
    // Zeile weg, lägen die Fotos weiter im Speicher — er hätte gelöscht und es wäre nichts
    // gelöscht.
    for (const pfad of [weg?.imagePath, weg?.personPath]) {
      if (pfad) await deleteTryThisLookImage(pfad).catch(() => {});
    }
    return NextResponse.json({ ok: true, entries });
  }

  // Update: nach der Zahlung liefert der Funnel die ECHTE Video-URL nach (Fake-Flow:
  // Eintrag entsteht beim Teaser ohne URL, das echte Video rendert erst nach dem Kauf).
  if (body.update) {
    const videoUrl = String(body.videoUrl ?? "").trim();
    if (!videoUrl) return NextResponse.json({ error: "videoUrl required." }, { status: 400 });
    const entries = await readKissLog();
    const e = entries.find(x => x.id === body.update);
    if (e) { e.videoUrl = videoUrl; await writeKissLog(entries); }
    return NextResponse.json({ ok: true });
  }

  // Neu: eine Generierung (beim Fake-Teaser noch OHNE videoUrl).
  const entry: KissLogEntry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    modelId: String(body.modelId ?? "").trim() || undefined,
    modelName: String(body.modelName ?? "").trim().slice(0, 60) || undefined,
    videoUrl: String(body.videoUrl ?? "").trim() || undefined,
    paid: false,
    imagePath: String(body.imagePath ?? "").trim().startsWith("try-this-look/") ? String(body.imagePath).trim() : undefined,
    personPath: String(body.personPath ?? "").trim().startsWith("try-this-look/") ? String(body.personPath).trim() : undefined,
    email: String(body.email ?? "").trim().toLowerCase().slice(0, 160) || undefined,
    device: String(body.device ?? "").trim().slice(0, 80) || undefined,
  };
  const entries = [entry, ...(await readKissLog())];
  await writeKissLog(entries);
  return NextResponse.json({ ok: true, id: entry.id });
}
