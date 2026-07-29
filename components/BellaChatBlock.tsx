"use client";

import ModelChatInline from "@/components/ModelChatInline";

/**
 * Der Gratis-Chat auf einer Themenseite.
 *
 * Nötig, weil `ModelChatInline` einen Rückruf (`onNeedPremium`) verlangt und eine
 * Server-Komponente keine Funktion an eine Client-Komponente durchreichen kann. Statt einen
 * zweiten Kauf-Dialog aufzumachen, springt der Rückruf hier zum Kaufknopf, der ohnehin
 * schon auf der Seite steht — ein Angebot pro Seite, nicht zwei.
 */
export default function BellaChatBlock({
  curatorId, modelName, first, avatarUrl = "", freeLimit = 50, ctaId = "abo",
}: {
  curatorId: string;
  modelName: string;
  first: string;
  avatarUrl?: string;
  freeLimit?: number;
  ctaId?: string;
}) {
  return (
    <ModelChatInline
      curatorId={curatorId}
      modelName={modelName}
      first={first}
      avatarUrl={avatarUrl}
      bella
      bellaHref={`/curator/${curatorId}`}
      freeLimit={freeLimit}
      onNeedPremium={() => {
        document.getElementById(ctaId)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }}
    />
  );
}
