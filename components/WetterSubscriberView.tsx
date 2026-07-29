"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Lock, X, Play } from "lucide-react";
import { CornerOrnaments } from "@/components/BoxOrnaments";
import BellaPostsCarousel from "@/components/BellaPostsCarousel";
import { wxKey, WX_WORDS, forecastLine } from "@/lib/wetter-forecast";
import { startPremiumCheckout } from "@/lib/start-premium-checkout";
import AgeGate, { ageVerified } from "@/components/AgeGate";
import { renewNote } from "@/lib/pricing";
import { WHATSAPP_CHANNEL, followWhatsApp } from "@/lib/social";
import { dayFullMessage, CHIPS_TAG_RE, deriveChips } from "@/lib/chat-deal";

// Was der ABONNENT auf /wetter/<model>?name=…&city=…&lang=… sieht:
// persönlicher Gruß + Wetter aus seiner Stadt + Look vom Tag + Chat mit dem Model (im Abo unbegrenzt).
//
// MODEL-AGNOSTISCH: Model-ID + -Name kommen als Props (dieses Mal Bella, kann jede andere sein).
// WELTWEIT: jeder Text aus der Übersetzungs-Tabelle `T` (keyed by lang); Wetter (Open-Meteo) global,
// Bedingungs-Wörter pro Sprache; Zeitzone der Stadt mit abgefangen (spätere „Morgen"-Zustellung).

const DEFAULT_MODEL_ID = "curator-1783683672619-td4cy"; // Bella = Fallback/erstes Model
const DEFAULT_LANG = "en";

// „Morgen" vor der Vorhersage, wenn die Tagespost abends kommt.
const TOMORROW_LBL: Record<string, string> = {
  en: "Tomorrow", de: "Morgen", ro: "Mâine", es: "Mañana",
  fr: "Demain", pt: "Amanhã", pl: "Jutro", it: "Domani",
};   // Standard = EN, wenn keine Sprache übergeben

// {Name} / {name} im Titel durch den echten Namen ersetzen (feste Vorgabe wird personalisiert).
// Kein Name bekannt? Dann Platzhalter SAMT davorstehendem Komma entfernen und Satzzeichen
// glätten — sonst käme „Guten Morgen, !" beim Abonnenten an.
const personalizeName = (text: string, name: string) => {
  const n = (name || "").trim();
  if (n) return text.replace(/\{\s*name\s*\}/gi, n);
  return text
    .replace(/[,،]?\s*\{\s*name\s*\}/gi, "")   // „, {Name}" bzw. „{Name}" weg
    .replace(/\s+([!?.,])/g, "$1")             // Leerzeichen vor Satzzeichen
    .replace(/,\s*([!?])/g, "$1")              // „, !" → „!"
    .trim();
};

// Die KI beendet ihre Nachricht mit diesem Tag, wenn sie anbietet, sich „in etwas Heißem"
// zu zeigen. Der Chat blendet den Tag aus und zeigt stattdessen eine Look-Galerie
// (erste frei = Vorgeschmack, Rest gesperrt mit Schloss → Abo). Muss zu /api/model-chat passen.
const LINGERIE_TAG = "[[SHOW_LINGERIE]]";

// Direkt in den Anprobier-Funnel — die Landing /themes/tryon wäre nur eine
// Zwischenseite mit einem weiteren Button (Owner: „ist zu viel").
const TRYON_FUNNEL = "/try/look-1784191032626-70e3608b?pick=1";

// "notice" = eingeschobene KI-Erinnerung (keine Chat-Blase, wird nicht ans Modell gesendet)
type Msg = { role: "user" | "assistant" | "notice"; content: string };
type Look = { kind: "image" | "video"; mediaUrl: string; posterUrl?: string };


// Alle sichtbaren Texte pro Sprache. Model-Name wird eingesetzt. Fallback: EN.
type Copy = {
  greet: (n: string) => string;
  greetPre: string;   // Gruß ohne Name (Name danach in Gold)
  wxLoading: (city: string) => string;
  online: string;
  opener: (userName: string, model: string) => string;
  placeholder: (model: string) => string;
  aiNote: (model: string) => string;
  aiRemind: (model: string) => string;   // wiederkehrende Erinnerung bei Vielschreibern
};
const T: Record<string, Copy> = {
  ro: {
    greet: n => `Bună dimineața, ${n}!`,
    greetPre: "Bună dimineața,",
    wxLoading: c => `La ${c}…`,
    online: "online",
    opener: (n) => `Bună dimineața, ${n}! Mă bucur că ești aici. Cum ai dormit?`,
    placeholder: m => `Scrie-i lui ${m}…`,
    aiNote: m => `✨ Vorbești cu asistentul AI al lui ${m} — o persona AI, nu persoana reală.`,
    aiRemind: m => `Doar ca să știi: ${m} este o persona AI, nu o persoană reală. Îți răspunde un program.`,
  },
  de: {
    greet: n => `Guten Morgen, ${n}!`,
    greetPre: "Guten Morgen,",
    wxLoading: c => `In ${c}…`,
    online: "online",
    opener: (n) => `Guten Morgen, ${n}! Schön, dass du da bist. Wie hast du geschlafen?`,
    placeholder: m => `Schreib ${m}…`,
    aiNote: m => `✨ Du chattest mit ${m}s KI-Assistentin — eine KI-Persona, nicht die echte Person.`,
    aiRemind: m => `Nur damit du es weißt: ${m} ist eine KI-Persona, keine echte Person. Dir antwortet ein Programm.`,
  },
  en: {
    greet: n => `Good morning, ${n}!`,
    greetPre: "Good morning,",
    wxLoading: c => `In ${c}…`,
    online: "online",
    opener: (n) => `Good morning, ${n}! So glad you're here. How did you sleep?`,
    placeholder: m => `Message ${m}…`,
    aiNote: m => `✨ You're chatting with ${m}'s AI assistant — an AI persona, not the real person.`,
    aiRemind: m => `Just so you know: ${m} is an AI persona, not a real person. A program is replying to you.`,
  },
  es: {
    greet: n => `¡Buenos días, ${n}!`,
    greetPre: "¡Buenos días,",
    wxLoading: c => `En ${c}…`,
    online: "en línea",
    opener: (n) => `¡Buenos días, ${n}! Me alegra que estés aquí. ¿Qué tal dormiste?`,
    placeholder: m => `Escríbele a ${m}…`,
    aiNote: m => `✨ Estás chateando con la asistente AI de ${m} — una persona AI, no la persona real.`,
    aiRemind: m => `Solo para que lo sepas: ${m} es una persona virtual (IA), no una persona real. Te responde un programa.`,
  },
  fr: {
    greet: n => `Bonjour, ${n} !`,
    greetPre: "Bonjour,",
    wxLoading: c => `À ${c}…`,
    online: "en ligne",
    opener: (n) => `Bonjour, ${n} ! Contente que tu sois là. Tu as bien dormi ?`,
    placeholder: m => `Écris à ${m}…`,
    aiNote: m => `✨ Tu discutes avec l'assistante AI de ${m} — une persona AI, pas la vraie personne.`,
    aiRemind: m => `Pour info : ${m} est un personnage virtuel (IA), pas une personne réelle. C'est un programme qui te répond.`,
  },
  pt: {
    greet: n => `Bom dia, ${n}!`,
    greetPre: "Bom dia,",
    wxLoading: c => `Em ${c}…`,
    online: "online",
    opener: (n) => `Bom dia, ${n}! Ainda bem que estás aqui. Dormiste bem?`,
    placeholder: m => `Escreve à ${m}…`,
    aiNote: m => `✨ Estás a conversar com a assistente AI da ${m} — uma persona AI, não a pessoa real.`,
    aiRemind: m => `Só para saberes: a ${m} é uma persona de IA, não uma pessoa real. Quem te responde é um programa.`,
  },
  pl: {
    greet: n => `Dzień dobry, ${n}!`,
    greetPre: "Dzień dobry,",
    wxLoading: c => `W ${c}…`,
    online: "online",
    opener: (n) => `Dzień dobry, ${n}! Cieszę się, że jesteś. Jak spałeś?`,
    placeholder: m => `Napisz do ${m}…`,
    aiNote: m => `✨ Rozmawiasz z asystentką AI ${m} — to persona AI, nie prawdziwa osoba.`,
    aiRemind: m => `Tak dla jasności: ${m} to persona AI, nie prawdziwa osoba. Odpowiada Ci program.`,
  },
  it: {
    greet: n => `Buongiorno, ${n}!`,
    greetPre: "Buongiorno,",
    wxLoading: c => `A ${c}…`,
    online: "online",
    opener: (n) => `Buongiorno, ${n}! Che bello averti qui. Hai dormito bene?`,
    placeholder: m => `Scrivi a ${m}…`,
    aiNote: m => `✨ Stai chattando con l'assistente AI di ${m} — una persona AI, non la persona reale.`,
    aiRemind: m => `Giusto perché tu lo sappia: ${m} è una persona virtuale (IA), non una persona reale. Ti risponde un programma.`,
  },
};

