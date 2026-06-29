// Licensing-safe look image. For curated "Studio Web" finds, the raw frontImage/
// imageUrl is the brand's ORIGINAL product photo — we must NOT display it. Only the
// images WE created (AI try-on render, video poster, or AI-created look image) are safe.
// Returns "" when there is no safe still (caller can fall back to the video or a
// placeholder — never to the original).

type ImgLook = {
  aiCreated?: boolean;
  frontImageUrl?: string;
  imageUrl?: string;
  tryOnImageUrl?: string;
  videoPosterUrl?: string;
};

export function safeLookImage(look: ImgLook): string {
  // AI-Studio looks: the main image IS our AI creation → safe to show.
  if (look.aiCreated) return look.frontImageUrl || look.imageUrl || "";
  // Curated web finds: only a render we generated. Never the scraped original.
  return look.videoPosterUrl || look.tryOnImageUrl || "";
}
