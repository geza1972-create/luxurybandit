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

/** Zahlung festhalten und den Auftrag vormerken. Idempotent — mehrfach aufrufbar. */
export async function bezahltVermerken(genId: string, email = "", kind = ""): Promise<boolean> {
  const id = String(genId ?? "").trim();
  if (!id) return false;
  try {
    const entries = await readKissLog();
    const e = entries.find(x => x.id === id);
    if (!e) return false;
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
