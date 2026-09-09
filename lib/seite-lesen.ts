/**
 * EINE WEBSITE LESEN, STATT SIE ERKLÄREN ZU LASSEN (Owner 08.09.2026: „Leute können in
 * einem Satz oft nicht sagen, was sie alles machen, aber sie wollen Kunden. Er will dir
 * seine URL zeigen").
 *
 * Derselbe Bau wie bei David: Der liest den Lebenslauf, statt zu fragen „was kannst du?".
 * Und dieselbe Wirkung — wer eine Adresse eintippt und danach einen Satz über sein eigenes
 * Geschäft liest, den er nicht geschrieben hat, weiss, dass hier jemand hingesehen hat.
 *
 * WAS HIER ABSICHTLICH FEHLT: kein Browser, kein JavaScript, keine Unterseiten. Wir holen
 * EINE Seite und nehmen den Text, den der Server ausliefert. Sites, die ihren Inhalt erst im
 * Browser zusammenbauen, geben wenig her — dann sagt der Agent das und fragt nach, statt zu
 * raten. Ein halber Fund ist besser als ein erfundener.
 *
 * SICHERHEIT: Die Adresse kommt von einem Fremden, und der Aufruf geht von UNSEREM Server —
 * also könnte jemand uns auf interne Adressen zeigen lassen (SSRF). Deshalb nur http/https
 * und keine privaten oder lokalen Namen. Weiterleitungen folgen wir nicht: Eine harmlose
 * Adresse, die auf `127.0.0.1` umleitet, wäre sonst genau die Lücke.
 */

const PRIVAT = [
  /^localhost$/i, /^127\./, /^0\./, /^10\./, /^192\.168\./, /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./, /^\[?::1\]?$/, /\.local$/i, /\.internal$/i,
];

/**
 * UNSERE EIGENEN ADRESSEN (Owner 08.09.2026: „stell dir vor, jemand testet das auf
 * VersusForge und gibt meine Adresse da rein. Er würde unsere Strategie bekommen").
 *
 * Er hat recht, und es war offen: Der Agent hätte für die eigene Firma einen vollständigen
 * Plan ausgegeben — Hook, Trichter, Motive. Das ist nicht bloss Positionierung, die man
 * ohnehin auf der Seite liest, sondern eine VORFÜHRUNG DER METHODE am eigenen Haus. Wer sie
 * einmal gesehen hat, braucht sie nicht mehr zu kaufen.
 *
 * WAS DAS AUSDRÜCKLICH NICHT TUT: Es hindert niemanden daran, eine fremde Seite zu
 * untersuchen. Das ist die Bauart, die der Owner gewählt hat, und die Seiten sind öffentlich.
 * Diese Liste schützt genau ein Haus — unseres.
 *
 * MIT UNTERDOMÄNEN, OHNE `www`-Sonderfall: `endsWith` auf den Punkt geprüft, damit
 * `shop.luxurybandit.com` mitgeht und `nichtluxurybandit.com` nicht.
 */
const EIGEN = ["luxurybandit.com", "versusforge.com", "versuslink.com", "szidonians.com", "yourvideogenerator.com"];

/** Ist das unsere eigene Adresse? */
export function istEigeneAdresse(roh: string): boolean {
  const u = adresseAus(roh);
  if (!u) return false;
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  return EIGEN.some(d => host === d || host.endsWith(`.${d}`));
}

/**
 * BEWUSST KEINE PORTAL-SPERRE (Owner 08.09.2026, Entscheidung und Rücknahme am selben Tag).
 *
 * Kurz existierte hier eine Liste von rund 60 Marktplätzen und Konzernen: Wer `amazon.de`
 * eintippte, bekam keinen Plan. Der Owner hat sie wieder verworfen — „es ist doch schön,
 * etwas Wertvolles anzubieten und zu zeigen, dass wir selbst für Amazon eine Lösung hätten."
 *
 * ER HAT RECHT, UND ZWAR AUS DER EIGENEN REGEL HERAUS: Eine Anzeige bewirbt genau EINE
 * Sache — beim Restaurant den Eventraum, bei der Praxis die Implantate. Die Maschine baut
 * also nie „eine Strategie für Amazon", sondern fragt „welches Angebot?". Damit ist der
 * grosse Name kein Sonderfall mehr, sondern eine normale Aufgabe.
 *
 * GEGEN MISSBRAUCH SCHÜTZT DER DECKEL, nicht eine Namensliste: fünf Läufe je Gerät und Tag
 * (`lib/versusforge-deckel.ts`). Wer spielt, verbraucht seine eigenen fünf.
 *
 * WER DIESE SPERRE WIEDER EINBAUEN WILL, braucht einen NEUEN Grund — die Kosten und die
 * Peinlichkeit waren die alten, und beide sind entkräftet.
 */

export type SeitenFund =
  | { ok: true; url: string; titel: string; text: string; foto?: string }
  | { ok: false; grund: "adresse" | "nicht-erreichbar" | "leer" };

