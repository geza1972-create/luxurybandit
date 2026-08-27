/**
 * DIE TEXTE DER PROGRAMMSEITE (`/future-program`) — 11.08.2026, Future Self Program.
 *
 * HANDGESCHRIEBEN STATT DURCH DIE ÜBERSETZUNGSMASCHINE — wie `future-ziele.ts` und
 * `future-program-tage.ts`: kurze Zeilen, die auf Chips und Knöpfe passen müssen, und die
 * ein Kunde 30 Abende lang liest. Alle Sprachen duzen (Hausregel, keine Ausnahme). KEINE
 * Preiszahlen — der Preis steht schon auf der Landingpage, hier geht es nur ums Programm.
 *
 * `lang` kommt vom PROGRAMM selbst (`FutureProgram.lang`, beim Bezahl-Stempel aus dem
 * Auftrag kopiert), nicht aus dem Browser des Besuchers — die Seite zeigt seine Sprache vom
 * Kauf, unabhängig davon, wer gerade den Link öffnet.
 */

export type FutureProgramText = {
  kicker: string;                 // "FUTURE SELF PROGRAM" klein in Gold
  dayOf: (day: number) => string; // "Day 7 of 30"
  next90: string;                 // Kopf nach Tag 30, ohne gesetztes Ziel
  next90Titled: string;           // Kopf nach Tag 30, MIT gesetztem Ziel (davor steht das Ziel)
  directionTitle: string;         // "YOUR DIRECTION"
  directionEmpty: string;         // keine Ziele gewählt
  progress: (done: number) => string; // "12 / 30 days kept"
  todayTitle: string;             // "TODAY"
  doneToday: string;              // Knopf-Ersatz nach dem Abhaken
  /** „Was kommt als Nächstes" unter dem Erledigt-Knopf (Owner 13.08.2026: „Haben wir nicht
      gesagt, dass hier gezeigt wird Whats next?") — {titel} = Titel des nächsten Tages. */
  nextUp: string;
  /** Die Einladung, MORGEN wiederzukommen (Owner 14.08.2026). nextUp nennt nur die
   *  Aufgabe; dieser Satz macht daraus die Verabredung. */
  kommMorgen: string;
  markDone: string;               // Abhak-Knopf
  missedTitle: string;            // Überschrift "Earlier days"
  missedMark: string;             // Nachträglich abhaken (kompakter Knopftext)
  weekChip: (n: number) => string; // Chip-Beschriftung "Week 1" für zurückblätterbare Wochen
  goal90Title: string;            // "YOUR NEXT 90 DAYS"
  goal90Placeholder: string;
  goal90Save: string;
  goal90Saved: string;            // Zeile vor dem gespeicherten Ziel
  invalidTitle: string;
  invalidText: string;
  backToGallery: string;
  loading: string;
};

