import type { Lang } from "@/lib/lang";

/**
 * DIE RECHTSTEXTE VON LAKATOSBANDI.COM — Impressum, Datenschutz, AGB in EN · RO · DE (Owner
 * 10.09.2026, mit Bild des Fußes „Confidențialitate · Termeni": „die Inhalte musst du umschreiben
 * auf diesen Seiten").
 *
 * WARUM EIGENE TEXTE: Die Haus-Seiten (`/privacy`, `/terms`) beschreiben LuxuryBandit — Geschenke,
 * Modelle, David. Ein Künstler auf lakatosbandi.com fand dort nichts über seine Bilder, den Agenten,
 * die Anfragen seiner Käufer oder das Abo. Die Haus-Seiten bleiben, wie sie sind; auf
 * lakatosbandi.com zeigen dieselben Adressen diese Fassung (Rewrite in next.config.mjs).
 *
 * BESCHREIBT, WAS DER CODE TUT (Stand 10.09.2026), nicht was schön klingt:
 *  · Chat mit dem Agenten (app/api/versusforge-agent) · Bilder im Chat werden angesehen und geprüft
 *    (OpenAI), aber nicht abgelegt · Werke aus dem Dashboard liegen in Supabase (Frankfurt) ·
 *    markierte Werke bis zur Entscheidung in einer Prüfablage · abgelehnte Aktfotos werden nie
 *    gespeichert · Freigabe durch einen Menschen innerhalb von 3 Tagen · Anfragen von Käufern (Name,
 *    Telefon, Antworten) gehen an den Künstler · Abo über Stripe, erst nach 3 Interessenten gefragt,
 *    14-Tage-Frist (lib/versusforge-abo.ts) · Login per Mail-Link · Meta-Pixel nur nach Zustimmung.
 *  · Betreiber und Steuernummer wie im Haus-Impressum (app/imprint/page.tsx).
 *
 * KEIN ANWALT HAT DAS GEPRÜFT — das steht in der Roadmap als offen und muss vor dem Start passieren.
 * Englisch ist die verbindliche Fassung; das steht auf jeder Seite.
 *
 * `{preis}` = Abo-Preis aus lib/pricing.ts, im Code eingesetzt. Keine geraden Anführungszeichen.
 */
export type RechtAbschnitt = { h: string; p: string[] };
export type RechtSeite = { titel: string; intro?: string; abschnitte: RechtAbschnitt[] };
export type RechtTexte = {
  impressum: RechtSeite;
  datenschutz: RechtSeite;
  agb: RechtSeite;
  stand: string;
  sprachHinweis: string;
  kontaktWort: string;
};

const BETREIBER = "VersusForge · Bvd. Mihai Viteazu 44 · Timișoara, Romania";
const STEUER = "RO49830040";

