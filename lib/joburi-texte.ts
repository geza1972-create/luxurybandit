/**
 * DIE TEXTE DES JOBURI-TRICHTERS — RUMÄNISCH IST DIE QUELLE, NICHT DIE ÜBERSETZUNG
 * (Owner 31.08.2026: „Rumänisch direkt im Code. Keine Runtime-Übersetzung. Einverstanden.").
 *
 * WARUM NICHT WIE ÜBERALL SONST: Der Rest des Hauses übersetzt zur Laufzeit mit Dauer-Cache.
 * Der ERSTE Aufruf je Sprache dauert damit 26 bis 44 Sekunden — für einen Trichter, der von
 * einer Meta-Anzeige gefüttert wird, ist das tödlich: Der erste rumänische Besucher sähe eine
 * halbe Minute nichts, und für den hat die Anzeige schon bezahlt.
 *
 * Deutsch steht hier als zweite STATISCHE Fassung, falls derselbe Trichter später in
 * Deutschland läuft. Keine KI-Übersetzung während der Sitzung, in keiner Richtung.
 */

/* Ohne `as const` bei den Werten: Sonst wäre jeder rumänische Satz sein EIGENER Typ, und
   die deutsche Fassung passte in keinen davon (TS2322). Der Typ soll die SCHLÜSSEL festlegen,
   nicht die Sätze. */
export type JoburiTexte = Record<keyof typeof RO, string>;

