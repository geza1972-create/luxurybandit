/**
 * DIE VERKAUFSSEITE — ERZEUGUNG FÜR DIE VORFÜHRUNG (Owner 15.09.2026: „was wir machen können
 * ist zeigen wie schnell es geht. Dann muss er mich kontaktieren und ich installiere es für
 * ihn").
 *
 * ── WAS DIESES WERKZEUG IST UND WAS NICHT ───────────────────────────────────────────────────
 *
 * Es ist die WERBUNG, nicht das Produkt. Der Händler tippt sein Produkt ein, lädt ein Foto
 * hoch und sieht in einer Minute seine Verkaufsseite. Dann ruft er an, und die Einrichtung
 * macht ein Mensch — Domain, Impressum, Bestellweg, Hosting.
 *
 * WARUM NICHT AUTOMATISCH AUSLIEFERN: Drei Wege wurden an einem Nachmittag durchgespielt und
 * verworfen, und die Begründungen gehören hierher, damit sie niemand zweimal geht.
 *
 *   · SEITE BEI UNS HOSTEN — dann steht auf seinem Laden ein fremder Betreiber. Damit er
 *     selbst als Verkäufer dasteht, braucht es Firmendaten, eigene Domain, Zertifikat und
 *     einen Auftragsverarbeitungsvertrag, weil die Adressen SEINER Käufer bei uns lägen.
 *   · ZIP ZUM SELBERHOSTEN — löst das alles, aber eine statische Datei kann keine Bestellung
 *     annehmen. Und die meisten kleinen Händler haben noch nie eine Datei hochgeladen.
 *   · ZIP PLUS BESTELL-ENDPUNKT bei uns — technisch sauber, aber wieder mit Datenpflichten,
 *     und der Supportfall „wie lade ich das hoch" bleibt.
 *
 * Die Vorführung hat keinen dieser Nachteile: Es wird nichts verkauft, nichts gehostet, nichts
 * gespeichert ausser der Anfrage. Und sie verkauft besser als jede Erklärung.
 *
 * ── DESHALB ERZEUGT DAS HIER EINE VERKAUFSSEITE, KEINE PRÜFSEITE ────────────────────────────
 *
 * Der Vorgänger fragte nach Sternen und Preisen für Produkte, die es noch nicht gibt. Der
 * Owner hat das am selben Tag verworfen: „niemand testet eine Idee die es nicht gibt". Wer
 * Lager hat, will verkaufen — also Pakete, Preis, Bestellknopf.
 */

import type { Lang } from "@/lib/lang";

/** Was ein Lauf grob kostet: ein Textaufruf und zwei bis drei Bilder. Für das Log. */
export const ERZEUGUNG_CENTS = 60;

export type Paket = {
  label: string;
  note: string;
  menge: number;
  /** Endbetrag in Cent — was der Kunde dem Kurier gibt, Versand inbegriffen. Getrennte
      Versandzeilen sind der häufigste Grund für Streit an der Tür. */
  cents: number;
  altCents?: number;
};

export type SeiteInhalt = {
  brand: string;
  eyebrow: string;
  h1: string;
  lede: string;
  /** Der Satz unter dem Kaufknopf — Lieferzeit, Zahlweg, Rückgabe. */
  micro: string;
  strip: Array<{ k: string; v: string }>;
  bullets: Array<{ t: string; p: string }>;
  steps: Array<{ t: string; p: string }>;
  pakete: Paket[];
  faq: Array<{ q: string; a: string }>;
  disclaimer: string;
  video: {
    negative: string;
    clips: Array<{ t: string; cam: string; p: string }>;
    cuts: Array<{ t: string; x: string }>;
  };
};

export type ErzeugFund =
  | { ok: true; inhalt: SeiteInhalt }
  | { ok: false; grund: string };

/**
 * DER AUFTRAG STEHT IN DER SPRACHE DER SEITE, damit das Modell nicht ins Übersetzen gerät.
 * Die Bildaufträge darin bleiben englisch — dort gibt es nichts zu übersetzen, und
 * Bildmodelle sind auf Englisch zuverlässiger.
 */
