import { NextResponse } from "next/server";
import { str, KLEIN, frageModell } from "@/lib/agent-modell";
import { mandantLesen } from "@/lib/versusforge-mandanten";
import { ereignisMerken } from "@/lib/versusforge-ereignis";
import { darfKi } from "@/lib/versusforge-abo";
import { istKuenstler } from "@/lib/lakatosbandi";
import { schluesselStimmt } from "@/lib/schluessel-vergleich";
import { sprachname } from "@/lib/lang";

/**
 * „SCHREIB EINFACH FREI, WIR FORMULIEREN DAS RICHTIG" (Owner 13.09.2026: „am besten mit AI
 * korrigieren. Muss man Button hinzufügen AI Korrektur").
 *
 * ── WAS DIESER ENDPUNKT TUT UND WAS NICHT ───────────────────────────────────────────────────
 *
 * Er glättet, was der Künstler geschrieben hat: Rechtschreibung, Grammatik, Satzbau. Er ERFINDET
 * NICHTS. Kein Ort, kein Studium, keine Ausstellung, kein Jahr — nichts, was nicht schon dasteht.
 *
 * Das ist keine Feinheit, sondern derselbe Punkt wie beim Profilbild: Dieser Text steht in der
 * ICH-FORM unter seinem Namen auf einer öffentlichen Seite. Ergänzt die Maschine hier eine
 * Ausstellung, behauptet er sie — und merkt es vielleicht nicht einmal, weil er ja nur auf
 * „Korrektur" gedrückt hat. Ein geglätteter Satz ist seiner; ein erfundener ist eine Lüge mit
 * seiner Unterschrift.
 *
 * ── ER SPEICHERT NICHT ──────────────────────────────────────────────────────────────────────
 *
 * Die Antwort geht ins Textfeld zurück, er liest sie und drückt selbst auf Speichern. Ein
 * Vorschlag, den er noch ablehnen kann — kein Eingriff in seine Seite.
 *
 * ── UND ER BRAUCHT SEINEN SCHLÜSSEL ─────────────────────────────────────────────────────────
 *
 * Nicht wegen der Daten (es werden keine geschrieben), sondern wegen der Kosten: Ohne Prüfung
 * könnte jeder beliebig Modellaufrufe auf unsere Rechnung auslösen.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/* Ein Modellaufruf über seinen Profiltext — dasselbe wie in `portal-vorschau`: ohne Angabe
   schneidet Vercel nach ~15 Sekunden ab, und die Korrektur scheitert scheinbar grundlos. */
export const maxDuration = 60;