export const RO = {
  /* ── Der Kopf ── */

  /* ── Die drei Fragen ── */
  frage1: "Ce nivel de germană ai?",
  frage1Hinweis: "Alege nivelul care ți se potrivește cel mai bine.",
  /**
   * DIE VIERTE FRAGE IST DER KENNWERT FÜR DIE FIRMENSEITE (Owner 31.08.2026: „Das ist später
   * ein zentraler KPI, weil wir gegenüber Recruitern zeigen wollen, dass wir auch Kandidaten
   * erreichen, die nicht aktiv auf Jobportalen suchen.").
   *
   * Für den Bewerber ist sie harmlos — ein Klick, keine Angabe über ihn. Für die Akquise ist
   * sie das Einzige, was ein Jobportal NICHT vorzeigen kann: Wer dort steht, sucht per
   * Definition aktiv. Die zweite und dritte Antwort sind deshalb die wertvollen.
   */
  frage4: "Cauți activ un job în acest moment?",

  niveauA2: "A2 — începător",
  niveauB1: "B1",
  niveauB2: "B2",
  niveauC1: "C1",
  niveauC2: "C2 / fluent",



  sucheAktiv: "Da, caut activ",
  sucheOffen: "Mă uit doar la oportunități",
  suchePassiv: "Nu, dar aș schimba pentru oferta potrivită",


  /* ── TALENT MARKET PULSE (Owner 31.08.2026) ──
     Nicht mehr „hier sind Stellen", sondern „sag uns, was dich bewegen würde". Der Trichter
     verspricht damit nichts, was der Bestand halten müsste — und fragt genau das, was kein
     Jobportal weiss. */
  studieKicker: "STUDIU · LIMBA GERMANĂ PE PIAȚA MUNCII",

  /* ══ TALENT NETWORK — DIE ACHT SCHRITTE (Owner 31.08.2026, Freigabe) ══
     Der Kern heisst ab jetzt nicht mehr „welchen Job suchst du", sondern „was müsste ein
     Arbeitgeber bieten, damit du deinen jetzigen verlässt". Die Texte sprechen deshalb
     jemanden an, der NICHT sucht — 55 % der bisherigen Antworten kommen von genau dort. */
  tnKicker: "REȚEA PRIVATĂ DE TALENTE · GERMANĂ",
  tnTitel: "Ai deja un job.",
  tnTitelZwei: "Dar poate nu la prețul potrivit.",
  tnUnter: "Spune-ne o singură dată ce știi să faci și ce ar trebui să ofere o poziție nouă. Dacă apare ceva cu adevărat potrivit, te anunțăm.",
  tnDauer: "9 întrebări · fără CV, fără nume",
  tnStart: "Află-ți condițiile de schimbare",

  tnBeruf: "Ce meserie ai?",
  tnBerufHinweis: "Scrie exact, așa cum ai spune unui prieten.",
  tnBerufPlatz: "ex. dezvoltator frontend, suport IT",

  tnDeutsch: "Ce limbi vorbești?",
  tnSprachePlatz: "ex. germană",
  niveauNative: "Limbă maternă",

  tnStandort: "Unde locuiești și lucrezi?",
  tnStadt: "Orașul",
  tnStadtPlatz: "ex. Berlin",

  tnSituation: "Care e situația ta acum?",
  sitZufrieden: "Am un job și sunt mulțumit",
  sitOffen: "Am un job, dar aș fi deschis la ceva mai bun",
  sitAktiv: "Caut activ",
  sitOhne: "Momentan nu am job",
  sitSelbst: "Sunt pe cont propriu",
  sitAndere: "Altă situație",

  tnMotive: "Ce ar trebui să facă mai bine un job nou?",
  tnMotiveHinweis: "Alege tot ce contează pentru tine.",
  mSalariu: "Salariu mai bun", mAngajator: "Angajator mai bun", mConducere: "Conducere mai bună",
  mStres: "Mai puțin stres", mProgram: "Program mai bun", mRemote: "Remote",
  mPozitie: "Poziție mai bună", mActivitate: "Activitate mai interesantă", mCariera: "Carieră",
  mCultura: "Cultură de companie", mSiguranta: "Siguranță", mGermania: "Germania / internațional",
  mBeneficii: "Beneficii", mAltele: "Altceva",

  tnGeld: "Ce ar trebui să se schimbe financiar?",
  tnGeldJetzt: "Acum câștig net",
  tnGeldMin: "Ce salariu net ar trebui să aibă o ofertă ca să o iau în serios?",
  tnGeldHinweis: "Rămâne confidențial. Salariul actual nu ajunge niciodată la un angajator.",
  tnGleich: "Ai schimba și pentru cam același salariu, dacă alte condiții ar fi mult mai bune?",
  gleichJa: "Da",
  gleichVielleicht: "Depinde de condiții",
  gleichNein: "Nu, financiar trebuie să fie mai bine",
  sprungPlus: "în plus",
  sprungGleich: "Același salariu — contează condițiile",
  sprungWeniger: "Și pentru mai puțin, dacă se potrivesc condițiile",

  tnMaerkte: "Unde ar intra în discuție o ofertă cu adevărat bună?",
  tnMaerkteHinweis: "Poți alege mai multe.",
  marktRo: "România", marktDe: "Germania", marktRemote: "Complet remote",
  marktEu: "Altă țară din UE", marktUmzug: "Mutare în România", marktKeinUmzug: "Nu vreau să mă mut",
  marktLandLabel: "Adaugă o țară", marktLandPlatz: "ex. Germania",

  /* SCHICHT, STEHEN, KÖRPERLICHE ARBEIT (Owner 31.08.2026). Für Pflege, Produktion und
     Logistik — genau die Bereiche, in denen Deutschland sucht — sagen diese vier Kreuze mehr
     als jedes Zertifikat. NICHT gefragt wird nach Gesundheit: Das wären besondere Daten nach
     Artikel 9 DSGVO, sie bräuchten eine eigene Einwilligung, und ein Arbeitgeber, der sie
     erhält, stünde im AGG-Risiko. Wer Nachtschicht und acht Stunden Stehen ankreuzt, hat die
     Frage ohnehin beantwortet — und niemand musste eine Diagnose preisgeben. */
  tnBelastung: "Ce ar intra în discuție pentru tine?",
  tnBelastungHinweis: "Alege ce ți se potrivește. Dacă nu se potrivește niciuna, treci mai departe.",
  belSchicht: "Lucru în ture, inclusiv noaptea și în weekend",
  belStehen: "Lucru în picioare, peste opt ore",
  belKoerper: "Muncă fizică solicitantă",
  belErfahrung: "Am deja experiență cu munca fizică",

  /* DIE OFFENEN RÜCKFRAGEN (Owner 31.08.2026: „Nicht ‚Das passt nicht zusammen', sondern
     etwas wie: ‚Was würde für dich weniger Stress bedeuten?'"). Eine prüfende Frage erzeugt
     eine Rechtfertigung, eine offene erzeugt eine Antwort — und die Antworten sind das, was
     später eine Firma kauft. */
  klaerTitel: "O singură întrebare deschisă",
  klaerHinweis: "Poți sări peste — dar răspunsul tău ne ajută să găsim ceva care chiar ți se potrivește.",
  klaerStress: "Ce ar însemna pentru tine mai puțin stres la muncă?",
  klaerGeld: "Ce ar conta pentru tine mai mult decât salariul?",
  klaerGespraech: "Ce ar trebui să se întâmple ca o discuție să merite pentru tine?",
  klaerPlatz: "Scrie liber, câteva cuvinte ajung.",
  klaerUeberspringen: "Sar peste",

  tnGespraech: "Dacă un angajator ar îndeplini exact aceste condiții — ai vorbi cu el?",
  gesprJa: "Da", gesprWahrsch: "Probabil", gesprViell: "Poate", gesprNein: "Momentan mai degrabă nu",

  tnSummeTitel: "CONDIȚIILE TALE DE SCHIMBARE",
  tnSummeBeruf: "Meserie", tnSummeDeutsch: "Germană", tnSummeOrt: "Locație",
  tnSummeSituation: "Situație", tnSummeMotive: "Contează", tnSummeGeld: "Financiar",
  tnSummeMaerkte: "Piețe", tnSummeBelastung: "Disponibilitate", tnSummeGespraech: "Discuție",
  tnSummeSchluss: "Exact după astfel de oferte putem fi atenți pentru tine.",
  tnSummeKnopf: "Contactați-mă doar pentru oferte potrivite",
  studieTitel: "Vorbești germană?",
  studieTitelZwei: "Pentru ce salariu ai schimba jobul?",
  studieUnter: "Spune-ne ce ofertă te-ar face să iei în calcul o schimbare. Vrem să aflăm cât valorează în realitate limba germană pe piața muncii din România.",
  studieDauer: "9 întrebări · fără nume, fără CV",

  fLand: "În ce țară lucrezi acum?",
  landRo: "România", landDe: "Germania", landAt: "Austria", landAlta: "Altă țară",


  /* DAS ALTER (Owner 31.08.2026, nach dem Blick in die Anzeigen-Aufschlüsselung: über die
     Hälfte der bezahlten Reichweite war 55+). Ohne diese Antwort lässt sich nie belegen, ob
     eine Altersgrenze in der Anzeige Geld spart oder gute Leute wegwirft — die Entscheidung
     fiel bisher auf Metas Reichweitenzahl, also auf eine Vermutung. Als Spanne, nicht als
     Geburtsjahr: ein Jahr tippt niemand, eine Kachel tippt fast jeder. */
  fAlter: "Ce vârstă ai?",
  fAlterHinweis: "Rămâne anonim.",
  alterU25: "sub 25 de ani", alter2534: "25–34 de ani", alter3544: "35–44 de ani",
  alter4554: "45–54 de ani", alter55p: "55 de ani sau peste",

  /* DAS HEUTIGE GEHALT — DIE FRAGE GEGEN DAS TRÄUMEN (Owner 31.08.2026: „ich muss sie auch
     fragen wieviel sie jetzt verdienen, weil sie sonst träumen").
     Allein steht „ich wechsle ab 2.000 €" für nichts: Es kann ein realistischer Schritt sein
     oder eine Fantasie. Erst die DIFFERENZ zum heutigen Gehalt ist die Zahl, die ein
     Recruiter kaufen würde.
     DIE STUFEN HÄNGEN AM WOHNLAND (Owner: „hier lügen sie alle. Wenn sie sagen Rumänien und
     sagen sie verdienen 2500, dann ist das eine Lüge"). Wer in Rumänien lebt, bekommt
     rumänische Spannen zu sehen — dort ist die höchste Stufe „über 1.600 €" und nicht
     „über 3.800 €". Übertreiben kann man dann höchstens um eine Stufe statt um drei. */
  fJetzt: "Cât câștigi acum, net pe lună?",
  fJetztKurz: "Acum câștig", fGehaltKurz: "Aș schimba de la", sprungHinweis: "diferența",
  gehaltSpanne: "Scrie o sumă între 100 și 20.000 €.",
  fGehaltBeide: "Cât câștigi acum — și pentru ce ai schimba?",
  fJetztHinweis: "Rămâne anonim. Fără această cifră, studiul nu spune nimic.",
  stufe0: "sub 800 €", stufe800: "800–1.200 €", stufe1200: "1.200–1.600 €",
  stufe1600: "1.600–2.000 €", stufe2000: "2.000–2.500 €", stufe2500: "2.500–3.000 €",
  stufe3000: "peste 3.000 €",

  fGehalt: "De la ce salariu net ai lua în calcul o schimbare?",
  fGehaltHinweis: "Net, pe lună. Alege pragul de la care merită să discuți.",
  gehalt800: "de la 800 €", gehalt1200: "de la 1.200 €", gehalt1600: "de la 1.600 €",
  gehalt2000: "de la 2.000 €", gehalt2500: "de la 2.500 €", gehalt3000: "peste 3.000 €",

  fFaktoren: "Ce contează cel mai mult pentru tine?",
  fFaktorenHinweis: "Poți alege mai multe.",
  faktorSalariu: "Salariul", faktorRemote: "Remote", faktorFlex: "Program flexibil",
  faktorCariera: "Carieră", faktorStabil: "Stabilitate", faktorEchipa: "Echipă și cultură",
  weiter: "Continuă",

  fRueckkehr: "Te-ai întoarce în România pentru jobul potrivit?",
  rueckDa: "Da", rueckPoate: "Poate", rueckNu: "Nu",

  fBerufsfeld: "Ce meserie ai?",
  fBerufHinweis: "Scrie exact, așa cum ai spune unui prieten.",
  fStudii: "Studii",
  studiiWaehlen: "Alege…",
  studiiGimnaziu: "Școală generală", studiiLiceu: "Liceu",
  studiiProfesionala: "Școală profesională", studiiLicenta: "Studii superioare",
  studiiMaster: "Master / doctorat",
  feldSuport: "Suport / servicii clienți", feldIt: "IT", feldFinante: "Finanțe / contabilitate",
  feldLogistica: "Logistică", feldInginerie: "Inginerie / producție", feldVanzari: "Vânzări",
  feldSanatate: "Sănătate / îngrijire", feldAltul: "Alt domeniu",
  feldFreiPlatzhalter: "ex. asistentă medicală, electrician",

  /* ── Die Zusammenfassung: NUR seine eigenen Antworten, kein erfundener Marktwert ── */
  summeTitel: "Asta ne-ai spus",
  summeLand: "Țara", summeDeutsch: "Germană", summeStatus: "Status",
  summeAlter: "Vârstă", summeJetzt: "Acum câștigi", summeGehalt: "Schimbi de la", summeFaktoren: "Contează", summeRueckkehr: "Întoarcere",
  summeFeld: "Domeniu",
  summeHinweis: "Nu îți arătăm cifre de piață — studiul abia se strânge. Primul lucru pe care îl vei vedea sunt rezultatele lui.",

  /* DIE LETZTE SEITE MUSS EINEN GRUND NENNEN, KEINE FRAGE STELLEN (Owner 31.08.2026: „die
     letzte seite ist aber schwach, dafür gibt keiner seine email adresse").
     Vorher stand hier „Willst du die Ergebnisse der Studie?" — eine Frage, auf die jeder mit
     einem Schulterzucken antwortet. 43 von 57 haben genau hier aufgehört.
     JEDER DER DREI GRÜNDE IST WAHR. Der Owner hatte zuerst „wir arbeiten mit Elite-Partnern,
     die in Rumänien Firmen aufbauen" erwogen und im selben Atemzug selbst verworfen: „Nee das
     stimmt nicht, aber wir sind dabei." Genau dieses „wir sind dabei" steht hier — in der
     Zukunftsform, die stimmt. Eine erfundene Partnerschaft wäre nicht nur unlauter, sie wäre
     auch das Erste, was auffliegt, sobald sich der erste Kandidat nach ihr erkundigt.
     Der stärkste Grund ist der erste: Er hat gerade selbst eine Schwelle genannt. Zu erfahren,
     ob sie realistisch ist, will jeder wissen, der sie eingetippt hat. */
  mailStudieTitel: "Pragul tău e realist?",
  mailStudieText: "Ne-ai spus de la ce salariu ai schimba. Îți spunem ce cer în realitate oamenii cu nivelul tău de germană, din domeniul tău — imediat ce studiul e gata.",
  grund1: "Rezultatele îți ajung ție primul, înaintea tuturor.",
  grund2: "Construim acum o rețea de angajatori care caută oameni care vorbesc germană. Când e gata, te întrebăm pe tine — doar dacă vrei.",
  grund3: "Fără nume, fără telefon, fără CV. Doar o adresă.",
  zaehlerText: "Până acum au răspuns {n} de persoane.",
  /* EIGENER KNOPF, NICHT DER ALTE: `mailKnopf` hiess „Arată-mi joburile" — er versprach
     Stellen, die dieser Trichter nicht mehr liefert. Ein Knopf, der etwas anderes zusagt als
     das, was danach kommt, ist der teuerste Fehler auf der ganzen Strecke. */
  studieKnopf: "Vreau rezultatele studiului",
  dankeTitelStudie: "Mulțumim — răspunsul tău e în studiu.",
  dankeTextStudie: "Îți scriem când rezultatele sunt gata, și doar cu oportunități care respectă pragul tău.",

  /* ── Cross-Selling auf der letzten Seite (Owner 31.08.2026) ──
     Wer gerade gesagt hat, zu welchen Bedingungen er wechseln würde, ist an genau dem Punkt,
     an dem ein deutscher Lebenslauf gebraucht wird. Es steht NACH dem Dank, nicht daneben:
     Die Antwort ist gespeichert, hier wird nichts mehr abgefragt — es ist ein Angebot, keine
     zweite Aufforderung im selben Schritt. Und es verspricht nur, was gratis ist. */
  crossTitel: "Ai deja un CV german?",
  crossText: "Încarcă CV-ul tău în orice limbă — primești un CV german, formatat așa cum îl așteaptă angajatorii. Gratuit, cu filigran de probă.",
  crossKnopf: "Fă-mi CV-ul german",

  zurueck: "Înapoi",

  /* ── Der Teaser: echte Stellen, bevor die Adresse fällt ── */
  /**
   * NUR NOCH FÜR DEN LEEREN BESTAND (Owner 31.08.2026: „Kein harter 0-Treffer-Zustand. Der
   * Satz soll nicht der normale Funnelzustand sein.").
   *
   * Seit das Sprachniveau nichts mehr ausschliesst, kann dieser Zustand nur eintreten, wenn
   * gar keine aktive Stelle im Bestand liegt. Der alte Satz („keine passt genau") behauptete
   * das Gegenteil — es klang, als gäbe es Stellen, aber keine für ihn. Jetzt sagt er, was
   * wirklich los ist, und macht trotzdem ein Angebot.
   */

  /**
   * DER HAFTUNGSHINWEIS AN JEDER STELLE (Owner 31.08.2026: „Wir sind bei diesen Stellen noch
   * nicht Recruiter oder Partner des Unternehmens. Die Stelle darf nicht so dargestellt
   * werden, als würde LuxuryBandit im Auftrag der Firma rekrutieren.").
   *
   * Er steht an JEDER Karte, nicht einmal im Fuss: Wer eine Stelle ansieht, muss in dieser
   * Sekunde wissen, mit wem er es zu tun hat — und dass die Bewerbung direkt bei der Firma
   * landet, nicht bei uns.
   */

  /* Die Güte des Treffers — der Bewerber sieht die Stufe, nicht die Punktzahl. */

  /* ── Die Adresse ── */
  mailLabel: "E-mail",
  mailPlatzhalter: "nume@exemplu.ro",
  mailKeinSpam: "Fără spam. Te poți dezabona oricând.",
  mailFehlt: "Adresa aceasta nu pare completă.",
  mailLaeuft: "Un moment…",

  /**
   * DIE EINWILLIGUNG — OHNE PAUSCHALE WEITERGABE (Owner 31.08.2026: „Keine pauschale
   * Weitergabe an Arbeitgeber. Zustimmung pro konkreter Stelle.").
   *
   * Was hier zugestimmt wird, ist AUSSCHLIESSLICH: wir dürfen ihn kontaktieren und ihm
   * Stellen zeigen. Der Satz darunter sagt ausdrücklich, was NICHT passiert — genau die
   * Sorge, mit der jemand seine Adresse zurückhält.
   */
  haken: "Sunt de acord să primesc joburi potrivite pe e-mail.",
  hakenFehlt: "Fără acest acord nu îți pot trimite joburile.",
  datenschutzZusage: "Datele tale nu sunt trimise automat angajatorilor. Tu decizi pentru fiecare oportunitate.",

  /* ── Nach der Adresse: die volle Liste ── */

  /* ── Das Upgrade: erst jetzt der Lebenslauf ── */

  /* ── Die Weitergabe, pro Stelle ── */

  technischerFehler: "Ceva n-a mers la noi — nu la tine. Mai încearcă o dată.",
};

