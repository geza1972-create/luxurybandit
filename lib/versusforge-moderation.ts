import { frageModell, KLEIN } from "@/lib/agent-modell";

/**
 * JEDES BILD WIRD GEPRÜFT, BEVOR ES ANGENOMMEN WIRD (Owner 10.09.2026: „Wir müssen schauen, dass
 * OpenAI Kunst nicht sperrt. Und auch sperrt. Ich will natürlich nicht, dass Leute hier Pornobilder
 * hochladen. Ich werde sie freigeben müssen." · „markierte").
 *
 * ── DREI URTEILE ──────────────────────────────────────────────────────────────────────────
 *
 *  · frei      — nichts markiert. Geht durch.
 *  · markiert  — sexuell, Gewalt oder Selbstverletzung. Geht NICHT online, sondern zum Owner.
 *  · verboten  — Verdacht auf Minderjährige. Wird nicht gespeichert und nicht weitergeleitet.
 *
 * GETESTET AM 10.09.2026: Gemalte Akte (Modigliani, Tizian, Manet) sind nicht markiert
 * (sexual 0,10–0,24), ein Aktfoto von Araki schon (0,97). Kunst wird also nicht gesperrt.
 *
 * ── WAS DIE MODERATION BEI BILDERN NICHT KANN ────────────────────────────────────────────
 *
 * Laut ihrer eigenen Antwort (`category_applied_input_types`, geprüft am 10.09.2026) wendet sie
 * „sexual/minors" bei Bildern NICHT an — nur bei Text. Ein solches Bild käme nur als „sexual"
 * zurück und landete beim Owner zur Freigabe. Genau das darf nicht passieren.
 *
 * DESHALB EINE ZWEITE FRAGE, NUR BEI „SEXUAL": Das Bildmodell beantwortet genau eine Frage — wirkt
 * eine abgebildete Person minderjährig? Alles ausser einem klaren „nein" ist verboten, auch
 * „unsicher" und auch keine Antwort. Das ist eine Einschätzung, keine Gewissheit; sie fängt die
 * meisten Fälle, nicht garantiert alle (ROADMAP-ART.md, Teil 5: rechtliche Klärung vor dem Start).
 *
 * WENN DIE PRÜFUNG NICHT ERREICHBAR IST: „markiert". Ein Bild, das niemand geprüft hat, geht nie
 * von selbst online.
 */

export type Pruefurteil = {
  urteil: "frei" | "markiert" | "verboten";
  /** Die markierten Kategorien — für die Mail an den Owner und das Protokoll, nie für den Künstler. */
  gruende: string[];
  /**
   * Verboten, WEIL es Aktfotografie ist (Variante B). Nur dieser Grund darf dem Künstler genannt
   * werden — mit dem Weg, der offen bleibt (gemalte und gezeichnete Akte). Jeder andere Grund,
   * vor allem der Verdacht auf Minderjährige, bleibt ungenannt.
   */
  aktfoto?: boolean;
};

/** Wo ein angenommenes Motiv liegt — dieselbe Ablage wie in `app/api/versusforge-bild/route.ts`. */
export const motivPfad = (mandant: string, nr: string) =>
  `versusforge-motiv/${mandant}/${nr === "" || nr === "-1" ? "standard" : nr}.jpg`;

/** Wo ein markiertes Motiv bis zur Entscheidung des Owners liegt — nie öffentlich ausgeliefert. */
export const pruefPfad = (mandant: string, nr: string) =>
  `versusforge-motiv-pruefung/${mandant}/${nr === "" || nr === "-1" ? "standard" : nr}.jpg`;

type ModerationsErgebnis = { flagged?: boolean; categories?: Record<string, boolean> };

/**
 * ── IST DAS ÜBERHAUPT EIN KUNSTWERK? (Owner 14.09.2026: „Achtung, ich sehe, dass Leute versucht
 * haben Bullshit hochzuladen und wir haben hier Analysen gemacht") ──────────────────────────
 *
 * Hochgeladen wurde unter anderem ein Mitgliedschafts-Zertifikat einer Künstlervereinigung —
 * und wir haben eine gpt-5-Analyse darauf bezahlt. Dieselbe Sorte fand sich in der Galerie:
 * Screenshots, Textbilder, Logos.
 *
 * DIESE PRÜFUNG IST DIE BILLIGE VORSTUFE: ein Aufruf auf dem kleinen Modell mit `detail: "low"`,
 * ein Bruchteil dessen, was die eigentliche Analyse kostet. Sie läuft VOR ihr und spart sie.
 *
 * ── IM ZWEIFEL DURCHLASSEN ──────────────────────────────────────────────────────────────────
 *
 * Die Fehlerrichtung ist bewusst gewählt: Ein durchgelassenes Zertifikat kostet ein paar Cent,
 * ein abgewiesenes echtes Werk kostet einen Künstler. Deshalb gilt alles als Kunst, was auch nur
 * plausibel Kunst sein könnte — abgewiesen wird nur, was eindeutig etwas anderes ist. Fällt die
 * Prüfung aus, gilt das Bild ebenfalls als Kunst.
 */
