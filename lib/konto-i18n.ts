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
  /**
   * DER EHRLICHE ENDZUSTAND (15.08.2026). Optional, damit eine Sprache, die ihn noch nicht
   * hat, den englischen Rueckfall zeigt statt einer leeren Kachel.
   */
  nichtGeklappt?: string;
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
  /**
   * DIE KACHEL SAGT, WAS SIE IST (Owner 11.08.2026: „Und da kannst du im Label schreiben
   * statt privat Programm"). Ersetzt „Private" auf der Programm-Kachel — alles andere in der
   * Galerie ist ohnehin privat, das braucht kein Schild (siehe `programm` = Punkt 1+4).
   */
  programm: string;
  /** Leere Galerie ohne Anmeldung — ohne das Wort „Try-ons" (Owner 12.08.2026). */
  galerieAnmelden: string;
  /** Fuer NICHT-Angemeldete mit Inhalten: dieses Geraet ist nur ein Ausschnitt; erst die
   *  Anmeldung zeigt alles am Konto (Owner 14.08.2026, nach der 4-vs-9-Verwirrung). */
  galerieMehrMitKonto: string;
  /**
   * DIE DATENZEILE JE WERK (Owner 11.08.2026: „stehen auch keine Daten, wann ich das
   * aufgenommen habe für was. Oder generiert wann, gekauft für wieviel, wie lang das video
   * ist"). Drei Wörter, die vor Datum/Betrag/Länge stehen.
   */
  aufgenommen: string;
  fertig: string;
  bezahlt: string;
  // ── Einladung zur Anmeldung ──
  anmeldeTitel: string;
  anmeldeGrund: string;
  anmeldeKnopf: string;
  anmeldeSpaeter: string;
  /** „Projekt sichern" — die Einladung NACH dem Ergebnis (Owner-Master-Auftrag 13.08.2026,
      §16: kein Konto-Zwang im Kaufweg; danach das Angebot, das Projekt zu behalten). */
  sichernTitel: string;
  sichernGrund: string;
  sichernKnopf: string;
  schonKonto: string;
  schonKontoGrund: string;
  gesperrtTitel: string;
  gesperrtGrund: string;
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
  entsteht: "Video coming …", nichtGeklappt: "Didn't work — ask for a refund",
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
  programm: "Program",
  galerieAnmelden: "Sign in to see your gallery.",
  galerieMehrMitKonto: "You are seeing only what this device created — sign in to see everything on your account.",
  aufgenommen: "Recorded",
  fertig: "Ready",
  bezahlt: "Paid",
  anmeldeTitel: "Sign in — then it's truly yours",
  anmeldeGrund: "Your credit and your videos stay with you, on every device. Without an account they live only in this browser.",
  anmeldeKnopf: "Sign in now",
  anmeldeSpaeter: "Later",
  sichernTitel: "Save your project",
  sichernGrund: "Want to keep your project on all your devices? A free account saves your video and your credit.",
  sichernKnopf: "Create a free account",
  schonKonto: "I already have an account — sign in and use my credit",
  schonKontoGrund: "If you have topped up before, sign in — your credit will be used automatically.",
  gesperrtTitel: "You already have credit here",
  gesperrtGrund: "There is credit on this address. Sign in and it pays for your video — no need to pay again.",
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
  entsteht: "Video entsteht …", nichtGeklappt: "Hat nicht geklappt — Erstattung anfragen",
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
  programm: "Programm",
  galerieAnmelden: "Melde dich an, um deine Galerie zu sehen.",
  galerieMehrMitKonto: "Du siehst nur, was dieses Gerät erzeugt hat — melde dich an, um alles auf deinem Konto zu sehen.",
  aufgenommen: "Aufgenommen",
  fertig: "Fertig",
  bezahlt: "Bezahlt",
  anmeldeTitel: "Melde dich an — dann gehört es wirklich dir",
  anmeldeGrund: "Dein Guthaben und deine Videos bleiben bei dir, auf jedem Gerät. Ohne Konto leben sie nur in diesem Browser.",
  anmeldeKnopf: "Jetzt anmelden",
  anmeldeSpaeter: "Später",
  sichernTitel: "Projekt sichern",
  sichernGrund: "Möchtest du dein Projekt auf allen Geräten behalten? Ein kostenloses Konto sichert dein Video und dein Guthaben.",
  sichernKnopf: "Kostenloses Konto erstellen",
  schonKonto: "Ich habe schon ein Konto — anmelden und Guthaben nutzen",
  schonKontoGrund: "Hast du schon einmal aufgeladen? Melde dich an — dein Guthaben wird dann automatisch genutzt.",
  gesperrtTitel: "Auf dieser Adresse liegt Guthaben",
  gesperrtGrund: "Für diese Adresse ist schon Guthaben da. Melde dich an, dann zahlt es dein Video — du musst nicht noch einmal bezahlen.",
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
  entsteht: "Videoclipul vine …", nichtGeklappt: "Nu a ieșit — cere restituirea",
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
  programm: "Program",
  galerieAnmelden: "Conectează-te ca să îți vezi galeria.",
  galerieMehrMitKonto: "Vezi doar ce a creat acest dispozitiv — autentifică-te ca să vezi tot ce e pe contul tău.",
  aufgenommen: "Înregistrat",
  fertig: "Gata",
  bezahlt: "Plătit",
  anmeldeTitel: "Conectează-te — atunci e cu adevărat al tău",
  anmeldeGrund: "Creditul și videoclipurile tale rămân la tine, pe orice dispozitiv. Fără cont trăiesc doar în acest browser.",
  anmeldeKnopf: "Conectează-te acum",
  anmeldeSpaeter: "Mai târziu",
  sichernTitel: "Salvează-ți proiectul",
  sichernGrund: "Vrei să-ți păstrezi proiectul pe toate dispozitivele? Un cont gratuit îți salvează videoclipul și creditul.",
  sichernKnopf: "Creează un cont gratuit",
  schonKonto: "Am deja cont — mă conectez și îmi folosesc creditul",
  schonKontoGrund: "Ai încărcat deja cont? Conectează-te — creditul tău se folosește automat.",
  gesperrtTitel: "Ai deja credit pe această adresă",
  gesperrtGrund: "Pe această adresă există deja credit. Conectează-te și îți plătește videoclipul — nu trebuie să plătești din nou.",
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
  entsteht: "El vídeo llega …", nichtGeklappt: "No salió — pide la devolución",
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
  programm: "Programa",
  galerieAnmelden: "Inicia sesión para ver tu galería.",
  galerieMehrMitKonto: "Solo ves lo que creó este dispositivo — inicia sesión para ver todo lo de tu cuenta.",
  aufgenommen: "Grabado",
  fertig: "Listo",
  bezahlt: "Pagado",
  anmeldeTitel: "Inicia sesión — así es de verdad tuyo",
  anmeldeGrund: "Tu saldo y tus vídeos se quedan contigo, en cualquier dispositivo. Sin cuenta viven solo en este navegador.",
  anmeldeKnopf: "Iniciar sesión ahora",
  anmeldeSpaeter: "Más tarde",
  sichernTitel: "Guarda tu proyecto",
  sichernGrund: "¿Quieres conservar tu proyecto en todos tus dispositivos? Una cuenta gratuita guarda tu vídeo y tu saldo.",
  sichernKnopf: "Crear una cuenta gratis",
  schonKonto: "Ya tengo cuenta — iniciar sesión y usar mi saldo",
  schonKontoGrund: "¿Ya has recargado antes? Inicia sesión — tu saldo se usará automáticamente.",
  gesperrtTitel: "Ya tienes saldo en esta dirección",
  gesperrtGrund: "En esta dirección ya hay saldo. Inicia sesión y pagará tu vídeo — no hace falta pagar otra vez.",
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
  entsteht: "La vidéo arrive …", nichtGeklappt: "Ça n'a pas marché — demande un remboursement",
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
  programm: "Programme",
  galerieAnmelden: "Connecte-toi pour voir ta galerie.",
  galerieMehrMitKonto: "Tu ne vois que ce que cet appareil a créé — connecte-toi pour voir tout ton compte.",
  aufgenommen: "Enregistré",
  fertig: "Prêt",
  bezahlt: "Payé",
  anmeldeTitel: "Connecte-toi — c'est alors vraiment à toi",
  anmeldeGrund: "Ton crédit et tes vidéos restent avec toi, sur chaque appareil. Sans compte, ils ne vivent que dans ce navigateur.",
  anmeldeKnopf: "Se connecter maintenant",
  anmeldeSpaeter: "Plus tard",
  sichernTitel: "Sauvegarde ton projet",
  sichernGrund: "Tu veux garder ton projet sur tous tes appareils ? Un compte gratuit sauvegarde ta vidéo et ton crédit.",
  sichernKnopf: "Créer un compte gratuit",
  schonKonto: "J'ai déjà un compte — me connecter et utiliser mon crédit",
  schonKontoGrund: "Tu as déjà rechargé ? Connecte-toi — ton crédit sera utilisé automatiquement.",
  gesperrtTitel: "Tu as déjà du crédit sur cette adresse",
  gesperrtGrund: "Il y a déjà du crédit sur cette adresse. Connecte-toi et il paiera ta vidéo — inutile de payer une seconde fois.",
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
  entsteht: "O vídeo está a chegar …", nichtGeklappt: "Não resultou — pede a devolução",
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
  programm: "Programa",
  galerieAnmelden: "Inicia sessão para veres a tua galeria.",
  galerieMehrMitKonto: "Só vês o que este dispositivo criou — inicia sessão para veres tudo na tua conta.",
  aufgenommen: "Gravado",
  fertig: "Pronto",
  bezahlt: "Pago",
  anmeldeTitel: "Inicia sessão — assim é mesmo teu",
  anmeldeGrund: "O teu saldo e os teus vídeos ficam contigo, em qualquer dispositivo. Sem conta vivem só neste navegador.",
  anmeldeKnopf: "Iniciar sessão agora",
  anmeldeSpaeter: "Mais tarde",
  sichernTitel: "Guarda o teu projeto",
  sichernGrund: "Queres manter o teu projeto em todos os teus dispositivos? Uma conta gratuita guarda o teu vídeo e o teu saldo.",
  sichernKnopf: "Criar uma conta gratuita",
  schonKonto: "Já tenho conta — iniciar sessão e usar o meu saldo",
  schonKontoGrund: "Já carregaste antes? Inicia sessão — o teu saldo é usado automaticamente.",
  gesperrtTitel: "Já tens saldo neste endereço",
  gesperrtGrund: "Neste endereço já existe saldo. Inicia sessão e ele paga o teu vídeo — não precisas de pagar outra vez.",
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
  entsteht: "Il video sta arrivando …", nichtGeklappt: "Non ha funzionato — chiedi il rimborso",
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
  programm: "Programma",
  galerieAnmelden: "Accedi per vedere la tua galleria.",
  galerieMehrMitKonto: "Vedi solo ciò che ha creato questo dispositivo — accedi per vedere tutto sul tuo account.",
  aufgenommen: "Registrato",
  fertig: "Pronto",
  bezahlt: "Pagato",
  anmeldeTitel: "Accedi — così è davvero tuo",
  anmeldeGrund: "Il tuo credito e i tuoi video restano con te, su ogni dispositivo. Senza account vivono solo in questo browser.",
  anmeldeKnopf: "Accedi ora",
  anmeldeSpaeter: "Più tardi",
  sichernTitel: "Salva il tuo progetto",
  sichernGrund: "Vuoi conservare il tuo progetto su tutti i tuoi dispositivi? Un account gratuito salva il tuo video e il tuo credito.",
  sichernKnopf: "Crea un account gratuito",
  schonKonto: "Ho già un account — accedo e uso il mio credito",
  schonKontoGrund: "Hai già ricaricato? Accedi — il tuo credito viene usato automaticamente.",
  gesperrtTitel: "Hai già credito su questo indirizzo",
  gesperrtGrund: "Su questo indirizzo c'è già credito. Accedi e pagherà il tuo video — non devi pagare di nuovo.",
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
  en: { birthday: "Birthday video", kiss: "Kiss video", poledance: "Pole dance video", holiday: "Holiday invitation", wedding: "Wedding invitation", gutschein: "Gift card", plan: "Idea analysis", idol: "Idol video", versprechen: "Future Self Program" },
  de: { birthday: "Geburtstagsvideo", kiss: "Kuss-Video", poledance: "Poledance-Video", holiday: "Urlaubs-Einladung", wedding: "Hochzeits-Einladung", gutschein: "Gutschein", plan: "Ideen-Analyse", idol: "Idol-Video", versprechen: "Future Self Program" },
  ro: { birthday: "Video de ziua ta", kiss: "Video cu sărut", poledance: "Video pole dance", holiday: "Invitație de vacanță", wedding: "Invitație de nuntă", gutschein: "Card cadou", plan: "Analiza ideii", idol: "Video cu idolul tău", versprechen: "Future Self Program" },
  es: { birthday: "Vídeo de cumpleaños", kiss: "Vídeo de beso", poledance: "Vídeo de pole dance", holiday: "Invitación de vacaciones", wedding: "Invitación de boda", gutschein: "Tarjeta regalo", plan: "Análisis de idea", idol: "Vídeo con tu ídolo", versprechen: "Future Self Program" },
  fr: { birthday: "Vidéo d'anniversaire", kiss: "Vidéo de baiser", poledance: "Vidéo pole dance", holiday: "Invitation vacances", wedding: "Invitation de mariage", gutschein: "Carte cadeau", plan: "Analyse d'idée", idol: "Vidéo avec ton idole", versprechen: "Future Self Program" },
  pt: { birthday: "Vídeo de aniversário", kiss: "Vídeo de beijo", poledance: "Vídeo de pole dance", holiday: "Convite de férias", wedding: "Convite de casamento", gutschein: "Cartão presente", plan: "Análise da ideia", idol: "Vídeo com o teu ídolo", versprechen: "Future Self Program" },
  it: { birthday: "Video di compleanno", kiss: "Video del bacio", poledance: "Video pole dance", holiday: "Invito vacanza", wedding: "Invito di nozze", gutschein: "Buono regalo", plan: "Analisi dell'idea", idol: "Video con il tuo idolo", versprechen: "Future Self Program" },
};

