/**
 * DAS VERSPRECHEN — das Thema, das aus dem „LuxuryBandit System" wurde (Owner 10.08.2026).
 *
 * > „Das Luxury system machen wir anders. Da ändern wir das konzept brutal. Wir verkaufen
 * > keine Systeme. Wir generieren genauso wie die anderen. Sende ein Verprechen an dich und
 * > an deine Freunde. Du lädst ein Video von dir hoch und sagst ich werde es in den nächsten
 * > Jaren schaffen. … Am Ende muss ein Video raus kommen wo du mit Pirsche und Villa
 * > dargestellt bist und sagst. Ich werde es schaffen und werde hard dafür arbeiten."
 *
 * WAS SICH DAMIT ÄNDERT: Verkauft wird kein Bericht und keine Analyse mehr, sondern dasselbe
 * wie überall im Haus — ein Video mit seinem Gesicht und seiner Stimme. Der Trichter ist der
 * des Geburtstags, Zeile für Zeile: Aufnahme statt Foto-Upload (das Video liefert Standbild
 * UND Stimme), ein Look, ein Preis, ein fertiges Video zum Verschicken.
 *
 * DER UNTERSCHIED ZUM GEBURTSTAG steht in genau zwei Dingen — dem LOOK (Porsche und Villa
 * statt Torte und Kerzen) und dem SATZ, den er selbst spricht. Beides liegt in dieser Datei
 * und in `lib/versprechen-looks.ts`; alles andere erbt der Trichter.
 *
 * WARUM ES TRÄGT: Ein Versprechen an sich selbst ist der einzige Gruss, den man an sich
 * SELBST schickt und trotzdem herumzeigt. Er hat einen Anlass (Jahreswechsel, Geburtstag,
 * Kündigung, Studienbeginn), einen Empfänger (die Freunde, die es bezeugen sollen) und ein
 * Ablaufdatum — dieselben drei Dinge, die den Kuss und den Geburtstag verkaufen.
 */

/**
 * DER SATZ, DEN ER SPRICHT — er kommt aus SEINER Aufnahme, nicht von uns.
 *
 * Das hier ist nur der Vorschlag auf dem Bildschirm, während die Kamera läuft. Ein fertiges
 * Skript wäre falsch: Das Versprechen gehört ihm, und die Stimme im Video ist seine eigene
 * (dieselbe Kette wie beim Geburtstag — Standbild und Tonspur aus der Aufnahme).
 */
export const VERSPRECHEN_SATZ_DE =
  "Ich weiss noch nicht genau, wie ich dahin komme. Aber ich werde dafür arbeiten. Ich hole mir dieses Leben.";
/**
 * FASSUNG A aus KONZEPT-VERSPRECHEN.md (Owner 10.08.2026: „A. mit ergänzung").
 *
 * DER WORTLAUT DES OWNERS vom Abend des 10.08.2026 („hier ist der text fürs Video"):
 *
 *   „I don't know exactly how I'll get there yet. But I'm going to work for it.
 *    I'm going to bandit this life."
 *
 * DREI SÄTZE, DREI BEWEGUNGEN — und die Reihenfolge ist der ganze Trick: erst das
 * EINGESTÄNDNIS („ich weiss noch nicht wie"), dann der EINSATZ, dann der Griff. Ein
 * Versprechen, das mit dem Eingeständnis beginnt, kann jeder abgeben; eines, das mit dem
 * Ziel beginnt, nur der, der schon einen Plan hat. Genau deshalb darf hier jemand kaufen,
 * der noch nichts vorzuweisen hat — und das sind die meisten.
 *
 * „I'm going to bandit this life" ist der Markensatz (Owner: „You will bandit this life?").
 * „to bandit" gibt es im Englischen nicht als Verb — deshalb gehört es uns, wie „google it".
 *
 * OHNE DIE EINLADUNG: „Make this video too …" gehört ins BEISPIELVIDEO der Landingpage
 * (`scripts/versprechen-beispiel.mjs`), nicht in das Video eines Kunden. Niemand verspricht
 * seinen Freunden etwas und macht danach Werbung.
 */
export const VERSPRECHEN_SATZ_EN =
  "I don't know exactly how I'll get there yet. But I'm going to work for it. I'm going to bandit this life.";

