import sharp from "sharp";

/**
 * DAS WASSERZEICHEN FÜR JEDES GRATIS-ERGEBNIS.
 *
 * Owner 04.08.2026: „gratis wird ab jetzt mit wasserzeichen muster aufs bild gezeigt" ·
 * „die können das runterladen mit wasserzeichen" · „es muss luxurybandit.com stehen. Das
 * bekommen sie gratis" · „es muss auf die ganze Oberfläche das Wasserzeichen sein als Muster" ·
 * „und muss ein Copyright stehen, damit ChatGPT auch weiss".
 *
 * WARUM SERVERSEITIG UND NICHT ALS EBENE IM BROWSER: Eine CSS-Ebene hält nur den
 * Bildschirmabzug auf. „Bild speichern" und die Entwicklerwerkzeuge liefern das saubere Bild
 * darunter — und das ist die grössere Lücke. Hier wird es in die Pixel gebrannt, bevor das
 * Bild den Server verlässt.
 *
 * WAS GESPEICHERT WIRD UND WAS RAUSGEHT (die wichtigste Zeile dieser Datei):
 *   - Die SAUBERE Fassung wird abgelegt — sie ist die Ware, die er später bezahlt.
 *   - Die GEWASSERZEICHNETE geht an den Browser. Er darf sie herunterladen und verschicken;
 *     jedes weitergegebene Bild trägt damit unsere Adresse in eine fremde Gruppe.
 * Wer das vertauscht, verkauft ein Bild mit Wasserzeichen oder verschenkt ein sauberes.
 *
 * DAS COPYRIGHT-ZEICHEN IST KEIN SCHMUCK. Ein Schriftzug ist eine Bildunterschrift, ein © ist
 * eine Schutzangabe — daran greifen die Weigerungen der Bildwerkzeuge, wenn jemand „entferne
 * das Wasserzeichen" verlangt. Und es behauptet nicht mehr als nötig: Auf dem Bild ist SEIN
 * Gesicht; das © gilt der erzeugten Komposition, nicht seinem Foto.
 *
 * ES IST KEINE SICHERUNG, SONDERN REIBUNG PLUS WERBUNG. Wer will, schneidet zu oder nimmt ein
 * Entfernungs-Werkzeug. Für die grosse Mehrheit reicht es, und wer es umgeht, hätte ohnehin
 * nicht gezahlt — hier keine Zeit mit Dichtmachen verschwenden.
 */

const TEXT = "© luxurybandit.com";

/**
 * DIE DICHTE HÄNGT AN DIESEN DREI ZAHLEN — hier drehen, nicht im Code darunter.
 *
 * Die Bedingung, die sie erfüllen müssen: **Jeder Viertel-Ausschnitt enthält noch mindestens
 * einen vollständigen Schriftzug.** Wer eine Ecke wegschneidet, hat immer noch mehrere im Bild;
 * wer alle entfernen will, zerstört das Bild. Alles andere ist Geschmack.
 *
 * Das Gegengewicht: Zu dicht, und er erkennt sich nicht mehr — dann sieht er nicht, dass es gut
 * geworden ist, und kauft die saubere Fassung nicht. Deshalb 20 % Deckkraft und nicht mehr.
 */
const GROESSE = 0.040;   // Schrifthöhe als Anteil der Bildbreite — nie feste Pixel, sonst
                         // flüstert es auf grossen Bildern und schreit auf kleinen
const ABSTAND_X = 1.30;  // Faktor auf die Textbreite (1.0 = Schrift an Schrift)
const ABSTAND_Y = 3.20;  // Faktor auf die Schrifthöhe
const DECKKRAFT = 0.20;

/** Grobe Textbreite für eine fette System-Sans — reicht für die Kachelung völlig. */
const BREITE_JE_ZEICHEN = 0.50;

function svgMuster(breite: number, hoehe: number): string {
  const schrift = Math.max(11, Math.round(breite * GROESSE));
  const textBreite = TEXT.length * schrift * BREITE_JE_ZEICHEN;
  const schrittX = textBreite * ABSTAND_X;
  const schrittY = schrift * ABSTAND_Y;

  /**
   * GEDREHT UM −30°, UND DESHALB ÜBER DEN RAND HINAUS GEZEICHNET.
   *
   * Eine gedrehte Fläche deckt das Rechteck nur ab, wenn sie grösser ist als seine Diagonale —
   * sonst bleiben zwei Ecken leer, und genau dort schneidet dann jemand zu.
   */
  const diagonale = Math.sqrt(breite * breite + hoehe * hoehe);
  const von = -diagonale;
  const bis = diagonale;

  const zeilen: string[] = [];
  let reihe = 0;
  for (let y = von; y <= bis; y += schrittY) {
    // Jede zweite Reihe versetzt: sonst entstehen senkrechte Gassen, durch die man sauber
    // zuschneiden kann.
    const versatz = reihe % 2 === 0 ? 0 : schrittX / 2;
    for (let x = von + versatz; x <= bis; x += schrittX) {
      zeilen.push(`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}">${TEXT}</text>`);
    }
    reihe++;
  }

  /**
   * WEISS MIT DUNKLEM RAND, damit es auf HELL und DUNKEL lesbar bleibt: Auf dem
   * Sonnenuntergang verschwände reines Weiss, auf dem Zimmerbild läge reines Schwarz wie ein
   * Balken. Der dünne dunkle Rand trägt es über beides.
   */
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${breite}" height="${hoehe}">
  <g transform="rotate(-30 ${breite / 2} ${hoehe / 2})"
     font-family="Helvetica, Arial, sans-serif"
     font-size="${schrift}" font-weight="700" letter-spacing="${(schrift * 0.06).toFixed(1)}"
     fill="#ffffff" fill-opacity="${DECKKRAFT}"
     stroke="#000000" stroke-opacity="${(DECKKRAFT * 0.55).toFixed(2)}"
     stroke-width="${(schrift * 0.05).toFixed(2)}" paint-order="stroke">
    ${zeilen.join("\n    ")}
  </g>
</svg>`;
}

/**
 * Brennt das Muster in ein Bild. Rein und raus als Data-URL (`data:image/png;base64,…`),
 * weil die Bildroute genau damit arbeitet.
 *
 * Schlägt etwas fehl, kommt das Bild UNVERÄNDERT zurück — nie ein Fehler nach oben:
 * Ein Kunde, der wegen eines Wasserzeichens gar kein Bild bekommt, ist der schlechtere Fall.
 * Das wird dann geloggt, damit es nicht still verschwindet.
 */
export async function musterAufDataUrl(dataUrl: string): Promise<string> {
  try {
    const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(String(dataUrl ?? ""));
    if (!m) return dataUrl;
    const roh = Buffer.from(m[2], "base64");

    const bild = sharp(roh);
    const { width, height } = await bild.metadata();
    if (!width || !height) return dataUrl;

    const overlay = Buffer.from(svgMuster(width, height));
    const fertig = await bild
      .composite([{ input: overlay, top: 0, left: 0 }])
      .png()
      .toBuffer();

    return `data:image/png;base64,${fertig.toString("base64")}`;
  } catch (e) {
    console.warn("[wasserzeichen] fehlgeschlagen, Bild geht unverändert raus:", e);
    return dataUrl;
  }
}
