import { NextResponse } from "next/server";
import { readGuthabenCents, walletHistorie, readKissLog } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DER KONTOAUSZUG DES KUNDEN (Owner 08.08.2026: „Das Konto wird eine Historie für die
 * Kunden auch anzeigen müssen. Wieviel er wann und für was aufgegeben hat und wann er sein
 * Konto aufgeladen hat.").
 *
 * WOHER DIE DATEN KOMMEN: Seit dem Umzug des Guthabens in die eigene Geldbörse
 * (`wallet/<adresse>.json`) trägt JEDE Buchung eine Quittung — Zeitpunkt, Betrag und den
 * Schlüssel, unter dem sie idempotent ist. Dieser Schlüssel IST die Herkunft; er muss nur
 * gelesen werden:
 *
 *   `wallet-<genId>`  → ein Kauf; der genId liegt im Kiss-Log, dort steht das Thema
 *   `cs_…` / sonst    → eine Aufladung (Stripe-Sitzung)
 *   `erstattung-…`    → zurückgezahlt
 *   `werbung-…`       → geschenkt (Kampagne)
 *   `migration`       → der Übertrag beim Umzug, damit kein Betrag vom Himmel fällt
 *   `admin-…`         → von Hand gesetzt (Owner-Werkzeug)
 *
 * WARUM DAS GERÄT MITGEPRÜFT WIRD: Der Kontostand allein ist harmlos — die Historie sagt,
 * WAS jemand gekauft hat, und das ist bei Geschenkvideos privat. Es gibt hier keine
 * Anmeldung (Guthaben hängt an der Adresse, [[guthaben-haengt-an-einer-adresse]]), also
 * genügt eine geratene E-Mail-Adresse als Schlüssel — zu wenig für eine Kaufhistorie.
 * Deshalb: Die Liste gibt es nur, wenn dieses GERÄT schon einmal mit dieser Adresse einen
 * Auftrag angelegt hat. Sonst kommt der Stand allein zurück — nie ein Fehler, denn wer
 * gerade erst aufgeladen hat, soll trotzdem sein Geld sehen.
 */

const clean = (s: unknown, max = 200) => String(s ?? "").trim().slice(0, max);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = clean(url.searchParams.get("email"), 160).toLowerCase();
  const device = clean(url.searchParams.get("device"), 80);
  if (!email) return NextResponse.json({ cents: 0, posten: [] });

  const cents = await readGuthabenCents(email).catch(() => 0);

  let log: Awaited<ReturnType<typeof readKissLog>> = [];
  try { log = await readKissLog(); } catch { /* ohne Log gibt es nur weniger Beschriftung */ }
  const meine = log.filter(e => (e.email ?? "").trim().toLowerCase() === email);
  /* Das Gerät muss zu dieser Adresse gehören — siehe oben. */
  const darfSehen = !!device && meine.some(e => (e.device ?? "") === device);
  if (!darfSehen) return NextResponse.json({ cents, posten: [], gesperrt: true });

  const themaZuId = new Map(meine.map(e => [e.id, e.theme ?? ""]));
  const ops = await walletHistorie(email).catch(() => []);
  const posten = ops.slice(0, 50).map(o => {
    const id = o.id ?? "";
    let art = "aufladung";
    let thema = "";
    if (id.startsWith("wallet-")) { art = "kauf"; thema = themaZuId.get(id.slice(7)) ?? ""; }
    else if (id.startsWith("plan-")) { art = "kauf"; thema = "plan"; }
    else if (id.startsWith("erstattung-")) art = "erstattung";
    else if (id.startsWith("werbung-")) art = "geschenk";
    else if (id === "migration") art = "uebertrag";
    else if (id.startsWith("admin-")) art = "korrektur";
    return { at: o.at, cents: o.delta, art, thema };
  });
  return NextResponse.json({ cents, posten });
}
