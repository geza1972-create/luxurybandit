import type { Lang } from "@/lib/lang";

/**
 * DIE ÜBER-UNS-SEITE IN SIEBEN SPRACHEN (Owner 05.08.2026: „so jetzt die Seite auch
 * übersetzen" — und, nachdem ich es vertagt hatte: „hallo, es ist nicht übersetzt").
 *
 * KÜRZER ALS DIE ENGLISCHE FASSUNG, MIT ABSICHT. Die Seite hatte lange, gebaute Sätze; in
 * sieben Sprachen wären das vierhundert Zeilen, die niemand pflegt und die beim ersten
 * Textwechsel auseinanderlaufen. Kurze Sätze übersetzen sich sauber, lesen sich auf dem Handy
 * besser und sagen dasselbe. Was gestrichen wurde, war Schmuck, kein Inhalt.
 *
 * WAS DRIN IST — alles vom Owner selbst gesagt (05.08.2026): Geza · seit 1996
 * Software-Usability · für Grosskonzerne weltweit · Firmen an die Spitze gebracht · Pitch
 * Winner „Die Höhle der Löwen" in Deutschland · Timișoara als Wohnort, weltweit unterwegs als
 * unabhängiger Digital Nomad · KI als Ära für alle · „in dieser Form bietet das keiner".
 *
 * WAS NICHT DRIN IST, bis er es liefert: Firmennamen, Jahreszahlen zur Sendung, Summen,
 * Kundenlisten. Eine erfundene Referenz hält genau so lange, bis einer nachfragt.
 *
 * DEUTSCH IST DER URTEXT (Hausregel seit 04.08.2026), ENGLISCH die Vorgabe beim Anzeigen.
 * Geschrieben wird oben, gelesen wird `en` — wer eine Zeile ändert, ändert sie zuerst im
 * deutschen Block und trägt sie danach nach.
 */

export type AboutText = {
  kicker: string;
  h1a: string; h1y: string;
  /**
   * DIE BESCHREIBUNG DES PORTALS — DAS ORIGINAL FÜR DIE GANZE SEITE (Owner 10.08.2026:
   * „du machst ab jetzt die Beschreibung des Portals dynamisch. Wir legen das origial in
   * Abou an. Was dort geändert wird, gilt für das ganze portal. Also auch für die
   * Startseite(Topics)").
   *
   * Anlass war ein Satz in den AGB, der seit dem alten Marktplatz dort stand: „LuxuryBandit
   * is a marketplace of influencers." Der Owner: „Luxury bandit nu este un Marketplace de
   * influenceri." Er hatte recht, und der Fehler war nicht der Satz, sondern dass es DREI
   * Beschreibungen gab — eine hier, eine auf der Startseite, eine in den AGB. Drei
   * Beschreibungen altern einzeln; zwei davon werden vergessen.
   *
   * `portalKurz` — ein bis zwei Sätze, für die Startseite und überall, wo Platz knapp ist.
   * `portalLang` — der Absatz, der erklärt, was das hier ist (AGB §1, Über-uns-Seite).
   *
   * WER SIE ÄNDERT, ÄNDERT SIE HIER — und sie ändert sich damit überall.
   */
  portalKurz: string;
  portalLang: string;

  werTitel: string;
  werBild: string;
  wer1: string;
  wer2: string;
  wer3: string;

  warumTitel: string;
  warum1: string;
  warum2: string;

  aiTitel: string;
  ai1: string;
  ai2: string;

  verspTitel: string;
  versp: [string, string][];

  startTitel: string;
  startLead: string;
  startCta: string;
  fein: string;
  feinLink: string;
};

