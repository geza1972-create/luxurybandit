"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, ImageUp, Check, Lock, Shirt, Download, Sparkles } from "lucide-react";
import { openerFor } from "@/lib/chat-opener";
import { renewNote, fillPrices, INCLUDED_VIDEOS_PER_MONTH } from "@/lib/pricing";
import { tryonPrompt } from "@/lib/tryon-prompt";
import { chatLookVideoPrompt, pickHolidayScene } from "@/lib/chat-look-video";
import { CHIPS_TAG_RE, deriveChips } from "@/lib/chat-deal";

type Model = { id: string; name: string; photoUrl: string };
type Look = { id: string; name?: string; imageUrl?: string };
type Msg = { role: "user" | "assistant" | "notice"; content: string };

/**
 * THEMA „Chat with an AI girl" — der Chat ist die Hauptsache, das Anziehen die Zugabe.
 *
 * Ablauf: Frau wählen (Katalog-Coverflow oder eigenes Foto hochladen) → täglich schreiben →
 * sie in neue Looks stecken. Die ersten Nachrichten sind frei, danach das Themen-Abo.
 * Preis, enthaltene Videos und Zusatzpreis stehen in lib/pricing.ts — hier NIE eine Zahl.
 *
 * EHRLICH BLEIBEN (Hausregel): alle 15 Nachrichten kommt ein Hinweis in den Verlauf, dass
 * hier eine KI schreibt. Sie flirtet, behauptet aber nie Gefühle oder Sehnsucht.
 *
 * ACHTUNG, bekannte Lücke: Der Look-Zähler läuft im GERÄT (localStorage), nicht auf dem
 * Server. Wer den Browser wechselt, fängt bei 0 an. Ein echter Zähler pro Kunde fehlt noch.
 */

// Chat ist GRATIS (Owner 27.07.2026) — bezahlt wird nur das Generieren.
// Das Tageslimit war lange eine reine Skript-Bremse (200/Tag). Seit 28.07.2026 ist es
// dieselbe Zahl wie auf der Wetter-Seite: 10 pro Tag. Danach sieht der Vielschreiber das
// Angebot, statt unbegrenzt auf unsere Kosten zu schreiben.
// 10 Gratis-Nachrichten pro Tag (Owner 28.07.2026, vorher 200). Gleiche Zahl wie auf der
// Wetter-Seite: genug fuer eine echte Unterhaltung, und der Vielschreiber sieht das Angebot.
const DAILY_MSGS = 10;
const DAY_KEY = "lb_chat_day";
// Zahl kommt aus der Preistabelle, nirgends abgeschrieben (Owner 29.07.2026: „überall das
// geändert wird aus der Preistabelle"). Vorher stand sie hier UND in acht Sprachtabellen —
// und auf Italienisch blieb sie bei 25 stehen.
const LOOKS_INCLUDED = INCLUDED_VIDEOS_PER_MONTH;
const USED_LOOKS_KEY = "lb_chat_looks";
const PAID_KEY = "lb_chat_abo";
const REMIND_EVERY = 15;       // KI-Hinweis im Verlauf

