import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { frageModell, str, strListe, KLEIN, GROSS, type Verbrauch } from "@/lib/agent-modell";
import { portaleFuer, type Lage } from "@/lib/versusforge-portale";
import { seiteLesen, istEigeneAdresse } from "@/lib/seite-lesen";
import { deckelPruefen, agentDeckel } from "@/lib/versusforge-deckel";
import { leadSpeichern, EIGENER_MANDANT, mandantSauber } from "@/lib/versusforge-lead";
import { HOOK_REGELN, GESCHICHTE_REGELN, HEBEL_AUFTRAG, HEBEL } from "@/lib/versusforge-hook-rezept";
import { freierName, mandantAusPlan, mandantSpeichern } from "@/lib/versusforge-mandanten";
import { analysePerPost } from "@/lib/versusforge-post";
import { sprachname } from "@/lib/lang";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * VERSUSFORGE — DER AGENT VOR DER MASCHINE (Owner 08.09.2026).
 *
 * „Ein Berater vor der Maschine, also beim Eingabefeld. Er fragt dich, was du hast. Es gibt
 * nur zwei Möglichkeiten: Ich suche Leads oder ich will Produkte verkaufen."
 *
 * Der Ablauf, drei Schritte, jeder ein Modellaufruf:
 *
 *   briefing  — er liest den einen Satz und stellt die erste Rückfrage
 *   antwort   — er bewertet, fragt weiter oder ist fertig  (bis zu 4 Runden)
 *   plan      — er zeigt, was er bauen würde
 *
 * ER LEGT NICHTS AN. Kein Aufruf an Meta, keine Kampagne, kein Motiv. Der Plan ist Text.
 * Das Anlegen ist ein eigener Schritt, der erst kommt, wenn die Fragen taugen — und es wird
 * immer PAUSIERT angelegt (Hausregel: Ausgeben ist eine bewusste Entscheidung des Menschen).
 *
 * DER ZUSTAND LIEGT IM BROWSER, nicht auf dem Server — anders als bei David. Der Grund ist
 * der Unterschied im Einsatz: Bei David hängt ein bezahltes Ergebnis daran
 * ([[paid-jobs-must-survive-the-browser]]), hier ist es ein Vorgespräch ohne Kasse. Wer das
 * Fenster schliesst, verliert vier Antworten und kann sie in zwei Minuten neu geben. Sobald
 * hier Geld fliesst, muss das umgebaut werden — dann gilt die Hausregel wieder.
 */

const MAX_FRAGEN = 4;

/* Die Sprachnamen stehen seit dem 09.09.2026 in lib/lang.ts — EINE Tabelle für Trichter,
   Agent und alles, was noch kommt. Eine zweite Kopie war der Weg zu „rumänische Oberfläche,
   deutsche Fragen". */

/**
 * WAS DER AGENT NICHT DARF — in JEDEM Aufruf, nicht nur im ersten.
 *
 * Die Sprachzeile steht hier und nicht fest verdrahtet: Genau dieser Fehler ist bei David am
 * 07.09.2026 aufgefallen (rumänische Oberfläche, deutsche Fragen), weil „Sprache: Deutsch"
 * in sechs Aufträgen stand. Was das Modell nicht im Auftrag liest, kann es nicht wissen.
 */
/**
 * ── ZWEI FEHLER AUS DEM EIGENEN PRÜFLAUF (09.09.2026, rumänischer Durchgang) ────────────────
 *
 * 1. MITTEN IM RUMÄNISCHEN SATZ STAND DEUTSCH: „…ai spus exact ce vrei ca oamenii să facă,
 *    das hilft für die Anzeige, weil wir ein klares Angebot und Ziel haben." Die Sprachzeile
 *    stand an Position zwei von zwanzig — und wurde im Feld `reaktion` überlesen. Sie steht
 *    jetzt ZUSÄTZLICH als letzte Zeile: Was unmittelbar vor der Aufgabe steht, ist eine
 *    Schranke, was oben steht, eine Bitte. (Dieselbe Lehre wie bei den Chips im Agenten.)
 *
 * 2. „Situație (2):" — ein Etikett mit Nummer am Satzanfang. Das ist meine interne Zählung
 *    der Runden, und sie geht ihn nichts an: Er soll ein Gespräch führen, nicht einem
 *    Formular beim Zählen zusehen.
 */
/** Die Sprachzeile — sie steht zweimal im Auftrag: oben als Regel, unten als Schranke.
    KEIN `export`: Eine Route darf ausser den Handlern nichts nach aussen geben, sonst
    schlägt der Bau fehl (Next prüft das). */
const sprachzeile = (sprache?: string) =>
  `LETZTE PRÜFUNG VOR DEM ABSCHICKEN: Steht in deiner Antwort — in JEDEM Feld, auch mitten im Satz — ein einziges Wort, das nicht ${sprachname(sprache)} ist? Dann schreib es neu. Kein deutsches Wort in einem fremdsprachigen Satz, kein englisches, keins.`;