const de: AboutText = {
  kicker: "Über LuxuryBandit",
  h1a: "Einzigartige Geschenke, aus der ", h1y: "neuen KI-Ära",
  portalKurz: "Dein Foto und ihres — ein Kuss, ein Geburtstagsgruß, eine Überraschung, eine Hochzeitseinladung. In Minuten gemacht, an einen Menschen geschickt. Niemand sonst sieht es.",
  portalLang: "Ein Kuss, ein Geburtstagsgruss, eine Hochzeitseinladung, eine Einladung zu zweit wegzufahren — gemacht für einen Menschen und sonst niemanden. Du lädst ein Foto hoch, fertig kommt ein Geschenk heraus. Nichts zu lernen, nichts zu installieren, in fünf Minuten fertig.",

  werTitel: "Wer dahintersteckt",
  werBild: "Geza — dreissig Jahre dasselbe Handwerk, und der Mensch, der antwortet, wenn du uns schreibst.",
  wer1: "Ein Mensch, dreissig Jahre im selben Fach: Geza. Seit 1996 in der Software-Usability — für Grosskonzerne weltweit, und er hat Firmen an die Spitze ihres Marktes gebracht.",
  wer2: "Pitch Winner bei „Die Höhle der Löwen“ in Deutschland.",
  wer3: "Zuhause in Timișoara, Rumänien — und meistens woanders: unabhängiger Digital Nomad, der dort arbeitet, wo das nächste Projekt ist. Usability ist kein Schmuck, sondern eine einzige Frage, dreissig Jahre lang gestellt: Kann ein Mensch das wirklich benutzen?",

  warumTitel: "Warum du das Ergebnis bekommst, nicht das Werkzeug",
  warum1: "Canva und CapCut verkaufen dir Können: Wer dort ankommt, muss gestalten können oder schneiden. Die meisten können das nicht und wollen es auch nicht lernen — sie wollen die Sache selbst.",
  warum2: "Wir verkaufen dir Fertigsein. Ein Foto hochladen, mehr Können braucht es nicht. Alles andere passiert hier, und heraus kommt ein Geschenk, das du verschicken kannst.",

  aiTitel: "KI soll jeden mitnehmen",
  ai1: "Jede Technik gehört am Anfang denen, die sie bedienen können, und wird an dem Tag etwas wert, an dem sie allen anderen gehört. Genau dort steht die KI jetzt — und darum geht es hier: dieselbe Kraft, die die Fachleute haben, in der Hand von jemandem, der einfach einen Menschen glücklich machen will.",
  ai2: "In dieser Form bietet das niemand. Es gibt KI-Bildwerkzeuge, es gibt Videoschnitt, es gibt Kartenläden. Es gibt keinen Ort, der aus deinen eigenen Fotos ein Geschenk mit euren Gesichtern macht, das noch am selben Abend bei jemandem ankommt.",

  verspTitel: "Was wir dir versprechen",
  versp: [
    ["Deine Fotos bleiben deine.", "Sie werden nie veröffentlicht, nie anderen gezeigt, nie verkauft. Geteilt wird nur dein fertiges Ergebnis — und nur, wenn du es selbst teilst."],
    ["Kein Abo auf ein Geschenk.", "Ein Geschenk kauft man einmal. Nichts verlängert sich hinter deinem Rücken, und du musst keinen Kündigen-Knopf suchen, weil es nichts zu kündigen gibt."],
    ["Der Preis steht vor der Arbeit.", "Was es kostet, steht am Eingang — bevor du irgendetwas hochlädst, nicht hinterher an der Kasse."],
    ["Fünf Minuten, nicht fünf Stunden.", "Nichts zu installieren, nichts zu lernen, kein Konto, das du erst anlegen musst."],
  ],

  startTitel: "Wo du anfängst",
  startLead: "Such dir den Anlass aus — der Rest ist ein Foto.",
  startCta: "Alle Geschenke ansehen",
  fein: "Fragen, oder haben wir etwas falsch gemacht? ",
  feinLink: "Schreib uns",
};

