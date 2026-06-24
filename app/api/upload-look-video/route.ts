import { NextResponse } from "next/server";
import { readTryThisLookState, saveTryThisLookState, uploadTryThisLookBytes, getSignedUrl } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const maxDuration = 120;

// Curator uploads (or removes) a short video for one of their own looks.
// When set, the feed plays it (muted, looping); the image stays as the poster.
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid upload." }, { status: 400 });

  const lookId = String(form.get("lookId") ?? "").trim();
  const remove = String(form.get("remove") ?? "") === "1";
  const file = form.get("video");
  const curatorId = request.headers.get("x-curator-id")?.trim() ?? String(form.get("curatorId") ?? "").trim();
  if (!lookId) return NextResponse.json({ error: "lookId required." }, { status: 400 });

  const state = await readTryThisLookState();
  const look = state.looks.find((l) => l.id === lookId);
  if (!look) return NextResponse.json({ error: "Look not found." }, { status: 404 });

  // Ownership: curator session id matches the look's curator (admin PIN also allowed).
  const adminPin = process.env.TRY_THIS_LOOK_ADMIN_PIN?.trim();
  const isAdmin = adminPin && request.headers.get("x-try-look-admin-pin") === adminPin;
  if (!isAdmin && (!curatorId || curatorId !== (look as any).curatorId)) {
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
