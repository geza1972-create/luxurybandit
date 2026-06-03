import { getAccountId, getCreditStatus } from "@/lib/billing";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return NextResponse.json(getCreditStatus(getAccountId(request)));
}
