import { mandantLesen, mandantSpeichern } from "@/lib/versusforge-mandanten";
import { str, GROSS, frageModell } from "@/lib/agent-modell";
import { sprachname } from "@/lib/lang";

/**
 * DIE BESCHREIBUNG DES KÜNSTLERS — AUS SEINEN BILDERN (Owner 13.09.2026: „du machst automatisch
 * auch eine Beschreibung des Künstlerprofils. Du beschreibst wie er malt, was er malt" · „auch bei
 * den jetzigen, die nichts haben").
 *
 * ── WARUM NICHT IN `ueberMich` ──────────────────────────────────────────────────────────────
 *
 * `ueberMich` entsteht im Trichter aus SEINEN Nachrichten, in der Ich-Form, und der Prompt dort
 * sagt ausdrücklich: „NUR was er selbst über SICH geschrieben hat … hat er nichts geschrieben,
 * gib einen leeren Text zurück." Genau deshalb steht bei claudiutudoran, maia und terry nichts:
 * Sie haben nie etwas über sich erzählt. Der Text ist nicht verloren — er wurde nie gesagt.
 *
 * Schriebe ich hier etwas hinein, stünde auf seiner öffentlichen Seite unter seinem Namen ein
 * Satz in der Ich-Form, den er nie gesagt hat. Das ist eine Behauptung über einen echten
 * Menschen, keine Textergänzung. Deshalb ein EIGENES Feld, in der DRITTEN Person, und es
 * beschreibt das WERK, nicht sein Leben: „Malt in Acryl, arbeitet mit dem Spachtel …" ist aus
 * den Bildern belegbar, „Ich male seit meiner Jugend" wäre erfunden.
 *
 * ── WORAUS ──────────────────────────────────────────────────────────────────────────────────
 *
 * Aus `werkBefunde` — der Bildanalyse, die `bildAnsehen` ohnehin je Werk anlegt. `medium`, `stil`
 * und `merkmale` sagen, WIE er malt; `motiv` und `szene` sagen, WAS. Über alle Werke zusammen
 * ergibt das ein Muster, das ein einzelnes Bild nicht zeigt.
 *
 * OHNE BEFUNDE PASSIERT NICHTS. Die Bilder hier erneut anzusehen wäre ein zweiter teurer Lauf
 * neben `spruecheNachtragen`, das genau das schon tut und die Befunde speichert. Wer keine hat
 * (GEMESSEN am 13.09.2026: nur `atelierinsula` unter den Künstlern), bekommt sie dort beim
 * nächsten Speichern — und beim Lauf danach greift dieser hier.
 *
 * ── ES DARF SCHEITERN ───────────────────────────────────────────────────────────────────────
 *
 * Läuft im Hintergrund (`after`). Geht etwas schief, bleibt das Feld leer und seine Seite sieht
 * aus wie vorher. `mandantSpeichern` schreibt den GANZEN Datensatz ohne Merge, deshalb wird
 * unmittelbar vor dem Schreiben noch einmal frisch gelesen — zwischen Lesen und Schreiben liegt
 * ein Modellaufruf von einigen Sekunden.
 */
export async function profilNachtragen(mandant: string): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  if (!apiKey) return;
  const m = await mandantLesen(mandant);
  if (!m) return;
  /* Schon vorhanden: nicht überschreiben. Er kann sie in „Seite bearbeiten" ersetzt haben. */
  if (String(m.werkBeschreibung ?? "").trim()) return;

  const befunde = Object.values(m.werkBefunde ?? {}).filter(Boolean);
  if (!befunde.length) return;

  /* Was sich über die Werke hinweg WIEDERHOLT, ist das Muster — ein einzelnes Bild ist Zufall.
     Deshalb gehen alle Befunde als Liste hinein und das Modell sucht das Gemeinsame. */
  const zutaten = befunde.slice(0, 12).map((b, i) => {
    const x = b as Record<string, unknown>;
    const teile = [
      x.medium ? `medium ${String(x.medium)}` : "",
      x.stil ? `style ${String(x.stil)}` : "",
      x.motiv ? `motif ${String(x.motiv)}` : "",
      Array.isArray(x.merkmale) && x.merkmale.length ? `traits ${x.merkmale.join(", ")}` : "",
      x.szene ? `scene ${String(x.szene)}` : "",
    ].filter(Boolean);
    return `${i + 1}. ${teile.join("; ") || "—"}`;
  }).join("\n");

  const r = await frageModell(apiKey, GROSS, [{ type: "input_text", text: [
    `You describe the work of the artist ${m.name} for their page on lakatosbandi.com.`,
    `Write in ${sprachname(m.sprache)} — as a curator who is precise and plain.`,
    "",
    "WHAT YOU KNOW — the analysis of their works. Use ONLY this, invent nothing:",
    zutaten,
    "",
    "WRITE 2–3 sentences in the THIRD PERSON about the WORK, not about the person:",
    "· what they paint — the motifs and subjects that come back across the works",
    "· how they paint — medium, handling, what is visible in the surface",
    "· if something recurs clearly across several works, name it as what holds the work together.",
    "",
    /* Owner 13.09.2026: „du brauchst nicht zu sagen wie sie heisst" — der Name steht als
       Überschrift direkt darüber. Ihn im Text zu wiederholen liest sich wie ein Katalogeintrag
       über eine Fremde. Dass die ersten vier Texte ihn nicht benutzt haben, war Zufall. */
    "NEVER write the artist's name or any pronoun for them — start with the work or the verb.",
    "RULES: third person only — never 'I', never address the reader. No biography, no age, no",
    "training, no exhibitions, no city, no dates: none of that is in the analysis and you must not",
    "guess it. No praise and no clichés (unique, masterpiece, passionate, talented, one of a kind).",
    "No price. If the analysis shows no clear pattern, describe only what is plainly there —",
    "a short honest sentence beats an invented one.",
    'Answer ONLY as JSON: {"beschreibung":"..."}',
  ].join("\n") }], "low");

  const text = r.ok ? str((r.daten as { beschreibung?: unknown } | null)?.beschreibung, 900).trim() : "";
  if (!r.ok) console.warn("[kuenstler-profil] Beschreibung gescheitert:", mandant, r.fehler);
  if (!text) return;

  const frisch = await mandantLesen(mandant);
  if (!frisch) return;
  /* Inzwischen selbst geschrieben? Dann gehört ihm das Feld. */
  if (String(frisch.werkBeschreibung ?? "").trim()) return;
  await mandantSpeichern(mandant, { ...frisch, werkBeschreibung: text });
}
