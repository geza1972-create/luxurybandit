// Color-aware perceptual fingerprint for near-duplicate image detection (SERVER-ONLY —
// imports sharp). A plain grayscale dHash fails on catalogue shots (product on a light
// background): many different garments share the same structure, and color — the main
// difference between a black vs. red vs. blue version of the same cut — is thrown away.
// Instead we store a tiny downscaled RGB thumbnail so two copies of the SAME photo match
// closely while color variants of the same cut do NOT.
//
// The client-safe distance comparator lives in lib/fingerprint-distance.ts (no sharp).

const GRID = 8; // 8×8 RGB thumbnail = 192 bytes → 384 hex chars

// Compute the fingerprint of an image buffer → hex string of the 8×8 RGB thumbnail. Null on failure.
export async function computeImageFingerprint(buffer: Buffer): Promise<string | null> {
  try {
    const sharp = (await import("sharp")).default;
    const raw = await sharp(buffer).removeAlpha().resize(GRID, GRID, { fit: "fill" }).raw().toBuffer(); // GRID*GRID*3 bytes
    let hex = "";
    for (let i = 0; i < raw.length; i++) hex += raw[i].toString(16).padStart(2, "0");
    return hex;
  } catch {
    return null;
  }
}
