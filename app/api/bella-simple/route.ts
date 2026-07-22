import { NextResponse } from "next/server";
import { readCardStudioSlides, writeCardStudioSlides, createSignedUploadUrl, getSignedUrl, isPublicBellaPost, sortBellaPosts, type BellaSlide } from "@/lib/try-this-look-store";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
// NIE cachen: sonst liest das Werkzeug nach dem Speichern eine alte, gecachte Liste
// zurück und es sieht aus, als hätte „Übernehmen" nicht funktioniert.
export const dynamic = "force-dynamic";

const BELLA_ID = "curator-1783683672619-td4cy";

// Das EINFACHE Bella-System: Beitrag = Bild/Video + Text. Sonst nichts.
//
// Bewusst eigene Route statt der grossen Card-Studio-Route: Dort bekommt jeder neue
// oeffentliche Admin-Beitrag automatisch `pendingApproval` und waere auf der Seite
// unsichtbar (Pruef-Warteschlange aus dem Model-Self-Upload). Hier ist der Admin selbst
// der Pruefer — Beitraege gehen sofort live.

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const modelId = new URL(request.url).searchParams.get("model")?.trim() || BELLA_ID;   // pro Model gescoped
  const all = await readCardStudioSlides(modelId).catch(() => [] as BellaSlide[]);
  // Exakt dieselbe Regel und Reihenfolge wie die Seite — deshalb aus dem Store.
  const mine = all.filter(isPublicBellaPost).sort(sortBellaPosts);
  const posts = await Promise.all(mine.map(async s => ({
    id: s.id,
    kind: s.kind,
    title: s.title ?? "",
    caption: s.caption ?? "",
    day: s.day ?? "",
    time: s.time ?? "",
    ad: s.ad === true,
    context: s.context ?? "",
    firstMessage: s.firstMessage ?? "",
    mediaUrl: await getSignedUrl(s.path).catch(() => ""),
    posterUrl: s.posterPath ? await getSignedUrl(s.posterPath).catch(() => "") : "",
  })));
  return NextResponse.json({ posts }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

// POST { sign: true, kind, ext }              → signierte Upload-Adresse
// POST { add: { kind, path, caption } }       → neuen Beitrag anlegen (sofort live)
// POST { posts: [{ id, title, caption, kind?, path? }] }
//        → Texte speichern; mit kind+path zusätzlich das Bild/Video tauschen
// POST { remove: "<id>" }                     → ganzen Beitrag entfernen
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const modelId = new URL(request.url).searchParams.get("model")?.trim() || BELLA_ID;   // pro Model gescoped
  const body = (await request.json().catch(() => ({}))) as {
    sign?: boolean; kind?: string; ext?: string;
    add?: { kind?: string; path?: string; posterPath?: string; caption?: string; title?: string; day?: string; time?: string; ad?: boolean; context?: string; firstMessage?: string };
    posts?: { id?: string; caption?: string; title?: string; kind?: string; path?: string; posterPath?: string; day?: string; time?: string; ad?: boolean; context?: string; firstMessage?: string }[];
    remove?: string;
    reorder?: string[];
  };

  if (body.sign) {
    const kind = body.kind === "video" ? "video" : "image";
    const ext = String(body.ext || (kind === "video" ? "mp4" : "jpg")).replace(/[^a-z0-9]/gi, "").slice(0, 5) || "jpg";
    try {
      const { path, uploadUrl } = await createSignedUploadUrl(kind === "video" ? "videos" : "uploads", ext);
      return NextResponse.json({ path, uploadUrl });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Upload-Adresse fehlgeschlagen." }, { status: 502 });
    }
  }

  const all = await readCardStudioSlides(BELLA_ID).catch(() => [] as BellaSlide[]);

  if (body.add?.path) {
    const kind = body.add.kind === "video" ? "video" : "image";
    // Explizit oeffentlich, auf der Profilflaeche, ohne Pruef-Warteschlange.
    const slide: BellaSlide = {
      id: `post-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      kind,
      path: String(body.add.path),
      posterPath: String(body.add.posterPath ?? ""),
      title: String(body.add.title ?? "").slice(0, 120),
      caption: String(body.add.caption ?? "").slice(0, 3000),
      day: String(body.add.day ?? "").slice(0, 10),
      time: String(body.add.time ?? "").slice(0, 5),
      ad: body.add.ad === true,
      topic: "wetter",   // Abo-only → nie im öffentlichen Feed/Reel

      context: String(body.add.context ?? "").slice(0, 2000),
      firstMessage: String(body.add.firstMessage ?? "").slice(0, 1000),
      private: false,
      hidden: false,
      pages: ["profile"],
      order: -Date.now(),           // Neueste zuerst
      createdAt: new Date().toISOString(),
      source: "admin",
      pendingApproval: false,
    };
    try { await writeCardStudioSlides([slide, ...all], modelId); } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Speichern fehlgeschlagen." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, id: slide.id });
  }

  if (body.remove) {
    const next = all.filter(s => s.id !== body.remove);
    try { await writeCardStudioSlides(next, modelId); } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Loeschen fehlgeschlagen." }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  }

  if (Array.isArray(body.reorder)) {
    // Reihenfolge = Position im Array (aufsteigend). Nur die übergebenen Beiträge
    // bekommen eine neue `order`, alles andere bleibt unangetastet → clobber-fest.
    const pos = new Map(body.reorder.map((id, i) => [String(id), i]));
    const next = all.map(s => pos.has(s.id) ? { ...s, order: pos.get(s.id)! } : s);
    try { await writeCardStudioSlides(next, modelId); } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Reihenfolge speichern fehlgeschlagen." }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  }

  if (Array.isArray(body.posts)) {
    // Nur die Texte der uebergebenen Beitraege aendern — alles andere bleibt unangetastet.
    // Text — und optional ein getauschtes Bild/Video, das der Admin mit demselben
    // Klick auf „Übernehmen" live schaltet.
    const byId = new Map(body.posts.filter(p => p?.id).map(p => [String(p.id), {
      title: String(p.title ?? "").slice(0, 120),
      caption: String(p.caption ?? "").slice(0, 3000),
      ...(p.day !== undefined ? { day: String(p.day).slice(0, 10) } : {}),
      ...(p.time !== undefined ? { time: String(p.time).slice(0, 5) } : {}),
      ...(p.ad !== undefined ? { ad: p.ad === true } : {}),
      ...(p.context !== undefined ? { context: String(p.context).slice(0, 2000) } : {}),
      ...(p.firstMessage !== undefined ? { firstMessage: String(p.firstMessage).slice(0, 1000) } : {}),
      ...(p.path ? {
        kind: (p.kind === "video" ? "video" : "image") as BellaSlide["kind"],
        path: String(p.path),
        posterPath: String(p.posterPath ?? ""),
      } : {}),
    }]));
    const next = all.map(s => byId.has(s.id) ? { ...s, ...byId.get(s.id)! } : s);
    try { await writeCardStudioSlides(next, modelId); } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Speichern fehlgeschlagen." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, count: byId.size });
  }

  return NextResponse.json({ error: "Nichts zu tun." }, { status: 400 });
}
