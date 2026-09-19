#!/usr/bin/env node
/**
 * WERBEFILM — BILDSCHIRM IM HANDYFORMAT + DU IM KREIS UNTEN LINKS
 *
 * Owner 18.09.2026: „ich muss, während ich mir die Webseite anschaue, erklären können, und du
 * musst mich aufnehmen und den Screen im Handyformat" · „ich will das Ganze auf dem Mac machen"
 * · „für uns — für YouTube und Meta und Webseite als Werbefilme".
 *
 * ── WARUM EIN WERKZEUG AUF DEM MAC UND KEINES IM BROWSER ────────────────────────────────────
 *
 * Eine Aufnahme im Browser (`canvas` + `MediaRecorder`) lief hier zuerst. Sie kann drei Dinge
 * nicht, die diese Anzeige braucht: den ECHTEN Bildschirm zeigen (du willst durch die Seite
 * klicken, nicht durch einen Nachbau), verlässlich MP4 schreiben (Meta nimmt kein webm), und
 * ohne Echtzeit rendern. ffmpeg kann alle drei. Es liegt auf diesem Rechner (8.1.2).
 *
 * ── DER TON GEHÖRT ZUR KAMERA, NICHT ZUM BILDSCHIRM ─────────────────────────────────────────
 *
 * Zwei getrennte Aufnahmen laufen gleichzeitig: der Bildschirm ohne Ton, und die Kamera MIT
 * Mikrofon in EINER Datei. Läge der Ton beim Bildschirm, wären Stimme und Lippen zwei Spuren
 * aus zwei Prozessen — und man sieht jede Zehntelsekunde Abweichung im Gesicht. So ist die
 * Lippensynchronität von Haus aus richtig; verschiebt sich etwas, dann nur der Bildschirm gegen
 * die Stimme, und das rückt `--versatz` zurecht.
 *
 * ── DREI FORMATE, EIN LAUF ──────────────────────────────────────────────────────────────────
 *
 * Meta-Feed 4:5, Reels/Shorts 9:16, YouTube und die eigene Seite 16:9. Es ist derselbe Film:
 * derselbe Bildschirm, dieselbe Aufnahme von dir, nur anders beschnitten und der Kreis anders
 * platziert. Wer je Kanal einmal neu aufnimmt, hat drei verschiedene Filme und weiss nachher
 * nicht, welcher gewirkt hat.
 *
 * ── DREI BEFEHLE ────────────────────────────────────────────────────────────────────────────
 *
 *   node scripts/werbefilm.mjs geraete
 *       Zeigt, welche Nummer Bildschirm, Kamera und Mikrofon haben.
 *
 *   node scripts/werbefilm.mjs aufnehmen --fenster chrome --dauer 90
 *       Nimmt auf. `--fenster chrome` schneidet auf das vorderste Chrome-Fenster zu (so wird
 *       der Bildschirm zum Handyformat: Fenster schmal ziehen, Seite ansehen, sprechen).
 *       Stoppt nach `--dauer` Sekunden oder sofort mit Strg-C. Baut danach den Film.
 *
 *   node scripts/werbefilm.mjs bauen --screen … --kamera … --format 9:16
 *       Legt zwei vorhandene Aufnahmen übereinander. Für den Fall, dass du selbst aufnimmst
 *       (QuickTime, Handy) und ich nur noch zusammenlege.
 *
 * ── WAS EINMAL ERLAUBT WERDEN MUSS (und was ich nicht für dich tun kann) ────────────────────
 *
 * macOS fragt beim ERSTEN Lauf nach „Bildschirmaufnahme", „Kamera" und „Mikrofon" — für das
 * Programm, in dem dieser Befehl läuft (Terminal, iTerm, Claude). Ohne diese Erlaubnis liefert
 * ffmpeg ein schwarzes Bild oder bricht ab. Systemeinstellungen → Datenschutz & Sicherheit.
 */

import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, existsSync, statSync, readdirSync, createReadStream } from "node:fs";
import { resolve, basename } from "node:path";
import { createServer } from "node:http";

/* ── DIE FORMATE ──────────────────────────────────────────────────────────────────────────────
   `kreis` ist Mittelpunkt und Durchmesser als Anteil der Bildbreite/-höhe. Unten links, weil
   unten rechts in jeder App die Bedienelemente liegen; bei 9:16 zusätzlich höher, weil dort
   Beschriftung und Knöpfe von Reels und Shorts stehen. */
