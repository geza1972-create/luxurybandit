import { GEBURTSTAG_CENTS } from "@/lib/pricing";
import { eur } from "@/lib/pricing";
import { GEBURTSTAG_VIDEO } from "@/lib/geburtstag";

/** Das Standbild zum Beispielvideo — Karten-Pflicht: nie ein Video ohne Poster. */
const GEBURTSTAG_POSTER = "/Birthday/hbd-schoko.jpg";

/**
 * DIE RATGEBER-SEITEN — EIGENE ADRESSE JE SPRACHE (Owner-Auftrag 27.08.2026, nach einer
 * SEO-Analyse, die er hereingereicht hat).
 *
 * DER BEFUND, DER DIESE DATEI NOETIG MACHT (gemessen an der Live-Seite, 27.08.2026):
 * Das ganze Portal laeuft in sieben Sprachen — aber alle sieben liegen auf DERSELBEN
 * Adresse. `<html lang>` wechselt je Besucher, URL und `<title>` bleiben englisch. Googlebot
 * crawlt ueberwiegend aus den USA mit englischen Kopfzeilen, sieht also nur die englische
 * Fassung und indexiert genau eine Version je Seite. Damit kann das Portal weder auf
 * „Geburtstagsvideo" noch auf „video de zi de naștere" gefunden werden: Es gibt keine
 * Adresse, die eine Suchmaschine dafuer anbieten koennte.
 *
 * Ein uebersetzter Artikel auf einer solchen Adresse waere weggeworfene Arbeit. Deshalb
 * haben die Ratgeber-Seiten als EINZIGE im Haus eine feste Sprache je Adresse:
 *   /de/ratgeber/<slug>   und   /ro/ghid/<slug>
 * Sie verweisen per `hreflang` gegenseitig aufeinander und stehen in der Sitemap.
 *
 * KEINE LAUFZEIT-UEBERSETZUNG HIER. `textbausteineInSprache` ist fuer Oberflaechentexte
 * richtig; ein Ratgeber lebt von Formulierungen, die ein Mensch geschrieben hat, und muss
 * bei jedem Abruf byte-gleich sein — sonst indexiert Google jeden Besuch anders.
 *
 * PREISE NIE ALS ZAHL IM TEXT (Hausregel `prices-only-from-pricing-table`): Sie kommen aus
 * `lib/pricing.ts`, hier ueber `preis()` eingesetzt. Ein Ratgeber, der 4,99 € nennt, waehrend
 * die Kasse etwas anderes verlangt, ist schlimmer als gar kein Ratgeber.
 */

export type RatgeberSprache = "de" | "ro";

export type Abschnitt = { h: string; p: string[] };

export type Ratgeber = {
  slug: string;
  /** Der Slug derselben Seite in der anderen Sprache — traegt das `hreflang`-Paar. */
  paar: string;
  titel: string;
  /** Der Satz unter der Ueberschrift und zugleich die Meta-Beschreibung. */
  beschreibung: string;
  einleitung: string[];
  abschnitte: Abschnitt[];
  /** Ehrlich, was das Produkt NICHT kann — es steht bewusst im Text, nicht im Kleingedruckten. */
  grenzenH: string;
  grenzen: string[];
  faq: { f: string; a: string }[];
  ctaH: string;
  ctaText: string;
  ctaKnopf: string;
  ctaHref: string;
  video: string;
  videoPoster: string;
  videoBeschriftung: string;
  aktualisiert: string;
};

const preis = (lang: RatgeberSprache) => eur(GEBURTSTAG_CENTS, lang);

/** Das Erscheinungsdatum steht fest im Text — `new Date()` waere bei jedem Abruf anders. */
const STAND = "2026-08-27";

