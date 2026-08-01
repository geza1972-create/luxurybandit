import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { readRundbriefOeffnungen, vermerkRundbriefOeffnung } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DAS ZÄHLPIXEL DES RUNDBRIEFS (Owner 01.08.2026: „ja" — nach „wieviele haben drauf
 * geklickt?", als die Antwort nur die Klicks kannte).
 *
 * Ein unsichtbares 1×1-Bild am Ende der Mail. Lädt der Empfänger Bilder, meldet sich diese
 * Adresse — daraus wird „geöffnet". Zusammen mit den Klicks (utm auf der Zielseite) trennt
 * das die zwei Fälle, die sonst gleich aussehen: Mail nie angekommen (Zustellproblem) oder
 * gelesen, aber nicht angeklickt (Inhaltsproblem).
 *
 * EHRLICH BLEIBEN, was das Pixel kann: Gmail lädt Bilder über einen Zwischenspeicher
 * (zählt), Apple Mail lädt teils vorsorglich ohne echtes Lesen (zählt zu viel), manche
 * Programme laden nichts (zählt zu wenig). Eine Untergrenze mit Rauschen — aber der
 * Unterschied zwischen „3 von 115" und „50 von 115" ist trotzdem eindeutig.
 *
 * ADMIN-AUSKUNFT: `?zaehlen=1&k=<kampagne>` liefert die Zusammenfassung als JSON.
 */

// 1×1 transparentes GIF — das kleinste Bild, das es gibt.
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export async function GET(request: Request) {
  const u = new URL(request.url);
  const kampagne = (u.searchParams.get("k") ?? "").trim() || "rundbrief";

  if (u.searchParams.get("zaehlen") === "1") {
    if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
    const alle = await readRundbriefOeffnungen(kampagne);
    const eintraege = Object.entries(alle);
    return NextResponse.json({
      kampagne,
      geoeffnet: eintraege.length,
      // Mehrfach geöffnet = echtes Interesse — die Liste ist nach Häufigkeit sortiert.
      empfaenger: eintraege
        .sort((a, b) => b[1].count - a[1].count)
        .map(([email, o]) => ({ email, ...o })),
    });
  }

  const email = (u.searchParams.get("e") ?? "").trim();
  // Best effort: ein fehlgeschlagenes Zählen darf das Bild nie verhindern — sonst steht in
  // der Mail ein kaputtes Bildsymbol, und der Empfänger sieht es.
  if (email) await vermerkRundbriefOeffnung(kampagne, email).catch(() => {});
  return new Response(new Uint8Array(PIXEL), {
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(PIXEL.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
    },
  });
}
