import { NextResponse } from "next/server";
import { readWetterSubscribers, writeWetterSubscribers, getSignedUrl, readKissLog, writeKissLog, type WetterSubscriber } from "@/lib/try-this-look-store";
import { sendEmail } from "@/lib/email-send";
import { dialInfo } from "@/lib/dial-code";
import { pruefeEmail, emailFehlerText } from "@/lib/email-pruefen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DIE E-MAIL GEGEN DAS BILD (Owner 30.07.2026).
 *
 * „Der muss sich kostenlos anmelden um gratis zu probieren mit email, dann hat er ein Konto …
 * er kann es sofort sehen, aber er kann nur ein Bild generieren."
 *
 * GEFRAGT WIRD VOR DER ERZEUGUNG (Owner 30.07.2026: „deswegen habe ich die emailadresse
 * nicht"). Vorher stand die Frage hinter dem fertigen Bild — mit dem Ergebnis, dass in der
 * Galerie bezahlte Bilder ohne eine einzige Adresse lagen. Die Adresse ist das Einzige, was
 * bleibt, wenn er nicht kauft; sie hinter das Ergebnis zu legen heißt, sie bei genau denen zu
 * verlieren, die abspringen.
 *
 * Deshalb zwei Aufrufe je Besuch:
 *   1. `vorab: true`  → nur eintragen, KEINE Mail (es gibt noch nichts zu schicken)
 *   2. danach mit `imagePath` (Bild fertig) oder `pending: true` (gescheitert) → die Mail
 *
 * Die Adresse landet in der KISSING-Liste, nicht bei den Wetter-Abonnenten (Owner-Dauerregel:
 * „Die Wetter Leads sind die Wetter Leads"). Doppelte Adressen werden nicht neu angelegt.
 */

/**
 * JEDES THEMA HAT SEINE EIGENE LISTE (Owner-Dauerregel „Die Wetter Leads sind die Wetter
 * Leads", am 31.07.2026 auf die Hochzeit ausgeweitet).
 *
 * Wer sich fuer den Hochzeitskuss eingetragen hat, hat nicht um Kuss-Post gebeten. Ohne
 * Trennung bekaeme er spaeter eine Nachricht zu einem Thema, das er nie gesehen hat — und
 * drueckt dann Spam. Die Liste heisst wie das Thema; alles Unbekannte bleibt „kiss".
 */
const LISTEN = ["kiss", "idol", "wedding"] as const;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string; name?: string; imagePath?: string; device?: string; lang?: string; genId?: string;
    pending?: boolean;   // Erzeugung gescheitert — wir melden uns, sobald es klappt
    vorab?: boolean;     // vor der Erzeugung: nur eintragen, noch nichts schicken
    theme?: string;      // kiss | idol | wedding — bestimmt, in welche Liste er kommt
    consentAt?: string;  // Zeitpunkt des Haekchens — ohne Nachweis ist eine Einwilligung wertlos
  };
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 160);
  const lang = String(body.lang ?? "en").slice(0, 5);
  /**
   * HIER STEHT DAS TOR (Owner 31.07.2026: „die die verdächtig sind, da wird nichts erzeugt.
   * Es muss die Meldung stehen dass die E-Mail falsch ist.").
   *
   * DIESE ROUTE IST DIE RICHTIGE STELLE, und zwar nur sie: Der Trichter meldet die Adresse
   * hier an, BEVOR er erzeugt, und schaltet das Erzeugen erst frei, wenn die Antwort in
   * Ordnung ist (`adresseVormerken` in KissFunnel). Ein Nein hier heisst also: kein Bild,
   * keine Kosten, und der Nutzer liest im Klartext, was mit seiner Adresse nicht stimmt.
   *
   * Bisher stand hier nur „ist ein @ drin" — daran kam `gl12341234123@gmail.com` mühelos
   * vorbei, und jede solche Adresse kostet uns ein Bild und einen Rückläufer.
   */
  const pruefung = pruefeEmail(email);
  if (!pruefung.ok) {
    return NextResponse.json(
      { error: emailFehlerText(pruefung.grund, lang), emailUngueltig: true, grund: pruefung.grund },
      { status: 400 },
    );
  }
  const imagePath = String(body.imagePath ?? "").trim();
  const device = String(body.device ?? "").trim().slice(0, 80);
  const KISS_LIST = (LISTEN as readonly string[]).includes(String(body.theme ?? "")) ? String(body.theme) : "kiss";
  // Zeitpunkt des Haekchens, wie ihn der Browser gemeldet hat — auf 40 Zeichen begrenzt.
  const zustimmung = String(body.consentAt ?? "").trim().slice(0, 40);

  // 1 · In die Kissing-Liste eintragen (idempotent).
  let neu = false;
  /**
   * DIE ABMELDE-KENNUNG (Owner 30.07.2026: „wenn er seine email angibt dann unterschreibt er
   * dass er von uns angebote bekommt").
   *
   * Wer das unterschreiben soll, muss auch wieder herauskommen — sonst ist die Zusage keine.
   * Bisher stand in der Abmelde-Adresse `s=` LEER: Der Ein-Klick von Gmail und Yahoo lief ins
   * Nichts, weil niemand wusste, WEN er abmelden soll. Wer nicht herauskommt, drückt „Spam",
   * und das kostet die Zustellbarkeit für alle anderen mit.
   */
  let subId = "";
  try {
    const liste = await readWetterSubscribers(KISS_LIST);
    const da = liste.find(s => (s.email ?? "").trim().toLowerCase() === email);
    subId = String(da?.id ?? "");
    if (!da) {
      neu = true;
      subId = `sub-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
      const eintrag: WetterSubscriber = {
        id: subId,
        name: String(body.name ?? "").trim().slice(0, 120) || email.split("@")[0],
        email,
        lang: dialInfo("")?.lang || lang,
        /**
         * DER NACHWEIS STEHT IN DER NOTIZ (Owner 30.07.2026: „die muessen das abhacken sonst
         * wird es ilegal"). Eine Einwilligung, die man nicht belegen kann, ist keine — im
         * Streitfall zaehlt, WANN zugestimmt wurde. Die Notiz ist die Spalte, die der Admin
         * ohnehin sieht; ein eigenes Feld waere eine Schema-Aenderung fuer denselben Zweck.
         */
        note: `${KISS_LIST} · ${body.vorab ? "vor der Erzeugung" : body.pending ? "gescheitert" : "Gratis-Bild"}`
          + `${zustimmung ? ` · Zustimmung ${zustimmung}` : ""}`
          + `${device ? ` · ${device}` : ""}`,
        createdAt: new Date().toISOString(),
      };
      await writeWetterSubscribers([eintrag, ...liste], KISS_LIST);
    }
  } catch { /* die Liste darf den Ablauf nie blockieren — er hat sein Bild schon */ }

  /**
   * DIE ADRESSE AN DEN LOG-EINTRAG HÄNGEN (Owner 30.07.2026: „seine Galerie ist leer").
   *
   * Ohne das hängt das erzeugte Bild nur an einer Gerätekennung. Wechselt er das Gerät oder
   * meldet sich an, findet seine Galerie nichts — obwohl das Bild da ist. Mit der Adresse am
   * Eintrag kann sie es zuordnen.
   */
  try {
    const genId = String(body.genId ?? "").trim();
    if (genId) {
      const eintraege = await readKissLog();
      const e = eintraege.find(x => x.id === genId);
      if (e && e.email !== email) { e.email = email; await writeKissLog(eintraege); }
    }
  } catch { /* der Besucher hat sein Bild schon — das darf nie blockieren */ }

  /**
   * VORAB = NUR EINTRAGEN. Er hat gerade seine Adresse getippt und wartet auf sein Bild —
   * eine Mail „wir sind dran" wäre in dieser Sekunde nur Lärm, und sie käme ein zweites Mal,
   * sobald das Bild fertig ist. Geschickt wird, wenn es etwas zu schicken gibt.
   */
  if (body.vorab === true) return NextResponse.json({ ok: true, neu, mail: false });

  // 2 · Das Bild per Mail schicken, mit dem Hinweis aufs Passwort.
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://luxurybandit.com";
  let bildUrl = "";
  if (imagePath.startsWith("try-this-look/")) bildUrl = await getSignedUrl(imagePath, 60 * 60 * 24 * 30).catch(() => "");

  /**
   * DER KNOPF FÜHRT IN SEINE GALERIE (Owner 30.07.2026: „hier muss stehen Watch my Gallery
   * und dann springt er dorthin").
   *
   * BEWUSST OHNE die Adresse in der Zeile: eine E-Mail-Adresse in einer URL landet im
   * Verlauf, in Weiterleitungen und in fremden Protokollen. Auf demselben Gerät findet die
   * Galerie seine Bilder ohnehin über die Gerätekennung; von einem anderen Gerät meldet er
   * sich dort an.
   */
  const galerie = `${origin}/my-gallery`;
  // Mit Kennung, sonst weiss die Abmeldung nicht, wen sie abmelden soll.
  const abmelden = `${origin}/api/wetter-unsubscribe?model=${KISS_LIST}&s=${encodeURIComponent(subId)}`;
  /**
   * AUCH WENN NICHTS HERAUSKAM (Owner 30.07.2026: „wieso habe ich seine E-Mail nicht?").
   *
   * Vier von zehn echten Besuchern haben heute ihr Foto hochgeladen und nie ein Bild
   * bekommen — einer versuchte es dreimal. Gefragt wurde nach der Adresse aber erst NACH dem
   * fertigen Bild. Ausgerechnet die Hartnäckigsten hinterliessen so keine Spur.
   *
   * Jetzt bekommt auch der Gescheiterte ein Feld — und eine andere Mail: kein „hier ist dein
   * Bild", sondern ein ehrliches „wir melden uns, sobald es fertig ist".
   */
  const wartend = body.pending === true || !bildUrl;
  const html =
    `<div style="background:#0d0b0a;padding:22px 0;font-family:Arial,Helvetica,sans-serif">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">`
    + `<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="width:520px;max-width:94%;background:#16120f;border-radius:18px;overflow:hidden">`
    + `<tr><td style="padding:20px 22px 6px;color:#f6cf51;font-size:13px;font-weight:bold;letter-spacing:2px">LUXURYBANDIT</td></tr>`
    + `<tr><td style="padding:0 22px 12px;color:#fff;font-size:20px;font-weight:bold">${wartend ? "We are on it" : "Your picture is ready"}</td></tr>`
    + (bildUrl ? `<tr><td style="padding:0 22px 14px"><img src="${bildUrl}" width="476" style="width:100%;border-radius:12px;display:block" alt=""></td></tr>` : "")
    + `<tr><td style="padding:0 22px 14px;color:#e8e2d6;font-size:14px;line-height:1.55">`
    + (wartend
      ? `It did not come through this time — we are looking into it and send you your picture as soon as it is ready.`
      : `It is saved in your gallery — together with everything you make next.`)
    + `</td></tr>`
    + `<tr><td style="padding:0 22px 8px"><a href="${galerie}" style="display:inline-block;background:#f6cf51;color:#111;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:bold;text-decoration:none">Watch my gallery</a></td></tr>`
    + `<tr><td style="padding:0 22px 14px;color:#8d8579;font-size:12px;line-height:1.5">`
    + `Want to see the two of you move? Turn it into a hot video right there.`
    + `</td></tr>`
    // SICHTBAR ABMELDEN, nicht nur in der Kopfzeile: Der Ein-Klick im Postfach hilft nur dem,
    // der ihn findet. Ein Link im Text ist das, was die Zusage im Trichter wirklich einloest.
    + `<tr><td style="padding:0 22px 20px"><a href="${abmelden}" style="color:#6b655c;font-size:11px">Unsubscribe</a></td></tr>`
    + `</table></td></tr></table></div>`;

  const mail = await sendEmail({
    to: email,
    subject: wartend ? "We are on it ✨" : "Your picture is ready ✨",
    html,
    listUnsubscribe: abmelden,
  }).catch(() => ({ ok: false }));

  return NextResponse.json({ ok: true, neu, mail: !!(mail as { ok?: boolean }).ok });
}
