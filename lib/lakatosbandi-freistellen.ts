import { SEHEN_MODELL_NAME } from "@/lib/lakatosbandi-kunst";

/**
 * ── DIE KUNST AUS DEM FOTO HOLEN (Owner 18.09.2026: „diese Künstler waren nicht in der Lage die
 * Kunst richtig zu posten. Sie haben drum herum fotografiert. Kannst du die Kunst
 * extrahieren?") ────────────────────────────────────────────────────────────────────────────
 *
 * ── ZWEI FÄLLE, EIN VERFAHREN ───────────────────────────────────────────────────────────────
 *
 * Ein Bild an der Wand ist frontal fotografiert — dort reicht ein Zuschnitt. Eine Leinwand, die
 * auf einem Tisch lehnt, steht SCHIEF im Foto: Ein Zuschnitt lässt sie als Trapez stehen, und im
 * Posterrahmen sieht das aus wie ein Fehler.
 *
 * Deshalb wird nicht zugeschnitten, sondern ENTZERRT: Aus dem Viereck, das die Leinwand im Foto
 * bildet, wird ein Rechteck. Der frontale Fall ist darin enthalten — dort ist das Viereck schon
 * fast ein Rechteck, und es passiert kaum etwas.
 *
 * ── WER DIE ECKEN FINDET ────────────────────────────────────────────────────────────────────
 *
 * Ein Sehen-Schritt, kein Erzeugen: Das Modell gibt vier Zahlenpaare zurück und rührt das Bild
 * nicht an. Was danach passiert, rechnet der Server selbst — Pixel für Pixel, nachvollziehbar
 * und ohne dass eine KI etwas hinzuerfindet. Bei einem Kunstwerk ist das keine Kleinigkeit:
 * Ein Modell, das „aufräumt", malt am Werk des Künstlers herum.
 *
 * ── DAS ORIGINAL BLEIBT ─────────────────────────────────────────────────────────────────────
 *
 * Diese Datei gibt ein NEUES Bild zurück und ersetzt nichts. Was damit geschieht, entscheidet
 * der Künstler im Dashboard, nach Vorher/Nachher.
 */

type Punkt = { x: number; y: number };
export type Ecken = { a: Punkt; b: Punkt; c: Punkt; d: Punkt };

/** Höchstkante des Ergebnisses — ein Poster wird auf A1 gedruckt, mehr braucht niemand. */
const HOECHSTE_KANTE = 2400;

/**
 * Die vier Ecken der Leinwand, als Anteile der Bildbreite und -höhe.
 * Reihenfolge: a oben links, b oben rechts, c unten rechts, d unten links.
 */
export async function werkEcken(bild: string): Promise<Ecken | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: SEHEN_MODELL_NAME(),
        max_tokens: 200,
        response_format: { type: "json_object" },
        messages: [{
          role: "user",
          content: [
            { type: "text", text: [
              "This photo shows a painting or a canvas standing or hanging somewhere. Report only geometry; do not describe the artwork.",
              "Give the four corners of the PAINTED SURFACE — not of the photo, not of a frame around it, not of the wall.",
              "If the canvas has visible depth (you can see its side edge), use the corners of the FRONT face only.",
              "Answer as JSON, corners as fractions: " + JSON.stringify({ a: { x: 0, y: 0 }, b: { x: 1, y: 0 }, c: { x: 1, y: 1 }, d: { x: 0, y: 1 } }) + " with your own numbers.",
              "a = top-left, b = top-right, c = bottom-right, d = bottom-left, as seen in the photo.",
              "All values are fractions of the image width and height, between 0 and 1.",
            ].join(" ") },
            { type: "image_url", image_url: { url: bild, detail: "high" } },
          ],
        }],
      }),
    });
    const data = await res.json().catch(() => null) as
      { choices?: { message?: { content?: string } }[]; error?: { message?: string } } | null;
    if (data?.error) { console.warn(`[freistellen] ${data.error.message}`); return null; }
    const roh = JSON.parse(data?.choices?.[0]?.message?.content ?? "{}") as Partial<Ecken>;
    const gut = (p?: Punkt) => !!p && [p.x, p.y].every(n => typeof n === "number" && n >= -0.02 && n <= 1.02);
    if (!gut(roh.a) || !gut(roh.b) || !gut(roh.c) || !gut(roh.d)) {
      console.warn("[freistellen] unbrauchbare Ecken:", JSON.stringify(roh).slice(0, 200));
      return null;
    }
    return roh as Ecken;
  } catch { return null; }
}

/**
 * ── DIE ENTZERRUNG ──────────────────────────────────────────────────────────────────────────
 *
 * Gesucht ist die Abbildung, die das Zielrechteck auf das Viereck im Foto legt (Homographie).
 * Damit wird RÜCKWÄRTS gerechnet: Für jeden Punkt des Ergebnisses steht fest, woher im Foto er
 * kommt. Vorwärts zu rechnen — von der Quelle zum Ziel — liesse Löcher zwischen den Pixeln.
 *
 * Acht Unbekannte, acht Gleichungen (vier Ecken, je x und y). Gelöst wird mit dem
 * Gauss-Verfahren; das sind zwanzig Zeilen und braucht keine Bibliothek.
 */
