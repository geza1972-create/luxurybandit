import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  readTryThisLookState,
  saveTryThisLookState,
  uploadTryThisLookImage,
  type CuratorProfile,
} from "@/lib/try-this-look-store";
import { setCuratorCredits, grantCredits, awardEngagementCredits, getCuratorCredits, STARTER_CREDITS, TRYON_CREDITS, SEARCH_CREDITS, VIDEO_CREDITS } from "@/lib/curator-budget";
import { notifyAdminWhatsApp, ADMIN_URL } from "@/lib/notify-admin";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

// Verify a Supabase access token and return the user's email (or "").
async function emailFromToken(request: Request): Promise<string> {
  const token = request.headers.get("authorization")?.replace("Bearer ", "").trim() ?? "";
  if (!token) return "";
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/^["']|["']$/g, "");
  const supabaseUrl = rawUrl ? (rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`).replace(/\/(rest|storage)\/v1\/?$/, "").replace(/\/$/, "") : "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!supabaseUrl || !anon) return "";
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
    if (!res.ok) return "";
    const u = await res.json() as { email?: string };
    return String(u.email ?? "").trim().toLowerCase();
  } catch { return ""; }
}

// GET (no args)        → taste autocomplete databases (public)
// GET ?me=1 + Bearer   → the signed-in user's curator profile (by verified email)
export async function GET(request: Request) {
  const state = await readTryThisLookState();
  const url = new URL(request.url);

  // Resolve a display-name slug → curator id (for redirecting the old slug page).
  const bySlug = url.searchParams.get("bySlug");
  if (bySlug) {
    const want = bySlug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const c = (state.curators ?? []).find(x => {
      const nm = `${x.firstName ?? ""} ${x.lastName ?? ""}`.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      return nm === want;
    });
    return NextResponse.json({ id: c?.id ?? null });
  }

  // Public curator profile by id — safe fields only (no email/phone/address).
  const profileId = url.searchParams.get("profile");
  if (profileId) {
    const c = (state.curators ?? []).find(x => x.id === profileId);
    if (!c) return NextResponse.json({ profile: null });
    return NextResponse.json({ profile: {
      id: c.id, firstName: c.firstName, lastName: c.lastName, motto: c.motto, bio: c.bio,
      photoUrl: c.photoUrl, instagram: c.instagram, style: c.style, brands: c.brands, genderFocus: c.genderFocus,
    } });
  }

  if (url.searchParams.get("me") === "1" || url.searchParams.get("mylooks") === "1") {
    const email = await emailFromToken(request);
    const sessionId = request.headers.get("x-curator-id")?.trim();
    const curator = (state.curators ?? []).find(c =>
      (email && (c.email ?? "").trim().toLowerCase() === email) || (sessionId && c.id === sessionId)
    ) ?? null;
    if (url.searchParams.get("mylooks") === "1") {
      // A curator sees their own looks. The house admin (PIN/email, no curator
      // session) sees ALL looks — this is the master gallery below the studio.
      const adminAll = !curator && (await isAdminRequest(request));
      const looks = (!curator && !adminAll) ? [] : (state.looks ?? [])
        .filter(l => adminAll || (l as any).curatorId === curator!.id)
        // Manual order (feedOrder) wins where set; everything else newest-first so
        // the look you just created lands at the TOP of the gallery.
        .sort((a, b) => {
          const ao = typeof (a as any).feedOrder === "number" ? (a as any).feedOrder : null;
          const bo = typeof (b as any).feedOrder === "number" ? (b as any).feedOrder : null;
          if (ao !== null && bo !== null) return ao - bo;
          if (ao !== null) return 1;   // a is manually ordered, b is new → new first
          if (bo !== null) return -1;  // b is manually ordered, a is new → new first
          return String((b as any).createdAt ?? "").localeCompare(String((a as any).createdAt ?? "")); // newest first
        })
        .map(l => ({ id: l.id, name: l.name, imageUrl: (l as any).frontImageUrl ?? l.imageUrl, published: l.published !== false, altCount: ((l as any).alternatives ?? []).length, locationCount: ((l as any).locationDupes ?? []).length, alternatives: (l as any).alternatives ?? [], locationDupes: (l as any).locationDupes ?? [], clicks: (l as any).clicks ?? {}, clothesImageUrl: (l as any).clothesImageUrl ?? "", locationImageUrl: (l as any).locationImageUrl ?? "", note: ((l as any).curatorNote || (l as any).productNote) ?? "", commentsOff: (l as any).commentsOff === true, videoUrl: (l as any).videoUrl ?? "", brand: (l as any).brand ?? "", category: (l as any).category ?? "", description: (l as any).productNote ?? "", feedOrder: typeof (l as any).feedOrder === "number" ? (l as any).feedOrder : undefined }));
      return NextResponse.json({ looks });
    }
    // Earn-as-you-prove-yourself: tally this creator's engagement and grant any
    // milestone credits they've newly crossed, then return their credit balance.
    let credits = null, justEarned: { label: string; credits: number }[] = [];
    if (curator) {
      const myLookIds = new Set((state.looks ?? []).filter(l => (l as any).curatorId === curator.id).map(l => l.id));
      const likes = (state.looks ?? []).filter(l => myLookIds.has(l.id)).reduce((s, l) => s + ((l as any).likeCount ?? 0), 0);
      const tryons = (state.generations ?? []).filter(g => myLookIds.has((g as any).lookId)).length;
      const res = await awardEngagementCredits(curator.id, { tryons, likes });
      credits = res?.info ?? await getCuratorCredits(curator.id);
      justEarned = res?.awarded ?? [];
    }
    return NextResponse.json({
      curator,
      credits,
      justEarned,
      costs: { tryon: TRYON_CREDITS, search: SEARCH_CREDITS, starter: STARTER_CREDITS, video: VIDEO_CREDITS },
    });
  }
  return NextResponse.json({
    brands: state.brands ?? [],
    styles: state.styles ?? [],
    colors: state.colors ?? [],
    fabrics: state.fabrics ?? [],
    occasions: state.occasions ?? [],
  });
}

// Split a free-text tag field into clean values.
function parseTags(raw: string): string[] {
  return String(raw)
    .split(/[,;\n]+/)
    .map(s => s.trim())
    .filter(s => s.length >= 2 && s.length <= 40);
}

// Merge new values into a database, case-insensitive dedupe.
function mergeTags(existing: string[], incoming: string): string[] {
  const seen = new Set(existing.map(b => b.toLowerCase()));
  const merged = [...existing];
  for (const v of parseTags(incoming)) {
    if (!seen.has(v.toLowerCase())) { seen.add(v.toLowerCase()); merged.push(v); }
  }
  return merged;
}

// Small, cheap model for the public motto/bio suggestions.
const SUGGEST_MODEL = "claude-haiku-4-5";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// POST { action: "suggest", brands, style }            → AI motto + bio ideas
// POST { action: "apply", ...profile, photo }          → save curator, returns id
export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return jsonError("Invalid request.");
  }
  const action = String(payload.action ?? "");

  if (action === "suggest") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return jsonError("ANTHROPIC_API_KEY missing.", 500);
    const brands = String(payload.brands ?? "").trim().slice(0, 300);
    const style = String(payload.style ?? "").trim().slice(0, 300);
    if (!brands && !style) return jsonError("Tell us a few brands or a style first.");

    const client = new Anthropic({ apiKey });
    const prompt =
      `A new fashion curator is joining LuxuryBandit. Brands they love: ${brands || "(not given)"}. ` +
      `Their style: ${style || "(not given)"}.\n\n` +
      `Return STRICT JSON only, no prose, shape:\n` +
      `{"mottos":["...","...","..."],"bio":"..."}\n` +
      `- "mottos": 3 short, punchy English taglines (max 6 words each) that fit this curator's taste. Aspirational, on-brand with "Bandit the look!". No hashtags, no quotes inside.\n` +
      `- "bio": one English sentence (max 160 chars) describing this curator's eye/taste for their public profile.`;

    try {
      const res = await client.messages.create({
        model: SUGGEST_MODEL,
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      });
      const text = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map(b => b.text)
        .join("")
        .trim();
      const match = text.match(/\{[\s\S]*\}/);
      const parsed = match ? JSON.parse(match[0]) : {};
      const mottos = Array.isArray(parsed.mottos)
        ? parsed.mottos.map((m: unknown) => String(m).trim()).filter(Boolean).slice(0, 3)
        : [];
      const bio = String(parsed.bio ?? "").trim().slice(0, 200);
      return NextResponse.json({ mottos, bio });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Suggestion failed.";
      return jsonError(message, 500);
    }
  }

  // Admin: AI-draft a short reply to a comment, in the curator's voice.
  if (action === "comment-reply") {
    if (!(await isAdminRequest(request))) return jsonError("Admin access required.", 401);
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return jsonError("ANTHROPIC_API_KEY missing.", 500);
    const curatorName = String(payload.curatorName ?? "").trim() || "the curator";
    const style = String(payload.style ?? "").trim();
    const lookName = String(payload.lookName ?? "").trim();
    const commentText = String(payload.commentText ?? "").trim().slice(0, 400);
    const author = String(payload.authorName ?? "").trim();
    const client = new Anthropic({ apiKey });
    const prompt =
      `You are ${curatorName}, a fashion curator on LuxuryBandit${style ? ` (your style: ${style})` : ""}. ` +
      `${author ? `${author} ` : "Someone "}commented "${commentText}" on your look "${lookName || "a look"}". ` +
      `Reply in FIRST PERSON as ${curatorName}: warm, on-brand, max 12 words, no hashtags, no emojis-spam (1 emoji max), no quotation marks. ` +
      `Return ONLY the reply text, nothing else.`;
    try {
      const res = await client.messages.create({ model: SUGGEST_MODEL, max_tokens: 60, messages: [{ role: "user", content: prompt }] });
      const reply = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map(b => b.text).join("").trim().replace(/^["']|["']$/g, "").slice(0, 200);
      return NextResponse.json({ reply });
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "AI reply failed.", 500);
    }
  }

  // Admin: AI-reply a BATCH of comments in one go (concurrent generation, one save).
  if (action === "bulk-comment-reply") {
    if (!(await isAdminRequest(request))) return jsonError("Admin access required.", 401);
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return jsonError("ANTHROPIC_API_KEY missing.", 500);
    const ids = Array.isArray((payload as any).ids) ? (payload as any).ids.map(String).slice(0, 40) : [];
    if (!ids.length) return NextResponse.json({ replied: 0 });
    const state = await readTryThisLookState();
    const lookById = new Map(state.looks.map(l => [l.id, l]));
    const curById = new Map((state.curators ?? []).map(c => [c.id, c]));
    const targets = (state.comments ?? []).filter(c => ids.includes(c.id));
    const client = new Anthropic({ apiKey });
    const results = await Promise.all(targets.map(async (c) => {
      const look = lookById.get(c.lookId);
      const cur = (look as any)?.curatorId ? curById.get((look as any).curatorId) : undefined;
      const curatorName = cur ? `${(cur as any).firstName ?? ""} ${(cur as any).lastName ?? ""}`.trim() : "LuxuryBandit";
      const style = (cur as any)?.style ?? "";
      const prompt =
        `You are ${curatorName}, a fashion curator on LuxuryBandit${style ? ` (your style: ${style})` : ""}. ` +
        `${(c as any).authorName || "Someone"} commented "${String((c as any).text ?? "").slice(0, 300)}" on your look "${look?.name ?? "a look"}". ` +
        `Reply in FIRST PERSON as ${curatorName}: warm, on-brand, max 12 words, 1 emoji max, no hashtags, no quotation marks. Return ONLY the reply.`;
      try {
        const res = await client.messages.create({ model: SUGGEST_MODEL, max_tokens: 60, messages: [{ role: "user", content: prompt }] });
        const reply = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map(b => b.text).join("").trim().replace(/^["']|["']$/g, "").slice(0, 200);
        return reply ? { lookId: c.lookId, curatorName, reply, parentId: c.id, replyToName: (c as any).authorName ?? "" } : null;
      } catch { return null; }
    }));
    const now = new Date().toISOString();
    let replied = 0;
    if (!state.comments) state.comments = [];
    for (const r of results) {
      if (!r?.reply) continue;
      state.comments.unshift({ id: `${Date.now()}-${crypto.randomUUID()}`, lookId: r.lookId, authorName: r.curatorName, text: r.reply, parentId: r.parentId, replyToName: r.replyToName, createdAt: now } as any);
      replied++;
    }
    await saveTryThisLookState(state);
    return NextResponse.json({ replied });
  }

  if (action === "apply") {
    const firstName = String(payload.firstName ?? "").trim();
    const lastName = String(payload.lastName ?? "").trim();
    const email = String(payload.email ?? "").trim();
    if (!firstName || !lastName || !email) {
      return jsonError("Name and email are required.");
    }

    let photoPath: string | undefined;
    const photo = String(payload.photo ?? "");
    if (photo.startsWith("data:image/")) {
      try {
        photoPath = await uploadTryThisLookImage("uploads", photo);
      } catch {
        // Photo is optional — don't fail the whole application on upload error.
        photoPath = undefined;
      }
    }

    const curator: CuratorProfile = {
      id: `curator-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      firstName,
      lastName,
      email,
      phone: String(payload.phone ?? "").trim() || undefined,
      address: String(payload.address ?? "").trim() || undefined,
      brands: String(payload.brands ?? "").trim() || undefined,
      style: String(payload.style ?? "").trim() || undefined,
      genderFocus: String(payload.genderFocus ?? "").trim() || undefined,
      colors: String(payload.colors ?? "").trim() || undefined,
      fabrics: String(payload.fabrics ?? "").trim() || undefined,
      occasions: String(payload.occasions ?? "").trim() || undefined,
      priceTiers: String(payload.priceTiers ?? "").trim() || undefined,
      fitFocus: String(payload.fitFocus ?? "").trim() || undefined,
      ageFocus: String(payload.ageFocus ?? "").trim() || undefined,
      motto: String(payload.motto ?? "").trim() || undefined,
      bio: String(payload.bio ?? "").trim() || undefined,
      instagram: String(payload.instagram ?? "").trim().replace(/^@/, "") || undefined,
      photoPath,
      // TEMPORARY (admin choice): new curators are AUTO-APPROVED for now — they go
      // straight to "active" and can sign in / publish immediately. Flip this back to
      // "pending" to re-enable manual review & ID verification.
      status: "active",
      createdAt: new Date().toISOString(),
      credits: STARTER_CREDITS, // starter grant to prove themselves
      creditLog: [{ at: new Date().toISOString(), credits: STARTER_CREDITS, label: "Starter credits" }],
    };

    const state = await readTryThisLookState();
    const curators = [...(state.curators ?? []), curator];

    // Grow the taste databases from what the curator entered.
    const brands = mergeTags(state.brands ?? [], curator.brands ?? "");
    const styles = mergeTags(state.styles ?? [], curator.style ?? "");
    const colors = mergeTags(state.colors ?? [], curator.colors ?? "");
    const fabrics = mergeTags(state.fabrics ?? [], curator.fabrics ?? "");
    const occasions = mergeTags(state.occasions ?? [], curator.occasions ?? "");

    await saveTryThisLookState({ ...state, curators, brands, styles, colors, fabrics, occasions });

    notifyAdminWhatsApp(`👤 New curator (auto-approved): ${[firstName, lastName].filter(Boolean).join(" ")} (${email}). ${ADMIN_URL}`);

    // Auto-approved → return the curator so the front-end can log them straight into
    // the studio. (Re-enable review by setting status:"pending" above and dropping this.)
    return NextResponse.json({
      approved: true,
      firstName: curator.firstName,
      curator: { id: curator.id, firstName: curator.firstName, email: curator.email, style: curator.style ?? "" },
    });
  }

  // Email-only sign in (fallback while Supabase email/magic-link isn't set up).
  // Returns the curator if one exists with that email. Less strict than a
  // verified magic link — fine for the MVP; tighten once email works.
  if (action === "signin") {
    const email = String(payload.email ?? "").trim().toLowerCase();
    if (!email) return jsonError("Email is required.");
    const state = await readTryThisLookState();
    const c = (state.curators ?? []).find(x => (x.email ?? "").trim().toLowerCase() === email) ?? null;
    if (!c) return NextResponse.json({ curator: null });
    if (c.status === "deactivated") return jsonError("This account has been deactivated. Contact support.", 403);
    if (c.status === "pending") return jsonError("Your application is under review. We'll email you once you're approved.", 403);
    return NextResponse.json({ curator: { id: c.id, firstName: c.firstName, email: c.email, style: c.style } });
  }

  // Admin: activate / deactivate a curator account (deactivated = cannot sign in).
  if (action === "set-curator-status") {
    const isAdmin = await isAdminRequest(request);
    if (!isAdmin) return jsonError("Admin access required.", 401);
    const id = String(payload.id ?? "").trim();
    const next = payload.status === "deactivated" ? "deactivated" : "active";
    const state = await readTryThisLookState();
    const idx = (state.curators ?? []).findIndex(c => c.id === id);
    if (idx < 0) return jsonError("Profile not found.", 404);
    state.curators![idx] = { ...state.curators![idx], status: next };
    await saveTryThisLookState(state);
    return NextResponse.json({ ok: true, status: next });
  }

  // Activate/deactivate one of the curator's own looks (published on/off).
  if (action === "toggle-look") {
    const lookId = String(payload.lookId ?? "").trim();
    const published = payload.published === true;
    const state = await readTryThisLookState();
    const look = state.looks.find(l => l.id === lookId);
    if (!look) return jsonError("Look not found.", 404);
    const isAdmin = await isAdminRequest(request);
    const sessionId = request.headers.get("x-curator-id")?.trim();
    const tokenEmail = await emailFromToken(request);
    const owner = (state.curators ?? []).find(c => c.id === (look as any).curatorId);
    const ownsBySession = !!sessionId && sessionId === (look as any).curatorId;
    const ownsByToken = !!tokenEmail && !!owner && (owner.email ?? "").trim().toLowerCase() === tokenEmail;
    if (!isAdmin && !ownsBySession && !ownsByToken) return jsonError("Not allowed.", 403);
    (look as any).published = published;
    await saveTryThisLookState(state);
    return NextResponse.json({ ok: true });
  }

  if (action === "delete-look") {
    const lookId = String(payload.lookId ?? "").trim();
    const state = await readTryThisLookState();
    const look = state.looks.find(l => l.id === lookId);
    if (!look) return jsonError("Look not found.", 404);
    const isAdmin = await isAdminRequest(request);
    const sessionId = request.headers.get("x-curator-id")?.trim();
    const tokenEmail = await emailFromToken(request);
    const owner = (state.curators ?? []).find(c => c.id === (look as any).curatorId);
    const ownsBySession = !!sessionId && sessionId === (look as any).curatorId;
    const ownsByToken = !!tokenEmail && !!owner && (owner.email ?? "").trim().toLowerCase() === tokenEmail;
    if (!isAdmin && !ownsBySession && !ownsByToken) return jsonError("Not allowed.", 403);
    state.looks = state.looks.filter(l => l.id !== lookId);
    state.activeLookIds = (state.activeLookIds ?? []).filter(id => id !== lookId);
    if (state.activeLookId === lookId) state.activeLookId = state.looks[0]?.id;
    await saveTryThisLookState(state);
    return NextResponse.json({ ok: true });
  }

  // Curator's personal note/thoughts on their own look (shown on the frontend).
  // Owner/admin edits a published look's brand, name and/or description.
  // Only the fields present in the payload are touched.
  if (action === "update-look-meta") {
    const lookId = String(payload.lookId ?? "").trim();
    const state = await readTryThisLookState();
    const look = state.looks.find(l => l.id === lookId);
    if (!look) return jsonError("Look not found.", 404);
    const isAdmin = await isAdminRequest(request);
    const sessionId = request.headers.get("x-curator-id")?.trim();
    const tokenEmail = await emailFromToken(request);
    const owner = (state.curators ?? []).find(c => c.id === (look as any).curatorId);
    const ownsBySession = !!sessionId && sessionId === (look as any).curatorId;
    const ownsByToken = !!tokenEmail && !!owner && (owner.email ?? "").trim().toLowerCase() === tokenEmail;
    if (!isAdmin && !ownsBySession && !ownsByToken) return jsonError("Not allowed.", 403);
    if (typeof payload.brand === "string") (look as any).brand = payload.brand.trim() || undefined;
    if (typeof payload.name === "string" && payload.name.trim()) (look as any).name = payload.name.trim().slice(0, 140);
    if (typeof payload.productNote === "string") (look as any).productNote = payload.productNote.trim().slice(0, 800) || undefined;
    await saveTryThisLookState(state);
    return NextResponse.json({ ok: true, brand: (look as any).brand ?? "", name: look.name, productNote: (look as any).productNote ?? "" });
  }

  if (action === "update-look-note") {
    const lookId = String(payload.lookId ?? "").trim();
    const note = String(payload.note ?? "").trim().slice(0, 600);
    const state = await readTryThisLookState();
    const look = state.looks.find(l => l.id === lookId);
    if (!look) return jsonError("Look not found.", 404);
    const isAdmin = await isAdminRequest(request);
    const sessionId = request.headers.get("x-curator-id")?.trim();
    const tokenEmail = await emailFromToken(request);
    const owner = (state.curators ?? []).find(c => c.id === (look as any).curatorId);
    const ownsBySession = !!sessionId && sessionId === (look as any).curatorId;
    const ownsByToken = !!tokenEmail && !!owner && (owner.email ?? "").trim().toLowerCase() === tokenEmail;
    if (!isAdmin && !ownsBySession && !ownsByToken) return jsonError("Not allowed.", 403);
    (look as any).curatorNote = note || undefined;
    await saveTryThisLookState(state);
    return NextResponse.json({ ok: true, note });
  }

  // Curator turns comments on/off for their own look.
  if (action === "toggle-look-comments") {
    const lookId = String(payload.lookId ?? "").trim();
    const off = payload.commentsOff === true;
    const state = await readTryThisLookState();
    const look = state.looks.find(l => l.id === lookId);
    if (!look) return jsonError("Look not found.", 404);
    const isAdmin = await isAdminRequest(request);
    const sessionId = request.headers.get("x-curator-id")?.trim();
    const tokenEmail = await emailFromToken(request);
    const owner = (state.curators ?? []).find(c => c.id === (look as any).curatorId);
    const ownsBySession = !!sessionId && sessionId === (look as any).curatorId;
    const ownsByToken = !!tokenEmail && !!owner && (owner.email ?? "").trim().toLowerCase() === tokenEmail;
    if (!isAdmin && !ownsBySession && !ownsByToken) return jsonError("Not allowed.", 403);
    (look as any).commentsOff = off || undefined;
    await saveTryThisLookState(state);
    return NextResponse.json({ ok: true, commentsOff: off });
  }

  // Curator sets the feed order of their own looks (array of lookIds, top → bottom).
  if (action === "set-feed-order") {
    const order = Array.isArray((payload as any).order) ? (payload as any).order.map((x: any) => String(x)) : [];
    if (!order.length) return jsonError("Order is empty.");
    const state = await readTryThisLookState();
    const isAdmin = await isAdminRequest(request);
    const sessionId = request.headers.get("x-curator-id")?.trim();
    const tokenEmail = await emailFromToken(request);
    let assigned = 0;
    order.forEach((lookId: string, idx: number) => {
      const look = state.looks.find(l => l.id === lookId);
      if (!look) return;
      const owner = (state.curators ?? []).find(c => c.id === (look as any).curatorId);
      const ownsBySession = !!sessionId && sessionId === (look as any).curatorId;
      const ownsByToken = !!tokenEmail && !!owner && (owner.email ?? "").trim().toLowerCase() === tokenEmail;
      if (!isAdmin && !ownsBySession && !ownsByToken) return; // skip looks not owned
      (look as any).feedOrder = idx;
      assigned++;
    });
    await saveTryThisLookState(state);
    return NextResponse.json({ ok: true, assigned });
  }

  if (action === "update") {
    const id = String(payload.id ?? "").trim();
    const state = await readTryThisLookState();
    const idx = (state.curators ?? []).findIndex(c => c.id === id);
    if (idx < 0) return jsonError("Profile not found.", 404);
    const cur = state.curators![idx];

    // Authorized if: admin PIN, OR a verified token whose email matches, OR the
    // matching curator-session header (their own id from this device).
    const isAdmin = await isAdminRequest(request);
    const tokenEmail = await emailFromToken(request);
    const ownsBySession = request.headers.get("x-curator-id") === id;
    const ownsByToken = tokenEmail && tokenEmail === (cur.email ?? "").trim().toLowerCase();
    if (!isAdmin && !ownsByToken && !ownsBySession) {
      return jsonError("Not allowed.", 403);
    }

    const str = (k: string, fallback?: string) => {
      const v = payload[k];
      return v === undefined ? fallback : (String(v).trim() || undefined);
    };
    // Email is the account key — only the admin may change it directly (no
    // verification). Self-edits keep their email (use a verified change flow).
    const newEmail = isAdmin && typeof payload.email === "string" && payload.email.trim()
      ? payload.email.trim().toLowerCase()
      : cur.email;
    const updated: CuratorProfile = {
      ...cur,
      email: newEmail,
      firstName: str("firstName", cur.firstName) || cur.firstName,
      lastName: str("lastName", cur.lastName) || cur.lastName,
      phone: str("phone", cur.phone),
      address: str("address", cur.address),
      instagram: (str("instagram", cur.instagram) ?? "").replace(/^@/, "") || undefined,
      brands: str("brands", cur.brands),
      style: str("style", cur.style),
      genderFocus: str("genderFocus", cur.genderFocus),
      colors: str("colors", cur.colors),
      fabrics: str("fabrics", cur.fabrics),
      occasions: str("occasions", cur.occasions),
      priceTiers: str("priceTiers", cur.priceTiers),
      fitFocus: str("fitFocus", cur.fitFocus),
      ageFocus: str("ageFocus", cur.ageFocus),
      motto: str("motto", cur.motto),
      bio: str("bio", cur.bio),
      // Baseline follower count — admin only (it's a presentation number).
      followerBoost: isAdmin && payload.followerBoost !== undefined
        ? Math.max(0, Math.floor(Number(payload.followerBoost) || 0))
        : cur.followerBoost,
    };
    // Optional new photo
    const photo = String(payload.photo ?? "");
    if (photo.startsWith("data:image/")) {
      try { updated.photoPath = await uploadTryThisLookImage("uploads", photo); } catch { /* keep old */ }
    }

    const curators = [...state.curators!]; curators[idx] = updated;
    const brands = mergeTags(state.brands ?? [], updated.brands ?? "");
    const styles = mergeTags(state.styles ?? [], updated.style ?? "");
    const colors = mergeTags(state.colors ?? [], updated.colors ?? "");
    const fabrics = mergeTags(state.fabrics ?? [], updated.fabrics ?? "");
    const occasions = mergeTags(state.occasions ?? [], updated.occasions ?? "");
    await saveTryThisLookState({ ...state, curators, brands, styles, colors, fabrics, occasions });
    return NextResponse.json({ ok: true });
  }

  if (action === "set-credits") {
    const isAdmin = await isAdminRequest(request);
    if (!isAdmin) return jsonError("Admin access required.", 401);
    const id = String(payload.id ?? "").trim();
    if (!id) return jsonError("Missing curator id.");
    const opts: { credits?: number; resetSpent?: boolean; addCredits?: number } = {};
    if (typeof payload.credits === "number") opts.credits = payload.credits;
    if (typeof payload.addCredits === "number") opts.addCredits = payload.addCredits;
    if (payload.resetSpent === true) opts.resetSpent = true;
    const info = await setCuratorCredits(id, opts);
    if (!info) return jsonError("Curator not found.", 404);
    return NextResponse.json({ ok: true, credits: info });
  }

  // Admin: give every curator a baseline follower count in one write. Varied so
  // they don't all read the same number. min/max optional (defaults 112k–620k).
  if (action === "boost-all-followers") {
    const isAdmin = await isAdminRequest(request);
    if (!isAdmin) return jsonError("Admin access required.", 401);
    const min = Math.max(0, Math.floor(Number(payload.min) || 112000));
    const max = Math.max(min, Math.floor(Number(payload.max) || 620000));
    const state = await readTryThisLookState();
    const curators = (state.curators ?? []).map(c => ({
      ...c,
      followerBoost: Math.round((min + Math.random() * (max - min)) / 100) * 100,
    }));
    await saveTryThisLookState({ ...state, curators });
    return NextResponse.json({ ok: true, count: curators.length, min, max });
  }

  return jsonError("Unknown action.");
}