const EN: RechtTexte = {
  impressum: {
    titel: "Imprint",
    abschnitte: [
      { h: "Operator", p: [`lakatosbandi.com is operated by ${BETREIBER}.`, `Tax number: ${STEUER} (freelancer, Romania).`] },
      { h: "Who is behind it", p: ["Geza Lakatos (Designer, Dipl., & AI Consultant) and Szidonia Bandi (artist)."] },
      { h: "Contact", p: ["For any request — including legal questions and data protection — please use our contact form. We answer every message."] },
      { h: "Technology", p: ["The platform runs on VersusForge, an AI marketing engine built by the operator."] },
    ],
  },
  datenschutz: {
    titel: "Privacy Policy",
    intro: "This policy explains which data lakatosbandi.com processes, why, and what rights you have. It covers artists who talk to our agent and use their dashboard, and visitors who contact an artist through the platform.",
    abschnitte: [
      { h: "1. Who is responsible", p: [`Controller: ${BETREIBER}, tax number ${STEUER}. Contact: our contact form.`] },
      { h: "2. If you are an artist", p: [
        "Conversation with our agent: the messages you write, your choices and the language you use. We need them to build your marketing plan, your sentences and your ads, and we keep a record of each conversation to check its quality and to improve the agent.",
        "Images in the conversation: pictures of your works that you add in the chat are analysed (medium, style, subject, what is rare) and automatically checked for prohibited content. They are used for that conversation and are not placed in our storage.",
        "Your page and dashboard: your name, email address, language, your sentences (hooks) and the works you upload in your dashboard. These works are stored on servers in Frankfurt, Germany. A work that our automatic check flags is kept in a separate review area until a person decides; if it is rejected, it is deleted. Nude photography is never stored.",
        "Review: every new artist is looked at by a person before the page goes public, usually within 3 days.",
        "Your consent to the portal: only if you say yes, your works appear in the overview of lakatosbandi.com. Your own page lakatosbandi.com/your-name exists after approval either way.",
        "Login: we send a link to your email address. There is no password.",
      ] },
      { h: "3. If you contact an artist", p: [
        "When you talk to an artist’s agent, we store your answers and the name and phone number you leave. We pass them to that artist so the artist can call you back, and we tell the artist by email that a new inquiry has arrived. The artist uses your details only to answer your inquiry.",
        "No sale takes place on lakatosbandi.com. Price and purchase are agreed directly between you and the artist.",
      ] },
      { h: "4. Payments", p: ["If an artist subscribes, payment is processed by Stripe. We never see or store full card details."] },
      /* FOLLOWER (Owner 13.09.2026: „die Follower bekommen auch Newsletter von uns. Muss im AGB
         stehen"). Beides gehört benannt: die Benachrichtigung über neue Werke UND unsere eigenen
         Neuigkeiten — sonst wäre die Einwilligung nur für das eine erteilt. */
      { h: "5. Email", p: [
        "We send emails that belong to the service: login links, new inquiries, the review decision and, for artists, the question about the subscription. Every email concerns your account or your inquiries; we do not sell addresses.",
        "If you follow an artist, you give us your email address for two purposes: we notify you when that artist adds a new work, and we occasionally send news about lakatosbandi.com. We only start after you confirm the link in our first email, and every email carries an unsubscribe link. You can withdraw your consent at any time.",
      ] },
      { h: "6. Service providers", p: [
        "We do not sell personal data. To run the platform we use: Supabase (database and file storage, servers in Frankfurt, Germany), Vercel (hosting), OpenAI (the AI agent, image analysis and the automatic content check), Stripe (payments) and an email provider for sending our emails. With your consent, Meta receives data from the Meta Pixel for ad measurement.",
        "Some providers are based outside the EU. Where data leaves the EU, the safeguards required by law apply (for example EU standard contractual clauses).",
      ] },
      { h: "7. Cookies and similar technologies", p: [
        "Essential: a cookie for your language, and a random device number in your browser that protects the agent from misuse (a daily limit). Without these, the platform does not work properly. If you send us feedback in the chat, we store your text, the language and the agent's last question, so we can improve the platform.",
        "Marketing: the Meta Pixel loads only after you accept it in the cookie banner. If you reject, it does not load.",
      ] },
      { h: "8. Legal basis", p: ["We process data to provide the service you asked for (Art. 6(1)(b) GDPR), on the basis of your consent where we ask for it — for example the portal overview or the Meta Pixel (Art. 6(1)(a)), and on the basis of our legitimate interest in a secure platform free of prohibited content (Art. 6(1)(f))."] },
      { h: "9. How long we keep data", p: ["We keep data as long as it is needed for the service. Artists can delete their page, their works and all inquiries at any time; visitors can ask us to delete their inquiry. Flagged works are deleted when they are rejected."] },
      { h: "10. Your rights", p: ["You have the right to access, correction, deletion, restriction, objection and data portability, and you can withdraw consent at any time. Use our contact form. You can also complain to a data protection authority — in Romania the ANSPDCP."] },
    ],
  },
  agb: {
    titel: "Terms of Service",
    intro: "These terms apply to lakatosbandi.com. By talking to our agent, creating your artist page or contacting an artist, you accept them.",
    abschnitte: [
      { h: "1. What lakatosbandi.com is", p: [
        `lakatosbandi.com is a marketing platform for artists, operated by ${BETREIBER}. We help artists present their works — with sentences, ads, an artist page and an AI agent that talks to interested buyers.`,
        "We do not sell art and do not take part in any sale. We take no commission. Any purchase is agreed directly between artist and buyer.",
      ] },
      { h: "2. Artists: admission and review", p: [
        "Anyone who paints can take part — there is no admission test, no minimum number of works and no waiting time. Your page is online right away. We may decline an application or remove a page, in particular if works are not the artist’s own, break the law or these terms.",
        "Your works appear in the overview of the portal only with your consent. You can withdraw it at any time.",
      ] },
      { h: "3. Your works and rights", p: [
        "You confirm that you are the author of the works you show or hold the necessary rights, and that nobody else’s rights are infringed.",
        "You allow us, for as long as your page exists, to store your works, display them on lakatosbandi.com, create sentences and ads from them for you and use them to promote the platform. You keep all rights to your works.",
        "Not allowed: works you did not make, content involving minors in any sexual context, illegal content. Painted and drawn nudes are welcome; nude photography is currently not accepted. Uploads are checked automatically and, if flagged, by a person.",
      ] },
      { h: "4. AI and results", p: [
        "Sentences, ads and the agent’s answers are created with the help of artificial intelligence. Check every text before you use it. AI can make mistakes.",
        "We do not guarantee sales, a number of inquiries or any particular result. Assessments of category and price are orientation, not a valuation.",
      ] },
      { h: "5. The agent and inquiries", p: [
        "The agent talks to visitors on the artist’s page, answers questions about the platform and collects name and phone number. It does not conclude contracts, does not negotiate binding prices and cannot promise anything on the artist’s behalf.",
        "The artist is responsible for answering inquiries and for any sale.",
      ] },
      { h: "6. Free start and subscription", p: [
        "Starting is free: your sentences, ads, page and agent.",
        /* Owner 11.09.2026: „es ist free jetzt wirklich. wir dürfen nicht von Kosten reden." */
        "Right now, all services are free, with no limit. If the agent becomes a paid service in the future, we will inform the artist beforehand; the artist decides whether to keep it.",
      ] },
      { h: "7. Visitors and buyers", p: [
        "A conversation with an agent is not an offer and not a purchase. Your details are passed to the artist so the artist can contact you.",
        /* Owner 13.09.2026: „die Follower bekommen auch Newsletter von uns. Muss im AGB stehen." */
        "Following an artist: you can give us your email address to be notified when that artist adds a new work, and to receive occasional news about lakatosbandi.com. It starts only after you confirm the link in our first email. Every email has an unsubscribe link, and we do not pass your address to the artist.",
      ] },
      { h: "8. Acceptable use", p: ["No misuse: no false information, no attempts to overload or break the platform, no use of the agent or our texts to deceive or harm others."] },
      { h: "9. Deletion", p: ["Artists can change or delete their page, their works and the sentences we wrote for them at any time. We may delete pages that break these terms."] },
      { h: "10. Liability", p: ["The platform is provided as it is. To the extent permitted by law, we are not liable for indirect damages, and our total liability is limited to the amount paid to us in the 12 months before the claim. Liability for intent and gross negligence remains unaffected.",
        "You are responsible for the works you publish here: that they are yours, that you hold the necessary rights and that showing them breaks no law and no third party’s rights. If someone raises a claim against us because of a work you published, you cover it."] },
      { h: "11. Changes and law", p: ["We may update these terms and publish the new version here with a new date. Romanian law applies."] },
    ],
  },
  stand: "Last updated: 10 September 2026",
  sprachHinweis: "These texts are available in English, Romanian and German. In case of any difference, the English version applies.",
  kontaktWort: "Contact form",
};

