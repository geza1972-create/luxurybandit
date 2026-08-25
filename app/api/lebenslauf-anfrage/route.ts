import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { leseLebenslauf, schreibeLebenslauf } from "@/lib/lebenslauf-store";
import { darfAmProfilArbeiten } from "@/lib/lebenslauf-besitz";

export const runtime = "nodejs";

/**
 * DIE GESPRÄCHSANFRAGEN AN DER BEWERBUNG (Owner 25.08.2026: „wenn es jemand ausführt mit
 * E-Mail, dann: 1 Person will dich kontaktieren — E-Mail anzeigen. Auch löschen dann").
 *
 * Der Firmen-Chat (ProfilChatEinstieg) schickt eine ABGESCHLOSSENE Anfrage weiterhin als
 * Mail an den Betreiber (/api/contact, Concierge-Weg) — und legt sie ZUSÄTZLICH hier ab,
 * damit der BESITZER sie auf seiner Seite sieht (Name + E-Mail) und einzeln löschen kann.
 *
 * POST { id, name, mail, nachricht? } — offen wie der Chat selbst (dieselben Felder, die
 *   auch die Mail trägt). Deckel: die letzten 50; still bei fehlendem/unbezahltem Profil
 *   (kein Orakel für Fremde, wie /api/lebenslauf-view).
 * DELETE { id, anfrageId, device? } — nur der Besitzer (darfAmProfilArbeiten).
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const id = String(body.id ?? "").trim();
  const name = String(body.name ?? "").trim().slice(0, 120);
  const mail = String(body.mail ?? "").trim().toLowerCase().slice(0, 200);
  const nachricht = String(body.nachricht ?? "").trim().slice(0, 4000);
  if (!id || name.length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const profil = await leseLebenslauf(id);
  if (!profil || !profil.bezahlt) return NextResponse.json({ ok: true });

  const eintrag = { id: randomUUID(), name, mail, ...(nachricht ? { nachricht } : {}), datum: new Date().toISOString() };
  profil.anfragen = [...(profil.anfragen ?? []), eintrag].slice(-50);
  await schreibeLebenslauf(profil).catch(() => { /* die Mail ist raus — eine verlorene Ablage ist kein Fehlerfall */ });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const id = String(body.id ?? "").trim();
  const anfrageId = String(body.anfrageId ?? "").trim();
  const device = String(body.device ?? "").trim().slice(0, 80);
  if (!id || !anfrageId) return NextResponse.json({ error: "Kennung fehlt." }, { status: 400 });

  const profil = await leseLebenslauf(id);
  if (!profil) return NextResponse.json({ error: "Profil nicht gefunden." }, { status: 404 });
  if (!(await darfAmProfilArbeiten(profil, device, request))) {
    return NextResponse.json({ error: "Not yours." }, { status: 403 });
  }

  profil.anfragen = (profil.anfragen ?? []).filter(a => a.id !== anfrageId);
  const ok = await schreibeLebenslauf(profil);
  if (!ok) return NextResponse.json({ error: "Konnte nicht gespeichert werden." }, { status: 500 });
  return NextResponse.json({ ok: true, anfragen: profil.anfragen });
}
