import { NextResponse } from "next/server";
import { createTryonCheckout } from "@/lib/stripe";
import { guthabenAbbuchen } from "@/lib/try-this-look-store";
import { PLAN_CENTS, aufladeStufe } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DIE KASSE FÜR DEN LUXURYBANDIT PLAN (Owner 04.08.2026: „Den Plan verkaufen wir für 9,99 €"
 * · „alles drum und dran. Bilder generieren und system.").
 *
 * ERST DAS GUTHABEN, DANN STRIPE — dieselbe Reihenfolge wie beim Kuss (Variante B). Wer
 * aufgeladen hat, zahlt ohne Kassenfenster: abbuchen, fertig. Wer nichts drauf hat, geht
 * einmal durch Stripe.
 *
 * DREI WEGE, EINE ROUTE:
 *   { laufId, email }                → aus dem Guthaben abbuchen; reicht es nicht: `{ zuwenig }`
 *   { laufId, email, kaufen: true }  → Stripe, genau ein Plan ({plan})
 *   { email, aufladen, topupCents }  → Stripe, Konto aufladen (die zwei bekannten Stufen)
 *
 * DER PREIS KOMMT AUS DER TABELLE, NICHT AUS DEM BROWSER. `PLAN_CENTS` steht in
 * lib/pricing.ts; was der Browser schickt, wird nicht gefragt. Ein Preisschild, das über dem
 * liegt, was die Kasse nimmt — oder darunter —, ist der eine Fehler, den man nicht
 * wegerklären kann (dieselbe Regel wie im Kuss-Trichter).
 *
 * IDEMPOTENT JE LAUF: `guthabenAbbuchen` bekommt `plan-<laufId>` als Schlüssel. Ein
 * Doppelklick, ein zurückspringender Browser, ein zweiter Tab — es wird genau einmal
 * abgebucht. Ohne `laufId` wird gar nicht abgebucht: Ein Abbuchen ohne Auftrag wäre Geld
 * ohne Gegenwert.
 *
 * NOCH NICHT ANGESCHLOSSEN: Der Lauf selbst (Jurys erzeugen, Chat, Mappe) existiert noch
 * nicht. Diese Route ist die Kasse davor und wartet auf ihn — sie stempelt keinen Auftrag,
 * weil es noch keinen Auftragsspeicher gibt. Wer den Lauf baut, hängt hier den Stempel an
 * (siehe Skill `business-analyse`).
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    laufId?: string; email?: string; kaufen?: boolean; aufladen?: boolean; topupCents?: number; returnTo?: string;
  };

  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 160);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Email required." }, { status: 400 });
  }

  const origin = request.headers.get("origin")?.trim() || process.env.NEXT_PUBLIC_SITE_URL || "https://luxurybandit.com";
  const zurueck = String(body.returnTo ?? "").startsWith("/") ? `${origin}${body.returnTo}` : `${origin}/themes/luxurybandit-plan`;
  const anhaengen = (was: string) => `${zurueck}${zurueck.includes("?") ? "&" : "?"}${was}`;

  /* ── 1 · KONTO AUFLADEN ───────────────────────────────────────────────────────────
     Whitelist ueber AUFLADE_STUFEN: Der Trichter WUENSCHT einen Betrag, die Kasse kennt
     nur die Leiter aus der Preistabelle — seit 05.08.2026 eine Stufe je Produktpreis
     (4,99 · 9,99 · 14,99 · 29,00 · 59,00). Gutgeschrieben wird ohnehin, was bezahlt wurde.
     Die Rückkehr trägt `topup=1`, nicht `paid=1` — eine Aufladung ist kein Kauf. */
  if (body.aufladen) {
    const stufe = aufladeStufe(body.topupCents);
    try {
      const { id, url } = await createTryonCheckout({
        amount: stufe,
        currency: "eur",
        productName: "Account credit",
        successUrl: anhaengen("topup=1&cs={CHECKOUT_SESSION_ID}"),
        cancelUrl: anhaengen("cancelled=1"),
        // Die Adresse ist geprüft — sie füllt das Kassenfeld und sperrt es. Eine an der Kasse
        // vertippte Adresse hiesse Guthaben auf einem Konto, das ihm nicht gehört.
        email,
        metadata: { kind: "aufladung", email, cents: String(stufe) },
      });
      return NextResponse.json({ url, sessionId: id });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Could not start checkout." }, { status: 502 });
    }
  }

  const laufId = String(body.laufId ?? "").trim().slice(0, 80);

  /* ── 2 · DIREKT KAUFEN — der Normalweg ────────────────────────────────────────────
     Ein System, ein Betrag, kein Abo. Es gibt zwar eine Auflade-Stufe ueber denselben
     Betrag, aber der direkte Kauf ist der kuerzere Weg.

     UEBER `price_data`, NICHT UEBER EINE PREIS-KENNUNG — geaendert am 05.08.2026, als die
     Preise auf runde Zahlen gingen (Owner: „5,10,15,30,60"). Die Kennung des Owners stand
     auf 5900; PLAN_CENTS steht auf 6000. Eine Kennung, die der Tabelle hinterherhinkt,
     bucht einen anderen Betrag ab, als auf dem Knopf steht — und das faellt erst auf, wenn
     sich jemand beschwert. Der Betrag kommt jetzt aus der Tabelle, also koennen die beiden
     nicht mehr auseinanderlaufen. Fuer ABOS bleibt die Kennung Pflicht (Stripe verlangt sie
     dort), siehe `hochzeitAboPriceId` / `chatAboPriceId`. */
  if (body.kaufen) {
    try {
      const { id, url } = await createTryonCheckout({
        amount: PLAN_CENTS,
        currency: "eur",
        productName: "LuxuryBandit System",
        successUrl: anhaengen(`paid=1&plan=1${laufId ? `&lauf=${encodeURIComponent(laufId)}` : ""}&cs={CHECKOUT_SESSION_ID}`),
        cancelUrl: anhaengen("cancelled=1"),
        email,
        metadata: { kind: "plan", email, cents: String(PLAN_CENTS), ...(laufId ? { laufId } : {}) },
      });
      return NextResponse.json({ url, sessionId: id });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Could not start checkout." }, { status: 502 });
    }
  }

  /* ── 3 · AUS DEM GUTHABEN ─────────────────────────────────────────────────────────
     Der Normalfall für jeden, der schon einmal aufgeladen hat: kein Kassenfenster, kein
     Warten, ein Klick. */
  if (!laufId) {
    return NextResponse.json({ error: "laufId required." }, { status: 400 });
  }
  try {
    const ab = await guthabenAbbuchen(email, `plan-${laufId}`, PLAN_CENTS);
    /**
     * REICHT ES NICHT, IST DAS KEIN FEHLER, SONDERN EINE ANTWORT. Der Trichter zeigt dann
     * den Auflade-Wähler — und NICHT eine rote Meldung. Hier stand beim Kuss einmal ein
     * `walletPaid: true`, obwohl gar nicht abgebucht wurde; der Browser hielt den Kauf für
     * erledigt und lieferte nie. Deshalb: nur bei echtem Abbuchen `bezahlt`.
     */
    if (!ab?.ok) {
      return NextResponse.json({ zuwenig: true, rest: ab?.rest ?? 0, brauchtCents: PLAN_CENTS });
    }
    return NextResponse.json({ bezahlt: true, rest: ab.rest });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not charge the account." }, { status: 502 });
  }
}
