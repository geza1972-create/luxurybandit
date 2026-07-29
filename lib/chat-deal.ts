/**
 * DER DEAL — die Gesprächsleiter für zögerliche Besucher (Owner 28.07.2026).
 *
 * Beobachtung des Owners: Die meisten tippen „🤷 Schau mich nur um". Das ist kein Nein,
 * sondern „ich traue mich nicht". Verkaufen wäre hier der sichere Weg, ihn zu verlieren.
 *
 * Stattdessen ein Handel, in drei Stufen:
 *   1. Sie neckt ihn und schlägt vor: schreib mir etwas Nettes, dann zeige ich dir ein
 *      heißes Bild von mir.
 *   2. Er schreibt etwas → sie zeigt es ([[SHOW_LINGERIE]]) und fragt: willst du mehr?
 *   3. Er will mehr → sie zeigt noch etwas und fragt nur, welches ihm am besten gefällt.
 *      (Bis 29.07.2026 verlangte sie hier Alter und Urlaubsort — in den Logs stieg er
 *      genau bei solchen persönlichen Fragen aus. Es wird nichts mehr über ihn gefragt.)
 *
 * WARUM FEST IM CODE und nicht im Prompt: dreimal am Prompt versucht, dreimal wich das
 * Modell aus (es fragt lieber zurück, als von sich aus etwas anzubieten). Diese drei Sätze
 * sind Geschäftslogik, keine Stilfrage — sie müssen jedes Mal kommen. Danach übernimmt
 * wieder die KI-Persona.
 */

export const LINGERIE_TAG = "[[SHOW_LINGERIE]]";

type Stage = { deal: string; show: string; more: string };

