import { NextResponse } from "next/server";
import { kussPaarBildPrompt, kussSzene, zufallsSzene } from "@/lib/kuss-szenen";
import { readKissLog, writeKissLog, createSignedUploadUrl } from "@/lib/try-this-look-store";

/**
 * DAS PAAR-BILD — SCHRITT 1 DER NEUEN KUSS-KETTE (Owner 16.08.2026).
 *
 * „wir müssen erst mal das paar über chatgpt schön angekleidet an einem schönen ort
 * zusammenbringen. Dann wird das an pixverse gegeben und sagen die zwei lachen, schauen sich
 * an und küssen sich."
 *
 * WARUM ES DIESE ROUTE ÜBERHAUPT GIBT — der Grund ist das Gesicht („die gesichter müssen
 * immer stimmen, deswegen machen wir das"). Bisher bekam Pixverse zwei fremde Fotos und
 * musste in EINEM Zug ein Paar, eine Kleidung, einen Ort und eine Bewegung erfinden. Jeder
 * dieser vier Schritte ist eine Gelegenheit, ein Gesicht zu verlieren, und genau das ist
 * mehrfach passiert (Owner 03.08.2026: „falsche Personen im video"). `gpt-image-2` dagegen
 * hält Gesichter — gemessen an acht Vergleichsläufen der Geburtstags-Kette am 08.08.2026.
 *
 * ES IST DIESELBE MASCHINE WIE BEIM GEBURTSTAG, nur mit zwei Vorlagen statt einer:
 * `images/edits` nimmt mehrere `image[]`. Der Aufruf ist bewusst eine Kopie von
 * `avatarBauen` in app/api/geburtstag-video/route.ts — inklusive Rückfall auf `gpt-image-1`
 * und dem Verzicht auf `input_fidelity` (das neue Modell weist den Schalter ab). Wer dort
 * etwas lernt, muss es hier nachziehen; zusammengelegt werden sie erst, wenn die neue Kette
 * einen echten bezahlten Lauf überstanden hat.
 *
 * KOSTEN: ein Bild ≈ 15 ct. Das ist der Preis dafür, dass das Gesicht stimmt — bei 4,99 €
 * Verkaufspreis tragbar, und es ersetzt nichts, was vorher billiger war: Der Pixverse-Lauf
 * danach ist derselbe wie bisher, nur mit EINEM Bild statt zwei.
 */

export const runtime = "nodejs";   // wie jede lange Route im Haus; `Buffer` gibt es auf Edge nicht
export const maxDuration = 300;

