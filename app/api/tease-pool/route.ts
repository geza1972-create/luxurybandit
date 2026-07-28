import { NextResponse } from "next/server";
import { readTryThisLookState, readCardStudioSlides, getSignedUrl, isPublicBellaPost } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * BILDER-POOL für den Gratis-Chat (Owner 28.07.2026).
 *
 * „Ich habe gerade keine Gratis-Videos mehr, aber ich kann dir Bilder von Freundinnen
 * zeigen." — dafür braucht sie Nachschub. Der kommt aus dem, was längst da ist: die
 * Poster der öffentlichen Try-on-Videos und die Beiträge der anderen Models. Es wird
 * NICHTS neu erzeugt, also kostet der ganze Trichter nichts.
 *
 * NUR BILDER (keine Videos): im Gratis-Chat zeigen wir ab sofort Standbilder — Videos
 * sind das, was er kaufen soll.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const exclude = url.searchParams.get("exclude")?.trim() || "";     // die Frau, mit der er schreibt
  const n = Math.min(24, Math.max(4, Number(url.searchParams.get("n") ?? 12)));
  const seed = Number(url.searchParams.get("page") ?? 0);            // 2. Runde = andere Bilder

  try {
    const state = await readTryThisLookState();

    // 1) Poster öffentlicher Try-ons (quer über alle Models)
    const out: { id: string; url: string; who: string }[] = [];
    const seen = new Set<string>();
    for (const g of state.generations ?? []) {
      const gg = g as { id: string; public?: boolean; hidden?: boolean; curatorId?: string; videoPosterPath?: string; imagePath?: string };
      if (gg.public !== true || gg.hidden) continue;
      if (exclude && gg.curatorId === exclude) continue;             // ihre eigenen zeigt sie schon
      const path = gg.videoPosterPath || gg.imagePath || "";
      if (!path || seen.has(path)) continue;
      seen.add(path);
      out.push({ id: gg.id, url: path, who: String(gg.curatorId ?? "") });
    }

    // 2) Beiträge anderer Models (Card Studio) — die schönsten Bilder, die wir haben
    const others = (state.curators ?? [])
      .filter(c => c.id !== exclude && (c.status === undefined || c.status === "active"))
      .slice(0, 12);
    for (const c of others) {
      try {
        const slides = (await readCardStudioSlides(c.id)).filter(isPublicBellaPost);
        for (const s of slides.slice(0, 4)) {
          const path = s.kind === "video" ? (s.posterPath || "") : s.path;
          if (!path || seen.has(path)) continue;
          seen.add(path);
          out.push({ id: `${c.id}:${s.id}`, url: path, who: c.id });
        }
      } catch { /* ein Model ohne Beiträge ist kein Fehler */ }
    }

    // Durchmischen, aber stabil je „page" — die zweite Runde zeigt andere Bilder.
    out.sort((a, b) => ((a.id.charCodeAt(0) + seed * 7) % 97) - ((b.id.charCodeAt(0) + seed * 7) % 97));
    const slice = out.slice(seed * n, seed * n + n);

    const images = (await Promise.all(slice.map(async x => ({
      id: x.id,
      url: await getSignedUrl(x.url, 60 * 60 * 6).catch(() => ""),
    })))).filter(x => x.url);

    return NextResponse.json({ images, total: out.length }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ images: [], total: 0 });
  }
}
