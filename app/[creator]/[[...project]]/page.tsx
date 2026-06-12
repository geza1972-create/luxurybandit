"use client";

/**
 * Unified route handler for /[creator] and /[creator]/[...project].
 *
 * - /gerry              → project is undefined → public creator profile
 * - /gerry/tool         → project has segments → LuxbanditCut workspace
 * - /gerry/tool/session → same
 */

import { useParams } from "next/navigation";
import CreatorProfilePage from "@/components/CreatorProfilePage";
import HomeContent from "@/app/page";

export default function CreatorOrWorkspace() {
  const params = useParams();
  const project = params?.project;
  const hasProject = Array.isArray(project) ? project.length > 0 : !!project;
  const creatorSlug = String(params?.creator ?? "");

  if (hasProject) {
    // Existing LuxbanditCut workspace (e.g. /gerry/extractor)
    return <HomeContent />;
  }

  // Public profile page (e.g. /gerry)
  return <CreatorProfilePage creatorSlug={creatorSlug} />;
}
