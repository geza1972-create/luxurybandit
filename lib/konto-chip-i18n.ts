import type { Lang, LangArchiv } from "@/lib/lang";

/**
 * DAS KONTO-ZEICHEN IN DER KOPFZEILE — die Worte dafür (Owner 11.08.2026: „Ich will dass du
 * mir ein Icon im Header machst zu sehen ob ich eingeloggt bin, mit grüner punkt. Dann wenn
 * ich dort klicke dann kann ich mich abmelden oden anmelden.").
 *
 * NORMALE ANMELDUNG, KEIN LINK PER POST (Owner 11.08.2026, am selben Tag nachgeschoben:
 * „diese Art von Anmeldung mag ich nicht. Ich will eine Normale Anmeldung haben."). Deshalb
 * sprechen diese Worte von E-Mail UND Passwort; der Magic-Link kommt hier nicht vor.
 *
 * EIN DIALOG, ZWEI ZUSTÄNDE: anmelden und Konto anlegen. Zwei Fenster für dieselbe Sache
 * wären zwei Wege, an denen man sich verläuft — die Worte für beide stehen deshalb in
 * derselben Tabelle und unterscheiden sich nur im Knopf.
 *
 * WARUM „E-Mail oder Passwort stimmt nicht" UND NICHT ZWEI GETRENNTE ABSAGEN: Supabase
 * antwortet auf eine unbekannte Adresse und auf ein falsches Passwort mit demselben Satz —
 * und zwar mit Absicht. Wer beides unterscheiden könnte, könnte hier durchprobieren, WELCHE
 * Adressen bei uns ein Konto haben. Statt eines Orakels bekommt der Kunde beide Auswege
 * direkt unter der Absage: Passwort vergessen und Konto anlegen. Was Supabase uns wirklich
 * verrät (Adresse noch nicht bestätigt, Konto gibt es schon), steht als eigener Satz da.
 *
 * KEINE HAUSADRESSE IM TEXT (Hausregel `keine-email-adresse-auf-der-seite`, Spam): Hilfe
 * führt auf `/contact`.
 *
 * SIEBEN SPRACHEN, KEIN POLNISCH (`lib/lang`), und überall geduzt (Memory `immer-duzen`).
 */
export type KontoChipText = {
  /** Vorlesetexte am Zeichen selbst — es zeigt nur ein Symbol. */
  zeichenAn: string;
  zeichenAus: string;
  /** Angemeldet. */
  titelAn: string;
  angemeldetAls: string;
  abmelden: string;
  abmeldenHinweis: string;
  /** Nicht angemeldet. */
  titelAnmelden: string;
  titelAnlegen: string;
  grundAnmelden: string;
  grundAnlegen: string;
  mailPlatzhalter: string;
  passwortPlatzhalter: string;
  anmeldenKnopf: string;
  anlegenKnopf: string;
  zumAnlegen: string;
  zumAnmelden: string;
  passwortVergessen: string;
  /** „Weiter mit Google" — ein Tipp statt Tippen; steht deshalb ÜBER den Feldern. */
  googleKnopf: string;
  /** Das Wort auf der Trennlinie zwischen beiden Wegen. */
  oder: string;
  schliessen: string;
  hilfe: string;
  /** Meldungen. */
  fehlerAdresse: string;
  fehlerPasswortKurz: string;
  fehlerZugang: string;
  fehlerNichtBestaetigt: string;
  fehlerSchonDa: string;
  fehlerAllgemein: string;
  keineVerbindung: string;
  bestaetigenTitel: string;
  bestaetigenText: string;
  resetGesendet: string;
  resetKeinVersand: string;
};

