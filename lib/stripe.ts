// Minimal Stripe client over raw HTTP (Stripe's REST API is form-encoded). We avoid
// the `stripe` npm package on purpose — one less dependency to install, and it matches
// the hand-rolled webhook-signature verification already in app/api/stripe-webhook.
//
// Requires env: STRIPE_SECRET_KEY (sk_test_… / sk_live_…). Optional: STRIPE_WEBHOOK_SECRET.

const STRIPE_API = "https://api.stripe.com/v1";

function secretKey(): string {
  const k = process.env.STRIPE_SECRET_KEY?.trim();
  if (!k) throw new Error("STRIPE_SECRET_KEY is not set.");
  return k;
}

export function stripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY?.trim();
}

// Flatten a nested object into Stripe's bracketed form-encoding, e.g.
// { line_items: [{ quantity: 1 }] } → line_items[0][quantity]=1
function toForm(obj: Record<string, unknown>, prefix = "", form = new URLSearchParams()): URLSearchParams {
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    const field = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (item && typeof item === "object") toForm(item as Record<string, unknown>, `${field}[${i}]`, form);
        else form.append(`${field}[${i}]`, String(item));
      });
    } else if (value && typeof value === "object") {
      toForm(value as Record<string, unknown>, field, form);
    } else {
      form.append(field, String(value));
    }
  }
  return form;
}

async function stripeRequest(method: "GET" | "POST", path: string, body?: Record<string, unknown>) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body ? toForm(body).toString() : undefined,
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (json as any)?.error?.message || `Stripe error ${res.status}`;
    throw new Error(msg);
  }
  return json as any;
}

// Create a one-off Checkout Session for a single try-on tier. Returns the hosted
// checkout URL to redirect the customer to.
/**
 * DIE SIEBEN HAUSSPRACHEN, WIE STRIPE SIE SCHREIBT (15.08.2026). Alles Unbekannte gibt "" —
 * dann bleibt Stripe bei `auto` und folgt wie bisher dem Browser. EINE Liste fuer beide
 * Kassen, damit die achte Sprache nicht an einer davon vorbeigeht.
 */
function stripeSprache(sprache?: string): string {
  const l = String(sprache ?? "").trim().toLowerCase();
  return ["en", "de", "ro", "es", "fr", "pt", "it"].includes(l) ? l : "";
}

