import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";
import { EIGENER_MANDANT, GESPERRTE_NAMEN, mandantSauber } from "@/lib/versusforge-lead";

/**
 * WER EINEN EIGENEN TRICHTER HAT (Owner 09.09.2026: „er bekommt einen Funnel, eine URL, die
 * er in Insta oder FB eingeben kann: VersusForge/ZahnarztPeter. Und das Dashboard dazu." ·
 * „am Ende müssen seine Daten stehen statt meine").
 *
 * DAS IST DAS PRODUKT FÜR 299 €. Alles darin entsteht aus dem Plan, den die Maschine für ihn
 * schon erzeugt hat — der Hook ist sein Hook, die Karten sind seine Fälle. Was hier steht,
 * wird also nicht getippt, sondern übernommen.
 *
 * EINE DATEI JE MANDANT, wie alles im Haus (`versusforge-lead/`, `david-limit/`). Keine
 * Sammelliste: Zwei Anlagen in derselben Sekunde würden einander überschreiben — die erste
 * der „drei Fallen beim Speichern".
 *
 * WEISS-LISTE, KEINE FREIE EINGABE: Der Name steht in einem Pfad UND in einer öffentlichen
 * Adresse. `mandantSauber()` lässt nur Kleinbuchstaben, Ziffern und Bindestriche durch.
 *
 * WAS HIER BEWUSST NICHT LIEGT: der Dashboard-Schlüssel im Klartext neben den Inhalten, die
 * jeder Besucher sieht. Er hat ein eigenes Feld und wird nie an den Browser gegeben — die
 * öffentliche Seite holt sich `oeffentlich()`, das Dashboard `mandantLesen()`.
 */

/** Titel, Technik, Größe, Jahr eines Werks — alles freiwillig, alles kurz (Owner 10.09.2026). */
export type WerkInfo = {
  /** Seine Geschichte zu diesem Werk — nicht auf der Seite, sein Agent erzählt daraus (Owner 11.09.2026). */
  geschichte?: string;
  /** Sein Preis für DIESES Werk, wie er ihn schreibt — freiwillig. Leer: Es gilt `preisSpanne`. */
  preis?: string;
  /**
   * ALTLAST, WIRD NICHT MEHR GELESEN (Owner 12.09.2026). Das Häkchen „Preis auf meiner Seite
   * zeigen" gibt es nicht mehr: Wer einen Preis einträgt, will ihn zeigen. Das Feld bleibt nur
   * stehen, damit die bereits gespeicherten Werte der ersten Künstler nicht verlorengehen — es
   * entscheidet nichts mehr.
   */
  preisZeigen?: boolean;
  /**
   * WAS DIESE KACHEL IST (15.09.2026, Reproduktionen): Ohne diese Angabe böte der Agent an
   * jeder Kachel alle vier Materialien an — jemand hätte das FOTO DES SHIRTS auf Leinwand
   * bestellen können. Leer heisst wie bisher: ein Druck in allen Formaten.
   */
  produkt?: "tricou" | "hanorac";
  /**
   * ZU DIESEM WERK GIBT ES EINEN FILM (15.09.2026, Video Poster). Die Kachel zeigt dann das
   * bewegte Bild statt des stillen — Rahmen und Text bleiben HTML (Owner: „kannst du nicht nur
   * das video animieren nicht das ganze poster? drum herum ist html?").
   *
   * Ein Merker und keine Abfrage in der Ablage: Sonst fragte die Übersicht bei zehn Werken
   * zehnmal nach, ob eine Datei existiert, bevor sie eine Zeile zeichnen darf.
   */
  film?: boolean;
  /**
   * WANN DER FILM ZULETZT ERSETZT WURDE (15.09.2026). Die Film-Adresse trägt diesen Wert mit,
   * damit ein neuer Schnitt auch wirklich beim Betrachter ankommt: Ausgeliefert wird mit einem
   * Jahr Zwischenspeicher, und ohne diesen Zusatz hörte man die alte, stumme Fassung weiter —
   * genau das ist passiert (Owner: „ich höre nichts").
   */
  filmAm?: string;
  /**
   * ZU DIESEM WERK SPRICHT DER KÜNSTLER (Owner 17.09.2026). Derselbe Merker wie `film`, für den
   * zweiten Film: Ohne ihn müsste die Seite bei jedem Werk in der Ablage nachsehen, ob eine
   * Datei existiert — zehn Abfragen, bevor eine Zeile gezeichnet werden darf.
   */
  sprecher?: boolean;
  sprecherAm?: string;
  /** Zu diesem Werk hat der Künstler seinen Brief selbst vorgelesen (`sprecherTonPfad`). */
  stimme?: boolean;
  stimmeAm?: string;
  /**
   * ── ER WILL NUR GEHÖRT WERDEN, NICHT GESEHEN (Owner 17.09.2026: „dann haben wir ein Häkchen
   * für Video nicht zeigen, nur die Stimme") ─────────────────────────────────────────────────
   *
   * Aufgenommen wird immer ein Film — aber nicht jeder will sein Gesicht auf fremden Wänden.
   * Steht dieses Häkchen, spielt das Fenster nur die Tonspur seines Films, und der Käufer sieht
   * das Werk. Die Aufnahme bleibt unverändert liegen; das Häkchen ist jederzeit umkehrbar.
   */
  nurStimme?: boolean;
  /**
   * ── OB DIESES WERK ALS VORLAGE DIENEN DARF (Owner 17.09.2026, am „Schrei" von Munch:
   * „glaubst du der prompt würde hier gehen?") ───────────────────────────────────────────────
   *
   * Nicht jedes Werk taugt dafür. Der Schrei hat kein gemaltes Gesicht, sondern eine Maske —
   * ein Kundengesicht darin ist entweder hässlich oder unkenntlich. Eine Sternennacht hat
   * überhaupt niemanden. Bei einem gemalten Porträt dagegen ist genau das das Geschäft.
   *
   * Und es ist zugleich das Häkchen für den lebenden Künstler, der das NICHT will (Owner
   * 17.09.2026: „ich weiss gar nicht, ob er das gerne hätte"). Fehlt das Feld, ist der Knopf da
   * — abschalten ist eine Entscheidung, die jemand trifft, kein Zustand, in den ein Werk fällt.
   */
  kunst?: boolean;
  /**
   * Die Kennung seines Films auf YouTube (Owner 17.09.2026). Steht sie da, spielt das Fenster
   * von dort; fehlt sie, spielt es unsere eigene Datei — ein gedruckter QR-Code darf nicht davon
   * abhängen, dass ein fremder Dienst den Film noch hat.
   */
  youtube?: string;
  /** Weitere Details, z. B. „Print semnat, ediție limitată 3/50" (Owner 11.09.2026: „hier wäre nicht Technica, sondern Alte detalii"). */
  detalii?: string; titel?: string; technik?: string; groesse?: string; jahr?: string;
  /**
   * DIESES WERK VERTRITT IHN (Owner 12.09.2026: „hier muss ein Häkchen sein in allen Sprachen,
   * welches Bild mich repräsentiert").
   *
   * Genau EINES je Künstler — das Formular löscht beim Anhaken die anderen. Es entscheidet das
   * Vorschaubild, das erscheint, wenn jemand seine Seite teilt; bis heute hatte die Künstlerseite
   * gar keines, ein geteilter Link war eine graue Textzeile. Fehlt die Angabe, nimmt die Seite
   * seine erste Kachel — wie bisher.
   */
  vertritt?: boolean;
  /**
   * DIESES WERK BIETET ER ALS POSTER VIU AN (Owner 16.09.2026: „auch bei jedem bild wenn er das
   * macht in seinem admin dann erscheint das in der kategorie").
   *
   * Sein Ja für die ganze Seite (`posterViu` am Mandanten) sagt nur, DASS er mitmacht. Welche
   * Werke gedruckt werden dürfen, entscheidet er hier Bild für Bild — manche Arbeiten will man
   * als Druck sehen, andere nie. Ohne Häkchen bleibt ein Werk ein Original und sonst nichts.
   */
  poster?: boolean;
  /**
   * OB DAS WERK IM QUERFORMAT IST (Owner 16.09.2026: „wir müssen die DIN formate einhalten" ·
   * „in diesem fall ist das format ein querformat").
   *
   * Ein Poster wird auf A3, A2 oder A1 gedruckt — und ein A-Bogen hat ein festes Verhältnis
   * (1:1,414). Die Kachel muss deshalb genau so aussehen, wie das Blatt später ist: hochkant
   * oder quer. Welche der beiden, hängt am WERK, und das weiss nur, wer das Bild gemessen hat.
   *
   * Ein Merker und keine Messung beim Rendern: Der Server müsste sonst bei jeder Kachel das
   * Bild laden, um eine Zahl zu erfahren, die sich nie ändert.
   */
  quer?: boolean };

