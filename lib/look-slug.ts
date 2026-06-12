/** Returns a human-readable URL slug for a look.
 *  Falls back to the raw ID if name is empty or all-special-chars. */
export function lookSlug(name: string, id: string): string {
  const s = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s || id;
}

/** Full path, e.g. "/look/oversized-panther-tee" */
export function lookPath(name: string, id: string): string {
  return `/look/${lookSlug(name, id)}`;
}
