import { sendEmail } from "@/lib/email-send";
import { adminEmails } from "@/lib/is-admin-email";
import { kuenstlerUrl } from "@/lib/lakatosbandi-adressen";
import { eur } from "@/lib/pricing";
import { DRUCK_KUENSTLER_CENTS } from "@/lib/lakatosbandi-druck";
import type { MailAnhang } from "@/lib/email-send";
import { mandantLesen, mandantSpeichern } from "@/lib/versusforge-mandanten";
import { werkKacheln, posterAnriss } from "@/lib/lakatosbandi";
import { supabaseFetch, BUCKET, encodeStoragePath } from "@/lib/try-this-look-store";
import { motivPfad } from "@/lib/versusforge-moderation";
import { filmSeite } from "@/lib/lakatosbandi-film";
import { portalTexte, portalSprache } from "@/lib/lakatosbandi-texte";
import { druckdateiBauen } from "@/lib/lakatosbandi-druckdatei";

/**
 * WAS NACH EINER BESTELLUNG PASSIERT (Owner 16.09.2026: „ich will nicht wissen was nach
 * bestellung eines bildes passiert. weiss ich auch nicht").
 *
 * ── VORHER PASSIERTE NICHTS ─────────────────────────────────────────────────────────────────
 *
 * Der Kunde zahlte, Stripe schickte ihm eine Rechnung — und das war alles. Die Bestellung stand
 * in Stripe, wo niemand sie sucht; gedruckt hätte sie nie jemand. Genau dieser Fehler ist dem
 * Haus schon einmal passiert (Owner 30.07.2026: „nach dem ich bezahlt habe ist nichts passiert,
 * der Kunde wurde ausgeraubt").
 *
 * ── ZWEI MAILS, EINE FÜR JEDEN ──────────────────────────────────────────────────────────────
 *
 * An UNS geht der Druckauftrag: welches Werk, welches Material, welche Grösse, wohin. Das ist
 * die Mail, die an die Druckerei weitergeleitet wird — sie enthält alles, was sie braucht, und
 * den Link zum Werk in voller Auflösung.
 *
 * An den KÄUFER geht die Bestätigung: was er bestellt hat und was als Nächstes geschieht. Eine
 * Rechnung ist keine Bestätigung; sie sagt, dass Geld geflossen ist, nicht dass etwas kommt.
 *
 * KEINE ZAHLUNGSDATEN, KEINE ADRESSE IN EINER DATEI: Was hier verarbeitet wird, kommt von
 * Stripe und geht direkt in die Mail.
 */

export type BestellPosten = {
  mandant: string;
  werk: string;
  material: string;
  groesse: string;
  name?: string;
};

export type Bestellung = {
  /** Die Stripe-Sitzung — daraus entsteht die Bestellnummer. */
  sitzung: string;
  /** Was bezahlt wurde, in Cent, samt Währung. */
  betragCents?: number;
  waehrung?: string;
  kaeuferMail?: string;
  kaeuferName?: string;
  adresse?: string;
  posten: BestellPosten[];
  sprache?: string;
};

/**
 * ── DIE BESTELLNUMMER (Owner 16.09.2026: „eigentlich müssten wir eine Nummer reinschreiben" ·
 * „dann können wir es zuordnen") ────────────────────────────────────────────────────────────
 *
 * Kurz, lesbar, eindeutig: LB-<sechs Zeichen aus der Stripe-Sitzung>. Sie steht in beiden Mails,
 * später auf dem Lieferschein — und in der gekauften Datei. Taucht eine Datei irgendwo im Netz
 * auf, sagt die Nummer, aus welcher Bestellung sie stammt. Das ist der einzige Schutz, den eine
 * Datei überhaupt haben kann; ein Kopierschutz existiert bei einem PDF nicht.
 */
export const bestellNummer = (sitzung: string) =>
  `LB-${String(sitzung).replace(/[^A-Za-z0-9]/g, "").slice(-6).toUpperCase()}`;

const zeile = (p: BestellPosten) =>
  `${p.name ?? `${p.mandant} · ${p.werk}`} — ${p.material} ${p.groesse}`;

/** Der Link auf das Werk in voller Auflösung — das, was gedruckt wird. */
const werkLink = (p: BestellPosten) =>
  `${kuenstlerUrl(p.mandant)}?film=${p.werk === "-1" ? "standard" : p.werk}`;

