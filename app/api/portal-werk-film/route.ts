import { NextResponse } from "next/server";
import { str } from "@/lib/agent-modell";
import { mandantLesen, mandantSpeichern } from "@/lib/versusforge-mandanten";
import { istKuenstler } from "@/lib/lakatosbandi";
import { schluesselStimmt } from "@/lib/schluessel-vergleich";
import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";
import { filmPfad, filmPosterPfad, wandFilmPfad, wandFilmPosterPfad } from "@/lib/lakatosbandi-film";

/**
 * SEIN FILM ZU EINEM WERK — SELBST HOCHGELADEN (Owner 20.09.2026: „und bei jedem Poster in der
 * Edit-Seite soll man ein Video hochladen können").
 *
 * Bis heute hingen Filme nur von Hand am Werk (ein Skript, zwei Dateien, zwei Merker). Diese
 * Route macht daraus drei Schritte, die das Formular in „Seite bearbeiten" selbst geht:
 *
 *  · `a=start`  → zwei signierte Upload-Adressen: eine für den Film, eine für sein Standbild.
 *  · `a=fertig` → die Dateien liegen da; jetzt werden die Merker am Werk gesetzt.
 *  · `a=weg`    → Film und Standbild weg, Merker weg.
 *
 * ── WARUM DER FILM NICHT DURCH DIESE ROUTE LÄUFT ────────────────────────────────────────────
 *
 * Vercel bricht einen Aufruf bei rund 4,5 MB ab (Skill `upload-foto`: „Grosse Dateien gehen
 * direkt zu Supabase"). Ein Handy-Film von einer Minute wiegt das Zehnfache. Der Browser lädt
 * deshalb selbst in die Ablage — mit einer Adresse, die nur für GENAU diesen Pfad gilt. Er kann
 * damit nichts anderes überschreiben als den Film dieses einen Werks.
 *
 * ── ES SCHREIBT NUR, WER DEN SCHLÜSSEL HAT ──────────────────────────────────────────────────
 *
 * Dieselbe Prüfung wie überall im Dashboard (`schluesselStimmt`). Und es speichert schmal: frisch
 * lesen, nur die zwei Merker setzen — sonst überholt diese Route sein gleichzeitiges „Speichern".
 *
 * ── DAS STANDBILD KOMMT AUS DEM FILM ────────────────────────────────────────────────────────
 *
 * (Owner 20.09.2026: „Poster für Video muss aus dem Video kommen".) Der Browser schneidet es aus
 * dem gewählten Film und lädt es mit hoch; deshalb gibt `start` immer ZWEI Adressen zurück.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Gut eine Minute Handy-Film. Darüber ist es keine Geschichte zum Bild mehr, sondern ein Beitrag. */
const MAX_BYTES = 80 * 1024 * 1024;

const ARTEN = {
  /* Die Geschichte hinter dem Bild — er neben seinem Werk. */
  film: { video: filmPfad, bild: filmPosterPfad, merker: "film", am: "filmAm" },
  /* Das Blatt wird ausgepackt und aufgehängt. */
  wand: { video: wandFilmPfad, bild: wandFilmPosterPfad, merker: "wandFilm", am: "wandFilmAm" },
} as const;

async function adresseZumHochladen(pfad: string): Promise<string | null> {
  const r = await supabaseFetch(`/storage/v1/object/upload/sign/${BUCKET}/${encodeStoragePath(pfad)}`, {
    method: "POST",
    /* `x-upsert`: Ein neuer Film ERSETZT den alten — ohne den Kopf lehnt die Ablage ab, sobald
       an diesem Werk schon einmal einer lag. */
    headers: { "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify({}),
  }).catch(() => null);
  if (!r?.ok) return null;
  const p = await r.json().catch(() => null) as { url?: string; signedURL?: string; signedUrl?: string } | null;
  const signiert = p?.url || p?.signedURL || p?.signedUrl || "";
  if (!signiert) return null;
  const basis = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  return signiert.startsWith("http") ? signiert : `${basis}/storage/v1${signiert}`;
}

export async function POST(request: Request) {
  const u = new URL(request.url);
  const mandant = str(u.searchParams.get("m"), 80);
  const m = mandant ? await mandantLesen(mandant) : null;
  if (!m || !istKuenstler(m)) return NextResponse.json({ ok: false }, { status: 404 });
  if (!schluesselStimmt(m.schluessel, str(u.searchParams.get("k"), 200))) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const i = Math.round(Number(u.searchParams.get("i")));
  if (!Number.isInteger(i) || i < -1 || i > 11) return NextResponse.json({ ok: false }, { status: 400 });
  const nr = i < 0 ? "standard" : String(i);
  const art = ARTEN[str(u.searchParams.get("art"), 10) as keyof typeof ARTEN];
  if (!art) return NextResponse.json({ ok: false }, { status: 400 });
  const aktion = str(u.searchParams.get("a"), 10);

  const objekt = (pfad: string) => `/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad)}`;

  if (aktion === "start") {
    const [video, bild] = await Promise.all([adresseZumHochladen(art.video(mandant, nr)), adresseZumHochladen(art.bild(mandant, nr))]);
    if (!video || !bild) return NextResponse.json({ ok: false, grund: "ablage" }, { status: 502 });
    return NextResponse.json({ ok: true, video, bild, maxBytes: MAX_BYTES });
  }

  if (aktion === "fertig") {
    /* Erst nachsehen, DASS der Film da ist und wie schwer er ist — der Browser lädt an uns
       vorbei, also ist alles, was er behauptet, eine Behauptung. */
    const kopf = await supabaseFetch(objekt(art.video(mandant, nr)), { method: "HEAD" }).catch(() => null);
    if (!kopf?.ok) return NextResponse.json({ ok: false, grund: "fehlt" }, { status: 409 });
    const bytes = Number(kopf.headers.get("content-length") ?? 0);
    if (bytes > MAX_BYTES) {
      await supabaseFetch(objekt(art.video(mandant, nr)), { method: "DELETE" }).catch(() => null);
      await supabaseFetch(objekt(art.bild(mandant, nr)), { method: "DELETE" }).catch(() => null);
      return NextResponse.json({ ok: false, grund: "zu-gross" }, { status: 413 });
    }
  } else if (aktion === "weg") {
    /* Beim Löschen zählt nur, dass HINTERHER nichts mehr verbunden ist — ob die Datei vorher da
       war, ist gleichgültig (dieselbe Regel wie in `api/portal-stimme`). */
    await supabaseFetch(objekt(art.video(mandant, nr)), { method: "DELETE" }).catch(() => null);
    await supabaseFetch(objekt(art.bild(mandant, nr)), { method: "DELETE" }).catch(() => null);
  } else {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const am = new Date().toISOString();
  const frisch = await mandantLesen(mandant);
  if (!frisch) return NextResponse.json({ ok: false }, { status: 404 });
  const werkInfo = { ...(frisch.werkInfo ?? {}) };
  /* Die Zeit reist in der Adresse mit — sonst sähe er nach dem Tausch ein Jahr lang den alten
     Film (Zwischenspeicher, wie bei `filmAm` beschrieben). */
  werkInfo[nr] = { ...(werkInfo[nr] ?? {}), [art.merker]: aktion === "fertig", [art.am]: am };
  const gespeichert = await mandantSpeichern(mandant, { ...frisch, werkInfo });
  if (!gespeichert) return NextResponse.json({ ok: false, grund: "speichern" }, { status: 502 });
  return NextResponse.json({ ok: true, am });
}
