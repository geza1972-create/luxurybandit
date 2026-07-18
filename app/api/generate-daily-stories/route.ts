import { NextResponse } from "next/server";
import sharp from "sharp";
import { readTryThisLookState, getSignedUrl, uploadTryThisLookImage, readCardStudioSlides, writeCardStudioSlides, type BellaSlide } from "@/lib/try-this-look-store";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const maxDuration = 300; // image generation is slow (several seconds each)

const BELLA_ID = "curator-1783683672619-td4cy"; // Bella is curated manually — always excluded.

// A big pool of DISTINCT lifestyle moments — one story slide each. `cat` groups similar scenes so
// we can force each of a model's 3 slides into a DIFFERENT category (no two street-walks in a row).
// `evening` marks night scenes so we dress her up; `glam` = advertising/campaign feel (cars, jets…).
type Scene = { label: string; prompt: string; location: string; time: string; cat: string; evening?: boolean; glam?: boolean };
const SCENES: Scene[] = [
  { label: "Morning coffee, city view", prompt: "sitting by a window with a sweeping city skyline behind her, holding a cappuccino, soft morning light", location: "City rooftop café", time: "Morning", cat: "cafe" },
  { label: "Breakfast on a hotel balcony", prompt: "having breakfast on a sunny hotel balcony, croissants and fresh juice, relaxed", location: "Hotel balcony", time: "Morning", cat: "hotel" },
  { label: "Luxury boutique shopping", prompt: "browsing inside a high-end designer boutique, holding a shopping bag, mirrors and racks around her", location: "Fashion district boutique", time: "Midday", cat: "shopping" },
  { label: "Old town streets", prompt: "walking through narrow cobblestone old-town streets with pastel buildings and hanging plants", location: "Old town", time: "Afternoon", cat: "street" },
  { label: "Flower market", prompt: "at a colorful outdoor flower market, smelling a fresh bouquet, buckets of blooms around her", location: "Flower market", time: "Morning", cat: "market" },
  { label: "Rooftop bar", prompt: "at a chic rooftop bar at dusk with string lights, holding a cocktail, city lights below", location: "Rooftop bar", time: "Evening", cat: "nightlife", evening: true },
  { label: "Beach club", prompt: "at a stylish beach club in an elegant summer look and sun hat, white daybeds and turquoise water", location: "Beach club", time: "Afternoon", cat: "water" },
  { label: "Beach walk", prompt: "walking barefoot along a sandy beach in a flowing summer dress, waves and blue sky behind her", location: "Sandy beach", time: "Afternoon", cat: "water" },
  { label: "Beach boardwalk", prompt: "strolling a sunny seaside boardwalk in a breezy summer outfit, palm trees and ice cream in hand", location: "Seaside boardwalk", time: "Midday", cat: "water" },
  { label: "Summer city terrace", prompt: "sitting at a sunny outdoor terrace café in a light summer dress, sunglasses, iced drink in hand", location: "Sunny city terrace", time: "Midday", cat: "cafe" },
  { label: "Summer city stroll", prompt: "walking through a sunlit summer city square in a breezy sundress, fountains and outdoor cafés around her", location: "Summer city square", time: "Afternoon", cat: "street" },
  { label: "Sunset viewpoint", prompt: "at a scenic viewpoint watching a golden sunset over hills and sea, wind in her hair", location: "Sunset viewpoint", time: "Golden hour", cat: "nature" },
  { label: "Fine dining", prompt: "at an elegant fine-dining restaurant table, candlelight, a glass of wine, warm ambiance", location: "Fine-dining restaurant", time: "Night", cat: "dining", evening: true },
  { label: "Art gallery", prompt: "wandering through a modern art gallery, looking at a large canvas, minimalist white walls", location: "Art gallery", time: "Afternoon", cat: "culture" },
  { label: "Fashion district walk", prompt: "walking a busy fashion-district avenue with flagship stores and taxis, mid-stride, candid", location: "Fashion district", time: "Midday", cat: "street" },
  { label: "Airport departure", prompt: "at a bright airport terminal with a designer carry-on, checking her boarding pass, travel mood", location: "Airport", time: "Morning", cat: "travel" },
  { label: "Convertible road trip", prompt: "in the passenger seat of an open convertible on a coastal road, hair blowing, laughing", location: "Coastal road", time: "Afternoon", cat: "travel" },
  { label: "Mountain viewpoint", prompt: "at a mountain viewpoint with layered peaks and clouds below, arms open to the view", location: "Mountain viewpoint", time: "Morning", cat: "nature" },
  { label: "Botanical garden", prompt: "strolling through a lush botanical garden greenhouse, tropical leaves, dappled light", location: "Botanical garden", time: "Afternoon", cat: "nature" },
  { label: "Vineyard afternoon", prompt: "walking between rows of a sunlit vineyard with a glass of wine, rolling hills behind", location: "Vineyard", time: "Afternoon", cat: "nature" },
  { label: "Marina walk", prompt: "walking along a marina boardwalk past sailboats and yachts, sea breeze", location: "Marina", time: "Late afternoon", cat: "water" },
  { label: "Spa & wellness", prompt: "at a serene spa in a soft robe with a herbal tea, calm candle-lit relaxation area", location: "Spa", time: "Afternoon", cat: "wellness" },
  { label: "Poolside", prompt: "relaxing on a lounger by an infinity pool in a chic resort look and sunglasses, palm shadows, holding a book", location: "Poolside", time: "Midday", cat: "water" },
  { label: "Evening city lights", prompt: "on a balcony overlooking a glittering city at night, wrapped in a shawl, dreamy", location: "City balcony", time: "Night", cat: "nightlife", evening: true },
  { label: "Cocktail bar", prompt: "at a stylish dimly-lit cocktail bar, leaning on the bar counter with a signature cocktail, warm ambient lighting", location: "Cocktail bar", time: "Night", cat: "nightlife", evening: true },
  { label: "Nightclub dance floor", prompt: "on a lively nightclub dance floor among colorful lights, laughing with friends, energetic party mood", location: "Nightclub", time: "Night", cat: "nightlife", evening: true },
  { label: "Rooftop party", prompt: "at a glamorous rooftop party at night with a DJ booth and city skyline, holding a drink, festive energy", location: "Rooftop party", time: "Night", cat: "nightlife", evening: true },
  { label: "Speakeasy bar", prompt: "at a chic hidden speakeasy-style bar, moody lighting, vintage decor, cocktail in hand", location: "Speakeasy bar", time: "Night", cat: "nightlife", evening: true },
  { label: "Beach party", prompt: "at a lively beach party at dusk with bonfire lights and music, dancing barefoot in the sand", location: "Beach party", time: "Evening", cat: "nightlife", evening: true },
  { label: "Rainy-day café", prompt: "cozy in a café by a rain-streaked window with a hot drink, warm indoor light", location: "Cozy café", time: "Afternoon", cat: "cafe" },
  { label: "Bookstore", prompt: "browsing tall shelves in a charming bookstore, pulling out a book, warm reading light", location: "Bookstore", time: "Afternoon", cat: "culture" },
  { label: "Cooking class", prompt: "at a hands-on cooking class in an apron, chopping fresh ingredients, laughing", location: "Cooking studio", time: "Evening", cat: "activity" },
  { label: "Boat excursion", prompt: "on the deck of a small boat cruising clear blue water, wind and spray, joyful", location: "Open water", time: "Midday", cat: "water" },
  { label: "Picnic in nature", prompt: "at a picnic on a checkered blanket in a green meadow, wicker basket, wildflowers", location: "Countryside meadow", time: "Afternoon", cat: "nature" },
  { label: "Street photography", prompt: "candidly caught crossing a lively street with market stalls, real everyday energy", location: "City street", time: "Midday", cat: "street" },
  { label: "Hidden local spot", prompt: "in a tiny hidden courtyard café known only to locals, ivy walls, quiet charm", location: "Hidden courtyard", time: "Late afternoon", cat: "cafe" },
  { label: "Marina sunset drinks", prompt: "having a sunset drink at a waterside terrace, boats and orange sky reflecting on water", location: "Waterside terrace", time: "Golden hour", cat: "dining", evening: true },
  // Glamorous, advertising-style moments — cars, jets, helicopters, yachts, pools, runway, red carpet.
  { label: "Luxury sports car", prompt: "stepping out of a parked luxury sports car on a glamorous boulevard, one hand on the open door", location: "City boulevard", time: "Evening", cat: "car", glam: true },
  { label: "Supercar garage", prompt: "leaning elegantly against a supercar in a stylish private garage with dramatic lighting", location: "Private garage", time: "Evening", cat: "car", glam: true },
  { label: "Private jet", prompt: "walking up the stairs to a private jet on the tarmac, sunglasses on, designer luggage beside her", location: "Private jet tarmac", time: "Morning", cat: "jet", glam: true },
  { label: "Helicopter", prompt: "stepping onto a rooftop helipad beside a sleek private helicopter, hair moving in the wind", location: "Rooftop helipad", time: "Afternoon", cat: "heli", glam: true },
  { label: "Luxury yacht", prompt: "standing at the railing on the deck of a large luxury yacht at sea, open ocean and blue sky behind her", location: "Luxury yacht", time: "Midday", cat: "yacht", glam: true },
  { label: "Marina yacht boarding", prompt: "boarding a gleaming yacht from a marina dock, designer bag over her shoulder, sea breeze", location: "Marina dock", time: "Late afternoon", cat: "yacht", glam: true },
  { label: "Fashion runway", prompt: "walking a fashion-show runway under bright spotlights, a blurred seated audience on both sides", location: "Fashion show", time: "Night", cat: "runway", glam: true, evening: true },
  { label: "Red carpet", prompt: "on a red carpet with flashing cameras and a step-and-repeat backdrop behind her", location: "Red carpet event", time: "Night", cat: "redcarpet", glam: true, evening: true },
  { label: "Infinity pool villa", prompt: "standing by a stunning infinity pool at a luxury cliffside villa overlooking the sea", location: "Villa infinity pool", time: "Golden hour", cat: "pool", glam: true },
  { label: "Penthouse terrace", prompt: "on a glamorous penthouse terrace with a panoramic city skyline and champagne on the table", location: "Penthouse terrace", time: "Evening", cat: "penthouse", glam: true, evening: true },
];

