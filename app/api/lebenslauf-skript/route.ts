import { NextResponse } from "next/server";
import { leseLebenslauf, schreibeLebenslauf } from "@/lib/lebenslauf-store";

export const runtime = "nodejs";

/**
 * DAS SKRIPT DES BEWERBERS SPEICHERN (Owner-Seitentext 24.08.2026, Schritt 2: „Kein
 * Textbaustein — ein Sprechtext aus deinem eigenen Werdegang. Du änderst ihn, bis er nach
 * dir klingt.").
 *
 * Der Trichter zeigt nach der Auswertung das Skript in einem Feld; wer es umschreibt,
 * speichert es hierüber, BEVOR er sich aufnimmt. Es ist zugleich der Profiltext der
 * fertigen Seite (`sprechtext` → executiveAusProfil).
 *
 * BESITZ wie bei /api/lebenslauf-fertigstellen: Die Kennung ist eine zufällige UUID, die
 * nur der Käufer aus seinem eigenen Trichter kennt — dieselbe Vertrauensbasis wie die
 * ganze Kette (siehe dort).
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const id = String(body.id ?? "").trim();
  const sprechtext = String(body.sprechtext ?? "").replace(/\s+\n/g, "\n").trim().slice(0, 1200);
  if (!id || !sprechtext) {
    return NextResponse.json({ error: "Kennung oder Skript fehlt." }, { status: 400 });
  }
  const profil = await leseLebenslauf(id);
  if (!profil) return NextResponse.json({ error: "Profil nicht gefunden." }, { status: 404 });
  if (profil.sprechtext === sprechtext) return NextResponse.json({ ok: true });
  const ok = await schreibeLebenslauf({ ...profil, sprechtext });
  if (!ok) return NextResponse.json({ error: "Skript konnte nicht gespeichert werden." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
