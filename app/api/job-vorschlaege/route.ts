import { NextResponse } from "next/server";
import { leseLebenslauf, schreibeLebenslauf } from "@/lib/lebenslauf-store";
import { darfAmProfilArbeiten } from "@/lib/lebenslauf-besitz";
import { readKissLog, writeKissLog, getSignedUrl } from "@/lib/try-this-look-store";
import { fotoAblegen } from "@/lib/lebenslauf-foto";
import { sendEmail } from "@/lib/email-send";
import { textbausteineInSprache } from "@/lib/lebenslauf-uebersetzen";
import type { Lang } from "@/lib/lang";
import { veroeffentlichbareChancen, chanceFuerKandidat, type JobChanceKandidat } from "@/lib/job-chancen";
import { docxZuText } from "@/lib/docx-text";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * DIE JOBCHANCEN-VORSCHLÄGE (Owner-Auftrag 26.08.2026, KONZEPT-JOB-MATCH-TRICHTER.md
 * Baustelle E) — CV rein, Chancen raus: EIN KI-Aufruf vergleicht das Profil mit ALLEN
 * veröffentlichbaren Jobchancen (`veroeffentlichbareChancen()` aus Baustelle D — der
 * Doppelfilter „aktiv UND quellen-geprüft/Partner") und schätzt je Chance ehrlich ein,
 * wie realistisch eine Bewerbung ist.
 *
 * Der Prompt bekommt nur die KOMPAKTE Kandidaten-Sicht je Chance (nie `intern.*` — das
 * verlässt den Server über `chanceFuerKandidat()` ohnehin nie), damit die Anfrage bei
 * vielen Chancen klein bleibt; die Detail-Analyse einer EINZELNEN gewählten Chance
 * (mit vollem Anzeigentext) läuft danach separat über /api/lebenslauf-match.
 *
 * POST { id, device, lang? } → { vorschlaege: [{chanceId,prozent,etikett,quereinstieg,
 *   erklaerung}], chancen: JobChanceKandidat[] } — der Client zippt beide Listen über
 *   `chanceId`/`id` zusammen, um jede Karte zu rendern (Rolle/Land/Remote/Kurzbeschreibung
 *   kommen aus `chancen`, die Einschätzung aus `vorschlaege`).
 */

const SPRACHNAME: Record<string, string> = { de: "German", en: "English", ro: "Romanian", es: "Spanish", fr: "French", pt: "Portuguese", it: "Italian" };
const ETIKETTEN = ["realistisch", "moeglich", "unwahrscheinlich"] as const;
type Etikett = typeof ETIKETTEN[number];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractJson(text: string): any {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}

/** Der EINE OpenAI-Textaufruf dieser Route — zweimal gebraucht (Pool-Abgleich UND
    Markt-Generierung), deshalb herausgezogen. */
async function kiAufruf(key: string, prompt: string): Promise<string> {
  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL ?? "gpt-5-mini",
      input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
    }),
  }).then(res => res.json()).catch(() => null) as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> } | null;
  return r?.output_text ?? r?.output?.flatMap(o => o?.content ?? [])?.map(c => c?.text ?? "")?.join("") ?? "";
}

const REMOTE_WERTE = ["remote", "hybrid", "vorOrt"] as const;

/** Der Lebenslauf als KI-Eingabe — PDF als Datei, .docx als Text (wie im Generator). */
async function dokumentInhalt(cvPath: string): Promise<Record<string, unknown> | null> {
  try {
    const url = await getSignedUrl(cvPath);
    if (!url) return null;
    const bytes = Buffer.from(await fetch(url).then(r => r.arrayBuffer()));
    if (cvPath.toLowerCase().endsWith(".docx")) {
      const t = docxZuText(bytes);
      return t ? { type: "input_text", text: `Lebenslauf (aus Word-Datei):\n${t.slice(0, 24000)}` } : null;
    }
    return { type: "input_file", filename: "lebenslauf.pdf", file_data: `data:application/pdf;base64,${bytes.toString("base64")}` };
  } catch { return null; }
}

/** Wie `kiAufruf`, nur mit optionaler Datei im selben Aufruf. */
async function kiAufrufMitDatei(key: string, prompt: string, datei: Record<string, unknown> | null): Promise<string> {
  const content: Array<Record<string, unknown>> = [{ type: "input_text", text: prompt }];
  if (datei) content.push(datei);
  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.OPENAI_VISION_MODEL ?? "gpt-5-mini", input: [{ role: "user", content }] }),
  }).then(res => res.json()).catch(() => null) as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> } | null;
  return r?.output_text ?? r?.output?.flatMap(o => o?.content ?? [])?.map(c => c?.text ?? "")?.join("") ?? "";
}