/**
 * DAS THEMA OHNE „VIDEO"/„EINLADUNG" DARIN (11.08.2026, Owner am echten Befund: ein
 * Bild-Eintrag zeigte „Kiss video" — „ist das ein Kiss video? Das ist ein Bild").
 *
 * `THEMEN` oben backt das Medium in den Text ein ("Kiss video", "Wedding invitation") — richtig
 * für den Kontoauszug, wo jede Buchung tatsächlich ein Video oder eine Einladung ist. Die
 * Galerie zeigt aber auch reine BILDER (ein Zwischenstand, ein Modell-Foto, ein Testlauf ohne
 * fertiges Video) — und für die wäre "Kiss video" eine falsche Behauptung über das Medium.
 * Diese Tabelle nennt nur das THEMA; `themaUndMedium` setzt das Medium separat davor/danach.
 */
const THEMA_KURZ: Record<Lang, Record<string, string>> = {
  en: { birthday: "Birthday", kiss: "Kiss", poledance: "Pole dance", holiday: "Holiday", wedding: "Wedding", gutschein: "Gift card", idol: "Idol", versprechen: "Future Self Program" },
  de: { birthday: "Geburtstag", kiss: "Kuss", poledance: "Poledance", holiday: "Urlaub", wedding: "Hochzeit", gutschein: "Gutschein", idol: "Idol", versprechen: "Future Self Program" },
  ro: { birthday: "Ziua ta", kiss: "Sărut", poledance: "Pole dance", holiday: "Vacanță", wedding: "Nuntă", gutschein: "Card cadou", idol: "Idol", versprechen: "Future Self Program" },
  es: { birthday: "Cumpleaños", kiss: "Beso", poledance: "Pole dance", holiday: "Vacaciones", wedding: "Boda", gutschein: "Tarjeta regalo", idol: "Ídolo", versprechen: "Future Self Program" },
  fr: { birthday: "Anniversaire", kiss: "Baiser", poledance: "Pole dance", holiday: "Vacances", wedding: "Mariage", gutschein: "Carte cadeau", idol: "Idole", versprechen: "Future Self Program" },
  pt: { birthday: "Aniversário", kiss: "Beijo", poledance: "Pole dance", holiday: "Férias", wedding: "Casamento", gutschein: "Cartão presente", idol: "Ídolo", versprechen: "Future Self Program" },
  it: { birthday: "Compleanno", kiss: "Bacio", poledance: "Pole dance", holiday: "Vacanza", wedding: "Nozze", gutschein: "Buono regalo", idol: "Idolo", versprechen: "Future Self Program" },
};

