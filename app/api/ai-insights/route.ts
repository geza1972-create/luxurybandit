import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { isAdminRequest } from "@/lib/admin-auth";
import { readTryThisLookState } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // allow the model call time

// Aggregate the funnel into counts only (no PII) so Claude can report on it.
function buildSummary(state: Awaited<ReturnType<typeof readTryThisLookState>>) {
  const events = (state.events ?? []).filter((e) => (e as any).internal !== true);
  const lookName = new Map<string, string>();
  for (const l of state.looks ?? []) lookName.set(l.id, l.name || l.id);

  const byName: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  const byCountry: Record<string, number> = {};
  const byCity: Record<string, number> = {};
  const lookEngagement: Record<string, number> = {};
  const productClicks: Record<string, { count: number; look: string }> = {};
  let first = "", last = "";

  for (const e of events) {
    const n = String(e.name || "unknown");
    byName[n] = (byName[n] ?? 0) + 1;
    if ((e as any).source) bySource[String((e as any).source)] = (bySource[String((e as any).source)] ?? 0) + 1;
    if ((e as any).country) byCountry[String((e as any).country)] = (byCountry[String((e as any).country)] ?? 0) + 1;
    if ((e as any).city) byCity[String((e as any).city)] = (byCity[String((e as any).city)] ?? 0) + 1;
    if (e.lookId) lookEngagement[e.lookId] = (lookEngagement[e.lookId] ?? 0) + 1;
    const pl = (e as any).productLink;
    if (pl) { const host = (() => { try { return new URL(pl).host.replace(/^www\./, ""); } catch { return String(pl).slice(0, 40); } })(); const key = host; productClicks[key] = { count: (productClicks[key]?.count ?? 0) + 1, look: lookName.get(e.lookId) ?? "" }; }
    const t = String((e as any).createdAt ?? "");
    if (t) { if (!first || t < first) first = t; if (!last || t > last) last = t; }
  }

  const topN = (obj: Record<string, number>, n: number) =>
    Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);

  const leads = state.leads ?? [];
  const registrations = leads.length;
  const namedLeads = leads.filter((l) => (l.name ?? "").trim()).length;
  const generations = (state.generations ?? []).length;

  return {
    period: { first, last },
    totalEvents: events.length,
    eventCounts: byName,
    registrations,
    namedRegistrations: namedLeads,
    generationsSaved: generations,
    topLooks: topN(lookEngagement, 10).map(([id, c]) => ({ look: lookName.get(id) ?? id, events: c })),
    topProductDomains: Object.entries(productClicks).sort((a, b) => b[1].count - a[1].count).slice(0, 10).map(([host, v]) => ({ host, clicks: v.count, look: v.look })),
    trafficSources: topN(bySource, 10).map(([s, c]) => ({ source: s, count: c })),
    topCountries: topN(byCountry, 10).map(([s, c]) => ({ country: s, count: c })),
    topCities: topN(byCity, 10).map(([s, c]) => ({ city: s, count: c })),
    publishedLooks: (state.looks ?? []).filter((l) => l.published !== false).length,
  };
}

const SYSTEM = `Du bist Growth-Analyst für "LuxuryBandit", eine mobile Virtual-Try-On-App für Luxus-Mode (Nutzer laden ein Foto hoch, die KI zieht ihnen einen Look an; danach können sie "dupes" shoppen). Der Inhaber schaltet Facebook/Instagram-Anzeigen, die viele Seitenaufrufe bringen — aber das Kernproblem ist: viele schauen, wenige REGISTRIEREN sich (Try-on gibt es nur nach Registrierung). Jede Anzeige kostet Geld; ohne Registrierung bringt der Traffic nichts.

Du bekommst eine anonyme Funnel-Zusammenfassung (nur Zahlen). Antworte auf DEUTSCH, in klarer, knapper Sprache für einen Nicht-Techniker. Struktur:
1. **Kurzfazit** (2-3 Sätze: wie läuft's, wo klemmt's).
2. **Was die Leute machen / suchen** (aus Top-Looks, Produkt-Klicks, Quellen, Ländern — was interessiert sie?).
3. **Wo sie abspringen** (Trichter: Aufrufe → Try-on-Klicks → Registrierungen; nenne grobe Conversion, wenn ableitbar).
4. **3-5 konkrete, priorisierte Optimierungen** — machbar, spezifisch für DIESE App (z. B. Anzeigen-Targeting, Registrierungs-Hürde senken, welche Looks pushen, welche Länder). Kein Blabla, jede Maßnahme mit erwartetem Effekt.
Wenn die Datenlage dünn ist, sag das ehrlich und nenne, welche Events/Zahlen fehlen. Nutze Markdown (Überschriften, Bullets, **fett**). Keine erfundenen Zahlen — nur aus den Daten.`;

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not set." }, { status: 503 });
  }

  const state = await readTryThisLookState();
  const summary = buildSummary(state);

  try {
    const client = new Anthropic();
    const msg = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 5000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Hier die Funnel-Zusammenfassung der letzten Zeit (anonym, nur Zahlen). Analysiere sie wie oben beschrieben.\n\n\`\`\`json\n${JSON.stringify(summary, null, 2)}\n\`\`\``,
        },
      ],
    } as any);

    const report = (msg.content ?? [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n")
      .trim();

    return NextResponse.json({ report, summary, generatedAt: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI analysis failed." }, { status: 502 });
  }
}
