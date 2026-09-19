import { NextResponse } from "next/server";
import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";
import { mandantPruefen } from "@/lib/versusforge-mandant";
import { EIGENER_MANDANT } from "@/lib/versusforge-namen";
import { pruefPfad } from "@/lib/versusforge-moderation";
import { SEHEN_MODELL_NAME } from "@/lib/lakatosbandi-kunst";

/**
 * ── DER BEFUND: WAS AN DIESEM FOTO NICHT STIMMT (Owner 18.09.2026) ───────────────────────────
 *
 * „Die Bilder müssen freigestellt sein, ohne Wand, Möbel…" · „Das muss als Chip, damit du ihnen
 * schreibst."
 *
 * ── WAS ER TUT UND WAS NICHT ────────────────────────────────────────────────────────────────
 *
 * Er schaut jedes wartende Foto an und beantwortet VIER Fragen, die alle das FOTO betreffen:
 * ist Umgebung drumherum, ist es schräg, ist es unscharf oder dunkel, spiegelt es. Über die
 * KUNST urteilt er nicht — dafür gibt es keinen Chip und wird es keinen geben.
 *
 * Das Ergebnis liegt als `<nr>.befund.json` neben dem Bild. Die Freigabeseite liest es und hakt
 * die passenden Gründe vor an; der Owner kann jeden davon wieder abwählen. Der Befund ENTSCHEIDET
 * also nichts — er schreibt nur die Chips vor, die der Owner sonst von Hand klicken müsste.
 *
 * ── EINMAL JE BILD, NIE ZWEIMAL ─────────────────────────────────────────────────────────────
 *
 * Wo schon ein Befund liegt, wird nicht noch einmal gefragt. Bei 123 Bildern ist der Unterschied
 * zwischen „einmal" und „bei jedem Aufruf der Seite" rund ein Euro gegen viele Euro
 * ([[cost-frugal-paid-apis]]).
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export type Befund = {
  /** Anteil des Bildes, auf dem NICHT das Werk ist — 0 heisst randlos. */
  umgebung: number;
  schief: boolean;
  unscharf: boolean;
  spiegelung: boolean;
};

const befundPfad = (m: string, nr: string) => `versusforge-motiv-pruefung/${m}/${nr}.befund.json`;

async function ansehen(bild: string): Promise<Befund | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: SEHEN_MODELL_NAME(),
        max_tokens: 150,
        response_format: { type: "json_object" },
        messages: [{
          role: "user",
          content: [
            { type: "text", text: [
              "This is a photo of an artwork, taken by the artist. Judge only the PHOTO, never the art itself.",
              "umgebung: what fraction of the image is NOT the artwork — wall, floor, furniture, hands, table, room. 0 means the artwork fills the frame edge to edge.",
              "schief: true if the artwork is photographed at an angle, so its edges are not a rectangle.",
              "unscharf: true if the photo is blurry or clearly too dark.",
              "spiegelung: true if there is glare, flash or reflection on the surface of the artwork.",
              'Answer as JSON: {"umgebung":0.0,"schief":false,"unscharf":false,"spiegelung":false}',
            ].join(" ") },
            { type: "image_url", image_url: { url: bild, detail: "low" } },
          ],
        }],
      }),
    });
    const d = await res.json().catch(() => null) as
      { choices?: { message?: { content?: string } }[]; error?: { message?: string } } | null;
    if (d?.error) { console.warn(`[befund] ${d.error.message}`); return null; }
    const r = JSON.parse(d?.choices?.[0]?.message?.content ?? "{}") as Partial<Befund>;
    return {
      umgebung: Math.min(1, Math.max(0, Number(r.umgebung) || 0)),
      schief: !!r.schief, unscharf: !!r.unscharf, spiegelung: !!r.spiegelung,
    };
  } catch { return null; }
}

export async function POST(request: Request) {
  const b = (await request.json().catch(() => ({}))) as { s?: string; werke?: { mandant: string; nr: string }[] };
  if (!mandantPruefen(EIGENER_MANDANT, String(b.s ?? "")).ok) return NextResponse.json({ ok: false }, { status: 403 });
  const liste = (Array.isArray(b.werke) ? b.werke : []).slice(0, 300);
  if (!liste.length) return NextResponse.json({ ok: false, grund: "leer" }, { status: 400 });

  let neu = 0, schon = 0;
  for (const w of liste) {
    const pfad = befundPfad(w.mandant, w.nr);
    if ((await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad)}`, { method: "HEAD" })).ok) { schon++; continue; }
    const r = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pruefPfad(w.mandant, w.nr))}`);
    if (!r.ok) continue;
    const uri = `data:image/jpeg;base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
    const befund = await ansehen(uri);
    if (!befund) continue;
    await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
      body: JSON.stringify(befund),
    });
    neu++;
  }
  return NextResponse.json({ ok: true, neu, schon });
}
