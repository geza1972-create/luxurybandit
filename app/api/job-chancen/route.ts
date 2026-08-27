import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { isAdminRequest } from "@/lib/admin-auth";
import { anzeigenTextBeschaffen } from "@/lib/lebenslauf-anzeige";
import {
  leseChancenPool, schreibeChancenPool, CHANCEN_DECKEL,
  type JobChance, type Remote, type QuellenStatus,
} from "@/lib/job-chancen";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * DIE ADMIN-VERWALTUNG DES JOBCHANCEN-POOLS (Owner-Auftrag 26.08.2026,
 * KONZEPT-JOB-MATCH-TRICHTER.md Baustelle D) — NUR für `/admin/chancen`, admin-only in
 * jeder Methode. Kein Kandidat ruft diese Route je auf (die Vorschläge im Funnel kommen
 * aus einer eigenen, später gebauten Route, die `veroeffentlichbareChancen()` +
 * `chanceFuerKandidat()` benutzt).
 *
 * GET                                    → volle Liste (MIT intern), neueste zuerst
 * POST { aktion:"quelle", eingabe }      → Link/Text abrufen + EIN KI-Aufruf: neutraler
 *                                          Vorschlag. Speichert NICHTS — der Admin prüft
 *                                          erst.
 * POST { aktion:"suchen", suchbegriff,   → Google-Jobs-Treffer über SerpApi (Owner
 *        ort? }                            26.08.2026: „ich muss hierfür irgendwie
 *                                          scrapen und mehrere hinzufügen … Ich habe
 *                                          doch eine API dazu"). Speichert NICHTS,
 *                                          kostet 1 SerpApi-Credit je Suche — deshalb
 *                                          nur auf Knopfdruck, nie automatisch
 *                                          (Hausregel cost-frugal).
 * POST { aktion:"importieren", treffer } → EIN Treffer aus der Suche → dieselbe
 *                                          KI-Neutralisierung wie „quelle" → landet
 *                                          direkt als Chance im Pool, ZWANGSWEISE
 *                                          aktiv:false + quellenStatus:"unklar". Der
 *                                          Import füllt nur den Schreibtisch; prüfen
 *                                          und aktivieren bleibt Handarbeit im Editor.
 * POST { aktion:"speichern", chance,     → legt an/ändert. `aktiv` kann der Server NUR
 *        bestaetigt? }                     setzen, wenn `partnerFreigabe` ODER
 *                                          `bestaetigt` (= „Als neutrale Marktchance
 *                                          geprüft") wahr ist — sonst bleibt sie
 *                                          zwangsweise aus (`aktivGesperrt` in der
 *                                          Antwort), UNABHÄNGIG davon, was der Client
 *                                          schickt (doppelte Sicherung, siehe
 *                                          `chanceIstVeroeffentlichbar` in
 *                                          lib/job-chancen.ts).
 * DELETE { id }                          → entfernt eine Chance endgültig
 */

async function ki(prompt: string): Promise<Record<string, unknown> | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL ?? "gpt-5-mini",
      input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
    }),
  }).then(res => res.json()).catch(() => null) as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }>; error?: { message?: string } } | null;
  const text = r?.output_text ?? r?.output?.flatMap(o => o?.content ?? [])?.map(c => c?.text ?? "")?.join("") ?? "";
  if (!text) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>; } catch { return null; }
}

const s = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const liste = (v: unknown, max: number, len: number) =>
  (Array.isArray(v) ? v : []).map(x => s(x, len)).filter(Boolean).slice(0, max);
const REMOTE_WERTE: readonly Remote[] = ["remote", "hybrid", "vorOrt"];

/* EIN Prompt für beide Wege (Hand-Eingabe „quelle" UND SerpApi-Import) — nie dieselben
   Neutralisierungs-Regeln an zwei Orten tippen, sonst driften sie auseinander. */
