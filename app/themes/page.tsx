import Link from "next/link";
import { fillPrices, ONCE_CENTS, POLEDANCE_CENTS, TOPIC_EFFECTIVE_MONTHLY_CENTS, HOCHZEIT_STUFEN, CHAT_STUFEN, eur } from "@/lib/pricing";
import { POLEDANCE_VIDEO, POLEDANCE_POSTER } from "@/lib/poledance";
import { Kicker, H1, Y, SectionTitle, Lead } from "@/components/Landing";
import TopNav from "@/components/TopNav";
import SchleifenVideo from "@/components/SchleifenVideo";
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

type Theme = { icon: LucideIcon; title: string; tagline: string; href?: string; cover?: string; video?: string; poster?: string; chips?: string; cover2?: string;
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
  kicker: string; h1a: string; h1b: string; intro: string;
  models: string; wardrobe: string;
  whatH: string; whatP: string; uniqueH: string; uniqueP: string; canH: string; costH: string; costP: string; noteH: string; noteP: string;
  items: [string, string][];
};
const C: Record<string, PageCopy> = {
  ro: { kicker: "LuxuryBandit", h1a: "Alege un cadou.", h1b: "Trimite-l azi.", intro: "Poza ta și a lui — un sărut, o urare de ziua lui, o surpriză, o invitație de nuntă. Gata în câteva minute, trimis unei singure persoane. Nimeni altcineva nu îl vede.",
    models: "Vezi modelele noastre și vorbește cu ele →", wardrobe: "Garderobă",
    whatH: "Ce este LuxuryBandit?", whatP: "LuxuryBandit este o piață AI pentru videoclipuri în care apari tu însuți. Încarci o poză, alegi o temă — sărut, invitație de nuntă, vacanță, zi de naștere — și primești un videoclip cu tine în el. Direct în browser, fără aplicație. Modelele AI sunt distribuția: le alegi așa cum alegi pe cineva pentru un rol. Fiecare chat este purtat de o persona AI, iar noi o spunem pe fiecare ecran.",
    uniqueH: "De ce arată mai bine aici", uniqueP: "Folosim modelele video care păstrează chipul și mișcarea. Cele ieftine le pierd pe amândouă — și atunci nu mai e chipul tău. Exact asta contează când ești tu în imagine: dacă fața nu e bună, videoclipul nu valorează nimic.",
    canH: "Ce poți face?", costH: "Cât costă?", costP: "La sărut și la invitația de nuntă nu există imagine gratuită: se plătește din creditul tău — un videoclip {once}, cea mai mică încărcare {topup}, iar restul îți rămâne. La celelalte teme prima imagine e gratuită. Pentru cine face des, există abonamentul: {price} pe lună cu {videos} videoclipuri în toate temele, fiecare în plus {extra}. Anulezi oricând.",
    noteH: "Bine de știut", noteP: "LuxuryBandit este doar pentru adulți — confirmi că ai peste 18 ani înainte de chat. Persona AI flirtează și te întreabă cum a fost ziua ta, dar nu pretinde niciodată sentimente și nu se dă drept persoană reală. Pentru videoclipuri cu fotografii proprii ești întrebat explicit înainte și confirmi că ai dreptul să folosești fotografia — răspunderea este a ta, iar rezultatul rămâne privat.",
    items: [["Trimite un sărut persoanei pe care o iubești","poza ta și a ei — un videoclip cu voi doi, doar pentru ea."],["Invitația voastră de nuntă","voi doi în videoclip, plus o pagină de invitație cu confirmări, noutăți și grup."],["Chat cu o fată AI","vorbești cu ea când vrei — și o îmbraci în ținute noi."],["Vacanță cu fata visurilor tale","tu alegi momentul: plajă, cafea, dans."],["Videoclip de zi de naștere","scrii un nume — ea îl spune cu voce tare."],["Surprinde-l","o poză cu tine — și dansezi la bară într-un videoclip doar pentru el."]] },
  de: { kicker: "LuxuryBandit", h1a: "Wähl ein Geschenk.", h1b: "Verschick es heute.", intro: "Dein Foto und ihres — ein Kuss, ein Geburtstagsgruß, eine Überraschung, eine Hochzeitseinladung. In Minuten gemacht, an einen Menschen geschickt. Niemand sonst sieht es.",
    models: "Unsere Models ansehen & mit ihnen chatten →", wardrobe: "Garderobe",
    whatH: "Was ist LuxuryBandit?", whatP: "LuxuryBandit ist ein KI-Marktplatz für Videos, in denen du selbst vorkommst. Du lädst ein Foto hoch, wählst ein Thema — Kuss, Hochzeitseinladung, Urlaub, Geburtstag — und bekommst ein Video mit dir darin. Direkt im Browser, ohne App. Die KI-Models sind die Besetzung: Du wählst sie aus, wie man jemanden für eine Rolle wählt. Jeden Chat führt eine KI-Persona, und wir schreiben das auf jeden Bildschirm.",
    uniqueH: "Warum es hier besser aussieht", uniqueP: "Wir setzen die Video-Modelle ein, die Gesicht und Bewegung halten. Billigere verlieren beides — und dann ist es nicht mehr dein Gesicht. Genau darauf kommt es an, wenn du selbst im Bild bist: Stimmt das Gesicht nicht, ist das ganze Video wertlos.",
    canH: "Was kannst du damit machen?", costH: "Was kostet es?", costP: "Beim Kuss und bei der Hochzeitseinladung gibt es kein Gratis-Bild: Bezahlt wird aus deinem Guthaben — ein Video {once}, die kleinste Aufladung {topup}, der Rest bleibt dir. In den anderen Themen ist das erste Bild gratis. Wer regelmäßig etwas macht, nimmt das Abo: {price} im Monat mit {videos} Videos über alle Themen zusammen, jedes weitere {extra}. Monatlich kündbar.",
    noteH: "Gut zu wissen", noteP: "LuxuryBandit ist nur für Erwachsene — du bestätigst vor dem Chat, dass du 18 oder älter bist. Die KI-Persona flirtet und fragt nach deinem Tag, behauptet aber nie Gefühle und gibt sich nie als echte Person aus. Für Videos mit eigenen Fotos wirst du vorher ausdrücklich gefragt und bestätigst, dass du das Foto verwenden darfst — die Verantwortung dafür trägst du, und das Ergebnis bleibt privat.",
    items: [["Schick einen Kuss an den Menschen, den du liebst","dein Foto und ihres — ein Video mit euch beiden, nur für sie."],["Eure Hochzeitseinladung","ihr beide im Video, dazu eine eigene Einladungsseite mit Zusagen, Neuigkeiten und Gästegruppe."],["Chat mit einer KI-Frau","rede mit ihr, wann du willst — und zieh ihr neue Looks an."],["Urlaub mit deiner Traumfrau","du wählst den Moment: Strand, Kaffee, Tanzen."],["Geburtstagsvideo","Namen eintippen — sie gratuliert laut, mit Namen."],["Überrasch ihn","ein Foto von dir — und du tanzt an der Stange, in einem Video nur für ihn."]] },
  en: { kicker: "LuxuryBandit", h1a: "Pick a gift.", h1b: "Send it today.", intro: "Your photo and theirs — a kiss, a birthday, a surprise, a wedding invitation. Made in minutes, sent to one person. Nobody else sees it.",
    models: "See our models & chat with them →", wardrobe: "Wardrobe",
    whatH: "What is LuxuryBandit?", whatP: "LuxuryBandit is an AI marketplace for videos with you in them. You upload a photo, pick a topic — kiss, wedding invitation, holiday, birthday — and get a video with yourself in it. In your browser, no app. The AI models are the cast: you choose them the way you choose someone for a role. Every chat is answered by an AI persona, and we say so on every screen.",
    uniqueH: "Why it looks better here", uniqueP: "We run the video models that hold the face and the motion. Cheaper ones lose both — and then it is not your face any more. That is the whole point when you are in the picture: if the face is wrong, the video is worthless.",
    canH: "What can you do with it?", costH: "How much does it cost?", costP: "The kiss and the wedding invitation have no free picture: you pay from your account balance — one video is {once}, the smallest top-up is {topup}, and whatever is left stays yours. In the other topics the first picture is free. If you make things regularly, take the subscription: {price} a month with {videos} videos across all topics, every further one {extra}. Cancel any time.",
    noteH: "Good to know", noteP: "LuxuryBandit is for adults only — you confirm you are 18 or older before you can chat. The AI persona flirts and asks about your day, but never claims feelings and never pretends to be a real person. For videos made from your own photos you are asked up front and confirm that you may use that photo — the responsibility is yours, and the result stays private.",
    items: [["Send a kiss to the one you love","your photo and theirs — one video with the two of you, for them alone."],["Your wedding invitation","the two of you in the video, plus your own invitation page with RSVPs, news and a guest group."],["Chat with an AI girl","talk to her whenever you want — and dress her in new looks."],["Holiday with your dream girl","you pick the moment: beach, coffee, dancing."],["Birthday video","type a name — she says it out loud."],["Surprise him","one photo of you — and you dance on the pole, in a video for him alone."]] },
  es: { kicker: "LuxuryBandit", h1a: "Elige un regalo.", h1b: "Envíalo hoy.", intro: "Tu foto y la suya — un beso, una felicitación de cumpleaños, una sorpresa, una invitación de boda. Listo en minutos, enviado a una sola persona. Nadie más lo ve.",
    models: "Ver nuestras modelos y chatear con ellas →", wardrobe: "Armario",
    whatH: "¿Qué es LuxuryBandit?", whatP: "LuxuryBandit es un marketplace de IA para vídeos en los que sales tú. Subes una foto, eliges un tema — beso, invitación de boda, vacaciones, cumpleaños — y recibes un vídeo contigo dentro. En el navegador, sin app. Los modelos de IA son el reparto: los eliges como se elige a alguien para un papel. Cada chat lo lleva una persona IA, y lo decimos en cada pantalla.",
    uniqueH: "Por qué aquí se ve mejor", uniqueP: "Usamos los modelos de vídeo que mantienen la cara y el movimiento. Los baratos pierden ambos — y entonces ya no es tu cara. Eso es lo que importa cuando sales tú: si la cara falla, el vídeo no vale nada.",
    canH: "¿Qué puedes hacer?", costH: "¿Cuánto cuesta?", costP: "En el beso y en la invitación de boda no hay imagen gratis: se paga con tu saldo — un vídeo {once}, la recarga mínima {topup}, y lo que sobra se queda para ti. En los demás temas la primera imagen es gratis. Si haces cosas a menudo, coge la suscripción: {price} al mes con {videos} vídeos en todos los temas, cada uno más {extra}. Cancela cuando quieras.",
    noteH: "Bueno saberlo", noteP: "LuxuryBandit es solo para adultos — confirmas que tienes 18 años o más antes de chatear. La persona de IA coquetea y pregunta por tu día, pero nunca dice tener sentimientos ni finge ser una persona real. Para los vídeos con fotos propias se te pregunta expresamente antes y confirmas que puedes usar esa foto — la responsabilidad es tuya y el resultado es privado.",
    items: [["Envía un beso a quien tú quieres","tu foto y la suya — un vídeo con los dos, solo para esa persona."],["Vuestra invitación de boda","los dos en el vídeo, más vuestra página de invitación con confirmaciones, novedades y grupo."],["Chatea con una chica IA","habla con ella cuando quieras — y vístela con looks nuevos."],["Vacaciones con la chica de tus sueños","tú eliges el momento: playa, café, baile."],["Vídeo de cumpleaños","escribe un nombre — ella lo dice en voz alta."],["Sorpréndelo","una foto tuya — y bailas en la barra, en un vídeo solo para él."]] },
  fr: { kicker: "LuxuryBandit", h1a: "Choisis un cadeau.", h1b: "Envoie-le aujourd'hui.", intro: "Ta photo et la sienne — un baiser, un vœu d'anniversaire, une surprise, une invitation de mariage. Prêt en quelques minutes, envoyé à une seule personne. Personne d'autre ne le voit.",
    models: "Voir nos modèles et discuter avec elles →", wardrobe: "Dressing",
    whatH: "Qu'est-ce que LuxuryBandit ?", whatP: "LuxuryBandit est une place de marché IA pour des vidéos où vous apparaissez. Vous envoyez une photo, choisissez un thème — baiser, invitation de mariage, vacances, anniversaire — et recevez une vidéo avec vous dedans. Dans le navigateur, sans appli. Les modèles IA sont la distribution : vous les choisissez comme on choisit quelqu’un pour un rôle. Chaque chat est mené par une persona IA, et nous l’écrivons sur chaque écran.",
    uniqueH: "Pourquoi c’est plus beau ici", uniqueP: "Nous utilisons les modèles vidéo qui gardent le visage et le mouvement. Les moins chers perdent les deux — et alors ce n’est plus votre visage. C’est tout l’enjeu quand c’est vous à l’image : si le visage est raté, la vidéo ne vaut rien.",
    canH: "Que peux-tu faire ?", costH: "Combien ça coûte ?", costP: "Pour le baiser et l’invitation de mariage, il n’y a pas d’image gratuite : le paiement se fait sur ton crédit — une vidéo {once}, la recharge minimale {topup}, et le reste te reste. Dans les autres thèmes, la première image est gratuite. Si tu en fais régulièrement, prends l’abonnement : {price} par mois avec {videos} vidéos sur tous les thèmes, chaque vidéo en plus {extra}. Résiliable à tout moment.",
    noteH: "Bon à savoir", noteP: "LuxuryBandit est réservé aux adultes — tu confirmes avoir 18 ans ou plus avant de discuter. Le personnage IA flirte et demande comment s'est passée ta journée, mais ne prétend jamais avoir des sentiments ni être une vraie personne. Pour les vidéos réalisées avec tes propres photos, on te le demande explicitement avant et tu confirmes avoir le droit d'utiliser cette photo — la responsabilité est la tienne et le résultat reste privé.",
    items: [["Envoie un baiser à la personne que tu aimes","ta photo et la sienne — une vidéo avec vous deux, rien que pour elle."],["Votre invitation de mariage","vous deux dans la vidéo, plus votre page d'invitation avec réponses, nouvelles et groupe."],["Chatte avec une fille IA","parle-lui quand tu veux — et habille-la de nouveaux looks."],["Vacances avec la fille de tes rêves","tu choisis le moment : plage, café, danse."],["Vidéo d'anniversaire","tape un prénom — elle le dit à voix haute."],["Surprends-le","une photo de toi — et tu danses à la barre, dans une vidéo rien que pour lui."]] },
  pt: { kicker: "LuxuryBandit", h1a: "Escolhe um presente.", h1b: "Envia-o hoje.", intro: "A tua foto e a dela — um beijo, uma mensagem de aniversário, uma surpresa, um convite de casamento. Pronto em minutos, enviado a uma só pessoa. Mais ninguém o vê.",
    models: "Ver as nossas modelos e conversar com elas →", wardrobe: "Guarda-roupa",
    whatH: "O que é o LuxuryBandit?", whatP: "LuxuryBandit é um marketplace de IA para vídeos em que apareces tu. Envias uma foto, escolhes um tema — beijo, convite de casamento, férias, aniversário — e recebes um vídeo contigo dentro. No browser, sem app. Os modelos de IA são o elenco: escolhe-los como se escolhe alguém para um papel. Cada chat é conduzido por uma persona de IA, e dizemo-lo em cada ecrã.",
    uniqueH: "Porque fica melhor aqui", uniqueP: "Usamos os modelos de vídeo que mantêm o rosto e o movimento. Os baratos perdem os dois — e então já não é a tua cara. É disso que se trata quando és tu na imagem: se o rosto falha, o vídeo não vale nada.",
    canH: "O que podes fazer?", costH: "Quanto custa?", costP: "No beijo e no convite de casamento não há imagem grátis: paga-se com o teu saldo — um vídeo {once}, o carregamento mínimo {topup}, e o que sobra fica para ti. Nos outros temas a primeira imagem é grátis. Se fizeres coisas com frequência, leva a subscrição: {price} por mês com {videos} vídeos em todos os temas, cada um a mais {extra}. Cancelas quando quiseres.",
    noteH: "Bom saber", noteP: "O LuxuryBandit é apenas para adultos — confirmas que tens 18 anos ou mais antes de conversar. A persona de IA flirta e pergunta pelo teu dia, mas nunca afirma ter sentimentos nem finge ser uma pessoa real. Para vídeos com fotos tuas és perguntado antes e confirmas que podes usar essa foto — a responsabilidade é tua e o resultado fica privado.",
    items: [["Envia um beijo a quem tu amas","a tua foto e a dela — um vídeo com os dois, só para essa pessoa."],["O vosso convite de casamento","os dois no vídeo, mais a vossa página de convite com confirmações, novidades e grupo."],["Conversa com uma rapariga IA","fala com ela quando quiseres — e veste-a com novos looks."],["Férias com a rapariga dos teus sonhos","escolhes o momento: praia, café, dança."],["Vídeo de aniversário","escreves um nome — ela di-lo em voz alta."],["Surpreende-o","uma foto tua — e danças no varão, num vídeo só para ele."]] },
  pl: { kicker: "LuxuryBandit", h1a: "Wybierz prezent.", h1b: "Wyślij go dziś.", intro: "Twoje zdjęcie i jej — pocałunek, życzenia urodzinowe, niespodzianka, zaproszenie na ślub. Gotowe w kilka minut, wysłane do jednej osoby. Nikt inny tego nie widzi.",
    models: "Zobacz nasze modelki i porozmawiaj z nimi →", wardrobe: "Garderoba",
    whatH: "Czym jest LuxuryBandit?", whatP: "LuxuryBandit to platforma influencerek z influencerkami AI. Wybierasz modelkę, rozmawiasz z nią i tworzysz filmy z nią w dowolnej stylizacji — w przeglądarce, bez aplikacji. Każdy czat prowadzi persona AI i mówimy o tym na każdym ekranie.",
    uniqueH: "Jedyne takie na świecie", uniqueP: "Nie ma nic podobnego: w LuxuryBandit ta sama influencerka AI pisze do Ciebie z rana, nosi wybrane przez Ciebie stroje, rozmawia z Tobą i występuje w Twoich filmach. Świadomie korzystamy z najdroższych modeli wideo AI na rynku — tanie tracą twarz i ruch. Marketplace influencerek AI, a nie aplikacja z filtrami.",
    canH: "Co możesz robić?", costH: "Ile to kosztuje?", costP: "Czat jest darmowy. Abonament dotyczy zdjęć i filmów: {price} miesięcznie, w tym {videos} filmów we wszystkich tematach. Każdy kolejny film kosztuje {extra}. Bez abonamentu jeden film kosztuje {once}. Możesz zrezygnować w każdej chwili.",
    noteH: "Warto wiedzieć", noteP: "LuxuryBandit jest tylko dla dorosłych — przed czatem potwierdzasz, że masz 18 lat lub więcej. Persona AI flirtuje i pyta o Twój dzień, ale nigdy nie twierdzi, że ma uczucia, ani nie udaje prawdziwej osoby. W przypadku filmów z własnych zdjęć pytamy Cię wprost i potwierdzasz, że masz prawo użyć tego zdjęcia — odpowiedzialność jest Twoja, a wynik pozostaje prywatny.",
    items: [["Pogoda o poranku","każdego ranka pisze do Ciebie: Twoja pogoda, nowy look i czat."],["Przymierzanie stylizacji","wybierz look i modelkę — zobaczysz ją w nim na wideo, z każdej strony."],["Bielizna i luksusowe stylizacje","to samo, w jej najbardziej eleganckich i intymnych stylizacjach."],["Pocałuj modelkę","wyślij swoje zdjęcie i zobaczcie się oboje w pocałunku."],["Twój idol z Tobą","wybierz swojego idola i zobaczcie się razem na imprezie."],["Filmy urodzinowe","wpisz imię, a ona złoży życzenia na głos, po imieniu."],["Wakacje z Bellą","podróżuje dla Ciebie i codziennie przywozi filmy i historie."]] },
  it: { kicker: "LuxuryBandit", h1a: "Scegli un regalo.", h1b: "Mandalo oggi.", intro: "La tua foto e la sua — un bacio, un augurio di compleanno, una sorpresa, un invito di nozze. Pronto in pochi minuti, mandato a una sola persona. Nessun altro lo vede.",
    models: "Guarda le nostre modelle e chatta con loro →", wardrobe: "Guardaroba",
    whatH: "Che cos'è LuxuryBandit?", whatP: "LuxuryBandit è un marketplace AI per video in cui ci sei tu. Carichi una foto, scegli un tema — bacio, invito di nozze, vacanza, compleanno — e ricevi un video con te dentro. Nel browser, senza app. I modelli AI sono il cast: li scegli come si sceglie qualcuno per un ruolo. Ogni chat è tenuta da una persona AI, e lo scriviamo su ogni schermata.",
    uniqueH: "Perché qui viene meglio", uniqueP: "Usiamo i modelli video che tengono il volto e il movimento. Quelli economici perdono entrambi — e allora non è più il tuo volto. È tutto qui, quando in scena ci sei tu: se il volto non regge, il video non vale niente.",
    canH: "Cosa puoi fare?", costH: "Quanto costa?", costP: "Per il bacio e per l’invito di nozze non c’è un’immagine gratis: si paga con il tuo credito — un video {once}, la ricarica minima {topup}, e quel che avanza resta a te. Negli altri temi la prima immagine è gratis. Se fai cose spesso, prendi l’abbonamento: {price} al mese con {videos} video su tutti i temi, ogni altro {extra}. Disdici quando vuoi.",
    noteH: "Da sapere", noteP: "LuxuryBandit è solo per adulti — confermi di avere 18 anni o più prima di chattare. La persona IA flirta e ti chiede della tua giornata, ma non dichiara mai sentimenti e non finge di essere una persona reale. Per i video con foto tue ti chiediamo prima esplicitamente e confermi di poter usare quella foto — la responsabilità è tua e il risultato resta privato.",
    items: [["Manda un bacio a chi ami","la tua foto e la sua — un video con voi due, solo per lei."],["Il vostro invito di nozze","voi due nel video, più la vostra pagina d'invito con conferme, novità e gruppo."],["Chatta con una ragazza IA","parlale quando vuoi — e vestila con look nuovi."],["Vacanza con la ragazza dei tuoi sogni","scegli tu il momento: spiaggia, caffè, ballo."],["Video di compleanno","scrivi un nome — lei lo dice ad alta voce."],["Sorprendilo","una foto di te — e balli alla pole, in un video solo per lui."]] },
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

  const AB_EINZEL = `${P.ab} ${eur(ONCE_CENTS, L)}`;
  const AB_HOCHZEIT = `${P.ab} ${eur(HOCHZEIT_STUFEN[0].cents, L)}`;
  /* Urlaub und Chat haengen noch am Abo — hier steht, was sie WIRKLICH kosten, nicht was sie
     nach dem Umzug kosten werden. Ein zu frueher Geschenk-Preis waere eine Zusage, die der
     Trichter dahinter nicht einloest. */
  const AB_ABO = `${P.ab} ${eur(TOPIC_EFFECTIVE_MONTHLY_CENTS, L)}${P.pm}`;
  /* Hier stand „gratis · Look 2,99" — beides falsch seit dem 03.08.2026: Das Anziehen ist raus,
     und der Chat ist nur die ersten Nachrichten frei. Jetzt der ehrliche Einstieg aus CHAT_STUFEN. */
  const AB_CHAT = `${P.ab} ${eur(CHAT_STUFEN[0].cents, L)}`;
  /* Der Tanz kostet mehr als ein Kuss (Owner 03.08.2026: „es soll 3,99 kosten") — die Kachel
     muss denselben Preis nennen wie der Knopf dahinter, sonst ist der Katalog ein Koeder. */
  const AB_TANZ = `${P.ab} ${eur(POLEDANCE_CENTS, L)}`;

  const THEMES: Theme[] = [
    // KISS GANZ VORN (Owner 30.07.2026: „kiss musst du als erstes nehmen"). Auf dieses Thema
    // laufen die Anzeigen, dort steckt der fertige Trichter mit Kasse — was oben steht,
    // entscheidet, was die Leute anfassen. Bella rueckt auf Platz zwei.
    { icon: Heart, title: "Send a kiss to the one you love", tagline: "Your photo and theirs — one video with the two of you, for them alone.", href: "/themes/kiss", cover: kissCover || ph(8), video: kissVideo || undefined, chips: "♥ Pick her · Your photo · Kiss", abPreis: AB_EINZEL },
    // HOCHZEIT gleich hinter Kiss (Owner 30.07.2026: „die Frauen lieben Hochzeiten").
    // Dieselbe Maschine wie Kiss, andere Rollen: SIE bedient den Trichter.
    { icon: Heart, title: "Wedding invitation video", tagline: "Your invitation as a video — the two of you at your wedding. Send it on WhatsApp.", href: "/themes/wedding", cover: ph(9), video: weddingVideo || undefined, chips: "♥ Your photo · His photo · Invitation", abPreis: AB_HOCHZEIT },
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
    { icon: MessageCircle, title: "Chat with an AI girl", tagline: "Pick one of our women and write with her — she answers in your language.", href: "/themes/chat", cover: ph(3), chips: "♥ Chat · Looks · Free", abPreis: AB_CHAT },
    { icon: Palmtree, title: "Holiday with your dream girl", tagline: "You and her: pick the moment — beach, kiss, coffee, dancing.", href: "/themes/holiday", cover: ph(5), video: urlaubVideo || undefined, chips: "♥ Your photo · 25 moments · Video", abPreis: AB_ABO },
    // Direkt in den Funnel: /themes/tryon wäre nur eine Zwischenseite mit noch einem Button.
    // Die Landing bleibt für die Admin-Werkzeuge erreichbar (Menü → „Try-On — manage").
    { icon: Shirt, title: "Try-On", tagline: "Pick a look, pick a model — watch her wear it in a video.", href: TRYON, cover: tryonDressed || ph(6), cover2: tryonLingerie || undefined, chips: "♥ Look · Model · Video" },
    { icon: Star, title: "Your Idol with you", tagline: "Pick your idol, add your photo — the two of you in one video.", href: "/your-idol", cover: ph(7), video: idolVideo || undefined, chips: "♥ Your idol · Your photo · Video" },
    { icon: Cake, title: "Birthdays", tagline: "She says happy birthday by name — send it to them.", href: "/themes/birthday", cover: ph(4), video: birthdayVideo || undefined, chips: "♥ Name · Video · Send", abPreis: AB_EINZEL },
    { icon: Sparkles, title: "Luxury Looks", tagline: "A fresh luxury outfit every day — see it on her, in a video.", href: TRYON, cover: ph(0), video: luxuryVideo || undefined, chips: "♥ Look · Model · Video" },
    // Lingerie-Karte zeigt Bella in Lingerie und führt DIREKT in den Try-on-Funnel
    // (dort wählt er Look + Model) — kein „coming soon" mehr.
    { icon: Flame, title: "Lingerie Looks", tagline: "See her in lingerie — any look, in a video.", href: TRYON, cover: tryonLingerie || ph(1), video: lingerieVideo || undefined, chips: "♥ Lingerie · Model · Video" },
    /**
     * „SURPRISE HIM" IST JETZT DER TANZ (Owner 03.08.2026: „ersetze das Video jetzt in der
     * Topic und auf der Landingpage mit dem Video, das ich dir gegeben habe").
     *
     * Hier stand ein Video aus dem Storage (`surprise-example.mp4`, Gina in Rot) und ein
     * Allerwelts-Cover aus dem Bilderstapel (`ph(2)`). Beide bewarben ein Produkt, das es
     * hinter dieser Karte nicht mehr gibt.
     *
     * Das Video kommt jetzt AUS DEM REPO statt aus dem Storage: Es ist Teil des Produkts,
     * kein gepflegter Inhalt — und ein statischer Pfad laeuft nicht ab, waehrend eine
     * signierte Storage-URL das tut. Das Standbild daneben ist der erste Einzelbild des
     * Videos; ohne Cover zeigt die Kachel beim Laden einen schwarzen Kasten.
     */
    { icon: Gift, title: "Surprise him", tagline: "One photo of you → a hot pole dance video, for him alone.", href: "/themes/surprise", cover: POLEDANCE_POSTER, video: POLEDANCE_VIDEO, chips: "♥ Your photo · The outfit · Video", abPreis: AB_TANZ },
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
    "Morning Weather",
    "Try-On",
    "Your Idol with you",
    "Luxury Looks",
    "Lingerie Looks",
  ]);
  const SICHTBAR = THEMES.filter(t => !AUSGEBLENDET.has(t.title));

  // KARTENTEXTE übersetzen (Titel, Untertitel, Chips) — sie standen bisher nur englisch da,
  // während der Rest der Seite in acht Sprachen läuft. Ein Aufruf für alle Karten, danach
  // aus dem Dauer-Cache. Der Herz-/Trenner-Schmuck der Chips bleibt unangetastet.
  const flat: Record<string, string> = {};
  SICHTBAR.forEach((t, i) => {
    flat[`t${i}`] = t.title;
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

      <div className="mx-auto max-w-3xl px-4 pb-24 pt-6">
        <Kicker>{c.kicker}</Kicker>
        <H1>{c.h1a} <Y>{c.h1b}</Y></H1>
        <Lead className="max-w-xl">{c.intro}</Lead>

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
        <div className="mt-6 grid grid-cols-1 gap-3">
          {THEMES_L.map((t) => {
            const Icon = t.icon;
            const active = !!t.href;
            const inner = (
              <>
                <div className="relative w-[104px] shrink-0 aspect-[3/4] overflow-hidden lb-media-bg">
                  {/* Cover: Werbevideo (aktiv) → Foto → Icon-Wasserzeichen (coming soon, kein Bild) */}
                  {t.video ? (
                    /* KEIN `t.cover`-Rueckfall als Poster (02.08.2026, Owner: „kurz andere
                       Poster, irgendwelche Models"): `cover` ist bei mehreren Karten (Wedding,
                       Holiday, Idol, Birthdays, Luxury, Surprise) ein themenfremdes Platzhalter-
                       Modelfoto aus dem Bilderstapel (`ph()`), gedacht als Fallback-BILD, wenn es
                       KEIN Video gibt. Als Video-Poster blitzte genau dieses fremde Gesicht auf,
                       bis das echte Themenvideo geladen hatte. Nur ein Thema-eigenes `t.poster`
                       (z. B. Wetter) darf hier stehen; sonst lieber kein Poster als ein falsches. */
                    /* WEICHE SCHLEIFE (Owner 03.08.2026: „auch bei den Topics-Video die
                       gleiche Ueberblendung"). Sechs Kacheln mit `loop` heisst: sechs harte
                       Schnitte, jeder zu einem anderen Zeitpunkt — eine unruhige Wand. Der
                       Baustein blendet zwei Spieler ineinander, siehe SchleifenVideo. */
                    <SchleifenVideo src={t.video} poster={t.poster || undefined}
                      className="object-top" />
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
                <div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2.5">
                  {/* Kein `truncate` mehr am Titel: In der vollen Breite ist Platz, und
                      „Schick einen Kuss an den Menschen, den du liebst" ist der Satz, der
                      verkauft — abgeschnitten verkauft er nichts. */}
                  <p className="text-[14px] font-black leading-tight text-white">{t.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11.5px] font-semibold leading-snug text-white/75">{t.tagline}</p>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    {/* DER PREIS IST DIE WICHTIGSTE ZEILE der Kachel — er steht deshalb vorn
                        und in Gold, nicht als Fussnote hinter den Merkmalen. */}
                    {active && t.abPreis && (
                      <span className="shrink-0 text-[13px] font-black text-[#f6cf51]">{t.abPreis}</span>
                    )}
                    <span className="min-w-0 truncate text-[9px] font-black uppercase tracking-wide text-white/40">
                      {active ? fillPrices(t.chips || "♥ Weather · New look · Chat", L) : "Coming soon"}
                    </span>
                  </div>
                </div>
              </>
            );
            const cls = "flex items-stretch overflow-hidden rounded-2xl bg-white/[0.04] active:opacity-80 transition-opacity";
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
