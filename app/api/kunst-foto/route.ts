import { NextResponse } from "next/server";
import { kundenbildAblegen } from "@/lib/lakatosbandi-kundenbild";
import { mandantOeffentlich } from "@/lib/versusforge-mandanten";
import { bildPruefen } from "@/lib/versusforge-moderation";

/**
 * ── DAS FOTO GEHT VOR DER KASSE AUF DEN SERVER (Owner 19.09.2026: „jetzt habe ich wirklich
 * bezahlt mit Stripe eine Generierung und ist nichts passiert") ──────────────────────────────
 *
 * DER FEHLER, der ihn echtes Geld gekostet hat: Stripes eingebettete Kasse schickt den Browser
 * nach der Zahlung auf die Rückkehr-Adresse. Sein Foto lebte nur im Browser — der Seitenwechsel
 * löschte es. Er kam auf ein leeres Blatt zurück, und es gab nichts mehr zu erzeugen.
 *
 * `ui_mode: "embedded"` mit `redirect_on_completion: "never"` wäre die Abkürzung gewesen; Stripe
 * antwortet darauf seit Kurzem mit `400 · no longer supported`. Also gilt die Hausregel
 * [[paid-jobs-must-survive-the-browser]]: Was bezahlt wird, liegt VORHER auf dem Server.
 *
 * Diese Route nimmt das Foto und gibt eine Kennung zurück. Die reist durch Stripe und holt den
 * Auftrag auf der anderen Seite wieder ab.
 *
 * ── `stil: false` — NOCH IST NICHTS ERZEUGT ─────────────────────────────────────────────────
 *
 * Der Zettel sagt bis hierher nur „das ist das Foto des Kunden". Erst die bezahlte Erzeugung
 * setzt `stil: true`, und daran hängen Lizenz, Gratis-Datei und der Name auf dem Blatt. Ein
 * blosser Upload darf das nicht auslösen.
 *
 * ── GEPRÜFT WIRD HIER SCHON ─────────────────────────────────────────────────────────────────
 *
 * Dieselbe Moderation wie beim Künstler-Upload: Was verboten ist, wird gar nicht erst abgelegt.
 * Sonst läge es auf unserem Speicher, bis jemand zahlt.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const foto = String(b.foto ?? "");
  const mandant = String(b.mandant ?? "").replace(/[^a-z0-9-]/gi, "").slice(0, 80);
  const werk = String(b.werk ?? "standard").slice(0, 10) || "standard";
  const titel = String(b.titel ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  const satz = String(b.satz ?? "").replace(/\s*\n\s*/g, " ").trim().slice(0, 400);
  /**
   * ── DIE ADRESSE MUSS HIER MIT (Owner 19.09.2026: „keine Email") ────────────────────────────
   *
   * Sie steht im Fenster VOR dem Knopf und lebt bis dahin nur im Browser. Stripes Kasse leitet
   * IMMER weiter (`ui_mode: "embedded_page"`), und die Weiterleitung löscht den Browserzustand —
   * die Adresse wäre danach weg, und zwar bei JEDEM echten Kauf, nicht nur ausnahmsweise. Dann
   * bekäme niemand je die Mail mit seinem bezahlten Blatt.
   *
   * Titel und Satz reisen aus demselben Grund schon hier mit. Die Adresse gehörte von Anfang an
   * dazu ([[paid-jobs-must-survive-the-browser]]).
   */
  const mail = String(b.mail ?? "").trim().slice(0, 200);

  if (!foto.startsWith("data:image/") || !mandant) {
    return NextResponse.json({ ok: false, grund: "unvollstaendig" }, { status: 400 });
  }
  const m = await mandantOeffentlich(mandant);
  /* Nur bei den Generator-Künstlern des Hauses — dieselbe Grenze wie in `api/poster-kunst`. */
  if (m?.kunstAn !== true) return NextResponse.json({ ok: false, grund: "aus" }, { status: 503 });

  const teil = foto.split(",", 2)[1] ?? "";
  const urteil = await bildPruefen({ apiKey: process.env.OPENAI_API_KEY?.trim() ?? "", bild: foto });
  if (urteil.urteil === "verboten") {
    return NextResponse.json({ ok: false, grund: "abgelehnt" }, { status: 422 });
  }
  if (!teil) return NextResponse.json({ ok: false, grund: "unvollstaendig" }, { status: 400 });

  const id = await kundenbildAblegen(foto, {
    mandant, werk, stil: false,
    ...(titel ? { titel } : {}),
    ...(satz ? { satz } : {}),
    ...(mail.includes("@") ? { mail } : {}),
  }).catch(() => null);

  if (!id) return NextResponse.json({ ok: false, grund: "speicher" }, { status: 502 });
  return NextResponse.json({ ok: true, id });
}
