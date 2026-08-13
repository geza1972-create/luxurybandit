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
  /** Pivot 13.08.2026 abends (Owner: user laden selber klamotten hoch, nicht mehr unsere). */
  teilKachel: string; teilHinweis: string;
  /** Owner 13.08.2026, wörtlich: Nur Bilder von dir selbst dürfen hochgeladen werden. */
  nurEigene: string;
};

export const TRYON_TEXTE: Record<string, TryonText> = {
  en: {
    kicker: "Try this look", h1a: "See yourself ", h1y: "in the look",
    lead: "Upload the garment and one photo of yourself — and get your try-on video, in your card.",
    cta: "Try this look",
    schritt2: "Pick the look you want to try",
    merkmaleTitel: "How it works",
    merkmale: [
      { titel: "Your garment", text: "Any piece you love — a shop photo of it is enough." },
      { titel: "One photo of you", text: "A clear photo is enough. It stays private." },
      { titel: "Your video", text: "We put you in the look — as a video in your card." },
      { titel: "In your gallery", text: "Your video waits in your gallery — share it or keep it." },
    ],
    privat: "Private · only for you · nothing is posted anywhere",
    fotoKachel: "Your photo", ergebnisLink: "Make it yours →", pause: "Try-on is taking a short break — your look is saved, come back in a bit.",
    nurEigene: "Only photos of yourself may be uploaded.",
    teilKachel: "The garment", teilHinweis: "A photo of the piece — a shop photo works.",
  },
  de: {
    kicker: "Try this look", h1a: "Sieh dich selbst ", h1y: "im Look",
    lead: "Lad das Kleidungsstück und ein Foto von dir hoch — und bekomm dein Try-on-Video, in deiner Karte.",
    cta: "Try this look",
    schritt2: "Wähl den Look, den du anprobieren willst",
    merkmaleTitel: "So geht es",
    merkmale: [
      { titel: "Dein Teil", text: "Jedes Stück, das du liebst — ein Shop-Foto davon genügt." },
      { titel: "Ein Foto von dir", text: "Ein klares Foto genügt. Es bleibt privat." },
      { titel: "Dein Video", text: "Wir setzen dich in den Look — als Video in deiner Karte." },
      { titel: "In deiner Galerie", text: "Dein Video wartet in deiner Galerie — teilen oder behalten." },
    ],
    privat: "Privat · nur für dich · nichts wird irgendwo veröffentlicht",
    fotoKachel: "Dein Foto", ergebnisLink: "Mach es deins →", pause: "Der Try-on macht gerade eine kurze Pause — dein Look ist gemerkt, schau gleich wieder rein.",
    nurEigene: "Nur Bilder von dir selbst dürfen hochgeladen werden.",
    teilKachel: "Das Kleidungsstück", teilHinweis: "Ein Foto des Teils — ein Shop-Foto genügt.",
  },
  ro: {
    kicker: "Try this look", h1a: "Vezi-te pe tine ", h1y: "în acest look",
    lead: "Încarcă piesa și o poză cu tine — și primești videoclipul tău try-on, în cardul tău.",
    cta: "Try this look",
    schritt2: "Alege look-ul pe care vrei să-l probezi",
    merkmaleTitel: "Cum funcționează",
    merkmale: [
      { titel: "Piesa ta", text: "Orice piesă care îți place — o poză din magazin e de ajuns." },
      { titel: "O poză cu tine", text: "O poză clară e de ajuns. Rămâne privată." },
      { titel: "Videoclipul tău", text: "Te punem în look — ca videoclip în cardul tău." },
      { titel: "În galeria ta", text: "Videoclipul te așteaptă în galerie — îl împarți sau îl păstrezi." },
    ],
    privat: "Privat · doar pentru tine · nimic nu se publică nicăieri",
    fotoKachel: "Poza ta", ergebnisLink: "Fă-l al tău →", pause: "Try-on face o scurtă pauză — look-ul tău e salvat, revino puțin mai târziu.",
    nurEigene: "Pot fi încărcate doar poze cu tine.",
    teilKachel: "Articolul de îmbrăcăminte", teilHinweis: "O poză a piesei — o poză din magazin e de ajuns.",
  },
  es: {
    kicker: "Try this look", h1a: "Mírate a ti misma ", h1y: "con el look",
    lead: "Sube la prenda y una foto tuya — y recibe tu vídeo de try-on, en tu tarjeta.",
    cta: "Try this look",
    schritt2: "Elige el look que quieres probarte",
    merkmaleTitel: "Cómo funciona",
    merkmale: [
      { titel: "Tu prenda", text: "Cualquier pieza que te guste — basta una foto de tienda." },
      { titel: "Una foto tuya", text: "Basta una foto clara. Se queda en privado." },
      { titel: "Tu vídeo", text: "Te ponemos en el look — como vídeo en tu tarjeta." },
      { titel: "En tu galería", text: "Tu vídeo te espera en la galería — compártelo o guárdalo." },
    ],
    privat: "Privado · solo para ti · nada se publica en ningún sitio",
    fotoKachel: "Tu foto", ergebnisLink: "Hazlo tuyo →", pause: "El try-on hace una pequeña pausa — tu look queda guardado, vuelve en un rato.",
    nurEigene: "Solo se pueden subir fotos de ti misma.",
    teilKachel: "La prenda", teilHinweis: "Una foto de la prenda — vale una foto de tienda.",
  },
  fr: {
    kicker: "Try this look", h1a: "Vois-toi ", h1y: "dans ce look",
    lead: "Envoie le vêtement et une photo de toi — et reçois ta vidéo try-on, dans ta carte.",
    cta: "Try this look",
    schritt2: "Choisis le look que tu veux essayer",
    merkmaleTitel: "Comment ça marche",
    merkmale: [
      { titel: "Ta pièce", text: "N’importe quelle pièce que tu aimes — une photo boutique suffit." },
      { titel: "Une photo de toi", text: "Une photo nette suffit. Elle reste privée." },
      { titel: "Ta vidéo", text: "Nous te mettons dans le look — en vidéo, dans ta carte." },
      { titel: "Dans ta galerie", text: "Ta vidéo t’attend dans ta galerie — partage-la ou garde-la." },
    ],
    privat: "Privé · rien que pour toi · rien n’est publié nulle part",
    fotoKachel: "Ta photo", ergebnisLink: "Fais-le tien →", pause: "Le try-on fait une courte pause — ton look est gardé, reviens dans un instant.",
    nurEigene: "Seules des photos de toi peuvent être envoyées.",
    teilKachel: "Le vêtement", teilHinweis: "Une photo de la pièce — une photo boutique suffit.",
  },
  pt: {
    kicker: "Try this look", h1a: "Vê-te a ti mesma ", h1y: "com o look",
    lead: "Envia a peça e uma foto tua — e recebe o teu vídeo de try-on, no teu cartão.",
    cta: "Try this look",
    schritt2: "Escolhe o look que queres experimentar",
    merkmaleTitel: "Como funciona",
    merkmale: [
      { titel: "A tua peça", text: "Qualquer peça que adores — uma foto de loja chega." },
      { titel: "Uma foto tua", text: "Basta uma foto nítida. Fica privada." },
      { titel: "O teu vídeo", text: "Colocamos-te no look — como vídeo no teu cartão." },
      { titel: "Na tua galeria", text: "O teu vídeo espera-te na galeria — partilha-o ou guarda-o." },
    ],
    privat: "Privado · só para ti · nada é publicado em lado nenhum",
    fotoKachel: "A tua foto", ergebnisLink: "Torna-o teu →", pause: "O try-on está numa pequena pausa — o teu look fica guardado, volta daqui a pouco.",
    nurEigene: "Só podem ser carregadas fotos de ti.",
    teilKachel: "A peça de roupa", teilHinweis: "Uma foto da peça — uma foto de loja chega.",
  },
  it: {
    kicker: "Try this look", h1a: "Guardati ", h1y: "nel look",
    lead: "Carica il capo e una tua foto — e ricevi il tuo video try-on, nella tua card.",
    cta: "Try this look",
    schritt2: "Scegli il look che vuoi provare",
    merkmaleTitel: "Come funziona",
    merkmale: [
      { titel: "Il tuo capo", text: "Qualsiasi capo che ami — basta una foto del negozio." },
      { titel: "Una tua foto", text: "Basta una foto nitida. Resta privata." },
      { titel: "Il tuo video", text: "Ti mettiamo nel look — come video nella tua card." },
      { titel: "Nella tua galleria", text: "Il tuo video ti aspetta in galleria — condividilo o tienilo." },
    ],
    privat: "Privato · solo per te · niente viene pubblicato da nessuna parte",
    fotoKachel: "La tua foto", ergebnisLink: "Fallo tuo →", pause: "Il try-on fa una breve pausa — il tuo look è salvato, torna tra poco.",
    nurEigene: "Si possono caricare solo foto di te stessa.",
    teilKachel: "Il capo", teilHinweis: "Una foto del capo — basta una foto del negozio.",
  },
};

export function tryonText(lang: string | undefined): TryonText {
  return TRYON_TEXTE[String(lang ?? "en").slice(0, 2)] ?? TRYON_TEXTE.en;
}
