import { NextResponse } from "next/server";
import { readWetterStats, bumpWetterStat } from "@/lib/try-this-look-store";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BELLA_ID = "curator-1783683672619-td4cy";
const modelOf = (request: Request) => new URL(request.url).searchParams.get("model")?.trim() || BELLA_ID;

// GET ?model=<id>  (Admin) → aktuelle Statistik (Aufrufe + Chats, pro Tag + Summe).
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const stats = await readWetterStats(modelOf(request));
  return NextResponse.json({ stats }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

// POST { modelId, kind: "view" | "chat" }  (öffentlich) → einen Zähler hochzählen.
// Der Client sendet NICHT, wenn es die Admin-Session ist (kein Verfälschen).
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { modelId?: string; kind?: string };
  const modelId = String(body.modelId ?? "").trim() || BELLA_ID;
  const kind = body.kind === "chat" ? "chat" : "view";
  await bumpWetterStat(kind, modelId);
  return NextResponse.json({ ok: true });
}
