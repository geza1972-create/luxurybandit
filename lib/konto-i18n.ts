import type { Lang } from "@/lib/lang";

/**
 * GALERIE UND KONTO IN SIEBEN SPRACHEN (Owner 08.08.2026, nach der Nacht der vier Fehler:
 * „so jetzt muss alles auf englisch übersetzt werden und alle sprachen").
 *
 * WARUM AUSGERECHNET DIESE BEIDEN FLÄCHEN: Sie sind die einzigen, die JEDER Käufer nach dem
 * Kauf sieht — der Trichter hat seine Tabelle (`kiss-i18n`), die Themenseiten haben ihre,
 * aber die Galerie und der Geldbeutel sprachen bis hierher Deutsch. Ein Franzose, der eben
 * 4,99 € bezahlt hat, stand vor „Dein Video entsteht gerade" und wusste nicht, ob sein Geld
 * angekommen ist. Genau die Angst, die der Owner beschrieben hat („er denkt, das Video und
 * Geld sind verloren") — in einer fremden Sprache ist sie doppelt so gross.
 *
 * NICHT ÜBERSETZT sind die Admin-Flächen (Filter, Model-Suche, Freigabe-Schalter): Die sieht
 * nur der Owner, und ein deutscher Knopf schadet dort niemandem.
 *
 * DUZEN, IMMER (Memory `immer-duzen`): „du/dein", „tu/ton", „tú/tu", „tu/il tuo". Kein Sie,
 * kein vous, kein usted — auch nicht beim Geld.
 *
 * KEINE ZAHLEN in dieser Tabelle (Dauerregel): Beträge kommen aus `lib/pricing`.
 */

export type KontoText = {
  // ── Galerie ──
  galerieTitel: string;
  galerieHinweis: string;
  leer: string;
  /** Der Banner über allem, wenn etwas läuft. `{n}` = Anzahl (nur im Plural gesetzt). */
  laeuftEins: string;
  laeuftViele: string;
  laeuftDazu: string;
  /** Der Streifen auf der Kachel. */
  entsteht: string;
  loeschen: string;
  loeschenSicher: string;
  loeschFehlerFremd: string;
  loeschFehler: string;
  keineVerbindung: string;
  linkKopiert: string;
  teilen: string;
  download: string;
  avatar: string;
  avatarHinweis: string;
  avatarStimme: string;
  // ── Konto ──
  kontoTitel: string;
  aktuell: string;
  adressePflicht: string;
  kasseFehler: string;
  auszug: string;
  verfaelltNie: string;
  zurueck: string;
  guthaben: string;
  // ── Buchungsarten im Auszug ──
  aufladung: string;
  kauf: string;
  erstattung: string;
  geschenk: string;
  uebertrag: string;
  korrektur: string;
};

const en: KontoText = {
  galerieTitel: "My Gallery",
  galerieHinweis: "Tap a video — full screen and download.",
  leer: "Nothing here yet — make your first one.",
  laeuftEins: "Your video is being created",
  laeuftViele: "{n} videos are being created",
  laeuftDazu: "— it will appear here by itself, you can close this page.",
  entsteht: "Video coming …",
  loeschen: "Delete",
  loeschenSicher: "Really delete — tap again",
  loeschFehlerFremd: "This one belongs to another address or device. Sign in with the address you created it with.",
  loeschFehler: "Deleting didn't work. Please try again.",
  keineVerbindung: "No connection. Please try again.",
  linkKopiert: "Link copied",
  teilen: "Share",
  download: "Download",
  avatar: "Your avatar",
  avatarHinweis: "Your face and voice for every video. A new recording replaces it.",
  avatarStimme: "with your voice",
  kontoTitel: "Top up your account",
  aktuell: "Currently:",
  adressePflicht: "Please enter your email address — your credit is booked to it.",
  kasseFehler: "Checkout didn't open. Please try again.",
  auszug: "Statement",
  verfaelltNie: "Credit never expires · no cash payout",
  zurueck: "Back",
  guthaben: "Credit",
  aufladung: "Top-up",
  kauf: "Purchase",
  erstattung: "Refund",
  geschenk: "Gift",
  uebertrag: "Transfer",
  korrektur: "Correction",
};