export const DE: JoburiTexte = {

  frage1: "Wie gut ist dein Deutsch?",
  frage1Hinweis: "Wähle das Niveau, das am ehesten passt.",
  frage4: "Suchst du gerade aktiv einen Job?",

  niveauA2: "A2 — Anfänger",
  niveauB1: "B1",
  niveauB2: "B2",
  niveauC1: "C1",
  niveauC2: "C2 / fließend",



  sucheAktiv: "Ja, ich suche aktiv",
  sucheOffen: "Ich schaue mich nur um",
  suchePassiv: "Nein, aber für das richtige Angebot würde ich wechseln",


  studieKicker: "STUDIE · DEUTSCH AUF DEM ARBEITSMARKT",

  tnKicker: "PRIVATES TALENT NETWORK · DEUTSCH",
  tnTitel: "Du hast schon einen Job.",
  tnTitelZwei: "Aber vielleicht nicht den richtigen Preis dafür.",
  tnUnter: "Sag uns einmal, was du kannst und was ein neues Angebot bieten müsste. Wenn wir etwas wirklich Passendes finden, melden wir uns.",
  tnDauer: "9 Fragen · ohne Lebenslauf, ohne Namen",
  tnStart: "Meine Wechselbedingungen herausfinden",

  tnBeruf: "Was bist du von Beruf?",
  tnBerufHinweis: "Schreib es genau so, wie du es einem Freund sagen würdest.",
  tnBerufPlatz: "z. B. Frontend-Entwickler, IT-Support",

  tnDeutsch: "Welche Sprachen sprichst du?",
  tnSprachePlatz: "z. B. Deutsch",
  niveauNative: "Muttersprachlich",

  tnStandort: "Wo lebst und arbeitest du?",
  tnStadt: "Stadt",
  tnStadtPlatz: "z. B. Berlin",

  tnSituation: "Wie ist deine aktuelle Situation?",
  sitZufrieden: "Ich habe einen Job und bin zufrieden",
  sitOffen: "Ich habe einen Job, wäre aber offen für Besseres",
  sitAktiv: "Ich suche bereits aktiv",
  sitOhne: "Ich bin aktuell ohne Job",
  sitSelbst: "Ich bin selbstständig",
  sitAndere: "Andere Situation",

  tnMotive: "Was müsste ein neuer Job besser machen?",
  tnMotiveHinweis: "Wähle alles, was für dich zählt.",
  mSalariu: "Mehr Gehalt", mAngajator: "Besserer Arbeitgeber", mConducere: "Bessere Führung",
  mStres: "Weniger Stress", mProgram: "Bessere Arbeitszeiten", mRemote: "Remote",
  mPozitie: "Bessere Position", mActivitate: "Interessantere Tätigkeit", mCariera: "Karriere",
  mCultura: "Unternehmenskultur", mSiguranta: "Sicherheit", mGermania: "Deutschland / international",
  mBeneficii: "Benefits", mAltele: "Sonstiges",

  tnGeld: "Was müsste sich finanziell ändern?",
  tnGeldJetzt: "Heute verdiene ich netto",
  tnGeldMin: "Welches Nettogehalt müsste ein Angebot mindestens haben, damit ich es ernsthaft prüfe?",
  tnGeldHinweis: "Bleibt vertraulich. Dein heutiges Gehalt sieht kein Arbeitgeber.",
  tnGleich: "Würdest du auch für ungefähr das gleiche Gehalt wechseln, wenn andere Bedingungen deutlich besser wären?",
  gleichJa: "Ja",
  gleichVielleicht: "Kommt auf die Bedingungen an",
  gleichNein: "Nein, finanziell muss es sich verbessern",
  sprungPlus: "mehr",
  sprungGleich: "Gleiches Gehalt — es sind die Bedingungen",
  sprungWeniger: "Auch für weniger, wenn die Bedingungen stimmen",

  tnMaerkte: "Wo käme ein wirklich gutes Angebot für dich infrage?",
  tnMaerkteHinweis: "Du kannst mehrere wählen.",
  marktRo: "Rumänien", marktDe: "Deutschland", marktRemote: "Vollständig remote",
  marktEu: "Anderes EU-Land", marktUmzug: "Umzug innerhalb Rumäniens", marktKeinUmzug: "Ich möchte nicht umziehen",
  marktLandLabel: "Land hinzufügen", marktLandPlatz: "z. B. Deutschland",

  tnBelastung: "Was kommt für dich infrage?",
  tnBelastungHinweis: "Wähle, was auf dich zutrifft. Trifft nichts zu, geh einfach weiter.",
  belSchicht: "Schichtarbeit, auch nachts und am Wochenende",
  belStehen: "Arbeit im Stehen, über acht Stunden",
  belKoerper: "Körperlich anspruchsvolle Arbeit",
  belErfahrung: "Ich habe bereits Erfahrung mit körperlicher Arbeit",

  klaerTitel: "Eine offene Frage noch",
  klaerHinweis: "Du kannst sie überspringen — deine Antwort hilft uns aber, etwas zu finden, das wirklich passt.",
  klaerStress: "Was würde für dich weniger Stress bei der Arbeit bedeuten?",
  klaerGeld: "Was wäre dir wichtiger als das Gehalt?",
  klaerGespraech: "Was müsste passieren, damit sich ein Gespräch für dich lohnt?",
  klaerPlatz: "Schreib frei, ein paar Worte genügen.",
  klaerUeberspringen: "Überspringen",

  tnGespraech: "Angenommen, ein Arbeitgeber erfüllt genau diese Bedingungen — würdest du mit ihm sprechen?",
  gesprJa: "Ja", gesprWahrsch: "Wahrscheinlich", gesprViell: "Vielleicht", gesprNein: "Aktuell eher nicht",

  tnSummeTitel: "DEINE WECHSELBEDINGUNGEN",
  tnSummeBeruf: "Beruf", tnSummeDeutsch: "Deutsch", tnSummeOrt: "Ort",
  tnSummeSituation: "Situation", tnSummeMotive: "Wichtig", tnSummeGeld: "Finanziell",
  tnSummeMaerkte: "Märkte", tnSummeBelastung: "Einsetzbar", tnSummeGespraech: "Gespräch",
  tnSummeSchluss: "Genau nach solchen Angeboten können wir für dich Ausschau halten.",
  tnSummeKnopf: "Mich nur bei passenden Angeboten kontaktieren",
  studieTitel: "Du sprichst Deutsch?",
  studieTitelZwei: "Für welches Gehalt würdest du wechseln?",
  studieUnter: "Sag uns, welches Angebot dich über einen Wechsel nachdenken lässt. Wir wollen herausfinden, was Deutsch auf dem rumänischen Arbeitsmarkt wirklich wert ist.",
  studieDauer: "9 Fragen · ohne Namen, ohne Lebenslauf",

  fLand: "In welchem Land arbeitest du gerade?",
  landRo: "Rumänien", landDe: "Deutschland", landAt: "Österreich", landAlta: "Anderes Land",

  fAlter: "Wie alt bist du?",
  fAlterHinweis: "Bleibt anonym.",
  alterU25: "unter 25 Jahre", alter2534: "25–34 Jahre", alter3544: "35–44 Jahre",
  alter4554: "45–54 Jahre", alter55p: "55 Jahre oder älter",

  fJetzt: "Was verdienst du heute, netto im Monat?",
  fJetztKurz: "Heute", fGehaltKurz: "Wechsel ab", sprungHinweis: "Unterschied",
  gehaltSpanne: "Schreib einen Betrag zwischen 100 und 20.000 €.",
  fGehaltBeide: "Was verdienst du heute — und wofür würdest du wechseln?",
  fJetztHinweis: "Bleibt anonym. Ohne diese Zahl sagt die Studie nichts aus.",
  stufe0: "unter 800 €", stufe800: "800–1.200 €", stufe1200: "1.200–1.600 €",
  stufe1600: "1.600–2.000 €", stufe2000: "2.000–2.500 €", stufe2500: "2.500–3.000 €",
  stufe3000: "über 3.000 €",

  fGehalt: "Ab welchem Nettogehalt würdest du einen Wechsel überlegen?",
  fGehaltHinweis: "Netto, im Monat. Wähle die Schwelle, ab der sich ein Gespräch lohnt.",
  gehalt800: "ab 800 €", gehalt1200: "ab 1.200 €", gehalt1600: "ab 1.600 €",
  gehalt2000: "ab 2.000 €", gehalt2500: "ab 2.500 €", gehalt3000: "über 3.000 €",

  fFaktoren: "Was zählt für dich am meisten?",
  fFaktorenHinweis: "Mehrfach wählbar.",
  faktorSalariu: "Das Gehalt", faktorRemote: "Remote", faktorFlex: "Flexible Zeiten",
  faktorCariera: "Karriere", faktorStabil: "Sicherheit", faktorEchipa: "Team und Kultur",
  weiter: "Weiter",

  fRueckkehr: "Würdest du für die richtige Stelle nach Rumänien zurückgehen?",
  rueckDa: "Ja", rueckPoate: "Vielleicht", rueckNu: "Nein",

  fBerufsfeld: "Was bist du von Beruf?",
  fBerufHinweis: "Schreib es genau so, wie du es einem Freund sagen würdest.",
  fStudii: "Abschluss",
  studiiWaehlen: "Auswählen…",
  studiiGimnaziu: "Mittelschule", studiiLiceu: "Abitur",
  studiiProfesionala: "Berufsausbildung", studiiLicenta: "Studium",
  studiiMaster: "Master / Promotion",
  feldSuport: "Support / Kundenservice", feldIt: "IT", feldFinante: "Finanzen / Buchhaltung",
  feldLogistica: "Logistik", feldInginerie: "Technik / Produktion", feldVanzari: "Vertrieb",
  feldSanatate: "Gesundheit / Pflege", feldAltul: "Anderer Bereich",
  feldFreiPlatzhalter: "z. B. Krankenschwester, Elektriker",

  summeTitel: "Das hast du uns gesagt",
  summeLand: "Land", summeDeutsch: "Deutsch", summeStatus: "Status",
  summeAlter: "Alter", summeJetzt: "Heute", summeGehalt: "Wechsel ab", summeFaktoren: "Wichtig", summeRueckkehr: "Rückkehr",
  summeFeld: "Bereich",
  summeHinweis: "Wir zeigen dir keine Marktzahlen — die Studie wird gerade erst gesammelt. Das Erste, was du siehst, sind ihre Ergebnisse.",

  mailStudieTitel: "Ist deine Schwelle realistisch?",
  mailStudieText: "Du hast uns gesagt, ab wann du wechseln würdest. Wir sagen dir, was Leute mit deinem Deutschniveau in deinem Bereich tatsächlich verlangen — sobald die Studie steht.",
  grund1: "Die Ergebnisse bekommst du zuerst, vor allen anderen.",
  grund2: "Wir bauen gerade ein Netz von Arbeitgebern auf, die deutschsprachige Leute suchen. Sobald es steht, fragen wir dich — nur wenn du willst.",
  grund3: "Kein Name, kein Telefon, kein Lebenslauf. Nur eine Adresse.",
  zaehlerText: "Bisher haben {n} Menschen geantwortet.",
  studieKnopf: "Ich will die Ergebnisse der Studie",
  dankeTitelStudie: "Danke — deine Antwort ist in der Studie.",
  dankeTextStudie: "Wir schreiben dir, wenn die Ergebnisse da sind, und nur mit Angeboten, die deine Schwelle einhalten.",

  crossTitel: "Hast du schon einen deutschen Lebenslauf?",
  crossText: "Lade deinen Lebenslauf in jeder Sprache hoch — heraus kommt ein deutscher, so formatiert, wie Arbeitgeber ihn erwarten. Gratis, mit Muster-Wasserzeichen.",
  crossKnopf: "Deutschen Lebenslauf erstellen",

  zurueck: "Zurück",


  mailLabel: "E-Mail",
  mailPlatzhalter: "name@beispiel.de",
  mailKeinSpam: "Kein Spam. Du kannst dich jederzeit abmelden.",
  mailFehlt: "Diese Adresse sieht noch nicht vollständig aus.",
  mailLaeuft: "Einen Moment…",

  haken: "Ich möchte passende Stellen per E-Mail bekommen.",
  hakenFehlt: "Ohne diese Zustimmung kann ich dir die Stellen nicht schicken.",
  datenschutzZusage: "Deine Daten gehen nie automatisch an Arbeitgeber. Du entscheidest bei jeder Stelle selbst.",




  technischerFehler: "Bei uns ist etwas schiefgegangen — nicht bei dir. Versuch es bitte noch einmal.",
};


