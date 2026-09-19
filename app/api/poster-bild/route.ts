import { NextResponse } from "next/server";
import { str } from "@/lib/agent-modell";
import { keinMensch } from "@/lib/kein-mensch";
import { kundenbildAblegen } from "@/lib/lakatosbandi-kundenbild";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SEIN FOTO EINEN SCHRITT VOR DER KASSE (Owner 18.09.2026).
 *
 * Nur für das HOCHGELADENE Foto — der Zettel bekommt hier immer `stil: false`. Was im Stil des
 * Künstlers erzeugt wurde, legt `api/poster-kunst` selbst ab, direkt nachdem das Modell gelaufen
 * ist: Ob eine Erzeugung stattgefunden hat, weiss nur der Server, und daran hängt der Preis
 * (10 € Lizenz gegen 1 € Vermittlung).
 *
 * Deshalb gibt es hier auch keinen Schalter, mit dem der Browser „erzeugt" behaupten könnte.
 */
export async function POST(request: Request) {
  if (keinMensch(request)) return NextResponse.json({ ok: false }, { status: 403 });

  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const bild = typeof b.bild === "string" ? b.bild : "";
  const mandant = str(b.mandant, 80);
  const werk = str(b.werk, 10) || "standard";
  if (!bild.startsWith("data:image/") || !mandant) {
    return NextResponse.json({ ok: false, grund: "unvollstaendig" }, { status: 400 });
  }

  const id = await kundenbildAblegen(bild, { mandant, werk, stil: false });
  if (!id) return NextResponse.json({ ok: false, grund: "ablage" }, { status: 502 });
  return NextResponse.json({ ok: true, id });
}
