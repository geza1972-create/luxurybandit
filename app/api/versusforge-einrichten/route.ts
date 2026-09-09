import { NextResponse } from "next/server";
import crypto from "crypto";
import { mandantLesen, mandantSpeichern } from "@/lib/versusforge-mandanten";
import { str } from "@/lib/agent-modell";

/**
 * EINRICHTEN — DER SCHRITT, OHNE DEN DER TRICHTER NICHTS SAMMELT (09.09.2026).
 *
 * DIE LÜCKE, DIE ER SCHLIESST: Ein Mandant entsteht aus dem Plan, und der Plan kennt keine
 * Adresse, keine Telefonnummer, kein Impressum. `app/api/versusforge-mandant/route.ts`
 * weist deshalb JEDE Anfrage mit 403 ab, solange Impressum und Datenschutz fehlen — richtig
 * so, aber bis heute gab es keinen einzigen Weg, sie einzutragen. Sein Trichter konnte
 * niemals eine Anfrage annehmen, und er hätte es erst gemerkt, wenn niemand anruft.
 *
 * DER SCHLÜSSEL IST DIE TÜR, KEIN KONTO. Jeder Mandant trägt seit dem Anlegen einen
 * `schluessel` (randomUUID). Er steht in seiner Mail, und wer ihn hat, darf einrichten und
 * die Anfragen lesen. Kein Passwort, keine Anmeldung — dieselbe Entscheidung wie überall
 * im Haus, wo ein Mensch genau eine Sache verwaltet.
 *
 * VERGLICHEN WIRD IN GLEICHBLEIBENDER ZEIT. Ein normaler Vergleich bricht beim ersten
 * falschen Zeichen ab; wer misst, wie lange die Antwort dauert, rät den Schlüssel Zeichen
 * für Zeichen. Bei einer Liste mit Namen und Telefonnummern ist das keine Theorie.
 *
 * WAS SICH ÄNDERN DARF, IST ABGEZÄHLT: die fünf Kontaktangaben. Hook, Karten, Knopftext und
 * Plan bleiben, was die Maschine erzeugt hat — sonst wäre diese Route ein Weg, den Inhalt
 * fremder Seiten zu überschreiben, sobald ein Schlüssel je durchsickert.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Gleichbleibende Zeit, und ein falscher Schlüssel darf nicht durch die Länge auffallen. */
function schluesselStimmt(soll: string, ist: string): boolean {
  if (!soll || !ist) return false;
  const a = Buffer.from(soll, "utf8");
  const b = Buffer.from(ist, "utf8");
  if (a.length !== b.length) return false;
  try { return crypto.timingSafeEqual(a, b); } catch { return false; }
}

/**
 * Eine Adresse, die im Browser aufgeht — und sonst nichts.
 *
 * NUR http UND https: `javascript:` in einem Link, den ein Fremder auf der Seite des
 * Mandanten anklickt, wäre eine fremde Anweisung in seinem Namen. Leer ist erlaubt, das
 * heisst „habe ich nicht".
 */
function adresseSauber(roh: string): string | null {
  const wert = roh.trim();
  if (!wert) return "";
  const mitSchema = /^https?:\/\//i.test(wert) ? wert : `https://${wert}`;
  try {
    const u = new URL(mitSchema);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch { return null; }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const kennung = str(body.mandant, 80);
  const k = str(body.k, 200);

  const m = await mandantLesen(kennung);
  /* Dieselbe Antwort, ob es den Trichter nicht gibt oder der Schlüssel falsch ist — sonst
     verrät die Fehlermeldung, welche Namen vergeben sind. */
  if (!m || !schluesselStimmt(m.schluessel, k)) {
    return NextResponse.json({ error: "Dieser Zugang stimmt nicht." }, { status: 403 });
  }

  const adresse = str(body.adresse, 200).trim();
  const telefon = str(body.telefon, 60).trim();
  const webUrl = adresseSauber(str(body.webUrl, 300));
  const impressumUrl = adresseSauber(str(body.impressumUrl, 300));
  const datenschutzUrl = adresseSauber(str(body.datenschutzUrl, 300));

  if (webUrl === null || impressumUrl === null || datenschutzUrl === null) {
    return NextResponse.json(
      { error: "Eine der Adressen sieht nicht aus wie eine Adresse. Beispiel: praxis-mueller.de/impressum" },
      { status: 400 },
    );
  }

  /**
   * `stand` WIRD HIER NICHT ANGEFASST — und das ist wichtig genug für einen eigenen Absatz.
   *
   * „scharf" heisst BEZAHLT (siehe `MandantAngaben`), nicht „eingerichtet". Wer hier den
   * Stand höbe, verschenkte das Dashboard an jeden, der ein Impressum einträgt.
   *
   * DAS SAMMELN HÄNGT OHNEHIN NICHT AM STAND, sondern direkt an den Pflichtangaben
   * (`app/api/versusforge-mandant/route.ts`, Schritt `abschluss`). Sobald Impressum und
   * Datenschutz stehen, nimmt der Trichter Anfragen an — lesen kann er sie trotzdem erst
   * mit dem Dashboard. Genau diese Trennung ist der Verkauf.
   */
  const bereit = !!impressumUrl && !!datenschutzUrl;

  const ok = await mandantSpeichern(kennung, {
    ...m,
    adresse,
    telefon,
    webUrl,
    impressumUrl,
    datenschutzUrl,
  });
  if (!ok) return NextResponse.json({ error: "Das ging gerade nicht. Bitte gleich noch einmal." }, { status: 502 });

  return NextResponse.json({ ok: true, bereit });
}
