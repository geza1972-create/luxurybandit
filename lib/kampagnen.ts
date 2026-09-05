import type { ArmeeTexte, DemoSzene } from "@/lib/demo-armee";
import type { Lang } from "@/lib/lang";
import { ACADEMY_DOMAIN } from "@/lib/armee-musik";
import { sendEmail } from "@/lib/email-send";

/**
 * DIE KAMPAGNEN-MASCHINE (Owner 03.09.2026: „du bauest es so, dass man das beliebig
 * duplizieren kann. Du nimmst dir jetzt die Zeit.").
 *
 * WAS HIER STEHT, UND WARUM NICHT NOCH EINMAL VON HAND: Die erste Fassung dieser Kampagne
 * (LOTTO Hamburg) stand als einzelne, von Hand geschriebene HTML-Datei ausserhalb des
 * Projekts — jeder Schritt der Academy neu nachgezeichnet statt wiederverwendet. Genau
 * daran sind Fehler durchgerutscht, die es in der echten Academy längst nicht mehr gibt
 * (die Zielkachel ohne Foto, Musik, die nicht stoppt). Diese Datei ist die Antwort: eine
 * KONFIGURATION, keine Kopie. Die Bausteine, die den Trichter tatsächlich bauen —
 * `ArmeeFunnel`, `SelbstAufnahme`, `CI.tsx`, `EinladungAnsicht` — bleiben dieselben, die
 * die Academy seit Wochen im echten Betrieb geprüft hat.
 *
 * EINE NEUE KAMPAGNE BRAUCHT DANACH: einen Eintrag hier (Texte, Szenen, Prompts) und drei
 * kurze Seiten nach dem Muster von `app/academy/` (Landing, Start, geteiltes Video) — keinen
 * neuen Trichter, keine neue Erzeugungslogik. Die Erzeugung selbst läuft über EINE Route,
 * `app/api/kampagne/[slug]/video/route.ts`, die jede künftige Kampagne über ihren Schlüssel
 * hier findet — auch DAFÜR ist kein neuer Code nötig.
 */

/** Ein Auftritt wie Armee/DemoSzene: Kachel-Bild plus ein fertiges Beispielvideo. */
export type KampagnenSzene = DemoSzene;
/** Dieselben ~130 Wörter, die `ArmeeFunnel` und die Landingpage brauchen — siehe
    `lib/demo-armee.ts`, `ArmeeTexte`. Eine eigene Kampagne füllt sie neu, die Bausteine
    bleiben dieselben. */
export type KampagnenTexte = ArmeeTexte;

export type KampagnenKonfig = {
  /** Der Schlüssel — Adressteil (`/lotto-hh`), Thema in den Käufen, Name der Erzeugungsroute. */
  slug: string;
  /** Die Marke im Kopf der Seite (White Label, siehe `LandingSeite`). */
  marke: string;
  /** Absolute Adresse für Teilen-Links und `openGraph`-Bilder — wie `ACADEMY_DOMAIN`. Ohne
      eigene Domain zeigt sie auf die Haus-Domain, auf der die Seite dann läuft. */
  domain: string;
  szenen: KampagnenSzene[];
  texte: KampagnenTexte;
  /** Ein Bild- und ein Video-Prompt je Szenen-Kennung — wie `SZENEN_PROMPTS` in
      `lib/demo-armee.ts`. */
  prompts: Record<string, { bild: string; video: string }>;
  /** Das eine Video der Landingpage-Karte, wie `ARMEE_SPOT`/`ARMEE_SPOT_POSTER`. */
  spot: { video: string; poster: string };
  /** Eingeschränkte Sprachliste, wie `ARMEE_SPRACHEN` — leer heisst: alle Haus-Sprachen. */
  sprachen: Lang[];
  /** Läufe je Gerät und je Tag — dieselben Vorgaben wie Armee, keine neue Umgebungsvariable
      je Kampagne nötig (siehe `KAMPAGNEN_LIMIT_*` unten für einen Vorgabe-Riegel über alle). */
  limitGeraet?: number;
  limitTag?: number;
  /**
   * DER RECHTLICHE FUSS — NICHT TEIL VON `texte` (Owner-Vorgabe für Lotto Hamburg: Teilnahme
   * ab 18, Suchthilfe). `ArmeeTexte` ist ein fester Wortschatz mit ~130 Stellen, an denen die
   * Academy selbst ihn braucht; ein Glücksspielhinweis gehört zu keiner davon. Er lebt lieber
   * hier, als `ArmeeTexte` um eine militärfremde Zeile zu erweitern, die andere Kampagnen
   * nie brauchen.
   */
  legal?: { hinweis: string; hilfe: string };
};