export async function createTryonCheckout(opts: {
  amount: number;          // minor units (cents)
  currency: string;
  productName: string;
  successUrl: string;      // may contain the literal {CHECKOUT_SESSION_ID} placeholder
  cancelUrl: string;
  metadata: Record<string, string>;
  clientReferenceId?: string;
  /**
   * DIE ADRESSE, DIE WIR SCHON KENNEN (Owner 03.08.2026: „ich versteh nicht warum ich in
   * Stripe noch mal die Email angeben muss, hier kann ein Fehler passieren").
   *
   * Er hat recht, und der Fehler ist teuer: Guthaben, bezahlte Auftraege und die Galerie
   * haengen alle an einer E-Mail. Tippt jemand an der Kasse eine ANDERE als im Trichter,
   * zerfaellt sein Kauf in zwei Haelften — das Geld auf der einen Adresse, das Video auf der
   * anderen, und die Galerie findet nichts.
   *
   * `customer_email` fuellt das Feld nicht nur vor, Stripe sperrt es dann auch: Es GIBT den
   * Tippfehler danach nicht mehr. Bleibt leer, wenn wir ihn wirklich nicht kennen — dann
   * fragt Stripe wie bisher.
   */
  email?: string;
  /**
   * EINE IM STRIPE-KONTO ANGELEGTE PREIS-KENNUNG statt eines hier zusammengebauten Betrags
   * (Owner 03.08.2026, zum Tanz-Video: „price_1U0LHX1jPNCWoiztjZ7uM8x6 nimm das").
   *
   * Vorteil: Produktname, Steuerverhalten und Betrag stehen dann DORT, wo der Owner sie auch
   * sieht und aendern kann — statt in zwei Codezeilen. `createPackCheckout` macht es seit
   * jeher so; hier fehlte es nur.
   *
   * Gefahr, und deshalb steht sie hier: Der Betrag im Konto und `amount` koennen
   * auseinanderlaufen. Wer eine Kennung setzt, muss den Betrag in lib/pricing.ts danebenhalten
   * — der Kunde liest den einen und zahlt den anderen. Beim Chat-Preis war genau das der Fall
   * (Produkt „14,99 €", Preis 14,00). Fuer diese Kennung nachgeschlagen und geprueft:
   * 399 Cent, one_time, aktiv, Steuer inklusive — passt zu POLEDANCE_CENTS.
   */
  priceId?: string;
  /**
   * DIE KASSE IN UNSERER SEITE (Owner 15.08.2026: „mir stinkt es mit stripe pop up fenster" ·
   * „wir müssen das in die seite einbauen").
   *
   * Mit `eingebettet` liefert Stripe statt einer Adresse ein `client_secret`; das Formular
   * rendert dann `components/KasseImFenster.tsx` MITTEN IN der Seite. Der Kunde verlaesst sie
   * nie — kein Popup, kein Seitenwechsel, kein Zurueckfinden aus einer WebView.
   *
   * DER WERT HEISST `embedded_page`, NICHT `embedded` (15.08.2026, an Stripes eigener
   * Fehlermeldung im laufenden Trichter abgelesen: „The ui_mode value `embedded` is no longer
   * supported. Use `embedded_page` instead."). Stripe hat ihn umbenannt; jede aeltere Anleitung
   * im Netz nennt noch den alten.
   *
   * `success_url`/`cancel_url` sind dabei VERBOTEN, Stripe weist die Sitzung sonst ab. An
   * ihre Stelle tritt `return_url`, auf die Stripe NACH der Zahlung die oberste Seite
   * schickt — mit `{CHECKOUT_SESSION_ID}` darin. Damit greift der bestehende `cs`-Rueckweg
   * in den Trichtern unveraendert weiter; daran musste nichts angefasst werden.
   */
  eingebettet?: boolean;
  /**
   * DIE KASSE SPRICHT DIE SPRACHE DER SEITE (Owner 15.08.2026: „ich hoffe dass es nicht bei
   * allen auf deutsch ist" — zum Bild einer deutschen Kasse unter einer englischen Seite).
   *
   * Ohne diesen Wert steht Stripe auf `locale: auto` und folgt dem BROWSER. Das ist genau
   * daneben: Unsere Seite hat einen eigenen Sprachschalter (sieben Sprachen), und wer auf
   * Rumaenisch liest, aber einen englischen Browser hat, bekaeme an der Kasse Englisch —
   * ausgerechnet an der Stelle, an der Vertrauen ueber den Kauf entscheidet.
   *
   * Alle sieben Haussprachen kennt Stripe unter genau diesen Kuerzeln; alles Unbekannte
   * faellt still auf `auto` zurueck, also auf das bisherige Verhalten.
   */
  sprache?: string;
}): Promise<{ id: string; url: string; clientSecret?: string }> {
  const locale = stripeSprache(opts.sprache);
  const session = await stripeRequest("POST", "/checkout/sessions", {
    mode: "payment",
    ...(locale ? { locale } : {}),
    ...(opts.eingebettet
      ? { ui_mode: "embedded_page", return_url: opts.successUrl }
      : { success_url: opts.successUrl, cancel_url: opts.cancelUrl }),
    ...(opts.email ? { customer_email: opts.email } : {}),
    client_reference_id: opts.clientReferenceId ?? opts.email,
    // GUTSCHEINFELD AUCH BEIM EINMALKAUF (Owner 30.07.2026: „warum kann ich hier meinen
    // Gutschein nicht eingeben"). Beim Abo gab es das Feld laengst, hier nie —
    // er konnte seinen eigenen Code also nicht einmal zum Testen benutzen.
    allow_promotion_codes: true,
    line_items: [
      opts.priceId
        ? { price: opts.priceId, quantity: 1 }
        : {
            quantity: 1,
            price_data: {
              currency: opts.currency,
              unit_amount: opts.amount,
              product_data: { name: opts.productName },
            },
          },
    ],
    // Marks these as per-try-on payments so the (credits-oriented) webhook ignores them.
    metadata: { kind: "tryon", ...opts.metadata },
    // Make the tier/look available on the PaymentIntent too (useful for reconciliation).
    payment_intent_data: { metadata: { kind: "tryon", ...opts.metadata } },
  });
  return {
    id: String(session.id),
    /* Bei der eingebetteten Kasse gibt es keine Adresse — dann bleibt das Feld leer und der
       Aufrufer nimmt `clientSecret`. */
    url: String(session.url ?? ""),
    ...(session.client_secret ? { clientSecret: String(session.client_secret) } : {}),
  };
}

