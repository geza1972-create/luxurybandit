import { NextResponse } from "next/server";
import { enrollWetter } from "@/lib/wetter-enroll";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Kontakt aus dem eigenen Anmeldeformular sichern — BEVOR der Kunde ins Stripe-Fenster geht.
 * Springt er dort ab, ist er trotzdem erreichbar; zahlt er, bekommt er ohnehin die Tagespost.
 * Models werden nicht eingetragen (prüft enrollWetter), Abgemeldete nicht reaktiviert.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    name?: string; email?: string; code?: string; topic?: string;
  };
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  try {
    const r = await enrollWetter({
      email,
      name: String(body.name ?? "").trim(),
      note: `join:${String(body.topic ?? "chat").trim()}${body.code ? `:${String(body.code).trim().toUpperCase()}` : ""}`,
    });
    return NextResponse.json({ ok: true, result: r });
  } catch {
    return NextResponse.json({ ok: true });   // niemals den Kauf blockieren
  }
}