const DE: Record<string, Ratgeber> = {
  "geburtstagsvideo-selber-machen": {
    slug: "geburtstagsvideo-selber-machen",
    paar: "video-de-zi-de-nastere",
    titel: "Geburtstagsvideo selber machen: was wirklich ankommt",
    beschreibung:
      "Warum ein persönliches Geburtstagsvideo mehr auslöst als ein Geschenkgutschein — und wie du in wenigen Minuten eines erstellst, in dem der Name des Geburtstagskindes tatsächlich ausgesprochen wird.",
    einleitung: [
      "Ein Geburtstagsgruss in einer Gruppenchat-Gruppe ist in zwei Sekunden gelesen und in zwanzig vergessen. Ein Video, in dem jemand den Namen des Geburtstagskindes ausspricht, wird angeschaut, weitergeschickt und gespeichert. Der Unterschied liegt nicht am Aufwand, sondern daran, dass eine Person angesprochen wird statt eines Anlasses.",
      "Dieser Text erklärt, was ein Geburtstagsvideo persönlich macht, welche drei Wege es gibt, eines zu erstellen, und was jeder davon kostet — auch die Wege, die nichts mit uns zu tun haben.",
    ],
    abschnitte: [
      {
        h: "Warum der Name den Unterschied macht",
        p: [
          "Personalisierte Geschenke wirken aus einem schlichten Grund stärker: Sie beweisen aufgewendete Zeit. Ein Gutschein zeigt, dass jemand an den Anlass gedacht hat. Ein Video, in dem der Name fällt, zeigt, dass jemand an die Person gedacht hat.",
          "Genau deshalb funktionieren generische Vorlagen mit „Alles Gute zum Geburtstag“ so schlecht: Sie sind austauschbar, und das merkt der Empfänger sofort. Sobald ein Name, ein Spitzname oder ein gemeinsamer Bezug vorkommt, kippt die Wahrnehmung — aus Pflichtprogramm wird Zuwendung.",
          "Das ist kein Verkaufsargument, sondern der Grund, warum sich der ganze Aufwand überhaupt lohnt. Ein unpersönliches Video ist auch dann wertlos, wenn es teuer war.",
        ],
      },
      {
        h: "Drei Wege zum Geburtstagsvideo",
        p: [
          "Selbst filmen. Kostet nichts ausser Überwindung und ist die persönlichste Variante, weil dein eigenes Gesicht zu sehen ist. Nachteil: Die meisten Menschen nehmen sich ungern selbst auf, und ein zwanzigster Versuch klingt selten frischer als der erste.",
          "Videoschnitt-App. Vorlagen mit Konfetti und Musik, in die du Fotos einsetzt. Günstig bis kostenlos, sieht aber erkennbar nach Vorlage aus — und niemand spricht darin den Namen aus.",
          "KI-generiertes Video. Du gibst den Namen ein, wählst eine Szene, und bekommst ein Video, in dem der Name gesprochen wird. Kein Filmen, keine Bearbeitung. Genau das machen wir; bei uns kostet ein solches Video {preis}.",
        ],
      },
      {
        h: "Wie es bei uns abläuft",
        p: [
          "Du wählst eine Szene, tippst den Namen des Geburtstagskindes ein und optional eine kurze Nachricht. Danach läuft die Erzeugung auf unserem Server — du kannst das Fenster schliessen, das Video wartet in deiner Galerie.",
          "Das fertige Video kommt als Karte mit Titel, die du per Link verschicken kannst. Der Empfänger braucht kein Konto und keine App.",
          "Bezahlt wird einmalig pro Video, kein Abonnement. Der Preis steht auf dem Kaufknopf, bevor du etwas eingibst.",
        ],
      },
      {
        h: "Was ein gutes Geburtstagsvideo ausmacht",
        p: [
          "Kurz. Unter dreissig Sekunden. Ein Geburtstagsvideo wird im Stehen angeschaut, oft vor anderen Leuten.",
          "Der Name gleich am Anfang. Wer erst nach zehn Sekunden merkt, dass er gemeint ist, hat schon weggeschaut.",
          "Ein konkreter Bezug statt allgemeiner Wünsche. „Auf noch ein Jahr ohne Kaffeemaschine im Büro“ trifft besser als „alles Liebe und Gesundheit“.",
          "Rechtzeitig verschickt. Ein Video, das um 23 Uhr ankommt, wirkt wie eine nachgeholte Pflicht.",
        ],
      },
    ],
    grenzenH: "Was wir nicht können",
    grenzen: [
      "Wir bilden keine echte Person nach, die du nicht selbst hochgeladen hast. Wer das Gesicht einer bestimmten Person erwartet, wird enttäuscht.",
      "Ungewöhnliche Namen werden gelegentlich falsch betont. Du hörst das Ergebnis, bevor du es verschickst.",
      "Es ist ein erzeugtes Video, kein gefilmtes. Wer eine echte Aufnahme von dir erwartet, sollte selbst filmen — das ist ehrlicher und kostet nichts.",
    ],
    faq: [
      {
        f: "Wie lange dauert die Erstellung?",
        a: "In der Regel wenige Minuten. Die Erzeugung läuft auf dem Server weiter, auch wenn du die Seite schliesst.",
      },
      {
        f: "Was kostet ein Geburtstagsvideo?",
        a: "{preis} pro Video, einmalig. Kein Abonnement, keine Folgekosten.",
      },
      {
        f: "Kann ich das Video herunterladen?",
        a: "Ja. Es liegt in deiner Galerie und lässt sich als Datei speichern und überall verschicken.",
      },
      {
        f: "Braucht der Empfänger ein Konto?",
        a: "Nein. Er bekommt einen Link und schaut das Video im Browser an.",
      },
      {
        f: "Kann ich mein eigenes Foto verwenden?",
        a: "Für das Geburtstagsvideo brauchst du kein Foto — der Name genügt. Andere Produkte bei uns arbeiten mit deinem Foto.",
      },
    ],
    ctaH: "Ein Geburtstagsvideo erstellen",
    ctaText: "Name eintragen, Szene wählen, fertig. {preis} pro Video, ohne Abonnement.",
    ctaKnopf: "Geburtstagsvideo ansehen",
    ctaHref: "/themes/birthday",
    video: GEBURTSTAG_VIDEO,
    videoPoster: GEBURTSTAG_POSTER,
    videoBeschriftung: "Ein Beispiel: dasselbe Video, das auf unserer Geburtstagsseite läuft.",
    aktualisiert: STAND,
  },
};

