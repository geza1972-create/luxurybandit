"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import CreatorProfilePage from "@/components/CreatorProfilePage";

// Lazy-load the LuxbanditCut workspace to avoid importing route-segment
// configs (dynamic = "force-dynamic") from app/page.tsx at module level.
const LuxbanditWorkspace = dynamic(() => import("../../page"), { ssr: false });

export default function CreatorOrWorkspace() {
  const params = useParams();
  const project = params?.project;
  const hasProject = Array.isArray(project) ? project.length > 0 : !!project;
  const creatorSlug = String(params?.creator ?? "");

  // /gerry, /jane, etc. → public profile page
  if (!hasProject) {
    return <CreatorProfilePage creatorSlug={creatorSlug} />;
  }

  // /gerry/extractor, /gerry/tool/... → LuxbanditCut workspace
  return <LuxbanditWorkspace />;
}