const en: KontoChipText = {
  zeichenAn: "Your account — signed in",
  zeichenAus: "Your account — not signed in",
  titelAn: "Your account",
  angemeldetAls: "Signed in as",
  abmelden: "Sign out",
  abmeldenHinweis: "Signing out clears this device — your gallery and your address stay with your account.",
  titelAnmelden: "Sign in",
  titelAnlegen: "Create your account",
  grundAnmelden: "Your credit and your videos stay with you, on every device.",
  grundAnlegen: "Pick a password — that's all it takes.",
  mailPlatzhalter: "Your email address",
  passwortPlatzhalter: "Your password",
  anmeldenKnopf: "Sign in",
  anlegenKnopf: "Create account",
  zumAnlegen: "No account yet? Create one",
  zumAnmelden: "Already have an account? Sign in",
  passwortVergessen: "Forgot your password?",
  googleKnopf: "Continue with Google",
  oder: "or",
  schliessen: "Close",
  hilfe: "Need help?",
  fehlerAdresse: "Please enter a valid email address.",
  fehlerPasswortKurz: "Your password needs at least 6 characters.",
  fehlerZugang: "Email or password is wrong. Check both — or create an account below.",
  fehlerNichtBestaetigt: "This address isn't confirmed yet. Check your inbox first.",
  fehlerSchonDa: "There is already an account for this address. Sign in instead.",
  fehlerAllgemein: "That didn't work. Please try again.",
  keineVerbindung: "No connection. Please try again.",
  bestaetigenTitel: "Check your inbox",
  bestaetigenText: "Confirm your address, then sign in here.",
  resetGesendet: "If this address has an account, a reset link is on its way.",
  resetKeinVersand: "We can't send mail right now. Please use the contact page.",
};

const de: KontoChipText = {
  zeichenAn: "Dein Konto — angemeldet",
  zeichenAus: "Dein Konto — nicht angemeldet",
  titelAn: "Dein Konto",
  angemeldetAls: "Angemeldet als",
  abmelden: "Abmelden",
  abmeldenHinweis: "Beim Abmelden wird dieses Gerät geleert — deine Galerie und deine Adresse bleiben bei deinem Konto.",
  titelAnmelden: "Anmelden",
  titelAnlegen: "Konto anlegen",
  grundAnmelden: "Dein Guthaben und deine Videos bleiben bei dir, auf jedem Gerät.",
  grundAnlegen: "Wähl dir ein Passwort — mehr braucht es nicht.",
  mailPlatzhalter: "Deine E-Mail-Adresse",
  passwortPlatzhalter: "Dein Passwort",
  anmeldenKnopf: "Anmelden",
  anlegenKnopf: "Konto anlegen",
  zumAnlegen: "Noch kein Konto? Leg eins an",
  zumAnmelden: "Schon ein Konto? Melde dich an",
  passwortVergessen: "Passwort vergessen?",
  googleKnopf: "Weiter mit Google",
  oder: "oder",
  schliessen: "Schliessen",
  hilfe: "Brauchst du Hilfe?",
  fehlerAdresse: "Bitte gib eine gültige E-Mail-Adresse ein.",
  fehlerPasswortKurz: "Dein Passwort braucht mindestens 6 Zeichen.",
  fehlerZugang: "E-Mail oder Passwort stimmt nicht. Prüfe beides — oder leg unten ein Konto an.",
  fehlerNichtBestaetigt: "Diese Adresse ist noch nicht bestätigt. Schau zuerst in dein Postfach.",
  fehlerSchonDa: "Für diese Adresse gibt es schon ein Konto. Melde dich damit an.",
  fehlerAllgemein: "Das hat nicht geklappt. Bitte versuch es noch einmal.",
  keineVerbindung: "Keine Verbindung. Bitte versuch es noch einmal.",
  bestaetigenTitel: "Schau in dein Postfach",
  bestaetigenText: "Bestätige deine Adresse, dann melde dich hier an.",
  resetGesendet: "Gibt es zu dieser Adresse ein Konto, kommt gleich ein Link zum Zurücksetzen.",
  resetKeinVersand: "Wir können gerade keine Post verschicken. Nimm bitte die Kontaktseite.",
};

