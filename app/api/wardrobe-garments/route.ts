import { NextResponse } from "next/server";
import { getSignedUrl, readTryThisLookState } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Welche Katalogbilder sind SAUBERE Kleidungsfotos? Die Liste entsteht offline mit
 * `scripts/classify-wardrobe.mjs` (misst Hautanteil + Hintergrund) und liegt im Storage.
 *
 * Warum überhaupt: Im Anzieh-Slider soll Kleidung stehen, keine fremde Frau. Fotos mit
 * Person schleppen Körper und Pose in die Anzieh-Pipeline und brechen die Illusion, weil
 * der Kunde gerade „seine" Frau ausgewählt hat.
 *
 * Fehlt die Liste, geben wir `null` zurück — die Funnels zeigen dann ALLES statt nichts.
 */
/**
 * DAS HÄKCHEN DES OWNERS STICHT DIE MESSUNG (Owner 31.07.2026: „die sind alle ok").
 *
 * WAS SCHIEFLIEF: Die Messung wirft Fotos mit hohem Hautanteil raus, weil dort meist eine
 * fremde Frau mit drauf ist. Bei WÄSCHE UND BADEMODE schlägt sie zwangsläufig an — auf so
 * einem Foto ist viel Haut, auch wenn nur das Kleidungsstück zu sehen ist. Von 87 Teilen,
 * die der Owner ausdrücklich für die Garderobe freigegeben hatte, fielen 16 durch: fast
 * ausschliesslich Lingerie und Bikinis, also genau die Kategorie, die im Kuss- und
 * Lingerie-Trichter am meisten verkauft.
 *
 * Der Owner hat alle 16 einzeln angesehen und freigegeben.
 *
 * WARUM DIE REGEL HIER STEHT UND NICHT IN DEN TRICHTERN: Vier Trichter lesen diese Liste
 * (Kiss, Chat, Holiday, Surprise). Eine Ausnahme, die man in vier Dateien pflegen muss, ist
 * nach dem zweiten Umbau in dreien falsch. Hier steht sie einmal.
 *
 * Die Messung bleibt scharf für alles, wozu der Owner NICHTS gesagt hat — sie entscheidet
 * weiter über den restlichen Katalog. Sie verliert nur gegen eine ausdrückliche Ansage.
 */
export async function GET() {
  try {
    const url = await getSignedUrl("try-this-look/wardrobe-garments.json", 60 * 5).catch(() => "");
    if (!url) return NextResponse.json({ ids: null });
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return NextResponse.json({ ids: null });
    const data = await res.json().catch(() => null);
    if (!Array.isArray(data?.ids)) return NextResponse.json({ ids: null });

    const gemessen = data.ids.map(String);
    // Alles mit gesetztem Häkchen kommt dazu, auch wenn die Messung es verworfen hat.
    let vomOwner: string[] = [];
    try {
      const st = await readTryThisLookState();
      vomOwner = (st.looks ?? [])
        .filter((l: { id?: string; wardrobe?: boolean; imageUrl?: string; imagePath?: string }) =>
          l.wardrobe === true && !!l.id && !!(l.imageUrl || l.imagePath))
        .map(l => String(l.id));
    } catch { /* ohne den Zustand bleibt es bei der gemessenen Liste */ }

    const ids = [...new Set([...gemessen, ...vomOwner])];
    return NextResponse.json({
      ids,
      savedAt: data?.savedAt ?? null,
      gemessen: gemessen.length,
      vomOwner: vomOwner.length,
      dazu: ids.length - gemessen.length,
    });
  } catch {
    return NextResponse.json({ ids: null });
  }
}
