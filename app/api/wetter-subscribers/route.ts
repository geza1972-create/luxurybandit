import { NextResponse } from "next/server";
import { readWetterSubscribers, writeWetterSubscribers, readWetterClicks, readWetterBlastLog, type WetterSubscriber } from "@/lib/try-this-look-store";
import { isAdminRequest } from "@/lib/admin-auth";
import { dialInfo } from "@/lib/dial-code";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BELLA_ID = "curator-1783683672619-td4cy";
const modelOf = (request: Request) => new URL(request.url).searchParams.get("model")?.trim() || BELLA_ID;

// GET  ?model=<id>            → { subscribers: [...] }
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const modelId = modelOf(request);
  const [subscribers, clicks, blasts] = await Promise.all([
    readWetterSubscribers(modelId), readWetterClicks(modelId), readWetterBlastLog(),
  ]);
  return NextResponse.json({ subscribers, clicks, lastBlast: blasts[0] ?? null }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

// POST { add: { name, email?, phone?, city?, lang?, note? } }  → Abonnent anlegen
// POST { remove: "<id>" }                              → Abonnent löschen
// POST { addMany: [ {...}, … ] }                       → Sammel-Import (Meta-Lead-CSV)
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const modelId = modelOf(request);
  const body = (await request.json().catch(() => ({}))) as {
    add?: { name?: string; email?: string; birthdate?: string; gender?: string; phone?: string; city?: string; country?: string; postal?: string; lang?: string; note?: string };
    remove?: string;
    addMany?: { name?: string; email?: string; phone?: string; city?: string; country?: string; lang?: string; note?: string; birthdate?: string }[];
  };

  const current = await readWetterSubscribers(modelId);

  // Sammel-Import: überspringt E-Mails/Nummern, die es schon gibt (idempotent — dieselbe
  // CSV zweimal einspielen legt niemanden doppelt an). Land + Sprache kommen aus der
  // Telefon-Vorwahl, wenn sie nicht mitgeliefert wurden.
  if (Array.isArray(body.addMany)) {
    const seenMail = new Set(current.map(s => (s.email ?? "").trim().toLowerCase()).filter(Boolean));
    const seenPhone = new Set(current.map(s => (s.phone ?? "").replace(/[^\d]/g, "")).filter(Boolean));
    const fresh: WetterSubscriber[] = [];
    let skipped = 0;
    for (const raw of body.addMany.slice(0, 2000)) {
      const email = String(raw.email ?? "").trim().slice(0, 160).toLowerCase();
      const phone = String(raw.phone ?? "").trim().slice(0, 40);
      const digits = phone.replace(/[^\d]/g, "");
      const name = String(raw.name ?? "").trim().slice(0, 120);
      if (!name && !email) { skipped++; continue; }
      if ((email && seenMail.has(email)) || (digits && seenPhone.has(digits))) { skipped++; continue; }
      if (email) seenMail.add(email);
      if (digits) seenPhone.add(digits);
      const geo = dialInfo(phone);
      fresh.push({
        id: `sub-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
        name: name || email.split("@")[0],
        email, phone,
        // Meta liefert das Geburtsdatum mit, wenn das Formular danach fragt — sonst ginge es
        // beim Sammel-Import verloren und müsste je Person nachgetragen werden.
        birthdate: String(raw.birthdate ?? "").trim().slice(0, 10),
        city: String(raw.city ?? "").trim().slice(0, 120),
        country: String(raw.country ?? "").trim().slice(0, 80) || geo?.country || "",
        lang: String(raw.lang ?? "").trim().slice(0, 5) || geo?.lang || "en",
        note: String(raw.note ?? "").trim().slice(0, 300),
        createdAt: new Date().toISOString(),
      });
    }
    if (fresh.length) {
      try { await writeWetterSubscribers([...fresh, ...current], modelId); }
      catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Speichern fehlgeschlagen." }, { status: 502 }); }
    }
    return NextResponse.json({ ok: true, added: fresh.length, skipped, total: current.length + fresh.length });
  }

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
