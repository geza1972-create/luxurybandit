"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertCircle, BarChart3, Check, Lock, Maximize2 } from "lucide-react";
import { Knopf, Fehlerzeile, Fortschritt, BildWahl, BlattUeberlagerung, Scheibe, EingabeMehrzeilig } from "@/components/CI";
import { PDF_VORLAGEN, vorlagenBild } from "@/lib/pdf-vorlagen";
import { fotoAlsDataUrl } from "@/lib/foto-verkleinern";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";
import UploadKachel from "@/components/UploadKachel";
import CropModal from "@/components/CropModal";
import { kasseOeffnen, kassenFenster } from "@/lib/browser-erkennen";
import { useKasseImFenster } from "@/components/KasseImFenster";
import { logFunnelEvent, logTunnelEvent } from "@/lib/track-funnel";
import DavidVideoKauf from "@/components/DavidVideoKauf";
import EinladungAnsicht from "@/components/EinladungAnsicht";
import { KARTE_TEXTE } from "@/components/EinladungKarte";
import { BEWERBUNG_VIDEO, BEWERBUNG_VIDEO_POSTER } from "@/lib/david-video";
import { LEBENSLAUF_BEISPIEL_VIDEO, LEBENSLAUF_BEISPIEL_POSTER } from "@/lib/lebenslauf-vorlage";
import type { DavidTunnelTexte } from "@/lib/david-tunnel-texte";

/**
 * DIE BEZAHLTEN SCHRITTE — UNTEN AM ERGEBNIS, NICHT AUF EINEM EIGENEN SCHIRM.
 *
 * Owner 28.08.2026: „ich dachte wir machen das auf der ergebnis seite relativ einfach. Oder
 * wie kommt man hier drauf?" — vorher lagen die Angebote hinter einem Knopf auf einer
 * eigenen Ansicht. Wer gerade gelesen hat, was seiner Bewerbung fehlt, will es im selben
 * Zug beheben; ein Klick dazwischen ist genau der Bruch, an dem Leute aussteigen.
 *
 * ZWEI ORTE, EIN BAUSTEIN: der Trichter direkt nach dem Gespräch UND die Ergebnis-Seite
 * `/david/<id>`, wenn er sie später aus seinen Assets öffnet. Ohne diesen Baustein gäbe es
 * den Kaufweg zweimal — und beim ersten Preisschritt liefen die Fassungen auseinander.
 *
 * DER KAUF IST DER DES HAUSES: erzeugen → Kasse IM FENSTER (`useKasseImFenster`,
 * Memory `kasse-in-der-seite`) → nach der Zahlung optimieren → PDF. Kein neuer Kaufweg,
 * kein zweiter Preis: der kommt fertig formatiert aus `lib/pricing` herein.
 */
