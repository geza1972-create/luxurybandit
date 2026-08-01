import Link from "next/link";
import { fillPrices } from "@/lib/pricing";
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
  title: "AI marketplace — AI model videos, try-on, wedding invitations & chat | LuxuryBandit",
  description: fillPrices("One place for AI influencers: chat with an AI model, try on any look in a video, make a kiss or deepfake video with your own photo, get a birthday video with a name. {price}/month incl. {videos} videos across all topics; chatting is free.", "en"),
  keywords: ["ai influencer", "ai influencer generator", "ai model generator", "ai model girl", "ai video generator", "ai video maker", "deepfake video generator", "face swap video ai", "kiss video ai generator", "try on ai clothes", "virtual try on ai", "lingerie try on ai", "birthday video maker", "chat with ai model"],
  alternates: { canonical: "/themes" },
  openGraph: {
    title: "LuxuryBandit — AI influencers, your videos & chat",
    description: "Chat with her, see any look on her in a video, and put yourself in the picture.",
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
  ro: { kicker: "LuxuryBandit", h1a: "Alege o temă.", h1b: "Fă-ți videoclipul.", intro: "Fotografia ta, influencerița ta, videoclipul tău — plus un chat cu ea. Noutățile vin din când în când, nu zilnic.",
    codeNote: "Codul tău {CODE} este activ: alege orice temă de mai jos — chatul este gratuit, iar plătești permanent doar {price} în loc de {list}.",
    models: "Vezi modelele noastre și vorbește cu ele →", wardrobe: "Garderobă",
    whatH: "Ce este LuxuryBandit?", whatP: "LuxuryBandit este o piață AI pentru videoclipuri în care apari tu însuți. Încarci o poză, alegi o temă — sărut, invitație de nuntă, vacanță, zi de naștere — și primești un videoclip cu tine în el. Direct în browser, fără aplicație. Modelele AI sunt distribuția: le alegi așa cum alegi pe cineva pentru un rol. Fiecare chat este purtat de o persona AI, iar noi o spunem pe fiecare ecran.",
    uniqueH: "De ce arată mai bine aici", uniqueP: "Folosim modelele video care păstrează chipul și mișcarea. Cele ieftine le pierd pe amândouă — și atunci nu mai e chipul tău. Exact asta contează când ești tu în imagine: dacă fața nu e bună, videoclipul nu valorează nimic.",
    canH: "Ce poți face?", costH: "Cât costă?", costP: "Prima imagine e gratuită, la fiecare temă. Un videoclip costă {once} separat, sau iei abonamentul: {price} pe lună cu {videos} videoclipuri în toate temele, fiecare în plus {extra}. Invitația de nuntă și vremea de dimineață merg doar cu abonament — acolo ținem pagina și mesajele în funcțiune cât aveți nevoie. Anulezi oricând.",
    noteH: "Bine de știut", noteP: "LuxuryBandit este doar pentru adulți — confirmi că ai peste 18 ani înainte de chat. Persona AI flirtează și te întreabă cum a fost ziua ta, dar nu pretinde niciodată sentimente și nu se dă drept persoană reală. Pentru videoclipuri cu fotografii proprii ești întrebat explicit înainte și confirmi că ai dreptul să folosești fotografia — răspunderea este a ta, iar rezultatul rămâne privat.",
    items: [["Sărută orice model","poza ta și a ei — un videoclip cu voi doi."],["Invitația voastră de nuntă","voi doi în videoclip, plus o pagină de invitație cu confirmări, noutăți și grup."],["Vacanță cu fata visurilor tale","tu alegi momentul: plajă, cafea, dans."],["Surprinde-l","poza ta, un videoclip privat pe care doar el îl poate deschide."],["Idolul tău cu tine","voi doi împreună la o petrecere."],["Videoclip de zi de naștere","scrii un nume — ea îl spune cu voce tare."],["Probează ținute","alegi ținuta și modelul, ea o poartă în videoclip."],["Vremea de dimineață","vremea ta, un look nou și un chat — cu abonament."]] },
  de: { kicker: "LuxuryBandit", h1a: "Wähle ein Thema.", h1b: "Mach dein Video.", intro: "Dein Foto, deine Influencerin, dein Video — dazu ein Chat mit ihr. Neuigkeiten kommen ab und zu, nicht jeden Tag.",
    codeNote: "Dein Code {CODE} ist aktiv: Wähle unten ein Thema — Chatten ist gratis, und du zahlst dauerhaft nur {price} statt {list}.",
    models: "Unsere Models ansehen & mit ihnen chatten →", wardrobe: "Garderobe",
    whatH: "Was ist LuxuryBandit?", whatP: "LuxuryBandit ist ein KI-Marktplatz für Videos, in denen du selbst vorkommst. Du lädst ein Foto hoch, wählst ein Thema — Kuss, Hochzeitseinladung, Urlaub, Geburtstag — und bekommst ein Video mit dir darin. Direkt im Browser, ohne App. Die KI-Models sind die Besetzung: Du wählst sie aus, wie man jemanden für eine Rolle wählt. Jeden Chat führt eine KI-Persona, und wir schreiben das auf jeden Bildschirm.",
    uniqueH: "Warum es hier besser aussieht", uniqueP: "Wir setzen die Video-Modelle ein, die Gesicht und Bewegung halten. Billigere verlieren beides — und dann ist es nicht mehr dein Gesicht. Genau darauf kommt es an, wenn du selbst im Bild bist: Stimmt das Gesicht nicht, ist das ganze Video wertlos.",
    canH: "Was kannst du damit machen?", costH: "Was kostet es?", costP: "Das erste Bild ist gratis, in jedem Thema. Ein Video kostet {once} einzeln, oder du nimmst das Abo: {price} im Monat mit {videos} Videos über alle Themen zusammen, jedes weitere {extra}. Hochzeitseinladung und Morgenwetter laufen nur im Abo — dort halten wir eure Seite und die Nachrichten am Laufen, solange ihr sie braucht. Monatlich kündbar.",
    noteH: "Gut zu wissen", noteP: "LuxuryBandit ist nur für Erwachsene — du bestätigst vor dem Chat, dass du 18 oder älter bist. Die KI-Persona flirtet und fragt nach deinem Tag, behauptet aber nie Gefühle und gibt sich nie als echte Person aus. Für Videos mit eigenen Fotos wirst du vorher ausdrücklich gefragt und bestätigst, dass du das Foto verwenden darfst — die Verantwortung dafür trägst du, und das Ergebnis bleibt privat.",
    items: [["Küsse jedes Model","dein Foto und ihres — ein Video mit euch beiden."],["Eure Hochzeitseinladung","ihr beide im Video, dazu eine eigene Einladungsseite mit Zusagen, Neuigkeiten und Gästegruppe."],["Urlaub mit deiner Traumfrau","du wählst den Moment: Strand, Kaffee, Tanzen."],["Überrasche ihn","dein Foto, ein privates Video, das nur er öffnen kann."],["Dein Idol mit dir","ihr beide zusammen auf einer Party."],["Geburtstagsvideo","Namen eintippen — sie gratuliert laut, mit Namen."],["Anprobieren","Outfit und Model wählen, sie trägt es im Video, von allen Seiten."],["Morgenwetter","dein Wetter, ein neuer Look von ihr und ein Chat — im Abo."]] },
  en: { kicker: "LuxuryBandit", h1a: "Pick a topic.", h1b: "Make your video.", intro: "Your photo, your influencer, your video — plus a chat with her. News comes now and then, not every day.",
    codeNote: "Your code {CODE} is active: pick any topic below — chatting is free, and you pay just {price} instead of {list}, for as long as you stay.",
    models: "See our models & chat with them →", wardrobe: "Wardrobe",
    whatH: "What is LuxuryBandit?", whatP: "LuxuryBandit is an AI marketplace for videos with you in them. You upload a photo, pick a topic — kiss, wedding invitation, holiday, birthday — and get a video with yourself in it. In your browser, no app. The AI models are the cast: you choose them the way you choose someone for a role. Every chat is answered by an AI persona, and we say so on every screen.",
    uniqueH: "Why it looks better here", uniqueP: "We run the video models that hold the face and the motion. Cheaper ones lose both — and then it is not your face any more. That is the whole point when you are in the picture: if the face is wrong, the video is worthless.",
    canH: "What can you do with it?", costH: "How much does it cost?", costP: "The first picture is free, in every topic. One video is {once}, or take the subscription: {price} a month with {videos} videos across all topics, every further one {extra}. The wedding invitation and the morning weather run on the subscription only — there we keep your page and the messages running for as long as you need them. Cancel any time.",
    noteH: "Good to know", noteP: "LuxuryBandit is for adults only — you confirm you are 18 or older before you can chat. The AI persona flirts and asks about your day, but never claims feelings and never pretends to be a real person. For videos made from your own photos you are asked up front and confirm that you may use that photo — the responsibility is yours, and the result stays private.",
    items: [["Kiss somebody","your photo and theirs — one video with the two of you."],["Your wedding invitation","the two of you in the video, plus your own invitation page with RSVPs, news and a guest group."],["Holiday with your dream girl","you pick the moment: beach, coffee, dancing."],["Surprise him","your photo, a private video only he can open."],["Your idol with you","the two of you together at a party."],["Birthday video","type a name — she says it out loud."],["Try-on","pick an outfit and a model, she wears it in a video, from every angle."],["Morning weather","your weather, a new look of hers and a chat — on the subscription."]] },
  es: { kicker: "LuxuryBandit", h1a: "Elige un tema.", h1b: "Haz tu vídeo.", intro: "Tu foto, tu influencer, tu vídeo — y un chat con ella. Las novedades llegan de vez en cuando, no cada día.",
    codeNote: "Tu código {CODE} está activo: elige cualquier tema abajo — chatear es gratis y pagas siempre solo {price} en vez de {list}.",
    models: "Ver nuestras modelos y chatear con ellas →", wardrobe: "Armario",
    whatH: "¿Qué es LuxuryBandit?", whatP: "LuxuryBandit es un marketplace de IA para vídeos en los que sales tú. Subes una foto, eliges un tema — beso, invitación de boda, vacaciones, cumpleaños — y recibes un vídeo contigo dentro. En el navegador, sin app. Los modelos de IA son el reparto: los eliges como se elige a alguien para un papel. Cada chat lo lleva una persona IA, y lo decimos en cada pantalla.",
    uniqueH: "Por qué aquí se ve mejor", uniqueP: "Usamos los modelos de vídeo que mantienen la cara y el movimiento. Los baratos pierden ambos — y entonces ya no es tu cara. Eso es lo que importa cuando sales tú: si la cara falla, el vídeo no vale nada.",
    canH: "¿Qué puedes hacer?", costH: "¿Cuánto cuesta?", costP: "La primera imagen es gratis, en cada tema. Un vídeo cuesta {once} suelto, o coges la suscripción: {price} al mes con {videos} vídeos en todos los temas, cada uno más {extra}. La invitación de boda y el tiempo de la mañana solo van con suscripción — ahí mantenemos vuestra página y los mensajes el tiempo que haga falta. Cancela cuando quieras.",
    noteH: "Bueno saberlo", noteP: "LuxuryBandit es solo para adultos — confirmas que tienes 18 años o más antes de chatear. La persona de IA coquetea y pregunta por tu día, pero nunca dice tener sentimientos ni finge ser una persona real. Para los vídeos con fotos propias se te pregunta expresamente antes y confirmas que puedes usar esa foto — la responsabilidad es tuya y el resultado es privado.",
    items: [["Besa a cualquier modelo","tu foto y la suya — un vídeo con los dos."],["Vuestra invitación de boda","los dos en el vídeo, más una página de invitación con confirmaciones, novedades y grupo."],["Vacaciones con la chica de tus sueños","tú eliges el momento: playa, café, baile."],["Sorpréndele","tu foto, un vídeo privado que solo él puede abrir."],["Tu ídolo contigo","los dos juntos en una fiesta."],["Vídeo de cumpleaños","escribe un nombre — ella lo dice en voz alta."],["Probar looks","elige una prenda y una modelo, ella la lleva en un vídeo."],["El tiempo por la mañana","tu tiempo, un look nuevo y un chat — con suscripción."]] },
  fr: { kicker: "LuxuryBandit", h1a: "Choisis un thème.", h1b: "Fais ta vidéo.", intro: "Ta photo, ton influenceuse, ta vidéo — et un chat avec elle. Des nouvelles de temps en temps, pas tous les jours.",
    codeNote: "Ton code {CODE} est actif : choisis un thème ci-dessous — le chat est gratuit et tu paies toujours {price} au lieu de {list}.",
    models: "Voir nos modèles et discuter avec elles →", wardrobe: "Dressing",
    whatH: "Qu'est-ce que LuxuryBandit ?", whatP: "LuxuryBandit est une place de marché IA pour des vidéos où vous apparaissez. Vous envoyez une photo, choisissez un thème — baiser, invitation de mariage, vacances, anniversaire — et recevez une vidéo avec vous dedans. Dans le navigateur, sans appli. Les modèles IA sont la distribution : vous les choisissez comme on choisit quelqu’un pour un rôle. Chaque chat est mené par une persona IA, et nous l’écrivons sur chaque écran.",
    uniqueH: "Pourquoi c’est plus beau ici", uniqueP: "Nous utilisons les modèles vidéo qui gardent le visage et le mouvement. Les moins chers perdent les deux — et alors ce n’est plus votre visage. C’est tout l’enjeu quand c’est vous à l’image : si le visage est raté, la vidéo ne vaut rien.",
    canH: "Que peux-tu faire ?", costH: "Combien ça coûte ?", costP: "La première image est gratuite, dans chaque thème. Une vidéo coûte {once} à l’unité, ou prenez l’abonnement : {price} par mois avec {videos} vidéos sur tous les thèmes, chaque vidéo en plus {extra}. L’invitation de mariage et la météo du matin n’existent qu’en abonnement — nous y gardons votre page et les messages aussi longtemps qu’il le faut. Résiliable à tout moment.",
    noteH: "Bon à savoir", noteP: "LuxuryBandit est réservé aux adultes — tu confirmes avoir 18 ans ou plus avant de discuter. Le personnage IA flirte et demande comment s'est passée ta journée, mais ne prétend jamais avoir des sentiments ni être une vraie personne. Pour les vidéos réalisées avec tes propres photos, on te le demande explicitement avant et tu confirmes avoir le droit d'utiliser cette photo — la responsabilité est la tienne et le résultat reste privé.",
    items: [["Embrasse n’importe quel modèle","votre photo et la sienne — une vidéo avec vous deux."],["Votre invitation de mariage","vous deux dans la vidéo, plus une page d’invitation avec réponses, nouvelles et groupe."],["Vacances avec la fille de vos rêves","vous choisissez le moment : plage, café, danse."],["Surprenez-le","votre photo, une vidéo privée que lui seul peut ouvrir."],["Votre idole avec vous","vous deux à une fête."],["Vidéo d’anniversaire","tapez un prénom — elle le dit à voix haute."],["Essayage","choisissez une tenue et un mannequin, elle la porte en vidéo."],["Météo du matin","votre météo, un nouveau look et un chat — avec l’abonnement."]] },
  pt: { kicker: "LuxuryBandit", h1a: "Escolhe um tema.", h1b: "Faz o teu vídeo.", intro: "A tua foto, a tua influencer, o teu vídeo — e um chat com ela. Novidades de vez em quando, não todos os dias.",
    codeNote: "O teu código {CODE} está ativo: escolhe um tema abaixo — conversar é grátis e pagas sempre apenas {price} em vez de {list}.",
    models: "Ver as nossas modelos e conversar com elas →", wardrobe: "Guarda-roupa",
    whatH: "O que é o LuxuryBandit?", whatP: "LuxuryBandit é um marketplace de IA para vídeos em que apareces tu. Envias uma foto, escolhes um tema — beijo, convite de casamento, férias, aniversário — e recebes um vídeo contigo dentro. No browser, sem app. Os modelos de IA são o elenco: escolhe-los como se escolhe alguém para um papel. Cada chat é conduzido por uma persona de IA, e dizemo-lo em cada ecrã.",
    uniqueH: "Porque fica melhor aqui", uniqueP: "Usamos os modelos de vídeo que mantêm o rosto e o movimento. Os baratos perdem os dois — e então já não é a tua cara. É disso que se trata quando és tu na imagem: se o rosto falha, o vídeo não vale nada.",
    canH: "O que podes fazer?", costH: "Quanto custa?", costP: "A primeira imagem é grátis, em cada tema. Um vídeo custa {once} avulso, ou levas a subscrição: {price} por mês com {videos} vídeos em todos os temas, cada um a mais {extra}. O convite de casamento e o tempo da manhã só existem com subscrição — aí mantemos a vossa página e as mensagens enquanto precisarem. Cancelas quando quiseres.",
    noteH: "Bom saber", noteP: "O LuxuryBandit é apenas para adultos — confirmas que tens 18 anos ou mais antes de conversar. A persona de IA flirta e pergunta pelo teu dia, mas nunca afirma ter sentimentos nem finge ser uma pessoa real. Para vídeos com fotos tuas és perguntado antes e confirmas que podes usar essa foto — a responsabilidade é tua e o resultado fica privado.",
    items: [["Beija qualquer modelo","a tua foto e a dela — um vídeo com os dois."],["O vosso convite de casamento","os dois no vídeo, mais uma página de convite com confirmações, novidades e grupo."],["Férias com a rapariga dos teus sonhos","escolhes o momento: praia, café, dança."],["Surpreende-o","a tua foto, um vídeo privado que só ele abre."],["O teu ídolo contigo","os dois juntos numa festa."],["Vídeo de aniversário","escreves um nome — ela di-lo em voz alta."],["Provar looks","escolhes uma peça e uma modelo, ela usa-a num vídeo."],["Tempo de manhã","o teu tempo, um look novo e um chat — com subscrição."]] },
  pl: { kicker: "LuxuryBandit", h1a: "Wybierz temat.", h1b: "Zrób swój film.", intro: "Twoje zdjęcie, twoja influencerka, twój film — plus czat z nią. Nowości od czasu do czasu, nie codziennie.",
    codeNote: "Twój kod {CODE} jest aktywny: wybierz temat poniżej — czat jest darmowy, a płacisz zawsze tylko {price} zamiast {list}.",
    models: "Zobacz nasze modelki i porozmawiaj z nimi →", wardrobe: "Garderoba",
    whatH: "Czym jest LuxuryBandit?", whatP: "LuxuryBandit to platforma influencerek z influencerkami AI. Wybierasz modelkę, rozmawiasz z nią i tworzysz filmy z nią w dowolnej stylizacji — w przeglądarce, bez aplikacji. Każdy czat prowadzi persona AI i mówimy o tym na każdym ekranie.",
    uniqueH: "Jedyne takie na świecie", uniqueP: "Nie ma nic podobnego: w LuxuryBandit ta sama influencerka AI pisze do Ciebie z rana, nosi wybrane przez Ciebie stroje, rozmawia z Tobą i występuje w Twoich filmach. Świadomie korzystamy z najdroższych modeli wideo AI na rynku — tanie tracą twarz i ruch. Marketplace influencerek AI, a nie aplikacja z filtrami.",
    canH: "Co możesz robić?", costH: "Ile to kosztuje?", costP: "Czat jest darmowy. Abonament dotyczy zdjęć i filmów: {price} miesięcznie, w tym {videos} filmów we wszystkich tematach. Każdy kolejny film kosztuje {extra}. Bez abonamentu jeden film kosztuje {once}. Możesz zrezygnować w każdej chwili.",
    noteH: "Warto wiedzieć", noteP: "LuxuryBandit jest tylko dla dorosłych — przed czatem potwierdzasz, że masz 18 lat lub więcej. Persona AI flirtuje i pyta o Twój dzień, ale nigdy nie twierdzi, że ma uczucia, ani nie udaje prawdziwej osoby. W przypadku filmów z własnych zdjęć pytamy Cię wprost i potwierdzasz, że masz prawo użyć tego zdjęcia — odpowiedzialność jest Twoja, a wynik pozostaje prywatny.",
    items: [["Pogoda o poranku","każdego ranka pisze do Ciebie: Twoja pogoda, nowy look i czat."],["Przymierzanie stylizacji","wybierz look i modelkę — zobaczysz ją w nim na wideo, z każdej strony."],["Bielizna i luksusowe stylizacje","to samo, w jej najbardziej eleganckich i intymnych stylizacjach."],["Pocałuj modelkę","wyślij swoje zdjęcie i zobaczcie się oboje w pocałunku."],["Twój idol z Tobą","wybierz swojego idola i zobaczcie się razem na imprezie."],["Filmy urodzinowe","wpisz imię, a ona złoży życzenia na głos, po imieniu."],["Wakacje z Bellą","podróżuje dla Ciebie i codziennie przywozi filmy i historie."]] },
  it: { kicker: "LuxuryBandit", h1a: "Scegli un tema.", h1b: "Fai il tuo video.", intro: "La tua foto, la tua influencer, il tuo video — più una chat con lei. Le novità arrivano ogni tanto, non ogni giorno.",
    codeNote: "Il tuo codice {CODE} è attivo: scegli un tema qui sotto — la chat è gratis e paghi sempre solo {price} invece di {list}.",
    models: "Guarda le nostre modelle e chatta con loro →", wardrobe: "Guardaroba",
    whatH: "Che cos'è LuxuryBandit?", whatP: "LuxuryBandit è un marketplace AI per video in cui ci sei tu. Carichi una foto, scegli un tema — bacio, invito di nozze, vacanza, compleanno — e ricevi un video con te dentro. Nel browser, senza app. I modelli AI sono il cast: li scegli come si sceglie qualcuno per un ruolo. Ogni chat è tenuta da una persona AI, e lo scriviamo su ogni schermata.",
    uniqueH: "Perché qui viene meglio", uniqueP: "Usiamo i modelli video che tengono il volto e il movimento. Quelli economici perdono entrambi — e allora non è più il tuo volto. È tutto qui, quando in scena ci sei tu: se il volto non regge, il video non vale niente.",
    canH: "Cosa puoi fare?", costH: "Quanto costa?", costP: "La prima immagine è gratis, in ogni tema. Un video costa {once} singolo, oppure prendi l’abbonamento: {price} al mese con {videos} video su tutti i temi, ogni altro {extra}. L’invito di nozze e il meteo del mattino esistono solo in abbonamento — lì teniamo attiva la vostra pagina e i messaggi finché vi servono. Disdici quando vuoi.",
    noteH: "Da sapere", noteP: "LuxuryBandit è solo per adulti — confermi di avere 18 anni o più prima di chattare. La persona IA flirta e ti chiede della tua giornata, ma non dichiara mai sentimenti e non finge di essere una persona reale. Per i video con foto tue ti chiediamo prima esplicitamente e confermi di poter usare quella foto — la responsabilità è tua e il risultato resta privato.",
    items: [["Bacia qualsiasi modella","la tua foto e la sua — un video con voi due."],["Il vostro invito di nozze","voi due nel video, più una pagina d’invito con conferme, novità e gruppo."],["Vacanza con la ragazza dei tuoi sogni","scegli tu il momento: spiaggia, caffè, ballo."],["Sorprendilo","la tua foto, un video privato che solo lui può aprire."],["Il tuo idolo con te","voi due insieme a una festa."],["Video di compleanno","scrivi un nome — lei lo dice ad alta voce."],["Prova look","scegli un capo e una modella, lei lo indossa in un video."],["Meteo del mattino","il tuo meteo, un look nuovo e una chat — con l’abbonamento."]] },
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
  let weddingVideo = "";
  try {
    const wc = await readThemeConfig("wedding");
    const erstes = (wc.examplePaths ?? [])[0];
    if (erstes) weddingVideo = (await getSignedUrl(erstes).catch(() => "")) || "";
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
    // KISS GANZ VORN (Owner 30.07.2026: „kiss musst du als erstes nehmen"). Auf dieses Thema
    // laufen die Anzeigen, dort steckt der fertige Trichter mit Kasse — was oben steht,
    // entscheidet, was die Leute anfassen. Bella rueckt auf Platz zwei.
    { icon: Heart, title: "Kiss any Model", tagline: "Your photo + her — a tender kiss in one video.", href: "/themes/kiss", cover: kissCover || ph(8), video: kissVideo || undefined, chips: "♥ Pick her · Your photo · Kiss" },
    // HOCHZEIT gleich hinter Kiss (Owner 30.07.2026: „die Frauen lieben Hochzeiten").
    // Dieselbe Maschine wie Kiss, andere Rollen: SIE bedient den Trichter.
    { icon: Heart, title: "Wedding invitation video", tagline: "Your invitation as a video — the two of you at your wedding. Send it on WhatsApp.", href: "/themes/wedding", cover: ph(9), video: weddingVideo || undefined, chips: "♥ Your photo · His photo · Invitation" },
    // BELLA (Owner 29.07.2026): Sie ist das Gesicht des Portals, und der beste
    // Reel der Kontogeschichte („Go on holiday with Bella in Tenerife") bewirbt genau dieses
    // Versprechen. Er zeigte bisher auf /urlaub-mit-bella, eine Seite mit abgeschaltetem
    // Angebot — jetzt auf /themes/bella mit dem lebenden Trichter.
    { icon: Palmtree, title: "Tenerife with Bella", tagline: "Not her holiday — yours. Your photo, and she is in the video with you.", href: "/themes/bella", cover: bellaCover || wetterCover, video: bellaVideo || urlaubVideo || undefined, chips: "♥ Bella · Your photo · Video" },
    { icon: CloudSun, title: "Morning Weather", tagline: "Your weather, a new look & a chat — on the subscription.", href: "/themes/wetter/bella", cover: wetterCover, video: wetterVideo, poster: wetterPoster },
    // NEU (27.07.2026): nicht mehr „sie reist für dich", sondern ER macht die Videos selbst
    // — Foto hoch, Model wählen, einen von 25 Momenten antippen. Alte Bella-Reise lebt
    // weiter unter /urlaub-mit-bella (Landing + Card-Tool), ist aber nicht mehr verlinkt.
    // Chat = das Thema mit den niedrigsten Kosten pro Kunde (Haiku), deshalb weit vorn.
    { icon: MessageCircle, title: "Chat with an AI girl", tagline: "Talk to her whenever you want — and dress her in new looks.", href: "/themes/chat", cover: ph(3), chips: "♥ Chat · Looks · Free" },
    { icon: Palmtree, title: "Holiday with your dream girl", tagline: "You and her: pick the moment — beach, kiss, coffee, dancing.", href: "/themes/holiday", cover: ph(5), video: urlaubVideo || undefined, chips: "♥ Your photo · 25 moments · Video" },
    // Direkt in den Funnel: /themes/tryon wäre nur eine Zwischenseite mit noch einem Button.
    // Die Landing bleibt für die Admin-Werkzeuge erreichbar (Menü → „Try-On — manage").
    { icon: Shirt, title: "Try-On", tagline: "Pick a look, pick a model — watch her wear it in a video.", href: TRYON, cover: tryonDressed || ph(6), cover2: tryonLingerie || undefined, chips: "♥ Look · Model · Video" },
    { icon: Star, title: "Your Idol with you", tagline: "Pick your idol, add your photo — the two of you in one video.", href: "/your-idol", cover: ph(7), video: idolVideo || undefined, chips: "♥ Your idol · Your photo · Video" },
    { icon: Cake, title: "Birthdays", tagline: "She says happy birthday by name — send it to them.", href: "/themes/birthday", cover: ph(4), video: birthdayVideo || undefined, chips: "♥ Name · Video · Send" },
    { icon: Sparkles, title: "Luxury Looks", tagline: "A fresh luxury outfit every day — see it on her, in a video.", href: TRYON, cover: ph(0), video: luxuryVideo || undefined, chips: "♥ Look · Model · Video" },
    // Lingerie-Karte zeigt Bella in Lingerie und führt DIREKT in den Try-on-Funnel
    // (dort wählt er Look + Model) — kein „coming soon" mehr.
    { icon: Flame, title: "Lingerie Looks", tagline: "See her in lingerie — any look, in a video.", href: TRYON, cover: tryonLingerie || ph(1), video: lingerieVideo || undefined, chips: "♥ Lingerie · Model · Video" },
    // „City Secrets" ist zu „Surprise him" geworden (Owner, 27.07.2026): SIE lädt ihr
    // eigenes Foto hoch und schickt IHM ein privates Video — 3,99 € pro Video.
    { icon: Gift, title: "Surprise him", tagline: "Your photo → a private video only he can open.", href: "/themes/surprise", cover: ph(2), video: surpriseVideo || undefined, chips: "♥ Your photo · Private link · {extra}" },
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
            {fillPrices(c.codeNote.replace("{CODE}", code.toUpperCase()), L)}
          </p>
        )}

        {/* Startseite → zu den Models. Zwei Wege, weil beides gefragt ist: die ganze
            Galerie und der Chat-Einstieg. */}
        {/* Die drei Knoepfe (WhatsApp, Models, Garderobe) sind am 30.07.2026 raus (Owner:
            „die machst du raus, die drei buttons von der Homepage"). Sie standen ueber den
            Themen und haben von ihnen abgelenkt: Wer hier ankommt, soll ein Thema waehlen,
            nicht in den Katalog oder die Garderobe abbiegen. Beide sind ueber das Menue
            weiterhin erreichbar. */}


        {/* Karten EXAKT im Stil der Models-Galerie: Bild oben (Badge + Pille), Text darunter, kein Rahmen. */}
        {/* ZWEI KARTEN JE REIHE (Owner 30.07.2026: „bitte nur 2 Boxen in einer reihe").
            Bei drei Spalten schrumpfen Bild und Titel auf dem Handy so weit, dass man
            beides kaum noch liest — der Titel brach nach zwei Woertern ab. */}
        <div className="mt-6 grid grid-cols-2 gap-3">
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
                  {/* Hier stand „Daily" (Owner 31.07.2026: „der User bekommt es nicht mehr
                      jeden Tag, ich versende auch keine Wetternews mehr jeden Tag"). Ein
                      Abzeichen, das ein Versprechen gibt, das wir nicht halten, kostet beim
                      zweiten Besuch mehr, als es beim ersten bringt. */}
                </div>
                <div className="px-2.5 py-2">
                  <p className="truncate text-[13px] font-black text-white">{t.title}</p>
                  <p className="truncate text-[11px] font-bold text-white/80">{t.tagline}</p>
                  <p className="mt-0.5 truncate text-[9px] font-black uppercase tracking-wide text-[#f6cf51]/70">
                    {active ? fillPrices(t.chips || "♥ Weather · New look · Chat", L) : "Coming soon"}
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

        <p className="mt-8 text-[12px] font-semibold text-white/40">
          Want your own topic as an influencer? <Link href="/curators/apply" className="font-black text-[#f6cf51] underline underline-offset-2">Become a model →</Link>
        </p>
      </div>
    </main>
  );
}
