import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  readTryThisLookState,
  saveTryThisLookState,
  uploadTryThisLookImage,
  writeCardStudioSlides,
  getPricingConfig,
  type CuratorProfile,
  type BellaSlide,
} from "@/lib/try-this-look-store";
import { setCuratorCredits, grantCredits, awardEngagementCredits, getCuratorCredits, STARTER_CREDITS, TRYON_CREDITS, SEARCH_CREDITS, VIDEO_CREDITS } from "@/lib/curator-budget";
import { notifyAdminWhatsApp, ADMIN_URL } from "@/lib/notify-admin";
import { isAdminRequest } from "@/lib/admin-auth";
import { influencerPriceCents, fmtPriceCents } from "@/lib/influencer-price";
import crypto from "crypto";

// One-click consent token (matches /api/curator-confirm) — only the person who got the email can confirm.
function consentToken(email: string): string {
  const secret = process.env.TRY_THIS_LOOK_ADMIN_PIN || "luxurybandit";
  return crypto.createHmac("sha256", secret).update(email.trim().toLowerCase()).digest("hex").slice(0, 24);
}

// The self-service onboarding email (steps to complete a model profile) — sent AUTOMATICALLY on
// apply, and re-sendable from the admin for anyone who applied before this template / missed it.
function modelOnboardingEmail(email: string, firstName?: string) {
  const hi = firstName ? ` ${firstName}` : "";
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://luxurybandit.com";
  const profileUrl = `${site}/curators/profile`;
  const rulesUrl = `${site}/model-rules`;
  const confirmUrl = `${site}/api/curator-confirm?e=${encodeURIComponent(email)}&t=${consentToken(email)}`;
  return {
    subject: "Complete your LuxuryBandit Model profile 💛",
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111">
  <p style="font-size:16px">Hi${hi},</p>
  <p>Thank you for applying to become a <b>LuxuryBandit Model</b>. 💛 We&apos;ve got your photos and details from your application — our team is <b>reviewing your profile now</b>.</p>
  <p>Please also <b>read and accept our <a href="${rulesUrl}" style="color:#b8860b">model rules &amp; terms</a></b> if you haven&apos;t already.</p>
  <div style="background:#faf7f0;border:1px solid #eadfc6;border-radius:12px;padding:14px 16px;margin:16px 0">
    <p style="margin:0 0 6px;font-size:14px"><b>💰 How you earn:</b> fans subscribe to unlock your private world, and you keep <b>50%</b> of every subscription — it lands in your account automatically. The more fans pick <b>you</b>, the more you earn. <a href="${site}/earnings" style="color:#b8860b">See how earnings work →</a></p>
    <p style="margin:0 0 6px;font-size:14px"><b>📸 Make your profile irresistible:</b> once you&apos;re in, add more photos &amp; videos in <a href="${site}/my-studio" style="color:#b8860b">My Studio</a> — the more you post, the more fans discover and subscribe to you.</p>
    <p style="margin:0;font-size:14px"><b>⚠️ We review every profile.</b> Photos that are <b>blurry</b>, hide your face (hat/sunglasses), or don’t fit our <b>luxury concept</b> can be <b>rejected</b>. Please use clear, well-lit, high-quality photos.</p>
  </div>
  <div style="background:#2a2320;border:1px solid #4a3f33;border-radius:12px;padding:16px;margin:18px 0;color:#f0e9dc">
    <p style="margin:0 0 8px;font-size:14px;font-weight:800;color:#e7c877">Please confirm — required to activate your profile:</p>
    <p style="margin:0 0 12px;font-size:14px;line-height:1.55">LuxuryBandit is an <b>18+ platform</b>. By joining, you agree that users can view you wearing <b>lingerie</b> in AI try-on videos. Your profile stays <b>paused</b> until you confirm below <b>and</b> your photos are approved.</p>
    <p style="text-align:center;margin:0"><a href="${confirmUrl}" style="display:inline-block;background:#e7c877;color:#000;text-decoration:none;font-weight:800;padding:13px 26px;border-radius:999px">I’m 18+ &amp; I agree — confirm ✓</a></p>
  </div>
  <p style="text-align:center;margin:18px 0"><a href="${profileUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-weight:800;padding:13px 26px;border-radius:999px">Open my profile →</a></p>
  <p style="font-size:13px;color:#666">Once you’ve confirmed and your photos are approved, we activate your profile and you can start earning.</p>
  <p>Talk soon,<br/>The LuxuryBandit Team</p>
</div>`,
  };
}

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

  // Live availability check for a model name (unique public identity). Case/space-insensitive.
  const checkName = url.searchParams.get("checkName");
  if (checkName !== null) {
    const nrm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
    const q = nrm(checkName);
    const excludeId = url.searchParams.get("excludeId") || "";
    if (!q) return NextResponse.json({ available: false, empty: true });
    // A name is only "taken" by a curator that is NOT an unpaid application (paid !== false).
    // Legacy/approved curators have no `paid` flag → they still reserve their name.
    const taken = (state.curators ?? []).some(c => c.id !== excludeId && (c as any).paid !== false && (c as any).modelName && nrm(String((c as any).modelName)) === q);
    return NextResponse.json({ available: !taken });
  }

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
    // The verification selfie is PRIVATE — only the admin (reviewing her) may see it.
    const adminView = await isAdminRequest(request);
    // Grow-price (public): her current appreciating ASSET value, shown daily on her profile.
    // base (admin/quality) + $3.99/video + $3/look + $1/day owned (since purchase, else created).
    const nmKey = [c.firstName, c.lastName].filter(Boolean).join(" ").trim().toLowerCase();
    let lookCount = 0, videoCount = 0;
    for (const g of (state.generations ?? [])) {
      if ((g as any).feed !== true) continue;
      const gn = String((g as any).customerName ?? "").trim().toLowerCase();
      if (gn && gn === nmKey) { lookCount++; if ((g as any).videoUrl) videoCount++; }
    }
    // Super-followers (real registered follows) → +$1 each on her LB-Value.
    const superFollowers = (state.follows ?? []).filter((f: any) => f.followeeType === "user" && f.followeeSlug === c.id).length;
    // Flagship tier base values come from the admin price list (3 tiers).
    const pr = await getPricingConfig();
    const flagshipBases = [pr.flagshipBase1Cents, pr.flagshipBase2Cents, pr.flagshipBase3Cents];
    const growPriceCents = influencerPriceCents({
      name: nmKey, flagship: (c as any).flagship, realModel: (c as any).realModel === true,
      videoCount, lookCount, followerCount: superFollowers, purchasedAt: (c as any).purchasedAt, createdAt: (c as any).createdAt,
      flagshipTier: (c as any).flagshipTier, flagshipBases,
    });
    // Does the VIEWER own her? Try-ons are now only for your OWN influencers.
    const requesterEmail = (await emailFromToken(request)).trim().toLowerCase();
    const youOwnHer = !!(c as any).ownerEmail && requesterEmail === String((c as any).ownerEmail).trim().toLowerCase();
    return NextResponse.json({ profile: {
      id: c.id, firstName: c.firstName, lastName: c.lastName, modelName: (c as any).modelName ?? "", motto: c.motto, bio: c.bio,
      title: (c as any).title ?? "", intro: (c as any).intro ?? "", sponsor: (c as any).sponsor ?? "",
      photoUrl: c.photoUrl, photoFullUrl: (c as any).photoFullUrl, photoBodyUrls: (c as any).photoBodyUrls ?? [], instagram: c.instagram, style: c.style, brands: c.brands, genderFocus: c.genderFocus, country: (c as any).country ?? "",
      ...(adminView ? { hasPrevPhoto: !!(c as any).photoPathPrev } : {}),
      // Vanity baselines (admin-set) — added to the real sums on her stats row.
      likeBoost: (c as any).likeBoost ?? 0, viewBoost: (c as any).viewBoost ?? 0,
      realBadge: (c as any).realBadge === true,
      realModel: (c as any).realModel === true,
      flagship: (c as any).flagship === true,
      flagshipTier: (c as any).flagshipTier ?? 1,
      flagshipBases,
      // Grow-pricing (public): current value + whether she's listed for sale. Explicit forSale
      // flag (admin/owner-set) wins; otherwise an unowned model defaults to on-the-market.
      growPriceCents, growPriceLabel: fmtPriceCents(growPriceCents),
      forSale: typeof (c as any).forSale === "boolean" ? (c as any).forSale : !(c as any).ownerEmail,
      owned: !!(c as any).ownerEmail, youOwnHer,
      // Owner NAME + short ID. The owner can hide their name (privacy) and keep only the ID.
      owner: (() => {
        const oe = String((c as any).ownerEmail || "").trim().toLowerCase();
        if (!oe) return "";
        const acc = (state.curators ?? []).find(x => String((x as any).email || "").trim().toLowerCase() === oe) as any;
        const accName = acc ? (String(acc.modelName || "").trim() || [acc.firstName, acc.lastName].filter(Boolean).join(" ").trim()) : "";
        if (accName) return accName;
        const local = oe.split("@")[0].split(/[._-]/)[0];
        return local ? local.charAt(0).toUpperCase() + local.slice(1) : "";
      })(),
      ownerId: (c as any).ownerEmail ? `#${crypto.createHash("sha1").update(String((c as any).ownerEmail).toLowerCase()).digest("hex").slice(0, 5).toUpperCase()}` : "",
      ownerHideName: (c as any).ownerHideName === true,
      lookCount, videoCount, superFollowers, purchasedAt: (c as any).purchasedAt ?? "", createdAt: (c as any).createdAt ?? "",
      // Admin sees who owns her; the buyer can tell it's theirs (compared client-side to their email).
      ...(adminView ? { ownerEmail: (c as any).ownerEmail ?? "" } : {}),
      ...(adminView ? { verificationSelfieUrl: (c as any).verificationSelfieUrl ?? "", phone: c.phone ?? "", status: (c as any).status ?? "active", hidden: (c as any).hidden === true, priceCents: (c as any).priceCents ?? 0, profilePhotoUrls: (c as any).profilePhotoUrls ?? [] } : {}),
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
      // Real engagement per look for the studio insights row.
      const tryOnByLook = new Map<string, number>();
      for (const g of state.generations ?? []) { const k = (g as any).lookId; if (k) tryOnByLook.set(k, (tryOnByLook.get(k) ?? 0) + 1); }
      const commentsByLook = new Map<string, number>();
      for (const c of state.comments ?? []) { const k = (c as any).lookId; if (k) commentsByLook.set(k, (commentsByLook.get(k) ?? 0) + 1); }
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
        .map(l => ({ id: l.id, name: l.name, imageUrl: (l as any).frontImageUrl ?? l.imageUrl, published: l.published !== false, altCount: ((l as any).alternatives ?? []).length, locationCount: ((l as any).locationDupes ?? []).length, alternatives: (l as any).alternatives ?? [], locationDupes: (l as any).locationDupes ?? [], clicks: (l as any).clicks ?? {}, viewCount: (l as any).viewCount ?? 0, likeCount: (l as any).likeCount ?? 0, tryOnCount: tryOnByLook.get(l.id) ?? 0, commentCount: commentsByLook.get(l.id) ?? 0, clothesImageUrl: (l as any).clothesImageUrl ?? "", locationImageUrl: (l as any).locationImageUrl ?? "", note: ((l as any).curatorNote || (l as any).productNote) ?? "", commentsOff: (l as any).commentsOff === true, videoUrl: (l as any).videoUrl ?? "", brand: (l as any).brand ?? "", category: (l as any).category ?? "", description: (l as any).productNote ?? "", feedOrder: typeof (l as any).feedOrder === "number" ? (l as any).feedOrder : undefined }));
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
    // Optional rough free-text from the model ("what I'm about / what I want") — enough
    // on its own; with nothing at all the AI writes a generic luxury-fashion persona.
    const hint = String(payload.hint ?? "").trim().slice(0, 500);
    // Existing motto/bio to POLISH (edit mode) rather than invent from scratch.
    const current = String((payload as any).current ?? "").trim().slice(0, 400);

    const client = new Anthropic({ apiKey });
    const prompt =
      `A fashion model on LuxuryBandit (AI virtual try-on for luxury fashion). ` +
      `Brands they love: ${brands || "(not given)"}. Their style: ${style || "(not given)"}. ` +
      `In their own rough words: ${hint || "(nothing given)"}.\n` +
      (current
        ? `They ALREADY wrote this — POLISH & improve it (fix grammar, make it punchier, keep their voice; don't invent a totally new persona): "${current}".\n\n`
        : `Invent a tasteful luxury-fashion persona for them.\n\n`) +
      `Return STRICT JSON only, no prose, shape:\n` +
      `{"mottos":["...","...","..."],"bio":"..."}\n` +
      `- "mottos": 3 short, punchy English taglines (max 6 words each) that fit this model's taste. Aspirational, on-brand with "Bandit the look!". No hashtags, no quotes inside.\n` +
      `- "bio": one English sentence (max 160 chars) describing this model's eye/taste for their public profile.`;

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

  // Admin: (re)send the self-service onboarding-steps email to an applicant who missed it.
  if (action === "resend-onboarding") {
    if (!(await isAdminRequest(request))) return jsonError("Admin access required.", 401);
    const email = String((payload as { email?: string }).email ?? "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return jsonError("Valid email required.");
    const st = await readTryThisLookState();
    const cur = (st.curators ?? []).find(c => (c.email ?? "").toLowerCase() === email.toLowerCase());
    try {
      const { sendEmail } = await import("@/lib/email-send");
      const mail = modelOnboardingEmail(email, cur?.firstName);
      await sendEmail({ to: email, subject: mail.subject, html: mail.html });
      return NextResponse.json({ ok: true });
    } catch { return jsonError("Could not send the email.", 502); }
  }

  // Confirm a paid subscription → reserve the applicant's name (flip paid:false → true).
  // Verified server-side against Stripe (never trust the client). Called after checkout.
  if (action === "confirm-paid") {
    const email = String((payload as any).email ?? "").trim().toLowerCase();
    if (!email) return jsonError("email required.");
    let active = false;
    try { const { hasActiveSubscription } = await import("@/lib/stripe"); active = await hasActiveSubscription(email); } catch { /**/ }
    if (!active) return NextResponse.json({ ok: true, paid: false, active: false });
    const state = await readTryThisLookState();
    const matches = (state.curators ?? []).filter(c => (c.email ?? "").trim().toLowerCase() === email);
    for (const c of matches) { (c as any).paid = true; (c as any).onboardedAt = new Date().toISOString(); } // reserve the name
    if (matches.length) await saveTryThisLookState(state);
    // Send the onboarding email (set-password link → dashboard) to EVERY matching curator, every
    // time it's confirmed. /welcome stops polling on the first paid:true, so it's normally one send.
    const origin = request.headers.get("origin")?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://luxurybandit.com";
    const sends: any[] = [];
    try {
      const { sendOnboardingEmail } = await import("@/lib/onboarding-email");
      for (const c of matches) { sends.push(await sendOnboardingEmail(c, origin).catch(e => ({ ok: false, error: String(e) }))); }
    } catch (e) { sends.push({ ok: false, error: String(e) }); }
    return NextResponse.json({ ok: true, paid: true, active: true, curators: matches.length, emailed: matches.length, sends });
  }

  // Admin: set base prices for the existing models in one shot — everyone $9.99 unless a base
  // is already set; flagship names (Gina/Bella/Isabella) → $500. Idempotent (won't overwrite
  // a price already set). The admin can still adjust individual prices afterwards via `update`.
  if (action === "seed-base-prices") {
    if (!(await isAdminRequest(request))) return jsonError("Not allowed.", 403);
    const force = (payload as any).force === true;
    const state = await readTryThisLookState();
    const flagship = /\b(gina|bella|isabella)\b/i;
    let set = 0;
    for (const c of state.curators ?? []) {
      if (!force && typeof (c as any).priceCents === "number" && (c as any).priceCents > 0) continue;
      const nm = `${(c as any).modelName ?? ""} ${c.firstName ?? ""} ${c.lastName ?? ""}`;
      (c as any).priceCents = flagship.test(nm) ? 50000 : 999;
      set++;
    }
    if (set) await saveTryThisLookState(state);
    return NextResponse.json({ ok: true, priced: set, total: (state.curators ?? []).length });
  }

  // Promote AI faces → sellable influencers. Each un-promoted face in the pool
  // becomes a real curator/influencer (so it gets a /curator/[id] profile, a price,
  // and shows up in the Models list like the others). Auto-named "Model N" ($9.99,
  // private + unowned/for-sale); the admin renames + reprices later. The face STAYS
  // in the library, marked `promotedTo` so it's not converted twice.
  if (action === "promote-faces") {
    if (!(await isAdminRequest(request))) return jsonError("Not allowed.", 403);
    const state = await readTryThisLookState();
    const faces = state.avatarFaces ?? [];
    const curators = [...(state.curators ?? [])];
    // Next free "Model N" number (don't collide with existing auto-named ones).
    let n = 0;
    for (const c of curators) {
      for (const s of [String((c as any).modelName ?? ""), String(c.firstName ?? "")]) {
        const m = /^model\s+(\d+)$/i.exec(s.trim());
        if (m) n = Math.max(n, parseInt(m[1], 10));
      }
    }
    const pathFrom = (f: any): string | undefined => {
      if (f.imagePath) return String(f.imagePath);
      const u = String(f.imageUrl ?? "");
      const mm = /\/object\/(?:sign|public)\/[^/]+\/(.+?)(?:\?|$)/.exec(u);
      return mm ? decodeURIComponent(mm[1]) : undefined;
    };
    let made = 0;
    for (let i = 0; i < faces.length; i++) {
      const f: any = faces[i];
      if (f.sold || f.promotedTo || f.claimedBy) continue;
      const photoPath = pathFrom(f);
      if (!photoPath) continue;
      n += 1;
      const name = `Model ${n}`;
      const id = `curator-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;
      const cur: CuratorProfile = {
        id,
        firstName: name,
        lastName: "",
        modelName: name,
        email: "", // unowned — no owner yet (for sale)
        imageSource: "ours",
        avatarFaceId: f.id,
        photoPath,
        photoFullPath: photoPath,
        priceCents: 999,
        status: "active",
        hidden: true, // private until the admin makes her public
        paid: false,  // unowned — doesn't reserve the name
        createdAt: f.createdAt || new Date().toISOString(),
      } as CuratorProfile;
      curators.push(cur);
      f.promotedTo = id; // mark the face so it isn't promoted again (stays in the pool)
      made++;
    }
    if (made) await saveTryThisLookState({ ...state, curators, avatarFaces: faces });
    return NextResponse.json({ ok: true, promoted: made, total: curators.length });
  }

  // Owner privacy: the OWNER (buyer) or an admin can hide the owner's name on the card (keep ID).
  if (action === "set-owner-hide-name") {
    const id = String((payload as any).id ?? "").trim();
    const hide = (payload as any).hide === true;
    const state = await readTryThisLookState();
    const idx = (state.curators ?? []).findIndex(c => c.id === id);
    if (idx < 0) return jsonError("Model not found.", 404);
    const cur = state.curators[idx] as any;
    const admin = await isAdminRequest(request);
    const requester = (await emailFromToken(request)).trim().toLowerCase();
    const isOwner = !!cur.ownerEmail && requester === String(cur.ownerEmail).trim().toLowerCase();
    if (!admin && !isOwner) return jsonError("Only the owner or an admin can change this.", 403);
    state.curators[idx] = { ...cur, ownerHideName: hide };
    await saveTryThisLookState(state);
    return NextResponse.json({ ok: true, ownerHideName: hide });
  }

  if (action === "apply") {
    const firstName = String(payload.firstName ?? "").trim();
    const lastName = String(payload.lastName ?? "").trim();
    const email = String(payload.email ?? "").trim();
    const modelName = String((payload as any).modelName ?? "").trim();
    if (!firstName || !lastName || !email) {
      return jsonError("Name and email are required.");
    }
    if (!modelName) return jsonError("Please choose your model name.");

    let photoPath: string | undefined;
    let photoFullPath: string | undefined;
    let photoBodyPaths: string[] | undefined;
    let profilePhotoPaths: string[] | undefined;
    const photo = String(payload.photo ?? "");
    // The cropper exports a SQUARE avatar — also keep the ORIGINAL (portrait) photo
    // so her profile lightbox/hero can show it uncropped.
    const photoFull = String((payload as any).photoFull ?? "");
    // Candidate PROFILE photos (up to 4) — she uploads several, the admin picks her best one.
    const profilePhotos = Array.isArray((payload as any).profilePhotos)
      ? ((payload as any).profilePhotos as unknown[]).filter((b): b is string => typeof b === "string" && b.startsWith("data:image/")).slice(0, 4)
      : [];
    // Full-body dressed photos (3:4 crops, up to 2) — the try-on references.
    const bodyPhotos = Array.isArray((payload as any).bodyPhotos)
      ? ((payload as any).bodyPhotos as unknown[]).filter((b): b is string => typeof b === "string" && b.startsWith("data:image/")).slice(0, 2)
      : [];
    if (photo.startsWith("data:image/") || profilePhotos.length) {
      try {
        if (profilePhotos.length) {
          profilePhotoPaths = await Promise.all(profilePhotos.map(b => uploadTryThisLookImage("uploads", b)));
          photoPath = profilePhotoPaths[0]; // default main = her first pick; admin can switch it
        }
        if (photo.startsWith("data:image/")) {
          photoPath = await uploadTryThisLookImage("uploads", photo);
        }
        if (photoFull.startsWith("data:image/")) {
          photoFullPath = await uploadTryThisLookImage("uploads", photoFull);
        }
        if (bodyPhotos.length) {
          photoBodyPaths = await Promise.all(bodyPhotos.map(b => uploadTryThisLookImage("uploads", b)));
        }
      } catch (e) {
        // She DID pick a photo — losing it silently made profiles ship without one.
        // Fail loudly so she can retry instead of discovering it later.
        console.error("apply: photo upload failed", e);
        return jsonError("Your photo could not be uploaded — please try again (or use a smaller image).", 500);
      }
    }

    const curator: CuratorProfile = {
      id: `curator-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      firstName,
      lastName,
      modelName,
      email,
      phone: String(payload.phone ?? "").trim() || undefined,
      address: String(payload.address ?? "").trim() || undefined,
      country: String(payload.country ?? "").trim().toUpperCase().slice(0, 2) || undefined,
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
      // Card identity — brand title ("Monaco Influencer"), ABOUT-slide intro, sponsor.
      title: String((payload as any).title ?? "").trim() || undefined,
      intro: String((payload as any).intro ?? "").trim() || undefined,
      sponsor: String((payload as any).sponsor ?? "").trim() || undefined,
      instagram: String(payload.instagram ?? "").trim().replace(/^@/, "") || undefined,
      photoPath,
      photoFullPath,
      photoBodyPaths,
      profilePhotoPaths,
      // Model applications are REVIEWED: they start "pending" and the admin approves
      // (Power button in the Models list) before they can sign in. This gates the
      // "Werde Model" ad traffic — no self-service accounts go live unchecked.
      // No approval step: she goes live IMMEDIATELY but PRIVATE — active (she can sign in &
      // use her influencer) yet hidden from the public models gallery. Admin flips her public
      // (un-hide) when everything looks right.
      status: "active",
      hidden: true,
      // Not paid yet — the name is NOT reserved until the subscription is confirmed
      // (see `confirm-paid`). Unpaid applications never block a name for someone else.
      paid: false,
      createdAt: new Date().toISOString(),
      // CONCEPT 2.0: which role model's style she emulates + where her face comes from
      // ("own" verified photos vs "ours" = platform images — never a third person's face).
      ...(String((payload as any).styleModelId ?? "").trim() ? { styleModelId: String((payload as any).styleModelId).trim() } : {}),
      imageSource: (payload as any).imageSource === "ours" ? "ours" : "own",
      ...(String((payload as any).avatarFaceId ?? "").trim() ? { avatarFaceId: String((payload as any).avatarFaceId).trim() } : {}),
      // Audit trail: record that (and when) she accepted the model rules & terms.
      ...(payload.consent === true ? {
        consentAt: new Date().toISOString(),
        consentText: String((payload as any).consentText ?? "").trim() || "Accepted the model rules & terms (18+, real photos).",
      } : {}),
      credits: STARTER_CREDITS, // starter grant to prove themselves
      creditLog: [{ at: new Date().toISOString(), credits: STARTER_CREDITS, label: "Starter credits" }],
    };

    const state = await readTryThisLookState();
    // Model names must be UNIQUE (public identity). If it's taken, she picks another.
    const nrmName = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
    // Only a PAID (or legacy/approved) curator reserves a name — not another pending, unpaid
    // application. So filling the form never books the name before the subscription is paid.
    if ((state.curators ?? []).some(c => (c as any).paid !== false && (c as any).modelName && nrmName(String((c as any).modelName)) === nrmName(modelName))) {
      return jsonError("That model name is already taken — please choose another.", 409);
    }
    const curators = [...(state.curators ?? []), curator];

    // Record the DESIRED AI face — but DON'T book it yet. Booking happens only when she pays
    // the $3.99 (avatar-face-checkout → checkout-status). If it's already taken, drop it so
    // she picks another. This keeps the face free until it's actually bought.
    const wantFace = String((payload as any).avatarFaceId ?? "").trim();
    if (wantFace && (curator as any).imageSource === "ours") {
      const face = (state.avatarFaces ?? []).find(f => f.id === wantFace);
      if (!face || face.claimedBy) delete (curator as any).avatarFaceId; // gone or already booked → she'll pick + pay for another
    }

    // Grow the taste databases from what the curator entered.
    const brands = mergeTags(state.brands ?? [], curator.brands ?? "");
    const styles = mergeTags(state.styles ?? [], curator.style ?? "");
    const colors = mergeTags(state.colors ?? [], curator.colors ?? "");
    const fabrics = mergeTags(state.fabrics ?? [], curator.fabrics ?? "");
    const occasions = mergeTags(state.occasions ?? [], curator.occasions ?? "");

    await saveTryThisLookState({ ...state, curators, brands, styles, colors, fabrics, occasions });

    notifyAdminWhatsApp(`👤 New MODEL application (pending review): ${[firstName, lastName].filter(Boolean).join(" ")} (${email}). Approve: ${ADMIN_URL}`);

    // Confirmation email to the applicant (non-blocking) — so she knows it arrived.
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email))) {
      try {
        const { sendEmail } = await import("@/lib/email-send");
        const mail = modelOnboardingEmail(String(email), curator.firstName);
        await sendEmail({
          to: String(email),
          bcc: process.env.SUPPORT_EMAIL?.trim() || "support@luxurybandit.com", // copy to the team
          subject: mail.subject,
          html: mail.html,
        });
      } catch { /* email is best-effort */ }
    }

    // Her 4 card-slide photos (last two private) → write them straight into HER Card-Studio blob,
    // so her card has content the moment she's approved. Best-effort; the application still succeeds.
    try {
      const rawSlides = Array.isArray((payload as any).slides) ? (payload as any).slides : [];
      const imgs = rawSlides.filter((s: any) => typeof s?.image === "string" && s.image.startsWith("data:image/")).slice(0, 4);
      if (imgs.length) {
        const built: BellaSlide[] = [];
        for (let i = 0; i < imgs.length; i++) {
          const path = await uploadTryThisLookImage("uploads", imgs[i].image);
          built.push({ id: crypto.randomUUID(), kind: "image", path, private: imgs[i].private === true, order: i, createdAt: new Date(Date.now() + i).toISOString() });
        }
        await writeCardStudioSlides(built, curator.id);
      }
    } catch { /* slides are best-effort */ }

    // Pending review → NO session is returned (she cannot act until the admin
    // approves her via the Models list; signin blocks "pending" too).
    return NextResponse.json({ approved: false, pending: true, firstName: curator.firstName, curatorId: curator.id, avatarFaceId: (curator as any).avatarFaceId ?? "" });
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

  // Anyone can REPORT a profile → the admin gets a WhatsApp to review it.
  if (action === "report-profile") {
    const id = String(payload.id ?? "").trim();
    const reason = String((payload as any).reason ?? "").trim().slice(0, 300);
    const state = await readTryThisLookState();
    const c = (state.curators ?? []).find(x => x.id === id);
    const name = c ? [c.firstName, c.lastName].filter(Boolean).join(" ") || id : id;
    notifyAdminWhatsApp(`🚩 Profile REPORTED: ${name} (${id})${reason ? ` — "${reason}"` : ""}. Review: ${ADMIN_URL}/curator/${id}`);
    return NextResponse.json({ ok: true });
  }

  // Admin: pick which of the applicant's candidate profile photos becomes her main photo.
  if (action === "set-profile-photo") {
    const isAdmin = await isAdminRequest(request);
    if (!isAdmin) return jsonError("Admin access required.", 401);
    const id = String(payload.id ?? "").trim();
    const index = Math.max(0, Math.floor(Number(payload.index) || 0));
    const state = await readTryThisLookState();
    const idx = (state.curators ?? []).findIndex(c => c.id === id);
    if (idx < 0) return jsonError("Profile not found.", 404);
    const candidates = state.curators![idx].profilePhotoPaths ?? [];
    if (!candidates[index]) return jsonError("No such photo.", 404);
    state.curators![idx] = { ...state.curators![idx], photoPathPrev: (state.curators![idx] as any).photoPath, photoPath: candidates[index] };
    await saveTryThisLookState(state);
    return NextResponse.json({ ok: true });
  }

  // Admin: RESTORE the previous profile photo (undo an accidental replace). Swaps current ↔ backup,
  // so tapping it again re-does the change.
  if (action === "restore-photo") {
    const isAdmin = await isAdminRequest(request);
    if (!isAdmin) return jsonError("Admin access required.", 401);
    const id = String(payload.id ?? "").trim();
    const state = await readTryThisLookState();
    const idx = (state.curators ?? []).findIndex(c => c.id === id);
    if (idx < 0) return jsonError("Profile not found.", 404);
    const c = state.curators![idx] as any;
    if (!c.photoPathPrev) return jsonError("No previous photo to restore.", 400);
    state.curators![idx] = { ...c, photoPath: c.photoPathPrev, photoPathPrev: c.photoPath };
    await saveTryThisLookState(state);
    return NextResponse.json({ ok: true });
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
    const prev = (state.curators![idx] as any).status ?? "active";
    const model = state.curators![idx];
    state.curators![idx] = { ...model, status: next };
    await saveTryThisLookState(state);

    // Approval → tell her (once, on the transition TO active). Non-blocking.
    if (next === "active" && prev !== "active" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(model.email ?? ""))) {
      try {
        const { sendEmail } = await import("@/lib/email-send");
        const hi = model.firstName ? ` ${model.firstName}` : "";
        const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://luxurybandit.com";
        await sendEmail({
          to: String(model.email),
          bcc: process.env.SUPPORT_EMAIL?.trim() || "support@luxurybandit.com", // copy to the team
          subject: "You're approved on LuxuryBandit 🎉",
          html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111">
  <p style="font-size:16px">Hi${hi},</p>
  <p>Great news — <b>your LuxuryBandit Model profile has been approved!</b> 🎉</p>
  <p>You can now sign in with this email (<b>${String(model.email)}</b>) to your own model page — check your looks, keep your profile up to date, and start earning from chats &amp; try-ons.</p>
  <p style="text-align:center;margin:24px 0">
    <a href="${site}/login" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-weight:800;padding:14px 28px;border-radius:999px">Sign in to my page →</a>
  </p>
  <p>Welcome aboard,<br/>The LuxuryBandit Team</p>
</div>`,
        });
      } catch { /* email is best-effort */ }
    }

    // Rejection WITH a reason → tell her what to fix so she can re-apply. Non-blocking.
    const reason = String((payload as any).reason ?? "").trim();
    if (next === "deactivated" && reason && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(model.email ?? ""))) {
      try {
        const { sendEmail } = await import("@/lib/email-send");
        const hi = model.firstName ? ` ${model.firstName}` : "";
        const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://luxurybandit.com";
        await sendEmail({
          to: String(model.email),
          bcc: process.env.SUPPORT_EMAIL?.trim() || "support@luxurybandit.com",
          subject: "Your LuxuryBandit application — one thing to fix",
          html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111">
  <p style="font-size:16px">Hi${hi},</p>
  <p>Thanks for applying to LuxuryBandit. We couldn&rsquo;t approve your profile just yet:</p>
  <blockquote style="border-left:3px solid #e0b64a;margin:12px 0;padding:8px 16px;color:#333;font-size:15px">${reason.replace(/</g, "&lt;")}</blockquote>
  <p>Please fix it and apply again with the same email — we&rsquo;ll review it right away.</p>
  <p style="text-align:center;margin:24px 0">
    <a href="${site}/curators/apply" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-weight:800;padding:14px 28px;border-radius:999px">Re-apply →</a>
  </p>
  <p>Thanks,<br/>The LuxuryBandit Team</p>
</div>`,
        });
      } catch { /* email is best-effort */ }
    }
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
      // Public MODEL name (elegant single name). Separate from the owner's real name above.
      modelName: (typeof (payload as any).modelName === "string" && (payload as any).modelName.trim())
        ? (payload as any).modelName.trim()
        : (cur as any).modelName,
      // Card identity fields — brand title ("Monaco Influencer"), ABOUT-slide intro, sponsor.
      title: str("title", (cur as any).title),
      intro: str("intro", (cur as any).intro),
      sponsor: str("sponsor", (cur as any).sponsor),
      phone: str("phone", cur.phone),
      address: str("address", cur.address),
      country: ((str("country", (cur as any).country) ?? "") as string).toUpperCase().slice(0, 2) || undefined,
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
      // Vanity likes/views baselines shown on her profile stats — admin only.
      likeBoost: isAdmin && (payload as any).likeBoost !== undefined
        ? Math.max(0, Math.floor(Number((payload as any).likeBoost) || 0))
        : (cur as any).likeBoost,
      viewBoost: isAdmin && (payload as any).viewBoost !== undefined
        ? Math.max(0, Math.floor(Number((payload as any).viewBoost) || 0))
        : (cur as any).viewBoost,
      // Gold trust banner on her page — admin only, per model (off by default).
      realBadge: isAdmin && (payload as any).realBadge !== undefined
        ? (payload as any).realBadge === true
        : (cur as any).realBadge,
      // Verified REAL model — one flag drives the page banner, the "✓ Real model" carousel
      // badge AND earnings eligibility. Admin only (set when verifying + approving her).
      realModel: isAdmin && (payload as any).realModel !== undefined
        ? (payload as any).realModel === true
        : (cur as any).realModel,
      // Public vs private: hidden:true = live but NOT in the public models gallery. Admin flips
      // her public (hidden:false) when everything looks right. Admin only.
      hidden: isAdmin && (payload as any).hidden !== undefined
        ? (payload as any).hidden === true
        : (cur as any).hidden,
      // Admin base price (cents) for buying her — quality/beauty based. Grow-pricing adds
      // videos/looks/days on top (see lib/influencer-price). Admin only.
      priceCents: isAdmin && (payload as any).priceCents !== undefined
        ? Math.max(0, Math.round(Number((payload as any).priceCents) || 0))
        : (cur as any).priceCents,
      // Flagship tier ($500 base) vs AI model ($9.99). Admin checkbox — drives her LB-Value.
      flagship: isAdmin && (payload as any).flagship !== undefined
        ? (payload as any).flagship === true
        : (cur as any).flagship,
      // Which flagship tier (1/2/3) — picks her base value from the price list. Admin only.
      flagshipTier: isAdmin && (payload as any).flagshipTier !== undefined
        ? Math.min(3, Math.max(1, Math.round(Number((payload as any).flagshipTier) || 1)))
        : (cur as any).flagshipTier,
      // Listed for sale — admin OR the model herself may toggle this (auth already checked above).
      forSale: (payload as any).forSale !== undefined
        ? (payload as any).forSale === true
        : (cur as any).forSale,
      // Owner privacy: hide the owner's name on the card, keep only the ID.
      ownerHideName: (payload as any).ownerHideName !== undefined
        ? (payload as any).ownerHideName === true
        : (cur as any).ownerHideName,
    } as any;
    // Optional new photo
    const photo = String(payload.photo ?? "");
    const photoFull2 = String((payload as any).photoFull ?? "");
    // New full-body set REPLACES the old one (only sent when she picked new ones).
    const bodyPhotos2 = Array.isArray((payload as any).bodyPhotos)
      ? ((payload as any).bodyPhotos as unknown[]).filter((b): b is string => typeof b === "string" && b.startsWith("data:image/")).slice(0, 2)
      : [];
    // New candidate profile photos REPLACE the stored set (up to 4); first becomes the main.
    const profilePhotos2 = Array.isArray((payload as any).profilePhotos)
      ? ((payload as any).profilePhotos as unknown[]).filter((b): b is string => typeof b === "string" && b.startsWith("data:image/")).slice(0, 4)
      : [];
    try {
      if (profilePhotos2.length) {
        const paths = await Promise.all(profilePhotos2.map(b => uploadTryThisLookImage("uploads", b)));
        (updated as any).profilePhotoPaths = paths;
        if (!photo.startsWith("data:image/")) updated.photoPath = paths[0]; // default main unless a specific photo was also sent
      }
      if (photo.startsWith("data:image/")) {
        // Back up the CURRENT photo before replacing it → "Restore" can undo an accidental change.
        if ((cur as any).photoPath) (updated as any).photoPathPrev = (cur as any).photoPath;
        updated.photoPath = await uploadTryThisLookImage("uploads", photo);
        // Keep the uncropped original too (portrait) — used by the profile lightbox.
        if (photoFull2.startsWith("data:image/")) {
          updated.photoFullPath = await uploadTryThisLookImage("uploads", photoFull2);
        }
      }
      if (bodyPhotos2.length) {
        updated.photoBodyPaths = await Promise.all(bodyPhotos2.map(b => uploadTryThisLookImage("uploads", b)));
      }
      // Verification selfie (holding the code) — she uploads it, the admin reviews it.
      const vsel = String((payload as any).verificationSelfie ?? "");
      if (vsel.startsWith("data:image/")) {
        (updated as any).verificationSelfiePath = await uploadTryThisLookImage("uploads", vsel);
      }
    }
    catch (e) {
      console.error("update: photo upload failed", e);
      return jsonError("The new photo could not be uploaded — please try again (or use a smaller image).", 500);
    }

    // Payout details (IBAN / PayPal) — the model edits her own; used for earnings payouts.
    if (typeof (payload as any).payoutMethod === "string") (updated as any).payoutMethod = (payload as any).payoutMethod.trim() || undefined;

    const curators = [...state.curators!]; curators[idx] = updated;
    const brands = mergeTags(state.brands ?? [], updated.brands ?? "");
    const styles = mergeTags(state.styles ?? [], updated.style ?? "");
    const colors = mergeTags(state.colors ?? [], updated.colors ?? "");
    const fabrics = mergeTags(state.fabrics ?? [], updated.fabrics ?? "");
    const occasions = mergeTags(state.occasions ?? [], updated.occasions ?? "");
    await saveTryThisLookState({ ...state, curators, brands, styles, colors, fabrics, occasions });
    return NextResponse.json({ ok: true });
  }

  // A real model requests a payout of her accumulated try-on earnings. Moves the whole
  // balance into a PENDING payout request (earningsCents → 0) and pings the admin.
  if (action === "request-payout") {
    const id = String(payload.id ?? "").trim();
    const state = await readTryThisLookState();
    const idx = (state.curators ?? []).findIndex(c => c.id === id);
    if (idx < 0) return jsonError("Profile not found.", 404);
    const cur = state.curators![idx] as any;
    const isAdmin = await isAdminRequest(request);
    const tokenEmail = await emailFromToken(request);
    const ownsBySession = request.headers.get("x-curator-id") === id;
    const ownsByToken = tokenEmail && tokenEmail === (cur.email ?? "").trim().toLowerCase();
    if (!isAdmin && !ownsByToken && !ownsBySession) return jsonError("Not allowed.", 403);
    const MIN = Math.max(0, Number(process.env.MODEL_PAYOUT_MIN_CENTS ?? 2000)); // €20 default
    const balance = Math.max(0, Number(cur.earningsCents ?? 0));
    if (balance < MIN) return jsonError(`You need at least €${(MIN / 100).toFixed(0)} to request a payout — you have €${(balance / 100).toFixed(2)}.`, 400);
    const method = (typeof (payload as any).payoutMethod === "string" && (payload as any).payoutMethod.trim()) ? (payload as any).payoutMethod.trim() : (cur.payoutMethod || "");
    if (!method) return jsonError("Add your payout details (IBAN or PayPal) first.", 400);
    cur.payoutMethod = method;
    const req = { id: `${Date.now()}-${crypto.randomUUID()}`, amountCents: balance, method, status: "pending", requestedAt: new Date().toISOString() };
    cur.payouts = [req, ...(Array.isArray(cur.payouts) ? cur.payouts : [])].slice(0, 100);
    cur.earningsCents = 0;
    await saveTryThisLookState(state);
    notifyAdminWhatsApp(`💸 Payout requested: ${[cur.firstName, cur.lastName].filter(Boolean).join(" ")} — €${(balance / 100).toFixed(2)} to ${method}. ${ADMIN_URL}`);
    return NextResponse.json({ ok: true, request: req });
  }

  // Admin marks a payout request as paid.
  if (action === "mark-payout-paid") {
    const isAdmin = await isAdminRequest(request);
    if (!isAdmin) return jsonError("Admin access required.", 401);
    const id = String(payload.id ?? "").trim();
    const reqId = String((payload as any).requestId ?? "").trim();
    const state = await readTryThisLookState();
    const cur = (state.curators ?? []).find(c => c.id === id) as any;
    if (!cur) return jsonError("Profile not found.", 404);
    const r = (Array.isArray(cur.payouts) ? cur.payouts : []).find((p: any) => p.id === reqId);
    if (!r) return jsonError("Payout request not found.", 404);
    r.status = "paid"; r.paidAt = new Date().toISOString();
    await saveTryThisLookState(state);
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
    if (!info) return jsonError("Model not found.", 404);
    return NextResponse.json({ ok: true, credits: info });
  }

  // Admin: set how many of HER OWN My Studio uploads a model has left (separate pool from
  // the AI-generation credits above — this one only gates her self-service photo/video uploads).
  if (action === "set-studio-credits") {
    if (!(await isAdminRequest(request))) return jsonError("Admin access required.", 401);
    const id = String(payload.id ?? "").trim();
    const n = Number((payload as any).studioUploadCredits);
    if (!id || !Number.isFinite(n)) return jsonError("Missing curator id or credits.");
    const state = await readTryThisLookState();
    const c = (state.curators ?? []).find(x => x.id === id);
    if (!c) return jsonError("Model not found.", 404);
    (c as any).studioUploadCredits = n;
    await saveTryThisLookState(state);
    return NextResponse.json({ ok: true, studioUploadCredits: n });
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
