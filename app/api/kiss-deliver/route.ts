import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { notifyAdminWhatsApp, ADMIN_URL } from "@/lib/notify-admin";
import { POLEDANCE_SETS, POLEDANCE_PROMPT } from "@/lib/poledance";
import { fashnAnziehen } from "@/lib/tryon";
import { tryonPromptZiehen } from "@/lib/tryon-szenen";
import { readKissLog, writeKissLog, getSignedUrl, readTryThisLookState, readWetterSubscribers, deleteTryThisLookImage, type KissLogEntry, avatarLesen } from "@/lib/try-this-look-store";
import { futureProgramToken } from "@/lib/future-program-store";
import { sendEmail } from "@/lib/email-send";
import { HOLIDAY_SCENES, holidayPrompt } from "@/lib/holiday-scenes";
import { weddingPrompt } from "@/lib/wedding-prompt";
import { logTunnelEventServer } from "@/lib/track-funnel-server";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * DER SERVER LIEFERT DAS BEZAHLTE VIDEO — auch wenn der Browser längst zu ist.
 *
 * Owner 30.07.2026: „nach dem ich bezahlt habe ist nichts passiert, der Kunde wurde
 * ausgeraubt." Und, als die Anzeigen liefen: „Kein Kauf darf mehr ins Leere laufen."
 *
 * WIE ES VORHER WAR: Nach der Zahlung startete der KUNDE die Erzeugung und pollte sie in
 * seinem Browser. Wer das Fenster schloss, das Handy sperrte oder in der U-Bahn das Netz
 * verlor, hatte bezahlt und bekam nichts — und niemand wusste davon, weil der Auftrag nur im
 * Arbeitsspeicher seiner Seite existierte.
 *
 * WIE ES JETZT LÄUFT:
 *   1. Zahlung (Webhook ODER Rückkehr über /api/checkout-status) vermerkt am Log-Eintrag
 *      `paid` und `videoDueAt` = jetzt + Schonfrist.
 *   2. Der Browser darf in dieser Schonfrist selbst rendern (er zeigt dem Kunden den
 *      Fortschritt) und meldet seine Auftragsnummer an den Eintrag.
 *   3. Danach übernimmt dieser Endpunkt: Auftrag starten, falls keiner läuft — sonst den
 *      laufenden pollen. Fertig heißt: Video am Eintrag (→ „My Gallery") UND per Mail.
 *
 * DOPPELTES RENDERN KOSTET GELD, deshalb die Schonfrist und die Auftragsnummer: läuft schon
 * einer, wird er nur noch beobachtet, nie ein zweiter gestartet.
 *
 * WER DARF: Cron, der Stripe-Webhook, der eigene Rückruf — über den Schlüssel; und der Admin
 * über seinen PIN. Nichts davon ist öffentlich, sonst könnte jeder fremde Videos anstoßen.
 *
 * DER CRON IN `vercel.json` IST NUR DAS LETZTE NETZ (täglich 05:00 UTC): Er fängt auf, was
 * Webhook, Rückkehr und die Rückruf-Kette nicht geschafft haben. Täglich ist auf dem
 * Hobby-Tarif das Maximum; auf Pro darf dort `0 * * * *` (stündlich) stehen.
 */

/**
 * MINDESTABSTAND ZWISCHEN ZWEI STARTVERSUCHEN (15.08.2026, ersetzt MAX_VERSUCHE = 3).
 *
 * Aufgegeben wird nie mehr (Owner: „drei Anläufe muss raus"). Der Abstand ist KEIN Deckel —
 * er begrenzt nicht, WIE OFT, sondern nur, wie schnell hintereinander.
 *
 * WOGEGEN ER SCHÜTZT — und wogegen NICHT: Es gibt keine Lücke, durch die jemand ohne Zahlung
 * ein Video auslösen könnte; `e.paid === true` steht in jedem Zweig, und dieser Endpunkt ist
 * hinter `darf()` verschlossen. Gemeint ist unsere EIGENE Automatik: Ein ordentlich bezahlter
 * Auftrag, dessen Erzeugung dauerhaft scheitert (Moderation, unbrauchbares Foto), wird von
 * Galerie-Weckruf (alle 15 s), Kette (alle 45 s) und Cron immer wieder neu gestartet. Ohne
 * Abstand wären das ~240 Starts je Stunde à ~0,40 $ für EINEN Auftrag, für den der Kunde
 * einmal 9,99 € gezahlt hat.
 *
 * 90 Sekunden (Owner 15.08.2026): für den Kunden praktisch unsichtbar — er merkt sie nur,
 * wenn seine Erzeugung wirklich fehlgeschlagen ist — und deckelt den Dauerfehler-Fall auf
 * ein Sechzehntel.
 */
const ABSTAND_MS = 90 * 1000;
// Ein Auftrag, der nach dieser Zeit immer noch „läuft", läuft nicht mehr: eine Nummer, die
// der Anbieter nicht kennt, meldet ewig „in Arbeit". Ohne diese Grenze wartet der Kunde für
// immer auf ein Video, das niemand mehr rendert.
const STECKEN_MS = 30 * 60 * 1000;
/**
 * AB WANN „ZU LANGE" (15.08.2026). Eine normale Erzeugung ist in ein bis drei Minuten
 * durch; die Aufnahme-Themen brauchen laenger. 20 Minuten liegen weit jenseits jedes
 * gesunden Laufs und weit diesseits von „faellt erst morgen auf".
 */
const ALARM_MS = 20 * 60 * 1000;
/**
 * UND AB WANN ES ZU SPAET IST (15.08.2026). Aufträge, die laenger als einen Tag liegen,
 * loesen keine Meldung mehr aus — sie bekommen nur den Stempel, damit sie kuenftig ruhig
 * bleiben. Wer aus zwei Tagen Rueckstand geweckt wird, wischt weg; wer aus zwanzig Minuten
 * geweckt wird, kann noch etwas retten.
 */
const ALARM_MAX_MS = 24 * 60 * 60 * 1000;
/**
 * DIE BREMSE (Owner 15.08.2026: „ja, Bremse einbauen" — nachdem eine Schleife 630
 * Pixverse-Credits verbrannt hatte).
 *
 * DREI BEZAHLTE STARTS JE AUFTRAG. Und zwar BEZAHLTE: Anlaeufe, die vor dem Anbieter
 * scheitern, kosten nichts und duerfen weiter unbegrenzt wiederholt werden — genau das war
 * die Absicht hinter „drei Anlaeufe muss raus". Was der Owner damals abgeschafft hat, war
 * das Aufgeben gegenueber dem KUNDEN, nicht der Schutz seines Kontos.
 *
 * WARUM DER MINDESTABSTAND NICHT REICHTE: 90 Sekunden begrenzen die Frequenz, nicht die
 * Summe. Bei ~0,22 $ je Lauf sind das rund 9 $ die Stunde fuer EINEN Auftrag, fuer den der
 * Kunde einmal 9,99 € gezahlt hat. Eine Rate ist kein Deckel.
 *
 * DREI, weil ein echter Ausfall beim Anbieter meist beim zweiten Mal durchgeht und ein
 * dauerhaft kaputter Auftrag es nie tut. Danach ist es kein Geduldsfall mehr, sondern ein
 * Fall fuer einen Menschen — der Owner bekommt die WhatsApp, der Kunde einen ehrlichen
 * Zustand und den Erstattungs-Knopf.
 */
const MAX_BEZAHLTE_STARTS = 3;
const MAX_PRO_LAUF = 3;          // wie viele Aufträge ein Aufruf gleichzeitig bearbeitet
/**
 * SO LANG WIE DAS VERSPRECHEN (15.08.2026). Vorher 10 — also ~7,5 Minuten, während die Seite
 * dem Kunden seit dem 14.08. „bis zu 10 Minuten" zusagt (`d13444e` verlängerte die Geduld des
 * BROWSERS auf 150 × 4 s, die Kette hier blieb unberührt). Wer länger brauchte, fiel auf den
 * Tages-Cron um 05:00 zurück — genau der Fall, den der Owner am 15.08. erlebt hat. 40 × 45 s
 * ≈ 30 Minuten decken auch einen langsamen Pixverse-Lauf ab. Die Glieder sind kurz und
 * kosten wenig; der Cron bleibt das letzte Netz.
 */
const HOPS_MAX = 40;             // Selbstaufrufe je Kette (~40 × 45 s ≈ 30 min)
const RUNDE_MS = 45_000;         // wie lange ein Aufruf pollt, bevor er weiterreicht

function origin(request: Request): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (env) return env;
  const host = request.headers.get("host");
  if (host) return `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
  return "https://luxurybandit.com";
}

function schluessel(): string {
  return (process.env.CRON_SECRET || process.env.TRY_THIS_LOOK_ADMIN_PIN || "").trim();
}

async function darf(request: Request): Promise<boolean> {
  /**
   * DER NACKTE CRON-KOPF IST KEIN AUSWEIS MEHR (12.08.2026, am eigenen Leib bewiesen: als
   * das lokale Geheimnis nicht stimmte, kam der Owner mit einem selbstgesetzten
   * `x-vercel-cron: 1` trotzdem herein — und genauso käme jeder Fremde herein). Vercel
   * schickt seinen Cron-Aufrufen `Authorization: Bearer <CRON_SECRET>` mit, sobald die
   * Variable gesetzt ist — DAS prüft der Bearer-Zweig unten schon. Der nackte Kopf zählt
   * nur noch, wenn GAR KEIN Geheimnis konfiguriert ist (sonst bräche der Cron beim
   * allerersten Einrichten, bevor das Geheimnis existiert).
   */
  const k = schluessel();
  if (!k && request.headers.get("x-vercel-cron")) return true;
  if (k) {
    const url = new URL(request.url);
    if (url.searchParams.get("key")?.trim() === k) return true;
    if (request.headers.get("authorization")?.trim() === `Bearer ${k}`) return true;
  }
  return isAdminRequest(request).catch(() => false);
}

/** Ihr Foto: erst der eigene Upload, sonst die Katalog-Frau über ihre Kennung. */
async function ihrFoto(e: KissLogEntry): Promise<string> {
  if (e.modelPath) { const u = await getSignedUrl(e.modelPath).catch(() => ""); if (u) return u; }
  if (!e.modelId || e.modelId === "custom") return "";
  try {
    const st = await readTryThisLookState();
    const c = (st.curators ?? []).find((x: { id?: string }) => String(x?.id ?? "") === String(e.modelId)) as
      { photoPath?: string; photoUrl?: string } | undefined;
    const p = String(c?.photoPath || c?.photoUrl || "");
    if (!p) return "";
    return p.startsWith("http") ? p : await getSignedUrl(p).catch(() => "");
  } catch { return ""; }
}

/**
 * Den Auftrag beim Anbieter anstoßen — über die vorhandene Video-Route, nicht über eine
 * zweite Pixverse-Anbindung. Ein Video, ein Weg: was dort an Prompt-Regeln und Abrechnung
 * hängt, gilt hier automatisch mit. Der Admin-Schlüssel aus der Umgebung macht uns
 * gegenüber der Route zum Personal — sonst griffe der Tagesdeckel für Gäste.
 */
async function starten(request: Request, e: KissLogEntry): Promise<{ videoId?: string; error?: string }> {
  const [sein, ihr] = await Promise.all([
    e.personPath ? getSignedUrl(e.personPath).catch(() => "") : Promise.resolve(""),
    ihrFoto(e),
  ]);
  // Ohne die beiden Vorlagen kann niemand rendern — das ist ein Fall für den Admin, keiner
  // für einen weiteren Versuch.
  /**
   * GEBURTSTAG → NEUE KETTE (07.08.2026): Der Wachhund nimmt denselben Weg wie der
   * Trichter — sonst lieferte er nach Browser-Schluss ein Pixverse-Video einer Strecke
   * nach, die es für den Geburtstag nicht mehr gibt. Er braucht dafür nur IHR Foto
   * (nurSie-Geschenk, `sein` bleibt leer) und den Empfängernamen aus dem Auftrag.
   */
  /**
   * UND DAS VERSPRECHEN GEHT DENSELBEN WEG (11.08.2026, an zwei toten Auftraegen vom
   * Vortag gefunden — Owner: „gestern haben wir den funel probiert, es wird nichts
   * generiert").
   *
   * Hier stand allein „birthday". Ein Versprechen-Auftrag fiel damit in den Kuss-Zweig
   * darunter: Der verlangt ZWEI Fotos (`sein` und `ihr`), und beim Versprechen gibt es nur
   * eines — der Wachhund brach mit „Sein Foto fehlt im Speicher." ab und lieferte nie.
   * Haette er sie gehabt, waere es schlimmer gewesen: Der Kuss-Zweig rendert eine
   * Urlaubsszene mit zwei Menschen, also ein voellig anderes Produkt als das gekaufte.
   *
   * Es ist dieselbe Kette (Aufnahme → Bild → HeyGen spricht) und derselbe Weg wie im
   * Trichter — nur der Look und der gesprochene Satz unterscheiden sich, und beide haengen
   * am `look` des Auftrags, den die Route selbst aufloest.
   */
  /**
   * DIE EIN-FOTO-THEMEN LIEFERT DER SERVER JETZT AUCH (15.08.2026, an einem echten Auftrag
   * gefunden: 21 Versuche, jedes Mal „Sein Foto fehlt im Speicher.", fuenf Tage lang ein
   * Drehrad in der Galerie).
   *
   * WAS DER FEHLER WAR: Dieser Wachhund kannte nur Themen mit ZWEI Fotos. Tanz und Try-on
   * haben aber kein Paar — sie haben eine Person und ein Kleidungsstueck. Der Auftrag fiel
   * deshalb in die Zwei-Foto-Pruefung und starb dort, endlos wiederholt.
   *
   * VIER TEILE, WIE IM TRICHTER (Owner 15.08.2026: „das Bild vom User, das Bild von FASHN
   * und Video" · „es werden sogar 4 sein" · „das Klamotten vom User, FASHN, Model vom User
   * und Video"):
   *   1. das Foto des Kunden          (Tanz und Try-on: `ihr`)
   *   2. das Kleidungsstueck          (Tanz: das gewaehlte Set aus dem Auftrag; Try-on: sein
   *                                    eigener Upload)
   *   3. das ANGEZOGENE Bild          (FASHN — Pixverse zieht nichts aus, es legt nur an)
   *   4. das Video                    (Pixverse, mit dem Prompt des jeweiligen Produkts)
   *
   * SCHEITERT FASHN, laeuft es mit dem Ausgangsfoto weiter: ein bezahlter Auftrag bekommt
   * lieber ein schwaecheres Video als gar keins.
   */
  /**
   * NOTBREMSE (15.08.2026, eine Stunde nach dem Einbau): DIESER ZWEIG IST ABGESCHALTET.
   *
   * WAS PASSIERT IST: Der Zweig darunter hat die Nachlieferung fuer Tanz und Try-on
   * geoeffnet — richtig gedacht, aber er trifft auf einen Wachhund OHNE Deckel („drei
   * Anlaeufe muss raus", 15.08.). Ein bezahlter Auftrag, dessen Erzeugung nicht durchgeht,
   * wird von Galerie-Weckruf (15 s), Kette (45 s) und Cron immer wieder angestossen — und
   * seit diesem Zweig startet jeder Anstoss einen ECHTEN, KOSTENPFLICHTIGEN Pixverse-Lauf
   * statt wie vorher an „Sein Foto fehlt im Speicher" zu scheitern.
   *
   * GEMESSEN: Top-up-Guthaben 649 → 19 in gut einer Stunde. 630 Credits, ~12 Laeufe, davon
   * 2 erklaerbar (Testlaeufe). Der Owner sah es zuerst: „irgendwas hat 8 Videos vom
   * Poledancing generiert."
   *
   * WAS FEHLT, BEVOR ER ZURUECKDARF: ein Deckel auf BEZAHLTE Startversuche je Auftrag. Der
   * Mindestabstand von 90 s begrenzt die Frequenz, nicht die Summe — bei 0,22 $ je Lauf ist
   * das kein Schutz, sondern eine Rate. „Nie aufgeben" darf fuer Anlaeufe gelten, die nichts
   * kosten; sobald ein Anlauf Geld kostet, braucht er eine Zahl.
   */
  if (false && (e.theme === "poledance" || e.theme === "tryon")) {
    if (!ihr) return { error: "Das Foto fehlt im Speicher." };
    const tanz = e.theme === "poledance";
    /* Beim Tanz steht die SET-KENNUNG im Auftrag (seit 15.08.); ohne sie das Haus-Set. */
    const set = tanz
      ? (POLEDANCE_SETS.find(x => x.id === String(e.look ?? ""))?.bild ?? POLEDANCE_SETS[0].bild)
      : sein;   /* Try-on: sein eigenes Kleidungsstueck liegt auf dem Personen-Platz */
    if (!set) return { error: "Das Kleidungsstück fehlt im Speicher." };
    const setUrl = set.startsWith("/") ? `${origin(request)}${set}` : set;
    const portraet = "Portrait crop: show only the head, shoulders and upper chest of the person, "
      + "closely framed like a headshot. She wears the outfit from the product image. "
      + "Keep her face, hair and appearance exactly the same.";
    const angezogen = await fashnAnziehen(ihr, setUrl, portraet).catch(() => null);
    const pinT = process.env.TRY_THIS_LOOK_ADMIN_PIN?.trim() ?? "";
    const r = await fetch(`${origin(request)}/api/generate-tryon-video`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(pinT ? { "x-try-look-admin-pin": pinT } : {}) },
      body: JSON.stringify({
        person: angezogen || ihr, garment: setUrl,
        ...(tanz ? { hd: true } : { garmentCutout: true }),
        prompt: tanz ? POLEDANCE_PROMPT : tryonPromptZiehen(),
      }),
    }).then(x => x.json()).catch(() => null);
    if (!r?.videoId) return { error: String(r?.error ?? "Video-Start fehlgeschlagen.") };
    return { videoId: String(r.videoId) };
  }

  if (e.theme === "birthday" || e.theme === "versprechen") {
    if (!ihr) return { error: "Ihr Foto fehlt im Speicher." };
    const pinG = process.env.TRY_THIS_LOOK_ADMIN_PIN?.trim() ?? "";
    /**
     * MIT SEINER EIGENEN STIMME NACHLIEFERN (09.08.2026 — das letzte Loch im Kaufweg).
     *
     * Der Auftrag trägt seit heute die Tonspur (`audioPath`); fehlt sie (Altfall), greift
     * der Avatar seines Kontos. Erst wenn beides leer ist, rendert der Wachhund mit der
     * Chip-Stimme — dann hat der Käufer wenigstens sein Video, statt gar keins.
     */
    let tonspur = "";
    const tonQuelle = e.audioPath || (e.email ? (await avatarLesen(e.email))?.tonPfad : "") || "";
    if (tonQuelle) tonspur = await getSignedUrl(tonQuelle).catch(() => "");
    const g = await fetch(`${origin(request)}/api/geburtstag-video`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(pinG ? { "x-try-look-admin-pin": pinG } : {}) },
      /**
       * MIT AUFTRAGSNUMMER (12.08.2026, am Auftrag da11fe51 gemessen): Die Route stempelt
       * `videoId` seit dem 08.08. SELBST an den Auftrag — aber nur, wenn sie `genId`
       * mitbekommt. Der Wachhund schickte sie nie mit; sein eigener Vermerk nach der
       * Rückkehr ist verwundbar (Funktions-Frist, paralleler Schreiber) — und genau so
       * rendert HeyGen ein bezahltes Video, von dem der Auftrag nichts weiss: doppelte
       * Anbieter-Kosten, keine Lieferung. Mit `genId` sichert die Route die Quittung an
       * der Quelle, für BEIDE Wege (Trichter und Wachhund).
       */
      body: JSON.stringify({ genId: e.id, person: ihr, name: e.empfaenger ?? "", stimme: e.stimme ?? "frau", look: e.look,
                             ...(tonspur ? { audioUrl: tonspur } : {}) }),
    }).then(x => x.json()).catch(() => null);
    if (!g?.videoId) return { error: String(g?.error ?? "Geburtstags-Start fehlgeschlagen.") };
    return { videoId: String(g.videoId) };
  }

  if (!sein || !ihr) return { error: !sein ? "Sein Foto fehlt im Speicher." : "Ihr Foto fehlt im Speicher." };

  // Szene: fest aus der Kennung abgeleitet, damit derselbe Auftrag bei einem zweiten Anlauf
  // dieselbe Szene bekommt (und nicht jedes Mal eine andere).
  const n = [...e.id].reduce((s, c) => s + c.charCodeAt(0), 0);
  const szene = HOLIDAY_SCENES[n % HOLIDAY_SCENES.length];

  const pin = process.env.TRY_THIS_LOOK_ADMIN_PIN?.trim() ?? "";
  /**
   * DIE HOCHZEIT BEKOMMT IHR EIGENES VIDEO NACHGELIEFERT (12.08.2026, am Werbetag für
   * Programm/Geburtstag/Hochzeit gefunden): Dieser generische Zweig renderte für JEDES
   * Nicht-Geburtstags-Thema eine Urlaubsszene — ein Hochzeits-Käufer, der den Browser vor
   * dem Render schloss, bekam ein Video von einem Strandausflug statt seiner Hochzeit.
   * `weddingPrompt("")` ist die bis 10.08. produktive Hochzeits-Kette (Standard-Kleid,
   * Blick in die Kamera) mit denselben @1/@2-Plätzen wie hier gebunden (@1 = SEIN Foto,
   * @2 = ihres). Nicht die Traumwelt-Kette des Trichters (die braucht einen eigenen
   * Bild-Schritt und gehört in den Plattform-Umbau, ARCHITEKTUR-PLATTFORM.md Schritt 3) —
   * aber das RICHTIGE Produkt statt des falschen. Kuss/Idol behalten vorerst den
   * Urlaubs-Rückfall (nicht beworben; derselbe Umbau-Schritt).
   */
  const rettungsPrompt = e.theme === "wedding" ? weddingPrompt("") : holidayPrompt(szene);
  const r = await fetch(`${origin(request)}/api/generate-tryon-video`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(pin ? { "x-try-look-admin-pin": pin } : {}) },
    // Reihenfolge wie im Trichter: SEIN Foto ist @image1, ihres @image2 (siehe holidayPrompt).
    body: JSON.stringify({ lookId: "look-1784191032626-70e3608b", person: sein, garment: ihr, prompt: rettungsPrompt }),
  }).then(x => x.json()).catch(() => null);
  if (!r?.videoId) return { error: String(r?.error ?? "Video-Start fehlgeschlagen.") };
  return { videoId: String(r.videoId) };
}

async function pollen(request: Request, videoId: string): Promise<{ status: string; videoUrl?: string; error?: string }> {
  const r = await fetch(`${origin(request)}/api/generate-tryon-video?videoId=${encodeURIComponent(videoId)}`)
    .then(x => x.json()).catch(() => null);
  return { status: String(r?.status ?? "processing"), videoUrl: r?.videoUrl, error: r?.error };
}

/**
 * Die Abmelde-Adresse MIT Kennung. Wer bei uns unterschreibt, muss auch wieder herauskommen
 * (Owner 30.07.2026) — ein leeres `s=` meldet niemanden ab und treibt die Leute stattdessen
 * auf den Spam-Knopf.
 */
async function abmeldeLink(o: string, email: string): Promise<string> {
  try {
    const liste = await readWetterSubscribers("kiss");
    const da = liste.find(x => String(x.email ?? "").trim().toLowerCase() === email.trim().toLowerCase());
    if (da?.id) return `${o}/api/wetter-unsubscribe?model=kiss&s=${encodeURIComponent(String(da.id))}`;
  } catch { /* ohne Kennung bleibt der Weg ueber /unsubscribe */ }
  return `${o}/unsubscribe`;
}

/**
 * BETREFF UND TITELZEILE KENNEN IHR THEMA (11.08.2026, Future Self Program).
 *
 * „Your video is ready" passt zum Kuss, aber nicht zum 49-€-Future-Film — der Käufer hat kein
 * „Video" gekauft, sondern ein Versprechen an sich selbst.
 */
function liefermailTitel(e: KissLogEntry): string {
  return e.theme === "versprechen" ? "Your Future Film is ready 🎬" : "Your video is ready 🎬";
}

/** Das fertige Video an den Käufer — die Mail ist der Ersatz für den Browser, der zu ist. */
async function verschicken(request: Request, e: KissLogEntry): Promise<boolean> {
  const to = String(e.paidEmail || e.email || "").trim();
  if (!to || !e.videoUrl) return false;
  const o = origin(request);
  const abmelden = await abmeldeLink(o, to);
  const titel = liefermailTitel(e);
  /**
   * DER PROGRAMM-LINK — GOLD-KNOPF FÜR DAS VERSPRECHEN (11.08.2026).
   *
   * Owner-Vorgabe: „das Programm ist das Versprechen der Seite, also Programm = Gold-Knopf,
   * Galerie = Textzeile darunter" — umgekehrt zu jedem anderen Thema, wo die Galerie der
   * Gold-Knopf ist. Beim Versprechen hat der Käufer kein „Video" gekauft, sondern ein
   * 30-Tage-Programm; genau dorthin soll der eine Klick führen, den eine Mail bekommt.
   *
   * `futureProgramToken` liefert nur dann etwas, wenn ein Server-Geheimnis gesetzt ist
   * (CRON_SECRET/TRY_THIS_LOOK_ADMIN_PIN) — ohne Geheimnis kein Token, dann fällt die Mail
   * auf den alten Weg zurück (Gold-Knopf = Galerie), statt einen kaputten Link zu verschicken.
   */
  const programToken = e.theme === "versprechen" ? futureProgramToken(e.id) : "";
  const programLink = programToken ? `${o}/future-program?g=${encodeURIComponent(e.id)}&t=${programToken}` : "";
  const galerieLink = `${o}/my-gallery?utm_source=liefermail`;
  const goldKnopf = programLink
    ? `<a href="${programLink}" style="display:inline-block;background:#f6cf51;color:#111;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:bold;text-decoration:none">Start your 30 days →</a>`
    : `<a href="${galerieLink}" style="display:inline-block;background:#f6cf51;color:#111;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:bold;text-decoration:none">Watch your video</a>`;
  const galerieZeile = programLink
    ? `<tr><td style="padding:0 22px 4px"><a href="${galerieLink}" style="color:#a89f8e;font-size:12px">Or watch your video in your gallery</a></td></tr>`
    : "";
  const html =
    `<div style="background:#0d0b0a;padding:22px 0;font-family:Arial,Helvetica,sans-serif">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">`
    + `<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="width:520px;max-width:94%;background:#16120f;border-radius:18px;overflow:hidden">`
    + `<tr><td style="padding:20px 22px 6px;color:#f6cf51;font-size:13px;font-weight:bold;letter-spacing:2px">LUXURYBANDIT</td></tr>`
    + `<tr><td style="padding:0 22px 12px;color:#fff;font-size:20px;font-weight:bold">${titel}</td></tr>`
    + `<tr><td style="padding:0 22px 14px;color:#e8e2d6;font-size:14px;line-height:1.55">`
    + (e.theme === "versprechen"
        ? `Your Future Film is here — it is saved in your gallery, so you can watch it again any time. Your 30-day program starts now.`
        : `Thank you — here it is. It is also saved in your gallery, so you can watch it again any time.`)
    + `</td></tr>`
    /**
     * DER KNOPF FÜHRT AUFS PORTAL, NICHT ZUR DATEI (OFFEN.md Punkt 3, Owner: „sie sollen das
     * Bild nicht per E-Mail bekommen am besten, damit sie es nicht haben und immer wieder auf
     * das Portal kommen können").
     *
     * Vorher stand hier die rohe Video-Adresse: Wer sie hatte, brauchte uns nie wieder — und
     * sie ist signiert, nach Ablauf wäre der Knopf in einer alten Mail tot. Die Galerie
     * dagegen lebt, zeigt das Video für immer (sie signiert bei jedem Aufruf frisch) und
     * steht neben dem Kaufknopf fürs nächste. Genau dorthin soll jeder Klick aus einer Mail.
     */
    + `<tr><td style="padding:0 22px 10px">${goldKnopf}</td></tr>`
    + galerieZeile
    + `<tr><td style="padding:0 22px 20px"><a href="${abmelden}" style="color:#6b655c;font-size:11px">Unsubscribe</a></td></tr>`
    + `</table></td></tr></table></div>`;
  const r = await sendEmail({
    to,
    subject: titel,
    html,
    listUnsubscribe: abmelden,
  }).catch(() => ({ ok: false }));
  return !!(r as { ok?: boolean }).ok;
}

