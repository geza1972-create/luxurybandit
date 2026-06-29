// Editorial look categories — these REPLACE brand names as the top-level filter.
// We never surface company/brand names as categories; instead every look belongs to
// one of four aspirational "worlds". Boudoir (lingerie) is the only one hidden from
// the default "All" feed — it only shows when its chip is explicitly selected.

export type LookCategory = "after-dark" | "riviera" | "boudoir" | "off-duty";

export interface LookCategoryDef {
  slug: LookCategory;
  label: string;
  blurb: string;
  /** Hidden from the default "All" feed; only shown when its own chip is picked. */
  hideFromAll?: boolean;
}

// Display order. Boudoir is last (and hidden from All).
export const LOOK_CATEGORIES: LookCategoryDef[] = [
  { slug: "after-dark", label: "After Dark", blurb: "Evening gowns, gold, red-carpet glamour" },
  { slug: "riviera", label: "Riviera", blurb: "Swim, bodysuits, beach-luxe, poolside" },
  { slug: "off-duty", label: "Off-Duty", blurb: "Satin sets, street-luxe, new-money casual" },
  { slug: "boudoir", label: "Boudoir", blurb: "Lingerie — elegant, suggestive", hideFromAll: true },
];

const CATEGORY_SLUGS = new Set<string>(LOOK_CATEGORIES.map((c) => c.slug));

export function isLookCategory(value: unknown): value is LookCategory {
  return typeof value === "string" && CATEGORY_SLUGS.has(value);
}

export function categoryLabel(slug: LookCategory): string {
  return LOOK_CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}

export function isHiddenFromAll(slug: LookCategory): boolean {
  return LOOK_CATEGORIES.find((c) => c.slug === slug)?.hideFromAll === true;
}

// Minimal shape we need to categorize a look.
type CategorizableLook = {
  name?: string | null;
  category?: unknown;
  lingerie?: unknown;
  productNote?: string | null;
  hashtags?: string | null;
  campaignName?: string | null;
};

// Resolve a look's category. Priority:
//   1. an explicit, valid `category` set by a creator/admin (wins)
//   2. the lingerie flag → Boudoir
//   3. keyword inference from the name/notes (so the 50 legacy looks get sorted
//      automatically until someone categorizes them by hand)
// `lingerieOverride` lets the API pass its already-computed lingerie value.
export function categorizeLook(look: CategorizableLook, lingerieOverride?: boolean): LookCategory {
  if (isLookCategory(look.category)) return look.category;

  const isLingerie = typeof lingerieOverride === "boolean" ? lingerieOverride : look.lingerie === true;
  if (isLingerie) return "boudoir";

  const text = [look.name, look.productNote, look.hashtags, look.campaignName]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // Riviera — beach / pool / swim
  if (/\b(swim|swimwear|swimsuit|bikini|maillot|monokini|bodysuit|beach|cover-?up|poolside|sarong|resort|kaftan|caftan)\b/.test(text)) {
    return "riviera";
  }
  // After Dark — evening / gown / red-carpet glamour
  if (/\b(gown|evening|cocktail|sequin|sequinned|sequined|embellish|embellished|crystal|metallic|gold|golden|velvet|tulle|couture|ballgown|ball gown|red carpet|beaded|glitter|shimmer|chiffon|satin gown|black tie|maxi dress|floor-length)\b/.test(text)) {
    return "after-dark";
  }
  // Off-Duty — everyday luxe (the default bucket)
  return "off-duty";
}
