import { readTryThisLookState, saveTryThisLookState } from "./try-this-look-store";

// ─────────────────────────────────────────────────────────────────────────────
// Creator CREDITS. We communicate everything to creators in *credits*, never in
// money. Internally 1 credit ≈ €0.025 (founder reference only — never shown):
// try-on ≈ 2 credits ≈ €0.05, search ≈ 1 credit ≈ €0.025.
//
// Model: a creator gets STARTER credits to prove themselves. As their looks earn
// likes / try-ons they automatically EARN more. When they run out they must BUY
// more to keep going. See CONCEPT.md §7c.
// ─────────────────────────────────────────────────────────────────────────────

const ENABLED = process.env.CREATOR_CREDITS_ENABLED !== "false"; // on by default
export const STARTER_CREDITS = Number(process.env.STARTER_CREDITS ?? 30);
export const TRYON_CREDITS = Number(process.env.TRYON_CREDITS ?? 2);
export const SEARCH_CREDITS = Number(process.env.SEARCH_CREDITS ?? 1);

// Earn-as-you-prove-yourself milestones. Each is granted once (tracked by key).
// Thresholds are cumulative across all of a creator's published looks.
export const EARN_MILESTONES: { key: string; metric: "tryons" | "likes"; at: number; credits: number }[] = [
  { key: "tryons-10", metric: "tryons", at: 10, credits: 10 },
  { key: "tryons-25", metric: "tryons", at: 25, credits: 15 },
  { key: "tryons-50", metric: "tryons", at: 50, credits: 25 },
  { key: "tryons-100", metric: "tryons", at: 100, credits: 50 },
  { key: "likes-50", metric: "likes", at: 50, credits: 10 },
  { key: "likes-150", metric: "likes", at: 150, credits: 15 },
  { key: "likes-500", metric: "likes", at: 500, credits: 30 },
];

export type CreditsInfo = {
  credits: number;        // current spendable balance
  spent: number;          // lifetime spent
  earned: number;         // lifetime earned via engagement
  enabled: boolean;
};

function info(credits: number, spent: number, earned: number): CreditsInfo {
  return { credits: Math.max(0, credits), spent, earned, enabled: ENABLED };
}

// Treat a brand-new creator (no credits field yet) as having the starter grant.
function balanceOf(cur: { credits?: number }): number {
  return typeof cur.credits === "number" ? cur.credits : STARTER_CREDITS;
}

export async function getCuratorCredits(curatorId: string): Promise<CreditsInfo | null> {
  const state = await readTryThisLookState();
  const cur = (state.curators ?? []).find(c => c.id === curatorId);
  if (!cur) return null;
  return info(balanceOf(cur), cur.creditsSpent ?? 0, cur.creditsEarned ?? 0);
}

/**
 * Spend credits. Blocks (ok:false) when the balance can't cover `amount` unless
 * allowOverdraft is set (cost already incurred → just record). Unknown curators
 * (admin/house) are never charged.
 */
export async function chargeCredits(
  curatorId: string,
  amount: number,
  label: string,
  opts: { allowOverdraft?: boolean } = {},
): Promise<{ ok: boolean; info: CreditsInfo }> {
  if (!curatorId || amount <= 0) {
    const c = await getCuratorCredits(curatorId);
    return { ok: true, info: c ?? info(0, 0, 0) };
  }
  const state = await readTryThisLookState();
  const idx = (state.curators ?? []).findIndex(c => c.id === curatorId);
  if (idx < 0) return { ok: true, info: info(0, 0, 0) };
  const cur = state.curators![idx];
  const credits = balanceOf(cur);
  if (ENABLED && !opts.allowOverdraft && credits < amount) {
    return { ok: false, info: info(credits, cur.creditsSpent ?? 0, cur.creditsEarned ?? 0) };
  }
  const newCredits = Math.max(0, credits - amount);
  const newSpent = (cur.creditsSpent ?? 0) + amount;
  const creditLog = [{ at: new Date().toISOString(), credits: -amount, label }, ...(cur.creditLog ?? [])].slice(0, 60);
  const curators = [...state.curators!];
  curators[idx] = { ...cur, credits: newCredits, creditsSpent: newSpent, creditLog };
  await saveTryThisLookState({ ...state, curators });
  return { ok: true, info: info(newCredits, newSpent, cur.creditsEarned ?? 0) };
}

