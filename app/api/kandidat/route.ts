import { NextResponse } from "next/server";
import { leseLebenslauf } from "@/lib/lebenslauf-store";
import { readKissLog } from "@/lib/try-this-look-store";
import { darfAmProfilArbeiten } from "@/lib/lebenslauf-besitz";
import { isAdminRequest } from "@/lib/admin-auth";
import {
  leseKandidat, schreibeKandidat, listeKandidaten, EINWILLIGUNG_VERSION,
  type KandidatProfil, type UmzugAntwort, type StartVerfuegbarkeit, type Arbeitsform,
} from "@/lib/kandidaten-store";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * DER KANDIDATEN-POOL — DAS SPEICHERN (Owner-Änderungsauftrag 26.08.2026,
 * KONZEPT-JOB-MATCH-TRICHTER.md Baustelle F). JEDE Klick-Frage im Trichter ist ihr
 * eigener, kleiner POST — progressiv gespeichert, damit auch ein Kandidat, der die
 * Strecke abbricht, nicht verloren geht (dieselbe Haltung wie die Spielzüge in
 * `/api/lebenslauf-spiel`). Der Server MERGT in den Bestand, überschreibt also nie ein
 * schon beantwortetes Feld mit einem leeren.
 *
 * DIE BESITZPRÜFUNG LÄUFT ÜBER DAS LEBENSLAUF-HAUPTPROFIL (`darfAmProfilArbeiten`) —
 * `kandidatId === hauptprofilId`, dieselbe Kennung, dieselbe Geräte-/Konto-Prüfung; es
 * gibt keine zweite Besitzlogik für Kandidaten.
 *
 * POST { id, device, ...Felder } → merged Update, `{ ok: true }`.
 *   Sonderfall `einwilligungStatus: "erteilt"|"abgelehnt"` setzt `einwilligung` MIT
 *   Zeitstempel + `EINWILLIGUNG_VERSION` — nie vom Client vorgegeben.
 * GET (admin) → alle Kandidaten, neueste zuerst (für `/admin/kandidaten`).
 */

