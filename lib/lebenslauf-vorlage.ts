import type { Lang } from "@/lib/lang";
import type { LebenslaufProfil } from "@/lib/lebenslauf-store";

/**
 * DIE VORLAGE „EXECUTIVE" — DATEN UND WORTE (Owner 22.08.2026: „Design ONE single premium
 * candidate profile template … Executive").
 *
 * WARUM EINE EIGENE DATEI UND NICHT DER SPEICHER: `lib/lebenslauf-store.ts` beschreibt, was
 * von einem Bewerber GESPEICHERT wird (Rohdaten aus der Auswertung). Hier steht, was die
 * fertige Seite ZEIGT — eine Ebene darüber. Die beiden dürfen sich unterscheiden: Der
 * Speicher kennt `stichpunkte: string[]`, die Vorlage kennt „Selected Impact" mit Zahl und
 * Zeile. Wer die Vorlage an echte Profile hängt, schreibt genau EINEN Übersetzer zwischen
 * beiden (`ausProfil`), statt die Seite an den Rohdaten entlangzubauen.
 *
 * KEINE ERFUNDENEN ZAHLEN (Auftrag: „Use numbers only if they come from the candidate's CV.
 * Do not invent achievements."). Seit dem 24.08.2026 ist das Muster der GRÜNDER selbst —
 * jede Zahl steht in seinem echten Lebenslauf (cv26-Geza-Lakatos_de) bzw. seiner eigenen
 * Auswertung. Wer das Beispiel ändert, ändert es gegen dieselbe Quelle.
 */

/**
 * DAS EINE BEISPIEL-VIDEO DES THEMAS (Dauerregel Memory `landingpage-video-ist-kachel-video`:
 * EIN Video aus EINER Konstante für Landingpage-Karte UND Katalog-Kachel UND Themen-Kreis).
 * Echter Lauf (Ginas Foto + Anna Kellers Muster-CV), liegt fest im Repo statt an einem
 * ablaufenden Supabase-Link.
 */
/* SEIT 24.08.2026 DER GRÜNDER SELBST (Owner: „der Hero braucht ein echtes Gesicht. Der Text
   verspricht ‚du selbst, echt' — mit dem KI-Model daneben glaubt ihn niemand" · „mach mal in
   dem Template mein Video und mein Lebenslauf"). Sein HeyGen-Video, komprimiert auf 720p mit
   Faststart; das Anna-Keller-Material (KI-Lauf) bleibt im Ordner als Reserve liegen. */
export const LEBENSLAUF_BEISPIEL_VIDEO = "/Lebenslauf/geza-beispiel.mp4";
export const LEBENSLAUF_BEISPIEL_POSTER = "/Lebenslauf/geza-beispiel.jpg";

export type ExecutiveErfahrung = {
  rolle: string;
  firma: string;
  zeitraum: string;
  /** EINE Zeile — Ergebnis oder Verantwortung, nie der ganze Lebenslauf. */
  ergebnis: string;
};

export type ExecutiveProfil = {
  id: string;
  name: string;
  /** Die Positionierung unter dem Namen — die zweitwichtigste Zeile der Seite. */
  rolle: string;
  /** „Berlin · Remote EU" — Ort UND Arbeitsform in einer Zeile. */
  ort: string;
  /** „German native · English C1" — kurz für den Kopf; die Langfassung steht in `sprachen`. */
  sprachenKurz: string;
  /** „Available from September" — leer heisst: kein Status, die Zeile fehlt ganz. */
  verfuegbar?: string;
  /** Drei bis vier Schwerpunkte im Kopf. Mehr liest im Zehn-Sekunden-Blick niemand. */
  schwerpunkte: string[];
  /** Das Porträt. Ist ein Video da, ist dieses Bild zugleich sein Standbild (Skill `card`:
      „nie ein Video ohne Poster"). */
  portraitUrl: string;
  videoUrl?: string;
  /** „60 sec. Introduction" — steht auf dem Video, kommt aus den Daten, nicht aus dem Code. */
  videoLabel?: string;
  /** Vier bis fünf Zeilen. Die KI schreibt sie aus dem Lebenslauf, der Mensch gibt sie frei. */
  profil: string;
  /** Sechs bis acht Begriffe. */
  expertise: string[];
  erfahrung: ExecutiveErfahrung[];
  /** Genau drei — mehr Zahlen nebeneinander liest man als Schaubild, nicht als Beleg. */
  impact: { zahl: string; text: string }[];
  ausbildung: { titel: string; ort: string; zeitraum: string }[];
  sprachen: { sprache: string; niveau: string }[];
  /** Der Lebenslauf als Datei — der Knopf fehlt ohne sie. */
  cvUrl?: string;
  /** Beispiel-Fragen für den Profil-Chat. Sie zeigen, was er kann, ohne dass man tippen muss. */
  chatFragen: string[];
  /**
   * KONTAKTDATEN ERST NACH FREIGABE (Owner 20.08.2026, siehe `kontaktSichtbar` in
   * lib/lebenslauf-store.ts): Die Seite geht an Firmen OHNE Kontaktkarte; erst wenn eine
   * Firma Interesse an genau diesem Kandidaten bestätigt, wird sie sichtbar. Vorgabe `false`.
   */
  kontaktSichtbar?: boolean;
  kontakt?: { ort?: string; telefon?: string; email?: string; profilLink?: string };
  /** Die ehrlichen Zaehler (Owner 25.08.2026) — nur der Besitzer sieht sie. */
  viewCount?: number;
  videoKlicks?: number;
};

