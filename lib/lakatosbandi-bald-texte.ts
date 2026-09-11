import type { Lang } from "@/lib/lang";

/**
 * DIE INHALTE DER „BALD ONLINE"-STARTSEITE (Owner 10.09.2026: „lass dir was einfallen und sagen
 * wieso, weshalb, warum. Mach einige Inhalte da rein." · „Das ist eine Marketingplattform für
 * Künstler").
 *
 * FÜR WEN: Künstler, die über eine Anzeige oder einen geteilten Link kommen. Käufer gibt es auf
 * dieser Fassung der Seite noch nicht — sie wirbt um die ersten Künstler.
 *
 * NUR, WAS GEBAUT IST ODER ENTSCHIEDEN — dieselbe Regel wie auf der VersusForge-Landingpage
 * (lib/versusforge-art-landing-texte.ts): Aufnahme ab drei Werken im selben Stil, Prüfung
 * innerhalb von 3 Tagen, Aktfotografie zurzeit nicht, Abo erst nach drei Interessenten, Verkauf
 * zwischen Künstler und Käufer. Keine Zahlen über Reichweite, keine erfundenen Künstler.
 *
 * DIE STEIN-GESCHICHTE IST WAHR: Gary Dahl, „Pet Rock", 1975, rund 1,5 Millionen verkauft zu je
 * 4 Dollar. Sie ist unser Beweis, dass der Grund, etwas haben zu wollen, verkauft — nicht das Ding.
 *
 * `{preis}` = Abo-Preis aus lib/pricing.ts, wird im Code eingesetzt. Fest geschrieben, nicht
 * übersetzt — Begründung in lib/lakatosbandi-texte.ts.
 */
export type BaldTexte = {
  steinKicker: string;
  steinTitel: string;
  steinFolien: { gross: string; klein: string }[];
  steinSchluss: string;

  warumTitel: string;
  warumText: string[];
  warumRegel: string;

  wasTitel: string;
  was: { t: string; d: string }[];

  /* Owner 10.09.2026: „warum das einzigartig ist? Wir promoten das … Agenten … schalten Werbung
     für … Dashboard, Vorteile". */
  einzigTitel: string;
  einzig: { t: string; d: string }[];

  /* Owner 10.09.2026: „sag unser Prinzip, Marketingprinzip und wie wir rekrutieren" · „es gibt doch einiges". */
  prinzipTitel: string;
  prinzipien: { t: string; d: string }[];
  rekrutTitel: string;
  rekrutLead: string;
  rekrut: { t: string; d: string }[];

  /* Owner 10.09.2026: „mach ein Beispiel noch rein". Gemeinfreies Werk, als Beispiel beschriftet. */
  beispielKicker: string;
  beispielTitel: string;
  beispielVorherLabel: string;
  beispielVorher: string;
  beispielGesehenLabel: string;
  beispielGesehen: string;
  beispielNachherLabel: string;
  beispielNachher: string;
  beispielWarum: string;
  beispielQuelle: string;

  /* Owner 10.09.2026: „Sag einige Wörter über VersusForge". */
  vfKicker: string;
  vfTitel: string;
  vfText: string[];

  /* Owner 10.09.2026: „wer wir sind? Geza Lakatos și Szidonia Bandi. Er Grafiker und AI Developer
     und sie Künstlerin. Beide mit viel Erfahrung in Kunst und Marketing. Ansässig in Rumänien."
     Nur das — keine erfundenen Jahre, Kunden oder Auszeichnungen. */
  werTitel: string;
  werLead: string;
  personen: { name: string; rolle: string }[];
  werText: string[];

  wieTitel: string;
  wie: { t: string; d: string }[];

  auswahlTitel: string;
  auswahlText: string[];

  kostenTitel: string;
  kostenText: string[];

  gruenderTitel: string;
  gruenderText: string[];

  fragenTitel: string;
  fragen: { q: string; a: string }[];

  schlussTitel: string;
  schlussText: string;
};

