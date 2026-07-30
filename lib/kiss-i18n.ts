import { fillPrices } from "@/lib/pricing";
import type { Lang } from "@/lib/lang";

/**
 * DER KUSS-TRICHTER IN SIEBEN SPRACHEN.
 *
 * Owner 30.07.2026, Punkt 4 seiner Liste: „Übersetzung in die acht Sprachen", kurz darauf
 * enger gefasst: „polnisch entfernen, brauchen wir nicht". Die Anzeigen laufen in Rumänien,
 * Deutschland, Italien, Spanien, Frankreich und Portugal — der
 * Trichter sprach bis hierher nur Englisch. Wer in seiner Sprache ankommt, bleibt eher; wer
 * an Schritt 2 nicht versteht, was von ihm verlangt wird, lädt das Falsche hoch (am
 * 30.07.2026 mehrfach passiert) oder springt ab.
 *
 * KEINE ZAHLEN IN DIESEN TABELLEN (Dauerregel des Owners). Preise stehen als Platzhalter
 * — {once}, {price}, {videos} — und werden unten EINMAL aus `lib/pricing` gefüllt. Wer eine
 * Zahl in acht Sprachtabellen abschreibt, vergisst eine.
 *
 * Aufbau: eine vollständige Tabelle je Sprache, danach ein dünner Aufsatz für „Your Idol" —
 * dort unterscheiden sich nur die Zeilen, in denen vom Kuss die Rede ist.
 */

export type KissText = {
  // Schritte
  step1: string; step2: string; step3: string; step4: string;
  pickHint: string; upTitle: string; upHint: string; tapChange: string;
  next: string; pickFirst: string; uploadFirst: string;
  you: string; uploadYou: string; youHint: string; changePhoto: string;
  // Garderobe
  wardrobe: string; paidBadge: string; wardrobeOpen: string; wardrobeLocked: string;
  herDress: string; asInPhoto: string; moreOpen: string; moreClose: string;
  yourClothes: string; myOwnClothes: string; theMoment: string; surpriseMe: string;
  // Adresse vor der Erzeugung
  mailQuestion: string; mailNote: string; mailInvalid: string; oneMoment: string;
  // Knopf und Kleingedrucktes
  ctaFree: string; ctaVideo: string; rendering: string; priceLine: string; paidLine: string; consent: string;
  buyOnce: string; buyAbo: string;
  // Fortschritt
  renderSteps: string[]; teaseSteps: string[];
  // Meldungen
  statusQuality: string; statusCouldNotStart: string; statusFailed: string;
  statusTimeout: string; statusNetwork: string; statusNotWork: string;
  dressingHer: string; gettingReady: string; renderingVideo: string; makingVideo: (s: number) => string;
  videoFailed: string; payPrep: string;
  // Gescheitert
  failTitle: string; failWithMail: (mail: string) => string; failNoMail: string; tryAgain: string;
  // Gratis aufgebraucht
  blockedTitle: string; blockedBody: string; blockedOnce: string; blockedAll: string;
  // Kasse
  payReceived: string; payOpening: string; payMaking: string; payComplete: string;
  readyTitle: string; readyBody: string; watchOnce: string; orAll: string;
  makeVideo: string; makingKiss: string; freeNote: string; secure: string;
  // Ergebnis
  download: string; privateNote: string;
  back: string; examples: string;
  // Das Versprechen, das in jedem Schritt steht (Owner 30.07.2026).
  privat: string;
  // Das Haekchen vor der Erzeugung: AGB, Datenschutz, Speicherung, Angebote.
  zustimmung: string; zustimmungFehlt: string; agbLink: string; datenschutzLink: string;
  // Die im Abo enthaltenen Videos dieses Monats sind aufgebraucht.
  videosWeg: string;
  // Abonnent erkannt: wie viele Videos dieser Monat noch hergibt.
  aboAktiv: (rest: number, gesamt: number) => string;
  extraTitel: string; extraCta: string; extraNote: string;
  // Die Überschrift der Seite (das Gold-Wort steht getrennt) und der Vorspann von „Your Idol".
  heroA: string; heroY: string; heroB: string;
  leadA: string; leadB: string; fine: string;
};

const EN: KissText = {
  step1: "1 · Pick her", step2: "2 · Your photo — you, the man", step3: "3 · The kiss", step4: "4 · Your picture",
  pickHint: "Upload the woman you want to kiss — or swipe to one of ours.",
  upTitle: "Your model", upHint: "Kiss any superstar — just upload a screenshot.",
  tapChange: "Tap to change photo",
  next: "Next →", pickFirst: "Pick her first", uploadFirst: "Upload your photo",
  you: "YOU", uploadYou: "Upload your photo", youHint: "A photo of you — the man in the picture",
  changePhoto: "Change photo",
  wardrobe: "Wardrobe & scene", paidBadge: "Paid videos",
  wardrobeOpen: "Dress her, keep your own clothes or change them, pick the moment.",
  wardrobeLocked: "Unlocked with a paid video — dress her, pick the moment.",
  herDress: "Her dress", asInPhoto: "As in the photo",
  moreOpen: "+ Your clothes & the moment", moreClose: "− Less",
  yourClothes: "Your clothes", myOwnClothes: "My own clothes", theMoment: "The moment", surpriseMe: "✨ Surprise me",
  mailQuestion: "Where should we send your picture?",
  mailNote: "Free. We send you the picture and keep it in your gallery.",
  mailInvalid: "Please enter a valid email address.", oneMoment: "One moment …",
  ctaFree: "Generate picture — free", ctaVideo: "Generate video", rendering: "Rendering …",
  priceLine: "Picture free · Video {once}", paidLine: "✓ Paid — everything below is included",
  consent: "By generating you confirm you may use these photos, everyone shown is an adult, you keep it private — and you take responsibility for it.",
  buyOnce: "Hot video {once}", buyAbo: "All in — {price}/mo",
  renderSteps: [
    "Analyzing your photo …", "Matching the two of you …", "Rendering the kiss …",
    "Getting the light right …", "Almost there …", "Finishing touches …",
    "Any second now …", "Still working — hang on …",
  ],
  teaseSteps: ["Reading both faces …", "Matching the two of you …", "Bringing the moment to life …"],
  statusQuality: "Rendering your kiss in full quality … (~1–3 min)",
  statusCouldNotStart: "Could not start.", statusFailed: "Generation failed.",
  statusTimeout: "Timeout — please try again later.", statusNetwork: "Network error.",
  statusNotWork: "That did not work.",
  dressingHer: "Dressing her …", gettingReady: "Getting you ready …",
  renderingVideo: "Rendering your video … (~1–3 min)", makingVideo: s => `Making your video … (${s} s)`,
  videoFailed: "The video failed.", payPrep: "Payment received — preparing your video …",
  failTitle: "That did not come through",
  failWithMail: m => `We send it to ${m} as soon as it is ready.`,
  failNoMail: "Please try again with another photo.", tryAgain: "Try again",
  blockedTitle: "Your free picture is used up",
  blockedBody: "Three free pictures per person. Keep going with the video — or unlock everything.",
  blockedOnce: "Make a real kiss video — {once}", blockedAll: "Unlock everything — {price}/month",
  payReceived: "Payment received ✓", payOpening: "Opening secure checkout …",
  payMaking: "Making your video — this takes about a minute. Stay on this page.",
  payComplete: "Complete the payment in the window that just opened.",
  readyTitle: "Your video is ready 🔥", readyBody: "Unlock it and watch the two of you.",
  watchOnce: "Watch my kiss video — {once}", orAll: "Or unlock everything — {price}/month",
  makeVideo: "Make a real kiss video 🔥", makingKiss: "Making your kiss video …",
  freeNote: "The picture is yours for free. {once} buys the video, no subscription. ",
  secure: "Secure checkout by Stripe",
  download: "⬇ Download your video",
  privateNote: "🔒 This video is private — for you only. Please don't share it on social media.",
  back: "← Back", examples: "Real kiss videos 💋",
  privat: "🔒 Private: your photos and your result are never published and never shown to other users.",
  zustimmung: "By tapping Next you accept the {agb} and the {privacy}, and news & offers by email.",
  zustimmungFehlt: "Please accept the terms first.", agbLink: "terms", datenschutzLink: "privacy policy",
  videosWeg: "Your {videos} videos for this month are used up.",
  aboAktiv: (r, g) => `Subscription active · ${r} of ${g} videos left this month`,
  extraTitel: "Your videos for this month are used up",
  extraCta: "One more video — {extra}", extraNote: "One video, no new subscription. Your subscription keeps running.",
  heroA: "Kiss any ", heroY: "model", heroB: " 💋",
  leadA: "Take any person you admire — a superstar, a singer, an actress, an athlete, an influencer, or one of our models. One screenshot of her or him is enough.",
  leadB: "Add a photo of yourself and the AI puts the two of you together at a party, side by side. Your two faces, one video that looks like it really happened.",
  fine: "AI-generated, not a real recording — and it's for you, not for social media.",
};

