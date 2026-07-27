import { translateMany } from "@/lib/translate";

/**
 * Ein ganzes Text-Objekt einer Landing übersetzen — in EINEM Aufruf, mit dem bestehenden
 * Dauer-Cache. Beim ersten Besuch in einer Sprache kostet es einen API-Aufruf, danach nichts.
 *
 * Bewusst so herum (englische Quelle im Code, Übersetzung zur Laufzeit) statt acht
 * handgepflegter Tabellen pro Seite: Sonst altert jede Textänderung sofort in sieben
 * Sprachen, und niemand pflegt das nach.
 *
 * Fällt die Übersetzung aus, kommt der englische Originaltext zurück — nie ein leeres Feld.
 */
export async function trObject<T extends Record<string, string>>(obj: T, lang: string): Promise<T> {
  if (!lang || lang === "en") return obj;
  const keys = Object.keys(obj) as (keyof T)[];
  const values = keys.map(k => String(obj[k] ?? ""));
  try {
    const out = await translateMany(values, lang);
    const res = {} as T;
    keys.forEach((k, i) => { (res as Record<string, string>)[k as string] = out[i] || values[i]; });
    return res;
  } catch {
    return obj;
  }
}