function auftragBauen(o: { beschreibung: string; preisText: string; lang: Lang }): string {
  const ro = o.lang === "ro";
  return [
    ro
      ? "Ești un copywriter care scrie pagini de vânzare pentru magazine mici din România."
      : "You write sales pages for small online shops.",
    ro
      ? "Pagina vinde direct: pachete, preț vizibil, plata la livrare."
      : "The page sells directly: packages, visible price, cash on delivery.",
    "",
    ro
      ? "Răspunde DOAR cu un obiect JSON valid, fără explicații și fără blocuri de cod."
      : "Answer ONLY with a valid JSON object, no explanations, no code fences.",
    ro
      ? "Toate textele în limba română, cu diacritice. Ton calm și concret, fără superlative."
      : "All texts in English. Calm, concrete tone, no superlatives.",
    "",
    "Structura exactă:",
    "{",
    '  "brand": "nume de marcă scurt, majuscule, maxim 8 litere",',
    '  "eyebrow": "categoria produsului plus o specificație, maxim 6 cuvinte",',
    '  "h1": "titlu de maxim 9 cuvinte — beneficiul concret, nu sloganul",',
    '  "lede": "două fraze: ce face și pentru cine",',
    '  "micro": "o linie sub buton: livrare, plată, retur",',
    '  "strip": [{"k":"cifră scurtă","v":"ce înseamnă"}, ... exact 3],',
    '  "bullets": [{"t":"titlu scurt","p":"o frază concretă"}, ... exact 4],',
    '  "steps": [{"t":"pasul","p":"o frază"}, ... exact 3],',
    '  "pakete": [{"label":"1 bucată","note":"pentru o lună","menge":1,"cents":0,"altCents":0}, ... exact 3],',
    '  "faq": [{"q":"întrebare","a":"răspuns scurt"}, ... exact 4],',
    '  "disclaimer": "o frază onestă despre limite sau condiții",',
    '  "video": {',
    '    "negative": "prompt negativ în engleză",',
    '    "clips": [{"t":"titlu","cam":"mișcarea camerei","p":"prompt în engleză pentru image-to-video, 2-4 fraze, mișcare mică, fără text, fără oameni"}, ... exact 3],',
    '    "cuts": [{"t":"0–3 s","x":"text pe ecran"}, ... exact 5]',
    "  }",
    "}",
    "",
    "Reguli obligatorii:",
    `· Prețul de bază este ${o.preisText}. Pachetul de 1 bucată costă exact atât, în cenți, în câmpul "cents".`,
    "· Pachetele de 2 și 3 bucăți sunt mai ieftine pe bucată, dar niciodată sub 70% din prețul de bază pe bucată.",
    "· „altCents” este prețul tăiat; lasă-l 0 dacă nu are sens.",
    "· Transportul este inclus în preț. Nu adăuga linii separate de transport.",
    "· O întrebare din FAQ este despre retur: 14 zile, conform legii.",
    "· Fără recenzii inventate și fără nume de clienți.",
    "· Fără afirmații medicale, fără vindecare, fără rezultate garantate, fără „cel mai bun”.",
    "· Dacă produsul este cosmetic sau atinge sănătatea, formulează totul ca îngrijire.",
    "",
    "Produsul, în cuvintele vânzătorului:",
    o.beschreibung.slice(0, 1200),
  ].join("\n");
}

/** Holt das erste JSON-Objekt aus einer Antwort — Modelle packen es gern in ```json. */
function jsonHeraus(roh: string): unknown | null {
  const ohneZaun = roh.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "");
  const start = ohneZaun.indexOf("{");
  const ende = ohneZaun.lastIndexOf("}");
  if (start < 0 || ende <= start) return null;
  try { return JSON.parse(ohneZaun.slice(start, ende + 1)); } catch { return null; }
}

/**
 * STRENG PRÜFEN, WEIL EINE HALBE SEITE SCHLIMMER IST ALS KEINE.
 *
 * Die Vorführung hat genau einen Versuch: Sie ist der Moment, in dem er entscheidet, ob er
 * anruft. Eine Seite mit zwei statt vier Vorteilen sieht kaputt aus — lieber ein zweiter Lauf
 * für zwei Cent als ein verlorener Kunde.
 */
function vollstaendig(x: unknown): x is SeiteInhalt {
  const o = x as Partial<SeiteInhalt> | null;
  if (!o || typeof o !== "object") return false;
  const text = (v: unknown) => typeof v === "string" && v.trim().length > 0;
  const liste = (v: unknown, n: number) => Array.isArray(v) && v.length >= n;
  return (
    text(o.brand) && text(o.h1) && text(o.lede) &&
    liste(o.strip, 3) && liste(o.bullets, 4) && liste(o.steps, 3) &&
    liste(o.pakete, 3) && liste(o.faq, 4) &&
    !!o.video && liste(o.video.clips, 3) && liste(o.video.cuts, 4)
  );
}

/** Preise, die das Modell erfindet, werden hier eingefangen: negativ, null oder absurd hoch
    kommt vor, und ein Preisschild mit 0,00 € macht die ganze Vorführung wertlos. */
function preiseGeraderuecken(inhalt: SeiteInhalt, basisCents: number): SeiteInhalt {
  const pakete = inhalt.pakete.slice(0, 3).map((p, i) => {
    const menge = Math.max(1, Math.min(10, Math.round(Number(p.menge) || i + 1)));
    const roh = Math.round(Number(p.cents) || 0);
    /* Untergrenze 70 % je Stück, Obergrenze der volle Stückpreis — dazwischen darf das
       Modell staffeln, wie es will. */
    const min = Math.round(basisCents * menge * 0.7);
    const max = basisCents * menge;
    const cents = roh >= min && roh <= max ? roh : (menge === 1 ? basisCents : Math.round((min + max) / 2));
    const alt = Math.round(Number(p.altCents) || 0);
    return { ...p, menge, cents, altCents: alt > cents ? alt : undefined };
  });
  return { ...inhalt, pakete };
}

