import { NextResponse } from "next/server";
import { createSignedUploadUrl } from "@/lib/try-this-look-store";

export const runtime = "nodejs";

/**
 * SIGNIERTE UPLOAD-ADRESSE FÜR DIE EIGENAUFNAHME (Memory `large-uploads-direct-to-supabase`
 * — Vercel deckelt den API-Body auf ~4,5 MB, ein Aufnahme-Video ist meist grösser). Der
 * Browser lädt danach direkt zu Supabase hoch (PUT auf `uploadUrl`), diese Route liefert nur
 * den einmaligen Signier-Pfad.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const extension = String(body.extension ?? "mp4").trim();
  try {
    const { path, uploadUrl } = await createSignedUploadUrl("videos", extension);
    return NextResponse.json({ path, uploadUrl });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Konnte keine Upload-Adresse erzeugen." }, { status: 500 });
  }
}
