import { kuenstlerListe, werkKacheln, imPortalSichtbar } from "@/lib/lakatosbandi";
import { mandantLesen, mandantSpeichern } from "@/lib/versusforge-mandanten";
import { KLEIN, frageModell, strListe } from "@/lib/agent-modell";
import { PORTAL_SPRACHEN } from "@/lib/lakatosbandi-texte";
import { sprachname } from "@/lib/lang";

/**
 * ── DIE SPRÜCHE IN DEN ANDEREN PORTALSPRACHEN (Owner 14.09.2026: „hier wird nichts übersetzt" ·
 * „einmal am tag musst du übersetzen … kein open ai tokens nutzen oder doch wenn es günstig
 * ist") ───────────────────────────────────────────────────────────────────────────────────────
 *
 * ── ES IST GÜNSTIG, UND ZWAR GERECHNET ──────────────────────────────────────────────────────
 *
 * Ein Künstler mit zehn Werken ist EIN Aufruf je Sprache: rund 700 Token hinein, 700 hinaus.
 * Beim kleinen Modell sind das Bruchteile eines Cents. Alle heutigen Künstler zusammen kosten
 * beim ersten Lauf unter fünf Cent, danach nur noch das, was neu dazukommt — der Lauf schreibt
 * nur, was fehlt.
 *
 * ── NEU SCHREIBEN, NICHT ÜBERSETZEN ─────────────────────────────────────────────────────────
 *
 * „Născut în două zile din pasiunea și memoria artistului" Wort für Wort übersetzt ergibt genau
 * den flachen Ton, den das Kunst-Rezept heute losgeworden ist. Der Auftrag verlangt deshalb
 * denselben Ton wie das Original: eine Geschichte, keine Beschreibung, keine Technik
 * ([[spruch-ton-louisett-massstab]]).
 *
 * ── DAS ORIGINAL WIRD NIE ANGEFASST ─────────────────────────────────────────────────────────
 *
 * Geschrieben wird ausschliesslich nach `hookSprachen`. Was der Künstler sieht und was in seiner
 * Sprache steht, bleibt unverändert — auch das ist eine Hausregel
 * ([[bestehende-sprueche-nicht-neu-generieren]]).
 */

export type SpruchSprachenBericht = {
  kuenstler: number;
  geprueft: number;
  aufrufe: number;
  geschrieben: number;
  fehler?: string;
  /** Im Probelauf: was fehlen würde, ohne etwas zu tun. */
  offen?: string[];
};

const auftrag = (sprache: string, sprueche: string[]) => [
  `Rewrite these ${sprueche.length} sentences about paintings in ${sprachname(sprache)}.`,
  "REWRITE, DO NOT TRANSLATE: a word-for-word translation goes flat. Keep the meaning and the mood, then say it the way a good copywriter in that language would say it from scratch.",
  "Keep the tone: a small mysterious story about the work — where it comes from, what it is looking for, what it knows. Two to three sentences, same length as the original.",
  "Never describe the technique: no materials, no colour names, no brushwork. Describe what you cannot see.",
  "Never promise anything about buyers, sales or value.",
  `Answer as JSON: {"sprueche": ["…", "…"]} — exactly ${sprueche.length} entries, same order.`,
  "",
  ...sprueche.map((s, i) => `${i + 1}. ${s}`),
].join("\n");

export async function spruecheInSprachen(opt: { nurZeigen?: boolean } = {}): Promise<SpruchSprachenBericht> {
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  const leer: SpruchSprachenBericht = { kuenstler: 0, geprueft: 0, aufrufe: 0, geschrieben: 0 };
  if (!apiKey) return { ...leer, fehler: "kein OPENAI_API_KEY" };

  /* Nur wer öffentlich steht — für unfreigegebene Seiten sieht die Übersetzung ohnehin niemand. */
  const liste = await kuenstlerListe(m => imPortalSichtbar(m)).catch(() => []);
  const bericht: SpruchSprachenBericht = { ...leer, kuenstler: liste.length };
  const offen: string[] = [];

  for (const eintrag of liste) {
    const kennung = eintrag.kennung;
    /* FRISCH LESEN: Zwischen Liste und Schreiben liegen Modellaufrufe von Sekunden, und
       `mandantSpeichern` ersetzt den ganzen Datensatz ohne Merge. */
    const m = await mandantLesen(kennung).catch(() => null);
    if (!m) continue;
    bericht.geprueft++;

    const eigene = String(m.sprache ?? "ro").slice(0, 2).toLowerCase();
    const kacheln = werkKacheln(m);
    if (!kacheln.length) continue;
    const originale = kacheln.map(k => k.hook);

    const sprachen = PORTAL_SPRACHEN.filter(s => s !== eigene);
    const neu: Record<string, { hook?: string; hooks?: string[] }> = { ...(m.hookSprachen ?? {}) };
    let etwasNeu = false;

    for (const s of sprachen) {
      const da = neu[s];
      /* Vollständig heisst: für JEDE Kachel ein Satz. Kommt ein Werk dazu, fehlt genau einer —
         dann läuft die Sprache noch einmal, und zwar ganz, damit die Reihenfolge stimmt. */
      const vorhanden = kacheln.every((k, i) =>
        String((i === 0 && k.i === -1 ? da?.hook : da?.hooks?.[k.i]) ?? "").trim());
      if (vorhanden) continue;

      if (opt.nurZeigen) { offen.push(`${kennung} → ${s} (${kacheln.length})`); continue; }

      bericht.aufrufe++;
      const antwort = await frageModell(apiKey, KLEIN, [{ type: "input_text", text: auftrag(s, originale) }])
        .catch(() => null);
      /* `frageModell` gibt schon geparstes JSON zurück (`daten`) oder einen ehrlichen Fehler. */
      const texte = antwort?.ok
        ? strListe(antwort.daten.sprueche, kacheln.length, 600)
        : [];
      /* Zu wenige Sätze zurück heisst: nichts speichern. Ein halber Satz an der falschen Kachel
         wäre schlimmer als gar keine Übersetzung — dann steht eben das Original da. */
      if (texte.length !== kacheln.length || texte.some(t => !t)) {
        console.warn("[spruch-sprachen] Antwort unbrauchbar:", kennung, s, texte.length, "statt", kacheln.length);
        continue;
      }

      const eintragNeu: { hook?: string; hooks?: string[] } = { hooks: [...(da?.hooks ?? [])] };
      kacheln.forEach((k, i) => {
        if (k.i === -1) eintragNeu.hook = texte[i];
        else (eintragNeu.hooks ??= [])[k.i] = texte[i];
      });
      neu[s] = eintragNeu;
      etwasNeu = true;
      bericht.geschrieben++;
    }

    if (etwasNeu) {
      const frisch = await mandantLesen(kennung).catch(() => null);
      if (frisch) await mandantSpeichern(kennung, { ...frisch, hookSprachen: neu });
    }
  }

  return opt.nurZeigen ? { ...bericht, offen } : bericht;
}