const DE: KissText = {
  step1: "1 · Wähle sie", step2: "2 · Dein Foto — du, der Mann", step3: "3 · Der Kuss", step4: "4 · Dein Bild",
  pickHint: "Lade die Frau hoch, die du küssen willst — oder wische zu einer von uns.",
  upTitle: "Deine Frau", upHint: "Küsse jeden Star — lade einfach ein Bildschirmfoto hoch.",
  tapChange: "Tippen, um das Foto zu wechseln",
  next: "Weiter →", pickFirst: "Wähle zuerst sie", uploadFirst: "Lade dein Foto hoch",
  you: "DU", uploadYou: "Lade dein Foto hoch", youHint: "Ein Foto von dir — der Mann im Bild",
  changePhoto: "Foto wechseln",
  wardrobe: "Garderobe & Szene", paidBadge: "Bezahlte Videos",
  wardrobeOpen: "Zieh sie an, behalte deine Sachen oder wechsle sie, wähle den Moment.",
  wardrobeLocked: "Wird mit einem bezahlten Video frei — zieh sie an, wähle den Moment.",
  herDress: "Ihr Kleid", asInPhoto: "Wie auf dem Foto",
  moreOpen: "+ Deine Sachen & der Moment", moreClose: "− Weniger",
  yourClothes: "Deine Sachen", myOwnClothes: "Meine eigenen Sachen", theMoment: "Der Moment", surpriseMe: "✨ Überrasch mich",
  mailQuestion: "Wohin sollen wir dein Bild schicken?",
  mailNote: "Kostenlos. Wir schicken dir das Bild und heben es in deiner Galerie auf.",
  mailInvalid: "Bitte gib eine gültige E-Mail-Adresse an.", oneMoment: "Einen Moment …",
  ctaFree: "Bild erzeugen — gratis", ctaVideo: "Video erzeugen", rendering: "Wird erzeugt …",
  priceLine: "Bild gratis · Video {once}", paidLine: "✓ Bezahlt — alles hier drunter ist dabei",
  consent: "Mit dem Erzeugen bestätigst du: Du darfst diese Fotos verwenden, alle Abgebildeten sind erwachsen, du behältst es privat — und du trägst die Verantwortung dafür.",
  buyOnce: "Heißes Video {once}", buyAbo: "Alles drin — {price}/Monat",
  renderSteps: [
    "Dein Foto wird gelesen …", "Ihr beide werdet zusammengeführt …", "Der Kuss entsteht …",
    "Das Licht wird gesetzt …", "Fast fertig …", "Letzter Schliff …",
    "Jeden Moment …", "Läuft noch — bleib dran …",
  ],
  teaseSteps: ["Beide Gesichter werden gelesen …", "Ihr beide werdet zusammengeführt …", "Der Moment wird lebendig …"],
  statusQuality: "Dein Kuss wird in voller Qualität erzeugt … (~1–3 Min.)",
  statusCouldNotStart: "Start nicht möglich.", statusFailed: "Erzeugung fehlgeschlagen.",
  statusTimeout: "Zeitüberschreitung — bitte später noch einmal versuchen.", statusNetwork: "Netzwerkfehler.",
  statusNotWork: "Das hat nicht geklappt.",
  dressingHer: "Sie wird angezogen …", gettingReady: "Du wirst fertig gemacht …",
  renderingVideo: "Dein Video wird erzeugt … (~1–3 Min.)", makingVideo: s => `Dein Video entsteht … (${s} s)`,
  videoFailed: "Das Video ist fehlgeschlagen.", payPrep: "Zahlung erhalten — dein Video wird vorbereitet …",
  failTitle: "Das ist nicht durchgekommen",
  failWithMail: m => `Wir schicken es an ${m}, sobald es fertig ist.`,
  failNoMail: "Bitte versuch es mit einem anderen Foto.", tryAgain: "Noch einmal versuchen",
  blockedTitle: "Dein Gratis-Bild ist aufgebraucht",
  blockedBody: "Drei Gratis-Bilder pro Person. Mach mit dem Video weiter — oder schalte alles frei.",
  blockedOnce: "Echtes Kuss-Video machen — {once}", blockedAll: "Alles freischalten — {price}/Monat",
  payReceived: "Zahlung erhalten ✓", payOpening: "Sichere Kasse wird geöffnet …",
  payMaking: "Dein Video entsteht — das dauert etwa eine Minute. Bleib auf dieser Seite.",
  payComplete: "Schließe die Zahlung im Fenster ab, das sich gerade geöffnet hat.",
  readyTitle: "Dein Video ist fertig 🔥", readyBody: "Schalte es frei und sieh euch beide.",
  watchOnce: "Mein Kuss-Video ansehen — {once}", orAll: "Oder alles freischalten — {price}/Monat",
  makeVideo: "Echtes Kuss-Video machen 🔥", makingKiss: "Dein Kuss-Video entsteht …",
  freeNote: "Das Bild gehört dir gratis. {once} kostet das Video, kein Abo. ",
  secure: "Sichere Zahlung über Stripe",
  download: "⬇ Dein Video herunterladen",
  privateNote: "🔒 Dieses Video ist privat — nur für dich. Bitte teile es nicht in sozialen Medien.",
  back: "← Zurück", examples: "Echte Kuss-Videos 💋",
  privat: "🔒 Privat: deine Fotos und dein Ergebnis werden nie veröffentlicht und keinem anderen Nutzer gezeigt.",
  zustimmung: "Mit „Weiter“ akzeptierst du die {agb} und die {privacy}, und News und Angebote per E-Mail.",
  zustimmungFehlt: "Bitte stimme zuerst zu.", agbLink: "AGB", datenschutzLink: "Datenschutzerklärung",
  videosWeg: "Deine {videos} Videos für diesen Monat sind aufgebraucht.",
  aboAktiv: (r, g) => `Abo aktiv · noch ${r} von ${g} Videos diesen Monat`,
  extraTitel: "Deine Videos für diesen Monat sind aufgebraucht",
  extraCta: "Noch ein Video — {extra}", extraNote: "Ein Video, kein neues Abo. Dein Abo läuft normal weiter.",
  heroA: "Küsse jede ", heroY: "Frau", heroB: " 💋",
  leadA: "Nimm jeden Menschen, den du bewunderst — einen Superstar, eine Sängerin, eine Schauspielerin, eine Sportlerin, eine Influencerin oder eine unserer Frauen. Ein einziges Bildschirmfoto genügt.",
  leadB: "Leg ein Foto von dir dazu, und die KI stellt euch beide nebeneinander auf eine Party. Eure zwei Gesichter, ein Video, das aussieht, als wäre es wirklich passiert.",
  fine: "Von KI erzeugt, keine echte Aufnahme — und für dich gedacht, nicht für soziale Medien.",
};

