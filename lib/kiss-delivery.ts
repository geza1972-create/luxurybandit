import { readKissLog, writeKissLog, readWetterSubscribers } from "@/lib/try-this-look-store";
import { futureProgramAnlegen, futureProgramUrl } from "@/lib/future-program-store";
import { sendEmail } from "@/lib/email-send";

/**
 * DER VERMERK „HIER WARTET EIN BEZAHLTER AUFTRAG".
 *
 * Owner 30.07.2026: „Kein Kauf darf mehr ins Leere laufen." Bezahlt wird an zwei Stellen
 * bemerkt — beim Stripe-Webhook und bei der Rückkehr des Kunden (/api/checkout-status).
 * Beide schreiben denselben Vermerk, damit es egal ist, welche zuerst kommt (oder ob eine
 * ganz ausfällt: der Webhook braucht ein eingerichtetes Geheimnis, die Rückkehr einen
 * Browser, der noch lebt — genau deshalb verlassen wir uns auf keine von beiden allein).
 *
 * Geliefert wird danach von `/api/kiss-deliver`.
 */

// Schonfrist für den Browser des Kunden: er rendert selbst und zeigt dabei den Fortschritt.
// Erst danach übernimmt der Server — sonst liefen zwei Erzeugungen für dasselbe Geld.
export const GNADENFRIST_MS = 4 * 60 * 1000;

/**
 * Zahlung festhalten und den Auftrag vormerken. Idempotent — mehrfach aufrufbar.
 *
 * FEHLT DER AUFTRAG, WIRD ER ANGELEGT (03.08.2026) — und das ist keine Bequemlichkeit,
 * sondern die Reparatur einer Sackgasse, aus der ein Kunde nie wieder herausfand:
 *
 *   1. Sein Auftrag ging durch gleichzeitige Schreiber verloren (behoben, siehe writeKissLog),
 *      seine Zahlung nicht — die steht dauerhaft in `videoCredits.redeemed`.
 *   2. Sein Browser merkt sich die Auftragsnummer 24 Stunden lang.
 *   3. Beim naechsten Versuch sagt `guthabenAbbuchen` „schon bezahlt" (richtig, idempotent),
 *      diese Funktion fand aber nichts zu stempeln und gab `false` — was der Aufrufer
 *      ignorierte. Der Browser bekam „bezahlt", die Video-Route fand keinen bezahlten
 *      Auftrag und wies ab. Endlos, ohne weitere Kosten, aber auch ohne jede Aussicht.
 *
 * Einen leeren Eintrag anzulegen ist die einzige Antwort, die den Kunden NICHT ein zweites Mal
 * zahlen laesst: Die alte Nummer behaelt ihren Zahlungsschluessel, bekommt wieder einen
 * Koerper, und der Browser — der die Fotos noch hat — liefert weiter. Ohne Fotos im Protokoll
 * kann die Server-Nachlieferung nichts ausrichten; der Browser steht in diesem Moment aber
 * ohnehin davor, und das ist der Weg, der zaehlt.
 */
/**
 * DIE ADRESSE EINES AUFTRAGS BERICHTIGEN — wenn der Kunde sie an der Kasse korrigiert hat
 * (Owner 09.08.2026: „das ist die E-Mail, die dann bei der Anmeldung zählt").
 *
 * Ohne diesen Schritt zerfällt sein Kauf in zwei Hälften: Das Guthaben liegt auf der
 * korrigierten Adresse, das Video am Auftrag mit der vertippten — und seine Galerie, die
 * über die Adresse sucht, findet nichts.
 */
export async function adresseKorrigieren(genId: string, neueAdresse: string): Promise<void> {
  const id = String(genId ?? "").trim();
  const mail = String(neueAdresse ?? "").trim().toLowerCase();
  if (!id || !mail) return;
  try {
    const entries = await readKissLog();
    const e = entries.find(x => x.id === id);
    if (!e || (e.email === mail && e.paidEmail === mail)) return;
    e.email = mail;
    e.paidEmail = mail;
    await writeKissLog(entries);
  } catch { /* die Gutschrift darf daran nicht scheitern */ }
}

