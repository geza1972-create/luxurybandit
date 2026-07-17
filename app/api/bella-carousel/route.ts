import { NextResponse } from "next/server";
import { readTryThisLookState, saveTryThisLookState, createSignedUploadUrl, getSignedUrl,
  readCardStudioSlides, writeCardStudioSlides, readCardStudioBackup, type BellaSlide } from "@/lib/try-this-look-store";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";

// Canonical slide order: manual `order` first (ascending), then creation time.
export const slideSort = (a: BellaSlide, b: BellaSlide) =>
  (a.order ?? 1e9) - (b.order ?? 1e9) || String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? ""));

// `includePaths` → also return the raw storage paths (admin only) so the browser draft is
// complete and can be committed back verbatim.
async function signSlides(slides: BellaSlide[], includePaths = false) {
  return Promise.all([...slides].sort(slideSort).map(async (s) => ({
    id: s.id, kind: s.kind, title: s.title ?? "", caption: s.caption ?? "",
    hidden: s.hidden === true, private: s.private === true, pages: s.pages ?? null, customer: s.customer ?? "", order: s.order ?? null,
    ...(includePaths ? { path: s.path ?? "", posterPath: s.posterPath ?? "", createdAt: s.createdAt ?? "" } : {}),
    mediaUrl: s.path ? await getSignedUrl(s.path).catch(() => "") : "",
    posterUrl: s.posterPath ? await getSignedUrl(s.posterPath).catch(() => "") : "",
  })));
}

// pages undefined = everywhere; an array (even empty) = exactly those surfaces (empty = nowhere).
const onSurface = (s: BellaSlide, surface: string) => s.pages == null || s.pages.includes(surface);

// Validate + normalise one incoming slide from a client commit into a stored BellaSlide.
function normalizeSlide(raw: any): BellaSlide | null {
  const path = String(raw?.path ?? "").trim();
  if (!path.startsWith("try-this-look/")) return null;
  const posterPath = String(raw?.posterPath ?? "").trim();
  const pages = Array.isArray(raw?.pages) ? raw.pages.map(String).slice(0, 10) : undefined;
  const customer = String(raw?.customer ?? "").trim().toLowerCase() || undefined;
  return {
    id: String(raw?.id ?? "").trim() || crypto.randomUUID(),
    kind: raw?.kind === "video" ? "video" : "image",
    path,
    posterPath: posterPath.startsWith("try-this-look/") ? posterPath : undefined,
    title: String(raw?.title ?? "").trim().slice(0, 80) || undefined,
    caption: String(raw?.caption ?? "").trim().slice(0, 400) || undefined,
    hidden: raw?.hidden === true,
    private: raw?.private === true,
    pages,
    customer,
    order: Number.isFinite(raw?.order) ? Number(raw.order) : undefined,
    createdAt: String(raw?.createdAt ?? "").trim() || new Date().toISOString(),
  };
}

// GET — admins (PIN) get the FULL library (incl. hidden + per-customer, WITH raw paths) plus the
// bookings list to pick a customer. Public callers get only visible GENERAL slides for ?surface.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const model = url.searchParams.get("model") || undefined;   // which influencer's card (default Bella)
  const all = await readCardStudioSlides(model);
  if (await isAdminRequest(request)) {
    const state = await readTryThisLookState();
    const backup = await readCardStudioBackup(model);
    return NextResponse.json({
      slides: await signSlides(all, true),
      bookings: state.tripBookings ?? [],
      backup: { count: backup.slides.length, savedAt: backup.savedAt },
    });
  }
  const surface = url.searchParams.get("surface") || "lp-journey";
  const visible = all.filter((s) => s.hidden !== true && !s.customer && onSurface(s, surface));
  return NextResponse.json({ slides: await signSlides(visible) });
}

// POST — admin only.
//   sign         → get a signed upload URL for a new media file (upload happens client-side).
//   commit       → replace the WHOLE slide library with the given draft, in one write + backup.
//   restoreBackup→ bring the last backup back as the live library.
//   removeBooking→ prune a booking (in the shared state.json, separate from slides).
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as {
    sign?: boolean; kind?: "image" | "video"; ext?: string;
    commit?: any[]; restoreBackup?: boolean; removeBooking?: string; model?: string;
  };
  const model = (body.model || "").trim() || undefined;   // which influencer's card

  // Prune a booking (admin) — lives in the shared state.json, handled up front.
  if (typeof body?.removeBooking === "string" && body.removeBooking) {
    const st = await readTryThisLookState();
    st.tripBookings = (st.tripBookings ?? []).filter(b => b.id !== body.removeBooking);
    await saveTryThisLookState(st, { deletedBookingIds: [body.removeBooking] });
    return NextResponse.json({ ok: true, slides: await signSlides(await readCardStudioSlides(model), true), bookings: st.tripBookings });
  }

  if (body.sign) {
    const folder = body.kind === "video" ? "videos" : "uploads";
    const ext = (String(body.ext ?? "").replace(/[^a-z0-9]/gi, "").toLowerCase() || (body.kind === "video" ? "mp4" : "jpg"));
    const { path, uploadUrl } = await createSignedUploadUrl(folder, ext);
    return NextResponse.json({ path, uploadUrl });
  }

  // Restore the last backup as the live library.
  if (body.restoreBackup) {
    const backup = await readCardStudioBackup(model);
    if (!backup.slides.length) return NextResponse.json({ error: "Kein Backup vorhanden." }, { status: 404 });
    await writeCardStudioSlides(backup.slides, model);
    return NextResponse.json({ ok: true, slides: await signSlides(backup.slides, true) });
  }

  // Commit the full draft (this is the ONLY persistence path for editing — nothing auto-saves).
  if (Array.isArray(body.commit)) {
    const slides = body.commit.map(normalizeSlide).filter(Boolean) as BellaSlide[];
    // Re-number order within each scope so the given array order is authoritative.
    const seen = new Map<string, number>();
    for (const s of slides) {
      const scope = s.customer ?? "";
      const n = (seen.get(scope) ?? -1) + 1; seen.set(scope, n); s.order = n;
    }
    await writeCardStudioSlides(slides, model);
    return NextResponse.json({ ok: true, slides: await signSlides(slides, true) });
  }

  return NextResponse.json({ error: "Nothing to do." }, { status: 400 });
}
