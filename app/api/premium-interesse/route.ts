import { NextResponse } from "next/server";
import { readKissLog } from "@/lib/try-this-look-store";
import { isAdminRequest } from "@/lib/admin-auth";
import { leseKandidat, schreibeKandidat, type KandidatProfil } from "@/lib/kandidaten-store";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * „ICH MELDE MICH INNERHALB VON 48 STUNDEN" (Owner-Auftrag 26.08.2026: Premium-Paket,
 * 100 €, persönliche Beratung + Profibewerbung als PDF + Video — „er kann da Interesse
 * abhaken und ich kontaktiere ihn").
 *
 * KEIN KAUF, EIN RÜCKRUF: Bei 100 € — dem Zehnfachen der übrigen Preise im Haus — zahlt
 * niemand am Handy aus einem kalten Trichter. Deshalb speichert diese Route nur das
 * Interesse und die TELEFONNUMMER; bezahlt wird im Gespräch.
 *
 * OHNE NUMMER KEIN HAKEN: Ein Rückruf-Versprechen ohne Rückrufmöglichkeit wäre genau die
 * Sorte leeres Versprechen, die wir heute überall herausgenommen haben.
 *
 * POST  { id, device, telefon? }        → Interesse setzen, `premiumAm` = jetzt
 * PATCH { kandidatId, kontaktiert }     → NUR Admin: die 48-Stunden-Zusage schliessen
 */

const s = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const id = s(body.id, 60);
  const device = s(body.device, 80);
  if (!id) return NextResponse.json({ error: "Kennung fehlt." }, { status: 400 });

  /* Besitz über den kiss-log-Auftrag — derselbe Weg wie /api/bewerbung-pruefen, weil in
     diesem Trichter noch kein Lebenslauf-Profil existieren muss. */
  const eintraege = await readKissLog().catch(() => []);
  const auftrag = eintraege.find(e => e.id === id);
  if (!auftrag) return NextResponse.json({ error: "Auftrag nicht gefunden." }, { status: 404 });
  if (auftrag.device && device && auftrag.device !== device) {
    return NextResponse.json({ error: "Not yours." }, { status: 403 });
  }

  const bestand = await leseKandidat(id);
  /* Die Nummer aus der Bewerbung reicht — nur wenn dort keine stand, muss er eine angeben. */
  const telefon = s(body.telefon, 40) || bestand?.telefon || bestand?.kerndaten?.telefon || "";
  if (!telefon) {
    return NextResponse.json({ error: "Ohne Telefonnummer können wir dich nicht anrufen.", brauchtTelefon: true }, { status: 400 });
  }

  const jetzt = new Date().toISOString();
  const naechster: KandidatProfil = {
    ...(bestand ?? { kandidatId: id, hauptprofilId: id, einwilligung: { status: "offen" as const }, erstelltAm: jetzt }),
    kandidatId: id,
    hauptprofilId: bestand?.hauptprofilId ?? id,
    telefon,
    premiumInteresse: true,
    /* Die Frist läuft ab dem ERSTEN Haken — ein zweiter Klick verlängert sie nicht. */
    premiumAm: bestand?.premiumAm ?? jetzt,
    aktualisiertAm: jetzt,
  };
  if (!(await schreibeKandidat(naechster))) {
    return NextResponse.json({ error: "Konnte nicht gespeichert werden." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** Die Zusage schliessen — NUR Admin, aus `/admin/kandidaten`. */
export async function PATCH(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const kandidatId = s(body.kandidatId, 100);
  if (!kandidatId) return NextResponse.json({ error: "Kennung fehlt." }, { status: 400 });

  const bestand = await leseKandidat(kandidatId);
  if (!bestand) return NextResponse.json({ error: "Kandidat nicht gefunden." }, { status: 404 });

  const naechster: KandidatProfil = {
    ...bestand,
    premiumKontaktiertAm: body.kontaktiert === true ? new Date().toISOString() : undefined,
    aktualisiertAm: new Date().toISOString(),
  };
  if (!(await schreibeKandidat(naechster))) {
    return NextResponse.json({ error: "Konnte nicht gespeichert werden." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