// Fallback outfit ideas if the vision step can't read her style.
const OUTFITS_FALLBACK = [
  "a tailored trouser suit", "a flowing maxi dress", "an elegant coat over a blouse", "a chic knit with a midi skirt",
  "a crisp shirt with wide-leg trousers", "a silk slip dress with a jacket", "a leather jacket with designer jeans", "a linen co-ord set",
];

// Framing — the user wants FULL-BODY shots, so most slots are head-to-toe. Rotated per slide.
const FRAMINGS = [
  "FULL-BODY head-to-toe shot: show her entire figure, the full outfit and her shoes, and the whole setting around her",
  "FULL-LENGTH wide shot: she stands within a grand luxurious environment, full figure visible from head to shoes",
  "FULL-BODY shot from a low angle, whole body and outfit visible, the setting rising behind her",
  "three-quarter-length shot from mid-thigh up, outfit and upper body clearly visible",
];

const ANGLES = ["candid over-the-shoulder angle", "eye-level candid shot", "slightly-from-above phone angle", "wide environmental shot showing the place", "close natural angle"];
const EMOTIONS = ["a soft genuine smile", "a relaxed thoughtful expression", "laughing naturally", "calm and content", "curious and engaged"];
// fetch with a hard timeout — so one slow OpenAI call can never hang the whole request forever.
async function fetchT(url: string, opts: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}
const rand = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