/**
 * DIE ADRESSE DES HAUSES, WENN NIEMAND EINE ANFRAGE ZUR HAND HAT.
 *
 * `bezahltVermerken()` bekommt von seinen drei Aufrufern (Stripe-Webhook, Rückkehr des
 * Kunden, Guthaben-Kasse) eine Anfrage mit — sie reichen sie als `origin` durch. Fehlt sie,
 * gilt dieselbe Reihenfolge wie in `/api/kiss-deliver`: die eingestellte Seitenadresse, sonst
 * die Live-Domain. Ein Programm-Link auf `localhost` wäre in einer echten Mail wertlos.
 */
function seitenAdresse(origin = ""): string {
  const o = String(origin ?? "").trim().replace(/\/$/, "");
  if (o && !/localhost|127\.0\.0\.1/.test(o)) return o;
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  return env || o || "https://luxurybandit.com";
}

/** Abmelden mit Kennung — dieselbe Regel wie in /api/kiss-deliver: ein leeres `s=` meldet
 *  niemanden ab und treibt die Leute auf den Spam-Knopf. */
async function abmeldeLink(o: string, email: string): Promise<string> {
  try {
    const liste = await readWetterSubscribers("kiss");
    const da = liste.find(x => String(x.email ?? "").trim().toLowerCase() === email.trim().toLowerCase());
    if (da?.id) return `${o}/api/wetter-unsubscribe?model=kiss&s=${encodeURIComponent(String(da.id))}`;
  } catch { /* ohne Kennung bleibt der Weg ueber /unsubscribe */ }
  return `${o}/unsubscribe`;
}

/**
 * „DEIN PROGRAMM IST OFFEN" — DIE MAIL, DIE SOFORT NACH DEM KAUF KOMMT (11.08.2026).
 *
 * WARUM ES SIE GIBT (am echten Auftrag da11fe51 gemessen): Der Kunde zahlte um 14:07, seine
 * Programm-Datei entstand um 14:08 — und sein Video scheiterte beim Anbieter. Post bekam er
 * trotzdem keine: Die einzige Mail dieses Kaufwegs (`verschicken()` in /api/kiss-deliver)
 * geht erst raus, wenn ein `videoUrl` am Auftrag steht, und der Programm-Link steckt genau
 * dort drin. Ein 49-€-Kauf, der still bleibt, weil eine ZUGABE nicht fertig wurde.
 *
 * Das Programm ist ab der Sekunde des Kaufs fertig und ist das eigentliche Produkt — also
 * bekommt es seine eigene Mail, unabhängig vom Film. Die Liefermail bleibt daneben bestehen;
 * sie kommt später mit dem Film und sagt dann etwas anderes.
 *
 * Gestalt, Farben und Abmelde-Zeile sind aus `verschicken()` KOPIERT, nicht neu erfunden —
 * zwei Mails desselben Hauses am selben Tag dürfen nicht wie zwei Absender aussehen.
 *
 * Gibt `true` zurück, wenn die Post raus ist — nur dann darf der Aufrufer stempeln.
 */
