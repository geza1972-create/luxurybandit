export type CreditAction = "detect-products" | "retouch-cutout" | "rebuild-product" | "fashion-model" | "fashion-model-selected" | "ai-light" | "ai-premium";

type UsageItem = {
  id: string;
  action: CreditAction;
  credits: number;
  createdAt: string;
  status: "reserved" | "completed" | "refunded";
};

type AccountLedger = {
  credits: number;
  freeCredits: number;
  usage: UsageItem[];
};

const INTERNAL_CREDIT_GATE_ENABLED = process.env.SHOPCUT_ENABLE_INTERNAL_CREDITS === "true";
const DEFAULT_FREE_CREDITS = Number(process.env.FREE_IMAGE_CREDITS ?? (INTERNAL_CREDIT_GATE_ENABLED ? 5 : 9999));

const actionCosts: Record<CreditAction, number> = {
  "detect-products": 0,
  "retouch-cutout": 1,
  "rebuild-product": 2,
  "fashion-model": 1,
  "fashion-model-selected": 2,
  "ai-light": 2,    // Light AI (OpenAI) — ~$0.04
  "ai-premium": 10  // Premium AI (FASHN) — ~$0.67
};

// Accounts that are never charged (platform admins)
const FREE_ACCOUNTS = new Set(["admin-internal"]);

const globalForBilling = globalThis as typeof globalThis & {
  shopcutBillingLedgers?: Map<string, AccountLedger>;
};

const ledgers = globalForBilling.shopcutBillingLedgers ?? new Map<string, AccountLedger>();
globalForBilling.shopcutBillingLedgers = ledgers;

export function getAccountId(request: Request) {
  return request.headers.get("x-shopcut-account-id") || "demo-account";
}

function getLedger(accountId: string) {
  const existing = ledgers.get(accountId);
  if (existing) {
    if (!INTERNAL_CREDIT_GATE_ENABLED && existing.credits < DEFAULT_FREE_CREDITS) {
      existing.credits = DEFAULT_FREE_CREDITS;
      existing.freeCredits = DEFAULT_FREE_CREDITS;
    }
    return existing;
  }

  // Load any previously purchased credits from disk
  let purchased = 0;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getPurchasedCredits } = require("./credits-store") as typeof import("./credits-store");
    purchased = getPurchasedCredits(accountId);
  } catch { /* ignore in edge environments */ }

  const ledger: AccountLedger = {
    credits: DEFAULT_FREE_CREDITS + purchased,
    freeCredits: DEFAULT_FREE_CREDITS,
    usage: []
  };
  ledgers.set(accountId, ledger);
  return ledger;
}

/** Add credits to a live ledger (called from Stripe webhook after writing to disk). */
export function addCreditsToLedger(accountId: string, amount: number) {
  const ledger = getLedger(accountId);
  ledger.credits += amount;
}

export function getCreditStatus(accountId: string) {
  const ledger = getLedger(accountId);
  return {
    accountId,
    credits: ledger.credits,
    freeCredits: ledger.freeCredits,
    usage: ledger.usage.slice(0, 20),
    costs: actionCosts
  };
}

export function reserveCredits(accountId: string, action: CreditAction) {
  // Platform admins are never charged
  if (FREE_ACCOUNTS.has(accountId)) {
    return {
      ok: true as const,
      reservationId: "admin-free",
      credits: 0,
      status: getCreditStatus(accountId)
    };
  }

  const ledger = getLedger(accountId);
  const credits = actionCosts[action];

  if (INTERNAL_CREDIT_GATE_ENABLED && ledger.credits < credits) {
    return {
      ok: false as const,
      error: `Not enough credits. This action costs ${credits} credit${credits === 1 ? "" : "s"}.`,
      status: getCreditStatus(accountId)
    };
  }

  const usageItem: UsageItem = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    action,
    credits,
    createdAt: new Date().toISOString(),
    status: "reserved"
  };

  if (INTERNAL_CREDIT_GATE_ENABLED) {
    ledger.credits -= credits;
  }
  ledger.usage.unshift(usageItem);

  return {
    ok: true as const,
    reservationId: usageItem.id,
    credits,
    status: getCreditStatus(accountId)
  };
}

export function completeReservation(accountId: string, reservationId: string) {
  if (reservationId === "admin-free") return getCreditStatus(accountId);
  const ledger = getLedger(accountId);
  const usageItem = ledger.usage.find((item) => item.id === reservationId);
  if (usageItem) usageItem.status = "completed";
  return getCreditStatus(accountId);
}

export function refundReservation(accountId: string, reservationId: string) {
  if (reservationId === "admin-free") return getCreditStatus(accountId);
  const ledger = getLedger(accountId);
  const usageItem = ledger.usage.find((item) => item.id === reservationId);
  if (usageItem && usageItem.status === "reserved") {
    usageItem.status = "refunded";
    ledger.credits += usageItem.credits;
  }
  return getCreditStatus(accountId);
}
