import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { readWetterSubscribers, type WetterSubscriber } from "@/lib/try-this-look-store";
import { sendEmail } from "@/lib/email-send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BELLA_ID = "curator-1783683672619-td4cy";

// Tägliche „Guten Morgen"-E-Mail (Bella-Wetter) — pro Sprache, mit persönlichem Link + Abmelden.
// Bellas Ich-Stimme, Du-Form: dein Wetter + ein neuer Look + „danach im Chat".
// Admin-only. POST { modelId?, modelSlug?, ids?: string[], all?: boolean }.
type Copy = { subject: string; greet: string; body: string; cta: string; bye: string; unsub: string };
function copy(lang: string, name: string): Copy {
  const n = name || "";
  const T: Record<string, Copy> = {
    ro: { subject: "Bună dimineața ☀️ Vremea ta și un look nou", greet: `Bună${n ? ` ${n}` : ""},`, body: "vremea ta de azi e gata — plus un look nou și un gând bun de la mine. 💛 Intră să vezi, apoi vorbim în chat.", cta: "Deschide pagina ta", bye: "Pe curând,", unsub: "Nu mai vrei aceste mesaje? Dezabonează-te" },
    de: { subject: "Guten Morgen ☀️ Dein Wetter & dein neuer Look", greet: `Hallo${n ? ` ${n}` : ""},`, body: "dein Wetter für heute ist da — dazu ein neuer Look und ein lieber Gruß von mir. 💛 Schau rein, danach schreiben wir uns im Chat.", cta: "Deine Seite öffnen", bye: "Bis gleich,", unsub: "Keine Nachrichten mehr? Hier abmelden" },
    en: { subject: "Good morning ☀️ Your weather & a new look", greet: `Hi${n ? ` ${n}` : ""},`, body: "your weather for today is ready — with a fresh look and a little thought from me. 💛 Take a peek, then let's chat.", cta: "Open your page", bye: "Talk soon,", unsub: "Don't want these emails? Unsubscribe" },
    es: { subject: "Buenos días ☀️ Tu clima y un look nuevo", greet: `Hola${n ? ` ${n}` : ""},`, body: "tu clima de hoy está listo — con un look nuevo y un pensamiento bonito de mi parte. 💛 Échale un vistazo y luego charlamos.", cta: "Abre tu página", bye: "Hasta pronto,", unsub: "¿No quieres estos emails? Darse de baja" },
    fr: { subject: "Bonjour ☀️ Ta météo et un nouveau look", greet: `Bonjour${n ? ` ${n}` : ""},`, body: "ta météo du jour est prête — avec un nouveau look et une pensée pour toi. 💛 Jette un œil, puis on discute.", cta: "Ouvre ta page", bye: "À bientôt,", unsub: "Tu ne veux plus ces e-mails ? Se désabonner" },
    pt: { subject: "Bom dia ☀️ O teu tempo e um novo visual", greet: `Olá${n ? ` ${n}` : ""},`, body: "o teu tempo de hoje está pronto — com um novo visual e um pensamento carinhoso da minha parte. 💛 Vê e depois falamos.", cta: "Abre a tua página", bye: "Até já,", unsub: "Não queres estes emails? Cancelar subscrição" },
    pl: { subject: "Dzień dobry ☀️ Twoja pogoda i nowy look", greet: `Cześć${n ? ` ${n}` : ""},`, body: "Twoja pogoda na dziś jest gotowa — do tego nowy look i miła myśl ode mnie. 💛 Zajrzyj, a potem pogadamy.", cta: "Otwórz swoją stronę", bye: "Do zobaczenia,", unsub: "Nie chcesz tych e-maili? Wypisz się" },
    it: { subject: "Buongiorno ☀️ Il tuo meteo e un nuovo look", greet: `Ciao${n ? ` ${n}` : ""},`, body: "il tuo meteo di oggi è pronto — con un nuovo look e un pensiero gentile da parte mia. 💛 Dai un'occhiata, poi ci sentiamo.", cta: "Apri la tua pagina", bye: "A presto,", unsub: "Non vuoi più queste email? Disiscriviti" },
  };
  return T[lang] ?? T.en;
}

function buildHtml(c: Copy, link: string, unsub: string): string {
  const btn = "background:#c9a23f;color:#000;font-weight:800;text-decoration:none;padding:13px 24px;border-radius:12px;display:inline-block";
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#111;line-height:1.6;max-width:520px">`
    + `<p>${c.greet}</p>`
    + `<p>${c.body}</p>`
    + `<p style="margin:22px 0"><a href="${link}" style="${btn}">${c.cta} →</a></p>`
    + `<p>${c.bye}<br>Bella · LuxuryBandit</p>`
    + `<hr style="border:none;border-top:1px solid #eee;margin:24px 0">`
    + `<p style="font-size:12px;color:#999">${c.unsub}: <a href="${unsub}" style="color:#999;text-decoration:underline">Unsubscribe</a></p>`
    + `</div>`;
}

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

  const results: { id: string; email: string; ok: boolean; error?: string }[] = [];
  for (const s of targets) {
    const lang = (s.lang || "en").slice(0, 5);   // Standard = EN, wenn keine Sprache bekannt
    const c = copy(lang, s.name || "");
    const link = `${origin}/themes/wetter/${encodeURIComponent(modelSlug)}?s=${encodeURIComponent(s.id)}`;
    const unsub = `${origin}/api/wetter-unsubscribe?model=${encodeURIComponent(modelId)}&s=${encodeURIComponent(s.id)}&lang=${encodeURIComponent(lang)}`;
    const r = await sendEmail({ to: s.email as string, subject: c.subject, html: buildHtml(c, link, unsub) }).catch(() => ({ ok: false, error: "send failed" as string }));
    results.push({ id: s.id, email: s.email as string, ok: !!(r as { ok?: boolean }).ok, error: (r as { error?: string }).error });
  }
  return NextResponse.json({ sent: results.filter(r => r.ok).length, total: targets.length, results });
}
