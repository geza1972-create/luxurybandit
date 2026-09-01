import type { Lang, LangArchiv } from "@/lib/lang";

/**
 * DIE ÜBER-UNS-SEITE IN SIEBEN SPRACHEN — Owner-Neufassung 11.08.2026 ("update ONLY the
 * About page copy. Do not redesign the page. Do not change layout, components, navigation,
 * footer, colors or spacing. Do not change any other page."). Ersetzt die Fassung vom
 * 05.08.2026 komplett — nur die About-Seite liest diese neuen Felder, sonst niemand.
 *
 * DEUTSCH IST DER URTEXT UND WÖRTLICH VOM OWNER — ich habe hier nichts zusammengezogen oder
 * gekürzt, jeder Satz aus seiner Vorlage steht als eigener Eintrag, damit „wörtlich" auch
 * wörtlich bleibt. Die anderen sechs Sprachen sind idiomatische Übersetzungen, geduzt.
 *
 * `portalKurz` / `portalLang` — DAS GETEILTE ORIGINAL DER PORTALBESCHREIBUNG (Owner
 * 10.08.2026, siehe Kommentar am Typ unten). Startseite und AGB lesen diese zwei Felder
 * direkt aus dieser Datei. Die About-Seite zeigt sie seit dieser Neufassung NICHT mehr an
 * (der neue Eingangstext ist eigenständig, Felder `intro*`) — die zwei Schlüssel bleiben
 * hier trotzdem unverändert stehen, weil andere Seiten sie brauchen.
 */

export type AboutText = {
  kicker: string;
  h1a: string; h1y: string;

  /**
   * DIE BESCHREIBUNG DES PORTALS — DAS ORIGINAL FÜR DAS GANZE PORTAL (Owner 10.08.2026:
   * „du machst ab jetzt die Beschreibung des Portals dynamisch. Wir legen das origial in
   * Abou an. Was dort geändert wird, gilt für das ganze portal. Also auch für die
   * Startseite(Topics)"). NICHT ANFASSEN bei einer reinen Textänderung der About-Seite —
   * Startseite (app/themes/page.tsx) und AGB (app/terms/page.tsx) lesen exakt diese zwei
   * Felder.
   */
  portalKurz: string;
  portalLang: string;

  /* Eingangstext der About-Seite, direkt unter Kicker/H1 — eigene Felder seit 11.08.2026,
     ersetzen die frühere Anzeige von portalLang auf dieser einen Seite. */
  introLead: string;
  introListe: string[];
  introKeineKi: string;
  introBringst: string[];

  werTitel: string;
  werBild: string;
  wer: string[];

  warumLbTitel: string;
  warumLb: string[];

  warumTitel: string;
  warum: string[];

  aiTitel: string;
  ai: string[];

  verspTitel: string;
  versp: [string, string][];

  nichtTitel: string;
  nicht: string[];

  startTitel: string;
  startLead: string[];
  startCta: string;
  fein: string;
  feinLink: string;
};

/**
 * DIE ZWEI MARKENSÄTZE — vom Owner ausdrücklich UNÜBERSETZT geliefert, in allen sieben
 * Sprachen identisch (auch im deutschen Block). Darum kein Eintrag je Sprache, sondern ein
 * einziger Text hier, den die Seite direkt einbindet.
 */
export const MARKENSATZ_1 = "We don't take from people. We take life into our own hands.";
export const MARKENSATZ_2 = "BANDIT THIS LIFE.";

