import { NextResponse } from "next/server";
import { readTryThisLookState, saveTryThisLookState, createSignedUploadUrl, getSignedUrl, readKissLog, type KissLogEntry, avatarLesen, walletGeraetVertraut } from "@/lib/try-this-look-store";
import { getSellerFromRequest } from "@/lib/supabase-auth-server";
import { isAdminRequest } from "@/lib/admin-auth";
import { lieferungAnstossen } from "@/lib/kiss-delivery";
import { futureProgramUrl } from "@/lib/future-program-store";
import { geschenkPreisCents } from "@/lib/pricing";
import { leseDavid } from "@/lib/david-store";
import { leseLebenslauf } from "@/lib/lebenslauf-store";

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
  /**
   * DER BETREIBER DARF IN DIE GALERIE SEINES KUNDEN SEHEN (Owner 14.08.2026: „ich will mich
   * in seiner Galerie einloggen können und sehen ob er das generierte Video in der Galerie
   * hat").
   *
   * Ohne das steht er vor derselben Wand wie heute: Bei Stripe eine Zahlung, im Auftrag
   * „unbezahlt", und ob der Kunde je etwas bekommen hat, konnte nur ein Skript beantworten.
   * Der Admin-PIN hebt deshalb ZWEI Regeln auf, die fuer Besucher bleiben — die eigene
   * Anmeldung sticht die Anfrage nicht mehr, und der Geraete-Riegel gilt nicht. Fuer jeden
   * ohne PIN aendert sich nichts.
   */
  const admin = await isAdminRequest(request).catch(() => false);
  const gefragt = clean(url.searchParams.get("email"), 160).toLowerCase();
  const email = admin ? (gefragt || kontoMail) : (kontoMail || gefragt);
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
  const darfEmail = admin || kontoMail ? true : email ? await walletGeraetVertraut(email, device).catch(() => false) : false;
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

  /**
   * DER SELBSTHEILER (Owner 14.08.2026, 23 Uhr, live: „es dauert viel zu lange und landet
   * nicht in der Galerie … Was machen wir jetzt?").
   *
   * Der Wachhund STARTET haengende Auftraege, aber seine Kette lebt nur Minuten — wer das
   * fertige Video ABHOLT, war danach dem Tages-Cron (05:00) ueberlassen. Genau die Galerie
   * ist der Ort, an dem der Kunde nachschaut: Ab jetzt weckt jeder Galerie-Besuch die
   * Lieferkette fuer die EIGENEN ueberfaelligen, bezahlten Auftraege. Gezielt je Auftrag,
   * hoechstens zwei je Aufruf (kein Sturm), Feuer-und-vergessen (die Antwortzeit der
   * Galerie bleibt unberuehrt). kiss-deliver selbst startet nie doppelt und respektiert
   * MAX_VERSUCHE — mehr Schutz braucht es hier nicht.
   */
  try {
    const jetzt = Date.now();
    /**
     * ZWEI GRÜNDE ZU WECKEN (15.08.2026, nach dem Fall „Video liegt fertig bei Pixverse und
     * kommt nie an"):
     *
     *   1. ABHOLEN — der Auftrag trägt eine Auftragsnummer, das Video ist also unterwegs oder
     *      längst fertig. Das kostet nichts und startet nichts, also gilt hier KEIN Gatter:
     *      weder Anläufe noch Frist noch Absage-Vermerk dürfen den Kunden von einem Video
     *      fernhalten, das schon bezahlt und schon gerendert ist. Genau diese Gatter haben
     *      es vorher getan.
     *   2. STARTEN — noch keine Auftragsnummer. Auch hier zählt kein Anlauf-Deckel mehr
     *      (Owner 15.08.2026: „drei Anläufe muss raus"); den Dauerlauf bremst allein der
     *      Mindestabstand in /api/kiss-deliver, der weiß, wann zuletzt gestartet wurde.
     */
    const abzuholen = meineKiss.filter(e => e.paid && !e.videoUrl && !!e.videoId && e.videoId !== e.videoDoneId);
    const zuStarten = meineKiss.filter(e => e.paid && !e.videoUrl && !e.videoId
      && e.videoDueAt && Date.parse(e.videoDueAt) <= jetzt);
    [...abzuholen, ...zuStarten]
      .slice(0, 2)
      .forEach(e => lieferungAnstossen(url.origin, e.id));
  } catch { /* Heilung ist Zugabe — die Galerie antwortet auch ohne sie */ }

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
        /**
         * EIN BEZAHLTER AUFTRAG OHNE VIDEO LÄUFT IMMER (15.08.2026, Owner: „das video ist
         * nicht in der galerie wieso auch immer" — die Kachel war von 12 auf 11 verschwunden).
         *
         * WAS PASSIERT WAR: Beide Fristen unten (Start-Stempel < 1 h, ohne Stempel < 15 min)
         * liefen ab. Damit war `laufend` falsch, damit fiel das Ersatzbild weg (es haengt
         * unten an `laufend`), damit hatte die Kachel weder `imageUrl` noch `videoUrl` — und
         * `pictures.filter(b => b.imageUrl || b.videoUrl)` warf sie ganz aus der Liste. Der
         * Kunde sah nicht etwa „dauert noch", sondern GAR NICHTS. Sein bezahlter Auftrag war
         * spurlos weg, obwohl er im Protokoll stand und das Video beim Anbieter fertig lag.
         *
         * Die Fristen stammen aus der Zeit, als nach drei Anlaeufen aufgegeben wurde — dann
         * war „seit 2 Stunden am Rendern" tatsaechlich gelogen. Seit heute gibt der Server
         * nie mehr auf (MAX_VERSUCHE ist gestrichen): Solange bezahlt ist und kein Video da
         * ist, ist es unterwegs. Genau das sagt die Kachel jetzt — ohne Ablaufdatum.
         */
        /**
         * EIN UNTERLAGEN-KAUF WARTET NICHT AUF EIN VIDEO (Fehler gefunden 28.08.2026 an der
         * echten Zahlung des Owners: „es ist keine Prozentzahl. Wie lange dauert es?" — die
         * Kachel drehte, obwohl gar nichts lief).
         *
         * `offenerKauf` hiess bisher „bezahlt und kein Video da". Das stimmte, solange jedes
         * Produkt des Hauses ein Video war. David verkauft Lebenslauf und Anschreiben als
         * PDF — dort kommt NIE ein `videoUrl`, und die Kachel hätte sich bis in alle Ewigkeit
         * gedreht. Ein Drehrad, das nie stehen bleibt, ist schlimmer als gar keins: Es
         * versteckt auch den Erstattungs-Knopf, der erst erscheint, wenn nichts mehr läuft.
         *
         * DIESELBE UNTERSCHEIDUNG WIE IM WACHHUND (lib/kiss-delivery.ts): Ein Video kann nur
         * schulden, wer eine Aufnahme oder ein Foto dafür hinterlegt hat.
         */
        /* WAS EIN VIDEO ANKÜNDIGT, IST DIE AUFNAHME — NICHT EIN FOTO (korrigiert 28.08.2026,
           nachdem die Analyse-Kachel des Owners mitdrehte).
           Die erste Fassung fragte zusätzlich nach `personPath`/`modelPath` und hielt „hat ein Bild"
           für „hat ein Video bestellt". Seit David nach dem BEWERBUNGSFOTO fragt, landet genau dort
           ein Bild — jeder Unterlagen-Kauf sah damit aus wie ein Video-Kauf. Die Video-Bewerbung
           verlangt zwingend eine Selbstaufnahme (`audioPath`); ohne sie gibt es nichts zu rendern. */
        const unterlagenKauf = e.theme === "david" && !e.audioPath;
        const offenerKauf = !!e.paid && !e.videoUrl && !unterlagenKauf;
        /**
         * KAPUTT IST NICHT LANGSAM (Owner 15.08.2026: „es war vor 5 Tagen" — zu einem
         * Auftrag, der immer noch „wird erstellt" drehte).
         *
         * `laufend` hiess bisher nur: bezahlt und kein Video. Ohne Ablaufdatum, seit die
         * drei Anlaeufe gestrichen sind. Fuer einen Auftrag, der wirklich rendert, ist das
         * richtig; fuer einen, den der Server aufgegeben hat, ist es ein Drehrad, das luegt
         * — und es versteckt den Erstattungs-Knopf, denn der erscheint erst, wenn nichts
         * mehr „laeuft".
         *
         * ZWEI WEGE HIERHER: Entweder hat die Bremse in /api/kiss-deliver gestoppt (dann
         * steht `videoAlertAt`), oder der Auftrag scheitert seit ueber einer halben Stunde
         * an einem gemeldeten Fehler. Ein langsamer Pixverse-Lauf erfuellt beides nicht.
         */
        const gescheitert = offenerKauf && (
          !!e.videoAlertAt
          || (!!e.videoError && (e.videoTries ?? 0) >= 5 && alterMs > 30 * 60 * 1000)
        );
        const laufend = !gescheitert && e.theme !== "gutschein"
          && (offenerKauf
            || (Number.isFinite(startMs) && startMs < 60 * 60 * 1000 && !fertigNachStart)
            || (!e.videoStartAt && !e.videoUrl && !!e.paid && !e.videoError && alterMs < 15 * 60 * 1000));
        /**
         * DIE EIGENAUFNAHME DES BEWERBERS ALS EIGENE KACHEL (Owner 24.08.2026: „DU musst
         * das Original-Video speichern unter Käufe und das Ergebnis. Ich muss sie
         * herunterladen können, damit ich daraus ein Werbevideo machen kann").
         *
         * `/api/lebenslauf-fertigstellen` legt die Aufnahme als `audioPath` an den Auftrag.
         * Sie ist hier ausdrücklich KEIN Beiwerk im Sinne der Regel vom 12.08. (dort:
         * hochgeladene VORLAGEN-Fotos) — sie ist sein Rohmaterial und gehört ihm wie das
         * Ergebnis. `source: "kiss-aufnahme"` sorgt dafür, dass die Kachel KEINEN
         * Löschknopf trägt (die Galerie zeigt ihn nur an `source === "kiss"`): Genau an
         * so einer Zweitkachel hat ein Löschtipp am 12.08. einen bezahlten Auftrag samt
         * Video mitgerissen. Gelöscht wird am WERK — dann verschwinden beide.
         */
        const aufnahmeUrl = e.theme === "lebenslauf" && e.audioPath
          ? await getSignedUrl(String(e.audioPath)).catch(() => "") : "";
        /**
         * ZWEI KACHELN JE DAVID-AUFTRAG (Owner 28.08.2026: „zwei Kacheln. In der Analyse ist
         * David als Bild und in der Bewerbung ich oder das Template").
         *
         * Er hatte gefragt, ob die Analyse verschwindet, sobald die Bewerbung geschrieben
         * ist — und dabei fiel auf, dass EINE Kachel für beides stand. Sie führte immer zum
         * Bericht; das bezahlte PDF war aus der Galerie gar nicht erreichbar.
         *
         * Jetzt trennt sich, was zwei verschiedene Dinge sind: die ANALYSE (Davids Gesicht,
         * führt zum Bericht — dorthin kommt man immer wieder zurück) und die BEWERBUNG (sein
         * eigenes Foto oder die gewählte Vorlage, führt zum PDF — das holt man einmal).
         *
         * SEIN FOTO ZUERST, DIE VORLAGE ALS RÜCKFALL: Wer ein Bewerbungsfoto hochgeladen
         * hat, erkennt seine Kachel daran sofort. Ohne Foto zeigt sie das Blatt, das er
         * gewählt hat — auch das ist unverwechselbar, weil jede Vorlage anders aussieht.
         *
         * NUR NACH DER ZAHLUNG: Vorher gibt es nur die Muster-Fassung mit Wasserzeichen, und
         * eine Kachel, die auf ein Wasserzeichen führt, sieht aus wie ein kaputtes Produkt.
         */
        const bewerbungKachel = await (async () => {
          if (e.theme !== "david" || !e.paid) return null;
          const profil = await leseLebenslauf(e.id).catch(() => null);
          const vorlage = String(profil?.pdfVorlage || "klassik");
          /**
           * DIE KACHEL ENTSTEHT MIT DER ZAHLUNG, NICHT MIT DEM ERGEBNIS (Owner 28.08.2026:
           * „nein, die Kachel soll sofort angelegt werden aber als ladend").
           *
           * Erst wollte ich sie zeigen, sobald die Unterlagen fertig sind — der Gedanke war,
           * dass eine Kachel, hinter der ein Wasserzeichen liegt, wie ein kaputtes Produkt
           * aussieht. Er hat den besseren Blick: Zwischen Zahlung und fertigem PDF liegen
           * dreissig Sekunden, in denen der Kunde die Seite schliessen darf. Erscheint die
           * Kachel erst danach, hat er in genau dieser Zeit KEINEN Beweis, dass sein Geld
           * angekommen ist — und das ist der Moment, in dem er sich am unsichersten fühlt.
           *
           * `bezahlt` am PROFIL (nicht am Auftrag) ist das Fertig-Zeichen: Es setzt erst der
           * Optimierungslauf. Solange es fehlt, dreht die Kachel; das PDF gibt es dann noch
           * nicht zu holen, und sie führt bewusst ins Leere statt auf die Muster-Fassung.
           */
          const fertig = profil?.bezahlt === true;
          /**
           * KAPUTT IST NICHT LANGSAM — AUCH BEI UNTERLAGEN (Owner 28.08.2026: „das lädt
           * immer noch", zu einem Auftrag, dessen Optimierung nie ansprang).
           *
           * Ein Optimierungslauf dauert rund vierzig Sekunden. Steht nach zehn Minuten immer
           * noch nichts, läuft nichts mehr — dann ist ein Drehrad eine Lüge, und es versteckt
           * obendrein den Weg zur Erstattung, denn der erscheint erst, wenn nichts mehr
           * läuft. Dieselbe Haltung wie bei den Videos, nur mit der kürzeren Frist, die zu
           * einem Textlauf passt.
           */
          /* ALTAUFTRÄGE KENNEN `paidAt` NICHT — sie entstanden, bevor es das Feld gab. Für
             sie zählt `createdAt`; das liegt VOR der Zahlung, die Frist läuft also eher ab
             als zu spät. Genau richtig: Ein alter Auftrag, der nie geliefert hat, soll nicht
             als „läuft gerade" durchgehen. */
          const seit = Date.parse(String(e.paidAt || e.createdAt || "")) || 0;
          const haengt = !fertig && !!seit && Date.now() - seit > 10 * 60_000;
          return {
            /* DIE KACHEL ZEIGT DAS BLATT, NICHT DAS GESICHT (Owner 28.08.2026: „kannst du
               da nicht das CV einblenden"). Zuerst stand hier sein Bewerbungsfoto — der
               Gedanke war, dass er seine Kachel daran erkennt. In der Galerie ist das falsch
               herum: neben Davids Porträt und lauter Video-Kacheln mit Gesichtern sagt ein
               weiteres Gesicht gar nichts. Was er hier hat, ist ein LEBENSLAUF, und der
               sieht aus wie ein Blatt Papier — unverwechselbar, und es ist genau die
               Vorlage, die er gewählt hat. */
            bild: `/Lebenslauf/vorlage-${vorlage}.jpg`,
            /* `ansehen=1`: Der Tipp auf die Kachel ÖFFNET das PDF im Browser, er lädt es
               nicht wortlos herunter (Owner 28.08.2026). Wer es speichern will, tut das aus
               der Vorschau heraus. */
            /* KEIN `device` MEHR IN DER ADRESSE (28.08.2026, Owner: „er kann das nicht
               weitergeben"). Die Gerätekennung war dort faktisch ein Schlüssel: Wer den
               vollständigen Link hatte, bekam die Bewerbung. Jetzt entscheidet der signierte
               Keks im Browser — und der reist bei einem weitergeleiteten Link nicht mit. */
            pdf: fertig ? `/api/bewerbung-pdf?id=${encodeURIComponent(e.id)}&ansehen=1` : "",
            titel: String(profil?.anzeigeTitel || ""),
            /* OFFEN ODER ZU (Owner 28.08.2026): Solange kein Passwort vergeben ist, öffnet
               jeder mit dem Link die Bewerbung — das Schloss sagt es, statt es zu
               verschweigen. */
            geschuetzt: !!profil?.pdfSchutz,
            fertig,
            haengt,
            seit: String(e.paidAt || e.createdAt || ""),
          };
        })();
        return ([
        {
          id: e.id,
          imageUrl: (e.imagePath ? await getSignedUrl(e.imagePath).catch(() => "") : "")
            /* Beim Lebenslauf IMMER sein Foto als Poster, auch am fertigen Video (Skill
               `card`: nie ein Video ohne Poster) — das HeyGen-Ergebnis bringt keins mit. */
            || ((laufend || gescheitert || e.theme === "lebenslauf") && (e.modelPath || e.personPath)
              /* AUCH IM FEHLERFALL (15.08.2026): Die Galerie wirft Kacheln ohne Bild und
                 ohne `rendert` aus der Liste — ein gescheiterter Auftrag waere spurlos
                 verschwunden, statt seinen Zustand zu zeigen. Sein Standbild existiert
                 immer, es ist sein eigenes Foto. */
              ? await getSignedUrl(String(e.modelPath || e.personPath)).catch(() => "") : ""),
          videoUrl: e.videoUrl || "",
          ...(laufend ? { rendert: true, rendertSeit: e.videoStartAt || e.createdAt || "" } : {}),
          /* Ehrlich statt hoffnungsvoll — die Galerie zeigt darauf den Fehlerzustand. */
          ...(gescheitert ? { gescheitert: true } : {}),
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
          /* DER HOCHGELADENE LEBENSLAUF AM WERK (Owner 26.08.2026: „wo ist das? Assets …
             Da müsste es doch sein") — Pfad + Name, die Galerie baut daraus ihren
             /api/download-Link. Nur der PFAD reist, nie eine signierte Adresse: der
             Download-Weg signiert selbst und setzt den Dateinamen. */
          ...((e.theme === "lebenslauf" || e.theme === "david") && e.cvPath
            ? { cvPath: String(e.cvPath), cvName: String(e.cvName || "Lebenslauf.pdf") }
            : {}),
          /**
           * DER DAVID-BERICHT IN DEN ASSETS (Owner 28.08.2026, §19: „Der komplette
           * David-Report darf automatisch in ‚Meine Assets' gespeichert werden. Bestehende
           * Asset-Funktion verwenden.").
           *
           * Er ist weder Bild noch Video — die Kachel trägt deshalb nur einen LINK auf
           * seine eigene Adresse (`/david/<id>`), genau wie das Programm beim Versprechen
           * (`programUrl`). Gelesen wird die Sitzung nur für David-Aufträge, und nur, wenn
           * es wirklich einen Bericht gibt: eine abgebrochene Sitzung soll keine leere
           * Kachel erzeugen.
           */
          ...(await (async () => {
            if (e.theme !== "david") return {};
            const sitzung = await leseDavid(e.id).catch(() => null);
            if (!sitzung?.report) return {};
            return {
              berichtUrl: `/david/${e.id}`,
              /* DIE KACHEL BRAUCHT EIN BILD, sonst wirft der Filter unten sie hinaus
                 (`pictures.filter(b => b.imageUrl || b.videoUrl)`) — und ein Bericht hat
                 weder Standbild noch Video. Davids Porträt ist das ehrliche Zeichen dafür:
                 dasselbe Gesicht, das im Ergebnis oben steht. */
              /* EIN ZEICHEN, KEIN GESICHT (Owner 28.08.2026: „und statt Davidbild ein Icon
                 für die Analyse"). Davids Porträt stand in der Galerie neben lauter
                 Video-Kacheln mit Gesichtern und las sich wie eines davon. Die Kachel braucht
                 trotzdem ein Bild — ohne fliegt sie durch den Filter unten heraus —, also ist
                 es jetzt ein gezeichnetes: Balken für die Auswertung, Schloss für „gehört
                 dir", dieselbe Geste wie die Zutaten-Kachel im Angebot. */
              /* MIT FASSUNGSNUMMER — dieselbe Lehre wie bei den Vorlagen-Vorschauen
                 (28.08.2026): Vercel liefert /public mit langer Cache-Zeit aus. Ändert sich
                 die Zeichnung, sähe jeder wiederkehrende Besucher wochenlang die alte. Wer
                 die Datei ändert, zählt hier eine hoch. */
              imageUrl: "/Lebenslauf/analyse-kachel.svg?v=2",
              /* „Analyse" statt des Auftragsnamens — seit die Bewerbung eine eigene Kachel
                 hat, müssen die zwei auf einen Blick unterscheidbar sein. */
              name: "Analyse",
              /**
               * AUCH HIER EIN SCHLOSS (Owner 28.08.2026: „auch bei der Analyse? kann das
               * jeder sehen?").
               *
               * Und hier steht es GESCHLOSSEN — anders als an der Bewerbung. Der Bericht ist
               * seit heute durch den Besitz-Keks gesperrt: Ein weitergeleiteter Link öffnet
               * beim Empfänger nichts. Das ist der Zustand, den das zugesperrte Schloss
               * meint.
               *
               * An der Bewerbung ist es offen, solange kein Passwort vergeben ist — dort geht
               * es nicht um den Zugriff (der Keks schützt beides), sondern um das TEILEN: Wer
               * seine Bewerbung an eine Firma schicken will, braucht einen Link, der bei
               * einem Fremden funktioniert. Genau der ist ohne Passwort ungeschützt.
               */
              geschuetzt: true,
              berichtTitel: sitzung.jobTitel || "",
              ...(sitzung.cvPath ? { cvPath: sitzung.cvPath, cvName: sitzung.cvName || "Lebenslauf.pdf" } : {}),
            };
          })()),
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
        /* Die BEWERBUNG als eigene Kachel — siehe `bewerbungKachel` oben. */
        ...(bewerbungKachel ? [{
          id: `${e.id}-bewerbung`,
          imageUrl: bewerbungKachel.bild,
          videoUrl: "",
          name: "Bewerbung",
          createdAt: e.createdAt || "",
          source: "david-bewerbung",
          theme: "david",
          empfaenger: "",
          videoFertigAt: "",
          paid: true,
          warnung: "",
          alter: 0,
          /* Solange nichts fertig ist, dreht die Kachel — dieselbe Anzeige wie bei einem
             laufenden Video, nur mit dem Wort „Bewerbung entsteht" (siehe konto-i18n). */
          ...(bewerbungKachel.fertig
            ? {}
            : bewerbungKachel.haengt
              ? { gescheitert: true }
              : { rendert: true, rendertSeit: bewerbungKachel.seit }),
          /* Derselbe Mechanismus wie beim Bericht: Die Galerie öffnet `berichtUrl` beim
             Tippen. Hier führt er auf das fertige PDF statt auf den Bericht — und erst,
             wenn es eines gibt. */
          ...(bewerbungKachel.pdf ? { berichtUrl: bewerbungKachel.pdf } : {}),
          berichtTitel: bewerbungKachel.titel,
          geschuetzt: bewerbungKachel.geschuetzt,
        }] : []),
        /* Die Original-Aufnahme des Bewerbers — Begründung oben bei `aufnahmeUrl`. */
        ...(aufnahmeUrl ? [{
          id: `${e.id}-aufnahme`,
          imageUrl: "",
          videoUrl: aufnahmeUrl,
          name: e.modelName ? `Original — ${e.modelName}` : "Original",
          createdAt: e.createdAt || "",
          source: "kiss-aufnahme",
          theme: "lebenslauf",
          empfaenger: "",
          videoFertigAt: "",
          paid: false,
          warnung: "",
          alter: 0,
        }] : []),
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
    /* Ein David-Bericht ist weder Bild noch Video — er kommt über `berichtUrl` herein und
       muss den Filter deshalb ausdrücklich passieren dürfen (28.08.2026). */
    pictures: bilder.filter(b => b.imageUrl || b.videoUrl || (b as { berichtUrl?: string }).berichtUrl),
    // Bezahlte 30-Tage-Programme — auch (und gerade) ohne Video, siehe oben.
    programme,
    ...(avatar ? { avatar } : {}),
  }, { headers: { "Cache-Control": "no-store" } });
}