export type MandantAngaben = {
  /** Der Name, der oben auf der Seite steht. Seiner, nicht unserer. */
  name: string;
  /** Ort oder Zusatz für den Fuss — „Musterstadt", „Praxis am Markt". */
  ort: string;
  /**
   * ADRESSE UND TELEFON IM KOPF (Owner 09.09.2026: „im Header muss noch stehen die Adresse,
   * Telefonnummer als Platzhalter" · „kauft er das Ganze, dann wird es da stehen").
   *
   * SOLANGE SIE LEER SIND, steht ein grauer Platzhalter da — kein leerer Fleck. Er soll
   * sehen, WO seine Angaben landen werden; ein Loch an der Stelle sieht aus wie ein Fehler,
   * ein Platzhalter sieht aus wie ein Formular, das noch auf ihn wartet.
   *
   * NICHTS ERFUNDEN: Der Platzhalter ist als solcher erkennbar und wird nie ausgeliefert,
   * sobald echte Angaben da sind.
   */
  adresse: string;
  telefon: string;
  /**
   * SEINE EIGENE WEBSITE (Owner 09.09.2026: „eventuell auch Link zu seiner Homepage").
   *
   * „EVENTUELL" IST HIER RICHTIG, deshalb ist das Feld optional und der Link erscheint nur,
   * wenn er ihn hinterlegt: Ein Weg von diesem Trichter WEG ist ein Ausgang vor dem Ziel.
   * Für den, der prüfen will, ob es die Praxis wirklich gibt, ist er dagegen genau das, was
   * Vertrauen schafft — und diese Frage stellt sich jemand, der gleich seine Nummer
   * hinterlassen soll.
   *
   * Er steht deshalb im KOPF bei den Kontaktangaben, nicht als Knopf neben dem Trichter.
   */
  webUrl: string;
  /**
   * SEINE SPRACHE (Owner 09.09.2026: „auch alles, was er erstellt — den Trichter und Hook
   * und Dashboard — wird in der Sprache erstellt, die er spricht").
   *
   * ── WARUM SIE AM MANDANTEN HÄNGT UND NICHT AM BESUCHER ───────────────────────────────────
   *
   * Auf jeder anderen Seite des Hauses entscheidet der Browser des Lesers, welche Sprache er
   * sieht. HIER NICHT: Was auf dieser Seite steht — der Hook, die Karten, der Knopf — ist
   * EIN Text, den die Maschine einmal in seiner Sprache erzeugt hat. Ihn nach der
   * Browsersprache des Besuchers umzuschalten hiesse, ihn übersetzen zu lassen; dann stünde
   * über einer rumänischen Anzeige ein deutscher Hook, den er nie geschrieben hat.
   *
   * DER MANDANT BESTIMMT, WEN ER BEWIRBT. Er schaltet die Anzeige, er kennt seine Kunden.
   * Unsere Aufgabe ist, dass seine Seite in EINER Sprache steht — seiner.
   *
   * ALTE DATEIEN HABEN DAS FELD NICHT. Dort gilt Deutsch, so wie sie erzeugt wurden; es wird
   * nichts nachträglich umgeschrieben.
   */
  sprache: string;
  /**
   * DAS GERÄT, MIT DEM ER DEN TRICHTER ANGELEGT HAT.
   *
   * Nur zu einem Zweck: seinen eigenen Testlauf von einer echten Anfrage zu unterscheiden
   * (siehe `eigen` in lib/versusforge-lead.ts). Es ist eine zufällige Kennung aus seinem
   * Browser, kein Personenbezug — und sie verlässt den Server nicht.
   */
  geraet?: string;
  /** Die Überschrift: sein Hook aus dem Plan. */
  hook: string;
  /**
   * ── DIESELBEN SPRÜCHE IN DEN ANDEREN PORTALSPRACHEN (Owner 14.09.2026: „hier wird nichts
   * übersetzt" · „einmal am tag musst du übersetzen") ────────────────────────────────────────
   *
   * Der Spruch entsteht in der Sprache des Künstlers. Ein Käufer aus England sah ihn bisher auf
   * Rumänisch, während die ganze Oberfläche um ihn herum englisch war.
   *
   * NEU GESCHRIEBEN, NICHT ÜBERSETZT: Ein Satz wie „Născut în două zile din pasiunea și memoria
   * artistului" wird Wort für Wort flach. Der Nachtlauf gibt dem Modell denselben Ton-Auftrag
   * wie beim Original ([[spruch-ton-louisett-massstab]]).
   *
   * JE SPRACHE DIESELBE FORM WIE OBEN: `hook` ist das Standardmotiv, `hooks` die übrigen Werke
   * in derselben Reihenfolge — fehlt ein Eintrag, gilt das Original.
   */
  hookSprachen?: Record<string, { hook?: string; hooks?: string[] }>;
  /** Ein Satz darunter, an SEINEN Kunden gerichtet — was er bekommt. */
  unterzeile: string;
  /** Die Karten zum Antippen statt eines leeren Feldes. 3 bis 4. */
  karten: string[];
  /** Was auf dem Knopf steht — „Beratungscheck starten". */
  knopf: string;
  /** Kleingedrucktes unter dem Knopf — „Kostenlos · ohne Termin". */
  fein: string;
  /**
   * WAS SEIN KUNDE AM ENDE BEKOMMT (Owner 09.09.2026: „die Kunden vom Zahnarzt bekommen
   * auch etwas am Ende, muss drunter stehen. Sie bekommen ein Angebot.").
   *
   * DASSELBE PRINZIP WIE AUF UNSERER SEITE, eine Ebene tiefer: Über dem Knopf steht die
   * Arbeit („vier Fragen"), darunter der Lohn. Ohne diesen Block beantwortet jemand vier
   * Fragen, ohne zu wissen, wofür — und bricht bei der dritten ab.
   *
   * JE GEWERBE ETWAS ANDERES: der Zahnarzt gibt ein Angebot, der Pflegedienst ein
   * Gespräch, der Makler eine Bewertung. Deshalb steht es beim Mandanten und nicht im Code.
   */
  ergebnisTitel: string;
  ergebnisText: string;
  /**
   * SEINE PFLICHTANGABEN (09.09.2026).
   *
   * Die White-Label-Regel der Academy war „Fuss komplett raus". Das geht bei einer Seite, die
   * nichts erhebt. Diese sammelt Namen, Telefonnummern und je nach Fach auch Angaben zur
   * Gesundheit — verantwortlich ist der Mandant, also stehen SEINE Angaben da. Der Fuss
   * verschwindet nicht, er wechselt den Besitzer.
   */
  aboutUrl: string;
  impressumUrl: string;
  datenschutzUrl: string;
  /** Seine Akzentfarbe als Hex. Leer = das ruhige Haus-Blau. NIE unser Gold. */
  farbe: string;
  /** Sein Logo (öffentliche Adresse). Leer = nur der Name als Schrift. */
  logoUrl: string;
  /**
   * SEIN EIGENES MOTIV FÜR DIE ANZEIGENBILDER (Owner 09.09.2026: „stell dir vor, ein
   * Künstler will seine Art verkaufen … Bild und Spruch").
   *
   * EIN BILD FÜR ALLE SEINE HOOKS, nicht eines je Kachel. Wer sein Werk, seinen Raum oder
   * seinen Teller einmal hochlädt, will es unter jedem Satz sehen — und nicht bei jedem
   * neuen Hook wieder suchen.
   *
   * ES STEHT ALS PFAD IM SPEICHER, nicht als Datenmenge in dieser Datei: Ein Bild in der
   * Mandantendatei würde jede Leseoperation um Megabyte verteuern, und die Datei wird bei
   * jedem Seitenaufruf gelesen.
   */
  motivPfad?: string;
  /**
   * SEIN PLAN als Zusammenhang für den Agenten. Damit fragt der Trichter SEINE Kunden
   * („fehlt Ihnen ein Zahn?") statt Unternehmer („was willst du erreichen?"). Ohne dieses
   * Feld wäre die Mandantenseite nur ein anderes Logo auf demselben Gespräch.
   */
  plan: unknown;
  /**
   * SEINE ADRESSE — an sie geht „du hast eine Anfrage" (Owner 09.09.2026).
   *
   * Sie kommt aus dem Haupttrichter, in dem er sie ohnehin hinterlassen hat. Sie steht hier,
   * damit die Benachrichtigung nicht erst durch die Anfragen suchen muss, wem der Trichter
   * gehört — und sie verlässt den Server nie, genau wie der Schlüssel.
   */
  mail: string;
  /** Der Schlüssel fürs Dashboard. Verlässt den Server nie. */
  schluessel: string;
  /**
   * DER LÖSCHSCHLÜSSEL (Owner 09.09.2026: „fürs Löschen muss er einen Link bekommen").
   *
   * EIN EIGENER, NICHT DER DASHBOARD-SCHLÜSSEL. Löschen können muss er von Anfang an — auch
   * bevor er zahlt, und gerade dann. Hinge es am Dashboard-Schlüssel, wäre „ich will das
   * wieder weghaben" eine kostenpflichtige Handlung. Das wäre nicht nur unanständig, es wäre
   * bei personenbezogenen Daten auch nicht haltbar.
   *
   * ER GEHT MIT DER ERSTEN MAIL HINAUS und steht sonst nirgends — kein Konto, kein Passwort:
   * dieselbe Bauart wie das Dashboard, dieselbe offene Aussage dazu. Wer den Link hat, kann
   * löschen.
   */
  loeschSchluessel: string;
  /**
   * VORSCHAU ODER SCHARF (Owner 09.09.2026: „wenn ich den Tunnel durchgehe, als Zahnarzt,
   * dann bekomme ich den Link dazu zu dem Funnel").
   *
   * DIE ENTSCHEIDUNG DAHINTER: Der Link entsteht SOFORT und die Seite ist offen — sonst
   * wäre er ein Versprechen statt eines Beweises, und genau der Beweis ist das Produkt.
   * Was in der Vorschau NICHT läuft, ist der letzte Schritt: keine Namen, keine
   * Telefonnummern. Er sieht exakt, was sein Patient sieht; nur hinterlässt niemand Daten,
   * die nirgends ankommen. Das wäre der eine unehrliche Weg gewesen.
   *
   * Die 299 machen ihn scharf: eigener Name in der Adresse, seine Pflichtangaben, das
   * Dashboard, und die Anfragen laufen.
   */
  /**
   * WEITERE HOOKS, die er selbst geschrieben hat (Owner 09.09.2026: „dort sehe ich meine
   * Bilder, dort kann ich weitere generieren").
   *
   * NUR DER SATZ WIRD GESPEICHERT, nicht das Bild: Das Bild entsteht in einer Zehntelsekunde
   * aus dem Satz (`hookBild`, reine Schrift auf Fläche) — es abzulegen hiesse, dieselbe
   * Sache zweimal zu haben und beim nächsten Gestaltungswechsel alte Bilder im Fach zu
   * finden. Der Satz ist die Quelle, das Bild die Ausgabe.
   *
   * Optional, damit bestehende Mandanten-Dateien ohne dieses Feld weiter gelesen werden.
   */
  hooks?: string[];
  /**
   * DIE ANGABEN ZU SEINEN WERKEN (Owner 10.09.2026: „der Künstler möchte noch etwas hinschreiben,
   * wie Titel, Technik, Größe, Künstlername, Datum"). Schlüssel wie die Kacheln seiner Seite:
   * „standard" = das Bild mit seinem eigenen Spruch, „0" … „3" = hooks[i].
   */
  werkInfo?: Record<string, WerkInfo>;
  /** Der Preis, den er im Gespräch genannt hat — für den Owner und den Agenten, nicht auf der Seite. */
  preis?: string;
  /**
   * WAS ER FÜR SEINE WERKE VERLANGT — EIN SATZ, AN JEDEM BILD (Owner 12.09.2026: „es wird nur
   * generell erscheinen was der künstler für seine werke verlangt bei jedem bild" · „„400€-1300€.
   * Preis auf Anfrage" so soll es stehen").
   *
   * Hier steht nur SEINE Spanne („400€-1300€"); „Preis auf Anfrage" hängt die Seite in der Sprache
   * des Betrachters an — sonst läse ein rumänischer Käufer einen deutschen Satz. Leer heisst: nur
   * „Preis auf Anfrage". Einen Preis JE WERK gibt es nicht mehr (die alten Werte bleiben in
   * `WerkInfo.preis` liegen, werden aber nicht mehr gefragt und nicht mehr gezeigt).
   */
  preisSpanne?: string;
  /**
   * SEINE SEITE WIRD GERADE GEBAUT (Owner 12.09.2026: „kann ich nicht einfach ihm sofort die
   * Seite geben und falls er draufgeht steht, es wird gerade hochgeladen?").
   *
   * Gesetzt in dem Augenblick, in dem sein Konto entsteht, und wieder entfernt, sobald Bilder
   * und Sprüche fertig im Hintergrund geschrieben sind. Solange es steht, sagt seine Seite das
   * auch — statt leer auszusehen, als wäre etwas schiefgegangen. Ein Zeitstempel und kein
   * Ja/Nein, damit man sieht, ob es hängt.
   */
  aufbauSeit?: string;
  /**
   * REPRODUKTION EINES GEMEINFREIEN WERKS (Owner 15.09.2026) — kein lebender Künstler, sondern
   * Van Gogh, Vermeer, Hokusai. Der Agent fragt dann nach Material und Größe, weil es nichts
   * Einmaliges zu kaufen gibt, sondern einen Druck.
   */
  reproduktion?: boolean;
  /**
   * SEINE WERKE WERDEN ALS POSTER VIU ANGEBOTEN (Owner 15.09.2026: „jetzt machst du die werke
   * von szidonia und gerry louisett auch unter der kategorie").
   *
   * NICHT DASSELBE WIE `reproduktion`: Dort geht es um gemeinfreie Meister, deren Originale in
   * Museen hängen — deshalb steht dort „Imagine: domeniu public" und der Hinweis aufs Museum.
   * Hier gehört das Werk dem Künstler selbst; diese Zeilen wären schlicht falsch.
   *
   * NUR MIT SEINER ZUSTIMMUNG (Memory `reproduktionen-und-prints-lebende-kuenstler`): Für Fremde
   * wird dieses Feld erst gesetzt, wenn der Owner sie gefragt hat.
   */
  posterViu?: boolean;
  /**
   * Sein Stil als Rezept (siehe `StilRezept`) — die Vorlage für erzeugte Porträts „im Stil von".
   * Fehlt sie, bietet seine Seite keine Porträts an; erfunden wird nichts.
   */
  stil?: { werk: string; text: string };
  /**
   * LEBENSDATEN (15.09.2026, Video Poster) — „1853 – 1890". Nur bei den gemeinfreien Meistern
   * gesetzt; bei einem lebenden Künstler wäre die Zeile makaber.
   */
  leben?: string;
  /** Über mich — sein Text auf seiner Seite (Owner 11.09.2026: „Text über sich"). */
  ueberMich?: string;
  /** Was er vor der Kamera sagt (Owner 18.09.2026) — Vorschlag von uns, Text von ihm. */
  stimmeSkript?: string;
  /**
   * WIE UND WAS ER MALT — aus der Bildanalyse erzeugt (Owner 13.09.2026: „du beschreibst wie er
   * malt, was er malt" · „auch bei den jetzigen, die nichts haben"), in `lib/kuenstler-profil.ts`.
   *
   * BEWUSST NICHT `ueberMich`: Das ist SEIN Text in der Ich-Form. Dieses Feld steht in der
   * dritten Person und spricht über das WERK — alles darin ist aus `werkBefunde` belegt. Gezeigt
   * wird es nur, solange er selbst nichts geschrieben hat; sein eigener Text schlägt es immer.
   */
  werkBeschreibung?: string;
  /** Ob er ein Künstlerfoto hochgeladen hat — die Datei liegt als Motiv „profil" (Seite bearbeiten). */
  profilBild?: boolean;
  /**
   * ── SEINE SOZIALEN ADRESSEN (Owner 13.09.2026: „Feld für Instagram oder Facebook … kann er
   * eintragen") ────────────────────────────────────────────────────────────────────────────────
   *
   * Gepflegt in „Seite bearbeiten", nicht in den Einstellungen: Dort stehen Impressum und
   * Datenschutz für BETRIEBE — ein Künstler hat beides nicht, seine Rechtstexte stellt das
   * Portal. Er pflegt Name, Ort, Preis und Text ohnehin im Formular; dorthin gehören auch diese
   * zwei.
   *
   * IMMER ALS VOLLE ADRESSE GESPEICHERT. Eingetippt wird oft nur „@name" oder „name" — daraus
   * macht `app/api/portal-profil` eine gültige Adresse, statt sie abzuweisen.
   */
  instagram?: string;
  facebook?: string;
  /** Die Kacheln, die er auf „Seite bearbeiten" hat (-1 = Standard) — auch die ohne Spruch, sonst verschwänden sie beim nächsten Öffnen. */
  werkNummern?: number[];
  /**
   * WANN SEINE FOLLOWER ZULETZT POST BEKAMEN — die Bremse (Owner 13.09.2026, Follow-Mail bauen).
   *
   * Ein Künstler, der zehn Werke hochlädt, speichert dabei mehrmals. Ohne diese Marke ginge bei
   * jedem Speichern eine Mail an jeden Follower — zehn Mails an denselben Menschen in zwanzig
   * Minuten. Das ist der schnellste Weg in den Spam-Ordner, und zwar nicht nur für diese Mails:
   * Eine Domain, die so verschickt, stellt danach auch die Bestätigungslinks der Künstler nicht
   * mehr zu.
   *
   * HÖCHSTENS EINE MAIL JE KÜNSTLER UND TAG. Was er in der Zwischenzeit noch hinzufügt, sehen
   * seine Follower beim nächsten Mal — oder auf seiner Seite, die ohnehin verlinkt ist.
   */
  folgenMailAm?: string;
  /** Die Bildanalyse je Kachel („standard", „0" …), beim Abschluss gespeichert — Stoff für seinen verkaufenden Agenten. */
  werkBefunde?: Record<string, { stil?: string; motiv?: string; szene?: string; erinnertAn?: string; selten?: string; merkmale?: string[] }>;
  stand: "vorschau" | "scharf";
  /**
   * FREIGABE DURCH DEN OWNER (Owner 10.09.2026, Variante B: „nach Freigabe, Ziel innerhalb von
   * 3 Tagen" — nach dem Vorbild Artsy).
   *
   * EINE EIGENE ACHSE NEBEN `stand`: `stand` sagt, ob bezahlt ist; `freigabe`, ob die Seite
   * öffentlich sein darf. Ein Künstler kann freigegeben sein, ohne zu zahlen — und umgekehrt
   * darf Geld allein niemanden online bringen.
   *
   * FEHLT DAS FELD, GILT „frei": Alle Einträge von vor diesem Tag (Zahnarzt, Atelier) waren
   * öffentlich und bleiben es. Nur neue Künstler aus dem Kunst-Rezept starten als „offen".
   */
  freigabe?: "offen" | "frei" | "abgelehnt";
  /** Wann der Owner entschieden hat. */
  freigabeAm?: string;
  /**
   * SEIN „JA, INS PORTAL" (Owner 10.09.2026: „Er muss auch seine Zustimmung abgeben"). Nur mit
   * `true` erscheint er in der Übersicht von lakatosbandi.com; seine eigene Seite
   * lakatosbandi.com/{name} hat er nach der Freigabe so oder so. Fehlt es: nicht in der Übersicht.
   */
  portal?: boolean;
  /** Das Art-Marketing-Abo (10 € / Monat) — Regeln in `lib/versusforge-abo.ts`. Fehlt: keins. */
  abo?: { aktiv: boolean; seit?: string; subscription?: string; bis?: string };
  /** Wann er nach dem Abo gefragt wurde (bei der dritten fremden Anfrage). Ab hier läuft die Frist. */
  aboFrageAm?: string;
  angelegt: string;
};

