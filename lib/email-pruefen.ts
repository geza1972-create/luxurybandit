/**
 * DIE ADRESSPRÜFUNG AM EINGANG (Owner 31.07.2026: „ab jetzt prüfen wir Formate der E-Mails.
 * Die die verdächtig sind, da wird nichts erzeugt. Es muss die Meldung stehen dass die
 * E-Mail falsch ist.").
 *
 * WARUM DAS KEINE SCHIKANE IST: Jede erzeugte Vorschau kostet uns Geld, und der Zweck der
 * Adresse ist, das fertige Bild zuzustellen. Eine Wegwerf- oder Phantasieadresse bekommt das
 * Bild nie — wir zahlen also für eine Zustellung, die niemanden erreicht. Schlimmer noch:
 * Jede unzustellbare Mail zählt bei Gmail gegen unseren Ruf als Absender, und ein schlechter
 * Ruf trifft am Ende die Liefermail eines ZAHLENDEN Kunden.
 *
 * WAS DIESE DATEI NICHT TUT: Sie prüft nicht, ob eine Adresse wirklich existiert — das kann
 * man ohne Zustellversuch nicht wissen. Sie erkennt nur, was schon an der Schreibweise
 * erkennbar falsch ist. Im Zweifel LÄSST SIE DURCH: Einen echten Kunden abzuweisen ist
 * teurer als ein verlorenes Vorschaubild.
 */

export type Pruefung = { ok: true } | { ok: false; grund: Grund };
export type Grund = "format" | "wegwerf" | "zahlen" | "land" | "gesperrt";

/**
 * WEGWERFADRESSEN. Die bekannten Anbieter für Zehn-Minuten-Postfächer; wer eine davon
 * benutzt, will das Bild nicht bekommen, sondern nur die Sperre umgehen.
 *
 * Die Liste ist bewusst kurz und enthält nur Domains, deren einziger Zweck das Wegwerfen
 * ist. Eine lange, geratene Liste sperrt irgendwann echte Kunden aus.
 */
const WEGWERF = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.info", "sharklasers.com",
  "10minutemail.com", "10minutemail.net", "tempmail.com", "temp-mail.org", "tempmail.dev",
  "yopmail.com", "yopmail.fr", "throwawaymail.com", "trashmail.com", "trashmail.de",
  "maildrop.cc", "dispostable.com", "getnada.com", "nada.email", "mailnesia.com",
  "fakeinbox.com", "mytemp.email", "moakt.com", "mail.tm", "mailtm.com", "spam4.me",
  "grr.la", "spamgourmet.com", "mailcatch.com", "inboxbear.com", "emailondeck.com",
  "burnermail.io", "anonaddy.me", "incognitomail.com", "spambog.com", "mvrht.net",
]);

/** Unsere eigenen Erfindungen und Platzhalter — nie ein echter Empfänger. */
const GESPERRT = [
  /@(.*\.)?seed\.lb$/i,                 // die Seed-Models (Owner: „seed.lb sperren")
  /@.*\.invalid$/i,                     // RFC 2606, per Norm nie registrierbar
  /@(example\.(com|org|net)|test|localhost|local)$/i,
  /^(no-?reply|postmaster|abuse|admin|webmaster)@/i,
];

/**
 * LÄNDERENDUNGEN, DIE WIR ANNEHMEN (Owner: „komische Länder als Endung … nicht aus der EU,
 * sperren").
 *
 * WICHTIG, damit die Regel nicht das Geschäft erschlägt: Sie gilt NUR für Länderendungen.
 * Alles Allgemeine — .com, .net, .org, .io … — geht immer durch, denn dort wohnen unsere
 * Kunden (gmail.com, yahoo.com, outlook.de wäre .de, aber gmx.net ist .net).
 *
 * Drin sind die EU, dazu die Nachbarn, mit denen wir tatsächlich zu tun haben: Vereinigtes
 * Königreich, Schweiz, Norwegen, Island, Liechtenstein, Serbien, Moldau, Ukraine.
 * Moldau und die Ukraine stehen bewusst dabei — die rumänischen Kunden dieses Portals haben
 * dort Familie.
 *
 * DER PREIS, offen gesagt: Ein echter Kunde aus Brasilien (.br) oder dem Libanon (.lb) käme
 * hier nicht durch. Das ist die Anweisung, und für dieses Portal (Rumänien, EU) trägt sie —
 * aber sie ist eine Geschäftsentscheidung, keine technische. Ändert sich der Markt, ist
 * diese Liste die eine Stelle dafür.
 */
