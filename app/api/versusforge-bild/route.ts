import { NextResponse } from "next/server";
import { str } from "@/lib/agent-modell";
import { hookBild } from "@/lib/versusforge-bild";
import { mandantLesen } from "@/lib/versusforge-mandanten";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DAS BILD ZUM HERUNTERLADEN (Owner 09.09.2026: „er bekommt am Ende ein Bild für Instagram
 * oder FB, das er runterladen kann").
 *
 * POST UND NICHT GET, aus demselben Grund wie beim Plan-PDF: Der Hook steht im Rumpf, nicht
 * in der Adresse. Ein GET mit dem Satz in der URL landete im Verlauf, in Server-Protokollen
 * und im `Referer` — und der Hook ist das Einzige, was er hier wirklich besitzt.
 *
 * NICHTS WIRD GESPEICHERT. Das Bild entsteht bei jedem Aufruf neu aus dem, was der Browser
 * schickt. Es gibt also keine Adresse, unter der fremde Hooks herumliegen, und nichts, was
 * aufgeräumt werden müsste.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try { body = (await request.json()) as Record<string, unknown>; } catch { /* leer */ }

  const hook = str(body.hook, 300).trim();
  if (!hook) return NextResponse.json({ error: "Ohne Hook gibt es kein Bild." }, { status: 400 });

  try {
    const bild = await hookBild({
      hook,
      aufruf: str(body.aufruf, 60).trim(),
    });
    return new NextResponse(new Uint8Array(bild), {
      headers: {
        "Content-Type": "image/jpeg",
        /* `attachment` mit Namen: Am Handy landet es damit in den Downloads statt in einem
           Tab, aus dem man es lange herausdrücken muss. */
        "Content-Disposition": 'attachment; filename="VersusForge-Anzeige.jpg"',
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[versusforge-bild] fehlgeschlagen", e);
    return NextResponse.json({ error: "Das Bild ging gerade nicht." }, { status: 502 });
  }
}


/**
 * DASSELBE BILD PER GET — für die Anzeigen-Seite (09.09.2026).
 *
 * WARUM ES DAS ZUSÄTZLICH BRAUCHT: Ein `<img src>` kann kein POST. Ohne diesen Weg könnte er
 * das Bild nur herunterladen, ohne es vorher zu sehen — und niemand postet ein Bild, das er
 * nicht angesehen hat.
 *
 * HIER STEHT KEIN HOOK IN DER ADRESSE, sondern nur die Kennung seines Trichters: Der Satz
 * kommt vom Server aus seinem Plan. Damit landet er weder im Verlauf noch im `Referer`.
 */
/**
 * `i` WÄHLT EINEN WEITEREN HOOK (Owner 09.09.2026: „ich brauche noch einen Punkt für Hooks,
 * dort sehe ich meine Bilder, dort kann ich weitere generieren").
 *
 * Ohne `i` kommt der Hook aus dem Plan — das ist der erste, den die Engine gebaut hat, und
 * er bleibt die Vorgabe. `i=0,1,2…` greift in `hooks`, die Sammlung, die er selbst füllt.
 * Auch hier steht KEIN Satz in der Adresse, nur eine Nummer.
 */
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const kennung = sp.get("m") ?? "";
  const m = await mandantLesen(kennung);
  const weitere = Array.isArray(m?.hooks) ? (m.hooks as string[]) : [];
  const nr = sp.get("i");
  const hook = nr !== null && nr !== ""
    ? String(weitere[Number(nr)] ?? "").trim()
    : String((m?.plan as { hook?: string } | undefined)?.hook ?? "").trim();
  if (!m || !hook) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });

  try {
    const bild = await hookBild({
      hook,
      aufruf: "Jetzt anfragen",
    });
    return new NextResponse(new Uint8Array(bild), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[versusforge-bild] GET fehlgeschlagen", e);
    return NextResponse.json({ error: "Das Bild ging gerade nicht." }, { status: 502 });
  }
}