const FORMATE = {
  "4:5": { b: 1080, h: 1350, kreis: { d: 0.30, x: 0.05, y: 0.735 }, name: "meta-feed" },
  "9:16": { b: 1080, h: 1920, kreis: { d: 0.30, x: 0.05, y: 0.665 }, name: "reels-shorts" },
  "16:9": { b: 1920, h: 1080, kreis: { d: 0.26, x: 0.03, y: 0.66 }, name: "youtube" },
};

const HILFE = `
werbefilm — Bildschirm im Handyformat + du im Kreis unten links

  node scripts/werbefilm.mjs ui            ← die Oberflaeche (Regelfall)
  node scripts/werbefilm.mjs geraete
  node scripts/werbefilm.mjs aufnehmen [--fenster chrome|vollbild|x,y,b,h] [--dauer 90]
                                       [--format 9:16|4:5|16:9|alle] [--kamera N] [--mikro N]
                                       [--bildschirm N] [--out ordner]
  node scripts/werbefilm.mjs bauen --screen DATEI --kamera DATEI [--format …] [--versatz 0]
                                   [--fenster x,y,b,h] [--out ordner]

Beispiel (der Regelfall):
  Chrome schmal ziehen (etwa 420 × 900), lakatosbandi.com öffnen, dann
  node scripts/werbefilm.mjs aufnehmen --fenster chrome --dauer 60 --format alle
`;

const args = process.argv.slice(2);
const befehl = args[0] ?? "";
const opt = (name, vorgabe = "") => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : vorgabe;
};

const ffmpeg = "ffmpeg";
const ffprobe = "ffprobe";

function pruefeFfmpeg() {
  const r = spawnSync(ffmpeg, ["-version"], { encoding: "utf8" });
  if (r.error) {
    console.error("ffmpeg fehlt. Mit Homebrew: brew install ffmpeg");
    process.exit(1);
  }
}

/* ── WELCHE NUMMER HAT WAS ────────────────────────────────────────────────────────────────────
   avfoundation kennt Geräte nur über ihre Nummer, und die Nummern verschieben sich, sobald ein
   Gerät dazukommt (Handy als Kamera, zweiter Bildschirm, Kopfhörer). Deshalb wird sie bei jedem
   Lauf gelesen statt in einer Datei gemerkt. */
function geraeteLesen() {
  const r = spawnSync(ffmpeg, ["-hide_banner", "-f", "avfoundation", "-list_devices", "true", "-i", ""], { encoding: "utf8" });
  const text = `${r.stderr ?? ""}`;
  const video = [], audio = [];
  let wo = "";
  for (const zeile of text.split("\n")) {
    if (zeile.includes("AVFoundation video devices")) { wo = "v"; continue; }
    if (zeile.includes("AVFoundation audio devices")) { wo = "a"; continue; }
    const treffer = zeile.match(/\[(\d+)\]\s+(.+?)\s*$/);
    if (!treffer || !wo) continue;
    /* Die Zeile trägt vorne noch „[AVFoundation indev @ …]" — die Nummer ist die LETZTE Klammer. */
    const alle = [...zeile.matchAll(/\[(\d+)\]\s*([^[\]]+?)\s*$/g)];
    const m = alle[alle.length - 1];
    if (!m) continue;
    (wo === "v" ? video : audio).push({ nr: Number(m[1]), name: m[2].trim() });
  }
  return { video, audio, roh: text };
}

const istBildschirm = g => /capture screen|screen capture/i.test(g.name);
const istKamera = g => !istBildschirm(g);

/* ── WELCHES MIKROFON (Prüflauf 18.09.2026) ──────────────────────────────────────────────────
   Auf diesem Rechner liegen acht Tongeräte, und sieben davon sind virtuelle Kanäle von Zoom,
   Teams, Webex, AirBeamTV und Immersed. Nummer 0 ist also fast nie das Mikrofon. Gesucht wird
   deshalb das eingebaute, und virtuelle Kanäle werden ausgeschlossen: Eine Aufnahme mit
   „ZoomAudioDevice" ist stumm, und das merkt man erst nach dem Sprechen. */
const VIRTUELL = /zoom|teams|webex|virtual|airbeam|immersed|blackhole|loopback|soundflower|speakers|ausgabe|output/i;
const mikroVorschlag = audio => (
  audio.find(a => /mikrofon|microphone/i.test(a.name) && /macbook|built|intern/i.test(a.name))
  ?? audio.find(a => /mikrofon|microphone/i.test(a.name) && !VIRTUELL.test(a.name))
  ?? audio.find(a => !VIRTUELL.test(a.name))
  ?? audio[0]
)?.nr ?? 0;