/**
 * PLUS UND MINUS (Owner-Auftrag 26.08.2026: „es gibt keine Analyse vor der Checkliste. Das
 * fände ich gut, mit Plus und Minus.")
 *
 * WARUM DAS DAS EHRLICHERE ERGEBNIS IST: Prozentzahlen zu Stellen, für die niemand mit
 * einer Firma gesprochen hat, versprechen etwas, das wir nicht halten. Eine nüchterne
 * Einschätzung seiner Lage — was für ihn spricht, was ihm fehlt — können wir dagegen
 * wirklich liefern, und sie ist für ihn mehr wert.
 *
 * DAS MINUS IST PFLICHT: Eine Analyse ohne Minus ist Schmeichelei. Wer nichts zu
 * verbessern hört, ändert nichts und bewirbt sich weiter erfolglos.
 */
async function plusMinus(key: string, profilDaten: unknown, zielSprache: string, cvPath = "", felder: string[] = []): Promise<{ richtungen: { rolle: string; prozent: number; begruendung: string }[]; plus: string[]; minus: string[]; fazit: string }> {
  const prompt = [
    "Du bist ein erfahrener, nüchterner Personalberater. Aus EINEM Bewerberprofil (JSON) sagst du dem Menschen ehrlich, was für ihn spricht und was ihm fehlt.",
    `Profil: ${JSON.stringify(profilDaten)}`,
    "'plus': 2–4 Punkte, die auf dem Arbeitsmarkt WIRKLICH etwas wert sind — belegt am Profil, keine Floskeln. Nicht Motivations-Sätze, sondern was er tatsächlich mitbringt.",
    "'minus': 2–4 Punkte, die ihn heute Stellen kosten — konkret und ohne Beschönigung. MINDESTENS ZWEI Punkte; eine Analyse ohne Minus wäre Schmeichelei und hilft ihm nicht.",
    "DIE SCHREIBPROBE ('klickAntworten.schreibprobe') sind zwei Sätze, die er in 30 Sekunden selbst auf Deutsch getippt hat — sie ist der beste Beleg, den wir haben. Ist sie sauber, flüssig und fehlerfrei, gehört das ins 'plus' (und rechtfertigt bei sonst starkem Ergebnis ein Niveau bis C2). Hat sie viele Fehler, ist sie sehr kurz oder wirkt sie abgeschrieben, gehört das ins 'minus' — schriftliche Bewerbungen und E-Mail-Verkehr hängen daran. Fehlt sie, erwähne sie NICHT.",
    "DAS TESTERGEBNIS DEUTSCH GEHÖRT INS MINUS, WENN ES SCHWACH IST (Owner 26.08.2026): 'klickAntworten.deutschGetestet' stammt aus einem gestaffelten Test von A1 bis C1 und ist gemessen, nicht behauptet. Liegt es unter B2, nenne im 'minus' AUSDRÜCKLICH, was das kostet — bei A1/A2 fallen Kundenkontakt, Büro und Pflege praktisch weg, bei B1 bleibt es für Stellen mit Telefon- und Schriftverkehr zu knapp. Sag auch, was es ihm bringen würde, eine Stufe höher zu kommen. Bei B2 oder C1 gehört das Deutsch ins 'plus'.",
    "OHNE HOCHGELADENEN LEBENSLAUF WIEGT DAS SCHWER (Owner 26.08.2026: „wenn er keinen CV hochgeladen hat, gibt es viele Minuspunkte“): Steht im Profil kein ausgewerteter Lebenslauf — keine Stationen, keine Ausbildung, keine Nachweise —, dann nenne im 'minus' AUSDRÜCKLICH, was deshalb fehlt: keine belegten Stationen mit Zeiträumen, keine nachweisbaren Ergebnisse, kein Anschreiben, keine Zeugnisse. Eine Firma sieht dann nichts ausser Behauptungen. In diesem Fall sind mindestens DREI Minuspunkte richtig, und 'plus' bleibt entsprechend kurz.",
    "LIEGT DIE LEBENSLAUF-DATEI BEI, BEURTEILE AUCH DIE FORM (Owner 26.08.2026): Aufbau und Layout, Länge, Lesbarkeit, ob ein Foto drin ist und wie es wirkt, ob Zeiträume sauber stehen, Rechtschreibung. Ein Personaler entscheidet in Sekunden am Aussehen — nenne Formfehler im 'minus' genauso konkret wie inhaltliche, und ein wirklich gutes Dokument im 'plus'.",
    /* DER TON DES FAZITS (Owner 27.08.2026, an einem echten Ergebnis: „das ist nicht
       richtig, was du schreibst" — das Modell hatte geschrieben „Entscheide dich: wenn du
       wirklich in Kundenservice willst, überarbeite CV und Anschreiben …; willst du
       UX/Produkt bleiben, ändere die Bewerbungsrichtung"). Sein Gegenvorschlag im Wortlaut:
       „Du könntest es machen, aber deine aktuelle Präsentation macht dich für Recruiter
       unplausibel. Du kannst es jetzt aber dafür anpassen." Also: kein Ultimatum an einen
       Menschen, der gerade eine ehrliche Absage gelesen hat — eine Feststellung und ein
       Weg nach vorn. */
    "'fazit': ZWEI Sätze. Erst die ehrliche Feststellung, was ihn heute im Weg steht — in der Form „Du könntest X machen, aber …“. Dann der eine nächste Schritt, den ER selbst tun kann, als Angebot formuliert („Du kannst …“), nicht als Befehl.",
    "STELL IHN NIE VOR EIN ULTIMATUM: keine Sätze wie „Entscheide dich“, „entweder … oder“, „du musst“. Er hat eine Richtung gewählt; unsere Aufgabe ist zu sagen, was ihr im Weg steht, nicht ihn davon abzubringen. Fehlt der Lebenslauf, ist genau das der nächste Schritt.",
    /* DIE PROZENTE JE RICHTUNG (Owner 27.08.2026: „die Prozente brauchen wir") — sie waren
       schon einmal da und flogen mit den Chancen-Karten raus. Der Unterschied, der sie
       tragbar macht: Sie bewerten eine ART VON ARBEIT, keine offene Stelle. Dafür brauchen
       wir keine Firma gesprochen zu haben — es ist eine Einschätzung, keine Zusage. */
    `'richtungen': 4–6 ARBEITSRICHTUNGEN mit einer ehrlichen Passungs-Zahl. Bleib in diesen Feldern: ${felder.join(" · ")}.`,
    "Je Richtung: {\"rolle\":\"kurze Bezeichnung\",\"prozent\":0,\"begruendung\":\"EIN Satz, woran die Zahl liegt\"}. Sortiere absteigend.",
    "WAS ER WILL, SCHLÄGT WAS ER FORMAL KÖNNTE (Owner 26.08.2026, an einem schlechten Vorschlag aufgefallen: einer Bewerberin, die ins Backoffice wollte, wurde eine Fahrerstelle mit 65 % vorgeschlagen — nur weil sie einen Autoführerschein hat). Die Wunschrichtungen aus 'kategorien' und 'klickAntworten.richtungen' sind das WICHTIGSTE Kriterium. Eine Richtung ausserhalb davon darf 40 % NICHT überschreiten, ausser er hat ausdrücklich „zeig mir, was geht“ gewählt. Ein Führerschein, ein Abschluss oder ein fehlendes Sprach-Erfordernis sind Voraussetzungen, KEINE Eignung — sie rechtfertigen nie eine hohe Zahl.",
    "KEINE FIRMEN, KEINE STELLEN: 'rolle' ist eine Art von Arbeit („Kundenservice / Support“), niemals ein Unternehmen oder eine konkrete Anzeige. Wir behaupten nicht, dass dort etwas frei ist.",
    "BEURTEILE NIE DIE PERSON: Alter, Geschlecht, Herkunft, Familienstand oder Aussehen kommen nicht vor — weder im Plus noch im Minus.",
    "SCHREIB FÜR EINEN MENSCHEN, NICHT ÜBER EINEN DATENSATZ: Nenne NIE Feldnamen, Schlüssel oder JSON-Pfade und keine Wörter wie „Profilangabe“ oder „laut Profil“. Sag einfach, was Sache ist — etwa „Dein Deutsch liegt im Test bei C1.“",
    `Schreibe alles auf ${zielSprache}. DUZE ihn durchgehend (auf Deutsch: du/dein, nie Sie/Ihre).`,
    /* DIE SCHEMA-ZEILE MUSS ALLES NENNEN (27.08.2026, live gesehen): Sie führte nur plus,
       minus und fazit — also lieferte das Modell auch nur die drei, und die Prozente je
       Richtung fehlten in der Anzeige, obwohl der Prompt sie weiter oben verlangte. Das
       Modell folgt dieser letzten Zeile, nicht der Beschreibung darüber. */
    "Antworte NUR als JSON: {\"richtungen\":[{\"rolle\":\"...\",\"prozent\":0,\"begruendung\":\"...\"}],\"plus\":[\"...\"],\"minus\":[\"...\"],\"fazit\":\"...\"}",
  ].join("\n\n");
  /* MIT DOKUMENT WIRD AUCH DIE FORM BEURTEILT (Owner 26.08.2026: „und selbst wenn er ein
     CV hochgeladen hat, wird Layout analysiert, Bild …") — die ausgelesenen Felder allein
     zeigen den Inhalt, nicht das Aussehen. Ein Personaler entscheidet aber in Sekunden am
     Aussehen. Also geht die DATEI mit in den Aufruf, wenn es eine gibt. */
  const inhalt = cvPath ? await dokumentInhalt(cvPath) : null;
  const text = await kiAufrufMitDatei(key, prompt, inhalt);
  const parsed = text ? extractJson(text) : null;
  const liste = (v: unknown, n: number) =>
    (Array.isArray(v) ? v : []).map(x => String(x ?? "").trim().slice(0, 200)).filter(Boolean).slice(0, n);
  const rohRichtungen = (Array.isArray(parsed?.richtungen) ? parsed.richtungen : []) as Record<string, unknown>[];
  return {
    richtungen: rohRichtungen.slice(0, 6).map(r => ({
      rolle: String(r?.rolle ?? "").trim().slice(0, 120),
      prozent: Math.max(0, Math.min(100, Math.round(Number(r?.prozent)) || 0)),
      begruendung: String(r?.begruendung ?? "").trim().slice(0, 240),
    })).filter(r => r.rolle).sort((a, b) => b.prozent - a.prozent),
    plus: liste(parsed?.plus, 4),
    minus: liste(parsed?.minus, 4),
    /* 300 -> 420: Das Fazit ist seit 27.08.2026 ZWEI Saetze (Feststellung + Angebot) —
       bei 300 Zeichen waere der zweite, wichtigere mitten im Wort abgeschnitten. */
    fazit: String(parsed?.fazit ?? "").trim().slice(0, 420),
  };
}

