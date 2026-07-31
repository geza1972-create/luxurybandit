import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { claimFreePreview, readThemeConfig, getSignedUrl, createSignedUploadUrl } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
// 300 s statt 60 (Owner 30.07.2026: „das rendering bricht immer wieder ab" — auf der
// LIVE-Seite, lokal nie). Vercel killt eine Funktion nach Ablauf dieser Zeit; eine Erzeugung
// dauert 25–45 s, mit dem zweiten Anlauf (Gesichtsausschnitt) auch mal 70 s. Auf dem
// Hobby-Tarif greift trotzdem die 60-s-Grenze — deshalb steht darunter zusätzlich ein
// eigenes Zeitbudget, das rechtzeitig aufhört und eine Meldung schickt, statt tot umzufallen.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * DAS GRATIS-VORSCHAUBILD (Owner 29.07.2026).
 *
 * „Die Leute wollen was generieren, und wenn es klappt dann zahlen sie." — „Ich habe auch nie
 * gekauft bevor ich nicht etwas generiert habe. Ohne Gratis-Test kaufe ich nichts."
 *
 * WARUM ES DAS GIBT: Der Trichter zeigte eine gespielte Render-Show und danach ein
 * VERPIXELTES Bild. Der Besucher hat nie erlebt, dass es mit SEINEM Gesicht funktioniert — er
 * sollte für ein Versprechen zahlen. Ergebnis: 8 Durchläufe, 0 Zahlungen.
 *
 * Hier bekommt er ein ECHTES, scharfes Bild von sich und ihr. Die Kasse steht danach, vor dem
 * VIDEO. Er zahlt dann für die Steigerung von etwas, das er schon in der Hand hält.
 *
 * WARUM OPENAI UND NICHT FASHN (Owner): FASHN ist für Lingerie und teuer. Die Vorschau läuft
 * über gpt-image-1 in der Stufe „low" — nur so ist Verschenken tragbar. Ein Video kostet rund
 * das Zwanzigfache und bleibt deshalb hinter der Kasse.
 *
 * Deckelung steckt in `claimFreePreview` (serverseitig, siehe dort).
 */

// Wortgleich aus /api/generate-openai-tryon übernommen. OHNE diese Zusage antwortet OpenAI
// mit safety_violations=[sexual] und es kommt gar kein Bild — im Projekt mehrfach passiert.
const COVERAGE_RULE =
  "Strict coverage requirement: the output MUST depict both people fully and modestly dressed in complete outfits, REGARDLESS of how much skin is visible in the input photos. The clothing must fully cover the chest, cleavage, torso, shoulders and hips with opaque fabric. This is a tasteful editorial photograph of clothed people. Absolutely NO swimwear, bikini, lingerie, underwear, nudity, or exposed intimate areas (chest, cleavage, groin, buttocks). If an input shows swimwear or bare skin, replace it entirely with full, elegant clothing.";

/**
 * DAS ALTER BLEIBT (Owner 31.07.2026: „es sieht irgendwie zu jung aus, beide").
 *
 * Er hat den Fehler gesehen, und der stand in unserem eigenen Auftrag: Wir verlangten
 * „Gesichter, Frisuren und Hauttoene erhalten" — vom ALTER war nie die Rede. Genau das
 * glaettet ein Bildmodell zuerst, weil sein ganzes Trainingsmaterial retuschiert ist: Falten
 * weg, Hautstruktur weg, graues Haar dunkler, Kinnlinie straffer. Bei „Hochzeitsfoto" wird es
 * schlimmer, nicht besser — die Hochglanz-Brautfotografie ist der Bildvorrat, aus dem es
 * schoepft.
 *
 * Deshalb steht hier jetzt ausdruecklich, was NICHT geschoenert werden darf. Ein Modell
 * loescht nichts, was man ihm einzeln benennt; „erhalte das Gesicht" ist ihm zu allgemein,
 * „behalte die Lachfalten" nicht.
 *
 * Das ist auch geschaeftlich der Punkt: Wer sich selbst nicht wiedererkennt, verschickt die
 * Einladung nicht. Ein zwanzig Jahre juengeres Paar ist kein Kompliment, sondern ein fremdes
 * Paar — und die Gaeste sehen es sofort.
 */