/** Ein Durchgang über alle offenen Aufträge. Gibt zurück, wie viele noch laufen. */
async function durchgang(request: Request, nurId: string): Promise<{ offen: number; erledigt: string[]; log: string[] }> {
  const alle = await readKissLog();
  const jetzt = Date.now();
  const alarmiert: string[] = [];
  /**
   * AUFGEGEBENE AUFTRÄGE MELDEN. Drei Anläufe sind durch, ein Video gibt es nicht — der
   * Käufer erfährt es einmal, nicht bei jedem Cron-Lauf (`videoAlertAt`).
   */
  /**
   * OFFEN heißt: es läuft ein Auftrag, der noch nicht geliefert ist — nicht „es gibt noch
   * kein Video". Der Unterschied ist das Abo (Owner 30.07.2026: „funktioniert das ganze mit
   * abo genauso?"): Wer fünf Videos im Monat macht, hat nach dem ersten längst ein `videoUrl`
   * am Eintrag; das zweite wäre sonst nie fällig und hinge wieder allein am Browser.
   */
  const offenerAuftrag = (e: KissLogEntry) =>
    e.videoId ? e.videoId !== e.videoDoneId : !e.videoUrl;

  /**
   * DREI ANLÄUFE SIND RAUS (Owner 15.08.2026: „drei Anläufe muss raus").
   *
   * Ein bezahlter Auftrag wird nicht mehr aufgegeben. Vorher stand nach dem dritten
   * Fehlversuch eine Absage-Mail und der Auftrag blieb liegen — der Kunde hatte bezahlt und
   * bekam nichts. Der Server versucht es ab jetzt weiter, so lange, bis ein Video da ist.
   *
   * WAS AN DIE STELLE DER ZAHL TRITT: ein MINDESTABSTAND zwischen zwei Startversuchen.
   * „Unbegrenzt oft" darf nicht „unbegrenzt schnell" heißen — jeder Start kostet bei
   * Pixverse/HeyGen echtes Geld, und die Galerie weckt die Kette alle 15 Sekunden. Lehnt ein
   * Anbieter einen Auftrag dauerhaft ab (Moderation), liefe er sonst im Sekundentakt neu an
   * und verbrennte Geld, ohne je zu liefern. Mit dem Abstand bleibt es beim Willen des
   * Owners — es hört nie auf — und kostet trotzdem höchstens einen Lauf je Fenster.
   */
  /**
   * WENN EIN BEZAHLTER AUFTRAG ZU LANGE BRAUCHT, ERFAEHRT ES DER OWNER — PER WHATSAPP
   * (Owner 15.08.2026: „ich muss aber eine Meldung bekommen wenn der Auftrag zu lange
   * dauert. Weil dann stimmt was nicht" · „eigentlich muesste ich eine Meldung per WA
   * bekommen an meine Nummer").
   *
   * DER ANLASS, GEMESSEN: Ein Tanz-Auftrag drehte FUENF TAGE lang seine Runden — 21
   * Versuche, jedes Mal derselbe Fehler — und niemand wusste davon. Sichtbar war nur ein
   * Punkt an der Galerie. Genau das meint „dann stimmt was nicht": Ein Auftrag, der laenger
   * braucht als jede normale Erzeugung, hat kein Geduldsproblem, sondern ein echtes.
   *
   * EINMAL JE AUFTRAG (`adminAlarmAt`) — sonst wiederholt jeder Cron-Lauf dieselbe Meldung.
   * Die Nachricht traegt alles, was zur Entscheidung noetig ist: Thema, Nummer, Adresse des
   * Kaeufers, Zahl der Anlaeufe und den letzten Fehler im Klartext.
   */
  for (const e of alle) {
    if (!e.paid || !offenerAuftrag(e) || e.adminAlarmAt) continue;
    const seit = Date.parse(e.videoDueAt ?? e.createdAt ?? "") || 0;
    if (!seit || jetzt - seit < ALARM_MS) continue;
    /**
     * KEINE ARCHAEOLOGIE (15.08.2026). Ohne diese Grenze haette der erste Lauf nach dem
     * Einbau SIEBEN Nachrichten auf einmal geschickt — fuer Aufträge vom 6. August, die
     * laengst niemanden mehr wecken. Eine Warnung, die man wegwischt, weil sie zu spaet
     * kommt, macht die naechste echte unsichtbar. Gemeldet wird, was HEUTE haengt.
     */
    if (jetzt - seit > ALARM_MAX_MS) { e.adminAlarmAt = new Date(jetzt).toISOString(); alarmiert.push(e.id); continue; }
    e.adminAlarmAt = new Date(jetzt).toISOString();
    alarmiert.push(e.id);
    notifyAdminWhatsApp(
      `LuxuryBandit: Auftrag haengt seit ${Math.round((jetzt - seit) / 60000)} Min.\n`
      + `Thema: ${e.theme || "?"} · Nr. ${e.id.slice(0, 8)}\n`
      + `Kaeufer: ${e.email || "?"}\n`
      + `Anlaeufe: ${e.videoTries ?? 0}\n`
      + `Fehler: ${String(e.videoError || "keiner gemeldet").slice(0, 160)}\n`
      + `${ADMIN_URL}`,
    );
  }

  const faellig = alle.filter(e =>
    (!nurId || e.id === nurId) &&
    e.paid === true &&
    offenerAuftrag(e) &&
    // Ohne Vermerk ist es ein Altfall von vor dieser Änderung — den fassen wir nicht an,
    // sonst rendert der Server rückwirkend Videos für längst vergessene Käufe.
    !!e.videoDueAt &&
    Date.parse(e.videoDueAt) <= jetzt &&
    // Erster Anlauf sofort; jeder weitere frühestens nach ABSTAND_MS.
    ((e.videoTries ?? 0) === 0 || jetzt - Date.parse(e.videoLetzterStartAt ?? e.videoDueAt) >= ABSTAND_MS),
  ).slice(0, MAX_PRO_LAUF);

  /**
   * ABHOLEN IST NICHT STARTEN (Owner 15.08.2026, live und wütend: „ich habe ein Video gekauft
   * und generiert und es wird nicht zurückgegeben. Und es ist schon längst auf Pixverse
   * erstellt").
   *
   * DER FEHLER, DEN DAS BEHEBT: Bisher gab es nur EINE Liste — `faellig` — und die entschied
   * über beides zugleich, über das Starten UND das Abholen. Ihre Schutzgatter sind aber für
   * das STARTEN gedacht: `videoTries < MAX_VERSUCHE` und `videoDueAt` verhindern, dass wir
   * Geld verbrennen. Auf das Abholen angewandt sperren dieselben Gatter den Kunden von einem
   * Video aus, das beim Anbieter längst FERTIG liegt und keinen Cent mehr kostet. Wer drei
   * Anläufe verbraucht hatte oder dessen Eintrag kein `videoDueAt` trug (Admin-Weg, Altfall),
   * bekam sein bezahltes Video nie — obwohl es da war.
   *
   * Deshalb ab hier zwei getrennte Fragen:
   *   ABHOLEN  — kostenlos, startet nichts: JEDER bezahlte Auftrag mit Auftragsnummer, ohne
   *              Rücksicht auf Anläufe, Frist oder Absage-Vermerk.
   *   STARTEN  — kostet Geld: unverändert nur `faellig`, mit allen Gattern.
   *
   * Damit bekommt der Kunde sein Video in dem Moment, in dem der Anbieter fertig ist — bei
   * jedem Galerie-Besuch (der weckt alle 15 s), bei jedem Kettenglied, beim Cron.
   */
  const faelligIds = new Set(faellig.map(e => e.id));
  const abholen = alle.filter(e =>
    (!nurId || e.id === nurId) &&
    e.paid === true &&
    !!e.videoId && e.videoId !== e.videoDoneId &&
    !faelligIds.has(e.id),
  ).slice(0, MAX_PRO_LAUF);

  const log: string[] = [];
  const erledigt: string[] = [];
  let offen = 0;
  let geaendert = false;

  for (const e of abholen) {
    const p = await pollen(request, e.videoId!);
    if (p.status !== "done" || !p.videoUrl) { if (p.status === "processing") offen++; continue; }
    e.videoUrl = p.videoUrl;
    e.videoFertigAt = new Date().toISOString();
    e.videoDoneId = e.videoId;
    e.videoError = undefined;
    /* Ein abgeholtes Video macht die Absage hinfällig — sonst bliebe der Auftrag für immer
       als „aufgegeben" markiert, obwohl der Kunde sein Video gerade bekommen hat. */
    e.videoAlertAt = undefined;
    geaendert = true;
    void logTunnelEventServer("generation_completed", e.theme || "kiss");
    if (await verschicken(request, { ...e })) e.videoMailedAt = new Date().toISOString();
    erledigt.push(e.id);
    log.push(`${e.id}: abgeholt (fertig beim Anbieter)${e.videoMailedAt ? " + verschickt" : ""}`);
  }

  for (const e of faellig) {
    if (!e.videoId) {
      /* DIE BREMSE: drei bezahlte Starts, dann nie wieder von allein. Siehe oben. */
      if ((e.bezahlteStarts ?? 0) >= MAX_BEZAHLTE_STARTS) {
        if (!e.videoAlertAt) {
          e.videoAlertAt = new Date().toISOString();
          geaendert = true;
          notifyAdminWhatsApp(
            `LuxuryBandit: Auftrag gestoppt nach ${e.bezahlteStarts} bezahlten Laeufen.\n`
            + `Thema: ${e.theme || "?"} · Nr. ${e.id.slice(0, 8)} · ${e.email || "?"}\n`
            + `Fehler: ${String(e.videoError || "unbekannt").slice(0, 140)}\n${ADMIN_URL}`,
          );
        }
        log.push(`${e.id}: GESTOPPT — Deckel von ${MAX_BEZAHLTE_STARTS} bezahlten Starts erreicht`);
        continue;
      }
      const s = await starten(request, e);
      e.videoTries = (e.videoTries ?? 0) + 1;
      e.videoLetzterStartAt = new Date().toISOString();   // Grundlage fuer ABSTAND_MS
      /* NUR WAS EINE AUFTRAGSNUMMER BEKAM, HAT GEKOSTET — daran haengt der Deckel. */
      if (s.videoId) { e.bezahlteStarts = (e.bezahlteStarts ?? 0) + 1; }
      if (s.videoId) { e.videoId = s.videoId; offen++; log.push(`${e.id}: gestartet ${s.videoId}`); }
      else { e.videoError = s.error; log.push(`${e.id}: Start fehlgeschlagen — ${s.error}`); }
      geaendert = true;
      continue;
    }
    const p = await pollen(request, e.videoId);
    if (p.status === "done" && p.videoUrl) {
      e.videoUrl = p.videoUrl;
      e.videoFertigAt = new Date().toISOString();
      e.videoDoneId = e.videoId;   // dieser Auftrag ist abgehakt — kein zweites Mal
      e.videoError = undefined;
      geaendert = true;
      // NORMIERTE FAMILIE, GEGENSTUECK ZU `generation_started` (Owner-Master-Auftrag §32,
      // 13.08.2026): erst hier steht das Video WIRKLICH am Auftrag — vorher gab es keine
      // Möglichkeit, in Insights die Zeit zwischen Start und fertigem Ergebnis zu messen
      // oder zu sehen, wie viele Aufträge hier je Produkt tatsächlich fertig werden.
      void logTunnelEventServer("generation_completed", e.theme || "kiss");
      if (await verschicken(request, { ...e })) e.videoMailedAt = new Date().toISOString();
      erledigt.push(e.id);
      log.push(`${e.id}: fertig${e.videoMailedAt ? " + verschickt" : " (keine Adresse)"}`);
      continue;
    }
    /**
     * „HÄNGT" WIRD AB DEM START GEMESSEN, NICHT AB DER ZAHLUNG (Owner 15.08.2026: „warum
     * sollte es keine Auftragsnummer haben?" — weil diese Zeile sie gelöscht hat).
     *
     * Hier stand `jetzt - Date.parse(e.videoDueAt)`. `videoDueAt` ist der Zeitpunkt der
     * ZAHLUNG. Damit galt JEDER Auftrag, der älter als 30 Minuten war, beim nächsten
     * Nachschauen automatisch als hängend — unabhängig davon, ob der Anbieter gerade
     * fleissig rechnete. Die Folge stand zwei Zeilen weiter: `e.videoId = undefined`.
     *
     * WAS DAS ANRICHTETE: Ein Auftrag, der wegen der zu kurzen Kette liegenblieb, verlor
     * beim nächsten Galerie-Besuch oder Cron-Lauf seine Auftragsnummer — und mit ihr den
     * Zugriff auf das VIDEO, das bei Pixverse längst fertig lag. Danach lief eine zweite,
     * kostenpflichtige Erzeugung für ein Video, das es schon gab. Genau der Fall vom
     * 15.08.2026.
     *
     * Richtig ist die Uhr des laufenden Anlaufs: `videoLetzterStartAt` (Server-Start),
     * ersatzweise `videoStartAt` (Browser-Start). Nur wenn beide fehlen, bleibt die Zahlung
     * als grobe Näherung — dann ist es wirklich ein Altfall ohne jede Start-Marke.
     */
    const startMarke = e.videoLetzterStartAt || e.videoStartAt || e.videoDueAt || "";
    const steckt = jetzt - Date.parse(startMarke) > STECKEN_MS;
    if (p.status === "failed" || steckt) {
      // Auftragsnummer weg → der nächste Durchgang darf neu starten (nach ABSTAND_MS).
      e.videoId = undefined;
      e.videoError = p.error ?? (steckt ? "Auftrag hängt beim Anbieter — neuer Anlauf." : "Erzeugung fehlgeschlagen.");
      // Der neue Anlauf braucht wieder eine Frist, sonst gilt er sofort erneut als hängend.
      e.videoDueAt = new Date(jetzt).toISOString();
      geaendert = true;
      log.push(`${e.id}: ${steckt ? "hängt" : "fehlgeschlagen"} — ${e.videoError}`);
      continue;
    }
    offen++;
  }

  /* Auch ein reiner Alarm-Lauf muss schreiben: Ohne den Stempel im Speicher meldet der
     naechste Durchgang denselben haengenden Auftrag erneut — und der uebernaechste wieder. */
  if (geaendert || alarmiert.length) {
    // FRISCH LESEN UND ZUSAMMENFÜHREN: zwischen dem Lesen oben und jetzt kann der Trichter
    // denselben Eintrag angefasst haben (er schreibt ja auch). Sonst überschreibt der letzte
    // Schreiber den anderen — im Projekt schon einmal passiert (Löschen-Auferstehung).
    const neu = await readKissLog();
    for (const e of [...faellig, ...abholen, ...alle.filter(x => alarmiert.includes(x.id))]) {
      const z = neu.find(x => x.id === e.id);
      if (!z) continue;
      z.videoId = e.videoId; z.videoTries = e.videoTries; z.videoError = e.videoError;
      z.videoLetzterStartAt = e.videoLetzterStartAt;
      z.videoDueAt = e.videoDueAt;
      if (e.videoDoneId) z.videoDoneId = e.videoDoneId;
      if (e.videoUrl) z.videoUrl = e.videoUrl;
      if (e.videoMailedAt) z.videoMailedAt = e.videoMailedAt;
      if (e.videoAlertAt) z.videoAlertAt = e.videoAlertAt;
      if (e.adminAlarmAt) z.adminAlarmAt = e.adminAlarmAt;
      if (typeof e.bezahlteStarts === "number") z.bezahlteStarts = e.bezahlteStarts;
    }
    await writeKissLog(neu);
  }
  return { offen, erledigt, log };
}