/** Die Worte der Seite in den sieben Hausprachen (lib/lang.ts). Der INHALT (Lebenslauf) bleibt
    in der Sprache des Bewerbers — übersetzt wird die Bedienung ringsum, nicht sein Werdegang. */
export type ExecutiveTexte = {
  marke: string;
  teilen: string; kopiert: string; menu: string; menuTitel: string;
  profil: string; expertise: string; erfahrung: string; impact: string;
  bildung: string; sprachen: string;
  ganzeCv: string;
  /** „+7 weitere anzeigen" — nach der vierten Station eingeklappt (Owner 24.08.2026, am
      eigenen 11-Stationen-Profil: „nach der vierten Stelle zum Ausklappen"). */
  alleAnzeigen: (rest: number) => string;
  wenigerAnzeigen: string;
  interessiert: (name: string) => string;
  interessiertText: string;
  cvLaden: string;
  kontakt: string;
  /** Der FREIGABE-SCHALTER des Besitzers (Owner 25.08.2026: Kontaktdaten werden im Chat
      abgefragt, falls der User sie im Bearbeiten-Modus freigibt) -- erst die Freigabe
      laesst den Firmen-Chat sie auf Nachfrage nennen. */
  kontaktOeffentlich: string; kontaktNurAnfrage: string; kontaktFreigegeben: string;
  /** Nur der BESITZER sieht diese Zeile — sie erklärt, warum er seine eigenen Kontaktdaten
      sieht, obwohl Firmen sie erst nach Freigabe bekommen (Owner 24.08.2026: „ein Bewerber
      muss seine Kontaktdaten sehen"). */
  kontaktNurDu: string;
  /** Getippte Fragen werden NICHT von einer KI beantwortet, sondern WEITERGELEITET
      (Owner 25.08.2026: das braucht man nicht, man sieht doch alles in der Bewerbung --
      eventuell Fragen an ihn, die weitergeleitet werden). Diese Zeile leitet danach
      in die Kontakt-Abfrage ueber. */
  frageLeiten: (name: string) => string;
  /** DIE ANFRAGE BLEIBT IN DER SEITE (Owner 25.08.2026: „ich finde das hier nicht gut weil
      auf einer anderen seite geleitet wird") — das Formular klappt im Firmen-Chat auf,
      geschickt wird über /api/contact. Duzen auch gegenüber Firmen ([[immer-duzen]]). */
  anfrageName: string; anfrageEmail: string; anfrageNachricht: string;
  anfrageDanke: string; anfrageZu: string;
  /** DER GEFUEHRTE FIRMEN-DIALOG (Owner 25.08.2026: "Es muss nur ein Feld sein wo der
      Chat dich fragt Interesse an Geza? Ja Nein. Wer / Welche Firma bist du, deine
      Kontaktdaten.") -- der Chat stellt die Fragen, keine Knopf-Bloecke mehr. */
  ja: string; nein: string; frageWer: string; frageMail: string; frageNachricht: string;
  ohneNachricht: string; neinAntwort: string;
  /** Der ECHTE Firmen-Chat (Owner 25.08.2026: „Die Firmen müssen auch einen Chat
      bekommen") — Eingabefeld, Senden, Denk-Zeile; Antworten kommen aus
      /api/lebenslauf-frage, ausschliesslich aus den geprüften Profildaten. */
  chatFrageP: string; chatSenden: string; chatDenkt: string;
  /** Die Besitzer-Leiste unten (Owner 25.08.2026: „zwei Buttons im Footer Vorschau und
      Bearbeiten") — Vorschau zeigt die Seite exakt wie ein Fremder/eine Firma sie sieht. */
  vorschau: string; bearbeiten: string;
  /** Play-Knopf auf der BILD-Bewerbung (Owner 25.08.2026): Firma sieht -Noch kein
      Video-, der Bewerber sieht den Zaehler samt Kauf-Anstoss (-Video ist gefragt.
      Erstelle jetzt ein Video...-). */
  nochKeinVideo: string;
  statsOeffnungen: (n: number) => string;
  statsVideoWunsch: (n: number) => string;
};

