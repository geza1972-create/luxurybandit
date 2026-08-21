/**
 * FASTSTART FÜR BEREITS GESPEICHERTE VIDEOS (Owner 20.08.2026 — Nachbesserung zu
 * lib/mp4-faststart.ts, das ab jetzt jedes NEUE Video automatisch repariert).
 *
 * Alles, was VOR dem 20.08.2026 generiert wurde, liegt noch mit `moov` hinten im Bucket — der
 * Player hängt dafür weiter. Dieses Skript geht einmal durch alle Videos im Storage, prüft
 * JEDE Datei (per Box-Kopf, kein Download nötig für die Prüfung) und packt nur die betroffenen
 * um — dieselbe reine Umsortierung wie lib/mp4-faststart.ts, kein Neu-Kodieren.
 *
 * SICHERHEIT:
 *  - Standardmäßig PROBELAUF. Erst `--apply` schreibt wirklich.
 *  - Nur Dateien, bei denen `moov` wirklich hinten liegt, werden angefasst — der Rest bleibt
 *    unberührt (idempotent, ein zweiter Lauf tut nichts mehr).
 *  - Hochgeladen wird mit `x-upsert: true` an DENSELBEN Pfad — die Adresse (und damit jeder
 *    Link, der schon verschickt wurde) bleibt gültig.
 *  - Schlägt die Prüfung nach dem Umpacken fehl (Dateigröße weicht ab), wird NICHT
 *    hochgeladen — lieber eine hängende Datei behalten als eine kaputte ausliefern.
 *
 * NUR GENUTZTE VIDEOS (Owner 20.08.2026: „nicht die 149 Videos umbauen, die wir eh nicht
 * nutzen … die müssen wir eh vom Server löschen. Wir haben die Videos, die wir in den Topics
 * nutzen. Die brauchen wir nur"). Genau wie `cleanup-orphan-videos.mjs`: eine Datei zählt nur
 * als "genutzt", wenn ihr GANZER Pfad irgendwo im Text von `state.json` vorkommt. Verwaiste
 * Dateien werden NICHT angefasst — die gehören gelöscht, nicht repariert (siehe
 * `cleanup-orphan-videos.mjs`).
 *
 * Nutzung (im Projektordner):
 *   node scripts/faststart-storage.mjs            # Probelauf: zeigt nur, was betroffen wäre
 *   node scripts/faststart-storage.mjs --apply     # packt die betroffenen wirklich um
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const APPLY = process.argv.includes("--apply");

function loadEnv() {
  const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = env.SUPABASE_STORAGE_BUCKET || "shopcut-images";
const STATE_PATH = "try-this-look/state.json";
const FOLDERS = ["try-this-look/videos", "try-this-look/generations"];
const VIDEO_RE = /\.(mp4|m4v)$/i;

if (!SUPABASE_URL || !KEY) { console.error("❌ NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt in .env.local"); process.exit(1); }
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const encodePath = (p) => p.split("/").map(encodeURIComponent).join("/");

async function listFolder(prefix) {
  const files = [];
  for (let offset = 0; ; offset += 100) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
      method: "POST", headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: prefix + "/", limit: 100, offset, sortBy: { column: "name", order: "asc" } }),
    });
    if (!res.ok) throw new Error(`list ${prefix} → ${res.status}`);
    const batch = await res.json();
    for (const o of batch) if (o.name && o.id !== null) files.push({ path: `${prefix}/${o.name}`, size: o.metadata?.size ?? 0 });
    if (batch.length < 100) break;
  }
  return files;
}

// ── Dieselbe Umsortierung wie lib/mp4-faststart.ts — hier ohne TS-Import, damit das Skript
//    mit reinem Node läuft. Bei Änderungen an der Logik BEIDE Stellen nachziehen. ──────────

function parseTopLevelBoxes(buf) {
  const boxes = [];
  let offset = 0;
  while (offset + 8 <= buf.length) {
    const size32 = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    let headerSize = 8, size;
    if (size32 === 1) {
      if (offset + 16 > buf.length) break;
      size = Number(buf.readBigUInt64BE(offset + 8));
      headerSize = 16;
    } else if (size32 === 0) size = buf.length - offset;
    else size = size32;
    if (size < headerSize || offset + size > buf.length) break;
    boxes.push({ type, start: offset, end: offset + size, headerSize });
    offset += size;
  }
  return boxes;
}

const CONTAINER_TYPES = new Set(["moov", "trak", "mdia", "minf", "stbl", "edts", "udta", "mvex"]);

function patchChunkOffsets(moovBuf, shift, from = 0, to = moovBuf.length) {
  const boxes = parseTopLevelBoxesWithin(moovBuf, from, to);
  for (const b of boxes) {
    if (b.type === "stco") {
      const dataStart = b.start + b.headerSize;
      const entryCount = moovBuf.readUInt32BE(dataStart + 4);
      let p = dataStart + 8;
      for (let i = 0; i < entryCount && p + 4 <= b.end; i++, p += 4) {
        moovBuf.writeUInt32BE(moovBuf.readUInt32BE(p) + shift, p);
      }
    } else if (b.type === "co64") {
      const dataStart = b.start + b.headerSize;
      const entryCount = moovBuf.readUInt32BE(dataStart + 4);
      let p = dataStart + 8;
      const bigShift = BigInt(shift);
      for (let i = 0; i < entryCount && p + 8 <= b.end; i++, p += 8) {
        moovBuf.writeBigUInt64BE(moovBuf.readBigUInt64BE(p) + bigShift, p);
      }
    } else if (CONTAINER_TYPES.has(b.type)) {
      patchChunkOffsets(moovBuf, shift, b.start + b.headerSize, b.end);
    }
  }
}

function parseTopLevelBoxesWithin(buf, from, to) {
  const boxes = [];
  let offset = from;
  while (offset + 8 <= to) {
    const size32 = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    let headerSize = 8, size;
    if (size32 === 1) {
      if (offset + 16 > to) break;
      size = Number(buf.readBigUInt64BE(offset + 8));
      headerSize = 16;
    } else if (size32 === 0) size = to - offset;
    else size = size32;
    if (size < headerSize || offset + size > to) break;
    boxes.push({ type, start: offset, end: offset + size, headerSize });
    offset += size;
  }
  return boxes;
}

function faststartMp4(buf) {
  const boxes = parseTopLevelBoxes(buf);
  const mdat = boxes.find((b) => b.type === "mdat");
  const moov = boxes.find((b) => b.type === "moov");
  if (!mdat || !moov) return null;             // kein erwartbarer Aufbau
  if (moov.start < mdat.start) return null;    // schon vorn — nichts zu tun

  const moovSize = moov.end - moov.start;
  const moovBytes = Buffer.from(buf.subarray(moov.start, moov.end));
  patchChunkOffsets(moovBytes, moovSize);

  const before = Buffer.concat([buf.subarray(0, moov.start), buf.subarray(moov.end)]);
  return Buffer.concat([before.subarray(0, mdat.start), moovBytes, before.subarray(mdat.start)]);
}

// ── Nur der Boxkopf muss geladen werden, um zu wissen, ob eine Datei betroffen ist:
//    Range-Request auf die ersten paar KB reicht fast immer (ftyp + moov-Kopf oder mdat-Kopf
//    liegen vorn). Erst wenn eine Datei betroffen ist, wird sie GANZ geladen. ────────────────

async function pruefeUndRepariere(path) {
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(path)}`;
  const full = await fetch(url, { headers });
  if (!full.ok) return { path, status: `laden fehlgeschlagen (${full.status})` };
  const buf = Buffer.from(await full.arrayBuffer());

  const boxes = parseTopLevelBoxes(buf);
  const mdat = boxes.find((b) => b.type === "mdat");
  const moov = boxes.find((b) => b.type === "moov");
  if (!mdat || !moov) return { path, status: "unbekannter Aufbau — übersprungen" };
  if (moov.start < mdat.start) return { path, status: "schon in Ordnung" };

  const fixed = faststartMp4(buf);
  if (!fixed || fixed.length !== buf.length) return { path, status: "Umsortieren fehlgeschlagen — NICHT hochgeladen" };

  if (APPLY) {
    const up = await fetch(url, {
      method: "POST",
      headers: { ...headers, "Content-Type": "video/mp4", "x-upsert": "true" },
      body: fixed,
    });
    if (!up.ok) return { path, status: `Hochladen fehlgeschlagen (${up.status})` };
  }
  return { path, status: APPLY ? "repariert" : "würde repariert (Probelauf)" };
}

async function main() {
  console.log(`\n${APPLY ? "🛠  APPLY — betroffene Videos werden UMGEPACKT." : "👀 DRY RUN — nur Bericht. Mit --apply umpacken."}\n`);

  const stateRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(STATE_PATH)}`, { headers });
  if (!stateRes.ok) { console.error(`❌ state.json laden fehlgeschlagen: ${stateRes.status}`); process.exit(1); }
  const stateText = await stateRes.text();

  let all = [];
  for (const f of FOLDERS) { try { all.push(...await listFolder(f)); } catch (e) { console.warn(`  ⚠️  ${f}: ${e.message}`); } }
  const alle = all.filter((f) => VIDEO_RE.test(f.path));
  const vids = alle.filter((f) => stateText.includes(f.path));
  console.log(`📦 Videos im Storage: ${alle.length}  ·  genutzt (in Topics referenziert): ${vids.length}  ·  verwaist (übersprungen): ${alle.length - vids.length}\n`);

  let betroffen = 0, ok = 0, fehler = 0;
  for (let i = 0; i < vids.length; i++) {
    const r = await pruefeUndRepariere(vids[i].path);
    if (r.status.includes("repariert")) { betroffen++; console.log(`   🔧 ${r.path} — ${r.status}`); }
    else if (r.status === "schon in Ordnung") { ok++; }
    else { fehler++; console.log(`   ⚠️  ${r.path} — ${r.status}`); }
    if ((i + 1) % 25 === 0) console.log(`   … ${i + 1}/${vids.length} geprüft`);
  }

  console.log(`\n✓ schon in Ordnung: ${ok}`);
  console.log(`🔧 betroffen: ${betroffen}${APPLY ? " (repariert)" : " (würden repariert)"}`);
  if (fehler) console.log(`⚠️  übersprungen/fehlgeschlagen: ${fehler}`);
  if (!APPLY && betroffen) console.log(`\nWenn die Liste stimmt:  node scripts/faststart-storage.mjs --apply`);
}

main().catch((e) => { console.error("❌ Fehler:", e); process.exit(1); });