// Oberflächentexte in denselben 8 Sprachen wie der Rest — sonst steht auf einer Seite
// Deutsch neben Englisch (gefunden 28.07.2026).
const UI: Record<string, {
  s1: string; s1p: string; own: string; ownHint: string; nameHer: string;
  s2: string; s3: string; incl: string; left: string; put: string; putHer: string; more: string;
  free: string; today: string; anyLang: string; keep: string; keepP: string; unlock: string;
  dayFull: string; dayFullP: string; sayHi: string; pickFirst: string; write: string; save: string; show: string; dressing: string; filming: string; soundOn: string; soundOff: string;
}> = {
  en: { s1: "1 · Choose her", s1p: "Swipe our models — or upload a photo of the woman you have in mind.", own: "Your own", ownHint: "Upload one photo — she becomes your AI girl.", nameHer: "Give her a name",
        s2: "2 · Talk to her", s3: "3 · Dress her", incl: "{videos} videos & looks a month are included — across all topics.", left: "left this month (all topics together) — every extra one is {extra}.",
        put: "Put this on {name}", putHer: "Put this on her", more: "One more look — {extra}", free: "Chatting is free", today: "messages left today", anyLang: "Any language — she answers in yours.",
        keep: "Keep talking to", keepP: "Unlock the pictures and videos.", unlock: "Unlock", dayFull: "That's a lot of talking for one day 💛", dayFullP: "is back tomorrow — your subscription keeps running.",
        sayHi: "Say hi to", pickFirst: "Pick her first, then start talking.", write: "Write to", save: "Save the photo", show: "Show it to her in the chat — she reacts to what she is wearing.", dressing: "Dressing her …", filming: "Filming her turn … (1–3 min)", soundOn: "Sound on", soundOff: "Sound off" },
  de: { s1: "1 · Wähle sie", s1p: "Wisch durch unsere Models — oder lade ein Foto der Frau hoch, die du im Kopf hast.", own: "Deine eigene", ownHint: "Ein Foto hochladen — sie wird deine KI-Frau.", nameHer: "Gib ihr einen Namen",
        s2: "2 · Schreib mit ihr", s3: "3 · Zieh sie an", incl: "{videos} Videos & Looks im Monat sind enthalten — über alle Themen.", left: "übrig diesen Monat (alle Themen zusammen) — jedes weitere {extra}.",
        put: "Zieh es {name} an", putHer: "Zieh es ihr an", more: "Noch ein Look — {extra}", free: "Chatten ist gratis", today: "Nachrichten heute übrig", anyLang: "Jede Sprache — sie antwortet in deiner.",
        keep: "Weiter schreiben mit", keepP: "Schalte Bilder und Videos frei.", unlock: "Freischalten", dayFull: "Das war viel für einen Tag 💛", dayFullP: "ist morgen wieder da — dein Abo läuft weiter.",
        sayHi: "Sag Hallo zu", pickFirst: "Wähle sie zuerst, dann kann es losgehen.", write: "Schreib an", save: "Foto speichern", show: "Zeig es ihr im Chat — sie reagiert darauf, was sie trägt.", dressing: "Sie zieht sich um …", filming: "Ihr Dreh-Video entsteht … (1–3 Min.)", soundOn: "Ton an", soundOff: "Ton aus" },
  ro: { s1: "1 · Alege-o", s1p: "Glisează prin modelele noastre — sau încarcă poza femeii la care te gândești.", own: "A ta", ownHint: "Încarcă o poză — devine fata ta AI.", nameHer: "Dă-i un nume",
        s2: "2 · Scrie-i", s3: "3 · Îmbrac-o", incl: "{videos} videoclipuri și ținute pe lună sunt incluse — în toate temele.", left: "rămase luna aceasta (toate temele) — fiecare în plus {extra}.",
        put: "Îmbrac-o pe {name}", putHer: "Îmbrac-o", more: "Încă o ținută — {extra}", free: "Chatul este gratuit", today: "mesaje rămase azi", anyLang: "Orice limbă — îți răspunde în limba ta.",
        keep: "Continuă conversația cu", keepP: "Deblochează pozele și videoclipurile.", unlock: "Deblochează", dayFull: "A fost mult pentru o zi 💛", dayFullP: "revine mâine — abonamentul rămâne activ.",
        sayHi: "Salut-o pe", pickFirst: "Alege-o mai întâi, apoi începe.", write: "Scrie-i lui", save: "Salvează poza", show: "Arată-i în chat — reacționează la ce poartă.", dressing: "Se îmbracă …", filming: "Se filmează … (1–3 min)", soundOn: "Sunet", soundOff: "Fără sunet" },
  es: { s1: "1 · Elígela", s1p: "Desliza por nuestras modelos — o sube una foto de la mujer que tienes en mente.", own: "La tuya", ownHint: "Sube una foto — será tu chica IA.", nameHer: "Ponle un nombre",
        s2: "2 · Habla con ella", s3: "3 · Vístela", incl: "{videos} vídeos y looks al mes están incluidos — en todos los temas.", left: "restantes este mes (todos los temas) — cada extra {extra}.",
        put: "Pónselo a {name}", putHer: "Pónselo a ella", more: "Otro look — {extra}", free: "Chatear es gratis", today: "mensajes restantes hoy", anyLang: "Cualquier idioma — responde en el tuyo.",
        keep: "Sigue hablando con", keepP: "Desbloquea las fotos y los vídeos.", unlock: "Desbloquear", dayFull: "Ha sido mucho por hoy 💛", dayFullP: "vuelve mañana — tu suscripción sigue activa.",
        sayHi: "Saluda a", pickFirst: "Elígela primero y empieza.", write: "Escribe a", save: "Guardar la foto", show: "Enséñaselo en el chat — reacciona a lo que lleva puesto.", dressing: "Se está vistiendo …", filming: "Grabando su vídeo … (1–3 min)", soundOn: "Sonido", soundOff: "Silencio" },
  fr: { s1: "1 · Choisis-la", s1p: "Fais défiler nos modèles — ou charge la photo de la femme que tu imagines.", own: "La tienne", ownHint: "Charge une photo — elle devient ta fille IA.", nameHer: "Donne-lui un prénom",
        s2: "2 · Parle avec elle", s3: "3 · Habille-la", incl: "{videos} vidéos et looks par mois sont inclus — sur tous les thèmes.", left: "restants ce mois-ci (tous thèmes) — chaque extra {extra}.",
        put: "Habille {name} avec ça", putHer: "Habille-la avec ça", more: "Encore un look — {extra}", free: "Le chat est gratuit", today: "messages restants aujourd'hui", anyLang: "Toutes les langues — elle répond dans la tienne.",
        keep: "Continue à parler avec", keepP: "Débloque les photos et les vidéos.", unlock: "Débloquer", dayFull: "Ça fait beaucoup pour aujourd'hui 💛", dayFullP: "revient demain — ton abonnement continue.",
        sayHi: "Dis bonjour à", pickFirst: "Choisis-la d'abord, puis commence.", write: "Écris à", save: "Enregistrer la photo", show: "Montre-lui dans le chat — elle réagit à ce qu'elle porte.", dressing: "Elle s'habille …", filming: "On filme sa vidéo … (1–3 min)", soundOn: "Son", soundOff: "Muet" },
  pt: { s1: "1 · Escolhe-a", s1p: "Desliza pelas nossas modelos — ou carrega a foto da mulher em que pensas.", own: "A tua", ownHint: "Carrega uma foto — passa a ser a tua rapariga IA.", nameHer: "Dá-lhe um nome",
        s2: "2 · Fala com ela", s3: "3 · Veste-a", incl: "{videos} vídeos e looks por mês estão incluídos — em todos os temas.", left: "restantes este mês (todos os temas) — cada extra {extra}.",
        put: "Veste isto à {name}", putHer: "Veste-lho", more: "Mais um look — {extra}", free: "Conversar é grátis", today: "mensagens restantes hoje", anyLang: "Qualquer idioma — responde no teu.",
        keep: "Continua a falar com", keepP: "Desbloqueia as fotos e os vídeos.", unlock: "Desbloquear", dayFull: "Foi muito por hoje 💛", dayFullP: "volta amanhã — a tua subscrição continua.",
        sayHi: "Diz olá a", pickFirst: "Escolhe-a primeiro e começa.", write: "Escreve a", save: "Guardar a foto", show: "Mostra-lhe no chat — ela reage ao que veste.", dressing: "Está a vestir-se …", filming: "A filmar o vídeo … (1–3 min)", soundOn: "Som", soundOff: "Sem som" },
  pl: { s1: "1 · Wybierz ją", s1p: "Przesuwaj nasze modelki — albo wgraj zdjęcie kobiety, o której myślisz.", own: "Twoja własna", ownHint: "Wgraj jedno zdjęcie — zostanie Twoją dziewczyną AI.", nameHer: "Nadaj jej imię",
        s2: "2 · Napisz do niej", s3: "3 · Ubierz ją", incl: "{videos} filmów i stylizacji miesięcznie w cenie — we wszystkich tematach.", left: "pozostało w tym miesiącu (wszystkie tematy) — każda kolejna {extra}.",
        put: "Ubierz w to {name}", putHer: "Ubierz ją w to", more: "Jeszcze jedna stylizacja — {extra}", free: "Czat jest darmowy", today: "wiadomości dziś", anyLang: "Dowolny język — odpowie w Twoim.",
        keep: "Pisz dalej z", keepP: "Odblokuj zdjęcia i filmy.", unlock: "Odblokuj", dayFull: "Sporo jak na jeden dzień 💛", dayFullP: "wróci jutro — subskrypcja działa dalej.",
        sayHi: "Przywitaj się z", pickFirst: "Najpierw ją wybierz, potem zacznij.", write: "Napisz do", save: "Zapisz zdjęcie", show: "Pokaż jej to na czacie — zareaguje na to, co ma na sobie.", dressing: "Właśnie się przebiera …", filming: "Nagrywamy jej wideo … (1–3 min)", soundOn: "Dźwięk", soundOff: "Wycisz" },
  it: { s1: "1 · Scegli lei", s1p: "Scorri le nostre modelle — o carica la foto della donna che hai in mente.", own: "La tua", ownHint: "Carica una foto — diventa la tua ragazza IA.", nameHer: "Dalle un nome",
        s2: "2 · Parla con lei", s3: "3 · Vestila", incl: "{videos} video e look al mese sono inclusi — in tutti i temi.", left: "rimasti questo mese (tutti i temi) — ogni extra {extra}.",
        put: "Vestila così: {name}", putHer: "Vestila così", more: "Un altro look — {extra}", free: "Chattare è gratis", today: "messaggi rimasti oggi", anyLang: "Qualsiasi lingua — risponde nella tua.",
        keep: "Continua a scrivere con", keepP: "Sblocca le foto e i video.", unlock: "Sblocca", dayFull: "È stato tanto per oggi 💛", dayFullP: "torna domani — l'abbonamento resta attivo.",
        sayHi: "Saluta", pickFirst: "Prima scegli lei, poi inizia.", write: "Scrivi a", save: "Salva la foto", show: "Mostraglielo in chat — reagisce a ciò che indossa.", dressing: "Si sta vestendo …", filming: "Stiamo girando il video … (1–3 min)", soundOn: "Audio", soundOff: "Muto" },
};

