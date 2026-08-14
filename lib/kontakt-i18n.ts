import type { Lang } from "@/lib/lang";

/**
 * DAS KONTAKTFORMULAR IN SIEBEN SPRACHEN (Owner 14.08.2026: „der Contactformular muss auch
 * übersetzt werden"). Die Seite war komplett englisch einkodiert — auf einem Portal, das
 * überall sonst der `lb_lang`-Wahl folgt. Duzen, wie im ganzen Haus.
 */
export type KontaktText = {
  untertitel: string;
  titel: string;
  intro: string;
  gruende: { own: string; support: string; complaint: string; general: string };
  bitteWaehlen: string;
  /** Vorbefüllte Sponsor-Anfrage — {name} ist der Influencer-Name, wenn einer mitkam. */
  sponsorVorlage: (name: string) => string;
  nameLabel: string; namePh: string;
  emailLabel: string; emailPh: string;
  grundLabel: string;
  nachrichtLabel: string; nachrichtPh: string;
  fName: string; fEmail: string; fEmailUngueltig: string; fGrund: string; fNachricht: string;
  sendeFehler: string; netzFehler: string;
  gesendetTitel: string;
  /** Der Dank — VOR und NACH der eingesetzten Adresse. */
  dankeVor: string; dankeNach: string;
  zurueck: string;
  senden: string; sendet: string;
  felderFixen: string;
};

const en: KontaktText = {
  untertitel: "Contact", titel: "Get in touch",
  intro: "Questions, feedback, or a complaint? Send us a message — we'll get back to you.",
  gruende: { own: "Sponsor an influencer", support: "Support", complaint: "Complaint", general: "General" },
  bitteWaehlen: "Please select",
  sponsorVorlage: n => `Hi, I'd like to sponsor ${n ? `${n} ` : "an influencer "}exclusively on LuxuryBandit. Please tell me how it works and what it costs.`,
  nameLabel: "Name", namePh: "First and last name",
  emailLabel: "Email", emailPh: "you@email.com",
  grundLabel: "Reason",
  nachrichtLabel: "Message", nachrichtPh: "Your message…",
  fName: "Please enter your name.", fEmail: "Please enter your email.",
  fEmailUngueltig: "Please enter a valid email address.", fGrund: "Please choose a reason.",
  fNachricht: "Please write a short message.",
  sendeFehler: "Could not send. Please try again.", netzFehler: "Network error. Please try again.",
  gesendetTitel: "Message sent!",
  dankeVor: "Thanks for reaching out. A confirmation is on its way to ",
  dankeNach: " — we'll get back to you as soon as we can.",
  zurueck: "Back to LuxuryBandit",
  senden: "Send message", sendet: "Sending…",
  felderFixen: "Please fix the highlighted fields above.",
};

const de: KontaktText = {
  untertitel: "Kontakt", titel: "Schreib uns",
  intro: "Fragen, Feedback oder eine Beschwerde? Schick uns eine Nachricht — wir melden uns.",
  gruende: { own: "Influencer sponsern", support: "Support", complaint: "Beschwerde", general: "Allgemein" },
  bitteWaehlen: "Bitte wählen",
  sponsorVorlage: n => `Hallo, ich möchte ${n ? `${n} ` : "einen Influencer "}exklusiv auf LuxuryBandit sponsern. Sagt mir bitte, wie es funktioniert und was es kostet.`,
  nameLabel: "Name", namePh: "Vor- und Nachname",
  emailLabel: "E-Mail", emailPh: "du@email.com",
  grundLabel: "Grund",
  nachrichtLabel: "Nachricht", nachrichtPh: "Deine Nachricht …",
  fName: "Bitte gib deinen Namen ein.", fEmail: "Bitte gib deine E-Mail ein.",
  fEmailUngueltig: "Bitte gib eine gültige E-Mail-Adresse ein.", fGrund: "Bitte wähle einen Grund.",
  fNachricht: "Bitte schreib eine kurze Nachricht.",
  sendeFehler: "Senden fehlgeschlagen. Bitte versuch es noch einmal.", netzFehler: "Netzwerkfehler. Bitte versuch es noch einmal.",
  gesendetTitel: "Nachricht gesendet!",
  dankeVor: "Danke für deine Nachricht. Eine Bestätigung ist unterwegs an ",
  dankeNach: " — wir melden uns so schnell wie möglich.",
  zurueck: "Zurück zu LuxuryBandit",
  senden: "Nachricht senden", sendet: "Wird gesendet …",
  felderFixen: "Bitte korrigiere die markierten Felder oben.",
};

