/**
 * FOTO KLEIN RECHNEN — WebP, und Handyformate annehmen (Owner 30.07.2026: „die musst du dann
 * verkleinern als WebP automatisch beim Hochladen und auch Handyformate annehmen").
 *
 * WARUM ES ZÄHLT: Vercel weist eine Anfrage über ~4,5 MB mit 413 ab, bevor irgendetwas läuft.
 * Ein Foto vom Handy hat schnell 4–8 MB. WebP ist bei gleicher Qualität rund ein Drittel
 * kleiner als JPEG — damit bleibt auch ein zweites Bild im Rahmen.
 *
 * HANDYFORMATE: iPhones liefern HEIC. `new Image()` kann das ausserhalb von Safari nicht
 * lesen; `createImageBitmap` kann es in mehr Browsern. Deshalb erst der Weg, dann der alte
 * als Rückfall. Scheitert beides, sagen wir es — statt still nichts zu tun.
 *
 * WARUM DIESE DATEI EXISTIERT (28.08.2026): Genau diese Funktion stand wortgleich in
 * `KissFunnel`, `HolidayFunnel` und `ChatFunnel` — dreimal derselbe Code, dreimal dieselben
 * teuer gelernten Sonderfälle. David brauchte sie als vierte Stelle. Statt sie ein viertes
 * Mal zu kopieren, steht sie jetzt hier (Hausregel: erst in die Bibliothek eintragen, dann
 * benutzen). Die drei bestehenden Trichter ziehen rollierend nach, wenn sie ohnehin
 * angefasst werden — kein Big-Bang über getestete Kaufwege.
 */
export async function fotoAlsDataUrl(file: File, max = 1000, quality = 0.85): Promise<string> {
  const zeichnen = (w: number, h: number, mal: (c: CanvasRenderingContext2D) => void) => {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    mal(c.getContext("2d")!);
    // WebP wo möglich, sonst JPEG (ältere Safari-Fassungen können kein WebP schreiben).
    const webp = c.toDataURL("image/webp", quality);
    return webp.startsWith("data:image/webp") ? webp : c.toDataURL("image/jpeg", quality);
  };

  try {
    const bmp = await createImageBitmap(file);
    const sc = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * sc), h = Math.round(bmp.height * sc);
    const out = zeichnen(w, h, ctx => ctx.drawImage(bmp, 0, 0, w, h));
    bmp.close?.();
    return out;
  } catch { /* dann der klassische Weg */ }

  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error(
      /* Klartext statt Format-Kauderwelsch: Der Kunde soll wissen, was er TUN kann. iPhone-
         Fotos sind HEIC; am Handy wandelt der Bildwaehler sie von selbst in JPEG um, sobald
         wir HEIC nicht mehr im `accept` anbieten — am Schreibtisch muss er es selbst tun. */
      "Dieses Foto können wir nicht lesen (iPhone-Format HEIC). Bitte lade es als JPG hoch.")); i.src = dataUrl;
  });
  const sc = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.round(img.width * sc), h = Math.round(img.height * sc);
  return zeichnen(w, h, ctx => ctx.drawImage(img, 0, 0, w, h));
}
