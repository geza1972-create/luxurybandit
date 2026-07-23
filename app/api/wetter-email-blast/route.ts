import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { readWetterSubscribers, type WetterSubscriber } from "@/lib/try-this-look-store";
import { sendEmail } from "@/lib/email-send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BELLA_ID = "curator-1783683672619-td4cy";

// „Bald geht's los"-E-Mail (Bella-Wetter) — pro Sprache, mit persönlichem Link + Abmelden.
// Admin-only. POST { modelId?, modelSlug?, ids?: string[], all?: boolean }.
type Copy = { subject: string; greet: string; body: string; cta: string; bye: string; unsub: string };
function copy(lang: string, name: string): Copy {
  const n = name || "";
  const T: Record<string, Copy> = {
    ro: { subject: "Bella te așteaptă — începem în curând ☀️", greet: `Bună ${n},`, body: "mulțumim că te-ai înscris! 💛 Mai punem la punct ultimele detalii — foarte curând Bella te va trezi în fiecare dimineață cu vremea ta, un look nou și un gând bun de la ea.", cta: "Deschide pagina ta", bye: "Pe curând,", unsub: "Nu mai vrei aceste mesaje? Dezabonează-te" },
    de: { subject: "Bella wartet auf dich — es geht bald los ☀️", greet: `Hallo ${n},`, body: "danke fürs Anmelden! 💛 Wir legen gerade letzte Hand an — ganz bald weckt dich Bella jeden Morgen mit deinem Wetter, einem neuen Look und einem lieben Gruß.", cta: "Deine Seite öffnen", bye: "Bis bald,", unsub: "Keine Nachrichten mehr? Hier abmelden" },
    en: { subject: "Bella is waiting for you — launching soon ☀️", greet: `Hi ${n},`, body: "thanks for signing up! 💛 We're putting the finishing touches on things — very soon Bella will wake you every morning with your weather, a new look and a warm thought.", cta: "Open your page", bye: "Talk soon,", unsub: "Don't want these emails? Unsubscribe" },
    es: { subject: "Bella te espera — empezamos muy pronto ☀️", greet: `Hola ${n},`, body: "¡gracias por registrarte! 💛 Estamos dando los últimos toques — muy pronto Bella te despertará cada mañana con tu clima, un look nuevo y un pensamiento bonito.", cta: "Abre tu página", bye: "Hasta pronto,", unsub: "¿No quieres estos emails? Darse de baja" },
    fr: { subject: "Bella t'attend — ça commence très bientôt ☀️", greet: `Bonjour ${n},`, body: "merci de t'être inscrit ! 💛 Nous peaufinons les derniers détails — très bientôt Bella te réveillera chaque matin avec ta météo, un nouveau look et une pensée pour toi.", cta: "Ouvre ta page", bye: "À bientôt,", unsub: "Tu ne veux plus ces e-mails ? Se désabonner" },
    pt: { subject: "A Bella está à tua espera — começamos muito em breve ☀️", greet: `Olá ${n},`, body: "obrigado por te inscreveres! 💛 Estamos a dar os toques finais — muito em breve a Bella vai acordar-te todas as manhãs com o teu tempo, um novo visual e um pensamento carinhoso.", cta: "Abre a tua página", bye: "Até já,", unsub: "Não queres estes emails? Cancelar subscrição" },
    pl: { subject: "Bella na Ciebie czeka — startujemy już wkrótce ☀️", greet: `Cześć ${n},`, body: "dziękujemy za zapis! 💛 Dopracowujemy ostatnie szczegóły — już wkrótce Bella będzie budzić Cię każdego ranka Twoją pogodą, nowym lookiem i miłą myślą.", cta: "Otwórz swoją stronę", bye: "Do zobaczenia,", unsub: "Nie chcesz tych e-maili? Wypisz się" },
    it: { subject: "Bella ti aspetta — si parte molto presto ☀️", greet: `Ciao ${n},`, body: "grazie per esserti iscritto! 💛 Stiamo mettendo gli ultimi ritocchi — molto presto Bella ti sveglierà ogni mattina con il tuo meteo, un nuovo look e un pensiero gentile.", cta: "Apri la tua pagina", bye: "A presto,", unsub: "Non vuoi più queste email? Disiscriviti" },
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
    const lang = (s.lang || "ro").slice(0, 5);
    const c = copy(lang, s.name || "");
    const link = `${origin}/themes/wetter/${encodeURIComponent(modelSlug)}?s=${encodeURIComponent(s.id)}`;
    const unsub = `${origin}/api/wetter-unsubscribe?model=${encodeURIComponent(modelId)}&s=${encodeURIComponent(s.id)}&lang=${encodeURIComponent(lang)}`;
    const r = await sendEmail({ to: s.email as string, subject: c.subject, html: buildHtml(c, link, unsub) }).catch(() => ({ ok: false, error: "send failed" as string }));
    results.push({ id: s.id, email: s.email as string, ok: !!(r as { ok?: boolean }).ok, error: (r as { error?: string }).error });
  }
  return NextResponse.json({ sent: results.filter(r => r.ok).length, total: targets.length, results });
}
