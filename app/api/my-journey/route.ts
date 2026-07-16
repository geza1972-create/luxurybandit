import { NextResponse } from "next/server";
import { getSellerFromRequest } from "@/lib/supabase-auth-server";
import { buildBellaCard } from "@/lib/bella-card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The logged-in customer's personal journey card — only the slides created FOR them in the
// Card Studio (plus Bella's general looks behind). Auth via the Supabase Bearer token.
export async function GET(request: Request) {
  const user = await getSellerFromRequest(request);
  if (!user?.email) return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  const { card } = await buildBellaCard({ customer: user.email });
  // No personal slides yet → signal "empty" so the dashboard shows a friendly waiting state.
  const hasContent = !!card && (card.clips?.length ?? 0) > 0;
  return NextResponse.json({ ok: true, email: user.email, card: hasContent ? card : null });
}
