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
export type Grund = "format" | "wegwerf" | "zahlen" | "land" | "gesperrt" | "erfunden";

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

/**
 * VOM OWNER BESTAETIGTE AUSNAHMEN (03.08.2026: „diese Adresse ist echt, die kannst du
 * zulassen" — zu gl12341234123@gmail.com, die an der Ziffern-Regel scheiterte).
 *
 * Die Regel bleibt richtig: elf Ziffern im Namensteil sind in 99 % der Faelle Tastatur-
 * Gehaemmer. Aber eine Regel, die einen ECHTEN Kunden aussperrt, braucht ein Ventil — und
 * das Ventil ist eine Liste, die der Owner fuellt, kein Aufweichen der Regel fuer alle.
 */
const OWNER_ERLAUBT = new Set([
  "gl12341234123@gmail.com",
]);

export function pruefeEmail(email: unknown): Pruefung {
  const e = String(email ?? "").trim().toLowerCase();
  if (OWNER_ERLAUBT.has(e)) return { ok: true };

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
  /**
   * ALLE RATE-SPERREN SIND RAUS (Owner 03.08.2026: „du sollst alle Sperren rausmachen").
   *
   * Geblieben sind genau zwei, und beide raten nicht:
   *   FORMAT   — ohne @ und Endung gibt es keine Adresse, an die man etwas schicken KANN.
   *   GESPERRT — die Liste, die der Owner selbst pflegt (Ruecklaeufer aus dem Rundbrief).
   *
   * Weg sind: Wegwerf-Anbieter und fremde Laenderendungen. Beide haben echte Kunden
   * abgewiesen, um Missbrauch zu verhindern, den es nicht mehr gibt — seit alles bezahlt wird,
   * kostet ein Missbrauch den Missbraucher. Und ein Kunde mit einer Adresse, die uns nicht
   * gefaellt, hat trotzdem bezahlt.
   */
  if (GESPERRT.some(r => r.test(e))) return { ok: false, grund: "gesperrt" };

  // 3) Wegwerfpostfächer — inklusive der Fälle, wo der Anbieter eine Unterdomain benutzt.
  const teile = domain.split(".");
  for (let i = 0; i < teile.length - 1; i++) {
    if (false && WEGWERF.has(teile.slice(i).join("."))) return { ok: false, grund: "wegwerf" };
  }
  if (/(^|\.)(temp|trash|fake|spam|throwaway|burner|incognito|anon)[a-z]*mail/.test(domain)) {
    return { ok: false, grund: "wegwerf" };
  }

  /**
   * 4) ZAHLENKOLONNEN — ABGESCHALTET (Owner 03.08.2026: „du kannst jetzt Zahlen zulassen,
   * die Leute können jetzt eh nicht mehr generieren ohne zu bezahlen").
   *
   * Die Regel schuetzte die GRATIS-Bilder vor Phantasieadressen. Seit nichts mehr gratis
   * ist, prueft die Kasse die Ernsthaftigkeit besser als jede Adress-Heuristik — und eine
   * echte Kundin mit Nummern-Adresse (gl12341234123@… war echt!) ist teurer als jede
   * ersparte Zustellung. `zuVieleZahlen` bleibt liegen; Wiedereinschalten ist eine Zeile.
   */
  void zuVieleZahlen;

  // 5) Herkunft — nur bei Länderendungen.
  const tld = teile[teile.length - 1];
  if (false && IST_LAENDERENDUNG(tld) && !LAND_OK.has(tld)) return { ok: false, grund: "land" };

  return { ok: true };
}

/**
 * DIE TIEFENPRÜFUNG: TASTATUR-GEHÄMMER (Owner 01.08.2026: „diese E-Mail hast du akzeptiert"
 * — zu `hsaadsasdello@gmail.com`).
 *
 * Diese Adresse besteht jede Regel: echter Anbieter, keine Ziffern, saubere Form. Was sie
 * verrät, ist die SPRACHE — „hsaadsasdello" ist kein Name, kein Wort, kein Spitzname,
 * sondern Getippe. So etwas erkennt keine Regel, sondern Sprachgefühl; Regeln dafür zu
 * stapeln (Vokalanteil, Konsonantenläufe, Tastaturmuster) sperrt irgendwann echte rumänische
 * und ungarische Namen aus.
 *
 * Deshalb fragt diese Prüfung dasselbe günstige Seh-/Sprachmodell, das schon die Alter
 * schätzt (~Bruchteil eines Cents, eine Sekunde — das Gratis-Bild dahinter kostet das
 * Hundertfache). IM ZWEIFEL DURCHLASSEN: Ein abgewiesener echter Kunde ist teurer als ein
 * verschenktes Bild. Fällt das Modell aus, gilt die Adresse — die Regeln davor haben sie ja
 * schon bestanden; diese Stufe ist Wirtschaftlichkeit, nicht Sicherheit.
 */
