import { SectionTitle } from "@/components/Landing";

/**
 * DIE FEATURE-KARTE „DEINE BEWERBUNGSZENTRALE" — EIN BAUSTEIN, ZWEI ORTE (Memory
 * `tunnel-zeigt-landingpage-inhalt`): Landingpage UND Tunnel zeigen dieselben vier
 * Verkaufs-Blöcke (Owner 25.08.2026: „Wir haben hier Features, die verkaufen müssen …
 * Das sind Features, die keiner hat"). Vier Blöcke in TRICHTER-Reihenfolge (Owner
 * 25.08., Korrektur: „Zuerst 1. Passt die Anzeige zu dir? 2. Deine Bewerbung anpassen.
 * 3. Professionelles Video. 4. Bewerbung raus") — auf der Creme-Fläche des Hauses,
 * wie das Dossier selbst.
 *
 * Texte wörtlich aus KONZEPT-BEWERBUNGSZENTRALE.md (abgenommen 25.08.); „Lebenslauf als
 * PDF" und die Zugabe-Zeile fehlen mit Absicht, bis Stufe 2/Zentrale sie halten.
 */

type Feature = { t: string; d: string };

const TEXTE: Record<string, { titel: string; features: Feature[] }> = {
  de: {
    titel: "Deine Bewerbungszentrale",
    features: [
      { t: "Passt die Stelle zu dir?", d: "Anzeige einfügen — Link oder Text reicht. Du bekommst eine ehrliche Prozentzahl und siehst schwarz auf weiss, was passt und was fehlt. Bevor du auch nur eine Minute investierst." },
      { t: "Deine Bewerbung passt sich an.", d: "Ein Klick, und Profiltext, Schwerpunkte und Positionierung werden auf die Anzeige zugeschnitten. Nichts wird erfunden — alles kommt aus deinem echten Lebenslauf, nur richtig betont." },
      { t: "Dein Bewerbungsvideo — ohne Vorbereitung.", d: "Kein Text, kein Auswendiglernen. Das Skript schreiben wir dir aus deinem Lebenslauf — du nimmst dich einmal kurz auf, den Rest macht die KI: Aus deiner Aufnahme wird dein professionelles Sprechvideo. So echt, dass es niemand merkt." },
      { t: "Die komplette Mappe, je Stelle.", d: "Anschreiben in der Sprache der Anzeige. Dein Dossier mit deinem Video. Jede Bewerbung unter eigener Adresse — fertig zum Verschicken." },
    ],
  },
  en: {
    titel: "Your application headquarters",
    features: [
      { t: "Does the job fit you?", d: "Paste the ad — a link or its text is enough. You get an honest percentage and see in black and white what fits and what's missing. Before you invest a single minute." },
      { t: "Your application adapts.", d: "One click, and profile text, focus areas and positioning are tailored to the ad. Nothing is invented — everything comes from your real resume, just emphasised right." },
      { t: "Your application video — no preparation.", d: "No text, nothing to memorise. We write your script from your resume — you record yourself once, briefly, and the AI does the rest: your recording becomes your professional speaking video. So real that nobody notices." },
      { t: "The complete package, per job.", d: "A cover letter in the language of the ad. Your dossier with your video. Every application under its own address — ready to send." },
    ],
  },
  ro: {
    titel: "Centrala ta de aplicări",
    features: [
      { t: "Ți se potrivește jobul?", d: "Adaugă anunțul — un link sau textul lui e de ajuns. Primești un procent onest și vezi negru pe alb ce se potrivește și ce lipsește. Înainte să investești măcar un minut." },
      { t: "Aplicația ta se adaptează.", d: "Un click, și textul de profil, punctele forte și poziționarea se croiesc pe anunț. Nimic inventat — totul vine din CV-ul tău real, doar accentuat corect." },
      { t: "Videoul tău de aplicare — fără pregătire.", d: "Fără text, fără memorat. Îți scriem scenariul din CV-ul tău — te filmezi o dată, scurt, iar restul îl face AI-ul: din înregistrarea ta iese videoul tău profesionist. Atât de real încât nimeni nu observă." },
      { t: "Dosarul complet, pentru fiecare job.", d: "Scrisoare de intenție în limba anunțului. Dosarul tău cu videoul tău. Fiecare aplicare sub propria adresă — gata de trimis." },
    ],
  },
  es: {
    titel: "Tu central de candidaturas",
    features: [
      { t: "¿Encaja el puesto contigo?", d: "Pega la oferta — basta un enlace o su texto. Recibes un porcentaje honesto y ves negro sobre blanco qué encaja y qué falta. Antes de invertir un solo minuto." },
      { t: "Tu candidatura se adapta.", d: "Un clic, y el texto de perfil, los enfoques y el posicionamiento se ajustan a la oferta. Nada se inventa — todo sale de tu currículum real, solo bien acentuado." },
      { t: "Tu vídeo de candidatura — sin preparación.", d: "Sin texto, nada que memorizar. Te escribimos el guion desde tu currículum — te grabas una vez, brevemente, y la IA hace el resto: de tu grabación sale tu vídeo profesional. Tan real que nadie lo nota." },
      { t: "El dossier completo, por puesto.", d: "Carta de presentación en el idioma de la oferta. Tu dossier con tu vídeo. Cada candidatura bajo su propia dirección — lista para enviar." },
    ],
  },
  fr: {
    titel: "Ta centrale de candidatures",
    features: [
      { t: "Le poste te correspond-il ?", d: "Colle l'annonce — un lien ou son texte suffit. Tu reçois un pourcentage honnête et tu vois noir sur blanc ce qui correspond et ce qui manque. Avant d'investir une seule minute." },
      { t: "Ta candidature s'adapte.", d: "Un clic, et le texte de profil, les priorités et le positionnement sont taillés pour l'annonce. Rien n'est inventé — tout vient de ton vrai CV, juste bien mis en valeur." },
      { t: "Ta vidéo de candidature — sans préparation.", d: "Pas de texte, rien à apprendre par cœur. Nous écrivons ton script à partir de ton CV — tu te filmes une fois, brièvement, et l'IA fait le reste : ton enregistrement devient ta vidéo professionnelle. Si vraie que personne ne le remarque." },
      { t: "Le dossier complet, par poste.", d: "Lettre de motivation dans la langue de l'annonce. Ton dossier avec ta vidéo. Chaque candidature sous sa propre adresse — prête à envoyer." },
    ],
  },
  pt: {
    titel: "A tua central de candidaturas",
    features: [
      { t: "A vaga combina contigo?", d: "Cola o anúncio — basta um link ou o texto. Recebes uma percentagem honesta e vês preto no branco o que combina e o que falta. Antes de investires um único minuto." },
      { t: "A tua candidatura adapta-se.", d: "Um clique, e o texto de perfil, os focos e o posicionamento ajustam-se ao anúncio. Nada é inventado — tudo vem do teu CV real, só bem acentuado." },
      { t: "O teu vídeo de candidatura — sem preparação.", d: "Sem texto, nada para decorar. Escrevemos-te o guião a partir do teu CV — gravas-te uma vez, brevemente, e a IA faz o resto: da tua gravação nasce o teu vídeo profissional. Tão real que ninguém repara." },
      { t: "O dossier completo, por vaga.", d: "Carta de apresentação na língua do anúncio. O teu dossier com o teu vídeo. Cada candidatura sob o seu próprio endereço — pronta a enviar." },
    ],
  },
  it: {
    titel: "La tua centrale delle candidature",
    features: [
      { t: "Il posto ti corrisponde?", d: "Incolla l'annuncio — basta un link o il testo. Ricevi una percentuale onesta e vedi nero su bianco cosa corrisponde e cosa manca. Prima di investire un solo minuto." },
      { t: "La tua candidatura si adatta.", d: "Un clic, e testo del profilo, priorità e posizionamento vengono cuciti sull'annuncio. Niente di inventato — tutto viene dal tuo vero CV, solo accentuato bene." },
      { t: "Il tuo video di candidatura — senza preparazione.", d: "Niente testo, niente da imparare a memoria. Ti scriviamo il copione dal tuo CV — ti riprendi una volta, brevemente, e il resto lo fa l'IA: dalla tua ripresa nasce il tuo video professionale. Così vero che nessuno se ne accorge." },
      { t: "Il dossier completo, per ogni posto.", d: "Lettera di presentazione nella lingua dell'annuncio. Il tuo dossier con il tuo video. Ogni candidatura sotto il suo indirizzo — pronta da inviare." },
    ],
  },
};

export default function BewerbungszentraleFeatures({ lang = "en" }: { lang?: string }) {
  const t = TEXTE[lang] ?? TEXTE.en;
  return (
    <section className="mt-10">
      <SectionTitle>{t.titel}</SectionTitle>
      <div className="lb-karte mt-4 overflow-hidden rounded-[20px] px-5 py-2 shadow-[0_18px_50px_rgba(0,0,0,0.38)]">
        {t.features.map((f, i) => (
          <div key={f.t} className={`py-4 ${i === 0 ? "" : "border-t border-[#1a160f]/[0.11]"}`}>
            <p className="text-[15px] font-black leading-snug">{f.t}</p>
            <p className="mt-1.5 text-[13.5px] font-medium leading-snug opacity-75">{f.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
