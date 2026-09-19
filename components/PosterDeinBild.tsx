"use client";

import { eur } from "@/lib/pricing";
import { KUNST_CENTS } from "@/lib/lakatosbandi-druck";

import { useContext, useEffect, useRef, useState } from "react";
import KasseImFenster, { kasseImFensterMoeglich } from "@/components/KasseImFenster";
import { createPortal } from "react-dom";
import { Check, Download, ImageUp, Sparkles, X } from "lucide-react";
import { Scheibe } from "@/components/CI";
import { EigenesContext } from "@/components/PosterGross";
import { WandBildContext } from "@/components/PosterWandBild";
import ImageCropper from "@/components/ImageCropper";
import { POSTER, POSTER_VERHAELTNIS } from "@/lib/lakatosbandi-poster";

/**
 * DER KUNDE IM POSTER — SCHRITT 1: SEIN FOTO (Owner 17.09.2026: „zuerst ‚your picture‘ ersetzt
 * nur das bild, dann steht ‚generate art‘" · „und wird beim ersten schritt nix generiert").
 *
 * ── WAS HIER PASSIERT UND WAS NICHT ─────────────────────────────────────────────────────────
 *
 * Er wählt ein Foto, schneidet es zu, und es steht IM Poster — an der Stelle des Werks, im
 * selben Blatt, mit Titel, Satz und Code drum herum. Erzeugt wird dabei nichts: kein Modell
 * läuft, nichts kostet. Das ist die ganze Absicht des ersten Schritts (Owner: „kann sein dass
 * leute sogar nur das printen wollen, was eigenes") — wer nur sein eigenes Bild gedruckt haben
 * will, ist hier schon fertig.
 *
 * Erst danach heisst der Knopf „GENERATE ART" und macht daraus Kunst im Stil des Werks — das
 * kostet 1 € extra und läuft erst nach der Zahlung (Owner 17.09.2026). Deshalb steht in diesem
 * Bauteil KEIN Modellaufruf: die Kasse gehört nicht in den Knopf, der das Foto einsetzt.
 *
 * ── WYSIWYG, KEINE ZWEITE SEITE (Hausregel) ─────────────────────────────────────────────────
 *
 * Auswählen, Zuschneiden und Ansehen passieren auf dem Blatt, auf dem er bestellt. Der
 * Zuschnitt läuft im Seitenverhältnis des BILDFELDS dieses Posters (aus `lakatosbandi-poster.ts`
 * gerechnet, nicht getippt) — was er im Ausschnitt sieht, ist, was gedruckt wird.
 *
 * ── DIE UPLOAD-PFLICHTEN (Skill `upload-foto`) ──────────────────────────────────────────────
 *
 * 1 Speichern-Knopf: nichts rutscht von allein hinein — `ImageCropper` hat Speichern/Abbrechen.
 * 2 Zuschnitt: immer, im festen Verhältnis (siehe oben).
 * 3 Löschen: sichtbar an der Kachel — hier das Kreuz oben rechts auf dem Foto.
 */
/** Was der Zuschnitt und die Druckdatei lesen können — dieselbe Liste wie im Bildlager. */
const ERLAUBT = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Stand je Kachel, solange die Seite lebt — siehe `merker` in der Komponente. */
const MERKER = new Map<string, { original: string | null; foto: string | null; id?: string | null }>();

/**
 * ── DAS BILD EINEN SCHRITT VOR DER KASSE SICHERN (Owner 18.09.2026) ─────────────────────────
 *
 * Der Kaufknopf steht ausserhalb dieses Bauteils, und zwischen Klick und Druckdatei liegt
 * Stripe — der Browser ist dort nicht mehr dabei. Also legt er das Bild vorher ab und schickt
 * nur die Kennung mit (`lib/lakatosbandi-kundenbild.ts`).
 *
 * ERST BEIM KAUF, nicht beim Zuschnitt: Wer sich das Blatt nur ansieht, lädt nichts hoch
 * (Memory `kein-token-fuer-abbrecher`). Hat die Erzeugung schon eine Kennung geliefert, gilt
 * diese — sie trägt den Beweis, dass ein Lauf im Stil des Künstlers stattgefunden hat.
 *
 * `null` heisst: kein eigenes Bild im Blatt (oder die Ablage hat nicht mitgespielt). Dann wird
 * gekauft wie bisher — das Werk des Künstlers, volle Lizenz.
 */
/**
 * ── WAS IM BLATT STEHT, MUSS AUCH DAS PREISSCHILD WISSEN (Owner 18.09.2026) ─────────────────
 *
 * Der Kaufknopf und der Satz darunter stehen ausserhalb dieses Bauteils — ein Context erreicht
 * sie nicht, ohne die halbe Seite umzubauen. Also sagt das Blatt kurz Bescheid, wenn sich sein
 * Inhalt ändert: „keins" (das Werk des Künstlers), „foto" (sein eigenes Bild, 1 € Vermittlung)
 * oder „kunst" (in seinem Stil erzeugt, 10 € Lizenz).
 *
 * NUR FÜRS SCHILD. Was wirklich berechnet wird, entscheidet der Server aus dem Zettel neben dem
 * abgelegten Bild (Skill `bezahlung`, Regel 3).
 */
export type PosterBildArt = "keins" | "foto" | "kunst";
export const POSTER_BILD_EREIGNIS = "lb-posterbild";
/**
 * ── WELCHER RAHMEN GEWÄHLT IST (Owner 19.09.2026: „ich will auch den Rahmen sehen, wenn ich den
 * einblende · im Full und im Download auch") ──────────────────────────────────────────────────
 *
 * Der Rahmen wird im Kaufblock gewählt, gezeichnet wird er am Blatt — auf dem Schirm über
 * `:has()` vom Vorfahren aus. Im VOLLBILD liegt das Blatt in einem Portal an `document.body` und
 * hat diesen Vorfahren nicht mehr; und die DRUCKDATEI entsteht auf dem Server, der von einer
 * angeklickten Auswahl nichts weiss. Beide hören deshalb hier mit.
 *
 * `wahl`: "0" ohne Rahmen · "1" Holz · "2" schwarz — dieselben Werte wie an den Radios.
 */
export const POSTER_RAHMEN_EREIGNIS = "lb-posterrahmen";
export type PosterRahmenNachricht = { mandant: string; werk: string; wahl: string };

export type PosterBildNachricht = { mandant: string; werk: string; art: PosterBildArt };

export async function kundenbildSichern(mandant: string, werk: string): Promise<string | null> {
  const schluessel = `${mandant}/${werk}`;
  const stand = MERKER.get(schluessel);
  if (!stand?.foto) return null;
  if (stand.id) return stand.id;
  try {
    const res = await fetch("/api/poster-bild", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bild: stand.foto, mandant, werk }),
    });
    const d = (await res.json().catch(() => ({}))) as { ok?: boolean; id?: string };
    if (!d.ok || !d.id) return null;
    MERKER.set(schluessel, { ...stand, id: d.id });
    return d.id;
  } catch {
    return null;
  }
}

export type PosterDeinBildTexte = {
  zahlungAus: string; zahlungDa: string; zahlungWartet: string; zahlungWeg: string; werkGesperrt: string; fotoAbgelehnt: string;
  nichtHier: string; fehlgeschlagen: string; nurBilder: string; zuGross: string;
  /** „1 · Wähl ein Foto von dir" — steht über dem Knopf, solange keines im Blatt ist. */
  schritt1: string;
  /** „2 · Jetzt drücken — wir zeichnen es" — sobald ein Foto da ist. */
  schritt2: string;
  /* Das Fenster (Owner 19.09.2026). */
  fensterTitel: string; fotoTauschen: string; speichern: string; gespeichert: string;
  feldMail: string; mailWarum: string;
};

