import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { readKissLog, writeKissLog, getSignedUrl, readTryThisLookState, readWetterSubscribers, deleteTryThisLookImage, type KissLogEntry } from "@/lib/try-this-look-store";
import { sendEmail } from "@/lib/email-send";
import { HOLIDAY_SCENES, holidayPrompt } from "@/lib/holiday-scenes";

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

const MAX_VERSUCHE = 3;          // danach bleibt es beim Admin liegen, statt Geld zu verbrennen
// Ein Auftrag, der nach dieser Zeit immer noch „läuft", läuft nicht mehr: eine Nummer, die
// der Anbieter nicht kennt, meldet ewig „in Arbeit". Ohne diese Grenze wartet der Kunde für
// immer auf ein Video, das niemand mehr rendert.
const STECKEN_MS = 30 * 60 * 1000;
const MAX_PRO_LAUF = 3;          // wie viele Aufträge ein Aufruf gleichzeitig bearbeitet
const HOPS_MAX = 10;             // Selbstaufrufe je Kette (~10 × 45 s ≈ 7 min)
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
  if (request.headers.get("x-vercel-cron")) return true;          // Vercel-Cron
  const k = schluessel();
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
  if (!sein || !ihr) return { error: !sein ? "Sein Foto fehlt im Speicher." : "Ihr Foto fehlt im Speicher." };

  // Szene: fest aus der Kennung abgeleitet, damit derselbe Auftrag bei einem zweiten Anlauf
  // dieselbe Szene bekommt (und nicht jedes Mal eine andere).
  const n = [...e.id].reduce((s, c) => s + c.charCodeAt(0), 0);
  const szene = HOLIDAY_SCENES[n % HOLIDAY_SCENES.length];

  const pin = process.env.TRY_THIS_LOOK_ADMIN_PIN?.trim() ?? "";
  const r = await fetch(`${origin(request)}/api/generate-tryon-video`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(pin ? { "x-try-look-admin-pin": pin } : {}) },
    // Reihenfolge wie im Trichter: SEIN Foto ist @image1, ihres @image2 (siehe holidayPrompt).
    body: JSON.stringify({ lookId: "look-1784191032626-70e3608b", person: sein, garment: ihr, prompt: holidayPrompt(szene) }),
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

/** Das fertige Video an den Käufer — die Mail ist der Ersatz für den Browser, der zu ist. */
async function verschicken(request: Request, e: KissLogEntry): Promise<boolean> {
  const to = String(e.paidEmail || e.email || "").trim();
  if (!to || !e.videoUrl) return false;
  const o = origin(request);
  const abmelden = await abmeldeLink(o, to);
  const html =
    `<div style="background:#0d0b0a;padding:22px 0;font-family:Arial,Helvetica,sans-serif">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">`
    + `<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="width:520px;max-width:94%;background:#16120f;border-radius:18px;overflow:hidden">`
    + `<tr><td style="padding:20px 22px 6px;color:#f6cf51;font-size:13px;font-weight:bold;letter-spacing:2px">LUXURYBANDIT</td></tr>`
    + `<tr><td style="padding:0 22px 12px;color:#fff;font-size:20px;font-weight:bold">Your video is ready 🎬</td></tr>`
    + `<tr><td style="padding:0 22px 14px;color:#e8e2d6;font-size:14px;line-height:1.55">`
    + `Thank you — here it is. It is also saved in your gallery, so you can watch it again any time.`
    + `</td></tr>`
    + `<tr><td style="padding:0 22px 10px"><a href="${e.videoUrl}" style="display:inline-block;background:#f6cf51;color:#111;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:bold;text-decoration:none">Watch your video</a></td></tr>`
    + `<tr><td style="padding:0 22px 6px"><a href="${o}/my-gallery" style="color:#8d8579;font-size:12px">Open my gallery</a></td></tr>`
    + `<tr><td style="padding:0 22px 20px"><a href="${abmelden}" style="color:#6b655c;font-size:11px">Unsubscribe</a></td></tr>`
    + `</table></td></tr></table></div>`;
  const r = await sendEmail({
    to,
    subject: "Your video is ready 🎬",
    html,
    listUnsubscribe: abmelden,
  }).catch(() => ({ ok: false }));
  return !!(r as { ok?: boolean }).ok;
}