const de: KontoText = {
  galerieTitel: "Meine Galerie",
  galerieHinweis: "Tippe ein Video an — Vollbild und Download.",
  leer: "Noch nichts hier — mach dein erstes.",
  laeuftEins: "Dein Video entsteht gerade",
  laeuftViele: "{n} Videos entstehen gerade",
  laeuftDazu: "— es erscheint hier von selbst, du kannst die Seite schliessen.",
  entsteht: "Video entsteht …",
  loeschen: "Löschen",
  loeschenSicher: "Wirklich löschen — nochmal tippen",
  loeschFehlerFremd: "Dieses Stück gehört zu einer anderen Adresse oder einem anderen Gerät. Melde dich mit der Adresse an, mit der du es erzeugt hast.",
  loeschFehler: "Löschen hat nicht geklappt. Bitte noch einmal versuchen.",
  keineVerbindung: "Keine Verbindung. Bitte noch einmal versuchen.",
  linkKopiert: "Link kopiert",
  teilen: "Teilen",
  download: "Speichern",
  avatar: "Dein Avatar",
  avatarHinweis: "Dein Gesicht und deine Stimme für jedes Video. Eine neue Aufnahme ersetzt ihn.",
  avatarStimme: "mit deiner Stimme",
  kontoTitel: "Konto aufladen",
  aktuell: "Aktuell:",
  adressePflicht: "Bitte gib deine E-Mail-Adresse an — auf sie wird das Guthaben gebucht.",
  kasseFehler: "Die Kasse ging nicht auf. Bitte noch einmal.",
  auszug: "Kontoauszug",
  verfaelltNie: "Guthaben verfällt nie · keine Barauszahlung",
  zurueck: "Zurück",
  guthaben: "Guthaben",
  aufladung: "Aufladung",
  kauf: "Kauf",
  erstattung: "Erstattung",
  geschenk: "Geschenkt",
  uebertrag: "Übertrag",
  korrektur: "Korrektur",
};

const ro: KontoText = {
  galerieTitel: "Galeria mea",
  galerieHinweis: "Atinge un videoclip — ecran complet și descărcare.",
  leer: "Încă nimic aici — creează primul tău.",
  laeuftEins: "Videoclipul tău se creează acum",
  laeuftViele: "{n} videoclipuri se creează acum",
  laeuftDazu: "— va apărea aici singur, poți închide pagina.",
  entsteht: "Videoclipul vine …",
  loeschen: "Șterge",
  loeschenSicher: "Chiar ștergi — atinge din nou",
  loeschFehlerFremd: "Acesta aparține altei adrese sau altui dispozitiv. Conectează-te cu adresa cu care l-ai creat.",
  loeschFehler: "Ștergerea nu a reușit. Încearcă din nou.",
  keineVerbindung: "Fără conexiune. Încearcă din nou.",
  linkKopiert: "Link copiat",
  teilen: "Distribuie",
  download: "Descarcă",
  avatar: "Avatarul tău",
  avatarHinweis: "Chipul și vocea ta pentru fiecare videoclip. O înregistrare nouă îl înlocuiește.",
  avatarStimme: "cu vocea ta",
  kontoTitel: "Încarcă-ți contul",
  aktuell: "Acum:",
  adressePflicht: "Introdu adresa ta de e-mail — pe ea se înregistrează creditul.",
  kasseFehler: "Casa nu s-a deschis. Încearcă din nou.",
  auszug: "Extras de cont",
  verfaelltNie: "Creditul nu expiră niciodată · fără plată în numerar",
  zurueck: "Înapoi",
  guthaben: "Credit",
  aufladung: "Încărcare",
  kauf: "Cumpărare",
  erstattung: "Rambursare",
  geschenk: "Cadou",
  uebertrag: "Transfer",
  korrektur: "Corecție",
};

const es: KontoText = {
  galerieTitel: "Mi galería",
  galerieHinweis: "Toca un vídeo — pantalla completa y descarga.",
  leer: "Aquí todavía no hay nada — crea el primero.",
  laeuftEins: "Tu vídeo se está creando",
  laeuftViele: "Se están creando {n} vídeos",
  laeuftDazu: "— aparecerá aquí solo, puedes cerrar la página.",
  entsteht: "El vídeo llega …",
  loeschen: "Borrar",
  loeschenSicher: "¿Borrar de verdad? Toca otra vez",
  loeschFehlerFremd: "Esto pertenece a otra dirección o a otro dispositivo. Inicia sesión con la dirección con la que lo creaste.",
  loeschFehler: "No se pudo borrar. Inténtalo otra vez.",
  keineVerbindung: "Sin conexión. Inténtalo otra vez.",
  linkKopiert: "Enlace copiado",
  teilen: "Compartir",
  download: "Descargar",
  avatar: "Tu avatar",
  avatarHinweis: "Tu cara y tu voz para cada vídeo. Una grabación nueva lo sustituye.",
  avatarStimme: "con tu voz",
  kontoTitel: "Recarga tu cuenta",
  aktuell: "Ahora:",
  adressePflicht: "Introduce tu correo electrónico — el saldo se abona en él.",
  kasseFehler: "La caja no se abrió. Inténtalo otra vez.",
  auszug: "Movimientos",
  verfaelltNie: "El saldo nunca caduca · sin pago en efectivo",
  zurueck: "Volver",
  guthaben: "Saldo",
  aufladung: "Recarga",
  kauf: "Compra",
  erstattung: "Reembolso",
  geschenk: "Regalo",
  uebertrag: "Traspaso",
  korrektur: "Corrección",
};

