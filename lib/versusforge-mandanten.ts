import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";
import { EIGENER_MANDANT, GESPERRTE_NAMEN, mandantSauber } from "@/lib/versusforge-lead";

/**
 * WER EINEN EIGENEN TRICHTER HAT (Owner 09.09.2026: „er bekommt einen Funnel, eine URL, die
 * er in Insta oder FB eingeben kann: VersusForge/ZahnarztPeter. Und das Dashboard dazu." ·
 * „am Ende müssen seine Daten stehen statt meine").
 *
 * DAS IST DAS PRODUKT FÜR 299 €. Alles darin entsteht aus dem Plan, den die Maschine für ihn
 * schon erzeugt hat — der Hook ist sein Hook, die Karten sind seine Fälle. Was hier steht,
 * wird also nicht getippt, sondern übernommen.
 *
 * EINE DATEI JE MANDANT, wie alles im Haus (`versusforge-lead/`, `david-limit/`). Keine
 * Sammelliste: Zwei Anlagen in derselben Sekunde würden einander überschreiben — die erste
 * der „drei Fallen beim Speichern".
 *
 * WEISS-LISTE, KEINE FREIE EINGABE: Der Name steht in einem Pfad UND in einer öffentlichen
 * Adresse. `mandantSauber()` lässt nur Kleinbuchstaben, Ziffern und Bindestriche durch.
 *
 * WAS HIER BEWUSST NICHT LIEGT: der Dashboard-Schlüssel im Klartext neben den Inhalten, die
 * jeder Besucher sieht. Er hat ein eigenes Feld und wird nie an den Browser gegeben — die
 * öffentliche Seite holt sich `oeffentlich()`, das Dashboard `mandantLesen()`.
 */

