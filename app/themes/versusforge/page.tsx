import { redirect } from "next/navigation";
import { resolveLang } from "@/lib/lang-server";
import { ART_SPRACHEN } from "@/lib/versusforge-art-landing-texte";

/**
 * OHNE SPRACHE IN DER ADRESSE → WEITER AUF DIE ERKANNTE SPRACHE (Owner 10.09.2026: „URLs sind
 * wichtig mit /de"). Die Seite selbst liegt unter `/themes/versusforge/en|ro|de`; hier steht
 * nur die Weiche, damit Katalog-Karte und alte Links weiter funktionieren. Englisch zuerst.
 */
export const dynamic = "force-dynamic";

export default async function VersusForgeArtWeiche() {
  const erkannt = await resolveLang("en");
  redirect(`/themes/versusforge/${ART_SPRACHEN.includes(erkannt) ? erkannt : "en"}`);
}
