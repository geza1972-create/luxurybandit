import type { Metadata } from "next";
import PortalRecht from "@/components/PortalRecht";

/** Datenschutz von lakatosbandi.com — auf dem Host lakatosbandi.com unter `/privacy` (Rewrite). */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Privacy Policy — lakatosbandi.com", alternates: { canonical: "https://lakatosbandi.com/privacy" } };

export default async function PortalPrivacy({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <PortalRecht welche="datenschutz" lang={(await searchParams).lang} />;
}
