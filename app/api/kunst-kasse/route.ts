import { NextResponse } from "next/server";
import { str } from "@/lib/agent-modell";
import { createPackCheckout, stripeConfigured } from "@/lib/stripe";
import { KUNST_CENTS } from "@/lib/lakatosbandi-druck";
import { geraetSauber } from "@/lib/lakatosbandi-kunst-riegel";
import { mandantOeffentlich } from "@/lib/versusforge-mandanten";
import { keinMensch } from "@/lib/kein-mensch";
import { kundenbildZettel } from "@/lib/lakatosbandi-kundenbild";

/**
 * ── EIN EURO FÜR EIN ERZEUGTES BILD (Owner 18.09.2026) ───────────────────────────────────────
 *
 * ── DER BETRAG KOMMT NIE AUS DEM BROWSER (Skill `bezahlung`, Regel 3) ───────────────────────
 *
 * Der Browser sagt nur, WER (Gerät) und WO (Künstler, Werk). Was das kostet, weiss allein
 * `KUNST_CENTS` — sonst könnte jemand mit einem geänderten Aufruf für einen Cent kaufen.
 *
 * ── KASSE IN DER SEITE, NICHT ALS FENSTER ───────────────────────────────────────────────────
 *
 * `eingebettet: true` — Hausregel [[kasse-in-der-seite]] und [[keine-overlay-dialoge]]. Ein
 * Popup wird auf dem Telefon geblockt oder verschluckt, und dann steht der Käufer vor nichts.
 *
 * ── DAS GERÄT REIST IN DEN METADATEN MIT ────────────────────────────────────────────────────
 *
 * Der Webhook schreibt das Guthaben gut, und er sieht vom Browser nichts ausser dem, was hier
 * mitgegeben wird. Ohne diese Kennung wäre nach der Zahlung nicht mehr feststellbar, WER
 * bezahlt hat — es gibt hier kein Konto und keine Anmeldung.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (keinMensch(request)) return NextResponse.json({ ok: false }, { status: 403 });
  if (!stripeConfigured()) return NextResponse.json({ ok: false, grund: "keine-kasse" }, { status: 503 });

  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const mandant = str(b.mandant, 80);
  const werk = str(b.werk, 10) || "standard";
  const geraet = geraetSauber(b.geraet);
  const sprache = str(b.sprache, 5) || "en";
  if (!mandant || !geraet) return NextResponse.json({ ok: false, grund: "unvollstaendig" }, { status: 400 });

  /* Den Künstler gibt es wirklich? Sonst entstünde eine Zahlung auf eine Seite, die niemandem
     gehört — und im Webhook ein Gutschein ohne Herkunft. */
  const m = await mandantOeffentlich(mandant);
  if (!m) return NextResponse.json({ ok: false, grund: "unbekannt" }, { status: 404 });

  /**
   * ── DIE KENNUNG DES FOTOS REIST MIT (Owner 19.09.2026) ─────────────────────────────────────
   *
   * Stripe schickt den Browser nach der Zahlung auf diese Adresse — und löscht damit alles, was
   * nur im Browser stand. `?kunst=<id>` ist der Faden, an dem die Seite ihren Auftrag
   * wiederfindet: Das Foto liegt seit `api/kunst-foto` auf dem Server, die Seite fragt nach dem
   * Guthaben und erzeugt weiter, ohne dass er noch einmal etwas tut.
   *
   * Ohne Kennung bleibt es beim alten `kunst=1` — dann hat er nichts abgelegt, und die Seite
   * kann höchstens sagen, dass das Guthaben da ist.
   */
  const bild = str(b.bild, 32);

  /**
   * ── DIE ADRESSE NUR EINMAL FRAGEN (Owner 19.09.2026: „ich muss in Stripe immer zwei Mal die
   * E-Mail angeben") ──────────────────────────────────────────────────────────────────────────
   *
   * Er tippt sie in unserem Fenster ein — dorthin schicken wir das fertige Blatt. Ohne
   * `customer_email` fragt Stripe sie gleich darauf noch einmal ab. Zweimal dasselbe tippen ist
   * kein Schönheitsfehler: An jeder zusätzlichen Zeile vor der Kasse bricht jemand ab.
   *
   * ZWEI QUELLEN, WEIL DIE ERSTE VERSCHWINDEN KANN: aus dem Aufruf, sonst vom abgelegten Zettel
   * (dort steht sie seit `api/kunst-foto`, auch nach einem Neuladen der Seite).
   */
  const ausAufruf = str(b.mail, 200).trim();
  const vomZettel = bild ? String((await kundenbildZettel(bild))?.mail ?? "").trim() : "";
  const mail = (ausAufruf.includes("@") ? ausAufruf : vomZettel.includes("@") ? vomZettel : "");

  const basis = new URL(request.url).origin;
  const ziel = `${basis}/portal/${encodeURIComponent(mandant)}?ansicht=poster&lang=${encodeURIComponent(sprache)}&kunst=${encodeURIComponent(bild || "1")}#w-${encodeURIComponent(werk)}`;

  try {
    const kasse = await createPackCheckout({
      amount: KUNST_CENTS,
      productName: "Your portrait",
      successUrl: ziel,
      cancelUrl: ziel,
      eingebettet: true,
      ...(mail ? { email: mail } : {}),
      sprache,
      metadata: { art: "kunst", geraet, mandant, werk, ...(bild ? { bild } : {}) },
    });
    return NextResponse.json({ ok: true, clientSecret: kasse.clientSecret, id: kasse.id });
  } catch (e) {
    console.warn("[kunst-kasse] fehlgeschlagen:", e);
    return NextResponse.json({ ok: false, grund: "fehler" }, { status: 502 });
  }
}
