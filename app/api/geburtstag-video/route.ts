import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { uploadTryThisLookBytes, getSignedUrl } from "@/lib/try-this-look-store";
import { geburtstagAvatarPrompt, geburtstagLook } from "@/lib/geburtstag-looks";

/**
 * DIE GEBURTSTAGS-KETTE — der Kundenweg der am 07.08.2026 abgenommenen Vorlage
 * („alles passt perfekt"): Kundenfoto → OpenAI baut das Avatar (Schokotorte, festliche
 * Kleidung, voll bedeckt) → HeyGen `POST /v3/videos` (engine avatar_iv) lässt es den
 * Glückwunsch WÖRTLICH sprechen, mit Namen. Ersetzt für den Geburtstag die
 * Pixverse-Strecke, deren gesprochene Namen Kauderwelsch wurden (Owner: „sie sagt …
 * Happy Birthday you dear Anna. Das ist falsch").
 *
 * WARUM NUR DER START HIER WOHNT: Die Kennung kommt mit `hg:`-Vorsilbe zurück, und den
 * Status pollt die BESTEHENDE Route `/api/generate-tryon-video` (dort die `hg:`-Weiche
 * neben `fashn:`). So laufen die Poll-Schleife des Trichters UND der Nachliefer-Wachhund
 * `/api/kiss-deliver` unverändert weiter — ein Auftrag, ein Statusweg, egal welcher
 * Anbieter rendert (Memory `paid-jobs-must-survive-the-browser`).
 *
 * DIE RECHNUNG (gemessen am 07.08.): Avatar medium ~6 ct + HeyGen ~4 ct je Sekunde
 * (≈20 ct bei ~5 s) ≈ 26 ct Warenkosten — bei 4,99 € Startpreis (GEBURTSTAG_CENTS).
 */

export const runtime = "nodejs";
/* Der Start wartet auf das OpenAI-Bild (typisch 10–30 s bei medium) plus zwei kurze
   HeyGen-Aufrufe — dieselbe Obergrenze wie die Pixverse-Route. */
export const maxDuration = 120;

/**
 * ZWEI STIMMEN, PASSEND ZUR PERSON (Owner 07.08.2026, nach dem Peter-Test: „Peter hat
 * eine Frauenstimme. Das war eben das problem, dass wir sagten"): „Joy" für Frauen —
 * die Stimme der abgenommenen Vorlage — und „Daniel" für Männer. Die Wahl trifft der
 * Kunde per Chip im Trichter; Vorgabe Frau. Dauerlösung bleibt die eigene Stimme aus
 * dem Selfie-Video.
 */
const VOICE_FRAU = "550dbffd479e4353aea0bab5bdebef39";  // „Joy"
const VOICE_MANN = "0c23804af39a4946ac6fda42bfff2738";  // „Daniel"

/**
 * DER AVATAR-PROMPT UND DIE BEWEGUNG WOHNEN JETZT IN `lib/geburtstag-looks.ts` — hier
 * standen sie als zwei feste Zeichenketten, und damit bekam jeder Käufer dasselbe Bild
 * (Owner 07.08.2026: „Die Leute werden sich den look aussehen wollen … Es gibt jetzt nur
 * eins die Frau mit der Torte").
 *
 * Dort steht auch, warum das Gerüst nur EINMAL existiert: Die Wache gegen das Doppelbild
 * und die Coverage-Regel dürfen kein Look vergessen können.
 */

/**
 * DER GESPROCHENE SATZ — einmal „Happy birthday" (Owner: „sie soll nich zwei mal Happy
 * birthday sagen"), Länge kommt vom Schlusssatz (~4,6 s), Tempo 1.0. Der Name wird auf
 * Buchstaben/Zahlen begrenzt: Er wird SGESPROCHEN — Sonderzeichen würden vorgelesen.
 */
