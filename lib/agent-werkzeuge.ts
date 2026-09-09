import { str } from "@/lib/agent-modell";

/**
 * DIE WERKZEUG-SCHLEIFE — aus dem Chat wird ein Agent (Owner 09.09.2026: „bist du in der
 * Lage, einen Agenten daraus zu machen aus dem, was wir gebaut haben?").
 *
 * ── DER UNTERSCHIED IN EINEM SATZ ──────────────────────────────────────────────────────────
 *
 * Ein Chat redet. Ein Agent TUT: Er wählt selbst, welches Werkzeug er braucht, benutzt es,
 * sieht das Ergebnis und redet damit weiter. Bei uns lagen die Werkzeuge längst da — die
 * Website lesen, ein Anzeigenbild bauen, den Trichter anlegen, die Anfragen zählen. Sie waren
 * nur festverdrahtet: Ich schrieb die Reihenfolge vor, nicht das Modell.
 *
 * ── WIE ES TECHNISCH LÄUFT ─────────────────────────────────────────────────────────────────
 *
 * Beim Aufruf gehen `tools` mit. Das Modell antwortet dann entweder mit Text — dann sind wir
 * fertig — oder mit einem `function_call`. Den führen wir aus, hängen `function_call_output`
 * an den Verlauf und rufen erneut. So lange, bis Text kommt oder der Deckel greift.
 *
 * ── ZWEI REGELN, DIE NICHT VERHANDELBAR SIND ───────────────────────────────────────────────
 *
 * 1. KEIN WERKZEUG, DAS GELD AUSGIBT ODER POST VERSCHICKT, OHNE SEIN WORT. Jedes Werkzeug
 *    trägt `frei: true|false`. Was nicht frei ist, wird NICHT ausgeführt — der Agent bekommt
 *    stattdessen die Auskunft, dass er erst fragen muss. Eine falsch verstandene Nachricht
 *    darf kein Guthaben verbrennen und keine Mail an einen Fremden schicken
 *    ([[keine-erzeugung-ohne-zustimmung]], [[kein-token-fuer-abbrecher]]).
 *
 * 2. EIN DECKEL AUF DIE SCHLEIFE. Ohne ihn ruft ein Modell im Zweifel dasselbe Werkzeug
 *    zwanzigmal auf, und jeder Durchgang kostet. Vier Runden reichen für alles, was hier
 *    vorkommt; danach muss es antworten.
 *
 * WARUM EIGENE DATEI: `agent-modell.ts` zwingt jede Antwort in JSON (`json_object`) — für
 * Werkzeugaufrufe ist das die falsche Form. Statt die eine Funktion umzubauen, an der zwölf
 * Produkte hängen, steht die Schleife hier daneben. Wer sie nicht benutzt, merkt nichts.
 */

export type Werkzeug = {
  name: string;
  /** Was es tut — das liest das Modell, und danach entscheidet es. Kurz und konkret. */
  zweck: string;
  /** JSON-Schema der Parameter. */
  felder: Record<string, unknown>;
  pflicht: string[];
  /**
   * Darf es ohne ausdrückliches Ja des Menschen laufen?
   *
   * `true` für alles, was nur liest oder rechnet. `false` für alles, was Geld kostet, etwas
   * anlegt oder Post verschickt.
   */
  frei: boolean;
  lauf: (args: Record<string, unknown>) => Promise<unknown>;
};

export type Schleifenergebnis =
  | { ok: true; text: string; benutzt: string[]; verbrauch: { hinein: number; heraus: number; aufrufe: number } }
  | { ok: false; fehler: string; status: number };

const MAX_RUNDEN = 4;

/**
 * Ein Gespräch mit Werkzeugen.
 *
 * `freigegeben` sind die Namen der Werkzeuge, die dieser eine Zug ausführen darf — sie kommen
 * aus dem, was der Mensch gerade gesagt hat. Alles andere bleibt stehen, auch wenn das Modell
 * es aufrufen will.
 */
