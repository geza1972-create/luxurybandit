import { NextResponse } from "next/server";
import { folgenAbmelden } from "@/lib/kuenstler-follower";

/**
 * ABMELDEN VOM KÜNSTLER — ein Klick, kein Konto (Owner 13.09.2026: die Follow-Mail bauen).
 *
 * ── WARUM ES DIESE ROUTE GEBEN MUSS ─────────────────────────────────────────────────────────
 *
 * Der Text unter dem Follow-Knopf verspricht „Abmelden kannst du dich in jeder Mail". Ohne diese
 * Route wäre das die zweite Zusage, die wir brechen — nach der Benachrichtigung selbst.
 *
 * Und es ist nicht nur Höflichkeit: Gmail und Yahoo verlangen seit 2024 von jedem, der
 * regelmässig verschickt, eine Abmeldung MIT EINEM KLICK direkt aus dem Postfach (RFC 8058).
 * Fehlt sie, drückt der Empfänger stattdessen „Spam" — und das trifft die Zustellung an alle
 * anderen mit, auch an die Künstler, die auf ihren Bestätigungslink warten.
 *
 * Deshalb beide Wege, wie bei `api/mail-abmelden`:
 *   POST — das schickt das Postfach automatisch, ohne dass ein Mensch etwas sieht.
 *   GET  — der Link zum Draufklicken. Antwortet mit einer Seite, damit der Mensch eine
 *          Bestätigung sieht und nicht auf rohem JSON landet.
 *
 * ES WIRD IMMER „ERLEDIGT" GEMELDET, auch bei unbekannter Adresse: Sonst liesse sich hier
 * abfragen, wer welchem Künstler folgt.
 *
 * ── WARUM DIE ADRESSE IN DER ADRESSZEILE STEHT ──────────────────────────────────────────────
 *
 * Ein Token wäre sauberer, aber der Ein-Klick-Weg der Postfächer kennt keine Token: Er ruft
 * genau die URL auf, die im Kopf der Mail steht. Dasselbe Verfahren läuft seit Wochen in
 * `api/mail-abmelden`. Der Schaden wäre gering (jemand meldet einen Fremden ab), der Schaden
 * ohne Abmeldeweg ist grösser (Spam-Markierung für alle).
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const seite = (text: string) => new NextResponse(
  `<!doctype html><meta charset="utf-8">
   <meta name="viewport" content="width=device-width,initial-scale=1">
   <title>lakatosbandi.com</title>
   <div style="font:16px/1.5 system-ui,sans-serif;max-width:32rem;margin:16vh auto;padding:0 1.5rem;text-align:center;color:#111">
     <p style="font-size:44px;margin:0">✓</p>
     <h1 style="font-size:22px;margin:.6rem 0 0">${text}</h1>
     <p style="margin:.6rem 0 0;opacity:.75">Du bekommst keine Mails mehr, wenn dieser Künstler
        ein neues Werk hinzufügt.</p>
     <p style="margin:1.6rem 0 0"><a href="https://lakatosbandi.com" style="color:#111">lakatosbandi.com</a></p>
   </div>`,
  { headers: { "Content-Type": "text/html; charset=utf-8" } },
);

async function abmelden(request: Request): Promise<void> {
  const q = new URL(request.url).searchParams;
  let mandant = String(q.get("m") ?? "").trim();
  let mail = String(q.get("e") ?? "").trim();
  if (!mail) {
    /* Der Ein-Klick mancher Anbieter schickt ein Formular statt der Parameter. */
    try {
      const roh = await request.text();
      const p = new URLSearchParams(roh);
      mandant = mandant || String(p.get("m") ?? "").trim();
      mail = String(p.get("e") ?? "").trim();
    } catch { /* ohne Adresse melden wir trotzdem Vollzug, siehe oben */ }
  }
  if (!mandant || !mail) return;
  try { await folgenAbmelden(mandant, mail); } catch { /* Fehler nie an den Empfänger durchreichen */ }
}

export async function GET(request: Request) {
  await abmelden(request);
  return seite("Abgemeldet");
}

export async function POST(request: Request) {
  await abmelden(request);
  /* Der Ein-Klick des Postfachs liest keine Seite — ihm genügt 200. */
  return NextResponse.json({ ok: true });
}
