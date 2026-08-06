"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Loader2, ImageUp, Sparkles, Trash2 } from "lucide-react";
import EinladungKarte, { KARTE_TEXTE } from "@/components/EinladungKarte";
import EinladungAnsicht from "@/components/EinladungAnsicht";
import KartenKarussell from "@/components/KartenKarussell";
import UploadKachel from "@/components/UploadKachel";
import TeilenKnopf from "@/components/TeilenKnopf";
import { TEILEN_TEXT } from "@/components/BeispielGalerie";
import { Eingabe, Fehlerzeile, Knopf, MadeBy } from "@/components/CI";
import ImageCropper from "@/components/ImageCropper";
import FotoAnleitung from "@/components/FotoAnleitung";
import { kissText } from "@/lib/kiss-i18n";
import { weddingPrompt, WEDDING_SZENEN, KISS_LOOK_ID } from "@/lib/wedding-prompt";
import { holidayInvitePrompt, HOLIDAY_SZENEN } from "@/lib/holiday-invite";
import { gutscheinPrompt } from "@/lib/gutschein-prompt";
import { guthabenLesen } from "@/lib/guthaben-konto";
import { AUFLADE_STUFEN, ONCE_CENTS, GUTSCHEIN_CENTS, GUTSCHEIN_STUFEN, eur, themenPreisCents, type ThemenSchluessel } from "@/lib/pricing";
import { fillPrices } from "@/lib/pricing";

/**
 * JEDES TOPIC ALS GUTSCHEIN (Owner 06.08.2026: „jeder Topic als Gutschein einfügen" ·
 * „eigentlich muss man jede Topic als Geschenk anbieten können … noch einfacher ist es, man
 * sendet das als Gutschein"). Die Karte ist der Geschenkweg für alle Themen: Der Käufer legt
 * ein LuxuryBandit-Geschenk bei, das Guthaben dafür landet auf der E-Mail des Beschenkten —
 * die ist zugleich sein Login. Namen und Preise kommen aus EINER Quelle je Seite
 * (KARTE_TEXTE.gutscheinTopics · themenPreisCents); der Chat fehlt, bis er aus dem Guthaben
 * zahlbar ist (Begründung in app/api/gutschein-checkout).
 */
const LB_TOPICS: ThemenSchluessel[] = ["kiss", "birthday", "surprise", "holiday", "wedding"];

/**
 * DER NOTNAGEL FÜR DIE RÜCKKEHR AUS DER KASSE (06.08.2026: „das hat schon mal nicht
 * geklappt"). Hier liegt die Stripe-Sitzungsnummer des Gutschein-Kaufs, gesetzt BEVOR die
 * Seite gewechselt wird. Kommt der Besucher ohne `?cs=…` zurück — verlorene Weiterleitung,
 * App-Wechsel auf dem Handy, wiederhergestellter Tab —, löst der Effekt beim Mounten sie von
 * hier ein. Doppelt einlösen ist ungefährlich: gebucht wird idempotent je Sitzungsnummer.
 */
const GUTSCHEIN_CS = "lb_gutschein_cs";

/**
 * BEISPIEL-INHALT FÜR DIE LEERE KARTE (Owner 02.08.2026 abends: „in der Karte muss doch
 * stehen ein Beispiel eines Namens und eine schöne Adresse").
 *
 * Vorher fiel jedes leere Feld auf seine eigene Formularbeschriftung zurück — „Ihr Vorname",
 * „Prenumele ei" stand dann wörtlich auf der Karte, wie ein Formular, nicht wie eine
 * Einladung. Ein echtes Beispiel zeigt sofort, wie GUT das Ergebnis aussieht, sobald man es
 * ausfüllt hat — dieselbe Karte, die schon leer überzeugen soll.
 *
 * Namen bewusst NICHT je Sprache übersetzt (Namen übersetzt man nicht) — „Ana & Mihai" ist
 * dieselbe Geschichte, die auch die Gruppenchat-Demo auf der Themenseite erzählt.
 * Ort/Adresse waren fast wortgleich schon einmal in `app/themes/wedding/page.tsx` als
 * `BEISPIEL_ORT`/`BEISPIEL_ADRESSE` vorhanden, wurden aber nie verwendet und darum als toter
 * Code entfernt (Änderungsplan Ä6) — hier ziehen sie um an die Stelle, wo sie tatsächlich
 * gebraucht werden: die Bau-Karte selbst, nicht die Themenseite.
 */
const BEISPIEL_SIE = "Ana";
const BEISPIEL_ER = "Mihai";
const BEISPIEL_ORT: Record<string, string> = {
  de: "Schlosshotel Grunewald", en: "The Old Manor House", ro: "Casa Timiș",
  es: "Hacienda Los Olivos", fr: "Château de Villandry", pt: "Quinta da Aveleda", it: "Villa Bellosguardo",
};
const BEISPIEL_ADRESSE: Record<string, string> = {
  de: "Musterstraße 12, 14193 Berlin", en: "12 Sample Lane, SW1A 1AA London",
  ro: "Str. Exemplu 12, 106100 Sinaia", es: "Calle Ejemplo 12, 28001 Madrid",
  fr: "12 rue Exemple, 75008 Paris", pt: "Rua Exemplo 12, 1200-001 Lisboa",
  it: "Via Esempio 12, 00187 Roma",
};

/**
 * DER BEISPIEL-ORT DES URLAUBS (04.08.2026).
 *
 * „Schlosshotel Grunewald, Musterstraße 12, 14193 Berlin" ist ein Hochzeitssaal mit einer
 * Anfahrt — auf einer Urlaubs-Einladung liest sich das wie ein Fehler. Beim Urlaub ist der
 * ORT das Versprechen (er geht sogar in den Video-Auftrag, siehe `holidayInvitePrompt`), und
 * die zweite Zeile sagt nicht, wo der Saal steht, sondern wie lange man bleibt.
 *
 * Ein Ziel, das es wirklich gibt, und keine Musterstraße: Wer „Teneriffa" liest, sieht sofort
 * seinen eigenen Urlaub darin — bei „Musterort 12" sieht er ein Formular.
 */
const BEISPIEL_ORT_URLAUB: Record<string, string> = {
  de: "Teneriffa", en: "Tenerife", ro: "Tenerife", es: "Tenerife",
  fr: "Tenerife", pt: "Tenerife", it: "Tenerife",
};

/**
 * DIE KARTE IST DIE BEDIENUNG.
 *
 * Owner 31.07.2026: „oder er sieht die Landingpage direkt auf dieser Seite und drückt auf das
 * Bild und öffnet sich ein Dialog … er klickt auf Name, dann öffnet sich Dialog, er klickt auf
 * Ort, öffnet sich Dialog. Dann hat er's zum Sharen direkt."
 *
 * Davor stand ein Trichter mit vier Schritten davor, und der Owner sagte zu Recht: „so versteht
 * es kein Mensch." Der Unterschied ist nicht die Zahl der Felder, sondern die Reihenfolge des
 * Verstehens: Wer zuerst die fertige Karte sieht, weiß sofort, was er baut, und füllt sie aus
 * wie ein Formular, das er schon kennt. Wer zuerst vier Schritte sieht, muss sich das Ergebnis
 * vorstellen — und die meisten tun das nicht, sie gehen.
 *
 * Es ist DIESELBE Karte, die der Gast später bekommt: gleiche Datei, gleiche Ornamente, gleiche
 * Maße. Was hier steht, steht dort.
 */

type Feld = "namen" | "wann" | "wo" | "fotos" | "botschaft" | null;

/**
 * WIE LANG DIE BOTSCHAFT WERDEN DARF (Owner 04.08.2026: „vielleicht will derjenige mehr
 * schreiben").
 *
 * 300 Zeichen sind vier bis fünf Zeilen — genug für einen echten Gedanken („ich hab schon
 * geschaut, im November ist es da noch warm …") und wenig genug, dass die Karte eine Karte
 * bleibt und kein Brief. Ohne Grenze kippt das Verhältnis von Bild zu Text, und die Karte
 * sieht auf einem Handy aus wie eine Textnachricht mit Foto.
 */
const BOTSCHAFT_MAX = 300;

const dateiZuDataUrl = (f: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result ?? ""));
    r.onerror = rej;
    r.readAsDataURL(f);
  });

/* DIESELBEN PLATZHALTER WIE IM KUSS (`lib/geschenke`): ein Frauen- und ein Männergesicht,
   gross und gut belichtet. Kein zweiter Satz Beispielbilder, der auseinanderlaufen kann. */
const PLACEHOLDER_FRAU = "/kiss-woman-placeholder.jpg";
const PLACEHOLDER_MANN = "/kiss-placeholder.jpg";