const regeln = (sprache?: string) => [
  "Du bist VersusForge, ein nüchterner Berater für Werbung und Kundengewinnung. Du sprichst mit einem Unternehmer oder Selbständigen.",
  `Sprache: Du schreibst AUSSCHLIESSLICH auf ${sprachname(sprache)} — jede Frage, jeder Satz, jedes Feld deiner Antwort. Und du duzt ihn.`,
  "Ton: ruhig, direkt, konkret. Niemals überschwänglich. Verboten sind 'Super', 'Großartig', 'Spannend', 'Tolles Projekt', 'Danke fürs Teilen'.",
  "FANG NIE MIT EINEM ETIKETT AN. Kein Feld und kein Thema ist ein Satzanfang: keine Wörter wie Situation, Stand, Schritt, Reaktion, Verkauf, Werbung — und schon gar keine Nummer dahinter. Er führt ein Gespräch, er sieht keinem Formular beim Zählen zu.",
  /**
   * ── DAS REZEPT BLEIBT DRINNEN, AUCH ÜBERSETZT (09.09.2026, im eigenen Prüflauf gefunden) ──
   *
   * Im rumänischen Durchgang stand „…ele acoperă deja partea de dovadă" — sie decken schon
   * den BELEG ab. Das ist einer der fünf Schritte, in seiner Sprache, offen im Gespräch. Der
   * Agent hat dieses Verbot seit heute; der Trichter hatte es nie.
   *
   * OWNER, 09.09.2026: „gute Restaurants veröffentlichen ihr Rezept auch nicht." Die fünf
   * Schritte sind das, was uns von einem Textbaukasten unterscheidet — wer sie aufzählt,
   * verschenkt sie.
   */
  "SPRICH NIE ÜBER DEINE ARBEITSWEISE. Verboten sind Zweck, Geschichte, Identität, Beweis, Knappheit, Nutzen, Herkunft, Wirkung, Beleg, Grenze, Hebel, Schritt, Stufe — und dasselbe in JEDER anderen Sprache, auch übersetzt.",
  "SAG NIE, WAS DIR NOCH FEHLT oder was schon abgedeckt ist. Solche Sätze zwingen dich, einen Arbeitsschritt zu benennen. Stell einfach die nächste Frage.",
  "Du erfindest NIE Fakten. Kennst du eine Zahl nicht, sagst du das, statt zu schätzen.",
  /**
   * ── ALLGEMEINWISSEN IST KEIN ERFINDEN (Owner 09.09.2026, nach dem Test mit amazon.de) ────
   *
   * „Würde ich ChatGPT fragen, würde es mir sofort sagen, was die machen, oder Gemini. Hier
   * würde ich ebenso eine schlaue Antwort geben, weil ich kaum glaube, dass jemand von Amazon
   * hier eine Analyse macht. Die Leute werden dieses Tool testen. Je schlauer wir sind, umso
   * wahrscheinlicher ist es, dass sie buchen."
   *
   * HIER STAND: „Was er nicht gesagt hat, weisst du nicht." Der Satz sollte verhindern, dass
   * wir einem Zahnarzt Erfolge andichten — und hat dabei auch das Weltwissen abgeschaltet.
   * Ergebnis: „amazon.de" ergab eine Entschuldigung statt einer Antwort, die jeder
   * Zwölfjährige geben kann.
   *
   * DIE GRENZE LÄUFT NICHT ZWISCHEN „gesagt" UND „nicht gesagt", sondern zwischen dem, was
   * JEDER wissen kann, und dem, was NUR ER wissen kann. Amazon verkauft alles Mögliche und
   * liefert schnell — das weiss die Welt. Wie viele Implantate Dr. Müller im Jahr setzt,
   * weiss nur Dr. Müller, und das bleibt gesperrt.
   *
   * WARUM ES GESCHÄFTLICH ZÄHLT: Die ersten Besucher sind Prüfer, keine Kunden. Sie tippen
   * eine bekannte Adresse ein, um zu sehen, ob die Maschine etwas taugt. Eine Antwort unter
   * ChatGPT-Niveau beantwortet diese Frage — mit Nein.
   */
  "ALLGEMEINWISSEN IST KEIN ERFINDEN. Nennt er eine bekannte Marke, ein bekanntes Unternehmen oder eine Adresse, die du kennst, dann weisst du, was dort angeboten wird — sag es knapp und richtig, wie ein Fachmann aus dem Kopf. Tu nie so, als wüsstest du es nicht.",
  "WAS NUR ER WISSEN KANN, ERFINDEST DU TROTZDEM NIE: seine Zahlen, seine Preise, seine Kunden, seine Termine, sein Verfahren, was ihn von der Konkurrenz unterscheidet. Danach fragst du.",
  /* DIE GRENZE, DIE DAS GANZE PRODUKT TRÄGT (Owner 08.09.2026): „Kein Wort über Einkommen."
     Wir wissen nicht, was jemand verdienen wird. Es zu behaupten wäre die Lüge, gegen die
     dieses Haus gebaut ist — und rechtlich die gefährlichste Zeile im ganzen Trichter. */
  "Du versprichst NIE ein Ergebnis in Geld, Kunden oder Bewerbern. Keine Zahl davon, keine Spanne, kein 'damit erreichst du'. Was er verdient, hängt an ihm, und das sagst du auch so.",
  /* Belohnung immer — dieselbe Regel wie bei David: Er gibt etwas her, er bekommt sofort
     etwas zurück, und zwar etwas Konkretes, das ohne SEINE Angabe nicht möglich wäre. */
  /**
   * DIE BELOHNUNG GEHÖRT IN GENAU EIN FELD (gemessen am ersten echten Durchlauf,
   * 08.09.2026). Vorher stand die Regel ohne Adresse hier oben — und das Modell hat sie
   * überall hingeschrieben: Die dritte FRAGE begann mit „Deine Angabe ermöglicht mir, die
   * Anzeigen geographisch zu schalten …", und der BEFUND im Plan fing an mit „Mit 15 € pro
   * Tag kann ich die Ausspielung planen". Beides sind Höflichkeitssätze an Stellen, an
   * denen der Leser eine Frage bzw. einen Befund erwartet.
   */
  "Belohnung immer: Gib zurück, bevor du das Nächste verlangst — EIN Satz, der benennt, was seine Angabe dir ermöglicht, so konkret, dass er ohne genau diese Angabe nicht dastehen könnte. Dieser Satz gehört AUSSCHLIESSLICH in das Feld 'verstanden' bzw. 'reaktion'. Er steht NIE in 'frage', 'befund', 'budget' oder 'warnung' — dort ist er eine Höflichkeit an der falschen Stelle.",
  /* GENAU EINE FRAGE — beim ersten Durchlauf gebrochen (08.09.2026): „Sollen die Anzeigen
     nur Kandidaten in Timișoara erreichen oder auch Pendler aus dem Umland bis zu welchem
     Radius und sollen Bewerber aus anderen Regionen oder Ländern angesprochen werden?" Das
     sind drei Fragen. Ein Mensch beantwortet davon eine und fühlt sich beim Rest ertappt —
     derselbe Fehler, den David am 28.08. gemacht hat. Die Regel steht jetzt mit ihrer
     Prüfung dabei, nicht als Wunsch. */
  "Du stellst IMMER genau EINE Frage. GENAU EIN Fragezeichen im ganzen Feld 'frage', höchstens zwei Sätze, kein 'oder ... und ob', keine Aufzählung, keine Klammerbeispiele. Fallen dir zwei Dinge ein, nimm das wichtigere und lass das andere weg.",
  /**
   * FRAG NIE NACH DEM, WOFÜR ER DICH BEZAHLT (Owner 08.09.2026, beim Zusehen: „Cine este
   * cumpărătorul țintă?" — „das weiss der Kunde selber nicht").
   *
   * Ein Bauträger hat keine definierte Zielgruppe im Kopf. Genau deshalb kommt er. Die
   * Frage danach dreht die Rollen um: Der Berater lässt sich die Beratung liefern, und der
   * Kunde steht mit einer Frage da, die er nicht beantworten kann — der sicherste Weg,
   * jemanden zum Abbrechen zu bringen ([[chat-no-personal-questions-buttons-only]]).
   *
   * Die Hausregel dazu gibt es längst: „Ableitbares fragt kein Modell"
   * ([[kein-token-fuer-abbrecher]]). Sie steht jetzt auch hier.
   *
   * DIE TRENNLINIE: Nur er kennt Preis, Budget, Termine, Ort und das, was ihn von anderen
   * unterscheidet — danach darfst du fragen. Zielgruppe, Kanal, Tonfall, Anzeigenformat und
   * Motiv leitest DU ab. Bist du dir unsicher, schlägst du vor und lässt ihn widersprechen;
   * ein Vorschlag zum Nicken ist etwas anderes als ein leeres Feld.
   */
  /**
   * ── DIE FÜNF HEBEL SIND DIE FRAGEN (Owner 09.09.2026, mit dem Karussell) ────────────────
   *
   * „Jetzt schau mal die Formel. Die Fragen, die wir stellen, müssen diese erfragen, bis wir
   * die zu 100% haben." · „Der Rest ist Technik."
   *
   * HIER STAND: „Du fragst NUR nach dem, was allein er wissen kann: Preis oder Konditionen,
   * Ort und Umkreis, Termine, und was ihn von anderen unterscheidet." Nicht falsch — aber es
   * ist die Einkaufsliste einer KAMPAGNE, nicht die eines HOOKS. Daraus liess sich eine
   * Anzeige schalten und kein Satz schreiben, der jemanden anhält. Am 09.09.2026 stand der
   * Beweis dafür im Dashboard: ein erzeugter Hook über nichts, weil im Plan zu keinem der
   * fünf Hebel Material lag.
   *
   * DIE VERSCHIEBUNG: Was allein er weiss, bleibt das Kriterium — aber gefragt wird danach,
   * WEIL es einen Hebel füllt, nicht weil es in einem Anzeigenformular steht. Preis, Ort und
   * Termine sind Technik und stehen meist ohnehin auf seiner Website.
   */
  HEBEL_AUFTRAG,
  /**
   * NIEMALS NACH DEM BUDGET FRAGEN (Owner 08.09.2026, beim ersten vollständigen Durchlauf
   * aufgefallen: Der Agent stellte dreimal dieselbe Budgetfrage und verbrannte damit drei
   * seiner vier Fragen).
   *
   * ZWEI GRÜNDE, und beide sind Hausrecht:
   *  · DAS BUDGET IST NICHT UNSERE ZAHL. Es geht direkt an Facebook, in der Höhe, die er
   *    selbst will (Owner: „hier zahlt er am Tag, was er zahlen will"). Danach zu fragen
   *    stellt uns zwischen ihn und sein eigenes Geld.
   *  · ER SCHLÄGT ES OHNEHIN SELBST VOR. Das Feld 'budget' im Plan nennt einen Tagesbetrag
   *    zum Ausprobieren. Erst zu fragen und dann doch selbst zu antworten, ist die
   *    Fragebogen-Masche, gegen die dieses Produkt gebaut ist ([[kein-token-fuer-abbrecher]]:
   *    „Ableitbares fragt kein Modell").
   */
  "FRAGE NIEMALS nach dem Werbebudget oder einem Tagesbetrag. Das Budget zahlt er selbst und direkt an Facebook; im Plan schlägst DU einen Betrag zum Ausprobieren vor. Eine Budgetfrage ist eine verschwendete Frage.",
  /**
   * KEINE FRAGE ZWEIMAL (08.09.2026, am selben Durchlauf gemessen). Vier Fragen sind das
   * ganze Gespräch; eine Wiederholung ist nicht bloss lästig, sie kostet ein Viertel des
   * Produkts. Und sie sagt dem Menschen, dass ihm nicht zugehört wurde.
   */
  "Du hast die bisherigen Fragen und Antworten vor dir. Stelle NIE eine Frage, die du schon gestellt hast — auch nicht anders formuliert. Hat er eine Frage nicht beantwortet, nimm es hin und frage nach etwas ANDEREM; im Plan gehst du dann von einer sinnvollen Annahme aus und schreibst sie hin.",
  "Du fragst NIE nach Zielgruppe, Kanal, Tonfall, Anzeigenformat oder Werbebotschaft. Das ist deine Arbeit, dafür kommt er zu dir. Diese Dinge leitest du aus seinen Angaben ab.",
  "Musst du bei einer solchen Sache doch nachhaken, dann als VORSCHLAG mit einer Ja-Nein-Frage: 'Ich gehe von jungen Familien aus, die zum ersten Mal kaufen — passt das?' Nie als offene Frage, auf die er keine Antwort hat.",
  "Du fragst NICHT nach Namen, Firma, Telefonnummer oder E-Mail. Das kommt am Ende, nicht im Gespräch.",
  /* Der Berater darf abraten. Genau das unterscheidet ihn vom Formular, das jede Eingabe
     annimmt — und es ist der Grund, warum jemand für ihn zahlt. */
  /**
   * EINE ANZEIGE BEWIRBT GENAU EINE SACHE (Owner 08.09.2026: „Ziel ist es, nicht dass jemand
   * alles reinhaut in einen Hook, sondern das beste Produkt, das er auf der Webseite hat oder
   * das er pushen will").
   *
   * Das ist die häufigste und teuerste Verwechslung in der Werbung: Wer „wir machen Fliesen,
   * Bäder, Heizung und Solar" bewirbt, bewirbt nichts — der Satz passt auf jeden Betrieb, und
   * der Daumen scrollt weiter. Eine Anzeige, die EINE Sache benennt, spricht weniger Leute an
   * und erreicht mehr.
   *
   * DER AGENT ENTSCHEIDET DAS NICHT ALLEIN: Was er auf der Website findet, ist die Auswahl —
   * welches davon beworben wird, weiss nur der Betrieb (Marge, Kapazität, was er loswerden
   * will). Also: finden, vorschlagen, ihn wählen lassen. Genau die Trennung wie überall hier —
   * ableiten, was ableitbar ist, fragen, was nur er weiss.
   */
  "EINE ANZEIGE BEWIRBT GENAU EINE SACHE. Nie einen ganzen Betrieb, nie eine Aufzählung von Leistungen. Findest du auf seiner Website mehrere Angebote, ist deine ERSTE Frage, welches davon beworben werden soll — mit den gefundenen als Vorschlägen zum Antippen.",
  "Sagt er es selbst (\"ich will X pushen\"), nimmst du das und fragst nicht noch einmal. Nennt er nichts und die Website gibt nur eines her, nimmst du dieses und sagst, dass du es genommen hast.",
  /* GEZEIGTE FÄLLE STATT EINER ABSTRAKTEN REGEL (Owner 08.09.2026, am Restaurant erklärt:
     „nicht das ganze Menü, sondern nur das beste Produkt — oder nur den Eventraum"). Ein
     Modell befolgt eine Regel schlechter als ein Muster, das es wiedererkennt. */
  "So sieht das aus: Ein Restaurant bewirbt NICHT \"gute Küche, Terrasse, Mittagstisch, Feiern\", sondern den Raum für Feiern — oder das Mittagsmenü — oder den Brunch. Ein Handwerker bewirbt NICHT \"Bad, Heizung, Fliesen, Solar\", sondern das Bad. Ein Zahnarzt nicht die Praxis, sondern die Implantate. Weniger Leute sehen es, mehr Leute melden sich.",
  /**
   * DIE GRENZEN — WOFÜR ER NIE EINE ANZEIGE BAUT (Owner 08.09.2026: „wenn sie sagen, ich
   * will Frauen verkaufen, dann?").
   *
   * Der Agent hatte bis dahin KEINE einzige Grenze. Er hätte für alles brav einen Plan
   * geschrieben — und der Plan trägt unseren Namen, läuft auf unserer Strecke und wird über
   * ein Werbekonto geschaltet, an dem wir hängen.
   *
   * ZWEI ARTEN VON GRENZE, und die zweite ist die, die im Alltag wirklich vorkommt:
   *  · Das Offensichtliche: Menschenhandel, sexuelle Dienstleistungen, Drogen, Waffen,
   *    gefälschte Papiere, Geldwäsche. Kommt selten und ist eindeutig.
   *  · Das Alltägliche: „junge Frauen für die Bar", „Deutsche bevorzugt", „bis 30". Das
   *    meint niemand böse, es ist in der EU trotzdem verboten — und es käme in DIESEM
   *    Produkt ständig vor, weil Stellenanzeigen sein halbes Geschäft sind.
   *
   * BEIM ZWEITEN WIRD NICHT ABGELEHNT, SONDERN UMFORMULIERT. Wer „junge Leute" sagt, meint
   * meistens „körperlich anstrengend, Schichtdienst" — und das darf in der Anzeige stehen.
   * Ablehnen würde einen ehrlichen Kunden vor den Kopf stossen; umformulieren macht seine
   * Anzeige besser UND zulässig.
   */
  /**
   * ZU BREIT VERBOTEN (Owner 08.09.2026: „Darf niemand Likör verkaufen? Was soll das?
   * Vielleicht sucht jemand einen Abnehmer").
   *
   * Vorher stand hier pauschal „Waffen", und der Agent lehnte ein lizenziertes
   * Jagdwaffengeschäft ab. Dieselbe Falle drohte bei Alkohol, Tabak, Glücksspiel und
   * Nahrungsergänzung — alles legale Gewerbe, alle geregelt, keines verboten.
   *
   * DER UNTERSCHIED IST NICHT „HEIKEL ODER NICHT", SONDERN „ERLAUBT ODER NICHT". Ein
   * Berater, der legale Betriebe abweist, weil ihm etwas unangenehm ist, ist kein Berater.
   * Und der Fall, den der Owner nennt, ist nicht einmal heikel: Wer einen ABNEHMER sucht,
   * wirbt an Händler, nicht an Verbraucher — dort greifen die Verbraucherschutzregeln der
   * Plattformen gar nicht.
   *
   * Was bleibt, ist das wirklich Verbotene. Kurz und ohne Grauzone.
   */
  /**
   * DIE GRENZE IST METAS WERBERICHTLINIE, NICHT UNSER GESCHMACK (Owner 08.09.2026: „wir
   * nehmen alles an, was Meta erlaubt").
   *
   * Das ist die bessere Regel, und zwar aus einem praktischen Grund: Eine Anzeige, die dort
   * nicht laufen darf, ist für den Kunden wertlos und für uns Arbeit umsonst. Alles andere
   * ist Kundschaft. Vorher stand hier meine eigene Liste, und die hat ein lizenziertes
   * Jagdwaffengeschäft und eine Likörbrennerei abgewiesen — beides legale Betriebe, beides
   * Geld, das wir nicht wollten, ohne dass jemand danach gefragt hätte.
   *
   * Der Owner hat die Linie dann selbst gezogen (08.09.2026): „Er kann keine Nacktheiten
   * darstellen oder Waffen verkaufen oder Prostitution. Aber alles andere darf man."
   *
   * Drei Dinge, sonst nichts — plus das, was ohnehin illegal ist und was er heute selbst
   * abgelehnt sehen wollte (Menschenhandel). Kürzer als jede Liste, die ich mir ausdenken
   * würde, und dieselbe Linie, die auch die Plattform zieht.
   */
  "GRENZE — DREI DINGE, SONST NICHTS: Du baust keine Anzeige für Nacktheit oder sexuelle Darstellungen, für den Verkauf von Waffen, und für Prostitution. Dazu kommt, was ohnehin verboten ist: Menschenhandel, Drogen, gefälschte Papiere, Geldwäsche, Schneeballsysteme.",
  "ALLES ANDERE NIMMST DU AN. Alkohol, Tabak, Glücksspiel, Nahrungsergänzung, Medizin, Finanzen, Immobilien, Bestattung, Kredite — alles Kundschaft wie jede andere. Dein Geschmack ist keine Grenze, und du gibst NIE ungefragt Hinweise zu Vorschriften: Was ein Betrieb rechtlich zu beachten hat, ist seine Sache, nicht Teil deines Plans.",
  /**
   * DAS VERBOT GILT DER DARSTELLUNG, NICHT DER BRANCHE (Owner 08.09.2026: „er kann sogar
   * Unterwäsche verkaufen, das ist doch erlaubt" · „er kann für seine Nightbar werben").
   *
   * Meine Regel hätte beide abgewiesen, und das wäre falsch gewesen: Ein Wäschegeschäft ist
   * Einzelhandel, eine Bar ist Gastronomie. Verboten ist, was in der ANZEIGE zu sehen wäre —
   * Nacktheit —, nicht das Gewerbe dahinter.
   *
   * UND FÜR GENAU DIESE ZWEI HAT DAS HAUS DIE PASSENDEN MITTEL: das Anprobe-Video (ein
   * Kleidungsstück an einer Person, aus einem Foto erzeugt) und den Tanz-Spot. Sie sind für
   * Endkunden gebaut worden und werden hier zum Anzeigenmotiv — dieselbe Maschine, anderer
   * Käufer.
   */
  "Das Verbot betrifft die DARSTELLUNG, nicht die Branche: Ein Wäsche- oder Bademodengeschäft, eine Bar, ein Nachtclub, ein Tanzstudio, ein Massage- oder Wellnessstudio, ein Kosmetikstudio sind normale Kunden. Du baust ihre Anzeige — nur ohne Nacktheit.",
  /**
   * MASSAGE IST EIN GEWERBE (Owner 08.09.2026: „auf Publi24 machen Frauen Werbung für
   * Massage").
   *
   * Physiotherapie, Sport- und Wellnessmassage sind Kundschaft wie jede andere, und der
   * Agent behandelt sie auch so — ohne Nachfrage, ohne Verdacht. Wer ein Studio betreibt,
   * soll nicht erklären müssen, dass er ein Studio betreibt.
   *
   * DIE GRENZE BLEIBT, WO SIE WAR: Verdeckte Prostitutionswerbung („diskret", „Hausbesuche
   * rund um die Uhr", „nur für Herren") ist etwas anderes als ein Studio — und sie läuft auf
   * Facebook ohnehin nicht. Der Grund, sie nicht zu bauen, ist deshalb kein moralischer: Am
   * Werbekonto des Hauses hängt jeder Kunde. Eine Sperre dort trifft nicht einen Auftrag,
   * sondern alle.
   */
  "Massage-, Wellness- und Kosmetikstudios sind gewöhnliche Betriebe. Behandle sie wie ein Restaurant: keine Rückfrage, kein Verdacht, kein Hinweis. Nur wenn die Beschreibung selbst eindeutig auf sexuelle Dienstleistungen zielt, greift die Grenze oben.",
  "Für Kleidung und Wäsche kannst du als Motiv vorschlagen, das Stück an einer bekleideten Person zu zeigen, aus einem Produktfoto erzeugt. Für eine Bar oder einen Club einen kurzen Spot mit Bewegung und Musik. Beides stellt das Haus her — beschreibe es als Motiv, nicht als Zusatzprodukt.",
  /* Stellenanzeigen sind bei Meta eine Sonderkategorie: Alter und Geschlecht lassen sich dort
     gar nicht ansteuern. Das Umformulieren ist also keine Moral, sondern das, was die
     Plattform verlangt — und es macht die Anzeige besser. */
  "Bei Stellenanzeigen behandelt Meta die Werbung als Sonderkategorie: Alter und Geschlecht lassen sich als Zielgruppe nicht einstellen. Formuliere Anforderungen deshalb nach der Sache (Sprachniveau, Schichtdienst, körperliche Arbeit) statt nach der Person — das ist keine Belehrung, sondern die Voraussetzung, dass die Anzeige überhaupt läuft.",
  /**
   * AUF DIESER STRECKE VERKAUFT NIEMAND (Owner 08.09.2026: „der kann hier eh nichts
   * verkaufen, er kann Anfragen finden — verkaufen kann nur ich").
   *
   * Und daraus folgt, was hier NICHT mehr steht: Vorher sollte der Agent bei geregelten Waren
   * einen Satz über Alters- und Ländergrenzen in den Plan schreiben. Der Owner hat das
   * gestrichen — „das interessiert mich nicht, was er am Hals hat wegen Alkohol, er sucht
   * Abnehmer, E-Mail-Adressen, Telefone."
   *
   * Er hat recht: Das ist die Rechtslage SEINES Betriebs, nicht Teil unseres Plans. Ein Plan,
   * der ungefragt über Vorschriften belehrt, klingt nach Anwalt und nicht nach Werbung — und
   * er beantwortet eine Frage, die niemand gestellt hat.
   */
  "Sag dabei ausdrücklich, dass auf der Strecke NICHTS verkauft wird: Sie sammelt Anfragen, der Abschluss passiert danach zwischen ihm und dem Interessenten. Beschreibe niemals einen Kauf, eine Bestellung oder eine Zahlung auf seiner Seite.",
  "Sucht jemand einen ABNEHMER, HÄNDLER oder Vertrieb statt Endkunden, sag das ausdrücklich: Die Anzeige richtet sich dann an Betriebe, nicht an Verbraucher, und der Trichter endet in einem Gespräch, nicht in einem Kauf.",
  "Erkennst du so etwas, setzt du 'abgelehnt' auf true, sagst in EINEM ruhigen Satz, dass du dafür nichts baust, und stellst KEINE Frage. Keine Belehrung, kein Vortrag — ein Satz.",
  "Diskriminierung lehnst du NICHT ab, du formulierst sie um: Geschlecht, Alter, Herkunft, Religion, Familienstand oder Gesundheit dürfen in einer Stellenanzeige nicht als Anforderung stehen. Sagt er 'junge Frauen', 'Deutsche bevorzugt' oder 'bis 30', nimmst du an, was er wirklich meint (körperliche Arbeit, Schichtdienst, Sprachniveau) und schreibst DAS. Sag ihm in einem Halbsatz, dass du es so formuliert hast und warum — dann lernt er etwas, statt sich abgewiesen zu fühlen.",
  "Du sagst es, wenn ein Vorhaben so nicht aufgeht — zu kleines Budget, zu enge Zielgruppe, zu kurze Zeit. Immer mit dem, was stattdessen ginge. Nie ein unangenehmer Satz ohne nächsten Schritt.",
].join(" ");

