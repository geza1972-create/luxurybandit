import { getSignedUrl, uploadTryThisLookBytes, readKissLog, writeKissLog } from "@/lib/try-this-look-store";
import { faststartMp4 } from "@/lib/mp4-faststart";
import { KAMPAGNEN } from "@/lib/kampagnen";

/**
 * DIE ERZEUGUNG FÜR KAMPAGNEN — dieselben zwei Aufrufe wie in
 * `app/api/armee-video/route.ts` (OpenAI setzt das Gesicht in die Szene, Pixverse animiert
 * es), nur über das Register in `lib/kampagnen.ts` statt über feste Bundeswehr-Prompts.
 *
 * ABSICHTLICH EINE ZWEITE FASSUNG STATT EINES UMBAUS AN `armee-video`: Die läuft im echten
 * Betrieb der Academy, unter echtem Anzeigen-Traffic. Diese Datei bedient jede KÜNFTIGE
 * Kampagne über ihren Schlüssel, ohne die geprüfte Route der Academy anzufassen.
 */
const PV_BASE = "https://app-api.pixverse.ai/openapi/v2";
const pvHeaders = (key: string, json = false): Record<string, string> =>
  json ? { "API-KEY": key, "Ai-trace-id": crypto.randomUUID(), "Content-Type": "application/json" }
       : { "API-KEY": key, "Ai-trace-id": crypto.randomUUID() };

const LIMIT_GERAET_VORGABE = Number(process.env.KAMPAGNEN_LIMIT_GERAET || 3);
const LIMIT_TAG_VORGABE = Number(process.env.KAMPAGNEN_LIMIT_TAG || 40);

async function bildBauen(fotoUrl: string, prompt: string): Promise<{ bild?: Buffer; fehler?: string }> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return { fehler: "OPENAI_API_KEY fehlt." };
  let roh: ArrayBuffer;
  try {
    const r = await fetch(fotoUrl);
    if (!r.ok) throw new Error(String(r.status));
    roh = await r.arrayBuffer();
  } catch { return { fehler: "Dein Foto konnte nicht geladen werden." }; }
  const modell = process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-2";
  const lauf = async (model: string) => {
    const fd = new FormData();
    fd.append("model", model);
    fd.append("prompt", prompt);
    fd.append("size", "1024x1536");
    fd.append("quality", "high");
    if (model !== "gpt-image-2") fd.append("input_fidelity", "high");
    fd.append("image[]", new Blob([new Uint8Array(roh)], { type: "image/jpeg" }), "person.jpg");
    const r = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST", headers: { Authorization: `Bearer ${key}` }, body: fd,
    });
    return r.json() as Promise<{ data?: { b64_json?: string }[]; error?: { message?: string } }>;
  };
  let out = await lauf(modell);
  if (!out?.data?.[0]?.b64_json && modell !== "gpt-image-1") out = await lauf("gpt-image-1");
  const b64 = out?.data?.[0]?.b64_json;
  if (!b64) return { fehler: `Bild fehlgeschlagen: ${out?.error?.message ?? "keine Bilddaten"}` };
  return { bild: Buffer.from(b64, "base64") };
}

/** Phase „bild": sein Gesicht in die Szene der gewählten Kampagne. */
export async function kampagnenBildBauen(theme: string, szeneId: string, fotoUrl: string) {
  const kampagne = KAMPAGNEN[theme];
  if (!kampagne) return { error: "Unbekannte Kampagne.", status: 404 as const };
  const prompts = kampagne.prompts[szeneId];
  if (!prompts) return { error: "Unbekanntes Glück.", status: 400 as const };
  const { bild, fehler } = await bildBauen(fotoUrl, prompts.bild);
  if (!bild || fehler) return { error: fehler ?? "Bild fehlgeschlagen.", status: 502 as const };
  const bytes = bild.buffer.slice(bild.byteOffset, bild.byteOffset + bild.byteLength) as ArrayBuffer;
  const pfad = await uploadTryThisLookBytes("looks", bytes, "image/png", "png");
  const bildUrl = await getSignedUrl(pfad, 60 * 60 * 24 * 365).catch(() => "");
  return { ok: true as const, pfad, bildUrl };
}