// One-time credit-pack checkout (the $8 → 4 videos pack). Ties the buyer's email so
// checkout-status can grant the credits on return.
export async function createPackCheckout(opts: {
  priceId?: string;        // a Stripe Price id — preferred; overrides amount/currency/productName
  amount?: number;         // minor units (cents) — used only when priceId is not given
  currency?: string;
  productName?: string;
  email?: string;
  clientReferenceId?: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
  /** Kasse IN der Seite statt Seitenwechsel — siehe `createTryonCheckout` (15.08.2026). */
  eingebettet?: boolean;
  /** Sprache der SEITE, nicht des Browsers — siehe `createTryonCheckout` (15.08.2026). */
  sprache?: string;
}): Promise<{ id: string; url: string; clientSecret?: string }> {
  const line_items = opts.priceId
    ? [{ price: opts.priceId, quantity: 1 }]
    : [{ quantity: 1, price_data: { currency: opts.currency ?? "usd", unit_amount: opts.amount ?? 0, product_data: { name: opts.productName ?? "LuxuryBandit" } } }];
  const locale = stripeSprache(opts.sprache);
  const session = await stripeRequest("POST", "/checkout/sessions", {
    mode: "payment",
    ...(locale ? { locale } : {}),
    ...(opts.eingebettet
      ? { ui_mode: "embedded_page", return_url: opts.successUrl }
      : { success_url: opts.successUrl, cancel_url: opts.cancelUrl }),
    ...(opts.email ? { customer_email: opts.email, client_reference_id: opts.email } : (opts.clientReferenceId ? { client_reference_id: opts.clientReferenceId } : {})),
    line_items,
    allow_promotion_codes: true,
    metadata: opts.metadata,
    payment_intent_data: { metadata: opts.metadata },
  });
  return {
    id: String(session.id),
    url: String(session.url ?? ""),
    ...(session.client_secret ? { clientSecret: String(session.client_secret) } : {}),
  };
}

// Create a recurring-subscription Checkout Session (Premium membership). Ties the
// subscription to the customer's email so we can look it up later.
export async function createSubscriptionCheckout(opts: {
  priceId?: string;
  /**
   * OHNE DASHBOARD-PRICE (24.08.2026, Lebenslauf-Abo 4,99/Monat): `price_data` baut den
   * Monatspreis inline — dieselbe Alternative, die der Einmalkauf oben schon kennt
   * (Zeile mit `price_data` in createCheckout). Entweder `priceId` ODER `amount`+`productName`.
   */
  amount?: number;
  productName?: string;
  currency?: string;
  email?: string;
  successUrl: string;
  cancelUrl: string;
  coupon?: string;          // auto-apply this Stripe coupon (e.g. first-month discount)
  metadata?: Record<string, string>;
}): Promise<{ id: string; url: string }> {
  // Stripe rejects `discounts` together with `allow_promotion_codes` — if we auto-apply
  // a coupon (first month cheaper), don't also show the manual promo-code box.
  const discountFields = opts.coupon
    ? { discounts: [{ coupon: opts.coupon }] }
    : { allow_promotion_codes: true };
  const lineItems = opts.priceId
    ? [{ price: opts.priceId, quantity: 1 }]
    : [{ quantity: 1, price_data: {
        currency: opts.currency ?? "usd",
        unit_amount: opts.amount ?? 0,
        recurring: { interval: "month" },
        product_data: { name: opts.productName ?? "LuxuryBandit subscription" },
      } }];
  const session = await stripeRequest("POST", "/checkout/sessions", {
    mode: "subscription",
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    ...(opts.email ? { customer_email: opts.email } : {}),
    client_reference_id: opts.email,
    line_items: lineItems,
    ...discountFields,
    metadata: { kind: "premium", ...(opts.metadata ?? {}) },
    subscription_data: { metadata: { kind: "premium", ...(opts.metadata ?? {}) } },
  });
  return { id: String(session.id), url: String(session.url) };
}

