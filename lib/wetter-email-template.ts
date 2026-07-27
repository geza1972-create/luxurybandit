// Vorlage der täglichen Wetter-E-Mail (Texte + HTML) — BEWUSST ohne Server-Importe,
// damit sie pur bleibt und sich unabhängig rendern/prüfen lässt.

export type Copy = {
  subject: string; preheader: string; greet: string; lead: string; body: string;
  wx: string; wxCity: string; look: string; chat: string;
  cta: string; bye: string; unsub: string;
};
export function copy(lang: string, name: string): Copy {
  const n = name || "";
  const c = (s: string) => (n ? `${s} ${n}` : s);
  const T: Record<string, Copy> = {
    ro: { subject: c("Bună dimineața") + " ☀️ Vremea ta și un look nou", preheader: "Vremea ta, un look nou și un gând bun de la mine.",
      greet: c("Bună") + ",", lead: "Dimineața ta e gata ☀️", body: "Am pregătit totul pentru azi. Aruncă o privire — și spune-mi ce părere ai.",
      wx: "Vremea ta de azi", wxCity: "Vremea ta în {city}", look: "Un look nou, doar pentru tine", chat: "Și un chat cu mine, când vrei",
      cta: "Deschide pagina ta", bye: "Pe curând,", unsub: "Nu mai vrei aceste mesaje? Dezabonează-te" },
    de: { subject: c("Guten Morgen") + " ☀️ Dein Wetter & dein neuer Look", preheader: "Dein Wetter, ein neuer Look und ein lieber Gruß von mir.",
      greet: c("Hallo") + ",", lead: "Dein Morgen ist fertig ☀️", body: "Ich habe alles für heute vorbereitet. Schau kurz rein — und sag mir, wie du ihn findest.",
      wx: "Dein Wetter für heute", wxCity: "Dein Wetter in {city}", look: "Ein neuer Look, nur für dich", chat: "Und ein Chat mit mir, wann du magst",
      cta: "Deine Seite öffnen", bye: "Bis gleich,", unsub: "Keine Nachrichten mehr? Hier abmelden" },
    en: { subject: c("Good morning") + " ☀️ Your weather & a new look", preheader: "Your weather, a new look and a little thought from me.",
      greet: c("Hi") + ",", lead: "Your morning is ready ☀️", body: "I have everything set for today. Take a quick look — and tell me what you think.",
      wx: "Your weather for today", wxCity: "Your weather in {city}", look: "A new look, just for you", chat: "And a chat with me, whenever you like",
      cta: "Open your page", bye: "Talk soon,", unsub: "Don't want these emails? Unsubscribe" },
    es: { subject: c("Buenos días") + " ☀️ Tu clima y un look nuevo", preheader: "Tu clima, un look nuevo y un pensamiento bonito de mi parte.",
      greet: c("Hola") + ",", lead: "Tu mañana está lista ☀️", body: "Lo tengo todo preparado para hoy. Échale un vistazo y dime qué te parece.",
      wx: "Tu clima de hoy", wxCity: "Tu clima en {city}", look: "Un look nuevo, solo para ti", chat: "Y un chat conmigo cuando quieras",
      cta: "Abre tu página", bye: "Hasta pronto,", unsub: "¿No quieres estos emails? Darse de baja" },
    fr: { subject: c("Bonjour") + " ☀️ Ta météo et un nouveau look", preheader: "Ta météo, un nouveau look et une pensée pour toi.",
      greet: c("Bonjour") + ",", lead: "Ta matinée est prête ☀️", body: "J'ai tout préparé pour aujourd'hui. Jette un œil — et dis-moi ce que tu en penses.",
      wx: "Ta météo du jour", wxCity: "Ta météo à {city}", look: "Un nouveau look, rien que pour toi", chat: "Et un chat avec moi, quand tu veux",
      cta: "Ouvre ta page", bye: "À bientôt,", unsub: "Tu ne veux plus ces e-mails ? Se désabonner" },
    pt: { subject: c("Bom dia") + " ☀️ O teu tempo e um novo visual", preheader: "O teu tempo, um novo visual e um pensamento carinhoso.",
      greet: c("Olá") + ",", lead: "A tua manhã está pronta ☀️", body: "Preparei tudo para hoje. Dá uma vista de olhos — e diz-me o que achas.",
      wx: "O teu tempo de hoje", wxCity: "O teu tempo em {city}", look: "Um novo visual, só para ti", chat: "E uma conversa comigo, quando quiseres",
      cta: "Abre a tua página", bye: "Até já,", unsub: "Não queres estes emails? Cancelar subscrição" },
    pl: { subject: c("Dzień dobry") + " ☀️ Twoja pogoda i nowy look", preheader: "Twoja pogoda, nowy look i miła myśl ode mnie.",
      greet: c("Cześć") + ",", lead: "Twój poranek jest gotowy ☀️", body: "Przygotowałam wszystko na dziś. Zajrzyj — i powiedz, co sądzisz.",
      wx: "Twoja pogoda na dziś", wxCity: "Twoja pogoda w {city}", look: "Nowy look, tylko dla Ciebie", chat: "I czat ze mną, kiedy chcesz",
      cta: "Otwórz swoją stronę", bye: "Do zobaczenia,", unsub: "Nie chcesz tych e-maili? Wypisz się" },
    it: { subject: c("Buongiorno") + " ☀️ Il tuo meteo e un nuovo look", preheader: "Il tuo meteo, un nuovo look e un pensiero gentile.",
      greet: c("Ciao") + ",", lead: "La tua mattina è pronta ☀️", body: "Ho preparato tutto per oggi. Dai un'occhiata — e dimmi che ne pensi.",
      wx: "Il tuo meteo di oggi", wxCity: "Il tuo meteo a {city}", look: "Un nuovo look, solo per te", chat: "E una chat con me, quando vuoi",
      cta: "Apri la tua pagina", bye: "A presto,", unsub: "Non vuoi più queste email? Disiscriviti" },
  };
  return T[lang] ?? T.en;
}