export type MandantAngaben = {
  /** Der Name, der oben auf der Seite steht. Seiner, nicht unserer. */
  name: string;
  /** Ort oder Zusatz für den Fuss — „Musterstadt", „Praxis am Markt". */
  ort: string;
  /**
   * ADRESSE UND TELEFON IM KOPF (Owner 09.09.2026: „im Header muss noch stehen die Adresse,
   * Telefonnummer als Platzhalter" · „kauft er das Ganze, dann wird es da stehen").
   *
   * SOLANGE SIE LEER SIND, steht ein grauer Platzhalter da — kein leerer Fleck. Er soll
   * sehen, WO seine Angaben landen werden; ein Loch an der Stelle sieht aus wie ein Fehler,
   * ein Platzhalter sieht aus wie ein Formular, das noch auf ihn wartet.
   *
   * NICHTS ERFUNDEN: Der Platzhalter ist als solcher erkennbar und wird nie ausgeliefert,
   * sobald echte Angaben da sind.
   */
  adresse: string;
  telefon: string;
  /**
   * SEINE EIGENE WEBSITE (Owner 09.09.2026: „eventuell auch Link zu seiner Homepage").
   *
   * „EVENTUELL" IST HIER RICHTIG, deshalb ist das Feld optional und der Link erscheint nur,
   * wenn er ihn hinterlegt: Ein Weg von diesem Trichter WEG ist ein Ausgang vor dem Ziel.
   * Für den, der prüfen will, ob es die Praxis wirklich gibt, ist er dagegen genau das, was
   * Vertrauen schafft — und diese Frage stellt sich jemand, der gleich seine Nummer
   * hinterlassen soll.
   *
   * Er steht deshalb im KOPF bei den Kontaktangaben, nicht als Knopf neben dem Trichter.
   */
  webUrl: string;
  /** Die Überschrift: sein Hook aus dem Plan. */
  hook: string;
  /** Ein Satz darunter, an SEINEN Kunden gerichtet — was er bekommt. */
  unterzeile: string;
  /** Die Karten zum Antippen statt eines leeren Feldes. 3 bis 4. */
  karten: string[];
  /** Was auf dem Knopf steht — „Beratungscheck starten". */
  knopf: string;
  /** Kleingedrucktes unter dem Knopf — „Kostenlos · ohne Termin". */
  fein: string;
  /**
   * WAS SEIN KUNDE AM ENDE BEKOMMT (Owner 09.09.2026: „die Kunden vom Zahnarzt bekommen
   * auch etwas am Ende, muss drunter stehen. Sie bekommen ein Angebot.").
   *
   * DASSELBE PRINZIP WIE AUF UNSERER SEITE, eine Ebene tiefer: Über dem Knopf steht die
   * Arbeit („vier Fragen"), darunter der Lohn. Ohne diesen Block beantwortet jemand vier
   * Fragen, ohne zu wissen, wofür — und bricht bei der dritten ab.
   *
   * JE GEWERBE ETWAS ANDERES: der Zahnarzt gibt ein Angebot, der Pflegedienst ein
   * Gespräch, der Makler eine Bewertung. Deshalb steht es beim Mandanten und nicht im Code.
   */
  ergebnisTitel: string;
  ergebnisText: string;
  /**
   * SEINE PFLICHTANGABEN (09.09.2026).
   *
   * Die White-Label-Regel der Academy war „Fuss komplett raus". Das geht bei einer Seite, die
   * nichts erhebt. Diese sammelt Namen, Telefonnummern und je nach Fach auch Angaben zur
   * Gesundheit — verantwortlich ist der Mandant, also stehen SEINE Angaben da. Der Fuss
   * verschwindet nicht, er wechselt den Besitzer.
   */
  aboutUrl: string;
  impressumUrl: string;
  datenschutzUrl: string;
  /** Seine Akzentfarbe als Hex. Leer = das ruhige Haus-Blau. NIE unser Gold. */
  farbe: string;
  /** Sein Logo (öffentliche Adresse). Leer = nur der Name als Schrift. */
  logoUrl: string;
  /**
   * SEIN PLAN als Zusammenhang für den Agenten. Damit fragt der Trichter SEINE Kunden
   * („fehlt Ihnen ein Zahn?") statt Unternehmer („was willst du erreichen?"). Ohne dieses
   * Feld wäre die Mandantenseite nur ein anderes Logo auf demselben Gespräch.
   */
  plan: unknown;
  /**
   * SEINE ADRESSE — an sie geht „du hast eine Anfrage" (Owner 09.09.2026).
   *
   * Sie kommt aus dem Haupttrichter, in dem er sie ohnehin hinterlassen hat. Sie steht hier,
   * damit die Benachrichtigung nicht erst durch die Anfragen suchen muss, wem der Trichter
   * gehört — und sie verlässt den Server nie, genau wie der Schlüssel.
   */
  mail: string;
  /** Der Schlüssel fürs Dashboard. Verlässt den Server nie. */
  schluessel: string;
  /**
   * DER LÖSCHSCHLÜSSEL (Owner 09.09.2026: „fürs Löschen muss er einen Link bekommen").
   *
   * EIN EIGENER, NICHT DER DASHBOARD-SCHLÜSSEL. Löschen können muss er von Anfang an — auch
   * bevor er zahlt, und gerade dann. Hinge es am Dashboard-Schlüssel, wäre „ich will das
   * wieder weghaben" eine kostenpflichtige Handlung. Das wäre nicht nur unanständig, es wäre
   * bei personenbezogenen Daten auch nicht haltbar.
   *
   * ER GEHT MIT DER ERSTEN MAIL HINAUS und steht sonst nirgends — kein Konto, kein Passwort:
   * dieselbe Bauart wie das Dashboard, dieselbe offene Aussage dazu. Wer den Link hat, kann
   * löschen.
   */
  loeschSchluessel: string;
  /**
   * VORSCHAU ODER SCHARF (Owner 09.09.2026: „wenn ich den Tunnel durchgehe, als Zahnarzt,
   * dann bekomme ich den Link dazu zu dem Funnel").
   *
   * DIE ENTSCHEIDUNG DAHINTER: Der Link entsteht SOFORT und die Seite ist offen — sonst
   * wäre er ein Versprechen statt eines Beweises, und genau der Beweis ist das Produkt.
   * Was in der Vorschau NICHT läuft, ist der letzte Schritt: keine Namen, keine
   * Telefonnummern. Er sieht exakt, was sein Patient sieht; nur hinterlässt niemand Daten,
   * die nirgends ankommen. Das wäre der eine unehrliche Weg gewesen.
   *
   * Die 299 machen ihn scharf: eigener Name in der Adresse, seine Pflichtangaben, das
   * Dashboard, und die Anfragen laufen.
   */
  /**
   * WEITERE HOOKS, die er selbst geschrieben hat (Owner 09.09.2026: „dort sehe ich meine
   * Bilder, dort kann ich weitere generieren").
   *
   * NUR DER SATZ WIRD GESPEICHERT, nicht das Bild: Das Bild entsteht in einer Zehntelsekunde
   * aus dem Satz (`hookBild`, reine Schrift auf Fläche) — es abzulegen hiesse, dieselbe
   * Sache zweimal zu haben und beim nächsten Gestaltungswechsel alte Bilder im Fach zu
   * finden. Der Satz ist die Quelle, das Bild die Ausgabe.
   *
   * Optional, damit bestehende Mandanten-Dateien ohne dieses Feld weiter gelesen werden.
   */
  hooks?: string[];
  stand: "vorschau" | "scharf";
  angelegt: string;
};

