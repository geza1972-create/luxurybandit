import { NextResponse } from "next/server";
import crypto from "crypto";
import { isAdminRequest } from "@/lib/admin-auth";
import { uploadTryThisLookBytes, getSignedUrl, readKissLog, writeKissLog, heygenLookMerken, heygenLookNachschlagen } from "@/lib/try-this-look-store";
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
/* Seit dem HeyGen-Look (08.08.): Avatar-Anlauf + Look-Erzeugung (gemessen 60–75 s, Deckel
   120 s) + Video-Start — und im schlechtesten Fall noch der OpenAI-Rückfall dahinter.
   300 s ist die Obergrenze der teuersten Admin-Routen im Haus (generate-avatar-face). */
export const maxDuration = 300;

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

/**
 * DER HEYGEN-LOOK (08.08.2026): Foto-Avatar aus dem Kundenbild, dann DERSELBE Mensch per
 * Prompt in Kleidung/Torte/Umgebung des gewählten Looks. Alle Wartezeiten und Fallen hier
 * sind GEMESSEN, nicht vermutet:
 *
 *   - Asset-Upload verlangt den ECHTEN Bildtyp („Content type not match") und kennt kein
 *     webp — deshalb die Magie-Byte-Weiche. Das Trichter-Standbild ist immer JPEG.
 *   - Der frische Foto-Avatar braucht ein paar Sekunden, ehe er als Referenz gilt: Der
 *     sofortige Look-Aufruf kam leer zurück, der nach ~30 s lief. Daher die Wiederholung.
 *   - Der Look selbst brauchte 60–75 s (zweimal gemessen). Deckel 120 s, damit der
 *     OpenAI-Rückfall im selben Aufruf noch Luft hat (maxDuration 300).
 *
 * Das Prompt-Gerüst bleibt die EINE Quelle in lib/geburtstag-looks — samt der Wache gegen
 * das Doppelbild und der Coverage-Regel; kein Look kann sie hier umgehen.
 */