/**
 * AUFGEGEBEN — aber nicht stillschweigend (Owner: „der Kunde wurde ausgeraubt").
 *
 * Nach drei Anläufen rendern wir nicht weiter; das kostet nur Geld und ändert nichts. Aber
 * der Käufer erfährt es, mit einer Adresse, an die er schreiben kann, und der Betreiber
 * bekommt eine Kopie — damit ein Mensch das Video von Hand nachreicht.
 */
async function aufgeben(request: Request, e: KissLogEntry): Promise<boolean> {
  const to = String(e.paidEmail || e.email || "").trim();
  const support = String(process.env.SUPPORT_EMAIL || process.env.SMTP_USER || "").trim();
  if (!to) return false;
  const o = origin(request);
  const html =
    `<div style="background:#0d0b0a;padding:22px 0;font-family:Arial,Helvetica,sans-serif">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">`
    + `<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="width:520px;max-width:94%;background:#16120f;border-radius:18px;overflow:hidden">`
    + `<tr><td style="padding:20px 22px 6px;color:#f6cf51;font-size:13px;font-weight:bold;letter-spacing:2px">LUXURYBANDIT</td></tr>`
    + `<tr><td style="padding:0 22px 12px;color:#fff;font-size:20px;font-weight:bold">We owe you a video</td></tr>`
    + `<tr><td style="padding:0 22px 14px;color:#e8e2d6;font-size:14px;line-height:1.55">`
    + `Your payment went through, but the video did not come out right. We are on it and send it to you by hand — `
    + `just answer this email if anything is unclear.`
    + `</td></tr>`
    + `<tr><td style="padding:0 22px 20px"><a href="${o}/my-gallery" style="color:#8d8579;font-size:12px">Open my gallery</a></td></tr>`
    + `</table></td></tr></table></div>`;
  const r = await sendEmail({
    to, subject: "We owe you a video", html,
    listUnsubscribe: await abmeldeLink(o, to),
    ...(support ? { bcc: support, replyTo: support } : {}),
  }).catch(() => ({ ok: false }));
  return !!(r as { ok?: boolean }).ok;
}

