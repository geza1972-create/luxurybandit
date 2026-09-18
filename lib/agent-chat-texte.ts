import { textbausteineInSprache } from "@/lib/lebenslauf-uebersetzen";
import type { Lang } from "@/lib/lang";

/**
 * DIE TEXTE DES AGENTEN-CHATS — DEUTSCHE QUELLE, EINE STELLE.
 *
 * Dasselbe Muster wie im Trichter (`lib/versusforge-texte.ts`) und bei David: flaches
 * Objekt, zur Laufzeit übersetzt, im Client steht kein einziger Satz.
 *
 * ── WARUM DAS ÜBERHAUPT SEIN MUSS (Owner 09.09.2026: „gleich am Anfang müsste er die
 * Sprache erfragen oder den Browser fragen. Einige haben einen englischen Browser, wollen
 * aber auf Rumänisch reden") ───────────────────────────────────────────────────────────────
 *
 * Der Gruss stand fest auf Deutsch im Browser. Wer mit rumänischem Browser kam, las eine
 * Wand deutscher Sätze und ging — und das ausgerechnet an der Stelle, an der wir um
 * Vertrauen bitten (Datenschutz, Einverständnis, drei Regeln).
 *
 * DIE BROWSERSPRACHE IST EINE VERMUTUNG, KEINE ANTWORT. Sie sagt, welche Oberfläche jemand
 * eingestellt hat — nicht, in welcher Sprache er über sein Geschäft reden will. Ein
 * rumänischer Wirt mit englischem Telefon ist der Normalfall, nicht die Ausnahme. Deshalb
 * wird die Browsersprache VORGESCHLAGEN und die Wahl trotzdem gestellt.
 *
 * DIE FRAGE SELBST WIRD NICHT ÜBERSETZT — sie steht dreisprachig im Chat
 * (`components/AgentChat.tsx`). Eine Sprachfrage in einer Sprache, die der Gefragte nicht
 * liest, ist keine Frage.
 */