const fr: KontoText = {
  galerieTitel: "Ma galerie",
  galerieHinweis: "Touche une vidéo — plein écran et téléchargement.",
  leer: "Rien ici pour l'instant — crée la première.",
  laeuftEins: "Ta vidéo est en cours de création",
  laeuftViele: "{n} vidéos sont en cours de création",
  laeuftDazu: "— elle apparaîtra ici toute seule, tu peux fermer la page.",
  entsteht: "La vidéo arrive …",
  loeschen: "Supprimer",
  loeschenSicher: "Vraiment supprimer — touche encore",
  loeschFehlerFremd: "Ceci appartient à une autre adresse ou à un autre appareil. Connecte-toi avec l'adresse utilisée pour la créer.",
  loeschFehler: "La suppression a échoué. Réessaie.",
  keineVerbindung: "Pas de connexion. Réessaie.",
  linkKopiert: "Lien copié",
  teilen: "Partager",
  download: "Télécharger",
  avatar: "Ton avatar",
  avatarHinweis: "Ton visage et ta voix pour chaque vidéo. Un nouvel enregistrement le remplace.",
  avatarStimme: "avec ta voix",
  kontoTitel: "Recharge ton compte",
  aktuell: "Actuellement :",
  adressePflicht: "Indique ton adresse e-mail — ton crédit y est enregistré.",
  kasseFehler: "La caisse ne s'est pas ouverte. Réessaie.",
  auszug: "Relevé",
  verfaelltNie: "Le crédit n'expire jamais · pas de versement en espèces",
  zurueck: "Retour",
  guthaben: "Crédit",
  aufladung: "Recharge",
  kauf: "Achat",
  erstattung: "Remboursement",
  geschenk: "Cadeau",
  uebertrag: "Transfert",
  korrektur: "Correction",
};

const pt: KontoText = {
  galerieTitel: "A minha galeria",
  galerieHinweis: "Toca num vídeo — ecrã inteiro e transferência.",
  leer: "Ainda nada aqui — cria o primeiro.",
  laeuftEins: "O teu vídeo está a ser criado",
  laeuftViele: "{n} vídeos estão a ser criados",
  laeuftDazu: "— vai aparecer aqui sozinho, podes fechar a página.",
  entsteht: "O vídeo está a chegar …",
  loeschen: "Apagar",
  loeschenSicher: "Apagar mesmo — toca outra vez",
  loeschFehlerFremd: "Isto pertence a outro endereço ou a outro dispositivo. Inicia sessão com o endereço com que o criaste.",
  loeschFehler: "Não foi possível apagar. Tenta outra vez.",
  keineVerbindung: "Sem ligação. Tenta outra vez.",
  linkKopiert: "Link copiado",
  teilen: "Partilhar",
  download: "Transferir",
  avatar: "O teu avatar",
  avatarHinweis: "O teu rosto e a tua voz para cada vídeo. Uma nova gravação substitui-o.",
  avatarStimme: "com a tua voz",
  kontoTitel: "Carrega a tua conta",
  aktuell: "Agora:",
  adressePflicht: "Indica o teu e-mail — o saldo é registado nele.",
  kasseFehler: "A caixa não abriu. Tenta outra vez.",
  auszug: "Extrato",
  verfaelltNie: "O saldo nunca expira · sem pagamento em dinheiro",
  zurueck: "Voltar",
  guthaben: "Saldo",
  aufladung: "Carregamento",
  kauf: "Compra",
  erstattung: "Reembolso",
  geschenk: "Oferta",
  uebertrag: "Transferência",
  korrektur: "Correção",
};