const s = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const liste = (v: unknown, max: number, len: number) =>
  (Array.isArray(v) ? v : []).map(x => s(x, len)).filter(Boolean).slice(0, max);

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const id = String(body.id ?? "").trim();
  const device = String(body.device ?? "").trim().slice(0, 80);
  if (!id) return NextResponse.json({ error: "Kennung fehlt." }, { status: 400 });

  /**
   * KEIN PROFIL DARF EINEN LEAD KOSTEN (26.08.2026, an einem echten Fall gefunden):
   * Eine Bewerberin aus Bukarest kam über eine Facebook-Anzeige, gab ihre E-Mail und
   * ERTEILTE DIE EINWILLIGUNG — und landete trotzdem in keinem Pool. Ihre Sitzung hatte
   * ZWEI Kennungen erzeugt (eine beim Seitenaufruf, eine beim Eintragen der E-Mail, weil
   * der In-App-Browser von Facebook die Seite neu lud). Das Profil lag unter der ersten,
   * gespeichert wurde unter der zweiten — hier schlug `leseLebenslauf` fehl, die Route
   * antwortete 404, und der Aufrufer verschluckte den Fehler still.
   *
   * DER KISS-LOG-AUFTRAG REICHT ALS BESITZNACHWEIS — dieselbe Prüfung, die
   * `/api/bewerbung-pruefen` und `/api/premium-interesse` ohnehin benutzen. Existiert kein
   * Profil, ist das kein Grund, den Kandidaten wegzuwerfen: Der Auftrag ist der Beleg,
   * dass diese Kennung zu diesem Gerät gehört.
   */
  const hauptprofil = await leseLebenslauf(id);
  if (hauptprofil) {
    if (!(await darfAmProfilArbeiten(hauptprofil, device, request))) {
      return NextResponse.json({ error: "Not yours." }, { status: 403 });
    }
  } else {
    const auftrag = (await readKissLog().catch(() => [])).find(e => e.id === id);
    if (!auftrag) return NextResponse.json({ error: "Auftrag nicht gefunden." }, { status: 404 });
    if (auftrag.device && device && auftrag.device !== device) {
      return NextResponse.json({ error: "Not yours." }, { status: 403 });
    }
  }

  const bestand = await leseKandidat(id);
  const jetzt = new Date().toISOString();

  const UMZUG_WERTE = ["ja", "vielleicht", "nein"];
  const START_WERTE = ["sofort", "2wochen", "1monat", "spaeter"];
  const ARBEITSFORM_WERTE = ["remote", "hybrid", "vorOrt", "egal"];

  /* EINWILLIGUNG — Zeitstempel und Version kommen IMMER vom Server, nie vom Client
     (Häkchen-Zustand allein reicht nicht als Beleg). */
  let einwilligung = bestand?.einwilligung ?? { status: "offen" as const };
  const einwilligungStatus = String(body.einwilligungStatus ?? "");
  if (einwilligungStatus === "erteilt" || einwilligungStatus === "abgelehnt") {
    einwilligung = { status: einwilligungStatus, am: jetzt, version: EINWILLIGUNG_VERSION };
  }

  const naechster: KandidatProfil = {
    kandidatId: id,
    name: s(body.name, 80) || bestand?.name || s(hauptprofil?.name, 80) || undefined,
    email: (s(body.email, 200) || bestand?.email || s(hauptprofil?.email, 200) || "").toLowerCase() || undefined,
    telefon: s(body.telefon, 40) || bestand?.telefon,
    land: s(body.land, 80) || bestand?.land,
    stadt: s(body.stadt, 80) || bestand?.stadt || s(hauptprofil?.ort, 80) || undefined,
    sprachen: Array.isArray(body.sprachen) ? body.sprachen : bestand?.sprachen,
    aktuellerBeruf: s(body.aktuellerBeruf, 120) || bestand?.aktuellerBeruf,
    uebertragbareKompetenzen: Array.isArray(body.uebertragbareKompetenzen) ? liste(body.uebertragbareKompetenzen, 8, 80) : bestand?.uebertragbareKompetenzen,
    empfohleneRollen: Array.isArray(body.empfohleneRollen) ? liste(body.empfohleneRollen, 8, 80) : bestand?.empfohleneRollen,
    gewaehlteChanceId: s(body.gewaehlteChanceId, 60) || bestand?.gewaehlteChanceId,
    interessenChancenIds: Array.isArray(body.interessenChancenIds) ? liste(body.interessenChancenIds, 30, 60) : bestand?.interessenChancenIds,
    /* Die harten Chat-Angaben (Owner 26.08.2026) — leer heisst „nicht beantwortet", nie
       „löschen": derselbe Merge-Grundsatz wie bei allen Feldern hier. */
    altersgruppe: s(body.altersgruppe, 20) || bestand?.altersgruppe,
    jahreErfahrung: s(body.jahreErfahrung, 20) || bestand?.jahreErfahrung,
    ausbildungsstand: s(body.ausbildungsstand, 40) || bestand?.ausbildungsstand,
    fuehrerschein: Array.isArray(body.fuehrerschein) ? liste(body.fuehrerschein, 6, 40) : bestand?.fuehrerschein,
    mitCv: typeof body.mitCv === "boolean" ? body.mitCv : bestand?.mitCv,
    sucheIntent: (["sofort", "monate", "schauen"].includes(String(body.sucheIntent))
      ? String(body.sucheIntent) : bestand?.sucheIntent) as KandidatProfil["sucheIntent"],
    deutschSelbst: s(body.deutschSelbst, 40) || bestand?.deutschSelbst,
    deutschGetestet: s(body.deutschGetestet, 40) || bestand?.deutschGetestet,
    schreibprobe: s(body.schreibprobe, 600) || bestand?.schreibprobe,
    matchProzent: Number.isFinite(Number(body.matchProzent)) ? Math.max(0, Math.min(100, Math.round(Number(body.matchProzent)))) : bestand?.matchProzent,
    matchEmpfehlung: (["gut", "bruecke", "schwach"].includes(String(body.matchEmpfehlung))
      ? body.matchEmpfehlung : bestand?.matchEmpfehlung) as KandidatProfil["matchEmpfehlung"],
    umzug: (UMZUG_WERTE.includes(String(body.umzug)) ? body.umzug : bestand?.umzug) as UmzugAntwort | undefined,
    umzugLaender: Array.isArray(body.umzugLaender) ? liste(body.umzugLaender, 10, 40) : bestand?.umzugLaender,
    arbeitsform: Array.isArray(body.arbeitsform)
      ? (body.arbeitsform as unknown[]).map(String).filter(v => ARBEITSFORM_WERTE.includes(v)).slice(0, 4) as Arbeitsform[]
      : bestand?.arbeitsform,
    verfuegbarkeit: (START_WERTE.includes(String(body.verfuegbarkeit)) ? body.verfuegbarkeit : bestand?.verfuegbarkeit) as StartVerfuegbarkeit | undefined,
    gehaltswunsch: s(body.gehaltswunsch, 80) || bestand?.gehaltswunsch,
    videoMeinung: (["ja", "unsicher", "nein"].includes(String(body.videoMeinung)) ? String(body.videoMeinung) : bestand?.videoMeinung),
    hauptprofilId: id,
    versionId: s(body.versionId, 60) || bestand?.versionId,
    einwilligung,
    erstelltAm: bestand?.erstelltAm ?? jetzt,
    aktualisiertAm: jetzt,
  };

  if (!(await schreibeKandidat(naechster))) {
    return NextResponse.json({ error: "Konnte nicht gespeichert werden." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** Der interne Pool — NUR Admin (Baustelle G, `/admin/kandidaten`). */
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const kandidaten = await listeKandidaten();
  return NextResponse.json({ kandidaten }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * „FIRMA KONTAKTIERT" — NUR Admin (Owner-Auftrag 26.08.2026: „Wir melden uns" ist ein
 * Versprechen an den Kandidaten, das nicht stillschweigend untergehen darf). Setzt/löscht
 * EINE chanceId in `kontaktierteChancenIds`, unabhängig von der Geräte-Besitzprüfung
 * (der Owner arbeitet nicht am eigenen Gerät des Kandidaten).
 * PATCH { kandidatId, chanceId, kontaktiert } → { ok: true }
 */
export async function PATCH(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const kandidatId = s(body.kandidatId, 100);
  const chanceId = s(body.chanceId, 60);
  if (!kandidatId || !chanceId) return NextResponse.json({ error: "Kennung fehlt." }, { status: 400 });

  const bestand = await leseKandidat(kandidatId);
  if (!bestand) return NextResponse.json({ error: "Kandidat nicht gefunden." }, { status: 404 });

  const bisher = new Set(bestand.kontaktierteChancenIds ?? []);
  if (body.kontaktiert === true) bisher.add(chanceId); else bisher.delete(chanceId);

  const naechster: KandidatProfil = { ...bestand, kontaktierteChancenIds: Array.from(bisher), aktualisiertAm: new Date().toISOString() };
  if (!(await schreibeKandidat(naechster))) {
    return NextResponse.json({ error: "Konnte nicht gespeichert werden." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
