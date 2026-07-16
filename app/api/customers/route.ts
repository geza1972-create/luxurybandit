import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { readTryThisLookState } from "@/lib/try-this-look-store";
import { listAuthUsers } from "@/lib/supabase-admin-users";
import { listSubscribers } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Purchase = { type: string; label: string; date?: string };
type SentMail = { subject: string; sentAt: string };
export type Customer = {
  email: string; name: string; provider?: string; createdAt?: string;
  videoCredits: number; purchases: Purchase[]; videoNote: string; emails: SentMail[];
};

const iso = (secs: number) => { try { return secs ? new Date(secs * 1000).toISOString() : ""; } catch { return ""; } };

// All customers (Supabase auth users) enriched with what they bought + how many videos they get.
// Admin only.
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });

  const state = await readTryThisLookState().catch(() => null);
  const [authUsers, subs] = await Promise.all([
    listAuthUsers().catch(() => []),
    listSubscribers().catch(() => [] as Awaited<ReturnType<typeof listSubscribers>>),
  ]);

  const balances = (state?.videoCredits?.balances ?? {}) as Record<string, number>;
  const bookings = state?.tripBookings ?? [];
  const emailLog = state?.emailLog ?? [];
  const curators = state?.curators ?? [];
  const subByEmail = new Map(subs.map(s => [s.email, s]));

  // Union of every known email (auth users + anyone only present in bookings/credits/ownership).
  const emails = new Set<string>();
  for (const u of authUsers) if (u.email) emails.add(u.email);
  for (const b of bookings) if (b.email) emails.add(b.email.toLowerCase());
  for (const e of Object.keys(balances)) emails.add(e.toLowerCase());
  for (const c of curators) { const oe = String((c as any).ownerEmail ?? "").trim().toLowerCase(); if (oe) emails.add(oe); }

  const authByEmail = new Map(authUsers.map(u => [u.email, u]));
  const nameFromBooking = (e: string) => bookings.find(b => b.email.toLowerCase() === e)?.name || "";

  const customers: Customer[] = [...emails].map(email => {
    const au = authByEmail.get(email);
    const purchases: Purchase[] = [];

    const sub = subByEmail.get(email);
    if (sub) purchases.push({ type: "subscription", label: `Abo ${(sub.amount / 100).toLocaleString("en-US", { style: "currency", currency: (sub.currency || "usd").toUpperCase() })}/Mo (${sub.status})`, date: iso(sub.created) });

    for (const b of bookings.filter(b => b.email.toLowerCase() === email)) purchases.push({ type: "journey", label: `Journey: ${b.program || "—"}`, date: b.createdAt });

    for (const c of curators.filter(c => String((c as any).ownerEmail ?? "").trim().toLowerCase() === email)) {
      const nm = [(c as any).firstName, (c as any).lastName].filter(Boolean).join(" ") || "Influencer";
      purchases.push({ type: "influencer", label: `Owns ${nm}`, date: (c as any).purchasedAt });
    }

    const credits = Math.max(0, Number(balances[email] ?? 0));
    // How many videos they get: subscription → 40/mo; journey → 6/day; else the credit balance.
    const videoNote = sub ? "40 Videos/Monat (Premium)"
      : purchases.some(p => p.type === "journey") ? "6 Inhalte/Tag (Journey)"
      : credits > 0 ? `${credits} Video-Credits`
      : "—";

    const emails: SentMail[] = emailLog
      .filter(e => String(e.email ?? "").toLowerCase() === email)
      .map(e => ({ subject: e.subject, sentAt: e.sentAt }))
      .sort((a, b) => String(b.sentAt ?? "").localeCompare(String(a.sentAt ?? "")));

    return {
      email,
      name: au?.name || nameFromBooking(email) || "",
      provider: au?.provider,
      createdAt: au?.createdAt,
      videoCredits: credits,
      purchases: purchases.sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? ""))),
      videoNote,
      emails,
    };
  }).sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));

  return NextResponse.json({ customers });
}
