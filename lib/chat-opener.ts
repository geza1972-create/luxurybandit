// Der Gesprächsanfang in JEDEM Chat: SIE fragt zuerst, und die Antwort ist ein Knopf.
//
// Warum: Die meisten Besucher trauen sich nicht, als Erste zu schreiben — vor einem leeren
// Eingabefeld springen sie ab. Eine Frage mit vier Knöpfen kostet einen Tipp, und danach
// läuft das Gespräch von allein weiter (der Knopftext geht als normale Nachricht an sie).
//
// Wird von ModelChatInline (Profil) und ChatFunnel (Thema „Chat") benutzt — beide zeigen
// denselben Einstieg, damit der Chat überall gleich anfängt.

export const OPENER_LANGS = ["en", "de", "ro", "es", "fr", "pt", "pl", "it"] as const;
export type OpenerLang = (typeof OPENER_LANGS)[number];

export type ChatOpener = { text: string; chips: string[] };

export const CHAT_OPENER: Record<OpenerLang, ChatOpener> = {
  en: {
    text: "Hey 😊\n\nBefore we chat...\n\nI'm curious...\n\nWhat made you stop on my profile?",
    chips: ["❤️ Your smile", "👗 Your outfits", "💬 I wanted to meet you", "🤷 Just browsing"],
  },
  de: {
    text: "Hey 😊\n\nBevor wir schreiben...\n\nich bin neugierig...\n\nWarum bist du bei meinem Profil hängengeblieben?",
    chips: ["❤️ Dein Lächeln", "👗 Deine Outfits", "💬 Ich wollte dich kennenlernen", "🤷 Schau mich nur um"],
  },
  ro: {
    text: "Hey 😊\n\nÎnainte să vorbim...\n\nsunt curioasă...\n\nCe te-a făcut să te oprești la profilul meu?",
    chips: ["❤️ Zâmbetul tău", "👗 Ținutele tale", "💬 Voiam să te cunosc", "🤷 Doar mă uitam"],
  },
  es: {
    text: "Hey 😊\n\nAntes de hablar...\n\ntengo curiosidad...\n\n¿Qué te hizo parar en mi perfil?",
    chips: ["❤️ Tu sonrisa", "👗 Tus looks", "💬 Quería conocerte", "🤷 Solo miraba"],
  },
  fr: {
    text: "Hey 😊\n\nAvant qu'on discute...\n\nje suis curieuse...\n\nQu'est-ce qui t'a arrêté sur mon profil ?",
    chips: ["❤️ Ton sourire", "👗 Tes tenues", "💬 Je voulais te connaître", "🤷 Je regardais juste"],
  },
  pt: {
    text: "Hey 😊\n\nAntes de conversarmos...\n\nestou curiosa...\n\nO que te fez parar no meu perfil?",
    chips: ["❤️ O teu sorriso", "👗 Os teus looks", "💬 Queria conhecer-te", "🤷 Só a ver"],
  },
  pl: {
    text: "Hej 😊\n\nZanim zaczniemy...\n\njestem ciekawa...\n\nCo sprawiło, że zatrzymałeś się na moim profilu?",
    chips: ["❤️ Twój uśmiech", "👗 Twoje stylizacje", "💬 Chciałem cię poznać", "🤷 Tylko przeglądam"],
  },
  it: {
    text: "Hey 😊\n\nPrima di parlare...\n\nsono curiosa...\n\nCosa ti ha fatto fermare sul mio profilo?",
    chips: ["❤️ Il tuo sorriso", "👗 I tuoi outfit", "💬 Volevo conoscerti", "🤷 Stavo solo guardando"],
  },
};

export const openerFor = (lang?: string): ChatOpener =>
  CHAT_OPENER[(OPENER_LANGS as readonly string[]).includes(String(lang)) ? (lang as OpenerLang) : "en"];
