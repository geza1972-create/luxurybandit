import type { Lang } from "@/lib/lang";

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
  h1a: "Einzigartige Geschenke und Momente aus der ", h1y: "neuen KI-Ära.",
  portalKurz: "Persönliche Videos aus deinen eigenen Fotos — ein Geburtstagsgruss, eure Hochzeitseinladung, ein Kuss, deine Video-Bewerbung. Von KI gebaut, in Minuten fertig, privat, bis du selbst teilst. Und für Online-Shops gibt es unsere Anprobe-Technologie als eigene Lösung: hier testen, bei uns einkaufen.",
  portalLang: "Ein Kuss, ein Geburtstagsgruss, eine Hochzeitseinladung, eine Video-Bewerbung für den nächsten Job, oder eine Botschaft an dein zukünftiges Ich — gemacht für einen Menschen und sonst niemanden. Du lädst ein Foto hoch, fertig kommt das Video heraus. Nichts zu lernen, nichts zu installieren, in fünf Minuten fertig.",

  introLead: "LuxuryBandit verbindet persönliche Fotos, Stimme und moderne KI zu etwas, das man nicht einfach kauft und vergisst.",
  introListe: [
    "Ein Geburtstagsfilm.",
    "Eine Hochzeitsbotschaft.",
    "Eine Nachricht an dein zukünftiges Ich.",
    "Eine Video-Bewerbung, die auffällt.",
    "Ein persönlicher Moment, den es so vorher nicht gab.",
  ],
  introKeineKi: "Du musst dafür keine KI verstehen, keine Software lernen und nichts selbst gestalten.",
  introBringst: [
    "Du bringst die Person, die Stimme oder die Idee.",
    "Wir machen daraus das Erlebnis.",
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
    "Aber die meisten Menschen wollen keine neuen Tools lernen.",
    "Sie wollen ein Ergebnis.",
    "Deshalb verkauft LuxuryBandit keine Software, mit der du anschließend selbst arbeiten musst.",
    "Du lädst dein Foto hoch, gibst uns deine Botschaft oder deine Idee — und wir machen daraus das fertige Erlebnis.",
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
    ["Deine Fotos bleiben deine.", "Wir veröffentlichen deine Fotos und Videos nicht automatisch und verkaufen sie nicht weiter. Du entscheidest, was du mit deinem Ergebnis machst und wem du es zeigst."],
    ["Kein verstecktes Abo.", "Du kaufst ein konkretes Produkt. Das Einzige, das monatlich weiterläuft, ist der Hochzeitsplaner — und den kündigst du jederzeit mit einem Tipp. Keine überraschende Abbuchung."],
    ["Der Preis steht vorher fest.", "Du siehst vor dem Kauf, was dein Produkt kostet."],
    ["Fünf Minuten statt fünf Stunden.", "Kein kompliziertes Setup. Keine Software lernen. Keine Prompts schreiben. Du entscheidest, was du willst. Wir kümmern uns um den technischen Teil."],
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
    "Such dir den Moment aus, den du erschaffen willst.",
    "Ein Geschenk.",
    "Eine Botschaft.",
    "Eine Erinnerung.",
    "Oder eine Vision für dein zukünftiges Ich.",
    "Du bringst die Idee.",
    "Wir machen sie sichtbar.",
  ],
  startCta: "Alle Erlebnisse ansehen",
  fein: "Fragen, oder haben wir etwas falsch gemacht? ",
  feinLink: "Schreib uns",
};

