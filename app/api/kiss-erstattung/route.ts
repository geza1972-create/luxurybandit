import { NextResponse } from "next/server";
import { readKissLog, writeKissLog, guthabenAufladen } from "@/lib/try-this-look-store";
import { geschenkPreisCents } from "@/lib/pricing";
import { isAdminRequest } from "@/lib/admin-auth";
import { notifyAdminWhatsApp } from "@/lib/notify-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GELD ZURUECK, WENN DAS VIDEO UNBRAUCHBAR IST (Owner 03.08.2026, zu einem Lauf, in dem das
 * Set ueber der Kleidung der Kundin lag: „hier gehört eigentlich ein Refund").
 *
 * ER HAT RECHT, UND ZWAR AUS EINEM GRUND, DER UEBER DEN EINZELFALL HINAUSGEHT: Der Kunde hat
 * bezahlt und geliefert bekommen, was das Modell hergab — nicht, was wir versprochen haben.
 * Zwischen „technisch erzeugt" und „brauchbar" liegt bei erzeugten Videos ein Abstand, den
 * niemand vorher kennt. Wer diesen Abstand dem Kunden aufbuerdet, verkauft ein Los, kein
 * Geschenk. Und ein Los kauft man nur einmal.
 *
 * WARUM DER KUNDE ENTSCHEIDET, NICHT WIR: Ob ein Video „gut" ist, kann keine Pruefung
 * feststellen — das Modell haelt sein Ergebnis fuer korrekt, der Server sieht ein fertiges
 * MP4. Nur der Mensch davor sieht, dass sie zwei Oberteile uebereinander traegt.
 *
 * ANGEFRAGT, NICHT GENOMMEN (Owner 05.08.2026: „die können eventuell Rückerstattung
 * anfordern, aber ich muss es freigeben").
 *
 * Bis hierher zahlte diese Route SOFORT aus — zwei Tipps, und das Guthaben war zurueck. Das
 * war richtig, solange ein Video 1,49 € kostete: Der Missbrauch war billiger als die Pruefung.
 * Bei {once} kippt die Rechnung, und der Owner will die Entscheidung selbst treffen. Der
 * Nebeneffekt ist der wertvollere: Wer weiss, dass ein Mensch draufschaut, fordert nicht aus
 * Gewohnheit zurueck — und wer wirklich ein kaputtes Video hat, wartet die paar Stunden gern.
 *
 * ZWEI WEGE DURCH DIESELBE ROUTE:
 *   POST { genId }                      → der Kunde FRAGT AN. Nichts wird gebucht.
 *   POST { genId, freigeben: true }     → der OWNER gibt frei. Erst hier wandert Guthaben.
 * Die Freigabe verlangt `isAdminRequest`; ohne sie ist der zweite Weg nicht erreichbar, egal
 * was ein Browser schickt.
 *
 * WAS DEN MISSBRAUCH BEGRENZT:
 *   - EINMAL je Auftrag (`erstattetAm` am Eintrag, plus `redeemed`-Liste im Guthaben).
 *   - Nur wer BEZAHLT hat. Ein gescheiterter Lauf wird ohnehin nie abgebucht.
 *   - Das Guthaben wandert zurueck, kein Geld: Es bleibt im Haus, und der naechste Versuch
 *     kostet ihn nichts extra. Genau das will man — er soll es NOCH einmal versuchen.
 *
 * Der Betrag ist der des Themas, nicht ein pauschaler: Ein Tanz kostet 3,99, ein Kuss 1,49.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { genId?: string; email?: string; grund?: string; freigeben?: boolean };
  const genId = String(body.genId ?? "").trim();
  if (!genId) return NextResponse.json({ error: "genId fehlt." }, { status: 400 });

  const log = await readKissLog();
  const eintrag = log.find(x => x.id === genId) as
    | (Record<string, unknown> & { paid?: boolean; videoUrl?: string; theme?: string; email?: string; paidEmail?: string })
    | undefined;
  if (!eintrag) return NextResponse.json({ error: "Auftrag nicht gefunden." }, { status: 404 });

  const adresse = String(eintrag.paidEmail || eintrag.email || body.email || "").trim().toLowerCase();
  if (!eintrag.paid || !adresse) {
    return NextResponse.json({ error: "Für diesen Auftrag wurde nichts abgebucht." }, { status: 400 });
  }
  /**
   * ERST NACH DEM VIDEO (Owner 05.08.2026: „er kann erst nach der Video-Erstellung das Geld
   * anfordern").
   *
   * Bis hierher genügte „bezahlt". Damit hätte jemand nach dem BILD zurückfordern können —
   * also mitten im Lauf, bevor der teure Teil überhaupt gemacht ist. Das ist keine Erstattung,
   * das ist ein Rückzieher auf halber Strecke, und er kostet uns die Erzeugung.
   *
   * Fehlt das Video, weil der Lauf gescheitert ist, gibt es hier ohnehin nichts zu erstatten:
   * Ein gescheiterter Lauf wird nie abgebucht.
   */
  if (!String((eintrag as { videoUrl?: string }).videoUrl ?? "").trim()) {
    return NextResponse.json({ error: "Erstattung geht erst, wenn das Video fertig ist." }, { status: 400 });
  }
  if ((eintrag as { erstattetAm?: string }).erstattetAm) {
    return NextResponse.json({ ok: true, schon: true });
  }

  const thema = String(eintrag.theme || "kiss");
  /**
   * DER BETRAG KOMMT AUS DERSELBEN QUELLE WIE DIE KASSE (10.08.2026, als die Geschenke auf
   * 4,99 € fielen). Hier stand eine eigene Liste: Tanz und Geburtstag bekamen POLEDANCE_CENTS,
   * alles andere ONCE_CENTS. Nach dem Preisschnitt hätte ein Kuss-Käufer damit 15 € zurück
   * bekommen für ein Video, das 4,99 € gekostet hat — dreimal so viel, wie er bezahlt hat.
   * Zwei Stellen mit demselben Wissen über denselben Preis; `geschenkPreisCents` ist die eine.
   */
  const cents = geschenkPreisCents(thema);

  type Antrag = { erstattungAngefragt?: string; erstattungGrund?: string; erstattetAm?: string };
  const e = eintrag as Antrag;

  /**
   * WEG 1 — DER KUNDE FRAGT AN. Es wird NICHTS gebucht, nur vermerkt und gemeldet.
   *
   * Zweimal anfragen aendert nichts: Der erste Zeitstempel bleibt stehen, damit die Liste
   * beim Owner nicht wandert und er sieht, seit wann jemand wartet.
   */
  if (!body.freigeben) {
    if (!e.erstattungAngefragt) {
      e.erstattungAngefragt = new Date().toISOString();
      e.erstattungGrund = String(body.grund ?? "").trim().slice(0, 400) || undefined;
      await writeKissLog(log).catch(() => { /* die Meldung unten geht trotzdem raus */ });
      /* Die Meldung ist der eigentliche Mechanismus: Ein Vermerk, den niemand liest, ist
         dasselbe wie kein Vermerk. Scheitert der Versand, bleibt der Vermerk stehen. */
      notifyAdminWhatsApp(
        [`Rückerstattung angefragt — ${thema} · ${(cents / 100).toFixed(2)} €`,
         `Auftrag: ${genId}`, `Adresse: ${adresse}`,
         e.erstattungGrund ? `Grund: ${e.erstattungGrund}` : ""].filter(Boolean).join("\n"),
      );
    }
    return NextResponse.json({ ok: true, angefragt: true, seit: e.erstattungAngefragt });
  }

  /**
   * WEG 2 — DER OWNER GIBT FREI. Nur mit Admin-Nachweis; ohne ihn ist hier Schluss, und zwar
   * mit 403 statt mit einer stillen Nichtbuchung: Ein Weg, der scheinbar funktioniert, aber
   * kein Geld bewegt, ist schlimmer als eine klare Absage.
   */
  if (!(await isAdminRequest(request).catch(() => false))) {
    return NextResponse.json({ error: "Nur der Betreiber kann freigeben." }, { status: 403 });
  }

  /* Der Schluessel haengt am Auftrag: Zweimal dieselbe Anfrage — der Browser wiederholt gern —
     zahlt trotzdem nur einmal zurueck. */
  const r = await guthabenAufladen(adresse, `erstattung-${genId}`, cents);
  if (!r.granted) return NextResponse.json({ ok: true, schon: true, cents: r.cents });

  (eintrag as { erstattetAm?: string }).erstattetAm = new Date().toISOString();
  await writeKissLog(log).catch(() => { /* die Gutschrift steht; der Vermerk holt der naechste Lauf nach */ });
  return NextResponse.json({ ok: true, erstattet: cents, cents: r.cents });
}
