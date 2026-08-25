import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { listeLebenslaeufe, lebenslaufKontaktSetzen, leseLebenslauf } from "@/lib/lebenslauf-store";
import { darfAmProfilArbeiten } from "@/lib/lebenslauf-besitz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DER KONTAKT-UMSCHALTER (Owner 24.08.2026: „Kontakt-Umschalter bauen").
 *
 * GEDREHT 25.08.2026 (Owner: „Die Kontaktdaten werden im Chat abgefragt. Falls der User
 * sie im Bearbeiten-Modus für alle freigibt."): Die Freigabe liegt jetzt beim BEWERBER
 * selbst — der Schalter steht in seinem Bearbeiten-Modus, und der Firmen-Chat nennt die
 * Daten nur nach dieser Freigabe. Der Admin darf weiterhin schalten (Vermittlungsfälle),
 * die Profil-LISTE bleibt Admin-only.
 *
 * GET  → Liste aller Profile (id/name/email/bezahlt/kontaktSichtbar/aboAktiv) — nur Admin.
 * POST { id, sichtbar, device? } → setzt kontaktSichtbar; Besitzer ODER Admin.
 */
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const profile = await listeLebenslaeufe().catch(() => []);
  return NextResponse.json({ profile }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { id?: string; sichtbar?: boolean; device?: string };
  const id = String(body.id ?? "").trim();
  const device = String(body.device ?? "").trim().slice(0, 80);
  if (!id) return NextResponse.json({ error: "Kennung fehlt." }, { status: 400 });
  const profil = await leseLebenslauf(id);
  if (!profil) return NextResponse.json({ error: "Profil nicht gefunden." }, { status: 404 });
  if (!(await darfAmProfilArbeiten(profil, device, request))) {
    return NextResponse.json({ error: "Not yours." }, { status: 403 });
  }
  const ok = await lebenslaufKontaktSetzen(id, body.sichtbar === true);
  if (!ok) return NextResponse.json({ error: "Konnte nicht gespeichert werden." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
