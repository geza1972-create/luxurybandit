import TopNav from "@/components/TopNav";
import SpracheAmDokument from "@/components/SpracheAmDokument";
import LebenslaufBeispiel from "@/components/LebenslaufBeispiel";
import LebenslaufAnzeigeEinstieg from "@/components/LebenslaufAnzeigeEinstieg";
import TrackView from "@/components/TrackView";
import SeitenFuss from "@/components/SeitenFuss";
import { Knopf } from "@/components/CI";
import { Kicker, H1, Y, Lead, SectionTitle, Fine } from "@/components/Landing";
import BewerbungszentraleFeatures from "@/components/BewerbungszentraleFeatures";
import HilfeChat from "@/components/HilfeChat";
import { textbausteineInSprache } from "@/lib/lebenslauf-uebersetzen";
import { resolveLang } from "@/lib/lang-server";
import { eur, themenPreisCents, LEBENSLAUF_MONAT_CENTS } from "@/lib/pricing";

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

type Frage = { q: string; a: string };
type Copy = {
  kicker: string; h1A: string; h1Y: string; h1B: string;
  /* Der Satz über dem Feld (Owner 25.08.2026, auf Rumänisch diktiert). */
  heroLead: string;
  feldP: string;
  kontrastH: string; kontrast: string;
  preisH: string; preisEinmal: string; preisMonat: string; preisOhne: string;
  faqH: string; faq: Frage[];
  schlussH: string; schlussP: string;
  ctaStart: string; ctaProfil: string; ctaGratis: string;
};

