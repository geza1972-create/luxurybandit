import { NextResponse } from "next/server";
import { readTryThisLookState, saveTryThisLookState, createSignedUploadUrl, getSignedUrl, readKissLog, type KissLogEntry, avatarLesen, walletGeraetVertraut } from "@/lib/try-this-look-store";
import { getSellerFromRequest } from "@/lib/supabase-auth-server";
import { futureProgramUrl } from "@/lib/future-program-store";
import { geschenkPreisCents } from "@/lib/pricing";

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
  /**
   * DIE ANMELDUNG IST DER AUSWEIS (Owner 10.08.2026: „Der User meldet sich doch an. Basta").
   *
   * Sie sticht die getippte Adresse und den Geräte-Riegel: Wer angemeldet ist, IST das Konto —
   * dafür braucht dieser Browser nichts bezahlt zu haben. Ohne Anmeldung bleibt alles beim
   * Alten (Riegel unten).
   */
  const konto = await getSellerFromRequest(request).catch(() => null);
  const kontoMail = clean(konto?.email ?? "", 160).toLowerCase();
  const email = kontoMail || clean(url.searchParams.get("email"), 160).toLowerCase();
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
  const darfEmail = kontoMail ? true : email ? await walletGeraetVertraut(email, device).catch(() => false) : false;
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
  /**
   * SEINE KISS-EINTRÄGE — EINMAL GESUCHT, ZWEIMAL GEBRAUCHT (11.08.2026).
   *
   * Bis heute steckte diese Auswahl in der `bilder`-Schleife. Seit die Programm-Karte
   * (unten) aus denselben Einträgen entsteht, wäre das ein zweiter Blick ins Protokoll für
   * dieselbe Frage gewesen — `readKissLog` ist ein Netzaufruf, und zwei Leser desselben
   * Stands sind eine Gelegenheit, dass die Antworten auseinanderlaufen.
   */
  const meineKiss: KissLogEntry[] = await (async () => {
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
      return meine;
    } catch { return []; }
  })();

  const bilder = await (async () => {
    try {
      const meine = meineKiss;
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
        /* UND EIN GESCHEITERTER START IST KEIN LAUF (Owner 10.08.2026: „er rändert fake").
           Der Altfall-Zweig unten kennt keinen Stempel und würde einen bezahlten Auftrag
           auch dann 15 Minuten als „entsteht" zeigen, wenn der Startaufruf gerade abgesagt
           hat. `videoError` ist genau die Absage — der Trichter setzt sie beim Abbruch, der
           Wachhund löscht sie beim nächsten echten Anlauf. */
        const laufend = e.theme !== "gutschein"
          && ((Number.isFinite(startMs) && startMs < 60 * 60 * 1000 && !fertigNachStart)
            || (!e.videoStartAt && !e.videoUrl && !!e.paid && !e.videoError && alterMs < 15 * 60 * 1000));
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
          /**
           * NIE EIN GERATENES THEMA (Owner 11.08.2026, am echten Befund: ein Eintrag ohne
           * Thema zeigte „Kiss video" in der Galerie — „ist das ein Kiss video? Das ist ein
           * Bild und wurde bestimmt für einen anderen Zweck gemacht").
           *
           * Hier stand `e.theme || "kiss"` — der alte Rückfall aus einer Zeit, in der nur der
           * Kuss-Trichter schrieb (siehe `KissLogEntry.theme`-Kommentar). Für die ANZEIGE ist
           * das eine Behauptung: „das hier ist ein Kuss-Video", obwohl wir es schlicht nicht
           * wissen. Leer bleibt leer; die Galerie zeigt bei leerem Thema einen neutralen Text
           * statt eines geratenen. Musik/Reaktions-Auswahl (die einen Wert BRAUCHEN, aber
           * niemandem etwas behaupten) fallen weiterhin an ihrer eigenen Stelle auf "kiss"
           * zurück.
           */
          theme: e.theme || "",
          empfaenger: e.empfaenger || "",
          /**
           * DIE DATENZEILE JE WERK (Owner 11.08.2026: „stehen auch keine Daten, wann ich das
           * aufgenommen habe für was. Oder generiert wann, gekauft für wieviel, wie lang das
           * video ist"). `createdAt` steht schon oben; hier kommen die restlichen drei dazu.
           * Der Betrag ist NIE getippt — er kommt aus `geschenkPreisCents(theme)`, derselben
           * Tabelle wie die Kasse (Memory `prices-only-from-pricing-table`), und nur, wenn
           * wirklich bezahlt wurde.
           */
          videoFertigAt: e.videoFertigAt || "",
          paid: !!e.paid,
          ...(e.paid ? { preisCents: geschenkPreisCents(e.theme || "kiss") } : {}),
          // Das Urteil der Alters- und Nacktheitspruefung — daraus wird in der Galerie das
          // Warnzeichen (Owner 31.07.2026). Steht nur da, wenn etwas auffiel.
          warnung: e.altersWarnung || "",
          alter: e.altersGeschaetzt || 0,
          /**
           * DER PROGRAMM-LINK IN DER GALERIE (11.08.2026, Owner: „wo ist der link zum
           * plan?" — bisher nur in der Liefermail). NUR wenn die Programm-Datei wirklich
           * existiert (`futureProgramUrl` prüft das, nicht nur `e.theme`) — sonst führt der
           * Knopf ins Leere. `e.paid` zuerst geprüft, damit ein unbezahlter Versprechen-
           * Auftrag (den es ohnehin nicht geben sollte, die Datei entsteht erst beim
           * Bezahl-Stempel) hier keinen unnötigen Blick in den Speicher auslöst.
           */
          ...(e.theme === "versprechen" && e.paid
            ? { programUrl: await futureProgramUrl(url.origin, e.id).catch(() => undefined) }
            : {}),
        },
        /**
         * KEIN BEIWERK MEHR (Owner 12.08.2026: „die beiwerkfotos brauchst du gar nicht zu
         * zeigen in der galerie"). Hier standen zwei weitere Kacheln je Auftrag — „Deine
         * Frau" (`-frau`, modelPath) und „Dein Foto" (`-foto`, personPath). Drei Kacheln
         * für EINEN Kauf lasen sich wie drei Werke, und der Löschknopf an einer
         * Beiwerk-Kachel hat heute einen bezahlten Auftrag samt Video mitgerissen. Die
         * Vorlagen bleiben gespeichert (Owner 30.07.: „Du speicherst das auch für ihn") und
         * hängen am Auftrag — gezeigt und gelöscht wird nur noch das WERK; der Admin sieht
         * die Vorlagen weiterhin in UploadsAdmin samt Warnzeichen.
         */
      ]);
      }));
      return paare.flat();
    } catch { return []; }
  })();

  /**
   * DAS PROGRAMM HÄNGT NICHT AM VIDEO (11.08.2026, am echten Auftrag da11fe51 gemessen —
   * Owner auf die Frage, ob beide Wege repariert werden: „jaaaaaaaaaaa").
   *
   * WAS PASSIERT WAR: Der Käufer zahlte um 14:07, die Programm-Datei entstand um 14:08 —
   * und sein Video scheiterte beim Anbieter. Damit sah er sein Programm NIRGENDS: Die
   * Galerie zeigt nur Kacheln MIT Bild oder Video (der Programm-Knopf sitzt im Vollbild AM
   * Video), und die Liefermail geht erst raus, wenn `videoUrl` da ist. Der Film ist aber
   * die Zugabe; das PROGRAMM ist das Gekaufte, und es ist ab der Sekunde des Kaufs fertig.
   *
   * Deshalb eine EIGENE Liste neben `videos`/`pictures`: ein Programm ist keine Kachel (es
   * hat kein Bild und soll auch keins bekommen) — es ist die Karte ganz oben. Ein Eintrag
   * hier bedeutet: bezahlt, Datei existiert, Link gültig. `futureProgramUrl` prüft die
   * Datei wirklich; fehlt sie, gibt es keinen Eintrag statt eines Knopfs ins Leere.
   */
  const programme = await (async () => {
    try {
      const versprechen = meineKiss.filter(e => String(e.theme ?? "") === "versprechen" && !!e.paid);
      const liste = await Promise.all(versprechen.slice(0, 20).map(async (e: KissLogEntry) => {
        const programUrl = await futureProgramUrl(url.origin, e.id).catch(() => undefined);
        if (!programUrl) return null;
        /**
         * DER ZUSTAND DES FILMS — ehrlich, nicht hoffnungsvoll. `MAX_VERSUCHE` in
         * /api/kiss-deliver ist 3; danach rendert niemand mehr nach, und `videoAlertAt`
         * ist der Vermerk, dass der Käufer die „wir liefern von Hand"-Mail schon hat.
         * Beides heisst: nicht mehr warten, sondern sagen, dass es schiefging.
         */
        const film = e.videoUrl ? "fertig"
          : (e.videoAlertAt || (e.videoTries ?? 0) >= 3) ? "fehler"
          : "kommt";
        /**
         * DAS KACHELBILD DES PROGRAMMS (Owner 11.08.2026: „Das habe ich komplett
         * übersehen … Muss in der Galerie stehen … Als Bild das Standbild seiner
         * Aufnahme"). Dasselbe Standbild, das die Kette zum Erzeugen benutzt hat — es
         * existiert immer schon, bevor irgendein Film fertig ist.
         */
        const posterUrl = (e.modelPath ? await getSignedUrl(e.modelPath).catch(() => "") : "")
          || (e.personPath ? await getSignedUrl(e.personPath).catch(() => "") : "");
        return {
          id: e.id, programUrl, film, createdAt: e.createdAt || "",
          videoFertigAt: e.videoFertigAt || "",
          posterUrl,
          /**
           * DAS GENERIERTE VIDEO GEHOERT IN DIE KACHEL (Owner 12.08.2026, am eigenen
           * Programm-Eintrag mit fertigem Film: „im Programm soll das generierte video
           * stehen"). Bis hierher zeigte die Kachel IMMER nur das Standbild der Aufnahme —
           * auch wenn der Future Film längst fertig war. Nur bei `film === "fertig"` gesetzt,
           * sonst zeigt die Kachel weiter das Standbild (kein Video = nichts zum Abspielen).
           */
          videoUrl: film === "fertig" ? (e.videoUrl || "") : "",
          preisCents: geschenkPreisCents("versprechen"),
        };
      }));
      return liste.filter(Boolean) as { id: string; programUrl: string; film: string; createdAt: string; videoFertigAt: string; posterUrl: string; videoUrl: string; preisCents: number }[];
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
    // Bezahlte 30-Tage-Programme — auch (und gerade) ohne Video, siehe oben.
    programme,
    ...(avatar ? { avatar } : {}),
  }, { headers: { "Cache-Control": "no-store" } });
}