export const AGENT_CHAT_TEXTE = {
  /* ── Der Gruss ───────────────────────────────────────────────────────────── */
  /**
   * ── DER GRUSS FÜR KÜNSTLER (Owner 10.09.2026: „Vrei să-ți vinzi arta și nu știi cum? Vrei să
   * știi ce se cere pe piață? Avem soluția. Începe acum: câteva întrebări, iar noi îți facem un
   * plan de marketing.") ──────────────────────────────────────────────────────────────────────
   *
   * Hier stand der Gruss für jedes Geschäft — „Werbung, die Anfragen bringt", „Lamm vom
   * Holzkohlegrill". Im Browser-Test las ein Maler als Erstes von Lammfleisch. Die Engine ist
   * jetzt für Kunst; der Gruss spricht deshalb den Künstler an, mit den zwei Fragen des Owners.
   * „Ein paar Fragen" und keine Zahl: Wie viele es werden, entscheidet das Gespräch.
   */
  gruss1: "Hallo, ich bin VersusForge — ein KI-Agent für Künstler. Du willst deine Kunst verkaufen und weisst nicht, wie? Du willst wissen, was auf dem Markt gefragt ist?",
  gruss2: "Dann bist du hier richtig. Ein paar Fragen, und ich mache dir einen Marketingplan für deine Kunst — nicht aus einer Vorlage: in welche Kategorie deine Werke gehören, was an ihnen besonders ist, wer sie kauft, und die Sätze, mit denen du sie zeigst.",
  grussRegelnTitel: "Damit es schnell geht, drei Sachen:",
  /**
   * DREI ZEILEN IN EINEM SCHLÜSSEL, mit Absätzen dazwischen.
   *
   * ÜBERSETZER-FALLE, BEWUSST UMGANGEN ([[uebersetzer-fallen]]): Bei langen Listen verliert
   * das Modell still ganze Blöcke. Drei Zeilen mit Zeilenumbruch sind für den Übersetzer ein
   * Text und kommen vollständig zurück; drei einzelne Schlüssel wären drei Aufrufe für
   * denselben Gedanken.
   *
   * Das Beispiel ist absichtlich konkret und übersetzbar: „Gutes Essen" gegen „Lamm vom
   * Holzkohlegrill" funktioniert in jeder Sprache, weil der Unterschied im Bild liegt, nicht
   * im Wort.
   */
  /* FÜR KÜNSTLER (10.09.2026): Die erste Regel ist die erste Frage des Kunst-Rezepts — zeigen
     statt beschreiben. Das Lamm-Beispiel gehörte zum Gruss für jedes Geschäft. */
  grussRegeln: "· Zeig mir deine Bilder, statt sie zu beschreiben — ich schaue sie mir an.\n· Verstehe ich etwas falsch, sag es sofort — ich rechne damit.\n· Was du nicht weisst, lass weg. Ich erfinde nichts, und du sollst es auch nicht.",
  /**
   * „STARTUP" STATT „WIR STEHEN AM ANFANG" (Owner 09.09.2026: „wir sind am Anfang stimmt
   * nicht, wir sind ein Startup ist besser").
   *
   * ER HAT ZWEIMAL RECHT. Sachlich: Das Haus läuft seit einem Jahr mit zwölf Anwendungen —
   * „am Anfang" wäre schlicht falsch. Und im Ton: „Wir stehen am Anfang" klingt nach
   * unfertig, und das liest jemand, der gerade überlegt, ob er einer Maschine sein Geschäft
   * erklärt. „Startup" sagt dasselbe über den PREIS — noch nichts verdient, deshalb gratis —
   * ohne etwas über die Qualität zu behaupten.
   */
  /**
   * ── WAS ER KOSTENLOS BEKOMMT, STEHT AM ANFANG (Owner 09.09.2026: „am Anfang sagen wir, was
   * er kostenlos bekommt, bitte anpassen") ──────────────────────────────────────────────────
   *
   * VORHER STAND HIER NUR „die ganze Strategie". Das ist ein Wort aus der Beratersprache und
   * beschreibt nichts, was man anfassen kann — und seit heute stimmt es auch nicht mehr: Er
   * bekommt mehr als eine Strategie. Er bekommt eine laufende Seite und die erste echte
   * Anfrage mit Namen und Telefonnummer.
   *
   * ALS LISTE, NICHT ALS SATZ (Hausregel vom 09.09.2026: „wir brauchen alles, was er bekommt,
   * als Liste und nicht als Text"). Vier Zeilen, die man zählen kann, schlagen einen Absatz,
   * den man überfliegt.
   *
   * UND DIE GRENZE STEHT GLEICH DABEI. Wer erst beim Schloss erfährt, dass es eine Grenze
   * gibt, fühlt sich überrumpelt — auch wenn alles davor geschenkt war. Vorher gesagt, ist
   * dieselbe Grenze ein fairer Handel.
   */
  /* FÜR KÜNSTLER (10.09.2026): Galerie mit Agent statt „eigene Seite", und der Satz des Owners
     zum Bezahlen („Du zahlst, wenn unser Agent für dich arbeitet und du ihn behalten willst").
     `{preis}` ist der Abo-Preis aus lib/pricing.ts; die „drei" ist `ABO_FRAGE_AB` in
     lib/versusforge-abo.ts — der Satz sagt, was der Code tut. */
  /* KOSTENLOS, MIT GRUND UND VERSPRECHEN (Owner 11.09.2026: erst „es ist free jetzt wirklich", dann
     „das glaubt niemand ohne Grund … wir leben von Sponsoren oder Crowdfunding … für ihn bleibt es so,
     die ersten Künstler sind free"). Hier standen davor schon „nach drei Interessenten", „{preis} im
     Monat" und „Startup". */
  grussKostenlos: "Das hier ist kostenlos — wir finanzieren uns in dieser Aufbauphase über Sponsoren und Crowdfunding, und für dich als einen der ersten Künstler bleibt es so. Du bekommst:\n· einen Spruch zu deinem Bild, der Käufer anhält\n· deine eigene Seite auf lakatosbandi.com, unserer Plattform für Künstler, mit einem KI-Agenten, der mit deinen Interessenten spricht\n· jede Anfrage mit Namen und Telefonnummer, zum Anrufen",
  /**
   * DER DATENSCHUTZSATZ — er trägt ein Versprechen, das ein Mensch einlöst.
   *
   * Die 30 Tage („was 30 Tage lang ungenutzt bleibt, löschen wir von uns aus") standen hier seit dem
   * 09.09.2026 und sind am 11.09.2026 herausgenommen (Owner, rumänischer Chat: „raus damit") — eine
   * Künstlerseite soll nicht verschwinden, nur weil er sie einen Monat nicht anfasst.
   *
   * WER DIESEN SATZ ÄNDERT, ÄNDERT EIN VERSPRECHEN — und wer das Aufräumen einstellt, muss
   * den Halbsatz wieder herausnehmen. Ein Datenschutzsatz, den niemand einhält, ist
   * schlimmer als keiner. Das gilt jetzt in drei Sprachen.
   */
  grussDatenschutz: "Zum Datenschutz: Was du schreibst und die Bilder, die du zeigst, verarbeitet ein KI-Modell von OpenAI — anders geht es nicht. Am Ende schicken wir dir die weiteren Infos per E-Mail; dafür brauche ich deine Adresse, und ab da liegt sie bei uns. In jeder Mail steht ein Link, mit dem du alles wieder löschst — sofort, ohne Nachfrage und ohne Begründung.",
  /* Owner 10.09.2026: kein Plan und keine Werbung mehr — am Ende steht sein Bild mit Spruch. */
  grussFrage: "Ein paar Minuten, dann steht dein Bild mit Spruch. Einverstanden?",

  /* ── DER ANFANG AUF LAKATOSBANDI.COM/START ──────────────────────────────────────────────────
   *
   * HIER STAND VAN GOGH (Owner 12.09.2026: „das mit vangoch führt die anzeige nicht fort im
   * trichter"). Die Karte zeigte ein Beispiel — schlechter Post, guter Satz — und fragte „Willst
   * du auch so ein Marketing?". Die Anzeige davor sagt aber „ARATĂ TOT": zeig alles, auch die
   * Skizzen. Wer darauf klickte, las als Erstes ein anderes Versprechen als das, für das er kam.
   *
   * JETZT BENENNT DIE KARTE SEINE LAGE UND SAGT, WAS ER TUN SOLL (Owner: „es muss gleich mit
   * hast du viele bilder im keller, laden sie hoch und vermarkte sie hier"). Kein Bild mehr —
   * eines kommt erst wieder, wenn das eigene Motiv steht (gestapelte Leinwände von hinten). ── */
  /* ── VOM KELLER ZUM ZIEL (Owner 13.09.2026: „Arbeiten im Keller ist nicht gut" · „die Leute
     wollen berühmt werden" · „ich hatte ein schlechtes Konzept") ───────────────────────────────
     Hier stand „Hast du viele Bilder im Keller, im Atelier oder auf dem Dachboden?". Diese Frage
     sprach über sein PROBLEM — ungenutzte Arbeit, Reste — und verlangte von ihm, sich darin zu
     erkennen. Jetzt steht sein ZIEL da: gesehen werden. Wortlaut vom Owner. */
  /* Verbindet das Bild sofort mit dem Nutzen (Owner 13.09.2026: „eine sehr kurze Zeile direkt
     oberhalb vom Mockup — das verbindet das Bild sofort mit dem Nutzen"). */
  startMockup: "So kann deine Seite aussehen.",
  /* ── TITEL DER KARTE (Owner 13.09.2026: „Titel. Marketing for Art.") ───────────────────────
     In allen Sprachen gleich: Es ist die Bezeichnung dessen, was wir tun, nicht ein Satz, den
     man übersetzt — wie „lakatosbandi.com" selbst. */
  /**
   * ── OHNE DAS WORT „MARKETING" (Owner 15.09.2026: „sie vertrauen dem wort markting nicht")
   * ───────────────────────────────────────────────────────────────────────────────────────────
   * Hier stand „Marketing for Art". Für einen Maler klingt das nach Verkäufer, nicht nach
   * jemandem, der seine Arbeit ernst nimmt — und das Hochladen brach ein. Die Zeile sagt jetzt
   * dasselbe in seiner Sprache: gezeigt werden.
   */
  startTitel: "Kunst, die die Welt sieht",
  /**
   * ── DER HOOK DER ANZEIGE, AUCH IM TRICHTER (Owner 13.09.2026: „das schreibst du auch ins
   * Tunnel rein") ─────────────────────────────────────────────────────────────────────────────
   *
   * DERSELBE SATZ WIE IN DER ANZEIGE und in der Linkvorschau (app/engine/page.tsx). Wer auf eine
   * Anzeige klickt und auf der Seite etwas anderes liest, hat im ersten Moment den Faden
   * verloren — und genau dieser erste Moment ist die Stelle, an der am 13.09.2026 neun von
   * fünfundzwanzig abgesprungen sind.
   *
   * Deutsch und Englisch sind sinngemäss: „e invizibilă" meint ungesehen, nicht durchsichtig.
   */
  /* Owner 15.09.2026, wörtlich: „man kann sagen, Vigent Goch wurde der WElt gezeigt, wo wird
     dein Bild gezeigt?" — die Frage trifft, was ein Maler wirklich fragt, und sie verspricht
     nichts, was wir nicht halten: Wir zeigen es, wir verkaufen es nicht. */
  /* ── DER HOOK IST UNSER KONZEPT, NICHT VAN GOGH (Owner 18.09.2026: „sag, dass wir ein
     einzigartiges Marketing-Konzept haben, Art Fair … und Louisett als Beispiel geben, nicht
     Van Gogh" · „Fang an, deine Kunst jetzt clever zu vermarkten mit lakatosbandi Art Fair") ──
     Van Gogh war ein Vergleich, den jeder kennt — aber er verspricht Ruhm. Artist Fair
     verspricht etwas Prüfbares: aus Kunst werden Produkte, und die Lizenz gehört ihm. */
  startHook: "Fang an, deine Kunst clever zu vermarkten — mit lakatosbandi Art Fair.",
  /* ZWEI ZEILEN, ZWEI GEWICHTE (Owner 13.09.2026: „Noi îl facem. klein drunter und nicht
     Serif"). Die Behauptung trägt die Karte, die Antwort darauf steht leise darunter — sie
     muss nicht laut sein, sie muss nur dastehen. */
  /* Owner 15.09.2026, wörtlich: „wir zeigen es der Welt." */
  startHookKlein: "Deine Werke werden zu Produkten. An jeder Bestellung verdienst du mit.",
  /**
   * ── DAS BEISPIEL MIT VAN GOGH, WIEDER OBEN (Owner 13.09.2026: „jetzt postest du doch den
   * beispiel mit vangoch obendrauf" · „aber raus wenn der to much ist") ───────────────────────
   *
   * AM 12.09.2026 FLOG ES RAUS, und der Grund stand im Code: „das mit vangoch führt die anzeige
   * nicht fort im trichter". Damals versprach die Anzeige „zeig alles" und die Karte zeigte ein
   * Museumsstück — zwei verschiedene Versprechen auf einem Weg.
   *
   * JETZT IST ES UMGEKEHRT: Die Anzeige sagt „Arta fără marketing e invizibilă", und Van Gogh
   * ist der Beweis dieses Satzes — zu Lebzeiten ungesehen. Das Beispiel führt die Anzeige also
   * fort, statt ihr zu widersprechen.
   *
   * DIE SÄTZE SIND DIESELBEN WIE AUF DER HOMEPAGE (`beispielNachher` in lakatosbandi-bald-texte),
   * wörtlich übernommen: Zwei Fassungen desselben Beispiels wären zwei Stimmen.
   *
   * DIE QUELLE IST PFLICHT UND GEKÜRZT: Ein gemeinfreies Werk muss als Beispiel erkennbar
   * bleiben — sonst hält es jemand für ein Werk, das wir vermarktet haben. Die lange Fassung der
   * Homepage sprengt eine Chat-Karte; Urheber, Titel und Jahr genügen.
   */
  /**
   * ── DAS VAN-GOGH-BEISPIEL IST GANZ AUS DEM TRICHTER RAUS (14.09.2026) ──────────────────────
   *
   * Hier standen Label, Satz und Quellenangabe zu „Die Sternennacht". Zwei Gründe, beide vom
   * Owner:
   *
   * 1. DER SATZ WAR FALSCH. „Der Blick aus dem Fenster der Heilanstalt … mit einem Dorf, das es
   *    nie gab" — nachgeprüft: Saint-Rémy gab es sehr wohl, es lag nur nördlich und war von
   *    seinem Ostfenster aus nicht zu sehen; und der Fensterblick gilt nur für den HIMMEL
   *    (belegt durch seinen Brief an Theo über den Morgenstern). Owner: „aber ob das stimmt.
   *    Der Dorf hat vielleicht existiert."
   * 2. DAS BILD GEHÖRT IN DIE ANZEIGE, NICHT IN DIE KARTE („das nehmen wir für FB"). Im Trichter
   *    muss der Knopf auffallen, nicht ein Museumsstück.
   *
   * Wer das Beispiel je zurückholt, schreibt den Satz neu — dieser hier war erfunden.
   */
  /* Die Beschriftung des einen Knopfes (Owner 13.09.2026: „Nur Button: Incarca pana la 5
     Picturi der Arta ale tale si le analizam."). Sie trägt die ganze Aussage der Karte —
     was er tun soll UND was wir dafür tun. Deshalb ein Satz und kein Wort. */
  /* EIN WERK (Owner 13.09.2026: „wir laden nur ein bild hoch nicht 1-5"). Analysiert wird
     ohnehin nur eins; mehr zu verlangen, wäre ein Versprechen ohne Gegenwert. */
  /* Bis zu zehn (Owner 14.09.2026: „10 Bilder zulassen, damit die Seite nach was aussieht") —
     analysiert wird davon genau eines, das sagt der Agent im nächsten Schritt. */
  startKnopf: "Hochladen",
  /* DER SATZ ÜBER DEM KNOPF (Owner 14.09.2026: „Urca pana la 10 lucrari. Primesti un Exemplu de
     Marketing." · „Button Upload" — der Knopf bleibt kurz, der Satz trägt die Erklärung). */
  startUploadText: "Lade bis zu 10 Werke hoch. Du bekommst ein Marketing-Beispiel.",
  /* DAS VERSPRECHEN DIREKT UNTER DEM TITEL (Owner 13.09.2026, neuer Wortlaut: „Pagina ta de artist
     în 1 minut."). Der Titel sagt, warum; diese Zeile sagt, was er bekommt und wie schnell. */
  startUnterzeile: "Deine Künstlerseite in 1 Minute.",
  /* ── DER EINSTIEG IST DAS HOCHLADEN (Owner 13.09.2026: „hier werden direkt mit Bilder upload
     und sagen, dass deine Kunst analysieren, laden hier bis zu 5 Bilder hoch.") ──────────────
     Die Karte erklärt nicht mehr, sie fordert auf. `startAnalyse` sagt, was mit den Bildern
     passiert — ohne das wäre „lade hoch" eine Bitte ohne Gegenleistung. */
  startAnalyse: "Wir analysieren deine Kunst.",
  /* FÜNF, NICHT ZEHN (Owner 13.09.2026) — im Trichter. Im Dashboard bleibt es bei 10: Wer
     fertig ist, füllt dort auf. Kürzer heisst hier: schneller fertig, weniger Abbruch. */
  startText: "Lade bis zu 5 Werke hoch.",
  /* DER HOCHLADEKNOPF IST JETZT DIE ZUSTIMMUNG. Vorher war es der schwarze Knopf „Ja, ich will
     meine Seite" unter der Textwand; die Wand entfällt, die Einwilligung darf nicht mit ihr
     verschwinden. Sie steht klein unter dem Knopf, der Datenschutztext bleibt darunter
     ausklappbar. Die Bilder verlassen den Browser dabei noch nicht (AgentChat, Zweig
     `nurBilder`) — verarbeitet wird erst beim Abschluss. */
  /**
   * ── WAS ER BEKOMMT, GANZ ZUM SCHLUSS (Owner 15.09.2026: „sag am ende was er von uns bekommt.
   * eine präsenz und eine webseite. es kostet ihn nichts jetzt. Aber wir prüfen zuerst die
   * werke.") ──────────────────────────────────────────────────────────────────────────────────
   *
   * UNTER dem Knopf, nicht darüber: Oben steht die Frage, die ihn hergebracht hat. Das Angebot
   * ist die Antwort für den, der schon fast drückt — und der letzte Satz ist eine Bedingung,
   * keine Werbung. Wir sagen sie trotzdem, weil sie sonst als Überraschung käme.
   */
  startAbschluss: "Du bekommst eine Präsenz und eine eigene Webseite. Jetzt kostet dich das nichts. Zuerst sehen wir uns deine Werke an.",
  startZustimmung: "Mit dem Hochladen stimmst du dem Datenschutz zu.",
  /* Das Schlusszeichen ist „ “ und nicht das gerade " — sonst endet der String mitten im Satz und
     die ganze Datei bricht. Deutsch schliesst mit “, Rumänisch mit ”. */
  startListe: "Skizzen, Studien, Versuche, alte Arbeiten oder deine Lieblingswerke.",
  /* ── „FÜR ALLE" STATT „KEINE AUFNAHMEPRÜFUNG" (Owner 13.09.2026: „Eu aș scoate complet fraza
     «Fără examen de admitere» din zona principală. E bună ca idee, dar acum îți diluează
     hook-ul.") ────────────────────────────────────────────────────────────────────────────────
     Der Satz beantwortete einen Einwand, den an dieser Stelle noch niemand hat — und lenkte vom
     Versprechen ab. Die Zusage steht jetzt klein unten (`startFein`), wo sie beruhigt statt zu
     bremsen. Hier stehen die zwei Hürden, die ihn wirklich abhalten: kein Website-Bau, kein Name. */
  startKeinePruefung: "Du musst keine Website bauen.\nDu musst kein bekannter Künstler sein.",
  /* WAS ER BEKOMMT UND WARUM ES NICHTS KOSTET, STEHT JETZT VORNE (Owner 12.09.2026: „natürlich
     gleich schreiben was er bekommt als Liste und warum wir das machen und wie wir das
     finanzieren, das steht bei uns am Ende" · „was am Ende steht nach vorne bringen"). Gekürzt,
     nicht verschoben: Der ganze Absatz von hinten würde die Karte wieder zur Wand machen, die am
     11.09.2026 aus genau diesem Grund zusammengestrichen wurde. Vier Punkte, ein Satz. */
  /* „GRATIS" SCHON IN DER ÜBERSCHRIFT (Owner 13.09.2026: „Primești gratuit:") — der Preis steht
     damit VOR der Liste, nicht erst darunter. */
  startBekommstTitel: "Du bekommst gratis:",
  /* Reihenfolge nach dem, was ihm am meisten abnimmt (Owner 13.09.2026: „schreib wir machen deine
     Marketing-Texte für die Kunstwerke" · „automatisch"): erst die eigene Seite, dann die Texte,
     die sonst niemand schreibt, dann der Agent. */
  /* HÄKCHEN STATT PUNKTE (Owner 13.09.2026: „das fehlt und gross und mit Häkchen"). Ein Punkt
     zählt auf, ein Häkchen sagt: das ist erledigt, das bekommst du. */
  startBekommst: "✔ deine eigene Seite auf lakatosbandi.com\n✔ Präsentationstexte zu jedem Werk\n✔ deinen eigenen AI Art Agent, der mit Interessenten spricht\n✔ Anfragen und Kontaktdaten von Menschen, die sich für deine Kunst interessieren",
  /* DER SATZ, DER DIE ARBEIT WEGNIMMT (Owner 13.09.2026: „Tu doar încarci imaginile. Noi facem
     restul."). Er steht zwischen Liste und Preis: erst was er bekommt, dann wie wenig er dafür tut. */
  startSelbst: "Du lädst nur die Bilder hoch. Den Rest machen wir.",
  /* Der kurze, grosse Satz über dem langen (Owner 13.09.2026: „Gratuit acuma"). */
  startGratis: "Kostenlos für die Künstler, die jetzt einsteigen.",
  /* Der Satz über Sponsoren steht nicht mehr in der Karte (Owner 13.09.2026, neuer Wortlaut) —
     leer heisst: die Zeile erscheint gar nicht. Der Schlüssel bleibt, andere Rezepte nutzen ihn. */
  startWarum: "",
  startAufruf: "Fang jetzt an.",
  /* KLEIN GANZ UNTEN, NICHT IM HAUPTTEIL (Owner 13.09.2026: „o poți pune mai jos, foarte mic").
     Dieselbe Zusage wie früher „Keine Aufnahmeprüfung", nur an der Stelle, an der sie hilft. */
  startFein: "Skizzen, Versuche und alte Arbeiten sind willkommen. Wir wählen nicht nur „die besten“ aus.",
  /* Klein unter dem Knopf — nimmt die letzte Hürde vor dem Klick. */
  startDauer: "Dauert etwa 1 Minute.",
  /* Die zwei Ängste beim letzten Klick (Owner 13.09.2026: „Sub buton, mic: Fără card. Fără
     abonament."). Sie stehen NACH dem Ja, nicht davor — vorher wären sie ein Hinweis auf Kosten. */
  startKeineKarte: "Keine Karte. Kein Abo.",
  startDatenschutzTitel: "Datenschutz",
  startJa: "Ja, ich will meine Seite",
  /* DAS HÄKCHEN BEI NAME UND E-MAIL (Owner 12.09.2026: „Die Bilder gehören mir und ich hafte für
     die Veröffentlichung ganz" · „ein AGB link wo es steht"). Es sperrt den Senden-Knopf, bis es
     gesetzt ist — eine Einwilligung, die man übergehen kann, ist keine. */
  rechteHaekchen: "Die Bilder gehören mir. Ich hafte für ihre Veröffentlichung.",
  rechteAgb: "AGB",
  chipEinverstanden: "Ja, einverstanden",
  /**
   * ── DIE ERSTE FRAGE IST GESCHRIEBEN, NICHT ERZEUGT ────────────────────────────────────────
   *
   * Owner 10.09.2026, mit Bild der Antwort nach dem Chip: „hier hast du 30 Sekunden für diese
   * Antwort gebraucht" · „du kannst doch nicht alle Regeln immer prüfen, wenn nicht nötig,
   * oder? Wenn er auf einen Chip klickt zum Beispiel" · „du musst kosteneffizient arbeiten
   * und schnell."
   *
   * ER HAT RECHT, UND ES IST DER KLARSTE FALL IM GANZEN GESPRÄCH: Nach „Ja, einverstanden"
   * gibt es nichts zu entscheiden. Die nächste Frage ist immer dieselbe. Sie trotzdem von
   * einem denkenden Modell mit 3800 Token Regeln schreiben zu lassen, kostet acht Sekunden
   * und Geld für einen Satz, der feststeht ([[agenten-schnell-und-billig]]).
   *
   * DAS BEISPIEL IN KLAMMERN IST DIE EIGENTLICHE ARBEIT DIESES SATZES. „Konkret" versteht
   * jeder anders; „Lamm vom Holzkohlegrill" statt „gutes Essen" versteht jeder gleich.
   */
  /* DIE ERSTE FRAGE DES KUNST-REZEPTS (Owner 10.09.2026: „Kannst du mir zeigen, was du malst?").
     Zuerst sehen, nicht beschreiben lassen — was ein Künstler über seine Kunst sagt, stimmt oft
     nicht. Hier stand noch „Und wenn du eine Website hast, schreib die Adresse gleich dazu." —
     raus (Owner 11.09.2026: „die Webseite interessiert uns nicht"). */
  /* „EIN, ZWEI BILDER" WAR EIN WIDERSPRUCH ZUR KARTE DARÜBER (Owner 12.09.2026 im lokalen Durchgang:
     „das ist falsch. Urca pana la 10 tablouri"). Die Startkarte lädt zu bis zu 10 Arbeiten ein; die
     erste Frage bat zwei Zeilen später um zwei. Wer alles zeigen soll, darf nicht sofort gebremst
     werden. Schlicht formuliert, weil der Satz maschinell in sieben Sprachen übersetzt wird. */
  ersteFrage: "Dann leg los: Kannst du mir zeigen, was du malst? Lade ein Werk hoch.",
  /* Wer nur Bilder schickt und nichts dazu schreibt, hat trotzdem geantwortet — der Satz steht
     an Stelle des leeren Textes, damit das Gespräch lesbar bleibt. */
  /* EINZAHL, seit der Trichter genau EIN Werk nimmt (Owner 13.09.2026). */
  nurBilder: "Hier sind meine Werke.",
  /* Der grosse Knopf unter der Bitte um Bilder — das kleine Symbol im Feld findet keiner. */
  bilderKnopf: "Bilder hochladen",
  /* ── DER SCHRITT VOR DER ADRESSE (Owner 13.09.2026: „Dann wird der Button aktiv Jetzt
     analysieren … Willst du das auf unserer Seite veröffentlichen und vermarkten?") ──────────
     Er sieht zuerst, was wir aus einem seiner Werke machen, und entscheidet danach. */
  analyseKnopf: "Jetzt analysieren",
  /* Während der Analyse — sie dauert einige Sekunden, und ein stummer Schirm sieht kaputt aus. */
  analyseLaeuft: "Ich sehe mir dein Werk an …",
  /* Der Satz über der Vorschau: EIN Beispiel, nicht alle („die anderen nicht"). */
  analyseFertig: "Das ist ein Beispiel — so stellen wir dein Werk vor.",
  analyseFehler: "Das hat gerade nicht geklappt. Versuch es noch einmal.",
  /**
   * Wenn das Hochgeladene kein Werk ist (Zertifikat, Screenshot, Dokument). Sie sagt, was fehlt,
   * ohne ihn zu beschämen — und nennt den Weg zurück (Owner 14.09.2026).
   */
  keinWerk: "Das sieht nicht nach einem Kunstwerk aus. Lade ein Bild von einem deiner Werke hoch — ein Gemälde, eine Zeichnung, eine Skulptur.",
  /** Wenn die zwei freien Analysen auf diesem Gerät verbraucht sind (Owner 14.09.2026). */
  analyseVerbraucht: "Du hast deine zwei freien Analysen für heute verbraucht. Schreib uns, wenn du mehr brauchst.",
  /**
   * ── DAS ANGEBOT STATT EINER ANALYSE (Owner 15.09.2026: „Ma uit la lucrarea ta soll nichts
   * analysieren. Einfach nur Superb. Willst dass deine Seite auf unsere Webportal erschint?")
   * ───────────────────────────────────────────────────────────────────────────────────────────
   *
   * Vorher sah der Trichter zuerst das Bild an, schrieb einen Satz und fragte danach. Das kostete
   * bei JEDEM Hochladen Geld — auch bei denen, die gleich wieder gingen — und der schöne Satz
   * hat niemanden weitergebracht (14./15.09.2026: fünf Analysen, keine einzige Seite).
   *
   * Jetzt kommt sofort das Angebot, und zwar vollständig: Webseite, Verkaufsagent, Link per
   * Mail, selbst verwalten, teilen, kostenlos. Erst wenn er Ja sagt, sehen wir uns das Werk an.
   */
  publizierenFrage: "Willst du, dass deine Seite auf lakatosbandi.com erscheint?",
  /** Was dahinter steckt — steht als Absatz über der Frage, in seinen Worten. */
  publizierenAngebot: "Du bekommst eine echte Internetseite und einen Verkaufsagenten. Den Link dazu bekommst du per E-Mail: Du verwaltest sie selbst und kannst sie teilen. Es kostet dich nichts — du bist sofort in unserem Gratis-Paket.\n\nWir bauen eine Galerie, die spricht: Jedes Werk erzählt seine Geschichte, und ein Agent redet mit den Interessenten. Und wir haben ein Marketing-Konzept, das es sonst nirgends gibt: Artist Fair. Jeder Künstler kann seine Kunst in Produkte verwandeln — Poster, Druckdateien, Textil — und an den Lizenzen verdienen. Auf jedem Stück stehen sein Name und die Adresse seiner Seite.",
  publizierenJa: "Ja",
  publizierenNein: "Nein",
  /* ── SEIN NEIN WIRD BEIM WORT GENOMMEN (Owner 13.09.2026: „da ist jetzt falsch") ───────────
     Auf „Nein" stand „deine Seite ist online, die Links sind in deiner Mail" — beides gelogen:
     Es wurde nichts angelegt und nichts verschickt. Der Satz steht FEST im Browser, ohne
     Modellaufruf: Auf ein Nein gibt es nichts zu entscheiden. */
  publizierenAbsage: "Alles klar — wir veröffentlichen nichts. Dein Werk bleibt bei dir.",
  /* ── BEIM NEIN EIN ZWEITER VERSUCH (Owner 13.09.2026: „dann soll er 3 mal eine neuen chance
     bekommen" · „beim zweiten Nein OK") ────────────────────────────────────────────────────
     Ein Nein kann dem SATZ gelten, nicht dem Angebot. Also fragen wir einmal nach und schreiben
     ihn neu — höchstens dreimal. Sagt er ein zweites Mal Nein, ist es sein Nein zur Sache, und
     dann wird nicht weiter gefragt. */
  nochmalFrage: "Soll ich den Satz anders schreiben?",
  neuGenerieren: "Neu schreiben",
  /* ── DIE EINZIGE FRAGE NACH EINEM NEIN (Owner 13.09.2026: „Dann schreibe uns bitte was du
     möchtest oder gib uns ein Feedback was wir besser machen können") ───────────────────────
     Wer alles gesehen und trotzdem abgelehnt hat, ist der Einzige, der sagen kann, warum der
     Trichter Leute verliert. Eine Frage, offen, freiwillig — und KEINE Adressabfrage: Wer
     gerade nein gesagt hat und dann nach seiner E-Mail gefragt wird, liest genau das, was er
     vermeiden wollte. Der Satz ist mehr wert als die Adresse.
     Es geht über den VORHANDENEN Feedback-Weg (`api/versusforge-feedback`): abgelegt, als Mail
     beim Owner, mit der letzten Frage des Agenten — und ohne Modellaufruf. */
  absageFrage: "Was hat dich abgehalten?",
  /* ── DAS NEUE ENDE (Owner 13.09.2026: „dann kannst du die webseite generieren und wenn er das
     behalten möchte dann soll er sein name und email angeben und bestätigen wenn nicht wird
     gelöscht") ──────────────────────────────────────────────────────────────────────────────
     Die Seite entsteht, BEVOR er sich nennt. Er sieht sie, und erst dann entscheidet er. Das
     dreht die alte Reihenfolge um, in der Adresse und Bestätigungsmail vor jedem Ergebnis
     standen — die teuerste Hürde im Trichter. */
  anlegenLaeuft: "Ich baue deine Seite …",
  anlegenFehler: "Das hat gerade nicht geklappt. Versuch es noch einmal.",
  seiteFertig: "Deine Seite ist fertig — sieh sie dir an.",
  seiteAnsehen: "Seite ansehen",
  /* Kein Druck: Er hat sie schon gesehen, sie gehört ihm noch nicht. */
  behaltenFrage: "Willst du sie behalten? Dann sag uns, wie du als Künstler heisst und wohin die Links gehen.",
  behaltenKnopf: "Ja, behalten",
  /* EHRLICH SEIT DER FREIGABEPFLICHT (Owner 14.09.2026: „ich muss es freigeben"). Hier stand
     „Fertig — die Seite gehört dir." Sie gehört ihm, aber sie ist noch nicht öffentlich; das
     wäre dieselbe Falschmeldung wie heute beim „Nu". */
  behaltenFertig: "Deine Seite ist angelegt und die Links sind unterwegs. Wir sehen sie uns noch an — danach erscheint sie in der Übersicht.",
  behaltenFehler: "Das hat nicht geklappt. Versuch es bitte noch einmal.",
  /**
   * WAS PASSIERT, WENN ER NICHTS TUT — und zwar WAHR (Owner 13.09.2026: „nein nicht löschen. Der
   * user kann selbst alles löschen wenn er will").
   *
   * HIER STAND „Ohne Namen und Adresse löschen wir die Seite wieder." Das war als sanfter Druck
   * gedacht und ist seit dieser Entscheidung schlicht falsch: Es wird nichts gelöscht. Ein
   * Versprechen, das wir nicht halten, ausgerechnet an der Stelle, an der er uns seine Adresse
   * geben soll — das ist der teuerste Ort für eine Unwahrheit.
   */
  behaltenHinweis: "Ohne Namen und Adresse bleibt die Seite ohne Besitzer und erscheint nicht in der Übersicht.",
  /**
   * ── DIE ADRESSE NOCH EINMAL ZEIGEN, BEVOR ETWAS RAUSGEHT (Owner 13.09.2026: „wenn jemand
   * seine email angibt, bevor du es versendest, frag noch mal nach, ist die adresse richtig?") ─
   *
   * WARUM: Dorin Macovei gab `dorin61arts@yahoo..com` an — zwei Punkte. Zehn Werke hochgeladen,
   * alles richtig gemacht, und die Mail ging ins Nichts. Das verschärfte Prüfmuster fängt diesen
   * Fall jetzt, aber es kann nie alle fangen: `gmial.com` ist technisch tadellos und trotzdem
   * falsch. Nur der Mensch selbst erkennt seine Adresse wieder.
   */
  /* Owner 14.09.2026: „Sonst kommst du nie in dein Profil rein" — der Grund gehört daneben,
     sonst klickt er die Rückfrage weg. Ausgelöst hat es `oana_boboc@yahoo.c`: Seite angelegt,
     Post kam zurück, Künstler unerreichbar. */
  mailRichtigWarnung: "Ohne richtige Adresse kommst du nie in dein Profil.",
  mailRichtigFrage: "Ist diese Adresse richtig?",
  mailRichtigJa: "Ja, stimmt",
  mailRichtigNein: "Nein, ändern",
  /* Owner 10.09.2026: „einschränken beim ersten Hochladen auf 4" — sichtbar, nicht still. */
  /* ZEHN, NICHT VIER (Owner 12.09.2026: „bis zu 10 werke dann"). Hier stand „Höchstens 4 Bilder."
     — direkt unter dem Satz „Încarcă până la 10 lucrări", also ein Widerspruch auf demselben
     Schirm. Die Grenze im Code ist längst 10 (`slice(0, 10)`), nur dieser Text war stehengeblieben. */
  /* EIN BILD IM TRICHTER (Owner 13.09.2026) — die Zahl steht im Code an EINER Stelle
     (`WERKE_TRICHTER` in components/AgentChat.tsx); diese Texte müssen ihr folgen. */
  bilderHoechstens: "Ein Bild.",
  /* Der Schlüssel heisst weiter `bilderErsteZehn` — umbenennen hiesse, ihn in sieben
     Sprachtabellen und drei Dateien anzufassen, für nichts als den Namen. */
  bilderErsteZehn: "Ich nehme die ersten 10 Bilder.",
  /* Die Frage nach dem Nein zum Promoten („Willst du alles löschen?") — feste Knöpfe, kein Modell. */
  loeschenJa: "Ja, alles löschen",
  loeschenNein: "Nein",
  vorschauAlt: "Dein Bild mit Spruch",
  werkzeugSpruch: "Bild mit Spruch gezeigt",
  werkzeugAbschluss: "Profil angelegt",
  /* Die Karte nach „Passt das? — Ja" (Owner 10.09.2026: „Titel, Technik, Größe, … Datum"). */
  passtJa: "Ja, passt",
  /* Owner 10.09.2026: „also zurückgehen kann" — unter seiner letzten Antwort. */
  zurueck: "Zurück",
  /* Die zwei Felder am Ende (Owner 11.09.2026: „zwei Eingabefelder"). */
  feldKuenstlername: "Künstlername",
  feldEmail: "E-Mail",
  /* ── DIE PREISSPANNE STEHT IM CHAT (Owner 12.09.2026: „bilder hochladen, preise, name vorname
     dann die seite steht" · „ich wollte die preisspanne drin lassen" · „für alles. auch wenn er
     neue hochlädt fragen die preisspanne") ────────────────────────────────────────────────────
     EINE Angabe für ALLE Werke, in seinen Worten — sie steht im selben Feld-Block wie Name und
     E-Mail, damit daraus EIN Schritt wird statt drei. Lädt er später neue Bilder hoch, wird sie
     erneut gefragt und gilt dann auch für die alten (Owner: „es werden auch die alten geändert"):
     Ein Werk ohne eigenen Preis zeigt immer die aktuelle Spanne (lib/lakatosbandi-preis.ts,
     `preisSatz`). Freiwillig — bleibt sie leer, steht „Preis auf Anfrage". */
  feldPreisSpanne: "Was verlangst du für deine Werke?",
  feldPreisSpannePlatzhalter: "z. B. 400 €–1300 €",
  kontaktSenden: "Senden",
  /* Feedback jederzeit (Owner 10.09.2026: „damit wir lernen"). */
  feedbackLink: "Feedback geben",
  feedbackPlatzhalter: "Was hat dich gestört, was fehlt, was war gut?",
  feedbackSenden: "Senden",
  feedbackDanke: "Danke! Dein Feedback ist bei uns angekommen.",
  feedbackFehler: "Das hat nicht geklappt. Versuch es bitte noch einmal.",
  feedbackSchliessen: "Schließen",
  /* Das ✎ neben jedem Spruch-Chip (Owner 11.09.2026). */
  spruchAendern: "Diesen Satz ändern",
  /* Unter dem Bild nach „✎": seine eigene Fassung statt der verbesserten (Owner 11.09.2026). */
  textMeiner: "Meinen Text nehmen",
  /* Knopf unter der Schlussnachricht (Owner 11.09.2026). */
  profilErgaenzen: "Profil ergänzen",
  passtNein: "Nein",
  werkKarteTitel: "Magst du noch etwas zum Bild schreiben? Alles freiwillig.",
  feldTitel: "Titel",
  feldTechnik: "Technik",
  feldGroesse: "Größe",
  feldJahr: "Jahr",
  feldPreis: "Preis",
  /* Vor jedem Beispiel in der Werk-Karte (Owner 11.09.2026: die Beispiele sahen aus wie ausgefüllte Werte). */
  beispielVor: "z. B.",
  beispielTitel: "Italienischer Sommer",
  beispielTechnik: "Öl auf Leinwand",
  beispielGroesse: "80 × 60 cm",
  beispielJahr: "2024",
  beispielPreis: "800 €",
  werkWeiter: "Weiter",
  /* Owner 10.09.2026: „willst du noch bis zu 3 Bilder hochladen … ja nein" — einmal im Gespräch. */
  mehrBilderFrage: "Willst du noch bis zu {n} Bilder hochladen?",
  mehrBilderEins: "Willst du noch ein Bild hochladen?",
  mehrBilderJa: "Ja",
  /* „NEIN" IST WIEDER DA (Owner 12.09.2026: „nein kann auch sein"). Es war kurz draussen („Nu muss
     du ihm nicht anbieten") — ohne den Knopf kam aber niemand weiter, der nichts mehr hochladen
     wollte. Er kostet nichts: Der Klick öffnet die Daten-Karte im Browser, ohne Server. */
  mehrBilderNein: "Nein",
  /* Die Antwort auf einen Upload — sie steht geschrieben da, statt gerechnet zu werden (Owner
     12.09.2026: „Er lädt sie hier nur im Zwischenspeicher und nicht auf dem Server"). */
  /* EINZAHL (Owner 13.09.2026: „hier muss stehen am primit lucrarea ta") — es ist ein Werk. */
  /* Mehrzahlfähig: Er darf zehn schicken, und der Satz muss für einen wie für zehn stimmen.
     Der Zusatz sagt gleich, was als Nächstes passiert — analysiert wird EIN Werk. */
  /* Owner 14.09.2026: „und wir schreiben gleich: Großartige Kunstwerke!" — der erste Satz nach
     dem Hochladen. Danach die Wahl: EIN Werk wird angesehen. */
  /* NUR DAS LOB, KEIN VERSPRECHEN (Owner 14.09.2026: „Satz ‚Astea trebuie făcute publice' raus.
     Es kommt zu früh"). „Die müssen publik gemacht werden" nimmt vorweg, worüber er erst beim
     „Da" entscheidet — und was danach noch auf die Freigabe wartet. */
  bilderErhalten: "Großartige Kunstwerke!",
  /* Wenn mehrere hochgeladen wurden: Er tippt an, welches (Owner 14.09.2026). */
  werkWaehlen: "Jetzt wähle ein Kunstwerk aus — die Analyse ist gratis.",
  /**
   * Wenn die Adresse schon einem Künstler gehört (Owner 14.09.2026: „diese Adresse existiert
   * schon, du hast schon eine Webseite. Benutze deine Webseite, um weitere Bilder hochzuladen").
   * Sie weist nicht ab, sondern schickt ihn dorthin, wo seine Werke hingehören.
   */
  hatSeite: "Diese Adresse hat schon eine Seite bei uns. Wir haben dir den Link zu deinem Dashboard geschickt — dort lädst du weitere Werke hoch.",
  /* Der Satz, der zur letzten Karte führt — wortgleich mit dem, den der Server nach dem zweiten
     Upload schickt (app/api/versusforge-agent/route.ts), damit es sich gleich anfühlt. */
  /* OHNE PREIS (Owner 13.09.2026): Das Preisfeld ist aus dem Trichter raus — ein Satz, der
     danach fragt, stünde über einem Kasten, in dem es das Feld nicht mehr gibt. */
  jetztDaten: "Sag mir jetzt, wie du dich als Künstler nennst und an welche E-Mail die Links gehen.",
  /**
   * ── DIE ANALYSE KOSTET JETZT SEINE ADRESSE (Owner 14.09.2026: „er muss seine Email und Name
   * angeben" · „Es gibt kein Gratis mehr" · „will er Analyse starten, dann fragst du nach der
   * Email") ──────────────────────────────────────────────────────────────────────────────────
   *
   * Gefragt wird beim KLICK auf „Analysieren", nicht auf der Startkarte: Er hat sein Werk dann
   * schon ausgewählt und weiss, wofür er die Adresse gibt.
   */
  datenVorAnalyse: "Bevor ich dein Werk ansehe: Wie nennst du dich als Künstler, und an welche E-Mail soll die Analyse gehen?",
  datenKnopf: "Analyse starten",

  /**
   * ── DIE AUFFORDERUNG UNTER DEN CHIPS (Owner 10.09.2026) ─────────────────────────────────
   *
   * „Da fehlt ein Zwischenschritt, eine Aufforderung. Was soll er machen?" — und später, als
   * sie nur im Userflow stand und nie im Chat: „wir haben uns 30 Minuten drüber unterhalten."
   *
   * WAS FEHLTE: Unter einer Frage standen zwei, drei Knöpfe, und nichts sagte, dass sie ein
   * Angebot sind. Wer nur die Knöpfe sieht, glaubt, er müsse einen davon nehmen — und wer
   * keinen passenden findet, hört auf.
   *
   * ZWEI HANDLUNGEN, IN DIESER REIHENFOLGE: erst das Bequeme (antippen), dann die Freiheit
   * (selbst schreiben). Kurz genug, dass man es beim Hinsehen liest, ohne es zu lesen.
   */
  /* Vorher „Tipp eins an …" — die Übersetzung las „Tipp" als „Vorschlag" („Sugestia unu", Owner 11.09.2026). */
  chipsHinweis: "Wähl einen aus — oder schreib ihn mit deinen Worten.",

  /* ── Die Oberfläche ──────────────────────────────────────────────────────── */
  muster: "Agent · Muster",
  platzhalter: "Schreib oder sprich.",
  senden: "Senden",
  bildAlt: "Dein Anzeigenbild",
  fotoWaehlen: "Foto anhängen",
  fotoWeg: "Foto entfernen",
  fehler: "Das ging gerade nicht. Bitte noch einmal.",
  /* Der Tagesdeckel — als einziger Fehler hat er eine eigene Auskunft, weil „noch einmal
     versuchen" hier falsch wäre: Es geht heute nicht mehr, und das darf man sagen. */
  fehlerDeckel: "Für heute ist auf diesem Gerät genug gelaufen. Morgen geht es weiter.",
  /**
   * ── „ALLES LÖSCHEN" STATT „NEU ANFANGEN" (Owner 09.09.2026: „statt Începe din nou — er
   * könnte alles löschen, dann ist es save") ────────────────────────────────────────────────
   *
   * DERSELBE KNOPF, DIE WAHRERE AUFSCHRIFT. „Neu anfangen" beschreibt, was DANACH kommt;
   * „Alles löschen" beschreibt, was PASSIERT — und das ist es, was jemand wissen will, der
   * einer Maschine gerade Umsatzzahlen und schlechte Bewertungen erzählt hat.
   *
   * ES IST DAMIT KEIN BEDIENKNOPF MEHR, SONDERN EINE ZUSAGE. Deshalb steht er auch, wenn der
   * Chat später Pflichtseiten bekommt: Ein sichtbarer Weg, alles wegzuwerfen, wiegt mehr als
   * ein Absatz darüber.
   *
   * UND ER STIMMT WÖRTLICH: Das Gespräch lebt allein im Browser, der Server legt für dieses
   * Muster nichts ab (`app/api/versusforge-agent/route.ts` speichert nichts). Ein Knopf, der
   * „alles löschen" verspricht und nur die Anzeige leert, wäre eine Lüge — hier ist die
   * Anzeige alles, was es gibt. Sobald der Agent eine Adresse ablegt, muss dieser Knopf auch
   * dort löschen oder anders heissen.
   *
   * ZWEI TIPPS, WIE JEDES LÖSCHEN IM HAUS ([[loeschen-zwei-tipps-rot]]): Der erste färbt rot
   * und fragt, der zweite räumt ab. Kein Bestätigungsfenster ([[keine-overlay-dialoge]]).
   */
  loeschen: "Alles löschen",
  /* „TIPPEN" IST ZWEIDEUTIG UND WURDE PROMPT FALSCH ÜBERSETZT (09.09.2026, im Prüflauf):
     Auf Rumänisch stand „Scrie din nou" — schreib noch einmal, also ins Feld. Gemeint ist
     der Knopf. „Drücken" ist in jeder Sprache eindeutig. */
  loeschenBestaetigen: "Wirklich alles löschen? Noch einmal drücken.",

  /* ── Was er benutzt hat ──────────────────────────────────────────────────── */
  werkzeugWebsite: "Website gelesen",
  werkzeugHook: "Hook geprüft",
  werkzeugBild: "Bild gebaut",
  werkzeugBeispiel: "Beispiel gezeigt",
} as const;

