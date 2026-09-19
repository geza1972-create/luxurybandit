import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { supabaseFetch, BUCKET, encodeStoragePath } from "@/lib/try-this-look-store";
import { mandantLesen, mandantSpeichern } from "@/lib/versusforge-mandanten";
import { filmPfad } from "@/lib/lakatosbandi-film";

/**
 * DIE GANZE KETTE FÜR EIN VIDEO POSTER (Owner 15.09.2026: „musik hast du nicht eingebaut").
 *
 *   1. Pixverse animiert das Werk — mit SEINEM eigenen Bewegungssatz (`bewegung` je Werk)
 *   2. ffmpeg legt den Clip vorwärts und rückwärts aneinander → der Loop hat keine Naht
 *   3. Musik darunter, ein- und ausgeblendet, leise
 *   4. hochladen und `film: true` an der Kachel setzen
 *
 * MUSIK JE MALER (Owner: „für jeden eine andere"), alles gemeinfrei von Wikimedia Commons —
 * Stück UND Einspielung. Bei einem Klassiker ist nur das Werk frei; eine moderne Aufnahme davon
 * wäre es nicht.
 *
 * WAS SCHON FERTIG IST, WIRD ÜBERSPRUNGEN: Der Lauf darf abbrechen und neu starten, ohne einen
 * Clip zweimal zu bezahlen.
 */
const PV = "https://app-api.pixverse.ai/openapi/v2";
const key = process.env.PIXVERSE_API_KEY?.trim();
if (!key) { console.log("PIXVERSE_API_KEY fehlt"); process.exit(1); }
const kopf = (json = false) => ({
  "API-KEY": key, "Ai-trace-id": crypto.randomUUID(),
  ...(json ? { "Content-Type": "application/json" } : {}),
});

const REGEL =
  "Locked-off camera on a tripod. The frame never changes — same crop from first to last frame. "
  + "Keep the original brushstrokes, canvas texture and colours exactly as they are — it must "
  + "still look like the painting, not a photo. Faces must not move or change expression. "
  + "Everything not named below stays perfectly still. Slow, calm, seamless loop.";
const NEGATIV = "zoom, zoom in, zoom out, camera movement, camera pan, dolly, push in, "
  + "parallax, 3d, morphing, distortion, new objects, extra people, text, watermark";

/** Je Maler ein Stück. `ab` ist die Stelle, an der es anfängt — der Anfang ist oft zu leise. */
const MUSIK = {
  vangogh:   { datei: "/tmp/repro/musik.ogg", ab: 12 },           // Satie, Gnossienne 1
  klimt:     { datei: "/tmp/repro/musik.ogg", ab: 60 },           // Satie, andere Stelle
  monet:     { datei: "/tmp/repro/musik-debussy.ogg", ab: 20 },   // Debussy, Clair de lune
  hokusai:   { datei: "/tmp/repro/musik-debussy.ogg", ab: 95 },
  munch:     { datei: "/tmp/repro/musik-grieg.oga", ab: 35 },     // Grieg, Åses Tod
  friedrich: { datei: "/tmp/repro/musik-schubert.wav", ab: 4 },   // Schubert
};

const WERKE = JSON.parse(readFileSync("/tmp/repro/werke.json", "utf8"));
mkdirSync("/tmp/repro/video", { recursive: true });
mkdirSync("/tmp/repro/fertig", { recursive: true });

const guthaben = async () => {
  const d = await fetch(`${PV}/account/balance`, { headers: kopf() }).then(r => r.json()).catch(() => null);
  return (d?.Resp?.credit_monthly ?? 0) + (d?.Resp?.credit_package ?? 0);
};

/** Schritt 1: der rohe Clip von Pixverse. */
const clip = async (w) => {
  const ziel = `/tmp/repro/video/${w.id}.mp4`;
  if (existsSync(ziel)) return ziel;

  const form = new FormData();
  form.append("image", new Blob([readFileSync(w.datei)], { type: "image/jpeg" }), "werk.jpg");
  const up = await fetch(`${PV}/image/upload`, { method: "POST", headers: kopf(), body: form })
    .then(r => r.json()).catch(() => null);
  if (up?.ErrCode !== 0 || !up?.Resp?.img_id) { console.log("   FEHLER Upload", up?.ErrMsg); return null; }

  const gen = await fetch(`${PV}/video/img/generate`, {
    method: "POST", headers: kopf(true),
    body: JSON.stringify({
      duration: 5, img_id: up.Resp.img_id,
      model: process.env.PIXVERSE_MODEL?.trim() || "v6",
      motion_mode: "normal",
      quality: process.env.PIXVERSE_QUALITY?.trim() || "360p",
      prompt: `${REGEL} ${w.bewegung}`, negative_prompt: NEGATIV, generate_audio_switch: false,
    }),
  }).then(r => r.json()).catch(() => null);
  if (gen?.ErrCode !== 0 || !gen?.Resp?.video_id) { console.log("   FEHLER Start", gen?.ErrMsg); return null; }

  for (let i = 0; i < 100; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const d = await fetch(`${PV}/video/result/${gen.Resp.video_id}`, { headers: kopf() })
      .then(r => r.json()).catch(() => null);
    const s = d?.Resp?.status;
    if (s === 1 && d?.Resp?.url) {
      writeFileSync(ziel, Buffer.from(await fetch(String(d.Resp.url)).then(r => r.arrayBuffer())));
      return ziel;
    }
    if (s === 7 || s === 8) { console.log("   abgelehnt, status", s); return null; }
  }
  console.log("   Zeitüberschreitung");
  return null;
};

