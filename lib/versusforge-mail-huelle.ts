/**
 * DIE HÜLLE FÜR ALLE VERSUSFORGE-MAILS (Owner 09.09.2026, nach der ersten echten Mail: „die
 * Farben in der E-Mail stimmen nicht. Und es ist alles viel zu klein").
 *
 * WARUM DIE FARBEN NICHT STIMMTEN: Die Mails waren dunkel gebaut — schwarzer Grund, weisse
 * Schrift. Mail-Programme werfen `background` auf einem `<div>` aber regelmässig weg; übrig
 * blieb heller Grund mit unseren dunklen Werten darauf. Das ist kein Sonderfall, das ist der
 * Normalfall: In Mail gilt `bgcolor` am `<table>`, nicht CSS am `<div>`.
 *
 * DESHALB HELL, NICHT „dunkel, aber richtiger": Alles andere im Produkt ist seit heute hell —
 * die Mandantenseite, die Anzeigen-Seite, das Bild. Eine schwarze Mail wäre der einzige Ort,
 * an dem die Marke noch schreit, und sie wäre gleichzeitig der fragilste. Zwei Gründe, eine
 * Entscheidung.
 *
 * UND GRÖSSER: 17 px Fliesstext, 26 px Überschrift. Am Handy wird eine Mail nicht gelesen,
 * sondern überflogen — was unter 15 px steht, wird übersprungen. Der Boden aus dem CI
 * (nichts unter 13,5 px) gilt hier genauso.
 *
 * EINE HÜLLE FÜR ALLE DREI MAILS, damit sie nicht auseinanderlaufen: die Plan-Mail, die
 * Links-Mail und „Du hast eine Anfrage".
 */

export const MAIL = {
  grund: "#f5f7f9",
  karte: "#ffffff",
  text: "#14181c",
  grau: "#5b666f",
  fein: "#7d8791",
  linie: "#dfe4e9",
  akzent: "#1d6fd0",
  akzentFein: "#eaf2fc",
  schrift: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
} as const;

/**
 * Der Rahmen: heller Grund, weisse Karte, Wortmarke oben — und der Fuss mit der
 * Abbestellung.
 *
 * ABBESTELLEN HEISST HIER: TRICHTER LÖSCHEN (Owner 09.09.2026: „das muss der User
 * abbestellen können, indem er seinen Trichter löscht").
 *
 * DAS IST EHRLICHER ALS EIN „Abmelden"-LINK, der nur den Versand stoppt: Die Mails kommen
 * ja, WEIL sein Trichter läuft und Anfragen sammelt. Wer keine Post mehr will, aber einen
 * laufenden Trichter behält, hätte Anfragen im Fach, von denen er nie erfährt — und Menschen
 * am anderen Ende, die auf einen Rückruf warten. Ein Ausgang, der beides beendet, ist der
 * einzige, der niemanden hängen lässt.
 *
 * DER FUSS FEHLT NIE. Er steht in der Hülle und nicht in den einzelnen Mails, damit ihn
 * niemand beim nächsten Umbau vergisst.
 */
/**
 * ── DER FUSS SPRICHT JETZT SEINE SPRACHE (Owner 12.09.2026, mit Bild einer rumänischen Mail, in
 * der die letzte Zeile deutsch war) ─────────────────────────────────────────────────────────
 *
 * Hier standen zwei deutsche Sätze fest im Code. Jede Mail trug sie, egal in welcher Sprache der
 * Rest geschrieben war — der letzte Eindruck jeder Mail an einen rumänischen Künstler war ein
 * deutscher Satz, den er nicht liest.
 *
 * SIE KOMMEN JETZT VON AUSSEN (`fuss`), aus denselben übersetzten Texten wie der Rest der Mail.
 * Ohne Angabe bleibt es beim deutschen Wortlaut: Eine Mail ohne Fuss wäre schlimmer als eine mit
 * dem falschen — der Ausgang muss immer dastehen.
 */
/**
 * ── WESSEN NAME OBEN STEHT (Owner 13.09.2026: „die E-Mails sollen alle von hier kommen") ──────
 *
 * Der Kopf stand fest auf „VersusForge · MARKETING ENGINE" — in JEDER Mail. Seit der Absender
 * `service@lakatosbandi.com` ist, machte die Post also unter fremdem Namen auf.
 *
 * BEI FOLLOWERN IST DAS NICHT NUR SCHIEF, SONDERN VERWIRREND: Ein Käufer hat einem Künstler auf
 * lakatosbandi.com gefolgt. „MARKETING ENGINE" sagt ihm nichts — es sieht aus wie Werbung von
 * einer Firma, mit der er nie zu tun hatte, und genau das drückt man weg.
 *
 * VersusForge bleibt der Standard: Die Mails an Betriebe (Plan, Anfragen, Trichter) laufen
 * weiterhin unter dieser Marke, und die soll sich hier nicht mitändern.
 */
export type MailMarke = "versusforge" | "lakatosbandi";

