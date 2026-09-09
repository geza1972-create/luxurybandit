import { NextResponse } from "next/server";
import { str } from "@/lib/agent-modell";
import { hookBild } from "@/lib/versusforge-bild";
import { mandantLesen, mandantSpeichern } from "@/lib/versusforge-mandanten";
import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";
import crypto from "node:crypto";

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
/** Zeitgleicher Vergleich — derselbe Schlüsselvergleich wie im Dashboard. */
function schluesselStimmt(soll: string, ist: string): boolean {
  const a = Buffer.from(String(soll ?? ""), "utf8");
  const b = Buffer.from(String(ist ?? ""), "utf8");
  if (!a.length || a.length !== b.length) return false;
  try { return crypto.timingSafeEqual(a, b); } catch { return false; }
}

/** Sein Motiv aus dem Speicher holen. Fehlt es, gibt es keins — kein Fehler. */
async function motivLesen(pfad?: string): Promise<Buffer | undefined> {
  if (!pfad) return undefined;
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad)}`);
  if (!res.ok) return undefined;
  return Buffer.from(await res.arrayBuffer());
}

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try { body = (await request.json()) as Record<string, unknown>; } catch { /* leer */ }

  /**
   * ── SEIN MOTIV HOCHLADEN (Owner 09.09.2026: „stell dir vor, ein Künstler will seine Art
   * verkaufen. Das müsste auch funktionieren. Bild und Spruch") ─────────────────────────────
   *
   * BEIM KÜNSTLER IST DAS BILD DAS PRODUKT. Eine weisse Schriftkachel beschreibt ein Gemälde,
   * sie zeigt es nicht — und ein Gemälde verkauft sich über das Auge.
   *
   * EINMAL FÜR ALLE SEINE HOOKS: Es liegt am Mandanten, nicht an einer einzelnen Kachel. Wer
   * sein Werk hochlädt, will es unter jedem Satz sehen.
   *
   * NUR MIT SEINEM DASHBOARD-SCHLÜSSEL. Ohne diese Prüfung könnte jeder, der einen
   * Trichternamen kennt, ein fremdes Bild in eine fremde Anzeige legen.
   */
  if (str(body.was, 20) === "motiv") {
    const kennung = str(body.mandant, 60);
    const m = await mandantLesen(kennung);
    if (!m) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    if (!schluesselStimmt(m.schluessel, str(body.k, 200))) {
      return NextResponse.json({ error: "Dieser Trichter gehört jemand anderem." }, { status: 403 });
    }

    /* WEGNEHMEN IST AUCH EINE ANTWORT: Wer sein Bild loswerden will, soll dafür nicht den
       Löschweg des ganzen Trichters gehen müssen. */
    if (str(body.daten, 20) === "") {
      await mandantSpeichern(kennung, { ...m, motivPfad: "" });
      return NextResponse.json({ ok: true, motiv: false });
    }

    const roh = String(body.daten ?? "");
    const teil = roh.startsWith("data:image/") ? roh.split(",", 2)[1] ?? "" : "";
    if (!teil) return NextResponse.json({ error: "Das ist kein Bild." }, { status: 400 });
    const daten = Buffer.from(teil, "base64");
    /* Der Browser hat schon auf 1080 Pixel verkleinert; die Grenze fängt nur den Fall ab,
       dass jemand die Route von Hand füttert. */
    if (!daten.length || daten.length > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "Das Bild ist zu gross." }, { status: 413 });
    }

    const pfad = `versusforge-motiv/${kennung}.jpg`;
    const put = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad)}`, {
      method: "POST",
      headers: { "Content-Type": "image/jpeg", "x-upsert": "true" },
      body: new Uint8Array(daten),
    });
    if (!put.ok) {
      console.error("[versusforge-bild] Motiv nicht gespeichert:", put.status);
      return NextResponse.json({ error: "Das Bild liess sich nicht ablegen." }, { status: 502 });
    }
    await mandantSpeichern(kennung, { ...m, motivPfad: pfad });
    return NextResponse.json({ ok: true, motiv: true });
  }

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
    /**
     * DER AUFRUF STEHT IN SEINER SPRACHE (09.09.2026, im Bild gesehen): Auf einer rumänischen
     * Kachel stand „Jetzt anfragen" — fest verdrahtet. Das ist der einzige deutsche Rest auf
     * einem Bild, das er unter seinem Namen postet.
     */
    const AUFRUF: Record<string, string> = {
      de: "Jetzt anfragen", en: "Get in touch", ro: "Cere ofertă",
    };
    const bild = await hookBild({
      hook,
      aufruf: AUFRUF[String(m.sprache ?? "de").slice(0, 2)] ?? AUFRUF.de,
      /* Sein Name gehört auf das Bild — es wandert weiter, ohne die Anzeige daneben. */
      marke: m.name,
      /* Sein eigenes Motiv, wenn er eines hochgeladen hat — oben Bild, unten Spruch. */
      fotoDaten: await motivLesen(m.motivPfad),
    });
    return new NextResponse(new Uint8Array(bild), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[versusforge-bild] GET fehlgeschlagen", e);
    return NextResponse.json({ error: "Das Bild ging gerade nicht." }, { status: 502 });
  }
}
