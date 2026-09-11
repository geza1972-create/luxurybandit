import { readTranslationCache, writeTranslationCache } from "./try-this-look-store";

// Auto-Übersetzung mit dauerhaftem Cache. Jeder Text wird EINMAL pro Sprache übersetzt
// (OpenAI) und dann aus dem Cache geliefert — ab dem 2. Aufruf praktisch kostenlos.
// Bewusst best-effort: bei jedem Fehler kommt der Originaltext zurück (nie ein leerer Text).

const LANG_NAME: Record<string, string> = { ro: "Romanian", de: "German", en: "English", es: "Spanish", fr: "French", pt: "Portuguese", pl: "Polish", it: "Italian" };

/**
 * ── PLATZHALTER BEHALTEN IHREN NAMEN (10.09.2026) ────────────────────────────────────────────
 *
 * Auf der rumänischen Seite stand „primele {libere} cereri": Das Modell hatte den Platzhalter
 * `{frei}` mitübersetzt, der Code suchte weiter nach `{frei}`, und statt der Zahl 5 stand der
 * Platzhalter auf der Seite. Eine Durchsicht des Zwischenspeichers fand danach ZEHN solcher
 * Einträge in allen Produkten — `{preis}` → `{price}`, `{analyse}` → `{analysis}`,
 * `{rolle}` → `{role}`. Jeder davon zeigt auf einer englischen Seite einen Platzhalter statt
 * eines Preises oder Namens ([[uebersetzer-fallen]]).
 *
 * DIE ANWEISUNG AN DAS MODELL REICHT NICHT, deshalb diese Funktion: Ein Modell hält „nicht
 * übersetzen" meistens, aber nicht immer — und der Speicher wird nie neu übersetzt. Ein
 * einmal kaputter Eintrag bliebe für immer kaputt.
 *
 * WIE ZURÜCKGESETZT WIRD:
 *   · Stimmt die Anzahl der Platzhalter nicht, wird nichts angefasst — dann ist unklar, was
 *     wohin gehört, und raten wäre schlimmer als lassen.
 *   · Ein Platzhalter, der schon wörtlich stimmt, bleibt, wo er ist — auch wenn die Sprache
 *     die Reihenfolge umgestellt hat.
 *   · Die übrigen werden der Reihe nach mit den übrigen Originalnamen belegt.
 *
 * GRENZE, EHRLICH BENANNT: Werden ZWEI Platzhalter übersetzt UND vertauscht, kann die
 * Reihenfolge-Zuordnung sie verwechseln. In den zehn gefundenen Fällen kam das nicht vor.
 */
export function platzhalterZurueck(quelle: string, uebersetzt: string): string {
  const MUSTER = /\{[^{}]*\}/g;
  const soll: string[] = quelle.match(MUSTER) ?? [];
  if (!soll.length) return uebersetzt;
  const ist: string[] = uebersetzt.match(MUSTER) ?? [];
  if (ist.length !== soll.length) return uebersetzt;
  const offen = soll.filter(n => !ist.includes(n));
  let k = 0;
  return uebersetzt.replace(MUSTER, t => (soll.includes(t) ? t : (offen[k++] ?? t)));
}

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
  /* Wurde beim Lesen ein kaputter Platzhalter geheilt, wird der Speicher am Ende einmal
     korrigiert zurückgeschrieben — dann ist der Eintrag auch für den nächsten Leser richtig. */
  let geheilt = false;
  texts.forEach((t, i) => {
    if (!t || !t.trim()) { out[i] = t; return; }
    const key = `${lang}::${t}`;
    if (cache[key] != null) {
      const richtig = platzhalterZurueck(t, cache[key]);
      if (richtig !== cache[key]) { cache[key] = richtig; geheilt = true; }
      out[i] = richtig;
      return;
    }
    if (alreadyTarget(t)) { out[i] = t; return; }   // schon in Zielsprache → Original, keine API
    misses.push({ i, text: t, key });
  });

  /**
   * NICHT AUF DIE REIHENFOLGE VERLASSEN — MIT SCHLÜSSELN ÜBERSETZEN (07.09.2026, an Davids
   * Karte gefunden und gemessen).
   *
   * Vorher ging ALLES in EINEM Aufruf raus, als JSON-ARRAY, und die Antwort wurde nur
   * übernommen, wenn die Länge exakt stimmte (`arr.length === misses.length`). Gemessen:
   * 40 Zeilen hingeschickt, 38 zurückbekommen — bei `finish_reason: "stop"`, also KEINE
   * Abschneidung. Das Modell lässt bei längeren Listen still Einträge weg. Damit schlug die
   * Prüfung fehl, ALLES wurde verworfen, und ganze Seiten blieben lautlos auf Deutsch: Bei
   * David war der Trichter englisch und Annas Karte deutsch, ohne eine Fehlermeldung.
   *
   * Jetzt geht ein JSON-OBJEKT mit Nummern als Schlüsseln raus und wird über die Schlüssel
   * zurückgelesen. Fehlt ein Eintrag, bleibt NUR diese eine Zeile im Original — der Rest
   * ist trotzdem übersetzt und wird gespeichert. Zusätzlich in Häppchen, damit die Antwort
   * kurz genug bleibt.
   *
   * Der Zwischenspeicher wird EINMAL am Ende geschrieben (Hausregel
   * [[delete-resurrection-merge-bug]]: zwei Schreibvorgänge nacheinander verlieren einander).
   */
  const STUECK = 30;

  let etwasNeu = false;
  if (misses.length && process.env.OPENAI_API_KEY) {

    for (let von = 0; von < misses.length; von += STUECK) {
      const teil = misses.slice(von, von + STUECK);
      const hinein: Record<string, string> = {};
      teil.forEach((m, k) => { hinein[String(k)] = m.text; });

      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "gpt-4o-mini", temperature: 0,
            response_format: { type: "json_object" },
            messages: [{
              role: "user",
              content: `Translate every VALUE of this JSON object into ${target}. Keep emojis, names and tone. Always address the reader INFORMALLY (German du/dein, Romanian tu/tău, Spanish tú/tu, French tu/ton, Portuguese tu/teu, Italian tu/tuo) — never the polite form (Sie, dumneavoastră, usted, vous, você formal, Lei). If a value is ALREADY in ${target}, return it EXACTLY unchanged — never translate it into any other language. Never translate file paths, URLs or filenames — return those unchanged. Never translate or rename anything inside curly braces such as {name}, {price} or {n} — copy those placeholders character for character. The output must be in ${target} only. Return ONLY a JSON object with the SAME KEYS and the translated values — every key must be present.\n\n${JSON.stringify(hinein)}`,
            }],
          }),
        });
        const p = await res.json();
        const txt = String(p?.choices?.[0]?.message?.content ?? "").replace(/^```json\s*|\s*```$/g, "").trim();
        const obj = JSON.parse(txt) as Record<string, unknown>;
        if (obj && typeof obj === "object" && !Array.isArray(obj)) {
          teil.forEach((m, k) => {
            const v = obj[String(k)];
            if (typeof v === "string" && v.trim()) {
              const richtig = platzhalterZurueck(m.text, v);
              out[m.i] = richtig; cache[m.key] = richtig; etwasNeu = true;
            }
          });
        }
      } catch { /* Nur dieses Häppchen bleibt im Original */ }
    }

  }

  /* EIN Schreibvorgang am Ende, für Neues UND Geheiltes (Hausregel
     [[delete-resurrection-merge-bug]]: zwei Schreibvorgänge nacheinander verlieren einander). */
  if (etwasNeu || geheilt) await writeTranslationCache(cache);

  return out;
}