export function mailHuelle(
  inhalt: string,
  loeschLink?: string,
  fuss?: { grund: string; loeschen: string },
  marke: MailMarke = "versusforge",
): string {
  const fussGrund = fuss?.grund?.trim() || "Du bekommst diese Mail, weil deine Seite bei uns läuft.";
  const fussLoeschen = fuss?.loeschen?.trim() || "Keine Mails mehr — Seite und Anfragen löschen.";
  const kopf = marke === "lakatosbandi"
    ? `<tr><td style="padding:26px 26px 0;font-family:${MAIL.schrift};font-size:20px;font-weight:800;letter-spacing:-0.02em;color:${MAIL.text}">lakatosbandi.com</td></tr>`
      /* Keine zweite Zeile: „MARKETING ENGINE" ist die Sprache des Werkzeugs, nicht die des Portals. */
    : `<tr><td style="padding:26px 26px 0;font-family:${MAIL.schrift};font-size:20px;font-weight:800;letter-spacing:-0.02em;color:${MAIL.text}">`
      + `Versus<span style="color:${MAIL.akzent}">Forge.</span></td></tr>`
      + `<tr><td style="padding:8px 26px 0;font-family:${MAIL.schrift};font-size:10px;font-weight:800;letter-spacing:3px;color:${MAIL.fein}">MARKETING ENGINE</td></tr>`;
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${MAIL.grund}" style="background:${MAIL.grund};margin:0;padding:24px 0">`
    + `<tr><td align="center" style="padding:0 12px">`
    + `<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" bgcolor="${MAIL.karte}" style="width:560px;max-width:100%;background:${MAIL.karte};border:1px solid ${MAIL.linie};border-radius:16px">`
    + kopf
    + inhalt
    + (loeschLink
        ? `<tr><td style="padding:22px 26px 0"><div style="border-top:1px solid ${MAIL.linie}"></div></td></tr>`
          + `<tr><td style="padding:14px 26px 0;font-family:${MAIL.schrift};font-size:14px;line-height:1.55;color:${MAIL.fein}">`
          + `${fussGrund} `
          + `<a href="${loeschLink}" style="color:${MAIL.fein}">${fussLoeschen}</a>`
          + `</td></tr>`
        : "")
    + `<tr><td style="padding:0 26px 26px"></td></tr>`
    + `</table></td></tr></table>`
  );
}

/** Die Überschrift der Mail — eine je Mail, blau, gross. */
export const mailTitel = (t: string): string =>
  `<tr><td style="padding:20px 26px 0;font-family:${MAIL.schrift};font-size:26px;font-weight:800;line-height:1.2;letter-spacing:-0.02em;color:${MAIL.akzent}">${t}</td></tr>`;

/** Fliesstext. 17 px — am Handy wird alles Kleinere übersprungen. */
export const mailText = (t: string): string =>
  `<tr><td style="padding:14px 26px 0;font-family:${MAIL.schrift};font-size:17px;line-height:1.55;color:${MAIL.text}">${t}</td></tr>`;

/** Kleiner Zusatz, der nicht die Hauptsache ist. */
export const mailFein = (t: string): string =>
  `<tr><td style="padding:14px 26px 0;font-family:${MAIL.schrift};font-size:14.5px;line-height:1.55;color:${MAIL.fein}">${t}</td></tr>`;

/** Ein abgesetzter Kasten — für den einen Punkt, auf den es ankommt. */
export const mailKasten = (titel: string, text: string, knopf?: { adresse: string; wort: string }): string =>
  `<tr><td style="padding:18px 26px 0">`
  + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${MAIL.akzentFein}" style="background:${MAIL.akzentFein};border:1px solid ${MAIL.akzent}45;border-radius:12px">`
  + `<tr><td style="padding:18px 20px;font-family:${MAIL.schrift}">`
  /* Ohne Titel keine leere Zeile — der Kasten trägt dann nur Text und Knopf. */
  + (titel ? `<div style="font-size:18px;font-weight:800;letter-spacing:-0.01em;color:${MAIL.text}">${titel}</div>` : "")
  + `<div style="font-size:16px;line-height:1.55;color:${MAIL.grau};padding-top:${titel ? 8 : 0}px">${text}</div>`
  + (knopf
      ? `<div style="padding-top:16px"><a href="${knopf.adresse}" style="display:inline-block;background:${MAIL.akzent};color:#ffffff;font-size:16px;font-weight:800;text-decoration:none;padding:13px 22px;border-radius:10px">${knopf.wort}</a></div>`
      : "")
  + `</td></tr></table></td></tr>`;

/**
 * Eine Adresse zum Antippen, mit Etikett darüber.
 *
 * DIE ADRESSE STEHT AUSGESCHRIEBEN DARUNTER, nicht nur als Wort: Wer die Mail weiterleitet
 * oder auf einem Gerät ohne Klick liest, muss sie abtippen können.
 */
export const mailAdresse = (etikett: string, adresse: string, erklaerung: string): string =>
  `<tr><td style="padding:18px 26px 0;font-family:${MAIL.schrift}">`
  + `<div style="font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${MAIL.akzent}">${etikett}</div>`
  + `<div style="padding-top:6px"><a href="${adresse}" style="font-size:17px;font-weight:700;color:${MAIL.akzent};word-break:break-all">${adresse.replace(/^https:\/\//, "")}</a></div>`
  + `<div style="font-size:15px;line-height:1.5;color:${MAIL.grau};padding-top:6px">${erklaerung}</div>`
  + `</td></tr>`;
