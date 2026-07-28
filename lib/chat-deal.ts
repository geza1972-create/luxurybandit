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
 *   3. Er will mehr → sie zeigt noch etwas, verlangt aber, dass er aus sich herausgeht:
 *      sonst weiß sie nicht, wer er ist und was er will.
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
    more: `Okay, I'll show you a few more 🔥 But you have to come out of your shell — otherwise I don't know who you are or what you want. At least tell me how old you are and where you like to go on holiday 😊\n${LINGERIE_TAG}`,
  },
  de: {
    deal: "Du traust dich nicht, mich nach einem heißen Outfit zu fragen, stimmt? 😏 Machen wir einen Deal: Schreib mir etwas Nettes — und ich zeige dir ein heißes Bild von mir.",
    show: `Siehst du? War doch nicht schwer 😌 Bitte sehr — das bin ich.\n\nWillst du noch mehr sehen?\n${LINGERIE_TAG}`,
    more: `Okay, ich zeige dir noch ein paar 🔥 Aber du musst aus dir rausgehen — sonst weiß ich nicht, wer du bist und was du willst. Verrat mir wenigstens, wie alt du bist und wo du gern Urlaub machst 😊\n${LINGERIE_TAG}`,
  },
  ro: {
    deal: "Nu îndrăznești să-mi ceri o ținută fierbinte, nu-i așa? 😏 Hai să facem un târg: scrie-mi ceva frumos — și îți arăt o poză fierbinte cu mine.",
    show: `Vezi? N-a fost greu 😌 Poftim — asta sunt eu.\n\nVrei să vezi mai mult?\n${LINGERIE_TAG}`,
    more: `Bine, îți mai arăt câteva 🔥 Dar trebuie să ieși din carapace — altfel nu știu cine ești și ce vrei. Spune-mi măcar câți ani ai și unde îți place să mergi în vacanță 😊\n${LINGERIE_TAG}`,
  },
  es: {
    deal: "No te atreves a pedirme un look atrevido, ¿verdad? 😏 Hagamos un trato: escríbeme algo bonito — y te enseño una foto mía de las calientes.",
    show: `¿Ves? No era tan difícil 😌 Aquí tienes — esta soy yo.\n\n¿Quieres ver más?\n${LINGERIE_TAG}`,
    more: `Vale, te enseño algunas más 🔥 Pero tienes que salir de tu caparazón — si no, no sé quién eres ni qué quieres. Dime al menos cuántos años tienes y adónde te gusta ir de vacaciones 😊\n${LINGERIE_TAG}`,
  },
  fr: {
    deal: "Tu n'oses pas me demander une tenue chaude, avoue 😏 On fait un marché : écris-moi quelque chose de gentil — et je te montre une photo bien chaude de moi.",
    show: `Tu vois ? Ce n'était pas si dur 😌 Tiens — c'est moi.\n\nTu veux en voir plus ?\n${LINGERIE_TAG}`,
    more: `D'accord, je t'en montre encore quelques-unes 🔥 Mais il faut que tu sortes de ta coquille — sinon je ne sais pas qui tu es ni ce que tu veux. Dis-moi au moins ton âge et où tu aimes partir en vacances 😊\n${LINGERIE_TAG}`,
  },
  pt: {
    deal: "Não te atreves a pedir-me um look quente, pois não? 😏 Vamos fazer um acordo: escreve-me algo simpático — e mostro-te uma foto bem quente minha.",
    show: `Vês? Não foi difícil 😌 Aqui tens — sou eu.\n\nQueres ver mais?\n${LINGERIE_TAG}`,
    more: `Está bem, mostro-te mais algumas 🔥 Mas tens de sair da tua concha — senão não sei quem és nem o que queres. Diz-me pelo menos a tua idade e onde gostas de ir de férias 😊\n${LINGERIE_TAG}`,
  },
  pl: {
    deal: "Nie odważysz się poprosić mnie o gorącą stylizację, co? 😏 Umówmy się: napisz mi coś miłego — a pokażę Ci moje gorące zdjęcie.",
    show: `Widzisz? Nie było trudno 😌 Proszę — to ja.\n\nChcesz zobaczyć więcej?\n${LINGERIE_TAG}`,
    more: `Dobra, pokażę Ci jeszcze kilka 🔥 Ale musisz wyjść ze swojej skorupy — inaczej nie wiem, kim jesteś i czego chcesz. Powiedz mi chociaż, ile masz lat i gdzie lubisz jeździć na wakacje 😊\n${LINGERIE_TAG}`,
  },
  it: {
    deal: "Non osi chiedermi un outfit bollente, vero? 😏 Facciamo un patto: scrivimi qualcosa di carino — e ti mostro una mia foto bollente.",
    show: `Visto? Non era difficile 😌 Ecco — questa sono io.\n\nVuoi vederne altre?\n${LINGERIE_TAG}`,
    more: `Va bene, te ne mostro ancora qualcuna 🔥 Ma devi uscire dal guscio — altrimenti non so chi sei né cosa vuoi. Dimmi almeno quanti anni hai e dove ti piace andare in vacanza 😊\n${LINGERIE_TAG}`,
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
  en: { deal: ["You look stunning", "Your smile got me", "Okay, show me 😏"], show: ["Yes, more 🔥", "Wow", "You're beautiful"], more: ["I'm 34, I love Greece", "Tell me about you first", "Ask me anything"], fallback: ["Tell me more", "Nice 😊", "And you?"] },
  de: { deal: ["Du siehst umwerfend aus", "Dein Lächeln", "Okay, zeig es mir 😏"], show: ["Ja, mehr 🔥", "Wow", "Du bist wunderschön"], more: ["Ich bin 34, ich liebe Griechenland", "Erzähl du zuerst", "Frag mich was"], fallback: ["Erzähl mehr", "Schön 😊", "Und du?"] },
  ro: { deal: ["Arăți superb", "Zâmbetul tău", "Bine, arată-mi 😏"], show: ["Da, mai mult 🔥", "Wow", "Ești frumoasă"], more: ["Am 34 de ani, iubesc Grecia", "Spune-mi tu întâi", "Întreabă-mă orice"], fallback: ["Spune-mi mai mult", "Frumos 😊", "Și tu?"] },
  es: { deal: ["Estás preciosa", "Tu sonrisa", "Vale, enséñamelo 😏"], show: ["Sí, más 🔥", "Wow", "Eres guapísima"], more: ["Tengo 34, me encanta Grecia", "Cuéntame tú primero", "Pregúntame algo"], fallback: ["Cuéntame más", "Qué bien 😊", "¿Y tú?"] },
  fr: { deal: ["Tu es magnifique", "Ton sourire", "Ok, montre-moi 😏"], show: ["Oui, encore 🔥", "Wow", "Tu es belle"], more: ["J'ai 34 ans, j'adore la Grèce", "Raconte d'abord", "Demande-moi"], fallback: ["Dis-m'en plus", "Sympa 😊", "Et toi ?"] },
  pt: { deal: ["Estás linda", "O teu sorriso", "Ok, mostra-me 😏"], show: ["Sim, mais 🔥", "Wow", "És linda"], more: ["Tenho 34, adoro a Grécia", "Conta tu primeiro", "Pergunta-me algo"], fallback: ["Conta-me mais", "Boa 😊", "E tu?"] },
  pl: { deal: ["Wyglądasz świetnie", "Twój uśmiech", "Dobra, pokaż 😏"], show: ["Tak, więcej 🔥", "Wow", "Jesteś piękna"], more: ["Mam 34 lata, kocham Grecję", "Najpierw ty opowiedz", "Zapytaj mnie o coś"], fallback: ["Powiedz więcej", "Fajnie 😊", "A ty?"] },
  it: { deal: ["Sei stupenda", "Il tuo sorriso", "Ok, mostrami 😏"], show: ["Sì, ancora 🔥", "Wow", "Sei bellissima"], more: ["Ho 34 anni, amo la Grecia", "Racconta prima tu", "Chiedimi qualcosa"], fallback: ["Dimmi di più", "Bello 😊", "E tu?"] },
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