const KAEUFER = {
  ro: {
    betreff: "Comanda ta de pe lakatosbandi.com",
    hallo: "Mulțumim pentru comandă!",
    was: "Ai comandat:",
    weiter: "Tipărim la comandă. Îți trimitem un mesaj când pleacă coletul. Livrarea în România durează de obicei câteva zile.",
    nummer: "Numărul comenzii tale:",
    /* ── DIE GRENZE DER DATEI STEHT IN DER MAIL (Owner 16.09.2026: „darf nie multipliziert
       werden. muss in der email stehen. es ist nicht für kommerzielle zwecke") ───────────── */
    lizenz: "Fișierul este pentru uzul tău personal: îl poți tipări pentru tine de câte ori vrei. Nu îl transmite mai departe, nu îl publica și nu îl folosi în scopuri comerciale. Fișierul poartă numărul comenzii tale și este atribuit ție.",
    frage: "Dacă ai o întrebare, răspunde pur și simplu la acest e-mail.",
  },
  en: {
    betreff: "Your order on lakatosbandi.com",
    hallo: "Thank you for your order!",
    was: "You ordered:",
    weiter: "We print to order. You will hear from us when the parcel is on its way. Delivery in Romania usually takes a few days.",
    nummer: "Your order number:",
    lizenz: "The file is for your personal use: print it for yourself as often as you like. Do not pass it on, do not publish it and do not use it commercially. The file carries your order number and is assigned to you.",
    frage: "If you have a question, simply reply to this email.",
  },
  de: {
    betreff: "Deine Bestellung auf lakatosbandi.com",
    hallo: "Danke für deine Bestellung!",
    was: "Du hast bestellt:",
    weiter: "Wir drucken auf Bestellung. Du hörst von uns, sobald das Paket unterwegs ist. Die Lieferung nach Rumänien dauert meist ein paar Tage.",
    nummer: "Deine Bestellnummer:",
    lizenz: "Die Datei ist für deinen persönlichen Gebrauch: Druck sie für dich, so oft du willst. Gib sie nicht weiter, veröffentliche sie nicht und nutze sie nicht gewerblich. Die Datei trägt deine Bestellnummer und ist dir zugeordnet.",
    frage: "Wenn du eine Frage hast, antworte einfach auf diese Mail.",
  },
} as const;

/**
 * Schickt den Druckauftrag an uns und die Bestätigung an den Käufer.
 *
 * Wirft nie: Eine Mail, die nicht rausgeht, darf den Webhook nicht scheitern lassen — sonst
 * wiederholt Stripe die Zustellung und der Käufer bekommt alles doppelt. Fehler werden
 * protokolliert, damit sie im Log auffindbar sind.
 */
/**
 * ── DIE DATEI ENTSTEHT BEIM KAUF UND HÄNGT AN DER MAIL (Owner 16.09.2026: „das muss aber
 * automatisch generiert werden" · „mach fertig") ────────────────────────────────────────────
 *
 * Kein Vorrat, kein Download-Link, kein Konto: Wer eine Datei kauft, bekommt sie im Anhang der
 * Bestätigung — mit seiner Bestellnummer im Blatt. Scheitert das Bauen, geht die Mail trotzdem
 * raus; dann steht im Log, welche Bestellung von Hand nachgeliefert werden muss.
 */
/**
 * ── WELCHES BLATT ZU WELCHEM POSTEN GEHÖRT ──────────────────────────────────────────────────
 *
 * Bei der DATEI steht die Fassung in der „Grösse" (neagra · holz · fara), und das Format ist
 * immer A3 (Owner: „Der Download ist immer A3"). Beim gedruckten POSTER ist es umgekehrt: die
 * Grösse ist das Format, und der Rahmen steckt im Material. Beides landet in denselben Feldern
 * der Druckdatei — deshalb wird es hier einmal auseinandergelegt statt an zwei Stellen geraten.
 */
const blattFuer = (p: BestellPosten): { format: "A3" | "A2" | "A1"; rahmen: "holz" | "schwarz" | null } | null => {
  if (p.material === "fisier")
    return { format: "A3", rahmen: p.groesse === "holz" ? "holz" : p.groesse === "fara" ? null : "schwarz" };
  if (p.material === "poster" || p.material === "posterrama" || p.material === "posterramaneagra") {
    const format = p.groesse === "A1" ? "A1" : p.groesse === "A2" ? "A2" : "A3";
    return { format, rahmen: p.material === "posterrama" ? "holz" : p.material === "posterramaneagra" ? "schwarz" : null };
  }
  /* Shirts und Hoodies drucken kein Blatt. */
  return null;
};