const neutralisierungsPrompt = (anzeigenText: string) => [
  "Du bereitest eine öffentliche Stellenanzeige für ein internes Jobportal auf. Aus dem folgenden Anzeigentext erstellst du ZWEI getrennte Ausgaben: interne Fakten (nur für uns) und eine öffentliche, NEUTRALE Zusammenfassung für Kandidaten.",
  `Anzeigentext:\n${anzeigenText}`,
  // DIE SECHS NEUTRALISIERUNGS-REGELN (Zusatzänderung, wörtlich):
  "Für die öffentliche Zusammenfassung ('vorschlag') gilt zwingend: Schreibe eine neue, neutrale Beschreibung der Jobchance. Übernimm keine längeren Formulierungen aus der Originalanzeige. Entferne Arbeitgebername, Markenbezeichnungen und Unternehmensmarketing. Extrahiere nur die für Kandidaten relevanten Fakten und Anforderungen. Formuliere alles eigenständig neu. Erfinde keine Informationen, die nicht aus der Quelle hervorgehen.",
  "'intern' — {\"firma\": Firmenname falls erkennbar sonst leer, \"originalTitel\": der Stellentitel wörtlich aus der Anzeige}.",
  "'vorschlag' — {\"rolle\": kurze neutrale Rollenbezeichnung (z. B. \"German Customer Service\"), \"land\": Land der Stelle, \"stadt\": Stadt falls genannt sonst leer, \"remote\": \"remote\"|\"hybrid\"|\"vorOrt\", \"sprachen\": [\"Deutsch C1\", ...], \"gehalt\": NUR wenn im Text explizit genannt sonst leer, \"umzugNoetig\": true/false, \"anforderungen\": [3–6 kurze, EIGENSTÄNDIG formulierte Zeilen], \"quereinstiegGeeignet\": true/false — ehrlich einschätzen, ob auch ein Quereinsteiger mit übertragbaren Fähigkeiten realistisch infrage kommt oder ob die Stelle zwingend Branchenerfahrung verlangt, \"kurzbeschreibung\": 2–3 neutrale Sätze ohne Firmenbezug, \"kategorie\": ein kurzes Kategorie-Schlagwort (z. B. \"customer-support\", \"backoffice\", \"sales-support\")}.",
  "Antworte NUR als JSON: {\"intern\":{\"firma\":\"...\",\"originalTitel\":\"...\"},\"vorschlag\":{\"rolle\":\"...\",\"land\":\"...\",\"stadt\":\"...\",\"remote\":\"...\",\"sprachen\":[],\"gehalt\":\"...\",\"umzugNoetig\":false,\"anforderungen\":[],\"quereinstiegGeeignet\":false,\"kurzbeschreibung\":\"...\",\"kategorie\":\"...\"}}",
].join("\n\n");

