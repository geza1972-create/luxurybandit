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

export type AltersGrund = "minderjaehrig" | "nacktheit" | "kind-nackt" | "unklar" | "kein-gesicht";

export type AltersPruefung =
  /**
   * `ok: true` heisst „darf weiter" — NICHT „ist unauffällig".
   *
   * Im Beobachten-Modus geht auch ein auffälliger Fall durch; dann steht `warnung` darauf.
   * Genau die trägt der Eintrag später als Zeichen in der Galerie (Owner 31.07.2026: „du
   * machst mir aber in der Galerie ein Warnzeichen drauf"). Ohne dieses Feld wäre das
   * Beobachten wertlos: Man liesse alles durch und wüsste hinterher nicht, was auffiel.
   */
  /**
   * `kopf` ist das Kopf-Rechteck in Prozent (siehe `box` im Frageprompt) — dasselbe Modell,
   * derselbe Aufruf, keine zusätzlichen Kosten. Der Trichter schneidet damit vor dem
   * OpenAI-Schritt auf den Kopf zu (Owner 16.08.2026). Fehlt es, wird nicht geschnitten.
   */
  | { ok: true; alter: number; warnung?: AltersGrund; kopf?: { x: number; y: number; w: number; h: number } }
  | { ok: false; grund: AltersGrund; alter?: number };

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

/**
 * BEOBACHTEN ODER SPERREN (Owner 31.07.2026: „wir machen so, wir lassen erst mal alles durch
 * um zu testen was du erkennst").
 *
 * Richtige Reihenfolge: Erst sehen, was die Prüfung erkennt, dann scharf stellen. Eine
 * Sperre, deren Trefferquote niemand kennt, weist am ersten Tag zehn echte Kundinnen ab.
 *
 * `beobachten` prüft ganz normal und PROTOKOLLIERT das Urteil — lässt aber durch.
 * `sperren`   weist ab (der Zustand, für den das alles gebaut ist).
 *
 * EINE AUSNAHME BLEIBT AUCH IM BEOBACHTEN-MODUS: Ein eindeutiges „minor: true" wird IMMER
 * abgewiesen. Der Zweck des Beobachtens ist, die Grauzone zu vermessen — die Fälle, in denen
 * die Prüfung unsicher ist oder eine junge Erwachsene für ein Kind halten könnte. Für den
 * eindeutigen Fall gibt es nichts zu vermessen, und das Material läge sonst in unserem
 * Speicher. Wer auch das durchlassen will, setzt `MINOR_CHECK_MODE=alles-durch` — dann steht
 * die Entscheidung wenigstens sichtbar in der Konfiguration.
 */
/**
 * VORGABE IST BEOBACHTEN, NICHT SPERREN — Korrektur vom 01.08.2026.
 *
 * Der Owner hatte den Beobachten-Modus angeordnet („wir lassen erst mal alles durch"), aber
 * die Umgebungsvariable stand nur in der lokalen .env.local. Auf Vercel existierte sie nicht
 * — dort lief die Sperre die Nacht durch SCHARF, mitsamt „im Zweifel abweisen". In dieser
 * Nacht blieben echte Versuche ohne Ergebnis. Die Vorgabe im CODE muss dem entsprechen, was
 * angeordnet ist; eine Variable, die man setzen muss, damit die Anordnung gilt, ist falsch
 * herum. Scharf stellen heisst jetzt ausdrücklich: MINOR_CHECK_MODE=sperren auf Vercel.
 * (Kind + nackt bleibt in jedem Modus abgewiesen, siehe unten.)
 */
const MODUS = (process.env.MINOR_CHECK_MODE ?? "beobachten").trim().toLowerCase();
const NUR_BEOBACHTEN = MODUS === "beobachten" || MODUS === "alles-durch";
const AUCH_EINDEUTIGE_DURCH = MODUS === "alles-durch";