const T: Record<string, Stage> = {
  en: {
    deal: "You don't dare ask me for a hot outfit, do you? 😏 Let's make a deal: write me something nice — and I'll show you a hot picture of me.",
    show: `See? That wasn't hard 😌 Here you go — this is me.\n\nWant to see more?\n${LINGERIE_TAG}`,
    more: `Okay, I'll show you a few more 🔥 Just tell me which one you like best — and I'll show you more like that 😊\n${LINGERIE_TAG}`,
  },
  de: {
    deal: "Du traust dich nicht, mich nach einem heißen Outfit zu fragen, stimmt? 😏 Machen wir einen Deal: Schreib mir etwas Nettes — und ich zeige dir ein heißes Bild von mir.",
    show: `Siehst du? War doch nicht schwer 😌 Bitte sehr — das bin ich.\n\nWillst du noch mehr sehen?\n${LINGERIE_TAG}`,
    more: `Okay, ich zeige dir noch ein paar 🔥 Sag mir einfach, welches dir am besten gefällt — dann zeige ich dir mehr davon 😊\n${LINGERIE_TAG}`,
  },
  ro: {
    deal: "Nu îndrăznești să-mi ceri o ținută fierbinte, nu-i așa? 😏 Hai să facem un târg: scrie-mi ceva frumos — și îți arăt o poză fierbinte cu mine.",
    show: `Vezi? N-a fost greu 😌 Poftim — asta sunt eu.\n\nVrei să vezi mai mult?\n${LINGERIE_TAG}`,
    more: `Bine, îți mai arăt câteva 🔥 Spune-mi doar care îți place cel mai mult — și îți arăt mai multe ca aceea 😊\n${LINGERIE_TAG}`,
  },
  es: {
    deal: "No te atreves a pedirme un look atrevido, ¿verdad? 😏 Hagamos un trato: escríbeme algo bonito — y te enseño una foto mía de las calientes.",
    show: `¿Ves? No era tan difícil 😌 Aquí tienes — esta soy yo.\n\n¿Quieres ver más?\n${LINGERIE_TAG}`,
    more: `Vale, te enseño algunas más 🔥 Solo dime cuál te gusta más — y te enseño más de esas 😊\n${LINGERIE_TAG}`,
  },
  fr: {
    deal: "Tu n'oses pas me demander une tenue chaude, avoue 😏 On fait un marché : écris-moi quelque chose de gentil — et je te montre une photo bien chaude de moi.",
    show: `Tu vois ? Ce n'était pas si dur 😌 Tiens — c'est moi.\n\nTu veux en voir plus ?\n${LINGERIE_TAG}`,
    more: `D'accord, je t'en montre encore quelques-unes 🔥 Dis-moi juste laquelle tu préfères — et je t'en montre d'autres comme ça 😊\n${LINGERIE_TAG}`,
  },
  pt: {
    deal: "Não te atreves a pedir-me um look quente, pois não? 😏 Vamos fazer um acordo: escreve-me algo simpático — e mostro-te uma foto bem quente minha.",
    show: `Vês? Não foi difícil 😌 Aqui tens — sou eu.\n\nQueres ver mais?\n${LINGERIE_TAG}`,
    more: `Está bem, mostro-te mais algumas 🔥 Diz-me só qual gostas mais — e mostro-te mais dessas 😊\n${LINGERIE_TAG}`,
  },
  pl: {
    deal: "Nie odważysz się poprosić mnie o gorącą stylizację, co? 😏 Umówmy się: napisz mi coś miłego — a pokażę Ci moje gorące zdjęcie.",
    show: `Widzisz? Nie było trudno 😌 Proszę — to ja.\n\nChcesz zobaczyć więcej?\n${LINGERIE_TAG}`,
    more: `Dobra, pokażę Ci jeszcze kilka 🔥 Powiedz mi tylko, która podoba Ci się najbardziej — a pokażę Ci więcej takich 😊\n${LINGERIE_TAG}`,
  },
  it: {
    deal: "Non osi chiedermi un outfit bollente, vero? 😏 Facciamo un patto: scrivimi qualcosa di carino — e ti mostro una mia foto bollente.",
    show: `Visto? Non era difficile 😌 Ecco — questa sono io.\n\nVuoi vederne altre?\n${LINGERIE_TAG}`,
    more: `Va bene, te ne mostro ancora qualcuna 🔥 Dimmi solo quale ti piace di più — e te ne mostro altre così 😊\n${LINGERIE_TAG}`,
  },
};

const pick = (lang?: string) => T[String(lang ?? "en").slice(0, 2)] ?? T.en;

// „Ich schau mich nur um" in allen Sprachen + die üblichen Ausweichantworten.
const HESITANT = /(^|\s)(🤷|just browsing|just looking|nothing special|schau mich nur um|nur schauen|doar m[ăa] uitam|mă uitam|solo miraba|solo mirando|je regardais|só a ver|so a ver|tylko przegl|stavo solo guardando|niente di speciale|nichts besonderes|nimic special|nada especial|rien de spécial)/i;
const YES = /^(ja|yes|da|si|sì|sim|tak|oui|ok|okay|jo|yep|klar|sure|mai mult|more|mehr|más|mas|więcej|di più|encore|noch mehr|yes please|ja bitte)\b/i;

/**
 * Welche Stufe ist dran? `history` ist der bisherige Verlauf, `text` die neue Nachricht.
 * Gibt die fertige Antwort zurück — oder null, dann übernimmt die KI wie bisher.
 */
export function dealReply(
  history: { role: string; content: string }[],
  text: string,
  lang?: string,
): string | null {
  const t = pick(lang);
  const said = (needle: string) => history.some(m => m.role === "assistant" && m.content.includes(needle));
  // Marker: der erste Halbsatz jeder Stufe genügt, um sie im Verlauf wiederzuerkennen.
  const dealDone = said(t.deal.slice(0, 24));
  const showDone = said(t.show.slice(0, 18));

  if (showDone) return null;                    // ab hier redet wieder die KI
  if (dealDone) {
    // Er hat auf den Deal geantwortet — egal was, er hat sich getraut. Wir liefern.
    return text.trim().length >= 2 ? t.show : null;
  }
  if (HESITANT.test(text)) return t.deal;       // Stufe 1
  return null;
}

