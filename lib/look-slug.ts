/** Returns a unique URL segment for a look.
 *  Format: readable-slug--id  (double dash separates slug from ID)
 *  Falls back to raw ID if name is empty.
 *  The ID part guarantees uniqueness even if multiple looks share a name. */
export function lookSlug(name: string, id: string): string {
  const s = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  // Always embed the ID so URLs are unique, but keep the human-readable prefix when available
  return s ? `${s}--${id}` : id;
}

/** Full path, e.g. "/look/oversized-panther-tee--look-1234567-abc" */
export function lookPath(name: string, id: string): string {
  return `/look/${lookSlug(name, id)}`;
}