/* ══ Lotto Hamburg — „Hamburg im Glück" ══════════════════════════════════════════════ */

const IDENT =
  "Keep the exact face, hair and identity of the person in the reference photo — the same " +
  "person, unmistakably recognisable. Their entire face is clearly visible, well lit and in " +
  "sharp focus. No text anywhere, no logos, no brand names, no badges. Photorealistic, " +
  "cinematic, vertical portrait, present day. Leave clear headroom above the head — the top " +
  "of the head must sit well below the top edge of the frame.";

const LOTTO_HH_SZENEN_PROMPTS: Record<string, { bild: string; video: string }> = {
  ferrari: {
    bild: `${IDENT}
They stand confidently in front of a red luxury sports car on the Hamburg Landungsbrücken waterfront, wearing a tailored bright yellow suit over a white shirt. They hold up a fan of euro banknotes toward the camera and laugh. Behind them the river Elbe, the Elbphilharmonie concert hall and the harbour cranes. Colourful confetti falls through the air. Warm golden hour light, shallow depth of field, editorial advertising photography.`,
    video: "The person laughs and holds the fan of banknotes toward the camera, confetti keeps falling around them, a gentle breeze moves their jacket, ships pass on the river behind, slow cinematic push-in. Upbeat celebratory score.",
  },
  yacht: {
    bild: `${IDENT}
They are relaxing on the sun deck of a white luxury motor yacht, wearing an open white linen shirt and sunglasses pushed up into their hair, holding a champagne glass and smiling broadly at the camera. Turquoise Mediterranean sea, a rocky coastline and blue sky behind them. Bright midday sun, glossy deck, travel lifestyle advertising photography.`,
    video: "The person raises the champagne glass toward the camera and laughs, the yacht rocks gently, sunlight sparkles on the water, their shirt moves in the wind, slow orbit around them. Warm summery cinematic score.",
  },
  haus: {
    bild: `${IDENT}
They stand smiling in the driveway of a large white villa with a thatched roof in Blankenese, Hamburg, holding up a house key toward the camera. A partner and two children stand beside them, moving boxes on the driveway, the river Elbe visible in the background. Warm late summer afternoon light, family lifestyle advertising photography.`,
    video: "The person holds the key up to the camera and grins, the children run toward the front door, the partner hugs them from the side, leaves move in the wind, slow cinematic push-in. Warm uplifting orchestral score.",
  },
};

/* KEINE EIGENE „ANZEIGEN"-FASSUNG (siehe `DemoSzene.anzeigenBild`/`anzeigenVideo` in
   demo-armee.ts) — diese Kampagne hat keinen eingebrannten Dankestext bekommen, beide Felder
   fallen deshalb auf dasselbe Bild/Video zurück wie `bild`/`video`. */