const en: AboutText = {
  kicker: "About LuxuryBandit",
  h1a: "One-of-a-kind gifts, from the ", h1y: "new AI era",
  portalKurz: "Your photo and theirs — a kiss, a birthday, a surprise, a wedding invitation. Made in minutes, sent to one person. Nobody else sees it.",
  portalLang: "A kiss, a birthday greeting, a wedding invitation, an invitation to come away together — made for one person and nobody else. You upload one photo; a finished gift comes out. Nothing to learn, nothing to install, ready in five minutes.",

  werTitel: "Who is behind it",
  werBild: "Geza — thirty years in the same craft, and the person who answers when you write to us.",
  wer1: "One person, thirty years in the same craft: Geza. Working in software usability since 1996 — for large corporations around the world, helping companies get to the top of their market.",
  wer2: "Pitch winner on Die Höhle der Löwen in Germany — the show the rest of the world knows as Shark Tank or Dragons’ Den.",
  wer3: "Based in Timișoara, Romania — and usually somewhere else: an independent digital nomad who works wherever the next project is. Usability is not decoration; it is one question, asked for thirty years: can a real person actually use this?",

  warumTitel: "Why you get the result, not the tool",
  warum1: "Canva and CapCut sell you ability: whoever lands there has to be able to design, or to edit. Most people can’t, and don’t want to learn — they want the thing itself.",
  warum2: "We sell you being finished. Upload one photo; that is the entire skill required. Everything else happens here, and what comes out is a gift you can send.",

  aiTitel: "AI should carry everyone along",
  ai1: "Every technology begins by belonging to the people who can operate it, and becomes worth something the day it belongs to everybody else. That is where AI stands now — and that is the point here: the same power the professionals have, in the hands of someone who simply wants to make one person happy.",
  ai2: "Nobody offers this in this form. There are AI image tools, there are video editors, there are card shops. There is no place that turns your own photos into a gift with your faces in it, ready to arrive in someone’s hand the same evening.",

  verspTitel: "What we promise you",
  versp: [
    ["Your photos stay yours.", "Never published, never shown to another user, never sold. Only your finished result can be shared — and only if you share it yourself."],
    ["No subscription on a gift.", "A gift is bought once. Nothing renews behind your back, and there is no cancel button to hunt for, because there is nothing to cancel."],
    ["The price stands before the work.", "What it costs is written at the entrance, before you upload anything — not afterwards, on a checkout page."],
    ["Five minutes, not five hours.", "Nothing to install, nothing to learn, no account to build first."],
  ],

  startTitel: "Where to start",
  startLead: "Pick the occasion — the rest is one photo.",
  startCta: "See all gifts",
  fein: "Questions, or did we get something wrong? ",
  feinLink: "Write to us",
};

const ro: AboutText = {
  kicker: "Despre LuxuryBandit",
  h1a: "Cadouri unicat, din ", h1y: "noua eră AI",
  portalKurz: "Poza ta și a lui — un sărut, o urare de ziua lui, o surpriză, o invitație de nuntă. Gata în câteva minute, trimis unei singure persoane. Nimeni altcineva nu îl vede.",
  portalLang: "Un sărut, o urare de ziua cuiva, o invitație la nuntă, o invitație de a pleca împreună — făcute pentru un singur om și pentru nimeni altcineva. Încarci o poză și iese un cadou gata făcut. Nimic de învățat, nimic de instalat, gata în cinci minute.",

  werTitel: "Cine este în spate",
  werBild: "Geza — treizeci de ani în aceeași meserie, și omul care îți răspunde când ne scrii.",
  wer1: "Un om, treizeci de ani în aceeași meserie: Geza. Din 1996 în usability software — pentru corporații mari din toată lumea, ducând companii în vârful pieței lor.",
  wer2: "Câștigător de pitch la „Die Höhle der Löwen” în Germania — emisiunea cunoscută în lume ca Shark Tank.",
  wer3: "Locuiește în Timișoara, România — și de obicei în altă parte: nomad digital independent, care lucrează acolo unde e următorul proiect. Usability nu e decor, ci o singură întrebare, pusă timp de treizeci de ani: poate un om normal să folosească asta?",

  warumTitel: "De ce primești rezultatul, nu unealta",
  warum1: "Canva și CapCut îți vând pricepere: cine ajunge acolo trebuie să știe să facă design sau montaj. Cei mai mulți nu știu și nici nu vor să învețe — vor lucrul în sine.",
  warum2: "Noi îți vindem faptul că e gata. Încarci o poză, atât. Restul se întâmplă aici, iar ce iese e un cadou pe care îl poți trimite.",

  aiTitel: "AI trebuie să îi ia pe toți cu ea",
  ai1: "Orice tehnologie aparține la început celor care știu să o folosească și devine valoroasă în ziua în care ajunge la toți ceilalți. Acolo e AI acum — și despre asta e vorba aici: aceeași putere pe care o au profesioniștii, în mâna cuiva care vrea doar să bucure un om.",
  ai2: "În forma asta nu o oferă nimeni. Există unelte AI pentru imagini, există montaj video, există magazine de felicitări. Nu există un loc care să transforme pozele tale într-un cadou cu chipurile voastre, gata să ajungă la cineva chiar în seara aceea.",

  verspTitel: "Ce îți promitem",
  versp: [
    ["Pozele tale rămân ale tale.", "Nu sunt publicate niciodată, nu sunt arătate altor utilizatori, nu sunt vândute. Se distribuie doar rezultatul tău final — și doar dacă îl distribui tu."],
    ["Niciun abonament pentru un cadou.", "Un cadou se cumpără o dată. Nimic nu se reînnoiește pe la spatele tău și nu trebuie să cauți un buton de anulare, pentru că nu e nimic de anulat."],
    ["Prețul stă înainte de muncă.", "Cât costă scrie la intrare, înainte să încarci ceva — nu după, pe pagina de plată."],
    ["Cinci minute, nu cinci ore.", "Nimic de instalat, nimic de învățat, niciun cont de făcut mai întâi."],
  ],

  startTitel: "De unde începi",
  startLead: "Alege ocazia — restul e o poză.",
  startCta: "Vezi toate cadourile",
  fein: "Întrebări, sau am greșit ceva? ",
  feinLink: "Scrie-ne",
};

