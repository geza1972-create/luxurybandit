import { textbausteineInSprache } from "@/lib/lebenslauf-uebersetzen";
import { isLang, type Lang } from "@/lib/lang";

/**
 * DIE TEXTE DES DASHBOARDS — deutsche Quelle, eine Stelle.
 *
 * ── WARUM DAS DOCH NICHT WARTEN KONNTE (Owner 09.09.2026: „auf keinen Fall") ────────────────
 *
 * Ich hatte es zuletzt eingeplant, mit der Begründung: Das Dashboard sieht nur, wer bezahlt
 * hat — also erst wichtig, wenn ein fremdsprachiger Kunde kauft. Diese Begründung war eine
 * Stunde später falsch, und zwar durch seine eigene Entscheidung im selben Gespräch:
 *
 *   Seit die erste fremde Anfrage offen ist, sieht JEDER das Dashboard, der den Trichter
 *   fertig macht. Es ist nicht mehr die Kammer hinter der Kasse, sondern der Ort, an dem
 *   der Beweis liegt — die erste echte Anfrage mit Namen und Nummer.
 *
 * Ein deutsches Dashboard hätte damit genau den Moment getroffen, in dem sich entscheidet,
 * ob er kauft. Er hätte den Beweis nicht lesen können.
 *
 * ── DIE SPRACHE KOMMT VOM MANDANTEN ─────────────────────────────────────────────────────────
 *
 * Wie auf seiner Trichterseite (`lib/mandant-texte.ts`): Es ist SEIN Dashboard. Ein
 * Mitarbeiter mit deutschem Browser, der für ihn hineinsieht, soll dasselbe lesen wie er.
 *
 * ── HIER WIRD GEDUZT ────────────────────────────────────────────────────────────────────────
 *
 * Anders als auf der Seite seiner Kunden: Hier sprechen WIR mit IHM ([[immer-duzen]]).
 */
