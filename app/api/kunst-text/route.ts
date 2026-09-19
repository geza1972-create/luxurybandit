import { NextResponse } from "next/server";
import { kundenbildTextSetzen, kundenbildZettel, istKundenbildId } from "@/lib/lakatosbandi-kundenbild";

/**
 * ── SEINE ZEILEN SPEICHERN (Owner 19.09.2026: „er soll danach doch noch Text ändern können und
 * runterladen können" · „dann wird es gespeichert") ──────────────────────────────────────────
 *
 * DAS PROBLEM, das er beschrieben hat: „Er generiert das Bild zuerst, dann vergisst er seinen
 * Namen einzutragen oder Text zu schreiben und ist verärgert." Also muss beides gehen — erst
 * zeichnen, dann schreiben — und das Geschriebene muss auch in der Datei landen.
 *
 * Bisher lebten Titel und Satz nur im Browser. Die Druckdatei entsteht aber auf dem Server und
 * wusste von seinen Worten nichts: Er tippte seinen Namen, lud die Datei, und darin stand der
 * Name des Künstlers.
 *
 * ── NUR AN SEIN EIGENES, BEZAHLTES BLATT ────────────────────────────────────────────────────
 *
 * Geschrieben wird ausschliesslich an einen Zettel mit `stil: true` — den setzt allein die
 * bezahlte Erzeugungs-Route. Ein hochgeladenes Foto hat niemand bezahlt, und eine erfundene
 * Kennung fällt durch. Mehr Schutz braucht es nicht: Die Kennung ist 24 Zeichen aus dem Zufall
 * und steht nirgends öffentlich.
 */
export const runtime = "nodejs";

const str = (v: unknown, max: number) => String(v ?? "").slice(0, max);

export async function POST(request: Request) {
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const bild = str(b.bild, 32);
  if (!istKundenbildId(bild)) return NextResponse.json({ ok: false }, { status: 400 });

  const zettel = await kundenbildZettel(bild);
  if (!zettel || !zettel.stil) return NextResponse.json({ ok: false, grund: "nicht-bezahlt" }, { status: 403 });

  /* Zeilenumbrüche haben auf einem Blatt nichts zu suchen — der Titel ist eine Zeile, der Satz
     bricht von selbst um. */
  const titel = str(b.titel, 120).replace(/\s+/g, " ").trim();
  const satz = str(b.satz, 400).replace(/\s*\n\s*/g, " ").trim();

  const ok = await kundenbildTextSetzen(bild, titel, satz);
  return NextResponse.json({ ok }, { status: ok ? 200 : 502 });
}
