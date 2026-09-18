import { sendEmail } from "@/lib/email-send";
import { mailHuelle, mailText, mailKasten, mailFein } from "@/lib/versusforge-mail-huelle";
import { eur, VERSUSFORGE_ABO_CENTS } from "@/lib/pricing";
import { DRUCK_KUENSTLER_CENTS } from "@/lib/lakatosbandi-druck";
import { kandidatLesen, kandidatAendern, schonGeschrieben } from "@/lib/kuenstler-kandidaten";

/**
 * DAS ANSCHREIBEN AN EINEN KÜNSTLER, DER UNS NICHT KENNT (Owner 16.09.2026).
 *
 * ── DER BEWEIS STEHT VOR DEM ANGEBOT ────────────────────────────────────────────────────────
 *
 * Zuerst sein eigenes Werk, fertig als Living Poster — das kann kein anderer Absender in seinem
 * Postfach. Erst danach, wer wir sind und was es kostet. Wer umgekehrt anfängt, ist die elfte
 * Werbemail des Tages.
 *
 * ── VAN GOGH, ABER RICHTIG HERUM (Owner 16.09.2026: „Van Gogh war ein Niemand zu seiner Zeit …
 * warum ist er trotzdem bekannt geworden?") ─────────────────────────────────────────────────
 *
 * Nicht „du bist wie van Gogh" — das ist Schmeichelei und jeder durchschaut sie. Sondern: Van
 * Gogh hat es NICHT allein geschafft. Nach seinem Tod hat die Witwe seines Bruders zwanzig
 * Jahre lang seine Bilder verschickt und seine Briefe herausgegeben; deshalb kennt man ihn.
 * Das ist die Rolle, die wir anbieten — und der einzige Teil, den ein Maler nicht selbst machen
 * kann, während er malt.
 *
 * ── DREI ZUSAGEN, DIE DER CODE EINHÄLT ──────────────────────────────────────────────────────
 *
 * 1. „Niemand ausser dir hat es gesehen" — die vorbereitete Seite steht auf `portal: false`.
 * 2. „Sagst du nein, löschen wir es" — der Nein-Link löscht wirklich (`loeschSchluessel`).
 * 3. „Du bekommst keine zweite" — `schonGeschrieben` sperrt jeden weiteren Versand an diese
 *    Adresse, und es gibt kein Nachfassen. Eine Zusage, die nur im Text steht, ist keine.
 *
 * KEINE ZAHL STEHT IM TEXT: Abo und Künstleranteil kommen aus der Preistabelle (Skill
 * `bezahlung`, Regel 2).
 */

type Sprache = "ro" | "de" | "en";

const TEXTE = {
  ro: {
    betreff: (t: string) => `${t ? `„${t}"` : "Lucrarea ta"} — tipărită ca la muzeu`,
    hallo: (n: string) => `Bună, ${n},`,
    fund: (t: string, q: string) =>
      `Am văzut ${t ? `„${t}"` : "lucrarea ta"} pe ${q}. Mi-am permis ceva fără să te întreb: am pus-o pe hârtie exact așa cum tipărim lucrările lui van Gogh. Același format, aceeași ramă, aceleași litere, același cod QR. Scanează-l și îți spune povestea lucrării, cu muzică.`,
    knopf: "Vezi pagina ta",
    still: "Nu a văzut-o nimeni în afară de tine. Nu apare nicăieri pe site și nu o găsește nimeni pe Google. Dacă spui nu, o ștergem.",
    gogh: "Van Gogh n-a reușit singur. A murit sărac, aproape fără să vândă ceva. Ce a urmat n-a făcut el: văduva fratelui său a trimis tablourile la expoziții douăzeci de ani și i-a publicat scrisorile. De asta îl știi azi.",
    wir: "Tablourile tale sunt deja pictate. Lipsește partea de după: fraza care spune ce e în lucrare, omul care răspunde când cineva întreabă de preț, posterele tipărite și trimise. Asta facem noi. Tu pictezi.",
    preis: (abo: string, anteil: string) =>
      `Pagina ta e gata, sub numele tău, în trei limbi. Până la 10 lucrări, gratuit. Dacă rămâi, ${abo} pe lună — iar pentru fiecare poster vândut primești ${anteil}, care se adaugă la prețul nostru, nu se scad din al tău.`,
    schluss: "Dacă nu te interesează, ignoră mesajul. Nu primești altul.",
    warum: "Primești acest mesaj pentru că lucrarea ta e publicată public, cu o adresă de contact.",
    nein: "Nu mă interesează — ștergeți pagina",
  },
  de: {
    betreff: (t: string) => `${t ? `„${t}"` : "Dein Werk"} — gedruckt wie im Museum`,
    hallo: (n: string) => `Hallo ${n},`,
    fund: (t: string, q: string) =>
      `ich habe ${t ? `„${t}"` : "dein Werk"} auf ${q} gesehen. Ich habe mir etwas erlaubt, ohne zu fragen: Ich habe es aufs Papier gebracht, genau so, wie wir van Goghs Werke drucken. Gleiches Format, gleicher Rahmen, gleiche Schrift, gleicher QR-Code. Wer ihn scannt, hört die Geschichte des Werks, mit Musik.`,
    knopf: "Sieh deine Seite an",
    still: "Niemand ausser dir hat sie gesehen. Sie steht nirgends auf der Seite und ist bei Google nicht zu finden. Sagst du nein, löschen wir sie.",
    gogh: "Van Gogh hat es nicht allein geschafft. Er starb arm und hat fast nichts verkauft. Was danach kam, hat nicht er gemacht: Die Witwe seines Bruders hat seine Bilder zwanzig Jahre lang zu Ausstellungen geschickt und seine Briefe herausgegeben. Deshalb kennst du ihn heute.",
    wir: "Deine Bilder sind gemalt. Es fehlt der Teil danach: der Satz, der sagt, was in dem Werk steckt; der Mensch, der antwortet, wenn jemand nach dem Preis fragt; die Poster, gedruckt und verschickt. Das machen wir. Du malst.",
    preis: (abo: string, anteil: string) =>
      `Deine Seite steht, unter deinem Namen, in drei Sprachen. Bis zehn Werke kostenlos. Bleibst du, ${abo} im Monat — und für jedes verkaufte Poster bekommst du ${anteil}, die auf unseren Preis draufkommen, nicht von deinem abgehen.`,
    schluss: "Kein Interesse? Ignorier die Mail. Du bekommst keine zweite.",
    warum: "Du bekommst diese Mail, weil dein Werk öffentlich steht, mit einer Kontaktadresse.",
    nein: "Kein Interesse — Seite löschen",
  },
  en: {
    betreff: (t: string) => `${t ? `“${t}”` : "Your work"} — printed like a museum print`,
    hallo: (n: string) => `Hello ${n},`,
    fund: (t: string, q: string) =>
      `I saw ${t ? `“${t}”` : "your work"} on ${q}. I took a liberty without asking: I put it on paper exactly the way we print van Gogh. Same format, same frame, same lettering, same QR code. Scan it and it tells the story of the work, with music.`,
    knopf: "See your page",
    still: "Nobody but you has seen it. It is nowhere on the site and Google cannot find it. Say no and we delete it.",
    gogh: "Van Gogh did not do it alone. He died poor, having sold almost nothing. What came after was not his doing: his brother's widow sent his paintings to exhibitions for twenty years and published his letters. That is why you know him today.",
    wir: "Your paintings are painted. What is missing is the part after: the sentence that says what is in the work, the person who answers when someone asks the price, the posters printed and sent. That is what we do. You paint.",
    preis: (abo: string, anteil: string) =>
      `Your page is ready, under your name, in three languages. Up to ten works, free. If you stay, ${abo} a month — and for every poster sold you get ${anteil}, added on top of our price, not taken out of yours.`,
    schluss: "Not interested? Ignore this. You will not get a second one.",
    warum: "You are getting this because your work is published publicly, with a contact address.",
    nein: "Not interested — delete the page",
  },
} as const;

