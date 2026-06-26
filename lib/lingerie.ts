// Lingerie / swimwear classifier — pure & dependency-free so it can run on both
// the server (serializeLook, generation routes) and the client (try-on page).
//
// A "lingerie" look (lingerie, intimates, or swimwear) is routed straight to
// FASHN — OpenAI would either refuse it or "cover it up" into a dress — and it
// drives the paid pricing tier ($2.90 image / $4.90 video) on the public side.

const INTIMATE_RE =
  // garment / category keywords
  /\b(lingerie|intimates?|bralette|bra|corset|bustier|teddy|babydoll|negligee|nightie|nightgown|chemise|garter|suspender|thong|g-?string|knickers?|briefs?|panty|panties|underwear|undergarment|bodysuit|shapewear|slip dress|silk slip|robe|kimono)\b/i;

const SWIM_RE =
  /\b(swim(suit|wear)?|bikini|one-?piece|one piece|monokini|tankini|bathing suit|maillot|cover-?up)\b/i;

// Brands that are primarily lingerie / swimwear houses.
const INTIMATE_BRAND_RE =
  /\b(intimissimi|la perla|hunkem[oö]ller|victoria'?s secret|agent provocateur|os[ée]ree|savage(\s*x)?\s*fenty|cosabella|aubade|fleur du mal|coco de mer|kiki de montparnasse|honey birdette|bluebella|lounge underwear|skims swim)\b/i;

/** True when a look's text (name + notes + brand) reads as lingerie/swimwear. */
export function isIntimateName(text: string): boolean {
  const t = text || "";
  return INTIMATE_RE.test(t) || SWIM_RE.test(t) || INTIMATE_BRAND_RE.test(t);
}