/**
 * Schritt 2 und 3: nahtloser Loop, Musik darunter.
 *
 * ── ÜBERBLENDUNG STATT RÜCKWÄRTS (Owner 15.09.2026: „kein zoom hin und zurück") ─────────────
 *
 * Zuerst lief der Clip vorwärts und dann rückwärts — die Naht war zwar unsichtbar, aber jede
 * Restbewegung wurde damit zu einem Hin und Zurück: Wolken zogen nach links und gleich wieder
 * nach rechts, ein leichter Zoom atmete ein und aus.
 *
 * Jetzt wird das ENDE über den ANFANG geblendet: Der Film läuft nur in eine Richtung, und die
 * letzte Sekunde geht weich in die erste über. Aus 5 Sekunden werden 4, die sich endlos
 * wiederholen lassen — dreimal aneinandergehängt, damit die Musik nicht alle vier Sekunden neu
 * anfängt.
 */
const fertigmachen = (roh, maler, ziel) => {
  const m = MUSIK[maler] ?? MUSIK.vangogh;
  const zwischen = ziel.replace(/\.mp4$/, "-loop.mp4");
  /**
   * D = 5 s Ausgangsclip, F = 2 s Überblendung → 3 s Schleife.
   *
   * ── WARUM ZWEI SEKUNDEN (Owner 15.09.2026: „der zoom schiebt wieder ins bild rein, dann
   * springt es beim loop") ────────────────────────────────────────────────────────────────
   *
   * Pixverse zoomt trotz Prompt und Negativliste langsam hinein und kehrt nie zurück. Anfang
   * und Ende zeigen deshalb einen anderen Ausschnitt — bei einer kurzen Blende sieht man den
   * Sprung. Über zwei Sekunden verschwimmt der Unterschied und wirkt wie eine gewollte
   * Auflösung statt wie ein Schnittfehler.
   *
   * Das ist ein Behelf, kein Sieg: Die saubere Lösung wäre ein Modell, das eine feste Kamera
   * wirklich einhält.
   */
  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error", "-i", roh,
    "-filter_complex",
    "[0:v]trim=3:5,setpts=PTS-STARTPTS[ende];"
    + "[0:v]trim=0:3,setpts=PTS-STARTPTS[anfang];"
    + "[ende][anfang]xfade=transition=fade:duration=2:offset=0[v]",
    "-map", "[v]", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", zwischen,
  ]);
  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error",
    "-stream_loop", "3", "-i", zwischen,
    "-ss", String(m.ab), "-t", "12", "-i", m.datei,
    /* ── LAUT GENUG (Owner 15.09.2026: „ich höre keinen sound") ──────────────────────────
       Gemessen lag die fertige Datei bei max −23 dB, im Mittel −44 dB — auf Laptop-Lautsprechern
       praktisch stumm. Die Aufnahme von Commons ist selbst schon leise, und `volume=0.5` hat sie
       noch einmal halbiert.

       `loudnorm` bringt sie auf das Mass, das im Netz üblich ist (−16 LUFS, Spitze −1.5 dB) —
       unabhängig davon, wie laut das Stück aufgenommen wurde. Das ist der Grund, warum es je
       Maler eine andere Aufnahme geben kann, ohne dass eine davon schreit. */
    "-filter_complex", "[1:a]afade=t=in:st=0:d=1.2,afade=t=out:st=10.8:d=1.2,loudnorm=I=-16:TP=-1.5:LRA=11[m]",
    "-map", "0:v", "-map", "[m]", "-t", "12",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k",
    "-movflags", "+faststart", ziel,
  ]);
};

const nur = process.env.NUR ? process.env.NUR.split(",") : null;
console.log("Guthaben vorher:", await guthaben());

for (const w of WERKE) {
  if (!w.bewegung) continue;
  const [maler, ...rest] = w.id.split("-");
  const nr = rest.join("-");
  if (nur && !nur.includes(maler)) continue;

  const fertig = `/tmp/repro/fertig/${w.id}.mp4`;
  if (!existsSync(fertig)) {
    console.log("==", w.id);
    const roh = await clip(w);
    if (!roh) continue;
    fertigmachen(roh, maler, fertig);
    await new Promise(r => setTimeout(r, 3000));
  }

  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(filmPfad(maler, nr))}`, {
    method: "POST", headers: { "Content-Type": "video/mp4", "x-upsert": "true" },
    body: new Uint8Array(readFileSync(fertig)),
  });
  console.log("  ", res.ok ? "hoch" : "FEHLER", w.id, res.status);
}

/* Zum Schluss die Merker setzen — einmal je Maler, statt bei jedem Clip den ganzen Datensatz zu
   schreiben (`mandantSpeichern` ersetzt ihn vollständig). */
for (const maler of [...new Set(WERKE.map(w => w.id.split("-")[0]))]) {
  if (nur && !nur.includes(maler)) continue;
  const m = await mandantLesen(maler);
  if (!m?.werkInfo) continue;
  const werkInfo = { ...m.werkInfo };
  for (const nr of Object.keys(werkInfo)) {
    const da = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(filmPfad(maler, nr))}`, { method: "HEAD" })
      .then(r => r.ok).catch(() => false);
    werkInfo[nr] = { ...werkInfo[nr], ...(da ? { film: true, filmAm: new Date().toISOString().slice(0, 16) } : {}) };
  }
  console.log("Merker", maler, await mandantSpeichern(maler, { ...m, werkInfo }));
}
console.log("Guthaben nachher:", await guthaben());
