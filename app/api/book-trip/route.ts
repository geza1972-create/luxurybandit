import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email-send";
import { readTryThisLookState, saveTryThisLookState } from "@/lib/try-this-look-store";

export const runtime = "nodejs";

// A trip booking (e.g. "Urlaub mit Bella auf Teneriffa") is fulfilled MANUALLY for now, so
// this route just notifies the operator by email that someone booked + registered. It never
// throws for the client (fire-and-forget from the landing form) — worst case the mail is skipped.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    program?: string; model?: string; name?: string; email?: string; priceUsd?: number;
  };
  const program = String(body.program ?? "").trim() || "—";
  const model = String(body.model ?? "").trim() || "—";
  const name = String(body.name ?? "").trim() || "—";
  const email = String(body.email ?? "").trim();
  const price = Number(body.priceUsd ?? 0);
  if (!email) return NextResponse.json({ error: "email required." }, { status: 400 });

  // Persist the booking so the Card Studio can pick this customer and build their card.
  try {
    const state = await readTryThisLookState();
    const bookings = [...(state.tripBookings ?? [])];
    if (!bookings.some(b => b.email.toLowerCase() === email.toLowerCase())) {
      bookings.push({ id: crypto.randomUUID(), name: name === "—" ? "" : name, email, program, createdAt: new Date().toISOString() });
      state.tripBookings = bookings;
      await saveTryThisLookState(state);
    }
  } catch { /* non-blocking */ }

  const to = process.env.BOOKING_NOTIFY_EMAIL?.trim() || "geza1972@gmail.com";
  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8" /><meta name="color-scheme" content="light" /></head>
<body style="margin:0;padding:24px;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:14px;overflow:hidden;">
      <tr><td style="background:#000;padding:22px 28px;text-align:center;">
        <p style="margin:0;font-size:11px;font-weight:900;letter-spacing:.2em;color:#c9a23f;text-transform:uppercase;">Neue Reise-Buchung</p>
        <p style="margin:6px 0 0;font-size:20px;font-weight:900;color:#fff;">Urlaub mit ${model} · ${program}</p>
      </td></tr>
      <tr><td style="padding:26px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#333;">
          <tr><td style="padding:6px 0;color:#999;font-weight:700;">Name</td><td style="padding:6px 0;text-align:right;font-weight:800;">${name}</td></tr>
          <tr><td style="padding:6px 0;color:#999;font-weight:700;">E-Mail</td><td style="padding:6px 0;text-align:right;font-weight:800;">${email}</td></tr>
          <tr><td style="padding:6px 0;color:#999;font-weight:700;">Paket</td><td style="padding:6px 0;text-align:right;font-weight:800;">${program} · 3 Videos + 3 Stories/Tag</td></tr>
          <tr><td style="padding:6px 0;color:#999;font-weight:700;">Preis</td><td style="padding:6px 0;text-align:right;font-weight:900;color:#c9a23f;">$${price}/Tag</td></tr>
        </table>
        <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#555;">Der Kunde hat ein Konto angelegt. Reise manuell einrichten und die ersten Inhalte liefern.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  const res = await sendEmail({ to, subject: `Neue Buchung: Urlaub mit ${model} (${program}) — ${email}`, html, replyTo: email });
  return NextResponse.json({ ok: !!res?.ok });
}