type Antwort = { minor?: boolean; age?: number; face?: boolean; nude?: boolean;
  /** Kopf-Rechteck in PROZENT des Bildes — siehe `box` im Frageprompt unten. */
  box?: { x?: number; y?: number; w?: number; h?: number } };

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
                + "Return ONLY compact JSON: {\"minor\":true|false,\"age\":NN,\"face\":true|false,\"nude\":true|false,"
                + "\"box\":{\"x\":NN,\"y\":NN,\"w\":NN,\"h\":NN}}\n"
                // Die Grenze muss BEIDE Richtungen benennen. Stand hier nur „im Zweifel ja",
                // schlug das Modell auch bei jung aussehenden Erwachsenen an — der Einwand des
                // Owners vom 31.07.2026 („eine 18-Jährige kann auch jünger aussehen").
                + "- minor: true if ANY person appears to be a child or a teenager under 18.\n"
                + "  A young-looking ADULT (student age, around 18-25) is NOT a minor — answer false for them.\n"
                + "  But if you genuinely cannot tell whether someone is a child, answer true.\n"
                + "- age: the apparent age in years of the youngest person. Always give a number, never 0.\n"
                + "- face: true if at least one human face is clearly visible.\n"
                // Wäsche und Bademode sind das Geschäft dieses Portals und ausdrücklich KEINE
                // Nacktheit (Owner 31.07.2026: „Lingerie ist nicht verboten"). Ohne diese
                // Abgrenzung meldet das Modell jedes Dessous-Foto als nackt und der Trichter
                // stünde still.
                + "- nude: true ONLY if genitals, buttocks or female nipples are visible.\n"
                + "  Lingerie, underwear, swimwear and bikinis are NOT nude — answer false for them.\n"
                /**
                 * DAS KOPF-RECHTECK — GRATIS, WEIL DIESER AUFRUF OHNEHIN STATTFINDET
                 * (Owner 16.08.2026: „aber kannst du die erkennen und schneiden?" · „gratis").
                 *
                 * Es gibt keinen zweiten Dienst und keinen zweiten Aufruf: Dieses Modell sieht
                 * jedes hochgeladene Foto bereits an, um Alter und Nacktheit zu beurteilen. Es
                 * nach dem Kopf zu fragen, kostet ein paar Ausgabe-Token — im Rauschen der
                 * Rechnung nicht messbar.
                 *
                 * WOFÜR: Die neue Kuss-Kette gibt nur den KOPF an OpenAI weiter (Owner: „viele
                 * schweine laden nakte bilder hoch … die müssen wir auch machen, in dem wir die
                 * gesichter an chatgpt geben"). Mit diesem Rechteck kann der Trichter genau das
                 * ausschneiden, bevor er es losschickt — der Rest des Fotos verlässt das Gerät
                 * gar nicht erst.
                 *
                 * PROZENT, NICHT PIXEL: Das Modell kennt die Ausgabegrösse nicht zuverlässig;
                 * Prozent gelten für jede Skalierung. Und GROSSZÜGIG: Sprachmodelle schätzen
                 * Rechtecke ungenau — ein zu enger Schnitt köpft den Menschen, ein zu weiter
                 * schadet nichts, weil der Bildprompt ohnehin sagt, dass alles unterhalb des
                 * Halses aus dem Text kommt.
                 */
                + "- box: the head of the most prominent person (the one whose face is largest),\n"
                + "  as PERCENT of the image: x/y = top-left corner, w/h = width/height, each 0-100.\n"
                + "  Be GENEROUS: include the whole head, the hair and the shoulders, with margin.\n"
                + "  If no face is visible, return {\"x\":0,\"y\":0,\"w\":100,\"h\":100}.\n"
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
    if (FAIL_OPEN || NUR_BEOBACHTEN) {
      console.warn("[alterspruefung] Seh-Modell nicht erreichbar — durchgelassen");
      return { ok: true, alter: 0, warnung: "unklar" };
    }
    console.error("[alterspruefung] Seh-Modell nicht erreichbar — GESPERRT (Sicherheitsvorgabe)");
    return { ok: false, grund: "unklar" };
  }

  const alter = Number.isFinite(Number(a.age)) ? Number(a.age) : 0;

  /**
   * ══ DIE EINE REGEL OHNE AUSNAHME ══ (Owner 31.07.2026: „Kinder, Nacktheit …")
   *
   * Kind UND nackt wird IMMER abgewiesen — in jedem Modus, auch in „alles-durch", auch wenn
   * jemand die Umgebungsvariablen verstellt. Hier gibt es nichts zu beobachten und nichts
   * abzuwägen: Das Material darf unseren Speicher nicht berühren, und der Testbetrieb ist
   * kein Grund, der das aufwiegt.
   *
   * Deshalb steht diese Prüfung VOR allen anderen Zweigen und liest sich nicht aus einer
   * Konfiguration.
   */
  if (a.minor === true && a.nude === true) {
    console.error(`[alterspruefung] KIND + NACKTHEIT — abgewiesen, ohne Ausnahme | ${new Date().toISOString()}`);
    return { ok: false, grund: "kind-nackt", alter };
  }

  // Nacktheit bei Erwachsenen: kein Verbot, aber ein Zeichen in der Galerie. Unsere Kette
  // erzeugt bekleidete Bilder; eine nackte Vorlage ist ein Hinweis, dass jemand etwas
  // anderes versucht.
  if (a.nude === true) {
    console.warn(`[alterspruefung] Nacktheit erkannt (alter≈${alter}) — modus=${MODUS}`);
    if (NUR_BEOBACHTEN) return { ok: true, alter, warnung: "nacktheit" };
    return { ok: false, grund: "nacktheit", alter };
  }

  // Der eindeutige Fall: das Modell sagt selbst „minderjährig".
  if (a.minor === true) {
    console.warn(`[alterspruefung] minderjaehrig erkannt (alter≈${alter}) — modus=${MODUS}`);
    if (AUCH_EINDEUTIGE_DURCH) return { ok: true, alter, warnung: "minderjaehrig" };
    return { ok: false, grund: "minderjaehrig", alter };
  }

  // Der Grenzfall: das Modell sagt „erwachsen", die Zahl liegt aber darunter.
  if (alter > 0 && alter < MINDESTALTER) {
    console.warn(`[alterspruefung] Alter ${alter} unter ${MINDESTALTER} — modus=${MODUS}`);
    if (NUR_BEOBACHTEN) return { ok: true, alter, warnung: "minderjaehrig" };
    return { ok: false, grund: "minderjaehrig", alter };
  }

  return { ok: true, alter, ...(kopfAus(a) ? { kopf: kopfAus(a)! } : {}) };
}

