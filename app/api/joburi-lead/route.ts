import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { leseLead, schreibeLead, leseAlleLeads, type JoburiLead } from "@/lib/joburi-leads";
import { leseStellen } from "@/lib/joburi-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DER LEAD DES JOBURI-TRICHTERS.
 *
 * POST { schritt: "antworten", deutsch, arbeitsform, ziel, utm, device } → legt an, gibt id
 * POST { schritt: "kontakt", id, email, vorname?, telefon?, kontaktOk }  → die Adresse
 * POST { schritt: "weitergabe", id, stelleId, ja }                       → Zustimmung je Stelle
 * GET  ?alle=1 (Admin) → alle Leads für die Auswertung
 *
 * DIE DREI ANTWORTEN WERDEN VOR DER ADRESSE GESPEICHERT. Wer danach aussteigt, ist trotzdem
 * gezählt — und nur so lässt sich sagen, ob die Anzeige die richtigen Leute bringt oder ob
 * sie an der Adresse scheitern (Owner 31.08.2026: die Kennzahl ist die ganze Kette).
 */

const s = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const MAIL_OK = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const NIVEAUS = ["A2", "B1", "B2", "C1", "C2"];
const FORMEN = ["remote", "hibrid", "birou", "egal"];
const ZIELE = ["salariu", "remote", "job-nou", "intoarcere"];

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const leads = await leseAlleLeads();
  /**
   * DIE KENNZAHL, DIE ZÄHLT (Owner 31.08.2026): „100 € Meta-Budget → 35 Leads → 18 C1/C2 →
   * 9 mit Interesse → 4 qualifizierte Kandidaten." Sie steht hier fertig gerechnet, damit
   * sie niemand von Hand aus einer Liste zusammensuchen muss.
   */
  const summe = {
    gesamt: leads.length,
    mitAdresse: leads.filter(l => !!l.email).length,
    hoch: leads.filter(l => l.deutsch === "C1" || l.deutsch === "C2").length,
    mitInteresse: leads.filter(l => (l.weitergaben ?? []).some(w => w.ja)).length,
    mitCv: leads.filter(l => !!l.cvPath).length,
  };
  return NextResponse.json({ ok: true, summe, leads });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const schritt = s(body.schritt, 20);

  /* ── 1 · Die drei Klickfragen — noch ohne jede persönliche Angabe ── */
  if (schritt === "antworten") {
    const deutsch = s(body.deutsch, 2).toUpperCase();
    const form = s(body.arbeitsform, 10).toLowerCase();
    const ziel = s(body.ziel, 20).toLowerCase();
    const id = s(body.id, 60) || crypto.randomUUID();
    const alt = await leseLead(id);

    const lead: JoburiLead = {
      ...(alt ?? { id, erstelltAm: new Date().toISOString() }),
      id,
      ...(NIVEAUS.includes(deutsch) ? { deutsch: deutsch as JoburiLead["deutsch"] } : {}),
      ...(FORMEN.includes(form) ? { arbeitsform: form as JoburiLead["arbeitsform"] } : {}),
      ...(ZIELE.includes(ziel) ? { ziel: ziel as JoburiLead["ziel"] } : {}),
      ...(s(body.device, 80) ? { device: s(body.device, 80) } : {}),
      ...(s(body.lang, 5) ? { lang: s(body.lang, 5) } : {}),
      ...(body.utm && typeof body.utm === "object" ? { utm: body.utm as Record<string, string> } : {}),
    };
    if (!(await schreibeLead(lead))) return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
    return NextResponse.json({ ok: true, id });
  }

  /* ── 2 · Die Adresse — mit der Einwilligung zur KONTAKTAUFNAHME, nicht zur Weitergabe ── */
  if (schritt === "kontakt") {
    const id = s(body.id, 60);
    const lead = await leseLead(id);
    if (!lead) return NextResponse.json({ error: "Sesiune necunoscută.", code: "lead-weg" }, { status: 404 });

    const email = s(body.email, 200).toLowerCase();
    if (!MAIL_OK.test(email)) return NextResponse.json({ error: "E-mail invalid.", code: "mail" }, { status: 400 });
    if (body.kontaktOk !== true) return NextResponse.json({ error: "Acord lipsă.", code: "haken" }, { status: 400 });

    const jetzt = new Date().toISOString();
    const neu: JoburiLead = {
      ...lead,
      email,
      ...(s(body.vorname, 60) ? { vorname: s(body.vorname, 60) } : {}),
      ...(s(body.telefon, 40) ? { telefon: s(body.telefon, 40) } : {}),
      kontaktOk: true,
      kontaktOkAm: lead.kontaktOkAm || jetzt,
    };
    if (!(await schreibeLead(neu))) return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  /* ── 3 · Die Zustimmung für EINE Stelle ── */
  if (schritt === "weitergabe") {
    const id = s(body.id, 60);
    const lead = await leseLead(id);
    if (!lead) return NextResponse.json({ error: "Sesiune necunoscută.", code: "lead-weg" }, { status: 404 });
    const stelleId = s(body.stelleId, 60);
    if (!stelleId) return NextResponse.json({ error: "Job lipsă." }, { status: 400 });

    /* Titel und Firma werden MITGESCHRIEBEN, nicht nur die Kennung: Die Stelle kann später
       geändert oder gelöscht werden — die Einwilligung galt aber dieser einen. */
    const stelle = (await leseStellen()).find(x => x.id === stelleId);
    const eintrag = {
      stelleId, ja: body.ja === true, am: new Date().toISOString(),
      ...(stelle?.titel ? { titel: stelle.titel } : {}),
      ...(stelle?.firma ? { firma: stelle.firma } : {}),
    };
    const rest = (lead.weitergaben ?? []).filter(w => w.stelleId !== stelleId);
    if (!(await schreibeLead({ ...lead, weitergaben: [...rest, eintrag] }))) {
      return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  /* ── 4 · Der freiwillige Lebenslauf ── */
  if (schritt === "cv") {
    const id = s(body.id, 60);
    const lead = await leseLead(id);
    if (!lead) return NextResponse.json({ error: "Sesiune necunoscută.", code: "lead-weg" }, { status: 404 });
    const cvPath = s(body.cvPath, 300);
    if (!cvPath) return NextResponse.json({ error: "CV lipsă." }, { status: 400 });
    if (!(await schreibeLead({ ...lead, cvPath, cvName: s(body.cvName, 200) || lead.cvName, ...(s(body.davidId, 60) ? { davidId: s(body.davidId, 60) } : {}) }))) {
      return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Schritt unbekannt." }, { status: 400 });
}