export const DASHBOARD_TEXTE = {
  /* ── Kopf und Navigation ─────────────────────────────────────────────── */
  /**
   * ── DER CHIP NENNT DEN GRUND, NICHT DEN ZUSTAND (Owner 09.09.2026: „doch, der nimmt
   * Anfragen an, aber der sieht sie nicht") ──────────────────────────────────────────────────
   *
   * ZWEI FASSUNGEN WAREN FALSCH, jede auf ihre Art:
   *  · „Trichter ist aus" kam aus dem Übersetzer unverändert zurück — er hielt „Trichter"
   *    für einen Markennamen.
   *  · „Nimmt noch keine Anfragen an" war übersetzbar und trotzdem missverständlich: Seit
   *    dem Schloss gibt es ZWEI Zustände, auf die der Satz passt. Der eine ist echt (ohne
   *    Impressum weist der Server jede Anfrage ab), der andere ist nur verdeckt (sie kommen
   *    an, er sieht sie nur nicht). Wer beides gleich benennt, verwirrt genau dort, wo es um
   *    Geld geht.
   *
   * DESHALB STEHT JETZT DER GRUND DA. „Impressum fehlt" ist eindeutig, übersetzbar und sagt
   * ihm in drei Wörtern, was zu tun ist.
   */
  laeuft: "Läuft",
  ausgeschaltet: "Noch nicht online · Impressum fehlt",
  /**
   * ── FÜR KÜNSTLER HEISST „ONLINE" ETWAS ANDERES (Owner 13.09.2026: „hier steht «Încă nu este
   * online». Raus." · „es ist online") ─────────────────────────────────────────────────────────
   *
   * Der Chip hing an Impressum und Datenschutz — Pflichten eines BETRIEBS auf seiner eigenen
   * Seite. Beim Künstler stellt das Portal die Rechtstexte, seine Felder bleiben für immer leer,
   * und das Dashboard behauptete dauerhaft „noch nicht online", während seine Seite längst
   * öffentlich erreichbar war. Für ihn entscheidet die Freigabe, sonst nichts.
   */
  wartetFreigabe: "Wird geprüft",
  /* „Übersicht" wurde maschinell zu „Prezentare generală" — zwei Wörter, die den Reiter sprengen
     (Owner 13.09.2026: „der muss anders heissen. Ist zu lang. Analiza"). „Analyse" ist kurz, wird
     in jeder Sprache zu einem Wort — und trifft es besser: Dort stehen Besucher, Anfragen und der
     Verlauf des Trichters, also eine Auswertung. */
  uebersicht: "Analyse",
  hooks: "Hooks",
  einstellungen: "Einstellungen",
  /* Der Weg vom Dashboard zu seiner Seite (Owner 12.09.2026: „dann öffnet sich das, hier muss
     einen Menüpunkt editează pagina"). Anders als die drei darüber wechselt er nicht die Fläche,
     sondern führt auf lakatosbandi.com/{name}?k=… — dorthin, wo Bilder, Texte und Preise stehen. */
  seiteBearbeiten: "Seite bearbeiten",

  /* ── Der Riegel oben ─────────────────────────────────────────────────── */
  /* OHNE DAS WORT „TRICHTER" (09.09.2026): Der Übersetzer lässt es stehen — auf Rumänisch
     stand „Trichterul tău…". „Deine Seite" meint dasselbe und trägt in jede Sprache. */
  /**
   * ── FÜR KÜNSTLER STIMMT DER RIEGEL NICHT (Owner 13.09.2026: „Meldung auf Dashboard «Pagina ta
   * nu acceptă solicitări» raus") ───────────────────────────────────────────────────────────────
   *
   * Der rote Riegel hängt an `impressumUrl` und `datenschutzUrl`. Die braucht ein Betrieb auf
   * SEINER Seite — ein Künstler auf lakatosbandi.com nicht: Dort stellt das Portal die
   * Rechtstexte. Seine beiden Felder bleiben deshalb für immer leer, der Riegel stand dauerhaft
   * da und behauptete, seine Seite nehme keine Anfragen an. Sie tut es; sein Agent läuft.
   *
   * An seiner Stelle steht jetzt, was ihn wirklich betrifft: dass wir Bild und Text für ihn
   * erzeugt haben und er sie ändern kann.
   */
  autoTitel: "Einige Angaben fehlten — wir haben sie für dich ergänzt.",
  autoText: "Profiltext und Profilbild hast du noch nicht selbst gesetzt. Wir haben beides aus deinen Werken erzeugt, damit deine Seite nicht leer aussieht. Du kannst es jederzeit überschreiben — dein Text gilt immer vor unserem.",
  /* Hat er Text und Bild selbst gesetzt, bleibt nur die Einladung stehen (Owner 13.09.2026:
     „Macht er das, verschwindet die Meldung, steht nur: Willst du deine Inhalte editieren"). */
  editTitel: "Willst du deine Inhalte bearbeiten?",
  autoKnopf: "Webseite bearbeiten",
  /* Der zweite Weg aus demselben Kasten (Owner 13.09.2026: „hier noch Vezi Pagina online") —
     bearbeiten ODER ansehen. Ohne ihn führt der Kasten nur ins Formular, und wie die Seite
     für Käufer aussieht, sieht er erst über einen Umweg. */
  seiteAnsehen: "Seite online ansehen",
  riegelTitel: "Deine Seite nimmt noch keine Anfragen an.",
  riegelText: "Es fehlen Impressum und Datenschutz. Deine Seite ist zu sehen, aber niemand kann etwas hinterlassen — und du merkst es erst, wenn niemand anruft.",
  riegelKnopf: "Jetzt eintragen",

  /* ── Die vier Zahlen ─────────────────────────────────────────────────── */
  besucher: "Besucher",
  anfragen: "Anfragen",
  neu: "Neu",
  zuletzt: "Zuletzt",
  tage30: "30 Tage",
  tage7: "7 Tage",

  /* ── Was er verkauft hat (Owner 19.09.2026: „eigentlich müssen sie auch auf dem Dashboard
     stehen des Künstlers") ─────────────────────────────────────────────────────────────────
     SEIN WORT, NICHT MEINES: Er nennt das erzeugte Blatt „Poster" („die Käufe sehen mit
     Poster die generiert worden sind"). Getrennte Schlüssel für Einzahl und Mehrzahl —
     „1 Postere vândute" ist der Fehler, den man nur in der eigenen Sprache nicht sieht.
     `{n}` wird nach der Übersetzung eingesetzt ([[uebersetzer-fallen]]). */
  posterVerkauft1: "1 Poster verkauft",
  posterVerkauftN: "{n} Poster verkauft",

  /* ── Wo sie abspringen ───────────────────────────────────────────────── */
  abspringenTitel: "Wo sie abspringen",
  abspringenZeit: "Letzte 30 Tage",
  groessterAbsprung: "Grösster Absprung:",
  /* `{n}` wird nach der Übersetzung eingesetzt — ein Übersetzer erfindet Platzhalter oder
     lässt sie weg ([[uebersetzer-fallen]]). */
  hierAufgehoert: "hier aufgehört",
  keineKontaktdaten: "Keine Kontaktdaten hinterlassen",

  /* ── Zeitangaben ─────────────────────────────────────────────────────── */
  /* `{n}` wird nach der Übersetzung eingesetzt. Getrennte Schlüssel für Einzahl und Mehrzahl,
     weil kaum eine Sprache sie gleich bildet — „vor 1 Tagen" ist der Fehler, den man nur in
     der eigenen Sprache nicht sieht. */
  geradeEben: "gerade eben",
  vorMinuten: "vor {n} Min.",
  vorStunden: "vor {n} Std.",
  vorEinemTag: "vor 1 Tag",
  vorTagen: "vor {n} Tagen",

  /* ── Die Stufen der Abbruch-Leiter ───────────────────────────────────── */
  /* Sie stehen doppelt: als deutsche Quelle in lib/versusforge-schritt.ts (dort sind sie
     Datenschlüssel und dürfen sich nie ändern) und hier als das, was er liest. */
  stufeSeite: "Seite gesehen",
  stufeStart: "Gespräch begonnen",
  stufeAntwort1: "1. Frage beantwortet",
  stufeAntwort2: "2. Frage beantwortet",
  stufeAntwort3: "3. Frage beantwortet",
  stufeAntwort4: "4. Frage beantwortet",
  stufeAbschluss: "Nummer hinterlassen",

  /* ── Wenn er nicht allein weiterkommt ────────────────────────────────── */
  /**
   * ── DIE BERATUNG STEHT AUCH IM DASHBOARD (Owner 09.09.2026: „ich glaube ehrlich gesagt
   * nicht, dass jemand das kauft ohne Beratung. Das müssen wir ihm ebenso auf seinem
   * Dashboard anbieten, so wie in der E-Mail") ────────────────────────────────────────────
   *
   * IN DER MAIL STEHT SIE SEIT GESTERN, im Dashboard fehlte sie — und das ist die falsche
   * Reihenfolge: Die Mail liest er einmal, das Dashboard öffnet er jedes Mal, wenn eine
   * Anfrage kommt. Genau dort sitzt er, wenn er ins Stocken gerät.
   *
   * ES IST KEIN VERKAUFSTEXT, SONDERN EIN AUSWEG. Wer 299 € ausgeben soll und nicht weiss,
   * wie er die Anzeige einrichtet, kauft nicht — er hört auf. Ein Mensch am anderen Ende ist
   * an dieser Stelle mehr wert als jedes weitere Merkmal.
   */
  beratungTitel: "Du musst das nicht allein machen.",
  beratungText: "Wenn du nicht weiterkommst — bei der Anzeige, beim Einrichten, bei den Texten — machen wir es mit dir zusammen. Es antwortet ein Mensch, kein Agent.",
  beratungKnopf: "Schreib uns",

  /* ── Die Anleitung für Facebook ──────────────────────────────────────── */
  /**
   * ── SIE GEHÖRT INS DASHBOARD, NICHT NUR IN DIE MAIL (Owner 09.09.2026: „wir müssen ihm
   * Hilfe bei Facebook einrichten helfen. Wenn er das noch nie gemacht hat, wird er es nicht
   * wissen") ────────────────────────────────────────────────────────────────────────────────
   *
   * DIE ZEHN SCHRITTE STEHEN SEIT GESTERN IN DER MAIL. Eine Mail liest man einmal und findet
   * sie drei Wochen später nicht wieder — und genau dann sitzt er vor dem Werbeanzeigen-
   * manager. Im Dashboard ist sie da, wo er ohnehin ist.
   *
   * ZUGEKLAPPT, NICHT WEG: Wer es kann, soll nicht an zehn Schritten vorbeiscrollen. Wer es
   * nicht kann, findet die Zeile, ohne jemanden fragen zu müssen.
   */
  anleitungTitel: "So richtest du die Anzeige bei Facebook ein",
  anleitungFein: "Zehn Schritte. Du brauchst eine Facebook-Seite und ein Werbekonto — beides ist kostenlos.",
  anleitungOeffnen: "Anleitung anzeigen",

  /* ── Die Liste ───────────────────────────────────────────────────────── */
  keineAnfragen: "Noch keine Anfragen",
  deineAnfragen: "Deine Anfragen",
  wartetLeer: "Sobald jemand deine Seite durchläuft, steht er hier — und du bekommst eine E-Mail.",
  wartetAus: "Trag zuerst Impressum und Datenschutz ein. Danach nimmt deine Seite Anfragen an.",
  eineWartet: "Eine weitere Nummer wartet.",
  /* `{n}` = Anzahl. */
  vieleWarten: "{n} weitere Nummern warten.",
  /* `{frei}` = wie viele offen sind, aus lib/versusforge-schalter.ts. Die Zahl darf sich
     ändern; der Satz muss sie nicht wissen. */
  ersteOffen: "Die ersten {frei} Anfragen sind offen — du hast selbst gesehen, dass sie echt sind. Bei den nächsten fehlt nur noch, wer es war. Wer innerhalb eines Tages zurückruft, erreicht die Leute noch.",
  /* `{preis}` = der Betrag aus der Tabelle, nach der Übersetzung eingesetzt. */
  preisZeile: "{preis} einmalig, mit Einrichtung deiner ersten Anzeige zusammen mit uns.",
  freischalten: "Für {preis} freischalten",

  /* ── Eine Anfrage ────────────────────────────────────────────────────── */
  deinTestlauf: "Dein Testlauf",
  /**
   * ── WOHER DIE ANFRAGE KAM (Owner 09.09.2026: „und wie kann er wissen, was der Kunde
   * anfragt?" · „das Gleiche gilt für den Immobilienverkäufer") ────────────────────────────
   *
   * Bei fünf laufenden Anzeigen ist das die Frage, die über sein Werbebudget entscheidet.
   * Ohne sie lässt er alle fünf laufen, auch die vier, die nichts bringen — und zahlt sie.
   *
   * BEIM MAKLER IST ES DIESELBE FRAGE mit anderem Gegenstand: Er bewirbt drei Wohnungen,
   * und die Anfrage sagt ihm, WELCHE gefragt ist. Der Hook ist bei ihm das Objekt.
   */
  ausAnzeige: "Aus Anzeige",
  /** Die Adresse, die er in genau diese Anzeige schreibt. */
  anzeigeLink: "Adresse für diese Anzeige",
  verschlossen: "Ein Mensch — Name und Nummer verschlossen",
  ohneNamen: "Ohne Namen",
  gespraech: "Das Gespräch",
  frage: "Frage",
  fragen: "Fragen",

  /* ── Einstellungen ───────────────────────────────────────────────────── */
  angabenTitel: "Deine Angaben",
  angabenNoetig: "Damit deine Seite Anfragen annehmen darf",
  mailFeld: "Deine E-Mail-Adresse",
  mailFein: "Wohin deine Anfragen gehen",
  adresseFeld: "Deine Adresse",
  telefonFeld: "Telefonnummer",
  webFeld: "Deine Website",
  webKurz: "Website",
  impressumFeld: "Impressum",
  datenschutzFeld: "Datenschutz",
  kopfzeileFein: "Was oben auf deiner Seite steht",
  speichern: "Speichern",
  moment: "Einen Moment …",
  fehler: "Das ging gerade nicht. Bitte noch einmal.",
  ausgefuellt: "ausgefüllt",
  fehlt: "fehlt",

  /* ── Zugang ──────────────────────────────────────────────────────────── */
  zugangTitel: "Dein Zugang",
  deinTrichter: "Dein Trichter",
  deineAnzeige: "Deine Anzeige",
  deinDashboard: "Dein Dashboard",
  deinSchluessel: "Dein Schlüssel",
  trichterFein: "Diese Adresse gibst du bei Meta und Instagram als Ziel an.",
  anzeigeFein: "Titel und Primärtext zum Kopieren, dazu das Bild.",
  dashboardFein: "Als Lesezeichen speichern. Diese Seite hier.",
  schluesselFein: "Steckt am Ende der Dashboard-Adresse. Er ersetzt das Passwort.",
  zeigen: "Zeigen",
  verbergen: "Verbergen",

  /* ── Hooks ───────────────────────────────────────────────────────────── */
  hooksTitel: "Deine Hooks",
  ausAnalyse: "Aus deiner Analyse",
  neuerHook: "Neuen Hook schreiben lassen",
  schreibt: "Schreibt …",
  hinzufuegen: "Hinzufügen",
  bildBauen: "Bild bauen",
  bildZu: "Bild zuklappen",
  loeschen: "Löschen",
  wirklichLoeschen: "Wirklich löschen?",
  hookPlatzhalter: "Ein fester Zahn in einem Termin — geht das bei dir?",
  /**
   * ── WORUM ES BEI DIESEM EINEN STÜCK GEHT (Owner 09.09.2026, an der Van-Gogh-Kachel: „ein
   * Blau, das sich ein zweites Mal nicht mehr verkauft … das kann aus den Antworten des Users
   * kommen") ───────────────────────────────────────────────────────────────────────────────
   *
   * Sein Satz war besser als meiner, und der Unterschied ist das ganze Rezept: „Ein Bild, das
   * sich kein zweites Mal verkauft" stimmt für jede Galerie der Welt. „Ein BLAU, das sich kein
   * zweites Mal verkauft" kann nur über dieses eine Werk geschrieben werden.
   *
   * WIR SEHEN DAS MOTIV NICHT — er schreibt in einem Halbsatz, worum es geht. Freiwillig: Der
   * Makler mit drei Wohnungen und der Künstler mit fünf Werken brauchen es, der Zahnarzt nicht.
   */
  worumTitel: "Geht es um ein bestimmtes Stück?",
  /* ZWEI BEISPIELE, WEIL ES ZWEI SORTEN GIBT (Owner 09.09.2026: „die Immobilienverkäufer
     verkaufen auch das Feeling oder die Aussicht"): ein Ding und ein Moment. Wer nur das
     erste liest, schreibt Datenblätter. */
  worumPlatzhalter: "Dunkles Blau, Nachthimmel — oder: Balkon nach Osten, Sonne bis mittags",
  worumFein: "Ein Halbsatz reicht — ein Ding oder ein Moment. Die Prüfung: Würde derselbe Satz auch über das Nachbarstück stimmen, ist er zu allgemein.",
  /**
   * ── SEIN EIGENES MOTIV (Owner 09.09.2026: „stell dir vor, ein Künstler will seine Art
   * verkaufen. Das müsste auch funktionieren. Bild und Spruch") ────────────────────────────
   *
   * Für einen Zahnarzt ist die weisse Schriftkachel richtig: Sein Produkt ist ein Ergebnis,
   * kein Anblick. Für einen Künstler, einen Bäcker, ein Hotel ist sie falsch — dort IST das
   * Bild das Produkt, und ein Satz allein bewirbt es nicht, er beschreibt es nur.
   *
   * EINMAL HOCHLADEN, UNTER JEDEM SATZ: Das Motiv gehört dem Trichter, nicht der einzelnen
   * Kachel. Er wählt sein Werk einmal aus und sieht es unter allen seinen Hooks.
   */
  motivTitel: "Dein Standardbild",
  /**
   * DIE WEISSE KACHEL IST KEIN MANGEL (Owner 09.09.2026, auf mein „das ist mein Fehler":
   * „eben, das ist geil").
   *
   * Ich hatte die leere Fläche als Panne beschrieben. Sie ist ein Format — und in einem Feed
   * voller Bilder ist eine Fläche mit EINEM Satz das, was aus der Reihe fällt: Alle anderen
   * zeigen etwas, diese zwingt zum Lesen. Der Text darf sie deshalb nicht als Notlösung
   * anbieten, sondern als Wahl.
   */
  motivFein: "Es steht unter jedem Hook, der kein eigenes hat. Zwei Formate: nur dein Satz auf Weiss — fällt in einem Feed voller Bilder auf. Oder dein Bild oben, der Satz darunter.",
  /**
   * ── JEDER HOOK DARF SEIN EIGENES BILD HABEN (Owner 09.09.2026: „der Kunde macht also pro
   * Motiv einen Trichter + Dashboard?" · „also 299 Euro jedes Mal" · „das ist heftig") ───────
   *
   * ER HAT EINEN ECHTEN FEHLER GEFUNDEN. Ich hatte EIN Motiv an den Trichter gehängt. Für den
   * Zahnarzt stimmt das — sein Raum ist immer derselbe. Für einen Künstler mit fünf Werken
   * hätte es bedeutet: fünf Trichter, fünfmal 299 €. Für das Bewerben von fünf Bildern.
   *
   * EIN TRICHTER, EIN DASHBOARD, EINE 299 — und darin so viele Hooks und Bilder, wie er will.
   */
  hookBild: "Bild für diesen Hook",
  hookBildWechseln: "Anderes Bild",
  hookBildWeg: "Eigenes Bild entfernen",
  motivWaehlen: "Bild wählen",
  motivWechseln: "Anderes Bild",
  motivWeg: "Bild entfernen",
  /* MODERATION (Owner 10.09.2026): Markierte Werke gibt der Owner frei, verbotene werden nicht
     angenommen. Der Künstler erfährt WAS passiert, nie die Kategorie — ein „als sexuell markiert"
     wäre bei einem Akt eine Kränkung, bevor ein Mensch hingesehen hat. */
  motivPruefung: "Danke! Wir sehen uns dieses Bild kurz an. Nach der Freigabe erscheint es hier — meist innerhalb von 3 Tagen.",
  motivAbgelehnt: "Dieses Bild können wir leider nicht annehmen.",
  /* DER EINE GRUND, DER GENANNT WIRD (Owner 10.09.2026: „schreib du was") — mit dem Weg, der
     offen bleibt. Variante B: zum Start keine Aktfotografie. */
  motivAktfoto: "Aktfotografie nehmen wir zurzeit nicht an. Gemalte und gezeichnete Akte sind willkommen.",
  /* ── DAS ART-MARKETING-ABO (Owner 10.09.2026) — Regeln in lib/versusforge-abo.ts ── */
  aboFrage: "Drei Interessenten haben sich gemeldet. Willst du deinen Agenten behalten?",
  aboFrist: "Noch {n} Tage siehst du jede Anfrage — danach nur mit dem Abo.",
  aboGesperrt: "{n} Antworten warten auf dich. Du siehst sie, sobald du das Abo abschliesst.",
  aboGesperrtEine: "Eine Antwort wartet auf dich. Du siehst sie, sobald du das Abo abschliesst.",
  aboKnopf: "Agent behalten — {preis} im Monat",
  /**
   * ── DER KASTEN, WENN NICHTS GESPERRT IST (14.09.2026) ─────────────────────────────────────
   *
   * Seit der Kaufweg immer sichtbar ist, sieht ihn auch, wer NULL gesperrte Anfragen hat. Dort
   * stand bisher `aboFrage` — „Drei Interessenten haben sich gemeldet". Das wäre eine erfundene
   * Behauptung: Die Anfragen-Sperre ist aus, es sind nie welche zurückgehalten worden.
   *
   * Diese beiden Zeilen behaupten nichts. Sie sagen, was er bekommt.
   */
  aboAngebot: "Lass die KI für dich schreiben — Beschreibungen für deine Werke und deinen Profiltext.",
  aboKnopfAngebot: "Abo abschliessen — {preis} im Monat",
  aboAktivZeile: "Dein Abo ist aktiv. Du siehst jede Anfrage.",
} as const;