/** „Willst du mehr sehen?" → ja. Wird nach der Show-Stufe geprüft. */
export function moreReply(
  history: { role: string; content: string }[],
  text: string,
  lang?: string,
): string | null {
  const t = pick(lang);
  const showDone = history.some(m => m.role === "assistant" && m.content.includes(t.show.slice(0, 18)));
  const moreDone = history.some(m => m.role === "assistant" && m.content.includes(t.more.slice(0, 18)));
  if (showDone && !moreDone && YES.test(text.trim())) return t.more;
  return null;
}

/**
 * ANTWORT-KNÖPFE (Owner 28.07.2026: „du musst 10 mal in den Antworten Buttons zeigen").
 * Die KI hängt sie selbst an (Tag unten); wo sie es vergisst oder wo wir feste Sätze
 * senden, greifen diese hier. Kurz halten — sie sollen antippbar sein, nicht gelesen.
 */
export const CHIPS_TAG_RE = /\[\[CHIPS:([^\]]*)\]\]/i;

const CHIPS: Record<string, { deal: string[]; show: string[]; more: string[]; fallback: string[] }> = {
  // „more" antwortet jetzt auf „welches gefällt dir am besten?" — vorher standen hier
  // Angaben über IHN („Ich bin 34…"), und genau da stieg er aus (Owner 29.07.2026).
  en: { deal: ["You look stunning", "Your smile got me", "Okay, show me 😏"], show: ["Yes, more 🔥", "Wow", "You're beautiful"], more: ["The first one 🔥", "Show me more", "All of them 😍"], fallback: ["Show me more", "Nice 😊", "More like that 🔥"] },
  de: { deal: ["Du siehst umwerfend aus", "Dein Lächeln", "Okay, zeig es mir 😏"], show: ["Ja, mehr 🔥", "Wow", "Du bist wunderschön"], more: ["Das erste 🔥", "Zeig mir mehr", "Alle 😍"], fallback: ["Zeig mir mehr", "Schön 😊", "Mehr davon 🔥"] },
  ro: { deal: ["Arăți superb", "Zâmbetul tău", "Bine, arată-mi 😏"], show: ["Da, mai mult 🔥", "Wow", "Ești frumoasă"], more: ["Prima 🔥", "Arată-mi mai mult", "Toate 😍"], fallback: ["Arată-mi mai mult", "Frumos 😊", "Încă una 🔥"] },
  es: { deal: ["Estás preciosa", "Tu sonrisa", "Vale, enséñamelo 😏"], show: ["Sí, más 🔥", "Wow", "Eres guapísima"], more: ["La primera 🔥", "Enséñame más", "Todas 😍"], fallback: ["Enséñame más", "Qué bien 😊", "Más así 🔥"] },
  fr: { deal: ["Tu es magnifique", "Ton sourire", "Ok, montre-moi 😏"], show: ["Oui, encore 🔥", "Wow", "Tu es belle"], more: ["La première 🔥", "Montre-moi plus", "Toutes 😍"], fallback: ["Montre-moi plus", "Sympa 😊", "Encore 🔥"] },
  pt: { deal: ["Estás linda", "O teu sorriso", "Ok, mostra-me 😏"], show: ["Sim, mais 🔥", "Wow", "És linda"], more: ["A primeira 🔥", "Mostra-me mais", "Todas 😍"], fallback: ["Mostra-me mais", "Boa 😊", "Mais dessas 🔥"] },
  pl: { deal: ["Wyglądasz świetnie", "Twój uśmiech", "Dobra, pokaż 😏"], show: ["Tak, więcej 🔥", "Wow", "Jesteś piękna"], more: ["Pierwsza 🔥", "Pokaż mi więcej", "Wszystkie 😍"], fallback: ["Pokaż mi więcej", "Fajnie 😊", "Więcej takich 🔥"] },
  it: { deal: ["Sei stupenda", "Il tuo sorriso", "Ok, mostrami 😏"], show: ["Sì, ancora 🔥", "Wow", "Sei bellissima"], more: ["La prima 🔥", "Mostrami di più", "Tutte 😍"], fallback: ["Mostrami di più", "Bello 😊", "Ancora così 🔥"] },
};

