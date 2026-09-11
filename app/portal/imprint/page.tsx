import type { Metadata } from "next";
import PortalRecht from "@/components/PortalRecht";

/** Impressum von lakatosbandi.com — auf dem Host lakatosbandi.com unter `/imprint` (Rewrite). */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Imprint — lakatosbandi.com", alternates: { canonical: "https://lakatosbandi.com/imprint" } };

export default async function PortalImprint({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <PortalRecht welche="impressum" lang={(await searchParams).lang} />;
}
