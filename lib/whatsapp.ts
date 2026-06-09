export type WhatsAppOfferMessageInput = {
  boutiqueName: string;
  campaignTitle?: string;
  productName: string;
  selectedSize?: string;
  buyingPreference?: "pickup" | "delivery";
  shopperName?: string;
  salePrice?: string;
  regularPrice?: string;
  discountLabel?: string;
  deliveryTime?: string;
  offerUrl?: string;
};

export function normalizeWhatsAppNumber(value = "") {
  return value.replace(/[^\d]/g, "");
}

const formatDaysLabel = (value?: string) => {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  const number = trimmed.match(/\d+/)?.[0];
  if (!number) return trimmed;
  return `${number} day${number === "1" ? "" : "s"}`;
};

export function buildWhatsAppOfferMessage(input: WhatsAppOfferMessageInput) {
  const lines = [
    `Hi ${input.boutiqueName},`,
    `I found your offer${input.campaignTitle ? ` via ${input.campaignTitle}` : ""}.`,
    `I would like to pre-order: ${input.productName}.`
  ];

  if (input.selectedSize) lines.push(`Size: ${input.selectedSize}.`);
  if (input.buyingPreference) lines.push(`Preference: ${input.buyingPreference === "delivery" ? "delivery" : "pickup"}.`);
  if (input.shopperName) lines.push(`My name is ${input.shopperName}.`);
  if (input.buyingPreference === "delivery") lines.push("Please confirm delivery cost, address details, and payment.");
  if (input.buyingPreference === "pickup") lines.push("Please confirm pickup address and payment.");
  if (input.salePrice) lines.push(`Action price: ${input.salePrice}.`);
  if (input.regularPrice) lines.push(`Regular price: ${input.regularPrice}.`);
  if (input.discountLabel) lines.push(`Deal: ${input.discountLabel}.`);
  if (input.deliveryTime) lines.push(`Estimated delivery time: ${formatDaysLabel(input.deliveryTime)}.`);
  if (input.offerUrl) lines.push(`Offer link: ${input.offerUrl}`);

  return lines.join("\n");
}

export function buildWhatsAppDeepLink(phoneNumber: string, message: string) {
  const phone = normalizeWhatsAppNumber(phoneNumber);
  if (!phone) return "";
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
