import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { readWetterSubscribers, type WetterSubscriber } from "@/lib/try-this-look-store";
import { sendSms, smsConfigured } from "@/lib/sms-send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BELLA_ID = "curator-1783683672619-td4cy";

/**
 * SMS an die Abonnenten — derselbe persönliche Link wie in der Tagespost, damit die
 * Klicks in derselben Statistik landen (`?s=<id>&src=sms`).
 *
 * KURZ HALTEN: eine SMS sind 160 Zeichen; darüber zahlt man je 160 erneut. Der Text ist
 * deshalb ein Satz + Link + Abmelde-Hinweis. Der Abmelde-Hinweis ist Pflicht bei Werbung.
 */

const TEXT: Record<string, (name: string, link: string, stop: string) => string> = {
  en: (n, l, u) => `Good morning${n ? ` ${n}` : ""}! Your weather + a new look from Bella: ${l} — 24.50 € a month instead of 49 €, forever. Stop: ${u}`,
  de: (n, l, u) => `Guten Morgen${n ? ` ${n}` : ""}! Dein Wetter + ein neuer Look von Bella: ${l} — dauerhaft 24,50 € statt 49 €. Abmelden: ${u}`,
  ro: (n, l, u) => `Bună dimineața${n ? ` ${n}` : ""}! Vremea ta + un look nou de la Bella: ${l} — permanent 24,50 € în loc de 49 €. Dezabonare: ${u}`,
  es: (n, l, u) => `¡Buenos días${n ? ` ${n}` : ""}! Tu clima + un look nuevo de Bella: ${l} — siempre 24,50 € en vez de 49 €. Baja: ${u}`,
  fr: (n, l, u) => `Bonjour${n ? ` ${n}` : ""} ! Ta météo + un nouveau look de Bella : ${l} — toujours 24,50 € au lieu de 49 €. Stop : ${u}`,
  pt: (n, l, u) => `Bom dia${n ? ` ${n}` : ""}! O teu tempo + um novo visual da Bella: ${l} — sempre 24,50 € em vez de 49 €. Cancelar: ${u}`,
  pl: (n, l, u) => `Dzień dobry${n ? ` ${n}` : ""}! Twoja pogoda + nowy look od Belli: ${l} — zawsze 24,50 € zamiast 49 €. Wypisz się: ${u}`,
  it: (n, l, u) => `Buongiorno${n ? ` ${n}` : ""}! Il tuo meteo + un look nuovo di Bella: ${l} — sempre 24,50 € invece di 49 €. Disiscriviti: ${u}`,
};

// POST { modelId?, modelSlug?, ids?: string[], all?: boolean }
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  if (!smsConfigured()) return NextResponse.json({ error: "Twilio fehlt: TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM in Vercel setzen." }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as { modelId?: string; modelSlug?: string; ids?: string[]; all?: boolean };
  const modelId = String(body.modelId ?? "").trim() || BELLA_ID;
  const modelSlug = String(body.modelSlug ?? "").trim() || "bella";
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://luxurybandit.com";

  const subs = await readWetterSubscribers(modelId);
  const wanted = new Set((body.ids ?? []).map(String));
  // Nur mit Telefonnummer, nicht abgemeldet.
  const targets = subs.filter((s: WetterSubscriber) => !!s.phone && s.unsubscribed !== true && (body.all ? true : wanted.has(s.id)));
  if (!targets.length) return NextResponse.json({ sent: 0, total: 0, results: [], note: "Keine Empfänger mit Telefonnummer." });

  const results: { id: string; phone: string; ok: boolean; error?: string }[] = [];
  for (const s of targets) {
    const lang = (s.lang || "en").slice(0, 2);
    const link = `${origin}/themes/wetter/${encodeURIComponent(modelSlug)}?s=${encodeURIComponent(s.id)}&src=sms`;
    const stop = `${origin}/off/${encodeURIComponent(s.id)}?lang=${lang}`;
    const text = (TEXT[lang] ?? TEXT.en)(String(s.name || "").split(" ")[0], link, stop);
    const r = await sendSms({ to: String(s.phone), body: text });
    results.push({ id: s.id, phone: String(s.phone), ok: r.ok, error: r.error });
  }
  return NextResponse.json({ sent: results.filter(r => r.ok).length, total: targets.length, results });
}