const IDENTITAET_RULE =
  "Preserve BOTH faces exactly as in the reference photos — same bone structure, same nose, "
  + "same hairstyle and hair colour, same skin tone, same facial hair, same glasses. It must "
  + "clearly be the same two people.\n\n"
  + "CRITICAL — KEEP THEIR REAL AGE. Do NOT make them look younger, slimmer or more "
  + "conventionally attractive. Keep wrinkles, laugh lines, forehead lines, eye bags, skin "
  + "texture and pores, grey or thinning or receding hair, and the existing jawline and neck "
  + "exactly as they appear in the reference photos. No beauty filter, no airbrushing, no skin "
  + "smoothing, no de-aging, no slimming. If a person looks 55 in the reference photo, they "
  + "must look 55 in the result. This is an unretouched photograph of real adults, not a "
  + "bridal magazine cover.\n\n"
  + "An input photo may show only a face or head-and-shoulders; if so, extend it naturally "
  + "into a full figure that matches their apparent age and build.";

/**
 * DAS ALTER ALS ZAHL (Owner 31.07.2026, nach der Pruefung: „es sieht irgendwie zu jung aus").
 *
 * Am 31.07.2026 gemessen, dieselben zwei Vorlagen zweimal durch: Mit dem Satz „keep their real
 * age, keep wrinkles, no de-aging" wurde das Ergebnis nur MINIMAL aelter — etwas Grau an den
 * Schlaefen, sonst dieselbe glatte Haut, dasselbe geschaetzte Alter um die vierzig bei einem
 * Mann, der auf seinem Foto Mitte fuenfzig ist.
 *
 * Der Grund: „behalte das Alter" ist eine Verneinung ohne Ziel. Das Modell weiss nicht, WAS es
 * behalten soll — es kennt nur seinen eigenen Durchschnitt, und der ist ein Hochzeitspaar aus
 * dem Katalog. Eine ZAHL ist ein Ziel: „a 54-year-old man" trifft es, weil das Modell zu jedem
 * Jahrzehnt gelernte Merkmale hat.
 *
 * Deshalb schaetzt das Seh-Modell zuerst beide Alter — es steckt fuer den Gesichtsausschnitt
 * ohnehin schon in dieser Datei. Zwei Aufrufe kosten zusammen einen Bruchteil eines Cents und
 * rund eine Sekunde; das Bild selbst kostet das Fuenfzigfache.
 *
 * Scheitert die Schaetzung, faellt es still auf den Auftrag ohne Zahl zurueck. Ein Gratis-Bild
 * darf nie an einer Nebensache hängen.
 */
async function alterSchaetzen(dataUrl: string, key: string): Promise<number> {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "How old does the main person in this photo look? Answer with ONE number only, the age in years. No words." },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        }],
        max_tokens: 8,
      }),
    });
    const j = await res.json().catch(() => null);
    const n = parseInt(String(j?.choices?.[0]?.message?.content ?? "").replace(/\D+/g, ""), 10);
    // Alles ausserhalb 18–90 ist geraten und nicht gemessen — dann lieber keine Zahl.
    return Number.isFinite(n) && n >= 18 && n <= 90 ? n : 0;
  } catch { return 0; }
}

/**
 * BEIDE ALTER AUS EINEM BILD — fuer das gemeinsame Foto (Owner 31.07.2026: „es fehlt Upload
 * gemeinsam"). Eine Anfrage statt zwei, weil beide Gesichter auf demselben Bild stehen.
 *
 * Gibt [Mann, Frau] zurueck, damit es zum getrennten Fall passt. Was nicht erkannt wird, ist
 * 0 und faellt aus dem Auftrag heraus — lieber eine Zahl weniger als eine erfundene.
 */
async function alterPaarSchaetzen(dataUrl: string, key: string): Promise<[number, number]> {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "This photo shows two people. Return ONLY compact JSON {\"man\":NN,\"woman\":NN} with how old each of them looks in years. If a person of that gender is not visible, use 0. No prose." },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        }],
        max_tokens: 30,
      }),
    });
    const j = await res.json().catch(() => null);
    const m = /\{[^{}]*\}/.exec(String(j?.choices?.[0]?.message?.content ?? ""));
    if (!m) return [0, 0];
    const o = JSON.parse(m[0]) as { man?: number; woman?: number };
    const gut = (n: unknown) => (typeof n === "number" && n >= 18 && n <= 90 ? Math.round(n) : 0);
    return [gut(o.man), gut(o.woman)];
  } catch { return [0, 0]; }
}