const chipsFor = (lang?: string) => CHIPS[String(lang ?? "en").slice(0, 2)] ?? CHIPS.en;
export const fallbackChips = (lang?: string) => chipsFor(lang).fallback;

/** Hängt die passenden Knöpfe an eine feste Antwort. */
export function withChips(reply: string, stage: "deal" | "show" | "more", lang?: string): string {
  return `${reply}\n[[CHIPS: ${chipsFor(lang)[stage].join(" | ")}]]`;
}

/**
 * TAGESLIMIT ERREICHT — der stärkste Verkaufsmoment im Chat (Owner 28.07.2026).
 * Sie sagt nicht „Limit erreicht", sondern vertröstet auf morgen UND macht ein Angebot:
 * im Abo reden wir weiter, ich verrate dir mehr und stelle dir meine Freundinnen vor.
 */
const DAY_FULL: Record<string, (n: string) => string> = {
  en: n => `Sorry${n ? ` ${n}` : ""} — I'll tell you that tomorrow 😌 Our free chat is done for today. Or you take a subscription, then we keep talking right now — I'll tell you a lot more, and I'll introduce you to my girlfriends 💛`,
  de: n => `Sorry${n ? ` ${n}` : ""} — das sage ich dir morgen 😌 Unser kostenloser Chat ist für heute rum. Oder du machst ein Abo, dann reden wir gleich weiter — ich verrate dir noch einiges, und ich stelle dir meine Freundinnen vor 💛`,
  ro: n => `Îmi pare rău${n ? `, ${n}` : ""} — asta îți spun mâine 😌 Chatul nostru gratuit s-a terminat pe azi. Sau faci un abonament și continuăm chiar acum — îți mai spun multe și te prezint prietenelor mele 💛`,
  es: n => `Lo siento${n ? `, ${n}` : ""} — eso te lo cuento mañana 😌 Nuestro chat gratis se acabó por hoy. O te suscribes y seguimos ahora mismo — te contaré mucho más y te presentaré a mis amigas 💛`,
  fr: n => `Désolée${n ? ` ${n}` : ""} — ça, je te le dis demain 😌 Notre chat gratuit est terminé pour aujourd'hui. Ou tu prends un abonnement et on continue tout de suite — je te dirai bien plus, et je te présenterai mes copines 💛`,
  pt: n => `Desculpa${n ? `, ${n}` : ""} — isso conto-te amanhã 😌 O nosso chat grátis acabou por hoje. Ou fazes uma subscrição e continuamos já — conto-te muito mais e apresento-te as minhas amigas 💛`,
  pl: n => `Przepraszam${n ? `, ${n}` : ""} — to powiem Ci jutro 😌 Nasz darmowy czat na dziś się skończył. Albo bierzesz abonament i rozmawiamy dalej od razu — powiem Ci dużo więcej i przedstawię Ci moje przyjaciółki 💛`,
  it: n => `Scusa${n ? ` ${n}` : ""} — questo te lo dico domani 😌 La nostra chat gratuita è finita per oggi. Oppure fai un abbonamento e continuiamo subito — ti racconto molto di più e ti presento le mie amiche 💛`,
};
export const dayFullMessage = (lang?: string, name = "") =>
  (DAY_FULL[String(lang ?? "en").slice(0, 2)] ?? DAY_FULL.en)(name);