const EN: BaldTexte = {
  steinKicker: "Why this works",
  steinTitel: "In 1975, someone sold stones from the beach.",
  steinFolien: [
    { gross: "A stone from the beach.", klein: "worth: nothing" },
    { gross: "In a box with air holes.", klein: "still a stone" },
    { gross: "With a manual on how to teach it to sit.", klein: "still a stone" },
    { gross: "Four dollars. 1.5 million sold in six months.", klein: "1975 · Pet Rock" },
  ],
  steinSchluss: "The stone never changed. Only the reason to want it was suddenly there. Your painting can do far more than a stone — it just needs its reason.",

  warumTitel: "Good art does not sell itself",
  warumText: [
    "Most artists post a new work with “new painting available” and wait. Nothing happens — not because the work is weak, but because nobody told the viewer why this piece is different from the thousand others in their feed.",
    "Often the work also sits in the wrong place: tagged in the wrong category, shown to people who collect something else, priced without a reason.",
  ],
  warumRegel: "The first rule of marketing art: find the buyer who values what you make — not just any buyer.",

  wasTitel: "What you get",
  was: [
    { t: "The sentence for every work", d: "What makes this piece rare — its material, its colour, its story. The line that makes people stop scrolling." },
    { t: "Ads for Instagram and Facebook", d: "Your work with its sentence, ready to post. You choose which one." },
    { t: "Your page on lakatosbandi.com", d: "lakatosbandi.com/your-name — your works, each with its sentence." },
    { t: "An agent that talks to buyers", d: "It answers interested people, collects name and phone number and passes them to you. You make the call." },
  ],

  einzigTitel: "What makes it different",
  einzig: [
    { t: "We promote the platform", d: "We run the ads for lakatosbandi.com ourselves — so buyers come to the artists on it, not only to one post of yours." },
    { t: "Your own agent", d: "Every artist gets an agent that answers interested buyers at any hour — while you paint." },
    { t: "Ads made from your work", d: "Not a template: the sentences come from what is really in your paintings. You can run the same ads yourself." },
    { t: "Your dashboard", d: "Every inquiry with name and phone number, your sentences and ads, new works and new sentences whenever you want." },
    { t: "Honest, not flattering", d: "Category and price are discussed openly. An agent that only nods would be worthless to you." },
    { t: "No commission", d: "What you sell is yours. You only pay for the agent once it brings you interested buyers." },
  ],

  prinzipTitel: "Our marketing principles",
  prinzipien: [
    { t: "The reason sells, not the thing", d: "The stone never changed. Your work does not need to change either — it needs its reason, said out loud." },
    { t: "Find the buyer who values it", d: "Not any buyer. The one who collects what you make and is willing to pay for it." },
    { t: "Nothing invented", d: "Every sentence comes from what is really in the work: colour, material, subject, story. No empty superlatives." },
    { t: "One style, one signature", d: "Collectors ask: do you have more of this? An artist who keeps a style builds value." },
    { t: "The right category", d: "Figurative, abstract, landscape, portrait — the right place brings the right people." },
    { t: "An honest price", d: "Unknown artists usually ask 200–1,000 €, known artists 1,000–2,000 €, established artists more. We place your price, we don't flatter it." },
    { t: "Speed wins", d: "Whoever calls back the same day reaches the buyer. That is why your agent collects the phone number and you get it at once." },
  ],
  rekrutTitel: "How we find our artists",
  rekrutLead: "Nobody is simply listed. Every artist goes through the same path:",
  rekrut: [
    { t: "Ads and recommendations", d: "We look for artists through our ads, through social media and through artists who recommend others." },
    { t: "A conversation with our agent", d: "No form: the agent asks about your work, your style and your goals." },
    { t: "Three works in the same style", d: "This is the admission test. Whoever does not have that yet gets an honest sentence about what is missing — and can come back." },
    { t: "Category and price", d: "We place your style and talk about your price before anything is built." },
    { t: "Reviewed by us", d: "A person looks at every artist. Decision within 3 days — approved or declined." },
  ],

  beispielKicker: "Example",
  beispielTitel: "From “new painting” to a reason",
  beispielVorherLabel: "How most artists post",
  beispielVorher: "New painting available. Oil on canvas, 74 × 92 cm.",
  beispielGesehenLabel: "What the agent sees",
  beispielGesehen: "Deep blue night, a swirling sky, glowing stars, a dark cypress in front, a church spire and a small village asleep below.",
  beispielNachherLabel: "The sentence that makes people stop",
  beispielNachher: "The view from his asylum window before sunrise — with a village that was never there.",
  beispielWarum: "The work is the same. Now there is a reason to look twice — and a question the buyer wants answered.",
  beispielQuelle: "Example with a public-domain work: Vincent van Gogh, The Starry Night, 1889 (detail). Painted at the asylum in Saint-Rémy from the view of his window; the village he added from imagination.",

  vfKicker: "Powered by VersusForge",
  vfTitel: "The engine behind the platform",
  vfText: [
    "VersusForge is an AI agent built for one job: marketing. It looks at what you make, finds what is rare about it and turns it into the sentence that makes people stop — and into the ad around it.",
    "On lakatosbandi.com the same engine works for artists: it interviews you, writes your sentences, builds your ads and talks to your buyers.",
  ],

  werTitel: "Who we are",
  werLead: "lakatosbandi.com carries our two names.",
  personen: [
    /* Owner 10.09.2026: „eu sunt nu grafician, ci AI Consultant" · dann „sau mai bine Dipl. Designer?"
       → beides, der Titel ist bestätigt („ca sunt"). */
    { name: "Geza Lakatos", rolle: "Designer (Dipl.) & AI Consultant" },
    { name: "Szidonia Bandi", rolle: "Artist" },
  ],
  werText: [
    "Both of us have many years of experience in art and marketing. We know both sides: making the work — and getting it seen by the people who value it.",
    "We are based in Romania.",
  ],

  wieTitel: "How it works",
  wie: [
    { t: "Show us your work", d: "Talk to our agent and upload at least three works in the same style. It looks at medium, style, subject and what is rare." },
    { t: "Category and price", d: "Together you place your style where it belongs and talk honestly about your price — also when it is uncomfortable." },
    { t: "Sentences and ads", d: "You get a sentence for your works and the ads built from them." },
    { t: "Review and launch", d: "We look at every artist ourselves and decide within 3 days. Approved artists are on lakatosbandi.com." },
  ],

  auswahlTitel: "Why we select",
  auswahlText: [
    "A platform is only as good as the work on it. That is why we accept artists who show at least three works in the same style — a single picture says nothing yet about an artist.",
    "Painted and drawn nudes are welcome. We do not accept nude photography at the moment.",
  ],

  kostenTitel: "What it costs",
  kostenText: [
    "Applying and starting is free: your sentences, your ads, your page and your agent.",
    "Once three interested buyers have contacted you, we ask whether you want to keep your agent for {preis} a month. Cancel monthly.",
    "Sales happen between you and the buyer. We take no commission.",
  ],

  gruenderTitel: "Why join now",
  gruenderText: [
    "When lakatosbandi.com opens to buyers, the first artists on it are the first works they see.",
    "You help shape the platform: what you tell us in these first weeks decides what we build next.",
  ],

  fragenTitel: "Questions",
  fragen: [
    { q: "Do I need to know anything about marketing?", a: "No. The agent asks you questions, looks at your works and builds the sentences and ads with you." },
    { q: "Do you sell my work?", a: "No. We bring you interested buyers with name and phone number. Price and sale are between you and the buyer." },
    { q: "Which languages?", a: "English, Romanian and German. The agent talks to you in your language." },
    { q: "Can I delete everything?", a: "Yes, at any time — your page, your works and all inquiries." },
  ],

  schlussTitel: "Ready to show your work?",
  schlussText: "The conversation takes a few minutes. Have three works in the same style ready.",
};

