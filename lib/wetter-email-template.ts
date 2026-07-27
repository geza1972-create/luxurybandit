// Vorlage der täglichen Wetter-E-Mail (Texte + HTML) — BEWUSST ohne Server-Importe,
// damit sie pur bleibt und sich unabhängig rendern/prüfen lässt.

export type Copy = {
  subject: string; preheader: string; greet: string; lead: string; body: string;
  wx: string; wxCity: string; look: string; chat: string;
  cta: string; bye: string; unsub: string;
};
export function copy(lang: string, name: string): Copy {
  const n = name || "";
  // „Guten Morgen, Marek" — schlicht und persönlich. KEINE Software-Sprache
  // („Ich habe alles für dich vorbereitet") — sie schreibt selbst, warm und neugierig-machend.
  const c = (s: string) => (n ? `${s}, ${n}` : s);
  const T: Record<string, Copy> = {
    ro: { subject: c("Bună dimineața") + " \u2600\uFE0F", preheader: "Am ceva nou pe mine \u2014 vrei să vezi?",
      greet: c("Bună dimineața"), lead: "M-am gândit la tine \u2600\uFE0F", body: "Abia începe ziua și eu sunt deja trează. Am ceva nou pe mine \u2014 vrei să vezi?",
      wx: "Cum e vremea azi", wxCity: "Cum e vremea în {city}", look: "Look-ul meu de azi", chat: "Și un chat cu mine, dacă vrei",
      cta: "Arată-mi", bye: "Pe curând,", unsub: "Nu mai vrei aceste mesaje? Dezabonează-te" },
    de: { subject: c("Guten Morgen") + " \u2600\uFE0F", preheader: "Ich habe etwas Neues an \u2014 willst du sehen?",
      greet: c("Guten Morgen"), lead: "Ich habe an dich gedacht \u2600\uFE0F", body: "Der Tag fängt gerade erst an und ich bin schon wach. Ich habe etwas Neues an \u2014 willst du sehen?",
      wx: "Wie das Wetter heute wird", wxCity: "Wie das Wetter in {city} wird", look: "Mein neuer Look von heute", chat: "Und ein Chat mit mir, wenn du magst",
      cta: "Zeig es mir", bye: "Bis gleich,", unsub: "Keine Nachrichten mehr? Hier abmelden" },
    en: { subject: c("Good morning") + " \u2600\uFE0F", preheader: "I am wearing something new \u2014 want to see?",
      greet: c("Good morning"), lead: "I was thinking about you \u2600\uFE0F", body: "The day is just starting and I am already awake. I am wearing something new \u2014 want to see?",
      wx: "How the weather looks today", wxCity: "How the weather looks in {city}", look: "My new look for today", chat: "And a chat with me, if you like",
      cta: "Show me", bye: "Talk soon,", unsub: "Don't want these emails? Unsubscribe" },
    es: { subject: c("Buenos días") + " \u2600\uFE0F", preheader: "Llevo algo nuevo \u2014 ¿quieres verlo?",
      greet: c("Buenos días"), lead: "He pensado en ti \u2600\uFE0F", body: "El día acaba de empezar y yo ya estoy despierta. Llevo algo nuevo \u2014 ¿quieres verlo?",
      wx: "Qué tiempo hace hoy", wxCity: "Qué tiempo hace en {city}", look: "Mi look de hoy", chat: "Y un chat conmigo, si te apetece",
      cta: "Muéstramelo", bye: "Hasta pronto,", unsub: "¿No quieres estos emails? Darse de baja" },
    fr: { subject: c("Bonjour") + " \u2600\uFE0F", preheader: "Je porte quelque chose de nouveau \u2014 tu veux voir ?",
      greet: c("Bonjour"), lead: "J'ai pensé à toi \u2600\uFE0F", body: "La journée commence à peine et je suis déjà réveillée. Je porte quelque chose de nouveau \u2014 tu veux voir ?",
      wx: "Le temps qu'il fait aujourd'hui", wxCity: "Le temps qu'il fait à {city}", look: "Mon nouveau look du jour", chat: "Et un chat avec moi, si tu veux",
      cta: "Montre-moi", bye: "À tout de suite,", unsub: "Tu ne veux plus ces e-mails ? Se désabonner" },
    pt: { subject: c("Bom dia") + " \u2600\uFE0F", preheader: "Tenho algo novo vestido \u2014 queres ver?",
      greet: c("Bom dia"), lead: "Estive a pensar em ti \u2600\uFE0F", body: "O dia está a começar e eu já estou acordada. Tenho algo novo vestido \u2014 queres ver?",
      wx: "Como está o tempo hoje", wxCity: "Como está o tempo em {city}", look: "O meu look de hoje", chat: "E uma conversa comigo, se quiseres",
      cta: "Mostra-me", bye: "Até já,", unsub: "Não queres estes emails? Cancelar subscrição" },
    pl: { subject: c("Dzień dobry") + " \u2600\uFE0F", preheader: "Mam na sobie coś nowego \u2014 chcesz zobaczyć?",
      greet: c("Dzień dobry"), lead: "Myślałam o Tobie \u2600\uFE0F", body: "Dzień dopiero się zaczyna, a ja już nie śpię. Mam na sobie coś nowego \u2014 chcesz zobaczyć?",
      wx: "Jaka dziś pogoda", wxCity: "Jaka pogoda w {city}", look: "Mój dzisiejszy look", chat: "I czat ze mną, jeśli chcesz",
      cta: "Pokaż mi", bye: "Do zobaczenia,", unsub: "Nie chcesz tych e-maili? Wypisz się" },
    it: { subject: c("Buongiorno") + " \u2600\uFE0F", preheader: "Indosso qualcosa di nuovo \u2014 vuoi vedere?",
      greet: c("Buongiorno"), lead: "Ho pensato a te \u2600\uFE0F", body: "La giornata è appena iniziata e io sono già sveglia. Indosso qualcosa di nuovo \u2014 vuoi vedere?",
      wx: "Che tempo fa oggi", wxCity: "Che tempo fa a {city}", look: "Il mio look di oggi", chat: "E una chat con me, se ti va",
      cta: "Fammi vedere", bye: "A presto,", unsub: "Non vuoi più queste email? Disiscriviti" },
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
    + `<td align="center" bgcolor="#c9a23f" style="border-radius:999px">`
    + `<a href="${link}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:bold;color:#0d0b0a;text-decoration:none;border-radius:999px">${c.cta} →</a>`
    + `</td></tr></table></td></tr>`
    // Text + die drei Punkte
    + `<tr><td style="padding:14px 24px 0">`
    + `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#d8d2c6">${c.body}</p>`
    + `<table role="presentation" cellpadding="0" cellspacing="0" border="0">${row("☀", wx)}${row("✦", c.look)}${row("💬", c.chat)}</table>`
    + `</td></tr>`
    + `<tr><td style="height:20px"></td></tr>`
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
