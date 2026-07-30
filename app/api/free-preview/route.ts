import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { claimFreePreview, readThemeConfig, getSignedUrl } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * DAS GRATIS-VORSCHAUBILD (Owner 29.07.2026).
 *
 * „Die Leute wollen was generieren, und wenn es klappt dann zahlen sie." — „Ich habe auch nie
 * gekauft bevor ich nicht etwas generiert habe. Ohne Gratis-Test kaufe ich nichts."
 *
 * WARUM ES DAS GIBT: Der Trichter zeigte eine gespielte Render-Show und danach ein
 * VERPIXELTES Bild. Der Besucher hat nie erlebt, dass es mit SEINEM Gesicht funktioniert — er
 * sollte für ein Versprechen zahlen. Ergebnis: 8 Durchläufe, 0 Zahlungen.
 *
 * Hier bekommt er ein ECHTES, scharfes Bild von sich und ihr. Die Kasse steht danach, vor dem
 * VIDEO. Er zahlt dann für die Steigerung von etwas, das er schon in der Hand hält.
 *
 * WARUM OPENAI UND NICHT FASHN (Owner): FASHN ist für Lingerie und teuer. Die Vorschau läuft
 * über gpt-image-1 in der Stufe „low" — nur so ist Verschenken tragbar. Ein Video kostet rund
 * das Zwanzigfache und bleibt deshalb hinter der Kasse.
 *
 * Deckelung steckt in `claimFreePreview` (serverseitig, siehe dort).
 */

// Wortgleich aus /api/generate-openai-tryon übernommen. OHNE diese Zusage antwortet OpenAI
// mit safety_violations=[sexual] und es kommt gar kein Bild — im Projekt mehrfach passiert.
const COVERAGE_RULE =
  "Strict coverage requirement: the output MUST depict both people fully and modestly dressed in complete outfits, REGARDLESS of how much skin is visible in the input photos. The clothing must fully cover the chest, cleavage, torso, shoulders and hips with opaque fabric. This is a tasteful editorial photograph of clothed people. Absolutely NO swimwear, bikini, lingerie, underwear, nudity, or exposed intimate areas (chest, cleavage, groin, buttocks). If an input shows swimwear or bare skin, replace it entirely with full, elegant clothing.";

function dataUrlToBlob(dataUrl: string): Blob | null {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl.trim());
  if (!m) return null;
  try { return new Blob([Buffer.from(m[2], "base64")], { type: m[1] }); } catch { return null; }
}