export async function programmWillkommen(genId: string, to: string, origin = ""): Promise<boolean> {
  const id = String(genId ?? "").trim();
  const adresse = String(to ?? "").trim();
  if (!id || !adresse) return false;
  const o = seitenAdresse(origin);
  // KEIN LINK, KEINE MAIL: `futureProgramUrl` liefert nur etwas, wenn die Programm-Datei
  // wirklich existiert UND ein Server-Geheimnis für den Token gesetzt ist. Eine Willkommens-
  // Mail ohne funktionierenden Knopf wäre schlimmer als gar keine.
  const programLink = await futureProgramUrl(o, id).catch(() => undefined);
  if (!programLink) return false;
  const galerieLink = `${o}/my-gallery?utm_source=programmmail`;
  const abmelden = await abmeldeLink(o, adresse);
  const titel = "Your Future Self Program is open";
  const html =
    `<div style="background:#0d0b0a;padding:22px 0;font-family:Arial,Helvetica,sans-serif">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">`
    + `<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="width:520px;max-width:94%;background:#16120f;border-radius:18px;overflow:hidden">`
    + `<tr><td style="padding:20px 22px 6px;color:#f6cf51;font-size:13px;font-weight:bold;letter-spacing:2px">LUXURYBANDIT</td></tr>`
    + `<tr><td style="padding:0 22px 12px;color:#fff;font-size:20px;font-weight:bold">${titel}</td></tr>`
    + `<tr><td style="padding:0 22px 14px;color:#e8e2d6;font-size:14px;line-height:1.55">`
    + `Your 30 days start whenever you open it — your Future Film is being made and arrives by email.`
    + `</td></tr>`
    + `<tr><td style="padding:0 22px 10px"><a href="${programLink}" style="display:inline-block;background:#f6cf51;color:#111;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:bold;text-decoration:none">Start your 30 days →</a></td></tr>`
    + `<tr><td style="padding:0 22px 4px"><a href="${galerieLink}" style="color:#a89f8e;font-size:12px">Your program is also in your gallery</a></td></tr>`
    + `<tr><td style="padding:0 22px 20px"><a href="${abmelden}" style="color:#6b655c;font-size:11px">Unsubscribe</a></td></tr>`
    + `</table></td></tr></table></div>`;
  const r = await sendEmail({ to: adresse, subject: titel, html, listUnsubscribe: abmelden })
    .catch(() => ({ ok: false }));
  return !!(r as { ok?: boolean }).ok;
}