const TEXTE: Record<string, Copy> = {
  de: {
    kicker: "Für deine Bewerbung",
    heroLead: "Füg die Anzeige ein, die du gefunden hast — wir machen deinen Lebenslauf. Passend für jede Anzeige.",
    h1A: "Suchst du einen Job im Ausland? ", h1Y: "Fang jetzt an", h1B: ".",
    kontrastH: "Das hat kein Jobportal",
    kontrast: "Du bekommst eine eigene Webseite — in sieben Sprachen, mit deinem Video und einem Chat, über den Firmen dich direkt erreichen. Deine Bewerbung liegt nicht als PDF in einem Postfach, sie hat eine Adresse. Das bekommst du nirgendwo sonst.",
    preisH: "Ein Link, der mit dir mitwächst",
    preisEinmal: "je Bewerbung — Skript, Video bis 1 Minute und fertige Seite",
    preisMonat: "im Monat — ab dem ersten Kauf, damit deine Bewerbungen online bleiben; monatlich kündbar",
    preisOhne: "Ohne Abo bleibt deine Bewerbung nur 3 Tage gespeichert. Kündigst du später, bleiben deine Seiten noch 30 Tage erreichbar.",
    faqH: "Häufige Fragen",
    faq: [
      { q: "Muss ich gut vor der Kamera sein?", a: "Nein. Du liest dein Skript ab, so oft du willst, bis eine Aufnahme sitzt. Niemand sieht die Versuche davor." },
      { q: "Wirkt das nicht unseriös?", a: "Es ist dein Gesicht und deine Stimme — die KI macht aus deiner eigenen Aufnahme das professionelle Video. So echt, dass es niemand merkt." },
      { q: "Wer kann meine Seite sehen?", a: "Nur wer den Link von dir bekommt. Deine Kontaktdaten werden erst frei, wenn du zustimmst." },
      { q: "Was, wenn sich mein Ziel ändert?", a: "Du sagst es der Seite. Neue Branche, neue Rolle, neuer Schwerpunkt — in einer Minute erledigt." },
    ],
    schlussH: "Deine nächste Bewerbung ist ein Link.",
    schlussP: "Lebenslauf hochladen, Skript einsprechen, fertig. In zehn Minuten.",
    feldP: "Stellenanzeige oder Link einfügen",
    ctaStart: "Jetzt starten", ctaProfil: "Profil erstellen", ctaGratis: "Gratis weitermachen",
  },
  en: {
    kicker: "For your application",
    heroLead: "Paste the ad you found and we build your CV — tailored to every ad.",
    h1A: "Looking for a job abroad? ", h1Y: "Start now", h1B: ".",
    kontrastH: "No job portal has this",
    kontrast: "You get your own web page — in seven languages, with your video and a chat companies use to reach you directly. Your application isn't a PDF in an inbox, it has an address. You won't get that anywhere else.",
    preisH: "One link that grows with you",
    preisEinmal: "per application — script, video up to 1 minute and finished page",
    preisMonat: "per month — from the first purchase, so your applications stay online; cancel monthly",
    preisOhne: "Without the subscription your application is kept for 3 days only. If you cancel later, your pages stay reachable for another 30 days.",
    faqH: "Frequently asked questions",
    faq: [
      { q: "Do I need to be good on camera?", a: "No. You read your script as often as you like until one take works. Nobody sees the attempts before it." },
      { q: "Doesn't this look unprofessional?", a: "It's your face and your voice — the AI turns your own recording into the professional video. So real that nobody notices." },
      { q: "Who can see my page?", a: "Only people who get the link from you. Your contact details are released only when you agree." },
      { q: "What if my goal changes?", a: "You tell the page. New industry, new role, new focus — done in a minute." },
    ],
    schlussH: "Your next application is a link.",
    schlussP: "Upload your resume, record the script, done. In ten minutes.",
    feldP: "Paste the job ad or a link",
    ctaStart: "Start now", ctaProfil: "Create profile", ctaGratis: "Continue for free",
  },
  ro: {
    kicker: "Pentru aplicația ta",
    heroLead: "Bagă anunțul care l-ai găsit și îți facem CV-ul. Potrivit pentru fiecare anunț.",
    h1A: "Cauți un job în străinătate? ", h1Y: "Începe acuma", h1B: ".",
    kontrastH: "Niciun portal de joburi nu are asta",
    kontrast: "Primești propria ta pagină web — în șapte limbi, cu videoul tău și un chat prin care firmele te contactează direct. Aplicația ta nu e un PDF într-o căsuță de e-mail, are o adresă. Asta nu găsești nicăieri altundeva.",
    preisH: "Un link care crește odată cu tine",
    preisEinmal: "pentru fiecare aplicare — scenariu, video de până la 1 minut și pagină gata",
    preisMonat: "pe lună — de la prima achiziție, ca aplicările tale să rămână online; anulezi lunar",
    preisOhne: "Fără abonament, aplicația ta se păstrează doar 3 zile. Dacă anulezi mai târziu, paginile tale rămân accesibile încă 30 de zile.",
    faqH: "Întrebări frecvente",
    faq: [
      { q: "Trebuie să fiu bun în fața camerei?", a: "Nu. Îți citești scenariul de câte ori vrei, până iese o dublă bună. Nimeni nu vede încercările dinainte." },
      { q: "Nu pare neserios?", a: "E fața ta și vocea ta — AI-ul transformă propria ta înregistrare în videoul profesionist. Atât de real încât nimeni nu observă." },
      { q: "Cine îmi poate vedea pagina?", a: "Doar cine primește linkul de la tine. Datele tale de contact devin vizibile doar cu acordul tău." },
      { q: "Și dacă mi se schimbă obiectivul?", a: "Îi spui paginii. Industrie nouă, rol nou, focus nou — gata într-un minut." },
    ],
    schlussH: "Următoarea ta aplicare este un link.",
    schlussP: "Încarci CV-ul, vorbești scenariul, gata. În zece minute.",
    feldP: "Inserează anunțul sau un link",
    ctaStart: "Începe acum", ctaProfil: "Creează profilul", ctaGratis: "Continuă gratuit",
  },
  es: {
    kicker: "Para tu candidatura",
    heroLead: "Pega el anuncio que encontraste y te hacemos el currículum. Adaptado a cada anuncio.",
    h1A: "¿Buscas trabajo en el extranjero? ", h1Y: "Empieza ahora", h1B: ".",
    kontrastH: "Esto no lo tiene ningún portal de empleo",
    kontrast: "Recibes tu propia página web — en siete idiomas, con tu vídeo y un chat con el que las empresas te contactan directamente. Tu candidatura no es un PDF en un buzón, tiene una dirección. Eso no lo encuentras en ningún otro sitio.",
    preisH: "Un enlace que crece contigo",
    preisEinmal: "por candidatura — guion, vídeo de hasta 1 minuto y página terminada",
    preisMonat: "al mes — desde la primera compra, para que tus candidaturas sigan online; cancelable cada mes",
    preisOhne: "Sin suscripción tu candidatura se guarda solo 3 días. Si cancelas más tarde, tus páginas siguen accesibles 30 días más.",
    faqH: "Preguntas frecuentes",
    faq: [
      { q: "¿Tengo que ser bueno ante la cámara?", a: "No. Lees tu guion tantas veces como quieras hasta que una toma salga bien. Nadie ve los intentos anteriores." },
      { q: "¿No parece poco serio?", a: "Es tu cara y tu voz — la IA convierte tu propia grabación en el vídeo profesional. Tan real que nadie lo nota." },
      { q: "¿Quién puede ver mi página?", a: "Solo quien reciba el enlace de ti. Tus datos de contacto solo se liberan con tu consentimiento." },
      { q: "¿Y si cambia mi objetivo?", a: "Se lo dices a la página. Nuevo sector, nuevo rol, nuevo enfoque — listo en un minuto." },
    ],
    schlussH: "Tu próxima candidatura es un enlace.",
    schlussP: "Subes el currículum, grabas el guion, listo. En diez minutos.",
    feldP: "Pega el anuncio o un enlace",
    ctaStart: "Empieza ahora", ctaProfil: "Crear perfil", ctaGratis: "Continúa gratis",
  },
  fr: {
    kicker: "Pour ta candidature",
    heroLead: "Colle l'annonce que tu as trouvée et on fait ton CV. Adapté à chaque annonce.",
    h1A: "Tu cherches un emploi à l'étranger ? ", h1Y: "Commence maintenant", h1B: ".",
    kontrastH: "Aucun portail d'emploi n'a ça",
    kontrast: "Tu reçois ta propre page web — en sept langues, avec ta vidéo et un chat par lequel les entreprises te contactent directement. Ta candidature n'est pas un PDF dans une boîte mail, elle a une adresse. Ça, tu ne le trouves nulle part ailleurs.",
    preisH: "Un lien qui grandit avec toi",
    preisEinmal: "par candidature — script, vidéo jusqu'à 1 minute et page terminée",
    preisMonat: "par mois — dès le premier achat, pour que tes candidatures restent en ligne ; résiliable chaque mois",
    preisOhne: "Sans abonnement, ta candidature n'est conservée que 3 jours. Si tu résilies plus tard, tes pages restent accessibles 30 jours de plus.",
    faqH: "Questions fréquentes",
    faq: [
      { q: "Faut-il être bon devant la caméra ?", a: "Non. Tu lis ton script autant de fois que tu veux, jusqu'à la bonne prise. Personne ne voit les essais d'avant." },
      { q: "Ça ne fait pas amateur ?", a: "C'est ton visage et ta voix — l'IA transforme ton propre enregistrement en vidéo professionnelle. Si vraie que personne ne le remarque." },
      { q: "Qui peut voir ma page ?", a: "Seulement ceux qui reçoivent le lien de toi. Tes coordonnées ne sont libérées qu'avec ton accord." },
      { q: "Et si mon objectif change ?", a: "Tu le dis à la page. Nouveau secteur, nouveau rôle, nouveau focus — réglé en une minute." },
    ],
    schlussH: "Ta prochaine candidature est un lien.",
    schlussP: "CV ajouté, script enregistré, terminé. En dix minutes.",
    feldP: "Colle l'annonce ou un lien",
    ctaStart: "Commencer", ctaProfil: "Créer le profil", ctaGratis: "Continue gratuitement",
  },
  pt: {
    kicker: "Para a tua candidatura",
    heroLead: "Cola o anúncio que encontraste e fazemos o teu CV. Adaptado a cada anúncio.",
    h1A: "Procuras trabalho no estrangeiro? ", h1Y: "Começa agora", h1B: ".",
    kontrastH: "Nenhum portal de emprego tem isto",
    kontrast: "Recebes a tua própria página web — em sete línguas, com o teu vídeo e um chat através do qual as empresas te contactam diretamente. A tua candidatura não é um PDF numa caixa de correio, tem um endereço. Isso não encontras em mais lado nenhum.",
    preisH: "Um link que cresce contigo",
    preisEinmal: "por candidatura — guião, vídeo até 1 minuto e página pronta",
    preisMonat: "por mês — desde a primeira compra, para as tuas candidaturas ficarem online; cancelável todos os meses",
    preisOhne: "Sem subscrição, a tua candidatura só fica guardada 3 dias. Se cancelares mais tarde, as tuas páginas ficam acessíveis mais 30 dias.",
    faqH: "Perguntas frequentes",
    faq: [
      { q: "Tenho de ser bom diante da câmara?", a: "Não. Lês o teu guião as vezes que quiseres, até uma gravação sair bem. Ninguém vê as tentativas anteriores." },
      { q: "Não parece pouco sério?", a: "É a tua cara e a tua voz — a IA transforma a tua própria gravação no vídeo profissional. Tão real que ninguém repara." },
      { q: "Quem pode ver a minha página?", a: "Só quem receber o link de ti. Os teus contactos só ficam visíveis com o teu acordo." },
      { q: "E se o meu objetivo mudar?", a: "Dizes à página. Novo setor, nova função, novo foco — resolvido num minuto." },
    ],
    schlussH: "A tua próxima candidatura é um link.",
    schlussP: "Carregas o CV, gravas o guião, pronto. Em dez minutos.",
    feldP: "Cola o anúncio ou um link",
    ctaStart: "Começar agora", ctaProfil: "Criar perfil", ctaGratis: "Continua grátis",
  },
  it: {
    kicker: "Per la tua candidatura",
    heroLead: "Incolla l'annuncio che hai trovato e ti facciamo il CV. Su misura per ogni annuncio.",
    h1A: "Cerchi un lavoro all'estero? ", h1Y: "Inizia ora", h1B: ".",
    kontrastH: "Questo nessun portale di lavoro ce l'ha",
    kontrast: "Ricevi la tua pagina web — in sette lingue, con il tuo video e una chat con cui le aziende ti contattano direttamente. La tua candidatura non è un PDF in una casella di posta, ha un indirizzo. Questo non lo trovi da nessun'altra parte.",
    preisH: "Un link che cresce con te",
    preisEinmal: "per candidatura — copione, video fino a 1 minuto e pagina finita",
    preisMonat: "al mese — dal primo acquisto, così le tue candidature restano online; disdici ogni mese",
    preisOhne: "Senza abbonamento la tua candidatura resta salvata solo 3 giorni. Se disdici più tardi, le tue pagine restano raggiungibili altri 30 giorni.",
    faqH: "Domande frequenti",
    faq: [
      { q: "Devo essere bravo davanti alla camera?", a: "No. Leggi il tuo copione tutte le volte che vuoi, finché una ripresa non funziona. Nessuno vede i tentativi precedenti." },
      { q: "Non sembra poco serio?", a: "È il tuo viso e la tua voce — l'IA trasforma la tua stessa ripresa nel video professionale. Così vero che nessuno se ne accorge." },
      { q: "Chi può vedere la mia pagina?", a: "Solo chi riceve il link da te. I tuoi contatti si sbloccano solo con il tuo consenso." },
      { q: "E se il mio obiettivo cambia?", a: "Lo dici alla pagina. Nuovo settore, nuovo ruolo, nuovo focus — fatto in un minuto." },
    ],
    schlussH: "La tua prossima candidatura è un link.",
    schlussP: "Carichi il CV, registri il copione, fatto. In dieci minuti.",
    feldP: "Incolla l'annuncio o un link",
    ctaStart: "Inizia ora", ctaProfil: "Crea il profilo", ctaGratis: "Continua gratis",
  },
};

