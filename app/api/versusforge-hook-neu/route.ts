import { NextResponse } from "next/server";
import crypto from "crypto";
import { mandantLesen, mandantSpeichern } from "@/lib/versusforge-mandanten";
import { frageModell, str, KLEIN } from "@/lib/agent-modell";
import { HOOK_REGELN, HEBEL } from "@/lib/versusforge-hook-rezept";
import { REZEPTE, ENGINE_REZEPT } from "@/lib/versusforge-rezepte";
import { sprachname } from "@/lib/lang";
import { bildAnsehen } from "@/lib/versusforge-bild-ansehen";
import { motivPfad } from "@/lib/versusforge-moderation";
import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";

/**
 * EINEN NEUEN HOOK SCHREIBEN LASSEN (Owner 09.09.2026: „es müsste einen Button geben, der
 * immer wieder einen neuen Hook erstellt, textlich. Dann sage ich entweder löschen oder Bild
 * generieren" · „für 299 müssen wir mindestens 5 erstellen").
 *
 * ── ERST TEXT, DANN BILD ───────────────────────────────────────────────────────────────────
 *
 * Das ist die richtige Reihenfolge, und sie ist nicht meine Idee: Ein Hook steht oder fällt
 * mit dem Satz. Wer zuerst ein Bild baut, beurteilt Schrift, Farbe und Zeilenumbruch — und
 * merkt erst danach, dass der Satz nichts taugt. Der Text allein lässt sich in zwei Sekunden
 * verwerfen.
 *
 * EINER PRO KLICK, NICHT FÜNF AUF EINMAL. Fünf Vorschläge nebeneinander liest niemand
 * einzeln; man nimmt den ersten, der irgendwie geht. Einer nach dem anderen zwingt zu einer
 * Entscheidung je Satz — behalten oder weg — und genau die will er treffen.
 *
 * ER KOSTET GELD, UND ZWAR NUR AUF SEINEN KLICK ([[kein-token-fuer-abbrecher]]): ein Aufruf
 * beim kleinen Modell. Deshalb gibt es hier keine Schleife, die von selbst fünf Stück baut.
 *
 * DIE VORHANDENEN GEHEN MIT IN DEN AUFTRAG — sonst kommt beim dritten Klick zum dritten Mal
 * derselbe Gedanke in anderen Worten. Und die Hebel aus dem Rezept rotieren: Jeder Klick
 * bekommt einen anderen Blickwinkel vorgegeben.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function schluesselStimmt(soll: string, ist: string): boolean {
  if (!soll || !ist) return false;
  const a = Buffer.from(soll, "utf8");
  const b = Buffer.from(ist, "utf8");
  if (a.length !== b.length) return false;
  try { return crypto.timingSafeEqual(a, b); } catch { return false; }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const kennung = str(body.mandant, 80);
  const k = str(body.k, 200);

  const m = await mandantLesen(kennung);
  if (!m || !schluesselStimmt(m.schluessel, k)) {
    return NextResponse.json({ error: "Dieser Zugang stimmt nicht." }, { status: 403 });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: "Der Generator ist gerade nicht erreichbar." }, { status: 503 });

  const plan = (m.plan ?? {}) as {
    hook?: string; befund?: string; zielgruppe?: string[];
    hebel?: Record<string, string>;
  };
  const hooks = Array.isArray(m.hooks) ? [...m.hooks] : [];
  const schon = [plan.hook, ...hooks].filter(Boolean) as string[];

  /**
   * NUR HEBEL MIT MATERIAL (Owner 09.09.2026: „bis wir die zu 100% haben").
   *
   * Vorher drehte diese Zeile alle fünf reihum durch — auch die, zu denen im Plan nichts
   * stand. Das Ergebnis stand am selben Tag in seinem Dashboard: ein Hook über nichts, weil
   * das Modell zum Hebel „Knappheit" kein einziges Wort hatte und trotzdem einen Satz
   * liefern sollte. Viermal derselbe gefüllte Hebel aus verschiedenen Anläufen ist besser
   * als einmal Nichts.
   */
  const rezept = REZEPTE[ENGINE_REZEPT];
  const worum = str(body.worum, 300).trim();
  let auftrag: string;

  if (rezept.mitBildern) {
    /**
     * ── KUNST: DER GENERATOR SIEHT DAS WERK (Owner 10.09.2026: „Auf seinem Dashboard kann er …
     * dort kann er weitere generieren") ──────────────────────────────────────────────────────
     *
     * ZWEI GRÜNDE, WARUM DER HEBEL-WEG HIER NICHT TRÄGT:
     *  · Künstler aus dem Kunst-Agenten haben KEINE Hebel gespeichert (`abschluss_schicken`
     *    legt Hook, Zielgruppe und Karten ab). Der alte Weg antwortete ihnen „kein Material".
     *  · Beim Künstler IST das Werk der Stoff. Unten stand „Wir sehen das Motiv nicht" — seit
     *    `lib/versusforge-bild-ansehen.ts` sehen wir es.
     *
     * DAS STANDARDBILD WIRD ANGESEHEN (ein Aufruf des kleinen Modells je Klick, niedrige
     * Auflösung) — nur aus der freigegebenen Ablage, nie aus der Prüfablage. Seine Worte
     * (`worum`) kommen dazu, wenn er welche schreibt.
     *
     * DIE BLICKWINKEL KOMMEN AUS DEM KUNST-REZEPT und rotieren je Klick, damit nicht fünfmal
     * dasselbe Merkmal im Satz steht.
     */
    const bildRes = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(motivPfad(kennung, ""))}`);
    const werkBild = bildRes.ok ? `data:image/jpeg;base64,${Buffer.from(await bildRes.arrayBuffer()).toString("base64")}` : "";
    if (!werkBild && !worum) {
      return NextResponse.json({
        error: "Lade zuerst ein Werk als Standardbild hoch — dann schreibe ich Hooks, die genau zu diesem Werk passen.",
      }, { status: 409 });
    }
    const befund = werkBild ? await bildAnsehen({ apiKey, bild: werkBild }) : null;
    const werk = befund?.ok ? befund.werk : null;
    const BLICKWINKEL = [
      "DAS SELTENE — die Verbindung von Merkmalen, die es so nicht oft gibt.",
      "DER STIL — was ihn ausmacht und warum man ihn an einer Wand sofort erkennt.",
      "DER ORT — wo das Werk hängt und was es dort mit dem Raum macht.",
      "DER KÄUFER — was der Mensch, der es kauft, damit über sich sagt.",
    ];
    const blick = BLICKWINKEL[schon.length % BLICKWINKEL.length];

    auftrag = [
      "Du schreibst Werbe-Hooks für ein Kunstwerk. Antworte NUR mit JSON.",
      /* IN SEINER SPRACHE (10.09.2026, im Test gesehen): Ein englisch angelegter Künstler bekam
         deutsche Hooks — der Generator wusste die Sprache nie. Die Plattform spricht zuerst
         Englisch; der Hook steht in der Sprache, in der der Künstler angelegt ist. */
      `SCHREIB DEN HOOK AUF ${sprachname(String(m.sprache ?? "en")).toUpperCase()}.`,
      HOOK_REGELN,
      werk
        ? `WAS DU IM WERK SIEHST: Medium ${werk.medium || "?"} · Stil ${werk.stil || "?"} · Motiv ${werk.motiv || "?"} · Merkmale: ${werk.merkmale.join(", ") || "?"}${werk.selten ? ` · selten: ${werk.selten}` : ""}`
        : "",
      worum ? `IN SEINEN WORTEN, ÜBER GENAU DIESES WERK: „${worum}"` : "",
      `BLICKWINKEL FÜR DIESEN EINEN HOOK — ${blick}`,
      "Nimm mindestens ein konkretes, sichtbares Merkmal dieses Werks in den Satz. DIE PRÜFUNG: Würde derselbe Satz auch über das Bild daneben stimmen, ist er falsch. Schreib ihn neu.",
      `DER KÜNSTLER: ${m.name}${m.ort ? `, ${m.ort}` : ""}.`,
      Array.isArray(plan.zielgruppe) && plan.zielgruppe.length ? `WER ES KAUFEN KÖNNTE: ${plan.zielgruppe.join(" · ")}` : "",
      Array.isArray(m.karten) && m.karten.length ? `WAS SEINE KÄUFER ANTIPPEN: ${m.karten.join(" · ")}` : "",
      schon.length
        ? `DIESE HOOKS GIBT ES SCHON — schreib etwas ANDERES, nicht dieselbe Aussage in anderen Worten:\n${schon.map(h => `- ${h}`).join("\n")}`
        : "",
      'ANTWORTFORM: {"hook":"…"} — ein einziger Satz, höchstens 12 Wörter, ohne Anführungszeichen.',
    ].filter(Boolean).join("\n\n");
  } else {
  const material = plan.hebel ?? {};
  const brauchbar = HEBEL.filter(h => String(material[h.schluessel] ?? "").trim());
  if (!brauchbar.length) {
    return NextResponse.json({
      error: "Für deinen Trichter liegt noch kein Material vor. Geh einmal durch die Fragen — danach schreibe ich dir Hooks, die zu dir passen.",
    }, { status: 409 });
  }
  const hebel = brauchbar[schon.length % brauchbar.length];

  /**
   * ── EIN HOOK ÜBER GENAU DIESES STÜCK (Owner 09.09.2026, an der Van-Gogh-Kachel: „in diesem
   * Bild kann sogar ein Spruch sein — ein Blau, das sich ein zweites Mal nicht mehr verkauft.
   * Das kann aber aus dem Text kommen, also aus den Antworten des Users") ────────────────────
   *
   * SEIN SATZ WAR BESSER ALS MEINER, und der Unterschied ist der ganze Punkt. Der Generator
   * kannte bisher nur den BETRIEB — daraus wird „Ein Bild, das sich kein zweites Mal
   * verkauft": richtig für jede Galerie der Welt. Aus einem Wort über DIESES Werk wird
   * „Ein Blau, das sich kein zweites Mal verkauft" — und das kann niemand sonst schreiben.
   *
   * DER STOFF KOMMT VON IHM, NICHT AUS DEM BILD. Wir sehen das Motiv nicht; er schreibt in
   * einem Halbsatz, worum es geht — „Nachthimmel, dunkles Blau, eine Zypresse" —, und die
   * fünf Schritte arbeiten mit diesem Stoff statt mit dem Betrieb im Allgemeinen.
   *
   * ES BLEIBT FREIWILLIG: Wer nichts schreibt, bekommt weiterhin einen Hook über sein
   * Geschäft. Der Makler mit drei Wohnungen und der Künstler mit fünf Werken brauchen es,
   * der Zahnarzt nicht.
   */
  auftrag = [
    "Du schreibst Werbe-Hooks für einen Betrieb. Antworte NUR mit JSON.",
    HOOK_REGELN,
    /**
     * ── KONKRET HEISST NICHT GEGENSTÄNDLICH (Owner 09.09.2026: „die Immobilienverkäufer
     * verkaufen auch das Feeling oder die Aussicht") ────────────────────────────────────────
     *
     * MEINE ERSTE FASSUNG WAR ZU ENG: „eine Farbe, ein Material, eine Zahl, ein Handgriff" —
     * lauter Dinge, die man anfassen kann. Beim Makler ist das Konkrete aber keins davon.
     * Niemand kauft 78 Quadratmeter; man kauft den Morgen auf dem Balkon, den Blick über die
     * Dächer, die Ruhe im Hinterhof. Eine Wohnung wird über das verkauft, was man dort TUT
     * und SIEHT — und das ist genauso konkret wie ein Material, nur nicht anfassbar.
     *
     * DIE PRÜFUNG BLEIBT DIESELBE UND IST DAS EIGENTLICHE: Würde derselbe Satz auch über das
     * Nachbarstück stimmen, ist er falsch. Ob er ein Ding nennt oder einen Moment, ist egal.
     */
    worum
      ? `DER HOOK GEHT UM GENAU DIESES STÜCK, in SEINEN Worten: „${worum}"\nNimm etwas Konkretes daraus in den Satz. Das kann ein Ding sein — eine Farbe, ein Material, eine Zahl, ein Handgriff. Es kann genauso gut ein Moment sein: eine Aussicht, ein Licht, eine Tageszeit, eine Stille, was man von dort aus sieht oder dort tut.\nDIE PRÜFUNG: Würde derselbe Satz auch über das Nachbarstück stimmen — die Wohnung nebenan, das Bild daneben —, ist er falsch. Schreib ihn neu.`
      : "",
    `BLICKWINKEL FÜR DIESEN EINEN HOOK — ${hebel.name}: ${hebel.frage}`,
    /* SEIN Material zu genau diesem Hebel, wörtlich. Ohne diese Zeile schreibt das Modell
       über den Hebel im Allgemeinen statt über seinen Betrieb. */
    `WAS ER DAZU GESAGT HAT: ${material[hebel.schluessel]}`,
    /* Die übrigen Hebel als Umfeld — sie dürfen mitschwingen, führen aber nicht. */
    brauchbar.filter(h => h.schluessel !== hebel.schluessel).length
      ? `WEITERES ÜBER IHN:\n${brauchbar.filter(h => h.schluessel !== hebel.schluessel).map(h => `- ${h.name}: ${material[h.schluessel]}`).join("\n")}`
      : "",
    `DER BETRIEB: ${m.name}${m.ort ? `, ${m.ort}` : ""}.`,
    plan.befund ? `BEFUND AUS SEINER ANALYSE: ${plan.befund}` : "",
    Array.isArray(plan.zielgruppe) && plan.zielgruppe.length
      ? `SEINE ZIELGRUPPE: ${plan.zielgruppe.join(" · ")}`
      : "",
    m.unterzeile ? `WAS AUF SEINER SEITE STEHT: ${m.unterzeile}` : "",
    Array.isArray(m.karten) && m.karten.length ? `WAS SEINE KUNDEN ANTIPPEN: ${m.karten.join(" · ")}` : "",
    /* DAS WICHTIGSTE AM AUFTRAG: nicht wiederholen, was schon dasteht. */
    schon.length
      ? `DIESE HOOKS GIBT ES SCHON — schreib etwas ANDERES, nicht dieselbe Aussage in anderen Worten:\n${schon.map(h => `- ${h}`).join("\n")}`
      : "",
    'ANTWORTFORM: {"hook":"…"} — ein einziger Satz, höchstens 12 Wörter, ohne Anführungszeichen.',
  ].filter(Boolean).join("\n\n");
  }

  let hook = "";
  try {
    const r = await frageModell(apiKey, KLEIN, [{ type: "input_text", text: auftrag }]);
    /* `Ergebnis` ist eine Entweder-oder-Form: Bei `ok:false` gibt es kein `daten`, sondern
       einen Grund. Ihn durchzureichen ist ehrlicher als „ging nicht" — bei leerem Guthaben
       steht es dann auch da ([[openai-guthaben-leer]]). */
    if (!r.ok) {
      console.error("[versusforge-hook-neu] Modell:", r.status, r.fehler);
      return NextResponse.json({ error: "Der Generator hat gerade nicht geantwortet." }, { status: 502 });
    }
    hook = str((r.daten as { hook?: string }).hook, 300).trim();
  } catch (e) {
    console.error("[versusforge-hook-neu] Modellaufruf fehlgeschlagen", e);
    return NextResponse.json({ error: "Der Generator hat gerade nicht geantwortet." }, { status: 502 });
  }
  if (hook.length < 12) {
    return NextResponse.json({ error: "Dabei kam nichts Brauchbares heraus. Versuch es noch einmal." }, { status: 502 });
  }
  /* Doppelte gar nicht erst ablegen — sie kosten ihn einen Klick und sagen nichts Neues. */
  if (schon.some(h => h.trim().toLowerCase() === hook.toLowerCase())) {
    return NextResponse.json({ error: "Der Vorschlag war derselbe wie schon einer. Noch einmal?" }, { status: 502 });
  }

  hooks.unshift(hook);
  const ok = await mandantSpeichern(kennung, { ...m, hooks });
  if (!ok) return NextResponse.json({ error: "Das ging gerade nicht. Bitte gleich noch einmal." }, { status: 502 });

  return NextResponse.json({ ok: true, hook, hooks });
}