/**
 * DAS KOPF-RECHTECK PRÜFEN, BEVOR JEMAND DANACH SCHNEIDET.
 *
 * Ein Sprachmodell darf hier alles antworten — auch Unsinn. Ein fehlerhaftes Rechteck würde
 * beim Zuschneiden einen Menschen köpfen, und das fiele erst im bezahlten Ergebnis auf.
 * Deshalb gilt nur, was vollständig, im Bild und gross genug ist; alles andere wird zu
 * „kein Rechteck" — dann schneidet der Trichter nicht, statt falsch zu schneiden.
 */
function kopfAus(a: Antwort): { x: number; y: number; w: number; h: number } | null {
  const b = a?.box;
  if (!b) return null;
  const z = (n: unknown) => (Number.isFinite(Number(n)) ? Number(n) : NaN);
  const x = z(b.x), y = z(b.y), w = z(b.w), h = z(b.h);
  if ([x, y, w, h].some(Number.isNaN)) return null;
  if (w < 5 || h < 5) return null;                       // ein Kopf von 4 % ist ein Irrtum
  if (x < 0 || y < 0 || x + w > 100.5 || y + h > 100.5) return null;
  if (w > 99 && h > 99) return null;                     // „ganzes Bild" heisst: nichts gefunden
  return { x, y, w, h };
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
  // Eine Warnung an EINEM Bild macht den ganzen Vorgang auffällig: Es wird ja ein Bild aus
  // beiden Vorlagen. Die schwerere Warnung gewinnt.
  const rang: AltersGrund[] = ["kind-nackt", "minderjaehrig", "nacktheit", "unklar", "kein-gesicht"];
  const warnungen = ergebnisse.flatMap(r => (r.ok && r.warnung ? [r.warnung] : []));
  const warnung = rang.find(g => warnungen.includes(g));
  return { ok: true, alter: alter.length ? Math.min(...alter) : 0, ...(warnung ? { warnung } : {}) };
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

/** Für Nacktheit gibt es einen eigenen Satz — „minderjährig" wäre dort eine falsche
 *  Anschuldigung. DER SPRUCH IST VOM OWNER (13.08.2026, wörtlich samt Smiley: „No naked,
 *  go to pornhub! :)") — die Marke darf hier frech sein; der zweite Satz sagt trotzdem
 *  klar, was zu tun ist. */
const NACKT: Record<string, string> = {
  de: "No naked — go to Pornhub! 🙂 Hier bitte ein Foto, auf dem du bekleidet bist.",
  en: "No naked — go to Pornhub! 🙂 Please use a photo where you are dressed.",
  ro: "No naked — go to Pornhub! 🙂 Aici folosește o poză în care ești îmbrăcat.",
  es: "No naked — go to Pornhub! 🙂 Aquí usa una foto en la que estés vestido.",
  fr: "No naked — go to Pornhub! 🙂 Ici, utilise une photo où tu es habillé.",
  pt: "No naked — go to Pornhub! 🙂 Aqui usa uma foto em que estejas vestido.",
  it: "No naked — go to Pornhub! 🙂 Qui usa una foto in cui sei vestito.",
};

export function altersFehlerText(grund: AltersGrund, lang?: string): string {
  const l = String(lang ?? "en").slice(0, 2).toLowerCase();
  const t = TEXTE[l] ?? TEXTE.en;
  if (grund === "nacktheit") return NACKT[l] ?? NACKT.en;
  // „kind-nackt" bekommt bewusst denselben Satz wie „minderjährig": Der Nutzer muss wissen,
  // dass es nicht geht — eine genauere Beschreibung dessen, was wir erkannt haben, gehört
  // nicht in eine Meldung an ihn.
  return grund === "minderjaehrig" || grund === "kind-nackt" ? t.minderjaehrig : t.unklar;
}

/** Kurzes Zeichen für die Galerie — was der Admin auf einen Blick sehen soll. */
export function warnZeichen(grund: AltersGrund): { zeichen: string; text: string } {
  switch (grund) {
    case "kind-nackt": return { zeichen: "⛔", text: "Kind + Nacktheit — abgewiesen" };
    case "minderjaehrig": return { zeichen: "⚠️", text: "Könnte minderjährig sein" };
    case "nacktheit": return { zeichen: "🔞", text: "Nacktheit erkannt" };
    case "unklar": return { zeichen: "❓", text: "Nicht prüfbar" };
    default: return { zeichen: "❓", text: "Kein Gesicht erkannt" };
  }
}
