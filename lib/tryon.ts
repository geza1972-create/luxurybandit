// Shared virtual try-on: put a garment (product photo / data URL) onto a person
// photo. Returns a PNG data URL, or null if every provider failed.
//
// Routing:
//  • Normal apparel  → OpenAI gpt-image first (with a strict coverage rule that
//    keeps it tasteful), then FASHN as a fallback if OpenAI refuses.
//  • Lingerie / swim → FASHN directly: OpenAI's coverage rule would "cover up"
//    a swimsuit into a dress, and OpenAI refuses revealing pieces anyway. FASHN's
//    dedicated try-on model dresses the model in the actual piece.
//
// garmentSrc and personSrc may be https URLs or data: URLs — fetch() handles both.

import { isIntimateName } from "@/lib/lingerie";
export { isIntimateName };

const FASHN_RUN = process.env.FASHN_API_ENDPOINT ?? "https://api.fashn.ai/v1/run";
const FASHN_STATUS = process.env.FASHN_STATUS_ENDPOINT ?? "https://api.fashn.ai/v1/status";

async function fetchBuf(src: string): Promise<{ buf: Buffer; type: string } | null> {
  try {
    const r = await fetch(src);
    if (!r.ok) return null;
    return { buf: Buffer.from(await r.arrayBuffer()), type: r.headers.get("content-type") || "image/png" };
  } catch {
    return null;
  }
}

async function tryOnOpenAI(garmentSrc: string, personSrc: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  try {
    const [p, g] = await Promise.all([fetchBuf(personSrc), fetchBuf(garmentSrc)]);
    if (!p || !g) return null;
    const coverageRule =
      "Strict coverage requirement: the output MUST depict the person fully and modestly dressed in a complete outfit. The clothing must fully cover the chest, cleavage, torso, shoulders and hips with opaque fabric. Tasteful editorial fashion photograph of a clothed person. Absolutely no swimwear, lingerie, underwear, nudity, or exposed intimate areas. If the input shows bare skin, replace it with full elegant clothing.";
    const prompt = [
      "Image 1 is a photo of a real person. Image 2 is a clothing item (product photo).",
      "Generate ONE photorealistic full-body image of the SAME person from Image 1 now fully dressed in the clothing item from Image 2.",
      "Preserve the person's face, hairstyle and skin tone from Image 1 — clearly the same person. The garment must match Image 2 in material, print, colour, cut and silhouette.",
      "Natural, realistic result, simple clean background, no text or logos.",
      coverageRule,
    ].join("\n\n");
    const form = new FormData();
    form.append("model", process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1");
    form.append("prompt", prompt);
    form.append("size", "1024x1536");
    form.append("quality", process.env.OPENAI_IMAGE_QUALITY ?? "low");
    form.append("n", "1");
    form.append("image[]", new Blob([p.buf], { type: "image/png" }), "person.png");
    form.append("image[]", new Blob([g.buf], { type: "image/png" }), "garment.png");
    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    const payload = await res.json().catch(() => null);
    const b64 = payload?.data?.[0]?.b64_json;
    if (!res.ok || !b64) {
      console.error("[tryon] openai failed:", payload?.error?.message ?? res.status);
      return null;
    }
    return `data:image/png;base64,${b64}`;
  } catch (e) {
    console.error("[tryon] openai error:", e);
    return null;
  }
}

async function tryOnFashn(garmentSrc: string, personSrc: string): Promise<string | null> {
  const key = process.env.FASHN_API_KEY;
  if (!key) return null;
  try {
    const [p, g] = await Promise.all([fetchBuf(personSrc), fetchBuf(garmentSrc)]);
    if (!p || !g) return null;
    const model_image = `data:${p.type};base64,${p.buf.toString("base64")}`;
    const product_image = `data:${g.type};base64,${g.buf.toString("base64")}`;
    const create = await fetch(FASHN_RUN, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model_name: "tryon-max",
        inputs: {
          model_image,
          product_image,
          prompt: "Tasteful editorial fashion photograph of the person wearing the garment, clean studio lighting.",
          aspect_ratio: "9:16",
          resolution: "1k",
          generation_mode: "balanced",
          num_images: 1,
          output_format: "png",
          return_base64: true,
        },
      }),
    });
    const cp = await create.json().catch(() => null);
    const id = cp?.id;
    if (!create.ok || !id) {
      console.error("[tryon] fashn create failed:", cp?.error ?? create.status);
      return null;
    }
    for (let i = 0; i < 70; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      const st = await fetch(`${FASHN_STATUS}/${id}`, { headers: { Authorization: `Bearer ${key}` } })
        .then((r) => r.json())
        .catch(() => null);
      const status = String(st?.status ?? "").toLowerCase();
      if (status === "completed") {
        const out = st?.output?.[0];
        if (typeof out === "string" && out.startsWith("data:image/")) return out;
        if (typeof out === "string") {
          const ir = await fetch(out);
          if (!ir.ok) return null;
          return `data:image/png;base64,${Buffer.from(await ir.arrayBuffer()).toString("base64")}`;
        }
        return null;
      }
      if (status === "failed") {
        console.error("[tryon] fashn failed:", st?.error ?? "unknown");
        return null;
      }
    }
    return null;
  } catch (e) {
    console.error("[tryon] fashn error:", e);
    return null;
  }
}