const de: AboutText = {
  kicker: "Über LuxuryBandit",
  h1a: "Software, Portale und Verkaufsstrecken — ", h1y: "gebaut, nicht präsentiert.",
  portalKurz: "Wir bauen Software, Portale und Verkaufsstrecken, die verkaufen — von der Meta-Anzeige bis zum Kauf. Alles auf dieser Seite ist unser eigenes, live im Einsatz: Landingpage, KI-Video, Kasse und Lieferung, in drei Sprachen. Teste es — und wenn du so etwas für dein Geschäft willst, schreib uns.",
  portalLang: "Wir entwickeln individuelle Marketing-Systeme für Unternehmen – schlank, KI-gestützt und mit professionellen Technologien. Ideen, Zielgruppen und Angebote werden früh getestet, bevor größere Budgets eingesetzt werden.",

  introLead: "LuxuryBandit baut digitale Produkte, die fertig laufen — keine Werkzeuge, mit denen du danach allein bist.",
  introListe: [
    "Ein Portal, das deine Kunden selbst bedienen.",
    "Eine Verkaufsstrecke von der Anzeige bis zur bezahlten Bestellung.",
    "KI-Videos mit echtem Gesicht und echter Stimme.",
    "Agenten, die fragen, prüfen und antworten — statt eines Formulars.",
    "Und die Gestaltung dazu. Dafür stehen 30 Jahre UX.",
  ],
  introKeineKi: "Du musst dafür keine KI verstehen, keine Software lernen und nichts selbst gestalten.",
  introBringst: [
    "Du bringst dein Produkt und dein Ziel.",
    "Wir bauen den Weg dorthin.",
  ],

  werTitel: "Wer dahintersteckt",
  werBild: "Geza — 30 Jahre an der Schnittstelle von Design und Technik, und der Mensch, der antwortet, wenn du uns schreibst.",
  wer: [
    "Geza — seit rund 30 Jahren an der Schnittstelle zwischen Design, Technologie und Menschen.",
    "Seit 1996 arbeitet er als Designer und UX-Berater für große Unternehmen und digitale Produkte.",
    "Unter anderem für Unternehmen wie Deutsche Bahn und Bundesdruckerei.",
    "Außerdem entwickelte er eigene Produkte und stellte eine seiner Erfindungen bei „Die Höhle der Löwen“ in Deutschland vor.",
    "Heute arbeitet er von Timișoara aus an einer einfachen Frage:",
    "Wie kann moderne Technologie etwas schaffen, das sich nicht nach Technologie anfühlt — sondern nach einem persönlichen Erlebnis?",
    "LuxuryBandit ist die Antwort darauf.",
  ],

  warumLbTitel: "Warum LuxuryBandit?",
  warumLb: [
    "LuxuryBandit ist kein Name über Luxus.",
    "Und auch nicht über Banditen.",
    "Es geht um eine Haltung.",
    "Darum, sich das eigene Leben nicht einfach vorsetzen zu lassen.",
    "Nicht darauf zu warten, dass irgendwann der perfekte Zeitpunkt kommt.",
    "Nicht nur davon zu träumen, wie das Leben aussehen könnte.",
    "Sondern eine Richtung zu wählen.",
    "Eine Entscheidung zu treffen.",
    "Und sich Stück für Stück das Leben aufzubauen, das man wirklich will.",
  ],

  warumTitel: "Warum du das Ergebnis bekommst — nicht das Werkzeug",
  warum: [
    "Es gibt heute unzählige KI-Tools.",
    "Bildgeneratoren.",
    "Video-Tools.",
    "Schnittprogramme.",
    "Avatar-Systeme.",
    "Aber die meisten Unternehmen wollen keine neuen Tools lernen.",
    "Sie wollen ein Ergebnis.",
    "Deshalb verkauft LuxuryBandit keine Software, mit der du anschließend selbst arbeiten musst.",
    "Du sagst uns, was verkauft oder gefunden werden soll — wir bauen die Strecke, die es tut.",
    "Technologie bleibt im Hintergrund.",
    "Das Ergebnis steht im Vordergrund.",
  ],

  aiTitel: "KI soll mehr Menschen möglich machen",
  ai: [
    "Neue Technologie gehört am Anfang oft denen, die wissen, wie man sie bedient.",
    "Später wird sie erst dann wirklich interessant, wenn jeder sie nutzen kann.",
    "Genau dort steht KI heute.",
    "LuxuryBandit versucht, diese Technik so einfach zu machen, dass du nicht wissen musst, welches Modell, welcher Prompt oder welches Video-Tool dahintersteht.",
    "Du sollst nur wissen, was du sagen, zeigen oder verschenken willst.",
    "Den Rest übernehmen wir.",
  ],

  verspTitel: "Was wir dir versprechen",
  versp: [
    ["Deine Daten bleiben deine.", "Wir veröffentlichen nichts automatisch und geben nichts weiter. Du entscheidest, was mit deinem Ergebnis passiert und wer es sieht."],
    ["Kein verstecktes Abo.", "Du kaufst ein konkretes Produkt. Was monatlich weiterläuft, steht vorher da und ist jederzeit mit einem Tipp kündbar."],
    ["Der Preis steht vorher fest.", "Du siehst vor dem Kauf, was es kostet."],
    ["Fünf Minuten statt fünf Stunden.", "Kein Setup, keine Software lernen, keine Prompts. Du entscheidest, was du willst. Den technischen Teil übernehmen wir."],
  ],

  nichtTitel: "Was LuxuryBandit nicht sein will",
  nicht: [
    "Kein weiteres KI-Spielzeug.",
    "Kein Tool, das dir noch mehr Arbeit macht.",
    "Kein Versprechen, dass Technologie dein Leben von alleine verändert.",
    "KI kann dir Möglichkeiten geben.",
    "Was du daraus machst, bleibt deine Entscheidung.",
  ],

  startTitel: "Wo du anfängst",
  startLead: [
    "Sieh dir an, was hier läuft.",
    "Jede Kachel auf der Startseite ist ein fertiger Trichter, keine Folie.",
    "Geh hindurch wie ein Kunde — bis zur Kasse.",
    "Wenn du so einen für dein Geschäft willst, schreib uns.",
    "Du bringst das Ziel.",
    "Wir bauen den Weg.",
  ],
  startCta: "Ansehen, was läuft",
  fein: "Fragen, oder haben wir etwas falsch gemacht? ",
  feinLink: "Schreib uns",
};