const RO: BaldTexte = {
  steinKicker: "De ce funcționează",
  steinTitel: "În 1975, cineva a vândut pietre de pe plajă.",
  steinFolien: [
    { gross: "O piatră de pe plajă.", klein: "valoare: nimic" },
    { gross: "Într-o cutie cu găuri de aer.", klein: "tot o piatră" },
    { gross: "Cu un manual despre cum s-o înveți să stea.", klein: "tot o piatră" },
    { gross: "Patru dolari. 1,5 milioane vândute în șase luni.", klein: "1975 · Pet Rock" },
  ],
  steinSchluss: "Piatra nu s-a schimbat niciodată. Doar motivul de a o dori a apărut brusc. Tabloul tău poate mult mai mult decât o piatră — are nevoie doar de motivul lui.",

  warumTitel: "Arta bună nu se vinde singură",
  warumText: [
    "Cei mai mulți artiști postează o lucrare nouă cu „tablou nou disponibil” și așteaptă. Nu se întâmplă nimic — nu pentru că lucrarea e slabă, ci pentru că nimeni nu i-a spus privitorului de ce tocmai această lucrare e diferită de celelalte o mie din feed.",
    "Deseori lucrarea stă și în locul greșit: în categoria greșită, arătată oamenilor care colecționează altceva, cu un preț fără motiv.",
  ],
  warumRegel: "Prima regulă în marketingul de artă: găsește cumpărătorul care apreciază ce faci — nu orice cumpărător.",

  wasTitel: "Ce primești",
  was: [
    { t: "Fraza pentru fiecare lucrare", d: "Ce face lucrarea rară — materialul, culoarea, povestea. Rândul care îi face pe oameni să se oprească din scroll." },
    { t: "Reclame pentru Instagram și Facebook", d: "Lucrarea ta cu fraza ei, gata de postat. Tu alegi care." },
    { t: "Pagina ta pe lakatosbandi.com", d: "lakatosbandi.com/numele-tău — lucrările tale, fiecare cu fraza ei." },
    { t: "Un agent care vorbește cu cumpărătorii", d: "Răspunde celor interesați, strânge numele și telefonul și ți le transmite. Tu suni." },
  ],

  einzigTitel: "Ce ne face diferiți",
  einzig: [
    { t: "Noi promovăm platforma", d: "Facem noi reclamele pentru lakatosbandi.com — ca cumpărătorii să vină la artiștii de pe ea, nu doar la o singură postare a ta." },
    { t: "Agentul tău", d: "Fiecare artist primește un agent care răspunde cumpărătorilor interesați la orice oră — în timp ce tu pictezi." },
    { t: "Reclame făcute din lucrările tale", d: "Nu un șablon: frazele vin din ce e cu adevărat în tablourile tale. Aceleași reclame le poți rula și singur." },
    { t: "Dashboard-ul tău", d: "Fiecare cerere cu nume și telefon, frazele și reclamele tale, lucrări noi și fraze noi oricând vrei." },
    { t: "Sincer, nu măgulitor", d: "Categoria și prețul se discută deschis. Un agent care doar aprobă nu ți-ar folosi la nimic." },
    { t: "Fără comision", d: "Ce vinzi e al tău. Plătești agentul abia după ce îți aduce cumpărători interesați." },
  ],

  prinzipTitel: "Principiile noastre de marketing",
  prinzipien: [
    { t: "Motivul vinde, nu obiectul", d: "Piatra nu s-a schimbat niciodată. Nici lucrarea ta nu trebuie să se schimbe — are nevoie de motivul ei, spus cu voce tare." },
    { t: "Găsește cumpărătorul care o apreciază", d: "Nu orice cumpărător. Pe cel care colecționează ce faci tu și e dispus să plătească pentru asta." },
    { t: "Nimic inventat", d: "Fiecare frază vine din ce e cu adevărat în lucrare: culoare, material, subiect, poveste. Fără superlative goale." },
    { t: "Un stil, o semnătură", d: "Colecționarii întreabă: mai ai de acestea? Un artist care își păstrează stilul își construiește valoarea." },
    { t: "Categoria potrivită", d: "Figurativ, abstract, peisaj, portret — locul potrivit aduce oamenii potriviți." },
    { t: "Un preț sincer", d: "Artiștii necunoscuți cer de obicei 200–1.000 €, cei cunoscuți 1.000–2.000 €, cei consacrați mai mult. Îți încadrăm prețul, nu-l măgulim." },
    { t: "Viteza câștigă", d: "Cine sună înapoi în aceeași zi ajunge la cumpărător. De aceea agentul tău strânge numărul de telefon și îl primești imediat." },
  ],
  rekrutTitel: "Cum ne găsim artiștii",
  rekrutLead: "Nimeni nu e pur și simplu listat. Fiecare artist trece prin același drum:",
  rekrut: [
    { t: "Reclame și recomandări", d: "Căutăm artiști prin reclamele noastre, prin social media și prin artiști care îi recomandă pe alții." },
    { t: "O conversație cu agentul nostru", d: "Fără formular: agentul te întreabă despre lucrările tale, stilul tău și obiectivele tale." },
    { t: "Trei lucrări în același stil", d: "Aceasta este proba de admitere. Cine nu are încă asta primește o frază sinceră despre ce lipsește — și poate reveni." },
    { t: "Categorie și preț", d: "Îți încadrăm stilul și vorbim despre preț înainte să construim ceva." },
    { t: "Verificat de noi", d: "Un om se uită la fiecare artist. Decizie în 3 zile — aprobat sau respins." },
  ],

  beispielKicker: "Exemplu",
  beispielTitel: "De la „tablou nou” la un motiv",
  beispielVorherLabel: "Cum postează cei mai mulți artiști",
  beispielVorher: "Tablou nou disponibil. Ulei pe pânză, 74 × 92 cm.",
  beispielGesehenLabel: "Ce vede agentul",
  beispielGesehen: "O noapte albastru-închis, un cer în vârtejuri, stele strălucitoare, un chiparos întunecat în față, o turlă de biserică și un sat mic adormit dedesubt.",
  beispielNachherLabel: "Fraza care îi face pe oameni să se oprească",
  beispielNachher: "Priveliștea de la fereastra azilului, înainte de răsărit — cu un sat care n-a existat niciodată.",
  beispielWarum: "Lucrarea e aceeași. Acum există un motiv să te uiți a doua oară — și o întrebare la care cumpărătorul vrea un răspuns.",
  beispielQuelle: "Exemplu cu o lucrare din domeniul public: Vincent van Gogh, Noapte înstelată, 1889 (detaliu). Pictată la azilul din Saint-Rémy după priveliștea de la fereastra sa; satul l-a adăugat din imaginație.",

  vfKicker: "Powered by VersusForge",
  vfTitel: "Motorul din spatele platformei",
  vfText: [
    "VersusForge este un agent AI construit pentru un singur lucru: marketing. Se uită la ce faci, găsește ce e rar și transformă asta în fraza care îi face pe oameni să se oprească — și în reclama din jurul ei.",
    "Pe lakatosbandi.com același motor lucrează pentru artiști: îți ia interviul, îți scrie frazele, îți construiește reclamele și vorbește cu cumpărătorii tăi.",
  ],

  werTitel: "Cine suntem",
  werLead: "lakatosbandi.com poartă numele noastre.",
  personen: [
    { name: "Geza Lakatos", rolle: "Designer diplomat & Consultant AI" },
    { name: "Szidonia Bandi", rolle: "Artistă" },
  ],
  werText: [
    "Amândoi avem mulți ani de experiență în artă și marketing. Cunoaștem ambele părți: să creezi lucrarea — și să ajungă în fața oamenilor care o apreciază.",
    "Suntem stabiliți în România.",
  ],

  wieTitel: "Cum funcționează",
  wie: [
    { t: "Arată-ne lucrările tale", d: "Vorbește cu agentul nostru și încarcă cel puțin trei lucrări în același stil. El se uită la tehnică, stil, subiect și ce e rar." },
    { t: "Categorie și preț", d: "Împreună vă așezați stilul unde îi e locul și vorbiți sincer despre preț — chiar și când e incomod." },
    { t: "Fraze și reclame", d: "Primești o frază pentru lucrările tale și reclamele construite din ele." },
    { t: "Verificare și lansare", d: "Ne uităm noi înșine la fiecare artist și decidem în 3 zile. Artiștii aprobați sunt pe lakatosbandi.com." },
  ],

  auswahlTitel: "De ce alegem",
  auswahlText: [
    "O platformă e doar atât de bună cât lucrările de pe ea. De aceea primim artiști care arată cel puțin trei lucrări în același stil — o singură imagine nu spune încă nimic despre un artist.",
    "Nudurile pictate și desenate sunt binevenite. Fotografia de nud nu o acceptăm deocamdată.",
  ],

  kostenTitel: "Cât costă",
  kostenText: [
    "Aplicarea și începutul sunt gratuite: frazele, reclamele, pagina și agentul tău.",
    "După ce trei cumpărători interesați te-au contactat, te întrebăm dacă vrei să-ți păstrezi agentul pentru {preis} pe lună. Anulezi lunar.",
    "Vânzarea are loc între tine și cumpărător. Nu luăm comision.",
  ],

  gruenderTitel: "De ce acum",
  gruenderText: [
    "Când lakatosbandi.com se deschide pentru cumpărători, primii artiști de pe platformă sunt primele lucrări pe care le văd.",
    "Ajuți la formarea platformei: ce ne spui în aceste prime săptămâni decide ce construim mai departe.",
  ],

  fragenTitel: "Întrebări",
  fragen: [
    { q: "Trebuie să știu ceva despre marketing?", a: "Nu. Agentul îți pune întrebări, se uită la lucrările tale și construiește cu tine frazele și reclamele." },
    { q: "Vindeți voi lucrările mele?", a: "Nu. Îți aducem cumpărători interesați cu nume și număr de telefon. Prețul și vânzarea rămân între tine și cumpărător." },
    { q: "În ce limbi?", a: "Engleză, română și germană. Agentul vorbește cu tine în limba ta." },
    { q: "Pot șterge totul?", a: "Da, oricând — pagina ta, lucrările tale și toate cererile." },
  ],

  schlussTitel: "Gata să-ți arăți lucrările?",
  schlussText: "Conversația durează câteva minute. Pregătește trei lucrări în același stil.",
};

