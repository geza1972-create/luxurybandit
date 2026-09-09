import { NextResponse } from "next/server";
import { frageModell, str, KLEIN } from "@/lib/agent-modell";
import { mandantLesen } from "@/lib/versusforge-mandanten";
import { leadSpeichern, leadsLesen } from "@/lib/versusforge-lead";
import { anfragePerPost } from "@/lib/versusforge-anfrage-post";
import { sprachname } from "@/lib/lang";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DER TRICHTER DES MANDANTEN (Owner 09.09.2026: „er bekommt einen Funnel, eine URL, die er in
 * Insta oder FB eingeben kann").
 *
 * EIGENE DATEI, NICHT DIE HAUPTROUTE ERWEITERT. `app/api/versusforge/route.ts` befragt einen
 * UNTERNEHMER, um eine Strategie zu bauen — hier wird sein KUNDE befragt, um eine Anfrage zu
 * bekommen. Zwei verschiedene Gespräche mit zwei verschiedenen Zielen; sie in eine Route zu
 * legen hiesse, an jeder Verzweigung „wer ist gerade dran" zu prüfen, und in vier Wochen
 * ändert man das eine und zerlegt das andere.
 *
 * DIE ROLLE KOMMT AUS SEINEM PLAN. Was sein Trichter fragt, steht nicht in einer Liste,
 * sondern entsteht aus dem Plan, den die Maschine für ihn erzeugt hat — Hook, Zielgruppe,
 * Strecke. Deshalb ist die Mandantenseite nicht dieselbe Seite mit anderem Logo.
 *
 * ZWEI SCHRITTE:
 *  · `frage`     — die nächste Frage an seinen Kunden, samt Antwortvorschlägen zum Antippen
 *  · `abschluss` — Name und Telefon, gespeichert in SEINEM Fach
 *
 * DER ABSCHLUSS IST IN DER VORSCHAU GESPERRT (Owner 09.09.2026, nach meinem Einwand): Eine
 * öffentliche Seite, die Namen, Telefonnummern und je nach Fach Angaben zur Gesundheit
 * entgegennimmt, braucht Impressum und Datenschutzhinweis — die liegen erst vor, wenn er
 * gekauft und seine Angaben eingetragen hat. Und praktisch: Anfragen, die niemand lesen kann,
 * schaden seinen Kunden. Der Riegel steht HIER auf dem Server, nicht nur im Browser.
 */

const MAX_FRAGEN = 4;

type Runde = { frage: string; antwort: string };

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try { body = (await request.json()) as Record<string, unknown>; } catch { /* leer */ }

  const kennung = str(body.mandant, 40);
  const m = await mandantLesen(kennung);
  /* KEIN HINWEIS DARAUF, OB ES DEN MANDANTEN GIBT — dieselbe Antwort wie beim Dashboard. */
  if (!m) return NextResponse.json({ error: "Das geht hier gerade nicht." }, { status: 404 });

  const schritt = str(body.schritt, 20);
  const runden: Runde[] = (Array.isArray(body.runden) ? body.runden : [])
    .slice(0, MAX_FRAGEN)
    .map((r: unknown) => {
      const o = (r ?? {}) as Record<string, unknown>;
      return { frage: str(o.frage, 400), antwort: str(o.antwort, 1000) };
    })
    .filter(r => r.frage);

  /* ── ABSCHLUSS: Name und Telefon ─────────────────────────────────────── */
  if (schritt === "abschluss") {
    /**
     * DER RIEGEL — UND ER HÄNGT NICHT AM KAUF (09.09.2026, nach dem Owner-Modell „die Kunden
     * kommen rein, sehen kann er sie erst mit dem Dashboard").
     *
     * ZWEI UNABHÄNGIGE BEDINGUNGEN, und das ist der ganze Punkt:
     *
     *  · SAMMELN darf der Trichter, sobald seine PFLICHTANGABEN da sind. Eine öffentliche
     *    Seite, die Namen, Telefonnummern und je nach Fach Angaben zur Gesundheit
     *    entgegennimmt, braucht ein Impressum und einen Datenschutzhinweis — an der Stelle,
     *    an der erhoben wird, nicht irgendwann später. Das ist keine Verkaufsstufe, das ist
     *    die Voraussetzung, und sie kostet nichts.
     *
     *  · LESEN kann er die Anfragen erst mit dem bezahlten Dashboard (`stand === "scharf"`).
     *    Das ist die Verkaufsstufe — und sie steht woanders, nämlich am Dashboard.
     *
     * Hätte ich beides an den Kauf gehängt, liefe seine Anzeige auf eine Seite ohne
     * Impressum. Das trifft nicht uns, sondern ihn.
     *
     * Der Browser zeigt ohne Pflichtangaben gar kein Formular — aber der Browser ist die
     * Anzeige, nicht die Wache.
     */
    if (!m.impressumUrl || !m.datenschutzUrl) {
      return NextResponse.json({ error: "Dieser Trichter ist noch nicht online." }, { status: 403 });
    }
    const name = str(body.name, 120).trim();
    const telefon = str(body.telefon, 60).trim();
    if (name.length < 2 || telefon.length < 5) {
      return NextResponse.json({ error: "Bitte Name und Telefonnummer angeben." }, { status: 400 });
    }
    const ok = await leadSpeichern(kennung, {
      /* Kein E-Mail-Feld in diesem Trichter: Ein Patient gibt seine Nummer, keine Adresse.
         Das Feld bleibt leer, statt eine Adresse zu erfinden. */
      mail: "",
      ziel: "anfrage",
      text: str(body.einstieg, 400),
      url: "",
      /* Die Sprache des Trichters, nicht „de" fest: In der Anfrageliste steht sonst bei
         jedem rumänischen Kunden „Deutsch" — und die Liste ist das, was der Mandant kauft. */
      sprache: String(m.sprache ?? "de").slice(0, 2),
      plan: null,
      runden: [...runden, { frage: "Name", antwort: name }, { frage: "Telefon", antwort: telefon }],
      zeit: new Date().toISOString(),
    });
    /* Beim Fehlschlag NICHT „hat geklappt" sagen — sonst wartet ein Mensch auf einen Anruf,
       der nie kommt (dieselbe Regel wie im Haupttrichter). */
    if (!ok) return NextResponse.json({ error: "Das ging gerade nicht. Bitte gleich noch einmal." }, { status: 502 });

    /**
     * „DU HAST EINE ANFRAGE" (Owner 09.09.2026).
     *
     * ERST SPEICHERN, DANN VERSENDEN — nie umgekehrt. Scheitert die Mail, steht die Anfrage
     * trotzdem im Fach; scheitert das Speichern, wäre eine Mail draussen über etwas, das es
     * nicht gibt.
     *
     * UND SIE BLOCKIERT DIE ANTWORT NICHT: Der Mensch, der gerade seine Nummer hinterlassen
     * hat, wartet nicht darauf, dass eine Mail an jemand anderen rausgeht.
     */
    void (async () => {
      try {
        const alle = await leadsLesen(kennung, 500);
        await anfragePerPost({ an: m.mail, mandant: kennung, name: m.name, offen: alle.length, schluessel: m.schluessel, loeschSchluessel: m.loeschSchluessel });
      } catch (e) {
        console.error("[versusforge-mandant] Benachrichtigung fehlgeschlagen", e);
      }
    })();

    return NextResponse.json({ ok: true });
  }

  /* ── FRAGE: die nächste, aus seinem Plan heraus ──────────────────────── */
  if (schritt !== "frage") {
    return NextResponse.json({ error: "Unbekannter Schritt." }, { status: 400 });
  }
  if (runden.length >= MAX_FRAGEN) {
    return NextResponse.json({ ok: true, fertig: true });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Gerade nicht erreichbar." }, { status: 503 });

  const plan = (m.plan ?? {}) as Record<string, unknown>;
  const einstieg = str(body.einstieg, 400);

  const auftrag = [
    `Du bist der Anfrage-Trichter von "${m.name}".`,
    `Du sprichst mit einem KUNDEN dieses Betriebs — nicht mit dem Betrieb selbst.`,
    "",
    "Das weisst du über den Betrieb:",
    plan.hook ? `· Womit er wirbt: ${String(plan.hook)}` : "",
    Array.isArray(plan.zielgruppe) && plan.zielgruppe.length ? `· Wen er erreichen will: ${(plan.zielgruppe as string[]).slice(0, 5).join(" | ")}` : "",
    Array.isArray(plan.trichter) && plan.trichter.length ? `· Die Strecke: ${(plan.trichter as string[]).slice(0, 5).join(" -> ")}` : "",
    "",
    `Der Mensch hat als Erstes das hier angetippt: "${einstieg}"`,
    runden.length ? "Bisher gefragt und geantwortet:" : "",
    ...runden.map((r, i) => `${i + 1}. ${r.frage} -> ${r.antwort}`),
    "",
    "Stelle die NÄCHSTE Frage.",
    /**
     * ── DIE SPRACHZEILE HAT HIER GANZ GEFEHLT (Owner 09.09.2026: „auch alles, was er
     * erstellt … wird in der Sprache erstellt, die er spricht") ─────────────────────────────
     *
     * Ohne sie antwortet ein Modell in der Sprache, in der der AUFTRAG geschrieben ist —
     * also Deutsch. Ein rumänischer Zahnarzt hätte seinen Patienten deutsche Fragen gestellt,
     * unter seinem eigenen Namen, auf seiner eigenen Seite. Das ist kein Schönheitsfehler,
     * das ist ein Trichter, der nichts einbringt.
     *
     * SIE STEHT AN ERSTER STELLE DER REGELN, weil sie für JEDES Feld gilt: Frage, Reaktion
     * und die Vorschläge zum Antippen.
     */
    `· Du schreibst AUSSCHLIESSLICH auf ${sprachname(m.sprache)} — die Frage, die Reaktion und JEDER Vorschlag. Kein Wort aus einer anderen Sprache.`,
    /* DIE REGELN, DIE DEN UNTERSCHIED MACHEN — dieselbe Handschrift wie im Haupttrichter,
       nur an einen Menschen gerichtet, der kein Unternehmer ist. */
    "· Eine einzige Frage, höchstens 15 Wörter, in SEINER Alltagssprache. Keine Fachbegriffe.",
    "· Sie muss aus seiner letzten Antwort folgen. Eine Frage, die man auch ohne die Antwort hätte stellen können, ist ein Formular.",
    "· Frage nach seiner Lage, nie nach Name, Adresse, Telefon oder Geburtsdatum — das kommt am Ende von selbst.",
    "· Keine Diagnose, kein Rat, kein Versprechen. Du fragst, du berätst nicht.",
    "· 'vorschlaege': 3 bis 4 kurze Antworten zum Antippen, höchstens 5 Wörter. Sie decken die wahrscheinlichsten Fälle ab und lassen immer Platz für 'weiss ich nicht'.",
    "· 'reaktion': ein kurzer Satz, der zeigt, dass du die letzte Antwort gelesen hast. Beim ersten Mal leer lassen.",
    `· Setze 'fertig' auf true, wenn du genug weisst — spätestens nach ${MAX_FRAGEN} Fragen.`,
    "",
    'Antworte NUR als JSON: {"reaktion":"...","frage":"...","vorschlaege":["..."],"fertig":false}',
  ].filter(Boolean).join("\n");

  const r = await frageModell(apiKey, KLEIN, [{ type: "input_text", text: auftrag }]);
  if (!r.ok) return NextResponse.json({ error: "Das dauert gerade zu lange. Versuch es bitte noch einmal." }, { status: 502 });

  const d = r.daten as Record<string, unknown>;
  return NextResponse.json({
    ok: true,
    reaktion: str(d.reaktion, 200),
    frage: str(d.frage, 300),
    vorschlaege: (Array.isArray(d.vorschlaege) ? d.vorschlaege : []).slice(0, 4).map((v: unknown) => str(v, 60)).filter(Boolean),
    fertig: d.fertig === true,
  });
}
