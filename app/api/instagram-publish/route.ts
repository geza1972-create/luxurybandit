import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const maxDuration = 180;

const GRAPH = "https://graph.facebook.com/v21.0";

// Admin: publish a try-on video to the connected Instagram account as a Reel via the
// Instagram Content Publishing API. Needs two env vars (see the setup guide):
//   IG_USER_ID       — the Instagram BUSINESS account id (numeric)
//   IG_ACCESS_TOKEN  — a long-lived access token with instagram_content_publish
// The video_url must be publicly fetchable (our Supabase signed URLs are, for ~24h) and
// meet Reels specs (MP4/H.264, 9:16, 3–90s) — our clips already do.
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin only." }, { status: 401 });
  const igUserId = process.env.IG_USER_ID?.trim();
  const token = process.env.IG_ACCESS_TOKEN?.trim();
  if (!igUserId || !token) {
    return NextResponse.json({ error: "IG_USER_ID / IG_ACCESS_TOKEN fehlen — in den Vercel-Env eintragen (siehe Anleitung im Chat)." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as { videoUrl?: string; caption?: string };
  const videoUrl = String(body.videoUrl ?? "").trim();
  const caption = String(body.caption ?? "").slice(0, 2200);
  if (!videoUrl) return NextResponse.json({ error: "videoUrl required." }, { status: 400 });

  try {
    // 1) Create a REELS media container (IG starts downloading + processing the video).
    const createRes = await fetch(`${GRAPH}/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ media_type: "REELS", video_url: videoUrl, caption, access_token: token }),
    });
    const createData = (await createRes.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };
    const creationId = createData?.id;
    if (!createRes.ok || !creationId) {
      return NextResponse.json({ error: `IG-Container fehlgeschlagen: ${createData?.error?.message ?? `HTTP ${createRes.status}`}` }, { status: 502 });
    }

    // 2) Poll until the container is FINISHED (video downloaded + transcoded by IG).
    let status = "";
    for (let i = 0; i < 50; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const stRes = await fetch(`${GRAPH}/${creationId}?fields=status_code&access_token=${encodeURIComponent(token)}`);
      const stData = (await stRes.json().catch(() => ({}))) as { status_code?: string };
      status = stData?.status_code ?? "";
      if (status === "FINISHED") break;
      if (status === "ERROR") return NextResponse.json({ error: "IG konnte das Video nicht verarbeiten (Format/URL prüfen)." }, { status: 502 });
    }
    if (status !== "FINISHED") return NextResponse.json({ error: "IG-Verarbeitung dauert zu lange — später nochmal versuchen." }, { status: 504 });

    // 3) Publish the container.
    const pubRes = await fetch(`${GRAPH}/${igUserId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: creationId, access_token: token }),
    });
    const pubData = (await pubRes.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };
    if (!pubRes.ok || !pubData?.id) {
      return NextResponse.json({ error: `IG-Veröffentlichen fehlgeschlagen: ${pubData?.error?.message ?? `HTTP ${pubRes.status}`}` }, { status: 502 });
    }
    return NextResponse.json({ ok: true, mediaId: pubData.id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "IG-Post fehlgeschlagen." }, { status: 500 });
  }
}
