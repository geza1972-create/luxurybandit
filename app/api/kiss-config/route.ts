import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { readKissConfig, writeKissConfig, getSignedUrl, createSignedUploadUrl } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Kiss-Theme-Config: Models im Funnel-Grid, Theme-Teaser-Bild, Beispiel-Videos der Landing.
// GET (öffentlich) → { modelIds, teaserUrl, examples } (signierte URLs, jedes Mal frisch).
// POST (admin) → Patch-Merge: { modelIds } | { sign, kind, ext } | { teaserPath } |
//                { addExample } | { removeExample }.
export async function GET() {
  const config = await readKissConfig();
  const teaserUrl = config.teaserPath ? await getSignedUrl(config.teaserPath).catch(() => "") : "";
  const examples = await Promise.all((config.examplePaths ?? []).map(async p => ({
    path: p,
    url: await getSignedUrl(p).catch(() => ""),
  })));
  return NextResponse.json({ modelIds: config.modelIds, teaserUrl, teaserPath: config.teaserPath ?? "", examples: examples.filter(e => e.url) });
}

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as {
    modelIds?: unknown; sign?: boolean; kind?: "image" | "video"; ext?: string;
    teaserPath?: string; addExample?: string; removeExample?: string;
  };

  // Signierte Upload-URL (Client lädt direkt zu Supabase — kein Vercel-Body-Limit).
  if (body.sign) {
    const folder = body.kind === "video" ? "videos" : "uploads";
    const ext = (String(body.ext ?? "").replace(/[^a-z0-9]/gi, "").toLowerCase() || (body.kind === "video" ? "mp4" : "jpg"));
    const { path, uploadUrl } = await createSignedUploadUrl(folder, ext);
    return NextResponse.json({ path, uploadUrl });
  }

  // Patch-Merge, damit z. B. ein Teaser-Upload nie die Model-Auswahl überschreibt.
  const config = await readKissConfig();
  if (Array.isArray(body.modelIds)) config.modelIds = body.modelIds.map(String).filter(Boolean);
  if (typeof body.teaserPath === "string") {
    const p = body.teaserPath.trim();
    config.teaserPath = p && p.startsWith("try-this-look/") ? p : undefined; // "" = Teaser entfernen
  }
  if (body.addExample && String(body.addExample).startsWith("try-this-look/")) {
    config.examplePaths = [...(config.examplePaths ?? []), String(body.addExample)];
  }
  if (body.removeExample) {
    config.examplePaths = (config.examplePaths ?? []).filter(p => p !== body.removeExample);
  }
  await writeKissConfig(config);
  return NextResponse.json({ ok: true, modelIds: config.modelIds, teaserPath: config.teaserPath ?? "", examplePaths: config.examplePaths ?? [] });
}
