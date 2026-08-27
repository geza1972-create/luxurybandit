import { inflateRawSync } from "zlib";

/**
 * TEXT AUS EINER .DOCX-DATEI — IN REINEM JS (Owner 26.08.2026: „ich muss im lebenslauf
 * auch docx hochladen können").
 *
 * WARUM SELBST GEBAUT statt mammoth/docx-npm: dieselbe Begründung wie bei
 * lib/mp4-faststart.ts — keine neue Abhängigkeit für eine Aufgabe, die mit Bordmitteln
 * in 60 Zeilen lösbar ist. Eine .docx ist ein ZIP; der Fließtext liegt komplett in
 * `word/document.xml` als `<w:t>`-Elemente. Node bringt das DEFLATE-Entpacken mit
 * (`zlib.inflateRawSync`), es fehlt nur ein minimaler ZIP-Leser.
 *
 * WARUM ÜBERHAUPT TEXT: Die OpenAI-responses-API nimmt als `input_file` nur PDF —
 * eine Word-Datei muss als `input_text` in den Prompt. Für einen Lebenslauf reicht
 * der reine Fließtext (Absätze, Tabellenzellen, Tabs); Layout ist hier egal.
 *
 * GRENZEN, EHRLICH: nur .docx (das alte binäre .doc ist ein anderes Format und bleibt
 * draußen), keine Bilder/Kopfzeilen, und eine docx mit Verschlüsselung liefert "".
 * Der Aufrufer behandelt "" als Lesefehler und bittet um PDF.
 */

/** Liest die Rohdaten EINER Datei aus einem ZIP-Puffer (per Central Directory). */
function zipEintragLesen(buf: Buffer, gesuchterName: string): Buffer | null {
  /* End-of-Central-Directory von hinten suchen (Signatur 0x06054b50). Der Kommentar am
     Dateiende ist maximal 65535 Bytes lang — weiter muss die Suche nie zurück. */
  const start = Math.max(0, buf.length - 65557);
  let eocd = -1;
  for (let i = buf.length - 22; i >= start; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) return null;
  const anzahl = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);   // Offset des Central Directory

  for (let n = 0; n < anzahl; n++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50) return null;
    const methode = buf.readUInt16LE(p + 10);
    const groesseKomprimiert = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const kommentarLen = buf.readUInt16LE(p + 32);
    const lokalOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);

    if (name === gesuchterName) {
      /* Local File Header hat EIGENE Namens-/Extra-Längen (können vom Central Directory
         abweichen) — Datenstart daraus ableiten, nie aus den Central-Werten. */
      if (buf.readUInt32LE(lokalOffset) !== 0x04034b50) return null;
      const lokalNameLen = buf.readUInt16LE(lokalOffset + 26);
      const lokalExtraLen = buf.readUInt16LE(lokalOffset + 28);
      const datenStart = lokalOffset + 30 + lokalNameLen + lokalExtraLen;
      const roh = buf.subarray(datenStart, datenStart + groesseKomprimiert);
      if (methode === 0) return Buffer.from(roh);            // stored
      if (methode === 8) { try { return inflateRawSync(roh); } catch { return null; } }
      return null;                                            // exotische Methode
    }
    p += 46 + nameLen + extraLen + kommentarLen;
  }
  return null;
}

const entitaeten = (t: string) => t
  .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'").replace(/&amp;/g, "&");

/** Fließtext aus einer .docx — "" wenn die Datei nicht lesbar ist. */
export function docxZuText(datei: Buffer): string {
  const xml = zipEintragLesen(datei, "word/document.xml")?.toString("utf8");
  if (!xml) return "";
  /* Ein Lauf über das XML in Dokumentreihenfolge: Textstücke einsammeln, Absatzenden
     als Zeilenumbruch, Tabs/Umbrüche erhalten. Tabellenzellen bestehen selbst aus
     `<w:p>`-Absätzen und fallen damit automatisch mit heraus. */
  const teile: string[] = [];
  const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<\/w:p>|<w:tab\b[^>]*\/>|<w:br\b[^>]*\/>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    if (m[1] !== undefined) teile.push(entitaeten(m[1]));
    else if (m[0] === "</w:p>") teile.push("\n");
    else if (m[0].startsWith("<w:tab")) teile.push("\t");
    else teile.push("\n");
  }
  return teile.join("").replace(/\n{3,}/g, "\n\n").trim();
}