/* ── DAS FENSTER, DAS AUFGENOMMEN WIRD ───────────────────────────────────────────────────────
   Der Bildschirm wird ganz aufgenommen und danach auf das Fenster zugeschnitten. Andersherum
   (nur das Fenster aufnehmen) kann avfoundation nicht, und ein Zuschnitt nach der Aufnahme hat
   einen Vorteil: Verschiebst du das Fenster während der Aufnahme, ist die Aufnahme nicht
   verloren — du korrigierst den Zuschnitt beim Bauen.

   AppleScript liefert die Ecken des vordersten Fensters. Punkte, nicht Pixel: Auf einem
   Retina-Bildschirm ist die Aufnahme doppelt so gross wie die Fensterangabe, deshalb wird mit
   dem Verhältnis Aufnahme-Breite zu Bildschirm-Breite hochgerechnet. */
function fensterVonApp(app) {
  const skript = `tell application "System Events" to tell process "${app}"
    set b to position of front window
    set g to size of front window
    return (item 1 of b as text) & "," & (item 2 of b as text) & "," & (item 1 of g as text) & "," & (item 2 of g as text)
  end tell`;
  const r = spawnSync("osascript", ["-e", skript], { encoding: "utf8" });
  const t = `${r.stdout ?? ""}`.trim();
  if (!/^-?\d+,-?\d+,\d+,\d+$/.test(t)) return null;
  const [x, y, b, h] = t.split(",").map(Number);
  return { x, y, b, h };
}

function bildschirmPunkte() {
  const r = spawnSync("osascript", ["-e", 'tell application "Finder" to get bounds of window of desktop'], { encoding: "utf8" });
  const t = `${r.stdout ?? ""}`.trim().split(",").map(s => Number(s.trim()));
  return t.length === 4 ? { b: t[2], h: t[3] } : null;
}

