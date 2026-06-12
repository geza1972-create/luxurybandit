// /[username]/myaccount takes priority over /[creator]/[[...project]] catch-all.
// Renders the same account page regardless of the username prefix.
export { default } from "@/app/seller/dashboard/page";
export const dynamic = "force-dynamic";