export const EXECUTIVE_TEXTE: Record<Lang, ExecutiveTexte> = {
  en: {
    marke: "Talent", teilen: "Share profile", kopiert: "Link copied", menu: "Menu", menuTitel: "Sections",
    profil: "Profile", expertise: "Core Expertise", erfahrung: "Experience", impact: "Selected Impact",
    bildung: "Education", sprachen: "Languages",
    ganzeCv: "The complete career history is in the CV.",
    alleAnzeigen: (n) => `+${n} more`, wenigerAnzeigen: "Show less",
    interessiert: (n) => `Interested in ${n}?`,
    interessiertText: "Send a request and we pass it to the candidate the same day.", cvLaden: "Download CV",
    kontakt: "Contact",
    kontaktNurDu: "Only you see this data. Release it and the chat shares it with companies on request.",
    kontaktOeffentlich: "Publicly visible", kontaktNurAnfrage: "Only on request", kontaktFreigegeben: "Released — the chat shares it with companies on request.",
    frageLeiten: (n) => `Happy to pass that on to ${n}. Who are you — your name and your company?`,
    anfrageName: "Your name / company", anfrageEmail: "Your email", anfrageNachricht: "Your message",
    anfrageDanke: "Thank you — we have your request and will pass it on the same day.",
    anfrageZu: "Cancel",
    ja: "Yes", nein: "No",
    frageWer: "Great! Who are you — your name and your company?",
    frageMail: "And how do we reach you? Your email address.",
    frageNachricht: "Anything you want to add? Write it here — or send the request right away.",
    ohneNachricht: "Send now", neinAntwort: "No problem. If you have questions about the career, just type them here.",
    chatFrageP: "Your question about the career …", chatSenden: "Send", chatDenkt: "One moment …", vorschau: "Preview", bearbeiten: "Edit",
    nochKeinVideo: "No video yet.",
    statsOeffnungen: (n) => n === 1 ? "1 person viewed your application." : `${n} people viewed your application.`,
    statsVideoWunsch: (n) => `${n === 1 ? "1 person wanted" : `${n} people wanted`} to watch your video. Your video is in demand — create it now.`,
  },
  de: {
    marke: "Talent", teilen: "Profil teilen", kopiert: "Link kopiert", menu: "Menü", menuTitel: "Abschnitte",
    profil: "Profil", expertise: "Kernkompetenzen", erfahrung: "Erfahrung", impact: "Ausgewählte Ergebnisse",
    bildung: "Ausbildung", sprachen: "Sprachen",
    ganzeCv: "Der vollständige Werdegang steht im Lebenslauf.",
    alleAnzeigen: (n) => `+${n} weitere anzeigen`, wenigerAnzeigen: "Weniger anzeigen",
    interessiert: (n) => `Interesse an ${n}?`,
    interessiertText: "Schick eine Anfrage — wir geben sie noch am selben Tag weiter.", cvLaden: "Lebenslauf laden",
    kontakt: "Kontakt",
    kontaktNurDu: "Nur du siehst diese Daten. Erst deine Freigabe macht sie für Firmen im Chat abrufbar.",
    kontaktOeffentlich: "Öffentlich sichtbar", kontaktNurAnfrage: "Nur per Anfrage", kontaktFreigegeben: "Freigegeben — der Chat nennt sie Firmen auf Nachfrage.",
    frageLeiten: (n) => `Gern — ich gebe deine Frage an ${n} weiter. Wer bist du — dein Name und deine Firma?`,
    anfrageName: "Dein Name / Firma", anfrageEmail: "Deine E-Mail", anfrageNachricht: "Deine Nachricht",
    anfrageDanke: "Danke — deine Anfrage ist bei uns und wird noch am selben Tag weitergegeben.",
    anfrageZu: "Abbrechen",
    ja: "Ja", nein: "Nein",
    frageWer: "Schön! Wer bist du — dein Name und deine Firma?",
    frageMail: "Und wie erreichen wir dich? Deine E-Mail-Adresse.",
    frageNachricht: "Magst du noch etwas mitgeben? Schreib es hier — oder schick die Anfrage direkt ab.",
    ohneNachricht: "Direkt absenden", neinAntwort: "Alles klar. Wenn du Fragen zum Werdegang hast, tipp sie einfach hier ein.",
    chatFrageP: "Deine Frage zum Werdegang …", chatSenden: "Senden", chatDenkt: "Einen Moment …", vorschau: "Vorschau", bearbeiten: "Bearbeiten",
    nochKeinVideo: "Noch kein Video.",
    statsOeffnungen: (n) => n === 1 ? "1 Person hat sich deine Bewerbung angeschaut." : `${n} Leute haben sich deine Bewerbung angeschaut.`,
    statsVideoWunsch: (n) => `${n === 1 ? "1 Person wollte" : `${n} Leute wollten`} dein Video sehen. Video ist gefragt — erstelle jetzt dein Video.`,
  },
  ro: {
    marke: "Talent", teilen: "Distribuie profilul", kopiert: "Link copiat", menu: "Meniu", menuTitel: "Secțiuni",
    profil: "Profil", expertise: "Competențe cheie", erfahrung: "Experiență", impact: "Rezultate selectate",
    bildung: "Studii", sprachen: "Limbi",
    ganzeCv: "Parcursul complet se află în CV.",
    alleAnzeigen: (n) => `+${n} altele`, wenigerAnzeigen: "Arată mai puțin",
    interessiert: (n) => `Interesat de ${n}?`,
    interessiertText: "Trimite o cerere — o transmitem candidatului în aceeași zi.", cvLaden: "Descarcă CV-ul",
    kontakt: "Contact",
    kontaktNurDu: "Doar tu vezi aceste date. Abia după ce le eliberezi, chatul le spune firmelor la cerere.",
    kontaktOeffentlich: "Vizibile public", kontaktNurAnfrage: "Doar la cerere", kontaktFreigegeben: "Eliberate — chatul le spune firmelor la cerere.",
    frageLeiten: (n) => `Cu plăcere — transmit întrebarea ta lui ${n}. Cine ești — numele tău și firma ta?`,
    anfrageName: "Numele tău / firma", anfrageEmail: "E-mailul tău", anfrageNachricht: "Mesajul tău",
    anfrageDanke: "Mulțumim — cererea ta a ajuns la noi și o transmitem în aceeași zi.",
    anfrageZu: "Renunță",
    ja: "Da", nein: "Nu",
    frageWer: "Super! Cine ești — numele tău și firma ta?",
    frageMail: "Și cum te contactăm? Adresa ta de e-mail.",
    frageNachricht: "Vrei să adaugi ceva? Scrie aici — sau trimite cererea direct.",
    ohneNachricht: "Trimite acum", neinAntwort: "Nicio problemă. Dacă ai întrebări despre parcurs, scrie-le aici.",
    chatFrageP: "Întrebarea ta despre parcurs …", chatSenden: "Trimite", chatDenkt: "O clipă …", vorschau: "Previzualizare", bearbeiten: "Editare",
    nochKeinVideo: "Încă fără video.",
    statsOeffnungen: (n) => n === 1 ? "1 persoană ți-a văzut aplicația." : `${n} persoane ți-au văzut aplicația.`,
    statsVideoWunsch: (n) => `${n === 1 ? "1 persoană a vrut" : `${n} persoane au vrut`} să-ți vadă videoul. Videoul tău e cerut — creează-l acum.`,
  },
  es: {
    marke: "Talent", teilen: "Compartir perfil", kopiert: "Enlace copiado", menu: "Menú", menuTitel: "Secciones",
    profil: "Perfil", expertise: "Competencias clave", erfahrung: "Experiencia", impact: "Resultados destacados",
    bildung: "Formación", sprachen: "Idiomas",
    ganzeCv: "La trayectoria completa está en el CV.",
    alleAnzeigen: (n) => `+${n} más`, wenigerAnzeigen: "Mostrar menos",
    interessiert: (n) => `¿Interesa ${n}?`,
    interessiertText: "Envía una solicitud y la trasladamos el mismo día.", cvLaden: "Descargar CV",
    kontakt: "Contacto",
    kontaktNurDu: "Solo tú ves estos datos. Solo tras liberarlos el chat los comparte con las empresas.",
    kontaktOeffentlich: "Visibles públicamente", kontaktNurAnfrage: "Solo bajo solicitud", kontaktFreigegeben: "Liberados — el chat los comparte con las empresas si preguntan.",
    frageLeiten: (n) => `Con gusto se la paso a ${n}. ¿Quién eres — tu nombre y tu empresa?`,
    anfrageName: "Tu nombre / empresa", anfrageEmail: "Tu email", anfrageNachricht: "Tu mensaje",
    anfrageDanke: "Gracias — tenemos tu solicitud y la trasladamos el mismo día.",
    anfrageZu: "Cancelar",
    ja: "Sí", nein: "No",
    frageWer: "¡Genial! ¿Quién eres — tu nombre y tu empresa?",
    frageMail: "¿Y cómo te contactamos? Tu dirección de email.",
    frageNachricht: "¿Quieres añadir algo? Escríbelo aquí — o envía la solicitud directamente.",
    ohneNachricht: "Enviar ahora", neinAntwort: "Sin problema. Si tienes preguntas sobre la trayectoria, escríbelas aquí.",
    chatFrageP: "Tu pregunta sobre la trayectoria …", chatSenden: "Enviar", chatDenkt: "Un momento …", vorschau: "Vista previa", bearbeiten: "Editar",
    nochKeinVideo: "Aún sin vídeo.",
    statsOeffnungen: (n) => n === 1 ? "1 persona ha visto tu candidatura." : `${n} personas han visto tu candidatura.`,
    statsVideoWunsch: (n) => `${n === 1 ? "1 persona quiso" : `${n} personas quisieron`} ver tu vídeo. Tu vídeo tiene demanda — créalo ahora.`,
  },
  fr: {
    marke: "Talent", teilen: "Partager le profil", kopiert: "Lien copié", menu: "Menu", menuTitel: "Sections",
    profil: "Profil", expertise: "Compétences clés", erfahrung: "Expérience", impact: "Résultats sélectionnés",
    bildung: "Formation", sprachen: "Langues",
    ganzeCv: "Le parcours complet figure dans le CV.",
    alleAnzeigen: (n) => `+${n} de plus`, wenigerAnzeigen: "Afficher moins",
    interessiert: (n) => `${n} vous intéresse ?`,
    interessiertText: "Envoyez une demande — nous la transmettons le jour même.", cvLaden: "Télécharger le CV",
    kontakt: "Contact",
    kontaktNurDu: "Toi seul vois ces données. Après ta libération, le chat les partage avec les entreprises sur demande.",
    kontaktOeffentlich: "Visibles publiquement", kontaktNurAnfrage: "Seulement sur demande", kontaktFreigegeben: "Libérées — le chat les partage avec les entreprises sur demande.",
    frageLeiten: (n) => `Avec plaisir — je transmets ta question à ${n}. Qui es-tu — ton nom et ton entreprise ?`,
    anfrageName: "Ton nom / entreprise", anfrageEmail: "Ton e-mail", anfrageNachricht: "Ton message",
    anfrageDanke: "Merci — ta demande est chez nous, nous la transmettons le jour même.",
    anfrageZu: "Annuler",
    ja: "Oui", nein: "Non",
    frageWer: "Super ! Qui es-tu — ton nom et ton entreprise ?",
    frageMail: "Et comment te joindre ? Ton adresse e-mail.",
    frageNachricht: "Tu veux ajouter quelque chose ? Écris-le ici — ou envoie la demande directement.",
    ohneNachricht: "Envoyer maintenant", neinAntwort: "Pas de souci. Si tu as des questions sur le parcours, écris-les ici.",
    chatFrageP: "Ta question sur le parcours …", chatSenden: "Envoyer", chatDenkt: "Un instant …", vorschau: "Aperçu", bearbeiten: "Modifier",
    nochKeinVideo: "Pas encore de vidéo.",
    statsOeffnungen: (n) => n === 1 ? "1 personne a consulté ta candidature." : `${n} personnes ont consulté ta candidature.`,
    statsVideoWunsch: (n) => `${n === 1 ? "1 personne a voulu" : `${n} personnes ont voulu`} voir ta vidéo. Ta vidéo est demandée — crée-la maintenant.`,
  },
  pt: {
    marke: "Talent", teilen: "Partilhar perfil", kopiert: "Link copiado", menu: "Menu", menuTitel: "Secções",
    profil: "Perfil", expertise: "Competências principais", erfahrung: "Experiência", impact: "Resultados selecionados",
    bildung: "Formação", sprachen: "Línguas",
    ganzeCv: "O percurso completo está no CV.",
    alleAnzeigen: (n) => `+${n} mais`, wenigerAnzeigen: "Mostrar menos",
    interessiert: (n) => `Interesse em ${n}?`,
    interessiertText: "Envia um pedido — encaminhamos no próprio dia.", cvLaden: "Descarregar CV",
    kontakt: "Contacto",
    kontaktNurDu: "Só tu vês estes dados. Só depois de os libertares o chat os partilha com as empresas.",
    kontaktOeffentlich: "Visíveis publicamente", kontaktNurAnfrage: "Só a pedido", kontaktFreigegeben: "Libertados — o chat partilha-os com as empresas quando perguntam.",
    frageLeiten: (n) => `Com gosto passo a tua pergunta a ${n}. Quem és — o teu nome e a tua empresa?`,
    anfrageName: "O teu nome / empresa", anfrageEmail: "O teu e-mail", anfrageNachricht: "A tua mensagem",
    anfrageDanke: "Obrigado — recebemos o teu pedido e encaminhamo-lo no próprio dia.",
    anfrageZu: "Cancelar",
    ja: "Sim", nein: "Não",
    frageWer: "Ótimo! Quem és — o teu nome e a tua empresa?",
    frageMail: "E como te contactamos? O teu endereço de e-mail.",
    frageNachricht: "Queres acrescentar algo? Escreve aqui — ou envia o pedido já.",
    ohneNachricht: "Enviar já", neinAntwort: "Sem problema. Se tiveres perguntas sobre o percurso, escreve-as aqui.",
    chatFrageP: "A tua pergunta sobre o percurso …", chatSenden: "Enviar", chatDenkt: "Um momento …", vorschau: "Pré-visualizar", bearbeiten: "Editar",
    nochKeinVideo: "Ainda sem vídeo.",
    statsOeffnungen: (n) => n === 1 ? "1 pessoa viu a tua candidatura." : `${n} pessoas viram a tua candidatura.`,
    statsVideoWunsch: (n) => `${n === 1 ? "1 pessoa quis" : `${n} pessoas quiseram`} ver o teu vídeo. O teu vídeo é procurado — cria-o agora.`,
  },
  it: {
    marke: "Talent", teilen: "Condividi profilo", kopiert: "Link copiato", menu: "Menu", menuTitel: "Sezioni",
    profil: "Profilo", expertise: "Competenze chiave", erfahrung: "Esperienza", impact: "Risultati selezionati",
    bildung: "Formazione", sprachen: "Lingue",
    ganzeCv: "Il percorso completo è nel CV.",
    alleAnzeigen: (n) => `+${n} altri`, wenigerAnzeigen: "Mostra meno",
    interessiert: (n) => `Interessa ${n}?`,
    interessiertText: "Invia una richiesta — la giriamo in giornata.", cvLaden: "Scarica il CV",
    kontakt: "Contatti",
    kontaktNurDu: "Solo tu vedi questi dati. Solo dopo il tuo via libera la chat li condivide con le aziende.",
    kontaktOeffentlich: "Visibili pubblicamente", kontaktNurAnfrage: "Solo su richiesta", kontaktFreigegeben: "Sbloccati — la chat li condivide con le aziende su richiesta.",
    frageLeiten: (n) => `Volentieri — giro la tua domanda a ${n}. Chi sei — il tuo nome e la tua azienda?`,
    anfrageName: "Il tuo nome / azienda", anfrageEmail: "La tua e-mail", anfrageNachricht: "Il tuo messaggio",
    anfrageDanke: "Grazie — la tua richiesta è da noi e la giriamo in giornata.",
    anfrageZu: "Annulla",
    ja: "Sì", nein: "No",
    frageWer: "Ottimo! Chi sei — il tuo nome e la tua azienda?",
    frageMail: "E come ti contattiamo? Il tuo indirizzo e-mail.",
    frageNachricht: "Vuoi aggiungere qualcosa? Scrivilo qui — o invia subito la richiesta.",
    ohneNachricht: "Invia subito", neinAntwort: "Nessun problema. Se hai domande sul percorso, scrivile qui.",
    chatFrageP: "La tua domanda sul percorso …", chatSenden: "Invia", chatDenkt: "Un attimo …", vorschau: "Anteprima", bearbeiten: "Modifica",
    nochKeinVideo: "Ancora nessun video.",
    statsOeffnungen: (n) => n === 1 ? "1 persona ha visto la tua candidatura." : `${n} persone hanno visto la tua candidatura.`,
    statsVideoWunsch: (n) => `${n === 1 ? "1 persona voleva" : `${n} persone volevano`} vedere il tuo video. Il tuo video è richiesto — crealo ora.`,
  },
};

