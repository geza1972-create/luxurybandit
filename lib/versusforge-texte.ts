import { textbausteineInSprache } from "@/lib/lebenslauf-uebersetzen";
import { fillPrices } from "@/lib/pricing";
import type { Lang } from "@/lib/lang";
import { EIGEN } from "@/lib/versusforge-eigen";

/**
 * DIE TEXTE DES VERSUSFORGE-TRICHTERS — DEUTSCHE QUELLE, EINE STELLE.
 *
 * Dasselbe Muster wie bei David (`lib/david-tunnel-texte.ts`): flaches Objekt, zur Laufzeit
 * übersetzt, im Client steht kein einziger Satz. Deutsch ist die Quelle, nicht Englisch —
 * der Käufer sitzt im deutschsprachigen und rumänischen Raum.
 *
 * WAS HIER NICHT STEHT: kein Preis. Was VersusForge kostet, entscheidet ein Gespräch, nicht
 * dieser Trichter ([[prices-only-from-pricing-table]] — und eine Zahl, die nirgends berechnet
 * wird, gehört erst recht nicht in einen Text).
 *
 * KEINE EINKOMMENSVERSPRECHEN. Nirgends steht, wie viele Kunden oder Bewerber jemand
 * bekommt. Wir wissen es nicht, und es zu behaupten wäre genau die Lüge, gegen die das ganze
 * Haus gebaut ist. Der erlaubte Satz steht in `planSchluss`.
 */
