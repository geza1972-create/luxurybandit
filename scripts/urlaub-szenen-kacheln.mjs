/**
 * Zieht vier Standbilder aus den vorhandenen Urlaubs-Beispielvideos und legt sie als
 * Szenen-Kacheln in `public/szenen-urlaub/` ab.
 *
 * WARUM AUS UNSEREN VIDEOS und nicht neu erzeugt: Die vier Videos zeigen exakt die Szenen,
 * um die es geht (Strand, Altstadt, Boot, Terrasse) — mit demselben Referenzpaar und in
 * demselben Format, das beim echten Kauf herauskommt. Ein gekauftes KI-Bild kostet Geld und
 * wäre trotzdem nur eine Behauptung darüber, was herauskommt. Hausregel: erst vorhandenes
 * Material, gekaufte Bilder nur für den Kern des Produkts.
 *
 * WARUM ALS SKRIPT: Ein Frame aus einem Video zu holen braucht ffmpeg. Das gibt es auf dem
 * Entwicklungsrechner, aber nicht auf Vercel — also einmal hier erzeugen und mit dem Code
 * mitreisen lassen, wie `public/szenen-hochzeit/` und `public/szenen/`.
 *
 * Nutzung:  node scripts/urlaub-szenen-kacheln.mjs          (Probelauf)
 *           node scripts/urlaub-szenen-kacheln.mjs --apply  (Dateien wirklich schreiben)
 */
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

const APPLY = process.argv.includes("--apply");

const env = (() => {
  const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const o = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) o[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return o;
})();

const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;
const BUCKET = env.SUPABASE_STORAGE_BUCKET || "shopcut-images";
if (!URL_BASE || !KEY) { console.error("Supabase-Zugang fehlt in .env.local"); process.exit(1); }

const enc = (p) => p.split("/").map(encodeURIComponent).join("/");
const sb = (path, init = {}) => fetch(`${URL_BASE}${path}`, {
  ...init,
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, ...(init.headers ?? {}) },
});

const signiert = async (pfad, sek = 900) => {
  const r = await sb(`/storage/v1/object/sign/${BUCKET}/${enc(pfad)}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: sek }),
  });
  if (!r.ok) throw new Error(`Signieren fehlgeschlagen (${pfad}): ${r.status}`);
  const d = await r.json();
  return `${URL_BASE}/storage/v1${d.signedURL ?? d.signedUrl}`;
};

/**
 * Welches Video welche Kachel füllt. Die Reihenfolge folgt HOLIDAY_SZENEN in
 * `lib/holiday-invite.ts` — wer dort etwas umsortiert, muss es hier mitziehen.
 */
const ZUORDNUNG = [
  { video: "try-this-look/videos/holiday-example.mp4",   ziel: "urlaub-strand.jpg",   bei: 1.2 },
  { video: "try-this-look/videos/holiday-example-2.mp4", ziel: "urlaub-altstadt.jpg", bei: 1.2 },
  /* BOOT UND TERRASSE FEHLEN ABSICHTLICH (04.08.2026, nach Ansicht der Standbilder).
     `holiday-example-3.mp4` ist eine Nahaufnahme in Dessous, `-4.mp4` spielt in einem
     Innenraum mit Lichterkette — beides stammt aus dem ALTEN Urlaubs-Konzept (Fantasievideo
     mit einem Model) und passt nicht auf eine Einladung, die jemand an einen Menschen
     verschickt. Zwei Kacheln mit dem falschen Inhalt sind schlechter als zwei ohne Bild:
     Die Szenenwahl verspricht sonst etwas, das der Auftrag gar nicht erzeugt.
     Sobald es Aufnahmen von zwei Menschen in normaler Sommerkleidung auf einem Boot und auf
     einer Terrasse gibt, kommen hier zwei Zeilen dazu — sonst nichts. */
];

const ORDNER = resolve(process.cwd(), "public/szenen-urlaub");
const dir = mkdtempSync(join(tmpdir(), "urlaubkachel-"));
let geschrieben = 0;

try {
  if (APPLY && !existsSync(ORDNER)) mkdirSync(ORDNER, { recursive: true });

  for (const { video, ziel, bei } of ZUORDNUNG) {
    let src;
    try {
      src = await signiert(video);
    } catch (e) {
      console.warn(`  ⚠ ${video} — ${e.message} (übersprungen)`);
      continue;
    }
    const mp4 = join(dir, "v.mp4");
    writeFileSync(mp4, Buffer.from(await (await fetch(src)).arrayBuffer()));
    const jpg = join(dir, ziel);
    // Sekunde 1,2 statt 0: Das allererste Bild ist bei Pixverse oft noch halb aufgebaut.
    // 3:4 hart zugeschnitten, weil die Kacheln in der Karte genau dieses Format haben.
    execFileSync("ffmpeg", [
      "-y", "-ss", String(bei), "-i", mp4, "-frames:v", "1",
      "-vf", "crop='min(iw,ih*3/4)':'min(ih,iw*4/3)',scale=480:640",
      "-q:v", "4", jpg,
    ], { stdio: "pipe" });
    const bild = readFileSync(jpg);
    console.log(`  ${ziel} ← ${video.split("/").pop()}  (${Math.round(bild.length / 1024)} kB)`);
    if (APPLY) { writeFileSync(join(ORDNER, ziel), bild); geschrieben++; }
  }

  if (!APPLY) console.log("\nProbelauf — nichts geschrieben. Mit --apply wirklich ablegen.");
  else console.log(`\n${geschrieben} Kacheln in public/szenen-urlaub/ abgelegt.`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