const RO: KissText = {
  step1: "1 · Alege-o", step2: "2 · Poza ta — tu, bărbatul", step3: "3 · Sărutul", step4: "4 · Poza ta",
  pickHint: "Încarcă femeia pe care vrei s-o săruți — sau glisează la una dintre ale noastre.",
  upTitle: "Femeia ta", upHint: "Sărută orice vedetă — încarcă o simplă captură de ecran.",
  tapChange: "Atinge ca să schimbi poza",
  next: "Mai departe →", pickFirst: "Alege-o mai întâi", uploadFirst: "Încarcă poza ta",
  you: "TU", uploadYou: "Încarcă poza ta", youHint: "O poză cu tine — bărbatul din imagine",
  changePhoto: "Schimbă poza",
  wardrobe: "Garderobă & scenă", paidBadge: "Videoclipuri plătite",
  wardrobeOpen: "Îmbrac-o, păstrează-ți hainele sau schimbă-le, alege momentul.",
  wardrobeLocked: "Se deblochează cu un video plătit — îmbrac-o, alege momentul.",
  herDress: "Rochia ei", asInPhoto: "Ca în poză",
  moreOpen: "+ Hainele tale & momentul", moreClose: "− Mai puțin",
  yourClothes: "Hainele tale", myOwnClothes: "Hainele mele", theMoment: "Momentul", surpriseMe: "✨ Surprinde-mă",
  mailQuestion: "Unde să-ți trimitem poza?",
  mailNote: "Gratuit. Îți trimitem poza și o păstrăm în galeria ta.",
  mailInvalid: "Te rog introdu o adresă de email validă.", oneMoment: "O clipă …",
  ctaFree: "Generează poza — gratis", ctaVideo: "Generează videoclipul", rendering: "Se generează …",
  priceLine: "Poza gratis · Video {once}", paidLine: "✓ Plătit — tot ce urmează este inclus",
  consent: "Prin generare confirmi că ai dreptul să folosești aceste poze, că toate persoanele sunt adulte, că păstrezi rezultatul privat — și că îți asumi răspunderea.",
  buyOnce: "Video fierbinte {once}", buyAbo: "Totul inclus — {price}/lună",
  renderSteps: [
    "Îți analizăm poza …", "Vă potrivim pe amândoi …", "Se construiește sărutul …",
    "Se reglează lumina …", "Aproape gata …", "Ultimele retușuri …",
    "Din clipă în clipă …", "Încă lucrăm — mai stai puțin …",
  ],
  teaseSteps: ["Se citesc ambele chipuri …", "Vă potrivim pe amândoi …", "Momentul prinde viață …"],
  statusQuality: "Sărutul tău se generează la calitate maximă … (~1–3 min)",
  statusCouldNotStart: "Nu am putut porni.", statusFailed: "Generarea a eșuat.",
  statusTimeout: "A durat prea mult — încearcă mai târziu.", statusNetwork: "Eroare de rețea.",
  statusNotWork: "Nu a mers.",
  dressingHer: "O îmbrăcăm …", gettingReady: "Te pregătim …",
  renderingVideo: "Videoclipul tău se generează … (~1–3 min)", makingVideo: s => `Se face videoclipul … (${s} s)`,
  videoFailed: "Videoclipul a eșuat.", payPrep: "Plată primită — îți pregătim videoclipul …",
  failTitle: "Nu a ieșit de data asta",
  failWithMail: m => `Ți-l trimitem la ${m} imediat ce e gata.`,
  failNoMail: "Te rog încearcă cu altă poză.", tryAgain: "Încearcă din nou",
  blockedTitle: "Poza gratuită s-a consumat",
  blockedBody: "Trei poze gratuite de persoană. Mergi mai departe cu videoclipul — sau deblochează tot.",
  blockedOnce: "Fă un video real cu sărut — {once}", blockedAll: "Deblochează tot — {price}/lună",
  payReceived: "Plată primită ✓", payOpening: "Se deschide casa securizată …",
  payMaking: "Videoclipul se face — durează aproape un minut. Rămâi pe pagină.",
  payComplete: "Finalizează plata în fereastra care tocmai s-a deschis.",
  readyTitle: "Videoclipul tău e gata 🔥", readyBody: "Deblochează-l și vedeți-vă amândoi.",
  watchOnce: "Vreau să-mi văd videoclipul — {once}", orAll: "Sau deblochează tot — {price}/lună",
  makeVideo: "Fă un video real cu sărut 🔥", makingKiss: "Se face videoclipul tău …",
  freeNote: "Poza e a ta, gratis. {once} costă videoclipul, fără abonament. ",
  secure: "Plată securizată prin Stripe",
  download: "⬇ Descarcă videoclipul",
  privateNote: "🔒 Videoclipul e privat — doar pentru tine. Te rugăm să nu-l distribui pe rețelele sociale.",
  back: "← Înapoi", examples: "Videoclipuri reale cu sărut 💋",
  privat: "🔒 Privat: pozele și rezultatul tău nu sunt niciodată publicate și nu sunt arătate altor utilizatori.",
  zustimmung: "Apăsând „Mai departe“ accepți {agb} și {privacy}, precum și noutățile și ofertele pe email.",
  zustimmungFehlt: "Te rog acceptă mai întâi.", agbLink: "termenii", datenschutzLink: "politica de confidențialitate",
  videosWeg: "Cele {videos} videoclipuri ale lunii s-au terminat.",
  aboAktiv: (r, g) => `Abonament activ · ${r} din ${g} videoclipuri rămase luna asta`,
  extraTitel: "Videoclipurile tale pe luna asta s-au terminat",
  extraCta: "Încă un videoclip — {extra}", extraNote: "Un videoclip, fără abonament nou. Abonamentul tău merge mai departe.",
  heroA: "Sărută orice ", heroY: "femeie", heroB: " 💋",
  leadA: "Ia orice persoană pe care o admiri — o vedetă, o cântăreață, o actriță, o sportivă, o influenceriță sau una dintre femeile noastre. O singură captură de ecran e de ajuns.",
  leadB: "Adaugă o poză cu tine și inteligența artificială vă pune pe amândoi, unul lângă altul, la o petrecere. Două chipuri, un videoclip care pare real.",
  fine: "Generat de inteligență artificială, nu o înregistrare reală — și e pentru tine, nu pentru rețelele sociale.",
};