const es: AboutText = {
  kicker: "Sobre LuxuryBandit",
  h1a: "Regalos únicos, de la ", h1y: "nueva era de la IA",
  portalKurz: "Tu foto y la suya — un beso, una felicitación de cumpleaños, una sorpresa, una invitación de boda. Listo en minutos, enviado a una sola persona. Nadie más lo ve.",
  portalLang: "Un beso, una felicitación de cumpleaños, una invitación de boda, una invitación a irse juntos — hechos para una sola persona y para nadie más. Subes una foto y sale un regalo terminado. Nada que aprender, nada que instalar, listo en cinco minutos.",

  werTitel: "Quién está detrás",
  werBild: "Geza — treinta años en el mismo oficio, y la persona que responde cuando nos escribes.",
  wer1: "Una persona, treinta años en el mismo oficio: Geza. Desde 1996 en usabilidad de software — para grandes corporaciones de todo el mundo, llevando empresas a lo más alto de su mercado.",
  wer2: "Ganador de pitch en «Die Höhle der Löwen» en Alemania — el programa que el resto del mundo conoce como Shark Tank.",
  wer3: "Vive en Timișoara, Rumanía — y casi siempre en otro sitio: nómada digital independiente que trabaja donde esté el siguiente proyecto. La usabilidad no es decoración, es una sola pregunta hecha durante treinta años: ¿puede una persona real usar esto?",

  warumTitel: "Por qué recibes el resultado, no la herramienta",
  warum1: "Canva y CapCut te venden habilidad: quien llega allí tiene que saber diseñar o editar. La mayoría no sabe, ni quiere aprender — quiere la cosa en sí.",
  warum2: "Nosotros te vendemos el estar terminado. Sube una foto, esa es toda la habilidad necesaria. Lo demás pasa aquí, y lo que sale es un regalo que puedes enviar.",

  aiTitel: "La IA debería llevarse a todos consigo",
  ai1: "Toda tecnología empieza perteneciendo a quienes saben manejarla, y vale algo el día en que pertenece a todos los demás. Ahí está la IA hoy — y de eso va esto: el mismo poder que tienen los profesionales, en manos de alguien que solo quiere alegrar a una persona.",
  ai2: "Nadie ofrece esto de esta forma. Hay herramientas de imagen con IA, hay editores de vídeo, hay tiendas de tarjetas. No hay un sitio que convierta tus propias fotos en un regalo con vuestras caras, listo para llegar a alguien esa misma noche.",

  verspTitel: "Lo que te prometemos",
  versp: [
    ["Tus fotos siguen siendo tuyas.", "Nunca se publican, nunca se muestran a otros usuarios, nunca se venden. Solo se comparte tu resultado final — y solo si lo compartes tú."],
    ["Ninguna suscripción en un regalo.", "Un regalo se compra una vez. Nada se renueva a tus espaldas, y no tienes que buscar un botón de cancelar, porque no hay nada que cancelar."],
    ["El precio está antes del trabajo.", "Lo que cuesta está escrito en la entrada, antes de que subas nada — no después, en la página de pago."],
    ["Cinco minutos, no cinco horas.", "Nada que instalar, nada que aprender, ninguna cuenta que crear primero."],
  ],

  startTitel: "Por dónde empezar",
  startLead: "Elige la ocasión — el resto es una foto.",
  startCta: "Ver todos los regalos",
  fein: "¿Dudas, o nos hemos equivocado en algo? ",
  feinLink: "Escríbenos",
};

