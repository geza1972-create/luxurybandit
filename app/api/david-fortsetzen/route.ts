import { NextResponse } from "next/server";
import { leseDavid } from "@/lib/david-store";
import { ticketKennung } from "@/lib/david-rueckkehr";
import { BESITZ_COOKIE, besitzHinzufuegen } from "@/lib/lebenslauf-besitz-cookie";

export const runtime = "nodejs";

/**
 * „WEITERMACHEN" — DAS TICKET AUS DER MAIL EINLÖSEN (Owner 29.08.2026: „ja, und dann kann er
 * weitermachen mit Link in der E-Mail. Bitte nicht auf einer allgemeinen Seite schicken").
 *
 * WAS DIESE ROUTE LIEFERT: genau so viel, dass der Trichter dort wieder aufmacht, wo er
 * stehen geblieben ist — und keinen Satz mehr. Kein Bericht, keine Antworten aus dem
 * Gespräch, keine Zusammenfassung des Lebenslaufs. Wer den Bericht sehen will, geht auf die
 * Bericht-Seite; die prüft ihren Besitz selbst.
 *
 * SIE SETZT DEN BESITZ-KEKS: Danach gilt dieser Browser als seiner — sonst müsste er das
 * Ticket bei jedem weiteren Schritt erneut vorzeigen, und es stünde die ganze Zeit in der
 * Adresszeile.
 *
 * EIN NEIN WIRD NICHT BEGRÜNDET (wie in /api/david-besitz): Für einen Fremden soll nicht
 * unterscheidbar sein, ob es die Sitzung nicht gibt oder ob die Unterschrift falsch war.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const ticket = String(body.ticket ?? "").trim().slice(0, 200);
  const id = ticketKennung(ticket);
  if (!id) return NextResponse.json({ ok: false });

  const sitzung = await leseDavid(id).catch(() => null);
  if (!sitzung) return NextResponse.json({ ok: false });

  /**
   * WO ER STEHEN GEBLIEBEN IST — dieselbe Reihenfolge, in der der Trichter läuft, von hinten
   * gelesen. Der Bericht schlägt alles: Ist er fertig, gehört der Besucher nicht in den
   * Trichter, sondern auf seine Ergebnis-Seite.
   */
  const fragen = sitzung.fragen ?? [];
  const offene = fragen.find(f => !f.antwort);
  const ziel = sitzung.report ? "bericht"
    : fragen.length ? "gespraech"
    : (sitzung.jobText || sitzung.ohneStelle) ? "gespraech"
    : sitzung.cvBefund ? "job"
    : "cv";

  const res = NextResponse.json({
    ok: true,
    id,
    ziel,
    vorname: sitzung.vorname ?? "",
    email: sitzung.email ?? "",
    sprache: sitzung.sprache ?? "",
    cvPath: sitzung.cvPath ?? "",
    cvName: sitzung.cvName ?? "",
    rolle: sitzung.cvBefund?.rolle ?? "",
    schwerpunkte: sitzung.cvBefund?.schwerpunkte ?? [],
    layout: sitzung.cvBefund?.layout ?? "",
    cvFoto: sitzung.cvBefund?.foto ?? null,
    ohneStelle: sitzung.ohneStelle === true,
    jobTitel: sitzung.jobTitel ?? "",
    /* Die offene Frage im Wortlaut — ohne sie stünde er im Gespräch vor einem leeren Feld. */
    frage: offene?.frage ?? "",
    beantwortet: fragen.filter(f => f.antwort).length,
    gesamt: fragen.length,
  });

  const vorher = request.headers.get("cookie")?.match(new RegExp(`${BESITZ_COOKIE}=([^;]+)`))?.[1] ?? "";
  res.cookies.set(BESITZ_COOKIE, besitzHinzufuegen(decodeURIComponent(vorher), id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  return res;
}