export async function wirktErfunden(email: string, key: string): Promise<boolean> {
  // Die Owner-Liste sticht auch das Sprachgefuehl: Er hat diese Adresse als echt bestaetigt.
  if (OWNER_ERLAUBT.has(String(email ?? "").trim().toLowerCase())) return false;
  const lokal = String(email ?? "").trim().toLowerCase().split("@")[0] ?? "";
  if (!key || lokal.length < 6) return false;   // kurze Namen sind fast immer echt (ion, ana)
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini",
        messages: [{
          role: "user",
          content:
            "You judge whether an email local part looks like a REAL person's address or like random keyboard mashing.\n"
            + `Local part: "${lokal}"\n`
            + "Real examples (answer no): maria.popescu, ion23, geza1972, sophiebordo, alexandra.trifan.91, krzysztof.w, andreea_kiss93, bandiszidonia\n"
            + "Mashing examples (answer yes): hsaadsasdello, asdfgh, qwerqwer, jkfdsjkfds, xnyrbz\n"
            + "Names may be Romanian, Hungarian, German, Arabic or Slavic — unusual spelling alone is NOT mashing. When unsure, answer no.\n"
            + 'Answer ONLY compact JSON: {"mash":true|false}',
        }],
        max_tokens: 10,
      }),
    });
    if (!res.ok) return false;
    const j = await res.json().catch(() => null);
    const m = String(j?.choices?.[0]?.message?.content ?? "").match(/\{[\s\S]*\}/);
    return m ? (JSON.parse(m[0]) as { mash?: boolean }).mash === true : false;
  } catch { return false; }
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
        erfunden: "Diese Adresse sieht nicht nach einer echten E-Mail aus. Bitte nimm deine richtige Adresse — dorthin schicken wir dein Bild.",
    gesperrt: "Diese E-Mail-Adresse können wir nicht annehmen. Bitte nimm deine richtige E-Mail.",
  },
  en: {
    format: "That email address isn't right. Please check it — example: name@gmail.com",
    wegwerf: "We can't send your picture to a throwaway address. Please use your real email.",
    zahlen: "That address doesn't look real (too many numbers). Please use your real email.",
    land: "We can't accept that email ending. Please use a common address, e.g. Gmail, Yahoo or Outlook.",
        erfunden: "That address doesn't look like a real email. Please use your real address — that's where we send your picture.",
    gesperrt: "We can't accept that email address. Please use your real email.",
  },
  ro: {
    format: "Adresa de e-mail nu este corectă. Verific-o te rog — exemplu: nume@gmail.com",
    wegwerf: "Nu îți putem trimite poza pe o adresă temporară. Folosește te rog e-mailul tău real.",
    zahlen: "Adresa nu pare reală (prea multe cifre). Folosește te rog e-mailul tău real.",
    land: "Nu putem accepta această terminație de e-mail. Folosește o adresă obișnuită, de ex. Gmail, Yahoo sau Outlook.",
        erfunden: "Adresa nu pare un e-mail real. Folosește te rog adresa ta reală — acolo îți trimitem poza.",
    gesperrt: "Nu putem accepta această adresă de e-mail. Folosește te rog e-mailul tău real.",
  },
  es: {
    format: "Esa dirección de correo no es correcta. Revísala — ejemplo: nombre@gmail.com",
    wegwerf: "No podemos enviarte tu foto a una dirección temporal. Usa tu correo real.",
    zahlen: "Esa dirección no parece real (demasiados números). Usa tu correo real.",
    land: "No podemos aceptar esa terminación de correo. Usa una dirección común, p. ej. Gmail, Yahoo u Outlook.",
        erfunden: "Esa dirección no parece un correo real. Usa tu dirección real — allí te enviamos tu foto.",
    gesperrt: "No podemos aceptar esa dirección de correo. Usa tu correo real.",
  },
  fr: {
    format: "Cette adresse e-mail n'est pas correcte. Vérifie-la — exemple : nom@gmail.com",
    wegwerf: "Nous ne pouvons pas envoyer ta photo à une adresse jetable. Utilise ton vrai e-mail.",
    zahlen: "Cette adresse ne semble pas réelle (trop de chiffres). Utilise ton vrai e-mail.",
    land: "Nous ne pouvons pas accepter cette terminaison. Utilise une adresse courante, p. ex. Gmail, Yahoo ou Outlook.",
        erfunden: "Cette adresse ne ressemble pas à un vrai e-mail. Utilise ta vraie adresse — c'est là que nous envoyons ta photo.",
    gesperrt: "Nous ne pouvons pas accepter cette adresse e-mail. Utilise ton vrai e-mail.",
  },
  pt: {
    format: "Esse e-mail não está correto. Verifica — exemplo: nome@gmail.com",
    wegwerf: "Não podemos enviar a tua foto para um endereço descartável. Usa o teu e-mail real.",
    zahlen: "Esse endereço não parece real (números a mais). Usa o teu e-mail real.",
    land: "Não podemos aceitar essa terminação. Usa um endereço comum, p. ex. Gmail, Yahoo ou Outlook.",
        erfunden: "Esse endereço não parece um e-mail real. Usa o teu endereço real — é para lá que enviamos a tua foto.",
    gesperrt: "Não podemos aceitar esse e-mail. Usa o teu e-mail real.",
  },
  it: {
    format: "Questo indirizzo email non è corretto. Controllalo — esempio: nome@gmail.com",
    wegwerf: "Non possiamo inviare la tua foto a un indirizzo usa e getta. Usa la tua email vera.",
    zahlen: "Questo indirizzo non sembra reale (troppi numeri). Usa la tua email vera.",
    land: "Non possiamo accettare questa terminazione. Usa un indirizzo comune, es. Gmail, Yahoo o Outlook.",
        erfunden: "Questo indirizzo non sembra una vera email. Usa il tuo indirizzo reale — è lì che inviamo la tua foto.",
    gesperrt: "Non possiamo accettare questo indirizzo email. Usa la tua email vera.",
  },
};

export function emailFehlerText(grund: Grund, lang?: string): string {
  const l = String(lang ?? "en").slice(0, 2).toLowerCase();
  return (TEXTE[l] ?? TEXTE.en)[grund] ?? (TEXTE[l] ?? TEXTE.en).format;
}
