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
  hallo: "Hallo, ich bin David.",
  halloText: "Bevor wir uns deine Bewerbung ansehen: Wie darf ich dich ansprechen?",
  vornameLabel: "Vorname",
  vornamePlatzhalter: "Dein Vorname",
  weiter: "Weiter",
  bitteWarten: "Einen Moment",
  vornameFehlt: "Sag mir bitte, wie ich dich ansprechen darf.",

  /* ── 2 · E-Mail und Datenschutz ──────────────────────────────────────────── */
  mailTitel: "Hallo {name}.",
  mailText: "Damit ich dein Pre-Screening durchführen und dein Ergebnis für dich speichern kann, brauche ich noch deine E-Mail-Adresse.",
  mailLabel: "E-Mail-Adresse",
  mailPlatzhalter: "du@beispiel.de",
  mailFehlt: "Diese Adresse sieht noch nicht vollständig aus.",
  /* Der Wortlaut ist der des Owners (§5) — bewusst ohne „wir geben nichts an Dritte weiter"
     (technische Dienstleister verarbeiten im Auftrag) und ohne erzwungene Zustimmung zu
     KI-Training. */
  datenschutz: "Damit David dein Pre-Screening durchführen und speichern kann, verarbeiten wir die von dir bereitgestellten Daten, insbesondere deinen Lebenslauf, die Stellenanzeige und deine Antworten. Wir verwenden Nutzungsdaten außerdem zur Qualitätssicherung und Verbesserung von David. Deine Bewerbung wird nicht automatisch an Arbeitgeber versendet. Mehr dazu findest du in unserer Datenschutzerklärung.",
  datenschutzLink: "Datenschutzerklärung",
  haken: "Ich habe die Datenschutzhinweise gelesen und möchte das Pre-Screening starten.",
  hakenFehlt: "Ohne diese Bestätigung darf ich nicht loslegen.",
  screeningStarten: "Pre-Screening starten",

  /* ── 3 · Lebenslauf ──────────────────────────────────────────────────────── */
  cvTitel: "Gut, {name}.",
  cvText: "Jetzt schauen wir uns deine Bewerbung an. Als Erstes brauche ich deinen Lebenslauf.",
  cvKnopf: "Lebenslauf hochladen",
  cvHinweis: "PDF oder Word · bleibt bei uns",
  cvLaeuft: "David liest deinen Lebenslauf",
  cvLaden1: "Beruflicher Hintergrund wird eingeordnet",
  cvLaden2: "Erfahrungen werden erkannt",
  cvLaden3: "Relevante Kompetenzen werden identifiziert",
  cvFehler: "Der Lebenslauf ließ sich nicht lesen. Versuch es bitte mit einer PDF-Datei.",

  /* ── 4 · Die Stelle ──────────────────────────────────────────────────────── */
  jobText: "Zeig mir jetzt die Stelle, auf die du dich bewerben möchtest.",
  jobPlatzhalter: "Stellenanzeige einfügen — der ganze Text der Anzeige",
  jobKurz: "Das ist noch zu wenig. Füg die Anzeige bitte vollständig ein.",
  jobDatei: "Oder als Datei hochladen",
  jobLaeuft: "David vergleicht deinen Lebenslauf mit der Stelle",
  jobLaden1: "Aufgaben der Position werden gelesen",
  jobLaden2: "Anforderungen werden abgeglichen",
  jobLaden3: "Offene Punkte werden gesammelt",
  uebergang: "Ich habe deinen Lebenslauf mit der Stelle verglichen. Einige Punkte kann ich bereits gut einordnen. Es gibt aber auch Dinge, die ein Recruiter aus deinem Lebenslauf allein nicht erkennen kann. Genau darüber möchte ich jetzt kurz mit dir sprechen.",
  losGehts: "Los geht's",

  /* ── 5 · Das Gespräch ────────────────────────────────────────────────────── */
  fortschritt: "Pre-Screening",
  von: "von etwa",
  antwortPlatzhalter: "Deine Antwort …",
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
  videoAufnahmeHinweis: "Kopf in den Kreis, dann starten. So oft du willst — es sieht niemand ausser dir.",
  videoAufnahmeLos: "Aufnahme starten",
  videoAufnahmeStopp: "Stopp",
  videoAufnahmeNochmal: "Neu aufnehmen",
  videoAufnahmeUebernehmen: "Diese Aufnahme nehmen",
  videoAufnahmeSchliessen: "Schliessen",
  videoAufnahmeLaedt: "Deine Aufnahme wird gesichert",
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
  fotoFehltText: "Du hast noch kein Bewerbungsfoto hochgeladen. In deiner Vorlage bleibt die Stelle dann leer.",
  fotoJetztWaehlen: "Foto auswählen",
  ohneFotoWeiter: "Trotzdem ohne Foto kaufen",
  /* Die drei Zutaten, aus denen die Bewerbung entsteht — je ein Wort unter der Kachel. */
  zutatFoto: "Dein Foto",
  zutatAnalyse: "Deine Analyse",
  zutatAnalyseFertig: "Gespeichert",
  zutatVorlage: "Deine Vorlage",
  fotoTitel: "Dein Bewerbungsfoto",
  fotoHinweis: "Dein Bewerbungsfoto: freundlich, gerade in die Kamera. Ohne Foto bleibt die Stelle in der Vorlage leer.",
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
