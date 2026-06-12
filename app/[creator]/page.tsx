"use client";

/**
 * /[creator] — delegates to the same unified component as [[...project]]/page.tsx.
 * Both routes use CreatorProfilePage (no project segments = show profile).
 */
import { useParams } from "next/navigation";
import CreatorProfilePage from "@/components/CreatorProfilePage";

export default function CreatorRootPage() {
  const params = useParams();
  const creatorSlug = String(params?.creator ?? "");
  return <CreatorProfilePage creatorSlug={creatorSlug} />;
}
