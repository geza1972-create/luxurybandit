/**
 * DIE TRY-ON-TEXTE — Landingpage UND Tunnel-Seite aus EINER Tabelle (Owner 13.08.2026:
 * „tryon muss auch eine Landingpage haben wie die anderen"). Bewusst eine kleine eigene
 * Datei statt eines Overlays in lib/kiss-i18n.ts: der Try-on läuft nicht im KissFunnel,
 * er braucht nur diese Handvoll Zeilen. Sieben Sprachen, kein Polnisch (lib/lang.ts).
 * Preise stehen hier NICHT — die Gratis-Zeile nennt keinen Betrag, und die Stufen nennt
 * die Try-on-Seite selbst aus lib/pricing (Dauerregel `prices-only-from-pricing-table`).
 */
export type TryonText = {
  kicker: string; h1a: string; h1y: string;
  lead: string;
  cta: string;
  schritt2: string;
  merkmaleTitel: string;
  merkmale: { titel: string; text: string }[];
  privat: string;
  /** Schritt 3 im Tunnel: Kachel-Titel, Ergebnis-Link, Kill-Switch-Zeile. */
  fotoKachel: string; ergebnisLink: string; pause: string;
  /** Owner 13.08.2026, wörtlich: Nur Bilder von dir selbst dürfen hochgeladen werden. */
  nurEigene: string;
};