const RO: RechtTexte = {
  impressum: {
    titel: "Date legale",
    abschnitte: [
      { h: "Operator", p: [`lakatosbandi.com este operat de ${BETREIBER}.`, `Cod fiscal: ${STEUER} (persoană fizică autorizată, România).`] },
      { h: "Cine suntem", p: ["Geza Lakatos (designer diplomat & consultant AI) și Szidonia Bandi (artistă)."] },
      { h: "Contact", p: ["Pentru orice solicitare — inclusiv întrebări juridice și protecția datelor — folosește formularul nostru de contact. Răspundem la fiecare mesaj."] },
      { h: "Tehnologie", p: ["Platforma funcționează cu VersusForge, un motor de marketing AI construit de operator."] },
    ],
  },
  datenschutz: {
    titel: "Politica de confidențialitate",
    intro: "Această politică explică ce date prelucrează lakatosbandi.com, de ce și ce drepturi ai. Se aplică artiștilor care vorbesc cu agentul nostru și își folosesc dashboard-ul, precum și vizitatorilor care contactează un artist prin platformă.",
    abschnitte: [
      { h: "1. Cine este responsabil", p: [`Operator de date: ${BETREIBER}, cod fiscal ${STEUER}. Contact: formularul nostru de contact.`] },
      { h: "2. Dacă ești artist", p: [
        "Conversația cu agentul nostru: mesajele pe care le scrii, alegerile tale și limba folosită. Avem nevoie de ele pentru planul tău de marketing, frazele și reclamele tale și păstrăm o evidență a fiecărei conversații pentru a-i verifica calitatea și a îmbunătăți agentul.",
        "Imaginile din conversație: pozele lucrărilor tale adăugate în chat sunt analizate (tehnică, stil, subiect, ce e rar) și verificate automat pentru conținut interzis. Sunt folosite pentru acea conversație și nu sunt puse în spațiul nostru de stocare.",
        "Pagina și dashboard-ul tău: numele, adresa de e-mail, limba, frazele tale (hook-uri) și lucrările pe care le încarci în dashboard. Aceste lucrări sunt stocate pe servere din Frankfurt, Germania. O lucrare semnalată de verificarea automată este păstrată separat până decide un om; dacă este respinsă, se șterge. Fotografia de nud nu este stocată niciodată.",
        "Verificare: fiecare artist nou este văzut de un om înainte ca pagina să devină publică, de obicei în 3 zile.",
        "Acordul tău pentru portal: doar dacă spui da, lucrările tale apar în prezentarea generală de pe lakatosbandi.com. Pagina ta lakatosbandi.com/numele-tău există oricum după aprobare.",
        "Autentificare: îți trimitem un link pe e-mail. Nu există parolă.",
      ] },
      { h: "3. Dacă contactezi un artist", p: [
        "Când vorbești cu agentul unui artist, păstrăm răspunsurile tale și numele și numărul de telefon pe care le lași. Le transmitem acelui artist ca să te poată suna și îl anunțăm prin e-mail că a sosit o cerere nouă. Artistul folosește datele tale doar pentru a-ți răspunde.",
        "Pe lakatosbandi.com nu are loc nicio vânzare. Prețul și cumpărarea se stabilesc direct între tine și artist.",
      ] },
      { h: "4. Plăți", p: ["Dacă un artist se abonează, plata este procesată de Stripe. Nu vedem și nu stocăm niciodată datele complete ale cardului."] },
      { h: "5. E-mail", p: [
        "Trimitem e-mailuri care țin de serviciu: linkuri de autentificare, cereri noi, decizia de verificare și, pentru artiști, întrebarea despre abonament. Fiecare e-mail privește contul sau cererile tale; nu vindem adrese.",
        "Dacă urmărești un artist, ne dai adresa de e-mail pentru două scopuri: te anunțăm când acel artist adaugă o lucrare nouă și îți trimitem din când în când noutăți despre lakatosbandi.com. Începem abia după ce confirmi linkul din primul nostru e-mail, iar fiecare e-mail conține un link de dezabonare. Îți poți retrage acordul oricând.",
      ] },
      { h: "6. Furnizori de servicii", p: [
        "Nu vindem date personale. Pentru funcționarea platformei folosim: Supabase (bază de date și stocare de fișiere, servere în Frankfurt, Germania), Vercel (găzduire), OpenAI (agentul AI, analiza imaginilor și verificarea automată a conținutului), Stripe (plăți) și un furnizor de e-mail pentru trimiterea mesajelor. Cu acordul tău, Meta primește date de la Meta Pixel pentru măsurarea reclamelor.",
        "Unii furnizori se află în afara UE. Când datele părăsesc UE, se aplică garanțiile cerute de lege (de exemplu clauzele contractuale standard ale UE).",
      ] },
      { h: "7. Cookie-uri și tehnologii similare", p: [
        "Esențiale: un cookie pentru limbă și un număr aleatoriu de dispozitiv în browser care protejează agentul de abuz (o limită zilnică). Fără acestea, platforma nu funcționează corect. Dacă ne trimiți feedback în chat, păstrăm textul tău, limba și ultima întrebare a agentului, ca să îmbunătățim platforma.",
        "Marketing: Meta Pixel se încarcă doar după ce îl accepți în bannerul de cookie-uri. Dacă refuzi, nu se încarcă.",
      ] },
      { h: "8. Temeiul legal", p: ["Prelucrăm datele pentru a furniza serviciul pe care l-ai cerut (art. 6 alin. 1 lit. b GDPR), pe baza acordului tău acolo unde îl cerem — de exemplu pentru prezentarea din portal sau Meta Pixel (art. 6 alin. 1 lit. a) — și pe baza interesului nostru legitim pentru o platformă sigură, fără conținut interzis (art. 6 alin. 1 lit. f)."] },
      { h: "9. Cât timp păstrăm datele", p: ["Păstrăm datele cât timp sunt necesare pentru serviciu. Artiștii își pot șterge oricând pagina, lucrările și toate cererile; vizitatorii ne pot cere să le ștergem cererea. Lucrările semnalate se șterg când sunt respinse."] },
      { h: "10. Drepturile tale", p: ["Ai dreptul de acces, rectificare, ștergere, restricționare, opoziție și portabilitatea datelor și îți poți retrage oricând acordul. Folosește formularul de contact. Poți depune și o plângere la autoritatea de protecție a datelor — în România, ANSPDCP."] },
    ],
  },
  agb: {
    titel: "Termeni și condiții",
    intro: "Acești termeni se aplică pentru lakatosbandi.com. Vorbind cu agentul nostru, creându-ți pagina de artist sau contactând un artist, îi accepți.",
    abschnitte: [
      { h: "1. Ce este lakatosbandi.com", p: [
        `lakatosbandi.com este o platformă de marketing pentru artiști, operată de ${BETREIBER}. Ajutăm artiștii să-și prezinte lucrările — cu fraze, reclame, o pagină de artist și un agent AI care vorbește cu cumpărătorii interesați.`,
        "Nu vindem artă și nu participăm la nicio vânzare. Nu luăm comision. Orice cumpărare se stabilește direct între artist și cumpărător.",
      ] },
      { h: "2. Artiști: admitere și verificare", p: [
        "Poate participa oricine pictează — nu există examen de admitere, număr minim de lucrări sau timp de așteptare. Pagina ta e online imediat. Putem refuza o aplicare sau elimina o pagină, în special dacă lucrările nu aparțin artistului, încalcă legea sau acești termeni.",
        "Lucrările tale apar în prezentarea portalului doar cu acordul tău. Îl poți retrage oricând.",
      ] },
      { h: "3. Lucrările și drepturile tale", p: [
        "Confirmi că ești autorul lucrărilor pe care le arăți sau deții drepturile necesare și că nu încalci drepturile altcuiva.",
        "Ne permiți, cât timp există pagina ta, să stocăm lucrările, să le afișăm pe lakatosbandi.com, să creăm din ele fraze și reclame pentru tine și să le folosim pentru promovarea platformei. Toate drepturile asupra lucrărilor rămân ale tale.",
        "Nu este permis: lucrări pe care nu le-ai creat, conținut cu minori în orice context sexual, conținut ilegal. Nudurile pictate și desenate sunt binevenite; fotografia de nud nu este acceptată deocamdată. Încărcările sunt verificate automat și, dacă sunt semnalate, de un om.",
      ] },
      { h: "4. AI și rezultate", p: [
        "Frazele, reclamele și răspunsurile agentului sunt create cu ajutorul inteligenței artificiale. Verifică fiecare text înainte să-l folosești. AI poate greși.",
        "Nu garantăm vânzări, un număr de cereri sau un anumit rezultat. Aprecierile despre categorie și preț sunt orientative, nu o evaluare.",
      ] },
      { h: "5. Agentul și cererile", p: [
        "Agentul vorbește cu vizitatorii de pe pagina artistului, răspunde la întrebări despre platformă și strânge numele și numărul de telefon. Nu încheie contracte, nu negociază prețuri obligatorii și nu poate promite nimic în numele artistului.",
        "Artistul este responsabil pentru răspunsul la cereri și pentru orice vânzare.",
      ] },
      { h: "6. Început gratuit și abonament", p: [
        "Începutul este gratuit: frazele, reclamele, pagina și agentul tău.",
        "Acum toate serviciile sunt gratuite, fără limită. Dacă agentul va deveni cu plată în viitor, îl anunțăm pe artist dinainte; artistul decide dacă vrea să-l păstreze.",
      ] },
      { h: "7. Vizitatori și cumpărători", p: [
        "O conversație cu un agent nu este o ofertă și nici o cumpărare. Datele tale sunt transmise artistului ca să te poată contacta.",
        "Dacă urmărești un artist: ne poți da adresa de e-mail ca să fii anunțat când acel artist adaugă o lucrare nouă și ca să primești din când în când noutăți despre lakatosbandi.com. Începe abia după ce confirmi linkul din primul nostru e-mail. Fiecare e-mail conține un link de dezabonare, iar adresa ta nu este transmisă artistului.",
      ] },
      { h: "8. Utilizare corectă", p: ["Fără abuz: fără informații false, fără încercări de a supraîncărca sau strica platforma, fără folosirea agentului sau a textelor noastre pentru a înșela sau a face rău altora."] },
      { h: "9. Ștergere", p: ["Artiștii își pot modifica sau șterge oricând pagina, lucrările și frazele scrise de noi. Putem șterge paginile care încalcă acești termeni."] },
      { h: "10. Răspundere", p: ["Platforma este oferită așa cum este. În limitele permise de lege, nu răspundem pentru daune indirecte, iar răspunderea noastră totală este limitată la suma plătită nouă în cele 12 luni dinaintea reclamației. Răspunderea pentru intenție și culpă gravă rămâne neafectată.",
        "Răspunzi pentru lucrările pe care le publici aici: că îți aparțin, că ai drepturile necesare și că prezentarea lor nu încalcă legea sau drepturile altcuiva. Dacă cineva ne reclamă din cauza unei lucrări publicate de tine, suporți tu consecințele."] },
      { h: "11. Modificări și lege", p: ["Putem actualiza acești termeni și publicăm aici noua versiune cu o dată nouă. Se aplică legea română."] },
    ],
  },
  stand: "Ultima actualizare: 10 septembrie 2026",
  sprachHinweis: "Aceste texte sunt disponibile în engleză, română și germană. În caz de diferențe, se aplică versiunea în limba engleză.",
  kontaktWort: "Formular de contact",
};

