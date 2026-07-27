import { NextResponse } from "next/server";
import { readTryThisLookState, readCardStudioSlides, getSignedUrl } from "@/lib/try-this-look-store";
import { categorizeLook } from "@/lib/look-category";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ÖFFENTLICHE Beispiel-Clips für die Themen-Landings — aus dem, was wir SCHON haben
 * (147 fertige Generierungen), statt für jede Seite neu zu rendern.
 *
 * Zwei Regeln, die hier hart drin bleiben:
 *  - Nur was fürs Schaufenster freigegeben ist (`feed`/`showcase`), nichts Verstecktes.
 *  - KEINE Dessous-/Boudoir-Try-ons. Das sind private Ergebnisse echter Nutzer und gehören
 *    nirgends öffentlich hin — unabhängig davon, wie das Feed-Flag steht.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(24, Math.max(1, Number(url.searchParams.get("limit") ?? "8") || 8));

  try {
    // 1) SPRECHENDE Clips zuerst: Bellas Tagesvideos aus dem Card-Tool — dort redet sie in
    //    die Kamera, und genau das soll das Chat-Thema zeigen. Eigene Inhalte, keine
    //    Nutzer-Try-ons. Privates und Verstecktes bleibt draußen.
    const speaking = (await readCardStudioSlides().catch(() => []))
      .filter(sl => {
        const x = sl as Record<string, unknown>;
        return x.kind === "video" && !!x.path && x.private !== true && x.hidden !== true;
      })
      .slice(0, limit);
    const speakingItems = (await Promise.all(speaking.map(async sl => {
      const x = sl as Record<string, unknown>;
      const video = (await getSignedUrl(String(x.path)).catch(() => "")) || "";
      const poster = x.posterPath ? (await getSignedUrl(String(x.posterPath)).catch(() => "")) || "" : "";
      return { id: String(x.id ?? ""), video, poster };
    }))).filter(x => x.video);

    const state = await readTryThisLookState();
    const looks = new Map((state.looks ?? []).map(l => [l.id, l]));

    const items = (state.generations ?? [])
      .filter(g => {
        const gg = g as Record<string, unknown>;
        if (gg.hidden === true) return false;
        if (!(gg.feed === true || gg.showcase === true)) return false;
        const look = looks.get(String(gg.lookId ?? "")) as Record<string, unknown> | undefined;
        const lingerie = look
          ? (look.lingerie === true || categorizeLook(look as never) === "boudoir")
          : false;
        return !lingerie;
      })
      .map(g => {
        const gg = g as Record<string, unknown>;
        return {
          id: String(gg.id ?? ""),
          video: String(gg.videoUrl ?? ""),
          poster: String(gg.imageUrl ?? ""),
        };
      })
      .filter(x => x.video || x.poster);

    // Sprechende Clips vorn, dann die Try-on-Clips — zusammen auf `limit` gekürzt.
    const merged = [...speakingItems, ...items].slice(0, limit);
    return NextResponse.json({ items: merged });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