const LAND_OK = new Set([
  // EU
  "at", "be", "bg", "hr", "cy", "cz", "dk", "ee", "fi", "fr", "de", "gr", "hu", "ie",
  "it", "lv", "lt", "lu", "mt", "nl", "pl", "pt", "ro", "sk", "si", "es", "se",
  // EWR + Nachbarn mit echtem Bezug
  "uk", "gb", "ch", "no", "is", "li", "rs", "md", "ua", "eu",
]);

/** Endungen, die kein Land sind — die prüfen wir nicht auf Herkunft. */
const IST_LAENDERENDUNG = (tld: string) => tld.length === 2;

/**
 * ZU VIELE ZAHLEN (Owner: „E-Mails mit vielen Zahlen auch sperren").
 *
 * Gemeint sind Adressen wie `gl12341234123@gmail.com` — genau so eine steht in unserer
 * Liste. Die Grenze ist mit Bedacht gesetzt: Ein Geburtsjahr (`maria1987@`) oder eine kurze
 * Nummer (`ion23@`) sind völlig normal und müssen durch. Verdächtig wird es erst bei
 * SECHS oder mehr Ziffern im Namensteil, oder wenn der Name mehr Zahlen als Buchstaben hat.
 */
function zuVieleZahlen(lokal: string): boolean {
  const ziffern = (lokal.match(/\d/g) ?? []).length;
  const buchstaben = (lokal.match(/[a-z]/gi) ?? []).length;
  if (ziffern >= 6) return true;
  return ziffern > 0 && ziffern > buchstaben;
}

export function pruefeEmail(email: unknown): Pruefung {
  const e = String(email ?? "").trim().toLowerCase();

  // 1) Form. Genau ein @, etwas davor, ein Punkt dahinter, keine Leerzeichen.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return { ok: false, grund: "format" };
  const at = e.lastIndexOf("@");
  const lokal = e.slice(0, at);
  const domain = e.slice(at + 1);
  // Zwei Punkte hintereinander, führender oder schliessender Punkt: kein gültiger Name.
  if (/\.\./.test(e) || lokal.startsWith(".") || lokal.endsWith(".") || domain.startsWith("-")) {
    return { ok: false, grund: "format" };
  }

  // 2) Unsere eigenen Platzhalter und Erfindungen.
  if (GESPERRT.some(r => r.test(e))) return { ok: false, grund: "gesperrt" };

  // 3) Wegwerfpostfächer — inklusive der Fälle, wo der Anbieter eine Unterdomain benutzt.
  const teile = domain.split(".");
  for (let i = 0; i < teile.length - 1; i++) {
    if (WEGWERF.has(teile.slice(i).join("."))) return { ok: false, grund: "wegwerf" };
  }
  if (/(^|\.)(temp|trash|fake|spam|throwaway|burner|incognito|anon)[a-z]*mail/.test(domain)) {
    return { ok: false, grund: "wegwerf" };
  }

  // 4) Zahlenkolonnen im Namensteil.
  if (zuVieleZahlen(lokal)) return { ok: false, grund: "zahlen" };

  // 5) Herkunft — nur bei Länderendungen.
  const tld = teile[teile.length - 1];
  if (IST_LAENDERENDUNG(tld) && !LAND_OK.has(tld)) return { ok: false, grund: "land" };

  return { ok: true };
}

/**
 * DIE MELDUNG FÜR DEN NUTZER (Owner: „es muss die Meldung stehen dass die E-Mail falsch ist").
 *
 * Sie sagt, WAS nicht stimmt, und nennt einen Ausweg. Ein blosses „ungültig" lässt den, der
 * sich nur vertippt hat, ratlos zurück — und der ist der häufigere Fall.
 *
 * Bewusst wird NICHT verraten, welche Regel genau gegriffen hat, wenn es um Wegwerfadressen
 * geht: Wer sie umgehen will, bekommt keine Anleitung dafür.
 */
