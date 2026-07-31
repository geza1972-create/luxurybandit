import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * EIN FOTO VON EUCH BEIDEN — der Server schneidet zwei Referenzen daraus.
 *
 * Owner 31.07.2026: „sollen wir eher mehrere Fotos von einem Model als Referenz benutzen? Weil
 * wenn das Gesicht nicht stimmt im Foto, dann werden sie es nicht buchen. Man kann auch ein
 * gemeinsames Foto zulassen."
 *
 * Warum das gemeinsame Foto der bessere Weg ist:
 *
 * 1. **Weniger Reibung.** Bisher muss sie ZWEI Fotos suchen. Ein Paarfoto hat sie schon auf dem
 *    Handy. An dieser Stelle des Trichters hat sie bereits Arbeit investiert — jeder Upload
 *    weniger ist messbar mehr Abschlüsse.
 * 2. **Bessere Ähnlichkeit.** Auf einem gemeinsamen Foto stimmen Größenverhältnis, Licht und
 *    Hautton ZWISCHEN den beiden schon. Genau das misslingt der KI bei zwei getrennten Fotos am
 *    häufigsten — und wenn das Gesicht nicht stimmt, wird nicht gebucht.
 *
 * Und es ändert nichts hinter dieser Datei: Heraus kommen zwei Bilder, genau wie bei zwei
 * Uploads. Die ganze Kette danach — Gratis-Bild, Pixverse mit @1/@2, der Eintrag in der
 * Galerie — bleibt unberührt. Das ist der Grund, warum es hier geschnitten wird und nicht im
 * Browser: EIN Ort, und der Rest merkt nichts.
 */

type Box = { x: number; y: number; w: number; h: number };

const gueltig = (b: unknown): b is Box => {
  const o = b as Box;
  return !!o && [o.x, o.y, o.w, o.h].every(v => typeof v === "number" && v >= 0 && v <= 1)
    && o.w > 0.02 && o.h > 0.02;
};

export async function POST(request: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error: "OPENAI_API_KEY fehlt." }, { status: 500 });

  const body = (await request.json().catch(() => ({}))) as { image?: string };
  const dataUrl = String(body.image ?? "");
  if (!/^data:image\/[a-z+]+;base64,/i.test(dataUrl)) {
    return NextResponse.json({ error: "Kein Bild." }, { status: 400 });
  }

  /**
   * NACH ROLLE FRAGEN, NICHT NACH LINKS UND RECHTS. „Die Frau" und „der Mann" trifft die
   * Bindung, auf die es später ankommt (@1 ist der Bräutigam, @2 die Braut) — bei links/rechts
   * müssten wir raten, und jedes zweite Paar steht andersherum.
   */
  let frau: Box | null = null, mann: Box | null = null;
  /**
   * TECHNIK VON INHALT TRENNEN. Beim ersten Test lief der Erkenner ins Ratenlimit (429) — und
   * die Kundin haette „wir haben keine zwei Gesichter gefunden" gelesen und ratlos andere
   * Fotos probiert. Ein Fehler, der die Schuld beim Nutzer ablaedt, ist schlimmer als eine
   * ehrliche Stoerungsmeldung.
   */
  let technik = false;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini",
        messages: [{
          role: "user",
          content: [
            { type: "text", text:
              "This photo should show two people. Return ONLY compact JSON "
              + "{\"woman\":{\"x\":0-1,\"y\":0-1,\"w\":0-1,\"h\":0-1},\"man\":{\"x\":0-1,\"y\":0-1,\"w\":0-1,\"h\":0-1}} "
              + "with the bounding box of each person's HEAD (hair to chin), as fractions of the image. "
              + "If you cannot tell them apart by appearance, use \"woman\" for the left person and "
              + "\"man\" for the right one. If there is only one person, return {\"one\":true}. No prose." },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        }],
        max_tokens: 140,
      }),
    });
    if (!res.ok) technik = true;
    const j = await res.json().catch(() => null);
    const txt = String(j?.choices?.[0]?.message?.content ?? "");
    const m = /\{[\s\S]*\}/.exec(txt);
    if (m) {
      const d = JSON.parse(m[0]) as { woman?: Box; man?: Box; one?: boolean };
      if (!d.one) {
        if (gueltig(d.woman)) frau = d.woman;
        if (gueltig(d.man)) mann = d.man;
      }
    }
  } catch { technik = true; }

  if (technik && (!frau || !mann)) {
    return NextResponse.json({ error: "technik" }, { status: 503 });
  }
  if (!frau || !mann) {
    // Ehrlich sein statt irgendetwas zurueckgeben: Ein halb erkanntes Paar ergibt ein Video
    // mit einem fremden Gesicht, und das ist schlimmer als ein zweiter Upload.
    return NextResponse.json({ error: "zwei" }, { status: 422 });
  }

  try {
    const bin = /^data:([^;]+);base64,(.+)$/.exec(dataUrl.trim());
    if (!bin) return NextResponse.json({ error: "Kein Bild." }, { status: 400 });
    const sharp = (await import("sharp")).default;
    const roh = Buffer.from(bin[2], "base64");
    const meta = await sharp(roh).metadata();
    const W = meta.width ?? 0, H = meta.height ?? 0;
    if (!W || !H) return NextResponse.json({ error: "Kein Bild." }, { status: 400 });

    /** Kopf plus Schultern statt Passbild: Die KI braucht den Halsansatz, um den Kopf
     *  glaubwuerdig auf eine Figur zu setzen. Derselbe Rand wie in der Gratis-Vorschau. */
    const schneiden = async (b: Box) => {
      const rand = 0.9;
      const bw = Math.min(1, b.w * (1 + rand)), bh = Math.min(1, b.h * (1 + rand));
      const bx = Math.max(0, Math.min(1 - bw, b.x - b.w * rand / 2));
      const by = Math.max(0, Math.min(1 - bh, b.y - b.h * rand / 2));
      const out = await sharp(roh).extract({
        left: Math.round(bx * W), top: Math.round(by * H),
        width: Math.max(64, Math.round(bw * W)), height: Math.max(64, Math.round(bh * H)),
      }).resize({ width: 768 }).jpeg({ quality: 92 }).toBuffer();
      return `data:image/jpeg;base64,${out.toString("base64")}`;
    };

    const [sie, er] = await Promise.all([schneiden(frau), schneiden(mann)]);
    if (!sie || !er) return NextResponse.json({ error: "zwei" }, { status: 422 });
    return NextResponse.json({ ok: true, sie, er });
  } catch {
    return NextResponse.json({ error: "Zuschneiden fehlgeschlagen." }, { status: 500 });
  }
}
