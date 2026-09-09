/**
 * DIE PORTALE, GEGEN DIE VERSUSFORGE ANTRITT — je Markt (Owner 08.09.2026: „Kein OLX, kein
 * Publi24 … in diesem Fall die Konkurrenz in Rumänien, das generierst du auch").
 *
 * WARUM EINE EIGENE DATEI und nicht in `versusforge-texte.ts` (08.09.2026, am Build-Fehler
 * gelernt): Die Textdatei zieht über `textbausteineInSprache` den Übersetzer nach, der
 * wiederum den Speicher und darüber `sharp` — reiner Serverkram. Sobald ein Client-Baustein
 * von dort auch nur EINEN Wert importiert, landet die ganze Kette im Browser-Bündel, und der
 * Bau bricht mit „Can't resolve 'child_process'" ab. Ein `import type` wäre harmlos gewesen,
 * ein Wert ist es nie.
 *
 * MERKSATZ: Was ein „use client"-Baustein braucht, gehört in eine Datei, die nichts vom
 * Server kennt.
 *
 * FEST HINTERLEGT, NIE VOM MODELL: Ein Modell erfindet Portalnamen, die es im Land nicht
 * gibt — und ein falscher Name macht aus dem stärksten Satz der Seite den peinlichsten.
 * Lieber zwei richtige als fünf erfundene.
 *
 * NUR NENNEN, NIE BEWERTEN: „Kein OLX" ist eine Abgrenzung, keine Behauptung über OLX. Der
 * Owner hat die Nennung ausdrücklich gewollt; der Einwand (vergleichende Werbung, sonst
 * Hausregel „kein Produkt beim Namen nennen") wurde vorgebracht und von ihm entschieden.
 */
/**
 * JE MARKT **UND** JE LAGE (Owner 08.09.2026: „das soll eigentlich gar nicht hier erscheinen,
 * weil das dynamisch ist. Es kommt drauf an, was du willst").
 *
 * Vorher stand eine feste Zeile auf der Startseite — „Ohne OLX. Ohne Publi24." — und die war
 * für jemanden, der Pflegekräfte sucht, schlicht das falsche Portal. Die Namen stehen jetzt
 * NICHT mehr auf der Startseite, sondern gehen an den Agenten: Der weiss nach dem ersten Satz,
 * worum es geht, und kann das richtige nennen.
 *
 * WEITERHIN FEST HINTERLEGT, NIE VOM MODELL: Ein erfundener Portalname macht aus dem
 * stärksten Satz den peinlichsten. Das Modell wählt aus dieser Liste, es erfindet nichts.
 */
export type Lage = "leads" | "verkauf" | "person";

export const PORTALE: Record<string, Record<Lage, string[]>> = {
  ro: { leads: ["eJobs", "BestJobs"], verkauf: ["OLX", "Publi24"], person: ["LinkedIn", "eJobs"] },
  de: { leads: ["Indeed", "StepStone"], verkauf: ["Kleinanzeigen"], person: ["LinkedIn", "Xing"] },
  en: { leads: ["Indeed"], verkauf: ["eBay"], person: ["LinkedIn"] },
  es: { leads: ["InfoJobs"], verkauf: ["Milanuncios"], person: ["LinkedIn"] },
  fr: { leads: ["Indeed"], verkauf: ["leboncoin"], person: ["LinkedIn"] },
  it: { leads: ["Indeed"], verkauf: ["Subito"], person: ["LinkedIn"] },
  pt: { leads: ["Indeed"], verkauf: ["OLX"], person: ["LinkedIn"] },
};

export const portaleFuer = (lang: string, lage: Lage = "leads") =>
  (PORTALE[(lang || "de").slice(0, 2)] ?? PORTALE.de)[lage];

export const OHNE: Record<string, string> = {
  de: "Ohne", ro: "Fără", en: "No", es: "Sin", fr: "Sans", it: "Senza", pt: "Sem",
};

export const ohneFuer = (lang: string) => OHNE[(lang || "de").slice(0, 2)] ?? OHNE.de;
