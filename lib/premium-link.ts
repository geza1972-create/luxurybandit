// The hosted Stripe Payment Link for the Premium subscription ($49/mo, first month $8 via
// the built-in coupon). Override with NEXT_PUBLIC_STRIPE_PREMIUM_LINK without a code change.
export const PREMIUM_CHECKOUT_LINK =
  process.env.NEXT_PUBLIC_STRIPE_PREMIUM_LINK?.trim() || "https://buy.stripe.com/eVq8wHcFS2toguC3VicIE01";

// Tie the checkout to the signed-in email so we can look the subscription up afterwards
// (hasActiveSubscription) and top up the monthly video credits.
export function premiumCheckoutUrl(email?: string): string {
  try {
    const u = new URL(PREMIUM_CHECKOUT_LINK);
    if (email) {
      u.searchParams.set("prefilled_email", email);
      u.searchParams.set("client_reference_id", email);
    }
    return u.toString();
  } catch {
    return PREMIUM_CHECKOUT_LINK;
  }
}
