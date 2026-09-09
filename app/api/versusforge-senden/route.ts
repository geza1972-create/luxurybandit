import { NextResponse } from "next/server";
import { str } from "@/lib/agent-modell";
import { mandantLesen } from "@/lib/versusforge-mandanten";
import { linksPerPost } from "@/lib/versusforge-links-post";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SENDEN UND LÖSCHLINK — beides gegen eine E-Mail-Adresse (Owner 09.09.2026: „oder besser nur
 * senden und löschen" · „für beide eine E-Mail angeben").
 *
 * WARUM DIE ADRESSE DIE PRÜFUNG IST: Die Anzeigen-Seite ist offen — auf ihr steht nichts
 * Geheimes. Ein Knopf, der von dort aus ohne weiteres löscht oder Post verschickt, wäre
 * trotzdem falsch: Die Adresse des Trichters ist ratbar. Wer die Mail bekommen will, muss
 * also die Adresse kennen, mit der der Trichter angelegt wurde.
 *
 * IMMER DIESELBE ANTWORT, egal ob sie stimmt. Ein „diese Adresse kennen wir nicht" verrät,
 * wem der Trichter gehört — und ein „ja, die stimmt" erst recht. Wer die richtige eingibt,
 * bekommt die Mail; wer eine falsche eingibt, bekommt denselben Satz und keine Mail.
 *
 * DER LÖSCHLINK GEHT IMMER AN DIE HINTERLEGTE ADRESSE, nie an die eingetippte. Sonst könnte
 * jemand mit geratenem Trichternamen und eigener Adresse den Schlüssel an sich schicken.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try { body = (await request.json()) as Record<string, unknown>; } catch { /* leer */ }

  const kennung = str(body.mandant, 40);
  const eingetippt = str(body.mail, 200).trim().toLowerCase();
  const nurLoeschen = body.was === "loeschen";

  if (!eingetippt.includes("@") || eingetippt.length < 5) {
    return NextResponse.json({ error: "Bitte eine E-Mail-Adresse angeben." }, { status: 400 });
  }

  const m = await mandantLesen(kennung);
  const stimmt = !!m && String(m.mail ?? "").trim().toLowerCase() === eingetippt;

  if (stimmt && m) {
    await linksPerPost({
      an: m.mail,
      mandant: kennung,
      /* Der Dashboard-Schlüssel reist in derselben Mail: Ohne ihn findet er die Seite nie,
         auf der er Impressum und Datenschutz einträgt — und ohne die nimmt sein Trichter
         keine einzige Anfrage an. */
      schluessel: m.schluessel,
      loeschSchluessel: m.loeschSchluessel,
      /* Seine Sprache — die Meta-Anleitung ist der Teil, den er wirklich abarbeiten muss. */
      sprache: m.sprache,
      nurLoeschen,
    }).catch(e => console.error("[versusforge-senden] Versand fehlgeschlagen", e));
  }

  /* Dieselbe Antwort in beiden Fällen — siehe oben. */
  return NextResponse.json({ ok: true });
}
