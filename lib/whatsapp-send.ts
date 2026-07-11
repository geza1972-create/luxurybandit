// Send a WhatsApp message to the ADMIN via CallMeBot — reusing the SAME setup that already
// powers try-on/message notifications: the admin's `whatsapp_number` + `callmebot_key` stored in
// their Supabase user_metadata (set in the Seller dashboard). Falls back to CALLMEBOT_PHONE /
// CALLMEBOT_APIKEY env vars if you prefer. No-op (false) if neither is configured.

async function adminCallmebot(): Promise<{ phone: string; key: string } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const emails = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!url || !serviceKey || !emails.length) return null;
  try {
    const res = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=1000`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      signal: AbortSignal.timeout(9000),
    });
    const data = await res.json() as { users?: Array<{ email?: string; user_metadata?: Record<string, string | undefined> }> };
    for (const email of emails) {
      const u = (data.users ?? []).find(x => (x.email ?? "").toLowerCase() === email);
      const meta = u?.user_metadata ?? {};
      const phone = String(meta.whatsapp_number ?? "").replace(/\D/g, "");
      const key = String(meta.callmebot_key ?? "");
      if (phone && key) return { phone, key };
    }
  } catch { /**/ }
  return null;
}

export async function resolveAdminWa(): Promise<{ phone: string; key: string; source: string } | null> {
  const envPhone = (process.env.CALLMEBOT_PHONE ?? "").replace(/\D/g, "");
  const envKey = process.env.CALLMEBOT_APIKEY ?? "";
  if (envPhone && envKey) return { phone: envPhone, key: envKey, source: "env" };
  const m = await adminCallmebot();
  return m ? { ...m, source: "user_metadata" } : null;
}

export async function sendWhatsApp(body: string): Promise<boolean> {
  const wa = await resolveAdminWa();
  if (!wa) return false;
  try {
    const u = new URL("https://api.callmebot.com/whatsapp.php");
    u.searchParams.set("phone", wa.phone);
    u.searchParams.set("text", body.slice(0, 1000));
    u.searchParams.set("apikey", wa.key);
    const res = await fetch(u.toString(), { signal: AbortSignal.timeout(9000) });
    return res.ok;
  } catch { return false; }
}