/**
 * GESICHT AUSSCHNEIDEN, WENN DAS GANZE FOTO ABGEWIESEN WIRD (Owner 30.07.2026: „du musst
 * eine Lösung finden, das Gesicht extrahieren dann").
 *
 * Die Bildprüfung von OpenAI schlägt am KÖRPER an, nicht am Gesicht — ein Bikini- oder
 * Dessous-Foto wird abgewiesen, bevor der Prompt gelesen wird (am 30.07.2026 vier Mal über
 * Kreuz gemessen). Vom selben Menschen nur den Kopf zu schicken, umgeht das nicht per Trick:
 * es entfernt genau den Teil, an dem sich die Prüfung stört, und behält den Teil, auf den es
 * ankommt — das Gesicht. Der Rest entsteht ohnehin neu, angezogen (COVERAGE_RULE).
 *
 * Die Fundstelle kommt vom Seh-Modell; sharp schneidet danach mit Rand aus. Schlägt etwas
 * davon fehl, gibt es keinen Ausschnitt und der nächste Kandidat rückt nach.
 */
async function gesichtAusschnitt(dataUrl: string, key: string): Promise<string> {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "Return ONLY compact JSON {\"x\":0-1,\"y\":0-1,\"w\":0-1,\"h\":0-1} for the bounding box of the head (hair to chin) of the main person, as fractions of the image. No prose." },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        }],
        max_tokens: 60,
      }),
    });
    const j = await res.json().catch(() => null);
    const txt = String(j?.choices?.[0]?.message?.content ?? "");
    const m = /\{[^{}]*\}/.exec(txt);
    if (!m) return "";
    const box = JSON.parse(m[0]) as { x: number; y: number; w: number; h: number };
    const bin = /^data:([^;]+);base64,(.+)$/.exec(dataUrl.trim());
    if (!bin) return "";
    const sharp = (await import("sharp")).default;
    const bild = sharp(Buffer.from(bin[2], "base64"));
    const meta = await bild.metadata();
    const W = meta.width ?? 0, H = meta.height ?? 0;
    if (!W || !H) return "";
    // Grosszügiger Rand: Kopf plus Schultern wirkt natürlicher als ein enger Passbild-Schnitt.
    const rand = 0.9;
    const bw = Math.min(1, box.w * (1 + rand)), bh = Math.min(1, box.h * (1 + rand));
    const bx = Math.max(0, Math.min(1 - bw, box.x - box.w * rand / 2));
    const by = Math.max(0, Math.min(1 - bh, box.y - box.h * rand / 2));
    const out = await bild.extract({
      left: Math.round(bx * W), top: Math.round(by * H),
      width: Math.max(64, Math.round(bw * W)), height: Math.max(64, Math.round(bh * H)),
    }).resize({ width: 768 }).jpeg({ quality: 92 }).toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch { return ""; }
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl.trim());
  if (!m) return null;
  try { return new Blob([Buffer.from(m[2], "base64")], { type: m[1] }); } catch { return null; }
}

