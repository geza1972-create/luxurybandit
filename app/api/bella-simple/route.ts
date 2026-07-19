import { NextResponse } from "next/server";
import { readCardStudioSlides, writeCardStudioSlides, createSignedUploadUrl, getSignedUrl, isPublicBellaPost, sortBellaPosts, type BellaSlide } from "@/lib/try-this-look-store";
import { isAdminRequest } from "@/lib/admin-auth";
import { translatePost } from "@/lib/translate-post";

export const runtime = "nodejs";
export const maxDuration = 60;   // die Uebersetzung braucht ein paar Sekunden

const BELLA_ID = "curator-1783683672619-td4cy";

// Das EINFACHE Bella-System: Beitrag = Bild/Video + Text. Sonst nichts.
//
// Bewusst eigene Route statt der grossen Card-Studio-Route: Dort bekommt jeder neue
// oeffentliche Admin-Beitrag automatisch `pendingApproval` und waere auf der Seite
// unsichtbar (Pruef-Warteschlange aus dem Model-Self-Upload). Hier ist der Admin selbst
// der Pruefer — Beitraege gehen sofort live.

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const all = await readCardStudioSlides(BELLA_ID).catch(() => [] as BellaSlide[]);
  // Exakt dieselbe Regel und Reihenfolge wie die Seite — deshalb aus dem Store.
  const mine = all.filter(isPublicBellaPost).sort(sortBellaPosts);
  const posts = await Promise.all(mine.map(async s => ({
    id: s.id,
    kind: s.kind,
    title: s.title ?? "",
    caption: s.caption ?? "",
    // Damit das Werkzeug zeigen kann, was der Uebersetzer daraus gemacht hat.
    ro: s.i18n?.ro ?? null,
    en: s.i18n?.en ?? null,
    mediaUrl: await getSignedUrl(s.path).catch(() => ""),
  })));
  return NextResponse.json({ posts });
}

// POST { sign: true, kind, ext }              → signierte Upload-Adresse
// POST { add: { kind, path, caption } }       → neuen Beitrag anlegen (sofort live)
// POST { posts: [{ id, caption }] }           → Texte speichern
// POST { remove: "<id>" }                     → Beitrag entfernen
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as {
    sign?: boolean; kind?: string; ext?: string;
    add?: { kind?: string; path?: string; caption?: string; title?: string };
    posts?: { id?: string; caption?: string; title?: string }[];
    remove?: string;
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
      title: String(body.add.title ?? "").slice(0, 120),
      caption: String(body.add.caption ?? "").slice(0, 3000),
      private: false,
      hidden: false,
      pages: ["profile"],
      order: -Date.now(),           // Neueste zuerst
      createdAt: new Date().toISOString(),
      source: "admin",
      pendingApproval: false,
    };
    try { await writeCardStudioSlides([slide, ...all], BELLA_ID); } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Speichern fehlgeschlagen." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, id: slide.id });
  }

  if (body.remove) {
    const next = all.filter(s => s.id !== body.remove);
    try { await writeCardStudioSlides(next, BELLA_ID); } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Loeschen fehlgeschlagen." }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  }

  if (Array.isArray(body.posts)) {
    // Nur die Texte der uebergebenen Beitraege aendern — alles andere bleibt unangetastet.
    const byId = new Map(body.posts.filter(p => p?.id).map(p => [String(p.id), {
      title: String(p.title ?? "").slice(0, 120),
      caption: String(p.caption ?? "").slice(0, 3000),
    }]));

    // Uebersetzen: Gerry schreibt Deutsch, RO + EN entstehen automatisch.
    // NUR fuer Beitraege, deren deutscher Text sich wirklich geaendert hat (oder denen
    // die Uebersetzung noch fehlt) — sonst kostet jeder Klick auf „Uebernehmen" Geld.
    const needsTranslation = all.filter(s => {
      const t = byId.get(s.id);
      if (!t) return false;
      if (!t.title && !t.caption) return false;
      const changed = t.title !== (s.title ?? "") || t.caption !== (s.caption ?? "");
      const missing = !s.i18n?.ro?.title && !s.i18n?.ro?.caption;
      return changed || missing;
    });
    const translations = new Map<string, Awaited<ReturnType<typeof translatePost>>>();
    await Promise.all(needsTranslation.map(async s => {
      const t = byId.get(s.id)!;
      translations.set(s.id, await translatePost({ title: t.title, caption: t.caption }, "de"));
    }));

    const next = all.map(s => {
      const t = byId.get(s.id);
      if (!t) return s;
      const i18n = translations.get(s.id)
        // Text geleert → alte Uebersetzungen MUESSEN weg, sonst zeigt die Seite weiter
        // den geloeschten Text in RO/EN an.
        ?? (!t.title && !t.caption ? undefined
          // Text unveraendert → alte Uebersetzung behalten, deutsche Fassung nachziehen.
          : { ...(s.i18n ?? {}), de: { title: t.title, caption: t.caption } });
      return { ...s, ...t, i18n };
    });
    try { await writeCardStudioSlides(next, BELLA_ID); } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Speichern fehlgeschlagen." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, count: byId.size });
  }

  return NextResponse.json({ error: "Nichts zu tun." }, { status: 400 });
}
