// Vorlage der täglichen Wetter-E-Mail (Texte + HTML) — BEWUSST ohne Server-Importe,
// damit sie pur bleibt und sich unabhängig rendern/prüfen lässt.

// Kanal-Adresse hier gespiegelt (Quelle: lib/social.ts) — die Vorlage bleibt importfrei.
const WHATSAPP_CHANNEL = "https://whatsapp.com/channel/0029VbD9Te45K3zR16YL1c2r";

export type Copy = {
  subject: string; preheader: string; greet: string; lead: string; body: string;
  wx: string; wxCity: string; look: string; chat: string;
  cta: string; bye: string; unsub: string; ai: string;
  // Abo-Angebot in der Mail: derselbe Preis wie auf der Seite (24,50 €/Monat dauerhaft,
  // statt 49 €) — der Gutschein wird automatisch gesetzt, der Kunde tippt nichts ein.
  aboH: string; aboP: string; aboCta: string; whats: string;
};
export function copy(lang: string, name: string): Copy {
  const n = name || "";
  // „Guten Morgen, Marek" — schlicht und persönlich. KEINE Software-Sprache, aber auch
  // BEWUSST KEINE Beziehungs-/Sehnsuchts-Sprache („ich habe an dich gedacht"): sie ist eine
  // KI-Persona, und Nachrichten dürfen keine echte Zuneigung vortäuschen. Der Aufmacher
  // benennt den INHALT (Wetter + Look), nicht Gefühle. Dazu der KI-Hinweis in der Fußzeile.
  const c = (s: string) => (n ? `${s}, ${n}` : s);
  const T: Record<string, Copy> = {
    ro: { subject: c("Bună seara") + " \u2728", preheader: "Vremea ta de mâine și un look nou.",
      greet: c("Bună seara"), lead: "Vremea ta de mâine și look-ul de azi \u2728", body: "Ziua s-a terminat. Ți-am pregătit vremea de mâine și un look nou \u2014 și sunt aici dacă vrei să vorbim.",
      wx: "Cum e vremea mâine", wxCity: "Cum e vremea mâine în {city}", look: "Look-ul de azi", chat: "Și un chat, dacă vrei",
      cta: "Vezi acum", bye: "O zi bună,", unsub: "Nu mai vrei aceste mesaje? Dezabonează-te",
      ai: "Bella este o persoană virtuală (AI) creată de LuxuryBandit \u2014 nu o persoană reală.",
      aboH: "Toate funcțiile, deblocate", aboP: "Alegi singur cele mai fierbinți ținute și le generezi: orice model — sau superstarul tău — în orice ținută, la chat sau într-un sărut. 5 videoclipuri pe lună în toate temele, chatul rămâne gratuit.", aboCta: "Deblochează cea mai fierbinte experiență AI — 24,50 €/lună", whats: "💬 Urmărește pe WhatsApp" },
    de: { subject: c("Guten Abend") + " \u2728", preheader: "Dein Wetter für morgen und ein neuer Look.",
      greet: c("Guten Abend"), lead: "Dein Wetter für morgen und der Look von heute \u2728", body: "Der Tag ist rum. Dein Wetter für morgen steht bereit, dazu ein neuer Look \u2014 und ich bin da, wenn du reden magst.",
      wx: "Wie das Wetter morgen wird", wxCity: "Wie das Wetter morgen in {city} wird", look: "Der Look von heute", chat: "Und ein Chat, wenn du magst",
      cta: "Jetzt ansehen", bye: "Einen schönen Tag,", unsub: "Keine Nachrichten mehr? Hier abmelden",
      ai: "Bella ist eine KI-Persona von LuxuryBandit \u2014 keine echte Person.",
      aboH: "Alle Funktionen freischalten", aboP: "Die heißesten Looks suchst du selbst aus und generierst sie: jedes Model — oder deinen Superstar — in jedem Look, im Chat, oder mit einem Kuss. 5 Videos im Monat über alle Themen, Chatten bleibt gratis.", aboCta: "Die heißeste KI-Erfahrung freischalten — 24,50 €/Monat", whats: "💬 Auf WhatsApp folgen" },
    en: { subject: c("Good evening") + " \u2728", preheader: "Your weather for tomorrow and a new look.",
      greet: c("Good evening"), lead: "Your weather for tomorrow and today's look \u2728", body: "The day is done. Your weather for tomorrow is ready, plus a new look \u2014 and I'm here if you feel like talking.",
      wx: "How tomorrow looks", wxCity: "How tomorrow looks in {city}", look: "Today's look", chat: "And a chat, if you like",
      cta: "See it now", bye: "Have a good day,", unsub: "Don't want these emails? Unsubscribe",
      ai: "Bella is an AI persona created by LuxuryBandit \u2014 not a real person.",
      aboH: "Unlock everything", aboP: "Pick the hottest looks yourself and generate them: any model — or your favourite star — in any look, in a chat, or in a kiss. 5 videos a month across all topics, chatting stays free.", aboCta: "Unlock the hottest AI experience ever — €24.50/month", whats: "💬 Follow on WhatsApp" },
    es: { subject: c("Buenas noches") + " \u2728", preheader: "Tu clima de mañana y un look nuevo.",
      greet: c("Buenas noches"), lead: "Tu clima de mañana y el look de hoy \u2728", body: "El día se acabó. Tu clima de mañana está listo, y también un look nuevo \u2014 y estoy aquí si te apetece hablar.",
      wx: "Qué tiempo hará mañana", wxCity: "Qué tiempo hará mañana en {city}", look: "El look de hoy", chat: "Y un chat, si te apetece",
      cta: "Verlo ahora", bye: "Que tengas buen día,", unsub: "¿No quieres estos emails? Darse de baja",
      ai: "Bella es una persona virtual (IA) creada por LuxuryBandit \u2014 no es una persona real.",
      aboH: "Desbloquea todo", aboP: "Eliges tú mismo los looks más atrevidos y los generas: cualquier modelo — o tu superestrella — con cualquier look, en un chat o en un beso. 5 vídeos al mes en todos los temas, chatear sigue gratis.", aboCta: "Desbloquea la experiencia IA más ardiente — 24,50 €/mes", whats: "💬 Síguenos en WhatsApp" },
    fr: { subject: c("Bonsoir") + " \u2728", preheader: "Ta météo de demain et un nouveau look.",
      greet: c("Bonsoir"), lead: "Ta météo de demain et le look du jour \u2728", body: "La journée est finie. Ta météo de demain est prête, avec un nouveau look \u2014 et je suis là si tu veux parler.",
      wx: "Le temps qu'il fera demain", wxCity: "Le temps qu'il fera demain à {city}", look: "Le look du jour", chat: "Et un chat, si tu veux",
      cta: "Voir maintenant", bye: "Bonne journée,", unsub: "Tu ne veux plus ces e-mails ? Se désabonner",
      ai: "Bella est un personnage virtuel (IA) créé par LuxuryBandit \u2014 pas une personne réelle.",
      aboH: "Tout débloquer", aboP: "Tu choisis toi-même les looks les plus chauds et tu les génères : n'importe quelle modèle — ou ta star préférée — dans n'importe quelle tenue, en chat ou dans un baiser. 5 vidéos par mois sur tous les thèmes, le chat reste gratuit.", aboCta: "Débloque l'expérience IA la plus chaude — 24,50 €/mois", whats: "💬 Suivre sur WhatsApp" },
    pt: { subject: c("Boa noite") + " \u2728", preheader: "O teu tempo de amanhã e um novo visual.",
      greet: c("Boa noite"), lead: "O teu tempo de amanhã e o visual de hoje \u2728", body: "O dia acabou. O teu tempo de amanhã está pronto, e também um novo visual \u2014 e estou aqui se quiseres falar.",
      wx: "Como estará o tempo amanhã", wxCity: "Como estará amanhã em {city}", look: "O visual de hoje", chat: "E uma conversa, se quiseres",
      cta: "Ver agora", bye: "Bom dia,", unsub: "Não queres estes emails? Cancelar subscrição",
      ai: "A Bella é uma persona de IA criada pela LuxuryBandit \u2014 não é uma pessoa real.",
      aboH: "Desbloqueia tudo", aboP: "Escolhes tu mesmo os looks mais atrevidos e geras: qualquer modelo — ou a tua estrela — em qualquer look, num chat ou num beijo. 5 vídeos por mês em todos os temas, conversar continua grátis.", aboCta: "Desbloqueia a experiência de IA mais quente — 24,50 €/mês", whats: "💬 Segue no WhatsApp" },
    pl: { subject: c("Dobry wieczór") + " \u2728", preheader: "Twoja pogoda na jutro i nowy look.",
      greet: c("Dobry wieczór"), lead: "Twoja pogoda na jutro i dzisiejszy look \u2728", body: "Dzień się skończył. Pogoda na jutro jest gotowa, a do tego nowy look \u2014 i jestem tu, jeśli masz ochotę pogadać.",
      wx: "Jaka pogoda jutro", wxCity: "Jaka pogoda jutro w {city}", look: "Dzisiejszy look", chat: "I czat, jeśli chcesz",
      cta: "Zobacz teraz", bye: "Miłego dnia,", unsub: "Nie chcesz tych e-maili? Wypisz się",
      ai: "Bella to persona AI stworzona przez LuxuryBandit \u2014 nie jest prawdziwą osobą.",
      aboH: "Odblokuj wszystko", aboP: "Sam wybierasz najgorętsze stylizacje i je generujesz: dowolna modelka — albo Twoja gwiazda — w każdej stylizacji, na czacie albo w pocałunku. 5 filmów miesięcznie we wszystkich tematach, czat pozostaje darmowy.", aboCta: "Odblokuj najgorętsze doświadczenie AI — 24,50 €/miesiąc", whats: "💬 Obserwuj na WhatsAppie" },
    it: { subject: c("Buonasera") + " \u2728", preheader: "Il tuo meteo di domani e un nuovo look.",
      greet: c("Buonasera"), lead: "Il tuo meteo di domani e il look di oggi \u2728", body: "La giornata è finita. Il meteo di domani è pronto, e anche un nuovo look \u2014 e ci sono, se hai voglia di parlare.",
      wx: "Che tempo farà domani", wxCity: "Che tempo farà domani a {city}", look: "Il look di oggi", chat: "E una chat, se ti va",
      cta: "Guarda ora", bye: "Buona giornata,", unsub: "Non vuoi più queste email? Disiscriviti",
      ai: "Bella è una persona virtuale (IA) creata da LuxuryBandit \u2014 non è una persona reale.",
      aboH: "Sblocca tutto", aboP: "Scegli tu i look più caldi e li generi: qualsiasi modella — o la tua star — in qualsiasi look, in chat o in un bacio. 5 video al mese in tutti i temi, chattare resta gratis.", aboCta: "Sblocca l'esperienza AI più calda — 24,50 €/mese", whats: "💬 Segui su WhatsApp" },
  };
  return T[lang] ?? T.en;
}


