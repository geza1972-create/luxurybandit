import { NextResponse } from "next/server";
import { readWetterSubscribers, writeWetterSubscribers, type WetterSubscriber } from "@/lib/try-this-look-store";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BELLA_ID = "curator-1783683672619-td4cy";
const modelOf = (request: Request) => new URL(request.url).searchParams.get("model")?.trim() || BELLA_ID;

// GET  ?model=<id>            → { subscribers: [...] }
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const subscribers = await readWetterSubscribers(modelOf(request));
  return NextResponse.json({ subscribers }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

// POST { add: { name, email?, phone?, city?, lang?, note? } }  → Abonnent anlegen
// POST { remove: "<id>" }                              → Abonnent löschen
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const modelId = modelOf(request);
  const body = (await request.json().catch(() => ({}))) as {
    add?: { name?: string; email?: string; birthdate?: string; gender?: string; phone?: string; city?: string; country?: string; postal?: string; lang?: string; note?: string };
    remove?: string;
  };

  const current = await readWetterSubscribers(modelId);

  if (body.add) {
    const name = String(body.add.name ?? "").trim().slice(0, 120);
    if (!name) return NextResponse.json({ error: "Name fehlt." }, { status: 400 });
    const sub: WetterSubscriber = {
      id: `sub-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      name,
      email: String(body.add.email ?? "").trim().slice(0, 160).toLowerCase(),
      birthdate: String(body.add.birthdate ?? "").trim().slice(0, 10),
      gender: String(body.add.gender ?? "").trim().slice(0, 12),
      phone: String(body.add.phone ?? "").trim().slice(0, 40),
      city: String(body.add.city ?? "").trim().slice(0, 120),
      country: String(body.add.country ?? "").trim().slice(0, 80),
      postal: String(body.add.postal ?? "").trim().slice(0, 16),
      lang: String(body.add.lang ?? "ro").trim().slice(0, 5) || "ro",
      note: String(body.add.note ?? "").trim().slice(0, 300),
      createdAt: new Date().toISOString(),
    };
    try { await writeWetterSubscribers([sub, ...current], modelId); }
    catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Speichern fehlgeschlagen." }, { status: 502 }); }
    return NextResponse.json({ ok: true, id: sub.id });
  }

  if (body.remove) {
    const next = current.filter(s => s.id !== body.remove);
    try { await writeWetterSubscribers(next, modelId); }
    catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Löschen fehlgeschlagen." }, { status: 502 }); }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Nichts zu tun." }, { status: 400 });
}