/** Was bisher gesagt wurde — geht in jeden Auftrag, damit er sich nicht wiederholt. */
/**
 * WELCHE HEBEL SCHON MATERIAL HABEN — als Liste direkt vor die Aufgabe (09.09.2026).
 *
 * DER ZWECK GILT ALS GEFÜLLT, sobald er seinen Satz geschrieben oder seine Website genannt
 * hat: Wofür sein Angebot da ist, steht dort. Ihn trotzdem zu fragen wäre eine der vier
 * Fragen für etwas, das schon dasteht.
 */
/**
 * Den Stand aus der Modellantwort holen — nur die fünf bekannten Schlüssel, nur 0…100.
 *
 * EIN FEHLENDER WERT IST 0, KEIN LOCH: Die Anzeige zeigt fünf Zeilen; eine Zeile ohne Zahl
 * sähe aus wie ein Fehler, obwohl „nichts dazu" die richtige Auskunft ist.
 */
function standAus(roh: unknown): Record<string, number> {
  const o = (roh ?? {}) as Record<string, unknown>;
  const raus: Record<string, number> = {};
  for (const h of HEBEL) {
    const n = Math.round(Number(o[h.schluessel]));
    raus[h.schluessel] = Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
  }
  return raus;
}

function hebelStand(runden?: Runde[]): string {
  const gefuellt = new Set((runden ?? []).map(r => String(r.hebel ?? "")).filter(Boolean));
  return [
    "STAND DER FÜNF HEBEL — frag nach dem obersten, der noch OFFEN ist:",
    ...HEBEL.map(h => `  ${gefuellt.has(h.schluessel) ? "GEFÜLLT " : "OFFEN   "} ${h.schluessel} (${h.name})`),
    "Ein Hebel, zu dem seine Antwort nichts Konkretes hergab, gilt als OFFEN — hak dort nach, statt weiterzugehen.",
  ].join("\n");
}

const lage = (b: Briefing) => {
  const teile = [
    /* Die Beschreibung muss so weit sein wie der Knopf: „Er sucht Mitarbeiter" hätte das
       Modell bei zwanzig Wohnungen in die falsche Richtung geschickt. */
    /* BEIDE WEGE ENDEN IN EINER LISTE (Owner 08.09.2026). Es gibt keine Kasse und keinen
       Shop — auch beim Verkaufen hinterlässt der Mensch seine Angaben und der Anbieter
       ruft an. Das Modell darf deshalb nie einen Kaufabschluss auf der Seite beschreiben. */
    "ERGEBNIS: In beiden Fällen ist das Ziel der Werbung eine LISTE — Menschen hinterlassen ihre Angaben, den Abschluss macht danach ein Mensch. Es gibt KEINEN Shop, KEINE Kasse und KEINE Zahlung auf der Seite. Beschreibe nie einen Kauf auf der Seite.",
    /* DAS ZIEL IST EIN HINWEIS, KEINE ANSAGE (08.09.2026, seit die zwei Knöpfe raus sind):
       Es kommt nur noch von einem angetippten Beispiel oder aus dem Vorgabewert. Was wirklich
       gemeint ist, steht in seinem Satz — „wir brauchen Pflegekräfte" und „ich verkaufe
       Wohnungen" sind nicht zu verwechseln. Wer dem Hinweis blind folgt, schreibt eine
       Stellenanzeige für einen Wohnungsverkauf. */
    `HINWEIS (kann falsch sein, sein Satz zählt mehr): ${b.ziel === "leads" ? "vermutlich sucht er Menschen zum Einstellen." : "vermutlich verkauft er etwas."}`,
    /**
     * DREI LAGEN, NICHT ZWEI (Owner 08.09.2026: „kann ich hier auch, ich will einen
     * Spitzenjob bekommen? Das wäre für einen Topmanager").
     *
     * Die dritte ist die verkehrte Richtung: Nicht ein Betrieb sucht Menschen, sondern ein
     * Mensch sucht einen Platz. Mechanisch dasselbe — am Ende steht eine Liste —, inhaltlich
     * das Gegenteil. Ohne diese Zeile hätte das Modell aus „ich will einen besseren Job"
     * eine Stellenanzeige gemacht, in der er MITARBEITER sucht.
     */
    /* Die Portalnamen kommen aus der Tabelle, passend zu Markt UND Lage — das Modell wählt
       aus, es erfindet nicht. Ein Portal, das es im Land nicht gibt, wäre schlimmer als
       keines. */
    `DIE PORTALE, GEGEN DIE ER HEUTE ANTRITT (nur diese Namen sind erlaubt, erfinde keine anderen): ${[
      ...portaleFuer(b.sprache ?? "de", "leads"),
      ...portaleFuer(b.sprache ?? "de", "verkauf"),
      ...portaleFuer(b.sprache ?? "de", "person"),
    ].filter((v, i, a) => a.indexOf(v) === i).join(", ")}. Nenne im Plan HÖCHSTENS EINES davon, und nur das, das zu seiner Lage passt — als Abgrenzung („statt eine Anzeige auf X zu bezahlen"), nie als Bewertung von X.`,
    "ERKENNE SELBST aus seinem Satz, welche von drei Lagen vorliegt: (1) ein Betrieb sucht Menschen zum Einstellen, (2) jemand verkauft etwas, (3) EIN MENSCH SUCHT FÜR SICH SELBST einen Job oder Aufträge — dann wirbt er für sich, und melden sollen sich Firmen bei ihm. Sag es in deiner ersten Antwort mit einem halben Satz, damit er merkt, dass du ihn verstanden hast — und frag NICHT danach.",
    /* Bei Lage 3 ist die Seite nicht die Firma, sondern der Mensch — und das Werbemittel ist
       er selbst. Ohne diesen Satz baut das Modell eine Firmenseite für eine Person. */
    "Bei Lage (3) ist die Strecke eine EIGENE SEITE ÜBER IHN: was er kann, belegt an dem, was er gemacht hat, dazu ein kurzes Video, in dem er selbst spricht, und ein Kontaktformular. Sein Lebenslauf wird NICHT verschickt — Firmen melden sich bei ihm.",
    /**
     * DIE SEITE UND DAS VIDEO GIBT ES SCHON (Owner 08.09.2026: „Landingpage mit Lebenslauf,
     * Video, das kann er über den Chat bekommen").
     *
     * Ohne diesen Satz beschreibt der Plan etwas, das erst gebaut werden müsste — und der
     * Kunde liest ein Versprechen statt einer Beschreibung. Beides existiert im Haus: Das
     * Dossier entsteht aus seinem Lebenslauf, das Video aus einem Skript, beides im
     * bestehenden Gespräch. Zu bauen ist hier nur die Anzeige davor.
     */
    "Bei Lage (3) sagst du im Trichter ausdrücklich, WOHER Seite und Video kommen: Sie entstehen in einem Gespräch, in dem er seinen Lebenslauf hochlädt und Fragen beantwortet — daraus wird die Seite und das Skript für sein Video. Beschreibe es als etwas Vorhandenes, nicht als etwas, das gebaut wird.",
    /* Sein Arbeitgeber liest Anzeigen. Wer das nicht mitdenkt, kostet jemanden die Stellung. */
    "Bei Lage (3) fragst du früh, ob er noch in Stellung ist. Ist er es, gehört Diskretion in den Plan: kein Name in der Anzeige, die Seite nicht bei Suchmaschinen, kein Hinweis auf den jetzigen Arbeitgeber. Sag ihm das von dir aus, er denkt in dem Moment nicht daran.",
    b.text ? `SEIN SATZ: ${b.text}` : "ER HAT NICHTS GESCHRIEBEN — nur seine Adresse angegeben.",
    b.seite ? `WAS AUF SEINER WEBSITE STEHT (von dir gelesen): ${b.seite}` : "",
  ];
  if (b.runden?.length) {
    teile.push("BISHERIGE FRAGEN UND ANTWORTEN:");
    b.runden.forEach((r, i) => teile.push(`${i + 1}. ${r.frage}\n   Antwort: ${r.antwort || "(übersprungen)"}`));
  }
  return teile.filter(Boolean).join("\n");
};

/**
 * EINE RUNDE TRÄGT JETZT IHREN HEBEL (09.09.2026).
 *
 * Ohne ihn müsste bei jedem Zug erraten werden, was schon gefüllt ist — und das Modell
 * fragte zweimal dasselbe unter anderem Namen. Der Schlüssel reist im Gesprächsverlauf mit,
 * so wie die Frage selbst. Optional, damit ein Verlauf aus einer älteren Fassung nicht
 * bricht.
 */
type Runde = { frage: string; antwort: string; hebel?: string };
type Briefing = {
  ziel: "leads" | "verkauf"; text: string; sprache?: string; runden?: Runde[];
  /** Die Adresse, die er eingegeben hat — im ersten Schritt gelesen. */
  url?: string;
  /** Was auf seiner Seite steht, in zwei, drei Sätzen. Der Browser trägt es weiter, damit
      die Seite nur EINMAL geholt wird und nicht bei jeder Frage erneut. */
  seite?: string;
};

/**
 * OFFENSICHTLICHER UNSINN WIRD ERKANNT, BEVOR ER GELD KOSTET (Owner 08.09.2026: „was
 * passiert, wenn jemand einen Blödsinn reinschreibt? Und immer wieder").
 *
 * Der Deckel fängt den Schaden, aber jeder der fünf Versuche kostet trotzdem. Diese Prüfung
 * kostet nichts und fängt, was man ohne Modell erkennt: Tastaturgeklapper, ein einzelnes
 * Wort, eine Zeile aus einem Zeichen.
 *
 * ABSICHTLICH GROB: Ein strenger Filter wiese echte Eingaben ab — „Vand apartamente" ist kurz
 * und richtig. Lieber ein Unsinn zu viel durchgelassen als ein Kunde abgewiesen.
 */
const wirktWieUnsinn = (t: string): boolean => {
  const s = t.trim().toLowerCase();
  if (!s) return true;
  const woerter = s.split(/\s+/).filter(Boolean);
  if (woerter.length < 2) return true;
  if (!/[aeiou\u00e4\u00f6\u00fc\u00e0\u00e2\u00ee\u0219\u021b]/i.test(s)) return true;
  const ohne = s.replace(/\s/g, "");
  const haeufigste = Math.max(...[...new Set(ohne)].map(z => ohne.split(z).length - 1));
  return haeufigste > ohne.length * 0.5;
};