const DE: BaldTexte = {
  steinKicker: "Warum das funktioniert",
  steinTitel: "1975 hat jemand Steine vom Strand verkauft.",
  steinFolien: [
    { gross: "Ein Stein vom Strand.", klein: "Wert: nichts" },
    { gross: "In einer Schachtel mit Luftlöchern.", klein: "immer noch ein Stein" },
    { gross: "Mit einer Anleitung, wie er sitzen lernt.", klein: "immer noch ein Stein" },
    { gross: "Vier Dollar. 1,5 Millionen Stück in sechs Monaten.", klein: "1975 · Pet Rock" },
  ],
  steinSchluss: "Der Stein hat sich nie verändert. Nur der Grund, ihn haben zu wollen, war plötzlich da. Dein Bild kann viel mehr als ein Stein — es braucht nur seinen Grund.",

  warumTitel: "Gute Kunst verkauft sich nicht von allein",
  warumText: [
    "Die meisten Künstler posten ein neues Werk mit „neues Bild verfügbar“ und warten. Es passiert nichts — nicht, weil das Werk schwach ist, sondern weil niemand dem Betrachter gesagt hat, warum genau dieses Werk anders ist als die tausend anderen in seinem Feed.",
    "Oft steht das Werk auch am falschen Ort: in der falschen Kategorie, bei Leuten, die etwas anderes sammeln, mit einem Preis ohne Begründung.",
  ],
  warumRegel: "Die erste Regel im Kunstmarketing: Finde den Käufer, der schätzt, was du machst — nicht irgendeinen.",

  wasTitel: "Was du bekommst",
  was: [
    { t: "Den Satz zu jedem Werk", d: "Was dieses Werk selten macht — Material, Farbe, Geschichte. Die Zeile, bei der Menschen beim Scrollen anhalten." },
    { t: "Anzeigen für Instagram und Facebook", d: "Dein Werk mit seinem Satz, fertig zum Posten. Du wählst aus." },
    { t: "Deine Seite auf lakatosbandi.com", d: "lakatosbandi.com/dein-name — deine Werke, jedes mit seinem Satz." },
    { t: "Einen Agenten, der mit Käufern spricht", d: "Er antwortet Interessenten, sammelt Name und Telefonnummer und gibt sie dir weiter. Du rufst an." },
  ],

  einzigTitel: "Was uns anders macht",
  einzig: [
    { t: "Wir bewerben die Plattform", d: "Die Werbung für lakatosbandi.com schalten wir selbst — damit Käufer zu den Künstlern darauf kommen, nicht nur zu einem einzelnen Post von dir." },
    { t: "Dein eigener Agent", d: "Jeder Künstler bekommt einen Agenten, der Interessenten zu jeder Uhrzeit antwortet — während du malst." },
    { t: "Anzeigen aus deinen Werken", d: "Keine Vorlage: Die Sätze kommen aus dem, was wirklich in deinen Bildern steckt. Dieselben Anzeigen kannst du auch selbst schalten." },
    { t: "Dein Dashboard", d: "Jede Anfrage mit Namen und Telefonnummer, deine Sätze und Anzeigen, neue Werke und neue Sätze, wann immer du willst." },
    { t: "Ehrlich statt schmeichelnd", d: "Kategorie und Preis werden offen besprochen. Ein Agent, der nur nickt, wäre für dich wertlos." },
    { t: "Keine Provision", d: "Was du verkaufst, gehört dir. Den Agenten zahlst du erst, wenn er dir Interessenten bringt." },
  ],

  prinzipTitel: "Unsere Marketing-Prinzipien",
  prinzipien: [
    { t: "Der Grund verkauft, nicht das Ding", d: "Der Stein hat sich nie verändert. Dein Werk muss sich auch nicht ändern — es braucht seinen Grund, laut ausgesprochen." },
    { t: "Finde den Käufer, der es schätzt", d: "Nicht irgendeinen. Den, der sammelt, was du machst, und bereit ist, dafür zu zahlen." },
    { t: "Nichts erfunden", d: "Jeder Satz kommt aus dem, was wirklich im Werk steckt: Farbe, Material, Motiv, Geschichte. Keine leeren Superlative." },
    { t: "Ein Stil, eine Handschrift", d: "Sammler fragen: Hast du noch mehr davon? Wer einen Stil hält, baut Wert auf." },
    { t: "Die richtige Kategorie", d: "Figurativ, abstrakt, Landschaft, Porträt — der richtige Ort bringt die richtigen Menschen." },
    { t: "Ein ehrlicher Preis", d: "Unbekannte Künstler verlangen meist 200–1.000 €, bekannte 1.000–2.000 €, etablierte mehr. Wir ordnen deinen Preis ein, wir schmeicheln ihm nicht." },
    { t: "Schnelligkeit gewinnt", d: "Wer am selben Tag zurückruft, erreicht den Käufer. Deshalb sammelt dein Agent die Telefonnummer, und du bekommst sie sofort." },
  ],
  rekrutTitel: "Wie wir unsere Künstler finden",
  rekrutLead: "Niemand wird einfach eingetragen. Jeder Künstler geht denselben Weg:",
  rekrut: [
    { t: "Anzeigen und Empfehlungen", d: "Wir suchen Künstler über unsere Anzeigen, über Social Media und über Künstler, die andere empfehlen." },
    { t: "Ein Gespräch mit unserem Agenten", d: "Kein Formular: Der Agent fragt nach deinen Werken, deinem Stil und deinen Zielen." },
    { t: "Drei Werke im selben Stil", d: "Das ist die Aufnahmeprüfung. Wer das noch nicht hat, bekommt einen ehrlichen Satz, was fehlt — und kann wiederkommen." },
    { t: "Kategorie und Preis", d: "Wir ordnen deinen Stil ein und sprechen über deinen Preis, bevor etwas gebaut wird." },
    { t: "Von uns geprüft", d: "Ein Mensch sieht sich jeden Künstler an. Entscheidung innerhalb von 3 Tagen — freigegeben oder abgelehnt." },
  ],

  beispielKicker: "Beispiel",
  beispielTitel: "Von „neues Bild“ zu einem Grund",
  beispielVorherLabel: "So posten die meisten Künstler",
  beispielVorher: "Neues Bild verfügbar. Öl auf Leinwand, 74 × 92 cm.",
  beispielGesehenLabel: "Was der Agent sieht",
  beispielGesehen: "Tiefblaue Nacht, ein wirbelnder Himmel, leuchtende Sterne, eine dunkle Zypresse vorn, ein Kirchturm und darunter ein kleines schlafendes Dorf.",
  beispielNachherLabel: "Der Satz, bei dem Menschen anhalten",
  beispielNachher: "Der Blick aus dem Fenster der Heilanstalt vor Sonnenaufgang — mit einem Dorf, das es nie gab.",
  beispielWarum: "Das Werk ist dasselbe. Jetzt gibt es einen Grund, zweimal hinzusehen — und eine Frage, auf die der Käufer eine Antwort will.",
  beispielQuelle: "Beispiel mit einem gemeinfreien Werk: Vincent van Gogh, Die Sternennacht, 1889 (Ausschnitt). Gemalt in der Heilanstalt Saint-Rémy nach dem Blick aus seinem Fenster; das Dorf hat er dazuerfunden.",

  vfKicker: "Powered by VersusForge",
  vfTitel: "Die Engine hinter der Plattform",
  vfText: [
    "VersusForge ist ein KI-Agent, gebaut für eine Aufgabe: Marketing. Er sieht sich an, was du machst, findet, was daran selten ist, und macht daraus den Satz, bei dem Menschen anhalten — und die Anzeige drumherum.",
    "Auf lakatosbandi.com arbeitet dieselbe Engine für Künstler: Sie führt das Gespräch mit dir, schreibt deine Sätze, baut deine Anzeigen und spricht mit deinen Käufern.",
  ],

  werTitel: "Wer wir sind",
  werLead: "lakatosbandi.com trägt unsere beiden Namen.",
  personen: [
    { name: "Geza Lakatos", rolle: "Dipl.-Designer & AI Consultant" },
    { name: "Szidonia Bandi", rolle: "Künstlerin" },
  ],
  werText: [
    "Beide haben wir viele Jahre Erfahrung in Kunst und Marketing. Wir kennen beide Seiten: das Werk zu machen — und es vor die Menschen zu bringen, die es schätzen.",
    "Wir sind in Rumänien ansässig.",
  ],

  wieTitel: "So funktioniert es",
  wie: [
    { t: "Zeig uns deine Werke", d: "Sprich mit unserem Agenten und lade mindestens drei Werke im selben Stil hoch. Er sieht sich Medium, Stil, Motiv und das Seltene an." },
    { t: "Kategorie und Preis", d: "Gemeinsam ordnet ihr deinen Stil ein und sprecht ehrlich über deinen Preis — auch wenn es unbequem ist." },
    { t: "Sätze und Anzeigen", d: "Du bekommst Sätze zu deinen Werken und die Anzeigen daraus." },
    { t: "Prüfung und Start", d: "Wir sehen uns jeden Künstler selbst an und entscheiden innerhalb von 3 Tagen. Freigegebene Künstler sind auf lakatosbandi.com." },
  ],

  auswahlTitel: "Warum wir auswählen",
  auswahlText: [
    "Eine Plattform ist nur so gut wie die Werke darauf. Deshalb nehmen wir Künstler auf, die mindestens drei Arbeiten im selben Stil zeigen — ein einzelnes Bild sagt noch nichts über einen Künstler.",
    "Gemalte und gezeichnete Akte sind willkommen. Aktfotografie nehmen wir zurzeit nicht an.",
  ],

  kostenTitel: "Was es kostet",
  kostenText: [
    "Bewerbung und Start kosten nichts: deine Sätze, deine Anzeigen, deine Seite und dein Agent.",
    "Wenn sich drei Interessenten bei dir gemeldet haben, fragen wir dich, ob du deinen Agenten für {preis} im Monat behalten willst. Monatlich kündbar.",
    "Verkauft wird zwischen dir und dem Käufer. Wir nehmen keine Provision.",
  ],

  gruenderTitel: "Warum jetzt",
  gruenderText: [
    "Wenn lakatosbandi.com für Käufer öffnet, sind die Werke der ersten Künstler die ersten, die sie sehen.",
    "Du gestaltest die Plattform mit: Was du uns in diesen ersten Wochen sagst, entscheidet, was wir als Nächstes bauen.",
  ],

  fragenTitel: "Fragen",
  fragen: [
    { q: "Muss ich etwas über Marketing wissen?", a: "Nein. Der Agent stellt dir Fragen, sieht sich deine Werke an und baut mit dir die Sätze und Anzeigen." },
    { q: "Verkauft ihr meine Werke?", a: "Nein. Wir bringen dir Interessenten mit Namen und Telefonnummer. Preis und Verkauf klärst du selbst mit dem Käufer." },
    { q: "In welchen Sprachen?", a: "Englisch, Rumänisch und Deutsch. Der Agent spricht mit dir in deiner Sprache." },
    { q: "Kann ich alles löschen?", a: "Ja, jederzeit — deine Seite, deine Werke und alle Anfragen." },
  ],

  schlussTitel: "Bereit, deine Werke zu zeigen?",
  schlussText: "Das Gespräch dauert ein paar Minuten. Halte drei Werke im selben Stil bereit.",
};

export const baldTexte = (lang: Lang): BaldTexte => (lang === "ro" ? RO : lang === "de" ? DE : EN);
