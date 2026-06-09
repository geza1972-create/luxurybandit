const ANONYMOUS_DAILY_TRYON_LIMIT = Number(process.env.ANONYMOUS_DAILY_TRYON_LIMIT ?? 1);

type TryOnLimitEntry = {
  count: number;
  updatedAt: string;
};

const globalForTryOnLimit = globalThis as typeof globalThis & {
  luxuryBanditTryOnLimits?: Map<string, TryOnLimitEntry>;
};

const tryOnLimits = globalForTryOnLimit.luxuryBanditTryOnLimits ?? new Map<string, TryOnLimitEntry>();
globalForTryOnLimit.luxuryBanditTryOnLimits = tryOnLimits;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function isSignedInAccount(accountId: string) {
  return accountId.startsWith("user-");
}

export function reserveAnonymousTryOnAttempt(accountId: string, visitorId: string, lookId: string) {
  if (isSignedInAccount(accountId)) return { ok: true as const };
  if (ANONYMOUS_DAILY_TRYON_LIMIT <= 0) return { ok: true as const };

  const identity = visitorId.trim() || accountId || "anonymous";
  const key = `${todayKey()}:${identity}:${lookId || "global"}`;
  const entry = tryOnLimits.get(key) ?? { count: 0, updatedAt: new Date().toISOString() };

  if (entry.count >= ANONYMOUS_DAILY_TRYON_LIMIT) {
    return {
      ok: false as const,
      error: "You can generate one free try-on per day. Sign in and buy credits to create more previews."
    };
  }

  tryOnLimits.set(key, {
    count: entry.count + 1,
    updatedAt: new Date().toISOString()
  });

  return { ok: true as const };
}