/** Was die öffentliche Seite sehen darf — alles ausser Schlüssel und Plan. */
export type MandantOeffentlich = Omit<MandantAngaben, "schluessel" | "loeschSchluessel" | "plan" | "mail">;

const pfad = (mandant: string) => `versusforge-mandant/${mandantSauber(mandant)}.json`;

/** Das ruhige Blau, wenn der Mandant keine eigene Farbe angegeben hat. */
export const AKZENT_STANDARD = "#1d6fd0";

export async function mandantLesen(mandantRoh: string): Promise<MandantAngaben | null> {
  const mandant = mandantSauber(mandantRoh);
  /* Der eigene Mandant hat keine Datei — wir sind die Wurzel, nicht ein Eintrag. */
  /**
   * VERSUSFORGE IST MANDANT NUMMER EINS (Owner 09.09.2026: „wo ist mein Dashboard?" · „der
   * müsste doch genauso aussehen") — [[mein-trichter-ist-ihr-trichter]].
   *
   * HIER STAND `mandant === EIGENER_MANDANT → null` mit der Begründung „wir sind die Wurzel,
   * nicht ein Eintrag". Das war der Satz, der ihm sein eigenes Dashboard verwehrt hat: Ohne
   * Datei kein Mandant, ohne Mandant kein Schlüssel, ohne Schlüssel keine Seite. Und ein
   * zweites, eigenes Dashboard danebenzubauen wäre genau das, was die Hausregel verbietet.
   *
   * DIE ANDEREN GESPERRTEN NAMEN BLEIBEN GESPERRT: `engine`, `about`, `themes` tragen echte
   * Seiten, dort kann es keinen Mandanten geben.
   */
  if (!mandant || (GESPERRTE_NAMEN.has(mandant) && mandant !== EIGENER_MANDANT)) return null;
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(mandant))}`);
  if (!res.ok) return null;
  try {
    return (await res.json()) as MandantAngaben;
  } catch {
    return null;
  }
}

/**
 * Für die öffentliche Seite. Schlüssel und Plan bleiben auf dem Server — sonst stünde der
 * Dashboard-Schlüssel im Quelltext jeder Trichterseite.
 */
export async function mandantOeffentlich(mandantRoh: string): Promise<MandantOeffentlich | null> {
  const m = await mandantLesen(mandantRoh);
  if (!m) return null;
  const { schluessel: _s, loeschSchluessel: _l, plan: _p, mail: _m, ...rest } = m;
  return rest;
}

export async function mandantSpeichern(mandantRoh: string, angaben: MandantAngaben): Promise<boolean> {
  const mandant = mandantSauber(mandantRoh);
  if (!mandant || (GESPERRTE_NAMEN.has(mandant) && mandant !== EIGENER_MANDANT)) return false;
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(mandant))}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify(angaben),
  });
  if (!res.ok) console.error("[versusforge] Mandant NICHT gespeichert:", res.status, await res.text().catch(() => ""));
  return res.ok;
}


/**
 * EIN FREIER NAME FÜR DIE ADRESSE.
 *
 * Erst der Wunschname, dann derselbe mit Zahl. Geprüft wird gegen die Ablage, nicht gegen
 * eine Liste im Kopf: Bei zwei Zahnärzten Peter, die am selben Tag durch den Trichter gehen,
 * würde eine Liste im Speicher die zweite Datei über die erste legen.
 */
export async function freierName(wunsch: string): Promise<string> {
  const basis = mandantSauber(wunsch) || "trichter";
  for (let i = 0; i < 40; i++) {
    const kandidat = i === 0 ? basis : `${basis}-${i + 1}`;
    /* Gesperrte Namen überspringen — sie tragen schon eine echte Seite (siehe
       `GESPERRTE_NAMEN`); der Mandant bekäme sonst eine Adresse, die nie ihn zeigt. */
    if (GESPERRTE_NAMEN.has(kandidat)) continue;
    if (!(await mandantLesen(kandidat))) return kandidat;
  }
  /* Nach vierzig Versuchen nicht endlos weiter — ein Zufallsschwanz beendet es sicher. */
  return `${basis}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * DIE ANGABEN AUS DEM PLAN ABLEITEN — nicht abtippen.
 *
 * Alles, was auf seiner Seite steht, hat die Maschine schon erzeugt: der Hook ist sein Hook,
 * die Karten sind die Fälle aus seiner Zielgruppe. Was der Plan NICHT hergibt (Impressum,
 * Logo, Farbe), bleibt leer und wird beim Freischalten von ihm ergänzt — nichts wird
 * erfunden.
 */
