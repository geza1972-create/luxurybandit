/**
 * Öffentliche Kanäle der Marke — an EINER Stelle, damit ein Wechsel nicht in fünf
 * Dateien nachgezogen werden muss.
 *
 * WhatsApp-Kanal (Owner 28.07.2026): Einbahnstraße — wir senden, alle lesen mit, niemand
 * sieht die Nummern der anderen. Deshalb der richtige Ort für die Tagespost-Leser, im
 * Gegensatz zu einer Gruppe, in der sich 49 Fremde gegenseitig die Nummer zeigen würden.
 */
export const WHATSAPP_CHANNEL = "https://whatsapp.com/channel/0029VbD9Te45K3zR16YL1c2r";

const FOLLOW: Record<string, string> = {
  en: "Follow on WhatsApp",
  de: "Auf WhatsApp folgen",
  ro: "Urmărește pe WhatsApp",
  es: "Síguenos en WhatsApp",
  fr: "Suivre sur WhatsApp",
  pt: "Segue no WhatsApp",
  pl: "Obserwuj na WhatsAppie",
  it: "Segui su WhatsApp",
};
export const followWhatsApp = (lang?: string) => FOLLOW[String(lang ?? "en").slice(0, 2)] ?? FOLLOW.en;
