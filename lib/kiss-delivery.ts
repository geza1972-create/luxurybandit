import { readKissLog, writeKissLog } from "@/lib/try-this-look-store";
import { futureProgramAnlegen } from "@/lib/future-program-store";

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

export async function bezahltVermerken(genId: string, email = "", kind = ""): Promise<boolean> {
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
    const vorher = JSON.stringify([e.paid, e.paidEmail, e.videoDueAt, e.paidKind]);
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
    }
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
