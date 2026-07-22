// Versand an ABONNENTEN über die offizielle WhatsApp Business Cloud API (Meta) — der „Bot".
// (Nicht zu verwechseln mit lib/whatsapp-send.ts = CallMeBot-Notifications an DICH als Admin.)
//
// Vom Unternehmen gestartete Nachrichten (nicht als Antwort) brauchen bei WhatsApp immer eine
// von Meta GENEHMIGTE Vorlage („template"). Wir schicken diese Vorlage mit zwei Body-Variablen.
//
// Nötige Env-Variablen (Vercel):
//   WHATSAPP_TOKEN                 – dauerhafter Access-Token des WhatsApp-Business-Accounts
//   WHATSAPP_PHONE_NUMBER_ID       – Phone-Number-ID der API-Nummer (NICHT die Rufnummer)
//   WHATSAPP_TEMPLATE              – Name der genehmigten Vorlage (z. B. "wetter_dimineata")
//   WHATSAPP_TEMPLATE_DEFAULT_LANG – optional, Fallback-Sprachcode (Default "ro")
//
// Vorlage: zwei Body-Variablen {{1}} = Name, {{2}} = persönlicher Link. Für ro/de/en unter
// DEMSELBEN Namen anlegen → die Sprache des Abonnenten wird automatisch gewählt.

const GRAPH = "https://graph.facebook.com/v21.0";

export function whatsappCloudConfigured(): boolean {
  return !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_TEMPLATE);
}

export async function sendWhatsAppTemplate({ to, lang, bodyParams }: {
  to: string; lang: string; bodyParams: string[];
}): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const template = process.env.WHATSAPP_TEMPLATE;
  if (!token || !phoneId || !template) return { ok: false, error: "WhatsApp-Bot nicht eingerichtet (Env fehlt)." };

  const digits = String(to || "").replace(/[^0-9]/g, "");
  if (!digits) return { ok: false, error: "Keine Telefonnummer." };

  // WHATSAPP_TEMPLATE_LANG erzwingt EINE Sprache für alle (z. B. "en"), wenn nur eine Vorlage
  // existiert. Sonst: Sprache des Abonnenten (ro/de/en), sonst der Default (en).
  const forced = process.env.WHATSAPP_TEMPLATE_LANG;
  const langCode = forced || (/^(ro|de|en)$/.test(lang) ? lang : (process.env.WHATSAPP_TEMPLATE_DEFAULT_LANG || "en"));
  const payload = {
    messaging_product: "whatsapp",
    to: digits,
    type: "template",
    template: {
      name: template,
      language: { code: langCode },
      components: [{ type: "body", parameters: bodyParams.map(t => ({ type: "text", text: String(t) })) }],
    },
  };

  try {
    const r = await fetch(`${GRAPH}/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: (d as { error?: { message?: string } })?.error?.message || `HTTP ${r.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Senden fehlgeschlagen." };
  }
}
