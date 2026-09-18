import { NextResponse } from "next/server";
import { kunstErzeugen, mitUnterlage } from "@/lib/lakatosbandi-kunst";
import { motivPfad } from "@/lib/versusforge-moderation";
import { mandantOeffentlich } from "@/lib/versusforge-mandanten";
import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * „GENERATE ART" — SEIN FOTO IM STIL DES WERKS (Owner 17.09.2026).
 *
 * ── NOCH OHNE KASSE (Owner 17.09.2026: „mach mal erst mal gratis") ──────────────────────────
 *
 * Der Aufpreis von 1 € und die drei Versuche sind beschlossen, aber zuerst soll es laufen und
 * gut aussehen. ACHTUNG BEIM AUSROLLEN: Solange hier nichts abgebucht wird, kostet jeder Klick
 * uns echtes Geld (~1,7 Cent) — auf einer öffentlichen Seite ohne Login ist das offen nach oben
 * (Owner selbst: „hier werden einen haufen leute generieren wenn es kostenlos ist"). Vor dem
 * Deploy kommt die Kasse davor: Guthaben prüfen → abbuchen → erst dann dieser Aufruf.
 *
 * ── WARUM DER SERVER DAS WERK SELBST HOLT ───────────────────────────────────────────────────
 *
 * fal braucht beide Bilder. Das Foto des Kunden liegt nur in seinem Browser (Daten-URI, so
 * gewollt: „wenn er rausgeht von der seite, dann ist das bild weg"). Das WERK dagegen liegt bei
 * uns — und eine Adresse wie `http://localhost:3001/...` kann fal nicht abrufen. Also lädt der
 * Server es hier und reicht es als Daten-URI weiter. Damit läuft es lokal wie in der Wolke.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as
    { foto?: string; mandant?: string; werk?: string } | null;

  const foto = String(body?.foto ?? "");
  const mandant = String(body?.mandant ?? "");
  const werk = String(body?.werk ?? "");
  if (!foto.startsWith("data:image/") || !mandant) {
    return NextResponse.json({ fehler: "unvollstaendig" }, { status: 400 });
  }

  /* ── DAS WERK IST DIE STILVORLAGE, BILD 1 IM PROMPT ──────────────────────────────────────
     Der Prompt des Owners arbeitet mit zwei Bildern: das Werk bestimmt Palette, Pinsel und
     Abstraktionsgrad, das Foto die Person. Das Werk liegt in unserem Lager — und eine Adresse
     wie `http://localhost:3001/...` könnte OpenAI nicht abrufen, also geht es als Datei mit. */
  const pfad = motivPfad(mandant, werk || "standard");
  const r = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad)}`);
  if (!r.ok) return NextResponse.json({ fehler: "werk-fehlt" }, { status: 404 });
  const vorlage = `data:image/jpeg;base64,${Buffer.from(new Uint8Array(await r.arrayBuffer())).toString("base64")}`;

  /* Die Technik aus seinen Werkangaben („acril", „pix", „digital" …) als Hinweis für den
     Sehen-Schritt — der Künstler weiss besser als ein Modell, womit er gearbeitet hat. */
  const m = await mandantOeffentlich(mandant);
  const technik = String(m?.werkInfo?.[werk || "standard"]?.technik ?? "").trim();
  /* Seine Notizen zur Methode — am Werk, sonst am Künstler; noch kein Feld im Dashboard, also
     heute meist leer. Der Weg ist gebaut, das Feld kommt, wenn der Owner es will. */
  const wi = m?.werkInfo?.[werk || "standard"] as Record<string, unknown> | undefined;
  /* ── BEIDES, NICHT ENTWEDER-ODER (17.09.2026) ────────────────────────────────────────────
     Die Handschrift gehört dem KÜNSTLER (flaches Gesicht, seine Palette, sein Auftrag), die
     Besonderheiten dem WERK (diese Pose, dieses Kleid, diese Tauben). Vorher schlug die
     Werk-Notiz die Künstler-Notiz aus dem Feld — wer einem Werk etwas zufügte, verlor damit die
     Handschrift. Jetzt stehen beide da: erst der Künstler, dann das Werk. */
  const notizenKuenstler = String((m as Record<string, unknown> | null)?.stilnotizen ?? "").trim();
  const notizenWerk = String(wi?.stilnotizen ?? "").trim();
  const notizen = [notizenKuenstler, notizenWerk].filter(Boolean).join(" ");
  const ergebnis = await kunstErzeugen(vorlage, foto, "sehr", undefined, technik, notizen);
  if (!ergebnis.ok) {
    /* „abgelehnt" ist kein Fehler des Kunden, sondern eine Absage — und sie muss als solche
       ankommen, damit die Seite nicht „versuch es nochmal" sagt, wo nichts zu versuchen ist. */
    const status = ergebnis.grund === "abgelehnt" ? 422 : 502;
    return NextResponse.json({ fehler: ergebnis.grund }, { status });
  }
  /* Das Foto als blasse Unterlage unter die Zeichnung (Owner 17.09.2026) — Ähnlichkeit aus dem
     Foto, Kunst aus den Strichen. Scheitert das Zusammensetzen, geht das erzeugte Bild allein
     zurück, statt dass der bezahlte Lauf verloren ist. */
  const bild = await mitUnterlage(foto, ergebnis.bild).catch(e => {
    console.warn("[kunst] Unterlage fehlgeschlagen:", e);
    return ergebnis.bild;
  });
  /* Welcher Motor gelaufen ist, steht in der Antwort — sonst vergleicht man Ergebnisse, ohne
     zu wissen, woher sie kamen (drei Motoren, ein Schalter). */
  return NextResponse.json({ bild, modell: ergebnis.modell });
}