const en: AboutText = {
  kicker: "About LuxuryBandit",
  h1a: "Software, portals and checkout journeys — ", h1y: "built, not pitched.",
  portalKurz: "We build software, portals and checkout journeys that sell — from the Meta ad to the purchase. Everything on this page is our own, live: landing page, AI video, checkout and delivery, in three languages. Try it — and if you want one for your business, write to us.",
  portalLang: "LuxuryBandit builds it in one piece: the software, the portal, the ad, the landing page, the guided purchase path, the checkout, the automatic delivery — one path, three languages. Every tile on this page is such a funnel, live: a visitor arrives from a Meta ad, sees an example, enters their details, pays and receives the result — without anyone on our side stepping in. That is exactly what we build for your product too.",

  introLead: "LuxuryBandit builds digital products that run when they are done — not tools that leave you alone with them.",
  introListe: [
    "A portal your customers operate themselves.",
    "A checkout journey from the ad to the paid order.",
    "AI videos with a real face and a real voice.",
    "Agents that ask, check and answer — instead of a form.",
    "And the design around it. That is what 30 years of UX are for.",
  ],
  introKeineKi: "You don't need to understand AI, learn any software, or design anything yourself.",
  introBringst: [
    "You bring your product and your goal.",
    "We build the way there.",
  ],

  werTitel: "Who's behind it",
  werBild: "Geza — 30 years at the intersection of design and technology, and the person who answers when you write to us.",
  wer: [
    "Geza — for around 30 years at the intersection of design, technology, and people.",
    "Since 1996 he has worked as a designer and UX consultant for large companies and digital products.",
    "Among others, for companies like Deutsche Bahn and Bundesdruckerei.",
    "He has also developed his own products and presented one of his inventions on Die Höhle der Löwen in Germany — the show the rest of the world knows as Shark Tank.",
    "Today he works from Timișoara on one simple question:",
    "How can modern technology create something that doesn't feel like technology — but like a personal experience?",
    "LuxuryBandit is the answer.",
  ],

  warumLbTitel: "Why LuxuryBandit?",
  warumLb: [
    "LuxuryBandit isn't a name about luxury.",
    "And it isn't about bandits either.",
    "It's about an attitude.",
    "About not simply letting your own life be handed to you.",
    "Not waiting for the perfect moment to eventually come.",
    "Not just dreaming about what life could look like.",
    "But choosing a direction.",
    "Making a decision.",
    "And building, piece by piece, the life you actually want.",
  ],

  warumTitel: "Why you get the result — not the tool",
  warum: [
    "There are countless AI tools today.",
    "Image generators.",
    "Video tools.",
    "Editing software.",
    "Avatar systems.",
    "But most companies don't want to learn new tools.",
    "They want a result.",
    "That is why LuxuryBandit doesn't sell software you then have to operate yourself.",
    "You tell us what should sell or be found — we build the path that does it.",
    "Technology stays in the background.",
    "The result stays in front.",
  ],

  aiTitel: "AI should be possible for more people",
  ai: [
    "New technology often belongs, at first, to those who know how to use it.",
    "Later, it only becomes truly interesting once everyone can use it.",
    "That's exactly where AI stands today.",
    "LuxuryBandit tries to make this technology so simple that you never need to know which model, which prompt, or which video tool is behind it.",
    "All you need to know is what you want to say, show, or give.",
    "We take care of the rest.",
  ],

  verspTitel: "What we promise you",
  versp: [
    ["Your data stays yours.", "We publish nothing automatically and pass nothing on. You decide what happens to your result and who sees it."],
    ["No hidden subscription.", "You buy a specific product. Anything that renews monthly is stated up front and can be cancelled with one tap."],
    ["The price is fixed beforehand.", "You see what it costs before you buy."],
    ["Five minutes instead of five hours.", "No setup, no software to learn, no prompts. You decide what you want. We take care of the technical part."],
  ],

  nichtTitel: "What LuxuryBandit doesn't want to be",
  nicht: [
    "Not another AI toy.",
    "Not a tool that gives you even more work.",
    "Not a promise that technology will change your life on its own.",
    "AI can give you possibilities.",
    "What you make of them stays your decision.",
  ],

  startTitel: "Where you start",
  startLead: [
    "Look at what is running here.",
    "Every tile on the start page is a finished funnel, not a slide.",
    "Walk through it like a customer — all the way to the checkout.",
    "If you want one for your business, write to us.",
    "You bring the goal.",
    "We build the way.",
  ],
  startCta: "See what is running",
  fein: "Questions, or did we get something wrong? ",
  feinLink: "Write to us",
};

