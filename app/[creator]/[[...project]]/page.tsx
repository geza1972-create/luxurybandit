"use client";

import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import CreatorProfilePage from "@/components/CreatorProfilePage";

// Lazy-load the LuxbanditCut workspace.
const LuxbanditWorkspace = dynamic(() => import("@/components/LuxbanditCutTool"), { ssr: false });

export default function CreatorOrWorkspace() {
  const params = useParams();
  const router = useRouter();
  const project = params?.project;
  const hasProject = Array.isArray(project) ? project.length > 0 : !!project;
  const creatorSlug = String(params?.creator ?? "");

  // For a bare profile URL (/szidonia-bandi), prefer the canonical curator page.
  // Resolve the slug → curator id and redirect; fall back to the legacy profile
  // page only when no curator matches (e.g. a Supabase-only creator).
  const [resolved, setResolved] = useState(false);
  useEffect(() => {
    if (hasProject || !creatorSlug) { setResolved(true); return; }
    let active = true;
    fetch(`/api/curator?bySlug=${encodeURIComponent(creatorSlug)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!active) return;
        if (d?.id) router.replace(`/curator/${d.id}`);
        else setResolved(true);
      })
      .catch(() => { if (active) setResolved(true); });
    return () => { active = false; };
  }, [creatorSlug, hasProject, router]);

  // /gerry/extractor, /gerry/tool/... → LuxbanditCut workspace
  if (hasProject) return <LuxbanditWorkspace />;

  // Resolving (or redirecting) → spinner; once resolved with no curator, legacy page.
  if (!resolved) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-black/20 border-t-black" />
      </div>
    );
  }
  return <CreatorProfilePage creatorSlug={creatorSlug} />;
}