/** Was die öffentliche Seite sehen darf — alles ausser Schlüssel und Plan. */
export type MandantOeffentlich = Omit<MandantAngaben, "schluessel" | "loeschSchluessel" | "plan" | "mail">;

const pfad = (mandant: string) => `versusforge-mandant/${mandantSauber(mandant)}.json`;

/** Das ruhige Blau, wenn der Mandant keine eigene Farbe angegeben hat. */
/**
 * ── SEIN STIL ALS REZEPT (Owner 17.09.2026: „ich habe meine Freundin in meinem Kunststil
 * generiert … hätte ich ein Tool, sieh dich als Poster in Louisett-Stil") ────────────────────
 *
 * Zwei Angaben, mehr braucht es nicht — der Owner hat es selbst vorgemacht: EIN Bild als
 * Vorlage und ein Satz dazu.
 *
 * `stilWerk` ist die Nummer des Werks, das als Vorlage dient („standard" oder „0" … „11").
 * `stilText` beschreibt in Worten, was dieses Bild ausmacht: Farbauftrag, Palette, Kanten,
 * Hintergrund. Ohne den Satz sieht jedes erzeugte Porträt anders aus; das Bild allein trägt zu
 * wenig Anweisung, und ein blosser Stilname („expressiv") wäre ein Filter.
 *
 * DAS KUNDENFOTO LIEFERT NUR DAS GESICHT. Stil kommt immer von hier.
 */