export const VERSUSFORGE_TEXTE = {
  /* ── Schritt 0 · der Hook ────────────────────────────────────────────────── */
  /**
   * DER ERSTE SCHIRM IST GLEICHZEITIG DIE ANZEIGE (Owner 08.09.2026, im Wortlaut:
   * „Brauchst du Kunden für dein Produkt oder Idee? … VersusForge ist eine AI-Engine, die
   * dir einen Plan, einen Verkaufskanal und Käufer generiert. Kein OLX, kein Publi24.
   * Starte jetzt.").
   *
   * WARUM DAS EIN EIGENER SCHIRM IST und nicht die Überschrift des ersten Schritts: Wer aus
   * einer Anzeige kommt, muss OBEN dasselbe lesen, worauf er geklickt hat. Steht dort sofort
   * „Was soll passieren?" mit zwei Knöpfen, ist er in einem Formular, bevor er weiss, wo er
   * ist. Ein Schirm, ein Versprechen, ein Knopf.
   *
   * DIE PORTALNAMEN kommen NICHT von hier, sondern je Markt aus `PORTALE` weiter unten —
   * ein rumänischer Leser kennt OLX, ein deutscher nicht. Und sie kommen NICHT vom Modell:
   * Ein erfundener Portalname wäre schlimmer als gar keiner.
   */
  /**
   * KEIN ABSTRAKTUM IN DER ÜBERSCHRIFT (Owner 08.09.2026: „Plan klingt auf Deutsch schwach …
   * vielleicht Strategie? System?").
   *
   * Alle drei wurden verworfen, jedes aus einem eigenen Grund: „Plan" schleppt „keinen Plan
   * haben" mit sich — bei einem Handwerker, der seit dreissig Jahren arbeitet, ist das ein
   * Vorwurf im ersten Satz. „Strategie" ist das Wort der Berater, die Geld kosten und nichts
   * liefern. „System" hat der Owner schon einmal abgeräumt ([[versprechen-statt-system]]).
   *
   * Vorher stand hier „Brauchst du Kunden für dein Produkt oder deine Idee?" — gut für die
   * Mehrheit, aber die dritte Tür fiel heraus: Ein Manager, der einen besseren Job will,
   * sucht keine Kunden und liest die Zeile nicht zu Ende.
   *
   * Der Satz nennt jetzt das ERGEBNIS statt einer Kategorie. Das Pflegeheim will Bewerber,
   * der Bauträger Besichtigungen, der Manager Anrufe von Firmen — dasselbe Ereignis, drei
   * Türen, kein Fremdwort. „Plan" bleibt gültig, nur weiter innen: Dort ist er das, was
   * überreicht wird, und da ist er stark.
   */
  /* B2B, NICHT B2C (Owner 08.09.2026: „das klingt wieder wie B2C, das ist aber eher für B2B
     gedacht" · „konkrete Anfragen ist besser").
     „Menschen, die sich bei dir melden" war warm und damit Endkundensprache. „Anfragen" ist
     das Wort, das im Geschäft dasselbe meint und alle drei Türen trägt: Bewerbungen sind
     Anfragen, Besichtigungen sind Anfragen, der Anruf einer Firma beim Manager auch.
     KONKRETE Anfragen grenzt zusätzlich ab — ein Portal liefert Klicks und Streuverluste. */
  /**
   * ZWEI SÄTZE, ZWEI ENTTÄUSCHUNGEN (Owner 08.09.2026, Zielgruppe geschärft: Leute, die
   * SCHON eine eigene Seite haben, die nichts bringt, und PARALLEL für Portale zahlen).
   *
   * Sie müssen nicht überzeugt werden, dass ein eigener Kanal gut ist — sie haben einen.
   * Er bringt nur nichts. Und die Portale bringen etwas, das ihnen nicht gehört. Wer beide
   * Sätze liest und beide kennt, weiss, dass hier jemand seine Lage kennt.
   *
   * KEINE NEGATION der Form „nicht noch ein X" und KEINE MARKENNAMEN — die Seite läuft in
   * drei Sprachen, und Indeed sagt einem rumänischen Leser nichts.
   *
   * `hookFrage2` ist ein EIGENES FELD, damit der zweite Satz sicher auf einer neuen Zeile
   * beginnt. Ein Zeilenumbruch im Text überlebt die Übersetzung nicht.
   */
  hookFrage: "Deine Website steht und bringt keine Anfragen.",
  /* Gekürzt (Owner 08.09.2026): „Anfragen, die dir nicht gehören" bremste am Satzende. Der
     Gedankenstrich setzt den Widerspruch hart dahinter, statt ihn nachzuschieben. */
  /**
   * VON VORNE NACH HINTEN (Owner 08.09.2026, Korrektur des ganzen Gedankens: „Nein, hier ist
   * es andersrum. Du baust Werbung und den Tunnel — der ersetzt dein Portal. Alles wird durch
   * die Werbung erzeugt. Nicht von hinten nach vorne bauen, sondern von vorne nach hinten").
   *
   * Vorher stand hier „Die Portale liefern welche — dir gehören sie nicht". Das war eine
   * Beschwerde über die anderen. Der richtige Satz beschreibt die eigene BAUREIHENFOLGE, und
   * die ist der eigentliche Unterschied:
   *
   *  · Der normale Weg: Seite bauen → Shop bauen → dann merken, dass niemand kommt → Werbung
   *    hinterherschieben. Von hinten nach vorne.
   *  · Hier: die Anzeige zuerst. Was dahinter steht, entsteht AUS ihr und passt deshalb zu
   *    ihr. Von vorne nach hinten.
   *
   * Deshalb braucht niemand ein Portal daneben — die Strecke IST die Präsenz.
   */
  hookFrage2: "Hier fängt es mit der Anzeige an — die Strecke dahinter entsteht daraus.",
  /**
   * DIE SUBLINE BESCHREIBT DAS ERGEBNIS, NICHT DIE IDEE (Owner 08.09.2026: „darf die
   * Headline nicht wiederholen").
   *
   * Vier Dinge in der Reihenfolge, in der sie entstehen: der Satz, der anhält · die Anzeige ·
   * die Seite dahinter · das Dashboard. Das Wort „Kanal" kommt in der ganzen linken Spalte
   * nur noch EINMAL vor (in `hookZeile`) — es stand vorher dreimal da und nutzte sich ab.
   */
  /**
   * „SCHALTET SIE" IST RAUS (09.09.2026, beim Ansehen der neuen Startseite aufgefallen).
   *
   * Wir schalten keine Kampagne. Dafür bräuchten wir Zugriff auf sein Werbekonto — App
   * Review bei Meta oder er macht uns zum Partner in seinem Business Manager. Beides gibt es
   * nicht, und der Satz stand trotzdem seit dem 08.09. auf der Startseite.
   *
   * WAS WIR WIRKLICH TUN: die Anzeige schreiben, die Strecke dahinter bauen, das Dashboard
   * liefern. Geschaltet wird in SEINEM Konto, von ihm — und das ist für ihn eher ein
   * Argument als ein Mangel: Sein Konto, seine Daten, seine Rechnung.
   */
  hookText: "VersusForge schreibt die Anzeige, baut die Strecke dahinter — und zeigt dir in einem Dashboard, wer sich gemeldet hat. Geschaltet wird in deinem eigenen Werbekonto.",

  /**
   * DAS ARGUMENT, DAS WIRKLICH TRIFFT (Owner 08.09.2026, wörtlich: „es gibt hunderte von
   * Portalen im Netz und E-Commerce-Shops und du bist ein Anonymer, bei uns nicht … die
   * meisten bauen, und merken: verdammt, jetzt muss ich auch noch Werbung machen. Bei uns
   * bekommt der Kunde das automatisch").
   *
   * Es ist stärker als jedes Versprechen auf dieser Seite, weil es einen Moment beschreibt,
   * den der Leser SELBST erlebt hat: Die Seite steht, sie ist bezahlt, sie ist schön — und
   * dann kommt niemand. Wer das kennt, liest den Rest.
   *
   * DREI ZEILEN, KEIN ABSATZ: Das ist ein Einwand, den man erkennt, nicht ein Text, den man
   * liest.
   */
  argTitel: "Von vorne gebaut, nicht von hinten",
  argEins: "Die meisten bauen erst eine Seite oder einen Shop — Monate, bevor der erste Kunde kommt.",
  argZwei: "Dann kommt der Satz: verdammt, jetzt muss ich auch noch Werbung machen.",
  argDrei: "Hier ist die Anzeige der Anfang. Die Strecke entsteht aus ihr — und ersetzt dein Portal.",
  /**
   * AUCH DIE ANZEIGE ENTSTEHT HIER (Owner 08.09.2026: „selbst die Anzeige wird von uns
   * erzeugt … das Ganze entsteht aus deinem Produkt selbst und deinem Budget").
   *
   * Das ist der Punkt, an dem es keine Vorlage mehr ist: Der Hook kommt aus SEINEM Angebot —
   * aus dem, was auf seiner Website steht, oder aus dem, was er in einem Satz gesagt hat.
   * Deshalb passt die Strecke dahinter, und deshalb sieht die Anzeige nicht aus wie tausend
   * andere.
   *
   * WAS HIER NICHT STEHT: „für einen Bruchteil". Der Owner hat es so gesagt, und es stimmt
   * vermutlich — nur gibt es hier weder einen Preis noch Erfahrungswerte, wogegen verglichen
   * würde. Ein Preisvergleich ohne beide Zahlen ist eine Behauptung. Die Kostenaussage steht
   * stattdessen konkret zwei Zeilen tiefer: 10 bis 25 € am Tag, direkt an Facebook.
   */
  argVier: "Auch die Anzeige entsteht hier — aus deinem Angebot, nicht aus einer Vorlage.",

  /* ── Die Rechnung, an einem Beispiel ─────────────────────────────────────── */
  /**
   * DASSELBE MUSTER WIE ANNAS KARTE (Owner 08.09.2026: „wir hatten doch die Anna als
   * Beispiel und das will ich hier genauso haben").
   *
   * ZWEI REGELN, DIE VON DORT MITKOMMEN:
   *
   * 1. DIE ZAHL MUSS SICH ZUSAMMENRECHNEN LASSEN. Bei Anna waren es zwölf Monate mal Gehalt.
   *    Eine nackte Summe ist eine Behauptung; eine aufgeschlüsselte ist eine Rechnung, die
   *    der Leser selbst prüfen kann — und er prüft sie an seiner eigenen.
   * 2. „BEISPIEL" STEHT DRÜBER, nicht darunter. Die Firma ist erfunden, die Posten sind
   *    marktübliche Grössenordnungen. Wer das nicht kennzeichnet, behauptet einen Kunden,
   *    den es nicht gibt.
   *
   * DIE 2.000 € SIND EIN PREIS, KEIN BEISPIEL. Sobald sie hier stehen, verhandelt jeder
   * Interessent gegen diese Zahl. Sie stammt vom Owner (08.09.2026) und ist damit gesetzt —
   * wer sie ändert, ändert den Preis, nicht einen Beispieltext.
   */
  bwHinweis: "Beispiel",
  /* GEGENWART, NICHT VERGANGENHEIT (Owner 08.09.2026: „will nicht wollte"). „Wollte" macht
     daraus eine abgeschlossene Geschichte, die jemand anderem passiert ist. „Will" ist der
     Zustand, in dem der Leser gerade selbst steckt — und genau deshalb liest er weiter. */
  bwTitel: "Eine Zahnarztpraxis will mehr Implantat-Patienten.",
  bwVerlustSatz: "Sechs Monate später hat sie ausgegeben:",
  bwP1: "Website und Terminstrecke vom Dienstleister",
  bwP1Wert: "9.000 €",
  bwP2: "Agentur für Konzept und Betreuung, sechs Monate",
  bwP2Wert: "15.000 €",
  bwP3: "Werbebudget in dieser Zeit",
  bwP3Wert: "6.000 €",
  bwSumme: "30.000 €",
  bwSummeLabel: "zusammen",
  bwDannTitel: "Was daran wehtut",
  bwDann: "Die Seite war fertig, als die ersten Anzeigen liefen — und passte nicht zu ihnen. Gebaut wurde von hinten nach vorne.",
  bwHierTitel: "Hier",
  /* „in Tagen" war zu vorsichtig (Owner 08.09.2026: „was redest du hier, das entsteht hier
     in 10 Minuten"). Er hat recht, was die Maschine tut: Der Plan entsteht im Gespräch, und
     eine Kampagne über die Schnittstelle anzulegen dauert Sekunden, nicht Tage. */
  /**
   * DIE ZEHN MINUTEN SIND SEIN AUFWAND, NICHT UNSERER (Owner 08.09.2026: „2000 Euro für 10
   * Minuten stimmt nicht klar — dann wäre ich Millionär in 10 Tagen").
   *
   * Vorher stand „2.000 € — und es entsteht in zehn Minuten". Das liest sich als Stundensatz,
   * und die erste Reaktion darauf ist Ärger, nicht Interesse. Die zehn Minuten sind das, was
   * ER investiert; die 2.000 € sind der Preis für eine Maschine, die 25.000 € gekostet hat.
   * Erst die Zeit, dann der Preis — in dieser Reihenfolge liest man sie nicht gegeneinander.
   */
  /* KEINE ZAHL IM TEXT (Hausregel prices-only-from-pricing-table). Der Betrag kommt aus
     lib/pricing.ts und wird vom Baustein daneben gesetzt — auch damit ihn der Übersetzer
     nicht anfasst ([[uebersetzer-fallen]]: Zahlen und Platzhalter überleben ihn nicht). */
  bwHier: "Dich kostet es zehn Minuten. Danach läuft deine Kampagne 7 bis 30 Tage.",
  bwPreisLabel: "Einstieg",
  bwBudgetSatz: "Was du am Tag ins Werbebudget gibst, bestimmst du selbst — es geht direkt an Facebook.",
  /**
   * DIE EINZIGE BELEGTE ZAHL AUF DIESER SEITE (Owner 08.09.2026: „ich kann dir sagen, dass
   * mich dieses Tool selbst 25.000 Euro gekostet hat").
   *
   * Alle anderen Beträge hier sind marktübliche Grössenordnungen und als Beispiel
   * gekennzeichnet. Diese ist echt und nachprüfbar — sie steht auch im Buchentwurf und im
   * LinkedIn-Beitrag. Sie beantwortet nebenbei die Frage, die bei 2.000 € sonst kommt:
   * „Was kann das für den Preis schon sein?"
   */
  bwZusatz: "Diese Maschine hat uns selbst 25.000 € und ein Jahr gekostet. Du bekommst sie fertig.",

  /* ── Der Einwand ─────────────────────────────────────────────────────────── */
  /**
   * „WERBUNG HABE ICH PROBIERT, HAT NICHTS GEBRACHT" (Owner 08.09.2026, aus dem rumänischen
   * Markt: „Restaurants sagen, ich habe schon mal mit Werbung versucht und das hat nichts
   * gebracht. Was funktioniert ist nur Mundpropaganda").
   *
   * Das ist der häufigste Einwand, und er wird NICHT bestritten — bestreiten wäre der
   * sicherste Weg, jemanden zu verlieren, der es wirklich versucht hat. Stattdessen wird
   * benannt, WORAN es meistens lag, und zwar an Dingen, die man nachprüfen kann.
   *
   * KEIN WORT GEGEN AGENTUREN. Der Owner hat deutlichere Worte benutzt; auf der Seite wäre
   * das ein Angriff, und Angriffe erzeugen Widerspruch statt Zustimmung. Die drei Gründe
   * wirken stärker, weil der Leser sie an seiner eigenen Erfahrung wiedererkennt.
   */
  objTitel: "\u201eWerbung habe ich probiert. Hat nichts gebracht.\u201c",
  objEins: "Meistens lag es nicht an der Werbung, sondern daran, dass sie den ganzen Betrieb beworben hat statt einer Sache.",
  objZwei: "Und daran, dass hinter der Anzeige eine Seite lag, die nichts aufnimmt — kein Feld, kein Termin, keine Liste.",
  objDrei: "Und niemand hat gemessen, was eine Anfrage gekostet hat. Ohne diese Zahl bleibt jede Kampagne ein Gefühl.",
  /* `hookOhne` ist entfallen: Das Wort steht jetzt je Sprache in lib/versusforge-portale.ts,
     weil ein einzelnes Wort ohne Satz drumherum falsch übersetzt wurde („Niciunul OLX"). */
  /* `hookZeile` („Dein eigener Kanal. Nicht gemietet.") ist am 08.09.2026 ersatzlos
     entfallen: Sie sagte dasselbe wie der Absatz darüber, nur schwächer — und „nicht
     gemietet" ist angreifbar, weil VersusForge selbst monatlich läuft. */
  hookKnopf: "Jetzt starten",
  /**
   * DAS WERBEBUDGET WIRD FRÜH GENANNT (Owner 08.09.2026: „früh und beiläufig, nicht im
   * Kleingedruckten").
   *
   * Belastbar ist, wohin das Geld geht und was ein TEST kostet. NICHT belastbar und deshalb
   * nirgends behauptet: was jemand am Ende ausgeben muss und was dabei herauskommt — das
   * hängt an Branche, Ort und Wettbewerb.
   */
  budgetZeile: "Das Werbebudget zahlst du direkt an Facebook, nicht an uns. Zum Testen reichen 10 bis 25 € am Tag.",

  /* ── Der Dashboard-Beweis ────────────────────────────────────────────────── */
  /**
   * ERFUNDENE DATEN, SICHTBAR GEKENNZEICHNET (08.09.2026 nachgeprüft: Es gibt kein
   * Kunden-Dashboard, und die Leadliste hat keinen Zugang — `META_PAGE_ACCESS_TOKEN` ist
   * leer, es kommt kein einziger Lead an).
   *
   * Ein Bildschirmfoto war unmöglich: Es gibt nichts zu fotografieren. Ein nachgebautes
   * Dashboard ohne Hinweis wäre eine Behauptung über etwas, das nicht läuft — dieselbe
   * Grenze wie bei Annas Karte im David-Trichter.
   */
  /* MIT ZEITRAUM, SONST WIDERSPRECHEN SICH DIE ZAHLEN (Owner 08.09.2026): Oben stehen
     10–25 € am Tag, unten 300 € — ohne „in 30 Tagen" liest sich das wie zwei verschiedene
     Angebote. 300 € auf 30 Tage sind genau 10 € am Tag, also die untere Kante. */
  dashTitel: "So sieht es aus, wenn es läuft",
  dashZeitraum: "30 Tage",
  dashHinweis: "Beispiel",
  dashAusgaben: "Ausgegeben",
  dashAnfragen: "Anfragen",
  dashProAnfrage: "Je Anfrage",
  dashListe: "Wer sich gemeldet hat",

  /* ── Was passiert danach ─────────────────────────────────────────────────── */
  /**
   * DIE EHRLICHE FASSUNG (Owner 08.09.2026: „was passiert in Woche drei, wenn wenig oder
   * nichts reinkommt — wer passt Anzeige und Hook an").
   *
   * Heute passiert nichts Automatisches: keine Überwachung, keine Optimierung, kein Alarm —
   * nichts davon ist gebaut. Also steht hier, was wirklich geschieht: Ein Mensch sieht in die
   * Zahlen. „Der Agent optimiert automatisch" wäre ein Versprechen über Software, die es
   * nicht gibt.
   *
   * Der zweite Satz ist eine Handwerksregel, keine Floskel: Mehr Geld auf einen Satz, der
   * nicht zieht, kauft nur mehr Leute, die vorbeiscrollen.
   */
  danachTitel: "Und wenn nichts kommt?",
  danachEins: "Nach zwei Wochen sehen wir gemeinsam in die Zahlen.",
  danachZwei: "Kommt zu wenig, wird der Hook getauscht — nicht das Budget erhöht.",
  danachDrei: "Zwei, drei Motive laufen gegeneinander, bis eines trägt.",
  dashL1Name: "Andrea M.",
  dashL1Zeit: "Heute, 09:14",
  dashL1Text: "Bin examinierte Pflegekraft, suche Vollzeit im Schichtdienst.",
  dashL2Name: "Tobias K.",
  dashL2Zeit: "Gestern, 18:42",
  dashL2Text: "Frage zur Wohnung im dritten Stock — ist der Parkplatz dabei?",
  dashL3Name: "Elena P.",
  dashL3Zeit: "Gestern, 11:05",
  dashL3Text: "Wir suchen jemanden für Klimaanlagen, drei Objekte in Timișoara.",
  /**
   * BEISPIELE ZUM ANTIPPEN (Owner 08.09.2026, im Wortlaut diktiert: „Ich suche Leute, ich
   * bin Zahnarzt und biete Implantate, wir montieren Klimaanlagen, wir sind ein
   * Kosmetikstudio, wir brauchen Pflegeleute, wir suchen deutschsprachige Fachkräfte").
   *
   * SIE TUN ZWEI DINGE AUF EINMAL: Sie zeigen die Spannweite — das hier ist für jeden
   * Betrieb, nicht für eine Branche — und sie nehmen die Angst vor dem leeren Feld. Wer
   * antippt, hat einen Satz stehen und ändert ihn, statt vor nichts zu sitzen.
   *
   * FLACHE SCHLÜSSEL, keine Liste von Objekten: `textbausteineInSprache` übersetzt einen
   * flachen Record. Welches Beispiel zu welchem Knopf gehört, weiss der Baustein.
   */
  bspTitel: "Zum Beispiel",
  bsp1: "Wir brauchen Pflegekräfte",
  bsp2: "Wir suchen deutschsprachige Fachkräfte",
  bsp3: "Ich bin Zahnarzt und biete Implantate",
  bsp4: "Wir montieren Klimaanlagen",
  bsp5: "Wir sind ein Kosmetikstudio",
  bsp6: "Ich verkaufe Wohnungen",
  /* DIE DRITTE TÜR: ein Mensch bewirbt SICH (Owner 08.09.2026: „kann ich hier auch, ich will
     einen Spitzenjob bekommen? Das wäre für einen Topmanager"). Dieselbe Maschine, nur ist
     das Ergebnis keine Bewerberliste, sondern eine Liste von Firmen, die sich bei IHM
     melden. Und es ist die Tür, durch die das Haus seine Bewerbungswerkzeuge verkauft —
     Dossier, Video, Unterlagen —, nur an einen Käufer, für den sie vierstellig wert sind. */
  bsp7: "Ich will einen besseren Job",
  /* Das Restaurant steht bewusst dabei (Owner 08.09.2026): Es ist der Fall, an dem die Regel
     „eine Sache, nicht alles" am schnellsten einleuchtet — und Gastronomie ist die Branche,
     in der am meisten Geld an Portale geht. Nicht „unser Restaurant", sondern der Raum. */
  bsp8: "Ich vermiete meinen Eventraum",

  /* ── Was ist das hier? ───────────────────────────────────────────────────── */
  /**
   * DER ABSCHNITT, DEN EIN PRÜFENDER SUCHT (Owner 08.09.2026: „Und was ist VersusForge? Da
   * kannst du schreiben, dass es von LuxuryBandit gebaut wurde.").
   *
   * LUXURYBANDIT DARF HIER STEHEN — und nur hier. Als MARKE über einem 5.000-€-Angebot war
   * der Name der Grund für die Trennung; als ERBAUER ist er das Gegenteil, nämlich der
   * einzige Beleg, dass hinter der Seite jemand steht, der so etwas schon zwölfmal gebaut
   * hat. Ein neuer Name ohne Vergangenheit ist verdächtig; ein neuer Name mit Werkstatt
   * dahinter nicht.
   *
   * KEINE ERGEBNISVERSPRECHEN, auch hier nicht. „Zwölf Produkte, live" ist nachprüfbar.
   * „Bringt dir Kunden" wäre es nicht.
   */
  wasTitel: "Was ist VersusForge?",
  /**
   * ER STELLT SICH SELBST VOR (Owner 08.09.2026: „die Leute wissen nicht, wer er ist").
   *
   * IN DER ICH-FORM, wie David („Ich bin David, eine KI für Bewerbungen …"). Ein Gesicht mit
   * einem Namen, das in der dritten Person über sich reden lässt, bleibt eine Illustration.
   *
   * UND WAHR: Die alte Fassung versprach „baut dir Werbung … und eine Liste der Menschen, die
   * sich melden". Gebaut ist die Analyse — Anzeige schalten und Strecke bauen macht heute ein
   * Mensch. Der Satz sagt das jetzt, statt es zu verschweigen.
   */
  wasText: "Ich bin VersusForge. Ich stelle dir vier Fragen und schreibe dir daraus deinen Plan: den Hook, die fertigen Anzeigentexte, die Strecke dahinter — und die Anleitung, wie du das alles selbst baust. Willst du es nicht selbst bauen, übernimmt es ein Mensch für dich.",
  wasZwei: "Kein Portal, keine Provision, kein fremder Marktplatz. Was du aufbaust, gehört dir.",
  wasVon: "Gebaut von LuxuryBandit — zwölf eigene KI-Produkte, im Betrieb.",
  teilen: "Teilen",
  linkKopiert: "Link kopiert",

  /* ── Schritt 1 · die zwei Knöpfe ─────────────────────────────────────────── */
  /* KEIN TIPPEN AM ANFANG (Hausregel [[chat-no-personal-questions-buttons-only]]): Der erste
     Schritt ist eine Wahl, kein Formular. Es gibt genau zwei Wege — mehr Auswahl wäre
     erfunden, denn die Maschine dahinter kann genau diese zwei. */
  /**
   * DIE TRENNUNG IST LISTE ODER KASSE — NICHT MENSCHEN ODER PRODUKTE (Owner 08.09.2026:
   * „Ich habe zum Beispiel einen Wohnkomplex und habe 20 Apartments. Brauche
   * Interessenten.").
   *
   * Vorher hiessen die Knöpfe „Ich suche Leute" und „Ich will Produkte verkaufen". Zwanzig
   * Wohnungen sind weder das eine noch das andere — und genau daran wäre der erste echte
   * Interessent hängengeblieben, weil keiner der beiden Knöpfe seine Lage beschreibt.
   *
   * Die richtige Grenze ist, WO DER ABSCHLUSS PASSIERT: Melden sich Menschen und ein Mensch
   * verkauft danach (Wohnungen, Autos, Bauleistungen, Mitarbeiter)? Oder wird auf der Seite
   * bezahlt (Möbel, Kurse, Handgemachtes)? Das ist auch technisch die Grenze, die zählt —
   * nur der zweite Weg braucht eine Kasse.
   */
  /* Der Satz unter dem Namen — er stand fest in der Seite und blieb dadurch auf der
     rumänischen Fassung deutsch (gesehen 08.09.2026). Jeder sichtbare Satz gehört in diese
     Datei, sonst läuft er nicht durch die Übersetzung. */
  markenZeile: "Dein eigener Kanal. Nicht gemietet.",
  /**
   * KEIN SHOP, KEINE KASSE (Owner 08.09.2026: „Ich will selber keinen Shop bauen. Ich will
   * Werbung und Tunnel und ein Dashboard. Wie die Recruiter-Seite.").
   *
   * Vorher trennten die Knöpfe LISTE von KASSE — der zweite Weg hätte Stripe Connect,
   * Händler-Onboarding und Ausweisprüfung gebraucht, also genau die Stelle, an der der
   * Owner selbst gesagt hat „hier wird es kompliziert für jemanden". Sie ist ersatzlos
   * gestrichen.
   *
   * BEIDE WEGE ENDEN JETZT IN EINER LISTE. Was sie unterscheidet, ist nur, WAS beworben
   * wird — und danach richten sich die Fragen und der Hook, nicht die Technik dahinter.
   * Das Vorbild ist die eigene Recruiting-Strecke: Anzeige, Sofortformular, Liste.
   */
  zielTitel: "Was bewirbst du?",
  zielUnter: "Beides endet gleich: Menschen melden sich bei dir.",
  zielLeads: "Ich suche Leute",
  zielLeadsUnter: "Mitarbeiter, Bewerber, Kandidaten",
  zielVerkauf: "Ich verkaufe etwas",
  zielVerkaufUnter: "Wohnungen, Autos, Möbel, Leistungen — du machst den Abschluss",

  /* ── Schritt 2 · das eine Feld ───────────────────────────────────────────── */
  feldTitel: "Sag es in deinen eigenen Worten.",
  feldUnter: "Zwei, drei Sätze reichen. Je konkreter, desto weniger muss ich raten.",
  feldPlatzhalterLeads: "Zum Beispiel: 20 neue Zwei-Zimmer-Wohnungen, Erstbezug ab Mai. Ich brauche Interessenten für Besichtigungen.",
  /* „bezugsfertig" wurde auf Rumänisch zu „prima închiriere" — erste VERMIETUNG, in einem
     Beispiel für eine Verkaufsanzeige (08.09.2026). Zusammengesetzte Fachwörter sind für den
     Übersetzer die schwerste Übung; hier stehen deshalb nur einfache Wörter. */
  feldPlatzhalterVerkauf: "Zum Beispiel: 20 neue Zwei-Zimmer-Wohnungen in Timișoara, ab Mai frei. Ich verkaufe sie und brauche Interessenten für Besichtigungen.",
  /**
   * DIE ADRESSE STATT DER ERKLÄRUNG (Owner 08.09.2026: „Leute können in einem Satz oft nicht
   * sagen, was sie alles machen, aber sie wollen Kunden — er will dir seine URL zeigen").
   *
   * Dasselbe Mittel wie Davids Lebenslauf: lesen statt fragen. Wer seine Adresse eintippt und
   * danach einen Satz über sein eigenes Geschäft liest, den er nicht geschrieben hat, weiss,
   * dass hier jemand hingesehen hat.
   *
   * ENTWEDER-ODER, NICHT BEIDES PFLICHT: Ein Satz reicht, eine Adresse reicht, beides ist
   * besser. Ein Pflichtfeld mehr wäre genau die Hürde, die wir gerade abgebaut haben.
   */
  urlPlatzhalter: "deinefirma.de",
  urlLabel: "Oder zeig mir deine Website — ich lese sie.",
  feldWeiter: "Weiter",
  feldZuKurz: "Schreib etwas — auch ein Hallo reicht, dann fangen wir dort an.",

  /* ── Schritt 3 · die Rückfragen ──────────────────────────────────────────── */
  /* Der Plan VOR dem Gespräch (Hausregel [[agenten-plan-vor-dem-gespraech]]): Er sagt, wie
     viele Fragen kommen, bevor die erste gestellt wird. */
  /**
   * ── DER FAHRPLAN: EIN KONSTRUKT, EIN ZIEL (Owner 09.09.2026: „du musst dir ein Konstrukt
   * an Fragen bauen … eine Roadmap" · „aber alle Pläne haben dasselbe Ziel") ────────────────
   *
   * MEIN ERSTER ENTWURF HATTE ZWEI FAHRPLÄNE — einen für Einzelstücke, einen für Betriebe
   * mit einem Angebot. Sein Einwand hat ihn auf einen zusammengestrichen, und er hat recht:
   * Das Ziel ist immer dasselbe. Ein Bild, eine Wohnung, eine Zahnarztpraxis — am Ende steht
   * derselbe Satz, gebaut aus denselben fünf Sachen. Was sich unterscheidet, ist nur, WORAUF
   * die Fragen zeigen, nicht welche es sind.
   *
   * „Rückfrage 1 von 4" sagt, WIE VIELE kommen. Es sagt nicht, WORÜBER — und genau das
   * entscheidet, ob jemand die vierte noch beantwortet. Wer die Strecke sieht, weiss, dass
   * sie endlich ist und wohin sie führt.
   *
   * FÜNF STEHEN DA, GEFRAGT WIRD HÖCHSTENS VIERMAL. Das ist kein Widerspruch, sondern der
   * sichtbare Beweis, dass zugehört wird: Was sein erster Satz oder seine Website schon
   * hergibt, ist abgehakt, bevor die erste Frage kommt.
   *
   * ES SIND DIE ÖFFENTLICHEN NAMEN (Owner 09.09.2026: „die Schritte nennen wir so bei der
   * Abfrage"), nicht die internen. Das Rezept bleibt drinnen; der Weg ist sichtbar.
   */
  fahrplanKopf: "Was ich von dir brauche",
  /**
   * ── ZAHLEN ALS ZIFFER, NIE ALS WORT ([[uebersetzer-fallen]], neuer Fall 10.09.2026) ───────
   *
   * Owner mit Bild der rumänischen Fassung: „das ist kein Rumänisch." Dort stand „Cinco
   * lucruri" — SPANISCH. Das Modell hat „Fünf" in die falsche romanische Sprache übersetzt
   * und den Rest des Satzes richtig; der Fehler steckt also in genau einem Wort und fällt beim
   * Prüfen kaum auf, dem Muttersprachler aber sofort.
   *
   * SCHLIMMER NOCH: Der Übersetzungs-Cache wird NIE erneuert (lib/translate.ts). Ein falsches
   * Wort bleibt für immer stehen, bis der deutsche Satz sich ändert — der Cache-Schlüssel ist
   * der deutsche Text.
   *
   * DIE ZIFFER IST IMMUN. „5" ist in allen drei Sprachen dieselbe und wird nicht übersetzt.
   * Gilt ab jetzt für jede Zahl in einem Textbaustein.
   */
  fahrplanFein: "5 Sachen. Was du schon gesagt hast, frage ich nicht noch einmal.",
  /**
   * ── DIE FÜNF NAMEN IM FAHRPLAN GEHÖREN IHM, ALSO AUCH SEINER SPRACHE ──────────────────────
   *
   * Owner 10.09.2026, mit Bild der rumänischen Seite: Überschrift, Fein­zeile, Löschknopf und
   * Fusszeile standen auf Rumänisch — und mittendrin fünf deutsche Wörter untereinander.
   * Sie kamen aus `HEBEL` im Rezept, nicht aus den Textbausteinen, und wurden deshalb nie
   * übersetzt. Genau die Sorte Rest, die eine Seite halbfertig aussehen lässt.
   *
   * WARUM SIE HIER STEHEN UND NICHT IM REZEPT: Im Rezept stehen die INTERNEN Namen, die
   * niemand sehen darf. Was der Kunde liest, gehört zu den Texten — dort wird es übersetzt.
   *
   * „BEWEIS" STATT „BELEG": Einzelne Wörter haben keinen Zusammenhang, aus dem der Übersetzer
   * die Bedeutung nehmen könnte. „Beleg" wird im Rumänischen zur Quittung; „Beweis" heisst in
   * jeder Sprache dasselbe ([[uebersetzer-fallen]]).
   */
  schrittNutzen: "Nutzen",
  schrittHerkunft: "Herkunft",
  schrittWirkung: "Wirkung",
  schrittBeleg: "Beweis",
  schrittGrenze: "Grenze",
  fahrplanNutzen: "Was dein Kunde danach kann",
  fahrplanHerkunft: "Woher es kommt, dein Verfahren",
  fahrplanWirkung: "Was es über ihn sagt",
  fahrplanBeleg: "Woran man sieht, dass es stimmt",
  fahrplanGrenze: "Warum es nicht für jeden ist",
  fragenKopf: "Rückfrage",
  von: "von",
  /* „Danach zeige ich dir, was ich bauen würde" klang nach Konzeptvorschlag. Geliefert wird
     eine laufende Anzeige, eine Strecke und ein Dashboard (Owner 08.09.2026). */
  /**
   * ERGEBNIS STATT ABLAUF (09.09.2026, Owner: „über dem Feld muss stehen, was am Ende
   * herauskommt. Wenn dort steht, dass er am Ende einen fertigen Bauplan für seine Praxis
   * bekommt, kostenlos, ist es dasselbe Feld mit einem völlig anderen Versprechen").
   *
   * VORHER STAND HIER NUR DER ABLAUF („Vier Fragen. Fünf Minuten.") — mit der Begründung,
   * das Ergebnis stehe ja schon drei Zeilen darüber im Absatz. Diese Begründung war falsch:
   * Die Zeile direkt am Knopf ist das Letzte, was jemand liest, bevor er tippt oder eben
   * nicht — Nähe zum Klick wiegt mehr als technische Redundanz mit einem Absatz weiter oben.
   *
   * JETZT DAS ERGEBNIS ZUERST, verankert in denselben drei Wörtern wie im Lead-Absatz
   * (Hook, Zielgruppe, Kampagne) — dieselbe Zusicherung wie in der ChatGPT-Demo-Fassung,
   * damit beide dasselbe Versprechen machen.
   */
  fragenAnkuendigung: "Du bekommst deinen fertigen Plan — Hook, Zielgruppe, Kampagne. Kostenlos.",
  antwortPlatzhalter: "Deine Antwort.",
  antworten: "Antwort senden",
  ueberspringen: "Weiss ich nicht",
  /* Der Weg eine Frage zurück — als Text mit Pfeil, nicht als dritter Knopf. */
  zurueckWort: "Zurück",

  /* ── DAS GESPRÄCH ALS CHAT (Owner 09.09.2026: „bei VersusForge müsste sich ein Chat öffnen
        und alles lösen") ───────────────────────────────────────────────────────────────────
     DER PLATZHALTER SAGT „schreib einfach", nicht „deine Antwort": Es ist keine Antwort auf
     ein Feld, es ist ein Gespräch. Wer „Deine Antwort." liest, verhält sich wie in einem
     Formular — und genau davon kommen wir gerade weg. */
  chatPlatzhalter: "Schreib einfach — auch wenn du etwas ändern willst.",
  chatSenden: "Senden",
  /* Steht AM FELD, nicht im Verlauf — und die Nachricht wird gar nicht erst abgeschickt
     ([[sichtbare-fehler-keine-formularfelder]]). Begründung in components/VersusForgeFunnel.tsx. */
  chatZuKurz: "Schreib mir bitte einen ganzen Satz — davon lebt dein Ergebnis.",
  chatPlanKnopf: "Plan jetzt bauen",
  /**
   * ── DER AUSWEG AUS DEM EIGENEN GESPRÄCH (Owner 10.09.2026: „kann auch nicht alles löschen,
   * ich weiss nicht, was ich hier machen soll") ────────────────────────────────────────────
   *
   * ER SASS IN SEINEM EIGENEN TRICHTER FEST. Fünf Testnachrichten im Verlauf, eine rote
   * Absage darunter, und kein Knopf, der das wegräumt. Der Agenten-Chat hat „Alles löschen"
   * seit gestern; hier fehlte er — und das ist die Fläche, auf der ein Kunde landet.
   *
   * DER LAUF ÜBERLEBT ABSICHTLICH EIN NEULADEN (`vf_lauf`, Begründung im Trichter). Genau
   * das macht ihn ohne diesen Knopf zur Falle: Neuladen bringt denselben toten Verlauf
   * zurück, und der Weg „nach Hause" nimmt seinen Satz sogar mit.
   *
   * ZWEI TIPPS, ROT, OHNE UHR ([[loeschen-zwei-tipps-rot]]) — wie im Agenten-Chat, aus
   * demselben Grund: Auf einer Frage aus Wörtern ist eine Drei-Sekunden-Uhr eine Falle.
   *
   * ES HEISST LÖSCHEN, NICHT „NEU ANFANGEN" (Owner 09.09.2026: „er könnte alles löschen,
   * dann ist es save"). Es geht ihm nicht um einen zweiten Versuch, sondern darum, dass seine
   * Sätze weg sind.
   */
  chatLoeschen: "Alles löschen",
  chatLoeschenBestaetigen: "Wirklich alles löschen? Noch einmal drücken.",

  /* ── Schritt 2 · die Website (Owner 09.09.2026: „im Trichter soll er nach einer Website
        doch fragen" · „gleich am Anfang, als zweiter Schritt" · „dann muss der User nicht
        alles erklären") ─────────────────────────────────────────────────────────────────
     DER TEXT SAGT DEN TAUSCH, NICHT DIE BITTE: „Bitte gib deine Adresse an" klingt nach
     Formular. „Dann musst du weniger erzählen" ist ein Handel, den jeder sofort versteht —
     und er ist wahr: Der Agent liest die Seite einmal und fragt danach nur noch das, was
     dort nicht steht. */
  webKicker: "Schritt 2",
  webTitel: "Hast du eine Website?",
  webText: "Dann lese ich sie einmal und frage dich nur noch das, was dort nicht steht.",
  webPlatzhalter: "praxis-mueller.de",
  webKnopf: "Weiter",
  webOhne: "Ich habe keine Website",

  /* ── Schritt 4 · der Plan ────────────────────────────────────────────────── */
  planTitel: "Das würde ich bauen.",
  planZielgruppe: "Wen die Anzeige erreicht",
  planHook: "Der Satz, der den Daumen anhält",
  planMotive: "Zwei Varianten zum Testen",
  planTrichter: "Was nach dem Klick passiert",
  planBudget: "Was es kostet, es herauszufinden",
  planWarnungKopf: "Was dagegen spricht",
  /* Der Kasten bleibt stehen, auch wenn nichts drinsteht — sonst sieht ein Plan ohne
     Einwände genauso aus wie einer, bei dem niemand nachgedacht hat. */
  planWarnungNichts: "Ich habe nichts gefunden, was dagegen spricht.",
  planSchluss: "Am ersten Tag hast du eine Strecke, die läuft. Was du damit verdienst, hängt an dir.",
  planKnopf: "Passt — sprich mich an",
  planNeu: "Nochmal von vorn",
  planNichtsAngelegt: "Bis hierher ist nichts geschaltet und nichts bezahlt. Es läuft erst, wenn du es sagst.",

  /* ── Zustände ───────────────────────────────────────────────────────────── */
  denkt: "Ich lese, was du geschrieben hast …",
  baut: "Ich baue den Plan …",
  fehler: "Das hat gerade nicht geklappt. Versuch es bitte noch einmal.",
  zurueck: "Zurück",
  /**
   * DER SATZ VOR DER EINGABE (Owner 08.09.2026: „sollten wir ebenso am Anfang schreiben, er
   * hat nur eine Analyse gratis … ich weiss nicht, ob er es riskiert, da Blödsinn einzugeben").
   *
   * Er ist der Blödsinn-Filter, und zwar ein besserer als jede Sperrliste: Er kostet nichts,
   * weist niemanden ab und wirkt VOR dem ersten Tastendruck. Wer weiss, dass er einen Versuch
   * hat, gibt nicht „amazon.de" ein, um zu sehen was passiert.
   *
   * ZWEI SÄTZE, NICHT EINER: „kostenlos" allein ist ein Geschenk, über das man nicht
   * nachdenkt. Erst der Preis dahinter macht daraus etwas, das man ausgibt.
   */
  gratisTitel: "Die erste Analyse ist kostenlos.",
  gratisText: "Jede weitere {analyse}. Nimm dir deshalb die eine Sache vor, die dir wirklich Kunden bringen soll.",
  fortschrittWort: "Schritt",

  /* ── Abschluss ──────────────────────────────────────────────────────────── */
  /**
   * SIE MELDEN SICH, NICHT WIR (Owner 08.09.2026: „sie sollen mich kontaktieren", nachdem
   * feststand, dass der Kauf- und Kampagnenweg noch nicht gebaut ist und alles von Hand
   * läuft).
   *
   * DER UNTERSCHIED IST NICHT HÖFLICHKEIT, SONDERN QUALIFIKATION: Wer von sich aus schreibt,
   * hat entschieden. Wer nur eine Adresse hinterlässt, hat abgewartet. Bei einer Liste, die
   * ein Mensch von Hand abarbeitet, ist der Unterschied der ganze Arbeitstag.
   *
   * BEIDE WEGE STEHEN TROTZDEM DA: Das Feld fängt auch den, der gerade nicht schreiben will —
   * ihn zu verlieren, nur um die Initiative zu erzwingen, wäre teuer. Der direkte Weg steht
   * zuerst, das Feld darunter.
   *
   * KEINE ADRESSE IM TEXT (Hausregel `keine-email-adresse-auf-der-seite`): Der direkte Weg
   * ist ein Link auf /contact, nie eine hingeschriebene Mailadresse — die wird abgeerntet.
   */
  dankeTitel: "Dein Plan steht. Jetzt bauen wir ihn.",
  dankeText: "Die Umsetzung macht ein Mensch, kein Automat — Anzeige, Motive, Strecke. Melde dich, dann gehen wir deinen Plan durch.",
  dankeDirekt: "Jetzt schreiben",
  dankeOder: "Oder lass deine Adresse da, dann melde ich mich:",
  mailPlatzhalter: "deine@adresse.de",
  mailSenden: "Schicken",
  /**
   * ── DER NAME SEINES BETRIEBS (09.09.2026, im eigenen Prüflauf gefunden) ──────────────────
   *
   * WAS PASSIERTE: Ich lief den Trichter mit einer Freemail-Adresse durch, und der Trichter
   * hiess danach `versusforge.com/geza1972` — der Teil vor dem @. Oben auf SEINER Seite
   * stand „geza1972", und genau diese Adresse hätte er in eine Anzeige geschrieben.
   *
   * DIE ALTE ABLEITUNG war: Website, sonst Mail-Domain, sonst der Teil vor dem @. Die ersten
   * zwei sind gute Vermutungen, der dritte ist immer falsch — bei jeder Gmail-Adresse, also
   * bei der Mehrheit.
   *
   * FRAGEN IST BILLIGER ALS RATEN. Ein Feld neben der Adresse, drei Sekunden Arbeit für ihn,
   * und die Adresse trägt seinen Namen statt seines Nutzerkontos. Der Agent fragt seit heute
   * genauso ([[abschluss_schicken]] verweigert ohne Betriebsnamen).
   */
  betriebFeld: "Wie heisst dein Betrieb?",
  betriebPlatzhalter: "Restaurant Insula",
  betriebFein: "Der Name steht oben auf deiner Seite und in ihrer Adresse.",
  mailFehlt: "Ohne Adresse kann ich dir nichts schicken.",
  /* Der Weg zurück zum Plan. Der Plan liegt noch im Fenster — es fehlte nur die Tür dorthin
     (Owner 08.09.2026: „jetzt wollte ich zurück, mir alles anzuschauen"). */
  zurueckPlan: "Plan noch mal ansehen",
  /**
   * DER PLAN ZUM MITNEHMEN (Owner 08.09.2026: „was bekommt der User? Eine PDF?").
   *
   * DER ZWEITE SATZ IST DER WICHTIGE. „PDF laden" allein ist ein Knopf; der Grund dahinter
   * ist, dass fast niemand allein entscheidet — der Wirt fragt seine Frau, der Praxisinhaber
   * seinen Partner. Ohne etwas zum Weiterschicken stirbt der Plan im Browser des einen
   * Menschen, der ihn gesehen hat.
   */
  /**
   * DIE BAUANLEITUNG (Owner 08.09.2026: „in der Analyse sagen wir, was er alles braucht …
   * auch eine Bedienungsanleitung, falls er das selber bauen will, soll er das bitte machen.
   * Oder er lässt das von uns machen").
   *
   * DER TITEL SAGT „SELBST", NICHT „ANGEBOT". Wer hier liest, soll merken, dass es ernst
   * gemeint ist — sonst ist die Anleitung nur eine als Hilfe verkleidete Werbefläche, und das
   * riecht man.
   */
  /**
   * DAS PROTOKOLL (Owner 08.09.2026: „die Analyse soll auch ein Protokoll zeigen, von dem
   * was er gewollt hat und beantwortet hat. Ich brauche das auch").
   *
   * ZWEI AUFGABEN, und die zweite wird meist übersehen:
   *  · FÜR IHN: Der Plan ist aus seinen Sätzen entstanden — hier stehen sie. Wer den Plan
   *    weiterreicht, kann zeigen, worauf er beruht, statt „die KI hat das gesagt".
   *  · FÜR UNS: Wer eine Anfrage zurückruft, muss wissen, was der Mensch gesagt hat. Ohne
   *    das Protokoll steht im Dashboard eine Adresse und ein Plan, aber nicht der Mensch.
   */
  /**
   * DER PLAN WIRD NICHT GEZEIGT, SONDERN GESCHICKT (Owner 08.09.2026: „selbst so würde ich
   * ihm die Analyse nicht komplett zeigen, nur versenden" · „das wäre doch schlau").
   *
   * WAS AUF DEM SCHIRM BLEIBT: der Hook. Er ist der Beweis, dass zugehört wurde — und das
   * Einzige, was ohne den Rest überhaupt wirkt.
   *
   * WARUM DAS NICHT GEIZ IST: Ein Bildschirm voller Text wird überflogen und ist weg. Ein
   * PDF im Postfach wird geöffnet, weitergeleitet und liegt in einem halben Jahr noch da.
   * Und wir wissen, an wen wir es geschickt haben — sonst ist jeder Durchlauf ein Fremder,
   * der Geld gekostet hat.
   *
   * DIE LISTE ZEIGT DEN UMFANG, NICHT DEN INHALT: Sie nennt echte Zahlen aus SEINEM Plan
   * (sechs Bauteile, zwei Motive), keine Werbeversprechen. Wer sie liest, weiss, dass da
   * wirklich etwas liegt.
   */
  vorschauTitel: "Dein Hook steht.",
  /**
   * KEIN PDF MEHR (Owner 09.09.2026: „das stimmt nicht als PDF").
   *
   * Rest aus der Zeit, als der Plan ein A4-Dokument im Anhang war. Er bekommt jetzt zwei
   * Adressen: seine Anzeigen-Seite und seinen Trichter. Ein Satz, der ein PDF ankündigt, das
   * nie kommt, ist die teuerste Sorte Fehler — der Mensch wartet darauf.
   */
  vorschauText: "Gleich bekommst du deine Anzeigen-Seite und deinen Trichter — mit dem Bild, den Texten für Meta und der Adresse, die in die Anzeige gehört.",
  vorschauDrin: "Das steht darin",
  drinZielgruppe: "Wen die Anzeige erreicht",
  drinMotive: "Motive zum Gegeneinandertesten",
  drinAnzeige: "Anzeigentexte, fertig für Meta",
  drinBauteile: "Bauteile — mit Anleitung, wie du sie selbst baust",
  drinTrichter: "Schritte der Strecke dahinter",
  drinBudget: "Was du am Tag einsetzen solltest",
  drinWarnung: "Was gegen dein Vorhaben spricht",
  drinProtokoll: "Das Protokoll unseres Gesprächs",
  /* Das Tor sagt jetzt, wofür die Adresse gebraucht wird — Trichter und Anleitung, nicht
     ein Plan als Dokument (09.09.2026, mit dem PDF weggefallen). */
  vorschauFeld: "Wohin schicken wir dir deinen Trichter und die Anleitung für Meta?",
  vorschauKnopf: "Schicken",
  postUnterwegs: "Unterwegs. Sieh in dein Postfach.",
  postUnterwegsText: "Deine zwei Adressen liegen in der Mail — die Anzeigen-Seite und dein Trichter. Schau auch im Spam nach, falls nichts ankommt.",
  postFehler: "Die Mail ging nicht raus. Lade den Plan hier herunter — ich habe deine Anfrage trotzdem.",
  /* Die Karte mit dem Spot — Titel oben, Aufruf auf der Karte (Hausregel `karten-fuer-videos`). */
  /**
   * DIE VERSUS-KARTE (Owner 08.09.2026: „VersusForge ist die Maschine, die die grossen
   * Portale bekämpft. Aber besser formuliert").
   *
   * WARUM NICHT „BEKÄMPFT": Kampf um des Kampfes willen ist eine Behauptung über uns. Der
   * stärkere Gedanke ist seiner, vom Vormittag: „Die Portale liefern welche — dir gehören
   * sie nicht." Das ist kein Angriff, sondern ein Besitzverhältnis, und der Leser prüft es
   * an seiner eigenen Rechnung nach.
   *
   * KEIN PORTAL WIRD HIER GENANNT (Owner 08.09.2026: „das soll eigentlich gar nicht hier
   * erscheinen, weil das dynamisch ist"). „Ohne OLX" ist für jemanden, der Pflegekräfte
   * sucht, das falsche Portal. Namen nennt der Agent später, wenn er weiss, worum es geht.
   *
   * UND SIE ERKLÄRT DEN NAMEN. „Versus" stand bisher unerklärt auf der Seite; hier bekommt
   * es seinen Grund — ohne dass irgendwo „unser Name bedeutet" stehen muss.
   */
  versusKicker: "Woher der Name kommt",
  versusTitel: "Versus. Gegen die Miete.",
  /**
   * KORRIGIERT AM 08.09.2026 (Owner, mit Bild: „das stimmt hier gar nicht"). Zwei Sätze
   * waren schlicht falsch, und beide von mir:
   *
   *  1. „Die Anfrage kommt beim Portal an, nicht bei dir." FALSCH — auf OLX, eJobs oder
   *     Kleinanzeigen erreicht ihn die Anfrage sehr wohl. Nicht die Anfrage gehört ihm dort
   *     nicht, sondern der KANAL: Seite, Texte, Liste.
   *
   *  2. „Hörst du auf zu zahlen, bleibt sie stehen." FALSCH und gefährlich — die Strecke
   *     läuft auf UNSERER Technik, und die Anzeige läuft nur, solange er Facebook bezahlt.
   *     Ein Versprechen, das niemand einlösen kann, ist genau die Masche, gegen die das
   *     ganze Haus gebaut ist.
   *
   * WAS STATTDESSEN STIMMT und trotzdem trägt: Auf dem Portal mietet er einen Platz und
   * behält am Ende NICHTS. Hier gehört ihm, was entsteht — Plan, Texte, Motive, Anfragen —
   * und das kann er mitnehmen. Die Anzeige selbst läuft überall nur gegen Geld; das wird
   * jetzt ausdrücklich gesagt, statt es zu verschweigen.
   */
  versusEins: "Auf einem Portal mietest du einen Platz in fremder Auslage — neben allen anderen, die dasselbe anbieten. Hörst du auf zu zahlen, ist der Platz weg und du hast nichts, was du mitnehmen könntest.",
  versusZwei: "Was du dort nie bekommst, ist der Kanal selbst: die Seite, die Texte, die Motive, die Liste der Menschen, die sich gemeldet haben.",
  versusDrei: "Hier gehört dir genau das. Die Anzeige läuft, solange du Facebook bezahlst — wie jede Anzeige. Aber der Plan, die Texte und deine Anfragen bleiben deine, auch danach.",
  versusSchluss: "Das ist der Unterschied — und der Name.",
  spotTitel: "Das ist die Anzeige, die du bekommst",
  spotAufruf: "Meine Analyse starten",
  spotTeilen: "Vier Fragen — und du hast deinen Hook, deine Anzeigentexte und die Strecke dahinter.",
  protokollTitel: "Was du gesagt hast",
  protokollText: "Der Plan ist daraus entstanden — nicht aus einer Vorlage.",
  protokollEingabe: "Deine Eingabe",
  bauTitel: "Was du brauchst — und wie du es selbst baust",
  bauText: "Alles hier kannst du allein bauen. Die Anleitung ist ernst gemeint, mit ehrlichem Aufwand je Stück.",
  bauWozu: "wofür",
  bauSelbst: "so machst du es selbst",
  bauAufwand: "Aufwand",
  /* Die Tür danach — eine Wahl, nicht die einzige Möglichkeit. */
  bauAngebotTitel: "Oder wir bauen es dir.",
  bauAngebotText: "Dashboard mit deinen Hooks und Anzeigentexten zum Herunterladen, die Motive erzeugt, der Trichter fertig samt Link. {einstieg} einmalig. Das Werbebudget zahlst du weiter selbst und direkt an Facebook.",
  anzeigeTitel: "Deine Anzeigentexte",
  anzeigePrimaer: "Primärtext",
  anzeigeUeberschrift: "Überschrift",
  anzeigeBeschreibung: "Beschreibung",
  anzeigeKnopf: "Schaltfläche",
  pdfKnopf: "Plan als PDF laden",
  pdfHinweis: "Zum Behalten und Weiterschicken — an den, der mitentscheidet.",
  pdfFehler: "Das PDF liess sich gerade nicht bauen. Versuch es bitte noch einmal.",
  /**
   * DAS ANGEBOT NACH DER GRATIS-ANALYSE (Owner 08.09.2026).
   *
   * KEINE ABSAGE, SONDERN EIN SATZ, DER DEN PREIS RECHTFERTIGT: Er nennt, was gerade
   * geliefert wurde, und stellt daneben, was das Nächste kostet. „Aufgebraucht" allein wäre
   * eine Schranke; „du hast einen vollständigen Plan bekommen" ist eine Quittung.
   */
  kaufTitel: "Die erste war frei.",
  /**
   * NICHT ENTSCHULDIGEN (Owner 08.09.2026, wörtlich: „Das kannst du nicht sagen. Diese
   * Maschine hat uns selbst 25.000 € und ein Jahr gekostet. Du bekommst sie fertig. Hast du
   * sie noch alle?").
   *
   * Meine erste Fassung zählte auf, was der Kunde schon bekommen hatte, und stellte den
   * Preis vorsichtig daneben — die Haltung eines Verkäufers, der selbst nicht glaubt, dass
   * sein Preis stimmt. Bei 9,99 für eine Maschine, die ein Jahr gebaut wurde, ist das nicht
   * bescheiden, sondern unglaubwürdig: Wer sich für seinen Preis entschuldigt, sagt dem
   * Käufer, dass er zu hoch ist.
   *
   * DREI ZAHLEN, ABSTEIGEND (Owner 08.09.2026: „So eine Maschine kostet im Normalfall
   * 300k"). Was sie zu bauen kostet · was sie UNS gekostet hat · was sie DICH kostet. Der
   * Preis wird nicht erklärt, er wird eingeordnet — und 9,99 nach 300.000 braucht keine
   * Rechtfertigung mehr.
   *
   * ZUR HERKUNFT DER ZAHLEN, damit sie später niemand für ausgedacht hält:
   *  · 25.000 € ist die eigene, dokumentierte Ausgabe des Owners (Infrastruktur,
   *    Modellnutzung, Werbung, verworfene Entwicklungen) — steht so in seinem öffentlichen
   *    Text.
   *  · 300.000 € ist seine Einschätzung des Marktpreises für einen Auftragsbau. Sie ist
   *    plausibel für einen individuell gebauten Agenten samt Trichter, Kasse, Sprachen und
   *    Meta-Anbindung, aber es ist eine EINSCHÄTZUNG, kein Angebot, das jemand vorlegen
   *    kann. Der Owner wurde darauf hingewiesen und hat sie so entschieden. Wer die Zeile
   *    einmal belegen muss, hat hier den Hinweis; die belegbare Alternative wäre „wer sich
   *    so etwas bauen lässt, zahlt sechsstellig".
   */
  kaufText: "So eine Maschine bauen zu lassen kostet 300.000 €. Uns hat sie 25.000 € und ein Jahr gekostet. Du bekommst sie fertig — die nächste Analyse {analyse}.",
  kaufKnopf: "Nächste Analyse — {analyse}",
  kaufLaeuft: "Kasse öffnet …",
  kaufFertig: "Bezahlt. Es geht weiter.",
  /* Nach dem Schicken. Sagt genau das, was passiert ist — nicht mehr: Die Adresse liegt bei
     uns, ein Mensch schreibt zurück. Kein Datum versprechen, das niemand halten muss. */
  dankeAbTitel: "Ist angekommen.",
  dankeAbText: "Deine Adresse liegt bei mir, zusammen mit deinem Plan. Ich sehe ihn mir an und melde mich bei dir — als Mensch, nicht als Agent.",

  /**
   * SEIN EIGENER TRICHTER AM ENDE (Owner 09.09.2026: „wenn ich den Tunnel durchgehe, als
   * Zahnarzt, dann bekomme ich den Link dazu zu dem Funnel").
   *
   * DIE GRENZE STEHT IM TEXT, NICHT IM KLEINGEDRUCKTEN: Der Trichter läuft und sammelt,
   * lesen kann er die Anfragen erst mit dem Dashboard. Wer das erst beim Klicken merkt,
   * fühlt sich hereingelegt — wer es hier liest, versteht, was er kauft.
   */
  /**
   * WAS DER KUNDE BEKOMMT — die zwei Blöcke unter dem Knopf (Owner 09.09.2026: „wir machen
   * unsere Seite genauso, nur unten steht was der Kunde bekommt" · „unsere Kunden bekommen
   * den Hook und den Funnel").
   *
   * ZWEI WÖRTER STATT SECHS ABSCHNITTEN: „Der Hook" und „Der Funnel" merkt man sich, eine
   * Aufzählung über vier Punkte liest niemand. Die Preise stehen als Platzhalter — sie
   * kommen aus der Preistabelle, nie getippt (Hausregel `prices-only-from-pricing-table`).
   */
  /**
   * DER ANFANG DER EINFACHEN SEITE (Owner 09.09.2026: „genau so fängt es an wie beim
   * Zahnarzt").
   *
   * ZWEITE ZEILE, VOM OWNER DIKTIERT (09.09.2026): „Deine Website steht und bringt keine
   * Anfragen. In zwei Minuten hast du die Lösung!"
   *
   * Die erste Zeile steht in `hookFrage` und benennt den Zustand; diese hier gibt den
   * Ausweg. Genau die Reihenfolge aus dem Hook-Rezept — erst das Vertraute, dann der Riss
   * darin, und hier zusätzlich der Weg heraus.
   *
   * `hookFrage2` bleibt unberührt: Dort steht der lange Nachsatz der ALTEN Seite.
   *
   * ── DIE UHR IST RAUS (Owner 10.09.2026, vor der rumänischen Fassung: „in doua minute
   * stimmt nicht mehr") ─────────────────────────────────────────────────────────────────────
   *
   * ER HAT DEN SATZ GESTERN SELBST DIKTIERT — und heute stimmt er nicht mehr, weil sich
   * darunter das Produkt geändert hat: Aus vier Schirmen ist ein Gespräch geworden, und ein
   * Gespräch dauert länger als zwei Minuten. Das ist kein Schönheitsfehler. Die erste Zahl
   * auf der Seite ist ein Versprechen; wer sie reisst, verliert genau an der Stelle das
   * Vertrauen, an der er es aufbaut.
   *
   * STATT EINER ZEIT DIE ANZAHL. Eine Zahl, die man abzählen kann, hält; eine Uhr, die im
   * Gespräch läuft, nicht.
   *
   * WARUM VIER UND NICHT FÜNF: Im Fahrplan stehen fünf Sachen, GEFRAGT wird höchstens
   * viermal — was sein erster Satz oder seine Website schon hergibt, ist abgehakt, bevor die
   * erste Frage kommt (Begründung an `fahrplanFein`). Die Überschrift verspricht, was ER tut,
   * nicht, was die Maschine abarbeitet. Fünf hier wäre eine Frage zu viel versprochen.
   *
   * ALS ZIFFER, nicht als Wort — siehe die Übersetzer-Falle an `fahrplanFein`.
   *
   * DIE FORM BLEIBT SEINE: zwei Zeilen, Zustand oben, Ausweg unten, Ausrufezeichen.
   */
  einfachTitel2: "4 Fragen, und du hast die Lösung!",
  /**
   * NEUTRAL (Owner 09.09.2026: „das muss neutral sein").
   *
   * Der alte Platzhalter beschrieb einen Immobilienfall („20 neue Zwei-Zimmer-Wohnungen,
   * Erstbezug ab Mai"). Für einen Zahnarzt, einen Pflegedienst oder einen Handwerker ist das
   * das falsche Beispiel — und ein falsches Beispiel im Feld ist schlimmer als keines: Es
   * sagt dem Leser, dass die Seite für jemand anderen gebaut ist.
   *
   * Die Branchen stehen jetzt auf den Karten unter dem Knopf, wo sie hingehören. Das Feld
   * sagt nur noch, WAS hineingehört.
   */
  /**
   * EIN PAAR WÖRTER, KEINE DREI SÄTZE (Owner 09.09.2026, mit Bild des Feldes: „drei Sätze ist
   * zu viel. Schreib einige Wörter").
   *
   * DIE HÜRDE STAND AN DER FALSCHEN STELLE. „Schreib in zwei, drei Sätzen" ist ein Aufsatz,
   * bevor jemand weiss, ob sich das lohnt — und wer vor einem leeren Feld eine Aufgabe
   * gestellt bekommt, macht sie nicht.
   *
   * ES KOSTET UNS AUCH NICHTS: Seit die vier Fragen die fünf Hebel füllen, muss der erste
   * Satz nur noch sagen, WORUM es geht. Alles andere holt das Gespräch — dafür ist es da.
   *
   * ABER EIN SATZ, KEINE STICHWÖRTER (Owner 09.09.2026, Nachtrag: „nein, er soll schon einen
   * Satz schreiben"). „Zahnarzt, Implantate, München" hatte ich zwischendurch stehen — das
   * ist eine Suchanfrage. Ein Satz trägt, was drei Stichwörter nicht haben: die Absicht.
   * „Ich vermiete meinen Eventraum" und „Ich suche jemanden für meinen Eventraum" bestehen
   * aus denselben Wörtern und meinen das Gegenteil.
   */
  einfachPlatzhalter: "Ich bin Zahnarzt in München und mache Implantate.",

  /**
   * DER ABOUT-BLOCK UNTEN (Owner 09.09.2026: „wir brauchen nur unten About. Dann schreiben
   * wir, was es ist.").
   *
   * ER ERSETZT DIE ZWEI PREISBLÖCKE. Wer aus einer Anzeige kommt, weiss noch nicht, was das
   * hier ist — eine Preisliste beantwortet die Frage nicht, sie setzt sie voraus. Was er
   * bekommt, steht trotzdem drin, nur als Satz statt als Tabelle.
   *
   * DER LETZTE ABSATZ IST DIE GRENZE, nicht das Kleingedruckte: Wir schalten keine Kampagne.
   */
  aboutTitel: "Was ist VersusForge?",
  aboutEins: "Eine Maschine, die aus einem Satz eine ganze Werbestrategie macht.",
  /**
   * WIE SIE ARBEITET (Owner 09.09.2026: „das kannst du eventuell sagen unter Was ist
   * VersusForge, wie die Maschine arbeitet").
   *
   * WAS HIER STEHT UND WAS NICHT: Die fünf Zeilen sind die ARBEITSANZEIGE, nicht das Rezept.
   * Sie tragen unsere eigenen Namen; die Formel dahinter bleibt drinnen (Owner: „ich will den
   * nicht veröffentlichen" · „gute Restaurants veröffentlichen ihr Rezept auch nicht").
   *
   * WARUM ES ÜBERHAUPT AUF DIE SEITE GEHÖRT: Es ist das Einzige auf der ganzen Seite, das
   * nicht behauptet, sondern zeigt. Jeder verspricht „KI-gestützte Werbetexte"; hier sieht
   * man, dass etwas Bestimmtes gesucht wird und dass es noch fehlt.
   *
   * DIE ZAHLEN SIND EIN BEISPIEL, und das steht auch dran. Ohne den Hinweis läse es sich wie
   * eine echte Analyse — und das wäre die eine Sorte Erfindung, die dieses Haus nicht macht.
   */
  arbeitTitel: "Wie sie arbeitet",
  arbeitText: "Sie sucht fünf Dinge über dein Geschäft. Vier davon stehen auf keiner Website — die fragt sie dich. Erst wenn genug zusammen ist, schreibt sie.",
  arbeitBeispiel: "Beispiel: so sieht es nach der zweiten Antwort aus.",
  /* Die fünf Namen stehen NICHT hier, sondern kommen aus `versusforge-hook-rezept.ts`
     (`schritt`) — eine Quelle, sonst laufen Trichter und Startseite auseinander. */
  /**
   * ALS LISTE, NICHT ALS ABSATZ (Owner 09.09.2026: „das schwarz und in einer Box. Es sieht zu
   * unwichtig aus. Am besten als Liste, was er bekommt").
   *
   * ER HAT RECHT: Zwei Absätze am Seitenende liest niemand, und was man nicht liest, hält man
   * für unwichtig. Fünf Zeilen, die man zählen kann, wiegen schwerer als derselbe Inhalt in
   * Fliesstext — beim Preis zählt man.
   */
  /* Hook und Bild sind EIN Punkt (Owner 09.09.2026: „das sind in einem Punkt") — das
     Bild IST der Hook, nur sichtbar gemacht. Dieselbe Zusammenlegung wie auf der
     Anzeigen-Seite, wo die Überschrift „Das Bild — Der Hook" heisst. */
  /**
   * STICHWÖRTER, NICHT SÄTZE (Owner 09.09.2026: „die Listen müssen knapp formuliert werden,
   * nur Stichwörter und richtig fett").
   *
   * Vorher standen dort Nebensätze — „der Satz, mit dem deine Anzeige anfängt, als fertiges
   * Bild für Instagram und Facebook". Eine Liste, deren Punkte über zwei Zeilen laufen, ist
   * keine Liste mehr, sondern ein Absatz mit Punkten davor: Man liest sie, statt sie zu
   * überfliegen — und beim Zählen kommt es aufs Überfliegen an.
   *
   * DER SENKRECHTE STRICH TRENNT Stichwort und Zusatz. Das Stichwort wird fett gesetzt, der
   * Zusatz grau — so ist die Fettung echte Auszeichnung und kein Gedankenstrich-Trick.
   */
  aboutListe1: "Der Hook|dein Satz, als fertiges Bild",
  aboutListe2: "Die Zielgruppe|wen es erreicht",
  aboutListe3: "Die Kampagne|wo und wie geschaltet wird",
  aboutListe4: "Der Trichter|deine Seite hinter dem Klick",
  aboutListe5: "Die Anleitung|Meta, Schritt für Schritt",
  aboutGratis: "Das kostet nichts.",
  /**
   * AUCH DER KAUFTEIL ALS LISTE (Owner 09.09.2026: „Dashboard fehlt").
   *
   * Es stand da — aber im dritten Nebensatz eines Absatzes, und dort liest es niemand. Was
   * oben gratis als Liste steht und unten für Geld als Fliesstext, wirkt weniger wert als
   * das Kostenlose. Dieselbe Form für beides, sonst verkauft die Seite gegen sich selbst.
   */
  /**
   * DER TRICHTER IST SCHON GEBAUT (Owner 09.09.2026: „Titel stimmt nicht. Es ist schon
   * gebaut, nur nicht freigeschaltet").
   *
   * ER HAT ZWEIMAL RECHT. Erstens im Titel: „Willst du den Trichter gebaut haben?" verspricht
   * eine Bauleistung, die längst erbracht ist — er bekommt den Trichter am Ende des
   * Gesprächs, mit Adresse, und kann ihn aufmachen. Verkauft wird das FREISCHALTEN.
   *
   * Und zweitens in der Liste: „Deine eigene Adresse für die Anzeige" stand im bezahlten
   * Teil, obwohl sie kostenlos dabei ist. Etwas zu verkaufen, das er schon hat, fliegt beim
   * ersten Kunden auf — und nimmt dem Rest der Liste den Glauben mit.
   */
  aboutKaufTitel: "Willst du ihn benutzen?",
  aboutKaufLead: "Dein Trichter steht schon — mit eigener Adresse, fertig zum Aufmachen. Was fehlt, ist die Freischaltung.",
  /**
   * SEINE PHYSISCHE ADRESSE, NICHT DIE URL (Owner 09.09.2026: „nein, das stimmt. Hier ist
   * seine physische Adresse gemeint").
   *
   * Ich hatte den Punkt gestrichen, weil ich „Adresse" für die Trichter-URL hielt — die
   * bekommt er ja kostenlos. Gemeint war seine Praxisanschrift im Kopf der Seite: Bis zur
   * Freischaltung steht dort ein grauer Platzhalter. Der Wortlaut nennt jetzt Strasse und
   * Telefon, damit die Verwechslung nicht wiederkommt.
   */
  aboutKauf1: "Deine Anschrift|Adresse und Telefon auf der Seite",
  aboutKauf2: "Das Dashboard|jede Anfrage mit Name und Telefon",
  aboutKauf3: "Auch die alten|Anfragen von vor der Freischaltung",
  aboutKauf4: "Wir helfen bei Meta|erste Anzeige gemeinsam eingerichtet",
  aboutKaufPreis: "{einstieg} einmalig.",
  aboutDrei: "Geschaltet wird in deinem eigenen Werbekonto. Das Budget zahlst du direkt an Facebook — es ist kein Betrag, den wir in Rechnung stellen.",
  /**
   * DAS BEISPIEL AM SEITENENDE (Owner 09.09.2026: „auf dieser Seite unten müsste ein Beispiel
   * stehen" · „aber bauen kannst du das trotzdem").
   *
   * ES ZEIGT DIE ECHTE AUSGABE, nicht ein Schaubild: dieselbe Anzeigen-Seite, die jeder
   * bekommt — Hook, Bild, die vier Meta-Felder, der Trichter zum Durchklicken. Die Seite
   * behauptet oben fünf Dinge; hier kann man sie anfassen.
   *
   * HEUTE STEHT DORT EIN HANDGESCHRIEBENER FALL, kein Modelllauf. Deshalb heisst der Mandant
   * „Zahnarztpraxis (Beispiel)" und die Zeile sagt „ein Beispiel" — nicht „ein Kunde".
   */
  beispielTitel: "So sieht es aus, wenn es fertig ist",
  beispielText: "Ein Beispiel: dieselbe Seite, die du am Ende bekommst — mit Hook, Bild, den Texten für Meta und dem Trichter zum Durchklicken.",
  beispielKnopf: "Beispiel ansehen",
  aboutMehr: "Über uns",

  /**
   * „DER WEG" (Owner 09.09.2026: „das ist die Strategie, die er kostenlos bekommt" · „Der
   * Weg").
   *
   * „Was du bekommst" beschrieb einen Vorgang und hätte über jeder Liste stehen können. „Der
   * Weg" benennt die Sache — und schliesst den Kreis zu der Überschrift ganz oben („Wir bauen
   * den Weg.") und zu dem Satz, der am Ende auf seiner Anzeigen-Seite steht („Dein Weg
   * steht."). Drei Stellen, ein Wort.
   */
  bekommtTitel: "Der Weg",
  bekommtGratisPreis: "Kostenlos",
  bekommtGratisTitel: "Der Hook",
  bekommtGratisText: "Der Satz, mit dem deine Anzeige anfängt — und alles, was dahinter gehört: Zielgruppe, Kampagne, die Strecke hinter dem Klick, die Anzeigentexte zum Einsetzen. Als Präsentation zum Weiterschicken.",
  bekommtKaufPreis: "{einstieg} einmalig",
  bekommtKaufTitel: "Der Funnel",
  bekommtKaufText: "Deine eigene Adresse, die du in deine Anzeige setzt. Deine Fragen, dein Name, dein Impressum. Dazu das Dashboard mit jeder Anfrage: Name, Telefon und das, was der Mensch gesagt hat.",
  bekommtBudget: "Das Werbebudget zahlst du weiter selbst und direkt an Facebook. Es ist kein Betrag, den wir in Rechnung stellen.",
  fussAbout: "About",
  fussDatenschutz: "Datenschutz",
  fussImpressum: "Impressum",

  /**
   * DAS BILD ZUM POSTEN (Owner 09.09.2026). „Anzeige" statt „Grafik": Er soll wissen, wofür
   * es gedacht ist, nicht was es technisch ist.
   */
  bildKicker: "FÜR INSTAGRAM UND FACEBOOK",
  bildTitel: "Deine Anzeige als Bild.",
  bildText: "Dein Hook im Hochformat, fertig zum Posten — oder als Motiv für deine Anzeige.",
  /* „Bild laden" war zweideutig (Owner 09.09.2026: „Bild laden, was soll das?") — laden
     heisst im Deutschen auch aufrufen. Gemeint ist: auf sein Gerät holen. */
  bildKnopf: "Bild herunterladen",
  bildAufruf: "Jetzt anfragen",
  bildFehler: "Das Bild ging gerade nicht. Versuch es bitte noch einmal.",

  trichterKicker: "DEIN TRICHTER",
  trichterAnzeige: "Deine Anzeige",
  trichterSeite: "Dein Trichter",
  trichterTitel: "Er steht schon. Mach ihn auf.",
  trichterKopieren: "Link kopieren",
  trichterKopiert: "Kopiert.",
  trichterGrenze: "Der Trichter läuft und sammelt Anfragen. Lesen kannst du sie im Dashboard — das schaltest du frei, wenn du so weit bist.",
};

