import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email-send";

export const runtime = "nodejs";

/**
 * INTERESSE AM PORTFOLIO (Owner-Auftrag 27.08.2026: „ich brauche noch den Chat für
 * Interesse an Geza? Wer bist du, Name Email. Danke. Dann bekomme ich eine E-Mail
 * zugeschickt.") — die öffentliche Portfolio-Seite (`/cv/geza-lakatos`) hat keinen Login
 * und keinen Kandidaten-Pool; das hier ist NUR ein Postfach-Weiterleiter, kein Speicher.
 * POST { name, email } → sendet eine Mail an den Owner, { ok: true }.
 */

const s = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const name = s(body.name, 120);
  const email = s(body.email, 200);
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Name und gültige E-Mail nötig." }, { status: 400 });
  }

  const html = `
    <p>Neues Interesse über das UX-Dossier (luxurybandit.com/cv/geza-lakatos):</p>
    <p><b>Name:</b> ${name}<br><b>E-Mail:</b> ${email}</p>
  `;
  const result = await sendEmail({
    to: "geza.lakatos.ux@gmail.com",
    subject: `Interesse am Dossier: ${name}`,
    html,
    replyTo: email,
  });
  if (!result.ok) return NextResponse.json({ error: "Konnte nicht gesendet werden." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