export type StilRezept = { werk: string; text: string };

export const AKZENT_STANDARD = "#1d6fd0";

export async function mandantLesen(mandantRoh: string): Promise<MandantAngaben | null> {
  const mandant = mandantSauber(mandantRoh);
  /* Der eigene Mandant hat keine Datei — wir sind die Wurzel, nicht ein Eintrag. */
  /**
   * VERSUSFORGE IST MANDANT NUMMER EINS (Owner 09.09.2026: „wo ist mein Dashboard?" · „der
   * müsste doch genauso aussehen") — [[mein-trichter-ist-ihr-trichter]].
   *
   * HIER STAND `mandant === EIGENER_MANDANT → null` mit der Begründung „wir sind die Wurzel,
   * nicht ein Eintrag". Das war der Satz, der ihm sein eigenes Dashboard verwehrt hat: Ohne
   * Datei kein Mandant, ohne Mandant kein Schlüssel, ohne Schlüssel keine Seite. Und ein
   * zweites, eigenes Dashboard danebenzubauen wäre genau das, was die Hausregel verbietet.
   *
   * DIE ANDEREN GESPERRTEN NAMEN BLEIBEN GESPERRT: `engine`, `about`, `themes` tragen echte
   * Seiten, dort kann es keinen Mandanten geben.
   */
  if (!mandant || (GESPERRTE_NAMEN.has(mandant) && mandant !== EIGENER_MANDANT)) return null;
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(mandant))}`);
  if (!res.ok) return null;
  try {
    return (await res.json()) as MandantAngaben;
  } catch {
    return null;
  }
}

/**
 * Für die öffentliche Seite. Schlüssel und Plan bleiben auf dem Server — sonst stünde der
 * Dashboard-Schlüssel im Quelltext jeder Trichterseite.
 */
export async function mandantOeffentlich(mandantRoh: string): Promise<MandantOeffentlich | null> {
  const m = await mandantLesen(mandantRoh);
  if (!m) return null;
  const { schluessel: _s, loeschSchluessel: _l, plan: _p, mail: _m, ...rest } = m;
  return rest;
}

export async function mandantSpeichern(mandantRoh: string, angaben: MandantAngaben): Promise<boolean> {
  const mandant = mandantSauber(mandantRoh);
  if (!mandant || (GESPERRTE_NAMEN.has(mandant) && mandant !== EIGENER_MANDANT)) return false;
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(mandant))}`, {
    method: "POST",
    /**
     * `cache-control` GEHÖRT DAZU (14.09.2026): Ohne diesen Kopf legt die Ablage die Datei hinter
     * einen Zwischenspeicher, und wer unmittelbar nach dem Schreiben liest, bekommt die ALTE
     * Fassung zurück — ohne Fehler, ohne Hinweis.
     *
     * Gemessen an diesem Tag: Ein frisch geschriebenes Abo las sich Sekunden später als `null`
     * zurück und war doch da. Dasselbe trifft jeden Künstler, der speichert und seine Seite neu
     * lädt. Die übrigen Schreibwege im Haus setzen den Kopf längst.
     */
    headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
    body: JSON.stringify(angaben),
  });
  if (!res.ok) console.error("[versusforge] Mandant NICHT gespeichert:", res.status, await res.text().catch(() => ""));
  return res.ok;
}


