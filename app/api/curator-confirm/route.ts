import crypto from "crypto";
import { readTryThisLookState, saveTryThisLookState } from "@/lib/try-this-look-store";
import { notifyAdminWhatsApp } from "@/lib/notify-admin";

export const runtime = "nodejs";

// One-click model consent link (from the onboarding email). Records that she's confirmed the
// 18+ / lingerie terms. Token = HMAC(email) so only the person who got the email can confirm.
function tokenFor(email: string): string {
  const secret = process.env.TRY_THIS_LOOK_ADMIN_PIN || "luxurybandit";
  return crypto.createHmac("sha256", secret).update(email.trim().toLowerCase()).digest("hex").slice(0, 24);
}

function page(title: string, body: string): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;background:#0d0b0a;color:#fff;font-family:system-ui,-apple-system,sans-serif;"><div style="max-width:440px;margin:0 auto;padding:64px 24px;text-align:center;"><div style="font-size:22px;font-weight:900;letter-spacing:2px;color:#e7c877;margin-bottom:32px;">LUXURYBANDIT</div>${body}</div></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = (url.searchParams.get("e") || "").trim().toLowerCase();
  const token = url.searchParams.get("t") || "";
  if (!email || token !== tokenFor(email)) {
    return page("Invalid link", `<h1 style="font-size:22px;">This link isn't valid</h1><p style="color:#cdc7be;line-height:1.6;">Please open the exact link from your email, or reply to support.</p>`);
  }
  try {
    const state = await readTryThisLookState();
    const cur = (state.curators ?? []).find((c) => (c.email ?? "").toLowerCase() === email);
    if (cur) {
      (cur as { lingerieConsent?: boolean }).lingerieConsent = true;
      (cur as { consentAt?: string }).consentAt = new Date().toISOString();
      await saveTryThisLookState(state);
    }
    const who = cur ? [cur.firstName, cur.lastName].filter(Boolean).join(" ") || email : email;
    notifyAdminWhatsApp(`✓ ${who} confirmed the 18+/lingerie terms — review her photos & re-activate her profile.`);
  } catch { /* best-effort */ }
  return page("Thank you", `<h1 style="font-size:24px;font-weight:900;">Thank you! 💛</h1><p style="color:#cdc7be;font-size:15px;line-height:1.65;">Your confirmation is saved. Our team will review your photos and <b style="color:#e7c877;">activate your profile</b> shortly.</p><p style="margin-top:22px;"><a href="https://luxurybandit.com/curators/profile" style="display:inline-block;background:#e7c877;color:#000;text-decoration:none;font-weight:800;padding:13px 28px;border-radius:999px;">Complete my profile →</a></p>`);
}
