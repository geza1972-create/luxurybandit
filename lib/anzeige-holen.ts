/**
 * EINE STELLENANZEIGE HINTER EINER ADRESSE HOLEN (Owner 29.08.2026: „hatten wir das hier
 * nicht so, dass er auch einen Link einfügen kann?").
 *
 * DIE ZUSAGE STAND SCHON DA, NUR EINGELÖST WAR SIE NICHT: Über dem Feld steht „Füge die
 * Anzeige ein ODER GIB DIE ADRESSE AN" — der Server nahm aber ausschliesslich Text und wies
 * eine eingefügte Adresse mit „Das ist mir zu wenig Text" ab. Wer der Aufforderung folgte,
 * bekam eine Absage; schlimmer als gar kein Angebot.
 *
 * ── DIE SICHERHEITSFRAGE, DIE HIER ENTSCHEIDET ──
 * Unser Server holt eine Adresse, die ein FREMDER eingibt. Ohne Schranke liesse sich er
 * damit als Fernrohr ins eigene Netz benutzen: `http://localhost:...`, interne Adressen,
 * Cloud-Metadaten (169.254.169.254) — Dinge, die von aussen nicht erreichbar sind, von
 * unserem Server aber schon. Deshalb: nur http/https, keine privaten oder lokalen Adressen,
 * harte Zeitgrenze, harte Grössengrenze, und wir folgen keiner Weiterleitung ins Verbotene
 * (`redirect: "follow"` prüft am Ende erneut die Zieladresse).
 *
 * WAS SIE NICHT KANN: Seiten, die ihren Inhalt erst im Browser zusammenbauen (viele grosse
 * Jobbörsen), und Seiten hinter Anmeldung. Dann kommt zu wenig Text zurück — und der
 * Aufrufer sagt ehrlich „kopier den Text bitte hinein", statt ein leeres Ergebnis
 * weiterzureichen.
 */

const VERBOTEN = [
  /^localhost$/i, /^127\./, /^0\./, /^10\./, /^192\.168\./, /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./, /^\[?::1\]?$/, /\.local$/i, /^0x/i,
];

function adresseErlaubt(u: URL): boolean {
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const host = u.hostname.replace(/^\[|\]$/g, "");
  return !VERBOTEN.some(r => r.test(host));
}

/** Sieht der eingegebene Text nach einer blossen Adresse aus — und nicht nach einer Anzeige? */
export function istAdresse(text: string): boolean {
  const t = String(text || "").trim();
  if (!/^https?:\/\/\S+$/i.test(t)) return false;
  /* Eine Anzeige, die zufällig mit einer Adresse beginnt, hat Leerzeichen und Zeilen —
     eine reine Adresse hat keine. */
  return !/\s/.test(t) && t.length < 2000;
}

export async function anzeigeAusAdresse(adresse: string): Promise<{ text: string } | { fehler: string }> {
  let u: URL;
  try { u = new URL(adresse.trim()); } catch { return { fehler: "adresse" }; }
  if (!adresseErlaubt(u)) return { fehler: "adresse" };

  const abbruch = new AbortController();
  const wecker = setTimeout(() => abbruch.abort(), 12_000);
  try {
    const res = await fetch(u.toString(), {
      signal: abbruch.signal,
      redirect: "follow",
      headers: {
        /* Ohne erkennbaren Browser antworten viele Seiten mit einer Sperrseite. */
        "User-Agent": "Mozilla/5.0 (compatible; LuxuryBandit/1.0; +https://luxurybandit.com)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "de,en;q=0.8",
      },
    });
    /* Nach allen Weiterleitungen noch einmal prüfen — eine harmlose Adresse kann auf eine
       interne zeigen. */
    try { if (!adresseErlaubt(new URL(res.url))) return { fehler: "adresse" }; } catch { /* dann gilt die erste */ }
    if (!res.ok) return { fehler: "nicht-erreichbar" };
    const typ = res.headers.get("content-type") || "";
    if (!/text\/html|text\/plain|application\/xhtml/i.test(typ)) return { fehler: "kein-text" };

    /* Grössengrenze: 2 MB reichen für jede Anzeige, und ein versehentlich verlinktes Archiv
       darf uns nicht den Speicher füllen. */
    const roh = (await res.text()).slice(0, 2_000_000);
    const text = alsText(roh);
    if (text.length < 200) return { fehler: "zu-wenig" };
    return { text: text.slice(0, 20_000) };
  } catch {
    return { fehler: "nicht-erreichbar" };
  } finally {
    clearTimeout(wecker);
  }
}

/**
 * HTML zu lesbarem Text — ohne Fremdbibliothek.
 *
 * Skripte, Stile, Kopf- und Fussbereiche fliegen zuerst raus: Was dort steht (Menüs,
 * Cookie-Banner, „ähnliche Jobs"), verwässert die Anzeige und kostet uns später Modell-Token
 * für Text, den niemand braucht.
 */
function alsText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<(nav|header|footer|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    /* Blockenden ergeben Zeilenumbrüche — sonst klebt „AufgabenDeine Aufgaben" zusammen. */
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
    .replace(/[ \t ]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}
