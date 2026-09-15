import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";
import { motivPfad, pruefPfad } from "@/lib/versusforge-moderation";
import { bildAnsehen, type WerkBefund } from "@/lib/versusforge-bild-ansehen";
import { mandantLesen, mandantSpeichern, istVorgabeHook } from "@/lib/versusforge-mandanten";
import { str, GROSS, frageModell, type Verbrauch } from "@/lib/agent-modell";
import { sprachname } from "@/lib/lang";
import { KUNST_SCHRITTE } from "@/lib/versusforge-kunst-rezept";

/**
 * ── DIE REGELN KOMMEN AUS DEM REZEPT, NICHT AUS MEINEM KOPF (Owner 13.09.2026: „ich dachte wir
 * gehen jetzt nach unserem rezept vor") ───────────────────────────────────────────────────────
 *
 * Hier standen selbstgeschriebene Regeln — und sie waren schwächer als das, was das Haus längst
 * hat. `lib/versusforge-kunst-rezept.ts` ist das aufgeschriebene Wissen des Owners über Kunst:
 * die Hebel (Zweck · Identität · Stein-Wendung · Geschichte · echte Knappheit), die verbotenen
 * Floskeln, der Ton auf Rumänisch — und ausgerechnet das Gegenbeispiel „Scara coboară; apa
 * păstrează un gând neterminat." steht dort als ZU SCHWACH, WEIL OHNE GRUND ZU KAUFEN. Genau
 * die Krankheit, die der Owner im fertigen Satz gesehen hat.
 *
 * DERSELBE SCHRITT, DEN AUCH DER AGENT BENUTZT (über `KUNST_AUFTRAG` in `versusforge-rezepte`).
 * Zwei Regelwerke unter denselben Bildern wären zwei Stimmen — und eine davon veraltet, sobald
 * der Owner am Rezept etwas ändert.
 *
 * WAS HERAUSGEFILTERT WIRD: Der Schritt beschreibt auch den GESPRÄCHSABLAUF — Chip-Zeilen
 * (`>>Ja|Nein`), „schreib für JEDES Werk", „Sagt er Nein: frag …". Hier entsteht EIN Satz ohne
 * Gespräch; solche Anweisungen würden das Modell zu Rückfragen oder Listen verleiten.
 */
const SPRUCH_REGELN = (KUNST_SCHRITTE.find(s => s.schluessel === "spruch")?.regeln ?? [])
  .filter(r => !r.includes(">>") && !/^REIHENFOLGE/.test(r) && !/^Sagt er Nein/.test(r));

/**
 * DIE SÄTZE ZU WERKEN, DIE NOCH KEINEN HABEN (Owner 12.09.2026: „Grosser Button lade Bilder hoch,
 * save. Dann wird alles angelegt" · „selbst hier entstehen Sprüche").
 *
 * ── WARUM ES DAS BRAUCHT ────────────────────────────────────────────────────────────────────
 *
 * Sätze unter den Bildern entstanden bisher NUR im Trichter. Wer auf „Seite bearbeiten" ein Werk
 * hinzufügte, bekam keinen — die Kachel stand stumm neben denen aus dem Trichter, bis er selbst
 * tippte. (Was dort schon lief, ist etwas anderes: `introsVorab` schreibt, was der AGENT über ein
 * Werk erzählt, und liest den Satz dabei als Zutat. Es schreibt ihn nicht.)
 *
 * ── WAS HIER PASSIERT ───────────────────────────────────────────────────────────────────────
 *
 * Für jede Kachel ohne Satz: das abgelegte Bild lesen, ansehen (wenn noch kein Befund da ist),
 * und in EINEM Aufruf alle fehlenden Sätze schreiben. Die Befunde werden mitgespeichert — sie
 * sind auch der Stoff, aus dem sein Agent später erzählt.
 *
 * ── ES LÄUFT IM HINTERGRUND, UND ES DARF SCHEITERN ──────────────────────────────────────────
 *
 * Aufgerufen aus `after()` beim Speichern. Geht etwas schief, bleibt der Satz leer und er trägt
 * ihn selbst ein — nie ein Abbruch, nachdem er auf „Speichern" gedrückt hat.
 *
 * FRISCH LESEN, KURZ SCHREIBEN: `mandantSpeichern` schreibt den GANZEN Datensatz ohne Merge.
 * Zwischen Lesen und Schreiben liegt hier ein Modellaufruf von einigen Sekunden — deshalb wird
 * unmittelbar vor dem Schreiben noch einmal gelesen und nur `hook`/`hooks`/`werkBefunde` gesetzt.
 */