/**
 * EINEN NEUEN MANDANTEN ANLEGEN — NIE ÜBERSCHREIBEN (Owner 11.09.2026: „hier musst du ihm eine
 * Adresse generieren, die nicht existiert … also ja nicht eine andere überschreiben").
 *
 * `freierName` prüft vorher, ob es die Adresse gibt — aber es liest, und jeder Lesefehler zählte
 * als „frei". Zusammen mit `x-upsert: true` hätte eine haken­de Ablage einen bestehenden Künstler
 * überschrieben, ebenso zwei gleichnamige Anmeldungen in derselben Sekunde. Hier legt die ABLAGE
 * selbst fest, ob die Datei neu ist: `x-upsert: false`, und bei „gibt es schon" die nächste Adresse.
 */
export async function mandantAnlegen(wunsch: string, angaben: MandantAngaben): Promise<string | null> {
  const basis = mandantSauber(wunsch) || "kuenstler";
  for (let i = 0; i < 40; i++) {
    const kandidat = i === 0 ? basis : `${basis}-${i + 1}`;
    if (GESPERRTE_NAMEN.has(kandidat)) continue;
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(kandidat))}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-upsert": "false" },
      body: JSON.stringify(angaben),
    });
    if (res.ok) return kandidat;
    const text = await res.text().catch(() => "");
    /* „Gibt es schon" meldet die Ablage als 409 oder als 400 mit „Duplicate" im Text. */
    if (res.status === 409 || /duplicate|already exists/i.test(text)) continue;
    console.error("[versusforge] Mandant NICHT angelegt:", kandidat, res.status, text.slice(0, 200));
    return null;
  }
  return null;
}

