import { sendEmail } from "@/lib/email-send";
import { mailHuelle, mailTitel, mailText, mailAdresse } from "@/lib/versusforge-mail-huelle";
import { mailTexteInSprache } from "@/lib/versusforge-mail-texte";
import { kuenstlerUrl } from "@/lib/lakatosbandi-adressen";

/**
 * DIE MAIL NACH DER ENTSCHEIDUNG DES OWNERS (Owner 11.09.2026: „Bekommt der Künstler eine E-Mail, wenn freigegeben?"
 * · „ja, alles bauen"). Vorher erfuhr er es nur, wenn er selbst auf seine Seite schaute.
 *
 *  · FREIGEGEBEN — seine Seite ist online: der Link zu ihr und „Seite bearbeiten".
 *  · ABGELEHNT   — kurz und freundlich, ohne Begründung, kein Urteil über seine Kunst; dazu der Löschlink.
 *
 * In seiner Sprache (`mailTexteInSprache`), aus dem VersusForge-Postfach wie die Künstler-Mail.
 */
type Entscheidung = {
  mandant: string;
  /** Der Dashboard-Schlüssel — für „Seite bearbeiten". */
  schluessel: string;
  loeschSchluessel?: string;
  sprache?: string;
  aktion: "frei" | "abgelehnt";
};

export async function freigabeMailBauen(o: Entscheidung): Promise<{ betreff: string; html: string; loeschen: string }> {
  const T = await mailTexteInSprache(o.sprache);
  const loeschen = o.loeschSchluessel
    ? `${kuenstlerUrl(o.mandant)}/loeschen?k=${encodeURIComponent(o.loeschSchluessel)}`
    : "";

  if (o.aktion === "frei") {
    return {
      betreff: T.freigabeBetreff,
      loeschen,
      html: mailHuelle(
        mailTitel(T.freigabeTitel)
        + mailText(T.freigabeText)
        + mailAdresse(T.kuenstlerSeite, kuenstlerUrl(o.mandant), T.freigabeSeiteFein)
        + mailAdresse(T.kuenstlerBearbeiten, `${kuenstlerUrl(o.mandant)}?k=${encodeURIComponent(o.schluessel)}`, T.kuenstlerBearbeitenFein),
        loeschen || undefined,
        undefined,
        /* Derselbe Briefkopf wie bei der Werk-Absage weiter unten (Owner 19.09.2026: „warum kommt
           die E-Mail von VersusForge?") — der Künstler kennt nur lakatosbandi.com. */
        "lakatosbandi"),
    };
  }
  return {
    betreff: T.ablehnungBetreff,
    loeschen,
    html: mailHuelle(
      mailTitel(T.ablehnungTitel)
      + mailText(T.ablehnungText)
      + (loeschen ? mailAdresse(T.linksAllesLoeschen, loeschen, T.ablehnungLoeschenFein) : ""),
      loeschen || undefined,
      undefined,
      "lakatosbandi"),
  };
}

export async function freigabePerPost(o: Entscheidung & { an: string }): Promise<boolean> {
  if (!o.an.includes("@")) return false;
  const { betreff, html, loeschen } = await freigabeMailBauen(o);
  const res = await sendEmail({
    konto: "versusforge",
    absender: "lakatosbandi.com",
    to: o.an,
    /* Ohne spitze Klammern — `sendEmail` setzt sie selbst. */
    ...(loeschen ? { listUnsubscribe: loeschen } : {}),
    subject: betreff,
    html,
  });
  if (!res.ok) console.error("[versusforge-freigabe-post] Versand fehlgeschlagen:", res.error);
  return res.ok;
}

/**
 * ── DIE ABSAGE FÜR MEHRERE WERKE — EINE MAIL JE KÜNSTLER (Owner 18.09.2026) ─────────────────
 *
 * „Ich selektiere und markiere, dann Button Senden — und sie bekommen EINE E-Mail, nicht 5
 * E-Mails für jedes Werk."
 *
 * ── WAS DRINSTEHT ───────────────────────────────────────────────────────────────────────────
 *
 * Je abgelehntem Werk eine Zeile mit den angeklickten Gründen und, wenn der Owner einen
 * geschrieben hat, seinem eigenen Satz. Darunter EINMAL die Anleitung und EINMAL die Frist —
 * nicht je Bild, sonst liest es niemand.
 *
 * ── KEINE BILDER, KEINE NUMMERN ─────────────────────────────────────────────────────────────
 *
 * „Werk 4" sagt dem Künstler nichts; er kennt seine Bilder als Bilder. Deshalb steht dort der
 * Titel, den er selbst vergeben hat, und nur wenn es keinen gibt, die Nummer.
 */
