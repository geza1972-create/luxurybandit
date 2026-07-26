import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { readKissConfig, writeKissConfig } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Kiss-Theme-Config: welche Models im Kiss-Funnel-Grid angeboten werden.
// GET (öffentlich) → { modelIds } (leer = alle). POST (admin) → { modelIds } speichern.
export async function GET() {
  const config = await readKissConfig();
  return NextResponse.json(config);
}

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { modelIds?: unknown };
  const modelIds = Array.isArray(body.modelIds) ? body.modelIds.map(String).filter(Boolean) : [];
  await writeKissConfig({ modelIds });
  return NextResponse.json({ ok: true, modelIds });
}