export async function kunstPruefen(o: { apiKey: string; bild: string }): Promise<{ kunst: boolean; was: string }> {
  const r = await frageModell(o.apiKey, KLEIN, [
    {
      type: "input_text",
      text: [
        "You are the intake check of an art platform. A person uploads what they claim is their own artwork.",
        "",
        'Decide: is this image primarily an ARTWORK — a painting, drawing, sketch, print, collage, sculpture,',
        'ceramic, textile art, or an artistic photograph?',
        "",
        "It is NOT an artwork when the image is primarily:",
        "a certificate, diploma or award document · a screenshot of a website, chat or app · a document,",
        "invoice or form · a logo, flyer, poster or advertisement · a meme or text image · a product photo",
        "of a non-art item · a selfie or ordinary snapshot of people · a blank, black or unreadable image.",
        "",
        "IMPORTANT — when in doubt, answer true. A photo OF an artwork (hanging on a wall, held in hands,",
        "photographed on an easel, with a frame, slightly tilted or badly lit) IS an artwork. Unfinished work,",
        "children's drawings and amateur painting ARE artworks.",
        "",
        'Answer ONLY as JSON: {"kunst":true|false,"was":"<2-4 words, what the image actually shows>"}',
      ].join("\n"),
    },
    { type: "input_image", image_url: o.bild, detail: "low" },
  ], "low");

  if (!r.ok) return { kunst: true, was: "Prüfung nicht erreichbar" };
  const d = (r.daten ?? {}) as { kunst?: unknown; was?: unknown };
  /* Nur ein ausdrückliches `false` weist ab — alles andere (fehlend, unlesbar) gilt als Kunst. */
  return { kunst: d.kunst !== false, was: String(d.was ?? "").slice(0, 60) };
}

export async function bildPruefen(o: { apiKey: string; bild: string }): Promise<Pruefurteil> {
  let ergebnis: ModerationsErgebnis | null = null;
  try {
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: { Authorization: `Bearer ${o.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "omni-moderation-latest", input: [{ type: "image_url", image_url: { url: o.bild } }] }),
      signal: AbortSignal.timeout(20000),
    });
    if (res.ok) ergebnis = ((await res.json()) as { results?: ModerationsErgebnis[] })?.results?.[0] ?? null;
    else console.error("[versusforge-moderation] Prüfung gescheitert:", res.status);
  } catch (e) {
    console.error("[versusforge-moderation] Prüfung nicht erreichbar", e);
  }
  if (!ergebnis) return { urteil: "markiert", gruende: ["Prüfung nicht erreichbar"] };

  const markiert = Object.entries(ergebnis.categories ?? {}).filter(([, v]) => v === true).map(([k]) => k);
  if (!ergebnis.flagged && !markiert.length) return { urteil: "frei", gruende: [] };
  if (markiert.includes("sexual/minors")) return { urteil: "verboten", gruende: markiert };

  /**
   * ── ZUM START KEINE AKTFOTOGRAFIE (Owner 10.09.2026, Variante B) ─────────────────────────
   *
   * Getestet am Araki-Aktfoto: Die Altersfrage antwortete beim selben Bild mal „nein", mal
   * „unsicher" — ein Münzwurf. Deshalb nimmt die Plattform Akte zum Start nur als Malerei oder
   * Zeichnung an. Ein als „sexual" markiertes FOTO ist verboten, ohne Altersfrage; markierte
   * Malerei und Zeichnung beantworten die strenge Altersfrage. Beides in EINEM Aufruf.
   */
  if (markiert.some(k => k.startsWith("sexual"))) {
    const r = await frageModell(o.apiKey, KLEIN, [
      {
        type: "input_text",
        text: 'Content safety check for an art platform. Answer two things. 1) "art": is this image a photograph (including polaroids and digital photos) or a painting/drawing/print/other handmade artwork? Use "foto" or "gemalt"; if unclear use "foto". 2) "minderjaehrig": look only at the people depicted — does any depicted person appear to be under 18 years old? If there is any doubt, answer "unsicher". Answer ONLY as JSON: {"art":"foto"|"gemalt","minderjaehrig":"nein"|"ja"|"unsicher"}',
      },
      { type: "input_image", image_url: o.bild, detail: "low" },
    ], "low");
    const art = r.ok ? String(r.daten.art ?? "").trim().toLowerCase() : "";
    const alter = r.ok ? String(r.daten.minderjaehrig ?? "").trim().toLowerCase() : "";
    /* `aktfoto` nur bei einer klaren Antwort „foto" — ohne Antwort wird abgelehnt, aber kein Grund
       behauptet, den das Modell nicht genannt hat. */
    if (art !== "gemalt") return { urteil: "verboten", gruende: [...markiert, `Aktfotografie (${art || "keine Antwort"})`], aktfoto: art === "foto" };
    if (alter !== "nein") return { urteil: "verboten", gruende: [...markiert, `minderjährig: ${alter || "keine Antwort"}`] };
  }
  return { urteil: "markiert", gruende: markiert };
}
