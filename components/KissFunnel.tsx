"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";
import { Loader2, ImageUp, Lock, RefreshCw, Check, Sparkles, X, Trash2, ChevronLeft, Send, Maximize2 } from "lucide-react";
import { renewNote, INCLUDED_VIDEOS_PER_MONTH, ONCE_CENTS, LINGERIE_CENTS, fillPrices } from "@/lib/pricing";
import { logFunnelEvent } from "@/lib/track-funnel";
import { trackMetaPixel } from "@/lib/meta-pixel";
import { HOLIDAY_SCENES, holidayPrompt, type HolidayScene } from "@/lib/holiday-scenes";
import { tryonPrompt } from "@/lib/tryon-prompt";
import EinladungKarte, { KARTE_TEXTE } from "@/components/EinladungKarte";
import TonKnopf from "@/components/TonKnopf";
import ImageCropper from "@/components/ImageCropper";
import EinladungAnsicht from "@/components/EinladungAnsicht";
import Reaktionen from "@/components/Reaktionen";
import TeilenKnopf from "@/components/TeilenKnopf";
import { TEILEN_TEXT } from "@/components/BeispielGalerie";
import { musikFuer } from "@/lib/musik";
import { kissText } from "@/lib/kiss-i18n";
import { KUSS_SZENEN, kussSzene, kussSzeneVideoPrompt, KUSS_LINGERIE, kussLingerie } from "@/lib/kuss-szenen";
import { landAusZeitzone } from "@/lib/land-erkennen";
import { KISS_LOOK_ID, WEDDING_KLEIDER, weddingPrompt, WEDDING_PROMPT } from "@/lib/wedding-prompt";

import LightSwitch from "@/components/LightSwitch";

// „Kiss any Model" — Funnel mit FAKE-FIRST-Monetarisierung (Owner-Entscheidung):
// Der Besucher wählt Model + eigenes Foto → wir spielen eine RENDER-SHOW (kostet nichts,
// KEIN API-Call) → „Dein Video ist fertig" läuft VERPIXELT (in Wahrheit das Model-Foto
// hinter starkem Blur) → „🔓 Unlock — Abo" (Stripe-Popup + Status-Poll) → ERST NACH der
// Zahlung (24-€-Abo, 5 Videos/Monat) startet die ECHTE Pixverse-Generierung (gleiche Pipeline wie Try-On: zwei
// Referenzen an @-Tokens, Raw-Prompt, 360p = Pixverse-Minimum) → Video klar anzeigen.
// Staff (Admin-PIN) überspringt alles: echte Generierung sofort, unverpixelt.
// Welche Models im Grid stehen, waehlt der Admin im Models-Werkzeug SEINES Themas
// (/api/theme-media?theme=kiss|idol|wedding) — die Hochzeit hat andere Frauen als der Kuss.

type Model = { id: string; name: string; photoUrl: string };

// Platzhalter im Upload-Feld: ein MÄNNERGESICHT (Peter), abgedunkelt hinterlegt. Ohne das
// laden Nutzer erfahrungsgemäß noch ein Model hoch statt sich selbst. Als statische Datei
// im Repo, damit die URL nie abläuft (signierte Storage-Links tun das).
const PLACEHOLDER_MAN = "/kiss-placeholder.jpg";

// DER PROMPT KOMMT VOM OWNER, wörtlich (30.07.2026). Vorher stand hier meine eigene
// Fassung mit @person/@Bild2 — die hatte er nie freigegeben.
//
// BINDUNG (Route /api/generate-tryon-video, pixverseStartReference):
//   @1 → das Foto der Frau (im Trichter `person`)
//   @2 → sein hochgeladenes Foto (im Trichter `garment`)
// Beide Token treffen die Muster der Route, es wird also nichts umgeschrieben.
//
// NICHTS DARAN ÄNDERN, ohne ihn zu fragen — auch keine „Verbesserung" der Wortwahl.
export const KISS_PROMPT =
  "@1 and @2 stand close together in a warm, softly lit evening setting with gentle glowing lights behind them. They look at each other and smile, lean in slowly, and share a brief, tender kiss. Then they step back a little and smile at each other, happy. Keep @1 and @2 faces and appearance exactly the same throughout. Fixed camera, no zoom, no camera movement. Fluid natural motion, photorealistic, high-end look. No text or logos.";

// „Your Idol with you": die beiden zusammen auf einer schönen Party — kein Kuss, sondern
// ein gemeinsamer Moment. Wieder NEUTRALE Wortwahl (Pixverse flaggt Intim-/Haut-Wörter),
// feste Kamera, Gesichter bleiben exakt gleich.
/**
 * HOCHZEIT — der Blick in die Kamera, KEIN KUSS (Owner 31.07.2026: „ich will aber nicht, dass
 * sie sich küssen im Video. Sie müssen nur mit dem Gesicht in die Kamera schauen und sich
 * umarmen." Begruendung im Konzept „Einladung statt Kuss", §2).
 *
 * Drei Gruende, und der dritte wiegt am schwersten:
 *
 * 1. Eine Einladung SCHAUT DEN GAST AN. Ein Kuss ist ein Moment zwischen zweien, bei dem der
 *    Betrachter Zuschauer bleibt. Auf jedem Hochzeitsfoto, das verschickt wird, blickt das
 *    Paar in die Kamera — das ist kein Zufall.
 * 2. Der Kuss war die technisch schwaechste Stelle: genau dort, wo sich die Gesichter treffen,
 *    verzieht die KI sie am ehesten — halb verdeckt, im Profil, in Bewegung. Frontal und ruhig
 *    stehen beide Gesichter still, und die Gesichter SIND das Produkt (seines und ihres).
 * 3. Das Video geht an fuenfzig bis hundertfuenfzig Leute, Grosseltern und Kollegen inklusive.
 *
 * Wieder NEUTRALE Wortwahl, und die Kleidung steht ausdruecklich drin: Ohne „white wedding
 * dress" und „white suit" zieht Pixverse den Alltag aus den Referenzfotos durch, und aus der
 * Hochzeit wird ein Paar im T-Shirt. Der Bildausschnitt steht wie ueberall VORNE.
 */
/**
 * DIE FÜNF BRAUTKLEIDER (Owner 31.07.2026: „hier machst du eine andere Garderobe. Es werden
 * Hochzeitskleider sein. Du kannst hier welche generieren, 5 mit Models.").
 *
 * Bewusst fünf klar UNTERSCHIEDLICHE Schnitte — fünf Varianten desselben Kleides sind keine
 * Auswahl, sondern fünfmal dieselbe Frage. Und bewusst nur fünf: Wer eine Braut vor zwanzig
 * Kleider stellt, bekommt keine Entscheidung, sondern einen Abbruch.
 *
 * Nachgebessert am selben Tag (Owner: „die Galerie ist doch fürchtbar. Es müssen luxuriöse
 * italienische Kleider sein."). Der erste Satz sah nach Versandhaus aus. Drei Dinge fehlten,
 * und alle drei sind der Unterschied: das MATERIAL beim Namen nennen (Mikado, Duchesse,
 * Chantilly), die HANDARBEIT nennen (appliziert, drapiert, bestickt) — und das LICHT. Eine
 * weisse Box ist ein Produktfoto; ein italienisches Atelier mit Bogenfenstern ist Couture.
 *
 * Jedes trägt seine eigene englische Beschreibung. Die wandert wörtlich in den Bild- und in
 * den Videoauftrag — deshalb steht sie hier neben dem Bild und nicht an drei Stellen verstreut,
 * wo eine davon beim nächsten Ändern vergessen würde.
 *
 * KISS_LOOK_ID/Kleid/WEDDING_KLEIDER/weddingPrompt/WEDDING_PROMPT ziehen seit 02.08.2026 aus
 * `lib/wedding-prompt.ts` — `components/EinladungBauen.tsx` braucht sie fuer denselben
 * Video-Kauf jetzt auch, und ein Component-zu-Component-Import haette das ganze (sehr grosse)
 * KissFunnel-Bundle mit auf die Hochzeitsseite gezogen.
 */

export const IDOL_PROMPT =
  "@person and @Bild2 are together at an elegant evening party, warm golden lights and a festive atmosphere around them. They stand side by side, smiling and laughing, raising their glasses and enjoying the moment together. Keep @person and @Bild2 faces and appearance exactly the same throughout. Fixed camera, no zoom, no camera movement. Fluid natural motion, photorealistic, high-end look. No text or logos.";

/**
 * FOTO KLEIN RECHNEN — WebP, und Handyformate annehmen (Owner 30.07.2026: „die musst du dann
 * verkleinern als WebP automatisch beim Hochladen und auch Handyformate annehmen").
 *
 * WARUM ES ZÄHLT: Vercel weist eine Anfrage über ~4,5 MB mit 413 ab, bevor irgendetwas läuft.
 * Ein Foto vom Handy hat schnell 4–8 MB. WebP ist bei gleicher Qualität rund ein Drittel
 * kleiner als JPEG — damit bleibt auch ein zweites Bild im Rahmen.
 *
 * HANDYFORMATE: iPhones liefern HEIC. `new Image()` kann das ausserhalb von Safari nicht
 * lesen; `createImageBitmap` kann es in mehr Browsern. Deshalb erst der Weg, dann der alte
 * als Rückfall. Scheitert beides, sagen wir es — statt still nichts zu tun.
 */
async function fileToDataUrl(file: File, max = 1000, quality = 0.85): Promise<string> {
  const zeichnen = (w: number, h: number, mal: (c: CanvasRenderingContext2D) => void) => {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    mal(c.getContext("2d")!);
    // WebP wo möglich, sonst JPEG (ältere Safari-Fassungen können kein WebP schreiben).
    const webp = c.toDataURL("image/webp", quality);
    return webp.startsWith("data:image/webp") ? webp : c.toDataURL("image/jpeg", quality);
  };

  try {
    const bmp = await createImageBitmap(file);
    const sc = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * sc), h = Math.round(bmp.height * sc);
    const out = zeichnen(w, h, ctx => ctx.drawImage(bmp, 0, 0, w, h));
    bmp.close?.();
    return out;
  } catch { /* dann der klassische Weg */ }

  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Dieses Bildformat können wir nicht lesen.")); i.src = dataUrl;
  });
  const sc = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.round(img.width * sc), h = Math.round(img.height * sc);
  return zeichnen(w, h, ctx => ctx.drawImage(img, 0, 0, w, h));
}

// Die Fortschrittstexte müssen so lange laufen wie die Erzeugung (25–45 s) — sonst steht der
// letzte Satz eine halbe Minute unverändert da und es liest sich wie abgestürzt.
// Nur noch die Zeitpunkte — die Sätze dazu stehen übersetzt in `lib/kiss-i18n`
// (T.renderSteps), Reihenfolge gleich.
const RENDER_AT = [0, 4000, 9000, 15000, 21000, 28000, 36000, 46000];

// Seine Adresse, einmal eingetragen. Bewusst OHNE Thema im Schlüssel: es ist derselbe Mensch,
// egal ob er beim Kuss oder beim Idol anfängt — zweimal fragen wäre eine Hürde ohne Gegenwert.
const MAIL_KEY = "lb_kiss_mail";

export type FunnelVariant = "kiss" | "idol" | "wedding";

// Beide Themen teilen sich DIESEN Funnel — nur Prompt und Bilder unterscheiden sich.
// Kopieren wäre doppelte Wartung: jeder Fix müsste sonst zweimal gemacht werden.
//
// ALLE BESCHRIFTUNGEN STEHEN IN `lib/kiss-i18n` (Owner 30.07.2026, Punkt 4: „Übersetzung in
// die acht Sprachen"). Hier bleibt nur, was keine Sprache hat: der Prompt, der Dateiname des
// Downloads und die Platzhalterbilder.
/**
 * EIN BILD KLEINER RECHNEN, bevor es in den Ablageplatz des Browsers geht.
 *
 * Der fasst nur wenige Megabyte; ein Handyfoto allein ist oft schon groesser. 520 px lange
 * Kante reicht fuer eine Vorschaukachel voellig — das grosse Original liegt ohnehin auf dem
 * Server. Geht etwas schief, lieber nichts speichern als die Seite aufhalten.
 */
async function verkleinern(src: string, max = 520): Promise<string> {
  if (!src || !src.startsWith("data:")) return src;   // schon eine Adresse: nichts zu tun
  try {
    const bild = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src;
    });
    const sc = Math.min(1, max / Math.max(bild.width, bild.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bild.width * sc); c.height = Math.round(bild.height * sc);
    c.getContext("2d")!.drawImage(bild, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.78);
  } catch { return ""; }
}

const VARIANTS: Record<FunnelVariant, {
  prompt: string; done: string; upFirst: boolean; upPlaceholder?: string;
  /** Kein Gratis-Bild — erst bezahlen (Hochzeit, Owner 01.08.2026; Kuss, Owner 02.08.2026). */
  keinGratis?: boolean;
  /**
   * NUR NOCH GUTHABEN, KEIN EINZEL-STRIPE (Kuss, Owner 02.08.2026: „nicht so wie bei
   * Hochzeit. Die werden die kaufen Credits für 9,99 gleich").
   *
   * Bei der Hochzeit bleibt `unlock("once")` der Weg — ohne Guthaben oeffnet er die
   * 1,49-€-Kasse fuer EIN Video. Beim Kuss ist das nicht mehr gewollt: Ohne Guthaben geht es
   * direkt zur 9,99-€-Aufladung, nie zur Einzel-Kasse. `unlock("once")` bleibt der Weg, WENN
   * das Guthaben reicht (dann bucht der Server lautlos ab, ohne Kassenfenster).
   */
  nurGuthaben?: boolean;
  // MUSIK ZUM BILD (Owner 30.07.2026: „ich habe dir den Song angelegt Bridal-chorus.mp3").
  // Ein Bild ist still — die Stimmung muss von der Seite kommen. Nur dort gesetzt, wo es
  // wirklich passt; beim Kuss und beim Idol bliebe Musik Deko.
  musik?: string;
  /**
   * BEIDE FOTOS AUF EINEM BILDSCHIRM, KEIN KARUSSELL (Owner 31.07.2026: „hier stehen mehrere
   * Models. Die Leute werden nur sich brauchen" und „ich haette gerne die zwei bilder zum
   * hochladen nebeneinander").
   *
   * Beim Kuss ist die Auswahl der Frau das Produkt — da gehoert das Karussell hin. Bei der
   * Hochzeit gibt es nichts auszusuchen: Es sind IHRE zwei Gesichter. Ein Karussell fremder
   * Frauen ist dort nicht Auswahl, sondern Irritation, und es kostet einen ganzen Schritt.
   */
  paarUpload?: boolean;
  /**
   * NUR DAS EIGENE FOTO, KEIN KATALOG (Owner 31.07.2026: „du machst nur upload your photo,
   * nicht unsere Models").
   *
   * Das kehrt seine eigene Ueberlegung von zwei Minuten vorher um — und zwar richtig: „jeder
   * hat ein Model auf dem Handy". Wer ohnehin ein Foto der Frau hat, um die es ihm geht, dem
   * ist eine Reihe fremder Frauen kein Angebot, sondern ein Schritt im Weg. Und wer keines
   * hat, ist nicht der Kunde dieses Trichters.
   *
   * Das Karussell bleibt im Code: Andere Themen leben davon, und die Frauen sind gepflegt.
   * Hier faellt nur die Auswahl weg — uebrig bleibt die eine Karte, die zaehlt.
   */
  nurEigenes?: boolean;
  /**
   * ABO — pro Thema entschieden.
   *
   * Bei der Hochzeit war es zwischendurch AUS: Der Kuss-Trichter hatte „Die heisseste
   * KI-Erfahrung freischalten — 24,50 €/Monat" mitgebracht, und dieser Satz beschaedigt den
   * Anlass. Owner 31.07.2026, spaeter am Tag, mit einem anderen Argument: „bei Wedding
   * machen wir auch ein Abo, bis sie heiraten von mir aus. Auch 24,50, weil wir die Liste
   * hosten muessen."
   *
   * Das dreht die Sache um, und zwar zu Recht: Verkauft wird nicht mehr ein Video, sondern
   * eine Seite, die MONATE laeuft — Einladung erreichbar halten, Oeffnungen zaehlen,
   * Gaesteliste fuehren, bis die Hochzeit vorbei ist. Laufende Leistung, laufender Preis; sie
   * kuendigt nach der Hochzeit. Falsch war nie das Abo, falsch war der Kuss-Werbespruch.
   */
  abo: boolean;
  /**
   * EINZELKAUF — bei der Hochzeit ABSICHTLICH NICHT (Owner 31.07.2026: „es gibt kein Video
   * hier fuer 9,99. Es gibt nur die ganze Einladung.").
   *
   * Ein Video fuer 9,99 neben einer Einladung fuer 24,50 im Monat ist kein zweites Angebot,
   * sondern eine Ausrede: Der billigere Knopf gewinnt, und die Kundin geht mit einer Datei
   * nach Hause statt mit der Seite, die ihre Hochzeit traegt. Verkauft wird hier das Ganze
   * oder gar nichts.
   */
  einzelkauf: boolean;
}> = {
  kiss: {
    nurEigenes: true,
    // Ton auch beim BILD (OFFEN.md 0: „die eigene Tonspur aus lib/musik.ts einhaengen, wie
    // bei der Hochzeit"). Ohne Musik ist das fertige Bild eine Postkarte statt eines Moments.
    musik: musikFuer("kiss"),
    prompt: KISS_PROMPT, done: "kiss-video.mp4", abo: true, einzelkauf: true,
    keinGratis: true, nurGuthaben: true,
    // „Your model" steht seit 29.07.2026 VORN und ist vorgewählt (Owner). Derselbe Gedanke
    // wie bei „Your Idol": Wer hierher kommt, hat meist schon jemanden im Kopf — unsere
    // Models sind die Alternative daneben, nicht der Anfang. Auf diese Seite laufen die
    // Anzeigen, also entscheidet die erste Karte über den ganzen Trichter.
    upFirst: true,
    // PLATZHALTER: eine FRAU (Owner 30.07.2026: „du musst als Platzhalter bei Image upload
    // eine Frau machen"). Die Karte stand leer und man sah nicht, was dort hingehört —
    // beim Foto von IHM gab es den Hinweis längst.
    upPlaceholder: "/kiss-woman-placeholder.jpg",
  },
  wedding: {
    /**
     * BEZAHLT VON ANFANG AN (Owner 01.08.2026: „Es kostet von Anfang an 1,49 pro Video …
     * Sie werden nichts testen dürfen kostenlos"). `einzelkauf` schaltet den 1,49-Kauf und
     * damit auch den Aufladen-Knopf frei; `keinGratis` unten macht daraus die Regel.
     *
     * Warum bei der Hochzeit anders als beim Kuss: Der Kuss verkauft eine Neugier — ohne
     * Gratis-Bild glaubt niemand, dass es mit seinem Gesicht klappt. Die Braut kommt mit
     * einer Absicht und einem Datum; sie braucht keinen Beweis, sondern ein Ergebnis. Was
     * sie bekommt, zeigt die Beispiel-Einladung, die man teilen kann.
     */
    prompt: WEDDING_PROMPT, done: "hochzeitseinladung.mp4", abo: true, einzelkauf: true,
    keinGratis: true,
    // Aus lib/musik.ts, nicht mehr von Hand: Dort steht je Thema EIN Stueck, und der Owner
    // hat den Hochzeitsmarsch ausdruecklich abgewaehlt („nimm was anderes als Lied") — hier
    // stand er noch. Zwei Stellen fuer dieselbe Entscheidung laufen auseinander; jetzt eine.
    musik: musikFuer("wedding"),
    paarUpload: true,
    // SIE bedient diesen Trichter: Schritt 1 ist SIE selbst (die Braut), Schritt 2 ER. Die
    // Upload-Karte steht deshalb vorn und ist vorgewählt — unsere Bräute sind die Ausweiche
    // für die, die kein Foto zur Hand hat.
    upFirst: true,
    upPlaceholder: "/kiss-woman-placeholder.jpg",
  },
  idol: {
    prompt: IDOL_PROMPT, done: "your-idol-video.mp4", abo: true, einzelkauf: true,
    // Bei „Your Idol" ist das EIGENE Idol der Sinn der Sache — deshalb steht die Upload-Karte
    // vorn und ist von Anfang an gewählt; unsere Models sind nur die Alternative daneben.
    upFirst: true,
    // Platzhalter-Gesicht auf der Upload-Karte (Aria, abgedunkelt): zeigt auf einen Blick,
    // dass hier ein FOTO hineingehört — genau wie Peter beim eigenen Foto.
    upPlaceholder: "/idol-placeholder.jpg",
  },
};

/**
 * DIE KARTE IST DIE SEITE — auch beim Kuss (Owner 31.07.2026: „wir machen das jetzt wie
 * Hochzeit, das Layout, also die Karte ist sichtbar und mit Dialog").
 *
 * Bei der Hochzeit hat das den Trichter ersetzt. Der Grund war nicht Geschmack, sondern die
 * Reihenfolge des Verstehens: Wer zuerst das fertige Ergebnis sieht, weiss sofort, was er
 * baut. Wer zuerst vier Schritte sieht, muss es sich vorstellen — und die meisten tun das
 * nicht, sie gehen.
 *
 * HIER wurde bewusst NICHT neu gebaut, sondern umgehaengt: Der Kuss-Trichter traegt die
 * Kasse, die Video-Lieferung und das Monatsguthaben. Die vier Schritte wandern unveraendert
 * in einen Dialog, die Karte kommt darueber, und der Kaufblock bleibt, wo er war. Kein
 * einziger Handgriff am bezahlten Weg — der laeuft gerade.
 */