const it: KontoText = {
  galerieTitel: "La mia galleria",
  galerieHinweis: "Tocca un video — schermo intero e download.",
  leer: "Ancora niente qui — crea il primo.",
  laeuftEins: "Il tuo video si sta creando",
  laeuftViele: "{n} video si stanno creando",
  laeuftDazu: "— comparirà qui da solo, puoi chiudere la pagina.",
  entsteht: "Il video sta arrivando …",
  loeschen: "Elimina",
  loeschenSicher: "Eliminare davvero — tocca di nuovo",
  loeschFehlerFremd: "Questo appartiene a un altro indirizzo o a un altro dispositivo. Accedi con l'indirizzo con cui l'hai creato.",
  loeschFehler: "Eliminazione non riuscita. Riprova.",
  keineVerbindung: "Nessuna connessione. Riprova.",
  linkKopiert: "Link copiato",
  teilen: "Condividi",
  download: "Scarica",
  avatar: "Il tuo avatar",
  avatarHinweis: "Il tuo viso e la tua voce per ogni video. Una nuova registrazione lo sostituisce.",
  avatarStimme: "con la tua voce",
  kontoTitel: "Ricarica il tuo conto",
  aktuell: "Ora:",
  adressePflicht: "Inserisci la tua e-mail — il credito viene registrato su di essa.",
  kasseFehler: "La cassa non si è aperta. Riprova.",
  auszug: "Estratto conto",
  verfaelltNie: "Il credito non scade mai · nessun pagamento in contanti",
  zurueck: "Indietro",
  guthaben: "Credito",
  aufladung: "Ricarica",
  kauf: "Acquisto",
  erstattung: "Rimborso",
  geschenk: "Regalo",
  uebertrag: "Trasferimento",
  korrektur: "Correzione",
};

const TABELLE: Record<Lang, KontoText> = { en, de, ro, es, fr, pt, it };

/** Der Text zur Sprache — Unbekanntes ist Englisch (Hausregel `lib/lang`). */
export function kontoText(lang: string | undefined): KontoText {
  return TABELLE[(lang ?? "").slice(0, 2) as Lang] ?? en;
}

/**
 * DIE SPRACHE IM BROWSER — aus dem Cookie, den der Umschalter setzt.
 *
 * Warum nicht `navigator.language`: Der Nutzer hat die Sprache GEWÄHLT; sein Gerät kann eine
 * andere sagen (Owner-Regel „Sprache ≠ Standort"). Serverseitig macht `lib/lang-server` das
 * Gleiche — hier reicht der Cookie, weil beide Flächen Client-Komponenten sind.
 */
export function spracheAusCookie(): Lang {
  if (typeof document === "undefined") return "en";
  const roh = document.cookie.match(/(?:^|; )lb_lang=([^;]*)/)?.[1] ?? "en";
  const kurz = decodeURIComponent(roh).slice(0, 2) as Lang;
  return TABELLE[kurz] ? kurz : "en";
}

/**
 * WOFÜR ER BEZAHLT HAT — das Thema in seiner Sprache.
 *
 * Das Thema schlägt die Buchungsart: „Geburtstagsvideo" sagt ihm mehr als „Kauf". Ein Thema,
 * das hier fehlt (neues Topic), fällt still auf die Art zurück — nie auf einen technischen
 * Schlüssel.
 */
const THEMEN: Record<Lang, Record<string, string>> = {
  en: { birthday: "Birthday video", kiss: "Kiss video", poledance: "Pole dance video", holiday: "Holiday invitation", wedding: "Wedding invitation", gutschein: "Gift card", plan: "Idea analysis" },
  de: { birthday: "Geburtstagsvideo", kiss: "Kuss-Video", poledance: "Poledance-Video", holiday: "Urlaubs-Einladung", wedding: "Hochzeits-Einladung", gutschein: "Gutschein", plan: "Ideen-Analyse" },
  ro: { birthday: "Video de ziua ta", kiss: "Video cu sărut", poledance: "Video pole dance", holiday: "Invitație de vacanță", wedding: "Invitație de nuntă", gutschein: "Card cadou", plan: "Analiza ideii" },
  es: { birthday: "Vídeo de cumpleaños", kiss: "Vídeo de beso", poledance: "Vídeo de pole dance", holiday: "Invitación de vacaciones", wedding: "Invitación de boda", gutschein: "Tarjeta regalo", plan: "Análisis de idea" },
  fr: { birthday: "Vidéo d'anniversaire", kiss: "Vidéo de baiser", poledance: "Vidéo pole dance", holiday: "Invitation vacances", wedding: "Invitation de mariage", gutschein: "Carte cadeau", plan: "Analyse d'idée" },
  pt: { birthday: "Vídeo de aniversário", kiss: "Vídeo de beijo", poledance: "Vídeo de pole dance", holiday: "Convite de férias", wedding: "Convite de casamento", gutschein: "Cartão presente", plan: "Análise da ideia" },
  it: { birthday: "Video di compleanno", kiss: "Video del bacio", poledance: "Video pole dance", holiday: "Invito vacanza", wedding: "Invito di nozze", gutschein: "Buono regalo", plan: "Analisi dell'idea" },
};

/** Die Buchungsart in Worten des Kunden — Thema schlägt Art (siehe API `/api/konto`). */
export function buchungWort(lang: Lang, art: string, thema: string): string {
  const t = TABELLE[lang] ?? en;
  const th = (THEMEN[lang] ?? THEMEN.en)[thema];
  if (th) return th;
  return (t as unknown as Record<string, string>)[art] ?? t.kauf;
}
