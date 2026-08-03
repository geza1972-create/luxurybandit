/**
 * TIPPFEHLER IN DER ADRESSE — vor der Zahlung, nicht danach.
 *
 * Owner 03.08.2026: „sonst zahlt er mit der falschen Email und ist nie wieder drin falls er
 * sich vertippt."
 *
 * Warum das seit heute schwerer wiegt: Die Stripe-Kasse wird mit `customer_email` vorbelegt
 * UND gesperrt. Das ist gut — es nimmt den zweiten Tippfehler ganz weg —, macht aber das eine
 * Feld im Trichter zur einzigen Stelle, an der die Adresse entsteht. Guthaben, bezahltes Video
 * und Galerie haengen alle daran. Ein „gmial.com" ist danach nicht mehr einzufangen: Die Post
 * geht ins Leere, das Geld liegt auf einem Konto, das niemandem gehoert.
 *
 * ES WIRD NICHTS ERZWUNGEN. Der Vorschlag ist ein Angebot, keine Absage — `luxurybandit.de`
 * sieht `luxurybandit.com` sehr aehnlich und ist trotzdem richtig. Wer eine echte, seltene
 * Domain hat, darf nicht ausgesperrt werden, nur weil sie einer bekannten aehnelt.
 */

/**
 * Die Anbieter, bei denen unsere Kunden tatsaechlich sind — sieben Sprachraeume, deshalb auch
 * die franzoesischen, italienischen, spanischen und portugiesischen Haeuser. Eine kurze Liste
 * schlaegt eine lange: Je mehr Domains drinstehen, desto oefter aehnelt eine RICHTIGE Adresse
 * zufaellig einer davon, und ein falscher Vorschlag ist schlimmer als keiner.
 */
const BEKANNTE_DOMAINS = [
  "gmail.com", "googlemail.com", "outlook.com", "outlook.de", "hotmail.com", "hotmail.de",
  "hotmail.fr", "hotmail.it", "hotmail.es", "live.com", "live.de", "live.fr", "msn.com",
  "yahoo.com", "yahoo.de", "yahoo.fr", "yahoo.it", "yahoo.es", "yahoo.co.uk",
  "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com",
  "web.de", "gmx.de", "gmx.net", "gmx.at", "gmx.ch", "t-online.de", "freenet.de",
  "orange.fr", "wanadoo.fr", "free.fr", "sfr.fr", "laposte.net",
  "libero.it", "virgilio.it", "alice.it", "tiscali.it",
  "terra.es", "telefonica.net", "sapo.pt", "yandex.ru",
];

/**
 * Abstand nach Damerau-Levenshtein, gedeckelt.
 *
 * Damerau und nicht das einfache Levenshtein wegen EINER Zeile: dem Vertauscher. „gmx.ed"
 * statt „gmx.de" ist der haeufigste Tippfehler ueberhaupt — zwei benachbarte Zeichen in der
 * falschen Reihenfolge. Levenshtein zaehlt das als ZWEI Aenderungen (loeschen + einfuegen);
 * bei kurzen Domains liegt die Schwelle aber bei eins, und der Vertauscher fiele genau dort
 * durch, wo er am oeftesten vorkommt. Damerau zaehlt ihn als eine.
 */
function abstand(a: string, b: string, deckel = 3): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > deckel) return deckel + 1;
  let vorvorher: number[] = [];
  let vorher = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const jetzt = [i];
    let kleinste = i;
    for (let j = 1; j <= b.length; j++) {
      const kosten = a[i - 1] === b[j - 1] ? 0 : 1;
      let wert = Math.min(vorher[j] + 1, jetzt[j - 1] + 1, vorher[j - 1] + kosten);
      // Der Vertauscher: a[i-1]a[i-2] steht dort, wo b[j-2]b[j-1] stehen sollte.
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        wert = Math.min(wert, vorvorher[j - 2] + 1);
      }
      jetzt.push(wert);
      if (wert < kleinste) kleinste = wert;
    }
    // Ganze Zeile schon ueber dem Deckel → es kann nur noch schlimmer werden.
    if (kleinste > deckel) return deckel + 1;
    vorvorher = vorher;
    vorher = jetzt;
  }
  return vorher[b.length];
}

/**
 * Ein Verbesserungsvorschlag zur Adresse — oder `""`, wenn sie unauffaellig ist.
 *
 * Vorgeschlagen wird nur, was DEUTLICH nach Vertipper aussieht: gleiche Domain bis auf ein bis
 * zwei Zeichen. Ist die Domain exakt eine bekannte, wird nie gemeckert.
 */
export function mailVorschlag(email: string): string {
  const roh = String(email ?? "").trim().toLowerCase();
  const at = roh.lastIndexOf("@");
  if (at <= 0) return "";
  const name = roh.slice(0, at);
  const domain = roh.slice(at + 1);
  if (!name || !domain || !domain.includes(".")) return "";
  if (BEKANNTE_DOMAINS.includes(domain)) return "";

  /**
   * Kurze Domains zuerst schuetzen: Bei „gmx.de" (6 Zeichen) ist ein Abstand von 2 schon ein
   * Drittel des Wortes — da traefe der Vorschlag zu oft daneben. Je kuerzer die Domain, desto
   * strenger die Schwelle.
   */
  let beste = ""; let bester = 99;
  for (const kandidat of BEKANNTE_DOMAINS) {
    const erlaubt = kandidat.length <= 8 ? 1 : 2;
    const d = abstand(domain, kandidat, erlaubt);
    if (d <= erlaubt && d < bester) { bester = d; beste = kandidat; }
  }
  return beste ? `${name}@${beste}` : "";
}
