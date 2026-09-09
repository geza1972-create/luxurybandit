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
  uebersicht: "Übersicht",
  hooks: "Hooks",
  einstellungen: "Einstellungen",

  /* ── Der Riegel oben ─────────────────────────────────────────────────── */
  /* OHNE DAS WORT „TRICHTER" (09.09.2026): Der Übersetzer lässt es stehen — auf Rumänisch
     stand „Trichterul tău…". „Deine Seite" meint dasselbe und trägt in jede Sprache. */
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
  motivTitel: "Dein Bild",
  /**
   * DIE WEISSE KACHEL IST KEIN MANGEL (Owner 09.09.2026, auf mein „das ist mein Fehler":
   * „eben, das ist geil").
   *
   * Ich hatte die leere Fläche als Panne beschrieben. Sie ist ein Format — und in einem Feed
   * voller Bilder ist eine Fläche mit EINEM Satz das, was aus der Reihe fällt: Alle anderen
   * zeigen etwas, diese zwingt zum Lesen. Der Text darf sie deshalb nicht als Notlösung
   * anbieten, sondern als Wahl.
   */
  motivFein: "Zwei Formate: nur dein Satz auf Weiss — fällt in einem Feed voller Bilder auf. Oder dein Bild oben, der Satz darunter.",
  motivWaehlen: "Bild wählen",
  motivWechseln: "Anderes Bild",
  motivWeg: "Bild entfernen",
} as const;

export type DashboardTexte = { -readonly [K in keyof typeof DASHBOARD_TEXTE]: string };

/** Die Dashboard-Texte in der Sprache des Mandanten. Deutsch kostet keinen Aufruf. */
export async function dashboardTexteInSprache(sprache?: string): Promise<DashboardTexte> {
  const kurz = String(sprache ?? "de").slice(0, 2).toLowerCase();
  const lang: Lang = isLang(kurz) ? kurz : "de";
  return await textbausteineInSprache({ ...DASHBOARD_TEXTE } as DashboardTexte, lang);
}
