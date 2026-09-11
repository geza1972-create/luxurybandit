import nodemailer from "nodemailer";

// One place to send transactional email. Prefers the user's own mailbox via SMTP
// (e.g. Hostinger's support@luxurybandit.com) so we don't depend on a verified
// Resend domain; falls back to Resend if SMTP isn't configured; no-ops if neither
// is set so callers never break.
//
// Env (set in Vercel — the password is a secret the operator enters, never in code):
//   SMTP_HOST   e.g. smtp.hostinger.com
//   SMTP_PORT   465 (SSL) or 587 (STARTTLS)   — default 465
//   SMTP_USER   the full mailbox address, e.g. support@luxurybandit.com
//   SMTP_PASS   the mailbox password
//   SMTP_FROM   optional display From, default "LuxuryBandit <SMTP_USER>"
//   RESEND_API_KEY  optional fallback sender
//
// Zweites Postfach für VersusForge (siehe `MailKonto` unten). Nötig sind nur die ersten
// beiden; der Rest erbt vom Haus:
//   VERSUSFORGE_SMTP_USER   z. B. support@versusforge.com
//   VERSUSFORGE_SMTP_PASS   das Postfach-Passwort
//   VERSUSFORGE_SMTP_HOST   nur falls anderer Anbieter  — sonst SMTP_HOST
//   VERSUSFORGE_SMTP_PORT   nur falls abweichend        — sonst SMTP_PORT
//   VERSUSFORGE_SMTP_FROM   nur falls anderer Anzeigename — sonst "VersusForge <USER>"

export type SendResult = { ok: boolean; via?: "smtp" | "resend"; skipped?: string; error?: string };

/**
 * ZWEI POSTFÄCHER, WEIL ES ZWEI MARKEN SIND (Owner 09.09.2026: „ich muss noch eine E-Mail
 * anlegen, sonst bekommen die Leute eine E-Mail von LuxuryBandit").
 *
 * Er hat recht, und es ist nicht nur der Name im Absenderfeld. Ein Zahnarzt, der auf
 * versusforge.com seinen Trichter gebaut hat, bekommt heute Post von
 * `support@luxurybandit.com` — daneben stehen im Postfach Kuss-Videos und Geburtstagsfilme.
 * Das ist genau die Vermischung, die der ganze Umzug auf VersusForge beenden soll.
 *
 * WARUM NICHT EINFACH EIN ANDERER „From"-TEXT: Weil das die Zustellung kaputtmacht. Der
 * Umschlag-Absender bliebe luxurybandit.com, während im Kopf versusforge.com stünde. SPF
 * und DMARC prüfen genau diese Übereinstimmung — Gmail zeigt dann „gesendet über
 * luxurybandit.com" oder wirft die Mail in den Spam. Eine Anfragen-Benachrichtigung, die im
 * Spam landet, ist schlimmer als gar keine: Er wartet auf Anrufe und bekommt keine.
 * Deshalb ein EIGENES Postfach mit eigenen Zugangsdaten, nicht nur ein anderer Text.
 *
 * BIS ES DAS POSTFACH GIBT, geht die Post weiter über das Haus — mit einer Warnung im Log.
 * Gar nicht zu senden wäre die schlechtere Antwort: Dann verlöre jemand seine Anfrage,
 * statt sie unter dem falschen Namen zu bekommen.
 *
 * ANZULEGEN (Hostinger, wie bei luxurybandit.com): ein Postfach auf versusforge.com, dann
 * in Vercel VERSUSFORGE_SMTP_USER und VERSUSFORGE_SMTP_PASS setzen. HOST, PORT und FROM
 * haben Vorgaben und sind nur nötig, wenn etwas abweicht.
 */
export type MailKonto = "haus" | "versusforge";

type Zugang = { host?: string; user?: string; pass?: string; port: number; from: string };

function zugang(konto: MailKonto): Zugang {
  const hausUser = process.env.SMTP_USER?.trim();
  const haus: Zugang = {
    host: process.env.SMTP_HOST?.trim(),
    user: hausUser,
    pass: process.env.SMTP_PASS?.trim(),
    port: Number(process.env.SMTP_PORT?.trim() || "465"),
    from: process.env.SMTP_FROM?.trim() || (hausUser ? `LuxuryBandit <${hausUser}>` : ""),
  };
  if (konto === "haus") return haus;

  const user = process.env.VERSUSFORGE_SMTP_USER?.trim();
  const pass = process.env.VERSUSFORGE_SMTP_PASS?.trim();
  /* BEIDES ODER KEINES: Ein Benutzer ohne Passwort ergäbe eine Anmeldung, die scheitert —
     und die Mail ginge gar nicht raus, statt über das Haus. */
  if (!user || !pass) {
    console.warn(
      "[email-send] VersusForge-Postfach fehlt (VERSUSFORGE_SMTP_USER/PASS) — "
      + "diese Mail geht unter dem Namen des Hauses raus.",
    );
    return haus;
  }
  return {
    /* Dieselbe Sorte Postfach beim selben Anbieter: Host und Port erben, wenn nichts
       anderes dasteht. Ein zweiter Anbieter wäre ein zweiter Ort für denselben Fehler. */
    host: process.env.VERSUSFORGE_SMTP_HOST?.trim() || haus.host,
    user,
    pass,
    port: Number(process.env.VERSUSFORGE_SMTP_PORT?.trim() || process.env.SMTP_PORT?.trim() || "465"),
    from: process.env.VERSUSFORGE_SMTP_FROM?.trim() || `VersusForge <${user}>`,
  };
}