export async function inhaltErzeugen(o: {
  apiKey: string;
  beschreibung: string;
  /** Der Grundpreis für ein Stück, in Cent. Kommt vom Händler, nicht vom Modell. */
  basisCents: number;
  preisText: string;
  lang?: Lang;
}): Promise<ErzeugFund> {
  const beschreibung = String(o.beschreibung ?? "").trim();
  if (beschreibung.length < 12) return { ok: false, grund: "zu-kurz" };
  if (!(o.basisCents > 0)) return { ok: false, grund: "kein-preis" };

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${o.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: auftragBauen({ beschreibung, preisText: o.preisText, lang: o.lang ?? "ro" }) }],
        response_format: { type: "json_object" },
        temperature: 0.8,
      }),
      signal: AbortSignal.timeout(90000),
    });
    const roh = await res.text();
    if (!res.ok) {
      console.error("[pagina] Text gescheitert:", res.status, roh.slice(0, 300));
      return { ok: false, grund: `HTTP ${res.status}` };
    }
    const antwort = JSON.parse(roh) as { choices?: { message?: { content?: string } }[] };
    const inhalt = jsonHeraus(String(antwort.choices?.[0]?.message?.content ?? ""));
    if (!vollstaendig(inhalt)) return { ok: false, grund: "unvollstaendig" };
    return { ok: true, inhalt: preiseGeraderuecken(inhalt, o.basisCents) };
  } catch (fehler) {
    console.error("[pagina] Text-Ausnahme:", fehler);
    return { ok: false, grund: "ausnahme" };
  }
}

export type BildFund = { ok: true; bild: Buffer } | { ok: false; grund: string };

/**
 * EIN PRODUKTBILD — dieselben Verbote wie in `versusforge-motiv.ts`, aus demselben Grund:
 * keine Schrift (Modelle schreiben unaufgefordert Wörter hinein, und erfundene Buchstaben
 * sehen aus wie ein Fehldruck), keine Marken, keine erkennbaren Gesichter.
 *
 * QUADRATISCH, weil die Seite auf dem Telefon gelesen wird; dort verschwendet ein Quadrat am
 * wenigsten Platz.
 */
export async function bildErzeugen(o: { apiKey: string; szene: string }): Promise<BildFund> {
  const szene = String(o.szene ?? "").trim().slice(0, 500);
  if (!szene) return { ok: false, grund: "keine-szene" };

  const auftrag = [
    `Editorial product photograph: ${szene}.`,
    "Real photography, soft natural daylight, shallow depth of field, clean uncluttered setting.",
    "Absolutely no text, no letters, no numbers, no logos, no watermarks, no packaging labels.",
    "No people, no hands, no recognisable faces.",
    "Centred square composition with generous empty space around the subject.",
  ].join(" ");

  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${o.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1",
        prompt: auftrag,
        size: "1024x1024",
        quality: "medium",
        n: 1,
      }),
      signal: AbortSignal.timeout(120000),
    });
    const roh = await res.text();
    if (!res.ok) {
      console.error("[pagina] Bild gescheitert:", res.status, roh.slice(0, 300));
      return { ok: false, grund: `HTTP ${res.status}` };
    }
    const daten = JSON.parse(roh) as { data?: { b64_json?: string }[] };
    const b64 = daten.data?.[0]?.b64_json;
    if (!b64) return { ok: false, grund: "keine-daten" };
    return { ok: true, bild: Buffer.from(b64, "base64") };
  } catch (fehler) {
    console.error("[pagina] Bild-Ausnahme:", fehler);
    return { ok: false, grund: "ausnahme" };
  }
}

/**
 * Die drei Blickwinkel, aus der Beschreibung abgeleitet.
 *
 * FEST UND NICHT VOM MODELL: Diese drei verkaufen jedes Sachprodukt — das Ding in Benutzung,
 * das Ding allein, ein Detail. Das Modell soll den Text erfinden, nicht die Bildregie; drei
 * zufällige Perspektiven wären schlechter als drei bewährte.
 */
export function szenenFuer(beschreibung: string, h1: string): string[] {
  const was = beschreibung.trim().slice(0, 220);
  return [
    `${was} — shown in use, in the everyday setting it belongs to`,
    `${was} — the product alone on a plain neutral surface, three-quarter view`,
    `${was} — a close macro detail of the part that makes it different: ${h1.slice(0, 90)}`,
  ];
}
