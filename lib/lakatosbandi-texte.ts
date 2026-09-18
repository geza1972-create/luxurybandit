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
    /* ── DIE MARKE STEHT IN DER ÜBERSCHRIFT (Owner 18.09.2026: „Descopera Arta Artist Fair") ──
       Der erste Satz der Seite sagt jetzt, was für ein Laden das ist — nicht nur, dass es Kunst
       gibt. Warum die Werke besonders sind, steht in der Zeile darunter. */
    titel: "Discover art — Artist Fair.",
    lead: "Selected artists. Every work comes with the sentence that explains what makes it rare. Interested? Talk to the artist's agent.",
    leer: "The first artists are being reviewed right now. Come back soon.",
    anmelden: "Artist login",
    /* Das Wort im Kopf (Owner 14.09.2026: „hier braucht man eigentlich ein Menü für Preise") —
       kurz, damit neben Logo, Sprachen und Login noch Platz bleibt. */
    preiseWort: "Pricing",
    texteUeberschreiben: "The lines under your works were written by our algorithm. Overwrite any of them — your own words always win.",
    ueberUnsWort: "About",
    kontaktWort: "Contact",
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
    /* Kurzform für den Knopf oben (Owner 17.09.2026: „der button ist scheisse") — der lange
       Satz brach dort auf zwei Zeilen und machte aus einem Knopf einen Absatz. */
    agentKurz: "Talk to my agent",
    werke: "Originals",
    werkeReproduktionen: "Living Poster",
    werkeKleidung: "Clothing",
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
    /* ── NACH DER ZAHLUNG (Owner 16.09.2026: „aber eine Bestätigungsseite gibt es immer noch
       nicht") — wer bezahlt hat, landete bisher wortlos wieder auf der Werkseite. ─────────── */
    dankeTitel: "Thank you — your order is with us.",
    dankeNummer: "Your order number:",
    dankeDruck: "We print your poster and send it out. You will get a message when the parcel leaves.",
    dankeDatei: "The print file is on its way to you by email. If it is not there, look in the spam folder too.",
    dankeMail: "The confirmation went to {mail}.",
    dankeWeiter: "Back to the works",
    dankeUnklar: "We cannot find this payment. If you were charged, please write to us.",
    /* ── SEINE STIMME ZUM WERK (Owner 17.09.2026) — das Living Poster wird erst dadurch lebendig. */
    stimmeTitel: "Your voice on this work",
    stimmeProfilErklaerung: "Record yourself once, in front of one of your works: who you are, what you paint, why. The recording then plays in every QR window next to your art — on every poster someone hangs on their wall.",
    stimmePremium: "Recording yourself is part of Premium.",
    stimmeAufnehmen: "Record",
    stimmeStoppen: "Stop",
    stimmeSpeichern: "Save",
    stimmeLoeschen: "Delete",
    stimmeLaeuft: "Recording — speak as if you were telling one person about this work.",
    stimmeErklaerung: "Whoever scans the code on your poster hears you. Say what the work is, and what was going on when you painted it. One minute is plenty.",
    stimmeKeinMikro: "We cannot reach your microphone. Allow it in the browser and try again.",
    stimmeKeinBrowser: "This browser cannot record. Chrome, Safari or Firefox can.",
    stimmeFehler: "That did not work. Please try again.",
    stimmeGespeichert: "Saved — your voice is now behind the code.",
    /* ── DAS ORIGINAL WIRD GEFRAGT, NICHT GEKAUFT (Owner 17.09.2026: „dort wo man die Poster
       kauft kann man auch das original anfragen aber nicht kaufen") ─────────────────────── */
    originalAnfragen: "Ask about the original",
    stimmeNurTon: "Voice only",
    stimmeNurHoeren: "Don't show the video — play my voice only",
    hgAus: "No background", hgBlur: "Blurred", hgWerk: "The work",
    spiegelnWort: "Flip image",
    musikWort: "Music",
    stimmeNochmal: "Record again",
    stimmeWeiter: "tap for next",
    /* ── DEIN PORTRÄT IM STIL DES KÜNSTLERS (Owner 17.09.2026) ─────────────────────────────── */
    stimmeMitVideo: "With video",
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
    /* Nur auf den Reproduktions-Seiten (Owner 15.09.2026: „wir müssen doch den usern wählen
       können was er haben will, print auf papier, auf leinwand"). */
    /* Bei einer Reproduktion sprechen WIR, nicht der tote Maler (Owner 15.09.2026, gesehen im
       Test: «Vincent van Gogh te sună personal»). */
    druckPreisText: "The price depends on size and material.",
    druckJaText: "Leave us your name and phone number — we will get back to you with the price.",
    druckDanke: "Thank you! We will call you about size, material and price.",
    druckWaehlen: "Choose material and size.",
    druckDatenschutz: "Payment and delivery address are handled by Stripe.",
    /* Warenkorb und Kaufknopf (Owner 15.09.2026). */
    /* Unter dem QR-Code — sonst ist er nur ein Muster (Owner 15.09.2026). */
    qrScannen: "Scan — music, and the painting tells you its story, like at the museum.",
    /* Platzhalter der grossen Zeile im Poster (Owner 17.09.2026: „your name drin stehen, dann
       verstehen es die leute") — der Kunde überschreibt sie. */
    deinName: "Your name",
    posterWand: "Scan it and the painting tells you its story.",
    /* ── KEIN VIDEO VERSPRECHEN (Owner 16.09.2026: „wir werden nicht alle animieren aber sound
       hinzufügen ja. also wir dürfen video nicht erwähnen") ─────────────────────────────────
       Animiert wird nur ein Teil der Werke; Musik und Geschichte bekommt jedes. Ein Versprechen,
       das bei der Hälfte nicht eingelöst wird, ist schlimmer als gar keines — also steht überall
       nur, was überall stimmt. */
    posterErklaerung: "A printed poster like any other — until you scan it. Then the music starts and its story appears on your phone: who painted it, when, and why. Like at the museum, only on your own wall.",
    kaufKaufen: "Buy",
    kaufKorb: "Add to basket",
    kaufGroesse: "Size",
    korbTitel: "Basket",
    korbVersand: "Delivery",
    korbSumme: "Total",
    korbKasse: "Checkout",
    korbWeg: "Remove",
    korbLeeren: "Empty basket",
    korbFehler: "That didn't work. Please try again.",
    druckKaufen: "Order now",
    /* ── DER VERKAUFSSATZ STEHT UNTER DER KACHEL, NICHT AUF DEM POSTER (Owner 16.09.2026:
       „in den Prints steht ein satz das raus muss Noi vindem printuri … Das muss unter dem
       Kachel") ─────────────────────────────────────────────────────────────────────────────
       Auf dem Poster liest man die Geschichte des Bildes; ein Verkaufssatz mittendrin macht
       aus dem Museumsschild eine Anzeige. Unter der Kachel, direkt über der Grössenwahl, ist
       er genau da, wo er gebraucht wird. */
    druckVerkauf: "We sell prints of this painting, in the size you choose.",
    /* ── WARUM ES BEIM LEBENDEN KÜNSTLER MEHR KOSTET (Owner 16.09.2026: „hier muss noch info
       dazu warum sie so teuer sind bei den lebendigen künstlern, wegen lizenz. das geht an sie
       direkt") ──────────────────────────────────────────────────────────────────────────────
       Ein Van Gogh für 29 € und daneben dasselbe Format für 49 € sieht nach Willkür aus, wenn
       niemand den Grund nennt. Der Grund ist gut: Das Werk gehört jemandem, der noch lebt, und
       er wird dafür bezahlt. Gesagt kauft man lieber; verschwiegen wirkt es teuer. */
    druckVerkaufKuenstler: "We sell prints of this work, in the size you choose. The price includes a licence fee of {anteil}, which goes straight to the artist.",
    druckVersandDrin: "Printed to order. Delivery in Romania {versand}.",
    druckAb: "from {preis}",
    druckTricou: "Black T-shirt",
    druckHanorac: "Black hoodie",
    druckMaterial: "Reproduction on",
    druckPapier: "Living Poster",
    /* ── DER RAHMEN IST TEIL DES DRUCKS, UND DAS STEHT IN SEINEM NAMEN (Owner 16.09.2026: „wir
       schreiben gar nicht ohne rahmen" · „schreiben aber dass es ein print ist") ────────────
       Ohne diesen Zusatz erwartet jemand ein Blatt in einer Leiste und packt Papier aus. Ein
       Wort in der Auswahl verhindert die Enttäuschung — und erklärt nebenbei, warum es nichts
       extra kostet. */
    druckOhneRahmen: "Print",
    /* Die Wahl in der Rahmenzeile — „Print" ist oben die Ware (Owner 17.09.2026:
       „Print gibts auch ohne Rahmen"): das blanke Blatt, gleicher Preis. */
    ohneRahmenWahl: "Without frame",
    /* ── DIE DATEI (Owner 16.09.2026: „als datei zu herunterladen 5 euro" · „das ist die datei
       die auch an den printshop geht dann") ─────────────────────────────────────────────────
       Dasselbe Druck-PDF, das unsere Druckerei bekommt. Wer selbst drucken lassen will, kauft
       es; wer es bequem will, bestellt das Poster. */
    dateiKaufen: "Download the file",
    /* Der Knopf auf der Seite hinter dem QR-Code: Ton startet nur nach einer Berührung — das
       verlangt jeder Browser (Owner 16.09.2026: „und es hat kein sound"). */
    filmStarten: "Play with music",
    /* Die Wege aus dem QR-Fenster (Owner 16.09.2026: „hier müssen eins, zwei buttons je nachdem
       ob lebender künstler oder nicht. Original kaufen · Poster kaufen"). */
    kaufOriginal: "Buy the original",
    /* Die Wahl im Agentenfenster, wenn es das Werk auch als Poster gibt (Owner 16.09.2026:
       „falls Poster gibt's das Bild vom Poster und das Original — Kunde muss wählen was er
       kaufen will"). */
    agentWahl: "This work is available in two ways:",
    agentWahlOriginal: "The original",
    agentWahlPoster: "As a Living Poster",
    kaufPoster: "Buy the poster",
    dateiErklaerung: "The print-ready file (PDF) — the same one our print shop gets. Print it wherever you like, as often as you like.",
    druckMitRahmen: "With light wood frame",
    /* Die Wahl „gerahmt oder nicht" — die Farbe kommt danach als Fleck (Owner 17.09.2026). */
    mitRahmenWahl: "With wood frame",
    druckRahmenSchwarz: "With black wood frame",
    /* Dieselbe Wahl, aber für die Druckdatei (Owner 17.09.2026) — „Print (…)" stand dort ein
       zweites Mal und las sich, als bestelle man noch ein Papier. */
    dateiSchwarz: "File with black frame",
    dateiHolz: "File with light frame",
    dateiOhne: "File without frame",
    druckLeinwand: "Canvas",
    druckGroesse: "Size",
    druckGroesseAndere: "Another size",
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
    /* Der Reiter heisst wie die Überschrift (Owner 16.09.2026: „Lucrări soll heissen Lucrări
       originale") — „Werke" allein sagt nicht, dass es Unikate sind. */
    tabWerke: "Original works",
    tabReproduktionen: "Living Poster",
    /* Der erste Reiter — die Startseite mit einem Auszug aus jeder Kategorie (Owner 16.09.2026:
       „die tabs brauchen wir doch und das ist die startseite tab"). */
    tabStart: "Home",
    /* ── DIE ÜBERSCHRIFTEN AUF DER STARTSEITE SIND LÄNGER ALS DIE REITER (Owner 16.09.2026:
       „noch besser machen, die gehen unter auf der seite. Das sind die wichtigsten. Lucrari
       originale..de la artisti zeitgenössischer…") ─────────────────────────────────────────
       Ein Reiter hat vier Zeichen Platz, eine Überschrift eine ganze Zeile. „Lucrări" sagt
       nicht, was es ist; „Lucrări originale" sagt es. */
    teaserKuenstler: "Contemporary artists",
    teaserWerke: "Original works",
    tabKuenstler: "Artists",
    /* ── UNTER JEDEM REITER STEHT, WAS ER IST (Owner 16.09.2026: „du musst direkt unter der
       kategorie Poster viu erklären was das ist · auch unter Artiști · Lucrări, hier sind
       originale") ────────────────────────────────────────────────────────────────────────────
       Drei Reiter nebeneinander sehen aus wie drei Sortierungen derselben Sache. Sie sind aber
       drei verschiedene Dinge: Menschen, Originale, Drucke. Ein Satz je Reiter kostet eine
       Zeile und erspart den Irrtum, den Van Gogh für 48 € für ein Original zu halten. */
    tabTextKuenstler: "The artists on lakatosbandi.com. Every work comes with the sentence that says what makes it rare.",
    tabTextWerke: "Originals by contemporary artists — one of each, straight from the person who made it.",
    /* ── HIER STAND EIN SATZ, DER NICHTS VERKAUFT (Owner 16.09.2026: „kann man die kaufen? wie
       und wo? das hast du aber lieblos beschrieben") ────────────────────────────────────────
       Er beschrieb den Code und verschwieg, dass es eine Ware ist. Wer davorsteht, will wissen:
       kann ich das haben, in welcher Grösse, was kostet es, kommt es zu mir. Der Preis kommt aus
       der Drucktabelle ({von}) — nie abgeschrieben (Skill `bezahlung`, Regel 2). */
    tabTextRepro: "A printed poster — until you scan it. Then your phone plays the music and tells you the story of the work. A3, A2, A1, in a real wooden frame or without. From {von}.",
    /* „Weiter" auf der Startseite (Owner 16.09.2026: „ein auszug aus jeder kategorie mit weiter"). */
    alleAnsehen: "See all",
    /* Der Knopf unter den Postern, wenn es mehr gibt als vier (Owner 16.09.2026: „4 werke zeigen
       und mehr button"). */
    mehrWerke: "Show all {n} works",
    /* Der Ausklapper unter langen Texten (Owner 16.09.2026: „die texte sind zu lang. bitte zum
       ausklappen machen nach 4 zeilen"). */
    mehrLesen: "Read more",
    /* Das Häkchen in seinem Formular (Owner 16.09.2026: „er muss aber ankreuzen: ich will meine
       bilder als Poster viu verkaufen"). */
    posterViuJa: "I want to sell my works as Living Posters too.",
    /* Am einzelnen Werk (Owner 16.09.2026: „auch bei jedem bild"). */
    posterViuWerk: "Offer as Living Poster",
    kunstWerk: "Customers can generate their own picture in this style",
    kunstPremium: "Premium",
    /* Der Stilnachweis auf einem erzeugten Blatt (Owner 18.09.2026: „auf jedem erzeugten
       bild in ihrem stil kommt der name rein … und ihre adresse"). */
    stilNachweis: "in the style of {name}",
    /* ── UNSERE HALTUNG, ALS MARKE (Owner 18.09.2026: „ich weiss, dass Temu dreist die Kunst
       kopieren und auf T-Shirts drucken und verkaufen. Das soll bei uns nicht sein" ·
       „dafür wollen wir bekannt werden und schreiben auch in unsere Philosophie" ·
       „alles was in unserem Shop gekauft wurde ist Artist Fair"). Der Betrag kommt aus
       der Drucktabelle (Skill `bezahlung`, Regel 2), nie getippt. */
    philoTitel: "Respect the Artist",
    /* Die Mail an den Künstler, sobald etwas von ihm verkauft wurde (Owner 18.09.2026:
       „dann müssen wir es einrichten, dass der Künstler eine E-Mail bekommt"). */
    lizenzMailBetreff: "Your art has been sold",
    lizenzMailHallo: "Hello {name},",
    lizenzMailWas: "Someone just ordered a print of your work. {betrag} licence goes to you — on top of our price, not deducted from yours.",
    lizenzMailWeiter: "We will pay it out at the end of the month. The order is printed and shipped by us; you do not have to do anything.",
    philoText: "AI theft cannot be stopped. Temu prints your painting on a T-shirt, and Meta trains its AI on what you post on Instagram — both are already happening, and the artist usually finds out from someone else's photos.\n\nWe cannot prevent that. What we can do is run a shop for people with a conscience. Here nothing is sold in someone's style unless that someone is named, linked and paid. Every piece says whose style it was made in and where to find them. Every order pays a licence to the artist.\n\nArtist Fair: everything you buy here was paid to the person who created it.",    posterViuPremium: "Living Poster is part of Premium. Subscribe, and your works can be sold as posters.",
    posterViuErklaerung: "You get {anteil} for every poster of yours that we sell — on top of our price, not out of your pocket. Your works then also appear in the Living Poster category and can be ordered as prints, printed to order, with a QR code that plays music and tells your story. Your originals stay yours and stay untouched. You can undo this at any time.",
    wenigerLesen: "Less",
    seiteWeiter: "Next",
    seiteZurueck: "Back",
    werkeZahl: "{n} works",
    /* Solange `aufbauSeit` steht: Seine Seite existiert schon, die Werke sind noch unterwegs. */
    aufbau: "Your works are being uploaded right now. This page fills up in a moment — please reload it shortly.",
    vertritt: "This image represents me",
  },
  ro: {
    unter: "Marketing for Art",
    titel: "Descoperă artă — Artist Fair.",
    lead: "Artiști selectați. Fiecare lucrare vine cu fraza care spune ce o face rară. Te interesează? Vorbește cu agentul artistului.",
    leer: "Primii artiști sunt verificați chiar acum. Revino în curând.",
    anmelden: "Login artist",
    preiseWort: "Prețuri",
    texteUeberschreiben: "Frazele de sub lucrările tale au fost scrise de algoritmul nostru. Le poți rescrie oricând — ce scrii tu rămâne.",
    ueberUnsWort: "Despre",
    kontaktWort: "Contact",
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
    agentKurz: "Vorbește cu agentul",
    werke: "Originale",
    werkeReproduktionen: "Living Poster",
    werkeKleidung: "Îmbrăcăminte",
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
    dankeTitel: "Mulțumim — comanda ta a ajuns la noi.",
    dankeNummer: "Numărul comenzii tale:",
    dankeDruck: "Tipărim lucrarea și ți-o trimitem. Primești un mesaj când pleacă coletul.",
    dankeDatei: "Fișierul pentru tipar este pe drum spre tine, pe e-mail. Dacă nu îl găsești, verifică și folderul spam.",
    dankeMail: "Confirmarea a plecat spre {mail}.",
    dankeWeiter: "Înapoi la lucrări",
    dankeUnklar: "Nu găsim această plată. Dacă ai fost debitat, scrie-ne.",
    stimmeTitel: "Vocea ta pe această lucrare",
    stimmeProfilErklaerung: "Înregistrează-te o singură dată, în fața uneia dintre lucrările tale: cine ești, ce pictezi, de ce. Înregistrarea rulează apoi în fiecare fereastră QR, lângă arta ta — pe fiecare poster pe care cineva îl agață pe perete.",
    stimmePremium: "Înregistrarea face parte din Premium.",
    stimmeAufnehmen: "Înregistrează",
    stimmeStoppen: "Stop",
    stimmeSpeichern: "Salvează",
    stimmeLoeschen: "Șterge",
    stimmeLaeuft: "Se înregistrează — vorbește ca și cum ai povesti unui singur om despre lucrare.",
    stimmeErklaerung: "Cine scanează codul de pe posterul tău te aude pe tine. Spune ce e lucrarea și ce era în tine când ai pictat-o. Un minut e suficient.",
    stimmeKeinMikro: "Nu ajungem la microfon. Permite-l în browser și încearcă din nou.",
    stimmeKeinBrowser: "Acest browser nu poate înregistra. Chrome, Safari sau Firefox pot.",
    stimmeFehler: "Nu a mers. Te rog încearcă din nou.",
    stimmeGespeichert: "Salvat — vocea ta e acum în spatele codului.",
    originalAnfragen: "Întreabă de original",
    stimmeNurTon: "Doar vocea",
    stimmeNurHoeren: "Nu arăta video — redă doar vocea mea",
    hgAus: "Fără fundal", hgBlur: "Neclar", hgWerk: "Lucrarea",
    spiegelnWort: "Întoarce imaginea",
    musikWort: "Muzică",
    stimmeNochmal: "Încă o dată",
    stimmeWeiter: "atinge pentru următorul",
    stimmeMitVideo: "Cu video",
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
    druckPreisText: "Prețul depinde de dimensiune și material.",
    druckJaText: "Lasă-ne numele și telefonul — revenim cu prețul.",
    druckDanke: "Mulțumim! Te sunăm pentru dimensiune, material și preț.",
    druckWaehlen: "Alege materialul și dimensiunea.",
    druckDatenschutz: "Plata și adresa de livrare se fac prin Stripe.",
    qrScannen: "Scanează — muzică, iar tabloul îți spune povestea lui, ca la muzeu.",
    deinName: "Numele tău",
    posterWand: "Îl scanezi și tabloul îți spune povestea lui.",
    posterErklaerung: "Un poster tipărit, ca oricare altul — până îl scanezi. Atunci pornește muzica, iar pe telefon îți apare povestea lui: cine l-a pictat, când și de ce. Ca la muzeu, doar că e pe peretele tău.",
    kaufKaufen: "Cumpără",
    kaufKorb: "Adaugă în coș",
    kaufGroesse: "Dimensiune",
    korbTitel: "Coșul tău",
    korbVersand: "Livrare",
    korbSumme: "Total",
    korbKasse: "Finalizează comanda",
    korbWeg: "Scoate",
    korbLeeren: "Golește coșul",
    korbFehler: "N-a mers. Mai încearcă o dată.",
    druckKaufen: "Comandă acum",
    druckVerkauf: "Noi vindem printuri după acest tablou, în dimensiunea pe care o alegi.",
    druckVerkaufKuenstler: "Noi vindem printuri după această lucrare, în dimensiunea pe care o alegi. Prețul include o licență de {anteil}, care merge direct la artist.",
    druckVersandDrin: "Printat la comandă. Livrare în România {versand}.",
    druckAb: "de la {preis}",
    druckTricou: "Tricou negru",
    druckHanorac: "Hanorac negru",
    druckMaterial: "Reproducere pe",
    druckPapier: "Living Poster",
    druckOhneRahmen: "Print",
    ohneRahmenWahl: "Fără ramă",
    dateiKaufen: "Descarcă fișierul",
    filmStarten: "Pornește cu muzică",
    kaufOriginal: "Cumpără originalul",
    agentWahl: "Lucrarea există în două feluri:",
    agentWahlOriginal: "Originalul",
    agentWahlPoster: "Ca Living Poster",
    kaufPoster: "Cumpără posterul",
    dateiErklaerung: "Fișierul pregătit pentru tipar (PDF) — același pe care îl primește și tipografia noastră. Îl tipărești unde vrei și de câte ori vrei.",
    druckMitRahmen: "Cu ramă de lemn deschis",
    mitRahmenWahl: "Cu ramă de lemn",
    druckRahmenSchwarz: "Cu ramă de lemn neagră",
    dateiSchwarz: "Fișier cu ramă neagră",
    dateiHolz: "Fișier cu ramă deschisă",
    dateiOhne: "Fișier fără ramă",
    druckLeinwand: "Pânză",
    druckGroesse: "Dimensiune",
    druckGroesseAndere: "Altă dimensiune",
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
    tabWerke: "Lucrări originale",
    tabReproduktionen: "Living Poster",
    tabStart: "Acasă",
    teaserKuenstler: "Artiști contemporani",
    teaserWerke: "Lucrări originale",
    tabKuenstler: "Artiști",
    tabTextKuenstler: "Artiștii de pe lakatosbandi.com. Fiecare lucrare vine cu fraza care spune ce o face rară.",
    tabTextWerke: "Lucrări originale de la artiști contemporani — câte una singură, direct de la cel care a făcut-o.",
    tabTextRepro: "Un poster tipărit — până îl scanezi. Atunci telefonul pornește muzica și îți spune povestea lucrării. A3, A2, A1, cu ramă adevărată de lemn sau fără. De la {von}.",
    alleAnsehen: "Vezi tot",
    mehrWerke: "Vezi toate cele {n} lucrări",
    mehrLesen: "Citește mai mult",
    posterViuJa: "Vreau să-mi vând lucrările și ca Living Poster.",
    posterViuWerk: "Oferă ca Living Poster",
    kunstWerk: "Clienții pot genera propria imagine în acest stil",
    kunstPremium: "Premium",
    stilNachweis: "după stilul lui {name}",
    philoTitel: "Respect the Artist",
    lizenzMailBetreff: "Arta ta s-a vândut",
    lizenzMailHallo: "Bună, {name},",
    lizenzMailWas: "Cineva tocmai a comandat un print după lucrarea ta. {betrag} licență merg la tine — se adaugă la prețul nostru, nu se scade din al tău.",
    lizenzMailWeiter: "Îți plătim la sfârșitul lunii. Comanda o tipărim și o expediem noi; tu nu trebuie să faci nimic.",
    philoText: "Furtul prin AI nu poate fi oprit. Temu îți tipărește tabloul pe un tricou, iar Meta își antrenează inteligența artificială cu ce postezi pe Instagram — se întâmplă deja, iar artistul află de obicei din pozele altora.\n\nNoi nu putem împiedica asta. Ce putem face: un shop pentru oamenii care au conștiință. Aici nu se vinde nimic în stilul cuiva fără ca acel cineva să fie numit, legat și plătit. Pe fiecare lucrare scrie după stilul cui este făcută și unde îl găsești. Din fiecare comandă se plătește o licență artistului.\n\nArtist Fair: tot ce cumperi aici a fost plătit celui care l-a creat.",    posterViuPremium: "Living Poster face parte din Premium. Abonează-te și lucrările tale pot fi vândute ca postere.",
    posterViuErklaerung: "Primești {anteil} pentru fiecare poster al tău vândut — se adaugă la prețul nostru, nu se scade din al tău. Lucrările tale apar și în categoria Living Poster și pot fi comandate ca print, tipărite la comandă, cu un cod QR care pornește muzica și spune povestea ta. Originalele rămân ale tale și rămân neatinse. Poți renunța oricând.",
    wenigerLesen: "Mai puțin",
    seiteWeiter: "Înainte",
    seiteZurueck: "Înapoi",
    werkeZahl: "{n} lucrări",
    aufbau: "Lucrările tale se încarcă chiar acum. Pagina se completează în câteva momente — reîncarc-o în scurt timp.",
    vertritt: "Această imagine mă reprezintă",
  },
  de: {
    unter: "Marketing for Art",
    titel: "Entdecke Kunst — Artist Fair.",
    lead: "Ausgewählte Künstler. Zu jedem Werk steht der Satz, der sagt, was es selten macht. Interessiert? Sprich mit dem Agenten des Künstlers.",
    leer: "Die ersten Künstler werden gerade geprüft. Schau bald wieder vorbei.",
    anmelden: "Login für Künstler",
    preiseWort: "Preise",
    texteUeberschreiben: "Die Sätze unter deinen Werken hat unser Algorithmus geschrieben. Überschreib jeden davon — dein eigener Text gilt immer.",
    ueberUnsWort: "Über uns",
    kontaktWort: "Kontakt",
    anmeldenKurz: "Login",
    fuerKuenstler: "Bist du Künstler?",
    fuerKuenstlerText: "Zeig uns deine Werke — wir finden die Käufer, die sie schätzen.",
    fuerKuenstlerKnopf: "Kostenlos starten",
    seiteInEinerMinute: "Melde dich als Künstler an. Dieser Tage noch gratis.",
    agent: "Interessiert an meiner Kunst? Sprich mit meinem Agenten.",
    agentKurz: "Mit dem Agenten sprechen",
    werke: "Originale",
    werkeReproduktionen: "Living Poster",
    werkeKleidung: "Kleidung",
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
    dankeTitel: "Danke — deine Bestellung ist bei uns.",
    dankeNummer: "Deine Bestellnummer:",
    dankeDruck: "Wir drucken das Poster und schicken es dir. Du bekommst eine Nachricht, wenn das Paket rausgeht.",
    dankeDatei: "Die Druckdatei ist per Mail zu dir unterwegs. Falls sie nicht da ist, schau auch im Spam-Ordner nach.",
    dankeMail: "Die Bestätigung ging an {mail}.",
    dankeWeiter: "Zurück zu den Werken",
    dankeUnklar: "Diese Zahlung finden wir nicht. Falls dir Geld abgebucht wurde, schreib uns.",
    stimmeTitel: "Deine Stimme zu diesem Werk",
    stimmeProfilErklaerung: "Nimm dich EINMAL auf, vor einem deiner Werke: wer du bist, was du malst, warum. Die Aufnahme läuft danach in jedem QR-Fenster neben deiner Kunst — auf jedem Poster, das jemand an die Wand hängt.",
    stimmePremium: "Die Aufnahme gehört zu Premium.",
    stimmeAufnehmen: "Aufnehmen",
    stimmeStoppen: "Stopp",
    stimmeSpeichern: "Speichern",
    stimmeLoeschen: "Löschen",
    stimmeLaeuft: "Nimmt auf — sprich, als würdest du einem einzelnen Menschen von dem Werk erzählen.",
    stimmeErklaerung: "Wer den Code auf deinem Poster scannt, hört dich. Sag, was das Werk ist und wie es dir dabei ging. Eine Minute reicht.",
    stimmeKeinMikro: "Wir kommen nicht ans Mikrofon. Erlaub es im Browser und versuch es noch einmal.",
    stimmeKeinBrowser: "Dieser Browser kann nicht aufnehmen. Chrome, Safari oder Firefox können es.",
    stimmeFehler: "Das hat nicht geklappt. Bitte noch einmal.",
    stimmeGespeichert: "Gespeichert — deine Stimme liegt jetzt hinter dem Code.",
    originalAnfragen: "Nach dem Original fragen",
    stimmeNurTon: "Nur Stimme",
    stimmeNurHoeren: "Video nicht zeigen — nur meine Stimme abspielen",
    hgAus: "Ohne Hintergrund", hgBlur: "Verwischt", hgWerk: "Das Werk",
    spiegelnWort: "Bild umdrehen",
    musikWort: "Musik",
    stimmeNochmal: "Noch einmal",
    stimmeWeiter: "tippen für weiter",
    stimmeMitVideo: "Mit Video",
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
    druckPreisText: "Der Preis hängt von Größe und Material ab.",
    druckJaText: "Hinterlass uns Namen und Telefonnummer — wir melden uns mit dem Preis.",
    druckDanke: "Danke! Wir rufen dich wegen Größe, Material und Preis an.",
    druckWaehlen: "Wähle Material und Größe.",
    druckDatenschutz: "Zahlung und Lieferadresse laufen über Stripe.",
    qrScannen: "Scannen — Musik, und das Bild erzählt seine Geschichte, wie im Museum.",
    deinName: "Dein Name",
    posterWand: "Scannen — und das Bild erzählt dir seine Geschichte.",
    posterErklaerung: "Ein gedrucktes Poster wie jedes andere — bis du es scannst. Dann beginnt die Musik, und auf dem Telefon steht seine Geschichte: wer es gemalt hat, wann und warum. Wie im Museum, nur an deiner eigenen Wand.",
    kaufKaufen: "Kaufen",
    kaufKorb: "In den Korb",
    kaufGroesse: "Größe",
    korbTitel: "Warenkorb",
    korbVersand: "Lieferung",
    korbSumme: "Summe",
    korbKasse: "Zur Kasse",
    korbWeg: "Entfernen",
    korbLeeren: "Korb leeren",
    korbFehler: "Das hat nicht geklappt. Bitte noch einmal.",
    druckKaufen: "Jetzt bestellen",
    druckVerkauf: "Wir verkaufen Drucke dieses Bildes, in der Grösse, die du wählst.",
    druckVerkaufKuenstler: "Wir verkaufen Drucke dieses Werks, in der Grösse, die du wählst. Im Preis steckt eine Lizenz von {anteil}, die direkt an den Künstler geht.",
    druckVersandDrin: "Auf Bestellung gedruckt. Lieferung nach Rumänien {versand}.",
    druckAb: "ab {preis}",
    druckTricou: "T-Shirt, schwarz",
    druckHanorac: "Hoodie, schwarz",
    druckMaterial: "Reproduktion auf",
    druckPapier: "Living Poster",
    druckOhneRahmen: "Print",
    ohneRahmenWahl: "Ohne Rahmen",
    dateiKaufen: "Datei herunterladen",
    filmStarten: "Mit Musik abspielen",
    kaufOriginal: "Original kaufen",
    agentWahl: "Das Werk gibt es auf zwei Arten:",
    agentWahlOriginal: "Das Original",
    agentWahlPoster: "Als Living Poster",
    kaufPoster: "Poster kaufen",
    dateiErklaerung: "Die druckfertige Datei (PDF) — dieselbe, die auch unsere Druckerei bekommt. Druck sie, wo du willst, so oft du willst.",
    druckMitRahmen: "Mit hellem Holzrahmen",
    mitRahmenWahl: "Mit Holzrahmen",
    druckRahmenSchwarz: "Mit schwarzem Holzrahmen",
    dateiSchwarz: "Datei mit schwarzem Rahmen",
    dateiHolz: "Datei mit hellem Rahmen",
    dateiOhne: "Datei ohne Rahmen",
    druckLeinwand: "Leinwand",
    druckGroesse: "Größe",
    druckGroesseAndere: "Andere Größe",
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
    tabWerke: "Originale",
    tabReproduktionen: "Living Poster",
    tabStart: "Start",
    teaserKuenstler: "Zeitgenössische Künstler",
    teaserWerke: "Originale",
    tabKuenstler: "Künstler",
    tabTextKuenstler: "Die Künstler auf lakatosbandi.com. Zu jedem Werk steht der Satz, der sagt, was es selten macht.",
    tabTextWerke: "Originale von zeitgenössischen Künstlern — jedes nur einmal, direkt von dem, der es gemacht hat.",
    tabTextRepro: "Ein gedrucktes Poster — bis du es scannst. Dann spielt das Telefon die Musik und erzählt dir die Geschichte des Werks. A3, A2, A1, im echten Holzrahmen oder ohne. Ab {von}.",
    alleAnsehen: "Alle ansehen",
    mehrWerke: "Alle {n} Werke ansehen",
    mehrLesen: "Mehr lesen",
    posterViuJa: "Ich will meine Werke auch als Living Poster verkaufen.",
    posterViuWerk: "Als Living Poster anbieten",
    kunstWerk: "Kunden erzeugen ihr eigenes Bild in diesem Stil",
    kunstPremium: "Premium",
    stilNachweis: "im Stil von {name}",
    philoTitel: "Respect the Artist",
    lizenzMailBetreff: "Deine Kunst wurde verkauft",
    lizenzMailHallo: "Hallo {name},",
    lizenzMailWas: "Gerade hat jemand einen Druck nach deinem Werk bestellt. {betrag} Lizenz gehen an dich — oben auf unseren Preis, nicht von deinem abgezogen.",
    lizenzMailWeiter: "Wir zahlen sie zum Monatsende aus. Gedruckt und verschickt wird von uns; du musst nichts tun.",
    philoText: "KI-Diebstahl lässt sich nicht stoppen. Temu druckt dein Bild auf ein T-Shirt, und Meta trainiert seine KI mit dem, was du auf Instagram postest — beides passiert längst, und der Künstler erfährt es meist aus fremden Fotos.\n\nWir können das nicht verhindern. Was wir können: einen Shop für Leute mit Gewissen. Hier wird nichts im Stil von jemandem verkauft, ohne dass dieser jemand genannt, verlinkt und bezahlt wird. Auf jedem Stück steht, nach wessen Stil es gemacht ist und wo man ihn findet. Von jeder Bestellung geht eine Lizenz an den Künstler.\n\nArtist Fair: Alles, was du hier kaufst, wurde dem bezahlt, der es geschaffen hat.",    posterViuPremium: "Living Poster gehört zu Premium. Mit dem Abo können deine Werke als Poster verkauft werden.",
    posterViuErklaerung: "Du bekommst {anteil} für jedes verkaufte Poster von dir — oben auf unseren Preis, nicht von deinem Anteil abgezogen. Deine Werke erscheinen dann zusätzlich in der Kategorie Living Poster und können als Druck bestellt werden, auf Bestellung gedruckt, mit QR-Code, der Musik abspielt und deine Geschichte erzählt. Deine Originale bleiben deine und bleiben unberührt. Du kannst es jederzeit zurücknehmen.",
    wenigerLesen: "Weniger",
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
