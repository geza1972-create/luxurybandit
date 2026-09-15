import { NextResponse } from "next/server";
import { str } from "@/lib/agent-modell";
import { mandantLesen, mandantSpeichern } from "@/lib/versusforge-mandanten";
import { ereignisMerken } from "@/lib/versusforge-ereignis";
import { istKuenstler } from "@/lib/lakatosbandi";
import { schluesselStimmt } from "@/lib/schluessel-vergleich";

/**
 * NUR „ÜBER MICH" SPEICHERN (Owner 13.09.2026: „hier müssen wir ein extra Save machen").
 *
 * ── WARUM NICHT DER GROSSE SPEICHERN-KNOPF ──────────────────────────────────────────────────
 *
 * `speichern()` in `PortalBearbeiten` schickt ALLES: Name, Ort, Preisspanne, alle Kacheln — und
 * lädt dazu die im Browser wartenden Bilder hoch und löscht die zum Entfernen vorgemerkten.
 * Ein zweiter Knopf am Textfeld, der denselben Weg nimmt, würde also nebenbei halbfertige
 * Bildänderungen festschreiben, die er noch gar nicht abgeschickt hat.
 *
 * Deshalb dieser enge Weg: ein Feld, sonst nichts.
 *
 * ── DIESELBE TÜR WIE ÜBERALL ────────────────────────────────────────────────────────────────
 *
 * Sein Dashboard-Schlüssel, `istKuenstler`, `schluesselStimmt` — wortgleich wie in
 * `api/portal-profil`. Ein neuer Endpunkt mit eigener, lockererer Prüfung wäre eine zweite Tür
 * zum selben Datensatz; genau so entstand die Lücke, die am 12.09.2026 geschlossen wurde.
 *
 * ENG SCHREIBEN: `mandantSpeichern` legt den GANZEN Datensatz ohne Merge ab. Hier wird deshalb
 * der gelesene Stand komplett zurückgeschrieben und nur `ueberMich` ersetzt.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const mandant = str(b.mandant, 80);
  const m = mandant ? await mandantLesen(mandant) : null;
  if (!m || !istKuenstler(m)) return NextResponse.json({ ok: false }, { status: 404 });
  if (!schluesselStimmt(m.schluessel, str(b.k, 200))) return NextResponse.json({ ok: false }, { status: 403 });

  /**
   * DAS FOTO KOMMT MIT (Owner 13.09.2026: „Salvează von dem Text im Profil soll auch Profilbild
   * speichern") — aber nur als JA, nie als NEIN: `|| !!m.profilBild`.
   *
   * Die Datei selbst liegt längst über `api/versusforge-bild` (mit Inhaltsprüfung); hier wird nur
   * vermerkt, DASS es eine gibt. Ein `false` von aussen dürfte den Vermerk nicht löschen können —
   * ein veralteter Browser-Zustand würde sonst ein vorhandenes Foto von der Seite nehmen.
   */
  const ok = await mandantSpeichern(mandant, {
    ...m,
    ueberMich: str(b.ueberMich, 1200).trim(),
    profilBild: b.profilBild === true || !!m.profilBild,
  });
  if (ok) void ereignisMerken(mandant, String(m.name ?? ""), "ueberMichGespeichert");
  return NextResponse.json({ ok }, { status: ok ? 200 : 502 });
}
