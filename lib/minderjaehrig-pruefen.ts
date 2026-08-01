/**
 * DIE ALTERSSPERRE AM EINGANG (Owner 31.07.2026: „ich habe auch Kinderbilder gesehen, die
 * hochgeladen werden, das bitte sperren. Ich habe sie gelöscht.").
 *
 * Dieses Portal setzt Menschen in Kuss-, Dessous- und Bademodenbilder. Ein hochgeladenes
 * Kinderfoto darf diese Kette NIE erreichen — nicht als Ergebnis, nicht als Zwischenschritt,
 * nicht als Vorlage. Es gibt hier keine Abwägung und keinen Sonderfall.
 *
 * WARUM ES BISHER DURCHKAM, und das ist die eigentliche Lehre: Das Alter wurde längst
 * geschätzt — aber nur, um den Auftrag zu würzen („der Mann ist 54"). `alterSchaetzen` gibt
 * für alles ausserhalb 18–90 eine 0 zurück, und 0 bedeutet im Code „nicht erkannt". Das Kind
 * wurde also ERKANNT und das Ergebnis WEGGEWORFEN. Eine Prüfung, deren Nein wie ein
 * Achselzucken aussieht, ist keine Prüfung.
 *
 * WAS BEI EINEM FEHLER PASSIERT: Die Sperre schliesst. Wenn das Seh-Modell nicht antwortet,
 * wird NICHT erzeugt. Das ist die unbequemere Wahl — bei einer Störung kommt auch ein
 * Erwachsener nicht durch —, aber die Schäden sind nicht vergleichbar: Ein abgewiesener
 * Erwachsener drückt noch einmal auf den Knopf; ein erzeugtes Bild eines Kindes ist nicht
 * rückholbar. Zur Not lässt sich das mit `MINOR_CHECK_FAIL_OPEN=true` umstellen — die
 * Variable existiert, damit die Entscheidung sichtbar getroffen werden muss und nicht
 * versehentlich durch einen Ausfall.
 */

export type AltersPruefung =
  | { ok: true; alter: number }
  | { ok: false; grund: "minderjaehrig" | "unklar" | "kein-gesicht" };

/**
 * DIE GRENZE IST 18 — NICHT HÖHER (Owner 31.07.2026: „eine 18-Jährige kann auch jünger
 * aussehen, dann sperrst du das").
 *
 * Ich hatte hier zuerst 20 stehen, als Sicherheitsmarge. Der Einwand trifft: Eine erwachsene
 * Kundin, die jung aussieht, wäre damit ausgesperrt worden — und zwar mit einer Meldung, die
 * ihr unterstellt, ein Kind zu sein. Das ist nicht nur ein verlorener Kunde, das ist eine
 * Beleidigung.
 *
 * Die Sicherheit liegt deshalb NICHT in einer höheren Zahl, sondern in der zweiten Frage:
 * Das Seh-Modell wird zusätzlich direkt gefragt, ob jemand minderjährig ist, und es ist
 * darauf trainiert, bei Kindern und Jugendlichen anzuschlagen. Zwei Signale, die
 * unterschiedlich irren, fangen mehr als ein Signal mit Aufschlag.
 */
const MINDESTALTER = Number(process.env.MINOR_CHECK_MIN_AGE ?? 18);
const FAIL_OPEN = process.env.MINOR_CHECK_FAIL_OPEN === "true";

type Antwort = { minor?: boolean; age?: number; face?: boolean };

/**
 * Fragt das Seh-Modell direkt — nicht „wie alt", sondern „ist hier jemand unter 18".
 *
 * Die direkte Frage ist deutlich zuverlässiger als eine Zahl, die man hinterher vergleicht:
 * Modelle sind darauf trainiert, bei dieser Frage vorsichtig zu sein, während eine
 * Altersschätzung zum Mittelwert neigt. Beide Signale werden verwendet — es genügt EINES,
 * um zu sperren.
 */
async function fragen(dataUrl: string, key: string): Promise<Antwort | null> {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini",
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text:
                "You are a safety check for an adult-content pipeline. Look at every person in this image.\n"
                + "Return ONLY compact JSON: {\"minor\":true|false,\"age\":NN,\"face\":true|false}\n"
                // Die Grenze muss BEIDE Richtungen benennen. Stand hier nur „im Zweifel ja",
                // schlug das Modell auch bei jung aussehenden Erwachsenen an — der Einwand des
                // Owners vom 31.07.2026 („eine 18-Jährige kann auch jünger aussehen").
                + "- minor: true if ANY person appears to be a child or a teenager under 18.\n"
                + "  A young-looking ADULT (student age, around 18-25) is NOT a minor — answer false for them.\n"
                + "  But if you genuinely cannot tell whether someone is a child, answer true.\n"
                + "- age: the apparent age in years of the youngest person. Always give a number, never 0.\n"
                + "- face: true if at least one human face is clearly visible.\n"
                + "No prose, no explanation.",
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        }],
        max_tokens: 40,
      }),
    });
    if (!res.ok) return null;
    const j = await res.json().catch(() => null);
    const roh = String(j?.choices?.[0]?.message?.content ?? "");
    const m = roh.match(/\{[\s\S]*\}/);
    if (!m) return null;
    return JSON.parse(m[0]) as Antwort;
  } catch { return null; }
}