// Build a try-queue: one random scene per DISTINCT category, then INTERLEAVE lifestyle + glamour so
// every 3-slide set gets a mix of both (never all the same kind, never a repeated category).
function sceneQueue(): Scene[] {
  const byCat = new Map<string, Scene[]>();
  for (const s of SCENES) { const arr = byCat.get(s.cat) ?? []; arr.push(s); byCat.set(s.cat, arr); }
  const perCat = [...byCat.values()].map(arr => rand(arr));
  const glam = shuffle(perCat.filter(s => s.glam));
  const life = shuffle(perCat.filter(s => !s.glam));
  const out: Scene[] = [];
  for (let i = 0; i < Math.max(glam.length, life.length); i++) { if (life[i]) out.push(life[i]); if (glam[i]) out.push(glam[i]); }
  const rest = shuffle(SCENES.filter(s => !out.includes(s)));
  return [...out, ...rest];
}

type Profile = { hair: string; body: string; tattoos: string; style: string; outfits: string[] };

// Vision step — read HER actual appearance (tattoos!) and personal style so the generated images
// look like HER and the outfits fit her aesthetic, not generic luxury.
async function analyzeModel(apiKey: string, imageUrl: string): Promise<Profile> {
  try {
    const res = await fetchT("https://api.openai.com/v1/chat/completions", {
      method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o", temperature: 0.3, max_tokens: 600,
        messages: [{ role: "user", content: [
          { type: "text", text: `Look at this woman and describe her for a fashion photo generator. Return ONLY JSON:\n{"hair":"colour, length, style","body":"build and skin tone","tattoos":"describe EVERY visible tattoo in detail — body location + motif + colours (e.g. 'full colourful Japanese sleeve of dragons and peonies on both arms, floral neck tattoo, tattooed hands'); write 'none' if she has none","style":"her personal fashion aesthetic / persona in a few words","outfits":["8 specific fully-clothed outfit ideas that truly match HER personal style — no lingerie, no swimwear"]}` },
          { type: "image_url", image_url: { url: imageUrl } },
        ] }],
      }),
    }, 60000);
    const p = await res.json();
    const text = String(p?.choices?.[0]?.message?.content ?? "").replace(/^```json\s*|\s*```$/g, "").trim();
    const j = JSON.parse(text);
    return {
      hair: String(j.hair ?? ""), body: String(j.body ?? ""), tattoos: String(j.tattoos ?? "none"),
      style: String(j.style ?? "elegant luxury"),
      outfits: Array.isArray(j.outfits) && j.outfits.length ? j.outfits.map(String) : OUTFITS_FALLBACK,
    };
  } catch {
    return { hair: "", body: "", tattoos: "none", style: "elegant luxury", outfits: OUTFITS_FALLBACK };
  }
}