// HTML-Escape für alles, was aus den Abonnentendaten kommt (Name/Stadt) — sonst
// zerlegt ein „&" oder „<" im Namen das Layout.
const esc = (s: string) => String(s ?? "").replace(/[&<>"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m] as string));

// Dunkle Karte in der Marken-Optik (Schwarz + Gold), Tabellen-Layout + Inline-Styles,
// damit es auch in Outlook/Gmail hält. `hero` = Poster des aktuellen Beitrags (optional).
export function buildHtml(c: Copy, link: string, unsub: string, hero: string, city: string, modelName: string): string {
  const wx = city ? c.wxCity.replace("{city}", esc(city)) : c.wx;
  const row = (icon: string, text: string) =>
    `<tr><td style="padding:3px 0;font-size:14px;color:#e8e2d6;font-family:Arial,Helvetica,sans-serif">`
    + `<span style="color:#c9a23f">${icon}</span>&nbsp;&nbsp;${text}</td></tr>`;
  return `<div style="background:#0d0b0a;margin:0;padding:22px 0;font-family:Arial,Helvetica,sans-serif">`
    // Vorschautext in der Inbox-Zeile (unsichtbar in der Mail selbst)
    + `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(c.preheader)}</div>`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0d0b0a"><tr><td align="center">`
    + `<table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="width:520px;max-width:94%;background:#16120f;border-radius:18px;overflow:hidden">`
    // Marke
    + `<tr><td style="padding:20px 24px 0;font-size:11px;font-weight:bold;letter-spacing:3px;color:#c9a23f">LUXURYBANDIT</td></tr>`
    // Poster
    + (hero
      ? `<tr><td style="padding:14px 14px 0"><img src="${hero}" width="492" alt="${esc(modelName)}" style="display:block;width:100%;max-width:492px;height:auto;border-radius:14px;border:0;outline:none;text-decoration:none"></td></tr>`
      : "")
    // Text
    + `<tr><td style="padding:22px 24px 0">`
    + `<p style="margin:0 0 6px;font-size:15px;color:#b9b1a4">${esc(c.greet)}</p>`
    + `<h1 style="margin:0 0 10px;font-size:24px;line-height:1.2;color:#ffffff;font-weight:bold">${c.lead}</h1>`
    + `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#d8d2c6">${c.body}</p>`
    + `<table role="presentation" cellpadding="0" cellspacing="0" border="0">${row("☀", wx)}${row("✦", c.look)}${row("💬", c.chat)}</table>`
    + `</td></tr>`
    // Gold-Button (Tabelle, damit Outlook die Rundung/Farbe rendert)
    + `<tr><td align="center" style="padding:24px">`
    + `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>`
    + `<td align="center" bgcolor="#c9a23f" style="border-radius:999px">`
    + `<a href="${link}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:bold;color:#0d0b0a;text-decoration:none;border-radius:999px">${c.cta} →</a>`
    + `</td></tr></table></td></tr>`
    // Gruß
    + `<tr><td style="padding:0 24px 24px;font-size:14px;color:#b9b1a4">${esc(c.bye)}<br><span style="color:#ffffff;font-weight:bold">${esc(modelName)}</span> · LuxuryBandit</td></tr>`
    + `</table>`
    // Fußzeile
    + `<table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="width:520px;max-width:94%">`
    + `<tr><td style="padding:14px 8px;text-align:center;font-size:11px;color:#6f675c">`
    + `${esc(c.unsub)}: <a href="${unsub}" style="color:#8d8579;text-decoration:underline">Unsubscribe</a>`
    + `</td></tr></table>`
    + `</td></tr></table></div>`;
}
