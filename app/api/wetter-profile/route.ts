import { NextResponse } from "next/server";
import { readWetterSubscribers, writeWetterSubscribers } from "@/lib/try-this-look-store";
import { dialInfo } from "@/lib/dial-code";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Der Abonnent pflegt SEINE eigenen Daten — ohne Admin, ohne Login.
 *
 * Legitimation ist die Abo-ID aus seinem persönlichen Link (`?s=…`): die kennt nur er (und
 * wir). Damit kann er zwei Dinge:
 *  1) Stadt + Telefon nachtragen — sonst können wir ihm kein Wetter „bei dir" schicken.
 *     Aus der Vorwahl leiten wir Land und Sprache ab (lib/dial-code).
 *  2) Die Tagespost ABBESTELLEN, mit einem Tap. Wer automatisch eingetragen wurde (weil er
 *     ein anderes Thema gekauft hat), muss genauso leicht wieder rauskommen — sonst ist der
 *     Versand rechtlich angreifbar.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    sub?: string; modelId?: string; unsubscribe?: boolean;
    name?: string; birthdate?: string; gender?: string; city?: string; phone?: string; postal?: string;
  };
  const sub = String(body.sub ?? "").trim();
  if (!sub) return NextResponse.json({ error: "Missing subscription id." }, { status: 400 });
  const modelId = String(body.modelId ?? "").trim() || undefined;

  const list = await readWetterSubscribers(modelId);
  const entry = list.find(s => s.id === sub);
  // Absichtlich dieselbe Antwort wie bei Erfolg: sonst verrät die API, welche IDs existieren.
  if (!entry) return NextResponse.json({ ok: true });

  if (body.unsubscribe) {
    entry.unsubscribed = true;
    entry.unsubscribedAt = new Date().toISOString();
  } else {
    // Wir wollen von JEDEM Abonnenten dieselben Angaben wie beim Wetter-Formular — egal ob
    // er über eine Anzeige kam oder ein Thema gekauft hat: Name, Alter, Geschlecht, Stadt,
    // Telefon. Nur mitgeschickte Felder werden überschrieben, nichts wird geleert.
    const name = String(body.name ?? "").trim().slice(0, 120);
    const birthdate = String(body.birthdate ?? "").trim().slice(0, 10);
    const gender = String(body.gender ?? "").trim().slice(0, 1).toLowerCase();
    const postal = String(body.postal ?? "").trim().slice(0, 12);
    const city = String(body.city ?? "").trim().slice(0, 120);
    const phone = String(body.phone ?? "").trim().slice(0, 40);
    if (name) entry.name = name;
    if (/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) entry.birthdate = birthdate;
    if (["m", "f", "x"].includes(gender)) entry.gender = gender;
    if (postal) entry.postal = postal;
    if (city) entry.city = city;
    if (phone) {
      entry.phone = phone;
      const geo = dialInfo(phone);
      if (geo?.country && !entry.country) entry.country = geo.country;
      if (geo?.lang) entry.lang = geo.lang;   // Vorwahl schlägt das Standard-Englisch
    }
    if (!name && !birthdate && !gender && !postal && !city && !phone) {
      return NextResponse.json({ error: "Nothing to save." }, { status: 400 });
    }
  }

  try { await writeWetterSubscribers(list, modelId); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Could not save." }, { status: 502 }); }
  return NextResponse.json({ ok: true, unsubscribed: !!entry.unsubscribed, lang: entry.lang, city: entry.city ?? "" });
}
