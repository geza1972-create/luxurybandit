import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { schreibeFirmenAnfrage, listeFirmenAnfragen, type FirmenAnfrage } from "@/lib/agenten-store";
import { isAdminRequest } from "@/lib/admin-auth";
import { sendEmail } from "@/lib/email-send";

export const runtime = "nodejs";

/* Dieselbe Zeile wie im Kontaktformular: Die Hausadresse steht in der Umgebung, nie im Text
   einer Seite (Hausregel [[keine-email-adresse-auf-der-seite]]). */
const HAUS = process.env.SMTP_USER?.trim() || "support@luxurybandit.com";

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * „TESTE MICH" — DIE ANFRAGE EINES UNTERNEHMENS (Owner 29.08.2026).
 *
 * DER LAUF SELBST KOSTET NICHTS: LB spricht hier nach festem Text, nicht über ein Modell.
 * Das ist kein Sparen an der falschen Stelle — der Ablauf ist immer derselbe (Was brauchst
 * du? Wer bist du? Welche Branche? Deine Adresse), und ein Modell könnte daran nur
 * abweichen. Bezahlt wird erst, wenn aus der Anfrage ein Auftrag wird.
 *
 * ERST SPEICHERN, DANN MELDEN: Die Mail ist der Wecker, die Ablage das Gedächtnis. Fällt der
 * Postausgang aus, liegt die Anfrage trotzdem da — sonst wäre ein Interessent verloren, ohne
 * dass es jemand merkt.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const email = str(body.email, 200).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Diese Adresse sieht nicht vollständig aus." }, { status: 400 });
  }

  /**
   * ZWEI TÜREN, EIN POSTFACH (Owner 31.08.2026): Der Chat auf der Startseite und das
   * Pilot-Formular auf `/recruiting` fragen Verschiedenes, aber es kommt dasselbe heraus —
   * ein Unternehmen, das etwas von uns will. Eine zweite Route hätte Ablage, Mailversand
   * und die Notfall-Antwort unten ein zweites Mal gebraucht; sie unterscheiden sich nur in
   * den Feldern und in der Betreffzeile.
   */
  const istRecruiting = str(body.art, 20) === "recruiting";
  const firma = str(body.firma, 160);
  const position = str(body.position, 200);
  if (istRecruiting && (!firma || !position)) {
    return NextResponse.json({ error: "Firma und Position brauche ich noch." }, { status: 400 });
  }

  const zielRoh = str(body.ziel, 20);
  const anfrage: FirmenAnfrage = {
    id: randomUUID(),
    erstelltAm: new Date().toISOString(),
    ...(istRecruiting ? { art: "recruiting" as const } : {}),
    ...(["kunden", "mitarbeiter", "neugier"].includes(zielRoh) ? { ziel: zielRoh as FirmenAnfrage["ziel"] } : {}),
    name: str(body.name, 120) || undefined,
    branche: str(body.branche, 160) || undefined,
    email,
    ...(firma ? { firma } : {}),
    ...(position ? { position } : {}),
    ...(str(body.stellenLink, 500) ? { stellenLink: str(body.stellenLink, 500) } : {}),
    anliegen: str(body.anliegen, 4000) || undefined,
    sprache: str(body.sprache, 5) || undefined,
    device: str(body.device, 80) || undefined,
  };

  const gespeichert = await schreibeFirmenAnfrage(anfrage).catch(() => false);

  const zeile = (k: string, v?: string) => v
    ? `<tr><td style="padding:4px 10px 4px 0;color:#888;font-size:13px;vertical-align:top">${esc(k)}</td><td style="padding:4px 0;font-size:14px"><b>${esc(v)}</b></td></tr>`
    : "";
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px">
    <p style="margin:0 0 4px;color:#888;font-size:12px;letter-spacing:2px"><b>${istRecruiting ? "LUXURYBANDIT · RECRUITING — PILOT-ANFRAGE" : "LUXURYBANDIT · ANFRAGE EINES UNTERNEHMENS"}</b></p>
    <h2 style="margin:0 0 12px;font-size:19px">${esc(anfrage.firma || anfrage.name || "Ohne Namen")}${!istRecruiting && anfrage.branche ? ` · ${esc(anfrage.branche)}` : ""}</h2>
    <table role="presentation" cellpadding="0" cellspacing="0">
      ${istRecruiting ? "" : zeile("Will", anfrage.ziel === "kunden" ? "Kunden" : anfrage.ziel === "mitarbeiter" ? "Mitarbeiter" : anfrage.ziel ? "Erst mal sehen, was David kann" : "")}
      ${zeile("Name", anfrage.name)}
      ${zeile("Firma", anfrage.firma)}
      ${zeile("Position", anfrage.position)}
      ${zeile("Stellenlink", anfrage.stellenLink)}
      ${istRecruiting ? "" : zeile("Branche", anfrage.branche)}
      ${zeile("Adresse", anfrage.email)}
      ${zeile("Sprache", anfrage.sprache)}
    </table>
    ${anfrage.anliegen ? `<p style="margin:14px 0 4px;color:#888;font-size:13px">Was er selbst geschrieben hat:</p>
      <div style="border-left:3px solid #f6cf51;padding:6px 0 6px 12px;font-size:14px;line-height:1.55;white-space:pre-wrap">${esc(anfrage.anliegen)}</div>` : ""}
    <p style="margin:16px 0 0;color:#888;font-size:12px">
      ${istRecruiting
        ? "Ihm wurde zugesagt, dass du dich persönlich meldest, um die Position und den Pilot zu besprechen."
        : "Er wartet auf Antwort innerhalb von 48 Stunden — das haben wir ihm zugesagt."}
      Direkt auf diese Mail antworten erreicht ihn.
      ${gespeichert ? "" : "<br><b style=\"color:#c00\">ACHTUNG: Die Ablage hat nicht funktioniert — diese Mail ist die einzige Spur.</b>"}
    </p>
  </div>`;

  /* `replyTo` ist der eigentliche Trick: Der Owner antwortet aus dem Postfach heraus, ohne
     die Adresse herauszusuchen. */
  const r = await sendEmail({
    to: HAUS,
    subject: istRecruiting
      ? `LB Recruiting — Pilot-Anfrage von ${anfrage.firma || anfrage.name || email}`
      : `LB Agenten — Anfrage von ${anfrage.name || anfrage.email}${anfrage.branche ? ` (${anfrage.branche})` : ""}`,
    html,
    replyTo: email,
    text: `${anfrage.name || ""} · ${anfrage.firma || anfrage.branche || ""} · ${email}\n${anfrage.position || ""}\n\n${anfrage.anliegen || ""}`,
  }).catch(() => ({ ok: false }));

  if (r?.ok && gespeichert) {
    await schreibeFirmenAnfrage({ ...anfrage, gemeldet: true }).catch(() => false);
  }

  /* SEIN JA GILT AUCH OHNE UNSERE POST: Die Anfrage liegt gespeichert vor. Ihm zu sagen „hat
     nicht geklappt", obwohl wir sie haben, würde ihn ein zweites Mal tippen lassen. */
  if (!gespeichert && !r?.ok) {
    return NextResponse.json({ error: "Das ging gerade nicht. Versuch es bitte gleich noch einmal." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

/** Die Liste für den Admin — dieselbe Prüfung wie überall im Haus. */
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  return NextResponse.json({ ok: true, anfragen: await listeFirmenAnfragen().catch(() => []) });
}
