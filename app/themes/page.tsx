import Link from "next/link";
import { Kicker, H1, Y, SectionTitle, Lead } from "@/components/Landing";
import TopNav from "@/components/TopNav";
import TrackView from "@/components/TrackView";
import { CloudSun, Cake, Sparkles, Flame, MapPin, Lock, Palmtree, Shirt, Star, Heart, Users, Gift, MessageCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { buildBellaCard, BELLA_ID } from "@/lib/bella-card";
import { resolveLang } from "@/lib/lang-server";
import { trObject } from "@/lib/tr-object";
import { readCardStudioSlides, getSignedUrl, isPublicBellaPost, sortBellaPosts, readTryThisLookState, readKissConfig, readThemeConfig } from "@/lib/try-this-look-store";
import { WHATSAPP_CHANNEL, followWhatsApp } from "@/lib/social";

// Katalog aller „Themen" als bildstarke Galerie (wie die Reel-/Models-Galerie).
// Aktiv: Wetter am Morgen (/themes/wetter/<model>). Weitere sind vorbereitet (coming soon).
export const dynamic = "force-dynamic"; // Cover-Foto (signierte URL) frisch laden

export const metadata = {
  title: "AI influencer marketplace — AI model videos, try-on, deepfake & chat | LuxuryBandit",
  description: "One place for AI influencers: chat with an AI model, try on any look in a video, make a kiss or deepfake video with your own photo, get a birthday video with a name. 24,50 €/month incl. 10 videos across all topics; chatting is free.",
  keywords: ["ai influencer", "ai influencer generator", "ai model generator", "ai model girl", "ai video generator", "ai video maker", "deepfake video generator", "face swap video ai", "kiss video ai generator", "try on ai clothes", "virtual try on ai", "lingerie try on ai", "birthday video maker", "chat with ai model"],
  alternates: { canonical: "/themes" },
  openGraph: {
    title: "LuxuryBandit — AI influencers, videos & daily messages",
    description: "Chat with her, see any look on her in a video, get a message every morning.",
    type: "website",
  },
};

type Theme = { icon: LucideIcon; title: string; tagline: string; href?: string; cover?: string; video?: string; poster?: string; chips?: string; cover2?: string };

// Startseite = mehrsprachig nach BROWSERSPRACHE (kein Umschalter nötig, kein Deutsch für
// alle). Gleiche Sprachliste wie das Wetter-Thema, damit beides zusammenpasst.
type PageCopy = {
  kicker: string; h1a: string; h1b: string; intro: string;
  models: string; wardrobe: string;
  codeNote: string;   // Aktionscode-Hinweis, {CODE} wird ersetzt
  whatH: string; whatP: string; uniqueH: string; uniqueP: string; canH: string; costH: string; costP: string; noteH: string; noteP: string;
  items: [string, string][];
};
const C: Record<string, PageCopy> = {
  ro: { kicker: "LuxuryBandit", h1a: "Alege o temă.", h1b: "Primește-o zilnic.", intro: "Fiecare temă îți trimite conținut zilnic de la influencerul tău — plus un chat cu ea.",
    codeNote: "Codul tău {CODE} este activ: alege orice temă de mai jos — chatul este gratuit, iar plătești permanent doar 24,50 € în loc de 49 €.",
    models: "Vezi modelele noastre și vorbește cu ele →", wardrobe: "Garderobă",
    whatH: "Ce este LuxuryBandit?", whatP: "LuxuryBandit este o piață de influenceri cu influenceri AI. Alegi un model, vorbești cu ea în chat și creezi videoclipuri cu ea în orice ținută — direct în browser, fără aplicație. Fiecare chat este purtat de o persona AI, iar noi o spunem pe fiecare ecran.",
    uniqueH: "Unic în lume", uniqueP: "Nu mai există așa ceva: LuxuryBandit este singurul loc unde aceeași influenceriță AI îți scrie dimineața, poartă ținutele pe care le alegi, vorbește cu tine și joacă în videoclipurile tale. Folosim intenționat cele mai scumpe modele AI video de pe piață — cele ieftine pierd fața și mișcarea. Un marketplace de influenceri AI, nu o aplicație de filtre.",
    canH: "Ce poți face?", costH: "Cât costă?", costP: "Chatul este gratuit. Abonamentul este pentru imagini și videoclipuri: 24,50 € pe lună, cu 10 videoclipuri lunar, în toate temele la un loc. Videoclipul de ziua de naștere costă 3,99 € o singură dată. Te poți dezabona oricând.",
    noteH: "Bine de știut", noteP: "LuxuryBandit este doar pentru adulți — confirmi că ai peste 18 ani înainte de chat. Persona AI flirtează și te întreabă cum a fost ziua ta, dar nu pretinde niciodată sentimente și nu se dă drept persoană reală. Pentru videoclipuri cu fotografii proprii ești întrebat explicit înainte și confirmi că ai dreptul să folosești fotografia — răspunderea este a ta, iar rezultatul rămâne privat.",
    items: [["Vremea de dimineață","în fiecare dimineață îți scrie: vremea la tine, un look nou și un chat cu ea."],["Probează ținute","alegi o ținută și un model — o vezi purtând-o într-un video, din toate unghiurile."],["Lenjerie și ținute de lux","la fel, în cele mai elegante și mai intime ținute."],["Sărută orice model","încarci poza ta și vă vezi pe amândoi într-un sărut."],["Idolul tău cu tine","alegi idolul tău și vă vedeți împreună la o petrecere."],["Videoclipuri de ziua de naștere","scrii un nume și ea îi urează la mulți ani cu voce tare, pe nume."],["Vacanță cu Bella","călătorește pentru tine și aduce zilnic videoclipuri și povești."]] },
  de: { kicker: "LuxuryBandit", h1a: "Wähle ein Thema.", h1b: "Bekomm es jeden Tag.", intro: "Jedes Thema schickt dir täglich Inhalte von deiner Influencerin — dazu ein Chat mit ihr.",
    codeNote: "Dein Code {CODE} ist aktiv: Wähle unten ein Thema — Chatten ist gratis, und du zahlst dauerhaft nur 24,50 € statt 49 €.",
    models: "Unsere Models ansehen & mit ihnen chatten →", wardrobe: "Garderobe",
    whatH: "Was ist LuxuryBandit?", whatP: "LuxuryBandit ist ein Influencer-Marktplatz mit KI-Influencerinnen. Du wählst ein Model, chattest mit ihr und erstellst Videos von ihr in jedem Outfit — direkt im Browser, ohne App. Jeden Chat führt eine KI-Persona, und wir schreiben das auf jedem Bildschirm dazu.",
    uniqueH: "Einmalig auf der Welt", uniqueP: "So etwas gibt es sonst nirgends: Bei LuxuryBandit schreibt dir dieselbe KI-Influencerin morgens, trägt die Looks, die du wählst, chattet mit dir und spielt in deinen Videos mit. Wir setzen bewusst die teuersten KI-Video-Modelle des Marktes ein — die billigen verlieren Gesicht und Bewegung. Ein Marktplatz für KI-Influencerinnen, keine Filter-App.",
    canH: "Was kannst du damit machen?", costH: "Was kostet es?", costP: "Chatten ist gratis. Das Abo ist für Bilder und Videos: 24,50 € im Monat, darin sind 10 Videos monatlich enthalten — über alle Themen zusammen. Ein Geburtstagsvideo kostet einmalig 3,99 €. Du kannst dich jederzeit abmelden.",
    noteH: "Gut zu wissen", noteP: "LuxuryBandit ist nur für Erwachsene — du bestätigst vor dem Chat, dass du 18 oder älter bist. Die KI-Persona flirtet und fragt nach deinem Tag, behauptet aber nie Gefühle und gibt sich nie als echte Person aus. Für Videos mit eigenen Fotos wirst du vorher ausdrücklich gefragt und bestätigst, dass du das Foto verwenden darfst — die Verantwortung dafür trägst du, und das Ergebnis bleibt privat.",
    items: [["Wetter am Morgen","jeden Morgen eine Nachricht: dein Wetter, ein neuer Look von ihr und ein Chat."],["Outfit anprobieren","Outfit und Model wählen — du siehst sie es tragen, von allen Seiten."],["Lingerie & Luxury Looks","dasselbe, in ihren elegantesten und intimsten Looks."],["Küsse jedes Model","lade dein Foto hoch und seht euch beide in einem Kuss."],["Dein Idol mit dir","wähle dein Idol und seht euch zusammen auf einer Party."],["Geburtstagsvideos","Namen eintippen und sie gratuliert laut, mit Namen."],["Urlaub mit Bella","sie reist für dich und bringt täglich Videos und Geschichten mit."]] },
  en: { kicker: "LuxuryBandit", h1a: "Pick a topic.", h1b: "Get it every day.", intro: "Each topic sends daily content from your influencer — plus a chat with her.",
    codeNote: "Your code {CODE} is active: pick any topic below — chatting is free, and you pay just 24.50 € instead of 49 €, for as long as you stay.",
    models: "See our models & chat with them →", wardrobe: "Wardrobe",
    whatH: "What is LuxuryBandit?", whatP: "LuxuryBandit is an influencer marketplace with AI influencers. You pick a model, chat with her and create videos of her in any outfit — all in your browser, no app to install. Every chat is answered by an AI persona, and we say so on every screen.",
    uniqueH: "One of a kind, worldwide", uniqueP: "There is nothing else like it: LuxuryBandit is the one place where the same AI influencer messages you in the morning, wears the looks you pick, chats with you and stars in your videos. We deliberately run the most expensive AI video models on the market — the cheap ones lose the face and the motion. An AI influencer marketplace, not a filter app.",
    canH: "What can you do with it?", costH: "How much does it cost?", costP: "Chatting is free. The subscription is for pictures and videos: 24,50 € per month, including 10 videos a month across all topics together. A birthday video is a one-off €3.99. You can unsubscribe at any time.",
    noteH: "Good to know", noteP: "LuxuryBandit is for adults only — you confirm you are 18 or older before you can chat. The AI persona flirts and asks about your day, but never claims feelings and never pretends to be a real person. For videos made from your own photos you are asked up front and confirm that you may use that photo — the responsibility is yours, and the result stays private.",
    items: [["Morning Weather","every morning she sends you a message: the weather where you are, a new look of hers, and a chat."],["Try-On","pick an outfit and a model, and watch her wear it in a video, from every angle."],["Lingerie & Luxury Looks","the same, in her most elegant and most intimate looks."],["Kiss any Model","upload your photo and see the two of you share a kiss."],["Your Idol with you","pick your idol and see the two of you together at a party."],["Birthday videos","type a name and she wishes them a happy birthday out loud, by name."],["Holiday with your dream girl","upload your photo, pick her and pick the moment — you make the videos."]] },
  es: { kicker: "LuxuryBandit", h1a: "Elige un tema.", h1b: "Recíbelo cada día.", intro: "Cada tema te envía contenido diario de tu influencer — además de un chat con ella.",
    codeNote: "Tu código {CODE} está activo: elige cualquier tema abajo — chatear es gratis y pagas siempre solo 24,50 € en vez de 49 €.",
    models: "Ver nuestras modelos y chatear con ellas →", wardrobe: "Armario",
    whatH: "¿Qué es LuxuryBandit?", whatP: "LuxuryBandit es un mercado de influencers con influencers de IA. Eliges una modelo, chateas con ella y creas vídeos suyos con cualquier look — en el navegador, sin instalar nada. Cada chat lo lleva una persona virtual (IA), y lo indicamos en cada pantalla.",
    uniqueH: "Único en el mundo", uniqueP: "No existe nada igual: en LuxuryBandit la misma influencer de IA te escribe por la mañana, lleva los looks que eliges, habla contigo y protagoniza tus vídeos. Usamos a propósito los modelos de vídeo con IA más caros del mercado — los baratos pierden el rostro y el movimiento. Un marketplace de influencers de IA, no una app de filtros.",
    canH: "¿Qué puedes hacer?", costH: "¿Cuánto cuesta?", costP: "Chatear es gratis. La suscripción es para las fotos y los vídeos: 24,50 € al mes, que incluye 10 vídeos mensuales en todos los temas juntos. Un vídeo de cumpleaños cuesta 3,99 € una sola vez. Puedes darte de baja cuando quieras.",
    noteH: "Bueno saberlo", noteP: "LuxuryBandit es solo para adultos — confirmas que tienes 18 años o más antes de chatear. La persona de IA coquetea y pregunta por tu día, pero nunca dice tener sentimientos ni finge ser una persona real. Para los vídeos con fotos propias se te pregunta expresamente antes y confirmas que puedes usar esa foto — la responsabilidad es tuya y el resultado es privado.",
    items: [["Clima por la mañana","cada mañana te escribe: tu clima, un look nuevo y un chat con ella."],["Probar looks","elige un look y una modelo — la ves llevándolo en un vídeo, desde todos los ángulos."],["Lencería y looks de lujo","lo mismo, en sus looks más elegantes e íntimos."],["Besa a cualquier modelo","sube tu foto y os veis a los dos en un beso."],["Tu ídolo contigo","elige a tu ídolo y os veis juntos en una fiesta."],["Vídeos de cumpleaños","escribe un nombre y ella felicita en voz alta, por su nombre."],["Vacaciones con Bella","viaja por ti y trae vídeos e historias cada día."]] },
  fr: { kicker: "LuxuryBandit", h1a: "Choisis un thème.", h1b: "Reçois-le chaque jour.", intro: "Chaque thème t'envoie du contenu quotidien de ton influenceuse — et un chat avec elle.",
    codeNote: "Ton code {CODE} est actif : choisis un thème ci-dessous — le chat est gratuit et tu paies toujours 24,50 € au lieu de 49 €.",
    models: "Voir nos modèles et discuter avec elles →", wardrobe: "Dressing",
    whatH: "Qu'est-ce que LuxuryBandit ?", whatP: "LuxuryBandit est une place de marché d'influenceuses avec des influenceuses IA. Tu choisis un modèle, tu discutes avec elle et tu crées des vidéos d'elle dans n'importe quelle tenue — dans le navigateur, sans application. Chaque chat est mené par un personnage IA, et nous l'indiquons sur chaque écran.",
    uniqueH: "Unique au monde", uniqueP: "Rien d'équivalent ailleurs : sur LuxuryBandit, la même influenceuse IA t'écrit le matin, porte les looks que tu choisis, discute avec toi et joue dans tes vidéos. Nous utilisons volontairement les modèles vidéo IA les plus chers du marché — les modèles bon marché perdent le visage et le mouvement. Une marketplace d'influenceuses IA, pas une appli de filtres.",
    canH: "Que peux-tu faire ?", costH: "Combien ça coûte ?", costP: "Le chat est gratuit. L'abonnement couvre les photos et les vidéos : 24,50 € par mois, avec 10 vidéos par mois pour tous les thèmes réunis. Une vidéo d'anniversaire coûte 3,99 € une seule fois. Tu peux te désabonner à tout moment.",
    noteH: "Bon à savoir", noteP: "LuxuryBandit est réservé aux adultes — tu confirmes avoir 18 ans ou plus avant de discuter. Le personnage IA flirte et demande comment s'est passée ta journée, mais ne prétend jamais avoir des sentiments ni être une vraie personne. Pour les vidéos réalisées avec tes propres photos, on te le demande explicitement avant et tu confirmes avoir le droit d'utiliser cette photo — la responsabilité est la tienne et le résultat reste privé.",
    items: [["Météo du matin","chaque matin elle t'écrit : ta météo, un nouveau look et un chat avec elle."],["Essayer une tenue","choisis une tenue et un modèle — tu la vois la porter en vidéo, sous tous les angles."],["Lingerie et looks de luxe","la même chose, dans ses looks les plus élégants et les plus intimes."],["Embrasse un modèle","envoie ta photo et voyez-vous tous les deux dans un baiser."],["Ton idole avec toi","choisis ton idole et voyez-vous ensemble à une fête."],["Vidéos d'anniversaire","écris un prénom et elle souhaite un joyeux anniversaire à voix haute."],["Vacances avec Bella","elle voyage pour toi et rapporte chaque jour vidéos et histoires."]] },
  pt: { kicker: "LuxuryBandit", h1a: "Escolhe um tema.", h1b: "Recebe-o todos os dias.", intro: "Cada tema envia-te conteúdo diário da tua influencer — e uma conversa com ela.",
    codeNote: "O teu código {CODE} está ativo: escolhe um tema abaixo — conversar é grátis e pagas sempre apenas 24,50 € em vez de 49 €.",
    models: "Ver as nossas modelos e conversar com elas →", wardrobe: "Guarda-roupa",
    whatH: "O que é o LuxuryBandit?", whatP: "O LuxuryBandit é um mercado de influencers com influencers de IA. Escolhes uma modelo, conversas com ela e crias vídeos dela com qualquer visual — no browser, sem instalar nada. Cada conversa é conduzida por uma persona de IA, e dizemos isso em cada ecrã.",
    uniqueH: "Único no mundo", uniqueP: "Não existe nada assim: no LuxuryBandit a mesma influenciadora de IA escreve-te de manhã, veste os looks que escolhes, conversa contigo e protagoniza os teus vídeos. Usamos de propósito os modelos de vídeo com IA mais caros do mercado — os baratos perdem o rosto e o movimento. Um marketplace de influenciadoras de IA, não uma app de filtros.",
    canH: "O que podes fazer?", costH: "Quanto custa?", costP: "Conversar é grátis. A subscrição é para as fotos e os vídeos: 24,50 € por mês, com 10 vídeos por mês em todos os temas juntos. Um vídeo de aniversário custa 3,99 € uma única vez. Podes cancelar quando quiseres.",
    noteH: "Bom saber", noteP: "O LuxuryBandit é apenas para adultos — confirmas que tens 18 anos ou mais antes de conversar. A persona de IA flirta e pergunta pelo teu dia, mas nunca afirma ter sentimentos nem finge ser uma pessoa real. Para vídeos com fotos tuas és perguntado antes e confirmas que podes usar essa foto — a responsabilidade é tua e o resultado fica privado.",
    items: [["Tempo de manhã","todas as manhãs escreve-te: o teu tempo, um novo visual e uma conversa."],["Experimentar visuais","escolhe um visual e uma modelo — vês-la a usá-lo num vídeo, de todos os ângulos."],["Lingerie e visuais de luxo","o mesmo, nos visuais mais elegantes e mais intimos."],["Beija qualquer modelo","envia a tua foto e vêem-se os dois num beijo."],["O teu ídolo contigo","escolhe o teu ídolo e vêem-se juntos numa festa."],["Vídeos de aniversário","escreve um nome e ela dá os parabéns em voz alta, pelo nome."],["Férias com a Bella","viaja por ti e traz vídeos e histórias todos os dias."]] },
  pl: { kicker: "LuxuryBandit", h1a: "Wybierz temat.", h1b: "Dostawaj go codziennie.", intro: "Każdy temat przysyła Ci codzienne treści od Twojej influencerki — plus czat z nią.",
    codeNote: "Twój kod {CODE} jest aktywny: wybierz temat poniżej — czat jest darmowy, a płacisz zawsze tylko 24,50 € zamiast 49 €.",
    models: "Zobacz nasze modelki i porozmawiaj z nimi →", wardrobe: "Garderoba",
    whatH: "Czym jest LuxuryBandit?", whatP: "LuxuryBandit to platforma influencerek z influencerkami AI. Wybierasz modelkę, rozmawiasz z nią i tworzysz filmy z nią w dowolnej stylizacji — w przeglądarce, bez aplikacji. Każdy czat prowadzi persona AI i mówimy o tym na każdym ekranie.",
    uniqueH: "Jedyne takie na świecie", uniqueP: "Nie ma nic podobnego: w LuxuryBandit ta sama influencerka AI pisze do Ciebie z rana, nosi wybrane przez Ciebie stroje, rozmawia z Tobą i występuje w Twoich filmach. Świadomie korzystamy z najdroższych modeli wideo AI na rynku — tanie tracą twarz i ruch. Marketplace influencerek AI, a nie aplikacja z filtrami.",
    canH: "Co możesz robić?", costH: "Ile to kosztuje?", costP: "Czat jest darmowy. Abonament obejmuje zdjęcia i filmy: 24,50 € miesięcznie, z 25 filmami w miesiącu we wszystkich tematach razem. Film urodzinowy kosztuje jednorazowo 3,99 €. Możesz zrezygnować w każdej chwili.",
    noteH: "Warto wiedzieć", noteP: "LuxuryBandit jest tylko dla dorosłych — przed czatem potwierdzasz, że masz 18 lat lub więcej. Persona AI flirtuje i pyta o Twój dzień, ale nigdy nie twierdzi, że ma uczucia, ani nie udaje prawdziwej osoby. W przypadku filmów z własnych zdjęć pytamy Cię wprost i potwierdzasz, że masz prawo użyć tego zdjęcia — odpowiedzialność jest Twoja, a wynik pozostaje prywatny.",
    items: [["Pogoda o poranku","każdego ranka pisze do Ciebie: Twoja pogoda, nowy look i czat."],["Przymierzanie stylizacji","wybierz look i modelkę — zobaczysz ją w nim na wideo, z każdej strony."],["Bielizna i luksusowe stylizacje","to samo, w jej najbardziej eleganckich i intymnych stylizacjach."],["Pocałuj modelkę","wyślij swoje zdjęcie i zobaczcie się oboje w pocałunku."],["Twój idol z Tobą","wybierz swojego idola i zobaczcie się razem na imprezie."],["Filmy urodzinowe","wpisz imię, a ona złoży życzenia na głos, po imieniu."],["Wakacje z Bellą","podróżuje dla Ciebie i codziennie przywozi filmy i historie."]] },
  it: { kicker: "LuxuryBandit", h1a: "Scegli un tema.", h1b: "Ricevilo ogni giorno.", intro: "Ogni tema ti manda contenuti quotidiani dalla tua influencer — più una chat con lei.",
    codeNote: "Il tuo codice {CODE} è attivo: scegli un tema qui sotto — la chat è gratis e paghi sempre solo 24,50 € invece di 49 €.",
    models: "Guarda le nostre modelle e chatta con loro →", wardrobe: "Guardaroba",
    whatH: "Che cos'è LuxuryBandit?", whatP: "LuxuryBandit è un marketplace di influencer con influencer IA. Scegli una modella, chatti con lei e crei video di lei con qualsiasi look — nel browser, senza installare nulla. Ogni chat è gestita da una persona virtuale (IA), e lo diciamo su ogni schermata.",
    uniqueH: "Unico al mondo", uniqueP: "Non esiste nulla di simile: su LuxuryBandit la stessa influencer AI ti scrive la mattina, indossa i look che scegli, chiacchiera con te e recita nei tuoi video. Usiamo di proposito i modelli video AI più costosi sul mercato — quelli economici perdono il volto e il movimento. Un marketplace di influencer AI, non un'app di filtri.",
    canH: "Cosa puoi fare?", costH: "Quanto costa?", costP: "Chattare è gratis. L'abbonamento è per foto e video: 24,50 € al mese, con 10 video al mese in tutti i temi insieme. Un video di compleanno costa 3,99 € una volta sola. Puoi disdire quando vuoi.",
    noteH: "Da sapere", noteP: "LuxuryBandit è solo per adulti — confermi di avere 18 anni o più prima di chattare. La persona IA flirta e ti chiede della tua giornata, ma non dichiara mai sentimenti e non finge di essere una persona reale. Per i video con foto tue ti chiediamo prima esplicitamente e confermi di poter usare quella foto — la responsabilità è tua e il risultato resta privato.",
    items: [["Meteo del mattino","ogni mattina ti scrive: il tuo meteo, un nuovo look e una chat."],["Prova un look","scegli un look e una modella — la vedi indossarlo in un video, da ogni angolo."],["Lingerie e look di lusso","lo stesso, nei suoi look più eleganti e intimi."],["Bacia una modella","carica la tua foto e vedetevi entrambi in un bacio."],["Il tuo idolo con te","scegli il tuo idolo e vedetevi insieme a una festa."],["Video di compleanno","scrivi un nome e lei fa gli auguri ad alta voce, per nome."],["Vacanza con Bella","viaggia per te e porta video e storie ogni giorno."]] },
};

// Alle Karten, die ins Anprobieren führen, zeigen auf denselben Funnel-Einstieg.
const TRYON = "/try/look-1784191032626-70e3608b?pick=1";

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
  const c = C[L] ?? C.en;
  // Cover fürs aktive „Wetter"-Thema: das WERBEVIDEO (ad-Slide) — genau das, was der
  // Besucher auf /themes/wetter/bella sieht. Fallback: Bellas Foto.
  let wetterCover = "", wetterVideo = "", wetterPoster = "";
  try {
    const { card } = await buildBellaCard({ surface: "themes" });
    wetterCover = card?.photo || "";
    const slides = (await readCardStudioSlides(BELLA_ID)).filter(isPublicBellaPost).sort(sortBellaPosts);
    const adVid = slides.find(s => s.kind === "video" && (s as { ad?: boolean }).ad === true) ?? slides.find(s => s.kind === "video");
    if (adVid) {
      wetterVideo = await getSignedUrl(adVid.path).catch(() => "");
      wetterPoster = adVid.posterPath ? await getSignedUrl(adVid.posterPath).catch(() => "") : "";
    }
  } catch { /**/ }

  // Platzhalter-Cover für die „coming soon"-Themen = echte Model-Fotos aus dem Katalog
  // (signierte URLs, keine intimen Bilder). Später bekommt jedes Thema sein eigenes Ad-Video.
  let placeholders: string[] = [];
  try {
    const state = await readTryThisLookState();
    placeholders = ((state?.curators ?? []) as Array<{ id?: string; photoUrl?: string; hidden?: boolean; status?: string }>)
      .filter(c => c.id !== BELLA_ID && !!c.photoUrl && !c.hidden && c.status !== "removed")
      .map(c => c.photoUrl as string);
  } catch { /**/ }
  const ph = (i: number) => placeholders[i % Math.max(1, placeholders.length)] || undefined;

  // Kiss-Teaser (vom Admin im Kiss-Medien-Tool hochgeladen) als Cover der Kiss-Karte.
  // Er darf BILD ODER VIDEO sein — ein Video muss ins `video`-Feld, sonst landet eine
  // .mp4 in einem <img> und die Karte zeigt ein kaputtes Bild.
  // Try-On-Karte: dieselbe Überblendung wie im Wetter — Bella im weißen Kleid ↔ in Lingerie.
  const WHITE_DRESS = "try-this-look/uploads/1784915142061-c0ea5633-a652-40bb-8476-bebf69c64658.jpg";
  let tryonDressed = "", tryonLingerie = "";
  try {
    const slides = (await readCardStudioSlides(BELLA_ID)).filter(isPublicBellaPost);
    const pickPath = (x: { kind?: string; path?: string; posterPath?: string }) => (x.kind === "video" ? x.posterPath : x.path) || "";
    const normal = slides.find(x => x.garmentCat === "normal" && pickPath(x));
    tryonDressed = (await getSignedUrl((normal && pickPath(normal)) || WHITE_DRESS).catch(() => "")) || "";
    const ling = slides.find(x => x.garmentCat === "lingerie" && pickPath(x));
    if (ling) tryonLingerie = (await getSignedUrl(pickPath(ling)).catch(() => "")) || "";
  } catch { /**/ }

  // Holiday-Karte: eines der Urlaubs-Videos (Peter & Bella) — die liegen auf der Fläche
  // „lp-journey" und haben kein Poster, also spielt die Karte das Video direkt ab.
  let urlaubVideo = "";
  try {
    const all = await readCardStudioSlides(BELLA_ID);
    const j = all.find(x => x.kind === "video" && !x.customer && !x.hidden && !x.private && !x.pendingApproval
      && (x.pages ?? []).includes("lp-journey") && x.path);
    if (j) urlaubVideo = (await getSignedUrl(j.path).catch(() => "")) || "";
  } catch { /**/ }

  // Vom Owner gelieferte Theme-Videos, fest im Storage abgelegt.
  let birthdayVideo = "", surpriseVideo = "", luxuryVideo = "", idolVideo = "", lingerieVideo = "";
  try {
    [birthdayVideo, surpriseVideo, luxuryVideo, idolVideo, lingerieVideo] = await Promise.all([
      getSignedUrl("try-this-look/videos/birthday-bella-cake.mp4").catch(() => ""),
      // „Surprise him": bewusst der VOLLE Schwenk von unten nach oben (Owner-Entscheidung) —
      // genau dieser Aufbau ist der Reiz der Karte, nicht der zugeschnittene Ausschnitt.
      getSignedUrl("try-this-look/videos/surprise-example.mp4").catch(() => ""),
      getSignedUrl("try-this-look/videos/luxury-looks.mp4").catch(() => ""),
      getSignedUrl("try-this-look/videos/your-idol-with-you.mp4").catch(() => ""),
      getSignedUrl("try-this-look/videos/lingerie-looks.mp4").catch(() => ""),
    ]);
  } catch { /**/ }

  let kissCover = "", kissVideo = "";
  try {
    const kc = await readKissConfig();
    if (kc.teaserPath) {
      const url = await getSignedUrl(kc.teaserPath).catch(() => "");
      if (/\.(mp4|webm|mov)$/i.test(kc.teaserPath)) kissVideo = url; else kissCover = url;
    }
  } catch { /**/ }

  // BELLA-THEMA: dasselbe Muster wie Kiss — das Cover kommt aus dem Medien-Werkzeug
  // (/themes/bella?admin=1 → „1 · Cover"). Beim Anlegen der Karte am 29.07.2026 hatte ich
  // das vergessen: sie zeigte stur Bellas Profilfoto, obwohl im Panel „erscheint im
  // Themes-Katalog" steht. Ist kein Cover gesetzt, gilt das ERSTE Video der Galerie —
  // damit die Karte auch dann das zeigt, was oben auf der Landingpage läuft.
  let bellaCover = "", bellaVideo = "";
  try {
    const bc = await readThemeConfig("bella");
    const p = bc.teaserPath || (bc.examplePaths ?? [])[0] || "";
    if (p) {
      const url = await getSignedUrl(p).catch(() => "");
      if (url) { if (/\.(mp4|webm|mov)$/i.test(p)) bellaVideo = url; else bellaCover = url; }
    }
  } catch { /**/ }

  const THEMES: Theme[] = [
    // BELLA GANZ VORN (Owner 29.07.2026): Sie ist das Gesicht des Portals, und der beste
    // Reel der Kontogeschichte („Go on holiday with Bella in Tenerife") bewirbt genau dieses
    // Versprechen. Er zeigte bisher auf /urlaub-mit-bella, eine Seite mit abgeschaltetem
    // Angebot — jetzt auf /themes/bella mit dem lebenden Trichter.
    { icon: Palmtree, title: "Tenerife with Bella", tagline: "Not her holiday — yours. Your photo, and she is in the video with you.", href: "/themes/bella", cover: bellaCover || wetterCover, video: bellaVideo || urlaubVideo || undefined, chips: "♥ Bella · Your photo · Video" },
    { icon: CloudSun, title: "Morning Weather", tagline: "Your weather, a new look & a chat — every morning.", href: "/themes/wetter/bella", cover: wetterCover, video: wetterVideo, poster: wetterPoster },
    // NEU (27.07.2026): nicht mehr „sie reist für dich", sondern ER macht die Videos selbst
    // — Foto hoch, Model wählen, einen von 25 Momenten antippen. Alte Bella-Reise lebt
    // weiter unter /urlaub-mit-bella (Landing + Card-Tool), ist aber nicht mehr verlinkt.
    // Chat = das Thema mit den niedrigsten Kosten pro Kunde (Haiku), deshalb weit vorn.
    { icon: MessageCircle, title: "Chat with an AI girl", tagline: "Talk to her every day — and dress her in new looks.", href: "/themes/chat", cover: ph(3), chips: "♥ Chat · Looks · Daily" },
    { icon: Palmtree, title: "Holiday with your dream girl", tagline: "You and her: pick the moment — beach, kiss, coffee, dancing.", href: "/themes/holiday", cover: ph(5), video: urlaubVideo || undefined, chips: "♥ Your photo · 25 moments · Video" },
    // Direkt in den Funnel: /themes/tryon wäre nur eine Zwischenseite mit noch einem Button.
    // Die Landing bleibt für die Admin-Werkzeuge erreichbar (Menü → „Try-On — manage").
    { icon: Shirt, title: "Try-On", tagline: "Pick a look, pick a model — watch her wear it in a video.", href: TRYON, cover: tryonDressed || ph(6), cover2: tryonLingerie || undefined, chips: "♥ Look · Model · Video" },
    { icon: Star, title: "Your Idol with you", tagline: "Pick your idol, add your photo — the two of you in one video.", href: "/your-idol", cover: ph(7), video: idolVideo || undefined, chips: "♥ Your idol · Your photo · Video" },
    { icon: Heart, title: "Kiss any Model", tagline: "Your photo + her — a tender kiss in one video.", href: "/themes/kiss", cover: kissCover || ph(8), video: kissVideo || undefined, chips: "♥ Pick her · Your photo · Kiss" },
    { icon: Cake, title: "Birthdays", tagline: "She says happy birthday by name — send it to them.", href: "/themes/birthday", cover: ph(4), video: birthdayVideo || undefined, chips: "♥ Name · Video · Send" },
    { icon: Sparkles, title: "Luxury Looks", tagline: "A fresh luxury outfit every day — see it on her, in a video.", href: TRYON, cover: ph(0), video: luxuryVideo || undefined, chips: "♥ Look · Model · Video" },
    // Lingerie-Karte zeigt Bella in Lingerie und führt DIREKT in den Try-on-Funnel
    // (dort wählt er Look + Model) — kein „coming soon" mehr.
    { icon: Flame, title: "Lingerie Looks", tagline: "See her in lingerie — any look, in a video.", href: TRYON, cover: tryonLingerie || ph(1), video: lingerieVideo || undefined, chips: "♥ Lingerie · Model · Video" },
    // „City Secrets" ist zu „Surprise him" geworden (Owner, 27.07.2026): SIE lädt ihr
    // eigenes Foto hoch und schickt IHM ein privates Video — 3,99 € pro Video.
    { icon: Gift, title: "Surprise him", tagline: "Your photo → a private video only he can open.", href: "/themes/surprise", cover: ph(2), video: surpriseVideo || undefined, chips: "♥ Your photo · Private link · 3,99 €" },
  ];

  // KARTENTEXTE übersetzen (Titel, Untertitel, Chips) — sie standen bisher nur englisch da,
  // während der Rest der Seite in acht Sprachen läuft. Ein Aufruf für alle Karten, danach
  // aus dem Dauer-Cache. Der Herz-/Trenner-Schmuck der Chips bleibt unangetastet.
  const flat: Record<string, string> = {};
  THEMES.forEach((t, i) => {
    flat[`t${i}`] = t.title;
    flat[`g${i}`] = t.tagline;
    if (t.chips) flat[`c${i}`] = t.chips.replace(/^♥\s*/, "");
  });
  const tr = await trObject(flat, L);
  const THEMES_L: Theme[] = THEMES.map((t, i) => ({
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

      <div className="mx-auto max-w-3xl px-4 pb-24 pt-6">
        <Kicker>{c.kicker}</Kicker>
        <H1>{c.h1a} <Y>{c.h1b}</Y></H1>
        <Lead className="max-w-xl">{c.intro}</Lead>

        {/* Kommt er aus einer Anzeige mit Code, sagt die Seite es ihm sofort — der Code
            wandert unten in jedes Thema mit. */}
        {code && (
          <p className="mt-4 rounded-2xl border border-[#f6cf51]/40 bg-[#f6cf51]/10 px-4 py-3 text-[14px] font-bold leading-snug text-[#f6cf51]">
            {c.codeNote.replace("{CODE}", code.toUpperCase())}
          </p>
        )}

        {/* Startseite → zu den Models. Zwei Wege, weil beides gefragt ist: die ganze
            Galerie und der Chat-Einstieg. */}
        <div className="mt-4 flex flex-wrap gap-2">
          {/* WhatsApp-Kanal — täglich neue Beiträge, ohne dass jemand seine Nummer hergibt. */}
          <a href={WHATSAPP_CHANNEL} target="_blank" rel="noopener noreferrer"
            className="flex h-11 items-center justify-center gap-2 rounded-full border border-[#25D366]/40 bg-[#25D366]/10 px-5 text-[14px] font-black text-[#25D366] active:scale-95 transition">
            💬 {followWhatsApp(L)}
          </a>
          <Link href="/stores?view=models"
            className="lb-gold flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-center text-[14px] font-black leading-tight active:scale-95 transition">
            {/* Der Pfeil haengt mit geschuetztem Leerzeichen am letzten Wort — sonst rutscht
                er allein in die zweite Zeile (Owner 28.07.2026). */}
            <Users className="h-4 w-4 shrink-0" /> <span className="text-balance">{c.models.replace(/\s*→\s*$/, "\u00A0→")}</span>
          </Link>
          <Link href="/wardrobe"
            className="flex h-11 items-center justify-center gap-2 rounded-full border border-white/20 px-5 text-[14px] font-black text-white/85 active:scale-95 transition">
            <Shirt className="h-4 w-4" /> {c.wardrobe}
          </Link>
        </div>

        {/* Karten EXAKT im Stil der Models-Galerie: Bild oben (Badge + Pille), Text darunter, kein Rahmen. */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {THEMES_L.map((t) => {
            const Icon = t.icon;
            const active = !!t.href;
            const inner = (
              <>
                <div className="relative aspect-[3/4] overflow-hidden lb-media-bg">
                  {/* Cover: Werbevideo (aktiv) → Foto → Icon-Wasserzeichen (coming soon, kein Bild) */}
                  {t.video ? (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video src={t.video} poster={t.poster || t.cover || undefined}
                      autoPlay muted loop playsInline preload="metadata"
                      className="h-full w-full object-cover object-top" />
                  ) : t.cover ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {t.cover2 && <img src={t.cover2} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={t.cover} alt="" className={"absolute inset-0 h-full w-full object-cover object-top " + (active ? "" : "brightness-[0.8] ") + (t.cover2 ? "lb-swap-top" : "")} />
                    </>
                  ) : (
                    <div className="absolute inset-0 grid place-items-center"><Icon className="h-16 w-16 text-white/10" strokeWidth={1.25} /></div>
                  )}
                  {/* Badge oben rechts — wie der GS-Badge der Models */}
                  {active
                    ? <span className="lb-gold absolute right-2 top-2 z-10 rounded-full px-2 py-0.5 text-[10px] font-black shadow">LIVE</span>
                    : <span className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-black text-white/80 backdrop-blur"><Lock className="h-2.5 w-2.5" /> Soon</span>}
                  {/* Pille unten links — wie „N looks" */}
                  {active && <span className="absolute left-2 bottom-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-black text-white backdrop-blur">Daily</span>}
                </div>
                <div className="px-2.5 py-2">
                  <p className="truncate text-[13px] font-black text-white">{t.title}</p>
                  <p className="truncate text-[11px] font-bold text-white/80">{t.tagline}</p>
                  <p className="mt-0.5 truncate text-[9px] font-black uppercase tracking-wide text-[#f6cf51]/70">
                    {active ? (t.chips || "♥ Weather · New look · Chat") : "Coming soon"}
                  </p>
                </div>
              </>
            );
            const cls = "flex flex-col overflow-hidden rounded-2xl bg-white/[0.04] active:opacity-80 transition-opacity";
            return active
              ? <Link key={t.title} href={withCode(t.href!)} className={cls}>{inner}</Link>
              : <div key={t.title} className={`${cls} opacity-90`}>{inner}</div>;
          })}
        </div>

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
              {c.whatP} <Link href="/ai-notice" className="font-black text-[#f6cf51] underline underline-offset-2">AI Notice</Link>.
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
              {c.costP} <Link href="/unsubscribe" className="font-black text-[#f6cf51] underline underline-offset-2">Unsubscribe</Link>.
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

        <p className="mt-8 text-[12px] font-semibold text-white/40">
          Want your own topic as an influencer? <Link href="/curators/apply" className="font-black text-[#f6cf51] underline underline-offset-2">Become a model →</Link>
        </p>
      </div>
    </main>
  );
}
