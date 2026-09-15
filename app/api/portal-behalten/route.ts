import { NextResponse } from "next/server";
import { str } from "@/lib/agent-modell";
import { mandantLesen, mandantSpeichern } from "@/lib/versusforge-mandanten";
import { istKuenstler } from "@/lib/lakatosbandi";
import { schluesselStimmt } from "@/lib/schluessel-vergleich";
import { mandantUmziehen } from "@/lib/kuenstler-umzug";
import { linksPerPost } from "@/lib/versusforge-links-post";
import { anmeldeAlarm, freigabeAufsTelefon } from "@/lib/versusforge-anmelde-post";
import { kuenstlerUrl } from "@/lib/lakatosbandi";
import { ereignisMerken } from "@/lib/versusforge-ereignis";

/**
 * „ICH WILL SIE BEHALTEN" (Owner 13.09.2026: „wenn er das behalten möchte dann soll er sein name
 * und email angeben und bestätigen wenn nicht wird gelöscht" · „er muss seine name am ende noch
 * mal angeben. Wenn jemand seriös ist dann macht er das. Die anderen brauchen wir nicht").
 *
 * ── DER EINE SCHRITT, DER AUS EINER VORSCHAU EINE SEITE MACHT ───────────────────────────────
 *
 * Bis hierher gehört die Seite niemandem: Sie trägt einen Behelfsnamen (`artist-7`), steht auf
 * `freigabe: "offen"` und nicht in der Übersicht. Hier bekommt sie einen Besitzer — und damit
 * seinen Namen in der Adresse, seine Mail für die Links und ihren Platz auf lakatosbandi.com.
 *
 * ── DIE ADRESSE ZIEHT MIT UM ────────────────────────────────────────────────────────────────
 *
 * Der Umzug ist der Grund, warum wir ihn vorher nicht nach dem Namen fragen mussten
 * (lib/kuenstler-umzug.ts). Scheitert er, wird NICHTS bestätigt: Lieber bleibt die Seite unter
 * ihrem Behelfsnamen und er versucht es noch einmal, als dass er eine Bestätigung sieht, hinter
 * der eine halb umgezogene Seite steht.
 *
 * ── DER SCHLÜSSEL IST DER NACHWEIS ──────────────────────────────────────────────────────────
 *
 * Er hat ihn beim Anlegen bekommen und nur er kennt ihn. Ohne diese Prüfung könnte jeder, der
 * eine Behelfsadresse errät, eine fremde Seite auf seinen Namen umschreiben.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const kennung = str(b.mandant, 80);
  const m = kennung ? await mandantLesen(kennung) : null;
  if (!m || !istKuenstler(m)) return NextResponse.json({ ok: false }, { status: 404 });
  if (!schluesselStimmt(m.schluessel, str(b.k, 200))) return NextResponse.json({ ok: false }, { status: 403 });

  const name = str(b.name, 80).replace(/\s+/g, " ").trim();
  const mail = str(b.mail, 160).trim().toLowerCase();
  if (!name) return NextResponse.json({ ok: false, grund: "kein-name" }, { status: 400 });
  /* KEINE LEEREN TEILE (13.09.2026, siehe components/AgentChat.tsx): Ein doppelter Punkt kam
     hier durch, und die Links gingen an eine Adresse, die es nicht gibt. */
  if (!/^[^@\s.]+(\.[^@\s.]+)*@[^@\s.]+(\.[^@\s.]+)+$/.test(mail)) {
    return NextResponse.json({ ok: false, grund: "keine-adresse" }, { status: 400 });
  }

  /**
   * SCHON BESTÄTIGT? Dann nichts noch einmal tun. Ein zweiter Klick auf „Behalten" — aus
   * Ungeduld, über den Zurück-Knopf, aus einem doppelt geöffneten Fenster — dürfte weder eine
   * zweite Seite anlegen noch eine zweite Mail auslösen.
   */
  if (m.freigabe === "frei" && String(m.name ?? "").trim()) {
    return NextResponse.json({ ok: true, kennung, url: kuenstlerUrl(kennung), schon: true });
  }

  /**
   * ── NICHTS GEHT OHNE DEN OWNER ONLINE (Owner 14.09.2026: „jemand kann hier pornografie posten
   * und geht sofort online" · „ich muss es freigeben") ────────────────────────────────────────
   *
   * HIER STAND `freigabe: "frei", portal: true` — die Seite war mit diesem Aufruf öffentlich und
   * stand in der Übersicht. Jeder Fremde konnte damit in zwei Minuten ein beliebiges Bild unter
   * einem beliebigen Namen auf lakatosbandi.com stellen. Der Owner ist der Herausgeber; die
   * Haftung dafür liegt bei ihm, nicht beim Hochladenden.
   *
   * `bildPruefen` läuft weiterhin davor und weist Verbotenes ab — aber ein Filter ist kein
   * Ersatz für eine Entscheidung. Jetzt gilt: Die Seite gehört ihm, er sieht sie über seinen
   * Link, und sie ist NICHT in der Übersicht (`imPortalSichtbar` verlangt „frei" UND „portal").
   * Öffentlich wird sie erst durch den Klick des Owners (`api/versusforge-freigabe`).
   */
  const neu = await mandantUmziehen(kennung, name, {
    name,
    mail,
    freigabe: "offen" as const,
    portal: false,
  });

  if (!neu) {
    console.error("[portal-behalten] Umzug gescheitert, nichts bestätigt:", kennung, "→", name);
    return NextResponse.json({ ok: false, grund: "umzug" }, { status: 502 });
  }

  /* Frisch lesen: Der Umzug hat eine NEUE Datei geschrieben, und die Schlüssel darin sind
     dieselben — aber gelesen wird, was tatsächlich dasteht, nicht was ich annehme. */
  const fertig = await mandantLesen(neu);
  const schluessel = String(fertig?.schluessel ?? m.schluessel ?? "");
  const loeschSchluessel = String(fertig?.loeschSchluessel ?? m.loeschSchluessel ?? "");

  /* SEINE LINKS — Seite, Dashboard, Löschen. Erst jetzt, und erst hier stimmt der Satz
     „deine Seite ist online". */
  void linksPerPost({
    an: mail, mandant: neu, schluessel, loeschSchluessel,
    sprache: String(m.sprache ?? "ro"), kuenstler: true,
  }).catch(e => console.error("[portal-behalten] Post gescheitert", e));
  void anmeldeAlarm({
    betrieb: name, kennung: neu, mail, sprache: String(m.sprache ?? "ro"),
    hook: String(m.hook ?? ""), stil: "", bilder: 1,
  }).catch(e => console.error("[portal-behalten] Anmelde-Mail gescheitert", e));

  /* Und derselbe Freigabe-Link aufs Telefon — die Mail allein reichte dem Owner nicht
     (14.09.2026: „ich habe nichts bekommen"). */
  freigabeAufsTelefon({ kennung: neu, name, werke: (fertig?.werkNummern ?? m.werkNummern ?? []).length });

  void ereignisMerken(neu, name, "seiteBehalten");

  return NextResponse.json({
    ok: true,
    kennung: neu,
    url: `${kuenstlerUrl(neu)}?k=${encodeURIComponent(schluessel)}`,
  });
}