/**
 * DAS BEISPIEL-PROFIL — die fiktive Anna Keller aus `public/Resume/…CV.pdf`.
 *
 * Es steht hier und nicht in der Seite, damit die Vorlage an EINER Stelle mit echten Daten
 * gefüttert werden kann: Wer sie an einen echten Bewerber hängt, baut ein Objekt derselben
 * Form und reicht es hinein — die Seite kennt keinen Sonderfall „Beispiel".
 */
export const EXECUTIVE_BEISPIEL: ExecutiveProfil = {
  /* DAS MUSTER IST JETZT DER GRÜNDER SELBST (Owner 24.08.2026: „mach mal in dem Template
     mein Video und mein Lebenslauf") — echte Daten aus seiner eigenen Auswertung
     (Profil cde90e16…, CV cv26-Geza-Lakatos_de) statt der erfundenen Anna Keller. Der
     Seitentext verspricht „ein echtes Profil", also zeigt das Muster eines. KEINE erfundenen
     Zahlen: 20+ Jahre (CV: seit 1996), 200+ Studierende und die zwei eigenen Apps stehen
     wörtlich im Lebenslauf. Inhalt auf DEUTSCH (Sprache seines CVs) — andere Betrachter
     bekommen die Laufzeit-Übersetzung (executiveInSprache). Kontaktdaten stehen BEWUSST
     nicht hier: Diese Datei landet im Client-Bundle, und die Karte zeigt ohnehin den
     Freigabe-Satz (Vermittlungsmodell). */
  id: "executive-vorlage",
  name: "Geza Lakatos",
  rolle: "UX-Berater & KI-App-Entwickler",
  ort: "EU, Deutschland",
  sprachenKurz: "Deutsch C2 · Englisch C1 · Rumänisch C2",
  schwerpunkte: ["Produktstrategie", "No-Code-Prototyping", "KI-Integration", "UX-Training"],
  portraitUrl: LEBENSLAUF_BEISPIEL_POSTER,
  videoUrl: LEBENSLAUF_BEISPIEL_VIDEO,
  videoLabel: "Kurzvorstellung",
  profil:
    "Geza Lakatos, UX-Berater und Designer. Ich habe für die Bundesdruckerei das UX-Design " +
    "einer nationalen Datenplattform geleitet, bei Festo Industry-4.0-Wartungskonzepte " +
    "mitentwickelt und zuletzt eigene KI-gestützte Apps wie Nutrycoach.ai und LuxuryBandit " +
    "von der Idee bis zum MVP realisiert. Mein Schwerpunkt liegt auf AI-assisted App " +
    "Strategy, No-Code-Prototyping und skalierbaren Designsystemen. Ich suche jetzt eine " +
    "Rolle, in der ich Produktvisionen strategisch weiterführen kann — sei es als Senior " +
    "UX/Product Lead, strategischer Berater oder in einem interdisziplinären Team, das KI " +
    "ernsthaft in die Produktentwicklung integriert.",
  expertise: ["UX-Strategie", "Prototyping", "KI-Workflows", "Designsysteme", "Barrierefreiheit", "Workshop-Moderation"],
  erfahrung: [
    { rolle: "Founder / UX-Designer", firma: "LuxuryBandit (eigenes Projekt)", zeitraum: "2026–heute", ergebnis: "KI-gestützte Video-Plattform von der Idee bis zum laufenden Produkt gebaut." },
    { rolle: "Founder / UX-Designer", firma: "Nutrycoach.ai (eigenes Projekt)", zeitraum: "2025–Mai 2026", ergebnis: "UX und MVP einer KI-Ernährungs-App komplett selbst umgesetzt." },
    { rolle: "UX-Berater", firma: "Bundesdruckerei Gruppe GmbH", zeitraum: "2022–2024", ergebnis: "UX-Strategie der nationalen Datenplattform geleitet." },
  ],
  impact: [
    { zahl: "20+", text: "Jahre Produktgestaltung, seit 1996" },
    { zahl: "200+", text: "Studierende betreut, UX Design Institute" },
    { zahl: "2", text: "eigene KI-Apps bis zum MVP" },
  ],
  ausbildung: [
    { titel: "Dipl. Kommunikationsdesigner", ort: "FH Mannheim", zeitraum: "" },
  ],
  sprachen: [
    { sprache: "Deutsch", niveau: "C2" },
    { sprache: "Englisch", niveau: "C1" },
    { sprache: "Rumänisch", niveau: "C2" },
    { sprache: "Ungarisch", niveau: "B2" },
  ],
  chatFragen: [
    "Hat Geza Erfahrung mit KI-Produktentwicklung?",
    "Welche UX-Projekte belegt sein Lebenslauf?",
    "Hat er mit Behörden und Konzernen gearbeitet?",
  ],
  /* Bewusst ZU: So sieht die Seite aus, die an eine Firma geht (Vermittlungsmodell). */
  kontaktSichtbar: false,
};