async function heygenLookBauen(H: Record<string, string>, foto: Buffer, look: ReturnType<typeof geburtstagLook>): Promise<{ lookId?: string; poster?: Buffer; error?: string }> {
  const mime = foto[0] === 0xff ? "image/jpeg" : foto[0] === 0x89 ? "image/png" : "";
  if (!mime) return { error: "Fotoformat unbekannt (HeyGen nimmt jpeg/png)." };
  const up = await fetch("https://upload.heygen.com/v1/asset", {
    method: "POST", headers: { ...H, "Content-Type": mime }, body: new Uint8Array(foto),
  }).then(r => r.json()).catch(() => null) as { data?: { url?: string } } | null;
  const fotoUrl = up?.data?.url;
  if (!fotoUrl) return { error: "Asset-Upload fehlgeschlagen." };

  const av = await fetch("https://api.heygen.com/v3/avatars", {
    method: "POST", headers: { ...H, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "photo", name: "lb-geburtstag", file: { type: "url", url: fotoUrl } }),
  }).then(r => r.json()).catch(() => null) as { data?: { avatar_item?: { id?: string } } } | null;
  const avatarId = av?.data?.avatar_item?.id;
  if (!avatarId) return { error: "Foto-Avatar fehlgeschlagen." };

  const prompt = geburtstagAvatarPrompt(look);
  let lookId = "";
  for (let i = 0; i < 8 && !lookId; i++) {
    const lk = await fetch("https://api.heygen.com/v3/avatars", {
      method: "POST", headers: { ...H, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "prompt", name: "lb-geburtstag-look", avatar_id: avatarId, prompt }),
    }).then(r => r.json()).catch(() => null) as { data?: { avatar_item?: { id?: string } } } | null;
    lookId = lk?.data?.avatar_item?.id ?? "";
    if (!lookId) await new Promise(r => setTimeout(r, 5000));
  }
  if (!lookId) return { error: "Look-Erzeugung nicht angenommen." };

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 4000));
    const st = await fetch(`https://api.heygen.com/v3/avatars/looks/${lookId}`, { headers: H })
      .then(r => r.json()).catch(() => null) as { data?: { status?: string; preview_image_url?: string; image_url?: string } } | null;
    const s = st?.data?.status ?? "";
    if (s === "completed") {
      /* Die Look-Vorschau ist zugleich das Poster — erstes Vollbild des Videos. */
      let poster: Buffer | undefined;
      const pu = st?.data?.preview_image_url || st?.data?.image_url || "";
      if (pu) { try { const pr = await fetch(pu); if (pr.ok) poster = Buffer.from(await pr.arrayBuffer()); } catch { /**/ } }
      return { lookId, poster };
    }
    if (s === "failed") return { error: "Look-Erzeugung fehlgeschlagen." };
  }
  return { error: "Look-Erzeugung Zeitüberschreitung." };
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

  /**
   * 1) DER LOOK ENTSTEHT SEIT DEM 08.08.2026 BEI HEYGEN, NICHT MEHR BEI OPENAI.
   *
   * GEMESSEN am Owner selbst: OpenAI `images/edits` bekam sein echtes Gesicht und malte
   * trotzdem einen Fremden — zweimal, „das bin ich nicht". Der HeyGen-Weg (Foto-Avatar
   * aus dem Standbild → Look per Prompt, 64 s im Test) bekam dasselbe Standbild, und das
   * Urteil war: „Das Bild ist jetzt perfekt." Der erzeugte Look ist zugleich die
   * `avatar_id` fürs Sprechen — der `talking_photo`-Upload entfällt, EIN Anbieter für
   * Bild und Video.
   *
   * OpenAI bleibt als STILLER RÜCKFALL stehen (avatarBauen + talking_photo unten in
   * `openaiRueckfall`): Ein HeyGen-Schluckauf darf keinen bezahlten Auftrag töten —
   * lieber ein unähnlicheres Video als gar keins.
   */
  const H = { "X-Api-Key": heygen };
  /**
   * DER LOOK WIRD WIEDERVERWENDET (Owner 08.08.2026: „heygen konto ist leer. Wieso …
   * Ein Video kostet doch nur ein paar cent"). Der Look-Schritt (Foto-Avatar +
   * Prompt-Bild) ist der teure Teil der Kette — und er lief bei JEDEM Neu-Rendern
   * desselben Auftrags erneut, auch beim Wachhund. Jetzt merkt sich der Auftrag seinen
   * fertigen Look; wiederverwendet wird NUR, wenn Look-Wahl UND Gesichtsbild identisch
   * sind (Kurzhash) — ein neues Gesicht oder ein anderer Look baut sauber neu.
   */
  const genIdStr = String(body.genId ?? "").trim();
  const fotoHash = crypto.createHash("sha1").update(foto).digest("hex").slice(0, 16);
  let lookId = "";
  let lookNeuGebaut = false;
  if (genIdStr) {
    try {
      const alte = await readKissLog();
      const e = alte.find(x => x.id === genIdStr);
      if (e?.heygenLookId && e.heygenLookFuer === look.id && e.heygenLookFoto === fotoHash) {
        lookId = e.heygenLookId;
      }
    } catch { /* dann eben neu bauen */ }
  }
  /* Zweite Stufe: derselbe Mensch im selben Look, aber ein NEUER Auftrag (Wiederkaeufer,
     Test-Laeufe) — der globale Look-Speicher zahlt den Bild-Schritt genau einmal. */
  const lookSchluessel = `${look.id}|${fotoHash}`;
  if (!lookId) lookId = await heygenLookNachschlagen(lookSchluessel);
  /**
   * PERSONAL-SPARMODUS (Owner 08.08.2026: „jetzt hat das Video 2,20 dollar gekostet" —
   * jede NEUE Aufnahme ist ein neues Standbild, also ein neuer Hash, also ein neuer
   * 1,80-$-Look; fuer Kunden ist das richtig, fuers Testen ruinoes). Personal-Laeufe
   * (Admin-Schluessel reist auch im Vorschau-Modus mit) verwenden den zuletzt gebauten
   * Look derselben Look-Wahl wieder — es ist ohnehin dasselbe Gesicht. Kundenlaeufe
   * beruehrt das nie.
   */
  if (!lookId && staff) lookId = await heygenLookNachschlagen(`personal|${look.id}`);
  /** Das Poster-Bild der gewählten Strecke — HeyGen-Look-Vorschau oder OpenAI-Avatar. */
  let posterQuelle: Buffer | undefined;
  if (!lookId) {
    const hey = await heygenLookBauen(H, foto, look);
    lookId = hey.lookId ?? "";
    posterQuelle = hey.poster;
    lookNeuGebaut = !!lookId;
    if (lookId) {
      void heygenLookMerken(lookSchluessel, lookId);
      if (staff) void heygenLookMerken(`personal|${look.id}`, lookId);
    }
    if (!lookId) console.warn("[geburtstag-video] HeyGen-Look scheiterte, OpenAI-Rueckfall:", hey.error);
  } else if (!posterQuelle) {
    /* Wiederverwendeter Look auf einem NEUEN Auftrag: das Poster ist die Look-Vorschau —
       ein kostenloser Lese-Aufruf, kein neues Bild. */
    try {
      const st = await fetch(`https://api.heygen.com/v3/avatars/looks/${lookId}`, { headers: H })
        .then(r => r.json()) as { data?: { preview_image_url?: string; image_url?: string } };
      const pu = st?.data?.preview_image_url || st?.data?.image_url || "";
      if (pu) { const pr = await fetch(pu); if (pr.ok) posterQuelle = Buffer.from(await pr.arrayBuffer()); }
    } catch { /* dann bleibt das Poster des Auftrags oder keins — nie der Grund zu scheitern */ }
  }
  if (!lookId) {
    const avatar = await avatarBauen(foto, geburtstagAvatarPrompt(look));
    if (!avatar.bild) return NextResponse.json({ error: avatar.error }, { status: 502 });
    const up = await fetch("https://upload.heygen.com/v1/talking_photo", {
      method: "POST", headers: { ...H, "Content-Type": "image/png" }, body: new Uint8Array(avatar.bild),
    }).then(r => r.json()).catch(() => null) as { data?: { talking_photo_id?: string } } | null;
    lookId = up?.data?.talking_photo_id ?? "";
    posterQuelle = avatar.bild;
  }
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
  /**
   * AUCH `data:video` — die Aufnahme des Trichters IST ein Video (07.08.2026 abends, Owner:
   * „der typ hat eine frauen stimme. Meine stimme wurde nicht durchgegeben").
   *
   * GEMESSEN: Der Trichter nimmt mit MediaRecorder ein VIDEO auf (`video/mp4` bzw.
   * `video/webm`) und schickt es als `audio` mit. Hier stand nur `data:audio` — die Wache
   * liess die Aufnahme WORTLOS fallen (kein Fehler, der Zweig wurde einfach übersprungen)
   * und fiel auf die Chip-Stimme zurück, Vorgabe „Joy". Im Auftrag 24eb8a77 steht deshalb
   * `stimme: frau`, obwohl der Owner selbst gesprochen hatte.
   *
   * Dass HeyGen eine VIDEODATEI als `audio_url` nimmt und den Ton selbst herauszieht, ist
   * am 07.08. bewiesen (siehe Übergabe §2) — genau deshalb reicht EINE Aufnahme für Bild
   * und Stimme, und genau deshalb darf diese Wache das Video nicht aussortieren.
   */
  if (body.audio?.startsWith("data:audio") || body.audio?.startsWith("data:video")) {
    const mime = body.audio.slice(5, body.audio.indexOf(";"));
    const bytes = Buffer.from(body.audio.slice(body.audio.indexOf(",") + 1), "base64");
    if (bytes.length > 2_000 && bytes.length < 6_000_000) {
      /* Video behält seine eigene Endung: mp4 bleibt mp4 (nur reines Audio wird m4a).
         WAV ist seit dem 07.08. abends der REGELFALL: Der Trichter löst die Tonspur
         selbst aus der Aufnahme (HeyGen starb an der rohen Browser-Videodatei). */
      const ext = mime.startsWith("video/")
        ? (mime.includes("mp4") ? "mp4" : "webm")
        : mime.includes("wav") ? "wav"
        : mime.includes("mp4") ? "m4a" : mime.includes("mpeg") ? "mp3" : "webm";
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

  /**
   * POSTER UND GESICHT IN DEN AUFTRAG (Owner 07.08.2026 abends: „tolles poster (ironisch)
   * ich sehe nichts" — die Ergebnis-Karte zeigte eine leere braune Fläche).
   *
   * Das Avatar-Bild IST das erste Vollbild des Videos — es lag schon in der Hand und wurde
   * weggeworfen. Jetzt: hochladen, als `imagePath` in den Auftrag (Galerie-Poster), als
   * `posterUrl` in die Antwort (Ergebnis-Karte sofort). Und das KUNDENFOTO als `personPath`
   * dazu — bis heute wurde es NIRGENDS gespeichert: Der Nachliefer-Wachhund konnte nach
   * einem Browser-Schluss nur mit dem falschen alten `modelPath` neu starten, und kein
   * Ähnlichkeitstest war je nachprüfbar (Fall 24eb8a77: im Auftrag hing das Beispielbild
   * einer Frau, während der Kunde sich selbst gefilmt hatte).
   *
   * NACH dem HeyGen-Start, nicht davor: Die Uploads kosten ~1–2 s, und die gehören nicht
   * zwischen Klick und Auftragsstart. Scheitert hier etwas, fehlt nur das Poster — das
   * Video selbst läuft längst.
   */
  let posterUrl = "";
  try {
    /* WIEDERVERWENDETER LOOK: kein neues Posterbild — das alte imagePath gilt weiter,
       nur Startquittung und Stempel muessen trotzdem in den Auftrag. */
    let posterPfad = "";
    if (posterQuelle) {
      /* Der Typ nach Magie-Bytes: Die HeyGen-Look-Vorschau kommt als webp, der
         OpenAI-Rückfall als png — ein falsch beschrifteter Upload zeigt im <img> nichts. */
      const pMime = posterQuelle[0] === 0x52 ? "image/webp" : posterQuelle[0] === 0xff ? "image/jpeg" : "image/png";
      const pExt = pMime === "image/webp" ? "webp" : pMime === "image/jpeg" ? "jpg" : "png";
      const pb = posterQuelle.buffer.slice(posterQuelle.byteOffset, posterQuelle.byteOffset + posterQuelle.byteLength) as ArrayBuffer;
      posterPfad = await uploadTryThisLookBytes("uploads", pb, pMime, pExt);
      posterUrl = (await getSignedUrl(posterPfad).catch(() => "")) || "";
    }
    let personPfad = "";
    if (posterQuelle) {
      try {
        const fb = foto.buffer.slice(foto.byteOffset, foto.byteOffset + foto.byteLength) as ArrayBuffer;
        personPfad = await uploadTryThisLookBytes("uploads", fb, "image/jpeg", "jpg");
      } catch { /* das Gesicht ist Beigabe zum Poster — nie der Grund zu scheitern */ }
    }
    if (genIdStr) {
      const entries = await readKissLog();
      const eintrag = entries.find(x => x.id === genIdStr);
      if (eintrag) {
        if (posterPfad) eintrag.imagePath = posterPfad;
        if (personPfad) eintrag.personPath = personPfad;
        if (!posterUrl && eintrag.imagePath) {
          posterUrl = (await getSignedUrl(eintrag.imagePath).catch(() => "")) || "";
        }
        /* Der frisch gebaute Look wird zum Besitz des Auftrags — das naechste Rendern
           desselben Gesichts im selben Look ueberspringt den teuren Bild-Schritt. */
        if (lookNeuGebaut && lookId) {
          eintrag.heygenLookId = lookId;
          eintrag.heygenLookFuer = look.id;
          eintrag.heygenLookFoto = fotoHash;
        }
        /**
         * DIE STARTQUITTUNG GEHOERT DEM SERVER (Owner 08.08.2026: „der hat gar nichts
         * gerendert, weil ich weg geklickt habe" — zum ZWEITEN Mal an einem Tag).
         *
         * Bisher meldete der BROWSER die Kennung nach dem Startaufruf zurueck — der dauert
         * mit dem HeyGen-Look 1–2 Minuten, und wer in der Zeit wegklickt, nimmt die
         * Kennung mit ins Grab: Der Wachhund haelt den Auftrag fuer erledigt (das alte
         * Video steht ja drin) und liefert nie. Jetzt stempelt die Route selbst:
         * `videoId` macht den Auftrag fuer den Wachhund OFFEN (videoId ≠ videoDoneId),
         * `videoStartAt` gibt der Galerie ihr „Video entsteht".
         */
        eintrag.videoId = `hg:${videoId}`;
        eintrag.videoStartAt = new Date().toISOString();
        await writeKissLog(entries);
      }
    }
  } catch { /* Poster ist Beigabe — am gestarteten Video ändert ein Fehlschlag nichts */ }

  return NextResponse.json({ ok: true, videoId: `hg:${videoId}`, status: "processing", ...(posterUrl ? { posterUrl } : {}) });
}