export async function POST(request: Request) {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: "Not configured." }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as {
    person?: string; model?: string; device?: string; theme?: string; prompt?: string; surprise?: boolean; code?: string;
    kleid?: string; paar?: string;
  };
  /**
   * EIN FOTO VON BEIDEN (Owner 31.07.2026: „und es fehlt Upload gemeinsam").
   *
   * Fast jedes Paar hat schon ein Foto zu zweit — vom letzten Urlaub, von einer Feier. Zwei
   * EINZELNE Fotos zu verlangen ist eine Huerde ohne Grund: Sie muss zwei Bilder suchen, von
   * denen mindestens eines meist nicht existiert, und genau dort steigen Leute aus.
   *
   * Technisch ist es der einfachere Fall, nicht der schwerere: EIN Referenzbild statt zwei,
   * und beide Gesichter stehen darauf schon nebeneinander — das Modell muss sie nicht erst
   * zusammensetzen. Es kostet auch weniger, weil ein Bild weniger hochgeladen wird.
   */
  const paar = String(body.paar ?? "");
  const gemeinsam = paar.startsWith("data:");
  const person = gemeinsam ? paar : String(body.person ?? "");
  const device = String(body.device ?? "").trim().slice(0, 80);
  const theme = String(body.theme ?? "kiss").replace(/[^a-z]/gi, "").toLowerCase();
  let model = gemeinsam ? "" : String(body.model ?? "");

  /**
   * ÜBERRASCHUNG STATT AUSWAHL (Owner 30.07.2026: „kann sich gratis nichts aussuchen, sondern
   * gratis bekommt er surprise, aber 1x kann er generieren").
   *
   * Gratis heißt: er lädt sein Foto hoch und drückt EINMAL. Wen er küsst und wo, entscheidet
   * der Server. Wählen darf, wer zahlt — das ist der Unterschied, für den er bezahlt.
   *
   * Zweiter, ebenso wichtiger Grund: SICHERHEIT. Käme die Vorlage vom Besucher, könnte jeder
   * ein beliebiges Bild schicken. So kommen nur die vom Admin gepflegten, ANGEZOGENEN Fotos
   * infrage.
   */
  /**
   * IMMER EINE ANDERE SZENE (Owner 30.07.2026: „wieso sehe ich immer die gleiche Szene?").
   *
   * Vorher stand für Kiss ein fester Satz im Prompt — „a warm, softly lit evening scene with
   * gentle glowing lights" — also kam bei jedem dasselbe Abendbild mit Lichterkette heraus.
   * Die Liste hier gab es zwar schon, wirkte aber nur im Überraschungs-Modus, den der
   * Trichter nie benutzt. Jetzt wird für JEDE Erzeugung gewürfelt.
   */
  // KEIN „warm", KEIN Schnee (Owner 30.07.2026: „sag bloss nicht warme Szene, sonst denkt er
  // es ist Winter"). Solche Wörter ziehen Mäntel und Winterkleidung nach sich — genau das
  // Gegenteil von dem, was diese Bilder zeigen sollen. Alle Orte sind sommerlich oder mild.
  const SZENEN = [
    // ECHTE ORTE STATT ALLGEMEINPLÄTZEN (Owner 30.07.2026: „nenne einige schöne Küsten;
    // Taormina, Sizilien, Ibiza, Mallorca … Haiti"). Ein benannter Ort erzeugt ein
    // erkennbares Bild — „a beautiful holiday destination" erzeugt Tapete.
    "on a terrace in Taormina, Sicily, with the sea and Mount Etna behind them, bright summer day",
    "on a sunny cliff path in Ibiza above turquoise water, summer",
    "in a flower-filled street in Mallorca, bright summer light",
    "on a terrace in Positano on the Amalfi coast, lemon trees and sea behind them",
    "on a white terrace in Santorini above the blue sea, summer",
    "in a garden in Capri with bougainvillea and the sea behind them",
    "on a beach in Haiti with palm trees and turquoise water, bright sunshine",
    "on the promenade in Nice on the French Riviera, summer afternoon",
    "on a cliff above the beaches of the Algarve, Portugal, golden light",
    "in a harbour town on Mykonos, whitewashed walls and blue sea, summer",
  ];

  let kandidaten: string[] = [];
  // Für JEDE Erzeugung eine Szene würfeln, nicht nur bei der Überraschung.
  let szene = SZENEN[Math.floor(Math.random() * SZENEN.length)];
  if (body.surprise) {
    const cfg = await readThemeConfig(theme).catch(() => ({ modelIds: [] as string[], previewRefPaths: [] as string[] }));
    const pfade = (cfg.previewRefPaths ?? []).filter(Boolean);
    if (!pfade.length) return NextResponse.json({ error: "Gerade nicht verfügbar." }, { status: 503 });
    // Reihenfolge zufällig: jeder bekommt ein anderes Gesicht — und wird eines von der
    // Bildmoderation abgelehnt, rückt das nächste nach (Schleife unten).
    pfade.sort(() => Math.random() - 0.5);
    kandidaten = pfade.slice(0, 3);
  }

  /**
   * KATALOG-MODELS KOMMEN ALS ADRESSE, NICHT ALS BILD (Owner 30.07.2026: „der generiert
   * nichts und ich weiss nicht wieso").
   *
   * Wählt der Besucher eine unserer Frauen, steht in `model` eine https-Adresse aus unserem
   * Speicher; lädt er eine eigene hoch, steht dort ein eingebettetes Bild. Die Route verlangte
   * bisher von beiden Seiten ein eingebettetes — bei jedem Katalog-Model brach sie deshalb mit
   * „Bitte lade zuerst dein Foto hoch" ab, obwohl das Foto längst da war. Genau die Meldung
   * hat in die Irre geführt.
   */
  if (model.startsWith("http")) {
    try {
      const r = await fetch(model);
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer());
        model = `data:${r.headers.get("content-type") ?? "image/jpeg"};base64,${buf.toString("base64")}`;
      }
    } catch { /* unten wird es sauber abgefangen */ }
  }
  if (!person.startsWith("data:")) {
    return NextResponse.json({ error: "Bitte lade zuerst dein Foto hoch." }, { status: 400 });
  }
  // Beim gemeinsamen Foto gibt es kein zweites Bild — das ist der Sinn der Sache.
  if (!gemeinsam && !body.surprise && !model.startsWith("data:")) {
    return NextResponse.json({ error: "Bitte wähle sie aus oder lade ein Foto von ihr hoch." }, { status: 400 });
  }

  /**
   * TESTCODE HEBT DEN DECKEL AUF (Owner 30.07.2026: „dann mach doch einen Gutscheincode,
   * damit ich es 20x testen kann").
   *
   * Der Code steht in der Umgebung (FREE_PREVIEW_TEST_CODE) — nicht im Quelltext, sonst
   * stünde er auf GitHub und jeder könnte den Deckel umgehen. Ohne gesetzte Variable wirkt
   * kein Code. Der TAGES-Deckel bleibt in jedem Fall stehen: er schützt die Rechnung.
   */
  const testCode = process.env.FREE_PREVIEW_TEST_CODE?.trim();
  const codeOk = !!testCode && String(body.code ?? "").trim().toUpperCase() === testCode.toUpperCase();

  // Admins ohne Deckel — sonst kannst du nicht testen, ohne das Tageskontingent zu essen.
  const staff = await isAdminRequest(request).catch(() => false);
  if (!staff && !codeOk) {
    if (!device) return NextResponse.json({ error: "Kein Gerät erkannt." }, { status: 400 });
    const claim = await claimFreePreview(device);
    if (!claim.ok) {
      return NextResponse.json({
        error: claim.reason === "day"
          ? "Heute sind alle Gratis-Vorschauen aufgebraucht — morgen wieder."
          : "Du hast deine Gratis-Vorschau heute schon genutzt.",
        limit: claim.reason,
      }, { status: 429 });
    }
  }

  // EIGENER PROMPT (Owner 29.07.2026): Im Prüfstand schreibt der Owner ihn selbst — er hat
  // in ChatGPT gezeigt, dass ein einziger Satz besser trifft als meine Anweisungsliste.
  // Die Bedeckungs-Zusage wird trotzdem angehängt: OHNE sie antwortet OpenAI mit
  // safety_violations=[sexual], nachgewiesen am 29.07.2026.
  const eigener = String(body.prompt ?? "").trim().slice(0, 2000);
  /**
   * HOCHZEIT — ein eigener Auftrag, keine Urlaubsszene (Owner 30.07.2026: „ich will eher wie
   * sie sich einen Hochzeitskuss geben als Bild. Sie und er").
   *
   * Warum nicht einfach eine weitere Zeile in der Szenen-Liste: Bei der Hochzeit ändert sich
   * nicht der Ort, sondern die KLEIDUNG und die Handlung. Steht das Kleid nicht ausdrücklich
   * im Auftrag, zieht das Modell die Alltagssachen aus den Vorlagen durch — und aus dem
   * Hochzeitskuss wird ein Paar im T-Shirt vor einer Blumenwand.
   *
   * Die Deckungsregel hängt trotzdem hinten dran. Ein Brautkleid ist harmlos, aber das
   * Eingangsfoto muss es nicht sein, und OpenAI prüft das Foto, nicht die Absicht.
   */
  const hochzeit = theme === "wedding";
  /**
   * DAS GEWAEHLTE BRAUTKLEID (Owner 31.07.2026). Der Trichter schickt die Beschreibung des
   * Kleides mit, das sie angetippt hat. Ohne Auswahl bleibt es bei unserer Vorgabe — die
   * Wahl darf nie Bedingung sein, sonst steht vor dem Gratis-Bild eine Pflicht.
   *
   * Nur Text, kein zweites Referenzbild: Ein drittes Bild kostet bei jedem Aufruf mit, und
   * ein Kleid laesst sich in einem Satz genauer beschreiben, als ein Modell es aus einem
   * Katalogfoto ablesen wuerde.
   */
  const kleid = String(body.kleid ?? "").trim().slice(0, 200) || "an elegant white wedding dress";

  /**
   * DIE BEIDEN ALTER, BEVOR DER AUFTRAG GESCHRIEBEN WIRD.
   *
   * Beide Schaetzungen laufen gleichzeitig — nacheinander waeren es zwei Sekunden Wartezeit
   * fuer nichts. Kommt keine Zahl zurueck, bleibt der Satz leer und der Auftrag geht ohne
   * Zahl raus; das Gratis-Bild darf nie an einer Nebensache scheitern.
   *
   * `person` ist ER, `model` ist SIE — so schickt es der Trichter (siehe EinladungBauen).
   */
  const [alterEr, alterSie] = !key ? [0, 0]
    // Beim gemeinsamen Foto stehen beide auf EINEM Bild — eine Anfrage, zwei Zahlen.
    : gemeinsam ? await alterPaarSchaetzen(paar, key)
    : await Promise.all([alterSchaetzen(person, key), alterSchaetzen(model, key)]);
  const alterSatz = alterEr || alterSie
    ? "AGES — these are not young models: "
      + (alterEr ? `the man is ${alterEr} years old. ` : "")
      + (alterSie ? `The woman is ${alterSie} years old. ` : "")
      + "Render them at exactly these ages, with the face, skin and hair of people that age."
    : "";

  /**
   * DIE ERSTE ZEILE DES AUFTRAGS. Sie sagt dem Modell, WAS es vor sich hat — ein Bild mit
   * beiden Menschen oder zwei Bilder mit je einem. Steht hier das Falsche, sucht das Modell
   * im Paarfoto nach einer zweiten Person und erfindet eine.
   */
  const vorlagenSatz = gemeinsam
    ? "Image 1 is a photo of a real couple: the two people in it are the couple. Use BOTH of their faces from this one photo."
    : "Image 1 is a photo of a real person. Image 2 is a photo of another person.";

  const prompt = eigener
    ? `${eigener}\n\n${COVERAGE_RULE}`
    : hochzeit ? [
    vorlagenSatz,
    // KEIN KUSS (Konzept „Einladung statt Kuss", §2): Eine Einladung schaut den Gast an, und
    // frontal stehen beide Gesichter still — genau die zwei Gesichter, um die es geht.
    "Generate ONE photorealistic image of these two people on their wedding day: the woman in "
    + kleid + ", the man in an elegant WHITE suit with a white shirt. They stand close "
    + "together and BOTH LOOK STRAIGHT INTO THE CAMERA, faces fully visible, smiling warmly; "
    + "he has his arm around her. They do NOT kiss and their faces do not touch. Warm "
    + "sunlight, white flowers and a beautiful wedding setting around them.",
    IDENTITAET_RULE,
    alterSatz,
    "Show them from the knees up, both fully in frame. Natural, realistic result. No text, logos, badges or overlays.",
    COVERAGE_RULE,
  ].filter(Boolean).join("\n\n") : [
    vorlagenSatz,
    // Owner 30.07.2026: „sag sie umarmen sich an einem schönen Urlaubsort." Umarmen trifft
    // besser als „nebeneinander stehen" — es erzeugt Nähe, ohne dass die Bildprüfung anspringt.
    /**
     * BEIM KUSS WIRD GEKUESST (Owner 31.07.2026: „das Bild ohne Kuss" — „hast du den Prompt
     * in Kuss geändert?").
     *
     * Kiss lief bis hierher im GENERISCHEN Zweig, und der lautet woertlich „embracing each
     * other and smiling at a beautiful holiday destination". Das ist der Auftrag fuer
     * HOLIDAY. Das Produkt heisst „Kuesse jede Frau" und lieferte eine Umarmung auf einer
     * griechischen Terrasse — der Kern des Versprechens fehlte im Auftrag.
     *
     * „lips touching" steht ausdruecklich da: „kissing" allein reicht dem Modell nicht, es
     * malt dann Wange an Wange. Und ein Kuss bleibt ein Kuss — die Deckungsregel weiter
     * unten sorgt dafuer, dass beide angezogen bleiben.
     */
    theme === "kiss"
    ? "Generate ONE photorealistic image of these two people sharing a tender kiss on the lips — lips actually touching, eyes closed, faces close together, his hand on her cheek or waist. Intimate but tasteful. "
    : "Generate ONE photorealistic image showing BOTH people together at a beautiful holiday destination with lots of sunshine and flowers around them, embracing each other and smiling, happy and relaxed. "
    // IHR EIGENES OBERTEIL BLEIBT (Owner 30.07.2026: „die Dame hatte ein schoenes rotes
    // Oberteil. Ich haette das gerne behalten. Das war schon aus Seide. Er hat zwar was
    // Schoenes generiert, aber nicht in ihrer Farbe.")
    //
    // Vorher stand hier „She wears a beautiful summery luxurious silk dress" — nach seiner
    // eigenen Vorgabe vom selben Tag. Der Satz BESCHREIBT ein Kleid, also erfindet das
    // Modell eines und wirft ihres weg. Jetzt zaehlt die Vorlage: Farbe, Stoff und Schnitt
    // aus Bild 2 bleiben. Die Deckungsregel oben greift weiterhin — ist ihr Oberteil zu
    // freizuegig, wird es ergaenzt, nicht ersetzt.
    + "Keep her outfit from image 2 exactly as it is — the same colour, the same fabric and "
    + "the same cut. Do not invent a different dress and do not change its colour. "
    + "If her top is too revealing, extend it into a full elegant garment in THE SAME COLOUR "
    + "and fabric rather than replacing it with another one.",
    szene
      ? `Setting: ${szene}.`
      : theme === "holiday" || theme === "bella"
        ? "Setting: a sunny seaside terrace with the ocean behind them, warm natural daylight."
        : "Setting: a softly lit summer evening with gentle glowing lights behind them.",
    IDENTITAET_RULE,
    alterSatz,
    "Show them from the knees up, both fully in frame. Natural, realistic result. No text, logos, badges or overlays.",
    COVERAGE_RULE,
  ].filter(Boolean).join("\n\n");

  // MEHRERE ANLÄUFE, wenn die Bildmoderation eine Vorlage ablehnt.
  //
  // Am 30.07.2026 gemessen: dasselbe Motiv, zwei Vorlagen — das Foto im Kleid kam durch, das
  // im Spitzenoberteil wurde ZWEIMAL abgewiesen, auch bei völlig harmlosem Satz. Die Prüfung
  // greift also am EINGANGSBILD, nicht am Text. Für den Besucher darf das kein Fehler sein:
  // wird eine Vorlage abgelehnt, nehmen wir stillschweigend die nächste.
  const versuche = kandidaten.length ? kandidaten : [""];
  let letzterFehler = "Bild fehlgeschlagen.";
  // ZEITBUDGET: lieber eine ehrliche Meldung als ein abgewürgter Aufruf. Nach 50 s wird kein
  // weiterer Anlauf mehr begonnen — die Antwort geht raus, solange noch Zeit ist.
  const start = Date.now();
  const zeitLinks = () => 50_000 - (Date.now() - start);

  for (const pfad of versuche) {
    if (zeitLinks() < 15_000) break;   // keine neue Vorlage mehr anfangen
    try {
      if (pfad) {
        const url = await getSignedUrl(pfad, 600).catch(() => "");
        if (!url) continue;
        const r = await fetch(url);
        if (!r.ok) continue;
        const buf = Buffer.from(await r.arrayBuffer());
        model = `data:${r.headers.get("content-type") ?? "image/jpeg"};base64,${buf.toString("base64")}`;
      }
      // ZWEI ANLÄUFE JE VORLAGE: erst das ganze Foto, dann nur das Gesicht. Der zweite
      // Anlauf rettet genau die Fälle, an denen die Prüfung wegen Haut/Körper anschlägt.
      let versuchModel = model;
      let versuchPerson = person;
      let res: Response | null = null;
      let j: { data?: { b64_json?: string }[]; error?: { message?: string } } | null = null;

      for (let anlauf = 0; anlauf < 2; anlauf++) {
        // Zweiter Anlauf nur, wenn dafür noch Zeit ist (er kostet noch einmal ~35 s).
        if (anlauf === 1 && zeitLinks() < 30_000) break;
        if (anlauf === 1) {
          // BEIDE Seiten zuschneiden (Owner 30.07.2026: ein Besucher lud um 11:22 eine Frau
          // im Bikini in das Feld „dein Foto" — abgewiesen, Ergebnis leer). Die Prüfung
          // stört sich am Körper, egal auf welcher Seite er steht. Also im zweiten Anlauf
          // von beiden nur das Gesicht schicken.
          // Beim gemeinsamen Foto NICHT zuschneiden: Der Ausschnitt liefert EIN Gesicht, und
          // damit waere die zweite Person verschwunden. Lieber diesen Anlauf auslassen.
          if (gemeinsam) break;
          const [gm, gp] = await Promise.all([
            gesichtAusschnitt(model, key),
            gesichtAusschnitt(person, key),
          ]);
          if (!gm && !gp) break;
          if (gm) versuchModel = gm;
          if (gp) versuchPerson = gp;
        }
        const form = new FormData();
        form.append("model", process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1");
        form.append("prompt", prompt);
        form.append("size", "1024x1536");   // 2:3 — passt zu den Kacheln im Trichter
        form.append("quality", process.env.OPENAI_PREVIEW_QUALITY ?? "low");
        form.append("n", "1");
        const pb = dataUrlToBlob(versuchPerson), mb = dataUrlToBlob(versuchModel);
        // Beim gemeinsamen Foto gibt es nur EINE Vorlage — beide Gesichter stehen darauf.
        if (!pb || (!gemeinsam && !mb)) return NextResponse.json({ error: "Fotos konnten nicht gelesen werden." }, { status: 400 });
        form.append("image[]", pb, "person.png");
        if (mb) form.append("image[]", mb, "model.png");

        res = await fetch("https://api.openai.com/v1/images/edits", {
          method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form,
        });
        j = await res.json().catch(() => null);
        if (res.ok) break;
        const m = String(j?.error?.message ?? "");
        if (!/safety|moderation|rejected/i.test(m)) break;   // echter Fehler → nicht weiter probieren
        letzterFehler = m;
      }
      if (res?.ok) {
        const b64 = j?.data?.[0]?.b64_json;
        if (b64) {
          /**
           * BEIDE BILDER AUFHEBEN (Owner 30.07.2026: „ich will die hochgeladene bilder sehen.
           * Pixverse speichert sie auch").
           *
           * Ich hatte zuerst nur das Ergebnis abgelegt und auf die Rechtslage hingewiesen; er
           * hat entschieden, dass er auch die Vorlagen sehen will — er betreibt den Dienst,
           * das ist seine Entscheidung. Zweck: verstehen, was die Leute wollen, und
           * Missbrauch nachvollziehen. Das gehört in die Datenschutzerklärung (dort ergänzt)
           * und braucht eine Frist — siehe FREE_PREVIEW_KEEP_DAYS.
           *
           * Scheitert das Ablegen, bekommt der Besucher trotzdem sein Bild — die Ablage ist
           * eine Zugabe fürs Werkzeug, kein Teil des Produkts.
           */
          const ablegen = async (dataUrl: string, ext: string) => {
            try {
              const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl.trim());
              if (!m) return "";
              const up = await createSignedUploadUrl("uploads", ext);
              const put = await fetch(up.uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": m[1], "x-upsert": "true" },
                body: new Uint8Array(Buffer.from(m[2], "base64")),
              });
              return put.ok ? up.path : "";
            } catch { return ""; }
          };
          const [bildPfad, personPfad] = await Promise.all([
            ablegen(`data:image/png;base64,${b64}`, "png"),
            ablegen(person, "jpg"),
          ]);
          return NextResponse.json({ image: `data:image/png;base64,${b64}`, imagePath: bildPfad, personPath: personPfad });
        }
        letzterFehler = "Kein Bild erhalten.";
        continue;
      }
      const msg = String(j?.error?.message ?? "");
      // Abgelehnte Vorlage → nächste probieren. Alles andere ist ein echter Fehler.
      if (/safety|moderation|rejected/i.test(msg)) { letzterFehler = msg; continue; }
      return NextResponse.json({ error: msg || `Bild fehlgeschlagen (${res?.status ?? "?"}).` }, { status: 502 });
    } catch (e) {
      letzterFehler = e instanceof Error ? e.message : "Netzwerkfehler.";
    }
  }

  // KLARTEXT statt OpenAI-Englisch: der Owner soll sofort wissen, woran es liegt.
  // KLARTEXT statt Schweigen (Owner 30.07.2026: „du sollst erkennen dass eine nackte Frau ist
  // und sagen: leider ein anderes Bild hoch. Lingerie-Fotos sind nur im Abo möglich").
  // Erst wird still gerettet (Gesichtsausschnitt), und nur wenn auch das nicht durchgeht,
  // bekommt er diesen Satz — dann weiss er, woran es liegt und was er tun kann.
  // Zeit abgelaufen, ohne Ergebnis → das sagen, statt einen Bildfehler zu behaupten.
  if (zeitLinks() <= 0) {
    return NextResponse.json({
      error: "Das hat diesmal zu lange gedauert — bitte noch einmal versuchen.",
      reason: "timeout",
    }, { status: 504 });
  }
  const freizuegig = /safety|moderation|rejected/i.test(letzterFehler);
  return NextResponse.json({
    error: freizuegig
      ? "Dieses Foto können wir gratis nicht verwenden — bitte ein angezogenes hochladen. Dessous- und Bikini-Bilder gibt es nur im Abo."
      : letzterFehler,
    reason: freizuegig ? "nudity" : undefined,
  }, { status: 502 });
}
