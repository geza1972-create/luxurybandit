import { NextResponse } from "next/server";
import { readdir } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const revalidate = 0;

// Lists the mp3 tracks dropped in /public so the feed can rotate through them.
// Add or remove tracks by just adding/removing .mp3 files in public/.
export async function GET() {
  try {
    const dir = path.join(process.cwd(), "public");
    const tracks = (await readdir(dir))
      .filter((f) => /\.mp3$/i.test(f))
      .map((f) => `/${encodeURIComponent(f)}`);
    return NextResponse.json({ tracks });
  } catch {
    return NextResponse.json({ tracks: [] });
  }
}
