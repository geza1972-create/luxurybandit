// Admin/brand-created try-ons are stored with customerName "You" (see the memory
// admin-tryons-identified-by-customername-you — that literal value is how "My Try-ons"
// finds them, so we DON'T rename it in the data). But "You" is meaningless to everyone
// else in a public feed/grid/reel — there it's the brand speaking, so display it as
// "Luxurybandit".
export function publicAuthorName(name?: string | null): string {
  const n = (name ?? "").trim();
  if (!n || n.toLowerCase() === "you") return "Luxurybandit";
  return n;
}