export async function werkeAbgelehntPerPost(o: {
  an: string;
  mandant: string;
  schluessel: string;
  sprache?: string;
  /** Je abgelehntem Werk: wie es heisst, welche Gründe angeklickt sind, was der Owner dazuschrieb. */
  werke: { titel: string; gruende: string[]; notiz?: string; bild?: Buffer }[];
}): Promise<boolean> {
  if (!o.an.includes("@") || !o.werke.length) return false;

  /**
   * ── ZWEI SPRACHEN IN EINER MAIL (Owner 18.09.2026: „sie bekommen den Text auf Rumänisch und
   * Englisch") ────────────────────────────────────────────────────────────────────────────────
   *
   * Nicht „in seiner Sprache", sondern BEIDE — Rumänisch zuerst, Englisch darunter. Der Grund
   * ist praktisch: Bei den meisten Künstlern steht keine Sprache im Datensatz, und geraten wird
   * hier nicht. Wer Rumänisch liest, hört nach dem ersten Block auf; wer nicht, liest weiter.
   *
   * Der Trennstrich dazwischen ist kein Schmuck: Ohne ihn liest sich die Mail wie ein Text, in
   * dem jemand mitten im Satz die Sprache wechselt.
   */
  const RO = await mailTexteInSprache("ro");
  const EN = await mailTexteInSprache("en");

  /**
   * ── DAS BILD STEHT NEBEN SEINEM NAMEN (Owner 18.09.2026: „man sollte die Bilder mitschicken,
   * klein") ──────────────────────────────────────────────────────────────────────────────────
   *
   * Ein Titel allein reicht nicht: Viele Werke heissen „Nr. 4", und wer zwölf Bilder hochgeladen
   * hat, weiss nicht, welches gemeint ist. Mit dem Bild daneben ist die Nachricht in zwei
   * Sekunden verstanden.
   *
   * ALS ANHANG MIT `cid`, NICHT ALS DATEN-URI: Gmail und Outlook zeigen `data:`-Bilder in Mails
   * nicht an — die Nachricht käme mit leeren Rahmen an. Und nicht als Link auf unsere Ablage:
   * Das Bild wird beim Ablehnen gelöscht, der Link wäre am nächsten Tag tot.
   *
   * ZWEI SPRACHBLÖCKE, EIN ANHANG: Dieselbe Kennung wird in beiden Blöcken verwendet; der
   * Anhang reist einmal.
   */
  const anhaenge = o.werke
    .map((w, i) => (w.bild ? { name: `werk-${i + 1}.jpg`, inhalt: w.bild, typ: "image/jpeg", cid: `werk${i + 1}` } : null))
    .filter((a): a is { name: string; inhalt: Buffer; typ: string; cid: string } => !!a);

  const block = (T: typeof RO) => {
    const satz = (g: string) => (T as unknown as Record<string, string>)[g] ?? "";
    const zeilen = o.werke.map((w, i) => {
      const dazu = [...w.gruende.map(satz).filter(Boolean), ...(w.notiz ? [w.notiz] : [])];
      const bild = w.bild
        ? `<td width="86" valign="top" style="padding:10px 12px 10px 0"><img src="cid:werk${i + 1}" width="74" alt="" style="display:block;width:74px;height:auto;border:1px solid #eceff1"></td>`
        : "";
      return `<tr>${bild}<td valign="top" style="padding:10px 0;border-bottom:1px solid #eceff1">`
        + `<b style="font-size:16px;color:#14181c">${w.titel}</b>`
        + (dazu.length ? `<div style="margin-top:4px;color:#5b666f;font-size:15px;line-height:1.5">${dazu.join(" · ")}</div>` : "")
        + `</td></tr>`;
    }).join("");
    /* Geht es NUR um die Auswahl und bei keinem Werk um die Aufnahme, darf dort nicht stehen,
       es gehe um die Fotos. */
    const nurAuswahl = o.werke.every(w => w.gruende.length > 0 && w.gruende.every(g => g === "grundPasst"));
    return mailTitel(T.werkAbgelehntTitel)
      + mailText(nurAuswahl ? T.werkAbgelehntTextPasst : T.werkAbgelehntText)
      + `<table role="presentation" width="100%" style="border-collapse:collapse;margin:8px 0 20px">${zeilen}</table>`
      /* Anleitung und Frist nur, wenn es etwas zu tun gibt. Wer abgelehnt wurde, weil das Werk
         nicht passt, kann nicht besser fotografieren — ihm eine Frist zu setzen wäre Hohn. */
      + (nurAuswahl ? "" : mailText(T.werkAbgelehntWie) + mailText(T.werkAbgelehntFrist));
  };

  const trenner = `<div style="height:1px;background:#e3e8ec;margin:28px 0"></div>`;

  const res = await sendEmail({
    konto: "versusforge",
    absender: "lakatosbandi.com",
    /* Der Betreff trägt beide Sprachen — im Postfach sieht man nur ihn. */
    subject: `${RO.werkAbgelehntBetreff} · ${EN.werkAbgelehntBetreff}`,
    to: o.an,
    ...(anhaenge.length ? { anhaenge } : {}),
    html: mailHuelle(
      block(RO)
      + trenner
      + block(EN)
      + mailAdresse(`${RO.werkAbgelehntSeite} · ${EN.werkAbgelehntSeite}`, `${kuenstlerUrl(o.mandant)}?k=${encodeURIComponent(o.schluessel)}`, ""),
      undefined,
      undefined,
      /**
       * ── DIE MARKE IST LAKATOSBANDI, NICHT VERSUSFORGE (Owner 18.09.2026, an der Mail) ────────
       *
       * Im Kopf stand „VersusForge · MARKETING ENGINE". Der Künstler kennt VersusForge nicht —
       * er hat sich auf lakatosbandi.com angemeldet, und „MARKETING ENGINE" liest sich wie
       * Werbepost von einem Fremden. Genau dafür hat `mailHuelle` seit dem 11.09. den vierten
       * Parameter; er wurde hier nur nie gesetzt.
       */
      "lakatosbandi"),
  });
  if (!res.ok) console.error("[versusforge-freigabe-post] Werk-Absage nicht verschickt:", res.error);
  return res.ok;
}