const ES: KissText = {
  step1: "1 · Elígela", step2: "2 · Tu foto — tú, el hombre", step3: "3 · El beso", step4: "4 · Tu imagen",
  pickHint: "Sube la mujer a la que quieres besar — o desliza hasta una de las nuestras.",
  upTitle: "Tu modelo", upHint: "Besa a cualquier estrella — sube solo una captura de pantalla.",
  tapChange: "Toca para cambiar la foto",
  next: "Siguiente →", pickFirst: "Elígela primero", uploadFirst: "Sube tu foto",
  you: "TÚ", uploadYou: "Sube tu foto", youHint: "Una foto tuya — el hombre de la imagen",
  changePhoto: "Cambiar foto",
  wardrobe: "Vestuario y escena", paidBadge: "Vídeos de pago",
  wardrobeOpen: "Vístela, quédate con tu ropa o cámbiala, elige el momento.",
  wardrobeLocked: "Se desbloquea con un vídeo de pago — vístela, elige el momento.",
  herDress: "Su vestido", asInPhoto: "Como en la foto",
  moreOpen: "+ Tu ropa y el momento", moreClose: "− Menos",
  yourClothes: "Tu ropa", myOwnClothes: "Mi propia ropa", theMoment: "El momento", surpriseMe: "✨ Sorpréndeme",
  mailQuestion: "¿A dónde te enviamos tu imagen?",
  mailNote: "Gratis. Te enviamos la imagen y la guardamos en tu galería.",
  mailInvalid: "Introduce un correo electrónico válido.", oneMoment: "Un momento …",
  ctaFree: "Generar imagen — gratis", ctaVideo: "Generar vídeo", rendering: "Generando …",
  priceLine: "Imagen gratis · Vídeo {once}", paidLine: "✓ Pagado — todo lo de abajo está incluido",
  consent: "Al generar confirmas que puedes usar estas fotos, que todas las personas son adultas, que lo mantendrás privado — y que asumes la responsabilidad.",
  buyOnce: "Vídeo caliente {once}", buyAbo: "Todo incluido — {price}/mes",
  renderSteps: [
    "Analizando tu foto …", "Uniéndoos a los dos …", "Creando el beso …",
    "Ajustando la luz …", "Casi listo …", "Últimos retoques …",
    "En cualquier momento …", "Seguimos trabajando — aguanta …",
  ],
  teaseSteps: ["Leyendo las dos caras …", "Uniéndoos a los dos …", "Dando vida al momento …"],
  statusQuality: "Creando tu beso con la máxima calidad … (~1–3 min)",
  statusCouldNotStart: "No se pudo iniciar.", statusFailed: "La generación ha fallado.",
  statusTimeout: "Ha tardado demasiado — inténtalo más tarde.", statusNetwork: "Error de red.",
  statusNotWork: "Eso no ha funcionado.",
  dressingHer: "Vistiéndola …", gettingReady: "Preparándote a ti …",
  renderingVideo: "Creando tu vídeo … (~1–3 min)", makingVideo: s => `Creando tu vídeo … (${s} s)`,
  videoFailed: "El vídeo ha fallado.", payPrep: "Pago recibido — preparando tu vídeo …",
  failTitle: "Esta vez no ha salido",
  failWithMail: m => `Te lo enviamos a ${m} en cuanto esté listo.`,
  failNoMail: "Inténtalo con otra foto, por favor.", tryAgain: "Intentar de nuevo",
  blockedTitle: "Has gastado tu imagen gratis",
  blockedBody: "Tres imágenes gratis por persona. Sigue con el vídeo — o desbloquéalo todo.",
  blockedOnce: "Haz un vídeo de beso real — {once}", blockedAll: "Desbloquear todo — {price}/mes",
  payReceived: "Pago recibido ✓", payOpening: "Abriendo el pago seguro …",
  payMaking: "Creando tu vídeo — tarda alrededor de un minuto. Quédate en esta página.",
  payComplete: "Completa el pago en la ventana que se acaba de abrir.",
  readyTitle: "Tu vídeo está listo 🔥", readyBody: "Desbloquéalo y veros a los dos.",
  watchOnce: "Ver mi vídeo del beso — {once}", orAll: "O desbloquear todo — {price}/mes",
  makeVideo: "Haz un vídeo de beso real 🔥", makingKiss: "Creando tu vídeo del beso …",
  freeNote: "La imagen es tuya gratis. {once} paga el vídeo, sin suscripción. ",
  secure: "Pago seguro con Stripe",
  download: "⬇ Descargar tu vídeo",
  privateNote: "🔒 Este vídeo es privado — solo para ti. Por favor, no lo compartas en redes sociales.",
  back: "← Atrás", examples: "Vídeos de besos reales 💋",
  privat: "🔒 Privado: tus fotos y tu resultado nunca se publican ni se muestran a otros usuarios.",
  zustimmung: "Al pulsar Siguiente aceptas los {agb} y la {privacy}, y novedades y ofertas por email.",
  zustimmungFehlt: "Acepta primero las condiciones.", agbLink: "términos", datenschutzLink: "política de privacidad",
  videosWeg: "Tus {videos} vídeos de este mes se han agotado.",
  aboAktiv: (r, g) => `Suscripción activa · te quedan ${r} de ${g} vídeos este mes`,
  extraTitel: "Tus vídeos de este mes se han agotado",
  extraCta: "Un vídeo más — {extra}", extraNote: "Un vídeo, sin nueva suscripción. La tuya sigue igual.",
  heroA: "Besa a cualquier ", heroY: "modelo", heroB: " 💋",
  leadA: "Coge a cualquier persona que admires — una superestrella, una cantante, una actriz, una deportista, una influencer o una de nuestras modelos. Basta una captura de pantalla.",
  leadB: "Añade una foto tuya y la IA os pone a los dos juntos en una fiesta, uno al lado del otro. Vuestras dos caras, un vídeo que parece real.",
  fine: "Generado por IA, no es una grabación real — y es para ti, no para las redes sociales.",
};