function masseVon(datei) {
  const r = spawnSync(ffprobe, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", datei], { encoding: "utf8" });
  const [b, h] = `${r.stdout ?? ""}`.trim().split(",").map(Number);
  return Number.isFinite(b) && Number.isFinite(h) ? { b, h } : null;
}

/* ── DER ZUSAMMENBAU ─────────────────────────────────────────────────────────────────────────
   Ein Filtergraph, drei Schritte:
     1. Der Bildschirm wird auf das Fenster zugeschnitten, dann formatfüllend auf die Zielmasse
        gebracht (`increase` + zweiter Zuschnitt) — nie verzerrt, lieber beschnitten.
     2. Die Kamera wird quadratisch beschnitten und mit `geq` rund gemacht: Alles aussserhalb des
        Radius bekommt Alpha 0. Darunter liegt eine cremefarbene Scheibe als Rand — dieselbe
        Papierfarbe wie auf dem Poster, damit der Kreis zum Haus gehört und nicht zu Zoom.
     3. Der Ton kommt aus der Kameradatei (Stimme und Lippen aus einem Prozess).
   `--versatz` verschiebt den Bildschirm gegen die Stimme, falls der eine Prozess später
   angelaufen ist als der andere. */
function bauen({ screen, kamera, format, versatz, fenster, out, rahmen = false }) {
  const F = FORMATE[format];
  const m = masseVon(screen);
  if (!m) { console.error(`Kann ${screen} nicht lesen.`); process.exit(1); }

  let zuschnitt = `crop=${m.b}:${m.h}:0:0`;
  if (fenster) {
    /* Punkte → Pixel: Verhältnis aus Aufnahmebreite und Bildschirmbreite in Punkten. */
    const pkt = bildschirmPunkte();
    const skala = pkt && pkt.b ? m.b / pkt.b : 1;
    const x = Math.max(0, Math.round(fenster.x * skala));
    const y = Math.max(0, Math.round(fenster.y * skala));
    const b = Math.min(m.b - x, Math.round(fenster.b * skala));
    const h = Math.min(m.h - y, Math.round(fenster.h * skala));
    zuschnitt = `crop=${b}:${h}:${x}:${y}`;
    console.log(`Zuschnitt auf das Fenster: ${b}×${h} bei ${x},${y} (Faktor ${skala.toFixed(2)})`);
  }

  const d = Math.round(F.b * F.kreis.d);
  const kx = Math.round(F.b * F.kreis.x);
  const ky = Math.round(F.h * F.kreis.y);
  const rand = 6;

  const filter = [
    ...(rahmen
      ? rahmenFilter(zuschnitt, F)
      : [`[0:v]${zuschnitt},scale=${F.b}:${F.h}:force_original_aspect_ratio=increase,crop=${F.b}:${F.h},setsar=1,format=yuv420p[bg]`]),
    /* Die Scheibe als Rand — cremefarben (#f4efe2), rund geschnitten. */
    `color=c=0xf4efe2:s=${d}x${d}:d=1,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte(hypot(X-${d / 2}\\,Y-${d / 2})\\,${d / 2}),255,0)'[scheibe]`,
    /* Die Kamera: quadratisch, rund, etwas kleiner als die Scheibe. */
    `[1:v]crop='min(iw,ih)':'min(iw,ih)',scale=${d - 2 * rand}:${d - 2 * rand},format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte(hypot(X-${(d - 2 * rand) / 2}\\,Y-${(d - 2 * rand) / 2})\\,${(d - 2 * rand) / 2}),255,0)'[cam]`,
    `[bg][scheibe]overlay=x=${kx}:y=${ky}:shortest=0[mitRand]`,
    `[mitRand][cam]overlay=x=${kx + rand}:y=${ky + rand}:shortest=0,format=yuv420p[v]`,
  ].join(";");

  mkdirSync(out, { recursive: true });
  const ziel = resolve(out, `werbefilm-${F.name}-${format.replace(":", "x")}.mp4`);
  const argv = [
    "-y", "-hide_banner",
    ...(versatz ? ["-itsoffset", String(versatz)] : []),
    "-i", screen,
    "-i", kamera,
    "-filter_complex", filter,
    "-map", "[v]", "-map", "1:a?",
    "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest",
    ziel,
  ];
  console.log(`\nBaue ${format} → ${ziel}`);
  const r = spawnSync(ffmpeg, argv, { stdio: ["ignore", "inherit", "inherit"] });
  if (r.status !== 0) { console.error("ffmpeg hat abgebrochen."); process.exit(1); }
  console.log(`Fertig: ${ziel} (${(statSync(ziel).size / 1e6).toFixed(1)} MB)`);
  return ziel;
}

/* ── DIE AUFNAHME ────────────────────────────────────────────────────────────────────────────
   Zwei Prozesse, so gleichzeitig wie möglich gestartet. Beide schreiben unkomprimiert schnell
   weg (`-c:v libx264 -preset ultrafast`): Beim Aufnehmen darf der Rechner nicht rechnen, sonst
   fallen Bilder aus. Gerechnet wird beim Bauen.

   GESTOPPT WIRD MIT „q" AN BEIDE — nicht mit `kill`: ffmpeg schreibt sonst keinen Abschluss in
   die Datei, und eine mov ohne Abschluss ist kaputt. */
async function aufnehmen() {
  const g = geraeteLesen();
  if (!g.video.length) {
    console.error("Kein Video-Gerät gefunden. Fehlt die Erlaubnis für Bildschirmaufnahme oder Kamera?\n");
    console.error(g.roh.split("\n").filter(z => z.includes("AVFoundation")).join("\n"));
    process.exit(1);
  }
  const bildschirmNr = Number(opt("bildschirm", String(g.video.find(istBildschirm)?.nr ?? 1)));
  const kameraNr = Number(opt("kamera", String(g.video.find(istKamera)?.nr ?? 0)));
  const mikroNr = Number(opt("mikro", String(mikroVorschlag(g.audio))));
  const dauer = Number(opt("dauer", "60"));
  const format = opt("format", "9:16");
  const out = resolve(opt("out", "werbefilm-ausgabe"));
  const fensterWahl = opt("fenster", "chrome");

  let fenster = null;
  if (/^-?\d+,-?\d+,\d+,\d+$/.test(fensterWahl)) {
    const [x, y, b, h] = fensterWahl.split(",").map(Number);
    fenster = { x, y, b, h };
  } else if (fensterWahl !== "vollbild") {
    const app = fensterWahl.toLowerCase() === "chrome" ? "Google Chrome" : fensterWahl;
    fenster = fensterVonApp(app);
    if (!fenster) console.log(`Das Fenster von ${app} ist nicht auslesbar — ich nehme den ganzen Bildschirm.`);
    else console.log(`Fenster ${app}: ${fenster.b} × ${fenster.h} Punkte bei ${fenster.x},${fenster.y}`);
  }

  mkdirSync(out, { recursive: true });
  const screenDatei = resolve(out, "roh-bildschirm.mov");
  const kameraDatei = resolve(out, "roh-kamera.mov");

  console.log(`\nBildschirm: [${bildschirmNr}] · Kamera: [${kameraNr}] · Mikrofon: [${mikroNr}]`);
  console.log(`Aufnahme läuft bis zu ${dauer} s — mit Strg-C früher beenden.\n`);

  const gemeinsam = ["-y", "-hide_banner", "-loglevel", "warning", "-f", "avfoundation", "-framerate", "30"];
  const p1 = spawn(ffmpeg, [...gemeinsam, "-capture_cursor", "1", "-i", `${bildschirmNr}:none`,
    "-t", String(dauer), "-c:v", "libx264", "-preset", "ultrafast", "-crf", "18", "-pix_fmt", "yuv420p", screenDatei],
    { stdio: ["pipe", "inherit", "inherit"] });
  const p2 = spawn(ffmpeg, [...gemeinsam, "-i", `${kameraNr}:${mikroNr}`,
    "-t", String(dauer), "-c:v", "libx264", "-preset", "ultrafast", "-crf", "20", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k", kameraDatei],
    { stdio: ["pipe", "inherit", "inherit"] });

  const beenden = () => { try { p1.stdin.write("q"); p2.stdin.write("q"); } catch { /* schon aus */ } };
  process.on("SIGINT", () => { console.log("\nStoppe …"); beenden(); });

  /* Eine Sekunde Vorlauf zum Zählen, dann läuft es. */
  for (const s of ["3", "2", "1", "los."]) {
    console.log(s);
    await new Promise(r => setTimeout(r, 700));
  }

  await Promise.all([new Promise(r => p1.on("close", r)), new Promise(r => p2.on("close", r))]);
  console.log(`\nAufnahmen liegen in ${out}`);

  if (!existsSync(screenDatei) || !existsSync(kameraDatei)) {
    console.error("Eine der beiden Aufnahmen fehlt — vermutlich fehlt eine Erlaubnis.");
    process.exit(1);
  }
  const formate = format === "alle" ? Object.keys(FORMATE) : [format];
  for (const f of formate) bauen({ screen: screenDatei, kamera: kameraDatei, format: f, versatz: Number(opt("versatz", "0")), fenster, out, rahmen: !args.includes("--ohne-rahmen") });
}

/* ── DER RAHMEN UM DEN BILDSCHIRM (der Unterschied zwischen Aufnahme und Anzeige) ────────────
   Die gekauften Werkzeuge verkaufen im Kern DAS: der Bildschirm liegt nicht randlos im Bild,
   sondern als Blatt mit runden Ecken auf einer ruhigen Fläche. Es kostet nichts und macht aus
   einer Bildschirmaufnahme etwas, das man in einen Feed stellen kann — dieselbe Papierfarbe wie
   das Poster, damit der Film zum Haus gehört.

   Gebaut mit `geq` auf dem Alphakanal: Alles außerhalb eines Rechtecks mit abgerundeten Ecken
   wird durchsichtig, darunter liegt die Fläche. Kein Schatten — der ist in ffmpeg teuer und auf
   Creme kaum zu sehen. */
const rahmenFilter = (zuschnitt, F, radius = 28, luft = 0.06) => {
  const iw = Math.round(F.b * (1 - 2 * luft));
  const ih = Math.round(F.h * (1 - 2 * luft));
  const x = Math.round((F.b - iw) / 2), y = Math.round((F.h - ih) / 2);
  return [
    `color=c=0xf4efe2:s=${F.b}x${F.h}:d=1[flaeche]`,
    `[0:v]${zuschnitt},scale=${iw}:${ih}:force_original_aspect_ratio=increase,crop=${iw}:${ih},setsar=1,format=rgba,` +
      `geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':` +
      `a='if(gt(hypot(max(0\,abs(X-${iw / 2})-${iw / 2 - radius})\,max(0\,abs(Y-${ih / 2})-${ih / 2 - radius})),${radius}),0,255)'[blatt]`,
    `[flaeche][blatt]overlay=x=${x}:y=${y}:shortest=0,format=yuv420p[bg]`,
  ];
};

/* ══ DIE OBERFLÄCHE ════════════════════════════════════════════════════════════════════════
   (Owner 18.09.2026: „aber wieso nicht ein Tool, das ich sowieso brauche? … es gibt so was zu
   kaufen für viel Geld. Du kannst so was doch sofort bauen, oder?" · „also ein Tool, das die
   Vorderkamera und Screenaufnahme startet")

   Ein eigener kleiner Server, KEINE Seite in der Next-App: Das Werkzeug soll laufen, wenn der
   Entwicklungsserver aus ist, und es hat mit lakatosbandi.com nichts zu tun außer dem Motiv.
   Die Aufnahme läuft im Node-Prozess — die Erlaubnis für Bildschirm, Kamera und Mikrofon hängt
   deshalb an dem Programm, in dem dieser Befehl gestartet wurde, und wird nur EINMAL gefragt.

   Nur örtlich: Der Server hört auf 127.0.0.1. Ein Werkzeug, das Kamera und Bildschirm aufnimmt,
   gehört nicht ins Netz. */
let lauf = null;

const SEITE = `<!doctype html><html lang="de"><meta charset="utf-8">
<title>Werbefilm-Studio</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  :root { --papier:#f4efe2; --tinte:#22201b; --grau:#8a8375; --kante:#ddd4c0; }
  * { box-sizing:border-box }
  body { margin:0; padding:28px; background:var(--papier); color:var(--tinte);
         font:16px/1.5 Georgia,"Times New Roman",serif }
  h1 { font-size:26px; margin:0 0 4px }
  p.unter { color:var(--grau); margin:0 0 22px }
  fieldset { border:1px solid var(--kante); border-radius:12px; margin:0 0 16px; padding:14px 16px }
  legend { padding:0 6px; color:var(--grau); font-size:13px; letter-spacing:.16em; text-transform:uppercase;
           font-family:ui-sans-serif,system-ui,sans-serif }
  label { display:block; font-size:14px; margin:0 0 4px }
  select, input[type=text], input[type=number] { width:100%; padding:8px 10px; border:1px solid var(--kante);
           border-radius:8px; background:#fffdf8; color:var(--tinte); font:15px Georgia,serif }
  .reihe { display:flex; gap:12px; flex-wrap:wrap }
  .reihe > div { flex:1 1 180px }
  button { border:0; border-radius:999px; padding:12px 22px; font:15px/1 Georgia,serif; cursor:pointer }
  .los { background:var(--tinte); color:var(--papier) }
  .stopp { background:#b23a2f; color:#fff }
  .neben { background:transparent; color:var(--tinte); border:1px solid var(--kante) }
  button[disabled] { opacity:.45; cursor:default }
  .knoepfe { display:flex; gap:10px; align-items:center; flex-wrap:wrap }
  .stand { font-family:ui-sans-serif,system-ui,sans-serif; font-size:14px; color:var(--grau) }
  .haken { display:inline-flex; align-items:center; gap:6px; margin-right:14px; font-size:14px }
  video { width:100%; max-width:420px; border-radius:12px; border:1px solid var(--kante); margin-top:10px }
  a.datei { display:inline-block; margin:6px 10px 0 0; font-size:14px }
  code { font-size:13px; background:#fffdf8; padding:1px 5px; border-radius:5px }
</style>
<h1>Werbefilm-Studio</h1>
<p class="unter">Bildschirm im Handyformat, du im Kreis unten links. Beides wird hier gestartet und danach übereinandergelegt.</p>

<fieldset><legend>Geräte</legend>
  <div class="reihe">
    <div><label>Bildschirm</label><select id="bildschirm"></select></div>
    <div><label>Kamera</label><select id="kamera"></select></div>
    <div><label>Mikrofon</label><select id="mikro"></select></div>
  </div>
</fieldset>

<fieldset><legend>Bild</legend>
  <div class="reihe">
    <div><label>Zuschnitt</label><select id="fenster">
      <option value="chrome">vorderstes Chrome-Fenster</option>
      <option value="Safari">vorderstes Safari-Fenster</option>
      <option value="vollbild">ganzer Bildschirm</option>
    </select></div>
    <div><label>Höchstdauer (Sekunden)</label><input id="dauer" type="number" value="90" min="5" max="900"></div>
  </div>
  <div style="margin-top:12px">
    <span class="haken"><input type="checkbox" id="f45"> Meta-Feed 4:5</span>
    <span class="haken"><input type="checkbox" id="f916" checked> Reels/Shorts 9:16</span>
    <span class="haken"><input type="checkbox" id="f169"> YouTube 16:9</span>
    <span class="haken"><input type="checkbox" id="rahmen" checked> Bildschirm als Blatt mit runden Ecken</span>
  </div>
</fieldset>

<div class="knoepfe">
  <button class="los" id="start">Aufnahme starten</button>
  <button class="stopp" id="stopp" disabled>Stopp und bauen</button>
  <button class="neben" id="neu">Geräte neu lesen</button>
  <span class="stand" id="stand">bereit</span>
</div>

<div id="ergebnis"></div>

<script>
const $ = id => document.getElementById(id);
const stand = t => { $("stand").textContent = t; };

async function geraete() {
  stand("lese Geräte …");
  const g = await (await fetch("/api/geraete")).json();
  const fuellen = (el, liste, wahl) => {
    el.innerHTML = liste.map(d => '<option value="' + d.nr + '"' + (d.nr === wahl ? " selected" : "") + '>[' + d.nr + '] ' + d.name + '</option>').join("");
  };
  fuellen($("bildschirm"), g.video, g.vorschlag.bildschirm);
  fuellen($("kamera"), g.video, g.vorschlag.kamera);
  fuellen($("mikro"), g.audio, g.vorschlag.mikro);
  stand(g.video.length ? "bereit" : "keine Geräte — fehlt die Erlaubnis für Bildschirmaufnahme/Kamera?");
}

function formate() {
  const f = [];
  if ($("f45").checked) f.push("4:5");
  if ($("f916").checked) f.push("9:16");
  if ($("f169").checked) f.push("16:9");
  return f.length ? f : ["9:16"];
}

$("neu").onclick = geraete;

$("start").onclick = async () => {
  $("start").disabled = true;
  const r = await (await fetch("/api/start", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({
      bildschirm: Number($("bildschirm").value), kamera: Number($("kamera").value), mikro: Number($("mikro").value),
      fenster: $("fenster").value, dauer: Number($("dauer").value),
    }) })).json();
  if (r.fehler) { stand(r.fehler); $("start").disabled = false; return; }
  $("stopp").disabled = false;
  stand("Aufnahme läuft — sprich und klick durch die Seite. " + (r.fenster ? "Zuschnitt: " + r.fenster.b + "×" + r.fenster.h : "ganzer Bildschirm"));
};

$("stopp").onclick = async () => {
  $("stopp").disabled = true;
  stand("stoppe und baue — das dauert etwa so lang wie die Aufnahme …");
  const r = await (await fetch("/api/stop", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ formate: formate(), rahmen: $("rahmen").checked }) })).json();
  $("start").disabled = false;
  if (r.fehler) { stand(r.fehler); return; }
  stand("fertig: " + r.filme.length + " Film(e) in " + r.ordner);
  $("ergebnis").innerHTML = r.filme.map(f =>
    '<div><video src="/film/' + encodeURIComponent(f) + '" controls></video><br>' +
    '<a class="datei" href="/film/' + encodeURIComponent(f) + '" download>' + f + '</a></div>').join("");
};

geraete();
</script>
</html>`;

async function ui() {
  const out = resolve(opt("out", "werbefilm-ausgabe"));
  mkdirSync(out, { recursive: true });
  const hafen = Number(opt("port", "4599"));

  const server = createServer(async (req, res) => {
    const u = new URL(req.url, "http://127.0.0.1");
    const json = (o, code = 200) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(o)); };
    const koerper = async () => {
      const teile = [];
      for await (const t of req) teile.push(t);
      try { return JSON.parse(Buffer.concat(teile).toString() || "{}"); } catch { return {}; }
    };

    if (u.pathname === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(SEITE);
    }

    if (u.pathname === "/api/geraete") {
      const g = geraeteLesen();
      return json({
        video: g.video, audio: g.audio,
        vorschlag: {
          bildschirm: g.video.find(istBildschirm)?.nr ?? 1,
          kamera: g.video.find(istKamera)?.nr ?? 0,
          mikro: mikroVorschlag(g.audio),
        },
      });
    }

    if (u.pathname === "/api/start" && req.method === "POST") {
      if (lauf) return json({ fehler: "Es läuft schon eine Aufnahme." });
      const k = await koerper();
      let fenster = null;
      if (k.fenster && k.fenster !== "vollbild") {
        const app = String(k.fenster).toLowerCase() === "chrome" ? "Google Chrome" : String(k.fenster);
        fenster = fensterVonApp(app);
      }
      const screenDatei = resolve(out, `roh-bildschirm-${Date.now()}.mov`);
      const kameraDatei = resolve(out, `roh-kamera-${Date.now()}.mov`);
      const dauer = Math.max(5, Math.min(900, Number(k.dauer) || 90));
      const gemeinsam = ["-y", "-hide_banner", "-loglevel", "warning", "-f", "avfoundation", "-framerate", "30"];
      const p1 = spawn(ffmpeg, [...gemeinsam, "-capture_cursor", "1", "-i", `${Number(k.bildschirm)}:none`, "-t", String(dauer),
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "18", "-pix_fmt", "yuv420p", screenDatei], { stdio: ["pipe", "ignore", "pipe"] });
      const p2 = spawn(ffmpeg, [...gemeinsam, "-i", `${Number(k.kamera)}:${Number(k.mikro)}`, "-t", String(dauer),
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", kameraDatei],
        { stdio: ["pipe", "ignore", "pipe"] });
      /* Die Fehlerausgabe von ffmpeg wird gesammelt: Fehlt eine Erlaubnis, steht der Grund dort
         und nirgends sonst. */
      let meckern = "";
      for (const p of [p1, p2]) p.stderr.on("data", d => { meckern += d.toString(); });
      lauf = { p1, p2, screenDatei, kameraDatei, fenster, meckern: () => meckern };
      return json({ ok: true, fenster });
    }

    if (u.pathname === "/api/stop" && req.method === "POST") {
      if (!lauf) return json({ fehler: "Es läuft keine Aufnahme." });
      const k = await koerper();
      const dieser = lauf;
      lauf = null;
      try { dieser.p1.stdin.write("q"); dieser.p2.stdin.write("q"); } catch { /* schon aus */ }
      await Promise.all([
        new Promise(r => dieser.p1.on("close", r)),
        new Promise(r => dieser.p2.on("close", r)),
      ]);
      if (!existsSync(dieser.screenDatei) || !existsSync(dieser.kameraDatei)) {
        return json({ fehler: `Eine Aufnahme fehlt — vermutlich eine fehlende Erlaubnis. ffmpeg sagt: ${dieser.meckern().slice(0, 400)}` });
      }
      const filme = [];
      for (const f of (Array.isArray(k.formate) && k.formate.length ? k.formate : ["9:16"])) {
        if (!FORMATE[f]) continue;
        const ziel = bauen({ screen: dieser.screenDatei, kamera: dieser.kameraDatei, format: f, versatz: 0,
          fenster: dieser.fenster, out, rahmen: !!k.rahmen });
        filme.push(basename(ziel));
      }
      return json({ ok: true, ordner: out, filme });
    }

    if (u.pathname.startsWith("/film/")) {
      const name = basename(decodeURIComponent(u.pathname.slice("/film/".length)));
      const pfad = resolve(out, name);
      if (!existsSync(pfad)) { res.writeHead(404); return res.end("nicht da"); }
      res.writeHead(200, { "content-type": "video/mp4", "content-length": statSync(pfad).size });
      return createReadStream(pfad).pipe(res);
    }

    if (u.pathname === "/api/dateien") {
      return json({ dateien: readdirSync(out).filter(n => n.endsWith(".mp4")) });
    }

    res.writeHead(404); res.end("nicht da");
  });

  server.listen(hafen, "127.0.0.1", () => {
    const adresse = `http://127.0.0.1:${hafen}`;
    console.log(`\nWerbefilm-Studio läuft: ${adresse}`);
    console.log(`Ausgabe: ${out}\nBeenden mit Strg-C.\n`);
    /* `--nicht-oeffnen` für Prüfläufe: Sonst springt bei jedem Start ein Browserfenster auf. */
    if (!args.includes("--nicht-oeffnen")) spawnSync("open", [adresse]);
  });
}

/* ── LOS ──────────────────────────────────────────────────────────────────────────────────── */
pruefeFfmpeg();

if (befehl === "ui") {
  await ui();
} else if (befehl === "geraete") {
  const g = geraeteLesen();
  console.log("Video:"); for (const v of g.video) console.log(`  [${v.nr}] ${v.name}${istBildschirm(v) ? "   ← Bildschirm" : ""}`);
  console.log("Audio:"); for (const a of g.audio) console.log(`  [${a.nr}] ${a.name}`);
  if (!g.video.length) console.log(g.roh);
} else if (befehl === "aufnehmen") {
  await aufnehmen();
} else if (befehl === "bauen") {
  const screen = opt("screen"), kamera = opt("kamera");
  if (!screen || !kamera) { console.log(HILFE); process.exit(1); }
  const format = opt("format", "9:16");
  const fensterWahl = opt("fenster", "");
  let fenster = null;
  if (/^-?\d+,-?\d+,\d+,\d+$/.test(fensterWahl)) {
    const [x, y, b, h] = fensterWahl.split(",").map(Number);
    fenster = { x, y, b, h };
  }
  const out = resolve(opt("out", "werbefilm-ausgabe"));
  const formate = format === "alle" ? Object.keys(FORMATE) : [format];
  for (const f of formate) bauen({ screen, kamera, format: f, versatz: Number(opt("versatz", "0")), fenster, out, rahmen: !args.includes("--ohne-rahmen") });
} else {
  console.log(HILFE);
}
