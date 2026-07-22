import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { readWetterSubscribers, type WetterSubscriber } from "@/lib/try-this-look-store";
import { sendWhatsAppTemplate, whatsappCloudConfigured } from "@/lib/whatsapp-cloud";

// Verschickt die tägliche Wetter-Nachricht per WhatsApp-Bot (Meta Cloud API) an EINEN
// Abonnenten ({ s }) oder an ALLE ({ all: true }). Admin-only. Die Vorlage bekommt zwei
// Variablen: {{1}} = Name, {{2}} = persönlicher Link (?s=<id> = automatischer Login).
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  if (!whatsappCloudConfigured()) return NextResponse.json({ error: "WhatsApp-Bot nicht eingerichtet — Env-Variablen fehlen (WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_TEMPLATE)." }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as { modelId?: string; modelSlug?: string; s?: string; all?: boolean };
  const modelId = String(body.modelId ?? "").trim();
  const modelSlug = String(body.modelSlug ?? "").trim() || "bella";
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(request.url).origin;
  const link = (s: WetterSubscriber) => `${origin}/themes/wetter/${encodeURIComponent(modelSlug)}?s=${encodeURIComponent(s.id)}`;

  // Empfänger: hat Nummer, E-Mail bestätigt, nicht abgemeldet.
  const eligible = (s: WetterSubscriber) => !!s.phone && s.confirmed === true && s.unsubscribed !== true;
  const subs = await readWetterSubscribers(modelId);
  const targets = body.all
    ? subs.filter(eligible)
    : subs.filter(s => s.id === String(body.s ?? "") && eligible(s));

  if (targets.length === 0) return NextResponse.json({ sent: 0, total: 0, results: [], note: "Keine passenden Empfänger (Nummer + bestätigt + nicht abgemeldet)." });

  const results: { id: string; name: string; ok: boolean; error?: string }[] = [];
  for (const s of targets) {
    const r = await sendWhatsAppTemplate({ to: s.phone as string, lang: s.lang || "ro", bodyParams: [s.name || "", link(s)] });
    results.push({ id: s.id, name: s.name || "", ok: r.ok, error: r.error });
  }
  return NextResponse.json({ sent: results.filter(r => r.ok).length, total: targets.length, results });
}
