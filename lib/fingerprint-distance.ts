// Pure, client-safe comparison for image fingerprints (no sharp / Node deps — safe to
// import into client components). The fingerprint itself is produced server-side by
// lib/image-hash.ts (computeImageFingerprint), which needs sharp.

// Mean absolute per-channel difference between two RGB-thumbnail fingerprints (hex).
// ~0 = the same photo; small = near-identical; large = different color/garment. 255 if malformed.
export function fingerprintDistance(a?: string, b?: string): number {
  if (!a || !b || a.length !== b.length || a.length < 2) return 255;
  let sum = 0;
  const n = a.length / 2;
  for (let i = 0; i < a.length; i += 2) {
    const x = parseInt(a.slice(i, i + 2), 16);
    const y = parseInt(b.slice(i, i + 2), 16);
    sum += Math.abs(x - y);
  }
  return sum / n;
}
