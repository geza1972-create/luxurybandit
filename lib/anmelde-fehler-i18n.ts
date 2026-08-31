import type { Lang, LangArchiv } from "@/lib/lang";

/**
 * DER TOTE ANMELDE-LINK — die Worte dafür (Owner 11.08.2026, mit der Adresszeile
 * `#error=access_denied&error_code=otp_expired&…`: „sollte aber nicht kommen, Sitzung
 * abgelaufen? Neuen Link schicken?").
 *
 * WARUM ES DIESEN TEXT ÜBERHAUPT BRAUCHT: Supabase schickt den Fehlgeschlagenen nicht auf
 * eine Fehlerseite, sondern auf die STARTSEITE — den Grund hängt es nur als Fragment an die
 * Adresse. Wer also einen abgelaufenen Link antippt, sieht das Haus wie beim ersten Besuch
 * und weiss nicht, dass gerade etwas schiefging. Er hält sich für angemeldet, findet seine
 * Sachen nicht und geht.
 *
 * DER GRUND WIRD OHNE TECHNIK GENANNT: Ein solcher Link gilt eine Stunde und genau einmal —
 * und der häufigste Fall ist gar nicht die Zeit, sondern der Scanner des E-Mail-Anbieters,
 * der ihn zur Sicherheit vorab öffnet und damit verbraucht. Das ist keine Schuld des Kunden,
 * also steht es auch so da.
 *
 * KEINE HAUSADRESSE IM TEXT (Hausregel `keine-email-adresse-auf-der-seite`): Wer Hilfe
 * braucht, wird auf `/contact` geschickt, nie auf ein Postfach zum Abschreiben.
 *
 * SIEBEN SPRACHEN, KEIN POLNISCH (`lib/lang`), und überall geduzt.
 */
export type AnmeldeFehlerText = {
  /** Der bekannte Fall: der Link ist verbraucht oder zu alt. */
  titelAbgelaufen: string;
  /** Jeder andere Fehlercode — lieber allgemein als verschluckt. */
  titelAllgemein: string;
  grundAbgelaufen: string;
  grundAllgemein: string;
  platzhalter: string;
  senden: string;
  spaeter: string;
  erfolgTitel: string;
  erfolgText: string;
  fehlerAdresse: string;
  fehlerVersand: string;
  hilfe: string;
};

const en: AnmeldeFehlerText = {
  titelAbgelaufen: "Your sign-in link has expired",
  titelAllgemein: "Signing you in didn't work",
  grundAbgelaufen: "A sign-in link only works for one hour, and only once — and sometimes your email provider opens it before you do. Nothing is wrong with your account.",
  grundAllgemein: "We couldn't sign you in with that link. Get a fresh one and you're back in.",
  platzhalter: "Your email address",
  senden: "Send me a new link",
  spaeter: "Later",
  erfolgTitel: "Check your inbox",
  erfolgText: "A new sign-in link is on its way. It works for one hour — tap it on this device.",
  fehlerAdresse: "Please enter a valid email address.",
  fehlerVersand: "We couldn't send the link. Please try again.",
  hilfe: "Need help?",
};

const de: AnmeldeFehlerText = {
  titelAbgelaufen: "Dein Anmelde-Link ist abgelaufen",
  titelAllgemein: "Die Anmeldung hat nicht geklappt",
  grundAbgelaufen: "So ein Anmelde-Link gilt nur eine Stunde und nur ein einziges Mal — und manchmal öffnet ihn dein E-Mail-Anbieter schon vor dir. Mit deinem Konto ist alles in Ordnung.",
  grundAllgemein: "Mit diesem Link konnten wir dich nicht anmelden. Hol dir einen neuen, dann bist du drin.",
  platzhalter: "Deine E-Mail-Adresse",
  senden: "Neuen Link schicken",
  spaeter: "Später",
  erfolgTitel: "Schau in dein Postfach",
  erfolgText: "Ein neuer Anmelde-Link ist unterwegs. Er gilt eine Stunde — tippe ihn auf diesem Gerät an.",
  fehlerAdresse: "Bitte gib eine gültige E-Mail-Adresse ein.",
  fehlerVersand: "Der Link konnte nicht verschickt werden. Bitte versuch es noch einmal.",
  hilfe: "Brauchst du Hilfe?",
};

const ro: AnmeldeFehlerText = {
  titelAbgelaufen: "Linkul tău de conectare a expirat",
  titelAllgemein: "Conectarea nu a reușit",
  grundAbgelaufen: "Un link de conectare este valabil doar o oră și o singură dată — iar uneori furnizorul tău de e-mail îl deschide înaintea ta. Contul tău este în regulă.",
  grundAllgemein: "Nu te-am putut conecta cu acest link. Cere unul nou și intri imediat.",
  platzhalter: "Adresa ta de e-mail",
  senden: "Trimite-mi un link nou",
  spaeter: "Mai târziu",
  erfolgTitel: "Verifică-ți e-mailul",
  erfolgText: "Un link nou de conectare este pe drum. Este valabil o oră — deschide-l pe acest dispozitiv.",
  fehlerAdresse: "Te rugăm să introduci o adresă de e-mail validă.",
  fehlerVersand: "Nu am putut trimite linkul. Te rugăm să încerci din nou.",
  hilfe: "Ai nevoie de ajutor?",
};

