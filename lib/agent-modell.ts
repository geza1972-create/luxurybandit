/**
 * DER MODELL-BAUSTEIN FÜR AGENTEN — EINE STELLE FÜR ALLE (08.09.2026).
 *
 * WARUM ES DIESE DATEI GIBT: Davids Gesprächsmaschine
 * (`app/api/david-screening/route.ts`) trägt dieselben vier Dinge seit dem 28.08. in sich —
 * den Aufruf, die JSON-Rettung, den zweiten Anlauf und die Verbrauchszählung. Beim zweiten
 * Agenten (VersusForge) wäre das eine Kopie geworden, und Kopien laufen auseinander: Die
 * Rettung eines abgeschnittenen Berichts wurde in Davids Fassung an einem echten Fehler
 * gelernt — sie noch einmal von Hand zu schreiben, hiesse, sie noch einmal zu lernen.
 *
 * Routen können nicht voneinander importieren, deshalb liegt es hier.
 *
 * NOCH NICHT ERLEDIGT, ABSICHTLICH: `david-screening` benutzt weiterhin seine eigene Kopie.
 * Sie liegt in einem laufenden, bezahlten Weg, und den baue ich nicht um, während daneben
 * etwas Neues entsteht (Hausregel: die laufenden Produkte werden nicht angefasst). Wer David
 * das nächste Mal öffnet, hängt ihn hier an — die Fassungen sind bis dahin gleich.
 */

export type Antwort = Record<string, unknown>;
export type Verbrauch = { hinein: number; heraus: number; aufrufe: number };

export const str = (v: unknown, max = 600) => String(v ?? "").trim().slice(0, max);
export const strListe = (v: unknown, anzahl: number, laenge = 300) =>
  (Array.isArray(v) ? v : []).map(x => str(x, laenge)).filter(Boolean).slice(0, anzahl);

/**
 * EIN ABGESCHNITTENES OBJEKT IST NICHT VERLOREN (Lehre aus Davids erstem vollen Prüflauf,
 * 29.08.2026): Bricht die Antwort mitten im JSON ab, waren früher auch die Abschnitte weg,
 * die vollständig dastanden. Hier werden offene Klammern geschlossen und ein angefangener
 * String beendet — was danach parst, ist gerettet.
 */
export function jsonAus(text: string): Antwort {
  try { return JSON.parse(text) as Antwort; } catch { /* weiter */ }
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]) as Antwort; } catch { /* weiter */ } }

  const start = text.indexOf("{");
  if (start < 0) return {};
  let roh = text.slice(start);
  let inString = false, escaped = false;
  const stapel: string[] = [];
  for (const z of roh) {
    if (escaped) { escaped = false; continue; }
    if (z === "\\") { escaped = true; continue; }
    if (z === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (z === "{" || z === "[") stapel.push(z);
    else if (z === "}" || z === "]") stapel.pop();
  }
  if (inString) roh += '"';
  roh = roh.replace(/,\s*"[^"]*"\s*:?\s*$/, "");
  while (stapel.length) roh += stapel.pop() === "{" ? "}" : "]";
  try { return JSON.parse(roh) as Antwort; } catch { return {}; }
}

export const KLEIN = process.env.OPENAI_VISION_MODEL ?? "gpt-5-mini";
export const GROSS = process.env.OPENAI_RESPONSES_MODEL ?? "gpt-5";

export const verbrauchDazu = (a: Verbrauch | undefined, b: Verbrauch): Verbrauch => ({
  hinein: (a?.hinein ?? 0) + b.hinein,
  heraus: (a?.heraus ?? 0) + b.heraus,
  aufrufe: (a?.aufrufe ?? 0) + b.aufrufe,
});

type Ergebnis =
  | { ok: true; daten: Antwort; verbrauch: Verbrauch }
  | { ok: false; fehler: string; status: number };

/**
 * Ein Aufruf an OpenAI, der gültiges JSON zurückgibt — oder einen ehrlichen Fehler.
 *
 * `denken` steuert die teuerste Grösse: Denk-Token sind der grösste Kostenblock (gemessen
 * 28.08.2026 an David: 26.263 Ausgabe-Token bei fünfzehn Aufrufen, sichtbar davon keine
 * 2.000 Wörter). Für Gespräche „low", für das Ergebnis, das der Kunde behält, „medium".
 *
 * DER ZWEITE ANLAUF ist kein Luxus: Die Responses-API antwortet mit HTTP 200 und leerem
 * Text, wenn das Nachdenken das Budget aufbraucht, bevor etwas Sichtbares entsteht. Genau
 * ein Wiederholungsversuch — zwei wären zwei Rechnungen für ein Ergebnis. Der Verbrauch
 * BEIDER Anläufe wird gezählt, sonst misst man die Kosten zu niedrig.
 */
export async function frageModell(
  apiKey: string,
  modell: string,
  inhalt: Array<Record<string, unknown>>,
  denken: "low" | "medium" = "low",
): Promise<Ergebnis> {
  const reasoning = /^gpt-5/.test(modell) ? { reasoning: { effort: denken } } : {};

  const anlauf = async () => {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modell,
        input: [{ role: "user", content: inhalt }],
        text: { format: { type: "json_object" } },
        ...reasoning,
      }),
    });
    const roh = await res.text();
    let nutz: Record<string, any> | null = null;
    try { nutz = roh ? JSON.parse(roh) : null; } catch { nutz = null; }
    const text =
      nutz?.output_text ??
      nutz?.output?.flatMap((i: any) => i?.content ?? [])?.map((c: any) => c?.text ?? "")?.join("\n") ??
      "";
    return { res, nutz, text: String(text ?? "") };
  };

  let { res, nutz, text } = await anlauf();
  let zusatzHeraus = 0;
  if (res.ok && !text.trim()) {
    const grund = str(nutz?.incomplete_details?.reason, 120) || str(nutz?.status, 40) || "leer";
    console.warn("[agent-modell] leere Antwort, zweiter Anlauf:", modell, grund);
    zusatzHeraus = Number(nutz?.usage?.output_tokens ?? 0) || 0;
    ({ res, nutz, text } = await anlauf());
  }

  const verbrauch: Verbrauch = {
    hinein: Number(nutz?.usage?.input_tokens ?? 0) || 0,
    heraus: (Number(nutz?.usage?.output_tokens ?? 0) || 0) + zusatzHeraus,
    aufrufe: zusatzHeraus ? 2 : 1,
  };

  if (!res.ok) {
    const grund = str(nutz?.error?.message, 200) || `HTTP ${res.status}`;
    console.error("[agent-modell] Aufruf gescheitert:", modell, grund);
    return { ok: false, fehler: grund, status: res.status === 429 ? 429 : 502 };
  }
  if (!text.trim()) return { ok: false, fehler: "Die Antwort kam leer zurück.", status: 502 };

  const daten = jsonAus(text);
  if (!Object.keys(daten).length) return { ok: false, fehler: "Die Antwort war nicht lesbar.", status: 502 };
  return { ok: true, daten, verbrauch };
}
