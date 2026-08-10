import Link from "next/link";
import { fillPrices, themenPreisZeile } from "@/lib/pricing";
import { POLEDANCE_VIDEO, POLEDANCE_POSTER } from "@/lib/poledance";
import { GEBURTSTAG_VIDEO_TRAUM } from "@/lib/geburtstag";
import { Kicker, H1, Y, SectionTitle, Lead } from "@/components/Landing";
import { ThemenListe } from "@/components/CI";
import TopNav from "@/components/TopNav";
import SchleifenVideo from "@/components/SchleifenVideo";
import TrackView from "@/components/TrackView";
import SeitenFuss from "@/components/SeitenFuss";
import { CloudSun, Cake, Sparkles, Flame, MapPin, Lock, Palmtree, Shirt, Star, Heart, Users, Gift, MessageCircle, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { buildBellaCard, BELLA_ID } from "@/lib/bella-card";
/* Aus `lib`, nicht aus dem Baustein: PlanSlide ist ein Client-Modul, und von dort käme
   hier nur eine Client-Referenz an — die Kachel blieb dadurch ohne Bild. */
import { resolveLang } from "@/lib/lang-server";
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
  title: "LuxuryBandit — AI video gifts: kiss, wedding, birthday",
  description: fillPrices("Pick a gift and send it today: a kiss, a wedding invitation, a birthday video, a surprise. Upload your photo, choose an AI model, and get a video with you in it — in minutes, in your browser, for one person only.", "en"),
  keywords: ["ai video generator", "ai video maker", "kiss video ai generator", "wedding invitation video", "birthday video maker", "video gift", "ai influencer", "ai model generator", "ai model girl", "face swap video ai", "deepfake video generator", "chat with ai model"],
  alternates: { canonical: "/" },
  openGraph: {
    title: "LuxuryBandit — pick a gift, send it today",
    description: "Your photo and theirs — a kiss, a wedding invitation, a birthday. One video, made in minutes, for one person.",
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
  kicker: string; h1a: string; h1b: string;
  models: string; wardrobe: string;
  whatH: string; uniqueH: string; uniqueP: string; canH: string; costH: string; costP: string; noteH: string; noteP: string;
  items: [string, string][];
};
const C: Record<string, PageCopy> = {
  ro: { kicker: "LuxuryBandit", h1a: "Alege un cadou.", h1b: "Trimite-l azi.",
    models: "Vezi modelele noastre și vorbește cu ele →", wardrobe: "Garderobă",
    whatH: "Ce este LuxuryBandit?",
    uniqueH: "De ce arată mai bine aici", uniqueP: "Folosim modelele video care păstrează chipul și mișcarea. Cele ieftine le pierd pe amândouă — și atunci nu mai e chipul tău. Exact asta contează când ești tu în imagine: dacă fața nu e bună, videoclipul nu valorează nimic.",
    canH: "Ce poți face?", costH: "Cât costă?", costP: "La sărut și la invitația de nuntă nu există imagine gratuită: se plătește din creditul tău — un videoclip {once}, cea mai mică încărcare {topup}, iar restul îți rămâne. La celelalte teme prima imagine e gratuită. Pentru cine face des, există abonamentul: {price} pe lună cu {videos} videoclipuri în toate temele, fiecare în plus {extra}. Anulezi oricând.",
    noteH: "Bine de știut", noteP: "LuxuryBandit este doar pentru adulți — confirmi că ai peste 18 ani înainte de chat. Persona AI flirtează și te întreabă cum a fost ziua ta, dar nu pretinde niciodată sentimente și nu se dă drept persoană reală. Pentru videoclipuri cu fotografii proprii ești întrebat explicit înainte și confirmi că ai dreptul să folosești fotografia — răspunderea este a ta, iar rezultatul rămâne privat.",
    items: [["Trimite un sărut persoanei pe care o iubești","poza ta și a ei — un videoclip cu voi doi, doar pentru ea."],["Invitația voastră de nuntă","voi doi în videoclip, plus o pagină de invitație cu confirmări, noutăți și grup."],["Chat cu Bella","vorbești cu ea când vrei — și o îmbraci în ținute noi."],["Vacanță cu fata visurilor tale","tu alegi momentul: plajă, cafea, dans."],["Videoclip de zi de naștere","scrii un nume — ea îl spune cu voce tare."],["Surprinde-l","o poză cu tine — și dansezi la bară într-un videoclip doar pentru el."]] },
  de: { kicker: "LuxuryBandit", h1a: "Wähl ein Geschenk.", h1b: "Verschick es heute.",
    models: "Unsere Models ansehen & mit ihnen chatten →", wardrobe: "Garderobe",
    whatH: "Was ist LuxuryBandit?",
    uniqueH: "Warum es hier besser aussieht", uniqueP: "Wir setzen die Video-Modelle ein, die Gesicht und Bewegung halten. Billigere verlieren beides — und dann ist es nicht mehr dein Gesicht. Genau darauf kommt es an, wenn du selbst im Bild bist: Stimmt das Gesicht nicht, ist das ganze Video wertlos.",
    canH: "Was kannst du damit machen?", costH: "Was kostet es?", costP: "Beim Kuss und bei der Hochzeitseinladung gibt es kein Gratis-Bild: Bezahlt wird aus deinem Guthaben — ein Video {once}, die kleinste Aufladung {topup}, der Rest bleibt dir. In den anderen Themen ist das erste Bild gratis. Wer regelmäßig etwas macht, nimmt das Abo: {price} im Monat mit {videos} Videos über alle Themen zusammen, jedes weitere {extra}. Monatlich kündbar.",
    noteH: "Gut zu wissen", noteP: "LuxuryBandit ist nur für Erwachsene — du bestätigst vor dem Chat, dass du 18 oder älter bist. Die KI-Persona flirtet und fragt nach deinem Tag, behauptet aber nie Gefühle und gibt sich nie als echte Person aus. Für Videos mit eigenen Fotos wirst du vorher ausdrücklich gefragt und bestätigst, dass du das Foto verwenden darfst — die Verantwortung dafür trägst du, und das Ergebnis bleibt privat.",
    items: [["Schick einen Kuss an den Menschen, den du liebst","dein Foto und ihres — ein Video mit euch beiden, nur für sie."],["Eure Hochzeitseinladung","ihr beide im Video, dazu eine eigene Einladungsseite mit Zusagen, Neuigkeiten und Gästegruppe."],["Chat mit Bella","rede mit ihr, wann du willst — und zieh ihr neue Looks an."],["Urlaubs-Einladung","lad jemanden ein mitzukommen — ein Video von euch beiden, schon dort."],["Geburtstagsvideo","Namen eintippen — sie gratuliert laut, mit Namen."],["Überrasch ihn","ein Foto von dir — und du tanzt an der Stange, in einem Video nur für ihn."]] },
  en: { kicker: "LuxuryBandit", h1a: "Pick a gift.", h1b: "Send it today.",
    models: "See our models & chat with them →", wardrobe: "Wardrobe",
    whatH: "What is LuxuryBandit?",
    uniqueH: "Why it looks better here", uniqueP: "We run the video models that hold the face and the motion. Cheaper ones lose both — and then it is not your face any more. That is the whole point when you are in the picture: if the face is wrong, the video is worthless.",
    canH: "What can you do with it?", costH: "How much does it cost?", costP: "The kiss and the wedding invitation have no free picture: you pay from your account balance — one video is {once}, the smallest top-up is {topup}, and whatever is left stays yours. In the other topics the first picture is free. If you make things regularly, take the subscription: {price} a month with {videos} videos across all topics, every further one {extra}. Cancel any time.",
    noteH: "Good to know", noteP: "LuxuryBandit is for adults only — you confirm you are 18 or older before you can chat. The AI persona flirts and asks about your day, but never claims feelings and never pretends to be a real person. For videos made from your own photos you are asked up front and confirm that you may use that photo — the responsibility is yours, and the result stays private.",
    items: [["Send a kiss to the one you love","your photo and theirs — one video with the two of you, for them alone."],["Your wedding invitation","the two of you in the video, plus your own invitation page with RSVPs, news and a guest group."],["Chat with Bella","talk to her whenever you want — and dress her in new looks."],["Holiday invitation","ask someone to come away with you — a video of you both, already there."],["Birthday video","type a name — she says it out loud."],["Surprise him","one photo of you — and you dance on the pole, in a video for him alone."]] },
  es: { kicker: "LuxuryBandit", h1a: "Elige un regalo.", h1b: "Envíalo hoy.",
    models: "Ver nuestras modelos y chatear con ellas →", wardrobe: "Armario",
    whatH: "¿Qué es LuxuryBandit?",
    uniqueH: "Por qué aquí se ve mejor", uniqueP: "Usamos los modelos de vídeo que mantienen la cara y el movimiento. Los baratos pierden ambos — y entonces ya no es tu cara. Eso es lo que importa cuando sales tú: si la cara falla, el vídeo no vale nada.",
    canH: "¿Qué puedes hacer?", costH: "¿Cuánto cuesta?", costP: "En el beso y en la invitación de boda no hay imagen gratis: se paga con tu saldo — un vídeo {once}, la recarga mínima {topup}, y lo que sobra se queda para ti. En los demás temas la primera imagen es gratis. Si haces cosas a menudo, coge la suscripción: {price} al mes con {videos} vídeos en todos los temas, cada uno más {extra}. Cancela cuando quieras.",
    noteH: "Bueno saberlo", noteP: "LuxuryBandit es solo para adultos — confirmas que tienes 18 años o más antes de chatear. La persona de IA coquetea y pregunta por tu día, pero nunca dice tener sentimientos ni finge ser una persona real. Para los vídeos con fotos propias se te pregunta expresamente antes y confirmas que puedes usar esa foto — la responsabilidad es tuya y el resultado es privado.",
    items: [["Envía un beso a quien tú quieres","tu foto y la suya — un vídeo con los dos, solo para esa persona."],["Vuestra invitación de boda","los dos en el vídeo, más vuestra página de invitación con confirmaciones, novedades y grupo."],["Chatea con Bella","habla con ella cuando quieras — y vístela con looks nuevos."],["Vacaciones con la chica de tus sueños","tú eliges el momento: playa, café, baile."],["Vídeo de cumpleaños","escribe un nombre — ella lo dice en voz alta."],["Sorpréndelo","una foto tuya — y bailas en la barra, en un vídeo solo para él."]] },
  fr: { kicker: "LuxuryBandit", h1a: "Choisis un cadeau.", h1b: "Envoie-le aujourd'hui.",
    models: "Voir nos modèles et discuter avec elles →", wardrobe: "Dressing",
    whatH: "Qu'est-ce que LuxuryBandit ?",
    uniqueH: "Pourquoi c’est plus beau ici", uniqueP: "Nous utilisons les modèles vidéo qui gardent le visage et le mouvement. Les moins chers perdent les deux — et alors ce n’est plus votre visage. C’est tout l’enjeu quand c’est vous à l’image : si le visage est raté, la vidéo ne vaut rien.",
    canH: "Que peux-tu faire ?", costH: "Combien ça coûte ?", costP: "Pour le baiser et l’invitation de mariage, il n’y a pas d’image gratuite : le paiement se fait sur ton crédit — une vidéo {once}, la recharge minimale {topup}, et le reste te reste. Dans les autres thèmes, la première image est gratuite. Si tu en fais régulièrement, prends l’abonnement : {price} par mois avec {videos} vidéos sur tous les thèmes, chaque vidéo en plus {extra}. Résiliable à tout moment.",
    noteH: "Bon à savoir", noteP: "LuxuryBandit est réservé aux adultes — tu confirmes avoir 18 ans ou plus avant de discuter. Le personnage IA flirte et demande comment s'est passée ta journée, mais ne prétend jamais avoir des sentiments ni être une vraie personne. Pour les vidéos réalisées avec tes propres photos, on te le demande explicitement avant et tu confirmes avoir le droit d'utiliser cette photo — la responsabilité est la tienne et le résultat reste privé.",
    items: [["Envoie un baiser à la personne que tu aimes","ta photo et la sienne — une vidéo avec vous deux, rien que pour elle."],["Votre invitation de mariage","vous deux dans la vidéo, plus votre page d'invitation avec réponses, nouvelles et groupe."],["Chatte avec Bella","parle-lui quand tu veux — et habille-la de nouveaux looks."],["Vacances avec la fille de tes rêves","tu choisis le moment : plage, café, danse."],["Vidéo d'anniversaire","tape un prénom — elle le dit à voix haute."],["Surprends-le","une photo de toi — et tu danses à la barre, dans une vidéo rien que pour lui."]] },
  pt: { kicker: "LuxuryBandit", h1a: "Escolhe um presente.", h1b: "Envia-o hoje.",
    models: "Ver as nossas modelos e conversar com elas →", wardrobe: "Guarda-roupa",
    whatH: "O que é o LuxuryBandit?",
    uniqueH: "Porque fica melhor aqui", uniqueP: "Usamos os modelos de vídeo que mantêm o rosto e o movimento. Os baratos perdem os dois — e então já não é a tua cara. É disso que se trata quando és tu na imagem: se o rosto falha, o vídeo não vale nada.",
    canH: "O que podes fazer?", costH: "Quanto custa?", costP: "No beijo e no convite de casamento não há imagem grátis: paga-se com o teu saldo — um vídeo {once}, o carregamento mínimo {topup}, e o que sobra fica para ti. Nos outros temas a primeira imagem é grátis. Se fizeres coisas com frequência, leva a subscrição: {price} por mês com {videos} vídeos em todos os temas, cada um a mais {extra}. Cancelas quando quiseres.",
    noteH: "Bom saber", noteP: "O LuxuryBandit é apenas para adultos — confirmas que tens 18 anos ou mais antes de conversar. A persona de IA flirta e pergunta pelo teu dia, mas nunca afirma ter sentimentos nem finge ser uma pessoa real. Para vídeos com fotos tuas és perguntado antes e confirmas que podes usar essa foto — a responsabilidade é tua e o resultado fica privado.",
    items: [["Envia um beijo a quem tu amas","a tua foto e a dela — um vídeo com os dois, só para essa pessoa."],["O vosso convite de casamento","os dois no vídeo, mais a vossa página de convite com confirmações, novidades e grupo."],["Conversa com a Bella","fala com ela quando quiseres — e veste-a com novos looks."],["Férias com a rapariga dos teus sonhos","escolhes o momento: praia, café, dança."],["Vídeo de aniversário","escreves um nome — ela di-lo em voz alta."],["Surpreende-o","uma foto tua — e danças no varão, num vídeo só para ele."]] },
  pl: { kicker: "LuxuryBandit", h1a: "Wybierz prezent.", h1b: "Wyślij go dziś.",
    models: "Zobacz nasze modelki i porozmawiaj z nimi →", wardrobe: "Garderoba",
    whatH: "Czym jest LuxuryBandit?",
    uniqueH: "Jedyne takie na świecie", uniqueP: "Nie ma nic podobnego: w LuxuryBandit ta sama influencerka AI pisze do Ciebie z rana, nosi wybrane przez Ciebie stroje, rozmawia z Tobą i występuje w Twoich filmach. Świadomie korzystamy z najdroższych modeli wideo AI na rynku — tanie tracą twarz i ruch. Marketplace influencerek AI, a nie aplikacja z filtrami.",
    canH: "Co możesz robić?", costH: "Ile to kosztuje?", costP: "Czat jest darmowy. Abonament dotyczy zdjęć i filmów: {price} miesięcznie, w tym {videos} filmów we wszystkich tematach. Każdy kolejny film kosztuje {extra}. Bez abonamentu jeden film kosztuje {once}. Możesz zrezygnować w każdej chwili.",
    noteH: "Warto wiedzieć", noteP: "LuxuryBandit jest tylko dla dorosłych — przed czatem potwierdzasz, że masz 18 lat lub więcej. Persona AI flirtuje i pyta o Twój dzień, ale nigdy nie twierdzi, że ma uczucia, ani nie udaje prawdziwej osoby. W przypadku filmów z własnych zdjęć pytamy Cię wprost i potwierdzasz, że masz prawo użyć tego zdjęcia — odpowiedzialność jest Twoja, a wynik pozostaje prywatny.",
    items: [["Pogoda o poranku","każdego ranka pisze do Ciebie: Twoja pogoda, nowy look i czat."],["Przymierzanie stylizacji","wybierz look i modelkę — zobaczysz ją w nim na wideo, z każdej strony."],["Bielizna i luksusowe stylizacje","to samo, w jej najbardziej eleganckich i intymnych stylizacjach."],["Pocałuj modelkę","wyślij swoje zdjęcie i zobaczcie się oboje w pocałunku."],["Twój idol z Tobą","wybierz swojego idola i zobaczcie się razem na imprezie."],["Filmy urodzinowe","wpisz imię, a ona złoży życzenia na głos, po imieniu."],["Wakacje z Bellą","podróżuje dla Ciebie i codziennie przywozi filmy i historie."]] },
  it: { kicker: "LuxuryBandit", h1a: "Scegli un regalo.", h1b: "Mandalo oggi.",
    models: "Guarda le nostre modelle e chatta con loro →", wardrobe: "Guardaroba",
    whatH: "Che cos'è LuxuryBandit?",
    uniqueH: "Perché qui viene meglio", uniqueP: "Usiamo i modelli video che tengono il volto e il movimento. Quelli economici perdono entrambi — e allora non è più il tuo volto. È tutto qui, quando in scena ci sei tu: se il volto non regge, il video non vale niente.",
    canH: "Cosa puoi fare?", costH: "Quanto costa?", costP: "Per il bacio e per l’invito di nozze non c’è un’immagine gratis: si paga con il tuo credito — un video {once}, la ricarica minima {topup}, e quel che avanza resta a te. Negli altri temi la prima immagine è gratis. Se fai cose spesso, prendi l’abbonamento: {price} al mese con {videos} video su tutti i temi, ogni altro {extra}. Disdici quando vuoi.",
    noteH: "Da sapere", noteP: "LuxuryBandit è solo per adulti — confermi di avere 18 anni o più prima di chattare. La persona IA flirta e ti chiede della tua giornata, ma non dichiara mai sentimenti e non finge di essere una persona reale. Per i video con foto tue ti chiediamo prima esplicitamente e confermi di poter usare quella foto — la responsabilità è tua e il risultato resta privato.",
    items: [["Manda un bacio a chi ami","la tua foto e la sua — un video con voi due, solo per lei."],["Il vostro invito di nozze","voi due nel video, più la vostra pagina d'invito con conferme, novità e gruppo."],["Chatta con Bella","parlale quando vuoi — e vestila con look nuovi."],["Vacanza con la ragazza dei tuoi sogni","scegli tu il momento: spiaggia, caffè, ballo."],["Video di compleanno","scrivi un nome — lei lo dice ad alta voce."],["Sorprendilo","una foto di te — e balli alla pole, in un video solo per lui."]] },
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

  const { cover: wetterCover, video: wetterVideo, poster: wetterPoster } = wetter;
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
  /* Der Tanz kostet mehr als ein Kuss (Owner 03.08.2026: „es soll 3,99 kosten") — die Kachel
     muss denselben Preis nennen wie der Knopf dahinter, sonst ist der Katalog ein Koeder. */
  const AB_TANZ = themenPreisZeile("surprise", L);
  /* Das System kostet 59 € — und die Zahl gehört auf die Kachel wie bei jedem anderen Thema.
     „Ein Geschenk, dessen Preis man raten muss, verkauft sich nicht" (Owner 03.08.2026); bei
     59 € gilt das doppelt: Wer den Preis erst nach drei Bildschirmen erfährt, fühlt sich
     hereingelegt — und genau dieses Gefühl kann sich ein Produkt nicht leisten, das mit
     „keine Lügen" wirbt. */
  const AB_VERSPRECHEN = themenPreisZeile("versprechen", L);

  const THEMES: Theme[] = [
    /**
     * GEBURTSTAG GANZ VORN (Owner 09.08.2026: „mach die Topic Geburtstag als erstes auf der
     * Homepage").
     *
     * Er löst den Kuss ab, der seit dem 30.07. auf Platz eins stand. Der Grund ist derselbe
     * wie damals: Was oben steht, entscheidet, was die Leute anfassen — und der Geburtstag
     * ist das Thema, an dem seit zwei Tagen alles gebaut wird (eigene Aufnahme, eigene
     * Stimme, Traumwelt-Look, geschlossener Kaufweg). Er ist das EINE Produkt, das zuerst
     * echte Käufe überstehen soll ([[ein-produkt-zuerst]]).
     */
    /* DIE KACHEL ZEIGT DIE TRAUMWELT (Owner 09.08.2026: „im Slide mach die Dream World als
       erstes" · „auch in der Topic Kachel") — dasselbe Video wie die ERSTE Folie der Karte
       auf der Landingpage. Damit bleibt die Dauerregel gewahrt: ein Video, eine Quelle,
       Kachel und Karte versprechen dasselbe (Memory `landingpage-video-ist-kachel-video`).
       Die Zeile darunter nennt nicht mehr „sie sagt den Namen" — er sagt seine eigene
       Botschaft, mit seinem Gesicht (Textumstellung vom selben Tag). */
    { icon: Cake, title: "Birthdays", tagline: "Your face, your voice — in a world nobody expects.", href: "/themes/birthday", cover: "/Birthday/hbd-traum.jpg", poster: "/Birthday/hbd-traum.jpg", video: GEBURTSTAG_VIDEO_TRAUM, chips: "♥ Your message · Your face · Send", abPreis: AB_GEBURTSTAG },
    // KISS DANACH (Owner 30.07.2026: „kiss musst du als erstes nehmen" — bis 09.08. galt das
    // für Platz eins). Auf dieses Thema liefen die ersten Anzeigen, und der Trichter dort ist
    // vollständig; er bleibt deshalb direkt hinter dem Geburtstag.
    /* POSTER-SWEEP 07.08.2026 (Owner, Kachel für Kachel: „bei Kuss [falsch] · Bei gutschein
       fehlt · Bei Chat fehlt · Bei uralub falsch · Hochzeit auch falsch"): Jede Video-Kachel
       trägt als Poster das ERSTE BILD ihres eigenen Videos (per ffmpeg gezogen) — und Video
       wie Poster liegen als feste Dateien im Repo statt an ablaufenden signierten Links
       (Dauerregel Memory `landingpage-video-ist-kachel-video`: eine Quelle, nie zwei). */
    { icon: Heart, title: "Send a kiss to the one you love", tagline: "Your photo and theirs — one video with the two of you, for them alone.", href: "/themes/kiss", cover: "/Kiss/kiss-poster.jpg", poster: "/Kiss/kiss-poster.jpg", video: "/Kiss/kiss-beispiel.mp4", chips: "♥ Pick her · Your photo · Kiss", abPreis: AB_EINZEL },
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
    { icon: Gift, title: "Gift a voucher", tagline: "Pick a gift or credit — Bella delivers your message as a video card. One tap to redeem.", href: "/themes/gutschein", cover: "/Gutscheine/gutschein-poster.jpg", poster: "/Gutscheine/gutschein-poster.jpg", video: "/Gutscheine/PixVerse_V6_Fusion_360P_She_holds_a_cream_enve.mp4", chips: "♥ Your gift · Your message · One tap", abPreis: AB_GUTSCHEIN },
    // HOCHZEIT gleich hinter Kiss (Owner 30.07.2026: „die Frauen lieben Hochzeiten").
    // Dieselbe Maschine wie Kiss, andere Rollen: SIE bedient den Trichter.
    { icon: Heart, title: "Wedding invitation video", tagline: "Your invitation as a video — the two of you at your wedding. Send it on WhatsApp.", href: "/themes/wedding", cover: "/Wedding/hochzeit-poster.jpg", poster: "/Wedding/hochzeit-poster.jpg", video: "/Wedding/hochzeit-beispiel.mp4", chips: "♥ Your photo · His photo · Invitation", abPreis: AB_HOCHZEIT },
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
    { icon: Shirt, title: "Try-On", tagline: "Pick a look, pick a model — watch her wear it in a video.", href: TRYON, cover: tryonDressed || ph(6), cover2: tryonLingerie || undefined, chips: "♥ Look · Model · Video" },
    { icon: Star, title: "Your Idol with you", tagline: "Pick your idol, add your photo — the two of you in one video.", href: "/your-idol", cover: ph(7), video: idolVideo || undefined, chips: "♥ Your idol · Your photo · Video" },
    // DER LUXURYBANDIT PLAN (Owner 04.08.2026). Kein Geschenk, sondern eine Analyse: zwanzig
    // erzeugte Kunden, Fachleute und Nachbarn streiten über seine Idee, am Ende steht sein
    // Plan. Der Trichter dahinter wird noch gebaut — bis dahin steht die Seite als Vorschau
    // (siehe Skill `business-analyse`).
    /**
     * DIE PLAN-KACHEL ZEIGT IHRE EIGENEN BILDER (Owner 04.08.2026: „in dem Topicplan machst
     * du aber auch die Bilderanimation rein").
     *
     * Hier stand `ph(2)` — ein beliebiges Model-Foto aus dem Bilderstapel. Genau der Fehler,
     * der am 31.07.2026 schon einmal gemeldet wurde („das machst du eh falsch, falsche
     * Bilder"): Ein zufälliges Gesicht bewirbt ein Thema, mit dem es nichts zu tun hat.
     *
     * Jetzt Bild 1 und Bild 3 der Plan-Strecke — „du heute" und „du in 5 Jahren" —, die über
     * `cover2` ineinander blenden (dieselbe Mechanik wie bei Try-On). Damit trägt die Kachel
     * in zwei Sekunden genau das Versprechen der Seite dahinter, ohne ein Wort.
     *
     * Ein eigenes Video (`planVideo`) sticht beides, sobald eins hochgeladen ist.
     *
     * TITEL UND ZEILE AUF ENGLISCH (Owner: „du machst es gleich auf englisch auch, damit
     * schon was drin steht") — jede andere Kachel hier ist englisch; eine deutsche dazwischen
     * las sich wie ein Versehen.
     */
    /* NUR BILD 3 AUF DER KACHEL (Owner 04.08.2026: „eigentlich brauche ich nur Bild 3").
       Hier lief kurz die ganze Strecke — drei Bilder, die ineinander blenden. In der Kachel
       ist sie 104 px breit: Man sieht kein Vorher-Nachher, nur Unruhe. Das Fünf-Jahres-Bild
       allein sagt in einem Blick, worum es geht; die Strecke gehört auf die Seite, wo sie
       gross ist. Der `bilder`-Zweig ist mit entfernt worden, statt ungenutzt liegenzubleiben. */
    /**
     * DIE ZEILE DARF DAS WORT „REICH" TRAGEN — ABER NICHTS VERSPRECHEN (Owner 04.08.2026:
     * „diese Aussage muss anders klingen. Es muss heissen: Werde reich mit dem Luxurybandit
     * Plan").
     *
     * Der Owner hat recht, dass die alte Zeile zu brav war: „Zwanzig Personen streiten über
     * deine Idee" beschreibt einen Vorgang, kein Verlangen. Das Wort gehört hinein.
     *
     * WÖRTLICH „Werde reich mit dem LuxuryBandit Plan" steht hier trotzdem nicht, und zwar
     * aus zwei Gründen, die beide Geld kosten:
     *   1. Zwei Bildschirme weiter steht auf derselben Seite „Kein Versprechen auf Geld".
     *      Beides zusammen liest der Kunde — und eines davon ist dann gelogen.
     *   2. „Werde reich mit X für 59 €" ist die Formulierung, die auf Stripes Verbotsliste
     *      steht (get rich quick). Daran hängt dasselbe Konto wie Kuss, Guthaben und
     *      Einladungen.
     *
     * Die Zeile hier behält das Wort und dreht es um: Sie weckt dasselbe Verlangen und ist
     * dabei wahr — und sie verkauft genau das, was das Produkt kann.
     */
    /**
      * AUS DEM „LUXURYBANDIT SYSTEM" WURDE DAS VERSPRECHEN (Owner 10.08.2026: „Da ändern wir
      * das konzept brutal. Wir verkaufen keine Systeme. Wir generieren genauso wie die
      * anderen. Sende ein Verprechen an dich und an deine Freunde.").
      *
      * Die Kachel bleibt an derselben Stelle, zeigt aber ein anderes Produkt: kein Bericht
      * über eine Geschäftsidee mehr, sondern ein Video mit seinem Gesicht und seiner Stimme —
      * wie jedes andere Thema im Haus. Cover und Beispielvideo kommen wie überall aus dem
      * Medien-Werkzeug (`/themes/versprechen?admin=1`), sobald der erste Lauf abgenommen ist.
      */
    { icon: Target, title: "Send a promise", tagline: "Say it out loud — and let them see you where you are heading.", href: "/themes/versprechen", cover: versprechenCover || undefined, video: versprechenVideo || undefined, chips: "♥ Your video · Your words · Villa & car", abPreis: AB_VERSPRECHEN },
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
    /* Owner 07.08.2026: „wir blenden ers mal Bella raus aus der Topic seite." Damit ist
       Bella als Thema vollständig aus dem Katalog — die beiden Zeilen darüber waren es
       schon, der Chat war der letzte. Die Seite /themes/chat bleibt erreichbar und der
       Trichter dahinter lebt; nur der Katalog zeigt ihn nicht mehr. „Erst mal": Ein Titel
       hier heraus, und er ist zurück. */
    "Chat with Bella",
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
