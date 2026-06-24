// Curator-facing AI Studio. Same tool as the admin's /admin/trends, but on a
// non-/admin route so it isn't behind the admin Basic-Auth wall. Access is
// enforced at the API layer (admin PIN or a valid curator session).
export { default } from "@/app/admin/trends/page";
export const dynamic = "force-dynamic";