const DE: RechtTexte = {
  impressum: {
    titel: "Impressum",
    abschnitte: [
      { h: "Betreiber", p: [`lakatosbandi.com wird betrieben von ${BETREIBER}.`, `Steuernummer: ${STEUER} (Freiberufler, Rumänien).`] },
      { h: "Wer dahinter steht", p: ["Geza Lakatos (Dipl.-Designer & AI Consultant) und Szidonia Bandi (Künstlerin)."] },
      { h: "Kontakt", p: ["Für jedes Anliegen — auch rechtliche Fragen und Datenschutz — nutze bitte unser Kontaktformular. Wir beantworten jede Nachricht."] },
      { h: "Technik", p: ["Die Plattform läuft mit VersusForge, einer vom Betreiber gebauten KI-Marketing-Engine."] },
    ],
  },
  datenschutz: {
    titel: "Datenschutzerklärung",
    intro: "Diese Erklärung sagt, welche Daten lakatosbandi.com verarbeitet, wozu, und welche Rechte du hast. Sie gilt für Künstler, die mit unserem Agenten sprechen und ihr Dashboard nutzen, und für Besucher, die über die Plattform einen Künstler kontaktieren.",
    abschnitte: [
      { h: "1. Verantwortlich", p: [`Verantwortlicher: ${BETREIBER}, Steuernummer ${STEUER}. Kontakt: unser Kontaktformular.`] },
      { h: "2. Wenn du Künstler bist", p: [
        "Gespräch mit unserem Agenten: die Nachrichten, die du schreibst, deine Auswahl und deine Sprache. Wir brauchen sie für deinen Marketingplan, deine Sätze und Anzeigen und zeichnen jedes Gespräch auf, um seine Qualität zu prüfen und den Agenten zu verbessern.",
        "Bilder im Gespräch: Fotos deiner Werke, die du im Chat hinzufügst, werden ausgewertet (Technik, Stil, Motiv, Seltenes) und automatisch auf verbotene Inhalte geprüft. Sie werden für dieses Gespräch verwendet und nicht in unserem Speicher abgelegt.",
        "Deine Seite und dein Dashboard: dein Name, deine E-Mail-Adresse, deine Sprache, deine Sätze (Hooks) und die Werke, die du im Dashboard hochlädst. Diese Werke liegen auf Servern in Frankfurt, Deutschland. Ein Werk, das unsere automatische Prüfung markiert, liegt getrennt, bis ein Mensch entscheidet; wird es abgelehnt, wird es gelöscht. Aktfotografie wird nie gespeichert.",
        "Prüfung: Jeden neuen Künstler sieht sich ein Mensch an, bevor seine Seite öffentlich wird, meist innerhalb von 3 Tagen.",
        "Deine Zustimmung zum Portal: Nur wenn du Ja sagst, erscheinen deine Werke in der Übersicht von lakatosbandi.com. Deine eigene Seite lakatosbandi.com/dein-name gibt es nach der Freigabe so oder so.",
        "Login: Wir schicken dir einen Link an deine E-Mail-Adresse. Es gibt kein Passwort.",
      ] },
      { h: "3. Wenn du einen Künstler kontaktierst", p: [
        "Wenn du mit dem Agenten eines Künstlers sprichst, speichern wir deine Antworten sowie Namen und Telefonnummer, die du hinterlässt. Wir geben sie an diesen Künstler weiter, damit er dich zurückrufen kann, und benachrichtigen ihn per E-Mail über die neue Anfrage. Der Künstler nutzt deine Angaben nur, um auf deine Anfrage zu antworten.",
        "Auf lakatosbandi.com findet kein Verkauf statt. Preis und Kauf vereinbarst du direkt mit dem Künstler.",
      ] },
      { h: "4. Zahlungen", p: ["Schließt ein Künstler ein Abo ab, verarbeitet Stripe die Zahlung. Vollständige Kartendaten sehen und speichern wir nie."] },
      { h: "5. E-Mails", p: [
        "Wir schicken E-Mails, die zum Dienst gehören: Login-Links, neue Anfragen, die Entscheidung nach der Prüfung und für Künstler die Frage nach dem Abo. Jede E-Mail betrifft dein Konto oder deine Anfragen; Adressen verkaufen wir nicht.",
        "Wenn du einem Künstler folgst, gibst du uns deine E-Mail-Adresse für zwei Zwecke: Wir benachrichtigen dich, sobald dieser Künstler ein neues Werk hinzufügt, und wir schicken dir gelegentlich Neuigkeiten über lakatosbandi.com. Wir beginnen erst, nachdem du den Link in unserer ersten E-Mail bestätigt hast, und jede E-Mail enthält einen Abmeldelink. Du kannst deine Einwilligung jederzeit widerrufen.",
      ] },
      { h: "6. Dienstleister", p: [
        "Wir verkaufen keine personenbezogenen Daten. Für den Betrieb nutzen wir: Supabase (Datenbank und Dateispeicher, Server in Frankfurt, Deutschland), Vercel (Hosting), OpenAI (der KI-Agent, die Bildauswertung und die automatische Inhaltsprüfung), Stripe (Zahlungen) und einen E-Mail-Anbieter für den Versand. Mit deiner Einwilligung erhält Meta Daten aus dem Meta-Pixel zur Anzeigenmessung.",
        "Einige Anbieter sitzen außerhalb der EU. Wo Daten die EU verlassen, gelten die gesetzlich vorgeschriebenen Garantien (zum Beispiel EU-Standardvertragsklauseln).",
      ] },
      { h: "7. Cookies und ähnliche Technik", p: [
        "Notwendig: ein Cookie für deine Sprache und eine zufällige Gerätenummer im Browser, die den Agenten vor Missbrauch schützt (ein Tageslimit). Ohne sie funktioniert die Plattform nicht richtig. Wenn du uns im Chat Feedback schickst, speichern wir deinen Text, die Sprache und die letzte Frage des Agenten, um die Plattform zu verbessern.",
        "Marketing: Das Meta-Pixel lädt erst, wenn du es im Cookie-Hinweis annimmst. Lehnst du ab, lädt es nicht.",
      ] },
      { h: "8. Rechtsgrundlage", p: ["Wir verarbeiten Daten, um den Dienst zu erbringen, den du angefragt hast (Art. 6 Abs. 1 lit. b DSGVO), auf Grundlage deiner Einwilligung, wo wir danach fragen — etwa für die Portal-Übersicht oder das Meta-Pixel (Art. 6 Abs. 1 lit. a), und auf Grundlage unseres berechtigten Interesses an einer sicheren Plattform ohne verbotene Inhalte (Art. 6 Abs. 1 lit. f)."] },
      { h: "9. Speicherdauer", p: ["Wir speichern Daten, solange sie für den Dienst nötig sind. Künstler können ihre Seite, ihre Werke und alle Anfragen jederzeit löschen; Besucher können uns bitten, ihre Anfrage zu löschen. Markierte Werke werden gelöscht, wenn sie abgelehnt werden."] },
      { h: "10. Deine Rechte", p: ["Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch und Datenübertragbarkeit und kannst Einwilligungen jederzeit widerrufen. Nutze dafür unser Kontaktformular. Du kannst dich außerdem bei einer Datenschutzbehörde beschweren — in Rumänien bei der ANSPDCP."] },
    ],
  },
  agb: {
    titel: "Allgemeine Geschäftsbedingungen",
    intro: "Diese Bedingungen gelten für lakatosbandi.com. Wer mit unserem Agenten spricht, eine Künstlerseite anlegt oder einen Künstler kontaktiert, akzeptiert sie.",
    abschnitte: [
      { h: "1. Was lakatosbandi.com ist", p: [
        `lakatosbandi.com ist eine Marketing-Plattform für Künstler, betrieben von ${BETREIBER}. Wir helfen Künstlern, ihre Werke zu präsentieren — mit Sätzen, Anzeigen, einer Künstlerseite und einem KI-Agenten, der mit Interessenten spricht.`,
        "Wir verkaufen keine Kunst und sind an keinem Verkauf beteiligt. Wir nehmen keine Provision. Jeder Kauf wird direkt zwischen Künstler und Käufer vereinbart.",
      ] },
      { h: "2. Künstler: Aufnahme und Prüfung", p: [
        "Mitmachen kann jeder, der malt — es gibt keine Aufnahmeprüfung, keine Mindestzahl an Werken und keine Wartezeit. Deine Seite ist sofort online. Wir können eine Bewerbung ablehnen oder eine Seite entfernen, insbesondere wenn Werke nicht vom Künstler stammen, gegen Gesetze oder diese Bedingungen verstoßen.",
        "In der Übersicht des Portals erscheinen deine Werke nur mit deiner Zustimmung. Du kannst sie jederzeit widerrufen.",
      ] },
      { h: "3. Deine Werke und Rechte", p: [
        "Du bestätigst, dass du Urheber der gezeigten Werke bist oder die nötigen Rechte hast und keine Rechte Dritter verletzt werden.",
        "Du erlaubst uns, solange deine Seite besteht, deine Werke zu speichern, auf lakatosbandi.com zu zeigen, daraus Sätze und Anzeigen für dich zu erstellen und sie zur Werbung für die Plattform zu nutzen. Alle Rechte an deinen Werken bleiben bei dir.",
        "Nicht erlaubt: Werke, die du nicht geschaffen hast, Inhalte mit Minderjährigen in jedem sexuellen Zusammenhang, rechtswidrige Inhalte. Gemalte und gezeichnete Akte sind willkommen; Aktfotografie nehmen wir zurzeit nicht an. Uploads werden automatisch und, wenn markiert, von einem Menschen geprüft.",
      ] },
      { h: "4. KI und Ergebnisse", p: [
        "Sätze, Anzeigen und die Antworten des Agenten entstehen mit Hilfe künstlicher Intelligenz. Prüfe jeden Text, bevor du ihn verwendest. KI kann sich irren.",
        "Wir garantieren keine Verkäufe, keine Zahl von Anfragen und kein bestimmtes Ergebnis. Einschätzungen zu Kategorie und Preis sind Orientierung, keine Bewertung.",
      ] },
      { h: "5. Der Agent und Anfragen", p: [
        "Der Agent spricht mit Besuchern auf der Künstlerseite, beantwortet Fragen zur Plattform und sammelt Name und Telefonnummer. Er schließt keine Verträge, verhandelt keine verbindlichen Preise und kann im Namen des Künstlers nichts zusagen.",
        "Für die Beantwortung von Anfragen und jeden Verkauf ist der Künstler verantwortlich.",
      ] },
      { h: "6. Kostenloser Start und Abo", p: [
        "Der Start ist kostenlos: deine Sätze, Anzeigen, Seite und dein Agent.",
        "Derzeit sind alle Leistungen kostenlos und ohne Limit. Wird der Agent künftig kostenpflichtig, informieren wir den Künstler vorher; er entscheidet selbst, ob er ihn behält.",
      ] },
      { h: "7. Besucher und Käufer", p: [
        "Ein Gespräch mit einem Agenten ist kein Angebot und kein Kauf. Deine Angaben gehen an den Künstler, damit er dich kontaktieren kann.",
        "Einem Künstler folgen: Du kannst uns deine E-Mail-Adresse geben, um benachrichtigt zu werden, wenn dieser Künstler ein neues Werk hinzufügt, und um gelegentlich Neuigkeiten über lakatosbandi.com zu bekommen. Es beginnt erst, nachdem du den Link in unserer ersten E-Mail bestätigt hast. Jede E-Mail enthält einen Abmeldelink, und deine Adresse geben wir nicht an den Künstler weiter.",
      ] },
      { h: "8. Faire Nutzung", p: ["Kein Missbrauch: keine falschen Angaben, keine Versuche, die Plattform zu überlasten oder zu beschädigen, keine Nutzung des Agenten oder unserer Texte, um andere zu täuschen oder ihnen zu schaden."] },
      { h: "9. Löschen", p: ["Künstler können ihre Seite, ihre Werke und die von uns geschriebenen Sprüche jederzeit ändern oder löschen. Seiten, die gegen diese Bedingungen verstoßen, können wir löschen."] },
      { h: "10. Haftung", p: ["Die Plattform wird so bereitgestellt, wie sie ist. Soweit gesetzlich zulässig, haften wir nicht für mittelbare Schäden, und unsere Gesamthaftung ist auf den Betrag begrenzt, der in den 12 Monaten vor dem Anspruch an uns gezahlt wurde. Die Haftung für Vorsatz und grobe Fahrlässigkeit bleibt unberührt.",
        "Für die Werke, die du hier veröffentlichst, haftest du: dass sie von dir sind, dass du die nötigen Rechte hast und dass ihre Veröffentlichung weder Gesetze noch Rechte Dritter verletzt. Wird jemand wegen eines von dir veröffentlichten Werkes gegen uns vorstellig, trägst du die Folgen."] },
      { h: "11. Änderungen und Recht", p: ["Wir können diese Bedingungen ändern und veröffentlichen die neue Fassung hier mit neuem Datum. Es gilt rumänisches Recht."] },
    ],
  },
  stand: "Stand: 10. September 2026",
  sprachHinweis: "Diese Texte gibt es auf Englisch, Rumänisch und Deutsch. Bei Abweichungen gilt die englische Fassung.",
  kontaktWort: "Kontaktformular",
};

export const rechtTexte = (lang: Lang): RechtTexte => (lang === "ro" ? RO : lang === "de" ? DE : EN);