export async function POST(request: Request) {
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const mandant = str(b.mandant, 80);
  const m = mandant ? await mandantLesen(mandant) : null;
  if (!m || !istKuenstler(m)) return NextResponse.json({ ok: false }, { status: 404 });
  if (!schluesselStimmt(m.schluessel, str(b.k, 200))) return NextResponse.json({ ok: false }, { status: 403 });

  /* KI IST PREMIUM (Owner 14.09.2026) — vor dem Modellaufruf, siehe `portal-spruch`. */
  if (!darfKi(m)) return NextResponse.json({ ok: false, grund: "premium" }, { status: 402 });

  const roh = str(b.text, 1200).trim();
  if (!roh) return NextResponse.json({ ok: false }, { status: 400 });
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  if (!apiKey) return NextResponse.json({ ok: false }, { status: 503 });

  /**
   * ── WAS ER WIRKLICH MALT, STEHT IN SEINEN BILDERN (Owner 13.09.2026: „dieser Text ist
   * Bullshit. Das war am Anfang gut, wo ich 1-2 Bilder hatte. Aber jetzt habe ich mehrere
   * hochgeladen, auch Acryl") ────────────────────────────────────────────────────────────────
   *
   * Die Korrektur sah bisher NUR seinen Absatz. Wer darin ein einzelnes Werk beschrieb — „Gina,
   * A3, print semnat, limitat, 2015" —, bekam genau das zurück: ein Profil, das aus zwölf Werken
   * eines herausgreift. Richtig, solange er zwei Bilder hatte; falsch, sobald es mehr sind.
   *
   * Sein Datensatz liegt hier ohnehin (die Schlüsselprüfung liest ihn). Daraus die Medien und die
   * wiederkehrenden Motive mitzugeben, ist kein Erfinden — es steht in seinen eigenen Bildern.
   */
  const befunde = Object.values(m.werkBefunde ?? {}).filter(Boolean) as Record<string, unknown>[];
  const einmalig = (werte: unknown[]) => [...new Set(werte.map(w => String(w ?? "").trim()).filter(Boolean))];
  const medien = einmalig(befunde.map(b => b.medium)).slice(0, 5);
  const motive = einmalig(befunde.map(b => b.motiv)).slice(0, 8);
  const werkWissen = befunde.length
    ? [
        "",
        `WHAT THEIR WORK ACTUALLY SHOWS (from image analysis of their ${befunde.length} works — use it to`,
        "keep the text true to the whole body of work, never to add facts they did not mention):",
        medien.length ? `· media: ${medien.join(", ")}` : "",
        motive.length ? `· recurring motifs: ${motive.join(", ")}` : "",
      ].filter(Boolean)
    : [];

  const r = await frageModell(apiKey, KLEIN, [{ type: "input_text", text: [
    `An artist wrote about themselves, freely and unsorted. Turn it into the "About" text of an`,
    `artist profile on an art platform. Write in ${sprachname(m.sprache)}.`,
    "",
    "SHAPE IT — this is the point, not spelling:",
    "· Open with what they paint: subject and medium, in one plain sentence.",
    "· Then the motifs that come back in their work, and what they mean to the artist.",
    "· Close with how that shows up in the pictures, concretely.",
    "· 3 to 6 sentences, one paragraph. SHORTER THAN THE ORIGINAL is right and expected.",
    "",
    "CUT: repetitions (the same idea said twice in other words), side excursions into mythology,",
    "literature or general musings, and sentences that explain a metaphor a second time. Keep the",
    "one image that carries, drop the commentary around it.",
    "",
    /* Owner 13.09.2026: „Das war am Anfang gut, wo ich 1-2 Bilder hatte." */
    "THIS IS A PROFILE, NOT A CATALOGUE ENTRY. It describes the whole body of work, never one",
    "picture. So CUT: the title of a single work, its format (A3, 50x70), edition, print run, the",
    "year of one piece, and any quotation of the line that stands under a picture. All of that is",
    "already shown on that artwork's own card. If their text is built around one work, lift what is",
    "general in it — the motif, the material, the interest — and drop the particulars.",
    ...werkWissen,
    "",
    "KEEP: the first person (I / eu / ich), their own words and images wherever they work, their",
    "tone — plain stays plain, poetic stays poetic, just tighter.",
    "",
    /* Owner 13.09.2026: Beim ersten Versuch verschwanden mit „Gina, A3, 2015" auch Berlin,
       Studium und Ausstellungen. Katalogdetails eines Bildes sind entbehrlich — Angaben über
       den MENSCHEN sind es nie, und niemand sonst kann sie wiederherstellen. */
    "KEEP ALWAYS, never drop — these are facts about the PERSON, not about one picture:",
    "the city or country they live or work in, their training or studies, exhibitions they had,",
    "how long they have been working, what drives them, and the materials they name. If their",
    "text says it, your text says it too.",
    "",
    "NEVER quote the sentence that stands under one of their pictures, even when they put it in",
    "this text themselves. It already appears beneath that artwork; repeated here it reads as if",
    "they had only one work.",
    "",
    /* Hier stand „never longer as their text" — falsch: Ein kurzer Katalogeintrag KANN nicht in
       derselben Länge zum Profil über zwölf Werke werden, und das Modell überging die Regel
       folgerichtig. Eine feste Obergrenze trifft beide Fälle: Sie lässt den kurzen Text wachsen
       und zwingt den langen zu kürzen. */
    "LENGTH: hard limit of 4 sentences and about 500 characters. If their text is longer than",
    "that, cut it down. Never write a seventh sentence to fit something in.",
    "",
    /* Owner 13.09.2026, erster Lauf: „Aceste motive mă ajută să pun în discuție prezența și
       corporalitatea" — das hat er nie gesagt. Eine erfundene HALTUNG ist so falsch wie eine
       erfundene Ausstellung, fällt aber niemandem auf, weil sie klug klingt. */
    "NEVER invent an intention, a meaning or a message. Do not write what their work questions,",
    "explores, examines, puts in discussion, seeks, reflects on or is about — unless they wrote it",
    "themselves in this text. Name what is there (subjects, materials, recurring motifs); leave the",
    "interpretation to the viewer.",
    "",
    "DO NOT: add any fact that is not already in the text — no city, no training, no exhibitions,",
    "no years, no techniques, no awards, no influences they did not name. Do not praise the artist",
    "or their work, and do not judge it. No clichés (passionate, unique, talented, visionary,",
    "self-taught genius), no art-critic jargon (oeuvre, discourse, narrative, explores the",
    "tension between).",
    "",
    /* Owner 13.09.2026: „Spinnst du? die E-Mail raus." — dieser Text steht öffentlich. */
    "REMOVE, even if they wrote it themselves: e-mail addresses, phone numbers, postal addresses,",
    "social media handles, and any price or price range. This text is public on their page — the",
    "contact runs through their agent, and the price has its own place. Drop those sentences",
    "entirely rather than rewriting them.",
    "If the text is already clean, return it unchanged.",
    "",
    "Their text:",
    roh,
    'Answer ONLY as JSON: {"text":"..."}',
  ].join("\n") }], "low");

  const text = r.ok ? str((r.daten as { text?: unknown } | null)?.text, 1200).trim() : "";
  if (!text) {
    /* `Ergebnis` trägt `fehler` nur im Fehlerfall — im Erfolgsfall kann die Antwort trotzdem
       leer sein (Modell liefert kein `text`). Beide Fälle landen hier, deshalb getrennt. */
    console.warn("[portal-text-korrektur] gescheitert:", mandant, r.ok ? "leere Antwort" : r.fehler);
    return NextResponse.json({ ok: false }, { status: 502 });
  }
  void ereignisMerken(mandant, String(m.name ?? ""), "profiltextAI");
  return NextResponse.json({ ok: true, text });
}