/**
 * EIN FREIER NAME FÜR DIE ADRESSE.
 *
 * Erst der Wunschname, dann derselbe mit Zahl. Geprüft wird gegen die Ablage, nicht gegen
 * eine Liste im Kopf: Bei zwei Zahnärzten Peter, die am selben Tag durch den Trichter gehen,
 * würde eine Liste im Speicher die zweite Datei über die erste legen.
 */
export async function freierName(wunsch: string): Promise<string> {
  const basis = mandantSauber(wunsch) || "trichter";
  for (let i = 0; i < 40; i++) {
    const kandidat = i === 0 ? basis : `${basis}-${i + 1}`;
    /* Gesperrte Namen überspringen — sie tragen schon eine echte Seite (siehe
       `GESPERRTE_NAMEN`); der Mandant bekäme sonst eine Adresse, die nie ihn zeigt. */
    if (GESPERRTE_NAMEN.has(kandidat)) continue;
    if (!(await mandantLesen(kandidat))) return kandidat;
  }
  /* Nach vierzig Versuchen nicht endlos weiter — ein Zufallsschwanz beendet es sicher. */
  return `${basis}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * DIE ANGABEN AUS DEM PLAN ABLEITEN — nicht abtippen.
 *
 * Alles, was auf seiner Seite steht, hat die Maschine schon erzeugt: der Hook ist sein Hook,
 * die Karten sind die Fälle aus seiner Zielgruppe. Was der Plan NICHT hergibt (Impressum,
 * Logo, Farbe), bleibt leer und wird beim Freischalten von ihm ergänzt — nichts wird
 * erfunden.
 */
/**
 * DIE VORGABEN JE SPRACHE — was auf seiner Seite steht, solange er nichts eigenes setzt.
 *
 * SIE SIND VON HAND GESCHRIEBEN, NICHT ÜBERSETZT. Es sind fünf kurze Zeilen, sie stehen auf
 * der Seite, die seine Kunden sehen, und sie entstehen in dem Moment, in dem der Trichter
 * angelegt wird — ein Übersetzungsaufruf mitten im Anlegen wäre eine Wartezeit und eine
 * Fehlerquelle für einen Text, der sich nie ändert.
 *
 * SIE SIEZEN. Das ist der eine Ort im Haus, an dem die Hausregel „immer duzen" nicht gilt:
 * Hier spricht nicht VersusForge, hier spricht der Zahnarzt mit seinem Patienten.
 */
/**
 * ── DER VORGABESATZ IST KEIN SPRUCH (Owner 14.09.2026) ──────────────────────────────────────
 *
 * `mandantAusPlan` setzt `hook || V.hook` — fehlt der Spruch, steht dort der Vorgabetext
 * („Spuneți-ne despre ce este vorba."). Für den Nachtrag im Hintergrund
 * (`spruecheNachtragen`) sah das aus wie ein vorhandener Satz, und das erste Werk wurde
 * übersprungen. Bei Künstlern mit nur EINEM Werk blieb damit alles beim Platzhalter — unter
 * einem Gemälde stand ein gesiezter Formularsatz aus dem Firmen-Trichter.
 *
 * Wer prüft, ob ein Werk noch einen Satz braucht, fragt hier.
 */
export const istVorgabeHook = (s: unknown): boolean => {
  const t = String(s ?? "").trim();
  return !!t && Object.values(MANDANT_VORGABE).some(v => v.hook === t);
};

const MANDANT_VORGABE: Record<string, { hook: string; unterzeile: string; karte: string; knopf: string; fein: string }> = {
  de: {
    hook: "Sagen Sie uns, worum es geht.",
    unterzeile: "Beantworten Sie ein paar kurze Fragen. Danach wissen Sie, welche Möglichkeiten es in Ihrem Fall gibt.",
    karte: "Ich möchte mehr wissen",
    knopf: "Jetzt starten",
    fein: "Kostenlos · dauert etwa zwei Minuten",
  },
  en: {
    hook: "Tell us what this is about.",
    unterzeile: "Answer a few short questions. Then you will know which options exist in your case.",
    karte: "I would like to know more",
    knopf: "Start now",
    fein: "Free · takes about two minutes",
  },
  ro: {
    hook: "Spuneți-ne despre ce este vorba.",
    unterzeile: "Răspundeți la câteva întrebări scurte. Apoi veți ști ce posibilități există în cazul dumneavoastră.",
    karte: "Aș vrea să știu mai multe",
    knopf: "Începeți acum",
    fein: "Gratuit · durează aproximativ două minute",
  },
};

export function mandantAusPlan(o: {
  name: string;
  mail: string;
  /** Seine Website — seit dem 09.09.2026 fragt der Trichter im zweiten Schritt danach. */
  webUrl?: string;
  plan: { hook?: string; karten?: string[]; zielgruppe?: string[]; trichter?: string[] } & Record<string, unknown>;
  schluessel: string;
  loeschSchluessel: string;
  /** Die Sprache, in der er mit uns geredet hat. Ohne Angabe Deutsch. */
  sprache?: string;
  /** Sein Gerät — damit sein eigener Testlauf später erkennbar ist. */
  geraet?: string;
}): MandantAngaben {
  const plan = o.plan ?? {};
  const sprache = String(o.sprache ?? "de").slice(0, 2).toLowerCase();
  const V = MANDANT_VORGABE[sprache] ?? MANDANT_VORGABE.de;
  const hook = String(plan.hook ?? "").trim();
  /* Die Karten aus der Zielgruppe: kurze, antippbare Sätze. Was zu lang ist, taugt nicht
     als Karte — lieber drei kurze als vier, von denen eine umbricht. */
  /**
   * DIE KARTEN KOMMEN AUS `karten`, NICHT AUS `zielgruppe` (09.09.2026, im Prüflauf gesehen:
   * auf der Seite eines Künstlers stand „Deutschland, Österreich, Schweiz, deutschsprachig"
   * als antippbare Karte).
   *
   * Die Zielgruppe beschreibt, wen die ANZEIGE erreichen soll — eine Einstellung für den
   * Werbeanzeigenmanager. Die Karten sind Sätze, die sein KUNDE über sich antippt. Bei
   * älteren Plänen gibt es `karten` noch nicht; dort greift die Zielgruppe als Rückfall,
   * damit keine Seite ohne Karten dasteht.
   */
  const karten = (Array.isArray(plan.karten) && plan.karten.length ? plan.karten : Array.isArray(plan.zielgruppe) ? plan.zielgruppe : [])
    .map(z => String(z ?? "").trim())
    .filter(z => z && z.length <= 60)
    .slice(0, 4);

  return {
    name: o.name,
    ort: "",
    adresse: "",
    telefon: "",
    /* SEINE WEBSITE STEHT SCHON DA (09.09.2026): Er hat sie im zweiten Schritt des
       Trichters genannt. Sie hier zu verwerfen und ihn im Einrichten noch einmal danach zu
       fragen wäre dieselbe Zumutung wie der doppelte Hook. Adresse und Telefonnummer
       bleiben leer — die kennt der Plan nicht, und geraten wird nichts. */
    webUrl: o.webUrl ?? "",
    sprache,
    geraet: o.geraet ?? "",
    hook: hook || V.hook,
    unterzeile: V.unterzeile,
    karten: karten.length ? karten : [V.karte],
    knopf: V.knopf,
    fein: V.fein,
    ergebnisTitel: "",
    ergebnisText: "",
    aboutUrl: "",
    impressumUrl: "",
    datenschutzUrl: "",
    farbe: "",
    logoUrl: "",
    plan: o.plan,
    mail: o.mail,
    schluessel: o.schluessel,
    loeschSchluessel: o.loeschSchluessel,
    stand: "vorschau",
    angelegt: new Date().toISOString(),
  };
}


/**
 * ALLES VON IHM LÖSCHEN — der Eintrag, die Anfragen, seine Bilder und die Besucherschritte.
 *
 * BEIDES ODER NICHTS, und in dieser Reihenfolge: Erst die Anfragen (das sind die Daten
 * anderer Menschen, sie wiegen schwerer), dann sein eigener Eintrag. Bliebe der Eintrag
 * stehen, sammelte der Trichter weiter; blieben die Anfragen stehen, lägen fremde
 * Telefonnummern in einem Fach, das niemandem mehr gehört.
 *
 * `false` heisst „nicht vollständig gelöscht" — dann wird dem Menschen NICHT gesagt, es sei
 * erledigt. Ein falsches Häkchen ist hier schlimmer als eine ehrliche Fehlermeldung.
 */
export async function mandantLoeschen(mandantRoh: string): Promise<boolean> {
  const mandant = mandantSauber(mandantRoh);
  if (!mandant || (GESPERRTE_NAMEN.has(mandant) && mandant !== EIGENER_MANDANT)) return false;

  /* ALLES HEISST ALLES (Owner 11.09.2026): Die Begrüssung verspricht „ein Link, mit dem du alles wieder löschst" —
     vorher blieben seine Bilder (Werke, Profilfoto, Bilder in Prüfung) und die Besucherschritte liegen.
     Ist eine Liste nicht lesbar, wird NICHT gelöscht und `false` gemeldet: lieber ehrlich scheitern als halb löschen. */
  const dateienUnter = async (ordner: string): Promise<string[] | null> => {
    const liste = await supabaseFetch(`/storage/v1/object/list/${BUCKET}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: ordner, limit: 1000 }),
    });
    if (!liste.ok) return null;
    const dateien = (await liste.json().catch(() => [])) as { id?: string | null; name?: string }[];
    return (Array.isArray(dateien) ? dateien : [])
      .filter(d => d?.id && d?.name)
      .map(d => `${ordner}${String(d.name)}`);
  };
  const ordner = [
    `versusforge-lead/${mandant}/`,
    `versusforge-motiv/${mandant}/`,
    `versusforge-motiv-pruefung/${mandant}/`,
    `versusforge-schritt/${mandant}/`,
    /* Die Marken „schon gemeldet" der Interesse-Mails (lib/versusforge-besuch-post.ts). */
    `versusforge-interesse/${mandant}/`,
  ];
  const gefunden = await Promise.all(ordner.map(dateienUnter));
  if (gefunden.some(g => g === null)) {
    console.error("[versusforge] Löschen abgebrochen: Liste nicht lesbar", mandant);
    return false;
  }
  const pfade = gefunden.flatMap(g => g ?? []);
  pfade.push(pfad(mandant), `versusforge-gesehen/${mandant}.json`);
  /* Was sein Agent zu den Werken gespeichert hat, gehört auch dazu. */
  const intro = await supabaseFetch(`/storage/v1/object/list/${BUCKET}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: `versusforge-agent-intro/${mandant}/`, limit: 1000 }),
  });
  if (intro.ok) {
    for (const d of (await intro.json().catch(() => [])) as { id?: string | null; name?: string }[]) {
      if (d?.id && d?.name) pfade.push(`versusforge-agent-intro/${mandant}/${d.name}`);
    }
  }

  const weg = await supabaseFetch(`/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: pfade }),
  });
  if (!weg.ok) console.error("[versusforge] Löschen fehlgeschlagen:", weg.status, await weg.text().catch(() => ""));
  return weg.ok;
}
