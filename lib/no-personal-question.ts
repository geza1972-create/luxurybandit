// KEINE PERSÖNLICHEN FRAGEN — auch nicht in bereits gespeicherten Texten.
//
// Owner-Regel (29.07.2026, aus den Chat-Verläufen belegt): Männer brechen genau dort ab, wo
// nach IHNEN gefragt wird — Tag, Morgen, Pläne, Arbeit, Beruf, Stadt, Alter. Gefragt werden
// darf nur nach IHR: wie sie aussieht, welches Outfit ihm an ihr gefällt.
//
// Der Erzeuger-Prompt (api/wetter-suggest) verbietet das längst. Nur: die Tagestexte liegen
// FERTIG gespeichert in den Beiträgen, viele davon aus der Zeit davor. Auf der Wetter-Seite
// stand deshalb weiter „Wie beginnst du deinen Tag, mein Lieber?" — mitten in der Aussendung.
//
// Darum wird beim ANZEIGEN gefiltert statt beim Erzeugen: das wirkt sofort und rückwirkend,
// ohne einen einzigen Text neu erzeugen zu müssen.
//
// Bewusst eng gefasst: Es fliegt NUR der letzte Satz raus, und nur wenn er eine Frage ist und
// eines der verbotenen Themen nennt. Eine Frage über SIE („Welches Outfit gefällt dir an
// mir?") bleibt stehen — die soll ja kommen.

const VERBOTEN = [
  // de
  /\bdein(?:en|em|e)?\s+(tag|morgen|abend|wochenende|plan|pläne|arbeit|job|beruf|stadt|leben|alter)\b/i,
  /\bwie\s+(geht'?s|geht\s+es)\s+dir\b/i,
  /\bwie\s+hast\s+du\s+geschlafen\b/i,
  /\bwas\s+(machst|planst|arbeitest)\s+du\b/i,
  /\bwie\s+alt\s+bist\s+du\b/i,
  /\bwoher\s+kommst\s+du\b/i,
  // en
  /\byour\s+(day|morning|evening|weekend|plans?|work|job|city|life|age)\b/i,
  /\bhow\s+(are\s+you|'?s\s+your|did\s+you\s+sleep|old\s+are\s+you)\b/i,
  /\bwhat\s+(do\s+you\s+do|are\s+you\s+doing|are\s+your\s+plans)\b/i,
  /\bwhere\s+are\s+you\s+from\b/i,
  // ro
  /\b(ziua|dimineața|seara|planurile|munca|orașul|vârsta)\s+ta\b/i,
  /\bce\s+mai\s+faci\b/i,
  /\bcum\s+ai\s+dormit\b/i,
  /\bcâți\s+ani\s+ai\b/i,
  // es
  /\btu\s+(día|mañana|noche|fin\s+de\s+semana|plan|planes|trabajo|ciudad|vida|edad)\b/i,
  /\b(cómo\s+estás|cómo\s+dormiste|cuántos\s+años\s+tienes|a\s+qué\s+te\s+dedicas)\b/i,
  // fr
  /\bta\s+(journée|matinée|soirée|ville|vie)\b/i,
  /\bton\s+(matin|week-?end|travail|boulot|âge|plan)\b/i,
  /\b(comment\s+vas-tu|comment\s+ça\s+va|tu\s+as\s+bien\s+dormi|quel\s+âge\s+as-tu|tu\s+fais\s+quoi)\b/i,
  // pt
  /\b(o\s+teu|teu|seu)\s+(dia|trabalho|plano|planos|emprego)\b/i,
  /\b(a\s+tua|tua|sua)\s+(manhã|noite|cidade|vida|idade)\b/i,
  /\b(como\s+estás|como\s+dormiste|quantos\s+anos\s+tens)\b/i,
  // pl
  /\btw(ój|oja|oje)\s+(dzień|poranek|wieczór|praca|miasto|życie|plany|wiek)\b/i,
  /\b(jak\s+się\s+masz|jak\s+spałeś|ile\s+masz\s+lat|co\s+robisz)\b/i,
  // it
  /\b(la\s+tua|tua)\s+(giornata|mattina|serata|città|vita|età)\b/i,
  /\b(il\s+tuo|tuo)\s+(giorno|lavoro|piano|weekend)\b/i,
  /\b(come\s+stai|come\s+hai\s+dormito|quanti\s+anni\s+hai|cosa\s+fai)\b/i,
];

/**
 * Entfernt eine abschliessende Frage nach IHM. Alles andere bleibt Wort für Wort erhalten.
 * Läuft bis zu zweimal, falls jemand zwei Fragen hintereinander gehängt hat.
 */
export function stripPersonalQuestion(text: string): string {
  let out = String(text ?? "").trim();
  for (let runde = 0; runde < 2; runde++) {
    // Der letzte Satz — Fragezeichen am Ende, davor Satzende oder Textanfang. Ein
    // nachgestelltes Emoji („… mein Lieber? 🍂") gehört zum Satz und fliegt mit raus.
    const m = out.match(/(^|[.!?…]\s*)([^.!?…]*\?[^A-Za-zÀ-ž0-9]*)$/u);
    if (!m) break;
    const frage = m[2];
    if (!VERBOTEN.some(re => re.test(frage))) break;
    out = out.slice(0, out.length - frage.length).trim();
  }
  return out;
}