// Dress `personSrc` in `garmentSrc`. Pass `intimate: true` (or let it be detected
// from `name`) to route lingerie/swim straight to FASHN.
export async function tryOnGarment(
  garmentSrc: string,
  personSrc: string,
  opts: { intimate?: boolean; name?: string } = {}
): Promise<string | null> {
  const intimate = opts.intimate ?? isIntimateName(opts.name ?? "");
  if (intimate) {
    // Swim/lingerie: FASHN only (OpenAI would cover it up / refuse).
    return await tryOnFashn(garmentSrc, personSrc);
  }
  // Normal apparel: OpenAI first, FASHN fallback.
  const openai = await tryOnOpenAI(garmentSrc, personSrc);
  if (openai) return openai;
  return await tryOnFashn(garmentSrc, personSrc);
}

/**
 * DAS KLEIDUNGSSTUECK FREISTELLEN — FASHN, VOR DEM PIXVERSE-LAUF (15.08.2026).
 *
 * DIE HAUSREGEL, die das erzwingt (Owner, woertlich): „wir haben nie Frauen in Unterwaesche
 * an Pixverse gegeben." Pixverse nimmt ein freigestelltes Waeschestueck an — eine Person, die
 * es traegt, weist es ab. Unsere eigenen Tanz-Sets sind deshalb von Hand freigestellt
 * (`PixVerse Image Effect: extrahiere die Kleidung`), und der Fusion-Lauf sieht nur Stoff.
 *
 * Im Try-on-Trichter laedt der Kunde das Teil aber SELBST hoch — „ein Shop-Foto genuegt", und
 * Shop-Fotos zeigen fast immer ein Model darin. Genau dieses Bild ging bisher ungefiltert als
 * `garment` an Pixverse. Bei Lingerie ist das der Fall, den der Anbieter zurueckweist.
 *
 * Deshalb hier derselbe Weg, den `components/GarmentExtractorModal.tsx` als Admin-Werkzeug
 * schon nimmt, nur serverseitig: FASHN `product-to-model` mit einem Prompt, der die Person
 * entfernt und nur das Teil stehen laesst.
 *
 * WARUM DAS NICHT DER FASHN-LAUF IST, DER BEIM TANZ AUSGEBAUT WURDE: Dort lief FASHN ueber
 * das Foto DER KUNDIN und lieferte ein Gesicht, das schon durch ein Modell gelaufen war —
 * Pixverse bekam eine Kopie statt des Originals. Hier fasst FASHN ausschliesslich das
 * KLEIDUNGSSTUECK an. Das Gesicht des Kunden geht unveraendert und direkt an Pixverse.
 *
 * NEUTRALE WORTE im Prompt (kein „lingerie", kein „skin") — dieselbe Hausregel wie bei jedem
 * Auftrag, der spaeter an Pixverse weitergereicht wird.
 *
 * Gibt `null` zurueck, wenn es nicht klappt; der Aufrufer nimmt dann das Original. Ein
 * fehlgeschlagenes Freistellen darf einen bezahlten Auftrag nicht anhalten.
 */