const ro: AboutText = {
  kicker: "Despre LuxuryBandit",
  h1a: "Software, portaluri și trasee de vânzare — ", h1y: "construite, nu prezentate.",
  portalKurz: "Construim software, portaluri și trasee de vânzare care vând — de la reclama Meta până la cumpărare. Tot ce este pe această pagină este al nostru și funcționează live: landing page, video AI, casă și livrare, în trei limbi. Încearcă-le — iar dacă vrei așa ceva pentru afacerea ta, scrie-ne.",
  portalLang: "LuxuryBandit construiește dintr-o bucată: software-ul, portalul, reclama, landing page-ul, traseul de cumpărare, casa, livrarea automată — un singur drum, trei limbi. Fiecare card de pe această pagină este un astfel de funnel, live: un vizitator vine dintr-o reclamă Meta, vede un exemplu, își lasă datele, plătește și primește rezultatul — fără ca cineva de la noi să intervină. Exact așa ceva construim și pentru produsul tău.",

  introLead: "LuxuryBandit construiește produse digitale care funcționează gata făcute — nu unelte cu care rămâi singur după aceea.",
  introListe: [
    "Un portal pe care clienții tăi îl folosesc singuri.",
    "Un traseu de cumpărare de la reclamă până la comanda plătită.",
    "Videoclipuri AI cu chip și voce reale.",
    "Agenți care întreabă, verifică și răspund — în locul unui formular.",
    "Și designul din jur. Pentru asta sunt cei 30 de ani de UX.",
  ],
  introKeineKi: "Nu trebuie să înțelegi AI, să înveți niciun program și nici să creezi nimic singur.",
  introBringst: [
    "Tu aduci produsul și obiectivul.",
    "Noi construim drumul până acolo.",
  ],

  werTitel: "Cine e în spate",
  werBild: "Geza — 30 de ani la intersecția dintre design și tehnologie, și omul care îți răspunde când ne scrii.",
  wer: [
    "Geza — de aproximativ 30 de ani la intersecția dintre design, tehnologie și oameni.",
    "Din 1996 lucrează ca designer și consultant UX pentru companii mari și produse digitale.",
    "Printre altele, pentru companii precum Deutsche Bahn și Bundesdruckerei.",
    "A dezvoltat și produse proprii și și-a prezentat una dintre invenții la „Die Höhle der Löwen” în Germania.",
    "Astăzi lucrează din Timișoara la o întrebare simplă:",
    "Cum poate tehnologia modernă să creeze ceva care nu se simte ca tehnologie — ci ca o experiență personală?",
    "LuxuryBandit este răspunsul.",
  ],

  warumLbTitel: "De ce LuxuryBandit?",
  warumLb: [
    "LuxuryBandit nu e un nume despre lux.",
    "Și nici despre bandiți.",
    "E vorba despre o atitudine.",
    "Despre a nu lăsa pur și simplu propria viață să îți fie servită.",
    "A nu aștepta să vină cândva momentul perfect.",
    "A nu doar visa la cum ar putea arăta viața.",
    "Ci a alege o direcție.",
    "A lua o decizie.",
    "Și a-ți construi, bucată cu bucată, viața pe care ți-o dorești cu adevărat.",
  ],

  warumTitel: "De ce primești rezultatul — nu unealta",
  warum: [
    "Astăzi există nenumărate unelte AI.",
    "Generatoare de imagini.",
    "Unelte video.",
    "Programe de montaj.",
    "Sisteme de avatare.",
    "Dar majoritatea companiilor nu vor să învețe unelte noi.",
    "Vor un rezultat.",
    "De aceea LuxuryBandit nu vinde software cu care trebuie să lucrezi tu după aceea.",
    "Ne spui ce trebuie vândut sau găsit — noi construim traseul care face asta.",
    "Tehnologia rămâne în fundal.",
    "Rezultatul rămâne în față.",
  ],

  aiTitel: "AI ar trebui să fie posibilă pentru mai mulți oameni",
  ai: [
    "Tehnologia nouă aparține la început adesea celor care știu cum să o folosească.",
    "Mai târziu devine cu adevărat interesantă abia când oricine o poate folosi.",
    "Exact acolo se află AI astăzi.",
    "LuxuryBandit încearcă să facă această tehnologie atât de simplă, încât nu trebuie să știi ce model, ce prompt sau ce unealtă video stă în spate.",
    "Trebuie doar să știi ce vrei să spui, să arăți sau să dăruiești.",
    "Restul îl facem noi.",
  ],

  verspTitel: "Ce îți promitem",
  versp: [
    ["Datele tale rămân ale tale.", "Nu publicăm nimic automat și nu transmitem nimic mai departe. Tu decizi ce se întâmplă cu rezultatul tău și cine îl vede."],
    ["Fără abonament ascuns.", "Cumperi un produs concret. Ce se reînnoiește lunar este scris dinainte și se anulează cu o apăsare."],
    ["Prețul este stabilit dinainte.", "Vezi cât costă înainte să cumperi."],
    ["Cinci minute în loc de cinci ore.", "Fără instalare, fără software de învățat, fără prompturi. Tu decizi ce vrei. De partea tehnică ne ocupăm noi."],
  ],

  nichtTitel: "Ce nu vrea să fie LuxuryBandit",
  nicht: [
    "Nu încă o jucărie AI.",
    "Nu o unealtă care îți dă și mai multă muncă.",
    "Nu o promisiune că tehnologia îți schimbă viața de la sine.",
    "AI îți poate oferi posibilități.",
    "Ce faci din ele rămâne decizia ta.",
  ],

  startTitel: "De unde începi",
  startLead: [
    "Uită-te la ce funcționează aici.",
    "Fiecare card de pe prima pagină este un funnel gata făcut, nu un slide.",
    "Parcurge-l ca un client — până la casă.",
    "Dacă vrei unul pentru afacerea ta, scrie-ne.",
    "Tu aduci obiectivul.",
    "Noi construim drumul.",
  ],
  startCta: "Vezi ce funcționează",
  fein: "Întrebări, sau am greșit ceva? ",
  feinLink: "Scrie-ne",
};

