// /[username]/mystore takes priority over /[creator]/[[...project]] catch-all.
// Renders the My Store page regardless of the username prefix.
export { default } from "@/app/user/mystore/page";
export const dynamic = "force-dynamic";