const CHAT_LANGS: [string, string][] = [
  ["en", "EN"], ["de", "DE"], ["ro", "RO"], ["es", "ES"],
  ["fr", "FR"], ["it", "IT"], ["pt", "PT"], ["pl", "PL"],
];

const AI_NOTICE = "Just so you know: I'm an AI character — everything here is generated. Enjoy it for what it is 💛";

const fileToDataUrl = (f: File) => new Promise<string>((res, rej) => {
  const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f);
});

export default function ChatFunnel({ code = "", lang = "en" }: { code?: string; lang?: string }) {
  const u = UI[lang] ?? UI.en;
  // Die KI haengt drei Antwortvorschlaege an ([[CHIPS: a | b | c]]). Wir schneiden sie aus
  // dem Text und zeigen sie als Knoepfe — getippt wird nur, wer will (Owner 28.07.2026).
  const stripChips = (t: string) => t.replace(CHIPS_TAG_RE, "").replace(/\[\[SHOW_LINGERIE\]\]/gi, "").replace(/\[\[SHOW_FRIENDS\]\]/gi, "").replace(/\[\[PIC:[^\]]*\]\]/gi, "").trim();
  const chipsOf = (t: string) => {
    const m = t.match(CHIPS_TAG_RE);
    return m ? m[1].split("|").map(x => x.trim()).filter(Boolean).slice(0, 3) : [];
  };
  const [models, setModels] = useState<Model[]>([]);
  const [pickIdx, setPickIdx] = useState(0);
  const [useCustom, setUseCustom] = useState(false);
  const [customPhoto, setCustomPhoto] = useState("");
  const [customName, setCustomName] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [looks, setLooks] = useState<Look[]>([]);
  const [lookIdx, setLookIdx] = useState(0);
  const [dressed, setDressed] = useState("");
  const [dressBusy, setDressBusy] = useState(false);
  const [vidUrl, setVidUrl] = useState("");        // Dreh-Video zum angezogenen Foto
  const [vidBusy, setVidBusy] = useState(false);
  const [musicOn, setMusicOn] = useState(false);   // Musik erst auf Tippen (Autoplay ist blockiert)
  const musicRef = useRef<HTMLAudioElement>(null);
  const vidRef = useRef<HTMLVideoElement>(null);
  const [usedLooks, setUsedLooks] = useState(0);
  const [paid, setPaid] = useState(false);
  const [payBusy, setPayBusy] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState("");
  const [chatLang, setChatLang] = useState("en");   // Startsprache ihrer Antworten
  const [today, setToday] = useState(0);          // heute schon geschrieben
  const modelFileRef = useRef<HTMLInputElement>(null);
  const swipeRef = useRef(0);
  const swipedRef = useRef(false);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/try-this-look?models=1", { cache: "no-store" }).then(r => r.json()).catch(() => ({})),
      fetch("/api/try-this-look", { cache: "no-store" }).then(r => r.json()).catch(() => ({})),
      // Freigabeliste: nur SAUBERE Kleidungsfotos in den Anzieh-Slider (keine Bilder mit
      // fremder Frau darin). Fehlt die Liste, zeigen wir alles statt nichts.
      fetch("/api/wardrobe-garments", { cache: "no-store" }).then(r => r.json()).catch(() => ({ ids: null })),
    ]).then(([m, st, wg]) => {
      let all: Model[] = (Array.isArray(m.models) ? m.models : []).filter((x: Model) => !!x.photoUrl);
      const bella = all.findIndex(x => x.id === "curator-1783683672619-td4cy" || /^bella\b/i.test(x.name));
      if (bella > 0) all = [all[bella], ...all.slice(0, bella), ...all.slice(bella + 1)];
      setModels(all);
      const ok: Set<string> | null = Array.isArray(wg?.ids) ? new Set(wg.ids.map(String)) : null;
      // NUR der Kleiderschrank (`wardrobe`): der restliche Katalog sind Partner-Produkte
      // — Schuhe, Mäntel, Designerkleider —, die nie zum Anziehen freigegeben wurden.
      const ls: Look[] = (Array.isArray(st?.looks) ? st.looks : [])
        .filter((l: { id: string; imageUrl?: string; wardrobe?: boolean }) => l.wardrobe === true && !!l.imageUrl && (!ok || ok.has(l.id)))
        .map((l: Look) => ({ id: l.id, name: l.name, imageUrl: l.imageUrl }));
      setLooks(ls);
    });
    try {
      const p = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? "";
      setPin(p); setIsStaff(!!p && !localStorage.getItem("lb_preview_model"));
      setPaid(localStorage.getItem(PAID_KEY) === "1");
      // Startsprache = die gewählte Seitensprache (Cookie), sonst Browser, sonst EN.
      const m2 = document.cookie.match(/(?:^|; )lb_lang=([^;]*)/);
      const fromCookie = m2 ? decodeURIComponent(m2[1]).slice(0, 2) : "";
      const nav = (navigator.language || "en").slice(0, 2);
      const want = CHAT_LANGS.some(([c]) => c === fromCookie) ? fromCookie
        : CHAT_LANGS.some(([c]) => c === nav) ? nav : "en";
      setChatLang(want);
      const raw = JSON.parse(localStorage.getItem(DAY_KEY) || "{}");
      const stamp = new Date().toISOString().slice(0, 10);
      setToday(raw?.day === stamp ? Number(raw.n) || 0 : 0);
      setUsedLooks(Number(localStorage.getItem(USED_LOOKS_KEY) || "0") || 0);
    } catch { /**/ }
  }, []);

  const picked = useCustom ? null : models[pickIdx];
  const herName = useCustom ? customName.trim() : (picked?.name?.split(" ")[0] ?? "");
  const herPhoto = useCustom ? customPhoto : (picked?.photoUrl ?? "");
  const chosen = !!herPhoto;
  const wall = false;   // Chat kostet nichts
  const dayFull = !isStaff && today >= DAILY_MSGS;
  const looksLeft = Math.max(0, LOOKS_INCLUDED - usedLooks);

  // KURATIERTE VIDEOS für den „ich zeige mich"-Moment ([[SHOW_LINGERIE]]). Ohne sie
  // verspricht sie ein Bild und liefert nichts (Owner 28.07.2026). Gleiche Quelle wie im
  // Wetter-Chat; Public = frei abspielbar, Private = 🔒 → Abo.
  const [teaseVideos, setTeaseVideos] = useState<{ id: string; locked: boolean; posterUrl: string; videoUrl: string }[]>([]);
  useEffect(() => {
    const cid = useCustom ? "" : (picked?.id ?? "");
    if (!cid) { setTeaseVideos([]); return; }
    let ok = true;
    fetch(`/api/try-this-look?modelVideos=${encodeURIComponent(cid)}&lingerie=1`)
      .then(r => r.json())
      .then(d => { if (ok && Array.isArray(d.videos)) setTeaseVideos(d.videos); })
      .catch(() => {});
    return () => { ok = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked?.id, useCustom]);
  // BILDER VON „FREUNDINNEN" — Nachschub für den Gratis-Chat, alles längst vorhanden
  // (keine neue Generierung). Zweite Runde zeigt andere Bilder (Owner 28.07.2026).
  const [friendPics, setFriendPics] = useState<{ id: string; url: string }[]>([]);
  const friendPageRef = useRef(0);
  const loadFriends = () => {
    const cid = useCustom ? "" : (picked?.id ?? "");
    fetch(`/api/tease-pool?exclude=${encodeURIComponent(cid)}&n=12&page=${friendPageRef.current++}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d?.images) && d.images.length) setFriendPics(d.images); })
      .catch(() => {});
  };
  // STRIPTEASE AUF BEFEHL (Owner 28.07.2026): Er tippt, der Radar läuft, ein neues Bild
  // erscheint. Genau dieses Erlebnis macht süchtig — und es kostet uns nichts, weil die
  // Bilder längst existieren (Pool). Erst wenn er SELBST etwas erzeugen will, wird bezahlt.
  const [showBusy, setShowBusy] = useState(false);
  const showNext = () => {
    if (showBusy) return;
    setShowBusy(true);
    const pic = friendPics[0];
    if (!pic) { loadFriends(); }
    window.setTimeout(() => {
      setFriendPics(list => list.slice(1));
      const line = (({
        de: "Bitte sehr 😌", en: "There you go 😌", ro: "Poftim 😌", es: "Aquí tienes 😌",
        fr: "Tiens 😌", pt: "Aqui tens 😌", pl: "Proszę 😌", it: "Ecco 😌",
      } as Record<string, string>)[lang]) ?? "There you go 😌";
      setMsgs(m => [...m, { role: "assistant", content: `${line}\n[[PIC:${pic?.url ?? ""}]]` }]);
      setShowBusy(false);
      if (friendPics.length <= 2) loadFriends();
      scrollFeed();
    }, 2600);
  };
  const [playing, setPlaying] = useState("");

  // Geräte-Kennung: dieselbe wie in „My Gallery" — damit ihr Gedächtnis am Besucher hängt
  // und nicht an einem Tab (Owner 28.07.2026).
  const [deviceId, setDeviceId] = useState("");
  useEffect(() => {
    try {
      let v = localStorage.getItem("lb_visitor") ?? "";
      if (!v) { v = crypto.randomUUID?.() ?? String(Date.now()); localStorage.setItem("lb_visitor", v); }
      setDeviceId(v);
    } catch { /**/ }
  }, []);

  // IHR GEDÄCHTNIS: den Verlauf mit DIESER Frau vom Server holen, sobald beides bekannt ist.
  useEffect(() => {
    const cid = useCustom ? "" : (picked?.id ?? "");
    if (!cid || !deviceId) return;
    fetch(`/api/model-chat?curatorId=${encodeURIComponent(cid)}&visitorId=${encodeURIComponent(deviceId)}`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        const server = (Array.isArray(d?.messages) ? d.messages : []) as Msg[];
        if (server.length > 1) { setMsgs(server); scrollFeed(); }
      })
      .catch(() => { /* dann fängt sie eben neu an */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked?.id, useCustom, deviceId]);

  // SIE fängt an — mit einer Frage und vier Knöpfen (lib/chat-opener). Vor einem leeren
  // Eingabefeld traut sich kaum jemand, als Erster zu schreiben. Wechselt er die Sprache,
  // bevor er geantwortet hat, wandert die Frage mit.
  useEffect(() => {
    if (!chosen) return;
    setMsgs(m => (m.length === 0 || (m.length === 1 && m[0].role === "assistant"))
      ? [{ role: "assistant", content: openerFor(chatLang).text }]
      : m);
  }, [chosen, chatLang]);

  const onModelFile = async (f?: File | null) => { if (f) try { setCustomPhoto(await fileToDataUrl(f)); setUseCustom(true); } catch { /**/ } };

  const scrollFeed = () => setTimeout(() => feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" }), 80);

  // `preset` = ein angetippter Antwort-Knopf aus ihrem Einstieg; sonst das Getippte.
  const send = async (preset?: string) => {
    const text = (preset ?? draft).trim();
    if (!text || sending || wall || dayFull) return;
    // Tagesstand mitzählen (pro Gerät und Kalendertag).
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      const n = today + 1;
      localStorage.setItem(DAY_KEY, JSON.stringify({ day: stamp, n }));
      setToday(n);
    } catch { /**/ }
    const next: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(next); if (!preset) setDraft(""); setSending(true); scrollFeed();
    try {
      const payload = {
        curatorId: useCustom ? "" : (picked?.id ?? ""),
        modelNameHint: useCustom ? (customName.trim() || "she") : "",
        messages: next.filter(m => m.role !== "notice").map(m => ({ role: m.role, content: m.content })),
        visitorId: deviceId,
        lang: chatLang,
      };
      // Die Chat-Route STREAMT reinen Text (text/plain), sie gibt kein JSON zurück —
      // mit r.json() landet man im catch und die Antwort verschwindet (Bug 27.07.2026).
      const res = await fetch("/api/model-chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok || !res.body) { setStatus("She could not answer just now — try again."); setSending(false); return; }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let reply = "";
      setMsgs(m => [...m, { role: "assistant", content: "" }]);   // Platzhalter, füllt sich live
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        reply += dec.decode(value, { stream: true });
        setMsgs(m => {
          const out = [...m];
          for (let i = out.length - 1; i >= 0; i--) {
            if (out[i].role === "assistant") { out[i] = { role: "assistant", content: reply }; break; }
          }
          return out;
        });
        scrollFeed();
      }
      // EIN Bild pro Nachricht — nicht die ganze Reihe, und nie zweimal dasselbe
      // (Owner 28.07.2026). Wir heften das konkrete Bild an DIESE Nachricht und
      // verbrauchen es aus dem Pool.
      if (/\[\[SHOW_FRIENDS\]\]/i.test(reply)) {
        const pic = friendPics[0]?.url ?? "";
        if (pic) {
          setFriendPics(list => list.slice(1));
          setMsgs(m => {
            const out = [...m];
            for (let i = out.length - 1; i >= 0; i--) {
              if (out[i].role === "assistant") {
                out[i] = { role: "assistant", content: out[i].content.replace(/\[\[SHOW_FRIENDS\]\]/gi, `[[PIC:${pic}]]`) };
                break;
              }
            }
            return out;
          });
        }
        if (friendPics.length <= 2) loadFriends();
      }
      // Ehrlichkeits-Hinweis in festem Takt — nicht versteckt, im Verlauf sichtbar.
      setMsgs(m => {
        const count = m.filter(x => x.role === "user").length;
        return count > 0 && count % REMIND_EVERY === 0 ? [...m, { role: "notice", content: AI_NOTICE }] : m;
      });
      scrollFeed();
    } catch { setStatus("Network error."); }
    setSending(false);
  };

  // Abo freischalten (Chat weiter + 5 Looks im Monat).
  const unlock = async (forLook = false) => {
    if (payBusy) return;
    setPayBusy(true); setStatus("");
    const endpoint = forLook && paid ? "/api/chat-look-checkout" : "/api/chat-abo-checkout";
    try {
      const start = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, returnTo: window.location.pathname + window.location.search }),
      }).then(r => r.json());
      if (!start?.url || !start?.sessionId) { setStatus(start?.error || "Checkout could not start."); setPayBusy(false); return; }
      const popup = window.open(start.url, "_blank", "popup,width=480,height=780");
      if (!popup) { window.location.href = start.url; return; }
      for (let i = 0; i < 100; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const s = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(start.sessionId)}`).then(r => r.json()).catch(() => null);
        if (s?.paid) {
          try { popup.close(); } catch { /**/ }
          if (!forLook || !paid) { setPaid(true); try { localStorage.setItem(PAID_KEY, "1"); } catch { /**/ } }
          setPayBusy(false);
          if (forLook) void dressHer(true);
          return;
        }
        if (popup.closed && i > 2) break;
      }
      setPayBusy(false);
    } catch (e) {
      setStatus(e instanceof Error ? `Checkout failed: ${e.message}` : "Checkout could not start.");
      setPayBusy(false);
    }
  };

  // Anziehen: das gewählte Teil auf IHR Foto (unsere Try-on-Pipeline, kein Video).
  const dressHer = async (afterPay = false) => {
    const look = looks[lookIdx];
    if (!herPhoto || !look?.imageUrl || dressBusy) return;
    if (!isStaff && !paid) { void unlock(false); return; }                 // ohne Abo geht gar nichts
    if (!isStaff && paid && looksLeft === 0 && !afterPay) { void unlock(true); return; }  // 6. Look kostet extra
    setDressBusy(true); setStatus(u.dressing); setDressed("");
    try {
      const toFile = async (src: string, name: string) => {
        const blob = await fetch(src).then(r => r.blob());
        return new File([blob], name, { type: blob.type || "image/jpeg" });
      };
      const fd = new FormData();
      fd.append("modelImage", await toFile(herPhoto, "person.jpg"));
      fd.append("image", await toFile(look.imageUrl, "garment.jpg"));
      fd.append("lookId", look.id);
      fd.append("mode", "fashion-model");
      fd.append("aspectRatio", "9:16");
      fd.append("prompt", tryonPrompt({ garment: look.name || "" }));
      const d = await fetch("/api/generate-fashn", {
        method: "POST", body: fd, ...(pin ? { headers: { "x-try-look-admin-pin": pin } } : {}),
      }).then(r => r.json());
      const img = d?.image || d?.imageUrl || "";
      if (!img) { setStatus(d?.error || "That photo didn't work — try another one."); setDressBusy(false); return; }
      setDressed(img); setStatus("");
      setUsedLooks(n => { const v = n + 1; try { localStorage.setItem(USED_LOOKS_KEY, String(v)); } catch { /**/ } return v; });
      // ZWEITER SCHRITT — das Video: sie steht an einem schönen Urlaubsort, sagt „Hello
      // darling, how are you?" und dreht sich einmal ganz herum (Owner 28.07.2026).
      // Dasselbe Muster wie im Surprise-Funnel: EIN Referenzfoto auf beide Slots, der
      // Prompt nennt nur @person — zwei Referenzen lassen Pixverse Gesichter erfinden.
      await makeTurnVideo(img, look.id);
    } catch { setStatus("Network error."); }
    setDressBusy(false);
  };


  // Kopie fuer „My Gallery" — laeuft im Hintergrund; scheitert sie, bleibt das Video im
  // Fenster trotzdem sichtbar.
  const saveToGallery = async (videoUrl: string, lookId: string) => {
    try {
      let device = "";
      try {
        device = localStorage.getItem("lb_visitor") ?? "";
        if (!device) { device = crypto.randomUUID?.() ?? String(Date.now()); localStorage.setItem("lb_visitor", device); }
      } catch { /**/ }
      const email = (() => { try { return JSON.parse(localStorage.getItem("lb_auth") ?? "{}")?.user?.email ?? ""; } catch { return ""; } })();
      await fetch("/api/my-videos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl, lookId, curatorId: useCustom ? "" : (picked?.id ?? ""), lookName: herName ? `${herName}` : "", device, email, source: "chat" }),
      });
    } catch { /**/ }
  };

  // Aus dem angezogenen Foto das Dreh-Video machen (mit Musik im Player darunter).
  const makeTurnVideo = async (dressedImage: string, lookId: string) => {
    setVidUrl(""); setVidBusy(true); setStatus(u.filming);
    try {
      const start = await fetch("/api/generate-tryon-video", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(pin ? { "x-try-look-admin-pin": pin } : {}) },
        body: JSON.stringify({ lookId, person: dressedImage, garment: dressedImage, prompt: chatLookVideoPrompt(pickHolidayScene()) }),
      }).then(r => r.json()).catch(() => null);
      if (!start?.videoId) { setStatus(start?.error || ""); setVidBusy(false); return; }
      for (let i = 0; i < 72; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const p = await fetch(`/api/generate-tryon-video?videoId=${encodeURIComponent(start.videoId)}&curatorId=${encodeURIComponent(start.curatorId || "")}`)
          .then(r => r.json()).catch(() => null);
        if (p?.status === "done" && p.videoUrl) {
          setVidUrl(String(p.videoUrl)); setStatus(""); setVidBusy(false);
          // In SEINE Galerie legen (Geraet + Konto): die Anbieter-Adresse verfaellt nach
          // Stunden — ohne eigene Kopie waere das Video morgen weg (Owner 28.07.2026).
          void saveToGallery(String(p.videoUrl), lookId);
          return;
        }
        if (p?.status === "failed") { setStatus(p.error || ""); setVidBusy(false); return; }
      }
      setStatus("");
    } catch { /* das Foto ist schon da — ohne Video ist der Schritt trotzdem nicht leer */ }
    setVidBusy(false);
  };

  const label = "text-[12px] font-black uppercase tracking-wide text-[#f6cf51]";
  const input = "h-12 w-full rounded-xl border border-white/30 bg-white/[0.08] px-4 text-[15px] font-semibold text-white outline-none placeholder:text-white/60 focus:border-[#f6cf51]";

  return (
    <div className="mt-8">
      {/* 1 — sie aussuchen */}
      <p className={label}>{u.s1}</p>
      <p className="mt-1 text-[13px] font-bold text-white">{u.s1p}</p>
      {models.length === 0 ? (
        <div className="grid h-[46vw] max-h-[240px] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-white/50" /></div>
      ) : (() => {
        const UPLOAD: Model = { id: "__own", name: "Your own", photoUrl: "" };
        const cards = [...models];
        const upIdx = Math.min(2, cards.length);
        cards.splice(upIdx, 0, UPLOAD);
        const toCard = (mi: number) => (mi < upIdx ? mi : mi + 1);
        const toModel = (ci: number) => (ci < upIdx ? ci : ci - 1);
        const active = useCustom ? upIdx : Math.min(toCard(pickIdx), cards.length - 1);
        const front = (i: number) => {
          const m = cards[i];
          if (m.id === "__own") { setUseCustom(true); return; }
          setUseCustom(false);
          setPickIdx(Math.max(0, Math.min(models.length - 1, toModel(i))));
          setMsgs([]);   // andere Frau → neuer Verlauf
        };
        return (
          <div className="relative mx-auto mt-2 h-[72vw] max-h-[300px] select-none overflow-hidden touch-pan-y" style={{ perspective: "1100px" }}
            onPointerDown={e => { swipeRef.current = e.clientX; swipedRef.current = false; }}
            onPointerUp={e => { const dx = e.clientX - swipeRef.current; if (Math.abs(dx) > 30) { swipedRef.current = true; front(Math.min(cards.length - 1, Math.max(0, active + (dx < 0 ? 1 : -1)))); } }}>
            {cards.map((m, i) => {
              const off = i - active;
              if (Math.abs(off) > 2) return null;
              const isActive = off === 0;
              const isUpload = m.id === "__own";
              return (
                <div key={m.id}
                  onClick={() => { if (swipedRef.current) { swipedRef.current = false; return; } if (isUpload) { if (!isActive) { front(i); return; } modelFileRef.current?.click(); return; } if (!isActive) front(i); }}
                  className="absolute left-1/2 top-1/2 w-[54%] max-w-[220px] overflow-hidden rounded-2xl border border-white/15 bg-white/[0.06] shadow-2xl transition-all duration-300 ease-out"
                  style={{ transform: `translate(-50%,-50%) translateX(${off * 56}%) rotateY(${-off * 38}deg) scale(${isActive ? 1 : 0.82})`, zIndex: 20 - Math.abs(off), opacity: Math.abs(off) === 2 ? 0.45 : 1, cursor: "pointer" }}>
                  <div className="relative aspect-[3/4] w-full">
                    {isUpload && !customPhoto ? (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#241c11] px-3 text-center">
                        <ImageUp className="h-9 w-9 text-[#f6cf51]" />
                        <span className="text-[13px] font-black text-[#f6cf51]">{u.own}</span>
                        <span className="text-[11px] font-bold leading-snug text-white/85">{u.ownHint}</span>
                      </div>
                    ) : (<>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={isUpload ? customPhoto : m.photoUrl} alt={m.name} draggable={false} className="h-full w-full object-cover object-top" />
                      {isUpload && isActive && <span className="absolute inset-x-3 bottom-8 rounded-full bg-black/60 py-1 text-center text-[10px] font-black text-white backdrop-blur">Tap to change photo</span>}
                    </>)}
                    {isActive && (!isUpload || !!customPhoto) && <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-[#f6cf51] shadow"><Check className="h-4 w-4 text-black" /></span>}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2 pt-6">
                      <p className="lb-onmedia truncate text-[13px] font-black">{m.name}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
      <input ref={modelFileRef} type="file" accept="image/*" className="hidden" onChange={e => void onModelFile(e.target.files?.[0])} />
      {useCustom && customPhoto && (
        <input value={customName} onChange={e => setCustomName(e.target.value)} maxLength={30}
          placeholder={u.nameHer} className={`mt-3 ${input}`} />
      )}

      {/* 2 — der Chat: die Hauptsache */}
      <p className={`mt-6 ${label}`}>{u.s2}</p>
      <div className="mt-2 overflow-hidden rounded-2xl border border-black/10 bg-white text-black shadow-sm">
        {/* Kopf — wie im bestehenden Chat: Foto, Name, „online now". */}
        <div className="flex items-center gap-3 border-b border-black/10 px-3 py-2.5">
          <div className="relative aspect-[3/4] w-9 shrink-0 overflow-hidden rounded-lg bg-black/5">
            {herPhoto
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={herPhoto} alt="" className="h-full w-full object-cover object-top" />
              : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-black">{herName || "Pick her"}</p>
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-black/50">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> online now
            </p>
          </div>
          {/* Sprache — sie folgt ohnehin dem, was man schreibt; das hier setzt die Sprache,
              in der sie ANFÄNGT. Gleiche Stelle wie im bestehenden Chat. */}
          <select value={chatLang} onChange={e => setChatLang(e.target.value)} aria-label="Language"
            className="h-8 shrink-0 appearance-none rounded-full border border-black/15 bg-white pl-3 pr-6 text-[12px] font-black uppercase tracking-wide text-black outline-none active:scale-95">
            {CHAT_LANGS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
        </div>

        {/* Verlauf */}
        <div ref={feedRef} className="max-h-[300px] min-h-[140px] space-y-2.5 overflow-y-auto overscroll-contain bg-neutral-50 px-3 py-3">
          {msgs.length === 0 ? (
            <p className="py-8 text-center text-[13px] font-bold text-black/50">
              {chosen ? `${u.sayHi} ${herName} 💛` : u.pickFirst}
            </p>
          ) : msgs.map((m, i) =>
            m.role === "notice" ? (
              <p key={i} className="mx-auto my-1 max-w-[85%] rounded-xl bg-black/[0.06] px-3 py-2 text-center text-[11px] font-bold leading-snug text-black/60">{m.content}</p>
            ) : (
              <div key={i} className="space-y-2">
              <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[82%] whitespace-pre-wrap px-3 py-2 text-[13px] font-medium ${m.role === "user"
                  ? "rounded-2xl rounded-tr-sm bg-black text-white"
                  : "rounded-2xl rounded-tl-sm bg-white text-black ring-1 ring-black/10"}`}>{m.role === "assistant" ? stripChips(m.content) : m.content}</div>
              </div>
              {/* SIE ZEIGT SICH: die Nachricht mit dem Tag bekommt die Galerie darunter —
                  sonst verspricht sie ein Bild und es kommt nichts (Owner 28.07.2026). */}
              {m.role === "assistant" && /\[\[PIC:([^\]]+)\]\]/i.test(m.content) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={(m.content.match(/\[\[PIC:([^\]]+)\]\]/i) ?? [])[1] ?? ""} alt=""
                  className="aspect-[3/4] w-40 rounded-xl border border-[#f6cf51]/40 object-cover" />
              )}
              {m.role === "assistant" && /\[\[SHOW_LINGERIE\]\]/i.test(m.content) && teaseVideos.length > 0 && (
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {/* NUR EINS (Owner 28.07.2026) — eine Reihe ist ein Katalog, eines nach
                      dem anderen ist eine Show. */}
                  {teaseVideos.slice(0, 1).map(v => (
                    // IM CHAT SIND ALLE FREI (Owner 28.07.2026) — auch die sonst gesperrten.
                    // Die Videos sind längst erzeugt; sie herzuzeigen kostet uns nichts und
                    // baut die Bindung auf. Bezahlt wird, was ER erzeugen will.
                    <button key={v.id} type="button" onClick={() => setPlaying(v.videoUrl)}
                      className="relative w-40 shrink-0 overflow-hidden rounded-xl border border-[#f6cf51]/40 active:scale-95 transition">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={v.posterUrl} alt="" className="aspect-[3/4] w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              </div>
            )
          )}
          {/* ANTWORT-KNÖPFE — am Anfang ihre Einstiegsfrage, danach die drei Vorschläge, die
              die KI an jede Nachricht hängt. Leute klicken lieber, als zu tippen; getippt
              wird nur, wer mag (Owner 28.07.2026). */}
          {chosen && !sending && !dayFull && (() => {
            const lastAssistant = [...msgs].reverse().find(m => m.role === "assistant")?.content ?? "";
            const noUserYet = msgs.every(m => m.role !== "user");
            // IMMER KNÖPFE (Owner 29.07.2026): geflirtet wird durch Klicken. Vorschläge von
            // ihr gewinnen, sonst aus ihrer Frage abgeleitet, sonst allgemeine — nie leer.
            // (Bis 29.07. verschwanden sie, sobald er einmal selbst getippt hatte.)
            const chips = noUserYet
              ? openerFor(chatLang).chips
              : (chipsOf(lastAssistant).length ? chipsOf(lastAssistant) : deriveChips(lastAssistant, chatLang));
            if (!chips.length) return null;
            return (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {chips.map(c => (
                  <button key={c} type="button" onClick={() => void send(c)}
                    className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-[12px] font-bold text-black active:scale-95 transition hover:border-black/40">
                    {c}
                  </button>
                ))}
              </div>
            );
          })()}
          {showBusy && herPhoto && (
            <div className="relative mx-auto aspect-[3/4] w-40 overflow-hidden rounded-xl border border-[#f6cf51]/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={herPhoto} alt="" className="h-full w-full scale-105 object-cover object-top blur-[6px] brightness-75" />
              <span className="lb-scanline absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#f6cf51] to-transparent shadow-[0_0_12px_#f6cf51]" />
            </div>
          )}
          {playing && (
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4" onClick={() => setPlaying("")}>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video src={playing} autoPlay loop playsInline controls className="max-h-[85vh] w-auto rounded-2xl" />
            </div>
          )}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-tl-sm bg-white px-3.5 py-2.5 ring-1 ring-black/10">
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/40 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/40 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/40" />
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Eingabe / Wand */}
        <div className="border-t border-black/10 px-3 py-2.5">
          {dayFull ? (
            <div className="rounded-xl bg-black/[0.05] p-3 text-center">
              <p className="text-[13px] font-black text-black">{u.dayFull}</p>
              <p className="mt-0.5 text-[12px] font-bold leading-snug text-black/60">
                {herName} {u.dayFullP}
              </p>
            </div>
          ) : wall ? (
            <div className="text-center">
              <p className="text-[13px] font-black text-black">{u.keep} {herName}</p>
              <p className="mt-0.5 text-[12px] font-bold leading-snug text-black/60">24,50 € a month — every day, plus your 5 videos a month across all topics.</p>
              <button type="button" onClick={() => void unlock(false)} disabled={payBusy}
                className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-black text-[13px] font-black text-white active:scale-95 transition disabled:opacity-40">
                {payBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Unlock the hottest AI experience ever — €24.50/month
              </button>
              <p className="mt-2 text-center text-[10px] font-medium leading-snug text-black/50">{renewNote(lang)}</p>
            </div>
          ) : (
            <>
              <div className="flex items-end gap-2">
                <textarea value={draft} onChange={e => setDraft(e.target.value)} disabled={!chosen || sending} rows={1}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
                  placeholder={chosen ? `${u.write} ${herName} …` : u.pickFirst}
                  className="max-h-24 min-h-[42px] flex-1 resize-none rounded-2xl border border-black/15 bg-white px-3.5 py-2.5 text-[13px] font-medium text-black outline-none placeholder:text-black/40 focus:border-black" />
                <button type="button" onClick={() => void send()} disabled={!chosen || !draft.trim() || sending}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black text-white active:scale-90 transition disabled:opacity-30">
                  <Send className="h-4 w-4" />
                </button>
              </div>
              {chosen && (
                <p className="mt-1.5 text-[11px] font-bold text-black/50">
                  {`${u.free} · ${Math.max(0, DAILY_MSGS - today)} ${u.today}`}
                  {" · "}{u.anyLang}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* 3 — anziehen */}
      <p className={`mt-6 ${label}`}>{u.s3}</p>
      <p className="mt-1 text-[13px] font-bold text-white">
        {/* fillPrices setzt Preis und Videozahl aus lib/pricing.ts ein — in den Sprachtabellen
            stehen nur Platzhalter. */}
        {fillPrices(paid || isStaff ? `${looksLeft}/${LOOKS_INCLUDED} ${u.left}` : u.incl, chatLang)}
      </p>
      {looks.length === 0 ? (
        <div className="grid h-24 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-white/50" /></div>
      ) : (
        <div className="-mx-4 mt-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {looks.map((l, i) => {
            const on = i === lookIdx;
            return (
              <button key={l.id} type="button" onClick={() => setLookIdx(i)}
                className={`relative w-[104px] shrink-0 snap-start overflow-hidden rounded-xl border-2 bg-white transition ${on ? "border-[#f6cf51]" : "border-white/20"}`}>
                <span className="block aspect-[3/4] w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.imageUrl} alt="" draggable={false} className="h-full w-full object-cover" />
                </span>
                {on && <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[#f6cf51]"><Check className="h-3.5 w-3.5 text-black" /></span>}
              </button>
            );
          })}
        </div>
      )}
      {/* WÄHREND DES ANZIEHENS: ihr Foto unscharf mit Scanner-Balken darüber — ein Spinner
          im Knopf sah aus, als sei die Seite hängengeblieben (Owner 28.07.2026). */}
      {(dressBusy || vidBusy) && (dressed || herPhoto) && (
        <div className="relative mx-auto mt-3 aspect-[3/4] w-full max-w-[240px] overflow-hidden rounded-2xl border border-[#f6cf51]/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dressed || herPhoto} alt="" className="h-full w-full scale-105 object-cover object-top blur-[6px] brightness-75" />
          <span className="lb-scanline absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#f6cf51] to-transparent shadow-[0_0_12px_#f6cf51]" />
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8 text-center text-[12px] font-black text-white">
            {status || "…"}
          </span>
        </div>
      )}
      {/* AUF BEFEHL ZEIGEN — gratis, unbegrenzt, mit Radar. Das ist der Suchtfaktor
          (Owner 28.07.2026); bezahlt wird erst, was ER selbst erzeugen will. */}
      {chosen && !dayFull && (
        <button type="button" onClick={showNext} disabled={showBusy}
          className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[#f6cf51]/40 bg-[#f6cf51]/10 text-[13px] font-black text-[#f6cf51] active:scale-95 transition disabled:opacity-60">
          {showBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "🔥"}
          {showBusy
            ? ((({ de: "Sie zieht sich um …", en: "She's changing …", ro: "Se schimbă …", es: "Se está cambiando …", fr: "Elle se change …", pt: "Está a trocar …", pl: "Przebiera się …", it: "Si sta cambiando …" } as Record<string, string>)[lang]) ?? "She's changing …")
            : ((({ de: "Zeig mir noch eins", en: "Show me another one", ro: "Mai arată-mi una", es: "Enséñame otra", fr: "Montre-m'en une autre", pt: "Mostra-me outra", pl: "Pokaż mi jeszcze jedno", it: "Mostrami un'altra" } as Record<string, string>)[lang]) ?? "Show me another one")}
        </button>
      )}
      {/* Ohne Abo führt dieser Knopf zur KASSE — dann muss er das auch draufschreiben.
          Vorher hieß er „Zieh es ihr an" und sprang wortlos zu Stripe (Owner 28.07.2026). */}
      <button type="button" onClick={() => void dressHer()} disabled={!chosen || dressBusy || vidBusy}
        className="lb-gold lb-buy mt-2 flex w-full items-center justify-center gap-2 rounded-full font-black active:scale-95 transition disabled:opacity-50">
        {(dressBusy || vidBusy) ? <Loader2 className="h-4 w-4 animate-spin" /> : (isStaff || paid) ? <Shirt className="h-4 w-4 shrink-0" /> : <Lock className="h-4 w-4 shrink-0" />}
        {dressBusy ? u.dressing : vidBusy ? u.filming
          : (isStaff || paid)
            ? (looksLeft > 0 ? (herName ? u.put.replace("{name}", herName) : u.putHer) : fillPrices(u.more, chatLang))
            : "Unlock the hottest AI experience ever — €24.50/month"}
      </button>
      {!isStaff && !paid && (
        <p className="mt-2 text-center text-[10px] font-medium leading-snug text-white/55">{renewNote(lang)}</p>
      )}
      {status && !dressBusy && <p className="mt-2 text-center text-[13px] font-bold text-white/80">{status}</p>}

      {dressed && (
        <div className="mx-auto mt-4 w-fit">
          <div className="relative overflow-hidden rounded-3xl border border-white/10">
            {vidUrl ? (<>
              {/* DAS DREH-VIDEO: sie sagt „Hello darling, how are you?" und dreht sich einmal
                  ganz herum. Musik läuft erst auf Tippen — Ton von allein ist gesperrt. */}
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video ref={vidRef} src={vidUrl} poster={dressed} autoPlay loop playsInline muted
                className="max-h-[60vh] w-auto object-cover" />
              <button type="button"
                onClick={() => {
                  // TON: das Video traegt IHRE STIMME („Hello darling …") — die kommt zuerst,
                  // die Musik liegt leise darunter. `muted` wird am Element selbst gesetzt;
                  // als JSX-Attribut allein greift die Umschaltung nicht zuverlaessig.
                  const v = vidRef.current, a = musicRef.current;
                  const next = !musicOn;
                  setMusicOn(next);
                  try {
                    if (v) { v.muted = !next; v.volume = 1; if (next) { v.currentTime = 0; void v.play(); } }
                    if (a) { a.volume = 0.22; if (next) void a.play(); else a.pause(); }
                  } catch { /**/ }
                }}
                className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-2 text-[12px] font-black text-white backdrop-blur active:scale-90 transition">
                {musicOn ? <>🔊 {u.soundOff}</> : <>🔇 {u.soundOn}</>}
              </button>
              <audio ref={musicRef} src="/fassounds-escape-your-love-upbeat-fashion-pop-dance-412230.mp3" loop preload="none" />
            </>) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={dressed} alt="" className="max-h-[60vh] w-auto object-cover" />
            )}
          </div>
          <a href={vidUrl || dressed} download={vidUrl ? "her-new-video.mp4" : "her-new-look.jpg"} target="_blank" rel="noreferrer"
            className="lb-gold mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full text-[14px] font-black active:scale-95 transition">
            <Download className="h-4 w-4" /> {u.save}
          </a>
          <p className="mx-auto mt-2 max-w-[280px] text-center text-[12px] font-bold leading-snug text-white/70">
            <Sparkles className="mr-1 inline h-3.5 w-3.5" /> {u.show}
          </p>
        </div>
      )}
    </div>
  );
}