export type DashboardTexte = { -readonly [K in keyof typeof DASHBOARD_TEXTE]: string };

/** Die Dashboard-Texte in der Sprache des Mandanten. Deutsch kostet keinen Aufruf. */
/**
 * ── WAS NICHT DER ÜBERSETZER ENTSCHEIDET (Owner 13.09.2026: „der muss anders heissen. Ist zu
 * lang. Analiza") ─────────────────────────────────────────────────────────────────────────────
 *
 * „Übersicht" wurde maschinell zu „Prezentare generală" — zwei Wörter, die den Reiter sprengen.
 * Nach der Umbenennung in „Analyse" kam das Wort UNÜBERSETZT durch: `textbausteineInSprache`
 * fällt bei jedem Ausfall auf das deutsche Original zurück (`raus[i] || werte[i]`), und im
 * Zweifel steht dann ein deutsches Wort in einer rumänischen Oberfläche.
 *
 * BEI EINEM REITER IST DAS NICHT HINNEHMBAR: Er hat drei Wörter Platz und wird bei jedem Besuch
 * gelesen. Deshalb steht er hier fest — dieselbe Lösung wie in `lib/agent-chat-texte.ts`, wo
 * feste Fassungen die Maschinenübersetzung überschreiben.
 *
 * NUR FÜR DAS, WAS WIRKLICH FESTSTEHEN MUSS. Alles andere bleibt übersetzt; eine zweite
 * vollständige Sprachtabelle wäre die Stelle, die beim nächsten Umbau auseinanderläuft.
 */
const FEST: Partial<Record<Lang, Partial<DashboardTexte>>> = {
  /* Beide fest, nicht übersetzt: „Analyse" kam bei der Maschinenübersetzung unverändert deutsch
     durch (`raus[i] || werte[i]`), und bei einem Knopf, der bei jedem Besuch gelesen wird, darf
     das nicht vom Glück abhängen. Wortlaut beim Ansehen wie im Portal-Formular. */
  ro: { uebersicht: "Analiză", seiteAnsehen: "Vezi pagina online" },
  en: { uebersicht: "Analytics", seiteAnsehen: "See your page online" },
};

export async function dashboardTexteInSprache(sprache?: string): Promise<DashboardTexte> {
  const kurz = String(sprache ?? "de").slice(0, 2).toLowerCase();
  const lang: Lang = isLang(kurz) ? kurz : "de";
  const uebersetzt = await textbausteineInSprache({ ...DASHBOARD_TEXTE } as DashboardTexte, lang);
  /* Die festen Fassungen zuletzt — sie schlagen die Übersetzung, nicht umgekehrt. */
  return { ...uebersetzt, ...(FEST[lang] ?? {}) };
}
