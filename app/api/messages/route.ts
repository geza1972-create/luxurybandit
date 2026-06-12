import { NextResponse } from "next/server";
import { readTryThisLookState, saveTryThisLookState } from "@/lib/try-this-look-store";

export const runtime = "nodejs";

function getConfig() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim().replace(/^["']|["']$/g, "") ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim().replace(/^["']|["']$/g, "") ||
    "";
  return { url, serviceKey, anonKey };
}

function toSlug(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
}

async function getUserByToken(token: string) {
  const { url, anonKey } = getConfig();
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return await res.json() as {
    id: string; email?: string;
    user_metadata?: Record<string, string | undefined>;
  };
}

async function findUserById(userId: string) {
  const { url, serviceKey } = getConfig();
  const res = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!res.ok) return null;
  return await res.json() as { id: string; email?: string; user_metadata?: Record<string, string | undefined> };
}

async function findUserByUsername(username: string) {
  const { url, serviceKey } = getConfig();
  const res = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=1000`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!res.ok) return null;
  const data = await res.json() as { users: Array<{ id: string; email?: string; user_metadata?: Record<string, string | undefined> }> };
  const target = username.toLowerCase();
  return (
    data.users.find((u) => {
      const meta = u.user_metadata ?? {};
      // match username, full_name, or display name slug
      return (
        toSlug(meta.username ?? "") === target ||
        toSlug(meta.full_name ?? "") === target
      );
    }) ?? null
  );
}

// ── GET /api/messages — inbox for authenticated user ──────────────────────────
export async function GET(request: Request) {
  const token = (request.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const user = await getUserByToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const state = await readTryThisLookState();
  const messages = (state.messages ?? []).filter((m) => m.toUserId === user.id);

  // Mark fetched messages as read (non-blocking write)
  const unread = messages.filter((m) => !m.readAt).map((m) => m.id);
  if (unread.length) {
    const now = new Date().toISOString();
    state.messages = (state.messages ?? []).map((m) =>
      unread.includes(m.id) ? { ...m, readAt: now } : m
    );
    saveTryThisLookState(state).catch(() => {});
  }

  return NextResponse.json({ messages });
}

// ── POST /api/messages — send a message ───────────────────────────────────────
export async function POST(request: Request) {
  const token = (request.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const sender = await getUserByToken(token);
  if (!sender) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await request.json() as { toUsername?: string; toUserId?: string; text?: string };
  const toUsername = String(body.toUsername ?? "").trim();
  const toUserId = String(body.toUserId ?? "").trim();
  const text = String(body.text ?? "").trim().slice(0, 1000);
  if ((!toUsername && !toUserId) || !text) {
    return NextResponse.json({ error: "toUsername or toUserId, and text are required." }, { status: 400 });
  }

  // Prefer direct ID lookup (fast, reliable); fall back to slug scan
  let recipient = toUserId ? await findUserById(toUserId) : null;
  if (!recipient && toUsername) recipient = await findUserByUsername(toUsername);
  if (!recipient) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (recipient.id === sender.id) {
    return NextResponse.json({ error: "Cannot message yourself." }, { status: 400 });
  }

  const senderMeta = sender.user_metadata ?? {};
  const senderSlug = toSlug(senderMeta.username ?? senderMeta.full_name ?? sender.email ?? "anonymous");
  const senderName = senderMeta.username ?? senderMeta.full_name ?? sender.email ?? "Anonymous";

  const recipientMeta = recipient.user_metadata ?? {};
  const recipientSlug = toSlug(recipientMeta.username ?? recipientMeta.full_name ?? "");
  const recipientName = recipientMeta.username ?? recipientMeta.full_name ?? "there";

  const state = await readTryThisLookState();
  if (!state.messages) state.messages = [];

  const message = {
    id: `${Date.now()}-${crypto.randomUUID()}`,
    toUserId: recipient.id,
    toUsername: recipientSlug,
    fromUserId: sender.id,
    fromUsername: senderSlug,
    fromName: senderName,
    fromEmail: sender.email,
    text,
    createdAt: new Date().toISOString(),
  };

  state.messages.unshift(message);
  // Keep last 5000 messages
  if (state.messages.length > 5000) state.messages = state.messages.slice(0, 5000);
  await saveTryThisLookState(state);

  // ── Email notification (fire-and-forget) ──────────────────────────────────
  const notificationEmail = recipientMeta.notification_email ?? recipient.email;
  const resendKey = process.env.RESEND_API_KEY;
  if (notificationEmail && resendKey) {
    const profileUrl = `https://luxurybandit.com/seller/dashboard`;
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "LuxuryBandit <support@luxurybandit.com>",
        to: [notificationEmail],
        subject: `New message from ${senderName} on LuxuryBandit`,
        html: `<p>Hi ${recipientName},</p>
<p><strong>${senderName}</strong> sent you a message:</p>
<blockquote style="border-left:3px solid #e5e5e5;padding-left:12px;color:#555;margin:12px 0">${text.replace(/\n/g, "<br>")}</blockquote>
<p><a href="${profileUrl}" style="background:#000;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold">View in inbox →</a></p>
<p style="color:#999;font-size:12px">LuxuryBandit — luxurybandit.com</p>`,
      }),
    }).catch(() => {});
  }

  // ── WhatsApp notification via CallMeBot (fire-and-forget) ─────────────────
  // The recipient's WhatsApp number and CallMeBot key are private in user_metadata
  const waPhone = (recipientMeta.whatsapp_number ?? "").replace(/\D/g, "");
  const waKey = recipientMeta.callmebot_key ?? "";
  if (waPhone && waKey) {
    const waMsg = `📩 New message from ${senderName} on LuxuryBandit:\n"${text.slice(0, 160)}${text.length > 160 ? "…" : ""}"\n\nluxurybandit.com`;
    fetch(
      `https://api.callmebot.com/whatsapp.php?phone=${waPhone}&text=${encodeURIComponent(waMsg)}&apikey=${waKey}`
    ).catch(() => {});
  }

  return NextResponse.json({ ok: true, messageId: message.id });
}
