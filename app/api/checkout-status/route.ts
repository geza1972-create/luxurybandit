import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email-send";
import { getCheckoutSession, stripeConfigured } from "@/lib/stripe";
import { walletGeraetMerken, einladungAboVermerken, grantMonthlySubscriptionCredits, grantVideoCredits, guthabenAufladen, readTryThisLookState, saveTryThisLookState, chatZugangGewaehren } from "@/lib/try-this-look-store";
import { bezahltVermerken, lieferungAnstossen, adresseKorrigieren } from "@/lib/kiss-delivery";
import { futureProgramUrl } from "@/lib/future-program-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DIE TESTKLAPPE FÜR DEN KAUFWEG — nur auf dem Entwicklungsrechner.
 *
 * Warum es sie gibt (Owner 31.07.2026): Der Stripe-Schluessel dieses Projekts ist der
 * LIVE-Schluessel. Der Weg „bezahlt → Video kommt" liess sich deshalb nie pruefen, ohne
 * echtes Geld auszugeben — und genau darum brach er am 31.07.2026 unbemerkt: Nach der
 * Zahlung passierte nichts, „also Kunde wurde ausgeraubt. Das ist fatal."
 *
 * Ein Weg, den man nicht pruefen kann, bricht irgendwann. Und er bricht an der teuersten
 * Stelle, die es gibt — nach der Zahlung.
 *
 * DREI SCHLOESSER, und alle drei muessen offen sein:
 *   1. `LB_TEST_CHECKOUT` muss gesetzt sein. Diese Variable existiert auf Vercel NICHT und
 *      gehoert dort auch nie hinein — sie steht nur in der lokalen `.env.local`.
 *   2. `NODE_ENV` darf nicht `production` sein. Selbst wenn jemand die Variable versehentlich
 *      in die Produktion traegt, passiert nichts.
 *   3. Die Sitzungsnummer muss mit `TEST-` beginnen. Eine echte Stripe-Nummer beginnt mit
 *      `cs_`; eine echte Zahlung kann also nie in diesen Zweig geraten.
 *
 * Was hier zurueckkommt, ist genau das, was der Browser nach einer echten Zahlung sieht —
 * mehr nicht. Es wird nichts gutgeschrieben und nichts geliefert; geprueft wird der WEG,
 * nicht die Buchhaltung.
 */
const testKlappeOffen = (sessionId: string) =>
  !!process.env.LB_TEST_CHECKOUT
  && process.env.NODE_ENV !== "production"
  && sessionId.startsWith("TEST-");

// Called when the customer returns from Stripe Checkout. Confirms the session was
// actually paid before the client unlocks the paid try-on tier.
/**
 * „DEIN GUTHABEN IST DA" — die Bestätigung nach der Aufladung (Owner 09.08.2026).
 *
 * Sie hat zwei Aufgaben, und die zweite ist die wichtigere: Sie sagt ihm, dass sein Geld
 * angekommen ist — UND sie prüft die Adresse. Kommt sie als unzustellbar zurück, fängt der
 * Rückläufer-Leser das ab, und wir wissen, dass dort Geld auf einer toten Adresse liegt.
 *
 * Die Beträge kommen als Cent herein und werden hier EINMAL formatiert; Preise stehen nie
 * fest im Text (Hausregel).
 */