// Create a Stripe Customer Portal session so the customer can manage/cancel their
// subscription + payment method themselves. Returns null if no Stripe customer exists.
export async function createBillingPortalSession(email: string, returnUrl: string): Promise<{ url: string } | null> {
  const e = email.trim().toLowerCase();
  if (!e) return null;
  const custs = await stripeRequest("GET", `/customers?email=${encodeURIComponent(e)}&limit=1`);
  const customer = Array.isArray(custs?.data) ? custs.data[0] : null;
  if (!customer?.id) return null;
  const session = await stripeRequest("POST", "/billing_portal/sessions", {
    customer: String(customer.id),
    return_url: returnUrl,
  });
  const url = session?.url ? String(session.url) : "";
  return url ? { url } : null;
}

// List current subscribers (active/trialing/past_due) with their email + status + amount,
// for the admin "who's subscribed" view. One Stripe call (customer expanded).
export async function listSubscribers(): Promise<Array<{ email: string; status: string; created: number; currentPeriodEnd: number; amount: number; currency: string }>> {
  const res = await stripeRequest("GET", `/subscriptions?status=all&limit=100&expand[]=data.customer`);
  const data: any[] = Array.isArray(res?.data) ? res.data : [];
  return data
    .filter((s) => ["active", "trialing", "past_due"].includes(String(s.status)))
    .map((s) => {
      const cust = s.customer && typeof s.customer === "object" ? s.customer : null;
      const item = Array.isArray(s.items?.data) ? s.items.data[0] : null;
      return {
        email: String(cust?.email ?? "").trim().toLowerCase(),
        status: String(s.status),
        created: Number(s.created ?? 0),
        currentPeriodEnd: Number(s.current_period_end ?? 0),
        amount: Number(item?.price?.unit_amount ?? 0),
        currency: String(item?.price?.currency ?? "usd"),
      };
    })
    .filter((x) => x.email)
    .sort((a, b) => b.created - a.created);
}

// Is this email a paying member? Source of truth = Stripe: find the customer(s) by
// email, then check for any active/trialing/past_due subscription.
export async function hasActiveSubscription(email: string): Promise<boolean> {
  const e = email.trim().toLowerCase();
  if (!e) return false;
  const custs = await stripeRequest("GET", `/customers?email=${encodeURIComponent(e)}&limit=100`);
  const customers: any[] = Array.isArray(custs?.data) ? custs.data : [];
  for (const c of customers) {
    const subs = await stripeRequest("GET", `/subscriptions?customer=${encodeURIComponent(String(c.id))}&status=all&limit=100`);
    const list: any[] = Array.isArray(subs?.data) ? subs.data : [];
    if (list.some((s) => ["active", "trialing", "past_due"].includes(String(s.status)))) return true;
  }
  return false;
}

