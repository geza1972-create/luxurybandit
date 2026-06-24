// Admin emails — NEXT_PUBLIC_ADMIN_EMAIL may be a single email OR a comma-separated
// list (e.g. "me@x.com, me2@y.com"). Matching is case-insensitive.
export function adminEmails(): string[] {
  return (process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}
