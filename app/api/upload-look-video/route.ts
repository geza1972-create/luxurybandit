import { NextResponse } from "next/server";
import { readTryThisLookState, saveTryThisLookState, uploadTryThisLookBytes, getSignedUrl, createSignedUploadUrl } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const maxDuration = 120;

// Auth: valid admin PIN, OR a curator session id that owns the look.
function authorize(request: Request, look: any, curatorId: string): boolean {
  const adminPin = process.env.TRY_THIS_LOOK_ADMIN_PIN?.trim();
  const isAdmin = !!adminPin && request.headers.get("x-try-look-admin-pin") === adminPin;
  return isAdmin || (!!curatorId && curatorId === look?.curatorId);
}

// Curator uploads (or removes) a short video for one of their own looks.
// When set, the feed plays it (muted, looping); the image stays as the poster.
//
// THREE modes, so large clips don't hit Vercel's ~4.5 MB request-body limit:
//   1. JSON { lookId, sign:true, ext }  → returns a signed upload URL; the browser
//      PUTs the file straight to Supabase Storage (no size limit through us).
//   2. JSON { lookId, videoPath }       → attach an already-uploaded path to the look.
//   3. multipart form (video / remove)  → legacy small-file path (< 4.5 MB) + remove.
export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  const curatorHeader = request.headers.get("x-curator-id")?.trim() ?? "";

  // ── JSON modes: sign + attach (tiny requests) ────────────────────────────
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null) as
      | { lookId?: string; sign?: boolean; ext?: string; videoPath?: string }
      | null;
    if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    const lookId = String(body.lookId ?? "").trim();
    if (!lookId) return NextResponse.json({ error: "lookId required." }, { status: 400 });

    const state = await readTryThisLookState();
    const look = state.looks.find((l) => l.id === lookId);
    if (!look) return NextResponse.json({ error: "Look not found." }, { status: 404 });
    if (!authorize(request, look, curatorHeader)) {
      return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    }

    // 1) Hand the browser a signed upload URL for a direct-to-Supabase PUT.
    if (body.sign) {
      try {
        const { path, uploadUrl } = await createSignedUploadUrl("videos", String(body.ext ?? "mp4"));
        return NextResponse.json({ path, uploadUrl });
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "Could not start upload." }, { status: 500 });
      }
    }

    // 2) Attach the already-uploaded file to the look.
    const videoPath = String(body.videoPath ?? "").trim();
    if (!videoPath) return NextResponse.json({ error: "videoPath required." }, { status: 400 });
    if (!videoPath.startsWith("try-this-look/")) return NextResponse.json({ error: "Bad path." }, { status: 400 });
    const url = await getSignedUrl(videoPath);
    if (!url) return NextResponse.json({ error: "Could not sign the uploaded video." }, { status: 500 });
    (look as any).videoUrl = url;
    await saveTryThisLookState(state);
    return NextResponse.json({ ok: true, videoUrl: url });
  }

  // ── Legacy multipart path (small files + remove) ─────────────────────────
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid upload." }, { status: 400 });

  const lookId = String(form.get("lookId") ?? "").trim();
  const remove = String(form.get("remove") ?? "") === "1";
  const file = form.get("video");
  const curatorId = curatorHeader || String(form.get("curatorId") ?? "").trim();
  if (!lookId) return NextResponse.json({ error: "lookId required." }, { status: 400 });

  const state = await readTryThisLookState();
  const look = state.looks.find((l) => l.id === lookId);
  if (!look) return NextResponse.json({ error: "Look not found." }, { status: 404 });
  if (!authorize(request, look, curatorId)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  if (remove) {
    (look as any).videoUrl = undefined;
    await saveTryThisLookState(state);
    return NextResponse.json({ ok: true, videoUrl: null });
  }

  if (!(file instanceof File)) return NextResponse.json({ error: "No video file." }, { status: 400 });
  if (!file.type.startsWith("video/")) return NextResponse.json({ error: "File must be a video." }, { status: 400 });
  if (file.size > 50 * 1024 * 1024) return NextResponse.json({ error: "Video too large (max 50 MB)." }, { status: 413 });

  const ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
  const bytes = await file.arrayBuffer();
  try {
    const path = await uploadTryThisLookBytes("videos", bytes, file.type, ext);
    const url = await getSignedUrl(path);
    (look as any).videoUrl = url || undefined;
    await saveTryThisLookState(state);
    return NextResponse.json({ ok: true, videoUrl: url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed." }, { status: 500 });
  }
}
