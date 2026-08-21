/**
 * FASTSTART OHNE FFMPEG — reines Umsortieren zweier MP4-Blöcke (Owner 20.08.2026: der
 * Kuss-Player blieb im Ladekreisel haengen, Ursache siehe scripts/faststart.mjs).
 *
 * Eine MP4-Datei besteht aus zwei grossen Bloecken: `mdat` sind die Bilder, `moov` ist das
 * Inhaltsverzeichnis. Steht `moov` HINTEN (wie es Pixverse & Co ausliefern), muss der Browser
 * fast die ganze Datei laden, bevor er ueberhaupt weiss, WAS er da hat — er haengt.
 *
 * `scripts/faststart.mjs` loest genau das, braucht dafuer aber ein System-ffmpeg — auf Vercel
 * gibt es keins. Diese Datei macht dieselbe Operation in reinem JavaScript: `moov` VOR `mdat`
 * verschieben und die Kapitel-Offsets in `stco`/`co64` um die Groesse von `moov` nachziehen.
 * Kein Neu-Kodieren, kein Bit der Bild-/Tondaten aendert sich — nur zwei Bloecke tauschen den
 * Platz, wie beim Original-Werkzeug.
 *
 * Liefert die Eingabe UNVERAENDERT zurueck, wenn `moov` schon vorn liegt (idempotent) oder die
 * Datei nicht wie erwartet aufgebaut ist (kein `moov`/`mdat` gefunden) — lieber ein
 * unangetastetes Video ausliefern als eins, das durch einen falschen Griff kaputtgeht.
 */

type Box = { type: string; start: number; end: number; headerSize: number };

function parseTopLevelBoxes(buf: Buffer): Box[] {
  const boxes: Box[] = [];
  let offset = 0;
  while (offset + 8 <= buf.length) {
    const size32 = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    let headerSize = 8;
    let size: number;
    if (size32 === 1) {
      if (offset + 16 > buf.length) break;
      const big = buf.readBigUInt64BE(offset + 8);
      size = Number(big);
      headerSize = 16;
    } else if (size32 === 0) {
      size = buf.length - offset;
    } else {
      size = size32;
    }
    if (size < headerSize || offset + size > buf.length) break; // kaputte/unerwartete Struktur
    boxes.push({ type, start: offset, end: offset + size, headerSize });
    offset += size;
  }
  return boxes;
}

/** Container-Boxen, in denen `stco`/`co64` verschachtelt stecken können — alles andere ist
    eine Blattbox und wird nicht weiter aufgemacht. */
const CONTAINER_TYPES = new Set(["moov", "trak", "mdia", "minf", "stbl", "edts", "udta", "mvex"]);

/** Zieht alle Kapitel-Offsets in `moovBuf` um `shift` Bytes nach — MUTIERT `moovBuf` direkt. */
function patchChunkOffsets(moovBuf: Buffer, shift: number, from = 0, to = moovBuf.length): void {
  const boxes = parseTopLevelBoxesWithin(moovBuf, from, to);
  for (const b of boxes) {
    if (b.type === "stco") {
      // Aufbau: [4 version+flags][4 entryCount][entryCount × 4-Byte-Offset]
      const dataStart = b.start + b.headerSize;
      const entryCount = moovBuf.readUInt32BE(dataStart + 4);
      let p = dataStart + 8;
      for (let i = 0; i < entryCount && p + 4 <= b.end; i++, p += 4) {
        const v = moovBuf.readUInt32BE(p);
        moovBuf.writeUInt32BE(v + shift, p);
      }
    } else if (b.type === "co64") {
      const dataStart = b.start + b.headerSize;
      const entryCount = moovBuf.readUInt32BE(dataStart + 4);
      let p = dataStart + 8;
      const bigShift = BigInt(shift);
      for (let i = 0; i < entryCount && p + 8 <= b.end; i++, p += 8) {
        const v = moovBuf.readBigUInt64BE(p);
        moovBuf.writeBigUInt64BE(v + bigShift, p);
      }
    } else if (CONTAINER_TYPES.has(b.type)) {
      patchChunkOffsets(moovBuf, shift, b.start + b.headerSize, b.end);
    }
  }
}

function parseTopLevelBoxesWithin(buf: Buffer, from: number, to: number): Box[] {
  const boxes: Box[] = [];
  let offset = from;
  while (offset + 8 <= to) {
    const size32 = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    let headerSize = 8;
    let size: number;
    if (size32 === 1) {
      if (offset + 16 > to) break;
      size = Number(buf.readBigUInt64BE(offset + 8));
      headerSize = 16;
    } else if (size32 === 0) {
      size = to - offset;
    } else {
      size = size32;
    }
    if (size < headerSize || offset + size > to) break;
    boxes.push({ type, start: offset, end: offset + size, headerSize });
    offset += size;
  }
  return boxes;
}

/**
 * Verschiebt `moov` vor `mdat`, falls noetig. `buf` bleibt unangetastet (reine Funktion) —
 * der Aufrufer bekommt entweder dieselbe Referenz zurueck (nichts zu tun) oder einen neuen
 * Buffer.
 */
export function faststartMp4(buf: Buffer): Buffer {
  try {
    const boxes = parseTopLevelBoxes(buf);
    const mdat = boxes.find((b) => b.type === "mdat");
    const moov = boxes.find((b) => b.type === "moov");
    if (!mdat || !moov) return buf;              // kein erwartbarer Aufbau → unangetastet
    if (moov.start < mdat.start) return buf;     // schon vorn → nichts zu tun

    const moovSize = moov.end - moov.start;
    const moovBytes = Buffer.from(buf.subarray(moov.start, moov.end)); // eigene Kopie zum Mutieren
    patchChunkOffsets(moovBytes, moovSize);

    // Rest der Datei OHNE die alten moov-Bytes — mdat-Position darin ist unveraendert,
    // weil moov (das entfernt wird) HINTER mdat lag.
    const before = Buffer.concat([buf.subarray(0, moov.start), buf.subarray(moov.end)]);
    return Buffer.concat([before.subarray(0, mdat.start), moovBytes, before.subarray(mdat.start)]);
  } catch {
    return buf; // ein misslungener Griff darf die Auslieferung nie verhindern
  }
}
