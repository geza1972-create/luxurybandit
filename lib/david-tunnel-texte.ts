import { textbausteineInSprache } from "@/lib/lebenslauf-uebersetzen";
import type { Lang } from "@/lib/lang";

/**
 * DIE TEXTE DES DAVID-TRICHTERS — DEUTSCHE QUELLE, EINE DATEI.
 *
 * Getrennt von `lib/david-texte.ts` (das ist die Landingpage), weil beides unabhängig
 * voneinander wächst und ein einziger 100-Schlüssel-Block bei jeder Änderung neu übersetzt
 * würde. Übersetzt wird wie überall zur Laufzeit mit Dauer-Cache; Deutsch ist die Quelle,
 * also bleibt im schlimmsten Fall Deutsch stehen und nie Englisch (die Lehre vom 28.08.2026).
 *
 * `{name}` wird im Trichter durch den Vornamen ersetzt — der einzige Platzhalter hier.
 *
 * WAS DIE TEXTE TRAGEN MÜSSEN (Owner-Vorgabe 28.08.2026): Davids Ton — ruhig, direkt, ohne
 * „Super!"; den Datenschutzhinweis im Wortlaut; die Trennung von notwendiger Bestätigung und
 * freiwilliger Werbe-Einwilligung.
 */
export const DAVID_TUNNEL = {
  /* ── 1 · Vorname ─────────────────────────────────────────────────────────── */
  /* „David AI", nicht nur „David" (Owner 29.08.2026; Reihenfolge korrigiert am selben Tag:
     „überall änderst du den Namen von AI David in David AI"). Er ist eine KI, und der Bewerber
     vertraut ihr gleich seinen Lebenslauf und Dinge an, die er sonst niemandem sagt — dann
     muss im ersten Satz stehen, mit wem er es zu tun hat. Es passt ausserdem zur Überschrift
     („mit David AI!") und zur Kopfzeile („AI Pre-Screening"). */
  hallo: "Hallo, ich bin David AI.",
  /* NICHT „DEINE BEWERBUNG" IM ERSTEN SATZ: Wer noch keine geschrieben hat, denkt, er
     bräuchte eine — dabei reicht sein Lebenslauf, und genau das senkt die Hürde. */
  halloText: "Bevor wir uns deinen Lebenslauf ansehen: Wie darf ich dich ansprechen?",
  vornameLabel: "Vorname",
  vornamePlatzhalter: "Dein Vorname",
  weiter: "Weiter",
  bitteWarten: "Einen Moment",
  vornameFehlt: "Sag mir bitte, wie ich dich ansprechen darf.",

  /* ── 2 · E-Mail und Datenschutz ──────────────────────────────────────────── */
  /* KEIN ZWEITES „HALLO" (Owner 29.08.2026: „aber nicht noch mal Hallo"). David hat sich
     einen Schritt vorher vorgestellt; wer sich zweimal begrüsst, wirkt, als hätte er das
     erste Mal vergessen. Der Name bleibt — er zeigt, dass zugehört wurde. */
  /* DER TITEL FRAGT, WAS GEBRAUCHT WIRD (Owner 29.08.2026: „hier auch den Titel ersetzen
     mit: Wie lautet deine E-Mail-Adresse?"). „Danke, {name}." war höflich, aber es sagte
     nicht, was auf diesem Schirm passieren soll. Der Dank ist in den Satz darunter gewandert
     — er geht nicht verloren, er steht nur nicht mehr an der Stelle, an der die Aufgabe
     stehen muss. */
  /**
   * DIE ADRESSE STEHT JETZT AM ERGEBNIS (Owner 31.08.2026: „wir fragen zu schnell nach Name
   * und E-Mail" · „wir fangen mit Lebenslauf und testen").
   *
   * Vorher war das der zweite Schritt überhaupt — vor dem Lebenslauf, vor jeder Leistung.
   * Jetzt kommt er, wenn das Screening durch ist und der Bericht darauf wartet, verschickt
   * zu werden. Der Titel sagt deshalb nicht mehr „wie lautet", sondern WOFÜR.
   */
  mailTitel: "Wohin soll ich dein Ergebnis schicken?",
  mailZumErgebnis: "Ergebnis anzeigen",
  /* „Danke, {name} — damit kann ich…" war kein Satz (Owner 29.08.2026): Das „damit" zeigte
     auf die Adresse, die er noch gar nicht gegeben hat. Der Dank galt dem Vornamen, der
     Nebensatz der Mail — zwei Dinge in einem Bindestrich zusammengezwungen. Jetzt zwei
     saubere Sätze: erst der Dank, dann der Grund. */
  mailText: "Dein Screening ist durch, {name}. Ich lege dein Ergebnis unter dieser Adresse ab — dann findest du es auch morgen noch wieder.",
  mailLabel: "E-Mail-Adresse",
  mailPlatzhalter: "du@beispiel.de",
  mailFehlt: "Diese Adresse sieht noch nicht vollständig aus.",
  /* Der Wortlaut ist der des Owners (§5) — bewusst ohne „wir geben nichts an Dritte weiter"
     (technische Dienstleister verarbeiten im Auftrag) und ohne erzwungene Zustimmung zu
     KI-Training. */
  /**
   * KURZ, ABER VOLLSTÄNDIG (Owner 29.08.2026: „hier ist enorm viel Text").
   *
   * Vorher standen hier 58 Wörter in vier Sätzen — direkt über dem Häkchen, das er setzen
   * soll. Ein Absatz dieser Länge wird an dieser Stelle nicht gelesen, er wird überblättert;
   * damit ist die Zustimmung formal da und inhaltlich wertlos.
   *
   * WAS BLEIBEN MUSSTE, weil es die Zustimmung trägt: WAS wir verarbeiten (Lebenslauf,
   * Anzeige, Antworten), WOFÜR (Screening und Verbesserung) und der Link auf die
   * Datenschutzerklärung. Gekürzt wurde nur die Verpackung — „die von dir bereitgestellten
   * Daten, insbesondere" sagt nichts, was die Aufzählung nicht schon sagt.
   *
   * DER WICHTIGSTE SATZ STEHT JETZT ALLEIN am Ende: Seine Bewerbung geht nie automatisch an
   * einen Arbeitgeber. Das ist die Sorge, mit der er hier sitzt — sie war vorher der dritte
   * Satz von vieren und ging unter.
   */
  datenschutz: "Wir verarbeiten deinen Lebenslauf, die Stellenanzeige und deine Antworten für dein Screening und nutzen sie, um David besser zu machen. Mehr in der Datenschutzerklärung.",
  /* Die Zusicherung, getrennt und deshalb lesbar. */
  datenschutzZusage: "Deine Bewerbung geht nie automatisch an Arbeitgeber.",
  datenschutzLink: "Datenschutzerklärung",
  haken: "Ich habe die Datenschutzhinweise gelesen und möchte das Pre-Screening starten.",
  hakenFehlt: "Ohne diese Bestätigung darf ich nicht loslegen.",
  screeningStarten: "Pre-Screening starten",

  /* ── 3 · Lebenslauf ──────────────────────────────────────────────────────── */
  /* DER TITEL SAGT DIE AUFGABE, NICHT NUR HALLO (Owner 29.08.2026: „Hier muss als Titel
     stehen: Lade deinen jetzigen Lebenslauf hoch. Wir analysieren das!").
     
     Vorher stand dort „Gut, {name}." — freundlich, aber leer. Wer die Seite auf dem Handy
     überfliegt, liest zuerst die fette Zeile; stand da nur sein Name, musste er den Absatz
     darunter lesen, um zu erfahren, was er tun soll. Jetzt steht die Aufgabe oben und der
     Nutzen direkt dahinter — „wir analysieren das" ist der Grund, warum er die Datei
     überhaupt herausrückt. Der Name wandert in den Satz darunter, er geht also nicht
     verloren. */
  cvTitel: "Lade deinen jetzigen Lebenslauf hoch. Wir analysieren ihn!",
  /* ZUNGENBRECHER RAUS (Owner 29.08.2026). „Schauen wir ihn uns zusammen mit der Stelle an,
     auf die du dich bewerben willst" — ein Hauptsatz mit Umstellung, ein eingeschobenes
     Objekt und ein Relativsatz, alles in einem Atemzug. Auf dem Handy liest das niemand zu
     Ende. Jetzt zwei kurze Sätze: was jetzt zählt, und was als Nächstes kommt. */
  /* DIESELBE UNKLARheit wie bei `cvBereitText` (Owner 29.08.2026) — hier sogar eine Stufe
     früher: Er hat noch nicht einmal hochgeladen und liest schon von „der Stelle", als wäre
     eine besprochen worden. */
  /**
   * DER ERSTE SATZ ÜBERHAUPT (Owner 31.08.2026: „wir fangen mit Lebenslauf und testen").
   *
   * Hier stand „Gut, {name}." — das setzte voraus, dass vorher schon etwas passiert war und
   * ein Name bekannt ist. Seit dieser Schritt der ERSTE ist, bezieht sich „Gut" auf nichts,
   * und der Name ist noch unbekannt (David liest ihn gleich selbst aus dem Dokument). Jetzt
   * sagt der Satz, was als Nächstes geschieht — und dass es sofort etwas gibt.
   */
  cvText: "Ich lese ihn und sage dir gleich, was ich sehe. Danach zeigst du mir die Stelle, auf die du dich bewerben willst — dann vergleiche ich beides.",
  cvKnopf: "Lebenslauf hochladen",
  cvHinweis: "PDF oder Word · bleibt bei uns",
  /* Jede Absage nennt ihren Grund (29.08.2026) — „nimm eine PDF" als Pauschalantwort schickt
     Leute auf die falsche Fährte, wenn in Wahrheit die Verbindung abgerissen ist. */
  cvFormat: "Diese Datei ({typ}) kann ich nicht lesen. Bitte eine PDF- oder Word-Datei.",
  cvZuGross: "Die Datei ist grösser als 15 MB. Speichere deinen Lebenslauf bitte kleiner ab.",
  cvNetzFehler: "Das Hochladen hat nicht geklappt. Prüf kurz deine Verbindung und versuch es noch einmal.",
  /* DER EINE SATZ FÜR ALLES TECHNISCHE (Owner 29.08.2026, mit Bild: „Diese Sitzung kenne ich
     nicht." stand rot im Trichter, während er nur ohne Stellenanzeige weitermachen wollte).

     Die Sätze des Servers sind für UNS geschrieben und ausschliesslich deutsch — der Trichter
     läuft in sieben Sprachen. Was nach innerem Zustand klingt, wird durch diesen einen
     ersetzt: Er sagt, dass es nicht am Bewerber lag, und was er tun kann. Der Browser
     versucht sich vorher ohnehin selbst zu heilen; diesen Satz sieht nur, wo das misslang. */
  technischerFehler: "Da ist bei uns etwas schiefgegangen — nicht bei dir. Tipp es bitte noch einmal an.",
  /* ── DER AUSGANG AUS JEDER FRAGE (Owner 29.08.2026: „er kann ohne Antwort weder vor noch
     zurück") ──
     „Überspringen" statt „Keine Antwort": Der Knopf soll nach einem WEG klingen, nicht nach
     einem Eingeständnis. Und im Verlauf steht danach ehrlich, dass hier nichts gesagt wurde
     — sonst sieht das Gespräch später aus, als hätte David eine Frage vergessen. */
  /* ── DER VORSCHLAG ZUM ÜBERNEHMEN (Owner 29.08.2026: „Ich habe hier eine blöde Antwort
     gegeben … magst eine Zusammenfassung und gleich Vorschlag. Der User kann deinen Vorschlag
     übernehmen.") ──
     Er wird ins Feld GELEGT, nicht abgeschickt: Der Bewerber muss die Lücken füllen und darf
     jeden Satz ändern. Ein Vorschlag, der sich selbst abschickt, würde ihm Sätze in den Mund
     legen, die er nie gesagt hat — und die ein Recruiter im Gespräch auseinandernimmt. */
  vorschlagTitel: "So könntest du antworten",
  vorschlagHinweis: "Ergänze die Klammern mit deinen echten Zahlen — und ändere alles, was nicht stimmt.",
  vorschlagUebernehmen: "Vorschlag übernehmen",
  /* ── DER EINE FREIE ANLAUF (Owner 29.08.2026: „er kann hier nicht immer wieder neue
     Versuche machen umsonst" → „oder wir sagen, er hat noch einen Anlauf frei") ──

     ER ERSCHEINT NUR, WENN ES WIRKLICH DÜNN WAR. Wer sich Mühe gegeben hat, bekommt kein
     Zeugnis, sondern sein Ergebnis.

     UND ER SAGT DIE WAHRHEIT OHNE VORWURF: „Dein Bericht wird dünn" ist eine Tatsache mit
     Folge, „du hast schlecht mitgearbeitet" wäre ein Urteil. Das Wort „frei" macht zugleich
     klar, dass es dabei bleibt — ohne dass wir drohen müssen. */
  anlaufTitel: "Du hast noch einen Anlauf frei",
  anlaufText: "Ein paar deiner Antworten sind kurz geblieben. Damit wird dein Bericht dünner, als er sein müsste — David kann nur belegen, was du ihm erzählt hast.",
  anlaufFrei: "Diesen einen Anlauf schenke ich dir. Ergänze, was dir einfällt — oder lass es und hol dir dein Ergebnis.",
  anlaufSpeichern: "Antworten verbessern",
  anlaufSpaeter: "Nein danke, zeig mir mein Ergebnis",
  anlaufFrageLabel: "Davids Frage",
  anlaufPlatzhalter: "Schreib hier deine bessere Antwort — was du getan hast, nicht wofür du zuständig warst.",
  frageUnklar: "Ich verstehe die Frage nicht",
  frageWirdErklaert: "David formuliert die Frage um",
  frageUeberspringen: "Diese Frage überspringen",
  frageUebersprungen: "Übersprungen",
  /* ── ZWEIMAL ÜBERSPRUNGEN: DIE EHRLICHE RÜCKFRAGE (Owner 29.08.2026, sein Wortlaut) ──
     „OK, wir haben es gemerkt, dass du kein Interesse an einem Interview hast. David AI
      möchte dich nur fit machen für ein richtiges Interview. Aber wenn du trotzdem nur deine
      Bewerbung analysieren willst — das machen wir jetzt für dich."

     WARUM NICHT EINFACH AUFHÖREN: Weil hier die letzte Verkaufschance liegt. Wer still
     abgespeist wird, ist weg. Wer hört, dass wir seinen Widerwillen bemerkt haben UND
     trotzdem liefern, liest den Bericht — und erst der Bericht verkauft.

     UND DIE TÜR BLEIBT OFFEN: „Nein" führt zurück zur Frage, nicht in eine Sackgasse. */
  abbruchTitel: "Ok — du willst kein Interview.",
  abbruchText: "David möchte dich eigentlich fit machen für ein echtes Gespräch; dafür sind die Fragen da. Wenn du aber einfach nur deinen Lebenslauf analysiert haben willst, machen wir das jetzt für dich.",
  abbruchFrage: "Einverstanden?",
  abbruchJa: "Ja, nur analysieren",
  abbruchNein: "Nein, ich beantworte die Frage",
  /* Sagt er Nein, kommt die Frage zurück — mit einem Satz, der ihn nicht blossstellt. */
  abbruchZurueck: "Gut. Dann beantworte mir bitte noch diese Frage.",
  /* ── DIE ENTSCHEIDUNG VOR DEM GELD (Owner 29.08.2026) ──
     „was ich keine Lust habe, ist Tokens zu bezahlen für Abbrecher. Erst dann muss man
     zahlen, wenn er sich entscheidet: ja, ich will jetzt von David mein CV analysieren —
     und nicht beim Hochladen."

     Das Hochladen kostet uns nichts, das LESEN kostet. Bisher fielen beide zusammen: Wer
     die Datei anhängte und dann wegging, hatte trotzdem einen Aufruf ausgelöst. Jetzt liegt
     die Datei erst nur da, und David fragt nach. Ein Tipp mehr — dafür zahlt nur noch, wer
     wirklich will.

     DER SATZ IST EINE FRAGE, keine Bestätigung — eine Entscheidung, kein Durchklicker.

     DAVID LIEST NICHT — DAVID INTERVIEWT (Owner 29.08.2026 zum Knopf „Ja, lies meinen
     Lebenslauf": „er liest nicht, sondern: Bist du bereit für ein Interview mit mir?").
     „Lies meinen Lebenslauf" macht ihn zum Aktenleser und den Bewerber zum Zuschauer. Das
     Produkt ist aber das GESPRÄCH — er stellt Fragen, der Bewerber antwortet. Die Frage nach
     dem Interview ist zugleich die ehrlichere Ansage: Es geht jetzt los, und es dauert. */
  cvBereitTitel: "Bist du bereit für ein Interview mit mir?",
  /* „JA UND DANN?" (Owner 29.08.2026) — die Frage nach dem Interview darf nicht verschweigen,
     dass zuerst noch die Stelle drankommt. Sonst tippt er auf „bereit" und landet in einem
     Formular. Der Satz sagt beides: was ich jetzt tue, und was als Nächstes von ihm kommt. */
  /* „DIE STELLE" ALLEIN IST UNKLAR (Owner 29.08.2026: „Die Stelle? Auf die du dich bewerben
     willst."). Der bestimmte Artikel setzt etwas voraus, das noch nie erwähnt wurde — er hat
     bis hierhin nur seinen Lebenslauf hochgeladen. Wer „die Stelle" liest, fragt sich, welche
     gemeint ist, statt zu wissen, was als Nächstes von ihm kommt.

     DREI KURZE SÄTZE STATT EINEM LANGEN: Der Nebensatz musste dazu, aber er darf den Satz
     nicht in einen Zungenbrecher verwandeln — genau daran ist die frühere Fassung schon
     einmal gescheitert. */
  cvBereitText: "Dein Lebenslauf liegt bei mir, {name}. Ich sehe ihn durch. Dann zeigst du mir die Stelle, auf die du dich bewerben willst — und wir legen los.",
  cvBereitKnopf: "Ja, ich bin bereit",
  /* Kein zweiter Knopf für die Datei: Das Feld darüber ist selbst der Weg zur anderen Datei. */
  cvGewechselt: "Tippen, um eine andere Datei zu wählen",
  /* LÖSCHEN GEHÖRT AN JEDES UPLOAD-FELD (Hausregel; Owner 29.08.2026: „kann er im Trichter
     auch seinen Lebenslauf löschen und wieder hochladen?"). Zwei Tipps statt eines
     Systemdialogs — der erste färbt rot und fragt, der zweite löscht wirklich. */
  cvLoeschen: "Lebenslauf löschen",
  cvLoeschenFrage: "Wirklich löschen?",
  cvGeloescht: "Weg. Lade einfach eine andere Datei hoch.",
  /* DER SATZ BEIM WIEDEREINSTIEG (Owner 29.08.2026) — er kommt aus seiner Mail zurück und
     sieht ein halb ausgefülltes Gespräch. Ohne ein Wort dazu rätselt er, wo er gelandet ist.
     Kein „willkommen zurück" als Floskel: David sagt, dass nichts verloren ist. */
  zurueck: "Da bist du wieder, {name}. Nichts ist verloren — wir machen genau dort weiter, wo wir aufgehört haben.",
  /* Kein Zeitversprechen, das wir nicht halten können — dafür der Ausweg. Wer weiss, dass er
     jederzeit aufhören darf, fängt eher an. */
  cvBereitHinweis: "Du kannst jederzeit aufhören.",
  cvLaeuft: "David liest deinen Lebenslauf",
  cvLaden1: "Beruflicher Hintergrund wird eingeordnet",
  cvLaden2: "Erfahrungen werden erkannt",
  cvLaden3: "Relevante Kompetenzen werden identifiziert",
  cvFehler: "Der Lebenslauf ließ sich nicht lesen. Versuch es bitte mit einer PDF-Datei.",

  /* ── 4 · Die Stelle ──────────────────────────────────────────────────────── */
  /* Titel des Schritts — er steht als Überschrift ÜBER der Karte (siehe `schrittTitel` in
     components/DavidFunnel). `jobText` bleibt der Satz darunter. */
  jobTitel: "Zeig mir die Stelle, auf die du dich bewirbst.",
  /**
   * WAS DAVID NACH DEM LEBENSLAUF SAGT — EIN SATZ (Owner 29.08.2026: „muss nicht so viel
   * stehen über die Analyse. Er muss nur: OK Geza, ich sehe du bist UX Designer").
   *
   * Vorher kippte er ALLE Beobachtungen der Auswertung ins Gespräch — acht Zeilen über
   * Arbeitgeber, Werkzeuge und Projekte, mitten im Trichter, bevor überhaupt die Stelle
   * bekannt ist. Das liest niemand, und es verschenkt die Wirkung: Die Beobachtungen sind
   * das PRODUKT, sie gehören in den Bericht, nicht in den Vorraum.
   *
   * Der eine Satz leistet, was er leisten soll: Er beweist, dass David den Lebenslauf
   * wirklich gelesen hat. Mehr braucht es an dieser Stelle nicht.
   */
  cvErkannt: "Ok, {name} — ich sehe, du bist {rolle}.",
  cvErkanntOhneRolle: "Ok, {name} — ich habe deinen Lebenslauf gelesen.",
  /* „GIB DIE ADRESSE AN" WAR DIE SCHLIMMSTE DER UNKLAREN STELLEN (Prüfung 29.08.2026, nach
     dem Fund bei „die Stelle"): In einem Trichter, der zwei Schritte vorher nach der E-Mail-
     Adresse gefragt hat, liest „die Adresse" JEDER als seine eigene. Gemeint war die
     Web-Adresse der Anzeige. „Link" ist eindeutig und kennt jeder. */
  jobText: "Füge den Text der Anzeige ein — oder den Link dazu. David liest sie und vergleicht sie mit deinem Lebenslauf.",
  /**
   * DER WEG OHNE STELLE (Owner 29.08.2026: „weiter ohne Stellenanzeige müsste auch gehen.
   * Aber dafür analysieren wir nur sein CV").
   *
   * WARUM ES IHN GEBEN MUSS: Viele wissen noch nicht, wohin sie sich bewerben — sie wollen
   * erst wissen, wo sie stehen. Wer die an dieser Stelle wegschickt, verliert genau die, die
   * am ehesten Hilfe brauchen. Der Bericht ohne Ziel ist trotzdem wertvoll; er ist der Köder.
   *
   * ES IST EINE RÜCKFRAGE, KEIN ZWEITER KNOPF: Der ehrliche Hinweis — mit Ziel findet er
   * mehr heraus — steht dazwischen, damit niemand aus Bequemlichkeit die schwächere Strecke
   * nimmt. Wer sie dann trotzdem wählt, hat es gelesen.
   */
  ohneStelleLink: "Ich habe noch keine bestimmte Stelle",
  ohneStelleTitel: "Keine Stelle im Blick?",
  ohneStelleText: "Kein Problem — wir machen auch ohne weiter. David analysiert deinen Lebenslauf und gibt dir wertvolle Tipps. Mit einer konkreten Stelle findest du allerdings deutlich mehr heraus.",
  ohneStelleWeiter: "Ok, ohne Stelle weitermachen",
  ohneStelleDoch: "Doch eine Anzeige einfügen",
  /* Steht im Angebot, wenn der Kauf eine Stelle braucht, aber keine da ist. */
  /* GERADE HIER GIBT ES KEINE „DIE" STELLE: Diese Zeile erscheint dem, der bewusst OHNE
     Stelle weitergemacht hat. Der bestimmte Artikel verweist auf etwas, das er nie genannt
     hat. */
  anzeigeFuerKauf: "Für den Zuschnitt brauche ich deine Wunschstelle",
  anzeigeFuerKaufText: "Deine Analyse ist fertig. Damit David Lebenslauf und Anschreiben auf eine konkrete Stelle zuschneiden kann, füge hier die Anzeige ein.",
  /* Der Platzhalter nennt jetzt BEIDE Wege — seit der Server Links wirklich öffnet, darf der
     zweite nicht nur in der Überschrift stehen. Und er beginnt als Aufforderung, damit er
     nicht wie schon eingetragener Text wirkt (Owner-Regel vom selben Tag). */
  jobPlatzhalter: "Füge hier den ganzen Text der Stellenanzeige ein — oder den Link zur Anzeige.",
  jobKurz: "Das ist noch zu wenig. Füg die Anzeige bitte vollständig ein.",
  jobDatei: "Oder als Datei hochladen",
  jobLaeuft: "David vergleicht deinen Lebenslauf mit der Stelle",
  jobLaden1: "Aufgaben der Position werden gelesen",
  jobLaden2: "Anforderungen werden abgeglichen",
  jobLaden3: "Offene Punkte werden gesammelt",
  /* ── DERSELBE SCHRITT OHNE STELLE (Owner 29.08.2026: „hier musst du denken … der User will
     ohne weitermachen") ──
     Wer „Ich habe noch keine bestimmte Stelle" wählt, bekam danach WÖRTLICH zu lesen:
     „Aufgaben der Position werden gelesen", „Anforderungen werden abgeglichen" und
     schliesslich „Ich habe deinen Lebenslauf mit der Stelle verglichen." Es gibt aber keine
     Position und keine Stelle — David redet über etwas, das der Bewerber gerade
     ausdrücklich abgelehnt hat. Wer das liest, glaubt kein Wort mehr vom Rest.
     Vier eigene Sätze für den Weg, der ohne Ziel läuft. */
  jobLaeuftOhne: "David liest deinen Lebenslauf noch einmal genau",
  jobLadenOhne1: "Deine Stationen werden eingeordnet",
  jobLadenOhne2: "Stärken werden herausgearbeitet",
  jobLadenOhne3: "Offene Punkte werden gesammelt",
  /* OHNE STELLE EIN EIGENER ÜBERGANG — sonst behauptet David einen Vergleich, den es nie
     gab. Der Satz nimmt stattdessen auf, was der Bewerber gerade entschieden hat, und macht
     daraus einen Vorteil: Ohne Ziel geht es um IHN, nicht um eine Anzeige. */
  /* ── DER PLAN VOR DEM GESPRÄCH (Owner 29.08.2026: „der User hat keine Ahnung, was auf ihn
     zukommt und wie lange das dauert … einen Plan erstellen, der ihm sagt: ok, ich werde dir
     jetzt 6 Fragen stellen") ──

     Der Übergang sagte bisher nur „lass uns kurz sprechen" — und dann kam Frage 1 von etwa
     sechs. Wer nicht weiss, worauf er sich einlässt, steigt bei Frage zwei aus; wer weiss,
     dass es sechs sind und fünf Minuten dauert, geht sie durch.

     DIE ZAHL IST EHRLICH EINE SPANNE: David entscheidet selbst, wann er genug weiss (vier
     bis sieben Fragen). „Etwa 6" ist wahr, „genau 6" wäre gelogen — und eine gebrochene
     Zusage im ersten Schritt kostet mehr als die Ungenauigkeit. */
  planTitel: "Das kommt jetzt",
  planFragen: "Etwa 6 Fragen — rund 5 Minuten.",
  planDarum: "Darum geht es:",
  planErgebnis: "Danach bekommst du deinen Bericht: was für dich spricht, was ein Recruiter hinterfragen würde, und was dein Lebenslauf noch nicht erzählt.",
  /* ── WARUM SICH MÜHE LOHNT (Owner 29.08.2026: „Genau diesen Hinweis finde ich wertvoll …
     Das soll der User auch sehen") ──

     Er steht auf dem PLAN-SCHIRM, weil genau dort die Entscheidung fällt, wie viel Aufwand
     jemand investiert — nicht bei Frage vier, wenn er längst im Schnelldurchlauf ist.

     UND ER IST KEIN APPELL, SONDERN EIN GESCHÄFT: „Streng dich an" wirkt bei niemandem.
     „Aus deinen Sätzen werden die Belege im Bericht und später die Sätze in deinem
     Anschreiben" sagt ihm, was er dafür BEKOMMT. Der Gegensatz am Ende macht es greifbar —
     eine Rollenbeschreibung ergibt nichts, eine Situation ergibt einen Satz, den er
     verschicken kann. */
  planLohnt: "Je konkreter du antwortest, desto mehr hast du davon: Aus deinen Sätzen werden die Belege im Bericht — und später die Sätze in deinem Anschreiben.",
  planLohntGegen: "Aus „ich war für UX verantwortlich“ wird nichts.",
  planJederzeit: "Du kannst jede Frage überspringen oder jederzeit aufhören.",
  uebergangOhne: "Ich habe deinen Lebenslauf gründlich gelesen. Einiges kann ich schon gut einordnen. Es gibt aber Dinge, die ein Recruiter aus einem Lebenslauf allein nie erkennt — genau darüber möchte ich jetzt kurz mit dir sprechen.",
  uebergang: "Ich habe deinen Lebenslauf mit der Stelle verglichen. Einige Punkte kann ich bereits gut einordnen. Es gibt aber auch Dinge, die ein Recruiter aus deinem Lebenslauf allein nicht erkennen kann. Genau darüber möchte ich jetzt kurz mit dir sprechen.",
  losGehts: "Los geht's",

  /* ── 5 · Das Gespräch ────────────────────────────────────────────────────── */
  fortschritt: "Pre-Screening",
  von: "von etwa",
  /* DIE ANLEITUNG STEHT IM FELD, NICHT DARUNTER (Owner 29.08.2026, mit Bild: „das wird nicht
     gelesen. Sowas gehört ins Eingabefeld.").
     Er hat recht: Ein Satz unter dem Feld liegt ausserhalb des Blicks — man schaut auf die
     Frage und dann in den Kasten, in den man tippen soll. „Deine Antwort …" verschenkte genau
     diesen Platz an eine Selbstverständlichkeit.

     ER MUSS ALS AUFFORDERUNG BEGINNEN (Owner, zweite Runde: „muss stehen: Schreibe eine
     Antwort. Beispiel: … sonst denkt er, es ist schon vorausgefüllt"). Eine reine Anleitung
     („Eine konkrete Situation, mit Zahlen …") sieht in einem Textfeld wie bereits
     eingetragener Text aus — dann tippt niemand darüber, weil es scheinbar schon dasteht.
     Deshalb: erst die Aufforderung, dann ein Beispiel.

     DAS BEISPIEL LEHRT, WAS EINE REGEL NUR BEHAUPTET: „Wir hatten 40 % Abbrüche … danach
     waren es 22 %" zeigt Situation, Handlung und Zahl in einem Satz. Das wirkt stärker als
     die Aufforderung „keine Aufgabenbeschreibung". */
  /**
   * KEIN BEISPIEL MEHR IM FELD (Owner 30.08.2026: „du schlägst hier immer dasselbe vor" ·
   * „lass ihn frei schreiben und am Ende machst du die Analyse").
   *
   * Hier stand ein fester Beispielsatz über Checkout-Abbrüche — bei JEDER Frage derselbe.
   * Er passte fast nie zur Frage, und ein Baustein, der sich wiederholt, verrät genau das,
   * was das Screening widerlegen soll: dass hier niemand zuhört. Ein je Frage erzeugtes
   * Beispiel wäre die technische Lösung gewesen, ist aber die falsche: Ein Vorschlag im
   * Feld formt die Antwort, und am Ende bewerten wir unseren eigenen Vorschlag.
   *
   * Der Hinweis, der bleibt, ist keine Vorlage, sondern die EINE Regel, an der die meisten
   * Antworten scheitern (Owner 29.08.2026: „genau diesen Hinweis finde ich wertvoll").
   * Gezeigt wird das Können am ENDE — im Bericht.
   */
  antwortPlatzhalter: "Schreib hier deine Antwort — was du getan hast, nicht wofür du zuständig warst.",
  antworten: "Antworten",
  antwortFehlt: "Schreib mir bitte ein paar Worte.",
  davidDenkt: "David liest deine Antwort",
  genug: "Ich habe jetzt genug Informationen. Ich verbinde nun deinen Lebenslauf, die Anforderungen der Stelle und das, was du mir erzählt hast.",
  analyse1: "Anforderungen werden gelesen",
  analyse2: "Belege werden geprüft",
  analyse3: "Motivation wird eingeordnet",
  analyse4: "Mögliche Recruiter-Fragen werden erkannt",

  /* ── 6 · Das Ergebnis ────────────────────────────────────────────────────── */
  reportTitel: "Dein Pre-Screening-Ergebnis",
  reportFuer: "für",
  a1: "Das spricht für dich",
  a2: "Das könnte Fragen auslösen",
  a3: "Was dein Lebenslauf noch nicht erzählt",
  a4: "Darauf solltest du vorbereitet sein",
  /* ── „SO SAGST DU ES BESSER" (Owner 29.08.2026) ──
     Der Vorschlag steht am ENDE, nicht im Gespräch — dort hätte er den Faden gerissen. Hier
     ist er zugleich der stärkste Beweis für das bezahlte Produkt: Er sieht an SEINEM eigenen
     Satz, was daraus wird. */
  a5: "So sagst du es besser",
  a5Gesagt: "Du hast gesagt",
  a5Besser: "So hört es ein Recruiter",
  a5Hinweis: "Die Klammern füllst du mit deinen echten Zahlen — erfunden wird hier nichts.",
  einordnungTitel: "Bevor du gehst",
  /* Der Report-Umbau vom 28.08.2026 („ERKENNTNIS ZUERST. DETAILS BEI BEDARF") — die Wörter
     für Aufklapper und Quellenangaben. */
  insightVorsatz: "David hat etwas gefunden, das in deinem Lebenslauf kaum sichtbar ist.",
  insightWeitere: "Weitere Erkenntnisse anzeigen",
  mehrAnzeigen: "Mehr anzeigen",
  /* QUELLEN IN KLARTEXT (Owner: „Das soll menschlich und nachvollziehbar wirken, nicht
     technisch") — sie ersetzen Formulierungen wie „aus einer seiner Antworten". */
  quelleScreening: "Aus deinem Screening",
  quelleCv: "Aus deinem Lebenslauf",
  quelleAnzeige: "Aus der Stellenanzeige",
  warumFrage: "Warum David diese Frage erwartet",
  /* Die drei Stufen im Wortlaut des Owners (28.08.2026): „nur Layout sehr gut, geht so,
     suboptimal" — bewusst ohne Begründung, die Lösung ist das Produkt. */
  layoutLabel: "Layout deines Lebenslaufs",
  layoutGut: "Sehr gut",
  layoutMittel: "Geht so",
  layoutSchwach: "Suboptimal",
  fotoFehlt: "Kein Bewerbungsfoto",
  assetsZeile: "Dein Ergebnis ist gespeichert — du findest es jederzeit unter „Assets“.",
  /* ── „SCHICK MIR DAS" (Owner 29.08.2026) ──
     Der Ort, an dem eine erfundene Adresse noch zu retten ist: Er hat den Bericht gerade
     gelesen und will ihn behalten. Kein Tor am Anfang, keine Drohung — eine Frage, deren
     Antwort er selbst haben will. Deshalb steht seine getippte Adresse SICHTBAR im Feld:
     Wer sich etwas ausgedacht hat, sieht es genau jetzt vor sich. */
  sichernTitel: "Soll ich dir die Analyse schicken?",
  sichernText: "Dann hast du sie auch, wenn du den Browser schliesst oder das Gerät wechselst.",
  sichernLabel: "An diese Adresse",
  sichernKnopf: "Analyse schicken",
  sichernLaeuft: "Wird verschickt …",
  sichernFertig: "Unterwegs. Schau in dein Postfach — dort ist auch dein Link zurück hierher.",
  sichernFehler: "Das ging nicht. Prüf die Adresse und versuch es noch einmal.",
  assetsKnopf: "Zu meinen Assets",
  reportFehler: "Der Bericht ließ sich gerade nicht erstellen.",
  nochmal: "Noch einmal versuchen",

  /* ── 7 · Die bezahlten Schritte ──────────────────────────────────────────── */
  angeboteTitel: "Jetzt daraus deine Bewerbung machen",
  angeboteText: "Ich kenne jetzt deinen Lebenslauf, die Stelle und die Punkte, die du stärker zeigen solltest. Wenn du möchtest, mache ich daraus deine fertigen Bewerbungsunterlagen.",
  cvOptTitel: "Dein Lebenslauf – angepasst an genau diese Stelle",
  cvOptText: "David übernimmt die Erkenntnisse aus deinem Screening und richtet deinen bestehenden Lebenslauf gezielt auf die Anforderungen dieser Position aus.",
  cvOptCta: "Ja, meinen Lebenslauf für diese Stelle optimieren",
  /* Die KURZE Fassung für den Knopf am Fuss des Ergebnisses (Design des Owners: dort steht
     schlicht „CV optimieren" neben dem goldenen Hauptknopf). */
  cvOptKurz: "Lebenslauf optimieren",
  anschreibenTitel: "Dein persönliches Anschreiben",
  anschreibenText: "Kein Standardtext. Erstellt aus deinem Lebenslauf, der Stellenanzeige und den Informationen aus deinem persönlichen Screening. Du bekommst den Text zum Kopieren und die fertige PDF.",
  anschreibenCta: "Ja, mein Anschreiben für diese Stelle erstellen",
  videoTitel: "So kann deine persönliche Video-Bewerbung aussehen",
  videoText: "Eine kurze professionelle Vorstellung, abgestimmt auf deine Erfahrung und die Stelle, auf die du dich bewirbst.",
  /* Der Owner-Wortlaut zum Vorher/Nachher-Paar (28.08.2026). */
  videoVorherNachher: "Vom Küchentisch zur professionellen Video-Bewerbung.",
  videoVorherNachherText: "Natürlich aufgenommen, klar präsentiert und deutlich professioneller in der Wirkung.",
  /* Die drei Merkmale, die das Produkt ausmachen (Owner 28.08.2026: „hier musst du noch
     schreiben mit orginal stimme, orginal gesicht und Skriptvorgabe zum vorlesen"). */
  videoM1: "Deine eigene Stimme",
  videoM2: "Dein eigenes Gesicht",
  videoM3: "Skript zum Ablesen — nichts auswendig lernen",
  /* Der Ablauf im David-Fenster (Owner 28.08.2026: „nein, das springt dahin. Da ist was
     ganz anderes") — Foto, Skript, Kauf, Erzeugung, alles auf dieser Seite. */
  /* Was während des Wartens dasteht — nie ein Kreisel ohne Wort (Owner 28.08.2026: „was
     passiert hier?"). */
  /* WAS DA WIRKLICH PASSIERT (Owner 28.08.2026, mitten im laufenden Balken: „Bewerbung und
     Anschreiben oder nur Bewerbung schreibt er?").
     
     Beide Läufe erzeugen BEIDES — Lebenslauf und Anschreiben (siehe die Aufträge in
     app/api/resume-generator, je eine Zeile 'anschreiben'). Der alte Text nannte nur die
     „Bewerbung" und liess offen, ob das Anschreiben mitkommt. Genau diese Frage stellt sich
     der Kunde, während er dreissig Sekunden auf den Balken schaut und gerade 9,99 € bezahlt
     hat. Ein Fortschrittstext, der weniger verspricht als geliefert wird, ist kein
     Understatement — er sät Zweifel im teuersten Moment. */
  unterlagenLaeuft: "David schreibt deinen Lebenslauf und dein Anschreiben",
  unterlagenOptimiert: "Lebenslauf und Anschreiben werden auf die Stelle zugeschnitten",
  /* Woher das Skript kommt (Owner 28.08.2026: „unter dem Video muss noch stehen was für
     einen Skript abgeleitet aus der analyse"). */
  videoSkriptHinweis: "Dein Sprechtext entsteht aus deinem Lebenslauf, der Stelle und den Antworten aus deinem Screening — du liest ihn nur ab.",
  /* Die Aufnahme — daraus kommen Gesicht UND Stimme (Owner 28.08.2026). */
  videoKleidungTitel: "Kleidung",
  videoKleidungText: "Vorgeschlagen nach deiner Branche — und nach dem, was du auf deinem Bewerbungsfoto trägst. Du entscheidest.",
  videoUmgebungTitel: "Umgebung",
  videoUmgebungText: "Warm und natürlich statt Studio — passend zu der Stelle, auf die du dich bewirbst. Du kannst wechseln.",
  videoZurAufnahme: "Weiter zur Aufnahme",
  videoAufnahmeTitel: "Nimm dich auf",
  videoAufnahmeText: "Dein Skript läuft über der Kamera mit — du liest es einfach ab. Aus dieser Aufnahme entstehen dein Gesicht im Berufs-Look und deine Stimme.",
  videoAufnahmeKnopf: "Kamera öffnen",
  videoAufnahmeHinweis: "Rutsch so weit vor oder zurück, bis dein Kopf den Kreis füllt. So oft du willst — es sieht niemand ausser dir.",
  videoAufnahmeLos: "Aufnahme starten",
  videoAufnahmeStopp: "Stopp",
  videoAufnahmeNochmal: "Neu aufnehmen",
  videoAufnahmeUebernehmen: "Diese Aufnahme nehmen",
  videoAufnahmeSchliessen: "Schliessen",
  videoAufnahmeLaedt: "Deine Aufnahme wird gesichert",
  /* Zwischen Tipp und Kassenfenster liegt ein Serveraufruf — was in dieser Zeit dasteht,
     entscheidet, ob der Käufer wartet oder ein zweites Mal tippt (Owner 30.08.2026). */
  videoKasseOeffnet: "Ich öffne die Kasse",
  videoDankTitel: "Danke — dein Video wird erstellt.",
  videoDankText: "Das dauert ein paar Minuten. Du findest es im Menü unter „Assets“ — auch dann, wenn du diese Seite schliesst.",
  /* Der Ausweg, wenn die Erzeugung nach der Zahlung scheitert: neu aufnehmen kostet
     nichts — bezahlt ist bezahlt, die Kasse rechnet nicht noch einmal ab. */
  videoNochmalNachFehler: "Neu aufnehmen und noch einmal starten — bezahlt ist bezahlt",
  /* Die Quittung nach der Zahlung — sie sagt, dass es angekommen ist UND wo es hinkommt
     (Owner 30.08.2026). Sie schliesst sich nach sechs Sekunden von selbst. */
  /* Foto nachreichen, wenn die Bewerbung schon fertig ist (Owner 30.08.2026: „aber mein
     Bild hat er nicht eingebaut"). Kein Modell-Lauf — nur Ablage, das PDF baut sich beim
     Öffnen frisch. */
  fotoNachreichen: "Foto in die Bewerbung übernehmen",
  fotoNachreichenLaeuft: "Foto wird übernommen",
  fotoNachgereicht: "Foto übernommen — öffne das PDF neu.",
  /* Die WEITERE Bewerbung aus derselben Analyse (Owner 30.08.2026: „ich will dass eine
     neue entsteht"). Lebenslauf + Gespräch werden wiederverwendet; die erste Mappe bleibt
     unberührt, jede weitere ist ein eigener Kauf mit eigener Kachel. */
  mappeTitel: "Noch eine Stelle im Blick?",
  mappeText: "Füge die Anzeige ein — wir schneiden Lebenslauf und Anschreiben auf diese Stelle zu. Deine erste Bewerbung bleibt, wie sie ist; die neue bekommt ihre eigene Kachel in den Assets.",
  mappeCta: "Weitere Bewerbung erstellen",
  mappeLaeuft: "Deine weitere Bewerbung entsteht",
  mappeFertig: "Deine weitere Bewerbung ist fertig — auch unter „Assets“.",
  mappePdf: "Bewerbung öffnen (PDF)",
  mappeAnzeigeWeg: "Die Anzeige ist auf diesem Gerät nicht mehr da. Füge sie oben noch einmal ein und tippe erneut — bezahlt ist bezahlt, es wird nichts doppelt abgebucht.",
  kaufDankTitel: "Danke — wir erstellen jetzt deine Bewerbung.",
  kaufDankText: "Das dauert einen Moment. Du findest sie im Menü unter „Assets“ — auch dann, wenn du diese Seite schliesst.",
  videoAufnahmeDa: "Aufnahme gespeichert.",
  videoAufnahmeFehlt: "Ohne Aufnahme kann ich kein Video machen.",
  videoAufnahmeFehler: "Die Aufnahme ließ sich nicht sichern. Versuch es bitte noch einmal.",
  videoKeineKamera: "Ich komme nicht an deine Kamera. Erlaube den Zugriff im Browser und versuch es noch einmal.",
  videoSkriptLaeuft: "David schreibt dein Skript",
  videoSkriptTitel: "Dein Skript",
  videoSkriptText: "Geschrieben aus deinem Lebenslauf, der Stelle und unserem Gespräch. Ändere jeden Satz, der nicht nach dir klingt.",
  videoSkriptFehlt: "Der Text ist zu kurz für eine Vorstellung.",
  videoKaufen: "Video jetzt erstellen",
  videoLaeuftTitel: "Dein Video entsteht",
  videoLaeuft: "Aufnahme im Berufs-Look wird erzeugt",
  videoFertigTitel: "Dein Video ist in Arbeit.",
  videoFertigText: "Sobald es fertig ist, liegt es in deinen Assets — das dauert ein paar Minuten. Du kannst die Seite schließen.",
  videoNetzFehler: "Das hat gerade nicht geklappt. Versuch es bitte noch einmal.",
  videoCta: "Ja, meine Video-Bewerbung erstellen",
  pdfSeite1: "Anschreiben",
  pdfSeite2: "Lebenslauf",
  /* DIE VORLAGEN-GALERIE (Owner 28.08.2026) — die Namen der fünf Vorlagen stehen NICHT
     hier, sondern in `PDF_VORLAGEN` (lib/bewerbung-pdf.ts): Sie sind der Name einer Farbe
     und in jeder Sprache derselbe, und das PDF braucht sie ohnehin. Zwei Listen, die
     auseinanderlaufen können, wären eine zu viel. */
  vorlagenTitel: "Foto und Layout wählen",
  vorlagenAnsehen: "Vorlage vergrössern",
  schliessen: "Schliessen",
  /* DAS TOR VOR DEM BERICHT (Owner 28.08.2026: „darf niemand sehen nur er"). Der Text sagt
     bewusst NICHT, ob es den Bericht gibt — für einen Fremden mit weitergeleitetem Link soll
     das nicht unterscheidbar sein. */
  torPruefe: "Einen Moment — wir schauen, ob das deiner ist",
  torTitel: "Dieser Bericht ist privat",
  torText: "Er gehört zu dem Browser, in dem er entstanden ist. Melde dich mit deiner Adresse an, um ihn auf jedem Gerät zu sehen — oder starte hier ein neues Screening.",
  torAnmelden: "Anmelden",
  torNeu: "Neues Screening starten",
  /* DIE LETZTE PRÜFUNG VOR DEM KAUF (Owner 28.08.2026, nach einem echten Kauf: „ich habe
     vergessen ein Bild hochzuladen und habe erst später gemerkt. Also Hinweis wäre nicht
     schlecht. Richtiges Template gewählt, Bild hochgeladen. Ja/Nein"). */
  checkVorlage: "Vorlage",
  checkFoto: "Bewerbungsfoto",
  checkFotoFehlt: "fehlt",
  fotoFehltTitel: "Ohne Foto?",
  /* WORTKOLLISION: „Die Stelle" heisst in diesem Produkt überall der JOB. Hier war der Platz
     im Dokument gemeint — derselbe Satz, zwei Bedeutungen, und der Leser stolpert. */
  fotoFehltText: "Du hast noch kein Bewerbungsfoto hochgeladen. In deiner Vorlage bleibt der Platz dafür dann leer.",
  fotoJetztWaehlen: "Foto auswählen",
  ohneFotoWeiter: "Trotzdem ohne Foto kaufen",
  /* Die drei Zutaten, aus denen die Bewerbung entsteht — je ein Wort unter der Kachel. */
  zutatFoto: "Dein Foto",
  zutatAnalyse: "Deine Analyse",
  zutatAnalyseFertig: "Gespeichert",
  zutatVorlage: "Deine Vorlage",
  fotoTitel: "Dein Bewerbungsfoto",
  fotoHinweis: "Dein Bewerbungsfoto: freundlich, gerade in die Kamera. Ohne Foto bleibt der Platz in der Vorlage leer.",
  fotoLabel: "Dein Foto",
  fotoWaehlen: "Foto auswählen",
  fotoLoeschen: "Foto entfernen",
  fotoFehler: "Dieses Foto konnten wir nicht lesen. Bitte lade es als JPG hoch.",
  vorlagenText: "Fünf Vorlagen zum Wischen — tippe eine an, genau so kommt deine Bewerbung als PDF. Zum Lesen das Symbol oben rechts auf der Vorlage.",
  imPreis: "Im Preis enthalten: der optimierte Lebenslauf, das Anschreiben und beides als PDF.",

  /* ── 8 · Feedback ────────────────────────────────────────────────────────── */
  feedbackFrage: "Eine letzte Frage: Wie nützlich war dieses Pre-Screening für dich?",
  n1: "Sehr nützlich",
  n2: "Nützlich",
  n3: "Teilweise nützlich",
  n4: "Eher nicht nützlich",
  dankeKurz: "Danke.",
  interessenText: "Wir entwickeln David laufend weiter. Welche zusätzlichen Lösungen wären für dich persönlich interessant?",
  i1t: "Passende Jobs weltweit finden",
  i1d: "Stellen finden, die nicht nur zu meinem bisherigen Jobtitel, sondern auch zu meinen tatsächlichen Fähigkeiten passen.",
  i2t: "Komplette Bewerbung erstellen",
  i2d: "Professionelle, individuell auf eine konkrete Stelle abgestimmte Bewerbungstexte und PDFs.",
  i3t: "Persönliche Bewerbungsseite",
  i3d: "Eine professionelle Landingpage für meine Bewerbung und mein Profil.",
  i4t: "Video-Bewerbung",
  i4d: "Eine professionelle persönliche Vorstellung als Video.",
  i5t: "Tiefere Karriere- und Profilanalyse",
  i5d: "Alternative Berufe, Quereinstieg, Weiterbildung, Umschulung und neue berufliche Möglichkeiten erkennen.",
  i6t: "Persönliche Beratung",
  i6d: "Individuelle Unterstützung bei Jobsuche, Bewerbung oder beruflicher Neuorientierung.",
  i7t: "Nichts davon im Moment",
  i7d: "",
  feedbackTextFrage: "Was hätte das Screening für dich hilfreicher gemacht?",
  feedbackPlatzhalter: "Deine Antwort — freiwillig",
  absenden: "Absenden",
  ueberspringen: "Überspringen",

  /* ── 9 · Produkt-Updates (freiwillig) ────────────────────────────────────── */
  updatesTitel: "Möchtest du sehen, wie David sich weiterentwickelt?",
  updatesText: "Wir verbessern David laufend und arbeiten bereits an neuen Möglichkeiten wie weltweiter Jobsuche, fertigen Bewerbungen, Bewerbungsseiten, Video-Bewerbungen und tieferen Karriereanalysen. Dürfen wir dir gelegentlich eine E-Mail schicken, wenn etwas Neues verfügbar ist?",
  updatesHaken: "Ja, haltet mich über neue Funktionen und Angebote von David auf dem Laufenden.",
  fertig: "Fertig",
  dankeTitel: "Danke, {name}.",
  dankeText: "Dein Pre-Screening liegt in deinen Assets. Viel Erfolg mit deiner Bewerbung.",
};

export type DavidTunnelTexte = typeof DAVID_TUNNEL;

/** Die Trichtertexte in der Sprache des Besuchers — Deutsch ist die Quelle. */
export async function davidTunnelInSprache(lang: Lang): Promise<DavidTunnelTexte> {
  return textbausteineInSprache(DAVID_TUNNEL, lang);
}