/**
 * DREI FASSUNGEN, RUMÄNISCH ALS RÜCKFALL (Owner 31.08.2026: „3 sprachig bitte die
 * Jobs/germana seite").
 *
 * Rumänisch bleibt die Quelle und der Rückfall: Die Leute, die dieser Trichter sucht, SIND
 * Rumänen — auch die in Deutschland und Österreich. Deutsch ist für die, die im Alltag
 * deutsch denken, Englisch für alle übrigen Länder.
 */
export const JOBURI_SPRACHEN = ["ro", "de", "en"] as const;

/** Für alle übrigen Länder — Rumänisch bleibt der Rückfall (siehe unten). */
export const EN: JoburiTexte = {
  frage1: "How good is your German?",
  frage1Hinweis: "Pick the level that fits best.",
  frage4: "Are you actively looking for a job right now?",
  niveauA2: "A2 — beginner",
  niveauB1: "B1",
  niveauB2: "B2",
  niveauC1: "C1",
  niveauC2: "C2 / fluent",
  sucheAktiv: "Yes, actively looking",
  sucheOffen: "Just watching for opportunities",
  suchePassiv: "No, but I'd move for the right offer",
  studieKicker: "STUDY · GERMAN ON THE JOB MARKET",

  tnKicker: "PRIVATE TALENT NETWORK · GERMAN",
  tnTitel: "You already have a job.",
  tnTitelZwei: "But maybe not the right price for it.",
  tnUnter: "Tell us once what you can do and what a new offer would have to be worth. If we find something genuinely fitting, we'll get in touch.",
  tnDauer: "9 questions · no CV, no name",
  tnStart: "Find my switching conditions",

  tnBeruf: "What is your occupation?",
  tnBerufHinweis: "Write it exactly as you would tell a friend.",
  tnBerufPlatz: "e.g. frontend developer, IT support",

  tnDeutsch: "Which languages do you speak?",
  tnSprachePlatz: "e.g. German",
  niveauNative: "Native speaker",

  tnStandort: "Where do you live and work?",
  tnStadt: "City",
  tnStadtPlatz: "e.g. Berlin",

  tnSituation: "What is your current situation?",
  sitZufrieden: "I have a job and I'm happy with it",
  sitOffen: "I have a job but would be open to something better",
  sitAktiv: "I'm actively looking",
  sitOhne: "I'm currently without a job",
  sitSelbst: "I'm self-employed",
  sitAndere: "Another situation",

  tnMotive: "What would a new job have to do better?",
  tnMotiveHinweis: "Pick everything that matters to you.",
  mSalariu: "Better pay", mAngajator: "Better employer", mConducere: "Better management",
  mStres: "Less stress", mProgram: "Better hours", mRemote: "Remote",
  mPozitie: "Better position", mActivitate: "More interesting work", mCariera: "Career",
  mCultura: "Company culture", mSiguranta: "Security", mGermania: "Germany / international",
  mBeneficii: "Benefits", mAltele: "Something else",

  tnGeld: "What would have to change financially?",
  tnGeldJetzt: "Today I earn, net",
  tnGeldMin: "What net salary would an offer need at minimum for me to consider it seriously?",
  tnGeldHinweis: "Stays confidential. No employer sees what you earn today.",
  tnGleich: "Would you also move for roughly the same salary if other conditions were much better?",
  gleichJa: "Yes",
  gleichVielleicht: "Depends on the conditions",
  gleichNein: "No, it has to improve financially",
  sprungPlus: "more",
  sprungGleich: "Same salary — it's the conditions",
  sprungWeniger: "Even for less, if the conditions are right",

  tnMaerkte: "Where would a genuinely good offer be an option?",
  tnMaerkteHinweis: "You can pick several.",
  marktRo: "Romania", marktDe: "Germany", marktRemote: "Fully remote",
  marktEu: "Another EU country", marktUmzug: "Relocation within Romania", marktKeinUmzug: "I don't want to relocate",
  marktLandLabel: "Add a country", marktLandPlatz: "e.g. Germany",

  tnBelastung: "What would be an option for you?",
  tnBelastungHinweis: "Pick whatever applies. If none of it does, just continue.",
  belSchicht: "Shift work, including nights and weekends",
  belStehen: "Standing work, over eight hours",
  belKoerper: "Physically demanding work",
  belErfahrung: "I already have experience with physical work",

  klaerTitel: "One open question",
  klaerHinweis: "You can skip it — but your answer helps us find something that genuinely fits.",
  klaerStress: "What would less stress at work mean for you?",
  klaerGeld: "What would matter to you more than the salary?",
  klaerGespraech: "What would have to happen for a conversation to be worth your time?",
  klaerPlatz: "Write freely, a few words are enough.",
  klaerUeberspringen: "Skip",

  tnGespraech: "Suppose an employer met exactly these conditions — would you talk to them?",
  gesprJa: "Yes", gesprWahrsch: "Probably", gesprViell: "Maybe", gesprNein: "Not right now",

  tnSummeTitel: "YOUR SWITCHING CONDITIONS",
  tnSummeBeruf: "Occupation", tnSummeDeutsch: "German", tnSummeOrt: "Location",
  tnSummeSituation: "Situation", tnSummeMotive: "Matters", tnSummeGeld: "Financially",
  tnSummeMaerkte: "Markets", tnSummeBelastung: "Availability", tnSummeGespraech: "Conversation",
  tnSummeSchluss: "These are exactly the kind of offers we can watch out for on your behalf.",
  tnSummeKnopf: "Only contact me about matching offers",
  studieTitel: "You speak German?",
  studieTitelZwei: "For which salary would you change jobs?",
  studieUnter: "Tell us which offer would make you consider a move. We want to find out what German is really worth on the Romanian job market.",
  studieDauer: "9 questions · no name, no CV",
  fLand: "Which country do you work in right now?",
  landRo: "Romania",
  landDe: "Germany",
  landAt: "Austria",
  landAlta: "Another country",
  fAlter: "How old are you?",
  fAlterHinweis: "Stays anonymous.",
  alterU25: "under 25", alter2534: "25–34", alter3544: "35–44",
  alter4554: "45–54", alter55p: "55 or older",

  fJetzt: "What do you earn today, net per month?",
  fJetztKurz: "Today", fGehaltKurz: "Would move from", sprungHinweis: "difference",
  gehaltSpanne: "Write an amount between 100 and 20,000 €.",
  fGehaltBeide: "What do you earn today — and what would make you move?",
  fJetztHinweis: "Stays anonymous. Without this figure the study says nothing.",
  stufe0: "under 800 €", stufe800: "800–1,200 €", stufe1200: "1,200–1,600 €",
  stufe1600: "1,600–2,000 €", stufe2000: "2,000–2,500 €", stufe2500: "2,500–3,000 €",
  stufe3000: "over 3,000 €",

  fGehalt: "From which net salary would you consider a move?",
  fGehaltHinweis: "Net, per month. Pick the threshold where a conversation becomes worth it.",
  gehalt800: "from 800 €",
  gehalt1200: "from 1,200 €",
  gehalt1600: "from 1,600 €",
  gehalt2000: "from 2,000 €",
  gehalt2500: "from 2,500 €",
  gehalt3000: "over 3,000 €",
  fFaktoren: "What matters most to you?",
  fFaktorenHinweis: "You can pick several.",
  faktorSalariu: "The salary",
  faktorRemote: "Remote",
  faktorFlex: "Flexible hours",
  faktorCariera: "Career",
  faktorStabil: "Security",
  faktorEchipa: "Team and culture",
  weiter: "Continue",
  fRueckkehr: "Would you move back to Romania for the right role?",
  rueckDa: "Yes",
  rueckPoate: "Maybe",
  rueckNu: "No",
  fBerufsfeld: "What is your occupation?",
  fBerufHinweis: "Write it exactly as you would tell a friend.",
  fStudii: "Education",
  studiiWaehlen: "Choose…",
  studiiGimnaziu: "Secondary school", studiiLiceu: "High school",
  studiiProfesionala: "Vocational training", studiiLicenta: "University degree",
  studiiMaster: "Master's / doctorate",
  feldSuport: "Support / customer service",
  feldIt: "IT",
  feldFinante: "Finance / accounting",
  feldLogistica: "Logistics",
  feldInginerie: "Engineering / production",
  feldVanzari: "Sales",
  feldSanatate: "Health / care",
  feldAltul: "Another field",
  feldFreiPlatzhalter: "e.g. nurse, electrician",
  summeTitel: "This is what you told us",
  summeLand: "Country",
  summeDeutsch: "German",
  summeStatus: "Status",
  summeAlter: "Age", summeJetzt: "Today", summeGehalt: "Would move from",
  summeFaktoren: "Matters",
  summeRueckkehr: "Return",
  summeFeld: "Field",
  summeHinweis: "We don't show you market figures — the study is only just being collected. Its results are the first thing you'll see.",
  mailStudieTitel: "Is your threshold realistic?",
  mailStudieText: "You told us what would make you move. We'll tell you what people with your level of German, in your field, actually ask for — as soon as the study is in.",
  grund1: "You get the results first, ahead of everyone else.",
  grund2: "We are building a network of employers looking for German-speaking people. Once it stands, we'll ask you — only if you want us to.",
  grund3: "No name, no phone, no CV. Just an address.",
  zaehlerText: "{n} people have answered so far.",
  studieKnopf: "I want the study results",
  dankeTitelStudie: "Thank you — your answer is in the study.",
  dankeTextStudie: "We'll write when the results are ready, and only with offers that respect your threshold.",

  crossTitel: "Do you already have a German CV?",
  crossText: "Upload your CV in any language — you get a German one, formatted the way employers there expect it. Free, with a sample watermark.",
  crossKnopf: "Create my German CV",
  zurueck: "Back",
  mailLabel: "Email",
  mailPlatzhalter: "name@example.com",
  mailKeinSpam: "No spam. You can unsubscribe any time.",
  mailFehlt: "This address doesn't look complete.",
  mailLaeuft: "One moment…",
  haken: "I'd like to receive matching offers by email.",
  hakenFehlt: "Without this consent I can't send you anything.",
  datenschutzZusage: "Your data is never sent to employers automatically. You decide for every single opportunity.",
  technischerFehler: "Something went wrong on our side — not yours. Please try again.",
};

export const joburiTexte = (lang?: string): JoburiTexte => {
  const l = String(lang ?? "").toLowerCase();
  if (l.startsWith("de")) return DE;
  if (l.startsWith("en")) return EN;
  return RO;
};
