import { NextResponse } from "next/server";
import { readWetterSubscribers, writeWetterSubscribers, type WetterSubscriber } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BELLA_ID = "curator-1783683672619-td4cy";

// ÖFFENTLICHE Selbst-Anmeldung (kein Admin): der Abonnent macht beim ersten Öffnen
// seinen „Account". Legt einen Abonnenten-Datensatz an und gibt seine Kennung `id`
// zurück — die merkt sich das Gerät (bleibt eingeloggt) und steckt künftig im Link `?s=`.
// Bewusst schlank: nur Name Pflicht. Telefon/Stadt/Sprache optional.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    modelId?: string; name?: string; phone?: string; city?: string; lang?: string;
  };
  const modelId = String(body.modelId ?? "").trim() || BELLA_ID;
  const name = String(body.name ?? "").trim().slice(0, 120);
  if (!name) return NextResponse.json({ error: "Name fehlt." }, { status: 400 });

  const sub: WetterSubscriber = {
    id: `sub-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
    name,
    phone: String(body.phone ?? "").trim().slice(0, 40),
    city: String(body.city ?? "").trim().slice(0, 120),
    lang: String(body.lang ?? "ro").trim().slice(0, 5) || "ro",
    note: "self-signup",
    createdAt: new Date().toISOString(),
  };
  try {
    const current = await readWetterSubscribers(modelId);
    await writeWetterSubscribers([sub, ...current], modelId);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Anmeldung fehlgeschlagen." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, id: sub.id, name: sub.name, city: sub.city, lang: sub.lang });
}