const es: AboutText = {
  kicker: "Sobre LuxuryBandit",
  h1a: "Regalos y momentos únicos de la ", h1y: "nueva era de la IA.",
  portalKurz: "Construimos funnels que venden — soluciones a medida para emprendedores, desde el anuncio de Meta hasta la compra. Todo lo que ves en esta página son funnels nuestros, en vivo: landing page, vídeo con IA, caja y entrega, en siete idiomas. Pruébalos — y si quieres uno para tu negocio, escríbenos.",
  portalLang: "LuxuryBandit construye funnels de venta de una sola pieza: el anuncio, la landing page, el camino de compra guiado, la caja, la entrega automática — un solo camino, siete idiomas. Cada tarjeta de esta página es un funnel así, en vivo: un visitante llega desde un anuncio de Meta, ve un ejemplo, sube una foto, paga y recibe su vídeo de IA terminado — sin nadie detrás. Exactamente ese funnel construimos también para tu producto.",

  introLead: "LuxuryBandit convierte fotos personales, voz e IA moderna en algo que no simplemente compras y olvidas.",
  introListe: [
    "Una película de cumpleaños.",
    "Un mensaje de boda.",
    "Un mensaje para tu yo futuro.",
    "Una candidatura en vídeo que destaca.",
    "Un momento personal que antes no existía.",
  ],
  introKeineKi: "No necesitas entender de IA, aprender ningún software ni diseñar nada tú mismo.",
  introBringst: [
    "Tú aportas la persona, la voz o la idea.",
    "Nosotros la convertimos en la experiencia.",
  ],

  werTitel: "Quién está detrás",
  werBild: "Geza — 30 años en la intersección entre diseño y tecnología, y la persona que responde cuando nos escribes.",
  wer: [
    "Geza — desde hace unos 30 años en la intersección entre diseño, tecnología y personas.",
    "Desde 1996 trabaja como diseñador y consultor de UX para grandes empresas y productos digitales.",
    "Entre otros, para empresas como Deutsche Bahn y Bundesdruckerei.",
    "Además desarrolló productos propios y presentó uno de sus inventos en «Die Höhle der Löwen» en Alemania.",
    "Hoy trabaja desde Timișoara en una pregunta sencilla:",
    "¿Cómo puede la tecnología moderna crear algo que no se sienta como tecnología, sino como una experiencia personal?",
    "LuxuryBandit es la respuesta.",
  ],

  warumLbTitel: "¿Por qué LuxuryBandit?",
  warumLb: [
    "LuxuryBandit no es un nombre sobre el lujo.",
    "Ni tampoco sobre bandidos.",
    "Se trata de una actitud.",
    "De no dejar simplemente que te sirvan tu propia vida.",
    "De no esperar a que llegue algún día el momento perfecto.",
    "De no solo soñar con cómo podría ser la vida.",
    "Sino elegir una dirección.",
    "Tomar una decisión.",
    "Y construir, paso a paso, la vida que realmente quieres.",
  ],

  warumTitel: "Por qué recibes el resultado — no la herramienta",
  warum: [
    "Hoy existen innumerables herramientas de IA.",
    "Generadores de imágenes.",
    "Herramientas de vídeo.",
    "Programas de edición.",
    "Sistemas de avatares.",
    "Pero la mayoría de las personas no quiere aprender herramientas nuevas.",
    "Quieren un resultado.",
    "Por eso LuxuryBandit no vende software con el que luego tengas que trabajar tú mismo.",
    "Subes tu foto, nos das tu mensaje o tu idea — y nosotros la convertimos en la experiencia terminada.",
    "La tecnología queda en segundo plano.",
    "El resultado queda en primer plano.",
  ],

  aiTitel: "La IA debería ser posible para más personas",
  ai: [
    "La tecnología nueva suele pertenecer, al principio, a quienes saben usarla.",
    "Más tarde solo se vuelve realmente interesante cuando todos pueden usarla.",
    "Ahí es exactamente donde está la IA hoy.",
    "LuxuryBandit intenta hacer esta tecnología tan sencilla que nunca necesites saber qué modelo, qué prompt o qué herramienta de vídeo hay detrás.",
    "Solo necesitas saber qué quieres decir, mostrar o regalar.",
    "Del resto nos ocupamos nosotros.",
  ],

  verspTitel: "Lo que te prometemos",
  versp: [
    ["Tus fotos siguen siendo tuyas.", "No publicamos automáticamente tus fotos y vídeos, ni los revendemos. Tú decides qué haces con tu resultado y a quién se lo muestras."],
    ["Ninguna suscripción oculta.", "Compras un producto concreto. Lo único que sigue funcionando cada mes es el planificador de boda — y puedes cancelarlo cuando quieras con un toque. Sin cargo sorpresa."],
    ["El precio está fijado de antemano.", "Ves lo que cuesta tu producto antes de comprarlo."],
    ["Cinco minutos en vez de cinco horas.", "Sin configuración complicada. Sin software que aprender. Sin prompts que escribir. Tú decides qué quieres. Nosotros nos ocupamos de la parte técnica."],
  ],

  nichtTitel: "Lo que LuxuryBandit no quiere ser",
  nicht: [
    "No otro juguete de IA.",
    "No una herramienta que te dé aún más trabajo.",
    "No una promesa de que la tecnología cambiará tu vida por sí sola.",
    "La IA puede darte posibilidades.",
    "Lo que hagas con ellas sigue siendo decisión tuya.",
  ],

  startTitel: "Por dónde empiezas",
  startLead: [
    "Elige el momento que quieres crear.",
    "Un regalo.",
    "Un mensaje.",
    "Un recuerdo.",
    "O una visión para tu yo futuro.",
    "Tú aportas la idea.",
    "Nosotros la hacemos visible.",
  ],
  startCta: "Ver todas las experiencias",
  fein: "¿Dudas, o nos hemos equivocado en algo? ",
  feinLink: "Escríbenos",
};

