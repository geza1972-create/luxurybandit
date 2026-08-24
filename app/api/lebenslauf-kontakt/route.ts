import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { listeLebenslaeufe, lebenslaufKontaktSetzen } from "@/lib/lebenslauf-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DER KONTAKT-UMSCHALTER FÜRS VERMITTLUNGSMODELL (Owner 24.08.2026: „Kontakt-Umschalter
 * bauen" — die offene Baustelle aus Memory `lebenslauf-portal-stand-21-08`, Punkt 1: „es
 * gibt noch keine Admin-Oberfläche, es je Profil auf true zu setzen").
 *
 * NUR DER BETREIBER (Admin), nie der Bewerber selbst: Die Freigabe folgt einer Zusage der
 * Firma AUSSERHALB des Systems (Anruf/Mail) — der Bewerber weiss nicht, wann das passiert
 * ist, also kann er es auch nicht selbst schalten (anders als das Korrektur-Feld, das dem
 * Besitzer gehört).
 *
 * GET  → Liste aller Profile (id/name/email/bezahlt/kontaktSichtbar/aboAktiv), neueste zuerst.
 * POST { id, sichtbar } → setzt kontaktSichtbar für genau dieses Profil.
 */
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const profile = await listeLebenslaeufe().catch(() => []);
  return NextResponse.json({ profile }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { id?: string; sichtbar?: boolean };
  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "Kennung fehlt." }, { status: 400 });
  const ok = await lebenslaufKontaktSetzen(id, body.sichtbar === true);
  if (!ok) return NextResponse.json({ error: "Profil nicht gefunden oder konnte nicht gespeichert werden." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