export default function KissFunnel({ variant = "kiss", code = "", lang = "en", beispielVideo = "" }: { variant?: FunnelVariant; code?: string; lang?: string; beispielVideo?: string }) {
  const V = VARIANTS[variant];
  // Die Sprache kommt von der Seite (Cookie bzw. Browsersprache, siehe lib/lang-server).
  const T = kissText(lang, variant);
  // MESSPUNKTE (Owner 29.07.2026). Bis heute meldete KEIN Trichter irgendetwas: acht
  // Kiss-Durchläufe standen nur im eigenen kiss-log, und wo die Leute abspringen, war
  // nicht zu sehen. Alle Trichter benutzen dieselben sechs Namen, damit man sie
  // nebeneinanderlegen kann; das Thema steckt in lookId.
  const track = (step: string) =>
    void logFunnelEvent(`funnel_${step}`, { lookId: `funnel-${variant}`, lookName: `${variant}-Trichter` });
  // Die Schritte liegen im Dialog. Zu ist der Normalfall: Dann steht die Karte allein da.
  const [stufenOffen, setStufenOffen] = useState(false);
  /**
   * FRISCH ERZEUGT ODER NUR WIEDERHERGESTELLT? (Owner 31.07.2026: „sieht das der User? Mein
   * Bild?" — und gleich danach: „er muss das Video sehen".)
   *
   * Sein Bild sieht KEIN Fremder: Es liegt in seinem eigenen Browser (MERK_KEY) und wird nie
   * ausgeliefert. Aber ER sah es — und damit verdeckte ein altes Ergebnis beim naechsten
   * Besuch genau das, was die Seite verkauft: das VIDEO.
   *
   * Deshalb zwei verschiedene Dinge, die vorher eines waren: Ein Bild, das er GERADE erzeugt
   * hat, gehoert in die Karte — das ist die Belohnung. Ein Bild von gestern gehoert es nicht;
   * dort laeuft wieder das Beispiel. Der Kaufblock kennt den Unterschied nicht und arbeitet
   * mit beiden weiter — wer bezahlt hat, soll sein Ergebnis nicht verlieren.
   */
  const [frischErzeugt, setFrischErzeugt] = useState(false);

  /**
   * „PERSONEN ERSETZEN" AUS DER GALERIE (Owner 31.07.2026). Jedes Beispiel unten traegt einen
   * Knopf; er scrollt nach oben und oeffnet hier die Schritte. Ueber ein Fenster-Ereignis,
   * weil Galerie und Trichter zwei getrennte Bausteine auf derselben Seite sind — sonst
   * muesste der halbe Zustand durch die Seite gereicht werden.
   */
  useEffect(() => {
    const auf = () => { setSchritt(1); setStufenOffen(true); };
    window.addEventListener("lb-schritte-oeffnen", auf);
    return () => window.removeEventListener("lb-schritte-oeffnen", auf);
  }, []);
  const [models, setModels] = useState<Model[]>([]);
  const [picked, setPicked] = useState<Model | null>(null);
  const [customModel, setCustomModel] = useState(""); // „Your Model": eigenes Model-Foto (Data-URL)
  const [useCustom, setUseCustom] = useState(VARIANTS[variant].nurEigenes || VARIANTS[variant].upFirst); // „Your Model"-Karte vorn
  const [photo, setPhoto] = useState("");          // eigenes Foto (Data-URL)
  const [isStaff, setIsStaff] = useState(false);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);         // Render-Show oder echte Generierung läuft
  const [status, setStatus] = useState("");
  const [teaser, setTeaser] = useState(false);
  // Das ECHTE Gratis-Bild (Owner 30.07.2026: „ich will hier jetzt ein Bild generieren dann in
  // einem Video umwandeln"). Es ist der erste Vollbild des späteren Videos — deshalb bleiben
  // die Gesichter stabil: sie stehen schon im Bild, statt erst beim Rendern zu entstehen.
  const [bild, setBild] = useState("");
  /**
   * DIE ADRESSE STEHT VOR DER ERZEUGUNG (Owner 30.07.2026: „deswegen habe ich die
   * emailadresse nicht").
   *
   * Bis heute wurde erst NACH dem fertigen Bild gefragt. Das klang plausibel — wer gewartet
   * hat, trägt eher ein — kostete aber genau die, die abspringen: In der eigenen Galerie
   * standen Bilder, für die bezahlt wurde, ohne eine einzige Adresse. Jedes davon ist ein
   * bezahltes Bild ohne Gegenwert und ein Mensch, den wir nie wieder erreichen.
   *
   * Jetzt: erst die Adresse, dann rechnen. Wer angemeldet ist oder schon einmal eingetragen
   * hat, sieht das Feld gar nicht — die Adresse liegt im Gerät und wird nur noch benutzt.
   */
  const [bildPfad, setBildPfad] = useState("");
  const [mail, setMail] = useState("");
  const [mailBusy, setMailBusy] = useState(false);
  /**
   * DER ADRESS-FEHLER, DIREKT AM FELD (Owner 31.07.2026: „das habe ich eingegeben und kam
   * kein Error und keine Generierung" — zu `dfasf@seed.lb`).
   *
   * Die Sperre GRIFF, aber ihre Meldung landete in der allgemeinen Status-Zeile: weiss/60,
   * weit unten unter den Kaufhinweisen — auf der hellen Fassung buchstäblich unsichtbar.
   * Eine Absage, die man nicht sieht, fühlt sich an wie ein kaputter Knopf; er drückt noch
   * dreimal und geht.
   *
   * Eigener Zustand statt `status`, damit die Meldung AM FELD klebt (dort schaut er hin,
   * dort tippt er die Korrektur) und beim nächsten Tastendruck verschwindet.
   */
  const [mailFehler, setMailFehler] = useState("");
  /** Roter Hinweis am Weiter-Knopf von Schritt 1, wenn ohne Foto gedrückt wird (01.08.2026). */
  const [weiterHinweis, setWeiterHinweis] = useState("");
  /**
   * DIE ABSAGE AM UPLOAD (Owner 03.08.2026: „wenn Leute nackte Frauen hochladen muss die
   * Meldung kommen, dieses Bild kann nicht akzeptiert werden").
   *
   * Eigener Zustand statt `status`: Die Status-Zeile steht ganz unten am Trichter, der
   * Upload aber im Dialog weiter oben — dort haette er die Absage nie gesehen und geglaubt,
   * sein Foto sei angekommen. Diese Zeile steht direkt bei den Kacheln, in beiden Schritten.
   */
  const [uploadFehler, setUploadFehler] = useState("");
  /**
   * ROTER HINWEIS AM GENERATE-KNOPF (02.08.2026, plan.md Punkt 1b: „ich drücke drauf und
   * passiert nichts"). Der Knopf war schon gesperrt, wenn Foto oder Zustimmung fehlten — aber
   * STUMM, wie der Weiter-Knopf es vorher auch war. Derselbe Fix: Klick auf die Hülle nennt
   * den fehlenden Grund, statt dass der Knopf einfach nichts tut.
   */
  const [generateHinweis, setGenerateHinweis] = useState("");
  /**
   * DER TEILEN-DIALOG (Owner 01.08.2026: „in dem Moment wo er shart muss er wissen dass es
   * public wird"). Teilen heisst seither: die KARTE wird unter /w/[id] öffentlich, der
   * Empfänger bekommt unten den Generator-Knopf — Werbung, die der Absender verschickt.
   * Ohne sein ausdrückliches Ja im Dialog wird nichts freigegeben und nichts geteilt.
   */
  const [shareFrage, setShareFrage] = useState(false);
  /**
   * DIE GEWÄHLTE SZENE (Owner 01.08.2026: „die User suchen sich eine Szene aus und wollen
   * diese Szene nachbauen"). "" = keine Wahl, und dann ändert sich NICHTS am Auftrag — die
   * Natur-Ergebnisse, die dem Owner gefallen, bleiben der Standard.
   */
  const [kussSzeneId, setKussSzeneId] = useState("");
  /**
   * LINGERIE GEWAEHLT = ANDERER PREIS (Owner 03.08.2026: „das kostet 3,99 und dafür musst du
   * die Frau mit FASHN in einer unserer Lingerie-Bilder anziehen und dann in Video
   * umwandeln"). Gilt fuer die Lingerie-Vorlagen aus public/Kisslingerie UND fuer die als
   * Lingerie markierte Szenen-Kachel. Der Preis selbst steht in lib/pricing
   * (LINGERIE_CENTS); hier faellt nur die Entscheidung, WELCHER gilt.
   */
  const lingerieGewaehlt = !!kussLingerie(kussSzeneId) || kussSzene(kussSzeneId)?.lingerie === true;
  const videoPreisCents = lingerieGewaehlt ? LINGERIE_CENTS : ONCE_CENTS;
  /** VERGROESSERN (Owner 03.08.2026: „die muss man vergrössern können"): Die Lupe auf der
   *  Kachel oeffnet das Vollbild — Szenen als Bild, Lingerie-Vorlagen als laufendes Video.
   *  Antippen der Kachel selbst bleibt die WAHL; zwei Handgriffe, zwei Knoepfe. */
  const [szeneZoom, setSzeneZoom] = useState<{ src: string; video?: boolean; poster?: string } | null>(null);
  /** Euro-Guthaben in Cent (Aufladung 9,99; Owner 01.08.2026 Variante B). null = unbekannt. */
  const [guthabenCents, setGuthabenCents] = useState<number | null>(null);
  /** Nach der Aufladungs-Rueckkehr: das gewuenschte Video jetzt vom Guthaben kaufen. */
  const nachAufladungKaufen = useRef(false);

  const werkTeilen = async () => {
    setShareFrage(false);
    if (!genId) return;
    let device = "";
    try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
    // Freigabe OHNE await: Safari verwirft die Teilen-Geste, wenn vorher ein Netzaufruf
    // wartet. Der Stempel ist in Millisekunden gesetzt; der Empfänger klickt in Minuten.
    void fetch("/api/kiss-log", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ share: genId, device }),
    }).catch(() => {});
    const url = `${window.location.origin}/w/${encodeURIComponent(genId)}?l=${encodeURIComponent(String(lang).slice(0, 2))}&utm_source=share`;
    const text = TEILEN_TEXT[lang] ?? TEILEN_TEXT.en;
    try {
      if (navigator.share) { await navigator.share({ title: text, text, url }); return; }
    } catch { return; }   // abgebrochen ist kein Nein zur Freigabe, nur keins zum Senden
    try { await navigator.clipboard?.writeText(`${text} ${url}`); setStatus((KARTE_TEXTE[lang] ?? KARTE_TEXTE.en).zusDanke); } catch { /**/ }
  };
  /**
   * DAS LAND (Owner 31.07.2026). Vorbelegt aus der Seitensprache — siehe Kommentar am Feld.
   * Es reist mit der Adresse an `kiss-claim` und macht den nächsten Rundbrief mehrsprachig.
   */
  const [land, setLand] = useState("");
  /**
   * AUTOMATISCH FÜLLEN (Owner 31.07.2026: „das machst du mit Autofill").
   *
   * Reihenfolge nach Verlässlichkeit: Zeitzone des Geräts zuerst — ein Rumäne mit englisch
   * eingestelltem Handy hat trotzdem `Europe/Bucharest`. Erst wenn die Zone unbekannt ist,
   * zählt die Seitensprache. Der Server bessert später mit Vercels Länderkennung nach, die
   * jede Vermutung des Browsers schlägt.
   */
  useEffect(() => {
    /**
     * NUR die Zeitzone, KEIN Rückfall auf die Seitensprache mehr.
     *
     * Die Sprache sagt, was jemand liest — nicht, wo er sitzt. Aus „liest Englisch" folgt
     * „Vereinigtes Königreich", und das war auf dem Bildschirm des Owners zu sehen. Eine
     * falsche Angabe ist schlechter als gar keine: Sie sieht aus wie Wissen und schickt den
     * nächsten Rundbrief in der falschen Sprache los.
     *
     * Bleibt das Feld leer, entscheidet der Server über Vercels Länderkennung — die weiss es
     * wirklich.
     */
    setLand(l => l || landAusZeitzone());
  }, [lang]);
  const [adresseDa, setAdresseDa] = useState(false);   // wir kennen ihn → kein Feld mehr
  /**
   * KEIN UPLOAD OHNE E-MAIL (Owner 03.08.2026: „sie dürfen nicht ein Mal hochladen ohne
   * Email anzugeben"). Bisher lag das Adressfeld erst kurz vor „Generate" — jedes Foto war
   * da längst hochgeladen und im Werkzeug gespeichert (`onFile`/`onModelFile` legen den
   * Log-Eintrag sofort an, unabhaengig von der Adresse). Jetzt haelt ein Tor VOR dem ersten
   * Upload an: fehlt die Adresse, wird das Foto zwischengehalten (`gateDatei`) statt
   * hochgeladen, bis die E-Mail bestaetigt ist — dann laeuft genau dieses Foto nach.
   */
  const [gateOffen, setGateOffen] = useState(false);
  const gateDatei = useRef<{ art: "person" | "model"; file: File } | null>(null);
  /**
   * ABONNENT WIEDERERKANNT (Owner 30.07.2026). „Bezahlt" war bisher ein Zustand dieser einen
   * Sitzung — wer gestern ein Abo abgeschlossen hatte, war heute wieder ein Fremder. Jetzt
   * fragt der Trichter mit seiner Adresse nach: läuft ein Abo, und wie viele Videos hat er
   * diesen Monat noch? Beides kommt vom Server, nichts davon steht im Gerät.
   */
  const [aboAktiv, setAboAktiv] = useState(false);
  const [videosLinks, setVideosLinks] = useState<number | null>(null);
  const [extraNoetig, setExtraNoetig] = useState(false);   // Kontingent leer → Nachkauf anbieten
  const [frei, setFrei] = useState(false);      // Adresse da → Bild sichtbar
  // GRATIS AUFGEBRAUCHT — aber kein Sackgassen-Text (Owner 30.07.2026: „bei der Sperre muss
  // doch ein Button kommen für Abo oder Video für 9,99 … sonst macht er nicht weiter").
  const [gesperrt, setGesperrt] = useState(false);
  // GESCHEITERT — aber nicht verloren (Owner 30.07.2026). Statt einer stummen Fehlermeldung
  // ein Feld: dann bekommt er sein Bild nachgereicht, und wir bekommen die Adresse.
  const [gescheitert, setGescheitert] = useState(false);
  /**
   * EIN SCHRITT PRO BILDSCHIRM (Owner 30.07.2026: „wir müssen das Layout ändern. In Schritten.
   * Er lädt ein Bild von ihr hoch oder wählt ein Model, dann nächster Screen, er lädt ein Bild
   * von sich hoch, dann nächste ist die Generierung").
   *
   * Vorher standen alle drei Schritte untereinander auf einem sehr langen Bildschirm. Am Handy
   * sah man nie, was als Nächstes kommt, und der Generieren-Knopf war grau, ohne dass klar
   * wurde warum. Jetzt: eine Aufgabe, ein Knopf, weiter.
   */
  // Schritt 4 = die Erzeugung selbst (Owner 30.07.2026: „ich will dass er auf die nächste
  // Seite springt wenn er Generate macht und das Rendering zu sehen ist. Dann weiss ich
  // besser was passiert"). Vorher lief das Rendern unter den Schritten weiter — man sah
  // nicht, dass überhaupt etwas passiert.
  const [schritt, setSchritt] = useState<1 | 2 | 3 | 4>(1);

  /**
   * SCHRITT 4 GEHOERT NICHT MEHR IN DEN DIALOG (Owner 31.07.2026: „hier kommt nichts" — ein
   * leeres Fenster mit der Ueberschrift „4 · Dein Bild").
   *
   * Er hat recht, und es ist eine Folge des Umbaus: Schritt 4 WAR der Ergebnis-Bildschirm.
   * Seit die Karte oben das Ergebnis traegt, ist im Dialog nichts mehr uebrig — die
   * Ueberschrift stand allein da.
   *
   * Statt die Ueberschrift zu verstecken, schliesst der Dialog. Das ist die ehrlichere
   * Antwort: Wer bei Schritt 4 ist, hat sein Bild — und das steht dahinter. Hier zaehlt jeder
   * Weg dorthin, nicht nur die frische Erzeugung: auch das bezahlte Video, der
   * wiederhergestellte Stand und der Sprung aus der Galerie.
   */
  useEffect(() => {
    if (schritt >= 4) setStufenOffen(false);
  }, [schritt]);

  // `videoShow`/`videoReif` (die gespielte Render-Show vor der Kasse) sind am 31.07.2026
  // ersatzlos entfallen — Owner: „ohne diesen Fake". Begruendung bei `unlock` weiter unten.
  const [videoBusy, setVideoBusy] = useState(false);      // ECHTER Video-Lauf laeuft
  const [videoUrl, setVideoUrl] = useState("");    // ECHTES Video (erst nach Zahlung / Staff)
  const [genId, setGenId] = useState("");          // Kiss-Log-Eintrag dieser Generierung
  const [payBusy, setPayBusy] = useState(false);
  /**
   * DAS HAEKCHEN (Owner 30.07.2026: „das muss man aber erwaehnen in agb und die muessen das
   * abhacken sonst wird es ilegal").
   *
   * Bis heute galt die Zustimmung durch das Tippen auf den Knopf — bewusst ohne Haekchen, weil
   * jedes Haekchen Anlaeufe kostet. Fuer die Nutzungsrechte an den Fotos reicht das; fuer die
   * SPEICHERUNG der Fotos und fuer Werbemails will er eine ausdrueckliche Handlung. Also ein
   * Haekchen, genau eines, direkt vor dem Knopf.
   *
   * Es wird im Geraet gemerkt: Wer einmal zugestimmt hat, soll beim naechsten Bild nicht
   * wieder klicken muessen. Der Zeitpunkt geht mit an den Server — ohne Nachweis, WANN
   * zugestimmt wurde, ist eine Einwilligung wertlos.
   */
  const [consent, setConsent] = useState(false);
  const consentKey = "lb_kiss_consent";
  /**
   * Zugestimmt wird durch die HANDLUNG, nicht durch ein Haekchen (Owner 30.07.2026: „mit
   * klick auf weiter akzeptiert er das schon"). Der Satz dazu steht sichtbar unter dem
   * Knopf, den er drueckt. Festgehalten wird der Zeitpunkt — ohne ihn ist eine Einwilligung
   * spaeter nicht belegbar.
   */
  const zustimmen = () => {
    if (consent) return;
    setConsent(true);
    try { localStorage.setItem(consentKey, new Date().toISOString()); } catch { /**/ }
  };
  const fileRef = useRef<HTMLInputElement>(null);
  const modelFileRef = useRef<HTMLInputElement>(null); // Upload fürs eigene Model-Foto
  const mailRef = useRef<HTMLInputElement>(null);      // Adressfeld vor der Erzeugung
  const mailGateRef = useRef<HTMLInputElement>(null);   // Adressfeld im Upload-Tor
  /**
   * DER HOCHZEITSMARSCH ZUM BILD (Owner 30.07.2026).
   *
   * Er spielt erst, wenn das Bild da ist — nicht beim Laden der Seite: Musik, die jemanden
   * ueberfaellt, wird weggewischt, Musik zum eigenen Hochzeitsbild traegt den Moment. Sie
   * beginnt leise und laesst sich mit einem Tipp abstellen; die Wahl bleibt im Geraet.
   *
   * Laeuft das bezahlte VIDEO, schweigt sie — das Video bringt seinen eigenen Ton mit, und
   * zwei Tonspuren uebereinander sind schlimmer als keine.
   */
  const musikRef = useRef<HTMLAudioElement>(null);
  const [ton, setTon] = useState(true);
  /**
   * DIE EINLADUNG (Owner 31.07.2026: „ich will dass die Leute das auch als Einladung für die
   * Hochzeit schicken das Video an die Freunde").
   *
   * Bewusst ein Knopf AM fertigen Video und kein Schritt im Trichter: Nur ein kleiner Teil der
   * Besucherinnen heiratet wirklich. Ein Pflichtfeld „Datum" würde alle anderen vertreiben —
   * und die sind die Mehrheit.
   */
  const [einlOffen, setEinlOffen] = useState(false);
  const [einlSie, setEinlSie] = useState("");
  const [einlEr, setEinlEr] = useState("");
  const [einlDatum, setEinlDatum] = useState("");
  const [einlOrt, setEinlOrt] = useState("");
  const [einlBusy, setEinlBusy] = useState(false);
  /** Das gewaehlte Brautkleid. Leer = unsere Vorgabe, damit der Trichter ohne Auswahl laeuft. */
  const [kleid, setKleid] = useState("");
  /** Paarfoto: laeuft, waehrend der Server die zwei Gesichter herausschneidet. */
  const [paarBusy, setPaarBusy] = useState(false);
  const [paarFehler, setPaarFehler] = useState("");
  const paarRef = useRef<HTMLInputElement>(null);
  /**
   * ZUSCHNEIDEN UND SPEICHERN vor dem Hochladen (Hausregel „Foto-Upload", Pflicht 1 und 2).
   *
   * Handyfotos sind nie im Format der Kachel; ohne Zuschnitt schneidet `object-cover` blind —
   * und ausgerechnet den Kopf. Genau daran haengt hier alles: Stimmt das Gesicht nicht, wird
   * nicht gebucht. Sie sieht den Ausschnitt also VORHER und bestaetigt ihn.
   */
  const [cropDatei, setCropDatei] = useState<File | null>(null);
  const [cropZiel, setCropZiel] = useState<"sie" | "er" | null>(null);
  /**
   * PAARFOTO: DIESELBE DATEI ZWEIMAL DURCH DEN ZUSCHNITT — sie schneidet erst ihr Gesicht
   * heraus, dann seins.
   *
   * Der erste Versuch liess einen Vision-Aufruf die zwei Koepfe finden. Das ist gescheitert,
   * und zwar nicht knapp: gpt-4o-mini gab fuer dasselbe Foto 0,55/0,35/0,25/0,25 zurueck —
   * glatte Zahlen, also geraten statt gemessen. Ergebnis waren zwei Ausschnitte mit BEIDEN
   * Gesichtern darin, und eine Referenz mit zwei Gesichtern ist schlimmer als gar keine:
   * Pixverse bindet dann das falsche.
   *
   * Der Mensch vor dem Bildschirm weiss dagegen sofort, wer wer ist. Zweimal schieben und
   * zoomen dauert Sekunden, kostet nichts, kann nicht fehlschlagen — und der Gewinn bleibt:
   * Sie braucht nur EIN Foto statt zwei.
   */
  const [paarQuelle, setPaarQuelle] = useState<File | null>(null);
  const [einlAdresse, setEinlAdresse] = useState("");
  const [einlTelefon, setEinlTelefon] = useState("");
  const [einlUrl, setEinlUrl] = useState("");
  const runRef = useRef(0);
  // ZAHLUNG ERKANNT (Owner 30.07.2026: „nach dem ich bezahlt habe ist nichts passiert, der
  // Kunde wurde ausgeraubt" / „springt wieder auf unlock video"). Siehe Ablauf weiter unten.
  const [bezahlt, setBezahlt] = useState(false);
  // AUSWAHL NACH DER ZAHLUNG (Owner 30.07.2026: „ich habe gar nicht die Chance gehabt die
  // Klamotten fuer sie auszuwaehlen"). Wer bezahlt hat, sucht sich Kleid, seine Sachen und
  // die Szene aus — ohne zweite Kasse: „und gratis natuerlich, er hat doch bezahlt".
  const [wahl, setWahl] = useState(false);
  const [looks, setLooks] = useState<{ id: string; name?: string; imageUrl?: string }[]>([]);
  const [nurKleidung, setNurKleidung] = useState<string[] | null>(null);
  const [ihrLook, setIhrLook] = useState("");     // "" = wie auf ihrem Foto
  const [seinLook, setSeinLook] = useState("");   // "" = SEINE Originalkleidung (vorbelegt)
  const [szeneId, setSzeneId] = useState("");
  // EINE REIHE (Owner 30.07.2026: „eine Reihe habe ich gesagt"). Sichtbar bleibt nur ihr
  // Kleid; seine Sachen und die Szene liegen hinter einem Aufklapper — wer sie will, tippt.
  const [mehr, setMehr] = useState(false);     // "" = automatisch eine aussuchen
  const rueckkehrRef = useRef(false);
  /** Zahlung bestaetigt, Auftrag noch nicht angestossen — siehe Wachhund unter der Rueckkehr. */
  const nachZahlungLiefern = useRef(false);
  // ZURUECK GEHOERT IN DIE SPRACHZEILE (Owner 30.07.2026: „Back Button in dem Balken mit den
  // Sprachen stehen"). Der Balken liegt in TopNav, der Schritt hier — statt den Zustand nach
  // oben zu reichen, haengen wir den Knopf per Portal in die vorhandene Zeile. Ein Ziel, das
  // es nicht gibt (andere Seiten), heisst einfach: kein Knopf.
  const [langZeile, setLangZeile] = useState<Element | null>(null);
  const swipeRef = useRef(0);      // Coverflow: Pointer-X beim Swipe-Start
  const swipedRef = useRef(false); // ein Swipe war's → den nachlaufenden Klick schlucken
  const resultRef = useRef<HTMLDivElement>(null); // Radar/Ergebnis — der Screen springt dorthin
  const karteRef = useRef<HTMLDivElement>(null);  // die Karte oben — dort steht das fertige Bild

  useEffect(() => {
    // Model-Grid: Admin-Auswahl des eigenen Themas (leer = alle Models).
    Promise.all([
      fetch("/api/try-this-look?models=1").then(r => r.json()).catch(() => ({})),
      fetch(`/api/theme-media?theme=${encodeURIComponent(variant)}`).then(r => r.json()).catch(() => ({})),
    ]).then(([m, c]) => {
      const all: Model[] = (Array.isArray(m.models) ? m.models : []).filter((x: Model) => !!x.photoUrl);
      const wanted: string[] = Array.isArray(c.modelIds) ? c.modelIds : [];
      let list = wanted.length ? wanted.map(id => all.find(x => x.id === id)).filter(Boolean) as Model[] : all;
      /**
       * NEUE MODELS RÜCKEN VON SELBST NACH (Owner 30.07.2026: „ich habe ein neues Model
       * hinzugefügt und ist nicht im Karussell drin" — Sinya).
       *
       * Die Auswahl ist eine feste Liste von Kennungen. Ein Model, das es beim Anhaken noch
       * gar nicht gab, kann darin nicht stehen — es blieb unsichtbar, bis jemand daran denkt,
       * das Werkzeug erneut zu öffnen. Genau das ist passiert.
       *
       * Die Unterscheidung macht der Zeitpunkt der letzten Auswahl: Wer DANACH angelegt wurde,
       * ist neu und kommt ans Ende der Reihe. Wer damals schon da war und nicht angehakt
       * wurde, war eine Entscheidung und bleibt draussen. Fehlt der Zeitpunkt (Auswahl von
       * vor dieser Änderung), gilt das jüngste angehakte Model als Stichtag — dasselbe
       * Ergebnis, ohne dass er irgendetwas nachtragen muss.
       *
       * Der Zeitstempel steckt in der Kennung selbst: `curator-<ms>-<zufall>`.
       */
      if (wanted.length) {
        const stempel = (id: string) => Number(/^curator-(\d{10,})/.exec(id)?.[1] ?? 0);
        const stichtag = c.modelsSavedAt
          ? Date.parse(String(c.modelsSavedAt)) || 0
          : Math.max(0, ...wanted.map(stempel));
        /**
         * IN DIE MITTE, nicht ans Ende und nicht ganz nach vorn. Das Karussell startet auf
         * der Upload-Karte, und die sitzt in der Mitte der Reihe — was dort steht, sieht er
         * sofort, alles andere erst nach vielen Wischern. Ans Ende gehängt wäre ein neues
         * Model praktisch unsichtbar, und das war ja der Anlass.
         */
        const neue = all.filter(x => !wanted.includes(x.id) && stempel(x.id) > stichtag);
        if (neue.length) {
          const mitte = Math.floor(list.length / 2);
          list = [...list.slice(0, mitte), ...neue, ...list.slice(mitte)];
        }
      }
      // Bella steht IMMER als Erste (Owner-Vorgabe) — sie ist das Gesicht des Portals.
      const bellaIdx = list.findIndex(x => x.id === "curator-1783683672619-td4cy" || /^bella\b/i.test(x.name));
      if (bellaIdx > 0) list = [list[bellaIdx], ...list.slice(0, bellaIdx), ...list.slice(bellaIdx + 1)];
      setModels(list);
      // Coverflow: die vorderste Karte IST die Auswahl → mit dem ersten Model (Bella) starten.
      // Bei „Your Idol" bleibt die Upload-Karte vorn, `picked` ist nur der Fallback dahinter.
      if (list.length) setPicked(p => p ?? list[0]);
    });
    try {
      const p = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? "";
      setPin(p); setIsStaff(!!p && !localStorage.getItem("lb_preview_model"));
    } catch { /**/ }
    // KENNEN WIR IHN SCHON? Angemeldetes Konto zuerst, sonst die Adresse aus einem früheren
    // Besuch. Beides erspart ihm das Feld — gefragt wird nur, wer wirklich neu ist.
    // Einmal zugestimmt, nicht wieder fragen (der Zeitpunkt liegt beim Server).
    try { if (localStorage.getItem(consentKey)) setConsent(true); } catch { /**/ }
    // Die Auftragsnummer aus diesem Besuch zurueckholen — sonst legt der naechste Upload
    // nach einem Neuladen einen zweiten Eintrag an (halbe Zeilen in der Galerie).
    try {
      const roh = localStorage.getItem(GEN_KEY);
      const d = roh ? JSON.parse(roh) as { id?: string; at?: number } : null;
      if (d?.id && d.at && Date.now() - d.at < 86_400_000) setGenId(d.id);
      else if (roh) localStorage.removeItem(GEN_KEY);
    } catch { /**/ }
    try {
      const konto = (() => { try { return getStoredAuthSession()?.user?.email ?? ""; } catch { return ""; } })();
      const e = String(konto || localStorage.getItem(MAIL_KEY) || "").trim();
      if (e) { setMail(e); setAdresseDa(true); setFrei(true); }
    } catch { /**/ }
    return () => { runRef.current = -1; };
  }, []);

  /**
   * DAS ERGEBNIS ÜBERLEBT DEN WEG ZUR KASSE (Owner 30.07.2026).
   *
   * „Ich habe das Bild generiert, die E-Mail eingegeben, auf Turn geklickt, bin auf Stripe
   * gesprungen, dann per Zurück wieder in den Browser — und weg war das Bild. Manchmal
   * müssen die Leute sich das Bild noch mal anschauen um zu überlegen."
   *
   * Das Bild lag nur im Arbeitsspeicher der Seite. Stripe öffnet eine eigene Seite; „Zurück"
   * lädt den Trichter neu und der Speicher ist leer — ausgerechnet in dem Moment, in dem er
   * überlegt, ob er zahlt. Deshalb wird es im Gerät abgelegt, verkleinert (das Original wäre
   * für den Ablageplatz zu gross), zusammen mit dem freigeschalteten Zustand.
   */
  const MERK_KEY = `lb_kiss_ergebnis_${variant}`;
  /**
   * DIE AUFTRAGSNUMMER ÜBERLEBT EIN NEULADEN.
   *
   * Sonst passiert wieder genau das, was in der Galerie als halbe Zeile auffiel: Er lädt ihr
   * Foto hoch, lädt die Seite neu (oder kommt von der Kasse zurück, bevor ein Bild da war),
   * lädt sein Foto hoch — und weil `genId` nur im Arbeitsspeicher stand, entsteht ein ZWEITER
   * Eintrag. Sie im einen, er im anderen. Der Merkzettel mit dem Ergebnis half nicht: den gibt
   * es erst, wenn ein Bild fertig ist.
   */
  const GEN_KEY = `lb_kiss_gen_${variant}`;
  const genMerken = (id: string) => {
    if (!id) return;
    setGenId(id);
    try { localStorage.setItem(GEN_KEY, JSON.stringify({ id, at: Date.now() })); } catch { /**/ }
  };

  /**
   * DIE HOCHGELADENEN FOTOS UEBERLEBEN DEN SEITENWECHSEL.
   *
   * Owner 31.07.2026: „die Bilder bitte weiter speichern beim Hochladen, und wenn ich auf die
   * nächste Seite gehe und zurück, dürfen sie nicht verloren gehen."
   *
   * Bisher wurden die beiden Ausgangsfotos nur zusammen mit einem FERTIGEN Bild gesichert
   * (`merken`). Wer hochlud und vorher noch einmal woanders hinschaute, kam auf leere Kacheln
   * zurueck und musste von vorn anfangen — an der Stelle, an der er schon Arbeit investiert
   * hatte. Deshalb wird ab dem Hochladen gesichert, nicht erst ab dem Ergebnis.
   *
   * Klein gerechnet, weil der Ablageplatz im Browser nur wenige Megabyte fasst; die grossen
   * Originale liegen auf dem Server am selben Eintrag.
   */
  const FOTO_KEY = `lb_kiss_fotos_${variant}`;
  const fotosMerken = async (seins: string, ihres: string, eigen: boolean) => {
    try {
      localStorage.setItem(FOTO_KEY, JSON.stringify({
        person: await verkleinern(seins),
        model: await verkleinern(ihres),
        eigen, at: Date.now(),
      }));
    } catch { /* kein Platz → dann eben nur für diese Sitzung */ }
  };

  const merken = async (dataUrl: string, pfad: string, id: string, frei = false) => {
    try {
      // Verkleinert ablegen: der Ablageplatz im Browser fasst nur wenige Megabyte.
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl;
      });
      const max = 900, sc = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      // AUCH DIE BEIDEN AUSGANGSFOTOS (Owner 30.07.2026: „wo sind meine Bilder oben?").
      // Nach der Rueckkehr von Stripe laedt die Seite NEU — sein Upload und die gewaehlte
      // Frau leben nur im Arbeitsspeicher und waeren weg. Ohne sie zeigt der Kuss-Schritt
      // leere Plaetze, und „Generate video" haette gar keine Vorlagen: bezahlt, aber nichts
      // zu rendern. Seines wird verkleinert, ihres ist meist nur eine Adresse.
      const seins = await verkleinern(photo);
      localStorage.setItem(MERK_KEY, JSON.stringify({
        bild: c.toDataURL("image/jpeg", 0.82), pfad, id, frei, at: Date.now(),
        person: seins, model: selPhoto, modelId: picked?.id ?? "", eigen: useCustom,
      }));
    } catch { /* kein Platz → dann eben nur für diese Sitzung */ }
  };

  useEffect(() => {
    /**
     * ZUERST die reinen Uploads: Sie gibt es auch dann, wenn noch nichts erzeugt wurde —
     * genau der Fall, in dem er die Seite verlaesst und zurueckkommt. Ein spaeter geladener
     * Stand aus `MERK_KEY` (mit fertigem Bild) ueberschreibt sie danach, weil er neuer ist.
     */
    try {
      const rohF = localStorage.getItem(FOTO_KEY);
      if (rohF) {
        const f = JSON.parse(rohF) as { person?: string; model?: string; eigen?: boolean; at?: number };
        if (f?.at && Date.now() - f.at > 86_400_000) {
          localStorage.removeItem(FOTO_KEY);
        } else {
          if (f?.person) setPhoto(f.person);
          if (f?.model) { setCustomModel(f.model); if (f.eigen) setUseCustom(true); }
        }
      }
    } catch { /**/ }
    try {
      const roh = localStorage.getItem(MERK_KEY);
      if (!roh) return;
      const d = JSON.parse(roh) as { bild?: string; pfad?: string; id?: string; frei?: boolean; at?: number;
        person?: string; model?: string; modelId?: string; eigen?: boolean };
      // Nach 24 Stunden nicht mehr — sonst sieht er beim nächsten Besuch ein altes Ergebnis.
      if (!d?.bild || (d.at && Date.now() - d.at > 86_400_000)) { localStorage.removeItem(MERK_KEY); return; }
      setBild(d.bild); setBildPfad(d.pfad ?? ""); if (d.id) genMerken(d.id);
      // Die Ausgangsfotos zurueck an ihren Platz — sonst steht er nach der Zahlung vor
      // leeren Kacheln und einem Knopf, der nichts zu tun hat.
      if (d.person) setPhoto(d.person);
      if (d.model) { setCustomModel(d.model); setUseCustom(true); }
      // Kennen wir seine Adresse (aus diesem oder einem früheren Besuch), bleibt das Bild
      // sichtbar. Das `frei` von damals darf eine bekannte Adresse nie zurücknehmen.
      setFrei(f => f || !!d.frei);
    } catch { /**/ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * RUECKKEHR VON DER KASSE — der Kunde darf NIE bezahlt und mit leeren Haenden dastehen.
   *
   * Owner 30.07.2026: „nach dem ich bezahlt habe ist nichts passiert, der Kunde wurde
   * ausgeraubt … springt wieder auf unlock video statt dass er das Video weiter rendert."
   *
   * Ursache: Der Kaufweg oeffnet Stripe in einem zweiten Fenster und wartet dort auf die
   * Bestaetigung. Blockiert der Browser dieses Fenster — auf dem Handy die Regel —, leitet
   * die Seite IM SELBEN Fenster weiter (`window.location.href = start.url`). Nach der Zahlung
   * kommt er mit `?paid=1&cs=<Sitzung>` zurueck, die Seite laedt NEU, der wartende Ablauf ist
   * weg. Uebrig bleibt das gemerkte Bild samt Kaufknopf: bezahlt, und wieder „Unlock 9,99".
   *
   * Zwei getrennte Schritte, weil das Bild aus dem Geraetespeicher spaeter zurueckkommt als
   * diese Pruefung: erst die Zahlung bestaetigen, dann liefern, sobald das Bild da ist.
   */
  useEffect(() => { setLangZeile(document.querySelector("[data-langrow]")); }, []);

  useEffect(() => {
    try { if (localStorage.getItem("lb_ton") === "0") setTon(false); } catch { /**/ }
  }, []);

  useEffect(() => {
    const a = musikRef.current;
    if (!a) return;
    const spielen = !!bild && !videoUrl && ton;
    if (spielen) { a.volume = 0.35; void a.play().catch(() => {}); }
    else { a.pause(); }
  }, [bild, videoUrl, ton]);

  /**
   * Kennen wir seine Adresse, fragen wir einmal nach seinem Stand. Läuft ein Abo (oder liegt
   * ein nachgekauftes Video bereit), ist er freigeschaltet, ohne noch einmal zu zahlen.
   */
  useEffect(() => {
    // ERST WENN DIE ADRESSE STEHT, nicht bei jedem Tastendruck: `mail` ändert sich mit jedem
    // Zeichen im Feld, und jede Abfrage kostet einen Stripe-Aufruf. Gefragt wird also nur,
    // wenn er sie abgeschickt hat oder sie aus einem früheren Besuch kommt.
    if (!adresseDa) return;
    const e = mail.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return;
    let weg = false;
    void fetch(`/api/kiss-status?email=${encodeURIComponent(e)}`, { cache: "no-store" })
      .then(r => r.json())
      .then((d: { abo?: boolean; left?: number; walletCents?: number }) => {
        if (weg) return;
        setAboAktiv(!!d.abo);
        setVideosLinks(typeof d.left === "number" ? d.left : null);
        setGuthabenCents(typeof d.walletCents === "number" ? d.walletCents : null);
        // Freigeschaltet ist, wer ein laufendes Abo hat ODER noch ein gekauftes Video offen
        // hat. Beides heisst: er darf jetzt ein Video machen, ohne die Kasse zu sehen.
        if (d.abo || (d.left ?? 0) > 0) { setBezahlt(true); setExtraNoetig(false); }
      })
      .catch(() => {});
    return () => { weg = true; };
    // `bezahlt` steht mit in der Liste, damit die Kontingent-Zeile oben nach einem Kauf
    // sofort den neuen Stand zeigt („sofort nach dem Kauf drin") — eine Abfrage je Kauf.
  }, [adresseDa, mail, bezahlt]);

  useEffect(() => {
    if (rueckkehrRef.current) return;
    const q = new URLSearchParams(window.location.search);
    /**
     * RUECKKEHR VON DER AUFLADUNG (topup=1, bewusst NICHT paid=1 — eine Aufladung ist kein
     * Videokauf). Zahlung bestaetigen, Guthaben anzeigen, Adresse aus der Kasse uebernehmen —
     * und dann den GEWUENSCHTEN Kauf von selbst anschliessen: Er hat 9,99 geladen, weil er
     * DIESES Video wollte. Das erledigt der Effekt hinter `unlock` (nachAufladungKaufen).
     */
    if (q.get("topup") === "1") {
      const cs = q.get("cs") ?? "";
      if (!cs || cs.startsWith("{")) return;
      rueckkehrRef.current = true;
      setStatus(T.payPrep);
      void (async () => {
        const st = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(cs)}`)
          .then(r => r.json()).catch(() => null);
        rueckkehrRef.current = false;
        if (!st?.paid) { setStatus(""); return; }
        q.delete("topup"); q.delete("cs");
        const rest = q.toString();
        window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));
        if (typeof st.walletCents === "number") setGuthabenCents(st.walletCents);
        if (st.email) { setMail(String(st.email)); setAdresseDa(true); setFrei(true); try { localStorage.setItem(MAIL_KEY, String(st.email)); } catch { /**/ } }
        setStatus("");
        nachAufladungKaufen.current = true;
      })();
      return;
    }
    if (q.get("paid") !== "1") return;
    const cs = q.get("cs") ?? "";
    if (!cs || cs.startsWith("{")) return;      // Platzhalter nicht ersetzt → nichts zu pruefen
    rueckkehrRef.current = true;
    setStatus(T.payPrep);
    void (async () => {
      const st = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(cs)}`)
        .then(r => r.json()).catch(() => null);
      if (!st?.paid) { setStatus(""); rueckkehrRef.current = false; return; }
      // Sitzungsnummer aus der Adresszeile nehmen: sie gehoert nicht in den Verlauf, und ein
      // Neuladen soll die Lieferung nicht ein zweites Mal ausloesen.
      q.delete("paid"); q.delete("cs");
      const rest = q.toString();
      window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));
      setBezahlt(true);
      setPayBusy(false);
      setSchritt(3);   // dort steht die Garderobe

      /**
       * JETZT LIEFERN — ohne dass er noch etwas druecken muss (Owner 31.07.2026: „nach der
       * Zahlung passiert nichts … also Kunde wurde ausgeraubt. Das ist fatal").
       *
       * MEIN FEHLER, und zwar genau durch den Umbau von heute: Der Knopf, der das bezahlte
       * Video anstoesst, steht seit dem Karten-Umbau IM DIALOG. Nach Stripe laedt die Seite
       * neu — der Dialog ist zu, `schritt` ist 3, `bezahlt` ist true, und der einzige Weg
       * zum Video liegt hinter einer geschlossenen Tuer. Bezahlt, und nichts passiert.
       *
       * Ein Knopf ist hier ohnehin die falsche Antwort. Wer bezahlt hat, hat seine
       * Entscheidung getroffen; ihn danach noch einmal fragen zu lassen, ist eine Huerde
       * zwischen Geld und Ware. Also: Zahlung bestaetigt → Auftrag laeuft.
       *
       * Das Anstossen selbst uebernimmt der Wachhund unten, weil die Fotos aus dem
       * Geraetespeicher SPAETER zurueckkommen als diese Pruefung.
       */
      nachZahlungLiefern.current = true;
    })();
  }, []);

  // Der Wachhund zur Zahlung steht weiter unten — er ruft `kussVideo`, und das braucht
  // `selPhoto`, das erst nach der Model-Auswahl feststeht.

  // Bezahlt — jetzt darf er aussuchen. Der Kleiderschrank wird ERST hier geladen, nicht
  // fuer jeden Besucher: die Liste interessiert nur den, der schon bezahlt hat.
  useEffect(() => {
    if (videoUrl || videoBusy) return;
    /**
     * BEIM KUSS KEIN AUTO-AUFKLAPPEN MEHR (Owner 03.08.2026: „es flackert der Bildschirm").
     * `wahl` schaltete die (fuer Kiss abgeschaffte) Auswahlbox UND den Karten-Knopf um —
     * dieser Effekt drehte sie bei jeder Zahlung auf, kussVideo sofort wieder zu: genau das
     * Flackern. Szene und Waesche stehen beim Kuss laengst vor der Kasse.
     */
    if (variant === "kiss") return;
    if (looks.length) { if (bezahlt) setWahl(true); return; }
    // OHNE BILD KEINE AUSWAHLFLAECHE — die haengt am erzeugten Bild. Wer sein Gratis-
    // Kontingent aufgebraucht hat und trotzdem zahlt, saehe sonst NICHTS. Fuer ihn laeuft
    // der alte Weg sofort los: bezahlt heisst geliefert, ohne Ausnahme.
    if (bezahlt) setWahl(true);
    void Promise.all([
      fetch("/api/try-this-look", { cache: "no-store" }).then(r => r.json()).catch(() => ({})),
      fetch("/api/wardrobe-garments", { cache: "no-store" }).then(r => r.json()).catch(() => ({ ids: null })),
    ]).then(([l, w]) => {
      setLooks(Array.isArray(l?.looks) ? l.looks : []);
      setNurKleidung(Array.isArray(w?.ids) ? w.ids.map(String) : null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bezahlt, videoUrl, videoBusy]);

  // BEIM HOCHLADEN SPEICHERN (Owner 30.07.2026: „das Bild muss gespeichert werden in dem
  // Moment wo er das hochlädt"). Der Eintrag im Werkzeug entsteht damit sofort — auch bei
  // denen, die danach abspringen oder deren Erzeugung scheitert. Genau die zeigen, was die
  // Leute wollten. Das Ergebnis wird später an denselben Eintrag nachgetragen.
  const onFile = async (f?: File | null) => {
    if (!f) return;
    // KEIN UPLOAD OHNE ADRESSE (Owner 03.08.2026). Admin/Staff bleibt ausgenommen, sonst
    // testet niemand mehr ohne Adresse einzutippen.
    if (!isStaff && !adresseDa) { gateDatei.current = { art: "person", file: f }; setGateOffen(true); return; }
    await onFileEcht(f);
  };
  const onFileEcht = async (f: File) => {
    setUploadFehler("");   // neuer Versuch → alte Absage weg
    // DAS HOCHLADEN IST DIE ZUSTIMMUNG (Owner 30.07.2026: „beim Upload und weiter akzeptiert
    // er"). Genau hier wird das Foto gespeichert — die Einwilligung darf nicht erst einen
    // Schritt spaeter kommen, sonst liegt sein Bild vor der Zustimmung bei uns.
    zustimmen();
    try {
      const dataUrl = await fileToDataUrl(f);
      setPhoto(dataUrl); track("photo");
      let device = "";
      try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
      /**
       * EIN BESUCH, EIN EINTRAG (Owner 30.07.2026: „selbst dann muss ich sehen wen er
       * ausgewählt hat").
       *
       * Hier lag der Fehler, den man in der Galerie sah: Sein Foto legte IMMER einen neuen
       * Eintrag an. Wer zuerst die Frau hochlud, hatte danach zwei halbe Zeilen — in der
       * einen stand sie, in der anderen er, und in beiden fehlte die Hälfte. Gibt es den
       * Eintrag schon, wird er ergänzt.
       */
      const antwort = await fetch("/api/kiss-log", {
        method: "POST", headers: { "Content-Type": "application/json" },
        /**
         * DIE ADRESSE REIST MIT DEM FOTO (Owner 03.08.2026: „die email wird nicht erfasst,
         * nichts"). Das Upload-Tor bestaetigt sie, BEVOR es einen Eintrag gibt — kiss-claim
         * bekam also genId="" und konnte sie an nichts haengen. Jetzt traegt der Upload
         * selbst sie in den Eintrag; das Tor davor garantiert, dass sie da ist.
         */
        body: genId
          ? JSON.stringify({ update: genId, theme: variant, personImage: dataUrl, modelId: selId, modelName: selName, lang, email: mail.trim() })
          : JSON.stringify({ modelId: selId, modelName: selName, device, personImage: dataUrl, lang, email: mail.trim() }),
      }).catch(() => null);
      const log = await antwort?.json().catch(() => null);
      /**
       * DIE ABSAGE MUSS MAN SEHEN (Owner 31.07.2026, zur Alterssperre).
       *
       * Hier stand nur `.then(r => r.json())` — eine Absage des Servers fiel damit lautlos
       * unter den Tisch, und das Foto blieb im Trichter stehen, als waere alles in Ordnung.
       * Der Nutzer haette weitergeklickt und erst viel spaeter erfahren, dass nichts geht.
       * Jetzt: Bild sofort wieder weg, Grund im Klartext.
       */
      /**
       * ABGEWIESEN → FOTO SOFORT WEG (Owner 03.08.2026, erweitert um `bildAbgelehnt`).
       * Bliebe es stehen, sähe er sein Bild in der Kachel und die Absage daneben — und
       * würde weiterklicken. Die Kennung merken wir uns trotzdem: Der Server hat die Zeile
       * für den Verlauf angelegt, und sein nächster Versuch gehört an denselben Eintrag.
       */
      if (antwort && !antwort.ok && (log?.bildAbgelehnt || log?.altersSperre)) {
        setPhoto(""); setUploadFehler(String(log.error ?? T.statusNotWork));
        if (!genId && log?.id) genMerken(log.id);
        void fotosMerken("", selPhoto, useCustom);
        return;
      }
      if (!genId && log?.id) genMerken(log.id);
      void fotosMerken(dataUrl, selPhoto, useCustom);
    } catch { /**/ }
  };

  /**
   * EIN FOTO VON BEIDEN (Owner 31.07.2026: „man kann auch ein gemeinsames Foto zulassen").
   *
   * Der Server schneidet die zwei Gesichter heraus; danach ist der Zustand exakt derselbe wie
   * nach zwei einzelnen Uploads. Deshalb werden hier auch beide bestehenden Wege benutzt
   * (`onModelFile`-Ergebnis und `onFile`-Ergebnis in Form der zwei Zustaende) statt eines
   * dritten Sonderwegs — sonst haetten wir zwei Arten, wie ein Gesicht in den Trichter kommt,
   * und eine davon wuerde beim naechsten Umbau vergessen.
   */
  /**
   * LÖSCHEN — sichtbar, an jeder Kachel (Hausregel „Foto-Upload", Pflicht 3; Owner
   * 31.07.2026: „ich will das Bild auch löschen können").
   *
   * Nimmt den gemerkten Stand mit: Sonst ist das Foto nach einem Neuladen wieder da, und sie
   * denkt zu Recht, das Löschen sei kaputt.
   */
  /**
   * DAS ERGEBNIS AUS SEINER ANSICHT NEHMEN (Owner 31.07.2026: „dann will ich es löschen
   * können" — und als Dauerregel schon am selben Tag: „jedes Bild darf der User löschen aus
   * seiner Ansicht. Es darf nie da bleiben.").
   *
   * Aus SEINER Ansicht, nicht aus dem System: In der Galerie des Betreibers bleibt es stehen
   * („bei mir in der Gallerie müssen sie als Beweis bleiben, auch wenn sie es löschen") — das
   * ist der Nachweis, wer was erzeugt hat. Hier verschwindet nur, was er sieht: der Zustand
   * und der Browser-Speicher. Danach laeuft in der Karte wieder das Beispielvideo.
   */
  /**
   * DER GRIFF AUF DER KARTE (Owner 31.07.2026: „richtiges CTA und beim Klick auf Video kommt
   * direkt Upload" — „und das genauso", fuer die Karte oben).
   *
   * Das ganze Bild ist der Knopf: Wer ein Beispiel ansieht und antippt, meint genau das. Ihn
   * danach eine kleine Schaltflaeche suchen zu lassen, ist eine Huerde ohne Grund.
   *
   * Die Flaeche faengt erst unter dem Ton-Knopf an (`top-16`), sonst laege sie darueber und
   * die Musik waere nicht mehr einzuschalten. Ein <div> statt <button>, weil ein Knopf im
   * Knopf kaputtes HTML ist — und darin ein <span> in Gold, damit es aussieht wie jeder
   * andere Knopf der Karte und nicht wie eine Bildunterschrift.
   */
  /**
   * DIE SCHRITTE OEFFNEN — IMMER BEIM ERSTEN (Owner 31.07.2026: „Klick auf Bilder öffnet
   * Schritt 4 und ist leer" — „ich kann gar nichts uploaden").
   *
   * Das war ein echter Fehler und er hat mich zwei Meldungen gekostet, bis ich ihn verstanden
   * habe: Wer ein Ergebnis hat, steht auf Schritt 4. Der Knopf oeffnete den Dialog, ohne
   * zurueckzusetzen — also stand dort der ERGEBNIS-Schritt, und der ist im Dialog leer, weil
   * das Ergebnis inzwischen in der Karte liegt. Kein Upload, keine Fotos, nichts.
   *
   * „Personen ersetzen" heisst von vorn. Also zurueck auf Schritt 1, und zwar an EINER
   * Stelle, ueber die alle Wege laufen: der Knopf auf der Karte, die Tastatur und der Ruf aus
   * der Galerie. Drei Aufrufer, die dasselbe tun muessen, sind sonst drei Gelegenheiten, es
   * einmal zu vergessen.
   */
  const schritteOeffnen = () => {
    setSchritt(1);
    setStufenOffen(true);
    track("photo");
  };

  const kartenGriff = (text: string, tun: () => void = schritteOeffnen, zweit?: { text: string; tun: () => void }) => (
    <div role="button" tabIndex={0} aria-label={text}
      onClick={tun}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tun(); } }}
      className="absolute inset-x-0 bottom-0 top-16 z-20 flex cursor-pointer flex-col items-center justify-end gap-2 p-4">
      {/* CI-KNOPF, NICHT KARTEN-GOLD (Owner 31.07.2026: „du nimmst die falschen Farben für
          CTA, kein Gold sondern blau bei light und gelb bei dark").
          `lb-gold` ist genau dieser Knopf: gelb auf dunkel, und die Hell-Fassung faerbt ihn
          blau. Das Karten-Gold (`lb-karte-cta`) bleibt, wo es hingehoert — auf den kleinen
          Knoepfen INNERHALB der Einladung. Ein Kaufknopf muss ueberall gleich aussehen,
          sonst erkennt ihn niemand wieder. */}
      <span className="lb-gold flex h-12 w-full items-center justify-center rounded-full text-center text-[14px] font-black leading-tight shadow-[0_6px_20px_rgba(0,0,0,0.35)]">
        {text}
      </span>
      {/* Der zweite Weg, kleiner: „Personen ersetzen" steht nach dem Kauf-Knopf, nicht davor.
          Weisse Flaeche mit dunkler Schrift — auf einem Foto ist ein durchsichtiger Knopf nie
          zuverlaessig lesbar (Owner 30.07.2026, dieselbe Lehre wie beim Kaufknopf). */}
      {zweit && (
        <button type="button"
          onClick={e => { e.stopPropagation(); zweit.tun(); }}
          style={{ background: "#fff", color: "#1a160f" }}
          className="flex h-10 w-full items-center justify-center rounded-full text-[12px] font-black shadow-md transition active:scale-95">
          {zweit.text}
        </button>
      )}
    </div>
  );

  const ergebnisLoeschen = () => {
    setBild(""); setBildPfad(""); setFrischErzeugt(false); setVideoUrl(""); setTeaser(false);
    try { localStorage.removeItem(MERK_KEY); } catch { /* privater Modus */ }
  };

  const fotoLoeschen = (wer: "sie" | "er") => {
    if (wer === "sie") { setCustomModel(""); setUseCustom(false); }
    else setPhoto("");
    const seins = wer === "er" ? "" : photo;
    const ihres = wer === "sie" ? "" : customModel;
    if (!seins && !ihres) { try { localStorage.removeItem(FOTO_KEY); } catch { /**/ } }
    else void fotosMerken(seins, ihres, !!ihres);
    /**
     * BEIDE SPEICHER RÄUMEN. Der zweite (`MERK_KEY`, der Stand mit dem fertigen Bild) trägt
     * die Ausgangsfotos ebenfalls — wer nur den ersten leert, sieht das Foto beim nächsten
     * Laden wieder. Genau darüber ist der Owner gestolpert: „es darf nie da bleiben."
     */
    try {
      const roh = localStorage.getItem(MERK_KEY);
      if (roh) {
        const d = JSON.parse(roh) as Record<string, unknown>;
        if (wer === "sie") { d.model = ""; d.eigen = false; } else d.person = "";
        localStorage.setItem(MERK_KEY, JSON.stringify(d));
      }
    } catch { /**/ }
    /**
     * NUR AUS SEINER ANSICHT (Owner 31.07.2026: „jedes Bild darf der User löschen aus seiner
     * Ansicht. Es darf nie da bleiben. Im System bei mir schon, wenn er das hochgeladen hat.").
     * Der Eintrag im Protokoll bleibt deshalb absichtlich stehen — dort gehoert er hin.
     */
  };

  const onPaarFile = (f?: File | null) => {
    if (!f) return;
    zustimmen();
    setPaarFehler("");
    setPaarQuelle(f);          // fuer den zweiten Durchgang aufheben
    setCropZiel("sie");
    setCropDatei(f);
  };

  // WEN ER GEWÄHLT HAT, an den Eintrag hängen — auch wenn er nach dem Hochladen noch einmal
  // zu einer anderen Frau wischt. Sonst steht in der Galerie eine Kennung von vorhin.
  const wahlMerken = () => {
    if (!genId || !selId) return;
    void fetch("/api/kiss-log", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ update: genId, modelId: selId, modelName: selName }),
    }).catch(() => {});
  };
  // Auch IHR Foto wird beim Hochladen abgelegt (Owner 30.07.2026: „ich sehe das Bild von der
  // Frau nicht, die ich hochgeladen habe"). Gibt es schon einen Eintrag, wird er ergänzt;
  // sonst entsteht er hier — je nachdem, was er zuerst hochlädt.
  const onModelFile = async (f?: File | null) => {
    if (!f) return;
    if (!isStaff && !adresseDa) { gateDatei.current = { art: "model", file: f }; setGateOffen(true); return; }
    await onModelFileEcht(f);
  };
  const onModelFileEcht = async (f: File) => {
    setUploadFehler("");   // neuer Versuch → alte Absage weg
    zustimmen();   // dasselbe wie beim eigenen Foto: gespeichert wird ab diesem Moment
    try {
      const dataUrl = await fileToDataUrl(f);
      setCustomModel(dataUrl); setUseCustom(true); track("own_model");
      let device = "";
      try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
      const antwort = await fetch("/api/kiss-log", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: genId
          // Auch der Name wandert mit: hat er vorher eine Katalog-Frau gewählt und lädt
          // jetzt eine eigene hoch, stünde sonst in der Galerie weiter ihr Name.
          ? JSON.stringify({ update: genId, theme: variant, modelImage: dataUrl, modelId: "custom", modelName: T.upTitle, lang, email: mail.trim() })
          : JSON.stringify({ theme: variant, modelId: "custom", modelName: T.upTitle, device, modelImage: dataUrl, lang, email: mail.trim() }),
      }).catch(() => null);
      const log = await antwort?.json().catch(() => null);
      /**
       * IHR FOTO WURDE BISHER GAR NICHT GEPRUEFT (Owner 03.08.2026). Hier stand nur
       * `.then(r => r.json())` — eine Absage des Servers fiel lautlos unter den Tisch, und
       * ausgerechnet dieses Feld ist das, in das nackte Bilder hochgeladen werden.
       */
      if (antwort && !antwort.ok && (log?.bildAbgelehnt || log?.altersSperre)) {
        setCustomModel(""); setUploadFehler(String(log.error ?? T.statusNotWork));
        if (!genId && log?.id) genMerken(log.id);
        void fotosMerken(photo, "", true);
        return;
      }
      if (!genId && log?.id) genMerken(log.id);
      void fotosMerken(photo, dataUrl, true);
    } catch { /**/ }
  };

  // Die aktive Auswahl: entweder die „Your Model"-Karte (eigenes Foto) oder ein Katalog-Model.
  const selPhoto = useCustom ? customModel : (picked?.photoUrl ?? "");
  // Sobald das Foto da ist, hat der rote Hinweis seinen Zweck erfüllt.
  useEffect(() => { if (selPhoto) setWeiterHinweis(""); }, [selPhoto]);
  // Dasselbe für den Generate-Hinweis: sobald alle drei Bedingungen wieder stimmen, verschwindet er von selbst.
  useEffect(() => {
    if (selPhoto && photo && consent) setGenerateHinweis("");
  }, [selPhoto, photo, consent]);

  /**
   * ZUM VIDEO SPRINGEN (Owner 01.08.2026: „der User weiss nicht ob er warten soll oder
   * haengt und die Generierung ist weiter unten. Muss runterspringen"). Das fertige Video
   * wohnt jetzt in der Karte oben — sobald es eintrifft, faehrt die Seite hin. Wer waehrend
   * der drei Minuten gescrollt hat, steht sonst vor totem Bildschirm, waehrend oben laengst
   * sein Video laeuft.
   */
  useEffect(() => {
    if (!videoUrl) return;
    const t = setTimeout(() => karteRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl]);
  // Nur echte KLEIDUNGSfotos in die Auswahl — die Liste trennt Kleidung von Fotos, auf
  // denen eine fremde Frau steht. Fehlt sie, zeigen wir alles statt nichts.
  const kleidung = looks.filter(l => !!l.imageUrl && (!nurKleidung || nurKleidung.includes(l.id))).slice(0, 24);
  const selName = useCustom ? T.upTitle : (picked?.name ?? "");
  const selId = useCustom ? "custom" : (picked?.id ?? "");

  // ECHTE Generierung (Pixverse) — läuft nur nach Zahlung oder für Staff.
  const realGenerate = async (token: number): Promise<void> => {
    if (!selPhoto || !photo) return;
    setStatus(T.statusQuality);
    try {
      // Gleiche Pipeline wie Try-On: person = Model (@person), garment = dein Foto (@Bild2).
      const start = await fetch("/api/generate-tryon-video", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(pin ? { "x-try-look-admin-pin": pin } : {}) },
        body: JSON.stringify({ lookId: KISS_LOOK_ID, person: selPhoto, garment: photo, prompt: V.prompt }),
      }).then(r => r.json());
      if (!start?.videoId) { setStatus(start?.error || T.statusCouldNotStart); setBusy(false); return; }
      for (let i = 0; i < 72; i++) {
        await new Promise(r => setTimeout(r, 5000));
        if (runRef.current !== token) return;
        const p = await fetch(`/api/generate-tryon-video?videoId=${encodeURIComponent(start.videoId)}&curatorId=${encodeURIComponent(start.curatorId || "")}`).then(r => r.json()).catch(() => null);
        if (p?.status === "done" && p.videoUrl) {
          setVideoUrl(p.videoUrl); setTeaser(false); setStatus(""); setBusy(false); track("done");
          setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
          // Video-URL im Log nachtragen (Staff: Eintrag jetzt erst anlegen).
          try {
            if (genId) await fetch("/api/kiss-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ update: genId, videoUrl: p.videoUrl }) });
            else await fetch("/api/kiss-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modelId: selId, modelName: selName, videoUrl: p.videoUrl }) });
          } catch { /**/ }
          return;
        }
        if (p?.status === "failed") { setStatus(p.error || T.statusFailed); setBusy(false); return; }
      }
      setStatus(T.statusTimeout); setBusy(false);
    } catch { setStatus(T.statusNetwork); setBusy(false); }
  };

  // Klick auf „Generate": ein ECHTES Bild, kostenlos.
  //
  // Vorher lief hier eine gespielte Render-Show ohne einen einzigen Aufruf, danach ein
  // verpixeltes Bild und die Kasse. Ergebnis im eigenen Werkzeug: 9 Durchläufe, 0 Zahlungen —
  // niemand hat je erlebt, dass es mit seinem Gesicht funktioniert (Owner: „Ohne Gratis-Test
  // kaufe ich nichts"). Jetzt sieht er zuerst sich und sie, scharf. Bezahlt wird das VIDEO.
  const generate = async () => {
    /**
     * ZWEI EREIGNISSE, WEIL ES ZWEI DINGE SIND (Owner 31.07.2026, nach der Trichter-Auswertung:
     * „Adresse eingetippt" lag VOR „Bild erzeugt", was unmoeglich ist).
     *
     * Der Grund: `track("generate")` stand ganz oben — es feuerte also auch, wenn gleich danach
     * abgebrochen wurde, weil ein Foto fehlte oder die Adresse nicht kam. Gemessen wurde damit
     * „hat auf den Knopf getippt", angezeigt wurde „hat ein Bild erzeugt". Ein Trichter, dessen
     * Stufen sich widersprechen, ist schlimmer als keiner: Man trifft Entscheidungen darauf.
     *
     * Jetzt: `generate_tap` = er wollte, `generate` = es lief wirklich los. Die Luecke dazwischen
     * ist eine eigene Erkenntnis — dort steht heute die Adressabfrage.
     */
    track("generate_tap");
    if (!selPhoto || !photo || busy || mailBusy) return;
    /**
     * ERST DIE ADRESSE, DANN RECHNEN (Owner 30.07.2026). Kein Bild mehr auf seine Kosten für
     * jemanden, der nie eine Adresse hinterlässt. Wer angemeldet ist oder schon einmal
     * eingetragen hat, merkt davon nichts — `adresseDa` steht dann bereits.
     */
    zustimmen();   // wer hier tippt, hat den Hinweis bei Schritt 1 passiert
    /**
     * KEIN GRATIS-VERSUCH BEI DER HOCHZEIT (Owner 01.08.2026). Erst zahlen — aus dem
     * Guthaben, wenn eins da ist (dann ohne Kasse), sonst über Stripe. Nach der Zahlung
     * läuft `generate` von selbst weiter (`bezahlt` steht dann, der Wachhund übernimmt).
     */
    /**
     * EIN KLICK, DANN LAEUFT ES (Owner 03.08.2026: „hier muss er anfangen direkt zu
     * generieren wenn ich auf dem Button klicke — sonst ist es zu viel für die Leute").
     * Fuer Personal heisst das: direkt das Video, nicht das alte Gratis-Bild.
     */
    if (V.keinGratis && isStaff && !bezahlt) { setBezahlt(true); void kussVideo(); return; }
    if (V.keinGratis && !bezahlt && !isStaff) {
      if (!adresseDa) { const e = mail.trim(); if (!(await adresseVormerken(e))) return; }
      /**
       * KUSS: NUR GUTHABEN (Owner 02.08.2026). Reicht das Aufgeladene, bucht der Server
       * lautlos ab (`unlock("once")` faellt dann nie auf die 1,49-€-Kasse zurueck, weil sie
       * vorher schon abgebucht hat). Reicht es nicht, geht es direkt zur 9,99-€-Aufladung —
       * nie zur Einzel-Kasse.
       */
      // `videoPreisCents` statt fest {once}: Lingerie kostet mehr (Owner 03.08.2026).
      if (V.nurGuthaben && (guthabenCents ?? 0) < videoPreisCents) { void unlock("auflade"); return; }
      void unlock("once");
      return;
    }
    if (!isStaff && !adresseDa) {
      const e = mail.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
        setMailFehler(T.mailInvalid);
        mailRef.current?.focus();
        return;
      }
      if (!(await adresseVormerken(e))) { mailRef.current?.focus(); return; }
    }
    // AB HIER LAEUFT ES WIRKLICH — erst hier zaehlt der Trichter ein erzeugtes Bild.
    track("generate");
    setSchritt(4);   // eigener Bildschirm fürs Rendern
    setBusy(true); setTeaser(false); setVideoUrl(""); setBild(""); setGenId(""); setStatus("");
    const token = Date.now(); runRef.current = token;
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    // ZEITGEBER MERKEN UND ABBRECHEN. Vorher liefen die Fortschrittstexte einfach weiter und
    // haben die echte Antwort überschrieben: Die Anfrage war beantwortet — auch mit einem
    // Fehler wie „Vorlage abgelehnt" —, auf dem Schirm stand aber weiter „Finishing touches …"
    // und man wartete auf ein Bild, das nie kommt (Owner 30.07.2026: „wo ist die vorschau?").
    const timer: ReturnType<typeof setTimeout>[] = [];
    RENDER_AT.forEach((at, i) => {
      const text = T.renderSteps[i] ?? T.rendering;
      timer.push(setTimeout(() => { if (runRef.current === token) setStatus(text); }, at));
    });
    const stoppen = () => { for (const t of timer) clearTimeout(t); timer.length = 0; };
    try {
      let device = "";
      try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
      // ADMIN OHNE DECKEL (Owner 30.07.2026: „mach die Sperre für mich raus … damit ich das
      // testen kann"). Der Schlüssel liegt ohnehin im Gerät; wird er mitgeschickt, erkennt
      // die Route den Admin und zählt nicht mit. Für alle anderen bleibt der Deckel.
      let pin = "";
      try { pin = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { /**/ }
      const r = await fetch("/api/free-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(pin ? { "x-try-look-admin-pin": pin } : {}) },
        body: JSON.stringify({ person: photo, model: selPhoto, theme: variant === "wedding" ? "wedding" : "kiss", device, code, kleid, szene: kussSzeneId, email: mail.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      stoppen();
      if (runRef.current !== token) return;
      // 429 = Gratis-Bild schon genutzt. Nicht als Fehler zeigen, sondern als Angebot.
      if (r.status === 429 || d?.limit) {
        // Der Kasten stand weit unten und ging unter (Owner 30.07.2026: „ja das steht
        // tatsächlich, aber es geht unter"). Also hinspringen, wie beim Ergebnis auch.
        setGesperrt(true); setStatus(""); setBusy(false);
        /**
         * DEN KARTEN UNTEN BESCHEID SAGEN (Owner 31.07.2026: „ein zweites gibt es nicht, es
         * kostet Geld, ich habe das in 1 geändert" — und danach Weg 3 gewaehlt).
         *
         * Vier Karten mit „Personen ersetzen" versprechen vier Versuche. Es gibt genau einen.
         * Wer nach dem Verbrauch noch dreimal dieselbe Einladung liest, laedt zweimal Fotos
         * hoch und bekommt zweimal eine Absage — das ist der Moment, in dem Leute schliessen
         * statt zu kaufen. Ab jetzt tragen die Karten den Kaufknopf.
         *
         * Im Speicher, nicht nur im Zustand: Der Deckel gilt je Geraet und Tag, also muss die
         * Beschriftung auch einen Seitenwechsel ueberleben.
         */
        try { localStorage.setItem("lb_gratis_verbraucht", "1"); } catch { /* privater Modus */ }
        try { window.dispatchEvent(new CustomEvent("lb-gratis-verbraucht")); } catch { /**/ }
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
        return;
      }
      if (!r.ok || !d.image) {
        setStatus(d?.error ?? T.statusNotWork);
        setGescheitert(true); setBusy(false);
        // Er hat seine Adresse VORHER gegeben — also bekommt er auch im Fehlerfall Post:
        // „wir melden uns", statt still im Nichts zu enden.
        mailNachreichen("", true);
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
        return;
      }
      setBild(d.image); setBildPfad(d.imagePath ?? ""); setGesperrt(false); setGescheitert(false); setBusy(false); setStatus("");
      setFrischErzeugt(true);
      // Zum Ergebnis springen — das steht jetzt in der KARTE oben, nicht mehr im
      // Ergebnisbereich unten. Wer nach unten scrollen muss, glaubt, es sei nichts passiert.
      setTimeout(() => karteRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
      // SOFORT MERKEN, nicht erst nach der Adresse (Owner 30.07.2026: „das rendering ist
      // schon wieder abgebrochen" — nach ?cancelled=1 von Stripe). Beim Admin wird das
      // E-Mail-Feld übersprungen, also lief das Merken dort nie: Bild weg, sobald die Seite
      // neu lädt. Jetzt wird es abgelegt, sobald es da ist — für jeden.
      // Das Bild ist sofort sichtbar — die Adresse lag schon vor dem Rechnen vor. Und sie
      // bekommt jetzt, wofür sie gegeben wurde: das fertige Bild per Mail.
      setFrei(true);
      void merken(d.image, d.imagePath ?? "", genId, true);
      mailNachreichen(String(d.imagePath ?? ""));
      // Das Ergebnis an den Eintrag hängen, der beim Hochladen entstanden ist. Nur wenn
      // keiner existiert (z. B. Foto aus einer früheren Sitzung), einen neuen anlegen.
      try {
        if (genId) {
          await fetch("/api/kiss-log", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ update: genId, imagePath: d.imagePath }),
          });
        } else {
          const log = await fetch("/api/kiss-log", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ theme: variant, modelId: selId, modelName: selName, device, imagePath: d.imagePath, personPath: d.personPath }),
          }).then(r2 => r2.json());
          if (log?.id && runRef.current === token) genMerken(log.id);
        }
      } catch { /**/ }
    } catch {
      stoppen();
      if (runRef.current === token) { setStatus(T.statusNetwork); setBusy(false); }
    }
  };

  // AUS DEM BILD EIN VIDEO. Das erzeugte Bild geht als erster Vollbild an Pixverse; der
  // Bewegungstext ist der Satz des Owners OHNE die @-Marken — die binden Referenzfotos und
  // haben hier keine Bedeutung mehr, weil beide Personen schon im Bild stehen.
  const MOTION_PROMPT =
    "They look at each other and smile, lean in slowly, and share a brief, tender kiss. "
    + "Then they step back a little and smile at each other, happy. Keep both faces and "
    + "appearance exactly the same throughout. Fixed camera, no zoom, no camera movement. "
    + "Fluid natural motion, photorealistic, high-end look. No text or logos.";

  /**
   * DIE ADRESSE VORMERKEN — vor der ersten Rechnung, ohne Mail.
   *
   * Sie geht sofort in die Kissing-Liste und an den Log-Eintrag; geschickt wird noch nichts.
   * Die Mail folgt, wenn es etwas zu schicken gibt: das fertige Bild — oder, wenn die
   * Erzeugung scheitert, ein ehrliches „wir melden uns".
   */
  const adresseVormerken = async (e: string): Promise<boolean> => {
    setMailBusy(true); setStatus("");
    try {
      let device = "";
      try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
      const r = await fetch("/api/kiss-claim", {
        method: "POST", headers: { "Content-Type": "application/json" },
        // `land` und `lang` reisen mit — ohne sie steht der naechste Rundbrief wieder vor
        // 49 Empfaengern, deren Sprache niemand kennt (gemessen 31.07.2026).
        body: JSON.stringify({ email: e, device, genId, theme: variant, vorab: true, land, lang, consentAt: new Date().toISOString() }),
      });
      const d = await r.json().catch(() => ({}));
      // Die Absage gehoert ANS FELD, nicht in die Status-Zeile weiter unten — siehe mailFehler.
      if (!r.ok) { setMailFehler(d?.error ?? T.statusNotWork); setMailBusy(false); return false; }
      try { localStorage.setItem(MAIL_KEY, e); } catch { /**/ }
      setAdresseDa(true); setFrei(true); setMailBusy(false);
      // META: „Lead" = er hat seine Adresse dagelassen. Genau darauf soll die Kampagne
      // optimieren (Owner 30.07.2026) — und jetzt zählt sie auch die, bei denen das Bild
      // danach scheitert.
      trackMetaPixel("Lead", { content_category: variant });
      track("email");
      return true;
    } catch { setStatus(T.statusNetwork); setMailBusy(false); return false; }
  };

  /**
   * DAS TOR-FORMULAR (Owner 03.08.2026). Bestaetigt die im Tor eingetippte Adresse und laesst
   * danach GENAU DAS Foto nachlaufen, das den Deckel ausgeloest hat — der Besucher merkt vom
   * Umweg nichts, sein Tipp auf „Weiter" fuehlt sich an wie ein einziger Schritt.
   */
  const gateWeiter = async () => {
    const e = mail.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { setMailFehler(T.mailInvalid); mailGateRef.current?.focus(); return; }
    if (!(await adresseVormerken(e))) { mailGateRef.current?.focus(); return; }
    setGateOffen(false);
    const wartend = gateDatei.current; gateDatei.current = null;
    if (wartend?.art === "person") await onFileEcht(wartend.file);
    else if (wartend?.art === "model") await onModelFileEcht(wartend.file);
  };

  // Was wir ihm schicken, sobald es etwas zu schicken gibt. `pending` = es hat nicht
  // geklappt, wir melden uns. Ohne Adresse passiert nichts — dann gibt es auch keine.
  const mailNachreichen = (imagePath: string, pending = false) => {
    const e = mail.trim();
    if (!e) return;
    let device = "";
    try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
    void fetch("/api/kiss-claim", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: e, imagePath, device, genId, theme: variant, pending }),
    }).catch(() => {});
  };

  /**
   * DIE GESPIELTE SHOW VOR DER KASSE IST RAUS (Owner 31.07.2026: „ohne diesen Fake").
   *
   * Sie stammte vom 30.07.: „Fake loading und dann sagt: Oh mein Gott ist das heiss — zahlen
   * um das Ergebnis zu sehen … er hat naemlich nichts bezahlt, nur gegafft." Damals stimmte
   * das: Vor der Kasse gab es NICHTS zu sehen, also musste Spannung erzeugt werden.
   *
   * Seit dem Gratis-Bild ist die Lage umgedreht — sein fertiges Ergebnis liegt vor ihm. Vier
   * Sekunden Schauspiel darueberzulegen verschiebt den Kauf nur nach hinten und legt Text
   * ueber sein Bild. Ein Tipp auf den Knopf, und die Kasse geht auf.
   */

  /**
   * ANZIEHEN ueber FASHN — nicht ueber OpenAI (Owner 30.07.2026: „das geht nicht ueber
   * OpenAI. Dann wird das ganze Bild von ihr an FASHN weitergegeben, weil FASHN das
   * annimmt"). OpenAI prueft am EINGANG und weist Lingerie ab, bevor der Auftrag gelesen
   * wird; FASHN nimmt dasselbe Foto an. Scheitert es trotzdem, laeuft es mit dem
   * Ausgangsfoto weiter — der Kunde hat bezahlt und bekommt auf keinen Fall nichts.
   */
  const anziehen = async (wen: string, look: { id: string; name?: string; imageUrl?: string } | undefined, text: string) => {
    if (!look?.imageUrl || !wen) return wen;
    setStatus(text);
    try {
      const toFile = async (src: string, name: string) => new File([await (await fetch(src)).blob()], name, { type: "image/jpeg" });
      const fd = new FormData();
      fd.append("modelImage", await toFile(wen, "person.jpg"));
      fd.append("image", await toFile(look.imageUrl, "garment.jpg"));
      fd.append("lookId", look.id);
      fd.append("mode", "fashion-model");
      fd.append("aspectRatio", "9:16");
      fd.append("prompt", tryonPrompt({ garment: look.name || "" }));
      const d = await fetch("/api/generate-fashn", {
        method: "POST", body: fd, ...(pin ? { headers: { "x-try-look-admin-pin": pin } } : {}),
      }).then(r => r.json());
      return (d?.image || d?.imageUrl || wen) as string;
    } catch { return wen; }
  };

  /**
   * DAS BEZAHLTE VIDEO — erst anziehen, dann filmen.
   *
   * Reihenfolge ist Pflicht: `holidayPrompt` nennt @image1 (den Mann) zuerst, und Pixverse
   * ordnet das erste Token dem ersten Bildplatz zu. Also SEIN Foto als `person`, ihr
   * angezogenes als `garment`. Wer nur die Token tauscht, bekommt zwei Maenner.
   */
  const kussVideo = async () => {
    if (videoBusy || !selPhoto || !photo) return;
    setWahl(false); setVideoBusy(true); setStatus("");
    /**
     * DIALOG ZU, RADAR SICHTBAR (Owner 03.08.2026: „es muss zum Radar-Rendering kommen wo
     * das Video gezeigt wird"). Der Schritte-Dialog liegt als Vollbild-Schicht UEBER der
     * Seite — der Radar lief dahinter und niemand sah ihn. Er schloss bisher erst ab
     * Schritt 4; beim Ein-Klick-Video bleibt der Trichter aber auf Schritt 3 stehen.
     */
    setStufenOffen(false);
    const token = Date.now(); runRef.current = token;
    // Hinspringen, wo das Rendern zu sehen ist: Mit Bild liegt die Anzeige auf der KARTE,
    // ohne Bild laeuft der Radar im Ergebnisbereich unten.
    setTimeout(() => (bild ? karteRef : resultRef).current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    // Keine Szene gewaehlt? Dann nimmt das System eine — „wenn er keine auswaehlt, dann
    // irgendeine automatisch". Er wartet nie wegen einer Pflichtangabe.
    const szene: HolidayScene = HOLIDAY_SCENES.find(x => x.id === szeneId)
      ?? HOLIDAY_SCENES[Math.floor(Date.now() / 1000) % HOLIDAY_SCENES.length];
    try {
      /**
       * LINGERIE HEISST: SIE WIRD ANGEZOGEN, IMMER (Owner 03.08.2026: „dafür musst du die
       * Frau mit FASHN in einer unserer Lingerie-Bilder anziehen und dann in Video
       * umwandeln"). Der 3,99-Preis BEZAHLT diesen FASHN-Lauf — liefe er nur, wenn der Kunde
       * zufaellig in der Garderobe etwas antippt, haette er fuer nichts mehr gezahlt.
       * Gewaehlt hat Vorrang; ohne Wahl nimmt das System einen Lingerie-Look aus der
       * Garderobe (am Namen erkannt — dieselben Woerter, mit denen die Looks gepflegt sind).
       */
      const ihrGewaehlt = looks.find(l => l.id === ihrLook);
      /**
       * DIE WAESCHE DER VORLAGE ALS STANDARD (Owner 03.08.2026: „wir haben in der Galerie
       * eine rote Wäsche … wenn du nicht unsere an FASHN gibst, wird er es dir nicht genauso
       * machen" — und: „der Kunde kann die Wäsche auch noch aussuchen"). Rangfolge also:
       * SEINE Wahl aus der Waesche-Zeile → das Stueck, mit dem das Beispielvideo entstand
       * (garment an der Vorlage) → Namens-Match als letztes Netz.
       */
      const vorlagenGarment = kussLingerie(kussSzeneId)?.garment
        ?? (kussSzene(kussSzeneId)?.lingerie ? "look-1783241820256-374a4401" : "");
      const ihrVorlage = ihrGewaehlt
        ?? looks.find(l => l.id === vorlagenGarment)
        ?? (lingerieGewaehlt
          ? kleidung.find(l => /lingerie|dessous|lace|corset|bodysuit|boudoir|negligee/i.test(l.name ?? "")) ?? kleidung[0]
          : undefined);
      const ihr = await anziehen(selPhoto, ihrVorlage, T.dressingHer);
      if (runRef.current !== token) return;
      const sein = await anziehen(photo, looks.find(l => l.id === seinLook), T.gettingReady);
      if (runRef.current !== token) return;
      setStatus(T.renderingVideo);
      const start = await fetch("/api/generate-tryon-video", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(pin ? { "x-try-look-admin-pin": pin } : {}) },
        // AUFLOESUNG NOCH NICHT UMGESTELLT (Owner 30.07.2026: „ok, aber jetzt noch nicht
        // umstellen"). Die Route kann 540p — sie wird nur noch nicht danach gefragt, damit
        // die Testlaeufe billig bleiben. Umlegen ist ein Wort: `hd: true` ergaenzen.
        // KUSS AUF DER KUSS-SEITE (Owner 30.07.2026: „sie müssen sich küssen"). Ohne diesen
        // Schalter endete das bezahlte Video in einer Umarmung — auf genau dem Thema, für das
        // er bezahlt hat. Bei „Your Idol" bleibt es beim gemeinsamen Moment.
        // `genId` weist ihn als bezahlten Auftrag aus — sonst laeuft er in den Tagesdeckel
        // fuer Gaeste (1 Video pro Tag) und liest als Zahler "Free limit reached".
        body: JSON.stringify({ lookId: KISS_LOOK_ID, genId, person: sein, garment: ihr, prompt: variant === "wedding" ? weddingPrompt(kleid)
            /* Gewaehlte Szene → ihr BEHALTENER Video-Prompt (lib/kuss-szenen), wortgleich —
               der Kunde hat genau diese Kulisse bestellt. Ohne Wahl wie bisher. */
            /* MIT RAHMEN, nicht mehr roh (Owner 03.08.2026: „falsche Personen im video"):
               Der nackte Szenen-Satz enthielt kein @-Token, also band Pixverse die zwei
               Fotos an Namen, die im Auftrag nie vorkamen — und erfand ein fremdes Paar.
               Lingerie-Vorlagen (public/Kisslingerie) tragen ihren eigenen Owner-Prompt. */
            : (() => { const lv = variant === "kiss" ? kussLingerie(kussSzeneId) : null;
                       if (lv) return lv.video;
                       const sz = variant === "kiss" ? kussSzene(kussSzeneId) : null;
                       return sz ? kussSzeneVideoPrompt(sz) : holidayPrompt(szene, { kuss: variant === "kiss" }); })() }),
      }).then(r => r.json());
      if (!start?.videoId) {
        // Kontingent aufgebraucht: eigener Satz in seiner Sprache — und ein Weg weiter,
        // statt einer Sackgasse.
        if (start?.extraNeeded) {
          /**
           * BEIM KUSS: AM STUECK WEITER, KEIN KASTEN (Owner 03.08.2026: „Das versteht
           * niemand auf der Welt. Das muss am Stück passieren").
           *
           * „extraNeeded" heisst hier nur: die ALTE Auftragsnummer ist mit ihrem einen
           * Video abgegolten (Einzelkauf = ein Video). Der Kunde will das naechste — also
           * erledigt der Trichter den Papierkram selbst, mitten im Lauf: frischer Eintrag
           * mit denselben Fotos, neue Nummer, Abbuchung uebers normale Guthaben
           * (`unlock("once")`), und der Zahlungs-Wachhund startet die Erzeugung von allein.
           * Ein Klick aussen, eine Kette innen.
           */
          if (variant === "kiss") {
            setStatus(T.oneMoment);
            let device = "";
            try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
            const log = await fetch("/api/kiss-log", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ theme: variant, modelId: selId, modelName: selName, device, lang, email: mail.trim(),
                personImage: photo, ...(useCustom && customModel ? { modelImage: customModel } : {}) }),
            }).then(r => r.json()).catch(() => null);
            setVideoBusy(false);
            if (log?.id) {
              genMerken(log.id);
              setBezahlt(false);
              void unlock("once", log.id);   // bucht vom Guthaben ab; danach liefert der Wachhund
              return;
            }
            setStatus(T.statusCouldNotStart); return;
          }
          setExtraNoetig(true); setVideosLinks(0); setStatus("");
          // Die Verbraucht-Meldung samt Kaufknopf steht im Ergebnisbereich unten — er aber
          // an der Karte oben (Owner 31.07.2026: „muss doch die Meldung kommen: verbraucht,
          // und jetzt kaufen"). Ohne den Sprung sieht er nur, dass nichts passiert.
          setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
        }
        else setStatus(start?.error ?? T.statusCouldNotStart);
        setVideoBusy(false); setWahl(true); return;
      }
      /**
       * DIE AUFTRAGSNUMMER GEHT SOFORT AN DEN SERVER (Owner 30.07.2026: „Server liefert das
       * bezahlte Video"). Ab hier ist der Auftrag nicht mehr nur in diesem Browser bekannt:
       * schliesst er das Fenster, bringt `/api/kiss-deliver` DENSELBEN Auftrag zu Ende und
       * schickt das Video per Mail — statt einen zweiten zu bezahlen.
       */
      if (genId) {
        void fetch("/api/kiss-log", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ update: genId, videoId: start.videoId }),
        }).catch(() => {});
      }
      for (let i = 0; i < 90; i++) {
        await new Promise(res => setTimeout(res, 4000));
        if (runRef.current !== token) return;
        setStatus(T.makingVideo(Math.round((i + 1) * 4)));
        const q = await fetch(`/api/generate-tryon-video?videoId=${encodeURIComponent(start.videoId)}&curatorId=${encodeURIComponent(start.curatorId || "")}`).then(r => r.json()).catch(() => null);
        if (q?.status === "done" && q.videoUrl) {
          setVideoUrl(q.videoUrl); setStatus(""); setVideoBusy(false);
          setVideosLinks(v => (typeof v === "number" ? Math.max(0, v - 1) : v));
          try { if (genId) await fetch("/api/kiss-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ update: genId, videoUrl: q.videoUrl }) }); } catch { /**/ }
          return;
        }
        if (q?.status === "failed") { setStatus(q.error || T.videoFailed); setVideoBusy(false); setWahl(true); return; }
      }
      setStatus(T.statusTimeout); setVideoBusy(false); setWahl(true);
    } catch { setStatus(T.statusNetwork); setVideoBusy(false); setWahl(true); }
  };

  /**
   * DIE EINLADUNG ENTSTEHT SCHON AUS DEM GRATIS-BILD (Owner 31.07.2026: „lass doch die Seite
   * bauen für gratis für die Leute, mit dem Bild nur und Chat und alles").
   *
   * Vorher brauchte es das bezahlte Video. Damit stand der einzige Kanal, der sich selbst
   * weitertraegt, hinter der Kasse — und wurde nie benutzt. Jetzt verschickt sie die Einladung
   * in der Probewoche an ihre fuenfzig bis hundertfuenfzig Gaeste, und jeder von ihnen sieht,
   * was das Ding kann, bevor irgendjemand bezahlt hat.
   */
  /**
   * NACH DEM BILD DIREKT IN DIE EINLADUNG (Owner 31.07.2026: „nach dem sie das Bild generiert
   * haben, sehen sie direkt das hier und dann werden sie es editieren können und sharen").
   *
   * Vorher war ein Knopf dazwischen („Als Einladung verschicken"). Ein Knopf ist eine Frage,
   * und an dieser Stelle ist die Antwort immer ja — sie ist wegen der Einladung hier. Also
   * steht das Formular schon offen, wenn ihr Bild fertig ist.
   */
  useEffect(() => {
    if (variant === "wedding" && bild && !einlUrl) setEinlOffen(true);
  }, [variant, bild, einlUrl]);

  /**
   * DER WACHHUND ZUR ZAHLUNG (gesetzt bei der Stripe-Rueckkehr und im Kassen-Fenster):
   * Sobald beide Fotos da sind, laeuft der bezahlte Auftrag los — genau einmal.
   *
   * Er steht hier unten, weil er `kussVideo` ruft und das `selPhoto` braucht; weiter oben
   * waeren beide noch nicht deklariert.
   *
   * Ohne Fotos kann er nicht laufen. Das ist kein Verlust: Der Server liefert denselben
   * Auftrag ohnehin nach (`/api/kiss-deliver`) und schickt das Video per Mail — die Adresse
   * liegt seit Schritt 3 vor. Hier geht es nur darum, dass er es SIEHT.
   */
  useEffect(() => {
    if (!nachZahlungLiefern.current) return;
    if (videoUrl || videoBusy) { nachZahlungLiefern.current = false; return; }
    if (!selPhoto || !photo) return;   // warten, bis der Speicher sie zurueckgegeben hat
    nachZahlungLiefern.current = false;
    void kussVideo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selPhoto, photo, videoUrl, videoBusy, bezahlt]);

  const einladungAnlegen = async () => {
    if ((!videoUrl && !bild) || !einlSie.trim() || !einlEr.trim() || einlBusy) return;
    setEinlBusy(true);
    let device = "";
    try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
    try {
      const r = await fetch("/api/einladung", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl, bildPfad: videoUrl ? "" : bildPfad, genId, device, lang,
          sie: einlSie.trim(), er: einlEr.trim(),
          adresse: einlAdresse.trim(), telefon: einlTelefon.trim(),
          datum: einlDatum, ort: einlOrt.trim(), email: mail.trim(),
        }),
      }).then(x => x.json());
      if (r?.url) { setEinlUrl(r.url); track("einladung"); }
      else setStatus(r?.error ?? T.statusNotWork);
    } catch { setStatus(T.statusNetwork); }
    setEinlBusy(false);
  };

  const zuVideo = async () => {
    if (!bild || videoBusy) return;
    setVideoBusy(true); setStatus("");
    const token = Date.now(); runRef.current = token;
    try {
      const start = await fetch("/api/generate-tryon-video", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lookId: KISS_LOOK_ID, image: bild, prompt: MOTION_PROMPT }),
      }).then(r => r.json());
      if (!start?.videoId) { setStatus(start?.error ?? "Video-Start fehlgeschlagen."); setVideoBusy(false); return; }
      for (let i = 0; i < 90; i++) {
        await new Promise(res => setTimeout(res, 4000));
        if (runRef.current !== token) return;
        setStatus(T.makingVideo(Math.round((i + 1) * 4)));
        const p = await fetch(`/api/generate-tryon-video?videoId=${encodeURIComponent(start.videoId)}&curatorId=${encodeURIComponent(start.curatorId || "")}`).then(r => r.json()).catch(() => null);
        if (p?.status === "done" && p.videoUrl) {
          setVideoUrl(p.videoUrl); setStatus(""); setVideoBusy(false);
          try { if (genId) await fetch("/api/kiss-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ update: genId, videoUrl: p.videoUrl }) }); } catch { /**/ }
          return;
        }
        if (p?.status === "failed") { setStatus(p.error || "Das Video ist fehlgeschlagen."); setVideoBusy(false); return; }
      }
      setStatus(T.statusTimeout); setVideoBusy(false);
    } catch { setStatus(T.statusNetwork); setVideoBusy(false); }
  };

  /**
   * DER KAUFWEG — drei Fälle, ein Knopf:
   *   "once"  → ein Video für {once} (kein Abo)
   *   "abo"   → das Monatsabo
   *   "extra" → EIN weiteres Video für {extra}, wenn das Monatskontingent leer ist
   */
  // `genIdFrisch`: wer GERADE einen neuen Eintrag angelegt hat, reicht die Nummer hier
  // direkt durch — der React-Zustand traegt sie erst einen Render spaeter (03.08.2026).
  const unlock = async (einmal: "once" | "abo" | "extra" | "auflade" = "abo", genIdFrisch?: string) => {
    // Derselbe Fehler wie bei `generate`: Das Ereignis stand vor jeder Pruefung und meldete
    // den Tipp, nicht die Kasse. `checkout_tap` = er wollte, `checkout` = Stripe ist offen.
    track("checkout_tap");
    if (payBusy) return;
    if (isStaff) {
      // Auch der Admin-Weg fuehrt in die Auswahl — sonst testet er einen Ablauf, den der
      // Kunde nie sieht.
      setBezahlt(true);
      return;
    }
    setPayBusy(true); setStatus("");
    /**
     * DAS FENSTER SOFORT OEFFNEN, VOR JEDEM AWAIT (Owner 03.08.2026: „wieso gehts hier nicht
     * weiter?"). Browser erlauben `window.open` ohne Blockade nur, wenn es NOCH im selben
     * Atemzug wie der Klick steht. Ein `await fetch(...)` davor reicht vielen Browsern (vor
     * allem Safari und mobiles Chrome) schon, um das Fenster STILL zu blockieren — kein
     * Fehler, keine Meldung, einfach nichts. Deshalb steht das leere Fenster jetzt VOR der
     * Anfrage; die Adresse traegt es erst nach, wenn sie da ist.
     */
    const popup = window.open("", "_blank", "popup,width=480,height=780");
    trackMetaPixel("InitiateCheckout", { currency: "EUR", content_name: einmal === "abo" ? "Topic subscription" : einmal === "extra" ? "Extra video" : "Kiss video" });
    try {
      const start = await fetch("/api/kiss-video-checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, genId: genIdFrisch ?? genId, once: einmal === "once", extra: einmal === "extra", aufladen: einmal === "auflade", lingerie: lingerieGewaehlt, email: mail.trim(), subId: new URLSearchParams(window.location.search).get("s") || "", returnTo: window.location.pathname + window.location.search }) }).then(r => r.json());
      /**
       * VOM GUTHABEN BEZAHLT (Owner 01.08.2026): Der Server hat abgebucht, gestempelt und die
       * Lieferung vorgemerkt — hier ist die Zahlung damit BESTÄTIGT, ohne Kasse, ohne Fenster.
       * Derselbe Weg wie nach einer Stripe-Zahlung: Auftrag laeuft von selbst los.
       */
      if (start?.walletPaid) {
        try { popup?.close(); } catch { /**/ }   // das leere Fenster wurde nie gebraucht
        trackMetaPixel("Purchase", { currency: "EUR", content_name: "Kiss video (wallet)" });
        track("checkout");
        setGuthabenCents(typeof start.rest === "number" ? start.rest : null);
        setPayBusy(false);
        setBezahlt(true);
        /**
         * SOFORT LIEFERN, AUCH BEI OFFENEM DIALOG (Owner 03.08.2026: „direkt generieren
         * wenn ich auf den Button klicke"). Das alte `!stufenOffen` stammt aus der Zeit, als
         * die Auswahl NACH der Zahlung kam — heute waehlt er Szene und Waesche VOR dem
         * Klick; nach der Abbuchung noch einmal denselben Knopf zu verlangen, ist die eine
         * Huerde zu viel, an der Leute aussteigen.
         */
        nachZahlungLiefern.current = true;
        return;
      }
      if (!start?.url || !start?.sessionId) {
        try { popup?.close(); } catch { /**/ }
        setStatus(start?.error || T.statusCouldNotStart); setPayBusy(false); return;
      }
      // Die Kasse ist wirklich da — vorher war jeder Fehlschlag als „zur Kasse" gezaehlt.
      track("checkout");
      // Popup blockiert → gleiche Seite. Lieber ein Seitenwechsel als eine tote Warteschleife.
      if (!popup) { window.location.href = start.url; return; }
      try { popup.location.href = start.url; }
      catch { try { popup.close(); } catch { /**/ } window.location.href = start.url; return; }
      for (let i = 0; i < 100; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const s = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(start.sessionId)}`).then(r => r.json()).catch(() => null);
        if (s?.paid) {
          try { popup.close(); } catch { /**/ }
          setPayBusy(false);
          /**
           * AUFLADUNG BEZAHLT → jetzt NAHTLOS das gewuenschte Video vom frischen Guthaben
           * kaufen (Owner 01.08.2026). Er hat 9,99 geladen, weil er DIESES Video wollte —
           * ihn danach noch einmal auf den Kaufknopf zu schicken, waere eine zweite Huerde.
           */
          if (einmal === "auflade") {
            if (typeof s.walletCents === "number") setGuthabenCents(s.walletCents);
            trackMetaPixel("Purchase", { currency: "EUR", content_name: "Account credit" });
            void unlock("once");
            return;
          }
          trackMetaPixel("Purchase", { currency: "EUR", content_name: einmal === "abo" ? "Topic subscription" : einmal === "extra" ? "Extra video" : "Kiss video" });
          // BEZAHLT → AUSSUCHEN, nicht sofort rendern (Owner 30.07.2026: „Na gut und jetzt?
          // Wann kann er sich die Klamotten und die Szene auswaehlen?"). Vorher lief hier
          // direkt das alte Rendern des Standbildes los — die Auswahl bekam er nie zu sehen,
          // egal ob er ueber das Kassen-Fenster oder ueber die Rueckleitung kam.
          setBezahlt(true);
          // Auswahl ist seit 03.08.2026 VOR der Kasse (Szene + Waesche am Schritt 3) —
          // also nach der Zahlung immer sofort liefern, Dialog offen oder nicht.
          if (einmal === "once") nachZahlungLiefern.current = true;
          else if (!stufenOffen) nachZahlungLiefern.current = true;
          return;
        }
        /**
         * SCHLUSS OHNE STILLE (Owner 03.08.2026). Vorher brach diese Schleife bei
         * geschlossenem Fenster ab und `payBusy` ging aus — OHNE ein Wort. Wer das Fenster
         * zu frueh schloss (oder dessen Browser es nie wirklich geoeffnet hatte), sah den
         * Knopf einfach wieder im Ausgangszustand und wusste nicht, ob er nochmal tippen soll.
         */
        if (popup.closed && i > 2) { setStatus(T.statusPayCancelled); break; }
      }
      setStatus(s => s || T.statusPayCancelled);
      setPayBusy(false);
    } catch { try { popup?.close(); } catch { /**/ } setStatus(T.statusNetwork); setPayBusy(false); }
  };

  /**
   * NACH DER AUFLADUNGS-RUECKKEHR den gewuenschten Kauf anschliessen (Owner 01.08.2026).
   * Steht hinter `unlock`, weil er es ruft; ein Ref statt State, damit es genau EINMAL
   * feuert. `unlock("once")` findet das frische Guthaben und antwortet walletPaid — ohne
   * Kasse, ohne Fenster; danach uebernimmt der Zahlungs-Wachhund wie bei jeder Zahlung.
   */
  useEffect(() => {
    if (!nachAufladungKaufen.current) return;
    if (!mail.trim()) return;   // warten, bis die Adresse aus dem Speicher zurueck ist
    nachAufladungKaufen.current = false;
    /**
     * WOFUER hat er aufgeladen? Hat er noch KEIN Bild, wollte er eins (Kuss ab dem zweiten
     * Versuch, oder die Hochzeit, die von Anfang an kostet) — dann erzeugen. Liegt schon ein
     * Bild da, wollte er das VIDEO. Zwei Wege, eine Rueckkehr.
     */
    if (!bild) { void generate(); return; }
    if (!genId) return;
    void unlock("once");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genId, mail, guthabenCents, bild]);

  return (
    <div className="mt-8">
      {/* ZURUECK IN DER SPRACHZEILE, EINE REIHE (Owner 30.07.2026: „Back Button in dem Balken
          mit den Sprachen stehen" / „in einer Reihe"). `mr-auto` schiebt ihn in der
          rechtsbuendigen Zeile nach links — Zurueck links, Sprache rechts, kein zweiter
          Balken. Erst ab Schritt 2, denn von Schritt 1 fuehrt kein Weg zurueck. */}
      {/* DANEBEN DER HELL/DUNKEL-SCHALTER (Owner 30.07.2026: „mach mir bitte einen Schalter
          für light und dark version neben den Backbutton rechts"). Er steht IMMER da, auch auf
          Schritt 1 — dort trifft der Anzeigenklick auf, und genau dort entscheidet sich, ob
          ihn der schwarze Grund abschreckt. `mr-auto` sitzt auf dem jeweils linken Knopf,
          damit die Zeile eine bleibt: links Zurueck + Schalter, rechts die Sprache. */}
      {langZeile && createPortal(
        <>
          {/* `order` statt `mr-auto`: Die Sprachwahl steht im Balken zuerst im Quelltext, soll
              aber rechts aussen bleiben — dort klappt ihr Menue ins Bild und nicht heraus.
              Negative Reihenfolge zieht Zurueck und den Schalter davor. */}
          {/* ZURUECK STEHT JETZT AM BILD, nicht hier oben (Owner 31.07.2026: „Zurückbutton
              machst du neben dem Bild bitte"). In der Kopfzeile stand er neben Hell/Dunkel und
              Sprache — also zwischen Einstellungen, obwohl er zum Trichter gehoert. Am Bild
              ist er dort, wo der Daumen ohnehin liegt. */}
          <span className="order-[-1] mr-2"><LightSwitch /></span>
        </>,
        langZeile,
      )}
      {/* 1) Model wählen — das 3D-Coverflow aus dem Try-On-Funnel: die Gewählte steht groß
          vorn, die Nachbarinnen kippen seitlich weg; Tipp auf eine Seitenkarte oder Swipe
          holt sie nach vorn (= Auswahl). */}
      {/* ── DIE KARTE. Immer sichtbar, immer oben. ────────────────────────────────────────
          Sie zeigt das Ergebnis, sobald es da ist — davor das Beispielvideo des Themas. So
          sieht der Besucher in der ersten Sekunde, was entsteht, statt es sich vorstellen zu
          muessen. Ein Tipp auf den Knopf darunter oeffnet die Schritte.

          OHNE NAMEN: Beim Kuss gibt es kein Brautpaar. Dieselbe Karte, nur die Namenszeile
          faellt weg (siehe EinladungKarte). */}
      {/* SEIN KONTINGENT, GANZ OBEN (Owner 31.07.2026: „er muss oben sein Kontingent sehen,
          1/3 Videos"). Dieselbe Zeile stand nur im Dialog bei Schritt 3 — ein Abonnent, der
          die Seite oeffnet, sah nirgends, wo er steht. Sie erscheint nur, wenn wir ihn kennen
          (Adresse da und Abo oder Guthaben) — fuer den Erstbesucher ist „0 von 12" keine
          Auskunft, sondern eine Drohung. */}
      {/* DAS EURO-GUTHABEN, sichtbar (Owner-Idee: „Anzeige noch 2 Videos übrig — sichtbar,
          sonst wirkt das Guthaben wie weg"). Umgerechnet in Videos zum AKTUELLEN Preis —
          das Guthaben ist Geld, die Zahl daneben nur seine Übersetzung. */}
      {/**
        * AUCH BEI NULL ANZEIGEN (Owner 03.08.2026: „dann muss doch oben stehen sein
        * Kontostand" — im selben Atemzug mit dem Abschalten der Gratis-Videos).
        *
        * Die Zeile stand vorher unter `guthabenCents > 0` und verschwand damit genau in dem
        * Moment, in dem sie am meisten sagt: wenn nichts mehr drauf ist. Solange es ein
        * Gratis-Video gab, war das verschmerzbar — jetzt ist das Guthaben der EINZIGE Weg zu
        * einem Video, und ein leeres Konto ist die wichtigste Auskunft der Seite.
        *
        * `adresseDa` bleibt Bedingung: Einem Erstbesucher, den wir noch gar nicht kennen,
        * „Guthaben: 0,00 €" entgegenzuhalten, ist keine Auskunft, sondern eine Abweisung —
        * dieselbe Ueberlegung wie bei der Kontingent-Zeile darunter.
        */}
      {typeof guthabenCents === "number" && (adresseDa || guthabenCents > 0) && !isStaff && (
        <p className="mb-2 text-center text-[11px] font-bold text-[#f6cf51]">
          {T.guthaben}: {(guthabenCents / 100).toFixed(2).replace(".", ",")} € · {Math.floor(guthabenCents / ONCE_CENTS)} 🎬
        </p>
      )}
      {typeof videosLinks === "number" && (aboAktiv || videosLinks > 0) && (
        <p className="mb-2 text-center text-[11px] font-bold text-[#f6cf51]">
          {T.aboAktiv(videosLinks, INCLUDED_VIDEOS_PER_MONTH)}
        </p>
      )}
      <div ref={karteRef}>
      <EinladungKarte
        sprache={lang} sie="" er="" demo
        titel={String(T.step3 ?? "").replace(/^\s*\d+\s*[·.\-]\s*/, "")}
        video={
          /* DAS ERGEBNIS GEHOERT IN DIE KARTE (Owner 31.07.2026: „auf dieser Seite will ich
             nicht mein Bild als zweiter Stelle sehen. Es muss in die Karte sein und Replace
             People Button wieder drauf").
             Ich hatte hier zwischen „gerade erzeugt" und „wiederhergestellt" unterschieden,
             damit ein altes Bild nicht das Beispielvideo verdeckt. Der Anlass dafuer war aber
             ein anderer: Es gab damals GAR KEIN Beispielvideo (examplePaths war leer). Jetzt
             gibt es eines — und wer ein Ergebnis hat, will es sehen, nicht suchen. Ohne
             Ergebnis laeuft weiter das Beispiel. */
          videoUrl ? (
            /* DAS BEZAHLTE VIDEO WOHNT IN DER KARTE (Owner 01.08.2026: „die Generierung ist
               weiter unten … muss in einer Karte sein, auch mit Herzchen und sharen können").
               Vorher lief es im Ergebnisbereich unter der Seite — wer nicht scrollte, sah nach
               „Payment received" nichts weiter und wusste nicht, ob es haengt. Jetzt: dieselbe
               Karte wie beim Bild, Tap-Play-Spieler, Herzchen, Teilen als DATEI, Download im
               Griff. Die Seite springt hierher, sobald das Video eintrifft (useEffect). */
            <div className="relative">
              <EinladungAnsicht id="" videoUrl={videoUrl} zaehlen={false}
                tonText={(KARTE_TEXTE[lang] ?? KARTE_TEXTE.en).ton}
                tonAusText={(KARTE_TEXTE[lang] ?? KARTE_TEXTE.en).tonAus} />
              <Reaktionen variant={variant} />
              {genId ? (
                <button type="button" onClick={() => setShareFrage(true)}
                  aria-label={(KARTE_TEXTE[lang] ?? KARTE_TEXTE.en).teilen}
                  style={{ background: "#fff", color: "#1a160f", boxShadow: "0 2px 10px rgba(0,0,0,0.35)" }}
                  className="absolute left-2 top-2 z-30 grid h-10 w-10 place-items-center rounded-full transition active:scale-90">
                  <Send className="h-5 w-5" />
                </button>
              ) : (
                <TeilenKnopf rund datei={videoUrl} dateiName={variant}
                  text={TEILEN_TEXT[lang] ?? TEILEN_TEXT.en}
                  label={(KARTE_TEXTE[lang] ?? KARTE_TEXTE.en).teilen}
                  kopiertLabel={(KARTE_TEXTE[lang] ?? KARTE_TEXTE.en).zusDanke}
                  className="absolute left-2 top-2 z-30" />
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 p-4">
                <a href={videoUrl} download={V.done} target="_blank" rel="noreferrer"
                  className="lb-gold pointer-events-auto flex h-12 w-full items-center justify-center rounded-full text-[14px] font-black shadow-[0_6px_20px_rgba(0,0,0,0.35)] active:scale-95 transition">
                  {T.download}
                </a>
              </div>
            </div>
          ) : bild ? (
            <div className="relative">
              {/* Die eigene Tonspur (nur wo `V.musik` steht, heute die Hochzeit). Sie hing am
                  alten Ergebnis-Block; der ist aufgeloest, das Bild lebt hier. */}
              {V.musik && (<>
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <audio ref={musikRef} src={V.musik} loop preload="none" />
                <TonKnopf an={ton} label={(KARTE_TEXTE[lang] ?? KARTE_TEXTE.en).ton}
                  onClick={() => { const n = !ton; setTon(n); try { localStorage.setItem("lb_ton", n ? "1" : "0"); } catch { /**/ } }}
                  className="z-40" />
              </>)}
              {/* UNSCHARF, SOLANGE KEINE ADRESSE DA IST — derselbe Schleier wie frueher im
                  Ergebnis-Block. Heute wird die Adresse VOR der Erzeugung eingesammelt, also
                  greift er praktisch nie mehr; er bleibt als Netz fuer alte gemerkte Staende,
                  bei denen `frei` noch nicht gesetzt war. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bild} alt="" width={1024} height={1536}
                className={`block h-auto w-full transition ${frei || isStaff ? "" : "blur-2xl scale-105"}`} />
              {/* DIE HERZCHEN WEICHEN, SOBALD ETWAS ZU LESEN IST (Owner 31.07.2026: „was
                  passiert jetzt hier?" — zur Meldung „Kasse wird geoeffnet", die unter
                  fliegenden Herzen und Zurufen lag).
                  Sie liegen ueber dem Bild und sind Schmuck; eine Auskunft ueber sein Geld
                  ist keiner. Wo beide um dieselbe Flaeche streiten, gewinnt die Auskunft. */}
              {(frei || isStaff) && !payBusy && !videoBusy && !bezahlt && <Reaktionen variant={variant} />}

              {/* DIE GESPIELTE RENDER-SHOW IST RAUS (Owner 31.07.2026: „ohne diesen Fake").
                  Sie stammte aus der Zeit, in der es vor der Kasse NICHTS zu sehen gab —
                  vier Sekunden Schauspiel als Ersatz fuer ein Ergebnis. Heute liegt sein
                  fertiges Bild darunter; die Spannung ist echt und braucht kein Vorspiel.
                  Was blieb, ist die Anzeige fuer das, was wirklich rechnet (unten). */}

              {/* BEZAHLT ODER AUF DEM WEG DORTHIN — niemals wieder die Kasse zeigen.
                  Owner 30.07.2026: „schon wieder springt er vom Stripe zurück zum Zahlen."
                  Waehrend Zahlung und Rendern steht hier, was gerade passiert. */}
              {(payBusy || (bezahlt && !wahl) || videoBusy) && !videoUrl && !isStaff && (
                /* VOLLER, RUHIGER GRUND STATT DURCHSCHEINEND (Owner 31.07.2026: „was passiert
                   jetzt hier?"). Bei `bg-black/70` kaempft jeder Buchstabe gegen das Motiv
                   darunter; bei 0.88 liest es sich auf jedem Bild. */
                <div className="absolute inset-0 z-30 grid place-items-center p-5" style={{ background: "rgba(0,0,0,0.88)" }}>
                  {/* DER RADAR LAEUFT MIT (Owner 31.07.2026: „Radar-Rendering muss kommen …
                      es sieht so aus als würde nichts mehr kommen"). Ein stehender Text sagt
                      nicht, ob etwas laeuft oder haengt. Der wandernde Balken sagt es ohne
                      ein Wort — dieselbe Anzeige wie beim Gratis-Bild, damit er sie kennt. */}
                  <span className="lb-scanline pointer-events-none absolute inset-x-0 h-[2px] bg-white shadow-[0_0_18px_5px_rgba(255,255,255,0.7)]" />
                  <div className="relative w-full max-w-[300px] text-center">
                    <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#f6cf51]" />
                    <p className="lb-onmedia mt-3 text-[16px] font-black">
                      {bezahlt || videoBusy ? T.payReceived : T.payOpening}
                    </p>
                    <p className="lb-onmedia mt-1 text-[12px] font-bold opacity-85">
                      {status || (bezahlt || videoBusy ? T.payMaking : T.payComplete)}
                    </p>
                    {/* EIN WEG ZURUECK, WENN DAS KASSENFENSTER ZU IST (Owner 31.07.2026: „es
                        sieht so aus als würde nichts mehr kommen").
                        Ohne ihn stand diese Meldung bis zu fuenf Minuten da — solange laeuft
                        die Abfrage. Wer die Kasse weggeklickt hat, wartet dann vor einer
                        Anzeige, hinter der wirklich nichts mehr kommt. Nur waehrend der
                        Zahlung, NIE waehrend eines bezahlten Laufs: dort waere Abbrechen
                        genau das Ausrauben, das wir gerade abgestellt haben. */}
                    {payBusy && !bezahlt && !videoBusy && (
                      <button type="button" onClick={() => { setPayBusy(false); setStatus(""); }}
                        style={{ color: "#fff" }}
                        className="mt-4 inline-flex items-center justify-center rounded-full border border-white/40 px-4 py-2 text-[12px] font-black transition active:scale-95">
                        {T.back}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Die Ueberblendung „Dein Video ist fertig 🔥" stand hier — sie gehoerte zur
                  gespielten Show und legte drei Zeilen Text quer ueber sein Bild. Der
                  Kaufknopf steht jetzt unten auf der Karte, wo er ohnehin hingehoert. */}

              {/* TEILEN AUCH BEIM BILD (Owner 01.08.2026: „auch das Bild soll er sharen
                  können") — als DATEI, siehe TeilenKnopf: ohne Werk-Seite würde ein Link nur
                  die Themenseite verschicken, die Datei ist sein Ergebnis selbst. Rechts oben,
                  gegenüber dem Löschknopf; während Zahlung/Rendern weicht er wie alles andere. */}
              {(frei || isStaff) && !payBusy && !videoBusy && (
                /* Unter dem Ton-Knopf (der sitzt right-3 top-3) — zwei Scheiben uebereinander
                   drueckt sonst niemand richtig. */
                genId ? (
                  <button type="button" onClick={() => setShareFrage(true)}
                    aria-label={(KARTE_TEXTE[lang] ?? KARTE_TEXTE.en).teilen}
                    style={{ background: "#fff", color: "#1a160f", boxShadow: "0 2px 10px rgba(0,0,0,0.35)" }}
                    className={`absolute right-3 z-30 grid h-10 w-10 place-items-center rounded-full transition active:scale-90 ${V.musik ? "top-16" : "top-3"}`}>
                    <Send className="h-5 w-5" />
                  </button>
                ) : (
                  <TeilenKnopf rund datei={bild} dateiName={variant}
                    text={TEILEN_TEXT[lang] ?? TEILEN_TEXT.en}
                    label={(KARTE_TEXTE[lang] ?? KARTE_TEXTE.en).teilen}
                    kopiertLabel={(KARTE_TEXTE[lang] ?? KARTE_TEXTE.en).zusDanke}
                    className={`absolute right-3 z-30 ${V.musik ? "top-16" : "top-3"}`} />
                )
              )}
              {/* Roter Papierkorb, weiss hinterlegt — dieselbe Form wie an jedem anderen Bild
                  im Projekt, damit man ihn nicht suchen muss. Waehrend Zahlung oder Rendern
                  verschwindet er: Mitten im bezahlten Lauf loeschen hiesse zahlen und nichts
                  bekommen. */}
              {!payBusy && !videoBusy && !bezahlt && (
                <button type="button" onClick={ergebnisLoeschen} aria-label={(KARTE_TEXTE[lang] ?? KARTE_TEXTE.en).loeschen}
                  style={{ background: "#fff", color: "#dc2626", boxShadow: "0 2px 10px rgba(0,0,0,0.35)" }}
                  className="absolute left-2 top-2 z-10 grid h-10 w-10 place-items-center rounded-full transition active:scale-90">
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
              {/* NACH DEM EINEN VERSUCH STEHT DER KAUFKNOPF DA (Owner 31.07.2026: „nach einem
                  Versuch muss Button Generate Video stehen 2,99" — „ohne diesen Fake").
                  Sein Bild ist da; die naechste Frage ist das Video, nicht ein zweites Bild.
                  Also traegt die Karte den Kaufknopf mit dem Preis (aus der Preistabelle),
                  „Personen ersetzen" rueckt als zweiter Weg darunter.
                  OHNE ZWISCHENSCHRITT: Die gespielte Render-Show und die Ueberblendung „Dein
                  Video ist fertig" sind raus. Sie legten Text ueber Text auf sein Bild und
                  verkauften vier Sekunden Warten als Arbeit — er hat sein Ergebnis vor
                  Augen, das ist die Spannung. Ein Tipp, und die Kasse geht auf. */}
              {/* WER BEZAHLT HAT, SIEHT KEINEN PREIS (Owner 31.07.2026: „wenn bezahlt dann
                  steht kein Preis"). `ctaVideo` ist genau dieser Knopf ohne Zahl — „Video
                  erzeugen". Ein Preis vor einem, der schon zahlt, liest sich als zweite
                  Rechnung; dasselbe galt schon fuer die Kaufknoepfe nach der Stripe-Rueckkehr. */}
              {!payBusy && !videoBusy && !(bezahlt && !wahl) &&
                kartenGriff(
                  bezahlt || isStaff ? T.ctaVideo : T.blockedOnce,
                  bezahlt || isStaff ? () => void kussVideo() : () => void unlock("once"),
                  { text: (KARTE_TEXTE[lang] ?? KARTE_TEXTE.en).menschenErsetzen, tun: schritteOeffnen },
                )}
            </div>
          ) : beispielVideo ? (
            <div className="relative">
              <EinladungAnsicht id="" videoUrl={beispielVideo} zaehlen={false}
                tonText={(KARTE_TEXTE[lang] ?? KARTE_TEXTE.en).ton}
                tonAusText={(KARTE_TEXTE[lang] ?? KARTE_TEXTE.en).tonAus} />
              {/* „auch im Original Herzchen und wow" — auf dem Beispiel verkaufen sie, was
                  sie auf dem eigenen Bild belohnen. */}
              <Reaktionen variant={variant} />
              {/* Beispiele darf jeder verschicken (Owner: „damit die Leute Werbung machen
                  können") — Ziel ist die Themenseite, Text und Grund stehen in
                  BeispielGalerie. NUR auf dem Beispiel: Fuers eigene Ergebnis braucht es
                  erst die Werk-Seite (OFFEN.md 2), sonst verschickt der Knopf das Falsche. */}
              <TeilenKnopf rund url={`/themes/${variant === "wedding" ? "wedding" : "kiss"}?utm_source=share`}
                text={TEILEN_TEXT[lang] ?? TEILEN_TEXT.en}
                label={(KARTE_TEXTE[lang] ?? KARTE_TEXTE.en).teilen}
                kopiertLabel={(KARTE_TEXTE[lang] ?? KARTE_TEXTE.en).zusDanke}
                className="absolute left-2 top-2 z-30" />
              {kartenGriff(gesperrt ? T.blockedOnce : (KARTE_TEXTE[lang] ?? KARTE_TEXTE.en).menschenErsetzen)}
            </div>
          ) : (
            <div className="grid h-[260px] w-full place-items-center px-6 text-center">
              <span className="font-serif text-[15px] font-bold">{T.pickHint}</span>
            </div>
          )
        }
      />
      </div>
      {/* Der Knopf unter der Karte ist weg: Er steht jetzt AUF dem Bild, und zwei gleiche
          Aufforderungen uebereinander sind einer zu viel. */}

      {/* UNTER DER KARTE: nur noch das Abo und die Zusagen — der Kaufknopf steht AUF dem
          Bild (Owner 31.07.2026: „nach einem Versuch muss Button Generate Video stehen 2,99").
          Zweimal derselbe Preis untereinander ist einer zu viel; hier bleibt der zweite Weg
          (alles freischalten) und das Kleingedruckte, das Vertrauen schafft.
          WER BEZAHLT HAT, SIEHT HIER GAR NICHTS MEHR („wenn bezahlt dann steht kein Preis"). */}
      {bild && !videoUrl && !bezahlt && !payBusy && !videoBusy && (
        <div className={`mx-auto mt-3 w-full max-w-[420px] ${frei || isStaff ? "" : "hidden"}`}>
          {isStaff ? (
            <button type="button" onClick={() => void zuVideo()} disabled={videoBusy}
              className="lb-gold lb-buy flex w-full items-center justify-center gap-2 rounded-full font-black active:scale-95 transition disabled:opacity-60">
              {videoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {videoBusy ? "Making the video …" : "Turn into video (Admin — free)"}
            </button>
          ) : (
            <>
              {V.abo && V.einzelkauf && (
                <button type="button" onClick={() => void unlock("abo")} disabled={payBusy}
                  style={{ color: "#fff" }}
                  className="flex w-full items-center justify-center rounded-full border border-white/40 px-3 py-2 text-[12px] font-black active:scale-95 transition disabled:opacity-60">
                  {T.orAll}
                </button>
              )}
              {/* KONTO AUFLADEN — 9,99 (Owner 01.08.2026, Variante B: Zusatzangebot, der
                  Einzelkauf bleibt). Nach der Kasse zahlt jedes weitere Video ohne Fenster
                  aus dem Guthaben; der Hinweis darunter ist die AGB-Zusage in Kurzform. */}
              {V.einzelkauf && (
                <>
                  <button type="button" onClick={() => void unlock("auflade")} disabled={payBusy}
                    style={{ color: "#fff" }}
                    className="mt-2 flex w-full items-center justify-center rounded-full border border-white/40 px-3 py-2 text-[12px] font-black active:scale-95 transition disabled:opacity-60">
                    {fillPrices(T.aufladen, lang)}
                  </button>
                  <p className="mt-1 text-center text-[10px] font-medium leading-snug text-white/60">
                    {T.aufladenHinweis}
                  </p>
                </>
              )}
              <p className="mt-2 text-center text-[10px] font-medium leading-snug text-white/70">
                {T.freeNote}{V.abo ? renewNote(lang) : ""}
              </p>
              <p className="mt-1.5 text-center text-[11px] font-bold leading-snug text-white/70">
                {T.privat}
              </p>
              <p className="mt-1 text-center text-[11px] font-bold text-white/80">{T.secure}</p>
            </>
          )}
        </div>
      )}

      {/* ── DIE SCHRITTE, unveraendert, nur in einem Dialog ──────────────────────────────
          Model waehlen (unsere Frauen ODER ein eigenes Foto — Owner 31.07.2026: „hier nehmen
          die Leute auch ein Model … jeder hat ein Model auf dem Handy"), sein Foto, der Kuss.
          Nichts davon ist angefasst: Der Kuss-Trichter traegt Kasse, Video-Lieferung und
          Monatsguthaben, und der laeuft gerade. Umgehaengt, nicht neu gebaut. */}
      {stufenOffen && (
      <div className="fixed inset-0 z-[80] overflow-y-auto" style={{ background: "rgba(0,0,0,0.72)" }}
        onClick={() => setStufenOffen(false)}>
        <div className="lb-bg mx-auto min-h-full w-full max-w-[440px] px-4 pb-10 pt-4" onClick={e => e.stopPropagation()}>
          <button type="button" onClick={() => setStufenOffen(false)} aria-label={T.back}
            className="lb-chip mb-3 grid h-9 w-9 place-items-center rounded-full transition active:scale-95">
            <ChevronLeft className="h-5 w-5" />
          </button>
      {/* Fortschritt — drei Punkte, damit er weiss, wo er steht. */}
      <div className="mb-3 flex items-center justify-center gap-1.5">
        {(V.paarUpload ? [1, 3, 4] : [1, 2, 3, 4]).map(n => (
          <span key={n} className={`h-1.5 rounded-full transition-all ${n === schritt ? "w-6 bg-[#f6cf51]" : n < schritt ? "w-3 bg-[#f6cf51]/50" : "w-3 bg-white/20"}`} />
        ))}
      </div>

      {schritt === 1 && (<>
      {/* Ohne Katalog heisst der Schritt nicht mehr „Waehle sie" — es gibt nichts zu waehlen.
          Und der Hinweis „oder wische zu einer von uns" waere schlicht falsch. */}
      <p className="text-[12px] font-black uppercase tracking-wide text-white/50">{V.nurEigenes ? T.upTitle : T.step1}</p>
      {/* Der Hinweis nennt beide Wege („… oder wische zu einer von uns"). Ohne Katalog gibt
          es nur noch einen — dann sagt die Karte selbst, was zu tun ist. */}
      {!V.nurEigenes && <p className="mt-1 text-[13px] font-bold text-white/85">{T.pickHint}</p>}

      {/* ZWEI FELDER NEBENEINANDER (Owner 31.07.2026). Kein Karussell, keine fremden Frauen —
          bei der Hochzeit sind es IHRE beiden Gesichter, und beide gehoeren auf einen
          Bildschirm. Das spart den ganzen zweiten Schritt. */}
      {V.paarUpload && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {([
            { wer: "sie", foto: customModel, ref: modelFileRef, titel: T.upTitle, hinweis: T.upHint, platzhalter: V.upPlaceholder },
            { wer: "er", foto: photo, ref: fileRef, titel: T.you, hinweis: T.youHint, platzhalter: PLACEHOLDER_MAN },
          ] as const).map(k => (
            <div key={k.wer} className="relative">
            <button type="button" onClick={() => k.ref.current?.click()} data-oncard="1"
              className="relative flex aspect-[3/4] w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl border-2 border-dashed border-[#f6cf51]/40 bg-[#f6cf51]/[0.06] active:scale-[0.98] transition">
              {k.foto ? (<>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={k.foto} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />
                <span className="lb-onmedia absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pb-1.5 pt-6 text-[15px] font-black"
                  style={{ color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.85)" }}>
                  {k.titel}
                </span>
                <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-[#f6cf51] shadow">
                  <Check className="h-4 w-4 text-black" />
                </span>
              </>) : (<>
                {k.platzhalter && (<>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={k.platzhalter} alt="" className="absolute inset-0 h-full w-full object-cover object-top opacity-95" />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                </>)}
                <ImageUp className="relative h-7 w-7 text-[#f6cf51]" />
                <span className="lb-onmedia relative px-1 text-[14px] font-black leading-tight"
                  style={{ color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.85)" }}>
                  {k.titel}
                </span>
                <span className="lb-onmedia relative px-2 text-[10px] font-bold leading-snug"
                  style={{ color: "rgba(255,255,255,0.85)", textShadow: "0 2px 10px rgba(0,0,0,0.85)" }}>
                  {k.hinweis}
                </span>
              </>)}
            </button>
            {/* LÖSCHEN — sichtbar an der Kachel, nicht versteckt in einem Menü (Hausregel).
                Eigener Knopf NEBEN dem Kachelknopf: Ein Knopf im Knopf ist ungültiges HTML und
                öffnet am Handy zuverlässig das Falsche. */}
            {k.foto && (
              <button type="button" onClick={() => fotoLoeschen(k.wer)}
                aria-label="Foto löschen"
                style={{ background: "#fff", color: "#dc2626", boxShadow: "0 2px 10px rgba(0,0,0,0.35)" }}
                className="absolute left-1.5 top-1.5 z-10 grid h-9 w-9 place-items-center rounded-full transition active:scale-90">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            </div>
          ))}
          <input ref={modelFileRef} type="file" accept="image/*,.heic,.heif" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) { setCropZiel("sie"); setCropDatei(f); } e.target.value = ""; }} />
          <input ref={fileRef} type="file" accept="image/*,.heic,.heif" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) { setCropZiel("er"); setCropDatei(f); } e.target.value = ""; }} />
        </div>
      )}

      {/* DER KÜRZERE WEG: ein Foto statt zwei. Steht UNTER den beiden Kacheln und nicht
          darüber — wer schon eines hochgeladen hat, soll nicht umdenken müssen; wer noch
          gar nichts hat, findet hier den bequemeren Weg. */}
      {/* ZUSCHNITT MIT SPEICHERN UND ABBRECHEN — nichts rutscht von allein hinein. */}
      {cropDatei && cropZiel && (
        <ImageCropper
          file={cropDatei}
          aspect={3 / 4}
          title={paarQuelle
            ? (cropZiel === "sie" ? T.paarSchritt1 : T.paarSchritt2)
            : (cropZiel === "sie" ? T.upTitle : T.you)}
          onCancel={() => { setCropDatei(null); setCropZiel(null); setPaarQuelle(null); }}
          onSave={async (zugeschnitten) => {
            const ziel = cropZiel;
            const quelle = paarQuelle;
            setCropDatei(null); setCropZiel(null);
            if (ziel === "sie") await onModelFile(zugeschnitten);
            else await onFile(zugeschnitten);
            // Beim Paarfoto direkt weiter zum zweiten Gesicht — dieselbe Datei, anderes Ziel.
            if (quelle && ziel === "sie") { setCropZiel("er"); setCropDatei(quelle); }
            else setPaarQuelle(null);
          }}
        />
      )}

      {V.paarUpload && (
        <div className="mt-2">
          <button type="button" onClick={() => paarRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/25 px-3 py-2.5 text-[12px] font-black text-white/80 transition active:scale-[0.99] disabled:opacity-60">
            <ImageUp className="h-4 w-4" />
            {T.paarTitel}
          </button>
          <p className="mt-1 text-center text-[10.5px] font-bold text-white/50">{T.paarHint}</p>
          {paarFehler && (
            <p className="mt-1 text-center text-[11px] font-bold leading-snug text-white/80">{paarFehler}</p>
          )}
          <input ref={paarRef} type="file" accept="image/*,.heic,.heif" className="hidden"
            onChange={e => { onPaarFile(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
      )}

      {!V.paarUpload && (() => {
        // Ohne Katalog gibt es nichts zu laden — sonst dreht sich hier ewig ein Rad.
        if (!V.nurEigenes && models.length === 0) return <div className="grid h-[46vw] max-h-[240px] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-white/50" /></div>;
        // „Your Model" lebt IM Karussell als Karte (3. Position, wie „Your photo" im Try-On):
        // eigenes Model-Foto hochladen — die Karte vorn = Auswahl.
        const YOURMODEL: Model = { id: "__yourmodel", name: T.upTitle, photoUrl: "" };
        const cards = V.nurEigenes ? [] : [...models];
        // IN DIE MITTE, nicht ganz an den Anfang (Owner 30.07.2026: „mach die nicht ganz am
        // Anfang des Karussells sondern die Mitte"). Vorn wirkte die Upload-Karte wie der
        // vorgeschriebene Weg; in der Mitte steht sie gleichberechtigt neben unseren Frauen,
        // und man sieht links wie rechts, dass es Auswahl gibt.
        const uploadIdx = V.nurEigenes ? 0 : V.upFirst ? Math.floor(cards.length / 2) : Math.min(2, cards.length);
        cards.splice(uploadIdx, 0, YOURMODEL);
        const active = useCustom ? uploadIdx : Math.max(0, cards.findIndex(m => m.id === picked?.id));
        // Nach-vorn-holen zentriert NUR (auch die „Your model"-Karte — Owner-Vorgabe);
        // das Upload-Fenster öffnet erst der Tipp auf die bereits VORDERE Karte (im onClick).
        const setFront = (m: Model) => {
          if (m.id === "__yourmodel") { setUseCustom(true); return; }
          setUseCustom(false); setPicked(m);
        };
        const slide = (dir: number) => {
          const ni = Math.min(cards.length - 1, Math.max(0, active + dir));
          if (ni !== active) setFront(cards[ni]);
        };
        return (
          <div className="relative mx-auto mt-2 h-[72vw] max-h-[300px] select-none overflow-hidden touch-pan-y" style={{ perspective: "1100px" }}
            onPointerDown={(e) => { swipeRef.current = e.clientX; swipedRef.current = false; }}
            onPointerUp={(e) => { const dx = e.clientX - swipeRef.current; if (Math.abs(dx) > 30) { swipedRef.current = true; slide(dx < 0 ? 1 : -1); } }}>
            {cards.map((m, i) => {
              const off = i - active;
              if (Math.abs(off) > 2) return null;
              const isActive = off === 0;
              const isUpload = m.id === "__yourmodel";
              return (
                <div key={m.id}
                  onClick={() => { if (swipedRef.current) { swipedRef.current = false; return; } if (isUpload) { if (!isActive) { setFront(m); return; } modelFileRef.current?.click(); return; } if (!isActive) setFront(m); }}
                  className="absolute left-1/2 top-1/2 w-[54%] max-w-[220px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-2xl transition-all duration-300 ease-out"
                  style={{ transform: `translate(-50%,-50%) translateX(${off * 56}%) rotateY(${-off * 38}deg) scale(${isActive ? 1 : 0.82})`, zIndex: 20 - Math.abs(off), opacity: Math.abs(off) === 2 ? 0.45 : 1, cursor: "pointer" }}>
                  <div className="relative aspect-[3/4] w-full">
                    {isUpload && !customModel ? (
                      // Solide Fläche (nicht transparent — Owner-Vorgabe): warmes Dunkelbraun.
                      <div className="relative flex h-full w-full flex-col items-center justify-center gap-2 bg-[#241c11] px-3 text-center">
                        {V.upPlaceholder && (
                          // eslint-disable-next-line @next/next/no-img-element
                          // DEUTLICHER (Owner 30.07.2026: „Bild von Frau, das muss deutlicher
                          // werden"). Vorher 25 % und grau — man erkannte kaum, dass dort eine
                          // Frau hingehört. Jetzt 70 % und in Farbe, dazu ein dunkler Verlauf,
                          // damit die Schrift darüber lesbar bleibt.
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={V.upPlaceholder} alt="" className="absolute inset-0 h-full w-full object-cover object-top opacity-95" />
                            <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                          </>
                        )}
                        {/* DIE SCHEIBE UMSCHLIESST DEN TEXT (Owner 31.07.2026: „Schrift steht
                            nicht auf Label"). Vorher war sie ein eigenes Element mit fester
                            Hoehe HINTER dem Text — in Sprachen mit laengerem Hinweis lief der
                            Text unten aus ihr heraus und stand halb auf dem hellen Foto. Jetzt
                            traegt derselbe Kasten den Inhalt und waechst mit ihm. */}
                        <div data-oncard="1" className="relative z-10 mx-1 flex flex-col items-center gap-1 rounded-2xl bg-black/60 px-3 py-3 backdrop-blur-[2px]">
                          <ImageUp style={{ color: "#fff" }} className="h-9 w-9" />
                          <span style={{ color: "#fff" }} className="text-[15px] font-black">{T.upTitle}</span>
                          <span style={{ color: "#fff" }} className="text-[11px] font-bold leading-snug">{T.upHint}</span>
                        </div>
                      </div>
                    ) : (<>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={isUpload ? customModel : m.photoUrl} alt={m.name} draggable={false} className="h-full w-full object-cover object-top" />
                      {isUpload && isActive && (
                        <span className="lb-onmedia absolute inset-x-3 bottom-8 rounded-full bg-black/60 py-1 text-center text-[10px] font-black text-white backdrop-blur">{T.tapChange}</span>
                      )}
                    </>)}
                    {isActive && (!isUpload || !!customModel) && <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-[#f6cf51] shadow"><Check className="h-4 w-4 text-black" /></span>}
                    {/* LÖSCHEN AUCH HIER (Owner 31.07.2026: „das ist der Grund, warum viele
                        abgebrochen haben"). Ein hochgeladenes Foto liess sich bisher nur
                        ERSETZEN, nicht entfernen — wer das falsche Bild erwischt hatte, kam
                        nicht mehr davon los und ging. Das Kreuz raeumt die Ansicht; im
                        Protokoll bleibt der Eintrag. */}
                    {isUpload && !!customModel && (
                      <button type="button"
                        onClick={ev => { ev.stopPropagation(); fotoLoeschen("sie"); }}
                        aria-label="Foto löschen"
                        style={{ background: "#fff", color: "#dc2626", boxShadow: "0 2px 10px rgba(0,0,0,0.35)" }}
                        className="absolute left-2 top-2 z-30 grid h-9 w-9 place-items-center rounded-full transition active:scale-90">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
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
      {!V.paarUpload && (
        <input ref={modelFileRef} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={e => void onModelFile(e.target.files?.[0])} />
      )}

      {/* DIE ABSAGE ZUM HOCHGELADENEN FOTO (Owner 03.08.2026) — direkt unter den Kacheln,
          wo das Bild gerade verschwunden ist. Feste Farbe, weil die Hell-Fassung eine
          Theme-Klasse umfaerben wuerde; dieselbe Regel wie bei allen Absagen im Trichter. */}
      {uploadFehler && (
        <p role="alert" style={{ color: "#ef4444" }}
          className="mx-auto mt-3 max-w-[340px] text-center text-[12.5px] font-black leading-snug">
          {uploadFehler}
        </p>
      )}

      {/* Weiter — bei der Hochzeit erst, wenn BEIDE Fotos da sind, und direkt zu Schritt 3.
          OHNE FOTO GEHT ES NICHT WEITER (Owner 01.08.2026: „wenn er hier kein Bild hochlädt
          dann darf er nicht weiter gehen"). Der Knopf war schon gesperrt — aber STUMM: blass,
          und ein Tipp darauf tat nichts. Wer nicht weiss, warum, drückt dreimal und geht.

          DER KNOPF BLEIBT AKTIV (02.08.2026, live geprüft — nicht nur vermutet): Ein
          `disabled`-Knopf feuert in keinem Browser ein `click`, auch nicht an einer
          umschliessenden Huelle — `parent.addEventListener("click", …)` blieb im echten
          Browser stumm, wenn `target.click()` auf einem `disabled`-Knopf lief. Die vorige
          Fassung („Klick auf die Huelle") sah nach einer Loesung aus und war keine: Genau
          der Knopf, der stumm blieb, sollte den Klick fangen, konnte es aber nie. Jetzt
          bleibt der Knopf ein echter, klickbarer Knopf; nur sein Aussehen dimmt sich, und
          die Bedingung steht im eigenen onClick. */}
      <button type="button"
        onClick={() => {
          if (V.paarUpload ? (!selPhoto || !photo) : !selPhoto) {
            setWeiterHinweis(V.paarUpload && selPhoto ? T.uploadFirst : T.pickFirst);
            return;
          }
          setWeiterHinweis("");
          zustimmen(); wahlMerken(); setSchritt(V.paarUpload ? 3 : 2);
        }}
        className={`lb-gold mt-4 flex h-12 w-full items-center justify-center rounded-full text-[15px] font-black active:scale-95 transition${(V.paarUpload ? (!selPhoto || !photo) : !selPhoto) ? " opacity-40" : ""}`}>
        {V.paarUpload
          ? (selPhoto && photo ? (V.keinGratis ? T.nextPaid : T.next) : !selPhoto ? T.pickFirst : T.uploadFirst)
          : (selPhoto ? (V.keinGratis ? T.nextPaid : T.next) : T.pickFirst)}
      </button>
      {weiterHinweis && (
        <p role="alert" style={{ color: "#ef4444" }} className="mt-1.5 text-center text-[12.5px] font-black leading-snug">
          {weiterHinweis}
        </p>
      )}
      {/* GLEICH BEIM ERSTEN BILD (Owner 30.07.2026: „bei ersten bild muss schon stehen").
          Wer erst auf Schritt 3 erfaehrt, worauf er sich einlaesst, hat schon zwei Fotos
          hergegeben. Die beiden Verweise oeffnen in einem neuen Fenster, damit sein Trichter
          nicht verloren geht. */}
      <p className="mx-auto mt-2 max-w-[340px] text-center text-[10px] font-medium leading-snug text-white/45">
        {(() => {
          const teile = T.zustimmung.split(/(\{agb\}|\{privacy\})/);
          return teile.map((t, i) =>
            t === "{agb}" ? <a key={i} href="/terms" target="_blank" rel="noreferrer" className="underline">{T.agbLink}</a>
            : t === "{privacy}" ? <a key={i} href="/privacy" target="_blank" rel="noreferrer" className="underline">{T.datenschutzLink}</a>
            : <span key={i}>{t}</span>);
        })()}
      </p>
      </>)}

      {schritt === 2 && (<>
      <p className="text-[12px] font-black uppercase tracking-wide text-white/50">{T.step2}</p>
      <div className="mt-2 flex items-center justify-center gap-2">
        {/* NUR DER PFEIL (Owner 31.07.2026). Mit Wort war der Knopf breiter als das halbe
            Bild und schob die Kachel aus der Mitte — auf einem 375er Bildschirm ist Platz das
            knappste Gut. Der Pfeil allein versteht jeder. */}
        <button type="button" onClick={() => setSchritt(1)} aria-label={T.back}
          className="lb-chip grid h-9 w-9 shrink-0 place-items-center rounded-full active:scale-95 transition">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="relative w-[54%] max-w-[220px]">
      <button type="button" onClick={() => fileRef.current?.click()}
        /* DASSELBE FORMAT WIE IHRE KARTE (Owner 31.07.2026: „du hast nicht das gleiche Format
           wie bei ihr … das ist das richtige Format"). Seine Kachel war quadratisch, ihre 3:4.
           Zwei Formate nebeneinander sehen nicht nur unruhig aus: Der Zuschnitt-Dialog schneidet
           in 3:4, also hat das Quadrat oben und unten etwas abgeschnitten, was sie gerade
           bewusst eingestellt hat. */
        className="relative flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-3xl border-2 border-dashed border-[#f6cf51]/40 bg-[#f6cf51]/[0.06] active:scale-[0.98] transition">
        {photo
          ? (<>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="" className="h-full w-full object-cover" />
              {/* GROSS UND WEISS: „YOU" (Owner 30.07.2026). Ein echter Besucher lud hier eine
                  Frau hoch — die Beschriftung daneben reichte nicht. Auf dem Foto selbst
                  kann man es nicht übersehen. */}
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pb-2 pt-8 text-[26px] font-black tracking-wide"
                style={{ color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.85)" }}>
                {T.you}
              </span>
            </>)
          : (<>
              {/* Platzhalter-Gesicht (abgedunkelt): zeigt auf einen Blick, dass hier ein
                  MANN bzw. der Nutzer selbst hingehört — nicht noch ein Model. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {/* DEUTLICH UND FARBIG (Owner 30.07.2026: „du musst das Preview-Bild beim Mann
                  und Frau deutlicher machen, farbig. Sie sehen das auf dem Handy nicht, weil
                  zu dunkel"). Ein echter Besucher hat hier am 30.07. um 11:22 eine Frau im
                  Bikini hochgeladen — und bekam nichts, weil die Bildprüfung das abweist.
                  Vorher lag das Foto bei 25 % und grau; man sah schlicht nicht, dass dort ein
                  MANN hingehört. */}
              <img src={PLACEHOLDER_MAN} alt="" className="absolute inset-0 h-full w-full object-cover opacity-95" />
              {/* DERSELBE KASTEN WIE AUF IHRER KARTE (Owner 31.07.2026: „die Icons aufs Bild
                  bitte"). Vorher schwebten Symbol und Schrift frei ueber dem Foto und standen
                  je nach Motiv auf hellem Grund. Ein Kasten, der mit dem Text waechst, liest
                  sich auf jedem Bild. */}
              <div data-oncard="1" className="relative z-10 mx-2 flex flex-col items-center gap-1 rounded-2xl bg-black/60 px-3 py-3 text-center backdrop-blur-[2px]">
                <ImageUp style={{ color: "#fff" }} className="h-8 w-8" />
                <span style={{ color: "#fff" }} className="text-[28px] font-black leading-none tracking-wide">{T.you}</span>
                <span style={{ color: "#fff" }} className="text-[13px] font-black">{T.uploadYou}</span>
                <span style={{ color: "#fff" }} className="text-[11px] font-bold leading-snug">{T.youHint}</span>
              </div>
            </>)}
      </button>
      {/* PAPIERKORB UND HAKEN AUFS BILD (Owner 31.07.2026: „Lösch-Icon und OK aufs Bild
          bitte") — genau wie auf ihrer Karte. Als Textzeile darunter haben zwei Leute von
          drei sie uebersehen; auf dem Foto sind sie da, wo das Foto ist. Gewechselt wird
          weiterhin durch Tippen auf das Bild selbst. */}
      {photo && (<>
        <button type="button" onClick={() => fotoLoeschen("er")} aria-label="Foto löschen"
          style={{ background: "#fff", color: "#dc2626", boxShadow: "0 2px 10px rgba(0,0,0,0.35)" }}
          className="absolute left-2 top-2 z-30 grid h-9 w-9 place-items-center rounded-full transition active:scale-90">
          <Trash2 className="h-4 w-4" />
        </button>
        <span className="absolute right-2 top-2 z-30 grid h-9 w-9 place-items-center rounded-full bg-[#f6cf51] shadow">
          <Check className="h-5 w-5 text-black" />
        </span>
      </>)}
      </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={e => void onFile(e.target.files?.[0])} />

      {/* Dieselbe Absage wie in Schritt 1 — sein Foto wird genauso geprüft wie ihres. */}
      {uploadFehler && (
        <p role="alert" style={{ color: "#ef4444" }}
          className="mx-auto mt-3 max-w-[340px] text-center text-[12.5px] font-black leading-snug">
          {uploadFehler}
        </p>
      )}

      {/* 3) Generieren */}
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => setSchritt(3)} disabled={!photo}
          className="lb-gold flex h-12 flex-1 items-center justify-center rounded-full text-[15px] font-black active:scale-95 transition disabled:opacity-40">
          {photo ? (V.keinGratis ? T.nextPaid : T.next) : T.uploadFirst}
        </button>
      </div>
      </>)}

      {schritt === 4 && (
        <div className="mb-3 text-center">
          <p className="text-[12px] font-black uppercase tracking-wide text-white/50">{T.step4}</p>
        </div>
      )}

      {schritt === 3 && (<>
      <p className="text-[12px] font-black uppercase tracking-wide text-white/50">{T.step3}</p>
      {/* BEIDE NEBENEINANDER (Owner 30.07.2026: „ich sehe uns nicht nebeneinander"). In den
          Schritten davor hat er sie einzeln gewählt; hier muss er sehen, wer gleich mit wem
          im Bild landet — sonst generiert er blind. */}
      {(selPhoto || photo) && (
        <div className="mt-2 flex items-center justify-center gap-2">
          {/* Zurueck am Bild, wie in Schritt 2 — nicht oben zwischen den Einstellungen. */}
          <button type="button" onClick={() => setSchritt(V.paarUpload ? 1 : 2)} aria-label={T.back}
            className="lb-chip grid h-9 w-9 shrink-0 place-items-center rounded-full active:scale-95 transition">
            <ChevronLeft className="h-5 w-5" />
          </button>
          {selPhoto && (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selPhoto} alt="" className="aspect-[3/4] w-[118px] max-w-[32vw] rounded-2xl border border-white/15 object-cover object-top" />
              {/* Auch in der Vorschau muss das Foto weggehen koennen (Owner 31.07.2026:
                  „hier soll man das Bild noch löschen können"). Nur bei EIGENEN Fotos —
                  ein Katalog-Model laesst sich nicht loeschen, nur wechseln. */}
              {useCustom && !!customModel && (
                <button type="button" onClick={() => { fotoLoeschen("sie"); setSchritt(1); }}
                  aria-label="Foto löschen"
                  style={{ background: "#fff", color: "#dc2626", boxShadow: "0 2px 10px rgba(0,0,0,0.35)" }}
                  className="absolute -left-1.5 -top-1.5 grid h-8 w-8 place-items-center rounded-full transition active:scale-90">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
          {/* Das Sinnbild zwischen den beiden Fotos folgt dem Thema: Kuss-Lippen auf einer
              Hochzeitsseite sind derselbe Fehler wie „Heisses Video" — der Kuss-Trichter, der
              ungeprueft mitkommt. */}
          <span className="text-[20px]">{variant === "wedding" ? "💍" : "💋"}</span>
          {photo && (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="" className="aspect-[3/4] w-[118px] max-w-[32vw] rounded-2xl border border-[#f6cf51]/40 object-cover object-top" />
              <button type="button" onClick={() => { fotoLoeschen("er"); setSchritt(V.paarUpload ? 1 : 2); }}
                aria-label="Foto löschen"
                style={{ background: "#fff", color: "#dc2626", boxShadow: "0 2px 10px rgba(0,0,0,0.35)" }}
                className="absolute -right-1.5 -top-1.5 grid h-8 w-8 place-items-center rounded-full transition active:scale-90">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
      {/* DIE GARDEROBE — sichtbar, aber verschlossen (Owner 30.07.2026: „drunter muss die
          Wardrobe stehen. Es koennte auch jetzt stehen aber ist gesperrt und muesste stehen
          das wird freigegeben fuer bezahlte Videos"). Zeigen schlaegt versprechen: er sieht,
          was er bekommt, und das Schloss sagt ihm, wie er drankommt. */}
      {/* NUR NACH DER ZAHLUNG (Owner 31.07.2026: „das machst du in der Gratis-Version raus").
          Vorher stand die Garderobe verschlossen und verschwommen da — Gedanke damals: zeigen
          schlaegt versprechen. In der Praxis ist es ein grauer Kasten mit einem Schloss, der
          vor dem Gratis-Bild Platz und Aufmerksamkeit nimmt und wie eine Bezahlschranke
          aussieht, bevor ueberhaupt etwas passiert ist. Wer bezahlt hat, sieht sie sofort. */}
      {/* BEIM KUSS GAR NICHT MEHR (Owner 03.08.2026: „es kommt immer noch die Box statt
          sofort zu generieren. Ich will keine Wäsche ein zweites Mal auswählen und Szene
          auch nicht"). Szene UND Wäsche stehen seit heute VOR der Kasse am Schritt 3 —
          diese weisse Box danach ist keine Auswahl mehr, sondern eine Wiederholung, die
          zwischen Klick und Video steht. Hochzeit (Brautkleider) und Idol behalten sie. */}
      {(bezahlt || isStaff) && variant !== "kiss" && (kleidung.length > 0 || variant === "wedding") && (
        <div className="relative mt-2 rounded-2xl p-3" style={{ background: "#fff", color: "#1a160f" }}>
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-black">{T.wardrobe}</p>
            {!bezahlt && !isStaff && (
              <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black"
                style={{ background: "rgba(0,0,0,0.07)" }}>
                <Lock className="h-3 w-3" /> {T.paidBadge}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] font-semibold" style={{ opacity: 0.6 }}>
            {bezahlt || isStaff
              ? T.wardrobeOpen
              : T.wardrobeLocked}
          </p>

          <div style={bezahlt || isStaff ? undefined : { opacity: 0.45, filter: "blur(1.5px)", pointerEvents: "none" }}>
            {/* NICHT ZWEIMAL FRAGEN (Owner 03.08.2026: „das ist ein Schritt zu viel. Die
                Unterwäsche habe ich doch ausgesucht"). Bei einer Lingerie-Vorlage steht ihre
                Waesche-Wahl schon unter den Kacheln — dieselbe Frage hier nochmal liest sich,
                als haette die erste Antwort nicht gezaehlt. Seine Sachen und der Moment
                bleiben; nur IHRE Zeile faellt weg. */}
            {!lingerieGewaehlt && (<>
            <p className="mt-2.5 text-[11px] font-black">{T.herDress}</p>
            {/* BEI DER HOCHZEIT DIE COUTURE-KLEIDER (Owner 31.07.2026: „hier müssen weiter
                stehen, exklusive" — davor standen an dieser Stelle Lingerie-Sets aus dem
                Katalog, auf einer Hochzeitsseite).

                Und der Knopf „Wie auf dem Foto" ist weg (Owner: „diese Button fliegt raus"):
                Auf ihrem eigenen Foto trägt sie kein Brautkleid — die Wahl „wie auf dem Foto"
                heisst hier also „im Alltagsoberteil heiraten" und ist keine Wahl, sondern ein
                Fehler, der nur darauf wartet, angetippt zu werden. Es sind grosse Kacheln, weil
                ein Kleid in 44 Pixel Breite nicht zu erkennen ist. */}
            {variant === "wedding" ? (
              <div className="mt-1.5 flex gap-2 overflow-x-auto pb-1">
                {WEDDING_KLEIDER.map(k => (
                  <button key={k.id} type="button" onClick={() => setKleid(kleid === k.beschreibung ? "" : k.beschreibung)}
                    className="shrink-0 overflow-hidden rounded-xl"
                    style={{ outline: kleid === k.beschreibung ? "3px solid #1877f2" : "1px solid rgba(0,0,0,0.12)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={k.bild} alt="" className="h-[124px] w-[86px] object-cover" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-1.5 flex gap-2 overflow-x-auto pb-1">
                <button type="button" onClick={() => setIhrLook("")}
                  className="shrink-0 rounded-xl px-2.5 py-1.5 text-[10px] font-black"
                  style={ihrLook === "" ? { background: "#1877f2", color: "#fff" } : { background: "rgba(0,0,0,0.06)" }}>
                  {T.asInPhoto}
                </button>
                {kleidung.map(l => (
                  <button key={l.id} type="button" onClick={() => setIhrLook(l.id)} className="shrink-0 overflow-hidden rounded-xl"
                    style={{ outline: ihrLook === l.id ? "3px solid #1877f2" : "1px solid rgba(0,0,0,0.12)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={l.imageUrl} alt={l.name ?? ""} className="h-[58px] w-[44px] object-cover" />
                  </button>
                ))}
              </div>
            )}
            </>)}

            {variant !== "wedding" && (
              <button type="button" onClick={() => setMehr(m => !m)}
                className="mt-2.5 text-[11px] font-black" style={{ color: "#1877f2" }}>
                {mehr ? T.moreClose : T.moreOpen}
              </button>
            )}
            <p className={`mt-2.5 text-[11px] font-black ${mehr ? "" : "hidden"}`}>Your clothes</p>
            <div className={`mt-1.5 flex gap-2 overflow-x-auto pb-1 ${mehr ? "" : "hidden"}`}>
              <button type="button" onClick={() => setSeinLook("")}
                className="shrink-0 rounded-xl px-2.5 py-1.5 text-[10px] font-black"
                style={seinLook === "" ? { background: "#1877f2", color: "#fff" } : { background: "rgba(0,0,0,0.06)" }}>
                {T.myOwnClothes}
              </button>
              {kleidung.map(l => (
                <button key={l.id} type="button" onClick={() => setSeinLook(l.id)} className="shrink-0 overflow-hidden rounded-xl"
                  style={{ outline: seinLook === l.id ? "3px solid #1877f2" : "1px solid rgba(0,0,0,0.12)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.imageUrl} alt={l.name ?? ""} className="h-[58px] w-[44px] object-cover" />
                </button>
              ))}
            </div>

            <p className={`mt-2.5 text-[11px] font-black ${mehr ? "" : "hidden"}`}>{T.theMoment}</p>
            <div className={`mt-1.5 flex gap-1.5 overflow-x-auto pb-1 ${mehr ? "" : "hidden"}`}>
              <button type="button" onClick={() => setSzeneId("")}
                className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black"
                style={szeneId === "" ? { background: "#1877f2", color: "#fff" } : { background: "rgba(0,0,0,0.06)" }}>
                {T.surpriseMe}
              </button>
              {HOLIDAY_SCENES.map(sc => (
                <button key={sc.id} type="button" onClick={() => setSzeneId(sc.id)}
                  className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black"
                  style={szeneId === sc.id
                    ? { background: "#1877f2", color: "#fff", whiteSpace: "nowrap" }
                    : { background: "rgba(0,0,0,0.06)", whiteSpace: "nowrap" }}>
                  {sc.emoji} {sc.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* DIE SZENEN-KACHELN (Owner 01.08.2026). Vier Standbilder aus den ECHTEN
          Beispielvideos — die KI-Templates waren „furchtbar", die Video-Standbilder „toll".
          Antippen wählt, nochmal tippen wählt ab; keine Pflicht. Nur beim Kuss — Hochzeit
          hat ihre eigene Kulisse (Kleid + Zeremonie). */}
      {variant === "kiss" && schritt >= 3 && !bild && !videoUrl && (
        <div className="mt-3">
          <p className="text-[12px] font-bold text-white/85">{T.szeneTitel}</p>
          <div className="mt-1.5 grid grid-cols-4 gap-2">
            {KUSS_SZENEN.map(sz => (
              <button key={sz.id} type="button"
                onClick={() => setKussSzeneId(w => (w === sz.id ? "" : sz.id))}
                aria-pressed={kussSzeneId === sz.id}
                className={`relative overflow-hidden rounded-xl border transition active:scale-95 ${kussSzeneId === sz.id ? "border-[#f6cf51] ring-2 ring-[#f6cf51]" : "border-white/20"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sz.kachel} alt={sz.name} className="aspect-[3/4] w-full object-cover" />
                {kussSzeneId === sz.id && (
                  <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-[#f6cf51]">
                    <Check className="h-3.5 w-3.5 text-black" />
                  </span>
                )}
                {/* DER PREIS AUF DER KACHEL (Owner 03.08.2026: „schreib die Preise auf die
                    Videos"). Aus der Preistabelle ({once}), nie getippt — und mit fester
                    Farbe auf dunklem Grund, damit er auf jedem Foto lesbar ist (dieselbe
                    Lehre wie bei lb-onmedia). Bezahlte und Personal sehen keinen Preis:
                    fuer sie ist jedes weitere Video ohne neue Rechnung. */}
                {!bezahlt && !isStaff && (
                  <span style={{ background: "rgba(0,0,0,0.72)", color: "#f6cf51" }}
                    className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-black">
                    {/* Lingerie-Szenen kosten mehr — der FASHN-Lauf ist im Preis (lib/pricing). */}
                    {fillPrices(sz.lingerie ? "{lingerie}" : "{once}", lang)}
                  </span>
                )}
                {/* Die Lupe — als span mit role, nicht als button: ein Knopf im Knopf ist
                    ungueltiges HTML und klickt am Handy das Falsche (Hausregel). */}
                {/* WEISSE Lupe (Owner 03.08.2026: „vergrössern muss man weiss machen") —
                    dieselbe Hausregel wie bei allen Knoepfen auf Fotos: weisse Flaeche,
                    dunkle Zeichnung, auf jedem Motiv lesbar. Und das Vollbild versucht
                    ZUERST das Video („man muss das Video sehen, nicht das Bild"): gleicher
                    Dateiname als .mp4 in public/szenen — liegt keins dort, faellt das
                    Overlay von selbst auf das Standbild zurueck (onError unten). */}
                <span role="button" tabIndex={0} aria-label={`${sz.name} vergrössern`}
                  onClick={e => { e.stopPropagation(); setSzeneZoom({ src: sz.kachel.replace(/\.jpg$/, ".mp4"), video: true, poster: sz.kachel }); }}
                  onKeyDown={e => { if (e.key === "Enter") { e.stopPropagation(); setSzeneZoom({ src: sz.kachel.replace(/\.jpg$/, ".mp4"), video: true, poster: sz.kachel }); } }}
                  style={{ background: "#fff", color: "#1a160f", boxShadow: "0 2px 8px rgba(0,0,0,0.35)" }}
                  className="absolute left-1 top-1 grid h-6 w-6 place-items-center rounded-full">
                  <Maximize2 className="h-3.5 w-3.5" />
                </span>
              </button>
            ))}
            {/* DIE LINGERIE-VORLAGEN (Owner 03.08.2026: „ich habe dir ein Kisslingerie-Ordner
                gemacht in public. Du kannst das auch als Video-Template nehmen. Aber das
                kostet 3,99"). Die Kachel IST das Beispielvideo — preload="metadata" holt nur
                das erste Standbild (nie ein schwarzer Kasten, nichts laedt unnoetig). Gleiche
                Wahl-Mechanik wie die Szenen: dieselbe kussSzeneId, antippen waehlt,
                nochmal tippen waehlt ab. */}
            {KUSS_LINGERIE.map(lv => (
              <button key={lv.id} type="button"
                onClick={() => setKussSzeneId(w => {
                  const neu = w === lv.id ? "" : lv.id;
                  // ZUR WAESCHE SPRINGEN (Owner 03.08.2026: „springt der Screen runter auf
                  // die Wäsche?"). Die Zeile erscheint erst MIT der Wahl — wer den Sprung
                  // nicht bekommt, sieht sie unter dem Falz nie und wundert sich, was die
                  // Vorlage anzieht. Kurz warten, bis sie gerendert ist, dann hinfahren.
                  if (neu) setTimeout(() => document.querySelector(".lb-wisch")?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
                  return neu;
                })}
                aria-pressed={kussSzeneId === lv.id}
                className={`relative overflow-hidden rounded-xl border transition active:scale-95 ${kussSzeneId === lv.id ? "border-[#f6cf51] ring-2 ring-[#f6cf51]" : "border-white/20"}`}>
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video src={lv.vorschau} preload="metadata" muted playsInline
                  className="aspect-[3/4] w-full object-cover" />
                {kussSzeneId === lv.id && (
                  <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-[#f6cf51]">
                    <Check className="h-3.5 w-3.5 text-black" />
                  </span>
                )}
                {!bezahlt && !isStaff && (
                  <span style={{ background: "rgba(0,0,0,0.72)", color: "#f6cf51" }}
                    className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-black">
                    {fillPrices("{lingerie}", lang)}
                  </span>
                )}
                <span role="button" tabIndex={0} aria-label={`${lv.name} vergrössern`}
                  onClick={e => { e.stopPropagation(); setSzeneZoom({ src: lv.vorschau, video: true }); }}
                  onKeyDown={e => { if (e.key === "Enter") { e.stopPropagation(); setSzeneZoom({ src: lv.vorschau, video: true }); } }}
                  style={{ background: "#fff", color: "#1a160f", boxShadow: "0 2px 8px rgba(0,0,0,0.35)" }}
                  className="absolute left-1 top-1 grid h-6 w-6 place-items-center rounded-full">
                  <Maximize2 className="h-3.5 w-3.5" />
                </span>
              </button>
            ))}
          </div>
          {/* DAS VOLLBILD zur Lupe. Klick irgendwohin schliesst — dieselbe Mechanik wie die
              anderen Overlays des Trichters. Das Video laeuft stumm in Schleife: Ton hat
              hier nichts zu verkaufen, und Autoplay mit Ton blockieren Browser ohnehin. */}
          {szeneZoom && (
            <div className="fixed inset-0 z-[97] grid place-items-center bg-black/85 p-4"
              onClick={() => setSzeneZoom(null)}>
              {szeneZoom.video ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video src={szeneZoom.src} poster={szeneZoom.poster} autoPlay muted loop playsInline controls
                  onError={() => setSzeneZoom(z => (z && z.poster ? { src: z.poster } : z))}
                  className="max-h-[85vh] max-w-full rounded-2xl" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={szeneZoom.src} alt="" className="max-h-[85vh] max-w-full rounded-2xl object-contain" />
              )}
              <button type="button" aria-label="Schliessen"
                onClick={() => setSzeneZoom(null)}
                style={{ background: "#fff", color: "#1a160f" }}
                className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full font-black shadow-lg active:scale-90">
                ✕
              </button>
            </div>
          )}
          {/**
            * DER EINE SCHRITT MEHR (Owner 03.08.2026: „der Kunde kann aber die Wäsche auch
            * noch aussuchen, falls er ein Lingerie-Video nimmt" — „dann ist ein Schritt
            * mehr"). Erscheint NUR bei Lingerie-Wahl: unsere Wäsche aus der Galerie als
            * Wisch-Zeile. Vorgewählt ist das Stück, mit dem das Beispielvideo entstand
            * (garment an der Vorlage) — wer nichts antippt, bekommt genau den Look aus dem
            * Video. Genau DAS Bild geht dann an FASHN; nur so wird es „genauso".
            */}
          {lingerieGewaehlt && (() => {
            const standard = kussLingerie(kussSzeneId)?.garment
              ?? (kussSzene(kussSzeneId)?.lingerie ? "look-1783241820256-374a4401" : "");
            const waesche = looks.filter(l => !!l.imageUrl &&
              /lingerie|dessous|lace|corset|bodysuit|\bbra\b|garter|negligee|fishnet|mesh|satin set|slip/i.test(l.name ?? ""));
            if (!waesche.length) return null;
            const aktiv = ihrLook || standard;
            return (
              <div className="mt-3">
                <p className="text-[12px] font-bold text-white/85">{T.waescheTitel}</p>
                <div className="lb-wisch mt-1.5 flex gap-2 overflow-x-auto pb-1">
                  {waesche.map(l => (
                    <button key={l.id} type="button"
                      onClick={() => setIhrLook(w => (w === l.id ? "" : l.id))}
                      aria-pressed={aktiv === l.id}
                      className={`relative shrink-0 overflow-hidden rounded-xl border transition active:scale-95 ${aktiv === l.id ? "border-[#f6cf51] ring-2 ring-[#f6cf51]" : "border-white/20"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={l.imageUrl} alt={l.name ?? ""} className="h-[92px] w-[70px] object-cover object-top" />
                      {aktiv === l.id && (
                        <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-[#f6cf51]">
                          <Check className="h-3.5 w-3.5 text-black" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}
      {/* DIE ADRESSE STEHT VOR DEM KNOPF (Owner 30.07.2026: „deswegen habe ich die
          emailadresse nicht"). Ein Feld, direkt über „Generate" — kein Konto, kein Passwort,
          keine zweite Seite. Wer angemeldet ist oder schon einmal eingetragen hat, sieht hier
          gar nichts: `adresseDa` steht dann bereits. */}
      {!isStaff && !adresseDa && !bezahlt && (
        <div className="mt-3">
          <p className="text-[12px] font-bold text-white/85">
            {T.mailQuestion}
          </p>
          <input ref={mailRef} value={mail}
            onChange={e => { setMail(e.target.value); if (mailFehler) setMailFehler(""); }}
            type="email"
            inputMode="email" autoComplete="email" placeholder="you@email.com"
            onKeyDown={e => { if (e.key === "Enter") void generate(); }}
            // Farbe fest am Feld: die Hell-Fassung faerbt `text-white` dunkel — auf dem
            // schwarzen Grund waere die eingetippte Adresse dann unlesbar.
            style={{ color: "#fff", WebkitTextFillColor: "#fff", caretColor: "#fff" }}
            className="lb-eingabe mt-1.5 h-12 w-full rounded-xl border border-white/25 bg-black/50 px-3 text-center text-[15px] font-bold outline-none placeholder:text-white/40 focus:border-[#f6cf51]" />
          {/* ROT UND AM FELD — auf heller wie dunkler Fassung lesbar (fester Farbwert, keine
              Theme-Klasse). Verschwindet beim naechsten Tastendruck. */}
          {mailFehler && (
            <p role="alert" style={{ color: "#ef4444" }}
              className="mt-1.5 text-center text-[12.5px] font-black leading-snug">
              {mailFehler}
            </p>
          )}
          {/**
            * DAS LAND WIRD ERKANNT, NICHT GEFRAGT (Owner 31.07.2026: „das machst du mit
            * Autofill" — „ist das für dich Autofill?" zu einem Feld, das „Belgique" zeigte).
            *
            * HIER STAND EIN AUSWAHLFELD, und das war der Fehler. Es war nur VORBELEGT, nicht
            * ausgefüllt: Jeder Fehlgriff der Vermutung stand damit gross auf dem Bildschirm,
            * und der Nutzer musste ihn korrigieren. Ein sichtbares Feld, das man richtigstellen
            * muss, ist kein Autofill — es ist eine Frage mit einer falschen Antwort davor.
            *
            * Jetzt reist das Land unsichtbar mit (`land`, aus der Zeitzone). Auf dem Server
            * schlägt Vercels echte Länderkennung diese Vermutung ohnehin — die kommt vom Netz
            * und ist richtig, während eine Geräte-Zeitzone auf Reisen oder hinter einem VPN
            * daneben liegt. Genau das war „Belgique".
            *
            * Erkennen wir nichts, bleibt das Feld leer — wie vor heute. Niemand wird gefragt,
            * niemand sieht einen falschen Wert, und vor dem Gratis-Bild steht eine Hürde
            * weniger.
            */}
          <p className="mt-1 text-center text-[10px] font-medium leading-snug text-white/45">
            {T.mailNote}
          </p>
        </div>
      )}
      {/* NACH DER ZAHLUNG HEISST ER ANDERS (Owner 30.07.2026: „muesste dann statt generate
          picture, generate Video stehen (bezahlt)"). Derselbe Platz, andere Aufgabe: vorher
          das Gratis-Bild, danach das bezahlte Video aus Garderobe und Szene. */}
      {/* STUMM GESPERRT WAR DER FEHLER (02.08.2026, plan.md Punkt 1b: „ich drücke drauf und
          passiert nichts") — UND DER KNOPF BLEIBT DESHALB AKTIV: ein `disabled`-Knopf feuert
          in keinem Browser ein `click`, auch nicht an einer umschliessenden Huelle (live
          geprüft, nicht nur vermutet). Nur sein Aussehen dimmt sich; die Bedingung und der
          Hinweis stehen im eigenen onClick. */}
      <button type="button"
        onClick={() => {
          if (busy || videoBusy || mailBusy || payBusy) return;
          if (!selPhoto || !photo) { setGenerateHinweis(V.paarUpload && selPhoto ? T.uploadFirst : T.pickFirst); return; }
          if (!consent) { setGenerateHinweis(T.zustimmungFehlt); return; }
          setGenerateHinweis("");
          void (bezahlt ? kussVideo() : generate());
        }}
        className={`lb-gold mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-black active:scale-95 transition${(!selPhoto || !photo || !consent || busy || videoBusy || mailBusy || payBusy) ? " opacity-50" : ""}`}>
        {/* PAYBUSY FEHLTE HIER (Owner 03.08.2026: „wieso gehts hier nicht weiter?"). Bei
            `keinGratis`-Themen loest dieser Knopf zuerst `unlock()` aus (Guthaben-Abbuchung
            oder Stripe-Aufladung) — das laeuft ueber `payBusy`, nicht `busy`. Ohne `payBusy`
            hier blieb der Knopf waehrend dieser paar Sekunden unveraendert stehen: kein
            Spinner, kein Hinweis, nichts — wer in dem Moment noch einmal tippte, wirkte wie
            gegen eine Wand. */}
        {busy || videoBusy || mailBusy || payBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : bezahlt ? "🎬" : (variant === "wedding" ? "💍" : "💋")}
        {/* KEIN GRATIS-VERSPRECHEN AUF EINEM KNOPF, DER KEINS EINHAELT (plan.md Punkt 1a).
            `ctaFree` sagt „gratis" — bei der Hochzeit stimmt das seit `keinGratis` nicht
            mehr. `ctaVideo` ist ohnehin schon eigens uebersetzt („Einladung erstellen" u. a.)
            und passt vor wie nach der Zahlung: der Klick loest in beiden Faellen dieselbe
            Handlung aus (unlock zahlt zuerst, dann laeuft generate von selbst weiter). */}
        {busy || videoBusy ? (status || T.rendering) : mailBusy ? T.oneMoment : payBusy ? T.oneMoment : (bezahlt || V.keinGratis) ? T.ctaVideo : T.ctaFree}
      </button>
      {generateHinweis && (
        <p role="alert" style={{ color: "#ef4444" }} className="mt-1.5 text-center text-[12.5px] font-black leading-snug">
          {generateHinweis}
        </p>
      )}
      {/* Der Preis stand hier direkt unter dem Erzeugen-Knopf (Owner 30.07.2026: „hier muss
          Generate Picture free Button stehen oben und Video 9,99"). Am 31.07.2026 wieder
          entfernt — „das muss auch raus": Der Knopf sagt schon „gratis"; ein Preis daneben,
          bevor irgendetwas erzeugt wurde, saet genau den Zweifel, den das Wort gratis
          ausraeumen soll. Nach der Zahlung bleibt die Zeile, dort ist sie eine Auskunft. */}
      {bezahlt && (
        <p className="mt-1.5 text-center text-[12px] font-bold text-white/70">{T.paidLine}</p>
      )}
      {/**
        * BEIDE ZAHLEN VOR DEM KLICK (Owner 03.08.2026: „hier muss doch stehen dass das Video
        * {once} kostet aber er muss das Konto mit mindestens {topup} aufladen. Sonst fühlt er
        * sich ausgeraubt").
        *
        * Der Knopf darüber löst bei Kiss zuerst die AUFLADUNG aus, nicht den Videokauf: Wer
        * kein Guthaben hat, landet auf einer Kassenseite über {topup} — für ein Video, das
        * {once} kostet. Ohne diesen Satz ist das ein Schreck im falschen Moment, und der Satz
        * „der Rest bleibt dir" ist der ganze Unterschied zwischen Aufladung und Abzocke.
        *
        * Nur wo es zutrifft: Bezahlte, Personal und Themen ohne Guthaben-Zwang sehen nichts.
        * Hat er schon genug Guthaben, wird auch nichts aufgeladen — dann stimmt der Satz
        * nicht mehr und verschwindet.
        */}
      {V.nurGuthaben && !bezahlt && !isStaff && (guthabenCents ?? 0) < videoPreisCents && (
        <p className="mx-auto mt-1.5 max-w-[340px] text-center text-[11.5px] font-bold leading-snug text-white/70">
          {/* Bei Lingerie-Wahl nennt der Satz den Lingerie-Preis — sonst stuende „1,49"
              neben einer 3,99-Kachel, und genau solche Widersprueche lesen sich als Falle. */}
          {fillPrices(T.guthabenVorabHinweis.replace("{once}", lingerieGewaehlt ? "{lingerie}" : "{once}"), lang)}
        </p>
      )}
      {/* WAS IHM DIESEN MONAT NOCH ZUSTEHT (Owner 30.07.2026). Ohne diese Zeile weiss ein
          Abonnent nie, wo er steht — und merkt es erst, wenn nichts mehr geht. */}
      {aboAktiv && typeof videosLinks === "number" && (
        <p className="mt-1 text-center text-[11px] font-bold text-[#f6cf51]">
          {T.aboAktiv(videosLinks, INCLUDED_VIDEOS_PER_MONTH)}
        </p>
      )}
      {/* Der Nutzungshinweis: Rechte an den Fotos, Alter, Verantwortung. Die Zustimmung zu
          AGB, Datenschutz und Post steht schon bei Schritt 1 (Owner 30.07.2026: „bei ersten
          bild muss schon stehen und mit klick auf weiter akzeptiert er das schon"). */}
      <p className="mx-auto mt-1.5 max-w-[300px] text-center text-[10px] font-medium leading-snug text-white/45">
        {T.consent}
      </p>

      </>)}
        </div>
      </div>
      )}

      {/* BLEIBT IMMER STEHEN, in jedem Schritt (Owner 30.07.2026: „die Beispielvideos und
          Buttons bleiben dann drunter immer"). Wer schon weiss, dass er das Video will, soll
          nicht erst durch alle Schritte. Gesperrt, solange Fotos oder Haken fehlen. */}
      {/* WER BEZAHLT HAT, SIEHT KEINE KAUFKNOEPFE MEHR (Owner 30.07.2026: „schon wieder
          springt er vom Stripe zurück zum Zahlen"). Auf dem Bild wurden sie längst verdeckt —
          ohne erzeugtes Bild standen sie waehrend des bezahlten Renderns aber weiter da und
          sahen aus wie eine zweite Rechnung. */}
      {/* ERST AB SCHRITT 3 (Owner 31.07.2026: „die Buttons müssen hier nicht stehen" — zu
          Schritt 1 und 2). Der Gedanke „wer schon weiss, dass er das Video will, soll nicht
          erst durch alle Schritte" war gut gemeint, hat aber einen Preis neben einen leeren
          Platz gestellt: In Schritt 1 und 2 hat er noch nichts gesehen, und ein Kaufknopf ohne
          Ergebnis liest sich als Bezahlschranke. Ab Schritt 3 stehen beide Gesichter da — dort
          ist die Frage „was kostet es" die richtige.

          NACHGESCHAERFT, weil sie auch in Schritt 3 falsch standen (Owner: „hier müssen die
          Buttons auch nicht stehen"): Es haengt nicht am Schritt, sondern am ERGEBNIS. Solange
          kein Bild da ist, verkaufen wir ein Versprechen; ist es da, verkaufen wir etwas, das
          er gerade gesehen hat.

          ABER `bild` ALLEIN REICHT NICHT: Es wird aus dem Browser wiederhergestellt, damit ein
          Seitenwechsel das Ergebnis nicht verliert. Wer gestern etwas erzeugt hat und heute neu
          anfaengt, hatte die Knoepfe damit schon in Schritt 1 wieder vor der Nase (Owner
          31.07.2026: „hast du mir die Buttons wieder rein gemacht?"). Es braucht beides: ein
          Ergebnis UND den Schritt, auf dem es zu sehen ist. */}
      {V.einzelkauf && schritt >= 4 && !!bild && !isStaff && !bezahlt && !videoUrl && (
        <div className="mt-2 flex gap-2">
          {V.einzelkauf && (
            <button type="button" onClick={() => void unlock("once")}
              disabled={!selPhoto || !photo || !consent || payBusy}
              className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-[#f6cf51]/60 px-3 text-[12px] font-black text-[#f6cf51] active:scale-95 transition disabled:opacity-40">
              {payBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
              {T.buyOnce}
            </button>
          )}
          {V.abo && (
            <button type="button" onClick={() => void unlock("abo")}
              disabled={!selPhoto || !photo || !consent || payBusy}
              style={{ color: "#fff" }}
              className="flex h-11 flex-1 items-center justify-center rounded-full border border-white/30 px-3 text-[12px] font-black active:scale-95 transition disabled:opacity-40">
              {T.buyAbo}
            </button>
          )}
        </div>
      )}
      {/* DAS VERSPRECHEN STEHT IN JEDEM SCHRITT (Owner 30.07.2026: „du musst sagen dass die
          Bilder überall privat bleiben und nicht veröffentlicht werden. Nur er sieht die").
          Es steht bewusst HIER, unter den Kaufknöpfen: dieser Block wird in jedem Schritt
          gerendert — beim Hochladen ihres Fotos, beim eigenen Gesicht, vor dem Erzeugen und
          neben dem Ergebnis. Wer sein Gesicht hergibt, will das lesen, bevor er tippt, nicht
          hinterher. */}
      <p className="mx-auto mt-2 max-w-[320px] text-center text-[11px] font-bold leading-snug text-white/60">
        {T.privat}
      </p>
      {status && <p className="mt-2 text-center text-[12px] font-bold text-white/60">{status}</p>}

      {/* DER TEILEN-DIALOG: erst wissen, dann öffentlich (Owner 01.08.2026). */}
      {/* DAS UPLOAD-TOR (Owner 03.08.2026: „sie dürfen nicht ein Mal hochladen ohne Email
          anzugeben"). Steht VOR jedem ersten Foto — `onFile`/`onModelFile` oeffnen es statt
          hochzuladen, sobald `adresseDa` fehlt, und legen das Foto in `gateDatei` beiseite.
          Kein Abbrechen-Kreuz: ohne Adresse gibt es kein Foto, das man stattdessen zeigen
          koennte — schliessen hiesse nur, das Foto stillschweigend zu verwerfen. */}
      {gateOffen && (
        <div className="fixed inset-0 z-[96] grid place-items-center p-5" style={{ background: "rgba(0,0,0,0.72)" }}>
          <div className="w-full max-w-[340px] rounded-3xl bg-white p-6 text-center">
            <p className="text-[16px] font-black leading-snug" style={{ color: "#1a160f" }}>{T.gateTitel}</p>
            <input ref={mailGateRef} value={mail}
              onChange={e => { setMail(e.target.value); if (mailFehler) setMailFehler(""); }}
              type="email" inputMode="email" autoComplete="email" placeholder="you@email.com"
              onKeyDown={e => { if (e.key === "Enter") void gateWeiter(); }}
              style={{ color: "#1a160f", caretColor: "#1a160f" }}
              className="lb-eingabe mt-4 h-12 w-full rounded-xl border border-black/15 bg-black/[0.03] px-3 text-center text-[15px] font-bold outline-none placeholder:text-black/35 focus:border-[#f6cf51]" />
            {mailFehler && (
              <p role="alert" style={{ color: "#ef4444" }} className="mt-1.5 text-center text-[12.5px] font-black leading-snug">
                {mailFehler}
              </p>
            )}
            <button type="button" onClick={() => void gateWeiter()} disabled={mailBusy}
              className="lb-gold lb-buy mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full font-black active:scale-95 transition disabled:opacity-60">
              {mailBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {T.gateWeiter}
            </button>
            <p className="mt-3 text-center text-[10px] font-medium leading-snug text-black/50">
              {T.privat}
            </p>
          </div>
        </div>
      )}

      {shareFrage && (
        <div className="fixed inset-0 z-[95] grid place-items-center p-5" style={{ background: "rgba(0,0,0,0.72)" }}
          onClick={() => setShareFrage(false)}>
          <div className="w-full max-w-[340px] rounded-3xl bg-white p-6 text-center" onClick={e => e.stopPropagation()}>
            <p className="text-[18px] font-black" style={{ color: "#1a160f" }}>{T.shareTitel}</p>
            <p className="mt-2 text-[13px] font-bold leading-snug" style={{ color: "#5b5344" }}>{T.shareText}</p>
            <button type="button" onClick={() => void werkTeilen()}
              className="lb-gold lb-buy mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full font-black active:scale-95 transition">
              <Send className="h-4 w-4" /> {T.shareOk}
            </button>
            <button type="button" onClick={() => setShareFrage(false)}
              style={{ color: "#5b5344" }}
              className="mt-2 flex h-11 w-full items-center justify-center rounded-full border border-black/15 text-[13px] font-black active:scale-95 transition">
              {T.shareCancel}
            </button>
          </div>
        </div>
      )}

      {/* Ergebnisbereich — der Screen springt hierher (Radar → Teaser → echtes Video). */}
      <div ref={resultRef}>
        {/* Radar-Scan (wie der Try-On-„Reveal"): Scanner-Balken + Sucher-Ecken über dem Foto.
            AUCH BEIM BEZAHLTEN VIDEO (Owner 30.07.2026: „hier sollte radar loading kommen").
            Bisher lief er nur beim Gratis-Bild; nach der Zahlung stand da ein Knopf mit
            „Rendering your video …" und sonst nichts — drei Minuten lang. Wer bezahlt hat,
            muss am deutlichsten sehen, dass etwas passiert. Liegt schon ein Bild vor, trägt
            es seine eigene Auflage (weiter unten), dann bliebe der Radar doppelt. */}
        {/* AUCH IN DER LUECKE NACH DER ZAHLUNG (Owner 31.07.2026: „nach der Zahlung passiert
            nichts"). Zwischen bestaetigter Zahlung und dem Start des Auftrags liegen ein paar
            Zehntelsekunden, in denen die Fotos aus dem Geraetespeicher zurueckkommen. Ohne
            `bezahlt` hier stand in dieser Luecke NICHTS auf dem Schirm — und genau daraus
            entsteht der Eindruck, das Geld sei weg. */}
        {(busy || videoBusy || (bezahlt && !isStaff)) && !videoUrl && !bild && !!(selPhoto || photo) && (
          <div className="mx-auto mt-4 w-full max-w-[420px]">
            <div className="relative overflow-hidden rounded-3xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selPhoto || photo} alt="" className="aspect-[3/4] w-full object-cover object-top blur-[6px] brightness-75" />
              {/* Weißer Scanner-Balken, fährt runter und wieder hoch. */}
              <div className="lb-scanline pointer-events-none absolute inset-x-0 z-10 h-[2px] bg-white shadow-[0_0_18px_5px_rgba(255,255,255,0.7)]" />
              <div className="lb-scanline pointer-events-none absolute inset-x-0 z-10 h-14 -translate-y-1/2 bg-gradient-to-b from-transparent via-white/15 to-transparent" />
              {/* Kamera-Sucher-Ecken. */}
              <div className="pointer-events-none absolute left-3 top-3 z-20 h-6 w-6 rounded-tl-lg border-l-2 border-t-2 border-white/90" />
              <div className="pointer-events-none absolute right-3 top-3 z-20 h-6 w-6 rounded-tr-lg border-r-2 border-t-2 border-white/90" />
              <div className="pointer-events-none absolute bottom-3 left-3 z-20 h-6 w-6 rounded-bl-lg border-b-2 border-l-2 border-white/90" />
              <div className="pointer-events-none absolute bottom-3 right-3 z-20 h-6 w-6 rounded-br-lg border-b-2 border-r-2 border-white/90" />
              <div className="lb-onmedia pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-2 bg-gradient-to-t from-black/70 to-transparent p-4 pt-12 text-white">
                {/* `lb-onmedia` statt einer eigenen Farbe (Owner 30.07.2026: „die Schrift ist
                    immer noch unlesbar in schwarz"). Die Zeile hatte GAR KEINE Farbe und erbte
                    deshalb die dunkle der hellen Fassung — auf einem dunklen Bild also schwarz
                    auf schwarz. `lb-onmedia` ist die einzige Klasse, die in beiden Fassungen
                    weiss erzwingt UND von der Blau-Regel in .lb-fb ausgenommen ist; ein inline
                    `#fff` waere dort zu Blau umgefaerbt worden. */}
                <Sparkles className="lb-onmedia h-4 w-4 animate-pulse" />
                {/* Wer bezahlt hat, liest zuerst „Zahlung erhalten" — das ist die Auskunft,
                    auf die es ihm in dieser Sekunde ankommt. */}
                <span className="lb-onmedia text-[12px] font-black">
                  {status || (bezahlt && !busy ? T.payReceived : T.rendering)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* GESCHEITERT — aber die Adresse haben wir schon (sie steht jetzt VOR der Erzeugung).
            Also kein Formular mehr an dieser Stelle, sondern eine Zusage und ein zweiter
            Versuch. Die Mail „wir melden uns" ist bereits raus. */}
        {gescheitert && !bild && !videoUrl && (
          <div className="mx-auto mt-4 w-full max-w-[340px] rounded-3xl border border-white/15 bg-white/[0.05] p-5 text-center">
            <p className="text-[16px] font-black text-white">{T.failTitle}</p>
            <p className="mt-1 text-[12px] font-bold leading-snug text-white/75">
              {mail
                ? T.failWithMail(mail)
                : T.failNoMail}
            </p>
            <button type="button" onClick={() => { setGescheitert(false); void generate(); }}
              className="lb-gold lb-buy mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full font-black active:scale-95 transition">
              <RefreshCw className="h-4 w-4" /> {T.tryAgain}
            </button>
          </div>
        )}

        {/* KONTINGENT LEER → EIN WEG WEITER, keine Sackgasse (Owner 30.07.2026: „kann er
            dann weiter Videos kaufen für 3,99?"). Kein zweites Abo, kein voller Einzelpreis:
            ein Video zum Abo-Aufpreis, das Abo läuft unberührt weiter. */}
        {/**
          * BEIM KUSS: KEIN 2,99-NACHKAUF MEHR (Owner 03.08.2026: „hier steht noch ein Video
          * für 2,99, das haben wir gar nicht mehr. Es muss stehen: noch ein Video
          * generieren — dann fängt er neu an").
          *
          * Der Einzelkauf kauft genau EIN Video; will er ein zweites, beginnt ein NEUER
          * Auftrag: frischer Eintrag mit denselben Fotos (die liegen ja noch im Zustand),
          * Zustand zurueck auf „vor der Zahlung". Damit greift von selbst die normale
          * Guthaben-Abbuchung fuers naechste Video — kein Sonderpreis, kein Sonderweg, und
          * das fertige erste Video bleibt unangetastet in seiner Galerie.
          */}
        {extraNoetig && variant === "kiss" && !videoUrl && !isStaff && (
          <div className="mx-auto mt-4 w-full max-w-[340px] rounded-3xl border border-[#f6cf51]/30 bg-[#f6cf51]/[0.06] p-5 text-center">
            <button type="button" disabled={payBusy || videoBusy}
              onClick={() => void (async () => {
                setExtraNoetig(false); setBezahlt(false); setVideoUrl(""); setBild(""); setBildPfad("");
                setStatus(""); setGesperrt(false);
                // Neuer Eintrag mit den vorhandenen Fotos — die naechste Abbuchung haengt an
                // der NEUEN Kennung (die alte ist mit ihrem einen Video abgegolten).
                let device = "";
                try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
                const log = await fetch("/api/kiss-log", {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ theme: variant, modelId: selId, modelName: selName, device, lang, email: mail.trim(),
                    personImage: photo, ...(useCustom && customModel ? { modelImage: customModel } : {}) }),
                }).then(r => r.json()).catch(() => null);
                if (log?.id) genMerken(log.id);
                // Zurueck zur Auswahl — Szene/Waesche stehen noch, ein Klick startet neu.
                setStufenOffen(true); setSchritt(3);
              })()}
              className="lb-gold lb-buy flex h-12 w-full items-center justify-center gap-2 rounded-full font-black active:scale-95 transition disabled:opacity-60">
              <Sparkles className="h-4 w-4" />
              {T.nochmalVideo}
            </button>
          </div>
        )}
        {extraNoetig && variant !== "kiss" && V.abo && !videoUrl && !isStaff && (
          <div className="mx-auto mt-4 w-full max-w-[340px] rounded-3xl border border-[#f6cf51]/30 bg-[#f6cf51]/[0.06] p-5 text-center">
            <p className="text-[16px] font-black text-white">{T.extraTitel}</p>
            <button type="button" onClick={() => void unlock("extra")} disabled={payBusy}
              className="lb-gold lb-buy mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full font-black active:scale-95 transition disabled:opacity-60">
              {payBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {T.extraCta}
            </button>
            <p className="mt-2 text-[10px] font-medium leading-snug text-white/60">{T.extraNote}</p>
          </div>
        )}

        {/* GRATIS AUFGEBRAUCHT → sofort weiter, nicht abwürgen. Ein Satz „schon genutzt"
            ohne Knopf ist das Ende des Trichters; hier stehen beide Wege direkt darunter. */}
        {/* NICHT MEHR, WENN ER BEZAHLT HAT (Owner 31.07.2026: „nach der Zahlung passiert
            nichts … Kunde wurde ausgeraubt"). Dieser Kasten traegt den Kaufknopf. Blieb er
            nach der Zahlung stehen, las er sich als zweite Rechnung — und daneben lief das
            bezahlte Rendern, das er dadurch gar nicht bemerkte. */}
        {gesperrt && !isStaff && !bild && !videoUrl && !bezahlt && !payBusy && !videoBusy && (
          <div className="mx-auto mt-4 w-full max-w-[340px] rounded-3xl border border-[#f6cf51]/30 bg-[#f6cf51]/[0.06] p-5 text-center">
            <p className="text-[16px] font-black text-white">{T.blockedTitle}</p>
            <p className="mt-1 text-[12px] font-bold leading-snug text-white/75">
              {T.blockedBody}
            </p>
            {V.einzelkauf ? (
              <button type="button" onClick={() => void unlock("once")} disabled={payBusy}
                className="lb-gold lb-buy mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full font-black active:scale-95 transition disabled:opacity-60">
                {payBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                {T.blockedOnce}
              </button>
            ) : (
              <button type="button" onClick={() => void unlock("abo")} disabled={payBusy}
                className="lb-gold lb-buy mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full font-black active:scale-95 transition disabled:opacity-60">
                {payBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                {T.blockedAll}
              </button>
            )}
            {/* VOLLE WEISSE FLAECHE (Owner 30.07.2026: „Unlock kann ich nicht lesen, es steht
                in blau auf blau"). Ein umrandeter Knopf uebernimmt die Schriftfarbe der
                Umgebung — auf dem blauen Kasten heisst das blau auf blau. Weisse Flaeche mit
                dunkler Schrift liest sich auf jedem Grund; dieselbe Loesung wie beim
                Kauf-Knopf auf dem Foto. */}
            {/* AUFLADEN GENAU HIER (Owner 01.08.2026: „bei Kiss Credits fuer 9,99 ab der
                zweiten Versuch"). Das ist der Moment, in dem er mehr will — der Knopf muss
                dort stehen, wo die Sperre ihn trifft, nicht irgendwo weiter unten. */}
            <button type="button" onClick={() => void unlock("auflade")} disabled={payBusy}
              style={{ background: "#fff", color: "#1a160f" }}
              className="mt-2 flex h-11 w-full items-center justify-center rounded-full text-[12px] font-black shadow-md active:scale-95 transition disabled:opacity-60">
              {fillPrices(T.aufladen, lang)}
            </button>
            <p className="mt-1 text-[10px] font-medium leading-snug text-white/60">{T.aufladenHinweis}</p>
            {V.abo && V.einzelkauf && (<>
              <button type="button" onClick={() => void unlock("abo")} disabled={payBusy}
                style={{ background: "#fff", color: "#1a160f" }}
                className="mt-2 flex h-11 w-full items-center justify-center rounded-full text-[12px] font-black shadow-md active:scale-95 transition disabled:opacity-60">
                {T.blockedAll}
              </button>
              <p className="mt-2 text-[10px] font-medium leading-snug text-white/60">
                {renewNote(lang)}
              </p>
            </>)}
          </div>
        )}

        {/* Der alte Ergebnis-Block stand hier (Bild + Unschaerfe + Render-Show + Kasse).
            Aufgeloest am 31.07.2026: Alles davon traegt jetzt die KARTE oben — das Bild
            stand sonst zweimal auf der Seite. Der Video-Spieler darunter blieb. */}

        {/* Das ECHTE Video (nach Zahlung / Admin-Reveal) — klar + Download. */}
        {videoUrl && (
          <div className="mx-auto mt-4 w-full max-w-[420px]">
            <div className="overflow-hidden rounded-3xl border border-white/10">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video src={videoUrl} controls autoPlay loop playsInline className="aspect-[3/4] w-full" />
            </div>
            <a href={videoUrl} download={V.done} target="_blank" rel="noreferrer"
              className="lb-gold mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full text-[14px] font-black active:scale-95 transition">
              {T.download}
            </a>
            {/* NUR BEI DER HOCHZEIT: aus dem Video wird eine Einladung, die sie an ihre
                Gaeste schickt. Das ist die einzige Stelle im Portal, an der ein Kunde uns die
                naechsten Besucher bringt — deshalb steht der Knopf direkt unter dem Video,
                im Moment der Freude, und nicht irgendwo im Menue. */}
            {/* DIE EINLADUNG ZUM ANSEHEN (Owner 31.07.2026: „wo das Video ist, hier musst du
                die Einladung zeigen gleich wie sie aussieht, und wenn's geht mit Jugendstil-
                Ornamenten").

                Vorher stand hier nur ein Knopf — sie sollte kaufen, was sie nie gesehen hat.
                Jetzt liegt die fertige Karte unter dem Video und schreibt sich beim Tippen
                mit. Es ist DIESELBE Komponente wie auf der Seite, die der Gast öffnet; eine
                nachgebaute Vorschau würde irgendwann etwas anderes zeigen. */}
            {variant === "wedding" && !einlUrl && (!!videoUrl || !!bild) && (
              <div className="mt-4">
                <p className="mb-2 text-center text-[11px] font-black uppercase tracking-[0.2em] text-white/45">
                  {T.einlVorschau}
                </p>
                <EinladungKarte
                  sprache={lang}
                  sie={einlSie.trim() || T.einlSie}
                  er={einlEr.trim() || T.einlEr}
                  datum={einlDatum}
                  ort={einlOrt.trim()}
                  adresse={einlAdresse.trim()}
                  telefon={einlTelefon.trim()}
                  video={
                    videoUrl
                      ? <EinladungAnsicht id="" videoUrl={videoUrl} zaehlen={false}
                          tonText={(KARTE_TEXTE[lang] ?? KARTE_TEXTE.en).ton}
                          tonAusText={(KARTE_TEXTE[lang] ?? KARTE_TEXTE.en).tonAus} />
                      // eslint-disable-next-line @next/next/no-img-element
                      : <img src={bild} alt="" className="aspect-[3/4] w-full object-cover" />
                  }
                />
              </div>
            )}
            {variant === "wedding" && !einlUrl && (!!videoUrl || !!bild) && (
              einlOffen ? (
                <div className="mt-3 rounded-2xl border border-white/15 bg-white/[0.05] p-4">
                  <p className="text-[14px] font-black text-white">{T.einlTitel}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <input value={einlSie} onChange={e => setEinlSie(e.target.value)} placeholder={T.einlSie}
                      style={{ color: "#fff", WebkitTextFillColor: "#fff" }}
                      className="h-11 w-full rounded-lg border border-white/25 bg-black/40 px-3 text-[14px] font-bold outline-none placeholder:text-white/40 focus:border-[#f6cf51]" />
                    <input value={einlEr} onChange={e => setEinlEr(e.target.value)} placeholder={T.einlEr}
                      style={{ color: "#fff", WebkitTextFillColor: "#fff" }}
                      className="h-11 w-full rounded-lg border border-white/25 bg-black/40 px-3 text-[14px] font-bold outline-none placeholder:text-white/40 focus:border-[#f6cf51]" />
                  </div>
                  <input value={einlDatum} onChange={e => setEinlDatum(e.target.value)} type="date" aria-label={T.einlDatum}
                    style={{ color: "#fff", colorScheme: "dark" }}
                    className="mt-2 h-11 w-full rounded-lg border border-white/25 bg-black/40 px-3 text-[14px] font-bold outline-none focus:border-[#f6cf51]" />
                  <input value={einlOrt} onChange={e => setEinlOrt(e.target.value)} placeholder={T.einlOrt}
                    style={{ color: "#fff", WebkitTextFillColor: "#fff" }}
                    className="mt-2 h-11 w-full rounded-lg border border-white/25 bg-black/40 px-3 text-[14px] font-bold outline-none placeholder:text-white/40 focus:border-[#f6cf51]" />
                  {/* GENAUE ANSCHRIFT (Owner 31.07.2026: „da muss auch eine genaue Adresse rein
                      mit Postleitzahl und WA Nummer"). Der Saalname steht oben, hier steht,
                      wohin man faehrt. */}
                  <input value={einlAdresse} onChange={e => setEinlAdresse(e.target.value)}
                    placeholder={T.einlAdresse} autoComplete="street-address"
                    style={{ color: "#fff", WebkitTextFillColor: "#fff" }}
                    className="mt-2 h-11 w-full rounded-lg border border-white/25 bg-black/40 px-3 text-[14px] font-bold outline-none placeholder:text-white/40 focus:border-[#f6cf51]" />
                  {/* Die Nummer ist die Gaesteliste: Der Gast schreibt IHR, nicht uns. */}
                  <input value={einlTelefon} onChange={e => setEinlTelefon(e.target.value)}
                    placeholder={T.einlTelefon} type="tel" inputMode="tel" autoComplete="tel"
                    style={{ color: "#fff", WebkitTextFillColor: "#fff" }}
                    className="mt-2 h-11 w-full rounded-lg border border-white/25 bg-black/40 px-3 text-[14px] font-bold outline-none placeholder:text-white/40 focus:border-[#f6cf51]" />
                  <button type="button" onClick={() => void einladungAnlegen()}
                    disabled={einlBusy || !einlSie.trim() || !einlEr.trim()}
                    className="lb-gold lb-buy mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full font-black active:scale-95 transition disabled:opacity-50">
                    {einlBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {T.einlMachen}
                  </button>
                </div>
              ) : (
                <>
                  <button type="button" onClick={() => setEinlOffen(true)}
                    className="mt-3 flex h-11 w-full items-center justify-center rounded-full border border-[#f6cf51]/60 text-[13px] font-black text-[#f6cf51] active:scale-95 transition">
                    {T.einlKnopf}
                  </button>
                  {/* Das Argument, das bei Hochzeiten wirklich zieht: Ein guter Teil der Gäste
                      sitzt im Ausland. Seit die Einladung die Sprache des GASTES nimmt, ist
                      der Satz wahr — vorher las ein Franzose die rumänische Fassung. */}
                  <p className="mt-1.5 text-center text-[11px] font-bold text-white/55">🌍 {T.einlSprachen}</p>
                </>
              )
            )}
            {einlUrl && (
              <div className="mt-3 rounded-2xl border border-[#f6cf51]/30 bg-[#f6cf51]/[0.06] p-4 text-center">
                <p className="text-[14px] font-black text-white">{T.einlFertig}</p>
                <p className="mt-1 break-all text-[11px] font-bold text-white/60">{einlUrl}</p>
                {/* Die Frist steht DA, wo der Link steht — nicht im Kleingedruckten. Wer sie
                    erst beim Ablauf erfaehrt, hat sie schon an achtzig Leute verschickt und
                    fuehlt sich hereingelegt; wer sie vorher liest, entscheidet in Ruhe. */}
                {!videoUrl && (
                  <p className="mt-2 text-[11px] font-bold leading-snug text-white/70">{T.probeHinweis}</p>
                )}
                {/* WhatsApp, nicht E-Mail: In Rumaenien, Italien und Frankreich laeuft so
                    etwas ueber WhatsApp-Gruppen. Ein reiner Link, kein Konto, keine Anbindung. */}
                <button type="button"
                  onClick={async () => {
                    // Systemauswahl statt fester App — dieselbe Regel wie auf der Einladung.
                    const t = `${einlSie} & ${einlEr} 💍`;
                    try { if (navigator.share) { await navigator.share({ title: t, text: t, url: einlUrl }); return; } } catch { return; }
                    try { await navigator.clipboard?.writeText(`${t} ${einlUrl}`); setStatus(T.einlKopiert); } catch { /**/ }
                  }}
                  className="lb-gold lb-buy mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full font-black active:scale-95 transition">
                  {T.einlWhatsapp}
                </button>
                <button type="button"
                  onClick={() => { void navigator.clipboard?.writeText(einlUrl); setStatus(T.einlKopiert); }}
                  style={{ color: "#fff" }}
                  className="mt-2 flex h-10 w-full items-center justify-center rounded-full border border-white/30 text-[12px] font-black active:scale-95 transition">
                  {T.einlKopiert.replace("…", "")}
                </button>
              </div>
            )}
            {/* Privat-Hinweis (Owner-Vorgabe): nicht in sozialen Medien teilen. */}
            <p className="mx-auto mt-2 max-w-[280px] text-center text-[11px] font-bold leading-snug text-white/55">
              {T.privateNote}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
