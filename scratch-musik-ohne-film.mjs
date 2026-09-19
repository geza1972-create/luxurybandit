/**
 * MUSIK FÜR WERKE OHNE FILM (Owner 16.09.2026: „musik fehlt").
 *
 * Nicht jedes Werk wird animiert — der Owner entscheidet, wo sich etwas bewegt. Musik und
 * Geschichte soll aber jedes Poster haben, denn genau das verspricht die Zeile unter dem Code.
 *
 * Also: ein ruhiges Stück aus dem Standbild und der Musik des Künstlers. Kein Pixverse, keine
 * Kosten — nur ffmpeg. Wird später ein echter Film erzeugt, überschreibt er diesen hier.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mandantLesen, mandantSpeichern } from "@/lib/versusforge-mandanten";
import { werkKacheln } from "@/lib/lakatosbandi";
import { supabaseFetch, BUCKET, encodeStoragePath } from "@/lib/try-this-look-store";
import { filmPfad } from "@/lib/lakatosbandi-film";
import { motivPfad } from "@/lib/versusforge-moderation";

/* Je Künstler ein anderes Stück (Owner 15.09.2026: „für jeden eine andere"), alles gemeinfrei. */
const MUSIK = {
  "szidoniabandi-6": { datei: "/tmp/repro/musik-debussy.ogg", ab: 150 },
  "gerrylouisett-2": { datei: "/tmp/repro/musik.ogg", ab: 95 },
  /* Die Meister behalten ihr Stück — neue Werke bekommen dasselbe wie ihre Geschwister. */
  klimt: { datei: "/tmp/repro/musik.ogg", ab: 60 },
  monet: { datei: "/tmp/repro/musik-debussy.ogg", ab: 20 },
  hokusai: { datei: "/tmp/repro/musik-debussy.ogg", ab: 95 },
  munch: { datei: "/tmp/repro/musik-grieg.oga", ab: 35 },
  friedrich: { datei: "/tmp/repro/musik-schubert.wav", ab: 4 },
  vangogh: { datei: "/tmp/repro/musik.ogg", ab: 12 },
};

const dir = mkdtempSync(join(tmpdir(), "still-"));
const jetzt = new Date().toISOString();
const nur = process.env.NUR ? process.env.NUR.split(",") : Object.keys(MUSIK);

for (const kennung of nur) {
  const m = await mandantLesen(kennung);
  if (!m?.werkInfo) { console.log(kennung, "—"); continue; }
  const musik = MUSIK[kennung];
  if (!musik || !existsSync(musik.datei)) { console.log(kennung, "keine Musik hinterlegt"); continue; }
  const werkInfo = { ...m.werkInfo };
  let n = 0;
  for (const k of werkKacheln(m)) {
    const nr = k.i < 0 ? "standard" : String(k.i);
    if (werkInfo[nr]?.film && !process.env.NEU) continue;   // echter Film hat Vorrang (NEU=1 überschreibt Standbilder)
    if (werkInfo[nr]?.produkt) continue;                    // Kleidung braucht keine Musik
    const r = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(motivPfad(kennung, nr))}`);
    if (!r.ok) continue;
    const bild = join(dir, `${kennung}-${nr}.jpg`);
    writeFileSync(bild, Buffer.from(await r.arrayBuffer()));
    const ziel = join(dir, `${kennung}-${nr}.mp4`);
    const stumm = join(dir, `${kennung}-${nr}-stumm.mp4`);
    /**
     * ── EIN LANGSAMER ZOOM, KOSTENLOS (Owner 16.09.2026: „hast du eine animation gemacht? wäre
     * gut. etwas kostenloses. bild soll endlich reinzoomen vielleicht") ──────────────────────
     *
     * 14 Sekunden fahren langsam ins Bild hinein — 12 % über die ganze Zeit, kaum sichtbar von
     * Moment zu Moment und doch lebendig. Danach wird das ENDE über den ANFANG geblendet, so
     * dass die Schleife nicht springt: dieselbe Lösung wie bei den Pixverse-Filmen, nur dass
     * hier kein Modell rechnet, sondern ffmpeg. Kostet nichts.
     *
     * Gezoomt wird auf einer VIERFACH vergrösserten Fassung; `zoompan` rechnet sonst in ganzen
     * Pixeln und das Bild ruckelt sichtbar.
     */
    /* ── LANG GENUG, DASS DIE MUSIK NICHT VON VORN ANFÄNGT (Owner 16.09.2026: „die musik soll
       weiterlaufen nicht neu anfangen") ──────────────────────────────────────────────────────
       Zwölf Sekunden waren zu kurz: Wer das Werk ansieht, hört das Stück dreimal beginnen. 50
       Sekunden Zoom ergeben 46 Sekunden Schleife — so lange sieht kaum jemand hin, und der
       Zoom wird dabei noch ruhiger. Ein Standbild komprimiert gut, die Datei bleibt klein. */
    const D = 50, F = 4, FPS = 25;
    const LAUF = D - F;
    /* Die Zielgrösse folgt dem WERK — `zoompan` verlangt feste Masse, und ein fester Wert
       machte aus jedem Gemälde ein Quadrat (16.09.2026 gesehen). Lange Seite 1080, gerade
       Kanten, weil h264 ungerade nicht mag. */
    const [bw, bh] = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v",
      "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", bild]).toString().trim().split("x").map(Number);
    const skala = 1080 / Math.max(bw, bh);
    const zw = Math.max(2, Math.round(bw * skala / 2) * 2);
    const zh = Math.max(2, Math.round(bh * skala / 2) * 2);
    execFileSync("ffmpeg", [
      "-y", "-loglevel", "error", "-loop", "1", "-i", bild,
      "-vf", `scale=${zw * 4}:${zh * 4},zoompan=z='min(1+0.12*on/(${D}*${FPS}),1.12)':d=${D * FPS}`
        + `:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${zw}x${zh}:fps=${FPS}`,
      "-t", String(D), "-c:v", "libx264", "-pix_fmt", "yuv420p", stumm,
    ]);
    execFileSync("ffmpeg", [
      "-y", "-loglevel", "error", "-i", stumm,
      "-ss", String(musik.ab), "-t", String(LAUF), "-i", musik.datei,
      "-filter_complex",
      `[0:v]trim=${F}:${D},setpts=PTS-STARTPTS[ende];`
      + `[0:v]trim=0:${F},setpts=PTS-STARTPTS[anfang];`
      + `[ende][anfang]xfade=transition=fade:duration=${F}:offset=${D - 2 * F}[v];`
      + `[1:a]afade=t=in:st=0:d=1.5,afade=t=out:st=${LAUF - 1.5}:d=1.5,loudnorm=I=-16:TP=-1.5:LRA=11[m]`,
      "-map", "[v]", "-map", "[m]", "-t", String(LAUF),
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k",
      "-movflags", "+faststart", ziel,
    ]);
    const hoch = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(filmPfad(kennung, nr))}`, {
      method: "POST", headers: { "Content-Type": "video/mp4", "x-upsert": "true" },
      body: new Uint8Array(readFileSync(ziel)),
    });
    if (hoch.ok) { werkInfo[nr] = { ...werkInfo[nr], film: true, filmAm: jetzt }; n++; }
    else console.log("  FEHLER", nr, hoch.status);
  }
  console.log(kennung, "vertont:", n, await mandantSpeichern(kennung, { ...m, werkInfo }));
}
