import { NextResponse } from "next/server";
import { leseLebenslauf } from "@/lib/lebenslauf-store";
import { darfAmProfilArbeiten } from "@/lib/lebenslauf-besitz";
import { anzeigenTextBeschaffen } from "@/lib/lebenslauf-anzeige";
import { leseChance, chanceIstVeroeffentlichbar } from "@/lib/job-chancen";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * DER ANZEIGEN-ABGLEICH (Owner 24.08.2026, an der Stelle, wo die Vorlage bis dahin pauschale
 * „Starke/Gute Passung"-Kategorien ohne echten Vergleich zeigte — seither entfernt: „Ich
 * brauche was visuelles. Einen Balken mit Prozente. Noch besser wäre wenn ich den Link einer
 * Anzeige einbaue und sehe direkt den Match.").
 *
 * WARUM HIER EINE PROZENTZAHL ERLAUBT IST (Auftrag 22.08.: „Do NOT display arbitrary
 * percentages" galt für eine Zahl OHNE Grundlage — eine erfundene Genauigkeit auf einer
 * generischen Berufskategorie). Hier ist die Zahl das Ergebnis eines ECHTEN Abgleichs gegen
 * einen KONKRETEN Anzeigentext, den der Bewerber selbst mitbringt — eine Messung mit
 * Bezugspunkt, keine Behauptung ins Leere.
 *
 * NICHT PERSISTIERT: Der Abgleich ist ein Werkzeug für DIESEN Moment (er testet Anzeige um
 * Anzeige), kein Profil-Feld — jeder Aufruf ist eigenständig, nichts überschreibt das Profil.
 *
 * `eingabe` ist ENTWEDER ein Link ODER der eingefügte Text der Anzeige — den Abruf samt
 * Rückfall-Logik teilt sich diese Route seit dem 25.08.2026 mit der Bewerbungs-Erzeugung
 * (lib/lebenslauf-anzeige.ts).
 */

/**
 * DIE ANTWORT MUSS DIE SPRACHE DES BETRACHTERS TREFFEN (Owner 24.08.2026: „der Match-Text
 * ist auf Deutsch anstatt Englisch"). Die Route bekam bisher NIE mitgeteilt, in welcher
 * Sprache die Seite gerade läuft — der Prompt selbst ist auf Deutsch verfasst, und ohne
 * Weisung schrieb die KI auch die Antwort auf Deutsch, unabhängig davon, ob der Betrachter
 * die Seite auf Englisch, Rumänisch oder sonst einer der sieben Haussprachen liest.
 * Dieselbe Namensliste wie `lib/translate.ts` (LANG_NAME).
 */
const SPRACHNAME: Record<string, string> = { de: "German", en: "English", ro: "Romanian", es: "Spanish", fr: "French", pt: "Portuguese", it: "Italian" };

/**
 * DIE STRUKTUR-ANALYSE (Owner-Auftrag 26.08.2026, KONZEPT-JOB-MATCH-TRICHTER.md
 * Baustelle A): Statt nur „passt/fehlt" klassifiziert die Antwort jetzt jede wichtige
 * Anforderung der Anzeige in eine von vier Einstufungen und leitet daraus EINE von drei
 * Gesamt-Empfehlungen ab. `prozent`/`jobtitel`/`gruende`/`luecken` bleiben unverändert —
 * bestehende Aufrufer (`ProfilAssistent`) lesen weiter nur diese vier Felder und bleiben
 * unangetastet.
 */
type Einstufung = "erfuellt" | "uebertragbar" | "erklaerbar" | "blocker";
const EINSTUFUNGEN: readonly Einstufung[] = ["erfuellt", "uebertragbar", "erklaerbar", "blocker"];
type Empfehlung = "gut" | "bruecke" | "schwach";
const EMPFEHLUNGEN: readonly Empfehlung[] = ["gut", "bruecke", "schwach"];

function extractJson(text: string): {
  prozent?: number; jobtitel?: string; gruende?: string[]; luecken?: string[];
  empfehlung?: string; anforderungen?: { text?: string; einstufung?: string; begruendung?: string }[];
} | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}