/**
 * DER TEXT, DEN ER VOR DER KAMERA ABLIEST (Owner 11.08.2026, wörtlich diktiert: „Diesen Text
 * müssen als Vorlage geben damit er das nachrspricht").
 *
 * WARUM ES WIEDER EINE VORLAGE GIBT: Am 09.08. flog der Vorlese-Satz aus dem Trichter, weil
 * er dem Versprechen „kein Skript nötig" widersprach. Beim Geburtstag stimmt das weiter — da
 * gratuliert man mit eigenen Worten. Hier nicht: Wer sich zum ersten Mal selbst filmt und
 * seiner eigenen Zukunft etwas verspricht, steht ohne Worte da. Die Vorlage ist deshalb kein
 * Zwang, sondern ein Geländer — er darf jederzeit etwas anderes sagen, es ist SEIN Video.
 *
 * ES IST NICHT `VERSPRECHEN_SATZ_EN`, und das mit Absicht: Der kurze Satz ist der, den die
 * Computerstimme spricht, wenn gar keine Aufnahme da ist (HeyGen rechnet je gesprochener
 * Sekunde ab — ein 20-Sekunden-Rückfall wäre der teuerste Weg für den seltensten Fall). Der
 * hier ist das, was der KUNDE sagt. Beide enden auf demselben Markensatz.
 *
 * IN SEINER SPRACHE, nicht mehr nur Englisch (Owner 11.08.2026, zum Screenshot dieser
 * Vorlage: „das kann auch übersetzt werden. Ich denke, dass man das multilanguage sagen kann
 * in Heygen."). Er hat recht: Der Kunde spricht mit SEINER EIGENEN Stimme, aus SEINER
 * eigenen Aufnahme — HeyGen synct danach nur die Lippen auf diese Tonspur, es übernimmt
 * keinen fremden Text. Der englische Zwang galt nie für das, was der Kunde sagt, sondern nur
 * für das BEISPIELVIDEO (eine einzige Produktion, sieben Sprachen wären dafür zu teuer) und
 * für `VERSPRECHEN_SATZ_EN`, den TTS-Rückfall ohne Aufnahme — der bleibt unangetastet
 * Englisch, weil dort die Computerstimme spricht, nicht der Kunde.
 *
 * ZEILENWEISE, nicht als Absatz: Vor der Kamera liest man Zeilen, keine Blöcke — jede Zeile
 * ist ein Atemzug. Der Trichter setzt sie untereinander. Jede Sprache hat deshalb GENAU so
 * viele Zeilen wie jede andere.
 *
 * DER MARKENSATZ BLEIBT ENGLISCH — in JEDER Sprache wörtlich „I'm going to bandit this
 * life." (siehe `VERSPRECHEN_SATZ_EN`): „to bandit" gibt es im Englischen nicht als Verb,
 * deshalb gehört es uns, wie „google it" — eine Übersetzung würde genau das zerstören.
 */
export const VERSPRECHEN_SKRIPT: Record<string, string[]> = {
  en: [
    "This is me today.",
    "Five years from now, I want to look back and know I didn't waste this time.",
    "I'm going to work for this every single day.",
    "Step by step. Piece by piece.",
    "Everything I do from now on will move me closer to this life.",
    "I'm going to bandit this life.",
    "I promise.",
  ],
  de: [
    "So sehe ich heute aus.",
    "In fünf Jahren will ich zurückblicken und wissen, dass ich diese Zeit nicht verschwendet habe.",
    "Ich werde jeden einzelnen Tag dafür arbeiten.",
    "Schritt für Schritt. Stück für Stück.",
    "Alles, was ich von jetzt an tue, bringt mich diesem Leben näher.",
    "I'm going to bandit this life.",
    "Ich verspreche es.",
  ],
  ro: [
    "Așa arăt astăzi.",
    "Peste cinci ani, vreau să privesc înapoi și să știu că nu am irosit acest timp.",
    "Voi munci pentru asta în fiecare zi.",
    "Pas cu pas. Bucată cu bucată.",
    "Tot ce fac de acum înainte mă va apropia de această viață.",
    "I'm going to bandit this life.",
    "Promit.",
  ],
  es: [
    "Así soy hoy.",
    "Dentro de cinco años, quiero mirar atrás y saber que no desperdicié este tiempo.",
    "Voy a trabajar por esto cada día.",
    "Paso a paso. Pieza a pieza.",
    "Todo lo que haga a partir de ahora me acercará a esta vida.",
    "I'm going to bandit this life.",
    "Lo prometo.",
  ],
  fr: [
    "Voici qui je suis aujourd'hui.",
    "Dans cinq ans, je veux regarder en arrière et savoir que je n'ai pas gâché ce temps.",
    "Je vais travailler pour ça chaque jour.",
    "Étape par étape. Morceau par morceau.",
    "Tout ce que je ferai désormais me rapprochera de cette vie.",
    "I'm going to bandit this life.",
    "Je le promets.",
  ],
  pt: [
    "É assim que sou hoje.",
    "Daqui a cinco anos, quero olhar para trás e saber que não desperdicei este tempo.",
    "Vou trabalhar por isso todos os dias.",
    "Passo a passo. Peça a peça.",
    "Tudo o que fizer a partir de agora vai aproximar-me desta vida.",
    "I'm going to bandit this life.",
    "Prometo.",
  ],
  it: [
    "Questo sono io oggi.",
    "Tra cinque anni, voglio guardare indietro e sapere di non aver sprecato questo tempo.",
    "Lavorerò per questo ogni singolo giorno.",
    "Passo dopo passo. Pezzo dopo pezzo.",
    "Tutto ciò che farò da ora in poi mi avvicinerà a questa vita.",
    "I'm going to bandit this life.",
    "Lo prometto.",
  ],
};

