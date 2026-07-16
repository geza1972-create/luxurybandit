// LuxuryBandit wardrobe taxonomy — every look belongs to a *luxury world*, not a
// technical folder. Each look carries FIVE structured attributes that the ADMIN sees
// and filters by, but the CUSTOMER never sees as a raw tag list — instead they're
// composed into an editorial title (e.g. "🍋 Monaco Riviera Collection").
//
//   Location   — the dream destination (Monaco, Capri, Paris, Dubai…)
//   Collection — the fashion story (Riviera, Black Tie, White Party…)  [rich: release+public]
//   Theme      — the visual language (Floral, Citrus, Emerald…)         [supplies the emoji]
//   Occasion   — where it belongs (Yacht, Gala, Pool, Rooftop…)
//   Style      — the direction (Luxury, Elegant, Sexy, Bold…)
//
// Vocab lists are admin-editable (stored in state.wardrobeVocab); these are the seed
// defaults. Collections live in their own state.collections[] (they carry release flags).

export type ThemeEntry = { name: string; emoji: string };

// Garment TYPE tree — the second browsing level (below Location). Each category (Kleider,
// Lingerie…) holds sub-types (Sommerkleid, Abendkleid…). Admin-editable.
export type GarmentCategoryDef = { name: string; emoji?: string; subcategories: string[] };

export type WardrobeVocab = {
  locations: string[];
  themes: ThemeEntry[];
  occasions: string[];
  styles: string[];
  garmentCategories?: GarmentCategoryDef[];
};

export const DEFAULT_LOCATIONS = [
  "Monaco", "Capri", "Amalfi", "Saint-Tropez", "Paris",
  "Milan", "Dubai", "Ibiza", "Tokyo", "New York",
];

export const DEFAULT_THEMES: ThemeEntry[] = [
  { name: "Floral", emoji: "🌸" },
  { name: "Emerald", emoji: "💚" },
  { name: "Citrus", emoji: "🍋" },
  { name: "Pearl", emoji: "🤍" },
  { name: "Marble", emoji: "🏛️" },
  { name: "Panther", emoji: "🐆" },
  { name: "Gold", emoji: "✨" },
  { name: "Midnight", emoji: "🌙" },
  { name: "Ocean", emoji: "🌊" },
  { name: "Crystal", emoji: "💎" },
];

export const DEFAULT_OCCASIONS = [
  "Beach", "Yacht", "Pool", "Dinner", "Gala",
  "Business", "Weekend", "Vacation", "Party", "Rooftop",
  // Intimate contexts — the owner must explicitly opt into these for lingerie content.
  "Abends", "Dessous",
];

export const DEFAULT_STYLES = [
  "Luxury", "Elegant", "Modern", "Classic", "Sexy", "Romantic", "Minimal", "Bold",
];

// Collection names that describe a fashion story (seeded into state.collections[]).
export const DEFAULT_COLLECTION_NAMES = [
  "Riviera", "White Party", "After Dark", "Resort", "Black Tie",
  "Golden Hour", "Summer Escape", "Red Carpet", "Yacht Club", "Winter Gala",
];

// Garment TYPE tree (second level, below Location). Category → sub-types.
export const DEFAULT_GARMENT_CATEGORIES: GarmentCategoryDef[] = [
  { name: "Kleider", emoji: "👗", subcategories: ["Sommerkleid", "Abendkleid", "Cocktailkleid", "Maxikleid", "Slip Dress"] },
  { name: "Lingerie", emoji: "🩱", subcategories: ["Set", "Body", "BH", "Corsage", "Babydoll"] },
  { name: "Bademode", emoji: "👙", subcategories: ["Bikini", "Badeanzug", "Monokini"] },
  { name: "Anzüge", emoji: "🤵", subcategories: ["Blazer", "Hosenanzug", "Weste"] },
  { name: "Tops", emoji: "👚", subcategories: ["Bluse", "Corset Top", "Bodysuit"] },
  { name: "Röcke", emoji: "🧵", subcategories: ["Minirock", "Maxirock"] },
];

export function defaultWardrobeVocab(): WardrobeVocab {
  return {
    locations: [...DEFAULT_LOCATIONS],
    themes: DEFAULT_THEMES.map(t => ({ ...t })),
    occasions: [...DEFAULT_OCCASIONS],
    styles: [...DEFAULT_STYLES],
    garmentCategories: DEFAULT_GARMENT_CATEGORIES.map(c => ({ ...c, subcategories: [...c.subcategories] })),
  };
}

// Emoji for a theme name (from the vocab, else a small built-in fallback, else ✨).
const FALLBACK_THEME_EMOJI: Record<string, string> = Object.fromEntries(
  DEFAULT_THEMES.map(t => [t.name.toLowerCase(), t.emoji])
);
export function themeEmoji(theme: string | undefined, themes?: ThemeEntry[]): string {
  if (!theme) return "";
  const key = theme.trim().toLowerCase();
  const fromVocab = (themes ?? []).find(t => t.name.trim().toLowerCase() === key)?.emoji;
  return fromVocab || FALLBACK_THEME_EMOJI[key] || "✨";
}

// Compose the customer-facing editorial title: emoji (from Theme) + Location + Collection.
// e.g. { location: "Monaco", collection: "Riviera", theme: "Citrus" } → "🍋 Monaco Riviera Collection".
// Degrades gracefully when attributes are missing (never shows a raw tag list).
export function editorialTitle(input: {
  location?: string;
  collection?: string;
  theme?: string;
  themes?: ThemeEntry[];
}): string {
  const emoji = themeEmoji(input.theme, input.themes);
  const loc = (input.location ?? "").trim();
  const col = (input.collection ?? "").trim();
  const words = [loc, col].filter(Boolean).join(" ");
  const base = words ? `${words} Collection` : (col ? `${col} Collection` : "");
  const title = base || loc || col || "";
  if (!title) return "";
  return emoji ? `${emoji} ${title}` : title;
}