export const FUTURE_PROGRAM_TEXT: Record<string, FutureProgramText> = {
  en: {
    kicker: "FUTURE SELF PROGRAM",
    dayOf: (d) => `Day ${d} of 30`,
    next90: "Your next 90 days",
    next90Titled: "Your next 90 days",
    directionTitle: "Your direction",
    directionEmpty: "You chose to find your direction along the way.",
    progress: (d) => `${d} / 30 days kept`,
    todayTitle: "Today",
    doneToday: "Done today ✓",
    nextUp: "Tomorrow: {titel}",
    kommMorgen: "Come back tomorrow and tick off your next task — that is how the 30 days become real.",
    markDone: "Mark today done",
    missedTitle: "Earlier days",
    missedMark: "Mark done",
    weekChip: (n) => `Week ${n}`,
    goal90Title: "Day 30 — set your next 90 days",
    goal90Placeholder: "Your next goal for the coming 90 days…",
    goal90Save: "Save my 90-day goal",
    goal90Saved: "Your 90-day goal",
    invalidTitle: "This link is not valid.",
    invalidText: "Check the link from your email.",
    backToGallery: "Open my assets",
    loading: "Loading your program…",
  },
  de: {
    kicker: "FUTURE SELF PROGRAM",
    dayOf: (d) => `Tag ${d} von 30`,
    next90: "Deine nächsten 90 Tage",
    next90Titled: "Deine nächsten 90 Tage",
    directionTitle: "Deine Richtung",
    directionEmpty: "Du hast dich entschieden, deine Richtung unterwegs zu finden.",
    progress: (d) => `${d} / 30 Tage geschafft`,
    todayTitle: "Heute",
    doneToday: "Heute erledigt ✓",
    nextUp: "Morgen: {titel}",
    kommMorgen: "Schau morgen wieder rein und hak deine nächste Aufgabe ab — genau so werden aus den 30 Tagen echte.",
    markDone: "Heute abhaken",
    missedTitle: "Frühere Tage",
    missedMark: "Abhaken",
    weekChip: (n) => `Woche ${n}`,
    goal90Title: "Tag 30 — trag deine nächsten 90 Tage ein",
    goal90Placeholder: "Dein nächstes Ziel für die kommenden 90 Tage…",
    goal90Save: "90-Tage-Ziel speichern",
    goal90Saved: "Dein 90-Tage-Ziel",
    invalidTitle: "Dieser Link ist nicht gültig.",
    invalidText: "Prüf den Link aus deiner E-Mail.",
    backToGallery: "Meine Assets öffnen",
    loading: "Dein Programm lädt …",
  },
  ro: {
    kicker: "FUTURE SELF PROGRAM",
    dayOf: (d) => `Ziua ${d} din 30`,
    next90: "Următoarele tale 90 de zile",
    next90Titled: "Următoarele tale 90 de zile",
    directionTitle: "Direcția ta",
    directionEmpty: "Ai ales să-ți găsești direcția pe parcurs.",
    progress: (d) => `${d} / 30 zile bifate`,
    todayTitle: "Astăzi",
    doneToday: "Făcut azi ✓",
    nextUp: "Mâine: {titel}",
    kommMorgen: "Revino mâine și bifează următoarea sarcină — așa devin cele 30 de zile reale.",
    markDone: "Bifează azi",
    missedTitle: "Zile anterioare",
    missedMark: "Bifează",
    weekChip: (n) => `Săptămâna ${n}`,
    goal90Title: "Ziua 30 — stabilește-ți următoarele 90 de zile",
    goal90Placeholder: "Următorul tău obiectiv pentru cele 90 de zile ce urmează…",
    goal90Save: "Salvează obiectivul pe 90 de zile",
    goal90Saved: "Obiectivul tău pe 90 de zile",
    invalidTitle: "Acest link nu este valid.",
    invalidText: "Verifică linkul din e-mailul tău.",
    backToGallery: "Deschide Assets",
    loading: "Programul tău se încarcă …",
  },
  es: {
    kicker: "FUTURE SELF PROGRAM",
    dayOf: (d) => `Día ${d} de 30`,
    next90: "Tus próximos 90 días",
    next90Titled: "Tus próximos 90 días",
    directionTitle: "Tu dirección",
    directionEmpty: "Elegiste encontrar tu dirección por el camino.",
    progress: (d) => `${d} / 30 días cumplidos`,
    todayTitle: "Hoy",
    doneToday: "Hecho hoy ✓",
    nextUp: "Mañana: {titel}",
    kommMorgen: "Vuelve mañana y marca tu siguiente tarea — así los 30 días se hacen reales.",
    markDone: "Marcar hoy como hecho",
    missedTitle: "Días anteriores",
    missedMark: "Marcar hecho",
    weekChip: (n) => `Semana ${n}`,
    goal90Title: "Día 30 — define tus próximos 90 días",
    goal90Placeholder: "Tu próxima meta para los siguientes 90 días…",
    goal90Save: "Guardar mi meta de 90 días",
    goal90Saved: "Tu meta de 90 días",
    invalidTitle: "Este enlace no es válido.",
    invalidText: "Comprueba el enlace de tu correo.",
    backToGallery: "Abrir mis Assets",
    loading: "Cargando tu programa …",
  },
  fr: {
    kicker: "FUTURE SELF PROGRAM",
    dayOf: (d) => `Jour ${d} sur 30`,
    next90: "Tes 90 prochains jours",
    next90Titled: "Tes 90 prochains jours",
    directionTitle: "Ta direction",
    directionEmpty: "Tu as choisi de trouver ta direction en chemin.",
    progress: (d) => `${d} / 30 jours tenus`,
    todayTitle: "Aujourd'hui",
    doneToday: "Fait aujourd'hui ✓",
    nextUp: "Demain : {titel}",
    kommMorgen: "Reviens demain et coche ta prochaine tâche — c'est ainsi que les 30 jours deviennent réels.",
    markDone: "Marquer comme fait",
    missedTitle: "Jours précédents",
    missedMark: "Marquer fait",
    weekChip: (n) => `Semaine ${n}`,
    goal90Title: "Jour 30 — fixe tes 90 prochains jours",
    goal90Placeholder: "Ton prochain objectif pour les 90 jours à venir…",
    goal90Save: "Enregistrer mon objectif à 90 jours",
    goal90Saved: "Ton objectif à 90 jours",
    invalidTitle: "Ce lien n'est pas valide.",
    invalidText: "Vérifie le lien reçu par e-mail.",
    backToGallery: "Ouvrir mes Assets",
    loading: "Chargement de ton programme …",
  },
  pt: {
    kicker: "FUTURE SELF PROGRAM",
    dayOf: (d) => `Dia ${d} de 30`,
    next90: "Os teus próximos 90 dias",
    next90Titled: "Os teus próximos 90 dias",
    directionTitle: "A tua direção",
    directionEmpty: "Escolheste encontrar a tua direção pelo caminho.",
    progress: (d) => `${d} / 30 dias cumpridos`,
    todayTitle: "Hoje",
    doneToday: "Feito hoje ✓",
    nextUp: "Amanhã: {titel}",
    kommMorgen: "Volta amanhã e marca a tua próxima tarefa — é assim que os 30 dias se tornam reais.",
    markDone: "Marcar hoje como feito",
    missedTitle: "Dias anteriores",
    missedMark: "Marcar feito",
    weekChip: (n) => `Semana ${n}`,
    goal90Title: "Dia 30 — define os teus próximos 90 dias",
    goal90Placeholder: "O teu próximo objetivo para os próximos 90 dias…",
    goal90Save: "Guardar o meu objetivo de 90 dias",
    goal90Saved: "O teu objetivo de 90 dias",
    invalidTitle: "Este link não é válido.",
    invalidText: "Confere o link do teu e-mail.",
    backToGallery: "Abrir os meus Assets",
    loading: "A carregar o teu programa …",
  },
  it: {
    kicker: "FUTURE SELF PROGRAM",
    dayOf: (d) => `Giorno ${d} di 30`,
    next90: "I tuoi prossimi 90 giorni",
    next90Titled: "I tuoi prossimi 90 giorni",
    directionTitle: "La tua direzione",
    directionEmpty: "Hai scelto di trovare la tua direzione lungo il cammino.",
    progress: (d) => `${d} / 30 giorni rispettati`,
    todayTitle: "Oggi",
    doneToday: "Fatto oggi ✓",
    nextUp: "Domani: {titel}",
    kommMorgen: "Torna domani e spunta il prossimo compito — è così che i 30 giorni diventano reali.",
    markDone: "Segna come fatto",
    missedTitle: "Giorni precedenti",
    missedMark: "Segna fatto",
    weekChip: (n) => `Settimana ${n}`,
    goal90Title: "Giorno 30 — imposta i tuoi prossimi 90 giorni",
    goal90Placeholder: "Il tuo prossimo obiettivo per i prossimi 90 giorni…",
    goal90Save: "Salva il mio obiettivo a 90 giorni",
    goal90Saved: "Il tuo obiettivo a 90 giorni",
    invalidTitle: "Questo link non è valido.",
    invalidText: "Controlla il link nella tua email.",
    backToGallery: "Apri i miei Assets",
    loading: "Caricamento del tuo programma …",
  },
};

/** Die Texte in seiner Sprache — unbekannte Sprache fällt auf Englisch zurück. */
export function futureProgramText(lang: string | undefined): FutureProgramText {
  return FUTURE_PROGRAM_TEXT[String(lang ?? "en").slice(0, 2)] ?? FUTURE_PROGRAM_TEXT.en;
}