const LOTTO_HH_SZENEN: KampagnenSzene[] = [
  { id: "ferrari", name: "Der Ferrari", bild: "/Lotto-HH/Ferrari-web.jpg", anzeigenBild: "/Lotto-HH/Ferrari-web.jpg", video: "/Lotto-HH/Ferrari-web.mp4", anzeigenVideo: "/Lotto-HH/Ferrari-web.mp4" },
  { id: "yacht", name: "Die Yacht", bild: "/Lotto-HH/Yacht-web.jpg", anzeigenBild: "/Lotto-HH/Yacht-web.jpg", video: "/Lotto-HH/Yacht-web.mp4", anzeigenVideo: "/Lotto-HH/Yacht-web.mp4" },
  { id: "haus", name: "Das Haus", bild: "/Lotto-HH/Haus-web.jpg", anzeigenBild: "/Lotto-HH/Haus-web.jpg", video: "/Lotto-HH/Haus-web.mp4", anzeigenVideo: "/Lotto-HH/Haus-web.mp4" },
];

const LOTTO_HH_DE = {
  kicker: "Dein Glück",
  claimEins: "Was würdest du mit 500.000 € machen?",
  claimZwei: "Finde es heraus.",
  claimDrei: "Sieh dich selbst im Glück.",

  schrittEinsEins: "Wähl", schrittEinsZwei: "dein Glück.",
  schrittZweiEins: "Jetzt", schrittZweiZwei: "dein Gesicht.",
  schrittDreiEins: "Wohin schicken wir", schrittDreiZwei: "dein Video?",
  schrittVierEins: "Wir bauen", schrittVierZwei: "dein Glück.",
  mailTitel: "Deine E-Mail-Adresse",
  mailZeile: "Dorthin schicken wir dein Video — und die Informationen zur Ziehung.",
  mailStart: "Mein Video generieren",
  genFehlerTitel: "Das hat nicht geklappt",
  genNochmal: "Noch einmal versuchen",
  genPhaseEins: "Wir setzen dich in",
  genPhaseZwei: "Jetzt kommt Bewegung hinein",
  genDauerEcht: "Das dauert zwei bis drei Minuten. Bleib auf der Seite — dein Video entsteht gerade wirklich.",

  wahlLabel: "Wähl dein Glück:",
  weiter: "Weiter",
  zurueck: "Zurück",
  keineSzenen: "Noch keine Vorlagen.",

  fotoKachel: "Selfie aufnehmen",
  fotoHinweis: "Frontal, gutes Licht, kein Hut.",
  fotoWaehlen: "oder ein vorhandenes Foto wählen",
  ausloesen: "Auslösen",
  kameraNochmal: "Noch einmal",
  uebernehmen: "Übernehmen",
  naeher: "Näher heranholen",
  abbrechen: "Abbrechen",
  kameraFehler: "Wir konnten die Kamera nicht öffnen. Nimm ein vorhandenes Foto:",
  linksLabel: "Dein Bild",
  einsatzAendern: "Anderes Glück wählen",
  zielLabel: "Dein Glück",
  vornameFeld: "Dein Vorname",
  vornameHinweis: "Damit wir dich im Video ansprechen können.",
  generieren: "Jetzt generieren",
  cropTitel: "Dein Foto",
  einwilligungEins: "Dein Foto wird für die Erstellung deines Videos verarbeitet und danach nur für dein Video aufbewahrt.",
  einwilligungZwei: "Nur Bilder von dir selbst dürfen hochgeladen werden. Teilnahme ab 18 Jahren.",

  laeuftKicker: "Einen Moment",
  laeuftTitelEins: "Dein Video",
  laeuftTitelZwei: "entsteht",
  laeuftText: "Wir setzen dich in",
  laeuftDauer: "Das dauert etwa eine halbe Minute. Bleib auf der Seite.",

  fertigKicker: "Fertig",
  fertigTitelEins: "Das bist",
  fertigTitelZwei: "du",
  abspannEins: "{name} im Glück!",
  abspannZwei: "500.000 € · LOTTO Hamburg",

  frageTitel: "Willst du dabei sein?",
  frageZeile: "Trag dich hier ein — wir schicken dir dein Video und die Informationen zur Ziehung.",
  feldName: "Dein Nachname",
  feldGeburt: "Geburtsdatum",
  feldMail: "name@beispiel.de",
  haken: "Ich möchte Informationen per E-Mail bekommen und akzeptiere die",
  hakenAgb: "AGB",
  hakenEnde: ".",
  absenden: "Ich will weitere Informationen",
  sendet: "Einen Moment…",
  datenschutz: "Dein Foto und dein Video liegen auf einem Server in Deutschland. Deine Adresse geht an niemanden weiter, und du kannst dich jederzeit abmelden. Teilnahme ab 18 Jahren, Glücksspiel kann süchtig machen — Hilfe unter bzga.de oder 0800 137 27 00.",
  fehlerName: "Bitte trag deinen Namen ein.",
  fehlerGeburt: "Bitte trag dein Geburtsdatum ein.",
  fehlerMail: "Diese Adresse sieht noch nicht vollständig aus.",
  fehlerHaken: "Ohne diese Zustimmung können wir dir nichts schicken.",

  dankeKicker: "Danke",
  dankeTitelEins: "Wir haben dir",
  dankeTitelZwei: "geschrieben",
  dankeText: "Schau in dein Postfach — dort liegen dein Video und die Informationen zur Ziehung. Wenn nichts ankommt, sieh bitte auch im Spam-Ordner nach.",
  nochmal: "Noch ein Glück ansehen",

  lpKartenTitel: "Ihre Anzeige",
  lpCta: "Mein Video generieren",
  lpTrust: "Dauert eine Minute · ab 18 Jahren · Hilfe: bzga.de",
  lpSub: "Das ist Ihre Anzeige — fürs Internet und für Aussenwerbung. Probieren Sie sie aus: Der Knopf führt genau dorthin, wo Ihr Spieler landen würde.",
  lpWieTitel: "So läuft es für Ihre Spieler",
  lpWieEins: "Wähl dein Glück",
  lpWieEinsText: "Ferrari, Yacht oder das eigene Haus — drei Träume, drei Szenen. Welche es sind, bestimmen Sie.",
  lpWieZwei: "Mach ein Selfie",
  lpWieZweiText: "Frontal, gutes Licht. Die Kamera öffnet sich auf der Seite — nichts zu installieren, kein Konto.",
  lpWieDrei: "Sieh dich im Glück",
  lpWieDreiText: "Wir setzen sein Gesicht in die Szene und machen ein Video daraus — mit seinem Namen am Ende.",
  lpWarumTitel: "Warum das wirkt",
  lpWarumText: "Ob jemand mitspielt, entscheidet kein Plakat mit einer Zahl darauf. Es entscheidet der Moment, in dem er sich selbst mit den 500.000 € sieht — und merkt, wie sich das anfühlt. Wer diesen Moment hatte, hinterlässt seine Adresse freiwillig.",
  lpOrteTitel: "Überall, wo Menschen stehen",
  lpOrteText: "Dieselbe Anwendung, drei Orte. Wer einen Bildschirm sieht, scannt den Code und hat sein Video eine Minute später auf dem eigenen Handy — kein Stand, kein Formular, kein Gespräch nötig.",
  lpOrtEinsTitel: "Im Netz",
  lpOrtEinsText: "Als Link in einer Anzeige, in einer Nachricht oder auf der eigenen Seite. Läuft auf jedem Handy und jedem Rechner, ohne Installation.",
  lpOrtZweiTitel: "Auf einem Bildschirm vor Ort",
  lpOrtZweiText: "Annahmestelle, Kiosk, Schaufenster, Bahnhof: Der Bildschirm zeigt den Spot in Schleife, der Code daneben führt weiter. Gearbeitet wird auf dem eigenen Handy.",
  lpOrtDreiTitel: "Als grosse Projektion",
  lpOrtDreiText: "Hafengeburtstag, Alstervergnügen, Weihnachtsmarkt: auf eine Wand geworfen — dieselbe Anwendung, nur gross. Wer stehen bleibt, hat den Code schon vor sich.",
  lpQrTitel: "Ein Code, ein Weg",
  lpQrText: "Jede Annahmestelle, jedes Event, jede Anzeige bekommt ihren eigenen Code. So ist hinterher sichtbar, welcher Ort wie viele Menschen gebracht hat.",
  lpKundeTitel: "Das bekommen Sie",
  lpKundeText: "Ihre Spieler sehen die Anzeige und gehen genau die Strecke, die Sie eben gegangen sind. Was bei Ihnen ankommt, ist keine Klickzahl, sondern eine Liste von Menschen, die sich ihr Glück angesehen haben — mit dem, was sie freigegeben haben, und dem, was sie gekostet haben.",
  lpKundeEins: "Eine Interessentenliste statt Klickzahlen",
  lpKundeZwei: "Kosten je Profil, nicht je Klick",
  lpKundeDrei: "Ihre Daten auf einem Server in Deutschland",
  lpKundeKnopf: "Beispielansicht der Kampagnenseite",
  lpNameTitel: "Das ist Video-Marketing",
  lpNameText: "Kein Gewinnspielformular, kein Newsletter-Häkchen am Anfang. Ihr Spieler sieht sich selbst als Gewinner, bevor er überhaupt einen Schein ausfüllt — und Sie erfahren von ihm, weil er es will. Dasselbe lässt sich für jede Ziehung, jede Aktion und jede Lotteriegesellschaft bauen.",
  lpWlTitel: "Und Ihr Name steht darauf, nicht unserer",
  lpWlText: "Sehen Sie sich diese Seite an: kein fremdes Logo, kein fremder Absender, nichts als LOTTO Hamburg. Genau so bekommen Sie das Ganze — Anzeige, Trichter und Auswertung unter Ihrem Namen. Wer mitmacht, sieht Sie und nur Sie.",

  genChip: "Generierungen",
  genSeiteTitelEins: "Deine", genSeiteTitelZwei: "Generierungen",
  genSeiteLead: "Was auf diesem Gerät entstanden ist. Tippe ein Video an, um es anzusehen oder zu verschicken.",
  genLeerTitel: "Noch nichts da",
  genLeerText: "Sobald du ein Video erstellt hast, findest du es hier wieder — auch wenn du zwischendurch weggeklickt hast.",
  genZurueck: "Zurück zum Anfang",
  genLaedt: "Einen Moment…",
  genLaeuftText: "Dein Video entsteht gerade — es erscheint hier von selbst.",
  lpUnten: "Selbst ausprobieren?",
  ton: "Ton an", tonAus: "Ton aus", gross: "Vergrössern", klein: "Verkleinern",
  teilen: "Video verschicken", teilenKopiert: "Link kopiert", teilenText: "Sieh dir das an:",
  perMail: "Per E-Mail senden",
  geteiltCta: "Dein Video generieren",

  mailBetreff: "Dein Video ist da",
  mailUeberschrift: "Danke {name}, dein Video ist fertig",
  mailText: "Es steht bereit — der Knopf führt dich direkt hin.",
  mailKnopf: "Video ansehen",
};

