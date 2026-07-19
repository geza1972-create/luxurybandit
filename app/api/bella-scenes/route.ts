import { NextResponse } from "next/server";
import { readBellaScenes, writeBellaScenes, createSignedUploadUrl, getSignedUrl, type BellaScene } from "@/lib/try-this-look-store";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";

// Die 10 Start-Szenen. Texte sind Instagram-fertig (Englisch, passend zu den englischen
// Anzeigen) und bewusst angezogen/Lifestyle — kein Haut-Fokus.
const SEED: { title: string; caption: string }[] = [
  {
    title: "Bella weckt dich auf",
    caption: `Good morning. It's 7:04 here in Monaco and the harbour is still half asleep.\n\nI made coffee. Yours is getting cold. ☕\n\nWhat's the first thing on your list today?`,
  },
  {
    title: "Bella macht dir eine Torte",
    caption: `I baked. It took three attempts and the first one is in the bin, but nobody needs to know that. 🎂\n\nOne slice is yours. I'm not saying which one.`,
  },
  {
    title: "Bella tanzt für dich",
    caption: `Nobody around, the right song on, and suddenly the whole living room is a dancefloor.\n\nTurn it up. This one's for you. 🎶`,
  },
  {
    title: "Bella zeigt dir ihren Morgen",
    caption: `Same balcony, same coffee, completely different light every single morning.\n\nThis is the ten minutes I'd never give up. What are yours?`,
  },
  {
    title: "Bella geht für dich shoppen",
    caption: `Went out for one thing. Came back with four.\n\nBut look at this one — I saw it and immediately thought of you. Yes or no? 👇`,
  },
  {
    title: "Bella liest dir das Wetter",
    caption: `Weather report from your personal correspondent: 24°C here, not a cloud in sight, sea like glass.\n\nAnd where you are? Tell me and I'll tell you what to wear. ☀️`,
  },
  {
    title: "Bella macht sich fertig",
    caption: `Forty minutes to go and I've changed three times.\n\nThis one stays. Probably. Talk me out of it. 💄`,
  },
  {
    title: "Bella am Strand",
    caption: `Walked down at exactly the right moment. Ten minutes later the whole bay went gold.\n\nSome evenings you just get lucky. 🌅`,
  },
  {
    title: "Bella zeigt dir ihren neuen Look",
    caption: `New one. Took me a while to be brave enough for this colour.\n\nHonestly — does it work? I trust you more than the mirror. 👀`,
  },
  {
    title: "Bella sagt gute Nacht",
    caption: `Lights out here. The city keeps going, I don't.\n\nSleep well — I'll wake you in the morning. 🌙`,
  },
];

function seed(): BellaScene[] {
  const now = new Date().toISOString();
  return SEED.map((s, i) => ({
    id: `scene-${i + 1}-${crypto.randomUUID().slice(0, 8)}`,
    order: i,
    title: s.title,
    caption: s.caption,
    kind: "image" as const,
    path: "",
    createdAt: now,
  }));
}

// GET → alle Szenen, Medien signiert (mediaUrl). Legt beim ersten Aufruf die 10 Vorlagen an.
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  let scenes = await readBellaScenes();
  if (!scenes) {
    scenes = seed();
    try { await writeBellaScenes(scenes); } catch { /* beim naechsten Mal erneut */ }
  }
  const withUrls = await Promise.all(
    [...scenes].sort((a, b) => a.order - b.order).map(async s => ({
      ...s,
      mediaUrl: s.path ? await getSignedUrl(s.path).catch(() => "") : "",
    })),
  );
  return NextResponse.json({ scenes: withUrls });
}

// POST { sign: true, kind, ext }  → signierte Upload-Adresse (Datei geht direkt zu Supabase)
// POST { scenes: [...] }          → speichert die ganze Liste
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as {
    sign?: boolean; kind?: string; ext?: string; scenes?: unknown;
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

  if (Array.isArray(body.scenes)) {
    const clean: BellaScene[] = (body.scenes as BellaScene[]).map((s, i) => ({
      id: String(s.id || crypto.randomUUID()),
      order: Number.isFinite(s.order) ? Number(s.order) : i,
      title: String(s.title ?? "").slice(0, 120),
      caption: String(s.caption ?? "").slice(0, 3000),
      kind: s.kind === "video" ? "video" : "image",
      path: String(s.path ?? ""),
      createdAt: String(s.createdAt || new Date().toISOString()),
    }));
    try { await writeBellaScenes(clean); } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Speichern fehlgeschlagen." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, count: clean.length });
  }

  return NextResponse.json({ error: "Nichts zu tun." }, { status: 400 });
}