const FR: KissText = {
  step1: "1 · Choisis-la", step2: "2 · Ta photo — toi, l'homme", step3: "3 · Le baiser", step4: "4 · Ton image",
  pickHint: "Téléverse la femme que tu veux embrasser — ou glisse vers l'une des nôtres.",
  upTitle: "Ton modèle", upHint: "Embrasse n'importe quelle star — une capture d'écran suffit.",
  tapChange: "Touche pour changer la photo",
  next: "Suivant →", pickFirst: "Choisis-la d'abord", uploadFirst: "Téléverse ta photo",
  you: "TOI", uploadYou: "Téléverse ta photo", youHint: "Une photo de toi — l'homme sur l'image",
  changePhoto: "Changer la photo",
  wardrobe: "Garde-robe & scène", paidBadge: "Vidéos payantes",
  wardrobeOpen: "Habille-la, garde tes vêtements ou change-les, choisis le moment.",
  wardrobeLocked: "Débloqué avec une vidéo payante — habille-la, choisis le moment.",
  herDress: "Sa robe", asInPhoto: "Comme sur la photo",
  moreOpen: "+ Tes vêtements & le moment", moreClose: "− Moins",
  yourClothes: "Tes vêtements", myOwnClothes: "Mes propres vêtements", theMoment: "Le moment", surpriseMe: "✨ Surprends-moi",
  mailQuestion: "Où devons-nous envoyer ton image ?",
  mailNote: "Gratuit. Nous t'envoyons l'image et la gardons dans ta galerie.",
  mailInvalid: "Merci d'indiquer une adresse e-mail valide.", oneMoment: "Un instant …",
  ctaFree: "Générer l'image — gratuit", ctaVideo: "Générer la vidéo", rendering: "Génération …",
  priceLine: "Image gratuite · Vidéo {once}", paidLine: "✓ Payé — tout ce qui suit est inclus",
  consent: "En générant, tu confirmes que tu peux utiliser ces photos, que toutes les personnes sont majeures, que tu gardes le résultat privé — et que tu en assumes la responsabilité.",
  buyOnce: "Vidéo chaude {once}", buyAbo: "Tout compris — {price}/mois",
  renderSteps: [
    "Analyse de ta photo …", "On vous réunit tous les deux …", "Le baiser se construit …",
    "Réglage de la lumière …", "Presque fini …", "Dernières retouches …",
    "D'une seconde à l'autre …", "Toujours en cours — encore un instant …",
  ],
  teaseSteps: ["Lecture des deux visages …", "On vous réunit tous les deux …", "Le moment prend vie …"],
  statusQuality: "Ton baiser est créé en pleine qualité … (~1–3 min)",
  statusCouldNotStart: "Impossible de démarrer.", statusFailed: "La génération a échoué.",
  statusTimeout: "Cela a pris trop de temps — réessaie plus tard.", statusNetwork: "Erreur réseau.",
  statusNotWork: "Ça n'a pas marché.",
  dressingHer: "On l'habille …", gettingReady: "On te prépare …",
  renderingVideo: "Ta vidéo est créée … (~1–3 min)", makingVideo: s => `Ta vidéo se fait … (${s} s)`,
  videoFailed: "La vidéo a échoué.", payPrep: "Paiement reçu — ta vidéo se prépare …",
  failTitle: "Ça n'est pas passé cette fois",
  failWithMail: m => `Nous l'envoyons à ${m} dès que c'est prêt.`,
  failNoMail: "Réessaie avec une autre photo.", tryAgain: "Réessayer",
  blockedTitle: "Ton image gratuite est utilisée",
  blockedBody: "Trois images gratuites par personne. Continue avec la vidéo — ou débloque tout.",
  blockedOnce: "Faire une vraie vidéo de baiser — {once}", blockedAll: "Tout débloquer — {price}/mois",
  payReceived: "Paiement reçu ✓", payOpening: "Ouverture du paiement sécurisé …",
  payMaking: "Ta vidéo se fait — cela prend environ une minute. Reste sur cette page.",
  payComplete: "Termine le paiement dans la fenêtre qui vient de s'ouvrir.",
  readyTitle: "Ta vidéo est prête 🔥", readyBody: "Débloque-la et regardez-vous tous les deux.",
  watchOnce: "Voir ma vidéo de baiser — {once}", orAll: "Ou tout débloquer — {price}/mois",
  makeVideo: "Faire une vraie vidéo de baiser 🔥", makingKiss: "Ta vidéo de baiser se fait …",
  freeNote: "L'image est à toi, gratuitement. {once} paie la vidéo, sans abonnement. ",
  secure: "Paiement sécurisé par Stripe",
  download: "⬇ Télécharger ta vidéo",
  privateNote: "🔒 Cette vidéo est privée — rien que pour toi. Merci de ne pas la partager sur les réseaux sociaux.",
  back: "← Retour", examples: "De vraies vidéos de baiser 💋",
  privat: "🔒 Privé : tes photos et ton résultat ne sont jamais publiés ni montrés à d'autres utilisateurs.",
  zustimmung: "En appuyant sur Suivant, tu acceptes les {agb} et la {privacy}, ainsi que les nouveautés et offres par e-mail.",
  zustimmungFehlt: "Merci d'accepter d'abord.", agbLink: "conditions", datenschutzLink: "politique de confidentialité",
  videosWeg: "Tes {videos} vidéos du mois sont épuisées.",
  aboAktiv: (r, g) => `Abonnement actif · ${r} vidéos sur ${g} restantes ce mois-ci`,
  extraTitel: "Tes vidéos du mois sont épuisées",
  extraCta: "Une vidéo de plus — {extra}", extraNote: "Une vidéo, sans nouvel abonnement. Le tien continue normalement.",
  heroA: "Embrasse n'importe quelle ", heroY: "femme", heroB: " 💋",
  leadA: "Prends n'importe qui que tu admires — une superstar, une chanteuse, une actrice, une sportive, une influenceuse ou l'une de nos modèles. Une seule capture d'écran suffit.",
  leadB: "Ajoute une photo de toi et l'IA vous met tous les deux côte à côte à une fête. Vos deux visages, une vidéo qui semble réelle.",
  fine: "Généré par IA, ce n'est pas un vrai enregistrement — et c'est pour toi, pas pour les réseaux sociaux.",
};

