import { NextResponse } from "next/server";
import { readTryThisLookState, saveTryThisLookState, createSignedUploadUrl, getSignedUrl, type BellaSlide } from "@/lib/try-this-look-store";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";

// Canonical slide order: manual `order` first (ascending), then creation time.
export const slideSort = (a: BellaSlide, b: BellaSlide) =>
  (a.order ?? 1e9) - (b.order ?? 1e9) || String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? ""));

async function signSlides(slides: BellaSlide[]) {
  return Promise.all([...slides].sort(slideSort).map(async (s) => ({
    id: s.id, kind: s.kind, title: s.title ?? "", caption: s.caption ?? "",
    hidden: s.hidden === true, pages: s.pages ?? [], customer: s.customer ?? "", order: s.order ?? null,
    mediaUrl: s.path ? await getSignedUrl(s.path).catch(() => "") : "",
    posterUrl: s.posterPath ? await getSignedUrl(s.posterPath).catch(() => "") : "",
  })));
}

// pages undefined = everywhere; an array (even empty) = exactly those surfaces (empty = nowhere).
const onSurface = (s: BellaSlide, surface: string) => s.pages == null || s.pages.includes(surface);

// GET — admins (PIN) get the FULL library (incl. hidden + per-customer) plus the bookings list to
// pick a customer. Public callers get only visible GENERAL slides for the requested ?surface.
export async function GET(request: Request) {
  const state = await readTryThisLookState();
  const all = state.bellaSlides ?? [];
  if (await isAdminRequest(request)) return NextResponse.json({ slides: await signSlides(all), bookings: state.tripBookings ?? [] });
  const surface = new URL(request.url).searchParams.get("surface") || "lp-journey";
  const visible = all.filter((s) => s.hidden !== true && !s.customer && onSurface(s, surface));
  return NextResponse.json({ slides: await signSlides(visible) });
}

// POST — admin only. Modes: sign · add · update · replace · remove · reorder.
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as {
    sign?: boolean; kind?: "image" | "video"; ext?: string;
    add?: { kind?: "image" | "video"; path?: string; posterPath?: string; title?: string; caption?: string; hidden?: boolean; pages?: string[]; customer?: string };
    update?: { id?: string; title?: string; caption?: string; hidden?: boolean; pages?: string[] };
    replace?: { id?: string; path?: string; kind?: "image" | "video" };
    remove?: string; reorder?: string[]; removeBooking?: string;
  };

  // Prune a booking (admin) — handled up front, separate from the slides array.
  if (typeof body?.removeBooking === "string" && body.removeBooking) {
    const st = await readTryThisLookState();
    st.tripBookings = (st.tripBookings ?? []).filter(b => b.id !== body.removeBooking);
    await saveTryThisLookState(st, { deletedBookingIds: [body.removeBooking] });
    return NextResponse.json({ ok: true, slides: await signSlides(st.bellaSlides ?? []), bookings: st.tripBookings });
  }

  if (body.sign) {
    const folder = body.kind === "video" ? "videos" : "uploads";
    const ext = (String(body.ext ?? "").replace(/[^a-z0-9]/gi, "").toLowerCase() || (body.kind === "video" ? "mp4" : "jpg"));
    const { path, uploadUrl } = await createSignedUploadUrl(folder, ext);
    return NextResponse.json({ path, uploadUrl });
  }

  const state = await readTryThisLookState();
  const slides = [...(state.bellaSlides ?? [])];

  if (body.add?.path) {
    if (!body.add.path.startsWith("try-this-look/")) return NextResponse.json({ error: "Invalid path." }, { status: 400 });
    const customer = String(body.add.customer ?? "").trim().toLowerCase() || undefined;
    // Append at the end of its own scope (general vs a customer).
    const maxOrder = slides.filter(s => (s.customer ?? "") === (customer ?? "")).reduce((m, s) => Math.max(m, s.order ?? -1), -1);
    slides.push({
      id: crypto.randomUUID(),
      kind: body.add.kind === "video" ? "video" : "image",
      path: body.add.path,
      posterPath: body.add.posterPath?.startsWith("try-this-look/") ? body.add.posterPath : undefined,
      title: String(body.add.title ?? "").trim().slice(0, 80) || undefined,
      caption: String(body.add.caption ?? "").trim().slice(0, 400) || undefined,
      hidden: body.add.hidden === true,
      pages: Array.isArray(body.add.pages) ? body.add.pages.slice(0, 10) : undefined,
      customer,
      order: maxOrder + 1,
      createdAt: new Date().toISOString(),
    });
  } else if (body.update?.id) {
    const i = slides.findIndex((s) => s.id === body.update!.id);
    if (i < 0) return NextResponse.json({ error: "Slide not found." }, { status: 404 });
    const u = body.update;
    slides[i] = {
      ...slides[i],
      ...(u.title !== undefined ? { title: String(u.title).trim().slice(0, 80) || undefined } : {}),
      ...(u.caption !== undefined ? { caption: String(u.caption).trim().slice(0, 400) || undefined } : {}),
      ...(u.hidden !== undefined ? { hidden: u.hidden === true } : {}),
      ...(Array.isArray(u.pages) ? { pages: u.pages.slice(0, 10) } : {}),
    };
  } else if (body.replace?.id && body.replace.path) {
    if (!body.replace.path.startsWith("try-this-look/")) return NextResponse.json({ error: "Invalid path." }, { status: 400 });
    const i = slides.findIndex((s) => s.id === body.replace!.id);
    if (i < 0) return NextResponse.json({ error: "Slide not found." }, { status: 404 });
    slides[i] = { ...slides[i], path: body.replace.path, kind: body.replace.kind ?? slides[i].kind };
  } else if (body.remove) {
    const i = slides.findIndex((s) => s.id === body.remove);
    if (i >= 0) slides.splice(i, 1);
  } else if (Array.isArray(body.reorder)) {
    // Assign order by the given id sequence (scoped — the client sends one scope's ids in order).
    body.reorder.forEach((id, idx) => { const s = slides.find(x => x.id === id); if (s) s.order = idx; });
  } else {
    return NextResponse.json({ error: "Nothing to do." }, { status: 400 });
  }

  state.bellaSlides = slides.slice(0, 500);
  await saveTryThisLookState(state, body.remove ? { deletedBellaSlideIds: [body.remove] } : {});
  return NextResponse.json({ ok: true, slides: await signSlides(state.bellaSlides), bookings: state.tripBookings ?? [] });
}
