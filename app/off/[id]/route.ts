import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * KURZER ABMELDE-LINK für SMS: /off/<abonnenten-id>
 *
 * Warum kurz: Eine SMS umfasst 160 Zeichen; die lange Abmelde-Adresse hätte über 100 davon
 * gefressen und jede Nachricht auf zwei Segmente (= doppelter Preis) getrieben.
 * Warum ein Link statt „STOP": Mit einem Namen als Absender („LuxuryBandit") kann niemand
 * antworten — ein STOP-Hinweis wäre dann eine Lüge (Owner 28.07.2026).
 *
 * NICHT unter /u/… — dort liegt schon das Nutzerprofil (/u/[username]).
 */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = new URL(request.url);
  const lang = url.searchParams.get("lang") || "en";
  return NextResponse.redirect(
    `${url.origin}/api/wetter-unsubscribe?s=${encodeURIComponent(id)}&lang=${encodeURIComponent(lang)}`,
    302,
  );
}