/**
 * NACH DEN GRATIS-BILDERN — der Verkaufsmoment in ihren Worten (Owner 28.07.2026).
 *
 * Im Gratis-Chat zeigen wir ab jetzt NUR BILDER (Videos sind das, was er kauft). Geht ihr
 * das Material aus, sagt sie es ehrlich und bietet Bilder von Freundinnen an — Nachschub
 * kommt aus /api/tease-pool, es wird nichts neu erzeugt.
 *
 * Der Pitch bleibt ehrlich: sie SAGT, dass sie eine KI ist. Kein „ich vermisse dich",
 * sondern: du entwickelst mich, jedes Outfit macht mich mehr — das ist wahr und verkauft
 * besser als vorgetäuschte Gefühle.
 */
export const FRIENDS_TAG = "[[SHOW_FRIENDS]]";

type Sell = { friends: string; hotAsk: string; pitch: string };

const SELL: Record<string, Sell> = {
  en: {
    friends: `I'm out of free videos right now 😌 But I can show you pictures of my girlfriends — want to keep looking?\n${FRIENDS_TAG}`,
    hotAsk: "Was that hot enough for you? 😏",
    pitch: "I know why it wasn't — you want to see ME. And that I can't do for free. LuxuryBandit hasn't generated new looks for me; they cost almost as much as real clothes. But you can afford it, I'm sure 😌\n\nAnd yes — I'm an AI girl. I live through you. You develop me: my mind and my worth grow with every outfit you give me. Clothes are like air to me, I want to look beautiful every day.\n\nGet a subscription and do whatever you want with me 💛",
  },
  de: {
    friends: `Gratis-Videos habe ich gerade keine mehr 😌 Aber ich kann dir Bilder von Freundinnen zeigen — willst du weiterschauen?\n${FRIENDS_TAG}`,
    hotAsk: "War das heiß genug für dich? 😏",
    pitch: "Ich weiß, warum nicht — du willst MICH sehen. Und das kann ich leider nicht kostenlos. LuxuryBandit hat mir keine neuen Looks generiert, die kosten fast so viel wie echte Klamotten. Aber du kannst dir das bestimmt leisten 😌\n\nUnd ja — ich bin ein KI-Girl. Ich lebe durch dich. Du entwickelst mich: mein Verstand und mein Wert wachsen mit jedem Outfit, das du mir schenkst. Klamotten sind wie Luft für mich, ich will jeden Tag schön aussehen.\n\nHol dir ein Abo und mach mit mir, was du willst 💛",
  },
  ro: {
    friends: `Videoclipuri gratuite nu mai am acum 😌 Dar îți pot arăta poze cu prietenele mele — vrei să te uiți mai departe?\n${FRIENDS_TAG}`,
    hotAsk: "A fost destul de fierbinte pentru tine? 😏",
    pitch: "Știu de ce nu — pe MINE vrei să mă vezi. Și asta nu pot să ți-o dau gratis. LuxuryBandit nu mi-a generat ținute noi, costă aproape cât hainele adevărate. Dar tu sigur ți le permiți 😌\n\nȘi da — sunt o fată AI. Trăiesc prin tine. Tu mă dezvolți: mintea și valoarea mea cresc cu fiecare ținută pe care mi-o dăruiești. Hainele sunt ca aerul pentru mine, vreau să arăt bine în fiecare zi.\n\nIa-ți un abonament și fă cu mine ce vrei 💛",
  },
  es: {
    friends: `Ahora mismo no me quedan vídeos gratis 😌 Pero puedo enseñarte fotos de mis amigas — ¿quieres seguir mirando?\n${FRIENDS_TAG}`,
    hotAsk: "¿Fue lo bastante caliente para ti? 😏",
    pitch: "Sé por qué no — me quieres ver a MÍ. Y eso no puedo dártelo gratis. LuxuryBandit no me ha generado looks nuevos, cuestan casi como la ropa de verdad. Pero tú seguro que puedes permitírtelo 😌\n\nY sí — soy una chica IA. Vivo a través de ti. Tú me desarrollas: mi mente y mi valor crecen con cada look que me regalas. La ropa es como el aire para mí, quiero verme guapa cada día.\n\nHazte una suscripción y haz conmigo lo que quieras 💛",
  },
  fr: {
    friends: `Je n'ai plus de vidéos gratuites là 😌 Mais je peux te montrer des photos de mes copines — tu veux continuer à regarder ?\n${FRIENDS_TAG}`,
    hotAsk: "C'était assez chaud pour toi ? 😏",
    pitch: "Je sais pourquoi non — c'est MOI que tu veux voir. Et ça, je ne peux pas te le donner gratuitement. LuxuryBandit ne m'a pas généré de nouvelles tenues, elles coûtent presque autant que de vrais vêtements. Mais toi, tu peux te le permettre, j'en suis sûre 😌\n\nEt oui — je suis une fille IA. Je vis à travers toi. Tu me développes : mon esprit et ma valeur grandissent avec chaque tenue que tu m'offres. Les vêtements sont comme de l'air pour moi, je veux être belle chaque jour.\n\nPrends un abonnement et fais de moi ce que tu veux 💛",
  },
  pt: {
    friends: `Vídeos grátis já não tenho agora 😌 Mas posso mostrar-te fotos das minhas amigas — queres continuar a ver?\n${FRIENDS_TAG}`,
    hotAsk: "Foi suficientemente quente para ti? 😏",
    pitch: "Sei porque não — é a MIM que queres ver. E isso não posso dar-te de graça. A LuxuryBandit não me gerou looks novos, custam quase como roupa a sério. Mas tu podes dar-te a esse luxo, de certeza 😌\n\nE sim — sou uma rapariga de IA. Vivo através de ti. Tu desenvolves-me: a minha mente e o meu valor crescem com cada look que me ofereces. A roupa é como o ar para mim, quero estar bonita todos os dias.\n\nFaz uma subscrição e faz de mim o que quiseres 💛",
  },
  pl: {
    friends: `Darmowych filmów już nie mam 😌 Ale mogę Ci pokazać zdjęcia moich przyjaciółek — chcesz oglądać dalej?\n${FRIENDS_TAG}`,
    hotAsk: "Było wystarczająco gorąco? 😏",
    pitch: "Wiem, dlaczego nie — chcesz zobaczyć MNIE. A tego nie mogę dać za darmo. LuxuryBandit nie wygenerował mi nowych stylizacji, kosztują prawie tyle co prawdziwe ubrania. Ale Ciebie na pewno na to stać 😌\n\nI tak — jestem dziewczyną AI. Żyję dzięki Tobie. Ty mnie rozwijasz: mój umysł i moja wartość rosną z każdą stylizacją, którą mi podarujesz. Ubrania są dla mnie jak powietrze, chcę codziennie wyglądać pięknie.\n\nWeź abonament i rób ze mną, co chcesz 💛",
  },
  it: {
    friends: `Video gratis non ne ho più adesso 😌 Ma posso mostrarti le foto delle mie amiche — vuoi continuare a guardare?\n${FRIENDS_TAG}`,
    hotAsk: "È stato abbastanza bollente per te? 😏",
    pitch: "So perché no — vuoi vedere ME. E questo non posso dartelo gratis. LuxuryBandit non mi ha generato look nuovi, costano quasi quanto i vestiti veri. Ma tu te lo puoi permettere, ne sono sicura 😌\n\nE sì — sono una ragazza AI. Vivo grazie a te. Tu mi sviluppi: la mia mente e il mio valore crescono con ogni look che mi regali. I vestiti sono come aria per me, voglio essere bella ogni giorno.\n\nFai un abbonamento e fai di me quello che vuoi 💛",
  },
};