/**
 * DER EINE ÜBERSETZER — `LebenslaufProfil` (Speicher-Rohdaten) → `ExecutiveProfil` (Seite).
 * Genau der Baustein, den der Kopf dieser Datei ankündigt: Die echte Profilseite
 * (`app/lebenslauf/[id]`) rendert seit dem 24.08.2026 die Executive-Vorlage (Owner: „unter
 * der Landingpage die Seite, die der User bekommt … Die Leute kaufen was sie sehen" — was
 * das Beispiel zeigt, muss auch geliefert werden).
 *
 * NUR WAS DA IST: Die Auswertung liefert weniger Felder, als das Muster-Profil zeigt
 * (kein Impact, keine Ausbildung, keine Sprachtabelle) — diese Abschnitte bleiben dann
 * einfach weg, die Vorlage blendet leere Listen selbst aus. NIE erfinden (Auftrag: „Do not
 * invent achievements"), NIE Prozentzahlen.
 */

/** „Wann kannst du anfangen?" — dieselben drei Kennungen wie im Trichter
    (`VERFUEGBARKEIT` in LebenslaufStartClient), hier in Worten. De/En wie der Trichter. */
const VERFUEGBAR_WORT: Record<string, { de: string; en: string }> = {
  sofort: { de: "Sofort verfügbar", en: "Available immediately" },
  "1monat": { de: "Verfügbar in 1 Monat", en: "Available in 1 month" },
  flexibel: { de: "Flexibel verfügbar", en: "Availability flexible" },
};

