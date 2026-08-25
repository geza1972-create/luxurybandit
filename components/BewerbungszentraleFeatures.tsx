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

/**
 * DER SPRACH-BLOCK STEHT GANZ OBEN (Owner 25.08.2026, auf Rumänisch diktiert: „Nu știi
 * limba bine? Nu-i o problemă …", dann: „das kommt als erstes") — und das ist die richtige
 * Stelle: Bei Rumänen, die sich im Ausland bewerben, ist die Sprache nicht EINE Sorge unter
 * vielen, sondern die Hürde, an der die meisten aufhören zu lesen. Wer sie zuerst abräumt,
 * bekommt überhaupt erst Aufmerksamkeit für Match, Video und Mappe.
 * Der Block verspricht dreierlei: Text in der Sprache deiner Wahl zum Ablesen, oder sprich
 * in deiner eigenen — und der Lebenslauf übersetzt sich ohnehin in sieben Sprachen.
 */
const TEXTE: Record<string, { titel: string; features: Feature[]; zugabe: string }> = {
  de: {
    titel: "Deine Bewerbungszentrale",
    zugabe: "Und du siehst, was passiert: Recruiter schauen sich deine Bewerbung an — und du erfährst, wer dein Video sehen wollte.",
    features: [
      { t: "Deine Sprache sitzt noch nicht? Kein Problem.", d: "Wir geben dir den Text in der Sprache, die du fürs Video wählst — du liest ihn nur ab. Oder du sprichst in deiner Sprache: Englisch, Rumänisch, wie du willst. Deine Entscheidung. Und die Texte deines Lebenslaufs werden automatisch in sieben Sprachen übersetzt." },
      { t: "Was du für dein Geld bekommst.", d: "Eine eigene Webseite mit eigener Adresse — in sieben Sprachen, mit deinem Video darin und einem Chat, über den Firmen dich erreichen. Dazu Anschreiben und Lebenslauf als PDF. Kein Anhang im Postfach: eine Bewerbung, die man anschauen kann." },
      { t: "Passt die Stelle zu dir?", d: "Anzeige einfügen — Link oder Text reicht. Du bekommst eine ehrliche Prozentzahl und siehst schwarz auf weiss, was passt und was fehlt. Bevor du auch nur eine Minute investierst." },
      { t: "Deine Bewerbung passt sich an.", d: "Ein Klick, und Profiltext, Schwerpunkte und Positionierung werden auf die Anzeige zugeschnitten. Nichts wird erfunden — alles kommt aus deinem echten Lebenslauf, nur richtig betont. Und feilen kannst du per Anweisung: Ein Satz wie „schreib das selbstbewusster“ genügt — die Bewerbung schreibt sich um." },
      { t: "Dein Bewerbungsvideo — ohne Vorbereitung.", d: "Kein Text, kein Auswendiglernen. Das Skript schreiben wir dir aus deinem Lebenslauf — du nimmst dich einmal kurz auf, den Rest macht die KI: Aus deiner Aufnahme wird dein professionelles Sprechvideo. So echt, dass es niemand merkt." },
      { t: "Die komplette Mappe, je Stelle.", d: "Anschreiben in der Sprache der Anzeige. Dein Dossier mit deinem Video. Jede Bewerbung unter eigener Adresse — fertig zum Verschicken." },
    ],
  },
  en: {
    titel: "Your application headquarters",
    zugabe: "And you see what happens: recruiters view your application — and you learn who wanted to watch your video.",
    features: [
      { t: "Your language isn't perfect? No problem.", d: "We give you the script in the language you choose for the video — you just read it out. Or you speak in your own language: English, Romanian, whatever suits you. Your choice. And the texts in your CV are translated automatically into seven languages." },
      { t: "What you get for your money.", d: "Your own web page with its own address — in seven languages, with your video in it and a chat companies use to reach you. Plus cover letter and resume as PDF. Not an attachment in an inbox: an application people can watch." },
      { t: "Does the job fit you?", d: "Paste the ad — a link or its text is enough. You get an honest percentage and see in black and white what fits and what's missing. Before you invest a single minute." },
      { t: "Your application adapts.", d: "One click, and profile text, focus areas and positioning are tailored to the ad. Nothing is invented — everything comes from your real resume, just emphasised right. And you can fine-tune it by prompt: one sentence like “make it more confident” is enough — the application rewrites itself." },
      { t: "Your application video — no preparation.", d: "No text, nothing to memorise. We write your script from your resume — you record yourself once, briefly, and the AI does the rest: your recording becomes your professional speaking video. So real that nobody notices." },
      { t: "The complete package, per job.", d: "A cover letter in the language of the ad. Your dossier with your video. Every application under its own address — ready to send." },
    ],
  },
  ro: {
    titel: "Centrala ta de aplicări",
    zugabe: "Și vezi ce se întâmplă: recruiterii îți văd aplicația — și afli cine a vrut să-ți vadă videoul.",
    features: [
      { t: "Nu știi limba bine? Nu-i o problemă.", d: "Îți dăm textul în limba pe care o alegi pentru video — tu doar îl citești. Sau vorbești în limba ta: engleză, română, cum vrei tu. E alegerea ta. Iar textele din CV-ul tău se traduc automat în șapte limbi." },
      { t: "Ce primești de banii tăi.", d: "O pagină web proprie, cu adresa ta — în șapte limbi, cu videoul tău în ea și un chat prin care firmele te contactează. Plus scrisoarea de intenție și CV-ul ca PDF. Nu un atașament într-o căsuță: o aplicație pe care o poți vedea." },
      { t: "Ți se potrivește jobul?", d: "Adaugă anunțul — un link sau textul lui e de ajuns. Primești un procent onest și vezi negru pe alb ce se potrivește și ce lipsește. Înainte să investești măcar un minut." },
      { t: "Aplicația ta se adaptează.", d: "Un click, și textul de profil, punctele forte și poziționarea se croiesc pe anunț. Nimic inventat — totul vine din CV-ul tău real, doar accentuat corect. Și poți șlefui prin instrucțiuni: o propoziție ca „scrie mai încrezător” e de ajuns — aplicația se rescrie." },
      { t: "Videoul tău de aplicare — fără pregătire.", d: "Fără text, fără memorat. Îți scriem scenariul din CV-ul tău — te filmezi o dată, scurt, iar restul îl face AI-ul: din înregistrarea ta iese videoul tău profesionist. Atât de real încât nimeni nu observă." },
      { t: "Dosarul complet, pentru fiecare job.", d: "Scrisoare de intenție în limba anunțului. Dosarul tău cu videoul tău. Fiecare aplicare sub propria adresă — gata de trimis." },
    ],
  },
  es: {
    titel: "Tu central de candidaturas",
    zugabe: "Y ves lo que pasa: los recruiters ven tu candidatura — y sabes quién quiso ver tu vídeo.",
    features: [
      { t: "¿Tu idioma no es perfecto? No es problema.", d: "Te damos el texto en el idioma que elijas para el vídeo — tú solo lo lees. O hablas en tu idioma: inglés, rumano, el que quieras. Tú decides. Y los textos de tu currículum se traducen automáticamente a siete idiomas." },
      { t: "Qué recibes por tu dinero.", d: "Tu propia página web con su dirección — en siete idiomas, con tu vídeo dentro y un chat con el que las empresas te contactan. Además carta y currículum en PDF. No un adjunto en un buzón: una candidatura que se puede ver." },
      { t: "¿Encaja el puesto contigo?", d: "Pega la oferta — basta un enlace o su texto. Recibes un porcentaje honesto y ves negro sobre blanco qué encaja y qué falta. Antes de invertir un solo minuto." },
      { t: "Tu candidatura se adapta.", d: "Un clic, y el texto de perfil, los enfoques y el posicionamiento se ajustan a la oferta. Nada se inventa — todo sale de tu currículum real, solo bien acentuado. Y puedes afinarla con una instrucción: una frase como «hazlo más seguro» basta — la candidatura se reescribe." },
      { t: "Tu vídeo de candidatura — sin preparación.", d: "Sin texto, nada que memorizar. Te escribimos el guion desde tu currículum — te grabas una vez, brevemente, y la IA hace el resto: de tu grabación sale tu vídeo profesional. Tan real que nadie lo nota." },
      { t: "El dossier completo, por puesto.", d: "Carta de presentación en el idioma de la oferta. Tu dossier con tu vídeo. Cada candidatura bajo su propia dirección — lista para enviar." },
    ],
  },
  fr: {
    titel: "Ta centrale de candidatures",
    zugabe: "Et tu vois ce qui se passe : les recruteurs consultent ta candidature — et tu sais qui a voulu voir ta vidéo.",
    features: [
      { t: "Ta langue n'est pas encore parfaite ? Aucun problème.", d: "On te donne le texte dans la langue que tu choisis pour la vidéo — tu n'as qu'à le lire. Ou tu parles dans ta langue : anglais, roumain, comme tu veux. C'est ton choix. Et les textes de ton CV sont traduits automatiquement en sept langues." },
      { t: "Ce que tu reçois pour ton argent.", d: "Ta propre page web avec sa propre adresse — en sept langues, avec ta vidéo dedans et un chat par lequel les entreprises te joignent. Plus lettre et CV en PDF. Pas une pièce jointe dans une boîte mail : une candidature qu'on peut regarder." },
      { t: "Le poste te correspond-il ?", d: "Colle l'annonce — un lien ou son texte suffit. Tu reçois un pourcentage honnête et tu vois noir sur blanc ce qui correspond et ce qui manque. Avant d'investir une seule minute." },
      { t: "Ta candidature s'adapte.", d: "Un clic, et le texte de profil, les priorités et le positionnement sont taillés pour l'annonce. Rien n'est inventé — tout vient de ton vrai CV, juste bien mis en valeur. Et tu peux l'affiner par consigne : une phrase comme « rends-le plus confiant » suffit — la candidature se réécrit." },
      { t: "Ta vidéo de candidature — sans préparation.", d: "Pas de texte, rien à apprendre par cœur. Nous écrivons ton script à partir de ton CV — tu te filmes une fois, brièvement, et l'IA fait le reste : ton enregistrement devient ta vidéo professionnelle. Si vraie que personne ne le remarque." },
      { t: "Le dossier complet, par poste.", d: "Lettre de motivation dans la langue de l'annonce. Ton dossier avec ta vidéo. Chaque candidature sous sa propre adresse — prête à envoyer." },
    ],
  },
  pt: {
    titel: "A tua central de candidaturas",
    zugabe: "E vês o que acontece: os recruiters veem a tua candidatura — e sabes quem quis ver o teu vídeo.",
    features: [
      { t: "A tua língua ainda não está perfeita? Sem problema.", d: "Damos-te o texto na língua que escolheres para o vídeo — só tens de o ler. Ou falas na tua língua: inglês, romeno, como quiseres. A escolha é tua. E os textos do teu CV são traduzidos automaticamente para sete línguas." },
      { t: "O que recebes pelo teu dinheiro.", d: "Uma página web própria, com o teu endereço — em sete línguas, com o teu vídeo lá dentro e um chat através do qual as empresas te contactam. Mais carta e CV em PDF. Não um anexo numa caixa de correio: uma candidatura que se pode ver." },
      { t: "A vaga combina contigo?", d: "Cola o anúncio — basta um link ou o texto. Recebes uma percentagem honesta e vês preto no branco o que combina e o que falta. Antes de investires um único minuto." },
      { t: "A tua candidatura adapta-se.", d: "Um clique, e o texto de perfil, os focos e o posicionamento ajustam-se ao anúncio. Nada é inventado — tudo vem do teu CV real, só bem acentuado. E podes afinar por instrução: uma frase como «torna-o mais confiante» chega — a candidatura reescreve-se." },
      { t: "O teu vídeo de candidatura — sem preparação.", d: "Sem texto, nada para decorar. Escrevemos-te o guião a partir do teu CV — gravas-te uma vez, brevemente, e a IA faz o resto: da tua gravação nasce o teu vídeo profissional. Tão real que ninguém repara." },
      { t: "O dossier completo, por vaga.", d: "Carta de apresentação na língua do anúncio. O teu dossier com o teu vídeo. Cada candidatura sob o seu próprio endereço — pronta a enviar." },
    ],
  },
  it: {
    titel: "La tua centrale delle candidature",
    zugabe: "E vedi cosa succede: i recruiter guardano la tua candidatura — e sai chi voleva vedere il tuo video.",
    features: [
      { t: "La tua lingua non è ancora perfetta? Nessun problema.", d: "Ti diamo il testo nella lingua che scegli per il video — devi solo leggerlo. Oppure parli nella tua lingua: inglese, rumeno, come vuoi. La scelta è tua. E i testi del tuo CV vengono tradotti automaticamente in sette lingue." },
      { t: "Cosa ricevi per i tuoi soldi.", d: "Una pagina web tua, con il tuo indirizzo — in sette lingue, con il tuo video dentro e una chat con cui le aziende ti raggiungono. Più lettera e CV in PDF. Non un allegato in una casella: una candidatura che si può guardare." },
      { t: "Il posto ti corrisponde?", d: "Incolla l'annuncio — basta un link o il testo. Ricevi una percentuale onesta e vedi nero su bianco cosa corrisponde e cosa manca. Prima di investire un solo minuto." },
      { t: "La tua candidatura si adatta.", d: "Un clic, e testo del profilo, priorità e posizionamento vengono cuciti sull'annuncio. Niente di inventato — tutto viene dal tuo vero CV, solo accentuato bene. E puoi rifinirla con un'istruzione: una frase come «rendilo più sicuro» basta — la candidatura si riscrive." },
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
      {/* DIE ZUGABE-ZEILE ist zurueck (Owner 25.08.2026: Views muessen auch in die
          Beschreibung) — ehrlich, seit die Zaehler im selben Stand gebaut sind. */}
      <p className="mt-4 text-[13.5px] font-bold leading-snug text-white/75">{t.zugabe}</p>
    </section>
  );
}