export type VersusForgeTexte = typeof VERSUSFORGE_TEXTE;


/**
 * Die Trichtertexte in der Sprache des Besuchers — Deutsch ist die Quelle, und wo eine
 * eigene Fassung hinterlegt ist, gewinnt sie (Owner 08.09.2026: „RO und EN nicht wörtlich
 * aus dem Deutschen übersetzen").
 *
 * Die Reihenfolge ist wichtig: ERST übersetzen, DANN überschreiben. So bleibt jeder Text,
 * für den es keine eigene Fassung gibt, trotzdem in der richtigen Sprache.
 */
export async function versusforgeInSprache(lang: Lang): Promise<VersusForgeTexte> {
  const uebersetzt = await textbausteineInSprache(VERSUSFORGE_TEXTE, lang);
  const eigen = EIGEN[String(lang).slice(0, 2)];
  const fertig = eigen ? { ...uebersetzt, ...eigen } : uebersetzt;

  /**
   * PREISE ZULETZT EINSETZEN (Hausregel [[prices-only-from-pricing-table]], hier bis zum
   * 08.09.2026 schlicht vergessen: Im ganzen VersusForge-Zweig lief `fillPrices` nirgends,
   * ein `{analyse}` hätte roh auf der Seite gestanden).
   *
   * NACH der Übersetzung und NACH der Eigen-Tabelle, in dieser Reihenfolge:
   *  · Vor der Übersetzung eingesetzt, würde das Modell „9,99 €" in fremden Sprachen
   *    umformatieren oder verfälschen.
   *  · Nach der Eigen-Tabelle, damit auch die handgeschriebenen englischen und rumänischen
   *    Sätze ihre Preise bekommen — sonst hätte ausgerechnet der bessere Text keine Zahl.
   *
   * ACHTUNG ÜBERSETZER-FALLE: Das Modell erfindet Platzhalter oder lässt sie weg. Wo eine
   * Zahl verschwindet, steht sie in `EIGEN` von Hand richtig — dort greift diese Zeile.
   */
  const gefuellt = {} as Record<string, unknown>;
  for (const [schluessel, wert] of Object.entries(fertig)) {
    gefuellt[schluessel] = typeof wert === "string" ? fillPrices(wert, String(lang)) : wert;
  }
  return gefuellt as VersusForgeTexte;
}