export default function PosterDeinBild({ children, knopf, erzeugen, texteKnopf, warten, texte, sprache, mandant, werk, adminS = "", aus = false }: {
  /** Das Werk des Künstlers — steht hier, solange der Kunde kein Foto gewählt hat. */
  children: React.ReactNode;
  /** „You as a picture" — der Name des Knopfes, in jeder Sprache derselbe. */
  knopf: string;
  /** „Generate art" — Schritt 2, sobald sein Foto liegt. */
  erzeugen: string;
  /** „Texte ändern" — Schritt 3, sobald das bezahlte Blatt da ist (Owner 19.09.2026). */
  texteKnopf: string;
  /**
   * ── DER SCHLÜSSEL DES HAUSHERRN (Owner 19.09.2026: „ich will ein Konto haben als Admin, wo
   * ich nichts zahlen muss") ─────────────────────────────────────────────────────────────────
   * Steht er in der Adresse (`?s=`), läuft die Erzeugung ohne Kasse. Entschieden wird das auf
   * dem SERVER (`api/poster-kunst`); hier reist er nur mit — ein Merker im Browser wäre die
   * Einladung, sich kostenlose Läufe selbst zuzuschreiben.
   */
  adminS?: string;
  /** Was während des Laufs dasteht — ein Wort, kein blosser Kreisel (CI-Regel). */
  warten: string;
  /**
   * ── DIE ABSAGEN SPRECHEN DIE SPRACHE DER SEITE (Owner 19.09.2026) ─────────────────────────
   *
   * Sie standen fest englisch in diesem Bauteil, mit der Begründung „auf dem Blatt ist alles
   * Englisch". Das galt, solange auch der KNOPF englisch war. Seit er Rumänisch spricht, ist ein
   * Knopf, der auf Rumänisch fragt und auf Englisch absagt, einfach kaputt — und eine Absage ist
   * der Moment, in dem jemand am ehesten aussteigt.
   */
  texte: PosterDeinBildTexte;
  sprache?: string;
  /**
   * Das Werk ist als Vorlage abgeschaltet (`werkInfo[n].kunst === false`) — dann steht hier nur
   * das Werk, ohne Knopf und ohne Feld. Owner 17.09.2026, am „Schrei": „glaubst du der prompt
   * würde hier gehen?" — nein; ein Knopf, der Unsinn erzeugt, ist schlimmer als keiner.
   */
  aus?: boolean;
  /** Wer und welches Werk — daraus holt der Server die Stilvorlage. */
  mandant: string;
  werk: string;
}) {
  /**
   * ZWEI ZUSTÄNDE, NICHT EINER (17.09.2026 gemessen: `400 in 88ms`).
   *
   * `original` ist, was er hochgeladen hat; `foto` ist, was im Blatt steht — nach einer
   * Erzeugung also das Gemälde. Vorher war beides dasselbe Feld, und der zweite Versuch schickte
   * das ERZEUGTE Bild als Vorlage: einmal von der Route abgewiesen, und selbst wenn nicht, wäre
   * es eine Erzeugung aus einer Erzeugung — mit jedem Versuch weiter weg vom Menschen.
   * Jeder Versuch geht deshalb vom Originalfoto aus.
   */
  /**
   * ÜBERLEBT EINEN NEUAUFBAU, NICHT EIN NEULADEN (17.09.2026 gemessen: nach einem erfolgreichen
   * Lauf frischte der Dev-Server die Seite per RSC auf, die Kachel wurde neu aufgebaut, und das
   * fertige Bild war weg — 45 Sekunden und ein bezahlter Lauf für nichts).
   *
   * Der Merker liegt auf Modulebene, je Kachel (Künstler + Werk): Baut React die Kachel neu auf,
   * liest sie ihren Stand von dort. Lädt der Kunde die Seite neu oder geht weg, ist das Modul weg
   * — und damit das Bild. Genau die Regel des Owners („wenn er rausgeht von der seite, dann ist
   * das bild weg"), nur ohne die Lücke dazwischen. Kein Speicher, kein Konto, nichts auf dem
   * Server.
   */
  const merker = MERKER.get(`${mandant}/${werk}`);
  const [original, setOriginal] = useState<string | null>(merker?.original ?? null);
  /**
   * ── DAS UNBESCHNITTENE FOTO GEHT AN DAS MODELL (18.09.2026) ─────────────────────────────────
   *
   * `original` ist der ZUSCHNITT im Seitenverhältnis des Bildfelds — ein enger Ausschnitt, damit
   * das Blatt stimmt. Genau der ging bisher auch an die Erzeugung, und das ist ein Fehler: Ein
   * Generator liest die Person nicht nur an Augen, Nase und Mund, sondern an Kopfkontur,
   * Haaransatz, Kiefer, Ohren und den Proportionen von Kopf zu Hals und Schultern. Schneidet man
   * das weg, nimmt man ihm die Hälfte dessen, woran er die Person erkennt.
   *
   * Der Zuschnitt bleibt, wofür er gedacht ist: die ANZEIGE auf dem Blatt. Die Erzeugung bekommt
   * das ganze Foto, im eigenen Seitenverhältnis.
   */
  const [roh, setRoh] = useState<string | null>(null);
  const [foto, setFoto] = useState<string | null>(merker?.foto ?? null);
  /* Die Kennung des abgelegten Bildes: von der Erzeugung (mit Stilnachweis) oder vom Sichern
     kurz vor der Kasse. Ein NEUES Bild löscht sie — sonst kaufte er das vorige. */
  const [bildId, setBildId] = useState<string | null>(merker?.id ?? null);
  /* Titel und Stilzeile richten sich danach, ob SEIN Bild drin ist (siehe `EigenesContext`). */
  const { setEigenes, setGezeichnet, zeilen, setZeile } = useContext(EigenesContext);
  /* ── AUCH NACH STRIPES WEITERLEITUNG IST ES SEIN BLATT (Owner 19.09.2026) ─────────────────
     `original` ist das hochgeladene Foto — das hat der Browser nach der Rückkehr nicht mehr.
     Die Kennung des bezahlten Laufs hat er; sie sagt dasselbe und übersteht den Seitenwechsel.
     Hängt „es ist seins" allein am Foto, bleiben danach die Zeilen unbeschreibbar und unter dem
     Blatt fehlt „după stilul lui …" — auf genau dem Blatt, für das er gezahlt hat. */
  useEffect(() => { setEigenes(!!original || !!bildId); }, [original, bildId, setEigenes]);
  /* Sobald eine Zeichnung im Blatt steht, werden die unveränderten Zeilen markiert
     (Owner 19.09.2026). `bildId` bekommt erst die Erzeugung — ein blosser Upload nicht. */
  useEffect(() => { setGezeichnet(!!bildId); }, [bildId, setGezeichnet]);
  /* Dasselbe Bild hängt im Slider an der Wand (Owner 18.09.2026: „auch das Bild muss dann an die
     Wand gesehen werden") — das hochgeladene wie das erzeugte. */
  const { setBild, setZeilen: setWandZeilen } = useContext(WandBildContext);
  useEffect(() => { setBild(foto); }, [foto, setBild]);
  /* Und was er geschrieben hat — sonst hängt an der Wand „Numele tău", während auf dem Blatt
     daneben sein Name steht (Owner 19.09.2026: „der Name ist nicht an der Wand"). */
  useEffect(() => { setWandZeilen({ titel: zeilen.titel, satz: zeilen.satz }); },
    [zeilen.titel, zeilen.satz, setWandZeilen]);
  /* Und dem Preisschild sagen, was jetzt im Blatt steht (siehe `POSTER_BILD_EREIGNIS`). */
  useEffect(() => {
    /**
     * ── DIE KENNUNG ENTSCHEIDET, NICHT DER VERGLEICH (Owner 19.09.2026: „10 Euro noch mal, um
     * das Poster herunterzuladen?") ──────────────────────────────────────────────────────────
     *
     * HIER STAND `original && foto !== original` — „es liegt ein Foto UND das Blatt zeigt etwas
     * anderes, also wurde erzeugt". Das stimmt nur, solange der Browser BEIDE Bilder hat.
     *
     * Nach Stripes Weiterleitung hat er sie nicht: Das Ergebnis holt der Server nach (`?kunst=`),
     * `original` ist leer. Der Vergleich sagte dann „foto" statt „kunst" — und der Kaufknopf
     * verlangte für die Datei noch einmal 10 €, obwohl die Erzeugung längst bezahlt war.
     *
     * `bildId` gibt es nur aus einem bezahlten Lauf (`api/poster-kunst` vergibt sie), und sie
     * überlebt die Weiterleitung. Der Vergleich bleibt als zweiter Weg für den Fall, dass die
     * Ablage scheiterte und keine Kennung kam.
     */
    const erzeugt = !!bildId || !!(original && foto !== original);
    const art: PosterBildArt = !foto ? "keins" : (erzeugt ? "kunst" : "foto");
    window.dispatchEvent(new CustomEvent<PosterBildNachricht>(POSTER_BILD_EREIGNIS, {
      detail: { mandant, werk, art },
    }));
  }, [mandant, werk, foto, original, bildId]);
  useEffect(() => {
    if (original || foto) MERKER.set(`${mandant}/${werk}`, { original, foto, id: bildId });
    else MERKER.delete(`${mandant}/${werk}`);
  }, [mandant, werk, original, foto, bildId]);
  const [zuschneiden, setZuschneiden] = useState<File | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [absage, setAbsage] = useState("");
  /**
   * ── EINE ABSAGE DES ANBIETERS IST ENDGÜLTIG (Owner 18.09.2026, Munchs „Madonna") ───────────
   *
   * Abgewiesen wird das WERK als Vorlage, nicht sein Foto — beim zweiten Druck käme dieselbe
   * Antwort. Der Server merkt es sich am Werk (`kunst: false`), aber erst die nächste Seite
   * liest das; für den, der gerade davorsteht, hält dieser Merker den Knopf an. Ein Knopf, der
   * garantiert dasselbe Nein bringt, ist eine Einladung zum Warten auf nichts.
   */
  const [gesperrt, setGesperrt] = useState(false);
  /* `createPortal` braucht `document` — beim Rendern auf dem Server gibt es das nicht. */
  const [montiert, setMontiert] = useState(false);
  useEffect(() => setMontiert(true), []);

  /**
   * ── NACH DER RÜCKKEHR VON STRIPE (Owner 19.09.2026: „ist nichts passiert … keine Meldung,
   * kein Ladebalken") ──────────────────────────────────────────────────────────────────────
   *
   * Stripe schickt den Browser auf `?kunst=<kennung>`. Die Kennung zeigt auf das Foto, das VOR
   * der Kasse abgelegt wurde — von hier aus läuft der Auftrag weiter, ohne dass er noch einmal
   * etwas tut: warten, bis die Buchung da ist, dann erzeugen.
   *
   * NUR EINMAL, und nur an dem Werk, zu dem die Kennung gehört: Auf einer Seite hängen zehn
   * Blätter, und jedes würde sonst denselben Auftrag starten.
   */
  const aufgenommen = useRef(false);
  useEffect(() => {
    if (aus || aufgenommen.current) return;
    const p = new URLSearchParams(window.location.search);
    const id = String(p.get("kunst") ?? "");
    if (!/^[0-9a-f]{24}$/.test(id)) return;
    const marke = window.location.hash.replace("#w-", "");
    if (marke && marke !== werk) return;
    aufgenommen.current = true;
    setServerId(id);
    /**
     * ── DIE ADRESSE WIRD GELEERT, SOBALD DER AUFTRAG ANGENOMMEN IST (Owner 19.09.2026: „wenn
     * ich was mache und komme zurück zum Poster, passiert das") ───────────────────────────────
     *
     * `?kunst=<id>` ist ein EINMALIGER Auftrag von Stripe. Blieb er in der Adresse stehen, fing
     * bei jeder Rückkehr auf die Seite — Zurück-Taste, neu laden, aus einem anderen Reiter — die
     * Warteschleife wieder an: dreissig Sekunden Kreisel für eine Zahlung, die längst erledigt
     * oder nie gekommen ist.
     *
     * `replaceState` löscht nur den Anhänger, lässt aber Seite und Verlauf stehen — kein
     * Sprung, kein neuer Eintrag im Verlauf, nichts blinkt.
     */
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete("kunst");
      window.history.replaceState(null, "", u.pathname + u.search + u.hash);
    } catch { /* ohne History-API bleibt es beim alten Verhalten */ }
    setLaeuft(true);
    void (async () => {
      /**
       * ── ZUERST NACHSEHEN, OB ES DAS BLATT SCHON GIBT (Owner 19.09.2026: „ich will jetzt nicht
       * immer neu generieren, um zu testen") ──────────────────────────────────────────────────
       *
       * Dieselbe Adresse wird mehr als einmal geöffnet: aus dem Verlauf, aus einem Lesezeichen,
       * aus unserer eigenen Mail. Ohne diese Frage startete jedes Mal ein neuer bezahlter Lauf,
       * und er zahlte ein zweites Mal für ein Blatt, das längst auf dem Server liegt.
       *
       * Ist es fertig, wird es gezeigt — mit seinen Zeilen, wie er sie geschrieben hat. Kein
       * Modell, kein Guthaben, kein Warten.
       */
      try {
        const r = await fetch(`/api/kunst-blatt?bild=${encodeURIComponent(id)}`);
        const d = (await r.json().catch(() => ({}))) as
          { ok?: boolean; bild?: string; titel?: string; satz?: string; mandant?: string; werk?: string };
        /* Der Zettel sagt, zu welchem Blatt er gehört. Ohne diese Frage übernähme jedes Blatt der
           Seite dasselbe Bild, sobald die Marke in der Adresse fehlt (#w-…). */
        if (d.werk && (d.werk !== werk || (d.mandant && d.mandant !== mandant))) { setLaeuft(false); return; }
        if (r.ok && d.ok && d.bild) {
          setFoto(d.bild); setBildId(id); setLaeuft(false);
          if (d.titel) setZeile("titel", d.titel);
          if (d.satz) setZeile("satz", d.satz);
          return;
        }
      } catch { /* dann eben der normale Weg */ }

      /* Bis hierher ist NICHTS gezeichnet worden — es wird auf die Buchung der Zahlung
         gewartet. Das Wort unter dem Kreisel muss das sagen (CI-Regel: nie ein Kreisel ohne
         Wort, und nie ein Wort, das etwas anderes behauptet). */
      setWartet(texte.zahlungWartet);
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 2000));
        try {
          const r = await fetch(`/api/kunst-guthaben?geraet=${encodeURIComponent(geraetKennung())}`);
          const d = (await r.json().catch(() => ({}))) as { offen?: number };
          if ((d.offen ?? 0) > 0) { setWartet(""); setLaeuft(false); void kunstHolen(id); return; }
        } catch { /* weiterfragen */ }
      }
      /* Dreissig Sekunden ohne Buchung heisst: Es ist keine Zahlung angekommen. „Zahlung ist da"
         stand hier und war schlicht falsch — er hätte gedrückt und wäre wieder in der Kasse
         gelandet, ohne zu verstehen, warum ([[immer-close-einbauen]]: ein Ausweg, der stimmt). */
      setWartet("");
      setLaeuft(false);
      setAbsage(texte.zahlungWeg);
    })();
    /* Einmal beim Laden — die Abhängigkeiten würden den Lauf nur wiederholen. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /**
   * ── DIE KASSE FÜR DEN EINEN EURO (Owner 18.09.2026) ─────────────────────────────────────────
   *
   * IN der Seite, nicht als Fenster: Sein Foto lebt nur im Browser („wenn er rausgeht von der
   * seite, dann ist das bild weg"). Ein Seitenwechsel zu Stripe und zurück würde es löschen —
   * er käme bezahlt zurück und müsste neu hochladen. Hausregeln [[kasse-in-der-seite]] und
   * [[keine-overlay-dialoge]] sagen dasselbe, hier gibt es zusätzlich einen technischen Zwang.
   */
  const [kasse, setKasse] = useState<string | null>(null);
  /**
   * ── DAS FENSTER (Owner 19.09.2026: „es müsste ein Fenster sich öffnen für Bild, Texte") ────
   *
   * Alles, was auf dem Blatt stehen soll, wird hier eingetragen — VOR dem Preis. Damit kann er
   * nicht mehr bezahlen, während oben noch „Numele tău" steht („das Problem ist hier. Es wird
   * nur Bild gekauft und Text ist nicht geändert, aber alles schon bezahlt und versendet").
   */
  const [fenster, setFenster] = useState(false);
  /* Was unter dem Kreisel steht, wenn nicht gezeichnet, sondern gewartet wird. */
  const [wartet, setWartet] = useState("");
  const [mail, setMail] = useState("");
  /**
   * ── DIE KENNUNG DES ABGELEGTEN FOTOS ────────────────────────────────────────────────────────
   *
   * Sie entsteht VOR der Kasse (`api/kunst-foto`) und überlebt Stripes Weiterleitung. Ohne sie
   * ist ein bezahlter Lauf verloren, sobald die Seite wechselt — genau das ist am 19.09.2026
   * mit echtem Geld passiert ([[paid-jobs-must-survive-the-browser]]).
   */
  const [serverId, setServerId] = useState<string | null>(null);
  /**
   * ── VORHER / NACHHER (Owner 17.09.2026: „einen schieberegler der das original langsam über
   * deine zeichnung legt — dann sehen wir, wie falsch das ganze ist" · nach dem Ausbau: „ich
   * brauche den schieberegler für vorher und nachher wieder") ────────────────────────────────
   *
   * Ob Gesicht, Brille, Haltung wirklich stimmen, sieht man erst, wenn das Foto darüberliegt und
   * man es einblendet: Wo sich die Linien decken, ist die Zeichnung richtig; wo sie springen,
   * hat das Modell erfunden. 0 = nur Zeichnung, 1 = nur Foto. Steht anfangs auf der Zeichnung.
   * Erste Fassung war „zu klein für einen finger" — jetzt 4,5 cqw Trefffläche.
   */
  const [mischung, setMischung] = useState(0);
  /* Der Platz unter dem Bild (`lb-poster-unter-bild` in Poster.tsx) — nach dem Aufbau über das
     eigene Blatt gesucht, damit sich zwei Poster nicht in die Quere kommen. */
  const marke = useRef<HTMLSpanElement>(null);
  const [platz, setPlatz] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPlatz(marke.current?.closest(".lb-poster-karte")?.querySelector<HTMLElement>(".lb-poster-unter-bild") ?? null);
  }, []);
  const feld = useRef<HTMLInputElement>(null);

  /* „GENERATE ART" — sein Foto im Stil dieses Werks. Noch ohne Kasse (Owner 17.09.2026: „mach
     mal erst mal gratis"); der Aufpreis kommt davor, bevor das live geht. */
  /**
   * DIESELBE KENNUNG WIE IM REST DES HAUSES (`lb_visitor`) — sie hängt an Guthaben und Zahlung.
   * Gibt es sie noch nicht, wird sie hier angelegt; sonst hätte ein frischer Browser kein
   * Guthaben, das man ihm gutschreiben könnte.
   */
  function geraetKennung(): string {
    try {
      let g = localStorage.getItem("lb_visitor") ?? "";
      if (!g) { g = crypto.randomUUID().replace(/-/g, ""); localStorage.setItem("lb_visitor", g); }
      return g;
    } catch { return ""; }
  }

  /** Die Kasse holen und in der Seite zeigen. */
  /**
   * ── DIE KENNUNG WIRD DURCHGEREICHT, NICHT AUS DEM ZUSTAND GELESEN (19.09.2026 im Serverlog
   * gefunden) ─────────────────────────────────────────────────────────────────────────────────
   *
   * `fotoSichern()` ruft `setServerId(...)` — ein Zustandswechsel wirkt aber erst beim nächsten
   * Rendern. Wer unmittelbar danach `serverId` liest, bekommt noch den alten Wert: `null`.
   *
   * Die Folge stand im Protokoll:
   *
   *   GET /portal/caricaturist-ai?ansicht=poster&lang=ro&kunst=1
   *
   * `kunst=1` statt der Kennung — also genau der Faden fehlte, an dem die Seite ihren bezahlten
   * Auftrag wiederfinden sollte. Er zahlte, kam zurück, und nichts passierte.
   *
   * Deshalb wandert die Kennung als Argument mit, nicht durch den Zustand.
   */
  async function kasseOeffnen(id?: string) {
    try {
      const res = await fetch("/api/kunst-kasse", {
        method: "POST", headers: { "Content-Type": "application/json" },
        /* Die Kennung reist durch Stripe und steht danach in der Adresse (`?kunst=…`) — daran
           findet die Seite ihren Auftrag wieder. */
        /* Die Adresse aus dem Fenster geht mit: Stripe soll sie nicht ein zweites Mal abfragen. */
        body: JSON.stringify({ mandant, werk, geraet: geraetKennung(), sprache, bild: id ?? serverId ?? "", mail }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; clientSecret?: string };
      /**
       * ── NUR EIN FENSTER ZUR ZEIT (Owner 19.09.2026: „Stripe öffnet sich hinter diesem Modal-
       * Fenster … es wird so nicht klappen, zwei Modal-Fenster") ────────────────────────────
       *
       * Das Fenster mit Bild und Texten lag auf `z-72`, die Kasse auf `z-70` — sie ging also
       * hinter ihm auf. Von vorn sah es aus, als hänge alles; in Wahrheit wartete darunter eine
       * bezahlbare Kasse, die niemand sah.
       *
       * Zwei Lagen übereinander sind ohnehin falsch: Wer zahlt, soll die Kasse sehen und sonst
       * nichts. Das Fenster geht zu und kommt zurück, wenn er die Kasse ohne Zahlung schliesst —
       * mit seinen Texten, so wie er sie stehen hatte.
       */
      if (d.ok && d.clientSecret && kasseImFensterMoeglich()) { setFenster(false); setKasse(d.clientSecret); }
      else setAbsage(texte.zahlungAus);
    } catch { setAbsage(texte.zahlungAus); }
  }

  /**
   * ── NACH DER ZAHLUNG LÄUFT ES VON SELBST WEITER ([[aufladen-setzt-den-kauf-fort]]) ──────────
   *
   * Stripe meldet die Zahlung an UNSEREN Server (Webhook), nicht an diesen Browser — und das
   * dauert ein paar Sekunden. Deshalb wird gefragt, bis das Guthaben da ist, und dann sofort
   * erzeugt. Ohne das stünde der Käufer vor einem Knopf und wüsste nicht, wann er drücken darf.
   *
   * Nach 30 Sekunden ist Schluss mit Fragen: Ein Drehrad ohne Ende gibt es hier nicht
   * ([[immer-close-einbauen]]). Sein Guthaben bleibt liegen — ein Druck auf den Knopf holt es.
   */
  async function aufGuthabenWarten() {
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const r = await fetch(`/api/kunst-guthaben?geraet=${encodeURIComponent(geraetKennung())}`);
        const d = (await r.json().catch(() => ({}))) as { offen?: number };
        if ((d.offen ?? 0) > 0) { void kunstHolen(); return; }
      } catch { /* weiterfragen */ }
    }
    setLaeuft(false);
    setAbsage(texte.zahlungDa);
  }

  /* Ein Ausgang, drei Auslöser (Kreuz, Tipp daneben, Stripes eigenes Signal) — einmal
     geschrieben, damit alle drei dasselbe tun. */
  const kasseZu = () => {
    setKasse(null);
    /* Hat er abgebrochen, steht sein Fenster wieder da — Foto und Zeilen unverändert. Kam die
       Zahlung durch, schliesst `kunstHolen` es gleich wieder und zeigt das Blatt. */
    if (!bildId) setFenster(true);
    setLaeuft(true);
    void aufGuthabenWarten();
  };

  /**
   * ── DAS FOTO GEHT ZUERST AUF DEN SERVER (Owner 19.09.2026) ─────────────────────────────────
   *
   * Erst danach darf eine Kasse aufgehen. Stripe schickt den Browser weg, und was nur im Browser
   * lag, ist dann verloren — sein Foto, seine Zeilen, der ganze Auftrag. Die Kennung von hier
   * überlebt den Wechsel ([[paid-jobs-must-survive-the-browser]]).
   *
   * Einmal je Foto: Liegt schon eine Kennung vor, wird sie wiederverwendet.
   */
  async function fotoSichern(): Promise<string | null> {
    if (serverId) return serverId;
    const quelle = roh ?? original;
    if (!quelle) return null;
    try {
      const res = await fetch("/api/kunst-foto", {
        method: "POST", headers: { "Content-Type": "application/json" },
        /* Die Adresse reist mit — nach Stripes Weiterleitung gibt es sie im Browser nicht mehr. */
        body: JSON.stringify({ foto: quelle, mandant, werk, titel: zeilen.titel, satz: zeilen.satz, mail }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; id?: string; grund?: string };
      if (d.ok && d.id) { setServerId(d.id); return d.id; }
      if (d.grund === "abgelehnt") setAbsage(texte.fotoAbgelehnt);
      return null;
    } catch { return null; }
  }

  async function kunstHolen(mitId?: string) {
    if (!original && !mitId && !serverId) return;
    if (laeuft) return;
    setLaeuft(true);
    setAbsage("");
    try {
      /* Ohne abgelegtes Foto keine Kasse: Sonst zahlt er und der Auftrag ist weg. */
      const id = mitId ?? await fotoSichern();
      if (!id) { setLaeuft(false); if (!absage) setAbsage(texte.fehlgeschlagen); return; }
      const res = await fetch("/api/poster-kunst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        /* ── SEINE ZEILEN REISEN MIT (Owner 19.09.2026: „dann wird es gespeichert") ─────────
           Sie landen im Zettel neben dem Bild und damit später in der Druckdatei. Ohne sie baut
           der Server das Blatt mit den Worten des Künstlers — er hat aber seine getippt. */
        body: JSON.stringify({ bild: id, mandant, werk, geraet: geraetKennung(),
          titel: zeilen.titel, satz: zeilen.satz, mail, ...(adminS ? { s: adminS } : {}) }),
      });
      const daten = await res.json().catch(() => null) as { bild?: string; fehler?: string; id?: string; gesperrt?: boolean } | null;
      if (res.ok && daten?.bild) { setFoto(daten.bild); setBildId(daten.id ?? null); setFenster(false); }
      /* Auf dem Blatt ist alles Englisch (You as a picture · Generate art · Before/After) — die
         Meldungen auch, sonst spricht der Knopf eine andere Sprache als seine Antwort. */
      /* 402: nicht bezahlt. Keine Absage anzeigen — die Kasse aufmachen. */
      else if (res.status === 402) { await kasseOeffnen(id); }
      else if (daten?.fehler === "abgelehnt") {
        /* Beim ersten Nein kann es auch an seinem Foto liegen — dann ist „nimm ein anderes" der
           richtige Rat. Erst wenn der Server gesperrt hat, steht fest: es liegt am Werk. */
        if (daten.gesperrt) { setAbsage(texte.werkGesperrt); setGesperrt(true); }
        else setAbsage(texte.fotoAbgelehnt);
      }
      /**
       * ── 503 HEISST „HIER NICHT", NICHT „NOCHMAL VERSUCHEN" (Owner 19.09.2026: „Generierung
       * geht nicht") ─────────────────────────────────────────────────────────────────────────
       *
       * Der Server schickt `aus`, wenn der Hausschalter steht oder dieser Künstler sein Werk
       * nicht als Vorlage freigegeben hat. „Didn't work — try again." schickt den Kunden dann in
       * eine Schleife, die nie ausgeht — er drückt, es dreht, es kommt dieselbe Absage.
       */
      else if (res.status === 503 || daten?.fehler === "aus") setAbsage(texte.nichtHier);
      else setAbsage(texte.fehlgeschlagen);
    } catch {
      setAbsage(texte.fehlgeschlagen);
    } finally {
      setLaeuft(false);
    }
  }

  /**
   * ── NUR SCHREIBEN, NICHT ZEICHNEN (Owner 19.09.2026: „jetzt müsste ich doch noch mal Titel
   * und Text ändern können nach der Generierung") ─────────────────────────────────────────────
   *
   * Das Blatt ist bezahlt und liegt auf dem Server. Was hier passiert, ist eine Textänderung am
   * Zettel — kein Modellaufruf, kein Geld. `api/kunst-text` schreibt nur an Zettel mit
   * `stil: true`, also an ein Blatt, das wirklich bezahlt wurde.
   *
   * WARUM DAS AUF DEN SERVER MUSS und nicht im Browser reicht: Die Druckdatei entsteht dort.
   * Bliebe der Name nur hier, stünde auf dem Schirm sein Name und in der gedruckten Datei der
   * des Künstlers — genau der Fehler, den er beschrieben hat.
   */
  async function zeilenSichern() {
    if (!bildId || laeuft) return;
    setAbsage(""); setLaeuft(true);
    try {
      const res = await fetch("/api/kunst-text", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bild: bildId, titel: zeilen.titel, satz: zeilen.satz }),
      });
      if (res.ok) setFenster(false);
      else setAbsage(texte.fehlgeschlagen);
    } catch {
      setAbsage(texte.fehlgeschlagen);
    } finally {
      setLaeuft(false);
    }
  }

  /**
   * ── WAS AUF DEM BLATT STEHT, WIRD VON SELBST GESICHERT (Owner 19.09.2026: „ich will die Texte
   * hier ändern, WYSIWYG") ────────────────────────────────────────────────────────────────────
   *
   * Auf Papier gibt es keinen Speichern-Knopf. Er schreibt in die Zeile, und eine Sekunde nach
   * dem letzten Buchstaben steht es auf dem Zettel — damit die Druckdatei seine Worte trägt und
   * nicht die des Künstlers.
   *
   * ERST NACH DEM LAUF: Ohne `bildId` gibt es keinen Zettel, an den zu schreiben wäre. Vorher
   * reisen die Zeilen mit der Erzeugung mit (`kunstHolen`), also geht nichts verloren.
   *
   * DIE WARTEZEIT IST PFLICHT, nicht Geschmack: Ohne sie ginge bei jedem Tastendruck ein
   * Schreibvorgang an den Speicher, und zwei davon kurz nacheinander fressen einander
   * ([[delete-resurrection-merge-bug]]).
   */
  useEffect(() => {
    if (!bildId) return;
    const t = window.setTimeout(() => {
      void fetch("/api/kunst-text", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bild: bildId, titel: zeilen.titel, satz: zeilen.satz }),
      }).catch(() => null);
    }, 1000);
    return () => window.clearTimeout(t);
  }, [bildId, zeilen.titel, zeilen.satz]);

  /* Das Seitenverhältnis des Bildfelds: Blattbreite ohne Rand zu Feldhöhe. Dieselben Zahlen,
     aus denen das Blatt und die Druckdatei entstehen — ändert sich das Raster, ändert sich der
     Ausschnitt mit. */
  const verhaeltnis = (100 - 2 * POSTER.rand) / (POSTER.bild.hoch * POSTER_VERHAELTNIS);

  /* Abgeschaltet: das Werk steht da wie ohne dieses Bauteil — kein Knopf, kein Feld, kein
     Zustand. Nach allen Haken, damit die Reihenfolge der Hooks gleich bleibt. */
  if (aus) return <>{children}</>;

  return (
    <>
      {foto ? (
        <span className="relative grid h-full w-full place-items-center">
          {/**
           * ── NICHTS ABSCHNEIDEN (Owner 19.09.2026: „ich kann das nicht beurteilen, das Foto ist
           * abgeschnitten" · „der macht irgendein Scheiss Format von dir") ───────────────────────
           *
           * HIER STAND `object-cover`, und das war an zwei Stellen falsch:
           *
           *  1. DER DRUCK MACHT ES SEIT JE ANDERS. `lib/lakatosbandi-druckdatei.ts` rechnet
           *     `Math.min(feldBreite/breit, feldHoehe/hoch)` — das ganze Bild passt hinein, nichts
           *     fällt weg. Der Schirm schnitt oben und unten ab. Wer auf dem Blatt einen Kopf
           *     abgeschnitten sieht, kann nicht beurteilen, was er kauft — und bekäme gedruckt
           *     etwas anderes, als er vorher gesehen hat.
           *  2. DAS WERK DES KÜNSTLERS STEHT DANEBEN und wird längst `object-contain` gezeichnet
           *     (app/portal/[kuenstler]/page.tsx). Zwei Bilder im selben Feld nach zwei Regeln —
           *     das Werk vollständig, das Foto des Kunden beschnitten.
           *
           * DAS FORMAT KANN NICHT PASSEN, und deshalb darf nicht geschnitten werden: Das Feld hat
           * das Verhältnis 0,81 (Blattbreite ohne Rand zu Feldhöhe), OpenAI liefert nur 1024×1024,
           * 1024×1536 oder 1536×1024 — also 1,0 · 0,67 · 1,5. Keine dieser Zahlen ist 0,81. Mit
           * `cover` verschwinden 14 % der Höhe, und zwar von OBEN, also der Kopf.
           *
           * SO SITZT ES WIE DAS WERK: mittig im Feld, mit Papier darüber und darunter — genau das
           * Blatt, das aus der Druckdatei kommt.
           */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={foto} alt="" className="block max-h-full max-w-full object-contain" />
          {original && foto !== original ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={original} alt="" aria-hidden
              className="pointer-events-none absolute inset-0 m-auto block max-h-full max-w-full object-contain"
              style={{ opacity: mischung }} />
          ) : null}

          {/* Pflicht 3 des Upload-Skills: der Löschknopf steht sichtbar an der Kachel, nicht in
              einem Menü. Weg damit heisst: das Werk des Künstlers steht wieder da.
              Die `Scheibe` aus der Bibliothek ist genau dieser Knopf: weiss, auf einem Bild
              liegend (Skill `ci-design`) — mit `groesse` in `cqw`, damit sie mit dem Blatt
              wächst statt in Pixeln danebenzustehen. */}
          {/* ── SPEICHERN (Owner 17.09.2026: „das nimmst du als masterbild" — das Bild lebt nur im
              Browser; ohne diesen Knopf kommt es nirgends hin) ─────────────────────────────────
              Unten rechts, links neben dem Vergrössern-Knopf: lädt das erzeugte Bild in voller
              Auflösung herunter. Nur wenn ein ERZEUGTES Bild da ist — das eigene Foto hat er ja. */}
          {foto !== original ? (
            <span className="absolute" style={{ right: "9.5cqw", bottom: "2cqw" }}>
              <Scheibe label="Save" groesse="6cqw"
                onClick={e => {
                  e?.preventDefault(); e?.stopPropagation();
                  const a = document.createElement("a");
                  a.href = foto; a.download = `${mandant}-${werk}-art.jpg`;
                  document.body.appendChild(a); a.click(); a.remove();
                }}>
                <Download style={{ width: "50%", height: "50%" }} aria-hidden />
              </Scheibe>
            </span>
          ) : null}

          <span className="absolute right-[2cqw] top-[2cqw]">
            <Scheibe label="×" groesse="6cqw"
              onClick={e => { e?.preventDefault(); e?.stopPropagation(); setFoto(null); setOriginal(null); setRoh(null); setBildId(null); }}>
              <X style={{ width: "55%", height: "55%" }} aria-hidden />
            </Scheibe>
          </span>
        </span>
      ) : children}

      {/* ── SICHTBAR ARBEITEN (Owner 17.09.2026: „man sieht es nicht dass es arbeitet") ────────
          Der Lauf dauert 10–40 Sekunden. Ohne Zeichen hält das niemand aus: Er klickt noch
          einmal (und zahlt doppelt) oder lädt neu — und beim Neuladen ist alles weg, weil das
          Bild nur im Browser lebt. Genau das ist am 17.09.2026 passiert.
          Deshalb liegt während des Laufs eine Decke über dem Werk, mit WORT, nicht nur einem
          Kreisel (CI-Regel). */}
      {laeuft ? (
        <span className="absolute inset-0 z-[2] flex flex-col items-center justify-center"
          style={{ background: "rgba(20,16,10,.55)", backdropFilter: "blur(2px)" }}>
          <span className="block animate-spin rounded-full border-solid border-white/30 border-t-white"
            style={{ width: "9cqw", height: "9cqw", borderWidth: "1cqw" }} aria-hidden />
          <span className="mt-[3cqw] font-sans text-white"
            style={{ fontSize: `${POSTER.text.breit * 1.1}cqw`, letterSpacing: "0.06em" }}>
            {/* Gewartet oder gezeichnet — das Wort sagt, was davon (Owner 19.09.2026). */}
            {wartet || warten}
          </span>
        </span>
      ) : null}

      {/**
        * ── EINE ZEILE, DIE SAGT, WAS ZU TUN IST (Owner 19.09.2026: „hier muss klarer werden, was
        * der User machen soll") ────────────────────────────────────────────────────────────────
        *
        * Der Knopf allein beantwortet es nicht: „Tu, ca tablou" ist ein Versprechen, keine
        * Anweisung, und wer zum ersten Mal auf einem Poster steht, weiss nicht, dass es hier
        * überhaupt etwas zu tun gibt. Zwei Schritte, nummeriert, direkt über dem Knopf — sie
        * wechselt mit dem Zustand, statt beide gleichzeitig zu zeigen.
        *
        * SIE VERSCHWINDET, sobald es läuft oder etwas abgesagt wurde: Dann steht dort die
        * Wartemeldung bzw. die Absage, und zwei Zeilen übereinander sind eine zu viel.
        */}
      {!laeuft && !absage ? (
        <span className="lb-poster-schritt absolute left-1/2 font-sans"
          style={{
            /* Über dem Knopf, nicht auf ihm: Der Knopf sitzt bei `luft * 1.5` und ist rund
               vier `cqw` hoch — GEMESSEN: bei 4,6 überlappten sie um 12 px, bei 7,4 blieben 2 px Luft — zu eng für zwei Pillen. */
            bottom: `${POSTER.luft * 9.2}cqw`, transform: "translateX(-50%)",
            fontSize: `${POSTER.text.breit * 0.92}cqw`, letterSpacing: "0.06em",
            color: "#fff", background: "rgba(20,16,10,.72)",
            padding: "0.45cqw 1.4cqw", borderRadius: "999px", whiteSpace: "nowrap",
          }}>{foto ? texte.schritt2 : texte.schritt1}</span>
      ) : null}

      <span ref={marke} hidden aria-hidden />
      {platz && original && foto && foto !== original && !laeuft ? createPortal(
        /* Genau in der Lücke zwischen Bild und Name, schwarz auf Papier; `z-[4]` über dem weissen
           Textstreifen (der Rahmen-Schatten liegt auf 3). Original LINKS, Zeichnung rechts. */
        <label className="absolute left-1/2 z-[4] flex items-center font-sans"
          onClick={e => e.stopPropagation()}
          style={{
            top: "-0.3cqw", transform: "translateX(-50%)",
            width: "62%", gap: "1.4cqw", fontSize: `${POSTER.text.breit * 0.85}cqw`,
            lineHeight: 1, letterSpacing: "0.08em", color: POSTER.farben.tinte,
          }}>
          {/* „Before / After" statt „Photo / Art" (Owner 17.09.2026) — Vorher links, Nachher rechts. */}
          <span className="shrink-0 uppercase">Before</span>
          <input type="range" min={0} max={100} value={Math.round((1 - mischung) * 100)}
            aria-label="Original über der Zeichnung"
            onChange={e => setMischung(1 - Number(e.target.value) / 100)}
            onPointerDown={e => e.stopPropagation()}
            className="lb-poster-regler w-full" />
          <span className="shrink-0 uppercase">After</span>
        </label>,
        platz,
      ) : null}

      {/* Der Knopf liegt AUF dem Werk (Owner 17.09.2026: „du machst den button übers bild") und
          wechselt seinen Namen, sobald das Foto liegt. */}
      <button type="button" disabled={laeuft || gesperrt}
        onClick={e => {
          e.preventDefault(); e.stopPropagation();
          /* Ein Knopf, ein Fenster (Owner 19.09.2026: „also wenn er auf diesem Button klickt").
             Liegt noch kein Foto vor, geht zuerst die Dateiauswahl auf — das Fenster folgt nach
             dem Zuschnitt, damit er nicht vor leeren Feldern sitzt. */
          if (original || bildId) { setFenster(true); return; }
          feld.current?.click();
        }}
        className={`lb-poster-knopf absolute left-1/2 font-sans${laeuft || absage ? "" : " lb-poster-knopf-puls"}`}
        style={{
          bottom: `${POSTER.luft * 1.5}cqw`, transform: "translateX(-50%)",
          fontSize: `${POSTER.text.breit * 1.15}cqw`, letterSpacing: "0.08em",
          whiteSpace: "nowrap",
        }}>
        {foto
          ? <Sparkles style={{ width: "1.15em", height: "1.15em" }} aria-hidden />
          : <ImageUp style={{ width: "1.15em", height: "1.15em" }} aria-hidden />}
        {/* ── DREI ZUSTÄNDE, DREI WÖRTER (Owner 19.09.2026: „jetzt kann ich den Namen nicht
            ändern im Poster") ───────────────────────────────────────────────────────────────
            Kein Foto → „Du als Bild" (Dateiauswahl). Foto, noch nicht erzeugt → „erzeuge · 10 €".
            Erzeugt und bezahlt → „Texte ändern". Stünde dort weiter der Preis, wäre der einzige
            Weg zurück in seine Zeilen ein zweiter bezahlter Lauf. */}
        {/* Ohne Kasse kein Preisschild: Der Hausherr sähe sonst einen Betrag, den niemand
            einzieht (Owner 19.09.2026). Das Wort bleibt, die Zahl fällt weg. */}
        {laeuft ? "…" : (bildId ? texteKnopf : (foto ? (adminS ? erzeugen.replace(/\s*·[^·]*$/, "") : erzeugen) : knopf))}
      </button>

      {/* Eine Absage sagt, WAS los ist — nicht „Fehler". Sie steht auf dem Werk, wo der Knopf
          steht, und verschwindet beim nächsten Versuch. */}
      {absage ? (
        <span className="absolute left-1/2 font-sans"
          style={{
            bottom: `${POSTER.luft * 5}cqw`, transform: "translateX(-50%)",
            fontSize: `${POSTER.text.breit}cqw`, color: "#fff",
            background: "rgba(20,16,10,.82)", padding: "0.6cqw 1.8cqw", borderRadius: "999px",
            whiteSpace: "nowrap",
          }}>{absage}</span>
      ) : null}

      {/* ── DIE KASSE, MITTEN IN DER SEITE ─────────────────────────────────────────────────
          `key={kasse}` ist Pflicht: Stripes Provider nimmt ein zweites Geheimnis nicht an, und
          ohne neuen Schlüssel zeigte der zweite Kaufversuch die erste Kasse (Hausregel im Kopf
          von `KasseImFenster`).

          Beim Schliessen wird auf das Guthaben gewartet: Wer bezahlt hat, soll sein Bild
          bekommen, ohne noch einmal zu drücken. Wer abbricht, bekommt nach 30 Sekunden den
          Knopf zurück — kein endloses Drehrad ([[immer-close-einbauen]]). */}
      {/* Der Betrag im Kassentitel kommt aus derselben Konstante wie die Buchung — getippt wäre
          er beim nächsten Preiswechsel falsch (Hausregel `prices-only-from-pricing-table`). */}
      {/**
        * ── DIE KASSE GEHÖRT ANS FENSTER, NICHT INS BLATT (Owner 19.09.2026: „Stripe erscheint im
        * Rahmen") ─────────────────────────────────────────────────────────────────────────────
        *
        * Sie stand mitten im Poster: halb verdeckt vom Bild, beschnitten vom Rahmen, der
        * Bezahlknopf unter dem Blattrand. Der Grund liegt nicht hier, sondern darüber — das Blatt
        * hängt im Raumbild in einem Bereich mit `transform: scale(…)` (`Massstab` in
        * PosterRaeume.tsx). Ein `transform` beim Vorfahren macht aus `position: fixed` eine
        * Position INNERHALB dieses Bereichs; die Kasse konnte gar nicht heraus.
        *
        * `createPortal` hängt sie an `document.body`, ausserhalb jeder Skalierung — dasselbe
        * Mittel, das `PosterGross` und `PosterFilm` seit dem 17.09. aus demselben Grund benutzen.
        *
        * SIE BLEIBT IN DER SEITE (Hausregel `kasse-in-der-seite`): kein zweites Fenster, kein
        * Wechsel der Adresse. Sein Foto steht noch im Blatt, wenn er zurückkommt.
        *
        * EIN AUSWEG IST PFLICHT ([[immer-close-einbauen]]): Das Kreuz oben rechts und ein Tipp
        * neben die Karte schliessen sie; danach wird auf das Guthaben gewartet, damit ein
        * bezahlter Kauf nicht verloren geht.
        */}
      {kasse && montiert ? createPortal(
        /* Über allem, auch über dem Bild-und-Texte-Fenster: An der Kasse gibt es nichts
           Wichtigeres (Owner 19.09.2026). */
        <div className="fixed inset-0 z-[80] grid place-items-start overflow-y-auto overscroll-contain bg-black/60 p-4 sm:place-items-center"
          onClick={e => { if (e.target === e.currentTarget) kasseZu(); }}>
          <div className="relative mx-auto w-full max-w-[460px] rounded-2xl bg-white p-3 shadow-[0_18px_60px_rgba(0,0,0,.35)]">
            <button type="button" onClick={kasseZu} aria-label="×"
              className="absolute right-2 top-2 z-10 grid h-9 w-9 place-items-center rounded-full bg-white text-[#111] shadow-[0_2px_10px_rgba(0,0,0,.2)]">
              <X className="h-5 w-5" aria-hidden />
            </button>
            <KasseImFenster key={kasse} clientSecret={kasse} titel={`Your portrait — ${eur(KUNST_CENTS, sprache ?? "en")}`}
              onSchliessen={kasseZu}
              /* Bezahlt: Kasse zu, auf die Buchung warten, dann erzeugen — ohne dass er noch
                 einmal drücken muss (Owner 19.09.2026: „keine Meldung, kein Ladebalken"). */
              onFertig={kasseZu} />
          </div>
        </div>, document.body) : null}

      {/**
        * ── DAS FENSTER: BILD, TEXTE, DANN ERST DER PREIS (Owner 19.09.2026: „es müsste ein
        * Fenster sich öffnen für Bild, Texte" · „also wenn er auf diesem Button klickt") ───────
        *
        * DAS PROBLEM, das es löst: „Er generiert das Bild zuerst, dann vergisst er seinen Namen
        * einzutragen oder Text zu schreiben und ist verärgert." Und schlimmer: „Es wird nur Bild
        * gekauft und Text ist nicht geändert, aber alles schon bezahlt und versendet."
        *
        * Jetzt steht alles beisammen, bevor der Knopf mit dem Preis kommt — Foto, die grosse
        * Zeile, der Satz, und die Adresse für die fertige Datei. Danach kann nichts mehr
        * vergessen werden.
        *
        * AM FENSTER, NICHT IM BLATT: Das Blatt sitzt in einem skalierten Bereich, in dem
        * `position: fixed` nicht wirkt — dieselbe Falle wie bei der Kasse und beim Vollbild.
        * `createPortal` hängt es an `document.body`.
        *
        * EIN AUSWEG IST PFLICHT ([[immer-close-einbauen]]): Kreuz oben, Tipp daneben.
        */}
      {fenster && montiert && original ? createPortal(
        <div className="fixed inset-0 z-[72] grid place-items-start overflow-y-auto overscroll-contain bg-black/60 p-4 sm:place-items-center"
          onClick={e => { if (e.target === e.currentTarget) setFenster(false); }}>
          <div className="relative mx-auto w-full max-w-[460px] bg-white p-5 shadow-[0_18px_60px_rgba(0,0,0,.35)]">
            <button type="button" onClick={() => setFenster(false)} aria-label="×"
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white text-[#111] shadow-[0_2px_10px_rgba(0,0,0,.2)]">
              <X className="h-5 w-5" aria-hidden />
            </button>

            <p className="m-0 font-serif text-[24px] leading-tight text-[#111]">{texte.fensterTitel}</p>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={original} alt="" className="mt-4 block max-h-[240px] w-full bg-[#f5f5f5] object-contain" />
            <button type="button" onClick={() => feld.current?.click()}
              className="mt-2 text-[14px] font-semibold text-[#555] underline underline-offset-4 hover:text-[#111]">
              {texte.fotoTauschen}
            </button>

            {/* ── HIER STANDEN TITEL UND SATZ (Owner 19.09.2026: „die Texte aus dem Modalfenster
                werden sowieso nicht übernommen, kannst du raus machen") ──────────────────────────
                Geschrieben wird auf dem Blatt (`PosterDeinText`), wo er sieht, wie es gesetzt
                wird. Zwei Orte für dieselbe Zeile waren der Fehler: Was er im Fenster tippte und
                was auf dem Papier stand, lief auseinander. Das Fenster behält, was KEIN Text auf
                dem Blatt ist — das Foto und die Adresse. */}
            <label className="mt-4 block text-[13.5px] font-semibold text-[#555]">{texte.feldMail}</label>
            <input type="email" value={mail} onChange={e => setMail(e.target.value)} maxLength={200}
              inputMode="email" autoComplete="email"
              className="mt-1 block w-full border border-[#dfe4e9] px-3 py-2.5 text-[15px] text-[#111] outline-none focus:border-[#111]" />
            <p className="m-0 mt-1 text-[13.5px] text-[#777]">{texte.mailWarum}</p>

            {absage ? <p className="m-0 mt-3 text-[14px] font-bold text-[#b3261e]">{absage}</p> : null}

            {/**
             * ── NACH DEM LAUF WIRD GESCHRIEBEN, NICHT ERZEUGT (Owner 19.09.2026) ─────────────
             *
             * Dasselbe Fenster, zwei Aufträge. Solange `bildId` fehlt, ist der Knopf der
             * bezahlte Lauf. Liegt das Blatt, schreibt er nur noch Titel und Satz auf den Zettel
             * (`api/kunst-text`) — kein Modell, kein Geld, und die Druckdatei nimmt die neuen
             * Zeilen beim nächsten Laden mit.
             */}
            <button type="button" disabled={laeuft}
              onClick={() => void (bildId ? zeilenSichern() : kunstHolen())}
              className="mt-5 flex w-full items-center justify-center gap-2 bg-[#111] px-5 py-3.5 text-[15px] font-black uppercase tracking-[0.1em] text-white transition hover:bg-[#333] disabled:opacity-50">
              {bildId
                ? <Check className="h-[18px] w-[18px]" aria-hidden />
                : <Sparkles className="h-[18px] w-[18px]" aria-hidden />}
              {laeuft ? warten : (bildId ? texte.speichern : (adminS ? erzeugen.replace(/\s*·[^·]*$/, "") : erzeugen))}
            </button>
          </div>
        </div>, document.body) : null}

      {/* Kein stiller Upload beim Auswählen: die Datei geht in den Zuschnitt, nicht auf den
          Server (Pflicht 1). */}
      {/* `onClick` hält den Klick HIER an: `feld.click()` erzeugt ein eigenes Ereignis, das
          sonst weiter nach oben läuft und die Grossansicht öffnet, statt den Dateiwähler zu
          zeigen (17.09.2026 gemessen — der Knopf „tat nichts"). */}
      <input ref={feld} type="file" accept="image/*" hidden
        onClick={e => e.stopPropagation()}
        onChange={e => {
          const d = e.target.files?.[0];
          e.target.value = "";
          if (!d) return;
          /* ── FALSCHES FORMAT SAGT ES LAUT (Owner 17.09.2026: „es muss eine fehlermeldung kommen
             wenn unerlaubte formate hochgeladen werden") ─────────────────────────────────────
             `accept` hält nicht jeden Wähler ab (HEIC vom iPhone, PDF, Video). Vorher lief so
             eine Datei stumm in den Zuschnitt und dort ins Leere — der Kunde sah nichts und
             dachte, der Knopf sei kaputt. Erlaubt ist, was der Zuschnitt und der Druck lesen:
             JPG, PNG, WebP; und nichts über 20 MB. */
          if (!ERLAUBT.has(d.type)) { setAbsage(texte.nurBilder); return; }
          if (d.size > 20 * 1024 * 1024) { setAbsage(texte.zuGross); return; }
          setAbsage("");
          /* Das ganze Bild festhalten, bevor der Zuschnitt es kleiner macht. */
          const leser = new FileReader();
          leser.onload = () => setRoh(typeof leser.result === "string" ? leser.result : null);
          leser.readAsDataURL(d);
          setZuschneiden(d);
        }} />

      {zuschneiden ? (
        <ImageCropper
          file={zuschneiden}
          aspect={verhaeltnis}
          /* Auf dem Blatt sitzt der Kopf oben — geschnitten wird unten (Owner 19.09.2026). */
          obenAnsetzen
          sprache={sprache}
          onCancel={() => setZuschneiden(null)}
          onSave={(_datei, vorschau) => {
            setOriginal(vorschau); setFoto(vorschau); setBildId(null); setZuschneiden(null);
            /* Ein neues Foto heisst ein neuer Auftrag — die alte Kennung gilt nicht mehr. */
            setServerId(null);
            /**
             * ── KEIN FENSTER NACH DEM HOCHLADEN (Owner 19.09.2026: „das mag ich nicht, dass
             * sofort nach Upload des Fotos das Fenster kommt") ──────────────────────────────────
             *
             * Hier stand `setFenster(true)`. Der Gedanke war, ihn nicht vor leeren Feldern sitzen
             * zu lassen — aber seit Titel und Satz auf dem BLATT geschrieben werden, hat das
             * Fenster nichts mehr, was er sofort bräuchte. Es legte sich über genau den Moment,
             * auf den er gewartet hat: sein Foto im Blatt zu sehen.
             *
             * Jetzt gilt wieder „ein Knopf, ein Fenster": Das Blatt zeigt sein Foto, und das
             * Fenster kommt erst, wenn er auf „erzeuge" drückt.
             */
          }}
        />
      ) : null}
    </>
  );
}
