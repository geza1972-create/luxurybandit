import { NextResponse } from "next/server";
import { str } from "@/lib/agent-modell";
import { mandantLesen } from "@/lib/versusforge-mandanten";
import { istKuenstler } from "@/lib/lakatosbandi-adressen";
import { werkKacheln } from "@/lib/lakatosbandi";
import { portalSprache } from "@/lib/lakatosbandi-texte";
import { introHolen, INTRO_SPRACHEN } from "@/lib/kuenstler-agent-intro";
import { keinMensch } from "@/lib/kein-mensch";

/**
 * DER VERKAUFENDE AGENT AUF SEINER SEITE — SEIN ERSTER SATZ ZU EINEM WERK (Owner 11.09.2026: „er müsste sofort etwas
 * über den Stil sagen und: willst du mehr erfahren? — Ja, mich interessiert dieses Kunstwerk").
 *
 * Meist schon vorab geschrieben (lib/kuenstler-agent-intro.ts, `introsVorab`) — dann kommt er in unter einer Sekunde.
 * Fehlt er doch, wird er jetzt geschrieben und gespeichert.
 *
 * ── KEIN MODELLAUFRUF FÜR BOTS UND ERFUNDENE WERKE (Owner 11.09.2026: „dass die Robots den Agenten nicht unendlich
 * heizen") ─────────────────────────────────────────────────────────────────────────────────────────────────────────
 *
 * Bis eben schrieb das grosse Modell für JEDE Nummer einen Text — auch für Werk 9999, das es nicht gibt, und legte
 * ihn ab. Ein Skript, das hochzählt, hätte beliebig viele Aufrufe bezahlt. Jetzt nur echte Werke des Künstlers und nur
 * RO, EN, DE: höchstens Werke × 3 Texte je Künstler, einmal geschrieben, danach aus dem Speicher.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (keinMensch(request)) return NextResponse.json({ ok: false }, { status: 403 });

  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const mandant = str(b.mandant, 80);
  const m = mandant ? await mandantLesen(mandant) : null;
  if (!m || !istKuenstler(m) || m.freigabe === "abgelehnt") return NextResponse.json({ ok: false }, { status: 404 });

  const lang = portalSprache(str(b.sprache, 5), m.sprache ?? "en");
  if (!(INTRO_SPRACHEN as readonly string[]).includes(lang)) return NextResponse.json({ ok: false }, { status: 404 });
  const roh = str(b.i, 4);
  let nr = /^-?\d+$/.test(roh) ? String(Number(roh)) : "-1";
  const kacheln = werkKacheln(m);
  if (!kacheln.some(k => String(k.i) === nr)) {
    /* Seine Seite ohne `?h=` schickt „-1". Hat er keinen Standard-Spruch, spricht der Agent über sein erstes Werk. */
    if (nr === "-1" && kacheln.length) nr = String(kacheln[0].i);
    else return NextResponse.json({ ok: false }, { status: 404 });
  }
  return NextResponse.json({ ok: true, ...(await introHolen(mandant, nr, lang)) });
}