/* Der Wortschatz muss GENAU den ~130 Stellen entsprechen, die `ArmeeTexte` verlangt — ein
   fehlendes Feld wäre ein Bildschirm ohne Text. `satisfies` prüft das beim Bauen, ohne den
   Objekt-Typ auf `ArmeeTexte` einzuengen (das rechtliche Zusatzfeld unten bliebe sonst
   unsichtbar für die Kampagnen-Konfiguration darunter). */
const LOTTO_HH_TEXTE: KampagnenTexte = LOTTO_HH_DE satisfies Record<string, string>;

export const KAMPAGNEN: Record<string, KampagnenKonfig> = {
  "lotto-hh": {
    slug: "lotto-hh",
    marke: "LOTTO Hamburg",
    domain: ACADEMY_DOMAIN,
    szenen: LOTTO_HH_SZENEN,
    texte: LOTTO_HH_TEXTE,
    prompts: LOTTO_HH_SZENEN_PROMPTS,
    spot: { video: "/Lotto-HH/Ferrari-web.mp4", poster: "/Lotto-HH/Ferrari-web.jpg" },
    sprachen: ["de"],
    limitGeraet: 3,
    limitTag: 40,
    legal: {
      hinweis: "Teilnahme ab 18 Jahren. Glücksspiel kann süchtig machen.",
      hilfe: "Hilfe unter bzga.de oder der kostenlosen Hotline 0800 137 27 00.",
    },
  },
};

