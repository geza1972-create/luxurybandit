/**
 * Persistent purchased-credits store.
 * Stored in credits-store.json at the project root.
 * Used by the Stripe webhook to record credit purchases,
 * and by the billing module to load them into ledgers.
 */
import fs from "fs";
import path from "path";

const FILE = path.join(process.cwd(), "credits-store.json");

type Store = { accounts: Record<string, number> };

function read(): Store {
  try {
    const raw = fs.readFileSync(FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<Store>;
    return { accounts: parsed.accounts ?? {} };
  } catch {
    return { accounts: {} };
  }
}

function write(store: Store) {
  fs.writeFileSync(FILE, JSON.stringify(store, null, 2), "utf-8");
}

/** Add credits to an account (called from Stripe webhook). */
export function addPurchasedCredits(accountId: string, amount: number): number {
  const store = read();
  store.accounts[accountId] = (store.accounts[accountId] ?? 0) + amount;
  write(store);
  return store.accounts[accountId];
}

/** Read purchased credits for an account (called from billing on ledger init). */
export function getPurchasedCredits(accountId: string): number {
  return read().accounts[accountId] ?? 0;
}