/**
 * DER HILFE-CHAT (Owner 25.08.2026: „wir können eine Hilfchat machen auf der Seite. Zum
 * Aus-/Einklappen") — deutsche Quelle, zur Laufzeit übersetzt wie die Muster-Seite. Die
 * drei Fragen sind nicht beliebig: Es sind die drei, an denen genau diese Zielgruppe
 * hängen bleibt — die Sprache, der Preis, die Dauer.
 */
const HILFE_QUELLE = {
  auf: "Hast du eine Frage?",
  zu: "Frage schliessen",
  titel: "Häufige Fragen",
  f1: "Muss ich die Sprache gut können?",
  a1: "Nein. Du bekommst den Text in der Sprache, die du für dein Video wählst — du liest ihn nur ab. Oder du sprichst in deiner eigenen Sprache. Dein Lebenslauf wird ohnehin automatisch übersetzt.",
  f2: "Was kostet es genau?",
  a2: "19 € für jede Bewerbung: Skript, Video bis 1 Minute und die fertige Seite. Dazu 4,99 € im Monat ab dem ersten Kauf, damit deine Bewerbungen online bleiben — monatlich kündbar.",
  f3: "Wie lange dauert das?",
  a3: "Die Prozentzahl und die Analyse bekommst du sofort und gratis. Für die fertige Bewerbung brauchst du deinen Lebenslauf, ein Foto und eine kurze Aufnahme von dir — zusammen etwa zehn Minuten.",
  frei: "Etwas anderes? Schreib es uns — wir antworten dir noch heute.",
  platzhalter: "Deine Frage …",
  mailPlatzhalter: "Deine E-Mail für die Antwort",
  senden: "Senden",
  danke: "Ist raus — wir antworten dir noch heute.",
  mailFehler: "Bitte gib eine gültige E-Mail an.",
};

