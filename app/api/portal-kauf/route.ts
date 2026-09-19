import { NextRequest } from "next/server";
import { mandantLesen } from "@/lib/versusforge-mandanten";
import { kundenbildLesen } from "@/lib/lakatosbandi-kundenbild";

/**
 * ── EIN VERKAUFTES BLATT, FÜR SEIN DASHBOARD (Owner 19.09.2026: „eigentlich müssen sie auch auf
 * dem Dashboard stehen des Künstlers") ───────────────────────────────────────────────────────
 *
 * Kundenbilder liegen bewusst hinter keiner öffentlichen Adresse: Es sind Gesichter von Käufern.
 * Diese Route gibt genau eines heraus, und nur an den Künstler, aus dessen Blatt es entstanden
 * ist — geprüft am SCHLÜSSEL seines Datensatzes, nicht an einer Behauptung des Browsers.
 *
 * Der Zettel muss ausserdem zu DIESEM Künstler gehören. Sonst holte man sich mit dem eigenen
 * Schlüssel die Käufe aller anderen.
 */
export const runtime = "nodejs";

const schluesselStimmt = (soll?: string, ist?: string) =>
  !!soll && !!ist && soll.length === ist.length && soll === ist;

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const mandant = String(p.get("m") ?? "").replace(/[^a-z0-9-]/gi, "").slice(0, 80);
  const k = String(p.get("k") ?? "").slice(0, 200);
  const bild = String(p.get("bild") ?? "");
  if (!mandant || !/^[0-9a-f]{24}$/.test(bild)) return new Response("Not found", { status: 404 });

  const m = await mandantLesen(mandant);
  if (!m || !schluesselStimmt(m.schluessel, k)) return new Response("Not found", { status: 404 });

  const gelesen = await kundenbildLesen(bild).catch(() => null);
  if (!gelesen || !gelesen.zettel.stil || gelesen.zettel.mandant !== mandant) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(new Uint8Array(gelesen.bild), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, no-store" },
  });
}
