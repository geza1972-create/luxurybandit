/**
 * DIE TEXTE DER KAKTUS-SEITE — Englisch und Rumänisch (Owner 28.09.2026: „kannst du das auf
 * rumänisch zeigen" · „dort haben wir doch 3 Sprachen im Header"). Von Hand, nicht über den
 * Übersetzer: Es ist ein Kunsttext, jedes Wort zählt. Dieselben drei Sprachen wie der PortalKopf.
 */
export type Sprache = "en" | "ro" | "de";

export const TEXTE = {
  en: {
    filmPosition: "Position",
    filmTon: "Sound on",
    filmStumm: "Mute",
    filmVollbild: "Full screen",
    filmAria: "The water disappears — film of the installation, 5 seconds",
    filmPlay: "Play film",
    filmPause: "Pause film",
    filmHinweis: "Film · 5 seconds",
    metaTitel: "What Remains When Water Disappears? — Bandi Szidonia",
    metaText:
      "An artistic doctoral research project by Bandi Szidonia exploring water, absence, adaptation, sustainability and the cactus as a symbol of the human condition.",
    heroZeilen: ["What remains", "when water", "disappears?"],
    heroUnter: "An artistic research project by Bandi Szidonia",
    heroAlt:
      "The installation: a figure stands at the edge of a mirror in place of a pool, between cactus sculptures of dry, cracked earth, beneath an image of water",
    trockenAlt: "The same room without water: the ceiling and the floor are dry, cracked earth",
    kaktusAlt: "Cactus sculptures formed to look like dry, cracked earth — bodies shaped by extreme environmental conditions",
    scrollAria: "Scroll to the project",

    absenzMarke: "The absence of water",
    absenzTitel: ["Water is present", "only as an image."],
    absenz: [
      "There is no real water in the installation.",
      "A mirror replaces the pool. An artificial image reconstructs the visual presence of water.",
      "The viewer sees water without having access to water.",
    ],
    absenzBetont: "The image becomes a memory of a resource that is physically absent.",

    zukunftMarke: "A future image",
    zukunftTitel: ["What remains when a resource survives", "only as an image?"],
    mitWasser: "With water",
    ohneWasser: "Without water",
    reglerHinweis: "Drag to see the same room without water.",
    reglerAria: "Compare the room with water and without water",
    zukunft: [
      "The installation is a speculative environment from the near future. It imagines a world in which natural resources remain culturally and visually present — reproduced, displayed, remembered — while becoming physically scarce.",
      "The visitor recognises water and remembers water. But what stands in front of them is a reflection of an image: water as simulation, as memory, as surface.",
    ],

    kaktusMarke: "Cactus as human",
    kaktusTitel: ["The body remembers", "the environment."],
    kaktus: [
      "The cactus sculptures appear to be formed from dry, cracked earth. They are not decorative and not botanical. They are bodies — shaped by extreme conditions.",
      "In Bandi Szidonia’s doctoral research, the cactus stands for the human being: a body that adapts, stores, protects and transforms in order to survive.",
    ],
    kaktusBetont:
      "It is not a symbol of strength. It shows that survival itself leaves traces on the body. When the environment changes, the body changes with it.",
    begriffeAria: "What the cactus represents",
    begriffe: ["Adaptation", "Resilience", "Vulnerability", "Storage", "Protection", "Transformation", "Survival"],
    fragen: ["How much of us is adaptation?", "What do we become when the environment changes?"],

    stilleMarke: "Sustainability",
    stilleTitel: ["What do we understand only", "after it disappears?"],
    paare: [
      ["Reality", "Simulation"],
      ["Resource", "Memory"],
      ["Nature", "Artificial image"],
      ["Presence", "Absence"],
      ["Adaptation", "Loss"],
    ],
    stilleText:
      "The work does not explain. It lets the visitor see water, and withholds it — so that what is missing can be felt before it is understood.",

    forschungMarke: "Doctoral research",
    forschungTitel: "Doctoral Research",
    forschung1:
      "The research examines the cactus as a symbol of the human being and investigates the relationship between body, environment, adaptation, resilience, memory and survival.",
    werkTitel: "What Remains When Water Disappears?",
    forschung2:
      " is both an artistic work and a research instrument. It combines sculpture, space, reflection, artificial water imagery, the human body, materiality and perception — and uses the visitor’s experience as the site where the research question is tested.",
    forschungBetont: "The goal is not a definitive explanation. The installation is built to generate questions.",

    hilfeMarke: "Support the project",
    hilfeTitel: "Support the Project",
    hilfe: [
      "The installation is currently in development. Its realisation depends on financial, technical and institutional partners who share an interest in contemporary art, artistic research and the questions this work raises.",
      "Support may be financial, material, technical or institutional. Every partnership is discussed individually and credited in the exhibition and its documentation.",
    ],
    bedarf: [
      { titel: "Production", punkte: ["Sculptural production", "Materials", "Reflective surfaces", "Large-scale printing"] },
      { titel: "Exhibition", punkte: ["Lighting technology", "Exhibition construction", "Transport and installation", "Exhibition space"] },
      { titel: "Research", punkte: ["Photo and video documentation", "Support for the doctoral research", "Funding and sponsorship"] },
    ],
    partnerKopf: "Potential partners",
    partner: ["Museums", "Galleries", "Universities", "Cultural institutions", "Foundations", "Companies", "Sponsors"],
    kontaktTitel: "Become a Partner",
    kontaktText:
      "Museums, galleries, universities, foundations and companies are invited to get in touch. A project dossier with technical specifications is available on request.",

    fName: "Name",
    fEmail: "Email",
    fInstitution: "Institution / company",
    fOptional: "optional",
    fArt: "Type of support",
    arten: ["Financial", "Material", "Technical", "Institutional"],
    fNachricht: "Message",
    fSenden: "Become a Partner",
    fSendet: "Sending…",
    eName: "Please enter your name.",
    eEmail: "Please enter a valid email address.",
    eNachricht: "Please write a short message.",
    eSenden: "The message could not be sent. Please try again.",
    eNetz: "The message could not be sent. Please check your connection and try again.",
    danke: "Thank you.",
    dankeText: "Your message has reached the studio. We will reply personally.",

    fussRolle: "Artistic Research / Doctoral Research",
    fussProjekt: "Project",
    fussKontakt: "Contact",
    fussAnfragen: "Partnership enquiries",
    fussAtelier: "Studio · [City, Country]",
    fussInstitution: "Institution · [University / Doctoral School]",
  },

  ro: {
    filmPosition: "Poziție",
    filmTon: "Sunet",
    filmStumm: "Fără sunet",
    filmVollbild: "Ecran complet",
    filmAria: "Apa dispare — film al instalației, 5 secunde",
    filmPlay: "Pornește filmul",
    filmPause: "Oprește filmul",
    filmHinweis: "Film · 5 secunde",
    metaTitel: "Ce rămâne când apa dispare? — Bandi Szidonia",
    metaText:
      "Un proiect doctoral de cercetare artistică de Bandi Szidonia despre apă, absență, adaptare, sustenabilitate și cactus ca simbol al condiției umane.",
    heroZeilen: ["Ce rămâne", "când apa", "dispare?"],
    heroUnter: "Un proiect de cercetare artistică de Bandi Szidonia",
    heroAlt:
      "Instalația: o figură stă la marginea unei oglinzi care ține locul unui bazin, între sculpturi de cactus din pământ uscat și crăpat, sub o imagine a apei",
    trockenAlt: "Aceeași încăpere fără apă: tavanul și podeaua sunt pământ uscat și crăpat",
    kaktusAlt: "Sculpturi de cactus modelate ca din pământ uscat și crăpat — corpuri formate de condiții extreme de mediu",
    scrollAria: "Derulează la proiect",

    absenzMarke: "Absența apei",
    absenzTitel: ["Apa este prezentă", "doar ca imagine."],
    absenz: [
      "În instalație nu există apă reală.",
      "O oglindă înlocuiește bazinul. O imagine artificială reconstruiește prezența vizuală a apei.",
      "Privitorul vede apă fără a avea acces la apă.",
    ],
    absenzBetont: "Imaginea devine amintirea unei resurse care lipsește fizic.",

    zukunftMarke: "O imagine a viitorului",
    zukunftTitel: ["Ce rămâne când o resursă supraviețuiește", "doar ca imagine?"],
    mitWasser: "Cu apă",
    ohneWasser: "Fără apă",
    reglerHinweis: "Trage pentru a vedea aceeași încăpere fără apă.",
    reglerAria: "Compară încăperea cu apă și fără apă",
    zukunft: [
      "Instalația este un mediu speculativ din viitorul apropiat. Ea imaginează o lume în care resursele naturale rămân prezente cultural și vizual — reproduse, expuse, amintite — în timp ce devin tot mai rare în realitate.",
      "Vizitatorul recunoaște apa și își amintește de apă. Dar ceea ce are în față este reflexia unei imagini: apa ca simulare, ca amintire, ca suprafață.",
    ],

    kaktusMarke: "Cactusul ca om",
    kaktusTitel: ["Corpul își amintește", "mediul."],
    kaktus: [
      "Sculpturile de cactus par modelate din pământ uscat și crăpat. Nu sunt decorative și nu sunt botanice. Sunt corpuri — formate de condiții extreme.",
      "În cercetarea doctorală a lui Bandi Szidonia, cactusul reprezintă ființa umană: un corp care se adaptează, stochează, protejează și se transformă pentru a supraviețui.",
    ],
    kaktusBetont:
      "Nu este un simbol al forței. Arată că supraviețuirea însăși lasă urme pe corp. Când mediul se schimbă, corpul se schimbă odată cu el.",
    begriffeAria: "Ce reprezintă cactusul",
    begriffe: ["Adaptare", "Reziliență", "Vulnerabilitate", "Stocare", "Protecție", "Transformare", "Supraviețuire"],
    fragen: ["Cât din noi este adaptare?", "Ce devenim când mediul se schimbă?"],

    stilleMarke: "Sustenabilitate",
    stilleTitel: ["Ce înțelegem abia", "după ce dispare?"],
    paare: [
      ["Realitate", "Simulare"],
      ["Resursă", "Amintire"],
      ["Natură", "Imagine artificială"],
      ["Prezență", "Absență"],
      ["Adaptare", "Pierdere"],
    ],
    stilleText:
      "Lucrarea nu explică. Îi arată vizitatorului apa și i-o refuză — pentru ca ceea ce lipsește să fie simțit înainte de a fi înțeles.",

    forschungMarke: "Cercetare doctorală",
    forschungTitel: "Cercetare doctorală",
    forschung1:
      "Cercetarea examinează cactusul ca simbol al ființei umane și investighează relația dintre corp, mediu, adaptare, reziliență, memorie și supraviețuire.",
    werkTitel: "Ce rămâne când apa dispare?",
    forschung2:
      " este în același timp o operă artistică și un instrument de cercetare. Combină sculptura, spațiul, reflexia, imaginea artificială a apei, corpul uman, materialitatea și percepția — iar experiența vizitatorului devine locul în care întrebarea cercetării este pusă la încercare.",
    forschungBetont: "Scopul nu este o explicație definitivă. Instalația este construită pentru a genera întrebări.",

    hilfeMarke: "Sprijină proiectul",
    hilfeTitel: "Sprijină proiectul",
    hilfe: [
      "Instalația este în prezent în curs de dezvoltare. Realizarea ei depinde de parteneri financiari, tehnici și instituționali care împărtășesc interesul pentru arta contemporană, cercetarea artistică și întrebările pe care le ridică această lucrare.",
      "Sprijinul poate fi financiar, material, tehnic sau instituțional. Fiecare parteneriat este discutat individual și menționat în expoziție și în documentația acesteia.",
    ],
    bedarf: [
      { titel: "Producție", punkte: ["Producția sculpturilor", "Materiale", "Suprafețe reflectorizante", "Print de mari dimensiuni"] },
      { titel: "Expoziție", punkte: ["Tehnică de iluminat", "Construcția expoziției", "Transport și instalare", "Spațiu expozițional"] },
      { titel: "Cercetare", punkte: ["Documentație foto și video", "Sprijin pentru cercetarea doctorală", "Finanțare și sponsorizare"] },
    ],
    partnerKopf: "Parteneri posibili",
    partner: ["Muzee", "Galerii", "Universități", "Instituții culturale", "Fundații", "Companii", "Sponsori"],
    kontaktTitel: "Devino partener",
    kontaktText:
      "Muzeele, galeriile, universitățile, fundațiile și companiile sunt invitate să ne contacteze. Un dosar al proiectului, cu specificațiile tehnice, este disponibil la cerere.",

    fName: "Nume",
    fEmail: "Email",
    fInstitution: "Instituție / companie",
    fOptional: "opțional",
    fArt: "Tipul de sprijin",
    arten: ["Financiar", "Material", "Tehnic", "Instituțional"],
    fNachricht: "Mesaj",
    fSenden: "Devino partener",
    fSendet: "Se trimite…",
    eName: "Te rugăm să îți scrii numele.",
    eEmail: "Te rugăm să introduci o adresă de email validă.",
    eNachricht: "Te rugăm să scrii un scurt mesaj.",
    eSenden: "Mesajul nu a putut fi trimis. Te rugăm să încerci din nou.",
    eNetz: "Mesajul nu a putut fi trimis. Verifică conexiunea și încearcă din nou.",
    danke: "Mulțumim.",
    dankeText: "Mesajul tău a ajuns la atelier. Îți vom răspunde personal.",

    fussRolle: "Cercetare artistică / Cercetare doctorală",
    fussProjekt: "Proiect",
    fussKontakt: "Contact",
    fussAnfragen: "Cereri de parteneriat",
    fussAtelier: "Atelier · [Oraș, Țară]",
    fussInstitution: "Instituție · [Universitate / Școală doctorală]",
  },
  de: {
    filmPosition: "Position",
    filmTon: "Ton an",
    filmStumm: "Ton aus",
    filmVollbild: "Vollbild",
    filmAria: "Das Wasser verschwindet — Film der Installation, 5 Sekunden",
    filmPlay: "Film abspielen",
    filmPause: "Film anhalten",
    filmHinweis: "Film · 5 Sekunden",
    metaTitel: "Was bleibt, wenn das Wasser verschwindet? — Bandi Szidonia",
    metaText:
      "Ein künstlerisches Forschungsprojekt im Rahmen der Promotion von Bandi Szidonia über Wasser, Abwesenheit, Anpassung, Nachhaltigkeit und den Kaktus als Sinnbild des Menschen.",
    heroZeilen: ["Was bleibt,", "wenn das Wasser", "verschwindet?"],
    heroUnter: "Ein künstlerisches Forschungsprojekt von Bandi Szidonia",
    heroAlt:
      "Die Installation: Eine Figur steht am Rand eines Spiegels, der ein Becken ersetzt, zwischen Kaktusskulpturen aus trockener, rissiger Erde, unter einem Bild von Wasser",
    trockenAlt: "Derselbe Raum ohne Wasser: Decke und Boden sind trockene, rissige Erde",
    kaktusAlt: "Kaktusskulpturen, die wie aus trockener, rissiger Erde geformt wirken — Körper, geprägt von extremen Umweltbedingungen",
    scrollAria: "Zum Projekt scrollen",

    absenzMarke: "Die Abwesenheit des Wassers",
    absenzTitel: ["Wasser ist nur", "als Bild anwesend."],
    absenz: [
      "In der Installation gibt es kein echtes Wasser.",
      "Ein Spiegel ersetzt das Becken. Ein künstliches Bild rekonstruiert die sichtbare Gegenwart von Wasser.",
      "Man sieht Wasser, ohne Zugang zu Wasser zu haben.",
    ],
    absenzBetont: "Das Bild wird zur Erinnerung an eine Ressource, die physisch fehlt.",

    zukunftMarke: "Ein Bild der Zukunft",
    zukunftTitel: ["Was bleibt, wenn eine Ressource", "nur noch als Bild überlebt?"],
    mitWasser: "Mit Wasser",
    ohneWasser: "Ohne Wasser",
    reglerHinweis: "Ziehe, um denselben Raum ohne Wasser zu sehen.",
    reglerAria: "Den Raum mit und ohne Wasser vergleichen",
    zukunft: [
      "Die Installation ist ein spekulativer Raum aus der nahen Zukunft. Sie stellt sich eine Welt vor, in der natürliche Ressourcen kulturell und visuell gegenwärtig bleiben — reproduziert, ausgestellt, erinnert —, während sie physisch knapp werden.",
      "Man erkennt Wasser und erinnert sich an Wasser. Doch vor einem steht die Spiegelung eines Bildes: Wasser als Simulation, als Erinnerung, als Oberfläche.",
    ],

    kaktusMarke: "Der Kaktus als Mensch",
    kaktusTitel: ["Der Körper erinnert sich", "an seine Umwelt."],
    kaktus: [
      "Die Kaktusskulpturen wirken, als wären sie aus trockener, rissiger Erde geformt. Sie sind nicht dekorativ und nicht botanisch. Sie sind Körper — geformt von extremen Bedingungen.",
      "In Bandi Szidonias Promotionsforschung steht der Kaktus für den Menschen: ein Körper, der sich anpasst, speichert, schützt und verwandelt, um zu überleben.",
    ],
    kaktusBetont:
      "Er ist kein Symbol der Stärke. Er zeigt, dass das Überleben selbst Spuren am Körper hinterlässt. Wenn sich die Umwelt verändert, verändert sich der Körper mit.",
    begriffeAria: "Wofür der Kaktus steht",
    begriffe: ["Anpassung", "Widerstandskraft", "Verletzlichkeit", "Speicher", "Schutz", "Verwandlung", "Überleben"],
    fragen: ["Wie viel von uns ist Anpassung?", "Was werden wir, wenn sich die Umwelt verändert?"],

    stilleMarke: "Nachhaltigkeit",
    stilleTitel: ["Was verstehen wir erst,", "wenn es verschwunden ist?"],
    paare: [
      ["Wirklichkeit", "Simulation"],
      ["Ressource", "Erinnerung"],
      ["Natur", "Künstliches Bild"],
      ["Anwesenheit", "Abwesenheit"],
      ["Anpassung", "Verlust"],
    ],
    stilleText:
      "Die Arbeit erklärt nicht. Sie lässt Wasser sehen und enthält es vor — damit das Fehlende gefühlt wird, bevor es verstanden ist.",

    forschungMarke: "Promotionsforschung",
    forschungTitel: "Promotionsforschung",
    forschung1:
      "Die Forschung untersucht den Kaktus als Sinnbild des Menschen und die Beziehung zwischen Körper, Umwelt, Anpassung, Widerstandskraft, Erinnerung und Überleben.",
    werkTitel: "Was bleibt, wenn das Wasser verschwindet?",
    forschung2:
      " ist zugleich Kunstwerk und Forschungsinstrument. Die Arbeit verbindet Skulptur, Raum, Spiegelung, künstliche Wasserbilder, den menschlichen Körper, Materialität und Wahrnehmung — und macht die Erfahrung der Besucher zu dem Ort, an dem die Forschungsfrage geprüft wird.",
    forschungBetont: "Ziel ist keine endgültige Erklärung. Die Installation ist gebaut, um Fragen zu erzeugen.",

    hilfeMarke: "Das Projekt unterstützen",
    hilfeTitel: "Das Projekt unterstützen",
    hilfe: [
      "Die Installation befindet sich in Entwicklung. Ihre Umsetzung braucht finanzielle, technische und institutionelle Partner, die sich für zeitgenössische Kunst, künstlerische Forschung und die Fragen dieser Arbeit interessieren.",
      "Unterstützung kann finanziell, materiell, technisch oder institutionell sein. Jede Partnerschaft wird einzeln besprochen und in der Ausstellung und ihrer Dokumentation genannt.",
    ],
    bedarf: [
      { titel: "Produktion", punkte: ["Herstellung der Skulpturen", "Material", "Spiegelflächen", "Grossformatdruck"] },
      { titel: "Ausstellung", punkte: ["Lichttechnik", "Ausstellungsbau", "Transport und Aufbau", "Ausstellungsraum"] },
      { titel: "Forschung", punkte: ["Foto- und Videodokumentation", "Unterstützung der Promotion", "Förderung und Sponsoring"] },
    ],
    partnerKopf: "Mögliche Partner",
    partner: ["Museen", "Galerien", "Universitäten", "Kulturinstitutionen", "Stiftungen", "Unternehmen", "Sponsoren"],
    kontaktTitel: "Partner werden",
    kontaktText:
      "Museen, Galerien, Universitäten, Stiftungen und Unternehmen sind eingeladen, Kontakt aufzunehmen. Ein Projektdossier mit technischen Angaben gibt es auf Anfrage.",

    fName: "Name",
    fEmail: "E-Mail",
    fInstitution: "Institution / Unternehmen",
    fOptional: "optional",
    fArt: "Art der Unterstützung",
    arten: ["Finanziell", "Materiell", "Technisch", "Institutionell"],
    fNachricht: "Nachricht",
    fSenden: "Partner werden",
    fSendet: "Wird gesendet…",
    eName: "Bitte gib deinen Namen ein.",
    eEmail: "Bitte gib eine gültige E-Mail-Adresse ein.",
    eNachricht: "Bitte schreib eine kurze Nachricht.",
    eSenden: "Die Nachricht konnte nicht gesendet werden. Bitte versuch es noch einmal.",
    eNetz: "Die Nachricht konnte nicht gesendet werden. Prüf deine Verbindung und versuch es noch einmal.",
    danke: "Danke.",
    dankeText: "Deine Nachricht ist im Atelier angekommen. Wir antworten persönlich.",

    fussRolle: "Künstlerische Forschung / Promotion",
    fussProjekt: "Projekt",
    fussKontakt: "Kontakt",
    fussAnfragen: "Partnerschaftsanfragen",
    fussAtelier: "Atelier · [Stadt, Land]",
    fussInstitution: "Institution · [Universität / Doktoratsschule]",
  },
} as const;

export type Texte = (typeof TEXTE)[Sprache];
