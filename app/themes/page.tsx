import Link from "next/link";
import { fillPrices, themenPreisZeile } from "@/lib/pricing";
import { GEBURTSTAG_VIDEO } from "@/lib/geburtstag";
import { Kicker, H1, Y, SectionTitle, Lead } from "@/components/Landing";
import { ThemenListe } from "@/components/CI";
import TopNav from "@/components/TopNav";
import SchleifenVideo from "@/components/SchleifenVideo";
import TrackView from "@/components/TrackView";
import SeitenFuss from "@/components/SeitenFuss";
import { Cake, Sparkles, Flame, MapPin, Lock, Palmtree, Shirt, Star, Heart, Users, Gift, MessageCircle, Target, FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { buildBellaCard, BELLA_ID } from "@/lib/bella-card";
/* Aus `lib`, nicht aus dem Baustein: PlanSlide ist ein Client-Modul, und von dort käme
   hier nur eine Client-Referenz an — die Kachel blieb dadurch ohne Bild. */
import { resolveLang } from "@/lib/lang-server";
import { VERSPRECHEN_VIDEO, VERSPRECHEN_POSTER } from "@/lib/versprechen";
import { HOCHZEIT_VIDEO, HOCHZEIT_VIDEO_POSTER } from "@/lib/hochzeit-video";
import { LEBENSLAUF_BEISPIEL_VIDEO, LEBENSLAUF_BEISPIEL_POSTER } from "@/lib/lebenslauf-vorlage";
/* DAS ORIGINAL DER PORTAL-BESCHREIBUNG liegt in „Über uns" (Owner 10.08.2026) — von dort
   holen es Startseite und AGB, damit es nur EINE Fassung gibt. */
import { aboutText } from "@/lib/about-i18n";
import { trObject } from "@/lib/tr-object";
import { readCardStudioSlides, getSignedUrl, isPublicBellaPost, sortBellaPosts, readTryThisLookState, readKissConfig, readThemeConfig } from "@/lib/try-this-look-store";
import { WHATSAPP_CHANNEL, followWhatsApp } from "@/lib/social";

// Katalog aller „Themen" als bildstarke Galerie (wie die Reel-/Models-Galerie).
// Aktiv: Wetter am Morgen (/themes/wetter/<model>). Weitere sind vorbereitet (coming soon).
export const dynamic = "force-dynamic"; // Cover-Foto (signierte URL) frisch laden

/**
 * DIESE ANGABEN GELTEN FUER „/" MIT (app/page.tsx zieht sie sich herueber).
 *
 * Der Titel fuehrt mit der MARKE und danach mit dem, was es hier zu holen gibt. Vorher stand
 * „AI marketplace — …" vorn: Bei einer Suche nach „luxurybandit" ist der Markenname aber genau
 * das Wort, das der Suchende wiederfinden will. Die Stichwoerter dahinter bleiben, sie tragen
 * die Suchtreffer jenseits der Marke.
 *
 * `canonical: "/"` — nicht „/themes": Beide Adressen zeigen dieselbe Seite, und die Marke
 * gehoert an die blanke Adresse. So sammelt „/" die Kraft beider, statt sie zu teilen.
 */
export const metadata = {
  title: "LuxuryBandit — Funnels Creator: from the Meta ad to the sale",
  description: fillPrices("We build funnels that sell — custom solutions for entrepreneurs, from the Meta ad to the purchase. Every funnel on this page is live: landing page, AI video, checkout and delivery in seven languages.", "en"),
  /* KEINE Deepfake-/AI-Girl-Begriffe mehr (Owner 24.08.2026: „Wir sind jetzt ein seriöses
     Portal" · zum Kuss: „wenn man das nicht als solches bewirbt, sondern als Tool, ist es
     OK") — beworben wird das Werkzeug aus eigenen Fotos, nie das Wort. */
  keywords: ["sales funnel", "funnel creator", "meta ads funnel", "ai video generator", "ai video maker", "wedding invitation video", "birthday video maker", "video application", "video cv", "virtual try-on for ecommerce"],
  alternates: { canonical: "/" },
  openGraph: {
    title: "LuxuryBandit — Funnels Creator",
    description: "We build funnels that sell — from the Meta ad to the purchase. Every funnel on this page is live: landing page, AI video, checkout and delivery in seven languages.",
    type: "website",
  },
};

type Theme = { icon: LucideIcon; title: string; tagline: string; href?: string; cover?: string; video?: string; poster?: string; chips?: string; cover2?: string;
  /** Sprech-/Porträtvideos: Zuschnitt oben ankern (Skill `card`, 24.08.2026). */
  ausrichtung?: "mitte" | "oben";
  /**
   * DER EINSTIEGSPREIS AUF DER KACHEL (Owner 03.08.2026: "erst mal will ich die Topics in
   * einer Reihe und die Preise haben ab...").
   *
   * Bewusst als fertiger Text und nicht als Zahl: Die Themen kosten heute NICHT dasselbe.
   * Kuss, Geburtstag und Ueberraschung nehmen einen Einzelpreis; die Hochzeit hat seit dem
   * 03.08. eine Stufenleiter; Urlaub und Chat haengen noch am Abo. Ein einheitliches
   * "ab 1,49" waere auf zwei Kacheln schlicht gelogen — und der Unterschied zeigt auf einen
   * Blick, welche Themen noch umziehen muessen (siehe PLAN-GESCHENKE-FLOW.md).
   *
   * Die Zahlen kommen aus lib/pricing, nie von Hand (Hausregel seit 29.07.2026).
   */
  abPreis?: string };

// Startseite = mehrsprachig nach BROWSERSPRACHE (kein Umschalter nötig, kein Deutsch für
// alle). Gleiche Sprachliste wie das Wetter-Thema, damit beides zusammenpasst.
type PageCopy = {
  kicker: string; h1a: string; h1b: string;
  models: string; wardrobe: string;
  whatH: string; uniqueH: string; uniqueP: string; canH: string; costH: string; costP: string; noteH: string; noteP: string;
  items: [string, string][];
};
const C: Record<string, PageCopy> = {
  ro: { kicker: "LuxuryBandit", h1a: "Funnels care vând.", h1b: "De la reclama Meta până la cumpărare.",
    models: "Vezi modelele noastre și vorbește cu ele →", wardrobe: "Garderobă",
    whatH: "Ce este LuxuryBandit?",
    uniqueH: "De ce noi", uniqueP: "Pentru că aici nimic nu e demo: fiecare funnel de pe această pagină rulează pe bune — cu casă de plată reală, clienți reali și modelele video AI care păstrează chipul și mișcarea. Alții îți vând un funnel cu slide-uri. Noi ți-l arătăm mergând.",
    canH: "Funnels-urile noastre — live", costH: "Cât costă?", costP: "Fiecare videoclip — un sărut, un videoclip de ziua cuiva, aplicația ta video, mesajul către eul tău din viitor — se cumpără o singură dată, din creditul tău, la prețul afișat pe butonul de cumpărare. Creditul nu expiră niciodată. Singurul abonament este planificatorul digital de nuntă: cumperi o dată, apoi se reînnoiește lunar cu {monat}, poți renunța oricând.",
    noteH: "Bine de știut", noteP: "Fiecare videoclip se face din fotografii pe care le încarci tu. Confirmi înainte, explicit, că persoanele din imagini sunt de acord și că ai dreptul să folosești fotografiile — răspunderea este a ta. Fiecare rezultat rămâne privat până îl distribui chiar tu.",
    items: [["Trimite un sărut persoanei pe care o iubești","poza ta și a ei — un videoclip cu voi doi, doar pentru ea."],["Invitația voastră de nuntă","voi doi în videoclip, plus o pagină de invitație cu confirmări, noutăți și grup."],["Videoclip de zi de naștere","scrii un nume — ea îl spune cu voce tare."],["Aplicația ta video","încarci poza și CV-ul — pagina ta de profil cu video, gata pentru angajatori."],["Future Self Program","filmul tău din viitor plus un program de 30 de zile — o promisiune față de tine."]] },
  de: { kicker: "LuxuryBandit", h1a: "Funnels, die verkaufen.", h1b: "Von der Meta-Anzeige bis zum Kauf.",
    models: "Unsere Models ansehen & mit ihnen chatten →", wardrobe: "Garderobe",
    whatH: "Was ist LuxuryBandit?",
    uniqueH: "Warum wir", uniqueP: "Weil hier nichts Demo ist: Jeder Funnel auf dieser Seite läuft echt — mit echter Kasse, echten Kunden und den KI-Video-Modellen, die Gesicht und Bewegung halten. Wer dir sonst einen Funnel verkauft, zeigt dir Folien. Wir zeigen dir laufende.",
    canH: "Unsere Funnels — live", costH: "Was kostet es?", costP: "Jedes Video — Kuss, Geburtstag, deine Video-Bewerbung, die Botschaft an dein zukünftiges Ich — kaufst du einmal, aus deinem Guthaben, zum Preis, der auf dem Kaufknopf steht. Guthaben verfällt nie. Das einzige Abo ist der Digitale Hochzeitsplaner: einmal gekauft, verlängert er sich danach monatlich für {monat}, monatlich kündbar.",
    noteH: "Gut zu wissen", noteP: "Jedes Video entsteht aus Fotos, die du selbst hochlädst. Du bestätigst vorher ausdrücklich, dass die abgebildeten Personen einverstanden sind und du die Fotos verwenden darfst — die Verantwortung dafür liegt bei dir. Jedes Ergebnis bleibt privat, bis du es selbst teilst.",
    items: [["Schick einen Kuss an den Menschen, den du liebst","dein Foto und ihres — ein Video mit euch beiden, nur für sie."],["Eure Hochzeitseinladung","ihr beide im Video, dazu eine eigene Einladungsseite mit Zusagen, Neuigkeiten und Gästegruppe."],["Geburtstagsvideo","Namen eintippen — sie gratuliert laut, mit Namen."],["Deine Video-Bewerbung","Foto und Lebenslauf hochladen — deine eigene Profilseite mit Video, bereit für Arbeitgeber."],["Future Self Program","dein Film aus der Zukunft plus 30 Tage Programm — ein Versprechen an dich selbst."]] },
  en: { kicker: "LuxuryBandit", h1a: "Funnels that sell.", h1b: "From the Meta ad to the purchase.",
    models: "See our models & chat with them →", wardrobe: "Wardrobe",
    whatH: "What is LuxuryBandit?",
    uniqueH: "Why us", uniqueP: "Because nothing here is a demo: every funnel on this page runs for real — with a real checkout, real customers and the AI video models that hold the face and the motion. Others selling you a funnel show you slides. We show you running ones.",
    canH: "Our funnels — live", costH: "How much does it cost?", costP: "Every video — a kiss, a birthday video, your video application, the message to your future self — is a one-time purchase, paid from your account balance at the price shown on the buy button. Account balance never expires. The only subscription is the Digital Wedding Planner: buy it once, then it renews monthly at {monat}, cancel any time.",
    noteH: "Good to know", noteP: "Every video is made from photos you upload yourself. You confirm up front that the people shown agree and that you may use the photos — that responsibility is yours. Every result stays private until you share it yourself.",
    items: [["Send a kiss to the one you love","your photo and theirs — one video with the two of you, for them alone."],["Your wedding invitation","the two of you in the video, plus your own invitation page with RSVPs, news and a guest group."],["Birthday video","type a name — she says it out loud."],["Your video application","upload your photo and resume — your own profile page with video, ready for employers."],["Future Self Program","your film from the future plus a 30-day program — a promise to yourself."]] },
  es: { kicker: "LuxuryBandit", h1a: "Funnels que venden.", h1b: "Del anuncio de Meta a la compra.",
    models: "Ver nuestras modelos y chatear con ellas →", wardrobe: "Armario",
    whatH: "¿Qué es LuxuryBandit?",
    uniqueH: "Por qué nosotros", uniqueP: "Porque aquí nada es una demo: cada funnel de esta página funciona de verdad — con caja real, clientes reales y los modelos de vídeo de IA que mantienen la cara y el movimiento. Otros te venden un funnel con diapositivas. Nosotros te lo enseñamos funcionando.",
    canH: "Nuestros funnels — en vivo", costH: "¿Cuánto cuesta?", costP: "Cada vídeo — un beso, un cumpleaños, tu candidatura en vídeo, el mensaje para tu yo futuro — se compra una sola vez, con tu saldo, al precio que aparece en el botón de compra. El saldo nunca caduca. La única suscripción es el planificador digital de boda: se compra una vez y luego se renueva cada mes por {monat}, cancelable cuando quieras.",
    noteH: "Bueno saberlo", noteP: "Cada vídeo se crea con fotos que subes tú mismo. Confirmas antes, de forma expresa, que las personas que aparecen están de acuerdo y que puedes usar las fotos — la responsabilidad es tuya. Cada resultado es privado hasta que tú lo compartas.",
    items: [["Envía un beso a quien tú quieres","tu foto y la suya — un vídeo con los dos, solo para esa persona."],["Vuestra invitación de boda","los dos en el vídeo, más vuestra página de invitación con confirmaciones, novedades y grupo."],["Vídeo de cumpleaños","escribe un nombre — ella lo dice en voz alta."],["Tu candidatura en vídeo","sube tu foto y tu currículum — tu propia página de perfil con vídeo, lista para empresas."],["Future Self Program","tu película del futuro más un programa de 30 días — una promesa contigo mismo."]] },
  fr: { kicker: "LuxuryBandit", h1a: "Des funnels qui vendent.", h1b: "De la pub Meta à l'achat.",
    models: "Voir nos modèles et discuter avec elles →", wardrobe: "Dressing",
    whatH: "Qu'est-ce que LuxuryBandit ?",
    uniqueH: "Pourquoi nous", uniqueP: "Parce qu'ici rien n'est une démo : chaque funnel de cette page tourne pour de vrai — avec une vraie caisse, de vrais clients et les modèles vidéo IA qui gardent le visage et le mouvement. Les autres te vendent un funnel avec des slides. Nous, on te le montre en marche.",
    canH: "Nos funnels — en direct", costH: "Combien ça coûte ?", costP: "Chaque vidéo — un baiser, un anniversaire, ta candidature vidéo, le message à ton futur toi — s'achète une seule fois, sur ton crédit, au prix affiché sur le bouton d'achat. Le crédit n'expire jamais. Le seul abonnement est le planificateur de mariage numérique : acheté une fois, puis renouvelé chaque mois à {monat}, résiliable à tout moment.",
    noteH: "Bon à savoir", noteP: "Chaque vidéo est créée à partir de photos que tu ajoutes toi-même. Tu confirmes au préalable, expressément, que les personnes visibles sont d'accord et que tu as le droit d'utiliser ces photos — la responsabilité t'appartient. Chaque résultat reste privé jusqu'à ce que tu le partages toi-même.",
    items: [["Envoie un baiser à la personne que tu aimes","ta photo et la sienne — une vidéo avec vous deux, rien que pour elle."],["Votre invitation de mariage","vous deux dans la vidéo, plus votre page d'invitation avec réponses, nouvelles et groupe."],["Vidéo d'anniversaire","tape un prénom — elle le dit à voix haute."],["Ta candidature vidéo","ajoute ta photo et ton CV — ta propre page de profil avec vidéo, prête pour les employeurs."],["Future Self Program","ton film venu du futur plus un programme de 30 jours — une promesse à toi-même."]] },
  pt: { kicker: "LuxuryBandit", h1a: "Funnels que vendem.", h1b: "Do anúncio Meta à compra.",
    models: "Ver as nossas modelos e conversar com elas →", wardrobe: "Guarda-roupa",
    whatH: "O que é o LuxuryBandit?",
    uniqueH: "Porquê nós", uniqueP: "Porque aqui nada é demonstração: cada funnel desta página funciona a sério — com caixa real, clientes reais e os modelos de vídeo de IA que mantêm o rosto e o movimento. Outros vendem-te um funnel com slides. Nós mostramos-to a funcionar.",
    canH: "Os nossos funnels — ao vivo", costH: "Quanto custa?", costP: "Cada vídeo — um beijo, um aniversário, a tua candidatura em vídeo, a mensagem para o teu eu futuro — compra-se uma única vez, do teu saldo, ao preço indicado no botão de compra. O saldo nunca expira. A única subscrição é o planeador digital de casamento: compras uma vez e depois renova-se mensalmente por {monat}, cancelável quando quiseres.",
    noteH: "Bom saber", noteP: "Cada vídeo é criado a partir de fotos que tu próprio carregas. Confirmas antes, expressamente, que as pessoas mostradas concordam e que podes usar as fotos — a responsabilidade é tua. Cada resultado fica privado até seres tu a partilhá-lo.",
    items: [["Envia um beijo a quem tu amas","a tua foto e a dela — um vídeo com os dois, só para essa pessoa."],["O vosso convite de casamento","os dois no vídeo, mais a vossa página de convite com confirmações, novidades e grupo."],["Vídeo de aniversário","escreves um nome — ela di-lo em voz alta."],["A tua candidatura em vídeo","carrega a tua foto e o teu CV — a tua própria página de perfil com vídeo, pronta para empregadores."],["Future Self Program","o teu filme do futuro mais um programa de 30 dias — uma promessa a ti mesmo."]] },
  pl: { kicker: "LuxuryBandit", h1a: "Wybierz prezent.", h1b: "Wyślij go dziś.",
    models: "Zobacz nasze modelki i porozmawiaj z nimi →", wardrobe: "Garderoba",
    whatH: "Czym jest LuxuryBandit?",
    uniqueH: "Jedyne takie na świecie", uniqueP: "Nie ma nic podobnego: w LuxuryBandit ta sama influencerka AI pisze do Ciebie z rana, nosi wybrane przez Ciebie stroje, rozmawia z Tobą i występuje w Twoich filmach. Świadomie korzystamy z najdroższych modeli wideo AI na rynku — tanie tracą twarz i ruch. Marketplace influencerek AI, a nie aplikacja z filtrami.",
    canH: "Co możesz robić?", costH: "Ile to kosztuje?", costP: "Każdy prezent — pocałunek, urodziny, taniec, zaproszenie na wakacje, wiadomość wideo do samego siebie — kupujesz jednorazowo, z Twojego salda, w cenie widocznej na przycisku zakupu. Saldo nigdy nie wygasa. Jedyny abonament to cyfrowy planer ślubu: kupujesz raz, potem odnawia się co miesiąc za {monat}, możesz zrezygnować w każdej chwili.",
    noteH: "Warto wiedzieć", noteP: "LuxuryBandit jest tylko dla dorosłych — przed czatem potwierdzasz, że masz 18 lat lub więcej. Persona AI flirtuje i pyta o Twój dzień, ale nigdy nie twierdzi, że ma uczucia, ani nie udaje prawdziwej osoby. W przypadku filmów z własnych zdjęć pytamy Cię wprost i potwierdzasz, że masz prawo użyć tego zdjęcia — odpowiedzialność jest Twoja, a wynik pozostaje prywatny.",
    items: [["Przymierzanie stylizacji","wybierz look i modelkę — zobaczysz ją w nim na wideo, z każdej strony."],["Bielizna i luksusowe stylizacje","to samo, w jej najbardziej eleganckich i intymnych stylizacjach."],["Pocałuj modelkę","wyślij swoje zdjęcie i zobaczcie się oboje w pocałunku."],["Twój idol z Tobą","wybierz swojego idola i zobaczcie się razem na imprezie."],["Filmy urodzinowe","wpisz imię, a ona złoży życzenia na głos, po imieniu."]] },
  it: { kicker: "LuxuryBandit", h1a: "Funnel che vendono.", h1b: "Dall'annuncio Meta all'acquisto.",
    models: "Guarda le nostre modelle e chatta con loro →", wardrobe: "Guardaroba",
    whatH: "Che cos'è LuxuryBandit?",
    uniqueH: "Perché noi", uniqueP: "Perché qui niente è una demo: ogni funnel di questa pagina gira davvero — con una cassa vera, clienti veri e i modelli video IA che tengono il volto e il movimento. Gli altri ti vendono un funnel con le slide. Noi te lo mostriamo in funzione.",
    canH: "I nostri funnel — dal vivo", costH: "Quanto costa?", costP: "Ogni video — un bacio, un compleanno, la tua candidatura video, il messaggio al tuo io futuro — si compra una sola volta, dal tuo credito, al prezzo indicato sul pulsante d'acquisto. Il credito non scade mai. L'unico abbonamento è il pianificatore digitale di nozze: si compra una volta, poi si rinnova ogni mese a {monat}, disdicibile quando vuoi.",
    noteH: "Da sapere", noteP: "Ogni video nasce da foto che carichi tu stesso. Confermi prima, espressamente, che le persone ritratte sono d'accordo e che puoi usare quelle foto — la responsabilità è tua. Ogni risultato resta privato finché non lo condividi tu.",
    items: [["Manda un bacio a chi ami","la tua foto e la sua — un video con voi due, solo per lei."],["Il vostro invito di nozze","voi due nel video, più la vostra pagina d'invito con conferme, novità e gruppo."],["Video di compleanno","scrivi un nome — lei lo dice ad alta voce."],["La tua candidatura video","carica la tua foto e il tuo CV — la tua pagina di profilo con video, pronta per i datori di lavoro."],["Future Self Program","il tuo film dal futuro più un programma di 30 giorni — una promessa a te stesso."]] },
};

/**
 * ANPROBE = EIGENES FOTO + EIGENES KLEIDUNGSSTUECK (Owner-Aenderungsauftrag 27.08.2026:
 * „hier haben wir wieder Lingerie. Eigentlich wollten wir, dass Menschen Bilder von sich und
 * von Klamotten hochladen. Dann generieren — das, was auch ChatGPT kann, aber mit Video.").
 *
 * Die Kacheln zeigten bis hierher auf `/try/look-…` — die alte Model-Galerie: eine fertige
 * Auswahl fremder Models in Waesche-Looks, darunter ein Monats-Abo. Das ist ein anderes
 * Produkt als das, was der Trichter heute tut, und es widerspricht der Kachel darueber
 * („deine Produkte auf einem Modell"). Wer auf ein Kleid tippt, landete bei Lingerie.
 *
 * Jetzt geht es direkt in den Trichter, in dem man sein Foto und das Kleidungsstueck
 * hochlaedt. Die Galerie bleibt unter ihrer Adresse erreichbar — sie wird nur nicht mehr
 * beworben (dieselbe Haltung wie bei den ausgeblendeten Themen weiter unten).
 */
const TRYON = "/themes/tryon/start";

export default async function ThemesCatalog({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  // AKTIONSCODE aus der Anzeige: Die Übersicht ist das Ziel der Werbung — er soll erst
  // sehen, was es gibt, und sich ein Thema aussuchen. Der Code muss deshalb von hier in
  // JEDES Thema mitwandern, sonst ist er beim Bezahlen verloren.
  const sp = (await searchParams) ?? {};
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);
  const src = String(sp.src ?? "").trim().slice(0, 40);
  const withCode = (href: string) => {
    if (!code && !src) return href;
    const sep = href.includes("?") ? "&" : "?";
    const q = [code ? `code=${encodeURIComponent(code)}` : "", src ? `src=${encodeURIComponent(src)}` : ""].filter(Boolean).join("&");
    return `${href}${sep}${q}`;
  };

  const L = await resolveLang();   // gewählte Sprache (Cookie) > Browsersprache
  const A = aboutText(L);          // die Beschreibung des Portals — Original in „Über uns"
  const c = C[L] ?? C.en;
  /**
   * ALLES AUF EINMAL HOLEN, NICHT NACHEINANDER (07.08.2026, gemessen: 4,0 s bis zum ersten
   * Byte — dreimal hintereinander, immer derselbe Wert).
   *
   * Hier standen neun Blöcke UNTEREINANDER, jeder mit eigenem `await` auf Supabase. Und
   * `readCardStudioSlides(BELLA_ID)` wurde DREIMAL über das Netz geholt — für das Wetter, für
   * die Try-On-Karte und für den Urlaub, jedes Mal dieselbe Antwort. Zusammen rund zwanzig
   * Hin- und Rückwege, einer nach dem anderen. Das waren die vier Sekunden; das Video hat
   * damit nichts zu tun, es lädt erst, wenn dieses HTML längst beim Besucher ist.
   *
   * WARUM DAS TEUER WAR: Diese Seite IST die Startseite (app/page.tsx liefert sie aus) und
   * damit das Ziel der Werbung. Vier Sekunden weißer Bildschirm zahlt man bei Meta zweimal —
   * einmal für den Klick und einmal für den, der vorher abbricht. Google misst dieselbe Zeit
   * und crawlt eine langsame neue Domain seltener (Search Console, 07.08.2026: 198 Adressen
   * „Gefunden – zurzeit nicht indexiert", also nicht einmal abgerufen).
   *
   * WAS SICH ÄNDERT: nichts an den Werten, nur an der Reihenfolge. Bellas Folien werden
   * EINMAL geholt und von allen dreien geteilt, und die Blöcke laufen nebeneinander statt
   * hintereinander. Jeder behält sein eigenes `try`, damit ein Ausfall weiterhin nur seine
   * eigene Kachel leer lässt und nie die ganze Seite.
   *
   * WER HIER ETWAS ANFÜGT: als weiteres Versprechen ins `Promise.all` unten, NICHT als
   * `await` davor — ein einziges vorgezogenes `await` legt die Ersparnis wieder still.
   */
  const bellaSlidesP = readCardStudioSlides(BELLA_ID).catch(() => []);

  // Cover fürs aktive „Wetter"-Thema: das WERBEVIDEO (ad-Slide) — genau das, was der
  // Besucher auf /themes/wetter/bella sieht. Fallback: Bellas Foto.
  const wetterP = (async () => {
    let cover = "", video = "", poster = "";
    try {
      const { card } = await buildBellaCard({ surface: "themes" });
      cover = card?.photo || "";
      // `.filter()` gibt eine neue Liste — das `.sort()` darf die geteilten Folien nicht umsortieren.
      const slides = (await bellaSlidesP).filter(isPublicBellaPost).sort(sortBellaPosts);
      const adVid = slides.find(s => s.kind === "video" && (s as { ad?: boolean }).ad === true) ?? slides.find(s => s.kind === "video");
      if (adVid) {
        [video, poster] = await Promise.all([
          getSignedUrl(adVid.path).catch(() => ""),
          adVid.posterPath ? getSignedUrl(adVid.posterPath).catch(() => "") : Promise.resolve(""),
        ]);
      }
    } catch { /**/ }
    return { cover, video, poster };
  })();

  // Platzhalter-Cover für die „coming soon"-Themen = echte Model-Fotos aus dem Katalog
  // (signierte URLs, keine intimen Bilder). Später bekommt jedes Thema sein eigenes Ad-Video.
  /**
   * DIE GESTALT KOMMT VOM SERVER, NICHT AUS DEM BROWSER (Owner 06.08.2026: „online ist es
   * nicht auf live aktiv" · „ja mach es"). Sie wird HIER gelesen und als Eigenschaft nach
   * unten gereicht: Damit steht die richtige Gestalt schon im ersten ausgelieferten Bild —
   * ein Nachladen im Browser würde die Kacheln erst in der einen und dann in der anderen
   * Gestalt zeigen, und dieses Zucken sieht jeder Besucher.
   */
  const stateP = (async () => {
    let placeholders: string[] = [];
    let gestalt: "reihe" | "voll" | undefined;
    try {
      const state = await readTryThisLookState();
      placeholders = ((state?.curators ?? []) as Array<{ id?: string; photoUrl?: string; hidden?: boolean; status?: string }>)
        .filter(c => c.id !== BELLA_ID && !!c.photoUrl && !c.hidden && c.status !== "removed")
        .map(c => c.photoUrl as string);
      if (state?.themenGestalt === "reihe" || state?.themenGestalt === "voll") gestalt = state.themenGestalt;
    } catch { /**/ }
    return { placeholders, gestalt };
  })();

  // Kiss-Teaser (vom Admin im Kiss-Medien-Tool hochgeladen) als Cover der Kiss-Karte.
  // Er darf BILD ODER VIDEO sein — ein Video muss ins `video`-Feld, sonst landet eine
  // .mp4 in einem <img> und die Karte zeigt ein kaputtes Bild.
  // Try-On-Karte: dieselbe Überblendung wie im Wetter — Bella im weißen Kleid ↔ in Lingerie.
  const WHITE_DRESS = "try-this-look/uploads/1784915142061-c0ea5633-a652-40bb-8476-bebf69c64658.jpg";
  const tryonP = (async () => {
    let dressed = "", lingerie = "";
    try {
      const slides = (await bellaSlidesP).filter(isPublicBellaPost);
      const pickPath = (x: { kind?: string; path?: string; posterPath?: string }) => (x.kind === "video" ? x.posterPath : x.path) || "";
      const normal = slides.find(x => x.garmentCat === "normal" && pickPath(x));
      const ling = slides.find(x => x.garmentCat === "lingerie" && pickPath(x));
      [dressed, lingerie] = await Promise.all([
        getSignedUrl((normal && pickPath(normal)) || WHITE_DRESS).catch(() => ""),
        ling ? getSignedUrl(pickPath(ling)).catch(() => "") : Promise.resolve(""),
      ]);
    } catch { /**/ }
    return { dressed, lingerie };
  })();

  // Holiday-Karte: eines der Urlaubs-Videos (Peter & Bella) — die liegen auf der Fläche
  // „lp-journey" und haben kein Poster, also spielt die Karte das Video direkt ab.
  const urlaubP = (async () => {
    try {
      const all = await bellaSlidesP;
      const j = all.find(x => x.kind === "video" && !x.customer && !x.hidden && !x.private && !x.pendingApproval
        && (x.pages ?? []).includes("lp-journey") && x.path);
      if (j) return (await getSignedUrl(j.path).catch(() => "")) || "";
    } catch { /**/ }
    return "";
  })();

  // Vom Owner gelieferte Theme-Videos, fest im Storage abgelegt. Der GEBURTSTAG steht nicht
  // mehr hier: Sein Kachel-Video ist per Dauerregel (Owner 07.08.2026: „das video aus der
  // Landingpage Card ist gleich auch das video für die Topic auf der Topicseite") dasselbe
  // wie das Beispielvideo der Landingpage — GEBURTSTAG_VIDEO aus lib/geburtstag, ein Pfad
  // statt zwei Quellen, die auseinanderlaufen.
  const ownVideosP = Promise.all([
    // „Surprise him": bewusst der VOLLE Schwenk von unten nach oben (Owner-Entscheidung) —
    // genau dieser Aufbau ist der Reiz der Karte, nicht der zugeschnittene Ausschnitt.
    getSignedUrl("try-this-look/videos/surprise-example.mp4").catch(() => ""),
    getSignedUrl("try-this-look/videos/luxury-looks.mp4").catch(() => ""),
    getSignedUrl("try-this-look/videos/your-idol-with-you.mp4").catch(() => ""),
    getSignedUrl("try-this-look/videos/lingerie-looks.mp4").catch(() => ""),
  ]).catch(() => ["", "", "", ""]);

  /**
   * DIE HOCHZEITSKACHEL ZEIGT EINE HOCHZEIT (Owner 31.07.2026: „das Topicvideo hast du nicht
   * ersetzt").
   *
   * Hier stand `ph(9)` — ein Allerwelts-Platzhalter aus dem Bilderstapel, eine Frau im
   * schwarzen Kleid auf einer Dachterrasse. Auf einer Kachel, die „Hochzeitseinladung" heisst,
   * ist das kein Schoenheitsfehler: Wer im Katalog scrollt, entscheidet nach dem BILD, ob er
   * tippt. Ein falsches Motiv kostet uns den Klick, bevor ein Wort gelesen wird.
   *
   * Das Video kommt aus dem Medien-Werkzeug des Themas: das ERSTE Beispiel. Damit zeigt die
   * Kachel immer, was auf der Seite auch wirklich laeuft — wechselt das Beispiel, wechselt die
   * Kachel mit, ohne dass hier jemand etwas nachtraegt.
   */
  const weddingP = (async () => {
    try {
      const wc = await readThemeConfig("wedding");
      const erstes = (wc.examplePaths ?? [])[0];
      if (erstes) return (await getSignedUrl(erstes).catch(() => "")) || "";
    } catch { /**/ }
    return "";
  })();

  const kissP = (async () => {
    let cover = "", video = "";
    try {
      const kc = await readKissConfig();
      if (kc.teaserPath) {
        const url = await getSignedUrl(kc.teaserPath).catch(() => "");
        if (/\.(mp4|webm|mov)$/i.test(kc.teaserPath)) video = url; else cover = url;
      }
    } catch { /**/ }
    return { cover, video };
  })();

  // VERSPRECHEN: dasselbe Muster wie Kiss — Cover und Beispielvideo kommen aus dem
  // Medien-Werkzeug unter /themes/versprechen?admin=1 (Thema-Schlüssel bleibt "plan",
  // damit die bereits hochgeladenen Dateien nicht verwaisen).
  const versprechenP = (async () => {
    let cover = "", video = "";
    try {
      const pc = await readThemeConfig("plan");
      if (pc.teaserPath) {
        const url = await getSignedUrl(pc.teaserPath).catch(() => "");
        if (/\.(mp4|webm|mov)$/i.test(pc.teaserPath)) video = url; else cover = url;
      }
    } catch { /**/ }
    return { cover, video };
  })();

  // BELLA-THEMA: dasselbe Muster wie Kiss — das Cover kommt aus dem Medien-Werkzeug
  // (/themes/bella?admin=1 → „1 · Cover"). Beim Anlegen der Karte am 29.07.2026 hatte ich
  // das vergessen: sie zeigte stur Bellas Profilfoto, obwohl im Panel „erscheint im
  // Themes-Katalog" steht. Ist kein Cover gesetzt, gilt das ERSTE Video der Galerie —
  // damit die Karte auch dann das zeigt, was oben auf der Landingpage läuft.
  const bellaP = (async () => {
    let cover = "", video = "";
    try {
      const bc = await readThemeConfig("bella");
      const p = bc.teaserPath || (bc.examplePaths ?? [])[0] || "";
      if (p) {
        const url = await getSignedUrl(p).catch(() => "");
        if (url) { if (/\.(mp4|webm|mov)$/i.test(p)) video = url; else cover = url; }
      }
    } catch { /**/ }
    return { cover, video };
  })();

  // DIE EINE Wartestelle für alle neun Blöcke — ab hier ist alles da.
  const [wetter, st, tryon, urlaubVideo, ownVideos, weddingVideo, kiss, versprechen, bellaThema] = await Promise.all([
    wetterP, stateP, tryonP, urlaubP, ownVideosP, weddingP, kissP, versprechenP, bellaP,
  ]);

  const { cover: wetterCover } = wetter;
  const { placeholders, gestalt } = st;
  const ph = (i: number) => placeholders[i % Math.max(1, placeholders.length)] || undefined;
  const { dressed: tryonDressed, lingerie: tryonLingerie } = tryon;
  const [surpriseVideo, luxuryVideo, idolVideo, lingerieVideo] = ownVideos;
  const { cover: kissCover, video: kissVideo } = kiss;
  const { cover: versprechenCover, video: versprechenVideo } = versprechen;
  const { cover: bellaCover, video: bellaVideo } = bellaThema;

  /**
   * DIE EINSTIEGSPREISE — aus lib/pricing, nie getippt.
   *
   * `ab` steht davor, weil es der GUENSTIGSTE Weg ist, nicht der einzige: Beim Kuss kostet ein
   * weiteres Video wieder dasselbe, bei der Hochzeit gibt es laengere Stufen, und beim Chat ist
   * das Reden gratis, ein neuer Look aber nicht.
   */
  /**
   * DIE DREI WOERTER UM DIE ZAHL HERUM sind ebenfalls Sprache — und genau das ging beim ersten
   * Versuch schief: Auf der englischen Seite stand „ab €24.50/Monat" und „gratis". Eine Zahl
   * aus der Preistabelle nuetzt nichts, wenn das Wort davor aus der falschen Sprache kommt.
   */
  const P = ({
    de: { ab: "ab", pm: "/Monat", frei: "gratis", look: "Look" },
    en: { ab: "from", pm: "/month", frei: "free", look: "Look" },
    ro: { ab: "de la", pm: "/lună", frei: "gratuit", look: "Ținută" },
    es: { ab: "desde", pm: "/mes", frei: "gratis", look: "Look" },
    fr: { ab: "à partir de", pm: "/mois", frei: "gratuit", look: "Look" },
    pt: { ab: "a partir de", pm: "/mês", frei: "grátis", look: "Look" },
    it: { ab: "da", pm: "/mese", frei: "gratis", look: "Look" },
  } as Record<string, { ab: string; pm: string; frei: string; look: string }>)[L] ?? { ab: "from", pm: "/month", frei: "free", look: "Look" };

  /**
   * DIE PREISE KOMMEN AUS EINER QUELLE (Owner 04.08.2026: „auf jeder Landingpage muss auch
   * der Preis stehen wie auf der Topicseite. Ich weiss es selber nicht was es kostet").
   *
   * `themenPreisZeile` liest den Betrag, den die KASSE des Themas wirklich nimmt — dieselbe
   * Funktion benutzt jede Landingpage über `<ThemenPreis>`. Vorher baute jede Stelle ihre
   * eigene Zeile, und genau daran ist es auseinandergelaufen (siehe unten bei der Hochzeit).
   */
  const AB_EINZEL = themenPreisZeile("kiss", L);
  /* Der Gutschein ist ein Geschenk wie die anderen — dieselbe Zahl aus derselben Tabelle. */
  const AB_GUTSCHEIN = themenPreisZeile("gutschein", L);
  /* Der Geburtstag hat seit 07.08.2026 seinen eigenen Startpreis (GEBURTSTAG_CENTS) — die
     Kachel muss dieselbe Zahl tragen wie Landingpage-Schild und Kasse. */
  const AB_GEBURTSTAG = themenPreisZeile("birthday", L);
  /* Der Kaufknopf der grossen Themen-Karte (Owner 07.08.2026: „und hier muss CTA rein");
     Wortlaut je Sprache, Imperativ an den SCHENKENDEN (Memory `titel-spricht-den-kaeufer-an`). */
  const CTA_ZEILE: Record<string, string> = {
    de: "Jetzt verschenken", en: "Gift it now", ro: "Dăruiește acum", es: "Regálalo ahora",
    fr: "Offre-le maintenant", pt: "Presenteie agora", it: "Regalalo ora",
  };
  /**
   * HIER STAND „ab 24 €" — UND DAS WAR FALSCH (04.08.2026 nachgeprüft).
   *
   * Die Zahl kam aus `HOCHZEIT_STUFEN` (24/49/99 € für 3/6/12 Monate). Diese Tabelle wird von
   * KEINER Kasse gelesen — sie stand nur auf dieser Kachel. Abgebucht hat
   * `EinladungBauen` → `/api/kiss-video-checkout` seit jeher `ONCE_CENTS`, also 1,49 €.
   * Die Kachel warb also mit dem Sechzehnfachen dessen, was der Kunde wirklich zahlt.
   *
   * Die Kachel sagt jetzt die Wahrheit. Soll die Hochzeit wirklich 24 € kosten, ist das eine
   * Änderung in der KASSE (und in Stripe), nicht in dieser Zeile.
   */
  const AB_HOCHZEIT = themenPreisZeile("wedding", L);
  /* Urlaub und Chat haengen noch am Abo — hier steht, was sie WIRKLICH kosten, nicht was sie
     nach dem Umzug kosten werden. Ein zu frueher Geschenk-Preis waere eine Zusage, die der
     Trichter dahinter nicht einloest. */
  const AB_ABO = themenPreisZeile("tryon", L);
  /* Hier stand „gratis · Look 2,99" — beides falsch seit dem 03.08.2026: Das Anziehen ist raus,
     und der Chat ist nur die ersten Nachrichten frei. Jetzt der ehrliche Einstieg aus CHAT_STUFEN. */
  const AB_CHAT = themenPreisZeile("chat", L);
  /* Die Video-Bewerbung — Preis aus der Tabelle, nie getippt (Memory
     `prices-only-from-pricing-table`). */
  const AB_LEBENSLAUF = themenPreisZeile("lebenslauf", L);
  /* Das System kostet 59 € — und die Zahl gehört auf die Kachel wie bei jedem anderen Thema.
     „Ein Geschenk, dessen Preis man raten muss, verkauft sich nicht" (Owner 03.08.2026); bei
     59 € gilt das doppelt: Wer den Preis erst nach drei Bildschirmen erfährt, fühlt sich
     hereingelegt — und genau dieses Gefühl kann sich ein Produkt nicht leisten, das mit
     „keine Lügen" wirbt. */
  const AB_VERSPRECHEN = themenPreisZeile("versprechen", L);

  const THEMES: Theme[] = [
    /**
     * PLATZ EINS: DIE VIDEOBOTSCHAFT AN DICH SELBST (Owner 11.08.2026: „mach das als
     * erstes" — unmittelbar nachdem er das Thema benannt hatte).
     *
     * Sie stand bis heute weit unten, an der Stelle des gelöschten „LuxuryBandit System".
     * Was oben steht, entscheidet, was angefasst wird: Der Geburtstag hat diesen Platz am
     * 09.08. aus demselben Grund bekommen und rutscht jetzt auf zwei.
     *
     * ES IST DAS EINZIGE THEMA OHNE ZWEITEN MENSCHEN. Alle anderen setzen voraus, dass da
     * jemand ist, dem man etwas schickt — eine Person, ein Foto von ihr, ein Anlass. Hier
     * genügt er sich selbst. Damit ist es das Thema mit der breitesten Tür: Wer allein auf
     * der Seite landet, findet in der ersten Zeile etwas, das er ohne Verabredung kaufen
     * kann.
     *
     * DER NAME DES THEMAS IST „VIDEOBOTSCHAFT AN DICH SELBST" (Owner 11.08.2026:
     * „Videobotschaft an dich selbst. So nennen wir die Topic Schick ein Verspechen").
     *
     * „Send a promise" sagte, was man TUT, nicht was man BEKOMMT — und „Versprechen" ist
     * ausserdem das Wort, mit dem im ganzen Haus Werbeaussagen bezeichnet werden. Der neue
     * Name nennt das Produkt beim Gegenstand: ein Video, an einen Empfänger — sich selbst.
     *
     * DIE ADRESSE BLEIBT `/themes/versprechen`: Sie steht in Anzeigen, im Sitemap und in
     * geteilten Links. Ein Name ist Text, eine URL ist eine Zusage.
     *
     * Englisch, weil jede Kachel hier englisch ist und `trObject` daraus die sieben Sprachen
     * macht — auf Deutsch wird daraus wieder der Satz des Owners.
     */
    /**
     * AUS DEM „LUXURYBANDIT SYSTEM" WURDE DIESES THEMA (Owner 10.08.2026: „Da ändern wir das
     * konzept brutal. Wir verkaufen keine Systeme. Wir generieren genauso wie die anderen.
     * Sende ein Verprechen an dich und an deine Freunde.") — kein Bericht über eine
     * Geschäftsidee mehr, sondern ein Video mit seinem Gesicht und seiner Stimme.
     *
     * DIE ZEILE DARF NICHTS ÜBER GELD VERSPRECHEN (Regel vom 04.08.2026, sie überlebt den
     * Produktwechsel): Villa und Wagen stehen im Bild, „werde reich mit X für Y €" darf
     * trotzdem nirgends stehen — das ist die Formulierung auf Stripes Verbotsliste (get rich
     * quick), und daran hängt dasselbe Konto wie Kuss, Guthaben und Einladungen.
     *
     * EIN VIDEO AUS EINER KONSTANTE (Dauerregel 07.08.): Kachel und Karte auf der
     * Landingpage zeigen dasselbe Video mit demselben Standbild; ein eigener Upload im
     * Medien-Werkzeug (`/themes/versprechen?admin=1`) sticht es weiterhin.
     */
    /**
     * KACHEL AUF DAS PROGRAMM UMGETEXTET (Owner 11.08.2026, Folgeänderung zum
     * „Future Self Program"). Die Kachel verkaufte noch das alte Einzelvideo
     * („Video message to yourself" · „Villa & car") zum neuen 49-€-Programmpreis — Titel
     * und Zeilen passten nicht mehr zu dem, was hinter dem Link tatsächlich beginnt: ein
     * 30-Tage-Programm mit Zielen, Ritual und eigenem Bereich, nicht ein einzelnes Video.
     *
     * „Future Self Program" ist der MARKENNAME (wie „LuxuryBandit") und bleibt deshalb in
     * jeder Sprache englisch stehen — er reist NICHT durch `trObject` (siehe die
     * Ausnahme im `flat`-Aufbau weiter unten), damit die KI ihn nicht wörtlich übersetzt.
     * Zeile und Herzchips dagegen laufen normal durch die Übersetzung, wie jede andere
     * Kachel hier.
     */
    /**
     * DAS JOBS-TOPIC (Owner 26.08.2026: „die Topic existiert nicht auf der Startseite,
     * obwohl sie wieder da sein sollte") — der Zugang zur neuen Zielgruppen-Landingpage
     * /topics/german-speakers (einfache Fassung im KONZEPT-JOB-MATCH-TRICHTER.md). Ohne
     * Kreis-Leiste im Kopf (26.08. abgeschafft) ist DIESE Kachel der eine Weg von der
     * Startseite dorthin. Kein Preis auf der Kachel: die Analyse ist gratis, bezahlt
     * werden erst die Bewerbungs-Stücke. GANZ OBEN: das Thema, an dem gerade gebaut und
     * geworben wird.
     */
    /* DAVID auf der Jobs-Kachel (Owner 26.08.2026: „hierfür muss du David nehmen") —
       dasselbe Gesicht wie im Chat des Funnels, nicht das Video-Applications-Poster. */
    /* KEINE WERBUNG MEHR MIT „OHNE CV" (Owner 26.08.2026: „mach keine Werbung ohne CV" ·
       „und ohne Lebenslauf raus" · „ich erwähne 5 Minuten") — der Trichter zählt einen
       fehlenden Lebenslauf inzwischen als mehrere Minuspunkte, und der Weg mit Deutschtest
       und Fragen dauert ehrlich fünf Minuten, nicht zwei. */
    { icon: FileText, title: "Which job fits me?", tagline: "Jobs with German — find out honestly what fits you: what speaks for you and what is still missing. Also for career changers.", href: "/topics/german-speakers", cover: "/Lebenslauf/david.jpg", poster: "/Lebenslauf/david.jpg", chips: "♥ Free German test · 5 minutes · Honest" },
    { icon: Target, title: "Future Self Program", tagline: "See your future. Make the promise. Keep it for 30 days.", href: "/themes/versprechen", cover: versprechenCover || VERSPRECHEN_POSTER, poster: VERSPRECHEN_POSTER, video: versprechenVideo || VERSPRECHEN_VIDEO, chips: "♥ Your future film · 30 days · Your promise", abPreis: AB_VERSPRECHEN },
    /**
     * GEBURTSTAG AUF PLATZ ZWEI (Owner 09.08.2026: „mach die Topic Geburtstag als erstes auf
     * der Homepage" — bis zum 11.08.2026 stand er deshalb ganz oben).
     *
     * Er löste damals den Kuss ab, der seit dem 30.07. auf Platz eins stand, und rückt jetzt
     * selbst eine Zeile nach unten. Er bleibt vorn, weil an ihm die ganze Kette gebaut ist
     * (eigene Aufnahme, eigene Stimme, Traumwelt-Look, geschlossener Kaufweg) — dieselbe
     * Kette, die die Videobotschaft über ihm benutzt.
     */
    /* DIE KACHEL ZEIGT DIE TRAUMWELT (Owner 09.08.2026: „im Slide mach die Dream World als
       erstes" · „auch in der Topic Kachel") — dasselbe Video wie die ERSTE Folie der Karte
       auf der Landingpage. Damit bleibt die Dauerregel gewahrt: ein Video, eine Quelle,
       Kachel und Karte versprechen dasselbe (Memory `landingpage-video-ist-kachel-video`).
       Die Zeile darunter nennt nicht mehr „sie sagt den Namen" — er sagt seine eigene
       Botschaft, mit seinem Gesicht (Textumstellung vom selben Tag). */
    { icon: Cake, title: "Birthdays", tagline: "Your face, your voice — in a world nobody expects.", href: "/themes/birthday", cover: "/Birthday/hbd-schoko.jpg", poster: "/Birthday/hbd-schoko.jpg", video: GEBURTSTAG_VIDEO, chips: "♥ Your message · Your face · Send", abPreis: AB_GEBURTSTAG },
    /* DIE HOCHZEIT STEHT AUF PLATZ ZWEI (Owner 10.08.2026: „Wedding machst du auf der
       homepage auf die zweite zeile"). Sie ist das teuerste Stueck im Haus — 29,99 EUR gegen
       9,99 EUR — und das einzige mit einer laufenden Seite dahinter. Wer die Liste von oben
       liest, soll das Grosse sehen, bevor die Geschenke kommen. */
    /**
      * DIE KACHEL VERKAUFT DEN PLANER, NICHT NUR DAS VIDEO (Owner 10.08.2026: „es steht immer
      * noch Hochzeitseinladungs-Video" — nachdem der Preis auf 29,99 € gegangen war).
      *
      * Für 29,99 € bekommt er das Video UND die laufende Seite: Einladung, Zusagenliste,
      * Menüwahl, Gruppenchat, einen Monat lang. Eine Kachel, die nur „Video" sagt, lässt den
      * Preis zu hoch aussehen — sie verspricht ein Drittel des Produkts. Der Satz ist derselbe,
      * den die Landingpage als Anspruch trägt (`claim` in app/themes/wedding): ein Produkt,
      * eine Formulierung.
      */
    { icon: Heart, title: "Digital wedding planner", tagline: "Your invitation as a video — plus the guest list, menu choices and a group chat. All in one link.", href: "/themes/wedding", cover: HOCHZEIT_VIDEO_POSTER, poster: HOCHZEIT_VIDEO_POSTER, video: HOCHZEIT_VIDEO, chips: "♥ Video · Guest list · Group chat", abPreis: AB_HOCHZEIT },
    // KISS DANACH (Owner 30.07.2026: „kiss musst du als erstes nehmen" — bis 09.08. galt das
    // für Platz eins). Auf dieses Thema liefen die ersten Anzeigen, und der Trichter dort ist
    // vollständig; er bleibt deshalb direkt hinter dem Geburtstag.
    /* POSTER-SWEEP 07.08.2026 (Owner, Kachel für Kachel: „bei Kuss [falsch] · Bei gutschein
       fehlt · Bei Chat fehlt · Bei uralub falsch · Hochzeit auch falsch"): Jede Video-Kachel
       trägt als Poster das ERSTE BILD ihres eigenen Videos (per ffmpeg gezogen) — und Video
       wie Poster liegen als feste Dateien im Repo statt an ablaufenden signierten Links
       (Dauerregel Memory `landingpage-video-ist-kachel-video`: eine Quelle, nie zwei). */
    { icon: Heart, title: "Send a kiss to the one you love", tagline: "Your photo and theirs — one video with the two of you, for them alone.", href: "/themes/kiss", cover: "/Kiss/Rain/rain-kiss.jpg", poster: "/Kiss/Rain/rain-kiss.jpg", video: "/Kiss/Rain/rain-kiss.mp4", chips: "♥ Pick her · Your photo · Kiss", abPreis: AB_EINZEL },
    /**
     * DIE VIDEO-BEWERBUNG IM KATALOG (Owner 24.08.2026: „Dafür nimmst du auch Bewerbung auf
     * die Topicseite" — im selben Zug, in dem Pole Dance, Chat und Holiday herausflogen:
     * „Wir sind jetzt ein seriöses Portal"). Video und Poster sind DIESELBEN Konstanten wie
     * auf der Landingpage-Karte und im Themen-Kreis (Memory
     * `landingpage-video-ist-kachel-video`) — der echte Beispiel-Lauf, kein Platzhalter.
     */
    /* „Video application for top jobs" ist hier RAUS (Owner 27.08.2026: „Videoanwendung aus
       dem Topic — erst mal nicht auf die Topicseite, das ist nicht fertig"). Die Seite
       /themes/lebenslauf existiert weiter und ist direkt erreichbar, sie erzählt aber noch
       die alte Geschichte („füg die Anzeige ein"), die dem neuen Trichter widerspricht.
       Solange das nicht aufgelöst ist, wird sie nicht beworben. Die eine Job-Kachel ist
       „Which job fits me?" darüber. */
    /**
     * GUTSCHEIN VERPACKEN AUF PLATZ ZWEI (Konzept §3b: „Es ist das einzige Geschenkprodukt mit
     * gemessener Suchnachfrage — und es gehört deshalb an Platz zwei").
     *
     * Wörtlich steht dort „direkt hinter das System"; das System sitzt in dieser Liste aber
     * weit unten, und ganz vorn steht seit dem 30.07.2026 der Kuss („kiss musst du als erstes
     * nehmen"). Platz zwei hinter dem Kuss ist deshalb die höchste Stelle, die keine der
     * beiden Anweisungen umstösst — die endgültige Reihenfolge entscheidet der Owner.
     *
     * Es ist ausserdem das einzige Thema mit einer FRIST: Gutscheine sind ein
     * Dezember-Geschäft. Wer es im November nicht stehen hat, wartet ein Jahr.
     */
    /* NEUES PRODUKT SEIT 06.08.2026 (Owner: „der text stimmt nicht"): verkauft wird UNSER
       Gutschein — Geschenk oder Guthaben wählen, Bella bringt die Botschaft, die Karte geht
       per E-Mail raus. „dein Gesicht" und „dein Gutschein" gibt es nicht mehr. */
    /**
     * GUTSCHEIN ERST MAL AUS (Owner 15.08.2026: „Gutschein kannst du ausschalten erst mal").
     *
     * DER ANLASS steht im Auftragsprotokoll: DREI bezahlte Gutschein-Auftraege (05.08. und
     * zweimal 06.08.) haben nie ein Video bekommen — der aelteste haengt seit fuenf Anlaeufen
     * an „Sein Foto fehlt im Speicher.". Von allen Themen ist das die schlechteste Quote:
     * drei Kaeufe, null Lieferungen. Ein Produkt, das bezahlt und nicht liefert, gehoert aus
     * dem Angebot, bis die Kette steht.
     *
     * NUR DIE KACHEL, SONST NICHTS: Route, Trichter und Einloese-Weg bleiben unveraendert —
     * bereits verschickte Gutschein-Karten muessen weiter einloesbar sein. Die Seite ist ueber
     * ihre Adresse und ueber die sitemap erreichbar, sie wird nur nicht mehr beworben.
     * Wieder anschalten = diese Zeilen entfernen.
     */
    // { icon: Gift, title: "Gift a voucher", tagline: "Pick a gift or credit — Bella delivers your message as a video card. One tap to redeem.", href: "/themes/gutschein", cover: "/Gutscheine/gutschein-poster.jpg", poster: "/Gutscheine/gutschein-poster.jpg", video: "/Gutscheine/PixVerse_V6_Fusion_360P_She_holds_a_cream_enve.mp4", chips: "♥ Your gift · Your message · One tap", abPreis: AB_GUTSCHEIN },
    // HOCHZEIT gleich hinter Kiss (Owner 30.07.2026: „die Frauen lieben Hochzeiten").
    // Dieselbe Maschine wie Kiss, andere Rollen: SIE bedient den Trichter.
    // BELLA (Owner 29.07.2026): Sie ist das Gesicht des Portals, und der beste
    // Reel der Kontogeschichte („Go on holiday with Bella in Tenerife") bewirbt genau dieses
    // Versprechen. Er zeigte bisher auf /urlaub-mit-bella, eine Seite mit abgeschaltetem
    // Angebot — jetzt auf /themes/bella mit dem lebenden Trichter.
    { icon: Palmtree, title: "Tenerife with Bella", tagline: "Not her holiday — yours. Your photo, and she is in the video with you.", href: "/themes/bella", cover: bellaCover || wetterCover, video: bellaVideo || urlaubVideo || undefined, chips: "♥ Bella · Your photo · Video" },
    /**
     * „MORNING WEATHER" IST RAUS (Owner 11.08.2026: „Wake up with Bella bieten wir nicht mehr
     * an" — Teil des abgeschafften Themen-Abos, das dieses Angebot trug). Hier stand eine
     * Kachel, die für ein Abo warb, das es nicht mehr gibt. Die Route `/themes/wetter/bella`
     * bleibt aus demselben Grund erreichbar wie jedes andere ausgeblendete Thema (siehe
     * `AUSGEBLENDET` unten) — nur der Katalog bewirbt sie nicht mehr.
     */
    // NEU (27.07.2026): nicht mehr „sie reist für dich", sondern ER macht die Videos selbst
    // — Foto hoch, Model wählen, einen von 25 Momenten antippen. Alte Bella-Reise lebt
    // weiter unter /urlaub-mit-bella (Landing + Card-Tool), ist aber nicht mehr verlinkt.
    // Chat = das Thema mit den niedrigsten Kosten pro Kunde (Haiku), deshalb weit vorn.
    /* DAS EINLADUNGSVIDEO STATT EINES PLATZHALTERFOTOS (Owner 03.08.2026: „auch hier muss
       das richtige Video stehen"). `cover: ph(3)` war ein themenfremdes Modelfoto aus dem
       Bilderstapel — die Kachel zeigte irgendeine Frau, waehrend die Seite dahinter ein
       bestimmtes Video hat. Die Merkmale stimmten ebenfalls nicht mehr: „Looks" ist raus
       (das Anziehen ist weg) und „Free" gilt nur fuer die ersten Nachrichten. */
    { icon: MessageCircle, title: "Chat with Bella", tagline: "One woman, one chat — she answers in your language, day after day.", href: "/themes/chat", cover: "/Chat/chat-poster.jpg", poster: "/Chat/chat-poster.jpg", video: "/Chat/Private%20Chat%20Invitation_1080p.mp4", chips: "♥ Chat · First messages free", abPreis: AB_CHAT },
    /* URLAUB IST JETZT EINE EINLADUNG (Owner 04.08.2026). Hier stand „Holiday with your
       dream girl … 25 moments" — das alte Fantasie-Thema mit unserem Model-Katalog. Es lebt
       unverändert weiter als „Tenerife with Bella" (/themes/bella); unter DIESEM Namen lädt
       man ab heute einen echten Menschen ein. Preis wie die Hochzeit, weil es dieselbe
       Einladungs-Maschine ist — nicht mehr das Themen-Abo. */
    { icon: Palmtree, title: "Holiday invitation video", tagline: "Ask someone to come away with you — a video of you both, already there.", href: "/themes/holiday", cover: "/Holiday/urlaub-poster.jpg", poster: "/Holiday/urlaub-poster.jpg", video: "/Holiday/urlaub-beispiel.mp4", chips: "♥ Your photo · Their photo · Invitation", abPreis: AB_HOCHZEIT },
    // Direkt in den Funnel: /themes/tryon wäre nur eine Zwischenseite mit noch einem Button.
    // Die Landing bleibt für die Admin-Werkzeuge erreichbar (Menü → „Try-On — manage").
    /* TRY-ON ALS E-COMMERCE-WERKZEUG (Owner 24.08.2026: „nur den Text ändern, als Tool für
       E-Commerce-Firmen anpassen" · „Die können das bei uns einkaufen und hier testen").
       Kein Endkunden-Geschenk mehr — die Kachel spricht Shops an; der Link führt in den
       Funnel zum Selbst-Testen. Kein Preis auf der Kachel: B2B, Preis nach Gespräch. */
    /* HOOK IST JETZT EIN ECHTES ANPROBE-VIDEO (Owner 27.08.2026: „da steht ein falsches
       Motiv als Hook, Bella als Wetter-Dame — ich habe es uebersehen"). Vorher zog die
       Kachel `tryonDressed` aus Bellas Feed und fiel auf WHITE_DRESS zurueck — genau das
       Wetter-Motiv. Es zeigt eine Frau in einem Kleid, aber NICHT, was das Werkzeug tut.
       Jetzt dieselbe Vorlage, die auch im Trichter steht: ein Kleid, in Bewegung, mit
       Poster daneben — Hausregel „Landingpage-Video = Kachel-Video". */
    { icon: Shirt, title: "Virtual try-on for online shops", tagline: "Your products on a model, as a video — test the tool here, get it for your store.", href: TRYON, cover: "/Tryon/tryon-01.jpg", poster: "/Tryon/tryon-01.jpg", video: "/Tryon/tryon-01.mp4", chips: "For online shops · Test it here · Your products" },
    { icon: Star, title: "Your Idol with you", tagline: "Pick your idol, add your photo — the two of you in one video.", href: "/your-idol", cover: ph(7), video: idolVideo || undefined, chips: "♥ Your idol · Your photo · Video" },
    { icon: Sparkles, title: "Luxury Looks", tagline: "A fresh luxury outfit every day — see it on her, in a video.", href: TRYON, cover: ph(0), video: luxuryVideo || undefined, chips: "♥ Look · Model · Video" },
    // Lingerie-Karte zeigt Bella in Lingerie und führt DIREKT in den Try-on-Funnel
    // (dort wählt er Look + Model) — kein „coming soon" mehr.
    { icon: Flame, title: "Lingerie Looks", tagline: "See her in lingerie — any look, in a video.", href: TRYON, cover: tryonLingerie || ph(1), video: lingerieVideo || undefined, chips: "♥ Lingerie · Model · Video" },
    /**
     * „SURPRISE HIM" (POLE DANCE) IST AUS DEM KATALOG RAUS (Owner 11.08.2026: „ich denke,
     * wir müssen pool dancing raus machen weil das unseriös wirkt für das portal").
     *
     * Dasselbe Muster wie bei „Wake up with Bella" und den Modell-Anwerbeseiten am selben
     * Tag: Die Kachel fliegt aus dem Katalog, die Seite `/themes/surprise` und ihr Kaufweg
     * bleiben technisch bestehen (falls noch ein alter Link unterwegs ist) — nur beworben
     * wird es nicht mehr. Siehe auch die Themen-Kreise (components/CI.tsx, THEMEN_KREISE)
     * und app/sitemap.ts, wo derselbe Eintrag ebenfalls entfernt wurde.
     */
  ];

  /**
   * AUSGEBLENDET, NICHT GELÖSCHT (Owner 03.08.2026: „wir blenden die Topics raus").
   *
   * Der Marktplatz verkauft ab jetzt GESCHENKE (siehe KONZEPT-GESCHENKE.md): etwas, das man
   * einem Menschen schickt. Was hier verschwindet, ist genau das, was keins ist — sich selbst
   * ein Kleid ansehen (Try-On, Luxury, Lingerie), Bellas Urlaub, das Wetter am Morgen, das
   * Idol. Gute Themen, aber sie beantworten eine andere Frage als „was schenke ich?", und auf
   * einer Seite, auf die geworben wird, kostet jede zweite Frage Klicks.
   *
   * ALS LISTE UND NICHT ALS LÖSCHUNG: Die Karten sind gepflegt, haben Cover, Videos und
   * lebende Trichter dahinter. Ein Titel hier heraus und sie sind zurück — die Seiten selbst
   * bleiben erreichbar, nur der Katalog zeigt sie nicht mehr.
   *
   * Der Abgleich läuft über den ENGLISCHEN Titel, weil er die Kennung ist: Übersetzt wird
   * erst danach, und eine rumänische Schreibweise in dieser Liste würde beim nächsten
   * Sprachwechsel still danebengreifen.
   */
  const AUSGEBLENDET = new Set([
    "Tenerife with Bella",
    /* "Morning Weather" stand hier bis 11.08.2026 — die Kachel selbst ist jetzt aus dem
       THEMES-Array entfernt (nicht nur ausgeblendet), weil sie ein abgeschafftes Angebot
       bewarb (Owner: „Wake up with Bella bieten wir nicht mehr an"). Ein Eintrag ohne
       passende Kachel ist hier wirkungslos, deshalb steht er nicht mehr in dieser Liste. */
    /* Owner 07.08.2026: „wir blenden ers mal Bella raus aus der Topic seite." Damit ist
       Bella als Thema vollständig aus dem Katalog — die beiden Zeilen darüber waren es
       schon, der Chat war der letzte. Die Seite /themes/chat bleibt erreichbar und der
       Trichter dahinter lebt; nur der Katalog zeigt ihn nicht mehr. „Erst mal": Ein Titel
       hier heraus, und er ist zurück. */
    "Chat with Bella",
    /* „Try-On" stand hier vom 03.08. bis 24.08.2026 — jetzt wieder sichtbar, umgetextet als
       E-Commerce-Werkzeug (Owner: „nur den Text ändern"). */
    "Your Idol with you",
    "Luxury Looks",
    "Lingerie Looks",
    /* HOLIDAY IST RAUS (Owner 24.08.2026: „auch hollyday weg" — im Zuge von „Wir sind
       jetzt ein seriöses Portal", zusammen mit Pole Dance und Chat aus den Themen-Kreisen).
       Seite und Kaufweg bleiben erreichbar; nur der Katalog bewirbt sie nicht mehr. */
    "Holiday invitation video",
  ]);
  const SICHTBAR = THEMES.filter(t => !AUSGEBLENDET.has(t.title));

  // KARTENTEXTE übersetzen (Titel, Untertitel, Chips) — sie standen bisher nur englisch da,
  // während der Rest der Seite in acht Sprachen läuft. Ein Aufruf für alle Karten, danach
  // aus dem Dauer-Cache. Der Herz-/Trenner-Schmuck der Chips bleibt unangetastet.
  const flat: Record<string, string> = {};
  SICHTBAR.forEach((t, i) => {
    // „Future Self Program" ist ein Markenname (11.08.2026) — er darf nicht in den
    // Übersetzungslauf, sonst macht die KI daraus z. B. „Programm für das zukünftige
    // Selbst". Ohne Eintrag in `flat` fällt der Titel unten auf `t.title` zurück, also auf
    // genau diesen englischen Namen, in jeder Sprache gleich.
    if (t.href !== "/themes/versprechen") flat[`t${i}`] = t.title;
    flat[`g${i}`] = t.tagline;
    if (t.chips) flat[`c${i}`] = t.chips.replace(/^♥\s*/, "");
  });
  const tr = await trObject(flat, L);
  const THEMES_L: Theme[] = SICHTBAR.map((t, i) => ({
    ...t,
    title: tr[`t${i}`] || t.title,
    tagline: tr[`g${i}`] || t.tagline,
    chips: t.chips ? `♥ ${tr[`c${i}`] || t.chips.replace(/^♥\s*/, "")}` : t.chips,
  }));

  return (
    <main className="lb-bg min-h-[100dvh] text-white">
      {/* Startseite: kein Zurück-Pfeil, hier endet der Weg nach hinten. */}
      <TopNav back={false} />
      <TrackView event="themes_view" lookId="themes-themes" lookName="Themen-Uebersicht" />

      <div className="mx-auto max-w-3xl px-4 pb-24 pt-3">
        <Kicker>{c.kicker}</Kicker>
        <H1>{c.h1a} <Y>{c.h1b}</Y></H1>
        {/* DIE BESCHREIBUNG KOMMT AUS „ÜBER UNS" (Owner 10.08.2026: „Wir legen das origial
            in Abou an. Was dort geändert wird, gilt für das ganze portal. Also auch für die
            Startseite(Topics)"). Hier stand eine eigene Fassung — die dritte im Haus, neben
            der in „Über uns" und der in den AGB. Drei Beschreibungen altern einzeln, und
            zwei davon werden vergessen: In den AGB stand deshalb monatelang „marketplace of
            influencers", was das Portal nie war. */}
        <Lead className="max-w-xl">{A.portalKurz}</Lead>

        {/* DER CODE-HINWEIS IST RAUS (Owner 03.08.2026: „mach bitte das raus").

            Er warb mit dem Abo — „du zahlst dauerhaft nur {price} statt {list}" — und stand
            damit ueber einer Seite, die seit heute Geschenke zeigt. Beim Kuss gibt es gar
            kein Abo mehr, und die uebrigen fuenf Kacheln sind Einzelkaeufe: Der Satz erklaerte
            einen Preis, den auf dieser Seite fast nichts mehr kostet.

            Der Code selbst lebt weiter — er wandert unverandert in jedes Thema mit und wird
            an der Kasse eingeloest. Nur die Zeile darueber faellt weg.
            Die `codeNote`-Texte sind mitgeloescht: Ein Preisversprechen, das niemand mehr
            anzeigt, ist genau das, was beim naechsten Umbau versehentlich zurueckkommt. */}

        {/* Startseite → zu den Models. Zwei Wege, weil beides gefragt ist: die ganze
            Galerie und der Chat-Einstieg. */}
        {/* Die drei Knoepfe (WhatsApp, Models, Garderobe) sind am 30.07.2026 raus (Owner:
            „die machst du raus, die drei buttons von der Homepage"). Sie standen ueber den
            Themen und haben von ihnen abgelenkt: Wer hier ankommt, soll ein Thema waehlen,
            nicht in den Katalog oder die Garderobe abbiegen. Beide sind ueber das Menue
            weiterhin erreichbar. */}


        {/* Karten EXAKT im Stil der Models-Galerie: Bild oben (Badge + Pille), Text darunter, kein Rahmen. */}
        {/* EINE KACHEL JE REIHE (Owner 03.08.2026: „erst mal will ich die Topics in einer
            Reihe und die Preise haben ab...").
            Vorher zwei je Reihe (Owner 30.07.2026) — das war richtig, solange die Kachel nur
            Titel und Untertitel trug. Mit dem Preis kommt eine dritte Zeile dazu, und die
            entscheidet ueber den Klick: In einer halbbreiten Kachel stuende sie abgeschnitten
            neben einem abgeschnittenen Titel. Ein Geschenk, dessen Preis man raten muss,
            verkauft sich nicht. */}
        {/* DIE KACHELN KOMMEN AUS DER BIBLIOTHEK (Owner 06.08.2026: „mach mir in die
            bibliotheck auch ein Topic kasten" · „wir machen zwei Designs … Ich werde mit
            einem toogle button von hier umschalten koennen"). Die Gestalt-Umschaltung und
            beide Gestalten leben in components/CI.tsx; hier stehen nur noch die Daten.
            Das Wasserzeichen fuer Themen ohne Bild reicht diese Server-Seite fertig
            herein — ein Icon ist eine Funktion und laesst sich nicht an einen
            Client-Baustein durchreichen, gerendertes JSX schon. */}
        <ThemenListe
          className="mt-6"
          gestalt={gestalt}
          ctaZeile={CTA_ZEILE[L] ?? CTA_ZEILE.en}
          baldZeile="Coming soon"
          themen={THEMES_L.map(t => ({
            titel: t.title,
            zeile: t.tagline,
            href: t.href ? withCode(t.href) : undefined,
            bild: t.cover,
            bild2: t.cover2,
            video: t.video,
            poster: t.poster,
            ausrichtung: t.ausrichtung,
            merkmale: fillPrices(t.chips || "\u2665 Weather \u00b7 New look \u00b7 Chat", L),
            abPreis: t.abPreis,
            platzhalter: <t.icon className="h-16 w-16 text-white/10" strokeWidth={1.25} />,
          }))} />

        {/* ── SEO / Erklärtext ──────────────────────────────────────────────────────
            Echter, lesbarer Text für Suchmaschinen UND Menschen: was LuxuryBandit ist
            und was die App kann. Bewusst als normale Überschriften + Absätze (kein
            versteckter Keyword-Block) — Google straft verborgenen Text ab. */}
        <section className="mt-14 space-y-11 border-t border-white/10 pt-10">
          {/* Gelb + Weiß, große Überschriften: Balken in CI-Gelb, Headline weiß, die
              Begriffe der Liste gelb — Fließtext bleibt weiß gedämpft (lesbar). */}
          <div>
            <SectionTitle>{c.whatH}</SectionTitle>
            <Lead>
              {A.portalLang} <Link href="/ai-notice" className="font-black text-[#f6cf51] underline underline-offset-2">AI Notice</Link>.
            </Lead>
          </div>

          <div>
            <SectionTitle>{c.uniqueH}</SectionTitle>
            <Lead>{c.uniqueP}</Lead>
          </div>

          <div>
            <SectionTitle>{c.canH}</SectionTitle>
            <ul className="mt-4 space-y-3.5">
              {c.items.map(([t, d]) => (
                <li key={t} className="flex gap-3 border-b border-white/[0.07] pb-3.5 last:border-0 last:pb-0">
                  <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#f6cf51]" />
                  <span className="min-w-0">
                    <strong className="block text-[16px] font-black leading-tight text-[#f6cf51]">{t}</strong>
                    <span className="mt-0.5 block text-[15px] font-medium leading-relaxed text-white/70">{d}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <SectionTitle>{c.costH}</SectionTitle>
            <Lead>
              {fillPrices(c.costP, L)} <Link href="/unsubscribe" className="font-black text-[#f6cf51] underline underline-offset-2">Unsubscribe</Link>.
            </Lead>
          </div>

          <div>
            <SectionTitle>{c.noteH}</SectionTitle>
            <Lead>
              {c.noteP} <Link href="/terms" className="font-black text-[#f6cf51] underline underline-offset-2">Terms</Link> ·{" "}
              <Link href="/privacy" className="font-black text-[#f6cf51] underline underline-offset-2">Privacy</Link>
            </Lead>
          </div>
        </section>

        {/* „BECOME A MODEL" IST RAUS (Owner 05.08.2026, mit Bild: „das kommt raus auf der
            Galerie-Seite").
            Hier stand unter dem Katalog: „Want your own topic as an influencer? Become a
            model →" — der letzte Satz, den ein Geschenkkäufer auf dieser Seite las, war eine
            Einladung, Model zu werden. Auf einem Geschenkideen-Portal ist das kein Angebot,
            sondern ein Abzweig, der vom Kauf wegführt; und die Bewerbung selbst hat der Owner
            am selben Tag für Besucher geschlossen (siehe components/NurAdmin, BottomNav). */}
      </div>
        {/* Der Fuss auch im Katalog (Owner 05.08.2026: „jetzt den Footer auch die
            Katalogseite") — es ist die Seite, auf der die Anzeigen landen. */}
        <SeitenFuss />
    </main>
  );
}
