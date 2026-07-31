import { NextResponse } from "next/server";
import { mailAbmelden } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ABMELDEN VOM RUNDBRIEF — öffentlich, ein Klick, kein Konto.
 *
 * Gmail und Yahoo verlangen seit 2024 von jedem Massenversender genau das: eine Abmeldung,
 * die MIT EINEM KLICK direkt aus dem Postfach funktioniert (RFC 8058). Fehlt sie, drückt der
 * Empfänger stattdessen „Spam" — und das trifft die Zustellung an alle anderen mit.
 *
 * Deshalb beide Wege:
 *   POST  — das schickt das Postfach automatisch, als FORMULAR (nicht JSON). Die Adresse
 *           steht in der URL, nicht im Text.
 *   GET   — das ist der Link zum Draufklicken in der Mail. Antwortet mit einer Seite, damit
 *           der Mensch eine Bestätigung sieht und nicht auf rohem JSON landet.
 *
 * Es wird IMMER „erledigt" gemeldet, auch bei unbekannter Adresse: Sonst liesse sich hier
 * abfragen, wer bei uns Kunde ist.
 */
const seite = (text: string) => new NextResponse(
  `<!doctype html><meta charset="utf-8">
   <meta name="viewport" content="width=device-width,initial-scale=1">
   <title>LuxuryBandit</title>
   <div style="font:16px/1.5 system-ui,sans-serif;max-width:32rem;margin:16vh auto;padding:0 1.5rem;text-align:center;color:#1a160f">
     <p style="font-size:44px;margin:0">✓</p>
     <h1 style="font-size:22px;margin:.6rem 0 0">${text}</h1>
     <p style="margin:.6rem 0 0;opacity:.75">Du bekommst von uns keine Rundbriefe mehr.
        Dein Konto und deine Videos bleiben unberührt.</p>
     <p style="margin:1.6rem 0 0"><a href="https://luxurybandit.com" style="color:#1a160f">luxurybandit.com</a></p>
   </div>`,
  { headers: { "Content-Type": "text/html; charset=utf-8" } },
);

async function abmelden(request: Request): Promise<string> {
  const q = new URL(request.url).searchParams;
  let email = String(q.get("email") ?? "").trim();
  if (!email) {
    // Der Ein-Klick des Postfachs schickt ein Formular; manche Anbieter schicken JSON.
    try {
      const roh = await request.text();
      const p = new URLSearchParams(roh);
      email = String(p.get("email") ?? "").trim();
      if (!email && roh.trim().startsWith("{")) {
        email = String((JSON.parse(roh) as { email?: string })?.email ?? "").trim();
      }
    } catch { /* ohne Adresse melden wir trotzdem Vollzug, siehe oben */ }
  }
  try { await mailAbmelden(email); } catch { /* Fehler nie an den Empfänger durchreichen */ }
  return email;
}

export async function GET(request: Request) {
  await abmelden(request);
  return seite("Abgemeldet");
}

export async function POST(request: Request) {
  await abmelden(request);
  // Der Ein-Klick des Postfachs liest keine Seite — ihm genügt 200.
  return NextResponse.json({ ok: true });
}