export default async function LebenslaufThemePage() {
  const L = await resolveLang("ro");
  const t = TEXTE[L] ?? TEXTE.en;
  const preisCents = themenPreisCents("lebenslauf");
  const einmal = eur(preisCents, L);
  const monat = eur(LEBENSLAUF_MONAT_CENTS, L);
  const hilfe = await textbausteineInSprache(HILFE_QUELLE, L);

  return (
    <main className="lb-bg lb-zentrale min-h-screen text-white">
      <SpracheAmDokument lang={L} />
      <TopNav marke="LB - AI Recruiting" heim="/themes/lebenslauf" motto="Video Applications" />
      <TrackView event="lebenslauf_view" lookId="themes-lebenslauf" lookName="Lebenslauf-Thema" />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3 md:max-w-[760px]">
        {/* ───── HERO ───── */}
        <Kicker>{t.kicker}</Kicker>
        <H1 className="mt-1">{t.h1A}<Y>{t.h1Y}</Y>{t.h1B}</H1>
        {/* DER SATZ, DER DIE ZIELGRUPPE ANSPRICHT (Owner 25.08.2026, auf Rumänisch
            diktiert: „Cauți un job în străinătate? Începe acuma. Bagă anunțul care l-ai
            găsit și îți facem CV-ul.") — er nennt die Lage (Job im Ausland), die Handlung
            (Anzeige einfügen) und das Ergebnis (dein Lebenslauf, passend zur Anzeige).
            Die rumänische Fassung ist der ORIGINAL-Wortlaut des Owners, die anderen sechs
            sind daraus übersetzt. */}
        <Lead className="mt-2">{t.heroLead}</Lead>
        {/* DER EINSTIEG IST DIE HANDLUNG (Owner 25.08.2026, diktiert: „direkt drunter
            kommt ein Inputfeld … Drunter Button Gratis weitermachen", danach zweimal
            beschnitten: Feld-Text KURZ („Stellenanzeige oder Link einfügen soll es
            heissen") und die grosse Video-Karte RAUS („grosse kard raus") — was bleibt,
            ist weiter unten das kleine Muster-Profil (LebenslaufBeispiel). */}
        <LebenslaufAnzeigeEinstieg platzhalter={t.feldP} cta={t.ctaGratis} />

        {/* ───── ZUERST DAS MUSTER, DANN DIE FEATURES (Owner 25.08.2026: „Das kommt
            unter dem Block mit dem Inserat. Dann Centrala ta de aplicări") — wer die
            Anzeige eingefügt hat, will als Nächstes SEHEN, was dabei herauskommt; die
            Aufzählung, was das Werkzeug alles kann, überzeugt erst danach. ───── */}
        <LebenslaufBeispiel lang={L} />

        {/* ───── DIE FEATURE-KARTE — EIN Baustein für Landingpage UND Tunnel (Memory
            `tunnel-zeigt-landingpage-inhalt`), Texte siehe BewerbungszentraleFeatures. ───── */}
        <BewerbungszentraleFeatures lang={L} />

        {/* ───── DER KONTRAST-BLOCK — erledigt die Konkurrenz, ohne sie gross zu machen. ───── */}
        <section className="mt-10">
          <SectionTitle>{t.kontrastH}</SectionTitle>
          <p className="mt-3 border-l border-white/25 pl-3 text-[15px] font-black leading-snug text-white/90">
            {t.kontrast}
          </p>
        </section>



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

        {/* ───── DER HILFE-CHAT — eingeklappt, direkt vor dem Abschluss (Owner
            25.08.2026). Er steht NACH den Fragen und VOR dem letzten Knopf: Wer bis
            hierher gelesen hat und noch zögert, hat genau eine offene Frage — und findet
            hier den Weg, sie zu stellen, statt die Seite zu verlassen. ───── */}
        <HilfeChat texte={hilfe} />

        {/* ───── ABSCHLUSS ───── */}
        <section className="mt-10">
          <SectionTitle>{t.schlussH}</SectionTitle>
          <Lead className="mt-3">{t.schlussP}</Lead>
          <div className="mt-4">
            <Knopf art="umriss" href="/themes/lebenslauf/start">{t.ctaStart}</Knopf>
          </div>
        </section>
      </div>
      <SeitenFuss marke="LB - AI Recruiting" />
    </main>
  );
}