const ro: KontoChipText = {
  zeichenAn: "Contul tău — conectat",
  zeichenAus: "Contul tău — neconectat",
  titelAn: "Contul tău",
  angemeldetAls: "Conectat ca",
  abmelden: "Deconectare",
  abmeldenHinweis: "La deconectare, dispozitivul se golește — galeria și adresa ta rămân la contul tău.",
  titelAnmelden: "Conectare",
  titelAnlegen: "Creează-ți contul",
  grundAnmelden: "Creditul și videoclipurile tale rămân ale tale, pe orice dispozitiv.",
  grundAnlegen: "Alege-ți o parolă — atât trebuie.",
  mailPlatzhalter: "Adresa ta de e-mail",
  passwortPlatzhalter: "Parola ta",
  anmeldenKnopf: "Conectare",
  anlegenKnopf: "Creează cont",
  zumAnlegen: "Încă nu ai cont? Creează unul",
  zumAnmelden: "Ai deja cont? Conectează-te",
  passwortVergessen: "Ți-ai uitat parola?",
  googleKnopf: "Continuă cu Google",
  oder: "sau",
  schliessen: "Închide",
  hilfe: "Ai nevoie de ajutor?",
  fehlerAdresse: "Te rugăm să introduci o adresă de e-mail validă.",
  fehlerPasswortKurz: "Parola ta are nevoie de cel puțin 6 caractere.",
  fehlerZugang: "E-mailul sau parola nu este corectă. Verifică-le pe amândouă — sau creează-ți un cont mai jos.",
  fehlerNichtBestaetigt: "Această adresă nu este încă confirmată. Verifică mai întâi căsuța ta de e-mail.",
  fehlerSchonDa: "Există deja un cont pentru această adresă. Conectează-te cu el.",
  fehlerAllgemein: "Nu a mers. Te rugăm să încerci din nou.",
  keineVerbindung: "Fără conexiune. Te rugăm să încerci din nou.",
  bestaetigenTitel: "Verifică-ți căsuța de e-mail",
  bestaetigenText: "Confirmă-ți adresa, apoi conectează-te aici.",
  resetGesendet: "Dacă există un cont pe această adresă, îți trimitem acum un link de resetare.",
  resetKeinVersand: "Momentan nu putem trimite e-mailuri. Folosește te rog pagina de contact.",
};

const es: KontoChipText = {
  zeichenAn: "Tu cuenta — sesión iniciada",
  zeichenAus: "Tu cuenta — sin sesión",
  titelAn: "Tu cuenta",
  angemeldetAls: "Sesión iniciada como",
  abmelden: "Cerrar sesión",
  abmeldenHinweis: "Al cerrar sesión se vacía este dispositivo — tu galería y tu dirección se quedan en tu cuenta.",
  titelAnmelden: "Iniciar sesión",
  titelAnlegen: "Crea tu cuenta",
  grundAnmelden: "Tu saldo y tus vídeos siguen siendo tuyos, en cualquier dispositivo.",
  grundAnlegen: "Elige una contraseña — no hace falta más.",
  mailPlatzhalter: "Tu dirección de correo",
  passwortPlatzhalter: "Tu contraseña",
  anmeldenKnopf: "Iniciar sesión",
  anlegenKnopf: "Crear cuenta",
  zumAnlegen: "¿Aún no tienes cuenta? Crea una",
  zumAnmelden: "¿Ya tienes cuenta? Inicia sesión",
  passwortVergessen: "¿Olvidaste tu contraseña?",
  googleKnopf: "Continuar con Google",
  oder: "o",
  schliessen: "Cerrar",
  hilfe: "¿Necesitas ayuda?",
  fehlerAdresse: "Introduce una dirección de correo válida.",
  fehlerPasswortKurz: "Tu contraseña necesita al menos 6 caracteres.",
  fehlerZugang: "El correo o la contraseña no es correcta. Revisa los dos — o crea una cuenta abajo.",
  fehlerNichtBestaetigt: "Esta dirección aún no está confirmada. Mira primero tu buzón.",
  fehlerSchonDa: "Ya existe una cuenta con esta dirección. Inicia sesión con ella.",
  fehlerAllgemein: "No ha funcionado. Inténtalo de nuevo.",
  keineVerbindung: "Sin conexión. Inténtalo de nuevo.",
  bestaetigenTitel: "Mira tu buzón",
  bestaetigenText: "Confirma tu dirección y luego inicia sesión aquí.",
  resetGesendet: "Si esta dirección tiene cuenta, te llegará un enlace para restablecerla.",
  resetKeinVersand: "Ahora mismo no podemos enviar correos. Usa la página de contacto.",
};

