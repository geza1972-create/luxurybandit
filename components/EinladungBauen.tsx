"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, ImageUp, Sparkles, Trash2 } from "lucide-react";
import EinladungKarte, { KARTE_TEXTE } from "@/components/EinladungKarte";
import EinladungAnsicht from "@/components/EinladungAnsicht";
import ImageCropper from "@/components/ImageCropper";
import LightSwitch from "@/components/LightSwitch";
import { kissText } from "@/lib/kiss-i18n";
import { weddingPrompt, KISS_LOOK_ID } from "@/lib/wedding-prompt";
import { fillPrices } from "@/lib/pricing";

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

type Feld = "namen" | "wann" | "wo" | "fotos" | null;

const dateiZuDataUrl = (f: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result ?? ""));
    r.onerror = rej;
    r.readAsDataURL(f);
  });

export default function EinladungBauen({ lang, beispielVideo = "" }: {
  lang: string;
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
}) {
  const T = KARTE_TEXTE[lang] ?? KARTE_TEXTE.en;
  const F = kissText(lang, "wedding");

  const [feld, setFeld] = useState<Feld>(null);
  const [sie, setSie] = useState("");
  const [er, setEr] = useState("");
  const [datum, setDatum] = useState("");
  const [ort, setOrt] = useState("");
  const [adresse, setAdresse] = useState("");
  const [telefon, setTelefon] = useState("");
  const [mail, setMail] = useState("");

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
  const SPEICHER = "lb_einl_bau";
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(SPEICHER) || "{}");
      if (d.sie) setSie(d.sie); if (d.er) setEr(d.er);
      if (d.datum) setDatum(d.datum); if (d.ort) setOrt(d.ort);
      if (d.adresse) setAdresse(d.adresse); if (d.telefon) setTelefon(d.telefon);
      if (d.mail) setMail(d.mail);
    } catch { /**/ }
    try { setMail(m => m || localStorage.getItem("lb_kiss_mail") || ""); } catch { /**/ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(SPEICHER, JSON.stringify({ sie, er, datum, ort, adresse, telefon, mail })); } catch { /**/ }
  }, [sie, er, datum, ort, adresse, telefon, mail]);

  const mailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail.trim());

  /** Rund hundert Tage voraus: So weit im Voraus verschickt man Einladungen, und das
   *  Beispieldatum liegt damit immer in der Zukunft — anders als ein fest getipptes Datum. */
  const beispielDatum = useMemo(
    () => new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    [],
  );

  /** Fertig zum Erzeugen ist, wer den gewaehlten Weg vollstaendig gegangen ist. */
  const fotosDa = weg === "gemeinsam" ? !!paarFoto : !!ihrFoto && !!seinFoto;
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
  const bezahlen = async (): Promise<boolean> => {
    let device = "";
    try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
    let gid = genId;
    if (!gid) {
      try {
        const log = await fetch("/api/kiss-log", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: "wedding", device, email: mail.trim() }),
        }).then(r => r.json());
        if (log?.id) { gid = String(log.id); setGenId(gid); }
      } catch { /* ohne genId faellt die Kasse auf Stripe zurueck — kein Abbruch noetig */ }
    }
    try {
      const start = await fetch("/api/kiss-video-checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genId: gid, once: true, email: mail.trim(), returnTo: window.location.pathname + window.location.search }),
      }).then(r => r.json());
      if (start?.walletPaid) { setBezahlt(true); return true; }
      if (!start?.url || !start?.sessionId) { setStatus(start?.error || F.statusNotWork); return false; }
      const popup = window.open(start.url, "_blank", "popup,width=480,height=780");
      if (!popup) { window.location.href = start.url; return false; }
      for (let i = 0; i < 100; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const s = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(start.sessionId)}`).then(r => r.json()).catch(() => null);
        if (s?.paid) { try { popup.close(); } catch { /**/ } setBezahlt(true); return true; }
        if (popup.closed && i > 2) break;
      }
      return false;
    } catch { setStatus(F.statusNetwork); return false; }
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
    const person = weg === "gemeinsam" ? paarFoto : seinFoto;
    const garment = weg === "gemeinsam" ? paarFoto : ihrFoto;
    if (!person || !garment) return;
    setStatus(F.renderingVideo);
    try {
      const start = await fetch("/api/generate-tryon-video", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lookId: KISS_LOOK_ID, genId, person, garment, prompt: weddingPrompt("") }),
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

  const erzeugen = async () => {
    if (!fotosDa || !mailOk || busy) return;
    setBusy(true); setStatus(F.oneMoment);
    let device = "";
    try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
    try { localStorage.setItem("lb_kiss_mail", mail.trim()); } catch { /**/ }
    try {
      if (!bezahlt) {
        const ok = await bezahlen();
        if (!ok) { setBusy(false); return; }
      }
      setStatus(F.statusQuality);
      const d = await fetch("/api/free-preview", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(weg === "gemeinsam"
          ? { paar: paarFoto, theme: "wedding", device, email: mail.trim() }
          : { person: seinFoto, model: ihrFoto, theme: "wedding", device, email: mail.trim() }),
      }).then(r => r.json());
      if (d?.image) {
        setBild(d.image); setBildPfad(d.imagePath ?? ""); setFeld(null);
        if (genId) void fetch("/api/kiss-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ update: genId, imagePath: d.imagePath }) }).catch(() => {});
        // DAS BEZAHLTE VIDEO LAEUFT VON SELBST WEITER — sie hat fuer das Video bezahlt, nicht
        // fuer das Standbild; das Standbild ist nur die schnelle Vorschau.
        await videoErzeugen();
      }
      else setStatus(d?.error || F.statusNotWork);
    } catch { setStatus(F.statusNetwork); }
    setBusy(false);
  };

  const einladungAnlegen = async () => {
    if (!bild || !sie.trim() || !er.trim() || busy) return;
    setBusy(true);
    let device = "";
    try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
    try {
      const r = await fetch("/api/einladung", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Das Video, wenn es bis hierher fertig wurde — sonst das Standbild, damit die
          // Einladung auf keinen Fall an einem noch laufenden Video haengen bleibt.
          videoUrl: videoUrl || undefined, bildPfad: videoUrl ? undefined : bildPfad,
          genId, sie: sie.trim(), er: er.trim(), datum,
          ort: ort.trim(), adresse: adresse.trim(), telefon: telefon.trim(),
          lang, device, email: mail.trim(),
        }),
      }).then(x => x.json());
      // Direkt auf die eigene Einladung: dort wird bearbeitet und verschickt.
      if (r?.url) window.location.href = r.url;
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
  const dialog = (titel: string, inhalt: React.ReactNode, fertigAus = false, zweitrangig = false) => (
    <div className="fixed inset-0 z-[80] grid place-items-end sm:place-items-center" style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={() => setFeld(null)}>
      <div className="lb-karte w-full max-w-[440px] rounded-t-[22px] p-5 sm:rounded-[22px]" onClick={e => e.stopPropagation()}>
        <p className="lb-karte-gold text-center text-[10px] font-black uppercase tracking-[0.28em]">{titel}</p>
        <div className="mt-3 space-y-2">{inhalt}</div>
        <button type="button" onClick={() => setFeld(null)} disabled={fertigAus}
          className={`${zweitrangig ? "lb-karte-absage" : "lb-karte-cta"} mt-4 flex h-11 w-full items-center justify-center rounded-full text-[13px] font-black transition active:scale-95 disabled:opacity-45`}>
          {T.speichern}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      {langZeile && createPortal(
        <span className="order-[-1] mr-2"><LightSwitch /></span>,
        langZeile,
      )}
      <EinladungKarte
        sprache={lang}
        sie={sie.trim() || BEISPIEL_SIE}
        er={er.trim() || BEISPIEL_ER}
        datum={datum || beispielDatum}
        ort={ort.trim() || BEISPIEL_ORT[lang] || BEISPIEL_ORT.en}
        adresse={adresse.trim() || BEISPIEL_ADRESSE[lang] || BEISPIEL_ADRESSE.en}
        telefon={telefon.trim()}
        demo
        aufNamen={() => setFeld("namen")}
        aufDatum={() => setFeld("wann")}
        aufOrt={() => setFeld("wo")}
        video={
          bild ? (
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
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4">
                <button type="button" onClick={() => setFeld("fotos")}
                  className="lb-karte-cta pointer-events-auto flex h-11 items-center justify-center gap-2 rounded-full px-6 text-[14px] font-black transition active:scale-95">
                  <ImageUp className="h-4 w-4 shrink-0" />
                  {T.ersetzen}
                </button>
              </div>
            </div>
          ) : beispielVideo ? (
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
            <div className="relative">
              <EinladungAnsicht id="" videoUrl={beispielVideo} zaehlen={false} tonText={T.ton} tonAusText={T.tonAus} />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4">
                {/* NICHT „Foto ersetzen" (Owner 02.08.2026 abends): Die Karte zeigt jetzt einen
                    kompletten Beispiel-Datensatz (Name, Datum, Ort, Adresse UND Video) — ein
                    Knopf, der nur vom Bild spricht, sagt nicht mehr, was hier wirklich passiert.
                    `F.datenErsetzen` lädt zum Ausfüllen der GANZEN Karte ein. */}
                <button type="button" onClick={() => setFeld("fotos")}
                  className="lb-karte-cta pointer-events-auto flex h-11 items-center justify-center gap-2 rounded-full px-6 text-[14px] font-black transition active:scale-95">
                  <ImageUp className="h-4 w-4 shrink-0" />
                  {F.datenErsetzen}
                </button>
              </div>
            </div>
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
          Anzeigen-Traffic ist ein verstecktes Abo eine Rückbuchung mit Ansage. */}
      <p className="mt-2 text-center text-[11px] font-bold leading-snug text-white/60">
        {fillPrices(T.preise, lang)}
      </p>

      {/* Verschicken steht erst da, wenn es etwas zu verschicken gibt. */}
      {bild && sie.trim() && er.trim() && (
        <div className="mt-4">
          <button type="button" onClick={() => void einladungAnlegen()} disabled={busy}
            className="lb-gold lb-buy flex h-12 w-full items-center justify-center gap-2 rounded-full font-black transition active:scale-95 disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {T.teilen}
          </button>
          <p className="mt-2 text-center text-[11px] font-bold leading-snug text-white/60">{F.probeHinweis}</p>
        </div>
      )}
      {status && <p className="mt-2 text-center text-[12px] font-bold text-white/75">{status}</p>}

      {feld === "namen" && dialog(T.namen, (<>
        {eingabe(sie, setSie, T.fSie)}
        {eingabe(er, setEr, T.fEr)}
      </>))}

      {feld === "wann" && dialog(T.wann, eingabe(datum, setDatum, T.fDatum, "date"))}

      {feld === "wo" && dialog(T.wo, (<>
        {eingabe(ort, setOrt, T.fOrt)}
        {eingabe(adresse, setAdresse, T.fAdresse)}
        {eingabe(telefon, setTelefon, T.fTelefon, "tel")}
      </>))}

      {/* „Eure Fotos", nicht „1 · Die Braut": Die Schrittnummern gehoerten zum Trichter, den es
          nicht mehr gibt. Eine Nummer ohne Schritte davor und danach verwirrt nur. */}
      {feld === "fotos" && dialog(T.fotos, (<>
        {/* ZWEI WEGE ZUM ZIEL (Owner 31.07.2026: „und es fehlt Upload gemeinsam").
            Fast jedes Paar hat ein Foto zu zweit — vom Urlaub, von einer Feier. Zwei EINZELNE
            Fotos zu verlangen ist eine Huerde ohne Grund: Sie muss zwei Bilder suchen, von
            denen eines meist gar nicht existiert, und genau dort steigen Leute aus.
            Der Umschalter steht ganz oben, weil er entscheidet, was darunter zu tun ist. */}
        <div className="grid grid-cols-2 gap-1 rounded-full p-1" style={{ background: "rgba(160,122,52,0.10)" }}>
          {([["zwei", T.fZwei], ["gemeinsam", T.fGemeinsam]] as const).map(([w, label]) => (
            <button key={w} type="button" onClick={() => setWeg(w)}
              className={`${weg === w ? "lb-karte-cta" : ""} h-9 rounded-full px-2 text-[12px] font-black leading-tight transition active:scale-95`}>
              {label}
            </button>
          ))}
        </div>

        {weg === "zwei" ? (
          <div className="grid grid-cols-2 gap-2">
            {/* „Du, die Braut" und „Er, der Bräutigam" — ein Paar Beschriftungen, nicht eine
                Zeile und ein Abzeichen. `F.you` heisst schlicht „ER"; das war im alten Trichter
                ein Chip auf dem Bild und liest sich neben „Du, die Braut" wie ein Fehler. */}
            {([["sie", ihrFoto, ihrRef, F.upTitle], ["er", seinFoto, seinRef, T.fotoEr]] as const).map(([wer, foto, ref, titel]) => (
              <div key={wer} className="relative">
                <button type="button" onClick={() => ref.current?.click()}
                  className="lb-tippbar grid aspect-[3/4] w-full place-items-center overflow-hidden rounded-xl">
                  {foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={foto} alt="" className="h-full w-full object-cover object-top" />
                  ) : (
                    <span className="px-2 text-center font-serif text-[13px] font-bold">{titel}</span>
                  )}
                </button>
                {foto && (
                  <button type="button" aria-label={T.loeschen}
                    onClick={() => (wer === "sie" ? setIhrFoto("") : setSeinFoto(""))}
                    style={{ background: "#fff", color: "#dc2626", boxShadow: "0 2px 10px rgba(0,0,0,0.35)" }}
                    className="absolute left-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full transition active:scale-90">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
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
        <button type="button"
          onClick={() => {
            if (busy) return;
            if (!fotosDa) { setHinweis(F.pickFirst); return; }
            if (!mailOk) { setHinweis(F.mailInvalid); return; }
            setHinweis("");
            void erzeugen();
          }}
          className={`lb-karte-cta flex h-12 w-full items-center justify-center gap-2 rounded-full text-[14px] font-black transition active:scale-95${(!fotosDa || !mailOk || busy) ? " opacity-45" : ""}`}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {/* KEIN GRATIS-VERSPRECHEN AUF EINEM KNOPF, DER KEINS EINHAELT (plan.md Punkt 1a,
              02.08.2026: hier tatsaechlich behoben, nicht nur im toten `KissFunnel`-Pfad).
              `ctaFree` sagt „gratis" — seit der Kasse oben stimmt das nicht mehr. Waehrend
              Kasse/Bild/Video laufen, steht der laufende Status auf dem Knopf, nicht drei
              Minuten lang derselbe Satz. */}
          {busy ? (status || F.oneMoment) : F.ctaVideo}
        </button>
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
      </>), busy, true)}

      {cropDatei && cropZiel && (
        /* Das Paarfoto wird im Querformat zugeschnitten — bei 3:4 faellt regelmaessig einer
           der beiden aus dem Bild, und dann fehlt genau das Gesicht, um das es geht. */
        <ImageCropper file={cropDatei} aspect={cropZiel === "paar" ? 4 / 3 : 3 / 4}
          title={cropZiel === "paar" ? T.fPaar : cropZiel === "sie" ? F.upTitle : T.fotoEr}
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
