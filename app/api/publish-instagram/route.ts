import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60; // IG processes the video async — we poll for a bit

const GRAPH = "https://graph.facebook.com/v21.0";

// Publish one of our try-on videos to Instagram as a Reel, from the admin.
// Requires (set in Vercel): IG_ACCESS_TOKEN (long-lived) + IG_USER_ID (the IG Business account id).
// Admin-gated. POST { videoUrl, caption }.
export async function POST(request: Request) {
  const pin = request.headers.get("x-try-look-admin-pin") ?? "";
  if (!process.env.TRY_THIS_LOOK_ADMIN_PIN || pin !== process.env.TRY_THIS_LOOK_ADMIN_PIN) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const token = process.env.IG_ACCESS_TOKEN;
  const igUser = process.env.IG_USER_ID;
  if (!token || !igUser) {
    return NextResponse.json({ error: "Instagram not configured — set IG_ACCESS_TOKEN + IG_USER_ID in Vercel, then redeploy." }, { status: 400 });
  }

  let body: { videoUrl?: string; caption?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Bad request." }, { status: 400 }); }
  const videoUrl = (body.videoUrl || "").trim();
  const caption = (body.caption || "").slice(0, 2200);
  if (!/^https:\/\/\S+$/.test(videoUrl)) {
    return NextResponse.json({ error: "videoUrl must be a public https URL." }, { status: 400 });
  }

  try {
    // 1) Create a REELS container pointing at our public video URL.
    const createRes = await fetch(`${GRAPH}/${igUser}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ media_type: "REELS", video_url: videoUrl, caption, access_token: token }),
    });
    const createData = await createRes.json().catch(() => ({} as Record<string, unknown>));
    const containerId = (createData as { id?: string }).id;
    if (!createRes.ok || !containerId) {
      const msg = (createData as { error?: { message?: string } }).error?.message || "Instagram container creation failed.";
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    // 2) Poll until Instagram finishes processing the video (async).
    let status = "";
    for (let i = 0; i < 16; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const st = await fetch(`${GRAPH}/${containerId}?fields=status_code&access_token=${encodeURIComponent(token)}`);
      const sd = await st.json().catch(() => ({} as Record<string, unknown>));
      status = String((sd as { status_code?: string }).status_code || "");
      if (status === "FINISHED") break;
      if (status === "ERROR") return NextResponse.json({ error: "Instagram couldn't process this video." }, { status: 502 });
    }
    if (status !== "FINISHED") {
      return NextResponse.json({ error: "Instagram is still processing — try publishing again in a moment." }, { status: 504 });
    }

    // 3) Publish the finished container.
    const pubRes = await fetch(`${GRAPH}/${igUser}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: containerId, access_token: token }),
    });
    const pubData = await pubRes.json().catch(() => ({} as Record<string, unknown>));
    const mediaId = (pubData as { id?: string }).id;
    if (!pubRes.ok || !mediaId) {
      const msg = (pubData as { error?: { message?: string } }).error?.message || "Instagram publish failed.";
      return NextResponse.json({ error: msg }, { status: 502 });
    }
    return NextResponse.json({ ok: true, mediaId });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 502 });
  }
}
