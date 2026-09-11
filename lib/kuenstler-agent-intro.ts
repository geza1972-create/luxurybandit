import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";
import { mandantSauber } from "@/lib/versusforge-namen";
import { mandantLesen } from "@/lib/versusforge-mandanten";
import { werkKacheln } from "@/lib/lakatosbandi";
import { str, GROSS, frageModell } from "@/lib/agent-modell";

/**
 * WAS SEIN AGENT ZU EINEM WERK SAGT — einmal geschrieben, dann gespeichert (Owner 11.09.2026: „für einen Agenten, der nur
 * das macht, verlangen wir 10 € im Monat?" · „er müsste sofort etwas über den Stil sagen … große Künstler benutzen auch
 * solche Motive … der Stil ist trotzdem sehr originell, also etwas Interessantes, Verkaufsförderndes").
 *
 * JE WERK UND SPRACHE EINE DATEI: Das große Modell schreibt den Text einmal, danach liest jeder Besucher dieselbe Datei.
 *
 * VORAB GESCHRIEBEN (Owner 11.09.2026: „der Agent lädt nicht sofort, zuerst nur die Hälfte, er ist zu langsam" — gemessen:
 * gespeichert unter 1 s, neu geschrieben 15 s). `introsVorab` schreibt die Texte für ALLE Werke in RO, EN und DE direkt
 * nach der Anmeldung und nach jedem Speichern auf „Seite bearbeiten" — im Hintergrund, damit kein Besucher wartet.
 *
 * Quellen, in dieser Reihenfolge: was der Künstler selbst erzählt (Geschichte, Über mich, Details), dann die Bildanalyse,
 * dann Spruch und Werkangaben. Vergleiche mit großen Künstlern nur, wenn die Analyse sie nennt.
 */
export type AgentIntro = { eroeffnung: string; mehr: string; details: string };

export const INTRO_SPRACHEN = ["ro", "en", "de"] as const;

const ordner = (mandant: string) => `versusforge-agent-intro/${mandantSauber(mandant)}`;
const pfad = (mandant: string, nr: string, lang: string) =>
  `${ordner(mandant)}/${nr.replace(/[^0-9-]/g, "") || "-1"}-${lang.replace(/[^a-z]/g, "").slice(0, 2)}.json`;