export function executiveAusProfil(p: LebenslaufProfil, lang: Lang = "en"): ExecutiveProfil {
  const kategorien = (p.kategorien ?? []).filter(Boolean);
  const kompetenzen = (p.kompetenzen ?? []).filter(Boolean);
  const name = (p.name ?? "").trim();
  const vorname = name.split(" ")[0] || name;
  const de = lang === "de";

  /* Die Beispiel-Fragen des Profil-Chats — nur, wenn es etwas zu fragen GIBT (Memory
     `chat-no-personal-questions-buttons-only`: „Chips nie leer"). Ohne Fragen blendet die
     Vorlage den ganzen Chat-Einstieg aus. */
  const chatFragen: string[] = [];
  if (name && kategorien[0]) {
    chatFragen.push(de
      ? `Hat ${vorname} Erfahrung als ${kategorien[0]}?`
      : `Does ${vorname} have experience as ${kategorien[0]}?`);
  }
  if (name && kompetenzen[0]) {
    chatFragen.push(de
      ? `Welche Stärken belegt der Lebenslauf von ${vorname}?`
      : `Which strengths does ${vorname}'s resume document?`);
  }

  return {
    id: p.id,
    name: name || (de ? "Profil" : "Profile"),
    /* Die Positionierung: bei einer zugeschnittenen Bewerbung die Zeile aus dem Zuschnitt
       (Multi-Bewerbung, nur wenn der Lebenslauf sie trägt); sonst die jüngste Station;
       ersatzweise die erste Berufskategorie. */
    rolle: p.positionierung || p.erfahrung?.[0]?.rolle || kategorien[0] || "",
    ort: (p.ort ?? "").trim(),
    sprachenKurz: "",
    verfuegbar: p.verfuegbarkeit
      ? (VERFUEGBAR_WORT[p.verfuegbarkeit]?.[de ? "de" : "en"] ?? "")
      : undefined,
    /* Eigene Schwerpunkte aus der Auswertung; Altprofile ohne sie fallen auf die
       Kategorien zurück (Owner 24.08.2026: „lauter Redundanzen" — deshalb getrennt). */
    schwerpunkte: (p.schwerpunkte?.length ? p.schwerpunkte : kategorien).slice(0, 4),
    /* Das Poster IST sein Foto (Skill `card`: nie ein Video ohne Poster) — die
       Fertigstellen-Route legt es seit 24.08.2026 dauerhaft ab. */
    portraitUrl: p.fotoUrl ?? "",
    videoUrl: p.videoUrl,
    profil: (p.sprechtext ?? "").trim() || (p.stichpunkte ?? []).join(" · "),
    expertise: kompetenzen,
    /* SEIT 24.08.2026 MIT FIRMA UND ERGEBNIS (Owner: „es muss alles rein") — die Vorlage
       hatte für beide schon eigene Zeilen (LebenslaufExecutive.tsx blendet sie einzeln aus,
       wenn leer), nur die Auswertung lieferte sie nie. Altprofile ohne diese Felder zeigen
       weiterhin nur Rolle + Zeitraum, keine leeren Zeilen. */
    erfahrung: (p.erfahrung ?? [])
      .filter(e => e.rolle)
      .map(e => ({ rolle: e.rolle, firma: e.firma ?? "", zeitraum: e.zeitraum, ergebnis: e.ergebnis ?? "" })),
    impact: [],
    /* Ausbildung/Sprachen kommen jetzt echt aus der Auswertung (Owner 24.08.2026 — vorher
       für JEDES reale Profil hart leer, obwohl die Vorlage eigene Abschnitte dafür hat). */
    ausbildung: (p.ausbildung ?? []).filter(a => a.titel).map(a => ({ titel: a.titel, ort: a.ort ?? "", zeitraum: a.zeitraum ?? "" })),
    sprachen: (p.sprachen ?? []).filter(s => s.sprache).map(s => ({ sprache: s.sprache, niveau: s.niveau ?? "" })),
    chatFragen,
    kontaktSichtbar: p.kontaktSichtbar === true,
    viewCount: p.viewCount,
    videoKlicks: p.videoKlicks,
    kontakt: {
      ort: p.ort || undefined,
      telefon: p.telefon || undefined,
      email: p.email || undefined,
    },
  };
}
