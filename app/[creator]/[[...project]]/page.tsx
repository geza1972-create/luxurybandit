"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CreatorProfilePage from "@/components/CreatorProfilePage";

// DIE WERKBANK HAT NUR NOCH EINE TUER.
//
// Frueher rendete dieser Pfad die LuxbanditCut-Werkbank direkt — und weil es ein
// Auffang-Pfad ist, tat er das fuer JEDE zweiteilige Adresse: /gerry/extractor genauso
// wie /foo/bar. Beides kam mit Status 200 und ganz ohne Anmeldung durch, waehrend
// /tools/… laengst hinter der Passwortabfrage lag. Die teuren Knoepfe der Werkbank
// waren damit fuer jeden erreichbar, der irgendeine Adresse riet.
//
// Jetzt leitet dieser Pfad auf die geschuetzte Adresse um. Alte Verweise funktionieren
// weiter, sie landen nur an der Tuer statt daneben. Die Werkbank braucht ohnehin keinen
// Namen aus der Adresse — sie bekam hier nie einen mit.
const WERKBANK = "/admin/tools/luxbanditcut";

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
    if (hasProject) { router.replace(WERKBANK); return; }
    if (!creatorSlug) { setResolved(true); return; }
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

  // Resolving (or redirecting — auch die Werkbank oben) → spinner; once resolved with no
  // curator, legacy page.
  if (hasProject || !resolved) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-black/20 border-t-black" />
      </div>
    );
  }
  return <CreatorProfilePage creatorSlug={creatorSlug} />;
}