const es: AnmeldeFehlerText = {
  titelAbgelaufen: "Tu enlace de acceso ha caducado",
  titelAllgemein: "No hemos podido iniciar tu sesión",
  grundAbgelaufen: "Un enlace de acceso solo vale una hora y una sola vez — y a veces tu proveedor de correo lo abre antes que tú. Tu cuenta está bien.",
  grundAllgemein: "No hemos podido iniciar tu sesión con ese enlace. Pide uno nuevo y entras enseguida.",
  platzhalter: "Tu dirección de correo",
  senden: "Envíame un enlace nuevo",
  spaeter: "Más tarde",
  erfolgTitel: "Mira tu bandeja de entrada",
  erfolgText: "Ya va un enlace de acceso nuevo. Vale una hora — ábrelo en este dispositivo.",
  fehlerAdresse: "Introduce una dirección de correo válida.",
  fehlerVersand: "No hemos podido enviar el enlace. Inténtalo de nuevo.",
  hilfe: "¿Necesitas ayuda?",
};

const fr: AnmeldeFehlerText = {
  titelAbgelaufen: "Ton lien de connexion a expiré",
  titelAllgemein: "La connexion n'a pas fonctionné",
  grundAbgelaufen: "Un lien de connexion n'est valable qu'une heure et une seule fois — et parfois ta messagerie l'ouvre avant toi. Ton compte, lui, va très bien.",
  grundAllgemein: "Nous n'avons pas pu te connecter avec ce lien. Demandes-en un nouveau et tu es dedans.",
  platzhalter: "Ton adresse e-mail",
  senden: "Envoie-moi un nouveau lien",
  spaeter: "Plus tard",
  erfolgTitel: "Regarde ta boîte mail",
  erfolgText: "Un nouveau lien de connexion arrive. Il vaut une heure — ouvre-le sur cet appareil.",
  fehlerAdresse: "Saisis une adresse e-mail valide.",
  fehlerVersand: "Nous n'avons pas pu envoyer le lien. Réessaie.",
  hilfe: "Besoin d'aide ?",
};

const pt: AnmeldeFehlerText = {
  titelAbgelaufen: "O teu link de acesso expirou",
  titelAllgemein: "Não conseguimos iniciar a tua sessão",
  grundAbgelaufen: "Um link de acesso só vale uma hora e uma única vez — e às vezes o teu fornecedor de e-mail abre-o antes de ti. A tua conta está bem.",
  grundAllgemein: "Não conseguimos iniciar a tua sessão com esse link. Pede um novo e entras logo.",
  platzhalter: "O teu endereço de e-mail",
  senden: "Envia-me um link novo",
  spaeter: "Mais tarde",
  erfolgTitel: "Vê a tua caixa de entrada",
  erfolgText: "Um novo link de acesso está a caminho. Vale uma hora — abre-o neste dispositivo.",
  fehlerAdresse: "Introduz um endereço de e-mail válido.",
  fehlerVersand: "Não conseguimos enviar o link. Tenta de novo.",
  hilfe: "Precisas de ajuda?",
};

const it: AnmeldeFehlerText = {
  titelAbgelaufen: "Il tuo link di accesso è scaduto",
  titelAllgemein: "L'accesso non è riuscito",
  grundAbgelaufen: "Un link di accesso vale solo un'ora e una volta sola — e a volte il tuo provider di posta lo apre prima di te. Il tuo account è a posto.",
  grundAllgemein: "Con questo link non siamo riusciti a farti accedere. Chiedine uno nuovo e sei dentro.",
  platzhalter: "Il tuo indirizzo e-mail",
  senden: "Mandami un nuovo link",
  spaeter: "Più tardi",
  erfolgTitel: "Controlla la posta",
  erfolgText: "Un nuovo link di accesso è in arrivo. Vale un'ora — aprilo su questo dispositivo.",
  fehlerAdresse: "Inserisci un indirizzo e-mail valido.",
  fehlerVersand: "Non siamo riusciti a inviare il link. Riprova.",
  hilfe: "Ti serve aiuto?",
};

const TABELLE: Record<LangArchiv, AnmeldeFehlerText> = { en, de, ro, es, fr, pt, it };

/** Der Text zur Sprache — Unbekanntes ist Englisch (Hausregel `lib/lang`). */
export function anmeldeFehlerText(lang: string | undefined): AnmeldeFehlerText {
  return TABELLE[(lang ?? "").slice(0, 2) as Lang] ?? en;
}