/**
 * DIE SPRACH-SPERRE (Owner 26.08.2026: „dann ist er für diesen Job nicht geeignet") —
 * eine HARTE Regel im Server, keine Bitte an die KI. Verlangt eine Chance Deutsch B2 und
 * der Test ergab A2, dann ist die Stelle keine Chance, egal wie freundlich das Modell
 * rechnet. Dieselbe Bauart wie die Noten-Korrektur in `/api/bewerbung-pruefen`: Wo eine
 * Zahl über Menschen entscheidet, prüft der Server nach.
 */
const NIVEAU_RANG: Record<string, number> = {
  "kein deutsch": 0, a1: 1, a2: 2, b1: 3, b2: 4, c1: 5, c2: 6,
};
/** Findet „B2" in „Deutsch B2", „Deutsch (B2+)", „B2 erforderlich" … */
function niveauRang(text: string): number {
  const t = String(text ?? "").toLowerCase();
  if (t.includes("muttersprache") || t.includes("muttersprachler")) return 6;
  const m = t.match(/\b([abc][12])\b/);
  if (m) return NIVEAU_RANG[m[1]] ?? 0;
  if (NIVEAU_RANG[t.trim()] !== undefined) return NIVEAU_RANG[t.trim()];
  return 0;
}
/** Das von der Chance verlangte Deutsch-Niveau — 0, wenn keines genannt ist. */
function gefordertesDeutsch(sprachen: string[]): number {
  return sprachen
    .filter(sp => String(sp).toLowerCase().includes("deutsch") || String(sp).toLowerCase().includes("german"))
    .reduce((max, sp) => Math.max(max, niveauRang(sp)), 0);
}