export async function introLesen(mandant: string, nr: string, lang: string): Promise<AgentIntro | null> {
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(mandant, nr, lang))}`);
  if (!res.ok) return null;
  const d = (await res.json().catch(() => null)) as Partial<AgentIntro> | null;
  return d && typeof d.eroeffnung === "string"
    ? { eroeffnung: d.eroeffnung, mehr: String(d.mehr ?? ""), details: String(d.details ?? "") }
    : null;
}

export async function introSpeichern(mandant: string, nr: string, lang: string, intro: AgentIntro): Promise<void> {
  await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(mandant, nr, lang))}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify(intro),
  }).catch(() => undefined);
}

/** Alle Texte eines Künstlers weg — nach „Seite bearbeiten" und beim Löschen. */
export async function introLoeschen(mandant: string): Promise<void> {
  if (!mandantSauber(mandant)) return;
  const liste = await supabaseFetch(`/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: `${ordner(mandant)}/`, limit: 1000 }),
  }).catch(() => null);
  if (!liste?.ok) return;
  const dateien = ((await liste.json().catch(() => [])) as { id?: string | null; name?: string }[])
    .filter(d => d?.id && d?.name).map(d => `${ordner(mandant)}/${d.name}`);
  if (!dateien.length) return;
  await supabaseFetch(`/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: dateien }),
  }).catch(() => undefined);
}

const SPRACHE: Record<string, string> = { ro: "Romanian", de: "German", en: "English" };

/** Schreibt den Text zu EINEM Werk in EINER Sprache mit dem großen Modell und speichert ihn. */
export async function introSchreiben(mandant: string, nr: string, lang: string): Promise<AgentIntro> {
  const m = await mandantLesen(mandant);
  const leer: AgentIntro = { eroeffnung: "", mehr: "", details: "" };
  if (!m) return leer;
  const schluessel = Number(nr) < 0 ? "standard" : nr;
  const hooks = Array.isArray(m.hooks) ? m.hooks : [];
  const spruch = String((Number(nr) < 0 ? m.hook : hooks[Number(nr)]) ?? m.hook ?? "").trim();
  const info = m.werkInfo?.[schluessel] ?? {};
  const befund = (m.werkBefunde?.[schluessel] ?? {}) as Record<string, unknown>;
  const details = [info.titel, info.technik, info.groesse, info.jahr].filter(Boolean).join(" · ");
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  if (!apiKey) return { ...leer, details };

  const r = await frageModell(apiKey, GROSS, [{ type: "input_text", text: [
    `You are the sales agent of the artist ${m.name} on the art platform lakatosbandi.com. A visitor is looking at one work.`,
    `Write in ${SPRACHE[lang] ?? "English"} — as a native speaker and a gifted curator who also knows how to sell. Address the visitor informally (du / tu).`,
    "",
    "WHAT YOU KNOW (use only this, invent nothing):",
    `· The artist's line under the work: ${spruch || "—"}`,
    `· Title, technique, size, year: ${details || "—"}`,
    `· Other details (signed, limited edition, frame …): ${info.detalii || "—"} — a signed or limited edition is real scarcity, use it`,
    `· The artist's own story of this work: ${info.geschichte || "—"}`,
    `· About the artist, in their words: ${m.ueberMich || "—"}`,
    `· Image analysis: style ${befund.stil || "—"}; motif ${befund.motiv || "—"}; scene ${befund.szene || "—"}; reminds of ${befund.erinnertAn || "—"}; rare about it ${befund.selten || "—"}`,
    "",
    "WRITE TWO FIELDS:",
    "1. eroeffnung — 1–2 sentences about the STYLE or MOTIF that make the visitor curious. If the analysis names an artist or movement it reminds of, you may say that great artists worked with such motifs too (true and general, e.g. 'Hockney also painted pools') and then what is DIFFERENT and original here. No such comparison without it in the analysis.",
    "2. mehr — 1–2 sentences about THIS work: its story from the artist if given, otherwise one precise detail and what makes it rare. Empty string if you know nothing beyond the line.",
    "",
    "RULES: no price, no invented facts or dates, no esoteric symbolism, no clichés (unique, one of a kind, masterpiece), no question at the end — the page asks that itself.",
    "NEVER tell the visitor what they feel, do or want — no 'te lasă', 'te face', 'te invită', 'you are left', 'lässt dich'. Speak about the PAINTING, not about the viewer.",
    "BE CONCRETE like a curator: brushwork, colour, light, composition, the one detail that is unusual. No vague abstractions (memories, dreams, thresholds of the soul).",
    "mehr must NOT repeat title, technique, size or year (they are shown separately) and must NOT quote the artist's line.",
    'Answer ONLY as JSON: {"eroeffnung":"...","mehr":"..."}',
  ].join("\n") }], "low");

  const d = (r.ok ? r.daten : null) as { eroeffnung?: unknown; mehr?: unknown } | null;
  const intro: AgentIntro = { eroeffnung: str(d?.eroeffnung, 400).trim(), mehr: str(d?.mehr, 400).trim(), details };
  if (!r.ok) console.warn("[kuenstler-agent] Einstieg nicht geschrieben:", r.fehler);
  if (intro.eroeffnung) await introSpeichern(mandant, nr, lang, intro);
  return intro;
}

/** Gespeichert lesen, sonst jetzt schreiben. */
export async function introHolen(mandant: string, nr: string, lang: string): Promise<AgentIntro> {
  return (await introLesen(mandant, nr, lang)) ?? introSchreiben(mandant, nr, lang);
}

/** Alle Werke × RO, EN, DE vorab — was schon gespeichert ist, wird übersprungen. Gleichzeitig, damit es schnell geht. */
export async function introsVorab(mandant: string): Promise<void> {
  const m = await mandantLesen(mandant);
  if (!m) return;
  const auftraege = werkKacheln(m).flatMap(k => INTRO_SPRACHEN.map(lang => ({ nr: String(k.i), lang })));
  await Promise.all(auftraege.map(async ({ nr, lang }) => {
    if (await introLesen(mandant, nr, lang)) return;
    await introSchreiben(mandant, nr, lang).catch(e => console.warn("[kuenstler-agent] Vorab gescheitert:", mandant, nr, lang, e));
  }));
}