const fr: AboutText = {
  kicker: "À propos de LuxuryBandit",
  h1a: "Des cadeaux et des moments uniques de la ", h1y: "nouvelle ère de l’IA.",
  portalKurz: "Nous construisons des funnels qui vendent — des solutions sur mesure pour entrepreneurs, de la publicité Meta jusqu'à l'achat. Tout ce que tu vois sur cette page, ce sont nos propres funnels, en production : landing page, vidéo IA, caisse et livraison, en sept langues. Teste-les — et si tu en veux un pour ton business, écris-nous.",
  portalLang: "LuxuryBandit construit des funnels de vente d'un seul tenant : la publicité, la landing page, le parcours d'achat guidé, la caisse, la livraison automatique — un seul chemin, sept langues. Chaque carte de cette page est un funnel comme ça, en production : un visiteur arrive d'une publicité Meta, voit un exemple, ajoute une photo, paie et reçoit sa vidéo IA terminée — sans personne derrière. C'est exactement ce funnel que nous construisons aussi pour ton produit.",

  introLead: "LuxuryBandit transforme des photos personnelles, une voix et l’IA moderne en quelque chose qu’on n’achète pas simplement pour l’oublier.",
  introListe: [
    "Un film d’anniversaire.",
    "Un message de mariage.",
    "Un message à ton futur toi.",
    "Une candidature vidéo qui se démarque.",
    "Un moment personnel qui n’existait pas avant.",
  ],
  introKeineKi: "Tu n’as pas besoin de comprendre l’IA, d’apprendre un logiciel ni de concevoir quoi que ce soit toi-même.",
  introBringst: [
    "Tu apportes la personne, la voix ou l’idée.",
    "Nous en faisons l’expérience.",
  ],

  werTitel: "Qui est derrière",
  werBild: "Geza — 30 ans à la croisée du design et de la technologie, et la personne qui répond quand tu nous écris.",
  wer: [
    "Geza — depuis environ 30 ans à la croisée du design, de la technologie et des gens.",
    "Depuis 1996, il travaille comme designer et consultant UX pour de grandes entreprises et des produits numériques.",
    "Entre autres pour des entreprises comme Deutsche Bahn et Bundesdruckerei.",
    "Il a aussi développé ses propres produits et présenté l’une de ses inventions à « Die Höhle der Löwen » en Allemagne.",
    "Aujourd’hui, il travaille depuis Timișoara sur une question simple :",
    "Comment la technologie moderne peut-elle créer quelque chose qui ne ressemble pas à de la technologie — mais à une expérience personnelle ?",
    "LuxuryBandit est la réponse.",
  ],

  warumLbTitel: "Pourquoi LuxuryBandit ?",
  warumLb: [
    "LuxuryBandit n’est pas un nom qui parle de luxe.",
    "Ni de bandits, d’ailleurs.",
    "Il s’agit d’un état d’esprit.",
    "Celui de ne pas simplement laisser sa propre vie lui être imposée.",
    "De ne pas attendre que le moment parfait finisse par arriver.",
    "De ne pas se contenter de rêver à quoi la vie pourrait ressembler.",
    "Mais de choisir une direction.",
    "De prendre une décision.",
    "Et de construire, morceau par morceau, la vie que l’on veut vraiment.",
  ],

  warumTitel: "Pourquoi tu reçois le résultat — pas l’outil",
  warum: [
    "Il existe aujourd’hui d’innombrables outils d’IA.",
    "Des générateurs d’images.",
    "Des outils vidéo.",
    "Des logiciels de montage.",
    "Des systèmes d’avatars.",
    "Mais la plupart des gens ne veulent pas apprendre de nouveaux outils.",
    "Ils veulent un résultat.",
    "C’est pourquoi LuxuryBandit ne vend pas un logiciel avec lequel tu devrais ensuite travailler toi-même.",
    "Tu ajoutes ta photo, tu nous donnes ton message ou ton idée — et nous en faisons l’expérience finie.",
    "La technologie reste à l’arrière-plan.",
    "Le résultat reste au premier plan.",
  ],

  aiTitel: "L’IA doit devenir accessible à plus de monde",
  ai: [
    "Une technologie nouvelle appartient d’abord souvent à ceux qui savent s’en servir.",
    "Elle ne devient vraiment intéressante que le jour où tout le monde peut l’utiliser.",
    "C’est exactement là qu’en est l’IA aujourd’hui.",
    "LuxuryBandit essaie de rendre cette technologie si simple que tu n’as jamais besoin de savoir quel modèle, quel prompt ou quel outil vidéo se cache derrière.",
    "Tu dois seulement savoir ce que tu veux dire, montrer ou offrir.",
    "Nous nous occupons du reste.",
  ],

  verspTitel: "Ce que nous te promettons",
  versp: [
    ["Tes photos restent les tiennes.", "Nous ne publions pas automatiquement tes photos et vidéos, et nous ne les revendons jamais. Tu décides ce que tu fais de ton résultat et à qui tu le montres."],
    ["Aucun abonnement caché.", "Tu achètes un produit précis. La seule chose qui continue chaque mois, c’est le wedding planner — et tu peux le résilier à tout moment d’un geste. Pas de prélèvement surprise."],
    ["Le prix est fixé à l’avance.", "Tu vois ce que coûte ton produit avant d’acheter."],
    ["Cinq minutes au lieu de cinq heures.", "Pas de configuration compliquée. Pas de logiciel à apprendre. Pas de prompts à écrire. Tu décides ce que tu veux. Nous nous occupons de la partie technique."],
  ],

  nichtTitel: "Ce que LuxuryBandit ne veut pas être",
  nicht: [
    "Pas un gadget IA de plus.",
    "Pas un outil qui te donne encore plus de travail.",
    "Pas une promesse que la technologie va changer ta vie toute seule.",
    "L’IA peut t’offrir des possibilités.",
    "Ce que tu en fais reste ta décision.",
  ],

  startTitel: "Par où tu commences",
  startLead: [
    "Choisis le moment que tu veux créer.",
    "Un cadeau.",
    "Un message.",
    "Un souvenir.",
    "Ou une vision pour ton futur toi.",
    "Tu apportes l’idée.",
    "Nous la rendons visible.",
  ],
  startCta: "Voir toutes les expériences",
  fein: "Une question, ou quelque chose ne va pas ? ",
  feinLink: "Écris-nous",
};

