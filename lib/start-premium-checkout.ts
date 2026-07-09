// Start the Premium subscription checkout via the API path (POST /api/premium), which builds
// a Stripe Checkout Session with the first-month $8 coupon applied (discounts:[{coupon}]).
// The hosted Payment Link did NOT apply the coupon (it charged the full $49 today), so all
// checkout entry points go through here instead. Redirects the browser to Stripe on success.
export async function startPremiumCheckout(email: string, returnPath = "/stores", allowPromo = false): Promise<void> {
  const res = await fetch("/api/premium", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // allowPromo=true → checkout shows a promo-code field instead of the auto $8 coupon
    // (used to redeem a 100%-off test code; regular customers get the automatic $8).
    body: JSON.stringify({ email, returnPath, allowPromo }),
  });
  const d = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (res.ok && d.url) { window.location.href = d.url; return; }
  throw new Error(d.error || "Could not start checkout. Please try again.");
}