/** Der Ablage-Name einer Kachel: -1 ist das Standardmotiv und liegt ohne Nummer. */
const motivNr = (i: number) => (i < 0 ? "" : String(i));
/** Der Schlüssel in `werkInfo` und `werkBefunde` — dort heisst dasselbe Motiv „standard". */
const infoSchluessel = (i: number) => (i < 0 ? "standard" : String(i));

/**
 * ── EIN EINZELNER SPRUCH, AUF ZURUF (Owner 13.09.2026: „Szidonia sagt, du hättest nur bei einigen
 * neuen Werken Texte generiert und bei einigen nicht. Ich glaube man muss einen Button unter jedem
 * Werk machen. Beschreibung AI generieren") ───────────────────────────────────────────────────
 *
 * `spruecheNachtragen` schreibt alle fehlenden Sätze in EINEM Modellaufruf und ordnet sie über
 * ihre Reihenfolge zu. Liefert das Modell weniger Sätze als Bilder — was es darf und gelegentlich
 * tut —, bleiben die letzten stumm, und niemand erfährt davon. Dazu kommt: Es läuft im
 * Hintergrund nach dem Speichern, überschreibt nie einen vorhandenen Satz, und wer gerade
 * hinsieht, hält die Lücke für endgültig.
 *
 * DIESER WEG GEHÖRT IHR: ein Werk, ein Aufruf, sofort sichtbar — und er ersetzt auch einen Satz,
 * der ihr nicht gefällt. Gespeichert wird nichts; der Vorschlag landet in ihrem Feld, und sie
 * entscheidet mit „Speichern".
 *
 * DERSELBE PROMPT WIE OBEN, bewusst: Zwei Stellen, die Sprüche schreiben, wären zwei Stimmen
 * unter denselben Bildern.
 */
export async function spruchFuerWerk(mandant: string, i: number): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  if (!apiKey) return "";
  const m = await mandantLesen(mandant);
  if (!m) return "";

  const schluessel = infoSchluessel(i);
  /* Befund von früher nutzen; fehlt er, das Bild jetzt ansehen. */
  let befund = m.werkBefunde?.[schluessel] as WerkBefund | undefined;
  if (!befund?.szene && !befund?.motiv) {
    const bild = await motivLesen(mandant, i);
    if (!bild) return "";
    const gesehen = await bildAnsehen({ apiKey, bild }).catch(() => null);
    if (gesehen?.ok) {
      befund = gesehen.werk;
      /* Frisch lesen, eng schreiben: `mandantSpeichern` legt den ganzen Datensatz ohne Merge ab. */
      const frisch = await mandantLesen(mandant);
      if (frisch) {
        await mandantSpeichern(mandant, {
          ...frisch,
          werkBefunde: { ...(frisch.werkBefunde ?? {}), [schluessel]: gesehen.werk },
        });
      }
    }
  }
  /* Seine übrigen Sätze als Vorbild — und damit der neue nicht klingt wie einer davon. */
  const hooks = Array.isArray(m.hooks) ? m.hooks : [];
  const andere = [String(m.hook ?? ""), ...hooks]
    .map(s => String(s ?? "").trim())
    .filter((s, k) => s && k - 1 !== i)
    .slice(0, 4);

  /* DAS BILD REIST MIT (Owner 14.09.2026) — auch wenn der Befund längst vorliegt. Ohne es
     entstünde wieder eine Nacherzählung englischer Stichworte, siehe `spruchAusBefund`. */
  const bild = await motivLesen(mandant, i).catch(() => "");

  return spruchAusBefund({ apiKey, befund, sprache: m.sprache, andere, ...(bild ? { bild } : {}) })
    .catch(e => { console.warn("[kuenstler-sprueche] Einzelspruch gescheitert:", mandant, i, e); return ""; });
}

