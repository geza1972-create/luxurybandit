import { NextResponse } from "next/server";
import { readTryThisLookState, readCardStudioSlides, writeCardStudioSlides, getSignedUrl, type BellaSlide } from "@/lib/try-this-look-store";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";

// Admin review queue: every model's own PUBLIC upload waiting for approval before it can
// appear anywhere public (private uploads never land here — no review needed for those).
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const state = await readTryThisLookState();
  const models = (state.curators ?? []).filter(c => ((c as any).status ?? "active") === "active");
  const perModel = await Promise.all(models.map(async (c) => {
    const slides = await readCardStudioSlides(c.id).catch(() => [] as BellaSlide[]);
    const pending = slides.filter(s => s.pendingApproval === true);
    if (!pending.length) return [];
    const name = (c as any).modelName?.trim() || [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || c.firstName || "Model";
    return Promise.all(pending.map(async (s) => ({
      modelId: c.id, modelName: name, id: s.id, kind: s.kind, caption: s.caption ?? "",
      createdAt: s.createdAt ?? "",
      mediaUrl: s.path ? await getSignedUrl(s.path).catch(() => "") : "",
      posterUrl: s.posterPath ? await getSignedUrl(s.posterPath).catch(() => "") : "",
    })));
  }));
  const items = perModel.flat().sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  return NextResponse.json({ items });
}

// POST { modelId, slideId, action: "approve" | "reject" } — admin only.
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { modelId?: string; slideId?: string; action?: "approve" | "reject" };
  const modelId = String(body.modelId ?? "").trim();
  const slideId = String(body.slideId ?? "").trim();
  if (!modelId || !slideId || (body.action !== "approve" && body.action !== "reject")) {
    return NextResponse.json({ error: "modelId, slideId and a valid action are required." }, { status: 400 });
  }
  const slides = await readCardStudioSlides(modelId);
  const next = body.action === "reject"
    ? slides.filter(s => s.id !== slideId)
    : slides.map(s => s.id === slideId ? { ...s, pendingApproval: false } : s);
  await writeCardStudioSlides(next, modelId);
  return NextResponse.json({ ok: true });
}
