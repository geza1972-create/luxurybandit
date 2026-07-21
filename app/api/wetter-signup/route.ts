import { NextResponse } from "next/server";
import { readWetterSubscribers, writeWetterSubscribers, type WetterSubscriber } from "@/lib/try-this-look-store";
import { sendEmail } from "@/lib/email-send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BELLA_ID = "curator-1783683672619-td4cy";

// Bestätigungs-Mail pro Sprache (Double-Opt-in).
function confirmEmail(lang: string, name: string, model: string, link: string): { subject: string; html: string } {
  const btn = `<a href="${link}" style="display:inline-block;background:#c9a23f;color:#000;font-weight:800;text-decoration:none;padding:14px 26px;border-radius:12px;font-family:Arial,sans-serif">`;
  if (lang === "de") return {
    subject: `Bestätige deine Anmeldung bei ${model}`,
    html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111">Hallo ${name},<br><br>bitte bestätige deine E-Mail, damit ${model} dich jeden Morgen wecken darf:<br><br>${btn}✅ E-Mail bestätigen</a><br><br>Wenn du das nicht warst, ignoriere diese Mail einfach.</div>`,
  };
  if (lang === "en") return {
    subject: `Confirm your sign-up with ${model}`,
    html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111">Hi ${name},<br><br>please confirm your email so ${model} can wake you every morning:<br><br>${btn}✅ Confirm email</a><br><br>If this wasn't you, just ignore this email.</div>`,
  };
  return {
    subject: `Confirmă-ți înscrierea la ${model}`,
    html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111">Bună ${name},<br><br>confirmă adresa de email ca ${model} să te trezească în fiecare dimineață:<br><br>${btn}✅ Confirmă emailul</a><br><br>Dacă nu ai fost tu, ignoră acest mesaj.</div>`,
  };
}

// ÖFFENTLICHE Selbst-Anmeldung (kein Admin): der Abonnent macht beim ersten Öffnen
// seinen echten „Account". Legt einen Abonnenten-Datensatz an und gibt seine Kennung `id`
// zurück — die merkt sich das Gerät (bleibt eingeloggt) und steckt künftig im Link `?s=`.
// ALLE Felder sind Pflicht (Name, E-Mail, Geburtsdatum, Geschlecht, Stadt, Land, WhatsApp).
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    modelId?: string; name?: string; email?: string; birthdate?: string; gender?: string;
    phone?: string; city?: string; country?: string; lang?: string; accepted?: boolean;
  };
  const modelId = String(body.modelId ?? "").trim() || BELLA_ID;
  const name = String(body.name ?? "").trim().slice(0, 120);
  const email = String(body.email ?? "").trim().slice(0, 160).toLowerCase();
  const birthdate = String(body.birthdate ?? "").trim().slice(0, 10);
  const gender = String(body.gender ?? "").trim().slice(0, 12);
  const phone = String(body.phone ?? "").trim().slice(0, 40);
  const city = String(body.city ?? "").trim().slice(0, 120);
  const country = String(body.country ?? "").trim().slice(0, 80);

  // Alle Felder Pflicht + einfache E-Mail-Prüfung.
  if (!name || !email || !birthdate || !gender || !city || !country || !phone)
    return NextResponse.json({ error: "Bitte alle Felder ausfüllen." }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return NextResponse.json({ error: "Bitte eine gültige E-Mail eingeben." }, { status: 400 });
  // 18+-Sperre (server-seitig, nicht umgehbar) aus dem Geburtsdatum.
  const bm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthdate);
  if (bm) {
    const now = new Date();
    let age = now.getFullYear() - +bm[1];
    if (now.getMonth() + 1 < +bm[2] || (now.getMonth() + 1 === +bm[2] && now.getDate() < +bm[3])) age--;
    if (age < 18) return NextResponse.json({ error: "Du musst mindestens 18 Jahre alt sein." }, { status: 400 });
  }
  // AGB/Datenschutz müssen akzeptiert sein.
  if (body.accepted !== true)
    return NextResponse.json({ error: "Bitte akzeptiere die AGB und den Datenschutz." }, { status: 400 });

  const lang = String(body.lang ?? "ro").trim().slice(0, 5) || "ro";
  const confirmToken = crypto.randomUUID().replace(/-/g, "");
  const sub: WetterSubscriber = {
    id: `sub-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
    name, email, birthdate, gender, phone, city, country, lang,
    note: "self-signup",
    acceptedTerms: true,
    confirmed: false,
    confirmToken,
    createdAt: new Date().toISOString(),
  };
  try {
    const current = await readWetterSubscribers(modelId);
    // Doppelte E-Mail? Dann NICHT neu anlegen — bestehende Bestätigung erneut schicken.
    if (current.some(s => (s.email || "").toLowerCase() === email))
      return NextResponse.json({ ok: true, pending: true, alreadyRegistered: true });
    await writeWetterSubscribers([sub, ...current], modelId);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Anmeldung fehlgeschlagen." }, { status: 502 });
  }

  // Bestätigungs-Mail schicken (Double-Opt-in). Der Link geht auf /api/wetter-confirm,
  // das den Datensatz bestätigt und dann in die persönliche Ansicht (?s=) weiterleitet.
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(request.url).origin;
  const link = `${origin}/api/wetter-confirm?model=${encodeURIComponent(modelId)}&token=${encodeURIComponent(confirmToken)}`;
  const mail = confirmEmail(lang, name, "Bella", link);
  const sent = await sendEmail({ to: email, subject: mail.subject, html: mail.html }).catch(() => ({ ok: false } as const));

  // Account existiert erst nach Bestätigung „richtig" → das Gerät wird NICHT eingeloggt.
  return NextResponse.json({ ok: true, pending: true, emailSent: !!sent?.ok });
}