export async function POST(request: Request) {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: "Not configured." }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as {
    person?: string; model?: string; device?: string; theme?: string; prompt?: string; surprise?: boolean;
  };
  const person = String(body.person ?? "");
  const device = String(body.device ?? "").trim().slice(0, 80);
  const theme = String(body.theme ?? "kiss").replace(/[^a-z]/gi, "").toLowerCase();
  let model = String(body.model ?? "");

  /**
   * ÜBERRASCHUNG STATT AUSWAHL (Owner 30.07.2026: „kann sich gratis nichts aussuchen, sondern
   * gratis bekommt er surprise, aber 1x kann er generieren").
   *
   * Gratis heißt: er lädt sein Foto hoch und drückt EINMAL. Wen er küsst und wo, entscheidet
   * der Server. Wählen darf, wer zahlt — das ist der Unterschied, für den er bezahlt.
   *
   * Zweiter, ebenso wichtiger Grund: SICHERHEIT. Käme die Vorlage vom Besucher, könnte jeder
   * ein beliebiges Bild schicken. So kommen nur die vom Admin gepflegten, ANGEZOGENEN Fotos
   * infrage.
   */
  const SZENEN = [
    "at golden hour on a Mediterranean terrace above the sea",
    "on a quiet beach at sunset, warm light",
    "in a sunlit old town street with flowers on the walls",
    "on a wooden pier over turquoise water, late afternoon",
  ];
  let kandidaten: string[] = [];
  let szene = "";
  if (body.surprise) {
    const cfg = await readThemeConfig(theme).catch(() => ({ modelIds: [] as string[], previewRefPaths: [] as string[] }));
    const pfade = (cfg.previewRefPaths ?? []).filter(Boolean);
    if (!pfade.length) return NextResponse.json({ error: "Gerade nicht verfügbar." }, { status: 503 });
    // Reihenfolge zufällig: jeder bekommt ein anderes Gesicht — und wird eines von der
    // Bildmoderation abgelehnt, rückt das nächste nach (Schleife unten).
    pfade.sort(() => Math.random() - 0.5);
    kandidaten = pfade.slice(0, 3);
    szene = SZENEN[Math.floor(Math.random() * SZENEN.length)];
  }

  if (!person.startsWith("data:") || (!body.surprise && !model.startsWith("data:"))) {
    return NextResponse.json({ error: "Bitte lade zuerst dein Foto hoch." }, { status: 400 });
  }

  // Admins ohne Deckel — sonst kannst du nicht testen, ohne das Tageskontingent zu essen.
  const staff = await isAdminRequest(request).catch(() => false);
  if (!staff) {
    if (!device) return NextResponse.json({ error: "Kein Gerät erkannt." }, { status: 400 });
    const claim = await claimFreePreview(device);
    if (!claim.ok) {
      return NextResponse.json({
        error: claim.reason === "day"
          ? "Heute sind alle Gratis-Vorschauen aufgebraucht — morgen wieder."
          : "Du hast deine Gratis-Vorschau heute schon genutzt.",
        limit: claim.reason,
      }, { status: 429 });
    }
  }

  // EIGENER PROMPT (Owner 29.07.2026): Im Prüfstand schreibt der Owner ihn selbst — er hat
  // in ChatGPT gezeigt, dass ein einziger Satz besser trifft als meine Anweisungsliste.
  // Die Bedeckungs-Zusage wird trotzdem angehängt: OHNE sie antwortet OpenAI mit
  // safety_violations=[sexual], nachgewiesen am 29.07.2026.
  const eigener = String(body.prompt ?? "").trim().slice(0, 2000);
  const prompt = eigener
    ? `${eigener}\n\n${COVERAGE_RULE}`
    : [
    "Image 1 is a photo of a real person. Image 2 is a photo of another person.",
    body.surprise
      ? "Generate ONE photorealistic image showing BOTH people together in the same scene, close together, sharing a warm kiss."
      : "Generate ONE photorealistic image showing BOTH people together in the same scene, standing side by side and smiling at each other.",
    szene
      ? `Setting: ${szene}.`
      : theme === "holiday" || theme === "bella"
        ? "Setting: a sunny seaside terrace with the ocean behind them, warm natural daylight."
        : "Setting: a warm, softly lit evening scene with gentle glowing lights behind them.",
    "Preserve BOTH faces, hairstyles and skin tones exactly as in the reference photos — it must clearly be the same two people. An input photo may show only a face or head-and-shoulders; if so, extend it naturally into a full figure that matches their apparent age and build.",
    "Show them from the knees up, both fully in frame. Natural, realistic result. No text, logos, badges or overlays.",
    COVERAGE_RULE,
  ].join("\n\n");

  // MEHRERE ANLÄUFE, wenn die Bildmoderation eine Vorlage ablehnt.
  //
  // Am 30.07.2026 gemessen: dasselbe Motiv, zwei Vorlagen — das Foto im Kleid kam durch, das
  // im Spitzenoberteil wurde ZWEIMAL abgewiesen, auch bei völlig harmlosem Satz. Die Prüfung
  // greift also am EINGANGSBILD, nicht am Text. Für den Besucher darf das kein Fehler sein:
  // wird eine Vorlage abgelehnt, nehmen wir stillschweigend die nächste.
  const versuche = kandidaten.length ? kandidaten : [""];
  let letzterFehler = "Bild fehlgeschlagen.";

  for (const pfad of versuche) {
    try {
      if (pfad) {
        const url = await getSignedUrl(pfad, 600).catch(() => "");
        if (!url) continue;
        const r = await fetch(url);
        if (!r.ok) continue;
        const buf = Buffer.from(await r.arrayBuffer());
        model = `data:${r.headers.get("content-type") ?? "image/jpeg"};base64,${buf.toString("base64")}`;
      }
      const form = new FormData();
      form.append("model", process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1");
      form.append("prompt", prompt);
      form.append("size", "1024x1536");   // 2:3 — passt zu den Kacheln im Trichter
      form.append("quality", process.env.OPENAI_PREVIEW_QUALITY ?? "low");
      form.append("n", "1");
      const pb = dataUrlToBlob(person), mb = dataUrlToBlob(model);
      if (!pb || !mb) return NextResponse.json({ error: "Fotos konnten nicht gelesen werden." }, { status: 400 });
      form.append("image[]", pb, "person.png");
      form.append("image[]", mb, "model.png");

      const res = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form,
      });
      const j = await res.json().catch(() => null);
      if (res.ok) {
        const b64 = j?.data?.[0]?.b64_json;
        if (b64) return NextResponse.json({ image: `data:image/png;base64,${b64}` });
        letzterFehler = "Kein Bild erhalten.";
        continue;
      }
      const msg = String(j?.error?.message ?? "");
      // Abgelehnte Vorlage → nächste probieren. Alles andere ist ein echter Fehler.
      if (/safety|moderation|rejected/i.test(msg)) { letzterFehler = msg; continue; }
      return NextResponse.json({ error: msg || `Bild fehlgeschlagen (${res.status}).` }, { status: 502 });
    } catch (e) {
      letzterFehler = e instanceof Error ? e.message : "Netzwerkfehler.";
    }
  }

  // KLARTEXT statt OpenAI-Englisch: der Owner soll sofort wissen, woran es liegt.
  const freizuegig = /safety|moderation|rejected/i.test(letzterFehler);
  return NextResponse.json({
    error: freizuegig
      ? "Das Vorlagenfoto wird von der Bildprüfung abgelehnt (zu freizügig). Nimm ein angezogenes Foto — im Kleid statt in Spitze."
      : letzterFehler,
  }, { status: 502 });
}
