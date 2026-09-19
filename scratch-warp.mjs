import sharp from "sharp";
const HOECHSTE_KANTE = 2400;
function homographie(ziel, quelle) {
  const A = [];
  const b = [];
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

const abstand = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);

/**
 * Das entzerrte Werk als Daten-URI. Gibt `null` zurück, wenn etwas nicht stimmt — der Aufrufer
 * behält dann das Original, statt ein kaputtes Bild anzubieten.
 */
export async function werkFreistellen(bild, ecken, verhaeltnis) {
  try {
    const sharp = (await import("sharp")).default;
    const roh = Buffer.from(bild.split(",")[1] ?? "", "base64");
    const quelle = sharp(roh).rotate();          // `rotate()` ohne Winkel: EXIF-Drehung anwenden
    const { width: bw = 0, height: bh = 0 } = await quelle.metadata();
    if (!bw || !bh) return null;

    /* Die Ecken in Pixeln des Fotos. */
    const p = (e) => ({ x: e.x * bw, y: e.y * bh });
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
        const ziffer = (zx, zy, c) => {
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

    const fertig = await sharp(ziel, { raw: { width: zb, height: zh, channels: k } })
      .jpeg({ quality: 92 })
      .toBuffer();
    return `data:image/jpeg;base64,${fertig.toString("base64")}`;
  } catch (e) {
    console.warn("[freistellen] fehlgeschlagen:", e);
    return null;
  }
}