export function mandantAusPlan(o: {
  name: string;
  mail: string;
  /** Seine Website — seit dem 09.09.2026 fragt der Trichter im zweiten Schritt danach. */
  webUrl?: string;
  plan: { hook?: string; zielgruppe?: string[]; trichter?: string[] } & Record<string, unknown>;
  schluessel: string;
  loeschSchluessel: string;
}): MandantAngaben {
  const plan = o.plan ?? {};
  const hook = String(plan.hook ?? "").trim();
  /* Die Karten aus der Zielgruppe: kurze, antippbare Sätze. Was zu lang ist, taugt nicht
     als Karte — lieber drei kurze als vier, von denen eine umbricht. */
  const karten = (Array.isArray(plan.zielgruppe) ? plan.zielgruppe : [])
    .map(z => String(z ?? "").trim())
    .filter(z => z && z.length <= 60)
    .slice(0, 4);

  return {
    name: o.name,
    ort: "",
    adresse: "",
    telefon: "",
    /* SEINE WEBSITE STEHT SCHON DA (09.09.2026): Er hat sie im zweiten Schritt des
       Trichters genannt. Sie hier zu verwerfen und ihn im Einrichten noch einmal danach zu
       fragen wäre dieselbe Zumutung wie der doppelte Hook. Adresse und Telefonnummer
       bleiben leer — die kennt der Plan nicht, und geraten wird nichts. */
    webUrl: o.webUrl ?? "",
    hook: hook || "Sagen Sie uns, worum es geht.",
    unterzeile: "Beantworten Sie ein paar kurze Fragen. Danach wissen Sie, welche Möglichkeiten es in Ihrem Fall gibt.",
    karten: karten.length ? karten : ["Ich möchte mehr wissen"],
    knopf: "Jetzt starten",
    fein: "Kostenlos · dauert etwa zwei Minuten",
    ergebnisTitel: "",
    ergebnisText: "",
    aboutUrl: "",
    impressumUrl: "",
    datenschutzUrl: "",
    farbe: "",
    logoUrl: "",
    plan: o.plan,
    mail: o.mail,
    schluessel: o.schluessel,
    loeschSchluessel: o.loeschSchluessel,
    stand: "vorschau",
    angelegt: new Date().toISOString(),
  };
}


/**
 * ALLES VON IHM LÖSCHEN — der Trichter UND die Anfragen darin.
 *
 * BEIDES ODER NICHTS, und in dieser Reihenfolge: Erst die Anfragen (das sind die Daten
 * anderer Menschen, sie wiegen schwerer), dann sein eigener Eintrag. Bliebe der Eintrag
 * stehen, sammelte der Trichter weiter; blieben die Anfragen stehen, lägen fremde
 * Telefonnummern in einem Fach, das niemandem mehr gehört.
 *
 * `false` heisst „nicht vollständig gelöscht" — dann wird dem Menschen NICHT gesagt, es sei
 * erledigt. Ein falsches Häkchen ist hier schlimmer als eine ehrliche Fehlermeldung.
 */
export async function mandantLoeschen(mandantRoh: string): Promise<boolean> {
  const mandant = mandantSauber(mandantRoh);
  if (!mandant || (GESPERRTE_NAMEN.has(mandant) && mandant !== EIGENER_MANDANT)) return false;

  const liste = await supabaseFetch(`/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: `versusforge-lead/${mandant}/`, limit: 1000 }),
  });
  const dateien = liste.ok ? ((await liste.json().catch(() => [])) as { name?: string }[]) : [];
  const pfade = (Array.isArray(dateien) ? dateien : [])
    .map(d => `versusforge-lead/${mandant}/${String(d?.name ?? "")}`)
    .filter(p => p.endsWith(".json"));
  pfade.push(pfad(mandant));

  const weg = await supabaseFetch(`/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: pfade }),
  });
  if (!weg.ok) console.error("[versusforge] Löschen fehlgeschlagen:", weg.status, await weg.text().catch(() => ""));
  return weg.ok;
}