/**
 * NUR-HTML IST EIN SPAM-MERKMAL. Jede Massenmail braucht auch eine reine Textfassung —
 * Filter werten das Fehlen als Zeichen für Werbemüll, und Programme ohne HTML zeigen sonst
 * eine leere Nachricht. Wenn keine mitgegeben wird, bauen wir sie aus dem HTML.
 */
function textAusHtml(html: string): string {
  return String(html ?? "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<(br|\/p|\/tr|\/div|\/h[1-6])[^>]*>/gi, "\n")
    .replace(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, url, txt) =>
      `${String(txt).replace(/<[^>]+>/g, "").trim()} (${url})`)
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n").map(z => z.trim()).join("\n")
    .trim();
}

/**
 * ANHÄNGE (08.09.2026, für die VersusForge-Analyse gebaut).
 *
 * WARUM EIN ANHANG UND KEIN LINK (Owner: „die Analyse ist doch nicht für immer da, es ist
 * doch keine URL"): Der Plan wird nirgends abgelegt — es gibt nichts zu verlinken, und ein
 * Link auf etwas Flüchtiges wäre in zwei Wochen eine tote Seite. Die Datei reist mit, dann
 * gehört sie ihm, unabhängig von uns.
 *
 * NUR ÜBER SMTP. Der Rückfallweg unten (die HTTP-Schnittstelle) kann keine Anhänge; wer
 * einen mitschickt, während SMTP nicht eingerichtet ist, bekommt eine ehrliche Absage statt
 * einer Mail ohne das, was drin sein sollte.
 */
export type MailAnhang = { name: string; inhalt: Buffer; typ?: string };

export async function sendEmail(opts: { to: string; subject: string; html: string; replyTo?: string; bcc?: string; text?: string; listUnsubscribe?: string; anhaenge?: MailAnhang[]; konto?: MailKonto;
  /** Nur der Anzeigename vor der Adresse — dasselbe Postfach (Owner 11.09.2026, Künstler-Mails: „lakatosbandi.com" statt „VersusForge", kein neues Postfach). */
  absender?: string }): Promise<SendResult> {
  const to = (opts.to ?? "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return { ok: false, error: "invalid recipient" };
  const replyTo = (opts.replyTo ?? "").trim() || undefined;
  const bcc = (opts.bcc ?? "").trim() || undefined; // silent copy (e.g. support@ so the admin sees model emails)

  /* Welches Postfach — siehe `zugang` oben. Ohne Angabe das Haus, damit sich für die
     zwölf bestehenden Produkte nichts ändert. */
  const { host, user, pass, port, from: fromStandard } = zugang(opts.konto ?? "haus");
  const anzeigename = (opts.absender ?? "").replace(/[<>"\r\n]/g, "").trim();
  const from = anzeigename && user ? `${anzeigename} <${user}>` : fromStandard;
  const text = (opts.text ?? "").trim() || textAusHtml(opts.html);
  // KOPFZEILEN FÜR MASSENVERSAND. Gmail und Yahoo verlangen seit 2024 von jedem, der an
  // viele Empfänger schickt, eine Abmeldung in EINEM Klick direkt aus dem Postfach. Fehlt
  // sie, drückt der Empfänger „Spam" — und das trifft die Zustellung an alle anderen.
  const unsubHeaders = opts.listUnsubscribe
    ? {
        "List-Unsubscribe": `<${opts.listUnsubscribe}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      }
    : undefined;

  /* Ein Anhang, der still verschwindet, ist schlimmer als eine Absage: Der Empfänger
     bekäme eine Mail, die von einem PDF spricht, das nicht da ist. */
  if (opts.anhaenge?.length && !(host && user && pass)) {
    return { ok: false, error: "attachments require SMTP" };
  }

  // 1) SMTP (the operator's own mailbox) — preferred.
  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // 465 = implicit TLS; 587 = STARTTLS
        auth: { user, pass },
      });
      await transporter.sendMail({
        from, to, subject: opts.subject, html: opts.html, text, replyTo,
        ...(bcc ? { bcc } : {}), ...(unsubHeaders ? { headers: unsubHeaders } : {}),
        ...(opts.anhaenge?.length
          ? { attachments: opts.anhaenge.map(a => ({ filename: a.name, content: a.inhalt, contentType: a.typ ?? "application/octet-stream" })) }
          : {}),
      });
      return { ok: true, via: "smtp" };
    } catch (e) {
      return { ok: false, via: "smtp", error: e instanceof Error ? e.message : "smtp send failed" };
    }
  }

  // 2) Resend fallback.
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: from || "LuxuryBandit <support@luxurybandit.com>",
          to: [to],
          subject: opts.subject,
          html: opts.html,
          text,
          ...(unsubHeaders ? { headers: unsubHeaders } : {}),
          ...(replyTo ? { reply_to: replyTo } : {}),
          ...(bcc ? { bcc: [bcc] } : {}),
        }),
      });
      if (!res.ok) {
        const p = (await res.json().catch(() => ({}))) as { message?: string };
        return { ok: false, via: "resend", error: p.message ?? "resend send failed" };
      }
      return { ok: true, via: "resend" };
    } catch (e) {
      return { ok: false, via: "resend", error: e instanceof Error ? e.message : "resend send failed" };
    }
  }

  // Nothing configured — DON'T pretend it sent. Callers that must not break on a
  // missing mailer can check `skipped`; the contact form treats this as a failure.
  console.warn("[email-send] No mailer configured (set SMTP_HOST/SMTP_USER/SMTP_PASS on Vercel) — email NOT sent:", opts.subject);
  return { ok: false, skipped: "no-mailer", error: "no mailer configured" };
}
