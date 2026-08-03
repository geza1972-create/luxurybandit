import { NextResponse } from "next/server";
import { readKissLog, getSignedUrl } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DIE AUSKUNFT DER WERK-SEITE (Owner 01.08.2026: Teilen = öffentlich, mit Wissen des
 * Besitzers — und der Empfänger bekommt unten einen Knopf zum Generator: „das ist Werbung").
 *
 * ÖFFENTLICH, aber eng: Es kommt NUR, was der Besitzer im Teilen-Dialog freigegeben hat
 * (`sharedAt`), und davon NUR das Ergebnis — Bild oder Video. Die hochgeladenen Vorlagen
 * (personPath/modelPath) verlassen diese Route nie; sie sind das Privateste, was hier liegt.
 *
 * Die Kennungen sind UUIDs und nicht erratbar; der Stempel schützt trotzdem — falls eine
 * Kennung je in falsche Hände gerät, zeigt sie ohne Freigabe nichts.
 */
export async function GET(request: Request) {
  const id = String(new URL(request.url).searchParams.get("id") ?? "").trim();
  if (!id) return NextResponse.json({ error: "id fehlt." }, { status: 400 });
  try {
    const alle = await readKissLog();
    const e = alle.find(x => x.id === id);
    if (!e || !e.sharedAt) {
      // Bewusst dieselbe Antwort für „gibt es nicht" und „nicht freigegeben" — sonst ließe
      // sich abfragen, welche Kennungen existieren.
      return NextResponse.json({ error: "private" }, { status: 404 });
    }
    // LANG signiert: Ein geteilter Link lebt in Chats wochenlang weiter. Ein totes Bild
    // nach 24 Stunden wäre für den Empfänger unser Aushängeschild — ein kaputtes.
    const bild = e.imagePath ? await getSignedUrl(e.imagePath, 60 * 60 * 24 * 365).catch(() => "") : "";
    return NextResponse.json({
      ok: true,
      theme: e.theme || "kiss",
      bild,
      video: e.videoUrl || "",
      // Der Name macht aus den aufsteigenden Zeilen SEINE Botschaft — genau hier zaehlt das.
      empfaenger: e.empfaenger || "",
    }, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch {
    return NextResponse.json({ error: "private" }, { status: 404 });
  }
}