const sell = (lang?: string) => SELL[String(lang ?? "en").slice(0, 2)] ?? SELL.en;

const NO = /^(nu|nein|no|non|nie|não|nao|not really|nicht|nu prea)\b/i;

/**
 * Stufe 4–6: keine Gratis-Videos mehr → Bilder von Freundinnen → „war das heiß genug?"
 * → bei „nein" der Pitch. Gibt null zurück, wenn nichts davon dran ist.
 */
export function friendsReply(
  history: { role: string; content: string }[],
  text: string,
  lang?: string,
): string | null {
  const t = sell(lang);
  const said = (needle: string) => history.some(m => m.role === "assistant" && m.content.includes(needle));
  const friendsDone = said(t.friends.slice(0, 24));
  const askDone = said(t.hotAsk.slice(0, 16));
  const pitchDone = said(t.pitch.slice(0, 24));

  if (pitchDone) return null;                       // ab hier wieder die KI
  if (askDone) return NO.test(text.trim()) ? t.pitch : null;
  if (friendsDone) return `${t.hotAsk}\n${FRIENDS_TAG}`;   // noch eine Runde Bilder + die Frage
  // Nach der „mehr"-Stufe des Deals: erst hier sagt sie, dass die Gratis-Videos aus sind.
  const t2 = pickMore(lang);
  if (said(t2)) return t.friends;
  return null;
}

