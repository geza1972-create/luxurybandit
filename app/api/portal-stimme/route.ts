import { NextResponse } from "next/server";
import { str } from "@/lib/agent-modell";
import { mandantLesen, mandantSpeichern } from "@/lib/versusforge-mandanten";
import { istKuenstler } from "@/lib/lakatosbandi";
import { schluesselStimmt } from "@/lib/schluessel-vergleich";
import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";
import { sprecherTonPfad, sprecherPfad, sprecherWebmPfad, sprecherBildPfad } from "@/lib/lakatosbandi-film";
import { youtubeHochladen, youtubeEingerichtet } from "@/lib/youtube-upload";

/**
 * SEINE STIMME ZU EINEM WERK — AUFNEHMEN UND ABLEGEN (Owner 17.09.2026: „gib mir die
 * Möglichkeit, meine Stimme aufzunehmen").
 *
 * ── DER KÜRZESTE WEG ZU EINEM LIVING POSTER ─────────────────────────────────────────────────
 *
 * Der Browser nimmt auf, schickt die Datei hierher, hier landet sie in der Ablage, und der Code
 * auf dem Papier spielt sie ab. Kein Video, kein Rendern, kein Dritter, keine Maschinenstimme.
 *
 * ── ES SCHREIBT NUR, WER DEN SCHLÜSSEL HAT ──────────────────────────────────────────────────
 *
 * Dieselbe Prüfung wie überall im Dashboard (`schluesselStimmt`). Ohne sie könnte jeder eine
 * beliebige Tonspur an ein fremdes Werk hängen — und die läuft danach in jedem gedruckten
 * Poster dieses Künstlers.
 *
 * ── UND ES SPEICHERT SCHMAL ─────────────────────────────────────────────────────────────────
 *
 * `mandantSpeichern` legt den GANZEN Datensatz ab; deshalb wird frisch gelesen und nur
 * `werkInfo[nr].stimme` gesetzt. Sonst überholt diese Route sein gleichzeitiges „Speichern" im
 * Formular und wirft dessen Änderungen weg.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/* Eine Minute Ton sind ein paar hundert Kilobyte — der Vercel-Standard reicht knapp nicht, wenn
   die Leitung langsam ist. */
export const maxDuration = 60;

/* Fünf Megabyte sind rund zehn Minuten Sprache in dieser Qualität — mehr ist kein Brief mehr. */
const MAX_BYTES = 5 * 1024 * 1024;
/**
 * Seit der Film scharf aufgenommen wird (3 Mbit/s) wiegt eine Minute rund 22 MB — und er geht
 * zu YouTube weiter, nicht in unsere Ablage. 150 MB sind damit gut sechs Minuten; darüber ist
 * es kein Brief mehr, sondern ein Vortrag.
 */
