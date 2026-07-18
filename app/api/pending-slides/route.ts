import { NextResponse } from "next/server";
import { readTryThisLookState, readCardStudioSlides, writeCardStudioSlides, getSignedUrl, type BellaSlide } from "@/lib/try-this-look-store";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";

// Admin's public-posts management list: every model-attributed slide (source set) that is
// currently PUBLIC or PENDING review — i.e. anything visible or about to be visible somewhere
// public. Stays listed even after approval, so admin can revisit it later (delete or send it
// back to private) — it's not just a one-shot review queue.
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const state = await readTryThisLookState();
  const models = (state.curators ?? []).filter(c => ((c as any).status ?? "active") === "active");
  const perModel = await Promise.all(models.map(async (c) => {
    const slides = await readCardStudioSlides(c.id).catch(() => [] as BellaSlide[]);
    // Only slides added via My Studio (admin gift or her own upload) — NOT the older
    // AI daily-story generator's "ai-story" source, which never goes through this review.
    const relevant = slides.filter(s => (s.source === "admin" || s.source === "model") && s.private !== true);
    if (!relevant.length) return [];
    const name = (c as any).modelName?.trim() || [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || c.firstName || "Model";
    return Promise.all(relevant.map(async (s) => ({
      modelId: c.id, modelName: name, id: s.id, kind: s.kind, caption: s.caption ?? "",
      createdAt: s.createdAt ?? "", status: s.pendingApproval ? "pending" : "public",
      mediaUrl: s.path ? await getSignedUrl(s.path).catch(() => "") : "",
      posterUrl: s.posterPath ? await getSignedUrl(s.posterPath).catch(() => "") : "",
    })));
  }));
  const items = perModel.flat().sort((a, b) => {
    // Pending first (needs action), then newest first within each group.
    if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
    return String(b.createdAt).localeCompare(String(a.createdAt));
  });
  return NextResponse.json({ items });
}

// POST { modelId, slideId, action: "approve" | "reject" | "set-private" } — admin only.
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { modelId?: string; slideId?: string; action?: "approve" | "reject" | "set-private" };
  const modelId = String(body.modelId ?? "").trim();
  const slideId = String(body.slideId ?? "").trim();
  if (!modelId || !slideId || !["approve", "reject", "set-private"].includes(body.action ?? "")) {
    return NextResponse.json({ error: "modelId, slideId and a valid action are required." }, { status: 400 });
  }
  const slides = await readCardStudioSlides(modelId);
  const next = body.action === "reject"
    ? slides.filter(s => s.id !== slideId)
    : slides.map(s => s.id === slideId
      ? body.action === "approve"
        ? { ...s, pendingApproval: false }
        : { ...s, private: true, pendingApproval: false } // set-private
      : s);
  await writeCardStudioSlides(next, modelId);
  return NextResponse.json({ ok: true });
}