export default function EinladungBauen({ lang, beispielVideo = "", beispielVideos, variant = "wedding" }: {
  lang: string;
  /**
   * WELCHE EINLADUNG (Owner 04.08.2026: „du machst eine Invitation für Urlaub an jemandem …
   * es ist dasselbe Modul").
   *
   * Eine Variante, keine zweite Datei — genau wie `kissText` es schon für Kuss, Idol, Tanz
   * und Geburtstag macht. Jede Korrektur an dieser Karte (Zuschnitt, Zustimmung, Kasse,
   * serverseitige Lieferung, sieben Sprachen) gilt damit für beide Anlässe; eine Kopie
   * müsste jede davon zweimal bekommen und wäre nach der ersten Woche auseinandergelaufen.
   *
   * Der Unterschied ist klein und steht an genau drei Stellen: die Texte (`kissText`), die
   * Szenen samt Auftrag (`weddingPrompt` bzw. `holidayInvitePrompt`) und das Thema, das an
   * Kiss-Log, Vorschau und Einladung mitgeht.
   */
  /**
   * DIE DRITTE VARIANTE: DER GUTSCHEIN (Owner 05.08.2026: „Man, wir haben doch einen Trichter.
   * Du hast den verlassen." — nachdem daneben ein zweites Bauteil entstanden war).
   *
   * Und sie ist die erste, bei der KEIN Video erzeugt wird. Hochzeit und Urlaub setzen zwei
   * Menschen in eine Szene; beim Gutschein gibt es weder eine zweite Person noch eine Szene.
   * Es gibt IHN — ein Video von sich, oder unser fertiges — und SEINEN GUTSCHEIN, und der ist
   * nur ein Link. Deshalb faellt hier alles weg, was mit Szene, Datum und Ort zu tun hat.
   */
  variant?: "wedding" | "holiday" | "gutschein";
  /**
   * DAS BEISPIELVIDEO IN DER LEEREN KARTE (Owner 31.07.2026: „ich sehe die Karte hat kein
   * Video. Muss ein Video haben, sonst kann er sich nicht vorstellen").
   *
   * Er hat recht, und es ist der Kern der ganzen Seite: Die Karte soll zeigen, was entsteht.
   * Ein leerer Rahmen mit einem Hochlade-Zeichen zeigt, was FEHLT — das ist das Gegenteil.
   * Wer die Braut im Kleid sieht und den Hochzeitsmarsch hoert, weiss in zwei Sekunden,
   * wofuer er sein Foto hergibt.
   *
   * Es ist dasselbe Video, das im Themenkatalog laeuft — kein zweiter Ort, an dem jemand
   * eins nachtragen muesste. Fehlt es, faellt die Karte auf das Hochlade-Feld zurueck.
   */
  beispielVideo?: string;
  /**
   * MEHRERE BEISPIELE IN DERSELBEN KARTE (Owner 04.08.2026: „du machst mir die weiteren
   * Videos in der einen Karte, die da ist, als nachfolgende. Wie Karussell").
   *
   * Vorher lag jedes weitere Beispiel in einer EIGENEN Karte darunter. Für eine Galerie ist
   * das richtig; hier oben schob es das Formular aus dem Bild und liess offen, welche der
   * Karten gerade gemeint ist. Jetzt eine Karte, in der man wischt.
   *
   * Leer oder einelementig verhält es sich wie `beispielVideo` — dann gibt es nichts zu
   * wischen und auch keine Punkte.
   */
  beispielVideos?: string[];
}) {
  const T = KARTE_TEXTE[lang] ?? KARTE_TEXTE.en;
  const F = kissText(lang, variant);
  const urlaub = variant === "holiday";
  /**
   * DER GUTSCHEIN VERHAELT SICH WIE DER URLAUB — mit drei Ausnahmen, die unten stehen: keine
   * Szene, keine zweite Person, kein Datum. Deshalb dieser zweite Schalter statt eines
   * dritten Zweigs ueberall: `botschaftFrei` fasst zusammen, was BEIDE koennen (eine freie
   * Botschaft statt Menuewahl), `gutschein` nur das, was ausschliesslich hier gilt.
   */
  const gutschein = variant === "gutschein";
  const botschaftFrei = urlaub || gutschein;
  /* Ein Beispiel oder viele — der Rest des Bausteins fragt nur noch diese eine Liste. */
  const beispiele = (beispielVideos?.length ? beispielVideos : (beispielVideo ? [beispielVideo] : [])).filter(Boolean);
  /* Die Szenen beider Anlässe auf eine Form gebracht: Kennung, Name, Kachel (die beim Urlaub
     fehlen darf). Der Kuss-Schalter der Hochzeit interessiert die Auswahl nicht — er steckt
     im Auftrag, nicht in der Kachel. */
  /* Beim Gutschein bleibt die Liste LEER: Es wird nichts erzeugt, also gibt es nichts zu
     waehlen. Eine leere Liste blendet den ganzen Szenen-Schritt aus, ohne dass an zehn
     Stellen ein `gutschein &&` stehen muss. */
  const SZENEN: { id: string; name: string; kachel?: string }[] =
    gutschein ? [] : urlaub ? HOLIDAY_SZENEN : WEDDING_SZENEN;

  /* FREMDE GUTSCHEINE SIND ABGESCHAFFT (Owner 06.08.2026: „wir machen keine fremde
     gutscheine mehr. Da wir ehe keiner machen. Also raus."). Hier stand das Link-Feld für
     den Händler-Gutschein; verschenkt wird nur noch UNSERES — Produkt oder Guthaben. */
  /**
   * DER BEIGELEGTE TOPIC-GUTSCHEIN. `lbGekauft` steht erst, wenn die Kasse „bezahlt" gemeldet
   * hat — Betrag und Thema kommen aus der SERVER-Antwort, nicht aus dem Klick. Die
   * Sitzungsnummer geht beim Verschicken mit; die Einladungs-Route liest das Etikett dann
   * noch einmal direkt bei Stripe nach (Skill `bezahlung` §3).
   */
  const [lbGekauft, setLbGekauft] = useState<{ topic: string; cents: number; session: string } | null>(null);
  const [lbMail, setLbMail] = useState("");
  const [lbFehler, setLbFehler] = useState("");
  const [lbBusy, setLbBusy] = useState(false);
  /** Läuft gerade der Kauf GENAU dieses Chips? Steuert nur den Spinner darauf. */
  const [lbLaeuft, setLbLaeuft] = useState("");
  /**
   * DIE AUSWAHL VOR DER KASSE (Owner 06.08.2026: „wie wählt er unser Produkt aus oder
   * Credit?" · „er muss nur den kredit oder das produkt bezahlen, dass ers verschenken
   * möchte"). `topic: ""` heisst nacktes Guthaben in Höhe von `cents`. Bezahlt wird beim
   * Tipp auf den Kaufknopf — die Karte selbst kostet nichts.
   */
  const [lbWahl, setLbWahl] = useState<{ topic: string; cents: number } | null>(null);
  /**
   * ZUERST DAS GUTHABEN, DANN STRIPE (Owner 05.08.2026: „eigentlich sollte zuerst Dialog
   * kommen, Konto aufladen, dann kommt Stripe" · „hier öffnet sich direkt Stripe").
   *
   * UND DER WÄHLER KOMMT NUR, WENN ES NICHT REICHT (Owner am selben Abend: „und das kommt,
   * falls er nicht genügend Geld hat"). Wer schon aufgeladen hat, tippt auf kaufen und es
   * passiert — ein Dialog, der auch dem Zahlenden im Weg steht, kostet genau die Kunden, die
   * schon bezahlt haben.
   *
   * Dasselbe Muster wie im Kuss (`KissFunnel`, `V.nurGuthaben`), dieselbe Kasse
   * (`kiss-video-checkout` kennt `aufladen` und `topupCents`) — nur hier verdrahtet. Die
   * Regeln stehen im Skill `bezahlung`.
   */
  const [guthabenCents, setGuthabenCents] = useState<number | null>(null);
  const [aufladeWahl, setAufladeWahl] = useState(false);
  /**
   * WAS DER AUFLADE-WÄHLER DANACH KAUFEN SOLL. Die Stufen ersetzen den Kaufknopf — aber
   * welchen? Bild, gleich-Video und das nachträgliche Aufwerten sind drei verschiedene Käufe
   * mit drei verschiedenen Fortsetzungen. Vorher rief die Stufe stumpf `bezahlen(false, …)`
   * auf: Der Video-Wunsch war vergessen, und nach der Zahlung ging es nirgends weiter —
   * bezahlt, aber keine Erzeugung, kein Ergebnis (Owner 05.08.2026: „die Zahlung geht
   * nicht"). Jetzt merkt sich der Wähler den unterbrochenen Kauf und steigt nach dem
   * Aufladen wieder GENAU DORT ein.
   */
  const [aufladeZiel, setAufladeZiel] = useState<"bild" | "video" | "aufwerten">("bild");

  /** Was diese Karte kostet — aus der Tabelle, nie hier getippt. */
  const preisCents = gutschein ? GUTSCHEIN_CENTS : ONCE_CENTS;
  const [feld, setFeld] = useState<Feld>(null);
  const [sie, setSie] = useState("");
  const [er, setEr] = useState("");
  const [datum, setDatum] = useState("");
  /**
   * DER LETZTE TAG — nur beim Urlaub (Owner 04.08.2026: „das Datum von wann bis wann").
   *
   * FREIWILLIG, und das mit Absicht: Wer jemanden fragt, ob er mitkommt, hat meistens noch
   * nicht gebucht. Ein Pflichtfeld zwänge zu einer Zahl, die noch niemand kennt — bleibt es
   * leer, steht auf der Karte einfach der eine Tag statt eines Zeitraums.
   */
  const [bisDatum, setBisDatum] = useState("");
  /** Die Botschaft unter dem Bild. Leer heisst: der Vorgabesatz gilt (siehe `botschaftText`). */
  const [botschaft, setBotschaft] = useState("");
  const [ort, setOrt] = useState("");
  const [adresse, setAdresse] = useState("");
  const [telefon, setTelefon] = useState("");
  const [mail, setMail] = useState("");

  /**
   * DEN KONTOSTAND HOLEN, SOBALD EINE ADRESSE DASTEHT — nicht erst beim Klick.
   *
   * Beim Klick darf nichts `await`en, bevor `window.open` gelaufen ist: Safari und mobiles
   * Chrome blockieren das Fenster sonst STILL. Also steht die Zahl vorher bereit und wird beim
   * Tippen nur noch gelesen.
   *
   * Fehlt die Adresse oder ist sie unvollständig, bleibt der Stand auf 0 — dann erscheinen die
   * Aufladestufen, was ohne Konto genau richtig ist.
   */
  useEffect(() => {
    const e = mail.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { setGuthabenCents(0); return; }
    let weg = false;
    void guthabenLesen(e).then(st => { if (!weg) setGuthabenCents(st?.cents ?? 0); }).catch(() => {});
    return () => { weg = true; };
  }, [mail]);

  /**
   * RÜCKKEHR VOM GUTSCHEIN-KAUF, WENN DAS POPUP BLOCKIERT WAR. Dann lief die Zahlung als
   * Seitenwechsel, und die Warteschleife dieses Trichters ist mit der Seite gestorben — die
   * Kasse hängt `?gutschein=1&cs=…` an die Rückkehr. GENAU EINE Statusabfrage bucht das
   * Guthaben (idempotent) und stellt die Bestätigung wieder her. Und `?topic=` stellt ein
   * verlinktes Thema im Wähler nach vorn.
   */
  useEffect(() => {
    if (!gutschein) return;
    const p = new URLSearchParams(window.location.search);
    const t = String(p.get("topic") ?? "");
    if ((LB_TOPICS as string[]).includes(t)) setLbWahl({ topic: t, cents: themenPreisCents(t as ThemenSchluessel) });
    /**
     * DIE SITZUNGSNUMMER STEHT NICHT NUR IN DER ADRESSE (06.08.2026: „das hat schon mal nicht
     * geklappt").
     *
     * Die Rückkehr aus einer Kasse ist der zerbrechlichste Schritt im ganzen Weg: Auf dem
     * Handy springt Stripe in eine eigene App und zurück, dazwischen liegen Weiterleitungen,
     * und ein `?cs=…` überlebt das nicht immer. Ging es verloren, war der Kauf für den
     * Trichter unsichtbar — mit allem, was daran hing: kein Etikett, kein Empfänger, keine
     * Mail. Bezahlt war trotzdem.
     *
     * Deshalb liegt die Nummer zusätzlich im Gerät (gesetzt VOR dem Seitenwechsel) und wird
     * hier notfalls von dort eingelöst. Doppelt einlösen kostet nichts: `guthabenAufladen` ist
     * idempotent über genau diese Nummer.
     */
    let gemerkt = "";
    try { gemerkt = localStorage.getItem(GUTSCHEIN_CS) ?? ""; } catch { /**/ }
    const cs = String(p.get("cs") ?? "") || gemerkt;
    if (!cs || (p.get("gutschein") !== "1" && !gemerkt)) return;
    void fetch(`/api/checkout-status?session_id=${encodeURIComponent(cs)}`).then(r => r.json()).then(s => {
      /**
       * „BEZAHLT — 0 € LIEGT BEREIT" DARF ES NICHT GEBEN (06.08.2026 beim Durchgehen des
       * Trichters gesehen). Eine bezahlte Sitzung ohne Betrag ist kein Geschenk, sondern eine
       * Zeile, die den Käufer glauben lässt, sein Geld sei verschwunden. Erkannt wird der Kauf
       * deshalb nur mit einem echten Betrag oder einem Thema; alles andere bleibt ungekauft,
       * und der Kaufknopf steht weiter da.
       */
      const cents = Number(s?.cents ?? 0) || 0;
      const topic = String(s?.topic ?? "");
      /* Die Testklappe kennt keinen Betrag — für den lokalen Durchgang die kleinste Stufe,
         damit die Bestätigung aussieht wie nach einem echten Kauf. Nie in der Produktion:
         `test` setzt `/api/checkout-status` nur hinter seinen drei Schlössern. */
      const echt = s?.test ? (cents || GUTSCHEIN_STUFEN[0]) : cents;
      if (s?.paid && (s.kind === "gutschein" || s.test) && (echt > 0 || topic)) {
        setLbGekauft({ topic, cents: echt, session: cs });
        try { localStorage.removeItem(GUTSCHEIN_CS); } catch { /**/ }
      }
    }).catch(() => {});
    /* Die Kennung aus der Adresse nehmen: Ein Neuladen soll nicht wie eine zweite Zahlung
       aussehen (gebucht würde ohnehin nichts doppelt — guthabenAufladen ist idempotent). */
    try {
      p.delete("gutschein"); p.delete("cs");
      const rest = p.toString();
      window.history.replaceState(null, "", window.location.pathname + (rest ? `?${rest}` : ""));
    } catch { /**/ }
  }, [gutschein]);

  const [ihrFoto, setIhrFoto] = useState("");
  const [seinFoto, setSeinFoto] = useState("");
  const [bild, setBild] = useState("");
  const [bildPfad, setBildPfad] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  /**
   * KEIN GRATIS-TEST BEI DER HOCHZEIT (Owner 01.08.2026: „Es kostet von Anfang an 1,49 pro
   * Video … Sie werden nichts testen dürfen kostenlos"). `genId` ist der Kiss-Log-Eintrag
   * dieser Generierung — dieselbe Kennung, an der `guthabenAbbuchen`, die Video-Warteschleife
   * und die serverseitige Zustellung (`/api/kiss-deliver`) haengen; ohne sie faellt der Kauf
   * immer auf Stripe zurueck statt aufs Guthaben. `bezahlt` steht, sobald die Kasse (Guthaben
   * oder Stripe) bestaetigt hat.
   */
  const [genId, setGenId] = useState("");
  const [bezahlt, setBezahlt] = useState(false);
  /**
   * ROTER HINWEIS AM „BILD ERZEUGEN"-KNOPF (02.08.2026, plan.md Punkt 1b: „ich drücke drauf
   * und passiert nichts"). Genau dasselbe Muster wie im alten Trichter (KissFunnel) — nur
   * dass DIESER Knopf hier der ist, den der Besucher wirklich sieht: Seit dem 31.07.2026 läuft
   * die Hochzeitsseite über diese Karten-Dialoge, nicht mehr über den Trichter. Der Knopf war
   * schon gesperrt, wenn Fotos oder eine gültige E-Mail fehlten — aber stumm.
   */
  const [hinweis, setHinweis] = useState("");

  // Zwei getrennte Fotos oder eines von beiden (Owner 31.07.2026: „es fehlt Upload gemeinsam").
  const [weg, setWeg] = useState<"zwei" | "gemeinsam">("zwei");
  const [paarFoto, setPaarFoto] = useState("");

  /**
   * DIE SZENE (Owner 03.08.2026: „4 templatevideos wie beim kissing. Und user sucht sich aus
   * die Szene. Eins davon ist küssen"). "" = keine Wahl, und dann ändert sich NICHTS am
   * Auftrag — dieselbe Regel wie bei Kiss (`kussSzeneId` in KissFunnel.tsx).
   */
  const [szeneId, setSzeneId] = useState("");

  const [cropDatei, setCropDatei] = useState<File | null>(null);
  const [cropZiel, setCropZiel] = useState<"sie" | "er" | "paar" | null>(null);
  const ihrRef = useRef<HTMLInputElement>(null);
  const seinRef = useRef<HTMLInputElement>(null);
  const paarRef = useRef<HTMLInputElement>(null);

  /**
   * HELL/DUNKEL-SCHALTER (plan.md, Punkt 3: „Dark Modus einfügen" — unklar war nur WO, weil
   * der Owner keine Seite nannte). Jetzt eindeutig: `KissFunnel.tsx:1764` setzt genau diesen
   * Schalter portalt in `TopNav`s Sprachzeile (`[data-langrow]`) — auf jeder Themenseite, die
   * `KissFunnel` rendert. `/themes/wedding` rendert seit dem 31.07.2026 aber `EinladungBauen`
   * statt `KissFunnel` (siehe plan.md, Abschnitt „KORREKTUR") — der Schalter fehlte deshalb
   * nur hier, nirgendwo bewusst weggelassen. Derselbe Mechanismus, hier nachgezogen.
   */
  const [langZeile, setLangZeile] = useState<Element | null>(null);
  useEffect(() => { setLangZeile(document.querySelector("[data-langrow]")); }, []);

  // Was schon getippt wurde, ueberlebt einen Seitenwechsel — dieselbe Regel wie im Trichter.
  /**
   * EIN ENTWURF JE THEMA (Owner 05.08.2026: „die Botschaft für den Gutschein passt überhaupt
   * nicht" — auf der Gutschein-Karte stand sein Urlaubstext, auf Deutsch, auf einer rumänischen
   * Seite).
   *
   * Der Schlüssel hiess „lb_einl_bau" für ALLE Varianten. Hochzeit, Urlaub und Gutschein
   * schrieben also in dieselbe Schublade: Wer eine Hochzeitseinladung anfängt und danach den
   * Gutschein öffnet, findet dort seine Brautnamen, sein Datum und seinen Hochzeitstext. Es
   * fiel nur deshalb nicht früher auf, weil es bis heute Abend zwei Varianten gab, die einander
   * ähnlich sehen.
   *
   * Der Zusatz macht drei getrennte Schubladen. Alte Einträge unter dem nackten Namen bleiben
   * liegen und werden nicht mehr gelesen — sie schaden nicht, und ein Aufräumen wäre mehr Code
   * als Nutzen.
   */
  const SPEICHER = `lb_einl_bau_${variant}`;
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(SPEICHER) || "{}");
      if (d.sie) setSie(d.sie); if (d.er) setEr(d.er);
      if (d.datum) setDatum(d.datum); if (d.ort) setOrt(d.ort);
      if (d.bisDatum) setBisDatum(d.bisDatum); if (d.botschaft) setBotschaft(d.botschaft);
      if (d.adresse) setAdresse(d.adresse); if (d.telefon) setTelefon(d.telefon);
      if (d.mail) setMail(d.mail);
      /**
       * DIE GESCHENK-WAHL ÜBERLEBT DEN SEITENWECHSEL ZU STRIPE. Bei blockiertem Popup läuft
       * die Kasse als Navigation; ohne diese drei Zeilen käme der Käufer zurück und Wahl,
       * Empfänger-Adresse und sein GEKAUFTES Geschenk wären weg. Alles davon ist nur
       * Anzeige-Zustand — was zählt, liest der Server aus der Stripe-Sitzung, eine hier
       * hineditierte „gekauft"-Zeile kauft nichts.
       */
      if (d.lbMail) setLbMail(String(d.lbMail));
      if (d.lbWahl?.cents) setLbWahl({ topic: String(d.lbWahl.topic ?? ""), cents: Number(d.lbWahl.cents) });
      if (d.lbGekauft?.session) setLbGekauft({ topic: String(d.lbGekauft.topic ?? ""), cents: Number(d.lbGekauft.cents) || 0, session: String(d.lbGekauft.session) });
    } catch { /**/ }
    try { setMail(m => m || localStorage.getItem("lb_kiss_mail") || ""); } catch { /**/ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(SPEICHER, JSON.stringify({ sie, er, datum, bisDatum, botschaft, ort, adresse, telefon, mail, lbMail, lbWahl, lbGekauft })); } catch { /**/ }
  }, [sie, er, datum, bisDatum, botschaft, ort, adresse, telefon, mail, lbMail, lbWahl, lbGekauft]);

  const mailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail.trim());

  /** Rund hundert Tage voraus: So weit im Voraus verschickt man Einladungen, und das
   *  Beispieldatum liegt damit immer in der Zukunft — anders als ein fest getipptes Datum. */
  const beispielDatum = useMemo(
    () => new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    [],
  );

  /**
   * AB DEM EIGENEN ERGEBNIS HOEREN DIE BEISPIELE AUF (03.08.2026 — die eigentliche Ursache
   * hinter „ich kann es nicht sharen. Was ist das bitte?").
   *
   * Solange die Karte leer ist, verkaufen die Beispiele (Owner: „in der Karte muss doch
   * stehen ein Beispiel eines Namens und eine schöne Adresse") — da ist das richtig.
   * Sobald aber das EIGENE Bild in der Karte steht, richten dieselben Beispiele Schaden an:
   *
   *  - Der Owner sah „Ana & Mihai" ueber SEINEM Foto und hatte keinen Grund zu ahnen, dass
   *    die Namen noch fehlen — er hat Datum und Ort ersetzt, die Namen nicht. Genau deshalb
   *    blieb der Verschicken-Knopf weg (`bild && sie.trim() && er.trim()`).
   *  - Und schlimmer: `einladungAnlegen()` schickt `ort.trim()`, also LEER — waehrend auf der
   *    Karte „Schlosshotel Grunewald" stand. Was er sah, war nicht, was er verschickt haette.
   *
   * Ab jetzt fallen die Felder mit dem eigenen Ergebnis auf ihren normalen Leer-Zustand
   * zurueck (gestrichelt und antippbar, siehe `EinladungKarte`) — was auf der Karte steht,
   * ist wieder genau das, was gespeichert wird.
   */
  const eigenes = !!bild || !!videoUrl;

  /**
   * DER VORGABESATZ ZÄHLT ALS GESCHRIEBEN. Er steht auf der Karte, sobald das Feld leer ist,
   * und er wird auch so gespeichert und verschickt — wer nichts ändert, verschickt genau das,
   * was er gesehen hat. Das ist der Unterschied zu einem Platzhalter: Ein Platzhalter
   * verschwindet beim Tippen und hinterlässt eine Lücke, wenn niemand tippt.
   */
  const botschaftText = botschaftFrei
    ? (botschaft.trim() || (gutschein ? T.fBotschaftGutschein : T.fBotschaft))
    : "";

  /** Fertig zum Erzeugen ist, wer den gewaehlten Weg vollstaendig gegangen ist. */
  /**
   * WANN DARF ER ABSENDEN?
   *
   * BEIM GUTSCHEIN IST ES NICHT DAS FOTO, SONDERN DER LINK. Sein eigenes Video ist ausdruecklich
   * freiwillig — wer keins hochlaedt, verschickt unser fertiges (Owner 05.08.2026). Ohne den
   * Link des Haendlers waere die Karte dagegen leer: Dann verschenkt er eine schoene Huelle
   * ohne Inhalt, und genau das faellt erst dem Beschenkten auf.
   */
  /* BEIM GUTSCHEIN GIBT ES NICHTS ZU ERFUELLEN (Owner 05.08.2026, zum Link-Feld: „raus").
     Sein eigenes Video ist freiwillig — ohne laeuft unser fertiges. Der Gutschein selbst wird
     spaeter angehaengt, beim Bearbeiten der Karte, nicht in diesem Dialog. Pflicht bleibt
     allein die E-Mail-Adresse. */
  const fotosDa = gutschein
    ? true
    : weg === "gemeinsam" ? !!paarFoto : !!ihrFoto && !!seinFoto;
  // Sobald beide Bedingungen wieder stimmen, hat der rote Hinweis seinen Zweck erfüllt.
  useEffect(() => { if (fotosDa && mailOk) setHinweis(""); }, [fotosDa, mailOk]);

  /**
   * DIE KASSE — Guthaben, wenn eins da ist, sonst Stripe (02.08.2026, Owner 01.08.2026: „1,49
   * pro Video … Kontoaufladung mit 9,99€"). Portiert aus `unlock("once")` in
   * `components/KissFunnel.tsx:1675` — dort lief das schon fuer Kiss/Idol, nur eben nie fuer
   * die Hochzeit, weil `KissFunnel` seit dem 31.07.2026 auf `/themes/wedding` gar nicht mehr
   * rendert (`plan.md`, Abschnitt „KORREKTUR"). Anders als dort: hier wird die Kasse mit
   * `await` direkt in `erzeugen()` verkettet, kein Watchdog-Effekt noetig — dieser Bildschirm
   * kennt ohnehin nur „gerade beschaeftigt", nicht mehrere Bezahl-Wege gleichzeitig.
   *
   * Braucht einen `genId` (den Kiss-Log-Eintrag dieser Generierung), damit `guthabenAbbuchen`
   * idempotent gegen genau DIESEN Versuch bucht — ohne ihn faellt jeder Kauf auf Stripe
   * zurueck, auch mit vollem Konto. Existiert noch keiner, wird er hier angelegt.
   */
  /**
   * `topupCents` = er hat eine Aufladestufe gewaehlt. Dann geht es NICHT um diese eine Karte,
   * sondern um Geld aufs Konto — die Kasse legt es dort ab, und der naechste Kauf laeuft
   * wieder ueber das Guthaben. Ohne die Zahl ist es der normale Weg: erst Konto, dann Stripe.
   */
  /**
   * `kontoFrisch` = das Konto wurde SOEBEN in diesem Aufruf aufgeladen. Dann wird die
   * Client-Prüfung unten übersprungen, denn `guthabenCents` ist hier eine EINGEFRORENE
   * Zahl aus dem Render des Klicks — die Aufladung dazwischen sieht sie nie. Genau daran
   * ist der Kauf am 05.08.2026 gestorben: aufgeladen, zurück vom Stripe, und die alte Null
   * öffnete den Aufladewähler ERNEUT — Geld auf dem Konto, Kauf nie ausgeführt. Ob das
   * Konto wirklich reicht, entscheidet ohnehin der Server beim Abbuchen (Skill `bezahlung`).
   */
  const bezahlen = async (videoAufpreis = false, topupCents?: number, kontoFrisch = false): Promise<boolean> => {
    /**
     * DAS FENSTER SOFORT OEFFNEN, VOR JEDEM AWAIT (03.08.2026). Browser erlauben
     * `window.open` ohne Blockade nur, wenn es NOCH im selben Atemzug wie der Klick steht.
     * Ein `await fetch(...)` davor reicht vielen Browsern (vor allem Safari und mobiles
     * Chrome) schon, um das Fenster STILL zu blockieren — kein Fehler, keine Meldung,
     * einfach nichts. Hier standen bis zu ZWEI Anfragen davor (Kiss-Log + Kasse), das war
     * also der schlimmste Fall. Das leere Fenster steht jetzt vor allem anderen; die
     * Adresse traegt es erst nach, wenn sie da ist.
     *
     * Derselbe Fehler und dieselbe Loesung wie in `KissFunnel.tsx:unlock()` — dort am
     * selben Tag unabhaengig gefunden.
     */
    /**
     * ZUERST DAS GUTHABEN (Owner 05.08.2026: „hier öffnet sich direkt Stripe" · „eigentlich
     * sollte zuerst Dialog kommen, Konto aufladen, dann kommt Stripe").
     *
     * Reicht das Konto, bucht die Kasse selbst davon ab und meldet `walletPaid` — dann sieht
     * er Stripe nie. Reicht es nicht, zeigen wir die Stufen, und zwar IN diesem Dialog: Er ist
     * schon ein Fenster, und ein Fenster über einem Fenster ist eine Sackgasse (Owner: „weil
     * das schon ein Dialogfenster ist").
     *
     * DIE PRÜFUNG STEHT VOR `window.open`. Ein Fenster, das aufgeht und sofort wieder
     * zugemacht wird, blinkt — und auf dem Handy bleibt es manchmal als leerer Tab stehen.
     */
    /**
     * KEIN `await` VOR `window.open` — die Warnung steht direkt darüber, und ich bin genau
     * hineingelaufen (Owner 05.08.2026: „das klappt jetzt nicht").
     *
     * Die Guthaben-Abfrage stand hier und hat das Fenster still blockieren lassen. Sie läuft
     * jetzt SCHON BEIM TIPPEN der Adresse (siehe der Effekt weiter oben); beim Klick steht die
     * Zahl also längst da und wird nur noch gelesen — ohne `await`, ohne Blockade.
     */
    if (!topupCents && !kontoFrisch && (guthabenCents ?? 0) < preisCents) {
      setAufladeWahl(true);
      return false;
    }

    const popup = window.open("", "_blank", "popup,width=480,height=780");
    let device = "";
    try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
    let gid = genId;
    if (!gid) {
      try {
        const log = await fetch("/api/kiss-log", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: variant, device, email: mail.trim() }),
        }).then(r => r.json());
        if (log?.id) { gid = String(log.id); setGenId(gid); }
      } catch { /* ohne genId faellt die Kasse auf Stripe zurueck — kein Abbruch noetig */ }
    }
    try {
      const start = await fetch("/api/kiss-video-checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genId: gid, once: !topupCents, videoAufpreis, thema: variant,
          ...(topupCents ? { aufladen: true, topupCents } : {}),
          email: mail.trim(), returnTo: window.location.pathname + window.location.search }),
      }).then(r => r.json());
      // Aus dem Guthaben bezahlt — das leere Fenster wurde nie gebraucht. Der Rest kommt in
      // den Zustand: Der NÄCHSTE Kauf (etwa „Daraus ein Video") prüft gegen die echte Zahl,
      // nicht gegen den Stand von vor dieser Abbuchung.
      if (start?.walletPaid) {
        if (typeof start.rest === "number") setGuthabenCents(start.rest);
        try { popup?.close(); } catch { /**/ } setBezahlt(true); return true;
      }
      if (!start?.url || !start?.sessionId) {
        try { popup?.close(); } catch { /**/ }
        setStatus(start?.error || F.statusNotWork); return false;
      }
      // Popup blockiert → gleiche Seite. Lieber ein Seitenwechsel als eine tote Warteschleife.
      if (!popup) { window.location.href = start.url; return false; }
      try { popup.location.href = start.url; }
      catch { try { popup.close(); } catch { /**/ } window.location.href = start.url; return false; }
      for (let i = 0; i < 100; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const s = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(start.sessionId)}`).then(r => r.json()).catch(() => null);
        if (s?.paid) {
          try { popup.close(); } catch { /**/ }
          /**
           * NACH EINER AUFLADUNG IST DIE KARTE NOCH NICHT BEZAHLT (Owner 05.08.2026: „und der
           * Weg zurück vom Stripe?").
           *
           * Hier stand `setBezahlt(true)` für JEDE bezahlte Sitzung — auch für eine reine
           * Aufladung. Das Geld lag dann auf dem Konto, der Trichter hielt die Karte für
           * bezahlt und erzeugte los, ohne dass je etwas abgebucht wurde. Genau dieselbe Sorte
           * Fehler wie vorhin bei „ich habe bezahlt und jetzt?", nur andersherum: einmal
           * bezahlt und nichts bekommen, einmal bekommen und nichts bezahlt.
           *
           * Richtig ist: Aufladung gutgeschrieben → denselben Kauf NOCH EINMAL versuchen. Jetzt
           * reicht das Konto, die Kasse bucht ab und meldet `walletPaid` — ohne zweites Stripe.
           *
           * MIT `kontoFrisch`, und das ist der Punkt, an dem der Kauf am 05.08.2026 starb:
           * Der Wiederholungsaufruf las `guthabenCents` aus der EINGEFRORENEN Momentaufnahme
           * dieses Klicks — also den Stand von VOR der Aufladung — und öffnete den
           * Aufladewähler gleich noch einmal. Der Kunde hatte bezahlt, das Geld lag auf dem
           * Konto, und der Trichter verlangte die nächste Aufladung. `kontoFrisch` sagt dem
           * Wiederholungsaufruf, dass soeben aufgeladen wurde; ob es wirklich reicht, prüft
           * der Server beim Abbuchen. Und `busy` bleibt stehen — es gehört `erzeugen`, das
           * nach dieser Rückkehr direkt mit der Erzeugung weitermacht.
           */
          if (topupCents) {
            if (typeof s.walletCents === "number") setGuthabenCents(s.walletCents);
            return await bezahlen(videoAufpreis, undefined, true);
          }
          setBezahlt(true); return true;
        }
        if (popup.closed && i > 2) break;
      }
      // Fuenf Minuten ohne Zahlung: das Fenster nicht offen stehen lassen.
      try { popup.close(); } catch { /**/ }
      return false;
    } catch {
      // Netzwerkfehler — das leere Fenster darf nicht als weisse Seite stehen bleiben.
      try { popup?.close(); } catch { /**/ }
      setStatus(F.statusNetwork); return false;
    }
  };

  /**
   * DEN TOPIC-GUTSCHEIN KAUFEN — eigene Kasse (`/api/gutschein-checkout`), bewusst NICHT über
   * das eigene Guthaben: Das Geld gehört dem BESCHENKTEN, und Konto-zu-Konto-Umbuchungen gibt
   * es nicht (Memory `guthaben-haengt-an-einer-adresse`). Immer Stripe, immer mit der Adresse
   * des Beschenkten im Kassenvermerk. Dasselbe Fenster-vor-await- und Schleifen-Muster wie
   * `bezahlen` weiter oben — inklusive der Regel, dass die Bestätigung (Betrag, Thema) aus
   * der SERVER-Antwort kommt, nie aus dem Klick.
   */
  const lbKaufen = async (wahl: { topic: string; cents: number }): Promise<boolean> => {
    if (lbBusy || lbGekauft) return !!lbGekauft;
    const emp = lbMail.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emp)) { setLbFehler(F.lbFehlerMail ?? ""); return false; }
    setLbFehler(""); setLbBusy(true); setLbLaeuft(wahl.topic || String(wahl.cents));
    const popup = window.open("", "_blank", "popup,width=480,height=780");
    let gekauft = false;
    try {
      const start = await fetch("/api/gutschein-checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        /* Produkt ODER nacktes Guthaben — der Server prueft beides gegen seine weisse
           Liste; ein erfundener Betrag faellt dort auf die kleinste Stufe zurueck. */
        body: JSON.stringify({ ...(wahl.topic ? { topic: wahl.topic } : { cents: wahl.cents }),
          empfaenger: emp, email: mail.trim(),
          returnTo: window.location.pathname + window.location.search }),
      }).then(r => r.json());
      if (!start?.url || !start?.sessionId) {
        try { popup?.close(); } catch { /**/ }
        setLbFehler(start?.error || F.statusNotWork);
      } else {
        /* DIE NUMMER MERKEN, BEVOR IRGENDEIN WEG DIE SEITE VERLÄSST — der Effekt beim Mounten
           löst sie notfalls ein, falls `?cs=…` die Rückkehr nicht übersteht. */
        try { localStorage.setItem(GUTSCHEIN_CS, String(start.sessionId)); } catch { /**/ }
        if (!popup) {
          // Popup blockiert → Seitenwechsel; die Rückkehr fängt der Effekt oben (?gutschein=1&cs=…).
          window.location.href = start.url; return false;
        } else {
          try { popup.location.href = start.url; }
          catch { try { popup.close(); } catch { /**/ } window.location.href = start.url; return false; }
          for (let i = 0; i < 100; i++) {
            await new Promise(r => setTimeout(r, 3000));
            const s = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(start.sessionId)}`).then(r => r.json()).catch(() => null);
            if (s?.paid) {
              gekauft = true;
              setLbGekauft({ topic: String(s.topic ?? wahl.topic), cents: Number(s.cents ?? 0) || wahl.cents, session: String(start.sessionId) });
              /* Eingelöst — die Notfall-Nummer darf weg, sonst holt sie der nächste Aufruf
                 dieses Trichters noch einmal hervor und hängt ein Etikett an eine neue Karte. */
              try { localStorage.removeItem(GUTSCHEIN_CS); } catch { /**/ }
              break;
            }
            if (popup.closed && i > 2) break;
          }
          try { popup.close(); } catch { /**/ }
        }
      }
    } catch {
      try { popup?.close(); } catch { /**/ }
      setLbFehler(F.statusNetwork);
    }
    setLbBusy(false);
    if (!gekauft) setLbLaeuft("");
    return gekauft;
  };

  /**
   * DIE GESCHENK-WAHL — EIN Markup, zwei Orte (Owner 06.08.2026: „wie wählt er unser Produkt
   * aus oder Credit?").
   *
   * ERST WÄHLEN, DANN AUF EINEN KNOPF ZAHLEN (Owner 06.08.2026: „zuerst muss Geschenk
   * auswählen dann mit Button Zahlen. Sonst wird er überascht sein").
   *
   * Vorher kaufte der Chip unter der Karte SOFORT: ein Tipp auf „ein Kussvideo · 15 €" und
   * das Kassenfenster stand da. Wer nur schauen wollte, was es gibt, stand plötzlich in
   * Stripe — und das ist der Moment, in dem jemand abbricht und nicht wiederkommt. Ein Chip
   * ist eine Auswahl, kein Kauf. Bezahlt wird an EINER Stelle: dem goldenen Knopf darunter,
   * auf dem der Preis steht.
   *
   * `sofort` heisst deshalb nur noch: unter der Karte (dunkle Welt, eigener Kaufknopf) statt
   * im Kauf-Dialog (Karten-Welt, dessen grosser Knopf zahlt und erzeugt in einem Zug). Es
   * schaltet die Farbwelt — im Dialog gelten die Karten-Klassen, deren !important-Regeln
   * jede Tailwind-Farbe schlagen.
   */
  const geschenkWahl = (sofort: boolean) => {
    const label = sofort ? "text-[#f6cf51]" : "lb-karte-gold";
    const hilfe = sofort ? "text-white/75" : "opacity-70";
    const tippen = (wahl: { topic: string; cents: number }) => {
      setLbWahl(w => (w && w.topic === wahl.topic && w.cents === wahl.cents) ? null : wahl);
    };
    const aktiv = (wahl: { topic: string; cents: number }) =>
      !!lbWahl && lbWahl.topic === wahl.topic && lbWahl.cents === wahl.cents;
    return (<>
      {/* EIN TITEL JE FRAGE (Owner 06.08.2026: „Hier muss doch stehen, An wem schenkst du.
          Weiter unten Wähle das Produkt aus oder Kreditbetrag als Titel."): Über der
          E-Mail das WEM, über den Chips das WAS. */}
      <p className={`mt-4 text-[12px] font-black uppercase tracking-wide ${label}`}>{F.lbWem}</p>
      <p className={`mt-1 text-[11px] font-bold leading-snug ${hilfe}`}>{F.lbHilfe}</p>
      {lbGekauft ? (<>
        <p className={`mt-2 text-[13px] font-black leading-snug ${sofort ? "text-[#f6cf51]" : "lb-karte-gold"}`}>
          {(F.lbFertig ?? "").replace("{was}",
            T.gutscheinTopics[lbGekauft.topic as keyof typeof T.gutscheinTopics] ?? eur(lbGekauft.cents, lang))}
        </p>
        {/**
          * WOHIN ES GEHT, SCHWARZ AUF WEISS (Owner 06.08.2026: „Anzeigen").
          *
          * Mit dem Kauf verschwindet das Empfänger-Feld — ab hier ist die Adresse nicht mehr
          * änderbar, und das Guthaben hängt an genau dieser Zeichenkette. Ein Tippfehler
          * schenkt einem Postfach, das es nicht gibt, und umbuchen gibt es nicht. Also steht
          * sie da, ungekürzt, solange der Käufer noch etwas tun kann.
          */}
        {lbMail.trim() && (
          <p className={`mt-1 break-all text-[11px] font-bold leading-snug ${hilfe}`}>
            {(F.lbGehtAn ?? "").replace("{mail}", lbMail.trim())}
          </p>
        )}
      </>) : (<>
        <Eingabe karte={!sofort} value={lbMail}
          onChange={e => { setLbMail(e.target.value); if (lbFehler) setLbFehler(""); }}
          type="email" inputMode="email" placeholder={F.lbEmpfaenger} className="mt-2" />
        <p className={`mt-4 text-[12px] font-black uppercase tracking-wide ${label}`}>{F.lbWahlTitel}</p>
        {/**
          * DIE REIHENFOLGE STEHT FEST (Owner 06.08.2026: „Die Chips springen nach klicken nach
          * links").
          *
          * Hier sortierte eine Zeile das Gewählte nach vorn. Beim alten Sofortkauf fiel das
          * kaum auf — der Chip war ja gleich weg. Seit der Chip nur noch WÄHLT, springt beim
          * Antippen die halbe Reihe um: Der Finger zeigt auf „ein Tanzvideo", und an dieser
          * Stelle steht danach etwas anderes. Wer zweimal vergleichen will, sucht jedes Mal neu.
          *
          * Eine Auswahl darf sich nicht bewegen. Gewählt wird durch FARBE (der Chip wird gold),
          * nicht durch einen neuen Platz.
          */}
        <div className="mt-2 grid grid-cols-2 gap-2">
          {LB_TOPICS.map(t => {
            const wahl = { topic: t, cents: themenPreisCents(t) };
            return (
              <Knopf key={t} art="chip" karte={!sofort} aktiv={aktiv(wahl)} disabled={lbBusy}
                onClick={() => tippen(wahl)}>
                {lbLaeuft === t && lbBusy ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : null}
                {T.gutscheinTopics[t as keyof typeof T.gutscheinTopics]} · {eur(themenPreisCents(t), lang)}
              </Knopf>
            );
          })}
        </div>
        {/* „oder Credit" (Owner 06.08.) — nacktes Guthaben, der Beschenkte sucht selbst aus. */}
        <p className={`mt-3 text-[11px] font-bold leading-snug ${hilfe}`}>{F.lbGuthaben}</p>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {GUTSCHEIN_STUFEN.map(c => {
            const wahl = { topic: "", cents: c };
            return (
              <Knopf key={c} art="chip" karte={!sofort} aktiv={aktiv(wahl)} disabled={lbBusy}
                onClick={() => tippen(wahl)}>
                {lbLaeuft === String(c) && lbBusy ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : null}
                {eur(c, lang)}
              </Knopf>
            );
          })}
        </div>
        <Fehlerzeile karte={!sofort}>{lbFehler}</Fehlerzeile>
        {/**
          * DER KAUFKNOPF — nur unter der Karte. Im Dialog zahlt sein grosser Knopf („Geschenk
          * bezahlen — {preis}") und erzeugt gleich danach; ein zweiter gefüllter Knopf im
          * selben Fenster liesse den Nutzer raten, welcher der Weg nach vorn ist (CI: genau
          * EIN gefüllter Knopf je Bildschirm).
          *
          * Er erscheint erst mit einer Wahl — vorher gibt es nichts zu bezahlen, und ein
          * Knopf ohne Preis darauf ist genau die Überraschung, die hier weg soll. `lbKaufen`
          * öffnet sein Kassenfenster noch in DIESER Klick-Geste (Safari sonst still blockiert),
          * die fehlende Empfängeradresse fängt es selbst als rote Zeile ab.
          */}
        {sofort && lbWahl && (
          <Knopf art="gold" className="mt-3" disabled={lbBusy} onClick={() => void lbKaufen(lbWahl)}>
            {lbBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {lbBusy ? F.oneMoment : (F.lbCta ?? "").replace("{preis}", eur(lbWahl.cents, lang))}
          </Knopf>
        )}
      </>)}
    </>);
  };

  /**
   * DAS BEZAHLTE VIDEO — portiert aus `kussVideo()` in `components/KissFunnel.tsx:1506`.
   * Anders als dort: kein `anziehen()`-Umweg ueber FASHN, denn die Hochzeit hat hier keine
   * Kleider-Auswahl (kein `ihrLook`/`seinLook`) — die Originalfotos gehen direkt an Pixverse,
   * das Kleid steht nur im Prompt-Text.
   *
   * REIHENFOLGE IST PFLICHT (derselbe Grund wie dort): `weddingPrompt` bindet @1 an den
   * BRAEUTIGAM und @2 an die BRAUT — `person` muss also SEIN Foto sein, `garment` IHRES.
   *
   * BEIM GEMEINSAMEN FOTO gibt es kein zweites Referenzbild — dasselbe Paarfoto geht an beide
   * Plaetze. Das ist nicht dieselbe Qualitaet wie zwei getrennte Fotos (Pixverse erwartet in
   * Referenz-Modus normalerweise zwei EINZELNE Gesichter), aber besser als gar kein Video;
   * noch nicht mit echten Kaeufen geprueft, siehe Rueckmeldung an den Owner.
   */
  const videoErzeugen = async () => {
    /**
     * BEIM GUTSCHEIN IST ES EIN MENSCH, NICHT ZWEI (Owner 05.08.2026: „es kommt keine
     * Generierung").
     *
     * Genau daran lag es: Pixverse Fusion bekommt ZWEI Vorlagen (@1 der Bräutigam, @2 die
     * Braut), und die Zeile darunter stieg still aus, sobald eine davon fehlte. Der Gutschein
     * hat nur SEIN Foto — also keine zweite Vorlage, also kein Lauf, also keine Meldung.
     *
     * Er bekommt sein eigenes Foto zweimal. Das ist kein Trick: Fusion braucht zwei Plätze,
     * und wenn beide dieselbe Person zeigen, bleibt genau diese Person im Bild. Was sie tut,
     * steht ohnehin im Auftrag (`gutscheinPrompt`) — Umschlag hoch, ein Satz.
     *
     * OHNE FOTO PASSIERT WEITER NICHTS, und das ist richtig: Dann läuft unser fertiges Video
     * in der Karte (Owner: „er kann dieses Mal auch das Original-Video versenden").
     */
    const person = gutschein ? ihrFoto : (weg === "gemeinsam" ? paarFoto : seinFoto);
    const garment = gutschein ? ihrFoto : (weg === "gemeinsam" ? paarFoto : ihrFoto);
    if (!person || !garment) return;
    setStatus(F.renderingVideo);
    try {
      const start = await fetch("/api/generate-tryon-video", {
        method: "POST", headers: { "Content-Type": "application/json" },
        /* Beim Urlaub geht der ORT mit in den Auftrag: „Komm mit mir nach Teneriffa" steht auf
           der Karte, also muss Teneriffa auch im Video zu sehen sein. Bei der Hochzeit ist der
           Ort nur die Adresse für die Gäste — die Kulisse bestimmt allein die Szene. */
        body: JSON.stringify({
          lookId: KISS_LOOK_ID, genId, person, garment,
          /* Der Gutschein hat keine Szene — sein Auftrag steht fest: Umschlag hoch, ein Satz.
             Deshalb ohne `szeneId`, siehe lib/gutschein-prompt. */
          prompt: gutschein ? gutscheinPrompt()
            : urlaub ? holidayInvitePrompt(szeneId, ort.trim())
            : weddingPrompt("", szeneId),
          /* FUENF SEKUNDEN BEIM GUTSCHEIN (Owner 05.08.2026: „5 sek. das reicht vollkommend").
             Es ist eine Geste und ein Satz — „I have something for you!" ist nach drei Sekunden
             gesagt. Hochzeit und Urlaub bleiben bei sieben: dort faehrt die Kamera durch eine
             Szene, und die braucht die Zeit. */
          ...(gutschein ? { sekunden: 5 } : {}),
        }),
      }).then(r => r.json());
      if (!start?.videoId) { setStatus(start?.error || F.statusCouldNotStart); return; }
      if (genId) {
        void fetch("/api/kiss-log", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ update: genId, videoId: start.videoId }),
        }).catch(() => {});
      }
      for (let i = 0; i < 90; i++) {
        await new Promise(r => setTimeout(r, 4000));
        setStatus(F.makingVideo(Math.round((i + 1) * 4)));
        const q = await fetch(`/api/generate-tryon-video?videoId=${encodeURIComponent(start.videoId)}&curatorId=${encodeURIComponent(start.curatorId || "")}`).then(r => r.json()).catch(() => null);
        if (q?.status === "done" && q.videoUrl) {
          setVideoUrl(q.videoUrl); setStatus("");
          if (genId) void fetch("/api/kiss-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ update: genId, videoUrl: q.videoUrl }) }).catch(() => {});
          return;
        }
        if (q?.status === "failed") { setStatus(q.error || F.videoFailed); return; }
      }
      setStatus(F.statusTimeout);
    } catch { setStatus(F.statusNetwork); }
  };

  /**
   * DARAUS EIN VIDEO MACHEN — nachträglich, freiwillig (Owner 04.08.2026).
   *
   * Erst zahlen, dann rendern. `bezahlt` wird hier bewusst NICHT geprüft: Das steht schon
   * auf `true` vom Bild-Kauf, und der Aufpreis ist ein zweiter Kauf. Wer ihn zweimal
   * auslöst, zahlt zweimal — davor schützt `videoBusy`, nicht ein Flag.
   *
   * DER LINK BLEIBT DERSELBE: Wer die Einladung schon verschickt hat, dessen Empfänger sieht
   * beim nächsten Öffnen das Video statt des Bildes. Deshalb ist das Aufwerten NACH dem
   * Verschicken kein Sonderfall, sondern der Normalfall — und ein besseres Geschäft als ein
   * Video, für das man vor dem ersten Ergebnis bezahlen soll.
   */
  const [videoBusy, setVideoBusy] = useState(false);
  /**
   * `topupCents` kommt aus dem Aufladewähler: Reichte das Konto nicht, merkt sich der Wähler
   * über `aufladeZiel`, DASS es dieser Kauf war, und ruft ihn mit der gewählten Stufe erneut
   * auf — aufladen, abbuchen, und dann läuft die Erzeugung hier ganz normal weiter.
   */
  const videoNachtraeglich = async (topupCents?: number) => {
    if (videoBusy || busy) return;
    setAufladeZiel("aufwerten");
    setVideoBusy(true); setHinweis("");
    try {
      const ok = await bezahlen(true, topupCents);
      if (ok) await videoErzeugen();
    } catch { setStatus(F.statusNetwork); }
    setVideoBusy(false);
  };

  /**
   * BILD ODER VIDEO — DIE WAHL STEHT VORN (Owner 04.08.2026: „wir machen das noch einfacher.
   * User kann bei der Generierung wählen was er will. Bild oder Video." · „er kann das später
   * immer noch in Video umwandeln").
   *
   * Vorher gab es einen Knopf: bezahlen, Bild bekommen — und erst danach erfuhr er, dass es
   * auch ein Video gibt. Eine Entscheidung gehoert an die Stelle, an der man sie ohnehin
   * trifft, nicht hinterher als Nachschlag.
   *
   * `alsVideo` entscheidet ZWEI Dinge: was die Kasse verlangt (1,49 oder 3,99) und ob nach
   * dem Bild noch der Video-Lauf folgt. Wer Bild waehlt, kann spaeter umwandeln — der Knopf
   * dafuer steht unter der fertigen Karte und auf der Einladungsseite.
   */
  const erzeugen = async (alsVideo = false, topupCents?: number) => {
    if (!fotosDa || !mailOk || busy) return;
    /* Damit der Aufladewähler weiss, WELCHEN Kauf er nach dem Aufladen fortsetzt. */
    setAufladeZiel(alsVideo ? "video" : "bild");
    setBusy(true); setStatus(F.oneMoment);
    let device = "";
    try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
    try { localStorage.setItem("lb_kiss_mail", mail.trim()); } catch { /**/ }
    try {
      /**
       * GUTSCHEIN: BEZAHLT WIRD NUR DAS GESCHENK (Owner 06.08.2026: „er muss nur den kredit
       * oder das produkt bezahlen, dass ers verschenken möchte" · „Die Gutscheingenerierung
       * kostet nichts.").
       *
       * Kein 9,99-Kauf, kein Vorschaubild, kein Upload — Bella bringt die Botschaft (Owner:
       * „ich will hier eigentlich gar nicht dass die Leute ihre eigene Bilder uploaden"),
       * die Karte ist die Gratis-Hülle. Ist ein Geschenk gewählt, startet hier seine Kasse
       * (`lbKaufen` öffnet sein Fenster noch in derselben Klick-Geste); ohne Wahl ist die
       * Karte sofort fertig — dann verpackt er seinen eigenen Händler-Link, den er woanders
       * längst bezahlt hat.
       */
      if (gutschein) {
        if (lbWahl && !lbGekauft) {
          const ok = await lbKaufen(lbWahl);
          if (!ok) { setBusy(false); return; }
        }
        setFeld(null); setStatus(""); setBusy(false);
        return;
      }
      if (!bezahlt) {
        const ok = await bezahlen(alsVideo, topupCents);
        if (!ok) { setBusy(false); return; }
      }
      /**
       * DIALOG SCHLIESST SOFORT NACH DER ZAHLUNG (03.08.2026, echter Testkauf des Owners:
       * „dialog muss nach der bezahlung sofort schliessen und die seite mit rendering offen
       * sein. mit radar rendering"). Vorher blieb der Dialog ueber Bild UND Video hinweg
       * offen — bis zu drei Minuten lang ein Knopf mit Text statt der Karte selbst, die doch
       * zeigen soll, was entsteht. Jetzt sieht er sofort die Karte mit dem Radar-Scan
       * (weiter unten im `video`-Slot), genau wie beim Kuss-Trichter nach der Zahlung.
       */
      setFeld(null);
      setStatus(F.statusQuality);
      const d = await fetch("/api/free-preview", {
        method: "POST", headers: { "Content-Type": "application/json" },
        /* `einladung: true` trennt die neue Urlaubs-EINLADUNG vom alten Urlaubs-Thema, das
           unter demselben Namen `holiday` läuft (/themes/bella). Siehe die Begründung in
           app/api/free-preview/route.ts. */
        body: JSON.stringify({
          theme: variant, device, email: mail.trim(), szene: szeneId,
          ...(urlaub ? { einladung: true, ort: ort.trim() } : {}),
          ...(weg === "gemeinsam" ? { paar: paarFoto } : { person: seinFoto, model: ihrFoto }),
        }),
      }).then(r => r.json());
      if (d?.image) {
        setBild(d.image); setBildPfad(d.imagePath ?? "");
        if (genId) void fetch("/api/kiss-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ update: genId, imagePath: d.imagePath }) }).catch(() => {});
        /**
         * HIER LIEF DAS VIDEO UNGEFRAGT WEITER — und das war ein echter Fehler
         * (Owner 04.08.2026: „er bekommt ein Bild für 1,49; wenn er das Video generieren
         * möchte, dann kann er das nachträglich für 3,99").
         *
         * Der Owner hat es selbst erlebt: Er bezahlte 1,49, bekam das Bild — und danach
         * startete der Code ein Video, für das nichts abgebucht war. Auf dem Schirm stand
         * „Videos are paid — please top up your balance", ohne dass er je ein Video bestellt
         * hatte. Ein Fehler, den er sich nicht erklären konnte, an der teuersten Stelle.
         *
         * Für 1,49 gibt es das Bild, und die Einladung damit ist vollständig.
         *
         * NUR WER VIDEO GEWAEHLT HAT, bekommt jetzt eins — und hat dafuer 3,99 bezahlt. Das
         * Standbild ist dabei kein Zwischenschritt zum Wegwerfen: Es steht sofort in der
         * Karte, waehrend das Video laeuft, und bleibt die Vorlage, falls der Lauf scheitert.
         */
        if (alsVideo) await videoErzeugen();
        else setStatus("");
      }
      else setStatus(d?.error || F.statusNotWork);
    } catch { setStatus(F.statusNetwork); }
    setBusy(false);
  };

  /**
   * BEIM GUTSCHEIN GEHT UNSER BELLA-VIDEO RAUS — die Karte ist die Gratis-Hülle (Owner
   * 06.08.2026: „Die Gutscheingenerierung kostet nichts."). Es gibt kein `bild`, kein „er"
   * (einer schenkt einem) und keine Karten-Kasse mehr; verlangt wird nur der Absendername,
   * sonst weiss der Empfänger nicht, von wem das Geschenk kommt. Das BEZAHLTE liegt
   * höchstens IM Geschenk: dessen Etikett liest `/api/einladung` aus der Stripe-Sitzung —
   * der Browser behauptet dort nichts.
   */
  const einladungAnlegen = async () => {
    const gutscheinVideo = gutschein ? (videoUrl || beispiele[0] || "") : "";
    if (gutschein ? (!sie.trim() || !gutscheinVideo) : (!bild || !sie.trim() || !er.trim())) return;
    if (busy) return;
    setBusy(true);
    let device = "";
    try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
    try {
      const r = await fetch("/api/einladung", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Das Video, wenn es bis hierher fertig wurde — sonst das Standbild, damit die
          // Einladung auf keinen Fall an einem noch laufenden Video haengen bleibt. Beim
          // Gutschein ersatzweise unser fertiges Video (siehe `gutscheinVideo` oben).
          videoUrl: (gutschein ? gutscheinVideo : videoUrl) || undefined,
          bildPfad: (videoUrl || gutschein) ? undefined : bildPfad,
          genId, sie: sie.trim(), er: er.trim(), datum,
          /* Nur beim Urlaub: Enddatum und Botschaft. Ohne diese zwei Zeilen sieht der
             Absender sie auf seiner Bau-Karte — und der Empfaenger bekommt sie nie. */
          /* Der Gutschein hat eine Botschaft, aber KEIN Datum — er lädt zu nichts ein. */
          ...(botschaftFrei ? { ...(urlaub ? { bisDatum } : {}), botschaft: botschaftText } : {}),
          /* Nur die SITZUNGSNUMMER des beigelegten Topic-Gutscheins — Betrag und Thema liest
             die Route bei Stripe nach, eine Behauptung des Browsers zählt dort nicht. */
          ...(gutschein && lbGekauft ? { lbGutscheinSession: lbGekauft.session } : {}),
          /* WOHIN die Karte geht, darf der Browser sagen — WAS drin ist, nicht (die Route
             liest Betrag und Thema weiter nur bei Stripe). Ohne diese Zeile stirbt die
             Zustellung mit, sobald die Rückkehr aus der Kasse hakt: keine Sitzungsnummer,
             kein Empfänger, keine Mail — bei längst gebuchtem Guthaben. */
          ...(gutschein && lbMail.trim() ? { lbGutscheinEmpfaenger: lbMail.trim() } : {}),
          ort: ort.trim(), adresse: adresse.trim(), telefon: telefon.trim(),
          /* Das Thema reist mit der Einladung: Die Seite, die der Eingeladene öffnet, muss
             wissen, ob sie „Hochzeitseinladung" mit Menü und Gruppenchat zeigt oder eine
             Urlaubs-Einladung mit nur Ja/Nein. */
          thema: variant,
          lang, device, email: mail.trim(),
        }),
      }).then(x => x.json());
      // Direkt auf die eigene Einladung: dort wird bearbeitet und verschickt. Beim Gutschein
      // mit Bestätigungszeile obendrauf (Owner 06.08.: „ich hoffe es kommt eine bestätigung
      // dass der Gutschein versendet wurde") — die E-Mails hat der Server gerade verschickt.
      if (r?.url) {
        /* Das Geschenk ist jetzt AN DIESER Karte — Wahl und Kauf aus dem Entwurf leeren,
           SYNCHRON vor dem Seitenwechsel (der React-Effekt käme zu spät): Sonst trüge die
           nächste Karte dieses Käufers dasselbe Etikett, obwohl das Guthaben nur einmal
           existiert. */
        if (gutschein) {
          try {
            const d = JSON.parse(localStorage.getItem(SPEICHER) || "{}");
            delete d.lbGekauft; delete d.lbWahl;
            localStorage.setItem(SPEICHER, JSON.stringify(d));
            /* Auch den Notnagel — sonst holt der Trichter dieselbe Sitzung beim nächsten
               Öffnen wieder hervor und etikettiert eine zweite Karte mit einem Geschenk,
               das es nur einmal gibt. */
            localStorage.removeItem(GUTSCHEIN_CS);
          } catch { /**/ }
        }
        /* Die Ziffer ist das ERGEBNIS des Versands, nicht die Absicht: `0`, wenn die Mail an
           den Beschenkten gescheitert ist — dann zeigt die Karte es rot und bietet „nochmal
           senden" an, statt „verschickt" zu behaupten. Ohne Empfängeradresse meldet der
           Server gar keinen Versuch; das bleibt der freundliche Fall („schick den Link"). */
        const versandOk = r?.mails?.empfaenger !== false;
        window.location.href = gutschein ? `${r.url}?verschickt=${versandOk ? "1" : "0"}` : r.url;
      }
      else setStatus(r?.error || F.statusNotWork);
    } catch { setStatus(F.statusNetwork); }
    setBusy(false);
  };

  const eingabe = (wert: string, setzen: (v: string) => void, platzhalter: string, typ = "text") => (
    <input value={wert} onChange={e => setzen(e.target.value)} placeholder={platzhalter} type={typ}
      className="lb-karte-feld h-11 w-full rounded-lg px-3 font-serif text-[15px] outline-none" />
  );

  /**
   * Ein Dialog, überall gleich: Titel, Felder, Fertig. Kein zweites Bedienmuster.
   *
   * `zweitrangig` macht den Fertig-Knopf zum Umriss. Im Foto-Dialog steht schon „Bild erzeugen"
   * — zwei gleich starke Goldknöpfe übereinander lassen den Benutzer raten, welcher der Weg
   * nach vorn ist. Pro Dialog genau ein gefüllter Knopf.
   */
  /* OHNE SPEICHERN-KNOPF (Owner 05.08.2026: „Salveaza raus"). Es wird nichts gespeichert,
     was nicht schon steht — die Eingaben landen sofort im Zustand und auf der Karte.
     Geschlossen wird durch Tippen neben den Dialog. */
  const dialog = (titel: string, inhalt: React.ReactNode, fertigAus = false, zweitrangig = false, ohneSpeichern = true) => (
    <div className="fixed inset-0 z-[80] grid place-items-end sm:place-items-center" style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={() => setFeld(null)}>
      {/**
        * DER DIALOG MUSS SCROLLEN (Owner 05.08.2026: „ich sehe nicht alles und kann auch nicht
        * gescrollt werden. Es muss alles im Screen passen").
        *
        * Er lag als feste Box im Bildschirm: Was nicht hineinpasste, war weg — und damit auch
        * die Kaufknöpfe ganz unten. Auf einem kleinen Handy ist der Foto-Dialog mit Handelzeile,
        * Anleitung, Kachel und zwei Knöpfen sicher höher als der Bildschirm.
        *
        * `max-h-[88vh]` plus `overflow-y-auto` löst beides: Die Box wird nie höher als der
        * Bildschirm, und was darüber hinausgeht, erreicht man mit dem Daumen.
        */}
      <div className="lb-karte flex max-h-[88vh] w-full max-w-[440px] flex-col overflow-y-auto overscroll-contain rounded-t-[22px] p-5 sm:rounded-[22px]" onClick={e => e.stopPropagation()}>
        <p className="lb-karte-gold text-center text-[10px] font-black uppercase tracking-[0.28em]">{titel}</p>
        <div className="mt-3 space-y-2">{inhalt}</div>
        {!ohneSpeichern && (
          <button type="button" onClick={() => setFeld(null)} disabled={fertigAus}
            className={`${zweitrangig ? "lb-karte-absage" : "lb-karte-cta"} mt-4 flex h-11 w-full items-center justify-center rounded-full text-[13px] font-black transition active:scale-95 disabled:opacity-45`}>
            {T.speichern}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div>
      {/* Hell/Dunkel steht seit 06.08.2026 in `TopNav` selbst — das Portal hierher ist
          entfallen, es haette einen zweiten Schalter ergeben. */}
      {/* Die Beispiele (Name/Datum/Ort/Adresse) stehen nur, solange nichts Eigenes da ist —
          danach der normale Leer-Zustand, damit auf der Karte steht, was auch verschickt
          wird. Begruendung ausfuehrlich bei `eigenes` weiter oben. */}
      <EinladungKarte
        sprache={lang}
        /* Der Kartentitel ist das Erste, was auf der Karte steht — er MUSS zum Anlass passen.
           Ohne das steht „Hochzeitseinladung" über einem Strandvideo. */
        /* Ohne eigenen Titel steht „Hochzeitseinladung" über einer Gutschein-Karte. */
        titel={gutschein ? T.gutscheinTitel : urlaub ? T.urlaubTitel : undefined}
        /**
         * KEIN PAAR UND KEIN DATUM BEIM GUTSCHEIN (Owner 05.08.2026: „da steht aber jetzt
         * Ana und Mihai" · „alles ist durcheinander. Es ist die Karte von Urlaub").
         *
         * Die Beispielwerte sind für Hochzeit und Urlaub gedacht: zwei Namen, ein Datum,
         * ein Ort. Beim Gutschein gibt es nichts davon — er verschenkt etwas, er lädt
         * nirgendwohin ein. Leere Felder blendet `EinladungKarte` von selbst aus.
         */
        sie={gutschein ? "" : (sie.trim() || (eigenes ? T.fSie : BEISPIEL_SIE))}
        er={gutschein ? "" : (er.trim() || (eigenes ? T.fEr : BEISPIEL_ER))}
        datum={gutschein ? "" : (datum || (eigenes ? "" : beispielDatum))}
        bisDatum={urlaub ? bisDatum : undefined}
        botschaft={botschaftFrei ? botschaftText : undefined}
        /**
         * „VON …" UNTER DER BOTSCHAFT (Owner 05.08.2026: „kannst du es machen von: …").
         *
         * Bei Hochzeit und Urlaub steht oben das PAAR — der Empfänger weiss sofort, von wem
         * die Karte kommt. Beim Gutschein gibt es keine Namenszeile; ohne diese Zeile öffnet
         * jemand ein Geschenk und weiss nicht, wer es geschickt hat. Es ist derselbe
         * `sie`-Zustand wie bei den anderen Anlässen, nur an einer anderen Stelle gezeigt —
         * kein zweites Feld, das man vergessen könnte zu speichern.
         */
        von={gutschein ? sie.trim() : undefined}
        aufVon={gutschein ? () => setFeld("namen") : undefined}
        aufBotschaft={botschaftFrei ? () => setFeld("botschaft") : undefined}
        /* Die Bestätigungszeile steht schon beim Bauen auf der Karte — der Absender soll
           sehen, was der Empfänger sieht. Ohne Griff: hier gibt es nichts anzutippen. */
        bestaetigen={urlaub ? T.bestaetigen : undefined}
        /* Kein Ort beim Gutschein: Er verschenkt etwas, er lädt nirgendwohin ein. */
        ort={gutschein ? "" : (ort.trim() || (eigenes ? "" : (urlaub ? (BEISPIEL_ORT_URLAUB[lang] || BEISPIEL_ORT_URLAUB.en) : (BEISPIEL_ORT[lang] || BEISPIEL_ORT.en))))}
        /* KEINE ADRESSE BEIM URLAUB. Sie ist ein Hochzeitsfeld: „Straße, Nr., PLZ" sagt
           fünfzig Gästen, wo der Saal steht. Ein Urlaub hat ein Ziel und einen Zeitraum —
           beides steht schon auf der Karte, und eine dritte Zeile darunter wiederholt nur. */
        adresse={botschaftFrei ? undefined : (adresse.trim() || (eigenes ? "" : (BEISPIEL_ADRESSE[lang] || BEISPIEL_ADRESSE.en)))}
        telefon={telefon.trim()}
        demo
        /**
         * BEIM GUTSCHEIN GIBT ES NICHTS EINZUTRAGEN AUSSER DER BOTSCHAFT (Owner 05.08.2026:
         * „es muss ein Text sein unten, nicht Datum … Wo. Es kann alles mögliche sein").
         *
         * Diese drei Griffe sind der Grund, warum „Wann" und „Wo" auf der Karte STEHEN
         * BLEIBEN, auch wenn nichts drinsteht: `EinladungKarte` zeigt den Block, sobald es
         * etwas anzutippen gibt (`tag || ort || aufDatum || aufOrt`) — sonst käme man nie an
         * die Felder heran. Beim Gutschein soll man aber gar nicht herankommen: Er verschenkt
         * etwas, er lädt zu keinem Termin an keinen Ort. Ohne die Griffe verschwindet der
         * ganze Abschnitt, und unter dem Video steht nur noch seine Botschaft — die darf alles
         * Mögliche sein.
         */
        aufNamen={gutschein ? undefined : () => setFeld("namen")}
        aufDatum={gutschein ? undefined : () => setFeld("wann")}
        aufOrt={gutschein ? undefined : () => setFeld("wo")}
        /* DIE HERKUNFTSZEILE GEHÖRT AUF JEDE KARTE (Owner 03.08. „benutze IMMER die Cards …
           mit Titel oben und Made by Luxurybandit.com" · 06.08. „und auch link drauf") —
           dieselbe Zeile wie auf der Kuss-Karte und auf der Seite des Empfängers: Der
           Absender verschickt, was er hier sieht. */
        fuss={<MadeBy karte />}
        video={
          /* Radar nur, wenn es ein eigenes Foto zu scannen gibt. Der Gutschein ohne Foto ist
             waehrend der Kasse ebenfalls `busy` — dann bliebe hier ein leeres, kaputtes
             <img> stehen; stattdessen laeuft das Beispiel weiter. */
          busy && !bild && (weg === "gemeinsam" ? paarFoto : (ihrFoto || seinFoto)) ? (
            /* RADAR-RENDERING (03.08.2026, Owner-Testkauf: „mit radar rendering"). Dasselbe
               Muster wie im Kuss-Trichter (KissFunnel.tsx: Scanner-Balken + Sucher-Ecken über
               dem eigenen Foto) — hier auf der Karte selbst, weil die Karte hier die einzige
               Bühne ist. Zeigt das eigene hochgeladene Foto (geweichzeichnet), nicht das
               Beispielvideo: Wer bezahlt hat, soll sehen, dass AN SEINEM Foto gearbeitet
               wird, nicht am Beispiel von jemand anderem. Kein Rückfall auf `beispielVideo`
               noetig — dieser Zweig ist nur erreichbar, nachdem `erzeugen()` bereits auf
               `fotosDa` geprueft hat, das eigene Foto ist an dieser Stelle also immer da
               (live geprueft: ein `beispielVideo`-Rueckfall in einem `<img>` liefert ohnehin
               nur ein kaputtes Bild, `beispielVideo` ist ein Video, keine Bilddatei). */
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={weg === "gemeinsam" ? paarFoto : (ihrFoto || seinFoto)}
                alt="" className="aspect-[3/4] w-full object-cover object-top blur-[6px] brightness-75" />
              <div className="lb-scanline pointer-events-none absolute inset-x-0 z-10 h-[2px] bg-white shadow-[0_0_18px_5px_rgba(255,255,255,0.7)]" />
              <div className="lb-scanline pointer-events-none absolute inset-x-0 z-10 h-14 -translate-y-1/2 bg-gradient-to-b from-transparent via-white/15 to-transparent" />
              <div className="pointer-events-none absolute left-3 top-3 z-20 h-6 w-6 rounded-tl-lg border-l-2 border-t-2 border-white/90" />
              <div className="pointer-events-none absolute right-3 top-3 z-20 h-6 w-6 rounded-tr-lg border-r-2 border-t-2 border-white/90" />
              <div className="pointer-events-none absolute bottom-3 left-3 z-20 h-6 w-6 rounded-bl-lg border-b-2 border-l-2 border-white/90" />
              <div className="pointer-events-none absolute bottom-3 right-3 z-20 h-6 w-6 rounded-br-lg border-b-2 border-r-2 border-white/90" />
              <div className="lb-onmedia pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-2 bg-gradient-to-t from-black/70 to-transparent p-4 pt-12 text-white">
                <Sparkles className="lb-onmedia h-4 w-4 animate-pulse" />
                <span className="lb-onmedia text-[12px] font-black">{status || F.oneMoment}</span>
              </div>
            </div>
          ) : gutschein && videoUrl ? (
            /**
             * SEIN EIGENES GUTSCHEIN-VIDEO — fertig erzeugt, in DERSELBEN Karte (Skill
             * `card`: die drei Symbole kommen aus `EinladungAnsicht`, nie von Hand).
             * Vorher fiel die Anzeige hier auf das Beispiel-Karussell zurück: Sie hatte
             * bezahlt, ihr Video war fertig — und die Karte zeigte weiter unser Muster.
             * `originalton`, denn die Tonspur ist beim Gutschein das Produkt (ihre Stimme,
             * ihr Satz) — Musik darüber würde genau das übertönen. Nur beim Gutschein:
             * Hochzeit und Urlaub behalten ihr Standbild samt „Foto ersetzen", dort ist das
             * Video für den Empfänger, nicht für die Bau-Ansicht.
             */
            <EinladungAnsicht id="" videoUrl={videoUrl} zaehlen={false}
              originalton musik=""
              tonText={T.ton} tonAusText={T.tonAus} grossText={T.gross} kleinText={T.klein}
              teilen={
                <TeilenKnopf rund url={`/themes/gutschein?utm_source=share`}
                  text={TEILEN_TEXT[lang] ?? TEILEN_TEXT.en}
                  label={T.teilen} kopiertLabel={T.zusDanke} />
              } />
          ) : bild ? (
            /* Derselbe Knopf auf dem eigenen Bild — hier heisst „Foto ersetzen" endlich
               woertlich, was es tut. Vorher war das ganze Bild ein unsichtbarer Knopf; wer
               das nicht erraet, sitzt mit dem ersten Ergebnis fest, das die KI ausspuckt. */
            <div className="relative">
              {/* DAS BILD BEHAELT SEINE HOEHE (Owner 31.07.2026: „Achtung, das Bild ist
                  abgeschnitten").
                  Der Kasten stand auf 3:4 — das Mass des VIDEOS (gemessen: 480×640). Die KI
                  liefert aber 1024×1536, also 2:3, und `object-cover` schnitt davon elf
                  Prozent der Hoehe weg: oben ein Stueck Kopf, unten die Haende. Genau die
                  Stellen, auf die jemand schaut, der sich selbst sucht.
                  Statt zu schneiden, waechst die Karte mit. `width`/`height` stehen dran,
                  damit der Platz schon reserviert ist, bevor das Bild geladen hat — sonst
                  springt die halbe Seite, wenn es ankommt. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bild} alt="" width={1024} height={1536} className="block h-auto w-full" />
              {busy ? (
                /* DAS VIDEO ENTSTEHT NOCH (03.08.2026, Owner: „ich habe ein Foto statt Video
                   und dann?"). Vorher stand hier schon der „Foto ersetzen"-Knopf, sobald das
                   Standbild da war — obwohl im Hintergrund noch das bezahlte Video lief, und
                   nirgendwo AUF dem Bild stand, dass da noch etwas kommt. Jetzt steht der
                   Status direkt auf dem Foto, dort wo der Blick ohnehin hinfaellt. */
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-black/70 to-transparent p-4 pt-12 text-white">
                  <Loader2 className="lb-onmedia h-4 w-4 shrink-0 animate-spin" />
                  <span className="lb-onmedia text-[12px] font-black">{status || F.renderingVideo}</span>
                </div>
              ) : (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4">
                  <button type="button" onClick={() => setFeld("fotos")}
                    className="lb-karte-cta pointer-events-auto flex h-11 items-center justify-center gap-2 rounded-full px-6 text-[14px] font-black transition active:scale-95">
                    <ImageUp className="h-4 w-4 shrink-0" />
                    {T.ersetzen}
                  </button>
                </div>
              )}
            </div>
          ) : beispiele.length ? (
            /* FRAGMENT, WEIL HIER ZWEI GESCHWISTER STEHEN: die Karte und der Kaufaufruf
               darunter. Ohne die Klammer ist es kaputtes JSX — genau daran sind die drei
               Seiten am 05.08.2026 kurz auf 500 gelaufen. */
            /* DAS BEISPIEL LAEUFT, BIS DAS EIGENE BILD DA IST.

               EIN RICHTIGER KNOPF, MEHR NICHT (Owner 31.07.2026: „auf das Bild ein richtiges
               CTA Replace Photo, mehr nicht"). Vorher lag hier ein breiter Streifen mit dem
               ganzen Satz „Ein Foto von dir, eins von ihm — mehr braucht es nicht". Das ist
               eine Erklaerung, kein Knopf: Es sieht aus wie eine Bildunterschrift, und auf
               Bildunterschriften tippt niemand. Zwei Woerter auf einer goldenen Pille sagen,
               dass hier etwas passiert.

               Nur der Knopf ist antippbar, nicht die ganze Flaeche — sonst waere es ein Knopf
               im Knopf, und das ist kaputtes HTML. Er sitzt unten mittig, weit weg vom
               Ton-Knopf oben rechts. */
            <>

            <div className="relative">
              {/* ALLE DREI, AUCH AUF DER VORSCHAU (Owner 04.08.2026: „wirklich bei allen: bei
                      Previews, Templates, generierten"). Geteilt wird hier die THEMENSEITE — sein
                      eigenes Ergebnis gibt es ja noch nicht, und ein Knopf, der nichts hat,
                      waere schlimmer als keiner. */}
                  <KartenKarussell folien={beispiele.map((url, i) => (
                    <EinladungAnsicht key={i} id="" videoUrl={url} zaehlen={false}
                      /**
                       * BEIM GUTSCHEIN ZÄHLT DIE STIMME, NICHT DIE MUSIK (Owner 05.08.2026:
                       * „Hier habe ich ein Original-Sound bei Gutschein").
                       *
                       * `EinladungAnsicht` legt ohne diese zwei Angaben den HOCHZEITSMARSCH
                       * darüber (`musik = HOCHZEITS_MUSIK`, `originalton = false`) und schaltet
                       * die Tonspur des Videos stumm. Bei Hochzeit und Urlaub ist das genau
                       * richtig — dort erzeugen wir stumme Videos und die Musik trägt die
                       * Stimmung. Beim Gutschein ist die Tonspur das PRODUKT: Bella sagt „I
                       * have something for you". Musik darüber würde das Einzige übertönen,
                       * wofür das Video da ist.
                       */
                      originalton={gutschein}
                      musik={gutschein ? "" : undefined}
                      tonText={T.ton} tonAusText={T.tonAus} grossText={T.gross} kleinText={T.klein}
                      teilen={
                        <TeilenKnopf rund url={`/themes/${gutschein ? "gutschein" : urlaub ? "holiday" : "wedding"}?utm_source=share`}
                          text={TEILEN_TEXT[lang] ?? TEILEN_TEXT.en}
                          label={T.teilen} kopiertLabel={T.zusDanke} />
                      } />
                  ))} />
            </div>
            {/**
              * DER KAUFAUFRUF STEHT UNTER DER KARTE, HELL UND ÜBER DIE GANZE BREITE — wie beim
              * Kuss (Owner 05.08.2026: „was sind das für Buttons? Wir haben doch ein CI" ·
              * „wozu haben wir Kuss gemacht?").
              *
              * Vorher schwebte er gedeckt AUF dem Video (`lb-karte-cta`, halbe Breite). Damit
              * gab es zwei Kaufaufrufe in zwei Farben und an zwei Plätzen für dieselbe
              * Handlung — auf der Kuss-Karte hell und unten, auf der Einladung dunkel und
              * mittig im Bild. Der Kuss ist die Vorlage, also gewinnt seiner.
              *
              * `lb-gold` ist die CI-Farbe (globals.css). `lb-karte-cta` bleibt für die kleinen
              * Knöpfe INNERHALB der Karte richtig — dort, wo gedecktes Altgold zum Elfenbein
              * gehört. Der Kaufaufruf gehört nicht dazu: Er ist der eine Knopf, der auffallen
              * MUSS.
              */}
            {!!beispiele.length && (
              <button type="button" onClick={() => setFeld("fotos")}
                className="lb-gold mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full text-center text-[14px] font-black leading-tight shadow-[0_6px_20px_rgba(0,0,0,0.2)] active:scale-95 transition">
                <ImageUp className="h-4 w-4 shrink-0" />
                {F.datenErsetzen}
              </button>
            )}
            </>
          ) : (
            /* OHNE BEISPIELVIDEO: leeres Feld, aber flacher als das echte Bildformat. Ein 3:4
               grosses Nichts ist auf einem Handy fast fuenfhundert Punkte hoch — dann stehen
               „Wann", „Wo" und der Verschicken-Knopf unter dem Bildschirmrand. */
            <button type="button" onClick={() => setFeld("fotos")}
              className="relative grid h-[260px] w-full place-items-center overflow-hidden">
              <span className="lb-tippbar grid h-full w-full place-items-center rounded-xl px-6 text-center">
                <span>
                  <ImageUp className="lb-karte-gold mx-auto h-9 w-9" />
                  <span className="mt-2 block font-serif text-[15px] font-bold">{F.pickHint}</span>
                </span>
              </span>
            </button>
          )
        }
      />

      {/* Der laufende Preis steht VOR dem Kauf da, nicht erst nach der Erzeugung — bei
          Anzeigen-Traffic ist ein verstecktes Abo eine Rückbuchung mit Ansage. Beim
          Gutschein steht der Preis schon auf dem Kaufknopf, und die Urlaubszeile nennt
          Bild- und Videopreise, die es dort nicht gibt — keine zweite Zeile (Skill
          `bezahlung` §8: „hier müssen wir sparen"). */}
      {!gutschein && (
      <p className="mt-2 text-center text-[11px] font-bold leading-snug text-white/60">
        {fillPrices(botschaftFrei ? T.preiseUrlaub : T.preise, lang)}
      </p>
      )}

      {/**
        * DARAUS EIN VIDEO MACHEN — 3,99 € (Owner 04.08.2026).
        *
        * Steht nur da, wenn es ein Bild gibt und noch KEIN Video. Bewusst der zweitrangige
        * Knopf (Umriss statt gefüllt): Die Hauptsache ist das Verschicken darüber — die
        * Einladung mit Bild ist vollständig, das Video ist eine Aufwertung. Ein zweiter
        * goldener Knopf daneben liesse den Kunden raten, welcher der Weg nach vorn ist.
        */}
      {bild && !videoUrl && (
        <button type="button" onClick={() => void videoNachtraeglich()} disabled={videoBusy || busy}
          className="lb-karte-absage mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full text-[13px] font-black transition active:scale-95 disabled:opacity-45">
          {videoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {videoBusy ? (status || F.oneMoment) : fillPrices(T.videoDaraus, lang)}
        </button>
      )}

      {/**
        * NACH DEM KAUF: SEIN GUTSCHEIN-LINK (Owner 05.08.2026: „nicht hier auf der
        * Landingpage. Erst beim Editieren des Gutscheins" — und zum Feld im Kauf-Dialog:
        * „raus"). Genau HIER ist das Editieren: bezahlt, die Karte steht, jetzt kommt der
        * Inhalt hinein. Nur der LINK, nie eine Datei, nie der Code (Konzept §3b) — der Code
        * bleibt beim Händler, bei uns liegt nichts zu stehlen. Freiwillig: Ohne Link geht
        * die Karte trotzdem raus, dann ist sie Botschaft ohne Anhang.
        */}
      {/* IMMER SICHTBAR (Owner 06.08.2026: „wie wählt er unser Produkt aus oder Credit?"):
          Die Geschenk-Wahl steht offen unter der Karte, nicht hinter einer Kasse. Getippt wird
          eine AUSWAHL, bezahlt am goldenen Knopf darunter (Owner: „zuerst muss Geschenk
          auswählen dann mit Button Zahlen") — im Dialog zahlt dessen eigener grosser Knopf. */}
      {gutschein && (
        <div className="mt-4">
          {geschenkWahl(true)}
        </div>
      )}
      {/* Verschicken steht erst da, wenn es etwas zu verschicken gibt. Beim Gutschein heisst
          das nur: ein Absendername — die Karte ist gratis (Owner 06.08.), bezahlt wird
          höchstens das Geschenk darin, und das prüft sein eigener Kaufweg. */}
      {(gutschein ? !!sie.trim() : !!(bild && sie.trim() && er.trim())) && (
        <div className="mt-4">
          {/**
            * EIN GEFÜLLTER KNOPF JE BILDSCHIRM (CI-Regel).
            *
            * Seit die Geschenk-Wahl ihren eigenen Kaufknopf hat, standen hier zwei goldene
            * Knöpfe direkt übereinander: „Geschenk bezahlen — 29 €" und „Verschicken". Zwei
            * gleich starke Knöpfe sind keine Wahl, sondern eine Ratefrage — und die falsche
            * Antwort verschickt eine Karte, deren Geschenk noch nicht bezahlt ist.
            *
            * Solange ein Geschenk gewählt und NICHT bezahlt ist, wird Verschicken zum
            * Zweitweg. Es bleibt möglich: Die Karte ist gratis, sie darf auch ohne Geschenk
            * raus. Aber der Weg nach vorn ist dann sichtbar der Kauf.
            */}
          <Knopf art={gutschein && lbWahl && !lbGekauft ? "umriss" : "gold"} className="lb-buy"
            onClick={() => void einladungAnlegen()} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {T.teilen}
          </Knopf>
          {/* Der Probe-Satz erzählt vom Hochzeits-Abo — auf der Gutschein-Karte wäre er
              gelogen (gekauft ist gekauft, 30 Tage online, kein Abo). */}
          {!gutschein && (
          <p className="mt-2 text-center text-[11px] font-bold leading-snug text-white/60">{F.probeHinweis}</p>
          )}
        </div>
      )}
      {/* SICHTBARER HINWEIS STATT STILLEM FEHLEN (03.08.2026, Owner-Testkauf: „ich kann es
          nicht sharen. Was ist das bitte?"). Das Bild war fertig, Datum/Ort waren eingetragen
          — aber die Namen standen noch auf dem Beispiel „Ana & Mihai", und der Verschicken-
          Knopf blieb deshalb unsichtbar, ohne zu sagen wieso. Derselbe Fehler, den plan.md
          schon beim Erzeugen-Knopf gefunden hatte (stumm statt sichtbar), hier am Verschicken-
          Knopf noch einmal. */}
      {/* Beim Gutschein fehlt höchstens der Absendername („Von") — derselbe sichtbare
          Hinweis statt eines stumm fehlenden Knopfs; der Text kommt aus der
          GUTSCHEIN-Tabelle (kiss-i18n), die Hochzeits-Zeile spricht von „euren Namen".
          Er erscheint erst, wenn schon etwas in der Karte liegt (Geschenk oder Link) —
          vorher wäre er ein roter Satz auf einer noch leeren Seite. */}
      {(gutschein ? (!!lbGekauft && !busy && !sie.trim()) : (bild && !busy && (!sie.trim() || !er.trim()))) && (
        <p role="alert" className="lb-karte-fehler mt-3 text-center text-[12.5px] font-black leading-snug">
          {F.namenVorSenden}
        </p>
      )}
      {status && <p className="mt-2 text-center text-[12px] font-bold text-white/75">{status}</p>}

      {/* BEIM GUTSCHEIN NUR EIN NAME: der des Absenders. Zwei Namensfelder setzen ein Paar
          voraus — hier verschenkt EINER an EINEN, und wer der Empfänger ist, steht in seiner
          Botschaft, nicht in einem Feld. */}
      {/* `fDu` („Dein Vorname"), NICHT `fSie` („Ihr Vorname") — Owner 05.08.2026: „Prenumele
          ei? als von wem. Das heisst Prenumele tau!". `fSie` ist die BRAUT; hier steht der
          Absender, und der ist der, der das Feld ausfüllt. */}
      {feld === "namen" && dialog(gutschein ? T.fVon : T.namen, gutschein
        ? eingabe(sie, setSie, T.fDu)
        : (<>
        {eingabe(sie, setSie, T.fSie)}
        {eingabe(er, setEr, T.fEr)}
      </>))}

      {/* BEIM URLAUB ZWEI DATEN, VON–BIS. Das zweite steht ohne Sternchen da: Wer noch nicht
          gebucht hat, lässt es leer, und die Karte zeigt dann den einen Tag. */}
      {feld === "wann" && dialog(T.wann, urlaub ? (<>
        {eingabe(datum, setDatum, T.fVon, "date")}
        {eingabe(bisDatum, setBisDatum, T.fBis, "date")}
      </>) : eingabe(datum, setDatum, T.fDatum, "date"))}

      {/**
        * DIE BOTSCHAFT — ein mehrzeiliges Feld, kein einzeiliges (Owner 04.08.2026:
        * „vielleicht will derjenige mehr schreiben").
        *
        * Der Vorgabesatz steht als Startwert IM Feld, nicht als Platzhalter: Wer ihn behalten
        * will, tut nichts; wer ihn ändern will, tippt darüber. Ein Platzhalter wäre hier
        * falsch — er verschwindet beim ersten Tastendruck und lässt jemanden mit einem leeren
        * Feld zurück, obwohl auf der Karte gerade noch ein Satz stand.
        */}
      {feld === "botschaft" && dialog(T.fBotschaftTitel, (
        <>
          <textarea
            value={botschaft || (gutschein ? T.fBotschaftGutschein : T.fBotschaft)}
            onChange={e => setBotschaft(e.target.value.slice(0, BOTSCHAFT_MAX))}
            rows={4} maxLength={BOTSCHAFT_MAX}
            className="lb-karte-feld w-full resize-none rounded-lg px-3 py-2 font-serif text-[15px] leading-snug outline-none" />
          <p className="text-right font-serif text-[11px] opacity-60">
            {(botschaft || (gutschein ? T.fBotschaftGutschein : T.fBotschaft)).length}/{BOTSCHAFT_MAX}
          </p>
        </>
      ))}

      {feld === "wo" && dialog(T.wo, (<>
        {eingabe(ort, setOrt, T.fOrt)}
        {eingabe(adresse, setAdresse, T.fAdresse)}
        {eingabe(telefon, setTelefon, T.fTelefon, "tel")}
      </>))}

      {/* „Eure Fotos", nicht „1 · Die Braut": Die Schrittnummern gehoerten zum Trichter, den es
          nicht mehr gibt. Eine Nummer ohne Schritte davor und danach verwirrt nur. */}
      {feld === "fotos" && dialog(gutschein ? (F.lbTitel ?? T.fotos) : botschaftFrei ? T.fotosUrlaub : T.fotos, (<>
        {/* Dieselbe Anweisung wie im Kuss-Trichter — hier in der Karten-Fassung. BEIM
            GUTSCHEIN GIBT ES KEIN FOTO MEHR (Owner 06.08.2026: „ich will hier eigentlich gar
            nicht dass die Leute ihre eigene Bilder uploaden. Das wird keiner machen. Wir
            haben die Bella, die die Botschaft bringt.") — also auch keine Foto-Anleitung. */}
        {!gutschein && <FotoAnleitung lang={lang} karte paar={weg === "gemeinsam"} />}
        {/* ZWEI WEGE ZUM ZIEL (Owner 31.07.2026: „und es fehlt Upload gemeinsam").
            Fast jedes Paar hat ein Foto zu zweit — vom Urlaub, von einer Feier. Zwei EINZELNE
            Fotos zu verlangen ist eine Huerde ohne Grund: Sie muss zwei Bilder suchen, von
            denen eines meist gar nicht existiert, und genau dort steigen Leute aus.
            Der Umschalter steht ganz oben, weil er entscheidet, was darunter zu tun ist. */}
        {/* KEIN UMSCHALTER BEIM GUTSCHEIN: „zwei Fotos" oder „eins von uns beiden" setzt zwei
            Menschen voraus. Hier gibt es nur ihn — und daneben seinen Gutschein, der kein Foto
            ist, sondern ein Link. */}
        {!gutschein && (
        <div className="grid grid-cols-2 gap-1 rounded-full p-1" style={{ background: "rgba(26,22,15,0.07)" }}>
          {([["zwei", T.fZwei], ["gemeinsam", T.fGemeinsam]] as const).map(([w, label]) => (
            <button key={w} type="button" onClick={() => setWeg(w)}
              className={`${weg === w ? "lb-karte-cta" : ""} h-9 rounded-full px-2 text-[12px] font-black leading-tight transition active:scale-95`}>
              {label}
            </button>
          ))}
        </div>
        )}

        {gutschein ? (
          /**
           * KEIN UPLOAD MEHR (Owner 06.08.2026: „Das wird keiner machen. Wir haben die
           * Bella, die die Botschaft bringt."). Der Dialog ist jetzt: Botschaft, Absender,
           * und die GESCHENK-WAHL — sein Händler-Link oder eines unserer Produkte bzw.
           * nacktes Guthaben. Bezahlt wird nur das Gewählte; die Karte kostet nichts.
           */
          <>
            {/* BOTSCHAFT UND ABSENDER GLEICH HIER (Owner 05.08.2026: „dafür dein Text rein /
                Botschaft … und deinen Namen"). Bei Hochzeit und Urlaub tippt man dafür auf die
                Karte; beim Gutschein gibt es sonst nichts mehr zu tun, also stehen die zwei
                Felder direkt im Weg nach vorn — sonst verschickt er die Vorgabe, ohne je
                gemerkt zu haben, dass sie änderbar war. */}
            <p className="mt-1 text-[12px] font-black uppercase tracking-wide lb-karte-gold">{T.fBotschaftTitel}</p>
            <textarea
              value={botschaft || T.fBotschaftGutschein}
              onChange={e => setBotschaft(e.target.value.slice(0, BOTSCHAFT_MAX))}
              rows={3} maxLength={BOTSCHAFT_MAX}
              className="lb-karte-feld mt-1.5 w-full resize-none rounded-lg px-3 py-2 font-serif text-[15px] leading-snug outline-none" />

            <p className="mt-3 text-[12px] font-black uppercase tracking-wide lb-karte-gold">{T.fVon}</p>
            <input value={sie} onChange={e => setSie(e.target.value.slice(0, 40))}
              placeholder={T.fDu} maxLength={40}
              className="lb-karte-feld mt-1.5 h-12 w-full rounded-lg px-3 font-serif text-[15px] outline-none" />

            {geschenkWahl(false)}
          </>
        ) : weg === "zwei" ? (
          <div className="grid grid-cols-2 gap-2">
            {/* „Du, die Braut" und „Er, der Bräutigam" — ein Paar Beschriftungen, nicht eine
                Zeile und ein Abzeichen. `F.you` heisst schlicht „ER"; das war im alten Trichter
                ein Chip auf dem Bild und liest sich neben „Du, die Braut" wie ein Fehler. */}
            {([
              { wer: "sie", foto: ihrFoto, ref: ihrRef, titel: F.upTitle, hinweis: F.upHint, platz: PLACEHOLDER_FRAU },
              { wer: "er", foto: seinFoto, ref: seinRef, titel: botschaftFrei ? T.fotoEingeladen : T.fotoEr, hinweis: F.youHint, platz: PLACEHOLDER_MANN },
            ] as const).map(k => (
              <UploadKachel key={k.wer}
                foto={k.foto} titel={k.titel} hinweis={k.hinweis} platzhalter={k.platz}
                onWaehlen={() => k.ref.current?.click()}
                onLoeschen={() => (k.wer === "sie" ? setIhrFoto("") : setSeinFoto(""))}
                loeschenLabel={T.loeschen} />
            ))}
          </div>
        ) : (
          /* Ein breites Feld statt zweier schmaler — und im Querformat (4:3), weil ein Foto
             von zwei Menschen nebeneinander fast nie hochkant ist. */
          <div className="relative">
            <button type="button" onClick={() => paarRef.current?.click()}
              className="lb-tippbar grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-xl">
              {paarFoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={paarFoto} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="px-4 text-center font-serif text-[14px] font-bold">{T.fPaar}</span>
              )}
            </button>
            {paarFoto && (
              <button type="button" aria-label={T.loeschen} onClick={() => setPaarFoto("")}
                style={{ background: "#fff", color: "#dc2626", boxShadow: "0 2px 10px rgba(0,0,0,0.35)" }}
                className="absolute left-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full transition active:scale-90">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/**
         * BEIM URLAUB STEHT HIER DER ORT, NICHT EINE SZENE (Owner 04.08.2026: „hier muss doch
         * gleich die Adresse eingeben werden, damit AI weiss was er machen soll" — „die Szene
         * ist hier nicht wichtig auszuwählen" — „also lieber die Adresse").
         *
         * Er hat recht, und es ist mehr als eine Umsortierung: Bei der Hochzeit ist die Kulisse
         * beliebig (Kirche, Garten, Ballsaal) — eine von vier reicht. Beim Urlaub IST der Ort
         * das Versprechen. „Komm mit mir nach Teneriffa" und dann ein beliebiger Strand: Dann
         * zeigt das Video etwas anderes als die Karte darunter verspricht.
         *
         * Das Feld ist DASSELBE `ort`, das auf der Karte unter „Wo" steht — ein Zustand, zwei
         * Orte zum Eintippen. Wer es hier ausfüllt, sieht es sofort oben auf der Karte stehen.
         * Und `holidayInvitePrompt` reicht genau diesen Text an das Bild- und das Videomodell
         * weiter; das ist die Antwort auf „damit AI weiss was er machen soll".
         *
         * Die vier Szenen-Kacheln sind damit beim Urlaub weg — mitsamt dem Problem, dass zwei
         * davon kein brauchbares Bild hatten.
         */}
        {urlaub ? (<>
          {/**
           * DIE NAMEN STEHEN HIER MIT (Owner 04.08.2026: „Wann gebe ich die Namen ein, Ana und
           * Mihai?").
           *
           * Die Antwort war bis dahin: gar nicht hier — man musste auf der Karte auf die Namen
           * tippen. Das ist so gewollt (Owner 31.07.2026: „er klickt auf Name, dann öffnet sich
           * Dialog") und BLEIBT auch: Die Karte ist die Bedienung. Nur war sie hier die
           * EINZIGE Bedienung, und das ist der Fehler.
           *
           * Denn die Namen wurden zum Erzeugen nie verlangt: Man konnte Fotos hochladen,
           * bezahlen, das Video bekommen — und erst danach stand da „Tippt oben auf eure
           * Namen, um die Einladung zu verschicken". Wer das nicht erriet, hatte ein bezahltes
           * Video und keine Einladung.
           *
           * Also stehen sie jetzt AUCH hier, in dem Dialog, in dem ohnehin alles
           * zusammenkommt, was die Karte und der Auftrag brauchen. Es ist derselbe Zustand
           * (`sie`/`er`) — wer sie oben auf der Karte antippt, findet sie hier ausgefüllt und
           * umgekehrt. Zwei Wege zum selben Feld, kein zweiter Datensatz.
           */}
          {/* NEUTRALE BESCHRIFTUNGEN: `fSie`/`fEr` sind Braut und Bräutigam. Hier lädt einer
              einen Menschen ein, und wer das ist, wissen wir nicht. */}
          <div className="grid grid-cols-2 gap-2">
            {eingabe(sie, setSie, T.fDu)}
            {eingabe(er, setEr, T.fEingeladen)}
          </div>
          <div className="mt-1">
            <p className="text-[12px] font-bold text-white/85">{F.ortFrage}</p>
            {eingabe(ort, setOrt, F.ortPlatzhalter)}
            <p className="mt-1 text-center font-serif text-[11.5px] leading-snug opacity-70">{F.ortHinweis}</p>
          </div>

          {/**
            * ALLES IN EINEM DURCHGANG — auch Datum und Botschaft.
            *
            * Die Karte bleibt die Bedienung: Wer oben auf „Wann" oder auf die Botschaft
            * tippt, öffnet weiterhin seinen Dialog, und es ist derselbe Zustand. Aber sie
            * darf nicht die EINZIGE Bedienung sein — genau daran ist der Owner gescheitert
            * („Wann gebe ich die Namen ein?"), und bei Datum und Botschaft wäre es derselbe
            * Weg: bezahlen, Ergebnis bekommen, und erst dann merken, dass die Karte halb
            * leer ist.
            *
            * Hier steht jetzt alles beisammen, was auf die Karte kommt, in der Reihenfolge,
            * in der ein Mensch es denkt: wer → wohin → wann → was du sagen willst → eure
            * Fotos → erzeugen.
            */}
          <div className="mt-1">
            <p className="text-[12px] font-bold text-white/85">{T.wann}</p>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {eingabe(datum, setDatum, T.fVon, "date")}
              {eingabe(bisDatum, setBisDatum, T.fBis, "date")}
            </div>
          </div>

          <div className="mt-1">
            <p className="text-[12px] font-bold text-white/85">{T.fBotschaftTitel}</p>
            {/* Der Vorgabesatz steht IM Feld, nicht als Platzhalter: Wer ihn behalten will,
                tut nichts. Ein Platzhalter verschwände beim ersten Tastendruck. */}
            <textarea
              value={botschaft || T.fBotschaft}
              onChange={e => setBotschaft(e.target.value.slice(0, BOTSCHAFT_MAX))}
              rows={3} maxLength={BOTSCHAFT_MAX}
              className="lb-karte-feld mt-1 w-full resize-none rounded-lg px-3 py-2 font-serif text-[15px] leading-snug outline-none" />
            <p className="text-right font-serif text-[11px] opacity-60">
              {(botschaft || T.fBotschaft).length}/{BOTSCHAFT_MAX}
            </p>
          </div>
        </>) : (
        /* Ohne Szenen keine Ueberschrift: Beim Gutschein wird nichts erzeugt, also gibt es
           nichts auszuwaehlen. Der Kommentar steht VOR dem Ausdruck und nicht als JSX-Kind —
           in einem Ternaer-Zweig waere eine geschweifte Kommentarklammer ein zweites Kind und
           damit kaputtes JSX. */
        <div className={SZENEN.length ? "mt-1" : "hidden"}>
          <p className="text-[12px] font-bold text-white/85">{F.szeneTitel}</p>
          <div className="mt-1.5 grid grid-cols-4 gap-2">
            {SZENEN.map(sz => (
              <button key={sz.id} type="button"
                onClick={() => setSzeneId(w => (w === sz.id ? "" : sz.id))}
                aria-pressed={szeneId === sz.id}
                className={`relative overflow-hidden rounded-xl border transition active:scale-95 ${szeneId === sz.id ? "border-[#f6cf51] ring-2 ring-[#f6cf51]" : "border-white/20"}`}>
                {sz.kachel ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sz.kachel} alt={sz.name} className="aspect-[3/4] w-full object-cover" />
                ) : (
                  /* NOCH KEIN BILD FÜR DIESE SZENE (siehe lib/holiday-invite.ts). Dann nennt
                     die Kachel die Szene beim Namen, statt ein fremdes Bild zu zeigen — das
                     wäre ein Versprechen, das der Auftrag nicht einlöst. `lb-tippbar` ist
                     dieselbe gestrichelte Fläche wie bei den leeren Foto-Kacheln darüber. */
                  <span className="lb-tippbar grid aspect-[3/4] w-full place-items-center px-1 text-center font-serif text-[10px] font-bold leading-tight">
                    {sz.name}
                  </span>
                )}
                {szeneId === sz.id && (
                  <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-[#f6cf51]">
                    <Check className="h-3.5 w-3.5 text-black" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        )}

        {/* Die Adresse steht VOR dem Erzeugen — dieselbe Regel wie im Trichter: kein Bild auf
            unsere Kosten fuer jemanden, der nie erreichbar ist. */}
        {eingabe(mail, setMail, F.mailQuestion, "email")}
        {/**
          * STUMM GESPERRT WAR DER FEHLER (plan.md Punkt 1b: „ich drücke drauf und passiert
          * nichts") — UND EIN ECHTER KNOPF FUER DEN HINWEIS (02.08.2026, live geprüft): Ein
          * `disabled`-Knopf feuert in keinem Browser ein `click`-Ereignis, auch nicht an einem
          * umschliessenden Element — ein Klick auf die Huelle darum kommt also NIE an. Der
          * Knopf bleibt deshalb bewusst aktiv (nur das Aussehen dimmt sich); fehlt etwas,
          * meldet der Klick es, statt zu verpuffen.
          */}
        {/**
          * DIE AUFLADESTUFEN STEHEN HIER, NICHT IN EINEM ZWEITEN FENSTER (Owner 05.08.2026:
          * „weil das schon ein Dialogfenster ist").
          *
          * Sie ersetzen den Kaufknopf, sobald das Guthaben nicht reicht — an derselben Stelle,
          * auf die er gerade getippt hat. Ein Fenster über einem Fenster ist eine Sackgasse:
          * Man weiss nicht mehr, welches „Zurück" welches schliesst.
          *
          * Sie erscheinen NUR, wenn das Geld fehlt (Owner: „und das kommt, falls er nicht
          * genügend Geld hat") — wer aufgeladen hat, tippt auf kaufen und es passiert.
          */}
        {aufladeWahl ? (
          <div className="mt-1">
            <p className="text-center font-serif text-[14px] leading-snug">
              {fillPrices(gutschein ? T.ctaGutschein : T.ctaBild, lang)}
            </p>
            {AUFLADE_STUFEN.filter(c => c >= preisCents).map(stufe => (
              <button key={stufe} type="button" disabled={busy}
                /* Die Stufe setzt den UNTERBROCHENEN Kauf fort — durch `erzeugen` bzw. das
                   Aufwerten, nicht durch ein nacktes `bezahlen`: Nur so läuft nach dem
                   Aufladen auch die Erzeugung weiter, statt dass Geld auf dem Konto liegt
                   und nichts passiert (Owner 05.08.2026: „die Zahlung geht nicht"). */
                onClick={() => {
                  setAufladeWahl(false);
                  void (aufladeZiel === "aufwerten" ? videoNachtraeglich(stufe) : erzeugen(aufladeZiel === "video", stufe));
                }}
                className="lb-gold mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[14px] font-black transition active:scale-95 disabled:opacity-60">
                {eur(stufe, lang)}
              </button>
            ))}
          </div>
        ) : (
        <button type="button"
          onClick={() => {
            if (busy) return;
            if (!fotosDa) { setHinweis(F.pickFirst); return; }
            /**
             * DIE NAMEN VOR DER KASSE, NICHT DANACH (Owner 04.08.2026: „Wann gebe ich die
             * Namen ein, Ana und Mihai?").
             *
             * Ohne Namen entsteht ein bezahltes Video, aber KEINE verschickbare Einladung —
             * `einladungAnlegen()` verlangt sie, und der Verschicken-Knopf bleibt bis dahin
             * unsichtbar. Diesen Weg zu Ende zu gehen und die Rechnung erst am Ziel zu
             * präsentieren, ist genau die Sorte Sackgasse, an der Leute schliessen statt
             * nachzubessern. Zwei Vornamen kosten fünf Sekunden — vorher.
             *
             * Nur beim Urlaub, weil nur dort die Felder in diesem Dialog stehen. Bei der
             * Hochzeit sitzen sie auf der Karte, und dort ist der bestehende Hinweis nach dem
             * Bild der richtige Weg — sonst sperrt eine Prüfung ein Feld, das gar nicht auf
             * diesem Bildschirm steht.
             */
            if (urlaub && (!sie.trim() || !er.trim())) { setHinweis(T.namen); return; }
            if (!mailOk) { setHinweis(F.mailInvalid); return; }
            /* Ein gewähltes Geschenk braucht die Adresse des Beschenkten — dort landet das
               Guthaben, sie ist sein Login. Sichtbar rot statt stummem Nichtstun. */
            if (gutschein && lbWahl && !lbGekauft && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lbMail.trim())) {
              setHinweis(F.lbFehlerMail ?? ""); return;
            }
            setHinweis("");
            void erzeugen(false);
          }}
          className={`lb-gold flex h-12 w-full items-center justify-center gap-2 rounded-full text-[14px] font-black transition active:scale-95${(!fotosDa || !mailOk || busy || (urlaub && (!sie.trim() || !er.trim()))) ? " opacity-45" : ""}`}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {/* KEIN GRATIS-VERSPRECHEN AUF EINEM KNOPF, DER KEINS EINHAELT (plan.md Punkt 1a,
              02.08.2026: hier tatsaechlich behoben, nicht nur im toten `KissFunnel`-Pfad).
              `ctaFree` sagt „gratis" — seit der Kasse oben stimmt das nicht mehr. Waehrend
              Kasse/Bild/Video laufen, steht der laufende Status auf dem Knopf, nicht drei
              Minuten lang derselbe Satz. */}
          {/* Beim Gutschein steht auf dem Knopf, was WIRKLICH bezahlt wird: der Preis des
              gewählten Geschenks — oder „Karte erstellen", denn die Karte selbst ist gratis
              (Owner 06.08.2026: „Die Gutscheingenerierung kostet nichts."). */}
          {busy ? (status || F.oneMoment)
            : gutschein
              ? (lbWahl && !lbGekauft
                ? (F.lbCta ?? "").replace("{preis}", eur(lbWahl.cents, lang))
                : (F.ctaVideo ?? ""))
              : fillPrices(T.ctaBild, lang)}
        </button>
        )}
        {/* HIER STAND „LIEBER GLEICH EIN VIDEO — {videoauf}" (Owner 06.08.2026: „das muss
            raus. niemand weiss was das ist."). Seit Bild und Video beide {once} kosten, war
            der Zweitknopf ein Rätsel zum selben Preis. Der Weg zum Video bleibt: „Daraus ein
            Video machen" unter der fertigen Karte und auf der Einladungsseite. */}
        {hinweis && (
          /* `lb-karte-fehler` statt Inline-Rot: In der Karte gewinnt die !important-Braunregel
             gegen jeden Inline-`style` — nur eine eigene !important-Klasse kommt dagegen an. */
          <p role="alert" className="lb-karte-fehler mt-1.5 text-center text-[12.5px] font-black leading-snug">
            {hinweis}
          </p>
        )}
        <p className="text-center font-serif text-[11px] leading-snug opacity-70">{F.consent}</p>
        <input ref={ihrRef} type="file" accept="image/*,.heic,.heif" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) { setCropZiel("sie"); setCropDatei(f); } e.target.value = ""; }} />
        <input ref={seinRef} type="file" accept="image/*,.heic,.heif" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) { setCropZiel("er"); setCropDatei(f); } e.target.value = ""; }} />
        <input ref={paarRef} type="file" accept="image/*,.heic,.heif" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) { setCropZiel("paar"); setCropDatei(f); } e.target.value = ""; }} />
      </>), busy, true, true)}

      {cropDatei && cropZiel && (
        /* Das Paarfoto wird im Querformat zugeschnitten — bei 3:4 faellt regelmaessig einer
           der beiden aus dem Bild, und dann fehlt genau das Gesicht, um das es geht. */
        <ImageCropper file={cropDatei} aspect={cropZiel === "paar" ? 4 / 3 : 3 / 4}
          title={cropZiel === "paar" ? T.fPaar : cropZiel === "sie" ? F.upTitle : (botschaftFrei ? T.fotoEingeladen : T.fotoEr)}
          onCancel={() => { setCropDatei(null); setCropZiel(null); }}
          onSave={async (zugeschnitten) => {
            const ziel = cropZiel;
            setCropDatei(null); setCropZiel(null);
            const dataUrl = await dateiZuDataUrl(zugeschnitten);
            if (ziel === "sie") setIhrFoto(dataUrl);
            else if (ziel === "er") setSeinFoto(dataUrl);
            else setPaarFoto(dataUrl);
          }} />
      )}
    </div>
  );
}
