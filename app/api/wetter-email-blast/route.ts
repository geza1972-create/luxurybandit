import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { readWetterSubscribers, readCardStudioSlides, getSignedUrl, isPublicBellaPost, sortBellaPosts, type WetterSubscriber } from "@/lib/try-this-look-store";
import { sendEmail } from "@/lib/email-send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BELLA_ID = "curator-1783683672619-td4cy";

// Tägliche „Guten Morgen"-E-Mail (Bella-Wetter) — pro Sprache, mit persönlichem Link + Abmelden.
// Bellas Ich-Stimme, Du-Form: dein Wetter + ein neuer Look + „danach im Chat".
// Admin-only. POST { modelId?, modelSlug?, ids?: string[], all?: boolean }.
import { copy, buildHtml } from "@/lib/wetter-email-template";


export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { modelId?: string; modelSlug?: string; ids?: string[]; all?: boolean };
  const modelId = String(body.modelId ?? "").trim() || BELLA_ID;
  const modelSlug = String(body.modelSlug ?? "").trim() || "bella";
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://luxurybandit.com";

  const subs = await readWetterSubscribers(modelId);
  const wanted = new Set((body.ids ?? []).map(String));
  // Ziel: E-Mail vorhanden + nicht abgemeldet + (alle ODER in der id-Liste).
  const targets = subs.filter((s: WetterSubscriber) => !!s.email && s.unsubscribed !== true && (body.all ? true : wanted.has(s.id)));
  if (targets.length === 0) return NextResponse.json({ sent: 0, total: 0, results: [], note: "Keine passenden Empfänger (E-Mail + nicht abgemeldet)." });

  // Poster des aktuellen Beitrags als Hero-Bild. WICHTIG: E-Mails werden auch Wochen
  // später geöffnet → LANG signieren (Standard sind 24 h, danach wäre das Bild tot).
  let hero = "";
  let modelName = "Bella";
  try {
    const slides = (await readCardStudioSlides(modelId)).filter(isPublicBellaPost).sort(sortBellaPosts);
    // Video → Poster, Bild → das Bild selbst. Erster Beitrag, der eins von beidem hat.
    const usable = slides.find(s => (s.kind === "video" ? s.posterPath : s.path));
    const path = usable ? (usable.kind === "video" ? usable.posterPath : usable.path) : "";
    if (path) hero = (await getSignedUrl(path, 60 * 60 * 24 * 365).catch(() => "")) || "";
  } catch { /* ohne Bild ist die Mail trotzdem gültig */ }
  try {
    const st = await import("@/lib/try-this-look-store").then(m => m.readTryThisLookState());
    const cur = (st.curators ?? []).find(x => x.id === modelId) as { modelName?: string; firstName?: string } | undefined;
    modelName = String(cur?.modelName || cur?.firstName || "Bella").split(" ")[0];
  } catch { /* Default bleibt */ }

  const results: { id: string; email: string; ok: boolean; error?: string }[] = [];
  for (const s of targets) {
    const lang = (s.lang || "en").slice(0, 5);   // Standard = EN, wenn keine Sprache bekannt
    const c = copy(lang, s.name || "");
    const link = `${origin}/themes/wetter/${encodeURIComponent(modelSlug)}?s=${encodeURIComponent(s.id)}&src=email`;
    const unsub = `${origin}/api/wetter-unsubscribe?model=${encodeURIComponent(modelId)}&s=${encodeURIComponent(s.id)}&lang=${encodeURIComponent(lang)}`;
    const r = await sendEmail({ to: s.email as string, subject: c.subject, html: buildHtml(c, link, unsub, hero, s.city || "", modelName) }).catch(() => ({ ok: false, error: "send failed" as string }));
    results.push({ id: s.id, email: s.email as string, ok: !!(r as { ok?: boolean }).ok, error: (r as { error?: string }).error });
  }
  return NextResponse.json({ sent: results.filter(r => r.ok).length, total: targets.length, results });
}