const PT: KissText = {
  step1: "1 · Escolhe-a", step2: "2 · A tua foto — tu, o homem", step3: "3 · O beijo", step4: "4 · A tua imagem",
  pickHint: "Carrega a mulher que queres beijar — ou desliza para uma das nossas.",
  upTitle: "A tua modelo", upHint: "Beija qualquer estrela — basta uma captura de ecrã.",
  tapChange: "Toca para trocar a foto",
  next: "Seguinte →", pickFirst: "Escolhe-a primeiro", uploadFirst: "Carrega a tua foto",
  you: "TU", uploadYou: "Carrega a tua foto", youHint: "Uma foto tua — o homem na imagem",
  changePhoto: "Trocar foto",
  wardrobe: "Guarda-roupa e cenário", paidBadge: "Vídeos pagos",
  wardrobeOpen: "Veste-a, mantém a tua roupa ou troca-a, escolhe o momento.",
  wardrobeLocked: "Desbloqueia com um vídeo pago — veste-a, escolhe o momento.",
  herDress: "O vestido dela", asInPhoto: "Como na foto",
  moreOpen: "+ A tua roupa e o momento", moreClose: "− Menos",
  yourClothes: "A tua roupa", myOwnClothes: "A minha própria roupa", theMoment: "O momento", surpriseMe: "✨ Surpreende-me",
  mailQuestion: "Para onde enviamos a tua imagem?",
  mailNote: "Grátis. Enviamos-te a imagem e guardamo-la na tua galeria.",
  mailInvalid: "Indica um endereço de email válido.", oneMoment: "Um momento …",
  ctaFree: "Gerar imagem — grátis", ctaVideo: "Gerar vídeo", rendering: "A gerar …",
  priceLine: "Imagem grátis · Vídeo {once}", paidLine: "✓ Pago — tudo abaixo está incluído",
  consent: "Ao gerar confirmas que podes usar estas fotos, que todas as pessoas são adultas, que manténs o resultado privado — e que assumes a responsabilidade.",
  buyOnce: "Vídeo quente {once}", buyAbo: "Tudo incluído — {price}/mês",
  renderSteps: [
    "A analisar a tua foto …", "A juntar-vos aos dois …", "A criar o beijo …",
    "A acertar a luz …", "Quase pronto …", "Últimos retoques …",
    "A qualquer segundo …", "Ainda a trabalhar — aguenta …",
  ],
  teaseSteps: ["A ler os dois rostos …", "A juntar-vos aos dois …", "O momento ganha vida …"],
  statusQuality: "O teu beijo está a ser criado em qualidade máxima … (~1–3 min)",
  statusCouldNotStart: "Não foi possível iniciar.", statusFailed: "A geração falhou.",
  statusTimeout: "Demorou demasiado — tenta mais tarde.", statusNetwork: "Erro de rede.",
  statusNotWork: "Isso não resultou.",
  dressingHer: "A vesti-la …", gettingReady: "A preparar-te …",
  renderingVideo: "O teu vídeo está a ser criado … (~1–3 min)", makingVideo: s => `A fazer o teu vídeo … (${s} s)`,
  videoFailed: "O vídeo falhou.", payPrep: "Pagamento recebido — a preparar o teu vídeo …",
  failTitle: "Desta vez não saiu",
  failWithMail: m => `Enviamos-to para ${m} assim que estiver pronto.`,
  failNoMail: "Tenta com outra foto, por favor.", tryAgain: "Tentar de novo",
  blockedTitle: "A tua imagem grátis acabou",
  blockedBody: "Três imagens grátis por pessoa. Continua com o vídeo — ou desbloqueia tudo.",
  blockedOnce: "Fazer um vídeo de beijo a sério — {once}", blockedAll: "Desbloquear tudo — {price}/mês",
  payReceived: "Pagamento recebido ✓", payOpening: "A abrir o pagamento seguro …",
  payMaking: "O teu vídeo está a ser feito — demora cerca de um minuto. Fica nesta página.",
  payComplete: "Conclui o pagamento na janela que acabou de abrir.",
  readyTitle: "O teu vídeo está pronto 🔥", readyBody: "Desbloqueia-o e vejam-se os dois.",
  watchOnce: "Ver o meu vídeo do beijo — {once}", orAll: "Ou desbloquear tudo — {price}/mês",
  makeVideo: "Fazer um vídeo de beijo a sério 🔥", makingKiss: "A fazer o teu vídeo do beijo …",
  freeNote: "A imagem é tua, grátis. {once} paga o vídeo, sem subscrição. ",
  secure: "Pagamento seguro via Stripe",
  download: "⬇ Descarregar o teu vídeo",
  privateNote: "🔒 Este vídeo é privado — só para ti. Por favor não o partilhes nas redes sociais.",
  back: "← Voltar", examples: "Vídeos de beijo a sério 💋",
  privat: "🔒 Privado: as tuas fotos e o teu resultado nunca são publicados nem mostrados a outros utilizadores.",
  zustimmung: "Ao tocar em Seguinte aceitas os {agb} e a {privacy}, e novidades e ofertas por email.",
  zustimmungFehlt: "Aceita primeiro as condições.", agbLink: "termos", datenschutzLink: "política de privacidade",
  videosWeg: "Os teus {videos} vídeos deste mês acabaram.",
  aboAktiv: (r, g) => `Subscrição ativa · faltam ${r} de ${g} vídeos este mês`,
  extraTitel: "Os teus vídeos deste mês acabaram",
  extraCta: "Mais um vídeo — {extra}", extraNote: "Um vídeo, sem nova subscrição. A tua continua igual.",
  heroA: "Beija qualquer ", heroY: "modelo", heroB: " 💋",
  leadA: "Escolhe qualquer pessoa que admires — uma estrela, uma cantora, uma atriz, uma atleta, uma influenciadora ou uma das nossas modelos. Basta uma captura de ecrã.",
  leadB: "Junta uma foto tua e a IA coloca-vos aos dois lado a lado numa festa. Os vossos dois rostos, um vídeo que parece real.",
  fine: "Gerado por IA, não é uma gravação real — e é para ti, não para as redes sociais.",
};


