import { NextResponse } from "next/server";
import { leseDavid } from "@/lib/david-store";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSellerFromRequest } from "@/lib/supabase-auth-server";
import { readKissLog } from "@/lib/try-this-look-store";
import { BESITZ_COOKIE, besitzHinzufuegen } from "@/lib/lebenslauf-besitz-cookie";
import { ticketKennung } from "@/lib/david-rueckkehr";

export const runtime = "nodejs";

/**
 * WEM DER BERICHT GEHÖRT — UND WIE DER BROWSER ES BEWEIST.
 *
 * Owner 28.08.2026, nach seiner Frage „auch bei der Analyse? kann das jeder sehen?" und der
 * Antwort darauf: „ok aber darf niemand sehen nur er" · „er kann das nicht weitergeben".
 *
 * WAS VORHER GALT: `/david/<id>` las die Sitzung und zeigte sie. Keine Prüfung — wer die
 * Adresse hatte, las den ganzen Bericht. Und darin steht mehr als in der Bewerbung: die
 * Stelle, auf die er sich bewirbt, sein jetziger Arbeitgeber, die Schwachstellen seiner
 * Unterlagen und Dinge, die er im Gespräch erzählt und BEWUSST nicht in seine Bewerbung
 * geschrieben hat. Landet der Link bei seinem heutigen Chef, ist das kein peinlicher Moment,
 * sondern ein Schaden.
 *
 * WARUM EIN KEKS UND KEIN PASSWORT: Ein Passwort wandert mit, sobald es einmal jemand
 * weitergibt — und genau das soll nicht möglich sein („er kann das nicht weitergeben"). Ein
 * Keks bleibt im Browser des Besitzers; kopiert jemand den Link und schickt ihn weiter,
 * öffnet er beim Empfänger nichts. Der Besitzer merkt davon nichts: Er tippt auf seine
 * Kachel und sieht seinen Bericht.
 *
 * DERSELBE KEKS WIE BEI DER BEWERBUNG (`lb_besitz`, signiert): Sitzung, Auftrag und
 * Lebenslauf-Profil tragen dieselbe Kennung — ein Eintrag deckt beides ab. Zwei Kekse für
 * einen Vorgang wären die nächste Fehlerquelle.
 *
 * EIN NEIN WIRD NICHT BEGRÜNDET (wie in /api/lebenslauf-besitz): Für einen Fremden soll
 * nicht unterscheidbar sein, ob es die Sitzung nicht gibt oder ob sie ihm nur nicht gehört.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const id = String(body.id ?? "").trim().slice(0, 80);
  const device = String(body.device ?? "").trim().slice(0, 80);
  if (!id) return NextResponse.json({ darf: false });

  const sitzung = await leseDavid(id).catch(() => null);
  if (!sitzung) return NextResponse.json({ darf: false });

  /**
   * DAS TICKET AUS SEINER MAIL (Owner 29.08.2026) — der vierte Weg, und der einzige, der
   * über Geräte hinweg trägt.
   *
   * Die Mail geht an die Adresse, die er selbst angegeben hat; wer sie im Postfach hat, ist
   * der Besitzer. Ohne diesen Weg führte der Link aus unserer eigenen Mail auf einem zweiten
   * Gerät nur vor die verschlossene Tür.
   *
   * ER STEHT VOR ADMIN, WEIL ER DER BILLIGSTE IST: reine Rechenarbeit, kein Netzweg.
   */
  const ticket = String(body.ticket ?? "").trim().slice(0, 200);
  let darf = !!ticket && ticketKennung(ticket) === id;
  if (!darf) darf = await isAdminRequest(request).catch(() => false);
  if (!darf) {
    const mail = await getSellerFromRequest(request)
      .then(k => String(k?.email ?? "").trim().toLowerCase())
      .catch(() => "");
    if (mail && mail === String(sitzung.email ?? "").trim().toLowerCase()) darf = true;
  }
  if (!darf && device) {
    if (sitzung.device && sitzung.device === device) darf = true;
    else {
      /* Der Auftrag im Kiss-Log kennt das Gerät ebenfalls — er entsteht mit dem Lead und
         überlebt, falls die Sitzung ihr `device` nie bekommen hat. */
      try {
        const e = (await readKissLog()).find(x => x.id === id);
        if (e?.device && e.device === device) darf = true;
      } catch { /* ohne Log entscheidet der Rest */ }
    }
  }
  if (!darf) return NextResponse.json({ darf: false });

  const vorher = request.headers.get("cookie")?.match(new RegExp(`${BESITZ_COOKIE}=([^;]+)`))?.[1] ?? "";
  const res = NextResponse.json({ darf: true });
  res.cookies.set(BESITZ_COOKIE, besitzHinzufuegen(decodeURIComponent(vorher), id), {
    httpOnly: true,          // kein Zugriff aus dem Seiten-Skript
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  return res;
}