/** Give credits back (failed generation, or reserved-but-cached searches). */
export async function refundCredits(curatorId: string, amount: number, label: string): Promise<CreditsInfo | null> {
  if (!curatorId || amount <= 0) return getCuratorCredits(curatorId);
  const state = await readTryThisLookState();
  const idx = (state.curators ?? []).findIndex(c => c.id === curatorId);
  if (idx < 0) return null;
  const cur = state.curators![idx];
  const newCredits = balanceOf(cur) + amount;
  const newSpent = Math.max(0, (cur.creditsSpent ?? 0) - amount);
  const creditLog = [{ at: new Date().toISOString(), credits: amount, label }, ...(cur.creditLog ?? [])].slice(0, 60);
  const curators = [...state.curators!];
  curators[idx] = { ...cur, credits: newCredits, creditsSpent: newSpent, creditLog };
  await saveTryThisLookState({ ...state, curators });
  return info(newCredits, newSpent, cur.creditsEarned ?? 0);
}

/** Add credits — earned (engagement), bought, or admin-granted. */
export async function grantCredits(curatorId: string, amount: number, label: string, kind: "earn" | "buy" | "admin" = "admin"): Promise<CreditsInfo | null> {
  if (!curatorId || amount <= 0) return getCuratorCredits(curatorId);
  const state = await readTryThisLookState();
  const idx = (state.curators ?? []).findIndex(c => c.id === curatorId);
  if (idx < 0) return null;
  const cur = state.curators![idx];
  const newCredits = balanceOf(cur) + amount;
  const newEarned = (cur.creditsEarned ?? 0) + (kind === "earn" ? amount : 0);
  const creditLog = [{ at: new Date().toISOString(), credits: amount, label }, ...(cur.creditLog ?? [])].slice(0, 60);
  const curators = [...state.curators!];
  curators[idx] = { ...cur, credits: newCredits, creditsEarned: newEarned, creditLog };
  await saveTryThisLookState({ ...state, curators });
  return info(newCredits, cur.creditsSpent ?? 0, newEarned);
}

/** Admin: set balance and/or reset spend counter. */
export async function setCuratorCredits(curatorId: string, opts: { credits?: number; resetSpent?: boolean; addCredits?: number }): Promise<CreditsInfo | null> {
  const state = await readTryThisLookState();
  const idx = (state.curators ?? []).findIndex(c => c.id === curatorId);
  if (idx < 0) return null;
  const cur = state.curators![idx];
  let credits = balanceOf(cur);
  let spent = cur.creditsSpent ?? 0;
  if (typeof opts.credits === "number" && opts.credits >= 0) credits = Math.round(opts.credits);
  if (typeof opts.addCredits === "number") credits = Math.max(0, credits + Math.round(opts.addCredits));
  if (opts.resetSpent) spent = 0;
  const curators = [...state.curators!];
  curators[idx] = { ...cur, credits, creditsSpent: spent };
  await saveTryThisLookState({ ...state, curators });
  return info(credits, spent, cur.creditsEarned ?? 0);
}

/**
 * Earn-as-you-prove-yourself: award credits for engagement milestones the
 * creator's looks have crossed and that haven't been granted yet. Returns the
 * credits info plus any newly-awarded milestones (for a celebratory message).
 */
export async function awardEngagementCredits(curatorId: string, totals: { tryons: number; likes: number }): Promise<{ info: CreditsInfo; awarded: { label: string; credits: number }[] } | null> {
  const state = await readTryThisLookState();
  const idx = (state.curators ?? []).findIndex(c => c.id === curatorId);
  if (idx < 0) return null;
  const cur = state.curators![idx];
  const already = new Set(cur.awardedMilestones ?? []);
  const awarded: { label: string; credits: number; key: string }[] = [];
  for (const m of EARN_MILESTONES) {
    if (already.has(m.key)) continue;
    const value = m.metric === "tryons" ? totals.tryons : totals.likes;
    if (value >= m.at) {
      const label = m.metric === "tryons" ? `${m.at} try-ons reached` : `${m.at} likes reached`;
      awarded.push({ label, credits: m.credits, key: m.key });
    }
  }
  if (awarded.length === 0) {
    return { info: info(balanceOf(cur), cur.creditsSpent ?? 0, cur.creditsEarned ?? 0), awarded: [] };
  }
  const gain = awarded.reduce((s, a) => s + a.credits, 0);
  const newCredits = balanceOf(cur) + gain;
  const newEarned = (cur.creditsEarned ?? 0) + gain;
  const awardedMilestones = [...(cur.awardedMilestones ?? []), ...awarded.map(a => a.key)];
  const creditLog = [
    ...awarded.map(a => ({ at: new Date().toISOString(), credits: a.credits, label: `Earned: ${a.label}` })),
    ...(cur.creditLog ?? []),
  ].slice(0, 60);
  const curators = [...state.curators!];
  curators[idx] = { ...cur, credits: newCredits, creditsEarned: newEarned, awardedMilestones, creditLog };
  await saveTryThisLookState({ ...state, curators });
  return { info: info(newCredits, cur.creditsSpent ?? 0, newEarned), awarded: awarded.map(({ label, credits }) => ({ label, credits })) };
}