export default function DavidAngebote({
  S, preisUnterlagen, preisVideo, genId, email, cvPath, cvName, anzeige, lang,
  beispielCv, vorname, onWeiter, weiterLabel,
}: {
  S: DavidTunnelTexte;
  preisUnterlagen: string;
  /**
   * DER PREIS DER VIDEO-BEWERBUNG (Owner 28.08.2026: „und der Preis? Das ist sogar teurer
   * als die Bewerbung in der Erstellung") — er gehört IN den Knopf, wie überall im Haus
   * (Hausregel „Preis im Knopf", 10.08.2026), und er kommt fertig formatiert aus
   * `lib/pricing` herein. Er ist höher als der der Unterlagen, weil ein Video in der
   * Erzeugung mehr kostet als ein Textlauf.
   */
  preisVideo: string;
  /** Kennung des Auftrags — dieselbe wie die der David-Sitzung. */
  genId: string;
  email: string;
  cvPath: string;
  cvName: string;
  /** Der Text der Stellenanzeige — der Generator braucht ihn, der Nutzer soll ihn nicht
      noch einmal einfügen (Owner §24). */
  anzeige: string;
  lang: string;
  beispielCv?: ReactNode;
  vorname?: string;
  /** Nur im Trichter gesetzt: weiter zur Feedback-Frage. Auf der Ergebnis-Seite fehlt er. */
  onWeiter?: () => void;
  weiterLabel?: string;
}) {
  /* Die Wörter der Ton-Scheibe kommen aus derselben Tabelle wie in jeder Karte des
     Hauses — der Baustein ist hier nur ohne Karte im Einsatz. */
  const K = KARTE_TEXTE[lang] ?? KARTE_TEXTE.en;
  const [busy, setBusy] = useState(false);
  const [busyText, setBusyText] = useState("");
  const [fehler, setFehler] = useState("");
  const [fertig, setFertig] = useState(false);
  /* DIE GEWÄHLTE VORLAGE — sie geht beim Erzeugen an den Generator (er schreibt sie ans
     Profil) UND an die PDF-Adresse. Beides, weil die fertige PDF auch später aus den Assets
     geholt wird, wenn dieser Zustand längst weg ist. */
  const [vorlage, setVorlage] = useState(PDF_VORLAGEN[0].id);
  /**
   * DAS BEWERBUNGSFOTO — GEFRAGT, NICHT GERATEN (Owner 28.08.2026: „Ich tendiere dazu eher
   * nach dem Bild zu fragen").
   *
   * Bis hierher schickte David dem Generator gar kein Foto — und JEDE der sechs Vorlagen hat
   * einen prominenten Platz dafür: die runde Scheibe, das randlose Bild in der Spalte, das
   * ganze Deckblatt. Ohne Foto wären das sechs Layouts mit einem Loch an der auffälligsten
   * Stelle. Der Generator nimmt es längst entgegen (`body.foto`, als Data-URL); es wurde nur
   * nie gefragt.
   *
   * FREIWILLIG: In manchen Ländern und Branchen ist ein Foto in der Bewerbung unerwünscht.
   * Der Kauf läuft auch ohne — die Vorlage zeigt die Stelle dann einfach nicht.
   */
  const [foto, setFoto] = useState("");

  /**
   * WAS ER HIER ZUSAMMENSTELLT, ÜBERLEBT DAS SCHLIESSEN DES FENSTERS.
   *
   * Owner 28.08.2026, aus dem echten Gebrauch: „ich habe ein template geöffnet und aus
   * Versehen statt das template zu schliessen habe ich das ganze Browser-Fenster
   * geschlossen. Beim Ergebnis lesen war alles weg."
   *
   * Der Bericht selbst lag serverseitig und war wieder da — seine ARBEIT nicht: gewählte
   * Vorlage und hochgeladenes Foto standen nur im Arbeitsspeicher von React. Ein
   * geschlossener Tab, ein Absturz, ein Anruf, der das Handy in den Hintergrund schiebt und
   * die Seite verwerfen lässt: jedes Mal von vorn. Und weil das Foto zugeschnitten wurde,
   * ist „von vorn" nicht ein Klick, sondern Datei suchen, zuschneiden, bestätigen.
   *
   * JE SITZUNG GETRENNT (`genId` im Schlüssel): Wer zwei Bewerbungen laufen hat, soll nicht
   * das Foto der einen in der anderen finden.
   *
   * STILL SCHEITERN: Der Speicher kann voll sein (das Foto ist eine Data-URL) oder im
   * privaten Fenster ganz fehlen. Dann ist es wie vorher — ärgerlich, aber nichts geht
   * kaputt. Deshalb steht um jeden Zugriff ein try/catch und nie eine Fehlermeldung.
   */
  const merkSchluessel = genId ? `lb_david_wahl_${genId}` : "";
  const [geladen, setGeladen] = useState(false);
  useEffect(() => {
    if (!merkSchluessel) { setGeladen(true); return; }
    try {
      const roh = localStorage.getItem(merkSchluessel);
      if (roh) {
        const d = JSON.parse(roh) as { vorlage?: string; foto?: string };
        if (d.vorlage && PDF_VORLAGEN.some(v => v.id === d.vorlage)) setVorlage(d.vorlage);
        if (d.foto?.startsWith("data:")) setFoto(d.foto);
      }
    } catch { /* kein Speicher, kein Drama */ }
    setGeladen(true);
  }, [merkSchluessel]);
  useEffect(() => {
    /* Erst schreiben, wenn gelesen wurde — sonst überschreibt der Anfangszustand das
       Gemerkte, bevor es überhaupt ankommt. */
    if (!geladen || !merkSchluessel) return;
    try { localStorage.setItem(merkSchluessel, JSON.stringify({ vorlage, foto })); }
    catch { /* Speicher voll: dann eben nur diese Sitzung lang */ }
  }, [geladen, merkSchluessel, vorlage, foto]);
  /**
   * DAS BILD IM ZUSCHNEIDER (Owner 28.08.2026: „beim upload immer cropfunktion").
   *
   * Das ist eine Dauerregel des Hauses [[upload-ui-rules]], und sie war hier verletzt: Das
   * Foto ging ungeschnitten an den Generator. Bei DIESEM Produkt wiegt das schwerer als
   * anderswo — alle fünf Vorlagen legen das Bild mit „cover" in ein 3:4-Feld. Wer ein
   * Querformat vom Handy hochlädt, verliert links und rechts alles, und niemand hat ihm
   * vorher gezeigt, was übrig bleibt.
   *
   * FESTES 3:4, kein freier Zuschnitt: Der Bewerber soll nicht die Form wählen dürfen, die
   * das Layout hinterher ohnehin erzwingt — er soll den AUSSCHNITT wählen. Genau darum geht
   * es bei einem Bewerbungsfoto.
   */
  const [zuschnitt, setZuschnitt] = useState("");
  /* Die gewählte Vorlage im Vollbild — die Lupe sitzt auf DIESER Kachel, nicht auf den
     briefmarkengrossen im Wähler darunter (Owner 28.08.2026). */
  const [vorlageGross, setVorlageGross] = useState(false);
  /**
   * DIE RÜCKFRAGE, WENN DAS FOTO FEHLT (Owner 28.08.2026, nach einem echten Kauf: „ich habe
   * vergessen ein Bild hochzuladen und habe erst später gemerkt").
   *
   * KEIN DIALOG (Hausregel [[keine-overlay-dialoge]]): Die Frage ersetzt den Kaufknopf an
   * Ort und Stelle — dieselbe Mechanik wie beim Löschen mit zwei Tipps. Ein Fenster, das
   * sich über den Kauf legt, ist genau die Bauart, die hier immer wieder schiefging.
   *
   * NUR EINE RÜCKFRAGE, KEINE SPERRE: Ohne Foto lässt sich die Bewerbung sehr wohl bauen —
   * in manchen Ländern ist ein Foto sogar unerwünscht. Er soll es nur WISSEN, bevor er
   * zahlt, statt es hinterher zu merken.
   */
  const [fotoFrage, setFotoFrage] = useState(false);
  /**
   * DIE STELLE WIRD BEIM KAUF NACHGEFRAGT (Owner 29.08.2026, Weg „A": „der Gratis-Bericht
   * ohne Stelle ist trotzdem wertvoll — er ist der Köder — aber das Bezahlte bleibt der
   * Zuschnitt").
   *
   * Wer ohne Ziel durch das Screening gegangen ist, hat einen Bericht, aber nichts, worauf
   * sich ein Lebenslauf zuschneiden liesse. Ihm hier ein Produkt zu verkaufen, das seinen
   * Kern nicht liefern kann, wäre der Anfang der Erstattungen. Also fragt das Angebot die
   * Anzeige nach — und das ist der beste Moment dafür: Er hat gerade gelesen, was ihm fehlt,
   * und ist motiviert.
   */
  const [nachAnzeige, setNachAnzeige] = useState("");
  const anzeigeFertig = (anzeige || nachAnzeige).trim();
  const fotoFeld = useRef<HTMLInputElement>(null);
  const kasse = useKasseImFenster(fertig ? "fertig" : "offen");

  const geraet = () => { try { return localStorage.getItem("lb_visitor") ?? ""; } catch { return ""; } };
  /** `?code=…` aus der Adresse — nur weiterreichen, nie selbst bewerten. */
  const aktionsCode = (): string => {
    try { return new URLSearchParams(window.location.search).get("code")?.trim() ?? ""; } catch { return ""; }
  };
  /**
   * DER ADMIN-DURCHLAUF (Owner 28.08.2026: „also ich muss es testen können ich zahle doch
   * mit admin code").
   *
   * Derselbe Schlüssel wie in jedem anderen Admin-Werkzeug des Hauses
   * (`luxurybandit-try-look-admin-pin` im Speicher des Browsers, als Kopfzeile
   * `x-try-look-admin-pin` an den Server). Steht er, überspringt der Kaufknopf die Kasse und
   * geht direkt zur Optimierung — der Server prüft dieselbe Nummer noch einmal, der Browser
   * allein entscheidet das nicht.
   *
   * WICHTIG FÜRS TESTEN: Übersprungen wird die KASSE, nicht die Erzeugung. Der Lauf bei
   * OpenAI passiert und kostet — das ist ja gerade der Teil, den man prüfen will.
   */
  const adminPin = () => { try { return localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { return ""; } };
  /**
   * DIE ANMELDUNG MUSS MITREISEN (Owner 28.08.2026, zweimal in Folge: „das ist blöd, ich bin
   * doch angemeldet" · „bin doch eingeloggt" — beide Male über dem Kaufknopf).
   *
   * Ich hatte serverseitig „Konto schlägt Gerät" eingebaut und geglaubt, damit sei es
   * erledigt. Es war es nicht: Diese Seite schickte gar keinen Ausweis mit. `getSellerFromRequest`
   * liest den `Authorization`-Kopf — steht dort nichts, sieht der Server einen Anonymen, und
   * die Konto-Prüfung läuft ins Leere, egal wie gut sie geschrieben ist.
   *
   * Dieselbe Zeile wie in der Galerie (`my-gallery`), die es seit dem 10.08.2026 richtig
   * macht: „Der User meldet sich doch an. Basta."
   */
  const anmeldeKopf = (): Record<string, string> => {
    try {
      const tok = getStoredAuthSession()?.access_token ?? "";
      return tok ? { Authorization: `Bearer ${tok}` } : {};
    } catch { return {}; }
  };
  const kopfzeilen = (): Record<string, string> => ({ "Content-Type": "application/json", ...anmeldeKopf(), ...adminKopf() });
  const adminKopf = (): Record<string, string> => { const p = adminPin(); return p ? { "x-try-look-admin-pin": p } : {}; };
  const pdfUrl = genId
    /* OHNE `device` — der Besitz-Keks weist ihn aus, nicht ein Schlüssel in der Adresse
       (28.08.2026). Er wird beim Kauf gesetzt (`/api/david-besitz`), also steht er hier. */
    ? `/api/bewerbung-pdf?id=${encodeURIComponent(genId)}&vorlage=${encodeURIComponent(vorlage)}`
    : "";

  /**
   * DIE RÜCKKEHR VON STRIPE — OHNE SIE BLEIBT DER KUNDE MIT SEINEM GELD ALLEIN.
   *
   * Owner 28.08.2026, nach einer ECHTEN Zahlung: „habe bezahlt, kam aber kein Hinweis dass
   * da was geht. Ich bin hoch und runtergescrollt und zum Glück habe ich den pulsierenden
   * Punkt bei Assets gesehen."
   *
   * WAS FEHLTE: Die eingebettete Kasse übernimmt das Fenster; `kaufen()` gibt daraufhin ab
   * (`if (kasse.uebernehmen(...)) return`) und läuft NICHT weiter. Nach der Zahlung schickt
   * Stripe die Seite selbst neu auf `?paid=1&cs=…` — und genau dort war niemand. Der React-
   * Zustand war beim Neuladen weg, der Kaufknopf stand wieder da, als wäre nichts gewesen.
   * Die Optimierung, die er gerade bezahlt hatte, lief nie an.
   *
   * Jeder andere Trichter im Haus hat diesen Fänger (`KissFunnel`, `LebenslaufStartClient`,
   * `TryFunnelClient`, `/chat/[id]`, `/curator/[id]`) — David war der einzige ohne. Das
   * Muster ist von dort übernommen, Zeile für Zeile:
   *   1. `paid=1` in der Adresse heisst „gerade zurückgekommen"
   *   2. Der Server, nicht der Browser, sagt ob bezahlt wurde (`/api/checkout-status`)
   *   3. Die Adresse wird sofort gesäubert — ein Neuladen darf nicht zweimal auslösen
   *   4. Erst dann die Optimierung, mit sichtbarem Balken
   *
   * `rueckkehrRef` gegen den doppelten Lauf: React ruft Effekte im Entwicklungsmodus zweimal
   * auf, und zwei Optimierungen auf einem Auftrag wären zwei KI-Läufe für ein Geld.
   */
  const rueckkehrRef = useRef(false);
  useEffect(() => {
    if (rueckkehrRef.current || !genId) return;
    const q = new URLSearchParams(window.location.search);
    /* ZWEI WEGE HIERHER: die Rückkehr von Stripe (`paid=1&cs=…`) und der Nachhol-Knopf aus
       der Galerie (`nachholen=1`). Beide enden in derselben Kette; der Unterschied ist nur,
       ob die Zahlung noch bestätigt werden muss oder längst im Auftrag steht. */
    const nachholen = q.get("nachholen") === "1";
    if (!nachholen && q.get("paid") !== "1") return;
    /* NICHT DIE RÜCKKEHR DES VIDEOS ABFANGEN (29.08.2026): Auf derselben Seite steht auch der
       Video-Kauf. Kommt der zurück, trägt seine Adresse `was=video` — dann gehört die
       Rückkehr ihm, und ohne diese Zeile hätten BEIDE zugegriffen: Der Käufer hätte das Video
       bezahlt und zusätzlich die Erzeugung der Unterlagen ausgelöst. */
    if (q.get("was") === "video") return;
    const cs = q.get("cs") ?? "";
    if (!nachholen && (!cs || cs.startsWith("{"))) return;
    rueckkehrRef.current = true;
    setBusy(true); setBusyText(S.unterlagenOptimiert);
    void (async () => {
      /* Beim Nachholen ist die Zahlung längst gebucht — der Server prüft sie ohnehin noch
         einmal, wenn `optimieren` läuft. Nur die frische Rückkehr braucht die Bestätigung. */
      const st = nachholen ? { paid: true } : await fetch(`/api/checkout-status?session_id=${encodeURIComponent(cs)}`).then(r => r.json()).catch(() => null);
      q.delete("paid"); q.delete("cs"); q.delete("nachholen");
      const rest = q.toString();
      window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));
      if (!st?.paid) { setBusy(false); setBusyText(""); setFehler(S.reportFehler); return; }
      await nachZahlung();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genId]);

  /**
   * ALLES, WAS GELD KOSTET, PASSIERT NACH DER ZAHLUNG (Owner 28.08.2026: „ich verstehe eins
   * nicht, startet die Generierung vor der Bezahlung?" — und auf die drei Wege hin: „1").
   *
   * VORHER lief `erzeugen` VOR der Kasse. Der Gedanke war gut gemeint: Nach der Zahlung
   * sollte sofort etwas dastehen. Bezahlt haben wir ihn trotzdem — jeder, der den Knopf
   * tippte und die Kasse wieder wegklickte, kostete einen Lauf mit gpt-5-mini. Das ist kein
   * Sonderfall, das ist der normale Kaufabbruch, und er kommt öfter vor als der Kauf.
   *
   * JETZT laufen BEIDE Schritte hier, nacheinander, nach der Zahlung:
   *   1. `erzeugen`  — liest Lebenslauf, Anzeige und die Screening-Erkenntnisse
   *   2. `optimieren` — schneidet auf die Stelle zu, Wasserzeichen weg
   *
   * DER KUNDE WARTET DAFÜR RUND EINE MINUTE STATT EINER HALBEN. Das ist der Tausch, und er
   * geht in die richtige Richtung: Wer gerade bezahlt hat, wartet gern; wer nicht kauft,
   * darf uns nichts kosten. Der Balken sagt in beiden Schritten, was gerade passiert.
   *
   * MÖGLICH GEWORDEN IST DAS ERST HEUTE — durch den Rückkehr-Fänger. Vorher gab es nach der
   * eingebetteten Kasse keine Stelle mehr, an der überhaupt noch Code lief.
   */
  const nachZahlung = async () => {
    void logTunnelEvent("payment_completed", "david");
    /* DEN BESITZ-KEKS HOLEN, BEVOR ETWAS FERTIG IST (28.08.2026): Danach führt der
       Download-Knopf auf ein PDF ohne Gerätekennung in der Adresse — ohne Keks bekäme der
       Käufer an seinem eigenen Kauf ein 403. Still: Scheitert es, greift weiterhin der
       Geräte-Weg. */
    try {
      await fetch("/api/david-besitz", {
        method: "POST", headers: kopfzeilen(),
        body: JSON.stringify({ id: genId, device: geraet() }),
      });
    } catch { /* der Kauf darf daran nie scheitern */ }
    /* DEM ASSETS-CHIP BESCHEID GEBEN — ab jetzt läuft etwas, er soll pulsieren. Er fragt
       sonst erst beim nächsten Seitenaufbau nach (siehe GuthabenChip). */
    try { window.dispatchEvent(new Event("lb-arbeit-neu")); } catch { /**/ }
    setFehler(""); setBusy(true); setBusyText(S.unterlagenLaeuft);
    try {
      const g = await fetch("/api/resume-generator", {
        method: "POST", headers: kopfzeilen(),
        body: JSON.stringify({
          schritt: "erzeugen", id: genId, device: geraet(),
          email, anzeige: anzeigeFertig, cvPath, cvName, davidId: genId, vorlage, foto,
        }),
      }).then(r => r.json());
      /* „schon" heisst: Das Profil steht bereits (zweiter Anlauf, Neuladen) — kein Grund
         abzubrechen, der Zuschnitt kommt gleich. */
      if (g?.error && !g?.schon) { setFehler(String(g.error)); setBusy(false); setBusyText(""); return; }
    } catch { setFehler(S.reportFehler); setBusy(false); setBusyText(""); return; }

    setBusyText(S.unterlagenOptimiert);
    try {
      const o = await fetch("/api/resume-generator", {
        method: "POST", headers: kopfzeilen(),
        body: JSON.stringify({ schritt: "optimieren", id: genId, device: geraet() }),
      }).then(r => r.json());
      if (o?.error) { setFehler(String(o.error)); setBusy(false); setBusyText(""); return; }
      setFertig(true);
    } catch { setFehler(S.reportFehler); }
    setBusy(false); setBusyText("");
  };

  const kaufen = async (ohneFotoBestaetigt = false) => {
    if (busy || !genId) return;
    /* ERST FRAGEN, DANN ZAHLEN — aber nur einmal: Wer „trotzdem" gewählt hat, kommt hier
       mit `true` wieder herein und läuft durch. */
    if (!foto && !ohneFotoBestaetigt) { setFotoFrage(true); return; }
    /* Ohne Ziel kein Zuschnitt — und ohne Zuschnitt kein Kauf. */
    if (anzeigeFertig.length < 60) { setFehler(S.jobKurz); return; }
    void logFunnelEvent("cv_offer_clicked", { theme: "david" });
    setFehler("");

    /* ADMIN: KEINE KASSE, aber derselbe Weg dahinter — der Server lässt ihn nur mit gültiger
       Admin-Nummer durch und schreibt eine Warnung ins Protokoll. */
    if (adminPin()) { await nachZahlung(); return; }

    const popup = kassenFenster();
    void logTunnelEvent("checkout_started", "david");
    try {
      const start = await fetch("/api/kiss-video-checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genId, once: true, videoAufpreis: false, thema: "resume",
          /* DER AKTIONSCODE AUS DEM LINK REIST MIT (30.08.2026) — der Server entscheidet,
             was er wert ist; bringt er die Summe auf null, entfällt die Kasse ganz. */
          ...(aktionsCode() ? { code: aktionsCode() } : {}),
          email, returnTo: window.location.pathname, eingebettet: kasse.anfordern, lang,
        }),
      }).then(r => r.json());
      if (start?.walletPaid) { try { popup?.close(); } catch { /**/ } await nachZahlung(); return; }
      if ((!start?.url && !start?.clientSecret) || !start?.sessionId) {
        try { popup?.close(); } catch { /**/ }
        setFehler(start?.error || S.reportFehler);
        return;
      }
      if (kasse.uebernehmen(start.clientSecret)) return;
      if (kasseOeffnen(popup, start.url) !== "popup" || !popup) return;
      for (let i = 0; i < 100; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const st = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(start.sessionId)}`).then(r => r.json()).catch(() => null);
        if (st?.paid) { try { popup.close(); } catch { /**/ } await nachZahlung(); return; }
        if (popup.closed && i > 2) break;
      }
      try { popup.close(); } catch { /**/ }
    } catch {
      try { popup?.close(); } catch { /**/ }
      setFehler(S.reportFehler);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="mt-6 border-t border-white/10 pt-7">
        <h2 className="text-[24px] font-black leading-[1.1]">{S.angeboteTitel}</h2>
        <p className="mt-2 text-[15px] font-medium leading-relaxed text-white/85">{S.angeboteText}</p>
      </section>

      {/* Lebenslauf UND Anschreiben sind EIN Kauf — die Zeile darunter sagt es offen,
          statt zweimal denselben Preis zu verlangen. */}
      <section>
        <h3 className="text-[17px] font-black leading-snug">{S.cvOptTitel}</h3>
        <p className="mt-1.5 text-[14px] font-medium leading-relaxed text-white/80">{S.cvOptText}</p>
        {/* DAS BEISPIEL IST DAS PDF, NICHT EINE PROFILSEITE (Owner 28.08.2026, mit Bild
            der Muster-Seite: „das werden wir nicht haben in dem beispiel" · „wir machen das
            nur pdf und anschreiben").

            Hier stand das Dossier der Bewerbungszentrale — eine laufende Seite mit
            Besucherzähler, Kontaktanfragen und Match-Prozent. Nichts davon gehört zu David:
            Er liefert Blätter als PDF.

            UND DARAUS IST EINE WAHL GEWORDEN (Owner, kurz darauf: „hier müssen wir eine
            galerie von templates zeigen und user sucht sich eins aus. 5 sollten schon sein,
            farbvollflächen lieben die Leute" · „mit unterschiedliche farben").

            DAS ANSCHREIBEN IST HIER RAUS (Owner, im selben Zug: „das anschreiben müssen wir
            nicht zeigen hier das wird eine copytext sein"). Es stand als zweites Blatt in
            derselben Reihe — und war damit ein Bild, das man wählen kann, obwohl es nichts
            zu wählen gibt. Der Absatz darunter sagt weiterhin, dass es mitkommt.

            WARUM `BildWahl` UND KEINE EIGENE REIHE (Hausregel 12.08.2026: „jede
            Tunnel-Auswahl = BildWahl-Slider"): Die Ring-Regel — Auswahl wechselt nur die
            FARBE, nie die Geometrie — steckt dort schon drin. Nachgebaut wäre sie beim
            ersten Antippen wieder verletzt. */}
        {/* DREI ZUTATEN NEBENEINANDER, DARUNTER DER WÄHLER (Owner 28.08.2026, über mehrere
            Anläufe gewachsen: „wäre natürlich geil wenn Bild, Analyse als Icon und
            Templateauswahl nebeneinander stehen würden … damit man sieht dass alles in einem
            fliesst" → „die vorlagen drüber als slide zur auswahl oder drunter" · „kleiner" ·
            „noch kleiner und wenn man eins auswählt dann erscheint es neben Bild und
            Analyse" · „die zwei kacheln fehlen noch").
            
            Der Weg dahin war ein Umweg, und der Grund ist lehrreich: Erst standen Foto und
            Vorlagen-Slider nebeneinander — auf 375 px blieb für den Slider keine 190 px, man
            sah eine Vorlage und einen Streifen. Der Slider braucht die volle Breite; die
            AUSWAHL gehört daneben, nicht die Auswahlliste.
            
            Also drei gleich grosse Kacheln: sein Foto, seine Analyse, seine Vorlage. Das ist
            die Rechnung, die das Produkt aufmacht — drei Zutaten, ein Blatt. Man sieht auf
            einen Blick, was man schon hat und was noch fehlt (ohne Foto ist die erste Kachel
            leer, und genau das soll auffallen).
            
            DIE ANALYSE IST EIN ICON UND KEIN BILD: Sie ist bereits passiert, sie hat nur
            kein Aussehen. Ein Häkchen sagt mehr als ein erfundenes Vorschaubild. */}
        <p className="mt-5 text-[13px] font-black uppercase tracking-[0.14em] text-[#f6cf51]">{S.vorlagenTitel}</p>
        <p className="mt-1 text-[13.5px] font-medium leading-snug text-white/70">{S.vorlagenText}</p>

        <input ref={fotoFeld} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
          onChange={async e => {
            const datei = e.target.files?.[0];
            e.target.value = "";   // dieselbe Datei darf erneut gewählt werden
            if (!datei) return;
            setFehler("");
            /* Erst verkleinern (Handyfotos sind 4–8 MB), dann zuschneiden lassen — der
               Zuschneider arbeitet auf einer Data-URL, und ein 8-MB-Bild im Canvas ruckelt
               auf dem Handy sichtbar. */
            try { setZuschnitt(await fotoAlsDataUrl(datei, 1400)); }
            catch { setFehler(S.fotoFehler); }
          }} />

        {/* A4 STATT 3:4 FÜR ALLE DREI: Eine Bewerbung ist ein Blatt Papier. In 3:4 stünde
            die Foto-Kachel niedriger als die Vorlagen-Kachel daneben, und die Reihe sähe
            schief aus. Grösser wurden sie damit von selbst — dieselbe Breite, mehr Höhe
            (Owner: „Diese 3 müssen grösser sein"). */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {/* 1 — Sein Foto */}
          <div>
            <UploadKachel foto={foto} titel={S.fotoLabel} hinweis={foto ? undefined : S.fotoWaehlen}
              verhaeltnis="aspect-[297/420]"
              onWaehlen={() => fotoFeld.current?.click()}
              onLoeschen={foto ? () => setFoto("") : undefined}
              loeschenLabel={S.fotoLoeschen} />
            <p className="mt-1.5 text-center text-[11px] font-black leading-tight text-white/70">{S.zutatFoto}</p>
          </div>

          {/* 2 — Seine Analyse.
                 STATISTIK UND SCHLOSS (Owner 28.08.2026: „muss wie eine Statistik aussehen
                 oder Datenbank das icon von der analyse. Mit Schloss icon"). Beides zusammen
                 sagt in einem Bild, was hier liegt: ausgewertete Daten, und sie gehören ihm.
                 Ein Foto lädt man hoch, eine Vorlage wählt man — die Analyse ist das
                 Einzige, was er nicht anfassen muss, weil sie schon da ist. */}
          <div>
            <div className="relative flex aspect-[297/420] w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-[#f6cf51]/40 lb-goldhauch">
              <BarChart3 className="h-8 w-8 text-[#f6cf51]" />
              <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full border border-[#f6cf51]/40 bg-black/40">
                <Lock className="h-3 w-3 text-[#f6cf51]" />
              </span>
              <span className="px-1 text-center text-[10.5px] font-bold leading-tight text-white/70">{S.zutatAnalyseFertig}</span>
              <Check className="h-4 w-4 text-[#f6cf51]" />
            </div>
            <p className="mt-1.5 text-center text-[11px] font-black leading-tight text-white/70">{S.zutatAnalyse}</p>
          </div>

          {/* 3 — Die gewählte Vorlage, MIT der Lupe. Sie wechselt beim Tippen im Wähler
                 darunter; der goldene Rand ist derselbe wie an der gewählten Wähler-Kachel,
                 damit man den Zusammenhang ohne ein Wort sieht. */}
          <div>
            <div className="relative aspect-[297/420] w-full overflow-hidden rounded-2xl border-2 border-[#f6cf51]/40 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={vorlagenBild(vorlage)} alt="" className="block h-full w-full object-cover object-top" />
              <div className="absolute right-1.5 top-1.5 z-10">
                <Scheibe klein durchsichtig label={S.vorlagenAnsehen} onClick={() => setVorlageGross(true)}>
                  <Maximize2 className="h-4 w-4" />
                </Scheibe>
              </div>
            </div>
            <p className="mt-1.5 text-center text-[11px] font-black leading-tight text-[#f6cf51]">
              {PDF_VORLAGEN.find(v => v.id === vorlage)?.name ?? S.zutatVorlage}
            </p>
          </div>
        </div>
        {vorlageGross && (
          <BlattUeberlagerung
            bildUrl={vorlagenBild(vorlage)}
            beschriftung={PDF_VORLAGEN.find(v => v.id === vorlage)?.name}
            schliessenLabel={S.schliessen}
            zu={() => setVorlageGross(false)} />
        )}

        {/* Der Wähler — klein, über die volle Breite, vier Vorlagen im Bild. */}
        <BildWahl
          blatt
          ansehenLabel={S.vorlagenAnsehen}
          bilder={PDF_VORLAGEN.map(v => ({ id: v.id, name: v.name, bild: vorlagenBild(v.id) }))}
          wert={vorlage}
          waehle={setVorlage}
          className="mt-2"
        />
        <p className="mt-1 text-[12.5px] font-bold leading-snug text-white/55">{S.fotoHinweis}</p>

        {/* DER ZUSCHNEIDER — derselbe wie in Try-on und in der Look-Verwaltung
            (`CropModal`), nicht ein zweiter fürs Bewerbungsfoto. */}
        {zuschnitt && (
          <div className="fixed inset-0 z-[95] bg-black">
            <CropModal
              imageSrc={zuschnitt}
              aspectRatio={3 / 4}
              onConfirm={bild => { setFoto(bild); setZuschnitt(""); }}
              onCancel={() => setZuschnitt("")}
            />
          </div>
        )}

        <h3 className="mt-6 text-[17px] font-black leading-snug">{S.anschreibenTitel}</h3>
        <p className="mt-1.5 text-[14px] font-medium leading-relaxed text-white/80">{S.anschreibenText}</p>
        <p className="mt-2 text-[12.5px] font-bold text-white/60">{S.imPreis}</p>
        {/* KEINE STELLE IM SCREENING? DANN HIER (Owner 29.08.2026, Weg „A"). Nur sichtbar,
            wenn wirklich keine da ist — wer sie im Trichter genannt hat, sieht davon nichts. */}
        {!busy && !fertig && anzeige.trim().length < 60 && (
          <div className="lb-rand-verlauf mt-5 rounded-[18px] lb-goldhauch p-4">
            <p className="text-[15px] font-black leading-snug text-white">{S.anzeigeFuerKauf}</p>
            <p className="mt-1 text-[13.5px] font-medium leading-relaxed text-white/75">{S.anzeigeFuerKaufText}</p>
            <EingabeMehrzeilig className="mt-3" zeilen={5} value={nachAnzeige}
              onChange={e => setNachAnzeige(e.target.value)} placeholder={S.jobPlatzhalter} />
          </div>
        )}
        {/* WAS ER GEWÄHLT HAT, DIREKT ÜBER DEM PREIS (Owner 28.08.2026: „Richtiges Template
            gewählt, Bild hochgeladen. Ja/Nein"). Zwei Zeilen, im Blickfeld des Daumens —
            damit man beim Zahlen sieht, WAS man kauft, statt es hinterher zu merken. */}
        {!busy && !fertig && (
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5">
            <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-white/70">
              <Check className="h-3.5 w-3.5 shrink-0 text-[#f6cf51]" />
              {S.checkVorlage}: <span className="font-black text-white/90">{PDF_VORLAGEN.find(v => v.id === vorlage)?.name}</span>
            </span>
            <span className={`flex items-center gap-1.5 text-[12.5px] font-bold ${foto ? "text-white/70" : "text-[#f6cf51]"}`}>
              {foto
                ? <Check className="h-3.5 w-3.5 shrink-0 text-[#f6cf51]" />
                : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
              {S.checkFoto}: <span className={foto ? "font-black text-white/90" : "font-black"}>{foto ? "✓" : S.checkFotoFehlt}</span>
            </span>
          </div>
        )}
        <Fehlerzeile>{fehler}</Fehlerzeile>
        <div className="mt-3">
          {/* NIE EIN KREISEL OHNE WORT (CI-Regel; Owner 28.08.2026 mit Bild: „was passiert
              hier?" — an dieser Stelle drehte ein winziger Kreisel ohne jede Auskunft,
              während im Hintergrund 30 Sekunden lang die Bewerbung geschrieben wurde). */}
          {busy ? <Fortschritt text={busyText || S.unterlagenLaeuft} />
            : fertig
              ? <Knopf art="gold" href={pdfUrl}>{S.assetsKnopf}</Knopf>
              : fotoFrage
                ? (
                  /* DIE RÜCKFRAGE — an derselben Stelle, an der eben noch der Kaufknopf
                     stand. Der Weg zurück (Foto wählen) steht OBEN und in Gold; „trotzdem"
                     ist der leisere Zweitweg. Wer nur schnell tippt, landet dann beim Foto
                     und nicht in einem Kauf, den er später bereut. */
                  <div className="lb-rand-verlauf rounded-[18px] lb-goldhauch p-4">
                    <p className="text-[15px] font-black leading-snug text-white">{S.fotoFehltTitel}</p>
                    <p className="mt-1 text-[13.5px] font-medium leading-relaxed text-white/75">{S.fotoFehltText}</p>
                    <div className="mt-3 flex flex-col gap-2">
                      <Knopf art="gold" onClick={() => { setFotoFrage(false); fotoFeld.current?.click(); }}>{S.fotoJetztWaehlen}</Knopf>
                      <Knopf art="umriss" onClick={() => { setFotoFrage(false); void kaufen(true); }}>{S.ohneFotoWeiter}</Knopf>
                    </div>
                  </div>
                )
                : <Knopf art="gold" onClick={() => void kaufen()}>{`${S.cvOptCta} — ${preisUnterlagen}`}</Knopf>}
        </div>
        {kasse.block}
      </section>

      <section className="border-t border-white/10 pt-6">
        <h3 className="text-[17px] font-black leading-snug">{S.videoTitel}</h3>
        <p className="mt-1.5 text-[14px] font-medium leading-relaxed text-white/80">{S.videoText}</p>

        {/* NUR DAS VIDEO, KEINE KARTE (Owner 28.08.2026: „hier machen wir die card nicht.
            einfach nur das video" · „Mach schonmal das layout wie ich dir gesagt habe ohne
            kard und mit text").
            
            Der Clip zeigt die Verwandlung selbst: vom Küchentisch zur fertigen
            Video-Bewerbung. Eine Karte drumherum würde genau den Übergang zudecken, um den
            es geht.

            DAS LAYOUT STEHT SCHON, DAS VIDEO KOMMT NOCH: Bis `BEWERBUNG_VIDEO` gesetzt ist,
            läuft an derselben Stelle der bestehende Beispiel-Clip — dieselbe Form, dieselbe
            Zeile darunter. So gibt es keinen leeren Kasten und keinen zweiten Aufbau.

            `SchleifenVideo` statt eines nackten `<video>`: Poster und Play-Scheibe sind
            eingebaut, und vor dem Tipp lädt es kein Byte. */}
        <div className="mt-4">
          <div className="lb-rand-verlauf lb-rand-verlauf-gold overflow-hidden rounded-[18px]">
            {/* TON UND ZEITLEISTE GEHÖREN DAZU (Owner 28.08.2026: „Das Video hat kein Ton
                und keine Zeitleiste") — hier stand der nackte Spieler `SchleifenVideo`, der
                nur Poster und Play mitbringt. `EinladungAnsicht` ist derselbe Baustein, den
                jede Karte des Hauses innen benutzt: Ton-Scheibe, Zeitbalken, Vollbild. Wir
                nehmen ihn OHNE Karte drumherum — genau das war der Wunsch.
                `originalton`: In diesem Video ist die Stimme der Inhalt, also keine
                Hausmusik daneben (`musik=""`), und die Scheibe schaltet den Ton des Videos. */}
            <EinladungAnsicht
              id="david-bewerbungsvideo"
              videoUrl={BEWERBUNG_VIDEO || LEBENSLAUF_BEISPIEL_VIDEO}
              poster={(BEWERBUNG_VIDEO ? BEWERBUNG_VIDEO_POSTER : LEBENSLAUF_BEISPIEL_POSTER) || undefined}
              zaehlen={false} schleife={false} originalton musik=""
              verhaeltnis="aspect-[9/16]"
              tonText={K.ton} tonAusText={K.tonAus} />
          </div>
          <p className="mt-3 text-[15px] font-black leading-snug text-white">{S.videoVorherNachher}</p>
          <p className="mt-1 text-[13.5px] font-medium leading-relaxed text-white/70">{S.videoVorherNachherText}</p>
          {/* DIE DREI MERKMALE (Owner 28.08.2026) — sie beantworten die Frage, die bei
              einem KI-Video als Erstes kommt: Bin das noch ich? Deshalb stehen sie direkt
              unter dem Clip und nicht im Fliesstext. */}
          <p className="mt-2 text-[13px] font-medium leading-relaxed text-white/60">{S.videoSkriptHinweis}</p>
          <div className="mt-3 flex flex-col gap-1.5">
            {[S.videoM1, S.videoM2, S.videoM3].map(m => (
              <span key={m} className="flex items-start gap-2 text-[13px] font-bold leading-snug text-white/80">
                <Check className="mt-[2px] h-3.5 w-3.5 shrink-0 text-[#f6cf51]" />{m}
              </span>
            ))}
          </div>
        </div>
        {/* DER KAUF LÄUFT HIER, NICHT WOANDERS (Owner 28.08.2026: „nein, das springt
            dahin. Da ist was ganz anderes") — Foto, Skript, Kasse und Erzeugung stehen in
            `DavidVideoKauf`, auf dieser Seite. */}
        <DavidVideoKauf S={S} preisVideo={preisVideo} genId={genId} email={email} lang={lang} vorname={vorname} />
      </section>

      <div className="border-t border-white/10 pt-6">
        <Knopf art="umriss" href="/my-gallery">{S.assetsKnopf}</Knopf>
        {onWeiter && (
          <div className="mt-2.5">
            <Knopf art="umriss" onClick={onWeiter}>{weiterLabel ?? S.weiter}</Knopf>
          </div>
        )}
      </div>
    </div>
  );
}
