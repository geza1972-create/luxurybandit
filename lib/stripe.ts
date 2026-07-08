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
export async function createTryonCheckout(opts: {
  amount: number;          // minor units (cents)
  currency: string;
  productName: string;
  successUrl: string;      // may contain the literal {CHECKOUT_SESSION_ID} placeholder
  cancelUrl: string;
  metadata: Record<string, string>;
  clientReferenceId?: string;
}): Promise<{ id: string; url: string }> {
  const session = await stripeRequest("POST", "/checkout/sessions", {
    mode: "payment",
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    client_reference_id: opts.clientReferenceId,
    line_items: [
      {
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
  return { id: String(session.id), url: String(session.url) };
}

// One-time credit-pack checkout (the $8 → 4 videos pack). Ties the buyer's email so
// checkout-status can grant the credits on return.
export async function createPackCheckout(opts: {
  amount: number;          // minor units (cents)
  currency: string;
  productName: string;
  email?: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}): Promise<{ id: string; url: string }> {
  const session = await stripeRequest("POST", "/checkout/sessions", {
    mode: "payment",
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    ...(opts.email ? { customer_email: opts.email, client_reference_id: opts.email } : {}),
    line_items: [{ quantity: 1, price_data: { currency: opts.currency, unit_amount: opts.amount, product_data: { name: opts.productName } } }],
    allow_promotion_codes: true,
    metadata: opts.metadata,
    payment_intent_data: { metadata: opts.metadata },
  });
  return { id: String(session.id), url: String(session.url) };
}

// Create a recurring-subscription Checkout Session (Premium membership). Ties the
// subscription to the customer's email so we can look it up later.
export async function createSubscriptionCheckout(opts: {
  priceId: string;
  email?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}): Promise<{ id: string; url: string }> {
  const session = await stripeRequest("POST", "/checkout/sessions", {
    mode: "subscription",
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    ...(opts.email ? { customer_email: opts.email } : {}),
    client_reference_id: opts.email,
    line_items: [{ price: opts.priceId, quantity: 1 }],
    allow_promotion_codes: true,
    metadata: { kind: "premium", ...(opts.metadata ?? {}) },
    subscription_data: { metadata: { kind: "premium", ...(opts.metadata ?? {}) } },
  });
  return { id: String(session.id), url: String(session.url) };
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
  clientReferenceId: string;
  customerEmail: string;
}> {
  const s = await stripeRequest("GET", `/checkout/sessions/${encodeURIComponent(id)}`);
  return {
    paymentStatus: String(s.payment_status ?? ""),
    status: String(s.status ?? ""),
    metadata: (s.metadata ?? {}) as Record<string, string>,
    amountTotal: typeof s.amount_total === "number" ? s.amount_total : null,
    clientReferenceId: String(s.client_reference_id ?? ""),
    customerEmail: String(s.customer_details?.email ?? s.customer_email ?? ""),
  };
}