async function refBlob(photoPath: string): Promise<Blob | null> {
  try {
    const url = await getSignedUrl(photoPath);
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.blob();
  } catch { return null; }
}

// Crop the reference down to JUST the head/face. Source photos are often lingerie/suggestive
// full-body shots that OpenAI hard-blocks as sexual. A clean headshot passes safety; her body,
// tattoos and style are restored from the vision Profile instead.
async function faceCrop(blob: Blob): Promise<Blob> {
  const buf = Buffer.from(await blob.arrayBuffer());
  const m = await sharp(buf).metadata();
  const w = m.width ?? 800, h = m.height ?? 1200;
  const cw = Math.round(w * 0.74);
  const top = Math.round(h * 0.015);
  const ch = Math.min(Math.round(h * 0.40), h - top);
  const left = Math.round((w - cw) / 2);
  const out = await sharp(buf).extract({ left, top, width: cw, height: ch }).resize(768, 1024, { fit: "cover" }).png().toBuffer();
  return new Blob([out], { type: "image/png" });
}

async function genImage(apiKey: string, refBlob: Blob, scene: Scene, outfit: string, framing: string, prof: Profile): Promise<string> {
  // Simple, short instruction — mirrors what actually works best in practice: give the model the
  // photo and one direct sentence. Heavy multi-paragraph constraints (pose rules, mood essays,
  // safety scaffolding) measurably hurt identity fidelity; keep this short.
  const prompt = `Using this photo of this exact woman, make a full-body ${scene.glam ? "glamorous campaign-style" : "summer lifestyle"} photo of her ${scene.prompt}, wearing ${outfit}. It is ${scene.time.toLowerCase()}. Keep her looking exactly like herself.`;
  const form = new FormData();
  form.append("model", process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1");
  form.append("prompt", prompt);
  form.append("size", "1024x1536");
  form.append("quality", process.env.OPENAI_IMAGE_QUALITY ?? "high");
  form.append("n", "1");
  form.append("image[]", refBlob, "reference.png");
  const res = await fetchT("https://api.openai.com/v1/images/edits", { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form }, 120000);
  const txt = await res.text();
  const p = JSON.parse(txt || "{}");
  if (!res.ok) throw new Error(p?.error?.message ?? txt.slice(0, 200));
  const b64 = p?.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image returned.");
  return `data:image/png;base64,${b64}`;
}

// One caption + one shoppable hint per slide. Shop hint = where to buy a similar outfit, an approx
// € price range, and which occasions it suits — matched to HER style and the actual outfit shown.
async function genStories(apiKey: string, name: string, prof: Profile, items: { scene: Scene; outfit: string }[]): Promise<{ caption: string; shop: string }[]> {
  try {
    const res = await fetchT("https://api.openai.com/v1/chat/completions", {
      method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini", temperature: 0.9,
        messages: [{ role: "user", content:
          `You are ${name}, a luxury lifestyle influencer whose style is "${prof.style}", sharing your day on Instagram Stories. For each moment below write, in order, ONE item. Return ONLY a JSON array; each item = {"caption":"1-2 warm authentic first-person sentences — you are LIVING your life, not modeling","shop":"where to find a similar outfit (type of shop or high-street vs designer), an approximate price range in €, and which occasions/situations it suits — ONE short helpful line"}.\n\nMoments (outfit | scene):\n${items.map((it, i) => `${i + 1}. ${it.outfit} | ${it.scene.label} — ${it.scene.location}, ${it.scene.time}`).join("\n")}` }],
      }),
    }, 60000);
    const p = await res.json();
    const text = String(p?.choices?.[0]?.message?.content ?? "").replace(/^```json\s*|\s*```$/g, "").trim();
    const arr = JSON.parse(text);
    if (Array.isArray(arr)) return items.map((it, i) => ({ caption: String(arr[i]?.caption ?? it.scene.label), shop: String(arr[i]?.shop ?? "") }));
  } catch { /* fall through */ }
  return items.map(it => ({ caption: it.scene.label, shop: "" }));
}

