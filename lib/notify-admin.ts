// Fire-and-forget WhatsApp alert to the admin phone via CallMeBot.
// Needs ADMIN_WHATSAPP_PHONE (international format, no +) and CALLMEBOT_API_KEY.
// Never throws and never blocks the caller — alerts are best-effort.
export function notifyAdminWhatsApp(text: string): void {
  const phone = process.env.ADMIN_WHATSAPP_PHONE?.trim();
  const key = process.env.CALLMEBOT_API_KEY?.trim();
  if (!phone || !key) return;
  fetch(`https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(text)}&apikey=${key}`)
    .catch(() => {});
}

export const ADMIN_URL = "https://luxurybandit.com/admin";
