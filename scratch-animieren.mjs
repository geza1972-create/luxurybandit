import { readFileSync } from "node:fs";
import { uploadTryThisLookBytes, getSignedUrl } from "@/lib/try-this-look-store";

/**
 * EIN GEMÄLDE, DAS SICH BEWEGT (Owner 15.09.2026: „wo das bild animiert ist" · „du hast doch ein
 * video tool").
 *
 * Derselbe Weg wie `lib/kampagnen-video.ts`: Bild zu Pixverse hochladen, animieren lassen,
 * Ergebnis in unsere Ablage legen. Hier ohne Ton — ein Gemälde, das Geräusche macht, wirkt
 * billig, und der Ton kostet zusätzlich.
 *
 * NUR EIN CLIP: Erst sehen, was es kostet und ob es taugt. Erst danach die übrigen.
 */
const PV = "https://app-api.pixverse.ai/openapi/v2";
const key = process.env.PIXVERSE_API_KEY?.trim();
if (!key) { console.log("PIXVERSE_API_KEY fehlt"); process.exit(1); }
const kopf = (json = false) => ({
  "API-KEY": key,
  "Ai-trace-id": crypto.randomUUID(),
  ...(json ? { "Content-Type": "application/json" } : {}),
});

const DATEI = process.env.BILD ?? "/tmp/repro/w-noapte-web.jpg";
const PROMPT = process.env.PROMPT ??
  "The painted swirls in the night sky drift slowly, the stars pulse faintly, "
  + "the cypress sways a little in the wind. Oil paint texture and brushstrokes stay "
  + "visible and unchanged, colours unchanged, no camera movement, no new objects, "
  + "subtle and calm, seamless loop.";

const bytes = readFileSync(DATEI);
const form = new FormData();
form.append("image", new Blob([bytes], { type: "image/jpeg" }), "werk.jpg");
const upRes = await fetch(`${PV}/image/upload`, { method: "POST", headers: kopf(), body: form });
const up = await upRes.json().catch(() => null);
if (up?.ErrCode !== 0 || !up?.Resp?.img_id) { console.log("Upload:", up?.ErrMsg ?? upRes.status, JSON.stringify(up).slice(0, 200)); process.exit(1); }
console.log("hochgeladen:", up.Resp.img_id);

const genRes = await fetch(`${PV}/video/img/generate`, {
  method: "POST", headers: kopf(true),
  body: JSON.stringify({
    duration: 5, img_id: up.Resp.img_id,
    model: process.env.PIXVERSE_MODEL?.trim() || "v6",
    motion_mode: "normal",
    quality: process.env.PIXVERSE_QUALITY?.trim() || "540p",
    prompt: PROMPT, generate_audio_switch: false,
  }),
});
const gen = await genRes.json().catch(() => null);
if (gen?.ErrCode !== 0 || !gen?.Resp?.video_id) { console.log("Start:", gen?.ErrMsg ?? genRes.status); process.exit(1); }
console.log("läuft:", gen.Resp.video_id);

for (let i = 0; i < 80; i++) {
  await new Promise(r => setTimeout(r, 3000));
  const d = await fetch(`${PV}/video/result/${gen.Resp.video_id}`, { headers: kopf() }).then(r => r.json()).catch(() => null);
  const s = d?.Resp?.status;
  if (s === 1 && d?.Resp?.url) {
    const vid = await fetch(String(d.Resp.url));
    const ab = await vid.arrayBuffer();
    const pfad = await uploadTryThisLookBytes("videos", ab, "video/mp4", "mp4");
    console.log("fertig:", pfad);
    console.log("URL:", await getSignedUrl(pfad, 60 * 60 * 24 * 365).catch(() => ""));
    const { writeFileSync } = await import("node:fs");
    writeFileSync("/tmp/repro/animation.mp4", Buffer.from(ab));
    console.log("lokal: /tmp/repro/animation.mp4");
    process.exit(0);
  }
  if (s === 7 || s === 8) { console.log("abgelehnt/fehlgeschlagen, status", s); process.exit(1); }
}
console.log("Zeitüberschreitung");
