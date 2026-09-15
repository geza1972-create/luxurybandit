import { isLang, type Lang } from "@/lib/lang";

/**
 * DIE TEXTE DES PORTALS LAKATOSBANDI.COM — Englisch zuerst, dann Rumänisch, dann Deutsch (Owner
 * 10.09.2026: „alles muss mit Englisch anfangen").
 *
 * FEST GESCHRIEBEN, NICHT ÜBERSETZT: Es sind wenige kurze Zeilen, und das Portal ist die erste
 * Seite, die ein Käufer sieht — ein Übersetzungsaufruf beim ersten Laden kostet dort Sekunden.
 */
export const PORTAL_SPRACHEN: Lang[] = ["en", "ro", "de"];

const TEXTE = {
  en: {
    unter: "Marketing for Art",
    titel: "Discover art — and why it is special.",
    lead: "Selected artists. Every work comes with the sentence that explains what makes it rare. Interested? Talk to the artist's agent.",
    leer: "The first artists are being reviewed right now. Come back soon.",
    anmelden: "Artist login",
    /* Das Wort im Kopf (Owner 14.09.2026: „hier braucht man eigentlich ein Menü für Preise") —
       kurz, damit neben Logo, Sprachen und Login noch Platz bleibt. */
    preiseWort: "Pricing",
    /* Nur auf dem Handy, damit das Logo „lakatosbandi.com" nicht mehr Platz braucht, als der Kopf hat (Owner 11.09.2026). */
    anmeldenKurz: "Login",
    fuerKuenstler: "Are you an artist?",
    fuerKuenstlerText: "Show us your work — we find the buyers who value it.",
    fuerKuenstlerKnopf: "Start for free",
    /* EIN KNOPF STATT FRAGE + KNOPF (Owner 13.09.2026: „das ganze soll ein Button sein. Und soll
       heissen Webseite in 1 Minute. Gratis acum."). Das Versprechen steht auf dem Knopf selbst —
       „Ești artist?" davor war eine Frage, die niemand beantworten musste, um zu klicken. */
    seiteInEinerMinute: "Sign up as an artist. Still free these days.",
    agent: "Interested in my art? Talk to my agent.",
    werke: "Works",
    pruefung: "This artist is being reviewed and will be online soon.",
    nichtGefunden: "This page doesn't exist (anymore).",
    zurStart: "Go to the start page",
    bearbeitenHinweis: "You are editing your page. Tap a text or an image to change it.",
    bearbeitenPruefung: "Your page is being reviewed — only you can see it for now. Tap a text or an image to change it.",
    ansehen: "See it as buyers do",
    /* ── FOLGEN (Owner 13.09.2026) ────────────────────────────────────────────────────────────
       Der Knopf klappt das Feld auf; eingetragen wird erst nach dem Klick in der Mail. Die
       Rückmeldung sagt deshalb „schau in deine Mails" und nicht „du folgst jetzt". */
    folgen: "Follow",
    /* HIER STAND „Nothing else." (Owner 13.09.2026: „die Follower bekommen auch Newsletter von
       uns"). Der Satz war damit falsch — und zwar genau dort, wo jemand seine Adresse hergibt.
       Eine Einwilligung in Werbung muss beim Eintragen sichtbar sein, nicht nur in den AGB. */
    folgenText: "Get an email when this artist adds a new work — plus occasional news from lakatosbandi.com. You can unsubscribe in every email.",
    folgenPlatzhalter: "Your email address",
    folgenSenden: "Follow",
    folgenMailGeschickt: "Check your email — one click there, and you're following.",
    folgenFehler: "That didn't work. Please try again.",
    folgenDanke: "Done — you are following this artist.",
    folgenUngueltig: "This link is not valid (anymore).",
    fotoPlatzhalter: "Your photo",
    namePlatzhalter: "Your artist name",
    /* Hier stand „Where you work" / „Unde lucrezi" (Owner 12.09.2026: „und lucrezi, was soll
       das?"). Gefragt ist der Ort unter seinem Namen — seine Stadt, nicht sein Arbeitsplatz. */
    ortPlatzhalter: "Your city",
    /* Der Vorgabetext nimmt die Hemmung (Owner 13.09.2026: „im Eingabefeld musst du im Default
       schreiben: Schreib einfach frei etwas, wir formulieren das mit AI richtig"). */
    ueberMichPlatzhalter: "Just write freely — we'll put it into shape with AI afterwards.",
    aiKorrektur: "AI correction",
    aiLaeuft: "Rewriting …",
    spruchPlatzhalter: "Write a line for this work",
    titelPlatzhalter: "Title",
    technikPlatzhalter: "Technique",
    groessePlatzhalter: "Size",
    jahrPlatzhalter: "Year",
    bildTauschen: "Change image",
    /* EIN KNOPF FÜR VIELE WERKE (Owner 12.09.2026: „das selbe Prinzip. Grosser Button lade Bilder
       hoch, save. Dann wird alles angelegt") — hier stand „+ Add a work", ein Werk je Klick. */
    bildHinzufuegen: "Upload images",
    entfernen: "Remove",
    speichern: "Save",
    gespeichert: "Saved",
    speichernFehler: "That didn't work. Please try again.",
    /* Wenn er einen KI-Knopf drückt, ohne Abo (Owner 14.09.2026: „es soll eine Meldung kommen
       Premium kaufen"). Sie sagt, was er bekommt — nicht, was ihm fehlt, und sie beschuldigt ihn
       nicht: Bisher stand der Knopf einfach offen. */
    aboKiGesperrt: "AI texts are part of the subscription. Subscribe, and your agent writes for you again.",
    /* Der Knopf direkt neben der Meldung (Owner 14.09.2026: „wenn er auf eine Funktion klickt wie
       KI, dann steht Upgrade"). Ohne ihn liest er, dass etwas Geld kostet, und findet nichts zum
       Drücken — gemessen am 14.09.2026 sah KEINER der neun Künstler einen Kaufweg. */
    aboUpgradeKnopf: "Upgrade",
    bildPruefung: "Thanks — we'll take a quick look at this image.",
    bildAbgelehnt: "We can't use this image.",
    /* Der Knopf im Admin und die Antwort darauf (Owner 12.09.2026: „du sagst ihm: wir haben dir
       eine E-Mail geschickt, bestätige es in der E-Mail"). Gelöscht wird nie auf Knopfdruck —
       immer erst nach dem Klick in der Mail, wie beim Anlegen. */
    meineSeiteLoeschen: "Delete page",
    /* Was der rote Knopf sagt, solange er auf die Bestätigung wartet (Owner 12.09.2026: „das wird
       rot und bleibt rot? was soll das"). Rot allein ist eine Farbe, keine Frage. */
    loeschenWirklich: "Sure?",
    /* WAS IM DIALOG WIRKLICH PASSIERT (Owner 12.09.2026: „ich hoffe, hier geht E-Mail raus aus dem
       Dialog, also musst du schreiben: wir schicken dir das per E-Mail, bestätige das. Deine Seite
       wird hier nicht gelöscht"). Der alte Text stammte von der Löschseite und behauptete, es sei
       endgültig — hier ist es das nicht. */
    loeschenPerMailText: "We'll send you an email with a confirmation link. Nothing is deleted here — you decide in that email.",
    loeschenPerMail: "Send me the email",
    /* Das Nein neben der roten Frage (Owner 12.09.2026: „hat keine Chance zu sagen nein"). Kurz,
       weil es in der Fussleiste neben drei anderen Knöpfen steht. */
    loeschenAbbrechen: "No",
    /* Kurz für die Fussleiste (Owner 12.09.2026: „Preview statt Vezi…"). Der lange Satz „So sehen
       Käufer deine Seite" stand als Knopf über dem Raster; unten neben „Speichern" braucht es ein
       Wort, das in jeder Sprache gleich verstanden wird. */
    /* NICHT MEHR „Preview" (Owner 13.09.2026: „Preview Knopf sehen die nicht") — das englische
       Wort stand in allen drei Sprachen und las sich wie ein technisches Etikett. Jetzt sagt der
       Knopf, was dahinter liegt: seine fertige Seite, öffentlich. */
    /* ZWEI LÄNGEN (Owner 13.09.2026: „dann nur auf dem PC ausschreiben") — die Fussleiste hält am
       Handy drei Knöpfe nebeneinander; der ganze Satz würde sie sprengen. */
    vorschauKurz: "View page",
    vorschauOnline: "See your page online!",
    spruchKi: "Write with AI",
    /* Der Weg zurück ins Dashboard (Owner 13.09.2026: „ich brauche ein Button zum Dashboard").
       Aus der Bearbeiten-Ansicht führte bisher nichts dorthin — er kam per Mail-Link herein und
       fand von hier aus nur seine öffentliche Seite. */
    zumDashboard: "Dashboard",
    /* Der Weg zurück nach einer KI-Fassung (Owner 13.09.2026: „man braucht noch einen Knopf beim
       Profiltext, Icon für zurück zur letzten Version" · „auch bei den Werken"). Der Vorschlag
       landet direkt im Feld — ohne diesen Knopf wäre der eigene Text weg, sobald jemand einmal
       neugierig drückt. Nur ein Symbol; dies ist sein Name für Sprechblase und Hilfstechnik. */
    zurueckVersion: "Back to my previous text",
    /* Der Teilen-Knopf auf seiner öffentlichen Seite (Owner 13.09.2026: „Künstlerseiten müssen
       noch einen Share-Button haben"). „Link kopiert" ist der Rückfall für Browser ohne die
       Teilen-Funktion des Geräts — ohne ihn bliebe der Knopf auf dem Rechner stumm. */
    teilen: "Share",
    /* Freiwillige Felder in „Seite bearbeiten" (Owner 13.09.2026). Der Platzhalter zeigt die
       kurze Form, weil die meisten ihren Namen tippen und nicht die ganze Adresse. */
    instagramPlatzhalter: "Instagram — @yourname",
    facebookPlatzhalter: "Facebook — your page",
    linkKopiert: "Link copied",
    teilenFehler: "Couldn't copy the link.",
    /* Die Grenze steht AUF dem Knopf (Owner 13.09.2026: „Im Button wie ich dir gesagt habe
       8/10") — sie soll vor dem Auswählen sichtbar sein, nicht danach als Absage. */
    werkeVoll: "You've reached the maximum of {max} works. Remove one to add a new one.",
    /* Der Dialog am vollen Knopf (Owner 13.09.2026: „hier muss doch klicken können, aber Dialog
       öffnet sich. Dann wird dort stehen Premium kaufen — aber nicht jetzt"). */
    werkeVollTitel: "You've reached the maximum of {max} works.",
    werkeVollText: "Remove a work you no longer want to show, then you can upload a new one.",
    verstanden: "Got it",
    zuVieleBilder: "Only {n} places left — we took the first {n}.",
    spruchKiLaeuft: "Writing …",
    loeschenMailGeschickt: "We've sent you an email. Confirm the deletion with the link inside.",
    loeschenTitel: "Delete your page?",
    /* Das Nein steht gleichberechtigt neben dem Ja (Owner 12.09.2026: „er springt auf seine Seite
       und wird dort gefragt: willst du deine Webseite wirklich löschen?" · „ja nein"). */
    loeschenNein: "No, keep my page",
    loeschenText: "Your page, your works, your lines and all inquiries — permanently. There is no way back.",
    loeschenKnopf: "Delete page",
    loeschenSicher: "Yes, delete permanently",
    loeschenLaeuft: "One moment …",
    loeschenFertig: "Everything is deleted.",
    loeschenFertigText: "Your page and all your data are gone.",
    loeschenFehler: "That didn't work. Please try again.",
    loeschenOhneLink: "This link is not valid (anymore).",
    /* Sein Agent auf seiner Seite (Owner 11.09.2026: „begrüsst den Besucher und fragt: Gefällt dir die Kunst?"). {name} setzt der Code ein. */
    agentTitel: "Agent",
    agentHallo: "Hi! I'm {name}'s agent.",
    agentFrage: "Do you like {name}'s art?",
    /* Der verkaufende Agent (Owner 11.09.2026: „willst du mehr erfahren? — Ja, mich interessiert dieses Kunstwerk"). */
    agentMehrFrage: "Would you like to know more?",
    agentJa: "Yes, I'm interested in this work",
    agentNein: "Just looking",
    agentPreis: "You agree on the price directly with {name}.",
    geschichtePlatzhalter: "The story of this work: where it was made, what's behind it (optional — only your agent reads it)",
    agentBesserHinweis: "The more you tell your agent, the better it sells.",
    preisSpannePlatzhalter: "e.g. 400€-1300€",
    detaliiPlatzhalter: "Other details, e.g. signed print, edition 3/50",
    preisSpanneWort: "What my works cost",
    preisAufAnfrage: "Price on request",
    alleWerkeVon: "All works by {name}",
    weitereWerke: "More works",
    agentJaText: "Wonderful! Leave me your name and phone number — {name} will call you personally.",
    agentFeldName: "Name",
    agentFeldTelefon: "Phone",
    agentSenden: "Send",
    agentDatenschutz: "Your details go only to {name}.",
    agentDatenschutzLink: "Privacy",
    agentDanke: "Thank you! {name} will be in touch soon.",
    agentFehler: "That didn't work. Please try again.",
    agentNeinText: "Thanks for looking. Maybe another work speaks to you.",
    loginTitel: "Artist login",
    loginText: "Enter the email address you signed up with. We send you a link to your dashboard — no password needed.",
    loginFeld: "Your email address",
    loginKnopf: "Send me the link",
    loginGesendet: "If there is an artist account for this address, the link is on its way. Check your inbox.",
    loginFehler: "That did not work. Please try again.",
    /* Kein „bald" mehr (Owner 11.09.2026: „jetzt sind wir soweit für Werbung und Marketing"). */
    baldKicker: "For artists",
    /* Owner 10.09.2026: „Das ist eine Marketingplattform für Künstler" — kein Kunst-Zuhause, keine Galerie. */
    baldTitel: "The marketing platform for artists.",
    baldLead: "We turn your work into ads that make people stop: for every piece, the sentence that explains what makes it rare — and an agent that talks to buyers for you. We are selecting our first artists now.",
    baldKnopf: "Apply as an artist",
    /* Sofort online, ein Bild reicht (Owner 11.09.2026) — vorher „drei Werke im selben Stil · Prüfung in 3 Tagen". */
    baldFein: "Free · your page is online right away",
    letzteWerke: "Latest works",
    /* Reiter über dem Raster (Owner 13.09.2026: „wir brauchen über die Feeds Tabs. Kunstwerke und Künstler"). */
    tabWerke: "Artworks",
    tabKuenstler: "Artists",
    seiteWeiter: "Next",
    seiteZurueck: "Back",
    werkeZahl: "{n} works",
    /* Solange `aufbauSeit` steht: Seine Seite existiert schon, die Werke sind noch unterwegs. */
    aufbau: "Your works are being uploaded right now. This page fills up in a moment — please reload it shortly.",
    vertritt: "This image represents me",
  },
  ro: {
    unter: "Marketing for Art",
    titel: "Descoperă artă — și de ce este specială.",
    lead: "Artiști selectați. Fiecare lucrare vine cu fraza care spune ce o face rară. Te interesează? Vorbește cu agentul artistului.",
    leer: "Primii artiști sunt verificați chiar acum. Revino în curând.",
    anmelden: "Login artist",
    preiseWort: "Prețuri",
    /* „Login" statt „Autentificare" (Owner 14.09.2026: „Autentificare nimmt zu viel Platz").
       EN und DE nutzen das Wort längst; nur Rumänisch buchstabierte es aus und sprengte damit
       ausgerechnet in der Hauptsprache den Kopf. Das Logo bleibt dafür unangetastet. */
    anmeldenKurz: "Login",
    fuerKuenstler: "Ești artist?",
    fuerKuenstlerText: "Arată-ne lucrările tale — găsim cumpărătorii care le apreciază.",
    fuerKuenstlerKnopf: "Începe gratuit",
    /* Owner 14.09.2026: „Inscrie-te Artist. Zilele acestea inca gratuit." — Aufforderung statt
       Versprechen, und „dieser Tage noch" sagt ehrlicher, dass es nicht ewig gratis bleibt. */
    seiteInEinerMinute: "Înscrie-te ca artist. Zilele acestea încă gratuit.",
    agent: "Te interesează arta mea? Vorbește cu agentul meu.",
    werke: "Lucrări",
    pruefung: "Acest artist este în verificare și va fi online în curând.",
    nichtGefunden: "Această pagină nu există (sau nu mai există).",
    zurStart: "Mergi la pagina de start",
    bearbeitenHinweis: "Îți editezi pagina. Alege un text sau o imagine ca să le schimbi.",
    bearbeitenPruefung: "Pagina ta este în verificare — deocamdată doar tu o vezi. Alege un text sau o imagine ca să le schimbi.",
    ansehen: "Vezi-o cum o văd cumpărătorii",
    /* „Follow" bleibt englisch (Owner 13.09.2026: „das heisst Follow in allen Sprachen") — das
       Wort kennt jeder aus den sozialen Netzen, „Urmărește" muss man erst lesen. Nur der KNOPF;
       der Erklärtext darunter bleibt rumänisch, dort steht, was er sich einhandelt. */
    folgen: "Follow",
    folgenText: "Primești un e-mail când artistul adaugă o lucrare nouă — și, din când în când, noutăți de la lakatosbandi.com. Te poți dezabona din fiecare e-mail.",
    folgenPlatzhalter: "Adresa ta de e-mail",
    folgenSenden: "Follow",
    folgenMailGeschickt: "Verifică-ți e-mailul — un clic acolo și îl urmărești.",
    folgenFehler: "Nu a mers. Te rog încearcă din nou.",
    folgenDanke: "Gata — urmărești acest artist.",
    folgenUngueltig: "Acest link nu este (mai) valid.",
    fotoPlatzhalter: "Fotografia ta",
    namePlatzhalter: "Numele tău de artist",
    ortPlatzhalter: "Orașul tău",
    ueberMichPlatzhalter: "Scrie liber, cum îți vine — noi formulăm corect după aceea, cu AI.",
    aiKorrektur: "Corectare AI",
    aiLaeuft: "Se formulează …",
    spruchPlatzhalter: "Scrie o frază pentru această lucrare",
    titelPlatzhalter: "Titlu",
    technikPlatzhalter: "Tehnică",
    groessePlatzhalter: "Dimensiune",
    jahrPlatzhalter: "An",
    bildTauschen: "Schimbă imaginea",
    bildHinzufuegen: "Încarcă imagini",
    /* Owner 11.09.2026: „Șterge, nu elimină". */
    entfernen: "Șterge",
    speichern: "Salvează",
    gespeichert: "Salvat",
    speichernFehler: "Nu a mers. Te rog încearcă din nou.",
    aboKiGesperrt: "Textele scrise de AI fac parte din abonament. Abonează-te și agentul tău scrie din nou pentru tine.",
    aboUpgradeKnopf: "Upgrade",
    bildPruefung: "Mulțumim — ne uităm puțin la această imagine.",
    bildAbgelehnt: "Nu putem folosi această imagine.",
    meineSeiteLoeschen: "Șterge pagina",
    loeschenWirklich: "Sigur?",
    loeschenPerMailText: "Îți trimitem un e-mail cu un link de confirmare. Aici nu se șterge nimic — decizi în acel e-mail.",
    loeschenPerMail: "Trimite-mi e-mailul",
    loeschenAbbrechen: "Nu",
    vorschauKurz: "Vezi pagina",
    vorschauOnline: "Vezi pagina ta online!",
    spruchKi: "Scrie cu AI",
    zumDashboard: "Dashboard",
    zurueckVersion: "Înapoi la textul meu anterior",
    teilen: "Distribuie",
    instagramPlatzhalter: "Instagram — @numele tău",
    facebookPlatzhalter: "Facebook — pagina ta",
    linkKopiert: "Link copiat",
    teilenFehler: "Nu am putut copia linkul.",
    /* „Locuri" klang nach Parkplätzen (Owner 13.09.2026: „Locuri e blöd. Das ist keine
       Formulierung") — jetzt sein eigener Wortlaut: das Maximum ist erreicht. */
    werkeVoll: "Ai atins maximul de {max} lucrări. Șterge una ca să adaugi alta.",
    werkeVollTitel: "Ai atins maximul de {max} lucrări.",
    werkeVollText: "Șterge o lucrare pe care nu vrei să o mai arăți, apoi poți încărca alta.",
    verstanden: "Am înțeles",
    zuVieleBilder: "Mai sunt {n} locuri libere — am luat primele {n}.",
    spruchKiLaeuft: "Se scrie …",
    loeschenMailGeschickt: "Ți-am trimis un e-mail. Confirmă ștergerea prin linkul din el.",
    loeschenTitel: "Îți ștergi pagina?",
    loeschenNein: "Nu, păstrez pagina",
    loeschenText: "Pagina ta, lucrările tale, frazele și toate cererile — definitiv. Nu există cale de întoarcere.",
    loeschenKnopf: "Șterge pagina",
    loeschenSicher: "Da, șterge definitiv",
    loeschenLaeuft: "Un moment …",
    loeschenFertig: "Totul a fost șters.",
    loeschenFertigText: "Pagina ta și toate datele tale au dispărut.",
    loeschenFehler: "Nu a mers. Te rog încearcă din nou.",
    loeschenOhneLink: "Acest link nu este (mai) valid.",
    agentTitel: "Agent",
    agentHallo: "Bună! Sunt agentul lui {name}.",
    /* Owner 11.09.2026: „Îți place arta (statt: Îți place arta lui {Name})". */
    agentFrage: "Îți place arta lui {name}?",
    agentMehrFrage: "Vrei să afli mai multe?",
    agentJa: "Da, mă interesează această lucrare",
    agentNein: "Doar mă uit",
    agentPreis: "Prețul îl stabilești direct cu {name}.",
    geschichtePlatzhalter: "Povestea lucrării: unde a luat naștere, ce e în spatele ei (opțional — o citește doar agentul tău)",
    agentBesserHinweis: "Cu cât îi spui mai mult agentului tău, cu atât vinde mai bine.",
    preisSpannePlatzhalter: "ex.: 400€-1300€",
    detaliiPlatzhalter: "Alte detalii, ex.: print semnat, ediție 3/50",
    preisSpanneWort: "Cât costă lucrările mele",
    preisAufAnfrage: "Preț la cerere",
    alleWerkeVon: "Toate lucrările lui {name}",
    weitereWerke: "Alte lucrări",
    agentJaText: "Minunat! Lasă-mi numele și telefonul — {name} te sună personal.",
    agentFeldName: "Nume",
    agentFeldTelefon: "Telefon",
    agentSenden: "Trimite",
    agentDatenschutz: "Datele tale ajung doar la {name}.",
    agentDatenschutzLink: "Confidențialitate",
    agentDanke: "Mulțumesc! {name} te contactează în curând.",
    agentFehler: "Nu a mers. Te rog încearcă din nou.",
    agentNeinText: "Mulțumesc că ai privit. Poate altă lucrare îți vorbește.",
    loginTitel: "Autentificare artist",
    loginText: "Scrie adresa de e-mail cu care te-ai înscris. Îți trimitem un link către dashboard — fără parolă.",
    loginFeld: "Adresa ta de e-mail",
    loginKnopf: "Trimite-mi linkul",
    loginGesendet: "Dacă există un cont de artist pentru această adresă, linkul este pe drum. Verifică-ți e-mailul.",
    loginFehler: "Nu a mers. Te rugăm să încerci din nou.",
    baldKicker: "Pentru artiști",
    baldTitel: "Platforma de marketing pentru artiști.",
    baldLead: "Transformăm lucrările tale în reclame care îi fac pe oameni să se oprească: pentru fiecare lucrare, fraza care spune ce o face rară — și un agent care vorbește cu cumpărătorii pentru tine. Acum ne alegem primii artiști.",
    baldKnopf: "Aplică ca artist",
    baldFein: "Gratuit · pagina ta e online imediat",
    letzteWerke: "Ultimele lucrări",
    tabWerke: "Lucrări",
    tabKuenstler: "Artiști",
    seiteWeiter: "Înainte",
    seiteZurueck: "Înapoi",
    werkeZahl: "{n} lucrări",
    aufbau: "Lucrările tale se încarcă chiar acum. Pagina se completează în câteva momente — reîncarc-o în scurt timp.",
    vertritt: "Această imagine mă reprezintă",
  },
  de: {
    unter: "Marketing for Art",
    titel: "Entdecke Kunst — und warum sie besonders ist.",
    lead: "Ausgewählte Künstler. Zu jedem Werk steht der Satz, der sagt, was es selten macht. Interessiert? Sprich mit dem Agenten des Künstlers.",
    leer: "Die ersten Künstler werden gerade geprüft. Schau bald wieder vorbei.",
    anmelden: "Login für Künstler",
    preiseWort: "Preise",
    anmeldenKurz: "Login",
    fuerKuenstler: "Bist du Künstler?",
    fuerKuenstlerText: "Zeig uns deine Werke — wir finden die Käufer, die sie schätzen.",
    fuerKuenstlerKnopf: "Kostenlos starten",
    seiteInEinerMinute: "Melde dich als Künstler an. Dieser Tage noch gratis.",
    agent: "Interessiert an meiner Kunst? Sprich mit meinem Agenten.",
    werke: "Werke",
    pruefung: "Dieser Künstler wird gerade geprüft und ist bald online.",
    nichtGefunden: "Diese Seite gibt es nicht (mehr).",
    zurStart: "Zur Startseite",
    bearbeitenHinweis: "Du bearbeitest deine Seite. Tippe auf einen Text oder ein Bild, um es zu ändern.",
    bearbeitenPruefung: "Deine Seite wird gerade geprüft — nur du siehst sie. Tippe auf einen Text oder ein Bild, um es zu ändern.",
    ansehen: "So sehen Käufer deine Seite",
    folgen: "Follow",
    folgenText: "Bekomm eine E-Mail, wenn dieser Künstler ein neues Werk hinzufügt — und gelegentlich Neuigkeiten von lakatosbandi.com. Du kannst dich in jeder Mail abmelden.",
    folgenPlatzhalter: "Deine E-Mail-Adresse",
    folgenSenden: "Follow",
    folgenMailGeschickt: "Schau in deine Mails — ein Klick dort, und du folgst.",
    folgenFehler: "Das hat nicht geklappt. Bitte versuch es noch einmal.",
    folgenDanke: "Fertig — du folgst diesem Künstler.",
    folgenUngueltig: "Dieser Link ist nicht (mehr) gültig.",
    fotoPlatzhalter: "Dein Foto",
    namePlatzhalter: "Dein Künstlername",
    ortPlatzhalter: "Deine Stadt",
    ueberMichPlatzhalter: "Schreib einfach frei drauflos — wir formulieren es danach mit KI richtig.",
    aiKorrektur: "KI-Korrektur",
    aiLaeuft: "Wird formuliert …",
    spruchPlatzhalter: "Schreib einen Spruch zu diesem Werk",
    titelPlatzhalter: "Titel",
    technikPlatzhalter: "Technik",
    groessePlatzhalter: "Größe",
    jahrPlatzhalter: "Jahr",
    bildTauschen: "Bild tauschen",
    bildHinzufuegen: "Bilder hochladen",
    entfernen: "Entfernen",
    speichern: "Speichern",
    gespeichert: "Gespeichert",
    speichernFehler: "Das hat nicht geklappt. Versuch es bitte noch einmal.",
    aboKiGesperrt: "Texte von der KI gehören zum Abo. Schliess es ab, und dein Agent schreibt wieder für dich.",
    aboUpgradeKnopf: "Upgrade",
    bildPruefung: "Danke — wir sehen uns dieses Bild kurz an.",
    bildAbgelehnt: "Dieses Bild können wir nicht verwenden.",
    meineSeiteLoeschen: "Seite löschen",
    loeschenWirklich: "Wirklich?",
    loeschenPerMailText: "Wir schicken dir eine E-Mail mit einem Bestätigungslink. Hier wird nichts gelöscht — du entscheidest in dieser E-Mail.",
    loeschenPerMail: "Schick mir die E-Mail",
    loeschenAbbrechen: "Nein",
    vorschauKurz: "Seite ansehen",
    vorschauOnline: "Sieh deine Seite online!",
    spruchKi: "Mit KI schreiben",
    zumDashboard: "Dashboard",
    zurueckVersion: "Zurück zu meinem vorigen Text",
    teilen: "Teilen",
    instagramPlatzhalter: "Instagram — @deinname",
    facebookPlatzhalter: "Facebook — deine Seite",
    linkKopiert: "Link kopiert",
    teilenFehler: "Der Link liess sich nicht kopieren.",
    werkeVoll: "Du hast das Maximum von {max} Werken erreicht. Entferne eines, um ein neues hinzuzufügen.",
    werkeVollTitel: "Du hast das Maximum von {max} Werken erreicht.",
    werkeVollText: "Entferne ein Werk, das du nicht mehr zeigen willst — dann kannst du ein neues hochladen.",
    verstanden: "Verstanden",
    zuVieleBilder: "Nur noch {n} Plätze frei — wir haben die ersten {n} genommen.",
    spruchKiLaeuft: "Wird geschrieben …",
    loeschenMailGeschickt: "Wir haben dir eine E-Mail geschickt. Bestätige das Löschen über den Link darin.",
    loeschenTitel: "Deine Seite löschen?",
    loeschenNein: "Nein, Seite behalten",
    loeschenText: "Deine Seite, deine Werke, deine Sprüche und alle Anfragen — endgültig, ohne Weg zurück.",
    loeschenKnopf: "Seite löschen",
    loeschenSicher: "Ja, endgültig löschen",
    loeschenLaeuft: "Einen Moment …",
    loeschenFertig: "Alles gelöscht.",
    loeschenFertigText: "Deine Seite und alle deine Daten sind weg.",
    loeschenFehler: "Das hat nicht geklappt. Versuch es bitte noch einmal.",
    loeschenOhneLink: "Dieser Link ist nicht (mehr) gültig.",
    agentTitel: "Agent",
    agentHallo: "Hallo! Ich bin der Agent von {name}.",
    agentFrage: "Gefällt dir die Kunst von {name}?",
    agentMehrFrage: "Möchtest du mehr erfahren?",
    agentJa: "Ja, mich interessiert dieses Werk",
    agentNein: "Ich schaue nur",
    agentPreis: "Den Preis besprichst du direkt mit {name}.",
    geschichtePlatzhalter: "Die Geschichte dieses Werks: wo es entstand, was dahintersteht (freiwillig — nur dein Agent liest sie)",
    agentBesserHinweis: "Je mehr du deinem Agenten erzählst, desto besser verkauft er.",
    preisSpannePlatzhalter: "z. B. 400€-1300€",
    detaliiPlatzhalter: "Weitere Details, z. B. signierter Druck, Auflage 3/50",
    preisSpanneWort: "Was meine Werke kosten",
    preisAufAnfrage: "Preis auf Anfrage",
    alleWerkeVon: "Alle Werke von {name}",
    weitereWerke: "Weitere Werke",
    agentJaText: "Schön! Hinterlass mir deinen Namen und deine Telefonnummer — {name} ruft dich persönlich an.",
    agentFeldName: "Name",
    agentFeldTelefon: "Telefon",
    agentSenden: "Senden",
    agentDatenschutz: "Deine Angaben gehen nur an {name}.",
    agentDatenschutzLink: "Datenschutz",
    agentDanke: "Danke! {name} meldet sich bald bei dir.",
    agentFehler: "Das hat nicht geklappt. Versuch es bitte noch einmal.",
    agentNeinText: "Danke fürs Anschauen. Vielleicht spricht dich ein anderes Werk an.",
    loginTitel: "Login für Künstler",
    loginText: "Gib die E-Mail-Adresse ein, mit der du dich angemeldet hast. Wir schicken dir einen Link zu deinem Dashboard — ohne Passwort.",
    loginFeld: "Deine E-Mail-Adresse",
    loginKnopf: "Link schicken",
    loginGesendet: "Wenn es für diese Adresse ein Künstlerkonto gibt, ist der Link unterwegs. Schau in dein Postfach.",
    loginFehler: "Das hat nicht geklappt. Bitte versuch es noch einmal.",
    baldKicker: "Für Künstler",
    baldTitel: "Die Marketing-Plattform für Künstler.",
    baldLead: "Wir machen aus deinen Werken Werbung, bei der Menschen anhalten: zu jedem Werk der Satz, der sagt, was es selten macht — und ein Agent, der für dich mit Käufern spricht. Gerade wählen wir die ersten Künstler aus.",
    baldKnopf: "Als Künstler bewerben",
    baldFein: "Kostenlos · deine Seite ist sofort online",
    letzteWerke: "Die letzten Kunstwerke",
    tabWerke: "Kunstwerke",
    tabKuenstler: "Künstler",
    seiteWeiter: "Weiter",
    seiteZurueck: "Zurück",
    werkeZahl: "{n} Werke",
    aufbau: "Deine Werke werden gerade hochgeladen. Die Seite füllt sich gleich — lade sie in einem Moment neu.",
    vertritt: "Dieses Bild repräsentiert mich",
  },
} as const;

export type PortalTexte = { -readonly [K in keyof typeof TEXTE.en]: string };

export function portalSprache(wunsch?: string | null, rueckfall = "en"): Lang {
  const w = String(wunsch ?? "").slice(0, 2).toLowerCase();
  if (isLang(w) && PORTAL_SPRACHEN.includes(w)) return w;
  const r = String(rueckfall).slice(0, 2).toLowerCase();
  return isLang(r) && PORTAL_SPRACHEN.includes(r) ? r : "en";
}

export const portalTexte = (lang: Lang): PortalTexte => (TEXTE as Record<string, PortalTexte>)[lang] ?? TEXTE.en;
