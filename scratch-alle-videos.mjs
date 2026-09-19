import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";

/**
 * VIDEO POSTER — JEDES WERK EINMAL ANIMIERT (Owner 15.09.2026: „wir nehmen die videos statt
 * bilder dann").
 *
 * EIN PROMPT FÜR ALLE (Owner: „ich brauche nur ein promt der gilt für alle"). Die drei Verbote
 * darin sind der ganze Punkt: keine Kamerafahrt, keine neuen Dinge, keine veränderten Gesichter.
 * Ohne sie dichtet das Werkzeug das Gemälde um, und dann bewegt sich nicht mehr der Van Gogh.
 *
 * DER REIHE NACH, NICHT PARALLEL: Pixverse nimmt zwar mehrere an, aber ein Fehlschlag mitten in
 * einem Schwung ist schwerer zu finden als einer in einer Reihe. Zwischen den Clips eine Pause.
 *
 * WAS SCHON DA IST, WIRD ÜBERSPRUNGEN: Der Lauf darf jederzeit abbrechen und neu starten, ohne
 * dass ein Clip zweimal bezahlt wird.
 */
const PV = "https://app-api.pixverse.ai/openapi/v2";
const key = process.env.PIXVERSE_API_KEY?.trim();
if (!key) { console.log("PIXVERSE_API_KEY fehlt"); process.exit(1); }
const kopf = (json = false) => ({
  "API-KEY": key, "Ai-trace-id": crypto.randomUUID(),
  ...(json ? { "Content-Type": "application/json" } : {}),
});

/**
 * ── DER ZOOM MUSS WEG (Owner 15.09.2026: „du hast aber eine blöde animation gemacht zoom, das
 * ist nicht gut für loop") ──────────────────────────────────────────────────────────────────
 *
 * Der erste Prompt sagte „no camera movement" — das Modell hat trotzdem hineingezoomt. Ein Zoom
 * zerstört jeden Loop: Am Ende steht ein anderer Bildausschnitt als am Anfang.
 *
 * ZWEI HEBEL STATT EINEM: der Prompt sagt jetzt AUSDRÜCKLICH „locked-off camera, tripod shot,
 * the frame never changes", und der negative Prompt verbietet Zoom, Schwenk und Fahrt noch
 * einmal. Was ein Modell einmal überliest, überliest es selten zweimal.
 */
/**
 * JE WERK EIN EIGENER SATZ (Owner 15.09.2026: „ja, also die müssen wirklich individuelle sein").
 *
 * Der gemeinsame Teil bleibt die REGEL — feste Kamera, Malerei bleibt Malerei. Was sich bewegt,
 * steht je Bild in `bewegung`: im Kornfeld die Ähren, bei Hokusai die Welle, bei Friedrich nur
 * der Nebel. Ein Satz für alle hiesse, dem Modell zu überlassen, was es für beweglich hält —
 * und dann bewegt sich ein Gesicht.
 *
 * WERKE OHNE `bewegung` BEKOMMEN KEINEN FILM. Bei einem Selbstporträt oder bei Klimts Sărutul
 * gibt es nichts, was sich bewegen dürfte; ein Video wäre dort eine Verschlechterung.
 */
const REGEL =
  "Locked-off camera on a tripod. The frame never changes — same crop from first to last frame. "
  + "Keep the original brushstrokes, canvas texture and colours exactly as they are — it must "
  + "still look like the painting, not a photo. Faces must not move or change expression. "
  + "Everything not named below stays perfectly still. Slow, calm, seamless loop.";

const NEGATIV = "zoom, zoom in, zoom out, camera movement, camera pan, dolly, push in, "
  + "parallax, 3d, morphing, distortion, new objects, extra people, text, watermark";

const WERKE = JSON.parse(readFileSync("/tmp/repro/werke.json", "utf8"));
mkdirSync("/tmp/repro/video", { recursive: true });

const guthaben = async () => {
  const d = await fetch(`${PV}/account/balance`, { headers: kopf() }).then(r => r.json()).catch(() => null);
  return (d?.Resp?.credit_monthly ?? 0) + (d?.Resp?.credit_package ?? 0);
};

const einClip = async (w) => {
  if (!w.bewegung) { console.log("kein Film (gewollt):", w.id); return; }
  const ziel = `/tmp/repro/video/${w.id}.mp4`;
  if (existsSync(ziel)) { console.log("schon da:", w.id); return; }

  const form = new FormData();
  form.append("image", new Blob([readFileSync(w.datei)], { type: "image/jpeg" }), "werk.jpg");
  const up = await fetch(`${PV}/image/upload`, { method: "POST", headers: kopf(), body: form })
    .then(r => r.json()).catch(() => null);
  if (up?.ErrCode !== 0 || !up?.Resp?.img_id) { console.log("FEHLER Upload", w.id, up?.ErrMsg); return; }

  const gen = await fetch(`${PV}/video/img/generate`, {
    method: "POST", headers: kopf(true),
    body: JSON.stringify({
      duration: 5, img_id: up.Resp.img_id,
      model: process.env.PIXVERSE_MODEL?.trim() || "v6",
      motion_mode: "normal",
      quality: process.env.PIXVERSE_QUALITY?.trim() || "540p",
      prompt: `${REGEL} ${w.bewegung}`, negative_prompt: NEGATIV, generate_audio_switch: false,
    }),
  }).then(r => r.json()).catch(() => null);
  if (gen?.ErrCode !== 0 || !gen?.Resp?.video_id) { console.log("FEHLER Start", w.id, gen?.ErrMsg); return; }

  for (let i = 0; i < 100; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const d = await fetch(`${PV}/video/result/${gen.Resp.video_id}`, { headers: kopf() })
      .then(r => r.json()).catch(() => null);
    const s = d?.Resp?.status;
    if (s === 1 && d?.Resp?.url) {
      const ab = await fetch(String(d.Resp.url)).then(r => r.arrayBuffer());
      writeFileSync(ziel, Buffer.from(ab));
      console.log("fertig:", w.id, Math.round(ab.byteLength / 1024) + " KB");
      return;
    }
    if (s === 7 || s === 8) { console.log("abgelehnt", w.id, "status", s); return; }
  }
  console.log("Zeitüberschreitung", w.id);
};

console.log("Guthaben vorher:", await guthaben());
for (const w of WERKE) {
  await einClip(w);
  await new Promise(r => setTimeout(r, 4000));
}
console.log("Guthaben nachher:", await guthaben());