const sprache = (s: string): Sprache => (s === "de" || s === "en" ? s : "ro");

export type WerbungErgebnis = { ok: true } | { ok: false; grund: string };

/**
 * EINE Mail an EINEN Kandidaten. Kein Rundbrief: Jede trägt sein Werk, seinen Satz und seine
 * Seite — was für alle gleich wäre, wäre wieder nur Werbung.
 */
export async function werbungSchicken(id: string): Promise<WerbungErgebnis> {
  const k = await kandidatLesen(id);
  if (!k) return { ok: false, grund: "unbekannt" };
  if (!k.link || !k.kennung) return { ok: false, grund: "nicht-vorbereitet" };
  if (k.abgelehntAm) return { ok: false, grund: "abgelehnt" };
  if (k.geschicktAm) return { ok: false, grund: "schon-geschickt" };
  /* Dieselbe Adresse kann über zwei Quellen in die Liste geraten sein. */
  if (await schonGeschrieben(k.mail)) return { ok: false, grund: "adresse-schon-angeschrieben" };

  const L = sprache(k.sprache);
  const T = TEXTE[L];
  const abo = eur(VERSUSFORGE_ABO_CENTS, L);
  const anteil = eur(DRUCK_KUENSTLER_CENTS, L);
  /* Der Nein-Knopf ist derselbe Weg, den jeder Künstler für seine Seite hat — mit seinem
     Löschschlüssel, also echt löschend und nicht nur abbestellend. */
  const neinLink = k.loeschLink ?? "";

  const html = mailHuelle(
    [
      mailText(T.hallo(k.name)),
      mailText(T.fund(k.werkTitel ?? "", k.quelle)),
      mailKasten("", T.still, { adresse: k.link, wort: T.knopf }),
      mailText(T.gogh),
      mailText(T.wir),
      mailText(T.preis(abo, anteil)),
      mailFein(T.schluss),
    ].join(""),
    neinLink || undefined,
    { grund: T.warum, loeschen: T.nein },
    "lakatosbandi",
  );

  /* VERMERKT WIRD VOR DEM VERSAND. Scheitert die Zustellung, bleibt der Vermerk stehen — lieber
     eine Mail zu wenig als eine zweite an denselben Menschen, nachdem wir ihm versprochen
     haben, dass keine kommt. */
  await kandidatAendern(id, { geschicktAm: new Date().toISOString() });

  const res = await sendEmail({
    to: k.mail,
    subject: T.betreff(k.werkTitel ?? ""),
    html,
    /* Antworten landen bei einem Menschen, nicht im Werbepostfach. */
    replyTo: process.env.WERBUNG_ANTWORT?.trim() || undefined,
    /* Das eigene Postfach — ohne es geht gar nichts raus (siehe `MailKonto` in email-send). */
    konto: "werbung",
    absender: "Geza Lakatos · lakatosbandi.com",
    listUnsubscribe: neinLink,
  });
  if (!res.ok) {
    console.warn("[werbung] nicht verschickt:", k.mail, res.skipped ?? res.error);
    return { ok: false, grund: res.skipped ?? "nicht-verschickt" };
  }
  return { ok: true };
}
