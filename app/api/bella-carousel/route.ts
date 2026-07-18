import { NextResponse } from "next/server";
import { readTryThisLookState, saveTryThisLookState, createSignedUploadUrl, getSignedUrl,
  readCardStudioSlides, writeCardStudioSlides, readCardStudioBackup, type BellaSlide } from "@/lib/try-this-look-store";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSellerFromRequest } from "@/lib/supabase-auth-server";
import { sendEmail } from "@/lib/email-send";

// A model's own upload starts with this many My-Studio credits (separate pool from AI-generation
// credits) — she can't upload unlimited photos/videos; the admin tops her up from her profile.
const STUDIO_UPLOAD_STARTER_CREDITS = 10;

export const runtime = "nodejs";

// The signed-in REAL MODEL who owns her own card (Studio self-service). Resolves the Bearer token
// → email → the curator with that email. She qualifies as a real model if she's admin-flagged
// `realModel` OR applied with her own photo (`imageSource: "own"` — the free real-model application).
// AI-face models (`imageSource: "ours"`) are excluded. Returns her curator id (== her card blob id)
// or null. This id scopes every read/write below, so a model can ONLY ever touch her OWN blob —
// the client-sent `model` is ignored for non-admins.
async function resolveModelOwner(request: Request): Promise<string | null> {
  const user = await getSellerFromRequest(request);
  const email = user?.email?.trim().toLowerCase();
  if (!email) return null;
  const state = await readTryThisLookState();
  const c = (state.curators ?? []).find(x => String((x as any).email || "").trim().toLowerCase() === email);
  if (!c) return null;
  const isRealModel = (c as any).realModel === true || (c as any).imageSource === "own";
  return isRealModel ? c.id : null;
}

// Canonical slide order: manual `order` first (ascending), then creation time.
export const slideSort = (a: BellaSlide, b: BellaSlide) =>
  (a.order ?? 1e9) - (b.order ?? 1e9) || String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? ""));

