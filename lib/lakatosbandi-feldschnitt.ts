/**
 * ── DAS WERK WIRD GEMESSEN, NICHT MEHR GESCHNITTEN ──────────────────────────────────────────
 *
 * (Owner 19.09.2026: „die Bilder müssen ganz drauf, nicht abgeschnitten" · Owner 20.09.2026:
 * „mach das Bild auf dem Poster ganz drauf" · „18 Prozent grösser … bei den Hochkant-Bildern")
 *
 * HIER STAND `aufFeldSchneiden`: Das Werk wurde vor dem Setzen auf das Verhältnis des Feldes
 * gekürzt, von der Oberkante aus — weil der SCHIRM damals `w-full` zeichnete und unten abschnitt,
 * und die Datei dasselbe zeigen sollte.
 *
 * DER SCHIRM SCHNEIDET SEIT DEM 19.09. NICHT MEHR (`PosterFilm`: ganz aufs Blatt, so gross wie
 * beide Kanten es zulassen). Die Datei schnitt weiter — der Käufer sah die ganze Mona Lisa und
 * bekam eine ohne Hände gedruckt. Jetzt gilt in beiden dieselbe Regel: `Math.min`, nichts fällt
 * weg.
 *
 * Geblieben ist die MESSUNG: Druckdatei und Blattbild müssen wissen, ob das Werk stehend ist
 * (`posterHochkant`), BEVOR sie den Schriftblock setzen — dann wird die Schrift kleiner und das
 * Feld höher, genau wie auf dem Schirm.
 */
export async function werkMessen(bild: Uint8Array): Promise<{ breit: number; hoch: number }> {
  const sharp = (await import("sharp")).default;
  try {
    const { width: b = 0, height: h = 0 } = await sharp(Buffer.from(bild), { failOn: "none" }).metadata();
    if (!b || !h) return { breit: 1, hoch: 1 };
    return { breit: b, hoch: h };
  } catch {
    return { breit: 1, hoch: 1 };
  }
}
