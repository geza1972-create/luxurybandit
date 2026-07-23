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

// GET /api/wetter-unsubscribe?model=…&s=…&lang=…  → EIN-KLICK-Abmelden aus einer E-Mail.
// Markiert wie POST und zeigt eine kleine Bestätigungsseite (Pflicht für Marketing-Mails).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const modelId = url.searchParams.get("model")?.trim() || BELLA_ID;
  const id = url.searchParams.get("s")?.trim() || "";
  const lang = (url.searchParams.get("lang") || "ro").slice(0, 5);
  const M: Record<string, string> = {
    ro: "Te-ai dezabonat. Nu vei mai primi mesaje. 💛",
    de: "Du bist abgemeldet. Du bekommst keine Nachrichten mehr. 💛",
    en: "You're unsubscribed. You won't receive any more messages. 💛",
    es: "Te diste de baja. No recibirás más mensajes. 💛",
    fr: "Tu es désabonné. Tu ne recevras plus de messages. 💛",
    pt: "Cancelaste a subscrição. Não receberás mais mensagens. 💛",
    pl: "Wypisano Cię. Nie otrzymasz więcej wiadomości. 💛",
    it: "Sei disiscritto. Non riceverai più messaggi. 💛",
  };
  if (id) {
    try {
      const subs = await readWetterSubscribers(modelId);
      const sub = subs.find(s => s.id === id);
      if (sub && !sub.unsubscribed) { sub.unsubscribed = true; sub.unsubscribedAt = new Date().toISOString(); await writeWetterSubscribers(subs, modelId); }
    } catch { /* best-effort — die Seite zeigt trotzdem Bestätigung */ }
  }
  const msg = M[lang] ?? M.ro;
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe</title></head><body style="margin:0;background:#0d0b0a;color:#fff;font-family:Arial,Helvetica,sans-serif;display:grid;place-items:center;min-height:100vh"><div style="text-align:center;padding:24px;max-width:420px"><div style="font-size:42px">✓</div><p style="font-size:16px;font-weight:700;line-height:1.5;margin-top:8px">${msg}</p></div></body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
