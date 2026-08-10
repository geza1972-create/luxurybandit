import crypto from "crypto";
import { guthabenAufladen, readGuthabenCents } from "@/lib/try-this-look-store";
import { WERBE_GUTSCHRIFT_CENTS, eur } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DAS WERBEGESCHENK — bestehende Kunden bekommen Guthaben (Owner 05.08.2026: „auch meine
 * Kunden können das einlösen. Als Werbegeschenk. Wir werden ihre E-Mails eintragen automatisch.
 * Und wenn sie es öffnen, dann haben sie 3 Euro auf dem Konto").
 *
 * ZWEI DINGE SIND HIER ANDERS ALS IM ZURUF, UND BEIDE AUS EINEM HARTEN GRUND:
 *
 * 1. NICHT BEIM ÖFFNEN, SONDERN BEIM ANTIPPEN.
 *    „Öffnen" heisst technisch: das Zählpixel wird geladen (so misst es der Rundbrief,
 *    `/api/rundbrief-offen`). Daran darf kein Geld hängen. Gmail und Apple Mail holen sich die
 *    Bilder über ihre EIGENEN Server, oft schon bei der Zustellung und ohne dass ein Mensch die
 *    Mail je gesehen hat. Wir würden also an ALLE auszahlen, in der Sekunde des Versands, und
 *    niemand wüsste davon. Deshalb hängt die Gutschrift am KLICK — dann steht der Mensch auch
 *    auf einer Seite, die ihm sagt, was er bekommen hat.
 *
 * 2. DER LINK IST UNTERSCHRIEBEN.
 *    Ohne Unterschrift wäre `?e=beliebig@example.com` eine Geldpresse: Wer die Adresszeile
 *    versteht, schreibt sich beliebig viele Adressen und lädt sie mit unserem Geld auf. Der
 *    Schlüssel `t` ist ein HMAC über Adresse UND Kampagne — dasselbe Verfahren wie beim
 *    Zustimmungs-Link der Models (`app/api/curator-confirm`). Er gilt nur für die eine Adresse,
 *    an die wir geschrieben haben.
 *
 * EINMAL JE ADRESSE UND KAMPAGNE. `guthabenAufladen` ist idempotent über seinen zweiten
 * Parameter; wir geben ihm `werbung-<kampagne>-<adresse>`. Wer den Link zehnmal antippt oder
 * ihn weiterleitet, löst genau einmal aus. Und eine zweite Kampagne kann später wieder
 * gutschreiben, ohne dass wir etwas zurücksetzen müssen.
 *
 * WARUM ES SICH RECHNET: Es sind {topup}-Stufen — 3 € kaufen allein nichts (das billigste Video
 * kostet mehr), aber sie liegen auf dem Konto und der Kunde legt drauf. Genau so hat der Owner
 * es gemeint: „muss er auch nicht kaufen, er legt noch drauf."
 */

/** Derselbe Schlüssel wie beim Zustimmungs-Link — Adresse UND Kampagne, damit er nicht auf eine andere Aktion passt. */
export function werbeToken(email: string, kampagne: string): string {
  const secret = process.env.TRY_THIS_LOOK_ADMIN_PIN || "luxurybandit";
  return crypto.createHmac("sha256", secret)
    .update(`${email.trim().toLowerCase()}|${kampagne.trim()}`)
    .digest("hex").slice(0, 24);
}

function seite(titel: string, koerper: string): Response {
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8">`
    + `<meta name="viewport" content="width=device-width,initial-scale=1">`
    + `<meta name="robots" content="noindex,nofollow"><title>${titel}</title></head>`
    + `<body style="margin:0;background:#0d0b0a;color:#fff;font-family:system-ui,-apple-system,sans-serif;">`
    + `<div style="max-width:440px;margin:0 auto;padding:64px 24px;text-align:center;">`
    + `<div style="font-size:22px;font-weight:900;letter-spacing:2px;color:#e7c877;margin-bottom:32px;">LUXURYBANDIT</div>`
    + `${koerper}</div></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = (url.searchParams.get("e") || "").trim().toLowerCase();
  const kampagne = (url.searchParams.get("k") || "").trim().slice(0, 40);
  const token = (url.searchParams.get("t") || "").trim();

  /* Ein falscher Link sagt NICHT, was falsch war. „Adresse unbekannt" gegen „Unterschrift
     falsch" wäre eine Auskunft darüber, welche Adressen bei uns liegen. */
  if (!email || !kampagne || !token || token !== werbeToken(email, kampagne)) {
    return seite("Link ungültig", `<p style="font-size:17px;font-weight:700;line-height:1.5;">Dieser Link gilt nicht (mehr).</p>`
      /* Der Weg zu uns ist der KONTAKT-LINK, nie die Adresse (Owner 10.08.2026, Skill
         `ci-design`): Eine Adresse auf einer offenen Seite wird abgelesen, und danach
         erstickt genau die Mailbox, über die jede Lieferung läuft. */
      + `<p style="font-size:14px;color:rgba(255,255,255,0.65);line-height:1.6;margin-top:12px;"><a href="/contact?reason=support" style="color:#f6cf51;font-weight:800;">Schreib uns</a>, dann sehen wir nach.</p>`);
  }

  const cents = WERBE_GUTSCHRIFT_CENTS;
  let stand = 0;
  let schonGehabt = false;
  try {
    const r = await guthabenAufladen(email, `werbung-${kampagne}-${email}`, cents);
    stand = r.cents;
    schonGehabt = !r.granted;
  } catch {
    /* Speicher nicht erreichbar: NICHT behaupten, es sei gutgeschrieben. Lieber ehrlich
       vertrösten — sonst sucht er ein Guthaben, das nie gebucht wurde. */
    return seite("Gleich noch einmal", `<p style="font-size:17px;font-weight:700;line-height:1.5;">Das hat gerade nicht geklappt.</p>`
      + `<p style="font-size:14px;color:rgba(255,255,255,0.65);line-height:1.6;margin-top:12px;">Tipp den Link in ein paar Minuten noch einmal an — dein Geschenk bleibt reserviert.</p>`);
  }

  const kopf = schonGehabt ? "Dein Guthaben liegt bereit" : `${eur(cents, "de")} für dich`;
  const satz = schonGehabt
    ? "Dieses Geschenk hast du schon eingelöst."
    : "Wir haben es gerade auf dein Konto gelegt.";
  return seite(kopf,
    `<p style="font-size:28px;font-weight:900;line-height:1.3;color:#e7c877;">${kopf}</p>`
    + `<p style="font-size:16px;font-weight:600;line-height:1.6;margin-top:14px;">${satz}</p>`
    + `<p style="font-size:15px;color:rgba(255,255,255,0.75);line-height:1.6;margin-top:10px;">`
    + `Dein Stand: <strong style="color:#fff;">${eur(stand, "de")}</strong></p>`
    + `<a href="/" style="display:inline-block;margin-top:28px;background:#e7c877;color:#1a160f;text-decoration:none;`
    + `font-weight:900;font-size:15px;padding:14px 26px;border-radius:999px;">Geschenke ansehen</a>`);
}