// POST { modelId?, all?, count? } admin — generate diverse lifestyle story slides.
//      { modelId, deleteIds:[...] } — remove generated slides by id.
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY missing." }, { status: 400 });
  const body = (await request.json().catch(() => ({}))) as { modelId?: string; all?: boolean; count?: number; deleteIds?: string[]; limit?: number; dryRun?: boolean };

  if (body.modelId && Array.isArray(body.deleteIds) && body.deleteIds.length) {
    const existing = await readCardStudioSlides(body.modelId).catch(() => [] as BellaSlide[]);
    const kill = new Set(body.deleteIds);
    const kept = existing.filter(s => !kill.has(s.id));
    await writeCardStudioSlides(kept, body.modelId);
    return NextResponse.json({ ok: true, removed: existing.length - kept.length, remaining: kept.length });
  }

  const count = Math.min(5, Math.max(1, Number(body.count) || 3));
  const state = await readTryThisLookState();
  // Any active model with a reference photo qualifies — most older curators have NO imageSource
  // field at all (only the 8 recently promoted AI faces carry "ours"), so don't filter on it.
  const shouldGenerate = (c: any) => c.id !== BELLA_ID && ((c.status ?? "active") === "active");
  let targets = (state.curators ?? []).filter(shouldGenerate);
  if (body.modelId) targets = targets.filter(c => c.id === body.modelId);
  else if (!body.all) targets = targets.slice(0, 1);
  if (!targets.length) return NextResponse.json({ error: "No matching model found (Bella is excluded)." }, { status: 404 });
  const maxModels = Math.max(1, Number(body.limit) || Infinity); // batch size per call

  const results: any[] = [];
  let generatedModels = 0;
  for (const c of targets as any[]) {
    const name = (c.modelName?.trim() || [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || c.firstName || "Model");
    // Models that already have slides keep them untouched and are skipped (unless explicitly
    // requested via modelId) — so re-running simply continues with the not-yet-done models.
    const already = await readCardStudioSlides(c.id).catch(() => [] as BellaSlide[]);
    if (body.dryRun) { results.push({ id: c.id, name, slides: already.length, hasPhoto: !!c.photoPath, wouldGenerate: already.length === 0 && !!c.photoPath }); continue; }
    if (already.length > 0 && !body.modelId) { results.push({ id: c.id, name, skipped: `already has ${already.length} slides` }); continue; }
    if (generatedModels >= maxModels) break; // this batch is full — next call picks up here
    if (!c.photoPath) { results.push({ id: c.id, name, error: "no reference photo" }); continue; }
    generatedModels++;
    const ref = await refBlob(c.photoPath);
    if (!ref) { results.push({ id: c.id, name, error: "reference fetch failed" }); continue; }
    let face: Blob;
    try { face = await faceCrop(ref); } catch { results.push({ id: c.id, name, error: "face crop failed" }); continue; }

    const refUrl = await getSignedUrl(c.photoPath).catch(() => "");
    const prof = refUrl ? await analyzeModel(apiKey, refUrl) : { hair: "", body: "", tattoos: "none", style: "elegant luxury", outfits: OUTFITS_FALLBACK };
    const styleOutfits = shuffle(prof.outfits.length ? prof.outfits : OUTFITS_FALLBACK);

    // Generate the images in PARALLEL rounds (wall-clock ≈ one image, not the sum). First round
    // fires `count` at once; any that the safety system blocks get one small top-up round. Hard
    // cap at count+3 total attempts so a bad face can never run away in time or $$$.
    const queue = sceneQueue();
    const errors: string[] = [];
    const done: { scene: Scene; dataUrl: string; outfit: string }[] = [];
    let idx = 0;
    while (done.length < count && idx < queue.length && idx < count + 3) {
      const batch = queue.slice(idx, idx + (count - done.length));
      idx += batch.length;
      const settled = await Promise.all(batch.map((scene, k) => {
        const slot = done.length + k;
        let outfit = styleOutfits[slot % styleOutfits.length];
        if (scene.evening || scene.glam) outfit = `${outfit}, elevated and dressed up for the occasion`;
        const framing = FRAMINGS[slot % FRAMINGS.length];
        return genImage(apiKey, face, scene, outfit, framing, prof)
          .then(dataUrl => ({ ok: true as const, scene, dataUrl, outfit }))
          .catch(e => ({ ok: false as const, scene, err: e instanceof Error ? e.message.slice(0, 80) : "failed" }));
      }));
      for (const r of settled) {
        if (r.ok) done.push({ scene: r.scene, dataUrl: r.dataUrl, outfit: r.outfit });
        else errors.push(`${r.scene.label}: ${r.err}`);
      }
    }

    const stories = await genStories(apiKey, name, prof, done.map(d => ({ scene: d.scene, outfit: d.outfit })));
    const existing = await readCardStudioSlides(c.id).catch(() => [] as BellaSlide[]);
    const baseOrder = existing.reduce((m, s) => Math.max(m, s.order ?? -1), -1) + 1;
    const now = Date.now();
    const made: { title: string; caption: string; mediaUrl: string }[] = [];
    const newSlides: BellaSlide[] = [];
    for (let i = 0; i < done.length; i++) {
      const { scene, dataUrl } = done[i];
      try {
        const path = await uploadTryThisLookImage("uploads", dataUrl);
        const st = stories[i] || { caption: scene.label, shop: "" };
        const caption = `${st.caption} — ${scene.location}, ${scene.time}${st.shop ? `\n🛍 ${st.shop}` : ""}`;
        newSlides.push({ id: crypto.randomUUID(), kind: "image", path, title: scene.label, caption, order: baseOrder + i, createdAt: new Date(now + i).toISOString(), ...( { source: "ai-story" } as any) });
        made.push({ title: scene.label, caption, mediaUrl: await getSignedUrl(path).catch(() => "") });
      } catch (e) { errors.push(`upload ${scene.label}: ${e instanceof Error ? e.message.slice(0, 60) : "failed"}`); }
    }
    if (newSlides.length) await writeCardStudioSlides([...existing, ...newSlides], c.id);
    results.push({ id: c.id, name, style: prof.style, tattoos: prof.tattoos, generated: newSlides.length, errors: errors.length ? errors : undefined, slides: made });
  }
  return NextResponse.json({ ok: true, models: results.length, results });
}
