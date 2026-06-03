export type CreditAction = "detect-products" | "retouch-cutout" | "rebuild-product";

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

const DEFAULT_FREE_CREDITS = Number(process.env.FREE_IMAGE_CREDITS ?? 5);

const actionCosts: Record<CreditAction, number> = {
  "detect-products": 0,
  "retouch-cutout": 1,
  "rebuild-product": 2
};

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
  if (existing) return existing;

  const ledger: AccountLedger = {
    credits: DEFAULT_FREE_CREDITS,
    freeCredits: DEFAULT_FREE_CREDITS,
    usage: []
  };
  ledgers.set(accountId, ledger);
  return ledger;
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
  const ledger = getLedger(accountId);
  const credits = actionCosts[action];

  if (ledger.credits < credits) {
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

  ledger.credits -= credits;
  ledger.usage.unshift(usageItem);

  return {
    ok: true as const,
    reservationId: usageItem.id,
    credits,
    status: getCreditStatus(accountId)
  };
}

export function completeReservation(accountId: string, reservationId: string) {
  const ledger = getLedger(accountId);
  const usageItem = ledger.usage.find((item) => item.id === reservationId);
  if (usageItem) usageItem.status = "completed";
  return getCreditStatus(accountId);
}

export function refundReservation(accountId: string, reservationId: string) {
  const ledger = getLedger(accountId);
  const usageItem = ledger.usage.find((item) => item.id === reservationId);
  if (usageItem && usageItem.status === "reserved") {
    usageItem.status = "refunded";
    ledger.credits += usageItem.credits;
  }
  return getCreditStatus(accountId);
}
