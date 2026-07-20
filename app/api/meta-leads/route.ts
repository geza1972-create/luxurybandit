import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { addDailySignup } from "@/lib/try-this-look-store";
import { notifyAdminWhatsApp } from "@/lib/notify-admin";

export const runtime = "nodejs";

// ── Meta Lead Ads Webhook ────────────────────────────────────────────────────
// Wenn jemand ein Instant-Formular in Instagram/Facebook absendet, ruft Meta diese
// URL auf. Die Nachricht enthält NUR eine `leadgen_id` — die eigentlichen Antworten
// (Name, E-Mail, Telefon, Stadt) holen wir dann per Graph API dazu und legen sie in
// dieselbe Liste wie die /bella-Anmeldung. So landet jeder Ad-Lead automatisch bei dir.
//
// Env (in Vercel setzen):
//   META_LEADS_VERIFY_TOKEN  — frei wählbar; identisch bei Meta im Webhook eintragen
//   META_PAGE_ACCESS_TOKEN   — Page-Token mit „leads_retrieval" (holt die Lead-Daten)
//   META_APP_SECRET          — optional; prüft die Signatur der Meta-Anfrage
//   META_GRAPH_VERSION       — optional, Standard v21.0

const GRAPH = `https://graph.facebook.com/${process.env.META_GRAPH_VERSION?.trim() || "v21.0"}`;

// 1) Verifizierung: Meta schickt beim Einrichten ein GET mit hub.challenge, das wir
//    zurückgeben müssen — aber nur, wenn der verify_token stimmt.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge") ?? "";
  const expected = process.env.META_LEADS_VERIFY_TOKEN?.trim();
  if (mode === "subscribe" && expected && token === expected) {
    return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ error: "Verification failed." }, { status: 403 });
}

// Meta-Feldnamen → unsere Felder. Standardfelder heißen z. B. "email", "full_name",
// "phone_number", "city", "country"; eigene Fragen tragen den von dir gewählten Namen.
function mapFields(fieldData: { name?: string; values?: string[] }[]) {
  const get = (...keys: string[]) => {
    for (const f of fieldData) {
      const n = (f.name || "").toLowerCase();
      if (keys.includes(n)) return (f.values?.[0] || "").trim();
    }
    return "";
  };
  const fullName = get("full_name", "name");
  const firstName = get("first_name") || fullName.split(/\s+/)[0] || "";
  return {
    email: get("email").toLowerCase(),
    firstName,
    whatsapp: get("phone_number", "phone", "whatsapp"),
    city: get("city", "town"),
    country: get("country").toUpperCase().slice(0, 2),
  };
}

// Prüft die Meta-Signatur (X-Hub-Signature-256), wenn ein App-Secret gesetzt ist.
function signatureOk(raw: string, header: string | null): boolean {
  const secret = process.env.META_APP_SECRET?.trim();
  if (!secret) return true; // ohne Secret: nicht erzwingen (Best effort)
  if (!header?.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const got = header.slice("sha256=".length);
  try { return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(got)); } catch { return false; }
}

// 2) Lead-Eingang: Meta POSTet die leadgen_id → wir holen die Antworten und speichern.
export async function POST(request: Request) {
  const raw = await request.text();
  if (!signatureOk(raw, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Bad signature." }, { status: 403 });
  }

  let body: { object?: string; entry?: { changes?: { field?: string; value?: { leadgen_id?: string; ad_id?: string } }[] }[] };
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ ok: true }); }

  const token = process.env.META_PAGE_ACCESS_TOKEN?.trim() || process.env.IG_ACCESS_TOKEN?.trim();

  // Alle Leads aus der Nachricht einsammeln.
  const leadIds: string[] = [];
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field === "leadgen" && change.value?.leadgen_id) leadIds.push(change.value.leadgen_id);
    }
  }

  for (const leadId of leadIds) {
    try {
      if (!token) { console.warn("[meta-leads] Kein META_PAGE_ACCESS_TOKEN — Lead", leadId, "nicht abrufbar."); continue; }
      const res = await fetch(`${GRAPH}/${leadId}?access_token=${encodeURIComponent(token)}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data?.field_data)) {
        console.warn("[meta-leads] Lead-Abruf fehlgeschlagen:", leadId, data?.error?.message || res.status);
        continue;
      }
      const f = mapFields(data.field_data);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email) && !f.whatsapp) continue; // ohne Kontakt kein Lead

      const isNew = await addDailySignup({
        email: f.email || `lead-${leadId}@meta.local`, // Platzhalter, falls nur Telefon vorliegt
        firstName: f.firstName, city: f.city, country: f.country, whatsapp: f.whatsapp,
        lang: "ro", source: "meta-lead-ad",
      });
      if (isNew) {
        const loc = [f.city, f.country].filter(Boolean).join(", ");
        try {
          notifyAdminWhatsApp(`🎯 Neuer Meta-Lead: ${f.firstName || "(ohne Namen)"}${f.whatsapp ? ` · 📱 ${f.whatsapp}` : ""}${f.email ? ` · ${f.email}` : ""}${loc ? ` · ${loc}` : ""}`);
        } catch { /* egal */ }
      }
    } catch (e) {
      console.warn("[meta-leads] Fehler bei Lead", leadId, e instanceof Error ? e.message : e);
    }
  }

  // Immer 200 an Meta — sonst wiederholt Meta die Zustellung endlos.
  return NextResponse.json({ ok: true, received: leadIds.length });
}
