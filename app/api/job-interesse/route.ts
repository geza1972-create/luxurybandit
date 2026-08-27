import { NextResponse } from "next/server";
import { leseLebenslauf, schreibeLebenslauf } from "@/lib/lebenslauf-store";
import { darfAmProfilArbeiten } from "@/lib/lebenslauf-besitz";
import { veroeffentlichbareChancen, chanceFuerKandidat } from "@/lib/job-chancen";
import { leseKandidat, schreibeKandidat, START_OPTIONEN, type KandidatProfil } from "@/lib/kandidaten-store";

/** Dieselben Werte wie in `/api/kandidat` — Umzug hat (noch) keine exportierte Liste. */
const UMZUG_WERTE = ["ja", "vielleicht", "nein"];

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * DIE EINFACHE INTERESSE-LISTE (Owner-Auftrag 26.08.2026: „der User muss nur abhacken
 * wo er Interesse hat. Und ich muss nur wissen im Admin, dann werde ich die Firmen
 * kontaktieren") — bewusst OHNE KI-Matching-Prozente, anders als /api/job-vorschlaege.
 * Zeigt ALLE veröffentlichbaren Chancen (nur Titel/Land/Sprachen, `chanceFuerKandidat()`
 * — nie den Firmennamen), der Kandidat kreuzt mehrere gleichzeitig an.
 *
 * GET  ?id=&device=              → { chancen: JobChanceKandidat[], ausgewaehlt: string[] }
 * POST { id, device, chanceIds } → speichert die Auswahl komplett (ersetzt, kein Merge —
 *                                   ein leeres Häkchen-Feld ist eine gültige Antwort:
 *                                   „keine Lust mehr"), `{ ok: true }`.
 */

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim() ?? "";
  const device = url.searchParams.get("device")?.trim().slice(0, 80) ?? "";
  if (!id) return NextResponse.json({ error: "Kennung fehlt." }, { status: 400 });

  const profil = await leseLebenslauf(id);
  if (!profil) return NextResponse.json({ error: "Profil nicht gefunden." }, { status: 404 });
  if (!(await darfAmProfilArbeiten(profil, device, request))) {
    return NextResponse.json({ error: "Not yours." }, { status: 403 });
  }

  const chancenVoll = await veroeffentlichbareChancen();
  const chancen = chancenVoll.map(chanceFuerKandidat);
  const kandidat = await leseKandidat(id);
  /* WAS SCHON DA IST (Owner 26.08.2026: „frag ihn am Anfang, ob er ein CV hat") — hat die
     CV-Auswertung Werdegang/Abschluss geliefert, fragt die Seite sie nicht noch einmal ab;
     fehlt beides, ist die Handeingabe Pflicht. */
  const hatCv = !!profil.erfahrung?.length || !!profil.ausbildung?.length;
  return NextResponse.json({
    chancen,
    ausgewaehlt: kandidat?.interessenChancenIds ?? [],
    hatCv,
    vorhanden: {
      stadt: kandidat?.stadt ?? profil.ort ?? "",
      telefon: kandidat?.telefon ?? profil.telefon ?? "",
      altersgruppe: kandidat?.altersgruppe ?? "",
      letzterBeruf: kandidat?.aktuellerBeruf ?? profil.erfahrung?.[0]?.rolle ?? "",
      jahreErfahrung: kandidat?.jahreErfahrung ?? profil.erfahrung?.[0]?.zeitraum ?? "",
      ausbildungsstand: kandidat?.ausbildungsstand ?? profil.ausbildung?.[0]?.titel ?? "",
      umzug: kandidat?.umzug ?? "",
      verfuegbarkeit: kandidat?.verfuegbarkeit ?? "",
    },
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const id = String(body.id ?? "").trim();
  const device = String(body.device ?? "").trim().slice(0, 80);
  if (!id) return NextResponse.json({ error: "Kennung fehlt." }, { status: 400 });

  const profil = await leseLebenslauf(id);
  if (!profil) return NextResponse.json({ error: "Profil nicht gefunden." }, { status: 404 });
  if (!(await darfAmProfilArbeiten(profil, device, request))) {
    return NextResponse.json({ error: "Not yours." }, { status: 403 });
  }

  const chancenVoll = await veroeffentlichbareChancen();
  const gueltigeIds = new Set(chancenVoll.map(c => c.id));
  const chanceIds = (Array.isArray(body.chanceIds) ? (body.chanceIds as unknown[]) : [])
    .map((v: unknown) => String(v ?? "").trim())
    .filter((v: string) => gueltigeIds.has(v))
    .slice(0, 30);

  /**
   * DIE PFLICHTANGABEN (Owner 26.08.2026: „wenn der User im Chat nichts angibt, dann ist
   * alles unnützlich") — ohne Alter, Wohnort und Telefon ist ein Häkchen wertlos: Der
   * Owner ruft die Firma an und hat nichts in der Hand. Der Server nimmt die Auswahl
   * deshalb NUR mit diesen drei Angaben an; der Client sperrt den Knopf zusätzlich.
   */
  const t = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
  const altersgruppe = t(body.altersgruppe, 20);
  const stadt = t(body.stadt, 80);
  const telefon = t(body.telefon, 40);
  const letzterBeruf = t(body.letzterBeruf, 120);
  const jahreErfahrung = t(body.jahreErfahrung, 20);
  const ausbildungsstand = t(body.ausbildungsstand, 40);
  /* Ein ausgelesener CV liefert Werdegang und Abschluss bereits — dann sind nur die drei
     Angaben Pflicht, die in keinem Lebenslauf stehen (Alter) oder die wir zum Anrufen
     brauchen (Wohnort, Telefon). */
  const hatCv = !!profil.erfahrung?.length || !!profil.ausbildung?.length;
  const fehlend = [
    !altersgruppe && "Alter", !stadt && "Wohnort", !telefon && "Telefon",
    ...(hatCv ? [] : [
      !letzterBeruf && "letzte Tätigkeit", !jahreErfahrung && "Erfahrung", !ausbildungsstand && "Abschluss",
    ]),
  ].filter(Boolean);
  if (fehlend.length) {
    return NextResponse.json({ error: `Es fehlt: ${fehlend.join(", ")}.`, fehlend }, { status: 400 });
  }
  const umzugRoh = String(body.umzug ?? "");
  const verfuegbarRoh = String(body.verfuegbarkeit ?? "");

  const bestand = await leseKandidat(id);
  const jetzt = new Date().toISOString();
  /* ERGÄNZEN, NIE ERSETZEN: `...bestand` zuerst — sonst löscht dieser Schreibvorgang
     Felder, die aus dem Trichter oder aus dem Admin stammen (Umzug, Verfügbarkeit, der
     „Firma kontaktiert"-Status). */
  const naechster: KandidatProfil = {
    ...(bestand ?? {}),
    kandidatId: id,
    name: bestand?.name ?? profil.name ?? undefined,
    email: bestand?.email ?? profil.email ?? undefined,
    altersgruppe,
    stadt,
    telefon,
    aktuellerBeruf: letzterBeruf,
    jahreErfahrung,
    ausbildungsstand,
    ...(UMZUG_WERTE.includes(umzugRoh) ? { umzug: umzugRoh as KandidatProfil["umzug"] } : {}),
    ...(START_OPTIONEN.includes(verfuegbarRoh as never) ? { verfuegbarkeit: verfuegbarRoh as KandidatProfil["verfuegbarkeit"] } : {}),
    interessenChancenIds: chanceIds,
    hauptprofilId: id,
    einwilligung: bestand?.einwilligung ?? { status: "offen" },
    erstelltAm: bestand?.erstelltAm ?? jetzt,
    aktualisiertAm: jetzt,
  };
  if (!(await schreibeKandidat(naechster))) {
    return NextResponse.json({ error: "Konnte nicht gespeichert werden." }, { status: 500 });
  }

  /**
   * DIESELBEN ANGABEN FÜLLEN DIE KARTE (Owner 26.08.2026: „wenn er kein CV eingibt, dann
   * müssen wir alles abfragen") — vorher landeten die Trichter-Antworten NUR im Prompt der
   * KI und waren danach weg; die Karte blieb deshalb bei Name + zwei Stichworten stehen.
   * Jetzt schreibt derselbe Vorgang sie ins Lebenslauf-Profil, aus dem die Karte rendert.
   *
   * NUR ERGÄNZEN: Ein echter CV-Upload (Weg 1) liefert reichere Daten — die überschreiben
   * wir hier nie, dieser Weg füllt bloss, was leer ist.
   */
  try {
    const karte = {
      ...profil,
      ort: profil.ort || stadt,
      telefon: profil.telefon || telefon,
      erfahrung: profil.erfahrung?.length ? profil.erfahrung : [{ rolle: letzterBeruf, zeitraum: jahreErfahrung }],
      ausbildung: profil.ausbildung?.length ? profil.ausbildung : [{ titel: ausbildungsstand }],
      ...(verfuegbarRoh && !profil.verfuegbarkeit ? { verfuegbarkeit: verfuegbarRoh } : {}),
    };
    await schreibeLebenslauf(karte);
  } catch (err) {
    /* Die Karte ist die Zugabe — der Pool-Eintrag steht bereits. */
    console.error("[job-interesse] Karte konnte nicht ergänzt werden:", err);
  }

  return NextResponse.json({ ok: true });
}
