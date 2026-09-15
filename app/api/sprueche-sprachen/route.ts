import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { spruecheInSprachen } from "@/lib/versusforge-spruch-sprachen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/* Je Künstler und fehlender Sprache ein Aufruf beim kleinen Modell — beim ersten Lauf über alle
   Künstler dauert das länger als eine Sekunde. */
export const maxDuration = 300;

/**
 * DIE SPRÜCHE IN DEN ANDEREN PORTALSPRACHEN — einmal am Tag (Owner 14.09.2026: „einmal am tag
 * musst du übersetzen").
 *
 * ZWEI TÜREN, wie beim Rückläufer und beim Lead-Abholer:
 *   1. Ohne `?echt=1` ist es ein PROBELAUF — es wird nichts geschrieben und nichts bezahlt.
 *   2. `?echt=1` (oder der Cron) schreibt wirklich.
 *
 * NUR FÜR ADMIN ODER CRON: Ein offener Endpunkt wäre hier ein Knopf, der auf fremde Kosten
 * Modellaufrufe auslöst. Begründung im Wortlaut: app/api/ruecklaeufer/route.ts.
 */

function schluessel(): string {
  return (process.env.CRON_SECRET || process.env.TRY_THIS_LOOK_ADMIN_PIN || "").trim();
}

async function darf(request: Request): Promise<boolean> {
  const k = schluessel();
  if (!k && request.headers.get("x-vercel-cron")) return true;
  if (k) {
    const url = new URL(request.url);
    if (url.searchParams.get("key")?.trim() === k) return true;
    if (request.headers.get("authorization")?.trim() === `Bearer ${k}`) return true;
  }
  return isAdminRequest(request).catch(() => false);
}

export async function GET(request: Request) {
  if (!(await darf(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });

  const q = new URL(request.url).searchParams;
  const echt = q.get("echt") === "1" || !!request.headers.get("x-vercel-cron");
  const bericht = await spruecheInSprachen({ nurZeigen: !echt });

  return NextResponse.json({
    probelauf: !echt,
    ...bericht,
    hinweis: bericht.fehler ? undefined
      : echt ? undefined
      : "Probelauf — nichts geschrieben, nichts bezahlt. Zum Scharfschalten `?echt=1` anhängen.",
  }, { status: bericht.fehler ? 502 : 200 });
}
