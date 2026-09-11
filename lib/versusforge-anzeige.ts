import sharp from "sharp";
import { frageModell, KLEIN, verbrauchDazu, type Verbrauch } from "@/lib/agent-modell";
import { anzeigePrompt, sollTexte, type AnzeigeBrief } from "@/lib/versusforge-anzeige-prompt";

/**
 * DIE FERTIGE ANZEIGE ERZEUGEN — UND NACHPRÜFEN, BEVOR SIE JEMAND SIEHT (10.09.2026).
 *
 * ── ES KOSTET GELD ─────────────────────────────────────────────────────────────────────────
 *
 * Mehr als das schriftlose Motiv: `quality: "high"`, weil Schrift im Bild sonst ausfranst, und
 * im schlimmsten Fall ein zweiter Lauf. Diese Funktion fragt NICHT selbst nach — wer sie
 * einbaut, hängt sie hinter eine Freigabe wie `motiv_erzeugen` (`frei: false`,
 * [[keine-erzeugung-ohne-zustimmung]]).
 *
 * ── WARUM DIE NACHPRÜFUNG PFLICHT IST ─────────────────────────────────────────────────────
 *
 * Bildmodelle schreiben inzwischen gut, aber nicht fehlerfrei — und am häufigsten falsch sind
 * genau unsere Fälle: Umlaute, rumänische Zeichen, kleine Zeilen. Ein Zahnarzt, der „Zahnimplantat"
 * mit einem Buchstabendreher postet, blamiert sich mit unserem Bild. Deshalb liest ein zweites
 * Modell jedes Bild und vergleicht Wort für Wort mit dem, was dastehen soll.
 *
 * EIN ZWEITER LAUF, NICHT DREI: Dieselbe Entscheidung wie in `agent-modell.ts`. Scheitert auch
 * der zweite, geht das bessere Bild MIT dem Befund zurück — der Aufrufer entscheidet, ob er es
 * zeigt oder auf die Schriftkachel (`hookBild`) zurückfällt, die sich nie verschreibt.
 */

export type Pruefung = {
  stimmt: boolean;
  /** Was falsch ist, je Eintrag ein kurzer Satz. Leer, wenn alles stimmt. */
  fehler: string[];
};

export type AnzeigeFund =
  | { ok: true; bild: Buffer; pruefung: Pruefung; laeufe: number; verbrauch: Verbrauch }
  | { ok: false; grund: string };

/** Das Zielformat: 4:5, wie `hookBild` — Instagram zeigt es im Feed am grössten. */
const B = 1080;
const H = 1350;

async function erzeugen(apiKey: string, prompt: string): Promise<Buffer | null> {
  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        /* EIGENER SCHALTER: Das Anzeigenmodell soll wechseln dürfen, ohne das Motiv mitzuziehen. */
        model: process.env.OPENAI_ANZEIGE_MODEL?.trim() || process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1.5",
        prompt,
        /* 2:3, das nächste Hochformat, das die Modelle liefern. Einpassen in 4:5 unten. */
        size: "1024x1536",
        quality: "high",
        n: 1,
      }),
      signal: AbortSignal.timeout(150000),
    });
    const roh = await res.text();
    if (!res.ok) {
      console.error("[versusforge-anzeige] Erzeugung gescheitert:", res.status, roh.slice(0, 300));
      return null;
    }
    const daten = JSON.parse(roh) as { data?: { b64_json?: string; url?: string }[] };
    const eintrag = daten.data?.[0];
    if (eintrag?.b64_json) return Buffer.from(eintrag.b64_json, "base64");
    if (eintrag?.url) {
      const bild = await fetch(eintrag.url, { signal: AbortSignal.timeout(30000) });
      if (bild.ok) return Buffer.from(await bild.arrayBuffer());
    }
    return null;
  } catch (e) {
    console.error("[versusforge-anzeige] Aufruf gescheitert", e);
    return null;
  }
}

/**
 * ── EINPASSEN, NICHT BESCHNEIDEN (10.09.2026, erster echter Lauf mit Atelier Insula) ──────
 *
 * DIE ERSTE FASSUNG SCHNITT 2:3 AUF 4:5 und verliess sich darauf, dass das Modell oben und
 * unten zehn Prozent frei lässt. Es hat es nicht getan: Die Headline klebte oben am Rand, der
 * Knopf „Anfragen" war weg. Der Korrektor hat es gemeldet — zweimal hintereinander.
 *
 * DIE LEHRE: Eine Bitte an ein Bildmodell ist keine Garantie. Was nicht verloren gehen darf,
 * schützt der Code. Das Bild wird deshalb GANZ eingepasst.
 *
 * DIE STREIFEN LINKS UND RECHTS SIND DAS BILD SELBST, UNSCHARF. Die erste Fassung füllte sie
 * mit der Farbe der linken oberen Ecke — die war im zweiten Lauf dunkler als die Wand, und die
 * Streifen sahen aus wie ein Rahmen, der nicht dazugehört. Die verwischte Vergrösserung trifft
 * jede Farbe und jeden Verlauf von allein.
 */