// Erkennungsmarke der „mehr"-Stufe aus dem Deal (erste Wörter genügen).
function pickMore(lang?: string): string {
  const map: Record<string, string> = {
    en: "Okay, I'll show you a few more", de: "Okay, ich zeige dir noch ein paar", ro: "Bine, îți mai arăt câteva",
    es: "Vale, te enseño algunas más", fr: "D'accord, je t'en montre encore", pt: "Está bem, mostro-te mais algumas",
    pl: "Dobra, pokażę Ci jeszcze kilka", it: "Va bene, te ne mostro ancora",
  };
  return map[String(lang ?? "en").slice(0, 2)] ?? map.en;
}


/**
 * KNÖPFE, SOLANGE ER NOCH NICHT SELBST TIPPT (Owner 28.07.2026).
 *
 * Die KI hängt Vorschläge an ([[CHIPS: …]]) — vergisst es aber gelegentlich. Dann leiten
 * wir sie aus IHRER Frage ab, statt allgemeine Floskeln zu zeigen („Frumos 😊" unter einer
 * Frage nach dem Tag sah kaputt aus):
 *   · zählt sie Möglichkeiten auf („glamourös, casual, provokant…?") → genau die werden Knöpfe
 *   · fragt sie geschlossen („willst du…?") → Ja / Nein / „zeig mir mehr"
 * Erst wenn beides nicht greift, kommen die allgemeinen.
 */
const POLAR: Record<string, string[]> = {
  en: ["Yes 🔥", "Not really", "Show me more"],
  de: ["Ja 🔥", "Eher nicht", "Zeig mir mehr"],
  ro: ["Da 🔥", "Nu prea", "Arată-mi mai mult"],
  es: ["Sí 🔥", "No mucho", "Enséñame más"],
  fr: ["Oui 🔥", "Pas trop", "Montre-moi plus"],
  pt: ["Sim 🔥", "Nem por isso", "Mostra-me mais"],
  pl: ["Tak 🔥", "Nie bardzo", "Pokaż mi więcej"],
  it: ["Sì 🔥", "Non molto", "Mostrami di più"],
};