/** Für `LOOK_IDS` in `/api/kiss-log` — dieselbe Fessel wie bei jedem anderen Thema (siehe
    dortiger Kommentar: eine unbekannte Kennung wird sonst STILLSCHWEIGEND verworfen). Neue
    Kampagnen tragen sich hier von selbst ein, sobald sie im Register oben stehen — die Route
    braucht dafür keine eigene Änderung mehr. */
export const KAMPAGNEN_LOOKS: { id: string }[] = Object.values(KAMPAGNEN).flatMap(k =>
  k.szenen.map(s => ({ id: s.id })));

/** Ist dieser Thema-Schlüssel eine Kampagne aus diesem Register? — für den Mail-Auslöser in
    `/api/kiss-log`, der sonst jeden Thema-String prüfen müsste. */
export function istKampagnenTheme(theme: string): boolean {
  return Object.prototype.hasOwnProperty.call(KAMPAGNEN, theme);
}

/**
 * DIE LIEFERMAIL — dieselbe Bauart wie `academyVideoMailSenden` in `lib/demo-armee.ts`, nur
 * über das Register statt über eine feste Marke. Absichtlich eine zweite, kleine Funktion
 * statt eines Umbaus an der Armee-Fassung: Die läuft im echten Betrieb, und dieser Weg lässt
 * sie unangetastet.
 */
