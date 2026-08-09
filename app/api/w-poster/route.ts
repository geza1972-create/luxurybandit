import { readKissLog, getSignedUrl } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DAS POSTER DES GETEILTEN WERKS — als OEFFENTLICHE, STABILE Adresse.
 *
 * Owner 08.08.2026, mit Bild der WhatsApp-Vorschau: „es wird statt mein Poster das
 * allgemeine Poster versendet." Bis dahin zeigte jede Vorschau das Katalogbild.
 *
 * WARUM ES DIESE ROUTE BRAUCHT und die Metadaten nicht einfach das Bild verlinken:
 * Unsere Bilder liegen in einem privaten Eimer und werden nur SIGNIERT ausgeliefert —
 * so ein Link laeuft nach Stunden ab. Eine Vorschau, die in einem Chat steht, muss aber
 * Wochen spaeter noch laden (und WhatsApps Abholer bringt keine Anmeldung mit). Diese
 * Route ist die stabile Adresse davor: Sie holt das Bild bei jedem Abruf frisch.
 *
 * DIE FREIGABE IST DIE GRENZE, und sie ist streng: Geliefert wird NUR das Poster eines
 * Werks, das der Besitzer selbst geteilt hat (`sharedAt`) — und nur `imagePath`, also das
 * ERZEUGTE Bild. Das hochgeladene Kundenfoto (`personPath`) verlaesst diese Route nie.
 * Wer eine fremde Kennung raet, bekommt dasselbe wie ein Fremder auf der Werk-Seite:
 * nichts (404). So bleibt die alte Regel „die Karte gehoert hinter den Klick" fuer alles
 * Ungeteilte in Kraft.
 */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!id) return new Response("Not found", { status: 404 });
  try {
    const eintrag = (await readKissLog()).find(e => e.id === id);
    /**
     * DER FREIGABE-STEMPEL DARF HIER NICHT MEHR ENTSCHEIDEN (Owner 09.08.2026, zum ZWEITEN
     * Mal: „dann bekommt der Empfänger schon wieder das falsche Poster in der
     * WhatsApp-Nachricht").
     *
     * Der Stempel wird gesetzt, WÄHREND das Teilen-Fenster aufgeht — er darf nicht
     * abgewartet werden, sonst verwirft Safari die Geste. WhatsApp holt die Vorschau aber
     * sofort und trifft dann auf einen Eintrag ohne Stempel: allgemeines Katalogbild. Und
     * WhatsApp MERKT sich diese Vorschau — auch das zweite Teilen zeigt sie wieder.
     *
     * Was den Schutz trägt, ist ohnehin nicht der Stempel, sondern zweierlei: Die Kennung
     * ist eine Zufallsnummer, die niemand rät, und ausgeliefert wird AUSSCHLIESSLICH
     * `imagePath` — das ERZEUGTE Bild. Das hochgeladene Kundenfoto (`personPath`) verlässt
     * diese Route nach wie vor nie.
     */
    if (!eintrag?.imagePath) return new Response("Not found", { status: 404 });
    const url = await getSignedUrl(eintrag.imagePath).catch(() => "");
    if (!url) return new Response("Not found", { status: 404 });
    const bild = await fetch(url);
    if (!bild.ok) return new Response("Not found", { status: 404 });
    return new Response(bild.body, {
      headers: {
        "content-type": bild.headers.get("content-type") || "image/jpeg",
        /* Die Abholer der Messenger cachen ohnehin; eine Stunde reicht, damit ein
           erneutes Teilen nicht am alten Bild haengt. */
        "cache-control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
