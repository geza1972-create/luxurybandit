"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getStoredAuthSession, signOut, signInWithOAuth } from "@/lib/supabase-auth-client";
import { guthabenLesen, aktiveAdresse, type Gestrandet } from "@/lib/guthaben-konto";
// Aliasiert: `T.mailVorschlag` ist der TEXT, `mailTippfehler` die Pruefung — zwei Dinge,
// zwei Namen, sonst verdeckt der eine den anderen.
import { mailVorschlag as mailTippfehler } from "@/lib/mail-tippfehler";
import { Loader2, ImageUp, Lock, RefreshCw, Check, Sparkles, X, Trash2, ChevronLeft, ChevronRight, Send, Maximize2, Mic, Square } from "lucide-react";
/* `AUFLADE_STUFEN` und `eur` sind mit dem Aufladewähler in die Bibliothek gezogen — die
   Leiter rechnet jetzt `lib/kasse` (`deckendeStufen`), die Beträge schreibt `AufladeWaehler`. */
import { renewNote, INCLUDED_VIDEOS_PER_MONTH, geschenkPreisCents, fillPrices, themenPreisZeile, eur, type ThemenSchluessel } from "@/lib/pricing";
import { logFunnelEvent, logTunnelEvent } from "@/lib/track-funnel";
import { darfMessen } from "@/lib/land-erkennen";
import { trackMetaPixel } from "@/lib/meta-pixel";
import { HOLIDAY_SCENES, holidayPrompt, type HolidayScene } from "@/lib/holiday-scenes";
import { tryonPrompt } from "@/lib/tryon-prompt";
import EinladungKarte, { KARTE_TEXTE } from "@/components/EinladungKarte";
import { CornerOrnaments, DividerOrnament } from "@/components/BoxOrnaments";
import TonKnopf from "@/components/TonKnopf";
import ImageCropper from "@/components/ImageCropper";
import EinladungAnsicht from "@/components/EinladungAnsicht";
import Reaktionen from "@/components/Reaktionen";
import TeilenKnopf from "@/components/TeilenKnopf";
/* Ein Zeichen je Thema statt des Kussmunds für alle (Owner 10.08.2026). */
import { teilenText } from "@/components/BeispielGalerie";
import { Dialog, MadeBy, Knopf, BildWahl, AnmeldeEinladung, Scheibe, Zahlungssiegel, AufladeWaehler, ABSAGE_ROT, TunnelStart, VorlagenKachel, VorlagenUeberlagerung, TunnelKachelUpload, KurzeEinwilligung, InAppBrowserHinweis } from "@/components/CI";
import { Eingabe } from "@/components/CI";
import { zielTexte, MAX_ZIELE, ZIEL_IDS, ZIEL_FREI, type ZielId } from "@/lib/future-ziele";
import { GEBURTSTAG_LOOKS } from "@/lib/geburtstag-looks";
import { VERSPRECHEN_LOOKS } from "@/lib/versprechen-looks";
import { VERSPRECHEN_HEUTE, VERSPRECHEN_SPAETER } from "@/lib/versprechen";
import { kontoText } from "@/lib/konto-i18n";
/**
 * DIE GESCHENK-TABELLE WOHNT JETZT IN `lib/geschenke.ts` (Owner 03.08.2026,
 * Geschenke-Marktplatz). Sie stand hier mitten im Trichter — damit war „ein neues
 * Geschenk anlegen" eine Aenderung an 3.900 Zeilen statt ein Eintrag in einer Liste.
 * `VARIANTS` bleibt als Name stehen: Er kommt im Trichter ueber hundertmal vor, und ein
 * Umbenennen waere Laerm ohne Gewinn in genau der Datei, die ohnehin zu gross ist.
 */
import { GESCHENKE as VARIANTS, KISS_PROMPT, PLACEHOLDER_MAN, type GeschenkId as FunnelVariant } from "@/lib/geschenke";
import { kissText, type KissText } from "@/lib/kiss-i18n";
import { kussSzeneVideoPrompt, zufallsSzene, kussSzene, KUSS_SZENEN, kussBewegung } from "@/lib/kuss-szenen";
import { POLEDANCE_PROMPT, POLEDANCE_SETS, POLEDANCE_REFERENZEN, poledancePromptFuerSet } from "@/lib/poledance";
/* GEBURTSTAG_PROMPT wohnt weiter in lib/geburtstag, wird aber seit dem 07.08.2026 nur noch
   dokumentarisch gebraucht: Der Geburtstag erzeugt über /api/geburtstag-video (OpenAI→HeyGen),
   nicht mehr über den Pixverse-Zweig dieses Trichters. */
import { geburtstagTitel, GEBURTSTAG_VIDEO, GEBURTSTAG_VIDEO_TRAUM, GEBURTSTAG_VIDEO_MANN } from "@/lib/geburtstag";
import { landAusZeitzone } from "@/lib/land-erkennen";
import { KISS_LOOK_ID, WEDDING_KLEIDER, weddingPrompt, WEDDING_PROMPT } from "@/lib/wedding-prompt";
import { kasseOeffnen, kassenFenster } from "@/lib/browser-erkennen";
import { useKasseImFenster } from "@/components/KasseImFenster";

import FotoAnleitung from "@/components/FotoAnleitung";
import KartenKarussell from "@/components/KartenKarussell";

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
/**
 * DAS KOPF-RECHTECK EINER VORLAGE, in PROZENT des Bildes (Owner 16.08.2026). Es faellt bei
 * der Sicherheitspruefung ab, die jeder Upload ohnehin durchlaeuft (`/api/kiss-log` →
 * `kopfEr`/`kopfSie`, siehe lib/minderjaehrig-pruefen.ts) — deshalb kostet es nichts.
 */
type KopfBox = { x: number; y: number; w: number; h: number };


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
    const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error(
      /* Klartext statt Format-Kauderwelsch: Der Kunde soll wissen, was er TUN kann. iPhone-
         Fotos sind HEIC; am Handy wandelt der Bildwaehler sie von selbst in JPEG um, sobald
         wir HEIC nicht mehr im `accept` anbieten — am Schreibtisch muss er es selbst tun. */
      "Dieses Foto können wir nicht lesen (iPhone-Format HEIC). Bitte lade es als JPG hoch.")); i.src = dataUrl;
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
/**
 * WELCHE PRODUKTE SCHON DEN EINEN TUNNEL HABEN (Owner 12.08.2026, „oberstes Gesetz": „allle
 * funnels und wenn eine änderung bitbs dann ist es bei allen gleich"). Die Reihenfolge der
 * Umstellung steht in KONZEPT-TUNNEL.md §„Feste Regeln": Versprechen zuerst, dann Kuss und
 * Geburtstag — Hochzeit/Urlaub/Gutschein laufen auf `EinladungBauen`, nicht hier.
 *
 * DER ORDNERNAME IST DIE ADRESSE: Jeder Eintrag hier hat eine eigene Seite unter
 * `/themes/<eintrag>/start` — `schritteOeffnen` baut die Adresse direkt aus diesem Wert,
 * ohne eine zweite Zuordnungstabelle zu pflegen.
 */
const TUNNEL_VARIANTEN: readonly string[] = ["versprechen", "kiss", "birthday", "poledance"];
/**
 * KENNEN WIR IHN SCHON, BEVOR DIE SEITE UEBERHAUPT GEZEICHNET IST? (Owner 12.08.2026,
 * Nachschaerfung zum Tunnel-Konzept: „wenn jemand angemeldet ist braucht man name email
 * nicht mehr" · „aber das muss der funel sein. Super einfach").
 *
 * `aktiveAdresse()` (lib/guthaben-konto) traegt bereits alle drei Faelle in EINER Zeile:
 * die angemeldete Sitzung, das Tor/frueheren Besuch (`lb_kiss_mail` und Geschwister-
 * Schluessel) und eine gespeicherte Kassen-Adresse. Ist einer davon da, ist Schritt 1 des
 * Tunnels (Name + E-Mail) ueberfluessig — der Trichter startet fuer Bekannte direkt bei
 * Schritt 2 (die zwei Kacheln + Generieren), OHNE das Namensfeld je zu zeigen.
 *
 * SYNCHRON, nicht erst im Effekt: Ein Effekt liefe eine Zeichnung zu spaet, und Bekannte
 * saehen den Tunnel-Start fuer einen Wimpernschlag aufblitzen, bevor er wieder verschwindet.
 * `typeof window === "undefined"` haelt das bei einer Server-Zeichnung fest — dort gibt es
 * weder `localStorage` noch eine Sitzung, und ohne die Wache wuerde genau dort ein Fehler
 * fliegen, nicht nur ein falscher Start-Schritt.
 */
const versprechenSchonBekannt = (): boolean => {
  if (typeof window === "undefined") return false;
  try { return !!aktiveAdresse(); } catch { return false; }
};
/**
 * Der Name, an den der Gruss geht — ueberlebt Neuladen und Kassen-Rueckkehr wie die Fotos.
 *
 * JE THEMA EIN NAME (03.08.2026, beim Bau des Tanzes aufgefallen): Der Schluessel war global,
 * und damit stand auf dem Tanzvideo der Name, den jemand beim KUSS eingetippt hatte — „Anna,
 * das ist fuer dich" auf einem Video, das an Chris geht. Die Adresse bleibt bewusst global
 * (derselbe Mensch, ein Konto); der Empfaenger ist es nicht.
 */
const nameKey = (thema: string) => `lb_kiss_name_${thema}`;
/**
 * DIE ZIELE ÜBERLEBEN EIN NEULADEN (Owner 11.08.2026, Ziele-Schritt).
 *
 * Dieselbe Vorsorge wie beim Namen: Wer von der Kasse zurückkommt oder das Fenster neu
 * lädt, hat sonst wieder nichts gewählt — und das Programm später keine Richtung.
 */
const zieleKey = (thema: string) => `lb_ziele_${thema}`;


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
/**
 * EIN BILD AUS DEM REPO ALS DATEN-URL — damit der Server es ueberhaupt annehmen kann.
 *
 * DER FEHLER, DER DAS KOSTETE (03.08.2026, erster echter Tanz-Lauf des Owners): „Pixverse
 * upload failed (reference images)." Das Set ging als `/Pooldance/poledance-set.jpg` an die
 * Route — ein SEITEN-RELATIVER Pfad. Im Browser ist das eine gueltige Adresse; auf dem Server
 * gibt es kein „relativ zu welcher Seite", und `imageToBlob` bricht mit „Failed to parse URL"
 * ab. Pixverse bekam dann nur EIN Referenzbild statt zwei und lehnte den ganzen Auftrag ab.
 *
 * Der Browser dagegen kann den Pfad aufloesen. Also holt er die Datei und schickt sie als
 * `data:`-URL mit — genau so, wie die hochgeladenen Fotos ohnehin reisen. Das ist auch der
 * Weg, der auf Vercel sicher funktioniert: Er muss keine eigene Adresse erraten.
 *
 * Einmal geholt, bleibt es liegen (`datenUrlCache`) — dasselbe Bild geht bei jedem Anlauf
 * mit, und ein zweiter Kauf soll es nicht noch einmal laden.
 */
const datenUrlCache = new Map<string, string>();
async function alsDatenUrl(pfad: string): Promise<string> {
  if (!pfad || pfad.startsWith("data:")) return pfad;
  const gemerkt = datenUrlCache.get(pfad);
  if (gemerkt) return gemerkt;
  try {
    const blob = await (await fetch(pfad)).blob();
    const url = await new Promise<string>((res, rej) => {
      const f = new FileReader();
      f.onload = () => res(String(f.result));
      f.onerror = rej;
      f.readAsDataURL(blob);
    });
    datenUrlCache.set(pfad, url);
    return url;
  } catch {
    // Lieber den Pfad zurueckgeben als gar nichts: Dann scheitert es sichtbar an derselben
    // Stelle wie vorher, statt still ein leeres Bild zu schicken.
    return pfad;
  }
}

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
/**
 * EINE KARTE, ALLE BEISPIELE (Owner 05.08.2026: „ich will nicht mehr mehrere Karten, sondern
 * eine Karte und die Videos wechseln sich ab in der Karte" — „so wird die Seite kürzer" — und
 * auf die erste Fassung mit Galerie darunter: „nein, es sind zwei Karten").
 *
 * `beispielVideos` ersetzt das einzelne `beispielVideo`: Alle Beispiele liegen jetzt IN der
 * einen Karte oben und wechseln per Wischen. Die Beispiel-Galerie weiter unten auf der
 * Themenseite faellt damit weg — sie war die zweite Karte.
 *
 * `beispielVideo` bleibt als Prop bestehen, weil mehrere Seiten es so uebergeben; es ist
 * schlicht der erste Eintrag der Liste.
 */
/** Die Stimmen-Wahl beim Geburtstag — sieben Sprachen, drei Chips (siehe `stimme` unten). */
const STIMME_WORT: Record<string, { frage: string; frau: string; mann: string; selbst: string; lies: string; aufTitel: string; aufHinweis: string; stopp: string; neu: string; look: string; vorlage: string; kameraAus: string; erst: string; leer: string; kurz: string; los: string; abbrechen: string }> = {
  en: { aufTitel: "Record yourself", aufHinweis: "Speak clearly, short and to the point. The better the recording, the more it looks like you — 100 % we cannot promise.", frage: "The voice:", frau: "Female", mann: "Male", selbst: "Record yours", lies: "Read this sentence aloud:", stopp: "Stop", neu: "Again", look: "Pick the look:", vorlage: "This is how your video will look:", kameraAus: "No camera or microphone. Allow access in your browser, then try again.", erst: "Record yourself first", leer: "Nothing was recorded — the camera showed no picture. Check that nothing covers it, then try again.", kurz: "That was too short. Read the whole sentence aloud.", los: "Start now", abbrechen: "Cancel" },
  de: { aufTitel: "Nimm dich auf", aufHinweis: "Sprich klar und deutlich, kurz und knapp. Je besser die Aufnahme, desto ähnlicher das Video — 100 % garantieren wir nicht.", frage: "Die Stimme:", frau: "Frau", mann: "Mann", selbst: "Selbst aufnehmen", lies: "Lies diesen Satz laut vor:", stopp: "Stopp", neu: "Nochmal", look: "Wähl den Look:", vorlage: "So sieht dein Video aus:", kameraAus: "Keine Kamera oder kein Mikrofon. Erlaub den Zugriff im Browser und versuch es nochmal.", erst: "Erst aufnehmen", leer: "Es wurde nichts aufgenommen — die Kamera hat kein Bild geliefert. Prüf, ob etwas davor liegt, und versuch es nochmal.", kurz: "Das war zu kurz. Lies den ganzen Satz laut vor.", los: "Jetzt starten", abbrechen: "Abbrechen" },
  ro: { aufTitel: "Filmează-te", aufHinweis: "Vorbește clar, scurt și la obiect. Cu cât înregistrarea e mai bună, cu atât seamănă mai mult cu tine — 100 % nu garantăm.", frage: "Vocea:", frau: "Femeie", mann: "Bărbat", selbst: "Filmează-te", lies: "Citește propoziția cu voce tare:", stopp: "Stop", neu: "Din nou", look: "Alege look-ul:", vorlage: "Așa va arăta videoclipul tău:", kameraAus: "Fără cameră sau microfon. Permite accesul în browser și încearcă din nou.", erst: "Întâi filmează-te", leer: "Nu s-a filmat nimic — camera nu a dat imagine. Verifică dacă e ceva în fața ei și încearcă din nou.", kurz: "A fost prea scurt. Citește toată propoziția cu voce tare.", los: "Începe acum", abbrechen: "Anulează" },
  es: { aufTitel: "Grábate", aufHinweis: "Habla claro, breve y directo. Cuanto mejor la grabación, más se parece a ti — el 100 % no lo garantizamos.", frage: "La voz:", frau: "Mujer", mann: "Hombre", selbst: "Grábate", lies: "Lee esta frase en voz alta:", stopp: "Parar", neu: "Otra vez", look: "Elige el look:", vorlage: "Así se verá tu vídeo:", kameraAus: "Sin cámara ni micrófono. Permite el acceso en el navegador e inténtalo otra vez.", erst: "Primero grábate", leer: "No se grabó nada: la cámara no dio imagen. Comprueba que nada la tape e inténtalo otra vez.", kurz: "Fue demasiado corto. Lee la frase entera en voz alta.", los: "Empieza ahora", abbrechen: "Cancelar" },
  fr: { aufTitel: "Filme-toi", aufHinweis: "Parle clairement, court et net. Meilleur est l'enregistrement, plus ça te ressemble — le 100 % n'est pas garanti.", frage: "La voix :", frau: "Femme", mann: "Homme", selbst: "Filme-toi", lies: "Lis cette phrase à voix haute :", stopp: "Stop", neu: "Encore", look: "Choisis le look :", vorlage: "Voilà à quoi ressemblera ta vidéo :", kameraAus: "Pas de caméra ni de micro. Autorise l'accès dans le navigateur et réessaie.", erst: "Filme-toi d'abord", leer: "Rien n'a été enregistré — la caméra n'a donné aucune image. Vérifie que rien ne la couvre et réessaie.", kurz: "C'était trop court. Lis la phrase en entier à voix haute.", los: "Commence maintenant", abbrechen: "Annuler" },
  pt: { aufTitel: "Filma-te", aufHinweis: "Fala com clareza, curto e direto. Quanto melhor a gravação, mais se parece contigo — 100 % não garantimos.", frage: "A voz:", frau: "Mulher", mann: "Homem", selbst: "Filma-te", lies: "Lê esta frase em voz alta:", stopp: "Parar", neu: "De novo", look: "Escolhe o look:", vorlage: "É assim que o teu vídeo vai ficar:", kameraAus: "Sem câmara nem microfone. Permite o acesso no navegador e tenta outra vez.", erst: "Primeiro filma-te", leer: "Não foi gravado nada — a câmara não deu imagem. Verifica se algo a tapa e tenta outra vez.", kurz: "Foi demasiado curto. Lê a frase toda em voz alta.", los: "Começa agora", abbrechen: "Cancelar" },
  it: { aufTitel: "Filmati", aufHinweis: "Parla chiaro, breve e diretto. Migliore è la registrazione, più ti somiglia — il 100 % non è garantito.", frage: "La voce:", frau: "Donna", mann: "Uomo", selbst: "Filmati", lies: "Leggi questa frase ad alta voce:", stopp: "Stop", neu: "Di nuovo", look: "Scegli il look:", vorlage: "Ecco come sarà il tuo video:", kameraAus: "Niente fotocamera o microfono. Consenti l'accesso nel browser e riprova.", erst: "Prima filmati", leer: "Non è stato filmato nulla — la fotocamera non ha dato immagine. Controlla che nulla la copra e riprova.", kurz: "Troppo breve. Leggi tutta la frase ad alta voce.", los: "Inizia ora", abbrechen: "Annulla" },
};

/**
 * WIE LANG DIE AUFNAHME DAUERT — DIE EINE ZAHL (Owner 09.08.2026: „mach das Video 5 Sekunden
 * wieder weil wir testen"; am selben Tag vorher: „mach die Videos 8 sek lang").
 *
 * Sie steht bewusst hier oben und NICHT in den sieben Sprachtabellen: Der Knopftext holt sie
 * über den Platzhalter `{sek}`. Beim Wechsel von 5 auf 8 musste ich sie vorher an sieben
 * Stellen ändern — genau die Art Zahl, die irgendwann auseinanderläuft (dieselbe Lehre wie
 * bei den Preisen, Memory `prices-only-from-pricing-table`).
 *
 * Es ist ein PREIS-Deckel, kein technischer: HeyGen nimmt 0,05 Credits je Videosekunde.
 * 5 s = 0,25 $, 8 s = 0,40 $, 15 s = 0,75 $ — beim Testen zählt jeder Lauf.
 *
 * SEIT 11.08.2026 HÄNGT SIE AM THEMA (Owner: „Stelle die maximale Aufnahmezeit für
 * 'Versprechen' auf 25 Sekunden. … Die 25 Sekunden gelten nur für theme === 'versprechen',
 * falls andere Flows weiterhin 15 Sekunden benötigen").
 *
 * WARUM 25 UND NICHT 15: Die Vorlage, die er ablesen soll, sind 56 Wörter — ruhig
 * gesprochen 22 bis 26 Sekunden. Bei 15 s bräche die Aufnahme mitten im Satz ab, und zwar
 * genau vor dem Markensatz am Schluss. Die Aufnahme IST die Tonspur des verkauften Videos:
 * Diese Zahl entscheidet, ob das Versprechen zu Ende gesprochen werden kann.
 *
 * DER GEBURTSTAG BLEIBT BEI 15 — dort gratuliert man mit eigenen Worten, und jede Sekunde
 * kostet: HeyGen nimmt 0,05 $ je Videosekunde (15 s = 0,75 $, 25 s = 1,25 $).
 *
 * Die Datenmenge trägt auch 25 s: Die Tonspur geht als WAV mono/22.050 Hz raus (~44 KB/s),
 * also ~1,1 MB — weit unter Vercels ~4,5-MB-Deckel für einen Aufruf. Nur der Video-Rückfall
 * (wenn das Herauslösen der Tonspur scheitert) wird eng; er ist seit dem 07.08. der
 * Ausnahmefall, nicht der Weg.
 */
const AUFNAHME_SEK_STANDARD = 15;
const AUFNAHME_SEK_VERSPRECHEN = 25;
const aufnahmeSekFuer = (variant: string) =>
  variant === "versprechen" ? AUFNAHME_SEK_VERSPRECHEN : AUFNAHME_SEK_STANDARD;

/**
 * DIE PROGRAMM-FEATURE-KARTE DES VERSPRECHENS (Owner-Zusatzauftrag 12.08.2026, wörtlich:
 * „eigentlich zeigen wir da auch das programm wenn wir eins haben neben der card, oder chat
 * oder die Features wie bei Hochzeit mit"). Video Card + Feature Card ist die Hausregel
 * (Memory `produktaufbau-video-card-feature-card`) — im Vollbild der Vorlage (`VorlagenUeber-
 * lagerung`) fehlte die Feature-Karte bis heute komplett.
 *
 * KEIN NEUER TEXT: Dieselbe 01–06-Liste, die schon auf der Landingpage steht
 * (`T.wasBekommstTitel`/`wasBekommstTitelListe`/`wasBekommstTextListe`, alle sieben Sprachen
 * schon da) — nur im Karten-Design statt im Kachel-Raster, und KOMPAKT: kein Kaufknopf, denn
 * der steht schon unter der Vorlage selbst.
 *
 * DASSELBE MUSTER WIE DER HOCHZEITS-GRUPPENCHAT (`components/GruppenChat.tsx`): `lb-karte` +
 * `CornerOrnaments` + `lb-karte-rahmen` sind die drei Bausteine jeder Creme-Karte im Haus —
 * hell/dunkel stimmen automatisch, weil die Farben aus den `lb-karte-*`-Klassen kommen, nie
 * aus einer hier getippten Farbe (Memory `lb-karte-important-frisst-inline-farben`).
 */
function VersprechenProgrammKarte({ T }: { T: KissText }) {
  if (!T.wasBekommstTitel || !T.wasBekommstTitelListe?.length) return null;
  return (
    <div className="lb-karte relative overflow-hidden rounded-[20px] px-4 pb-4 pt-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
      <CornerOrnaments />
      <div className="lb-karte-rahmen pointer-events-none absolute inset-[8px] rounded-[14px]" />
      <div className="relative">
        <p className="lb-karte-gold text-center text-[10px] font-black uppercase tracking-[0.24em]">
          {T.wasBekommstTitel}
        </p>
        <DividerOrnament className="mt-2" />
        <div className="mt-3 grid grid-cols-2 gap-2">
          {T.wasBekommstTitelListe.map((titel, i) => (
            <div key={i} className="lb-karte-news rounded-[12px] px-2.5 py-2">
              <span className="lb-karte-gold text-[10.5px] font-black">{String(i + 1).padStart(2, "0")}</span>
              <p className="mt-0.5 text-[12px] font-black leading-snug">{titel}</p>
              <p className="mt-0.5 text-[10.5px] font-medium leading-snug opacity-70">{T.wasBekommstTextListe?.[i]}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function KissFunnel({ variant = "kiss", code = "", lang = "en", beispielVideo = "", beispielVideos, tunnelSeite = false, urlSchritt, onSchrittChange, onVorlage, urlVorlage = "" }: {
  variant?: FunnelVariant; code?: string; lang?: string; beispielVideo?: string; beispielVideos?: string[];
  /**
   * DER TUNNEL ALS EIGENE SEITE (Owner 12.08.2026, wörtlich: „die muss ich in den ads
   * einbauen" — er braucht eine eigene Adresse für die Anzeigen, kein Fenster mitten auf der
   * Landingpage). `app/themes/versprechen/start/page.tsx` reicht dieses Flag herein: Die
   * Schritte liegen dann als normaler SEITENINHALT da (kein abgedunkelter Hintergrund, kein
   * Schliessen durch Antippen daneben — die Seite verlassen ist das Schliessen), und sind
   * IMMER offen, nicht erst nach einem Kartenklick. Ohne das Flag bleibt jede andere Seite,
   * wie sie war: der Trichter im Dialog über der Beispiel-Karte.
   */
  tunnelSeite?: boolean;
  /**
   * DER SCHRITT KOMMT VON DER URL (Owner 12.08.2026: „der user soll auch vor und zurück in
   * den steps" — gelöst über die Adresszeile, damit die Handy-Zurück-Geste einen Schritt
   * zurückgeht statt die Seite zu verlassen). Nur die Tunnel-Seite reicht das herein; überall
   * sonst bleibt `schritt` reiner interner Zustand wie bisher.
   */
  /**
   * `number` STATT `1 | 2 | 3` (Owner 12.08.2026, „oberstes Gesetz": dieselbe Mechanik für
   * alle Produkte) — `components/TunnelSeite.tsx` kennt kein Produkt und liefert deshalb eine
   * blosse Zahl. Welche Werte WIRKLICH erreichbar sind, entscheidet die aufrufende
   * `*StartClient.tsx` ueber die `schritte`-Liste, die sie `TunnelSeite` mitgibt — nicht
   * dieser Typ.
   */
  urlSchritt?: number;
  /** Meldet jede Änderung an `schritt` nach aussen — die Tunnel-Seite schreibt sie in die URL. */
  onSchrittChange?: (schritt: number) => void;
  /** Dasselbe für die gewählte Vorlage (`?v=…`) — Owner 16.08.2026, siehe `TunnelSeite`. */
  onVorlage?: (vorlage: string) => void;
  /** Die Vorlage AUS der Adresse — sie gewinnt über den eigenen Zustand, siehe unten. */
  urlVorlage?: string;
}) {
  const V = VARIANTS[variant];
  /* Alle Beispiele in einer Liste, ohne Leere und ohne Doppelte. Der erste ist der, den die
     Seite bisher als `beispielVideo` geschickt hat — die Karte startet also mit demselben
     Video wie vorher. */
  const beispiele = Array.from(new Set([...(beispielVideos ?? []), beispielVideo].filter(Boolean)));
  /**
   * DAS POSTER HEISST WIE SEIN VIDEO (Owner 07.08.2026: „jetzt muss ich wissen warum beim
   * ersten video ein poster fehlt").
   *
   * Eine Namensregel statt einer zweiten Liste: `/Kiss/kiss-beispiel.mp4` gehört zu
   * `/Kiss/kiss-beispiel.jpg`. Zwei getrennte Listen laufen beim ersten neuen Video
   * auseinander — bei einer Regel kann das nicht passieren, und wer ein Video dazulegt,
   * legt das Standbild daneben, ohne im Code etwas zu ändern.
   *
   * Die Standbilder sind das erste Bild des eigenen Videos (ffmpeg, fest im Repo). Fehlt
   * eines, ist es kein Fehler: Der Baustein zeigt dann den dunklen Grund wie bisher.
   */
  const posterZu = (url: string) => url.replace(/\.(mp4|mov|webm)(\?.*)?$/i, ".jpg");
  /**
   * WAS VORN STEHT, WIRD NACHGETANZT (Owner 07.08.2026: „es ist eine kard zu viel auf der
   * Pool seite") — die eigene Auswahl-Karte (`TanzAuswahl`) ist von der Tanz-Seite
   * verschwunden; die Referenzen liegen jetzt als Folien IN dieser einen Karte, und als
   * Bewegungsvorlage gilt beim Erzeugen die Folie, die gerade vorn steht. Das ist zugleich
   * die ehrlichste Wahl: Er erzeugt, während er genau dieses Video ansieht.
   */
  const [beispielVorn, setBeispielVorn] = useState(0);
  /**
   * KEIN VIDEO MEHR INLINE IM KARUSSELL — EIN TIPP OEFFNET DIE SEITE (Owner 18.08.2026: „Ein
   * Klick Karte öffnet Seite" · „und klick auf vergrössern öffnet auch seite. klick auf
   * play." · dazu der Verdacht: „das hat mit der autoanimation zu tun des sliders").
   *
   * DER FUND: `KartenKarussell` schaltet alle sieben Sekunden von selbst weiter
   * (`selbstLaeuft`) — und hört damit erst auf, wenn ein WISCH oder ein Punkt-Tipp erkannt
   * wird. Ein Tipp auf DEN PLAY-KNOPF EINER FOLIE zählt nicht als „er hat übernommen": Die
   * Uhr lief weiter, bis sie die Folie unter dem laufenden Video wegschaltete — ihr eigener
   * Effekt pausiert dann jeden Spieler, der nicht mehr vorn steht (Zeile ~122). Der Kunde sah
   * sein gerade gestartetes Video plötzlich stehen, ohne etwas getan zu haben.
   *
   * Die Wurzel war also gar nicht der Ladebalken oder das `moov`-Feld — es war eine Uhr, die
   * gegen den Zuschauer weiterlief. Die sauberste Antwort ist keine zweite Bedingung in
   * `KartenKarussell`, sondern gar kein Video mehr IN der Wischbahn: Jede Folie zeigt nur ihr
   * Poster (keine Dekoder, keine Autoplay-Regel, keine Pausier-Falle), und ein Tipp — egal
   * ob auf die Scheibe, das Bild oder wo auch immer auf der Karte — öffnet dieselbe Seite,
   * die seit heute auch die Vorlagen im Tunnel zeigt (`VorlagenUeberlagerung`, Memory
   * [[keine-overlay-dialoge]]). Dort läuft GENAU EIN Video, ungestört von jeder Karussell-Uhr.
   */
  const [beispielOffen, setBeispielOffen] = useState<number | null>(null);
  /**
   * Die Sprache kommt von der Seite (Cookie bzw. Browsersprache, siehe lib/lang-server).
   *
   * DIE SEKUNDENZAHL WIRD HIER EINMAL GEFÜLLT (Owner 09.08.2026, mit Bild des Kaufknopfs:
   * „ich sehe {sek} — das ist nicht gut").
   *
   * Der Platzhalter kam heute in die Sprachtabellen, damit die Zahl nicht siebenmal
   * abgeschrieben werden muss. Gefüllt habe ich ihn zuerst nur an EINER Anzeigestelle —
   * die zweite zeigte ihn roh. Genau dieselbe Falle wie bei den Preisen, und dieselbe
   * Lösung: einmal an der Quelle ersetzen, nicht an jeder Stelle, die ihn anzeigt.
   */
  const T = (() => {
    const roh = kissText(lang, variant);
    return roh.ctaVideo?.includes("{sek}")
      ? { ...roh, ctaVideo: roh.ctaVideo.replace("{sek}", String(aufnahmeSekFuer(variant))) }
      : roh;
  })();
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
  /**
   * EIN PREIS FUER EIN KUSS-VIDEO (Owner 03.08.2026: „das mit der Lingerie ist eh nicht allzu
   * seriös" — „wir machen das raus").
   *
   * Hier standen zwei Preise: {once} fuer eine Szene, {lingerie} fuer eine Dessous-Vorlage.
   * Der zweite Preis war die Wurzel fast aller Umstaendlichkeit im Trichter — er bezahlte
   * einen FASHN-Lauf VOR dem Pixverse-Lauf, und daran hingen der Waesche-Schritt, die zweite
   * Kachelreihe und die getrennte Bild-Kette (OpenAI weist Dessous am Eingang ab, Pixverse
   * nicht). Mit dem Produkt faellt beides weg: eine Erzeugung, ein Preis, ein Schritt weniger.
   */
  /**
   * DER TANZ KOSTET MEHR (Owner 03.08.2026: „eigentlich nicht, es soll 3,99 kosten").
   * Nur diese eine Zeile entscheidet, wie viel Guthaben der Trichter verlangt, bevor er den
   * Auflade-Waehler oeffnet. Was die KASSE abbucht, entscheidet sie selbst am gespeicherten
   * Auftrag — ein Browser darf sich seinen Preis nicht aussuchen.
   */
  /* Der Geburtstag hat seit dem 07.08.2026 seinen eigenen Startpreis (Owner: „wir nehemen für
     dieses Video 4,99 als start") — Begründung und Rechnung stehen bei GEBURTSTAG_CENTS in
     lib/pricing.ts. */
  /* EINE ZEILE FÜR BEIDE SEITEN (07.08.2026): Hier stand dieselbe Ternär-Kette noch einmal,
     während die Kasse den Geburtstag gar nicht kannte — 4,99 € verlangt, 15 € abgebucht.
     `geschenkPreisCents` liegt jetzt in lib/pricing und wird von der Kasse mitgelesen. */
  const videoPreisCents = geschenkPreisCents(variant);

  /**
   * BEIM GEBURTSTAG KLINGT DAS VIDEO SELBST (Owner 03.08.2026: „nein, es muss die originale
   * Stimme des Videos sein").
   *
   * Das ganze Produkt heisst „She sings Happy Birthday" — die Stimme IST der Inhalt. Unsere
   * Tonspur darueber waere eine zweite Stimme, die gegen die erste anredet, und der Gruss ginge
   * darin unter. Ueberall sonst ist es umgekehrt: Acht-Sekunden-Videos ohne eigenen Ton
   * bekommen Musik, weil ihre Tonspur bei jeder Schleife von vorn ansetzt.
   */
  /* Die eigene Stimme aus der Aufnahme — bei beiden Aufnahme-Themen (Geburtstag,
     Versprechen). Der Satz gehört ihm, also spricht ihn auch er. Ausgeschrieben statt über
     `selbstVideo`: Das steht erst zwanzig Zeilen weiter unten. */
  const eigenerTon = variant === "birthday" || variant === "versprechen";
  /**
   * DER GEBURTSTAG NIMMT SICH SELBST AUF, STATT EIN FOTO HOCHZULADEN (Owner 07.08.2026:
   * „Das ganze ist zu kompliziert. Wir brauchen nur das. Dein Name, szene auswählen dan
   * button Selbstaufnehmen mit dem script was er sagen soll" · „dann generieren").
   *
   * Aus dem Video kommen Standbild UND Stimme (siehe `aufnahmeStart`) — der Foto-Upload
   * und die Wahl zwischen Frauen- und Männerstimme sind damit überflüssig. Vier Dinge
   * bleiben: Name, Look, Aufnahme, Erzeugen.
   *
   * Der Upload ist nicht gelöscht, nur zur Seite gestellt: Verweigert jemand Kamera oder
   * Mikrofon (`kameraAus`), erscheint er wieder. Ein Trichter mit genau EINEM Weg ist
   * eine Sackgasse, sobald dieser Weg versperrt ist.
   */
  /**
   * WER SICH SELBST AUFNIMMT (Owner 10.08.2026: „Es hat den sleben Tunel und aufbau").
   *
   * Das Versprechen läuft durch dieselbe Kette wie der Geburtstag: Die Aufnahme liefert
   * Standbild UND Stimme, ein Foto-Upload entfällt. Stand hier weiter nur der Geburtstag,
   * bekäme das Versprechen den Kuss-Trichter — Model wählen, Foto hochladen, kein Mikrofon.
   */
  const selbstVideo = variant === "birthday" || variant === "versprechen";
  /**
   * HAT DIESES PRODUKT EINEN ECHTEN AUSWAHL-SCHRITT? (KONZEPT-TUNNEL.md, Owner 12.08.2026:
   * „Hier haben wir die auswahl des Goals; in Geburtstag hätten wir die template auswahl in
   * stept zwei. Dann step 3 wäre genau das was wir jetzt haben: Bild hochladen." —
   * Geburtstag: Vorlagen-Wahl. Kuss und Versprechen haben nichts zu waehlen, bevor die
   * Kacheln kommen (beim Kuss ist die Szene laengst zufaellig, Owner 03.08.2026: „wir machen
   * die ganze Videoauswahl raus"), und ueberspringen Schritt 2 komplett.
   *
   * NUR AUF DER TUNNEL-SEITE: Der alte Dialog kennt diese Unterscheidung nicht, dort bleibt
   * die Schritt-Zaehlung, wie sie war.
   *
   * KUSS UND VERSPRECHEN SEIT 12.08.2026 DAZU (Owner, wörtlich: „warum ist der Kuss funel
   * anders? … Template auswahl dann bilder hochladen" · „mach auch Verprehcne genauso. Aus
   * 3 schritten") — damit haben ALLE SIEBEN Tunnel dieselben drei Schritte, keine Ausnahme
   * mehr. Der alte Zufalls-Charakter des Kusses bleibt: Wer nichts tippt, bekommt weiterhin
   * `zufallsSzene()` (siehe `kissSzeneId`, unten und beim Video-Auftrag).
   */
  const hatAuswahl = tunnelSeite && (variant === "birthday" || variant === "poledance" || variant === "kiss" || variant === "versprechen");
  /**
   * DIE GEWAEHLTE KUSS-SZENE (Owner 12.08.2026) — leer heisst „nichts gewaehlt", dann bleibt
   * es beim Zufall (`kussSzeneVideoPrompt(zufallsSzene(...))`, wie vor diesem Auftrag). Kein
   * Vorgabewert wie bei den Looks: Die Kacheln zeigen ohnehin `wert=""` als „keine gewaehlt",
   * konsistent mit der bisherigen „Überraschung"-Erzaehlung dieses einen Themas.
   */
  const [kissSzeneId, setKissSzeneId] = useState("");
  /**
   * DIE ADRESSE STICHT DEN ZUSTAND (Owner 18.08.2026, an einem echten Lauf: erst Bandit Kiss
   * gewaehlt, dann zurueck und eine andere — geliefert wurde die erste).
   *
   * `useState("")` ueberlebt keinen Schrittwechsel; danach steht die Wahl wieder auf leer, und
   * leer bedeutet an drei Stellen „nimm KUSS_SZENEN[0]" (Vorschau-Kachel, Bild-Prompt,
   * Bewegungs-Prompt). Der Kunde sieht also die erste Vorlage, obwohl er die dritte gewaehlt
   * hat — und bezahlt dafuer. Die Adresse (`?v=`) traegt die Wahl ohnehin; hier wird sie
   * zurueckgelesen, sobald sie sich aendert.
   */
  useEffect(() => {
    const v = String(urlVorlage ?? "").trim();
    if (v && v !== kissSzeneId && KUSS_SZENEN.some(x => x.id === v)) setKissSzeneId(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlVorlage]);
  const tunnelPunkte = hatAuswahl ? [1, 2, 3] : [1, 3];
  /** Wohin Schritt 1 (`TunnelStart`) weiterschickt — 2 nur, wenn es dort etwas zu waehlen
   *  gibt, sonst direkt zu den Kacheln (Schritt 3). */
  const nachTunnelStart = hatAuswahl ? 2 : 3;
  /** Wohin der Zurueck-Pfeil VON DEN KACHELN (Schritt 3) fuehrt — auf der Tunnel-Seite immer
   *  der Schritt direkt davor (1, oder 2 beim Geburtstag); im alten Dialog unveraendert. */
  const schrittVorKacheln = tunnelSeite ? (hatAuswahl ? 2 : 1) : (V.paarUpload || V.nurSie ? 1 : 2);
  /**
   * DAS FORMAT DER VIDEOKARTE — 3:4 IM HAUS, 9:16 BEIM VERSPRECHEN (Owner 11.08.2026: „so
   * wir haben jetzt hier eine ausnahme. Die Videokarte ist hier 9:16 format").
   *
   * `EinladungAnsicht` rahmt jedes Video in `aspect-[3/4]`, und das war für alles richtig,
   * was aus einem 2:3-Bild entsteht. Die Videos dieses Themas sind GEMESSEN 1080 × 1920 —
   * echtes Hochformat. In einem 3:4-Rahmen schneidet der Rahmen ihnen oben und unten weg,
   * was den Look ausmacht: Himmel, Villa, Wagen.
   *
   * Es ist bewusst eine AUSNAHME und keine neue Hausregel: Wer hier einen zweiten Wert
   * einträgt, muss das Video daneben gemessen haben, nicht geschätzt (`ffprobe`).
   */
  const karteVerhaeltnis = variant === "versprechen" ? "aspect-[9/16]" : undefined;
  /** Die Worte der Aufnahme-Zeile — auch der Kaufknopf braucht sie, nicht nur der Kasten. */
  const SW = STIMME_WORT[String(lang ?? "en").slice(0, 2)] ?? STIMME_WORT.en;
  /** Der Zwei-Stufen-Waehler der Aufladung (Owner 03.08.2026: „biete beide an"). */
  const [aufladeWahl, setAufladeWahl] = useState(false);
  /**
   * AN WEN GEHT DER KUSS (Owner 03.08.2026: „schreib auch den Namen an wem du es senden
   * willst … dann erscheint in den Texten Anna, I love you").
   *
   * Freiwillig. Er ueberlebt ein Neuladen wie die Fotos auch — wer von der Kasse zurueckkommt,
   * soll seinen Gruss nicht neu beschriften muessen.
   */
  const [empfaenger, setEmpfaenger] = useState("");
  /**
   * WESSEN STIMME SPRICHT (Owner 07.08.2026, nach dem Peter-Test: „Peter hat eine
   * Frauenstimme. Das war eben das problem, dass wir sagten") — die Geburtstags-Kette
   * spricht den Gruss WÖRTLICH, also muss die Stimme zur hochgeladenen Person passen.
   * Zwei Chips statt einer Frage zum Tippen (Memory `chat-no-personal-questions`);
   * Vorgabe Frau. Die DAUERLÖSUNG bleibt die eigene Stimme aus dem Selfie-Video
   * (Memory `geschenk-kette-openai-heygen`) — bis dahin trägt diese Wahl.
   */
  /* Seit dem 07.08. waehlt niemand mehr: Der Geburtstag spricht immer mit der eigenen
     Aufnahme. Der Wert bleibt als Rueckfall im Auftrag, falls eine Aufnahme fehlt. */
  const stimme: "frau" | "mann" = "frau";
  /**
   * WELCHER LOOK (Owner 07.08.2026: „Die Leute werden sich den look aussehen wollen. Die
   * müssen absolut cool werden. Es gibt jetzt nur eins die Frau mit der Torte").
   *
   * Die Wahl steht VOR der Kasse — dieselbe Regel wie beim Kuss, wo Szene und Garderobe
   * am 03.08. vor die Kasse gerückt sind („Ich will keine Wäsche ein zweites Mal
   * auswählen"). Wer nach dem Bezahlen noch aussuchen muss, hat das Gefühl, die Ware
   * nicht gesehen zu haben.
   *
   * Vorgabe ist der erste — der abgenommene Black Tie, aus dem das Beispielvideo der
   * Landingpage stammt. Wer nichts antippt, bekommt genau das, was er auf der Karte
   * gesehen hat.
   */
  /* Jedes Aufnahme-Thema hat seine eigenen Looks — Torte und Kerzen beim Geburtstag, Villa
     und Wagen beim Versprechen. Eine Liste je Thema, eine Zeile hier. */
  const LOOKS = variant === "versprechen" ? VERSPRECHEN_LOOKS : GEBURTSTAG_LOOKS;
  const [look, setLook] = useState(LOOKS[0].id);
  /**
   * WELCHES VIDEO ZEIGT DIE ZIEL-KACHEL? (Owner 12.08.2026, wörtlich: „wenn user ein Video
   * generiert dann muss er die Vorlage genau als Video sehen … Das gilt für den ganzen
   * Tunel.") Versprechen hat genau EIN Video (`beispiele[0]`, dasselbe Beispiel wie auf der
   * Landingpage); der Geburtstag eins JE LOOK — nur drei der vier Looks haben eins, die
   * vierte („Gold & Confetti") bleibt bis dahin ein Bild (siehe Bericht an den Owner).
   */
  const GEBURTSTAG_LOOK_VIDEO: Record<string, string> = {
    traum: GEBURTSTAG_VIDEO_TRAUM,
    blacktie: GEBURTSTAG_VIDEO,
    fliege: GEBURTSTAG_VIDEO_MANN,
  };
  const zielVideo = variant === "versprechen" ? (beispiele[0] || "")
    : variant === "birthday" ? (GEBURTSTAG_LOOK_VIDEO[look] || "")
    : "";
  /**
   * DIE LOOK-WAHL SELBST ZEIGT JETZT DAS VIDEO (Owner 12.08.2026: „Man muss die Videos sehen
   * im ganzen Tunel. Sonst sind es bilder" → „ok, bauen"). `BildWahl` kennt seit diesem
   * Auftrag ein optionales `video`/`poster` je Kachel (components/CI.tsx) — hier wird es NUR
   * an dieser einen Stelle in die bestehenden Listen gemischt, die Listen selbst
   * (`GEBURTSTAG_LOOKS`/`POLEDANCE_SETS`) bleiben unveraendert, weil sie auch anderswo ohne
   * Video gebraucht werden (z. B. `garderobe` oben). „Gold & Confetti" bekommt bewusst kein
   * `video`, dafuer gibt es keins — die Kachel bleibt dort ein Bild.
   */
  /* RÜCKFALL AUFS PRODUKT-BEISPIEL (Owner 12.08.2026: „Ich habe dir gesagt dass wir die
     Videos anglicken und vergrössern also die Cards zeigen. Hast du das nicht umgestzt in
     dem ganzen Funel?") — JEDE Vorlagen-Kachel öffnet die Karte; hat ein Look kein eigenes
     Video, zeigt sie das Beispiel-Video des Produkts (existiert immer, nichts wird erzeugt). */
  /**
   * `konfetti` BEHAELT DEN RUECKFALL AUF `beispiele[0]` — SO GEWOLLT (Owner 15.08.2026, auf
   * die Frage „Look entfernen oder Rueckfall behalten?": „b").
   *
   * Der Hinweis stand: Von den vier Looks kennt `GEBURTSTAG_LOOK_VIDEO` nur drei; `konfetti`
   * zeigt damit ein Video, das aus einem anderen Prompt stammt. Am selben Tag wurde genau
   * dieses Muster an vier anderen Stellen ausgebaut (Kuss-Szenen, Tanz-Sets, Urlaubs-Szenen,
   * Tanz-Referenz). HIER bleibt es auf Owner-Entscheid: lieber Bewegung auf der Kachel als
   * ein Standbild („Man muss die Videos sehen im ganzen Tunel. Sonst sind es bilder",
   * 12.08.2026). Wer das spaeter aufloesen will, legt ein Video FUER konfetti an und traegt
   * es in `GEBURTSTAG_LOOK_VIDEO` ein — dann greift der Rueckfall von selbst nicht mehr.
   */
  const GEBURTSTAG_LOOKS_MIT_VIDEO = GEBURTSTAG_LOOKS.map(l => ({ ...l, video: GEBURTSTAG_LOOK_VIDEO[l.id] ?? (beispiele[0] || undefined) }));
  /**
   * ALLE DREI POLEDANCE-SETS TEILEN SICH EIN BEISPIELVIDEO (`beispiele[0]`, von der
   * aufrufenden Seite als `POLEDANCE_VIDEO` hereingereicht) — es gibt (noch) kein Video je
   * Set, siehe Bericht an den Owner. Lieber dasselbe Video an allen drei Kacheln zeigen als
   * gar keins: Bewegung verkauft, auch wenn sie nicht exakt zum gewaehlten Set passt.
   */
  /**
   * EINE SET-KACHEL ZEIGT DAS SET — SONST NICHTS (Owner 15.08.2026, mit zwei Bildern: „es
   * wird ein video angezeigt in der Referenz. Der Funel ist kaputt").
   *
   * Hier hing das Beispielvideo an der Kachel „rot". In der Reihe stand damit neben zwei
   * freigestellten Waeschesets eine FRAU AN DER STANGE. Der Kunde waehlt aber ein
   * Kleidungsstueck, kein Vorbild: Was er antippt, geht als `@image2` an Pixverse — und das
   * ist das freigestellte Set, nicht die Person. Die Kachel versprach also etwas anderes,
   * als die Auswahl bewirkt.
   *
   * (Am 14.08. war das schon einmal enger gefasst worden — von „an allen drei Kacheln" auf
   * „nur an der roten". Der Schritt war richtig, ging aber nicht weit genug: Auch EINE
   * Person zwischen zwei Kleidungsstuecken ist das Falsche angekuendigt.)
   *
   * Das grosse Beispielvideo oben in der Karte bleibt — dort gehoert es hin.
   */
  const POLEDANCE_SETS_MIT_VIDEO = POLEDANCE_SETS;
  /**
   * SEINE ZIELE (Owner 11.08.2026: „Baue den zusätzlichen Ziele-Schritt nur für
   * versprechen") — höchstens drei Kennungen, dazu ein freier Satz, wenn er „etwas anderes"
   * antippt. Sie reisen mit dem Auftrag und sind später der Abschnitt „YOUR DIRECTION" auf
   * seiner persönlichen Programmseite. Nur dort dürfen sie herkommen: erfundene Ziele wären
   * das Gegenteil eines persönlichen Programms.
   */
  const [ziele, setZiele] = useState<ZielId[]>([]);
  const [zieleFrei, setZieleFrei] = useState("");
  const ZT = zielTexte(lang);
  /** Nur das Versprechen fragt danach — jedes andere Geschenk geht an einen ANDEREN Menschen. */
  const zieleFragen = variant === "versprechen";
  /** Wahl und freier Satz zusammen weglegen — eine Stelle, damit sie nie auseinanderlaufen. */
  const zieleMerken = (ids: ZielId[], frei: string) => {
    try { localStorage.setItem(zieleKey(variant), JSON.stringify({ ids, frei })); } catch { /**/ }
  };
  /**
   * ANTIPPEN NIMMT WEG ODER LEGT DAZU — und bei drei ist Schluss.
   *
   * Der vierte Chip ist dann NICHT tot, sondern abgeblendet (`disabled`): Ein Tipp, der
   * nichts tut und nichts sagt, liest sich als Fehler. Wer den vierten will, nimmt einen
   * anderen heraus — die Reihe verschiebt sich dabei nicht, es wechselt nur die Farbe
   * (Hausregel „Auswahl verschiebt NIE").
   */
  const zielTippen = (id: ZielId) => {
    /* Aus dem ZULETZT gültigen Stand rechnen, nicht aus dem der letzten Zeichnung: Zwei
       schnelle Tipps hintereinander lasen sonst beide denselben alten Stand, und der erste
       ging verloren (beim Prüfen mit drei Tipps in einem Atemzug gemessen). */
    setZiele(alt => alt.includes(id)
      ? alt.filter(x => x !== id)
      : alt.length >= MAX_ZIELE ? alt : [...alt, id]);
  };
  /* Weggelegt wird, was WIRKLICH steht — deshalb hier und nicht im Tipp. Der Riegel
     verhindert, dass der erste Durchlauf die eben zurückgeholte Wahl mit einer leeren
     überschreibt. */
  const zieleBereit = useRef(false);
  useEffect(() => {
    if (!zieleFragen) return;
    if (!zieleBereit.current) { zieleBereit.current = true; return; }
    zieleMerken(ziele, zieleFrei);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ziele, zieleFrei, zieleFragen]);
  /**
   * DIE EINLADUNG ZUR ANMELDUNG (Owner 09.08.2026, direkt nach dem Geräte-Riegel).
   *
   * Sie erscheint EINMAL vor dem Bauen — nicht bei jedem Klick, und nie bei jemandem, der
   * schon angemeldet ist. `lb_anmelde_gesehen` merkt sich, dass er sie kannte: Wer „Später"
   * gewählt hat, soll nicht bei jedem Video neu gefragt werden. Das ist kein Verzicht auf
   * den Schutz — der Geräte-Riegel greift ohnehin —, sondern die Grenze zwischen einladen
   * und nerven.
   */
  const [anmeldeOffen, setAnmeldeOffen] = useState(false);
  /** Der Dialog spricht anders, wenn wir WISSEN, dass sein Geld dort liegt. */
  const [guthabenGesperrt, setGuthabenGesperrt] = useState(false);
  const nachAnmeldeWeiter = useRef(false);
  /* Die Anmelde-Texte leben in derselben Tabelle wie Konto und Galerie (sieben Sprachen). */
  const KT = kontoText(lang);
  const [angemeldet, setAngemeldet] = useState(true);   // bis zum ersten Blick: nicht fragen
  useEffect(() => { setAngemeldet(!!getStoredAuthSession()?.access_token); }, []);
  const anmeldeSchonGesehen = () => {
    try { return !!localStorage.getItem("lb_anmelde_gesehen"); } catch { return true; }
  };
  const anmeldeMerken = () => {
    try { localStorage.setItem("lb_anmelde_gesehen", "1"); } catch { /* privater Modus */ }
  };
  /** Zur Anmeldung — und danach zurück auf genau diese Seite, damit sein Werk wartet. */
  /**
   * DIE AUFNAHME ÜBERLEBT DIE ANMELDUNG (Owner 09.08.2026: „nach der Anmeldung mit Google
   * springe ich leider zurück auf die Topic-Seite" · „ich muss auf Schritt zwei bleiben").
   *
   * Der Rückweg selbst stimmte — er landete auf `/themes/birthday`. Nur nützt ihm das
   * nichts: Der Anmeldeweg führt über Google und lädt die Seite neu, und dabei sind
   * Standbild und Tonspur weg. Er müsste sich noch einmal filmen, nur weil er sein eigenes
   * Guthaben benutzen wollte — der sicherste Weg, ihn zu verlieren.
   *
   * Also wird die Aufnahme vorher weggelegt und danach zurückgeholt. Zwei Stunden reichen
   * dafür; wer später wiederkommt, fängt bewusst neu an, statt ein vergessenes Gesicht
   * vorgesetzt zu bekommen. Schlägt das Wegpacken fehl (voller Speicher), geht die
   * Anmeldung trotzdem weiter — dann fehlt nur der Komfort, nicht der Weg.
   */
  const AUFN_KEY = `lb_kiss_aufn_${variant}`;
  const zurAnmeldung = () => {
    anmeldeMerken();
    try { localStorage.setItem("lb_kiss_mail", mail.trim().toLowerCase()); } catch { /**/ }
    try {
      if (customModel) {
        localStorage.setItem(AUFN_KEY, JSON.stringify({
          bild: customModel, ton: tonspur || aufnahme || "", look, empfaenger, at: Date.now(),
        }));
      }
    } catch { /* Speicher voll — dann eben ohne */ }
    const zurueck = `${window.location.pathname}${window.location.search}`;
    window.location.href = `/login?returnTo=${encodeURIComponent(zurueck)}`;
  };
  /**
   * DIE EIGENE STIMME (Owner 07.08.2026: „ok, dann machen wir das"): Ein Mikro-Knopf
   * nimmt den vorgelesenen Satz auf (max. 15 s), man hört ihn vor, und beim Erzeugen
   * geht die Aufnahme statt der Computerstimme mit. iPhone liefert audio/mp4, Android
   * audio/webm — beides wird als Daten-URL verschickt, der Server legt es ab und HeyGen
   * synchronisiert die Lippen darauf.
   */
  const [aufnahme, setAufnahme] = useState("");       // die Aufnahme als Daten-URL
  /**
   * DIE TONSPUR, GETRENNT VOM VIDEO (07.08.2026 abends). Zwei bezahlte Läufe starben bei
   * HeyGen mit VOICE_PROVIDER_ERROR — GEMESSEN: Skript+Stimme lief, eine saubere m4a über
   * `audio_url` lief, nur unsere Browser-VIDEODATEI nicht. Der „Videodatei als audio_url"-
   * Trick aus der Übergabe galt für saubere Dateien, nicht für MediaRecorder-Ausstoß.
   * Deshalb dekodiert der Browser seine EIGENE Aufnahme (das kann er immer) und schickt
   * die Tonspur als WAV mit; das Video bleibt der Rückfall, falls das Dekodieren scheitert.
   */
  const [tonspur, setTonspur] = useState("");
  /**
   * DAS POSTER DES ERGEBNIS-VIDEOS (Owner 07.08.2026 abends: „tolles poster (ironisch)
   * ich sehe nichts"). Beim Geburtstag liefert die Route das Avatar-Bild als `posterUrl`
   * mit — es ist das erste Vollbild des Videos. Ohne Poster zeigt die Karte bis zum
   * ersten Tipp eine leere Fläche (Hausregel video-playback-behavior: nie schwarz).
   */
  const [videoPoster, setVideoPoster] = useState("");
  const [nimmtAuf, setNimmtAuf] = useState(false);
  /** Kamera oder Mikrofon verweigert — dann erscheint der Foto-Upload als Ausweichweg. */
  const [kameraAus, setKameraAus] = useState(false);
  /**
   * DIE AUFNAHME ZUM ANSCHAUEN — eine `blob:`-Adresse, NICHT die Daten-URL.
   *
   * Owner 07.08.2026, am Handy: „ich kann das video nicht abspielen." Safari spielt ein
   * Video aus einer `data:`-Adresse nicht ab: Es verlangt Byte-Bereiche, die eine
   * Daten-URL nicht liefern kann. Das Standbild als Poster erschien deshalb, der Ton
   * blieb aus, und ein Tipp tat nichts.
   *
   * Also zwei Adressen fuer dieselben Daten: die Daten-URL reist zum Server (`aufnahme`),
   * die `blob:`-Adresse bleibt im Browser und wird abgespielt. Sie wird beim naechsten
   * Versuch freigegeben — sonst haelt jede verworfene Aufnahme ihren Speicher.
   */
  const [aufnahmeUrl, setAufnahmeUrl] = useState("");
  /** Die Absage an der Aufnahme — leer, schwarz oder zu kurz. */
  const [aufnahmeFehler, setAufnahmeFehler] = useState("");
  /** Sekunden bis zum Deckel — sonst weiss niemand, dass gerade aufgenommen wird. */
  const [restSek, setRestSek] = useState(0);
  /**
   * DER VORLAUF VOR DER AUFNAHME (Owner 07.08.2026: „das Video startet sofort wenn ich auf
   * filmeaza-te klicke und ich habe keine zeit mich zu positionieren").
   *
   * Vorher lief `rec.start()` im selben Atemzug wie der Klick — die ersten Sekunden jeder
   * Aufnahme zeigten das Hinhalten der Kamera, und genau aus diesen Sekunden zieht die
   * Kette ihr Standbild (→ Avatar). Jetzt: Kamera an, man sieht sich im Fenster mit dem
   * Kopf-Umriss, 3-2-1, DANN erst nimmt der Recorder auf. 0 = kein Vorlauf.
   */
  /**
   * DER MENSCH DRUECKT AB (Owner 08.08.2026: „dann darf die aufnahme nur mit button
   * starten. Ich muss erst mal meinen Kopf platieren und mich vorbereiten dann starte ich
   * selbst"). `nimmtAuf` heisst ab jetzt nur „Kamera an, Fenster offen"; `laeuft` heisst
   * „der Recorder schneidet mit". Der 3-2-1-Vorlauf ist damit hinfaellig — er war der
   * Ersatz fuer genau diese Wahl.
   */
  const [laeuft, setLaeuft] = useState(false);
  const aufnehmerRef = useRef<MediaRecorder | null>(null);
  const stueckeRef = useRef<Blob[]>([]);
  /** Das Bild, in dem man sich beim Sprechen sieht. */
  const vorschauRef = useRef<HTMLVideoElement | null>(null);
  /** Der laufende Kamerastrom — gehalten, damit ein Effekt ihn anhaengen kann. */
  const stromRef = useRef<MediaStream | null>(null);
  /**
   * DAS ERSTE BILD DER AUFNAHME — daraus wird das Avatar.
   *
   * Ein Video liefert beides, was die Kette braucht: ein Gesicht und eine Stimme. Das
   * Standbild ziehen wir im Browser heraus, damit nichts Zusätzliches hochgeladen werden
   * muss. NICHT das allererste Bild: In der ersten halben Sekunde regelt die Kamera noch
   * Helligkeit und Schärfe, und ein verwaschenes Bild wäre die Vorlage für alles Weitere.
   */
  /**
   * ABSPIELEN STATT SPULEN (Owner 08.08.2026, iPhone: „Es wurde nichts aufgenommen — die
   * Kamera hat kein Bild geliefert", obwohl die Aufnahme lief; die neue Absage-Telemetrie
   * und sein Screenshot zeigen auf `aufnahme_leer`).
   *
   * iOS-Safari dekodiert ein frisch aufgenommenes Video beim blossen SPULEN oft nicht —
   * `onseeked` feuert, aber `drawImage` malt eine schwarze Fläche. Genau die hält die
   * Schwarz-Wache für „kein Bild" und sagt zu Unrecht ab. Erst das ABSPIELEN zwingt iOS
   * zum Dekodieren. Deshalb: Wo `requestVideoFrameCallback` existiert (Safari 15.4+,
   * Chrome), läuft das Video stumm an und das Bild wird aus einem ECHTEN gelieferten
   * Frame nach ~0,5 s Medienzeit gemalt — der Rueckruf feuert nur fuer wirklich
   * dekodierte Bilder, schwarz-durch-Spulen ist damit ausgeschlossen. Ohne rVFC bleibt
   * der alte Spul-Weg (alte Browser, dort lief er ja).
   */
  const standbildZiehen = (blobUrl: string): Promise<{ bild: string; brauchbar: boolean; dauer: number }> =>
    new Promise(fertig => {
      const leer = { bild: "", brauchbar: false, dauer: 0 };
      const v = document.createElement("video");
      v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = blobUrl;
      const abbruch = setTimeout(() => fertig(leer), 6000);
      const malen = () => {
        try {
          const c = document.createElement("canvas");
          c.width = v.videoWidth; c.height = v.videoHeight;
          const ctx = c.getContext("2d");
          if (!ctx || !c.width) { clearTimeout(abbruch); return fertig(leer); }
          ctx.drawImage(v, 0, 0, c.width, c.height);
          /**
           * IST DA UEBERHAUPT EIN BILD? (Owner 07.08.2026: „ich habe nichts aufgenommen" —
           * und der Trichter liess trotzdem „Weiter" zu.)
           *
           * Eine abgedeckte oder abgeschaltete Kamera liefert kein Nichts, sondern eine
           * gleichmaessig schwarze Flaeche. Die ist technisch ein gueltiges Bild, und ohne
           * diese Pruefung wanderte sie als Avatar in einen Auftrag fuer 4,99 €.
           *
           * Der Test ist Mittelwert UND Streuung: Ein dunkles Zimmer ist dunkel, hat aber
           * Struktur; ein schwarzes Bild hat keine. Nur beides zusammen trennt „zu dunkel
           * fotografiert" von „gar kein Bild". Stichprobe statt jedem Pixel — es geht um
           * eine Groessenordnung, nicht um Genauigkeit.
           */
          const daten = ctx.getImageData(0, 0, c.width, c.height).data;
          let summe = 0, quadrate = 0, n = 0;
          for (let i = 0; i < daten.length; i += 4 * 97) {
            const h = (daten[i] + daten[i + 1] + daten[i + 2]) / 3;
            summe += h; quadrate += h * h; n++;
          }
          const mittel = n ? summe / n : 0;
          const streuung = Math.sqrt(Math.max(0, (n ? quadrate / n : 0) - mittel * mittel));
          clearTimeout(abbruch);
          fertig({
            bild: c.toDataURL("image/jpeg", 0.9),
            brauchbar: mittel > 12 && streuung > 8,
            /* iOS meldet fuer frische MediaRecorder-Dateien gern Infinity — das ist keine
               Dauer, sondern „weiss nicht": dann lieber 0 (die Kurz-Wache laesst 0 durch). */
            dauer: Number.isFinite(v.duration) ? v.duration : 0,
          });
        } catch { clearTimeout(abbruch); fertig(leer); }
      };
      v.onerror = () => { clearTimeout(abbruch); fertig(leer); };
      type RVFC = (cb: (now: number, meta: { mediaTime: number }) => void) => void;
      const rvfc = (v as unknown as { requestVideoFrameCallback?: RVFC }).requestVideoFrameCallback?.bind(v) as RVFC | undefined;
      if (rvfc) {
        /* iOS-Weg: stumm anspielen und ein WIRKLICH dekodiertes Frame nehmen — nicht das
           allererste (Kamera regelt noch), sondern eines nach ~0,5 s Medienzeit. Jede
           Aufnahme ist mindestens 1,5 s lang, sonst sagt die Kurz-Wache ohnehin ab. */
        const tick = (_: number, meta: { mediaTime: number }) => {
          if (meta.mediaTime >= 0.5) { try { v.pause(); } catch { /**/ } malen(); }
          else rvfc(tick);
        };
        rvfc(tick);
        v.onloadedmetadata = () => {
          void v.play().catch(() => {
            /* Abspielen verweigert → der alte Spul-Weg als letzter Versuch. */
            v.onseeked = malen;
            v.currentTime = Math.min(1.2, (v.duration || 2) / 2);
          });
        };
      } else {
        v.onloadedmetadata = () => { v.currentTime = Math.min(1.2, (v.duration || 2) / 2); };
        v.onseeked = malen;
      }
    });

  /**
   * DIE TONSPUR AUS DER EIGENEN AUFNAHME (07.08.2026 abends).
   *
   * GEMESSEN: HeyGen stirbt an unserer Browser-Videodatei als `audio_url`
   * (VOICE_PROVIDER_ERROR, zweimal bezahlt und nichts geliefert) — eine saubere
   * Audiodatei über denselben Weg läuft. Der Browser kann seine EIGENE Aufnahme immer
   * dekodieren (WebAudio, gleicher Codec wie beim Aufnehmen); also wird die Tonspur hier
   * herausgelöst und als WAV verschickt — das Format aus dem bestandenen Test.
   *
   * Mono, 22.050 Hz, 16 Bit: für Sprache verlustfrei genug, und 12 Sekunden sind ~530 KB
   * — passt zusammen mit dem Video-Rückfall unter Vercels ~4,5-MB-Deckel. Scheitert das
   * Dekodieren, kommt "" zurück und der Start schickt das Video wie bisher.
   */
  const alsTonspur = async (blob: Blob): Promise<string> => {
    try {
      const roh = await blob.arrayBuffer();
      const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      const ac = new AC();
      const abuf = await ac.decodeAudioData(roh.slice(0));
      try { void ac.close(); } catch { /**/ }
      const rate = 22050;
      const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(abuf.duration * rate)), rate);
      const quelle = off.createBufferSource();
      quelle.buffer = abuf; quelle.connect(off.destination); quelle.start();
      const aus = await off.startRendering();
      const pcm = aus.getChannelData(0);
      const puffer = new ArrayBuffer(44 + pcm.length * 2);
      const dv = new DataView(puffer);
      const schreib = (o: number, s: string) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
      schreib(0, "RIFF"); dv.setUint32(4, 36 + pcm.length * 2, true); schreib(8, "WAVE");
      schreib(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
      dv.setUint32(24, rate, true); dv.setUint32(28, rate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
      schreib(36, "data"); dv.setUint32(40, pcm.length * 2, true);
      for (let i = 0; i < pcm.length; i++) dv.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 0x7fff, true);
      const wav = new Blob([puffer], { type: "audio/wav" });
      return await new Promise<string>(fertig => {
        const leser = new FileReader();
        leser.onloadend = () => fertig(String(leser.result || ""));
        leser.readAsDataURL(wav);
      });
    } catch { return ""; }
  };

  /**
   * DER AVATAR WANDERT INS PROFIL (Owner 10.08.2026: „Das Avatar muss im Profile gespeichert
   * werden. Der User meldet sich doch an. Basta").
   *
   * Und zwar HIER, im Augenblick der Aufnahme — nicht als Nebenwirkung eines Auftrags. Bisher
   * entstand er nur beim ANLEGEN eines Auftrags in `/api/kiss-log`; wer sich in einen
   * bestehenden Auftrag neu aufnahm, bekam keinen neuen. Genau deshalb stand in der Galerie
   * ein Avatar von gestern oder gar keiner.
   *
   * Die Anmeldung ist der Ausweis: Liegt ein Zugangs-Token vor, geht es damit — dann zählt
   * weder Gerät noch getippte Adresse. Ohne Anmeldung reist die Adresse mit, und die Route
   * entscheidet (siehe `app/api/avatar`).
   */
  const avatarSpeichern = async (teile: { bild?: string; ton?: string }) => {
    if (!teile.bild && !teile.ton) return;
    let device = "";
    try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
    const token = (() => { try { return getStoredAuthSession()?.access_token ?? ""; } catch { return ""; } })();
    if (!token && !mail.trim()) return;   // ohne jede Kennung gibt es kein Profil
    try {
      await fetch("/api/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ ...teile, email: mail.trim(), device }),
      });
    } catch { /* der Avatar ist Komfort — ein Fehler hier hält keine Aufnahme auf */ }
  };

  /**
   * EINE AUFNAHME, ZWEI ZWECKE (Owner 07.08.2026: „wenn ich mich selbst aufnehme brauche
   * ich doch kein bild upload" · „Wir brauchen nur das. Dein Name, szene auswählen dan
   * button Selbstaufnehmen mit dem script was er sagen soll").
   *
   * Das Video liefert das Standbild (→ Avatar) UND den Ton (→ die eigene Stimme; HeyGen
   * nimmt eine Videodatei als `audio_url` und zieht die Tonspur selbst heraus, am
   * 07.08. bewiesen). Damit fällt der Foto-Upload weg — ein Schritt weniger.
   *
   * KLEIN AUFNEHMEN IST PFLICHT, kein Feinschliff: Die Datei reist als Daten-URL im
   * JSON-Körper, und Vercel nimmt nur rund 4,5 MB an (Memory
   * `large-uploads-direct-to-supabase`). 480×640 bei 700 kbit/s ergibt in zwölf Sekunden
   * gut ein Megabyte, als Base64 knapp anderthalb — das passt. In 720p wäre derselbe
   * Satz das Vielfache und der Auftrag würde am Tor abgewiesen.
   */
  const aufnahmeStart = async () => {
    try {
      /* Auf einer unverschluesselten Adresse gibt es `mediaDevices` gar nicht — dann
         waere der Zugriff darauf ein nichtssagender TypeError. Lieber vorher fragen. */
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("KeineKameraSchnittstelle");
      const strom = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 640 }, frameRate: { ideal: 24 } },
      });
      const typ = typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.("video/mp4")
        ? "video/mp4"
        : MediaRecorder.isTypeSupported?.("video/webm") ? "video/webm" : "";
      const rec = new MediaRecorder(strom, {
        ...(typ ? { mimeType: typ } : {}),
        videoBitsPerSecond: 700_000,
        audioBitsPerSecond: 64_000,
      });
      stueckeRef.current = [];
      rec.ondataavailable = ev => { if (ev.data.size) stueckeRef.current.push(ev.data); };
      rec.onstop = () => {
        strom.getTracks().forEach(t => t.stop());
        stromRef.current = null;
        if (vorschauRef.current) vorschauRef.current.srcObject = null;
        const blob = new Blob(stueckeRef.current, { type: rec.mimeType || "video/webm" });
        const url = URL.createObjectURL(blob);
        /**
         * ERST PRUEFEN, DANN ANNEHMEN (Owner 07.08.2026: „ich habe nichts aufgenommen").
         *
         * Vorher wurde jedes Ergebnis gesetzt, und damit war „Weiter" frei — auch nach
         * zwoelf Sekunden schwarzem Bild, denn der Deckel stoppt von selbst. Wer nichts
         * aufgenommen hat, muss das SEHEN, nicht erst im bezahlten Video.
         *
         * Drei Gruende zur Absage: kein Bild herausziehbar, ein Bild ohne Inhalt (schwarz),
         * oder zu kurz fuer den Satz. Bei jeder bleibt das Foto leer — und damit bleibt der
         * Kaufknopf zu.
         */
        void standbildZiehen(url).then(({ bild, brauchbar, dauer }) => {
          setNimmtAuf(false);
          /* Bei einer Absage wird die Adresse sofort frei — es gibt nichts anzuschauen. */
          /* Jede rote Absage meldet ihren GRUND ins Insights (Owner 07.08.2026 abends:
             „Es kam eine rote Meldung, ich weiss nicht wieso" — und wir wussten es auch
             nicht: Der Grund stand nur auf seinem Bildschirm). */
          if (!bild || !brauchbar) { URL.revokeObjectURL(url); setAufnahmeFehler(SW.leer); track("aufnahme_leer"); return; }
          if (dauer && dauer < 1.5) { URL.revokeObjectURL(url); setAufnahmeFehler(SW.kurz); track("aufnahme_kurz"); return; }
          setAufnahmeFehler("");
          /* NORMIERTE FAMILIE, `video_recorded` (Owner-Master-Auftrag §32, 13.08.2026): erst
             HIER, nach den beiden roten Absagen oben (leer/zu kurz), gilt die Aufnahme als
             ANGENOMMEN — ein Abbruch darf hier nicht mitzählen, sonst sähe Insights mehr
             Aufnahmen, als je einer benutzen konnte. */
          void logTunnelEvent("video_recorded", variant);
          setAufnahmeUrl(url);   // bleibt bestehen — daraus spielt der Spieler
          setCustomModel(bild); setUseCustom(true);
          /* Sein Gesicht gehört ab jetzt IHM, nicht diesem einen Auftrag — die Tonspur folgt
             unten, sobald sie herausgerechnet ist. */
          void avatarSpeichern({ bild });
          /**
           * NACH DER AUFNAHME STEHT ER IM ZWEITEN SCHRITT (Owner 09.08.2026: „nach der
           * aufnahme soll lieber zu schritt zwei springen").
           *
           * Vorher wurde nur GESCROLLT — und zwar zur Karte, denn der Anker `schrittZweiRef`
           * lebt erst im zweiten Schritt, und dort war er noch gar nicht. Er landete also bei
           * seinem Standbild und musste trotzdem wieder hinauf zu „Weiter". Die Aufnahme IST
           * der erste Schritt; ist sie im Kasten, gibt es auf dieser Seite nichts mehr zu tun.
           *
           * GENAU DAS, WAS „WEITER" TUT (der Knopf unten): zugestimmt wird durch die Handlung
           * — der Satz dazu steht im ersten Schritt, über dem Aufnahme-Knopf —, die Wahl
           * wandert an den Eintrag, und Geburtstag/Tanz überspringen Schritt 2 (dort stand
           * SEIN Foto, und es gibt keines mehr). Die Prüfung des Knopfes („erst aufnehmen")
           * fehlt hier mit Absicht: Sie liest `selPhoto`, und das steht in diesem Durchlauf
           * noch auf dem alten Wert — geprüft ist ohnehin schon, denn ohne brauchbares
           * Standbild kommt der Ablauf hier gar nicht an.
           *
           * `setStufenOffen(true)`, weil das Vollbild der Aufnahme sich schliesst: Der
           * Trichter muss dahinter offen stehen, sonst springt er in ein Fenster, das zu ist.
           *
           * Kurz verzögert, weil der zweite Schritt im selben Atemzug erst entsteht; ohne die
           * Pause zielte der Sprung auf ein Element, das es noch nicht gibt.
           */
          zustimmen(); wahlMerken();
          setSchritt(V.paarUpload || V.nurSie ? 3 : 2);
          setStufenOffen(true);
          setTimeout(() => (schrittZweiRef.current ?? karteRef.current ?? resultRef.current)
            ?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
          const leser = new FileReader();
          leser.onloadend = () => setAufnahme(String(leser.result || ""));
          leser.readAsDataURL(blob);
          /* Die Tonspur gleich mit herausziehen — scheitert das (alter Browser), bleibt
             `tonspur` leer und der Start schickt das Video als Rückfall. */
          void alsTonspur(blob).then(w => { setTonspur(w); if (w) void avatarSpeichern({ ton: w }); });
        });
      };
      aufnehmerRef.current = rec;
      /* Der vorige Versuch wird ungueltig, sobald ein neuer laeuft — sonst stuende ein
         gutes altes Foto neben einer misslungenen neuen Aufnahme, und der Kaufknopf
         waere frei, obwohl gerade nichts entstanden ist. */
      setAufnahmeUrl(a => { if (a) URL.revokeObjectURL(a); return ""; });
      setAufnahme(""); setTonspur(""); setCustomModel(""); setAufnahmeFehler(""); setKameraAus(false);
      /* Die LIVE-Vorschau, damit man sich beim Sprechen sieht — ohne sie filmt man blind
         die Zimmerdecke. Der Strom hängt erst nach dem Umschalten am Element, deshalb im
         nächsten Durchlauf. */
      stromRef.current = strom;
      /* Fenster auf, Kamera laeuft — aufgenommen wird NICHTS, bis er auf Start drueckt. */
      setLaeuft(false);
      setNimmtAuf(true);
    } catch (e) {
      /**
       * WARUM ES NICHT GING, GEHOERT AUF DEN BILDSCHIRM (Owner 07.08.2026: „Dann der Button
       * geht nicht").
       *
       * „Geht nicht" hat hier mindestens vier Ursachen, und sie verlangen verschiedene
       * Antworten: verweigerte Erlaubnis, gar keine Kamera am Geraet, ein Browser ohne
       * `mediaDevices` (Safari gibt sie auf einer UNVERSCHLUESSELTEN Adresse nicht heraus —
       * auf `http://localhost` also auch nicht), oder eine Kamera, die schon ein anderes
       * Programm haelt. Ohne den Grund raet der Kaeufer, und wir raten mit.
       *
       * Der Name des Fehlers steht deshalb in Klammern dahinter. Er ist nicht schoen, aber
       * er ist der Unterschied zwischen „erlaub es im Browser" und „nimm ein anderes Geraet".
       */
      /* Ein selbst geworfener Fehler heisst schlicht „Error" — dann sagt die Nachricht
         mehr als der Name. Bei den Browser-Fehlern (NotAllowedError, NotFoundError,
         NotReadableError) ist es umgekehrt. */
      const grund = e instanceof Error ? (e.name === "Error" ? e.message : e.name) : "?";
      setNimmtAuf(false); setKameraAus(true);
      setAufnahmeFehler(`${SW.kameraAus} (${grund})`);
      /* Der Grund geht mit ins Insights — sonst steht er nur auf dem Bildschirm des Kunden. */
      track(`aufnahme_kamera_${grund.replace(/[^A-Za-z]/g, "").slice(0, 24) || "unbekannt"}`);
    }
  };
  /**
   * JETZT LOS — der Knopf im Aufnahme-Fenster (Owner 08.08.2026). Erst hier schneidet der
   * Recorder mit; davor ist es nur eine Vorschau zum Zurechtruecken. Der Deckel von 12
   * Sekunden bleibt die TECHNISCHE Grenze (Daten-URL im JSON-Koerper, Vercel ~4,5 MB) —
   * keine Produktvorgabe: „Du musst nie Aufnahmedauer begrenzen."
   */
  const aufnahmeLos = () => {
    const rec = aufnehmerRef.current;
    if (!rec || rec.state === "recording") return;
    try { rec.start(); } catch {
      /* Der Strom ist zwischen Klick und Start gestorben (Tab-Wechsel, Kamera entzogen). */
      try { stromRef.current?.getTracks().forEach(t => t.stop()); } catch { /**/ }
      stromRef.current = null;
      setNimmtAuf(false); setLaeuft(false); setKameraAus(true); setAufnahmeFehler(SW.kameraAus);
      return;
    }
    setLaeuft(true);
    /**
     * ACHT SEKUNDEN (Owner 09.08.2026: „mach die Videos 8 sek lang" — vorher fünf).
     *
     * Ein PREIS-Deckel, kein technischer. Die Rechnung dahinter, gemessen an der
     * HeyGen-Abrechnung vom 08.08.: 0,05 Credits je Videosekunde ≈ 0,05 $. Fünf Sekunden
     * waren 0,25 $, acht sind 0,40 $ — mit dem Bild (~15 ct) also rund 0,55 $ Warenkosten
     * bei 4,99 € Verkaufspreis. Der Knopf sagt die Dauer vorher (`ctaVideo`, sieben
     * Sprachen), damit niemand mitten im Satz überrascht wird.
     *
     * DIE ZAHL STEHT AN EINER STELLE — wer sie ändert, ändert den Zähler, den Auto-Stopp
     * UND den Knopftext in `lib/kiss-i18n` (dort „8 s video — {geburtstag}").
     */
    setRestSek(aufnahmeSekFuer(variant));
    const takt = setInterval(() => setRestSek(s => (s > 1 ? s - 1 : 0)), 1000);
    setTimeout(() => clearInterval(takt), aufnahmeSekFuer(variant) * 1000 + 500);
    setTimeout(() => { try { if (rec.state === "recording") rec.stop(); } catch { /**/ } }, aufnahmeSekFuer(variant) * 1000);
  };

  const aufnahmeStopp = () => {
    /* Noch nicht gestartet? Dann ist der Knopf ein ABBRECHEN — aufräumen statt stoppen:
       Ein `rec.stop()` auf einem nie gestarteten Recorder würde werfen und die Kamera
       brennen lassen. */
    if (!laeuft) {
      setNimmtAuf(false);
      try { stromRef.current?.getTracks().forEach(t => t.stop()); } catch { /**/ } 
      stromRef.current = null;
      if (vorschauRef.current) vorschauRef.current.srcObject = null;
      return;
    }
    setLaeuft(false);
    try { aufnehmerRef.current?.stop(); } catch { /**/ }
  };

  /**
   * DAS SELBSTBILD HAENGT SICH AN, SOBALD ES DAS BILD GIBT (Owner 07.08.2026: „aber ich
   * sehe mich im fenster nicht beim aufnehmen").
   *
   * Vorher stand das Anhaengen direkt hinter `setNimmtAuf(true)` in einem `setTimeout(…, 0)`.
   * Das ist ein Rennen, das man nicht gewinnen kann: Der Zustand loest ein Neuzeichnen aus,
   * und ob das `<video>` in diesem Augenblick schon im Baum steht, entscheidet React — nicht
   * die Reihenfolge meiner Zeilen. Traf der Zeitgeber zu frueh, war `vorschauRef.current`
   * null, und der Strom hing nirgends. Man sprach in eine schwarze Flaeche.
   *
   * Ein Effekt auf `nimmtAuf` laeuft NACH dem Zeichnen — dann gibt es das Element mit
   * Sicherheit. `muted` ist Pflicht: Ein Vorschaubild mit dem eigenen Ton wuerde ruecktkoppeln.
   */
  useEffect(() => {
    const v = vorschauRef.current;
    const strom = stromRef.current;
    if (!nimmtAuf || !v || !strom) return;
    v.srcObject = strom;
    v.muted = true;
    void v.play().catch(() => { /* das Standbild bleibt — die Aufnahme laeuft trotzdem */ });
    return () => { try { v.srcObject = null; } catch { /**/ } };
  }, [nimmtAuf]);
  /** Euro-Guthaben in Cent (Aufladung 9,99; Owner 01.08.2026 Variante B). null = unbekannt. */
  const [guthabenCents, setGuthabenCents] = useState<number | null>(null);
  /**
   * GELD, DAS AUF EINER ANDEREN ADRESSE DIESES GERAETS LIEGT (Owner 03.08.2026: „mein
   * Kontostand zeigt 0 Euro an, aber ich habe Geld drauf").
   *
   * Guthaben haengt an einer E-Mail. Wer als Gast auflaedt und sich spaeter mit einem anderen
   * Konto anmeldet, hat sein Geld nicht verloren — er sieht es nur nicht mehr. Ohne diesen
   * Hinweis ist der naechste Schritt eine zweite Aufladung fuer etwas, das schon bezahlt ist.
   */
  const [gestrandet, setGestrandet] = useState<Gestrandet | null>(null);
  /** Nach der Aufladungs-Rueckkehr: das gewuenschte Video jetzt vom Guthaben kaufen. */
  const nachAufladungKaufen = useRef(false);
  /**
   * DIE LETZTE AUFLADUNG WAR 0,00 € WERT (Owner 07.08.2026: „wieso bekomme ich keine
   * Meldung, nicht genügend Credit?"). Ein 100-%-Aktionscode zahlt die Kasse, gutgeschrieben
   * wird aber nur der GEZAHLTE Betrag (checkout-status) — der Wähler ging danach wortlos
   * wieder auf. Dieses Flag trägt das Wort in den Dialog; es fällt, sobald er eine neue
   * Aufladung anstößt.
   */
  const [aufladeNull, setAufladeNull] = useState(false);
  /**
   * DIE BEREITS ANGEZOGENEN FOTOS des laufenden Versuchs (Uebergabe 2d). Ein zweiter Anlauf
   * mit denselben Zutaten nimmt sie, statt zwei FASHN-Laeufe noch einmal zu bezahlen.
   * Ein Ref und kein State: Es soll nichts neu zeichnen, nur nichts vergessen.
   */
  const angezogen = useRef<{ schluessel: string; ihr: string; sein: string } | null>(null);

  /**
   * ZURUECK AUF DIE ADRESSE MIT DEM GELD (Owner 03.08.2026).
   *
   * Der Knopf tut ABSICHTLICH mehr als abmelden. Das Abmelden im Menue loescht auch
   * `lb_kiss_mail` — richtig dort, hier fatal: Es wuerde genau die Adresse vergessen, wegen
   * der er ueberhaupt geklickt hat, und er muesste sie neu eintippen, um an sein eigenes
   * Guthaben zu kommen. Also melden wir vom Konto ab UND setzen das Geraet zurueck auf die
   * Adresse, die es vorher schon einmal bestaetigt hatte.
   *
   * Das ist KEIN Konten-Zusammenlegen: Es wird kein Cent bewegt und kein fremdes Konto
   * geoeffnet — das Geraet wird nur wieder zu dem Gast, der es vor der Anmeldung war.
   */
  /**
   * DIE GEAENDERTE ADRESSE BESTAETIGEN — derselbe Weg wie beim ersten Mal.
   *
   * Bewusst ueber `adresseVormerken`: Dort haengen die Eingangstore (Format, Wegwerf-Adressen,
   * die KI-Pruefung auf Gehaemmertes). Ein zweiter, bequemerer Weg hier waere ein Loch in
   * genau der Wand, die vorne steht — und die Adresse, die hier entsteht, ist die, auf die
   * gleich Geld gebucht wird.
   */
  /**
   * „Meintest du …?" — leer, solange die Adresse unauffaellig ist. Nur ein Angebot: Wer eine
   * echte, seltene Domain hat, tippt einfach weiter und sieht den Vorschlag nie wieder.
   */
  const vorschlag = mailTippfehler(mail);

  /**
   * `true` heisst „angenommen" — der Aufladewähler schliesst sein Feld dann selbst
   * (`components/CI.tsx`, `AufladeWaehler`). Die Absage steht am Feld, nicht im Rückgabewert.
   */
  const adresseSpeichern = async (): Promise<boolean> => {
    const e = mail.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { setMailFehler(T.mailInvalid); return false; }
    return await adresseVormerken(e);
  };

  const abmelden = async () => {
    const ziel = gestrandet?.adresse ?? "";
    try { signOut(); } catch { /* ohne aktive Sitzung wirft es — dann gibt es nichts zu tun */ }
    try { localStorage.removeItem("lb_curator"); } catch { /**/ }
    if (ziel) { try { localStorage.setItem(MAIL_KEY, ziel); } catch { /**/ } }
    setGestrandet(null);
    if (ziel) { setMail(ziel); setAdresseDa(true); setFrei(true); }
    // Erst „abgemeldet" (der Chip leert sich), dann „neu" — sonst zeigt er den alten Stand
    // weiter, und genau dieses Nachziehen war der Anlass fuer beide Ereignisse.
    try { window.dispatchEvent(new CustomEvent("lb-abgemeldet")); } catch { /**/ }
    try { window.dispatchEvent(new Event("lb-guthaben-neu")); } catch { /**/ }
  };

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
    /**
     * EIN FRISCHER LINK JE TEILEN (09.08.2026): WhatsApp & Co. speichern die Vorschau JE
     * ADRESSE. War sie beim ersten Mal falsch, bleibt sie es — auch nachdem der Fehler weg
     * ist. Der angehängte Zeitstempel macht jede Weitergabe zu einer neuen Adresse, also zu
     * einer neuen Vorschau. Für den Empfänger ändert sich nichts; die Seite ignoriert ihn.
     */
    const url = `${window.location.origin}/w/${encodeURIComponent(genId)}?l=${encodeURIComponent(String(lang).slice(0, 2))}&utm_source=share&v=${Date.now().toString(36)}`;
    const text = teilenText(variant, lang);
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
  /**
   * FUER BEKANNTE STARTET DER TUNNEL BEI SCHRITT 3 (Owner 12.08.2026, s. o. bei
   * `versprechenSchonBekannt`) — nur beim Versprechen: Sein Zweischritt-Tunnel benutzt
   * Schritt 1 fuer `TunnelStart` (Name + E-Mail) und Schritt 3 fuer die zwei Kacheln plus
   * Generieren (dieselbe Zahl, mit der `V.nurSie`-Themen seit je ihren zweiten sichtbaren
   * Schritt zaehlen — siehe die Fortschritts-Punkte weiter unten, `[1, 3]`). Ist die Adresse
   * schon da, gibt es fuer ihn nichts in Schritt 1 zu tun.
   *
   * AUF DER TUNNEL-SEITE ENTSCHEIDET DIE URL (`urlSchritt`), NICHT DIESE PRUEFUNG NOCH EINMAL
   * (Owner 12.08.2026: „der user soll auch vor und zurück in den steps"). `app/themes/
   * versprechen/start/page.tsx` hat den Bekannten-Fall schon VOR dem ersten Zeichnen
   * entschieden (dieselbe Pruefung, nur dort) und reicht das Ergebnis als `?s=`-Parameter
   * herein — sonst wuerde ein bewusstes Zuruecktippen auf Schritt 1 von dieser Pruefung
   * sofort wieder ueberschrieben (das war der Fehler im vorigen Anlauf, siehe den jetzt
   * GELOESCHTEN Korrektur-Effekt weiter unten).
   */
  /** Zaehmt die blosse Zahl aus `TunnelSeite` auf einen der vier echten Schritte — ausserhalb
   *  dieser vier passiert im Trichter ohnehin nichts, ein unerwarteter Wert faellt auf 1. */
  const alsSchritt = (n: number): 1 | 2 | 3 | 4 => (n === 1 || n === 2 || n === 3 || n === 4) ? n : 1;
  const [schritt, setSchritt] = useState<1 | 2 | 3 | 4>(() => {
    if (tunnelSeite && urlSchritt) return alsSchritt(urlSchritt);
    return (variant === "versprechen" && versprechenSchonBekannt()) ? 3 : 1;
  });

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

  /**
   * DER KORREKTUR-EFFEKT VON VORHIN IST WIEDER RAUS (Owner 12.08.2026: „der user soll auch
   * vor und zurück in den steps").
   *
   * Er drueckte GENAU DAS weg, was jetzt ausdruecklich gewollt ist: Ging ein bekannter
   * Besucher bewusst von Schritt 3 zurueck auf Schritt 1 (z. B. um seine Adresse zu aendern),
   * schnappte dieser Effekt sofort wieder auf Schritt 3 — ein Zurueck, das nicht zurueckging.
   * Das „Bekannte ueberspringen Schritt 1"-Verhalten gehoert deshalb NUR an den EINSTIEG (den
   * `useState`-Anfangswert oben, bzw. auf der Tunnel-Seite an `urlSchritt`) — ein spaeteres
   * `schritt`-Aendern ist immer eine bewusste Handlung (Knopf, Chevron, URL) und wird nicht
   * mehr automatisch ueberschrieben.
   */

  /**
   * DIE URL UND DER SCHRITT — ZWEI RICHTUNGEN, EINE QUELLE JE RICHTUNG (nur `tunnelSeite`).
   *
   * VORWAERTS: Jede Aenderung an `schritt` meldet sich nach aussen; die Tunnel-Seite schreibt
   * sie in die Adresszeile (`router.push` beim Vorwaertsgehen legt einen Verlaufseintrag an,
   * damit die Handy-Zurück-Geste ihn wieder abraeumt — Owner: „der user soll auch vor und
   * zurück in den steps").
   *
   * RUECKWAERTS: Aendert sich `urlSchritt` von aussen (Browser-Zurück, ein geteilter Link mit
   * `?s=1`), zieht dieser Effekt den internen Zustand nach. Ohne ihn wuerde die Adresszeile
   * zwar zurueckspringen, aber der Bildschirm bliebe auf dem alten Schritt stehen — zwei
   * Wahrheiten gleichzeitig.
   */
  useEffect(() => {
    if (onSchrittChange) onSchrittChange(schritt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schritt]);
  useEffect(() => {
    if (tunnelSeite && urlSchritt && alsSchritt(urlSchritt) !== schritt) setSchritt(alsSchritt(urlSchritt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSchritt]);
  /**
   * DER SCHRITT-PFEIL SCHLIESST DIE KASSE (15.08.2026, Hausregel `immer-close-einbauen`).
   *
   * `KasseImFenster` hat bewusst KEINEN eigenen Zurueck-Knopf — der Schritt darueber hat
   * schon einen, und zwei untereinander sind ein Raetsel statt einer Navigation. Nur: der
   * Pfeil raeumte das Formular nicht weg. Das Geheimnis wurde gesetzt und nie geleert, also
   * blieb Stripes Kasse unter JEDEM folgenden Schritt haengen — ein Ausweg, den es nur
   * scheinbar gab.
   *
   * Jetzt gilt: Wer den Schritt wechselt, hat die Kasse verlassen. Der Auftrag bleibt
   * unberuehrt (er entsteht vor dem Geld), ein neues Tippen auf Kaufen oeffnet eine frische
   * Sitzung. Damit ist der vorhandene Pfeil der garantierte Weg hinaus, ohne einen zweiten.
   *
   * DAS ALLES STECKT SEIT DEM UMBAU IM HAKEN (`useKasseImFenster`), damit die anderen vier
   * Trichter dieselbe Regel bekommen, ohne sie abzuschreiben.
   */
  /**
   * DIE KENNUNG DES GEWAEHLTEN TANZ-SETS — fuer den AUFTRAG (15.08.2026).
   *
   * `neuerLook` haelt das BILD; der Auftrag speichert Kennungen (`look`). Ohne diese
   * Uebersetzung stand im Auftrag nichts, und die Nachlieferung vom Server konnte gar nicht
   * wissen, welches Set gemeint war.
   */
  const tanzSetId = () => (variant === "poledance"
    ? (POLEDANCE_SETS.find(x => x.bild === (neuerLook || V.garmentBild))?.id ?? "")
    : "");
  const kasse = useKasseImFenster(schritt);

  // `videoShow`/`videoReif` (die gespielte Render-Show vor der Kasse) sind am 31.07.2026
  // ersatzlos entfallen — Owner: „ohne diesen Fake". Begruendung bei `unlock` weiter unten.
  const [videoBusy, setVideoBusy] = useState(false);      // ECHTER Video-Lauf laeuft
  /**
   * PROZENTE STATT EINES STEHENDEN TEXTES (Owner: „kannst du nicht in der Karte oben rendern
   * lassen und Prozente hinschreiben?").
   *
   * ES IST EINE SCHAETZUNG, UND SIE IST ALS SOLCHE GEBAUT. Pixverse meldet keinen Fortschritt
   * — der Poll kennt nur „laeuft / fertig / gescheitert". Die naheliegende Rechnung
   * `Durchgang / 90` waere deshalb eine Luege in die falsche Richtung: Der Deckel liegt bei
   * sechs Minuten, ein Lauf dauert aber gut anderthalb — die Anzeige stuende bei 25 %, wenn
   * das Video schon fertig ist.
   *
   * Also gegen die ERWARTETE Dauer gerechnet, mit abflachender Kurve, und bei 95 % gedeckelt.
   * Der Deckel ist der ehrliche Teil: 100 % gibt es erst, wenn das Video wirklich da ist.
   * Dauert es laenger als erwartet, steht die Anzeige bei 95 — das liest sich als „gleich",
   * nicht als „haengt", und es hat nie etwas versprochen, was es nicht halten konnte.
   */
  const [videoStart, setVideoStart] = useState(0);
  const [fortschritt, setFortschritt] = useState(0);
  const [videoUrl, setVideoUrl] = useState("");    // ECHTES Video (erst nach Zahlung / Staff)
  const [genId, setGenId] = useState("");          // Kiss-Log-Eintrag dieser Generierung
  const [payBusy, setPayBusy] = useState(false);
  /**
   * DER LINK ZUM 30-TAGE-PROGRAMM (11.08.2026, Owner: „wo ist der link zum plan?" — bisher
   * nur in der Liefermail). Nur beim Versprechen gesetzt, nur wenn der Server ihn mitgibt
   * (`programUrl` aus /api/kiss-video-checkout oder /api/checkout-status — beide liefern ihn
   * NUR, wenn die Programm-Datei serverseitig wirklich existiert). Leer = kein Knopf.
   */
  const [programUrl, setProgramUrl] = useState("");
  /* Erstattung unter dem fertigen Video: scharf (erster Tipp), laeuft, erledigt. */
  const [erstattScharf, setErstattScharf] = useState(false);
  const [erstattBusy, setErstattBusy] = useState(false);
  const [erstattet, setErstattet] = useState(false);
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
  /** „2 · Dein Geburtstagsvideo" — dorthin springt es, sobald die Aufnahme steht. */
  const schrittZweiRef = useRef<HTMLParagraphElement>(null);

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
    try { const n = localStorage.getItem(nameKey(variant)); if (n) setEmpfaenger(n); } catch { /**/ }
    /* Das gewaehlte Set zurueckholen (siehe `waehle` bei der Set-Wahl). Nur, wenn es die
       Liste wirklich kennt — ein alter Pfad aus einer frueheren Fassung waere sonst ein
       Bild, das es nicht mehr gibt. */
    try {
      const gemerkt = localStorage.getItem(`lb_set_${variant}`) || "";
      if (gemerkt && POLEDANCE_SETS.some(x => x.bild === gemerkt)) setNeuerLook(gemerkt);
    } catch { /**/ }
    try {
      const roh = localStorage.getItem(zieleKey(variant));
      const z = roh ? JSON.parse(roh) as { ids?: string[]; frei?: string } : null;
      if (Array.isArray(z?.ids)) setZiele(z.ids.filter(x => (ZIEL_IDS as readonly string[]).includes(x)).slice(0, MAX_ZIELE) as ZielId[]);
      if (typeof z?.frei === "string") setZieleFrei(z.frei);
    } catch { /**/ }
    /* Die weggelegte Aufnahme zurückholen (siehe `zurAnmeldung`) — samt Schritt und Sprung. */
    try {
      const roh = localStorage.getItem(`lb_kiss_aufn_${variant}`);
      const a = roh ? JSON.parse(roh) as { bild?: string; ton?: string; look?: string; empfaenger?: string; at?: number } : null;
      if (a?.bild && a.at && Date.now() - a.at < 7_200_000) {
        setCustomModel(a.bild); setUseCustom(true);
        if (a.ton) { setTonspur(a.ton); setAufnahme(a.ton); }
        if (a.look) setLook(a.look);
        if (a.empfaenger) setEmpfaenger(a.empfaenger);
        setSchritt(3); setStufenOffen(true);
        setTimeout(() => schrittZweiRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
      }
      if (roh) localStorage.removeItem(`lb_kiss_aufn_${variant}`);
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
  /**
   * DER KLEIDERSCHRANK ALS LOOK-GALERIE (Owner 03.08.2026: „hier habe ich eine Sackgasse. Ich
   * müsste hier doch ‚Generate new‘ mit einem anderen Look. Also wir müssen doch die
   * Look-Galerie einfügen").
   *
   * Er hat recht, und es ist eine Sackgasse mit Ansage: Nach dem fertigen Video stand genau ein
   * Knopf da — Herunterladen. Wer gerade 3,99 € ausgegeben hat und zufrieden ist, ist der
   * BESTE Kunde fuer das naechste; ihm nichts anzubieten ist die teuerste Hoeflichkeit des
   * Portals.
   *
   * Die Galerie gibt es laengst: `wardrobe === true` im Bestand, 87 Stueck, dieselbe Liste, aus
   * der frueher der Chat ankleidete. Kein neues Bildmaterial noetig.
   */
  /**
   * DIE SET-AUSWAHL (Owner 03.08.2026: „ich habe dir Bilder generiert, schon mit BG und
   * Unterwäsche, die kannst du nehmen").
   *
   * HIER STAND DER KLEIDERSCHRANK — 87 freigestellte Produktfotos auf Weiss. Der Versuch ist
   * gescheitert, und zwar sichtbar: Pixverse bekam das Outfit und KEINEN Ort und liess sie in
   * ihrem Wohnzimmer springen. Der Owner hat daraufhin vier Sets erzeugt, die die Szene
   * MITBRINGEN — Waesche vor Neon, wie das erste. Sie stehen fest in lib/poledance.ts: Sie sind
   * Teil des Produkts, kein gepflegter Inhalt, und ein signierter Speicher-Link laeuft ab.
   */
  const garderobe = V.nurSie && variant === "poledance" ? POLEDANCE_SETS.map(x => ({ id: x.id, name: x.name, imageUrl: x.bild })) : [];
  const [neuerLook, setNeuerLook] = useState("");
  /**
   * WELCHEN FERTIGEN TANZ SIE UEBERNIMMT (Owner 03.08.2026: „es muss auf jeder Karte ein
   * Replace Model stehen"). Leer = der erste; die Route faellt ohne ihn auf den Referenz-Modus
   * zurueck.
   */
  const [refVideo, setRefVideo] = useState("");
  /**
   * DIE WAHL KOMMT VON DER LANDINGPAGE (Owner 03.08.2026: „die Auswahl findet auf der
   * Landingpage statt").
   *
   * `TanzAuswahl` steht dort als eigener Baustein und meldet die Wahl per Ereignis — der
   * einfachste Weg zwischen zwei Bausteinen, die kein gemeinsames Elternteil haben. Beim Laden
   * wird zusaetzlich gelesen, was gespeichert ist: Wer waehlt, dann hochlaedt und dabei die
   * Seite neu laedt, soll seine Wahl nicht verlieren.
   */
  useEffect(() => {
    try { const g = localStorage.getItem("lb_tanz_ref"); if (g) setRefVideo(g); } catch { /**/ }
    const hoeren = (e: Event) => setRefVideo(String((e as CustomEvent).detail ?? ""));
    window.addEventListener("lb-tanz-ref", hoeren);
    return () => window.removeEventListener("lb-tanz-ref", hoeren);
  }, []);
  const [probe, setProbe] = useState("");   // Ergebnis des Probelaufs (nur Admin)

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
    // Welche Adresse gilt und wo sonst noch Geld liegt, beantwortet lib/guthaben-konto —
    // dieselbe Regel wie im Header-Chip, damit beide nie auseinanderlaufen.
    void guthabenLesen(e).then(stand => {
      if (weg || !stand) return;
      setAboAktiv(stand.abo);
      setVideosLinks(stand.links);
      setGuthabenCents(stand.cents);
      setGestrandet(stand.gestrandet);
      // Freigeschaltet ist, wer ein laufendes Abo hat ODER noch ein gekauftes Video offen
      // hat. Beides heisst: er darf jetzt ein Video machen, ohne die Kasse zu sehen.
      if (stand.abo || stand.links > 0) { setBezahlt(true); setExtraNoetig(false); }
    });
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
        q.delete("topup"); q.delete("cs"); q.delete("cancelled");
        const rest = q.toString();
        window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));
        if (typeof st.walletCents === "number") setGuthabenCents(st.walletCents);
        if (st.gutgeschrieben === 0) setAufladeNull(true);   // 100-%-Code: bezahlt, aber 0 € wert
        try { window.dispatchEvent(new Event("lb-guthaben-neu")); } catch { /**/ }
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
      if (st.programUrl) setProgramUrl(String(st.programUrl));

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
    /**
     * HIER STAND DAS EINGANGSTOR — „KEIN UPLOAD OHNE ADRESSE" (Owner 03.08.2026). Es ist am
     * 16.08.2026 gefallen, auf Ansage: „der user soll trotzdem weiter können auch ohne email
     * aber später beim generieren braucht er eine."
     *
     * WARUM ES WEG MUSSTE: Die Anzeige zeigt ab heute direkt auf den Generieren-Schritt
     * (`?s=3`). Wer dort ankommt, hat Schritt 1 nie gesehen — das Tor hätte also JEDEN
     * Anzeigen-Besucher beim ersten Foto angehalten und wäre damit genau die Mauer geworden,
     * die aus Schritt 1 gerade verschwunden ist.
     *
     * DIE PFLICHT IST NICHT WEG, SIE STEHT EINEN SCHRITT SPÄTER: ohne gültige Adresse
     * erzeugt `generate()` nichts (Feld direkt über dem Knopf). Was bleibt, ist der Preis
     * dieser Entscheidung — hochgeladene Gesichter ohne Adresse. Genau die musste
     * `scripts/kiss-anonyme-loeschen.mjs` am 03.08. wegräumen (195 Stück); dieses Skript ist
     * damit kein Aufräumer mehr, sondern Pflichtprogramm.
     */
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
          // `device` mit (11.08.2026, Besitzpruefung am `update`) — sonst weist die neue
          // Wache im Server jeden zweiten Foto-Upload ab, sobald der Eintrag schon ein
          // Geraet traegt.
          ? JSON.stringify({ update: genId, theme: variant, personImage: dataUrl, modelId: selId, modelName: selName, lang, email: mail.trim(), device })
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
      /* Sein Kopf-Rechteck merken — siehe `kopfBox`/`aufKopfSchneiden`. */
      if (log?.kopfEr) kopfBox.current.er = log.kopfEr as KopfBox;
      void fotosMerken(dataUrl, selPhoto, useCustom);
    } catch (e) {
      /**
       * DIE ABSAGE MUSS MAN SEHEN (Owner 18.08.2026, an einem BEZAHLTEN Auftrag: „Sein Foto
       * fehlt im Speicher" — und: „aber die fehlermeldung hätte kommen müssen").
       *
       * HIER STAND `catch { }` — ein leerer Fang. `fileToDataUrl` wirft bei einem Format, das
       * der Browser nicht lesen kann (iPhone-HEIC am Schreibtisch, Chrome kann es nicht), und
       * genau dieser Wurf verschwand hier lautlos: kein Bild, keine Meldung, kein Hinweis. Der
       * Kunde sah eine leere Kachel, hielt sie fuer hochgeladen, ging weiter, ZAHLTE — und der
       * Auftrag stand ohne sein Foto da. Ein stiller Fang ist an einer Stelle, hinter der eine
       * Kasse steht, kein Schoenheitsfehler.
       */
      setUploadFehler(e instanceof Error && e.message ? e.message : T.statusNotWork);
    }
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
  /**
   * DAS VERSPRECHEN OEFFNET KEINEN DIALOG MEHR — ES FUEHRT AUF SEINE EIGENE SEITE (Owner
   * 12.08.2026: „die muss ich in den ads einbauen"). Auf der Landingpage (`/themes/
   * versprechen`) ist dieser Kartenklick der einzige Weg in den Trichter; er springt jetzt
   * auf `/themes/versprechen/start` statt den Dialog hier zu oeffnen — `light`/`code`
   * wandern mit, damit eine Anzeige, die auf die helle Fassung oder einen Aktionscode
   * verweist, das auch auf der Tunnel-Seite noch tut.
   *
   * NUR WENN NICHT `tunnelSeite`: Auf der Tunnel-Seite SELBST ist `KissFunnel` schon die
   * Zielseite — ein Klick dort muss den Trichter oeffnen, nicht auf sich selbst verlinken.
   */
  const schritteOeffnen = () => {
    if (TUNNEL_VARIANTEN.includes(variant) && !tunnelSeite) {
      try {
        const jetzt = new URLSearchParams(window.location.search);
        const ziel = new URLSearchParams();
        if (jetzt.get("light") === "1") ziel.set("light", "1");
        if (code) ziel.set("code", code);
        /* DER TANZ WOHNT UNTER /themes/surprise (Owner 14.08.2026, live gefunden: „Începe
           acum" fuehrte zur STARTSEITE) — die Variante heisst `poledance`, die Adresse
           nicht. Dieselbe Zuordnung wie am Teilen-Knopf und am Zurueck-Chip. */
        window.location.href = `/themes/${variant === "poledance" ? "surprise" : variant}/start${ziel.toString() ? `?${ziel}` : ""}`;
      } catch { /* die Seite bleibt erreichbar, auch ohne die zwei Zusatzparameter */ }
      return;
    }
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

  /**
   * DIE KOPF-RECHTECKE DER ZWEI VORLAGEN (Owner 16.08.2026: „aber kannst du die erkennen und
   * schneiden?" · „gratis").
   *
   * Sie kommen von der Upload-Antwort (`/api/kiss-log` → `kopfEr`/`kopfSie`) und fallen dort
   * bei der Sicherheitspruefung ab, die ohnehin laeuft — kein eigener Dienst, kein zweiter
   * Aufruf. In einem `useRef`, nicht im Zustand: Sie zeichnen nichts, sie werden genau einmal
   * gelesen, kurz bevor die Fotos zu OpenAI gehen.
   */
  const kopfBox = useRef<{ er?: KopfBox | null; sie?: KopfBox | null }>({});
  /* Prozentwerte, nicht Pixel — das Rechteck gilt fuer jede Skalierung des Fotos. */

  /**
   * AUF DEN KOPF ZUSCHNEIDEN — im Browser, mit Leinwand, ohne Bibliothek und ohne Kosten.
   *
   * WOFUER: Nur der Kopf geht an OpenAI (Owner: „die müssen wir auch machen, in dem wir die
   * gesichter an chatgpt geben"). Alles unterhalb des Halses liefert der Bildprompt — das
   * Kleid, der Anzug, der Ort. Ein nacktes Foto verlaesst damit das Geraet gar nicht erst
   * vollstaendig.
   *
   * GROSSZUEGIG, WEIL DIE SCHAETZUNG UNGENAU IST: Das Rechteck kommt von einem Sprachmodell.
   * Der Rand ringsum (60 % der Kopfbreite) faengt ab, dass ein zu eng geschaetztes Rechteck
   * jemanden koepft. Ohne brauchbares Rechteck bleibt das Foto UNVERAENDERT — lieber das
   * ganze Bild schicken als ein falsch beschnittenes.
   */
  const aufKopfSchneiden = (dataUrl: string, box?: KopfBox | null): Promise<string> =>
    new Promise(fertig => {
      if (!dataUrl || !box) { fertig(dataUrl); return; }
      const bild = new Image();
      bild.onload = () => {
        try {
          const B = bild.naturalWidth, H = bild.naturalHeight;
          const rand = (box.w / 100) * B * 0.6;
          const x = Math.max(0, (box.x / 100) * B - rand);
          const y = Math.max(0, (box.y / 100) * H - rand);
          const b = Math.min(B - x, (box.w / 100) * B + rand * 2);
          const h = Math.min(H - y, (box.h / 100) * H + rand * 2);
          if (b < 40 || h < 40) { fertig(dataUrl); return; }
          const c = document.createElement("canvas");
          c.width = Math.round(b); c.height = Math.round(h);
          const ctx = c.getContext("2d");
          if (!ctx) { fertig(dataUrl); return; }
          ctx.drawImage(bild, x, y, b, h, 0, 0, c.width, c.height);
          fertig(c.toDataURL("image/jpeg", 0.92));
        } catch { fertig(dataUrl); }
      };
      bild.onerror = () => fertig(dataUrl);
      bild.src = dataUrl;
    });

  const fotoLoeschen = (wer: "sie" | "er") => {
    if (wer === "sie") {
      setCustomModel(""); setUseCustom(false);
      /**
       * DER LEERE PLATZ MUSS LEER SEIN (Owner 16.08.2026, live: „jetzt steht da Video als
       * Bild 1" — und wieder am 19.08.2026, diesmal beim Tanz: „Kommt Bella links statt
       * upload").
       *
       * `selPhoto` faellt ohne eigenes Foto auf `picked` zurueck — ein KATALOG-Model. Im
       * Trichter gibt es aber gar keine Katalog-Wahl (die wohnt auf der Landingpage):
       * Sein geloeschtes Foto wurde damit stillschweigend durch eine fremde Frau ersetzt
       * (Bella, sie steht immer an erster Stelle) — und weil ein Katalog-Model als
       * „Vorlage" gilt, kam ihr Beispielvideo gleich mit.
       *
       * DIE ERSTE REPARATUR GALT NUR `variant === "kiss"` — zu eng. Derselbe Trichter-Bau
       * (EIN Bauwerk fuer alle Produkte, Memory [[ein-tunnel-geruest-fuer-alle]]) gilt fuer
       * Tanz, Urlaub, Hochzeit … genauso: keines von ihnen hat eine eigene Katalog-Wahl IM
       * Trichter. Die Bedingung gehoert also nicht an EIN Thema, sondern an die einzige
       * Ausnahme: „Your Idol" braucht den Katalog als Rueckfall wirklich (dort WAEHLT man
       * ein Model, es gibt keinen leeren Zustand, der geleert werden koennte).
       *
       * NUR IM TRICHTER, UND NICHT BEI „YOUR IDOL": Auf der Landingpage und bei „Your Idol"
       * IST der Katalog der Rueckfall, dort bleibt es wie es war.
       */
      if (tunnelSeite && variant !== "idol") setPicked(null);
    }
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
    // `device` mit (11.08.2026, Besitzpruefung am `update`): ohne sie weist der Server
    // diesen Aufruf ab, sobald der Eintrag schon ein Geraet traegt (aus dem allerersten
    // Anlegen). `localStorage` ist hier synchron erreichbar, kein eigener Zustand noetig.
    let device = "";
    try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
    void fetch("/api/kiss-log", {
      method: "POST", headers: { "Content-Type": "application/json" },
      // `lang` mit (11.08.2026): sonst fehlt sie an Eintraegen, deren erster Aufruf hier
      // ist, und die private Programmseite faellt auf Englisch zurueck.
      body: JSON.stringify({ update: genId, modelId: selId, modelName: selName, lang, device }),
    }).catch(() => {});
  };
  // Auch IHR Foto wird beim Hochladen abgelegt (Owner 30.07.2026: „ich sehe das Bild von der
  // Frau nicht, die ich hochgeladen habe"). Gibt es schon einen Eintrag, wird er ergänzt;
  // sonst entsteht er hier — je nachdem, was er zuerst hochlädt.
  const onModelFile = async (f?: File | null) => {
    if (!f) return;
    // Kein Tor mehr, aus demselben Grund wie bei seinem eigenen Foto (siehe `onFile`).
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
          // `device` mit (11.08.2026, Besitzpruefung am `update`).
          ? JSON.stringify({ update: genId, theme: variant, modelImage: dataUrl, modelId: "custom", modelName: T.upTitle, lang, email: mail.trim(), device })
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
      /* Ihr Kopf-Rechteck merken — die Antwort desselben Aufrufs, der das Foto geprueft hat. */
      if (log?.kopfSie) kopfBox.current.sie = log.kopfSie as KopfBox;
      void fotosMerken(photo, dataUrl, true);
    } catch (e) {
      /* Derselbe stille Fang wie bei seinem Foto — siehe die Begruendung in `onFileEcht`. */
      setUploadFehler(e instanceof Error && e.message ? e.message : T.statusNotWork);
    }
  };

  // Die aktive Auswahl: entweder die „Your Model"-Karte (eigenes Foto) oder ein Katalog-Model.
  const selPhoto = useCustom ? customModel : (picked?.photoUrl ?? "");
  /**
   * SIND DIE FOTOS DA? — an EINER Stelle beantwortet.
   *
   * Der Trichter fragte das an dreizehn Stellen als `!selPhoto || !photo`. Beim Tanz gibt es
   * `photo` (den Mann) gar nicht mehr (Owner 03.08.2026: „der Upload-Mann wird nicht mehr
   * gebraucht") — dreizehnmal dieselbe Bedingung umzubauen heisst, sie zwoelfmal richtig und
   * einmal falsch umzubauen, und die eine falsche ist ein Knopf, der ewig grau bleibt.
   */
  const fotosDa = V.nurSie ? !!selPhoto : (!!selPhoto && !!photo);
  /**
   * DER AUFRUF AUF DER KARTE — „Personen ersetzen" stimmt nur, wo es Personen im Plural gibt.
   *
   * Beim Tanz steht EINE Frau im Video, und das ist sie selbst. „Personen ersetzen" liest
   * sich dort wie ein Werkzeug fuer ein fremdes Bild statt wie die Einladung, das eigene Foto
   * hochzuladen. `uploadYou` ist in allen sieben Sprachen gepflegt und sagt genau das.
   */
  /* „Lade dein Foto hoch" auf der Karte, wo es keinen Foto-Upload mehr gibt (Owner
     07.08.2026: „da steht Lade dein Foto hoch erst mal ist falsch") — der Aufruf sagt
     jetzt, was wirklich passiert. */
  /**
   * AUF DER KARTE STEHT „JETZT STARTEN" (Owner 07.08.2026: „trotzdem ist Start now besser").
   *
   * Der Knopf auf der Karte oeffnet den Trichter — er TUT die Sache nicht, er faengt sie an.
   * „Selbst aufnehmen" versprach dort eine Handlung, die erst zwei Schritte spaeter kommt;
   * auf Rumaenisch las es sich obendrein als „Registriere dich" (dazu unten der Wortschatz).
   * Kurz, eindeutig in sieben Sprachen, und es legt sich nicht mit dem Aufnahme-Knopf im
   * Trichter an, der weiterhin sagt, was er tut.
   */
  /**
   * DER PREIS STEHT IM KNOPF (Owner 10.08.2026: „ab 4,99 - Jetzt starten. Schreibst du in
   * dem Button").
   *
   * Er stand als eigener Chip über der Karte — eine Zeile, die vierzig Pixel kostete und den
   * Kaufknopf aus dem Bild schob (siehe `mt-4` an der Karte). Und getrennt war er eine
   * Auskunft; im Knopf ist er ein Angebot: Man liest den Preis in dem Augenblick, in dem man
   * sich entscheidet, nicht eine halbe Handhöhe darüber.
   *
   * DIE ZAHL KOMMT AUS DER TABELLE, nie aus dem Text (Hausregel `prices-only-from-pricing-table`).
   * `themenPreisZeile` liefert sie fertig mit „ab" in seiner Sprache. Der Tanz heisst in der
   * Preistabelle „surprise", das Idol zahlt wie der Kuss — deshalb die kleine Zuordnung.
   */
  const preisSchluessel: ThemenSchluessel =
    variant === "poledance" ? "surprise" : variant === "idol" ? "kiss" : variant;
  /**
   * UND ÜBERALL DASSELBE WORT (Owner 10.08.2026: „Button wie CI Preis-Jettzt starten").
   *
   * Hier standen drei verschiedene Aufrufe je Thema — „Personen ersetzen" (Kuss), „Lade dein
   * Foto hoch" (Tanz), „Jetzt starten" (Geburtstag). Jeder beschrieb, was der nächste Schritt
   * technisch tut; keiner sagte, dass es hier LOSGEHT. Ein Haus, ein Knopf: `Preis · Jetzt
   * starten`, in sieben Sprachen aus `T.jetztStarten`.
   */
  const basisAufruf = T.jetztStarten;
  /**
   * BEIM VERSPRECHEN OHNE „AB" (Owner 11.08.2026, mit Bild des Knopfs: „14,99 € · Investiere
   * in deine Zukunft" — die Zahl nackt, der Aufruf ein anderer).
   *
   * „ab" ist ein Versprechen auf eine Leiter: Es gehört dort hin, wo es mehrere Stufen gibt
   * (Abo, Verlängerung, Aufpreis). Hier gibt es genau EINEN Preis, und dann liest sich „ab"
   * wie ein Vorbehalt — als käme später noch etwas. Die Zahl selbst kommt weiter aus der
   * Preistabelle, nur ohne das Wort davor (Hausregel `prices-only-from-pricing-table`).
   *
   * Der Aufruf daneben steht in `T.jetztStarten` und ist beim Versprechen überschrieben
   * (`VERSPRECHEN` in lib/kiss-i18n) — sieben Sprachen, eine Stelle.
   */
  /**
   * NUR NOCH DER AUFRUF, OHNE PREIS (Owner 12.08.2026, mit Bild des Knopfs „from €9.99 ·
   * Start now": „hier auch bei alle nur Start now ohne Preis") — der Landing-Knopf ist die
   * Tür in den Tunnel; den Preis nennt der Generieren-Knopf IM Tunnel („Generate now —
   * Preis"). Überschreibt die Preis-im-Knopf-Fassung vom 10./11.08.
   */
  const kartenAufruf = basisAufruf;
  /**
   * DER TITEL DER VORLAGEN-KARTE — DIESELBE WEICHE WIE DIE GROSSE KARTE (12.08.2026, am
   * Geburtstags-Tunnel gefunden: das Vollbild der Vorlage trug „Mein Geschenk für dich:
   * einen Kuss", weil die Aufrufer naiv `T.karteTitel("")` reichten und der Geburtstag
   * diesen Schlüssel nie überschreibt — sein Gruss kommt aus `geburtstagTitel`).
   */
  const vorlagenTitel = variant === "versprechen"
    ? T.filmTitel
    : variant === "birthday"
    ? geburtstagTitel("")
    : T.karteTitel("");
  // Sobald das Foto da ist, hat der rote Hinweis seinen Zweck erfüllt.
  useEffect(() => { if (selPhoto) setWeiterHinweis(""); }, [selPhoto]);
  // Dasselbe für den Generate-Hinweis: sobald alle drei Bedingungen wieder stimmen, verschwindet er von selbst.
  useEffect(() => {
    if (fotosDa && consent) setGenerateHinweis("");
  }, [fotosDa, consent]);

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
    if (!fotosDa) return;
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
            // `lang` mit (11.08.2026), siehe Aenderung „Sprache am Auftrag persistieren".
            // `device` mit (11.08.2026, Besitzpruefung am `update`).
            let device = "";
            try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
            if (genId) await fetch("/api/kiss-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ update: genId, videoUrl: p.videoUrl, lang, device }) });
            else await fetch("/api/kiss-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modelId: selId, modelName: selName, videoUrl: p.videoUrl, lang, device }) });
          } catch { /**/ }
          return;
        }
        if (p?.status === "failed") { setStatus(p.error || T.statusFailed); setBusy(false); return; }
      }
      setStatus(T.statusTimeout); setBusy(false);
    } catch { setStatus(T.statusNetwork); setBusy(false); }
  };

  /**
   * DIE ANMELDE-EINLADUNG STEHT JETZT NACH DEM ERGEBNIS (Owner 12.08.2026, Architektur-
   * Abgleich §16: „Konto-Fenster raus aus dem Kaufweg"). Bis heute sprang sie VOR der
   * Bezahlung auf — genau in dem Moment, in dem er kaufen wollte: „dein eigenes Guthaben
   * und deine Videos folgen dir aufs nächste Gerät" als Begründung, bevor es überhaupt
   * etwas zum Folgen gab. Das ChatGPT-Papier nennt das Ziel „Projekt sichern": Er hat sein
   * Werk gerade gesehen — Video oder Bild ist da —, jetzt lohnt sich ein Konto wirklich.
   *
   * Dieselben Texte (KT.anmeldeTitel/anmeldeGrund, 7 Sprachen), nur der Zeitpunkt ist neu.
   * Feuert genau einmal (anmeldeSchonGesehen/anmeldeMerken bleiben die Bremse), nie bei
   * Staff oder wer schon angemeldet ist.
   */
  useEffect(() => {
    if (isStaff || angemeldet || anmeldeSchonGesehen()) return;
    if (!videoUrl && !bild) return;
    nachAnmeldeWeiter.current = false;   // es gibt nichts mehr fortzusetzen — das Ergebnis steht schon
    setAnmeldeOffen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl, bild, isStaff, angemeldet]);

  /**
   * `result_viewed` (Owner-Architektur-Abgleich 12.08.2026, §32) — eigener Effekt statt im
   * obigen mitgezaehlt, damit er auch fuer Staff/Angemeldete feuert (die Anmelde-Einladung
   * bleibt ihnen erspart, das Ergebnis sehen sie trotzdem).
   */
  const ergebnisGemeldet = useRef(false);
  useEffect(() => {
    if (ergebnisGemeldet.current || (!videoUrl && !bild)) return;
    ergebnisGemeldet.current = true;
    void logTunnelEvent("result_viewed", variant);
  }, [videoUrl, bild, variant]);

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
    if (!fotosDa || busy || mailBusy) return;
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
    /**
     * DIE ANMELDE-EINLADUNG STAND HIER BIS 12.08.2026 — VOR der Bezahlung, nach der
     * Look-Wahl. Sie ist umgezogen (Architektur-Abgleich §16, „Konto-Fenster raus aus dem
     * Kaufweg"): siehe den `useEffect` oberhalb von `generate`, der jetzt NACH dem Ergebnis
     * feuert. Der Kaufweg selbst läuft ab hier ungestört durch.
     */
    /**
     * GELIEFERT IST ABGEGOLTEN — die Kuss-Regel gilt auch hier (Owner 08.08.2026, dreimal
     * hintereinander: „wird nicht abgebucht … kein auftrag … ich habe immer noch 10,02
     * euro drauf"). Ein Einzelkauf kauft EIN Video; wer nach der Lieferung noch einmal
     * auf Generieren tippt, beginnt einen NEUEN Auftrag mit neuer Abbuchung — vorher war
     * jeder weitere Lauf gratis und kostete UNS den vollen Anbieterpreis.
     */
    const abgegolten = V.keinGratis && !isStaff && bezahlt && !!videoUrl;
    if (abgegolten) { setBezahlt(false); setVideoUrl(""); setVideoPoster(""); setErstattet(false); setErstattScharf(false); }
    if (V.keinGratis && (!bezahlt || abgegolten) && !isStaff) {
      /**
       * HIER IST DIE ADRESSE PFLICHT (Owner 16.08.2026) — der einzige Ort, an dem sie es
       * noch ist, seit Schritt 1 und das Upload-Tor sie durchlassen.
       *
       * ZUERST DAS FORMAT IM BROWSER, DANN ERST DER SERVER: Ein leeres Feld darf keine
       * Anfrage kosten und keine Wartezeit erzeugen — der Besucher soll sofort sehen, WO es
       * hakt. Deshalb springt der Blick auch ans Feld (`focus` + `scrollIntoView`): Der
       * Generieren-Knopf steht auf dem Handy oft unter dem Feld, und eine rote Zeile, die
       * ausserhalb des Bildschirms erscheint, ist dasselbe wie keine Zeile.
       */
      if (!adresseDa) {
        const e = mail.trim();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
          setMailFehler(T.mailInvalid);
          mailRef.current?.focus();
          mailRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
        if (!(await adresseVormerken(e))) { mailRef.current?.focus(); return; }
      }
      /**
       * KUSS: NUR GUTHABEN (Owner 02.08.2026). Reicht das Aufgeladene, bucht der Server
       * lautlos ab (`unlock("once")` faellt dann nie auf die 1,49-€-Kasse zurueck, weil sie
       * vorher schon abgebucht hat). Reicht es nicht, geht es direkt zur 9,99-€-Aufladung —
       * nie zur Einzel-Kasse.
       */
      /**
       * ADRESSE = KONTO, UND ZWAR JETZT (Owner 08.08.2026: „unter tigl10722@gmail.com habe
       * ich geld drauf, trotzdem musste ich bezahlen weil ich nicht angemeldet war").
       *
       * GEMESSEN: Er tippte die Adresse mit 10,01 € Guthaben ins Tor — und der Wähler ging
       * trotzdem bei 0,00 € auf. Der Effekt, der den Stand für eine frische Adresse lädt,
       * feuert erst einen Render NACH dem Tor; die Wache hier las die eingefrorene
       * Momentaufnahme (null = 0). Dieselbe Falle wie im Popup-Rückweg (Skill `bezahlung`
       * §1), dritter Fundort. Deshalb liest der Kaufklick den Stand SELBST, frisch vom
       * Server — eine Anmeldung braucht es nicht, das Guthaben hängt an der Adresse.
       */
      let stand = guthabenCents ?? 0;
      /**
       * ERST FRAGEN, OB DORT GELD LIEGT — DANN ERST ZUR KASSE (Owner 09.08.2026: „er muss
       * seine E-Mail zwei mal angeben, ein mal im Trichter, dann wird geprüft ob er Geld
       * drauf hat. Hat er, dann muss er sich anmelden. Hat er nicht, dann geht er zum
       * Stripe").
       *
       * `gesperrt` heisst: Auf DIESER Adresse liegt Guthaben, aber dieser Browser darf es
       * nicht ausgeben (Geräte-Riegel). Ihn jetzt zur Kasse zu schicken hiesse, ihn ein
       * zweites Mal für etwas zahlen zu lassen, das er schon bezahlt hat. Also führt der
       * Weg hier zur Anmeldung — und nur, wenn wirklich nichts da ist, zu Stripe.
       */
      let gesperrt = false;
      if (V.nurGuthaben && stand < videoPreisCents) {
        try {
          const frisch = await guthabenLesen(mail.trim());
          if (frisch) { stand = frisch.cents; setGuthabenCents(frisch.cents); gesperrt = frisch.gesperrt; }
        } catch { /* Server nicht erreichbar → die alte Zahl entscheidet, wie bisher */ }
      }
      if (gesperrt && !angemeldet) { nachAnmeldeWeiter.current = false; setGuthabenGesperrt(true); setAnmeldeOffen(true); return; }
      // `videoPreisCents` statt fest {once}: Lingerie kostet mehr (Owner 03.08.2026).
      if (V.nurGuthaben && stand < videoPreisCents) { setAufladeWahl(true); return; }
      /**
       * DER AUFTRAG ENTSTEHT VOR DEM GELD (08.08.2026, Owner am Handy: „Ich habe bezahlt
       * und kam wieder der Dialog mit dem kredit").
       *
       * GEMESSEN: Zwei 15-€-Geisterkassen um 13:01, beide `genId: None`. Früher legte der
       * Foto-UPLOAD den Auftrag an — der ist beim Geburtstag abgeschafft, und seitdem kam
       * auf einem frischen Gerät NIE eine Auftragsnummer zustande. Ohne sie kennt die
       * Kasse weder das Thema (rechnete 15 € statt {geburtstag}) noch den Guthaben-Weg
       * (der braucht `email && genId`): Abbuchung übersprungen, Stripe-Leiche, Wähler
       * wieder auf — mit 10,01 € auf dem Konto.
       *
       * Also: Fehlt die Nummer, wird der Auftrag HIER angelegt — mit Thema (der Preis!),
       * Look, Stimme, Empfänger und dem Standbild. `genIdFrisch` reicht die Nummer direkt
       * an `unlock` durch; der React-Zustand trüge sie erst einen Render später.
       */
      let gid = abgegolten ? "" : genId;   // die abgegoltene Nummer ist verbraucht
      if (!gid) {
        let device = "";
        try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
        const log = await fetch("/api/kiss-log", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: variant, modelId: selId, modelName: selName, device, lang,
            email: mail.trim(), empfaenger, stimme, look: tanzSetId() || (variant === "kiss" ? kissSzeneId : look), ...(zieleFragen ? { ziele, zieleFrei: zieleFrei.trim() } : {}),
            ...(customModel ? { modelImage: customModel } : {}) }),
        }).then(r => r.json()).catch(() => null);
        if (log?.id) { gid = log.id; genMerken(log.id); }
      }
      void unlock("once", gid || undefined);
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
        body: JSON.stringify({ person: photo, model: selPhoto, theme: variant === "wedding" ? "wedding" : "kiss", device, code, kleid, email: mail.trim() }),
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
            // `device` mit (11.08.2026, Besitzpruefung am `update`).
            body: JSON.stringify({ update: genId, imagePath: d.imagePath, empfaenger, device }),
          });
        } else {
          const log = await fetch("/api/kiss-log", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ theme: variant, modelId: selId, modelName: selName, device, imagePath: d.imagePath, personPath: d.personPath, empfaenger }),
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
  /* MIT NAMEN (Owner 12.08.2026: „greifen wir die emails und namen ab sofort in einer
     liste ja? Selbst wenn er nicht weiter macht?" — die Liste nahm den Namen laengst an,
     aber niemand schickte ihn; sie zeigte nur den E-Mail-Vorspann). */
  const adresseVormerken = async (e: string, name = ""): Promise<boolean> => {
    setMailBusy(true); setStatus("");
    try {
      let device = "";
      try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
      const r = await fetch("/api/kiss-claim", {
        method: "POST", headers: { "Content-Type": "application/json" },
        // `land` und `lang` reisen mit — ohne sie steht der naechste Rundbrief wieder vor
        // 49 Empfaengern, deren Sprache niemand kennt (gemessen 31.07.2026).
        body: JSON.stringify({ email: e, ...(name.trim() ? { name: name.trim() } : {}), device, genId, theme: variant, vorab: true, land, lang, consentAt: new Date().toISOString() }),
      });
      const d = await r.json().catch(() => ({}));
      // Die Absage gehoert ANS FELD, nicht in die Status-Zeile weiter unten — siehe mailFehler.
      if (!r.ok) { setMailFehler(d?.error ?? T.statusNotWork); setMailBusy(false); return false; }
      try { localStorage.setItem(MAIL_KEY, e); } catch { /**/ }
      /* Der Server hat fuer diese Adresse einen Lead-Eintrag angelegt (15.08.2026) — die
         Nummer merken, damit Upload und Kauf DENSELBEN Eintrag fuellen. */
      if (!genId && d?.genId) genMerken(String(d.genId));
      setAdresseDa(true); setFrei(true); setMailBusy(false);
      // Der Konto-Chip im Header lauscht darauf — er soll SOFORT zeigen, dass wir ihn
      // kennen, nicht erst beim naechsten Fensterwechsel (Owner 03.08.2026).
      try { window.dispatchEvent(new Event("lb-guthaben-neu")); } catch { /**/ }
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
  const anziehen = async (wen: string, look: { id: string; name?: string; imageUrl?: string } | undefined, text: string, eigenerPrompt?: string) => {
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
      fd.append("prompt", eigenerPrompt || tryonPrompt({ garment: look.name || "" }));
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
    if (videoBusy || !fotosDa) return;
    // `generation_started` (Owner-Architektur-Abgleich 12.08.2026, §32) — hier beginnt der
    // wirkliche Lauf beim Anbieter, nicht nur der Klick darauf.
    void logTunnelEvent("generation_started", variant);
    /* Lief der Startaufruf wirklich durch? Nur solange er es NICHT tat, darf der
       Startstempel zurückgenommen werden — nach einer echten Kennung rendert der Anbieter,
       auch wenn hier unten die Warteschleife stirbt (siehe `renderAbbruch`). */
    let gestartet = false;
    // `device` mit (11.08.2026, Besitzpruefung am `update`) — einmal am Anfang der Funktion
    // gelesen, damit `startStempelZurueck` und der Startaufruf weiter unten dieselbe
    // Kennung mitschicken.
    let device = "";
    try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
    const startStempelZurueck = (grund: string) => {
      /* SEIT 14.08.2026 FUER ALLE THEMEN: Bei Kuss/Tanz gab es zwar keinen Vorschuss-Stempel
         zurueckzunehmen, aber der Fehlergrund gehoert trotzdem an den Auftrag — und bei einem
         BEZAHLTEN Auftrag weckt genau diese Meldung jetzt die server-seitige Lieferkette
         (siehe renderAbbruch in /api/kiss-log). Ohne sie schlief der Wachhund bis 05:00. */
      if (gestartet || !genId) return;
      // `lang` mit (11.08.2026), siehe Aenderung „Sprache am Auftrag persistieren".
      void fetch("/api/kiss-log", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ update: genId, renderAbbruch: true, fehler: grund, lang, device }) }).catch(() => {});
    };
    setWahl(false); setVideoBusy(true); setStatus("");
    setVideoStart(Date.now()); setFortschritt(0);
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
      // Angezogen wird nur noch, was der Kunde selbst aus der Garderobe waehlt. Der
      // Lingerie-Rueckfall („nimm irgendein Dessous-Set") ist mit dem Produkt entfallen —
      // ohne Wahl laeuft gar kein FASHN-Lauf, und das Video kostet uns eine Erzeugung.
      const ihrVorlage = ihrGewaehlt;
      /**
       * ANGEZOGEN WIRD NUR EINMAL (Uebergabe 2d: „Ist der alte Auftrag verbraucht, laeuft das
       * Anziehen zweimal … kostet einen zusaetzlichen FASHN-Lauf").
       *
       * DER WEG DAHIN: Antwortet die Video-Route mit `extraNeeded` (die alte Auftragsnummer
       * ist mit ihrem einen Video abgegolten), legt der Trichter unten still einen frischen
       * Eintrag an und laesst den Zahlungs-Wachhund `kussVideo()` NEU starten — von ganz
       * vorn, also auch durch beide FASHN-Laeufe. Der Kunde sieht davon nichts; bezahlt haben
       * wir es trotzdem, zweimal.
       *
       * Die Uebergabe schlug vor, die Verbraucht-Pruefung vor das Anziehen zu ziehen. Das
       * waere ein zusaetzlicher Server-Aufruf im NORMALEN Lauf, um einen Randfall zu
       * entschaerfen. Andersherum ist es billiger und deckt mehr ab: Das Ergebnis wird
       * gemerkt, und JEDER zweite Anlauf mit denselben Zutaten nimmt es — der Randfall hier
       * genauso wie ein Wiederholen nach Netzfehler.
       *
       * Der Schluessel traegt alles, was das Ergebnis bestimmt: beide Fotos und beide
       * Kleidungsstuecke. Aendert der Kunde eines davon, passt er nicht mehr, und es wird
       * richtigerweise neu angezogen. Die Fotos gehen nur mit ihrem Ende ein — sie sind
       * data-URLs von einigen hundert Kilobyte, und ein Schluessel muss kurz sein.
       */
      const seinVorlage = looks.find(l => l.id === seinLook);
      /* Das gewaehlte Tanz-Set gehoert IN den Schluessel (15.08.2026): Sonst hielte der
         Speicher ein in Gruen angezogenes Foto fuer gueltig, nachdem sie auf Rot gewechselt
         hat — und der zweite Lauf truege wieder das erste Set. */
      const tanzSet = variant === "poledance" ? (neuerLook || V.garmentBild || "") : "";
      const anziehSchluessel = [
        selPhoto.slice(-64), photo.slice(-64), ihrVorlage?.id ?? "", seinVorlage?.id ?? "", tanzSet,
      ].join("|");
      let ihr: string, sein: string;
      /**
       * BEIM TANZ WIRD NICHT VORHER ANGEZOGEN — Pixverse macht beides in einem Zug.
       *
       * Der Fusion-Lauf bekommt zwei Referenzbilder: ihr Foto (@image1) und das Set
       * (@image2), und der Prompt sagt „wearing the outfit from @image2". Genau so ist das
       * Beispielvideo entstanden, das der Owner mitgeliefert hat.
       *
       * Ein FASHN-Lauf davor waere hier NICHT nur ueberfluessig, sondern schaedlich: Er
       * liefert ein neues Bild, dessen Gesicht schon einmal durch ein Modell gelaufen ist —
       * und Pixverse haette dann eine Kopie als Vorlage statt des Originals. Ein Lauf
       * weniger, ein Gesicht besser, und der Preis traegt sich trotzdem.
       *
       * `sein` ist hier kein Mensch, sondern das Kleidungsstueck. Der Name bleibt, weil er
       * unten die Stelle `garment` fuellt — und `garment` ist genau das, was es ist.
       */
      if (V.nurSie) {
        sein = "";   // es gibt keinen Mann — was hier stuende, waere eine Erfindung
        /**
         * FASHN ZIEHT AN, PIXVERSE FILMT (Owner 15.08.2026: „die Frau gibst du an Pixverse
         * weiter und die Wardrobe mit dem Hintergrund, dasselbe was du an FASHN gegeben hast"
         * · „dann klappt es 100 %").
         *
         * WARUM ES NICHT ANDERS GEHT: Pixverse zieht nichts aus, es legt nur an („Pixverse
         * entfernt keine Klamotten"). Das Set landete deshalb UEBER ihrem Rollkragen, und der
         * Versuch, das Umziehen in den Prompt zu schreiben, wurde vom Textfilter abgewiesen.
         * Das Anziehen muss vor Pixverse passieren — und FASHN kann genau das, im Standbild
         * am gruenen Set nachgewiesen.
         *
         * WAS AN PIXVERSE GEHT: das ANGEZOGENE Foto als `person` und dasselbe Set-Bild als
         * `garment` — es bringt ausserdem die Szene mit (Neon, Stange), weshalb der Prompt
         * ueber Kleidung nichts mehr sagen muss.
         *
         * KEIN RISIKO FUER DEN BEZAHLTEN AUFTRAG: Scheitert FASHN, gibt `anziehen` das
         * Ausgangsfoto zurueck, und es laeuft wie bisher weiter — schlechter als der alte
         * Zustand kann es nie werden.
         *
         * KOSTEN: ein FASHN-Bildaufruf zusaetzlich; der Pixverse-Lauf bleibt derselbe
         * (V6, 540p, 7 s ≈ 49 Credits).
         */
        if (variant === "poledance" && tanzSet) {
          if (angezogen.current?.schluessel === anziehSchluessel) {
            ihr = angezogen.current.ihr;
          } else {
            const s = POLEDANCE_SETS.find(x => x.bild === tanzSet);
            /**
             * FASHN SCHNEIDET SELBST AUF BRUSTBILD ZU (Owner 15.08.2026: „der Kunde schneidet
             * nicht ab, das kann man ihm nicht zumuten" — gemessen statt vermutet).
             *
             * DAS PROBLEM: Laedt jemand ein GANZKOERPERFOTO hoch, zoege FASHN den ganzen
             * Koerper in Waesche an — und so ein Bild nimmt Pixverse als Referenz nicht an.
             * Ein Zuschnitt-Schritt fuer den Kunden kam nicht in Frage, Gesichtserkennung
             * haette laufende Kosten bei jedem Upload bedeutet.
             *
             * DER TEST (15.08.2026): dasselbe Set, als Eingang ein Bild von Kopf bis
             * Oberschenkel, dazu diese Anweisung — zurueck kam ein Brustbild. FASHN haelt
             * sich also an den Bildausschnitt, den man ihm vorgibt. Damit loest sich das
             * Problem in dem Schritt, den wir ohnehin machen: kein zweiter Aufruf, keine
             * Erkennung, kein Klick fuer den Kunden, keine zusaetzlichen Kosten.
             */
            const portraet =
              "Portrait crop: show only the head, shoulders and upper chest of the person, "
              + "closely framed like a headshot. She wears the outfit from the product image. "
              + "Keep her face, hair and appearance exactly the same.";
            ihr = await anziehen(selPhoto, { id: s?.id ?? "tanz", name: s?.name, imageUrl: tanzSet }, T.dressingHer, portraet);
            if (runRef.current !== token) return;
            angezogen.current = { schluessel: anziehSchluessel, ihr, sein: "" };
          }
        } else {
          ihr = selPhoto;
        }
      } else if (angezogen.current?.schluessel === anziehSchluessel) {
        ({ ihr, sein } = angezogen.current);
      } else {
        ihr = await anziehen(selPhoto, ihrVorlage, T.dressingHer);
        if (runRef.current !== token) return;
        sein = await anziehen(photo, seinVorlage, T.gettingReady);
        if (runRef.current !== token) return;
        angezogen.current = { schluessel: anziehSchluessel, ihr, sein };
      }
      setStatus(T.renderingVideo);
      /**
       * WELCHES BILD AUF WELCHEN PLATZ — die Stelle, an der man ein Video verschenken kann.
       *
       * Die Route bindet `person` an das ERSTE @-Token des Prompts und `garment` an das
       * zweite (pixverseStartReference). Daraus folgt:
       *
       *   Kuss  — Prompt „@1 and @2 …":  @1 = ER    → person = sein
       *                                  @2 = SIE   → garment = ihr
       *   Tanz  — Prompt „The woman from @image1 … the outfit from @image2":
       *                                  @image1 = SIE     → person = ihr Foto
       *                                  @image2 = das Set → garment = das Set
       *
       * Wer die zwei beim Tanz vertauscht, bekommt ein Video, in dem ein Kleidungsstueck die
       * Hauptrolle spielt und eine erfundene Frau das Outfit traegt. Genau dieser Fehler hat
       * beim Kuss schon einmal ein bezahltes Video mit fremden Gesichtern erzeugt.
       */
      /**
       * ══ DIE NEUE KUSS-KETTE (Owner 16.08.2026) ══
       *
       * „wir müssen erst mal das paar über chatgpt schön angekleidet an einem schönen ort
       * zusammenbringen. Dann wird das an pixverse gegeben und sagen die zwei lachen, schauen
       * sich an und küssen sich. Jetzt die szene wird lieber an chatgpt gegeben, wo, ob regen,
       * terrasse … dann das motion an pixverse."
       *
       * DER GRUND IST DAS GESICHT („die gesichter müssen immer stimmen, deswegen machen wir
       * das"). Vorher bekam Pixverse ZWEI fremde Fotos und musste in einem Zug Paar, Kleidung,
       * Ort und Bewegung erfinden — vier Gelegenheiten, ein Gesicht zu verlieren, und genau
       * das ist passiert (03.08.2026: „falsche Personen im video"). Jetzt malt `gpt-image-2`
       * das Paar (es haelt Gesichter, gemessen in acht Vergleichslaeufen am 08.08.), und
       * Pixverse muss nur noch EIN fertiges Bild bewegen.
       *
       * NUR DIE KOEPFE GEHEN RAUS: `aufKopfSchneiden` schneidet mit dem Rechteck aus der
       * Sicherheitspruefung zu. Deshalb ist ein nacktes Foto kein Problem mehr, sondern eine
       * Ueberraschung (Owner: „er bekommt das video am ende, aber zu seiner überraschung, die
       * frau wird angezogen sein :)") — das Kleid kommt aus dem Prompt, nicht aus der Vorlage.
       *
       * SCHEITERT DER BILDSCHRITT, laeuft der alte Weg weiter (zwei Referenzen an Pixverse).
       * Ein bezahlter Auftrag darf nie an einem neuen Schritt sterben.
       */
      let paarBild = "";
      let fehlerBild = "";
      if (variant === "kiss") {
        setStatus(T.renderingVideo);
        try {
          const [kopfEr, kopfSie] = await Promise.all([
            aufKopfSchneiden(sein, kopfBox.current.er),
            aufKopfSchneiden(ihr, kopfBox.current.sie),
          ]);
          /**
           * MIT ZEITWACHE (Owner 18.08.2026, live: „das bild hängt und geht nicht an pixverse
           * weiter"). Ein Bildlauf braucht 30-90 Sekunden; nach zwei Minuten ist er nicht mehr
           * langsam, sondern tot. Ohne diese Wache dreht sich der Kreisel weiter, waehrend
           * niemand mehr auf etwas wartet — der Kunde hat bezahlt und sieht nichts.
           */
          const wache = new AbortController();
          const uhr = setTimeout(() => wache.abort(), 120_000);
          const p = await fetch("/api/kiss-paar-bild", {
            method: "POST", signal: wache.signal, headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ er: kopfEr, sie: kopfSie, szene: kissSzeneId, genId }),
          }).then(r => r.json()).catch(() => null).finally(() => clearTimeout(uhr));
          if (runRef.current !== token) return;
          if (p?.bild) paarBild = String(p.bild);
          else fehlerBild = String(p?.error ?? "");
        } catch (e) { fehlerBild = e instanceof Error ? e.message : "Netzwerk"; }
        /**
         * KEIN RUECKFALL AUF DEN ALTEN WEG (Owner 18.08.2026: „warum sollte er zurückfallen
         * auf den alten Weg? Den braucht niemand").
         *
         * HIER STAND EINER, und er war gut gemeint und falsch: Scheitert der Bild-Schritt,
         * gingen die zwei Fotos wie frueher direkt an Pixverse. Das liefert nicht „etwas
         * Schlechteres", sondern GENAU den Fehler, wegen dem diese Kette existiert — fremde
         * Gesichter im bezahlten Video (03.08.2026: „falsche Personen im video"). Wir haetten
         * also einen Pixverse-Lauf BEZAHLT, um dem Kunden das zu liefern, wofuer er sich
         * beschwert, und der Fehler waere in einer Konsolenzeile verschwunden.
         *
         * Stattdessen bricht der Lauf hier ehrlich ab. Was danach passiert, gibt es laengst:
         * Der Auftrag bleibt bezahlt und unerledigt, die Lieferkette am Server versucht es
         * erneut (bis zu drei bezahlte Anlaeufe), danach bekommt der Owner seine WhatsApp und
         * der Kunde den Erstattungs-Knopf. Ein Fehler, den man sieht, ist besser als ein
         * Ergebnis, das niemand wollte.
         */
        if (!paarBild) {
          setVideoBusy(false); setFortschritt(0); setWahl(true);
          setStatus(T.statusNotWork);
          startStempelZurueck(`Paar-Bild fehlgeschlagen: ${fehlerBild || "unbekannt"}`);
          return;
        }
      }
      const refPerson = V.nurSie ? ihr : sein;
      /**
       * Das Set reist als Daten-URL, nicht als Pfad — siehe `alsDatenUrl` oben. Ein
       * `/Pooldance/…`-Pfad ist nur im Browser eine Adresse; die Route kann ihn nicht holen,
       * und Pixverse lehnt den Auftrag mit „upload failed (reference images)" ab.
       */
      /* Hat er in der Galerie etwas gewaehlt, gilt DAS statt des festen Sets. */
      const refOutfit = V.nurSie ? await alsDatenUrl(neuerLook || V.garmentBild || "") : ihr;
      /**
       * EIN SCHRANK-STUECK TRAEGT KEINE SZENE (Owner 03.08.2026: „ich habe eine Wäsche gewählt
       * und hat kein Tanzvideo generiert … sie springt statt zu tanzen").
       *
       * Das Haus-Set (`poledance-set.jpg`) ist nicht nur ein Outfit: Es zeigt die Waesche VOR
       * dem Neon, mit der Stange — der Prompt muss den Ort deshalb kaum beschreiben, das Bild
       * liefert ihn. Ein Stueck aus dem Kleiderschrank ist ein freigestelltes Produktfoto auf
       * Weiss. Pixverse bekommt dann das Outfit und KEINEN Ort und erfindet eine Bewegung —
       * beim Owner ein Springen statt eines Tanzes.
       *
       * Also traegt in dem Fall der TEXT, was sonst das Bild trug. Zwei Saetze mehr, aber nur
       * dann: Beim Haus-Set bleibt der Prompt woertlich der, mit dem das Beispielvideo
       * entstanden ist — daran wird nichts angefasst.
       */
      /**
       * GEGEN DIE LEUCHTSCHRIFT (Owner-Sets „HEART LATEX" / „ELECTRIC LATEX").
       *
       * Der Grundtext bleibt woertlich der des Owners. Angehaengt wird nur der Satz, der Text
       * aus dem Bild haelt — und der gilt fuer ALLE Sets: Auch die ohne Schriftzug haben
       * Leuchtreklame im Hintergrund, die Pixverse als Buchstaben missdeuten kann.
       */
      const promptFuerLauf = poledancePromptFuerSet();
      if (runRef.current !== token) return;
      /**
       * DER GEBURTSTAG LÄUFT SEIT DEM 07.08.2026 ÜBER DIE NEUE KETTE — OpenAI-Avatar
       * (Schokotorte, festliche Kleidung) → HeyGen spricht den Namen WÖRTLICH
       * (`/api/geburtstag-video`). Pixverse hatte gesprochene Namen vermurkst (Owner:
       * „Happy Birthday you dear Anna. Das ist falsch"). Die Route gibt eine
       * `hg:`-Kennung zurück; die Poll-Schleife unten fragt unverändert dieselbe
       * Status-Route, die den Prefix kennt — auch der Nachliefer-Wachhund kann so mit.
       */
      /* Start SOFORT in den Auftrag stempeln — Galerie-Streifen und Puls-Punkt leben
         davon, und die Kennung kommt erst nach dem 1-2-minuetigen HeyGen-Look. */
      if (selbstVideo && genId) {
        // `lang` mit (11.08.2026), siehe Aenderung „Sprache am Auftrag persistieren".
        void fetch("/api/kiss-log", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ update: genId, renderStart: true, lang, device }) }).catch(() => {});
        try { window.dispatchEvent(new Event("lb-guthaben-neu")); } catch { /* weckt den Punkt */ }
      }
      /**
       * MIT ZEITWACHE UND FANGNETZ (Owner 14.08.2026, live: 15 Minuten Spinner, weil der
       * lange Start-Aufruf still starb und NIEMAND es merkte — kein Stempel, kein Fehler,
       * kein Video). 90 Sekunden sind grosszuegig fuer die Antwort der Route (sie stempelt
       * die Kennung frueh); danach gilt der Browser-Weg als tot, `timeout` laesst unten
       * die Server-Schiene uebernehmen. Ein geworfener Netzfehler faellt ins selbe Netz.
       */
      const start = selbstVideo ? await (async () => {
        const wache = new AbortController();
        const uhr = setTimeout(() => wache.abort(), 90_000);
        try {
          return await fetch("/api/geburtstag-video", {
            method: "POST", signal: wache.signal,
            headers: { "Content-Type": "application/json", ...(pin ? { "x-try-look-admin-pin": pin } : {}) },
            body: JSON.stringify({ genId, person: refPerson, name: empfaenger, stimme, look, lang,
              ...((tonspur || aufnahme) ? { audio: tonspur || aufnahme } : {}) }),
          }).then(r => r.json());
        } catch { return { timeout: true }; }
        finally { clearTimeout(uhr); }
      })() : await fetch("/api/generate-tryon-video", {
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
        /**
         * DER KUSS IST EIN BILD-ZU-VIDEO-LAUF (16.08.2026): `image` statt `person`/`garment`,
         * und der Prompt ist nur noch die BEWEGUNG. Ohne Paar-Bild kommt der Aufruf hier gar
         * nicht mehr an — der Lauf bricht vorher ab (siehe oben, „KEIN RUECKFALL"). Die zweite
         * Zeile bedient die anderen Themen: Hochzeit, Tanz, Idol.
         */
        body: paarBild ? JSON.stringify({ lookId: KISS_LOOK_ID, genId, image: paarBild, prompt: kussBewegung(kussSzene(kissSzeneId) ?? zufallsSzene(genId || mail)) })
          : JSON.stringify({ lookId: KISS_LOOK_ID, genId, person: refPerson, garment: refOutfit,
          /**
           * KEIN `mimicVideoUrl` MEHR BEIM TANZ (Owner 15.08.2026: „die Frau wird nicht in den
           * ausgewählten Klamotten generiert und die Bewegung ist zu schnell, nicht
           * slowmotion" — und zur Herkunft: „das war doch nur für Versprechen gedacht, weil
           * man nur dort ein Video als Referenz hochlädt, für die anderen bleibt es wie es
           * war").
           *
           * WAS HIER STAND (seit e6420f5, 03.08.2026) und was es anrichtete: Der Tanz schickte
           * IMMER ein Beispielvideo als Bewegungsvorlage mit. Die Route nimmt dann
           * `pixverseStartMimic` — und die Funktion kennt nur drei Dinge: Referenzvideo, ihr
           * Foto, Aufloesung. Sie bekommt WEDER `garment` (das gewaehlte Set — deshalb trug
           * sie es nie; die ganze Set-Auswahl war fuer die Erzeugung wirkungslos) NOCH den
           * Prompt aus lib/poledance.ts NOCH `slowmo`. Die Bewegung kam 1:1 aus dem
           * Referenzclip, also zu schnell. Der gute Weg (`pixverseStartReference`, mit
           * Kleidung, Prompt und Zeitlupe) lief nur, wenn Mimic SCHEITERTE.
           *
           * Ohne dieses Feld faellt der Tanz zurueck auf Fusion: ihr Foto als `person`, das
           * gewaehlte Set als `garment`, der woertliche Owner-Prompt — das Rezept, mit dem die
           * Beispielvideos entstanden sind.
           */
          /**
           * 540p BEIM TANZ (`hd`), nicht 360p.
           *
           * Die Route rendert ohne diesen Schalter in 360p — die Sparstufe fuer
           * Admin-Vorschauen, die spaeter hochgerechnet werden. Beim Kuss steht sie noch, weil
           * der Owner am 30.07.2026 sagte „ok, aber jetzt noch nicht umstellen". Beim Tanz
           * geht das nicht: Das Beispiel, das die Kundin anklickt, ist 540p, und sie zahlt
           * {tanz}. Ein sichtbar schlechteres Video als das beworbene ist kein Sparen.
           * Es kostet mehr je Lauf — eine Zeile zum Zurueckdrehen, wenn die Rechnung es sagt.
           */
          /* 10 SEKUNDEN BEIM TANZ (Owner 19.08.2026: „das pool dancing video ist zu kurz,
             das wir generieren. Es muss 10sek sein."). Ohne `sekunden` faellt die Route auf
             ihre Vorgabe von 7 zurueck (siehe generate-tryon-video/route.ts) — dieselbe
             Laenge, die Kuss/Hochzeit aus einem anderen Grund fahren (Pixverse lehnte dort
             bei 8s ab). Der Tanz hat dieses Problem nicht, seine Anfrage bat nur nie um mehr. */
          ...(variant === "poledance" ? { hd: true, sekunden: 10 } : {}),
          prompt: variant === "wedding" ? weddingPrompt(kleid)
            /* DER TANZ: der woertliche Owner-Prompt aus lib/poledance.ts — unveraendert, weil
               das Beispielvideo mit genau diesem Text entstanden ist. */
            : variant === "poledance" ? promptFuerLauf
            /* DIE GEWAEHLTE SZENE — ODER DIE UEBERRASCHUNG (Owner 12.08.2026, Schritt-2-Auftrag:
               die Kuss-Szene ist jetzt eine BEWUSSTE Wahl in Schritt 2, `kissSzeneId`). Hat er
               getippt, gewinnt `kussSzene(kissSzeneId)`; hat er nichts getippt (oder kam ueber
               den alten Dialog ohne Schritt 2), bleibt es bei `zufallsSzene()`, gezogen aus der
               Auftragsnummer (Owner 03.08.2026: „die Leute bekommen ein Zufalls-Video als
               Ueberraschung"). MIT RAHMEN, nicht roh (Owner 03.08.2026: „falsche Personen im
               video"): Der nackte Szenen-Satz enthaelt kein @-Token, also band Pixverse die zwei
               Fotos an Namen, die im Auftrag nie vorkamen — und erfand ein fremdes Paar. */
            : (variant === "kiss"
                ? kussSzeneVideoPrompt(kussSzene(kissSzeneId) ?? zufallsSzene(genId || mail))
                : holidayPrompt(szene, { kuss: false })) }),
      }).then(r => r.json());
      /**
       * DER BROWSER-WEG IST TOT — DER SERVER LIEFERT (Owner 14.08.2026: „dann muss man
       * schreiben, dass die Videogenerierung laenger dauert als gewoehnlich, wir schicken
       * das per E-Mail"). Zeitwache oder Netzfehler heisst nicht Fehlschlag: Die Zahlung
       * hat die Lieferkette laengst geweckt (Frist = JETZT bei Aufnahme-Themen), und die
       * Abbruch-Meldung hier weckt sie zusaetzlich. Der Trichter sagt den ehrlichen Satz
       * und wartet auf den AUFTRAG statt auf die tote Antwort — kommt das Video, springt
       * die Seite doch noch um; kommt es nicht binnen ~12 Minuten, bleibt der Satz stehen
       * und die Mail bringt es.
       */
      if (selbstVideo && (start as { timeout?: boolean } | null)?.timeout && genId) {
        startStempelZurueck(T.statusTimeout);
        setStatus(T.dauertLaenger);
        for (let i = 0; i < 90; i++) {
          await new Promise(r => setTimeout(r, 8000));
          const st = await fetch(`/api/kiss-video-status?genId=${encodeURIComponent(genId)}`)
            .then(r => r.json()).catch(() => null);
          if (st?.videoUrl) {
            setVideoUrl(String(st.videoUrl)); setStatus(""); setVideoBusy(false);
            try { window.dispatchEvent(new Event("lb-guthaben-neu")); } catch { /**/ }
            return;
          }
        }
        setVideoBusy(false);
        return;
      }
      if (!start?.videoId) {
        /**
         * ES RENDERT NICHTS — ALSO DARF DIE GALERIE DAS AUCH NICHT BEHAUPTEN (Owner
         * 10.08.2026: „jetzt habe eine generierung ausgelöst das gar keine generierung ist.
         * Er rändert fake").
         *
         * Oben stempelt der Browser `renderStart` VOR dem Startaufruf — richtig so, denn die
         * HeyGen-Kennung kommt erst ein bis zwei Minuten später, und bis dahin wäre der
         * Galerie-Streifen blind. Nur wurde der Stempel nie zurückgenommen, wenn der Aufruf
         * dann OHNE Kennung zurückkam (kein Guthaben, Absage des Anbieters, Netzfehler): Der
         * Auftrag stand eine volle Stunde als „Dein Video entsteht gerade" in der Galerie,
         * während in Wahrheit nichts lief. Ein Fortschrittszeichen, das lügt, ist schlimmer
         * als keines — der Kunde wartet auf etwas, das nie kommt.
         *
         * Der ECHTE Start stempelt ohnehin selbst (`videoStartAt` in `/api/geburtstag-video`,
         * Zeile 524) — hier geht also nur der Vorschuss zurück, den es nicht gab. Der Grund
         * reist mit, damit im Auftrag steht, WARUM es nicht losging.
         */
        startStempelZurueck(String(start?.error ?? ""));
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
           *
           * DIE BEDINGUNG HING AM NAMEN, NICHT AN DER EIGENSCHAFT (Owner 03.08.2026: „hier
           * ist die Generierung abgebrochen, nachdem ich ein Bild hochgeladen habe" —
           * Bildschirmfoto: 8,49 EUR Guthaben, und trotzdem oeffnete sich der Auflade-Waehler).
           *
           * GEMESSEN im Auftragsprotokoll: Sein letzter Tanz-Auftrag hatte bereits ein Video
           * (`paid=true, kind=once, videoUrl` gesetzt). Der Server antwortete also voellig
           * richtig mit `extraNeeded` — nur lief der nahtlose Weg darunter ausschliesslich
           * fuer `variant === "kiss"`. Tanz und Geburtstag fielen in den Kaufkasten und
           * verlangten Geld von jemandem, der genug hatte.
           *
           * `V.nurGuthaben` trifft genau die drei Geschenke, die aus dem Guthaben zahlen
           * (Kuss, Tanz, Geburtstag). Ein viertes bekommt den Weg damit automatisch — genau
           * dafuer steht die Eigenschaft in der Tabelle und nicht der Name hier im Code.
           */
          if (V.nurGuthaben) {
            setStatus(T.oneMoment);
            let device = "";
            try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
            const log = await fetch("/api/kiss-log", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ theme: variant, modelId: selId, modelName: selName, device, lang, email: mail.trim(), empfaenger, stimme, look, ...(zieleFragen ? { ziele, zieleFrei: zieleFrei.trim() } : {}),
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
      /* AB HIER LÄUFT ES WIRKLICH — der Anbieter hat eine Kennung vergeben. Der Startstempel
         bleibt jetzt stehen, komme was wolle: Auch wenn dieser Browser gleich stirbt, rendert
         der Auftrag weiter und der Wachhund liefert ihn. */
      gestartet = true;
      /* Das Poster aus der Antwort — die Route hat das Avatar-Bild hochgeladen; es ist das
         erste Vollbild des Videos und gehört auf die Karte, bevor jemand tippt. */
      if (start.posterUrl) setVideoPoster(String(start.posterUrl));
      if (genId) {
        void fetch("/api/kiss-log", {
          method: "POST", headers: { "Content-Type": "application/json" },
          /* `empfaenger` wandert mit in den Auftrag: Der Nachliefer-Wachhund braucht den
             Namen, wenn er den Geburtstag nach Browser-Schluss neu anstossen muss — die
             neue Kette SPRICHT ihn ja. */
          body: JSON.stringify({ update: genId, videoId: start.videoId, empfaenger, stimme, look, lang, device, ...(zieleFragen ? { ziele, zieleFrei: zieleFrei.trim() } : {}), }),
        }).catch(() => {});
      }
      /* 150 × 4 s = 10 Minuten — solange versprechen wir es dem Kunden jetzt auch
         (Owner 14.08.2026: „der user dreht durch, er muss wissen dass es bis 10 Minuten
         dauern kann"). Die alten 6 Minuten gaben auf, waehrend HeyGen noch rechnete. */
      for (let i = 0; i < 150; i++) {
        await new Promise(res => setTimeout(res, 4000));
        if (runRef.current !== token) return;
        setStatus(T.makingVideo(Math.round((i + 1) * 4)));
        const q = await fetch(`/api/generate-tryon-video?videoId=${encodeURIComponent(start.videoId)}&curatorId=${encodeURIComponent(start.curatorId || "")}`).then(r => r.json()).catch(() => null);
        if (q?.status === "done" && q.videoUrl) {
          setVideoUrl(q.videoUrl); setStatus(""); setVideoBusy(false);
          setVideosLinks(v => (typeof v === "number" ? Math.max(0, v - 1) : v));
          try { if (genId) await fetch("/api/kiss-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ update: genId, videoUrl: q.videoUrl, empfaenger, lang, device }) }); } catch { /**/ }
          return;
        }
        if (q?.status === "failed") { setStatus(q.error || T.videoFailed); setVideoBusy(false); setWahl(true); return; }
      }
      setStatus(T.statusTimeout); setVideoBusy(false); setWahl(true);
    } catch {
      /* Gestorben, BEVOR eine Kennung da war → es rendert nichts, also weg mit dem Stempel.
         Nach dem Start tut die Funktion hier nichts (`gestartet`). */
      startStempelZurueck(T.statusNetwork);
      setStatus(T.statusNetwork); setVideoBusy(false); setWahl(true);
    }
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
    if (!fotosDa) return;   // warten, bis der Speicher sie zurueckgegeben hat
    nachZahlungLiefern.current = false;
    void kussVideo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selPhoto, photo, videoUrl, videoBusy, bezahlt]);

  /**
   * DER BEHARRLICHE STARTER — der bezahlte Auftrag laeuft los, sobald er KANN.
   *
   * Owner 08.08.2026, zum dritten Mal an einem Tag: „Rendering wurde unterbrochen … dann
   * aber habe ich wieder auf weiter gedrueckt aber es wurde angenommen die generierung."
   * GEMESSEN am Auftrag 82e42de5: Aufladung 20:42:46, Abbuchung 20:43:04, Start erst
   * 20:44:08 — die 64 Sekunden dazwischen waren sein zweiter Klick.
   *
   * WARUM DER EINZELNE ANSTOSS NICHT REICHT: Nach der Rueckkehr von der Kasse laufen drei
   * Dinge nebeneinander los — das Standbild kommt aus dem Geraetespeicher zurueck, der
   * Kontostand wird frisch gelesen, und der vorige Lauf raeumt sein `videoBusy` ab. Wer in
   * DIESEM Moment einmal anklopft, trifft mit hoher Wahrscheinlichkeit einen Zustand, in
   * dem `kussVideo` still zurueckkommt. Der Effekt oben ist das Netz dafuer, haengt aber an
   * einer Zustands-AENDERUNG: War das Standbild schon da, aendert sich nichts mehr, und
   * niemand ruft je wieder.
   *
   * Also klopft der Starter nach — eine halbe Minute lang, alle 400 ms, und hoert sofort
   * auf, sobald es gelaufen ist. Das ist gefahrlos: `kussVideo` hat seine eigenen Waechter
   * (`videoBusy`, `fotosDa`), und der Auftrag ist serverseitig idempotent.
   */
  const fotosDaRef = useRef(false);
  const videoBusyRef = useRef(false);
  const videoUrlRef = useRef("");
  useEffect(() => { fotosDaRef.current = fotosDa; }, [fotosDa]);
  useEffect(() => { videoBusyRef.current = videoBusy; }, [videoBusy]);
  useEffect(() => { videoUrlRef.current = videoUrl; }, [videoUrl]);

  const bezahltenAuftragStarten = () => {
    let versuche = 0;
    const klopfen = () => {
      if (videoUrlRef.current || videoBusyRef.current) return;   // laeuft schon oder ist fertig
      if (fotosDaRef.current) { nachZahlungLiefern.current = false; void kussVideo(); return; }
      if (++versuche > 75) return;                                // ~30 s, dann uebernimmt der Server
      setTimeout(klopfen, 400);
    };
    klopfen();
  };

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
    // `device` mit (11.08.2026, Besitzpruefung am `update`).
    let device = "";
    try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
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
          try { if (genId) await fetch("/api/kiss-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ update: genId, videoUrl: p.videoUrl, lang, device }) }); } catch { /**/ }
          return;
        }
        if (p?.status === "failed") { setStatus(p.error || "Das Video ist fehlgeschlagen."); setVideoBusy(false); return; }
      }
      /* Nach 10 Minuten KEIN Fehlerton bei bezahlten Aufnahme-Auftraegen: Der Server
         liefert weiter (Selbstheiler, Cron) und die Mail bringt das Video — der Satz sagt
         genau das, statt „Zeitueberschreitung" zu rufen und Panik zu machen. */
      if (selbstVideo && genId) { setStatus(T.dauertLaenger); setVideoBusy(false); }
      else { setStatus(T.statusTimeout); setVideoBusy(false); }
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
  /**
   * WAS HAT DIE AUFLADUNG UNTERBROCHEN? (Owner 07.08.2026: „ich habe bezahlt und nach der
   * bezahlung verschfindet strpefenster und bleibt credit auswahl" — mit 60 € auf dem Konto,
   * es lag also NICHT am Betrag.)
   *
   * GEMESSEN: Der Popup-Weg rief nach jeder Aufladung `unlock("once")` — einen Kauf fuer
   * eine Auftragsnummer, die es an dieser Stelle noch gar nicht gibt. Unterbrochen wurde
   * naemlich `generate()`: Der Waehler geht dort auf, BEVOR ein Auftrag entsteht. Der Server
   * fand keinen Auftrag, antwortete mit einer Kasse statt „bezahlt" — und der Zweig darunter
   * machte denselben Waehler wieder auf. Bezahlt, nichts passiert.
   *
   * Genau das verbietet Skill `bezahlung` §1: „Der Waehler muss sich merken, WELCHEN Kauf er
   * unterbrochen hat … nicht ein nacktes `bezahlen` ins Leere." Die Entscheidung steht
   * deshalb EINMAL hier und wird von beiden Rueckwegen benutzt (Popup wie Seiten-Rueckkehr),
   * sonst laufen die zwei Fassungen beim naechsten Umbau auseinander.
   */
  const nachAufladungWeiter = () => {
    /* Kein Bild? Dann wollte er eines — erzeugen. Liegt schon eines da, wollte er das VIDEO. */
    if (!bild) { void generate(); return; }
    if (!genId) return;
    void unlock("once");
  };

  const unlock = async (einmal: "once" | "abo" | "extra" | "auflade" = "abo", genIdFrisch?: string, topupCents?: number) => {
    // Derselbe Fehler wie bei `generate`: Das Ereignis stand vor jeder Pruefung und meldete
    // den Tipp, nicht die Kasse. `checkout_tap` = er wollte, `checkout` = Stripe ist offen.
    track("checkout_tap");
    if (payBusy) return;
    // `checkout_started` (Owner-Architektur-Abgleich 12.08.2026, §32) — derselbe Moment wie
    // `checkout_tap`, nur unter dem normierten Namen fuers produktuebergreifende Insights.
    void logTunnelEvent("checkout_started", variant);
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
    /**
     * KEIN KASSEN-POPUP MEHR (Owner 15.08.2026: „mir stinkt es mit stripe pop up fenster").
     *
     * Das leere Fenster war eine Notloesung gegen Popup-Blocker — und hat sich zum Problem
     * ausgewachsen: In der Facebook-WebView stapelt es eine zweite Ebene ueber die Seite,
     * aus der der Kunde oft nicht zurueckfindet; gemessen wurde dort 11-mal eine Kasse
     * geoeffnet und NIE bezahlt. Ab jetzt geht die Kasse in DERSELBEN Registerkarte auf
     * (`kasseOeffnen`), und die Rueckkehr faengt der bestehende `cs`-Weg auf.
     *
     * `popup` bleibt als Variable stehen, damit die `popup?.close()`-Aufrufe weiter
     * harmlos durchlaufen — sie schliessen jetzt nichts mehr, weil nichts mehr aufgeht.
     */
    const popup = kassenFenster();
    try {
      const start = await fetch("/api/kiss-video-checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, genId: genIdFrisch ?? genId, once: einmal === "once", extra: einmal === "extra", aufladen: einmal === "auflade", topupCents, email: mail.trim(), device: (() => { try { return localStorage.getItem("lb_visitor") ?? ""; } catch { return ""; } })(),
              /* Angemeldet = geprüfte Adresse → Stripe bekommt sie gesperrt mit. Als Gast
                 bleibt das Feld dort offen, damit er sich korrigieren kann (09.08.2026). */
              /* Nur MIT Zustimmung meldet der Server den Kauf an Metas Conversions API. */
              einwilligung: darfMessen(),
              /* Kasse IN der Seite anfordern, wenn der oeffentliche Stripe-Schluessel da ist.
                 Fehlt er, liefert die Route wie bisher eine Adresse (15.08.2026). */
              eingebettet: kasse.anfordern,
              /* Die Kasse spricht die Sprache der Seite, nicht die des Browsers. */
              lang,
              konto: !!getStoredAuthSession()?.access_token, subId: new URLSearchParams(window.location.search).get("s") || "", returnTo: (() => {
        /* OHNE ALTE KASSEN-KRUEMEL (Owner 03.08.2026: „nach der Bezahlung kam ich auf
           ?cancelled=1 statt weiter zu machen"). Ein frueherer Abbruch hinterliess
           cancelled=1 in der Adresse; als Ruecksprungziel weitergereicht, stand nach der
           ERFOLGREICHEN Zahlung wieder „abgebrochen" in der Zeile. */
        const q = new URLSearchParams(window.location.search);
        for (const k of ["cancelled", "paid", "topup", "cs", "extra"]) q.delete(k);
        const rest = q.toString();
        return window.location.pathname + (rest ? `?${rest}` : "");
      })() }) }).then(r => r.json());
      /**
       * VOM GUTHABEN BEZAHLT (Owner 01.08.2026): Der Server hat abgebucht, gestempelt und die
       * Lieferung vorgemerkt — hier ist die Zahlung damit BESTÄTIGT, ohne Kasse, ohne Fenster.
       * Derselbe Weg wie nach einer Stripe-Zahlung: Auftrag laeuft von selbst los.
       */
      if (start?.walletPaid) {
        try { popup?.close(); } catch { /**/ }   // das leere Fenster wurde nie gebraucht
        track("checkout");
        void logTunnelEvent("payment_completed", variant, { via: "wallet" });
        setGuthabenCents(typeof start.rest === "number" ? start.rest : null);
        try { window.dispatchEvent(new Event("lb-guthaben-neu")); } catch { /**/ }
        setPayBusy(false);
        setBezahlt(true);
        if (start.programUrl) setProgramUrl(String(start.programUrl));
        /**
         * SOFORT LIEFERN, AUCH BEI OFFENEM DIALOG (Owner 03.08.2026: „direkt generieren
         * wenn ich auf den Button klicke"). Das alte `!stufenOffen` stammt aus der Zeit, als
         * die Auswahl NACH der Zahlung kam — heute waehlt er Szene und Waesche VOR dem
         * Klick; nach der Abbuchung noch einmal denselben Knopf zu verlangen, ist die eine
         * Huerde zu viel, an der Leute aussteigen.
         */
        nachZahlungLiefern.current = true;
        /**
         * UND SOFORT SELBST ANSTOSSEN (Owner 08.08.2026, dreimal in Folge: „die generierung
         * bricht nach zahlung ab dann muss ich noch mal neu generieren, aber dann gehts").
         *
         * GEMESSEN am Auftrag 52f1b4a1: angelegt und bezahlt um 14:04:43, Video-Start erst
         * um 14:06:30 — die 107 Sekunden dazwischen waren sein zweiter Klick. Der Anstoss
         * hing allein am Effekt-Wachhund unten, und der feuert nur, wenn sich eine seiner
         * Abhaengigkeiten aendert UND die Marke im richtigen Augenblick gesetzt ist. Ein
         * Rennen, das man nicht gewinnen muss: `kussVideo` hat seine eigenen Waechter
         * (`videoBusy`, `fotosDa`) und darf gefahrlos direkt gerufen werden. Der Wachhund
         * bleibt als Netz stehen — er greift, wenn die Fotos erst spaeter zurueckkommen.
         */
        bezahltenAuftragStarten();
        return;
      }
      /**
       * DIE ALTE NUMMER IST ABGEGOLTEN (Owner 08.08.2026: „es wurde auch nichts abgebucht").
       * Der Server antwortet `extraNeeded`, wenn dieser Auftrag sein Video schon hat — die
       * Trichter-Regel „geliefert = abgegolten" lebte bisher nur im Browser und war nach
       * einem Neuladen weg. Also hier dasselbe wie im Video-Zweig: frischer Auftrag,
       * frische Abbuchung, ein Klick aussen.
       */
      if (start?.extraNeeded) {
        try { popup?.close(); } catch { /**/ }
        let device = "";
        try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
        const log = await fetch("/api/kiss-log", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: variant, modelId: selId, modelName: selName, device, lang,
            email: mail.trim(), empfaenger, stimme, look: tanzSetId() || (variant === "kiss" ? kissSzeneId : look), ...(zieleFragen ? { ziele, zieleFrei: zieleFrei.trim() } : {}),
            ...(customModel ? { modelImage: customModel } : {}) }),
        }).then(r => r.json()).catch(() => null);
        setPayBusy(false);
        if (log?.id) {
          genMerken(log.id);
          setBezahlt(false); setVideoUrl(""); setVideoPoster("");
          void unlock("once", log.id);
          return;
        }
        setStatus(T.statusCouldNotStart); return;
      }
      /* DIE EINGEBETTETE KASSE HAT KEINE `url` (15.08.2026, an „Start nicht möglich."
         im laufenden Trichter abgelesen). Stripe liefert dort statt einer Adresse ein
         `clientSecret` — die alte Pruefung hielt eine voellig gesunde Sitzung fuer einen
         Fehlschlag und brach ab. Gut ist die Sitzung, wenn EINES von beiden da ist. */
      if ((!start?.url && !start?.clientSecret) || !start?.sessionId) {
        try { popup?.close(); } catch { /**/ }
        setStatus(start?.error || T.statusCouldNotStart); setPayBusy(false); return;
      }
      /**
       * NUR-GUTHABEN-THEMEN KENNEN KEIN EINZEL-STRIPE (Owner 02.08.2026: „kein Einzel-Stripe
       * wie bei Hochzeit"; Frage 03.08.: „und wenn Konto nicht ausreicht?"). Scheitert die
       * Abbuchung serverseitig (Anzeige war veraltet, Rest zu klein), schickte die Kasse
       * bisher still das alte 1,49-€-Fenster — der eine Weg, den es beim Kuss nicht geben
       * soll. Stattdessen: Wahl-Dialog auf, nachladen, und der Rest verrechnet sich.
       */
      if (einmal === "once" && V.nurGuthaben && !isStaff) {
        try { popup?.close(); } catch { /**/ }
        /**
         * NIE WORTLOS DENSELBEN DIALOG WIEDER AUFMACHEN (Owner 07.08.2026: „ich habe bezahlt
         * und nach der bezahlung … bleibt credit auswahl").
         *
         * Kommt man hier NACH einer Aufladung an, hat der Kunde gerade echtes Geld gezahlt
         * und sieht denselben Wähler erneut — ohne ein Wort, warum. Die Leiter bietet seit
         * heute nur noch deckende Beträge an, damit das gar nicht passieren kann; sollte es
         * doch (veralteter Kontostand, zwei Käufe gleichzeitig), sagt die Zeile darüber
         * wenigstens, dass es am Guthaben liegt.
         */
        setPayBusy(false);
        setStatus(fillPrices(T.aufladenHinweis, lang));
        setAufladeWahl(true); return;
      }
      // Die Kasse ist wirklich da — vorher war jeder Fehlschlag als „zur Kasse" gezaehlt.
      track("checkout");
      /**
       * DIE KASSE IN DER SEITE (Owner 15.08.2026: „wir müssen das in die seite einbauen").
       * Liefert Stripe ein `client_secret`, rendert `KasseImFenster` das Formular hier —
       * kein Fenster, kein Seitenwechsel. Die Rueckkehr laeuft unveraendert ueber `cs`.
       */
      if (kasse.uebernehmen(start.clientSecret)) { setPayBusy(false); return; }
      // Popup blockiert → gleiche Seite. Lieber ein Seitenwechsel als eine tote Warteschleife.
      /* NIE IN DER FB-APP BEZAHLEN (15.08.2026) — auf Android schickt `kasseOeffnen`
         den Kunden mit der Stripe-Adresse nach Chrome. Siehe lib/browser-erkennen.ts. */
      if (kasseOeffnen(popup, start.url) !== "popup" || !popup) return;
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
            if (s.gutgeschrieben === 0) setAufladeNull(true);   // 100-%-Code: bezahlt, aber 0 € wert
            /**
             * HIER FEUERT KEIN `Purchase` (15.08.2026). Die Aufladung ist kein Kauf — sie
             * legt nur Geld in die Geldboerse. Gekauft wird erst das Video, das gleich
             * danach vom frischen Guthaben bezahlt wird; DORT meldet `logTunnelEvent
             * ("payment_completed")` den Kauf. Vorher zaehlte Meta beides: die Aufladung
             * UND das Video — ein Kunde, zwei Kaeufe. Die Anzeigenauslieferung lernte
             * damit auf einer doppelt gezaehlten Zahl.
             */
            /**
             * NICHT DIREKT WEITERKAUFEN (Owner 07.08.2026: „wieso ist die generierung
             * unterbrochen?" — Chip 5,00 €, und trotzdem stand der Wähler wieder da).
             *
             * GEMESSEN: `nachAufladungWeiter()` lief hier SYNCHRON — aus der Closure dieses
             * Polls, in der `guthabenCents` noch die Momentaufnahme von VOR der Aufladung
             * ist (0,02 €). Der Wächter in `generate()` las die alte Zahl, hielt das Konto
             * für leer und öffnete den Wähler erneut — dessen rote Zeile dann mit dem
             * FRISCHEN Stand „5 €" gezeichnet wurde: Der Dialog widersprach sich selbst.
             * Genau die Falle aus Skill `bezahlung` §1 („eingefrorene Momentaufnahme") —
             * dort für die Seiten-Rückkehr gelöst, hier im Popup-Weg übersehen.
             *
             * Der Seiten-Rückweg macht es längst richtig: Marke setzen, Stand schreiben,
             * und der Effekt hinter `unlock` (nachAufladungKaufen) kauft mit der Closure
             * des NÄCHSTEN Renders — die den frischen Stand trägt. Denselben Weg nimmt
             * jetzt auch das Popup.
             *
             * NUR wenn sich der Stand wirklich ÄNDERT: Ein gleicher Wert löst keinen
             * Render aus (React), der Effekt feuerte nie — der Kauf bliebe wortlos stehen.
             * Ist der Stand gleich (0-€-Code) oder fehlt die Zahl, stimmt die eingefrorene
             * Momentaufnahme aber ohnehin, und der Direktaufruf entscheidet richtig: Er
             * öffnet den Wähler, jetzt mit der roten aufladungNull-Zeile.
             */
            if (typeof s.walletCents === "number" && s.walletCents !== guthabenCents) {
              nachAufladungKaufen.current = true;
              setGuthabenCents(s.walletCents);
            } else {
              nachAufladungWeiter();
            }
            return;
          }
          // BEZAHLT → AUSSUCHEN, nicht sofort rendern (Owner 30.07.2026: „Na gut und jetzt?
          // Wann kann er sich die Klamotten und die Szene auswaehlen?"). Vorher lief hier
          // direkt das alte Rendern des Standbildes los — die Auswahl bekam er nie zu sehen,
          // egal ob er ueber das Kassen-Fenster oder ueber die Rueckleitung kam.
          void logTunnelEvent("payment_completed", variant, { via: "stripe", eventId: String(start.sessionId) });
          setBezahlt(true);
          if (s.programUrl) setProgramUrl(String(s.programUrl));
          // Auswahl ist seit 03.08.2026 VOR der Kasse (Szene + Waesche am Schritt 3) —
          // also nach der Zahlung immer sofort liefern, Dialog offen oder nicht.
          if (einmal === "once") nachZahlungLiefern.current = true;
          else if (!stufenOffen) nachZahlungLiefern.current = true;
          /* Nicht nur die Marke setzen und hoffen, dass sich noch ein Zustand aendert —
             nachklopfen, bis es laeuft (siehe `bezahltenAuftragStarten`). */
          if (nachZahlungLiefern.current) bezahltenAuftragStarten();
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
    /**
     * AUCH AUF DIE FOTOS WARTEN (Owner 03.08.2026: „jetzt ist die Generierung weg und es
     * kommt die Landingpage"). Nach der Kassen-Rueckkehr laedt die Seite neu; die Fotos
     * kommen ERST DANACH aus dem Geraetespeicher zurueck. Der Effekt feuerte vorher schon
     * auf die Adresse hin, `generate()` brach ohne Fotos still ab — und weil die Marke
     * dabei schon verbraucht war, blieb die Kette fuer immer tot. Erst wenn ALLES da ist,
     * wird die Marke verbraucht.
     */
    if (!fotosDa) return;
    nachAufladungKaufen.current = false;
    /**
     * WOFUER hat er aufgeladen? Hat er noch KEIN Bild, wollte er eins (Kuss ab dem zweiten
     * Versuch, oder die Hochzeit, die von Anfang an kostet) — dann erzeugen. Liegt schon ein
     * Bild da, wollte er das VIDEO. Zwei Wege, eine Rueckkehr.
     */
    nachAufladungWeiter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genId, mail, guthabenCents, bild, selPhoto, photo]);

  /**
   * Der Sekundenzeiger hinter der Prozentzahl. Eigener Takt statt des Polls: Der fragt nur
   * alle vier Sekunden, und eine Zahl, die in Viererspruengen huepft, sieht kaputter aus als
   * gar keine. `1 - e^(-t/τ)` mit τ = halbe Erwartung heisst: nach der erwarteten Dauer stehen
   * rund 86 %, danach kriecht es gegen den Deckel.
   */
  useEffect(() => {
    if (!videoBusy || !videoStart) return;
    // Ein Pixverse-Lauf. (Solange es das Lingerie-Video gab, kam ein FASHN-Anziehen davor
    // und die Erwartung lag bei 150 s — das Produkt ist raus, die Rechnung wieder einfach.)
    const erwartetSek = 95;
    const takt = setInterval(() => {
      const sek = (Date.now() - videoStart) / 1000;
      setFortschritt(Math.min(95, Math.round(100 * (1 - Math.exp(-sek / (erwartetSek / 2))))));
    }, 1000);
    return () => clearInterval(takt);
  }, [videoBusy, videoStart]);

  /**
   * RENDERT DIE KARTE GERADE? — die eine Wahrheit fuer beide Ladeanzeigen.
   *
   * Es gab zwei: eine als Schicht ueber der Karte, eine im Ergebnisbereich darunter. Beide
   * hatten eigene, aehnliche Bedingungen und liefen beim Kuss deshalb gleichzeitig. Jetzt
   * fragt die untere diese hier — sie kann gar nicht mehr danebenliegen.
   */
  /**
   * EINE ABSAGE BLEIBT IN DER KARTE STEHEN (Owner 03.08.2026: „wieso rendert er schon wieder
   * woanders. Ich habe dir gesagt du sollst es richtig machen in der Karte").
   *
   * Bis hierher galt: Scheitert der Lauf, setzt der Trichter `wahl` auf wahr — damit faellt
   * `karteRendert` weg, die Schicht in der Karte verschwindet, und die Fehlermeldung tauchte
   * in dem geblendeten Kasten WEIT DARUNTER wieder auf. Der Kunde sah seinen bezahlten
   * Auftrag also an genau der Stelle scheitern, an der er ihn nie gestartet hat.
   *
   * Der Lauf ist vorbei (kein Spinner, keine Prozente) — aber die Karte ist die Buehne, und
   * eine Absage gehoert auf dieselbe Buehne wie das Ergebnis. Gilt nur fuer Themen ohne
   * Gratis-Bild: Dort gibt es kein zweites Bild, das die Nachricht tragen koennte.
   */
  /**
   * DER ADMIN SAH ALS EINZIGER GAR NICHTS (Owner 03.08.2026: „wo wird jetzt nach dem Kaufen
   * gerendert? Ich sehe nichts. Du hast doch schon alles beim Geburtstag und Kiss").
   *
   * Hier stand `&& !isStaff` — gedacht als Hoeflichkeit, damit der Admin die Karte unverdeckt
   * pruefen kann. In Wahrheit war es eine Falle, und zwar genau fuer den, der testet:
   *
   *   Karte:  Schicht aus, weil `!isStaff` falsch ist.
   *   Unten:  Kasten aus, weil `V.keinGratis` bei Kuss, Hochzeit und Tanz wahr ist.
   *
   * Beide Anzeigen schlossen sich also gegenseitig aus, und uebrig blieb ein Bildschirm, auf
   * dem nach dem Kauf nichts passiert. Ein Vorschau-Modus, der etwas anderes zeigt als der
   * Ernstfall, ist schlimmer als gar keiner — dieselbe Lehre wie beim Probelauf mit
   * abgefangenen Antworten.
   *
   * `isStaff` faellt hier ersatzlos weg: Der Admin sieht ab jetzt genau das, was der Kunde
   * sieht. Wer die Karte unverdeckt braucht, hat sie, sobald der Lauf vorbei ist — die Schicht
   * lebt nur waehrend `payBusy`, `videoBusy` oder der Luecke dazwischen.
   */
  const karteAbsage = !!status && bezahlt && !videoBusy && !payBusy && !videoUrl && !!V.keinGratis;
  const karteRendert = (payBusy || (bezahlt && !wahl) || videoBusy || karteAbsage) && !videoUrl;

  /**
   * DIE RENDER-SCHICHT DER KARTE — EINMAL definiert, in JEDEM Kartenzustand benutzt.
   *
   * Sie lag bisher NUR im Zweig „es gibt schon ein Bild". Beim Kuss gibt es aber gar kein
   * Gratis-Bild mehr: Waehrend sein bezahltes Video lief, zeigte die Karte unveraendert das
   * BEISPIELVIDEO mit „Personen ersetzen" — und der einzige Hinweis, dass ueberhaupt etwas
   * passiert, stand als zweiter Radar weit darunter. Genau das meinte der Owner mit „kannst
   * du nicht in der Karte oben rendern lassen und Prozente hinschreiben?".
   */
  const renderSchicht = karteRendert ? (
        /* VOLLER, RUHIGER GRUND STATT DURCHSCHEINEND (Owner 31.07.2026: „was passiert
           jetzt hier?"). Bei `bg-black/70` kaempft jeder Buchstabe gegen das Motiv
           darunter; bei 0.88 liest es sich auf jedem Bild. */
        // z-[45]: ZWISCHEN den Knoepfen der Karte und der Kopfzeile.
        //
        // Bei z-30 stachen Ton-Knopf (z-40) und Teilen-Knopf (z-30) durch die Schicht, und die
        // Prozentzahl stand zwischen fliegenden Herzen. Bei z-50 war es andersherum: Die
        // Schicht deckte die KOPFZEILE zu (TopNav liegt ebenfalls auf z-50, und bei gleichem
        // Rang gewinnt das spaetere Element im Dokument) — Guthaben, Galerie und Sprache lagen
        // dann unter einem schwarzen Schleier, waehrend das Video rechnete (Owner 03.08.2026:
        // „Loading ist ueber dem Header"). 45 ist der Wert, der beides loest.
        //
        // `data-aufmedien="1"` ist PFLICHT, nicht Zierde: Diese Schicht liegt IN der
        // Einladungskarte, und `.lb-karte p/span/…` faerbt dort alles per `!important` auf
        // dunkles Braun — Inline-Farben und `lb-onmedia` verlieren dagegen. Ohne das Attribut
        // stand die Prozentzahl in #2a231c auf 88 % Schwarz, also praktisch unsichtbar
        // (gemessen, nicht vermutet). Die Regel dazu steht in globals.css bei .lb-karte.
        <div data-aufmedien="1" className="absolute inset-0 z-[45] grid place-items-center p-5" style={{ background: "rgba(0,0,0,0.88)" }}>
          {/* DER RADAR LAEUFT MIT (Owner 31.07.2026: „Radar-Rendering muss kommen …
              es sieht so aus als würde nichts mehr kommen"). Ein stehender Text sagt
              nicht, ob etwas laeuft oder haengt. Der wandernde Balken sagt es ohne
              ein Wort — dieselbe Anzeige wie beim Gratis-Bild, damit er sie kennt. */}
          <span className="lb-scanline pointer-events-none absolute inset-x-0 h-[2px] bg-white shadow-[0_0_18px_5px_rgba(255,255,255,0.7)]" />
          <div className="relative w-full max-w-[300px] text-center">
            {/* Bei einer Absage laeuft nichts mehr — ein drehender Kreis daneben behauptete,
                es ginge weiter, und genau das haelt Leute minutenlang vor dem Schirm fest. */}
            {karteAbsage ? (
              <p className="lb-onmedia text-[16px] font-black">{T.failTitle}</p>
            ) : (<>
              <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#f6cf51]" />
              <p className="lb-onmedia mt-3 text-[16px] font-black">
                {bezahlt || videoBusy ? T.payReceived : T.payOpening}
              </p>
            </>)}
            {/* DIE PROZENTZAHL, GROSS (Owner: „Prozente hinschreiben"). Nur waehrend
                des echten Video-Laufs — waehrend der Zahlung gibt es nichts zu zaehlen,
                und eine Zahl, die dort schon liefe, wuerde einen Fortschritt behaupten,
                den es noch gar nicht gibt. */}
            {videoBusy && (
              <>
                <p className="lb-karte-prozent lb-onmedia mt-2 text-[30px] font-black leading-none tabular-nums">
                  {fortschritt} %
                </p>
                <div className="mx-auto mt-2 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-white/15">
                  <div className="h-full rounded-full bg-[#f6cf51] transition-[width] duration-1000 ease-linear"
                    style={{ width: `${fortschritt}%` }} />
                </div>
              </>
            )}
            <p className="lb-onmedia mt-2 text-[12px] font-bold opacity-85">
              {status || (bezahlt || videoBusy ? T.payMaking : T.payComplete)}
            </p>
            {/* DAS GEGENTEIL EINER WARNUNG (Owner 08.08.2026: „dann muss stehen bitte nicht
                wegklicken … aber ich hoffe das geht"). Es geht: Der Server trägt die
                Startquittung selbst in den Auftrag (geburtstag-video), der Wachhund liefert
                fertig, die Galerie zeigt den Lauf. Nur beim Geburtstag — dort ist dieser
                Weg gebaut und bewiesen; anderswo wäre der Satz ein leeres Versprechen. */}
            {selbstVideo && videoBusy && (
              <p className="lb-onmedia mt-1.5 text-[11px] font-bold opacity-70">{T.schliessenOk}</p>
            )}
            {/* EIN WEG ZURUECK, WENN DAS KASSENFENSTER ZU IST (Owner 31.07.2026: „es sieht so
                aus als würde nichts mehr kommen").
                Ohne ihn stand diese Meldung bis zu fuenf Minuten da — solange laeuft die
                Abfrage. Wer die Kasse weggeklickt hat, wartet dann vor einer Anzeige, hinter
                der wirklich nichts mehr kommt. Nur waehrend der Zahlung, NIE waehrend eines
                bezahlten Laufs: dort waere Abbrechen genau das Ausrauben, das wir gerade
                abgestellt haben. */}
            {/* NACH EINER ABSAGE: ein Knopf, kein Sackgassen-Text. Der Auftrag ist bezahlt und
                gilt weiter — `kussVideo()` startet ihn mit denselben Fotos noch einmal, ohne
                dass irgendwo neu abgebucht wird. Ohne diesen Knopf bliebe dem Kunden nur, die
                Seite neu zu laden, und dann steht er wieder am Anfang. */}
            {karteAbsage && (
              <button type="button" onClick={() => { setStatus(""); void kussVideo(); }}
                style={{ color: "#fff" }}
                className="mt-4 inline-flex items-center justify-center rounded-full border border-white/40 px-4 py-2 text-[12px] font-black transition active:scale-95">
                {T.tryAgain}
              </button>
            )}
            {payBusy && !bezahlt && !videoBusy && (
              <button type="button" onClick={() => { setPayBusy(false); setStatus(""); }}
                style={{ color: "#fff" }}
                className="mt-4 inline-flex items-center justify-center rounded-full border border-white/40 px-4 py-2 text-[12px] font-black transition active:scale-95">
                {T.back}
              </button>
            )}
            {/**
              * DER PROGRAMM-KNOPF STARTET SOFORT, NICHT ERST MIT DEM VIDEO (11.08.2026,
              * Owner: „wo ist der link zum plan?"). Genau HIER, waehrend die Karte noch
              * „bezahlt, Video entsteht" zeigt — nicht erst wenn `videoUrl` da ist: Das
              * 30-Tage-Programm braucht nicht auf den Future Film zu warten, der noch
              * rendert. `target="_self"`, denn ein neuer Tab waere fuer ein Programm, das
              * er jeden Tag oeffnen soll, die falsche Gewohnheit.
              */}
            {/* AUS DER BIBLIOTHEK (Owner 12.08.2026, siehe `Knopf href` in CI.tsx). */}
            {variant === "versprechen" && bezahlt && !!programUrl && T.programmKnopf && (
              <Knopf href={programUrl} className="mt-4">
                {T.programmKnopf}
              </Knopf>
            )}
          </div>
        </div>
  ) : null;

  /**
   * DAS AUFNAHME-VOLLBILD — EIN BAUSTEIN FUER BEIDE AUFNAHME-THEMEN (Geburtstag UND
   * Versprechen, `selbstVideo`). Bis 12.08.2026 stand diese JSX fest in Schritt 1
   * eingebaut — als der Owner den Tunnel auf zwei Schritte umbaute (KONZEPT-TUNNEL.md),
   * musste sie auch aus einer NEUEN Stelle (der Kachel in Schritt 3 des Versprechens)
   * ausloesbar sein. `nimmtAuf` ist ohnehin gemeinsamer Zustand — hier steht die Anzeige
   * dazu nur EINMAL, damit React nicht zwei Portale gleichzeitig an `document.body` haengt.
   * Referenziert wird sie an der einen Stelle im Aufnahme-Kasten weiter unten
   * (`{aufnahmeUeberlagerung}`), unabhaengig davon, welches Thema sie ausgeloest hat.
   */
  /**
   * OHNE NUMMER IM TUNNEL (Owner 12.08.2026: „wenn eine änderung [kommt] dann ist es bei
   * allen gleich"): Die Schritt-Titel tragen hartkodierte Nummern aus der Dialog-Welt
   * („3 · The kiss" ist dort Schritt 3, im Tunnel aber Position 2). Statt je Produkt
   * umzunummerieren, zeigt der Tunnel die Titel OHNE Nummer — die Fortschritts-Punkte
   * tragen die Position, und zwar bei allen gleich. Die Dialog-Trichter behalten ihre
   * Nummern unverändert.
   */
  const schrittTitel = (t: string) => (tunnelSeite ? t.replace(/^\d+\s*·\s*/, "") : t);

  const aufnahmeUeberlagerung = nimmtAuf && typeof document !== "undefined" && createPortal((
    /**
     * VOLLBILD (Owner 07.08.2026 abends: „Die Video aufname muss sich
     * fullsize öffnen"). Das 240-px-Fenster in der Karte war zum
     * Positionieren immer noch zu klein. Jetzt liegt die Aufnahme über dem
     * ganzen Bildschirm — und der SATZ steht mit im Overlay, oben: Wer
     * abliest, darf dafür nicht aus dem Vollbild müssen. Umriss und
     * 3-2-1-Vorlauf wie gehabt; der Stopp-Knopf wandert mit nach unten
     * (der in der Karte darunter liegt jetzt verdeckt und entfällt).
     * z-[98]: über den Dialogen (z-[96]), unter nichts.
     */
    /**
     * „ICH WILL DEN BUTTON START NOW IM SCREEN SEHEN" (Owner 10.08.2026).
     *
     * Er stand da — nur unterhalb dessen, was das Handy zeigt. `inset-0` misst
     * gegen den LAYOUT-Bildschirm; die Adress- und Werkzeugleiste des Browsers
     * liegt darüber und verdeckt die unteren 60 bis 100 Pixel. Genau dort sass
     * der goldene Knopf. Auf dem Rechner sieht man den Fehler nie, auf jedem
     * iPhone sofort.
     *
     * `100dvh` ist das Mass, das die Leisten MITZÄHLT und beim Ein- und
     * Ausfahren mitwandert (`100vh` tut das nicht — das ist der alte Fehler,
     * den jede Handy-Seite einmal macht). Dazu die Sicherheitszone unten für
     * die Wischleiste des iPhones. Beides zusammen: Der Knopf steht immer im
     * Bild, auf jedem Gerät.
     */
    <div className="fixed inset-0 z-[200] grid place-items-center bg-black" style={{ height: "100dvh" }}>
      {/**
        * DIE BÜHNE IST HOCHKANT — AUCH AUF DEM RECHNER (Owner 09.08.2026,
        * mit Bild eines Breitbild-Schirms: ein einzelnes Auge füllte das
        * halbe Fenster).
        *
        * Vorher lag das Kamerabild als `object-cover` über die volle
        * Breite. Auf einem Handy ist das richtig; auf 2000 Pixel Breite
        * skaliert `cover` das Hochkant-Bild der Kamera so weit, bis es die
        * Breite füllt — und schneidet dabei alles ausser einem Stück
        * Gesicht weg. Jetzt steht die Aufnahme in einer Spalte im
        * Handy-Mass; der Rest der Fläche ist ohnehin mattes Weiss.
        */}
      {/**
        * UND AUF DEM RECHNER IST DIE SPALTE EIN FENSTER, KEIN STREIFEN
        * (Owner 11.08.2026, mit Bild eines Chrome-Fensters: „kannst du eine
        * desktop version machen?").
        *
        * Die Spalte war 430 px breit und IMMER so hoch wie der Bildschirm.
        * Auf dem Handy ist das genau richtig; auf einem 1300 px hohen
        * Browserfenster ergibt es einen 430 × 1300 langen Schacht — und weil
        * das Kamerabild ihn per `object-cover` füllen muss, wird ein
        * Hochkant-Bild so weit hineingezoomt, bis nur noch ein halbes Gesicht
        * übrig ist. Genau das war auf seinem Bild zu sehen. Der Knopfblock
        * klebte dazu am unteren Rand des Schachts, also am unteren Rand des
        * Fensters, halb hinter der Wischleiste.
        *
        * Ab `sm` steht deshalb ein Handy-Fenster mitten auf der Fläche: 9:16,
        * höchstens 820 px oder 92 % der Fensterhöhe, mit Ecken. Die Breite
        * ergibt sich aus der Höhe (`w-auto`), damit das Verhältnis stimmt.
        * Unterhalb von `sm` bleibt alles, wie es ist — die Handy-Ansicht ist
        * abgenommen und wird hier nicht angefasst.
        */}
      <div className="relative mx-auto h-full w-full max-w-[430px] overflow-hidden sm:h-[min(92dvh,820px)] sm:w-auto sm:max-w-none sm:aspect-[9/16] sm:rounded-3xl">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video ref={vorschauRef} muted playsInline
          className="absolute inset-0 h-full w-full object-cover"
          style={{ transform: "scaleX(-1)" }} />
      {/**
        * DAS LOCH IM MATT-WEISSEN (Owner 08.08.2026: „Es wäre auch gut wenn
        * mein kopf nicht im kreis steht … dann matte weisse farbe, damit
        * ich mein kopf wirklich im loch positioniere").
        *
        * Ein gestrichelter Umriss ist eine Bitte; eine Maske ist eine
        * Ansage — ausserhalb des Ovals liegt mattes Weiss, drinnen ist das
        * Bild klar. Gemacht mit EINEM Schlagschatten von 9999 px: Der
        * faerbt alles ausserhalb der Ellipse, ohne zweites Element und ohne
        * `mask-image` (das ältere iOS-Safaris nicht sauber koennen).
        */}
      <div aria-hidden
        className="pointer-events-none absolute left-1/2 top-[14%] h-[58%] w-[80%] max-w-[420px] -translate-x-1/2 rounded-[50%] border-2 border-white/80"
        /* HALB DURCHSICHTIG STATT DECKEND (Owner 09.08.2026: „die weisse
           Fläche nicht ganz weiss. 50 % transparent"). Bei 0.92 war ausserhalb
           des Ovals nichts mehr zu sehen — man stellte sich blind hinein und
           wusste nicht, wo der eigene Körper aufhört. Bei 0.5 bleibt das Loch
           deutlich der scharfe Teil, aber man sieht sich noch. */
        style={{ boxShadow: "0 0 0 9999px rgba(255,255,255,0.5)" }} />
      {/* DIE ABLESE-VORLAGE IST RAUS (Owner 12.08.2026: „oder besser den text oben
          raus") — seit dem ChatGPT-Papier §22 sagt er FREI, was er in 30 Tagen
          verändern will (`aufHinweis3`/`aufBeispiel` unter dem Knopf); der vorgegebene
          Satz oben widersprach genau dieser Ansage und verdeckte das Bild. */}
      {/* DER AUSGANG (Bibliotheks-Baustein `Scheibe`, Hausregel: runder
          Symbol-Knopf kommt aus components/CI.tsx). Oben rechts, wo jeder
          ihn sucht — und weit weg vom Start-Knopf, damit niemand danebentippt. */}
      <div className="absolute right-3 top-3 z-10">
        <Scheibe label={SW.abbrechen} onClick={aufnahmeStopp}>
          <X className="h-5 w-5" />
        </Scheibe>
      </div>

      {/**
        * KNOPF UND ANSAGE STEHEN ZUSAMMEN UNTEN (Owner 09.08.2026: „Button
        * direkt über Nimm dich auf").
        *
        * Vorher lag der Knopf im Oval (56 %) und die Ansage am unteren Rand
        * — dazwischen klaffte eine leere Fläche, und die beiden Dinge, die
        * zusammengehören, standen am weitesten auseinander. Jetzt bilden sie
        * einen Block: erst der Knopf, direkt darunter, was zu tun ist.
        */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-6"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.75rem)" }}>
        {/**
          * ER DRUECKT AB (Owner 08.08.2026: „dann darf die aufnahme nur mit
          * button starten. Ich muss erst mal meinen Kopf platieren und mich
          * vorbereiten dann starte ich selbst"). Vorher lief ein 3-2-1 los,
          * sobald die Kamera an war — eine Vorgabe, die genau die
          * Vorbereitung wegnahm, fuer die sie gedacht war.
          */}
        {!laeuft ? (
          <>
            <button type="button" onClick={aufnahmeLos}
              className="lb-gold flex h-12 items-center justify-center gap-2 rounded-full px-7 text-[15px] font-black active:scale-95 transition">
              {/* NUR DAS VERSPRECHEN AENDERT DIE BESCHRIFTUNG (Owner-Folgeauftrag 12.08.2026,
                  ChatGPT-Papier §22: „Video aufnehmen") — `SW.los` bleibt fuer den
                  Geburtstag (das andere `selbstVideo`-Thema) unveraendert „Jetzt starten". */}
              <Mic className="h-4 w-4" /> {variant === "versprechen" && T.aufCta ? T.aufCta : SW.los}
            </button>
            {/* ABBRECHEN IST DAS KREUZ OBEN RECHTS (Owner 09.08.2026:
                „Abbrechen als Close-Button oben rechts, rund X"). Ein
                zweiter Knopf unter dem goldenen zog das Auge vom Start weg —
                und ein Ausgang gehört dorthin, wo ihn jeder sucht. */}
          </>
        ) : (
          <button type="button" onClick={aufnahmeStopp}
            className="flex h-12 items-center justify-center gap-2 rounded-full border-2 bg-white px-6 text-[15px] font-black active:scale-95 transition"
            style={{ borderColor: ABSAGE_ROT, color: "#1a160f" }}>
            <Square className="h-4 w-4" style={{ color: ABSAGE_ROT }} fill={ABSAGE_ROT} />
            {SW.stopp}{restSek ? ` · ${restSek}s` : ""}
          </button>
        )}
        {/* In Tinte, ohne Kasten — ein Hinweis am Rand, kein zweiter Block.
            NUR DAS VERSPRECHEN AENDERT TITEL/TEXT + eine zusaetzliche Beispielzeile (Owner-
            Folgeauftrag 12.08.2026, ChatGPT-Papier §22) — der Geburtstag sieht weiter
            `SW.aufTitel`/`SW.aufHinweis`, unveraendert. */}
        <div className="text-center">
          <p className="text-[13px] font-black" style={{ color: "#1a160f" }}>
            {variant === "versprechen" && T.aufTitel3 ? T.aufTitel3 : SW.aufTitel}
          </p>
          <p className="mx-auto mt-1 max-w-[330px] text-[11.5px] font-bold leading-snug" style={{ color: "#3a352d" }}>
            {variant === "versprechen" && T.aufHinweis3 ? T.aufHinweis3 : SW.aufHinweis}
          </p>
          {variant === "versprechen" && T.aufBeispiel && (
            <p className="mx-auto mt-1.5 max-w-[330px] text-[11.5px] font-black italic leading-snug" style={{ color: "#1a160f" }}>
              {T.aufBeispiel}
            </p>
          )}
        </div>
        </div>

      </div>
    </div>
  ), document.body);

  return (
    /**
     * `mt-4` STATT `mt-8` (Owner 10.08.2026: „ich will den CTA im Viewport shen").
     *
     * GEMESSEN auf 375×812: Kleinere Überschrift und knappere Kopf-Polsterung brachten den
     * Kaufknopf von 810 auf 768 px — die Unterkante lag mit 816 px trotzdem noch vier Pixel
     * ausserhalb, also weiter angeschnitten. Der Abstand zwischen Preis-Chip und Karte war
     * das letzte Stück: 32 px, für das kein Grund sprach ausser Gewohnheit. Ein halb
     * abgeschnittener Knopf sieht aus wie ein Fehler, nicht wie ein Angebot.
     *
     * Diese Karte trägt alle Themen (Kuss, Geburtstag, Hochzeit, Tanz) — eine Zeile, vier
     * Landingpages.
     *
     * `flex flex-col` NUR IM TUNNEL (15.08.2026) — damit die Video-Karte UNTER die Schritte
     * rutschen kann, ohne dass 280 Zeilen JSX umziehen muessen. Die Karte traegt dafuer
     * `order-last`; alles andere behaelt seine Reihenfolge. Ausserhalb des Tunnels bleibt es
     * ein gewoehnlicher Block, damit an den Landingpages nichts kippt.
     */
    <div className={`mt-4${tunnelSeite ? " flex flex-col" : ""}`}>
      {/* ZURUECK IN DER SPRACHZEILE, EINE REIHE (Owner 30.07.2026: „Back Button in dem Balken
          mit den Sprachen stehen" / „in einer Reihe"). `mr-auto` schiebt ihn in der
          rechtsbuendigen Zeile nach links — Zurueck links, Sprache rechts, kein zweiter
          Balken. Erst ab Schritt 2, denn von Schritt 1 fuehrt kein Weg zurueck. */}
      {/* DANEBEN DER HELL/DUNKEL-SCHALTER (Owner 30.07.2026: „mach mir bitte einen Schalter
          für light und dark version neben den Backbutton rechts"). Er steht IMMER da, auch auf
          Schritt 1 — dort trifft der Anzeigenklick auf, und genau dort entscheidet sich, ob
          ihn der schwarze Grund abschreckt. `mr-auto` sitzt auf dem jeweils linken Knopf,
          damit die Zeile eine bleibt: links Zurueck + Schalter, rechts die Sprache. */}
      {/* Der Hell/Dunkel-Schalter stand hier per Portal in der Sprachzeile. Seit dem
          06.08.2026 traegt ihn `TopNav` selbst (Owner: „der light und dark shalter muss
          immer da sein im header") — ein zweiter waere ein Doppel. */}
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
      {/**
        * DIE GUTHABEN-ZEILE IST RAUS (Owner 15.08.2026, mit Bild der Zeile: „das haben wir
        * nicht mehr").
        *
        * Sie stammt aus der Zeit, in der Guthaben der EINZIGE Weg zum Video war: Dann musste
        * der Kunde vor dem Kauf wissen, ob sein Stand reicht. Seit heute zahlt jeder direkt
        * den Preis, der auf dem Knopf steht („Keine Credits") — damit beantwortet die Zeile
        * eine Frage, die sich niemand mehr stellt, und stellt eine Huerde vor einen Kauf,
        * der keine hat.
        *
        * WER SEIN GUTHABEN SEHEN WILL, sieht es weiter: Der Chip oben im Kopf steht auf
        * jeder Seite (`GuthabenChip` in TopNav) und ist dafuer die eine Stelle.
        */}
      {/**
        * SEIN GELD LIEGT WOANDERS (Owner 03.08.2026: „mein Kontostand zeigt 0 Euro an, aber
        * ich habe Geld drauf" — angemeldet mit der einen Adresse, 8,50 € auf der anderen).
        *
        * Das ist die eine Stelle, an der ein wahres „0,00 €" schadet: Es stimmt fuer das
        * angemeldete Konto und ist trotzdem das Gegenteil der Lage. Wer das liest, laedt ein
        * zweites Mal auf — fuer Geld, das er schon hat.
        *
        * UMGEBUCHT WIRD NICHTS: Ein Browser, der eine Adresse behauptet, ist kein Nachweis,
        * dass sie ihm gehoert. Der Weg zurueck ist das Abmelden — dann gilt wieder die
        * Adresse aus dem Geraet, und das Guthaben ist da, wo er es erwartet.
        */}
      {gestrandet && !isStaff && (
        <div className="mx-auto mb-2 max-w-[360px] rounded-lg border border-[#e0794a]/40 bg-[#e0794a]/10 px-3 py-2 text-center">
          <p className="text-[11.5px] font-bold leading-snug text-[#e0794a]">
            {T.gestrandet(
              gestrandet.cents > 0
                ? `${(gestrandet.cents / 100).toFixed(2).replace(".", ",")} €`
                : `${gestrandet.links} 🎬`,
              gestrandet.adresse,
            )}
          </p>
          <button type="button" onClick={() => void abmelden()}
            className="mt-1.5 rounded-full border border-[#e0794a]/50 px-3 py-1 text-[11px] font-black text-[#e0794a] transition active:scale-95">
            {T.gestrandetCta}
          </button>
        </div>
      )}
      {V.abo && typeof videosLinks === "number" && (aboAktiv || videosLinks > 0) && (
        <p className="mb-2 text-center text-[11px] font-bold text-[#f6cf51]">
          {/* Altbestand groesser als die Abo-Menge (z. B. Seed-Konten): „8083 von 20"
              waere gelogen — dann nur die nackte Zahl. */}
          {videosLinks > INCLUDED_VIDEOS_PER_MONTH
            ? `${videosLinks} 🎬`
            : T.aboAktiv(videosLinks, INCLUDED_VIDEOS_PER_MONTH)}
        </p>
      )}
      {/**
        * DIE VIDEO-KARTE GEHOERT IMMER IN DEN TUNNEL (Owner 15.08.2026: „auf dieser seite muss
        * der user die Video card sehen unter Weiter" · „immer in den tunel die video card").
        *
        * DAS DREHT DIE REGEL VOM 12.08. („auch in step2 raus"), unter der die Karte auf
        * Tunnel-Seiten `hidden` war, solange kein Ergebnis in ihr stand. Der Kunde sah damit
        * auf der wichtigsten Seite nie, WAS herauskommt — nur Kacheln und einen Preis.
        *
        * ES BLEIBT BEI EINER EINZIGEN KARTE (Hausregeln `karten-fuer-videos` und
        * `landingpage-video-ist-kachel-video`): dieselbe `EinladungKarte` wie auf der
        * Landingpage, gefuellt mit demselben Beispielvideo — Titel oben, „made by
        * luxurybandit.com" unten, Ton-Schalter. Keine zweite Karte, kein zweiter Spieler.
        *
        * IHR PLATZ HAENGT DARAN, OB SCHON ETWAS DRIN STEHT:
        *   leer      → `order-last`, also UNTER die Schritte (Owner: „unter Weiter"). Der
        *               Kaufknopf bleibt damit im Viewport (Regel `cta-im-viewport-template`).
        *   Ergebnis  → an ihren alten Platz ganz oben; das bezahlte Werk steht nicht unter
        *               einem Formular, das der Kunde schon hinter sich hat.
        */}
      <div ref={karteRef}
        className={tunnelSeite && !bild && !videoUrl && !teaser ? "order-last mt-6" : ""}>
      <EinladungKarte
        sprache={lang} sie="" er="" demo
        /**
         * BEIM GEBURTSTAG STEHT DER GRUSS OBEN, NICHT DER SCHRITTNAME (Owner 03.08.2026:
         * „oben steht in der Karte nur ‚Happy birthday to you {Name}‘").
         *
         * Sonst trug die Karte „Your birthday video" — eine Beschreibung dessen, was man
         * gekauft hat. Das Geburtstagskind bekommt aber kein Produkt, es bekommt einen Gruss.
         */
        /* KEIN SCHRITTNAME MEHR ALS KARTENTITEL (Owner 05.08.2026: „ganz trocken ‚The
           Kiss'"). `karteTitel` adressiert die Karte an den Menschen, für den sie ist —
           genau wie es der Geburtstag seit dem 03.08. macht. */
        titel={variant === "versprechen"
          ? T.filmTitel
          : variant === "birthday"
          ? geburtstagTitel(empfaenger)
          : T.karteTitel(empfaenger.trim())}
        /**
         * DIE HERKUNFTSZEILE GEHOERT AUF JEDE KARTE (Owner 03.08.2026: „ich bitte dich,
         * benutze IMMER die Cards für die Videos mit Titel oben und Made by
         * Luxurybandit.com").
         *
         * Sie stand bisher nur auf der Werk-Seite, die der EMPFAENGER oeffnet — hier, wo der
         * Kunde sein eigenes Ergebnis sieht und es weiterschickt, fehlte sie. Dabei ist das
         * die Karte, von der Bildschirmfotos gemacht werden.
         *
         * KEINE INLINE-FARBE: `.lb-karte` faerbt per `!important` alles auf dunkles Braun und
         * schlaegt jedes `style`. Nur eine `lb-karte-*`-Klasse kommt dagegen an — genau daran
         * ist am 03.08. schon einmal eine Prozentzahl unsichtbar geworden.
         */
        fuss={<MadeBy karte />}
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
              {/**
                * UNSERE MUSIK, UND SIE LAEUFT VON SELBST (Owner 03.08.2026: „es laeuft die
                * Original-Musik und das ist schlecht. Ich will unsere Musik und die soll dann
                * automatisch an sein").
                *
                * Zwei Fehler steckten hier: Ohne `musik` nahm der Baustein seinen Standard —
                * den HOCHZEITS-Ton, unter einem Kussvideo. Und ohne `tonAutomatisch` blieb er
                * stumm, bis jemand den Lautsprecher fand. Die Tonspur des Videos selbst
                * bleibt stumm (siehe lib/musik.ts): Sie ist acht Sekunden lang und saesse bei
                * jeder Schleife wieder auf dem ersten Takt.
                */}
              {/* Die drei Symbole setzt die Karte selbst (Skill `card`): Vergroessern links,
                  Ton rechts, Teilen darunter. Der Teilen-Knopf stand hier von Hand links
                  oben — eine von sechs solchen Stellen. */}
              <EinladungAnsicht id="" videoUrl={videoUrl} poster={videoPoster || undefined} zaehlen={false}
                {...(karteVerhaeltnis ? { verhaeltnis: karteVerhaeltnis } : {})}
                {...(eigenerTon ? { originalton: true, schleife: false, musik: "" } : { musik: V.musik, tonAutomatisch: true })}
                tonText={(KARTE_TEXTE[lang] ?? KARTE_TEXTE.en).ton}
                tonAusText={(KARTE_TEXTE[lang] ?? KARTE_TEXTE.en).tonAus}
                grossText={(KARTE_TEXTE[lang] ?? KARTE_TEXTE.en).gross}
                kleinText={(KARTE_TEXTE[lang] ?? KARTE_TEXTE.en).klein}
                teilen={genId ? (
                  /* Mit `genId` gibt es eine Werk-Seite — dann fragt der Knopf erst, WAS
                     verschickt wird (Link oder Datei), statt es zu erraten. */
                  <button type="button" onClick={() => setShareFrage(true)}
                    aria-label={(KARTE_TEXTE[lang] ?? KARTE_TEXTE.en).teilen}
                    style={{ background: "#fff", color: "#1a160f", boxShadow: "0 2px 10px rgba(0,0,0,0.35)" }}
                    className="grid h-10 w-10 place-items-center rounded-full transition active:scale-90">
                    <Send className="h-5 w-5" />
                  </button>
                ) : (
                  <TeilenKnopf rund datei={videoUrl} dateiName={variant}
                    text={teilenText(variant, lang)}
                    label={(KARTE_TEXTE[lang] ?? KARTE_TEXTE.en).teilen}
                    kopiertLabel={(KARTE_TEXTE[lang] ?? KARTE_TEXTE.en).zusDanke} />
                )} />
              <Reaktionen variant={variant} lang={lang} name={empfaenger} />
              {/* HIER STAND „Herunterladen" EIN ZWEITES MAL (Owner 03.08.2026: „Download steht
                  schon unten").

                  Er lag QUER UEBER dem fertigen Video und verdeckte dessen unteres Viertel —
                  genau die Stelle, auf die der Kunde schaut, wenn er sein Ergebnis zum ersten
                  Mal sieht. Derselbe Knopf steht wenige Zentimeter tiefer noch einmal, dort wo
                  er hingehoert: UNTER der Karte, nicht auf ihr. Die Karte ist das Geschenk;
                  ein Knopf darauf ist wie ein Preisschild darauf. */}
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
              {(frei || isStaff) && !payBusy && !videoBusy && !bezahlt && <Reaktionen variant={variant} lang={lang} name={empfaenger} />}

              {/* DIE GESPIELTE RENDER-SHOW IST RAUS (Owner 31.07.2026: „ohne diesen Fake").
                  Sie stammte aus der Zeit, in der es vor der Kasse NICHTS zu sehen gab —
                  vier Sekunden Schauspiel als Ersatz fuer ein Ergebnis. Heute liegt sein
                  fertiges Bild darunter; die Spannung ist echt und braucht kein Vorspiel.
                  Was blieb, ist die Anzeige fuer das, was wirklich rechnet (unten). */}

              {/* BEZAHLT ODER AUF DEM WEG DORTHIN — niemals wieder die Kasse zeigen.
                  Owner 30.07.2026: „schon wieder springt er vom Stripe zurück zum Zahlen."
                  Waehrend Zahlung und Rendern steht hier, was gerade passiert. */}
              {renderSchicht}

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
                    text={teilenText(variant, lang)}
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
                  { text: kartenAufruf, tun: schritteOeffnen },
                )}
            </div>
          ) : beispiele.length ? (
            <div className="relative">
              {/* DIE TONSPUR DES THEMAS, nicht die Vorgabe (03.08.2026). Hier fehlte der
                  Parameter, also lief unter JEDEM Beispiel das ruhige Hochzeitsstueck — auch
                  unter einem Tanz im Neonclub. `V.musik` steht in lib/geschenke je Geschenk;
                  ohne Eintrag bleibt es bei der bisherigen Vorgabe, es aendert sich also
                  nichts fuer die Themen, die keine eigene Spur haben. */}
              {/* JEDES BEISPIEL EINE FOLIE — bei nur einem gibt `KartenKarussell` es
                  unveraendert zurueck, ohne Bahn und ohne Punkte.
                  DIE HERZCHEN LIEGEN IN DER FOLIE, nicht ueber der ganzen Karte (Owner
                  06.08.2026, mit Bild: „hier sammeln sich die Icons und Schrift. Das
                  stört."): Als Karten-Ebene flogen sie ueber Punkte, Kaufknopf und
                  made-by-Zeile — genau ueber die Bedienung. In der Folie decken sie exakt
                  das Video und nichts darunter.
                  KEIN VIDEO MEHR HIER (siehe `beispielOffen` oben): Nur noch das Poster, eine
                  Play-Scheibe und die Herzchen — alles rein dekorativ, kein Dekoder. Ein Tipp
                  irgendwo auf der Folie oeffnet dieselbe Folie als eigene Seite. */}
              <KartenKarussell onAktiv={setBeispielVorn} folien={beispiele.map((url, i) => (
              <div key={i} className="relative">
                <button type="button" onClick={() => setBeispielOffen(i)}
                  aria-label={(KARTE_TEXTE[lang] ?? KARTE_TEXTE.en).gross || "Vorlage ansehen"}
                  className={`relative block w-full overflow-hidden rounded-[14px] ${karteVerhaeltnis || "aspect-[3/4]"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={posterZu(url)} alt="" loading="lazy" className="h-full w-full object-cover" />
                  <span className="absolute inset-0 grid place-items-center bg-black/10">
                    <span className="grid h-14 w-14 place-items-center rounded-full opacity-85 shadow-[0_2px_10px_rgba(0,0,0,0.35)]"
                      style={{ background: "#fff" }}>
                      <svg viewBox="0 0 24 24" fill="#1a160f" aria-hidden className="ml-[3px] h-6 w-6"><path d="M8 5v14l11-7z" /></svg>
                    </span>
                  </span>
                </button>
                {karteRendert ? null : (
                  <div className="absolute right-3 top-3 z-10" onClick={e => e.stopPropagation()}>
                    <TeilenKnopf rund url={`/themes/${variant === "wedding" ? "wedding" : variant === "poledance" ? "surprise" : variant === "birthday" ? "birthday" : variant === "versprechen" ? "versprechen" : "kiss"}?utm_source=share`}
                      text={teilenText(variant, lang)}
                      label={(KARTE_TEXTE[lang] ?? KARTE_TEXTE.en).teilen}
                      kopiertLabel={(KARTE_TEXTE[lang] ?? KARTE_TEXTE.en).zusDanke} />
                  </div>
                )}
              {!karteRendert && <Reaktionen variant={variant} lang={lang} name={empfaenger} />}
              </div>
              ))} />
              {beispielOffen !== null && (
                <VorlagenUeberlagerung videoUrl={beispiele[beispielOffen]} posterUrl={posterZu(beispiele[beispielOffen])}
                  sprache={lang} titel={variant === "versprechen" ? T.filmTitel : variant === "birthday" ? geburtstagTitel(empfaenger) : T.karteTitel(empfaenger.trim())}
                  zu={() => setBeispielOffen(null)} />
              )}
              {/* Der sichtbare Kaufaufruf — auf dem Papier, nicht auf dem Bild. */}
              {!karteRendert && (
                <button type="button" onClick={schritteOeffnen}
                  className="lb-gold mt-2 flex h-12 w-full items-center justify-center rounded-full text-center text-[14px] font-black leading-tight shadow-[0_6px_20px_rgba(0,0,0,0.2)] active:scale-95 transition">
                  {gesperrt ? T.blockedOnce : kartenAufruf}
                </button>
              )}
              {/* Die Herzchen-Ebene ist in die Folie gezogen (siehe Karussell oben) — hier
                  lag sie ueber der GANZEN Karte samt Punkten und Kaufknopf. */}
              {/* „Personen ersetzen" weicht ebenfalls: Mitten im bezahlten Lauf die Personen
                  zu tauschen hiesse zahlen und nichts bekommen — derselbe Grund, aus dem der
                  Loeschknopf ueber dem eigenen Bild waehrend des Laufs verschwindet. */}
              {/* DER KNOPF LIEGT NICHT MEHR AUF DEM VIDEO (Owner 05.08.2026, mit Bild: „mach
                  das Video ganz zu sehen und Button auf weissen Rahmen").
                  Er lag als goldene Pille ueber dem unteren Drittel — zusammen mit den
                  aufsteigenden Herzchen verdeckte er genau die Stelle, an der sich die beiden
                  kuessen. Jetzt steht er UNTER dem Video auf dem Karten-Papier: Das Video ist
                  frei, und der Knopf ist trotzdem das Erste, was man unter dem Bild sieht.
                  DIE FLAECHE BLEIBT TIPPBAR (`kartenGriff` ohne sichtbaren Knopf ist keine
                  Option) — wer aufs Video tippt, kommt weiterhin in den Trichter; der Knopf
                  sagt es jetzt nur an einer Stelle, an der er nichts zudeckt. */}
              {/* HIER LAG DIE UNSICHTBARE TRICHTER-FLAECHE — sie ist weg (Owner 05.08.2026:
                  „Klick auf Video vergrössert Video habe ich gesagt"). Zwei Dinge koennen sich
                  denselben Tipp nicht teilen: Solange diese Flaeche darueber lag, kam das
                  Vergroessern nie an. Der Weg in den Trichter ist der goldene Knopf UNTER dem
                  Video — sichtbar, beschriftet und einen Fingerbreit entfernt. */}
              {/* HIER LEBT DER KUSS-LAUF. Ohne Gratis-Bild ist DIESER Zweig der, den der
                  Kunde waehrend seines bezahlten Videos vor sich hat — die Schicht gehoert
                  also vor allem hierher, nicht nur ins Bild darueber. */}
              {renderSchicht}
            </div>
          ) : (
            /* OHNE BEISPIELVIDEO BRAUCHT DIE KARTE TROTZDEM EINEN WEG HINEIN (10.08.2026,
               beim Bau des Versprechens): Der goldene Knopf hängt sonst an `beispiele.length`
               — eine Landingpage ohne Beispiel hätte gar keinen Einstieg, und der Besucher
               steht vor einer Karte, die nichts tut. */
            <div className="px-6 pb-4">
            <div className="grid h-[220px] w-full place-items-center text-center">
              {/* OHNE BEISPIELVIDEO SAGT DIE LEERE KARTE, WAS HIER PASSIERT — und beim
                  Aufnahme-Thema ist das NICHT „lade die Frau hoch, die du küssen willst"
                  (10.08.2026, beim Bau des Versprechens sichtbar geworden: Der Satz kommt
                  aus der Grundtabelle des Kusses und erbt sich stillschweigend weiter, wenn
                  ein Thema noch kein Beispiel hat). Wer sich selbst aufnimmt, liest hier den
                  Aufnahme-Hinweis. */}
              <span className="font-serif text-[15px] font-bold">
                {selbstVideo ? SW.aufTitel : T.pickHint}
              </span>
            </div>
            <button type="button" onClick={schritteOeffnen}
              className="lb-gold flex h-12 w-full items-center justify-center rounded-full text-center text-[14px] font-black leading-tight shadow-[0_6px_20px_rgba(0,0,0,0.2)] active:scale-95 transition">
              {gesperrt ? T.blockedOnce : kartenAufruf}
            </button>
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
                  <button type="button" onClick={() => setAufladeWahl(true)} disabled={payBusy}
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
              {/* Derselbe Satz wie bisher — jetzt mit den Kartenzeichen daneben (Owner
                  10.08.2026). Zwei Stellen, EIN Baustein: Was am Kaufknopf steht, steht auch
                  im Aufladefenster, sonst sind es zwei Versprechen statt eines. */}
              <Zahlungssiegel text={T.secure} className="mt-1.5" />
            </>
          )}
        </div>
      )}

      {/* ── DIE SCHRITTE, unveraendert, nur in einem Dialog ──────────────────────────────
          Model waehlen (unsere Frauen ODER ein eigenes Foto — Owner 31.07.2026: „hier nehmen
          die Leute auch ein Model … jeder hat ein Model auf dem Handy"), sein Foto, der Kuss.
          Nichts davon ist angefasst: Der Kuss-Trichter traegt Kasse, Video-Lieferung und
          Monatsguthaben, und der laeuft gerade. Umgehaengt, nicht neu gebaut. */}
      {/* z-40 statt z-[80] + Abstand oben (Owner 03.08.2026: „hier sollte ich das Menü
          auch haben … und Credit sollte auch hier angezeigt werden"): Die Kopfzeile
          (z-50, mit Konto-Chip und Galerie) bleibt damit UEBER dem Dialog sichtbar und
          klickbar — wer im Trichter seine Adresse bestaetigt, sieht sofort oben seinen
          Stand. Die eigenen Fenster des Trichters (Tor 96, Waehler 96, Teilen 95) liegen
          weiterhin darueber. */}
      {/**
        * ALS SEITENINHALT STATT ALS DIALOG (Owner 12.08.2026: „die muss ich in den ads
        * einbauen"). `tunnelSeite` traegt genau dieselben Schritte hier unten weiter — kein
        * Zeichen der eigentlichen Schritte aendert sich —, nur die HUELLE ist eine andere:
        * kein abgedunkelter Vollbild-Hintergrund, kein Schliessen durch Tippen daneben (die
        * Seite verlassen ist das Schliessen), und immer offen statt erst nach einem Klick.
        */}
      {(stufenOffen || tunnelSeite) && (
      <div className={tunnelSeite ? "" : "fixed inset-0 z-40 overflow-y-auto pt-36"}
        style={tunnelSeite ? undefined : { background: "rgba(0,0,0,0.72)" }}
        onClick={tunnelSeite ? undefined : () => setStufenOffen(false)}>
        <div className={tunnelSeite ? "" : "lb-bg mx-auto min-h-full w-full max-w-[440px] px-4 pb-10 pt-4"}
          onClick={tunnelSeite ? undefined : (e => e.stopPropagation())}>
          {/* HIER STAND EIN ZWEITER ZURÜCK-PFEIL (Owner 06.08.2026: „Zwei mal back button")
              — direkt unter dem Pfeil der Kopfzeile sah er aus wie ein Versehen. Der Dialog
              schliesst weiter durch Tippen NEBEN ihn (auf den abgedunkelten Rand), und der
              Pfeil oben in der Kopfzeile bleibt der eine Rückweg. */}
      {/* Fortschritt — drei Punkte, damit er weiss, wo er steht. */}
      <div className="mb-3 flex items-center justify-center gap-1.5">
        {/* Beim Tanz sind es ZWEI Punkte: ihr Foto, dann der Tanz. Ein dritter, grauer Punkt
            fuer einen Schritt, den es nicht gibt, sieht aus wie ein haengender Trichter. */}
        {(tunnelSeite ? tunnelPunkte : V.nurSie ? [1, 3] : V.paarUpload ? [1, 3, 4] : [1, 2, 3, 4]).map(n => (
          <span key={n} className={`h-1.5 rounded-full transition-all ${n === schritt ? "w-6 bg-[#f6cf51]" : n < schritt ? "w-3 bg-[#f6cf51]/50" : "w-3 bg-white/20"}`} />
        ))}
      </div>

      {/* DER ZUSCHNITT — AN EINER STELLE, UNABHAENGIG VOM SCHRITT (live geprueft, 12.08.2026):
          Stand er nur im alten Schritt 1 (`!tunnelSeite`), blieb er in der Tunnel-Seite tot —
          `setCropDatei`/`setCropZiel` liefen ins Leere, kein Dialog erschien, kein Foto kam
          je an. Zuschnitt braucht keinen Schritt zu kennen, nur die beiden Zustände hier. */}
      {cropDatei && cropZiel && (
        <ImageCropper
          file={cropDatei}
          aspect={3 / 4}
          sprache={lang}
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

      {/**
       * SCHRITT 1 IST DER EINE TUNNEL-START, FUER JEDES TUNNEL-PRODUKT GLEICH
       * (KONZEPT-TUNNEL.md, Owner 12.08.2026: „also Stepp 1. Name, Email" · „Genauso müssen
       * alle tunels aussehen. nicht komplizierter."). Beim Versprechen wanderten Ziele, Look
       * und Aufnahme aus diesem Schritt in die Kachel-Reihe; bei Kuss/Geburtstag stand hier
       * ohnehin schon nur die Wahl von ihr/dem Look + sein Foto — der Bibliotheks-Baustein
       * `TunnelStart` fragt hier NUR Name und E-Mail, unabhaengig vom Produkt.
       *
       * NUR AUF DER TUNNEL-SEITE (`tunnelSeite`): Die alten Dialog-Einstiege der drei
       * Produkte (falls sie je wieder erreichbar werden) behalten ihren gewachsenen
       * Schritt 1 — dieser Baustein ersetzt ihn nur dort, wo `schritteOeffnen` auch
       * tatsaechlich auf die neue Seite verweist.
       */}
      {schritt === 1 && tunnelSeite && (
        <TunnelStart
          produkt={variant}
          titel={T.tunnelStartTitel ?? T.namenFrage}
          /* NUR DAS VERSPRECHEN FÜLLT DIESE ZWEI (Owner-Folgeauftrag 12.08.2026, ChatGPT-
             Papier §22) — `T.tunnelIntro`/`T.tunnelKleinText` stehen nur im VERSPRECHEN-
             Overlay von lib/kiss-i18n.ts; jedes andere Produkt reicht `undefined` und sieht
             denselben Baustein wie vorher. */
          intro={T.tunnelIntro} kleinText={T.tunnelKleinText}
          nameLabel={T.tunnelName ?? T.namenFrage} namePlatzhalter={T.namenPlatzhalter}
          emailLabel={T.tunnelEmail ?? T.mailQuestion} emailPlatzhalter="you@email.com"
          weiterLabel={T.tunnelWeiter ?? T.next}
          zurueckHref={tunnelSeite ? (() => { const q = new URLSearchParams(); try { const j = new URLSearchParams(window.location.search); if (j.get("light") === "1") q.set("light", "1"); if (code) q.set("code", code); } catch { /**/ } const s = q.toString(); return `/themes/${variant === "poledance" ? "surprise" : variant}${s ? `?${s}` : ""}`; })() : undefined}
          lang={lang} anfangsName={empfaenger} anfangsEmail={mail} busy={mailBusy} fehlerAussen={mailFehler}
          /**
           * GOOGLE ALS ABKUERZUNG (Owner 12.08.2026: „auch googgle anmeldung kannst du
           * einbauen"). Derselbe Weg wie in `KontoChip.tsx` (`signInWithOAuth`,
           * `lb_oauth_return`), kein eigener OAuth-Aufruf: Google verlaesst die Seite
           * komplett, `redirect_to` bleibt IMMER `/auth/confirm` (die einzige Adresse, die
           * im Supabase-Dashboard freigegeben sein muss — dieselbe, die jede Anmeldung im
           * Haus schon benutzt). Wohin es danach geht, steht in `lb_oauth_return`, nicht im
           * `redirect_to`: `/auth/confirm` liest es aus `sessionStorage` (nicht aus der
           * Supabase-Weiterleitung, die eine Allowlist braucht) und springt dorthin.
           *
           * DAS ZIEL IST HARTKODIERT, NICHT NEU GEPRUEFT: Nach einer erfolgreichen Google-
           * Anmeldung IST die Adresse bekannt — dieselbe Logik, die `versprechenSchonBekannt`
           * sonst erst nach dem Laden ausrechnet, muss hier nicht abgewartet werden. Er
           * ueberspringt aber NUR Schritt 1 — hat sein Produkt einen Auswahl-Schritt
           * (`hatAuswahl`, bisher nur Geburtstag), landet er dort, nicht direkt auf den
           * Kacheln: Identitaet ersetzt keine Wahl.
           */
          google={{
            label: T.tunnelGoogle ?? "Continue with Google",
            oderLabel: T.tunnelOder ?? "or",
            onClick: () => {
              try {
                const jetzt = new URLSearchParams(window.location.search);
                const ziel = new URLSearchParams();
                ziel.set("s", String(nachTunnelStart));
                if (jetzt.get("light") === "1") ziel.set("light", "1");
                if (code) ziel.set("code", code);
                sessionStorage.setItem("lb_oauth_return", `/themes/${variant === "poledance" ? "surprise" : variant}/start?${ziel.toString()}`);
              } catch { /* privater Modus — dann landet er auf dem Konto-Dashboard, kein Absturz */ }
              try { signInWithOAuth("google", `${window.location.origin}/auth/confirm`); }
              catch { setMailFehler(T.statusNotWork); }
            },
          }}
          onWeiter={async (name, email) => {
            setEmpfaenger(name);
            try { localStorage.setItem(nameKey(variant), name); } catch { /**/ }
            /**
             * `mail` MUSS HIER GESETZT WERDEN — `TunnelStart` fuehrt sein EIGENES Feld, das
             * dem Trichter-Zustand `mail` bis zu diesem Punkt nie begegnet ist (LIVE GEPRUEFT:
             * ohne diese Zeile blieb `mail` leer, obwohl `adresseVormerken` erfolgreich lief —
             * die Adresse fehlte danach im Auftrag UND beim erneuten Zurueckgehen im Feld, das
             * `anfangsEmail={mail}` vorbelegen soll). Der Vergleich zwei Zeilen weiter unten
             * (geaenderte Adresse) liest trotzdem noch den ALTEN Stand aus dieser Zeile,
             * React setzt state nicht synchron — genau das ist hier richtig: er soll ja ALT
             * gegen NEU vergleichen, nicht NEU gegen NEU.
             */
            setMail(email);
            // ZUGESTIMMT WIRD DURCH DIE HANDLUNG (Owner 30.07.2026) — derselbe Klick, der
            // frueher unter dem alten „Weiter"-Knopf in Schritt 1 stand.
            zustimmen();
            /**
             * DER LEAD IST GESPEICHERT, SOBALD „WEITER" GEDRUECKT IST (KONZEPT-TUNNEL.md,
             * „das ist der ganze Zweck des Schritts") — ueber die BESTEHENDE Lead-Logik
             * (`adresseVormerken` ruft `/api/kiss-claim`), kein neuer Endpunkt.
             *
             * AUCH BEIM ZURUECKGEHEN NEU GEPRUEFT (Owner 12.08.2026: „vor und zurück in den
             * steps" — „falls sie ihre Adresse ändern wollen"): Nicht nur `!adresseDa`, auch
             * eine GEAENDERTE Adresse loest die Anmeldung erneut aus. Ohne den zweiten
             * Vergleich haette ein bekannter Besucher, der hier zurueckkommt und eine andere
             * E-Mail eintippt, weiterhin auf der alten gestanden — die neue waere nie
             * angekommen.
             */
            const eGeaendert = mail.trim().toLowerCase() !== email.trim().toLowerCase();
            {/* Der NAME reist mit in die Liste (Owner 12.08.2026: „greifen wir die emails
                und namen ab sofort in einer liste ja?") — `name` ist der frisch getippte
                Wert aus TunnelStart. */}
            /* LEER = ÜBERSPRUNGEN (Owner 16.08.2026: „der user soll trotzdem weiter können
               auch ohne email aber später beim generieren braucht er eine"). Ohne Adresse
               gibt es nichts vorzumerken — `adresseDa` bleibt falsch, und genau daran
               erkennt der Generieren-Knopf weiter unten, dass er sie noch holen muss. */
            if (email.trim() && (!adresseDa || eGeaendert)) { const ok = await adresseVormerken(email, name); if (!ok) return; }
            setSchritt(alsSchritt(nachTunnelStart));
            setStufenOffen(true);
          }} />
      )}

      {/**
        * SCHRITT 2 — DIE AUSWAHL (`hatAuswahl`, seit 12.08.2026 fuer ALLE Tunnel mit einer
        * Vorlage: Geburtstag, Tanz, Kuss, Versprechen). KONZEPT-TUNNEL.md: „in Geburtstag
        * hätten wir die template auswahl in stept zwei" — dieselbe Vorlagen-Reihe, die
        * bisher in Schritt 1 stand (`LOOKS`/`BildWahl`), nur jetzt ihr eigener Schritt mit
        * eigenem Weiter-Knopf.
        *
        * DER KUSS UND DAS VERSPRECHEN SCHLIESSEN AUF (Owner 12.08.2026: „warum ist der Kuss
        * funel anders? Warum ist das nicht aus 3 schritten?" · „und um das ganze zu
        * vereinheitlichen mach auch Verprehcne genauso. Aus 3 schritten") — beide hatten bis
        * heute keinen Auswahl-Schritt (Kuss: Szene war laengst zufaellig; Versprechen: nur
        * ein Look). Jetzt zeigen ALLE SIEBEN Tunnel dieselben drei Schritte ohne Ausnahme.
        */}
      {schritt === 2 && hatAuswahl && (
        <div className="mt-1">
          {/* DER TEXT-FOLGEAUFTRAG (Owner 12.08.2026, ChatGPT-Papier §22–26): nur das
              Versprechen hat hier einen eigenen Titel/eine eigene Unterzeile
              (`T.zukunftTitel`/`T.zukunftUnterzeile`) — jedes andere Produkt sieht weiter
              `SW.look` bzw. `T.szeneTitel`, unveraendert. */}
          <p className="text-[12px] font-black uppercase tracking-wide text-white/50">
            {variant === "versprechen" && T.zukunftTitel ? T.zukunftTitel : variant === "kiss" ? T.szeneTitel : SW.look}
          </p>
          {variant === "versprechen" && T.zukunftUnterzeile && (
            <p className="mt-1 text-[12.5px] font-semibold leading-snug text-white/60">{T.zukunftUnterzeile}</p>
          )}
          <div className="mt-2">
            {/**
              * DIE SET-WAHL DES TANZES — DASSELBE `BildWahl` WIE BEIM GEBURTSTAG (Owner
              * 12.08.2026: „pool dancing kannst du hier einbauen und da machst du auch dort
              * den tunel einbauen"). `POLEDANCE_SETS_MIT_VIDEO`/`GEBURTSTAG_LOOKS_MIT_VIDEO`
              * tragen jetzt das optionale `video` je Kachel — der Zustand bleibt wie zuvor:
              * `neuerLook` speichert (wie im Rest der Datei) das BILD, nicht die Kennung,
              * `garmentBild` ist der Ruckfall auf das erste Set.
              */}
            {variant === "poledance" ? (
              <BildWahl gross ansehenLabel={T.vorlageAnsehen} sprache={lang} titel={vorlagenTitel}
                wert={POLEDANCE_SETS.find(s => s.bild === (neuerLook || V.garmentBild))?.id ?? POLEDANCE_SETS[0].id}
                waehle={id => {
                  const bild = POLEDANCE_SETS.find(s => s.id === id)?.bild || "";
                  setNeuerLook(bild);
                  onVorlage?.(id);   // in die Adresse (Owner 16.08.2026)
                  /* DIE WAHL UEBERLEBT DEN NEULADEN (15.08.2026, Owner: „ich habe die grüne
                     ausgewählt gehabt" — geliefert wurde rosa). `neuerLook` war reiner
                     Browser-Zustand; die Rueckkehr von der Kasse laedt die Seite neu und
                     setzte ihn auf "" zurueck, also auf das erste Set. */
                  try { localStorage.setItem(`lb_set_${variant}`, bild); } catch { /**/ }
                }}
                bilder={POLEDANCE_SETS_MIT_VIDEO} />
            ) : variant === "kiss" ? (
              /**
                * DER KUSS VERLIERT SEINE SONDERROLLE (Owner 12.08.2026: „warum ist der Kuss
                * funel anders? Warum ist das nicht aus 3 schritten? Template auswahl dann
                * bilder hochladen"). Dieselbe `BildWahl`, dieselben vier Szenen-Standbilder
                * (`KUSS_SZENEN`, `public/szenen/…jpg`). Die Wahl schreibt `kissSzeneId`; ohne
                * Tipp bleibt es beim ZUFALL wie bisher — siehe `kussSzeneVideoPrompt`-Aufruf
                * beim Erzeugen weiter unten.
                *
                * JE SZENE IHR EIGENER CLIP (Owner 15.08.2026: „ich habe mehrmals das gleiche
                * video in template"). Hier stand `video: beispiele[0]` — vier Kacheln zeigten
                * viermal denselben Film, was keine Auswahl ist, sondern ein Suchbild. Der
                * danebenstehende Kommentar behauptete, keine Szene habe ein eigenes Video;
                * das stimmte nie: `public/szenen/kiss-<id>.mp4` liegt seit dem 03.08. neben
                * jedem Standbild. Jetzt kommt er aus `s.clip`.
                *
                * UND DER NAME IN SEINER SPRACHE (derselbe Auftrag: „und es ist auf deutsch") —
                * `s.name` ist der deutsche Admin-Name, gezeigt wird `s.namen[lang]`.
                */
              <BildWahl gross ansehenLabel={T.vorlageAnsehen} sprache={lang} titel={vorlagenTitel}
                wert={kissSzeneId} waehle={id => { setKissSzeneId(id); onVorlage?.(id); }}
                bilder={KUSS_SZENEN.filter(s => !s.versteckt).map(s => ({ id: s.id, name: s.namen?.[lang] ?? s.name, bild: s.kachel, video: s.clip }))} />
            ) : (
              <BildWahl gross ansehenLabel={T.vorlageAnsehen} sprache={lang} titel={vorlagenTitel} wert={look}
                waehle={id => { setLook(id); onVorlage?.(id); }}
                /* DIE PROGRAMM-KARTE NUR BEIM VERSPRECHEN (Owner-Zusatzauftrag 12.08.2026:
                   „wenn wir eins haben") — der Geburtstag hat keine, bekommt also nichts. */
                features={variant === "versprechen" ? <VersprechenProgrammKarte T={T} /> : undefined}
                bilder={variant === "birthday" ? GEBURTSTAG_LOOKS_MIT_VIDEO : LOOKS.map(l => ({ ...l, name: l.namen?.[lang] ?? l.name, video: beispiele[0] || undefined }))} />
            )}
          </div>
          {/**
            * DIE SEPARATE VORSCHAU-KNOPF-KACHEL IST RAUS (Owner 12.08.2026: „Man muss die
            * Videos sehen im ganzen Tunel. Sonst sind es bilder" → „ok, bauen"). Vorher stand
            * hier ein zusaetzlicher schmaler „Vorlage ansehen"-Knopf, WEIL `BildWahl` noch
            * keine eigene Video-Andockstelle hatte. Jetzt spielt das Video direkt IN der
            * gewaehlten Kachel oben — ein zweiter Knopf fuer dasselbe Video waere doppelt.
            */}
          <div className="mt-4 flex items-center gap-2">
            <button type="button" onClick={() => setSchritt(1)} aria-label={T.back}
              className="lb-chip grid h-12 w-12 shrink-0 place-items-center rounded-full active:scale-95 transition">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => {
                /* NORMIERTE FAMILIE, `look_selected` (Owner-Master-Auftrag §32, 13.08.2026):
                   gemeldet wird beim „Weiter"-Klick, nicht bei jedem Antippen einer Kachel in
                   `BildWahl` — sonst würde jedes Durchblättern der Vorlagen als eigene Wahl
                   zählen. `lookId` steckt je nach Zweig woanders: Tanz merkt sich nur das
                   BILD (`neuerLook`), also über `POLEDANCE_SETS` zurück auf die Kennung
                   suchen wie schon oben bei `wert=`; der Kuss trägt seine Szene direkt in
                   `kissSzeneId`; alle anderen tragen die Kennung schon in `look`. */
                const lookId = variant === "poledance"
                  ? (POLEDANCE_SETS.find(s => s.bild === (neuerLook || V.garmentBild))?.id ?? POLEDANCE_SETS[0].id)
                  : variant === "kiss" ? kissSzeneId
                  : look;
                void logTunnelEvent("look_selected", variant, { lookId });
                setSchritt(3);
              }}
              className="lb-gold flex h-12 w-full items-center justify-center rounded-full text-[15px] font-black active:scale-95 transition">
              {/* EIN Weiter-Wort für alle Tunnel-Schritte (Owner 12.08.2026: „keine
                  Ausnahme") — `T.next` trug Alt-Zusätze wie „— gratis".
                  AUSNAHME NUR BEIM VERSPRECHEN (Owner-Folgeauftrag 12.08.2026, ChatGPT-
                  Papier §22: „Diese Zukunft wählen"). Bewusst ein EIGENER Schlüssel
                  (`tunnelWeiterAuswahl`), nicht `tunnelWeiter` selbst: Der sitzt auch am
                  „Weiter"-Knopf von Schritt 1 (TunnelStart, siehe oben) — dort passt „Diese
                  Zukunft wählen" nicht, denn dort ist noch gar keine Zukunft gewählt. */}
              {variant === "versprechen" && T.tunnelWeiterAuswahl ? T.tunnelWeiterAuswahl : (T.tunnelWeiter ?? T.next)}
            </button>
          </div>
        </div>
      )}

      {schritt === 1 && !tunnelSeite && (<>
      {/* Ohne Katalog heisst der Schritt nicht mehr „Waehle sie" — es gibt nichts zu waehlen.
          Und der Hinweis „oder wische zu einer von uns" waere schlicht falsch. */}
      {/**
        * DER GANZE FOTO-BLOCK ENTFAELLT BEIM GEBURTSTAG (Owner 07.08.2026, mit Bild vom
        * Abschnitt „Dein Foto": „das brauchen wir nicht").
        *
        * Die Aufnahme weiter unten liefert das Bild selbst — Ueberschrift, Anleitung und
        * Upload-Karussell waeren drei Abschnitte fuer einen Schritt, den es nicht mehr
        * gibt.
        *
        * AUCH NICHT MEHR ALS KAMERA-RUECKFALL (Owner 08.08.2026, mit Bild: „wieso kommt
        * das immer noch? Beim Abbrechen?"). Hier stand `|| kameraAus` — gedacht fuer den,
        * der die Kamera verweigert. In Wirklichkeit sprang der Schalter auch nach einem
        * ABBRUCH mit schnellem Neuversuch (iOS haelt die Kamera einen Moment fest →
        * NotReadableError), und der ganze Foto-Block stand wieder da. Beim Geburtstag
        * gibt es nur EINEN Weg: die Aufnahme. Wer die Kamera nicht freigibt, liest die
        * rote Zeile („erlaub den Zugriff und versuch es nochmal") — kein zweiter Pfad.
        */}
      {!selbstVideo && (<>
      <p className="text-[12px] font-black uppercase tracking-wide text-white/50">{schrittTitel(V.nurEigenes ? T.upTitle : T.step1)}</p>
      {/* Der Hinweis nennt beide Wege („… oder wische zu einer von uns"). Ohne Katalog gibt
          es nur noch einen — dann sagt die Karte selbst, was zu tun ist. */}
      {!V.nurEigenes && <p className="mt-1 text-[13px] font-bold text-white/85">{T.pickHint}</p>}

      {/* HIER STAND „Das Video kostet 15 €." (HandelZeile) — raus am 06.08.2026 (Owner:
          „Diese Anmerkung wurde von Opus eingebaut ohne meine Zustimmung."). Der Preis steht
          auf dem Preis-Chip der Seite und auf dem Kaufknopf — eine dritte Zeile mitten im
          Schritt war zu viel (Skill `bezahlung` §8: „hier müssen wir sparen"). */}

      {/* DAS SCHILD AM FOTOAUTOMATEN (Owner 05.08.2026): was das Foto koennen muss, bevor er
          es sucht. Abgewiesen wird nichts; wer die Anweisung gesehen hat, traegt die Folgen
          seines Fotos selbst (so auch im AGB). */}
      <FotoAnleitung lang={lang} className="mt-3" />


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
              className="relative flex aspect-[3/4] w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl border-2 border-dashed border-[#f6cf51]/40 lb-goldhauch active:scale-[0.98] transition">
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
          <input ref={modelFileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) { setCropZiel("sie"); setCropDatei(f); } e.target.value = ""; }} />
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) { setCropZiel("er"); setCropDatei(f); } e.target.value = ""; }} />
        </div>
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
          <input ref={paarRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={e => { onPaarFile(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
      )}

      </>)}

      {/* Auch HIER kein `|| kameraAus` mehr (Owner 08.08.2026: „wieso kommt das immer
          noch?") — das war die zweite Stelle: die Upload-Kachel im Karussell kam nach
          jeder Kamera-Absage zurück, obwohl der Foto-Weg beim Geburtstag abgeschafft ist. */}
      {!selbstVideo && !V.paarUpload && (() => {
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
                          {/* Ohne Katalog steht „Deine Frau" schon als Schritt-Überschrift
                              darüber — dreimal derselbe Titel auf einem Bildschirm war einer
                              der Fehler vom 06.08. (Owner: „Es sind so viele Fehler"). */}
                          {!V.nurEigenes && <span style={{ color: "#fff" }} className="text-[15px] font-black">{T.upTitle}</span>}
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
                    {/* Der Namensbalken gilt den KATALOG-Frauen. Auf der leeren Upload-Karte
                        stand er als drittes „Deine Frau" unter Überschrift und Kacheltitel. */}
                    {!(isUpload && !customModel) && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2 pt-6">
                      <p className="lb-onmedia truncate text-[13px] font-black">{m.name}</p>
                    </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
      {/**
        * DER ZUSCHNITT HAT HIER GEFEHLT (Owner 03.08.2026, zum Tanz: „du hast auch kein crop
        * beim Upload gemacht").
        *
        * Die Hausregel gilt fuer JEDES Upload-Feld — Speichern-Knopf, Zuschnitt, Loeschen. Der
        * Weg mit ZWEI Kacheln (Hochzeit) hat ihn seit jeher; dieser Weg — die „Your model"-Karte
        * im Karussell — schob die Datei direkt in `onModelFile` und damit ungeschnitten weiter.
        * Kuss, Geburtstag und Tanz laufen alle hier durch; beim Tanz faellt es nur am staerksten
        * auf, weil ein Handyfoto im Hochformat sonst blind von `object-cover` beschnitten wird
        * und der Kopf wegfaellt.
        *
        * UND ES IST NICHT NUR KOSMETIK: Was hier herauskommt, ist die Vorlage fuer den Austausch
        * bei Pixverse. Ein schiefer Ausschnitt ist ein schiefes Ergebnis.
        */}
      {!V.paarUpload && (
        <input ref={modelFileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) { setCropZiel("sie"); setCropDatei(f); } e.target.value = ""; }} />
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
      {/* AN WEN GEHT DER KUSS (Owner 03.08.2026: „schreib auch den Namen an wem du es
          senden willst, da rein … dann erscheint in den Texten Anna, I love you").

          HIER, UEBER „WEITER", UND NICHT AN EINER KACHEL: Der Kuss laeuft ueber den
          Model-Weg (eine Kachel, „Your model"), die Hochzeit ueber zwei Kacheln. Ein Feld an
          einer Kachel haette also nur einen der beiden Wege getroffen — an dieser Stelle
          kommen beide vorbei. Und der Name ist ohnehin keine Eigenschaft ihres FOTOS, sondern
          die Anschrift des Grusses: Er gehoert ueber den Umschlag, nicht auf das Bild darin. */}
      {V.empfaengerName && (
        <div className="mt-3">
          <label className="block text-[11px] font-bold text-white/55" htmlFor="lb-empfaenger">
            {T.namenFrage}
          </label>
          <input id="lb-empfaenger" value={empfaenger}
            onChange={e => { setEmpfaenger(e.target.value); try { localStorage.setItem(nameKey(variant), e.target.value); } catch { /**/ } }}
            type="text" autoComplete="given-name" maxLength={18} placeholder={T.namenPlatzhalter}
            style={{ color: "#fff", WebkitTextFillColor: "#fff", caretColor: "#fff" }}
            className="lb-eingabe mt-1 h-11 w-full rounded-xl border border-white/25 bg-black/50 px-3 text-center text-[15px] font-bold outline-none placeholder:text-white/35 focus:border-[#f6cf51]" />
          {/**
            * DER ZIELE-SCHRITT — NUR BEIM VERSPRECHEN (Owner 11.08.2026: „WHERE DO YOU WANT
            * TO BE IN 5 YEARS?" · „Der User soll maximal 3 Hauptziele auswählen können").
            *
            * ER STEHT VOR DER AUFNAHME, nicht dahinter, und das ist der ganze Zweck: Wer
            * gerade angetippt hat, wo er in fünf Jahren sein will, spricht danach etwas
            * anderes in die Kamera als jemand, der ohne Gedanken auf „aufnehmen" drückt.
            * Die drei Chips sind die Vorbereitung auf den Satz.
            *
            * CHIPS, KEIN FORMULAR (Hausregel `chat-no-personal-questions-buttons-only`:
            * Leute klicken, sie tippen nicht). Nur „etwas anderes" macht ein Feld auf, und
            * auch das bleibt eine Zeile.
            */}
          {zieleFragen && (
            <div className="mt-4">
              <p className="text-[12px] font-black uppercase tracking-wide text-[#f6cf51]">{ZT.frage}</p>
              {/* Die Zeile sagt vor der Wahl, wie viele erlaubt sind — und danach, wie viele
                  stehen. Zwei Auskünfte, eine Zeile, kein Sprung im Aufbau. */}
              <p className="mt-1 text-[12px] font-bold text-white/75">
                {ziele.length ? `${ziele.length} / ${MAX_ZIELE} ${ZT.zaehler}` : ZT.hinweis}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ZIEL_IDS.map(id => (
                  <Knopf key={id} art="chip" aktiv={ziele.includes(id)}
                    disabled={!ziele.includes(id) && ziele.length >= MAX_ZIELE}
                    onClick={() => zielTippen(id)}>
                    {ZT.namen[id]}
                  </Knopf>
                ))}
              </div>
              {ziele.includes(ZIEL_FREI) && (
                <Eingabe className="mt-2" value={zieleFrei} maxLength={60}
                  placeholder={ZT.freiPlatzhalter}
                  onChange={e => setZieleFrei(e.target.value)} />
              )}
            </div>
          )}
          {/* Die Stimmen-Wahl direkt unterm Namen: Der Name ist das, was GESPROCHEN wird —
              die Stimme gehört daneben, nicht in einen eigenen Schritt. */}
          {/* DER AUFNAHME-KASTEN GEHÖRT JEDEM AUFNAHME-THEMA (10.08.2026): Stand hier
              weiter „birthday", öffnete das Versprechen einen Trichter ohne Kamera — der
              Knopf sagte „Erst aufnehmen", und aufnehmen konnte man nirgends. */}
          {selbstVideo && (() => {
            /* Der Satz, den die Kette spricht — WÖRTLICH derselbe wie in der Route, damit
               das Vorgelesene und das Erzeugte nie auseinanderlaufen. */
            /* DER VORLESE-SATZ IST WEG (Owner 09.08.2026): Er widersprach dem Versprechen
               „kein Skript nötig" auf derselben Seite. Was der Kunde spricht, bestimmt er
               selbst; die Aufnahme-Anweisung steht in `SW.aufTitel`/`SW.aufHinweis`. */
            return (
              <div className="mt-2">
                {/**
                  * DER LOOK ZUERST, DIE STIMME DANACH — in der Reihenfolge, in der man ein
                  * Geschenk aussucht: erst wie es AUSSIEHT, dann wie es klingt. Beides
                  * steht vor der Kasse (siehe `look` oben).
                  *
                  * BEI EINEM EINZIGEN LOOK IST ES KEINE WAHL — ABER DIE VORLAGE MUSS TROTZDEM
                  * ZU SEHEN SEIN (Owner 11.08.2026: „und du muss die Vorlage auch zeigen bei
                  * Selbst aufnehmen").
                  *
                  * Bis heute stand hier nur `LOOKS.length > 1`, und damit war die Aufnahme
                  * beim Versprechen bildlos: Es gibt genau einen Look (Villa und Wagen), also
                  * fiel die ganze Reihe weg. Der Kunde filmte sich, ohne je gesehen zu haben,
                  * WOHINEIN er gefilmt wird — und das Bild ist genau das, wofür er zahlt.
                  *
                  * Zwei Gestalten, eine Stelle: mehrere Looks bleiben die Wisch-Wahl, ein
                  * einzelner wird zur Ankündigung (dieselbe Kachelgrösse, derselbe goldene
                  * Ring, nur nichts zu tippen).
                  */}
                <div className="mb-3">
                  <p className="mb-1.5 text-center text-[11px] font-bold text-white/55">
                    {LOOKS.length > 1 ? SW.look : SW.vorlage}
                  </p>
                  {/* Als SLIDES (Owner 08.08.2026: „als Slide die Bilder presentieren") —
                      man sieht, WAS man wählt, nicht eine Briefmarke davon. Kein
                      `justify-center` mehr: Eine Wisch-Fläche, die zentriert, schneidet
                      links an, sobald die Slides breiter sind als der Schirm. */}
                  {LOOKS.length > 1 ? (
                    <BildWahl gross ansehenLabel={T.vorlageAnsehen} sprache={lang} titel={vorlagenTitel} wert={look} waehle={setLook}
                      bilder={variant === "birthday" ? GEBURTSTAG_LOOKS_MIT_VIDEO : LOOKS.map(l => ({ ...l, name: l.namen?.[lang] ?? l.name, video: beispiele[0] || undefined }))} />
                  ) : (
                    <div className="flex justify-center py-1.5">
                      {/* Ohne festen dunklen Abstandsring (Owner 12.08.2026: „keine
                          schwarzen rahmen" — Dauerregel, siehe BildWahl in CI.tsx). */}
                      <span className="relative block h-[213px] w-[160px] overflow-hidden rounded-2xl ring-2 ring-[#f6cf51]">
                        {/**
                          * DIE VERWANDLUNG STATT DES ZIELS (Owner 11.08.2026: „kannst du hier
                          * eine animation machen zwischen diese zwei bilder?").
                          *
                          * Unten liegt das Ziel (Villa und Wagen), darüber blendet das Heute
                          * (er, wie er sich selbst filmt) alle fünf Sekunden weg und wieder
                          * her — `lb-swap-top` ist dieselbe Blende, mit der die Try-On-Karte
                          * seit dem 04.08. „angezogen ↔ Lingerie" zeigt. Ein Bild sagt, was
                          * man bekommt; zwei sagen, was mit einem passiert.
                          *
                          * `prefers-reduced-motion` schaltet die Blende ab (steht in der
                          * Klasse) — dann bleibt das Heute stehen, und das ist die richtige
                          * Reihenfolge: Erst er, dann das Ziel.
                          */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={VERSPRECHEN_SPAETER} alt=""
                          className="absolute inset-0 block h-full w-full object-cover" />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={VERSPRECHEN_HEUTE}
                          alt={(() => { const l = LOOKS.find(x => x.id === look) ?? LOOKS[0]; return l.namen?.[lang] ?? l.name; })()}
                          className="lb-swap-top absolute inset-0 block h-full w-full object-cover" />
                      </span>
                    </div>
                  )}
                </div>
                {/**
                  * DIE ZIELE-ERINNERUNG STAND HIER FRUEHER (Owner 11.08.2026: „die Chips
                  * sind die Vorbereitung auf den Satz") — sie galt NUR dem Versprechen
                  * (`variant === "versprechen"`), und dieser ganze Zweig hier ist seit dem
                  * Tunnel-Umbau (KONZEPT-TUNNEL.md, Owner 12.08.2026) nur noch fuer den
                  * Geburtstag da: Das Versprechen hat seinen Aufnahme-Schritt jetzt in der
                  * Kachel-Reihe von Schritt 3, mit einer eigenen, kompakteren Ziele-Erinnerung
                  * dort (siehe unten). Ein Zweig, der nie mehr eintreten kann, ist toter Code —
                  * TypeScript hat das zu Recht angemahnt.
                  */}
                {/**
                  * DIE AUFNAHME STEHT OFFEN DA — kein Chip davor (Owner 07.08.2026: „Das
                  * ganze ist zu kompliziert. Wir brauchen nur das … button Selbstaufnehmen
                  * mit dem script was er sagen soll").
                  *
                  * Vorher lagen hier drei Chips (Frau · Mann · Selbst aufnehmen), und der
                  * Satz erschien erst nach einem Tipp auf den dritten. Wer sich ohnehin
                  * selbst aufnimmt, braucht keine Computerstimme zur Wahl — und ein
                  * eingeklappter Schritt ist auf dem Handy ein Schritt, den niemand sieht
                  * (derselbe Tag, zur Look-Reihe: „ich habe das unten gar nicht gesehen
                  * weil das ausser screen war").
                  */}
                <div className="rounded-xl border border-white/20 bg-white/[0.05] p-3 text-center">
                  {/**
                    * HIER STEHT KEIN TEXT MEHR (Owner 09.08.2026, mit Bild des Kastens: „hier
                    * den Text raus").
                    *
                    * Zuerst stand hier „Lies diesen Satz laut vor" mit einem fertigen Spruch
                    * — das widersprach dem „kein Skript nötig" der Seite. Dann stand hier die
                    * Aufnahme-Anweisung — und die kam zu früh: Wer noch gar nicht aufnimmt,
                    * liest keine Anleitung, er sucht den Knopf. Die Ansage steht jetzt dort,
                    * wo sie gebraucht wird: im Aufnahme-Vollbild, während die Kamera läuft.
                    */}
                  {/* DAS BILD, IN DEM MAN SICH SIEHT — nur waehrend der Aufnahme. Ohne es
                      spricht man in eine schwarze Flaeche und weiss nicht, ob man drauf ist.
                      Gespiegelt wie ein Spiegel (`scaleX(-1)`), weil jede Selfie-Kamera das
                      so zeigt; die AUFNAHME selbst bleibt unspiegelt. */}
                  {/**
                    * DER KOPFBALKEN LAG ÜBER DEM VOLLBILD (Owner 09.08.2026, mit Bild).
                    *
                    * `fixed` ist nur dann wirklich am Fenster verankert, wenn KEIN Vorfahr
                    * eine `transform`/`filter`-Eigenschaft trägt — sonst wird er an diesem
                    * Vorfahren ausgerichtet, und sein z-Wert zählt nur INNERHALB dessen
                    * Stapel. Genau das passierte hier, tief im Trichter: Die Aufnahme lag
                    * unter der Kopfzeile, obwohl ihre Zahl höher war. Ein Portal an
                    * `document.body` hängt das Fenster aus jedem fremden Stapel aus — die
                    * einzige Lösung, die nicht beim nächsten Layout-Umbau wieder kippt.
                    */}
                  {/* Das Aufnahme-Vollbild stand HIER — im Geburtstags-Zweig von Schritt 1.
                      Auf der Versprechen-Kachel (Schritt 3, Tunnel-Seite) war dieser Zweig
                      nie gerendert, der Tipp öffnete NICHTS (Owner 12.08.2026: „selbst
                      aufnehmen öffent nichts"). Es wohnt jetzt auf der OBERSTEN Ebene bei
                      den anderen Fenstern — einmal im Baum, für jeden Auslöser erreichbar. */}
                  {/**
                    * SOLANGE NICHTS AUFGENOMMEN IST, STEHT DER KNOPF HIER — er ist dann die
                    * einzige Aufgabe der Seite und darf golden und allein sein.
                    *
                    * IST ETWAS AUFGENOMMEN, WANDERT ER NACH UNTEN neben "Weiter" (Owner
                    * 09.08.2026: "Button noch mal soll links neben weiter stehen"). Zwei
                    * goldene Knoepfe untereinander waeren zwei Hauptaktionen — die Hausregel
                    * laesst genau eine zu, und die heisst hier "Weiter".
                    */}
                  {!nimmtAuf && !aufnahme && (
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <button type="button" onClick={() => void aufnahmeStart()}
                        className="lb-gold flex h-11 items-center justify-center gap-2 rounded-full px-5 text-[14px] font-black active:scale-95 transition">
                        <Mic className="h-4 w-4" /> {SW.selbst}
                      </button>
                    </div>
                  )}
                  {aufnahmeFehler && (
                    <p className="mt-2 text-[12px] font-bold leading-snug" style={{ color: ABSAGE_ROT }}>
                      {aufnahmeFehler}
                    </p>
                  )}
                  {/* Die eigene Aufnahme zum Anschauen — mit Ton, denn beides wird benutzt:
                      das Standbild als Avatar, die Tonspur als Stimme. */}
                  {/* MIT STANDBILD ALS POSTER — sonst zeigt der Spieler eine schwarze
                      Flaeche, bis jemand darauf tippt, und die sieht aus wie eine leere
                      Aufnahme (genau die Verwechslung vom 07.08.). Das Standbild ist
                      ohnehin da: Es ist das Avatar, das aus dieser Aufnahme entstand. */}
                  {aufnahmeUrl && !nimmtAuf && (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video controls playsInline src={aufnahmeUrl || undefined} poster={customModel || undefined}
                      className="mx-auto mt-3 aspect-[3/4] w-[240px] max-w-full rounded-xl object-cover" />
                  )}
                  {/* Nur wenn die Fehlerzeile es nicht LÄNGST sagt — sonst stand dieselbe
                      Absage zweimal untereinander (einmal mit Fehlername, einmal ohne). */}
                  {kameraAus && !aufnahmeFehler && (
                    <p className="mt-2 text-[11px] font-bold leading-snug" style={{ color: ABSAGE_ROT }}>
                      {SW.kameraAus}
                    </p>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
      <div className="mt-4 flex items-center gap-2">
      {/* "NOCHMAL" LINKS NEBEN "WEITER" (Owner 09.08.2026). Als Umriss-Knopf, nicht golden:
          Er ist der Rueckweg, nicht das Ziel — und schmal, damit "Weiter" die Zeile behaelt. */}
      {selbstVideo && aufnahme && !nimmtAuf && (
        <button type="button" onClick={() => void aufnahmeStart()}
          className="flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-full border border-white/25 px-4 text-[13.5px] font-black text-white/85 active:scale-95 transition">
          <Mic className="h-4 w-4" /> {SW.neu}
        </button>
      )}
      <button type="button"
        onClick={() => {
          if (V.paarUpload ? (!selPhoto || !photo) : !selPhoto) {
            setWeiterHinweis(V.paarUpload && selPhoto ? T.uploadFirst : selbstVideo ? SW.erst : T.pickFirst);
            return;
          }
          setWeiterHinweis("");
          // Der Tanz ueberspringt Schritt 2 — dort stand SEIN Foto, und es gibt keines mehr.
          zustimmen(); wahlMerken(); setSchritt(V.paarUpload || V.nurSie ? 3 : 2);
        }}
        className={`lb-gold flex h-12 w-full items-center justify-center rounded-full text-[15px] font-black active:scale-95 transition${(V.paarUpload ? (!selPhoto || !photo) : !selPhoto) ? " opacity-40" : ""}`}>
        {/* OHNE AUFNAHME HEISST DER KNOPF NICHT „Lade dein Foto hoch" (Owner 07.08.2026:
            „das brauchen wir nicht") — beim Geburtstag gibt es kein Foto mehr, das man
            hochladen koennte. Er sagt dann, was wirklich fehlt: die Aufnahme. */}
        {V.paarUpload
          ? (selPhoto && photo ? (V.keinGratis ? T.nextPaid : T.next) : !selPhoto ? T.pickFirst : T.uploadFirst)
          : (selPhoto ? (V.keinGratis ? T.nextPaid : T.next) : selbstVideo ? SW.erst : T.pickFirst)}
      </button>
      </div>
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
          /* Ohne Foto-Upload waere „Mit dem Hochladen eines Fotos" schlicht falsch. */
          const teile = (selbstVideo ? T.zustimmungAufnahme : T.zustimmung).split(/(\{agb\}|\{privacy\})/);
          return teile.map((t, i) =>
            t === "{agb}" ? <a key={i} href="/terms" target="_blank" rel="noreferrer" className="underline">{T.agbLink}</a>
            : t === "{privacy}" ? <a key={i} href="/privacy" target="_blank" rel="noreferrer" className="underline">{T.datenschutzLink}</a>
            : <span key={i}>{t}</span>);
        })()}
      </p>
      </>)}

      {/* NUR IM ALTEN DIALOG (live geprueft, 12.08.2026): Auf der Tunnel-Seite hat Schritt 2
          eine andere Bedeutung (die Auswahl, `hatAuswahl` oben) oder existiert gar nicht
          (Kuss/Versprechen) — ohne `!tunnelSeite` rendeten hier BEIDE Schritt-2-Inhalte
          gleichzeitig uebereinander. */}
      {schritt === 2 && !tunnelSeite && (<>
      <p className="text-[12px] font-black uppercase tracking-wide text-white/50">{schrittTitel(T.step2)}</p>
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
        className="relative flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-3xl border-2 border-dashed border-[#f6cf51]/40 lb-goldhauch active:scale-[0.98] transition">
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
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) { setCropZiel("er"); setCropDatei(f); } e.target.value = ""; }} />
      {/* ZUSCHNITT AUCH HIER (Owner 08.08.2026: „kein Cropwerkzeug bei Upload"). Schritt 1 hatte
          den Dialog aus 3362, Schritt 2 rief `onFile` bisher direkt auf — ohne Zuschnitt schnitt
          `object-cover` blind, hier ausgerechnet sein Gesicht. Derselbe Dialog, dasselbe Format. */}
      {cropDatei && cropZiel === "er" && (
        <ImageCropper
          file={cropDatei}
          aspect={3 / 4}
          sprache={lang}
          title={T.you}
          onCancel={() => { setCropDatei(null); setCropZiel(null); }}
          onSave={async (zugeschnitten) => {
            setCropDatei(null); setCropZiel(null);
            await onFile(zugeschnitten);
          }}
        />
      )}

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
          <p className="text-[12px] font-black uppercase tracking-wide text-white/50">{schrittTitel(T.step4)}</p>
        </div>
      )}

      {schritt === 3 && (<>
      {/* DER ANKER FÜR DEN SPRUNG NACH DER AUFNAHME (Owner 09.08.2026: „oder direkt zum
          Schritt zwei") — genau die Zeile, unter der sein Standbild, die Adresse und der
          Kaufknopf stehen. */}
      <p ref={schrittZweiRef} className="text-[12px] font-black uppercase tracking-wide text-white/50">{schrittTitel(T.step3)}</p>
      {/**
        * DIE REGEL, BEVOR ER HOCHLAEDT (Owner 15.08.2026: „einen Hinweis musst du schreiben,
        * was der User hochladen kann. Und er soll nicht erwarten, dass nackte Models
        * rauskommen. Wenn er das trotzdem macht und was anderes rauskommt, dann bekommt er
        * das Geld nicht zurueck").
        *
        * SIE STEHT VOR DEM UPLOAD, NICHT DANACH — eine Erwartung, die man erst nach der
        * Zahlung korrigiert, ist keine Aufklaerung, sondern eine Ausrede, und sie kommt als
        * Erstattungsforderung zurueck. Deshalb direkt unter der Schritt-Ueberschrift, ueber
        * der Upload-Kachel.
        *
        * Nur dort, wo der Schluessel gefuellt ist (heute: der Tanz) — kein anderes Thema
        * bekommt dadurch eine Zeile, die es nicht braucht.
        */}
      {T.upRegel && (
        <p className="mt-1 text-[11.5px] font-bold leading-snug text-white/50">{T.upRegel}</p>
      )}
      {/**
        * DIE KACHEL-REIHE DES VERSPRECHENS — SCHRITT 2 DES EINEN TUNNELS (KONZEPT-TUNNEL.md,
        * Owner 12.08.2026: „Stepp zwei das was stepp drei ist wo links ein platzahlter ist
        * für Foto oder Video upload dann generieren"). Vorbild ist wortwoertlich dieser
        * Kuss-Schritt „3 · DER KUSS": LINKS, was der Kunde GIBT — hier seine Aufnahme, mit
        * derselben weissen Loesch-Scheibe wie beim Kuss, sobald sie da ist (siehe die
        * bestehende Vorschau direkt darunter) —, RECHTS das ZIEL (Villa & Sportwagen,
        * `VERSPRECHEN_SET`; nicht austauschbar, es gibt genau einen Look).
        *
        * NUR SOLANGE NOCH NICHTS AUFGENOMMEN IST: Ist die Aufnahme da, zeigt die
        * bestehende Vorschau (`selPhoto`, gleich darunter) dieselbe linke Kachel bereits
        * inklusive Loesch-Scheibe — zwei Kacheln fuer denselben Platz waeren doppelt.
        * Antippen loest DIESELBE Aufnahme aus wie beim Geburtstag (`aufnahmeStart`,
        * `nimmtAuf`) — das Vollbild dafuer ist ein gemeinsamer Baustein
        * (`aufnahmeUeberlagerung`, vor `return` definiert) und steht nur einmal im Baum.
        */}
      {/**
        * DIE KACHEL-REIHE VOR DER ERSTEN GABE (Owner 12.08.2026, „oberstes Gesetz"): dasselbe
        * Muster fuer JEDES Aufnahme-Thema (`selbstVideo` — Versprechen UND Geburtstag), nicht
        * nur fuer das Versprechen. Der ZURUECK-Pfeil fuehrt zum Schritt VOR den Kacheln —
        * beim Geburtstag ist das die Vorlagen-Wahl (Schritt 2, `hatAuswahl`), sonst Schritt 1.
        */}
      {tunnelSeite && selbstVideo && !selPhoto && (
        <div className="mt-2 flex items-center justify-center gap-2">
          {/* KEIN ZURUECK-CHIP MEHR AM BILD (Owner 13.08.2026: „ein mal machst du den back
              button links vom cta und ein mal neben dem bild. Wie jetzt?") — die EINE Regel:
              der Chip steht IMMER links vom Haupt-CTA des Schritts, siehe den Kaufknopf. */}
          {/* ZUGESTIMMT WIRD DURCH DIE HANDLUNG (Owner 30.07.2026: „mit klick auf weiter
              akzeptiert er das schon") — genau wie beim Foto-Upload der anderen Themen
              (`onFile`/`onModelFile` rufen `zustimmen()` im selben Moment). Fuer Bekannte,
              die Schritt 1 nie sehen, ist dieser Tipp die ERSTE Handlung im ganzen Tunnel. */}
          <button type="button" onClick={() => { zustimmen(); void aufnahmeStart(); }}
            className="relative flex aspect-[3/4] w-[26vw] min-w-[72px] max-w-[118px] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl border-2 border-dashed border-[#f6cf51]/40 lb-goldhauch active:scale-[0.98] transition">
            <Mic className="h-6 w-6 text-[#f6cf51]" />
            <span className="px-2 text-center text-[11px] font-black leading-snug text-white/85">{SW.selbst}</span>
          </button>
          {/* PFEIL STATT ZEICHEN (Owner 12.08.2026, mit Bild des Tanz-Emojis zwischen den
              Kacheln: „was hast du da für ein komischen tanz icon dazwischen. Mach eijne
              Pfeil bei allen") — zwischen den Kacheln steht bei JEDEM Produkt derselbe
              Pfeil: links dein Beitrag → rechts das Ziel. */}
          <ChevronRight className="h-6 w-6 shrink-0 opacity-60" />
          {/**
            * DAS ZIEL IST JETZT UEBERALL DER GEWAEHLTE LOOK (Owner 12.08.2026, Ergaenzung:
            * „und um das ganze zu vereinheitlichen mach auch Verprehcne genauso. Aus 3
            * schritten"). Vorher stand hier fest `VERSPRECHEN_SET`, weil das Versprechen
            * keinen eigenen Auswahl-Schritt hatte. Jetzt zaehlt `hatAuswahl` auch „versprechen"
            * dazu (Schritt 2 unten), und dieselbe Suche wie beim Geburtstag reicht: Ohne Wahl
            * bleibt `look` auf `LOOKS[0].id` stehen — „villa", also wieder `VERSPRECHEN_SET`.
            * ANTIPPEN OEFFNET DAS ECHTE VIDEO (Owner 12.08.2026: „das gilt für den ganzen
            * Tunel") — `zielVideo` ist leer, sobald es keins gibt, dann bleibt die Kachel ein
            * Bild.
            */}
          <div className="w-[26vw] min-w-[72px] max-w-[118px] shrink-0">
            <VorlagenKachel
              bildUrl={(LOOKS.find(l => l.id === look) ?? LOOKS[0]).bild}
              videoUrl={zielVideo} ansehenLabel={T.vorlageAnsehen} sprache={lang} titel={vorlagenTitel}
              features={variant === "versprechen" ? <VersprechenProgrammKarte T={T} /> : undefined} />
          </div>
        </div>
      )}
      {/**
        * DER IN-APP-HINWEIS STEHT VOR DEM FEHLER, NICHT DANACH (15.08.2026).
        *
        * GEMESSEN: 23 von 23 Kamera-Fehlern kamen aus einem Android-WebView (`; wv)`) — dem
        * Browser der Facebook-App. Keine einzige Aufnahme ist dort je gelungen. Wer erst auf
        * „Kamera aus" laeuft, hat den Trichter meist schon verlassen; deshalb erscheint der
        * Hinweis, sobald wir den In-App-Browser erkennen, und nicht erst nach dem Scheitern.
        * Ausserhalb solcher Browser rendert die Komponente nichts.
        */}
      {tunnelSeite && selbstVideo && <InAppBrowserHinweis sprache={lang} className="mt-3" />}
      {tunnelSeite && selbstVideo && aufnahmeFehler && (
        <p className="mt-2 text-center text-[12px] font-bold leading-snug" style={{ color: ABSAGE_ROT }}>{aufnahmeFehler}</p>
      )}
      {tunnelSeite && selbstVideo && kameraAus && !aufnahmeFehler && (
        <p className="mt-2 text-center text-[11px] font-bold leading-snug" style={{ color: ABSAGE_ROT }}>{SW.kameraAus}</p>
      )}
      {/**
        * DIE KACHEL-REIHE DES KUSSES — BEIDE FOTOS ERSETZBAR (KONZEPT-TUNNEL.md-Tabelle;
        * Owner 12.08.2026: „im Kuss wäre links und rechts bilder ersetzen dann
        * generieren"). Solange KEINS von beiden da ist, zeigt die bestehende Vorschau
        * weiter unten (`selPhoto || photo`) noch nichts — genau wie beim Versprechen ohne
        * Aufnahme braucht es hier den Platzhalter-Zwilling: zwei einfache Tipp-Kacheln
        * statt der grossen Model-Karussell-Auswahl aus dem alten Dialog (die bleibt dort,
        * wo sie ist — dieser Tunnel ist der kurze Weg).
        *
        * REIHENFOLGE WIE DIE BESTEHENDE VORSCHAU DARUNTER, NICHT WIE DIE KONZEPT-TABELLE:
        * Die Vorschau-Zeile (gleich nach dieser hier) zeigt seit jeher `selPhoto` (ihr
        * Foto/Model) LINKS und `photo` (sein Foto) RECHTS — ungeaendert, um nicht
        * anzufassen. Zwei verschiedene Reihenfolgen vor und nach dem ersten Upload waeren
        * ein Sprung, den der Kunde als Fehler liest; diese Kachel-Reihe folgt deshalb der
        * VORSCHAU, nicht dem Wortlaut der Tabelle (siehe Bericht an den Owner).
        */}
      {tunnelSeite && !selbstVideo && !V.nurSie && !selPhoto && !photo && (
        <div className="mt-2 flex items-center justify-center gap-2">
          {/* Zurueck-Chip: an der CTA-Zeile, nicht am Bild (Owner 13.08.2026, EINE Regel). */}
          {/* AUS DER BIBLIOTHEK, NICHT VON HAND (Owner 12.08.2026, Screenshot der blauen
              Platten: „das stimmt schon wieder nicht. Du benutzt nicht den tunel. Wieso?")
              — dieselbe Kachel wie bei Hochzeit/Urlaub. */}
          <TunnelKachelUpload titel={T.upTitle} onWaehlen={() => { zustimmen(); modelFileRef.current?.click(); }} />
          <TunnelKachelUpload titel={T.you} onWaehlen={() => { zustimmen(); fileRef.current?.click(); }} />
          {/* RECHTS DIE GEWAEHLTE SZENE (Owner 13.08.2026, mit Bild neben der Hochzeit:
              „und was ist mit Kuss? Wieso bekommst du das nicht in dem gleichen Tunel rein?")
              — dasselbe Muster wie `TunnelKacheln`: die zwei eigenen Kacheln NEBENEINANDER,
              der Pfeil, dann das ZIEL. Ohne Wahl in Schritt 2 zeigt die Kachel die erste
              Szene — geliefert wird dann wie bisher die Überraschung (`zufallsSzene`). */}
          <ChevronRight className="h-6 w-6 shrink-0 opacity-60" />
          <div className="w-[26vw] min-w-[72px] max-w-[118px] shrink-0">
            <VorlagenKachel
              bildUrl={(KUSS_SZENEN.find(s => s.id === kissSzeneId) ?? KUSS_SZENEN[0]).kachel}
              /* DER CLIP DER GEWAEHLTEN SZENE (15.08.2026, Owner: „Kiss ist auch kaputt" — er
                 waehlte „Altstadt-Platz am Abend" und Schritt 3 zeigte die Fruehstuecks-
                 Terrasse). Hier stand `beispiele[0]`, also EIN festes Beispiel: Das Bild kam
                 schon aus der Wahl, das Video widersprach ihm. */
              videoUrl={(KUSS_SZENEN.find(s => s.id === kissSzeneId) ?? KUSS_SZENEN[0]).clip}
              ansehenLabel={T.vorlageAnsehen} sprache={lang} titel={vorlagenTitel} />
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) { setCropZiel("er"); setCropDatei(f); } e.target.value = ""; }} />
          <input ref={modelFileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) { setCropZiel("sie"); setCropDatei(f); } e.target.value = ""; }} />
        </div>
      )}
      {/**
        * DIE KACHEL-REIHE DES TANZES — EIN FOTO VON IHR, RECHTS DAS GEWAEHLTE SET (Owner
        * 12.08.2026: „pool dancing kannst du hier einbauen und da machst du auch dort den
        * tunel einbauen"). `V.nurSie` OHNE `selbstVideo`: nur der Tanz braucht genau EIN
        * Foto ohne Aufnahme — der Kuss braucht zwei, Versprechen/Geburtstag nehmen sich auf.
        */}
      {tunnelSeite && !selbstVideo && V.nurSie && !selPhoto && (
        <div className="mt-2 flex items-center justify-center gap-2">
          {/* Zurueck-Chip: an der CTA-Zeile, nicht am Bild (Owner 13.08.2026, EINE Regel). */}
          {/* AUS DER BIBLIOTHEK, NICHT VON HAND — dieselbe Kachel wie im Kuss-Zweig. */}
          <TunnelKachelUpload titel={T.upTitle} onWaehlen={() => { zustimmen(); modelFileRef.current?.click(); }} />
          <ChevronRight className="h-6 w-6 shrink-0 opacity-60" />
          {/* DAS GEWAEHLTE SET — UND NUR DAS (Owner 15.08.2026, mit Bild: „es wird ein video
              angezeigt in der Referenz. Der Funel ist kaputt"). Hier hing `beispiele[0]`
              daran, das Beispielvideo einer FRAU an der Stange. Die Kachel spielt das Video
              statt das Set zu zeigen — der Kunde waehlte ein Waescheset und sah eine fremde
              Person. Was hier steht, geht als `@image2` an Pixverse, und das ist das
              freigestellte Set. Also zeigt die Kachel genau das. */}
          <div className="w-[26vw] min-w-[72px] max-w-[118px] shrink-0">
            <VorlagenKachel bildUrl={neuerLook || V.garmentBild || ""} ansehenLabel={T.vorlageAnsehen} sprache={lang} titel={vorlagenTitel} />
          </div>
          <input ref={modelFileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) { setCropZiel("sie"); setCropDatei(f); } e.target.value = ""; }} />
        </div>
      )}
      {/* BEIDE NEBENEINANDER (Owner 30.07.2026: „ich sehe uns nicht nebeneinander"). In den
          Schritten davor hat er sie einzeln gewählt; hier muss er sehen, wer gleich mit wem
          im Bild landet — sonst generiert er blind. */}
      {(selPhoto || photo) && (
        <div className="relative mt-2 flex items-center justify-center gap-2">
          {/* DER LAUF ALS EIGENE ZEILE, NICHT ALS SCHICHT DARUEBER (Owner 14.08.2026, mit
              Bild vom laufenden Kauf: „es sieht nicht so toll aus" — der Text lag doppelt
              uebereinander und der Programm-Knopf klebte darin).
              VORHER stand hier `renderSchicht`, die Schicht des Dialog-Trichters. Sie ist
              `absolute inset-0` und fuer eine hohe Medienkarte gebaut; ueber der niedrigen
              Vorher/Nachher-Reihe lief ihr Inhalt unten heraus und legte sich auf alles,
              was darunter stand. Statt sie zu dehnen, steht der Fortschritt jetzt UNTER der
              Reihe — dieselbe Zahl, derselbe Balken, aber im Fluss statt darueber. */}
          {/* IM TUNNEL steht der Zurueck-Chip an der CTA-Zeile (Owner 13.08.2026, EINE
              Regel); nur der alte DIALOG behaelt ihn hier am Bild — er hat keinen
              Tunnel-Kaufknopf mit Chip-Zeile darunter. */}
          {!tunnelSeite && (
            <button type="button" onClick={() => setSchritt(alsSchritt(schrittVorKacheln))} aria-label={T.back}
              className="lb-chip grid h-9 w-9 shrink-0 place-items-center rounded-full active:scale-95 transition">
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {/* FEHLT IHR FOTO NOCH, STEHT HIER DIE GESTRICHELTE KACHEL (Owner 13.08.2026,
              Kuss = dasselbe Muster wie die Hochzeit: beide Plätze IMMER sichtbar — vorher
              verschwand der leere Platz nach dem ersten Upload, und das zweite Foto hatte
              keinen sichtbaren Weg mehr hinein). */}
          {tunnelSeite && variant === "kiss" && !selPhoto && (
            <TunnelKachelUpload titel={T.upTitle} onWaehlen={() => { zustimmen(); modelFileRef.current?.click(); }} />
          )}
          {selPhoto && (
            <div className="relative">
              {/**
                * NUR EIN KATALOG-MODEL IST EINE „VORLAGE" (Owner 12.08.2026: „wenn user ein
                * Video generiert dann muss er die Vorlage genau als Video sehen … Das gilt
                * für den ganzen Tunel"). Hat sie ihr EIGENES Foto hochgeladen (`useCustom`),
                * gibt es kein Beispielvideo dazu zu zeigen — das ist ihr Bild, kein
                * Verkaufsversprechen. Nur bei einem gewaehlten Katalog-Model oeffnet der
                * Tipp das allgemeine Beispielvideo der Seite (`beispiele[0]`); ein
                * modellgenaues Video gibt es (noch) nicht (siehe Bericht an den Owner).
                */}
              {!useCustom && variant === "kiss" && beispiele[0] ? (
                <div className="w-[26vw] min-w-[72px] max-w-[118px] shrink-0">
                  <VorlagenKachel bildUrl={selPhoto} videoUrl={beispiele[0]} ansehenLabel={T.vorlageAnsehen} sprache={lang} titel={vorlagenTitel} />
                </div>
              ) : (
                /* §22 Screen 4: „DU HEUTE" AUFS BILD statt darüber (Owner 13.08.2026:
                   „bilder nie versetzt") — dasselbe „YOU"-Muster wie überall. */
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selPhoto} alt="" className="aspect-[3/4] w-[26vw] min-w-[72px] max-w-[118px] rounded-2xl border border-white/15 object-cover object-top" />
                  {tunnelSeite && variant === "versprechen" && T.heuteLabel && (
                    <span className="lb-onmedia pointer-events-none absolute inset-x-0 bottom-0 rounded-b-2xl bg-gradient-to-t from-black/80 to-transparent pb-1.5 pt-6 text-center text-[10px] font-black uppercase tracking-wide"
                      style={{ color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.85)" }}>
                      {T.heuteLabel}
                    </span>
                  )}
                </div>
              )}
              {/* Auch in der Vorschau muss das Foto weggehen koennen (Owner 31.07.2026:
                  „hier soll man das Bild noch löschen können"). Nur bei EIGENEN Fotos —
                  ein Katalog-Model laesst sich nicht loeschen, nur wechseln. */}
              {useCustom && !!customModel && (
                /* BEIM VERSPRECHEN BLEIBT ER AUF SCHRITT 3 (KONZEPT-TUNNEL.md: „nicht
                   komplizierter" — genau zwei sichtbare Schritte). `setSchritt(1)` fuehrte
                   hier zurueck zum Tunnel-Start (Name + E-Mail), den er meist schon hinter
                   sich hat; die leere linke Kachel weiter oben nimmt die neue Aufnahme
                   sofort wieder auf. */
                /**
                 * LOESCHEN IST LOESCHEN — KEIN SPRUNG (Owner 16.08.2026, live auf dem Handy:
                 * „ich habe das erste referenz bild gelöscht und ist zurück zur Tunel Seite 1
                 * Formular gesprungen").
                 *
                 * Hier stand `setSchritt(1)` fuer alle ausser dem Versprechen — ein Rest aus
                 * der Zeit, als die leere Kachel nach dem Upload verschwand und man nur ueber
                 * Schritt 1 ein neues Foto hineinbekam. Seit die Plaetze IMMER sichtbar sind
                 * (`TunnelKachelUpload`, ein paar Zeilen weiter oben), wirft der Sprung den
                 * Kunden nur aus dem Kaufweg — und beim Zurueckkommen stand ploetzlich ein
                 * Katalog-Model samt Beispielvideo an seinem Platz (siehe `setPicked(null)`
                 * in `fotoLoeschen`): „jetzt steht da Video als Bild 1".
                 */
                <button type="button" onClick={() => { fotoLoeschen("sie"); if (!tunnelSeite && variant !== "versprechen") setSchritt(1); }}
                  aria-label="Foto löschen"
                  style={{ background: "#fff", color: "#dc2626", boxShadow: "0 2px 10px rgba(0,0,0,0.35)" }}
                  className="absolute -left-1.5 -top-1.5 grid h-8 w-8 place-items-center rounded-full transition active:scale-90">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              {/* „DAS IST MEIN VERSPRECHEN" STAND HIER ALS UNTERSCHRIFT UNTER DER KACHEL —
                  raus am 13.08.2026 (Owner, mit Bild: „und das ist immer noch versetzt"):
                  eine Zeile unter NUR EINER Kachel macht ihre Spalte höher, und
                  `items-center` schiebt dann das Bild aus der Reihe. Das Label „DU HEUTE"
                  AUF dem Bild übernimmt die Aussage, ohne Höhe zu kosten. */}
            </div>
          )}
          {/* Das Sinnbild zwischen den beiden Fotos folgt dem Thema: Kuss-Lippen auf einer
              Hochzeitsseite sind derselbe Fehler wie „Heisses Video" — der Kuss-Trichter, der
              ungeprueft mitkommt. */}
          {/* Pfeil bei ALLEN (Owner 12.08.2026, siehe oben) — kein Themen-Emoji mehr.
              AUSNAHME Kuss-Tunnel (Owner 13.08.2026): dort stehen die zwei eigenen Fotos
              NEBENEINANDER wie bei der Hochzeit, der Pfeil kommt erst VOR der Szene unten. */}
          {!(tunnelSeite && variant === "kiss") && <ChevronRight className="h-6 w-6 shrink-0 opacity-60" />}
          {/* RECHTS STEHT, WAS WIRKLICH LOSGESCHICKT WIRD.
              Owner 03.08.2026: „was soll das jetzt wieder? Ich habe ein ganz anderes Video
              ausgesucht" — er hatte auf der Landingpage einen Tanz gewaehlt, und hier stand
              trotzdem das alte Waesche-Set.

              ES WAR NICHT NUR DIE FALSCHE KACHEL, ES WAR EIN FALSCHES VERSPRECHEN: Im
              Bewegungs-Modus (`/video/mimic/generate`) gehen an Pixverse GENAU ZWEI Dinge —
              ihr Foto und das gewaehlte Video. Ein Outfit-Bild wird gar nicht mitgeschickt;
              Kleidung, Licht und Bewegung kommen alle aus dem Video. Ein pinkes Set neben
              einem gruenen Tanz zu zeigen, hiess also: das Falsche ankuendigen.

              Ein Standbild aus dem Video selbst (`#t=0.1`, `preload="metadata"` laedt nur den
              Dateikopf) — dieselbe Datei, kein zweites Bild zu pflegen. */}
          {/* DIE EINLADUNG ZUR ANMELDUNG — Baustein aus der Bibliothek, mit seiner Vorlage. */}
          <AnmeldeEinladung
            offen={anmeldeOffen}
            zu={() => { anmeldeMerken(); setAnmeldeOffen(false); }}
            /* ZWEI GESICHTER, EIN BAUSTEIN: `gesperrt` = dein Geld liegt hier, melde dich an
               (Geräte-Riegel, muss im Kaufweg bleiben); sonst = „Projekt sichern" NACH dem
               Ergebnis (Owner-Master-Auftrag 13.08.2026, §16: „Kostenloses Konto erstellen"
               statt Konto-Zwang). */
            titel={guthabenGesperrt ? KT.gesperrtTitel : KT.sichernTitel}
            grund={guthabenGesperrt ? KT.gesperrtGrund : KT.sichernGrund}
            knopf={guthabenGesperrt ? KT.anmeldeKnopf : KT.sichernKnopf}
            /* Liegt sein Geld dort, gibt es kein „Später" — es wäre die Aufforderung,
               zweimal zu zahlen. */
            spaeter={guthabenGesperrt ? undefined : KT.anmeldeSpaeter}
            vorlageBild={selbstVideo ? (LOOKS.find(l => l.id === look) ?? LOOKS[0]).bild : undefined}
            vorlageName={selbstVideo ? (() => { const l = LOOKS.find(x => x.id === look) ?? LOOKS[0]; return l.namen?.[lang] ?? l.name; })() : undefined}
            aufAnmelden={zurAnmeldung}
            aufSpaeter={() => {
              /* „Später" heisst weitermachen, nicht abbrechen — sein Auftrag läuft sofort
                 weiter, sonst hätte das Fenster ihm nur einen Klick gestohlen. */
              anmeldeMerken();
              setAnmeldeOffen(false);
              if (nachAnmeldeWeiter.current) { nachAnmeldeWeiter.current = false; void generate(); }
            }}
          />

          {/**
            * NEBEN SEINEM FOTO STEHT SEINE WAHL — NICHT IRGENDEIN BEISPIEL (Owner 15.08.2026,
            * mit Bild: „falsches bild wieder").
            *
            * Hier stand beim Tanz ein `<video>` mit `beispiele[beispielVorn]` — der Folie, die
            * im Karussell der Landingpage GERADE VORN war. Wer „Black Leather" gewaehlt hatte,
            * sah zwei Schritte spaeter eine fremde Frau in rot: eine Ankuendigung, die zu
            * seinem Auftrag nicht passt, und das direkt ueber dem Kaufknopf.
            *
            * Der Tanz laeuft jetzt durch dieselbe Kachel wie Geburtstag und Versprechen — die
            * zeigt `neuerLook || V.garmentBild`, also GENAU das Set, das beim Erzeugen als
            * `@image2` an Pixverse geht (siehe `refOutfit` in `generate()`). Damit koennen
            * Anzeige und Auftrag nicht mehr auseinanderlaufen; es gibt nur noch eine Quelle.
            */}
          {/**
            * `shrink-0` AN DEN VORLAGEN-KACHELN (Owner 18.08.2026, mit Bild: „im Bild siehst du
            * gerade einen Fehler wie klein die Vorlage ist im Vergleich zu ihren Bildern").
            *
            * Alle drei Kacheln der Reihe tragen dieselbe Breite (`w-[26vw] min-w-[72px] max-w-[118px]`) —
            * trotzdem war die rechte auf dem Handy halb so gross. Der Grund ist Flexbox: Läuft
            * die Reihe über den Schirm hinaus, verkleinert sie ihre Kinder. Die zwei Fotos
            * wehren sich, weil ein `<img>` eine Eigenbreite mitbringt; das leere `<div>` um die
            * Vorlage hatte nichts, womit es sich wehren konnte, und gab als Einziges nach.
            *
            * UND DESHALB DIE BREITE MITWACHSEND (Owner unmittelbar danach: „ich werde das linke
            * bild nicht löschen können da es ausser sichtbereich ist"): Mit drei gleich grossen,
            * nicht mehr schrumpfenden Kacheln lief die Reihe seitlich aus dem Schirm — und mit
            * ihr der Löschknopf des ersten Fotos. `w-[26vw]` legt drei Kacheln plus Pfeil auch
            * auf einem schmalen Handy nebeneinander, `max-w-[118px]` haelt sie auf dem Schreib-
            * tisch bei der alten Groesse. Nichts rutscht mehr hinaus, nichts schrumpft ungleich.
            */}
          {V.nurSie && !!(neuerLook || V.garmentBild) && (
            /**
              * DIE KARTE ZEIGT DEN GEWAEHLTEN LOOK (Owner 07.08.2026, mit Bild: „und ich
              * waehle den Mann aus und am ende kommt die Frau").
              *
              * Hier stand `V.garmentBild` — beim Geburtstag ein FESTES Bild aus
              * `lib/geschenke.ts` (das Black-Tie-Set). Seit es drei Looks zur Wahl gibt, war
              * das schlicht falsch: Wer Skyline tippte, sah zwei Schritte spaeter wieder die
              * Frau im schwarzen Kleid — also eine Ankuendigung, die nicht zu seinem Auftrag
              * passt. Das ist der schlimmste Zeitpunkt dafuer: direkt ueber dem Kaufknopf.
              */
            /* ANTIPPEN OEFFNET DAS ECHTE VIDEO, WENN ES EINS GIBT (Owner 12.08.2026: „das
               gilt für den ganzen Tunel") — `selbstVideo`-Themen bekommen `zielVideo`
               (oben berechnet), alles andere zeigt weiter nur das Bild. */
            <div className="w-[26vw] min-w-[72px] max-w-[118px] shrink-0">
              {/* §22 Screen 4: „DEIN ZUKÜNFTIGES ICH" AUFS BILD (Owner 13.08.2026: „bilder
                  nie versetzt" — ein Label über der Kachel schob die Reihe auseinander). */}
              <VorlagenKachel
                bildUrl={selbstVideo ? ((LOOKS.find(l => l.id === look) ?? LOOKS[0]).bild) : (neuerLook || V.garmentBild || "")}
                videoUrl={selbstVideo ? zielVideo : ""} ansehenLabel={T.vorlageAnsehen} sprache={lang} titel={vorlagenTitel}
                aufBild={tunnelSeite && variant === "versprechen" ? T.zukunftLabel : undefined}
                features={variant === "versprechen" ? <VersprechenProgrammKarte T={T} /> : undefined} />
            </div>
          )}
          {!V.nurSie && photo && (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="" className="aspect-[3/4] w-[26vw] min-w-[72px] max-w-[118px] rounded-2xl border border-[#f6cf51]/40 object-cover object-top" />
              {/* AUCH HIER KEIN SPRUNG MEHR (Owner 16.08.2026, siehe die Zwillingsstelle
                  beim ersten Foto): Der leere Platz steht direkt daneben, ein Schrittwechsel
                  waere nur ein Verlust der Stelle, an der er gerade war. */}
              <button type="button" onClick={() => { fotoLoeschen("er"); if (!tunnelSeite) setSchritt(alsSchritt(schrittVorKacheln)); }}
                aria-label="Foto löschen"
                style={{ background: "#fff", color: "#dc2626", boxShadow: "0 2px 10px rgba(0,0,0,0.35)" }}
                className="absolute -right-1.5 -top-1.5 grid h-8 w-8 place-items-center rounded-full transition active:scale-90">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
          {/* DIE GEWAEHLTE SZENE AUCH IN DER VORSCHAU (Owner 13.08.2026: „Wieso bekommst du
              das nicht in dem gleichen Tunel rein?") — dasselbe Ziel wie in der leeren
              Kachel-Reihe oben; wer schon hochgeladen hat, soll weiter sehen, WOHIN es geht.
              Sein Platz bleibt ebenfalls IMMER sichtbar (gestrichelt, solange leer) — und die
              zwei unsichtbaren Datei-Felder wohnen auch hier, denn die leere Kachel-Reihe
              oben (mit den Original-Feldern) ist in diesem Zustand gar nicht mehr im Bild. */}
          {tunnelSeite && variant === "kiss" && (<>
            {!photo && (
              <TunnelKachelUpload titel={T.you} onWaehlen={() => { zustimmen(); fileRef.current?.click(); }} />
            )}
            <ChevronRight className="h-6 w-6 shrink-0 opacity-60" />
            <div className="w-[26vw] min-w-[72px] max-w-[118px] shrink-0">
              <VorlagenKachel
                bildUrl={(KUSS_SZENEN.find(s => s.id === kissSzeneId) ?? KUSS_SZENEN[0]).kachel}
                /* Der Clip der GEWAEHLTEN Szene, nicht ein festes Beispiel (15.08.2026) —
                   sonst widerspricht das Video dem Bild direkt darueber. */
                videoUrl={(KUSS_SZENEN.find(s => s.id === kissSzeneId) ?? KUSS_SZENEN[0]).clip}
                ansehenLabel={T.vorlageAnsehen} sprache={lang} titel={vorlagenTitel} />
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) { setCropZiel("er"); setCropDatei(f); } e.target.value = ""; }} />
            <input ref={modelFileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) { setCropZiel("sie"); setCropDatei(f); } e.target.value = ""; }} />
          </>)}
        </div>
      )}
      {/* DER FORTSCHRITT UNTER DER REIHE (Owner 14.08.2026). Prozentzahl und Balken
          stehen im Textfluss, nicht als Schicht ueber den Kacheln — dadurch kann nichts
          mehr uebereinanderliegen. Nur im Tunnel und nur, solange wirklich gerechnet wird;
          sobald der Film da ist, verschwindet die Zeile von selbst. */}
      {tunnelSeite && videoBusy && !videoUrl && (
        <div className="mt-3 text-center">
          <p className="text-[26px] font-black leading-none tabular-nums">{fortschritt} %</p>
          <div className="mx-auto mt-2 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-[#f6cf51] transition-[width] duration-1000 ease-linear"
              style={{ width: `${fortschritt}%` }} />
          </div>
        </div>
      )}
      {/* §22 SCREEN 4, DER SATZ UNTER DER GEGENÜBERSTELLUNG (Owner-Master-Auftrag
          13.08.2026): „Wir verbinden deine Nachricht mit deiner Zukunftsvision." — nur beim
          Versprechen und nur, wenn beide Kacheln stehen (die Aufnahme links, der Look
          rechts); vorher gäbe es nichts zu verbinden. */}
      {tunnelSeite && variant === "versprechen" && (selPhoto || photo) && T.verbindenText && (
        <p className="mx-auto mt-2 max-w-[320px] text-center text-[11.5px] font-bold leading-snug text-white/60">
          {T.verbindenText}
        </p>
      )}
      {/**
        * DIE ZIELE-CHIPS SIND RAUS (Owner 12.08.2026, wörtlich: „Gols auswahl ist gut aber
        * in diesem Fall brauchen wir nicht. Es hat keine Auswirkung auf unser Programm.").
        * Sie standen hier kurz als „Zusatzwahl … kompakt unter den Kacheln" — jetzt fragt der
        * Versprechen-Trichter gar nicht mehr danach. `ziele`/`zieleFrei` bleiben als Zustand
        * und im Auftrag bestehen (die Programmseite liest sie noch, `directionEmpty` deckt
        * den leeren Fall ab) — es wird nur nichts mehr ABGEFRAGT. `zieleFragen` faellt damit
        * ausserhalb der Auftrags-Nutzlast (`generate()`/`kussVideo()`) weg; dort steht die
        * Zeile absichtlich noch, falls der Owner die Frage je zurückholt.
        */}
      {/* DIE TANZ-AUSWAHL STEHT AUF DER LANDINGPAGE, NICHT HIER (Owner 03.08.2026: „hier
          nicht — die Auswahl findet auf der Landingpage statt").
          Sie lag kurz in diesem Trichter, weil das Foto hier liegt. Der Owner will sie davor:
          Wer die Seite oeffnet, soll erst SEHEN, was es gibt, und dann hochladen — nicht
          umgekehrt. Der Baustein heisst `TanzAuswahl`; seine Wahl kommt ueber ein Ereignis
          hier an (siehe `refVideo` oben). */}

      {/**
        * DER PROBELAUF — NUR FUER DEN ADMIN (Owner 03.08.2026: „ja", auf den Vorschlag, ihn
        * einzubauen).
        *
        * Er laedt genau die zwei Bilder zu Pixverse hoch, die ein echter Lauf schicken wuerde,
        * und meldet die Kennungen zurueck — OHNE ein Video zu erzeugen, also ohne Kosten. Die
        * Faehigkeit steckte schon in der Route (`dryRun`); es fehlte nur ein Weg, sie
        * auszuloesen.
        *
        * WAS ER BEANTWORTET und was nicht: Kommen beide Bilder an, ist die Bindung in Ordnung —
        * dann liegt ein misslungenes Video an Pixverse' Urteil, nicht an unserem Aufruf. Kommt
        * eines NICHT an, haben wir den Fehler. Eine Ablehnung („I'm not able to create…") kann
        * er NICHT vorhersagen; dafuer braeuchte es einen echten, bezahlten Lauf.
        */}
      {isStaff && V.nurSie && !!selPhoto && (
        <div className="mt-3 rounded-2xl border border-white/15 p-3">
          <button type="button"
            onClick={async () => {
              setProbe("läuft …");
              try {
                const person = await verkleinern(selPhoto, 720);
                const outfit = await alsDatenUrl(neuerLook || V.garmentBild || "");
                const r = await fetch("/api/generate-tryon-video", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", ...(pin ? { "x-try-look-admin-pin": pin } : {}) },
                  body: JSON.stringify({ dryRun: true, lookId: KISS_LOOK_ID, person, garment: outfit,
                    prompt: neuerLook ? undefined : V.prompt }),
                }).then(x => x.json());
                setProbe(
                  `Person: ${r.pixverseReceivedPerson ? "angekommen (" + r.personImgId + ")" : "NICHT angekommen"}\n` +
                  `Outfit: ${r.pixverseReceivedGarment ? "angekommen (" + r.garmentImgId + ")" : "NICHT angekommen"}` +
                  (r.bindung ? `\nBindung: Person ${r.bindung.person} · Outfit ${r.bindung.outfit}${r.bindung.gleich ? "  ← BEIDE GLEICH, Fehler!" : ""}` : "") +
                  (r.promptGesendet ? `\nPrompt: ${r.promptGesendet}` : "") +
                  (r.error ? `\nFehler: ${r.error}` : ""),
                );
              } catch (e) { setProbe("Fehlgeschlagen: " + (e instanceof Error ? e.message : "unbekannt")); }
            }}
            className="flex h-10 w-full items-center justify-center rounded-full border border-white/25 text-[12px] font-black text-white/80 active:scale-95 transition">
            🔍 Probelauf — kommen beide Bilder bei Pixverse an? (kostenlos)
          </button>
          {probe && <pre className="mt-2 whitespace-pre-wrap text-[11px] font-semibold leading-snug text-white/70">{probe}</pre>}
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
      {/* DIE GARDEROBE-BOX IST STILLGELEGT (Owner 13.08.2026, in drei Sätzen: „ich weiss
          zwar nicht warum hier die lingerie immer kommt … aber es ist nicht ok" · „Beim Kuss
          wird es auch nicht angewendet. Der einzige Ort wo es kommen muss ist bei try on" ·
          „und es [soll] wie bei Pooldancing sein — er sucht ein Look aus im Tunel").
          Die Regel dahinter: Garderobe/Look ist eine WAHL IN SCHRITT 2 des Tunnels (wie
          Poledance-Sets, Kuss-Szene+Wäsche, Geburtstags-Looks) — nie eine zweite Frage nach
          der Zahlung. Das Try-on-Produkt bringt seinen Look sowieso mit (der Kunde kommt vom
          Look im Katalog). Ein Aufrufer, für den diese Box je richtig wäre, existiert nicht
          mehr: Kuss war schon raus, Aufnahme-Themen haben keine „sie", die Hochzeit läuft
          über EinladungBauen (kein `variant="wedding"`-Aufrufer im Haus). Der Block bleibt
          vorerst stehen (kleid/moment-Zustände hängen daran), rendert aber NIE — beim
          nächsten Aufräumen darf er ganz weg. */}
      {false && (bezahlt || isStaff) && (kleidung.length > 0 || variant === "wedding") && (
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
            {(<>
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
              <div className="lb-wisch mt-1.5 flex gap-2 overflow-x-auto pb-1">
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
              <div className="lb-wisch mt-1.5 flex gap-2 overflow-x-auto pb-1">
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
            <div className={`lb-wisch mt-1.5 flex gap-2 overflow-x-auto pb-1 ${mehr ?"" : "hidden"}`}>
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
            <div className={`lb-wisch mt-1.5 flex gap-1.5 overflow-x-auto pb-1 ${mehr ?"" : "hidden"}`}>
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
      {/* DIE SZENEN-AUSWAHL IST RAUS (Owner 03.08.2026: „wir machen die ganze Videoauswahl
          raus. Die Leute bekommen ein Zufalls-Video als Überraschung mit Kuss").

          Hier standen acht Kacheln: vier Szenen zu {once} und vier Dessous-Vorlagen zu einem
          zweiten Preis, dazu eine Lupe mit Vollbild und — bei Dessous — noch eine
          Wäsche-Zeile darunter. Das war der längste Teil des Trichters, und er stand genau
          zwischen dem Kunden und dem Kaufknopf.

          EINE ÜBERRASCHUNG IST AUCH EIN BESSERES GESCHENK: Wer eine Kulisse aussucht,
          vergleicht acht Bilder und zweifelt; wer eine geschenkt bekommt, ist überrascht.
          Die Szene zieht `zufallsSzene()` aus denselben vier Prompts, die vorher hinter den
          Kacheln lagen — es geht nichts verloren ausser der Wahl. */}
      {/* DIE ADRESSE STEHT VOR DEM KNOPF (Owner 30.07.2026: „deswegen habe ich die
          emailadresse nicht"). Ein Feld, direkt über „Generate" — kein Konto, kein Passwort,
          keine zweite Seite. Wer angemeldet ist oder schon einmal eingetragen hat, sieht hier
          gar nichts: `adresseDa` steht dann bereits.
          UND ERST NACH DEN FOTOS (Owner 19.08.2026: „verstecke email und zeigen nur wenn er
          bei de uploads gemacht hat"). Vorher stand das Feld hier, sobald die Seite stand —
          fuer jemanden, der ueber die Anzeige direkt auf `?s=3` landet (Commit „Adresse erst
          am Generieren" vom 16.08.), ist das die allererste Frage der ganzen Seite, noch vor
          dem eigenen Bild. `fotosDa` ist wahr, sobald beide Uploads (bzw. der eine bei
          `V.nurSie`) da sind — der Kunde hat dann schon etwas von uns gesehen, bevor wir
          nach seiner Adresse fragen. */}
      {!isStaff && !adresseDa && !bezahlt && fotosDa && (
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
          {vorschlag && !mailFehler && (
            <button type="button" onClick={() => setMail(vorschlag)}
              className="mt-1.5 w-full text-center text-[12px] font-black underline" style={{ color: "#f6cf51" }}>
              {T.mailVorschlag(vorschlag)}
            </button>
          )}
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
      {/* DIE EINE CTA-ZEILE DES TUNNELS (Owner 13.08.2026: „ein mal machst du den back
          button links vom cta und ein mal neben dem bild. Wie jetzt?") — die Regel aus
          Schritt 1 (TunnelStart) und Schritt 2 (Look-Wahl) gilt jetzt auch hier: der
          Zurueck-Chip steht LINKS VOM HAUPT-CTA, nie am Bild. Nur im Tunnel — der alte
          Dialog behaelt seinen Chip an der Vorschau-Zeile (siehe oben). */}
      {/* IST DER FILM DA, IST DIESE ZEILE FERTIG (Owner 14.08.2026: „das braucht man hier
          nicht mehr"). Nach dem fertigen Video stand der Erzeugen-Knopf weiter über der
          Zeile „Bezahlt" — obwohl darunter längst „Dein Video herunterladen" und „Mein
          30-Tage-Programm starten" die einzigen sinnvollen Schritte sind. Bewusst NUR im
          Tunnel und NUR mit vorhandenem `videoUrl`: Wer bezahlt hat, aber noch kein Ergebnis
          sieht (Ausfall beim Anbieter), behält seinen Knopf zum Nachstarten. */}
      {!(tunnelSeite && videoUrl) && (
      <div className={tunnelSeite ? "mt-2 flex items-center gap-2" : ""}>
      {tunnelSeite && (
        <button type="button" onClick={() => setSchritt(alsSchritt(schrittVorKacheln))} aria-label={T.back}
          className="lb-chip grid h-12 w-12 shrink-0 place-items-center rounded-full active:scale-95 transition">
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      <button type="button"
        onClick={() => {
          if (busy || videoBusy || mailBusy || payBusy) return;
          /* SOLANGE DIE AUFNAHME FEHLT, IST DER KNOPF DIE AUFNAHME (Owner 13.08.2026, mit
             Bild des Versprechen-Tunnels: „und hier wurde der preis auch erwähnt, wann der
             angezeigt werden soll" — §22: auf dem Aufnahme-Schritt heisst die Handlung
             „Video aufnehmen", der Preis-CTA kommt erst zur Vorschau, §23). Statt eines
             roten Hinweises „erst aufnehmen" TUT der Knopf das Fehlende gleich selbst. */
          if (tunnelSeite && selbstVideo && !fotosDa) { zustimmen(); void aufnahmeStart(); return; }
          if (!fotosDa) { setGenerateHinweis(V.paarUpload && selPhoto ? T.uploadFirst : T.pickFirst); return; }
          if (!consent) { setGenerateHinweis(T.zustimmungFehlt); return; }
          setGenerateHinweis("");
          void (bezahlt ? kussVideo() : generate());
        }}
        /* NICHT DIMMEN, WENN DER KNOPF DIE AUFNAHME IST (siehe onClick): ein halb
           durchsichtiger Knopf sagt „geht noch nicht" — die Aufnahme geht aber sofort. */
        /* `mt-2` nur im Dialog — im Tunnel traegt die CTA-ZEILE (der Wrapper mit dem
           Zurueck-Chip) den Abstand; ein eigener Rand am Knopf saesse sonst 8px tiefer
           als der Chip daneben. */
        className={`lb-gold ${tunnelSeite ? "" : "mt-2 "}flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-black active:scale-95 transition${((!fotosDa && !(tunnelSeite && selbstVideo)) || !consent || busy || videoBusy || mailBusy || payBusy) ? " opacity-50" : ""}`}>
        {/* PAYBUSY FEHLTE HIER (Owner 03.08.2026: „wieso gehts hier nicht weiter?"). Bei
            `keinGratis`-Themen loest dieser Knopf zuerst `unlock()` aus (Guthaben-Abbuchung
            oder Stripe-Aufladung) — das laeuft ueber `payBusy`, nicht `busy`. Ohne `payBusy`
            hier blieb der Knopf waehrend dieser paar Sekunden unveraendert stehen: kein
            Spinner, kein Hinweis, nichts — wer in dem Moment noch einmal tippte, wirkte wie
            gegen eine Wand. */}
        {/* Das Sinnbild folgt dem Thema — Kuss-Lippen auf dem Knopf eines Tanzvideos sind
            derselbe Fehler wie der Kuss-Werbespruch auf der Hochzeitsseite. */}
        {/* KEINE ZEICHEN IM KAUFKNOPF (Owner 12.08.2026: „auch in dem Button machst du da
            komische zeichen. Die raus und zwar im CI Bibliothek") — der Knopf trägt nur
            Text und Preis; die Regel steht am `Knopf`-Baustein in components/CI.tsx. */}
        {busy || videoBusy || mailBusy || payBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {/* KEIN GRATIS-VERSPRECHEN AUF EINEM KNOPF, DER KEINS EINHAELT (plan.md Punkt 1a).
            `ctaFree` sagt „gratis" — bei der Hochzeit stimmt das seit `keinGratis` nicht
            mehr. `ctaVideo` ist ohnehin schon eigens uebersetzt („Einladung erstellen" u. a.)
            und passt vor wie nach der Zahlung: der Klick loest in beiden Faellen dieselbe
            Handlung aus (unlock zahlt zuerst, dann laeuft generate von selbst weiter). */}
        {/* EIN KNOPF-WORT FUER ALLE TUNNEL (Owner 12.08.2026: „der button muss immer gelch
            bei allen heissen Generate now - Preis.") — auf der Tunnel-Seite heisst der Knopf
            bei JEDEM Produkt gleich: „Generate now — <Preis aus der Tabelle>". Die
            Dialog-Trichter behalten ihre eigenen Worte (ctaVideo/ctaFree). */}
        {/* DER PREIS ERST, WENN ES ETWAS ZU KAUFEN GIBT (Owner 13.08.2026, siehe onClick):
            fehlt der eigene Beitrag noch, traegt der Knopf die HANDLUNG — bei den Aufnahme-
            Themen „Video aufnehmen" (§22 Screen 3), bei den Foto-Themen das nackte
            Knopf-Wort ohne Preis. Erst mit vollstaendigem Beitrag steht „… — 9,99 €". */}
        {busy || videoBusy ? (status || T.rendering) : mailBusy ? T.oneMoment : payBusy ? T.oneMoment
          : tunnelSeite ? (
            /* WER BEZAHLT HAT, SIEHT KEINEN PREIS (Owner 31.07.2026, erneut 14.08.2026:
               „hier steht schon wieder der Preis im Button … als hätt er nicht bezahlt").
               Dieser Zweig fragte als einziger NICHT nach `bezahlt` — der Dialog-Zweig unten
               tut es seit jeher. Nach der Zahlung stand deshalb „… — 9,99 €" direkt über der
               Zeile „Bezahlt — alles hier drunter ist dabei", also zwei Sätze, die einander
               widersprechen. Das Knopf-Wort bleibt für alle Tunnel gleich (Owner 12.08.2026),
               nur die Zahl fällt weg. */
            bezahlt ? T.generateNow
            : fotosDa ? `${T.generateNow} — ${eur(geschenkPreisCents(variant), lang)}`
            : selbstVideo ? (variant === "versprechen" && T.aufCta ? T.aufCta : SW.selbst)
            : T.generateNow)
          : (bezahlt || V.keinGratis) ? T.ctaVideo : T.ctaFree}
      </button>
      </div>
      )}
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
        * HIER STAND DER SATZ ÜBER DIE LÜCKE — und die Lücke gibt es nicht mehr.
        *
        * Er kam am 03.08.2026 vom Owner: „hier muss doch stehen dass das Video {once} kostet
        * aber er muss das Konto mit mindestens {topup} aufladen. Sonst fühlt er sich
        * ausgeraubt." Das war richtig, solange ein Video 1,49 € kostete und die kleinste
        * Aufladung 4,99 € — dazwischen lag ein Rest, den man ansprechen musste.
        *
        * Seit dem 05.08.2026 ist die Aufladung DERSELBE Betrag wie der Preis (Owner: „aufladen
        * muss mann dann mit 14,99€ mindestens"). Es gibt keinen Rest, keine Differenz und
        * nichts zu erklären — und ein Satz, der „der Rest bleibt dir" verspricht, wäre jetzt
        * schlicht falsch. Den Preis nennt der Preis-Chip der Seite und der Kaufknopf (die
        * HandelZeile im Schritt ist seit dem 06.08.2026 raus — Owner: „ohne meine
        * Zustimmung").
        *
        * Der Text bleibt in `lib/kiss-i18n.ts` (`guthabenVorabHinweis`) in sieben Sprachen
        * stehen: Wird die Aufladung je wieder grösser als der Preis, gehört er zurück — und
        * zwar hierher.
        */}
      {/* WAS IHM DIESEN MONAT NOCH ZUSTEHT (Owner 30.07.2026). Ohne diese Zeile weiss ein
          Abonnent nie, wo er steht — und merkt es erst, wenn nichts mehr geht. */}
      {V.abo && aboAktiv && typeof videosLinks === "number" && (
        <p className="mt-1 text-center text-[11px] font-bold text-[#f6cf51]">
          {/* Altbestand groesser als die Abo-Menge (z. B. Seed-Konten): „8083 von 20"
              waere gelogen — dann nur die nackte Zahl. */}
          {videosLinks > INCLUDED_VIDEOS_PER_MONTH
            ? `${videosLinks} 🎬`
            : T.aboAktiv(videosLinks, INCLUDED_VIDEOS_PER_MONTH)}
        </p>
      )}
      {/* Der Nutzungshinweis: Rechte an den Fotos, Alter, Verantwortung. Die Zustimmung zu
          AGB, Datenschutz und Post steht schon bei Schritt 1 (Owner 30.07.2026: „bei ersten
          bild muss schon stehen und mit klick auf weiter akzeptiert er das schon").
          NUR IM ALTEN DIALOG der lange Absatz (Owner-Architektur-Abgleich 12.08.2026, §24):
          der Tunnel bekommt die KURZE Zeile `consentKurz` — dieselbe Zustimmung-durch-
          Handlung (`zustimmen()` beim Klick auf „Erzeugen") bleibt in beiden Fassungen
          unveraendert, nur der TEXT ist hier kürzer. */}
      <p className="mx-auto mt-1.5 max-w-[300px] text-center text-[10px] font-medium leading-snug text-white/45">
        {tunnelSeite ? <KurzeEinwilligung tpl={T.consentKurz} linkLabel={T.agbLink} /> : T.consent}
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
              disabled={!fotosDa || !consent || payBusy}
              className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-[#f6cf51]/60 px-3 text-[12px] font-black text-[#f6cf51] active:scale-95 transition disabled:opacity-40">
              {payBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
              {T.buyOnce}
            </button>
          )}
          {V.abo && (
            <button type="button" onClick={() => void unlock("abo")}
              disabled={!fotosDa || !consent || payBusy}
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
      {/* NICHT AUF DER TUNNEL-SEITE (Owner 12.08.2026, mit Bild der Zeile: „das raus").
          Der Tunnel ist „super einfach" — der Einwilligungssatz am Generieren-Knopf deckt
          das Private ab. In den Dialog-Trichtern der anderen Produkte bleibt die Zeile
          (Owner 30.07.2026: „du musst sagen dass die Bilder überall privat bleiben"). */}
      {!tunnelSeite && (
      <p className="mx-auto mt-2 max-w-[320px] text-center text-[11px] font-bold leading-snug text-white/60">
        {T.privat}
      </p>
      )}
      {/* NICHT ZWEIMAL DASSELBE (Owner 14.08.2026: „komisch dass loading im button ist").
          Solange gearbeitet wird, TRÄGT der Knopf oben bereits `status` als sein Wort — diese
          Zeile schrieb denselben Satz ein zweites Mal darunter. Sie bleibt für alles andere
          stehen, was `status` sonst meldet (Absagen, Hinweise nach einem Fehlschlag); nur
          während der Arbeit schweigt sie. */}
      {status && !busy && !videoBusy && (
        <p className="mt-2 text-center text-[12px] font-bold text-white/60">{status}</p>
      )}

      {/* DER TEILEN-DIALOG: erst wissen, dann öffentlich (Owner 01.08.2026). */}
      {/* DAS UPLOAD-TOR (Owner 03.08.2026: „sie dürfen nicht ein Mal hochladen ohne Email
          anzugeben"). Steht VOR jedem ersten Foto — `onFile`/`onModelFile` oeffnen es statt
          hochzuladen, sobald `adresseDa` fehlt, und legen das Foto in `gateDatei` beiseite.
          Kein Abbrechen-Kreuz: ohne Adresse gibt es kein Foto, das man stattdessen zeigen
          koennte — schliessen hiesse nur, das Foto stillschweigend zu verwerfen. */}
      {/* DER AUFLADE-WAEHLER (Owner 03.08.2026: „biete beide an") — seit dem 10.08.2026 aus
          der Bibliothek (`AufladeWaehler` in components/CI.tsx). Hier stand er in voller
          Länge: Adresse, Anmelde-Einladung, rote Begründung, Beträge, Siegel, Garantie —
          rund 190 Zeilen, die es in der Einladung (`EinladungBauen`) ein zweites Mal gab,
          nur ohne all das. Ein Fenster, hinter dem Geld fliesst, darf es nicht zweimal
          geben (Owner: „Der Tunel ab Bezahlung kannst du bei allen gleich machen").
          Abbrechen ist erlaubt: Anders als beim Upload-Tor geht hier nichts verloren,
          die Wahl steht ja noch. */}
      {/**
        * DAS KASSEN-FORMULAR IN DER SEITE (15.08.2026). Steht ein `client_secret`, rendert
        * Stripe hier — sonst nichts. Schliessen laesst den Auftrag unberuehrt: Der Kunde kann
        * jederzeit erneut auf Kaufen tippen (Hausregel `immer-close-einbauen`).
        */}
      {/* OHNE eigene Ueberschrift: Stripe nennt das Produkt in seinem Formular schon selbst
          („Future Self Program"). Eine zweite Zeile darueber — noch dazu die Werbezeile
          `vorlagenTitel` („Aus einem Satz wird ein Beweis") — sagt an der Kasse nichts. */}
      {/**
        * `key={kasseSecret}` IST HIER PFLICHT, KEIN SCHMUCK (15.08.2026).
        *
        * Stripes Provider nimmt ein neues `client_secret` NICHT an — die Bibliothek sagt es
        * woertlich: „You cannot change the client secret after setting it. Unmount and create
        * a new instance". Ohne den Schluessel blieb beim ZWEITEN Tippen auf Kaufen die ERSTE
        * Kassensitzung stehen: Der Server legte brav eine neue an, der Kunde sah unveraendert
        * die alte — und weil das Formular schon im Bild stand, sah es aus, als passiere beim
        * Tippen ueberhaupt nichts.
        *
        * Der Schluessel wechselt mit jeder Sitzung, React haengt die alte aus und die neue
        * ein. Damit stimmt auch der Betrag wieder, wenn sich zwischen zwei Anlaeufen etwas
        * am Auftrag geaendert hat.
        */}
      {kasse.block}
      {aufladeWahl && (
        <AufladeWaehler
          lang={lang} stand={guthabenCents} preis={videoPreisCents}
          mail={mail}
          setMail={m => { setMail(m); if (mailFehler) setMailFehler(""); }}
          adresseSpeichern={adresseSpeichern}
          mailFehler={mailFehler} mailBusy={mailBusy} vorschlag={vorschlag}
          angemeldet={angemeldet} aufAnmelden={zurAnmeldung}
          aufladungNull={aufladeNull} busy={payBusy}
          aufStufe={stufe => { setAufladeWahl(false); setAufladeNull(false); void unlock("auflade", undefined, stufe); }}
          zu={() => setAufladeWahl(false)} />
      )}

      {gateOffen && (
        /* DER CI-DIALOG (components/CI): Rand-Tipp und Scheiben-Kreuz schliessen — beides
           eingebaut, nicht abwählbar (Owner 06.08.2026: „hier kann der user den Dialog gar
           nicht mehr schliessen"). Die Adresse bleibt Pflicht fürs ERZEUGEN; das Tor öffnet
           beim nächsten Versuch einfach wieder. */
        <Dialog zu={() => setGateOffen(false)}>
            {/* `px-7`, damit die Zeile NIE unter das Kreuz läuft (Owner 06.08.2026: „Das X
                klebt an der Schrift") — symmetrisch, weil der Titel zentriert ist. */}
            <p className="mt-1 px-7 text-[16px] font-black leading-snug" style={{ color: "#1a160f" }}>{T.gateTitel}</p>
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
            {/* Der beste Ort fuer den Tippfehler ist der, an dem er entsteht — hier faengt
                ihn ein Tipp ab, statt spaeter an der Kasse Geld auf ein totes Konto zu legen. */}
            {vorschlag && !mailFehler && (
              <button type="button" onClick={() => setMail(vorschlag)}
                className="mt-1.5 text-[12px] font-black underline" style={{ color: "#a97d1e" }}>
                {T.mailVorschlag(vorschlag)}
              </button>
            )}
            <button type="button" onClick={() => void gateWeiter()} disabled={mailBusy}
              className="lb-gold lb-buy mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full font-black active:scale-95 transition disabled:opacity-60">
              {mailBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {T.gateWeiter}
            </button>
            <p className="mt-3 text-center text-[10px] font-medium leading-snug text-black/50">
              {T.privat}
            </p>
        </Dialog>
      )}

      {/* DAS AUFNAHME-VOLLBILD — auf der obersten Ebene, damit JEDER Auslöser es erreicht
          (Geburtstags-Schritt 1 UND Versprechen-Kachel in Schritt 3; Owner 12.08.2026:
          „selbst aufnehmen öffent nichts" — vorher hing es im Geburtstags-Zweig fest).
          Es gate sich selbst über `nimmtAuf` und ist ein Portal an document.body. */}
      {aufnahmeUeberlagerung}
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
        {/* NUR, WENN DIE KARTE NICHT SCHON RENDERT (Uebergabe 2b: „Der Radar existiert
            doppelt"). Beim Kuss gibt es kein Gratis-Bild, also blieb `bild` waehrend des
            ganzen bezahlten Laufs leer — und dieser Radar lief die volle Zeit ZUSAETZLICH zur
            Anzeige in der Karte. Zwei Ladeanzeigen fuer einen Vorgang lesen sich wie zwei
            Vorgaenge; die in der Karte ist die, auf die er schaut. */}
        {/* OHNE GRATIS-BILD GIBT ES DIESEN KASTEN GAR NICHT MEHR (Owner 03.08.2026: „wieso
            rendert er schon wieder woanders … du sollst es richtig machen in der Karte").
            `!karteRendert` allein reichte nicht: In dem Moment, in dem ein Lauf SCHEITERTE,
            ging die Schicht in der Karte aus — und dieser Kasten sprang an ihre Stelle, weit
            unterhalb. Bei Kuss, Hochzeit und Tanz ist die Karte die einzige Buehne; die
            Absage steht jetzt dort (siehe `karteAbsage`). Themen MIT Gratis-Bild behalten den
            Kasten, dort ist er die einzige Anzeige. */}
        {(busy || videoBusy || (bezahlt && !isStaff)) && !karteRendert && !V.keinGratis && !videoUrl && !bild && !!(selPhoto || photo) && (
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
          <div className="mx-auto mt-4 w-full max-w-[340px] rounded-3xl border border-[#f6cf51]/30 lb-goldhauch p-5 text-center">
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
          <div className="mx-auto mt-4 w-full max-w-[340px] rounded-3xl border border-[#f6cf51]/30 lb-goldhauch p-5 text-center">
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
          <div className="mx-auto mt-4 w-full max-w-[340px] rounded-3xl border border-[#f6cf51]/30 lb-goldhauch p-5 text-center">
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
            <button type="button" onClick={() => setAufladeWahl(true)} disabled={payBusy}
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
            {/* HIER STAND DAS VIDEO EIN ZWEITES MAL (Owner 03.08.2026: „wieso das Video jetzt
                unten?").

                Es war der letzte Rest des alten Ergebnis-Blocks: Der wurde am 31.07. in die
                KARTE aufgeloest, „der Video-Spieler darunter blieb" — und genau das stand als
                Notiz eine Zeile hoeher, ohne dass jemand die Folge gezogen haette. Sobald das
                Video fertig war, lief dasselbe Bild zweimal untereinander: oben in der Karte
                mit Rahmen, Zurufen und Ton-Knopf, darunter nackt in einem grauen Kasten — mit
                `loop`, also mit dem harten Schnitt, den wir ueberall sonst abgeschafft haben.

                Es faellt nur auf, WENN ein Video existiert. Deshalb hat es den Umbau
                ueberlebt: Auf einer frischen Seite sieht man es nie.

                Der Herunterladen-Knopf bleibt — er ist der Grund, warum dieser Block
                ueberhaupt da ist. */}
            {/* DAS ERGEBNIS BEKOMMT EINEN SATZ (Owner-Folgeauftrag 12.08.2026, ChatGPT-
                Papier §26) — nur beim Versprechen, direkt unter der Karte mit dem fertigen
                Film, bevor der Herunterladen-Knopf kommt. */}
            {variant === "versprechen" && T.ergebnisTitel && (
              <div className="text-center">
                <p className="text-[14px] font-black text-white/90">{T.ergebnisTitel}</p>
                {T.ergebnisText && (
                  <p className="mx-auto mt-1 max-w-[340px] text-[12px] font-semibold leading-snug text-white/65">
                    {T.ergebnisText}
                  </p>
                )}
              </div>
            )}
            {/* ZWEITRANGIG, NICHT GLEICHRANGIG (Owner 14.08.2026: „das ist ein secondary
                button"). Herunterladen und „30-Tage-Programm starten" standen beide als
                Haupt-CTA da — zwei gleich laute Knöpfe sind keine Führung. Der Hauptweg nach
                dem Film ist das Programm; das Herunterladen bekommt die Zweitrolle. Dafür
                gibt es die Hausklasse `.lb-black3d`, in globals.css ausdrücklich als
                Gegenstück zu `.lb-gold` beschrieben — sie bringt ihren eigenen Grund mit und
                sieht deshalb in beiden Fassungen richtig aus. */}
            <a href={videoUrl} download={V.done} target="_blank" rel="noreferrer"
              className="lb-black3d mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full text-[14px] font-black active:scale-95 transition">
              {T.download}
            </a>
            {/**
              * DERSELBE PROGRAMM-KNOPF, JETZT NEBEN DEM FERTIGEN FILM (11.08.2026, Owner:
              * „wo ist der link zum plan?"). Wer bis hierher wartet, hat den Knopf oben in
              * der Render-Schicht evtl. schon gesehen — hier steht er noch einmal, weil der
              * Future Film der natuerliche Moment ist, das 30-Tage-Programm zu oeffnen.
              */}
            {/* AUS DER BIBLIOTHEK (Owner 12.08.2026, siehe `Knopf href` in CI.tsx). */}
            {variant === "versprechen" && !!programUrl && T.programmKnopf && (
              <Knopf href={programUrl} className="mt-3">
                {T.programmKnopf}
              </Knopf>
            )}
            {/**
              * ZURÜCK VOM ERGEBNIS (Owner 07.08.2026 abends: „und hier kann ich nicht
              * zurück"). Das fertige Video war eine Sackgasse: Herunterladen oder gar
              * nichts. Derselbe Weg wie beim Kuss-„Noch ein Video": frischer Auftrag
              * (der alte ist mit seinem einen Video abgegolten und bleibt in der
              * Galerie), Zustand zurück auf „vor der Zahlung" — Aufnahme und Look
              * stehen noch, ein Tipp auf Generieren zahlt und startet normal.
              */}
            {variant === "birthday" && (
              <button type="button" disabled={payBusy || videoBusy}
                onClick={() => void (async () => {
                  let device = "";
                  try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
                  const log = await fetch("/api/kiss-log", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ theme: variant, modelId: selId, modelName: selName, device, lang, email: mail.trim(),
                      ...(customModel ? { modelImage: customModel } : {}) }),
                  }).then(r => r.json()).catch(() => null);
                  if (log?.id) genMerken(log.id);
                  setVideoUrl(""); setVideoPoster(""); setBezahlt(false); setStatus("");
                  setGesperrt(false); setErstattet(false); setErstattScharf(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                })()}
                className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/20 text-[13.5px] font-black text-white active:scale-95 transition disabled:opacity-60">
                <RefreshCw className="h-4 w-4" /> {T.nochmalVideo}
              </button>
            )}

            {/**
             * GELD ZURUECK, OHNE UNS ZU SCHREIBEN (Owner 03.08.2026: „hier gehoert eigentlich
             * ein Refund").
             *
             * Die Route gab es schon (`/api/kiss-erstattung`) — es fehlte der Knopf. Sie zahlt
             * EINMAL je Auftrag, nur wenn bezahlt UND geliefert wurde, und schreibt aufs
             * Guthaben statt auf die Karte: Das ist sofort da, kostet keine Stripe-Gebuehr und
             * laesst ihn es gleich noch einmal versuchen.
             *
             * ZWEI TIPPS, KEIN SYSTEMDIALOG — dieselbe Hausregel wie beim Loeschen: Der erste
             * Tipp faerbt rot, der zweite fuehrt aus, nach drei Sekunden ist er wieder harmlos.
             *
             * Er steht UNTER dem Herunterladen-Knopf und in schlichtem Grau: Wer zufrieden ist,
             * soll ihn nicht als Erstes sehen. Wer es nicht ist, findet ihn genau dort, wo er
             * sucht — statt uns zu schreiben und drei Tage zu warten.
             */}
            {!!genId && bezahlt && (
              erstattet ? (
                <p className="mt-2 text-center text-[12px] font-black text-[#f6cf51]">{T.erstattet}</p>
              ) : (
                <button type="button" disabled={erstattBusy}
                  onClick={async () => {
                    if (!erstattScharf) {
                      setErstattScharf(true);
                      setTimeout(() => setErstattScharf(false), 3000);
                      return;
                    }
                    setErstattScharf(false); setErstattBusy(true);
                    try {
                      const r = await fetch("/api/kiss-erstattung", {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ genId, email: (mail || aktiveAdresse() || "").trim() }),
                      });
                      const d = await r.json().catch(() => ({}));
                      /* Der Konto-Chip oben zieht sofort nach — sonst steht das Geld schon auf
                         dem Konto und der Kunde sieht es erst beim naechsten Laden. */
                      if (r.ok && d?.ok) { setErstattet(true); try { window.dispatchEvent(new Event("lb-guthaben-neu")); } catch { /**/ } }
                      else setStatus(String(d?.error || T.statusNetwork));
                    } catch { setStatus(T.statusNetwork); }
                    setErstattBusy(false);
                  }}
                  className={`mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-full text-[12px] font-black transition active:scale-95 ${
                    erstattScharf ? "bg-red-600 text-white" : "border border-white/20 text-white/60"}`}>
                  {erstattBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {erstattScharf ? T.erstattenSicher : T.erstatten}
                </button>
              )
            )}

            {/**
             * NOCH EINS, MIT EINEM ANDEREN LOOK (Owner 03.08.2026: „hier habe ich eine
             * Sackgasse. Ich müsste hier doch ‚Generate new‘ mit einem anderen Look").
             *
             * Steht UNTER dem Herunterladen-Knopf, nicht darueber: Erst bekommt er, wofuer er
             * bezahlt hat, dann das Angebot. Umgekehrt waere es ein Verkaufsgespraech vor der
             * Lieferung.
             *
             * Ein Tipp genuegt. Dahinter laeuft genau der Weg, den der Owner am selben Tag
             * gefordert hat („das muss am Stueck passieren"): frischer Auftrag, stille
             * Abbuchung vom Guthaben, der Wachhund erzeugt. Kein Kasten, keine Rueckfrage.
             */}
            {!!videoUrl && V.nurSie && garderobe.length > 0 && (
              <div className="mt-6">
                <p className="text-center text-[12.5px] font-black text-white">{T.nochEins}</p>
                <p className="mt-0.5 text-center text-[11.5px] font-semibold text-white/60">
                  {fillPrices(T.nochEinsPreis, lang)}
                </p>
                <div className="lb-wisch -mx-4 mt-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-2">
                  {garderobe.map(l => (
                    <button key={l.id} type="button" disabled={videoBusy || payBusy}
                      onClick={async () => {
                        /* Das gewaehlte Stueck merken, damit `refOutfit` es nimmt — und dann
                           denselben nahtlosen Weg gehen wie beim zweiten Video. */
                        setNeuerLook(l.imageUrl);
                        setStatus(T.oneMoment);
                        let device = "";
                        try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
                        const log = await fetch("/api/kiss-log", {
                          method: "POST", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ theme: variant, device, lang, email: mail.trim(), personImage: photo }),
                        }).then(r => r.json()).catch(() => null);
                        if (log?.id) {
                          genMerken(log.id);
                          setBezahlt(false); setVideoUrl(""); setBild("");
                          void unlock("once", log.id);
                          return;
                        }
                        setStatus(T.statusCouldNotStart);
                      }}
                      className="w-[92px] shrink-0 snap-start overflow-hidden rounded-xl border-2 border-white/20 bg-white transition active:scale-95 disabled:opacity-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={l.imageUrl} alt="" draggable={false} className="aspect-[3/4] w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
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
                          {...(karteVerhaeltnis ? { verhaeltnis: karteVerhaeltnis } : {})}
                          {...(eigenerTon ? { originalton: true, schleife: false, musik: "" } : {})}
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
              <div className="mt-3 rounded-2xl border border-[#f6cf51]/30 lb-goldhauch p-4 text-center">
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
