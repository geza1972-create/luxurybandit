"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, RotateCcw } from "lucide-react";
import {
  BildWahl, Eingabe, Fehlerzeile, Fortschritt, Haken, Kasten, Knopf,
  ScanLaden, Scheibe, TunnelFortschritt, TunnelKacheln, TunnelKachelUpload, VorlagenKachel,
} from "@/components/CI";
import { Fine, H1, Lead, Y } from "@/components/Landing";
import ImageCropper from "@/components/ImageCropper";
import SelbstAufnahme from "@/components/SelbstAufnahme";
import EinladungKarte from "@/components/EinladungKarte";
import EinladungAnsicht from "@/components/EinladungAnsicht";
import TeilenKnopf from "@/components/TeilenKnopf";
import { musikFuer } from "@/lib/musik";
import { ACADEMY_DOMAIN } from "@/lib/armee-musik";
import type { ArmeeTexte, DemoSzene } from "@/lib/demo-armee";

/**
 * DER VIDEO-TRICHTER DER INTERNATIONAL PEACE ARMEE (Owner 02.09.2026).
 *
 * ER IST EINE VARIANTE DES GEBURTSTAGS-TRICHTERS, KEINE NEUERFINDUNG. Der Owner hat den
 * Weg in drei Schritten festgelegt: erst „wie tryon", dann „lingerie tryon", dann — mit
 * Blick auf den Geburtstag — „aber geburtstag ist noch besser" · „genau das". Übernommen
 * ist deshalb dessen Aufbau, Bildschirm für Bildschirm:
 *
 *   Kopf         eine H1, die sagt was gerade passiert, darunter der Fortschritt
 *   Punkte       `TunnelFortschritt` darunter
 *   Schritt 1    „Wähl den Look:" → hier „Wähl deinen Einsatz:", grosse Wisch-Vorlagen
 *   Schritt 2    linke Upload-Kachel, Pfeil, rechts die gewählte Vorlage, goldener Knopf
 *   Ende         die Karte mit dem Video — hier erst am Schluss, siehe `beispielKarte`
 *
 * Die Bausteine sind wörtlich dieselben: `BildWahl` (gross), `TunnelKacheln`,
 * `TunnelKachelUpload`, `VorlagenKachel`, `EinladungKarte`. Nichts davon ist hier
 * nachgebaut — geändert ist nur die Beschriftung und was am Ende passiert.
 *
 * WAS ANDERS IST, UND NUR DAS:
 *   · kein Preis, keine Kasse — das Video ist der Köder, nicht die Ware
 *   · das Ergebnis bleibt IM Trichter, weil direkt darunter die Frage steht, für die der
 *     ganze Trichter gebaut ist
 *   · die Erzeugung ist in der Vorführung gestellt
 */

/**
 * FÜNF STATIONEN.
 *
 *   1  Einsatz wählen     4  das Video, darunter die Frage (mit E-Mail)
 *   2  Foto + Vorname     5  Danke
 *   3  die Erzeugung läuft (echt, zwei Phasen)
 *
 * DIE E-MAIL STEHT HINTEN — und das war eine Kehrtwende (Owner 02.09.2026, erst „Landingpage-
 * Templateauswahl-Bild hochladen-Email", dann „muss die E-Mail davor?" und „also E-Mail nach
 * hinten"). Drei Gründe, in der Reihenfolge ihres Gewichts:
 *
 *  1. AM DISPLAY GIBT NIEMAND VORHER SEINE ADRESSE. Wer auf einer Messe halböffentlich vor
 *     einem Bildschirm steht, tippt sie nicht ein, bevor er weiss, ob das Ding funktioniert
 *     — und genau dieses Szenario ist der Kern des Produkts.
 *  2. DAS VIDEO IST DER BESSERE GRUND. „Wir schicken es dir" wirkt anders als „sonst geht es
 *     nicht weiter". Wer sich gerade selbst im Cockpit gesehen hat, gibt die Adresse gern.
 *  3. DIE KOSTEN SIND SCHON GEDECKELT (3 Läufe je Gerät, 40 je Tag, /api/armee-video) — das
 *     war die eigentliche Sorge hinter der Adresse davor.
 */
type Schritt = 1 | 2 | 3 | 4 | 5;

/**
 * WIE LANGE DIE ECHTE KETTE BRAUCHT — gemessen, nicht geschätzt (02.09.2026, fünf Läufe):
 * das Bildmodell rund 40 Sekunden, Pixverse danach 60 bis 150. Der Balken läuft an diesen
 * Zahlen entlang, bleibt aber vor 100 % stehen, bis die Antwort wirklich da ist: Ein Balken,
 * der voll ist und dann noch wartet, ist schlimmer als einer, der langsam kriecht.
 */
const DAUER_BILD_MS = 45_000;
const DAUER_VIDEO_MS = 120_000;