const ausDatenUrl = (s: string): Buffer | null => {
  const m = /^data:([^;]+);base64,(.+)$/.exec(String(s ?? "").trim());
  if (!m) return null;
  try { return Buffer.from(m[2], "base64"); } catch { return null; }
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as {
    er?: string; sie?: string; szene?: string; genId?: string;
  };

  const er = ausDatenUrl(String(body.er ?? ""));
  const sie = ausDatenUrl(String(body.sie ?? ""));
  if (!er || !sie) return NextResponse.json({ error: "Beide Fotos fehlen." }, { status: 400 });

  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: "OPENAI_API_KEY fehlt." }, { status: 500 });

  /* Die gewählte Kachel gewinnt; ohne Wahl dieselbe Überraschung wie im Video-Weg — gezogen
     aus der Auftragsnummer, damit derselbe Auftrag beim zweiten Anlauf dieselbe Szene bekommt
     und nicht plötzlich woanders spielt. */
  const szene = kussSzene(body.szene) ?? zufallsSzene(String(body.genId ?? ""));
  const prompt = kussPaarBildPrompt(szene);

  /**
   * DIE REIHENFOLGE IST TEIL DES PROMPTS: erstes Bild = ER, zweites = SIE. Der Prompt nennt
   * sie genau so („The first reference photo is the MAN"). Wer hier tauscht, tauscht die
   * Geschlechter im Ergebnis — derselbe Fehler, der in der alten Kette die Plätze
   * `person`/`garment` betraf.
   */
  const lauf = async (model: string) => {
    const fd = new FormData();
    fd.append("model", model);
    fd.append("prompt", prompt);
    /* 3:4 hochkant — dasselbe Format, in dem die Kachel und später das Video stehen. */
    fd.append("size", "1024x1536");
    fd.append("quality", "medium");
    /**
     * JPEG STATT PNG (Owner 18.08.2026, live: „das bild hängt und geht nicht an pixverse
     * weiter").
     *
     * DAS BILD WAR NIE DAS PROBLEM — der Transport war es. `images/edits` liefert ohne diese
     * zwei Zeilen ein PNG; als Daten-URL sind das 2-3 MB, und die schickt der Browser gleich
     * danach WEITER an /api/generate-tryon-video. Vercel deckelt den Rumpf einer Anfrage bei
     * ~4,5 MB (Hausregel `large-uploads-direct-to-supabase`): Der zweite Aufruf lief damit
     * hart an die Grenze und starb still — das Bild war fertig, der Film startete nie.
     *
     * Ein JPEG derselben Szene wiegt ein Zehntel. Fuer ein Standbild, das anschliessend zu
     * 360p-Video wird, ist verlustfreies PNG ohnehin Verschwendung.
     */
    fd.append("output_format", "jpeg");
    fd.append("output_compression", "85");
    if (model !== "gpt-image-2") fd.append("input_fidelity", "high");
    fd.append("image[]", new Blob([new Uint8Array(er)], { type: "image/jpeg" }), "mann.jpg");
    fd.append("image[]", new Blob([new Uint8Array(sie)], { type: "image/jpeg" }), "frau.jpg");
    const r = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST", headers: { Authorization: `Bearer ${key}` }, body: fd,
    });
    return r.json() as Promise<{ data?: { b64_json?: string }[]; error?: { message?: string } }>;
  };

  const modell = process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-2";
  let out = await lauf(modell);
  if (!out?.data?.[0]?.b64_json && modell !== "gpt-image-1") out = await lauf("gpt-image-1");
  const b64 = out?.data?.[0]?.b64_json;
  if (!b64) {
    /**
     * EIN EHRLICHER FEHLER, KEINE STILLE LEERE: Der Aufrufer hat an dieser Stelle schon
     * bezahlt. Er muss unterscheiden können zwischen „OpenAI hat abgelehnt" (dann hilft ein
     * anderes Foto) und „unser Schlüssel fehlt" (dann hilft nur der Betreiber) — deshalb
     * reist die Meldung des Anbieters mit durch.
     */
    return NextResponse.json({ error: out?.error?.message ?? "Paar-Bild fehlgeschlagen." }, { status: 502 });
  }

  /**
   * DAS ERGEBNIS GEHÖRT AN DEN AUFTRAG (Owner 18.08.2026: „warum sehe ich das nicht unter
   * käufe" — zur Erzeugung von 15:45, die durchgelaufen war).
   *
   * SIE WAR NICHT VERSCHWUNDEN, sie sah nur leer aus: Der Auftrag trug das Video, aber KEIN
   * Bild — und die Auftragskarte im Admin zeigt drei Spalten, deren dritte „Ergebnis" heisst.
   * In der alten Kette fuellte `/api/free-preview` sie; die neue Kette hat das Paar-Bild nie
   * zurueckgeschrieben, weil es nur ein Zwischenschritt zum Video ist. Fuer den Owner ist es
   * aber genau das, was er sehen will — und fuer den Kunden das, was in seiner Galerie liegt.
   *
   * `catch`-frei gedacht: Schlaegt die Ablage fehl, ist das kein Grund, den bezahlten Lauf zu
   * stoppen — das Bild geht trotzdem an den Aufrufer zurueck und wird zum Video.
   */
  const genId = String(body.genId ?? "").trim();
  if (genId) {
    try {
      const up = await createSignedUploadUrl("uploads", "jpeg");
      const put = await fetch(up.uploadUrl, {
        method: "PUT", headers: { "Content-Type": "image/jpeg", "x-upsert": "true" },
        body: new Uint8Array(Buffer.from(b64, "base64")),
      });
      if (put.ok) {
        const alle = await readKissLog();
        const e = alle.find(x => x.id === genId);
        if (e && !e.imagePath) { e.imagePath = up.path; await writeKissLog(alle); }
      }
    } catch { /* Ablage ist Zugabe, der Lauf geht weiter */ }
  }

  return NextResponse.json({ bild: `data:image/jpeg;base64,${b64}`, szene: szene.id });
}
