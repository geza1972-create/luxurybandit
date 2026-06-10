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
  const greeting = input.shopperName ? `Hi, I'm ${input.shopperName}.` : "Hi,";

  const lines = [
    greeting,
    `I'd like to reserve this piece from ${input.boutiqueName}:`,
    `*${input.productName}*`
  ];

  if (input.salePrice) lines.push(`Price: ${input.salePrice}${input.discountLabel ? ` (${input.discountLabel})` : ""}`);
  else if (input.regularPrice) lines.push(`Price: ${input.regularPrice}`);

  if (input.selectedSize) lines.push(`Size: ${input.selectedSize}`);
  if (input.buyingPreference === "delivery") lines.push("Delivery preferred — please confirm cost, address & payment.");
  else if (input.buyingPreference === "pickup") lines.push("I'll pick it up — please confirm address & payment.");

  if (input.offerUrl) lines.push(`\nListing: ${input.offerUrl}`);

  lines.push("\nIs it still available?");

  return lines.join("\n");
}

export function buildWhatsAppDeepLink(phoneNumber: string, message: string) {
  const phone = normalizeWhatsAppNumber(phoneNumber);
  if (!phone) return "";
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