export async function POST(request: Request) {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: "OPENAI_API_KEY fehlt." }, { status: 500 });

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const id = String(body.id ?? "").trim();
  const device = String(body.device ?? "").trim().slice(0, 80);
  const eingabe = String(body.eingabe ?? "").trim().slice(0, 4000);
  /* DER JOBCHANCEN-EINGANG (Baustelle A/E, Tür 2): statt `eingabe` darf der Body eine
     `chanceId` tragen — dann kommt der Anzeigentext aus dem Pool statt vom Bewerber. */
  const chanceId = String(body.chanceId ?? "").trim();
  const zielSprache = SPRACHNAME[String(body.lang ?? "").trim().slice(0, 2)] ?? "English";
  if (!id || (!eingabe && !chanceId)) return NextResponse.json({ error: "Kennung oder Anzeige fehlt." }, { status: 400 });

  const profil = await leseLebenslauf(id);
  if (!profil) return NextResponse.json({ error: "Profil nicht gefunden." }, { status: 404 });
  if (!(await darfAmProfilArbeiten(profil, device, request))) {
    return NextResponse.json({ error: "Not yours." }, { status: 403 });
  }

  let anzeigeText = "";
  let anzeigeQuelle: "link" | "text" | "chance" = "text";
  let chanceRolle = "";
  if (chanceId) {
    const chance = await leseChance(chanceId);
    if (!chance || !chanceIstVeroeffentlichbar(chance)) {
      return NextResponse.json({ error: "Chance nicht gefunden." }, { status: 404 });
    }
    anzeigeText = chance.intern.originalText?.trim()
      || [chance.rolle, chance.kurzbeschreibung, ...chance.anforderungen].filter(Boolean).join("\n");
    anzeigeQuelle = "chance";
    chanceRolle = chance.rolle;
  } else {
    const anzeige = await anzeigenTextBeschaffen(eingabe);
    if (!anzeige.text) return NextResponse.json({ error: anzeige.fehler ?? "Keine Anzeige erkannt." }, { status: 422 });
    anzeigeText = anzeige.text;
    anzeigeQuelle = anzeige.quelle;
  }

  const profilDaten = {
    sprechtext: profil.sprechtext ?? "",
    kategorien: profil.kategorien ?? [],
    kompetenzen: profil.kompetenzen ?? [],
    schwerpunkte: profil.schwerpunkte ?? [],
    erfahrung: (profil.erfahrung ?? []).map(e => ({ rolle: e.rolle, firma: e.firma, zeitraum: e.zeitraum, ergebnis: e.ergebnis })),
    ausbildung: profil.ausbildung ?? [],
    sprachen: profil.sprachen ?? [],
  };

  const prompt = [
    "Du bist ein nüchterner Recruiting-Analyst. Vergleiche ein Bewerberprofil (JSON) mit einer echten Stellenanzeige (Text) und sagst ehrlich, wie gut es passt.",
    `Profil: ${JSON.stringify(profilDaten)}`,
    `Stellenanzeige:\n${anzeigeText}`,
    // QUELLEN-COMPLIANCE (Baustelle D/E): Bei einer Jobchance aus dem Pool ist der
    // Anzeigentext nur ein internes Marktsignal — die Antwort darf nirgends einen
    // Firmennamen daraus in die Kandidaten-Sicht durchreichen.
    ...(chanceId ? ["Diese Stellenanzeige ist eine interne Markt-Chance. Nenne NIRGENDS in deiner Antwort einen Firmennamen, eine Marke oder ein Unternehmen aus dem Text — sprich immer nur von \"dieser Stelle\"."] : []),
    "Berechne 'prozent' NUR aus echter Überschneidung zwischen dem, was das Profil belegt, und dem, was die Anzeige verlangt — geforderte Erfahrung, Fähigkeiten, Ausbildung, Sprachen, Senioritätsstufe. Sei streng: 90+ nur bei sehr naher Übereinstimmung, unter 40 wenn zentrale Anforderungen fehlen. Erfinde keine Übereinstimmung, die nicht wirklich dasteht.",
    "'jobtitel' — der Titel der Stelle, wörtlich aus der Anzeige, oder leer, wenn keiner erkennbar ist.",
    "'gruende' — 3–5 KONKRETE Übereinstimmungen, je ein kurzer Satz, der eine Zeile aus dem Profil an eine Anforderung der Anzeige bindet (z. B. \"5 Jahre React verlangt — 6 Jahre im Profil belegt\"). Nur echte Treffer, nichts Beschönigtes.",
    "'luecken' — 0–4 Anforderungen der Anzeige, die das Profil NICHT belegt. Leeres Array, wenn wirklich nichts fehlt.",
    // DIE VIER EINSTUFUNGEN — Quereinsteiger-Regel (Owner-Auftrag 26.08.2026): fehlende
    // exakte Branchenerfahrung ist NICHT automatisch ein Blocker, erst auf Übertragbarkeit
    // prüfen (Kundenkontakt, Reklamation, Verkauf, Problemlösung, Organisation, Führung,
    // Technik-Troubleshooting, Verwaltung, Mehrsprachigkeit).
    "Klassifiziere zusätzlich JEDE wichtige Anforderung der Anzeige (höchstens 10) einzeln in 'anforderungen'. Jede Anforderung bekommt GENAU eine von vier Einstufungen:",
    "'erfuellt' — im Profil klar belegt.",
    "'uebertragbar' — die exakt geforderte Erfahrung fehlt, aber das Profil belegt eine wirklich verwandte Erfahrung, die überträgt. Nenne in 'begruendung' KONKRET, WELCHE Profil-Erfahrung überträgt. Beispiel: Anzeige verlangt \"2 Jahre Customer Support\", Profil zeigt \"8 Jahre Einzelhandel mit täglicher Reklamationsbearbeitung\" → uebertragbar, weil direkter Kundenkontakt und Reklamationsbearbeitung stark übertragbare Fähigkeiten sind. Sprachkenntnisse des Bewerbers sind ein eigenes Plus, wenn die Anzeige eine Sprache verlangt oder nahelegt.",
    "'erklaerbar' — die Anforderung ist nicht erfüllt, lässt sich aber in einer Bewerbung seriös adressieren: Bewerber wohnt in einem anderen Land als die Stelle (Umzugsbereitschaft), hat nie exakt diesen Jobtitel getragen, kommt aus einer anderen Branche, oder es fehlt ein kleineres Tool/eine kleinere Software-Kenntnis.",
    "'blocker' — eine fundamentale Anforderung fehlt UND lässt sich nicht seriös überbrücken. NUR für harte Fälle: eine gesetzlich nötige Lizenz oder Berufsanerkennung, eine fehlende Arbeitserlaubnis ohne erkennbaren Weg dahin, ein Führerschein bei einer Fahr-Tätigkeit, ein verlangtes Sprachniveau (z. B. C2), das weit über dem Niveau des Bewerbers liegt (z. B. A1), oder eine andere gesetzlich zwingende Qualifikation. Sei bei 'blocker' zurückhaltend — fehlende exakte Branchenerfahrung allein ist KEIN Blocker. Aber verharmlose einen echten Blocker nicht: Glaubwürdigkeit ist wichtiger als eine ermutigende Antwort, ermutige nicht automatisch jeden Bewerber.",
    "Jede Anforderung als: {\"text\":\"...\" (die Anforderung, kurz), \"einstufung\":\"erfuellt\"|\"uebertragbar\"|\"erklaerbar\"|\"blocker\", \"begruendung\":\"...\" (1–2 Sätze)}.",
    "Leite daraus 'empfehlung' ab: \"schwach\", wenn mindestens eine Anforderung 'blocker' ist. Sonst \"gut\", wenn die wichtigen Anforderungen überwiegend 'erfuellt' sind. Sonst \"bruecke\".",
    `Schreibe 'gruende', 'luecken' sowie 'text'/'begruendung' in 'anforderungen' auf ${zielSprache} — UNABHÄNGIG davon, in welcher Sprache das Profil oder die Anzeige verfasst sind. Nur 'jobtitel' bleibt wörtlich in der Sprache der Anzeige (ein Eigenname wird nicht übersetzt).`,
    "Antworte NUR als JSON: {\"prozent\":0,\"jobtitel\":\"...\",\"gruende\":[\"...\"],\"luecken\":[\"...\"],\"empfehlung\":\"gut\"|\"bruecke\"|\"schwach\",\"anforderungen\":[{\"text\":\"...\",\"einstufung\":\"...\",\"begruendung\":\"...\"}]}",
  ].join("\n\n");

  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL ?? "gpt-5-mini",
      input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
    }),
  }).then(res => res.json()).catch(() => null) as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }>; error?: { message?: string } } | null;

  const text = r?.output_text ?? r?.output?.flatMap(o => o?.content ?? [])?.map(c => c?.text ?? "")?.join("") ?? "";
  const parsed = text ? extractJson(text) : null;
  if (!parsed) {
    return NextResponse.json({ error: r?.error?.message ?? "Abgleich fehlgeschlagen — bitte noch einmal." }, { status: 502 });
  }

  const prozent = Math.max(0, Math.min(100, Math.round(Number(parsed.prozent) || 0)));
  /* Bei einer Jobchance steht der Titel NIE von der KI, sondern immer die neutrale
     `rolle` aus dem Pool — selbst wenn die KI die Anweisung oben ignorieren würde,
     kann so kein firmenspezifischer Titel aus `intern.originalText` durchsickern. */
  const jobtitel = chanceId ? chanceRolle : String(parsed.jobtitel ?? "").trim().slice(0, 120);
  const gruende = (parsed.gruende ?? []).map(g => String(g).trim()).filter(Boolean).slice(0, 5);
  const luecken = (parsed.luecken ?? []).map(g => String(g).trim()).filter(Boolean).slice(0, 4);

  /* DIE VIER EINSTUFUNGEN — nur Einträge mit bekannter `einstufung` UND nicht-leerem
     `text` zählen; alles andere wird verworfen statt geraten (Baustelle A). */
  const anforderungen = (Array.isArray(parsed.anforderungen) ? parsed.anforderungen : [])
    .map(a => ({
      text: String(a?.text ?? "").trim().slice(0, 160),
      einstufung: (EINSTUFUNGEN as readonly string[]).includes(String(a?.einstufung ?? "")) ? (a!.einstufung as Einstufung) : null,
      begruendung: String(a?.begruendung ?? "").trim().slice(0, 280),
    }))
    .filter((a): a is { text: string; einstufung: Einstufung; begruendung: string } => !!a.text && !!a.einstufung)
    .slice(0, 10);

  /* DIE GESAMTEMPFEHLUNG — wenn die KI eine gültige `empfehlung` liefert, gilt sie;
     sonst wird sie aus den Einstufungen abgeleitet (ein Blocker ⇒ schwach; überwiegend
     erfüllt ⇒ gut; sonst bruecke), und nur wenn gar keine Anforderungen vorliegen (alter
     Fall / leere KI-Antwort) fällt die Ableitung auf dieselbe Prozent-Schwelle zurück,
     die die Seite bisher schon fürs Etikett benutzt hat — nie geraten, immer hergeleitet. */
  const empfehlungRoh = String(parsed.empfehlung ?? "");
  const hatBlocker = anforderungen.some(a => a.einstufung === "blocker");
  const erfuellteAnteilHoch = anforderungen.length > 0 &&
    anforderungen.filter(a => a.einstufung === "erfuellt").length >= Math.ceil(anforderungen.length * 0.6);
  const empfehlung: Empfehlung = (EMPFEHLUNGEN as readonly string[]).includes(empfehlungRoh)
    ? (empfehlungRoh as Empfehlung)
    : hatBlocker ? "schwach"
    : anforderungen.length > 0 ? (erfuellteAnteilHoch ? "gut" : "bruecke")
    : (prozent >= 70 ? "gut" : prozent >= 40 ? "bruecke" : "schwach");

  return NextResponse.json({ prozent, jobtitel, gruende, luecken, empfehlung, anforderungen, quelle: anzeigeQuelle });
}