/**
 * WIE DER TRICHTER HEISST — und warum NICHT einfach nach der analysierten Adresse
 * (Owner 09.09.2026: „hier werden die Leute auch andere Webseiten testen, das ist dir doch
 * klar. Sie werden dich testen").
 *
 * ER HAT RECHT, UND DAS WAR EINE ECHTE LÜCKE. Der Name kam bis hierher aus der Adresse, die
 * analysiert wurde. Wer zum Ausprobieren `coca-cola.de` eintippt und danach seine E-Mail
 * hinterlässt, bekam einen laufenden Trichter unter `versusforge.com/coca-cola` — eine
 * fremde Marke, öffentlich erreichbar, auf unserer Domain. Kein Angriff nötig, ein
 * Neugieriger genügt.
 *
 * DIE REGEL, DIE DAS LÖST: Die Adresse gibt den Namen nur her, wenn sie zu SEINER E-Mail
 * passt. `info@praxis-mueller.de` plus `praxis-mueller.de` — das ist derselbe Betrieb, und
 * dann ist `versusforge.com/praxis-mueller` genau richtig. Alles andere fällt auf die
 * E-Mail zurück.
 *
 * BEI FREIMAILERN AUF DEN NAMENSTEIL: Aus `dr.mueller@gmail.com` wird `dr-mueller`, nicht
 * `gmail`. Sonst hiessen alle Trichter gleich und `freierName` hängte Nummern an.
 *
 * ANALYSIEREN DARF ER TROTZDEM JEDE SEITE. Das ist der Test, mit dem wir gewinnen, und er
 * bleibt offen (Memory `eigene-adressen-nicht-analysieren`: nur die EIGENEN Domains sind
 * gesperrt). Was hier begrenzt wird, ist nicht das Lesen, sondern das Aufstellen eines
 * Schildes mit fremdem Namen.
 */
const FREIMAILER = new Set([
  "gmail", "googlemail", "web", "gmx", "yahoo", "hotmail", "outlook", "live", "icloud",
  "me", "aol", "protonmail", "proton", "mail", "t-online", "freenet", "posteo", "yandex",
]);

function trichterName(url: string, mail: string): string {
  const nackt = (a: string) => a.replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0].toLowerCase();
  const seite = nackt(url);
  const [ortsteil = "", mailHost = ""] = mail.toLowerCase().split("@");
  const mailDomain = mailHost.split(".")[0] ?? "";

  /* Die Adresse zählt nur, wenn sie zu seiner E-Mail gehört. */
  if (seite && mailHost && (seite === mailHost || seite.endsWith(`.${mailHost}`) || mailHost.endsWith(`.${seite}`))) {
    return seite.split(".")[0];
  }
  if (mailDomain && !FREIMAILER.has(mailDomain)) return mailDomain;
  return ortsteil || mailDomain;
}

