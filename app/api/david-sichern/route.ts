import { NextResponse } from "next/server";
import { leseDavid, schreibeDavid } from "@/lib/david-store";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSellerFromRequest } from "@/lib/supabase-auth-server";
import { readKissLog, writeKissLog } from "@/lib/try-this-look-store";
import { BESITZ_COOKIE, besitzImCookie } from "@/lib/lebenslauf-besitz-cookie";
import { berichtMailSchicken } from "@/lib/david-mail";

export const runtime = "nodejs";

/**
 * „SCHICK MIR DIE ANALYSE" — DIE ADRESSE RICHTIGSTELLEN, WENN ES ZÄHLT.
 *
 * Owner 29.08.2026, nachdem er mein Argument zerlegt hat: „Jemand, der seine falsche E-Mail
 * gibt, kommt nie zurück." Genau so ist es — der Rückläufer sagt UNS, dass die Adresse tot
 * ist, aber wir haben dann keinen Weg mehr zu ihm. Wissen ohne Kanal ist wertlos.
 *
 * DESHALB NICHT VORNE EIN TOR, SONDERN HINTEN EINE BEDINGUNG: Ansehen darf er den Bericht
 * frei — er hat zehn Minuten dafür geredet. Ihn BEHALTEN kostet eine funktionierende
 * Adresse. Wer zum Ausprobieren eine Fantasie-Adresse eingetippt hat, sieht sie in dem
 * Moment vor sich stehen, in dem er das Ergebnis will — und korrigiert sie selbst.
 *
 * WER DARF DAS: nur der Besitzer (Keks, Konto, Gerät oder Admin). Eine Route, die jedem
 * erlaubt, die Adresse einer fremden Sitzung zu ändern, wäre ein Werkzeug, um sich fremde
 * Lebensläufe zuschicken zu lassen.
 *
 * DER AUFTRAG ZIEHT MIT: Im Auftragsbuch stand die Adresse bisher EINMAL geschrieben und
 * änderte sich nie wieder — Quittung und Lieferung wären weiter an die tote Adresse
 * gegangen.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const id = String(body.id ?? "").trim().slice(0, 80);
  const device = String(body.device ?? "").trim().slice(0, 80);
  const email = String(body.email ?? "").trim().slice(0, 200).toLowerCase();
  if (!id) return NextResponse.json({ error: "Kennung fehlt." }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Diese Adresse sieht nicht vollständig aus." }, { status: 400 });
  }

  const sitzung = await leseDavid(id).catch(() => null);
  if (!sitzung) return NextResponse.json({ error: "Diese Sitzung kenne ich nicht." }, { status: 404 });

  /* Keks → Konto → Gerät → Admin. Der Keks steht vorn, weil er auf der Ergebnis-Seite
     ohnehin schon sitzt und keinen Netzweg kostet. */
  const keks = request.headers.get("cookie")?.match(new RegExp(`${BESITZ_COOKIE}=([^;]+)`))?.[1] ?? "";
  let darf = besitzImCookie(decodeURIComponent(keks), id);
  if (!darf) {
    const mail = await getSellerFromRequest(request)
      .then(k => String(k?.email ?? "").trim().toLowerCase())
      .catch(() => "");
    if (mail && mail === String(sitzung.email ?? "").trim().toLowerCase()) darf = true;
  }
  if (!darf && device && sitzung.device && sitzung.device === device) darf = true;
  if (!darf) darf = await isAdminRequest(request).catch(() => false);
  if (!darf) return NextResponse.json({ error: "Das ist nicht deine Analyse." }, { status: 403 });

  const jetzt = new Date().toISOString();
  /* `berichtMailAt` wird bewusst zurückgesetzt: Der Stempel verhindert das doppelte Klingeln
     an DIESELBE Adresse. Hier ist es eine andere — und genau darum geht es. */
  await schreibeDavid({ ...sitzung, email, berichtMailAt: jetzt, aktualisiertAm: jetzt });

  /* Der Auftrag im Auftragsbuch trägt dieselbe Adresse — sonst gehen Quittung und Lieferung
     weiter ins Leere. */
  try {
    const eintraege = await readKissLog();
    const i = eintraege.findIndex(e => e.id === id);
    if (i >= 0 && eintraege[i].email !== email) {
      const kopie = [...eintraege];
      kopie[i] = { ...kopie[i], email };
      await writeKissLog(kopie);
    }
  } catch { /* die Mail ist wichtiger als die Buchhaltung */ }

  /* SIE MUSS WIRKLICH RAUSGEHEN — anders als sonst wird hier auf den Versand gewartet: Er
     hat gerade darum gebeten und schaut auf den Knopf. Ein stilles Scheitern wäre genau der
     Fehler, den diese Zeile beheben soll. */
  const origin = new URL(request.url).origin;
  const ok = await berichtMailSchicken({
    an: email, vorname: sitzung.vorname, sitzungId: id, origin,
    sprache: sitzung.sprache, jobTitel: sitzung.jobTitel,
  }).catch(() => false);

  if (!ok) return NextResponse.json({ error: "Die Mail ging nicht raus. Versuch es bitte gleich noch einmal." }, { status: 502 });
  return NextResponse.json({ ok: true, email });
}