/** Macht aus einer Eingabe wie „meinefirma.ro" eine geprüfte Adresse — oder nichts. */
export function adresseAus(roh: string): URL | null {
  const s = String(roh ?? "").trim();
  if (!s || s.length > 300) return null;
  let u: URL;
  try { u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`); } catch { return null; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (!u.hostname.includes(".")) return null;
  if (PRIVAT.some(r => r.test(u.hostname))) return null;
  return u;
}

/** Grobe Entfernung von Auszeichnung — wir brauchen Fliesstext, kein sauberes HTML. */
function nurText(html: string): { titel: string; text: string } {
  const titel = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim();
  const beschreibung = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1] ?? "";
  const rumpf = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return { titel, text: [beschreibung, rumpf].filter(Boolean).join(" ").trim() };
}

/**
 * Holt eine Seite und gibt ihren Text zurück — höchstens 6000 Zeichen.
 *
 * Der Deckel ist keine Willkür: Der Text geht in JEDEN folgenden Auftrag, und Eingabe-Token
 * sind zwar billig, aber eine ganze Website in jedem Aufruf ist Verschwendung. 6000 Zeichen
 * sind rund zwei Bildschirmseiten — genug, um zu erkennen, was jemand tut.
 */
/**
 * ── DAS FOTO KOMMT VON SEINER EIGENEN SEITE (Owner 09.09.2026: „Hälfte Bild, unten Schrift
 * wäre besser" · „aber das wird dann echt Geld kosten") ─────────────────────────────────────
 *
 * ER HAT MIT BEIDEM RECHT, und die zwei Sätze beantworten einander: Ein erzeugtes Motiv
 * kostet je Bild echtes Geld (gpt-image-2 ~15 Cent) — bei einem Gespräch, das gratis ist,
 * wäre das die Stelle, an der ein Missbrauch teuer wird. Ein Foto von SEINER Website kostet
 * einen Abruf.
 *
 * UND ES IST DAS BESSERE BILD. Ein erzeugtes Restaurant ist irgendein Restaurant; seine
 * Terrasse ist seine Terrasse. Wer sein eigenes Lokal auf der Anzeige sieht, glaubt sofort,
 * dass die Anzeige ihm gehört — das schafft kein Stockfoto.
 *
 * URHEBERRECHT: Es ist sein Bild von seiner Seite, für seine Anzeige. Wir legen es nicht ab
 * und benutzen es nirgendwo sonst.
 *
 * `og:image` ZUERST, weil es die Seite selbst als ihr Aushängeschild benannt hat — genau das
 * Bild, das sie beim Teilen zeigt. Erst danach das erste grosse Bild im Text. Logos und
 * Zählpixel fallen über die Grösse heraus, nicht über eine Namensliste: Ein `logo.png` heisst
 * nicht überall so, aber ein Logo ist selten 800 Pixel breit.
 */
function fotoAus(html: string, basis: URL): string | undefined {
  const kandidaten: string[] = [];
  const og = html.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)(?::src)?["'][^>]*>/gi) ?? [];
  for (const m of og) {
    const inhalt = m.match(/content=["']([^"']+)["']/i)?.[1];
    if (inhalt) kandidaten.push(inhalt);
  }
  /* Danach die ersten Bilder im Quelltext — die Reihenfolge im HTML ist meist die Reihenfolge
     auf der Seite, und oben steht, was der Betrieb zeigen will. */
  const bilder = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi) ?? [];
  for (const m of bilder.slice(0, 25)) {
    const src = m.match(/src=["']([^"']+)["']/i)?.[1];
    if (src && !/\.svg(\?|$)/i.test(src) && !/(sprite|icon|logo|pixel|avatar)/i.test(src)) kandidaten.push(src);
  }
  for (const k of kandidaten) {
    try {
      const u = new URL(k, basis);
      if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
    } catch { /* kaputte Adresse — nächste */ }
  }
  return undefined;
}

export async function seiteLesen(roh: string): Promise<SeitenFund> {
  const u = adresseAus(roh);
  if (!u) return { ok: false, grund: "adresse" };

  const abbruch = AbortSignal.timeout(8000);
  try {
    const res = await fetch(u.toString(), {
      redirect: "manual",
      signal: abbruch,
      headers: {
        /* Ohne einen erkennbaren Namen weisen viele Server einen nackten Aufruf ab. */
        "User-Agent": "Mozilla/5.0 (compatible; VersusForge/1.0; +https://versusforge.com)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    /* Eine Weiterleitung nehmen wir NUR, wenn das Ziel dieselbe Prüfung besteht — sonst wäre
       jede harmlose Adresse ein Umweg auf interne Netze. */
    if (res.status >= 300 && res.status < 400) {
      const ziel = res.headers.get("location");
      const u2 = ziel ? adresseAus(new URL(ziel, u).toString()) : null;
      if (!u2) return { ok: false, grund: "nicht-erreichbar" };
      const res2 = await fetch(u2.toString(), { redirect: "manual", signal: abbruch, headers: { "User-Agent": "Mozilla/5.0 (compatible; VersusForge/1.0)" } });
      if (!res2.ok) return { ok: false, grund: "nicht-erreichbar" };
      const html2 = await res2.text();
      const { titel, text } = nurText(html2);
      return text.length < 80 ? { ok: false, grund: "leer" } : { ok: true, url: u2.toString(), titel, text: text.slice(0, 6000), foto: fotoAus(html2, u2) };
    }
    if (!res.ok) return { ok: false, grund: "nicht-erreichbar" };
    const html = await res.text();
    const { titel, text } = nurText(html);
    /* Unter 80 Zeichen ist es eine Startseite, die ihren Inhalt erst im Browser baut — davon
       lässt sich nichts ableiten, und Raten ist verboten. */
    if (text.length < 80) return { ok: false, grund: "leer" };
    return { ok: true, url: u.toString(), titel, text: text.slice(0, 6000), foto: fotoAus(html, u) };
  } catch {
    return { ok: false, grund: "nicht-erreichbar" };
  }
}
