import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { leseStellen, schreibeStellen, sichtbare, passendeMitGuete, type Stelle, type Arbeitsform, type Deutschniveau } from "@/lib/joburi-store";

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

const NIVEAUS = ["A2", "B1", "B2", "C1", "C2", "unbekannt"];
/* „A2" ist gross, „unbekannt" ist klein — und beide sind länger als zwei Zeichen, wenn man
   das Wort mitzählt. Ein blindes `.slice(0,2).toUpperCase()` machte aus „unbekannt" ein
   „UN", das in keiner Liste steht; es landete nur zufällig im richtigen Fallback. */
const niveauLesen = (v: unknown): string => {
  const roh = String(v ?? "").trim();
  if (!roh) return "";
  const gross = roh.toUpperCase();
  if (NIVEAUS.includes(gross)) return gross;
  return roh.toLowerCase() === "unbekannt" ? "unbekannt" : "";
};
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

  const deutsch = niveauLesen(url.searchParams.get("deutsch"));
  const form = s(url.searchParams.get("arbeitsform"), 10).toLowerCase();
  const ziel = s(url.searchParams.get("ziel"), 20).toLowerCase();
  const treffer = passendeMitGuete(stellen, {
    ...(deutsch ? { deutsch: deutsch as Deutschniveau } : {}),
    ...(FORMEN.includes(form) || form === "egal" ? { arbeitsform: form as Arbeitsform | "egal" } : {}),
    ...(["salariu", "flexibilitate", "cariera", "intoarcere"].includes(ziel) ? { ziel: ziel as "salariu" } : {}),
  });

  /**
   * OHNE ADRESSE KEIN LINK (siehe Kopfkommentar). `frei=1` schaltet die Vollansicht frei —
   * der Trichter setzt es erst, wenn der Lead gespeichert ist. Der Riegel steht hier und
   * nicht im Browser: Was der Server nicht schickt, kann auch niemand aus dem Quelltext
   * lesen.
   */
  const frei = url.searchParams.get("frei") === "1";
  /* Die Güte reist als Feld an der Stelle mit — der Trichter soll sie zeigen, nicht selbst
     ausrechnen; sonst stünden zwei Wahrheiten über denselben Treffer im Umlauf. */
  const raus = treffer.map(({ stelle, guete }) => ({ ...stelle, guete, ...(frei ? {} : { link: undefined }) }));
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

  const niveau = niveauLesen(roh.deutschMin);
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
    /* Ohne Angabe „unbekannt" — nicht B2 raten: Ein erfundenes Niveau schliesst
       Bewerber aus, die sich hätten bewerben können. */
    deutschMin: (niveau || "unbekannt") as Deutschniveau,
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
    ...(s(roh.quelle, 120) ? { quelle: s(roh.quelle, 120) } : {}),
    ...(roh.relocation === true ? { relocation: true } : {}),
    ...(roh.rumaenienNoetig === true ? { rumaenienNoetig: true } : {}),
    aktiv: roh.aktiv !== false,
    ...(s(roh.laeuftAbAm, 10) ? { laeuftAbAm: s(roh.laeuftAbAm, 10) } : {}),
  };

  const liste = alt ? stellen.map(x => (x.id === id ? neu : x)) : [neu, ...stellen];
  if (!(await schreibeStellen(liste))) return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
  return NextResponse.json({ ok: true, stelle: neu, stellen: liste });
}