// Read a Checkout Session to confirm payment on return from Stripe.
export async function getCheckoutSession(id: string): Promise<{
  paymentStatus: string;   // "paid" | "unpaid" | "no_payment_required"
  status: string;          // "open" | "complete" | "expired"
  metadata: Record<string, string>;
  amountTotal: number | null;
  /** Der BESTELLWERT vor Rabatt — bei einem 100-%-Gutschein ist `amountTotal` null/0. */
  amountSubtotal: number | null;
  /** Der eingeloeste Aktionscode im Klartext (der eingetippte Code), falls einer benutzt wurde. */
  promoCode: string;
  clientReferenceId: string;
  customerEmail: string;
}> {
  /**
   * ZWEI AUFRUFE STATT EINES TIEFEN `expand` — Stripe erlaubt hoechstens VIER Ebenen.
   *
   * Der erste Versuch expandierte `total_details.breakdown.discounts.discount.promotion_code`
   * (fuenf) und bekam dafuer einen FEHLER zurueck. Das war kein Schoenheitsfehler: Diese
   * Funktion beantwortet JEDE Rueckkehr von der Kasse — mit dem Fehler war der ganze
   * Zahlweg tot, fuer jeden Kunden, nicht nur fuer Gutscheine.
   *
   * Jetzt vier Ebenen (erlaubt) fuer den Rabatt, und die Kennung des Aktionscodes wird bei
   * Bedarf einzeln aufgeloest. Der zweite Aufruf passiert nur, wenn ueberhaupt ein Gutschein
   * im Spiel war — der Normalfall kostet nichts.
   */
  const s = await stripeRequest("GET",
    `/checkout/sessions/${encodeURIComponent(id)}?expand[]=total_details.breakdown`);
  const rabatte = (s.total_details?.breakdown?.discounts ?? []) as Array<{ discount?: { promotion_code?: string } }>;
  const promoId = rabatte.map(d => String(d?.discount?.promotion_code ?? "")).find(Boolean) ?? "";
  let code = "";
  if (promoId) {
    try {
      const pc = await stripeRequest("GET", `/promotion_codes/${encodeURIComponent(promoId)}`);
      code = String(pc?.code ?? "");
    } catch { /* Code nicht aufloesbar → gilt als nicht freigegeben, also nur der Zahlbetrag */ }
  }
  return {
    paymentStatus: String(s.payment_status ?? ""),
    status: String(s.status ?? ""),
    metadata: (s.metadata ?? {}) as Record<string, string>,
    amountTotal: typeof s.amount_total === "number" ? s.amount_total : null,
    amountSubtotal: typeof s.amount_subtotal === "number" ? s.amount_subtotal : null,
    promoCode: String(code).trim().toUpperCase(),
    clientReferenceId: String(s.client_reference_id ?? ""),
    customerEmail: String(s.customer_details?.email ?? s.customer_email ?? ""),
  };
}

// ── Themen-Abos eines Nutzers ────────────────────────────────────────────────────────
// Jedes Thema ist ein EIGENES Abo zu 24 €/Monat (Owner-Regel): wer Wetter und Kuss will,
// hat zwei Abos und zahlt zweimal. Deshalb hier eine LISTE pro Kunde, keine Ja/Nein-Frage.
// Quelle der Wahrheit ist Stripe — kein Spiegel in einer JSON-Datei, der veralten kann.
export type TopicSubscription = {
  id: string;
  topic: string;            // metadata.topic oder aus kind abgeleitet ("wetter-abo" → "wetter")
  kind: string;             // metadata.kind, so wie der Checkout es gesetzt hat
  status: string;
  amount: number;           // Cent
  currency: string;
  currentPeriodEnd: number; // Unix-Sekunden
  cancelAtPeriodEnd: boolean;
  created: number;
};

export async function listTopicSubscriptions(email: string): Promise<TopicSubscription[]> {
  const e = email.trim().toLowerCase();
  if (!e) return [];
  const custs = await stripeRequest("GET", `/customers?email=${encodeURIComponent(e)}&limit=100`);
  const customers: any[] = Array.isArray(custs?.data) ? custs.data : [];
  const out: TopicSubscription[] = [];
  for (const c of customers) {
    const subs = await stripeRequest("GET", `/subscriptions?customer=${encodeURIComponent(String(c.id))}&status=all&limit=100`);
    for (const s of (Array.isArray(subs?.data) ? subs.data : []) as any[]) {
      if (!["active", "trialing", "past_due"].includes(String(s.status))) continue;
      const item = Array.isArray(s.items?.data) ? s.items.data[0] : null;
      const kind = String(s.metadata?.kind ?? "");
      out.push({
        id: String(s.id),
        topic: String(s.metadata?.topic ?? kind.replace(/-abo$/, "") ?? ""),
        kind,
        status: String(s.status),
        amount: Number(item?.price?.unit_amount ?? 0),
        currency: String(item?.price?.currency ?? "eur"),
        currentPeriodEnd: Number(s.current_period_end ?? 0),
        cancelAtPeriodEnd: !!s.cancel_at_period_end,
        created: Number(s.created ?? 0),
      });
    }
  }
  return out.sort((a, b) => b.created - a.created);
}

/** Kündigen ZUM PERIODENENDE — der bezahlte Monat bleibt ihm. */
export async function cancelSubscription(subscriptionId: string): Promise<boolean> {
  const id = subscriptionId.trim();
  if (!id) return false;
  const res = await stripeRequest("POST", `/subscriptions/${encodeURIComponent(id)}`, { cancel_at_period_end: "true" });
  return !!res?.id;
}
