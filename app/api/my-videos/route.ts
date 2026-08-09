import { NextResponse } from "next/server";
import { readTryThisLookState, saveTryThisLookState, createSignedUploadUrl, getSignedUrl, readKissLog, type KissLogEntry, avatarLesen, walletGeraetVertraut } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * „My Gallery" — die Videos, die der KUNDE erzeugt hat.
 *
 * Warum es das gibt: Die Videos wurden nirgends abgelegt (Owner 28.07.2026: „wo erscheinen
 * jetzt die Videos?"). Die Adressen des Video-Anbieters verfallen nach Stunden — ohne eigene
 * Kopie ist das Video auch für den weg, der dafür bezahlt hat.
 *
 * ZUORDNUNG (Owner-Entscheidung „C"): am GERÄT **und** am Konto. `device` ist eine zufällige
 * Kennung im Browser — damit sieht er seine Videos sofort wieder, ohne Anmeldung. Kennen wir
 * zusätzlich seine E-Mail (Abo/Anmeldung), hängt das Video auch daran und folgt ihm auf jedes
 * andere Gerät.
 *
 * Diese Videos sind PRIVAT: `feed`/`public` bleiben false, sie tauchen in keinem
 * öffentlichen Feed auf (Hausregel für intime Try-ons).
 */

const clean = (s: unknown, max = 200) => String(s ?? "").trim().slice(0, max);

// POST { videoUrl, posterUrl?, lookId?, lookName?, curatorId?, device, email?, source? }
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const videoUrl = clean(body.videoUrl, 2000);
  const device = clean(body.device, 80);
  const email = clean(body.email, 160).toLowerCase();
  if (!videoUrl) return NextResponse.json({ error: "videoUrl fehlt." }, { status: 400 });
  if (!device && !email) return NextResponse.json({ error: "Keine Zuordnung (device/email)." }, { status: 400 });

  // Das Video zu UNS holen — die Anbieter-Adresse verfällt.
  let videoPath = "";
  try {
    const res = await fetch(videoUrl);
    if (!res.ok) return NextResponse.json({ error: `Video konnte nicht geladen werden (${res.status}).` }, { status: 502 });
    const bytes = new Uint8Array(await res.arrayBuffer());
    const up = await createSignedUploadUrl("videos", "mp4");
    const put = await fetch(up.uploadUrl, { method: "PUT", headers: { "Content-Type": "video/mp4", "x-upsert": "true" }, body: bytes });
    if (!put.ok) return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 502 });
    videoPath = up.path;
  } catch {
    return NextResponse.json({ error: "Video konnte nicht gespeichert werden." }, { status: 502 });
  }

  const state = await readTryThisLookState();
  const id = `${Date.now()}-${crypto.randomUUID()}`;
  state.generations.unshift({
    id,
    lookId: clean(body.lookId, 80) || "",
    lookName: clean(body.lookName, 120) || undefined,
    curatorId: clean(body.curatorId, 80) || undefined,
    ownerEmail: email || undefined,
    visitorId: device || undefined,
    videoPath,
    genKind: "video",
    source: clean(body.source, 40) || "chat",
    feed: false,
    public: false,
    createdAt: new Date().toISOString(),
  } as never);
  await saveTryThisLookState(state);
  return NextResponse.json({ ok: true, id });
}

