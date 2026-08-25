import TopNav from "@/components/TopNav";
import LebenslaufBeispiel from "@/components/LebenslaufBeispiel";
import LebenslaufAnzeigeEinstieg from "@/components/LebenslaufAnzeigeEinstieg";
import TrackView from "@/components/TrackView";
import SeitenFuss from "@/components/SeitenFuss";
import { Knopf } from "@/components/CI";
import { Kicker, H1, Y, Lead, SectionTitle, Fine } from "@/components/Landing";
import BewerbungszentraleFeatures from "@/components/BewerbungszentraleFeatures";
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
    h1A: "Für jede Stelle die ", h1Y: "perfekte Bewerbung", h1B: ".",
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
    feldP: "Stellenanzeige oder Link einfügen",
    ctaStart: "Jetzt starten", ctaProfil: "Profil erstellen", ctaGratis: "Gratis weitermachen",
  },
  en: {
    kicker: "For your application",
    h1A: "The ", h1Y: "perfect application", h1B: " for every job.",
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
    feldP: "Paste the job ad or a link",
    ctaStart: "Start now", ctaProfil: "Create profile", ctaGratis: "Continue for free",
  },
  ro: {
    kicker: "Pentru aplicația ta",
    h1A: "Pentru fiecare job, ", h1Y: "aplicația perfectă", h1B: ".",
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
    feldP: "Inserează anunțul sau un link",
    ctaStart: "Începe acum", ctaProfil: "Creează profilul", ctaGratis: "Continuă gratuit",
  },
  es: {
    kicker: "Para tu candidatura",
    h1A: "Para cada puesto, la ", h1Y: "candidatura perfecta", h1B: ".",
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
    feldP: "Pega el anuncio o un enlace",
    ctaStart: "Empieza ahora", ctaProfil: "Crear perfil", ctaGratis: "Continúa gratis",
  },
  fr: {
    kicker: "Pour ta candidature",
    h1A: "Pour chaque poste, la ", h1Y: "candidature parfaite", h1B: ".",
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
    feldP: "Colle l'annonce ou un lien",
    ctaStart: "Commencer", ctaProfil: "Créer le profil", ctaGratis: "Continue gratuitement",
  },
  pt: {
    kicker: "Para a tua candidatura",
    h1A: "Para cada vaga, a ", h1Y: "candidatura perfeita", h1B: ".",
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
    feldP: "Cola o anúncio ou um link",
    ctaStart: "Começar agora", ctaProfil: "Criar perfil", ctaGratis: "Continua grátis",
  },
  it: {
    kicker: "Per la tua candidatura",
    h1A: "Per ogni posto, la ", h1Y: "candidatura perfetta", h1B: ".",
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
    feldP: "Incolla l'annuncio o un link",
    ctaStart: "Inizia ora", ctaProfil: "Crea il profilo", ctaGratis: "Continua gratis",
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
        {/* DER EINSTIEG IST DIE HANDLUNG (Owner 25.08.2026, diktiert: „direkt drunter
            kommt ein Inputfeld … Drunter Button Gratis weitermachen", danach zweimal
            beschnitten: Feld-Text KURZ („Stellenanzeige oder Link einfügen soll es
            heissen") und die grosse Video-Karte RAUS („grosse kard raus") — was bleibt,
            ist weiter unten das kleine Muster-Profil (LebenslaufBeispiel). */}
        <LebenslaufAnzeigeEinstieg platzhalter={t.feldP} cta={t.ctaGratis} />

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
