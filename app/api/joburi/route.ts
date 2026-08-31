import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { leseStellen, schreibeStellen, sichtbare, passende, type Stelle, type Arbeitsform, type Deutschniveau } from "@/lib/joburi-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DIE STELLEN — LESEN FÜR JEDEN, SCHREIBEN NUR FÜR DEN ADMIN.
 *
 * GET  ?deutsch=C1&arbeitsform=remote&ziel=salariu → die passenden Stellen, sortiert.
 * GET  ?alle=1 (Admin)                            → auch inaktive und abgelaufene.
 * POST { stelle }        (Admin) → anlegen oder ändern (id entscheidet).
 * POST { loeschen: id }  (Admin) → entfernen.
 *
 * WAS DER BEWERBER NIE SIEHT: den Bewerbungslink der Stellen, solange er seine Adresse nicht
 * gegeben hat. Der Trichter zeigt vorher Titel, Firma und Gehalt — genug, um zu erkennen,
 * dass es echt ist, und zu wenig, um an uns vorbeizugehen. Genau das ist der Gegenwert, für
 * den er die Adresse hergibt (Owner 31.08.2026: „Das gibt der E-Mail-Abgabe einen
 * unmittelbaren Gegenwert").
 */

const s = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const n = (v: unknown): number | undefined => {
  const z = Number(v);
  return Number.isFinite(z) && z > 0 ? Math.round(z) : undefined;
};

const NIVEAUS = ["A2", "B1", "B2", "C1", "C2"];
const FORMEN = ["remote", "hibrid", "birou"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const alle = url.searchParams.get("alle") === "1";
  const stellen = await leseStellen();

  if (alle) {
    if (!(await isAdminRequest(request))) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }
    return NextResponse.json({ ok: true, stellen });
  }

  const deutsch = s(url.searchParams.get("deutsch"), 2).toUpperCase();
  const form = s(url.searchParams.get("arbeitsform"), 10).toLowerCase();
  const ziel = s(url.searchParams.get("ziel"), 20).toLowerCase();
  const treffer = passende(stellen, {
    ...(NIVEAUS.includes(deutsch) ? { deutsch: deutsch as Deutschniveau } : {}),
    ...(FORMEN.includes(form) || form === "egal" ? { arbeitsform: form as Arbeitsform | "egal" } : {}),
    ...(["salariu", "remote", "job-nou", "intoarcere"].includes(ziel) ? { ziel: ziel as "salariu" } : {}),
  });

  /**
   * OHNE ADRESSE KEIN LINK (siehe Kopfkommentar). `frei=1` schaltet die Vollansicht frei —
   * der Trichter setzt es erst, wenn der Lead gespeichert ist. Der Riegel steht hier und
   * nicht im Browser: Was der Server nicht schickt, kann auch niemand aus dem Quelltext
   * lesen.
   */
  const frei = url.searchParams.get("frei") === "1";
  const raus = treffer.map(t => frei ? t : { ...t, link: undefined });
  return NextResponse.json({ ok: true, anzahl: treffer.length, stellen: raus, gesamt: sichtbare(stellen).length });
}

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const stellen = await leseStellen();

  if (body.loeschen) {
    const id = s(body.loeschen, 60);
    const rest = stellen.filter(x => x.id !== id);
    if (rest.length === stellen.length) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    if (!(await schreibeStellen(rest))) return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
    return NextResponse.json({ ok: true, stellen: rest });
  }

  const roh = (body.stelle ?? {}) as Record<string, unknown>;
  const titel = s(roh.titel, 160);
  const firma = s(roh.firma, 120);
  if (!titel || !firma) return NextResponse.json({ error: "Titel und Firma sind Pflicht." }, { status: 400 });

  const niveau = s(roh.deutschMin, 2).toUpperCase();
  const form = s(roh.arbeitsform, 10).toLowerCase();
  const jetzt = new Date().toISOString();
  const id = s(roh.id, 60) || crypto.randomUUID();
  const alt = stellen.find(x => x.id === id);

  const neu: Stelle = {
    id,
    erstelltAm: alt?.erstelltAm || jetzt,
    aktualisiertAm: jetzt,
    titel,
    firma,
    ort: s(roh.ort, 200),
    ...(s(roh.land, 4) ? { land: s(roh.land, 4).toUpperCase() } : {}),
    arbeitsform: (FORMEN.includes(form) ? form : "birou") as Arbeitsform,
    deutschMin: (NIVEAUS.includes(niveau) ? niveau : "B2") as Deutschniveau,
    ...(n(roh.gehaltVon) ? { gehaltVon: n(roh.gehaltVon) } : {}),
    ...(n(roh.gehaltBis) ? { gehaltBis: n(roh.gehaltBis) } : {}),
    ...(roh.gehaltGeschaetzt === true ? { gehaltGeschaetzt: true } : {}),
    ...(s(roh.waehrung, 4) ? { waehrung: s(roh.waehrung, 4) } : { waehrung: "EUR" }),
    ...(s(roh.berufsfeld, 80) ? { berufsfeld: s(roh.berufsfeld, 80) } : {}),
    ...(s(roh.vertragsart, 60) ? { vertragsart: s(roh.vertragsart, 60) } : {}),
    ...(["junior", "mid", "senior"].includes(s(roh.erfahrung, 10)) ? { erfahrung: s(roh.erfahrung, 10) as "junior" } : {}),
    ...(s(roh.kurzbeschreibung, 600) ? { kurzbeschreibung: s(roh.kurzbeschreibung, 600) } : {}),
    ...(s(roh.link, 500) ? { link: s(roh.link, 500) } : {}),
    ...(s(roh.logoUrl, 500) ? { logoUrl: s(roh.logoUrl, 500) } : {}),
    ...(roh.relocation === true ? { relocation: true } : {}),
    ...(roh.rumaenienNoetig === true ? { rumaenienNoetig: true } : {}),
    aktiv: roh.aktiv !== false,
    ...(s(roh.laeuftAbAm, 10) ? { laeuftAbAm: s(roh.laeuftAbAm, 10) } : {}),
  };

  const liste = alt ? stellen.map(x => (x.id === id ? neu : x)) : [neu, ...stellen];
  if (!(await schreibeStellen(liste))) return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
  return NextResponse.json({ ok: true, stelle: neu, stellen: liste });
}