const RO: Record<string, Ratgeber> = {
  "video-de-zi-de-nastere": {
    slug: "video-de-zi-de-nastere",
    paar: "geburtstagsvideo-selber-machen",
    titel: "Video de zi de naștere: ce contează cu adevărat",
    beschreibung:
      "De ce un video personalizat de zi de naștere are mai mult efect decât un voucher — și cum faci unul în câteva minute, în care numele sărbătoritului chiar este rostit.",
    einleitung: [
      "O urare de zi de naștere într-un grup de chat se citește în două secunde și se uită în douăzeci. Un video în care cineva rostește numele sărbătoritului este privit, trimis mai departe și salvat. Diferența nu stă în efort, ci în faptul că se adresează unei persoane, nu unei ocazii.",
      "Textul acesta explică ce face un video de zi de naștere să fie personal, care sunt cele trei moduri de a face unul și cât costă fiecare — inclusiv variantele care nu au legătură cu noi.",
    ],
    abschnitte: [
      {
        h: "De ce numele face diferența",
        p: [
          "Cadourile personalizate funcționează dintr-un motiv simplu: dovedesc timp investit. Un voucher arată că cineva s-a gândit la ocazie. Un video în care se rostește numele arată că cineva s-a gândit la persoană.",
          "Exact de aceea șabloanele generice cu „La mulți ani” funcționează prost: sunt interschimbabile, iar destinatarul simte asta imediat. În momentul în care apare un nume, o poreclă sau o referință comună, percepția se schimbă — din obligație devine atenție.",
          "Nu este un argument de vânzare, ci motivul pentru care merită efortul. Un video impersonal rămâne fără valoare chiar dacă a costat mult.",
        ],
      },
      {
        h: "Trei moduri de a face un video de zi de naștere",
        p: [
          "Te filmezi singur. Nu costă nimic în afară de curaj și este varianta cea mai personală, pentru că se vede chipul tău. Dezavantaj: majoritatea oamenilor se filmează cu greu, iar a douăzecea încercare rareori sună mai proaspăt decât prima.",
          "Aplicație de montaj. Șabloane cu confetti și muzică, în care pui poze. Ieftin sau gratuit, dar se vede clar că e un șablon — și nimeni nu rostește numele în el.",
          "Video generat cu AI. Introduci numele, alegi o scenă și primești un video în care numele este rostit. Fără filmare, fără montaj. Exact asta facem noi; la noi un astfel de video costă {preis}.",
        ],
      },
      {
        h: "Cum funcționează la noi",
        p: [
          "Alegi o scenă, scrii numele sărbătoritului și, opțional, un mesaj scurt. Apoi generarea rulează pe serverul nostru — poți închide fereastra, videoul te așteaptă în galerie.",
          "Videoul final vine ca o card cu titlu, pe care îl poți trimite printr-un link. Destinatarul nu are nevoie de cont și nici de aplicație.",
          "Se plătește o singură dată per video, fără abonament. Prețul apare pe butonul de cumpărare înainte să introduci ceva.",
        ],
      },
      {
        h: "Ce face un video bun de zi de naștere",
        p: [
          "Scurt. Sub treizeci de secunde. Un video de zi de naștere se privește în picioare, adesea de față cu alți oameni.",
          "Numele chiar la început. Cine își dă seama abia după zece secunde că este vorba despre el a privit deja în altă parte.",
          "O referință concretă în loc de urări generale. „Încă un an fără espressorul stricat din birou” nimerește mai bine decât „multă sănătate”.",
          "Trimis la timp. Un video care ajunge la ora 23 pare o obligație bifată târziu.",
        ],
      },
    ],
    grenzenH: "Ce nu putem face",
    grenzen: [
      "Nu reproducem o persoană reală pe care nu ai încărcat-o tu. Cine se așteaptă la chipul unei anumite persoane va fi dezamăgit.",
      "Numele neobișnuite sunt uneori accentuate greșit. Auzi rezultatul înainte să îl trimiți.",
      "Este un video generat, nu filmat. Cine se așteaptă la o înregistrare reală cu tine ar face mai bine să se filmeze singur — este mai sincer și nu costă nimic.",
    ],
    faq: [
      {
        f: "Cât durează generarea?",
        a: "De regulă câteva minute. Generarea continuă pe server chiar dacă închizi pagina.",
      },
      {
        f: "Cât costă un video de zi de naștere?",
        a: "{preis} per video, o singură dată. Fără abonament și fără costuri ulterioare.",
      },
      {
        f: "Pot descărca videoul?",
        a: "Da. Rămâne în galeria ta și poate fi salvat ca fișier și trimis oriunde.",
      },
      {
        f: "Destinatarul are nevoie de cont?",
        a: "Nu. Primește un link și vede videoul în browser.",
      },
      {
        f: "Pot folosi propria mea poză?",
        a: "Pentru videoul de zi de naștere nu ai nevoie de poză — numele este suficient. Alte produse ale noastre lucrează cu poza ta.",
      },
    ],
    ctaH: "Fă un video de zi de naștere",
    ctaText: "Scrii numele, alegi scena, gata. {preis} per video, fără abonament.",
    ctaKnopf: "Vezi videoul de zi de naștere",
    ctaHref: "/themes/birthday",
    video: GEBURTSTAG_VIDEO,
    videoPoster: GEBURTSTAG_POSTER,
    videoBeschriftung: "Un exemplu: același video care rulează pe pagina noastră de zi de naștere.",
    aktualisiert: STAND,
  },
};

const TABELLE: Record<RatgeberSprache, Record<string, Ratgeber>> = { de: DE, ro: RO };

/** Setzt `{preis}` aus der Preistabelle ein — nie eine Zahl im Text. */
export function mitPreis(text: string, lang: RatgeberSprache): string {
  return text.replace(/\{preis\}/g, preis(lang));
}

export function ratgeber(lang: RatgeberSprache, slug: string): Ratgeber | null {
  return TABELLE[lang]?.[slug] ?? null;
}

export function alleRatgeber(lang: RatgeberSprache): Ratgeber[] {
  return Object.values(TABELLE[lang] ?? {});
}

/** Der Adressteil je Sprache — Deutsch „ratgeber", Rumänisch „ghid". */
export const PFAD: Record<RatgeberSprache, string> = { de: "de/ratgeber", ro: "ro/ghid" };

export function ratgeberUrl(lang: RatgeberSprache, slug: string): string {
  return `/${PFAD[lang]}/${slug}`;
}
