// Lingerie / swimwear classifier — pure & dependency-free so it can run on both
// the server (serializeLook, generation routes) and the client (try-on page).
//
// A "lingerie" look (lingerie, intimates, or swimwear) is routed straight to
// FASHN — OpenAI would either refuse it or "cover it up" into a dress — and it
// drives the paid pricing tier ($2.90 image / $4.90 video) on the public side.

// STRONG intimate keywords — these are lingerie no matter what else is in the name.
const INTIMATE_RE =
  /\b(lingerie|intimates?|bralette|bra|teddy|babydoll|negligee|nightie|nightgown|chemise|garter|suspender|thong|g-?string|knickers?|briefs?|panty|panties|underwear|undergarment|shapewear)\b/i;

// AMBIGUOUS keywords — common in mainstream OUTERWEAR too (a corset dress, a bustier
// gown, a slip dress, a robe coat). Only count as lingerie when the item is NOT clearly
// outerwear (see OUTERWEAR_RE). This stops e.g. a "Mugler corset mini dress" being
// priced/treated as lingerie.
const AMBIGUOUS_RE = /\b(corset|bustier|bodysuit|slip dress|silk slip|robe|kimono)\b/i;

// Clear outerwear words — their presence overrides an ambiguous match.
const OUTERWEAR_RE = /\b(dress|gown|jumpsuit|skirt|blazer|suit|coat|jacket|trouser|pant|shorts|top|shirt|blouse|two-?piece|set|cardigan|sweater|knit)\b/i;

const SWIM_RE =
  /\b(swim(suit|wear)?|bikini|one-?piece|one piece|monokini|tankini|bathing suit|maillot|cover-?up)\b/i;

// Brands that are primarily lingerie / swimwear houses.
const INTIMATE_BRAND_RE =
  /\b(intimissimi|la perla|hunkem[oö]ller|victoria'?s secret|agent provocateur|os[ée]ree|savage(\s*x)?\s*fenty|cosabella|aubade|fleur du mal|coco de mer|kiki de montparnasse|honey birdette|bluebella|lounge underwear|skims swim)\b/i;

/** True when a look's text (name + notes + brand) reads as lingerie/swimwear. */
export function isIntimateName(text: string): boolean {
  const t = text || "";
  if (INTIMATE_RE.test(t) || SWIM_RE.test(t) || INTIMATE_BRAND_RE.test(t)) return true;
  // Ambiguous term only counts when it's NOT described as outerwear (a dress/gown/etc.).
  if (AMBIGUOUS_RE.test(t) && !OUTERWEAR_RE.test(t)) return true;
  return false;
}
