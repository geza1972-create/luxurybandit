// Automatic wardrobe classification — inspects a garment image and picks the CLOSEST
// matching value from the admin's existing taxonomy for each of the five attributes.
// Reuses the project's OpenAI vision provider (the same /v1/responses + OPENAI_VISION_MODEL
// used by generate-product-description / detect-products). Never invents new taxonomy
// values — it always chooses from the provided lists.

import { editorialTitle, type ThemeEntry } from "@/lib/wardrobe-taxonomy";

export type WardrobeClassification = {
  collection: string;   // one of collectionNames (or "")
  location: string;     // one of vocab.locations (or "")
  garmentCategory: string;    // one of vocab.garmentCategories[].name (or "")
  garmentSubcategory: string; // one of that category's subcategories (or "")
  theme: string;        // one of vocab.themes[].name (or "")
  occasion: string;     // one of vocab.occasions (or "")
  style: string;        // one of vocab.styles (or "")
  emoji: string;
  publicTitle: string;
  confidence: number;   // 0..1
};

type GarmentCat = { name: string; emoji?: string; subcategories: string[] };
type Vocab = { locations: string[]; themes: ThemeEntry[]; occasions: string[]; styles: string[]; garmentCategories?: GarmentCat[] };

// Snap an AI-returned value to the closest allowed option (exact case-insensitive match,
// else substring, else ""). Guarantees we only ever persist taxonomy values.
function snap(value: string | undefined, allowed: string[]): string {
  const v = (value ?? "").trim().toLowerCase();
  if (!v) return "";
  const exact = allowed.find(a => a.toLowerCase() === v);
  if (exact) return exact;
  const partial = allowed.find(a => a.toLowerCase().includes(v) || v.includes(a.toLowerCase()));
  return partial ?? "";
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { error: { message: text.slice(0, 500) } }; }
}

/**
 * Classify one garment image into the five taxonomy attributes + editorial title.
 * `imageUrl` may be an https URL (signed Supabase links work) or a data: URL.
 * Returns null if the vision call fails (caller keeps the look unclassified).
 */
export async function classifyWardrobeImage(
  imageUrl: string,
  vocab: Vocab,
  collectionNames: string[],
): Promise<WardrobeClassification | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !imageUrl) return null;

  const themeNames = (vocab.themes ?? []).map(t => t.name);
  const cats = vocab.garmentCategories ?? [];
  const catLines = cats.map(c => `  - ${c.name}${c.subcategories.length ? ` → ${c.subcategories.join(", ")}` : ""}`).join("\n");
  const prompt = [
    "You are the fashion director of a luxury AI influencer marketplace (think Dolce & Gabbana Alta Moda, Chanel, Dior).",
    "Look at the garment/outfit photo and classify it by choosing the SINGLE closest matching value from EACH list below.",
    "You MUST choose only from the provided options. Never invent a new value. If unsure, pick the closest option.",
    "",
    `Collection (fashion story): ${collectionNames.join(", ")}`,
    `Location (dream destination): ${(vocab.locations ?? []).join(", ")}`,
    "Garment category → sub-type (pick ONE category and ONE of ITS sub-types):",
    catLines || "  (none)",
    `Theme (visual language): ${themeNames.join(", ")}`,
    `Occasion (where it belongs): ${(vocab.occasions ?? []).join(", ")}`,
    `Style (direction): ${(vocab.styles ?? []).join(", ")}`,
    "",
    "Return ONLY valid JSON with exactly these keys and no extra text:",
    '{"collection": "...", "location": "...", "garmentCategory": "...", "garmentSubcategory": "...", "theme": "...", "occasion": "...", "style": "...", "confidence": 0.0}',
    "garmentSubcategory MUST belong to the chosen garmentCategory. confidence is your overall certainty from 0 to 1.",
  ].join("\n");

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL ?? "gpt-5-mini",
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: imageUrl },
          ],
        }],
      }),
    });
  } catch { return null; }

  const payload = await readJson(response);
  if (!response.ok) return null;

  const rawText = String(
    payload?.output_text ??
    payload?.output?.flatMap((item: any) => item?.content ?? [])?.map((c: any) => c?.text ?? "")?.join("\n") ??
    ""
  ).trim();
  if (!rawText) return null;

  let parsed: any;
  try { parsed = JSON.parse(rawText.match(/\{[\s\S]*\}/)?.[0] ?? rawText); } catch { return null; }

  // Snap every value to the allowed taxonomy so we never persist invented terms.
  const collection = snap(parsed.collection, collectionNames);
  const location = snap(parsed.location, vocab.locations ?? []);
  const garmentCategory = snap(parsed.garmentCategory, cats.map(c => c.name));
  // Sub-type must belong to the chosen category.
  const subOptions = cats.find(c => c.name.toLowerCase() === garmentCategory.toLowerCase())?.subcategories ?? [];
  const garmentSubcategory = snap(parsed.garmentSubcategory, subOptions);
  const theme = snap(parsed.theme, themeNames);
  const occasion = snap(parsed.occasion, vocab.occasions ?? []);
  const style = snap(parsed.style, vocab.styles ?? []);
  const emoji = (vocab.themes ?? []).find(t => t.name.toLowerCase() === theme.toLowerCase())?.emoji ?? "";
  const publicTitle = editorialTitle({ location, collection, theme, themes: vocab.themes });
  const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0));

  return { collection, location, garmentCategory, garmentSubcategory, theme, occasion, style, emoji, publicTitle, confidence };
}
