import { NextResponse } from "next/server";
import { topicPriceId, standardCoupon, ONCE_CENTS, POLEDANCE_CENTS, VIDEO_UPGRADE_CENTS, EXTRA_VIDEO_CENTS, aufladeStufe, GUTSCHEIN_CENTS, geschenkPreisCents } from "@/lib/pricing";
import { guthabenAbbuchen, readKissLog } from "@/lib/try-this-look-store";
import { bezahltVermerken, lieferungAnstossen } from "@/lib/kiss-delivery";
import { couponFor } from "@/lib/promo";
import { createSubscriptionCheckout, createTryonCheckout } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ABO statt Einzelkauf (Owner-Entscheidung 2026-07-27): dasselbe 24-€-Abo wie beim Wetter,
// darin sind 5 Videos pro Monat enthalten. Der frühere 3,99-Einzelkauf ist damit abgelöst.
// Preis-ID identisch mit wetter-abo-checkout — es ist EIN Abo, nicht zwei.
// Ein Preis fuer alle Themen (lib/pricing): 49 EUR/Monat. Die alte 24-EUR-ID ist raus.
const PRICE_ID = topicPriceId();

const GUELTIGE_MAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// POST { genId?, subId?, returnTo? } → startet das Abo. Nach Zahlung schaltet der
// Stripe-Webhook frei; der Client pollt /api/checkout-status.
export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Payments are not set up yet (STRIPE_SECRET_KEY missing)." }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as { genId?: string; subId?: string; returnTo?: string; once?: boolean; extra?: boolean; videoAufpreis?: boolean; email?: string; aufladen?: boolean; topupCents?: number; thema?: string; device?: string; konto?: boolean };
  const genId = String(body?.genId ?? "").trim();
  const subId = String(body?.subId ?? "").trim();
  const origin = request.headers.get("origin")?.trim() || process.env.NEXT_PUBLIC_SITE_URL || "https://luxurybandit.com";
  const back = String(body?.returnTo ?? "").startsWith("/") ? `${origin}${body.returnTo}` : `${origin}/themes/kiss`;
  /**
   * EINMALKAUF STATT ABO (Owner 30.07.2026: „wir müssen einmalige zahlungen machen nicht nur
   * abos … 9,99 euro … für ein Video einmalig beim Küssen").
   *
   * Das Bild ist gratis, bezahlt wird das VIDEO. Wer kein Abo will, kauft dieses eine Video —
   * ohne Anmeldung, ohne Verlängerung. Preis steht in lib/pricing (ONCE_CENTS), nicht hier.
   *
   * Bewusst `price_data` statt einer Preis-ID: so muss in Stripe nichts angelegt werden, und
   * eine Preisänderung ist eine Zahl in der Preistabelle.
   *
   * `kind: "kiss-video"` ist dasselbe Kennzeichen wie beim Abo-Weg — checkout-status markiert
   * damit den Log-Eintrag als bezahlt, ohne dass dort etwas geändert werden muss.
   */
  /**
   * EIN VIDEO MEHR, ZUM ABO-PREIS (Owner 30.07.2026: „kann er dann weiter Videos kaufen für
   * 3,99?"). Für den, dessen Monatskontingent aufgebraucht ist — kein zweites Abo, kein
   * voller Einzelpreis.
   *
   * `kind: "model-video"` ist bewusst wiederverwendet: `/api/checkout-status` schreibt bei
   * diesem Kennzeichen genau EIN Video-Guthaben auf die mitgegebene Adresse gut, idempotent
   * je Kassensitzung. Ein eigener Zweig würde dieselbe Logik ein zweites Mal beschreiben.
   */
  if (body.extra) {
    const email = String(body.email ?? "").trim().toLowerCase().slice(0, 160);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "Email required." }, { status: 400 });
    }
    try {
      const { id, url } = await createTryonCheckout({
        amount: EXTRA_VIDEO_CENTS,
        currency: "eur",
        productName: "One more video",
        successUrl: `${back}${back.includes("?") ? "&" : "?"}paid=1&extra=1&cs={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${back}${back.includes("?") ? "&" : "?"}cancelled=1`,
        // Die Adresse ist an dieser Stelle geprueft — also fuellt sie das Kassenfeld und
        // sperrt es. Ein zweites Eintippen kann nur falsch sein, nie richtiger.
        email,
        metadata: { kind: "model-video", email, ...(genId ? { genId } : {}) },
      });
      return NextResponse.json({ url, sessionId: id });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Could not start checkout." }, { status: 502 });
    }
  }

  /**
   * KONTO AUFLADEN — 9,99 (Owner 01.08.2026, Variante B: Zusatzangebot; der Einzelkauf
   * bleibt). Die Rueckkehr traegt `topup=1`, NICHT `paid=1`: Eine Aufladung ist kein
   * Videokauf — sie darf weder den Eintrag als bezahlt stempeln noch ein Video anstossen.
   * Das erledigt der Trichter danach selbst, indem er den Einzelkauf wiederholt, der nun
   * aus dem Guthaben bezahlt wird.
   */
  const geraet = String(body.device ?? "").trim().slice(0, 80);
  if (body.aufladen) {
    const email = String(body.email ?? "").trim().toLowerCase().slice(0, 160);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "Email required." }, { status: 400 });
    }
    // EINE STUFE JE PREIS, WHITELIST (Owner 05.08.2026: „man muss also 14,99, 29,00 und 59,00
    // anbieten. 4,99 € kann man auch anbieten und auch 9,99 €"): Der Trichter WÜNSCHT einen
    // Betrag, die Kasse kennt nur die Leiter aus der Preistabelle — alles andere faellt auf
    // die kleinste Stufe zurueck. Gutgeschrieben wird ohnehin, was BEZAHLT wurde.
    const stufe = aufladeStufe(body.topupCents);
    try {
      const { id, url } = await createTryonCheckout({
        amount: stufe,
        currency: "eur",
        productName: "Account credit",
        successUrl: `${back}${back.includes("?") ? "&" : "?"}topup=1&cs={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${back}${back.includes("?") ? "&" : "?"}cancelled=1`,
        /**
         * DER GAST TIPPT SEINE ADRESSE BEI STRIPE (Owner 09.08.2026: „ich finde es gut wenn
         * Leute bei der Bezahlung in Stripe die E-Mail noch mal angeben dürfen oder
         * korrigieren können … und das ist die E-Mail, die dann bei der Anmeldung zählt").
         *
         * WARUM DAS EIN TIPPSCHRITT MEHR SEIN MUSS: Stripe kann nicht beides. Geben wir
         * `customer_email` mit, füllt Stripe das Feld — und SPERRT es. Damit ist der
         * Tippfehler aus unserem Trichter endgültig; genau das war die Absicht (03.08.) und
         * genau das ist die Falle: Vertippt er sich bei uns, liegt sein Geld für immer auf
         * einer Adresse, die es nicht gibt.
         *
         * Deshalb jetzt zweigeteilt: Wer ANGEMELDET ist, hat eine geprüfte Adresse — sie
         * kommt gesperrt mit, er tippt nichts. Ein GAST bekommt das Feld offen und schreibt
         * dort seine echte Adresse. Was bei Stripe steht, gewinnt danach überall
         * (Gutschrift, Auftrag, Konto) — siehe checkout-status.
         */
        ...(body.konto ? { email } : {}),
        /* DIE GERAETEKENNUNG REIST MIT (09.08.2026): Wird die Aufladung gutgeschrieben,
           gilt genau dieser Browser als bezahlt-und-vertraut. Das ist der einzige Weg auf
           die Vertrauensliste — und er kostet den Faelscher echtes Geld. */
        metadata: { kind: "aufladung", email, cents: String(stufe), ...(genId ? { genId } : {}),
                    ...(geraet ? { device: geraet } : {}) },
      });
      return NextResponse.json({ url, sessionId: id });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Could not start checkout." }, { status: 502 });
    }
  }

  if (body.once) {
    /**
     * ERST DAS GUTHABEN, DANN STRIPE (Variante B). Wer aufgeladen hat, zahlt hier ohne
     * Kasse: abbuchen (idempotent je genId — ein Doppelklick bucht nie zweimal), den
     * Eintrag als bezahlt stempeln, die Server-Lieferung vormerken, fertig. Der Trichter
     * behandelt `walletPaid` wie eine bestaetigte Zahlung.
     */
    /**
     * ZWEI PREISE — UND DER AUFTRAG ENTSCHEIDET, NICHT DER BROWSER (Owner 03.08.2026: der
     * Tanz „soll 3,99 kosten", der Kuss bleibt bei {once}).
     *
     * Der Trichter schickt kein Preisschild mit, und er wird auch nicht danach gefragt: Ein
     * Browser, der „ich bin ein Kuss" behauptet, koennte sich ein Tanz-Video zum halben Preis
     * holen. Massgeblich ist das Thema, das beim ANLEGEN des Auftrags gespeichert wurde —
     * lange bevor Geld im Spiel war.
     *
     * Findet sich der Auftrag nicht, gilt {once}. Das ist der billigere Weg und damit der
     * hoefliche Irrtum: Lieber einmal zu wenig verlangt als einem Kunden zu viel abgebucht.
     */
    /**
     * LIEBER WARTEN ALS RATEN (09.08.2026, Kundenfall bandiszidonia): Der Auftrag war zwei
     * Sekunden alt und noch nicht lesbar. Ohne ihn kennt die Kasse das Thema nicht und
     * nimmt den Standardpreis — bei ihr 15 € statt 4,99 €. Drei Anläufe mit kurzer Pause;
     * findet sie ihn dann immer noch nicht, wird NICHT geraten (siehe unten).
     */
    let auftrag = null as Awaited<ReturnType<typeof readKissLog>>[number] | null;
    if (genId) {
      for (let versuch = 0; versuch < 3; versuch++) {
        auftrag = await readKissLog().then(l => l.find(x => x.id === genId) ?? null).catch(() => null);
        if (auftrag) break;
        if (versuch < 2) await new Promise(r => setTimeout(r, 700));
      }
      if (!auftrag) {
        /* Ein Preis aus dem Nichts ist schlimmer als eine ehrliche Absage: Sie kostet einen
           zweiten Klick, ein falscher Preis kostet den Kauf. */
        console.warn("[checkout] Auftrag nicht lesbar, kein Preis geraten:", genId.slice(0, 8));
        return NextResponse.json({ error: "Einen Moment — dein Auftrag wird noch angelegt. Bitte gleich noch einmal tippen." }, { status: 409 });
      }
    }
    const thema = String(auftrag?.theme ?? "");
    /**
     * EIN AUFTRAG, EIN VIDEO — AUCH WENN DER BROWSER ES ANDERS SIEHT (Owner 08.08.2026:
     * „es wurde auch nichts abgebucht", dreimal in Folge).
     *
     * Die Abbuchung ist idempotent je Auftragsnummer (`wallet-<genId>`) — genau richtig
     * gegen Doppelklicks, aber toedlich beim ZWEITEN Video derselben Nummer: Der Server
     * fand den Schluessel eingeloest, meldete „bezahlt" und lieferte gratis. Der Trichter
     * hat dafuer laengst eine Regel (geliefert = abgegolten), aber sie lebte nur im
     * Browser — ein alter Tab, ein wiederhergestellter Zustand, und das Geld war weg.
     *
     * `extraNeeded` ist der eingebaute Weg zurueck: Der Trichter legt daraufhin einen
     * frischen Auftrag an und kauft normal. Dieselbe Antwort kennt er schon von
     * /api/generate-tryon-video.
     */
    if (auftrag?.videoUrl) {
      return NextResponse.json({ extraNeeded: true, priceCents: geschenkPreisCents(thema) });
    }
    const tanz = thema === "poledance";
    /**
     * DER VIDEO-AUFPREIS (Owner 04.08.2026: „er bekommt ein Bild für 1,49; wenn er das Video
     * generieren möchte, dann kann er das nachträglich für 3,99").
     *
     * Das ist der EINZIGE Preis, den der Browser mitbestimmen darf — und zwar nur nach OBEN.
     * Die Regel oben („massgeblich ist das Thema, nicht der Browser") schuetzt davor, dass
     * sich jemand ein teures Video billig holt. Hier ist es umgekehrt: Wer `videoAufpreis`
     * setzt, verlangt MEHR zu zahlen als die Vorgabe. Ein Angreifer, der das faelscht,
     * schadet nur sich selbst — deshalb genuegt hier das Flag.
     *
     * Beim Tanz bleibt es beim Tanzpreis: Dort IST das Video das Produkt, es gibt kein Bild
     * davor und also auch nichts aufzuwerten.
     */
    const videoAufpreis = body.videoAufpreis === true && !tanz;
    /* DIE GUTSCHEIN-KARTE KOSTET WENIGER (Owner 05.08.2026: „15 € ist zu viel für den
       Gutschein. Es muss 9,99 sein"). Weisse Liste statt Betrag aus dem Aufruf: Der Browser
       sagt nur, WELCHES Thema — die Zahl steht in lib/pricing. */
    const gutschein = String(body.thema ?? "") === "gutschein";
    /**
     * DER PREIS DES GESCHENKS STEHT IN DER PREISTABELLE, NICHT HIER (07.08.2026).
     *
     * Hier stand `: ONCE_CENTS` — und damit kostete der Geburtstag an der Kasse 15 €, während
     * der Trichter 4,99 € verlangte. Wer mit 8,01 € Guthaben kaufte, kam nie durch: Die
     * Abbuchung scheiterte an den 15 €, und dahinter entstand eine 15-€-Stripe-Sitzung für ein
     * Video zu 4,99 €. `geschenkPreisCents` ist ab jetzt die eine Zeile, die beide Seiten
     * lesen — der Trichter für „reicht das Guthaben?", die Kasse fürs Abbuchen.
     *
     * Massgeblich bleibt das GESPEICHERTE Thema des Auftrags, nicht das, was der Browser
     * behauptet — die Regel darüber gilt unverändert.
     */
    const preis = tanz ? POLEDANCE_CENTS
      : gutschein ? GUTSCHEIN_CENTS
      : videoAufpreis ? VIDEO_UPGRADE_CENTS : geschenkPreisCents(thema);
    const email = String(body.email ?? "").trim().toLowerCase().slice(0, 160);
    if (email && genId) {
      try {
        const ab = await guthabenAbbuchen(email, `wallet-${genId}`, preis, geraet);
        /* Fremder Browser auf fremdem Konto: kein Guthaben-Weg. Er landet auf der Kasse und
           zahlt selbst — genau wie jeder, der zum ersten Mal hier ist. */
        if (ab.fremd) {
          console.warn("[checkout] Guthaben-Zugriff von unbekanntem Geraet abgewiesen");
        }
        if (ab.ok) {
          /**
           * NUR „BEZAHLT" MELDEN, WENN DER STEMPEL AUCH SITZT (03.08.2026).
           *
           * Hier stand der Aufruf ohne Rueckfrage. Konnte er den Auftrag nicht stempeln — weil
           * es ihn nicht mehr gab —, meldete die Kasse trotzdem `walletPaid`. Der Browser
           * glaubte sich bezahlt, die Video-Route sah keinen bezahlten Auftrag und wies ab:
           * ein Kreis, aus dem der Kunde nie herauskam. `bezahltVermerken` legt fehlende
           * Auftraege inzwischen selbst wieder an; scheitert es trotzdem, ist die ehrliche
           * Antwort ein Fehler und nicht ein falsches Ja.
           */
          const gestempelt = await bezahltVermerken(genId, email, "kiss-video");
          if (!gestempelt) {
            return NextResponse.json({ error: "Auftrag nicht auffindbar — bitte neu starten." }, { status: 409 });
          }
          lieferungAnstossen(origin, genId);
          return NextResponse.json({ walletPaid: true, rest: ab.rest });
        }
      } catch { /* Guthaben-Weg kaputt → normale Kasse, der Kunde merkt nichts */ }
    }
    try {
      const { id, url } = await createTryonCheckout({
        amount: preis,
        currency: "eur",
        /**
         * KEINE PREIS-KENNUNG MEHR, NUR DER BETRAG (05.08.2026, Owner: „5,10,15,30,60").
         *
         * Hier stand kurz die gemeinsame 14,99-Kennung des Owners. Mit den runden Preisen
         * steht sie auf 1499, waehrend ONCE_CENTS 1500 sagt — eine Kennung, die der Tabelle
         * hinterherhinkt, bucht einen anderen Betrag ab als der Knopf verspricht. Bei
         * `price_data` kann das nicht passieren: Der Betrag IST die Tabelle.
         *
         * Was der Kunde auf der Kassenseite liest, steht in `productName` darunter — dafuer
         * braucht es kein Produkt in Stripe. Kennungen bleiben nur dort Pflicht, wo Stripe
         * sie verlangt: bei den ABOS (hochzeitAboPriceId / chatAboPriceId).
         */
        /* Was auf der Kassenseite steht, muss dasselbe Ding meinen wie der Betrag daneben.
           „Kiss video" über einem Geburtstagsvideo ist für den Kunden ein fremder Posten auf
           der Abrechnung — und für uns eine Rückbuchung, die niemand zuordnen kann. */
        productName: tanz ? "Pole dance video — one-off"
          : thema === "birthday" ? "Birthday video — one-off"
          : "Kiss video — one-off",
        successUrl: `${back}${back.includes("?") ? "&" : "?"}paid=1&cs={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${back}${back.includes("?") ? "&" : "?"}cancelled=1`,
        /**
         * Hier war der Riss am tiefsten: Die Adresse stand nicht einmal in den Metadaten,
         * und `checkout-status` stempelt den bezahlten Auftrag mit `s.customerEmail` — also
         * mit dem, was der Kunde an der Kasse tippte. Wich das vom Trichter ab, lag sein
         * bezahltes Video unter einer Adresse, unter der die Galerie nie sucht.
         */
        ...(GUELTIGE_MAIL.test(email) ? { email } : {}),
        metadata: { kind: "kiss-video", ...(email ? { email } : {}), ...(genId ? { genId } : {}), ...(subId ? { subId } : {}) },
      });
      return NextResponse.json({ url, sessionId: id });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Could not start checkout." }, { status: 502 });
    }
  }

  try {
    const { id, url } = await createSubscriptionCheckout({
      priceId: PRICE_ID,
      coupon: couponFor(String((body as { code?: string })?.code ?? "")) ?? standardCoupon(),
      successUrl: `${back}${back.includes("?") ? "&" : "?"}paid=1&cs={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${back}${back.includes("?") ? "&" : "?"}cancelled=1`,
      // kind bleibt "wetter-abo", damit der bestehende Webhook den Abonnenten freischaltet.
      metadata: { kind: "wetter-abo", ...(subId ? { subId } : {}), ...(genId ? { genId } : {}) },
    });
    return NextResponse.json({ url, sessionId: id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not start checkout." }, { status: 502 });
  }
}