export default function WetterSubscriberView({ name, city, look, lang = DEFAULT_LANG, modelId = DEFAULT_MODEL_ID, modelName = "Bella", subId = "", email = "", day = "", time = "", title = "", caption = "", firstMessage = "", dayContext = "", locked = false, paid = false, modelSlug = "", monthlyCents = 4900, profileAsk = null, crossModels = [], kissTeaser = "", kissTeaserIsVideo = false, tryonTeaser = "", tryonLingerie = "", idolTeaser = "", lingerieTeaser = "" }: {
  name: string; city: string; look: Look | null; lang?: string; modelId?: string; modelName?: string; subId?: string; email?: string; day?: string; time?: string;
  title?: string;         // „Titel" aus dem Beitrag — groß über dem Text
  caption?: string;       // „Text unter dem Bild" aus dem Beitrag
  firstMessage?: string;  // „Erste Nachricht im Chat" — Opener (leer = Standard-Gruß)
  dayContext?: string;    // „Ihr Tag heute" — steuert den Chat
  locked?: boolean;       // Video: nach 7 Öffnungen ohne Abo gesperrt (Bild + Text bleiben)
  paid?: boolean;         // zahlender Abonnent → kein Tages-Chatlimit
  modelSlug?: string;     // für die Rückkehr-URL des Abo-Checkouts
  profileAsk?: React.ReactNode;   // „Woher soll das Wetter kommen?" — steht VOR der Werbung
  monthlyCents?: number;  // Abo-Preis (24 € = 2400) für den Freischalt-Button
  crossModels?: { id?: string; name: string; img: string; href: string }[];  // Cross-Sell-Slider zu bezahlten Models
  kissTeaser?: string;          // Poster der Kiss-Karte (Bild oder Video)
  kissTeaserIsVideo?: boolean;
  tryonTeaser?: string;         // Poster der Try-On-Karte („angezogen")
  tryonLingerie?: string;       // zweites Bild — die Karte blendet zwischen beiden hin und her
  idolTeaser?: string;          // Beispiel-Video für „Dein Idol mit dir"
  lingerieTeaser?: string;      // Beispiel-Video für die Lingerie-Karte
}) {
  const L = (lang || DEFAULT_LANG).slice(0, 2).toLowerCase();
  const t = T[L] ?? T.en;
  const wxWords = WX_WORDS[L] ?? WX_WORDS.en;

  // Login auf DIESEM Gerät merken: kommt der Abonnent per `?s=`-Link, speichern wir die
  // Kennung — beim nächsten Öffnen von /wetter/<model> erkennt ihn die Seite ohne Link.
  useEffect(() => {
    if (!subId) return;
    try { localStorage.setItem(`lb_wetter_sub_${modelId}`, subId); } catch { /**/ }
  }, [subId, modelId]);

  // DUELL „sie oder ich?" (Owner 28.07.2026): eine kleine Show statt einer Frage. Sagt er
  // die andere, übernimmt DIE den Chat — der Besucher bekommt, wen er will, und bleibt.
  const rival = crossModels.find(m => m.id) ?? null;
  const [activeId, setActiveId] = useState(modelId);
  const [activeName, setActiveName] = useState(modelName);
  const [activePhoto, setActivePhoto] = useState("");   // ihr Bild im Chat-Kopf
  const [duelAsked, setDuelAsked] = useState(false);
  const [tomorrow, setTomorrow] = useState(false);   // abends zeigen wir das Wetter für morgen
  const [weather, setWeather] = useState<{ temp: number; min: number; max: number; word: string; e: string; rainy: boolean; place: string } | null>(null);
  const tzRef = useRef<string>("");   // Zeitzone der Stadt — fürs spätere „Morgen"-Timing pro Land.

  // Paywall-Texte + Freischalten. Nach 7 Öffnungen sind Video + Chat gesperrt.
  const priceLabel = `${Math.round(monthlyCents / 100)} €`;
  const LOCK: Record<string, { spent: string; sub: string; cta: string; chat: string }> = {
    ro: { spent: "Ți-ai consumat toate creditele", sub: `Continuă cu ${priceLabel}/lună — video complet + chat nelimitat cu ${modelName}.`, cta: `🔓 Deblochează — ${priceLabel}/lună`, chat: "Deblochează pentru a continua conversația" },
    de: { spent: "Du hast alle Credits verbraucht", sub: `Weiter für ${priceLabel}/Monat — komplettes Video + unbegrenzter Chat mit ${modelName}.`, cta: `🔓 Freischalten — ${priceLabel}/Monat`, chat: "Zum Weiterchatten freischalten" },
    en: { spent: "You've used all your credits", sub: `Continue for ${priceLabel}/month — full video + unlimited chat with ${modelName}.`, cta: `🔓 Unlock — ${priceLabel}/month`, chat: "Unlock to keep chatting" },
    es: { spent: "Has usado todos tus créditos", sub: `Continúa por ${priceLabel}/mes — vídeo completo + chat ilimitado con ${modelName}.`, cta: `🔓 Desbloquear — ${priceLabel}/mes`, chat: "Desbloquea para seguir chateando" },
    fr: { spent: "Tu as utilisé tous tes crédits", sub: `Continue pour ${priceLabel}/mois — vidéo complète + chat illimité avec ${modelName}.`, cta: `🔓 Débloquer — ${priceLabel}/mois`, chat: "Débloque pour continuer à discuter" },
    pt: { spent: "Usaste todos os teus créditos", sub: `Continua por ${priceLabel}/mês — vídeo completo + chat ilimitado com ${modelName}.`, cta: `🔓 Desbloquear — ${priceLabel}/mês`, chat: "Desbloqueia para continuar a conversar" },
    pl: { spent: "Wykorzystałeś wszystkie kredyty", sub: `Kontynuuj za ${priceLabel}/mies. — pełne wideo + nielimitowany czat z ${modelName}.`, cta: `🔓 Odblokuj — ${priceLabel}/mies.`, chat: "Odblokuj, aby dalej czatować" },
    it: { spent: "Hai usato tutti i tuoi crediti", sub: `Continua per ${priceLabel}/mese — video completo + chat illimitata con ${modelName}.`, cta: `🔓 Sblocca — ${priceLabel}/mese`, chat: "Sblocca per continuare a chattare" },
  };
  const lk = LOCK[L] ?? LOCK.en;
  const [showLock, setShowLock] = useState(false);   // Overlay „Credits verbraucht" erst NACH Klick aufs Video
  const [chatUnlock, setChatUnlock] = useState(false);   // im Chat: nach dem 1. Sende-Versuch den Freischalt-Button zeigen
  const [needAge, setNeedAge] = useState(false);         // 18+-Abfrage vor der ersten Chat-Nachricht

  // Gratis-Chat = 50 Nachrichten PRO TAG (client-seitig, resetet um Mitternacht). Zahler = unbegrenzt.
  // „Erst-mal"-Lösung; bei vielen Usern auf serverseitiges Limit umstellen.
  // 10 Gratis-Nachrichten pro Tag (Owner 28.07.2026, vorher 50). Fuenfzig schrieb praktisch
  // niemand — die Sperre griff nie und der Chat war faktisch unbegrenzt gratis. Zehn reichen
  // fuer eine echte Unterhaltung und lassen den Vielschreiber den Freischalt-Knopf sehen.
  const DAILY_CHAT_LIMIT = 10;
  const chatDayKey = `lb_wetter_chatmsgs_${modelId}_${subId}`;
  const [chatCount, setChatCount] = useState(0);
  useEffect(() => {
    if (!subId) return;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const raw = localStorage.getItem(chatDayKey);
      const d = raw ? (JSON.parse(raw) as { date: string; count: number }) : null;
      setChatCount(d && d.date === today ? Number(d.count) || 0 : 0);
    } catch { /**/ }
  }, [subId, modelId, chatDayKey]);
  const bumpChat = () => {
    setChatCount(c => {
      const n = c + 1;
      try { localStorage.setItem(chatDayKey, JSON.stringify({ date: new Date().toISOString().slice(0, 10), count: n })); } catch { /**/ }
      return n;
    });
  };
  const chatBlocked = !paid && !!subId && chatCount >= DAILY_CHAT_LIMIT;
  // TAGESLIMIT — sie vertröstet auf morgen UND macht ein Angebot: im Abo reden wir weiter,
  // ich verrate dir mehr und stelle dir meine Freundinnen vor (Owner 28.07.2026, Wortlaut
  // vom Owner). Der stärkste Verkaufsmoment im Chat; steht in lib/chat-deal, 8 Sprachen.
  const creditsMsg = dayFullMessage(L, name.trim());

  const [unlocking, setUnlocking] = useState(false);
  // Aktionscode aus der Adresse (`?code=BELLA`) — so kommt der Preis aus der Anzeige
  // (24,50 €/Monat dauerhaft) mit, ohne dass der Kunde in Stripe etwas eintippen muss.
  const [promo, setPromo] = useState("");
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const c = (p.get("code") ?? "").trim().slice(0, 40);
      if (c) setPromo(c);
      // Aus dem Abo-Knopf der Mail (`abo=1`): zum Angebot scrollen. BEWUSST kein
      // automatischer Sprung zur Kasse — eine Zahlseite öffnet sich nur auf Tippen.
      if (p.get("abo") === "1") setTimeout(() => document.getElementById("abo")?.scrollIntoView({ behavior: "smooth", block: "center" }), 400);
    } catch { /**/ }
  }, []);
  const unlock = async () => {
    setUnlocking(true);
    try {
      const r = await fetch("/api/wetter-abo-checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subId, modelId, modelSlug, code: promo }) });
      const d = await r.json().catch(() => ({}));
      if (d?.url) { window.location.href = d.url; return; }
    } catch { /**/ }
    setUnlocking(false);
  };

  // Selbst-Abmeldung (der Abonnent stoppt die tägliche Nachricht direkt hier).
  const [unsubbed, setUnsubbed] = useState(false);
  const [unsubbing, setUnsubbing] = useState(false);
  const unsubscribe = async () => {
    if (!subId) return;
    const ask = (({ de: "Keine Morgennachrichten mehr?", en: "Stop the morning messages?", es: "¿Detener los mensajes de la mañana?", fr: "Arrêter les messages du matin ?", pt: "Parar as mensagens da manhã?", pl: "Zatrzymać poranne wiadomości?", it: "Fermare i messaggi del mattino?" } as Record<string, string>)[L]) ?? "Oprești mesajele de dimineață?";
    if (typeof window !== "undefined" && !window.confirm(ask)) return;
    setUnsubbing(true);
    try {
      await fetch("/api/wetter-unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modelId, s: subId }) });
      try { localStorage.removeItem(`lb_wetter_sub_${modelId}`); } catch { /**/ }
      setUnsubbed(true);
    } catch { /**/ } finally { setUnsubbing(false); }
  };

  // Wetter aus der Stadt des Abonnenten (Open-Meteo, CORS-frei, kein Key, weltweit).
  useEffect(() => {
    if (!city) return;
    let ok = true;
    // Hauptstadt je Sprache — Rückfall, wenn die Stadt unbekannt/falsch geschrieben ist
    // (z. B. „Timisora"), damit die Vorhersage NIE ewig im Ladezustand hängt.
    const CAPITAL: Record<string, string> = { ro: "București", de: "Berlin", en: "London", es: "Madrid", fr: "Paris", pt: "Lisboa", pl: "Warszawa", it: "Roma" };
    const geocode = async (q: string) => {
      const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=${encodeURIComponent(L)}`).then(r => r.json());
      return g?.results?.[0] ?? null;
    };
    (async () => {
      try {
        let loc = await geocode(city);
        if (!loc) loc = await geocode(CAPITAL[L] ?? "London");   // Stadt nicht gefunden → Hauptstadt der Sprache
        if (!loc) return;
        tzRef.current = String(loc.timezone || "");   // ← Zeitzone mit abgefangen (steht bereit für die DB).
        const w = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=2`).then(r => r.json());
        const c = w?.current, dy = w?.daily;
        if (ok && c) {
          // ABENDS = das Wetter für MORGEN (Owner 28.07.2026): die Tagespost geht abends
          // raus, weil morgens niemand Zeit zum Chatten hat. Ab 15 Uhr Ortszeit zeigen wir
          // deshalb Tag 2 der Vorhersage, davor den heutigen Tag.
          const t = new Date().getHours() >= 15 && Array.isArray(dy?.weather_code) && dy.weather_code.length > 1 ? 1 : 0;
          const dayCode = Number(dy?.weather_code?.[t] ?? c.weather_code);
          const wk = wxKey(dayCode);
          const now = Math.round(Number(c.temperature_2m));
          const max = Math.round(Number(dy?.temperature_2m_max?.[t] ?? c.temperature_2m));
          const min = Math.round(Number(dy?.temperature_2m_min?.[t] ?? c.temperature_2m));
          const rainy = Number(dy?.precipitation_probability_max?.[t] ?? 0) >= 40;
          setTomorrow(t === 1);
          setWeather({ temp: now, min, max, word: wxWords[wk.key] ?? "", e: wk.e, rainy, place: String(loc.name || city) });
        }
      } catch { /**/ }
    })();
    return () => { ok = false; };
  }, [city, L, wxWords]);

  // ── Chat mit dem Model (Abonnent = unbegrenzt) ── in der Sprache des Abonnenten.
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: firstMessage.trim() || t.opener(name, modelName) }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, sending]);

  // Chatverlauf über Seitenwechsel/Tab hinweg behalten — damit er nach dem Look-Video
  // NICHT „raus" ist, sondern das Gespräch weiterläuft. Key pro Model + Abonnent.
  const chatKey = `lb_wetter_chat_${modelId}_${subId || name || "anon"}`;
  useEffect(() => {
    // 1) Sofort aus dem Gerät (kein Flackern), 2) danach vom SERVER überschreiben —
    // dort liegt der Verlauf am Abonnenten und folgt ihm auf jedes Gerät (Owner 28.07.2026).
    try {
      const raw = localStorage.getItem(chatKey);
      if (raw) { const saved = JSON.parse(raw) as Msg[]; if (Array.isArray(saved) && saved.length > 1) setMessages(saved); }
    } catch { /**/ }
    if (!subId) return;
    fetch(`/api/model-chat?curatorId=${encodeURIComponent(modelId)}&visitorId=${encodeURIComponent(subId)}`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        const server = (Array.isArray(d?.messages) ? d.messages : []) as Msg[];
        if (server.length > 1) setMessages(server);
      })
      .catch(() => { /* dann eben nur das Gerät */ });
    // nur beim Mount wiederherstellen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try { localStorage.setItem(chatKey, JSON.stringify(messages.slice(-40))); } catch { /**/ }
  }, [messages, chatKey]);

  // KURATIERTE Videos für den „zeig dich in etwas Heißem"-Moment ([[SHOW_LINGERIE]]):
  // Public = gratis Teaser (direkt abspielbar), Private = 🔒 (Poster only, → Abo).
  // Gesteuert über den Public/Private-Toggle in „My Gallery".
  const [videos, setVideos] = useState<{ id: string; locked: boolean; posterUrl: string; videoUrl: string }[]>([]);
  const [playing, setPlaying] = useState("");   // videoUrl im Vollbild-Player
  useEffect(() => {
    let ok = true;
    fetch(`/api/try-this-look?modelVideos=${encodeURIComponent(modelId)}&lingerie=1`)
      .then(r => r.json())
      .then(d => { if (ok && Array.isArray(d.videos)) setVideos(d.videos); })
      .catch(() => {});
    return () => { ok = false; };
  }, [modelId]);

  // Gesperrtes Video → Abo abschließen (Premium-Checkout mit der bekannten E-Mail; zurück hierher).
  const openLocked = () => {
    const ret = subId ? `${window.location.pathname}?s=${encodeURIComponent(subId)}` : window.location.pathname;
    if (email) void startPremiumCheckout(email, ret).catch(() => {});
  };

  // `preset` = ein angetippter Antwort-Knopf; sonst das Getippte.
  const send = async (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text || sending) return;
    // 18+ NUR für den CHAT: die Bilder zeigen nicht mehr als ein Strandfoto — der Chat
    // dagegen ist erwachsen (flirtend). Abfrage vor der ERSTEN Nachricht, einmal pro Gerät;
    // nach der Bestätigung wird die Nachricht automatisch abgeschickt (onDone).
    if (!ageVerified()) { setNeedAge(true); return; }
    // TAGESLIMIT ERREICHT (10 Gratis-Nachrichten): er darf schreiben, aber statt der KI antwortet
    // Bella persönlich, dass die Credits verbraucht sind → Freischalt-Button. Kein API-Aufruf.
    if (chatBlocked) {
      setMessages(m => [...m, { role: "user" as const, content: text }, { role: "assistant" as const, content: creditsMsg }]);
      setInput("");
      setChatUnlock(true);
      return;
    }
    bumpChat();   // eine der 10 Gratis-Nachrichten des Tages verbraucht
    // Chat-Sitzung EINMAL zählen (nicht als Admin) → Wetter-Insights.
    try {
      const ck = `lb_wetter_chatted_${modelId}`;
      if (!sessionStorage.getItem(ck) && !localStorage.getItem("luxurybandit-try-look-admin-pin")) {
        sessionStorage.setItem(ck, "1");
        fetch("/api/wetter-stats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modelId, kind: "chat" }) }).catch(() => {});
      }
    } catch { /**/ }
    // Hinweise (role "notice") gehören NICHT in den Verlauf fürs Modell — sonst
    // kommentiert die Persona den Warnhinweis, statt normal weiterzuschreiben.
    const next = [...messages.filter(m => m.role !== "notice"), { role: "user" as const, content: text }];
    setMessages(m => [...m, { role: "user" as const, content: text }]); setInput(""); setSending(true);
    // WIEDERKEHRENDE KI-ERINNERUNG: Wer viel und über Tage hinweg schreibt, soll regelmäßig
    // daran erinnert werden, dass hier ein Programm antwortet — nicht eine echte Frau. Der
    // Zähler läuft über ALLE Tage (localStorage), nicht nur die aktuelle Sitzung.
    try {
      const wk = `lb_wetter_aiwarn_${modelId}_${subId || name || "anon"}`;
      const total = (Number(localStorage.getItem(wk)) || 0) + 1;
      localStorage.setItem(wk, String(total));
      if (total % 15 === 0) setMessages(m => [...m, { role: "notice" as const, content: t.aiRemind(modelName) }]);
    } catch { /**/ }
    try {
      const res = await fetch("/api/model-chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ curatorId: activeId, visitorId: subId || (name || "sub").toLowerCase(), userName: name, messages: next, lang: L, dayContext }),
      });
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json") || !res.body) {
        const d = await res.json().catch(() => ({}));
        setMessages(m => [...m, { role: "assistant", content: String(d.reply || "…") }]);
      } else {
        const reader = res.body.getReader(); const dec = new TextDecoder(); let acc = "", started = false;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += dec.decode(value, { stream: true });
          if (!started) { started = true; setMessages(m => [...m, { role: "assistant", content: acc }]); }
          else setMessages(m => { const c = m.slice(); c[c.length - 1] = { role: "assistant", content: acc }; return c; });
        }
      }
    } catch { setMessages(m => [...m, { role: "assistant", content: "…" }]); }
    finally {
      setSending(false);
      // DIE SHOW: nach der zweiten Antwort stellt sie sich zur Wahl — zwei Bilder, zwei
      // Knöpfe (Owner 28.07.2026: „lass es eine Show werden, Aria gegen Bella").
      if (rival && !duelAsked && next.filter(m => m.role === "user").length >= 2) {
        setDuelAsked(true);
        const q = (({
          de: `Mal ehrlich — wer gefällt dir besser? ${rival.name} oder ich? 😏`,
          en: `Be honest — who do you like more? ${rival.name} or me? 😏`,
          ro: `Sincer — cine îți place mai mult? ${rival.name} sau eu? 😏`,
          es: `Sé sincero — ¿quién te gusta más? ¿${rival.name} o yo? 😏`,
          fr: `Sois honnête — qui te plaît le plus ? ${rival.name} ou moi ? 😏`,
          pt: `Sê sincero — de quem gostas mais? ${rival.name} ou eu? 😏`,
          pl: `Szczerze — kto Ci się bardziej podoba? ${rival.name} czy ja? 😏`,
          it: `Sii sincero — chi ti piace di più? ${rival.name} o io? 😏`,
        } as Record<string, string>)[L]) ?? `Be honest — who do you like more? ${rival.name} or me? 😏`;
        window.setTimeout(() => setMessages(m => [...m, {
          role: "assistant" as const,
          content: `${q}\n[[DUEL]]\n[[CHIPS: ${activeName} 💛 | ${rival.name}]]`,
        }]), 900);
      }
    }
  };

  // Er hat die andere gewählt → SIE übernimmt den Chat. Kein Bruch, sondern der Gewinn:
  // der Besucher bekommt, wen er will, und bleibt bei uns.
  const switchToRival = () => {
    if (!rival?.id) return;
    setActiveId(rival.id);
    setActiveName(rival.name);
    setActivePhoto(rival.img);
    const hello = (({
      de: `Hehe, gute Wahl 😏 Hi, ich bin ${rival.name}. Ab hier schreibe ich dir — erzähl mir was von dir 💛`,
      en: `Hehe, good choice 😏 Hi, I'm ${rival.name}. I'll take it from here — tell me something about you 💛`,
      ro: `Hehe, bună alegere 😏 Salut, eu sunt ${rival.name}. De aici preiau eu — spune-mi ceva despre tine 💛`,
      es: `Jeje, buena elección 😏 Hola, soy ${rival.name}. Sigo yo — cuéntame algo de ti 💛`,
      fr: `Héhé, bon choix 😏 Salut, moi c'est ${rival.name}. Je prends la suite — parle-moi de toi 💛`,
      pt: `Hehe, boa escolha 😏 Olá, sou a ${rival.name}. A partir daqui sou eu — conta-me algo sobre ti 💛`,
      pl: `Hehe, dobry wybór 😏 Cześć, jestem ${rival.name}. Teraz ja przejmuję — opowiedz mi coś o sobie 💛`,
      it: `Ehi, ottima scelta 😏 Ciao, sono ${rival.name}. Da qui continuo io — raccontami qualcosa di te 💛`,
    } as Record<string, string>)[L]) ?? `Hehe, good choice 😏 Hi, I'm ${rival.name}. Tell me something about you 💛`;
    setMessages(m => [...m, { role: "assistant" as const, content: hello }]);
  };

  // "2026-07-22" → "22.07.2026" (+ optional Uhrzeit) fürs Datum unter dem Video.
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  const dateLabel = dm ? `${dm[3]}.${dm[2]}.${dm[1]}${time ? ` · ${time}` : ""}` : "";

  return (
    <div className="mx-auto max-w-md">
      {/* VIDEO zuerst — klebt direkt am Header (Muster), Video full, Sound oben links,
          Vergrößern oben rechts. KEIN Text im Bild (Overlay leer) → alle Texte kommen darunter. */}
      {look && (locked ? (
        /* Gesperrt: Video SIEHT normal aus (klares Poster + Play). Erst beim Klick kommt
           „Credits verbraucht" + Freischalten — kein Blur, kein Dauer-Schloss. */
        <div className="relative select-none" onClick={() => setShowLock(true)}>
          {look.posterUrl
            ? <img src={look.posterUrl} alt="" className="max-h-[70vh] w-full object-cover" />
            : <div className="aspect-[3/4] w-full bg-black/60" />}
          {!showLock ? (
            <span className="pointer-events-none absolute inset-0 grid place-items-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-black/45 backdrop-blur-sm">
                <Play className="h-7 w-7 text-white" fill="currentColor" />
              </span>
            </span>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 px-6 text-center">
              <Lock className="h-7 w-7 text-white" />
              <p className="text-[19px] font-black leading-tight text-white">{lk.spent}</p>
              <p className="max-w-xs text-[13px] font-semibold text-white/85">{lk.sub}</p>
              <button type="button" onClick={e => { e.stopPropagation(); void unlock(); }} disabled={unlocking}
                className="lb-gold mt-1 flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[14px] font-black disabled:opacity-60">
                {unlocking ? <Loader2 className="h-4 w-4 animate-spin" /> : lk.cta}
              </button>
            </div>
          )}
        </div>
      ) : (
        <BellaPostsCarousel name={modelName}
          posts={[{ id: "day", kind: look.kind, title: "", caption: "", mediaUrl: look.mediaUrl, posterUrl: look.posterUrl }]} />
      ))}

      <div className="px-4">
      {/* ALLE Texte UNTER dem Video: Datum · TITEL = der Gruß (Vorgabe, {Name} personalisiert) ·
          Wetter · Beitragstext. KEIN separater Auto-Gruß mehr → „Guten Morgen" steht nur EINMAL. */}
      <div className="pt-4">
        {dateLabel && <p className="mb-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#f6cf51]">📅 {dateLabel}</p>}
        {title.trim()
          ? <p className="text-[24px] font-black leading-tight text-white">{personalizeName(title, name)}</p>
          : name.trim()
            ? <p className="text-[24px] font-black leading-tight text-white">{t.greetPre} <span className="text-[#f6cf51]">{name}!</span></p>
            : <p className="text-[24px] font-black leading-tight text-white">{t.greetPre.replace(/[,،]\s*$/, "")}!</p>}
        {city.trim() && (
          <p className="mt-1 text-[14px] font-semibold text-white/70">
            {/* Abends sagen wir dazu, dass es das Wetter für MORGEN ist — sonst wirkt die
                Vorhersage falsch (Owner 28.07.2026). */}
            {weather
              ? `${tomorrow ? `${TOMORROW_LBL[L] ?? TOMORROW_LBL.en}: ` : ""}${forecastLine(L, weather.place, weather.word, weather.e, weather.min, weather.max, weather.rainy)}`
              : t.wxLoading(city)}
          </p>
        )}
        {caption.trim() && <p className="mt-2.5 whitespace-pre-wrap text-[15px] font-semibold leading-relaxed text-white/70">{caption}</p>}
      </div>


      {/* Chat mit dem Model */}
      <div className="lb-theme relative mb-8 mt-6 overflow-hidden rounded-2xl border border-black/10 bg-white">
        <CornerOrnaments />
        <div className="relative flex items-center justify-center gap-2 border-b border-black/10 px-9 py-3">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="flex items-center gap-2">
            {/* IHR BILD im Chat-Kopf — fehlte, und nach dem Wechsel sah man gar nicht, mit
                wem man schreibt (Owner 28.07.2026). */}
            {(activePhoto || look?.posterUrl || look?.mediaUrl) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activePhoto || look?.posterUrl || look?.mediaUrl || ""} alt=""
                className="h-8 w-8 shrink-0 rounded-full object-cover object-top ring-1 ring-[#f6cf51]/50" />
            )}
            <p className="text-[13px] font-black text-white">{activeName} <span className="font-bold text-emerald-600">{t.online}</span></p>
          </span>
        </div>
        <div ref={scrollRef} className="relative max-h-[46vh] space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((m, i) => {
            // KI-Erinnerung: bewusst KEINE Chat-Blase — sie soll erkennbar von der Plattform
            // kommen und nicht von „ihr", sonst wirkt der Hinweis wie Teil des Rollenspiels.
            if (m.role === "notice") return (
              <div key={i} className="my-1 rounded-xl border border-[#f6cf51]/30 bg-[#f6cf51]/10 px-3 py-2 text-center text-[11px] font-bold leading-snug text-[#f6cf51]">
                ⚠️ {m.content}
              </div>
            );
            const offers = m.role === "assistant" && m.content.includes(LINGERIE_TAG);
            // Der Knopf-Tag der KI gehoert nicht in die Blase — er wird unten zu Knoepfen.
            const duel = /\[\[DUEL\]\]/.test(m.content);
            const text = (offers ? m.content.replace(LINGERIE_TAG, "") : m.content)
              .replace(CHIPS_TAG_RE, "").replace(/\[\[DUEL\]\]/g, "").trim();
            const seeLbl = (({ ro: "Vezi-mă 🔥", de: "Sieh mich 🔥", en: "See me 🔥", es: "Verme 🔥", fr: "Vois-moi 🔥", pt: "Vê-me 🔥", pl: "Zobacz 🔥", it: "Guardami 🔥" } as Record<string, string>)[L]) ?? "See me 🔥";
            const unlockLbl = (({ ro: "Abonează-te", de: "Abo", en: "Unlock", es: "Desbloquear", fr: "Débloquer", pt: "Desbloquear", pl: "Odblokuj", it: "Sblocca" } as Record<string, string>)[L]) ?? "Unlock";
            return (
              <div key={i} className="space-y-2">
                <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[82%] whitespace-pre-wrap px-3.5 py-2.5 text-sm font-medium ${m.role === "user"
                    ? "lb-onmedia rounded-2xl rounded-tr-sm bg-[#1a160f] text-white"
                    : "rounded-2xl rounded-tl-sm bg-white/10 text-white/90"}`}>{text}</div>
                </div>
                {/* DIE SHOW: zwei Bilder nebeneinander — sie und die Rivalin. */}
                {duel && rival && (
                  <div className="flex gap-2">
                    {[{ n: activeName, img: look?.posterUrl || look?.mediaUrl || "", me: true }, { n: rival.name, img: rival.img, me: false }].map(card => (
                      <button key={card.n} type="button" onClick={() => { if (!card.me) switchToRival(); }}
                        className="relative flex-1 overflow-hidden rounded-xl border border-[#f6cf51]/40 active:scale-95 transition">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={card.img} alt="" className="aspect-[3/4] w-full object-cover object-top" />
                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-6 text-center text-[12px] font-black text-white">{card.n}</span>
                      </button>
                    ))}
                  </div>
                )}
                {/* „Willst du mich in diesen Looks sehen?" — Public = gratis (direkt abspielbar),
                    Private = 🔒 (→ Abo). Kuratiert über den Public/Private-Toggle in My Gallery. */}
                {offers && videos.length > 0 && (
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {videos.map(v => (
                      <button key={v.id} type="button" onClick={() => v.locked ? openLocked() : setPlaying(v.videoUrl)}
                        className="group relative w-24 shrink-0 overflow-hidden rounded-xl border border-[#f6cf51]/40 bg-black/5 active:scale-95 transition">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={v.posterUrl} alt="" className={`aspect-[3/4] w-full object-cover ${v.locked ? "scale-105 blur-[7px]" : ""}`} />
                        {v.locked ? (
                          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/35 text-white">
                            <Lock className="h-5 w-5" />
                            <span className="text-[9px] font-black uppercase tracking-wide">{unlockLbl}</span>
                          </span>
                        ) : (
                          <>
                            <span className="pointer-events-none absolute inset-0 grid place-items-center text-white/90"><Play className="h-6 w-6 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]" fill="currentColor" /></span>
                            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-1.5 pb-1.5 pt-4 text-[10px] font-black leading-tight text-white">{seeLbl}</span>
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-tl-sm bg-white/10 px-4 py-3">
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50" />
                </span>
              </div>
            </div>
          )}
        </div>
        {/* ANTWORT-KNÖPFE: drei Vorschläge zur letzten Nachricht — tippen muss nur, wer will
            (Owner 28.07.2026). Kommen von der KI ([[CHIPS: …]]), sonst allgemeine. */}
        {!chatBlocked && !sending && messages.length > 0 && messages[messages.length - 1].role === "assistant" && (() => {
          const mm = messages[messages.length - 1].content.match(CHIPS_TAG_RE);
          // IMMER KNÖPFE (Owner 29.07.2026): geflirtet wird durch Klicken, nie durch Tippen.
          const chips = mm ? mm[1].split("|").map(x => x.trim()).filter(Boolean).slice(0, 3)
            : deriveChips(messages[messages.length - 1].content, L);
          if (!chips.length) return null;
          return (
            <div className="flex flex-wrap gap-1.5 border-t border-black/10 px-3 pb-1 pt-2">
              {chips.map(c => (
                <button key={c} type="button" onClick={() => { if (rival && c.startsWith(rival.name)) { switchToRival(); return; } void send(c); }}
                  className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-[12px] font-bold text-black active:scale-95 transition hover:border-black/40">
                  {c}
                </button>
              ))}
            </div>
          );
        })()}
        {/* Eingabe bleibt IMMER frei — auch gesperrt darf er schreiben. Beim Senden antwortet
            dann Bella persönlich („Credits verbraucht") und der Freischalt-Button erscheint. */}
        <div className="relative flex items-end gap-1.5 border-t border-black/10 px-3 py-3">
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
            rows={1} placeholder={t.placeholder(activeName)}
            className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl border border-black/15 bg-white px-4 py-3 text-sm font-medium text-black outline-none focus:border-black placeholder:text-black/40" />
          <button type="button" onClick={() => void send()} disabled={sending || !input.trim()}
            className="lb-gold grid h-11 w-11 shrink-0 place-items-center rounded-full disabled:opacity-40 active:scale-90 transition">
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
        {chatBlocked && chatUnlock && (
          <div className="flex flex-col items-center gap-1.5 px-4 pb-3 pt-1 text-center">
            <button type="button" onClick={() => void unlock()} disabled={unlocking}
              className="lb-gold flex h-12 w-full items-center justify-center gap-2 rounded-full text-[14px] font-black disabled:opacity-60">
              {unlocking ? <Loader2 className="h-4 w-4 animate-spin" /> : lk.cta}
            </button>
          </div>
        )}
        <p className="px-9 pb-4 pt-1 text-center text-[11px] font-bold text-white/80">{t.aiNote(modelName)}</p>
      </div>

      {/* Erst die eigenen Angaben, dann die Werbung: wer gerade seine Stadt einträgt, ist
          aufmerksam — genau davor gehört der Kaufknopf, nicht dahinter. */}
      {profileAsk && <div className="mx-auto max-w-md px-4">{profileAsk}</div>}

      {/* ABONNIEREN — die Seite hatte keinen einzigen Kaufknopf: der Freischalt-Knopf tauchte
          erst auf, wenn die Sperre griff. Wer vorher kaufen WOLLTE, konnte es gar nicht. */}
      {!paid && (() => {
        const S: Record<string, { h: string; p: string; cta: string; ctaCode: string }> = {
          ro: { h: "Toate modelele, toate temele", p: "Orice model, orice ținută, orice temă: 10 videoclipuri pe lună — chatul rămâne gratuit.", cta: "Deblochează cea mai fierbinte experiență AI — 24,50 €/lună", ctaCode: "Deblochează cea mai fierbinte experiență AI — 24,50 €/lună" },
          de: { h: "Alle Models, alle Themen", p: "Jedes Model, jeder Look, jedes Thema: 10 Videos im Monat — Chatten bleibt gratis.", cta: "Die heißeste KI-Erfahrung freischalten — 24,50 €/Monat", ctaCode: "Die heißeste KI-Erfahrung freischalten — 24,50 €/Monat" },
          en: { h: "Every model, every topic", p: "Every model, every look, every topic: 10 videos a month — chatting stays free.", cta: "Unlock the hottest AI experience ever — €24.50/month", ctaCode: "Unlock the hottest AI experience ever — €24.50/month" },
          es: { h: "Todas las modelos, todos los temas", p: "Cualquier modelo, cualquier look, cualquier tema: 10 vídeos al mes — chatear sigue gratis.", cta: "Desbloquea la experiencia IA más ardiente — 24,50 €/mes", ctaCode: "Desbloquea la experiencia IA más ardiente — 24,50 €/mes" },
          fr: { h: "Toutes les modèles, tous les thèmes", p: "N'importe quelle modèle, n'importe quelle tenue, n'importe quel thème : 10 vidéos par mois — le chat reste gratuit.", cta: "Débloque l'expérience IA la plus chaude — 24,50 €/mois", ctaCode: "Débloque l'expérience IA la plus chaude — 24,50 €/mois" },
          pt: { h: "Todas as modelos, todos os temas", p: "Qualquer modelo, qualquer look, qualquer tema: 10 vídeos por mês — conversar continua grátis.", cta: "Desbloqueia a experiência de IA mais quente — 24,50 €/mês", ctaCode: "Desbloqueia a experiência de IA mais quente — 24,50 €/mês" },
          pl: { h: "Wszystkie modelki, wszystkie tematy", p: "Dowolna modelka, dowolna stylizacja, dowolny temat: 10 filmów miesięcznie — czat pozostaje darmowy.", cta: "Odblokuj najgorętsze doświadczenie AI — 24,50 €/miesiąc", ctaCode: "Odblokuj najgorętsze doświadczenie AI — 24,50 €/miesiąc" },
          it: { h: "Tutte le modelle, tutti i temi", p: "Qualsiasi modella, qualsiasi look, qualsiasi tema: 10 video al mese — chattare resta gratis.", cta: "Sblocca l'esperienza AI più calda — 24,50 €/mese", ctaCode: "Sblocca l'esperienza AI più calda — 24,50 €/mese" },
        };
        const x = S[L] ?? S.en;
        return (
          <div id="abo" className="mx-auto mt-6 max-w-md px-4 scroll-mt-24">
            <div className="rounded-2xl border border-[#f6cf51]/40 bg-[#f6cf51]/[0.08] p-4 text-center">
              <p className="text-[16px] font-black text-white">{x.h}</p>
              <p className="mt-1 text-[13px] font-bold leading-snug text-white/85">{x.p}</p>
              <button type="button" onClick={() => void unlock()} disabled={unlocking}
                className="lb-gold lb-buy mt-3 flex w-full items-center justify-center gap-2 rounded-full font-black active:scale-95 transition disabled:opacity-60">
                {unlocking ? <Loader2 className="h-4 w-4 animate-spin" /> : x.ctaCode}
              </button>
              {/* Der laufende Preis — bewusst dünn und klein, er soll den Knopf nicht erschlagen. */}
              <p className="mt-2 text-[10px] font-medium leading-snug text-white/55">{renewNote(L)}</p>
            </div>
            {/* WhatsApp-Kanal: Einbahnstraße, niemand sieht fremde Nummern (Owner 28.07.2026). */}
            <a href={WHATSAPP_CHANNEL} target="_blank" rel="noopener noreferrer"
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[#25D366]/40 bg-[#25D366]/10 text-[13px] font-black text-[#25D366] active:scale-95 transition">
              💬 {followWhatsApp(L)}
            </a>
          </div>
        );
      })()}

      {/* Cross-Sell-SLIDER: bezahlte Models → je ihr Profil (Chat + Try-ons). Kompakt
          gehalten (96px statt 128px), damit die Mitmach-Themen darunter Platz behalten. */}
      {crossModels.length > 0 && (() => {
        const heading = (({ ro: "Descoperă mai multe modele 🔥", de: "Entdecke mehr Models 🔥", en: "Discover more models 🔥", es: "Descubre más modelos 🔥", fr: "Découvre plus de modèles 🔥", pt: "Descobre mais modelos 🔥", pl: "Odkryj więcej modelek 🔥", it: "Scopri più modelle 🔥" } as Record<string, string>)[L]) ?? "Discover more models 🔥";
        return (
          <div className="mb-6 mt-3">
            <p className="mb-2 px-0.5 text-[12px] font-black text-white/85">{heading}</p>
            <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {crossModels.map(m => (
                <a key={m.href} href={m.href} className="group w-[96px] shrink-0 snap-start">
                  <div className="relative overflow-hidden rounded-xl border border-[#f6cf51]/25">
                    <img src={m.img} alt={m.name} className="aspect-[3/4] w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2 pb-1.5 pt-5">
                      <p className="truncate text-[12px] font-black text-white">{m.name}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Darunter: ALLE Mitmach-Themen. Nichts davon ist gratis — es läuft übers Abo
          (5 Videos im Monat für 24 €). Deshalb steht auf jeder Karte „Im Abo" statt eines
          Gratis-Versprechens. Übersetzt, weil die Abonnenten EU-weit sitzen. */}
      {(() => {
        const P: Record<string, { h: string; sub: string; inAbo: string; items: [string, string, string][] }> = {
          ro: { h: "Descoperă ceva nou \u2728", sub: "10 videoclipuri pe lună, 24,50 €. Chatul e gratuit.", inAbo: "Continuă", items: [
            ["\u2728", "Probează o ținută", "Alege un look și un model — îl vezi într-un video."],
            ["\uD83D\uDC8B", "Sărută orice model", "Sau vedeta ta preferată — încarcă o poză."],
            ["\u2B50", "Idolul tău cu tine", "Voi doi împreună, într-un singur video."],
            ["\uD83D\uDD25", "Lenjerie", "O vezi în lenjerie — orice look, în video."],
          ] },
          de: { h: "Entdecke Neues \u2728", sub: "10 Videos im Monat, 24,50 €. Chatten ist gratis.", inAbo: "Weiter", items: [
            ["\u2728", "Outfit anprobieren", "Look und Model wählen — du siehst es im Video."],
            ["\uD83D\uDC8B", "Küsse jedes Model", "Oder deinen Superstar — lade einfach ein Foto hoch."],
            ["\u2B50", "Dein Idol mit dir", "Ihr beide zusammen, in einem Video."],
            ["\uD83D\uDD25", "Lingerie", "Sieh sie in Lingerie — jeder Look, im Video."],
          ] },
          en: { h: "Discover something new \u2728", sub: "10 videos a month, €24.50. Chatting is free.", inAbo: "Continue", items: [
            ["\u2728", "Try on a look", "Pick a look and a model — see it in a video."],
            ["\uD83D\uDC8B", "Kiss any model", "Or your favourite superstar — just upload a photo."],
            ["\u2B50", "Your idol with you", "The two of you together, in one video."],
            ["\uD83D\uDD25", "Lingerie", "See her in lingerie — any look, in a video."],
          ] },
          es: { h: "Descubre algo nuevo \u2728", sub: "10 vídeos al mes, 24,50 €. Chatear es gratis.", inAbo: "Continuar", items: [
            ["\u2728", "Prueba un look", "Elige un look y una modelo — lo ves en un vídeo."],
            ["\uD83D\uDC8B", "Besa a cualquier modelo", "O a tu estrella favorita — sube una foto."],
            ["\u2B50", "Tu ídolo contigo", "Los dos juntos, en un vídeo."],
            ["\uD83D\uDD25", "Lencería", "Verla en lencería — cualquier look, en vídeo."],
          ] },
          fr: { h: "Découvre du nouveau \u2728", sub: "10 vidéos par mois, 24,50 €. Le chat est gratuit.", inAbo: "Continuer", items: [
            ["\u2728", "Essaie une tenue", "Choisis un look et un modèle — tu le vois en vidéo."],
            ["\uD83D\uDC8B", "Embrasse un modèle", "Ou ta star préférée — envoie une photo."],
            ["\u2B50", "Ton idole avec toi", "Vous deux ensemble, en vidéo."],
            ["\uD83D\uDD25", "Lingerie", "La voir en lingerie — n'importe quel look, en vidéo."],
          ] },
          pt: { h: "Descobre algo novo \u2728", sub: "10 vídeos por mês, 24,50 €. Conversar é grátis.", inAbo: "Continuar", items: [
            ["\u2728", "Experimenta um visual", "Escolhe um visual e uma modelo — vês num vídeo."],
            ["\uD83D\uDC8B", "Beija qualquer modelo", "Ou a tua estrela favorita — envia uma foto."],
            ["\u2B50", "O teu ídolo contigo", "Vocês os dois juntos, num vídeo."],
            ["\uD83D\uDD25", "Lingerie", "Vê-la em lingerie — qualquer visual, em vídeo."],
          ] },
          pl: { h: "Odkryj coś nowego \u2728", sub: "10 filmów miesięcznie, 24,50 €. Czat jest darmowy.", inAbo: "Dalej", items: [
            ["\u2728", "Przymierz stylizację", "Wybierz look i modelkę — zobaczysz to na wideo."],
            ["\uD83D\uDC8B", "Pocałuj modelkę", "Albo swoją gwiazdę — wystarczy zdjęcie."],
            ["\u2B50", "Twój idol z Tobą", "Wy dwoje razem, na jednym wideo."],
            ["\uD83D\uDD25", "Bielizna", "Zobacz ją w bieliźnie — każdy look, na wideo."],
          ] },
          it: { h: "Scopri qualcosa di nuovo \u2728", sub: "10 video al mese, 24,50 €. Chattare è gratis.", inAbo: "Continua", items: [
            ["\u2728", "Prova un look", "Scegli un look e una modella — lo vedi in un video."],
            ["\uD83D\uDC8B", "Bacia una modella", "O la tua star preferita — carica una foto."],
            ["\u2B50", "Il tuo idolo con te", "Voi due insieme, in un video."],
            ["\uD83D\uDD25", "Lingerie", "Vederla in lingerie — qualsiasi look, in video."],
          ] },
        };
        const p = P[L] ?? P.en;
        const HREFS = [TRYON_FUNNEL, "/themes/kiss", "/your-idol", TRYON_FUNNEL];
        const MEDIA: [string, boolean][] = [[tryonTeaser, false], [kissTeaser, kissTeaserIsVideo], [idolTeaser, true], [lingerieTeaser || tryonLingerie, !!lingerieTeaser]];
        return (
          <div className="mb-8 mt-3">
            <p className="px-0.5 text-[13px] font-black text-white">{p.h}</p>
            <p className="mb-2 px-0.5 text-[11px] font-bold text-[#f6cf51]">{p.sub}</p>
            <div className="grid grid-cols-2 gap-2.5">
              {p.items.map(([emoji, title, sub], i) => {
                const [media, isVideo] = MEDIA[i];
                const alt2 = i === 0 ? tryonLingerie : "";
                return (
                  <a key={title} href={HREFS[i]} className="flex flex-col overflow-hidden rounded-2xl border border-[#f6cf51]/25 bg-[#f6cf51]/[0.06] active:scale-[0.98] transition">
                    <span className="relative block aspect-[3/4] w-full overflow-hidden bg-white/[0.04]">
                      {media
                        ? (isVideo
                          // eslint-disable-next-line jsx-a11y/media-has-caption
                          ? <video src={media} muted loop playsInline autoPlay preload="metadata" className="h-full w-full object-cover object-top" />
                          : (<>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              {alt2 && <img src={alt2} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />}
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={media} alt="" className={"absolute inset-0 h-full w-full object-cover object-top " + (alt2 ? "lb-swap-top" : "")} />
                            </>))
                        : <span className="grid h-full w-full place-items-center text-[26px]">{emoji}</span>}
                      <span className="absolute left-1.5 top-1.5 text-[16px] drop-shadow">{emoji}</span>
                    </span>
                    <span className="flex flex-1 flex-col p-3">
                      <span className="text-[14px] font-black leading-tight text-white">{title}</span>
                      <span className="mt-1 flex-1 text-[11.5px] font-bold leading-snug text-white/60">{sub}</span>
                      <span className="lb-gold mt-2.5 w-fit rounded-full px-3 py-1 text-[11px] font-black">{p.inAbo} →</span>
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* 18+-Abfrage NUR fürs Chatten (Bilder bleiben frei). Nach „Ja" wird die Nachricht,
          die die Abfrage ausgelöst hat, automatisch abgeschickt. */}
      {needAge && <AgeGate lang={L} onDone={() => { setNeedAge(false); void send(); }} />}

      {/* Selbst-Abmeldung — der Abonnent stoppt die tägliche Nachricht direkt hier. */}
      {subId && (
        <div className="mb-8 text-center">
          {unsubbed ? (
            <p className="text-[12px] font-black text-white/50">
              {(({ de: "✓ Du bist abgemeldet — keine Nachrichten mehr.", en: "✓ You're unsubscribed — no more messages.", es: "✓ Te diste de baja — no más mensajes.", fr: "✓ Tu es désabonné — plus de messages.", pt: "✓ Cancelaste a subscrição — sem mais mensagens.", pl: "✓ Wypisano Cię — koniec wiadomości.", it: "✓ Sei disiscritto — niente più messaggi." } as Record<string, string>)[L]) ?? "✓ Te-ai dezabonat — gata cu mesajele."}
            </p>
          ) : (
            <button type="button" onClick={() => void unsubscribe()} disabled={unsubbing}
              className="text-[12px] font-bold text-white/40 underline underline-offset-2 disabled:opacity-50">
              {(({ de: "Abmelden", en: "Unsubscribe", es: "Darse de baja", fr: "Se désabonner", pt: "Cancelar", pl: "Wypisz się", it: "Disiscriviti" } as Record<string, string>)[L]) ?? "Dezabonează-te"}
            </button>
          )}
        </div>
      )}
      </div>

      {/* Vollbild-Player für ein freies (Public) Video — kein Funnel, spielt direkt. */}
      {playing && (
        <div className="fixed inset-0 z-[130] flex flex-col bg-black/95" onClick={() => setPlaying("")}>
          <div className="flex justify-end p-3">
            <button type="button" onClick={() => setPlaying("")}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white active:scale-95"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex flex-1 items-center justify-center p-3" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video src={playing} controls autoPlay playsInline className="max-h-full max-w-full rounded-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