function homographie(ziel: Punkt[], quelle: Punkt[]): number[] | null {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x: u, y: v } = ziel[i];
    const { x, y } = quelle[i];
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]); b.push(x);
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y]); b.push(y);
  }
  /* Gauss mit Zeilentausch — ohne den kippt die Rechnung, sobald eine Ecke bei 0 liegt. */
  for (let s = 0; s < 8; s++) {
    let beste = s;
    for (let z = s + 1; z < 8; z++) if (Math.abs(A[z][s]) > Math.abs(A[beste][s])) beste = z;
    if (Math.abs(A[beste][s]) < 1e-9) return null;
    [A[s], A[beste]] = [A[beste], A[s]];
    [b[s], b[beste]] = [b[beste], b[s]];
    for (let z = 0; z < 8; z++) {
      if (z === s) continue;
      const f = A[z][s] / A[s][s];
      for (let k = s; k < 8; k++) A[z][k] -= f * A[s][k];
      b[z] -= f * b[s];
    }
  }
  return b.map((wert, i) => wert / A[i][i]);
}

const abstand = (p: Punkt, q: Punkt) => Math.hypot(p.x - q.x, p.y - q.y);

/**
 * Das entzerrte Werk als Daten-URI. Gibt `null` zurück, wenn etwas nicht stimmt — der Aufrufer
 * behält dann das Original, statt ein kaputtes Bild anzubieten.
 */
export async function werkFreistellen(bild: string, ecken: Ecken, verhaeltnis?: number): Promise<string | null> {
  try {
    const sharp = (await import("sharp")).default;
    const roh = Buffer.from(bild.split(",")[1] ?? "", "base64");
    const quelle = sharp(roh).rotate();          // `rotate()` ohne Winkel: EXIF-Drehung anwenden
    const { width: bw = 0, height: bh = 0 } = await quelle.metadata();
    if (!bw || !bh) return null;

    /* Die Ecken in Pixeln des Fotos. */
    const p = (e: Punkt): Punkt => ({ x: e.x * bw, y: e.y * bh });
    const [A, B, C, D] = [p(ecken.a), p(ecken.b), p(ecken.c), p(ecken.d)];

    /* Das Zielmass folgt den längeren der gegenüberliegenden Kanten — sonst staucht die
       Entzerrung ein schräg fotografiertes Werk auf die kürzere Seite zusammen. */
    let zb = Math.round(Math.max(abstand(A, B), abstand(D, C)));
    let zh = Math.round(Math.max(abstand(A, D), abstand(B, C)));
    /**
     * ── WENN DAS FORMAT BEKANNT IST, GEWINNT ES (Owner 18.09.2026: „die Formate passen nicht,
     * die du machst" · „ich habe 3:4") ─────────────────────────────────────────────────────────
     *
     * Aus den erkannten Kanten ein Format zu rechnen heisst, dem Modell auch noch die
     * Seitenverhältnisse zu glauben. Es lag bei einem Werk bei fast 1:2, obwohl die Leinwand
     * 3:4 ist — eine Ecke ein Stück zu weit innen, und das Blatt ist schlanker als das Bild.
     *
     * Kennt der Künstler sein Format, ist es eine ZAHL und keine Schätzung. Die längere der
     * beiden gemessenen Kanten gibt dann nur noch die Grösse vor, das Verhältnis kommt von ihm.
     * Nebeneffekt: Eine schief erkannte Ecke verzerrt das Werk jetzt leicht, statt es zu
     * beschneiden — und das sieht man, statt es zu übersehen.
     */
    if (verhaeltnis && verhaeltnis > 0.2 && verhaeltnis < 5) {
      if (zb / zh > verhaeltnis) zh = Math.round(zb / verhaeltnis);
      else zb = Math.round(zh * verhaeltnis);
    }
    if (zb < 40 || zh < 40) return null;
    const faktor = Math.min(1, HOECHSTE_KANTE / Math.max(zb, zh));
    zb = Math.max(40, Math.round(zb * faktor));
    zh = Math.max(40, Math.round(zh * faktor));

    const H = homographie(
      [{ x: 0, y: 0 }, { x: zb, y: 0 }, { x: zb, y: zh }, { x: 0, y: zh }],
      [A, B, C, D],
    );
    if (!H) return null;
    const [h0, h1, h2, h3, h4, h5, h6, h7] = H;

    const { data: quellDaten, info } = await quelle.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const k = info.channels;
    const ziel = Buffer.alloc(zb * zh * k);

    for (let y = 0; y < zh; y++) {
      for (let x = 0; x < zb; x++) {
        const nenner = h6 * x + h7 * y + 1;
        const sx = (h0 * x + h1 * y + h2) / nenner;
        const sy = (h3 * x + h4 * y + h5) / nenner;
        /* Bilinear: die vier Nachbarn gewichtet. Der nächstgelegene Pixel allein macht bei
           einer Drehung Treppen an jeder Kante — und Kanten sind bei einem Gemälde alles. */
        const x0 = Math.floor(sx), y0 = Math.floor(sy);
        const fx = sx - x0, fy = sy - y0;
        const ziffer = (zx: number, zy: number, c: number) => {
          const gx = Math.min(info.width - 1, Math.max(0, zx));
          const gy = Math.min(info.height - 1, Math.max(0, zy));
          return quellDaten[(gy * info.width + gx) * k + c];
        };
        const aus = (y * zb + x) * k;
        for (let c = 0; c < k; c++) {
          const oben = ziffer(x0, y0, c) * (1 - fx) + ziffer(x0 + 1, y0, c) * fx;
          const unten = ziffer(x0, y0 + 1, c) * (1 - fx) + ziffer(x0 + 1, y0 + 1, c) * fx;
          ziel[aus + c] = Math.round(oben * (1 - fy) + unten * fy);
        }
      }
    }

    const fertig = await sharp(ziel, { raw: { width: zb, height: zh, channels: k as 1 | 2 | 3 | 4 } })
      .jpeg({ quality: 92 })
      .toBuffer();
    return `data:image/jpeg;base64,${fertig.toString("base64")}`;
  } catch (e) {
    console.warn("[freistellen] fehlgeschlagen:", e);
    return null;
  }
}
