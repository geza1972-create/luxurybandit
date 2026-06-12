// This route is the canonical URL for the account/dashboard page.
// The actual component lives in seller/dashboard/page.tsx; we re-export
// it here so both /user/myaccount and the legacy redirect work.
export { default } from "@/app/seller/dashboard/page";
export const dynamic = "force-dynamic";