const pt: AboutText = {
  kicker: "Sobre a LuxuryBandit",
  h1a: "Presentes e momentos únicos da ", h1y: "nova era da IA.",
  portalKurz: "Construímos funnels que vendem — soluções à medida para empreendedores, do anúncio Meta até à compra. Tudo o que vês nesta página são funnels nossos, ao vivo: landing page, vídeo de IA, caixa e entrega, em sete línguas. Testa-os — e se quiseres um para o teu negócio, escreve-nos.",
  portalLang: "A LuxuryBandit constrói funnels de venda de uma só peça: o anúncio, a landing page, o caminho de compra guiado, a caixa, a entrega automática — um só caminho, sete línguas. Cada cartão desta página é um funnel assim, ao vivo: um visitante chega de um anúncio Meta, vê um exemplo, carrega uma foto, paga e recebe o seu vídeo de IA pronto — sem ninguém por trás. É exatamente esse funnel que construímos também para o teu produto.",

  introLead: "A LuxuryBandit transforma fotos pessoais, voz e IA moderna em algo que não se compra simplesmente para esquecer.",
  introListe: [
    "Um filme de aniversário.",
    "Uma mensagem de casamento.",
    "Uma mensagem para o teu eu futuro.",
    "Uma candidatura em vídeo que se destaca.",
    "Um momento pessoal que antes não existia.",
  ],
  introKeineKi: "Não precisas de perceber de IA, aprender nenhum software nem criar nada sozinho.",
  introBringst: [
    "Tu trazes a pessoa, a voz ou a ideia.",
    "Nós transformamos isso na experiência.",
  ],

  werTitel: "Quem está por trás",
  werBild: "Geza — 30 anos na interseção entre design e tecnologia, e a pessoa que responde quando nos escreves.",
  wer: [
    "Geza — há cerca de 30 anos na interseção entre design, tecnologia e pessoas.",
    "Desde 1996 trabalha como designer e consultor de UX para grandes empresas e produtos digitais.",
    "Entre outras, para empresas como a Deutsche Bahn e a Bundesdruckerei.",
    "Também desenvolveu produtos próprios e apresentou uma das suas invenções no «Die Höhle der Löwen», na Alemanha.",
    "Hoje trabalha a partir de Timișoara numa pergunta simples:",
    "Como pode a tecnologia moderna criar algo que não pareça tecnologia — mas sim uma experiência pessoal?",
    "A LuxuryBandit é a resposta.",
  ],

  warumLbTitel: "Porquê a LuxuryBandit?",
  warumLb: [
    "A LuxuryBandit não é um nome sobre luxo.",
    "Nem sobre bandidos.",
    "É sobre uma atitude.",
    "Sobre não deixar simplesmente que te sirvam a tua própria vida.",
    "Não esperar que um dia chegue o momento perfeito.",
    "Não apenas sonhar com o que a vida poderia ser.",
    "Mas sim escolher uma direção.",
    "Tomar uma decisão.",
    "E construir, passo a passo, a vida que realmente queres.",
  ],

  warumTitel: "Porque recebes o resultado — não a ferramenta",
  warum: [
    "Hoje existem inúmeras ferramentas de IA.",
    "Geradores de imagem.",
    "Ferramentas de vídeo.",
    "Programas de edição.",
    "Sistemas de avatares.",
    "Mas a maioria das pessoas não quer aprender ferramentas novas.",
    "Querem um resultado.",
    "Por isso a LuxuryBandit não vende software com o qual depois tens de trabalhar sozinho.",
    "Carregas a tua foto, dás-nos a tua mensagem ou a tua ideia — e nós transformamos isso na experiência pronta.",
    "A tecnologia fica em segundo plano.",
    "O resultado fica em primeiro plano.",
  ],

  aiTitel: "A IA deve ser possível para mais pessoas",
  ai: [
    "Tecnologia nova pertence muitas vezes, no início, a quem sabe usá-la.",
    "Só se torna verdadeiramente interessante no dia em que todos a podem usar.",
    "É exatamente aí que a IA está hoje.",
    "A LuxuryBandit tenta tornar esta tecnologia tão simples que nunca precisas de saber que modelo, que prompt ou que ferramenta de vídeo está por trás.",
    "Só precisas de saber o que queres dizer, mostrar ou oferecer.",
    "O resto tratamos nós.",
  ],

  verspTitel: "O que te prometemos",
  versp: [
    ["As tuas fotos continuam tuas.", "Não publicamos automaticamente as tuas fotos e vídeos, nem os revendemos. Tu decides o que fazes com o teu resultado e a quem o mostras."],
    ["Nenhuma subscrição escondida.", "Compras um produto concreto. A única coisa que continua todos os meses é o wedding planner — e cancelas isso a qualquer momento com um toque. Sem cobrança surpresa."],
    ["O preço fica fixado antes.", "Vês quanto custa o teu produto antes de comprares."],
    ["Cinco minutos em vez de cinco horas.", "Sem configuração complicada. Sem software para aprender. Sem prompts para escrever. Tu decides o que queres. Nós tratamos da parte técnica."],
  ],

  nichtTitel: "O que a LuxuryBandit não quer ser",
  nicht: [
    "Mais um brinquedo de IA.",
    "Uma ferramenta que te dá ainda mais trabalho.",
    "Uma promessa de que a tecnologia muda a tua vida sozinha.",
    "A IA pode dar-te possibilidades.",
    "O que fazes com elas continua a ser decisão tua.",
  ],

  startTitel: "Por onde começas",
  startLead: [
    "Escolhe o momento que queres criar.",
    "Um presente.",
    "Uma mensagem.",
    "Uma memória.",
    "Ou uma visão para o teu eu futuro.",
    "Tu trazes a ideia.",
    "Nós tornamo-la visível.",
  ],
  startCta: "Ver todas as experiências",
  fein: "Dúvidas, ou fizemos algo mal? ",
  feinLink: "Escreve-nos",
};

