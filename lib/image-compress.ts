/**
 * Server-side image compression using sharp.
 * Resizes to max 1920px on the longest side and converts to WebP.
 * Falls back to the original buffer if sharp is unavailable.
 */
export async function compressImage(
  base64: string,
  mimeType: string
): Promise<{ buffer: Buffer; mimeType: string; extension: string }> {
  const inputBuffer = Buffer.from(base64, "base64");

  try {
    const sharp = (await import("sharp")).default;
    const compressed = await sharp(inputBuffer)
      .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    return { buffer: compressed, mimeType: "image/webp", extension: "webp" };
  } catch {
    // sharp not available in this environment – use original
    const extension = mimeType.includes("jpeg") ? "jpg"
      : mimeType.includes("webp") ? "webp"
      : "png";
    return { buffer: inputBuffer, mimeType, extension };
  }
}