const MAX_VIDEO_BYTES = 150 * 1024 * 1024;

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

  /**
   * ── DREI SORTEN, EIN WEG (Owner 17.09.2026: „Video neben der Stimme") ────────────────────
   *
   * `art=video` legt seine Aufnahme dorthin, wo sonst ein gerenderter Film liegt — der Player
   * zieht Film der Stimme vor, ohne zu fragen, wie er entstanden ist. `art=bild` ist das
   * Standbild dazu, im Browser aus dem ersten Bild des Films geschnitten. Alles andere ist Ton.
   *
   * Ein Film wiegt mehr als eine Sprachnachricht — deshalb ein eigener Deckel. Über zwei
   * Minuten wird aus einem Brief ohnehin ein Vortrag.
   */
  const art = str(u.searchParams.get("art"), 10);
  const typ = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const daten = new Uint8Array(await request.arrayBuffer());
  const loeschen = u.searchParams.get("weg") === "1";
  const grenze = art === "video" ? MAX_VIDEO_BYTES : MAX_BYTES;
  if (!loeschen && (!daten.length || daten.length > grenze)) {
    return NextResponse.json({ ok: false, grund: daten.length ? "zu-gross" : "leer" }, { status: 413 });
  }

  /**
   * ── FILME GEHEN ZU YOUTUBE, NICHT IN UNSERE ABLAGE (Owner 17.09.2026: „und dort die Videos
   * speichern" → „b" · „bei uns nicht speichern") ────────────────────────────────────────────
   *
   * Der Film wird ungelistet hochgeladen, und nur seine Kennung bleibt am Werk. Unsere Ablage
   * bekommt ihn nicht — das war ausdrücklich gewünscht.
   *
   * MIT EINEM RÜCKFALL, UND DER IST NICHT VERHANDELBAR: Wenn YouTube nicht antwortet oder
   * (noch) nicht eingerichtet ist, legen wir die Aufnahme bei uns ab. Sonst hat der Künstler
   * eine Minute gesprochen, und am Ende ist nichts da — das ist der einzige Fehler, den man
   * einem Menschen nicht zweimal zumuten kann.
   */
  if (art === "video" && !loeschen && youtubeEingerichtet()) {
    /* ── OBEN STEHT UNSER NAME (Owner 17.09.2026: „das darf nicht sein hier oben, wenn schon
       lakatosbandi.com") ──────────────────────────────────────────────────────────────────
       YouTube blendet über dem Film den Titel ein. Dort gehört die Adresse hin, die auch auf
       dem Papier steht — nicht eine Beschreibung. Dann liest der Käufer im Player dasselbe wie
       auf dem Poster in seiner Hand. */
    const werk = (m.werkInfo?.[nr]?.titel ?? "").trim();
    const name = ["lakatosbandi.com", werk || m.name, werk ? m.name : ""].filter(Boolean).join(" · ");
    const yt = await youtubeHochladen({ daten, typ, titel: name, text: `lakatosbandi.com/${mandant}` });
    if (yt.ok) {
      const frisch = await mandantLesen(mandant);
      if (frisch) {
        const werkInfo = { ...(frisch.werkInfo ?? {}) };
        werkInfo[nr] = { ...(werkInfo[nr] ?? {}), sprecher: true, sprecherAm: new Date().toISOString(), youtube: yt.id };
        await mandantSpeichern(mandant, { ...frisch, werkInfo })
          .catch(e => console.error("[portal-stimme] Merker nicht gesetzt:", mandant, nr, e));
      }
      return NextResponse.json({ ok: true, youtube: yt.id, stimmeAm: new Date().toISOString() });
    }
    console.warn("[portal-stimme] YouTube gescheitert, Film bleibt bei uns:", yt.grund);
  }

  const ablage = art === "video"
    ? (typ === "video/mp4" ? sprecherPfad(mandant, nr) : sprecherWebmPfad(mandant, nr))
    : art === "bild" ? sprecherBildPfad(mandant, nr)
    : sprecherTonPfad(mandant, nr);
  const pfad = `/storage/v1/object/${BUCKET}/${encodeStoragePath(ablage)}`;
  const res = loeschen
    ? await supabaseFetch(pfad, { method: "DELETE" }).catch(() => null)
    : await supabaseFetch(pfad, {
      method: "POST",
      headers: { "Content-Type": typ || "audio/webm", "x-upsert": "true" },
      body: daten,
    }).catch(() => null);
  /**
   * ── LÖSCHEN DARF NICHT AN EINER FEHLENDEN DATEI SCHEITERN (17.09.2026 gemessen: „kann das
   * Video nicht löschen") ──────────────────────────────────────────────────────────────────
   *
   * Seit die Filme zu YouTube gehen, liegt bei uns keine Datei mehr. Die Ablage meldete beim
   * Löschen „nicht gefunden", die Route brach ab — und der Merker blieb stehen. Für den
   * Künstler sah es aus, als liesse sich sein Film nicht entfernen.
   *
   * Beim Löschen zählt deshalb nur, dass HINTERHER nichts mehr verbunden ist. Ob die Datei
   * vorher da war, ist gleichgültig.
   */
  if (!res?.ok && !loeschen) {
    console.error("[portal-stimme] Ablage gescheitert:", mandant, nr, res?.status);
    return NextResponse.json({ ok: false, grund: "ablage" }, { status: 502 });
  }

  const frisch = await mandantLesen(mandant);
  if (frisch) {
    const werkInfo = { ...(frisch.werkInfo ?? {}) };
    werkInfo[nr] = {
      ...(werkInfo[nr] ?? {}),
      /* Beim Löschen eines Films fällt auch die YouTube-Kennung weg — sonst spielte das Fenster
         weiter von dort. Der Film selbst bleibt auf seinem Kanal liegen; zum Löschen DORT haben
         wir bewusst kein Recht (wir dürfen nur hochladen). */
      ...(art === "video" ? { sprecher: !loeschen, sprecherAm: new Date().toISOString(), ...(loeschen ? { youtube: "" } : {}) } : {}),
      ...(art === "bild" ? {} : art === "video" ? {} : { stimme: !loeschen }),
      /* Die Zeit reist in der Adresse mit — sonst hört er beim zweiten Versuch die erste
         Aufnahme weiter (ein Jahr Zwischenspeicher, wie bei den Filmen). */
      ...(art === "bild" || art === "video" ? {} : { stimmeAm: new Date().toISOString() }),
    };
    await mandantSpeichern(mandant, { ...frisch, werkInfo })
      .catch(e => console.error("[portal-stimme] Merker nicht gesetzt:", mandant, nr, e));
  }

  return NextResponse.json({ ok: true, stimmeAm: new Date().toISOString() });
}