/** Ein Durchgang über alle offenen Aufträge. Gibt zurück, wie viele noch laufen. */
async function durchgang(request: Request, nurId: string): Promise<{ offen: number; erledigt: string[]; log: string[] }> {
  const alle = await readKissLog();
  const jetzt = Date.now();
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

  const verloren = alle.filter(e =>
    e.paid === true && offenerAuftrag(e) && !e.videoAlertAt &&
    (e.videoTries ?? 0) >= MAX_VERSUCHE && !!e.videoDueAt,
  ).slice(0, MAX_PRO_LAUF);

  const faellig = alle.filter(e =>
    (!nurId || e.id === nurId) &&
    e.paid === true &&
    offenerAuftrag(e) &&
    (e.videoTries ?? 0) < MAX_VERSUCHE &&
    // Ohne Vermerk ist es ein Altfall von vor dieser Änderung — den fassen wir nicht an,
    // sonst rendert der Server rückwirkend Videos für längst vergessene Käufe.
    !!e.videoDueAt &&
    Date.parse(e.videoDueAt) <= jetzt,
  ).slice(0, MAX_PRO_LAUF);

  const log: string[] = [];
  const erledigt: string[] = [];
  let offen = 0;
  let geaendert = false;

  for (const e of verloren) {
    if (await aufgeben(request, e)) { e.videoAlertAt = new Date().toISOString(); geaendert = true; }
    log.push(`${e.id}: aufgegeben nach ${e.videoTries ?? 0} Anläufen — Käufer benachrichtigt`);
  }

  for (const e of faellig) {
    if (!e.videoId) {
      const s = await starten(request, e);
      e.videoTries = (e.videoTries ?? 0) + 1;
      if (s.videoId) { e.videoId = s.videoId; offen++; log.push(`${e.id}: gestartet ${s.videoId}`); }
      else { e.videoError = s.error; log.push(`${e.id}: Start fehlgeschlagen — ${s.error}`); }
      geaendert = true;
      continue;
    }
    const p = await pollen(request, e.videoId);
    if (p.status === "done" && p.videoUrl) {
      e.videoUrl = p.videoUrl;
      e.videoDoneId = e.videoId;   // dieser Auftrag ist abgehakt — kein zweites Mal
      e.videoError = undefined;
      geaendert = true;
      if (await verschicken(request, { ...e })) e.videoMailedAt = new Date().toISOString();
      erledigt.push(e.id);
      log.push(`${e.id}: fertig${e.videoMailedAt ? " + verschickt" : " (keine Adresse)"}`);
      continue;
    }
    const steckt = jetzt - Date.parse(e.videoDueAt ?? "") > STECKEN_MS;
    if (p.status === "failed" || steckt) {
      // Auftragsnummer weg → der nächste Durchgang darf neu starten (bis MAX_VERSUCHE).
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

  if (geaendert) {
    // FRISCH LESEN UND ZUSAMMENFÜHREN: zwischen dem Lesen oben und jetzt kann der Trichter
    // denselben Eintrag angefasst haben (er schreibt ja auch). Sonst überschreibt der letzte
    // Schreiber den anderen — im Projekt schon einmal passiert (Löschen-Auferstehung).
    const neu = await readKissLog();
    for (const e of [...faellig, ...verloren]) {
      const z = neu.find(x => x.id === e.id);
      if (!z) continue;
      z.videoId = e.videoId; z.videoTries = e.videoTries; z.videoError = e.videoError;
      z.videoDueAt = e.videoDueAt;
      if (e.videoDoneId) z.videoDoneId = e.videoDoneId;
      if (e.videoUrl) z.videoUrl = e.videoUrl;
      if (e.videoMailedAt) z.videoMailedAt = e.videoMailedAt;
      if (e.videoAlertAt) z.videoAlertAt = e.videoAlertAt;
    }
    await writeKissLog(neu);
  }
  return { offen, erledigt, log };
}

/**
 * DIE AUFBEWAHRUNGSFRIST — die einzige Zusage, die man nicht schreiben darf, ohne sie zu bauen.
 *
 * Owner 30.07.2026: „dann muss man das aber erwähnen in agb". In `free-preview` stand seit
 * Tagen der Kommentar „braucht eine Frist — siehe FREE_PREVIEW_KEEP_DAYS", aber es gab keine
 * Zeile Code dazu: Kein einziges hochgeladenes Foto wurde je gelöscht. Ein AGB-Satz über eine
 * Frist wäre damit eine Behauptung gewesen, die das System selbst widerlegt.
 *
 * Was gelöscht wird: Fotos und Ergebnisse aus Besuchen OHNE Kauf, älter als die Frist — samt
 * Dateien, nicht nur der Zeile. Was bleibt: alles, wofür bezahlt wurde. Wer sein Video gekauft
 * hat, soll es nicht nach drei Monaten verlieren.
 */
const AUFBEWAHRUNG_TAGE = Number(process.env.FREE_PREVIEW_KEEP_DAYS ?? 90);

async function aufraeumen(): Promise<string[]> {
  const log: string[] = [];
  if (!(AUFBEWAHRUNG_TAGE > 0)) return log;
  const grenze = Date.now() - AUFBEWAHRUNG_TAGE * 86_400_000;
  const alle = await readKissLog();
  const alt = alle.filter(e => !e.paid && Date.parse(e.createdAt ?? "") > 0 && Date.parse(e.createdAt) < grenze);
  if (!alt.length) return log;
  for (const e of alt) {
    for (const pfad of [e.imagePath, e.personPath, e.modelPath]) {
      if (pfad) await deleteTryThisLookImage(pfad).catch(() => {});
    }
  }
  const weg = new Set(alt.map(e => e.id));
  await writeKissLog((await readKissLog()).filter(e => !weg.has(e.id)));
  log.push(`Aufbewahrung: ${alt.length} Besuche ohne Kauf nach ${AUFBEWAHRUNG_TAGE} Tagen geloescht`);
  return log;
}

async function lauf(request: Request): Promise<NextResponse> {
  if (!(await darf(request))) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const url = new URL(request.url);
  const nurId = String(url.searchParams.get("genId") ?? "").trim();
  const hop = Math.max(0, Number(url.searchParams.get("hop") ?? 0) || 0);

  // Beim taeglichen Rundlauf (kein einzelner Auftrag) zuerst aufraeumen.
  const aufgeraeumt = !nurId && hop === 0 ? await aufraeumen().catch(() => []) : [];

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

  return NextResponse.json({ ok: true, offen: letzte.offen, erledigt: letzte.erledigt, hop, log: [...aufgeraeumt, ...letzte.log] });
}

export async function GET(request: Request) { return lauf(request); }
export async function POST(request: Request) { return lauf(request); }