const fr: KontoChipText = {
  zeichenAn: "Ton compte — connecté",
  zeichenAus: "Ton compte — non connecté",
  titelAn: "Ton compte",
  angemeldetAls: "Connecté en tant que",
  abmelden: "Se déconnecter",
  abmeldenHinweis: "La déconnexion vide cet appareil — ta galerie et ton adresse restent sur ton compte.",
  titelAnmelden: "Se connecter",
  titelAnlegen: "Crée ton compte",
  grundAnmelden: "Ton crédit et tes vidéos restent à toi, sur tous tes appareils.",
  grundAnlegen: "Choisis un mot de passe — c'est tout.",
  mailPlatzhalter: "Ton adresse e-mail",
  passwortPlatzhalter: "Ton mot de passe",
  anmeldenKnopf: "Se connecter",
  anlegenKnopf: "Créer le compte",
  zumAnlegen: "Pas encore de compte ? Crée-en un",
  zumAnmelden: "Tu as déjà un compte ? Connecte-toi",
  passwortVergessen: "Mot de passe oublié ?",
  googleKnopf: "Continuer avec Google",
  oder: "ou",
  schliessen: "Fermer",
  hilfe: "Besoin d'aide ?",
  fehlerAdresse: "Entre une adresse e-mail valide.",
  fehlerPasswortKurz: "Ton mot de passe doit faire au moins 6 caractères.",
  fehlerZugang: "L'e-mail ou le mot de passe est faux. Vérifie les deux — ou crée un compte ci-dessous.",
  fehlerNichtBestaetigt: "Cette adresse n'est pas encore confirmée. Regarde d'abord ta boîte mail.",
  fehlerSchonDa: "Il existe déjà un compte pour cette adresse. Connecte-toi avec.",
  fehlerAllgemein: "Ça n'a pas marché. Réessaie.",
  keineVerbindung: "Pas de connexion. Réessaie.",
  bestaetigenTitel: "Regarde ta boîte mail",
  bestaetigenText: "Confirme ton adresse, puis connecte-toi ici.",
  resetGesendet: "Si cette adresse a un compte, un lien de réinitialisation arrive.",
  resetKeinVersand: "Nous ne pouvons pas envoyer d'e-mail pour le moment. Utilise la page de contact.",
};

