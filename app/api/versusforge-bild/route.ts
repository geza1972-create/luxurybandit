import { NextResponse } from "next/server";
import { str } from "@/lib/agent-modell";
import { hookBild } from "@/lib/versusforge-bild";
import { mandantLesen } from "@/lib/versusforge-mandanten";
import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";
import { bildPruefen, pruefPfad } from "@/lib/versusforge-moderation";
import { motivPruefungAlarm } from "@/lib/versusforge-pruefung-post";
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

/**
 * ── EIN MOTIV JE HOOK, NICHT JE TRICHTER (Owner 09.09.2026: „jetzt fällt mir ein — der Kunde
 * macht also pro Motiv einen Trichter + Dashboard?") ────────────────────────────────────────
 *
 * NEIN, UND DIE FRAGE HAT EINEN ECHTEN FEHLER AUFGEDECKT. Ich hatte EIN Motiv an den
 * Mandanten gehängt. Für den Zahnarzt stimmt das — sein Raum ist immer derselbe. Für einen
 * Künstler ist es falsch: Fünf Werke haben fünf Sätze und fünf Bilder. Mit einem Motiv je
 * Trichter hätte er fünf Trichter kaufen müssen, um fünf Bilder zu bewerben.
 *
 * DER PFAD TRÄGT DIE NUMMER DES HOOKS. `standard` ist das Bild für den Hook aus seiner
 * Analyse und gleichzeitig der Rückfall für jeden Hook, der kein eigenes hat.
 *
 * ES STEHT NICHT MEHR IN DER MANDANTENDATEI. Vorher schrieb jeder Bild-Upload den ganzen
 * Datensatz neu (`{...m, motivPfad}`) — und wer währenddessen seine Einstellungen speicherte,
 * verlor sie ([[delete-resurrection-merge-bug]]: zwei Schreibvorgänge nacheinander fressen
 * einander). Jetzt ist die Ablage selbst die Wahrheit: Was da liegt, gibt es.
 */
const motivPfad = (mandant: string, nr: string) =>
  `versusforge-motiv/${mandant}/${nr === "" || nr === "-1" ? "standard" : nr}.jpg`;

