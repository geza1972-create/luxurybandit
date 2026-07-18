"use client";

// Account page router: a plain BUYER gets the simple dark BuyerAccount (email, name,
// links, delete); a creator/curator or admin keeps the full seller dashboard.
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";
import { isAdminEmail } from "@/lib/is-admin-email";
import BuyerAccount from "@/components/BuyerAccount";
import SellerDashboard from "@/app/seller/dashboard/page";

export const dynamic = "force-dynamic";

export default function MyAccountPage() {
  const [role, setRole] = useState<"loading" | "buyer" | "pro">("loading");
  useEffect(() => {
    const s = getStoredAuthSession();
    const email = s?.user?.email?.toLowerCase() || "";
    let isCurator = false;
    try { isCurator = !!JSON.parse(localStorage.getItem("lb_curator") ?? "{}").id; } catch { /**/ }
    setRole(isCurator || (!!email && isAdminEmail(email)) ? "pro" : "buyer");
  }, []);

  if (role === "loading") {
    return <div className="grid min-h-[100dvh] place-items-center lb-bg"><Loader2 className="h-6 w-6 animate-spin text-white/80" /></div>;
  }
  return role === "pro" ? <SellerDashboard /> : <BuyerAccount />;
}