async function guthabenMailSchicken(o: string, an: string, cents: number, stand: number): Promise<void> {
  if (!an) return;
  const eur = (c: number) => (c / 100).toFixed(2).replace(".", ",") + " €";
  const html =
    `<div style="background:#0d0b0a;padding:22px 0;font-family:Arial,Helvetica,sans-serif">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">`
    + `<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="width:520px;max-width:94%;background:#16120f;border-radius:18px;overflow:hidden">`
    + `<tr><td style="padding:20px 22px 6px;color:#f6cf51;font-size:13px;font-weight:bold;letter-spacing:2px">LUXURYBANDIT</td></tr>`
    + `<tr><td style="padding:0 22px 12px;color:#fff;font-size:20px;font-weight:bold">Your credit is ready</td></tr>`
    + `<tr><td style="padding:0 22px 14px;color:#e8e2d6;font-size:14px;line-height:1.55">`
    + `We added ${eur(cents)} to your account. Your balance is now <b>${eur(stand)}</b>.<br>`
    + `This is the address your credit and your videos belong to — keep it, and you will find them on any device.`
    + `</td></tr>`
    + `<tr><td style="padding:0 22px 10px"><a href="${o}/my-gallery" style="display:inline-block;background:#f6cf51;color:#111;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:bold;text-decoration:none">Open my gallery</a></td></tr>`
    + `</table></td></tr></table></div>`;
  try { await sendEmail({ to: an, subject: "Your credit is ready", html }); } catch { /* Geld ist gebucht — die Post ist Beigabe */ }
}

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id")?.trim();
  if (!sessionId) return NextResponse.json({ error: "session_id required." }, { status: 400 });

  if (testKlappeOffen(sessionId)) {
    console.warn("[checkout-status] TESTKLAPPE — vorgetaeuschte Zahlung, nur lokal:", sessionId);
    return NextResponse.json({ paid: true, status: "complete", tier: "", lookId: "", kind: "kiss-video", test: true });
  }

  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Payments not configured." }, { status: 503 });
  }

  try {
    const s = await getCheckoutSession(sessionId);
    const paid = s.paymentStatus === "paid" || s.paymentStatus === "no_payment_required";

    // THEMEN-ABO (chat/holiday/wetter/…): schreibt dem Kaeufer die 5 Videos des Monats gut.
    // Das Abo gilt themenuebergreifend — ein Guthaben, egal in welchem Thema er generiert.
    if (paid && /-abo$/.test(String(s.metadata.kind ?? ""))) {
      const email = (s.customerEmail || s.clientReferenceId || "").trim().toLowerCase();
      if (email) {
        try { await grantMonthlySubscriptionCredits(email); }
        catch (e) { console.warn("[checkout-status] Monatsguthaben fehlgeschlagen", e); }
      }
    }

    /**
     * EINLADUNGS-ABO (Ä11, Owner 02.08.2026): schaltet Zusagen/Menü/Gruppenchat für GENAU
     * DIESE Einladung frei und hält ihre Seite über die Probezeit hinaus online. Bewusst
     * `kind === "einladung-plan"`, nicht „…-abo" — sonst würde der Block direkt darüber
     * zusätzlich das themenübergreifende Monatsguthaben gutschreiben, ein anderes Produkt.
     */
    /**
     * CHAT-ZUGANG (Owner 03.08.2026). Wie die Bloecke daneben: Der Server traegt ein, was
     * bezahlt wurde — nicht der Browser. Vorher merkte sich der Chat die Zahlung in
     * `localStorage`; das galt ewig, war auf dem zweiten Geraet weg und mit einer Zeile in der
     * Konsole gefaelscht.
     */
    if (paid && s.metadata.kind === "chat-zugang") {
      /* DER MONAT GEHOERT DEM BESCHENKTEN (Owner 05.08.2026: „zwei Email … deine und für wen
         das ist"). Steht keine Empfaengeradresse im Vermerk, hat er es fuer sich selbst
         gekauft — dann bekommt er ihn, wie bisher. */
      const email = (String(s.metadata.empfaenger ?? "").trim().toLowerCase()
        || s.customerEmail || s.clientReferenceId || "").trim().toLowerCase();
      const monate = Number(s.metadata.monate ?? 0);
      if (email && monate > 0) {
        try { await chatZugangGewaehren(email, String(sessionId), monate); }
        catch { /* nie den Kassen-Rueckweg an einer Nebensache scheitern lassen */ }
      }
    }

    if (paid && s.metadata.kind === "einladung-plan") {
      const einladungId = String(s.metadata.einladungId ?? "").trim();
      if (einladungId) {
        try { await einladungAboVermerken(einladungId); }
        catch (e) { console.warn("[checkout-status] Einladungs-Abo fehlgeschlagen", e); }
      }
    }

    // $8 video pack → grant the credits (idempotent per session id) to the buyer email.
    let credits: number | undefined;
    if (paid && s.metadata.kind === "pack4") {
      const email = (s.clientReferenceId || s.customerEmail || "").trim().toLowerCase();
      if (email) {
        const n = Number(s.metadata.credits ?? 4) || 4;
        const res = await grantVideoCredits(email, sessionId, n);
        credits = res.credits;
      }
    }
    // Creator paid $9.99 to CLAIM a unique AI face → book it to her (once-only, idempotent).
    if (paid && s.metadata.kind === "avatar-face") {
      const faceId = String(s.metadata.faceId ?? "").trim();
      const curatorId = String(s.metadata.curatorId ?? s.clientReferenceId ?? "").trim();
      if (faceId && curatorId) {
        const st = await readTryThisLookState();
        const face = (st.avatarFaces ?? []).find(f => f.id === faceId);
        if (face && (!face.claimedBy || face.claimedBy === curatorId)) {
          face.claimedBy = curatorId; face.claimedAt = face.claimedAt || new Date().toISOString();
          const cur = (st.curators ?? []).find(c => c.id === curatorId);
          let creatorEmail = "";
          if (cur) { (cur as any).avatarFaceId = faceId; creatorEmail = String((cur as any).email ?? "").trim().toLowerCase(); }
          await saveTryThisLookState(st);
          // Buying an AI face ($9.99) INCLUDES one free video generation (idempotent per session).
          if (creatorEmail) { const res = await grantVideoCredits(creatorEmail, sessionId, 1); credits = res.credits; }
        }
      }
    }

    /**
     * KISS/IDOL BEZAHLT → Eintrag als bezahlt vermerken UND den Auftrag vormerken.
     *
     * Gilt für beide Kaufwege: den Einzelkauf (`kiss-video`) und das Abo, das aus demselben
     * Trichter startet und deshalb ebenfalls eine `genId` mitschickt.
     *
     * Die Zahlung ist die EINZIGE Stelle, an der ein anonymer Kiss-Besucher eine E-Mail
     * hinterlässt — Stripe fragt sie an der Kasse ab. Ohne diesen Vermerk ist der Käufer
     * hinterher namenlos und sein Video unauffindbar.
     *
     * `bezahltVermerken` setzt zusätzlich die Frist, ab der der SERVER das Video zu Ende
     * bringt, falls der Browser des Kunden es nicht tut (Owner: „der Kunde wurde ausgeraubt").
     */
    /**
     * AUFLADUNG (Owner 01.08.2026): Guthaben gutschreiben, idempotent je Sitzung — und dann
     * NICHTS weiter. Insbesondere darf der Kiss-Block darunter NICHT laufen: Die Aufladung
     * traegt eine genId (damit der Trichter danach weiss, welches Video er vom Guthaben
     * kaufen soll), aber sie IST kein Videokauf. Ohne diese Weiche wuerde die 9,99-Aufladung
     * den Eintrag als bezahlt stempeln und ein Gratis-Video anstossen.
     */
    let walletCents: number | undefined;
    if (paid && s.metadata.kind === "aufladung") {
      /**
       * DIE STRIPE-ADRESSE GEWINNT (Owner 09.08.2026: „das ist die E-Mail, die dann bei der
       * Anmeldung zählt").
       *
       * Vorher zählte die im Trichter getippte Adresse, und die von Stripe war nur der
       * Rückfall. Damit war ein Tippfehler unheilbar: Das Geld lag auf einer Adresse, die es
       * nicht gibt. Jetzt ist es umgekehrt — an der Kasse hat er die Adresse zuletzt in der
       * Hand, dorthin geht die Quittung, und dorthin buchen wir.
       */
      const email = (s.customerEmail || String(s.metadata.email ?? "") || s.clientReferenceId || "").trim().toLowerCase();
      const getippt = String(s.metadata.email ?? "").trim().toLowerCase();
      /**
       * GUTGESCHRIEBEN WIRD, WAS BEZAHLT WURDE (03.08.2026). Vorher zaehlte der BESTELL-
       * Wert aus den Metadaten — mit einem 100%-Gutschein im Kassenfeld hiess das: 0 €
       * bezahlt, 9,99 € Guthaben. Dreimal so passiert (Owner-Test gl123…), und jeder Kunde
       * mit einem kursierenden Code haette dasselbe Loch. `amountTotal` ist Stripes Zahl
       * NACH Rabatt; die Metadaten bleiben nur Rueckfall fuer Alt-Sessions ohne Betrag.
       */
      /**
       * FREIGEGEBENE GUTSCHEINE SCHREIBEN DEN BESTELLWERT GUT (Owner 03.08.2026: „wenn ich mit
       * Gutschein bezahle und tatsaechlich 0 Euro habe, dann muss ich zumindest die
       * Videocredits sehen im Wert von 4,99").
       *
       * Er hat recht, und zwar handelsrechtlich: Ein 100-%-Gutschein IST eine Bezahlung — man
       * hat sie nur selbst verschenkt. Die Regel „gutgeschrieben wird, was bezahlt wurde"
       * bleibt trotzdem der Standard, denn ohne sie ist jeder kursierende Code eine offene
       * Kasse (so entstanden die 9,99 EUR Phantom-Guthaben auf zwei Konten).
       *
       * Die Aufloesung ist eine LISTE: Nur ausdruecklich benannte Codes schreiben den
       * Bestellwert gut, alles andere nur den gezahlten Betrag. Aendern ohne Code-Aenderung
       * ueber `STRIPE_GUTSCHRIFT_CODES` (kommagetrennt, leer = keiner).
       *
       * ACHTUNG, und das gehoert zur Entscheidung dazu: Ein Code auf dieser Liste ist nur so
       * sicher wie seine Stripe-Einstellungen. Der erste stand am 03.08.2026 auf UNBEGRENZT
       * einloesbar, fuer jeden, ohne Ablaufdatum — und war bereits 18-mal benutzt. Wer ihn
       * kennt, holt sich damit beliebig viel Guthaben. Die Grenze gehoert nach Stripe
       * (max_redemptions / customer / expires_at), nicht hierher.
       *
       * KEIN VORGABEWERT MEHR IM QUELLTEXT (Owner 05.08.2026: „Wir verraten nicht den Code").
       * Hier stand der Code als Rueckfall — also lesbar fuer jeden, der das Projekt sieht, und
       * mitgewandert in jede Kopie. Fehlt die Umgebungsvariable, ist die Liste jetzt LEER: dann
       * schreibt jeder Kauf nur den GEZAHLTEN Betrag gut. Das ist der sichere Ausfall — im
       * schlimmsten Fall bekommt der Owner bei einem eigenen Test zu wenig gutgeschrieben,
       * statt dass ein kursierender Code die Kasse oeffnet.
       */
      const gutschriftCodes = String(process.env.STRIPE_GUTSCHRIFT_CODES ?? "")
        .split(",").map(x => x.trim().toUpperCase()).filter(Boolean);
      const freigegeben = !!s.promoCode && gutschriftCodes.includes(s.promoCode);
      const gezahlt = typeof s.amountTotal === "number" ? s.amountTotal : (Number(s.metadata.cents ?? 0) || 999);
      const bestellt = typeof s.amountSubtotal === "number" ? s.amountSubtotal : gezahlt;
      const cents = freigegeben ? Math.max(gezahlt, bestellt) : gezahlt;
      if (email) {
        /* Bezahlt = vertraut (09.08.2026): Dieser Browser darf ab jetzt von diesem Konto
           zahlen. Der einzige Weg auf die Liste — siehe walletGeraetMerken. */
        const geraetAusKasse = String(s.metadata?.device ?? "").trim();
        if (geraetAusKasse) void walletGeraetMerken(email, geraetAusKasse);
        /**
         * LÄUFT DIE ADRESSE AUSEINANDER, ZIEHT DER AUFTRAG NACH: Sonst liegt das Geld auf
         * der korrigierten Adresse und das Video auf der vertippten — der Kauf zerfiele in
         * zwei Hälften, und die Galerie fände nichts.
         */
        if (getippt && getippt !== email) {
          const gid = String(s.metadata.genId ?? "").trim();
          if (gid) void adresseKorrigieren(gid, email);
          console.info("[checkout-status] Adresse an der Kasse korrigiert:", getippt, "→", email);
        }
        /**
         * DIE BESTÄTIGUNG GEHT AN DIE ADRESSE, AUF DIE GEBUCHT WURDE (Owner 09.08.2026:
         * „dann wird nach der Zahlung eine E-Mail an die Adresse geschickt zumindest und die
         * Adresse ist dann 100 % sicher").
         *
         * Ganz sicher ist sie damit nicht — Stripe prüft die Adresse nicht, es schickt nur
         * die Quittung dorthin. Aber es sind zwei Chancen statt einer: Er sieht sie an der
         * Kasse noch einmal, und kommt diese Mail als unzustellbar zurück, weiss es der
         * Rückläufer-Leser (Memory `ruecklaeufer-leser`) — dann liegt kein Geld stumm auf
         * einer Adresse, die es nicht gibt.
         *
         * NUR BEIM ERSTEN MAL: Der Browser fragt den Status in einer Schleife ab; ohne
         * `granted` bekäme er bei jedem Durchlauf eine Mail.
         */
        try {
          const auf = await guthabenAufladen(email, sessionId, cents);
          walletCents = auf.cents;
          if (auf.granted) void guthabenMailSchicken(new URL(request.url).origin, email, cents, auf.cents);
        }
        catch (e) { console.warn("[checkout-status] Aufladung fehlgeschlagen", e); }
      }
      return NextResponse.json({
        paid, topup: true, kind: "aufladung",
        email: (s.customerEmail || String(s.metadata.email ?? "") || "").trim().toLowerCase() || undefined,
        ...(walletCents !== undefined ? { walletCents } : {}),
        /**
         * WAS DIESE ZAHLUNG WERT WAR (Owner 07.08.2026: „wieso bekomme ich keine Meldung,
         * nicht genügend Credit?"). Bei einem 100-%-Code ist `paid` wahr und trotzdem 0
         * gutgeschrieben — ohne diese Zahl kann der Trichter das dem Kunden nicht sagen,
         * und er sieht nur denselben Wähler wieder. Der Kontostand allein reicht nicht:
         * `walletCents` sagt WO er steht, nicht WARUM sich nichts bewegt hat.
         */
        gutgeschrieben: cents,
      });
    }

    /**
     * DER LUXURYBANDIT-GUTSCHEIN — das Guthaben geht an den BESCHENKTEN (Owner 05.08.2026:
     * „Credits? Warum nicht.").
     *
     * Ein eigener Zweig und nicht der Aufladungs-Block darüber, weil dort die Adresse des
     * KÄUFERS gutgeschrieben wird. Hier steht die des Empfängers im Kassenvermerk, den die
     * Kasse gesetzt hat — nicht der Browser. Genau deshalb ist er hier sicher: Ein Client, der
     * seine eigene Adresse hineinschreiben könnte, würde sich selbst Geld schenken.
     *
     * `guthabenAufladen` ist idempotent über die Sitzungskennung. Der Browser fragt den
     * Zahlungsstatus in einer Schleife ab; ohne diese Sperre schriebe jede Antwort erneut gut.
     *
     * UND HIER GILT DIE GUTSCHRIFT-CODE-AUSNAHME BEWUSST NICHT. Der Block oben schreibt bei
     * einem freigegebenen Gutschrift-Code den BESTELLWERT gut statt des gezahlten Betrags.
     * Auf einer Kasse, die auf eine FREMDE Adresse auflädt, wäre das eine Geldpresse: Wer den
     * Code kennt, schenkt sich über eine Zweitadresse beliebig viel Guthaben und lässt sich
     * nicht einmal mehr am eigenen Konto erkennen. Verschenkt der Owner selbst etwas, geht das
     * über das Admin-Werkzeug (serverseitig, angemeldet) — nicht über einen Code, der im Netz
     * kursieren kann.
     */
    if (paid && s.metadata.kind === "gutschein") {
      const empfaenger = String(s.metadata.empfaenger ?? "").trim().toLowerCase();
      const cents = typeof s.amountTotal === "number" ? s.amountTotal : Number(s.metadata.cents ?? 0) || 0;
      let gutscheinCents: number | undefined;
      if (empfaenger && cents > 0) {
        try { gutscheinCents = (await guthabenAufladen(empfaenger, sessionId, cents)).cents; }
        catch (e) { console.warn("[checkout-status] Gutschein fehlgeschlagen", e); }
      }
      return NextResponse.json({
        paid, kind: "gutschein", empfaenger: empfaenger || undefined, cents,
        /* Das Thema des Topic-Gutscheins — der Trichter zeigt damit die Bestätigung an. */
        topic: String(s.metadata.topic ?? "") || undefined,
        ...(gutscheinCents !== undefined ? { walletCents: gutscheinCents } : {}),
      });
    }

    const kissGenId = String(s.metadata.genId ?? "").trim();
    /**
     * DER PROGRAMM-LINK NACH DER RÜCKKEHR VON STRIPE (11.08.2026, Owner: „wo ist der link
     * zum plan?"). `bezahltVermerken` legt die Programm-Datei GENAU beim Bezahl-Stempel an
     * (nur Thema „versprechen") — `futureProgramUrl` danach liefert also nur dann etwas,
     * wenn dieser Kauf wirklich einer war. Kein Fehler soll den Rückweg zum Kunden blockieren.
     */
    let programUrl: string | undefined;
    if (paid && kissGenId) {
      try {
        /**
         * DIE ADRESSE AUS DEM TRICHTER SCHLAEGT DIE AUS DER KASSE (Owner 03.08.2026: „hier
         * kann ein Fehler passieren").
         *
         * Seit die Kasse mit `customer_email` vorbelegt und gesperrt wird, sind beide fast
         * immer gleich. Fast: Alt-Sitzungen und der Abo-Weg tragen die Sperre nicht. Und wenn
         * sie auseinandergehen, ist die Trichter-Adresse die richtige — sie ist die, unter
         * der sein Guthaben liegt und unter der die Galerie sucht.
         */
        /* Auch hier gewinnt die Adresse von der Kasse — siehe oben. */
        const kaeufer = (String(s.customerEmail ?? "").trim() || String(s.metadata.email ?? "").trim()).toLowerCase();
        await bezahltVermerken(kissGenId, kaeufer, String(s.metadata.kind ?? ""));
        lieferungAnstossen(new URL(request.url).origin, kissGenId);
        programUrl = await futureProgramUrl(new URL(request.url).origin, kissGenId).catch(() => undefined);
      } catch { /* Log ist Best-effort — die Freischaltung beim Kunden blockiert das nie */ }
    }

    // Model paid $3.99 for one more video → grant 1 credit to her email (idempotent).
    if (paid && s.metadata.kind === "model-video") {
      const email = (s.metadata.email || s.clientReferenceId || s.customerEmail || "").trim().toLowerCase();
      if (email) {
        const res = await grantVideoCredits(email, sessionId, 1);
        credits = res.credits;
      }
    }

    // Fan paid $3.99 for a 30-min chat pass → credit the influencer's OWNER 30% (idempotent
    // via the shared redeemed-session list). The client activates the 30-min pass on `paid`.
    let chatPassCuratorId = "";
    if (paid && s.metadata.kind === "chat-pass") {
      const curatorId = String(s.metadata.curatorId ?? s.clientReferenceId ?? "").trim();
      if (curatorId) {
        chatPassCuratorId = curatorId;
        const st = await readTryThisLookState();
        const vc = (st.videoCredits = st.videoCredits ?? { balances: {}, redeemed: [] });
        vc.redeemed = vc.redeemed ?? [];
        if (!vc.redeemed.includes(sessionId)) {
          const cur = (st.curators ?? []).find(c => c.id === curatorId) as { earningsCents?: number } | undefined;
          if (cur) {
            const sharePct = Number(process.env.MODEL_EARNING_SHARE_PCT ?? 30) || 30;
            cur.earningsCents = (cur.earningsCents ?? 0) + Math.round(399 * sharePct / 100);
          }
          vc.redeemed.push(sessionId);
          await saveTryThisLookState(st);
        }
      }
    }

    // Buyer paid the (dynamic) price to OWN an influencer → transfer ownership: set her
    // ownerEmail + purchasedAt = now (her appreciation restarts). Idempotent per session id.
    let boughtCuratorId = "", boughtOwnerEmail = "";
    if (paid && s.metadata.kind === "buy-influencer") {
      const curatorId = String(s.metadata.curatorId ?? "").trim();
      const buyer = (s.clientReferenceId || s.customerEmail || "").trim().toLowerCase();
      if (curatorId && buyer) {
        const st = await readTryThisLookState();
        const vc = (st.videoCredits = st.videoCredits ?? { balances: {}, redeemed: [] });
        vc.redeemed = vc.redeemed ?? [];
        const cur = (st.curators ?? []).find(c => c.id === curatorId) as any;
        if (cur && !vc.redeemed.includes(sessionId)) {
          // Only claim if still unowned (or already this buyer) — never steal an owned model.
          if (!cur.ownerEmail || cur.ownerEmail === buyer) {
            cur.ownerEmail = buyer;
            cur.purchasedAt = new Date().toISOString();
          }
          vc.redeemed.push(sessionId);
          await saveTryThisLookState(st);
        }
        if (cur) { boughtCuratorId = curatorId; boughtOwnerEmail = String(cur.ownerEmail ?? ""); }
      }
    }

    // Fan paid to SUPER FOLLOW → record the follow (→ +$1 to her LB-Value) + credit her owner.
    // Idempotent per session id AND per (follower × influencer) so it can't double-add.
    let superFollowCuratorId = "";
    if (paid && s.metadata.kind === "super-follow") {
      const curatorId = String(s.metadata.curatorId ?? "").trim();
      const followerId = String(s.metadata.followerId ?? s.clientReferenceId ?? "").trim();
      if (curatorId && followerId) {
        superFollowCuratorId = curatorId;
        const st = await readTryThisLookState();
        const vc = (st.videoCredits = st.videoCredits ?? { balances: {}, redeemed: [] });
        vc.redeemed = vc.redeemed ?? [];
        if (!vc.redeemed.includes(sessionId)) {
          // Super Follow uses the shared $4.99/mo membership — record the follow (→ +$1 to her
          // LB-Value + unlocks her private videos for this fan). Membership revenue is platform.
          const follows = (st.follows = st.follows ?? []);
          const already = follows.some((f: any) => f.followeeType === "user" && f.followeeSlug === curatorId && f.followerId === followerId);
          if (!already) {
            follows.push({ id: `follow-${sessionId}`, followerId, followeeSlug: curatorId, followeeType: "user", createdAt: new Date().toISOString() } as any);
          }
          vc.redeemed.push(sessionId);
          await saveTryThisLookState(st);
        }
      }
    }

    return NextResponse.json({
      paid,
      // E-Mail der Zahlung: damit die Seite den Kunden nach der Rückkehr kennt und ihn
      // seinem Guthaben zuordnen kann (er hat sich ja nirgends angemeldet).
      email: (s.customerEmail || s.clientReferenceId || "").trim().toLowerCase() || undefined,
      status: s.status,
      tier: s.metadata.tier ?? "",
      lookId: s.metadata.lookId ?? "",
      kind: s.metadata.kind ?? "",
      ...(chatPassCuratorId ? { chatPassCuratorId } : {}),
      ...(boughtCuratorId ? { boughtCuratorId, boughtOwnerEmail } : {}),
      ...(superFollowCuratorId ? { superFollowCuratorId } : {}),
      ...(credits !== undefined ? { credits } : {}),
      ...(programUrl ? { programUrl } : {}),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not verify payment." }, { status: 502 });
  }
}