const fr: AboutText = {
  kicker: "À propos de LuxuryBandit",
  h1a: "Des cadeaux uniques, issus de la ", h1y: "nouvelle ère de l’IA",
  portalKurz: "Ta photo et la sienne — un baiser, un vœu d'anniversaire, une surprise, une invitation de mariage. Prêt en quelques minutes, envoyé à une seule personne. Personne d'autre ne le voit.",
  portalLang: "Un baiser, un message d’anniversaire, une invitation de mariage, une invitation à partir à deux — faits pour une seule personne et pour personne d’autre. Tu ajoutes une photo, et un cadeau fini en sort. Rien à apprendre, rien à installer, prêt en cinq minutes.",

  werTitel: "Qui est derrière",
  werBild: "Geza — trente ans dans le même métier, et la personne qui répond quand tu nous écris.",
  wer1: "Une personne, trente ans dans le même métier : Geza. Depuis 1996 dans l’utilisabilité logicielle — pour de grands groupes partout dans le monde, en amenant des entreprises en tête de leur marché.",
  wer2: "Vainqueur de pitch à « Die Höhle der Löwen » en Allemagne — l’émission que le reste du monde connaît sous le nom de Shark Tank.",
  wer3: "Basé à Timișoara, en Roumanie — et le plus souvent ailleurs : nomade numérique indépendant qui travaille là où se trouve le prochain projet. L’utilisabilité n’est pas un décor, c’est une seule question, posée pendant trente ans : une vraie personne peut-elle s’en servir ?",

  warumTitel: "Pourquoi tu reçois le résultat, pas l’outil",
  warum1: "Canva et CapCut te vendent une compétence : celui qui arrive là doit savoir composer ou monter. La plupart ne savent pas et ne veulent pas apprendre — ils veulent la chose elle-même.",
  warum2: "Nous te vendons le fait que ce soit fini. Ajoute une photo, c’est toute la compétence requise. Le reste se passe ici, et il en sort un cadeau que tu peux envoyer.",

  aiTitel: "L’IA doit emmener tout le monde",
  ai1: "Toute technologie appartient d’abord à ceux qui savent s’en servir, et vaut quelque chose le jour où elle appartient à tous les autres. C’est là qu’en est l’IA — et c’est tout le propos : la même puissance que les professionnels, entre les mains de quelqu’un qui veut simplement faire plaisir à une personne.",
  ai2: "Personne ne propose cela sous cette forme. Il existe des outils d’image par IA, des logiciels de montage, des boutiques de cartes. Il n’existe aucun endroit qui transforme tes propres photos en un cadeau avec vos visages, prêt à arriver chez quelqu’un le soir même.",

  verspTitel: "Ce que nous te promettons",
  versp: [
    ["Tes photos restent les tiennes.", "Jamais publiées, jamais montrées à d’autres, jamais vendues. Seul ton résultat fini peut être partagé — et seulement si tu le partages toi-même."],
    ["Aucun abonnement sur un cadeau.", "Un cadeau s’achète une fois. Rien ne se renouvelle dans ton dos, et tu n’as pas à chercher un bouton de résiliation, puisqu’il n’y a rien à résilier."],
    ["Le prix est annoncé avant le travail.", "Ce que ça coûte est écrit à l’entrée, avant que tu n’ajoutes quoi que ce soit — pas après, sur la page de paiement."],
    ["Cinq minutes, pas cinq heures.", "Rien à installer, rien à apprendre, aucun compte à créer d’abord."],
  ],

  startTitel: "Par où commencer",
  startLead: "Choisis l’occasion — le reste, c’est une photo.",
  startCta: "Voir tous les cadeaux",
  fein: "Une question, ou quelque chose ne va pas ? ",
  feinLink: "Écris-nous",
};