export async function agentLauf(o: {
  apiKey: string;
  modell: string;
  /** Der Auftragstext — Rolle, Regeln, Lage. */
  auftrag: string;
  /** Der bisherige Verlauf, schon in der Form der Responses-Schnittstelle. */
  verlauf: Array<Record<string, unknown>>;
  werkzeuge: Werkzeug[];
  freigegeben?: string[];
}): Promise<Schleifenergebnis> {
  const frei = new Set(o.freigegeben ?? []);
  const eingabe: Array<Record<string, unknown>> = [
    { role: "system", content: o.auftrag },
    ...o.verlauf,
  ];
  const benutzt: string[] = [];
  const verbrauch = { hinein: 0, heraus: 0, aufrufe: 0 };

  const tools = o.werkzeuge.map(w => ({
    type: "function",
    name: w.name,
    description: w.zweck,
    parameters: { type: "object", properties: w.felder, required: w.pflicht, additionalProperties: false },
  }));

  for (let runde = 0; runde < MAX_RUNDEN; runde++) {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${o.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: o.modell,
        input: eingabe,
        tools,
        /* In der letzten Runde keine Werkzeuge mehr anbieten — sonst ruft das Modell eines
           auf, dessen Ergebnis nie mehr gelesen wird, und der Mensch bekommt gar nichts. */
        ...(runde === MAX_RUNDEN - 1 ? { tool_choice: "none" } : {}),
        ...(/^gpt-5/.test(o.modell) ? { reasoning: { effort: "low" } } : {}),
      }),
    });

    const roh = await res.text();
    let nutz: Record<string, unknown> | null = null;
    try { nutz = roh ? (JSON.parse(roh) as Record<string, unknown>) : null; } catch { nutz = null; }

    if (!res.ok) {
      const fehler = str((nutz?.error as Record<string, unknown> | undefined)?.message, 200) || `HTTP ${res.status}`;
      console.error("[agent-werkzeuge] Aufruf gescheitert:", o.modell, fehler);
      return { ok: false, fehler, status: res.status === 429 ? 429 : 502 };
    }

    const nutzung = (nutz?.usage ?? {}) as Record<string, number>;
    verbrauch.hinein += Number(nutzung.input_tokens ?? 0) || 0;
    verbrauch.heraus += Number(nutzung.output_tokens ?? 0) || 0;
    verbrauch.aufrufe += 1;

    const ausgabe = (Array.isArray(nutz?.output) ? nutz.output : []) as Array<Record<string, unknown>>;
    const rufe = ausgabe.filter(t => t?.type === "function_call");

    if (!rufe.length) {
      /* Kein Werkzeug mehr — das ist die Antwort an den Menschen. */
      const text = String(
        nutz?.output_text ??
        ausgabe.flatMap(i => (Array.isArray(i?.content) ? i.content : []) as Array<Record<string, unknown>>)
          .map(c => String(c?.text ?? "")).join("\n"),
      ).trim();
      if (!text) return { ok: false, fehler: "Die Antwort kam leer zurück.", status: 502 };
      return { ok: true, text, benutzt, verbrauch };
    }

    /* Die Aufrufe des Modells gehören unverändert in den Verlauf — sonst weiss es beim
       nächsten Zug nicht mehr, dass es gefragt hat. */
    for (const r of rufe) eingabe.push(r);

    for (const r of rufe) {
      const name = String(r.name ?? "");
      const w = o.werkzeuge.find(x => x.name === name);
      let ergebnis: unknown;

      if (!w) {
        ergebnis = { fehler: "Dieses Werkzeug gibt es nicht." };
      } else if (!w.frei && !frei.has(name)) {
        /**
         * DIE SPERRE IST EINE AUSKUNFT, KEIN ABBRUCH. Der Agent erfährt, dass er erst fragen
         * muss, und kann das im nächsten Satz tun — statt dass die Nachricht stumm scheitert
         * und der Mensch vor einer Antwort steht, die nichts erklärt.
         */
        ergebnis = { fehler: "Dafür brauchst du sein ausdrückliches Ja. Frag ihn im Gespräch, ob du es tun sollst, und ruf es erst auf, wenn er zugestimmt hat." };
      } else {
        try {
          const args = JSON.parse(String(r.arguments ?? "{}")) as Record<string, unknown>;
          ergebnis = await w.lauf(args);
          benutzt.push(name);
        } catch (e) {
          console.error("[agent-werkzeuge] Werkzeug gescheitert:", name, e);
          /* Ein kaputtes Werkzeug ist kein Grund, das Gespräch abzubrechen: Der Agent
             bekommt den Fehler und arbeitet ohne dieses Ergebnis weiter. */
          ergebnis = { fehler: "Das hat gerade nicht geklappt." };
        }
      }

      eingabe.push({
        type: "function_call_output",
        call_id: r.call_id,
        output: JSON.stringify(ergebnis).slice(0, 8000),
      });
    }
  }

  return { ok: false, fehler: "Der Agent ist nicht fertig geworden.", status: 502 };
}