export async function bezahltVermerken(genId: string, email = "", kind = "", origin = "", cents = 0): Promise<boolean> {
  const id = String(genId ?? "").trim();
  if (!id) return false;
  try {
    const entries = await readKissLog();
    let e = entries.find(x => x.id === id);
    if (!e) {
      /**
       * `email` UND `paidEmail` setzen (03.08.2026): Die Galerie sucht ueber beide, andere
       * Stellen nur ueber `email`. Ein wiederhergestellter Auftrag, der nur `paidEmail`
       * traegt, ist fuer seinen Besitzer halb unsichtbar — genau so passiert.
       */
      e = { id, createdAt: new Date().toISOString(), paid: false, wiederhergestellt: true,
            email: String(email ?? "").trim().toLowerCase() || undefined };
      entries.unshift(e);
    }
    const mail = String(email ?? "").trim().toLowerCase();
    const vorher = JSON.stringify([e.paid, e.paidEmail, e.videoDueAt, e.paidKind, e.programmMailAt, e.paidCents]);
    /* Der Betrag kommt von Stripe und wird nie ueberschrieben: Der erste Stempel gewinnt,
       sonst macht ein zweiter Aufruf ohne Betrag aus 1,49 EUR eine 0. */
    if (cents > 0 && !e.paidCents) e.paidCents = cents;
    e.paid = true;
    if (mail && !e.paidEmail) e.paidEmail = mail;
    // Einzelkauf oder Abo — davon hängt ab, wie viele Videos ihm zustehen.
    if (!e.paidKind) e.paidKind = /-abo$/.test(String(kind)) ? "abo" : String(kind) === "kiss-video" ? "once" : undefined;
    // Nie zurücksetzen: ein zweiter Aufruf (Webhook UND Rückkehr) darf die Frist nicht
    // verlängern — sonst schiebt sich die Lieferung mit jedem Aufruf nach hinten.
    if (!e.videoDueAt && !e.videoUrl) e.videoDueAt = new Date(Date.now() + GNADENFRIST_MS).toISOString();
    /**
     * DAS FUTURE-PROGRAMM ANLEGEN — GENAU HIER, BEVOR KAPPUNG/AUFRÄUMER DIE ZIELE ERWISCHEN
     * KÖNNEN (11.08.2026). Der Bezahl-Stempel ist der früheste sichere Moment: Der Auftrag
     * trägt seine Ziele (`e.ziele`/`e.zieleFrei`) noch frisch aus dem Trichter, und die
     * eigene Programm-Datei (siehe future-program-store.ts) lebt ausserhalb des 500er-Logs
     * und des 90-Tage-Aufräumers. `futureProgramAnlegen` ist idempotent (überschreibt eine
     * bestehende Datei nie) — ein zweiter Aufruf dieser Funktion (Webhook UND Rückkehr des
     * Kunden) legt also nichts doppelt an und löscht keine bereits gesetzten Häkchen.
     *
     * NIE die Bezahlung kippen: ein Fehler hier (z. B. Supabase kurz nicht erreichbar) darf
     * dem Kunden seine Zahlung nicht wegnehmen — nur ins Log schreiben und weiterlaufen.
     */
    if (String(e.theme ?? "") === "versprechen") {
      try {
        // Seit 11.08.2026 traegt `KissLogEntry` ein eigenes `lang`-Feld (siehe
        // lib/try-this-look-store.ts): Der Trichter schickt es beim Anlegen UND bei jeder
        // Aktualisierung mit, `/api/kiss-log` legt es ab. Rueckfall auf Englisch bleibt nur
        // fuer sehr alte Eintraege von vor diesem Datum.
        const lang = String(e.lang ?? "en").trim() || "en";
        await futureProgramAnlegen(id, e.paidEmail || e.email || mail, lang, e.ziele ?? [], e.zieleFrei);
      } catch (err) { console.warn("future-program anlegen fehlgeschlagen:", err); }
      /**
       * UND SOFORT DIE POST DAZU (11.08.2026, Auftrag da11fe51) — im selben Geist wie das
       * Anlegen darüber: Ein Fehler beim Versand darf die Zahlung NIE kippen, deshalb sein
       * eigenes try/catch und kein `throw` nach aussen.
       *
       * GENAU EINMAL: `programmMailAt` ist der Stempel. Diese Funktion läuft für denselben
       * Auftrag mehrfach (Stripe-Webhook UND Rückkehr des Kunden, siehe Kopf) — ohne den
       * Vermerk bekäme der Käufer dieselbe Willkommens-Mail zweimal. Gestempelt wird ERST
       * nach erfolgreichem Versand (wie bei `videoMailedAt` in /api/kiss-deliver): Ein
       * Stempel vor dem Versand würde eine gescheiterte Mail für immer verschlucken, und
       * eine Mail, die nie ankommt, ist der Fehler, den wir hier gerade reparieren. Das
       * Feld steht im Vergleich oben (`vorher`), damit der Stempel auch geschrieben wird,
       * wenn sich sonst nichts geändert hat.
       */
      if (!e.programmMailAt) {
        try {
          const post = await programmWillkommen(id, e.paidEmail || e.email || mail, origin);
          if (post) e.programmMailAt = new Date().toISOString();
        } catch (err) { console.warn("future-program willkommensmail fehlgeschlagen:", err); }
      }
    }
    if (JSON.stringify([e.paid, e.paidEmail, e.videoDueAt, e.paidKind, e.programmMailAt, e.paidCents]) === vorher) return true;
    await writeKissLog(entries);
    return true;
  } catch { return false; }
}

/**
 * Die Lieferung anstoßen, ohne auf sie zu warten. Der Aufruf ist absichtlich „abschicken und
 * vergessen": Stripe darf nicht auf ein Video warten, und der Endpunkt reicht sich selbst
 * weiter, bis er fertig ist.
 */
export function lieferungAnstossen(origin: string, genId = ""): void {
  const key = (process.env.CRON_SECRET || process.env.TRY_THIS_LOOK_ADMIN_PIN || "").trim();
  const url = `${origin.replace(/\/$/, "")}/api/kiss-deliver?hop=0`
    + (genId ? `&genId=${encodeURIComponent(genId)}` : "")
    + (key ? `&key=${encodeURIComponent(key)}` : "");
  void fetch(url, { headers: { "cache-control": "no-store" } }).catch(() => {});
}