export type AgentChatTexte = { -readonly [K in keyof typeof AGENT_CHAT_TEXTE]: string };

/** Die Chat-Texte in seiner Sprache. Deutsch ist die Quelle und kostet keinen Aufruf. */
/* MUTTERSPRACHLICH GESETZT, NICHT ÜBERSETZT (Owner 11.09.2026: „auf Rumänisch denken") — wo die Übersetzung
   daneben lag („Sugestia unu"), steht der Satz hier fest und überschreibt sie. */
const FEST: Partial<Record<Lang, Partial<AgentChatTexte>>> = {
  ro: {
    chipsHinweis: "Alege una — sau scrie-o cu cuvintele tale.", textMeiner: "Textul meu", beispielVor: "ex.:",
    profilErgaenzen: "Completează profilul",
    /* Owner 11.09.2026: erst „es ist free jetzt wirklich", dann „das glaubt niemand ohne Grund … wir
       leben von Sponsoren oder Crowdfunding … für ihn bleibt es so, die ersten Künstler sind free" —
       verschärft gegenüber „Doar agentul va deveni la un moment dat cu plată", die hier stand. */
    grussKostenlos: "Aici totul e gratuit — în această fază de început ne finanțăm din sponsori și crowdfunding, iar pentru tine, ca unul dintre primii artiști, rămâne așa. Primești:\n· o frază pentru imaginea ta, care îi face pe cumpărători să se oprească\n· propria ta pagină pe lakatosbandi.com, platforma noastră pentru artiști, cu un agent AI care vorbește cu cei interesați\n· fiecare cerere cu nume și număr de telefon, ca să poți suna",
    /* Wortlaut vom Owner, 13.09.2026 — vollständig übernommen, nichts umformuliert. */
    startMockup: "Așa poate arăta pagina ta.",
    startTitel: "Artă arătată lumii",
    /* Wortlaut des Owners, 15.09.2026, ins Rumänische gesetzt. */
    startHook: "Începe să-ți promovezi arta inteligent — cu lakatosbandi Art Fair.",
    startHookKlein: "Lucrările tale devin produse. Din fiecare comandă câștigi și tu.",
    /* Wortlaut des Owners, orthografisch gesetzt: „der Arta" → „de artă", Diakritika ergänzt. */
    startKnopf: "Încarcă 1-10 poze",
    /* Owner 14.09.2026: „das ist falsch fällt mir ein. Urca pana la 10 lucrari. Primesti un
       Exemplu de Marketing." · „Button Upload" — der Satz steht als Text ÜBER dem Knopf, der
       Knopf selbst bleibt kurz. */
    startUploadText: "Urcă până la 10 lucrări. Primești un exemplu de marketing.",
    /* „gratuit" gehört auf den Knopf (Owner 14.09.2026) — seit die Analyse ohne E-Mail läuft,
       ist das Kostenlose ihr stärkstes Argument und darf nicht danebenstehen. */
    analyseKnopf: "Analizează acum · gratuit",
    analyseLaeuft: "Mă uit la lucrarea ta …",
    analyseFertig: "Acesta e un exemplu — așa îți prezentăm lucrarea.",
    analyseFehler: "Nu a mers acum. Mai încearcă o dată.",
    keinWerk: "Asta nu pare o lucrare de artă. Încarcă o fotografie a uneia dintre lucrările tale — o pictură, un desen, o sculptură.",
    analyseVerbraucht: "Ai folosit cele două analize gratuite de azi. Scrie-ne dacă ai nevoie de mai multe.",
    /* Owner 14.09.2026: „und am ende wir posten dich jetzt gratis, du hast glück." — das
       Kostenlose steht JETZT da, wo er Ja oder Nein sagt, nicht irgendwo davor. */
    publizierenFrage: "Vrei ca pagina ta să apară pe lakatosbandi.com?",
    publizierenAngebot: "Primești un site adevărat și un agent de vânzări. Linkul îți vine pe e-mail: îl administrezi singur și îl poți distribui. Nu te costă nimic — ești direct în pachetul nostru gratuit.\n\nConstruim o galerie care vorbește: fiecare lucrare își spune povestea, iar un agent stă de vorbă cu cei interesați. Și avem un concept de marketing care nu există nicăieri altundeva: Artist Fair. Orice artist își poate transforma arta în produse — postere, fișiere pentru tipar, textile — și câștigă din licențe. Pe fiecare produs stau numele lui și adresa paginii lui.",
    publizierenJa: "Da",
    publizierenNein: "Nu",
    publizierenAbsage: "În regulă — nu publicăm nimic. Lucrarea ta rămâne la tine.",
    nochmalFrage: "Să scriu fraza altfel?",
    neuGenerieren: "Scrie din nou",
    absageFrage: "Ce te-a oprit?",
    anlegenLaeuft: "Îți construiesc pagina …",
    anlegenFehler: "Nu a mers acum. Mai încearcă o dată.",
    seiteFertig: "Pagina ta e gata — uită-te la ea.",
    seiteAnsehen: "Vezi pagina",
    behaltenFrage: "Vrei să o păstrezi? Atunci spune-ne cum te semnezi ca artist și unde trimitem linkurile.",
    behaltenKnopf: "Da, o păstrez",
    behaltenFertig: "Pagina ta e creată și linkurile sunt pe drum. O mai verificăm — apoi apare în listă.",
    behaltenFehler: "Nu a mers. Mai încearcă o dată, te rog.",
    behaltenHinweis: "Fără nume și adresă, pagina rămâne fără proprietar și nu apare în listă.",
    mailRichtigWarnung: "Fără adresa corectă nu vei putea intra niciodată în profilul tău.",
    mailRichtigFrage: "Adresa este corectă?",
    mailRichtigJa: "Da, e corectă",
    mailRichtigNein: "Nu, o schimb",
    startAnalyse: "Îți analizăm arta.",
    startText: "Încarcă până la 5 lucrări.",
    startAbschluss: "Primești o prezență și o pagină web a ta. Acum nu te costă nimic. Întâi ne uităm la lucrările tale.",
    startZustimmung: "Încărcând, ești de acord cu protecția datelor.",
    startUnterzeile: "Pagina ta de artist în 1 minut.",
    startListe: "Schițe, studii, încercări, lucrări vechi sau lucrările tale preferate.",
    startKeinePruefung: "Nu trebuie să construiești un site.\nNu trebuie să fii artist cunoscut.",
    startBekommstTitel: "Primești gratuit:",
    startBekommst: "✔ propria ta pagină pe lakatosbandi.com\n✔ texte de prezentare pentru fiecare lucrare\n✔ propriul tău AI Art Agent, care vorbește cu cei interesați\n✔ cereri și date de contact de la oamenii interesați de arta ta",
    startSelbst: "Tu doar încarci imaginile. Noi facem restul.",
    startGratis: "Gratuit pentru artiștii care intră acum.",
    /* Leer wie in den anderen Sprachen — der neue Wortlaut (Owner 13.09.2026) endet bei
       „Gratuit pentru artiștii care intră acum."; die Zeile entfällt dann ganz. */
    startWarum: "",
    startAufruf: "Începe acum.",
    startFein: "Schițe, încercări și lucrări vechi sunt binevenite. Nu selectăm doar „cele mai bune”.",
    startDauer: "Durează aproximativ 1 minut.",
    startKeineKarte: "Fără card. Fără abonament.",
    startDatenschutzTitel: "Protecția datelor",
    startJa: "Da, vreau pagina mea",
    rechteHaekchen: "Lucrările îmi aparțin. Răspund pentru publicarea lor.",
    rechteAgb: "Termeni și condiții",
    feldPreisSpanne: "Cât ceri pentru lucrările tale?",
    feldPreisSpannePlatzhalter: "de ex. 400 €–1300 €",
    mehrBilderNein: "Nu",
    bilderErhalten: "Superb!",
    werkWaehlen: "Acum alege o lucrare — analiza e gratuită.",
    hatSeite: "Această adresă are deja o pagină la noi. Ți-am trimis linkul către dashboard-ul tău — de acolo încarci alte lucrări.",

    /**
     * ── NATIV RUMÄNISCH, NICHT ÜBERSETZT (Owner 14.09.2026: „da muss auch nativ rumänisch sein,
     * wenn jemand auf ro ist" · gewählt: „A") ─────────────────────────────────────────────────
     *
     * Diese Schlüssel liefen bisher durch `translateMany` — gpt-4o-mini, temperature 0, mit der
     * Anweisung „translate every VALUE into Romanian". Das Ergebnis war korrekt, aber übersetzt:
     * deutscher Satzbau in rumänischen Wörtern. Und es wird DAUERHAFT zwischengespeichert, eine
     * schwache Fassung bliebe also für immer stehen.
     *
     * Hier stehen sie jetzt so, wie ein Rumäne sie schreiben würde. Dieselbe Lösung wie bei den
     * 61 Schlüsseln darüber — nur für die, die der Künstler im Trichter wirklich liest.
     *
     * NICHT DABEI: `werkzeug*` (steht nur im Protokoll des Owners) und `beispielJahr` (eine Zahl).
     */
    beispielGroesse: "80 × 60 cm",
    beispielPreis: "800 €",
    beispielTechnik: "Ulei pe pânză",
    beispielTitel: "Vară italiană",
    /* `beispielVor` steht schon oben in diesem Block (bei `chipsHinweis`) — nicht doppelt. */
    bildAlt: "Imaginea ta pentru anunț",
    bilderHoechstens: "O singură lucrare.",
    bilderKnopf: "Încarcă lucrări",
    chipEinverstanden: "Da, sunt de acord",
    ersteFrage: "Hai să începem: îmi arăți ce pictezi? Încarcă o lucrare.",
    feedbackDanke: "Mulțumim! Am primit mesajul tău.",
    feedbackFehler: "Nu a mers. Te rog încearcă din nou.",
    feedbackLink: "Spune-ne părerea",
    feedbackPlatzhalter: "Ce te-a deranjat, ce lipsește, ce a fost bine?",
    feedbackSchliessen: "Închide",
    feedbackSenden: "Trimite",
    fehler: "Nu a mers acum. Mai încearcă o dată.",
    fehlerDeckel: "Pentru azi e destul pe dispozitivul acesta. Continuăm mâine.",
    feldEmail: "E-mail",
    feldGroesse: "Dimensiune",
    feldJahr: "An",
    feldKuenstlername: "Numele tău de artist",
    feldPreis: "Preț",
    feldTechnik: "Tehnică",
    feldTitel: "Titlu",
    fotoWaehlen: "Adaugă o fotografie",
    fotoWeg: "Șterge fotografia",
    grussDatenschutz: "Despre datele tale: ce scrii și imaginile pe care le arăți trec printr-un model AI de la OpenAI — altfel nu se poate. La final îți trimitem informațiile pe e-mail; pentru asta am nevoie de adresa ta, și de atunci o păstrăm noi. În fiecare e-mail găsești un link cu care ștergi tot — imediat, fără întrebări și fără explicații.",
    grussFrage: "Câteva minute și lucrarea ta are fraza ei. Mergem mai departe?",
    grussRegeln: "· Arată-mi lucrările în loc să mi le descrii — mă uit la ele.\n· Dacă înțeleg greșit ceva, spune-mi pe loc — mă aștept la asta.\n· Ce nu știi, lasă deoparte. Eu nu inventez nimic, și nici tu să n-o faci.",
    grussRegelnTitel: "Ca să meargă repede, trei lucruri:",
    kontaktSenden: "Trimite",
    loeschen: "Șterge tot",
    loeschenBestaetigen: "Chiar ștergi tot? Mai apasă o dată.",
    loeschenJa: "Da, șterge tot",
    loeschenNein: "Nu",
    mehrBilderEins: "Mai încarci o lucrare?",
    mehrBilderFrage: "Mai încarci până la {n} lucrări?",
    mehrBilderJa: "Da",
    nurBilder: "Astea sunt lucrările mele.",
    passtJa: "Da, e bine",
    passtNein: "Nu",
    platzhalter: "Scrie sau vorbește.",
    senden: "Trimite",
    spruchAendern: "Schimbă fraza",
    /* `textMeiner` steht schon oben in diesem Block (bei `chipsHinweis`) — nicht doppelt. */
    vorschauAlt: "Lucrarea ta cu fraza ei",
    werkKarteTitel: "Vrei să scrii ceva despre lucrare? Totul e opțional.",
    werkWeiter: "Mai departe",
    zurueck: "Înapoi",
    jetztDaten: "Acum spune-mi cum te semnezi ca artist și la ce e-mail îți trimitem linkurile.",
    datenVorAnalyse: "Înainte să mă uit la lucrarea ta: cum te semnezi ca artist și la ce e-mail îți trimitem analiza?",
    datenKnopf: "Începe analiza",
  },
  en: {
    beispielVor: "e.g.",
    startMockup: "This is how your page can look.",
    startTitel: "Art shown to the world",
    startHook: "Start marketing your art cleverly — with lakatosbandi Art Fair.",
    startHookKlein: "Your works become products. Every order pays you a licence.",
    startKnopf: "Upload up to 10 works",
    analyseKnopf: "Analyse now",
    analyseLaeuft: "I'm looking at your work …",
    analyseFertig: "This is an example — this is how we present your work.",
    analyseFehler: "That didn't work just now. Please try again.",
    keinWerk: "That doesn't look like an artwork. Upload a photo of one of your works — a painting, a drawing, a sculpture.",
    analyseVerbraucht: "You've used your two free analyses for today. Write to us if you need more.",
    publizierenFrage: "Do you want your page to appear on lakatosbandi.com?",
    publizierenAngebot: "You get a real website and a sales agent. The link comes to you by email: you manage the page yourself and you can share it. It costs you nothing — you're straight into our free package.\n\nWe are building a gallery that speaks: every work tells its story, and an agent talks to the people who are interested. And we have a marketing concept you will not find anywhere else: Artist Fair. Any artist can turn their art into products — posters, print files, textiles — and earn from the licences. Every piece carries their name and the address of their page.",
    publizierenJa: "Yes",
    publizierenNein: "No",
    publizierenAbsage: "All right — we publish nothing. Your work stays with you.",
    nochmalFrage: "Shall I write the line differently?",
    neuGenerieren: "Write again",
    absageFrage: "What stopped you?",
    anlegenLaeuft: "Building your page …",
    anlegenFehler: "That didn't work just now. Please try again.",
    seiteFertig: "Your page is ready — take a look.",
    seiteAnsehen: "View page",
    behaltenFrage: "Want to keep it? Then tell us how you sign as an artist and where the links should go.",
    behaltenKnopf: "Yes, keep it",
    behaltenFertig: "Your page is created and the links are on their way. We'll take a look — then it appears in the list.",
    behaltenFehler: "That didn't work. Please try again.",
    behaltenHinweis: "Without a name and address the page stays ownerless and does not appear in the list.",
    mailRichtigWarnung: "Without the right address you will never get into your profile.",
    mailRichtigFrage: "Is this address correct?",
    mailRichtigJa: "Yes, correct",
    mailRichtigNein: "No, change it",
    startAnalyse: "We analyse your art.",
    startText: "Upload up to 5 works.",
    startAbschluss: "You get a presence and a web page of your own. Right now it costs you nothing. First we look at your works.",
    startZustimmung: "By uploading you agree to our privacy policy.",
    startUnterzeile: "Your artist page in 1 minute.",
    startListe: "Sketches, studies, attempts, old works or your favourite pieces.",
    startKeinePruefung: "You don't have to build a website.\nYou don't have to be a known artist.",
    startBekommstTitel: "You get for free:",
    startBekommst: "✔ your own page on lakatosbandi.com\n✔ presentation texts for every work\n✔ your own AI Art Agent that talks to interested people\n✔ inquiries and contact details from people interested in your art",
    startSelbst: "You just upload the images. We do the rest.",
    startGratis: "Free for the artists who join now.",
    startWarum: "",
    startAufruf: "Start now.",
    startFein: "Sketches, attempts and old works are welcome. We don't pick only „the best ones”.",
    startDauer: "Takes about 1 minute.",
    startKeineKarte: "No card. No subscription.",
    startDatenschutzTitel: "Privacy",
    startJa: "Yes, I want my page",
    rechteHaekchen: "The works are mine. I am liable for publishing them.",
    rechteAgb: "Terms",
    feldPreisSpanne: "What do you ask for your works?",
    feldPreisSpannePlatzhalter: "e.g. 400 €–1300 €",
    mehrBilderNein: "No",
    bilderErhalten: "Wonderful works!",
    werkWaehlen: "Now pick one work — the analysis is free.",
    hatSeite: "This address already has a page with us. We sent you the link to your dashboard — upload more works from there.",
    jetztDaten: "Now tell me how you sign as an artist and which e-mail the links should go to.",
    datenVorAnalyse: "Before I look at your work: how do you sign as an artist, and which e-mail should the analysis go to?",
    datenKnopf: "Start the analysis",
  },
};

export async function agentChatInSprache(lang: Lang): Promise<AgentChatTexte> {
  return { ...(await textbausteineInSprache({ ...AGENT_CHAT_TEXTE } as AgentChatTexte, lang)), ...FEST[lang] };
}