async function einpassen(roh: Buffer): Promise<Buffer> {
  const hinten = await sharp(roh).resize(B, H, { fit: "cover" }).blur(40).toBuffer();
  const vorne = await sharp(roh).resize(B, H, { fit: "inside" }).toBuffer();
  const masse = await sharp(vorne).metadata();
  return await sharp(hinten)
    .composite([{ input: vorne, left: Math.round((B - (masse.width ?? B)) / 2), top: Math.round((H - (masse.height ?? H)) / 2) }])
    .jpeg({ quality: 92 })
    .toBuffer();
}

/**
 * Liest das FERTIGE 4:5-Bild — nicht das rohe. Nur so meldet der Prüfbericht, was der Kunde
 * wirklich bekommt (so wurde der abgeschnittene Knopf im ersten Lauf gefunden).
 */
async function pruefen(apiKey: string, bild: Buffer, soll: string[]): Promise<{ pruefung: Pruefung; verbrauch?: Verbrauch }> {
  const r = await frageModell(apiKey, KLEIN, [
    {
      type: "input_text",
      text: [
        "Du bist Korrektor. Lies JEDEN Text in diesem Anzeigenbild und vergleiche ihn Buchstabe für Buchstabe mit der Soll-Liste.",
        "Soll-Liste (jede Zeile muss genau so im Bild stehen, Gross/Klein egal):",
        ...soll.map(s => `  · ${s}`),
        "Fehler sind: falsch geschriebene oder fehlende Buchstaben, fehlende Umlaute oder Akzente, fehlende Zeilen, abgeschnittener Text, und JEDER zusätzliche Text, der nicht in der Liste steht (erfundene Wörter, Pseudo-Logos, Kauderwelsch).",
        'Antworte NUR als JSON: {"stimmt":true,"fehler":["..."]}',
      ].join("\n"),
    },
    { type: "input_image", image_url: `data:image/jpeg;base64,${bild.toString("base64")}` },
  ], "low");

  /* KANN DER KORREKTOR NICHT LESEN, GILT DAS BILD NICHT ALS GEPRÜFT. Durchwinken wäre genau
     der Fehler, für den es ihn gibt. */
  if (!r.ok) return { pruefung: { stimmt: false, fehler: [`Prüfung nicht möglich: ${r.fehler}`] } };
  const fehler = (Array.isArray(r.daten.fehler) ? r.daten.fehler : []).map(f => String(f ?? "").trim()).filter(Boolean).slice(0, 8);
  return { pruefung: { stimmt: r.daten.stimmt === true && !fehler.length, fehler }, verbrauch: r.verbrauch };
}

export async function anzeigeErzeugen(o: { apiKey: string; brief: AnzeigeBrief }): Promise<AnzeigeFund> {
  const prompt = anzeigePrompt(o.brief);
  const soll = sollTexte(o.brief.texte);
  let verbrauch: Verbrauch = { hinein: 0, heraus: 0, aufrufe: 0 };
  let bestes: { bild: Buffer; pruefung: Pruefung } | null = null;

  for (let lauf = 1; lauf <= 2; lauf++) {
    const roh = await erzeugen(o.apiKey, prompt);
    if (!roh) continue;
    const bild = await einpassen(roh);
    const p = await pruefen(o.apiKey, bild, soll);
    if (p.verbrauch) verbrauch = verbrauchDazu(verbrauch, p.verbrauch);
    if (p.pruefung.stimmt) return { ok: true, bild, pruefung: p.pruefung, laeufe: lauf, verbrauch };
    console.warn("[versusforge-anzeige] Text im Bild falsch, Lauf", lauf, p.pruefung.fehler);
    /* Weniger Fehler ist das bessere Bild — auch wenn beide nicht perfekt sind. */
    if (!bestes || p.pruefung.fehler.length < bestes.pruefung.fehler.length) bestes = { bild, pruefung: p.pruefung };
  }

  if (!bestes) return { ok: false, grund: "erzeugung" };
  return { ok: true, bild: bestes.bild, pruefung: bestes.pruefung, laeufe: 2, verbrauch };
}