const it: AboutText = {
  kicker: "Chi siamo",
  h1a: "Regali e momenti unici dalla ", h1y: "nuova era dell’IA.",
  portalKurz: "Costruiamo funnel che vendono — soluzioni su misura per imprenditori, dall'annuncio Meta fino all'acquisto. Tutto ciò che vedi su questa pagina sono funnel nostri, dal vivo: landing page, video IA, cassa e consegna, in sette lingue. Provali — e se ne vuoi uno per la tua attività, scrivici.",
  portalLang: "LuxuryBandit costruisce funnel di vendita in un pezzo solo: l'annuncio, la landing page, il percorso d'acquisto guidato, la cassa, la consegna automatica — un solo percorso, sette lingue. Ogni scheda di questa pagina è un funnel così, dal vivo: un visitatore arriva da un annuncio Meta, vede un esempio, carica una foto, paga e riceve il suo video IA finito — senza nessuno dietro. Ed è esattamente questo funnel che costruiamo anche per il tuo prodotto.",

  introLead: "LuxuryBandit trasforma foto personali, voce e IA moderna in qualcosa che non si compra semplicemente per dimenticarlo.",
  introListe: [
    "Un film di compleanno.",
    "Un messaggio di matrimonio.",
    "Un messaggio al tuo io futuro.",
    "Una candidatura video che si fa notare.",
    "Un momento personale che prima non esisteva.",
  ],
  introKeineKi: "Non devi capire di IA, imparare alcun software né progettare nulla da solo.",
  introBringst: [
    "Tu porti la persona, la voce o l’idea.",
    "Noi la trasformiamo nell’esperienza.",
  ],

  werTitel: "Chi c’è dietro",
  werBild: "Geza — 30 anni all’intersezione tra design e tecnologia, e la persona che risponde quando ci scrivi.",
  wer: [
    "Geza — da circa 30 anni all’intersezione tra design, tecnologia e persone.",
    "Dal 1996 lavora come designer e consulente UX per grandi aziende e prodotti digitali.",
    "Tra le altre, per aziende come Deutsche Bahn e Bundesdruckerei.",
    "Ha anche sviluppato prodotti propri e presentato una delle sue invenzioni a «Die Höhle der Löwen» in Germania.",
    "Oggi lavora da Timișoara su una domanda semplice:",
    "Come può la tecnologia moderna creare qualcosa che non sembri tecnologia — ma un’esperienza personale?",
    "LuxuryBandit è la risposta.",
  ],

  warumLbTitel: "Perché LuxuryBandit?",
  warumLb: [
    "LuxuryBandit non è un nome sul lusso.",
    "E nemmeno sui banditi.",
    "Si tratta di un atteggiamento.",
    "Di non lasciarsi semplicemente servire la propria vita.",
    "Di non aspettare che prima o poi arrivi il momento perfetto.",
    "Di non limitarsi a sognare come potrebbe essere la vita.",
    "Ma scegliere una direzione.",
    "Prendere una decisione.",
    "E costruire, passo dopo passo, la vita che si vuole davvero.",
  ],

  warumTitel: "Perché ricevi il risultato — non lo strumento",
  warum: [
    "Oggi esistono innumerevoli strumenti IA.",
    "Generatori di immagini.",
    "Strumenti video.",
    "Programmi di montaggio.",
    "Sistemi di avatar.",
    "Ma la maggior parte delle persone non vuole imparare nuovi strumenti.",
    "Vogliono un risultato.",
    "Per questo LuxuryBandit non vende software con cui poi devi lavorare da solo.",
    "Carichi la tua foto, ci dai il tuo messaggio o la tua idea — e noi la trasformiamo nell’esperienza finita.",
    "La tecnologia resta sullo sfondo.",
    "Il risultato resta in primo piano.",
  ],

  aiTitel: "L’IA deve diventare possibile per più persone",
  ai: [
    "Una nuova tecnologia all’inizio appartiene spesso a chi sa usarla.",
    "Diventa davvero interessante solo il giorno in cui tutti possono usarla.",
    "È esattamente lì che si trova l’IA oggi.",
    "LuxuryBandit cerca di rendere questa tecnologia così semplice che tu non debba mai sapere quale modello, quale prompt o quale strumento video ci sia dietro.",
    "Devi solo sapere cosa vuoi dire, mostrare o regalare.",
    "Al resto pensiamo noi.",
  ],

  verspTitel: "Cosa ti promettiamo",
  versp: [
    ["Le tue foto restano tue.", "Non pubblichiamo automaticamente le tue foto e i tuoi video, e non li rivendiamo. Decidi tu cosa fare del tuo risultato e a chi mostrarlo."],
    ["Nessun abbonamento nascosto.", "Acquisti un prodotto concreto. L’unica cosa che continua ogni mese è il wedding planner — e lo disdici quando vuoi con un tocco. Nessun addebito a sorpresa."],
    ["Il prezzo è fissato in anticipo.", "Vedi quanto costa il tuo prodotto prima di acquistarlo."],
    ["Cinque minuti invece di cinque ore.", "Nessuna configurazione complicata. Nessun software da imparare. Nessun prompt da scrivere. Decidi tu cosa vuoi. Alla parte tecnica pensiamo noi."],
  ],

  nichtTitel: "Cosa LuxuryBandit non vuole essere",
  nicht: [
    "Non un altro giocattolo IA.",
    "Non uno strumento che ti dà ancora più lavoro.",
    "Non una promessa che la tecnologia cambi la tua vita da sola.",
    "L’IA può darti delle possibilità.",
    "Cosa ne fai resta una tua decisione.",
  ],

  startTitel: "Da dove inizi",
  startLead: [
    "Scegli il momento che vuoi creare.",
    "Un regalo.",
    "Un messaggio.",
    "Un ricordo.",
    "O una visione per il tuo io futuro.",
    "Tu porti l’idea.",
    "Noi la rendiamo visibile.",
  ],
  startCta: "Vedi tutte le esperienze",
  fein: "Domande, o abbiamo sbagliato qualcosa? ",
  feinLink: "Scrivici",
};

const TABELLE: Record<LangArchiv, AboutText> = { de, en, ro, es, fr, pt, it };

export function aboutText(lang?: string): AboutText {
  const l = String(lang ?? "en").slice(0, 2) as Lang;
  return TABELLE[l] ?? TABELLE.en;
}
