"use client";

export const dynamic = "force-dynamic";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";
import SellerDashboard from "@/app/seller/dashboard/page";

export default function MyAccountPage() {
  const params = useParams();
  const router = useRouter();
  const creatorSlug = String(params?.creator ?? "").toLowerCase();

  useEffect(() => {
    const session = getStoredAuthSession();
    if (!session) return;
    const meta = (session.user as any)?.user_metadata ?? {};
    const correctSlug = (meta.username ?? meta.full_name ?? session.user.email?.split("@")[0] ?? "")
      .trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (correctSlug && creatorSlug !== correctSlug) {
      router.replace(`/${correctSlug}/myaccount`);
    }
  }, [creatorSlug, router]);

  return <SellerDashboard />;
}
