import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { readKissLog, writeKissLog, type KissLogEntry } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Kiss-Log: der Funnel meldet jede FERTIGE Generierung (POST, öffentlich — der Funnel läuft
// auch anonym); das Admin-Tool auf /themes/kiss listet sie (GET, admin-only).
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const entries = await readKissLog();
  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { modelId?: string; modelName?: string; videoUrl?: string; remove?: string; update?: string; email?: string; device?: string };

  // Admin: einen Eintrag löschen.
  if (body.remove) {
    if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    const entries = (await readKissLog()).filter(e => e.id !== body.remove);
    await writeKissLog(entries);
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
    email: String(body.email ?? "").trim().toLowerCase().slice(0, 160) || undefined,
    device: String(body.device ?? "").trim().slice(0, 80) || undefined,
  };
  const entries = [entry, ...(await readKissLog())];
  await writeKissLog(entries);
  return NextResponse.json({ ok: true, id: entry.id });
}