const pt: AboutText = {
  kicker: "Sobre a LuxuryBandit",
  h1a: "Presentes únicos, da ", h1y: "nova era da IA",
  portalKurz: "A tua foto e a dela — um beijo, uma mensagem de aniversário, uma surpresa, um convite de casamento. Pronto em minutos, enviado a uma só pessoa. Mais ninguém o vê.",
  portalLang: "Um beijo, uma mensagem de aniversário, um convite de casamento, um convite para fugirem os dois — feitos para uma pessoa e mais ninguém. Carregas uma foto e sai um presente pronto. Nada para aprender, nada para instalar, pronto em cinco minutos.",

  werTitel: "Quem está por trás",
  werBild: "Geza — trinta anos no mesmo ofício, e a pessoa que responde quando nos escreves.",
  wer1: "Uma pessoa, trinta anos no mesmo ofício: Geza. Desde 1996 em usabilidade de software — para grandes empresas em todo o mundo, levando companhias ao topo do seu mercado.",
  wer2: "Vencedor de pitch no «Die Höhle der Löwen» na Alemanha — o programa que o resto do mundo conhece como Shark Tank.",
  wer3: "Vive em Timișoara, Roménia — e quase sempre noutro sítio: nómada digital independente que trabalha onde está o próximo projeto. Usabilidade não é decoração, é uma só pergunta, feita durante trinta anos: uma pessoa real consegue usar isto?",

  warumTitel: "Porque recebes o resultado, não a ferramenta",
  warum1: "A Canva e o CapCut vendem-te capacidade: quem lá chega tem de saber desenhar ou editar. A maioria não sabe nem quer aprender — quer a coisa em si.",
  warum2: "Nós vendemos-te o estar pronto. Carregas uma foto, é essa toda a capacidade necessária. O resto acontece aqui, e o que sai é um presente que podes enviar.",

  aiTitel: "A IA deve levar toda a gente consigo",
  ai1: "Toda a tecnologia começa por pertencer a quem a sabe usar e passa a valer alguma coisa no dia em que pertence a todos os outros. É aí que a IA está agora — e é disso que se trata aqui: o mesmo poder dos profissionais, nas mãos de alguém que só quer fazer uma pessoa feliz.",
  ai2: "Ninguém oferece isto desta forma. Há ferramentas de imagem com IA, há editores de vídeo, há lojas de cartões. Não há um sítio que transforme as tuas fotos num presente com as vossas caras, pronto a chegar às mãos de alguém nessa mesma noite.",

  verspTitel: "O que te prometemos",
  versp: [
    ["As tuas fotos continuam tuas.", "Nunca são publicadas, nunca são mostradas a outros utilizadores, nunca são vendidas. Só o teu resultado final pode ser partilhado — e só se fores tu a partilhá-lo."],
    ["Nenhuma subscrição num presente.", "Um presente compra-se uma vez. Nada se renova nas tuas costas e não tens de procurar um botão de cancelar, porque não há nada para cancelar."],
    ["O preço está antes do trabalho.", "Quanto custa está escrito à entrada, antes de carregares o que quer que seja — não depois, na página de pagamento."],
    ["Cinco minutos, não cinco horas.", "Nada para instalar, nada para aprender, nenhuma conta para criar primeiro."],
  ],

  startTitel: "Por onde começar",
  startLead: "Escolhe a ocasião — o resto é uma foto.",
  startCta: "Ver todos os presentes",
  fein: "Dúvidas, ou fizemos algo mal? ",
  feinLink: "Escreve-nos",
};

