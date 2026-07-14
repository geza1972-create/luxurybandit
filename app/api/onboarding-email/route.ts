import { NextResponse } from "next/server";
import { readTryThisLookState } from "@/lib/try-this-look-store";
import { adminPinMatches } from "@/lib/admin-auth";
import { sendOnboardingEmail } from "@/lib/onboarding-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/onboarding-email { email | curatorId }  (admin only)
// Emails the creator the "your influencer is ready — set your password & open your dashboard"
// onboarding message. The button logs them in and lands them on their dashboard.
export async function POST(request: Request) {
  if (!adminPinMatches(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { email?: string; curatorId?: string };
  const curatorId = String(body.curatorId ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();

  const state = await readTryThisLookState();
  const cur = (state.curators ?? []).find(c =>
    (curatorId && c.id === curatorId) || (email && (c.email ?? "").trim().toLowerCase() === email)
  ) as { email?: string; firstName?: string; lastName?: string; modelName?: string } | undefined;
  if (!cur) return NextResponse.json({ error: "No influencer found." }, { status: 404 });

  const origin = request.headers.get("origin")?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://luxurybandit.com";
  const res = await sendOnboardingEmail(cur, origin);
  if (!res.ok) return NextResponse.json({ ok: false, error: res.error, skipped: res.skipped }, { status: res.skipped ? 503 : 500 });
  return NextResponse.json({ ok: true, sent: true });
}
