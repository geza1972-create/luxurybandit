import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { buildBellaCard } from "@/lib/bella-card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin preview of the card for a scope — general (default) or a specific ?customer=email — so the
// Card Studio can SHOW which card is being edited.
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const customer = new URL(request.url).searchParams.get("customer") || "";
  const { card } = await buildBellaCard(customer ? { customer } : { surface: "lp-journey" });
  return NextResponse.json({ card });
}
