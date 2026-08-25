import TopNav from "@/components/TopNav";
import LandingKarte from "@/components/LandingKarte";
import LebenslaufBeispiel from "@/components/LebenslaufBeispiel";
import TrackView from "@/components/TrackView";
import SeitenFuss from "@/components/SeitenFuss";
import ThemenVorspann from "@/components/ThemenVorspann";
import { Knopf } from "@/components/CI";
import { Kicker, H1, Y, Lead, SectionTitle, Fine } from "@/components/Landing";
import { resolveLang } from "@/lib/lang-server";
import { eur, themenPreisCents, LEBENSLAUF_MONAT_CENTS } from "@/lib/pricing";
/* EIN Video aus EINER Konstante für Karte, Katalog-Kachel und Themen-Kreis (Dauerregel
   Memory `landingpage-video-ist-kachel-video`) — Quelle: lib/lebenslauf-vorlage.ts. */
import { LEBENSLAUF_BEISPIEL_VIDEO as BEISPIEL_VIDEO, LEBENSLAUF_BEISPIEL_POSTER as BEISPIEL_POSTER } from "@/lib/lebenslauf-vorlage";

/**
 * DIE LANDINGPAGE DER BEWERBUNGSZENTRALE — Verkaufstext abgenommen am 25.08.2026
 * (KONZEPT-BEWERBUNGSZENTRALE.md, Owner: „Wir haben hier Features, die verkaufen müssen …
 * Das sind Features, die keiner hat"). Aufbau: Hero (Kopf-Template) → Karte mit dem ECHTEN
 * Video des Gründers → Feature-Karte „Deine Bewerbungszentrale" (VIER Blöcke in
 * Nutzer-Reihenfolge, auf der Creme-Fläche wie das Dossier) → Kontrast-Block →
 * „Die Seite, die du bekommst" → Preis → FAQ → Abschluss.
 *
 * ZWEI ZEILEN DES ABGENOMMENEN TEXTES FEHLEN MIT ABSICHT (nur verkaufen, was die Maschine
 * hält): „Lebenslauf als PDF" kommt mit Stufe 2 zurück, die Zugabe-Zeile „geöffnet,
 * angefragt, eingeladen" mit der Zentrale. Die frühere FAQ-Antwort „kein Avatar, keine
 * synthetische Stimme" ist ERSETZT — sie widersprach dem Produkt (HeyGen aus der eigenen
 * Aufnahme, Video-Regel im Konzept) und war die Quelle echter Verwirrung.
 *
 * GOLD GENAU EINMAL (Skill `ci-design`): der Kaufknopf auf der Karte. Preis- und
 * Abschluss-CTA sind `umriss` und führen auf denselben Trichter.
 *
 * PREISE NUR AUS DER TABELLE (Memory `prices-only-from-pricing-table`): einmalig
 * (LEBENSLAUF_CENTS) + monatlich (LEBENSLAUF_MONAT_CENTS).
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "The perfect application for every job | LuxuryBandit",
  description: "Paste a job ad and see your match in percent — then your application adapts: cover letter, video and your own link per application.",
  alternates: { canonical: "/themes/lebenslauf" },
};

type Feature = { t: string; d: string };
type Frage = { q: string; a: string };
type Copy = {
  kicker: string; h1A: string; h1Y: string; h1B: string; lead: string;
  anlass: string; grund: string; privat: string;
  zentraleH: string; features: Feature[];
  kontrastH: string; kontrast: string;
  preisH: string; preisEinmal: string; preisMonat: string; preisOhne: string;
  faqH: string; faq: Frage[];
  schlussH: string; schlussP: string;
  ctaStart: string; ctaProfil: string;
};

const TEXTE: Record<string, Copy> = {
  de: {
    kicker: "Für deine Bewerbung",
    h1A: "Für jede Stelle die ", h1Y: "perfekte Bewerbung", h1B: ".",
    lead: "Füge eine Stellenanzeige ein und sieh in Prozent, ob sie zu dir passt. Dann passt sich deine Bewerbung an — Anschreiben, Video und Texte, zugeschnitten auf genau diese Stelle.",
    anlass: "Für die Jobsuche · für den Quereinstieg · wenn der Lebenslauf allein nicht zeigt, was du kannst",
    grund: "Ein PDF wird überflogen und vergessen. Eine Seite, auf der du sprichst, bleibt offen.",
    privat: "Deine Seite bleibt privat, solange du sie nicht selbst teilst.",
    zentraleH: "Deine Bewerbungszentrale",
    features: [
      { t: "Dein Bewerbungsvideo — ohne Vorbereitung.", d: "Kein Text, kein Auswendiglernen. Das Skript schreiben wir dir aus deinem Lebenslauf — du nimmst dich einmal kurz auf, den Rest macht die KI: Aus deiner Aufnahme wird dein professionelles Sprechvideo. So echt, dass es niemand merkt." },
      { t: "Passt die Stelle zu dir?", d: "Anzeige einfügen — Link oder Text reicht. Du bekommst eine ehrliche Prozentzahl und siehst schwarz auf weiss, was passt und was fehlt. Bevor du auch nur eine Minute investierst." },
      { t: "Deine Bewerbung passt sich an.", d: "Ein Klick, und Profiltext, Schwerpunkte und Positionierung werden auf die Anzeige zugeschnitten. Nichts wird erfunden — alles kommt aus deinem echten Lebenslauf, nur richtig betont." },
      { t: "Die komplette Mappe, je Stelle.", d: "Anschreiben in der Sprache der Anzeige. Dein Dossier mit deinem Video. Jede Bewerbung unter eigener Adresse — fertig zum Verschicken." },
    ],
    kontrastH: "Das hat kein Jobportal",
    kontrast: "Dort zeigt dein Profil jeder Firma dasselbe. Hier bekommt jede Firma eine Bewerbung, die auf ihre Anzeige zugeschnitten ist — mit Anschreiben und Video.",
    preisH: "Ein Link, der mit dir mitwächst",
    preisEinmal: "einmalig — Skript, Video und fertige Seite",
    preisMonat: "im Monat — deine Bewerbungen bleiben online, unbegrenzt zuschneiden, monatlich kündbar",
    preisOhne: "Ohne Abo bleibt deine Seite 30 Tage erreichbar.",
    faqH: "Häufige Fragen",
    faq: [
      { q: "Muss ich gut vor der Kamera sein?", a: "Nein. Du liest dein Skript ab, so oft du willst, bis eine Aufnahme sitzt. Niemand sieht die Versuche davor." },
      { q: "Wirkt das nicht unseriös?", a: "Es ist dein Gesicht und deine Stimme — die KI macht aus deiner eigenen Aufnahme das professionelle Video. So echt, dass es niemand merkt." },
      { q: "Wer kann meine Seite sehen?", a: "Nur wer den Link von dir bekommt. Deine Kontaktdaten werden erst frei, wenn du zustimmst." },
      { q: "Was, wenn sich mein Ziel ändert?", a: "Du sagst es der Seite. Neue Branche, neue Rolle, neuer Schwerpunkt — in einer Minute erledigt." },
    ],
    schlussH: "Deine nächste Bewerbung ist ein Link.",
    schlussP: "Lebenslauf hochladen, Skript einsprechen, fertig. In zehn Minuten.",
    ctaStart: "Jetzt starten", ctaProfil: "Profil erstellen",
  },
  en: {
    kicker: "For your application",
    h1A: "The ", h1Y: "perfect application", h1B: " for every job.",
    lead: "Paste a job ad and see in percent how well it fits you. Then your application adapts — cover letter, video and texts, tailored to exactly that job.",
    anlass: "For the job search · for a career change · when your resume alone doesn't show what you can do",
    grund: "A PDF gets skimmed and forgotten. A page where you speak stays open.",
    privat: "Your page stays private unless you share it yourself.",
    zentraleH: "Your application headquarters",
    features: [
      { t: "Your application video — no preparation.", d: "No text, nothing to memorise. We write your script from your resume — you record yourself once, briefly, and the AI does the rest: your recording becomes your professional speaking video. So real that nobody notices." },
      { t: "Does the job fit you?", d: "Paste the ad — a link or its text is enough. You get an honest percentage and see in black and white what fits and what's missing. Before you invest a single minute." },
      { t: "Your application adapts.", d: "One click, and profile text, focus areas and positioning are tailored to the ad. Nothing is invented — everything comes from your real resume, just emphasised right." },
      { t: "The complete package, per job.", d: "A cover letter in the language of the ad. Your dossier with your video. Every application under its own address — ready to send." },
    ],
    kontrastH: "No job portal has this",
    kontrast: "There, your profile shows every company the same thing. Here, every company gets an application tailored to its ad — with cover letter and video.",
    preisH: "One link that grows with you",
    preisEinmal: "one-time — script, video and finished page",
    preisMonat: "per month — your applications stay online, unlimited tailoring, cancel monthly",
    preisOhne: "Without the subscription your page stays reachable for 30 days.",
    faqH: "Frequently asked questions",
    faq: [
      { q: "Do I need to be good on camera?", a: "No. You read your script as often as you like until one take works. Nobody sees the attempts before it." },
      { q: "Doesn't this look unprofessional?", a: "It's your face and your voice — the AI turns your own recording into the professional video. So real that nobody notices." },
      { q: "Who can see my page?", a: "Only people who get the link from you. Your contact details are released only when you agree." },
      { q: "What if my goal changes?", a: "You tell the page. New industry, new role, new focus — done in a minute." },
    ],
    schlussH: "Your next application is a link.",
    schlussP: "Upload your resume, record the script, done. In ten minutes.",
    ctaStart: "Start now", ctaProfil: "Create profile",
  },
  ro: {
    kicker: "Pentru aplicația ta",
    h1A: "Pentru fiecare job, ", h1Y: "aplicația perfectă", h1B: ".",
    lead: "Adaugă un anunț de angajare și vezi în procente cât de bine ți se potrivește. Apoi aplicația ta se adaptează — scrisoare de intenție, video și texte, croite exact pe acel job.",
    anlass: "Pentru căutarea unui job · pentru reconversie · când CV-ul singur nu arată ce poți",
    grund: "Un PDF e răsfoit și uitat. O pagină pe care vorbești tu rămâne deschisă.",
    privat: "Pagina ta rămâne privată până o distribui chiar tu.",
    zentraleH: "Centrala ta de aplicări",
    features: [
      { t: "Videoul tău de aplicare — fără pregătire.", d: "Fără text, fără memorat. Îți scriem scenariul din CV-ul tău — te filmezi o dată, scurt, iar restul îl face AI-ul: din înregistrarea ta iese videoul tău profesionist. Atât de real încât nimeni nu observă." },
      { t: "Ți se potrivește jobul?", d: "Adaugă anunțul — un link sau textul lui e de ajuns. Primești un procent onest și vezi negru pe alb ce se potrivește și ce lipsește. Înainte să investești măcar un minut." },
      { t: "Aplicația ta se adaptează.", d: "Un click, și textul de profil, punctele forte și poziționarea se croiesc pe anunț. Nimic inventat — totul vine din CV-ul tău real, doar accentuat corect." },
      { t: "Dosarul complet, pentru fiecare job.", d: "Scrisoare de intenție în limba anunțului. Dosarul tău cu videoul tău. Fiecare aplicare sub propria adresă — gata de trimis." },
    ],
    kontrastH: "Niciun portal de joburi nu are asta",
    kontrast: "Acolo, profilul tău arată tuturor firmelor același lucru. Aici, fiecare firmă primește o aplicație croită pe anunțul ei — cu scrisoare de intenție și video.",
    preisH: "Un link care crește odată cu tine",
    preisEinmal: "o singură dată — scenariu, video și pagină gata",
    preisMonat: "pe lună — aplicările tale rămân online, croieli nelimitate, anulezi lunar",
    preisOhne: "Fără abonament, pagina ta rămâne accesibilă 30 de zile.",
    faqH: "Întrebări frecvente",
    faq: [
      { q: "Trebuie să fiu bun în fața camerei?", a: "Nu. Îți citești scenariul de câte ori vrei, până iese o dublă bună. Nimeni nu vede încercările dinainte." },
      { q: "Nu pare neserios?", a: "E fața ta și vocea ta — AI-ul transformă propria ta înregistrare în videoul profesionist. Atât de real încât nimeni nu observă." },
      { q: "Cine îmi poate vedea pagina?", a: "Doar cine primește linkul de la tine. Datele tale de contact devin vizibile doar cu acordul tău." },
      { q: "Și dacă mi se schimbă obiectivul?", a: "Îi spui paginii. Industrie nouă, rol nou, focus nou — gata într-un minut." },
    ],
    schlussH: "Următoarea ta aplicare este un link.",
    schlussP: "Încarci CV-ul, vorbești scenariul, gata. În zece minute.",
    ctaStart: "Începe acum", ctaProfil: "Creează profilul",
  },
  es: {
    kicker: "Para tu candidatura",
    h1A: "Para cada puesto, la ", h1Y: "candidatura perfecta", h1B: ".",
    lead: "Pega una oferta de empleo y ve en porcentaje si encaja contigo. Después tu candidatura se adapta — carta de presentación, vídeo y textos, hechos a medida de ese puesto.",
    anlass: "Para buscar trabajo · para un cambio de carrera · cuando el currículum solo no muestra lo que sabes",
    grund: "Un PDF se hojea y se olvida. Una página en la que hablas tú queda abierta.",
    privat: "Tu página es privada hasta que tú la compartas.",
    zentraleH: "Tu central de candidaturas",
    features: [
      { t: "Tu vídeo de candidatura — sin preparación.", d: "Sin texto, nada que memorizar. Te escribimos el guion desde tu currículum — te grabas una vez, brevemente, y la IA hace el resto: de tu grabación sale tu vídeo profesional. Tan real que nadie lo nota." },
      { t: "¿Encaja el puesto contigo?", d: "Pega la oferta — basta un enlace o su texto. Recibes un porcentaje honesto y ves negro sobre blanco qué encaja y qué falta. Antes de invertir un solo minuto." },
      { t: "Tu candidatura se adapta.", d: "Un clic, y el texto de perfil, los enfoques y el posicionamiento se ajustan a la oferta. Nada se inventa — todo sale de tu currículum real, solo bien acentuado." },
      { t: "El dossier completo, por puesto.", d: "Carta de presentación en el idioma de la oferta. Tu dossier con tu vídeo. Cada candidatura bajo su propia dirección — lista para enviar." },
    ],
    kontrastH: "Esto no lo tiene ningún portal de empleo",
    kontrast: "Allí tu perfil muestra a todas las empresas lo mismo. Aquí cada empresa recibe una candidatura hecha a medida de su oferta — con carta y vídeo.",
    preisH: "Un enlace que crece contigo",
    preisEinmal: "pago único — guion, vídeo y página terminada",
    preisMonat: "al mes — tus candidaturas siguen online, ajustes ilimitados, cancelable cada mes",
    preisOhne: "Sin suscripción, tu página sigue accesible 30 días.",
    faqH: "Preguntas frecuentes",
    faq: [
      { q: "¿Tengo que ser bueno ante la cámara?", a: "No. Lees tu guion tantas veces como quieras hasta que una toma salga bien. Nadie ve los intentos anteriores." },
      { q: "¿No parece poco serio?", a: "Es tu cara y tu voz — la IA convierte tu propia grabación en el vídeo profesional. Tan real que nadie lo nota." },
      { q: "¿Quién puede ver mi página?", a: "Solo quien reciba el enlace de ti. Tus datos de contacto solo se liberan con tu consentimiento." },
      { q: "¿Y si cambia mi objetivo?", a: "Se lo dices a la página. Nuevo sector, nuevo rol, nuevo enfoque — listo en un minuto." },
    ],
    schlussH: "Tu próxima candidatura es un enlace.",
    schlussP: "Subes el currículum, grabas el guion, listo. En diez minutos.",
    ctaStart: "Empieza ahora", ctaProfil: "Crear perfil",
  },
  fr: {
    kicker: "Pour ta candidature",
    h1A: "Pour chaque poste, la ", h1Y: "candidature parfaite", h1B: ".",
    lead: "Colle une offre d'emploi et vois en pourcentage si elle te correspond. Ensuite ta candidature s'adapte — lettre de motivation, vidéo et textes, taillés pour ce poste précis.",
    anlass: "Pour la recherche d'emploi · pour une reconversion · quand le CV seul ne montre pas ce que tu vaux",
    grund: "Un PDF est survolé puis oublié. Une page où tu parles reste ouverte.",
    privat: "Ta page reste privée tant que tu ne la partages pas.",
    zentraleH: "Ta centrale de candidatures",
    features: [
      { t: "Ta vidéo de candidature — sans préparation.", d: "Pas de texte, rien à apprendre par cœur. Nous écrivons ton script à partir de ton CV — tu te filmes une fois, brièvement, et l'IA fait le reste : ton enregistrement devient ta vidéo professionnelle. Si vraie que personne ne le remarque." },
      { t: "Le poste te correspond-il ?", d: "Colle l'annonce — un lien ou son texte suffit. Tu reçois un pourcentage honnête et tu vois noir sur blanc ce qui correspond et ce qui manque. Avant d'investir une seule minute." },
      { t: "Ta candidature s'adapte.", d: "Un clic, et le texte de profil, les priorités et le positionnement sont taillés pour l'annonce. Rien n'est inventé — tout vient de ton vrai CV, juste bien mis en valeur." },
      { t: "Le dossier complet, par poste.", d: "Lettre de motivation dans la langue de l'annonce. Ton dossier avec ta vidéo. Chaque candidature sous sa propre adresse — prête à envoyer." },
    ],
    kontrastH: "Aucun portail d'emploi n'a ça",
    kontrast: "Là-bas, ton profil montre la même chose à toutes les entreprises. Ici, chaque entreprise reçoit une candidature taillée pour son annonce — avec lettre et vidéo.",
    preisH: "Un lien qui grandit avec toi",
    preisEinmal: "en une fois — script, vidéo et page terminée",
    preisMonat: "par mois — tes candidatures restent en ligne, ajustements illimités, résiliable chaque mois",
    preisOhne: "Sans abonnement, ta page reste accessible 30 jours.",
    faqH: "Questions fréquentes",
    faq: [
      { q: "Faut-il être bon devant la caméra ?", a: "Non. Tu lis ton script autant de fois que tu veux, jusqu'à la bonne prise. Personne ne voit les essais d'avant." },
      { q: "Ça ne fait pas amateur ?", a: "C'est ton visage et ta voix — l'IA transforme ton propre enregistrement en vidéo professionnelle. Si vraie que personne ne le remarque." },
      { q: "Qui peut voir ma page ?", a: "Seulement ceux qui reçoivent le lien de toi. Tes coordonnées ne sont libérées qu'avec ton accord." },
      { q: "Et si mon objectif change ?", a: "Tu le dis à la page. Nouveau secteur, nouveau rôle, nouveau focus — réglé en une minute." },
    ],
    schlussH: "Ta prochaine candidature est un lien.",
    schlussP: "CV ajouté, script enregistré, terminé. En dix minutes.",
    ctaStart: "Commencer", ctaProfil: "Créer le profil",
  },
  pt: {
    kicker: "Para a tua candidatura",
    h1A: "Para cada vaga, a ", h1Y: "candidatura perfeita", h1B: ".",
    lead: "Cola um anúncio de emprego e vê em percentagem se combina contigo. Depois a tua candidatura adapta-se — carta de apresentação, vídeo e textos, feitos à medida dessa vaga.",
    anlass: "Para procurar emprego · para mudar de carreira · quando o CV sozinho não mostra o que vales",
    grund: "Um PDF é folheado e esquecido. Uma página onde tu falas fica aberta.",
    privat: "A tua página fica privada até seres tu a partilhá-la.",
    zentraleH: "A tua central de candidaturas",
    features: [
      { t: "O teu vídeo de candidatura — sem preparação.", d: "Sem texto, nada para decorar. Escrevemos-te o guião a partir do teu CV — gravas-te uma vez, brevemente, e a IA faz o resto: da tua gravação nasce o teu vídeo profissional. Tão real que ninguém repara." },
      { t: "A vaga combina contigo?", d: "Cola o anúncio — basta um link ou o texto. Recebes uma percentagem honesta e vês preto no branco o que combina e o que falta. Antes de investires um único minuto." },
      { t: "A tua candidatura adapta-se.", d: "Um clique, e o texto de perfil, os focos e o posicionamento ajustam-se ao anúncio. Nada é inventado — tudo vem do teu CV real, só bem acentuado." },
      { t: "O dossier completo, por vaga.", d: "Carta de apresentação na língua do anúncio. O teu dossier com o teu vídeo. Cada candidatura sob o seu próprio endereço — pronta a enviar." },
    ],
    kontrastH: "Nenhum portal de emprego tem isto",
    kontrast: "Lá, o teu perfil mostra o mesmo a todas as empresas. Aqui, cada empresa recebe uma candidatura feita à medida do seu anúncio — com carta e vídeo.",
    preisH: "Um link que cresce contigo",
    preisEinmal: "pagamento único — guião, vídeo e página pronta",
    preisMonat: "por mês — as tuas candidaturas ficam online, ajustes ilimitados, cancelável todos os meses",
    preisOhne: "Sem subscrição, a tua página fica acessível 30 dias.",
    faqH: "Perguntas frequentes",
    faq: [
      { q: "Tenho de ser bom diante da câmara?", a: "Não. Lês o teu guião as vezes que quiseres, até uma gravação sair bem. Ninguém vê as tentativas anteriores." },
      { q: "Não parece pouco sério?", a: "É a tua cara e a tua voz — a IA transforma a tua própria gravação no vídeo profissional. Tão real que ninguém repara." },
      { q: "Quem pode ver a minha página?", a: "Só quem receber o link de ti. Os teus contactos só ficam visíveis com o teu acordo." },
      { q: "E se o meu objetivo mudar?", a: "Dizes à página. Novo setor, nova função, novo foco — resolvido num minuto." },
    ],
    schlussH: "A tua próxima candidatura é um link.",
    schlussP: "Carregas o CV, gravas o guião, pronto. Em dez minutos.",
    ctaStart: "Começar agora", ctaProfil: "Criar perfil",
  },
  it: {
    kicker: "Per la tua candidatura",
    h1A: "Per ogni posto, la ", h1Y: "candidatura perfetta", h1B: ".",
    lead: "Incolla un annuncio di lavoro e vedi in percentuale quanto ti corrisponde. Poi la tua candidatura si adatta — lettera di presentazione, video e testi, cuciti su quel posto preciso.",
    anlass: "Per cercare lavoro · per cambiare carriera · quando il CV da solo non mostra quanto vali",
    grund: "Un PDF viene sfogliato e dimenticato. Una pagina in cui parli tu resta aperta.",
    privat: "La tua pagina resta privata finché non la condividi tu.",
    zentraleH: "La tua centrale delle candidature",
    features: [
      { t: "Il tuo video di candidatura — senza preparazione.", d: "Niente testo, niente da imparare a memoria. Ti scriviamo il copione dal tuo CV — ti riprendi una volta, brevemente, e il resto lo fa l'IA: dalla tua ripresa nasce il tuo video professionale. Così vero che nessuno se ne accorge." },
      { t: "Il posto ti corrisponde?", d: "Incolla l'annuncio — basta un link o il testo. Ricevi una percentuale onesta e vedi nero su bianco cosa corrisponde e cosa manca. Prima di investire un solo minuto." },
      { t: "La tua candidatura si adatta.", d: "Un clic, e testo del profilo, priorità e posizionamento vengono cuciti sull'annuncio. Niente di inventato — tutto viene dal tuo vero CV, solo accentuato bene." },
      { t: "Il dossier completo, per ogni posto.", d: "Lettera di presentazione nella lingua dell'annuncio. Il tuo dossier con il tuo video. Ogni candidatura sotto il suo indirizzo — pronta da inviare." },
    ],
    kontrastH: "Questo nessun portale di lavoro ce l'ha",
    kontrast: "Lì il tuo profilo mostra a tutte le aziende la stessa cosa. Qui ogni azienda riceve una candidatura cucita sul suo annuncio — con lettera e video.",
    preisH: "Un link che cresce con te",
    preisEinmal: "una tantum — copione, video e pagina finita",
    preisMonat: "al mese — le tue candidature restano online, adattamenti illimitati, disdici ogni mese",
    preisOhne: "Senza abbonamento la tua pagina resta raggiungibile per 30 giorni.",
    faqH: "Domande frequenti",
    faq: [
      { q: "Devo essere bravo davanti alla camera?", a: "No. Leggi il tuo copione tutte le volte che vuoi, finché una ripresa non funziona. Nessuno vede i tentativi precedenti." },
      { q: "Non sembra poco serio?", a: "È il tuo viso e la tua voce — l'IA trasforma la tua stessa ripresa nel video professionale. Così vero che nessuno se ne accorge." },
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
        <H1 className="mt-1">{t.h1A}<Y>{t.h1Y}</Y>{t.h1B}</H1>
        <Lead className="mt-2">{t.lead}</Lead>
        <ThemenVorspann anlass={t.anlass} grund={t.grund} wieGeht={[]} wieGehtPrivat={t.privat} />

        <LandingKarte sprache={L} titel={t.kicker}
          href="/themes/lebenslauf/start"
          teilenUrl="/themes/lebenslauf?utm_source=share" teilenText={t.kicker}
          preisZeile={`${t.ctaStart} — ${einmal}`}
          /* Sprechvideo: oben ankern, nie den Kopf abschneiden (Skill `card`). */
          ausrichtung="oben"
          folien={[{ video: BEISPIEL_VIDEO, poster: BEISPIEL_POSTER }]} />

        {/* ───── DIE FEATURE-KARTE — „Deine Bewerbungszentrale" auf der Creme-Fläche
            (Haus-Muster Video Card + Feature Card; vier Blöcke in Nutzer-Reihenfolge:
            erst das Sofort-Erlebnis Video, dann die Maschine je Stelle). ───── */}
        <section className="mt-10">
          <SectionTitle>{t.zentraleH}</SectionTitle>
          <div className="lb-karte mt-4 overflow-hidden rounded-[20px] px-5 py-2 shadow-[0_18px_50px_rgba(0,0,0,0.38)]">
            {t.features.map((f, i) => (
              <div key={f.t} className={`py-4 ${i === 0 ? "" : "border-t border-[#1a160f]/[0.11]"}`}>
                <p className="text-[15px] font-black leading-snug">{f.t}</p>
                <p className="mt-1.5 text-[13.5px] font-medium leading-snug opacity-75">{f.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ───── DER KONTRAST-BLOCK — erledigt die Konkurrenz, ohne sie gross zu machen. ───── */}
        <section className="mt-10">
          <SectionTitle>{t.kontrastH}</SectionTitle>
          <p className="mt-3 border-l border-white/25 pl-3 text-[15px] font-black leading-snug text-white/90">
            {t.kontrast}
          </p>
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