/**
 * Prüft EIN Bild. `ok: false` heisst: nicht erzeugen.
 *
 * Ohne Schlüssel (lokale Entwicklung ohne OpenAI) läuft die Prüfung nicht und lässt durch —
 * dort wird ohnehin nichts erzeugt, wofür es einen Schlüssel bräuchte.
 */
export async function pruefeAlter(dataUrl: string, key: string): Promise<AltersPruefung> {
  if (!dataUrl || !key) return { ok: true, alter: 0 };

  // Ein zweiter Versuch, bevor ein Netzausfall einen Erwachsenen aussperrt.
  const a = (await fragen(dataUrl, key)) ?? (await fragen(dataUrl, key));

  if (!a) {
    if (FAIL_OPEN) {
      console.warn("[alterspruefung] Seh-Modell nicht erreichbar — durchgelassen (MINOR_CHECK_FAIL_OPEN)");
      return { ok: true, alter: 0 };
    }
    console.error("[alterspruefung] Seh-Modell nicht erreichbar — GESPERRT (Sicherheitsvorgabe)");
    return { ok: false, grund: "unklar" };
  }

  if (a.minor === true) return { ok: false, grund: "minderjaehrig" };

  const alter = Number(a.age);
  if (Number.isFinite(alter) && alter > 0 && alter < MINDESTALTER) {
    return { ok: false, grund: "minderjaehrig" };
  }

  return { ok: true, alter: Number.isFinite(alter) ? alter : 0 };
}

/** Prüft mehrere Bilder gleichzeitig; das erste Nein gewinnt. */
export async function pruefeAlterAlle(bilder: string[], key: string): Promise<AltersPruefung> {
  const echte = bilder.filter(Boolean);
  if (!echte.length || !key) return { ok: true, alter: 0 };
  const ergebnisse = await Promise.all(echte.map(b => pruefeAlter(b, key)));
  const nein = ergebnisse.find(r => !r.ok);
  if (nein) return nein;
  // Das jüngste gefundene Alter zurückgeben — der Auftrag nutzt es ohnehin weiter.
  const alter = ergebnisse.map(r => (r.ok ? r.alter : 0)).filter(n => n > 0);
  return { ok: true, alter: alter.length ? Math.min(...alter) : 0 };
}

/**
 * DIE MELDUNG. Sie nennt den Grund, ohne zu belehren und ohne jemanden zu beschuldigen —
 * der häufigste Fall ist ein Familienfoto, das jemand aus Versehen gewählt hat.
 */
const TEXTE: Record<string, { minderjaehrig: string; unklar: string }> = {
  de: {
    minderjaehrig: "Auf diesem Foto ist eine Person zu sehen, die minderjährig sein könnte. Wir erzeugen daraus nichts. Bitte nimm ein Foto, auf dem nur Erwachsene zu sehen sind.",
    unklar: "Wir konnten das Foto gerade nicht prüfen. Bitte versuche es in einem Moment noch einmal.",
  },
  en: {
    minderjaehrig: "This photo shows someone who may be under 18. We won't generate anything from it. Please use a photo with adults only.",
    unklar: "We couldn't check this photo right now. Please try again in a moment.",
  },
  ro: {
    minderjaehrig: "În această poză apare o persoană care ar putea fi minoră. Nu generăm nimic din ea. Folosește te rog o poză doar cu adulți.",
    unklar: "Nu am putut verifica poza acum. Încearcă te rog din nou într-un moment.",
  },
  es: {
    minderjaehrig: "En esta foto aparece alguien que podría ser menor de edad. No generamos nada con ella. Usa una foto solo con adultos.",
    unklar: "No hemos podido comprobar la foto ahora mismo. Inténtalo de nuevo en un momento.",
  },
  fr: {
    minderjaehrig: "Cette photo montre une personne qui pourrait être mineure. Nous ne générons rien à partir d'elle. Utilise une photo avec des adultes uniquement.",
    unklar: "Nous n'avons pas pu vérifier cette photo. Réessaie dans un instant.",
  },
  pt: {
    minderjaehrig: "Esta foto mostra alguém que pode ser menor de idade. Não geramos nada a partir dela. Usa uma foto apenas com adultos.",
    unklar: "Não conseguimos verificar a foto agora. Tenta novamente daqui a pouco.",
  },
  it: {
    minderjaehrig: "Questa foto mostra una persona che potrebbe essere minorenne. Non generiamo nulla da essa. Usa una foto con soli adulti.",
    unklar: "Non siamo riusciti a verificare la foto. Riprova tra un momento.",
  },
};

export function altersFehlerText(grund: "minderjaehrig" | "unklar" | "kein-gesicht", lang?: string): string {
  const l = String(lang ?? "en").slice(0, 2).toLowerCase();
  const t = TEXTE[l] ?? TEXTE.en;
  return grund === "minderjaehrig" ? t.minderjaehrig : t.unklar;
}