const it: AboutText = {
  kicker: "Chi siamo",
  h1a: "Regali unici, dalla ", h1y: "nuova era dell’IA",
  portalKurz: "La tua foto e la sua — un bacio, un augurio di compleanno, una sorpresa, un invito di nozze. Pronto in pochi minuti, mandato a una sola persona. Nessun altro lo vede.",
  portalLang: "Un bacio, un augurio di compleanno, un invito di nozze, un invito a partire in due — fatti per una persona sola e per nessun altro. Carichi una foto ed esce un regalo finito. Niente da imparare, niente da installare, pronto in cinque minuti.",

  werTitel: "Chi c’è dietro",
  werBild: "Geza — trent’anni nello stesso mestiere, e la persona che risponde quando ci scrivi.",
  wer1: "Una persona, trent’anni nello stesso mestiere: Geza. Dal 1996 nell’usabilità del software — per grandi aziende in tutto il mondo, portando imprese in cima al loro mercato.",
  wer2: "Vincitore di pitch a «Die Höhle der Löwen» in Germania — il programma che nel resto del mondo si chiama Shark Tank.",
  wer3: "Vive a Timișoara, in Romania — e quasi sempre altrove: nomade digitale indipendente che lavora dove c’è il prossimo progetto. L’usabilità non è decorazione, è una sola domanda, posta per trent’anni: una persona vera riesce davvero a usarlo?",

  warumTitel: "Perché ricevi il risultato, non lo strumento",
  warum1: "Canva e CapCut ti vendono capacità: chi arriva lì deve saper impaginare o montare. I più non ne sono capaci e non vogliono impararlo — vogliono la cosa in sé.",
  warum2: "Noi ti vendiamo l’essere finito. Carichi una foto, è tutta la capacità richiesta. Il resto succede qui, e quello che esce è un regalo che puoi inviare.",

  aiTitel: "L’IA deve portare avanti tutti",
  ai1: "Ogni tecnologia all’inizio appartiene a chi la sa usare e vale qualcosa il giorno in cui appartiene a tutti gli altri. È lì che si trova l’IA adesso — ed è di questo che si tratta: la stessa potenza dei professionisti, nelle mani di chi vuole solo far felice una persona.",
  ai2: "Nessuno offre questo in questa forma. Ci sono strumenti IA per le immagini, ci sono montaggi video, ci sono negozi di biglietti. Non c’è un posto che trasformi le tue foto in un regalo con i vostri volti, pronto ad arrivare a qualcuno la sera stessa.",

  verspTitel: "Cosa ti promettiamo",
  versp: [
    ["Le tue foto restano tue.", "Mai pubblicate, mai mostrate ad altri utenti, mai vendute. Si condivide solo il tuo risultato finito — e solo se lo condividi tu."],
    ["Nessun abbonamento su un regalo.", "Un regalo si compra una volta. Niente si rinnova alle tue spalle e non devi cercare un tasto per disdire, perché non c’è nulla da disdire."],
    ["Il prezzo sta prima del lavoro.", "Quanto costa è scritto all’ingresso, prima che tu carichi qualsiasi cosa — non dopo, alla cassa."],
    ["Cinque minuti, non cinque ore.", "Niente da installare, niente da imparare, nessun account da creare prima."],
  ],

  startTitel: "Da dove iniziare",
  startLead: "Scegli l’occasione — il resto è una foto.",
  startCta: "Vedi tutti i regali",
  fein: "Domande, o abbiamo sbagliato qualcosa? ",
  feinLink: "Scrivici",
};

const TABELLE: Record<Lang, AboutText> = { de, en, ro, es, fr, pt, it };

export function aboutText(lang?: string): AboutText {
  const l = String(lang ?? "en").slice(0, 2) as Lang;
  return TABELLE[l] ?? TABELLE.en;
}