export async function kampagnenVideoMailSenden(
  theme: string, genId: string, to: string, vorname: string,
): Promise<boolean> {
  const kampagne = KAMPAGNEN[theme];
  if (!kampagne) return false;
  const id = String(genId ?? "").trim();
  const adresse = String(to ?? "").trim();
  if (!id || !adresse) return false;
  const T = kampagne.texte;
  const name = String(vorname ?? "").trim();
  const link = `${kampagne.domain}/${kampagne.slug}/v/${id}`;
  const html =
    `<div style="background:#0d0b0a;padding:22px 0;font-family:Arial,Helvetica,sans-serif">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">`
    + `<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:480px;max-width:94%;background:#16120f;border-radius:18px;overflow:hidden">`
    + `<tr><td style="padding:22px 22px 6px;color:#f6cf51;font-size:13px;font-weight:bold;letter-spacing:2px">${kampagne.marke.toUpperCase()}</td></tr>`
    + `<tr><td style="padding:0 22px 12px;color:#fff;font-size:19px;font-weight:bold">${(name ? T.mailUeberschrift.replace("{name}", name) : T.mailUeberschrift.replace(" {name}", "")).trim()}</td></tr>`
    + `<tr><td style="padding:0 22px 18px;color:#e8e2d6;font-size:14px;line-height:1.55">${T.mailText}</td></tr>`
    + `<tr><td style="padding:0 22px 24px"><a href="${link}" style="display:inline-block;background:#f6cf51;color:#111;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:bold;text-decoration:none">${T.mailKnopf} →</a></td></tr>`
    + `</table></td></tr></table></div>`;
  const r = await sendEmail({ to: adresse, subject: T.mailBetreff, html }).catch(() => ({ ok: false }));
  return !!(r as { ok?: boolean }).ok;
}
