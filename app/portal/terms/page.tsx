import type { Metadata } from "next";
import PortalRecht from "@/components/PortalRecht";

/** AGB von lakatosbandi.com — auf dem Host lakatosbandi.com unter `/terms` (Rewrite). */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Terms of Service — lakatosbandi.com", alternates: { canonical: "https://lakatosbandi.com/terms" } };

export default async function PortalTerms({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <PortalRecht welche="agb" lang={(await searchParams).lang} />;
}
