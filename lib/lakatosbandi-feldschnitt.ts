/**
 * ── DAS WERK FÜLLT DIE BREITE, DER ÜBERHANG FÄLLT UNTEN WEG ─────────────────────────────────
 *
 * (Owner 17.09.2026: „das Bild bis zum Rand links und rechts und obere Kante. Du schneidest das
 * Bild ab, wenn hochkant" · Owner 19.09.2026: „die Bilder oben nicht abschneiden" · „sehen die
 * für dich gleich aus?")
 *
 * DER SCHIRM UND DIE DATEI FOLGTEN ZWEI REGELN:
 *  · SCHIRM: `w-full` — das Werk nimmt die ganze Feldbreite, was zu hoch ist, schneidet das Feld
 *    ab (seit dem 19.09. unten, nicht mehr mittig).
 *  · DATEI: `Math.min(…)` — das Werk passt GANZ hinein, also blieb bei einem hochformatigen Werk
 *    links und rechts Papier stehen.
 *
 * GEMESSEN an einem A3: Datei 73,3 % Feldbreite, Schirm 84,8 %. Nebeneinander sind es zwei
 * verschiedene Poster — und gedruckt bekäme der Käufer das schmalere.
 *
 * Hier wird deshalb VOR dem Setzen zugeschnitten: auf das Verhältnis des Feldes, von der
 * Oberkante aus. Danach füllt das Werk die Breite, und die Datei zeigt, was der Schirm zeigt.
 */
export async function aufFeldSchneiden(
  bild: Uint8Array,
  feldBreite: number,
  feldHoehe: number,
): Promise<{ bild: Uint8Array; breit: number; hoch: number }> {
  const sharp = (await import("sharp")).default;
  const ziel = feldBreite / feldHoehe;
  try {
    const q = sharp(Buffer.from(bild), { failOn: "none" });
    const { width: b = 0, height: h = 0 } = await q.metadata();
    if (!b || !h) return { bild, breit: 1, hoch: 1 };
    const ist = b / h;
    /* Schon breiter als das Feld: Dann bestimmt die Breite ohnehin, nichts zu tun. */
    if (ist >= ziel) return { bild, breit: b, hoch: h };
    /* Zu hoch: Die Höhe fällt nach UNTEN weg, die Oberkante bleibt stehen. */
    const neu = Math.max(1, Math.round(b / ziel));
    const raus = await q.extract({ left: 0, top: 0, width: b, height: Math.min(h, neu) }).toBuffer();
    return { bild: new Uint8Array(raus), breit: b, hoch: Math.min(h, neu) };
  } catch {
    return { bild, breit: 1, hoch: 1 };
  }
}