/**
 * DIE AUFBEWAHRUNGSFRIST IST UMGEZOGEN → `/api/aufraeumen` (03.08.2026).
 *
 * samt Dateien loeschen. Die Regel gilt unveraendert weiter, sie wohnt nur woanders — und die
 * Env behaelt dort ihren Vorrang, damit der Umzug keine Frist heimlich aendert.
 *
 * WARUM SIE WEG MUSSTE: Am 03.08. kam ein zweiter Aufraeumer dazu (Vorlagen nach 7 Tagen,
 * anonyme Auftraege nach 7 Tagen — Owner: „wir müssen bei den Leuten die keine E-Mail
 * angegeben haben die Daten löschen"). Zwei Loescher mit eigenen Fristen auf DEMSELBEN
 * Protokoll sind eine Frage der Zeit, bis der eine wegraeumt, was der andere behalten wollte.
 * Ausserdem gehoert Aufraeumen nicht in den Auslieferungs-Cron: Der gibt Geld aus und liefert
 * bezahlte Ware; er ist der letzte Ort, an dem ein Loeschlauf danebengehen darf.
 */

async function lauf(request: Request): Promise<NextResponse> {
  if (!(await darf(request))) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const url = new URL(request.url);
  const nurId = String(url.searchParams.get("genId") ?? "").trim();
  /**
   * NUR DIE MAIL, KEIN RENDERN (09.08.2026): Der Browser hat das Video selbst zu Ende
   * gebracht und meldet es über /api/kiss-log. Dann fehlt nur noch die Post — der Auftrag
   * ist erledigt und darf hier NICHT als offen behandelt werden.
   */
  if (url.searchParams.get("nurMail") === "1" && nurId) {
    const alle = await readKissLog();
    const e = alle.find(x => x.id === nurId);
    if (!e?.videoUrl || e.videoMailedAt) return NextResponse.json({ ok: true, mail: "nichts zu tun" });
    const geschickt = await verschicken(request, { ...e });
    if (geschickt) {
      await writeKissLog(alle.map(x => (x.id === nurId ? { ...x, videoMailedAt: new Date().toISOString() } : x)));
    }
    return NextResponse.json({ ok: true, mail: geschickt ? "verschickt" : "keine Adresse" });
  }
  const hop = Math.max(0, Number(url.searchParams.get("hop") ?? 0) || 0);

  const bis = Date.now() + RUNDE_MS;
  let letzte = { offen: 0, erledigt: [] as string[], log: [] as string[] };
  for (;;) {
    letzte = await durchgang(request, nurId);
    if (!letzte.offen) break;
    if (Date.now() > bis) break;
    await new Promise(r => setTimeout(r, 12_000));   // Pixverse braucht 1–3 Minuten
  }

  /**
   * WEITERREICHEN STATT WARTEN. Eine Funktion darf nicht minutenlang laufen (Vercel bricht
   * sie ab), also ruft dieser Lauf sich selbst noch einmal auf, solange etwas offen ist —
   * ohne auf die Antwort zu warten. Der Zähler `hop` begrenzt die Kette; danach fängt der
   * tägliche Cron den Rest auf. So wartet kein Kunde auf einen Browser, der zu ist.
   */
  if (letzte.offen && hop < HOPS_MAX) {
    const k = schluessel();
    const weiter = `${origin(request)}/api/kiss-deliver?hop=${hop + 1}${nurId ? `&genId=${encodeURIComponent(nurId)}` : ""}${k ? `&key=${encodeURIComponent(k)}` : ""}`;
    void fetch(weiter, { headers: { "cache-control": "no-store" } }).catch(() => {});
  }

  return NextResponse.json({ ok: true, offen: letzte.offen, erledigt: letzte.erledigt, hop, log: letzte.log });
}

export async function GET(request: Request) { return lauf(request); }
export async function POST(request: Request) { return lauf(request); }