// GET ?device=…&email=…  → die eigenen Videos, neueste zuerst.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const device = clean(url.searchParams.get("device"), 80);
  const email = clean(url.searchParams.get("email"), 160).toLowerCase();
  if (!device && !email) return NextResponse.json({ videos: [] });

  /**
   * FREMDE ADRESSE, FREMDES GERÄT — NICHTS (09.08.2026, Owner: „Kann das ein Fremder nicht
   * machen zurzeit? Wenn er nur E-Mail angibt?").
   *
   * Diese Route gab bis heute die privaten Geschenkvideos JEDER Adresse heraus, die jemand
   * eintippte — und seit gestern auch das Gesicht des Avatars. Ab jetzt zählt die Adresse
   * nur, wenn dieser Browser für sie schon einmal bezahlt hat; sonst bleibt die
   * Gerätekennung die einzige Zuordnung (die kennt nur er selbst).
   */
  const darfEmail = email ? await walletGeraetVertraut(email, device).catch(() => false) : false;
  const emailGilt = darfEmail ? email : "";

  const state = await readTryThisLookState();
  const mine = (state.generations ?? []).filter(g => {
    const gg = g as { ownerEmail?: string; visitorId?: string };
    return (emailGilt && gg.ownerEmail === emailGilt) || (device && gg.visitorId === device);
  });

  const videos = await Promise.all(mine.slice(0, 60).map(async g => {
    const gg = g as { id: string; videoPath?: string; videoUrl?: string; videoPosterPath?: string; imagePath?: string; lookName?: string; createdAt?: string; source?: string };
    // IMMER frisch signieren — gespeicherte Adressen sind nach 24 h tot.
    const video = gg.videoPath ? await getSignedUrl(gg.videoPath).catch(() => "") : (gg.videoUrl || "");
    const poster = gg.videoPosterPath ? await getSignedUrl(gg.videoPosterPath).catch(() => "") : "";
    return { id: gg.id, videoUrl: video, posterUrl: poster, name: gg.lookName || "", createdAt: gg.createdAt || "", source: gg.source || "" };
  }));

  /**
   * DIE KISS-BILDER GEHÖREN AUCH IN SEINE GALERIE (Owner 30.07.2026: „seine Galerie ist
   * leer, seine Bilder sind nicht da").
   *
   * Sie liegen im Kiss-Log, nicht bei den Try-On-Generierungen — deshalb fand die Galerie
   * nichts. Zugeordnet wird über die E-Mail (sobald er sie eingetragen hat) oder über die
   * Gerätekennung, damit es auch ohne Anmeldung sofort da ist.
   */
  const bilder = await (async () => {
    try {
      const log = await readKissLog();
      /**
       * AUCH DIE STRIPE-ADRESSE ZAEHLT (Owner 01.08.2026: „ich habe auf Watch my gallery
       * geklickt, aber das Bild ist nicht drin").
       *
       * Der Liefer-Mail-Link oeffnet die Galerie mit der E-MAIL — auf einem anderen Geraet
       * gibt es keine Geraetekennung. Verglichen wurde aber nur `e.email` (die getippte
       * Adresse). Wer seine Adresse erst an der KASSE hinterlassen hat, steht nur in
       * `paidEmail` — sein bezahltes Bild war fuer ihn unauffindbar, obwohl die Mail kam.
       */
      const meine = log.filter((e: KissLogEntry) =>
        (emailGilt && (String(e.email ?? "").toLowerCase() === emailGilt || String(e.paidEmail ?? "").toLowerCase() === emailGilt)) ||
        (device && String(e.device ?? "") === device));
      // BEIDES gehört ihm (Owner 30.07.2026: „nein, das macht man nicht so. Du speicherst
      // das auch für ihn") — sein hochgeladenes Foto UND das Ergebnis. Eigene Kennung je
      // Eintrag, sonst kollidieren die beiden in der Liste.
      const paare = await Promise.all(meine.slice(0, 60).map(async (e: KissLogEntry) => {
        /**
         * IN ARBEIT (Owner 08.08.2026: „es muss in der galerie gezeigt werden dass ein
         * video raendert. Damit der user es weiss"). Bezahlt ohne Video heisst: die Kette
         * laeuft (oder der Wachhund holt sie nach). Die Kachel bekommt das Standbild als
         * Rueckfall — vorher wurde sie ohne `imagePath` GANZ herausgefiltert, und der
         * Kaeufer sah nach dem Wegklicken nur Leere.
         */
        /**
         * NUR WAS WIRKLICH GERADE ENTSTEHT (Owner 08.08.2026: „wieso pulsiert andauernd
         * galerie? wird was gerändert?"). GEMESSEN: Der Puls kam von Tanz-Testauftraegen,
         * die seit fuenf TAGEN bezahlt-ohne-Video dastehen, und von Gutscheinen — die nie
         * ein Video bekommen (die Karte ist das Produkt). Also: juenger als eine Stunde
         * (laenger rendert keine Kette; danach ist es ein Support-Fall, kein Fortschritt)
         * und nie beim Gutschein.
         */
        const alterMs = Date.now() - new Date(e.createdAt || 0).getTime();
        /**
         * „NUR wenn was gerändert wird" (Owner 08.08., dreifach nachgeschärft — zuletzt:
         * beim NEU-Rendern eines gelieferten Auftrags fehlte jedes Zeichen, weil das alte
         * Video noch im Auftrag steht). Der ehrliche Zustand kommt aus der Buchhaltung des
         * Wachhunds: `videoId ≠ videoDoneId` heisst OFFEN beim Anbieter — auch beim
         * zweiten Lauf. Das Zeitfenster kommt vom Server-Startstempel (`videoStartAt`);
         * ohne Stempel (Altfälle) zählt das Auftragsalter. Bezahlt ganz ohne Kennung
         * zählt nur frisch (der HeyGen-Look braucht 1–2 min bis zur Kennung).
         */
        const startMs = e.videoStartAt ? Date.now() - Date.parse(e.videoStartAt) : Number.NaN;
        const fertigNachStart = !!e.videoFertigAt && !!e.videoStartAt
          && Date.parse(e.videoFertigAt) >= Date.parse(e.videoStartAt);
        /* Start-Stempel juenger als 1 h und kein Fertig-Stempel danach → es rendert.
           Altfaelle ohne Stempel: bezahlt ohne Video und juenger als 15 min. */
        const laufend = e.theme !== "gutschein"
          && ((Number.isFinite(startMs) && startMs < 60 * 60 * 1000 && !fertigNachStart)
            || (!e.videoStartAt && !e.videoUrl && !!e.paid && alterMs < 15 * 60 * 1000));
        return ([
        {
          id: e.id,
          imageUrl: (e.imagePath ? await getSignedUrl(e.imagePath).catch(() => "") : "")
            || (laufend && (e.modelPath || e.personPath)
              ? await getSignedUrl(String(e.modelPath || e.personPath)).catch(() => "") : ""),
          videoUrl: e.videoUrl || "",
          ...(laufend ? { rendert: true, rendertSeit: e.videoStartAt || e.createdAt || "" } : {}),
          name: e.modelName || "",
          createdAt: e.createdAt || "",
          source: "kiss",
          /**
           * FUER DIE KARTEN-VORSCHAU (Owner 03.08.2026: „ich will nicht das Video teilen,
           * sondern die Karte. Also muss beim Klick die Karte mit Musik und Herzchen kommen").
           * Ohne den Namen stiege in der Vorschau „ich liebe dich" auf statt „Anna, ich liebe
           * dich" — und die Karte sieht anders aus als die, die der Empfaenger bekommt.
           */
          theme: e.theme || "kiss",
          empfaenger: e.empfaenger || "",
          // Das Urteil der Alters- und Nacktheitspruefung — daraus wird in der Galerie das
          // Warnzeichen (Owner 31.07.2026). Steht nur da, wenn etwas auffiel.
          warnung: e.altersWarnung || "",
          alter: e.altersGeschaetzt || 0,
        },
        {
          id: `${e.id}-frau`,
          imageUrl: e.modelPath ? await getSignedUrl(e.modelPath).catch(() => "") : "",
          videoUrl: "",
          name: "Deine Frau",
          createdAt: e.createdAt || "",
          source: "kiss-model",
          // Die Warnung gilt dem ganzen Vorgang: Das Ergebnis entsteht aus BEIDEN Vorlagen,
          // also traegt jede das Zeichen. Sonst sucht man das auffaellige Bild einzeln.
          warnung: e.altersWarnung || "",
          alter: e.altersGeschaetzt || 0,
        },
        {
          id: `${e.id}-foto`,
          imageUrl: e.personPath ? await getSignedUrl(e.personPath).catch(() => "") : "",
          videoUrl: "",
          name: "Dein Foto",
          createdAt: e.createdAt || "",
          source: "kiss-upload",
          warnung: e.altersWarnung || "",
          alter: e.altersGeschaetzt || 0,
        },
      ]);
      }));
      return paare.flat();
    } catch { return []; }
  })();

  /**
   * SEIN AVATAR (Owner 09.08.2026: „ich will dass du das Video das die Leute hochladen
   * Avatar nennst. Auch in der Galerie.").
   *
   * Er steht neben den Werken, nicht darunter: Der Avatar ist kein Ergebnis, sondern das
   * WERKZEUG, mit dem alle Ergebnisse entstehen — sein Gesicht und seine Stimme. Deshalb
   * liefert die Route ihn getrennt aus; die Galerie zeigt ihn oben und sagt dazu, dass
   * eine neue Aufnahme ihn ersetzt.
   *
   * Er hängt am KONTO. Ohne Adresse gibt es keinen — sonst läge das Gesicht eines Kunden
   * an einer Gerätekennung, die sich jeder Browser selbst ausdenkt.
   */
  const avatar = await (async () => {
    if (!emailGilt) return null;
    const a = await avatarLesen(emailGilt).catch(() => null);
    if (!a?.bildPfad) return null;
    const bild = await getSignedUrl(a.bildPfad).catch(() => "");
    if (!bild) return null;
    return { imageUrl: bild, stimme: !!a.tonPfad, at: a.at ?? "" };
  })();

  return NextResponse.json({
    videos: videos.filter(v => v.videoUrl),
    pictures: bilder.filter(b => b.imageUrl || b.videoUrl),
    ...(avatar ? { avatar } : {}),
  }, { headers: { "Cache-Control": "no-store" } });
}