const en: AboutText = {
  kicker: "About LuxuryBandit",
  h1a: "One-of-a-kind gifts and moments from the ", h1y: "new AI era.",
  portalKurz: "Personal videos from your own photos — a birthday greeting, your wedding invitation, a kiss, your video application. Built by AI, ready in minutes, private until you share. And for online shops, our try-on technology is available as its own solution: test it here, buy it from us.",
  portalLang: "A kiss, a birthday greeting, a wedding invitation, a video application for your next job, or a message to your future self — made for one person and nobody else. You upload one photo; a finished video comes out. Nothing to learn, nothing to install, ready in five minutes.",

  introLead: "LuxuryBandit turns personal photos, voice, and modern AI into something you don't just buy and forget.",
  introListe: [
    "A birthday film.",
    "A wedding message.",
    "A message to your future self.",
    "A video application that stands out.",
    "A personal moment that never existed before.",
  ],
  introKeineKi: "You don't need to understand AI, learn any software, or design anything yourself.",
  introBringst: [
    "You bring the person, the voice, or the idea.",
    "We turn it into the experience.",
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
    "Today there are countless AI tools.",
    "Image generators.",
    "Video tools.",
    "Editing software.",
    "Avatar systems.",
    "But most people don't want to learn new tools.",
    "They want a result.",
    "That's why LuxuryBandit doesn't sell software you then have to work with yourself.",
    "You upload your photo, give us your message or your idea — and we turn it into the finished experience.",
    "Technology stays in the background.",
    "The result stays in the foreground.",
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
    ["Your photos stay yours.", "We don't automatically publish your photos and videos, and we never resell them. You decide what you do with your result and who you show it to."],
    ["No hidden subscription.", "You buy one specific product. The only thing that keeps running monthly is the wedding planner — and you can cancel that any time with one tap. No surprise charge."],
    ["The price is fixed upfront.", "You see what your product costs before you buy."],
    ["Five minutes instead of five hours.", "No complicated setup. No software to learn. No prompts to write. You decide what you want. We take care of the technical part."],
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
    "Pick the moment you want to create.",
    "A gift.",
    "A message.",
    "A memory.",
    "Or a vision for your future self.",
    "You bring the idea.",
    "We make it visible.",
  ],
  startCta: "See all experiences",
  fein: "Questions, or did we get something wrong? ",
  feinLink: "Write to us",
};

const ro: AboutText = {
  kicker: "Despre LuxuryBandit",
  h1a: "Cadouri și momente unicat din ", h1y: "noua eră AI.",
  portalKurz: "Videoclipuri personale din fotografiile tale — o urare de ziua cuiva, invitația voastră la nuntă, un sărut, aplicația ta video pentru un job. Create de AI, gata în câteva minute, private până le distribui tu. Iar pentru magazinele online, tehnologia noastră de probă virtuală există ca soluție separată: o testezi aici, o cumperi de la noi.",
  portalLang: "Un sărut, o urare de ziua cuiva, o invitație la nuntă, o aplicație video pentru următorul job, sau un mesaj către eul tău din viitor — făcute pentru un singur om și pentru nimeni altcineva. Încarci o poză și iese videoclipul gata făcut. Nimic de învățat, nimic de instalat, gata în cinci minute.",

  introLead: "LuxuryBandit combină fotografii personale, voce și AI modern într-un lucru pe care nu îl cumperi ca să-l uiți.",
  introListe: [
    "Un film de ziua de naștere.",
    "Un mesaj de nuntă.",
    "Un mesaj către eul tău din viitor.",
    "O aplicație video care iese în evidență.",
    "Un moment personal care nu a existat înainte.",
  ],
  introKeineKi: "Nu trebuie să înțelegi AI, să înveți niciun program și nici să creezi nimic singur.",
  introBringst: [
    "Tu aduci persoana, vocea sau ideea.",
    "Noi transformăm asta în experiență.",
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
    "Dar majoritatea oamenilor nu vor să învețe unelte noi.",
    "Vor un rezultat.",
    "De aceea LuxuryBandit nu vinde software cu care să lucrezi apoi singur.",
    "Încarci poza, ne dai mesajul sau ideea ta — și noi transformăm asta în experiența finită.",
    "Tehnologia rămâne în fundal.",
    "Rezultatul rămâne în prim-plan.",
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
    ["Pozele tale rămân ale tale.", "Nu publicăm automat pozele și videoclipurile tale și nu le revindem. Tu decizi ce faci cu rezultatul tău și cui i-l arăți."],
    ["Niciun abonament ascuns.", "Cumperi un produs concret. Singurul lucru care continuă lunar este planificatorul de nuntă — și îl anulezi oricând cu o atingere. Fără o taxă surpriză."],
    ["Prețul e clar dinainte.", "Vezi înainte de cumpărare cât costă produsul tău."],
    ["Cinci minute în loc de cinci ore.", "Fără configurare complicată. Fără software de învățat. Fără prompturi de scris. Tu decizi ce vrei. Noi ne ocupăm de partea tehnică."],
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
    "Alege momentul pe care vrei să-l creezi.",
    "Un cadou.",
    "Un mesaj.",
    "O amintire.",
    "Sau o viziune pentru eul tău din viitor.",
    "Tu aduci ideea.",
    "Noi o facem vizibilă.",
  ],
  startCta: "Vezi toate experiențele",
  fein: "Întrebări, sau am greșit ceva? ",
  feinLink: "Scrie-ne",
};

