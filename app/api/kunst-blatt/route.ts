import { NextResponse } from "next/server";
import { kundenbildLesen, istKundenbildId } from "@/lib/lakatosbandi-kundenbild";

/**
 * ── EIN FERTIGES BLATT WIEDER HOLEN (Owner 19.09.2026: „ich will jetzt nicht immer neu
 * generieren, um zu testen — habe schon genug generiert") ─────────────────────────────────────
 *
 * ── DAS IST KEIN PRÜF-HILFSMITTEL, SONDERN EIN FEHLER, DEN ES SCHON GAB ──────────────────────
 *
 * Nach der Zahlung steht die Kennung in der Adresse: `?kunst=<id>`. Wer diese Adresse noch einmal
 * öffnet — aus dem Verlauf, aus einem Lesezeichen, aus unserer eigenen Mail — löste bisher einen
 * NEUEN Lauf aus, sobald Guthaben da war. Er hätte also ein zweites Mal bezahlt, um dasselbe
 * Blatt zu sehen, das längst auf dem Server liegt.
 *
 * Diese Route beantwortet zuerst die billigere Frage: Gibt es zu dieser Kennung schon ein
 * fertiges Blatt? Dann wird es gezeigt, und kein Modell läuft.
 *
 * ── NUR BEZAHLTE BLÄTTER ────────────────────────────────────────────────────────────────────
 *
 * `stil: true` setzt allein die bezahlte Erzeugungs-Route. Ein bloss abgelegtes Foto (`false`)
 * kommt hier nicht heraus — sonst wäre das der bequeme Weg, fremde Kundenfotos abzurufen.
 *
 * Die Kennung ist 24 Zeichen aus dem Zufall und steht nirgends öffentlich; dieselbe Schwelle wie
 * bei `api/kunst-text` und `api/kunst-datei`.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const bild = String(new URL(request.url).searchParams.get("bild") ?? "");
  if (!istKundenbildId(bild)) return NextResponse.json({ ok: false }, { status: 400 });

  const gelesen = await kundenbildLesen(bild);
  if (!gelesen?.zettel?.stil) return NextResponse.json({ ok: false, grund: "keins" }, { status: 404 });

  return NextResponse.json({
    ok: true,
    bild: `data:image/jpeg;base64,${Buffer.from(gelesen.bild).toString("base64")}`,
    /* Zu welchem Werk das Blatt gehört — ohne diese Angabe nähme auf einer Seite mit zehn
       Blättern jedes denselben Auftrag an (19.09.2026 gemessen: vier Blätter, ein Bild). */
    mandant: String(gelesen.zettel.mandant ?? ""),
    werk: String(gelesen.zettel.werk ?? "standard"),
    titel: String(gelesen.zettel.titel ?? ""),
    satz: String(gelesen.zettel.satz ?? ""),
  });
}
