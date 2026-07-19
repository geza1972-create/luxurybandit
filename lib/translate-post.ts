import Anthropic from "@anthropic-ai/sdk";

// Übersetzt einen Beitrag (Titel + Text) automatisch.
//
// Gerry schreibt auf DEUTSCH. Daraus entstehen beim „Übernehmen" die rumänische und
// die englische Fassung, damit jeder Besucher den Beitrag in seiner Sprache sieht.
// Bewusst Haiku: es sind zwei kurze Sätze, kein Grund für ein teures Modell.

export const POST_LANGS = ["de", "ro", "en"] as const;
export type PostLang = (typeof POST_LANGS)[number];

export type PostText = { title?: string; caption?: string };
export type PostI18n = Partial<Record<PostLang, PostText>>;

const MODEL = "claude-haiku-4-5-20251001";

const LANG_NAME: Record<PostLang, string> = {
  de: "German",
  ro: "Romanian",
  en: "English",
};

const SYSTEM =
  "You translate short social-media posts for a fashion influencer brand. " +
  "Keep the tone, the emojis and the hashtags exactly as they are — translate hashtag words only if they are ordinary words. " +
  "Keep it the same length and just as punchy; this is marketing copy, not a document. " +
  // Platzhalter wie {Name} oder {Ort} werden spaeter durch echte Werte ersetzt —
  // uebersetzt der Uebersetzer sie mit, passt nichts mehr zusammen.
  "Placeholders in curly braces such as {Name} or {Ort} are variables: copy them through " +
  "EXACTLY as written, never translate or rename what is inside the braces. " +
  "Never add commentary. Reply with JSON only.";

/** Ist überhaupt etwas zu übersetzen? */
const isEmpty = (t: PostText) => !String(t.title ?? "").trim() && !String(t.caption ?? "").trim();

/**
 * Übersetzt den deutschen Text in die übrigen Sprachen.
 * Schlägt der Aufruf fehl, kommt einfach nur die deutsche Fassung zurück — ein
 * fehlgeschlagener Übersetzer darf das Speichern eines Beitrags NIE blockieren.
 */
export async function translatePost(source: PostText, sourceLang: PostLang = "de"): Promise<PostI18n> {
  const clean: PostText = {
    title: String(source.title ?? "").trim(),
    caption: String(source.caption ?? "").trim(),
  };
  const out: PostI18n = { [sourceLang]: clean };
  if (isEmpty(clean)) return out;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return out;

  const targets = POST_LANGS.filter(l => l !== sourceLang);
  // Quellsprache NICHT hart vorgeben: Gerry schreibt Deutsch, aber ältere Beiträge
  // sind Englisch. Wird die Sprache falsch angenommen, kommen Fehler heraus
  // (aus „Sunrise" wurde einmal „Apus" — Sonnenuntergang).
  const prompt =
    `Detect the language this post is written in (it is usually ${LANG_NAME[sourceLang]}, ` +
    `but it may already be English). Then translate it into ${targets.map(t => LANG_NAME[t]).join(" and ")}.\n` +
    `If the post is already in one of the target languages, repeat it unchanged for that language.\n\n` +
    `title: ${clean.title || "(empty)"}\n` +
    `caption: ${clean.caption || "(empty)"}\n\n` +
    `Reply with ONLY this JSON shape, no code fence:\n` +
    `{${targets.map(t => `"${t}":{"title":"…","caption":"…"}`).join(",")}}\n` +
    `Leave a field as an empty string if the source field is empty.`;

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map(b => b.text)
      .join("")
      .trim();

    // Robust gegen ```json-Zäune und Vor-/Nachgeplauder.
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const parsed = JSON.parse(json) as Record<string, { title?: unknown; caption?: unknown }>;

    for (const lang of targets) {
      const got = parsed[lang];
      if (!got) continue;
      out[lang] = {
        title: String(got.title ?? "").trim().slice(0, 120),
        caption: String(got.caption ?? "").trim().slice(0, 3000),
      };
    }
  } catch {
    /* Übersetzung fehlgeschlagen — der deutsche Text bleibt, die Seite fällt darauf zurück. */
  }

  return out;
}

/** Die Fassung für eine Sprache, mit Rückfall auf Deutsch und dann Englisch. */
export function pickPostText(i18n: PostI18n | undefined, lang: PostLang, fallback: PostText): PostText {
  const pick = (l: PostLang) => {
    const t = i18n?.[l];
    return t && (String(t.title ?? "").trim() || String(t.caption ?? "").trim()) ? t : undefined;
  };
  const chosen = pick(lang) ?? pick("de") ?? pick("en");
  return {
    title: String(chosen?.title ?? fallback.title ?? ""),
    caption: String(chosen?.caption ?? fallback.caption ?? ""),
  };
}

/** Sprache aus dem Accept-Language-Kopf des Besuchers. Standard: Englisch. */
export function langFromAcceptLanguage(header: string | null | undefined): PostLang {
  const raw = String(header ?? "").toLowerCase();
  if (!raw) return "en";
  // Gewichtete Liste, z. B. "ro-RO,ro;q=0.9,en-US;q=0.8" — die erste passende zählt.
  const entries = raw
    .split(",")
    .map(part => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map(p => p.trim()).find(p => p.startsWith("q="));
      return { tag: tag.trim(), q: q ? Number(q.slice(2)) || 0 : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of entries) {
    const base = tag.split("-")[0];
    if ((POST_LANGS as readonly string[]).includes(base)) return base as PostLang;
  }
  return "en";
}

/** Sprache aus einem ?lang=-Parameter, falls jemand sie erzwingen will. */
export function normalizeLang(value: unknown): PostLang | undefined {
  const v = String(value ?? "").trim().toLowerCase().split("-")[0];
  return (POST_LANGS as readonly string[]).includes(v) ? (v as PostLang) : undefined;
}