/**
 * DAS WORT „BILD" ODER „VIDEO" — getrennt vom Thema, weil ein Kiss-Auftrag mal als Bild und
 * mal als Video vorliegt (je nachdem, ob die Kette schon fertig ist), und die Galerie das
 * Medium zeigen soll, das WIRKLICH da ist — nicht das, was das Thema normalerweise liefert.
 */
const MEDIUM_WORT: Record<Lang, { bild: string; video: string }> = {
  en: { bild: "Image", video: "Video" },
  de: { bild: "Bild", video: "Video" },
  ro: { bild: "Imagine", video: "Video" },
  es: { bild: "Imagen", video: "Vídeo" },
  fr: { bild: "Image", video: "Vidéo" },
  pt: { bild: "Imagem", video: "Vídeo" },
  it: { bild: "Immagine", video: "Video" },
};

/**
 * WAS EIN WERK IN DER GALERIE IST — nie geraten (Owner 11.08.2026, siehe `THEMA_KURZ`).
 *
 * `thema` leer/unbekannt → nur das Medium ("Image"/"Video"). `thema` bekannt → Thema + Medium
 * ("Kiss · Video"). So behauptet die Zeile nie ein Thema, das der Eintrag nicht trägt, sagt
 * aber IMMER ehrlich, ob ein Bild oder ein Video vor ihm liegt.
 */
