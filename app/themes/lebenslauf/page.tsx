import TopNav from "@/components/TopNav";
import LandingKarte from "@/components/LandingKarte";
import LebenslaufBeispiel from "@/components/LebenslaufBeispiel";
import TrackView from "@/components/TrackView";
import SeitenFuss from "@/components/SeitenFuss";
import ThemenVorspann from "@/components/ThemenVorspann";
import { Knopf } from "@/components/CI";
import { Kicker, H1, Y, Lead, SectionTitle, Fine } from "@/components/Landing";
import { resolveLang } from "@/lib/lang-server";
import { kissText } from "@/lib/kiss-i18n";
import { eur, themenPreisCents, LEBENSLAUF_MONAT_CENTS } from "@/lib/pricing";
/* EIN Video aus EINER Konstante für Karte, Katalog-Kachel und Themen-Kreis (Dauerregel
   Memory `landingpage-video-ist-kachel-video`) — Quelle: lib/lebenslauf-vorlage.ts. */
import { LEBENSLAUF_BEISPIEL_VIDEO as BEISPIEL_VIDEO, LEBENSLAUF_BEISPIEL_POSTER as BEISPIEL_POSTER } from "@/lib/lebenslauf-vorlage";

/**
 * DIE LANDINGPAGE DER VIDEO-BEWERBUNG — SEITENTEXT WÖRTLICH VOM OWNER (24.08.2026: „Hier der
 * komplette Seitentext, von oben nach unten"). Aufbau: Hero (Kopf-Template) → Karte mit dem
 * ECHTEN Gesicht des Gründers (Owner: „Der Text verspricht ‚du selbst, echt' — mit dem
 * KI-Model daneben glaubt ihn niemand") → So funktioniert es (3 Schritte MIT Titeln, deshalb
 * eigene Sektion statt der Vorspann-Liste) → Problem → Update-Block → „Die Seite, die du
 * bekommst" (LebenslaufBeispiel, zeigt das echte Muster-Profil) → Preis → FAQ → Abschluss.
 *
 * ZWEI EINSETZ-HINWEISE DES OWNERS, beide umgesetzt: Die Zeile „die KI zeigt dir, wofür du
 * dich bewerben kannst" steht NICHT in der Headline — sie steckt in Schritt 3 und im
 * Update-Block. Und der Hero trägt sein echtes Video (LEBENSLAUF_BEISPIEL_*).
 *
 * GOLD GENAU EINMAL (Skill `ci-design`): der Kaufknopf auf der Karte. Preis- und
 * Abschluss-CTA sind `umriss` und führen auf denselben Trichter.
 *
 * PREISE NUR AUS DER TABELLE (Memory `prices-only-from-pricing-table`): 19 einmalig
 * (LEBENSLAUF_CENTS) + 4,99/Monat (LEBENSLAUF_MONAT_CENTS). Die ABO-Kasse und die
 * 30-Tage-Frist sind noch nicht gebaut — siehe Kommentar in lib/pricing.ts.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your resume, as a video you speak | LuxuryBandit",
  description: "Upload your resume — AI writes your script, you record it yourself. A finished application page with its own link.",
  alternates: { canonical: "/themes/lebenslauf" },
};

type Schritt = { t: string; d: string };
type Frage = { q: string; a: string };
type Copy = {
  kicker: string; lead: string; anlass: string; grund: string; privat: string;
  soH: string; so: Schritt[];
  problemH: string; problem1: string; problem2: string;
  updateH: string; updateP1: string; updateQ: string[]; updateP2: string;
  preisH: string; preisEinmal: string; preisMonat: string; preisOhne: string;
  faqH: string; faq: Frage[];
  schlussH: string; schlussP: string;
  ctaStart: string; ctaProfil: string;
};

const TEXTE: Record<string, Copy> = {
  de: {
    kicker: "Für deine Bewerbung",
    lead: "Lade deinen Lebenslauf hoch — die KI schreibt dir das passende Skript, du sprichst es ein. Fertig ist eine Bewerbungsseite mit eigenem Link.",
    anlass: "Für die Jobsuche · für den Quereinstieg · wenn der Lebenslauf allein nicht zeigt, was du kannst",
    grund: "Ein PDF wird überflogen und vergessen. Eine Seite, auf der du sprichst, bleibt offen.",
    privat: "Deine Seite bleibt privat, solange du sie nicht selbst teilst.",
    soH: "So funktioniert es",
    so: [
      { t: "Lebenslauf hochladen", d: "PDF genügt. Die KI liest deine Stationen, deine Fähigkeiten und deinen roten Faden heraus." },
      { t: "Dein Skript entsteht", d: "Kein Textbaustein — ein Sprechtext aus deinem eigenen Werdegang. Du änderst ihn, bis er nach dir klingt." },
      { t: "Du sprichst, wir bauen die Seite", d: "Handykamera reicht. Video, Werdegang und die Rollen, die zu dir passen — auf einem Link für jede Bewerbung." },
    ],
    problemH: "Das Problem, das wir lösen",
    problem1: "Die meisten scheitern nicht am Aufnehmen. Sie scheitern an der Frage, was sie in 60 Sekunden über sich sagen sollen.",
    problem2: "Genau dafür ist das Skript da. Du musst nichts erfinden und nichts auswendig lernen — du liest ab, so oft du willst.",
    updateH: "Immer aktuell — ohne Formular",
    updateP1: "Bei LinkedIn pflegst du Felder. Hier sagst du, was sich geändert hat.",
    updateQ: ["„Ich habe bei Siemens angefangen.“", "„Ich bewerbe mich jetzt als Produktmanager.“"],
    updateP2: "Ein Satz genügt — Text, Rollenvorschläge und Skript passen sich an. Kein Löschen, kein Neutippen, kein Feld für Feld.",
    preisH: "Ein Link, der mit dir mitwächst",
    preisEinmal: "einmalig — Skript, Video und fertige Seite",
    preisMonat: "im Monat — Seite bleibt online, unbegrenzt aktualisieren, monatlich kündbar",
    preisOhne: "Ohne Abo bleibt deine Seite 30 Tage erreichbar.",
    faqH: "Häufige Fragen",
    faq: [
      { q: "Muss ich gut vor der Kamera sein?", a: "Nein. Du liest dein Skript ab, so oft du willst, bis eine Aufnahme sitzt. Niemand sieht die Versuche davor." },
      { q: "Wirkt das nicht unseriös?", a: "Du sprichst selbst — kein Avatar, keine synthetische Stimme. Genau darum funktioniert es: Der Personaler sieht dich, bevor er dich einlädt." },
      { q: "Wer kann meine Seite sehen?", a: "Nur wer den Link von dir bekommt. Deine Kontaktdaten werden erst frei, wenn du zustimmst." },
      { q: "Was, wenn sich mein Ziel ändert?", a: "Du sagst es der Seite. Neue Branche, neue Rolle, neuer Schwerpunkt — in einer Minute erledigt." },
    ],
    schlussH: "Deine nächste Bewerbung ist ein Link.",
    schlussP: "Lebenslauf hochladen, Skript einsprechen, fertig. In zehn Minuten.",
    ctaStart: "Jetzt starten", ctaProfil: "Profil erstellen",
  },
  en: {
    kicker: "For your application",
    lead: "Upload your resume — the AI writes your script, you record it yourself. The result is an application page with its own link.",
    anlass: "For the job search · for a career change · when your resume alone doesn't show what you can do",
    grund: "A PDF gets skimmed and forgotten. A page where you speak stays open.",
    privat: "Your page stays private unless you share it yourself.",
    soH: "How it works",
    so: [
      { t: "Upload your resume", d: "A PDF is enough. The AI reads your positions, your skills and the thread that connects them." },
      { t: "Your script takes shape", d: "No boilerplate — a spoken text built from your own career. You edit it until it sounds like you." },
      { t: "You speak, we build the page", d: "A phone camera is enough. Video, career history and the roles that fit you — on one link for every application." },
    ],
    problemH: "The problem we solve",
    problem1: "Most people don't fail at recording. They fail at knowing what to say about themselves in 60 seconds.",
    problem2: "That's exactly what the script is for. Nothing to invent, nothing to memorise — you read it out, as often as you like.",
    updateH: "Always up to date — no forms",
    updateP1: "On LinkedIn you maintain fields. Here you say what has changed.",
    updateQ: ["“I've started at Siemens.”", "“I'm now applying as a product manager.”"],
    updateP2: "One sentence is enough — text, role suggestions and script adapt. No deleting, no retyping, no field after field.",
    preisH: "One link that grows with you",
    preisEinmal: "one-time — script, video and finished page",
    preisMonat: "per month — page stays online, unlimited updates, cancel monthly",
    preisOhne: "Without the subscription your page stays reachable for 30 days.",
    faqH: "Frequently asked questions",
    faq: [
      { q: "Do I need to be good on camera?", a: "No. You read your script as often as you like until one take works. Nobody sees the attempts before it." },
      { q: "Doesn't this look unprofessional?", a: "You speak yourself — no avatar, no synthetic voice. That's exactly why it works: the recruiter sees you before inviting you." },
      { q: "Who can see my page?", a: "Only people who get the link from you. Your contact details are released only when you agree." },
      { q: "What if my goal changes?", a: "You tell the page. New industry, new role, new focus — done in a minute." },
    ],
    schlussH: "Your next application is a link.",
    schlussP: "Upload your resume, record the script, done. In ten minutes.",
    ctaStart: "Start now", ctaProfil: "Create profile",
  },
  ro: {
    kicker: "Pentru aplicația ta",
    lead: "Încarcă CV-ul — AI-ul îți scrie scenariul potrivit, tu îl vorbești. Rezultatul: o pagină de aplicare cu propriul ei link.",
    anlass: "Pentru căutarea unui job · pentru reconversie · când CV-ul singur nu arată ce poți",
    grund: "Un PDF e răsfoit și uitat. O pagină pe care vorbești tu rămâne deschisă.",
    privat: "Pagina ta rămâne privată până o distribui chiar tu.",
    soH: "Cum funcționează",
    so: [
      { t: "Încarci CV-ul", d: "Un PDF e de ajuns. AI-ul îți citește etapele, abilitățile și firul roșu al carierei." },
      { t: "Scenariul tău prinde formă", d: "Fără șabloane — un text de vorbit, construit din propriul tău parcurs. Îl modifici până sună ca tine." },
      { t: "Tu vorbești, noi construim pagina", d: "Camera telefonului e de ajuns. Video, parcurs și rolurile care ți se potrivesc — pe un singur link pentru fiecare aplicare." },
    ],
    problemH: "Problema pe care o rezolvăm",
    problem1: "Cei mai mulți nu eșuează la filmat. Eșuează la întrebarea: ce să spui despre tine în 60 de secunde?",
    problem2: "Exact pentru asta există scenariul. Nu inventezi nimic și nu înveți nimic pe de rost — citești, de câte ori vrei.",
    updateH: "Mereu actual — fără formulare",
    updateP1: "Pe LinkedIn întreții câmpuri. Aici spui ce s-a schimbat.",
    updateQ: ["„Am început la Siemens.”", "„Acum aplic ca product manager.”"],
    updateP2: "O propoziție e de ajuns — textul, rolurile propuse și scenariul se adaptează. Fără șters, fără retastat, fără câmp după câmp.",
    preisH: "Un link care crește odată cu tine",
    preisEinmal: "o singură dată — scenariu, video și pagină gata",
    preisMonat: "pe lună — pagina rămâne online, actualizări nelimitate, anulezi lunar",
    preisOhne: "Fără abonament, pagina ta rămâne accesibilă 30 de zile.",
    faqH: "Întrebări frecvente",
    faq: [
      { q: "Trebuie să fiu bun în fața camerei?", a: "Nu. Îți citești scenariul de câte ori vrei, până iese o dublă bună. Nimeni nu vede încercările dinainte." },
      { q: "Nu pare neserios?", a: "Vorbești chiar tu — fără avatar, fără voce sintetică. Exact de asta funcționează: recrutorul te vede înainte să te invite." },
      { q: "Cine îmi poate vedea pagina?", a: "Doar cine primește linkul de la tine. Datele tale de contact devin vizibile doar cu acordul tău." },
      { q: "Și dacă mi se schimbă obiectivul?", a: "Îi spui paginii. Industrie nouă, rol nou, focus nou — gata într-un minut." },
    ],
    schlussH: "Următoarea ta aplicare este un link.",
    schlussP: "Încarci CV-ul, vorbești scenariul, gata. În zece minute.",
    ctaStart: "Începe acum", ctaProfil: "Creează profilul",
  },
  es: {
    kicker: "Para tu candidatura",
    lead: "Sube tu currículum — la IA te escribe el guion adecuado y tú lo grabas. El resultado: una página de candidatura con su propio enlace.",
    anlass: "Para buscar trabajo · para un cambio de carrera · cuando el currículum solo no muestra lo que sabes",
    grund: "Un PDF se hojea y se olvida. Una página en la que hablas tú queda abierta.",
    privat: "Tu página es privada hasta que tú la compartas.",
    soH: "Cómo funciona",
    so: [
      { t: "Sube tu currículum", d: "Con un PDF basta. La IA lee tus etapas, tus habilidades y tu hilo conductor." },
      { t: "Tu guion toma forma", d: "Nada de plantillas — un texto hablado, hecho de tu propia trayectoria. Lo cambias hasta que suene a ti." },
      { t: "Tú hablas, nosotros construimos la página", d: "La cámara del móvil basta. Vídeo, trayectoria y los roles que encajan contigo — en un enlace para cada candidatura." },
    ],
    problemH: "El problema que resolvemos",
    problem1: "La mayoría no fracasa al grabar. Fracasa en la pregunta: ¿qué decir sobre ti en 60 segundos?",
    problem2: "Para eso existe el guion. No inventas nada ni memorizas nada — lo lees, tantas veces como quieras.",
    updateH: "Siempre al día — sin formularios",
    updateP1: "En LinkedIn mantienes campos. Aquí dices lo que ha cambiado.",
    updateQ: ["«He empezado en Siemens.»", "«Ahora me presento como product manager.»"],
    updateP2: "Con una frase basta — el texto, los roles propuestos y el guion se adaptan. Sin borrar, sin reescribir, sin campo tras campo.",
    preisH: "Un enlace que crece contigo",
    preisEinmal: "pago único — guion, vídeo y página terminada",
    preisMonat: "al mes — la página sigue online, actualizaciones ilimitadas, cancelable cada mes",
    preisOhne: "Sin suscripción, tu página sigue accesible 30 días.",
    faqH: "Preguntas frecuentes",
    faq: [
      { q: "¿Tengo que ser bueno ante la cámara?", a: "No. Lees tu guion tantas veces como quieras hasta que una toma salga bien. Nadie ve los intentos anteriores." },
      { q: "¿No parece poco serio?", a: "Hablas tú — sin avatar, sin voz sintética. Justo por eso funciona: el reclutador te ve antes de invitarte." },
      { q: "¿Quién puede ver mi página?", a: "Solo quien reciba el enlace de ti. Tus datos de contacto solo se liberan con tu consentimiento." },
      { q: "¿Y si cambia mi objetivo?", a: "Se lo dices a la página. Nuevo sector, nuevo rol, nuevo enfoque — listo en un minuto." },
    ],
    schlussH: "Tu próxima candidatura es un enlace.",
    schlussP: "Subes el currículum, grabas el guion, listo. En diez minutos.",
    ctaStart: "Empieza ahora", ctaProfil: "Crear perfil",
  },
  fr: {
    kicker: "Pour ta candidature",
    lead: "Ajoute ton CV — l'IA écrit ton script, tu l'enregistres toi-même. Résultat : une page de candidature avec son propre lien.",
    anlass: "Pour la recherche d'emploi · pour une reconversion · quand le CV seul ne montre pas ce que tu vaux",
    grund: "Un PDF est survolé puis oublié. Une page où tu parles reste ouverte.",
    privat: "Ta page reste privée tant que tu ne la partages pas.",
    soH: "Comment ça marche",
    so: [
      { t: "Ajoute ton CV", d: "Un PDF suffit. L'IA lit tes étapes, tes compétences et ton fil conducteur." },
      { t: "Ton script prend forme", d: "Pas de texte tout fait — un texte parlé, tiré de ton propre parcours. Tu le modifies jusqu'à ce qu'il te ressemble." },
      { t: "Tu parles, nous construisons la page", d: "La caméra du téléphone suffit. Vidéo, parcours et les rôles qui te correspondent — sur un lien pour chaque candidature." },
    ],
    problemH: "Le problème que nous résolvons",
    problem1: "La plupart n'échouent pas à filmer. Ils échouent sur la question : que dire de soi en 60 secondes ?",
    problem2: "C'est exactement à ça que sert le script. Rien à inventer, rien à apprendre par cœur — tu lis, autant de fois que tu veux.",
    updateH: "Toujours à jour — sans formulaire",
    updateP1: "Sur LinkedIn tu entretiens des champs. Ici tu dis ce qui a changé.",
    updateQ: ["« J'ai commencé chez Siemens. »", "« Je postule maintenant comme product manager. »"],
    updateP2: "Une phrase suffit — le texte, les rôles proposés et le script s'adaptent. Rien à effacer, rien à retaper, pas de champ après champ.",
    preisH: "Un lien qui grandit avec toi",
    preisEinmal: "en une fois — script, vidéo et page terminée",
    preisMonat: "par mois — la page reste en ligne, mises à jour illimitées, résiliable chaque mois",
    preisOhne: "Sans abonnement, ta page reste accessible 30 jours.",
    faqH: "Questions fréquentes",
    faq: [
      { q: "Faut-il être bon devant la caméra ?", a: "Non. Tu lis ton script autant de fois que tu veux, jusqu'à la bonne prise. Personne ne voit les essais d'avant." },
      { q: "Ça ne fait pas amateur ?", a: "Tu parles toi-même — pas d'avatar, pas de voix synthétique. C'est justement pour ça que ça marche : le recruteur te voit avant de t'inviter." },
      { q: "Qui peut voir ma page ?", a: "Seulement ceux qui reçoivent le lien de toi. Tes coordonnées ne sont libérées qu'avec ton accord." },
      { q: "Et si mon objectif change ?", a: "Tu le dis à la page. Nouveau secteur, nouveau rôle, nouveau focus — réglé en une minute." },
    ],
    schlussH: "Ta prochaine candidature est un lien.",
    schlussP: "CV ajouté, script enregistré, terminé. En dix minutes.",
    ctaStart: "Commencer", ctaProfil: "Créer le profil",
  },
  pt: {
    kicker: "Para a tua candidatura",
    lead: "Carrega o teu CV — a IA escreve o guião certo, tu gravas com a tua voz. O resultado: uma página de candidatura com o seu próprio link.",
    anlass: "Para procurar emprego · para mudar de carreira · quando o CV sozinho não mostra o que vales",
    grund: "Um PDF é folheado e esquecido. Uma página onde tu falas fica aberta.",
    privat: "A tua página fica privada até seres tu a partilhá-la.",
    soH: "Como funciona",
    so: [
      { t: "Carrega o teu CV", d: "Um PDF chega. A IA lê as tuas etapas, as tuas competências e o teu fio condutor." },
      { t: "O teu guião ganha forma", d: "Nada de textos feitos — um texto falado, construído a partir do teu próprio percurso. Alteras até soar a ti." },
      { t: "Tu falas, nós construímos a página", d: "A câmara do telemóvel chega. Vídeo, percurso e as funções que combinam contigo — num link para cada candidatura." },
    ],
    problemH: "O problema que resolvemos",
    problem1: "A maioria não falha a gravar. Falha na pergunta: o que dizer sobre ti em 60 segundos?",
    problem2: "É exatamente para isso que existe o guião. Nada para inventar, nada para decorar — lês, as vezes que quiseres.",
    updateH: "Sempre atual — sem formulários",
    updateP1: "No LinkedIn manténs campos. Aqui dizes o que mudou.",
    updateQ: ["«Comecei na Siemens.»", "«Agora candidato-me como product manager.»"],
    updateP2: "Uma frase chega — o texto, as funções propostas e o guião adaptam-se. Sem apagar, sem reescrever, sem campo a campo.",
    preisH: "Um link que cresce contigo",
    preisEinmal: "pagamento único — guião, vídeo e página pronta",
    preisMonat: "por mês — a página fica online, atualizações ilimitadas, cancelável todos os meses",
    preisOhne: "Sem subscrição, a tua página fica acessível 30 dias.",
    faqH: "Perguntas frequentes",
    faq: [
      { q: "Tenho de ser bom diante da câmara?", a: "Não. Lês o teu guião as vezes que quiseres, até uma gravação sair bem. Ninguém vê as tentativas anteriores." },
      { q: "Não parece pouco sério?", a: "Falas tu — sem avatar, sem voz sintética. É por isso que funciona: o recrutador vê-te antes de te convidar." },
      { q: "Quem pode ver a minha página?", a: "Só quem receber o link de ti. Os teus contactos só ficam visíveis com o teu acordo." },
      { q: "E se o meu objetivo mudar?", a: "Dizes à página. Novo setor, nova função, novo foco — resolvido num minuto." },
    ],
    schlussH: "A tua próxima candidatura é um link.",
    schlussP: "Carregas o CV, gravas o guião, pronto. Em dez minutos.",
    ctaStart: "Começar agora", ctaProfil: "Criar perfil",
  },
  it: {
    kicker: "Per la tua candidatura",
    lead: "Carica il tuo CV — l'IA ti scrive il copione giusto, tu lo registri con la tua voce. Il risultato: una pagina di candidatura con il suo link.",
    anlass: "Per cercare lavoro · per cambiare carriera · quando il CV da solo non mostra quanto vali",
    grund: "Un PDF viene sfogliato e dimenticato. Una pagina in cui parli tu resta aperta.",
    privat: "La tua pagina resta privata finché non la condividi tu.",
    soH: "Come funziona",
    so: [
      { t: "Carica il tuo CV", d: "Basta un PDF. L'IA legge le tue tappe, le tue competenze e il tuo filo conduttore." },
      { t: "Il tuo copione prende forma", d: "Niente frasi fatte — un testo parlato, costruito dal tuo percorso. Lo modifichi finché non suona come te." },
      { t: "Tu parli, noi costruiamo la pagina", d: "Basta la fotocamera del telefono. Video, percorso e i ruoli adatti a te — su un link per ogni candidatura." },
    ],
    problemH: "Il problema che risolviamo",
    problem1: "I più non falliscono nel registrare. Falliscono sulla domanda: cosa dire di sé in 60 secondi?",
    problem2: "Il copione serve esattamente a questo. Niente da inventare, niente da imparare a memoria — leggi, tutte le volte che vuoi.",
    updateH: "Sempre aggiornato — senza moduli",
    updateP1: "Su LinkedIn curi dei campi. Qui dici cosa è cambiato.",
    updateQ: ["«Ho iniziato in Siemens.»", "«Ora mi candido come product manager.»"],
    updateP2: "Basta una frase — testo, ruoli proposti e copione si adattano. Niente da cancellare, niente da riscrivere, nessun campo dopo campo.",
    preisH: "Un link che cresce con te",
    preisEinmal: "una tantum — copione, video e pagina finita",
    preisMonat: "al mese — la pagina resta online, aggiornamenti illimitati, disdici ogni mese",
    preisOhne: "Senza abbonamento la tua pagina resta raggiungibile per 30 giorni.",
    faqH: "Domande frequenti",
    faq: [
      { q: "Devo essere bravo davanti alla camera?", a: "No. Leggi il tuo copione tutte le volte che vuoi, finché una ripresa non funziona. Nessuno vede i tentativi precedenti." },
      { q: "Non sembra poco serio?", a: "Parli tu — niente avatar, niente voce sintetica. Proprio per questo funziona: il recruiter ti vede prima di invitarti." },
      { q: "Chi può vedere la mia pagina?", a: "Solo chi riceve il link da te. I tuoi contatti si sbloccano solo con il tuo consenso." },
      { q: "E se il mio obiettivo cambia?", a: "Lo dici alla pagina. Nuovo settore, nuovo ruolo, nuovo focus — fatto in un minuto." },
    ],
    schlussH: "La tua prossima candidatura è un link.",
    schlussP: "Carichi il CV, registri il copione, fatto. In dieci minuti.",
    ctaStart: "Inizia ora", ctaProfil: "Crea il profilo",
  },
};

export default async function LebenslaufThemePage() {
  const L = await resolveLang();
  const T = kissText(L, "lebenslauf");
  const t = TEXTE[L] ?? TEXTE.en;
  const preisCents = themenPreisCents("lebenslauf");
  const einmal = eur(preisCents, L);
  const monat = eur(LEBENSLAUF_MONAT_CENTS, L);

  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav />
      <TrackView event="lebenslauf_view" lookId="themes-lebenslauf" lookName="Lebenslauf-Thema" />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        {/* ───── HERO ───── */}
        <Kicker>{t.kicker}</Kicker>
        <H1 className="mt-1">{T.heroA}<Y>{T.heroY}</Y>{T.heroB}</H1>
        <Lead className="mt-2">{t.lead}</Lead>
        {/* Anlass · Grund · Privatzeile — die Schritte stehen als eigene Sektion darunter,
            MIT Titeln (Owner-Seitentext), deshalb hier eine leere Schrittliste. */}
        <ThemenVorspann anlass={t.anlass} grund={t.grund} wieGeht={[]} wieGehtPrivat={t.privat} />

        <LandingKarte sprache={L} titel={t.kicker}
          href="/themes/lebenslauf/start"
          teilenUrl="/themes/lebenslauf?utm_source=share" teilenText={t.kicker}
          preisZeile={`${t.ctaStart} — ${einmal}`}
          /* Sprechvideo: oben ankern, nie den Kopf abschneiden (Skill `card`). */
          ausrichtung="oben"
          folien={[{ video: BEISPIEL_VIDEO, poster: BEISPIEL_POSTER }]} />

        {/* ───── SO FUNKTIONIERT ES — drei Schritte MIT Titeln ───── */}
        <section className="mt-10">
          <SectionTitle>{t.soH}</SectionTitle>
          <ol className="mt-4 space-y-5">
            {t.so.map((s, i) => (
              <li key={s.t} className="flex gap-3">
                <span className="mt-[2px] grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#f6cf51]/15 text-[12px] font-black text-[#f6cf51]">
                  {i + 1}
                </span>
                <div>
                  <p className="text-[15px] font-black leading-snug text-white/90">{s.t}</p>
                  <p className="mt-1 text-[13.5px] font-medium leading-snug text-white/75">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ───── DAS PROBLEM ───── */}
        <section className="mt-10">
          <SectionTitle>{t.problemH}</SectionTitle>
          <p className="mt-3 text-[15px] font-black leading-snug text-white/90">{t.problem1}</p>
          <p className="mt-2 text-[14px] font-medium leading-snug text-white/75">{t.problem2}</p>
        </section>

        {/* ───── IMMER AKTUELL — der Update-Block. Hier steckt (mit Schritt 3) die Zeile
            „die Rollen passen sich an" — bewusst NICHT in der Headline (Owner-Hinweis). ───── */}
        <section className="mt-10">
          <SectionTitle>{t.updateH}</SectionTitle>
          <p className="mt-3 text-[15px] font-black leading-snug text-white/90">{t.updateP1}</p>
          <div className="mt-3 space-y-2">
            {t.updateQ.map(q => (
              <p key={q} className="border-l border-white/25 pl-3 text-[13.5px] font-semibold italic leading-snug text-white/70">{q}</p>
            ))}
          </div>
          <p className="mt-3 text-[14px] font-medium leading-snug text-white/75">{t.updateP2}</p>
        </section>

        {/* ───── DIE SEITE, DIE DU BEKOMMST — das echte Muster-Profil ───── */}
        <LebenslaufBeispiel lang={L} />

        {/* ───── PREIS ───── */}
        <section className="mt-10">
          <SectionTitle>{t.preisH}</SectionTitle>
          <div className="mt-4 space-y-3">
            <p className="text-[15px] font-medium leading-snug text-white/85">
              <span className="font-black text-white">{einmal}</span> {t.preisEinmal}
            </p>
            <p className="text-[15px] font-medium leading-snug text-white/85">
              <span className="font-black text-white">{monat}</span> {t.preisMonat}
            </p>
          </div>
          <Fine className="mt-3">{t.preisOhne}</Fine>
          <div className="mt-4">
            <Knopf art="umriss" href="/themes/lebenslauf/start">{`${t.ctaProfil} — ${einmal}`}</Knopf>
          </div>
        </section>

        {/* ───── FAQ ───── */}
        <section className="mt-10">
          <SectionTitle>{t.faqH}</SectionTitle>
          <div className="mt-2 divide-y divide-white/10">
            {t.faq.map(f => (
              <div key={f.q} className="py-4">
                <p className="text-[14.5px] font-black leading-snug text-white/90">{f.q}</p>
                <p className="mt-1.5 text-[13.5px] font-medium leading-snug text-white/75">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ───── ABSCHLUSS ───── */}
        <section className="mt-10">
          <SectionTitle>{t.schlussH}</SectionTitle>
          <Lead className="mt-3">{t.schlussP}</Lead>
          <div className="mt-4">
            <Knopf art="umriss" href="/themes/lebenslauf/start">{t.ctaStart}</Knopf>
          </div>
        </section>
      </div>
      <SeitenFuss />
    </main>
  );
}
