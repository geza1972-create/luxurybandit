/**
 * DIE STELLENANZEIGE BESCHAFFEN — Link ODER eingefügter Text, die Funktion erkennt selbst,
 * was sie bekommen hat. Ausfaktoriert aus `/api/lebenslauf-match` (25.08.2026), weil die
 * Bewerbungs-Erzeugung (`/api/lebenslauf-bewerbung`, Multi-Bewerbung) denselben Beschaffer
 * braucht — zwei Kopien derselben Abruf-Logik driften auseinander (dieselbe Begründung wie
 * lib/lebenslauf-besitz.ts).
 *
 * Ein Link wird zuerst serverseitig abgerufen (viele Jobbörsen blocken Bots, brauchen
 * JavaScript oder ein Login); klappt das nicht, oder war es ohnehin kein Link, zählt die
 * Eingabe selbst als Anzeigentext. So funktioniert das Feld in JEDEM Fall — nie ein
 * Rückweg, der den Bewerber zwingt, selbst zu entscheiden, was er einfügen darf.
 */

function siehtAusWieLink(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

/** Grobe HTML→Text-Extraktion — reicht für eine Stellenanzeige, kein vollständiger Parser. */
function textAusHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function anzeigenTextBeschaffen(eingabe: string): Promise<{ text: string; quelle: "link" | "text"; fehler?: string }> {
  const roh = eingabe.trim();
  if (!siehtAusWieLink(roh)) return { text: roh, quelle: "text" };
  try {
    const r = await fetch(roh, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LuxuryBanditBot/1.0; +https://luxurybandit.com)" },
    });
    if (!r.ok) return { text: "", quelle: "link", fehler: `Anzeige konnte nicht geladen werden (${r.status}). Füge stattdessen den Text der Anzeige ein.` };
    const html = await r.text();
    const text = textAusHtml(html).slice(0, 12000);
    if (text.length < 80) return { text: "", quelle: "link", fehler: "Von dieser Seite kam kein lesbarer Text (oft, weil sie ein Login oder JavaScript braucht). Füge stattdessen den Text der Anzeige ein." };
    return { text, quelle: "link" };
  } catch {
    return { text: "", quelle: "link", fehler: "Die Anzeige liess sich nicht abrufen. Füge stattdessen den Text der Anzeige ein." };
  }
}
