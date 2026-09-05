import { NextResponse } from "next/server";
import { readKissLog, getSignedUrl } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DIE VIDEOS DIESES BESUCHERS — ohne Konto, ohne Anmeldung.
 *
 * Owner 02.09.2026: „Der User muss sein Video dort sehen. Es soll nicht springen. Dann
 * machst du hier eine neue Funktion ‚Meine Videos‘."
 *
 * WARUM NICHT DIE GALERIE DES HAUSES: `/my-gallery` gibt es, aber sie ist zweimal falsch für
 * diesen Besucher. Erstens braucht sie ein Konto — ein Bewerber, der aus einer Anzeige kommt,
 * hat keines und soll auch keines anlegen müssen. Zweitens trägt sie den Haus-Kopf: Wer auf
 * einer Seite mit der Marke des Kunden auf „Assets" tippt, stünde plötzlich unter
 * „LUXURYBANDIT" — genau der Sprung, der ein White-Label auffliegen lässt.
 *
 * DIE KENNUNG IST DAS GERÄT (`lb_visitor`), nicht die E-Mail. Sie steht ohnehin an jedem
 * Auftrag, sie entsteht ohne Zutun des Besuchers, und sie ist eine UUID — wer sie nicht hat,
 * rät sie nicht. Eine Abfrage nach E-Mail wäre hier gefährlich: Die Adresse eines Bewerbers
 * kennt man leicht, und dann läse jeder dessen Videos.
 *
 * NUR DIESES PRODUKT (`theme === "armee"`): Hat derselbe Browser vorher ein Kuss-Video
 * gemacht, hat das auf der Academy-Seite nichts zu suchen.
 *
 * NUR DAS LETZTE — UND DAS IST DER GANZE PUNKT (Owner 02.09.2026: „Es wird dort nur das
 * letzte Video angezeigt. Wenn jemand ein neues generiert, dann wird es überschrieben. Das
 * ist für öffentliche Displays konzipiert").
 *
 * Ein Bildschirm auf einer Messe oder im Beratungsbüro ist EIN Gerät für viele Menschen —
 * `lb_visitor` gehört dort nicht einer Person, sondern dem Aufsteller. Eine Liste würde
 * jedem Nächsten die Gesichter aller Vorherigen zeigen; das ist am öffentlichen Display kein
 * Schönheitsfehler, sondern ein Datenschutzproblem. Genau ein Video, das vom nächsten Lauf
 * überschrieben wird, löst beides: Wer gerade fertig ist, findet seines wieder, und wer
 * danach kommt, sieht nur noch sein eigenes.
 *
 * `laeuft` sagt, ob gerade eine Erzeugung offen ist (Foto da, Video noch nicht) — daran
 * blinkt der Chip in der Kopfzeile, solange gerechnet wird.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const device = String(searchParams.get("device") ?? "").trim();
  /* Ohne Kennung eine leere Liste, kein Fehler: Der erste Besucher hat noch keine, und die
     Seite soll dann „noch nichts da" zeigen statt einer Störung. */
  if (!device || device.length < 8) return NextResponse.json({ video: null, laeuft: false });

  const alle = await readKissLog();
  /* `readKissLog` liefert die neuesten zuerst (der Anlage-Zweig stellt jeden neuen Eintrag
     vorn hinein) — das erste Treffer-Element ist also das jüngste. Trotzdem nach Zeit
     sortiert, damit die Reihenfolge nicht an einer Eigenschaft des Schreibwegs hängt. */
  const meine = alle
    .filter(e => e.theme === "armee" && e.device === device)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  const fertig = meine.find(e => !!e.videoUrl);
  /* Offen heisst: Foto liegt da, Video noch nicht — und der Auftrag ist jung genug, dass er
     wirklich noch laufen kann. Ohne die Frist bliebe ein abgebrochener Lauf für immer als
     „läuft gerade" stehen und der Chip blinkte bis in alle Ewigkeit. */
  const frisch = Date.now() - 10 * 60 * 1000;
  const laeuft = meine.some(e => !e.videoUrl && !!e.personPath && Date.parse(e.createdAt) > frisch);

  const video = fertig ? {
    id: fertig.id,
    wann: fertig.createdAt,
    einsatz: fertig.look ?? "",
    vorname: fertig.empfaenger ?? "",
    videoUrl: fertig.videoUrl ?? "",
    /* Das erzeugte Bild ist das Poster — es entsteht in derselben Kette und liegt immer vor
       dem Video vor (Skill `card`: nie ein Video ohne Poster). */
    poster: fertig.imagePath ? await getSignedUrl(fertig.imagePath, 60 * 60 * 24 * 365).catch(() => "") : "",
  } : null;

  return NextResponse.json({ video, laeuft });
}
