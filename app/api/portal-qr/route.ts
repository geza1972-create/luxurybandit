import { NextRequest } from "next/server";
import QRCode from "qrcode";

/**
 * ── DER QR-CODE WIRD GERECHNET, NICHT ABGELEGT (Owner 19.09.2026, an „Caricaturist AI":
 * das kaputte Bildsymbol auf dem Poster) ─────────────────────────────────────────────────────
 *
 * BISHER LAGEN 104 FERTIGE PNG-DATEIEN in `public/lakatosbandi/qr/` — je Künstler und Werk eine,
 * irgendwann von Hand erzeugt. Für jeden Künstler, der danach dazukam, gab es keine: Der Server
 * antwortete mit der 404-Seite, und auf dem Blatt stand statt des Codes das kaputte Bildsymbol.
 * Auf einem PRODUKT, das gedruckt an einer Wand hängen soll.
 *
 * Ein QR-Code ist kein Inhalt, den jemand pflegt — er ist eine Adresse in Schwarzweiss. Also
 * wird er hier aus der Adresse gerechnet, bei jedem Künstler, bei jedem Werk, immer.
 *
 * ── UND ER WIRD EIN JAHR LANG GEHALTEN ──────────────────────────────────────────────────────
 *
 * Derselbe Code kommt bei gleicher Adresse immer gleich heraus. `immutable` heisst: Das Netz
 * fragt kein zweites Mal — es kostet damit nicht mehr als die Datei vorher, und es kann nichts
 * mehr fehlen.
 *
 * ── SCHWARZ AUF DEM PAPIER DES BLATTS ───────────────────────────────────────────────────────
 *
 * `#faf9f6` ist der Ton der Posterkarte (`lb-poster-karte`). Ein weisser Code auf cremefarbenem
 * Papier hätte einen sichtbaren hellen Fleck ergeben — gedruckt fällt das mehr auf als am Schirm.
 * `margin: 1` ist die schmalste Ruhezone, die Scanner noch sicher lesen.
 */
export const runtime = "nodejs";

const sauber = (v: string) => v.replace(/[^a-z0-9-]/gi, "").slice(0, 80);

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const mandant = sauber(String(p.get("m") ?? ""));
  /* `standard` ist das Hauptmotiv (-1); alles andere ist die Nummer, wie sie auch in der
     Adresse steht — dieselbe Schreibweise wie `werkLink` auf der Werkseite. */
  const werk = sauber(String(p.get("i") ?? "standard")) || "standard";

  /**
   * ── EIN CODE FÜR ALLE, UND ER FÜHRT NACH HAUSE (Owner 19.09.2026: „wir machen bei allen einen
   * allgemeinen QR-Code, der auf die Startseite führt, lakatosbandi.com") ─────────────────────
   *
   * Ohne `m` ist es der allgemeine Code — das ist der Normalfall auf den Blättern. Ein Blatt,
   * das an einer Wand hängt, wird von jemandem gescannt, der das Haus noch nicht kennt; die
   * Startseite beantwortet „was ist das hier?", die Werkseite beantwortet nur „mehr zu diesem
   * einen Bild".
   *
   * DER WERKBEZOGENE CODE BLEIBT MÖGLICH (`?m=…&i=…`) — Living Poster verspricht, dass beim
   * Scannen die Musik und die Geschichte DIESES Werks kommen. Wo das gilt, steht der Weg offen;
   * heute zeigt ihn nur niemand mehr an.
   */
  const ziel = mandant
    ? `https://lakatosbandi.com/${encodeURIComponent(mandant)}/${encodeURIComponent(werk)}`
    : "https://lakatosbandi.com";
  try {
    const png = await QRCode.toBuffer(ziel, {
      type: "png",
      width: 264,                       // 66 px Anzeige × 4 — scharf auch im Druck
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#111111ff", light: "#faf9f6ff" },
    });
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("[portal-qr] nicht erzeugt:", mandant, werk, err);
    return new Response("Not found", { status: 404 });
  }
}