/**
 * NUR DAS THEMA-WORT — für das Kachel-Schild in der Galerie (Owner 12.08.2026: „und
 * Geburtagsvideo hat kein Label"). Beim Umbau vom „Private"-Schild bekam allein die
 * Programm-Kachel ein Schild; jede andere Kachel stand nackt da. Leer bei unbekanntem
 * Thema — die Kachel zeigt dann lieber KEIN Schild als ein geratenes (dieselbe Regel
 * wie `themaUndMedium`).
 */
export function themaWort(lang: Lang, thema: string): string {
  return (THEMA_KURZ[lang] ?? THEMA_KURZ.en)[thema] ?? "";
}

export function themaUndMedium(lang: Lang, thema: string, hatVideo: boolean): string {
  const m = MEDIUM_WORT[lang] ?? MEDIUM_WORT.en;
  const medium = hatVideo ? m.video : m.bild;
  const kurz = (THEMA_KURZ[lang] ?? THEMA_KURZ.en)[thema];
  return kurz ? `${kurz} · ${medium}` : medium;
}

/** Die Buchungsart in Worten des Kunden — Thema schlägt Art (siehe API `/api/konto`). */
export function buchungWort(lang: Lang, art: string, thema: string): string {
  const t = TABELLE[lang] ?? en;
  const th = (THEMEN[lang] ?? THEMEN.en)[thema];
  if (th) return th;
  return (t as unknown as Record<string, string>)[art] ?? t.kauf;
}