/** Sein Motiv holen — erst das eigene des Hooks, sonst das des Trichters. */
async function motivLesen(mandant: string, nr: string): Promise<Buffer | undefined> {
  for (const pfad of [motivPfad(mandant, nr), motivPfad(mandant, "")]) {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad)}`);
    if (res.ok) return Buffer.from(await res.arrayBuffer());
  }
  return undefined;
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

    /* 12 statt 6 Zeichen (Owner 21.09.2026, Sonnenbrille): Die zweite Produktansicht eines
       Werks trägt denselben Schlüssel mit dem Zusatz „-2" — „standard-2" hat zehn Zeichen. */
    const nr = str(body.nr, 12);
    const pfad = motivPfad(kennung, nr);

    /* WEGNEHMEN IST AUCH EINE ANTWORT: Wer sein Bild loswerden will, soll dafür nicht den
       Löschweg des ganzen Trichters gehen müssen. */
    if (str(body.daten, 20) === "") {
      await supabaseFetch(`/storage/v1/object/${BUCKET}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: [pfad] }),
      });
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

    /**
     * ── ERST GEPRÜFT, DANN GESPEICHERT (Owner 10.09.2026: „Ich will nicht, dass Leute hier
     * Pornobilder hochladen. Ich werde sie freigeben müssen." · „markierte") ──────────────────
     *
     * VERBOTEN wird nicht gespeichert — nirgends, auch nicht zur Ansicht für den Owner. Das
     * gilt für JEDEN, ohne Ausnahme (auch für die zwei unten): Die automatische Prüfung ist
     * eine Frage des ANSTANDS, nicht des Vertrauens. Begründung und Grenzen in
     * `lib/versusforge-moderation.ts`.
     */
    const urteil = await bildPruefen({ apiKey: process.env.OPENAI_API_KEY?.trim() ?? "", bild: `data:image/jpeg;base64,${teil}` });
    if (urteil.urteil === "verboten") {
      console.warn("[versusforge-bild] Motiv abgelehnt, nicht gespeichert:", kennung, urteil.gruende.join(", "));
      return NextResponse.json({ error: "abgelehnt", code: urteil.aktfoto ? "aktfoto" : "abgelehnt" }, { status: 422 });
    }
    /**
     * ── AB JETZT GEHT JEDES BILD IN DIE PRÜFUNG (Owner 18.09.2026) — AUSSER ZWEIEN (Owner
     * 25.09.2026: „ich will dass die Bilder von Gerry Louisett und Szidonia Bandi keine
     * Freigabe benötigen") ────────────────────────────────────────────────────────────────────
     *
     * „Ab jetzt lassen wir nicht alle. Ich muss selektieren. Sie können nicht mehr direkt
     * posten, ich muss die Bilder freigeben. Einzeln." — das galt seit dem 18.09. für JEDEN
     * Künstler, auch für die zwei, die der Owner selbst kennt und deren Werke er längst
     * angesehen hat. Ihr Bild wartete deshalb genauso in der Prüfablage wie das eines Fremden
     * (GEMESSEN 25.09.2026: Gerrys drittes Werk lag seit dem Hochladen in
     * `versusforge-motiv-pruefung/gerrylouisett/3.jpg`, auf der Seite fehlte es).
     *
     * `OHNE_FREIGABE` ist eine Ausnahme für ZWEI NAMEN, keine Rückkehr zu „alle frei": Ihr Weg
     * geht direkt an den öffentlichen Platz, wie vor dem 18.09. — jeder andere Künstler bleibt
     * in der Prüfablage, mit derselben Mail und denselben zwei Knöpfen
     * (`app/api/versusforge-freigabe/route.ts`).
     *
     * WAS DER KÜNSTLER OHNE FREIGABE SIEHT: sein Bild, sofort — keine Kachel „in Prüfung".
     */
    const OHNE_FREIGABE = new Set(["gerrylouisett", "szidoniabandi-6"]);
    const brauchtFreigabe = !OHNE_FREIGABE.has(kennung);
    const zielPfad = brauchtFreigabe ? pruefPfad(kennung, nr) : pfad;

    const put = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(zielPfad)}`, {
      method: "POST",
      headers: { "Content-Type": "image/jpeg", "x-upsert": "true" },
      body: new Uint8Array(daten),
    });
    if (!put.ok) {
      console.error("[versusforge-bild] Motiv nicht gespeichert:", put.status);
      return NextResponse.json({ error: "Das Bild liess sich nicht ablegen." }, { status: 502 });
    }
    if (!brauchtFreigabe) {
      /* Direkt am öffentlichen Platz — nichts wartet, keine Mail, kein Zettel aufzuräumen. */
      return NextResponse.json({ ok: true, motiv: true, pruefung: false });
    }
    /**
     * ── EIN NEUES BILD HEBT DIE ALTE ABLEHNUNG AUF (Owner 18.09.2026) ─────────────────────────
     *
     * Der Zettel `<nr>.abgelehnt.json` macht aus einem wartenden Bild ein abgelehntes: Er hält
     * es aus der Freigabeliste heraus und färbt die Kachel im Dashboard rot. Bliebe er liegen,
     * wäre auch das NEUE Bild von Anfang an abgelehnt — und der Owner bekäme es nie zu sehen.
     * Der Künstler hätte getauscht und nichts hätte sich bewegt.
     */
    await supabaseFetch(`/storage/v1/object/${BUCKET}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: [`${pruefPfad(kennung, nr).replace(/\.jpg$/, "")}.abgelehnt.json`] }),
    }).catch(() => null);
    /* Die Mail geht jetzt bei JEDEM Bild raus. Ohne Grund-Liste heisst das: nichts ist
       aufgefallen, es wartet nur auf ein Ja — mit Gründen heisst es, die Moderation hat etwas
       gesehen. Der Owner soll das unterscheiden können, ohne das Bild zu öffnen. */
    void motivPruefungAlarm({ betrieb: m.name, kennung, nr, gruende: urteil.gruende })
      .catch(e => console.error("[versusforge-bild] Prüf-Mail gescheitert", e));
    /* KEIN SCHREIBEN IN DIE MANDANTENDATEI: Die Ablage ist die Wahrheit. Begründung oben. */
    return NextResponse.json({ ok: true, motiv: false, pruefung: true });
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
      fotoDaten: await motivLesen(kennung, nr ?? ""),
    });
    return new NextResponse(new Uint8Array(bild), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[versusforge-bild] GET fehlgeschlagen", e);
    return NextResponse.json({ error: "Das Bild ging gerade nicht." }, { status: 502 });
  }
}