function spruch(nameRoh: string): string {
  const name = String(nameRoh ?? "").replace(/[^\p{L}\p{N} .''-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 24);
  return name
    ? `Happy birthday to you, dear ${name}! Enjoy your special day. This little video is just for you.`
    : "Happy birthday to you! Enjoy your special day. This little video is just for you.";
}

/** Kundenfoto (Daten-URL oder https-Adresse) als Bytes — mit Deckel gegen Riesendateien. */
async function fotoBytes(person: string): Promise<Buffer | null> {
  try {
    if (person.startsWith("data:")) {
      const b64 = person.slice(person.indexOf(",") + 1);
      const buf = Buffer.from(b64, "base64");
      return buf.length > 0 && buf.length < 8_000_000 ? buf : null;
    }
    if (/^https?:\/\//i.test(person)) {
      const r = await fetch(person);
      if (!r.ok) return null;
      const buf = Buffer.from(await r.arrayBuffer());
      return buf.length > 0 && buf.length < 8_000_000 ? buf : null;
    }
  } catch { /**/ }
  return null;
}

/** Das Avatar bei OpenAI — Qualität medium („medum reicht"), mit Rückfall aufs Basismodell. */
async function avatarBauen(foto: Buffer, prompt: string): Promise<{ bild?: Buffer; error?: string }> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return { error: "OPENAI_API_KEY fehlt." };
  const modell = process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";
  const lauf = async (model: string) => {
    const fd = new FormData();
    fd.append("model", model);
    fd.append("prompt", prompt);
    fd.append("size", "1024x1536");
    fd.append("quality", "medium");
    fd.append("image[]", new Blob([new Uint8Array(foto)], { type: "image/jpeg" }), "person.jpg");
    const r = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST", headers: { Authorization: `Bearer ${key}` }, body: fd,
    });
    return r.json() as Promise<{ data?: { b64_json?: string }[]; error?: { message?: string } }>;
  };
  let out = await lauf(modell);
  if (!out?.data?.[0]?.b64_json && modell !== "gpt-image-1") out = await lauf("gpt-image-1");
  const b64 = out?.data?.[0]?.b64_json;
  if (!b64) return { error: `Avatar fehlgeschlagen: ${out?.error?.message ?? "keine Bilddaten"}` };
  return { bild: Buffer.from(b64, "base64") };
}