// HTML-Escape für alles, was aus den Abonnentendaten kommt (Name/Stadt) — sonst
// zerlegt ein „&" oder „<" im Namen das Layout.
const esc = (s: string) => String(s ?? "").replace(/[&<>"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m] as string));

// Dunkle Karte in der Marken-Optik (Schwarz + Gold), Tabellen-Layout + Inline-Styles,
// damit es auch in Outlook/Gmail hält. `hero` = Poster des aktuellen Beitrags (optional).
export function buildHtml(c: Copy, link: string, unsub: string, hero: string, city: string, modelName: string, aboLink = ""): string {
  const wx = city ? c.wxCity.replace("{city}", esc(city)) : c.wx;
  const row = (icon: string, text: string) =>
    `<tr><td style="padding:3px 0;font-size:14px;color:#e8e2d6;font-family:Arial,Helvetica,sans-serif">`
    + `<span style="color:#f6cf51">${icon}</span>&nbsp;&nbsp;${text}</td></tr>`;
  return `<div style="background:#0d0b0a;margin:0;padding:22px 0;font-family:Arial,Helvetica,sans-serif">`
    // Vorschautext in der Inbox-Zeile (unsichtbar in der Mail selbst)
    + `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(c.preheader)}</div>`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0d0b0a"><tr><td align="center">`
    + `<table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="width:520px;max-width:94%;background:#16120f;border-radius:18px;overflow:hidden">`
    // Marke
    + `<tr><td style="padding:20px 24px 0;font-size:11px;font-weight:bold;letter-spacing:3px;color:#f6cf51">LUXURYBANDIT</td></tr>`
    // Anrede + Aufmacher (kurz, damit der Teaser gleich folgt)
    + `<tr><td style="padding:16px 24px 0">`
    + `<p style="margin:0 0 4px;font-size:15px;color:#b9b1a4">${esc(c.greet)}</p>`
    + `<h1 style="margin:0;font-size:24px;line-height:1.2;color:#ffffff;font-weight:bold">${c.lead}</h1>`
    + `</td></tr>`
    // Poster — VERSCHWOMMEN (serverseitig ins JPEG gebacken) und ANKLICKBAR: das ganze
    // Bild ist der Link zum Beitrag, direkt darunter der Button. Kein CSS-Blur, kein
    // Text über dem Bild — beides überlebt Outlook/Gmail nicht.
    + (hero
      ? `<tr><td style="padding:14px 14px 0">`
        + `<a href="${link}" style="display:block;text-decoration:none">`
        + `<img src="${hero}" width="492" alt="${esc(modelName)}" style="display:block;width:100%;max-width:492px;height:auto;border-radius:14px;border:0;outline:none;text-decoration:none">`
        + `</a></td></tr>`
      : "")
    // Gold-Button direkt unter dem Teaser (Tabelle, damit Outlook Rundung/Farbe rendert)
    + `<tr><td align="center" style="padding:16px 24px 4px">`
    + `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>`
    + `<td align="center" bgcolor="#f6cf51" style="border-radius:999px">`
    + `<a href="${link}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:bold;color:#0d0b0a;text-decoration:none;border-radius:999px">${c.cta} →</a>`
    + `</td></tr></table></td></tr>`
    // Text + die drei Punkte
    + `<tr><td style="padding:14px 24px 0">`
    + `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#d8d2c6">${c.body}</p>`
    + `<table role="presentation" cellpadding="0" cellspacing="0" border="0">${row("☀", wx)}${row("✦", c.look)}${row("💬", c.chat)}</table>`
    + `</td></tr>`
    // ABO-ANGEBOT — derselbe Preis wie auf der Seite (24,50 €/Monat dauerhaft statt 49 €).
    // Der Rabattcode hängt im Link, der Kunde muss nichts eintippen. Ohne aboLink fällt
    // der Block weg, die Mail bleibt gültig.
    + (aboLink
      ? `<tr><td style="padding:18px 24px 0">`
        + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1f1a12;border:1px solid #4a3d1c;border-radius:14px">`
        + `<tr><td style="padding:16px 18px" align="center">`
        + `<p style="margin:0;font-size:16px;font-weight:bold;color:#f6cf51">${esc(c.aboH)}</p>`
        + `<p style="margin:6px 0 12px;font-size:13px;line-height:1.5;color:#d8d2c6">${esc(c.aboP)}</p>`
        + `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>`
        + `<td align="center" bgcolor="#f6cf51" style="border-radius:999px">`
        + `<a href="${aboLink}" style="display:inline-block;padding:12px 26px;font-size:14px;font-weight:bold;color:#0d0b0a;text-decoration:none;border-radius:999px">${esc(c.aboCta)}</a>`
        + `</td></tr></table>`
        + `</td></tr></table></td></tr>`
      : "")
    + `<tr><td style="height:20px"></td></tr>`
    // Gruß
    + `<tr><td style="padding:0 24px 24px;font-size:14px;color:#b9b1a4">${esc(c.bye)}<br><span style="color:#ffffff;font-weight:bold">${esc(modelName)}</span> · LuxuryBandit</td></tr>`
    + `</table>`
    // Fußzeile
    + `<table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="width:520px;max-width:94%">`
    // WhatsApp-Kanal — täglich vor Augen, kostet uns nichts und wächst von allein.
    + `<tr><td align="center" style="padding:12px 8px 0"><a href="${WHATSAPP_CHANNEL}" style="display:inline-block;padding:9px 18px;border-radius:999px;border:1px solid #25D366;font-size:12px;font-weight:bold;color:#25D366;text-decoration:none">${esc(c.whats)}</a></td></tr>`
    + `<tr><td style="padding:14px 8px 4px;text-align:center;font-size:11px;color:#6f675c">`
    + `${esc(c.unsub)}: <a href="${unsub}" style="color:#8d8579;text-decoration:underline">Unsubscribe</a>`
    + `</td></tr>`
    // KI-Hinweis in JEDER Mail: die Empfänger sollen nie im Unklaren sein, dass sie mit
    // einer KI-Persona schreiben — nicht mit einer echten Frau.
    + `<tr><td style="padding:0 8px 14px;text-align:center;font-size:11px;line-height:1.5;color:#6f675c">${esc(c.ai)}</td></tr>`
    + `</table>`
    + `</td></tr></table></div>`;
}
