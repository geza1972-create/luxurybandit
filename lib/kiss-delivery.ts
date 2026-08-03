import { readKissLog, writeKissLog } from "@/lib/try-this-look-store";

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
export async function bezahltVermerken(genId: string, email = "", kind = ""): Promise<boolean> {
  const id = String(genId ?? "").trim();
  if (!id) return false;
  try {
    const entries = await readKissLog();
    let e = entries.find(x => x.id === id);
    if (!e) {
      e = { id, createdAt: new Date().toISOString(), paid: false, wiederhergestellt: true };
      entries.unshift(e);
    }
    const mail = String(email ?? "").trim().toLowerCase();
    const vorher = JSON.stringify([e.paid, e.paidEmail, e.videoDueAt, e.paidKind]);
    e.paid = true;
    if (mail && !e.paidEmail) e.paidEmail = mail;
    // Einzelkauf oder Abo — davon hängt ab, wie viele Videos ihm zustehen.
    if (!e.paidKind) e.paidKind = /-abo$/.test(String(kind)) ? "abo" : String(kind) === "kiss-video" ? "once" : undefined;
    // Nie zurücksetzen: ein zweiter Aufruf (Webhook UND Rückkehr) darf die Frist nicht
    // verlängern — sonst schiebt sich die Lieferung mit jedem Aufruf nach hinten.
    if (!e.videoDueAt && !e.videoUrl) e.videoDueAt = new Date(Date.now() + GNADENFRIST_MS).toISOString();
    if (JSON.stringify([e.paid, e.paidEmail, e.videoDueAt, e.paidKind]) === vorher) return true;
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