const IT: KissText = {
  step1: "1 · Scegli lei", step2: "2 · La tua foto — tu, l'uomo", step3: "3 · Il bacio", step4: "4 · La tua immagine",
  pickHint: "Carica la donna che vuoi baciare — o scorri fino a una delle nostre.",
  upTitle: "La tua modella", upHint: "Bacia qualsiasi star — basta uno screenshot.",
  tapChange: "Tocca per cambiare la foto",
  next: "Avanti →", pickFirst: "Prima scegli lei", uploadFirst: "Carica la tua foto",
  you: "TU", uploadYou: "Carica la tua foto", youHint: "Una foto di te — l'uomo nell'immagine",
  changePhoto: "Cambia foto",
  wardrobe: "Guardaroba e scena", paidBadge: "Video a pagamento",
  wardrobeOpen: "Vestila, tieni i tuoi vestiti o cambiali, scegli il momento.",
  wardrobeLocked: "Si sblocca con un video a pagamento — vestila, scegli il momento.",
  herDress: "Il suo vestito", asInPhoto: "Come nella foto",
  moreOpen: "+ I tuoi vestiti e il momento", moreClose: "− Meno",
  yourClothes: "I tuoi vestiti", myOwnClothes: "I miei vestiti", theMoment: "Il momento", surpriseMe: "✨ Sorprendimi",
  mailQuestion: "Dove ti mandiamo la tua immagine?",
  mailNote: "Gratis. Ti mandiamo l'immagine e la teniamo nella tua galleria.",
  mailInvalid: "Inserisci un indirizzo email valido.", oneMoment: "Un attimo …",
  ctaFree: "Genera l'immagine — gratis", ctaVideo: "Genera il video", rendering: "Generazione …",
  priceLine: "Immagine gratis · Video {once}", paidLine: "✓ Pagato — tutto qui sotto è incluso",
  consent: "Generando confermi di poter usare queste foto, che tutte le persone sono maggiorenni, che lo terrai privato — e che te ne assumi la responsabilità.",
  buyOnce: "Video bollente {once}", buyAbo: "Tutto incluso — {price}/mese",
  renderSteps: [
    "Analizziamo la tua foto …", "Vi mettiamo insieme …", "Nasce il bacio …",
    "Sistemiamo la luce …", "Quasi fatto …", "Ultimi ritocchi …",
    "Da un momento all'altro …", "Ci stiamo ancora lavorando — resisti …",
  ],
  teaseSteps: ["Leggiamo i due volti …", "Vi mettiamo insieme …", "Il momento prende vita …"],
  statusQuality: "Il tuo bacio nasce in piena qualità … (~1–3 min)",
  statusCouldNotStart: "Non è stato possibile avviare.", statusFailed: "La generazione è fallita.",
  statusTimeout: "Ci è voluto troppo — riprova più tardi.", statusNetwork: "Errore di rete.",
  statusNotWork: "Non ha funzionato.",
  dressingHer: "La vestiamo …", gettingReady: "Ti prepariamo …",
  renderingVideo: "Il tuo video nasce … (~1–3 min)", makingVideo: s => `Stiamo facendo il tuo video … (${s} s)`,
  videoFailed: "Il video è fallito.", payPrep: "Pagamento ricevuto — prepariamo il tuo video …",
  failTitle: "Stavolta non è passata",
  failWithMail: m => `Te lo mandiamo a ${m} appena è pronto.`,
  failNoMail: "Riprova con un'altra foto, per favore.", tryAgain: "Riprova",
  blockedTitle: "La tua immagine gratis è finita",
  blockedBody: "Tre immagini gratis a persona. Vai avanti con il video — o sblocca tutto.",
  blockedOnce: "Fai un vero video del bacio — {once}", blockedAll: "Sblocca tutto — {price}/mese",
  payReceived: "Pagamento ricevuto ✓", payOpening: "Apriamo la cassa sicura …",
  payMaking: "Il tuo video si sta facendo — ci vuole circa un minuto. Resta su questa pagina.",
  payComplete: "Completa il pagamento nella finestra che si è appena aperta.",
  readyTitle: "Il tuo video è pronto 🔥", readyBody: "Sbloccalo e guardatevi tutti e due.",
  watchOnce: "Guarda il mio video del bacio — {once}", orAll: "Oppure sblocca tutto — {price}/mese",
  makeVideo: "Fai un vero video del bacio 🔥", makingKiss: "Stiamo facendo il tuo video del bacio …",
  freeNote: "L'immagine è tua, gratis. {once} paga il video, nessun abbonamento. ",
  secure: "Pagamento sicuro con Stripe",
  download: "⬇ Scarica il tuo video",
  privateNote: "🔒 Questo video è privato — solo per te. Per favore non condividerlo sui social.",
  back: "← Indietro", examples: "Veri video di baci 💋",
  privat: "🔒 Privato: le tue foto e il tuo risultato non vengono mai pubblicati né mostrati ad altri utenti.",
  zustimmung: "Toccando Avanti accetti i {agb} e la {privacy}, e novità e offerte via email.",
  zustimmungFehlt: "Accetta prima le condizioni.", agbLink: "termini", datenschutzLink: "informativa privacy",
  videosWeg: "I tuoi {videos} video di questo mese sono finiti.",
  aboAktiv: (r, g) => `Abbonamento attivo · ${r} di ${g} video rimasti questo mese`,
  extraTitel: "I tuoi video di questo mese sono finiti",
  extraCta: "Un altro video — {extra}", extraNote: "Un video, nessun nuovo abbonamento. Il tuo continua normalmente.",
  heroA: "Bacia qualsiasi ", heroY: "modella", heroB: " 💋",
  leadA: "Prendi chiunque tu ammiri — una superstar, una cantante, un'attrice, una sportiva, un'influencer o una delle nostre modelle. Basta uno screenshot.",
  leadB: "Aggiungi una tua foto e l'IA mette voi due insieme a una festa, fianco a fianco. I vostri due volti, un video che sembra vero.",
  fine: "Generato dall'IA, non è una registrazione reale — ed è per te, non per i social.",
};

