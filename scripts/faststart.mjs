/**
 * JEDES VIDEO UNTER public/ MUSS SEINEN KOPF VORN HABEN ("faststart").
 *
 * Owner 18.08.2026: „Die Videos hängen grundsätzlich. Egal ob lokal oder online."
 *
 * DAS WAR DER GRUND. Eine MP4-Datei besteht aus zwei Teilen: `mdat` sind die Bilder, `moov` ist
 * das Inhaltsverzeichnis (Dauer, wo welches Bild liegt). Steht `moov` HINTEN, kann der Browser
 * nichts anfangen, bis die Datei fast vollständig geladen ist — er weiss ja nicht, wo etwas
 * liegt. Kein erstes Bild, keine `duration`, kein Sprung an eine Stelle. Er wartet.
 *
 * Gemessen an public/Tryon/tryon-9.mp4 (1,9 MB):
 *   moov hinten  → nach 1024 KB immer noch nicht abspielbar (er braucht praktisch alles)
 *   moov vorn    → nach 64 KB abspielbar
 *
 * Das ist der Unterschied zwischen „läuft sofort" und „hängt" — und er ist unabhängig von der
 * Leitung, deshalb sah der Owner ihn LOKAL genauso wie online.
 *
 * 29 der 50 Dateien waren betroffen. Nicht aus Nachlässigkeit: `compress-videos.mjs` setzt
 * `+faststart` korrekt — aber Videos, die direkt von den Anbietern (Pixverse, fal, HeyGen) über
 * `download-videos.mjs` hereinkommen, werden nur gespeichert, nie umgepackt. Sie bringen die
 * Anordnung des Anbieters mit, und die ist oft `mdat` zuerst.
 *
 * DESHALB DIESES WERKZEUG: Nach jedem neuen Video hier drüberlaufen. Es packt nur um
 * (`-c copy`) — kein Neu-Kodieren, kein Qualitätsverlust, die Bilder bleiben Bit für Bit
 * dieselben. Nur die beiden Blöcke tauschen den Platz.
 *
 * Nutzung (im Projektordner):
 *   node scripts/faststart.mjs            # Probelauf: sagt nur, welche Dateien hinten liegen
 *   node scripts/faststart.mjs --apply    # packt sie wirklich um
 *
 * Sicherheit:
 *  - Standardmäßig PROBELAUF. Erst `--apply` schreibt.
 *  - Geschrieben wird erst, wenn die neue Datei geprüft ist: moov vorn UND gleiche Dauer.
 *    Schlägt eine der beiden Proben fehl, bleibt das Original unangetastet.
 *  - Idempotent: Dateien mit moov vorn werden übersprungen.
 *  - Braucht ffmpeg/ffprobe im PATH. NICHT in `prebuild` einhängen — auf Vercel gibt es
 *    kein ffmpeg; das ist ein Werkzeug für diesen Rechner.
 */

import { readdirSync, statSync, openSync, readSync, closeSync, copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

const APPLY = process.argv.includes("--apply");
const WURZEL = resolve("public");

/** Alle .mp4 unter public/, rekursiv. */
function videos(ordner) {
  const raus = [];
  for (const e of readdirSync(ordner, { withFileTypes: true })) {
    const p = join(ordner, e.name);
    if (e.isDirectory()) raus.push(...videos(p));
    else if (e.name.toLowerCase().endsWith(".mp4")) raus.push(p);
  }
  return raus;
}

/**
 * Die Reihenfolge der Blöcke auf oberster Ebene — ohne ffprobe, direkt aus den Längenfeldern.
 * Ein MP4 ist eine Kette: 4 Byte Länge, 4 Byte Name, dann Inhalt. Wir springen von Kopf zu Kopf.
 * Länge 1 heisst „die echte Länge steht als 64-Bit-Zahl dahinter" (Dateien über 4 GB).
 */
function bloecke(datei) {
  const fd = openSync(datei, "r");
  try {
    const gross = statSync(datei).size;
    const kopf = Buffer.alloc(16);
    const namen = [];
    let off = 0;
    while (namen.length < 12 && off < gross) {
      if (readSync(fd, kopf, 0, 16, off) < 8) break;
      let laenge = kopf.readUInt32BE(0);
      const name = kopf.toString("latin1", 4, 8);
      if (laenge === 1) laenge = Number(kopf.readBigUInt64BE(8));
      namen.push(name);
      if (laenge <= 0) break;
      off += laenge;
    }
    return namen;
  } finally {
    closeSync(fd);
  }
}

/** Liegt der Kopf hinten? (moov vorhanden, aber nach mdat) */
function kopfHinten(datei) {
  const b = bloecke(datei);
  return b.includes("moov") && b.includes("mdat") && b.indexOf("mdat") < b.indexOf("moov");
}

function dauer(datei) {
  const s = execFileSync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", datei,
  ], { encoding: "utf8" }).trim();
  return Number(s);
}

const alle = videos(WURZEL);
const betroffen = alle.filter(kopfHinten);

console.log(`${alle.length} Videos unter public/ — ${betroffen.length} mit moov HINTEN.\n`);
if (!betroffen.length) {
  console.log("Alles in Ordnung: jedes Video startet, sobald die ersten Kilobyte da sind.");
  process.exit(0);
}

for (const f of betroffen) {
  const mb = (statSync(f).size / 1048576).toFixed(1);
  console.log(`  ${APPLY ? "packe um" : "würde umpacken"}  ${mb.padStart(5)} MB  ${f.replace(resolve(".") + "/", "")}`);
}

if (!APPLY) {
  console.log(`\nProbelauf — nichts geschrieben. Mit --apply wirklich umpacken:\n  node scripts/faststart.mjs --apply`);
  process.exit(0);
}

const tmp = mkdtempSync(join(tmpdir(), "faststart-"));
let ok = 0, schlecht = 0;
try {
  for (const f of betroffen) {
    const ziel = join(tmp, "out.mp4");
    try {
      rmSync(ziel, { force: true });
      // Nur umpacken: -c copy kopiert die Spuren unverändert, -map 0 nimmt ALLE mit (auch Ton).
      execFileSync("ffmpeg", ["-v", "error", "-y", "-i", f, "-c", "copy", "-map", "0", "-movflags", "+faststart", ziel]);
      const gleich = Math.abs(dauer(f) - dauer(ziel)) < 0.05;
      if (kopfHinten(ziel) || !gleich) {
        console.log(`  FEHLER, Original bleibt: ${f} (kopf-vorn=${!kopfHinten(ziel)} dauer-gleich=${gleich})`);
        schlecht++;
        continue;
      }
      copyFileSync(ziel, f);
      ok++;
    } catch (e) {
      console.log(`  FEHLER, Original bleibt: ${f} — ${String(e.message || e).split("\n")[0]}`);
      schlecht++;
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
console.log(`\n${ok} umgepackt, ${schlecht} fehlgeschlagen.`);