export async function fashnCutout(garmentSrc: string): Promise<string | null> {
  const key = process.env.FASHN_API_KEY;
  if (!key) return null;
  try {
    const g = await fetchBuf(garmentSrc);
    if (!g) return null;
    const product_image = `data:${g.type};base64,${g.buf.toString("base64")}`;
    const create = await fetch(FASHN_RUN, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model_name: "product-to-model",
        inputs: {
          product_image,
          prompt: "Isolate ONLY the garment from this photo. Remove the person and the whole "
            + "background. Output a clean e-commerce product photograph of just the garment on a "
            + "pure seamless white background, ghost-mannequin style, the complete garment "
            + "centered and clearly visible, no person, no face, no body. Keep the garment's "
            + "exact colour, material, print, shape and details. No text, no logos.",
          aspect_ratio: "9:16",
          resolution: "1k",
          generation_mode: "fast",
          num_images: 1,
          output_format: "png",
          return_base64: true,
        },
      }),
    });
    const cp = await create.json().catch(() => null);
    const id = cp?.id;
    if (!create.ok || !id) {
      console.error("[tryon] fashn cutout create failed:", cp?.error ?? create.status);
      return null;
    }
    for (let i = 0; i < 70; i++) {
      await new Promise(r => setTimeout(r, 1500));
      const st = await fetch(`${FASHN_STATUS}/${id}`, { headers: { Authorization: `Bearer ${key}` } })
        .then(r => r.json()).catch(() => null);
      const status = String(st?.status ?? "").toLowerCase();
      if (status === "completed") {
        const out = st?.output?.[0];
        if (typeof out === "string" && out.startsWith("data:image/")) return out;
        if (typeof out === "string") {
          const ir = await fetch(out);
          if (!ir.ok) return null;
          return `data:image/png;base64,${Buffer.from(await ir.arrayBuffer()).toString("base64")}`;
        }
        return null;
      }
      if (status === "failed") {
        console.error("[tryon] fashn cutout failed:", st?.error ?? "unknown");
        return null;
      }
    }
    return null;
  } catch (e) {
    console.error("[tryon] fashn cutout error:", e);
    return null;
  }
}

/**
 * ANZIEHEN AUF DEM SERVER (15.08.2026, Owner: „das Bild vom User, das Bild von FASHN und
 * Video" · „und es werden sogar 4 sein").
 *
 * WARUM ES DAS BRAUCHT: Im Browser zieht der Trichter ueber `/api/generate-fashn` an. Die
 * NACHLIEFERUNG hat diesen Weg nicht — sie lief bisher direkt zu Pixverse und konnte
 * Ein-Foto-Themen deshalb ueberhaupt nicht bedienen („Sein Foto fehlt im Speicher.", 21
 * Versuche an einem einzigen Tanz-Auftrag). Mit dieser Funktion kann der Server dieselbe
 * Kette fahren wie der Browser: Kundenfoto + Set → angezogenes Bild → Pixverse.
 *
 * DER PORTRAET-ZUSCHNITT STECKT IM PROMPT DES AUFRUFERS, nicht hier: Er ist der Grund,
 * warum Pixverse das Ergebnis annimmt (ein Ganzkoerperbild in Waesche weist es ab), aber er
 * gehoert zum jeweiligen Produkt, nicht zur Technik.
 *
 * Gibt `null` zurueck, wenn irgendetwas klemmt — der Aufrufer laeuft dann mit dem
 * Ausgangsfoto weiter, statt den bezahlten Auftrag sterben zu lassen.
 */
export async function fashnAnziehen(personSrc: string, garmentSrc: string, prompt: string): Promise<string | null> {
  const key = process.env.FASHN_API_KEY;
  if (!key) return null;
  try {
    const [p, g] = await Promise.all([fetchBuf(personSrc), fetchBuf(garmentSrc)]);
    if (!p || !g) return null;
    const create = await fetch(FASHN_RUN, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model_name: "tryon-max",
        inputs: {
          model_image: `data:${p.type};base64,${p.buf.toString("base64")}`,
          product_image: `data:${g.type};base64,${g.buf.toString("base64")}`,
          prompt,
          aspect_ratio: "9:16",
          resolution: "1k",
          generation_mode: "balanced",
          num_images: 1,
          output_format: "png",
          return_base64: true,
        },
      }),
    });
    const cp = await create.json().catch(() => null);
    const id = cp?.id;
    if (!create.ok || !id) {
      console.error("[tryon] fashn anziehen create failed:", cp?.error ?? create.status);
      return null;
    }
    for (let i = 0; i < 70; i++) {
      await new Promise(r => setTimeout(r, 1500));
      const st = await fetch(`${FASHN_STATUS}/${id}`, { headers: { Authorization: `Bearer ${key}` } })
        .then(r => r.json()).catch(() => null);
      const status = String(st?.status ?? "").toLowerCase();
      if (status === "completed") {
        const out = st?.output?.[0];
        if (typeof out === "string" && out.startsWith("data:image/")) return out;
        if (typeof out === "string") {
          const ir = await fetch(out);
          if (!ir.ok) return null;
          return `data:image/png;base64,${Buffer.from(await ir.arrayBuffer()).toString("base64")}`;
        }
        return null;
      }
      if (status === "failed") {
        console.error("[tryon] fashn anziehen failed:", st?.error ?? "unknown");
        return null;
      }
    }
    return null;
  } catch (e) {
    console.error("[tryon] fashn anziehen error:", e);
    return null;
  }
}