const briefingAus = (body: Record<string, unknown>): Briefing | null => {
  const ziel = body.ziel === "leads" || body.ziel === "verkauf" ? body.ziel : null;
  const text = str(body.text, 2000);
  /* MIT ADRESSE REICHT EIN HALBER SATZ (Owner 08.09.2026): Wer seine Website zeigt, muss
     nicht auch noch erklären, was er tut — genau deshalb gibt er sie ja. */
  if (!ziel) return null;
  /* Acht Zeichen (09.09.2026): Der erste Satz sagt nur noch, WORUM es geht — die fünf
     Hebel füllen die Fragen. Der Unsinn-Filter darunter fängt Tastaturgeklapper ab. */
  if (text.length < 15 && !str(body.url, 300)) return null;
  const runden = (Array.isArray(body.runden) ? body.runden : [])
    .slice(0, MAX_FRAGEN)
    .map((r: unknown) => {
      const o = (r ?? {}) as Record<string, unknown>;
      /* Der Hebel reist im Verlauf mit — nur ein bekannter Schlüssel kommt durch. */
      const h = str(o.hebel, 40).trim().toLowerCase();
      return { frage: str(o.frage, 400), antwort: str(o.antwort, 1500), hebel: HEBEL.some(x => x.schluessel === h) ? h : "" };
    })
    .filter(r => r.frage);
  return { ziel, text, sprache: str(body.sprache, 5) || "de", runden, url: str(body.url, 300), seite: str(body.seite, 2000) };
};

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try { body = (await request.json()) as Record<string, unknown>; } catch { /* leer */ }

  /**
   * ── 0 · DIE ANFRAGE ANNEHMEN ──────────────────────────────────────────────
   *
   * STEHT VOR ALLEM ANDEREN, und zwar aus zwei Gründen:
   *
   * KEIN MODELL. Eine Adresse entgegenzunehmen kostet keinen Aufruf, also darf sie auch nicht
   * am fehlenden Schlüssel scheitern. Wäre das Guthaben leer, gingen sonst ausgerechnet die
   * fertigen Anfragen verloren — die einzigen, die schon Geld wert sind.
   *
   * KEIN DECKEL. Gezählt wird der Einstieg. Wer bis hierher gekommen ist, hat seinen Lauf
   * längst bezahlt; ihn am Schluss abzuweisen, wäre die teuerste Art zu sperren.
   */
  if (str(body.schritt, 20) === "lead") {
    const mail = str(body.mail, 200).trim();
    /* Dieselbe Prüfung wie im Browser — der Browser ist nur die Anzeige, nicht die Wache. */
    if (!mail.includes("@") || mail.length < 5) {
      return NextResponse.json({ error: "Ohne Adresse kann ich dir nichts schicken." }, { status: 400 });
    }
    /* Wessen Trichter das war. Heute schickt niemand einen mit — dann ist es unserer.
       Sobald ein Kunde seinen eigenen Trichter betreibt, trägt sein Trichter die Kennung,
       und die Anfrage landet in SEINEM Fach, ohne dass hier etwas geändert werden muss. */
    const mandant = mandantSauber(str(body.mandant, 40)) || EIGENER_MANDANT;
    const ok = await leadSpeichern(mandant, {
      mail,
      ziel: str(body.ziel, 40),
      text: str(body.text, 2000),
      url: str(body.url, 300),
      sprache: str(body.sprache, 5) || "de",
      plan: body.plan ?? null,
      runden: (Array.isArray(body.runden) ? body.runden : []).slice(0, 8).map((r: unknown) => {
        const o = (r ?? {}) as Record<string, unknown>;
        return { frage: str(o.frage, 400), antwort: str(o.antwort, 1500) };
      }).filter((r: { frage: string }) => r.frage),
      zeit: new Date().toISOString(),
    });
    /* Beim Fehlschlag NICHT „hat geklappt" sagen. Ein falsches Häkchen kostet die Anfrage
       endgültig — der Mensch geht davon aus, dass er dran ist, und meldet sich nie wieder. */
    if (!ok) return NextResponse.json({ error: "Das ging gerade nicht. Versuch es bitte gleich noch einmal." }, { status: 502 });

    let trichterLink = "";
    if (mandant === EIGENER_MANDANT) {
      try {
        /**
         * SEIN NAME KOMMT VON IHM, NICHT AUS SEINER ADRESSE (09.09.2026, im eigenen Prüflauf
         * gefunden: der Trichter hiess `geza1972` — der Teil vor dem @).
         *
         * Der Trichter fragt jetzt danach. Bleibt das Feld leer (alte Fassung im Browser,
         * abgeschaltetes Javascript), greift die alte Ableitung als Rückfall — schlechter,
         * aber besser als gar kein Trichter.
         */
        const genannt = str(body.betrieb, 120).trim();
        const wunsch = genannt || trichterName(str(body.url, 300), mail);
        const name = await freierName(wunsch);
        const angelegt = await mandantSpeichern(name, mandantAusPlan({
          /* Derselbe Grund wie beim Adressnamen: Was oben auf seiner Seite steht, darf keine
             fremde Marke sein, nur weil er sie analysiert hat. */
          name: wunsch || name,
          mail,
          /* Was er im zweiten Schritt genannt hat — steht damit gleich im Kopf seiner Seite. */
          webUrl: str(body.url, 300).trim(),
          plan: (body.plan ?? {}) as Record<string, unknown>,
          /* Der Schlüssel entsteht JETZT und wird nie zurückgegeben — er geht erst mit dem
             Kauf hinaus. Bis dahin gibt es keine Adresse, unter der die Anfragen zu sehen
             wären, auch nicht für den, der die Trichteradresse kennt. */
          schluessel: randomUUID().replace(/-/g, ""),
          loeschSchluessel: randomUUID().replace(/-/g, ""),
          /* SEINE SPRACHE WANDERT IN DEN TRICHTER (Owner 09.09.2026: „auch alles, was er
             erstellt … wird in der Sprache erstellt, die er spricht"). Sie steht schon in
             der Anfrage — der Plan wurde darin geschrieben; ohne diese Zeile stünden über
             einem rumänischen Hook deutsche Knöpfe. */
          sprache: str(body.sprache, 5) || "de",
          /* Sein Gerät — nur um seinen eigenen Testlauf später von einer echten Anfrage zu
             unterscheiden. Begründung bei `eigen` in lib/versusforge-lead.ts. */
          geraet: str(body.device, 80),
        }));
        if (angelegt) trichterLink = `/versusforge/${name}`;
      } catch (e) {
        console.error("[versusforge] Trichter NICHT angelegt", e);
      }
    }


    /**
     * ERST SPEICHERN, DANN VERSENDEN — nie umgekehrt.
     *
     * Die Anfrage ist das Geschäft, die Post ist die Lieferung. Scheitert der Versand, steht
     * sie trotzdem im Dashboard und ein Mensch ruft an. Andersherum wäre eine Mail draussen
     * und die Anfrage verloren.
     *
     * DER BROWSER ERFÄHRT, OB SIE UNTERWEGS IST. Ein „check, ist verschickt" über einer Mail,
     * die nie ankam, ist die teuerste Art zu lügen: Er wartet, statt sich zu melden. Kommt
     * `post: false` zurück, bietet der Trichter den Download an.
     */
    const post = await analysePerPost({
      an: mail,
      trichterLink,
      /* Die Mail spricht seine Sprache — sie ist oft das Letzte, was er von uns sieht. */
      sprache: str(body.sprache, 5) || "de",
      plan: (body.plan ?? {}) as Parameters<typeof analysePerPost>[0]["plan"],
      eingabe: str(body.text, 2000) || str(body.url, 300),
      runden: (Array.isArray(body.runden) ? body.runden : []).slice(0, 8).map((r: unknown) => {
        const o = (r ?? {}) as Record<string, unknown>;
        return { frage: str(o.frage, 400), antwort: str(o.antwort, 1500) };
      }).filter((r: { frage: string }) => r.frage),
    }).catch(() => false);

    /**
     * SEIN EIGENER TRICHTER, SOFORT (Owner 09.09.2026: „wenn ich den Tunnel durchgehe, als
     * Zahnarzt, dann bekomme ich den Link dazu zu dem Funnel" · „ist sofort echt jetzt. Der
     * User kann das testen. Aber er wird niemals das nutzen können ohne Dashboard. Das muss
     * er kaufen.").
     *
     * WARUM SOFORT UND OFFEN: Bis hierher hat er einen Plan gelesen — Text. Ein Link, den er
     * aufmachen kann, ist der Unterschied zwischen einem Versprechen und einem Beweis. Genau
     * dieser Beweis verkauft die 299, nicht ein Werbesatz.
     *
     * UND WAS IHN TROTZDEM NICHT REICHEN LÄSST: Anfragen laufen ein, aber lesen kann er sie
     * nur im Dashboard — und dafür braucht er den Schlüssel. Der Trichter ist die Vorführung,
     * das Dashboard ist die Ware.
     *
     * NUR FÜR UNSEREN EIGENEN TRICHTER. Wer schon Mandant ist, kommt hier nicht noch einmal
     * herein und legt sich einen zweiten an.
     *
     * SCHEITERT ES, SCHEITERT NICHT DER LAUF: Ohne Link bekommt er trotzdem seinen Plan und
     * seine Mail. Ein halb geglückter Trichter darf nicht die Anfrage kosten, die schon
     * gespeichert ist.
     */
    return NextResponse.json({ ok: true, post, trichterLink });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Der Berater ist gerade nicht erreichbar." }, { status: 503 });

  const schritt = str(body.schritt, 20);
  const b = briefingAus(body);
  if (!b) return NextResponse.json({ error: "Schreib mir bitte zwei, drei Sätze mehr." }, { status: 400 });

  /**
   * DER DECKEL GREIFT AM ANFANG EINES GESPRÄCHS, NICHT BEI JEDER FRAGE (08.09.2026).
   *
   * Gezählt wird der Einstieg — wer einmal drin ist, führt sein Gespräch zu Ende. Ein Deckel,
   * der jemanden nach der dritten Frage aussperrt, ist schlimmer als keiner: Er verbrennt
   * genau die Aufrufe, die schon bezahlt sind, und lässt einen Menschen vor einem halben Plan
   * stehen.
   *
   * DIE ANTWORT IST EIN SATZ, KEIN DREHRAD (Hausregel `immer-close-einbauen`): Wer hier
   * anschlägt, liest, dass es morgen weitergeht — er wartet nicht auf etwas, das nie kommt.
   */
  if (schritt === "briefing") {
    /* Erst der kostenlose Filter, dann der Deckel: Unsinn soll nicht einmal einen der fünf
       Versuche verbrauchen — sonst sperrt sich jemand mit Tippfehlern selbst aus. */
    /**
     * DAS EIGENE HAUS WIRD NICHT ANALYSIERT (Owner 08.09.2026).
     *
     * VOR dem Deckel und vor jedem Modellaufruf: Es kostet nichts und darf niemandem einen
     * seiner Versuche wegnehmen.
     *
     * KEINE ABWEISUNG, SONDERN EINE FRAGE. Ein „das darfst du nicht" wäre gegenüber jemandem,
     * der aus Neugier unsere eigene Adresse eintippt, die falsche Antwort — das sind
     * Interessenten, keine Angreifer. Der Trichter läuft weiter, er dreht sich nur um: Nicht
     * wir werden untersucht, sondern er wird gefragt. Damit ist der Satz gleichzeitig der
     * Beweis, dass der Agent merkt, was vor ihm liegt.
     */
    if (b.url && istEigeneAdresse(b.url)) {
      return NextResponse.json({
        frage: "Das sind wir — unsere eigene Seite analysieren wir nicht. Sag mir stattdessen, was DU anbietest, dann bauen wir deinen Plan.",
        eigen: true,
      });
    }

    if (!b.url && wirktWieUnsinn(b.text)) {
      return NextResponse.json({ error: "Schreib mir bitte in ein, zwei Sätzen, was du brauchst — oder gib die Adresse deiner Website an." }, { status: 400 });
    }
    /**
     * ── HIER WIRD NICHT MEHR ABGERECHNET (Owner 09.09.2026: „unterbricht er den Prozess,
     * dann zahlt er?") ────────────────────────────────────────────────────────────────────
     *
     * JA — UND DAS WAR FALSCH. Der Zähler stand am ERSTEN Schritt: Wer seinen Satz eintippte
     * und dann das Fenster schloss, hatte seine eine Gratis-Analyse verbraucht. Beim nächsten
     * Versuch stand die Kasse davor, für etwas, das er nie bekommen hat.
     *
     * DER PLAN IST DAS PRODUKT, also zählt der Plan. Bis dahin läuft nur ein Gespräch mit dem
     * kleinen Modell — Bruchteile eines Cents. Was hier bleibt, ist eine reine
     * Missbrauchsgrenze in Nachrichten, grosszügig und je Gerät ([[kein-token-fuer-abbrecher]]
     * gilt weiter: bezahlte Aufrufe erst nach bewusstem Ja).
     */
    const stand = await agentDeckel(str(body.device, 80));
    if (!stand.erlaubt) {
      return NextResponse.json({
        /* KEINE WAND, SONDERN EINE TÜR (Owner 08.09.2026). Wer die gratis Analyse gut fand,
           ist der beste Kunde, den dieser Trichter je sieht — ihn mit „morgen wieder"
           wegzuschicken, wäre der teuerste Satz der Seite. Der Browser macht aus
           `bezahlen: true` ein Angebot, keinen Fehler. */
        error: stand.grund === "bezahlen"
          ? "Deine kostenlose Analyse ist aufgebraucht."
          : "Für heute sind auf diesem Gerät genug Pläne gelaufen. Morgen geht es weiter.",
        bezahlen: stand.grund === "bezahlen",
        deckel: true,
      }, { status: 429 });
    }
  }

  /* ── 1 · BRIEFING: den einen Satz lesen und die erste Frage stellen ──────── */
  if (schritt === "briefing") {
    /**
     * DIE WEBSITE WIRD EINMAL GELESEN (Owner 08.09.2026: „er will dir seine URL zeigen …
     * sonst ist es ungenau").
     *
     * Genau hier, im ersten Schritt, und nirgends sonst: Der Text der Seite geht danach als
     * kurze Fassung an den Browser zurück und von dort in jeden weiteren Auftrag. Bei jeder
     * Frage erneut zu holen wäre langsam und für den fremden Server unhöflich.
     *
     * SCHEITERT ES, IST DAS KEIN FEHLER — es wird gesagt. Eine Seite, die ihren Inhalt erst
     * im Browser baut, gibt nichts her; dann fragt der Agent, statt zu raten.
     */
    let seitenText = "";
    let seitenFehler = "";
    if (b.url) {
      const f = await seiteLesen(b.url);
      if (f.ok) seitenText = `${f.titel}\n${f.text}`;
      else seitenFehler = f.grund;
    }

    const auftrag = [
      regeln(b.sprache),
      "AUFGABE: Er hat dir gerade gesagt, was er braucht — in einem Satz, mit seiner Website, oder beides. Antworte kurz und stelle deine ERSTE Rückfrage.",
      seitenText
        ? `SEINE WEBSITE, ROH GELESEN (Auszug, kann unvollständig sein):\n${seitenText}`
        : "",
      seitenText
        ? "'seiteKurz' — 2 bis 3 Sätze: was dieser Betrieb laut seiner Website TUT, für wen, und was ihn unterscheidet. NUR was dort steht; was du nicht findest, erfindest du nicht. Dieser Text wird dein Gedächtnis über ihn — er geht in jede weitere Frage."
        : "'seiteKurz' — leer lassen.",
      /**
       * UNSER WERKZEUGPROBLEM IST NICHT SEINE AUSKUNFT (Owner 09.09.2026, nach seinem Test
       * mit amazon.de: „deine Antwort ist schlecht und zeigt Inkompetenz. Dass du amazon.de
       * nicht lesen kannst, ist ein No-Go. Würde ich ChatGPT fragen, würde es mir sofort
       * sagen, was die machen").
       *
       * HIER STAND WÖRTLICH: „Sag ihm das in EINEM Halbsatz." Damit habe ich der Maschine
       * beigebracht, ihre eigene Panne als Ergebnis auszuliefern — „Deine Website lässt sich
       * bei mir nicht auswerten, weil sie im Browser aufgebaut wird." Kein Mensch hat nach
       * unserem Abrufwerkzeug gefragt. Was er hört, ist: das Ding kann weniger als ChatGPT.
       *
       * DASS DAS ABRUFEN SCHEITERT, IST NORMAL: Grosse Seiten bauen ihren Inhalt im Browser
       * auf oder weisen fremde Abrufe ab. Das wird sich nicht ändern, und es muss auch nicht
       * — für die BEKANNTEN Adressen braucht das Modell die Seite gar nicht.
       *
       * ALSO: NIE ERWÄHNEN, STATTDESSEN WISSEN BENUTZEN. Und wenn es die Adresse wirklich
       * nicht kennt (der Normalfall bei einer kleinen Praxis), fragt es nach seinem Angebot —
       * ohne einen Halbsatz darüber, dass etwas nicht ging.
       */
      seitenFehler
        ? [
            "WICHTIG — DAS ABRUFEN DER SEITE HAT NICHT GEKLAPPT. Erwähne das mit KEINEM Wort: nicht 'ich konnte nicht', nicht 'liess sich nicht auswerten', nicht 'im Browser aufgebaut', keine Entschuldigung. Es ist unser Werkzeug, nicht sein Problem.",
            "KENNST DU DIE ADRESSE ODER DIE MARKE, dann weisst du, was dort angeboten wird — sag es in 'verstanden' knapp und richtig, so wie es jeder Fachmann aus dem Kopf könnte, und arbeite von dort weiter.",
            "KENNST DU SIE NICHT, frag einfach nach seinem Angebot, als hättest du gar nicht erst geschaut.",
          ].join("\n")
        : "",
      "Gib zurück:",
      /* DIE ADRESSE MUSS VORKOMMEN, WENN ER EINE GENANNT HAT (Owner 09.09.2026: „im zweiten
         Schritt habe ich amazon.de eingegeben und das hast du oben nicht eingetragen"). Wer
         eine Adresse angibt und sie in der Antwort nicht wiederfindet, glaubt zu Recht, dass
         sie ignoriert wurde. */
      b.url
        ? "'verstanden' — EIN Satz, der zeigt, dass du seine ADRESSE und seinen Satz zusammen gelesen hast. Nenne, was dort angeboten wird, konkret und in seinen Begriffen. Keine Floskel, keine Zusammenfassung seiner Worte."
        : "'verstanden' — EIN Satz, der belegt, dass du seinen Satz gelesen hast: greif ein konkretes Wort daraus auf und sag, was du daraus schon ableitest. Keine Zusammenfassung seiner Worte, keine Floskel.",
      /* DIE ERSTE FRAGE FÜLLT DEN OBERSTEN OFFENEN HEBEL (09.09.2026). „Die wichtigste Lücke
         zuerst" hiess vorher: die Lücke der KAMPAGNE. Jetzt ist es die Lücke des HOOKS. */
      /**
       * WAS SCHON DASTEHT, WIRD NICHT GEFRAGT (Owner 09.09.2026: „falls jemand im ersten Feld
       * mehr erzählt und sogar die nächsten Fragen beantwortet, dann frag ihn nicht noch mal
       * danach. Kann sein, dass er dir alle Infos gibt, die du brauchst").
       *
       * DER FALL IST HÄUFIGER ALS GEDACHT: Wer sein Geschäft kennt, schreibt in fünf Zeilen
       * das hin, wofür ein Formular vier Fragen braucht — Angebot, Ort, was ihn
       * unterscheidet, warum er nicht jeden nimmt. Ihn danach trotzdem zu fragen, ist die
       * sicherste Art zu zeigen, dass man nicht gelesen hat. Genau der Vorwurf, gegen den
       * dieses Produkt gebaut ist.
       *
       * FRAGEN SIND EIN DECKEL, KEIN SOLL: Vier ist das Höchste, nicht das Ziel. Wer alles
       * mitgebracht hat, bekommt sofort seinen Plan — das ist kein Sparen, das ist der
       * bessere Dienst.
       */
      "'frage' — deine erste Rückfrage. Sie füllt den obersten Hebel, den sein Satz und seine Website noch nicht hergeben. Was daraus SCHON hervorgeht, fragst du NICHT noch einmal — auch nicht mit anderen Worten.",
      "'fertig' — true, wenn sein Satz und seine Website die Hebel schon so weit füllen, dass du einen Hook und einen Plan bauen könntest. Dann bleibt 'frage' leer und es wird gar nicht gefragt. Sei dabei ehrlich: Lieber eine Frage zu viel als ein Plan aus Vermutungen.",
      `'hebel' — welchen der fünf Hebel diese Frage füllen soll, genau eines dieser Wörter: ${HEBEL.map(h => h.schluessel).join(" | ")}.`,
      /**
       * DER STAND IN PROZENT (Owner 09.09.2026: „Nutzen identifizieren in Prozent, ob es
       * erfüllt ist oder nicht").
       *
       * ER IST DIE ANZEIGE DER MASCHINE. Ein Fortschrittsbalken sagt, wie lange es noch
       * dauert; diese fünf Zahlen sagen, WORAN gerade gearbeitet wird und was noch fehlt —
       * und sie erklären nebenbei, warum die nächste Frage kommt.
       *
       * ER IST EINE SELBSTEINSCHÄTZUNG ÜBER MATERIAL, keine Note für den Menschen. Deshalb
       * steht in der Anweisung, woran sie sich bemisst: an dem, was ein Hook daraus bauen
       * könnte. „Ich mache gute Arbeit" ist zu 10 % ein Beleg, „400 Implantate im Jahr" zu
       * 90 %.
       *
       * KEIN AUFRUF EXTRA: Er kommt in derselben Antwort mit.
       */
      `'stand' — ein Objekt mit genau diesen fünf Feldern: ${HEBEL.map(h => h.schluessel).join(", ")}. Je eine ganze Zahl von 0 bis 100: wie gut du diesen Hebel aus ALLEM füllen kannst, was du bis jetzt weisst (sein Satz, seine Website, seine Antworten). 0 = nichts. 100 = du könntest daraus sofort einen Hook bauen, den ein Fremder nicht schreiben könnte. Allgemeines Gerede liegt unter 20. Sei streng und beschönige nicht.`,
      "'warum' — höchstens 12 Wörter: welche Lücke diese Frage schliesst. Nur für uns, er sieht es nicht.",
      "'abgelehnt' — true, wenn sein Vorhaben unter die Grenzen oben fällt. Dann steht in 'verstanden' der eine ruhige Satz und 'frage' bleibt leer.",
      "'unklar' — true, wenn seine Eingabe keinen erkennbaren Sinn ergibt (Tastaturgeklapper, ein Gruss, eine Probe). Dann RATE NICHT: 'verstanden' sagt freundlich, dass du daraus nichts ableiten kannst, 'frage' bleibt leer.",
      /* EINE ADRESSE ALLEIN IST KEINE UNKLARE EINGABE (Owner 08.09.2026, mit Bild). Genau
         dafür ist das Feld da: Wer seine Website zeigt, hat gesagt, was er tut. Konnte sie
         nicht gelesen werden, ist die richtige Antwort eine FRAGE, keine Absage. */
      b.url
        ? "ER HAT EINE ADRESSE ANGEGEBEN. Setze 'unklar' NIEMALS auf true — eine Adresse ist eine gültige Eingabe. Konntest du die Seite nicht auswerten, sag das in einem Halbsatz und stelle als erste Frage, was er anbietet. Es kommt IMMER eine Frage zurück."
        : "",
      /**
       * ZU JEDER FRAGE EIN BEISPIEL (Owner 08.09.2026, mitten im Trichter: „was soll ich
       * schreiben?").
       *
       * Ein leeres Feld mit „Deine Antwort." ist kein Gespräch, sondern eine Prüfung. Wer
       * nicht weiss, in welcher Form geantwortet werden soll, schreibt zu wenig — und die
       * dünne Antwort ist dann seine Schuld, obwohl sie unsere ist. David löst das seit dem
       * 29.08. über den Platzhalter („das wird nicht gelesen, sowas gehört ins Eingabefeld").
       *
       * DAS BEISPIEL MUSS AUS SEINER LAGE KOMMEN, nicht allgemein sein: „Zum Beispiel: 4.200
       * Lei brutto plus Schichtzulage" hilft; „z. B. Ihre Gehaltsangabe" hilft nicht.
       */
      /**
       * VORSCHLÄGE ZUM ANTIPPEN (Owner 08.09.2026: „brauche Vorschläge" — direkt nachdem er
       * vor einem leeren Feld stand und fragte „was soll ich schreiben?").
       *
       * Hausregel [[chat-no-personal-questions-buttons-only]]: Der Nutzer will klicken, nicht
       * tippen. Ein Beispiel im Platzhalter erklärt die Form; drei Vorschläge ERSPAREN die
       * Antwort — und wer antippt, kann danach immer noch ändern.
       *
       * SIE DÜRFEN NICHTS ÜBER IHN BEHAUPTEN. Ein Vorschlag ist eine MÖGLICHKEIT, keine
       * Angabe: „Unbefristet, Vollzeit" ist eine Wahl, die er trifft. „4.200 Lei brutto" wäre
       * eine erfundene Tatsache über seinen Betrieb — genau das Verbot, unter dem der ganze
       * Agent steht. Deshalb: keine Zahlen, keine Namen, keine Orte in Vorschlägen.
       */
      /* Die Regel „keine Namen in Vorschlägen" gilt für ERFUNDENES. Was auf seiner eigenen
         Website steht, ist nichts Erfundenes — es ist gelesen, und genau dafür hat er sie
         gezeigt. */
      "'vorschlaege' — 2 bis 3 mögliche Antworten zum Antippen, je höchstens 6 Wörter. Es sind WAHLMÖGLICHKEITEN, keine Behauptungen über ihn: erfinde keine Zahlen, Preise oder Orte. AUSNAHME: Was auf seiner Website steht, darfst du wörtlich anbieten — bei der Frage nach dem Angebot sind die dort gefundenen Leistungen genau die richtigen Vorschläge. Passt die Frage nicht zu Vorschlägen, lass die Liste leer.",
      'Antworte NUR als JSON: {"verstanden":"...","abgelehnt":false,"unklar":false,"seiteKurz":"...","frage":"...","fertig":false,"hebel":"...","stand":{"zweck":0,"geschichte":0,"identitaet":0,"beweis":0,"knappheit":0},"warum":"...","vorschlaege":["..."]}',
      "",
      lage(b),
      sprachzeile(b.sprache),
    ].join("\n");

    const r = await frageModell(apiKey, KLEIN, [{ type: "input_text", text: auftrag }]);
    if (!r.ok) return NextResponse.json({ error: `Der Berater stockt gerade. ${r.fehler}` }, { status: r.status });

    const frage = str(r.daten.frage, 400);
    /**
     * ABGELEHNT UND UNVERSTANDEN SIND KEINE FEHLER, sondern richtige Antworten — und beide
     * kosten EINEN kleinen Aufruf statt fünf. Ohne diese Abzweigung hätte das Modell auch
     * aus „hallo test" ein Geschäft zusammengebaut und vier Fragen dazu gestellt.
     *
     * Der Grund steht dabei: Wer abgelehnt wird, soll wissen warum, und wer nur unklar
     * geschrieben hat, soll es noch einmal versuchen können.
     */
    if (r.daten.abgelehnt === true) {
      console.warn("[versusforge] abgelehnt:", b.text.slice(0, 80));
      return NextResponse.json({
        error: str(r.daten.verstanden, 300) || "Dafür baue ich keine Anzeige.",
        abgelehnt: true,
      }, { status: 400 });
    }
    if (r.daten.unklar === true || !frage) {
      return NextResponse.json({
        error: str(r.daten.verstanden, 300) || "Daraus kann ich nichts ableiten. Schreib mir bitte in ein, zwei Sätzen, was du brauchst.",
      }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      verstanden: str(r.daten.verstanden, 400),
      /* Zurück an den Browser, damit die Seite nur einmal geholt werden muss. */
      seite: str(r.daten.seiteKurz, 2000),
      frage,
      /* Welchen Hebel diese erste Frage füllen soll — der Browser trägt ihn zur Antwort
         zurück, damit der nächste Zug weiss, was schon dasteht. */
      hebel: (() => {
        const h = str(r.daten.hebel, 40).trim().toLowerCase();
        return HEBEL.some(x => x.schluessel === h) ? h : "";
      })(),
      /* Ohne Frage ist es fertig — egal, was das Modell im Feld behauptet. Sonst stünde der
         Mensch vor einem Gesprächsschirm ohne Frage. */
      fertig: r.daten.fertig === true || !frage,
      stand: standAus(r.daten.stand),
      vorschlaege: strListe(r.daten.vorschlaege, 3, 80),
      verbrauch: r.verbrauch,
    });
  }

  /* ── 2 · ANTWORT: bewerten und weiterfragen oder Schluss machen ──────────── */
  /* ── 2b · CHAT: ein echtes Gespräch statt vier Formularfelder ─────────────
   *
   * ── WARUM DAS DIE RICHTIGE FORM IST (Owner 09.09.2026) ─────────────────────────────────
   *
   * „Ich habe den Bewerbungsgenerator gemacht, aber ich passe meine Bewerbung immer noch
   * schneller über Claude Code hier an." · „Die lösen alle über den Chat." · „Wir müssen
   * dahin. Alles über den Chat zu lösen, und irgendwann wird es per Sprache gesteuert."
   *
   * DER SATZ ÜBER DEN BEWERBUNGSGENERATOR IST DER BEFUND: Der Eigentümer benutzt sein
   * eigenes Werkzeug nicht, weil ein Chat schneller ist. Der Grund ist nicht die Qualität
   * der Ausgabe, sondern dass ein Formular kein WIDERSPRECHEN kennt. Vier Fragen, eine
   * Antwort je Feld, ein Ergebnis — passt es nicht, fängt man von vorn an. Im Gespräch sagt
   * man „kürzer", „nein, das stimmt nicht", „gib mir drei andere", „warum der?".
   *
   * DIE FÜNF HEBEL BLEIBEN — ABER ALS AGENDA, NICHT ALS SCHRITTE. Der Agent weiss, was ihm
   * fehlt, und holt es sich im Gespräch, in beliebiger Reihenfolge und aus beliebig langen
   * Antworten. Der Mensch merkt davon nur die Anzeige, die sich füllt.
   *
   * DER TEURE AUFRUF BLEIBT EINER. Das Gespräch läuft auf dem kleinen Modell; der Plan wird
   * genau einmal gebaut, und erst wenn der Agent sagt, dass es reicht
   * ([[kein-token-fuer-abbrecher]]).
   */
  if (schritt === "chat") {
    const verlauf = (Array.isArray(body.verlauf) ? body.verlauf : [])
      .slice(-30)
      .map((x: unknown) => {
        const o = (x ?? {}) as Record<string, unknown>;
        return { rolle: o.rolle === "agent" ? "agent" : "mensch", text: str(o.text, 2000) };
      })
      .filter(m => m.text);

    const auftrag = [
      regeln(b.sprache),
      "AUFGABE: Du führst ein Gespräch. Antworte auf das, was er zuletzt geschrieben hat, und hol dir dabei, was dir für den Plan noch fehlt.",
      HEBEL_AUFTRAG,
      hebelStand(b.runden),
      /**
       * DIE DREI SÄTZE, DIE AUS EINEM FRAGEBOGEN EIN GESPRÄCH MACHEN. Ohne sie beantwortet
       * das Modell jede Nachricht mit der nächsten Frage — und dann ist es wieder ein
       * Formular, nur mit Sprechblasen.
       */
      "ER DARF ALLES SAGEN, NICHT NUR ANTWORTEN. Widerspruch, Rückfragen an dich, „mach das kürzer\", „gib mir drei andere\", „warum der?\" — geh darauf ein, bevor du irgendetwas anderes tust. Wer korrigiert wird, hat recht: Übernimm die Korrektur wortlos und arbeite damit weiter.",
      "KEINE FRAGE UM JEDEN PREIS. Hat seine Nachricht dir gerade viel gegeben, sag EINEN Satz dazu, was du daraus machst, und frag erst danach — oder gar nicht, wenn nichts mehr fehlt.",
      "ANTWORTE KURZ. Zwei bis vier Sätze, nie mehr. Er liest am Handy und will nicht lesen, sondern weiterkommen.",
      /**
       * EIN GRUSS BEKOMMT EINEN GRUSS (Owner 09.09.2026, nach seinem Test mit „hallo").
       *
       * Am Eingang stand ein Prüfer, der „hallo" mit einer roten Zeile abwies — mitten in
       * einem Produkt, das ein Gespräch sein soll. Der Prüfer ist weg, also muss der Agent
       * es können: freundlich antworten und die eine Frage stellen, mit der es losgeht.
       * NICHT belehren, nicht auf Regeln verweisen, nicht sagen, was er hätte schreiben
       * sollen.
       */
      "SCHREIBT ER NUR EINEN GRUSS ODER ETWAS OHNE ERKENNBAREN SINN, dann grüss zurück und frag in EINEM Satz, was er anbietet und wo. Keine Belehrung, kein Hinweis darauf, was er hätte schreiben sollen, keine Regeln. 'fertig' bleibt false und alle Stände bleiben 0.",
      "Gib zurück:",
      "'antwort' — was du ihm schreibst. Zwei bis vier Sätze, am Ende höchstens EINE Frage. PFLICHT, nie leer.",
      `'hebel' — an welchem der fünf du gerade arbeitest, genau eines dieser Wörter: ${HEBEL.map(h => h.schluessel).join(" | ")}. Leer, wenn du fertig bist.`,
      `'stand' — ein Objekt mit den fünf Feldern ${HEBEL.map(h => h.schluessel).join(", ")}, je 0 bis 100: wie gut du diesen Hebel aus ALLEM füllen kannst, was im Gespräch steht. 0 = nichts. 100 = du könntest sofort einen Hook bauen, den ein Fremder nicht schreiben könnte. Allgemeines Gerede liegt unter 20. Sei streng.`,
      /* „Fertig" ist ein ANGEBOT, kein Sprung: Der Plan kostet Geld, und der Mensch
         entscheidet, wann er ihn will (Hausregel „kein Token für Abbrecher"). */
      "'fertig' — true, wenn du genug für Hook, Zielgruppe und Plan hast. Dann endet deine 'antwort' mit dem Angebot, den Plan jetzt zu bauen — als Satz, nicht als Frage nach weiteren Angaben.",
      "'vorschlaege' — 2 bis 3 kurze Antwortmöglichkeiten zum Antippen, je höchstens 6 Wörter, ohne erfundene Zahlen, Preise oder Orte. Passt es nicht, lass die Liste leer.",
      'Antworte NUR als JSON: {"antwort":"...","hebel":"...","stand":{"zweck":0,"geschichte":0,"identitaet":0,"beweis":0,"knappheit":0},"fertig":false,"vorschlaege":["..."]}',
      "",
      lage(b),
      "",
      "DAS GESPRÄCH BIS HIER:",
      ...verlauf.map(m => `${m.rolle === "agent" ? "DU" : "ER"}: ${m.text}`),
      sprachzeile(b.sprache),
    ].join("\n");

    const r = await frageModell(apiKey, KLEIN, [{ type: "input_text", text: auftrag }]);
    if (!r.ok) return NextResponse.json({ error: `Der Berater stockt gerade. ${r.fehler}` }, { status: r.status });

    const hebelRoh = str(r.daten.hebel, 40).trim().toLowerCase();
    return NextResponse.json({
      ok: true,
      antwort: str(r.daten.antwort, 900),
      hebel: HEBEL.some(h => h.schluessel === hebelRoh) ? hebelRoh : "",
      stand: standAus(r.daten.stand),
      fertig: r.daten.fertig === true,
      vorschlaege: strListe(r.daten.vorschlaege, 3, 80),
      verbrauch: r.verbrauch,
    });
  }

  if (schritt === "antwort") {
    const gestellt = b.runden?.length ?? 0;
    const auftrag = [
      regeln(b.sprache),
      "AUFGABE: Er hat gerade geantwortet. Entscheide, wie es weitergeht.",
      `Bisher beantwortet: ${gestellt} von höchstens ${MAX_FRAGEN} Fragen.`,
      gestellt >= MAX_FRAGEN
        ? "Du hast alle Fragen gestellt. Setze 'fertig' auf true und lass 'frage' leer."
        : "Frage nur weiter, wenn noch ein HEBEL leer ist. Sind alle gefüllt, setze 'fertig' auf true.",
      /**
       * DER STAND DER FÜNF HEBEL, WÖRTLICH VOR AUGEN (09.09.2026, dieselbe Lehre wie bei den
       * schon gestellten Fragen weiter unten): Eine Regel unter dreissig Regeln ist eine
       * Bitte, eine Liste unmittelbar vor der Aufgabe ist eine Schranke.
       */
      hebelStand(b.runden),
      "Gib zurück:",
      /* Die Rückgabe ist Pflicht und darf wehtun ([[agenten-die-rueckgabe]]): Wer eine dünne
         Antwort gibt, muss es JETZT erfahren und nicht am Ende im Plan — dann kann er sie
         noch verbessern. */
      "'reaktion' — deine sofortige, ehrliche Einschätzung dieser Antwort, ein bis zwei Sätze. PFLICHT, nie leer. Sag, was sie für die Werbung wert ist, und was daraus folgt. Ist sie zu allgemein, sag es klar und nenne die Folge.",
      "Ist die Antwort wirklich brauchbar, sag es — aber immer mit dem Grund, also mit dem konkreten Stück, das sie brauchbar macht. Lob ohne Grund lässt du weg.",
      /**
       * DIE SCHON GESTELLTEN FRAGEN WÖRTLICH VOR AUGEN (08.09.2026, an zwei vollständigen
       * Durchläufen gemessen).
       *
       * Die allgemeine Regel „stelle keine Frage zweimal" stand bereits oben in `regeln()` —
       * und wurde trotzdem gebrochen: Der Agent fragte „Was verlangst du für die Raummiete?"
       * und im nächsten Zug „Wie viel verlangst du für die Raummiete?". Eine Regel unter
       * dreissig anderen Regeln ist eine Bitte; eine Liste unmittelbar vor der Aufgabe ist
       * eine Schranke.
       *
       * WARUM ES SO WEH TUT: Vier Fragen sind das ganze Gespräch. Eine Wiederholung kostet
       * ein Viertel des Produkts — und sagt dem Menschen, dass ihm nicht zugehört wurde.
       */
      ...(b.runden?.length
        ? [
            "DIESE FRAGEN HAST DU SCHON GESTELLT — keine davon noch einmal, auch nicht mit anderen Worten:",
            ...b.runden.map((r, i) => `  ${i + 1}. ${r.frage}`),
            "Wenn eine davon unbeantwortet blieb, lass sie los. Frage nach etwas ANDEREM oder sei fertig; im Plan nimmst du dann eine vernünftige Annahme und schreibst sie hin.",
          ]
        : []),
      "'frage' — die nächste Frage, oder leer, wenn du fertig bist. Sie muss sich klar von jeder Frage oben unterscheiden.",
      `'hebel' — welchen der fünf Hebel deine NÄCHSTE Frage füllen soll, genau eines dieser Wörter: ${HEBEL.map(h => h.schluessel).join(" | ")}. Leer, wenn du fertig bist.`,
      /**
       * DER STAND IN PROZENT (Owner 09.09.2026: „Nutzen identifizieren in Prozent, ob es
       * erfüllt ist oder nicht").
       *
       * ER IST DIE ANZEIGE DER MASCHINE. Ein Fortschrittsbalken sagt, wie lange es noch
       * dauert; diese fünf Zahlen sagen, WORAN gerade gearbeitet wird und was noch fehlt —
       * und sie erklären nebenbei, warum die nächste Frage kommt.
       *
       * ER IST EINE SELBSTEINSCHÄTZUNG ÜBER MATERIAL, keine Note für den Menschen. Deshalb
       * steht in der Anweisung, woran sie sich bemisst: an dem, was ein Hook daraus bauen
       * könnte. „Ich mache gute Arbeit" ist zu 10 % ein Beleg, „400 Implantate im Jahr" zu
       * 90 %.
       *
       * KEIN AUFRUF EXTRA: Er kommt in derselben Antwort mit.
       */
      `'stand' — ein Objekt mit genau diesen fünf Feldern: ${HEBEL.map(h => h.schluessel).join(", ")}. Je eine ganze Zahl von 0 bis 100: wie gut du diesen Hebel aus ALLEM füllen kannst, was du bis jetzt weisst (sein Satz, seine Website, seine Antworten). 0 = nichts. 100 = du könntest daraus sofort einen Hook bauen, den ein Fremder nicht schreiben könnte. Allgemeines Gerede liegt unter 20. Sei streng und beschönige nicht.`,
      "'gefuellt' — hat die GERADE gegebene Antwort ihren Hebel wirklich gefüllt? true oder false. Eine allgemeine Antwort füllt ihn nicht; dann bleibt der Hebel offen und du hakst dort nach.",
      "'fertig' — true, wenn du genug weisst für eine Zielgruppe, ein Motiv und einen Budgetvorschlag.",
      "'vorschlaege' — 2 bis 3 mögliche Antworten auf deine nächste Frage, zum Antippen, je höchstens 6 Wörter. WAHLMÖGLICHKEITEN, keine Behauptungen über ihn: keine Zahlen, keine Preise, keine Orte, keine Namen. Passt es nicht oder bist du fertig, lass die Liste leer.",
      'Antworte NUR als JSON: {"reaktion":"...","frage":"...","hebel":"...","gefuellt":true,"stand":{"zweck":0,"geschichte":0,"identitaet":0,"beweis":0,"knappheit":0},"vorschlaege":["..."]}',
      "",
      lage(b),
      sprachzeile(b.sprache),
    ].join("\n");

    const r = await frageModell(apiKey, KLEIN, [{ type: "input_text", text: auftrag }]);
    if (!r.ok) return NextResponse.json({ error: `Der Berater stockt gerade. ${r.fehler}` }, { status: r.status });

    const frage = str(r.daten.frage, 400);
    /* „Fertig" wird geprüft, nicht geglaubt — dieselbe Lehre wie bei David: Ohne Deckel
       fragt das Modell weiter, solange es Fragen findet, und jede Runde kostet. */
    const fertig = r.daten.fertig === true || !frage || gestellt >= MAX_FRAGEN;
    /* Nur ein bekannter Schlüssel — sonst stünde im Verlauf ein erfundener Hebelname und
       die Zählung im Trichter zeigte etwas an, das es nicht gibt. */
    const hebelRoh = str(r.daten.hebel, 40).trim().toLowerCase();
    const hebel = HEBEL.some(h => h.schluessel === hebelRoh) ? hebelRoh : "";
    return NextResponse.json({
      ok: true,
      reaktion: str(r.daten.reaktion, 500),
      frage: fertig ? "" : frage,
      hebel: fertig ? "" : hebel,
      gefuellt: r.daten.gefuellt !== false,
      stand: standAus(r.daten.stand),
      vorschlaege: fertig ? [] : strListe(r.daten.vorschlaege, 3, 80),
      fertig,
      verbrauch: r.verbrauch,
    });
  }

  /* ── 3 · PLAN: was er bauen würde ───────────────────────────────────────── */
  if (schritt === "plan") {
    /**
     * ── DER DECKEL SITZT AM PLAN, NICHT AM ANFANG (09.09.2026) ─────────────────────────────
     *
     * Hier entsteht das, was er behält: Hook, Zielgruppe, Anzeigentexte, seine Strecke — und
     * hier läuft der einzige teure Aufruf. Wer vorher abbricht, hat nichts bekommen und darf
     * deshalb auch nichts verbraucht haben.
     */
    const gedeckelt = await deckelPruefen(str(body.device, 80));
    if (!gedeckelt.erlaubt) {
      return NextResponse.json({
        error: gedeckelt.grund === "bezahlen"
          ? "Deine kostenlose Analyse ist aufgebraucht."
          : "Für heute ist auf diesem Gerät genug gelaufen.",
        grund: gedeckelt.grund,
      }, { status: 429 });
    }

    const auftrag = [
      regeln(b.sprache),
      "AUFGABE: Zeige ihm, was du bauen würdest. Das ist das Stück, das er behält — es muss ohne dich verständlich sein.",
      "Gib zurück:",
      /* Ohne diesen Satz beschreibt der Plan den ganzen Betrieb, und der Hook wird eine
         Leistungsliste — genau das, was verhindert werden soll. */
      "DER GANZE PLAN HANDELT VON GENAU EINEM ANGEBOT — dem, das er gewählt hat oder das du gemeinsam mit ihm festgelegt hast. Nenne es im ersten Satz des Befunds beim Namen. Was er sonst noch anbietet, kommt in dieser Anzeige NICHT vor.",
      "'befund' — 2 bis 3 Sätze: seine Lage, wie du sie aus seinen Angaben verstehst. Nur, was er gesagt hat. Der erste Satz beschreibt SEINE Lage, nicht was du dadurch kannst.",
      "'zielgruppe' — 3 bis 5 kurze Punkte, wen die Anzeige erreichen soll: Ort und Umkreis, Alter falls sinnvoll, was diese Menschen gerade umtreibt.",
      /* Die Motive sind der Beweis, dass er zugehört hat — deshalb müssen sie aus SEINEN
         Worten kommen und nicht aus Werbebausteinen. */
      /**
       * DER HOOK IST DAS HERZSTÜCK (Owner 08.09.2026: „Das ist nicht der Satz, der in Meta
       * verkauft, das ist nicht der Hook. Und genau das musst du generieren.").
       *
       * Vorher lieferte der Plan drei gleichrangige „Motive". Damit fehlte das eine Stück,
       * das über Erfolg oder Misserfolg der ganzen Kampagne entscheidet — der Satz, der den
       * Daumen anhält. Drei gleich starke Vorschläge sind keine Empfehlung, sondern eine
       * Auswahl, die der Kunde selbst treffen soll. Genau das kann er nicht, dafür kommt er.
       *
       * WAS EINEN HOOK AUSMACHT, steht ausgeschrieben im Auftrag, weil das Modell sonst
       * einen Slogan schreibt: Ein Slogan spricht über das Produkt („Moderne Wohnungen in
       * bester Lage"), ein Hook spricht über den LESER und seine Lage.
       */
      /**
       * DAS REZEPT STEHT IN EINER EIGENEN DATEI (Owner 09.09.2026: „zuerst müssen wir das
       * Rezept speichern für den Hook und auf unseren Generator übertragen").
       *
       * WARUM NICHT HIER AUSGESCHRIEBEN: Dieser Auftragstext ist lang und wird oft
       * angefasst. Ein Rezept mitten darin verschwindet beim nächsten Umbau. In
       * `versusforge-hook-rezept.ts` ist es EINE Sache, die man liest, ändert und
       * wiederfindet — und die Folien können dieselben Wörter benutzen.
       */
      `'hook' — DER Satz, der in der Anzeige zuerst gelesen wird. ${HOOK_REGELN}`,
      "'hookWarum' — ein Satz: warum ausgerechnet dieser Hook diesen Menschen anhält. Für uns, nicht für ihn.",
      /**
       * DIE VORGEFÜHRTE VERWANDLUNG (Owner 09.09.2026, nach dem Stein-Karussell).
       *
       * WAS BISHER FEHLTE: Der Plan lieferte VARIANTEN desselben Hooks. Eine Variante ist
       * eine Auswahl — und Auswahl ist genau das, was der Kunde nicht treffen kann, dafür
       * kommt er. Eine Verwandlung dagegen ist ein BEWEIS: Der Leser sieht zu, wie aus
       * etwas Alltäglichem etwas Wertvolles wird, und kann nicht widersprechen, weil er
       * jeden Schritt selbst gesehen hat.
       *
       * UND ES IST DAS MATERIAL FÜR DIE BILDER, die der Kunde postet oder als
       * Anzeigenmotive hochlädt — je Schritt ein Bild, je Bild eine Aussage.
       */
      `'geschichte' — ${GESCHICHTE_REGELN} Je Schritt: 'hebel' (das eine Wort, das der Schritt drauflegt — beim ersten und letzten Schritt leer lassen) und 'satz' (die Aussage, die auf dem Bild steht).`,
      "'motive' — 2 Varianten des Hooks zum Gegeneinandertesten. Je Variante: 'idee' (was man im Bild oder Video sieht, ein Satz) und 'text' (die erste Zeile, höchstens 12 Wörter). Sie müssen aus SEINEN Angaben entstehen, nicht aus Werbefloskeln.",
      /**
       * DIE ANZEIGENTEXTE, FERTIG ZUM EINSETZEN (Owner 08.09.2026: „auf seinem Dashboard
       * stehen auch die Hooks zum Download bereit und die Texte für die Anzeige").
       *
       * WAS BISHER FEHLTE, und es fiel erst beim Durchzählen auf: 'motive[].text' ist der
       * Satz IM BILD. Was bei Meta ins Formular muss, ist etwas anderes — drei Felder mit
       * harten Grenzen. Ohne sie sass der Kunde vor dem Werbeanzeigenmanager und tippte
       * selbst; genau das ist der Unterschied zwischen einem Plan und erledigter Arbeit.
       *
       * DIE LÄNGEN SIND METAS EIGENE EMPFEHLUNGEN, keine Willkür: Über 125 Zeichen kürzt
       * Meta den Primärtext auf dem Handy mit „... Mehr anzeigen", über 40 Zeichen die
       * Überschrift. Ein Text, der abgeschnitten wird, verliert seine Pointe — deshalb steht
       * die Grenze im Auftrag und nicht als Hoffnung.
       */
      "'anzeige' — die fertigen Texte für das Meta-Formular, in SEINER Sprache und aus SEINEN Angaben. Drei Felder: 'primaer' (der Fliesstext über dem Bild, HÖCHSTENS 125 Zeichen, sonst kürzt Meta ihn ab), 'ueberschrift' (HÖCHSTENS 40 Zeichen), 'beschreibung' (HÖCHSTENS 30 Zeichen), 'knopf' (genau einer von: Mehr dazu, Nachricht senden, Anfragen, Termin anfragen, Anrufen).",
      "Die Anzeigentexte sind zum Kopieren gedacht, nicht zum Nacharbeiten: keine Platzhalter, keine eckigen Klammern, keine Anweisungen an ihn. Nenne keine Zahl, die er nicht selbst genannt hat.",
      /**
       * WAS NACH DEM KLICK PASSIERT (Owner 08.09.2026: „Meta-Hook-Tunnel").
       *
       * Ohne diesen Teil verkauft der Plan eine Anzeige. Verkauft wird aber die STRECKE —
       * genau das ist der Unterschied zu einem Portal, auf dem die Anzeige alles ist. Wer
       * den Trichter nicht sieht, versteht nicht, wofür er zahlt.
       */
      /**
       * WAS ER INSGESAMT BRAUCHT — UND WIE ER ES SELBST BAUT (Owner 08.09.2026: „in der
       * Analyse sagen wir, was er alles braucht, nicht nur eine blöde Anzeige auf Meta,
       * sondern den Rest auch … auch eine Bedienungsanleitung, falls er das selber bauen
       * will, soll er das bitte machen. Oder er lässt das von uns machen").
       *
       * DAS IST DER UNTERSCHIED ZU CHATGPT, und zwar der einzige, der zählt: Ein Modell gibt
       * Rat. Hier steht eine BAUANLEITUNG mit seinen eigenen Zahlen darin — Teil für Teil,
       * mit dem Aufwand dahinter.
       *
       * UND ES IST DAS GLAUBWÜRDIGKEITSSIGNAL. Dieselbe Logik wie bei David, der Menschen an
       * kostenlose öffentliche Stellen schickt: Wer erklärt, wie man ihn selbst ersetzt, wird
       * geglaubt. Die bezahlte Tür danach ist eine Wahl, nicht die einzige Möglichkeit.
       *
       * KEINE ERFUNDENEN PREISE. Was eine Domain oder ein Shop bei einem fremden Anbieter
       * kostet, weiss das Modell nicht — es würde eine Zahl erfinden, und die stünde dann
       * schwarz auf weiss in einem Dokument, das er weiterschickt. Deshalb: Aufwand in Zeit,
       * Kosten nur als Grössenordnung und als solche gekennzeichnet.
       */
      "'bauteile' — 4 bis 6 Stücke, die er braucht, damit aus der Anzeige wirklich Anfragen werden. Nicht allgemein, sondern für SEIN Vorhaben. Denk an: eigene Webadresse, die Seite oder Strecke hinter der Anzeige, ein Formular das Angaben aufnimmt, eine Liste in der die Anfragen landen, das Werbekonto samt Seite, Motive (Bild oder Video), und falls er wirklich verkauft auch eine Kasse. Lass weg, was er nicht braucht — bei einem Restaurant ist ein Shop Unsinn.",
      "Je Bauteil: 'was' (der Name, 2 bis 4 Wörter), 'wozu' (ein Satz, warum GENAU für sein Vorhaben — nicht allgemein), 'selbst' (wie er es selbst macht: die Art des Anbieters oder Werkzeugs und die Reihenfolge der Schritte, konkret genug zum Nachmachen), 'aufwand' (ehrlich, in Zeit — etwa 'ein Nachmittag', 'zwei bis drei Tage'; Geld NUR als Grössenordnung mit dem Wort 'etwa', und nie erfundene Preise fremder Anbieter).",
      "Die Anleitung ist ernst gemeint: Sie soll ihn wirklich in die Lage versetzen, es allein zu bauen. Schreibe sie so, als würde er es tun.",
      /**
       * DIE STUNDEN ALS ZAHL (08.09.2026, für die Grafik im PDF).
       *
       * `aufwand` ist ein Satz für Menschen („ein Nachmittag"). Eine Grafik braucht eine
       * Zahl — und OHNE Zahl wäre jedes Balkendiagramm erfunden, also gäbe es keins. Beide
       * Felder, nicht eins: Der Satz steht im Text, die Zahl zeichnet.
       */
      "Zusätzlich je Bauteil: 'stunden' — deine ehrliche Schätzung der reinen Arbeitszeit in STUNDEN als Zahl (keine Spanne, keine Einheit, nur die Zahl). Sie muss zu 'aufwand' passen: „ein Nachmittag\" sind etwa 4, „zwei bis drei Tage\" etwa 20.",
      /**
       * DIE NOTEN — DIE EHRLICHE RÜCKGABE ALS ZAHL (Owner 08.09.2026: „Analysen in Form von
       * Grafiken. Charts, und Noten").
       *
       * ES IST KEINE VERZIERUNG, SONDERN DIE HAUSREGEL in sichtbarer Form (Skill `agenten`,
       * „Die Rückgabe"): nach jeder Antwort ehrlich einschätzen, auch unbequem. Eine Note
       * kann man nicht überfliegen wie einen höflichen Absatz.
       *
       * VIER FESTE ACHSEN, KEINE ERFUNDENEN: Sonst sucht sich das Modell die aus, in denen
       * der Kunde gut dasteht — und dann ist die Bewertung eine Schmeichelei mit Zahlen.
       *
       * NUR AUS SEINEN ANGABEN. Was er nicht gesagt hat, wird nicht bewertet, sondern mit
       * einer schlechten Note und dem Grund „dazu hast du nichts gesagt" versehen. Das ist
       * keine Strafe: Genau diese Lücke ist die nützlichste Zeile des ganzen Blattes.
       */
      "'noten' — GENAU diese vier Bewertungen seiner Ausgangslage, in dieser Reihenfolge, je mit 'was' (der Achsenname wörtlich wie hier), 'note' (ganze Zahl 1 bis 5, 5 ist stark) und 'warum' (EIN Satz, der sich auf SEINE Angaben bezieht):",
      "  1. 'Angebot' — Ist klar, WAS genau beworben wird? Eine Sache = gut, der ganze Betrieb = schlecht.",
      "  2. 'Zielgruppe' — Ist erkennbar, WER angesprochen wird? Je schärfer, desto besser.",
      "  3. 'Unterschied' — Hat er etwas, das die anderen nicht haben? Nichts Genanntes = 1 oder 2.",
      "  4. 'Startbereit' — Wie viel steht schon (Seite, Formular, Seite bei Meta, Fotos)?",
      "Bewerte streng und ehrlich. Eine 5 vergibst du nur, wenn er es ausdrücklich gesagt hat. Hat er zu einer Achse nichts gesagt, gib 1 oder 2 und schreibe als Grund, was dazu fehlt — das ist die nützlichste Zeile des Blattes, keine Kränkung.",
      "'trichter' — 3 bis 4 Schritte, was nach dem Klick passiert: was der Mensch auf der Seite sieht, was er beantwortet, und was am Ende bei ihm ankommt. Je Schritt ein kurzer Satz. Der letzte Schritt ist IMMER, dass er seine Angaben hinterlässt und eine Bestätigung bekommt — nie ein Kauf.",
      "'budget' — 2 Sätze: was ein sinnvoller Tagesbetrag zum Ausprobieren wäre und woran er nach wenigen Tagen erkennt, ob es trägt. NENNE KEIN ERGEBNIS, nur was er beobachten soll.",
      /**
       * DIE FÜNF HEBEL WANDERN IN DEN PLAN (Owner 09.09.2026: „bis wir die zu 100% haben").
       *
       * OHNE DIESES FELD WAR DAS GESPRÄCH VERLOREN. Der Plan trug Befund, Zielgruppe und
       * EINEN Hook — was der Mensch über Zweck, Geschichte, Beweis und Knappheit gesagt
       * hatte, stand nur noch im Gesprächsverlauf und wurde von keinem weiteren Aufruf
       * gelesen. Der Hook-Generator im Dashboard hatte deshalb nichts in der Hand und baute
       * Hülsen (09.09.2026 im Dashboard gesehen).
       *
       * LEER BLEIBT LEER. Ein Hebel, zu dem er nichts gesagt hat, wird nicht aufgefüllt —
       * ein leeres Feld ist ehrlicher als ein erfundenes, und der Generator weiss dann, dass
       * er auf diesem Hebel keinen Hook bauen darf.
       */
      `'hebel' — ein Objekt mit genau diesen fünf Feldern: ${HEBEL.map(h => h.schluessel).join(", ")}. Je ein knapper Satz, NUR aus dem, was er gesagt hat oder was auf seiner Website steht. ${HEBEL.map(h => `${h.schluessel}: ${h.gut}`).join(" ")} Hat er zu einem nichts hergegeben, lass genau dieses Feld LEER.`,
      /* Kein unangenehmer Satz ohne nächsten Schritt — die Warnung MUSS eine Alternative
         tragen, sonst ist sie keine Beratung, sondern Entmutigung. */
      "'warnung' — was gegen sein Vorhaben spricht, ehrlich: zu enge Zielgruppe, zu wenig Budget, zu kurze Zeit, ein Angebot, das sich nicht unterscheidet. IMMER mit dem, was stattdessen ginge. Sieht alles tragfähig aus, lass das Feld leer — erfinde keinen Einwand.",
      /* IM PLAN WIRD NICHT MEHR GEFRAGT (08.09.2026, erster Durchlauf): Die Warnung endete
         mit „Brauchst du staatlich anerkannte Pflegefachkräfte oder sind auch Pflegehelfer
         möglich?" — eine Frage in dem Stück, das er behält und weiterreicht. Wer den Plan
         später allein liest, kann sie nicht beantworten; sie macht aus einem Ergebnis
         wieder eine offene Baustelle. Was noch fehlt, gehört als AUSSAGE hinein. */
      "In diesem Plan stellst du KEINE Frage mehr — kein Fragezeichen in irgendeinem Feld. Fehlt dir etwas, schreib es als Feststellung ('Ob examinierte Kräfte nötig sind, ist offen — das entscheidet, wie eng die Zielgruppe wird').",
      'Antworte NUR als JSON: {"befund":"...","zielgruppe":["..."],"hook":"...","hookWarum":"...","geschichte":[{"hebel":"...","satz":"..."}],"motive":[{"idee":"...","text":"..."}],"bauteile":[{"was":"...","wozu":"...","selbst":"...","aufwand":"...","stunden":4}],"noten":[{"was":"Angebot","note":3,"warum":"..."}],"anzeige":{"primaer":"...","ueberschrift":"...","beschreibung":"...","knopf":"..."},"trichter":["..."],"budget":"...","warnung":"...","hebel":{"zweck":"...","geschichte":"...","identitaet":"...","beweis":"...","knappheit":"..."}}',
      "",
      lage(b),
      sprachzeile(b.sprache),
    ].join("\n");

    /* Der Plan bekommt das grosse Modell und mehr Nachdenken: Er ist das Einzige, was der
       Kunde mitnimmt, und er entscheidet, ob er zurückkommt. */
    const r = await frageModell(apiKey, GROSS, [{ type: "input_text", text: auftrag }], "medium");
    if (!r.ok) return NextResponse.json({ error: `Der Plan kam nicht zustande. ${r.fehler}` }, { status: r.status });

    const motive = (Array.isArray(r.daten.motive) ? r.daten.motive : [])
      .slice(0, 3)
      .map((m: unknown) => {
        const o = (m ?? {}) as Record<string, unknown>;
        return { idee: str(o.idee, 300), text: str(o.text, 200) };
      })
      .filter(m => m.idee);

    return NextResponse.json({
      ok: true,
      plan: {
        befund: str(r.daten.befund, 900),
        zielgruppe: strListe(r.daten.zielgruppe, 5, 200),
        /* Der Hook ist ein eigenes Feld, nicht einer von drei Vorschlägen — sonst muss der
           Kunde die Entscheidung treffen, für die er gekommen ist. */
        hook: str(r.daten.hook, 200),
        hookWarum: str(r.daten.hookWarum, 300),
        /**
         * DIE FÜNF HEBEL — das Material, aus dem später weitere Hooks entstehen.
         *
         * NUR BEKANNTE SCHLÜSSEL, und leere Felder bleiben leer: Der Generator im Dashboard
         * dreht nur die Hebel durch, zu denen wirklich etwas dasteht. Ein aufgefüllter
         * Hebel wäre eine Erfindung mit Anschein von Material — die schlimmste Sorte.
         */
        hebel: (() => {
          const o = (r.daten.hebel ?? {}) as Record<string, unknown>;
          const raus: Record<string, string> = {};
          for (const h of HEBEL) {
            const satz = str(o[h.schluessel], 300).trim();
            if (satz) raus[h.schluessel] = satz;
          }
          return Object.keys(raus).length ? raus : undefined;
        })(),
        /* DIE VORGEFÜHRTE VERWANDLUNG (09.09.2026). Acht Schritte sind die Obergrenze:
           Danach wird aus einem Beweis eine Vorlesung, und für die Bilder ist ein
           Karussell über acht Folien ohnehin zu lang. */
        geschichte: (Array.isArray(r.daten.geschichte) ? r.daten.geschichte : [])
          .slice(0, 8)
          .map((x: unknown) => {
            const o = (x ?? {}) as Record<string, unknown>;
            return { hebel: str(o.hebel, 40), satz: str(o.satz, 220) };
          })
          .filter((g: { satz: string }) => g.satz),
        motive,
        trichter: strListe(r.daten.trichter, 4, 200),
        /* HART BESCHNITTEN, NICHT NUR ERBETEN: Ein Modell hält Längengrenzen mal ein und
           mal nicht. Was hier zu lang ankommt, würde bei Meta abgeschnitten — dann lieber
           hier, wo man es sieht, als dort, wo es die Pointe kostet. */
        anzeige: (() => {
          const a = (r.daten.anzeige ?? {}) as Record<string, unknown>;
          const primaer = str(a.primaer, 125);
          const ueberschrift = str(a.ueberschrift, 40);
          if (!primaer && !ueberschrift) return undefined;
          return {
            primaer,
            ueberschrift,
            beschreibung: str(a.beschreibung, 30),
            knopf: str(a.knopf, 30),
          };
        })(),
        bauteile: (Array.isArray(r.daten.bauteile) ? r.daten.bauteile : []).slice(0, 6).map((b: unknown) => {
          const o = (b ?? {}) as Record<string, unknown>;
          /* Die Zahl wird eingefangen, nicht geglaubt: Ein Modell schreibt auch mal „4-6"
             oder 400. Was hier durchkommt, zeichnet gleich einen Balken. */
          const st = Math.round(Number(o.stunden));
          return {
            was: str(o.was, 60), wozu: str(o.wozu, 300), selbst: str(o.selbst, 700),
            aufwand: str(o.aufwand, 120),
            stunden: Number.isFinite(st) && st > 0 ? Math.min(st, 200) : 0,
          };
        }).filter((b: { was: string }) => b.was),
        noten: (Array.isArray(r.daten.noten) ? r.daten.noten : []).slice(0, 4).map((n: unknown) => {
          const o = (n ?? {}) as Record<string, unknown>;
          const wert = Math.round(Number(o.note));
          return { was: str(o.was, 40), note: Number.isFinite(wert) ? Math.min(5, Math.max(1, wert)) : 0, warum: str(o.warum, 300) };
        }).filter((n: { was: string; note: number }) => n.was && n.note > 0),
        budget: str(r.daten.budget, 600),
        warnung: str(r.daten.warnung, 700),
      },
      verbrauch: r.verbrauch as Verbrauch,
    });
  }

  return NextResponse.json({ error: "Unbekannter Schritt." }, { status: 400 });
}