const pt: KontoChipText = {
  zeichenAn: "A tua conta — com sessão iniciada",
  zeichenAus: "A tua conta — sem sessão",
  titelAn: "A tua conta",
  angemeldetAls: "Sessão iniciada como",
  abmelden: "Terminar sessão",
  abmeldenHinweis: "Ao terminar a sessão este aparelho é limpo — a tua galeria e o teu endereço ficam na tua conta.",
  titelAnmelden: "Iniciar sessão",
  titelAnlegen: "Cria a tua conta",
  grundAnmelden: "O teu saldo e os teus vídeos continuam a ser teus, em qualquer aparelho.",
  grundAnlegen: "Escolhe uma palavra-passe — é só isso.",
  mailPlatzhalter: "O teu e-mail",
  passwortPlatzhalter: "A tua palavra-passe",
  anmeldenKnopf: "Iniciar sessão",
  anlegenKnopf: "Criar conta",
  zumAnlegen: "Ainda não tens conta? Cria uma",
  zumAnmelden: "Já tens conta? Inicia sessão",
  passwortVergessen: "Esqueceste a palavra-passe?",
  googleKnopf: "Continuar com Google",
  oder: "ou",
  schliessen: "Fechar",
  hilfe: "Precisas de ajuda?",
  fehlerAdresse: "Escreve um e-mail válido.",
  fehlerPasswortKurz: "A tua palavra-passe precisa de pelo menos 6 caracteres.",
  fehlerZugang: "O e-mail ou a palavra-passe está errada. Verifica os dois — ou cria uma conta abaixo.",
  fehlerNichtBestaetigt: "Este endereço ainda não está confirmado. Vê primeiro a tua caixa de correio.",
  fehlerSchonDa: "Já existe uma conta com este endereço. Inicia sessão com ela.",
  fehlerAllgemein: "Não resultou. Tenta outra vez.",
  keineVerbindung: "Sem ligação. Tenta outra vez.",
  bestaetigenTitel: "Vê a tua caixa de correio",
  bestaetigenText: "Confirma o teu endereço e depois inicia sessão aqui.",
  resetGesendet: "Se este endereço tiver conta, segue já um link para redefinir.",
  resetKeinVersand: "De momento não conseguimos enviar e-mails. Usa a página de contacto.",
};

const it: KontoChipText = {
  zeichenAn: "Il tuo account — hai effettuato l'accesso",
  zeichenAus: "Il tuo account — non hai effettuato l'accesso",
  titelAn: "Il tuo account",
  angemeldetAls: "Accesso come",
  abmelden: "Esci",
  abmeldenHinweis: "Uscendo questo dispositivo viene svuotato — la tua galleria e il tuo indirizzo restano sul tuo account.",
  titelAnmelden: "Accedi",
  titelAnlegen: "Crea il tuo account",
  grundAnmelden: "Il tuo credito e i tuoi video restano tuoi, su ogni dispositivo.",
  grundAnlegen: "Scegli una password — non serve altro.",
  mailPlatzhalter: "Il tuo indirizzo e-mail",
  passwortPlatzhalter: "La tua password",
  anmeldenKnopf: "Accedi",
  anlegenKnopf: "Crea account",
  zumAnlegen: "Non hai ancora un account? Creane uno",
  zumAnmelden: "Hai già un account? Accedi",
  passwortVergessen: "Password dimenticata?",
  googleKnopf: "Continua con Google",
  oder: "oppure",
  schliessen: "Chiudi",
  hilfe: "Ti serve aiuto?",
  fehlerAdresse: "Inserisci un indirizzo e-mail valido.",
  fehlerPasswortKurz: "La tua password deve avere almeno 6 caratteri.",
  fehlerZugang: "E-mail o password non corretta. Controlla entrambe — oppure crea un account qui sotto.",
  fehlerNichtBestaetigt: "Questo indirizzo non è ancora confermato. Controlla prima la tua posta.",
  fehlerSchonDa: "Esiste già un account con questo indirizzo. Accedi con quello.",
  fehlerAllgemein: "Non ha funzionato. Riprova.",
  keineVerbindung: "Nessuna connessione. Riprova.",
  bestaetigenTitel: "Controlla la tua posta",
  bestaetigenText: "Conferma il tuo indirizzo, poi accedi qui.",
  resetGesendet: "Se questo indirizzo ha un account, sta arrivando un link per reimpostarla.",
  resetKeinVersand: "Al momento non possiamo inviare e-mail. Usa la pagina dei contatti.",
};

const TABELLE: Record<LangArchiv, KontoChipText> = { en, de, ro, es, fr, pt, it };

export function kontoChipText(lang: string): KontoChipText {
  return TABELLE[(lang || "en").slice(0, 2) as Lang] ?? en;
}