const es: AboutText = {
  kicker: "Sobre LuxuryBandit",
  h1a: "Regalos y momentos únicos de la ", h1y: "nueva era de la IA.",
  portalKurz: "Vídeos personales hechos con tus propias fotos — una felicitación de cumpleaños, vuestra invitación de boda, un beso, tu candidatura en vídeo. Creados por IA, listos en minutos, privados hasta que tú los compartas. Y para tiendas online, nuestra tecnología de prueba virtual existe como solución propia: pruébala aquí, cómprala con nosotros.",
  portalLang: "Un beso, una felicitación de cumpleaños, una invitación de boda, una candidatura en vídeo para tu próximo trabajo, o un mensaje para tu yo futuro — hechos para una sola persona y para nadie más. Subes una foto y sale el vídeo terminado. Nada que aprender, nada que instalar, listo en cinco minutos.",

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
  portalKurz: "Des vidéos personnelles à partir de tes propres photos — un message d'anniversaire, votre invitation de mariage, un baiser, ta candidature vidéo. Créées par l'IA, prêtes en quelques minutes, privées jusqu'à ce que tu les partages. Et pour les boutiques en ligne, notre technologie d'essayage virtuel existe comme solution à part : teste-la ici, achète-la chez nous.",
  portalLang: "Un baiser, un message d’anniversaire, une invitation de mariage, une candidature vidéo pour ton prochain emploi, ou un message à ton futur toi — faits pour une seule personne et pour personne d’autre. Tu ajoutes une photo, et la vidéo finie en sort. Rien à apprendre, rien à installer, prêt en cinq minutes.",

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
  portalKurz: "Vídeos pessoais feitos com as tuas próprias fotos — uma mensagem de aniversário, o vosso convite de casamento, um beijo, a tua candidatura em vídeo. Criados por IA, prontos em minutos, privados até tu os partilhares. E para lojas online, a nossa tecnologia de prova virtual existe como solução própria: testa-a aqui, compra-a connosco.",
  portalLang: "Um beijo, uma mensagem de aniversário, um convite de casamento, uma candidatura em vídeo para o próximo emprego, ou uma mensagem para o teu eu futuro — feitos para uma pessoa e mais ninguém. Carregas uma foto e sai o vídeo pronto. Nada para aprender, nada para instalar, pronto em cinco minutos.",

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
  portalKurz: "Video personali dalle tue foto — un augurio di compleanno, il vostro invito di nozze, un bacio, la tua candidatura video. Creati dall'IA, pronti in pochi minuti, privati finché non li condividi tu. E per i negozi online, la nostra tecnologia di prova virtuale esiste come soluzione a sé: la provi qui, la compri da noi.",
  portalLang: "Un bacio, un augurio di compleanno, un invito di nozze, una candidatura video per il prossimo lavoro, o un messaggio al tuo io futuro — fatti per una persona sola e per nessun altro. Carichi una foto ed esce il video finito. Niente da imparare, niente da installare, pronto in cinque minuti.",

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

const TABELLE: Record<Lang, AboutText> = { de, en, ro, es, fr, pt, it };

export function aboutText(lang?: string): AboutText {
  const l = String(lang ?? "en").slice(0, 2) as Lang;
  return TABELLE[l] ?? TABELLE.en;
}