/** Der geprüfte Vorschlags-Teil einer KI-Antwort — von „quelle" und „importieren" geteilt. */
const vorschlagAusKi = (vorschlagRoh: Record<string, unknown>) => ({
  rolle: s(vorschlagRoh.rolle, 120),
  land: s(vorschlagRoh.land, 80),
  stadt: s(vorschlagRoh.stadt, 80) || undefined,
  remote: (REMOTE_WERTE.includes(vorschlagRoh.remote as Remote) ? vorschlagRoh.remote : "vorOrt") as Remote,
  sprachen: liste(vorschlagRoh.sprachen, 6, 40),
  gehalt: s(vorschlagRoh.gehalt, 80) || undefined,
  umzugNoetig: vorschlagRoh.umzugNoetig === true,
  anforderungen: liste(vorschlagRoh.anforderungen, 6, 160),
  quereinstiegGeeignet: vorschlagRoh.quereinstiegGeeignet === true,
  kurzbeschreibung: s(vorschlagRoh.kurzbeschreibung, 400),
  kategorie: s(vorschlagRoh.kategorie, 40),
});

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const alle = await leseChancenPool();
  alle.sort((a, b) => (b.hinzugefuegtAm ?? "").localeCompare(a.hinzugefuegtAm ?? ""));
  return NextResponse.json({ chancen: alle }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const aktion = s(body.aktion, 20);

  /* ── QUELLE ABRUFEN + NEUTRALISIEREN — speichert nichts, nur ein Vorschlag ── */
  if (aktion === "quelle") {
    const eingabe = s(body.eingabe, 4000);
    if (!eingabe) return NextResponse.json({ error: "Link oder Text fehlt." }, { status: 400 });
    const key = process.env.OPENAI_API_KEY?.trim();
    if (!key) return NextResponse.json({ error: "OPENAI_API_KEY fehlt." }, { status: 500 });

    const anzeige = await anzeigenTextBeschaffen(eingabe);
    if (!anzeige.text) return NextResponse.json({ error: anzeige.fehler ?? "Keine Anzeige erkannt." }, { status: 422 });

    const parsed = await ki(neutralisierungsPrompt(anzeige.text));
    if (!parsed) return NextResponse.json({ error: "Neutralisierung fehlgeschlagen — bitte noch einmal." }, { status: 502 });

    const internRoh = (parsed.intern ?? {}) as Record<string, unknown>;
    const vorschlagRoh = (parsed.vorschlag ?? {}) as Record<string, unknown>;
    let quellePlattform = "";
    if (anzeige.quelle === "link") { try { quellePlattform = new URL(eingabe.trim()).hostname.replace(/^www\./, ""); } catch { /**/ } }

    return NextResponse.json({
      intern: {
        firma: s(internRoh.firma, 120) || undefined,
        originalTitel: s(internRoh.originalTitel, 160) || undefined,
        originalText: anzeige.text.slice(0, 6000),
        quelleUrl: anzeige.quelle === "link" ? eingabe.trim().slice(0, 500) : undefined,
        quellePlattform: quellePlattform || undefined,
        quelleDatum: new Date().toISOString(),
      },
      vorschlag: vorschlagAusKi(vorschlagRoh),
    });
  }

  /* ── GOOGLE-JOBS-SUCHE ÜBER SERPAPI — nichts wird gespeichert, 1 Credit je Klick ── */
  if (aktion === "suchen") {
    const suchbegriff = s(body.suchbegriff, 160);
    if (!suchbegriff) return NextResponse.json({ error: "Suchbegriff fehlt." }, { status: 400 });
    const serpKey = process.env.SERPAPI_KEY?.trim();
    if (!serpKey) return NextResponse.json({ error: "SERPAPI_KEY fehlt." }, { status: 500 });

    const u = new URL("https://serpapi.com/search.json");
    u.searchParams.set("engine", "google_jobs");
    u.searchParams.set("q", suchbegriff);
    const ort = s(body.ort, 80);
    if (ort) u.searchParams.set("location", ort);
    u.searchParams.set("hl", "de");
    u.searchParams.set("api_key", serpKey);

    const r = await fetch(u.toString()).then(res => res.json()).catch(() => null) as {
      jobs_results?: Array<{
        title?: string; company_name?: string; location?: string; via?: string;
        description?: string; share_link?: string;
        apply_options?: Array<{ title?: string; link?: string }>;
      }>;
      error?: string;
    } | null;
    if (!r || r.error) return NextResponse.json({ error: r?.error ?? "Suche fehlgeschlagen." }, { status: 502 });

    const treffer = (r.jobs_results ?? []).slice(0, 10).map(j => ({
      titel: s(j.title, 160),
      firma: s(j.company_name, 120),
      ort: s(j.location, 120),
      plattform: s(j.via, 80).replace(/^über\s+|^via\s+/i, ""),
      link: s(j.apply_options?.[0]?.link ?? j.share_link, 500),
      beschreibung: s(j.description, 6000),
    })).filter(t => t.titel && t.beschreibung);
    return NextResponse.json({ treffer });
  }

  /* ── EIN SUCH-TREFFER → NEUTRALISIEREN → DIREKT IN DEN POOL (inaktiv, ungeprüft) ── */
  if (aktion === "importieren") {
    const t = (body.treffer ?? {}) as Record<string, unknown>;
    const beschreibung = s(t.beschreibung, 6000);
    const titel = s(t.titel, 160);
    if (!beschreibung || !titel) return NextResponse.json({ error: "Treffer unvollständig." }, { status: 400 });

    const alle = await leseChancenPool();
    if (alle.length >= CHANCEN_DECKEL) {
      return NextResponse.json({ error: `Deckel erreicht (${CHANCEN_DECKEL} Chancen) — erst eine alte deaktivieren oder löschen.` }, { status: 422 });
    }

    const anzeigenText = [titel, s(t.firma, 120), s(t.ort, 120), "", beschreibung].filter(Boolean).join("\n");
    const parsed = await ki(neutralisierungsPrompt(anzeigenText));
    if (!parsed) return NextResponse.json({ error: "Neutralisierung fehlgeschlagen — bitte noch einmal." }, { status: 502 });
    const internRoh = (parsed.intern ?? {}) as Record<string, unknown>;
    const vorschlag = vorschlagAusKi((parsed.vorschlag ?? {}) as Record<string, unknown>);
    if (!vorschlag.rolle || !vorschlag.land) return NextResponse.json({ error: "KI-Vorschlag unvollständig (Rolle/Land) — bitte von Hand über „Quelle“ anlegen." }, { status: 422 });

    const neu: JobChance = {
      id: randomUUID(),
      /* ZWANGSWEISE unveröffentlicht — der Import füllt den Schreibtisch, nie den Funnel. */
      aktiv: false,
      partnerFreigabe: false,
      ...vorschlag,
      hinzugefuegtAm: new Date().toISOString(),
      intern: {
        firma: s(internRoh.firma, 120) || s(t.firma, 120) || undefined,
        originalTitel: s(internRoh.originalTitel, 160) || titel,
        originalText: anzeigenText.slice(0, 6000),
        quelleUrl: s(t.link, 500) || undefined,
        quellePlattform: s(t.plattform, 80) || "Google Jobs",
        quelleDatum: new Date().toISOString(),
        quellenStatus: "unklar",
      },
    };
    const naechste = [...alle, neu];
    if (!(await schreibeChancenPool(naechste))) {
      return NextResponse.json({ error: "Konnte nicht gespeichert werden." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, chance: neu });
  }

  /* ── SPEICHERN (anlegen oder ändern) ── */
  if (aktion === "speichern") {
    const c = (body.chance ?? {}) as Record<string, unknown>;
    const alle = await leseChancenPool();
    const id = s(c.id, 60);
    const bestand = id ? alle.find(x => x.id === id) : undefined;

    if (!bestand && alle.length >= CHANCEN_DECKEL) {
      return NextResponse.json({ error: `Deckel erreicht (${CHANCEN_DECKEL} Chancen) — erst eine alte deaktivieren oder löschen.` }, { status: 422 });
    }

    const internRoh = (c.intern ?? {}) as Record<string, unknown>;
    const partnerFreigabe = c.partnerFreigabe === true;
    const bestaetigt = body.bestaetigt === true;
    /* DIE DOPPELTE SICHERUNG (Zusatzänderung): quellenStatus leitet der SERVER ab, nie
       der Client — und `aktiv` darf nur wahr werden, wenn diese Bedingung erfüllt ist. */
    const quellenStatus: QuellenStatus = partnerFreigabe ? "partner" : bestaetigt ? "manuell_geprueft" : "unklar";
    const darfAktiv = partnerFreigabe || quellenStatus === "manuell_geprueft";
    const aktivGewuenscht = c.aktiv === true;
    const aktiv = aktivGewuenscht && darfAktiv;

    const neu: JobChance = {
      id: id || randomUUID(),
      aktiv,
      partnerFreigabe,
      rolle: s(c.rolle, 120),
      land: s(c.land, 80),
      stadt: s(c.stadt, 80) || undefined,
      remote: REMOTE_WERTE.includes(c.remote as Remote) ? (c.remote as Remote) : "vorOrt",
      sprachen: liste(c.sprachen, 6, 40),
      gehalt: s(c.gehalt, 80) || undefined,
      umzugNoetig: c.umzugNoetig === true,
      anforderungen: liste(c.anforderungen, 6, 160),
      quereinstiegGeeignet: c.quereinstiegGeeignet === true,
      kurzbeschreibung: s(c.kurzbeschreibung, 400),
      kategorie: s(c.kategorie, 40),
      hinzugefuegtAm: bestand?.hinzugefuegtAm ?? new Date().toISOString(),
      intern: {
        firma: s(internRoh.firma, 120) || undefined,
        originalTitel: s(internRoh.originalTitel, 160) || undefined,
        originalText: s(internRoh.originalText, 6000) || undefined,
        quelleUrl: s(internRoh.quelleUrl, 500) || undefined,
        quellePlattform: s(internRoh.quellePlattform, 80) || undefined,
        quelleDatum: s(internRoh.quelleDatum, 40) || undefined,
        notizen: s(internRoh.notizen, 500) || undefined,
        quellenStatus,
      },
    };
    if (!neu.rolle || !neu.land) return NextResponse.json({ error: "Rolle und Land sind Pflicht." }, { status: 400 });

    const naechste = bestand ? alle.map(x => (x.id === neu.id ? neu : x)) : [...alle, neu];
    if (!(await schreibeChancenPool(naechste))) {
      return NextResponse.json({ error: "Konnte nicht gespeichert werden." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, chance: neu, aktivGesperrt: aktivGewuenscht && !darfAktiv });
  }

  return NextResponse.json({ error: "Unbekannte Aktion." }, { status: 400 });
}

export async function DELETE(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const id = s(body.id, 60);
  if (!id) return NextResponse.json({ error: "Kennung fehlt." }, { status: 400 });
  const alle = await leseChancenPool();
  const naechste = alle.filter(x => x.id !== id);
  if (naechste.length === alle.length) return NextResponse.json({ ok: true }); // schon weg
  if (!(await schreibeChancenPool(naechste))) {
    return NextResponse.json({ error: "Löschen hat nicht geklappt." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