/**
 * DIE „DEINE CHANCEN"-MAIL (Owner 26.08.2026: „bekommt er eine E-Mail? Haben wir danke
 * schön gesagt?") — direkt nach der Analyse: Danke, die Top-Chancen mit Prozent, und der
 * Rückkehr-Link in den Funnel. Feuer-und-vergessen: Ein Mailfehler hält die Chancen nie
 * auf. KEINE Hausadresse im Text (Memory keine-email-adresse-auf-der-seite) — der Fuss
 * verweist auf /contact. Deutsche Quelle, je Sprache übersetzt (Dauer-Cache).
 */
/**
 * DIE MAIL NACH DER ANALYSE — sie trägt jetzt Plus und Minus, nicht mehr eine Liste von
 * „Jobchancen" mit Prozenten (Owner 26.08.2026: „danke schön für was?" · „wir versprechen
 * was, was wir gar nicht haben"). Was auf der Seite steht, steht auch in der Mail; zwei
 * verschiedene Behauptungen wären genau das Problem, das wir heute abgeräumt haben.
 *
 * KEINE HAUSADRESSE im Text (Memory keine-email-adresse-auf-der-seite) — der Fuss
 * verweist auf die Kontaktseite. Deutsche Quelle, je Sprache übersetzt (Dauer-Cache).
 */
const MAIL_QUELLE = {
  betreff: "Deine Einschätzung ist da",
  hallo: "Hallo",
  danke: "danke für deine Angaben. Das haben wir gesehen:",
  plusH: "Das spricht für dich",
  minusH: "Das fehlt noch",
  karteZeile: "Deine Angaben sind gespeichert. Du kannst jederzeit weitermachen oder etwas ändern:",
  knopf: "Weiter zu deiner Einschätzung",
  fuss: "Du bekommst diese E-Mail, weil du bei LB - Jobs deine Einschätzung angefragt hast. Fragen? Über die Kontaktseite erreichst du uns.",
};

