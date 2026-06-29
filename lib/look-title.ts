// Public-facing look title. We must NOT show the real brand/product name (e.g.
// "The Row Women's Black Johanne Silk Dress") to users — licensing. Instead we show
// the curator's editorial description. The raw `name` is kept for admin tools + slugs.

type TitleParts = {
  curatorNote?: string | null;
  productNote?: string | null;
};

// The editorial description used as the public label/title. Empty string if none.
export function publicLookTitle(look: TitleParts): string {
  return (look.curatorNote || look.productNote || "").trim();
}

// A public label with a sensible non-empty fallback (e.g. for a card that needs SOME
// text): the description, else a person/curator name, else a neutral word — never the
// brand product name.
export function publicLookLabel(look: TitleParts, fallbackName?: string | null): string {
  return publicLookTitle(look) || (fallbackName || "").trim() || "Luxury look";
}