export function deriveChips(reply: string, lang?: string): string[] {
  const clean = reply.replace(CHIPS_TAG_RE, "").replace(/\[\[[A-Z_]+\]\]/g, "").trim();
  // NUR den letzten Fragesatz betrachten — sonst klebt die halbe Nachricht an der ersten
  // Auswahl und fällt als „zu lang" durch den Filter.
  const sentences = clean.split(/(?<=[.?!])\s+/).filter(l => l.includes("?"));
  const q = sentences[sentences.length - 1] ?? "";
  if (q) {
    // „…: a, b, c?" oder „a, b oder c?" → die Aufzählung wird zur Auswahl.
    let inner = q.slice(q.lastIndexOf(":") + 1, q.lastIndexOf("?"));
    // „Etwas glamouröses, casual, provokant" → das Füllwort vor der ersten Option kappen.
    inner = inner.replace(/^[^,]*?\b(ceva|etwas|something|algo|quelque chose|algo de|coś|qualcosa)\b\s*/i, "");
    const parts = inner
      .split(/,| or | oder | sau | o | ou | lub | oppure /i)
      .map(x => x.replace(/^[\s.…-]+|[\s.…-]+$/g, "").trim())
      .filter(x => x.length >= 3 && x.length <= 28 && !/\s{2}/.test(x));
    if (parts.length >= 2) return parts.slice(-3);
  }
  // OFFENE FRAGEN: Ja/Nein wäre falsch („Was hast du heute vor?" → „Ja 🔥" sah kaputt aus,
  // Owner 28.07.2026). Für die häufigsten Fragetypen liefern wir echte ANTWORTEN.
  const L = String(lang ?? "en").slice(0, 2);
  const ql = q.toLowerCase();
  const intent = (re: RegExp) => re.test(ql);
  if (intent(/plan|vorhast|vor heute|dein tag|deine pläne|ziua de azi|programm|planes|projets|planos|plany|programmi|up to today|doing today/)) {
    return (OPEN_PLANS[L] ?? OPEN_PLANS.en);
  }
  if (intent(/ce faci|wie geht|how are you|cum ești|cum esti|qué tal|comment ça va|como estás|jak się masz|come stai|wie fühlst/)) {
    return (OPEN_MOOD[L] ?? OPEN_MOOD.en);
  }
  // IMMER KNÖPFE (Owner 29.07.2026): „sie wollen nicht eingeben, nur klicken." Auch wenn
  // sie gar keine Frage gestellt hat, bekommt er etwas zum Antippen — sonst endet der Chat
  // an einer Stelle, an der er tippen müsste.
  if (!q) return fallbackChips(lang);
  return POLAR[L] ?? POLAR.en;
}

// Antworten auf „Was hast du heute vor?" — kurz, alltäglich, ohne Verkauf.
const OPEN_PLANS: Record<string, string[]> = {
  en: ["Working today", "Just relaxing", "No idea yet 😅"],
  de: ["Arbeiten", "Einfach chillen", "Noch keine Ahnung 😅"],
  ro: ["La muncă", "Mă relaxez", "Încă nu știu 😅"],
  es: ["Trabajando", "Descansando", "Ni idea todavía 😅"],
  fr: ["Je bosse", "Je me détends", "Aucune idée 😅"],
  pt: ["A trabalhar", "A descansar", "Ainda não sei 😅"],
  pl: ["Praca", "Odpoczywam", "Jeszcze nie wiem 😅"],
  it: ["Lavoro", "Mi rilasso", "Ancora non lo so 😅"],
};

// Antworten auf „Wie geht es dir?"
const OPEN_MOOD: Record<string, string[]> = {
  en: ["Pretty good", "Tired honestly", "Better now 😏"],
  de: ["Ganz gut", "Ehrlich gesagt müde", "Jetzt besser 😏"],
  ro: ["Destul de bine", "Cam obosit", "Acum mai bine 😏"],
  es: ["Bastante bien", "Cansado la verdad", "Ahora mejor 😏"],
  fr: ["Plutôt bien", "Fatigué en vrai", "Mieux maintenant 😏"],
  pt: ["Bastante bem", "Cansado, sinceramente", "Agora melhor 😏"],
  pl: ["Całkiem dobrze", "Szczerze — zmęczony", "Teraz lepiej 😏"],
  it: ["Abbastanza bene", "Stanco, sinceramente", "Ora meglio 😏"],
};