export const TRYON_TEXTE: Record<string, TryonText> = {
  en: {
    kicker: "Try this look", h1a: "See yourself ", h1y: "in the look",
    lead: "Pick a look from the wardrobe, upload one photo of yourself — and get your try-on video, in your card.",
    cta: "Try this look",
    schritt2: "Pick the look you want to try",
    merkmaleTitel: "How it works",
    merkmale: [
      { titel: "Pick the look", text: "Statement pieces from the catalogue — dresses, gowns, beach-luxe." },
      { titel: "One photo of you", text: "A clear photo is enough. It stays private." },
      { titel: "Your video", text: "We put you in the look — as a video in your card." },
      { titel: "In your gallery", text: "Your video waits in your gallery — share it or keep it." },
    ],
    privat: "Private · only for you · nothing is posted anywhere",
    fotoKachel: "Your photo", ergebnisLink: "Make it yours →", pause: "Try-on is taking a short break — your look is saved, come back in a bit.",
    nurEigene: "Only photos of yourself may be uploaded.",
  },
  de: {
    kicker: "Try this look", h1a: "Sieh dich selbst ", h1y: "im Look",
    lead: "Wähl einen Look aus der Wardrobe, lad ein Foto von dir hoch — und bekomm dein Try-on-Video, in deiner Karte.",
    cta: "Try this look",
    schritt2: "Wähl den Look, den du anprobieren willst",
    merkmaleTitel: "So geht es",
    merkmale: [
      { titel: "Look wählen", text: "Statement-Teile aus dem Katalog — Kleider, Roben, Beach-Luxe." },
      { titel: "Ein Foto von dir", text: "Ein klares Foto genügt. Es bleibt privat." },
      { titel: "Dein Video", text: "Wir setzen dich in den Look — als Video in deiner Karte." },
      { titel: "In deiner Galerie", text: "Dein Video wartet in deiner Galerie — teilen oder behalten." },
    ],
    privat: "Privat · nur für dich · nichts wird irgendwo veröffentlicht",
    fotoKachel: "Dein Foto", ergebnisLink: "Mach es deins →", pause: "Der Try-on macht gerade eine kurze Pause — dein Look ist gemerkt, schau gleich wieder rein.",
    nurEigene: "Nur Bilder von dir selbst dürfen hochgeladen werden.",
  },
  ro: {
    kicker: "Try this look", h1a: "Vezi-te pe tine ", h1y: "în acest look",
    lead: "Alege un look din wardrobe, încarcă o poză cu tine — și primești videoclipul tău try-on, în cardul tău.",
    cta: "Try this look",
    schritt2: "Alege look-ul pe care vrei să-l probezi",
    merkmaleTitel: "Cum funcționează",
    merkmale: [
      { titel: "Alege look-ul", text: "Piese statement din catalog — rochii, ținute de seară, beach-luxe." },
      { titel: "O poză cu tine", text: "O poză clară e de ajuns. Rămâne privată." },
      { titel: "Videoclipul tău", text: "Te punem în look — ca videoclip în cardul tău." },
      { titel: "În galeria ta", text: "Videoclipul te așteaptă în galerie — îl împarți sau îl păstrezi." },
    ],
    privat: "Privat · doar pentru tine · nimic nu se publică nicăieri",
    fotoKachel: "Poza ta", ergebnisLink: "Fă-l al tău →", pause: "Try-on face o scurtă pauză — look-ul tău e salvat, revino puțin mai târziu.",
    nurEigene: "Pot fi încărcate doar poze cu tine.",
  },
  es: {
    kicker: "Try this look", h1a: "Mírate a ti misma ", h1y: "con el look",
    lead: "Elige un look del wardrobe, sube una foto tuya — y recibe tu vídeo de try-on, en tu tarjeta.",
    cta: "Try this look",
    schritt2: "Elige el look que quieres probarte",
    merkmaleTitel: "Cómo funciona",
    merkmale: [
      { titel: "Elige el look", text: "Piezas statement del catálogo — vestidos, trajes de noche, beach-luxe." },
      { titel: "Una foto tuya", text: "Basta una foto clara. Se queda en privado." },
      { titel: "Tu vídeo", text: "Te ponemos en el look — como vídeo en tu tarjeta." },
      { titel: "En tu galería", text: "Tu vídeo te espera en la galería — compártelo o guárdalo." },
    ],
    privat: "Privado · solo para ti · nada se publica en ningún sitio",
    fotoKachel: "Tu foto", ergebnisLink: "Hazlo tuyo →", pause: "El try-on hace una pequeña pausa — tu look queda guardado, vuelve en un rato.",
    nurEigene: "Solo se pueden subir fotos de ti misma.",
  },
  fr: {
    kicker: "Try this look", h1a: "Vois-toi ", h1y: "dans ce look",
    lead: "Choisis un look du wardrobe, envoie une photo de toi — et reçois ta vidéo try-on, dans ta carte.",
    cta: "Try this look",
    schritt2: "Choisis le look que tu veux essayer",
    merkmaleTitel: "Comment ça marche",
    merkmale: [
      { titel: "Choisis le look", text: "Des pièces statement du catalogue — robes, tenues de soirée, beach-luxe." },
      { titel: "Une photo de toi", text: "Une photo nette suffit. Elle reste privée." },
      { titel: "Ta vidéo", text: "Nous te mettons dans le look — en vidéo, dans ta carte." },
      { titel: "Dans ta galerie", text: "Ta vidéo t’attend dans ta galerie — partage-la ou garde-la." },
    ],
    privat: "Privé · rien que pour toi · rien n’est publié nulle part",
    fotoKachel: "Ta photo", ergebnisLink: "Fais-le tien →", pause: "Le try-on fait une courte pause — ton look est gardé, reviens dans un instant.",
    nurEigene: "Seules des photos de toi peuvent être envoyées.",
  },
  pt: {
    kicker: "Try this look", h1a: "Vê-te a ti mesma ", h1y: "com o look",
    lead: "Escolhe um look do wardrobe, envia uma foto tua — e recebe o teu vídeo de try-on, no teu cartão.",
    cta: "Try this look",
    schritt2: "Escolhe o look que queres experimentar",
    merkmaleTitel: "Como funciona",
    merkmale: [
      { titel: "Escolhe o look", text: "Peças statement do catálogo — vestidos, trajes de gala, beach-luxe." },
      { titel: "Uma foto tua", text: "Basta uma foto nítida. Fica privada." },
      { titel: "O teu vídeo", text: "Colocamos-te no look — como vídeo no teu cartão." },
      { titel: "Na tua galeria", text: "O teu vídeo espera-te na galeria — partilha-o ou guarda-o." },
    ],
    privat: "Privado · só para ti · nada é publicado em lado nenhum",
    fotoKachel: "A tua foto", ergebnisLink: "Torna-o teu →", pause: "O try-on está numa pequena pausa — o teu look fica guardado, volta daqui a pouco.",
    nurEigene: "Só podem ser carregadas fotos de ti.",
  },
  it: {
    kicker: "Try this look", h1a: "Guardati ", h1y: "nel look",
    lead: "Scegli un look dal wardrobe, carica una tua foto — e ricevi il tuo video try-on, nella tua card.",
    cta: "Try this look",
    schritt2: "Scegli il look che vuoi provare",
    merkmaleTitel: "Come funziona",
    merkmale: [
      { titel: "Scegli il look", text: "Pezzi statement dal catalogo — abiti, toilette da sera, beach-luxe." },
      { titel: "Una tua foto", text: "Basta una foto nitida. Resta privata." },
      { titel: "Il tuo video", text: "Ti mettiamo nel look — come video nella tua card." },
      { titel: "Nella tua galleria", text: "Il tuo video ti aspetta in galleria — condividilo o tienilo." },
    ],
    privat: "Privato · solo per te · niente viene pubblicato da nessuna parte",
    fotoKachel: "La tua foto", ergebnisLink: "Fallo tuo →", pause: "Il try-on fa una breve pausa — il tuo look è salvato, torna tra poco.",
    nurEigene: "Si possono caricare solo foto di te stessa.",
  },
};

export function tryonText(lang: string | undefined): TryonText {
  return TRYON_TEXTE[String(lang ?? "en").slice(0, 2)] ?? TRYON_TEXTE.en;
}