const ro: KontaktText = {
  untertitel: "Contact", titel: "Scrie-ne",
  intro: "Întrebări, feedback sau o reclamație? Trimite-ne un mesaj — revenim la tine.",
  gruende: { own: "Sponsorizează un influencer", support: "Suport", complaint: "Reclamație", general: "General" },
  bitteWaehlen: "Alege, te rog",
  sponsorVorlage: n => `Bună, aș vrea să sponsorizez ${n ? `${n} ` : "un influencer "}exclusiv pe LuxuryBandit. Spuneți-mi cum funcționează și cât costă.`,
  nameLabel: "Nume", namePh: "Prenume și nume",
  emailLabel: "Email", emailPh: "tu@email.com",
  grundLabel: "Motiv",
  nachrichtLabel: "Mesaj", nachrichtPh: "Mesajul tău…",
  fName: "Te rog scrie numele tău.", fEmail: "Te rog scrie emailul tău.",
  fEmailUngueltig: "Te rog scrie o adresă de email validă.", fGrund: "Te rog alege un motiv.",
  fNachricht: "Te rog scrie un mesaj scurt.",
  sendeFehler: "Nu s-a putut trimite. Încearcă din nou.", netzFehler: "Eroare de rețea. Încearcă din nou.",
  gesendetTitel: "Mesaj trimis!",
  dankeVor: "Mulțumim că ne-ai scris. O confirmare e pe drum către ",
  dankeNach: " — revenim cât de repede putem.",
  zurueck: "Înapoi la LuxuryBandit",
  senden: "Trimite mesajul", sendet: "Se trimite…",
  felderFixen: "Te rog corectează câmpurile marcate mai sus.",
};

const es: KontaktText = {
  untertitel: "Contacto", titel: "Escríbenos",
  intro: "¿Preguntas, comentarios o una queja? Envíanos un mensaje — te responderemos.",
  gruende: { own: "Patrocinar a un influencer", support: "Soporte", complaint: "Queja", general: "General" },
  bitteWaehlen: "Elige, por favor",
  sponsorVorlage: n => `Hola, me gustaría patrocinar ${n ? `a ${n} ` : "a un influencer "}en exclusiva en LuxuryBandit. Decidme cómo funciona y cuánto cuesta.`,
  nameLabel: "Nombre", namePh: "Nombre y apellido",
  emailLabel: "Email", emailPh: "tu@email.com",
  grundLabel: "Motivo",
  nachrichtLabel: "Mensaje", nachrichtPh: "Tu mensaje…",
  fName: "Escribe tu nombre, por favor.", fEmail: "Escribe tu email, por favor.",
  fEmailUngueltig: "Escribe una dirección de email válida.", fGrund: "Elige un motivo, por favor.",
  fNachricht: "Escribe un mensaje corto, por favor.",
  sendeFehler: "No se pudo enviar. Inténtalo de nuevo.", netzFehler: "Error de red. Inténtalo de nuevo.",
  gesendetTitel: "¡Mensaje enviado!",
  dankeVor: "Gracias por escribirnos. Una confirmación va de camino a ",
  dankeNach: " — te responderemos lo antes posible.",
  zurueck: "Volver a LuxuryBandit",
  senden: "Enviar mensaje", sendet: "Enviando…",
  felderFixen: "Corrige los campos marcados arriba, por favor.",
};

const fr: KontaktText = {
  untertitel: "Contact", titel: "Écris-nous",
  intro: "Des questions, un retour ou une réclamation ? Envoie-nous un message — on te répond.",
  gruende: { own: "Sponsoriser un influenceur", support: "Support", complaint: "Réclamation", general: "Général" },
  bitteWaehlen: "Choisis, s'il te plaît",
  sponsorVorlage: n => `Bonjour, je voudrais sponsoriser ${n ? `${n} ` : "un influenceur "}en exclusivité sur LuxuryBandit. Dites-moi comment ça marche et combien ça coûte.`,
  nameLabel: "Nom", namePh: "Prénom et nom",
  emailLabel: "Email", emailPh: "toi@email.com",
  grundLabel: "Motif",
  nachrichtLabel: "Message", nachrichtPh: "Ton message…",
  fName: "Écris ton nom, s'il te plaît.", fEmail: "Écris ton email, s'il te plaît.",
  fEmailUngueltig: "Écris une adresse email valide.", fGrund: "Choisis un motif, s'il te plaît.",
  fNachricht: "Écris un court message, s'il te plaît.",
  sendeFehler: "Envoi impossible. Réessaie.", netzFehler: "Erreur réseau. Réessaie.",
  gesendetTitel: "Message envoyé !",
  dankeVor: "Merci pour ton message. Une confirmation est en route vers ",
  dankeNach: " — on te répond au plus vite.",
  zurueck: "Retour à LuxuryBandit",
  senden: "Envoyer le message", sendet: "Envoi…",
  felderFixen: "Corrige les champs marqués ci-dessus, s'il te plaît.",
};

