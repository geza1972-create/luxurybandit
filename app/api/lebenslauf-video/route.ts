import { NextResponse } from "next/server";
import { lebenslaufAvatarPrompt } from "@/lib/lebenslauf-looks";
import { getSignedUrl, readKissLog } from "@/lib/try-this-look-store";
import { adminPinMatches } from "@/lib/admin-auth";
import { getSellerFromRequest } from "@/lib/supabase-auth-server";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * DIE LEBENSLAUF-KETTE: FOTO → GPT-IMAGE-2 STYLT ES IM BERUFS-LOOK → HEYGEN LÄSST ES SPRECHEN
 * (Owner 20.08.2026, derselbe Bauplan wie Geburtstag/Versprechen — `app/api/geburtstag-video`
 * — aber EIGENE, kleine Route statt der geteilten: die Geburtstags-Route ist eng an ihre
 * Torten-Looks/Kiss-Log-Buchhaltung gebunden, das hier anzufassen wäre ein Risiko für das
 * echte Umsatzprodukt. Kein Original-Ton (Owner: „die Stimme nehme ich von HeyGen") — feste
 * Computerstimme.
 *
 * GIBT `hg:<videoId>` ZURÜCK — dieselbe Kennung wie die Geburtstags-Kette, dieselbe
 * generische Poll-Route (`GET /api/generate-tryon-video?videoId=hg:...`) kann sie abfragen,
 * ohne dass diese Route selbst pollen oder warten muss.
 */

/**
 * ZWEI STIMMEN, ERKANNT AUS DEM FOTO (Owner 20.08.2026: „es muss nur erkannt werden aus dem
 * Bild, was sie ist — Mann, Frau"). Dieselben zwei Kennungen wie in `app/api/geburtstag-video`
 * — dort per Chip gewählt, hier per Bild-Erkennung. Alter lässt sich nicht nutzen: HeyGen
 * kennt im Haus nur diese zwei Stimmen, keine altersabhängigen.
 */
const VOICE_FRAU = "550dbffd479e4353aea0bab5bdebef39"; // „Joy"
const VOICE_MANN = "0c23804af39a4946ac6fda42bfff2738";  // „Daniel"

async function geschlechtErkennen(foto: Buffer): Promise<"mann" | "frau"> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return "frau";
  try {
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL ?? "gpt-5-mini",
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: "Is the person in this photo male or female? Answer with exactly one word: \"male\" or \"female\"." },
            { type: "input_image", image_url: `data:image/jpeg;base64,${foto.toString("base64")}` },
          ],
        }],
      }),
    }).then(res => res.json()).catch(() => null) as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> } | null;
    const text = (r?.output_text ?? r?.output?.flatMap(o => o?.content ?? [])?.map(c => c?.text ?? "")?.join("") ?? "").toLowerCase();
    return text.includes("male") && !text.includes("female") ? "mann" : "frau";
  } catch {
    return "frau";
  }
}

async function avatarBauen(foto: Buffer, prompt: string): Promise<{ bild?: Buffer; error?: string }> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return { error: "OPENAI_API_KEY fehlt." };
  const modell = process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-2";
  const lauf = async (model: string) => {
    const fd = new FormData();
    fd.append("model", model);
    fd.append("prompt", prompt);
    fd.append("size", "1024x1536");
    fd.append("quality", "high");
    if (model !== "gpt-image-2") fd.append("input_fidelity", "high");
    fd.append("image[]", new Blob([new Uint8Array(foto)], { type: "image/jpeg" }), "person.jpg");
    const r = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST", headers: { Authorization: `Bearer ${key}` }, body: fd,
    });
    return r.json() as Promise<{ data?: { b64_json?: string }[]; error?: { message?: string } }>;
  };
  let out = await lauf(modell);
  if (!out?.data?.[0]?.b64_json && modell !== "gpt-image-1") out = await lauf("gpt-image-1");
  const b64 = out?.data?.[0]?.b64_json;
  if (!b64) return { error: `Bild-Erzeugung fehlgeschlagen: ${out?.error?.message ?? "keine Bilddaten"}` };
  return { bild: Buffer.from(b64, "base64") };
}

async function fotoBytes(person: string): Promise<Buffer | null> {
  try {
    if (person.startsWith("data:")) {
      const buf = Buffer.from(person.slice(person.indexOf(",") + 1), "base64");
      return buf.length > 0 && buf.length < 8_000_000 ? buf : null;
    }
  } catch { /**/ }
  return null;
}