const TABELLE: Record<Lang, KissText> = { en: EN, de: DE, ro: RO, es: ES, fr: FR, pt: PT, it: IT };

/**
 * „YOUR IDOL" — derselbe Trichter, andere Sprache an sechs Stellen: dort geht es nicht um
 * einen Kuss, sondern um einen gemeinsamen Moment. Nur die Abweichungen stehen hier; alles
 * andere kommt aus der Tabelle oben und muss nie zweimal gepflegt werden.
 */
const IDOL: Record<Lang, Partial<KissText>> = {
  en: {
    step1: "1 · Pick your idol", step3: "3 · The moment",
    pickHint: "Any singer, actress, athlete or influencer — swipe to your own upload, or take one of ours.",
    upTitle: "Your idol", upHint: "Any star you like — just upload one screenshot of her or him.",
    readyTitle: "Your video is ready ✨", makeVideo: "Make a real video 🔥", makingKiss: "Making your video …",
    watchOnce: "Watch my video — {once}", blockedOnce: "Make a real video — {once}",
    heroA: "Your idol ", heroY: "with you", heroB: " ✨",
    examples: "The two of you ✨",
  },
  de: {
    step1: "1 · Wähle dein Idol", step3: "3 · Der Moment",
    pickHint: "Sängerin, Schauspielerin, Sportlerin oder Influencerin — wische zu deinem eigenen Foto oder nimm eine von uns.",
    upTitle: "Dein Idol", upHint: "Wer immer dir gefällt — ein Bildschirmfoto genügt.",
    readyTitle: "Dein Video ist fertig ✨", makeVideo: "Echtes Video machen 🔥", makingKiss: "Dein Video entsteht …",
    watchOnce: "Mein Video ansehen — {once}", blockedOnce: "Echtes Video machen — {once}",
    heroA: "Dein Idol ", heroY: "mit dir", heroB: " ✨",
    examples: "Ihr beide ✨",
  },
  ro: {
    step1: "1 · Alege-ți idolul", step3: "3 · Momentul",
    pickHint: "Cântăreață, actriță, sportivă sau influenceriță — glisează la poza ta sau ia una dintre ale noastre.",
    upTitle: "Idolul tău", upHint: "Oricine îți place — o captură de ecran e de ajuns.",
    readyTitle: "Videoclipul tău e gata ✨", makeVideo: "Fă un video real 🔥", makingKiss: "Se face videoclipul tău …",
    watchOnce: "Vreau să-mi văd videoclipul — {once}", blockedOnce: "Fă un video real — {once}",
    heroA: "Idolul tău ", heroY: "lângă tine", heroB: " ✨",
    examples: "Voi doi ✨",
  },
  es: {
    step1: "1 · Elige a tu ídolo", step3: "3 · El momento",
    pickHint: "Cantante, actriz, deportista o influencer — desliza a tu propia foto o coge una de las nuestras.",
    upTitle: "Tu ídolo", upHint: "Quien tú quieras — basta con una captura de pantalla.",
    readyTitle: "Tu vídeo está listo ✨", makeVideo: "Haz un vídeo real 🔥", makingKiss: "Creando tu vídeo …",
    watchOnce: "Ver mi vídeo — {once}", blockedOnce: "Haz un vídeo real — {once}",
    heroA: "Tu ídolo ", heroY: "contigo", heroB: " ✨",
    examples: "Vosotros dos ✨",
  },
  fr: {
    step1: "1 · Choisis ton idole", step3: "3 · Le moment",
    pickHint: "Chanteuse, actrice, sportive ou influenceuse — glisse vers ta propre photo ou prends l'une des nôtres.",
    upTitle: "Ton idole", upHint: "Qui tu veux — une capture d'écran suffit.",
    readyTitle: "Ta vidéo est prête ✨", makeVideo: "Faire une vraie vidéo 🔥", makingKiss: "Ta vidéo se fait …",
    watchOnce: "Voir ma vidéo — {once}", blockedOnce: "Faire une vraie vidéo — {once}",
    heroA: "Ton idole ", heroY: "avec toi", heroB: " ✨",
    examples: "Vous deux ✨",
  },
  pt: {
    step1: "1 · Escolhe o teu ídolo", step3: "3 · O momento",
    pickHint: "Cantora, atriz, atleta ou influenciadora — desliza para a tua foto ou escolhe uma das nossas.",
    upTitle: "O teu ídolo", upHint: "Quem quiseres — basta uma captura de ecrã.",
    readyTitle: "O teu vídeo está pronto ✨", makeVideo: "Fazer um vídeo a sério 🔥", makingKiss: "A fazer o teu vídeo …",
    watchOnce: "Ver o meu vídeo — {once}", blockedOnce: "Fazer um vídeo a sério — {once}",
    heroA: "O teu ídolo ", heroY: "contigo", heroB: " ✨",
    examples: "Vocês os dois ✨",
  },
  it: {
    step1: "1 · Scegli il tuo idolo", step3: "3 · Il momento",
    pickHint: "Cantante, attrice, sportiva o influencer — scorri fino alla tua foto o prendi una delle nostre.",
    upTitle: "Il tuo idolo", upHint: "Chi vuoi tu — basta uno screenshot.",
    readyTitle: "Il tuo video è pronto ✨", makeVideo: "Fai un vero video 🔥", makingKiss: "Stiamo facendo il tuo video …",
    watchOnce: "Guarda il mio video — {once}", blockedOnce: "Fai un vero video — {once}",
    heroA: "Il tuo idolo ", heroY: "con te", heroB: " ✨",
    examples: "Voi due ✨",
  },
};

/**
 * Die fertigen Texte für eine Sprache — Preise schon eingesetzt.
 *
 * Jede Zeichenkette läuft durch `fillPrices`, damit {once}/{price}/{videos} überall gefüllt
 * sind und in KEINER Sprachtabelle eine Zahl steht. Funktionen (z. B. die Sekundenanzeige)
 * bleiben unangetastet, Listen werden Zeile für Zeile gefüllt.
 */
export function kissText(lang: string | undefined, variant: "kiss" | "idol" = "kiss"): KissText {
  const l = (lang && lang in TABELLE ? lang : "en") as Lang;
  const roh: KissText = variant === "idol" ? { ...TABELLE[l], ...IDOL[l] } : TABELLE[l];
  const out = {} as Record<string, unknown>;
  for (const [k, v] of Object.entries(roh)) {
    if (typeof v === "string") out[k] = fillPrices(v, l);
    else if (Array.isArray(v)) out[k] = v.map(x => (typeof x === "string" ? fillPrices(x, l) : x));
    else out[k] = v;
  }
  return out as KissText;
}