export async function POST(request: Request) {
  const heygen = process.env.HEYGEN_API_KEY?.trim();
  if (!heygen) return NextResponse.json({ error: "HEYGEN_API_KEY fehlt." }, { status: 500 });

  const body = (await request.json().catch(() => ({}))) as { person?: string; name?: string; genId?: string; stimme?: string; audio?: string; look?: string };
  /**
   * DER GEWÄHLTE LOOK (Owner 07.08.2026: „Die Leute werden sich den look aussehen wollen").
   * Unbekannt oder gar nicht mitgeschickt ergibt den abgenommenen — ein Auftrag, der vor
   * dieser Wahl entstanden ist (etwa im Nachliefer-Wachhund), bekommt damit genau das
   * Video, das er bestellt hat.
   */
  const look = geburtstagLook(body.look);
  /**
   * KEIN GRATIS-WEG: Erzeugt wird für Personal (PIN) oder für einen bezahlten Auftrag
   * (`genId` aus dem Kassenweg — dieselbe Vertrauensstufe wie die Pixverse-Route; die
   * härtere serverseitige Auftragsprüfung ist ein eigener, notierter Schritt).
   */
  const staff = await isAdminRequest(request);
  if (!staff && !String(body.genId ?? "").trim()) {
    return NextResponse.json({ error: "Erst bezahlen — dieser Weg kennt kein Gratis-Video." }, { status: 403 });
  }

  const person = String(body.person ?? "");
  const foto = person ? await fotoBytes(person) : null;
  if (!foto) return NextResponse.json({ error: "Kundenfoto fehlt oder ist zu gross." }, { status: 400 });

  // 1) Avatar bauen
  const avatar = await avatarBauen(foto, geburtstagAvatarPrompt(look));
  if (!avatar.bild) return NextResponse.json({ error: avatar.error }, { status: 502 });

  // 2) Avatar als Look anmelden
  const H = { "X-Api-Key": heygen };
  const up = await fetch("https://upload.heygen.com/v1/talking_photo", {
    method: "POST", headers: { ...H, "Content-Type": "image/png" }, body: new Uint8Array(avatar.bild),
  }).then(r => r.json()).catch(() => null) as { data?: { talking_photo_id?: string } } | null;
  const lookId = up?.data?.talking_photo_id;
  if (!lookId) return NextResponse.json({ error: "HeyGen-Look-Anmeldung fehlgeschlagen." }, { status: 502 });

  /**
   * DIE EIGENE STIMME (Owner 07.08.2026: „es ist möglich, dass der user seine stimme
   * aufnimmt? einen satzt vorliesst?" → „ok, dann machen wir das"): Kommt eine Aufnahme
   * mit, spricht das Avatar GENAU sie — lippensynchron, in jeder Sprache, und „das ist
   * nicht meine Stimme" ist damit vollständig erledigt. Die Aufnahme wandert in UNSEREN
   * Speicher (HeyGen holt sie per signiertem Link) — kein Format-Ratespiel beim
   * HeyGen-Asset-Upload, und wir behalten sie für Support-Fälle. Ohne Aufnahme gilt die
   * Chip-Wahl (Joy/Daniel) wie bisher. Scheitert ein Neustart über den Wachhund, fällt
   * er auf die Chip-Stimme zurück — die Aufnahme liegt nur im Startaufruf, nicht im
   * Auftrag (bewusst, ein eigener Ausbauschritt).
   */
  let audioUrl = "";
  if (body.audio?.startsWith("data:audio")) {
    const mime = body.audio.slice(5, body.audio.indexOf(";"));
    const bytes = Buffer.from(body.audio.slice(body.audio.indexOf(",") + 1), "base64");
    if (bytes.length > 2_000 && bytes.length < 6_000_000) {
      const ext = mime.includes("mp4") ? "m4a" : mime.includes("mpeg") ? "mp3" : "webm";
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const pfad = await uploadTryThisLookBytes("uploads", ab, mime, ext).catch(() => "");
      if (pfad) audioUrl = (await getSignedUrl(pfad).catch(() => "")) || "";
    }
    if (!audioUrl) return NextResponse.json({ error: "Die Aufnahme kam nicht an — bitte neu aufnehmen oder eine Stimme wählen." }, { status: 400 });
  }

  // 3) Video über den AKTUELLEN Endpunkt (v3; der alte av4-Weg fällt am 31.10.2026 weg)
  const gen = await fetch("https://api.heygen.com/v3/videos", {
    method: "POST", headers: { ...H, "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "avatar",
      avatar_id: lookId,
      ...(audioUrl
        ? { audio_url: audioUrl }
        : {
            script: spruch(body.name ?? ""),
            voice_id: body.stimme === "mann" ? VOICE_MANN : VOICE_FRAU,
            voice_settings: { speed: 1.0 },
          }),
      /* „auto" übernimmt das Format des Looks (2:3 aus OpenAI) — die Karte trägt jedes
         Hochformat (`verhaeltnis`); eine feste 9:16-Stufe würde stattdessen beschneiden. */
      aspect_ratio: "auto",
      resolution: "720p",
      motion_prompt: look.bewegung,
      expressiveness: "medium",
      engine: { type: "avatar_iv" },
    }),
  }).then(r => r.json()).catch(() => null) as { data?: { video_id?: string }; error?: { message?: string } | null } | null;
  const videoId = gen?.data?.video_id;
  if (!videoId) {
    return NextResponse.json({ error: `HeyGen-Start fehlgeschlagen: ${(gen as { error?: { message?: string } | null })?.error?.message ?? "keine Kennung"}` }, { status: 502 });
  }

  return NextResponse.json({ ok: true, videoId: `hg:${videoId}`, status: "processing" });
}