async function analyseMailSenden(args: {
  email: string; name: string; lang: string; origin: string; topic: string;
  plus: string[]; minus: string[]; fazit: string;
}) {
  try {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(args.email)) return;
    if (!args.plus.length && !args.minus.length) return;
    const L = (["de", "en", "ro", "es", "fr", "pt", "it"].includes(args.lang) ? args.lang : "ro") as Lang;
    const t = await textbausteineInSprache(MAIL_QUELLE, L);
    const link = `${args.origin}/themes/lebenslauf/start?jobs=1&s=3&topic=${encodeURIComponent(args.topic || "german-speakers")}`;
    const punkte = (zeichen: string, farbe: string, liste: string[]) => liste.slice(0, 4).map(z =>
      `<tr><td style="padding:3px 0;font-size:14px;color:#1a160f"><span style="color:${farbe};font-weight:bold">${zeichen}</span> ${z}</td></tr>`).join("");
    const abschnitt = (titel: string, zeichen: string, farbe: string, liste: string[]) => liste.length
      ? `<tr><td style="padding:10px 22px 2px;font-size:11px;font-weight:bold;letter-spacing:1px;color:#8a8274;text-transform:uppercase">${titel}</td></tr>
<tr><td style="padding:0 22px 6px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${punkte(zeichen, farbe, liste)}</table></td></tr>` : "";
    const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;background:#faf7f0;border-radius:16px">
<tr><td style="padding:26px 22px 6px;font-size:16px;font-weight:bold;color:#1a160f">${t.hallo}${args.name ? ` ${args.name.split(" ")[0]}` : ""},</td></tr>
<tr><td style="padding:0 22px 8px;font-size:14px;color:#1a160f">${t.danke}</td></tr>
${abschnitt(t.plusH, "+", "#1a7f3c", args.plus)}
${abschnitt(t.minusH, "−", "#b23b3b", args.minus)}
${args.fazit ? `<tr><td style="padding:10px 22px 4px;font-size:14px;font-weight:bold;color:#1a160f">${args.fazit}</td></tr>` : ""}
<tr><td style="padding:8px 22px 16px;font-size:13px;color:#5a5245">${t.karteZeile}</td></tr>
<tr><td style="padding:0 22px 24px"><a href="${link}" style="display:inline-block;background:#f6cf51;color:#111;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:bold;text-decoration:none">${t.knopf}</a></td></tr>
<tr><td style="padding:0 22px 22px;font-size:11px;color:#8a8274">${t.fuss}</td></tr>
</table>`;
    await sendEmail({ to: args.email, subject: t.betreff, html });
  } catch (err) {
    console.error("[job-vorschlaege] Analyse-Mail fehlgeschlagen:", err);
  }
}

/**
 * DER MARKT-FALLBACK (Owner 26.08.2026: „es spielt keine Rolle ob ich was eingepflegt
 * habe oder nicht. Das Portal soll immer Chancen zeigen und Ideen geben dem User was er
 * machen kann.") — ist der handgepflegte Pool leer oder passt nichts, generiert die KI
 * aus dem PROFIL selbst 4–6 Marktchancen: Job-RICHTUNGEN, die mit diesem Werdegang
 * realistisch gesucht werden.
 *
 * DIE EHRLICHKEITS-GRUNDSÄTZE GELTEN UNVERÄNDERT (KONZEPT-JOB-MATCH-TRICHTER.md):
 * keine erfundenen Firmen, keine „offene Stelle wartet auf dich"-Behauptung — es sind
 * MARKTCHANCEN (`partnerFreigabe: false`), genau die Ebene, für die das Zwei-Ebenen-
 * Datenmodell und der Markt-Hinweis unter den Karten gebaut wurden. Die Prozente dürfen
 * auch hier niedrig sein; mindestens eine Richtung soll bewusst eine Brücke sein
 * (erreichbar, aber mit benanntem fehlendem Stück) — das ist der „Ideen geben"-Teil.
 *
 * IDs tragen das Präfix `ki-`: Der Client erkennt daran, dass es KEINEN Pool-Eintrag
 * gibt, und schickt bei der Detail-Analyse den Kartentext statt der chanceId an
 * /api/lebenslauf-match (dessen `leseChance` eine ki-Kennung nie fände).
 */
/** Die vermittelbaren Felder — das GESCHÄFT des Hauses (Owner: „ich muss nur die
    Anzeige vorgeschlagen bekommen … Customer Support … und anhand meines technischen
    Backgrounds vielleicht noch mehr"). Die generierten Richtungen bleiben in dieser
    Welt — NIE eine Vita zurückspiegeln („nicht wie alle anderen: ich lade mein CV hoch
    als UX-Designer und bekomme UX-Jobs"). Pool-Kategorien und Kandidaten-Wünsche
    kommen je Aufruf dazu. */
const VERMITTELBARE_FELDER = [
  "Kundenservice / Customer Support", "Backoffice / Verwaltung", "Verkauf / Sales Support",
  "Technischer Support / Service Desk", "Order Management / Logistik", "Tourismus / Guide",
  "Operations", "Qualitätssicherung / Daten",
];

async function marktChancenGenerieren(key: string, profilDaten: unknown, zielSprache: string, felder: string[], traum: string): Promise<{ chancen: JobChanceKandidat[]; vorschlaege: { chanceId: string; prozent: number; etikett: Etikett; quereinstieg: boolean; erklaerung: string }[] }> {
  const prompt = [
    "Du bist ein nüchterner Recruiting-Analyst für den deutschsprachigen und EU-Arbeitsmarkt (Schwerpunkt: deutschsprachige Rollen in Rumänien, Griechenland, Deutschland, Österreich). Aus EINEM Bewerberprofil (JSON) leitest du 4 bis 6 realistische JOB-RICHTUNGEN ab, für die dieses Profil auf dem Markt tatsächlich gesucht wird.",
    `Profil: ${JSON.stringify(profilDaten)}`,
    `BLEIB IN DIESEN FELDERN (das sind die vermittelbaren Rollen des Hauses): ${felder.join(" · ")}. Spiegle NIE einfach den letzten Jobtitel des Profils zurück — die Deutschkenntnisse und die ÜBERTRAGBAREN Fähigkeiten sind die Brücke in diese Felder.`,
    ...(traum ? [`DER TRAUM DES KANDIDATEN (ernst nehmen, nie belächeln): "${traum}". Wenn er in den Feldern erreichbar ist, zeige den Weg; wenn nicht, sage es ehrlich in einer 'erklaerung' und biete die nächstliegende Brücke in den Feldern an.`] : []),
    "REGELN (unverhandelbar): Erfinde KEINE Firmen und KEINE konkreten offenen Stellen — jede Karte ist eine Markt-RICHTUNG (Rolle + typische Anforderungen), keine Anzeige. Nichts aus dem Profil dazuerfinden. 'prozent' (0–100) NUR aus echter Überschneidung — ehrlich, nicht aufgeblasen; schwache Passungen bekommen niedrige Zahlen. Mindestens eine Richtung soll eine BRÜCKE sein: erreichbar über übertragbare Fähigkeiten, mit klar benanntem fehlendem Stück (dann quereinstieg=true).",
    "Wähle 'land' passend zum Profil (Wohnort, Sprachen): bevorzugt das Wohnsitzland, Rumänien, Griechenland, Deutschland oder Österreich; 'remote' nur, wenn die Rolle es typischerweise hergibt.",
    "'etikett': \"realistisch\" | \"moeglich\" | \"unwahrscheinlich\". 'erklaerung': EIN Satz, was konkret passt oder fehlt. 'kurzbeschreibung': 1–2 Sätze, was diese Rolle ist und warum sie zum Profil passt. 'anforderungen': 3–5 typische Anforderungen dieser Rolle.",
    `Schreibe alle Texte (rolle, kurzbeschreibung, anforderungen, erklaerung, kategorie) auf ${zielSprache}. DUZE den Kandidaten durchgehend (auf Deutsch: du/dein — NIE Sie/Ihre; entsprechend informell in jeder Sprache).`,
    "Antworte NUR als JSON: {\"chancen\":[{\"rolle\":\"...\",\"land\":\"...\",\"stadt\":\"\",\"remote\":\"remote\"|\"hybrid\"|\"vorOrt\",\"sprachen\":[\"...\"],\"anforderungen\":[\"...\"],\"quereinstiegGeeignet\":false,\"kurzbeschreibung\":\"...\",\"kategorie\":\"...\",\"prozent\":0,\"etikett\":\"realistisch\"|\"moeglich\"|\"unwahrscheinlich\",\"quereinstieg\":false,\"erklaerung\":\"...\"}]}",
  ].join("\n\n");

  const text = await kiAufruf(key, prompt);
  const parsed = text ? extractJson(text) : null;
  const roh: Record<string, unknown>[] = Array.isArray(parsed?.chancen) ? parsed.chancen : [];
  const s = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
  const liste = (v: unknown, n: number, max: number) => (Array.isArray(v) ? v.map(x => s(x, max)).filter(Boolean).slice(0, n) : []);

  const chancen: JobChanceKandidat[] = [];
  const vorschlaege: { chanceId: string; prozent: number; etikett: Etikett; quereinstieg: boolean; erklaerung: string }[] = [];
  for (const c of roh.slice(0, 6)) {
    const rolle = s(c.rolle, 120);
    const land = s(c.land, 80);
    if (!rolle || !land) continue;
    const id = `ki-${chancen.length + 1}`;
    const prozent = Math.max(0, Math.min(100, Math.round(Number(c.prozent) || 0)));
    const etikettRoh = String(c.etikett ?? "");
    chancen.push({
      id, rolle, land,
      stadt: s(c.stadt, 80) || undefined,
      remote: (REMOTE_WERTE as readonly string[]).includes(String(c.remote)) ? (c.remote as JobChanceKandidat["remote"]) : "vorOrt",
      sprachen: liste(c.sprachen, 6, 40),
      umzugNoetig: false,
      anforderungen: liste(c.anforderungen, 6, 160),
      quereinstiegGeeignet: c.quereinstiegGeeignet === true || c.quereinstieg === true,
      kurzbeschreibung: s(c.kurzbeschreibung, 400),
      kategorie: s(c.kategorie, 40),
      hinzugefuegtAm: new Date().toISOString(),
      aktiv: true,
      partnerFreigabe: false,
    });
    vorschlaege.push({
      chanceId: id, prozent,
      etikett: (ETIKETTEN as readonly string[]).includes(etikettRoh) ? (etikettRoh as Etikett) : (prozent >= 70 ? "realistisch" : prozent >= 40 ? "moeglich" : "unwahrscheinlich"),
      quereinstieg: c.quereinstieg === true,
      erklaerung: s(c.erklaerung, 280),
    });
  }
  vorschlaege.sort((a, b) => b.prozent - a.prozent);
  return { chancen, vorschlaege };
}

export async function POST(request: Request) {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: "OPENAI_API_KEY fehlt." }, { status: 500 });

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const id = String(body.id ?? "").trim();
  const device = String(body.device ?? "").trim().slice(0, 80);
  const zielSprache = SPRACHNAME[String(body.lang ?? "").trim().slice(0, 2)] ?? "English";
  if (!id) return NextResponse.json({ error: "Kennung fehlt." }, { status: 400 });

  /**
   * DER ANTWORTEN-MODUS — BEWERBUNG OHNE CV (einfache Fassung + Nachtrag 1 im
   * KONZEPT-JOB-MATCH-TRICHTER.md: „Ich will. Ich kann. Ich heisse."): Der Trichter
   * schickt statt eines ausgewerteten Lebenslaufs die KLICK-ANTWORTEN des Kandidaten.
   * Existiert noch kein Lebenslauf-Profil, entsteht hier ein MINIMAL-Hauptprofil —
   * damit funktionieren alle Folgewege (Kandidaten-Datei, Detail-Analyse, Bewerbung
   * anpassen) unverändert, ohne zweite Besitzlogik.
   */
  /* Die hochgeladene Datei — nur für die Form-Beurteilung in `plusMinus`. */
  const cvPathFuerAnalyse = String(body.pdfPath ?? body.cvPath ?? "").trim().slice(0, 300);
  const a = (body.antworten ?? null) as Record<string, unknown> | null;
  const sK = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
  const listeK = (v: unknown, n: number, len: number) =>
    (Array.isArray(v) ? v : []).map(x => sK(x, len)).filter(Boolean).slice(0, n);
  const antworten = a ? {
    richtungen: listeK(a.richtungen, 8, 60),
    traum: sK(a.traum, 300),
    arbeitsform: listeK(a.arbeitsform, 4, 20),
    umzug: sK(a.umzug, 20),
    start: sK(a.start, 20),
    zuletzt: listeK(a.zuletzt, 4, 60),
    zuletztText: sK(a.zuletztText, 200),
    faehigkeiten: listeK(a.faehigkeiten, 10, 60),
    deutschNiveau: sK(a.deutschNiveau, 40),
    /* Das GETESTETE Niveau schlägt die Selbstauskunft (Owner 26.08.2026) — fünf
       gestaffelte Fragen von A2 bis C1 sind belastbarer als ein angetippter Chip. */
    deutschGetestet: sK(a.deutschGetestet, 40),
    /* DIE SCHREIBPROBE (Owner 26.08.2026) — zwei selbst getippte Sätze auf Deutsch, in 30
       Sekunden. Sie zeigt, was keine Klickfrage zeigt: ob er schreiben kann. */
    schreibprobe: sK(a.schreibprobe, 600),
    deutschSelbsteinschaetzung: sK(a.deutschSelbsteinschaetzung, 40),
    weitereSprachen: listeK(a.weitereSprachen, 6, 40),
    land: sK(a.land, 80),
    /* DIE HARTEN ANGABEN AUS DEM CHAT (Owner 26.08.2026: „wir fragen die Daten im Chat
       ab") — sie fliessen nicht nur in den Prompt, sie füllen unten auch das Profil, aus
       dem die Karte rendert. Vorher endeten alle Chat-Antworten im Prompt und waren danach
       weg; die Karte blieb deshalb bei Name und zwei Stichworten stehen. */
    altersgruppe: sK(a.altersgruppe, 20),
    jahreErfahrung: sK(a.jahreErfahrung, 20),
    ausbildungsstand: sK(a.ausbildungsstand, 40),
    fuehrerschein: listeK(a.fuehrerschein, 6, 40),
    stadt: sK(a.stadt, 80),
    telefon: sK(a.telefon, 40),
  } : null;

  let profil = await leseLebenslauf(id);
  if (!profil) {
    if (!antworten) return NextResponse.json({ error: "Profil nicht gefunden." }, { status: 404 });
    /* Besitz ohne Profil: Der Kiss-Log-Auftrag (aus `kennungSichern` im Trichter) muss
       existieren und zum Gerät passen — dieselbe Geräte-Logik wie darfAmProfilArbeiten,
       nur ohne das noch nicht existierende Profil. */
    try {
      const eintrag = (await readKissLog()).find(e => e.id === id);
      if (!eintrag) return NextResponse.json({ error: "Auftrag nicht gefunden." }, { status: 404 });
      if (eintrag.device && device && eintrag.device !== device) {
        return NextResponse.json({ error: "Not yours." }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Bitte noch einmal versuchen." }, { status: 502 });
    }
    /* Sein Foto (aus der Chat-Frage „Hast du ein aktuelles Foto?") — dauerhaft ablegen:
       als `fotoUrl` am Profil (die spätere Bewerbungsseite) und als `personPath` am
       Kiss-Log-Auftrag (die Assets-Kachel braucht ein Bild, sonst filtert die Galerie
       sie weg — dieselbe Regel wie in /api/lebenslauf-auswertung). */
    const fotoDataUrl = String(body.foto ?? "").trim();
    let fotoPath = "";
    let fotoUrl = "";
    if (fotoDataUrl.startsWith("data:")) {
      fotoPath = await fotoAblegen(fotoDataUrl).catch(() => "");
      fotoUrl = fotoPath ? (await getSignedUrl(fotoPath, 60 * 60 * 24 * 365 * 10).catch(() => "")) : "";
    }
    profil = {
      id,
      erstelltAm: new Date().toISOString(),
      name: sK(body.name, 80) || undefined,
      email: sK(body.email, 200).toLowerCase() || undefined,
      stichpunkte: [],
      kategorien: antworten.richtungen,
      kompetenzen: antworten.faehigkeiten,
      sprachen: [
        ...(antworten.deutschNiveau ? [{ sprache: "Deutsch", niveau: antworten.deutschNiveau }] : []),
        ...antworten.weitereSprachen.map(sp => ({ sprache: sp })),
      ],
      /* DAMIT DIE KARTE NICHT LEER BLEIBT: Was er im Chat erzählt hat, wird zu seinem
         Werdegang und seinem Abschluss — sonst zeigt die Profilseite nur den Namen. */
      ...(antworten.zuletztText || antworten.zuletzt.length
        ? { erfahrung: [{ rolle: antworten.zuletztText || antworten.zuletzt.join(", "), zeitraum: antworten.jahreErfahrung }] }
        : {}),
      ...(antworten.ausbildungsstand ? { ausbildung: [{ titel: antworten.ausbildungsstand }] } : {}),
      ...(antworten.stadt ? { ort: antworten.stadt } : {}),
      ...(antworten.telefon ? { telefon: antworten.telefon } : {}),
      ...(antworten.start ? { verfuegbarkeit: antworten.start } : {}),
      ...(fotoUrl ? { fotoUrl } : {}),
      bezahlt: false,
    } as NonNullable<typeof profil>;
    await schreibeLebenslauf(profil);
    if (fotoPath) {
      try {
        const entries = await readKissLog();
        const e = entries.find(x => x.id === id);
        if (e) { e.personPath = e.personPath || fotoPath; await writeKissLog(entries); }
      } catch { /* das Foto ist Zugabe — die Chancen kommen trotzdem */ }
    }
  } else if (!(await darfAmProfilArbeiten(profil, device, request))) {
    return NextResponse.json({ error: "Not yours." }, { status: 403 });
  }

  /* Antworten und (falls vorhanden) CV-Auswertung fliessen ZUSAMMEN in den Prompt — wer
     beides gegeben hat, bekommt die genaueste Einschätzung. */
  const profilDaten = {
    sprechtext: profil.sprechtext ?? "",
    kategorien: profil.kategorien ?? [],
    kompetenzen: profil.kompetenzen ?? [],
    schwerpunkte: profil.schwerpunkte ?? [],
    erfahrung: (profil.erfahrung ?? []).map(e => ({ rolle: e.rolle, firma: e.firma, zeitraum: e.zeitraum, ergebnis: e.ergebnis })),
    ausbildung: profil.ausbildung ?? [],
    sprachen: profil.sprachen ?? [],
    ort: profil.ort ?? "",
    ...(antworten ? { klickAntworten: antworten } : {}),
  };

  /* Die vermittelbaren Felder + was er selbst angeklickt hat — die Welt, in der die
     Richtungen bleiben müssen (nie eine Vita zurückspiegeln). */
  const felder = Array.from(new Set([
    ...VERMITTELBARE_FELDER,
    ...(antworten?.richtungen ?? []),
  ])).slice(0, 16);

  /**
   * NUR NOCH EIN KI-LAUF (Owner 26.08.2026: „mein Gott, dauert es lange … wozu so lange?").
   *
   * VORHER LIEFEN ZWEI: der Chancen-Abgleich UND die Plus-Minus-Analyse. Seit die
   * Prozent-Karten aus dem Trichter geflogen sind (die Checkliste hat sie ersetzt), wurde
   * das Ergebnis des Abgleichs nur noch weggeworfen — bezahlt, abgewartet und nicht
   * angezeigt. Gemessen kostete das rund 47 Sekunden.
   *
   * Was der Bewerber sieht, ist die Analyse. Also wird nur noch sie gerechnet.
   */
  const analyse = await plusMinus(key, profilDaten, zielSprache, cvPathFuerAnalyse, felder);

  const mailArgs = {
    email: sK(body.email, 200), name: sK(body.name, 80),
    lang: String(body.lang ?? "").trim().slice(0, 2), origin: new URL(request.url).origin,
    topic: sK(body.topic, 60),
  };
  /* Die Mail trägt jetzt die Analyse statt einer Chancen-Liste — dasselbe, was er auf der
     Seite sieht, damit E-Mail und Trichter nicht zwei verschiedene Dinge behaupten. */
  void analyseMailSenden({ ...mailArgs, plus: analyse.plus, minus: analyse.minus, fazit: analyse.fazit });

  /* `vorschlaege`/`chancen` bleiben als leere Listen in der Antwort: Der Client liest sie
     noch, rendert aber nichts daraus. So bleibt eine alte, offene Seite funktionsfähig. */
  return NextResponse.json({ vorschlaege: [], chancen: [], analyse });
}