export async function POST(request: Request) {
  const heygen = process.env.HEYGEN_API_KEY?.trim();
  if (!heygen) return NextResponse.json({ error: "HEYGEN_API_KEY fehlt." }, { status: 500 });

  const body = (await request.json().catch(() => ({}))) as {
    foto?: string; kleidung?: string; umgebung?: string; sprechtext?: string;
    /** EIGENE STIMME (Owner 20.08.2026: „wenn jemand seine Stimme aufnehmen soll, muss das
        durchgehen") — der Client lädt die Aufnahme direkt zu Supabase hoch (derselbe Weg wie
        `app/api/lebenslauf-video-url`) und schickt hier nur den Pfad; diese Route löst ihn
        in eine (auch für HeyGen erreichbare) signierte Adresse auf. */
    audioPath?: string;
  };
  /**
   * OHNE BEZAHLTEN AUFTRAG LÄUFT HIER NICHTS (gefunden 29.08.2026 beim Durchsehen des
   * Video-Kaufs).
   *
   * Diese Route prüfte GAR NICHTS. Wer die Adresse kannte, konnte sie mit einem beliebigen
   * Foto anstossen — und jeder Aufruf löst zwei bezahlte Läufe aus: ein Bild bei OpenAI
   * (gpt-image-2) und ein Video bei HeyGen. Das ist kein Datenleck, das ist ein offener
   * Geldhahn: ein Skript mit einer Schleife hätte über Nacht dreistellig kosten können.
   *
   * WARUM ES SO LANGE NIEMANDEM AUFFIEL: Der einzige Aufrufer ist unser eigener Trichter, und
   * der ruft sie erst nach der Zahlung. Der Schutz lag also im Ablauf statt im Server — und
   * ein Ablauf schützt nur den, der ihn einhält.
   *
   * DIESELBE PRÜFUNG WIE ÜBERALL: Der Kiss-Log-Auftrag ist das Zahlungs-Gedächtnis, Besitz
   * über Admin → Konto → Gerät. `paid` muss stehen; die Kennung allein reicht nicht, sonst
   * wäre sie wieder ein Schlüssel im Link.
   */
  const auftragId = String((body as { id?: string }).id ?? "").trim().slice(0, 80);
  const geraet = String((body as { device?: string }).device ?? "").trim().slice(0, 80);
  const alsAdmin = adminPinMatches(request);
  if (!alsAdmin) {
    if (!auftragId) return NextResponse.json({ error: "Auftrag fehlt." }, { status: 400 });
    const auftrag = await readKissLog().then(l => l.find(e => e.id === auftragId)).catch(() => null);
    if (!auftrag) return NextResponse.json({ error: "Auftrag nicht gefunden." }, { status: 404 });
    if (auftrag.paid !== true) {
      return NextResponse.json({ error: "Erst nach der Zahlung.", zahlungNoetig: true }, { status: 402 });
    }
    /* Besitz: Konto schlägt Gerät, wie im ganzen Haus. */
    const kontoMail = await getSellerFromRequest(request)
      .then(k => String(k?.email ?? "").trim().toLowerCase())
      .catch(() => "");
    const seins = (!!kontoMail && [auftrag.email, auftrag.paidEmail]
      .some(m => String(m ?? "").trim().toLowerCase() === kontoMail))
      || (!!geraet && auftrag.device === geraet);
    if (!seins) {
      return NextResponse.json({ error: "Dieser Auftrag gehört zu einem anderen Browser. Melde dich mit der Adresse an, mit der du ihn begonnen hast." }, { status: 403 });
    }
  } else {
    console.warn("[lebenslauf-video] ADMIN-DURCHLAUF — Zahlungsprüfung übersprungen:", auftragId.slice(0, 8));
  }

  const foto = body.foto ? await fotoBytes(body.foto) : null;
  if (!foto) return NextResponse.json({ error: "Foto fehlt oder ist zu gross." }, { status: 400 });
  const sprechtext = String(body.sprechtext ?? "").trim().slice(0, 1200);
  if (!sprechtext) return NextResponse.json({ error: "Kein Sprechtext vorhanden." }, { status: 400 });
  const audioUrl = body.audioPath ? (await getSignedUrl(body.audioPath).catch(() => "")) : "";

  const oa = await avatarBauen(foto, lebenslaufAvatarPrompt(String(body.kleidung ?? ""), String(body.umgebung ?? "")));
  if (!oa.bild) return NextResponse.json({ error: oa.error ?? "Bild-Erzeugung fehlgeschlagen." }, { status: 502 });

  const H = { "X-Api-Key": heygen };
  const up = await fetch("https://upload.heygen.com/v1/talking_photo", {
    method: "POST", headers: { ...H, "Content-Type": "image/png" }, body: new Uint8Array(oa.bild),
  }).then(r => r.json()).catch(() => null) as { data?: { talking_photo_id?: string } } | null;
  const lookId = up?.data?.talking_photo_id;
  if (!lookId) return NextResponse.json({ error: "HeyGen-Bildanmeldung fehlgeschlagen." }, { status: 502 });

  /* OHNE EIGENE AUFNAHME SPRICHT DIE COMPUTERSTIMME — erkannt aus dem Foto (siehe
     `geschlechtErkennen` oben). MIT AUFNAHME (`audioUrl`) spricht das Avatar genau sie,
     lippensynchron — derselbe Weg wie in `app/api/geburtstag-video`. */
  const stimme = audioUrl ? {} : { voice_id: await geschlechtErkennen(foto) === "mann" ? VOICE_MANN : VOICE_FRAU, voice_settings: { speed: 1.0 } };

  const gen = await fetch("https://api.heygen.com/v3/videos", {
    method: "POST", headers: { ...H, "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "avatar",
      avatar_id: lookId,
      ...(audioUrl ? { audio_url: audioUrl } : { script: sprechtext, ...stimme }),
      aspect_ratio: "auto",
      resolution: "720p",
      expressiveness: "medium",
      engine: { type: "avatar_iv" },
    }),
  }).then(r => r.json()).catch(() => null) as { data?: { video_id?: string }; error?: { message?: string } | null } | null;
  const videoId = gen?.data?.video_id;
  if (!videoId) {
    return NextResponse.json({ error: `HeyGen-Start fehlgeschlagen: ${gen?.error?.message ?? "keine Kennung"}` }, { status: 502 });
  }

  return NextResponse.json({ ok: true, videoId: `hg:${videoId}` });
}
