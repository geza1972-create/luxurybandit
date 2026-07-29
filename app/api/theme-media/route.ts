import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { readThemeConfig, writeThemeConfig, getSignedUrl, createSignedUploadUrl } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * MEDIEN EINES THEMAS — Teaser (Cover im /themes-Katalog) + Beispiel-Videos der Landingpage.
 *
 * Dasselbe wie /api/kiss-config, aber für JEDES Thema über `?theme=`. Kiss läuft bewusst
 * weiter über seine eigene Route: was funktioniert, wird nicht angefasst (Owner 29.07.2026).
 *
 * GET  (öffentlich) → { teaserUrl, examples: [{path,url}] } — signierte URLs, jedes Mal frisch
 * POST (admin)      → { sign, kind, ext } | { teaserPath } | { addExample } | { removeExample }
 *
 * VORGABEN: Solange ein Thema noch NIE eingerichtet wurde (`examplePaths` fehlt ganz), liefern
 * wir die Vorgabe-Clips aus DEFAULTS — damit die Seite vom ersten Tag an nicht leer ist. Sobald
 * der Admin etwas hinzufügt oder löscht, steht eine echte Liste in der Datei und die Vorgaben
 * sind aus dem Spiel. Eine LEERE Liste bleibt leer (bewusst alles gelöscht) — genau dafür
 * unterscheidet readThemeConfig zwischen `undefined` und `[]`.
 */

const DEFAULTS: Record<string, string[]> = {
  bella: [
    "try-this-look/videos/holiday-example.mp4",
    "try-this-look/videos/holiday-example-2.mp4",
    "try-this-look/videos/holiday-example-3.mp4",
    "try-this-look/videos/holiday-example-4.mp4",
  ],
};

const themeOf = (request: Request) =>
  (new URL(request.url).searchParams.get("theme") ?? "").trim().replace(/[^a-z0-9-]/gi, "").toLowerCase();

export async function GET(request: Request) {
  const theme = themeOf(request);
  if (!theme) return NextResponse.json({ error: "theme fehlt." }, { status: 400 });

  const config = await readThemeConfig(theme);
  const paths = config.examplePaths ?? DEFAULTS[theme] ?? [];
  const teaserUrl = config.teaserPath ? await getSignedUrl(config.teaserPath).catch(() => "") : "";
  const examples = await Promise.all(paths.map(async p => ({ path: p, url: await getSignedUrl(p).catch(() => "") })));

  return NextResponse.json({
    theme,
    teaserUrl,
    teaserPath: config.teaserPath ?? "",
    examples: examples.filter(e => e.url),
    // `true`, solange die Vorgaben gezeigt werden — die Oberfläche sagt das dem Admin.
    usingDefaults: !config.examplePaths,
  });
}

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const theme = themeOf(request);
  if (!theme) return NextResponse.json({ error: "theme fehlt." }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as {
    sign?: boolean; kind?: "image" | "video"; ext?: string;
    teaserPath?: string; addExample?: string; removeExample?: string;
  };

  // Signierte Upload-Adresse: der Browser lädt DIREKT zu Supabase, sonst greift das
  // ~4,5-MB-Limit von Vercel und jedes echte Video scheitert.
  if (body.sign) {
    const folder = body.kind === "video" ? "videos" : "uploads";
    const ext = String(body.ext ?? "").replace(/[^a-z0-9]/gi, "").toLowerCase() || (body.kind === "video" ? "mp4" : "jpg");
    const { path, uploadUrl } = await createSignedUploadUrl(folder, ext);
    return NextResponse.json({ path, uploadUrl });
  }

  const config = await readThemeConfig(theme);
  // Beim ERSTEN Eingriff werden die Vorgaben zu einer echten Liste — sonst würde das
  // Löschen eines Vorgabe-Clips wirkungslos bleiben, weil er beim nächsten Laden zurückkäme.
  let list = config.examplePaths ?? [...(DEFAULTS[theme] ?? [])];

  if (typeof body.teaserPath === "string") {
    const p = body.teaserPath.trim();
    config.teaserPath = p && p.startsWith("try-this-look/") ? p : undefined;   // "" = entfernen
  }
  if (body.addExample && String(body.addExample).startsWith("try-this-look/")) {
    list = [...list, String(body.addExample)];
  }
  if (body.removeExample) {
    list = list.filter(p => p !== body.removeExample);
  }

  await writeThemeConfig({ ...config, examplePaths: list }, theme);
  return NextResponse.json({ ok: true, teaserPath: config.teaserPath ?? "", examplePaths: list });
}
