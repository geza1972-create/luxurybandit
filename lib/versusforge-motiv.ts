/**
 * EIN MOTIV FÜR DIE OBERE HÄLFTE (Owner 09.09.2026: „ich hätte ihn gefragt: wenn du keine
 * hast, werde ich dir eins generieren, ok, als Beispiel. Dann, wenn er das cool findet, macht
 * er das bestimmt neu und kauft").
 *
 * ── WARUM DAS DER VERKAUFENDE MOMENT IST ───────────────────────────────────────────────────
 *
 * Die weisse Schriftkachel beweist den SATZ. Sie beweist nicht, dass daraus eine Anzeige
 * wird, die jemanden im Scrollen anhält — und genau das ist die Frage, die er sich stellt,
 * bevor er zahlt. Ein Bild mit Motiv beantwortet sie in einer Sekunde.
 *
 * ── ES KOSTET GELD, ALSO FRAGT ER VORHER ───────────────────────────────────────────────────
 *
 * Ein Lauf kostet rund fünfzehn Cent — mehr als das ganze Gespräch davor. Deshalb ist das
 * Werkzeug im Agenten `frei: false` und läuft NUR nach einem ausdrücklichen Ja
 * ([[keine-erzeugung-ohne-zustimmung]], [[kein-token-fuer-abbrecher]]). Die Reihenfolge, die
 * der Owner vorgegeben hat, ist dabei die richtige: erst nach seinem eigenen Foto fragen,
 * und erst wenn er keins hat, das Erzeugen ANBIETEN.
 *
 * ── WAS DAS MOTIV NICHT DARF ───────────────────────────────────────────────────────────────
 *
 * KEINE SCHRIFT IM BILD. Der Satz wird darunter gesetzt, sauber und in seiner Sprache;
 * erfundene Buchstaben im Motiv sähen aus wie ein Fehldruck. Modelle schreiben unaufgefordert
 * Wörter in Bilder, deshalb steht es dreimal im Auftrag.
 *
 * KEINE MARKEN, KEINE ERKENNBAREN GESICHTER, KEINE SIEGEL. Das Bild geht in eine Anzeige
 * seines Betriebs — ein fremdes Gesicht darin wäre sein Problem, nicht unseres, und genau
 * deshalb darf es gar nicht erst entstehen.
 *
 * ES IST EIN BEISPIEL, KEIN PRODUKTFOTO. Der Agent sagt das dazu: Ein erzeugtes Motiv zeigt,
 * WIE die Anzeige wirkt — für die echte nimmt er ein Foto seines eigenen Betriebs.
 */

/** Was ein Motiv kostet, grob — für die Anzeige im Log, nicht für den Kunden. */
export const MOTIV_CENTS = 15;

export type MotivFund =
  | { ok: true; bild: Buffer }
  | { ok: false; grund: string };

export async function motivBauen(o: {
  apiKey: string;
  /** Was er anbietet, in SEINEN Worten — daraus entsteht die Szene. */
  fach: string;
  /** Der Hook, damit das Motiv zur Aussage passt und nicht daneben. */
  hook?: string;
}): Promise<MotivFund> {
  const fach = String(o.fach ?? "").trim().slice(0, 300);
  if (!fach) return { ok: false, grund: "kein-fach" };

  /**
   * DER AUFTRAG IST AUF ENGLISCH, das Motiv sprachlos.
   *
   * Bildmodelle sind auf englischen Beschreibungen am zuverlässigsten, und es gibt hier
   * nichts zu übersetzen: Ein Foto einer Terrasse sieht auf Rumänisch genauso aus. Die
   * Sprache steckt im Satz darunter, nicht im Bild.
   */
  const auftrag = [
    `Photograph for an advertisement of this business: ${fach}.`,
    o.hook ? `The mood should match this line: "${o.hook}".` : "",
    "Real photography, natural daylight, shallow depth of field, documentary feel.",
    "Absolutely no text, no letters, no numbers, no logos, no watermarks, no signage.",
    "No recognisable faces, no people looking at the camera.",
    "Wide horizontal composition, the subject slightly off-centre.",
  ].filter(Boolean).join(" ");

  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${o.apiKey}`, "Content-Type": "application/json" },
      /* Querformat, weil das Motiv die obere Hälfte einer 4:5-Kachel füllt — ein Quadrat
         müsste stark beschnitten werden, und dann sitzt das Wichtige ausserhalb. */
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1",
        prompt: auftrag,
        size: "1536x1024",
        quality: "medium",
        n: 1,
      }),
      signal: AbortSignal.timeout(90000),
    });

    const roh = await res.text();
    if (!res.ok) {
      console.error("[versusforge-motiv] Erzeugung gescheitert:", res.status, roh.slice(0, 300));
      return { ok: false, grund: `HTTP ${res.status}` };
    }
    const daten = JSON.parse(roh) as { data?: { b64_json?: string; url?: string }[] };
    const eintrag = daten.data?.[0];
    if (eintrag?.b64_json) return { ok: true, bild: Buffer.from(eintrag.b64_json, "base64") };
    /* Manche Fassungen liefern eine Adresse statt der Daten — dann holen wir sie einmal. */
    if (eintrag?.url) {
      const bild = await fetch(eintrag.url, { signal: AbortSignal.timeout(30000) });
      if (bild.ok) return { ok: true, bild: Buffer.from(await bild.arrayBuffer()) };
    }
    return { ok: false, grund: "leer" };
  } catch (e) {
    console.error("[versusforge-motiv] Aufruf gescheitert", e);
    return { ok: false, grund: "aufruf" };
  }
}