// `includePaths` → also return the raw storage paths (admin only) so the browser draft is
// complete and can be committed back verbatim.
async function signSlides(slides: BellaSlide[], includePaths = false) {
  return Promise.all([...slides].sort(slideSort).map(async (s) => ({
    id: s.id, kind: s.kind, title: s.title ?? "", caption: s.caption ?? "",
    hidden: s.hidden === true, private: s.private === true, pages: s.pages ?? null, customer: s.customer ?? "", order: s.order ?? null,
    source: s.source ?? null, pendingApproval: s.pendingApproval === true,
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
    source: raw?.source === "admin" || raw?.source === "model" ? raw.source : undefined,
    pendingApproval: raw?.pendingApproval === true,
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
  // A real model editing her OWN card gets the full library (incl. private/hidden + raw paths),
  // exactly like the admin — but only for her own blob (model must equal her resolved id).
  const ownerId = await resolveModelOwner(request);
  if (ownerId && model === ownerId) {
    const backup = await readCardStudioBackup(model);
    return NextResponse.json({ slides: await signSlides(all, true), owner: true, backup: { count: backup.slides.length, savedAt: backup.savedAt } });
  }
  const surface = url.searchParams.get("surface") || "lp-journey";
  // Include HIDDEN slides too — the card shows them as VERY blurred teasers (last), it doesn't drop them.
  // A model's own public upload awaiting admin review (pendingApproval) is NOT shown here yet.
  const visible = all.filter((s) => !s.customer && onSurface(s, surface) && !s.pendingApproval);
  return NextResponse.json({ slides: await signSlides(visible) });
}

// POST — admin only.
//   sign         → get a signed upload URL for a new media file (upload happens client-side).
//   commit       → replace the WHOLE slide library with the given draft, in one write + backup.
//   restoreBackup→ bring the last backup back as the live library.
//   removeBooking→ prune a booking (in the shared state.json, separate from slides).
export async function POST(request: Request) {
  const admin = await isAdminRequest(request);
  const body = (await request.json().catch(() => ({}))) as {
    sign?: boolean; kind?: "image" | "video"; ext?: string;
    commit?: any[]; restoreBackup?: boolean; removeBooking?: string; model?: string;
  };
  let model = (body.model || "").trim() || undefined;   // which influencer's card
  // Non-admins: only a signed-in REAL MODEL may write, and ONLY her own blob. Her resolved id
  // overrides whatever `model` the client sent, so she can never touch another model's card.
  let isOwner = false;
  if (!admin) {
    const ownerId = await resolveModelOwner(request);
    if (!ownerId) return NextResponse.json({ error: "Sign in as a LuxuryBandit model." }, { status: 401 });
    model = ownerId; isOwner = true;
  }

  // Prune a booking (admin only) — lives in the shared state.json, handled up front.
  if (typeof body?.removeBooking === "string" && body.removeBooking) {
    if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    const st = await readTryThisLookState();
    st.tripBookings = (st.tripBookings ?? []).filter(b => b.id !== body.removeBooking);
    await saveTryThisLookState(st, { deletedBookingIds: [body.removeBooking] });
    return NextResponse.json({ ok: true, slides: await signSlides(await readCardStudioSlides(model), true), bookings: st.tripBookings });
  }

  if (body.sign) {
    if (isOwner) {
      const state = await readTryThisLookState();
      const curator = (state.curators ?? []).find(c => c.id === model);
      const have = curator ? (curator.studioUploadCredits ?? STUDIO_UPLOAD_STARTER_CREDITS) : 0;
      if (have <= 0) return NextResponse.json({ error: "No upload credits left. Contact LuxuryBandit for more." }, { status: 403 });
    }
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
    // A model manages ONLY her own public card — never per-customer slides.
    if (isOwner) for (const s of slides) s.customer = undefined;

    // Figure out which slides are actually NEW in this commit (vs. edits to existing ones),
    // so credits/attribution/pending-review only apply to genuinely new uploads.
    const existing = await readCardStudioSlides(model);
    const existingIds = new Set(existing.map(s => s.id));
    const existingById = new Map(existing.map(s => [s.id, s]));
    const newSlides = slides.filter(s => !existingIds.has(s.id));

    // Safety net for EXISTING slides: a model can't sneak a slide public without review by
    // flipping `private` client-side — going private→public re-enters the review queue
    // (never trust the client's own pendingApproval for this transition).
    if (isOwner) {
      for (const s of slides) {
        const before = existingById.get(s.id);
        if (before && before.source === "model" && before.private === true && s.private === false) {
          s.pendingApproval = true;
        }
      }
    }

    if (newSlides.length) {
      if (admin) {
        // PIN-mode = LuxuryBandit adding content FOR her — a gift. Goes live immediately,
        // doesn't touch her upload credits, and she gets notified by email.
        for (const s of newSlides) { s.source = "admin"; s.pendingApproval = false; }
      } else if (isOwner) {
        // Her own upload: mark it as hers. PUBLIC uploads need admin review before they're
        // visible anywhere public — PRIVATE ones go live for her subscribers immediately.
        for (const s of newSlides) { s.source = "model"; s.pendingApproval = !s.private; }

        // Enforce her My Studio upload credits — one credit per new upload.
        const state = await readTryThisLookState();
        const curator = (state.curators ?? []).find(c => c.id === model);
        const have = curator ? (curator.studioUploadCredits ?? STUDIO_UPLOAD_STARTER_CREDITS) : 0;
        if (newSlides.length > have) {
          return NextResponse.json({ error: `Not enough upload credits (you have ${have} left). Contact LuxuryBandit for more.` }, { status: 403 });
        }
        if (curator) {
          curator.studioUploadCredits = have - newSlides.length;
          await saveTryThisLookState(state);
        }
      }
    }

    // Re-number order within each scope so the given array order is authoritative.
    const seen = new Map<string, number>();
    for (const s of slides) {
      const scope = s.customer ?? "";
      const n = (seen.get(scope) ?? -1) + 1; seen.set(scope, n); s.order = n;
    }
    await writeCardStudioSlides(slides, model);

    // Notify her by email that LuxuryBandit gifted her new content (best-effort, never blocks the save).
    if (admin && newSlides.length) {
      try {
        const state = await readTryThisLookState();
        const curator = (state.curators ?? []).find(c => c.id === model);
        const email = curator?.email?.trim();
        const name = curator?.modelName?.trim() || [curator?.firstName, curator?.lastName].filter(Boolean).join(" ").trim() || "there";
        if (email) {
          await sendEmail({
            to: email,
            subject: "You received new photos/videos from LuxuryBandit 🎁",
            html: `<p>Hi ${name},</p><p>LuxuryBandit just added ${newSlides.length} new ${newSlides.length === 1 ? "post" : "posts"} (photos/videos) to your profile — a gift for you.</p><p>Open My Studio to see and manage them.</p>`,
          });
        }
      } catch { /* best-effort — never fail the save over a notification */ }
    }

    return NextResponse.json({ ok: true, slides: await signSlides(slides, true) });
  }

  return NextResponse.json({ error: "Nothing to do." }, { status: 400 });
}
