/**
 * DER HAUS-PROMPT FÜRS ANZIEHEN — eine Quelle für alle Funnels.
 *
 * Warum es das gibt: Im Chat-Thema stand ein selbst ausgedachter Zweizeiler
 * („Dress the person … keep her face"), und das Ergebnis war eine andere Frau in einem
 * anderen Teil (Owner 28.07.2026: „so was darf nie passieren"). Die Regeln, die im
 * Outfit-Builder seit Monaten funktionieren, gelten ab jetzt überall — wer einen neuen
 * Anzieh-Weg baut, nimmt diese Funktion und erfindet KEINEN eigenen Prompt.
 *
 * Kernregeln (aus components/OutfitBuilder.tsx übernommen):
 *  · Das Kleidungsfoto ist die EINZIGE Quelle für das Teil („source of truth").
 *  · Nichts hinzufügen, nichts weglassen, Farben/Schnitt/Details nicht verändern.
 *  · Das Model-Foto bestimmt Gesicht, Haare, Körper und Bildausschnitt.
 */

export function tryonPrompt(opts: { garment?: string } = {}): string {
  const { garment = "" } = opts;
  return [
    "Create a professional ecommerce fashion image using the attached clean garment reference as the exact clothing source.",
    "",
    "Dress the person from the model reference in only this garment:",
    garment || "The attached apparel asset.",
    "",
    "Use the garment reference as the source of truth.",
    "Do not use other garments.",
    "Do not add extra clothing pieces that are not in the reference.",
    "Do not remove pieces that are in the reference.",
    "Do not change colors.",
    "Preserve prints, seams, logos, fabric types, hardware, placement, and proportions.",
    "Keep her face, hair, skin tone and body exactly as in the model reference.",
    // IMMER GANZ ZEIGEN (Owner 28.07.2026): das Ziel ist die Frau von Kopf bis Fuß, damit
    // das Foto danach als Video gedreht werden kann. Nie den Ausschnitt des Model-Fotos
    // übernehmen — ein Brustporträt lässt sich nicht drehen.
    "Show the complete woman from head to toe, full figure inside the frame, standing.",
    "Do not crop her legs or feet. Leave space around her so she can be turned in a video.",
    "Natural light, photorealistic. Apparel-focused, commercial fashion presentation.",
  ].join("\n");
}