async function dateiAnhaenge(b: Bestellung, materialien: (p: BestellPosten) => boolean): Promise<MailAnhang[]> {
  const raus: MailAnhang[] = [];
  for (const p of b.posten.filter(materialien)) {
    const blatt = blattFuer(p);
    if (!blatt) continue;
    try {
      const m = await mandantLesen(p.mandant);
      if (!m) continue;
      const nr = p.werk === "-1" || p.werk === "" ? "standard" : p.werk;
      const kachel = werkKacheln(m).find(k => (k.i < 0 ? "standard" : String(k.i)) === nr);
      const info = m.werkInfo?.[nr] ?? {};
      const holen = async (pfad: string) => {
        const r = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad)}`);
        return r.ok ? new Uint8Array(await r.arrayBuffer()) : undefined;
      };
      const bild = await holen(motivPfad(p.mandant, nr));
      if (!bild) { console.warn(`[bestellung] Werkbild fehlt: ${p.mandant}/${nr}`); continue; }
      const bytes = await druckdateiBauen({
        bild,
        /* Kein Name und kein Profilbild auf dem Blatt (Owner 17.09.2026: „Gerry Louisett raus")
           — dieselbe Zeile wie auf dem Schirm: oben der TITEL, unten nur die Adresse. Fehlt der
           Titel, trägt die grosse Zeile den Namen. */
        titel: [info.titel, info.jahr].filter(Boolean).join(", ") || (m.name ?? ""),
        text: posterAnriss(kachel?.hook ?? ""),
        qrZiel: filmSeite(p.mandant, kachel?.i ?? -1),
        /* Nur die Adresse (Owner 17.09.2026: „hier soll stehen nur lakatosbandi.com"). */
        recht: "lakatosbandi.com",
        nummer: bestellNummer(b.sitzung),
        format: blatt.format,
        rahmen: blatt.rahmen,
      });
      raus.push({
        name: `${(info.titel || m.name || "poster").replace(/[^\p{L}\p{N} _-]/gu, "").slice(0, 60)} · ${blatt.format} · ${bestellNummer(b.sitzung)}.pdf`,
        inhalt: Buffer.from(bytes),
        typ: "application/pdf",
      });
    } catch (e) {
      console.warn(`[bestellung] Druckdatei für ${p.mandant}/${p.werk} nicht gebaut:`, e);
    }
  }
  return raus;
}

/**
 * Was ein Künstler an EINER Bestellung verdient hat — und die Mail darüber.
 *
 * Die Zeile bleibt im Datensatz stehen (`lizenzen`), auch wenn die Mail scheitert: Das Geld
 * schuldet das Haus ihm ab dem Moment der Zahlung, nicht ab dem Moment der Zustellung.
 */
async function lizenzenGutschreiben(b: Bestellung): Promise<void> {
  /* Je Künstler zusammenfassen: drei Poster desselben Künstlers sind eine Mail, nicht drei. */
  const jeKuenstler = new Map<string, BestellPosten[]>();
  for (const p of b.posten) {
    const liste = jeKuenstler.get(p.mandant) ?? [];
    liste.push(p);
    jeKuenstler.set(p.mandant, liste);
  }

  for (const [kennung, posten] of jeKuenstler) {
    const m = await mandantLesen(kennung);
    /* Reproduktionen (gemeinfreie Meister) zahlen keine Lizenz — dort lebt niemand mehr. Und eine
       Datei trägt keinen Künstleranteil (Owner 16.09.2026: „der download soll 10 euro kosten ohne
       lizenz"). */
    if (!m || m.reproduktion) continue;
    const zahlbar = posten.filter(p => p.material !== "fisier");
    if (!zahlbar.length) continue;

    const cents = zahlbar.length * DRUCK_KUENSTLER_CENTS;
    const eintrag = {
      am: new Date().toISOString(),
      bestellung: bestellNummer(b.sitzung),
      sitzung: b.sitzung,
      cents,
      stuecke: zahlbar.map(p => `${p.werk}/${p.material}/${p.groesse}`),
      bezahlt: false as const,
    };
    const bisher = Array.isArray((m as Record<string, unknown>).lizenzen)
      ? ((m as Record<string, unknown>).lizenzen as unknown[])
      : [];
    /* Zweimal dieselbe Sitzung darf nicht zweimal gutschreiben — Stripe schickt Ereignisse
       mehrfach (Skill `bezahlung`, Regel 5). */
    const schonDa = bisher.some(x => (x as { sitzung?: string })?.sitzung === b.sitzung);
    if (!schonDa) {
      await mandantSpeichern(kennung, { ...m, lizenzen: [...bisher, eintrag] } as Parameters<typeof mandantSpeichern>[1]);
    }

    if (!m.mail) { console.warn(`[bestellung] ${kennung} hat keine Adresse — Lizenzmail entfällt`); continue; }
    const T = portalTexte(portalSprache(m.sprache, "ro"));
    const betrag = eur(cents, m.sprache ?? "ro");
    const zeilen = zahlbar.map(p => zeile(p));
    await sendEmail({
      to: m.mail,
      subject: `${betrag} · ${T.lizenzMailBetreff}`,
      html: [
        `<p style="font:16px/1.6 system-ui">${T.lizenzMailHallo.replace("{name}", m.name ?? "")}</p>`,
        `<p style="font:15px/1.6 system-ui">${T.lizenzMailWas.replace("{betrag}", `<b>${betrag}</b>`)}</p>`,
        `<ul style="font:15px/1.7 system-ui">${zeilen.map(z => `<li>${z}</li>`).join("")}</ul>`,
        `<p style="font:15px/1.6 system-ui">${T.lizenzMailWeiter}</p>`,
        `<p style="font:13px/1.6 system-ui;color:#777">${kuenstlerUrl(kennung)}</p>`,
      ].join(""),
      text: `${T.lizenzMailWas.replace("{betrag}", betrag)}\n${zeilen.join("\n")}\n${kuenstlerUrl(kennung)}`,
    }).then(r => console.info(`[bestellung] Lizenzmail an ${kennung}: ${r.ok ? `ok (${r.via})` : `NICHT verschickt — ${r.skipped ?? r.error}`}`));
  }
}

export async function druckBestellungMelden(b: Bestellung): Promise<void> {
  const liste = b.posten.map(zeile);
  /* ZWEI VERSCHIEDENE ANHÄNGE (Owner 16.09.2026: „beides"):
     — an die DRUCKEREI die Blätter der gedruckten Poster, in der bestellten Grösse;
     — an den KÄUFER nur das, was er selbst gekauft hat: die Datei. Wer ein Poster bestellt,
       bekommt Papier, keine PDF — sonst hätte er die Datei umsonst. */
  const anhaenge = await dateiAnhaenge(b, p => p.material === "fisier");
  const druckAnhaenge = await dateiAnhaenge(b, p => p.material !== "fisier");
  const summe = b.betragCents !== undefined
    ? eur(b.betragCents, b.sprache ?? "ro")
    : "—";

  /* ── AN UNS: DER DRUCKAUFTRAG ──────────────────────────────────────────────────────────── */
  const anUns = adminEmails();
  if (anUns.length) {
    /* RUMÄNISCH, WEIL DIE DRUCKEREI SIE LIEST (Owner 16.09.2026: „beides") — diese Mail wird
       weitergeleitet, und der Drucker sitzt in Rumänien. Deutsch stand hier nur, weil sie
       anfangs niemand ausser uns gesehen hat. */
    const html = [
      `<h2 style="font:600 18px/1.3 system-ui">Comandă nouă de tipărire</h2>`,
      `<p style="font:15px/1.6 system-ui">Numărul comenzii <b>${bestellNummer(b.sitzung)}</b> · plătit: <b>${summe}</b><br><span style="color:#777">Stripe: ${b.sitzung}</span></p>`,
      `<ul style="font:15px/1.7 system-ui">${b.posten.map(p => `<li>${zeile(p)}<br><a href="${werkLink(p)}">${werkLink(p)}</a></li>`).join("")}</ul>`,
      druckAnhaenge.length
        ? `<p style="font:15px/1.6 system-ui"><b>Fișierele pentru tipar sunt atașate</b> (${druckAnhaenge.map(a => a.name).join(" · ")}) — PDF gata de tipărit, la mărimea comandată.</p>`
        : `<p style="font:15px/1.6 system-ui;color:#b3261e"><b>Atenție:</b> fișierul pentru tipar nu a putut fi generat — trebuie pregătit manual.</p>`,
      `<p style="font:15px/1.6 system-ui"><b>Adresa de livrare</b><br>${(b.adresse ?? "—").replace(/\n/g, "<br>")}</p>`,
      `<p style="font:15px/1.6 system-ui"><b>Cumpărător</b><br>${b.kaeuferName ?? "—"}<br>${b.kaeuferMail ?? "—"}</p>`,
      `<p style="font:13px/1.6 system-ui;color:#777">Acest e-mail este comanda de tipar — poate fi trimis ca atare tipografiei.</p>`,
    ].join("");
    /* EINE Adresse im `to`, der Rest als Blindkopie: Mehrere Empfänger in einem Feld hat der
       Mailversand als „invalid recipient" abgelehnt — im Testlauf am 16.09.2026 gemessen, und
       der Druckauftrag wäre bei niemandem angekommen. */
    await sendEmail({
      to: anUns[0],
      ...(anUns.length > 1 ? { bcc: anUns.slice(1).join(", ") } : {}),
      subject: `Comandă tipar ${bestellNummer(b.sitzung)} · ${liste.join(" · ")}`,
      html,
      text: `Comanda ${bestellNummer(b.sitzung)} (${summe}) · Stripe ${b.sitzung}\n${liste.join("\n")}\n\nAdresa:\n${b.adresse ?? "—"}\n\nCumpărător: ${b.kaeuferName ?? "—"} ${b.kaeuferMail ?? ""}`,
      ...(druckAnhaenge.length ? { anhaenge: druckAnhaenge } : {}),
      ...(b.kaeuferMail ? { replyTo: b.kaeuferMail } : {}),
    }).then(r => console.info(`[bestellung] Auftragsmail an uns: ${r.ok ? `ok (${r.via})` : `NICHT verschickt — ${r.skipped ?? r.error}`}`))
      .catch(e => console.warn("[bestellung] Auftragsmail an uns gescheitert:", e));
  } else {
    console.warn("[bestellung] KEINE Admin-Adresse gesetzt — der Druckauftrag geht an niemanden.");
  }

  /* ── AN DEN KÜNSTLER: SEINE LIZENZ (Owner 18.09.2026) ───────────────────────────────────
     „Ich weiss, dass Temu dreist die Kunst kopieren und auf T-Shirts drucken und verkaufen. Das
     soll bei uns nicht sein. Wenn wir Produkte anbieten von einem Künstler, dann zahlen wir an
     sie Lizenz." · „Dann müssen wir es einrichten, dass der Künstler eine E-Mail bekommt."

     Zwei Dinge auf einmal: Er ERFÄHRT es (sonst merkt er nie, dass seine Kunst läuft), und es
     wird AUFGESCHRIEBEN (`lizenzen` im Datensatz) — sonst weiss am Monatsende niemand, wem was
     zusteht, und das Siegel „Artist Fair" wäre eine Behauptung. Gemeinfreie Meister haben
     niemanden, der bezahlt wird: sie bleiben aussen vor. */
  await lizenzenGutschreiben(b).catch(e => console.warn("[bestellung] Lizenz nicht verbucht:", e));

  /* ── AN DEN KÄUFER: DIE BESTÄTIGUNG ────────────────────────────────────────────────────── */
  if (!b.kaeuferMail) return;
  const T = KAEUFER[(b.sprache as keyof typeof KAEUFER) in KAEUFER ? (b.sprache as keyof typeof KAEUFER) : "ro"];
  const html = [
    `<p style="font:16px/1.6 system-ui">${T.hallo}</p>`,
    `<p style="font:15px/1.6 system-ui">${T.was}</p>`,
    `<ul style="font:15px/1.7 system-ui">${liste.map(z => `<li>${z}</li>`).join("")}</ul>`,
    `<p style="font:15px/1.6 system-ui">${T.nummer} <b>${bestellNummer(b.sitzung)}</b></p>`,
    `<p style="font:15px/1.6 system-ui">${T.weiter}</p>`,
    /* Nur wenn wirklich eine Datei dabei ist — sonst ist der Satz eine Belehrung ins Leere. */
    ...(b.posten.some(p => p.material === "fisier")
      ? [`<p style="font:14px/1.6 system-ui;color:#555;border-left:3px solid #ddd;padding-left:12px">${T.lizenz}</p>`]
      : []),
    `<p style="font:14px/1.6 system-ui;color:#666">${T.frage}</p>`,
  ].join("");
  await sendEmail({
    to: b.kaeuferMail,
    ...(anhaenge.length ? { anhaenge } : {}),
    subject: T.betreff,
    html,
    text: `${T.hallo}\n\n${T.was}\n${liste.join("\n")}\n\n${T.nummer} ${bestellNummer(b.sitzung)}\n\n${T.weiter}`
      + (b.posten.some(p => p.material === "fisier") ? `\n\n${T.lizenz}` : "")
      + `\n${T.frage}`,
    ...(anUns[0] ? { replyTo: anUns[0] } : {}),
  }).then(r => console.info(`[bestellung] Bestätigung an den Käufer: ${r.ok ? `ok (${r.via})` : `NICHT verschickt — ${r.skipped ?? r.error}`}`))
    .catch(e => console.warn("[bestellung] Bestätigung an den Käufer gescheitert:", e));
}
