import { NextResponse } from "next/server";
import { readWetterSubscribers, writeWetterSubscribers } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BELLA_ID = "curator-1783683672619-td4cy";

// ÖFFENTLICH: der Abonnent meldet sich selbst von der täglichen Nachricht ab.
// Setzt `unsubscribed` (kein Löschen → der Admin sieht es und sendet nicht weiter).
// POST { modelId, s }  (s = die Abonnenten-Kennung aus dem Link)
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { modelId?: string; s?: string };
  const modelId = String(body.modelId ?? "").trim() || BELLA_ID;
  const id = String(body.s ?? "").trim();
  if (!id) return NextResponse.json({ error: "Kennung fehlt." }, { status: 400 });
  try {
    const subs = await readWetterSubscribers(modelId);
    const sub = subs.find(s => s.id === id);
    if (!sub) return NextResponse.json({ ok: true });   // idempotent (nichts zu tun)
    if (!sub.unsubscribed) {
      sub.unsubscribed = true;
      sub.unsubscribedAt = new Date().toISOString();
      await writeWetterSubscribers(subs, modelId);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Abmelden fehlgeschlagen." }, { status: 502 });
  }
}
