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

  // Schutz vor „Identitäts-Vergiftung": Die Beiträge werden auf RUMÄNISCH verfasst.
  // Fragt man GPT „RO→RO", dreht es den bereits rumänischen Text gelegentlich fälschlich
  // ins Englische und cached das DAUERHAFT (Cache wird nie neu übersetzt) → jeder RO-Leser
  // sähe Englisch. Enthält der Text rumänische Diakritika und ist RO das Ziel, ist er schon
  // rumänisch → Original behalten, gar nicht erst die API fragen.
  /* NUR DIAKRITIKA REICHTEN NICHT (25.08.2026, im rumänischen Markt aufgefallen): Ein
     DEUTSCHER Satz mit „Timișoara" trägt ș und î — die Prüfung hielt ihn für Rumänisch und
     liess ihn unübersetzt stehen. Auf der rumänischen Seite stand deshalb mitten in der
     Analyse eine deutsche Zeile. Dasselbe träfe jeden Text mit Brașov, Constanța, Iași.
     Jetzt müssen ZUSÄTZLICH rumänische Funktionswörter vorkommen — die stehen in jedem
     echten Satz und in keinem fremdsprachigen, der nur einen Ortsnamen enthält. */
  const RO_WOERTER = /(^|[^\p{L}])(și|în|este|sunt|pentru|care|tău|ta|nu|cu|se)([^\p{L}]|$)/iu;
  const alreadyTarget = (t: string) =>
    lang === "ro" && /[ăâîșțĂÂÎȘȚ]/.test(t) && RO_WOERTER.test(t);

  const cache = await readTranslationCache();
  const misses: { i: number; text: string; key: string }[] = [];
  texts.forEach((t, i) => {
    if (!t || !t.trim()) { out[i] = t; return; }
    const key = `${lang}::${t}`;
    if (cache[key] != null) { out[i] = cache[key]; return; }
    if (alreadyTarget(t)) { out[i] = t; return; }   // schon in Zielsprache → Original, keine API
    misses.push({ i, text: t, key });
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
            /**
             * IMMER DUZEN (05.08.2026). Englisch kennt nur ein „you", also entscheidet die
             * Maschine die Anrede selbst — und sie entscheidet unterschiedlich: Auf der
             * Gutschein-Seite kam „Laden SIE den Gutschein hoch, den SIE bereits haben"
             * heraus, während die Chat-Seite daneben duzt. Auf derselben Seite zwei Anreden
             * zu haben, liest sich wie zwei verschiedene Firmen.
             *
             * Das Du ist die Hausanrede: Jede handgeschriebene Zeile im Projekt duzt („Schenk
             * ihm eine perfekte KI-Freundin", „Lade ein Foto von dir hoch"), und es passt zu
             * dem, was hier verkauft wird — ein Geschenk an einen Menschen, den man mag.
             *
             * WIRKT NUR AUF NEUE TEXTE. Übersetztes liegt dauerhaft im Zwischenspeicher
             * (`${lang}::${text}`) und wird nie neu geholt — das spart Geld und ist sonst
             * richtig. Wer eine alte Zeile umstellen will, ändert ihren englischen Wortlaut;
             * damit ist es ein neuer Schlüssel und sie geht durch die Maschine.
             */
            content: `Translate each string in this JSON array into ${target}. Keep emojis, names and tone. Always address the reader INFORMALLY (German du/dein, Romanian tu/tău, Spanish tú/tu, French tu/ton, Portuguese tu/teu, Italian tu/tuo) — never the polite form (Sie, dumneavoastră, usted, vous, você formal, Lei). If a string is ALREADY in ${target}, return it EXACTLY unchanged — never translate it into any other language. The output must be in ${target} only. Return ONLY a JSON array of the translated strings, same length and order.\n\n${JSON.stringify(misses.map(m => m.text))}`,
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