/**
 * ── EIN SPRUCH AUS EINEM BILDBEFUND — DIE EINE STIMME (13.09.2026) ──────────────────────────
 *
 * WARUM DAS HIER STEHT UND NICHT ZWEIMAL: Der Trichter zeigt seit dem 13.09.2026 eine Vorschau,
 * BEVOR es einen Künstler gibt (Owner: „Dann die Analyse zeigt ein Beispiel. Ein kunstwerk und
 * der Spruch drunter"). Sie braucht denselben Satz-Ton wie seine spätere Seite — und der
 * Kommentar an `spruchFuerWerk` sagt schon, warum: „Zwei Stellen, die Sprüche schreiben, wären
 * zwei Stimmen unter denselben Bildern."
 *
 * DER UNTERSCHIED ZU `spruchFuerWerk`: Dort gibt es einen Mandanten, hier nur einen Befund und
 * eine Sprache. Deshalb nimmt diese Funktion beides als Argument — sie liest nichts und
 * speichert nichts.
 */
export async function spruchAusBefund(o: {
  apiKey: string;
  befund: WerkBefund | undefined;
  sprache: string;
  /** Seine anderen Sätze, falls es welche gibt — Vorbild für Ton und Länge. */
  andere?: string[];
  /**
   * WAS DIESER AUFRUF VERBRAUCHT HAT (Owner 13.09.2026: „Da müssen wir auch sparen").
   *
   * Der Verbrauch wurde hier bisher weggeworfen. Gemessen wurde damit nur der Chat — und
   * ausgerechnet der Spruch läuft auf dem GROSSEN Modell, ist also die teure Hälfte. Was man
   * nicht misst, kann man nicht senken.
   *
   * ALS RÜCKRUF, NICHT ALS RÜCKGABEWERT: Die Funktion gibt weiter einen String zurück, sonst
   * müsste jeder Aufrufer (`spruchFuerWerk`, `api/portal-spruch`) mit umgebaut werden, nur um
   * eine Zahl durchzureichen, die dort niemanden interessiert.
   */
  melden?: (v: Verbrauch) => void;
  /**
   * ── DAS BILD SELBST (Owner 14.09.2026: „was zum Henker wurde hier generiert? Ein Bullshit" ·
   * „o tiv? Es heisst un tiv" · „würde ich ChatGPT fragen, würde er es tausendmal besser
   * machen") ─────────────────────────────────────────────────────────────────────────────────
   *
   * BIS HIERHER BEKAM DAS MODELL NUR TEXT: `szene · merkmale · selten` aus einer früheren
   * Analyse — und zwar auf ENGLISCH. Daraus entstand, was entstehen musste: eine Nacherzählung
   * der Stichwortliste („ivory field, frayed denim hem, silhouette of hair" → „ein ausgefranster
   * Saum, die Krümmung, das Haar"), und beim Übersetzen riet es das Geschlecht falsch — „o tiv"
   * statt „un tiv", weil das englische „hem" keines hat.
   *
   * Wer das Bild sieht, benennt es in seiner Sprache selbst. Deshalb reist es jetzt mit.
   */
  bild?: string;
}): Promise<string> {
  const teile = [o.befund?.szene, (o.befund?.merkmale ?? []).join(", "), o.befund?.selten].filter(Boolean);
  const beschreibung = teile.length ? teile.join(" · ") : "";
  if (!beschreibung || !o.apiKey) return "";
  const andere = (o.andere ?? []).filter(Boolean).slice(0, 4);

  const r = await frageModell(o.apiKey, GROSS, [
    ...(o.bild ? [{ type: "input_image" as const, image_url: o.bild, detail: "high" as const }] : []),
    { type: "input_text" as const, text: [
    `Du schreibst für einen Künstler EINEN kurzen Spruch unter EIN Bild, in dieser Sprache: ${sprachname(o.sprache)}.`,
    ...(o.bild ? [
      "DAS BILD LIEGT DIR VOR — sieh es an und schreib über das, was DU siehst. Die Beschreibung unten ist nur eine Notiz aus einer früheren Analyse; sie ist auf Englisch und unvollständig. Zähle sie NIE nach.",
    ] : []),
    /**
     * ── IN DER SPRACHE DENKEN, NICHT ÜBERSETZEN (Owner 14.09.2026: „o tiv? Es heisst un tiv …
     * grammatikal falsch auch noch") ───────────────────────────────────────────────────────
     *
     * Das Rezept verlangt seit dem 11.09.2026 „auf Rumänisch denken". Trotzdem kam „o tiv":
     * Das Modell übersetzte ein englisches Stichwort und riet den Artikel. Der Satz hier ist
     * die ausdrückliche Ansage — und er kostet nichts.
     */
    `SCHREIBE DIREKT IN ${sprachname(o.sprache).toUpperCase()}, übersetze nicht aus dem Englischen. Prüfe Artikel und Geschlecht jedes Hauptworts, bevor du antwortest — ein falscher Artikel („o tiv" statt „un tiv") verrät sofort die Maschine und macht den Künstler lächerlich.`,
    ...(andere.length ? [`Seine Sätze unter den anderen Bildern — Vorbild für Ton und Länge, nie abschreiben und nie gleich anfangen: ${andere.map(s => `„${s}"`).join(" · ")}`] : []),
    /* Die Regeln des Hauses, wörtlich aus dem Rezept — siehe `SPRUCH_REGELN` oben. */
    ...SPRUCH_REGELN.map(r => `· ${r}`),
    /* ── DER EINE ZUSATZ, DEN DAS REZEPT NICHT KENNT ─────────────────────────────────────────
       Das Rezept beschreibt den Agenten, der MEHRERE Sprüche auf einmal schreibt („jeder einen
       anderen Hebel", „jeder fängt anders an"). Hier entsteht genau EINER — deshalb dieser Satz,
       und sonst nichts Eigenes. */
    "HIER SCHREIBST DU GENAU EINEN SPRUCH für EIN Bild: keine Auswahl, keine Aufzählung, kein Vorspann, keine Rückfrage.",
    o.bild ? `Notiz aus der früheren Analyse (nur als Hinweis, nie nacherzählen): ${beschreibung}` : `Das Bild: ${beschreibung}`,
    'Antworte NUR als JSON: {"spruch":"..."}',
    ].join("\n") },
  ], "low");

  if (!r.ok) {
    console.warn("[kuenstler-sprueche] Spruch aus Befund gescheitert:", r.fehler);
    return "";
  }
  o.melden?.(r.verbrauch);
  return str((r.daten as { spruch?: unknown } | null)?.spruch, 280).trim();
}

/** Liest ein abgelegtes Motiv und gibt es als data:-URL zurück — auch aus der Prüfablage. */
async function motivLesen(mandant: string, i: number): Promise<string> {
  const nr = motivNr(i);
  for (const pfad of [motivPfad(mandant, nr), pruefPfad(mandant, nr)]) {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad)}`).catch(() => null);
    if (res?.ok) {
      const roh = Buffer.from(await res.arrayBuffer());
      if (roh.length) return `data:image/jpeg;base64,${roh.toString("base64")}`;
    }
  }
  return "";
}

export async function spruecheNachtragen(mandant: string): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  if (!apiKey) return;
  const m = await mandantLesen(mandant);
  if (!m) return;

  const hooks = Array.isArray(m.hooks) ? [...m.hooks] : [];
  /* Der Vorgabesatz zählt als LEER (Owner 14.09.2026) — sonst gilt das erste Werk als versorgt
     und behält für immer den Platzhalter (siehe `istVorgabeHook`). */
  const satzVon = (i: number) => {
    const s = String((i < 0 ? m.hook : hooks[i]) ?? "").trim();
    return istVorgabeHook(s) ? "" : s;
  };
  /* Alle Kacheln, die er hat — auch die ohne Satz (die stehen nur in `werkNummern`). */
  const alle = Array.isArray(m.werkNummern) && m.werkNummern.length
    ? [...new Set(m.werkNummern)]
    : [...(String(m.hook ?? "").trim() ? [-1] : []), ...hooks.map((_, i) => i)];
  const offen = alle.filter(i => !satzVon(i));
  if (!offen.length) return;

  /* Den Befund gibt es schon, wenn das Werk aus dem Trichter kam — dann wird es nicht erneut
     angesehen. Neu im Profil hochgeladene Werke haben keinen. */
  /* Nur erfolgreich gelesene Befunde kommen hier hinein — ein `undefined` im Werttyp würde beim
     Zusammenführen mit `werkBefunde` lauter leere Schlüssel erzeugen. */
  const befunde: Record<string, WerkBefund> = {};
  /**
   * ── DIE BILDER WERDEN BEHALTEN (Owner 14.09.2026: „o tiv? Es heisst un tiv") ───────────────
   *
   * Sie wurden hier schon immer geladen — aber nur, um sie anzusehen, und danach weggeworfen.
   * In den Prompt ging allein die englische Stichwortliste, und daraus entstanden Sätze, die sie
   * nacherzählen und beim Übersetzen den Artikel raten. Das ist der teuerste Weg dieser Sorte:
   * Hier entstehen bei EINEM Klick auf „Speichern" gleich alle fehlenden Sprüche.
   */
  const bilder: Record<number, string> = {};
  await Promise.all(offen.map(async i => {
    const schluessel = infoSchluessel(i);
    const bild = await motivLesen(mandant, i);
    if (bild) bilder[i] = bild;
    const vorhanden = m.werkBefunde?.[schluessel];
    if (vorhanden?.szene || vorhanden?.motiv) return;
    if (!bild) return;
    const gesehen = await bildAnsehen({ apiKey, bild }).catch(() => null);
    if (gesehen?.ok) befunde[schluessel] = gesehen.werk;
  }));

  const beschreibung = (i: number) => {
    const b = befunde[infoSchluessel(i)] ?? m.werkBefunde?.[infoSchluessel(i)];
    const teile = [b?.szene, (b?.merkmale ?? []).join(", "), b?.selten].filter(Boolean);
    return teile.length ? teile.join(" · ") : "ein Bild von ihm";
  };
  const vorhandeneSaetze = alle.filter(i => satzVon(i)).map(i => satzVon(i)).slice(0, 4);

  /* Die Bilder zuerst, in der Reihenfolge der Liste unten — das Modell sieht sie als 1, 2, 3 … */
  const bildTeile = offen.map(i => bilder[i]).filter(Boolean)
    .map(b => ({ type: "input_image" as const, image_url: b, detail: "high" as const }));

  const r = await frageModell(apiKey, GROSS, [
    ...bildTeile,
    { type: "input_text" as const, text: [
    `Du schreibst für einen Künstler kurze Sprüche unter seine Bilder, in dieser Sprache: ${sprachname(m.sprache)}.`,
    ...(bildTeile.length === offen.length ? [
      "DIE BILDER LIEGEN DIR VOR, in derselben Reihenfolge wie die Liste unten. Sieh sie an und schreib über das, was DU siehst — die Beschreibungen sind nur Notizen aus einer früheren Analyse, auf Englisch und unvollständig. Zähle sie NIE nach.",
    ] : []),
    /* Dieselbe Ansage wie in `spruchAusBefund`: „o tiv" statt „un tiv" entstand, weil aus
       englischen Stichworten übersetzt statt in der Zielsprache gedacht wurde. */
    `SCHREIBE DIREKT IN ${sprachname(m.sprache).toUpperCase()}, übersetze nicht aus dem Englischen. Prüfe Artikel und Geschlecht jedes Hauptworts, bevor du antwortest — ein falscher Artikel verrät sofort die Maschine und macht den Künstler lächerlich.`,
    ...(vorhandeneSaetze.length ? [`Seine schon vorhandenen Sätze, als Vorbild für Ton und Länge — nie abschreiben: ${vorhandeneSaetze.map(s => `„${s}"`).join(" · ")}`] : []),
    "Regeln: ein bis zwei Sätze (höchstens 280 Zeichen), Kurator und Verkäufer zugleich — das genaue Detail aus dem Bild UND ein Grund, es zu wollen (was es auslösen kann, wer so etwas besitzt, oder das Gewöhnliche, das ins Wollen kippt) — nie sagen, was der Betrachter fühlt, will oder tut (‚simți', ‚vrei să', ‚du willst'), benannte Farben (Siena, Ultramarin …), kein Titel in der Form ‚X: Y', nichts über die Wohnung des Käufers. Keine Technikwörter (Lasur, Impasto), keine Stilnamen, nichts erfinden, was nicht in der Beschreibung steht.",
    "JEDER SPRUCH FÄNGT ANDERS AN und ist anders gebaut (eine Frage, eine Aussage, ein Bild) — nie zweimal dasselbe Anfangswort. Jede Farbe höchstens einmal über alle Werke hinweg. Keine Floskeln (‚Unikat', ‚einzigartig', ‚exklusiv'), nie das Nach-Hause-Holen (‚hol dir', ‚an die Wand', ‚ia acasă', ‚bring home').",
    "Die Bilder:",
    offen.map((i, k) => `${k + 1}: ${beschreibung(i)}`).join("\n"),
    `Antworte NUR als JSON: {"sprueche":["..."]} — genau ${offen.length} Sprüche, in der Reihenfolge der Bilder.`,
    ].join("\n") },
  ], "low");
  const roh = r.ok ? (r.daten as { sprueche?: unknown } | null)?.sprueche : null;
  const neue = (Array.isArray(roh) ? roh : []).map(s => str(s, 280).trim());
  if (!r.ok) console.warn("[kuenstler-sprueche] Sätze gescheitert:", mandant, r.fehler);
  /**
   * ── WENN WENIGER SÄTZE KOMMEN ALS BILDER (Owner 13.09.2026: „bei einigen neuen Werken Texte
   * generiert und bei einigen nicht") ─────────────────────────────────────────────────────────
   *
   * Die Zuordnung unten läuft über die Reihenfolge: `neue[k]` gehört zu `offen[k]`. Liefert das
   * Modell sechs Sätze für sieben Bilder — was vorkommt —, bleiben die letzten leer, und
   * `if (!satz) return` überging das wortlos. Genau das hat Szidonia gesehen, und niemand konnte
   * es erklären, weil nirgends etwas davon stand.
   *
   * Repariert wird es hier nicht (ein zweiter Aufruf würde den Hintergrundlauf verdoppeln) —
   * sichtbar gemacht schon: Über den Knopf am Werk holt sie den fehlenden Satz selbst nach.
   */
  if (r.ok && neue.filter(Boolean).length < offen.length) {
    console.warn(
      `[kuenstler-sprueche] ${mandant}: ${neue.filter(Boolean).length} Sätze für ${offen.length} Bilder —`,
      `ohne Satz bleiben:`, offen.filter((_, k) => !neue[k]).join(", "),
    );
  }
  if (!neue.some(Boolean) && !Object.keys(befunde).length) return;

  const frisch = await mandantLesen(mandant);
  if (!frisch) return;
  const hooksNeu = Array.isArray(frisch.hooks) ? [...frisch.hooks] : [];
  let hookNeu = String(frisch.hook ?? "");
  offen.forEach((i, k) => {
    const satz = neue[k];
    if (!satz) return;
    if (i < 0) hookNeu = satz;
    else hooksNeu[i] = satz;
  });
  await mandantSpeichern(mandant, {
    ...frisch,
    hook: hookNeu,
    hooks: hooksNeu.map(h => h ?? ""),
    werkBefunde: { ...(frisch.werkBefunde ?? {}), ...befunde },
    /* FERTIG — ab hier zeigt seine Seite die Werke statt der Meldung „wird gerade angelegt". */
    aufbauSeit: "",
  });
}