const TEXTE: Record<string, Record<Grund, string>> = {
  de: {
    format: "Diese E-Mail-Adresse stimmt nicht. Bitte prüfe sie noch einmal — Beispiel: name@gmail.com",
    wegwerf: "Mit einer Wegwerf-Adresse können wir dir dein Bild nicht schicken. Bitte nimm deine richtige E-Mail.",
    zahlen: "Diese Adresse sieht nicht echt aus (zu viele Zahlen). Bitte nimm deine richtige E-Mail.",
    land: "Diese E-Mail-Endung können wir nicht annehmen. Bitte nimm eine gängige Adresse, z. B. Gmail, Yahoo oder Outlook.",
    gesperrt: "Diese E-Mail-Adresse können wir nicht annehmen. Bitte nimm deine richtige E-Mail.",
  },
  en: {
    format: "That email address isn't right. Please check it — example: name@gmail.com",
    wegwerf: "We can't send your picture to a throwaway address. Please use your real email.",
    zahlen: "That address doesn't look real (too many numbers). Please use your real email.",
    land: "We can't accept that email ending. Please use a common address, e.g. Gmail, Yahoo or Outlook.",
    gesperrt: "We can't accept that email address. Please use your real email.",
  },
  ro: {
    format: "Adresa de e-mail nu este corectă. Verific-o te rog — exemplu: nume@gmail.com",
    wegwerf: "Nu îți putem trimite poza pe o adresă temporară. Folosește te rog e-mailul tău real.",
    zahlen: "Adresa nu pare reală (prea multe cifre). Folosește te rog e-mailul tău real.",
    land: "Nu putem accepta această terminație de e-mail. Folosește o adresă obișnuită, de ex. Gmail, Yahoo sau Outlook.",
    gesperrt: "Nu putem accepta această adresă de e-mail. Folosește te rog e-mailul tău real.",
  },
  es: {
    format: "Esa dirección de correo no es correcta. Revísala — ejemplo: nombre@gmail.com",
    wegwerf: "No podemos enviarte tu foto a una dirección temporal. Usa tu correo real.",
    zahlen: "Esa dirección no parece real (demasiados números). Usa tu correo real.",
    land: "No podemos aceptar esa terminación de correo. Usa una dirección común, p. ej. Gmail, Yahoo u Outlook.",
    gesperrt: "No podemos aceptar esa dirección de correo. Usa tu correo real.",
  },
  fr: {
    format: "Cette adresse e-mail n'est pas correcte. Vérifie-la — exemple : nom@gmail.com",
    wegwerf: "Nous ne pouvons pas envoyer ta photo à une adresse jetable. Utilise ton vrai e-mail.",
    zahlen: "Cette adresse ne semble pas réelle (trop de chiffres). Utilise ton vrai e-mail.",
    land: "Nous ne pouvons pas accepter cette terminaison. Utilise une adresse courante, p. ex. Gmail, Yahoo ou Outlook.",
    gesperrt: "Nous ne pouvons pas accepter cette adresse e-mail. Utilise ton vrai e-mail.",
  },
  pt: {
    format: "Esse e-mail não está correto. Verifica — exemplo: nome@gmail.com",
    wegwerf: "Não podemos enviar a tua foto para um endereço descartável. Usa o teu e-mail real.",
    zahlen: "Esse endereço não parece real (números a mais). Usa o teu e-mail real.",
    land: "Não podemos aceitar essa terminação. Usa um endereço comum, p. ex. Gmail, Yahoo ou Outlook.",
    gesperrt: "Não podemos aceitar esse e-mail. Usa o teu e-mail real.",
  },
  it: {
    format: "Questo indirizzo email non è corretto. Controllalo — esempio: nome@gmail.com",
    wegwerf: "Non possiamo inviare la tua foto a un indirizzo usa e getta. Usa la tua email vera.",
    zahlen: "Questo indirizzo non sembra reale (troppi numeri). Usa la tua email vera.",
    land: "Non possiamo accettare questa terminazione. Usa un indirizzo comune, es. Gmail, Yahoo o Outlook.",
    gesperrt: "Non possiamo accettare questo indirizzo email. Usa la tua email vera.",
  },
};

export function emailFehlerText(grund: Grund, lang?: string): string {
  const l = String(lang ?? "en").slice(0, 2).toLowerCase();
  return (TEXTE[l] ?? TEXTE.en)[grund] ?? (TEXTE[l] ?? TEXTE.en).format;
}