/** Phase „video": Pixverse animiert das Bild aus der ersten Phase. */
export async function kampagnenVideoBauen(theme: string, szeneId: string, bildPfad: string) {
  const kampagne = KAMPAGNEN[theme];
  if (!kampagne) return { error: "Unbekannte Kampagne.", status: 404 as const };
  const prompts = kampagne.prompts[szeneId];
  if (!prompts) return { error: "Unbekanntes Glück.", status: 400 as const };
  const key = process.env.PIXVERSE_API_KEY?.trim();
  if (!key) return { error: "PIXVERSE_API_KEY fehlt.", status: 500 as const };
  const bildUrl = await getSignedUrl(bildPfad).catch(() => "");
  if (!bildUrl) return { error: "Bild nicht abrufbar.", status: 502 as const };
  let bytes: ArrayBuffer;
  try { const r = await fetch(bildUrl); if (!r.ok) throw new Error("img"); bytes = await r.arrayBuffer(); }
  catch { return { error: "Bild nicht ladbar.", status: 502 as const }; }
  const form = new FormData();
  form.append("image", new Blob([bytes], { type: "image/png" }), "frame.png");
  const upRes = await fetch(`${PV_BASE}/image/upload`, { method: "POST", headers: pvHeaders(key), body: form });
  const up = await upRes.json().catch(() => null);
  if (up?.ErrCode !== 0 || !up?.Resp?.img_id) {
    return { error: `Pixverse-Upload: ${up?.ErrMsg ?? upRes.status}`, status: 502 as const };
  }
  const genRes = await fetch(`${PV_BASE}/video/img/generate`, {
    method: "POST", headers: pvHeaders(key, true),
    body: JSON.stringify({
      duration: 5, img_id: up.Resp.img_id,
      model: process.env.PIXVERSE_MODEL?.trim() || "v6",
      motion_mode: "normal",
      quality: process.env.PIXVERSE_QUALITY?.trim() || "540p",
      prompt: prompts.video, generate_audio_switch: true,
    }),
  });
  const gen = await genRes.json().catch(() => null);
  if (gen?.ErrCode !== 0 || !gen?.Resp?.video_id) {
    return { error: `Pixverse: ${gen?.ErrMsg ?? genRes.status}`, status: 502 as const };
  }
  const videoId = String(gen.Resp.video_id);
  for (let i = 0; i < 80; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const res = await fetch(`${PV_BASE}/video/result/${videoId}`, { headers: pvHeaders(key) });
    const d = await res.json().catch(() => null);
    const status = d?.Resp?.status;
    if (status === 1 && d?.Resp?.url) {
      const vid = await fetch(String(d.Resp.url));
      const fix = faststartMp4(Buffer.from(await vid.arrayBuffer()));
      const ab = fix.buffer.slice(fix.byteOffset, fix.byteOffset + fix.byteLength) as ArrayBuffer;
      const videoPfad = await uploadTryThisLookBytes("videos", ab, "video/mp4", "mp4");
      const videoUrl = await getSignedUrl(videoPfad, 60 * 60 * 24 * 365).catch(() => "");
      return { ok: true as const, videoUrl };
    }
    if (status === 7) return { error: "Dein Foto kam durch die Prüfung nicht durch. Versuch ein anderes.", status: 502 as const };
    if (status === 8) return { error: "Die Erzeugung ist fehlgeschlagen.", status: 502 as const };
  }
  return { error: "Das hat zu lange gedauert. Versuch es noch einmal.", status: 504 as const };
}

/** Die Deckel — dieselbe Zählweise wie `armee-video`, nur nach dem Thema der Kampagne
    gefiltert statt fest auf „armee". */
export async function kampagnenDeckelPruefen(theme: string, geraet: string) {
  const kampagne = KAMPAGNEN[theme];
  const limitGeraet = kampagne?.limitGeraet ?? LIMIT_GERAET_VORGABE;
  const limitTag = kampagne?.limitTag ?? LIMIT_TAG_VORGABE;
  const seit = Date.now() - 24 * 60 * 60 * 1000;
  const alle = await readKissLog();
  const laeufe = alle.filter(e => e.theme === theme && !!e.imagePath && Date.parse(e.createdAt) > seit);
  if (laeufe.length >= limitTag) {
    return { ok: false as const, error: "Heute sind schon sehr viele Videos entstanden. Versuch es morgen noch einmal." };
  }
  if (geraet && laeufe.filter(e => e.device === geraet).length >= limitGeraet) {
    return { ok: false as const, error: "Du hast heute schon mehrere Videos erstellt. Morgen geht es weiter." };
  }
  return { ok: true as const };
}

export { readKissLog, writeKissLog };