export default function ArmeeFunnel({ szenen, texte, kampagne, hinweis }: {
  szenen: DemoSzene[];
  /** Alle Wörter des Trichters in der Sprache der Seite (lib/demo-armee.ts). */
  texte: ArmeeTexte;
  /**
   * WOHIN DIESER TRICHTER GEHÖRT — ohne Angabe bleibt er die Academy selbst (Owner
   * 03.09.2026: „du bauest es so, dass man das beliebig duplizieren kann").
   *
   * Fünf Stellen waren bis heute fest verdrahtet: das Thema in den Käufen (`"armee"`), die
   * Erzeugungsroute (`/api/armee-video`), der Soundtrack (`musikFuer("academy")`), die
   * Domain für Teilen-Links und der Rückweg von Schritt 1 (`/academy`). Für eine zweite
   * Kampagne (`lib/kampagnen.ts`) sind das die einzigen fünf Dinge, die sich unterscheiden —
   * alles andere in dieser Datei ist bereits Wortschatz (`texte`) oder Bildmaterial
   * (`szenen`). Ohne dieses Prop verhält sich der Trichter GENAU wie vorher: Der einzige
   * bestehende Aufrufer (`app/academy/start/page.tsx`) übergibt es nicht und bleibt
   * unverändert.
   */
  kampagne?: {
    theme: string; videoApi: string; musik: string; domain: string;
    ansichtBasis: string; zurueckHref: string;
  };
  /**
   * DER HINWEIS, DASS ES DIE UPA NICHT GIBT — auch HIER, nicht nur auf der Landingpage
   * (Owner 04.09.2026, am Bildschirmfoto der Vorlagenwahl: „und hier?").
   *
   * Wer über einen geteilten Link, einen QR-Code oder eine Anzeige direkt im Trichter
   * landet, sieht die Landingpage nie — und mit ihr auch nicht deren Hinweis. Er steht
   * deshalb ein zweites Mal hier, auf dem ERSTEN Bildschirm, bevor der Besucher eine Wahl
   * trifft, die wie eine echte Bewerbung aussieht. Optional, weil eine künftige Kampagne
   * (`lib/kampagnen.ts`) einen eigenen, richtigen Hinweis mitbringt oder gar keinen braucht.
   */
  hinweis?: { titel: string; text: string };
}) {
  const K = kampagne ?? {
    theme: "armee", videoApi: "/api/armee-video", musik: "academy",
    domain: ACADEMY_DOMAIN, ansichtBasis: "/academy/v", zurueckHref: "/academy",
  };
  const [schritt, setSchritt] = useState<Schritt>(1);
  const [szeneId, setSzeneId] = useState(szenen[0]?.id ?? "");
  const [foto, setFoto] = useState("");
  const [cropDatei, setCropDatei] = useState<File | null>(null);
  const [fortschritt, setFortschritt] = useState(0);

  const [name, setName] = useState("");
  const [geburt, setGeburt] = useState("");
  const [mail, setMail] = useState("");
  const [einwilligung, setEinwilligung] = useState(false);
  const [fehler, setFehler] = useState("");
  const [sendet, setSendet] = useState(false);

  /**
   * WAS DIE ECHTE ERZEUGUNG ZURÜCKLÄSST.
   *
   * `auftragId` ist die Kennung des Eintrags in den Käufen — er entsteht beim Hochladen des
   * Fotos, nicht erst am Ende. Damit steht ein angefangener Versuch auch dann in der Liste,
   * wenn jemand mittendrin wegwischt; genau das wollte der Owner sehen („ich will die Bilder
   * sehen, die die Leute hochladen. Ich will alle Tests sehen in Käufe").
   *
   * `ergebnisVideo` ist SEIN Video. Solange es leer ist, zeigt die Karte die Vorlage — das
   * ist der Fall, in dem die Kette scheitert und er trotzdem etwas sehen soll.
   */
  const [auftragId, setAuftragId] = useState("");
  /**
   * DER LÖSCHWEG (Owner 04.09.2026: „es muss auch ein lösch button her").
   *
   * `loeschFrage` ist der erste Tipp: Der Knopf färbt sich rot und stellt die Frage; erst der
   * zweite Tipp löscht. Kein `window.confirm`, keine Überlagerung — Hausregel seit dem
   * 30.07.2026, und Overlay-Dialoge gehen hier ohnehin regelmässig schief. Nach vier Sekunden
   * fällt die Frage von selbst zurück, damit ein versehentlicher erster Tipp nicht als
   * scharfer Knopf stehenbleibt.
   */
  const [loeschFrage, setLoeschFrage] = useState(false);
  const [loescht, setLoescht] = useState(false);
  const [geloescht, setGeloescht] = useState(false);
  const [loeschFehler, setLoeschFehler] = useState("");
  const loeschUhr = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(loeschUhr.current), []);
  const [ergebnisVideo, setErgebnisVideo] = useState("");
  const [ergebnisPoster, setErgebnisPoster] = useState("");
  const [genFehler, setGenFehler] = useState("");
  /** Welche Hälfte läuft — nur für das Wort über dem Balken. */
  const [phase, setPhase] = useState<"bild" | "video">("bild");

  /**
   * DER ABSPANN AM VIDEO-ENDE (Owner 02.09.2026: „Kannst am Ende des Videos etwas einbauen
   * und zwar etwas was dynamisch ist wie Danke Johan. Du bist uns wichtig!").
   *
   * ER LIEGT ÜBER DEM VIDEO, NICHT DARIN. Ins Video gerendert müsste jede Namensänderung
   * einen neuen Lauf auslösen — hier steht der Name in der Sekunde da, in der er getippt
   * wird, und kostet nichts. Für ein Video zum Herunterladen wäre das Einbrennen der
   * richtige Weg; solange es im Trichter bleibt, ist es überflüssiger Aufwand.
   *
   * Die letzten drei Sekunden: früh genug, dass man ihn liest, spät genug, dass er nicht
   * über der Szene liegt.
   */
  const [abspann, setAbspann] = useState(false);
  const fotoRef = useRef<HTMLInputElement>(null);
  /** Wohin der Knopf auf dem Video springt — der Kasten mit der Frage unter dem Ergebnis. */
  const formularRef = useRef<HTMLDivElement>(null);
  /**
   * DIE KAMERA IST DER BAUSTEIN DES HAUSES (Owner 02.09.2026: „das haben wir doch schon
   * ähnlich" · „bei Geburtstag" · „und bei future me").
   *
   * Hier stand eine eigene Kamera: `getUserMedia`, Vorschau in der Kachel, Auslöser,
   * Gesichts-Oval — alles noch einmal gebaut. `components/SelbstAufnahme.tsx` kann das
   * längst, und zwar mit Dingen, die dort über Monate gelernt wurden: erzwungenes
   * Hochformat (eine Webcam liefert sonst ihr Weitwinkel und der Kopf wird winzig), ein
   * Zoom-Regler, wenn die Kamera ihn hergibt, der Ausgang an der BILDecke statt am
   * Fensterrand, und der Kreis fürs Gesicht.
   *
   * Der Baustein hat jetzt einen `nurFoto`-Modus — das war die einzige Lücke.
   */
  const [kameraOffen, setKameraOffen] = useState(false);
  const szene = szenen.find(s => s.id === szeneId) ?? szenen[0];
  const T = texte;

  useEffect(() => { window.scrollTo({ top: 0 }); }, [schritt]);

  /**
   * DIE ERZEUGUNG — SIE LÄUFT WIRKLICH (Owner 02.09.2026: „es wird nicht ein mal ein video
   * bei pixverse generiert" · „klar will ich das" · „der Kunde muss das benutzen").
   *
   * Hier stand eine Uhr: 26 Sekunden zählen, dann das fertige Szenen-Video zeigen. Jeder sah
   * dasselbe fremde Gesicht, und der Owner ist dreimal darüber gestolpert.
   *
   * DREI AUFRUFE, IN DIESER REIHENFOLGE:
   *
   *   1. `/api/kiss-log`     legt den Auftrag an und das Foto ab — mitsamt Eingangstor
   *                          (Nacktheit, Minderjährige). Ab hier steht er in den Käufen.
   *   2. `/api/armee-video`  Phase „bild": sein Gesicht in die Szene (~40 s)
   *   3. `/api/armee-video`  Phase „video": Pixverse animiert es (~60–150 s)
   *
   * WARUM NICHT EIN EINZIGER AUFRUF: Er müsste drei Minuten offen bleiben, und der Balken
   * könnte nur raten. Getrennt weiss der Trichter nach jeder Hälfte, wo er steht — und was
   * schon gerechnet ist, liegt am Auftrag, auch wenn der Browser dazwischen abbricht.
   *
   * `abgebrochen` fängt den Fall, dass er währenddessen zurückgeht: Ohne diesen Riegel
   * schriebe die zurückkehrende Antwort ihn wieder in den Ergebnis-Schritt.
   */
  useEffect(() => {
    if (schritt !== 3) return;
    let abgebrochen = false;

    /* Der Balken läuft an den gemessenen Zeiten entlang und bleibt bei 96 stehen — die
       letzten vier Prozent gehören der Antwort, nicht der Uhr. */
    const start = Date.now();
    const uhr = setInterval(() => {
      const dauer = phase === "bild" ? DAUER_BILD_MS : DAUER_BILD_MS + DAUER_VIDEO_MS;
      setFortschritt(Math.min(96, Math.round((Date.now() - start) / dauer * 100)));
    }, 400);

    void (async () => {
      try {
        let device = "";
        try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /* privater Modus */ }

        /* 1 · Auftrag + Foto. `personImage` ist die Data-URL aus dem Zuschnitt; die Route
           legt sie in Supabase ab und gibt die Kennung zurück. */
        const anlage = await fetch("/api/kiss-log", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            /* OHNE ADRESSE UND OHNE NAMEN: Beides kommt beim Absenden des Formulars dazu
               (`absenden` unten, `update` in /api/kiss-log) — und nur, wenn er dort
               tatsächlich einen Nachnamen eintippt (Owner 04.09.2026: „auch dieses Feld
               raus", zum „Dein Vorname"-Feld vor der Erzeugung). Der Auftrag steht trotzdem
               ab dieser Sekunde in den Käufen — mit Foto und Einsatz. */
            theme: K.theme, look: szeneId, personImage: foto, device,
          }),
        });
        const a = await anlage.json().catch(() => ({}));
        if (!anlage.ok || !a?.id) throw new Error(a?.error || "Dein Foto konnte nicht angenommen werden.");
        if (abgebrochen) return;
        setAuftragId(String(a.id));

        /* 2 · Das Gesicht in die Szene. */
        setPhase("bild");
        const b = await fetch(K.videoApi, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: a.id, phase: "bild", szene: szeneId, device }),
        });
        const bj = await b.json().catch(() => ({}));
        if (!b.ok) throw new Error(bj?.error || "Das Bild ist nicht entstanden.");
        if (abgebrochen) return;
        if (bj?.bildUrl) setErgebnisPoster(String(bj.bildUrl));

        /* 3 · Bewegung. */
        setPhase("video");
        const v = await fetch(K.videoApi, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: a.id, phase: "video", szene: szeneId }),
        });
        const vj = await v.json().catch(() => ({}));
        if (!v.ok) throw new Error(vj?.error || "Das Video ist nicht entstanden.");
        if (abgebrochen) return;

        setErgebnisVideo(String(vj.videoUrl || ""));
        if (vj?.poster) setErgebnisPoster(String(vj.poster));
        setFortschritt(100);
        setSchritt(4);
      } catch (e) {
        if (abgebrochen) return;
        setGenFehler(e instanceof Error ? e.message : "Unbekannter Fehler.");
      }
    })();

    return () => { abgebrochen = true; clearInterval(uhr); };
    /* `phase` gehört bewusst NICHT in die Liste: Sie wechselt INNERHALB dieses Laufs, und
       ein Neustart mitten in der Kette würde ein zweites Mal Geld ausgeben. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schritt]);

  const mailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail.trim());

  /**
   * DIE LETZTEN ANGABEN WANDERN AN DEN AUFTRAG, DER LÄNGST STEHT.
   *
   * Mail und Einwilligung sind seit Schritt 3 da — hier fehlen nur noch Nachname und
   * Geburtsdatum. Sie werden an DENSELBEN Eintrag geschrieben, nicht in einen zweiten:
   * Ein Bewerber, der in den Käufen zweimal auftaucht, ist zweimal falsch gezählt.
   *
   * Und der Schritt läuft weiter, wenn das Nachtragen scheitert. Das Video hat er schon,
   * die Adresse liegt seit Schritt 3 am Auftrag — ihn an dieser Stelle festzuhalten,
   * würde nichts retten und alles verderben.
   */
  /**
   * LÖSCHEN HEISST LÖSCHEN (Owner 04.09.2026: „es verschwindet für immer aus dem netz").
   *
   * Derselbe Weg wie in der Haus-Galerie: `POST /api/kiss-log` mit `remove`. Die Route prüft
   * den Besitz über die Gerätekennung (`lb_visitor`) — genau die, unter der der Auftrag
   * angelegt wurde; ein Konto braucht der Bewerber dafür nicht. Sie nimmt seit heute auch die
   * Videodatei mit, nicht nur Foto und Bild (siehe dort).
   */
  const loeschen = () => {
    if (!auftragId) return;
    if (!loeschFrage) {
      setLoeschFehler("");
      setLoeschFrage(true);
      clearTimeout(loeschUhr.current);
      loeschUhr.current = setTimeout(() => setLoeschFrage(false), 4000);
      return;
    }
    clearTimeout(loeschUhr.current);
    setLoescht(true);
    void (async () => {
      let device = "";
      try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /* privater Modus */ }
      try {
        const r = await fetch("/api/kiss-log", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ remove: auftragId, device }),
        });
        if (!r.ok) throw new Error(String(r.status));
        setGeloescht(true);
        /* Das Ergebnis auch aus der Ansicht nehmen — sonst stünde die Karte weiter da und
           zeigte ein Video, das es nicht mehr gibt. */
        setErgebnisVideo(""); setErgebnisPoster(""); setAuftragId("");
      } catch {
        setLoeschFehler(T.loeschenFehler);
      } finally {
        setLoescht(false); setLoeschFrage(false);
      }
    })();
  };

  const absenden = () => {
    if (!name.trim()) return setFehler(T.fehlerName);
    if (!geburt) return setFehler(T.fehlerGeburt);
    /* Adresse und Haken stehen seit dem 02.09.2026 wieder HIER — sie sind das, was der Kunde
       am Ende kauft, und nach dem Video gibt man sie williger als davor. */
    if (!mailOk) return setFehler(T.fehlerMail);
    if (!einwilligung) return setFehler(T.fehlerHaken);
    setFehler(""); setSendet(true);
    void (async () => {
      try {
        if (auftragId) {
          let device = "";
          try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /* privater Modus */ }
          await fetch("/api/kiss-log", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              update: auftragId, device,
              modelName: name.trim(),
              email: mail.trim().toLowerCase(),
              satz: `geboren ${geburt}`,
            }),
          });
        }
      } catch { /* siehe oben — der Weg geht trotzdem weiter */ }
      setSendet(false); setSchritt(5);
    })();
  };

  /**
   * DIE KARTE STEHT NUR AM ENDE (Owner 02.09.2026: „ja der soll unten weg").
   *
   * Beim Geburtstag läuft sie auf jedem Schritt mit, und dort ist das richtig: Sie zeigt ein
   * FREMDES Beispiel und verkauft damit das Ergebnis. Hier ist es dasselbe Video, das der
   * Bewerber am Ende als „sein" Ergebnis sieht — stünde es schon auf Schritt 1 und 2, wäre
   * die Überraschung verbraucht, bevor er sein Foto hochgeladen hat. Sie erscheint deshalb
   * erst, wenn sie ihm gehört.
   */
  const beispielKarte = szene ? (
    /**
     * WIR HÖREN AM RAHMEN ZU, NICHT AM SPIELER — in der FANGPHASE (`capture`). Zwei Gründe,
     * beide schon in `EinladungAnsicht` belegt: Den Spieler gibt es beim Anhängen noch gar
     * nicht (er entsteht erst beim Tipp), und `timeupdate` steigt nicht auf. Ohne das `true`
     * als dritten Wert bekäme dieser Zuhörer nie ein Ereignis zu sehen.
     */
    <div className="relative mx-auto mt-8 w-full max-w-[420px]"
      onTimeUpdateCapture={e => {
        const v = e.target as HTMLVideoElement;
        if (!v?.duration) return;
        setAbspann(v.currentTime > v.duration - 3);
      }}>
      <EinladungKarte
        sprache="de" sie="" er="" demo
        titel={szene.name}
        botschaft=""
        video={
          <EinladungAnsicht
            /* SEIN Video, sobald es da ist — die Vorlage nur, solange nicht. Fällt die
               Kette aus, sieht er wenigstens die Szene, die er gewählt hat, statt einer
               leeren Fläche. */
            id="" videoUrl={ergebnisVideo || szene.video} poster={ergebnisPoster || szene.bild}
            /**
             * DER SOUNDTRACK DES HAUSES STATT DER PIXVERSE-SPUR (Owner 02.09.2026: „hier
             * habe ich dir einen Soundtrack für alle Generierungen angelegt").
             *
             * Die erzeugten Videos haben eine eigene Tonspur — der Prompt bestellt sie mit.
             * Sie ist aber bei jedem Lauf anders und bei fünf Szenen fünfmal verschieden;
             * ein Produkt, das man wiedererkennen soll, braucht EINEN Klang. Der Spieler
             * läuft dafür stumm (so hält es `EinladungAnsicht` ohnehin), die Musik liegt
             * daneben und startet mit dem Video.
             *
             * Und es hält den Ton-Knopf sinnvoll: „Ton an" schaltet jetzt die Musik, nicht
             * ein Motorengeräusch, das je nach Szene fehlt.
             */
            /**
             * ES LÄUFT DURCH (Owner 02.09.2026: „das Video darf nicht 10 Sek stehen bleiben
             * am Ende. Die Musik kann weiterlaufen").
             *
             * Auf der Landingpage ist Stehenbleiben richtig: Der Spot hat ein Schlussbild
             * mit einem Satz, den man lesen soll. Hier ist das Video das ERGEBNIS — der
             * Besucher sieht sich selbst, und ein Standbild nimmt genau den Moment weg, für
             * den er zwei Minuten gewartet hat. Die Haus-Schleife blendet zwei Spieler
             * ineinander, die Musik läuft durch (Memory `videos-nahtlos-schleifen`).
             */
            musik={musikFuer(K.musik)} schleife
            /* 2:3 — genau das Format, in dem die Kette liefert (gpt-image 1024×1536, Pixverse
               übernimmt es). In 9:16 gepresst würde die Szene links und rechts beschnitten. */
            verhaeltnis="aspect-[2/3]"
            tonText={T.ton} tonAusText={T.tonAus} grossText={T.gross} kleinText={T.klein}
            /**
             * TEILEN GEHÖRT ANS ERGEBNIS (Owner 02.09.2026: „wieso Video vor der
             * Generierung? Das sollen sich die Leute doch schicken. Sie können das eh
             * nicht runterladen").
             *
             * Der Spot auf der Landingpage hatte einen Teilen-Knopf, SEIN Video nicht —
             * genau verkehrt herum. Herunterladen kann er es nicht (die Adresse ist eine
             * signierte Datei, kein Speicherplatz auf seinem Gerät); verschicken schon,
             * und das ist ohnehin das, was jemand mit so einem Video tut. Für uns ist es
             * der billigste Weg, wie ein Bewerber den nächsten bringt.
             *
             * Erst, wenn sein Video wirklich da ist: Solange die Karte die Vorlage zeigt,
             * würde der Knopf die fremde Szene verschicken.
             */
            /**
             * GETEILT WIRD DIE SEITE, NICHT DIE DATEI (Owner 02.09.2026: „wenn ich es share,
             * kommt nur das Rohvideo an, ohne nichts. Es muss das Original ankommen, mit
             * Schrift und Musik" · „und Loop").
             *
             * Hier stand die signierte mp4-Adresse. Eine Datei kann nichts von dem tragen,
             * was dieses Video ausmacht: Der Abspann liegt als Text ÜBER dem Bild, die Musik
             * läuft daneben, und ob etwas in Schleife läuft, entscheidet der Player des
             * Empfängers. Angekommen ist deshalb ein stummer Clip, der nach fünf Sekunden
             * stehen blieb.
             *
             * `/academy/v/<id>` zeigt dasselbe wie hier — mit Schrift, Musik, Schleife — und
             * führt den Empfänger danach auf die Landingpage. So bringt ein Bewerber den
             * nächsten.
             */
            teilen={ergebnisVideo && auftragId
              ? <TeilenKnopf rund url={`${K.domain}${K.ansichtBasis}/${auftragId}`} text={T.teilenText}
                  label={T.teilen} kopiertLabel={T.teilenKopiert} />
              : undefined}
            /**
             * DER SPRUCH LIEGT IM VIDEO — DURCHGEHEND, UND ER GEHT INS VOLLBILD MIT
             * (Owner 02.09.2026: „das Video, wenn ich es vergrössere, … da muss auch stehen
             * Danke…" · „der Spruch nicht nur am Ende, sondern durchgehend einblenden").
             *
             * Er lag an der KARTE und kam in den letzten drei Sekunden. Beides war falsch:
             * Im Vollbild legt sich das Video über die ganze Seite, die Karte bleibt dahinter
             * — und bei einem Video in Schleife hiesse „am Ende" meistens „nicht da". Der
             * Satz IST die persönliche Note; er soll stehen, solange man hinsieht.
             *
             * Nur mit Namen: Ohne bliebe „Danke ." stehen, schlimmer als kein Abspann.
             */
            /* Das fertige Video geht gross auf — der Moment, auf den er gewartet hat. Nur
               SEIN Video: Die Vorlage soll niemandem den Bildschirm füllen. */
            startGross={!!ergebnisVideo}
            /**
             * EIN DUNKLER GRUND UNTER DEM TEXT (Owner 02.09.2026: „ich sehe immer noch das
             * kaputte" — nachdem die Schrift schon auf Weiss stand).
             *
             * Gemessen war sie weiss (`rgb(255,255,255)`); der Text sah trotzdem grau aus,
             * weil das Videobild an dieser Stelle hell ist — Wüste, Sand, Gegenlicht. Weiss
             * auf hell ist nicht zu retten, und ein `drop-shadow` trägt nur gegen mittlere
             * Töne. Der Verlauf ist dieselbe Lösung wie am Scan-Bild: unten kräftig, nach
             * oben auslaufend; er verdeckt nichts, dort ist im Bild ohnehin Boden.
             */
            ueberlagerung={({ schliessen }) => (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-6 pb-6 pt-20 text-center">
                <p data-aufmedien="1" className="text-[24px] font-black leading-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
                  {T.abspannEins}
                </p>
                {/* BEIDE ZEILEN WEISS (Owner 02.09.2026: „die Schrift auf dem generierten
                    Video bitte weiss"). Die zweite stand in Haus-Gold — richtig für eine
                    Auszeichnung auf unserer Seite, falsch hier: Das Video läuft unter der
                    Marke des Kunden, und Gold ist die Farbe des Hauses. Weiss gehört
                    niemandem und liegt auf jedem Motiv. */}
                <p data-aufmedien="1" className="mt-1.5 text-[18px] font-black text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
                  {T.abspannZwei}
                </p>
                {/**
                  * DER KNOPF UNTER DEM SPRUCH (Owner 02.09.2026: „unter dem Spruch auf das
                  * Video ein Button ‚Per E-Mail senden', dann springt das runter zum
                  * Formular").
                  *
                  * Er steht AUF dem Video, weil dort gerade hingesehen wird — das Formular
                  * darunter sieht man in dem Moment nicht. `pointer-events-auto` gegen die
                  * Hülle, die alle Tipps durchlässt: Nur dieser eine Knopf fängt sie, sonst
                  * bleibt das Video überall antippbar.
                  */}
                <button type="button"
                  onClick={e => {
                    /**
                     * DER TIPP DARF NICHT DURCHFALLEN (Owner 02.09.2026: „Button passiert
                     * nichts").
                     *
                     * Die ganze Videofläche ist der Umschalter für Gross/Klein. Ohne
                     * `stopPropagation` feuerte erst der Knopf (`schliessen`) und gleich
                     * danach die Fläche darunter — gross wurde false und sofort wieder true.
                     * Von aussen sah es aus, als täte der Knopf nichts; in Wahrheit taten
                     * zwei Dinge gleichzeitig etwas und hoben sich auf.
                     */
                    e.stopPropagation();
                    /* Erst schliessen, dann springen: Im Vollbild liegt das Formular hinter
                       dem Video — ein Scrollen dorthin sähe aus, als täte der Knopf nichts.
                       Das kurze Warten lässt das Schliessen fertig zeichnen, bevor die Seite
                       sich bewegt. */
                    schliessen();
                    setTimeout(() => formularRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
                  }}
                  className="lb-gold pointer-events-auto mx-auto mt-3 flex h-11 items-center justify-center rounded-full px-6 text-[14.5px] font-black active:scale-95 transition">
                  {T.perMail}
                </button>
              </div>
            )}
          />
        }
      />

      {/* Der Abspann liegt jetzt IM Video (`ueberlagerung` an `EinladungAnsicht`), nicht mehr
          hier an der Karte — nur so geht er ins Vollbild mit (Owner 02.09.2026). */}
    </div>
  ) : null;

  /**
   * DER TITEL SCHLEPPT SICH NICHT MIT (Owner 02.09.2026: „habe dir schon gesagt, wir
   * schleppen Titel nicht mit. Wir schreiben das, was gerade passiert").
   *
   * Der Claim ist WERBUNG — er beantwortet „warum überhaupt?". Diese Frage stellt sich
   * genau einmal, am Anfang. Ab Schritt 2 hat der Nutzer sich längst entschieden; dort
   * kostet der dreizeilige Claim nur Höhe und drückt den Knopf aus dem Bild. Oben steht
   * stattdessen, was er GERADE tut.
   */
  const kopf = (
    <>
      {/* KEIN KICKER (Owner 02.09.2026: „United Peace Academy · Deine Laufbahn raus").
          Die Marke steht drei Zentimeter darüber in der Kopfzeile, und die Laufbahn ist
          genau das, was der Trichter gerade fragt — der Kicker wiederholte beides und
          kostete die Zeile, um die es beim CTA im Bild geht (Skill `ci-design`). */}
      <H1 className="text-center">
        {schritt === 1
          ? <>{T.schrittEinsEins} <Y>{T.schrittEinsZwei}</Y></>
          : schritt === 2
            ? <>{T.schrittZweiEins} <Y>{T.schrittZweiZwei}</Y></>
            /* Schritt 3 ist die Erzeugung — den E-Mail-Titel gibt es nicht mehr. */
            : <>{T.schrittVierEins} <Y>{T.schrittVierZwei}</Y></>}
      </H1>
      <div className="mt-3"><TunnelFortschritt schritte={[1, 2]} aktuell={Math.min(schritt, 2)} /></div>
    </>
  );

  /* ══ 1 · Wähl deinen Einsatz ══ */
  if (schritt === 1) {
    return (
      <>
        {kopf}
        {szenen.length === 0 ? (
          <div className="mt-5">
            <Kasten>
              <p className="text-[14px] font-bold text-white/85">
                {T.keineSzenen} <span className="text-[#f6cf51]">public/Armee/szenen/</span> —
                der Dateiname wird zur Beschriftung, daneben gehört das gleichnamige <span className="text-[#f6cf51]">.jpg</span>.
              </p>
            </Kasten>
          </div>
        ) : (
          <>
            {/* KEIN ZWEITES „WÄHL DEINEN EINSATZ" — es steht seit dem 02.09.2026 in der H1
                darüber (Owner: „das raus"). Zweimal dieselbe Aufforderung untereinander
                kostet eine Zeile und liest sich wie ein Fehler. */}
            <div className="mt-5">
              {/* Grosse Wisch-Vorlagen mit dem Dankestext im Bild, dem Beruf darunter und
                  Lupe — man sieht, WAS man wählt, nicht eine Briefmarke davon. Beide
                  Zustände tragen denselben Ring, es wechselt nur die Farbe. */}
              {/**
                * DOCH EINE LUPE — ABER DIE FLACHE (Owner 02.09.2026 zuerst: „in der
                * vergrösserten version nicht und da bauen wir die karte nicht", Owner
                * 04.09.2026 dann: „ein vergrösserungs icon").
                *
                * Der Einwand vom 02.09. galt der KARTEN-Überlagerung: `vergroessern` baut bei
                * einer Kachel MIT `video` die Einladungskarte nach (Ornamente, Titel
                * „Hochzeitseinladung" …) — für eine Anzeigen-Szene falsch. Diese Kacheln
                * bekommen aber weiterhin KEIN `video` in `bilder` (siehe unten); `vergroessern`
                * öffnet für Kacheln OHNE `video` die schlichte `BlattUeberlagerung` — ein Bild
                * auf voller Breite, keine Karte. Genau die Lücke, die der Einwand offen liess.
                *
                * DIESELBEN BESCHRIFTETEN DATEIEN WIE ÜBERALL SONST (Owner 04.09.2026: „Das
                * ist doch ein und das selbe Modul" — zur Bewerbergalerie der Recruiterseite,
                * dann wortgleich hier eingefordert: „Und die Schrift hast du hier nicht
                * eingefügt und in dem full modus auch nicht", zuletzt: „im template voll
                * modus soll starten"). `s.anzeigenBild`/`s.anzeigenVideo` sind dieselben
                * Dateien wie in `public/Armee/anzeigen/` — Dankestext und Musik bereits
                * eingebrannt. `nameImBild` ist deshalb weg — die Kachel zeigt den Beruf wieder
                * als Zeile darunter (sonst wüsste ein Bewerber vor der Wahl nicht, wofür
                * „Danke Julia" steht), während das Foto selbst den eingebrannten Text trägt.
                *
                * `keineKarte`: Ohne diese Prop würde ein vorhandenes `video` automatisch die
                * nachgebaute Einladungskarte im Vollbild öffnen (`VorlagenUeberlagerung`) —
                * genau das, was der Owner am 02.09. für die Academy ablehnte. Mit `keineKarte`
                * bleibt das Vollbild das schlichte Blatt, bekommt aber jetzt den Clip
                * mitgegeben und spielt ihn sofort mit Ton (Tipp auf die Lupe zählt als die
                * Nutzer-Geste, die der Browser dafür verlangt).
                *
                * `kompakt` (Owner 04.09.2026: „weil die Templates zu gross sind"): eine um
                * ein Fünftel kleinere Ausführung von `gross` — mehr Luft zwischen Kachel und
                * Wisch-Rand, damit dem Ring nirgends die Höhe knapp wird.
                */}
              <BildWahl gross kompakt sprache="de" vergroessern keineKarte ansehenLabel={T.zurueck}
                bilder={szenen.map(s => ({ id: s.id, name: s.name, bild: s.anzeigenBild, poster: s.anzeigenBild, video: s.anzeigenVideo }))}
                wert={szeneId} waehle={setSzeneId} />
            </div>
            {/* DER ZURÜCK-CHIP AUCH HIER (Owner 02.09.2026: „back button"). Jeder andere
                Schritt trägt ihn links vom goldenen Knopf; auf dem ersten fehlte er, weil
                es dahinter keinen Schritt mehr gibt — wohl aber die Landingpage. Ein
                Trichter, dessen Rückweg auf halber Strecke verschwindet, fühlt sich an wie
                eine Falle, und der Pfeil in der Kopfzeile ist zu weit vom Daumen weg. */}
            <div className="mt-5 flex items-center gap-2">
              <a href={K.zurueckHref} aria-label={T.zurueck}
                className="lb-chip grid h-12 w-12 shrink-0 place-items-center rounded-full transition active:scale-95">
                <ChevronLeft className="h-5 w-5" />
              </a>
              <Knopf art="gold" onClick={() => setSchritt(2)}>{T.weiter}</Knopf>
            </div>
          </>
        )}
        {/* UNTER DEM KNOPF, NICHT ÜBER DER GALERIE (Owner 04.09.2026: „den Text unter dem
            Button" — der lange Hinweis stand bisher zwischen Kopfzeile und Kachel-Wahl und
            nahm dort die erste Bildschirmseite ein, bevor der Besucher überhaupt ein Foto
            sah. Kleingedrucktes gehört ans Ende der Handlung, nicht davor. */}
        {hinweis && (
          <p className="mt-4 text-[12.5px] font-bold leading-snug text-white/50">
            <span className="text-white/70">{hinweis.titel}.</span> {hinweis.text}
          </p>
        )}
      </>
    );
  }

  /* ══ 2 · Dein Foto ══ */
  if (schritt === 2) {
    return (
      <>
        {kopf}
        {/* KEIN „DEIN VIDEO" DARÜBER (Owner 02.09.2026: „was ist das."). Hier stehen ein Foto
            und eine Vorlage nebeneinander — kein Video, das gäbe es erst nach der Erzeugung.
            Die Beschriftung war ein Rest aus dem Geburtstags-Trichter; „DEIN BILD" und „DEIN
            EINSATZ" unter den Kacheln sagen schon, was jede Seite zeigt. */}
        <div className="mt-5">
          <TunnelKacheln
            zurueckLabel={T.zurueck}
            aufZurueck={() => setSchritt(1)}
            links={
              <TunnelKachelUpload
                foto={foto} titel={T.fotoKachel} hinweis={T.fotoHinweis}
                onWaehlen={() => setKameraOffen(true)}
                onLoeschen={foto ? () => setFoto("") : undefined}
              />
            }
            ziel={szene ? (
              /**
               * DIE VORLAGE LÄSST SICH WEGNEHMEN WIE DAS FOTO (Owner 02.09.2026: „mach ein
               * löschen auch bei template dann springt es zurück zur auswahl").
               *
               * Links steht ein Löschknopf, rechts stand keiner — dabei ist die Vorlage
               * genauso eine Entscheidung, die man zurücknehmen will. Ein Tipp bringt
               * zurück zur Auswahl; das ist kein Löschen von Daten, sondern ein Zurück,
               * deshalb reicht ein Tipp (die Zwei-Tipp-Regel gilt für echtes Löschen).
               *
               * Ohne `videoUrl` bleibt die Kachel ein reines Bild: kein Tipp, kein Overlay.
               */
              <div className="relative">
                <VorlagenKachel bildUrl={szene.bild} beschriftung={szene.name} sprache="de" />
                <div className="absolute -right-2 -top-2 z-20">
                  <Scheibe label={T.einsatzAendern} onClick={() => setSchritt(1)}>
                    <RotateCcw className="h-4 w-4" />
                  </Scheibe>
                </div>
              </div>
            ) : null}
            linksLabel={T.linksLabel}
            zielLabel={T.zielLabel}
            /* `zusatz` ist der Platz für produktspezifische Angaben UNTER den Kacheln —
               nie ein eigener Schritt (KONZEPT-TUNNEL.md). */
            zusatz={
              <div className="mt-4">
                {/* Der zweite Weg steht klein darunter, nicht als gleichwertiger Knopf:
                    Die Kamera ist der gemeinte Weg, die Dateiwahl der Ausweg. */}
                <button type="button" onClick={() => fotoRef.current?.click()}
                  className="mx-auto block text-[12.5px] font-bold text-white/60 underline underline-offset-2">
                  {T.fotoWaehlen}
                </button>
              </div>
            }
            knopf={{
              text: T.generieren,
              /* KEIN VORNAME MEHR ALS VORAUSSETZUNG (Owner 04.09.2026: „auch dieses Feld
                 raus" — im selben Atemzug wie das Entfernen der Namen aus der Anzeigen-
                 Galerie: „das finde ich heikel für die suchmaschinen"). Das Feld „Dein
                 Vorname" fragte nach dem echten Namen des Bewerbers, bevor überhaupt Adresse
                 oder Einwilligung feststehen — weniger persönliche Daten zu sammeln, als
                 nötig sind, ist hier die richtige Richtung, nicht nur bei den fiktiven
                 Anzeigen-Namen. */
              disabled: !foto || !szene,
              /* Direkt in die Erzeugung — die Adresse kommt hinter dem Video (siehe oben). */
              onClick: () => {
                setFehler(""); setGenFehler(""); setFortschritt(0); setPhase("bild"); setSchritt(3);
              },
            }}
            einwilligung={
              /* EIGENE SCHRIFT FÜR DIE GANZE ZUSAGE, NICHT NUR DIE NEUE ZEILE (Owner
                 04.09.2026: erst „das muss doch die gleiche schrift sein wie eine seite
                 davor" für die dritte Zeile allein, dann am Bildschirmfoto der ersten
                 beiden: „das auch anpassen"). `TunnelKacheln` gibt seinem `einwilligung`
                 fest `font-serif text-[11px] text-center text-white/70` vor (geteilt mit
                 `KissFunnel`); alle drei Zeilen hier überschreiben das jetzt gemeinsam auf
                 sich selbst, damit sie wie der Hinweis auf Schritt 1 aussehen: serifenlos,
                 12,5 px, fett, linksbündig. Andere Aufrufer von `TunnelKacheln` bleiben
                 unberührt — die Überschreibung sitzt am Inhalt, nicht am Baustein. */
              <span className="block text-left font-sans text-[12.5px] font-bold not-italic leading-snug text-white/50">
                {T.einwilligungEins}
                {" "}<span className="block">{T.einwilligungZwei}</span>
                <span className="mt-2 block">{T.einwilligungDrei}</span>
              </span>
            }
          />
        </div>

        {/**
          * ZWEI WEGE ZUM FOTO (Owner 02.09.2026: „Sollen wir lieber kamera starten und ein
          * selfie hochladen?" · „die leute haben meistens kein richtiges bild dafür").
          *
          * Der erste ist die Kamera (siehe `kameraAn` oben, per `getUserMedia` — das
          * funktioniert am Handy UND am Rechner). Der zweite ist dieses Feld hier: für alle,
          * die ein gutes Porträt parat haben oder deren Browser die Kamera verweigert.
          *
          * HIER STAND EIN ZWEITES FELD MIT `capture="user"` und musste weichen: Das Attribut
          * ist nur eine Bitte an mobile Browser; am Rechner wird es ignoriert und öffnet den
          * Dateidialog — genau das, was nach „Kamera" nicht passieren darf.
          */}
        <input ref={fotoRef} type="file" accept="image/*,.heic,.heif" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) setCropDatei(f); e.target.value = ""; }} />

        {/* Die Kamera des Hauses: Vollbild, Hochformat, Kreis fürs Gesicht, Zoom. Was sie
            liefert, geht denselben Weg wie ein gewähltes Foto — durch den Zuschnitt. */}
        {kameraOffen && (
          <SelbstAufnahme
            nurFoto
            texte={{
              titel: T.fotoKachel, hinweis: T.fotoHinweis, los: T.ausloesen, stopp: "",
              nochmal: T.kameraNochmal, uebernehmen: T.uebernehmen,
              keineKamera: T.kameraFehler, schliessen: T.abbrechen, naeher: T.naeher,
            }}
            aufFertig={datei => { setKameraOffen(false); setCropDatei(datei); }}
            aufAbbruch={() => setKameraOffen(false)}
          />
        )}

        {/* Zuschnitt zwischen Auswählen und Übernehmen — Pflicht bei jedem Upload im Haus. */}
        {cropDatei && (
          <ImageCropper file={cropDatei} aspect={3 / 4} sprache="de" title={T.cropTitel}
            onCancel={() => setCropDatei(null)}
            onSave={(zugeschnitten: File) => {
              setCropDatei(null);
              const r = new FileReader();
              r.onload = () => setFoto(String(r.result ?? ""));
              r.readAsDataURL(zugeschnitten);
            }} />
        )}
      </>
    );
  }

  /* DER E-MAIL-SCHRITT IST WEG (Owner 02.09.2026: „also E-Mail nach hinten"). Er stand hier
     als eigene Station zwischen Foto und Erzeugung; Adresse und Haken fragt jetzt das
     Formular unter dem fertigen Video — die Begründung steht oben bei `type Schritt`. */

  /* ══ 3 · Die Erzeugung läuft — wirklich ══ */
  if (schritt === 3) {
    return (
      <>
        {kopf}
        <div className="mt-6">
          {genFehler ? (
            /**
             * EIN SICHTBARER AUSWEG, IMMER (Memory `immer-close-einbauen`). Ein Lauf kann
             * scheitern — die Bildprüfung greift, das Guthaben ist leer, Pixverse hängt.
             * Ohne diesen Zweig liefe der Balken bis zum Seitenwechsel weiter, und der
             * Besucher wüsste nie, dass nichts mehr kommt.
             */
            <Kasten polster="p-5">
              <p className="text-[17px] font-black text-white">{T.genFehlerTitel}</p>
              <div className="mt-2"><Fehlerzeile>{genFehler}</Fehlerzeile></div>
              <div className="mt-4 flex items-center gap-2">
                <button type="button" onClick={() => { setGenFehler(""); setSchritt(2); }}
                  aria-label={T.zurueck}
                  className="lb-chip grid h-12 w-12 shrink-0 place-items-center rounded-full transition active:scale-95">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <Knopf art="gold" onClick={() => {
                  setGenFehler(""); setFortschritt(0); setPhase("bild");
                  /* Über Schritt 2 zurück, damit der Effekt neu anläuft — ein `setSchritt(3)`
                     auf denselben Wert löst ihn gar nicht erst aus. Der Besucher tippt dort
                     nur noch einmal auf „Mein Video generieren". */
                  setSchritt(2);
                }}>{T.genNochmal}</Knopf>
              </div>
            </Kasten>
          ) : (
            /**
             * DER RADAR-SCAN ÜBER SEINEM FOTO (Owner 02.09.2026: „hier hatten wir doch ein
             * Scanner-Loading" · „das machst du ins Bild, nicht drunter").
             *
             * Zuerst stand hier nur ein Balken in einem Kasten. Bei zwei bis drei Minuten ist
             * das zu wenig: Ein Balken kann überall stehen, der Scan zeigt SEIN Bild — er
             * sieht, dass an seinem Gesicht gearbeitet wird, nicht an irgendetwas.
             *
             * Wort, Zahl und Balken liegen AUF dem Scan. Darunter stand ein zweiter Kasten,
             * der dasselbe noch einmal sagte, und der Blick sprang zwischen beiden hin und
             * her. Der Baustein liegt in der Bibliothek (`ScanLaden`), statt zum vierten Mal
             * von Hand abgeschrieben zu werden.
             *
             * KEIN KASTEN DRUMHERUM: Der Scan IST die Fläche; ein Rahmen darum wäre ein
             * zweiter Rand um ein Bild, das schon einen hat.
             */
            <>
              <ScanLaden foto={foto} verhaeltnis="aspect-[2/3]" className="mb-3"
                prozent={fortschritt}
                text={phase === "bild" ? `${T.genPhaseEins} „${szene?.name}“` : T.genPhaseZwei} />
              <Fine className="text-center">{T.genDauerEcht}</Fine>
            </>
          )}
        </div>
      </>
    );
  }

  /* ══ 4 · Das Ergebnis, darunter die Frage ══ */
  if (schritt === 4) {
    return (
      <>
        {/**
          * OHNE ÜBERSCHRIFT (Owner 02.09.2026: „That's you oben raus").
          *
          * „Das bist du." stand über dem Video — und sagte damit dasselbe wie das Video
          * selbst, nur schwächer. Der Satz, der hierher gehört, steht seit heute IM Bild
          * („Danke {name} für deinen Einsatz"), und er ist der bessere: Er spricht ihn an,
          * statt zu erklären, was er gerade sieht. Zwei Aussagen übereinander nehmen sich
          * gegenseitig die Wirkung, und die obere kostet dazu die Höhe, die das Video haben
          * will.
          */}

        {beispielKarte}

        {/**
          * TEILEN ODER LÖSCHEN — SEINE ENTSCHEIDUNG (Owner 04.09.2026: „am ende kann er es
          * sharen oder löschen, das bleibt ihm überlassen").
          *
          * Der Teilen-Knopf sitzt als Scheibe AUF der Karte (Karten-Pflicht, Skill `card`);
          * Löschen gehört bewusst NICHT dorthin: Vier Scheiben nebeneinander, von denen eine
          * unwiederbringlich ist, ist eine Falle für den Daumen. Deshalb steht es als
          * schmale Zeile UNTER der Karte — erreichbar, aber nicht im Weg.
          *
          * Nur bei einem ECHTEN Ergebnis: Ohne `auftragId` zeigt die Karte die Vorlage, und
          * an einer Vorlage gibt es nichts zu löschen.
          */}
        {geloescht ? (
          <p className="mt-4 text-center text-[13px] font-bold leading-snug text-white/70">{T.geloescht}</p>
        ) : ergebnisVideo && auftragId ? (
          <div className="mt-4 text-center">
            <button type="button" onClick={loeschen} disabled={loescht}
              className={`mx-auto block max-w-[420px] px-4 text-[12.5px] font-bold leading-snug underline underline-offset-2 transition ${
                loeschFrage ? "text-[#ff6b6b]" : "text-white/45 hover:text-white/70"}`}>
              {loescht ? T.loeschenLaeuft : loeschFrage ? T.loeschenSicher : T.loeschen}
            </button>
            {loeschFehler && <p className="mt-2 text-[12.5px] font-bold text-[#ff6b6b]">{loeschFehler}</p>}
          </div>
        ) : null}

        {/* DIE FRAGE KOMMT NACH DEM GESCHENK. Wer gerade etwas bekommen hat, gibt eher
            etwas zurück — deshalb steht das Formular hier und nicht am Anfang. */}
        <div className="mt-8 scroll-mt-4" ref={formularRef}>
          <Kasten polster="p-5">
            <p className="text-[19px] font-black leading-snug text-white">{T.frageTitel}</p>
            <Fine>{T.frageZeile}</Fine>

            <div className="mt-4 flex flex-col gap-3">
              {/* Der Vorname steht schon; hier fehlt nur noch der Nachname. */}
              <Eingabe placeholder={T.feldName} value={name} onChange={e => setName(e.target.value)} />
              <label className="block">
                <span className="mb-1.5 block text-[12.5px] font-bold text-white/75">{T.feldGeburt}</span>
                <Eingabe type="date" value={geburt} onChange={e => setGeburt(e.target.value)} />
              </label>
              {/* HIER STEHT DIE ADRESSE (Owner 02.09.2026: „also E-Mail nach hinten") — nach
                  dem Video, nicht davor. Der goldene Knopf auf dem Video führt genau hierher. */}
              <Eingabe type="email" inputMode="email" placeholder={T.feldMail}
                value={mail} onChange={e => { setMail(e.target.value); setFehler(""); }} />

              <Haken an={einwilligung} setzen={setEinwilligung} pflicht>
                {T.haken}{" "}
                {/* Der Link muss den Tipp auf den Haken durchlassen, sonst schaltet er ihn
                    beim Öffnen der AGB gleich mit um. */}
                <a href="/terms" target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="font-black text-[#f6cf51] underline underline-offset-2">{T.hakenAgb}</a>{T.hakenEnde}
              </Haken>

              {fehler && <Fehlerzeile>{fehler}</Fehlerzeile>}

              <Knopf art="gold" disabled={sendet} onClick={absenden}>
                {sendet ? T.sendet : T.absenden}
              </Knopf>
              <Fine>{T.datenschutz}</Fine>
            </div>
          </Kasten>
        </div>
      </>
    );
  }

  /* ══ 5 · Danke ══ */
  return (
    <>
      <H1>{T.dankeTitelEins} <Y>{T.dankeTitelZwei}</Y>.</H1>
      <Lead>
        {T.dankeText}
      </Lead>
      <div className="mt-6">
        <Knopf art="umriss" onClick={() => {
          setSchritt(1); setFoto(""); setName(""); setGeburt(""); setMail(""); setEinwilligung(false);
          /* Auch das Ergebnis — sonst stünde beim zweiten Einsatz das Video des ersten. */
          setAuftragId(""); setErgebnisVideo(""); setErgebnisPoster(""); setGenFehler(""); setFortschritt(0);
        }}>{T.nochmal}</Knopf>
      </div>
    </>
  );
}
