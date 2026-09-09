import { NextResponse } from "next/server";
import { planAlsPdf, type VersusForgePlan } from "@/lib/versusforge-pdf";
import { VERSUSFORGE_START_CENTS } from "@/lib/pricing";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * DER PLAN ALS PDF (Owner 08.09.2026, auf die Frage „was bekommt der User?" hin gebaut).
 *
 * WARUM POST UND KEIN LINK MIT KENNUNG: Der Plan wird nirgends abgelegt, solange niemand
 * seine Adresse hinterlassen hat — der Server merkt sich in diesem Trichter absichtlich
 * nichts. Es gibt also keine Kennung, die man in eine Adresse schreiben könnte. Der Browser
 * schickt den Plan, den er ohnehin schon anzeigt, und bekommt ihn gesetzt zurück.
 *
 * KEIN MODELL, KEIN DECKEL: Hier wird nur gesetzt, was schon da ist. Ein Deckel auf dem
 * Herunterladen würde niemanden vor Kosten schützen und nur den ärgern, der sein eigenes
 * Blatt ein zweites Mal will.
 *
 * GRENZE GEGEN UNSINN: Was hereinkommt, wird auf Länge beschnitten. Ohne das könnte jemand
 * ein Megabyte Text schicken und sich ein tausendseitiges PDF bauen lassen — Rechenzeit, die
 * niemandem nützt.
 */

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const liste = (v: unknown, anzahl: number, max: number) =>
  (Array.isArray(v) ? v : []).slice(0, anzahl).map(x => str(x, max)).filter(Boolean);

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try { body = (await request.json()) as Record<string, unknown>; } catch { /* leer */ }

  const roh = (body.plan ?? {}) as Record<string, unknown>;
  const plan: VersusForgePlan = {
    befund: str(roh.befund, 1200),
    zielgruppe: liste(roh.zielgruppe, 8, 300),
    hook: str(roh.hook, 300),
    hookWarum: str(roh.hookWarum, 500),
    motive: (Array.isArray(roh.motive) ? roh.motive : []).slice(0, 6).map(m => {
      const o = (m ?? {}) as Record<string, unknown>;
      return { text: str(o.text, 300), idee: str(o.idee, 800) };
    }).filter(m => m.text || m.idee),
    bauteile: (Array.isArray(roh.bauteile) ? roh.bauteile : []).slice(0, 6).map(b => {
      const o = (b ?? {}) as Record<string, unknown>;
      return { was: str(o.was, 60), wozu: str(o.wozu, 300), selbst: str(o.selbst, 700), aufwand: str(o.aufwand, 120) };
    }).filter(b => b.was),
    anzeige: (() => {
      const a = (roh.anzeige ?? {}) as Record<string, unknown>;
      const primaer = str(a.primaer, 125);
      if (!primaer && !str(a.ueberschrift, 40)) return undefined;
      return { primaer, ueberschrift: str(a.ueberschrift, 40), beschreibung: str(a.beschreibung, 30), knopf: str(a.knopf, 30) };
    })(),
    trichter: liste(roh.trichter, 8, 600),
    budget: str(roh.budget, 800),
    warnung: str(roh.warnung, 900),
  };

  /* Ohne Hook und ohne Strecke gibt es nichts zu setzen — ein leeres Blatt wäre schlimmer
     als eine ehrliche Absage. */
  if (!plan.hook && !plan.trichter?.length && !plan.befund) {
    return NextResponse.json({ error: "Zu diesem Plan gibt es nichts zu setzen." }, { status: 400 });
  }

  try {
    /* DER PREIS KOMMT AUS DER TABELLE, nie aus dem Text (Hausregel
       [[prices-only-from-pricing-table]]). */
    const einstieg = `${(VERSUSFORGE_START_CENTS / 100).toFixed(2).replace(".", ",")} €`;
    const runden = (Array.isArray(body.runden) ? body.runden : []).slice(0, 8).map(r => {
      const o = (r ?? {}) as Record<string, unknown>;
      return { frage: str(o.frage, 400), antwort: str(o.antwort, 1500) };
    }).filter(r => r.frage);
    const bytes = await planAlsPdf(plan, { einstieg, eingabe: str(body.eingabe, 2000), runden });
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="VersusForge-Plan.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[versusforge-pdf] Setzen fehlgeschlagen", e);
    return NextResponse.json({ error: "Das PDF liess sich gerade nicht bauen." }, { status: 500 });
  }
}