const pt: KontaktText = {
  untertitel: "Contacto", titel: "Escreve-nos",
  intro: "Dúvidas, feedback ou uma reclamação? Envia-nos uma mensagem — nós respondemos.",
  gruende: { own: "Patrocinar um influencer", support: "Suporte", complaint: "Reclamação", general: "Geral" },
  bitteWaehlen: "Escolhe, por favor",
  sponsorVorlage: n => `Olá, gostaria de patrocinar ${n ? `${n} ` : "um influencer "}em exclusivo na LuxuryBandit. Digam-me como funciona e quanto custa.`,
  nameLabel: "Nome", namePh: "Nome e apelido",
  emailLabel: "Email", emailPh: "tu@email.com",
  grundLabel: "Motivo",
  nachrichtLabel: "Mensagem", nachrichtPh: "A tua mensagem…",
  fName: "Escreve o teu nome, por favor.", fEmail: "Escreve o teu email, por favor.",
  fEmailUngueltig: "Escreve um endereço de email válido.", fGrund: "Escolhe um motivo, por favor.",
  fNachricht: "Escreve uma mensagem curta, por favor.",
  sendeFehler: "Não foi possível enviar. Tenta de novo.", netzFehler: "Erro de rede. Tenta de novo.",
  gesendetTitel: "Mensagem enviada!",
  dankeVor: "Obrigado pela tua mensagem. Uma confirmação vai a caminho de ",
  dankeNach: " — respondemos o mais depressa possível.",
  zurueck: "Voltar à LuxuryBandit",
  senden: "Enviar mensagem", sendet: "A enviar…",
  felderFixen: "Corrige os campos marcados acima, por favor.",
};

const it: KontaktText = {
  untertitel: "Contatto", titel: "Scrivici",
  intro: "Domande, feedback o un reclamo? Mandaci un messaggio — ti rispondiamo.",
  gruende: { own: "Sponsorizza un influencer", support: "Supporto", complaint: "Reclamo", general: "Generale" },
  bitteWaehlen: "Scegli, per favore",
  sponsorVorlage: n => `Ciao, vorrei sponsorizzare ${n ? `${n} ` : "un influencer "}in esclusiva su LuxuryBandit. Ditemi come funziona e quanto costa.`,
  nameLabel: "Nome", namePh: "Nome e cognome",
  emailLabel: "Email", emailPh: "tu@email.com",
  grundLabel: "Motivo",
  nachrichtLabel: "Messaggio", nachrichtPh: "Il tuo messaggio…",
  fName: "Scrivi il tuo nome, per favore.", fEmail: "Scrivi la tua email, per favore.",
  fEmailUngueltig: "Scrivi un indirizzo email valido.", fGrund: "Scegli un motivo, per favore.",
  fNachricht: "Scrivi un breve messaggio, per favore.",
  sendeFehler: "Invio non riuscito. Riprova.", netzFehler: "Errore di rete. Riprova.",
  gesendetTitel: "Messaggio inviato!",
  dankeVor: "Grazie per averci scritto. Una conferma è in arrivo a ",
  dankeNach: " — ti rispondiamo il prima possibile.",
  zurueck: "Torna a LuxuryBandit",
  senden: "Invia il messaggio", sendet: "Invio…",
  felderFixen: "Correggi i campi evidenziati sopra, per favore.",
};

const TABELLE: Record<Lang, KontaktText> = { en, de, ro, es, fr, pt, it };

export function kontaktText(lang: string | undefined): KontaktText {
  return TABELLE[(String(lang ?? "").slice(0, 2) as Lang)] ?? en;
}
