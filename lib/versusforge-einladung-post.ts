import { sendEmail } from "@/lib/email-send";
import { mailHuelle, mailTitel, mailText, mailKasten, mailFein } from "@/lib/versusforge-mail-huelle";
import { portalSprache } from "@/lib/lakatosbandi-texte";

/**
 * DIE EINLADUNG AN WEN AUS DEM SOFORTFORMULAR KOMMT (Owner 14.09.2026, Weg B: „B" — abholen
 * statt Webhook).
 *
 * ── WOFÜR SIE DA IST ────────────────────────────────────────────────────────────────────────
 *
 * Im Sofortformular gibt jemand Name und Adresse und schliesst es wieder. Er war nie auf
 * unserer Seite. Diese Mail ist der einzige Weg, ihn dorthin zu holen — und sie trägt SEINE
 * KENNUNG im Link (`?l=…`, lib/kuenstler-lead.ts). Klickt er, weiss der Trichter, wer er ist:
 * keine zweite Abfrage von Name und Adresse, obwohl wir beides längst haben.
 *
 * ── WARUM SIE SCHNELL RAUS MUSS ─────────────────────────────────────────────────────────────
 *
 * Der Abholer läuft alle 15 Minuten (vercel.json). Eine Mail, die 20 Minuten nach der Anzeige
 * kommt, wird gelesen; eine, die am nächsten Tag kommt, nicht. Deshalb der kurze Takt — nicht
 * weil die Daten sonst verloren gingen.
 *
 * ── DER TON ─────────────────────────────────────────────────────────────────────────────────
 *
 * Kein „Danke für dein Interesse". Er hat eine Analyse für sein Bild angefordert; die Mail sagt
 * in einem Satz, was ihn erwartet, und zeigt den Knopf. Rumänisch ist die Regel, nicht die
 * Ausnahme — die Anzeige läuft in Rumänien.
 */

const MAIL = {
  ro: {
    betreff: "Analiza ta gratuită — încarcă tabloul",
    titel: "Gata de analiză",
    text: "Ai cerut o analiză gratuită pentru tabloul tău. Apasă butonul, încarcă lucrarea și primești pe loc fraza care o vinde, publicul căruia i te adresezi și pagina ta de artist.",
    knopf: "Începe analiza",
    kasten: "Nu trebuie să completezi nimic — te cunoaștem deja din formular.",
    fein: "Ai primit acest e-mail pentru că ai completat formularul nostru pe Facebook sau Instagram. Dacă nu ai fost tu, ignoră-l.",
  },
  de: {
    betreff: "Deine kostenlose Analyse — lade dein Werk hoch",
    titel: "Bereit für die Analyse",
    text: "Du hast eine kostenlose Analyse für dein Bild angefordert. Drück auf den Knopf, lade dein Werk hoch, und du bekommst sofort den Satz, der es verkauft, dein Publikum und deine Künstlerseite.",
    knopf: "Analyse starten",
    kasten: "Du musst nichts ausfüllen — wir kennen dich schon aus dem Formular.",
    fein: "Du bekommst diese Mail, weil du unser Formular auf Facebook oder Instagram ausgefüllt hast. Warst du das nicht, ignoriere sie einfach.",
  },
  en: {
    betreff: "Your free analysis — upload your work",
    titel: "Ready for your analysis",
    text: "You asked for a free analysis of your painting. Hit the button, upload your work, and you get the line that sells it, your audience and your artist page — right away.",
    knopf: "Start the analysis",
    kasten: "Nothing to fill in — we already know you from the form.",
    fein: "You received this because you filled in our form on Facebook or Instagram. If that wasn't you, ignore this email.",
  },
} as const;

/** Die Adresse des Trichters mit seiner Kennung. `/start` ist ein Rewrite auf `/engine`
 *  (next.config.mjs) — die Parameter reisen mit. */
export function einladungsLink(kennung: string, sprache: string): string {
  const l = portalSprache(sprache, "ro");
  return `https://lakatosbandi.com/start?lang=${encodeURIComponent(l)}&l=${encodeURIComponent(kennung)}`;
}

export async function einladungSchicken(o: {
  mail: string;
  name: string;
  /** Die Kennung aus `leadAnlegen` — ohne sie hätte der Link keinen Zweck. */
  kennung: string;
  sprache: string;
}): Promise<boolean> {
  const mail = String(o.mail ?? "").trim().toLowerCase().slice(0, 200);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return false;
  if (!o.kennung) return false;

  const L = portalSprache(o.sprache, "ro");
  const T = MAIL[L as keyof typeof MAIL] ?? MAIL.ro;
  const adresse = einladungsLink(o.kennung, o.sprache);

  const inhalt = mailTitel(T.titel)
    + mailText(T.text)
    + mailKasten(o.name || T.titel, T.kasten, { adresse, wort: T.knopf })
    + mailFein(T.fein);

  const res = await sendEmail({
    konto: "versusforge",
    to: mail,
    subject: T.betreff,
    /* MARKE LAKATOSBANDI, nicht VersusForge: Er ist einer Anzeige von lakatosbandi.com gefolgt
       und hat von „MARKETING ENGINE" nie gehört — siehe Begründung in versusforge-mail-huelle.ts. */
    html: mailHuelle(inhalt, undefined, undefined, "lakatosbandi"),
  });
  if (!res.ok) console.error("[versusforge-einladung] Versand gescheitert:", res.error);
  return res.ok;
}
