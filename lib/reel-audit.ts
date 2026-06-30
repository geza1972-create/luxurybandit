// Pre-post audit helpers for the Reel tool. Run over the SerpApi candidate lists to
// flag/deselect: blind text (lorem ipsum), dead/placeholder links, and — for the
// "escapes" list — sources that are NOT real travel/booking platforms (social
// profiles or random sites). Mirrors the manual launch cleanup.

export const BLIND_RE = /\b(lorem|ipsum|dolor|sit amet|consectetur|adipiscing|donec|convallis|vivamus|nullam|praesent|curabitur|phasellus|aenean|pellentesque|quisque|fusce|suspendisse|maecenas|tincidunt|euismod|malesuada|vestibulum|sodales|fringilla|porttitor|ad meliora)\b/i;

export function isBlindText(...parts: (string | undefined)[]): boolean {
  return BLIND_RE.test(parts.filter(Boolean).join(" "));
}

export function isBadLink(url?: string): boolean {
  const s = (url ?? "").trim();
  if (!s || s === "#" || s === "/") return true;
  if (/localhost|example\.com|\.test\b/i.test(s)) return true;
  return !/^https?:\/\//i.test(s);
}

// Real travel / booking platforms whose listings are fair to surface.
const TRAVEL_RE = /\b(booking|airbnb|expedia|vrbo|agoda|hotels|tripadvisor|hostelworld|trivago|kayak|hotelscombined|marriott|hilton|hyatt|accor|ihg)\b/i;
const SOCIAL_RE = /\b(facebook|instagram|tiktok|pinterest|twitter|threads)\b/i;

export function isTravelSource(url?: string, source?: string): boolean {
  return TRAVEL_RE.test(`${url ?? ""} ${source ?? ""}`);
}
export function isSocialSource(url?: string, source?: string): boolean {
  return SOCIAL_RE.test(`${url ?? ""} ${source ?? ""}`);
}

type Item = { title?: string; link?: string; source?: string };

// Display-side guard: keep ONLY real bookable stays. Hides blind text, dead links,
// social profiles and any non-booking source (furniture, fragrance, real-estate ads,
// editorial) that slipped into a look's escapes list — without deleting stored data.
export function cleanEscapes<T extends Item>(items: T[]): T[] {
  return (items ?? []).filter((a) =>
    !!a.link &&
    !isBadLink(a.link) &&
    !isBlindText(a.title, a.source) &&
    !isSocialSource(a.link, a.source) &&
    isTravelSource(a.link, a.source),
  );
}

// Returns the links that should be DESELECTED for the products list, with reasons.
export function auditProducts(items: Item[]): { drop: Set<string>; reasons: Record<string, string> } {
  const drop = new Set<string>(); const reasons: Record<string, string> = {};
  for (const a of items) {
    if (!a.link) continue;
    if (isBadLink(a.link)) { drop.add(a.link); reasons[a.link] = "toter/leerer Link"; }
    else if (isBlindText(a.title, a.source)) { drop.add(a.link); reasons[a.link] = "Blindtext"; }
  }
  return { drop, reasons };
}

// Escapes: also drop anything that isn't a real travel/booking source.
export function auditEscapes(items: Item[]): { drop: Set<string>; reasons: Record<string, string> } {
  const drop = new Set<string>(); const reasons: Record<string, string> = {};
  for (const a of items) {
    if (!a.link) continue;
    if (isBadLink(a.link)) { drop.add(a.link); reasons[a.link] = "toter/leerer Link"; }
    else if (isBlindText(a.title, a.source)) { drop.add(a.link); reasons[a.link] = "Blindtext"; }
    else if (isSocialSource(a.link, a.source)) { drop.add(a.link); reasons[a.link] = "Social-Profil (Rechte-Risiko)"; }
    else if (!isTravelSource(a.link, a.source)) { drop.add(a.link); reasons[a.link] = "keine Buchungs-Plattform"; }
  }
  return { drop, reasons };
}