/** Die Vorlese-Vorlage in seiner Sprache — unbekannte Sprache fällt auf Englisch zurück. */
export function versprechenSkript(lang: string | undefined): string[] {
  return VERSPRECHEN_SKRIPT[String(lang ?? "en").slice(0, 2)] ?? VERSPRECHEN_SKRIPT.en;
}

/**
 * DIE VORLAGE — das zweite Referenzbild (wie `GEBURTSTAG_SET`).
 *
 * SEIT 10.08.2026 DAS BILD DES OWNERS (er zeigte darauf: „Mach doch ein Video aus dem Bild
 * Mann mit Porsche"): ein Mann vor der Villa, der dunkle Wagen hinter ihm, Abendlicht am
 * Meer. Es lag als `Bild1..3.png` im Ordner des gelöschten System-Themas; hierher kopiert,
 * damit es nicht mit dem alten Thema verschwindet.
 *
 * Es tut zwei Dinge auf einmal — es ist die Kachel des Looks UND die Stil-Vorlage
 * (`stilBild`): Das Bildmodell sieht die Bildwelt, statt sie aus Worten raten zu müssen.
 * Genau daran ist der Geburtstags-Look „Dream World" gewachsen (Owner 09.08.: der Grund,
 * warum sein ChatGPT-Ergebnis besser war als unseres — es sah die Handschrift).
 */
/* SEIT 11.08.2026 DAS STANDBILD DES BEISPIELVIDEOS: `look-villa.png` wurde beim Aufräumen des
   Ordners gelöscht — die Kachel zeigte einen kaputten Bildplatzhalter (Owner: „wieso fehlt
   das poster?") und das Stil-Bild der Erzeugung zeigte ins Leere. `Verprechen2.jpg` ist
   dieselbe Bildwelt (er vor Villa und Wagen) und liegt ohnehin im Ordner. */
export const VERSPRECHEN_SET = "/Versprechen/Verprechen2.jpg";

/**
 * DIE VERWANDLUNG ALS VORLAGE — ZWEI BILDER, DIE INEINANDER BLENDEN (Owner 11.08.2026, mit
 * beiden Dateien im Bild: „kannst du hier eine animation machen zwischen diese zwei bilder?").
 *
 * Ein einzelnes Villa-Bild zeigt das ZIEL. Es zeigt nicht, was das Produkt tut. Die beiden
 * hier zusammen tun es ohne ein Wort: links der Mann, wie er sich heute selbst filmt —
 * Kapuzenpulli, Handy, Zimmer —, rechts derselbe Mann vor Villa und Wagen. Genau die
 * Strecke, die der Kunde kauft, und genau der Satz, mit dem sein Video anfängt („This is me
 * today").
 *
 * ES SIND DIE STANDBILDER SEINER EIGENEN BEISPIELVIDEOS (aus `Verprechen1.mp4` und
 * `Verprechen2.mp4` gezogen, deshalb der Schreibfehler im Dateinamen — er gehört zur Datei,
 * nicht zu uns). Sie liegen ohnehin im Ordner, weil jede Folie ihr Poster braucht: ein Bild,
 * zwei Aufgaben, keine dritte Datei zum Pflegen.
 */
export const VERSPRECHEN_HEUTE = "/Versprechen/Verprechen1.jpg";
export const VERSPRECHEN_SPAETER = "/Versprechen/Verprechen2.jpg";

/**
 * DAS BEISPIELVIDEO auf der Landingpage — dasselbe, das später in der Karte läuft
 * (Dauerregel `landingpage-video-ist-kachel-video`: EIN Video aus EINER Konstante).
 *
 * ERZEUGT AM 10.08.2026 aus genau diesem Bild — dieselbe Kette wie das Produkt (HeyGen
 * `avatar_iv`), nur ohne den Bild-Schritt: Das Foto IST schon der Look. Der Mann sagt den
 * englischen Satz („I am going to make it. And I will work hard for it."), ruhig und ohne
 * hinzuerfundenes Lächeln. Skript: `scripts/versprechen-beispiel.mjs` — einmal gelaufen,
 * die Datei liegt im Repo, es wird nie wieder erzeugt.
 */
export const VERSPRECHEN_VIDEO = "/Versprechen/promise-example.mp4";

/**
 * DAS STANDBILD ZUM BEISPIELVIDEO — dieselbe Datei für die Katalog-Kachel und für die Karte
 * auf der Landingpage (Owner 10.08.2026: „hier fehlt auch", zur Kachel ohne Bild).
 *
 * Es liegt neben dem Video und heisst wie es: Damit greift auch die Hausregel „aus .mp4 wird
 * .jpg", ohne die eine Karte ohne Poster eine dunkle Fläche zeigt.
 */
export const VERSPRECHEN_POSTER = "/Versprechen/promise-example.jpg";
