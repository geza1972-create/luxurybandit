import { readTranslationCache, writeTranslationCache } from "./try-this-look-store";

// Auto-Übersetzung mit dauerhaftem Cache. Jeder Text wird EINMAL pro Sprache übersetzt
// (OpenAI) und dann aus dem Cache geliefert — ab dem 2. Aufruf praktisch kostenlos.
// Bewusst best-effort: bei jedem Fehler kommt der Originaltext zurück (nie ein leerer Text).

const LANG_NAME: Record<string, string> = { ro: "Romanian", de: "German", en: "English", es: "Spanish", fr: "French", pt: "Portuguese", pl: "Polish", it: "Italian" };

// Übersetzt mehrere Texte in EINEM Rutsch in die Zielsprache. Reihenfolge bleibt erhalten.
export async function translateMany(texts: string[], lang: string): Promise<string[]> {
  const target = LANG_NAME[lang];
  const out = [...texts];
  if (!target) return out;                                  // Sprache nicht unterstützt → Original
  if (!texts.some(t => t && t.trim())) return out;          // nichts zu tun

  const cache = await readTranslationCache();
  const misses: { i: number; text: string; key: string }[] = [];
  texts.forEach((t, i) => {
    if (!t || !t.trim()) { out[i] = t; return; }
    const key = `${lang}::${t}`;
    if (cache[key] != null) out[i] = cache[key];
    else misses.push({ i, text: t, key });
  });

  if (misses.length && process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini", temperature: 0,
          messages: [{
            role: "user",
            content: `Translate each string in this JSON array into ${target}. Keep emojis, names and tone. If a string is already in ${target}, return it unchanged. Return ONLY a JSON array of the translated strings, same length and order.\n\n${JSON.stringify(misses.map(m => m.text))}`,
          }],
        }),
      });
      const p = await res.json();
      const txt = String(p?.choices?.[0]?.message?.content ?? "").replace(/^```json\s*|\s*```$/g, "").trim();
      const arr = JSON.parse(txt);
      if (Array.isArray(arr) && arr.length === misses.length) {
        misses.forEach((m, k) => { const v = String(arr[k] ?? m.text); out[m.i] = v; cache[m.key] = v; });
        await writeTranslationCache(cache);
      }
    } catch { /* Original bleibt stehen */ }
  }
  return out;
}
